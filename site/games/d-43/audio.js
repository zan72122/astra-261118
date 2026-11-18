'use strict';
function makeSound(){
  let ctx,master,blade,wind,bladeFilter,pan,muted=false,lastGrain=0,lastBell=0,lastStop=0;
  const noises=[];
  function start(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.61;master.connect(ctx.destination);
      for(let k=0;k<3;k++){
        const n=ctx.createBuffer(1,ctx.sampleRate*(2+k*.25),ctx.sampleRate),data=n.getChannelData(0);let brown=0;
        for(let i=0;i<data.length;i++){const w=Math.random()*2-1;brown=(brown+.025*w)/1.025;data[i]=k===1?brown*4:w;}
        noises.push(n);
      }
      function continuous(k,type,hz,q){
        const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
        src.buffer=noises[k];src.loop=true;filter.type=type;filter.frequency.value=hz;filter.Q.value=q;gain.gain.value=0;
        src.connect(filter);filter.connect(gain);src.start();return {filter,gain};
      }
      const b=continuous(0,'bandpass',450,2.8);bladeFilter=b.filter;blade=b.gain;
      pan=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();blade.connect(pan);pan.connect(master);
      wind=continuous(1,'lowpass',1100,.4).gain;wind.connect(master);
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function grain(hz,gain,duration,q,delay=0){
    const now=ctx.currentTime+delay,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    src.buffer=noises[2];f.type='bandpass';f.frequency.setValueAtTime(hz,now);f.frequency.exponentialRampToValueAtTime(hz*.44,now+duration);f.Q.value=q;
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),now+.004);
    g.gain.exponentialRampToValueAtTime(.0001,now+duration);src.connect(f);f.connect(g);g.connect(master);
    src.start(now,Math.random());src.stop(now+duration+.015);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};
  }
  function chime(j,vol){
    const now=ctx.currentTime;
    [1,2.71].forEach((partial,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=[660,785,880,990,1180][j%5]*partial;
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.001,vol*(i?.024:.074)),now+.008);
      g.gain.exponentialRampToValueAtTime(.0001,now+1.25/(i+1));
      o.connect(g);g.connect(master);o.start();o.stop(now+1.4);o.onended=()=>{o.disconnect();g.disconnect();};
    });
  }
  function update(s){
    if(!ctx||ctx.state!=='running')return;
    const a=s.sounds,t=ctx.currentTime;
    bladeFilter.frequency.setTargetAtTime(a.bladeHz,t,.045);
    blade.gain.setTargetAtTime(a.blade*.39,t,.035);wind.gain.setTargetAtTime(a.wind*.38,t,.1);
    if(pan.pan)pan.pan.setTargetAtTime(a.pan,t,.05);
    if(a.grainCount!==lastGrain){lastGrain=a.grainCount;grain(1000+1800*s.roughness,.15+a.crunch*.6,.082,.8);grain(3400,.19,.045,1.2,.017);}
    if(a.stopCount!==lastStop){lastStop=a.stopCount;grain(1550,.40,.16,1.4);}
    if(a.bellCount!==lastBell){lastBell=a.bellCount;chime(lastBell,a.bell);}
  }
  return {start,update,mute(on){muted=on;if(ctx)master.gain.setTargetAtTime(on?0:.61,ctx.currentTime,.04);}};
}
