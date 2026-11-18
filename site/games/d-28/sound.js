'use strict';
function makeSound(){
  let ctx,master,wet,muted=false;
  function unlock(){
    if(!ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      ctx=new Audio();
      master=ctx.createGain();master.gain.value=muted?0:.74;
      const limit=ctx.createDynamicsCompressor();limit.threshold.value=-16;limit.ratio.value=4;
      master.connect(limit);limit.connect(ctx.destination);
      const impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*.91),ctx.sampleRate);
      for(let ch=0;ch<2;ch++){
        const a=impulse.getChannelData(ch);let last=0;
        for(let i=0;i<a.length;i++){last=last*.37+(Math.random()*2-1)*.63;a[i]=last*Math.exp(-i/(ctx.sampleRate*.145));}
      }
      wet=ctx.createConvolver();wet.buffer=impulse;const send=ctx.createGain();send.gain.value=.15;wet.connect(send);send.connect(master);
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function tone(hz,vol,decay,pan=0,partials=[[1,1],[2.76,.26],[5.40,.12],[8.93,.036]]){
    if(!ctx||muted||ctx.state!=='running')return;
    const now=ctx.currentTime+.003,voice=ctx.createStereoPanner();voice.pan.value=pan;voice.connect(master);voice.connect(wet);
    let remaining=partials.length;
    partials.forEach(([ratio,gain],i)=>{
      const osc=ctx.createOscillator(),env=ctx.createGain(),life=decay/(1+i*.65);
      osc.frequency.setValueAtTime(hz*ratio*1.0015,now);
      osc.frequency.exponentialRampToValueAtTime(hz*ratio,now+.065);
      env.gain.setValueAtTime(.00001,now);env.gain.exponentialRampToValueAtTime(Math.max(.0001,vol*gain),now+.0037);
      env.gain.exponentialRampToValueAtTime(.00001,now+life);
      osc.connect(env);env.connect(voice);osc.start(now);osc.stop(now+life+.02);
      osc.onended=()=>{osc.disconnect();env.disconnect();if(!--remaining)voice.disconnect();};
    });
  }
  function play(events){
    for(const e of events){
      if(e.type==='note')tone(e.hz,.21*e.force,1.65+e.length*.022,(e.lane/11-.5)*.68);
      if(e.type==='click')tone(1040,.034,.047,.38,[[1,1],[1.86,.5],[3.27,.32]]);
      if(e.type==='bell')tone(e.hz,.085,2.15,-.24,[[1,1],[2.01,.28],[3.96,.12],[6.14,.05]]);
      if(e.type==='seat')tone(1540,.043,.12,(e.lane/11-.5)*.45,[[1,1],[2.48,.21]]);
      if(e.type==='latch'){tone(e.hz,.075,2.5);tone(e.hz*1.5,.042,2.04);}
    }
  }
  return {unlock,play,toggle(){muted=!muted;unlock();if(master)master.gain.setTargetAtTime(muted?0:.74,ctx.currentTime,.035);return muted;}};
}
