'use strict';
function soundInputs(s){
 const w=s.water[s.mode==='drain'?s.returnIndex:s.index],q=Math.abs(w.flow);
 const head=Math.abs((s.mode==='drain'?w.sill:w.target)-w.level);
 return {w,q,head,lowHz:54+head*19+q*13,cutoffHz:570+q*3060+w.valve*400,
   movement:s.water.reduce((n,a)=>n+Math.abs(a.gateV[0])+Math.abs(a.gateV[1]),0)};
}
if(typeof module!=='undefined' && module.exports)module.exports={soundInputs};
function makeSound(){
 let ac,master,wet,foam,flowFilter,hum,humGain,breeze,creak,nextBubble=0,oldStrikes=0,oldMode='',lastFish=0,muted=false,counter=0,lastSqueak=0;
 function gain(parent,level){const n=ac.createGain();n.gain.value=level;n.connect(parent);return n;}
 function tone(f,d,v,kind='sine',end=f){if(!ac)return;const t=ac.currentTime,o=ac.createOscillator(),g=gain(master,0);
 o.type=kind;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(end,t+d);g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(v,t+Math.min(.028,d*.19));g.gain.exponentialRampToValueAtTime(.00001,t+d);o.connect(g);o.start();o.stop(t+d+.03);o.onended=()=>{o.disconnect();g.disconnect();};}
 function noise(buf,type,f,q,g){const src=ac.createBufferSource(),flt=ac.createBiquadFilter(),vol=gain(master,g);
 src.buffer=buf;src.loop=true;src.playbackRate.value=.87+counter++*.073;flt.type=type;flt.frequency.value=f;flt.Q.value=q;src.connect(flt).connect(vol);src.start(0,counter*.34);return {flt,vol};}
 function start(){
 if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A();const lim=ac.createDynamicsCompressor();lim.threshold.value=-12;lim.connect(ac.destination);master=gain(lim,muted?0:.61);
 const buf=ac.createBuffer(1,Math.ceil(ac.sampleRate*5.1),ac.sampleRate),data=buf.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 const w=noise(buf,'lowpass',1400,.55,0);wet=w.vol;flowFilter=w.flt;
 foam=noise(buf,'bandpass',2400,.57,0).vol;breeze=noise(buf,'lowpass',460,.38,.034).vol;creak=noise(buf,'bandpass',510,3.8,0).vol;
 hum=ac.createOscillator();hum.type='sine';hum.frequency.value=70;humGain=gain(master,0);hum.connect(humGain);hum.start();
 }if(ac.state==='suspended')ac.resume().catch(()=>{});
 }
 function change(g,v,t=.13){g.gain.setTargetAtTime(Math.max(0,v),ac.currentTime,t);}
 function tick(s){if(!ac||ac.state!=='running')return;
 const {w,head,q,movement:gv,cutoffHz,lowHz}=soundInputs(s),t=ac.currentTime;
 change(wet,.004+Math.min(.75,q*1.82));flowFilter.frequency.setTargetAtTime(cutoffHz,t,.19);
 change(foam,.008+w.swirl*.28);change(breeze,.028+Math.abs(w.wind)*.06);change(creak,Math.min(.10,gv*.062));
 hum.frequency.setTargetAtTime(lowHz,t,.19);change(humGain,w.valve*(.024+head*.021)+Math.abs(s.boat.speed)*.009);
 if(t>nextBubble){if(q>.006 || Math.abs(s.boat.speed)>.22){const f=range(300,880);tone(f,.07+Math.random()*.11,.018+.03*w.swirl,'sine',f*(1.5+Math.random()*.65));}nextBubble=t+.085+Math.random()*.19/(.33+w.swirl);}
 if(gv>.1 && t>lastSqueak){tone(103+gv*22,.39,.02,'triangle',76+gv*8);lastSqueak=t+1.2+Math.random()*.5;}
 if(s.harbor.strikes>oldStrikes){[1,2.39,3.02].forEach((n,i)=>tone(440*n,1.7-i*.3,.096/(1+i),'sine',439*n));}oldStrikes=s.harbor.strikes;
 const jumps=s.fish.reduce((n,f)=>n+f.jumps,0);if(jumps>lastFish)tone(480,.13,.023,'sine',810);lastFish=jumps;
 if(s.mode!==oldMode){if(['cross','cruise','salute'].includes(s.mode)){tone(349.23,1.28,.035);tone(523.25,1.8,.024);}oldMode=s.mode;}
 }
 function toggle(){muted=!muted;start();if(master)change(master,muted?0:.61,.045);return muted;}
 return {start,tick,toggle};
}
