'use strict';
class Soundscape{
 constructor(){this.on=true;this.ctx=null;this.lastBird=0;this.lastRub=-1;}
 start(){if(!this.ctx){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  this.ctx=new Audio();const c=this.ctx;this.gain=c.createGain();this.gain.gain.value=this.on?.64:0;
  this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-15;this.gain.connect(this.limiter);this.limiter.connect(c.destination);
  this.buf=c.createBuffer(1,c.sampleRate*2,c.sampleRate);let last=0;const data=this.buf.getChannelData(0);for(let i=0;i<data.length;i++){last=.38*last+.62*(Math.random()*2-1);data[i]=last;}
  this.motor=c.createGain();this.motor.gain.value=0;this.motor.connect(this.gain);this.parts=[1,2.02,3.04,5.1].map((n,i)=>{let osc=c.createOscillator(),g=c.createGain();osc.type=i===0?'triangle':'sine';osc.frequency.value=37*n;g.gain.value=[.35,.17,.09,.035][i];osc.connect(g);g.connect(this.motor);osc.start();return osc;});
  const noise=c.createBufferSource();noise.buffer=this.buf;noise.loop=true;this.air=c.createBiquadFilter();this.air.type='bandpass';this.air.frequency.value=740;this.air.Q.value=.53;this.breeze=c.createGain();this.breeze.gain.value=.009;noise.connect(this.air);this.air.connect(this.breeze);this.breeze.connect(this.gain);noise.start();
 }if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}
 toggle(){this.on=!this.on;this.start();if(this.ctx)this.gain.gain.setTargetAtTime(this.on?.64:0,this.ctx.currentTime,.05);}
 tone(freq,end,dur,vol,type='sine',delay=0){if(!this.ctx)return;let c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+dur*.78);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,vol),t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(this.gain);o.start(t);o.stop(t+dur+.015);}
 noise(f,end,dur,vol,delay=0,q=1){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,b=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();b.buffer=this.buf;b.loop=true;filter.type='bandpass';filter.Q.value=q;filter.frequency.setValueAtTime(f,t);filter.frequency.exponentialRampToValueAtTime(end,t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,vol),t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+dur);b.connect(filter);filter.connect(g);g.connect(this.gain);b.start(t,Math.random());b.stop(t+dur+.01);}
 play(e){const m=e.power,c=this.ctx;if(!c||!this.on)return;
 switch(e.type){
 case 'pick':this.noise(1480,780,.16,.093);this.tone(440,521,.16,.022);break;
 case 'land':{let base=143/Math.sqrt(.55+m*.42);this.tone(base,base*.64,.35,.36);this.tone(base*2.64,base*2.32,.19,.11,'triangle');this.noise(840+m*120,280,.18,.48);this.noise(1260,580,.14,.15,.083);if(e.id===4){this.tone(1012,944,.46,.057,'sine',.05);this.tone(1509,1494,.34,.025,'sine',.07);}if(e.id===3)this.tone(547,468,.26,.095,'sine',.018);if(e.id===0)this.noise(1690,760,.19,.23,.016);if(m>.9)this.tone(274,209,.23,.065,'triangle',.085);break;}
 case 'rope':if(c.currentTime-this.lastRub<.073)break;this.lastRub=c.currentTime;this.noise(3400,930,.255,.32,0,1.4);this.noise(1460,2600,.14,.19,.054,2);this.tone(460,337,.084,.031,'triangle');break;
 case 'latch':case 'gear':case 'wood':if(c.currentTime-this.lastRub<.10)break;this.lastRub=c.currentTime;this.noise(740,320,.15,.19);this.tone(e.type==='gear'?431:230,145,.18,.12,'triangle');break;
 case 'engine':this.tone(46,85,.63,.16,'triangle');this.noise(740,120,.52,.18);break;
 }}
 update(s){if(!this.ctx)return;const t=this.ctx.currentTime;
 const amp=s.engine.x;this.motor.gain.setTargetAtTime(Math.max(0,amp*.58),t,.07);
 this.parts.forEach((o,i)=>o.frequency.setTargetAtTime((32+s.speed*7.2+s.air[1].u*.9)*[1,2.02,3.04,5.1][i],t,.08));
 this.breeze.gain.setTargetAtTime((s.world==='yard'?.010:.018)+Math.abs(s.air[4].u)*.012,t,.38);
 this.air.frequency.setTargetAtTime((s.world==='room'?950:750)+s.air[3].u*80,t,.25);
 if(t>this.lastBird+8&&s.air[7].u>.23&&s.world!=='room'){this.lastBird=t;this.tone(2080,2740,.135,.018);this.tone(2680,2180,.17,.014,'sine',.16);}
 }
}
