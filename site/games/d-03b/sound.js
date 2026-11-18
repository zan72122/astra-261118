'use strict';
function flightSound(){
  let ctx,master,air,edge,airGain,reed,reedGain,sea,seaGain,roar,roarGain,lastBird=0,lastBell=0,muted=false;
  function start(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.54;master.connect(ctx.destination);
      const buf=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buf.getChannelData(0);
      const rand=FlightWorld.random(89516);let brown=0;for(let i=0;i<data.length;i++){const v=rand()*2-1;brown=(brown+.055*v)/1.04;data[i]=v*.43+brown*2.1}
      function noise(type,q,freq,offset){const src=ctx.createBufferSource(),fil=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buf;src.loop=true;fil.type=type;fil.Q.value=q;fil.frequency.value=freq;g.gain.value=0;src.connect(fil).connect(g).connect(master);src.start(0,offset);return [fil,g]}
      [air,airGain]=noise('lowpass',.4,1700,.33);[edge]=noise('bandpass',1.1,294,.9);
      // A quiet narrow band follows the leading-edge whistle.
      edge.connect(airGain);[sea,seaGain]=noise('lowpass',.63,540,2.1);[roar,roarGain]=noise('bandpass',.65,244,1.4);
      reed=ctx.createOscillator();reedGain=ctx.createGain();reed.type='sine';reed.frequency.value=300;reedGain.gain.value=0;reed.connect(reedGain).connect(master);reed.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function tone(hz,end,duration,amp,pan,delay=0){
    const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(end,t+duration*.73);
    g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(amp,t+.023);g.gain.exponentialRampToValueAtTime(.00001,t+duration);
    o.connect(g);if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;g.connect(p).connect(master);o.onended=()=>{p.disconnect();g.disconnect();o.disconnect()}}else{g.connect(master);o.onended=()=>{o.disconnect();g.disconnect()}}
    o.start(t);o.stop(t+duration+.02);
  }
  const set=(p,v)=>p.setTargetAtTime(v,ctx.currentTime,.15);
  return {start,toggle(){if(!ctx){muted=false;start()}else{muted=!muted;if(!muted)start();set(master.gain,muted?0:.54)}return muted},
    update(model){if(!ctx||ctx.state!=='running')return;
      const {f,balloons,cells}=model,{quiet,windGain,windCutoff,whistleHz}=FlightWorld.acoustics(f),load=Math.abs(f.alpha),speed=f.air/12;
      set(air.frequency,windCutoff);set(airGain.gain,windGain);
      set(edge.frequency,270+speed*70+load*600);set(reed.frequency,whistleHz);set(reedGain.gain,.008*speed*quiet);
      const heat=balloons.reduce((sum,o)=>sum+o.flame*Math.exp(-Math.hypot(f.x-o.x,f.s-o.s)/23),0);
      set(roarGain.gain,heat*.33);set(roar.frequency,193+heat*110);
      set(seaGain.gain,(f.stage>=4?.07+.035*cells[12].gust:0)*(1-f.veil));set(sea.frequency,415+145*cells[10].gust);
      if(f.chirp>lastBird+.09){const hz=1820+320*cells[2].gust,p=cells[7].gust*.76,amp=(f.stage===3?.042:.012)*quiet;tone(hz,hz*1.29,.13,amp,p);tone(hz*1.14,hz*.9,.17,amp*.67,p,.17)}
      if(f.bell>lastBell+.2){tone(523,522,1.12,.016,-.48);tone(1048,1046,.65,.005,-.48);tone(784,782,1,.010,-.48,.38)}
      lastBird=f.chirp;lastBell=f.bell;
    },pause(){if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{})},wake(){if(ctx&&!muted)start()}};
}
