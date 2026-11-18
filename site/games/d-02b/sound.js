'use strict';
class KartSound{
  constructor(){this.enabled=true;this.ctx=null;this.lastDistance=0;this.rng=S.random(58743);this.mark=0;this.honk=0;}
  open(){
    if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      const c=this.ctx=new AC();this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
      const compressor=c.createDynamicsCompressor();compressor.threshold.value=-15;compressor.ratio.value=3;compressor.connect(this.master);
      this.bus=c.createGain();this.bus.connect(compressor);
      const feedback=c.createGain();feedback.gain.value=.39;this.echo=c.createGain();this.echo.gain.value=0;
      const delay=c.createDelay(1);delay.delayTime.value=.137;const muffler=c.createBiquadFilter();muffler.type='lowpass';muffler.frequency.value=2050;
      this.bus.connect(this.echo);this.echo.connect(delay);delay.connect(muffler);muffler.connect(compressor);muffler.connect(feedback);feedback.connect(delay);
      this.motor=c.createOscillator();const real=new Float32Array(9),imag=new Float32Array([0,.77,.42,.24,.09,.11,.07,.055,.02]);
      this.motor.setPeriodicWave(c.createPeriodicWave(real,imag));this.motorFilter=c.createBiquadFilter();this.motorFilter.type='lowpass';this.motorFilter.frequency.value=390;
      this.motorGain=c.createGain();this.motorGain.gain.value=.032;this.motor.connect(this.motorFilter);this.motorFilter.connect(this.motorGain);this.motorGain.connect(this.bus);this.motor.start();
      const length=Math.ceil(c.sampleRate*2.37);this.noise=c.createBuffer(1,length,c.sampleRate);const samples=this.noise.getChannelData(0);
      for(let i=0;i<length;i++)samples[i]=this.rng()*2-1;
      this.beds={};
      for(const [name,freq,q] of [['air',760,.38],['creek',1850,.55],['leaves',2750,.66],['water',1130,.68],['gravel',780,1.04],['snow',480,.48]]){
        const src=c.createBufferSource();src.buffer=this.noise;src.loop=true;src.playbackRate.value=.74+this.rng()*.52;
        const filter=c.createBiquadFilter();filter.type='bandpass';filter.frequency.value=freq;filter.Q.value=q;
        const gain=c.createGain();gain.gain.value=0;src.connect(filter);filter.connect(gain);gain.connect(this.bus);src.start(0,this.rng()*1.8);this.beds[name]={gain,filter};
      }
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  tone(hz,when,length,level,type='sine'){
    const c=this.ctx,osc=c.createOscillator(),gain=c.createGain();osc.type=type;osc.frequency.setValueAtTime(hz,when);
    gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(level,when+.032);
    gain.gain.exponentialRampToValueAtTime(.0001,when+length);osc.connect(gain);gain.connect(this.bus);osc.start(when);osc.stop(when+length+.02);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  click(q){
    const c=this.ctx,src=c.createBufferSource(),gain=c.createGain(),f=c.createBiquadFilter(),t=c.currentTime,w=q.surface==='water',snow=q.surface==='snow',gravel=q.surface==='gravel';
    src.buffer=this.noise;f.type='bandpass';f.Q.value=w?2.1:1.24;
    f.frequency.value=(w?1500:snow?580:gravel?1200:3200)*(.65+this.rng()*.75);
    const span=w?.092:snow?.13:gravel?.043:.08;gain.gain.setValueAtTime((.025+q.speed*.0023)*(.5+this.rng()),t);gain.gain.exponentialRampToValueAtTime(.0001,t+span);
    src.connect(f);f.connect(gain);gain.connect(this.bus);src.start(t,this.rng()*1.9,span+.01);src.onended=()=>{src.disconnect();f.disconnect();gain.disconnect();};
  }
  update(q){
    if(!this.ctx)return;const c=this.ctx,t=c.currentTime;
    const to=(p,v,tau=.065)=>p.setTargetAtTime(v,t,tau);
    to(this.master.gain,this.enabled?.78:0);to(this.motor.frequency,q.engineHz*(1+q.shocks[2].v*.022));
    to(this.motorFilter.frequency,230+q.engineLoad*360+q.speed*17);to(this.motorGain.gain,.066+.044*q.engineLoad+q.speed*.001);
    to(this.echo.gain,q.echo*.84);to(this.beds.air.gain.gain,(.021+q.wind*.007+q.speed*.00085)*(1-.77*q.echo));
    to(this.beds.creek.gain.gain,(.036+q.water[4].h*.12)*(1-.8*q.snow)*(1-q.echo)*(q.route>0?.34:1));
    for(const name of ['leaves','water','gravel','snow']){const bed=this.beds[name];to(bed.gain.gain,q.surface===name?.0038*q.speed:0);}
    to(this.beds.water.filter.frequency,830+q.speed*38+q.water[6].v*360);
    if(q.travel-this.lastDistance>.44+1.1*(1-q.gravel)){this.lastDistance=q.travel;this.click(q);}
    if(q.ringCount!==this.mark){this.mark=q.ringCount;[660,880,1108.7].forEach((f,i)=>this.tone(f,t+i*.073,.39,.060-i*.012));}
    if(q.hornCount!==this.honk){this.honk=q.hornCount;const f=[329.63,392,440][this.honk%3];for(const [i,off] of [0,.21].entries()){this.tone(f,t+off,.16+i*.08,.072,'triangle');this.tone(f*1.25,t+off+.012,.18+i*.07,.046,'triangle');}}
  }
}
