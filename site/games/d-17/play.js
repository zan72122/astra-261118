'use strict';
const guide=document.getElementById('guide'),badges=[...document.querySelectorAll('#chapters i')];
const soundButton=document.getElementById('sound');
let audioContext,master,muted=false;
function unlock(){if(!audioContext){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioContext=new AC();master=audioContext.createGain();master.gain.value=muted?0:.30;master.connect(audioContext.destination)}if(audioContext.state==='suspended')audioContext.resume().catch(()=>{})}
soundButton.addEventListener('click',()=>{unlock();muted=!muted;soundButton.className=muted?'off':'on';soundButton.setAttribute('aria-pressed',String(!muted));soundButton.setAttribute('aria-label',muted?'音を出す':'音を消す');if(master)master.gain.setTargetAtTime(muted?0:.3,audioContext.currentTime,.03)});
function note(freq,amp,duration,type='sine',delay=0,pan=0,end=freq){
 if(!audioContext||muted||audioContext.state!=='running')return;
 const now=audioContext.currentTime+delay,o=audioContext.createOscillator(),en=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(28,end),now+duration);
 en.gain.setValueAtTime(.00001,now);en.gain.exponentialRampToValueAtTime(Math.max(.00002,amp),now+.008);en.gain.exponentialRampToValueAtTime(.00001,now+duration);o.connect(en);
 const p=audioContext.createStereoPanner?.();if(p){p.pan.value=pan;en.connect(p);p.connect(master)}else en.connect(master);
 o.start(now);o.stop(now+duration+.025);o.onended=()=>{o.disconnect();en.disconnect();p?.disconnect()}
}
function listen(){
 for(const e of S.events.splice(0)){
 const pan=Math.max(-.8,Math.min(.8,e.x/3.4));
 if(e.type==='mesh'||e.type==='tick'){const v=e.type==='mesh'?.28:e.strength*.081;note(1175,v,.16,'sine',0,pan);note(2570,v*.33,.064,'sine',0,pan);if(e.type==='mesh')note(590,.16,.43,'sine',.025,pan)}
 if(e.type==='bell'){for(const [f,v,d] of [[294,.32,3.8],[588,.17,2.9],[795,.085,2.4],[1220,.068,1.7],[1654,.028,1.2]])note(f,v*e.strength,d,'sine',0,.13)}
 if(e.type==='latch'||e.type==='wood'){note(326,.14,.16,'triangle',0,0,183);note(694,.05,.17,'sine',.042)}
 if(e.type==='birds'){for(let j=0;j<3;j++)note(1700+350*j,.065,.15,'sine',j*.22,.3,2700-j*200)}
 if(e.type==='water')note(840,.11,.21,'sine',0,.2,380);
 if(e.type==='finish')[392,494,587,784].forEach((f,i)=>note(f,.15,2.5,'sine',i*.26))
 }
}
// HDR scene, a low-resolution separable bloom, then the display transform.
const targetHDR=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
const bloomA=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
const bloomB=bloomA.clone(),screenScene=new T.Scene(),screenCam=new T.Camera();
const full=new T.BufferGeometry();full.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
const vert='varying vec2 uvv; void main(){uvv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}';
function post(frag,uniforms){return new T.ShaderMaterial({vertexShader:vert,fragmentShader:frag,uniforms,depthWrite:false,depthTest:false})}
const blur=post(`varying vec2 uvv; uniform sampler2D src;uniform vec2 stride;uniform float bright;
vec3 tap(vec2 uv){vec3 c=texture2D(src,uv).rgb;return c*mix(1.,smoothstep(1.10,2.35,max(max(c.r,c.g),c.b)),bright);}
void main(){vec3 c=tap(uvv)*.227027;c+=(tap(uvv+stride*1.385)+tap(uvv-stride*1.385))*.316216;c+=(tap(uvv+stride*3.231)+tap(uvv-stride*3.231))*.070270;gl_FragColor=vec4(c,1.);}`,{src:{value:null},stride:{value:new T.Vector2()},bright:{value:1}});
const compose=post(`varying vec2 uvv;uniform sampler2D base;uniform sampler2D glow;
void main(){vec3 color=texture2D(base,uvv).rgb+.115*texture2D(glow,uvv).rgb;gl_FragColor=vec4(color,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.004;
}`,{base:{value:targetHDR.texture},glow:{value:bloomB.texture}});
const quad=new T.Mesh(full,blur);quad.frustumCulled=false;screenScene.add(quad);
function render(){
 renderer.setRenderTarget(targetHDR);renderer.render(scene,camera);
 quad.material=blur;blur.uniforms.src.value=targetHDR.texture;blur.uniforms.stride.value.set(1.45/bloomA.width,0);blur.uniforms.bright.value=1;
 renderer.setRenderTarget(bloomA);renderer.render(screenScene,screenCam);
 blur.uniforms.src.value=bloomA.texture;blur.uniforms.stride.value.set(0,1.45/bloomA.height);blur.uniforms.bright.value=0;
 renderer.setRenderTarget(bloomB);renderer.render(screenScene,screenCam);
 quad.material=compose;renderer.setRenderTarget(null);renderer.render(screenScene,screenCam)
}
let W=1,H=1,aspect=1;
function resize(){
 W=window.innerWidth;H=window.innerHeight;aspect=W/H;
 const pixel=Math.min(window.devicePixelRatio||1,1.7,Math.sqrt(1900000/(W*H)));renderer.setPixelRatio(pixel);renderer.setSize(W,H,false);
 camera.aspect=aspect;targetHDR.setSize(Math.round(W*pixel),Math.round(H*pixel));bloomA.setSize(Math.ceil(W*pixel/5),Math.ceil(H*pixel/5));bloomB.setSize(bloomA.width,bloomA.height)
}
window.addEventListener('resize',resize);resize();
// Frame the full mechanism on both orientations. Portrait looks into both
// storeys, landscape brings the workbench forward into the room.
const A=V(),B=V(),C=V(),D=V(),tempObj=new T.Object3D(),local=V();
function frame(){
 const narrow=sat((1.13-aspect)/.68),dist=Math.max(10.45,6.12/(2*Math.tan(Math.PI/12)*aspect));
 const focusX=mix(-.05,-.45,narrow),focusY=mix(2.48,3.37,narrow);
 A.set(focusX+dist*mix(.135,-.085,narrow),focusY+dist*.155,dist+.05);B.set(focusX,focusY,.05);
 const lift=sat(S.lift.x),roof=sat(S.roof.x),tour=sat(S.lookout);
 const loftDist=Math.max(8.8,6.20/(2*Math.tan(Math.PI/10)*aspect));
 C.set(.88+loftDist*.11,7.65+loftDist*.09,-.5+loftDist);D.set(.85,7.64,-.60);
 A.lerp(C,lift);B.lerp(D,lift);
 const bird=S.birds[0],flying=S.stage==='flight'||S.stage==='landing';
 if(flying){const launch=sat(S.tour.u*2.8);C.set(mix(.91,bird.x-.62,launch),mix(7.63,bird.y+1.94,launch),mix(.64+1.5*narrow,bird.z+3.72,launch));D.set(mix(1.31,bird.x,launch),mix(6.69,bird.y-.23,launch),mix(-3.27,bird.z-.72,launch))}
 else {C.set(.91,7.63,.64+1.5*narrow);D.set(1.31,6.69,-3.27)}
 A.lerp(C,tour);B.lerp(D,tour);
 const roofDist=Math.max(6.78,4.8/(2*Math.tan(Math.PI/8)*aspect));
 C.set(-.04+roofDist*.05,13.62+roofDist*.29,-1.55+roofDist);D.set(-.05,12.86,-1.55);
 A.lerp(C,roof);B.lerp(D,roof);
 camera.position.copy(A);camera.lookAt(B);camera.fov=mix(mix(30,36,lift),45,Math.max(tour,roof,S.wide));
 camera.updateProjectionMatrix();camera.updateMatrixWorld();
 // Shadow frustum follows the physical floor being visited.
 key.position.set(4.8,8+lift*5.1+roof*4.5,4.4);key.target.position.set(-.2,2.35+lift*5.1+roof*4.5,-.2);
 key.target.updateMatrixWorld()
}
const awakeMat=M.glow,activePin=group();const pinRing=ring(activePin,0,0,0,.18,.013,awakeMat);
const pinDot=oval(activePin,0,.18,0,.024,.024,.024,awakeMat);
const pinLight=new T.PointLight(0xffc775,.40,1.45,2);scene.add(pinLight);
function project(v){const n=v.clone().project(camera);return {x:(n.x*.5+.5)*W,y:(.5-n.y*.5)*H,z:n.z}}
function positionOf(o){return o.getWorldPosition(V())}
function activity(){
 let p,i;
 switch(S.stage){
 case 'assemble':i=sim.next();return i<0?null:{kind:'gear',id:i,p:V(...S.gears[i].p),q:V(...sim.sockets[i]),radius:S.gears[i].teeth*.043*1.06}
 case 'wind':return {kind:'wind',p:V(.37,1.74,.86),radius:.36}
 case 'peek':return {kind:'port',p:V(portX,.23,portZ),radius:.54}
 case 'climb':return {kind:'ladder',p:V(2.38,2.89+ladder.position.y,-1.64),radius:.55}
 case 'bell':return {kind:'rope',p:positionOf(ropeGrip).add(V(0,-.28,0)),radius:.49}
 case 'window':i=S.panes[0].free?1:0;return {kind:'window',id:i,p:panes[i].localToWorld(V((i?-1:1)*(UR-.18),.83,.09)),radius:.46}
 case 'view':case 'flight':return {kind:'bird',p:positionOf(birds[0].b),radius:.53}
 case 'landing':return {kind:'stair',p:V(3.35,6.35,.13),radius:.78}
 case 'lights':return {kind:'hand',p:sunsetHand.localToWorld(V(0,.97,.06)),radius:.83}
 case 'rest':return {kind:'home',p:V(-1.66,12.95,-1.08),radius:.54}
 default:return null
 }
}
const baseKey=new T.Color(0xffdfad),lateKey=new T.Color(0xf6b087),baseSky=new T.Color(0xdce6ee),lateSky=new T.Color(0xa9b8d4);
function display(){
 S.gears.forEach((g,i)=>{
 const o=gearModels[i];o.position.fromArray(g.p);o.rotation.order='XYZ';o.rotation.set(g.tilt,0,g.angle);
 axles[i].visible=g.installed;const halo=halos[i];if(halo){halo.visible=i===sim.next();if(halo.visible)halo.rotation.z=.12*S.lamps[0].phase}
 });
 seats.forEach((seat,i)=>seat.material=sim.next()===[1,3][i]?M.glow:M.aged);
 flywheel.rotation.z=-S.gears[0].angle*1.5+.13;pendulum.rotation.z=S.pend.a;winder.rotation.z=-S.spring.angle+.27;
 floorClock.hands[0].rotation.z=-S.dial-.56;floorClock.hands[1].rotation.z=-S.dial/12-1.82;
 hatchLeaves.forEach((l,i)=>{l.position.x=portX+(i?1:-1)*(.065+.394*S.shutter.x);l.position.y=.273-.225*S.shutter.x});
 upperGear.rotation.z=S.upper.angle;
 ladder.position.y=(1-sat(S.ladder.x))*2.66;signalBell.rotation.z=S.sway.a*2+.12*S.ladder.v;
 bell.rotation.z=S.bell.a;clap.rotation.z=S.bell.clapper;
 ropeLine.scale.y=1+S.rope.x*.23;ropeLine.position.y=-.86*(1+S.rope.x*.23);ropeGrip.position.y=-1.72*(1+S.rope.x*.23);rope.rotation.z=S.sway.a+S.bell.a*.105;
 panes.forEach((p,i)=>p.rotation.y=(i?1:-1)*-S.panes[i].a);
 birds.forEach(({b,wings},i)=>{const v=S.birds[i];b.position.set(v.x,v.y,v.z);
 b.rotation.y=v.heading;
 b.rotation.z=v.vx*.065;b.rotation.x=v.vy*.075;
 wings.forEach((w,j)=>{w.rotation.z=(j?1:-1)*mix(v.wing*.92,.83,v.fold);w.rotation.y=(j?1:-1)*mix(.075,.66,v.fold)})
 });
 sunsetHand.rotation.z=S.hand.a;houseWindows.forEach((m,i)=>{const h=S.houses[i].heat;m.emissive.setRGB(1,.51,.13);m.emissiveIntensity=h*2.3});
 hemi.color.copy(baseSky).lerp(lateSky,S.dusk);key.color.copy(baseKey).lerp(lateKey,S.dusk);scene.backgroundIntensity=1-.44*S.dusk;
 bulbs.forEach((m,i)=>{if(m)m.emissiveIntensity=S.lamps[i].heat*3});glowLight.intensity=6.8*S.lamps[0].heat;
 awakeMat.emissiveIntensity=.87+.45*(.5+.5*Math.sin(S.lamps[2].phase*.3));
 S.dust.forEach((d,i)=>{tempObj.position.set(d.x,d.y+S.lift.x*4.9,d.z);tempObj.scale.setScalar(d.rad);tempObj.rotation.set(0,0,0);tempObj.updateMatrix();dustMesh.setMatrixAt(i,tempObj.matrix)});dustMesh.instanceMatrix.needsUpdate=true;
 waterCoords();frame();
 const act=activity();activePin.visible=!!act&&!['gear','bird'].includes(act.kind);
 if(act){activePin.position.copy(act.p);activePin.quaternion.copy(camera.quaternion);const sz=act.kind==='ladder'?.78:act.kind==='hand'?.82:.63;activePin.scale.setScalar(sz);
 pinDot.rotation.z=S.lamps[1].phase*.4;pinRing.rotation.z=pinDot.rotation.z;pinLight.position.copy(act.q||act.p).add(V(0,.08,.23));pinLight.visible=true}
 else pinLight.visible=false;
 badges.forEach((b,i)=>b.classList.toggle('active',i===S.chapter));
 showGuide(act);
}
function showGuide(act){
 if(!act||S.idle<4||S.drag||S.hold||S.stage==='flight'){guide.style.opacity='0';return}
 const u=(S.idle-4)%4.1,progress=sat((u-.52)/1.65),ease=progress*progress*(3-2*progress),a=project(act.p),b=act.q?project(act.q):a;
 let x=mix(a.x,b.x,ease),y=mix(a.y,b.y,ease);
 if(!act.q){const delta=Math.sin(progress*Math.PI);y+=act.kind==='rope'?delta*26:delta*5;x+=act.kind==='hand'?delta*17:0}
 guide.style.opacity=String(.82*sat(u/.28)*sat((3.24-u)/.43));guide.style.transform='translate('+Math.round(x-6)+'px,'+Math.round(y-4)+'px) rotate(-13deg)';
}
let pointer=null,down=null,selected=null;
const ray=new T.Raycaster(),dragPlane=new T.Plane(V(0,0,1),-.48);
function toPlane(x,y){ray.setFromCamera({x:x/W*2-1,y:1-y/H*2},camera);const hit=V();if(ray.ray.intersectPlane(dragPlane,hit))return hit.toArray();return null}
function near(x,y,p,r,minPx=24){const v=project(p);if(v.z>1||v.z< -1)return false;local.set(1,0,0).applyQuaternion(camera.quaternion).multiplyScalar(r).add(p);const side=project(local);const radius=Math.max(minPx,Math.hypot(side.x-v.x,side.y-v.y));return Math.hypot(x-v.x,y-v.y)<radius}
function match(act,x,y){
 if(near(x,y,act.p,act.radius))return true;
 if(act.kind==='ladder'){for(let j=0;j<12;j++)if(near(x,y,ladder.localToWorld(V(0,.36+j*.402,.04)),.41,17))return true}
 if(act.kind==='rope'){for(let j=0;j<5;j++)if(near(x,y,rope.localToWorld(V(0,-.3-j*.34,.02)),.17,17))return true}
 if(act.kind==='hand')return near(x,y,positionOf(roofDial),1.66,24);
 if(act.kind==='stair'){for(let j=0;j<10;j++)if(near(x,y,V(3.35,5.76+j*.244,.78-j*.32),.57,20))return true}
 return false
}
canvas.addEventListener('pointerdown',e=>{
 if(pointer!==null)return;e.preventDefault();unlock();const a=activity();if(!a)return;
 let kind=a.kind,id=a.id||0;const x=e.clientX,y=e.clientY;
 if(selected!==null&&a.kind==='gear'&&near(x,y,a.q,.71)){
  sim.begin('gear',selected);sim.move(a.q.toArray());sim.release();selected=null;return
 }
 if(kind==='window'){
 let hit=-1;for(let j=0;j<2;j++){if(S.panes[j].free)continue;const sign=j?-1:1;
 if(near(x,y,panes[j].localToWorld(V(sign*(UR-.18),.83,.09)),.48)||near(x,y,panes[j].localToWorld(V(sign*UR*.53,1.18,.03)),.83))hit=j}
 if(hit<0)return;id=hit
 }else if(!match(a,x,y)){
 for(const i of [1,3])if(!S.gears[i].installed&&near(x,y,V(...S.gears[i].p),.49)){S.gears[i].tiltV+=.095;return}
 return
 }
 if(!sim.begin(kind,id))return;
 pointer=e.pointerId;canvas.setPointerCapture(pointer);down={x,y,prevX:x,prevY:y,kind,id,p:a.p.clone(),started:S.time};
 if(kind==='wind')note(710,.055,.12,'triangle');
 if(kind==='gear'){selected=id;dragPlane.constant=-.65;const p=toPlane(x,y);down.offset=p?V(...p).sub(a.p):V();down.offset.z=0;sim.move([a.p.x,a.p.y+.03,.97])}
});
canvas.addEventListener('pointermove',e=>{
 if(pointer!==e.pointerId||!down)return;e.preventDefault();const x=e.clientX,y=e.clientY;
 if(down.kind==='gear'){
 const p=toPlane(x,y);if(p){p[0]-=down.offset.x;p[1]-=down.offset.y;p[2]=.65;sim.move(p)}
 }else if(down.kind==='wind'){
 const hub=project(down.p),a=Math.atan2(y-hub.y,x-hub.x),prev=Math.atan2(down.prevY-hub.y,down.prevX-hub.x);
 if(Math.hypot(x-hub.x,y-hub.y)>5)sim.move([Math.atan2(Math.sin(a-prev),Math.cos(a-prev))])
 }else if(down.kind==='rope')sim.move([.75+(y-down.y)/94]);
 else if(down.kind==='hand')sim.move([(x-down.prevX)*.013]);
 else if(down.kind==='bird')sim.move([(x-down.x)/100]);
 down.prevX=x;down.prevY=y
});
function end(e,cancel=false){
 if(pointer!==e.pointerId)return;
 if(S.drag&&down){
 if(cancel){S.drag.target=sim.rests[down.id].slice();selected=null}
 else if(near(e.clientX,e.clientY,V(...sim.sockets[down.id]),.87,32)){sim.move(sim.sockets[down.id].slice());selected=null}
 }
 sim.release();pointer=null;down=null
}
canvas.addEventListener('pointerup',e=>end(e));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>end(e,true));
let probesReady=false;
function captureRoom(){
 const gen=new T.PMREMGenerator(renderer);
 function probe(x,y,z,size){
  const capture=new T.WebGLCubeRenderTarget(size,{type:T.HalfFloatType});
  const cubeCam=new T.CubeCamera(.08,155,capture);cubeCam.position.set(x,y,z);cubeCam.updateMatrixWorld();
  cubeCam.update(renderer,scene);const baked=gen.fromCubemap(capture.texture);capture.dispose();return baked.texture
 }
 scene.environment=probe(-1.05,3.45,1.14,128);
 waterMat.envMap=probe(riverCenter(-15),-2.41,-15,64);waterMat.needsUpdate=true;
 gen.dispose();probesReady=true
}
let then=0,lastWind=0;
function animate(ms){
 requestAnimationFrame(animate);if(document.hidden){then=ms;return}
 const dt=then?Math.min(.067,(ms-then)/1000):1/60;then=ms;sim.step(dt);
 if(S.hold==='wind'&&Math.floor(S.spring.angle*4)!==lastWind)note(650,.062,.095,'triangle',0,.15,420);
 lastWind=Math.floor(S.spring.angle*4);
 display();if(!probesReady)captureRoom();listen();render()
}
requestAnimationFrame(animate);
