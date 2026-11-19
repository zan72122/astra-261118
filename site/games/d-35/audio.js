'use strict';
const ButtonSound=(()=>{
  let ctx=null,out=null,muted=false,noise=null;
  function start(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();out=ctx.createGain();out.gain.value=muted?0:.46;
      const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=5;
      out.connect(limiter);limiter.connect(ctx.destination);
      noise=ctx.createBuffer(1,ctx.sampleRate*.32,ctx.sampleRate);
      const samples=noise.getChannelData(0),rand=ButtonWorkshop.random(4380);
      for(let i=0;i<samples.length;i++)samples[i]=(rand()-.5)*2;
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function tone(freq,decay,gain,start,filter,type='sine',bend=1){
    const osc=ctx.createOscillator(),env=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,start);osc.frequency.exponentialRampToValueAtTime(freq*bend,start+decay);
    const peak=Math.max(.00002,gain),attack=start+.003,end=attack+6*decay;
    env.gain.setValueAtTime(.00001,start);env.gain.exponentialRampToValueAtTime(peak,attack);
    env.gain.exponentialRampToValueAtTime(peak*Math.exp(-6),end);
    env.gain.linearRampToValueAtTime(0,end+.015);
    osc.connect(env);env.connect(filter);osc.start(start);osc.stop(end+.018);
    osc.onended=()=>{osc.disconnect();env.disconnect();};
  }
  function breath(freq,gain,duration){
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),env=ctx.createGain(),t=ctx.currentTime;
    src.buffer=noise;f.type='bandpass';f.frequency.value=freq;f.Q.value=.75;
    env.gain.setValueAtTime(gain,t);env.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(f);f.connect(env);env.connect(out);src.start();src.stop(t+duration);
    src.onended=()=>{src.disconnect();f.disconnect();env.disconnect();};
  }
  function play(e){
    if(!ctx||muted||ctx.state!=='running')return;
    const t=ctx.currentTime+.002,m=ButtonWorkshop.materials[e.mat||0];
    if(e.type==='hit'){
      const gain=Math.min(.53,.064*e.speed)*Math.sqrt(m.mass);
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=e.cutoff;filter.Q.value=.35;filter.connect(out);
      m.modes.forEach((ratio,i)=>tone(e.hz*ratio,e.decay/(1+i*.31),gain*m.gains[i],t,filter,'sine',i? .997:.999));
      tone(e.bottomHz,.34*(1-.52*e.level),gain*e.bottomGain,t,out);
      tone(e.wallHz,e.wallDecay,gain*.18,t,out);
      breath(e.mat===4?690:1750+e.mat*400,gain*(e.mat===4?.48:.12),.035);
      // The filter belongs to this particular impact and is retired with its tail.
      setTimeout(()=>filter.disconnect(),(m.decay*6+.15)*1000);
    }else if(e.type==='latch'){
      tone(236,.22,.15,t,out,'sine',.93);breath(620,.095,.086);
      [523.25,659.25,783.99].forEach((f,i)=>tone(f,1.12,.056,t+.15+i*.16,out));
    }else if(e.type==='water'){tone(620,.16,.058,t,out,'sine',1.48);breath(1570,.033,.16);}
    else if(e.type==='air')breath(750,.12,.30);
    else if(e.type==='lift')breath(m.hz*2,.046,.047);
  }
  function toggle(){start();muted=!muted;if(out)out.gain.setTargetAtTime(muted?0:.46,ctx.currentTime,.025);return muted;}
  return {start,play,toggle};
})();
