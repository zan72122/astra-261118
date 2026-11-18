'use strict';
function createRoomSound(){
 let ac,master,bus,send,delay,fb,noise,air,airGain,radioFilter,radioGain,seaFilter,seaGain,enabled=true,recent=-1,pluck=0;
 function start(){
  if(ac){if(ac.state==='suspended')ac.resume().catch(()=>{});return;}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  ac=new C();master=ac.createGain();master.gain.value=enabled?.72:0;
  let limiter=ac.createDynamicsCompressor();limiter.threshold.value=-13;limiter.ratio.value=3;master.connect(limiter);limiter.connect(ac.destination);
  bus=ac.createGain();bus.connect(master);send=ac.createGain();send.gain.value=.14;bus.connect(send);
  const hall=ac.createConvolver(),ir=ac.createBuffer(2,Math.floor(ac.sampleRate*.82),ac.sampleRate);
  for(let j=0;j<2;j++){const a=ir.getChannelData(j);for(let i=0;i<a.length;i++){let t=i/ac.sampleRate;a[i]=(Math.random()*2-1)*Math.exp(-9*t)*(.45+.55*Math.exp(-180*Math.abs(t-.032-j*.007)));}}
  hall.buffer=ir;send.connect(hall);hall.connect(master);
  delay=ac.createDelay(.5);delay.delayTime.value=.064;fb=ac.createGain();fb.gain.value=.14;send.connect(delay);delay.connect(fb);fb.connect(delay);fb.connect(master);
  noise=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);let a=noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
  function bed(mode,frequency){let src=ac.createBufferSource();src.buffer=noise;src.loop=true;let f=ac.createBiquadFilter();f.type=mode;f.frequency.value=frequency;let g=ac.createGain();g.gain.value=0;src.connect(f);f.connect(g);g.connect(bus);src.start(0,Math.random());return [f,g];}
  [air,airGain]=bed('lowpass',390);[radioFilter,radioGain]=bed('bandpass',2200);[seaFilter,seaGain]=bed('lowpass',690);ac.resume().catch(()=>{});
 }
 function route(node,level,duration,x){
  let g=ac.createGain(),now=ac.currentTime;g.gain.setValueAtTime(.00001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,level),now+Math.min(.012,duration*.12));g.gain.exponentialRampToValueAtTime(.00001,now+duration);
  node.connect(g);let pan;if(ac.createStereoPanner){pan=ac.createStereoPanner();pan.pan.value=Math.max(-.84,Math.min(.84,x*.27));g.connect(pan);pan.connect(bus);}else g.connect(bus);
  return ()=>{node.disconnect();g.disconnect();if(pan)pan.disconnect();};
 }
 function tone(f,end,dur,vol,type='sine',x=0){let o=ac.createOscillator(),now=ac.currentTime;o.type=type;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(end,now+dur);o.onended=route(o,vol,dur,x);o.start();o.stop(now+dur+.015);}
 function grit(f,q,dur,vol,x=0){const src=ac.createBufferSource(),filter=ac.createBiquadFilter();filter.type='bandpass';filter.frequency.value=f;filter.Q.value=q;src.buffer=noise;src.connect(filter);let end=route(filter,vol,dur,x);src.onended=()=>{end();src.disconnect();};src.start(0,Math.random());src.stop(ac.currentTime+dur+.012);}
 function event(e){if(!ac||!enabled)return;let n=e.value,x=e.at;
  switch(e.type){
  case 'rip':grit(n*2.4,1.3,.065,.38,x);tone(n,n*.54,.032,.051,'sawtooth',x);break;
  case 'fold':grit(690,.8,.47,.4,x);tone(128,63,.17,.14,'triangle',x);break;
  case 'crease':grit(560+n*270,.84,.13,.21,x);break;
  case 'snap':case 'latch':case 'click':tone(520,172,.048,.09,'triangle',x);grit(1830,1.3,.081,.18,x);break;
  case 'thud':tone(146/Math.sqrt(n+.19),44/Math.sqrt(n+.30),.16+n*.10,.21+n*.09,'sine',x);grit(1020/(.52+n),.7,.118,.27,x);break;
  case 'step':tone(169,66,.125,.19,'sine',x);grit(830,.82,.145,.36,x);break;
  case 'brush':grit(1380,1,.19,.18,x);break;
  case 'note':{let f=[392,493.88,587.33][n];tone(f,f*.998,1.13,.162,'sine',-.9);tone(f*2.01,f*2,.55,.047,'sine',-.9);break;}
  case 'chime':case 'lantern':{let f=[659.25,783.99,987.77][n];let vol=e.type==='lantern'?.11:.035;tone(f,f*.999,1.42,vol,'sine',x);tone(f*2.71,f*2.706,.49,vol*.15,'sine',x);break;}
  case 'plink':{let f=790+n*540;tone(f,f*.84,.16+n*.1,.09*n,'sine',x);break;}
  }
 }
 function update(s,ev){
  if(!ac)return;for(const e of ev)event(e);
  let now=ac.currentTime,a=Math.max(0,Math.min(1,(s.dial.x+1.85)/3.74)),on=s.index>=5&&s.items[5].mode==='placed';
  send.gain.setTargetAtTime(s.echo.x*.75,now,.16);delay.delayTime.setTargetAtTime(s.echo.x*.29,now,.2);
  fb.gain.setTargetAtTime(.10+s.echo.x*.27,now,.25);
  air.frequency.setTargetAtTime(320+Math.abs(s.wind[3].x)*340,now,.24);airGain.gain.setTargetAtTime(.010+s.door.x*.011,now,.33);
  radioFilter.frequency.setTargetAtTime(1250+1900*a,now,.04);radioGain.gain.setTargetAtTime(on?.069*(1-a)**2:0,now,.1);
  seaFilter.frequency.setTargetAtTime(350+a*1040+s.wind[2].x*300+s.swell[55].x*1700,now,.14);seaGain.gain.setTargetAtTime(on?a*(.042+.037*Math.abs(s.wind[5].x)):0,now,.24);
  if(on&&a>.5&&now>pluck){pluck=now+.21+(1-s.wet.x)*2.6+Math.random()*1.6;event({type:'plink',value:a*.52,at:1.3});}
  if(s.phase==='opening'){let k=Math.max(0,Math.floor(s.boxes[s.box].flaps[0].x*3));if(k!==recent){recent=k;event({type:'crease',value:k,at:ParcelSim.parcels[s.box].x});}}else recent=-1;
 }
 function toggle(){start();enabled=!enabled;if(ac)master.gain.setTargetAtTime(enabled?.72:0,ac.currentTime,.06);return enabled;}
 return {start,toggle,update};
}
