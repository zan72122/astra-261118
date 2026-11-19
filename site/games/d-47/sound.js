'use strict';
function makeSound(){
  let ctx,master,air,airFilter,noise,muted=false,lastCreak=0,lastBell=0,previousV=0;
  function open(){
    if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.67;master.connect(ctx.destination);
      noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);let raw=noise.getChannelData(0),prev=0;
      for(let i=0;i<raw.length;i++){prev=.39*prev+.61*(Math.random()*2-1);raw[i]=prev;}
      let src=ctx.createBufferSource();src.buffer=noise;src.loop=true;
      airFilter=ctx.createBiquadFilter();airFilter.type='lowpass';airFilter.frequency.value=590;air=ctx.createGain();air.gain.value=.0001;src.connect(airFilter).connect(air).connect(master);src.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function tone(f,end,dur,amp,wave='sine',delay=0){
    const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=wave;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(end,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(master);o.start(t);o.stop(t+dur+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function breeze(hz,dur,amp,delay=0,q=.65){
    const t=ctx.currentTime+delay,b=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();b.buffer=noise;b.loop=true;f.type='bandpass';f.frequency.setValueAtTime(hz,t);f.frequency.exponentialRampToValueAtTime(hz*.56,t+dur);f.Q.value=q;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+Math.min(.035,dur*.17));g.gain.exponentialRampToValueAtTime(.0001,t+dur);b.connect(f).connect(g).connect(master);b.start(t,Math.random());b.stop(t+dur+.01);b.onended=()=>{b.disconnect();f.disconnect();g.disconnect();};
  }
  function update(s){
    const events=s.events.splice(0);if(!ctx||ctx.state!=='running')return;
    for(const e of events){
      if(e.kind==='hit'){const gain=.22+.10*e.speed;tone(e.frequency*1.28,e.frequency*.77,e.duration,gain);tone(e.frequency*2.17,e.frequency*1.44,e.duration*.49,gain*.22,'triangle');breeze(510+e.frequency*2,e.duration*1.17,e.air);breeze(1900,.068,e.air*.20,.013);}
      if(e.kind==='rustle'){breeze(1640,.66,.29);breeze(2600,.47,.19,.21);breeze(840,.38,.15,.4);}
      if(e.kind==='flutter')breeze(920+560*e.energy,.20+e.energy*.10,.045+e.energy*.11);
    }
    const w=s.zones[3].wind,t=ctx.currentTime;air.gain.setTargetAtTime((.008+.018*w)*(.6+s.travel),t,.3);airFilter.frequency.setTargetAtTime(380+630*w,t,.4);
    const bend=s.rods[3];
    if(Math.abs(bend.velocity)>.00050 && s.travel>.5 && t-lastCreak>2.6){lastCreak=t;tone(229+Math.abs(bend.velocity)*190,198,.27,.014,'triangle');breeze(846,.23,.023,0,4);}
    if(previousV*s.chimeV<0 && Math.abs(s.chime)>.081 && t-lastBell>6.9){lastBell=t;tone(1374,1372,.89,.019);tone(2465,2462,.42,.009);}
    previousV=s.chimeV;
  }
  return {open,update,toggle(){open();muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.67,ctx.currentTime,.035);return muted;}};
}
