'use strict';
function workshopAudio(){
 let ac=null,master,bus,cut,body,high,voice,room,roomFilter,muted=false,hiss;
 function noiseLoop(buffer){const a=ac.createBufferSource();a.buffer=buffer;a.loop=true;a.start();return a;}
 function unlock(){
   if(!ac){
     const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
     ac=new Audio();master=ac.createGain();master.gain.value=muted?0:.66;
     const guard=ac.createDynamicsCompressor();guard.threshold.value=-14;master.connect(guard);guard.connect(ac.destination);
     const n=ac.sampleRate*3,buf=ac.createBuffer(1,n,ac.sampleRate),data=buf.getChannelData(0);let last=0;
     for(let i=0;i<n;i++){const w=Math.random()*2-1;last=last*.68+w*.32;data[i]=last*.7+w*.3;}
     hiss=noiseLoop(buf);cut=ac.createBiquadFilter();cut.type='bandpass';cut.Q.value=.78;
     body=ac.createBiquadFilter();body.type='bandpass';body.Q.value=2.6;
     high=ac.createGain();high.gain.value=.33;bus=ac.createGain();bus.gain.value=0;
     hiss.connect(cut);cut.connect(bus);hiss.connect(body);body.connect(high);high.connect(bus);bus.connect(master);
     // A weak pitched fibre resonance follows the broadband scraping body.
     const osc=ac.createOscillator();osc.type='triangle';voice=ac.createGain();voice.gain.value=.021;osc.connect(voice);voice.connect(bus);osc.start();voice.osc=osc;
     roomFilter=ac.createBiquadFilter();roomFilter.type='lowpass';roomFilter.frequency.value=620;
     room=ac.createGain();room.gain.value=.009;hiss.connect(roomFilter);roomFilter.connect(room);room.connect(master);
   }if(ac.state==='suspended')ac.resume().catch(()=>{});
 }
 function tone(freq,gain,decay,pan,type='sine',bend=.75){
   if(!ac||muted)return;const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=type;
   o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*bend,t+decay);
   g.gain.setValueAtTime(.00001,t);g.gain.linearRampToValueAtTime(Math.max(.00002,gain),t+.003);
   g.gain.exponentialRampToValueAtTime(.00001,t+decay);o.connect(g);
   let p=null;if(ac.createStereoPanner){p=ac.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan))*.68;g.connect(p);p.connect(master);}else g.connect(master);
   o.start(t);o.stop(t+decay+.01);o.onended=()=>{o.disconnect();g.disconnect();if(p)p.disconnect();};
 }
 function update(s){
   const events=s.events.splice(0);if(!ac)return;const t=ac.currentTime;
   cut.frequency.setTargetAtTime(Math.max(160,290+s.pitch*2.75),t,.025);body.frequency.setTargetAtTime(190+s.pitch*.49,t,.03);
   voice.osc.frequency.setTargetAtTime(Math.max(68,s.pitch),t,.025);bus.gain.setTargetAtTime(s.loud*.92,t,.025);
   room.gain.setTargetAtTime(.009+.10*s.rain+Math.abs(s.wind)*.0004,t,.25);roomFilter.frequency.setTargetAtTime(440+1950*s.rain,t,.35);
   for(const e of events){
     const a=e.amount,x=e.loc;
     if(e.kind==='shaving'){tone(760+Math.abs(x)*340,a*.12,.045,x,'triangle');tone(1740,a*.027,.027,x);}
     if(e.kind==='roof'){tone(610+180*x,a*.16,.079,x,'triangle');tone(2200+150*x,a*.028,.037,x);}
     if(e.kind==='woodrain'||e.kind==='knock'){tone(e.hz,a*.24,e.decay,x);tone(e.hz*2.13,a*.16,e.decay*.45,x,'triangle');}
     if(e.kind==='metal'){tone(1860,a*.3,.14,0);tone(3240,a*.08,.08,0);}
     if(e.kind==='joint'){tone(218,a*.37,.17,x,'triangle');tone(523,a*.17,.08,x);}
     if(e.kind==='ready'){tone(523,a*.12,.65,0);tone(784,a*.06,.88,.25);}
     if(e.kind==='rub')tone(180+45*x,a*.09,.09,x,'triangle');
   }
 }
 return {unlock,update,toggle(){muted=!muted;unlock();if(ac)master.gain.setTargetAtTime(muted?0:.66,ac.currentTime,.04);return !muted;}};
}
