'use strict';
(()=>{
const canvas=document.getElementById('world'),sim=MovingDay.create({compact:innerWidth/innerHeight<.85}),s=sim.s,sound=new Soundscape();
window.__GAME__={step:sim.step,getState:sim.getState};
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.09,155);
const skyCanvas=document.createElement('canvas');skyCanvas.width=256;skyCanvas.height=256;const skyCtx=skyCanvas.getContext('2d'),skyGrad=skyCtx.createLinearGradient(0,0,0,256);
[[0,'#80b8d0'],[.30,'#9bc8da'],[.451,'#acceDC'],[.505,'#cedfdc'],[.64,'#b0b59a'],[1,'#b6a78d']].forEach(([f,c])=>skyGrad.addColorStop(f,c));skyCtx.fillStyle=skyGrad;skyCtx.fillRect(0,0,256,256);
const sky=new T.CanvasTexture(skyCanvas);sky.mapping=T.EquirectangularReflectionMapping;sky.colorSpace=T.SRGBColorSpace;scene.background=sky;scene.environment=sky;scene.fog=new T.FogExp2('#c4d7ce',.019);
const hemi=new T.HemisphereLight(0xe1efff,0xd2bc92,1.56);scene.add(hemi);
const sun=new T.DirectionalLight(0xffe9c5,2.35);sun.position.set(-7.7,12.4,6.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:11,bottom:-11,near:.3,far:43});sun.shadow.normalBias=.022;sun.shadow.bias=-.00022;sun.shadow.radius=2.1;scene.add(sun,sun.target);
const estate=yard(scene),van=truck(scene),goods=[],contact=[];
let foliage=[],riverView,roomView,visibleWorld='';
for(let i=0;i<5;i++){const g=group(scene);g.userData.id=i;const obj=[carton,bookcase,chair,plant,bicycle][i](g);if(i===3)foliage=obj;batch(g);goods.push(g);contact.push(patch(scene,0,0,[1.54,1.86,1.35,1.03,2.44][i],[1.24,1.02,1.26,.97,.81][i],'#65593d',.26));}
const truckShadow=patch(scene,-1.20,-1.75,8.55,3.81,'#524c3d',.32);
const rack=group(van.body);rack.userData.live=true;
const stripe=mat('#d4a34f','wood'),cordSegments=[];
for(let i=0;i<13;i++){const o=cyl(rack,0,0,0,.043,1,stripe,.043,10);cordSegments.push(o);}
const clasp=group(rack);box(clasp,0,0,0,.125,.18,.208,'#b07c3e',true);box(clasp,.067,.011,0,.035,.105,.115,'#f4d499',true);
const glintM=mat('#f4c469').clone();glintM.emissive.set('#ebac43');glintM.emissiveIntensity=.33;
const halo=group(scene);for(let i=0;i<4;i++){const geo=new T.TorusGeometry(1,.018,8,28,1.29),o=mesh(halo,geo,glintM,0,0,0);o.rotation.z=i*PI/2+.1;o.castShadow=false;}
const rim=group(scene);for(let i=0;i<4;i++){const t=mesh(rim,new T.TorusGeometry(1,.017,7,24,1.07),glintM);t.rotation.z=i*PI/2+.24;t.castShadow=false;}
const sparkles=Array.from({length:3},()=>{let sq=mesh(scene,new T.OctahedronGeometry(1),glintM);sq.castShadow=false;return sq;});
const motes=s.dust.map(()=>{const p=ball(scene,0,0,0,.011,.011,.011,'#f7e7bc',true);p.castShadow=false;return p;});
const bedGlow=patch(van.body,1.29,0,1.41,2.08,'#ffdc90',.31,1.117);
const guideDots=Array.from({length:7},()=>{let o=ball(scene,0,0,0,.037,.009,.037,glintM);o.castShadow=false;return o;});
const sizes=[.76,.88,.63,.52,1.06],up=new T.Vector3(0,1,0),v1=new T.Vector3(),v2=new T.Vector3();
const rt=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:2});
const post=new T.Scene(),postCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tScene:{value:rt.texture},pixel:{value:new T.Vector2()}},vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
uniform sampler2D tScene;uniform vec2 pixel;varying vec2 uvv;
void main(){vec3 c=texture2D(tScene,uvv).rgb;vec3 glow=vec3(0.);
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec3 q=texture2D(tScene,uvv+vec2(float(x),float(y))*pixel*4.).rgb;glow+=max(q-.93,0.);}
 c+=glow*.006;vec2 p=(uvv-.5)*1.4;c*=1.-.12*dot(p,p);
 c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.0045;
 gl_FragColor=vec4(max(c,vec3(0.)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`});
post.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
let width,height,compact,pointer=null,gesture=null,hasMoved=false,startX=0,startY=0,prevX=0,prevY=0,oldPhase='',oldStage=-1;
let srcPoint=new T.Vector3(),dstPoint=new T.Vector3(),focusPoint=new T.Vector3(),showHalo=false;
const hint=document.getElementById('hint'),fade=document.getElementById('fade'),nodes=[...document.querySelectorAll('.node')],button=document.getElementById('sound');
const ray=new T.Raycaster(),dragPlane=new T.Plane(),dragOffset=new T.Vector3();
function resize(){width=canvas.clientWidth;height=canvas.clientHeight;compact=width/height<.85;sim.layout(compact);const ratio=Math.min(devicePixelRatio||1,1.65,Math.sqrt(2200000/(width*height)));renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);rt.setSize(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)));finish.uniforms.pixel.value.set(1/rt.width,1/rt.height);camera.aspect=width/height;camera.updateProjectionMatrix();}
function setCamera(){
 let a=camera.aspect,angle,tilt,dist,at;
 if(s.world==='yard'){
  angle=compact?.91:.55;tilt=compact?.45:.18;
  dist=compact?Math.max(19.1,11.55/a):Math.max(12.05,17.9/a);dist+=s.viewPull.x;
  at=compact?[.84,1.05,.21]:[-.40,1.38,-.25];
  if(s.phase==='depart')at[0]-=s.travel*.35;
 }else if(s.world==='river'){
  angle=compact?.41:.33;tilt=compact?.40:.26;dist=Math.max(14.4,(compact?10.95:20.6)/a);
  at=[compact?1.4:.8,1.00,-1.65];
 }else{
  angle=compact?.25:.26;tilt=compact?.34:.205;dist=Math.max(12.80,15.95/a);
  at=[-.32,1.44,-.30];
 }
 camera.position.set(at[0]+Math.sin(angle)*Math.cos(tilt)*dist,at[1]+Math.sin(tilt)*dist,at[2]+Math.cos(angle)*Math.cos(tilt)*dist);
 if(s.world==='room'){
  const f=Math.min(1,s.harborView.x),bx=-1.94+s.boatRun;
  const end=new T.Vector3(bx+1.52,2.18,-3.46);
  camera.position.lerp(end,f);
  at[0]+=(bx-at[0])*f;at[1]+=(.94-at[1])*f;at[2]+=(-7.9-at[2])*f;
 }
 camera.lookAt(...at);camera.updateMatrixWorld();
}
function project(p){const v=p.clone().project(camera);return new T.Vector2((v.x+1)*width/2,(1-v.y)*height/2);}
function worldPos(o,x=0,y=0,z=0){return o.localToWorld(new T.Vector3(x,y,z));}
function setWorld(){
 if(visibleWorld===s.world)return;visibleWorld=s.world;
 if(s.world==='river'&&!riverView)riverView=river(scene);
 if(s.world==='room'&&!roomView)roomView=room(scene);
 estate.visible=s.world==='yard';if(riverView)riverView.g.visible=s.world==='river';if(roomView)roomView.g.visible=s.world==='room';
 van.root.visible=truckShadow.visible=s.world!=='room';
 scene.fog.density=s.world==='room'?.011:.019;
 sun.position.set(...(s.world==='room'?[3.5,9,-7]:[-7.7,12.4,6.2]));sun.target.position.set(0,0,0);
}
function cargoPose(){const isYard=s.world==='yard',isRoom=s.world==='room';
 const sum=s.shocks.reduce((v,b)=>v+b.x,0)*.25;
 van.root.position.set(isYard?-s.travel:7.35-s.travel,isYard?0:.44,-1.75);
 van.body.position.y=-sum;van.body.rotation.z=(s.shocks[0].x+s.shocks[2].x-s.shocks[1].x-s.shocks[3].x)/8.2;
 van.body.rotation.x=(s.shocks[0].x+s.shocks[1].x-s.shocks[2].x-s.shocks[3].x)/4.2;
 van.wheels.forEach((w,i)=>w.rotation.z=s.wheel[i].x);
 van.slats.forEach((o,i)=>{const travel=s.door[i].x*2.48,d=(i-11)*.208+travel;
  const radius=.16,curve=radius*PI/2,bend=Math.max(0,Math.min(PI/2,(d+curve)/radius));
  o.position.set(1.991-radius+Math.sin(bend)*radius+Math.min(0,d+curve),3.51+radius*Math.cos(bend)-Math.max(0,d),0);o.rotation.z=PI/2-bend;});
 van.ramp.rotation.z=-.48-Math.min(1,s.door[0].x)*.81;van.ramp.scale.x=Math.max(.015,1-s.door[0].x);
 bedGlow.visible=isYard&&s.phase==='load';truckShadow.position.x=van.root.position.x-.97;
 let packed=s.count>=3&&!isRoom;rack.visible=packed;
 if(packed){let pts=s.rope.map((r,i)=>{const q=i/13;return new T.Vector3(1.59+r.x*.48,1.52+q*.83-r.x*1.38,-1.13+q*2.23);});cordSegments.forEach((o,i)=>{const delta=v1.subVectors(pts[i+1],pts[i]);o.position.copy(pts[i]).addScaledVector(delta,.5);o.scale.y=delta.length();o.quaternion.setFromUnitVectors(up,delta.normalize());});clasp.position.copy(pts[6]);}
 for(const b of s.items){const o=goods[b.id],packed=b.mode==='packed';
 o.visible=isRoom?b.mode!=='stored':(isYard||packed);if(!o.visible){contact[b.id].visible=false;continue;}
 o.position.set(...b.p);if(packed){o.position.x+=van.root.position.x;o.position.y+=van.root.position.y-sum;}
 o.rotation.set(b.spin.x*.5,b.yaw.x,b.tilt.x+b.spin.x);
 let shadow=contact[b.id];shadow.visible=(!packed&&isYard)||(isRoom&&b.mode!=='stored');shadow.position.set(b.p[0],.020,b.p[2]);shadow.rotation.z=o.rotation.y;
 }
 foliage.forEach((l,i)=>{l.rotation.z=s.air[i%12].leaf.x*(1.1+i%3*.3)+s.items[3].tilt.v*.05;});
 liveCrowns.forEach(b=>{b.g.rotation.z=s.air[b.idx].leaf.x*.31;b.g.rotation.x=s.air[(b.idx+3)%12].leaf.x*.25;});
 motes.forEach((o,i)=>{let p=s.dust[i].p;o.position.set(p[0],p[1],p[2]);});
 if(s.world==='river'){riverView.leaves.forEach((o,i)=>o.rotation.z=(i===0?1:-1)*s.bridge[i].x);riverView.gear.rotation.z=-s.crank.x;updateWater(riverView.water,s);}
 if(isRoom){roomView.shutters.forEach((o,i)=>o.rotation.y=(i===0?-1:1)*s.shutters[i].x);
  roomView.boat.position.set(-1.94+s.boatRun,-.13+s.waves[14].x,-7.9);roomView.boat.rotation.z=s.boatHeel.x;roomView.sail.scale.y=.22+.78*s.sail.x;roomView.sail.rotation.y=-.18+s.air[2].leaf.x;updateWater(roomView.water,s);}
 // Local leaf occlusion modulates the sunlight falling through the canopy.
 sun.intensity=2.35+s.air[9].light.x*.85;
}
function signals(){
 const a=sim.active(),roomMode=s.world==='room';let kind=s.phase;showHalo=false;rim.visible=false;
 if(a>=0){
  const o=goods[a];srcPoint.copy(worldPos(o,0,MovingDay.heights[a]*.58,0));
  dstPoint.set(...(roomMode?sim.goal():[2.02,1.57,-1.74]));if(roomMode)dstPoint.y+=.18;
  focusPoint.set(o.position.x,.029,o.position.z);showHalo=s.held<0&&['yard','waiting'].includes(s.items[a].mode);
  halo.scale.set(sizes[a],sizes[a]*.81,1);halo.rotation.set(-PI/2,0,0);
  if(roomMode){rim.visible=true;rim.position.set(dstPoint.x,.040,dstPoint.z);rim.rotation.set(-PI/2,0,0);rim.scale.set(.69,.59,1);}
 }else if(kind==='tie'){
  srcPoint.copy(worldPos(clasp,.05,0,0));dstPoint.copy(worldPos(rack,1.65,2.38,1.14));focusPoint.copy(srcPoint);halo.quaternion.copy(camera.quaternion);halo.scale.setScalar(.236);showHalo=true;
 }else if(kind==='door'){
  srcPoint.copy(worldPos(van.slats[11],.06,0,0));dstPoint.copy(worldPos(van.body,2.06,1.12,0));focusPoint.copy(srcPoint);halo.quaternion.copy(camera.quaternion);halo.scale.setScalar(.25);showHalo=true;
 }else if(kind==='bridge'){
  srcPoint.copy(worldPos(riverView.gear,.37,0,.16));dstPoint.copy(worldPos(riverView.gear,-.28,.31,.16));focusPoint.copy(worldPos(riverView.gear,0,0,.10));halo.quaternion.copy(camera.quaternion);halo.scale.setScalar(.57);showHalo=true;
 }else if(kind==='window'){srcPoint.copy(worldPos(roomView.shutters[0],2.1,1.22,.14));dstPoint.set(-1.88,2.49,-2.18);focusPoint.copy(srcPoint);halo.quaternion.copy(camera.quaternion);halo.scale.setScalar(.238);showHalo=true;
 }else if(kind==='sail'){srcPoint.copy(worldPos(roomView.boat,0,.79,0));dstPoint.copy(worldPos(roomView.boat,-.18,2.19,0));focusPoint.copy(srcPoint);halo.quaternion.copy(camera.quaternion);halo.scale.setScalar(.47);showHalo=true;}
 halo.position.copy(focusPoint);halo.visible=showHalo;
 const glow=1+s.air[2].u*.046;halo.scale.x*=glow;halo.scale.y*=glow;
 sparkles.forEach((p,i)=>{p.visible=a>=0&&showHalo;if(!p.visible)return;const o=goods[a],w=sizes[a];
 p.position.set(o.position.x+(i===0?-1:1)*w*(i===2?.69:.79),o.position.y+MovingDay.heights[a]*(i===1?.52:.96)+s.air[(i+3)%12].leaf.x*.55,o.position.z+(i===1?.27:0));
 const q=(i===0?.066:.044)*(1+s.air[i].u*.63);p.scale.set(q*.63,q*1.12,q*.63);});
 guideDots.forEach((d,i)=>{d.visible=kind==='load'&&a>=0&&s.items[a].mode==='yard';if(!d.visible)return;
 const u=(i+1)/9,o=goods[a].position;
 d.position.set(o.x*(1-u)+3.78*u+.48*Math.sin(u*PI),.029,o.z*(1-u)-1.64*u);});
 const stage=roomMode?3:['door','depart','bridge','cross'].includes(kind)?2:s.count>=3?1:0;
 if(oldStage!==stage){nodes.forEach((n,i)=>n.className='node'+(i===stage?' current':i<stage?' done':''));oldStage=stage;}
 const canHint=(showHalo||s.held>=0)&&s.idle>4&&pointer===null;
 if(canHint){const h=(s.idle-4)%3.8,t=Math.max(0,Math.min(1,(h-.52)/1.66)),f=t*t*(3-2*t);const p=project(srcPoint),q=project(dstPoint);
 let x=p.x+(q.x-p.x)*f,y=p.y+(q.y-p.y)*f-Math.sin(t*PI)*(a>=0?32:12);
 if(kind==='bridge'){const center=project(focusPoint),r=p.distanceTo(center),ang=Math.atan2(p.y-center.y,p.x-center.x)+f*PI*1.55;x=center.x+r*Math.cos(ang);y=center.y+r*Math.sin(ang);}
 hint.style.opacity=String(Math.max(0,Math.min(1,h/.27,(2.94-h)/.48))*.87);
 hint.style.transform='translate('+Math.round(x-7)+'px,'+Math.round(y-8)+'px) rotate(-9deg)';
 }else hint.style.opacity='0';
 let entering=(kind==='room'&&s.roomIndex===0||kind==='bridge'||kind==='load'&&s.cycles&&s.index===0)?Math.max(0,1-s.age/.63):0;fade.style.opacity=String(Math.max(s.fade,entering));
 if(oldPhase!==kind){canvas.setAttribute('aria-label',s.world==='yard'?'引っ越しの庭':s.world==='river'?'川の跳ね橋':'海辺の新居');oldPhase=kind;}
}
const probes=new Map();let reflectionWorld='';
function reflect(){
 if(reflectionWorld===s.world)return;
 reflectionWorld=s.world;
 if(!probes.has(s.world)){
  scene.environment=sky;
  const target=new T.WebGLCubeRenderTarget(64,{type:rt.texture.type});
  const probe=new T.CubeCamera(.15,94,target);
  probe.position.set(...(s.world==='yard'?[2.6,2.75,1.40]:s.world==='river'?[1.0,1.3,-2.7]:[0,1.7,-7.2]));
  probe.update(renderer,scene);probes.set(s.world,target);
 }
 scene.environment=probes.get(s.world).texture;
}
function draw(){setWorld();setCamera();cargoPose();scene.updateMatrixWorld();signals();reflect();renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(post,postCam);}
function cast(x,y){ray.setFromCamera(new T.Vector2(2*x/width-1,1-2*y/height),camera);}
function near(x,y,p,r){return project(p).distanceTo(new T.Vector2(x,y))<=r;}
function itemAt(x,y){cast(x,y);const ls=goods.filter((o,i)=>o.visible&&!['packed','stored'].includes(s.items[i].mode));const hits=ray.intersectObjects(ls,true);if(hits.length){let obj=hits[0].object;while(obj&&obj.userData.id===undefined)obj=obj.parent;if(obj)return obj.userData.id;}
 const a=sim.active();if(a>=0&&near(x,y,srcPoint,compact?25:26))return a;return -1;}
function pointInsideDrop(x,y){
 if(s.world==='room'){const p=project(dstPoint);return Math.hypot(x-p.x,y-p.y)<Math.max(51,height*.112);}
 // Project the opening and ramp as a single forgiving polygon.
 const corners=[];for(let xx of [1.83,4.13])for(let yy of [.04,xx>3?.45:3.54])for(let zz of [-3.02,-.45])corners.push(project(new T.Vector3(xx,yy,zz)));
 const pts=corners.sort((a,b)=>a.x-b.x||a.y-b.y);const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);let lo=[],hi=[];
 for(const p of pts){while(lo.length>=2&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
 for(const p of [...pts].reverse()){while(hi.length>=2&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}lo.pop();hi.pop();const poly=lo.concat(hi);
 return poly.every((p,i)=>{const q=poly[(i+1)%poly.length];return cross(p,q,{x,y})>=-18*p.distanceTo(q);});
}
function mechanicalAt(x,y){
 cast(x,y);const phase=s.phase;
 if(!['tie','door','bridge','window','sail'].includes(phase))return false;
 let objects=phase==='tie'?[rack]:phase==='door'?van.slats:phase==='bridge'?[riverView.gear]:phase==='window'?roomView.shutters:[roomView.boat];
 return ray.intersectObjects(objects,true).length>0||near(x,y,srcPoint,Math.max(33,height*.045));
}
function begin(e){
 if(pointer!==null||e.button>0)return;sound.start();
 const x=e.clientX,y=e.clientY;let type=null;
 if(s.held>=0){if(pointInsideDrop(x,y)){sim.release(true,(x-project(dstPoint).x)/width);return;}if(itemAt(x,y)===s.held)type='carry';else{sim.release(false);return;}}
 else if(mechanicalAt(x,y)){type='mechanism';s.idle=0;}
 else{const a=itemAt(x,y);if(a>=0&&sim.grab(a))type='carry';}
 if(!type)return;pointer=e.pointerId;gesture=type;hasMoved=false;startX=prevX=x;startY=prevY=y;canvas.setPointerCapture(pointer);
 if(type==='carry'){let o=goods[s.held];const pos=o.position.clone();pos.y+=MovingDay.heights[s.held]*.49;dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(v1),pos);cast(x,y);ray.ray.intersectPlane(dragPlane,v2);dragOffset.copy(o.position).sub(v2);dragOffset.y+=.48;}
}
function drag(e){
 if(e.pointerId!==pointer)return;let x=e.clientX,y=e.clientY,dx=x-prevX,dy=y-prevY;
 hasMoved||=Math.hypot(x-startX,y-startY)>7;s.idle=0;
 if(gesture==='carry'&&s.held>=0){cast(x,y);let p=ray.ray.intersectPlane(dragPlane,new T.Vector3());if(p){p.add(dragOffset);if(pointInsideDrop(x,y)){let goal=s.world==='room'?dstPoint:new T.Vector3(2.22,1.30,-1.68);p.lerp(goal,.71);}p.y=Math.max(.28,p.y);sim.move(p.toArray());}}
 else if(gesture==='mechanism'&&hasMoved){let f=s.phase==='door'?Math.max(Math.abs(dx)*.22,dy,0):s.phase==='window'?Math.max(Math.abs(dx),Math.abs(dy)*.4):s.phase==='sail'?Math.max(-dy,Math.abs(dx)*.25,0):Math.hypot(dx,dy);if(f>0)sim.operate(Math.min(.21,f/Math.min(238,width*.46)));}
 prevX=x;prevY=y;
}
function end(e,cancel=false){if(e.pointerId!==pointer)return;
 if(gesture==='carry'&&s.held>=0){const yes=!cancel&&pointInsideDrop(e.clientX,e.clientY);if(yes||hasMoved||cancel)sim.release(yes,Math.max(-.35,Math.min(.35,(e.clientX-project(dstPoint).x)/Math.max(90,width*.23))));}
 if(gesture==='mechanism'&&!hasMoved&&!cancel)sim.operate(s.phase==='door'?.56:.37);
 pointer=null;gesture=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',drag);canvas.addEventListener('pointerup',e=>end(e));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>end(e,true));
button.addEventListener('click',()=>{sound.toggle();button.classList.toggle('muted',!sound.on);button.setAttribute('aria-pressed',String(sound.on));});
addEventListener('resize',resize);resize();setWorld();setCamera();cargoPose();scene.updateMatrixWorld();
let previous=performance.now();
function frame(now){const dt=Math.min(.055,Math.max(0,(now-previous)/1000));previous=now;
 if(!document.hidden){sim.step(dt);while(s.events.length)sound.play(s.events.shift());sound.update(s);draw();}requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{previous=performance.now();if(document.hidden&&sound.ctx)sound.ctx.suspend().catch(()=>{});else if(sound.ctx)sound.start();});
requestAnimationFrame(frame);
})();
