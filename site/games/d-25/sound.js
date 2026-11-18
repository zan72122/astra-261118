class FarmSound {
  constructor(){this.ctx=null;this.muted=false;this.nextGrain=0;this.nextCut=0;this.nextBird=0;}
  start(){
    if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const a=this.ctx=new C();this.out=a.createGain();this.out.gain.value=this.muted?0:.53;
    const comp=a.createDynamicsCompressor();this.out.connect(comp);comp.connect(a.destination);
    const rng=FarmModel.random(887),buffer=a.createBuffer(1,a.sampleRate*3,a.sampleRate),samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=rng()*2-1;this.buffer=buffer;
    const noisefilter=(freq,q,type='bandpass')=>{const n=a.createBufferSource(),f=a.createBiquadFilter(),v=a.createGain();n.buffer=buffer;n.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=q;v.gain.value=0;n.connect(f);f.connect(v);v.connect(this.out);n.start();return {v,f};};
    this.air=noisefilter(850,.48);this.straw=noisefilter(3200,.70);this.pour=noisefilter(1650,.84);this.water=noisefilter(1200,1.5);
    this.motor=a.createOscillator();this.harm=a.createOscillator();this.motor.type='triangle';this.harm.type='sine';
    this.motorGain=a.createGain();this.motorGain.gain.value=0;this.motor.connect(this.motorGain);
    const part=a.createGain();part.gain.value=.34;this.harm.connect(part);part.connect(this.motorGain);this.motorGain.connect(this.out);this.motor.start();this.harm.start();this.rng=rng;
    this.nextBird=a.currentTime+3;a.resume();
  }
  pulse(freq,length,amp,type='sine',end=freq){
    const a=this.ctx,v=a.createGain(),o=a.createOscillator(),t=a.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+length);
    v.gain.setValueAtTime(.00003,t);v.gain.exponentialRampToValueAtTime(amp,t+.007);v.gain.exponentialRampToValueAtTime(.00003,t+length);
    o.connect(v);v.connect(this.out);o.start();o.stop(t+length+.01);o.onended=()=>{o.disconnect();v.disconnect();};
  }
  toggle(){this.muted=!this.muted;if(this.ctx)this.out.gain.setTargetAtTime(this.muted?0:.53,this.ctx.currentTime,.04);}
  paint(f){
    const a=this.ctx;if(!a||a.state!=='running')return;const t=a.currentTime,set=(p,v,s=.07)=>p.setTargetAtTime(v,t,s);
    set(this.air.v.gain,.018+Math.abs(f.wind[2].p)*.028,.3);set(this.air.f.frequency,690+Math.abs(f.wind[2].p)*380);
    const engine=f.stage==='harvest'||f.stage==='arrival'||f.stage==='unload'?.035:0;
    set(this.motor.frequency,39+f.speed*9+f.truck.speed*3+f.shake*19);set(this.harm.frequency,78+f.speed*18+f.truck.speed*6.1);
    set(this.motorGain.gain,engine+f.speed*.054+f.truck.speed*.027+f.flow*.051);
    set(this.straw.v.gain,Math.min(.42,f.lastCut*1.63));set(this.straw.f.frequency,1850+f.rpm*260);
    set(this.pour.v.gain,f.impactRate*1.25);set(this.pour.f.frequency,1300+Math.min(1,f.truck.load/7)*1100);
    set(this.water.v.gain,f.channels[0].flux*.95+f.wheelFlow*.065);
    if(f.impactRate>.018&&t>this.nextGrain){this.pulse(600+this.rng()*1450,.031+this.rng()*.045,.011+f.impactRate*.050,'triangle',300+this.rng()*370);this.nextGrain=t+.022+this.rng()*.045;}
    if(f.lastCut>.035&&t>this.nextCut){this.pulse(520+this.rng()*520,.032,.022,'triangle',155+this.rng()*100);this.nextCut=t+.05+this.rng()*.12;}
    if(t>this.nextBird){this.pulse(1700+this.rng()*500,.14,.010,'sine',2570);this.nextBird=t+4+this.rng()*9;}
  }
}
