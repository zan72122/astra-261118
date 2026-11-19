'use strict';
class KitchenSound {
 constructor(){this.ctx=null;this.muted=false;this.burst=0;this.wasPop=false;this.lastPhase='whisk';}
 start(){
  if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});return;}
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  try{const c=this.ctx=new Audio(),now=c.currentTime;
  this.out=c.createGain();this.out.gain.value=this.muted?0:.63;this.out.connect(c.destination);
  let buffer=c.createBuffer(1,c.sampleRate*1.7,c.sampleRate),data=buffer.getChannelData(0),lp=0;
  for(let i=0;i<data.length;i++){lp=.77*lp+.23*(Math.random()*2-1);data[i]=.51*(Math.random()*2-1)+lp;}
  const n=c.createBufferSource();n.buffer=buffer;n.loop=true;n.start();
  this.bp=c.createBiquadFilter();this.bp.type='bandpass';this.bp.Q.value=.75;this.bp.frequency.value=700;
  this.hiss=c.createGain();this.hiss.gain.value=0;n.connect(this.bp).connect(this.hiss).connect(this.out);
  this.wet=c.createBiquadFilter();this.wet.type='lowpass';this.wet.frequency.value=340;this.wetGain=c.createGain();this.wetGain.gain.value=0;n.connect(this.wet).connect(this.wetGain).connect(this.out);
  this.air=c.createBiquadFilter();this.air.type='highpass';this.air.frequency.value=4300;this.airGain=c.createGain();this.airGain.gain.value=.001;n.connect(this.air).connect(this.airGain).connect(this.out);
  this.out.gain.setTargetAtTime(this.muted?0:.63,now,.04);c.resume().catch(()=>{});
  }catch(e){this.ctx=null;}
 }
 toggle(){this.muted=!this.muted;this.start();if(this.ctx)this.out.gain.setTargetAtTime(this.muted?0:.63,this.ctx.currentTime,.035);}
 note(f,len,gain,end=f,type='sine',delay=0){
  if(!this.ctx)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
  o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(24,end),t+len);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+len);
  o.connect(g).connect(this.out);o.start(t);o.stop(t+len+.01);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 update(s,d){
  if(!this.ctx)return;const t=this.ctx.currentTime,q=s.charge,v=s.noise,isWhisk=s.phase==='whisk',f=s.phase==='fold',flow=s.phase==='pour'?s.pourTilt:0;
  this.bp.frequency.setTargetAtTime(s.bandHz,t,.045);
  this.hiss.gain.setTargetAtTime((isWhisk?.49:f?.21:0)*v+flow*.11+(s.phase==='peel'?Math.abs(s.paperTarget-s.peel)*1.5:0),t,.032);
  this.wetGain.gain.setTargetAtTime((1-q)*v*.5+flow*.12,t,.046);
  this.airGain.gain.setTargetAtTime(.0014+s.steam*.032+s.dose*.018,t,.09);
  if(s.popped&&!this.wasPop){this.note(1110,.075,.19,150);this.note(540,.11,.08,115,'sine',.041);}
  this.wasPop=s.popped;this.burst-=d;
  if(this.burst<=0&&isWhisk&&v>.12){this.note(190+Math.random()*190,.055+.06*(1-q),(.022+.048*(1-q))*v,95+q*160);this.burst=.064+Math.random()*.14;}
  if(s.phase!==this.lastPhase){
   if(s.phase==='cool'){this.note(1320,1.7,.075);this.note(1981,1.05,.024);}
   if(s.phase==='bath'||s.phase==='return'){this.note(864,.35,.055);this.note(1718,.22,.023);}
   this.lastPhase=s.phase;
  }
 }
}
