(function(){
'use strict';
const T=THREE,{v3,mat,mesh,group,lathe,rod,bake}=Craft,canvas=document.getElementById('view');
const world=RainGarden.makeWorld(),s=world.s,spec=RainGarden.vessels;
window.__GAME__={step:world.step,getState:world.getState,setRain:world.setRain};
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.08,90);
const garden=MakeGarden(scene,renderer),pots=spec.map((_,i)=>Craft.vessel(scene,i)),spout=Craft.spout(scene);
spout.rotation.y=s.angle;pots.forEach(p=>p.surf.visible=false);
const hydrology=group(scene);
const dropMat=new T.MeshPhysicalMaterial({color:0xc4e6dc,metalness:.40,roughness:.09,clearcoat:1,envMapIntensity:1.9,...Craft.surface('glaze')});
const rainMat=mat(0xd4e5df,.21,.21,'glaze',{transparent:true,opacity:.31,depthWrite:false});
const rippleMat=mat(0xc3d9c5,.21,.49,'glaze',{transparent:true,opacity:.64,depthWrite:false});
function pool(geo,material,n){
 const m=new T.InstancedMesh(geo,material,n);m.count=0;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;hydrology.add(m);return m;
}
const dropPool=pool(new T.SphereGeometry(1,12,9),dropMat,96),rainPool=pool(new T.SphereGeometry(1,5,4),rainMat,150),
  ringPool=pool(new T.TorusGeometry(1,.026,5,44).rotateX(Math.PI/2),rippleMat,128);
const temp=new T.Object3D(),vec=v3(),yaxis=v3(0,1,0);
function put(m,index,x,y,z,w,h,d,tilt=0){
 temp.position.set(x,y,z);temp.scale.set(w,h,d);temp.rotation.set(0,0,tilt);temp.updateMatrix();m.setMatrixAt(index,temp.matrix);
}
function finishPool(m,n){m.count=n;m.instanceMatrix.needsUpdate=true;}
const streams=[],runnelMat=mat(0xa4c4b4,.105,.43,'glaze',{transparent:true,opacity:.82});
for(let i=0;i<8;i++){
 const z=(i+.5)*2.48/8,strip=mesh(spout,new T.SphereGeometry(1,12,8),runnelMat,0,-.585*z/2.48-.15,z);
 strip.castShadow=false;streams.push(strip);
}
const spillMeshes=[];
for(let i=0;i<4;i++){
 const a=spec[i],b=spec[i+1],d=v3(b.x-a.x,0,b.z-a.z).normalize(),from=v3(a.x,a.rim-.016,a.z).addScaledVector(d,a.radius*.90),to=v3(b.x,b.rim+.026,b.z).addScaledVector(d,-b.radius*.46);
 const span=to.clone().sub(from),pipe=mesh(hydrology,new T.CylinderGeometry(1,1,1,9),runnelMat);pipe.position.copy(from.clone().add(to).multiplyScalar(.5));pipe.quaternion.setFromUnitVectors(yaxis,span.clone().normalize());pipe.scale.y=span.length();pipe.castShadow=false;spillMeshes.push(pipe);
}
const grip=group(spout,.201,-.63,2.01),gripMetal=mat(0xe3c485,.27,.64,'metal',{emissive:0xeac878,emissiveIntensity:.16});
const gripRing=mesh(grip,new T.TorusGeometry(.087,.008,8,48),gripMetal);grip.rotation.y=.35;
const hullPath=new T.CatmullRomCurve3([v3(.03,-.225,-3.48),v3(.74,-.225,-3.99),v3(1.76,-.225,-4.65),v3(2.66,-.225,-5.24)]);
// Capture the actual garden, roof and boards for local reflections in metal, glaze and water.
const probeRT=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType}),probe=new T.CubeCamera(.08,65,probeRT);
probe.position.set(.07,1.3,-1.46);scene.add(probe);
probe.update(renderer,scene);const pmrem=new T.PMREMGenerator(renderer),localEnv=pmrem.fromCubemap(probeRT.texture);
scene.environment=localEnv.texture;scene.environmentIntensity=1.05;pmrem.dispose();probeRT.dispose();scene.remove(probe);renderer.shadowMap.autoUpdate=false;let lastShadow=-1;
const score=document.querySelector('#score'),tokens=[];
const icons=[
 '<path d="m6 12 2.3 12h13.2L24 12M5.5 11.3q9.4 3.4 19 0M7 11C7 0 22 0 23 11"/><path d="M10 21h9"/>',
 '<path d="M11 4h8l-.4 5c0 2.8 4.1 3 4.1 7.1V23q0 2-2 2H9q-2 0-2-2v-6.9c0-4.1 4.1-4.3 4.1-7.1L11 4Z"/><path d="M10.7 6.6h8.5M10.5 16v5"/>',
 '<path d="M5 10q10-4.6 20 0l-2.4 13.4q-7 3.2-15.2 0Z"/><path d="M5 10q10 4.6 20 0M7 19q8 3.8 16 0M11 12l.8 11M19 12l-.8 11"/>',
 '<path d="M5.5 12h19l-1.3 7q-1.1 5.2-8.2 5.2T6.8 19Z"/><path d="M6 12c0-2.9 18-2.9 18 0M5.4 14H2.8q-1.5 3.7 3.6 4.2m18-4.2H27q1.4 3.3-3.4 4.2"/>',
 '<ellipse cx="15" cy="11.3" rx="10" ry="3.1"/><path d="M5 11.5q.8 8.2 7 10.4v1.9q3.2 1.6 6 0v-1.9q6.3-2.4 7-10.4M8.7 16.2q6 3.5 12.7 0"/>'
];
for(let i=0;i<5;i++){const el=document.createElement('div');el.className='token';el.innerHTML='<svg viewBox="0 0 30 30">'+icons[i]+'</svg>';score.appendChild(el);tokens.push(el);}
const hint=document.querySelector('#hint'),meter=[...document.querySelectorAll('#meter i')],weather=document.getElementById('weather'),audio=document.getElementById('audio');
audio.addEventListener('click',()=>{GardenSound.toggle();world.touch();});
weather.addEventListener('click',()=>{if(!['gather','cascade','music'].includes(s.phase))return;GardenSound.start();const rates=[.2,.65,1.1,1.55,2];world.setRain(rates.find(r=>r>s.rainTarget+.075)||rates[0]);world.touch();});
// Downsample highlights before a wide, low gain bloom. Fine grain is fixed to the screen.
const full=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true}),small=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
full.samples=Math.min(2,renderer.capabilities.maxSamples||0);
const postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),postScene=new T.Scene(),quad=new T.Mesh(new T.PlaneGeometry(2,2));postScene.add(quad);
const vert='varying vec2 uv0; void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}';
const bright=new T.ShaderMaterial({uniforms:{source:{value:full.texture},px:{value:new T.Vector2()}},vertexShader:vert,fragmentShader:`
 uniform sampler2D source;uniform vec2 px;varying vec2 uv0;
 void main(){vec3 c=vec3(0.);for(int x=0;x<3;x++)for(int y=0;y<3;y++){vec3 v=texture2D(source,uv0+px*(vec2(float(x),float(y))-1.)*2.).rgb;c+=max(v-vec3(1.06),vec3(0.));}gl_FragColor=vec4(c/9.,1.);}`});
const finish=new T.ShaderMaterial({uniforms:{source:{value:full.texture},glow:{value:small.texture},px:{value:new T.Vector2()}},vertexShader:vert,fragmentShader:`
 uniform sampler2D source,glow;uniform vec2 px;varying vec2 uv0;
 void main(){vec3 c=texture2D(source,uv0).rgb,b=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.785398;b+=texture2D(glow,uv0+vec2(cos(a),sin(a))*px*4.).rgb;}c+=b*.008;
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.010;
 }`});
let width=1,height=1,portrait=0,depth=8;
function resize(){
 width=canvas.clientWidth||innerWidth;height=canvas.clientHeight||innerHeight;
 const aspect=width/height,dpr=Math.min(window.devicePixelRatio||1,1.75,Math.sqrt(2200000/(width*height)));
 renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);camera.aspect=aspect;camera.updateProjectionMatrix();
 full.setSize(Math.round(width*dpr),Math.round(height*dpr));small.setSize(Math.max(1,Math.round(width*dpr/4)),Math.max(1,Math.round(height*dpr/4)));
 bright.uniforms.px.value.set(1/full.width,1/full.height);finish.uniforms.px.value.set(1/small.width,1/small.height);
 portrait=Math.max(0,Math.min(1,(1.1-aspect)/.6));depth=Math.max(7.85,10.30/aspect);
}
addEventListener('resize',resize);resize();
function cameraPose(){
 const r=s.camera,near=s.focus;
 const d=depth+r.pull-(portrait*near*depth*.39),yaw=.08-portrait*.46,pitch=.222+portrait*.095+near*.09;
 const center=v3(r.x-.06*portrait,r.y,r.z),offset=v3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(d);
 camera.position.copy(center).add(offset);camera.lookAt(center);camera.updateMatrixWorld();GardenSound.listen(camera.position.x,camera.position.y,camera.position.z,yaw);
}
cameraPose();
const ray=new T.Raycaster(),mouse=new T.Vector2();
function project(v){vec.copy(v).project(camera);return {x:(vec.x+1)*width*.5,y:(1-vec.y)*height*.5};}
function atSpout(a,r=2.03){return v3(Math.sin(a)*r,2.51-.585*r/2.48-.10,-2.12+Math.cos(a)*r);}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function segment(p,a,b){const x=b.x-a.x,y=b.y-a.y,len=x*x+y*y;const k=Math.min(1,Math.max(0,((p.x-a.x)*x+(p.y-a.y)*y)/(len||1)));return distance(p,{x:a.x+x*k,y:a.y+y*k});}
function activeWater(){return ['gather','cascade','music'].includes(s.phase);}
function rayHits(point,objects){mouse.set(point.x/width*2-1,1-point.y/height*2);ray.setFromCamera(mouse,camera);return ray.intersectObjects(objects,true)[0];}
function boatPoint(){return hullPath.getPointAt(Math.max(0,Math.min(1,s.boat.distance/2.28)));}
function activePos(){
 if(activeWater())return atSpout(s.angle,2.10);
 if(s.phase==='boat'||s.phase==='clear')return boatPoint();
 if(s.phase==='wheel')return v3(3.11,.96,-5.45);
 return v3(-1.05,1.30,-4.95);
}
let drag=null;
canvas.addEventListener('pointerdown',e=>{
 if(drag||!e.isPrimary)return;GardenSound.start();const p={x:e.clientX,y:e.clientY};
 if(activeWater()&&(segment(p,project(atSpout(s.angle,.25)),project(atSpout(s.angle,2.55)))<25||rayHits(p,[spout]))){
  drag={id:e.pointerId,kind:'spout',start:p,origin:s.angle,anchor:project(atSpout(s.angle))};s.held=true;
 }else if(activeWater()){
   const i=pots.findIndex(pot=>rayHits(p,[pot.g]));
   if(i<0)return;
   if(s.phase==='music')world.strike(i,.87);else s.vessels[i].velocity+=.026;
 }else if(s.phase==='boat'||s.phase==='clear'){
   if(distance(p,project(boatPoint()))>43&&!rayHits(p,[garden.boat]))return;
   world.push(.85);drag={id:e.pointerId,kind:'boat',last:p};
 }else if(s.phase==='wheel'){
   if(distance(p,project(v3(3.11,.42,-5.45)))>34&&!rayHits(p,[garden.wheel]))return;
   world.push(.65);drag={id:e.pointerId,kind:'wheel',last:p};
 }else if(s.phase==='bells'){
   const i=garden.bellParts.findIndex(b=>rayHits(p,[b])||distance(p,project(b.localToWorld(v3(0,-.47,0))))<24);
   if(i<0)return;world.ringBell(i,1.1);drag={id:e.pointerId,kind:'bells',i,last:p};
 }else return;
 world.touch();if(drag)canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;const p={x:e.clientX,y:e.clientY};world.touch();
 if(drag.kind==='spout'){
  const target={x:drag.anchor.x+p.x-drag.start.x,y:drag.anchor.y+p.y-drag.start.y};let best=Infinity,a=s.aim;
  for(let k=0;k<=110;k++){const val=-1.035+k/110*2.08,d=distance(target,project(atSpout(val)));if(d<best){best=d;a=val;}}world.setAim(a);
 }else{
  const dx=p.x-drag.last.x,dy=p.y-drag.last.y;
  if(drag.kind==='boat')world.push(Math.min(.31,Math.hypot(dx,dy)/110));
  if(drag.kind==='wheel'){const c=project(v3(3.11,.42,-5.45)),a=Math.atan2(c.y-p.y,p.x-c.x),b=Math.atan2(c.y-drag.last.y,drag.last.x-c.x);
    world.push(Math.max(-.40,Math.min(.40,Math.atan2(Math.sin(a-b),Math.cos(a-b)))));}
  if(drag.kind==='bells')world.ringBell(drag.i,Math.max(-.19,Math.min(.19,dx/95)));
  drag.last=p;
 }
});
function release(e){if(drag&&drag.id===e.pointerId){if(drag.kind==='spout')world.release();drag=null;}}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
const wingBase=[-1,1];
function draw(){
 cameraPose();spout.rotation.y=s.angle;
 const near=spec.reduce((a,b,i)=>Math.abs(b.angle-s.angle)<Math.abs(spec[a].angle-s.angle)?i:a,0);
 pots.forEach((pot,i)=>{
   const v=s.vessels[i],p=spec[i],f=Math.min(1,v.litres/p.capacity);
   for(const piece of pot.body.children)piece.material.roughness=piece.userData.dry*(1-v.wet*.28);pot.body.rotation.z=v.shake;pot.body.rotation.x=v.shake*.29;const surf=pot.surf;
   const r= i===1?(f<.66?.312:f<.83?.312-(f-.66)*.65:.198):p.radius*([.685,.75,.715,.61,.48][i]+(1-[.685,.75,.715,.61,.48][i])*Math.pow(f,.73))*.935;
   surf.scale.set(r,r,1);surf.position.y=.13+(p.rim-.16)*f+v.wave*.25;surf.rotation.y=v.wave*.80;surf.rotation.x=-Math.PI/2+v.wave*.46;
   surf.visible=f>.002;tokens[i].style.setProperty('--fill',(f*360).toFixed(1)+'deg');tokens[i].classList.toggle('live',i===near&&activeWater()||s.phase==='music'&&v.energy>.75);
   if(i<4){const tube=spillMeshes[i];tube.visible=v.spill>.00007;tube.scale.x=tube.scale.z=Math.min(.037,Math.sqrt(v.spill)*.21);}
 });
 streams.forEach((m,i)=>{const f=Math.sqrt(Math.min(1,s.film[i]*212));m.visible=f>.025;m.scale.set(.115*f,.015*f,.172);});
 gripRing.material.emissiveIntensity=.11+.24*Math.min(1,s.idle*.3);
 let n=0;
 for(const d of s.drops)put(dropPool,n++,d.x,d.y,d.z,.024,.031+Math.min(.040,-d.vy*.006),.024);
 for(const d of s.splashes){if(n>=96)break;put(dropPool,n++,d.x,d.y,d.z,.010,.017,.010);}
 finishPool(dropPool,n);n=0;
 for(let i=0;i<Math.round(s.rainGrains.length*Math.min(1,s.rain/2));i++){const d=s.rainGrains[i];put(rainPool,n++,d.x,d.y,d.z,.0049,.058+d.speed*.004,.0049,-s.wind*.07);}
 finishPool(rainPool,n);n=0;
 for(const r of s.rings){
   let y=r.y,rr=r.r;
   if(r.domain[0]==='v'){const i=Number(r.domain[1]),p=spec[i],surf=pots[i].surf;if(!surf.visible||rr+Math.hypot(r.x-p.x,r.z-p.z)>surf.scale.x*.98)continue;y=surf.position.y+.005;}
   if(r.domain==='pond'&&((r.x-.63)**2/27.4+(r.z+5.22)**2/7.93>.94))continue;
   put(ringPool,n++,r.x,y,r.z,rr,rr*Math.max(.22,r.amp),rr);
 }finishPool(ringPool,n);
 garden.branchGroups.forEach((g,i)=>{g.rotation.z=s.twigs[i].bend*.8;g.rotation.x=s.twigs[i+4].bend*.43;});
 garden.clouds.forEach((g,i)=>{g.position.x=-10+i*7.3+s.skyTravel[i]+(1-s.cloud)*(i%2?3.2:-2.8);});
 garden.rainbow.visible=s.cloud<.88;garden.rainbow.children.forEach(m=>{m.material.opacity=(1-s.cloud)*.56;});
 garden.sun.intensity=2.48+(1-s.cloud)*1.25;
 const bp=boatPoint();garden.boat.position.copy(bp);garden.boat.position.z+=(1-s.boat.launch)*.81;garden.boat.position.y+=(1-s.boat.launch)*.068;
 const tangent=hullPath.getTangentAt(Math.min(1,s.boat.distance/2.28));garden.boat.rotation.set(s.boat.roll,Math.atan2(-tangent.z,tangent.x),s.boat.roll*.17);
 garden.wheel.rotation.z=s.wheel.angle;garden.cups.forEach((cup,i)=>{const f=s.wheel.cells[i];cup.visible=f>.004;cup.scale.y=.024*f;cup.scale.x=.09*Math.sqrt(f);});garden.bellParts.forEach((g,i)=>{g.rotation.z=s.bells[i].angle+s.twigs[i+11].bend*.40;});
 garden.bird.position.set(s.fly.x,s.fly.y,s.fly.z);garden.bird.rotation.y=Math.atan2(s.fly.vz,-s.fly.vx||1)*Math.min(1,Math.hypot(s.fly.vx,s.fly.vz)*4);
 garden.wings.forEach((g,i)=>g.rotation.x=wingBase[i]*s.fly.wing);
 const demoAge=s.idle-4,beat=demoAge>=0?demoAge%6.4:-1;
 if(beat>=0&&beat<3.0&&s.phase!=='return'){
   const u=Math.max(0,Math.min(1,(beat-.42)/1.84)),ease=u*u*(3-2*u);
   const h=activeWater()?atSpout(s.angle+(near===4?-.50:.50)*ease,2.10):activePos();
   if(s.phase==='wheel'){h.x+=Math.sin(ease*2.5)*.48;h.y-=.42*(1-Math.cos(ease*2.5));}if(s.phase==='boat')h.x+=ease*.45;if(s.phase==='bells')h.x+=ease*.25;
   const pt=project(h);hint.style.transform='translate('+Math.round(pt.x-10)+'px,'+Math.round(pt.y-2)+'px) rotate(-13deg)';hint.style.opacity=String(Math.min(1,beat*3,(3-beat)*3)*.90);
 }else hint.style.opacity='0';
 meter.forEach((el,i)=>el.style.opacity=s.rain>i*.4?'.91':'.20');weather.disabled=!activeWater();weather.style.opacity=activeWater()?'1':'.55';
 if(s.time-lastShadow>=.085){renderer.shadowMap.needsUpdate=true;lastShadow=s.time;}
 renderer.setRenderTarget(full);renderer.render(scene,camera);renderer.setRenderTarget(small);quad.material=bright;renderer.render(postScene,postCamera);renderer.setRenderTarget(null);quad.material=finish;renderer.render(postScene,postCamera);
}
world.step(.36);let previous=performance.now();function frame(now){
 const dt=Math.max(0,Math.min(.10,(now-previous)/1000));previous=now;world.step(dt);
 const notes=world.drainEvents();for(const e of notes)GardenSound.play(e);draw();requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{previous=performance.now();});requestAnimationFrame(frame);
})();
