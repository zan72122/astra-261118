'use strict';
class TruckSound {
  constructor(){this.ctx=null;this.muted=false;}
  wake(){
    if(!this.ctx){
      const Ac=window.AudioContext||window.webkitAudioContext;if(!Ac)return;
      const c=this.ctx=new Ac(),master=this.master=c.createGain();
      master.gain.value=this.muted?0:.48;master.connect(c.destination);
      const noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);
      const samples=noise.getChannelData(0);let prev=0;for(let i=0;i<noise.length;i++){prev=prev*.18+(Math.random()*2-1)*.82;samples[i]=prev;}
      this.noise=noise;
      const tone=(wave,f,amp)=>{const o=c.createOscillator(),g=c.createGain();o.type=wave;o.frequency.value=f;g.gain.value=amp;o.connect(g).connect(master);o.start();return [o,g];};
      this.motor=tone('sine',44,0);this.overtone=tone('triangle',91,0);this.pump=tone('sine',201,0);
      this.flow=c.createBufferSource();this.flow.buffer=noise;this.flow.loop=true;
      this.filter=c.createBiquadFilter();this.filter.type='bandpass';this.filter.Q.value=.83;
      this.air=c.createGain();this.air.gain.value=0;
      this.flow.connect(this.filter).connect(this.air).connect(master);this.flow.start();
      this.friction=c.createBiquadFilter();this.friction.type='bandpass';this.friction.Q.value=5;
      this.rack=c.createGain();this.rack.gain.value=0;this.flow.connect(this.friction).connect(this.rack).connect(master);
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  mute(){this.muted=!this.muted;if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:.48,this.ctx.currentTime,.055);}
  play(name,power){
    if(!this.ctx)return;
    const c=this.ctx,t=c.currentTime;
    const note=(f,end,length,amp,type='sine',delay=0)=>{
      const o=c.createOscillator(),g=c.createGain(),ts=t+delay;o.type=type;
      o.frequency.setValueAtTime(f,ts);o.frequency.exponentialRampToValueAtTime(end,ts+length);
      g.gain.setValueAtTime(.0001,ts);g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp*power),ts+.014);
      g.gain.exponentialRampToValueAtTime(.0001,ts+length);o.connect(g).connect(this.master);o.start(ts);o.stop(ts+length+.02);
    };
    const rustle=(f,len,amp)=>{const n=c.createBufferSource(),q=c.createBiquadFilter(),g=c.createGain();
      n.buffer=this.noise;q.type='lowpass';q.frequency.setValueAtTime(f,t);q.frequency.exponentialRampToValueAtTime(f*.34,t+len);
      g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(amp*power,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+len);
      n.connect(q).connect(g).connect(this.master);n.start(t,.22);n.stop(t+len);};
    if(name==='thud'){note(114,43,.31,.45);rustle(2400,.28,.42);note(173,115,.16,.075,'triangle',.055);}
    if(name==='creak'){note(277,171,.49,.079,'triangle',.04);note(368,230,.37,.029,'sine',.1);}
    if(name==='release'||name==='latch'){rustle(1750,.13,.19);note(318,185,.13,.1);}
    if(name==='pump')rustle(830,.34,.12);
    if(name==='garden'){note(653,650,.6,.1);note(975,972,.81,.055,'sine',.22);}
  }
  update(s,events){
    if(!this.ctx)return;const t=this.ctx.currentTime;
    const set=(a,v)=>a.setTargetAtTime(v,t,.085);
    set(this.motor[0].frequency,41+s.speed*7);set(this.motor[1].gain,.012+s.speed*.014);
    set(this.overtone[0].frequency,83+s.speed*14);set(this.overtone[1].gain,.003+s.speed*.003);
    set(this.pump[0].frequency,143+172*s.pressure);set(this.pump[1].gain,s.pressure*.082);
    set(this.filter.frequency,530+s.pressure*1070+s.can.x*700);
    const strain=Math.max(...s.springs.map(q=>Math.abs(q.v)));
    set(this.friction.frequency,280+s.mass*1.75+strain*320);set(this.rack.gain,Math.min(.22,strain*.66));
    const water=Math.max(0,1-Math.abs((s.distance-s.lap*MorningRoute.LENGTH)-125)/43)*Math.abs(s.water[14].v);
    set(this.air.gain,.005+s.pressure*.34+s.can.x*.20+s.speed*.004+Math.min(.035,water*2));
    events.forEach(e=>this.play(e.name,e.power));
  }
}
