(function(){
  'use strict';
  let ctx,master,room,noise,muted=false;
  const listener={x:0,y:2.8,z:7.4,yaw:0};
  function rainResponse(distance){
    return {frequency:4700/(1+distance*.11),gain:.06/(1+distance*.14),duration:.043+distance*.003};
  }
  function start(){
    if(!ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      ctx=new Audio();master=ctx.createDynamicsCompressor();master.threshold.value=-17;master.ratio.value=4;master.connect(ctx.destination);
      room=ctx.createConvolver();const n=Math.ceil(ctx.sampleRate*.83),impulse=ctx.createBuffer(2,n,ctx.sampleRate);
      for(let ch=0;ch<2;ch++){const a=impulse.getChannelData(ch);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*Math.exp(-i/n*7)*.16;}
      room.buffer=impulse;const wet=ctx.createGain();wet.gain.value=.19;room.connect(wet);wet.connect(master);
      noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.16),ctx.sampleRate);const arr=noise.getChannelData(0);for(let i=0;i<arr.length;i++)arr[i]=Math.random()*2-1;
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});display();
  }
  function display(){document.querySelector('#audio').classList.toggle('muted',muted||!ctx);}
  function envelope(t,amp,d,pan){
    const g=ctx.createGain();g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,amp),t+.005);g.gain.exponentialRampToValueAtTime(.00001,t+d);
    const dest=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();if(dest.pan)dest.pan.value=Math.max(-.92,Math.min(.92,pan));
    g.connect(dest);dest.connect(master);dest.connect(room);return g;
  }
  function tone(t,f,d,amp,pan,end=f){
    const o=ctx.createOscillator(),g=envelope(t,amp,d,pan);o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(end,t+d);o.connect(g);o.start(t);o.stop(t+d+.015);
  }
  const modes=[[1,1.62,2.72,4.16],[1,2.68,4.02,5.43],[1,1.49,2.09],[1,1.41,2.31,3.78],[1,1.89,2.76]];
  function play(e){
    if(!ctx||ctx.state!=='running'||muted)return;const t=ctx.currentTime;
    if(e.kind==='note'){modes[e.i].forEach((r,j)=>tone(t,e.pitch*r,e.decay/(1+j*.48),e.strength*.108/(1+j*2.25),e.x*.28));tone(t,1100,.052,.023,e.x*.28,590);}
    if(e.kind==='bell')[1,2.72,4.41].forEach((r,j)=>tone(t,[987.8,1174.7,1479.9][e.i]*r,1.9/(1+j),e.strength*.12/(1+j*2),(e.i-1)*.35));
    if(e.kind==='bird'){tone(t,e.pitch,.14,.031,-.37,e.pitch*1.48);tone(t+.19,e.pitch*1.3,.21,.024,-.32,e.pitch*.92);}
    if(e.kind==='rain'){
      const dx=e.x-listener.x,dz=e.z-listener.z,dist=Math.hypot(dx,dz,listener.y+.246),voice=rainResponse(dist),d=voice.duration;
      const pan=(dx*Math.cos(listener.yaw)-dz*Math.sin(listener.yaw))/(dist+2);
      const src=ctx.createBufferSource(),lp=ctx.createBiquadFilter();src.buffer=noise;lp.type='bandpass';lp.frequency.value=voice.frequency;lp.Q.value=1.05;
      src.connect(lp);lp.connect(envelope(t,voice.gain*e.strength,d,pan));src.start(t);src.stop(t+d);
    }
  }
  if(typeof module!=='undefined')module.exports={rainResponse};
  if(typeof window!=='undefined')window.GardenSound={start,play,listen(x,y,z,yaw){Object.assign(listener,{x,y,z,yaw});},toggle(){if(!ctx){start();return;}muted=!muted;start();display();}};
})();
