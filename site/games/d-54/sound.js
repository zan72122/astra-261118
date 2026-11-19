'use strict';
function createRoomSound(){
  let ac,master,verb,send,noiseBuffer,friction,fricGain,fricFilter,enabled=true,previousBook=-1,previousTurn=0;
  function init(){
    if(!ac){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      ac=new C();master=ac.createGain();master.gain.value=enabled?.48:0;master.connect(ac.destination);
      verb=ac.createConvolver();send=ac.createGain();send.gain.value=.20;send.connect(verb);verb.connect(master);
      const len=Math.floor(ac.sampleRate*.52),impulse=ac.createBuffer(2,len,ac.sampleRate);
      let seed=14066;const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
      for(let c=0;c<2;c++){const a=impulse.getChannelData(c);let prev=0;
        for(let i=0;i<len;i++){prev=prev*.36+(random()*2-1)*.64;a[i]=i<ac.sampleRate*.012?0:prev*Math.exp(-i/(ac.sampleRate*.082))*.62;}
        for(let t of [.028,.057,.089])a[Math.floor((t+.002*c)*ac.sampleRate)]+=.35;}
      verb.buffer=impulse;
      noiseBuffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const a=noiseBuffer.getChannelData(0);
      for(let i=0;i<a.length;i++)a[i]=random()*2-1;
      friction=ac.createBufferSource();friction.buffer=noiseBuffer;friction.loop=true;
      fricFilter=ac.createBiquadFilter();fricFilter.type='bandpass';fricFilter.Q.value=.73;fricGain=ac.createGain();fricGain.gain.value=0;
      friction.connect(fricFilter);fricFilter.connect(fricGain);fricGain.connect(master);fricGain.connect(send);friction.start();
    }
    if(ac.state==='suspended')ac.resume().catch(()=>{});
  }
  function envelope(node,duration,gain,attack=.006){
    const t=ac.currentTime,g=ac.createGain();g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(Math.max(.00002,gain),t+attack);
    g.gain.exponentialRampToValueAtTime(.00001,t+duration);node.connect(g);g.connect(master);g.connect(send);return g;
  }
  function tone(hz,dur,amp,end=hz){
    const o=ac.createOscillator();o.frequency.setValueAtTime(hz,ac.currentTime);o.frequency.exponentialRampToValueAtTime(end,ac.currentTime+dur);
    const g=envelope(o,dur,amp);o.onended=()=>{o.disconnect();g.disconnect();};o.start();o.stop(ac.currentTime+dur+.01);
  }
  function brush(hz,dur,amp){
    const n=ac.createBufferSource(),f=ac.createBiquadFilter();n.buffer=noiseBuffer;f.type='bandpass';f.frequency.value=hz;f.Q.value=.88;n.connect(f);
    const g=envelope(f,dur,amp,Math.min(.035,dur*.3));n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};n.start(0,Math.random());n.stop(ac.currentTime+dur+.01);
  }
  function update(s,events){
    if(!ac)return;
    send.gain.setTargetAtTime(.23*s.soundSpace.x,ac.currentTime,.10);
    let b=s.books[s.book],v=Math.abs(b.v),res=b.frictionN;
    const pageSpeed=Math.abs(s.page.v),wood=s.phase==='door'?Math.abs(s.door.v):0;
    fricGain.gain.setTargetAtTime(Math.min(.12,.020*v+.058*res+.07*pageSpeed+.016*wood),ac.currentTime,.027);
    fricFilter.frequency.setTargetAtTime(pageSpeed>.05?1850+pageSpeed*1070:620+1350*v+400*res,ac.currentTime,.046);
    if(s.held&&s.phase==='shelf'&&previousBook!==s.book){brush(2100,.17,.078);previousBook=s.book;}
    if(s.phase==='pages'&&Math.floor(s.page.x*12)!==previousTurn&&pageSpeed>.08)brush(2200+pageSpeed*390,.063,.036);
    previousTurn=Math.floor(s.page.x*12);
    for(let e of events){
      if(e.kind==='wood'){tone(e.hz,.33,.40,e.hz*.86);tone(e.hz*2.67,.17,.14);tone(e.hz*4.18,.09,.055);brush(620+e.clearance*94,.09,.14);}
      if(e.kind==='paper')brush(2700,.26,.15*e.gain);
      if(e.kind==='latch'){tone(165,.16,.17,130);brush(920,.075,.14);}
      if(e.kind==='breeze')brush(740,.85,.095);
      if(e.kind==='drop'){tone(e.hz,.25,.13,e.hz*1.36);tone(e.hz*.55,.35,.042);brush(1700,.13,.05);}
      if(e.kind==='drip')tone(e.hz,.14,.027,e.hz*1.18);
    }
  }
  return {init,update,toggle(){enabled=!enabled;init();if(master)master.gain.setTargetAtTime(enabled?.48:0,ac.currentTime,.043);return enabled;}};
}
