(function(){
'use strict';
const model=Lake.make(),s=model.s,canvas=document.getElementById('lake'),world=Landscape.build(canvas,model);
const overlay=document.getElementById('overlay'),ctx=overlay.getContext('2d'),route=document.querySelector('#route canvas'),soundBtn=document.getElementById('sound');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),TAU=2*Math.PI;
let dpr=1,W=1,H=1,last=0,pointer=null,lastEvent=0,muted=false,audio=null,master=null,ambience=null,routeState=-1;
window.__GAME__={step:dt=>model.step(dt),getState:()=>model.getState()};
function resize(){world.resize();W=canvas.clientWidth;H=canvas.clientHeight;dpr=Math.min(devicePixelRatio||1,2);overlay.width=Math.round(W*dpr);overlay.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
function path(c,points){c.beginPath();for(const [cmd,...p] of points)c[cmd](...p);c.stroke();}
function speaker(){
 const c=soundBtn.firstElementChild.getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,27,27);c.strokeStyle='#fff1d8';c.fillStyle='#fff1d8';c.lineWidth=1.45;c.lineCap=c.lineJoin='round';
 c.beginPath();c.moveTo(4,11);c.lineTo(8,11);c.lineTo(13.6,6.5);c.lineTo(13.6,20.5);c.lineTo(8,16);c.lineTo(4,16);c.closePath();c.stroke();
 if(!muted){for(const r of [5.2,9]){c.beginPath();c.arc(12.4,13.5,r,-.81,.81);c.stroke();}}
 else path(c,[['moveTo',18,10.5],['lineTo',23,16.5],['moveTo',23,10.5],['lineTo',18,16.5]]);
 soundBtn.setAttribute('aria-pressed',String(!muted));
}
function drawRoute(){
 if(routeState===s.stage)return;routeState=s.stage;
 const c=route.getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,245,51);c.lineJoin=c.lineCap='round';
 for(let i=0;i<4;i++){
  const x=31+i*61,y=25.5,active=i===s.stage;
  if(i<3){c.strokeStyle='#a6a89a65';c.lineWidth=.8;path(c,[['moveTo',x+22,y],['lineTo',x+39,y]]);c.beginPath();c.arc(x+30.5,y,1.25,0,TAU);c.fillStyle=i<s.stage?'#d6b979':'#8f9788';c.fill();}
  c.save();c.translate(x,y);
  if(active){const g=c.createLinearGradient(0,-17,0,17);g.addColorStop(0,'#f7dfaa');g.addColorStop(1,'#d0ab69');c.fillStyle=g;c.beginPath();c.arc(0,0,18.25,0,TAU);c.fill();c.strokeStyle='#f9e5b9b0';c.lineWidth=.6;c.beginPath();c.arc(0,0,20.65,0,TAU);c.stroke();}
  c.strokeStyle=active?'#4d4938':i<s.stage?'#d8c397':'#c4c7b6';c.fillStyle=active?'#615941':'#b7bdad';c.lineWidth=1.38;
  function oval(x,y,a,b,rot,start=0,end=TAU){c.beginPath();c.ellipse(x,y,a,b,rot,start,end);c.stroke();}
  if(i===0){
   oval(0,-3,6.5,2.9,-.19);oval(0,2.4,9,3.4,0,.10,Math.PI-.10);oval(0,4.8,12,4.5,0,.28,Math.PI-.28);
  }else if(i===1){
   path(c,[['moveTo',-12,4],['quadraticCurveTo',-5,-14,1,2],['quadraticCurveTo',5,-6,8,3]]);
   oval(7,5.5,5,1.8,0,.05,Math.PI-.05);path(c,[['moveTo',-12,8],['quadraticCurveTo',-6,9,-2,7]]);
  }else if(i===2){
   oval(-5.4,6.2,6,2.35,-.12);oval(3.2,-.5,5,2,-.12);oval(-.1,-6.8,3.8,1.55,-.12);
  }else{
   path(c,[['moveTo',-2.3,9],['quadraticCurveTo',0,5,-.8,.6],['moveTo',-.6,4],['lineTo',4.5,.3],['moveTo',-.7,2],['lineTo',-4.3,-.9]]);
   c.beginPath();c.moveTo(-7.5,1.5);c.bezierCurveTo(-14,1,-12,-5,-7.6,-5.5);c.bezierCurveTo(-8,-11,-.8,-12,1.1,-8.3);c.bezierCurveTo(5.7,-10.7,8.5,-7.2,8.5,-4.9);c.bezierCurveTo(14,-3,12,2.5,7.4,2.8);c.stroke();path(c,[['moveTo',-6.4,9.4],['quadraticCurveTo',-.3,7.8,5.4,9]]);
  }
  c.restore();
 }
}
function openAudio(){
 if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audio=new AC();master=audio.createGain();master.gain.value=muted?0:.50;master.connect(audio.destination);
  const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate),a=buffer.getChannelData(0),rnd=Lake.random(1983);let v=0;
  for(let i=0;i<a.length;i++){v=(v+.036*(rnd()-.5))*.984;a[i]=v;}
  const voice=audio.createBufferSource(),filter=audio.createBiquadFilter(),vol=audio.createGain();voice.buffer=buffer;voice.loop=true;filter.type='lowpass';filter.frequency.value=490;vol.gain.value=.20;
  voice.connect(filter);filter.connect(vol);vol.connect(master);voice.start();ambience={filter,vol};
 }
 if(audio.state==='suspended')audio.resume().catch(()=>{});
}
function note(freq,dur,vol,slide=1,type='sine',delay=0){
 if(!audio||muted)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*slide,t+dur*.83);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);o.onended=()=>{o.disconnect();g.disconnect();};
}
function sounds(){
 for(const e of s.events){if(e.id<=lastEvent)continue;lastEvent=e.id;
  if(e.type==='impact'){note(420+e.incoming*29,.21,.12+e.incoming*.009,.42);note(980+e.incoming*29,.10,.040,.51,'sine',.013);}
  if(e.type==='sink')for(let i=0;i<3;i++)note(420+i*89,.13,.066,1.78,'sine',.25+i*.22);
  if(e.type==='leaf'||e.type==='uncover')note(489,.46,.069,1.31);
  if(e.type==='step'){note(224,.22,.13,.62);note(667,.55,.045,1.003,'sine',.05);}
  if(e.type==='shade'||e.type==='inlet')for(const [i,f] of [392,493.88,587.33].entries())note(f,1.4,.06,1,'sine',i*.31);
 }
 if(audio&&ambience)ambience.filter.frequency.setTargetAtTime(450+Math.abs(s.gusts[0].force)*900,audio.currentTime,.5);
}
soundBtn.addEventListener('click',()=>{openAudio();muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.5,audio.currentTime,.04);speaker();});
function active(){return ['ready','leaf','drift','cross','shade','return'].includes(s.mode);}
function region(){
 const p=world.focus();if(!p)return null;
 const at=world.project(p),r=s.mode==='ready'?world.stones[s.stoneIndex].scale.x:s.mode==='cross'?.56:.35;
 const side=world.project(p.clone().add(new THREE.Vector3(r,0,0))),top=world.project(p.clone().add(new THREE.Vector3(0,r*.38,r*.40)));
 return {p,at,rx:Math.max(24,Math.abs(side.x-at.x)*1.17),ry:Math.max(24,Math.abs(side.x-at.x)*.54,Math.abs(top.y-at.y))};
}
canvas.addEventListener('pointerdown',e=>{
 if(pointer||!e.isPrimary||e.button!==0)return;
 const box=region();if(!box||!active())return;
 const x=e.clientX,y=e.clientY;
 if(((x-box.at.x)/box.rx)**2+((y-box.at.y)/box.ry)**2>1){
  for(let i=0;i<world.stones.length;i++){if(i===s.stoneIndex||!world.stones[i].visible)continue;const p=world.project(world.stones[i].position);if(Math.hypot(x-p.x,y-p.y)<30)s.pebbles[i].v=.048;}
  return;
 }
 openAudio();pointer={id:e.pointerId,x,y,mode:s.mode,start:e.timeStamp,trail:[[x,y,e.timeStamp]],dx:0,dy:0};s.idle=0;
 canvas.setPointerCapture(e.pointerId);if(s.mode==='ready')s.charge=.15;
});
canvas.addEventListener('pointermove',e=>{
 if(!pointer||e.pointerId!==pointer.id)return;
 pointer.dx=e.clientX-pointer.x;pointer.dy=e.clientY-pointer.y;s.idle=0;
 const samples=e.getCoalescedEvents?e.getCoalescedEvents():[];
 for(const sample of samples)pointer.trail.push([sample.clientX,sample.clientY,sample.timeStamp]);
 pointer.trail.push([e.clientX,e.clientY,e.timeStamp]);
 pointer.trail=pointer.trail.filter(q=>e.timeStamp-q[2]<150);
 if(s.mode==='drift'||s.mode==='return'){
  s.leaf.pushX=clamp(pointer.dx/65,-1.1,1.1);s.leaf.pushZ=clamp(pointer.dy/100,-.36,.36);
 }
 if(s.mode==='ready')s.charge=clamp(.15+Math.hypot(pointer.dx,pointer.dy)/115,.15,1);
});
function release(e,cancel){
 if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;s.charge=0;s.idle=0;
 if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(cancel)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y,len=Math.hypot(dx,dy);
 if(p.mode==='ready'){
  const old=p.trail.find(q=>e.timeStamp-q[2]<=150)||[p.x,p.y,p.start],vx=e.clientX-old[0],vy=e.clientY-old[1];
  const speedPx=Math.hypot(vx,vy)/Math.max(.016,(e.timeStamp-old[2])/1000);
  const speed=len<7?(s.stage===0?2.9:6.65):clamp(2+speedPx/(Math.min(W,H)*1.8)*6,2,8);
  const angle=len<7?(s.stage===0?8:15):clamp(5+15*Math.abs(dy)/Math.max(1,len),5,20);
  const yaw=len<7?0:clamp(dx/Math.max(48,len)*.31,-.31,.31);model.throwStone(speed,angle,yaw);
 }else if(p.mode==='cross')model.foot();else model.tapLeaf(dx/110);
}
canvas.addEventListener('pointerup',e=>release(e,false));canvas.addEventListener('pointercancel',e=>release(e,true));
canvas.addEventListener('lostpointercapture',e=>{if(pointer&&pointer.id===e.pointerId){pointer=null;s.charge=0;}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function focusContour(p){
 // Project a light on the actual local surface, including its perspective foreshortening.
 const stone=world.stones[s.stoneIndex],isStone=s.mode==='ready',pad=s.mode==='cross';
 const rx=isStone?stone.scale.x*1.22:pad?.73:.43,rz=isStone?stone.scale.z*1.26:pad?.55:.50;
 const y=isStone?stone.position.y-.03:pad?.082:p.y-.038;
 const pulse=.97+s.focus*.044;
 ctx.save();ctx.lineCap='round';
 for(let k=0;k<2;k++){
  ctx.strokeStyle=k?'rgba(255,228,158,.91)':'rgba(255,191,79,.22)';ctx.lineWidth=k?1.25:4.4;
  ctx.shadowColor='#ffbe59';ctx.shadowBlur=k?5:9;ctx.beginPath();
  for(const [a,b] of [[.12,2.81],[3.08,6.13]]){
   for(let n=0;n<=55;n++){const theta=a+(b-a)*n/55;
    const v=new THREE.Vector3(p.x+Math.cos(theta)*rx*pulse,y,p.z+Math.sin(theta)*rz*pulse);
    const q=world.project(v);if(n===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);}
  }ctx.stroke();
 }
 // Small flecks rise on the sunward edge of the stone.
 ctx.shadowBlur=8;ctx.fillStyle='#fff0bf';
 for(let k=0;k<4;k++){
  const r=s.reeds[(k*7+5)%44],a=k*2.3+.43;
  const q=world.project(new THREE.Vector3(p.x+Math.cos(a)*rx*.94+r.bend*.12,y+.028+(k%3)*.042+Math.abs(r.bend)*.39,p.z+Math.sin(a)*rz*.90));
  ctx.globalAlpha=.54+Math.min(.4,Math.abs(r.v)*3);ctx.beginPath();ctx.arc(q.x,q.y,k===0?1.9:1.15,0,TAU);ctx.fill();
 }
 ctx.restore();
}
const guide={v:0,d:0,rest:0,phase:0,alpha:0};
function hand(p,dt){
 const show=s.idle>=4&&active()&&!pointer;
 guide.alpha=clamp(guide.alpha+(show?1.7:-4.5)*dt,0,1);
 if(!show){guide.phase=0;guide.rest=0;guide.v=0;guide.d=0;}
 if(!guide.alpha||!p)return;
 const swipe=s.mode==='ready'||s.mode==='drift'||s.mode==='leaf';
 if(show){
  guide.rest+=dt;if(guide.phase===0&&guide.rest>.56){guide.phase=1;guide.rest=0;}
  if(guide.phase===1){guide.v+=((1-guide.d)*32-8.9*guide.v)*dt;guide.d+=guide.v*dt;if(guide.d>.985){guide.phase=2;guide.rest=0;}}
  if(guide.phase===2&&guide.rest>1.85){guide.phase=0;guide.d=guide.v=guide.rest=0;}
 }
 const alpha=guide.alpha*(guide.phase===2?clamp(1-guide.rest*2.1,0,1):guide.phase===0?clamp(guide.rest*4,0,1):1);
 const at=world.project(p),scale=clamp(W/950,.79,1.04),span=swipe?clamp(H*.078,38,72):8;
 const x=at.x+(swipe?guide.d*14:0),y=at.y-guide.d*span;
 ctx.save();ctx.globalAlpha=alpha*.89;ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(-.29);
 ctx.fillStyle='rgba(254,241,211,.86)';ctx.strokeStyle='rgba(78,70,53,.72)';ctx.lineWidth=1.25;ctx.lineJoin='round';ctx.shadowColor='rgba(46,48,38,.37)';ctx.shadowBlur=7;
 ctx.beginPath();ctx.moveTo(0,17);ctx.lineTo(0,2);ctx.bezierCurveTo(0,-3,6,-3,6,2);ctx.lineTo(6,13);
 ctx.bezierCurveTo(7,9,11.2,10,11.6,13.6);ctx.bezierCurveTo(13,10.6,17,12,17.5,15);ctx.bezierCurveTo(20,13.2,23,15.4,23,19);
 ctx.lineTo(22.7,26);ctx.bezierCurveTo(22.2,30.7,19.5,32.7,19,35);ctx.lineTo(8.7,35);ctx.bezierCurveTo(7.4,31,4,29.4,1.7,26.4);
 ctx.lineTo(-5.3,18.7);ctx.bezierCurveTo(-8.3,14.6,-4.6,11.7,-1.7,14.4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function frame(now){
 const dt=last?Math.min(.075,(now-last)/1000):0;last=now;model.step(dt);world.render();sounds();drawRoute();
 ctx.clearRect(0,0,W,H);const p=world.focus();if(p)focusContour(p);hand(p,dt);
 requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden&&audio)audio.suspend().catch(()=>{});else if(audio&&!muted)audio.resume().catch(()=>{});});
addEventListener('resize',resize);resize();speaker();drawRoute();requestAnimationFrame(frame);
})();
