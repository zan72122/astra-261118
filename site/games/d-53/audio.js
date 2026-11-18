'use strict';
class WinterSound{
 constructor(){this.muted=false;this.lastCrack=0}
 start(){
  if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.ctx=new A();const a=this.ctx;this.master=a.createGain();this.master.gain.value=this.muted?0:.56;this.master.connect(a.destination);
   this.noise=a.createBuffer(1,a.sampleRate*2,a.sampleRate);let b=this.noise.getChannelData(0),r=winterRandom(870);for(let i=0;i<b.length;i++)b[i]=r()*2-1;
   this.rub=this.layer(690,1.3);this.grain=this.layer(3470,2.4);this.wind=this.layer(310,.7);this.wind.g.gain.value=.012;
  }
  if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
 }
 layer(hz,q){const a=this.ctx,s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=this.noise;s.loop=true;s.playbackRate.value=.91+Math.random()*.13;f.type='bandpass';f.frequency.value=hz;f.Q.value=q;g.gain.value=.00001;s.connect(f).connect(g).connect(this.master);s.start();return {g,f}}
 mute(){this.start();this.muted=!this.muted;if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:.56,this.ctx.currentTime,.045);return this.muted}
 tone(hz,end,len,amp,offset=0,type='sine'){
  let a=this.ctx,t=a.currentTime+offset,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(end,t+len);g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(amp,t+.009);g.gain.exponentialRampToValueAtTime(.00001,t+len);o.connect(g).connect(this.master);o.start(t);o.stop(t+len+.015);o.onended=()=>{o.disconnect();g.disconnect()}
 }
 burst(hz,len,amp,offset=0){const a=this.ctx,t=a.currentTime+offset,s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();s.buffer=this.noise;f.type='bandpass';f.frequency.setValueAtTime(hz,t);f.frequency.exponentialRampToValueAtTime(hz*.42,t+len);f.Q.value=1.1;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+len);s.connect(f).connect(g).connect(this.master);s.start(t,Math.random());s.stop(t+len+.01);s.onended=()=>{s.disconnect();g.disconnect();f.disconnect()}}
 update(s){
  let events=s.events.splice(0);if(!this.ctx)return;
  const a=this.ctx,t=a.currentTime,on=s.stage==='frost'&&s.contact?.kind==='glass',texture=Math.min(1,s.windowHeat/48),speed=s.touchSpeed;
  this.rub.g.gain.setTargetAtTime(on?(.014+texture*.076+Math.min(.092,speed*.07)):.00001,t,.07);
  this.rub.f.frequency.setTargetAtTime(270+speed*270+texture*100,t,.09);
  this.grain.g.gain.setTargetAtTime(on?.003+texture*.022:.00001,t,.055);
  this.wind.g.gain.setTargetAtTime(.009+Math.abs(s.wind)*.028+s.travel*.018,t,.5);
  for(const e of events){
   if(e.type==='crunch'&&t-this.lastCrack>.055){this.burst(2250+e.power*3600,.072,.26);this.burst(4600,.035,.10,.027);this.burst(620,.11,.08,.019);this.lastCrack=t}
   if((e.type==='drop'||e.type==='pool')&&(!this.lastDrop||t-this.lastDrop>.16)){this.lastDrop=t;this.tone(e.type==='drop'?1550:780,700,.12,.09);this.tone(2210,1510,.055,.023,.016)}
   if(e.type==='trickle'){this.burst(2600,.09,.06);this.tone(1720,1140,.073,.024,.043)}
   if(e.type==='bird'){const f=1890+e.pitch*620,p=.017+s.travel*.015;this.tone(f,f*1.37,.15,p);this.tone(f*1.2,f*.86,.19,p*.85,.19);if(e.pitch>.52)this.tone(f,f*1.12,.09,p*.68,.48)}
   if(e.type==='click'){this.burst(1600,.08,.14);this.tone(410,240,.14,.04)}
  }
 }
}
