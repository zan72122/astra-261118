/* Each collision excites a short noise burst and the modes of its material.
   The reflection bus has two early arrivals and a quiet, damped tail. */
function streetSound(){
 let ac,bus,eq,first,second,echoSend,tailGain,air,buffer;
 function wake(){
  if(!ac){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   ac=new Context();const compressor=ac.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=3.2;compressor.connect(ac.destination);
   bus=ac.createGain();bus.gain.value=.56;eq=ac.createBiquadFilter();eq.type='lowpass';eq.Q.value=.46;eq.frequency.value=3400;
   bus.connect(eq);eq.connect(compressor);echoSend=ac.createGain();eq.connect(echoSend);
   first=ac.createDelay(.3);second=ac.createDelay(.4);echoSend.connect(first);echoSend.connect(second);
   const damp=ac.createBiquadFilter();damp.type='lowpass';damp.frequency.value=1280;
   first.connect(damp);second.connect(damp);damp.connect(compressor);
   tailGain=ac.createGain();tailGain.gain.value=.16;damp.connect(tailGain);tailGain.connect(second);
   buffer=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate);const a=buffer.getChannelData(0);let last=0;
   for(let i=0;i<a.length;i++){const white=Math.random()*2-1;last=.67*last+.33*white;a[i]=.62*white+.38*last}
   const wind=ac.createBufferSource();wind.buffer=buffer;wind.loop=true;const hiss=ac.createBiquadFilter();hiss.type='highpass';hiss.frequency.value=520;
   air=ac.createGain();air.gain.value=.022;wind.connect(hiss);hiss.connect(air);air.connect(bus);wind.start();
  }if(ac.state==='suspended')ac.resume().catch(()=>{})
 }
 const modes={cloth:[535,832,.046,.12],stone:[1420,2160,.027,.076],tin:[277,651,.13,.105],
  step:[108,234,.065,.22],wood:[227,512,.092,.25],puddle:[498,933,.083,.17],
  bell0:[440,1135,.94,.24],bell1:[554.37,1431,.79,.21],bell2:[659.25,1702,.69,.19],
  paper:[2130,4650,.20,.09],glass:[856,1284,.51,.11]};
 function play(e){
  const p=modes[e.type];if(!p)return;
  const now=ac.currentTime+.004,scale=.9+.22*(e.timbre||0),dur=p[2],power=e.power;
  const pan=ac.createStereoPanner?ac.createStereoPanner():ac.createGain();
  if(pan.pan)pan.pan.value=Math.max(-.75,Math.min(.75,e.x*.42));pan.connect(bus);
  const n=ac.createBufferSource();n.buffer=buffer;const f=ac.createBiquadFilter();f.type='bandpass';f.Q.value=e.type==='paper'?.68:1.2;
  f.frequency.setValueAtTime(p[1]*scale,now);f.frequency.exponentialRampToValueAtTime(p[0]*.8,now+dur);
  const g=ac.createGain();g.gain.setValueAtTime(.00005,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,power*(e.type==='paper'?.4:.31)),now+.004);
  g.gain.exponentialRampToValueAtTime(.00005,now+dur*1.65);n.connect(f);f.connect(g);g.connect(pan);n.start(now,Math.random()*2);n.stop(now+dur*1.7);
  for(let j=0;j<2;j++){const o=ac.createOscillator(),a=ac.createGain();o.type='sine';
   const hz=p[j]*scale;o.frequency.setValueAtTime(hz,now);if(e.type==='puddle')o.frequency.exponentialRampToValueAtTime(hz*1.65,now+dur);
   if(e.type==='step'||e.type==='cloth')o.frequency.exponentialRampToValueAtTime(hz*.67,now+dur);
   a.gain.setValueAtTime(.00003,now);a.gain.exponentialRampToValueAtTime(Math.max(.0001,power*p[3]*(j?.44:1)),now+.003);
   a.gain.exponentialRampToValueAtTime(.00003,now+dur*(j?.84:1.45));o.connect(a);a.connect(pan);o.start(now);o.stop(now+dur*1.5);
   o.onended=()=>{o.disconnect();a.disconnect()}}
  n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();pan.disconnect()}
 }
 return {wake,update(s,events){if(!ac||ac.state!=='running')return;const t=ac.currentTime;
  eq.frequency.setTargetAtTime(s.cutoff,t,.065);first.delayTime.setTargetAtTime(s.reflection,t,.06);second.delayTime.setTargetAtTime(s.reflection*1.68,t,.085);
  echoSend.gain.setTargetAtTime(.085+.21*s.shelter,t,.1);air.gain.setTargetAtTime(.005+.045*s.density,t,.09);
  events.slice(-12).forEach(play)}}
}
