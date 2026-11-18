'use strict';
function valleyAudio() {
  let ctx,master,stream,air,motor,motorLevel,whistle,enabled=true,lastStrike=0,lastPhase='',wakeTime=0;
  function wake(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();master=ctx.createGain();master.gain.value=enabled?.50:0;master.connect(ctx.destination);
      const n=ctx.sampleRate*4,buf=ctx.createBuffer(1,n,ctx.sampleRate),v=buf.getChannelData(0),random=Valley.generator(7941);let brown=0;
      for(let i=0;i<n;i++){brown=(brown+.15*(random()*2-1))/1.1;v[i]=brown*.9+(random()-.5)*.11;}
      const noise=ctx.createBufferSource();noise.buffer=buf;noise.loop=true;
      function filtered(type,frequency){
        const f=ctx.createBiquadFilter(),g=ctx.createGain();f.type=type;f.frequency.value=frequency;f.Q.value=.48;
        noise.connect(f);f.connect(g);g.gain.value=0;g.connect(master);return {f,g};
      }
      stream=filtered('highpass',680);air=filtered('lowpass',480);
      whistle=filtered('bandpass',1600);noise.start();motor=ctx.createOscillator();motor.type='sine';motor.frequency.value=46;
      motorLevel=ctx.createGain();motorLevel.gain.value=0;motor.connect(motorLevel);motorLevel.connect(master);motor.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function tone(f,volume,length,type='sine',slide=1){
    if(!ctx||ctx.state!=='running')return;
    const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*slide,t+length*.67);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.026);g.gain.exponentialRampToValueAtTime(.0001,t+length);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+length+.04);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function update(s){
    if(!ctx)return;const t=ctx.currentTime;
    stream.g.gain.setTargetAtTime(s.riverGain*3.6,t,.3);air.g.gain.setTargetAtTime(.065+s.wind[4].speed*.038,t,.4);
    air.f.frequency.setTargetAtTime(380+125*s.wind[1].speed,t,.3);whistle.g.gain.setTargetAtTime(s.phase==='ridge'?.08:.008,t,.5);
    motor.frequency.setTargetAtTime(37+s.speed*7,t,.1);motorLevel.gain.setTargetAtTime(s.speed*.0032,t,.14);
    if(s.strikes!==lastStrike && s.phase==='ridge'){const f=[654,824,980][s.chimeIndex];tone(f,.12,2.2);tone(f*2.72,.027,1.1);}lastStrike=s.strikes;
    if(lastPhase!==s.phase){if(['walk','ridge','morning'].includes(s.phase)&&lastPhase){tone(698,.075,1.1);tone(1047,.036,1.6);}lastPhase=s.phase;}
    if(s.phase==='ride'&&s.distance>12&&s.time>wakeTime){tone(1740+s.birds[1].y*75,.025,.18,'sine',1.26);wakeTime=s.time+4.8+s.wind[4].speed*1.6;}
  }
  return {wake,update,toggle(){enabled=!enabled;wake();if(ctx)master.gain.setTargetAtTime(enabled?.5:0,ctx.currentTime,.09);return enabled;},
    touch(){wake();tone(295,.036,.22,'sine',.83);},suspend(){if(ctx)ctx.suspend().catch(()=>{});}};
}
