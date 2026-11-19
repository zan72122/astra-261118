'use strict';
class SoundGarden {
  constructor(){this.on=true;this.ctx=null;this.budget={sand:0,water:0,metal:0,wood:0};this.lastStage='';this.lastPlank=-1;}
  wake(){
    if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
      const c=this.ctx=new A();this.master=c.createGain();this.master.gain.value=this.on?.67:0;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=3;this.master.connect(comp);comp.connect(c.destination);
      this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0);
      let prev=0;for(let i=0;i<data.length;i++){const n=Math.random()*2-1;data[i]=n*.8+prev*.2;prev=n;}
    }
    if(this.on&&this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  toggle(){this.on=!this.on;this.wake();if(this.ctx)this.master.gain.setTargetAtTime(this.on?.67:0,this.ctx.currentTime,.05);return this.on;}
  voice(freq,duration,amplitude,noise=false,pan=0,end=freq,q=.8){
    const c=this.ctx;if(!c||!this.on||c.state!=='running')return;
    const t=c.currentTime,src=noise?c.createBufferSource():c.createOscillator(),g=c.createGain();
    let tail=src;
    if(noise){src.buffer=this.noise;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(freq,t);f.frequency.exponentialRampToValueAtTime(end,t+duration);f.Q.value=q;src.connect(f);tail=f;}
    else{src.type='sine';src.frequency.setValueAtTime(freq,t);src.frequency.exponentialRampToValueAtTime(end,t+duration);}
    tail.connect(g);g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,amplitude),t+.005);g.gain.exponentialRampToValueAtTime(.00001,t+duration);
    if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(this.master);src.onended=()=>{tail.disconnect();g.disconnect();p.disconnect();src.disconnect();};}
    else {g.connect(this.master);src.onended=()=>{g.disconnect();tail.disconnect();};}
    if(noise)src.start(t,Math.random()*1.4);else src.start(t);
    src.stop(t+duration+.01);
  }
  update(s,dt){
    if(!this.ctx||!this.on)return;
    const rand=Math.random;
    const energy={sand:s.sound.sand,water:Math.min(1,s.sound.water+s.flow*1.3),metal:s.sound.metal};
    for(const [key,level] of Object.entries(energy)){
      this.budget[key]+=dt*level*({sand:43,water:13,metal:4}[key]);
      while(this.budget[key]>1){this.budget[key]--;
        if(key==='sand'){this.voice((1300+rand()*3800)*(1-.36*s.wetMean),.028+rand()*.084,.043+level*.055,true,-.19+rand()*.4,650+rand()*1850,1.1);}
        if(key==='water'){this.voice(820+rand()*1500,.13+rand()*.23,.045+level*.052,true,rand()*.55-.24,290+rand()*620,.7);
          this.voice(620+rand()*430,.055,.025,false,.08,1030+rand()*300);}
        if(key==='metal'){this.voice(680,.21,.045,false,-.21,643);this.voice(2420,.13,.021,false,-.2,2290);this.voice(1800,.15,.09,true,-.15,500);}
      }
    }
    if(s.stage==='drive'&&s.car.started){const plank=Math.floor(s.car.x/.29);if(plank!==this.lastPlank){
      this.voice(235+rand()*70,.09,.095,false,Math.max(-1,Math.min(1,s.car.x/3)),117);this.lastPlank=plank;}}
    if(s.stage!==this.lastStage&&s.stage==='drive')this.voice(420,.24,.09,true,.2,200,2.7);
    this.lastStage=s.stage;
  }
}

if(typeof module!=='undefined'&&module.exports)module.exports=SoundGarden;
