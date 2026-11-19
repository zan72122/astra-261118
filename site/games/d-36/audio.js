function makeSound(){
  let ctx,master,echo,air,airLevel,airFilter,noise,muted=false;
  const pitches=[1346,882,1062], intervals=[[1,2.73,4.18,6.15],[1,2.38,3.95,5.42,7.78],[1,1.64,2.76,4.47]];
  function noiseSource(){const n=ctx.createBufferSource();n.buffer=noise;return n;}
  function wake(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();
      const sum=ctx.createDynamicsCompressor();sum.threshold.value=-16;sum.ratio.value=3;sum.connect(ctx.destination);
      master=ctx.createGain();master.gain.value=muted?0:.58;master.connect(sum);
      echo=ctx.createConvolver();const n=Math.floor(ctx.sampleRate*.61),b=ctx.createBuffer(2,n,ctx.sampleRate);
      for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let j=0;j<n;j++)d[j]=(Math.random()*2-1)*Math.exp(-j/n*6)*.4;}
      echo.buffer=b;const room=ctx.createGain();room.gain.value=.16;echo.connect(room);room.connect(master);
      noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);let d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      air=noiseSource();air.loop=true;airFilter=ctx.createBiquadFilter();airFilter.type='bandpass';airFilter.Q.value=.46;airFilter.frequency.value=340;
      airLevel=ctx.createGain();airLevel.gain.value=.0001;air.connect(airFilter);airFilter.connect(airLevel);airLevel.connect(master);air.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function tone(freq,volume,decay,start,pan=0){
    const osc=ctx.createOscillator(),amp=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();
    if(p.pan)p.pan.value=pan;osc.frequency.value=freq;osc.type='sine';
    amp.gain.setValueAtTime(.00001,start);amp.gain.exponentialRampToValueAtTime(Math.max(.00002,volume),start+.004);
    amp.gain.exponentialRampToValueAtTime(.00001,start+decay);
    osc.connect(amp);amp.connect(p);p.connect(master);p.connect(echo);osc.start(start);osc.stop(start+decay+.03);
    osc.onended=()=>{osc.disconnect();amp.disconnect();p.disconnect();};
  }
  function event(e){
    if(!ctx||muted||ctx.state!=='running')return;const t=ctx.currentTime;
    if(e.type==='chime'){
      const k=e.i,g=.08+e.energy*.11;
      intervals[k].forEach((r,i)=>tone(pitches[k]*r,g*[1,.39,.18,.075,.036][i],[3.4,4.9,2.2][k]/(1+.42*i),t,.38*(k-1)));
      if(k===0)tone(pitches[k]*1.004,g*.17,2.45,t+.009,-.36);
    }
    if(e.type==='firework'){
      const s=noiseSource(),f=ctx.createBiquadFilter(),a=ctx.createGain();f.type='lowpass';f.frequency.setValueAtTime(237,t);f.frequency.exponentialRampToValueAtTime(65,t+1.36);
      a.gain.setValueAtTime(.0001,t);a.gain.exponentialRampToValueAtTime(.31*e.energy,t+.077);a.gain.exponentialRampToValueAtTime(.0001,t+1.85);
      s.connect(f);f.connect(a);a.connect(master);a.connect(echo);s.start(t);s.stop(t+1.9);s.onended=()=>{s.disconnect();f.disconnect();a.disconnect();};
      tone(67,.084*e.energy,1.43,t+.043);
    }
    if(e.type==='drop')tone(610,.008+e.energy*.018,.22,t,.31);
    if(e.type==='click')tone(568,.022,.066,t,.26);
  }
  return {wake,event,setMuted(v){muted=v;if(ctx)master.gain.setTargetAtTime(v?0:.58,ctx.currentTime,.065);},
    update(s){if(!ctx)return;let a=Math.max(...s.air.map(q=>q.u));airLevel.gain.setTargetAtTime(.0004+.0032*a**1.6,ctx.currentTime,.22);airFilter.frequency.setTargetAtTime(265+a*106,ctx.currentTime,.25);}};
}
