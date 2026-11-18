'use strict';
class LaneSound {
  constructor(){this.ctx=null;this.on=true;this.last=0;}
  start(){
    if(!this.ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      this.ctx=new AC();const c=this.ctx;
      this.master=c.createGain();this.master.gain.value=this.on?.57:0;
      const limiter=c.createDynamicsCompressor();this.master.connect(limiter);limiter.connect(c.destination);
      this.noise=c.createBuffer(1,c.sampleRate*3,c.sampleRate);
      const a=this.noise.getChannelData(0);let brown=0;
      for(let i=0;i<a.length;i++){const w=Math.random()*2-1;brown=.975*brown+.16*w;a[i]=w*.75+brown*.25;}
      this.air=c.createBiquadFilter();this.air.type='lowpass';this.air.frequency.value=8000;this.air.connect(this.master);
      this.foot=c.createBiquadFilter();this.foot.type='lowpass';this.foot.frequency.value=8200;this.foot.connect(this.air);
      this.rain=c.createGain();this.rain.gain.value=0.0001;
      const n=c.createBufferSource();n.buffer=this.noise;n.loop=true;
      const band=c.createBiquadFilter();band.type='highpass';band.frequency.value=390;
      n.connect(band);band.connect(this.rain);this.rain.connect(this.air);n.start();
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  toggle(){this.on=!this.on;this.start();if(this.ctx)this.master.gain.setTargetAtTime(this.on?.57:0,this.ctx.currentTime,.04);return this.on;}
  voice(type,f0,f1,duration,level,delay=0,filter='bandpass',q=.75){
    const c=this.ctx,t=c.currentTime+delay,g=c.createGain(),isNoise=type==='noise';
    let src,shape;
    if(isNoise){src=c.createBufferSource();src.buffer=this.noise;shape=c.createBiquadFilter();shape.type=filter;shape.Q.value=q;src.connect(shape);}
    else {src=c.createOscillator();src.type=type;shape=src;}
    shape.frequency.setValueAtTime(f0,t);shape.frequency.exponentialRampToValueAtTime(Math.max(22,f1),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),t+.006);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    shape.connect(g);g.connect(this.bus||this.air);if(isNoise)src.start(t,Math.random());else src.start(t);src.stop(t+duration+.01);
    src.onended=()=>{src.disconnect();if(isNoise)shape.disconnect();g.disconnect();};
  }
  update(s){
    if(!this.ctx){this.last=s.serial;return;}
    const t=this.ctx.currentTime;this.rain.gain.setTargetAtTime(.0024+s.rain*(.16-.055*s.roof)+s.outflow*.10,t,.13);
    this.air.frequency.setTargetAtTime(s.cutoff,t,.08);
    for(const e of s.events)if(e.id>this.last){
      if(e.kind==='step'){
        this.bus=this.foot;this.foot.frequency.setTargetAtTime(e.footCutoff,t,.014);
        const v=e.speed,muffle=1/(1+.52*e.fill),f=e.bottomHz;
        if(e.depth){
          this.voice('noise',(5050+1300*v)*muffle,(780+75*v)*muffle,.11+.041*e.depth+.05*v,.18+.14*v,0,'lowpass');
          this.voice('sine',f*1.26,f*.43,.13+e.depth*.035,.30+.12*v,.026);
          for(let i=0;i<3+v*3;i++){const n=(850+Math.random()*1150)*muffle;this.voice('sine',n,n*1.39,.036+Math.random()*.05,.024*v,.035+Math.random()*.17);}
          if(e.material==='leaves')this.voice('noise',1680*muffle,740*muffle,.17,.17,.012,'highpass');
          if(e.fill>.05)this.voice('noise',460,190,.18,.1*e.fill,.18,'lowpass');
        }else{
          if(e.material==='wetTile')this.voice('noise',1500*muffle,280,.14,.14,0,'lowpass');
          this.voice('triangle',f,f*.70,.073,.20);this.voice('sine',f*2.39,f*2.35,.16,.069,.014);
          this.voice('noise',2100*muffle,630,.040,.13,0,'bandpass',1.9);
        }
        this.bus=null;
      }else if(e.kind==='tine'){const f=[523,659,784,880][e.note];this.voice('sine',f,f*.998,.72,.092);this.voice('sine',f*2.78,f*2.765,.21,.035);
      }else if(e.kind==='brush'){this.voice('noise',1800+e.power*1400,610,.135,.04+.055*e.power,0,'bandpass');
      }else if(e.kind==='drip'){
        if(e.roof>.3)this.voice('triangle',271+e.pi*28,184,.10,.026*e.roof);
        const f=720+e.pi*95+Math.random()*630;this.voice('sine',f,f*1.36,.075,.016+Math.random()*.024);
      }else if(e.kind==='pour'){this.voice('noise',2600,510,.52,.19,0,'lowpass');this.voice('sine',530,506,.31,.04,.04);}
    }
    this.last=s.serial;
  }
}
