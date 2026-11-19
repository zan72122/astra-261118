(function(){
'use strict';
function makeSound(){
 let ac,noise,paperFilter,paperGain,airFilter,airGain,level,flute,fluteGain,last='fold',wasFold=0;
 function gain(v,to){const g=ac.createGain();g.gain.value=v;g.connect(to);return g;}
 function filterNoise(type,hz,q,to){
 const src=ac.createBufferSource();src.buffer=noise;src.loop=true;
 const f=ac.createBiquadFilter();f.type=type;f.frequency.value=hz;f.Q.value=q;src.connect(f);f.connect(to);src.start();return f;
 }
 function start(){
 if(ac){if(ac.state==='suspended')ac.resume().catch(()=>{});return;}
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 ac=new Audio();level=gain(.60,ac.destination);noise=ac.createBuffer(1,ac.sampleRate*2.37,ac.sampleRate);
 const a=noise.getChannelData(0);let prev=0;for(let i=0;i<a.length;i++){prev=.25*prev+.75*(Math.random()*2-1);a[i]=prev;}
 paperGain=gain(0,level);paperFilter=filterNoise('bandpass',1800,1.8,paperGain);
 airGain=gain(0,level);airFilter=filterNoise('bandpass',680,.65,airGain);
 fluteGain=gain(0,level);flute=ac.createOscillator();flute.type='sine';flute.frequency.value=500;flute.connect(fluteGain);flute.start();
 ac.resume().catch(()=>{});
 }
 function rustle(freq,volume,length){
 if(!ac)return;const t=ac.currentTime,src=ac.createBufferSource(),f=ac.createBiquadFilter(),g=gain(.0001,level);
 src.buffer=noise;f.type='bandpass';f.frequency.setValueAtTime(freq,t);f.frequency.exponentialRampToValueAtTime(freq*.58,t+length);f.Q.value=1.25;
 g.gain.exponentialRampToValueAtTime(volume,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+length);
 src.connect(f);f.connect(g);src.start(t,Math.random());src.stop(t+length+.02);src.onended=()=>{g.disconnect();f.disconnect();};}
 function thump(v){
 rustle(1350,.095,.13);const t=ac.currentTime,o=ac.createOscillator(),g=gain(.0001,level);
 o.frequency.setValueAtTime(460,t);o.frequency.exponentialRampToValueAtTime(185,t+.105);
 g.gain.exponentialRampToValueAtTime(.08+Math.min(.05,v*.035),t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+.15);
 o.connect(g);o.start();o.stop(t+.16);o.onended=()=>g.disconnect();
 }
 function update(s){
 if(!ac)return;const t=ac.currentTime,speed=s.phase==='flight'?s.p.speed:0,hinge=s.hinges.reduce((a,h)=>a+Math.abs(h.v),0);
 paperFilter.frequency.setTargetAtTime(s.sound.foldHz,t,.035);
 paperGain.gain.setTargetAtTime(Math.min(.30,s.foldPulse*.19+hinge*.017),t,.034);
 airFilter.frequency.setTargetAtTime(s.sound.airHz,t,.1);
 airGain.gain.setTargetAtTime(s.sound.airGain,t,.14);
 flute.frequency.setTargetAtTime(185+speed*63,t,.16);fluteGain.gain.setTargetAtTime(speed*.0014,t,.15);
 if(s.fold>wasFold)rustle(2400+s.fold*265,.15,.105);
 if(last!=='land'&&s.phase==='land')thump(s.p.impact);
 if(last!=='return'&&s.phase==='return')rustle(1650,.095,.45);
 if(last!=='flight'&&s.phase==='flight')rustle(2350,.19,.29);
 last=s.phase;wasFold=s.fold;
 }
 return {start,update,rustle};
}
window.makeSound=makeSound;
})();
