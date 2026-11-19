'use strict';
function hillsideSound(){
  let ac,master,wind,grass,silk,tone,muted=false,previous=[0,0,0],lastCut=[0,0,0];
  function noiseSource(type,freq,q,level,channels=2){
    const buffer=ac.createBuffer(channels,ac.sampleRate*3,ac.sampleRate);
    for(let ch=0;ch<channels;ch++){const data=buffer.getChannelData(ch);let brown=0;
      for(let i=0;i<data.length;i++){const white=Math.random()*2-1;brown=(brown+.08*white)/1.072;data[i]=type==='lowpass'?brown*3.7:white*.52;}
      for(let i=0;i<512;i++){const f=i/512;data[i]=data[data.length-512+i]*(1-f)+data[i]*f;}}
    const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();src.buffer=buffer;src.loop=true;filter.type=type;filter.frequency.value=freq;filter.Q.value=q;gain.gain.value=level;
    src.connect(filter);filter.connect(gain);const pan=ac.createStereoPanner?ac.createStereoPanner():null;
    if(pan){gain.connect(pan);pan.connect(master);}else gain.connect(master);
    src.start();return {filter,gain,src,pan};
  }
  function unlock(){
    if(!ac){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ac=new Audio();master=ac.createGain();master.gain.value=muted?0:.72;
      const compressor=ac.createDynamicsCompressor();compressor.threshold.value=-14;compressor.ratio.value=3;master.connect(compressor);compressor.connect(ac.destination);
      wind=noiseSource('lowpass',460,.35,.04);grass=noiseSource('highpass',2900,.5,.001);silk=noiseSource('bandpass',950,1.3,.003);tone=noiseSource('bandpass',204,2.8,.004);}
    if(ac.state==='suspended')ac.resume().catch(()=>{});
  }
  function ring(i,energy,pan){
    const now=ac.currentTime,base=[784,988,1175][i],stereo=ac.createStereoPanner?ac.createStereoPanner():ac.createGain();if(stereo.pan)stereo.pan.value=pan;stereo.connect(master);
    [1,2.71,4.16].forEach((ratio,j)=>{const osc=ac.createOscillator(),amp=ac.createGain(),length=[1.68,.69,.24][j];
      osc.type='sine';osc.frequency.setValueAtTime(base*ratio,now);osc.frequency.exponentialRampToValueAtTime(base*ratio*.997,now+length);
      amp.gain.setValueAtTime(.00001,now);amp.gain.exponentialRampToValueAtTime(Math.max(.0001,energy*[.083,.024,.009][j]),now+.009);
      amp.gain.exponentialRampToValueAtTime(.00001,now+length);osc.connect(amp);amp.connect(stereo);osc.start(now);osc.stop(now+length+.02);
      osc.onended=()=>{osc.disconnect();amp.disconnect();if(j===0)stereo.disconnect();};});
  }
  function update(s){if(!ac||ac.state!=='running')return;const now=ac.currentTime,w=s.flightWind/8;
    function set(param,value,lag=.14){param.setTargetAtTime(value,now,lag);}
    if(wind.pan){set(wind.pan.pan,s.airX*.52);set(grass.pan.pan,s.cells[0].dx*.40);set(silk.pan.pan,Math.tanh(s.kite.x*.18)*.57);}
    set(wind.src.playbackRate,.82+.34*w,.28);set(silk.src.playbackRate,.87+.28*w,.16);
    set(wind.gain.gain,.046+.39*w*w);set(wind.filter.frequency,260+1100*w+75*s.thermal);
    set(grass.gain.gain,.008+.075*w+.24*Math.min(.45,s.grassSound));set(grass.filter.frequency,1750+1600*(1-w)+150*s.cells[2].gust);
    set(silk.gain.gain,.004+.13*Math.min(.63,s.clothSound*7)+.035*Math.abs(s.kite.bankV));set(silk.filter.frequency,560+w*1120+s.cells[1].gust*130);
    set(tone.filter.frequency,165+114*w+s.kite.vy*3);set(tone.gain.gain,.004+.014*w*w);
    s.bells.forEach((b,i)=>{if(b.count!==previous[i]&&now-lastCut[i]>.23){ring(i,b.energy*(s.stage===1?1:.51),Math.max(-.8,Math.min(.8,s.airX+.16*(i-1))));lastCut[i]=now;}previous[i]=b.count;});
  }
  function mute(value){muted=value;if(master)master.gain.setTargetAtTime(value?0:.72,ac.currentTime,.12);}
  return {unlock,update,mute,suspend:()=>{if(ac&&ac.state==='running')ac.suspend().catch(()=>{});},resume:()=>{if(ac&&!muted)ac.resume().catch(()=>{});}};
}
