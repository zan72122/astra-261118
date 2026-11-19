/* Short modal resonators and filtered noise. The first local gesture opens the audio device. */
window.makeGardenAudio=function(){
 'use strict';
 let ctx,master,air,roll,rollFilter,stream,enabled=true,lastEvent=0,nextDrop=0;
 const note=(frequency,duration,level,type='sine',delay=0,end=frequency,pan=0)=>{
   if(!enabled||!ctx||ctx.state==='closed')return;
   const t=ctx.currentTime+delay,osc=ctx.createOscillator(),vol=ctx.createGain();
   osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
   vol.gain.setValueAtTime(.00001,t);vol.gain.exponentialRampToValueAtTime(Math.max(.0001,level),t+.005);
   vol.gain.exponentialRampToValueAtTime(.00001,t+duration);
   osc.connect(vol);let output=vol;
   if(ctx.createStereoPanner&&pan){output=ctx.createStereoPanner();output.pan.value=pan;vol.connect(output);}
   output.connect(master);osc.start(t);osc.stop(t+duration+.015);
   osc.onended=()=>{osc.disconnect();vol.disconnect();if(output!==vol)output.disconnect();};
 };
 function open(){
   if(!ctx){
     const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
     ctx=new Audio();master=ctx.createGain();master.gain.value=enabled?.72:0;
     const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-17;compressor.ratio.value=3;master.connect(compressor);compressor.connect(ctx.destination);
     const noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=noise.getChannelData(0);
     const rnd=GardenGolf.random(3393);let pink=0;for(let i=0;i<data.length;i++){pink=.89*pink+.11*(rnd()*2-1);data[i]=pink*2.6;}
     function bed(type,freq){
       const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
       n.buffer=noise;n.loop=true;f.type=type;f.frequency.value=freq;g.gain.value=.00001;
       n.connect(f);f.connect(g);g.connect(master);n.start(0,rnd()*2.5);return [g,f];
     }
     air=bed('lowpass',760)[0];[roll,rollFilter]=bed('bandpass',900);stream=bed('highpass',1400)[0];
   }
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 }
 function toggle(){
   open();enabled=!enabled;if(master)master.gain.setTargetAtTime(enabled?.72:.000001,ctx.currentTime,.045);return enabled;
 }
 function update(s){
   if(!ctx){lastEvent=s.eventId;return;}
   const t=ctx.currentTime;air.gain.setTargetAtTime(.016+s.air[0].v*.038,t,.22);
   roll.gain.setTargetAtTime(s.phase==='roll'?.02+.028*Math.abs(s.ball.v):0,t,.048);
   rollFilter.frequency.setTargetAtTime(320+Math.abs(s.ball.v)*245,t,.08);
   stream.gain.setTargetAtTime(.007+(s.hole===1?.05:0)+s.pump*.19,t,.3);
   for(const e of s.events){
     if(e.id<=lastEvent)continue;
     lastEvent=e.id;
     const f=e.strength;
     if(e.type==='putt'){note(925+f*280,.044,.15+f*.15,'triangle',0,560);note(239,.13,.17,'sine',.004,116);note(2250,.033,.09,'sine');}
     if(e.type==='axle'&&s.hole===0){note(160+40*f,.18,.032,'triangle',0,118,-.22);note(620,.068,.017,'sine',.075,410,-.22);}
     if(e.type==='sail'){note(375,.16,.19,'triangle',0,179,-.18);note(611,.11,.12);}
     if(e.type==='bridge'){
       const hz=139+e.part*4.7;note(hz,.3,.11+f*.15,'sine',0,hz*.93,e.part/22-.26);
       note(hz*2.82,.098,.105,'triangle');note(hz*5.4,.052,.044,'sine');
     }
     if(e.type==='inside'){[0,.084,.18,.30].forEach((d,i)=>note(433,.28,.14/(1+i),'sine',d,226,-.25));}
     if(e.type==='emerge'){note(496,.22,.12,'sine',0,674,.27);note(810,.21,.073,'sine',.09);}
     if(e.type==='cup'){
       note(1370,.08,.19,'triangle',0,890);note(580,.24,.24,'sine',.024,346);note(1030,.13,.12,'sine',.094,680);
       const tones=[[659,784,988],[587,740,880],[659,831,1047]][e.part];
       tones.forEach((hz,i)=>{note(hz,.75,.10,'sine',.36+i*.18);note(hz*2,.24,.029,'sine',.36+i*.18);});
     }
     if(e.type==='arrive'){note([523,659,784][e.part],.75,.08,'sine',.55);}
     if(e.type==='rail')note(315,.093,.10,'triangle',0,241);
   }
   if(s.pump>.2&&t>nextDrop){
     const q=s.drops.find(q=>q.life>0&&q.vy<0);if(q){note(1100+q.y*330,.145,.025,'sine',0,750,q.x*.4);nextDrop=t+.12+.22*s.air[q.jet].v;}
   }
 }
 return {open,toggle,update,pause(){if(ctx)ctx.suspend().catch(()=>{});}};
};
