class NurseryAudio {
  constructor(){this.enabled=true;this.ctx=null;this.lastGrain=0;}
  start(){
    if(!this.ctx){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      this.ctx=new C();const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.enabled?.59:0;
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=5;this.master.connect(limiter);limiter.connect(c.destination);
      this.noise=c.createBuffer(1,2*c.sampleRate,c.sampleRate);const d=this.noise.getChannelData(0);
      let smooth=0;for(let i=0;i<d.length;i++){smooth=.64*smooth+.36*(Math.random()*2-1);d[i]=smooth;}
      this.beds=[];
      for(const type of ['lowpass','bandpass']){
        const src=c.createBufferSource(), filter=c.createBiquadFilter(),volume=c.createGain();
        src.buffer=this.noise;src.loop=true;filter.type=type;filter.frequency.value=400;filter.Q.value=.67;
        volume.gain.value=0;src.connect(filter);filter.connect(volume);volume.connect(this.master);src.start();this.beds.push({volume,filter});
      }
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  toggle(){this.start();this.enabled=!this.enabled;if(this.ctx)this.master.gain.setTargetAtTime(this.enabled?.59:0,this.ctx.currentTime,.03);return this.enabled;}
  tone(f,t,d,v,type='sine',end=f){
    const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(end,t+d);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+d+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  tapNoise(t,d,f,v){
    const c=this.ctx,o=c.createBufferSource(),g=c.createGain(),filter=c.createBiquadFilter();o.buffer=this.noise;
    filter.type='bandpass';filter.frequency.value=f;filter.Q.value=.75;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(filter);filter.connect(g);g.connect(this.master);o.start(t,Math.random());o.stop(t+d+.01);o.onended=()=>{o.disconnect();g.disconnect();filter.disconnect();};
  }
  update(s,events){
    if(!this.ctx)return;
    const t=this.ctx.currentTime;
    const roll=s.stage===0?Math.max(s.starter.v*.45,s.marble.v*.76):0;
    const axle=s.stage===0?s.car.v:0;
    const air=s.stage===2?s.prop.v*.028:0,water=s.stage===1?Math.abs(s.wheel.v)*.16:0;
    const [b,a]=this.beds;b.volume.gain.setTargetAtTime(roll*.12+water*.09,t,.055);b.filter.frequency.setTargetAtTime(190+roll*290+water*300,t,.05);
    a.volume.gain.setTargetAtTime(axle*.055+air*.085,t,.07);a.filter.frequency.setTargetAtTime(390+axle*145+air*290,t,.06);
    if(roll+axle>.2 && t>this.lastGrain){this.tapNoise(t,.026,360+roll*195,.026+axle*.014);this.lastGrain=t+.08/(.7+roll+axle);}
    for(const e of events){
      const p=e.power,i=e.tone;
      if(e.type==='domino'||e.type==='wood'||e.type==='tick'){
        const low=e.type==='wood',f=low?148:490+i*19;
        this.tapNoise(t,.045,low?790:2250,p*.50);this.tone(f,t,low?.25:.085,p*.24,'triangle',f*.78);
        this.tone(f*2.41,t,.046,p*.08);
      }else if(e.type==='puff'||e.type==='wind'||e.type==='water'){
        this.tapNoise(t,.32,e.type==='water'?670:1100,p*.4);if(e.type==='puff')this.tone(190,t,.23,.07,'sine',280);
      }else if(e.type==='axle'||e.type==='marble'){this.tapNoise(t,.085,930,p*.30);}
      else{
        const notes=[392,440,523.25,587.33,659.25],f=notes[i%5]*(e.type==='glass'?1.5:1);
        this.tone(f,t,.65,p*.19);this.tone(f*2.72,t,.32,p*.046);this.tapNoise(t,.025,f*3,p*.13);
        if(e.type==='chord'){this.tone(f*1.25,t+.15,.72,.095);this.tone(f*1.5,t+.32,1,.12);}
      }
    }
  }
}
