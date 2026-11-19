'use strict';
const home={...layout},audioButton=document.querySelector('#sound');
let audioCtx=null,master=null,noiseBuffer=null,muted=false;
function audioStart(){
 if(!audioCtx){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 audioCtx=new AC();master=audioCtx.createGain();master.gain.value=muted?0:.63;master.connect(audioCtx.destination);
 noiseBuffer=audioCtx.createBuffer(1,audioCtx.sampleRate*.35,audioCtx.sampleRate);
 const a=noiseBuffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=2*random()-1;
 }
 if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
}
audioButton.addEventListener('click',()=>{muted=!muted;audioStart();if(master)master.gain.setTargetAtTime(muted?0:.63,audioCtx.currentTime,.018);
 audioButton.setAttribute('aria-pressed',String(muted));audioButton.setAttribute('aria-label',muted?'音を出す':'消音');});
function tone(hz,to,len,amp,type='sine',delay=0){
 if(!audioCtx||muted)return;
 const now=audioCtx.currentTime+delay,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
 osc.type=type;osc.frequency.setValueAtTime(hz,now);osc.frequency.exponentialRampToValueAtTime(to,now+len);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(amp,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+len);
 osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+len+.01);
}
function rustle(freq,length,amp){
 if(!audioCtx||muted)return;
 const n=audioCtx.createBufferSource(),f=audioCtx.createBiquadFilter(),g=audioCtx.createGain(),now=audioCtx.currentTime;
 n.buffer=noiseBuffer;f.type='bandpass';f.Q.value=.85;f.frequency.setValueAtTime(freq,now);f.frequency.exponentialRampToValueAtTime(Math.max(100,freq*.34),now+length);
 g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(amp,now+.007);g.gain.exponentialRampToValueAtTime(.0001,now+length);
 n.connect(f);f.connect(g);g.connect(master);n.start();n.stop(now+length);
}
function pluck(){
 if(!audioCtx||muted)return;
 const sr=audioCtx.sampleRate,freq=game.s.pluckHz,n=Math.round(sr/freq),len=Math.round(sr*.56);
 const buf=audioCtx.createBuffer(1,len,sr),ar=buf.getChannelData(0);
 for(let i=0;i<n;i++) ar[i]=(random()*2-1)*.52;
 for(let i=n;i<len;i++)ar[i]=.991*(.51*ar[i-n]+.49*ar[i-n+1]);
 const src=audioCtx.createBufferSource();src.buffer=buf;src.connect(master);src.start();
 tone(1720,1707,.31,.064,'sine',.024);tone(2585,2540,.16,.037,'sine',.026);
}
function sounds(){
 for(const ev of game.drain()){
 const tack=game.s.peelTack;
 if(ev==='peel'){tone(game.s.peelHz,102,.129,.24);tone(671,268,.055,.08,'sine',.021);rustle(1480, .058+.084*tack,.27);}
 if(ev==='plink')pluck();
 if(ev==='touch'&&game.s.phase==='spread')tone(131,71,.10,.084);
 if(ev==='fold'||ev==='fresh')tone(168,81,.154,.14);
 if(ev==='roll')rustle(3200,.18,.14);
 if(ev==='berry')tone(970,953,.21,.045);
 }
}
function liveCord(material,n,sides){
 const p=new Float32Array(n*sides*3),idx=[],uv=[];
 for(let i=0;i<n;i++)for(let j=0;j<sides;j++){
 const a=i*sides+j,b=i*sides+(j+1)%sides;uv.push(i/(n-1),j/sides);
 if(i<n-1)idx.push(a,b,a+sides,b,b+sides,a+sides);
 }
 const geometry=geom(p,idx,uv);const obj=mesh(scene,geometry,material);obj.frustumCulled=false;
 function set(points,radius,taper=0){
 const c=new T.CatmullRomCurve3(points),a=geometry.attributes.position,v=V(),t=V(),side=V(),up=V();
 for(let i=0;i<n;i++){
 const u=i/(n-1);c.getPoint(u,v);c.getTangent(u,t);
 side.crossVectors(t,Math.abs(t.y)>.95?V(1,0,0):V(0,1,0)).normalize();up.crossVectors(side,t).normalize();
 const r=radius*(1-taper*Math.sin(u*PI));
 for(let j=0;j<sides;j++){const co=Math.cos(TAU*j/sides)*r,si=Math.sin(TAU*j/sides)*r;
 a.setXYZ(i*sides+j,v.x+side.x*co+up.x*si,v.y+side.y*co+up.y*si,v.z+side.z*co+up.z*si);}
 }
 a.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 }
 return {obj,set};
}
const sticky=liveCord(outerRice,29,7),twine=mat(0xf3dab1,.68),thread=liveCord(twine,74,8);
const loopPoints=[],threadSpot=V();
const spool=group(),spoolWood=mat(0xad7a49,.57);
lathe(spool,spoolWood,[[0,0],[.27,0],[.29,.025],[.28,.074],[.17,.1],[.155,.54],[.275,.558],[.285,.61],[.25,.64],[.05,.64],[.045,.59]],0,0,0,40);
lathe(spool,twine,Array.from({length:72},(_,i)=>[.224+.009*Math.cos(i*PI)+.01*Math.sin(i*.14),.078+i*.0066]),0,0,0,48);
batch(spool);spool.rotation.z=-1.33;spool.rotation.y=.43;
function spoolPose(){spool.position.set(-layout.w*.5+.32,.29,layout.z-layout.d*.5-.27);}spoolPose();
const spare=liveCord(twine,38,7);
function spareCord(){
 const p=spool.position;spare.set([V(p.x+.2,.35,p.z+.16),V(p.x+.31,.22,p.z+.27),V(p.x+.45,.43,p.z+.39),V(p.x+.44,.36,p.z+.66),V(steady.position.x+.40,.44,steady.position.z-.04)],.015);
}spareCord();
function cordViews(){
 const s=game.s,bx=centerX(),bz=layout.z,by=layout.floor,f=game.finger;
 let show=false,start=V(),end=V();
 if(s.introBond){
 start.set(layout.start+.03,by+game.cells[0].thick,bz+.1);end.copy(mama.position);end.y-=.015;show=true;
 }else if((f?.tool==='dough'||f?.tool==='rim')&&f.length>.07){
 const d=clamp(Math.hypot(f.ox,f.oz)/1.34),c=game.cells[Math.floor(d*R)*N+f.index];
 start.set(bx+f.ox,by+c.thick,bz+f.oz);end.set(bx+f.x,by+c.thick+.12+clamp(f.length)*.17,bz+f.z);show=true;
 }else if(s.thread>.016){
 const a=Math.atan2(s.threadZ,s.threadX),d=clamp(Math.hypot(s.threadX,s.threadZ)/1.44);
 const c=game.cells[Math.floor(d*R)*N+(Math.round(a/TAU*N)+N)%N];
 start.set(bx+clamp(s.threadX,-1.4,1.4)*.84,by+c.thick+.015,bz+clamp(s.threadZ,-1.4,1.4)*.84);
 end.copy(start).add(V(-.11*s.thread,s.thread*1.42,.20*s.thread));show=true;
 }
 sticky.obj.visible=show;if(show){const mid=start.clone().lerp(end,.47);mid.y-=Math.min(.065,start.distanceTo(end)*.14);sticky.set([start,mid,end],.048,.78);}
 const has=s.phase==='cut'||s.phase==='open'||s.phase==='serve';
 thread.obj.visible=has;
 if(has){
 const dist=s.pull,feed=s.insert,high=s.split;
 threadSpot.set(bx-.23-dist*.44,by+.12+dist*.24,bz+1.27+dist*.47);
 const lx=bx-2.1+feed*2.1;
 loopPoints.length=0;loopPoints.push(
 V(steady.position.x+.18,.48,steady.position.z-.06),V(bx-1.86,by+.085,bz-.64),V(lx-.85+.50*dist,by+.04,bz-.45),
 V(lx-.67+dist*.44,by+.025+dist*.68*(1-high),bz+.34),V(lx-.52,by+.08+dist*.32,bz+.94),
 V(threadSpot.x-.19,threadSpot.y+.04,threadSpot.z-.02),V(threadSpot.x-.16,threadSpot.y+.085,threadSpot.z+.24),
 V(threadSpot.x+.08,threadSpot.y+.07,threadSpot.z+.26),V(threadSpot.x+.19,threadSpot.y,threadSpot.z+.04),
 V(lx+.22,by+.09+dist*.22,bz+.93),V(lx+.77-dist*.43,by+.05+dist*.68*(1-high),bz+.29),
 V(lx+.89-dist*.48,by+.035,bz-.44),V(bx+1.44,by+.10,bz-.58),V(mama.position.x+.47,mama.position.y+.04,mama.position.z+.63));
 loopPoints.forEach((p,i)=>{const b=game.cord[Math.round(i/(loopPoints.length-1)*27)];p.y+=b.displacement;});
 const windBack=ease(clamp((s.delivery-.42)/.54));
 if(windBack>0){const end=spool.position.clone().add(V(.2,.035,.1));loopPoints.forEach(p=>p.lerp(end,windBack*.995));}
 thread.set(loopPoints,.021*(1-windBack*.9));
 }
}
const motes=[];
const ambient=group();
function ribbon(){
 const n=13,p=[],uv=[],ix=[];for(let i=0;i<n;i++){
 const u=i/(n-1),w=Math.sin(PI*u)**.73*.032;
 p.push(-w,u*.76,0,w,u*.76,0);uv.push(0,u,1,u);
 if(i<n-1){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2);}}
 return geom(p,ix,uv);
}
for(let i=0;i<5;i++){
 const m=mat(0xfcf5df,.96,0,{transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
 const o=mesh(ambient,ribbon(),m);o.castShadow=o.receiveShadow=false;
 motes.push({o,age:i*.52,life:2.3+random(),x:(random()-.5)*.8,z:(random()-.5)*.6,vx:0,vy:.22+random()*.12,dy:i*.12,w:random()*4});
}
const powderAir=grains(ambient,38,()=>[0,-4,0,.01],chalk);
powderAir.frustumCulled=false;
const powderP=Array.from({length:38},()=>({y:-2,x:0,z:0,vx:0,vy:0,vz:0,r:0}));
const particleDummy=new T.Object3D();
function atmosphere(dt){
 const s=game.s;
 sun.intensity=2.83+s.sun*.41;
 for(const p of motes){
 p.age+=dt;
 if(p.age>p.life){p.age=0;p.life=2+random()*1.7;p.dy=0;p.x=(random()-.5)*.75;p.z=(random()-.5)*.43;p.vx=0;p.w=random()*6;}
 p.vx+=(s.wind*.4+.13*Math.sin(p.age*1.4+p.w)-p.vx)*dt;p.x+=p.vx*dt;p.dy+=p.vy*dt;
 p.o.position.set(centerX()+p.x,layout.floor+.75+game.cells[0].thick*.22+p.dy,layout.z+p.z);
 p.o.rotation.z=p.vx*-.8;p.o.material.opacity=Math.sin(PI*p.age/p.life)**2*Math.min(.12,s.steam*.28)*(1-.81*s.coverage);
 const a=p.o.geometry.attributes.position;
 for(let i=0;i<13;i++){
 const u=i/12,off=.12*Math.sin(u*6+p.w+p.age*1.17)*u,w=Math.sin(PI*u)**.75*(.016+.034*u);
 a.setXYZ(i*2,off-w,u*.75,.08*Math.sin(u*4+p.age));a.setXYZ(i*2+1,off+w,u*.75,.08*Math.sin(u*4+p.age));
 }a.needsUpdate=true;
 }
 for(let i=0;i<powderP.length;i++){
 const p=powderP[i];if(p.y<.24){
 if(random()<dt*(.16+4.1*s.dust)){p.x=centerX()+(random()-.5)*2.6;p.z=layout.z+(random()-.5)*1.56;p.y=.25;p.vx=(random()-.5)*.3;p.vz=(random()-.5)*.19;p.vy=.12+random()*(.39+s.dust);p.r=.005+random()*.007;}
 }else{p.vy-=dt*.32;p.vx+=(s.wind*.3-p.vx)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}
 particleDummy.position.set(p.x,p.y,p.z);particleDummy.scale.setScalar(p.y<.24?0:p.r);particleDummy.updateMatrix();powderAir.setMatrixAt(i,particleDummy.matrix);
 }powderAir.instanceMatrix.needsUpdate=true;
}
function objects(){
 const s=game.s,bx=centerX(),bz=layout.z,by=layout.floor;
 updateDough();dustOnDough();
 const rollAngle=-PI*s.roll+s.turn*.86;
 mound.rotation.set(0,s.turn*.36,rollAngle);
 mound.position.set(bx+Math.sin(rollAngle)*game.H*.5,by+(1-Math.cos(rollAngle))*game.H*.5+s.drop+.19*Math.abs(Math.sin(s.turn)),bz);
 mound.scale.set(1+s.wobble*.08,1-s.wobble*.1,1+s.wobble*.08);
 mound.visible=s.phase!=='open'&&s.phase!=='serve';
 shadow.position.set(bx,.239,bz);shadow.scale.x=1.54+.32*s.flat+.49*s.split;
 stamp.position.set(layout.spot,.24,bz);stamp.visible=s.mark>.03;
 stamp.scale.setScalar(Math.max(.001,s.imprint));stamp.scale.y=1;
 const t=ease(s.berry),tip=s.phase==='berry'?.24*(1-s.berry):0;
 const takeAway=ease(clamp((s.delivery-.88)/.106));
 const bringBack=s.cycle>0?1-ease(clamp(s.age/1.3)):0;
 const plateTravel=Math.max(takeAway,s.phase==='spread'?bringBack:0);
 berryPlate.position.set(layout.plateX+6.8*plateTravel,.03+.36*plateTravel,layout.plateZ-.85*plateTravel);
 berryPlate.rotation.z=tip*.44+plateTravel*.06;
 strawberry.position.set(berryPlate.position.x*(1-t)+bx*t, (berryPlate.position.y+.156)*(1-t)+(by+.17)*t+.92*Math.sin(PI*t),berryPlate.position.z*(1-t)+bz*t);
 strawberry.rotation.z=.11+tip+.12*Math.sin(PI*t)+.85*t;
 strawberry.position.x+=Math.sin(strawberry.rotation.z)*.55*t;strawberry.position.y+=(1-Math.cos(strawberry.rotation.z))*.55*t;strawberry.rotation.x=.02+.31*Math.sin(PI*t);
 strawberry.rotation.y=-.55;strawberry.visible=s.coverage<.987&&mound.visible;
 for(const plate of [goalPlate,berryPlate])plate.userData.shadow.position.set(plate.position.x,.013,plate.position.z);
 const sizes=layout.narrow?.89:1;
 halves.forEach((g,i)=>{
 const sign=i===0?-1:1;
 g.visible=!mound.visible;if(!g.visible)return;
 const op=ease(s.split),send=s.delivery;
 const chosen=sign===s.selected,travel=ease(clamp((send-(chosen?0:.33))/(chosen? .94:.67)));
 const plate=chosen?berryPlate:goalPlate;
 // Both intact hemispheres initially meet on the vertical cut plane.
 const theta=-sign*(PI/2-op*1.29);
 g.rotation.set(-op*(chosen?.24:.14)-travel*.04,theta+travel*sign*.18,sign*op*.10);
 const sc=1-(1-.72*sizes)*travel;g.scale.setScalar(sc);
 g.position.set((bx+sign*(op*.95+.014))*(1-travel)+(chosen?plate.position.x:-.85)*travel,
 by+op*.022+Math.sin(travel*PI)*1.36+travel*(chosen?plate.position.y-.09:1.29),
 bz*(1-travel)+(chosen?plate.position.z:9.9)*travel+op*sign*.10);
 cutShape(g,clamp(Math.abs(s.turn)/1.3));
 });

 cordViews();
}
function resizeScene(){
 const prev=layout.narrow;configureLayout();resizeCamera();
 if(prev!==layout.narrow){
 tray.scale.x=layout.w/home.w;tray.scale.z=layout.d/home.d;tray.position.z=layout.z;
 architecture.scale.x=layout.narrow===home.narrow?1:(layout.narrow?.72:1.39);
 props.scale.x=layout.narrow===home.narrow?1:(layout.narrow?.73:1.37);
 for(const [p,sg]of [[goalPlate,-1],[berryPlate,1]]){p.position.set(sg*layout.plateX,.03,layout.plateZ);p.scale.setScalar(layout.narrow===home.narrow?1:layout.narrow?.82:1.22);}
 steady.position.set(-layout.w*.5+.31,.445,layout.z-.63);spoolPose();spareCord();
 }if(finishTarget)finishTarget.setSize(canvas.width,canvas.height);
}
const ray=new T.Raycaster(),point=new T.Vector2(),plane=new T.Plane(V(0,1,0),0);
let capture=null;
function setRay(e){const r=canvas.getBoundingClientRect();point.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(point,camera);}
function planePoint(y){plane.constant=-y;return ray.ray.intersectPlane(plane,V());}
function hit(obj){return ray.intersectObject(obj,true).find(h=>h.object.visible);}
function distanceToString(){
 let d=Infinity;
 for(let i=4;i<11;i++)d=Math.min(d,Math.sqrt(Math.max(0,ray.ray.distanceSqToSegment(loopPoints[i],loopPoints[i+1]))));
 return d;
}
function pick(e){
 setRay(e);scene.updateMatrixWorld(true);
 const s=game.s;let tool=null,h;
 if(s.phase==='spread'||s.phase==='fold'||s.phase==='roll'||s.phase==='cut'){
 if(s.phase==='cut'&&s.insert>.18&&loopPoints.length&&distanceToString()<.18){h={point:planePoint(threadSpot.y)};tool='loop';}
 else{h=hit(dough);if(h)tool={spread:'dough',fold:'rim',roll:'seam',cut:'turn'}[s.phase];}
 }else if(s.phase==='berry'){h=hit(strawberry);tool='berry';}
 else if(s.phase==='serve'&&!s.sent){
 const hits=halves.map(g=>hit(g)).filter(Boolean).sort((a,b)=>a.distance-b.distance);h=hits[0];tool='half';
 }
 if(!h||!tool)return null;
 let x=h.point.x-centerX(),z=h.point.z-layout.z;
 if(tool==='rim'&&Math.hypot(x,z)<.76){const r=nextRim();x=r.x;z=r.z;}
 if(!game.down(tool,x,z))return null;
 return {id:e.pointerId,origin:h.point,rx:x,rz:z,tool};
}
canvas.addEventListener('pointerdown',e=>{
 if(capture||e.button!==0)return;
 audioStart();capture=pick(e);if(capture){canvas.setPointerCapture(e.pointerId);e.preventDefault();}
});
canvas.addEventListener('pointermove',e=>{
 if(!capture||capture.id!==e.pointerId)return;setRay(e);const p=planePoint(capture.origin.y);if(p)game.move(capture.rx+p.x-capture.origin.x,capture.rz+p.z-capture.origin.z);
});
function release(e){
 if(!capture||capture.id!==e.pointerId)return;
 // Integrate the final displacement even when a touch starts and ends between frames.
 if(e.type==='pointerup'){setRay(e);const p=planePoint(capture.origin.y);
 if(p)game.move(capture.rx+p.x-capture.origin.x,capture.rz+p.z-capture.origin.z);game.step(1/120);}
 game.up();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);capture=null;
}
for(const e of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(e,release);
function stepWorld(dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 // The guide and suspended particles use the same clock and continue through dropped frames.
 const count=Math.max(1,Math.ceil(dt/.05-1e-9));
 for(let i=0;i<count;i++){const h=dt/count;game.step(h);guide(h);atmosphere(h);}
}
window.__GAME__={step:stepWorld,getState:()=>game.getState()};
let finishTarget=null,postScene=null,postCamera=null,postMat=null;
function finish(){
 // Reflected window, timber floor and green walls are sampled in direction space.
 const env=bitmap(192,96,(i,j,u,v)=>{
 const y=Math.sin((v-.5)*PI),a=(u-.5)*TAU;
 const win=clamp((.99-Math.abs(a+1.9))/.045)*clamp((y-.04)/.05)*clamp((.92-y)/.06);
 const mullion=(Math.abs(Math.sin((a+2.91)*6.6))<.061||Math.abs(y-.48)<.015)?.34:1;
 const b=y<0?[118,89,61]:[114+57*y,133+37*y,111+40*y];
 return b.map((n,k)=>n*(1-win)+[249,247,219][k]*win*mullion);
 });env.mapping=T.EquirectangularReflectionMapping;scene.environment=env;scene.environmentIntensity=.35;
 if(!renderer.extensions.has('EXT_color_buffer_float'))return;
 finishTarget=new T.WebGLRenderTarget(canvas.width,canvas.height,{type:T.HalfFloatType,depthBuffer:true,samples:renderer.getPixelRatio()>1.4?0:2});
 postScene=new T.Scene();postCamera=new T.Camera();
 postMat=new T.ShaderMaterial({uniforms:{picture:{value:finishTarget.texture},pixel:{value:new T.Vector2(1/canvas.width,1/canvas.height)}},depthTest:false,depthWrite:false,
 vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`uniform sampler2D picture;uniform vec2 pixel;varying vec2 vUv;
 void main(){
 vec3 c=texture2D(picture,vUv).rgb;vec3 bloom=vec3(0.);
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a))*pixel*4.;
 vec3 s=texture2D(picture,vUv+d).rgb;bloom+=max(s-vec3(1.),vec3(0.));}
 vec2 v=(vUv-.5)*1.46;c=(c+bloom*.0028)*(1.-.095*dot(v,v));
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 gl_FragColor=vec4(c*(1.+grain*.009),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
}
let last=0,first=true;
function frame(now){
 const dt=last?Math.min(.052,(now-last)/1000):1/120;last=now;
 stepWorld(dt);objects();sounds();renderer.setRenderTarget(finishTarget);renderer.render(scene,camera);
 if(finishTarget){renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}
 if(first){first=false;requestAnimationFrame(refineSurfaces);setTimeout(finish,120);}
 requestAnimationFrame(frame);
}
window.addEventListener('resize',()=>{resizeScene();if(postMat)postMat.uniforms.pixel.value.set(1/canvas.width,1/canvas.height);});
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){game.up();capture=null;}});
requestAnimationFrame(frame);
