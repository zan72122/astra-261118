const FestivalSound=(()=>{
  let ac,out,filtered,buffer,dragGain,dragFilter,started=false,nextBeat=0,beat=0,lastRustle=0;
  function unlock(){
    if(!ac){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      ac=new C();out=ac.createGain();out.gain.value=.62;out.connect(ac.destination);
      buffer=ac.createBuffer(1,ac.sampleRate*1.5,ac.sampleRate);
      let data=buffer.getChannelData(0),last=0;for(let i=0;i<data.length;i++){last=.19*last+.81*(Math.random()*2-1);data[i]=last;}
      filtered=ac.createBiquadFilter();filtered.type='lowpass';filtered.frequency.value=710;filtered.connect(out);
      let n=ac.createBufferSource();n.buffer=buffer;n.loop=true;dragFilter=ac.createBiquadFilter();dragFilter.type='bandpass';dragFilter.Q.value=.8;
      dragGain=ac.createGain();dragGain.gain.value=.00001;n.connect(dragFilter).connect(dragGain).connect(out);n.start();
      nextBeat=ac.currentTime+1.2;started=true;
    }
    if(ac.state==='suspended')ac.resume().catch(()=>{});
  }
  function tone(f,end,dur,vol,delay=0,remote=false,wave='sine'){
    const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=wave;
    o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(end,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.005);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(remote?filtered:out);o.start(t);o.stop(t+dur+.02);
    o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function noise(hz,dur,vol,delay=0,q=.68){
    let t=ac.currentTime+delay,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    s.buffer=buffer;f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(hz,t);f.frequency.exponentialRampToValueAtTime(hz*.57,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0003,vol),t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f).connect(g).connect(out);s.start(t,Math.random()*.7);s.stop(t+dur+.01);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  function event(e){
    if(!started)return;let v=e.strength;
    if(e.type==='fold'||e.type==='lay'){noise(920,.094,.32*v);tone(192,68,.18,.28*v);tone(430,214,.075,.08*v,.018);}
    if(e.type==='snip'){noise(4400,.042,.27);tone(2470,2320,.17,.12*v);tone(3660,3450,.095,.054*v,.012);noise(1800,.060,.15,.026);}
    if(e.type==='open')tone(1410,1360,.12,.04);
    if(e.type==='paper'){for(let i=0;i<7;i++)noise(3000+Math.random()*2700,.035+Math.random()*.05,.07+Math.random()*.09,i*.036);}
    if(e.type==='touch')noise(1200,.065,.07);
  }
  function update(model){
    for(let e of model.events.splice(0))event(e);if(!started||ac.state!=='running')return;
    let t=ac.currentTime,m=model;
    dragGain.gain.setTargetAtTime(Math.min(.105,.00001+m.pull*.045+(m.grip&&m.phase==='twist'?.008:0)),t,.045);
    dragFilter.frequency.setTargetAtTime(360+m.pull*210+m.airMean*520,t,.1);
    if(m.grip&&['parcel','piece'].includes(m.grip.kind)&&t-lastRustle>.22){
      let v=Math.hypot(m.grip.x-m.grip.px,m.grip.y-m.grip.py);
      if(v>.02){noise(3700,.07,Math.min(.16,v*.35));lastRustle=t;}
    }
    if(t>nextBeat){
      const rhythm=[.76,.38,.38,1.49,.76,.76,1.53,1.52],accent=[.9,.47,.57,.91,.50,.76,.86,.48][beat];
      tone(96+accent*31,55+accent*4,.38,.069*accent,0,true);noise(247,.072,.028*accent);
      nextBeat=t+rhythm[beat]+(Math.random()-.5)*.035;beat=(beat+1)%8;
    }
  }
  return {unlock,update};
})();
