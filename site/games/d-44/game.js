'use strict';
(()=>{
const {T,mat,mesh,group,box,ball,cyl,ring,face,canvas,contact}=Atelier;
const game=ParcelSim.create(),audio=createRoomSound();
window.__GAME__={step:game.step,getState:game.getState};
const el=document.getElementById('world'),hint=document.getElementById('hint'),finish=document.getElementById('finish'),sound=document.getElementById('sound');
const renderer=new T.WebGLRenderer({canvas:el,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
const scene=new T.Scene();scene.background=new T.Color(0xc4dcdf);scene.environment=Atelier.environment();scene.environmentIntensity=.37;
scene.fog=new T.FogExp2(0xd5ded3,.019);
const camera=new T.PerspectiveCamera(30,1,.055,120);
const hemi=new T.HemisphereLight(0xfff5dd,0xe3c2a1,1.45);hemi.color.setHex(0xe4f0fc);scene.add(hemi);
const sun=new T.DirectionalLight(0xffe5b6,3.45);scene.add(sun,sun.target);sun.position.set(2.65,2.70,-6.55);sun.target.position.set(-.62,.08,1);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-4.4,right:4.4,top:4.3,bottom:-4.3,near:.1,far:19});
sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00022;sun.shadow.normalBias=.009;
const home=House.build(scene),cboxes=ParcelSim.parcels.map((b,i)=>Parcels.carton(scene,b,i));
const stamps=cboxes.map(b=>b.label.material);
const radio=Parcels.radio(scene),plant=Parcels.plant(scene);
const models=[...Array.from({length:3},(_,i)=>Parcels.book(scene,i)),Parcels.shoe(scene,3),Parcels.shoe(scene,4),radio.root,plant.root];
const itemShadows=models.map((_,i)=>contact(scene,0,0,0,i<3?.39:i===5?.84:.50,i<3?.44:.52,.53));
const ray=new T.Raycaster(),ndc=new T.Vector2(),A=new T.Vector3(),B=new T.Vector3();
const cities=[new T.Color(0xc4dcdf),new T.Color(0xd7ad9e)],haze=[new T.Color(0xd5ded3),new T.Color(0xd4b5a4)],sunset=[new T.Color(0xffe5b6),new T.Color(0xffbc84)];
const moods=[new T.Color(0xe4f0fc),new T.Color(0xadbcd8)];
const fleck=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xf8e6bb,.76,0,{emissive:0xffdd9b,emissiveIntensity:.26,transparent:true,opacity:.62,depthWrite:false}),78);scene.add(fleck);fleck.frustumCulled=false;
const drops=new T.InstancedMesh(new T.SphereGeometry(1,6,4),mat(0xc3dddf,.09,.38,{transparent:true,opacity:.49,depthWrite:false}),26);scene.add(drops);drops.frustumCulled=false;
const rippleMat=mat(0xb9d6cf,.18,.20,{transparent:true,opacity:.64,depthWrite:false});
const ripples=Array.from({length:14},(_,i)=>{let a=i*2.399,r=.035+.07*(i%3)/3;
 const o=ring(scene,1.99+r*Math.cos(a),.075+(i%4)*.0005,-1.78+r*Math.sin(a),1,.021,rippleMat);o.rotation.x=-Math.PI/2;return o;});
const printTex=canvas(96,160,(c)=>{c.fillStyle='#907859';c.beginPath();c.ellipse(48,54,29,43,-.14,0,7);c.fill();c.beginPath();c.ellipse(46,118,23,25,.1,0,7);c.fill();c.globalCompositeOperation='destination-out';for(let i=0;i<12;i++){c.save();c.translate(46,i*12+5);c.rotate(-.28);c.fillRect(-40,-1,80,3);c.restore();}});
const footprints=ParcelSim.steps.map(([x,z],i)=>{let o=face(scene,.225,.365,mat(0xf2debb,.94,0,{map:printTex,transparent:true,opacity:0,depthWrite:false}),x,.013,z);o.rotation.x=-Math.PI/2;o.rotation.z=i%2?-.14:.16;return o;});
const goal=group(scene),gmat=mat(0xf8e4ae,.43,.17,{emissive:0xffcb72,emissiveIntensity:.12,transparent:true,opacity:.84});
for(let i=0;i<4;i++){let g=new T.TorusGeometry(.17,.0055,8,13,Math.PI*.33);let o=mesh(goal,g,gmat);o.rotation.z=i*Math.PI/2;}
goal.rotation.x=-Math.PI/2;
const gleam=group(scene);let sh=new T.Shape();sh.moveTo(0,.045);sh.quadraticCurveTo(.004,.008,.031,0);sh.quadraticCurveTo(.006,-.006,0,-.045);sh.quadraticCurveTo(-.004,-.007,-.031,0);sh.quadraticCurveTo(-.006,.006,0,.045);
const starMat=mat(0xffedbd,.49,.1,{emissive:0xffdb86,emissiveIntensity:.73,side:T.DoubleSide});
mesh(gleam,new T.ShapeGeometry(sh),starMat);let star=mesh(gleam,new T.ShapeGeometry(sh),starMat,.041,.038,0);star.scale.setScalar(.47);
const proxy=new T.Object3D();
// Batch static architecture by surface. Moving joints stay as individually addressable objects.
function batch(root,excluded=[]){
 root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),bins=new Map();
 function visit(o){if(excluded.includes(o))return;if(o.isMesh&&!Array.isArray(o.material)&&!o.material.transparent){
  let key=o.material.uuid+o.castShadow+o.receiveShadow,a=bins.get(key)||[];a.push(o);bins.set(key,a);}else for(let child of o.children)visit(child);}
 for(let child of root.children)visit(child);
 for(let arr of bins.values()){if(arr.length<2)continue;const points=[],normals=[],uv=[],ix=[];let off=0;
  for(let o of arr){let ge=o.geometry,p=ge.attributes.position,n=ge.attributes.normal,t=ge.attributes.uv,mm=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(mm);
   for(let j=0;j<p.count;j++){A.fromBufferAttribute(p,j).applyMatrix4(mm);points.push(A.x,A.y,A.z);if(n){A.fromBufferAttribute(n,j).applyMatrix3(nm).normalize();}else A.set(0,1,0);normals.push(A.x,A.y,A.z);uv.push(t?t.getX(j):0,t?t.getY(j):0);}
   if(ge.index){for(let j=0;j<ge.index.count;j++)ix.push(off+ge.index.getX(j));}else for(let j=0;j<p.count;j++)ix.push(off+j);
   off+=p.count;o.removeFromParent();}
  let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);let o=mesh(root,g,arr[0].material);o.castShadow=arr[0].castShadow;o.receiveShadow=arr[0].receiveShadow;
 }
}
batch(home.fixed,[home.shelf,home.frame,home.matGroup,home.saucerGroup,home.shelfShade]);batch(home.shelf);batch(home.matGroup);batch(radio.root,[radio.dial]);
for(let b of cboxes){for(let lid of b.lids)batch(lid);}
const waterGeo=new T.PlaneGeometry(27,19,17,9);waterGeo.rotateX(-Math.PI/2);
const seaSurface=mesh(scene,waterGeo,home.sea,0,-.805,-13.6);seaSurface.castShadow=false;
const size=new T.Vector2(),canFloat=renderer.extensions.has('EXT_color_buffer_float'),rtOpt={type:canFloat?T.HalfFloatType:T.UnsignedByteType};
const daylightEnvironment=scene.environment;
const reflectionTarget=new T.WebGLCubeRenderTarget(128,{...rtOpt,generateMipmaps:false});
const reflectionCamera=new T.CubeCamera(.06,90,reflectionTarget);reflectionCamera.position.set(.56,1.01,-1.03);scene.add(reflectionCamera);
let probeState='';
const hdr=new T.WebGLRenderTarget(1,1,rtOpt);hdr.samples=Math.min(2,renderer.capabilities.maxSamples||0);
const bloom=new T.WebGLRenderTarget(1,1,{...rtOpt,depthBuffer:false});
const screen=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));screen.add(quad);
const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
let high=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{map:{value:hdr.texture},px:{value:new T.Vector2()}},vertexShader:vertex,
 fragmentShader:'varying vec2 vUv;uniform sampler2D map;uniform vec2 px;void main(){vec3 s=vec3(0.);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec3 c=texture2D(map,vUv+vec2(float(x),float(y))*px*3.).rgb;s+=c*smoothstep(.93,2.0,dot(c,vec3(.2126,.7152,.0722)));}gl_FragColor=vec4(s/9.,1.);}'});
const composite=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{map:{value:hdr.texture},glow:{value:bloom.texture},px:{value:new T.Vector2()}},vertexShader:vertex,fragmentShader:`
varying vec2 vUv;uniform sampler2D map,glow;uniform vec2 px;
void main(){
 vec3 c=texture2D(map,vUv).rgb;vec3 b=vec3(0.);
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)b+=texture2D(glow,vUv+vec2(float(x),float(y))*px*5.).rgb;
 c+=b*(.040/9.);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
 gl_FragColor.rgb+=grain*.004;
}`});
let W,H,portrait=false,offsets=[],shelfShift=0,potShift=0,matShift=0;
function layout(){
 W=el.clientWidth;H=el.clientHeight;let aspect=W/H;portrait=aspect<.83;camera.aspect=aspect;camera.updateProjectionMatrix();
 shelfShift=portrait?.61:0;potShift=portrait?-.71:0;matShift=portrait?.54:0;
 offsets=portrait?[[0,0],[.38,-.33],[-.45,-.10]]:[[0,0],[0,0],[0,0]];
 home.shelf.position.x=-1.73+shelfShift;home.frame.position.x=-1.63+shelfShift;home.lamp.position.x=-2.37+shelfShift;
 home.birdBase.position.x=-1.79+shelfShift;home.shelfShade.position.x=-1.73+shelfShift;home.matGroup.position.x=matShift;home.saucerGroup.position.x=potShift;
 for(let i=0;i<3;i++){let b=ParcelSim.parcels[i],o=offsets[i];cboxes[i].root.position.set(b.x+o[0],.005,b.z+o[1]);cboxes[i].shadow?.position.set(b.x+o[0],.008,b.z+o[1]);}
 footprints.forEach((o,i)=>o.position.x=ParcelSim.steps[i][0]+matShift);ripples.forEach((o,i)=>{let a=i*2.399,r=.035+.07*(i%3)/3;o.position.x=1.99+potShift+r*Math.cos(a);});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75,Math.sqrt(1800000/(W*H))));renderer.setSize(W,H,false);renderer.getDrawingBufferSize(size);hdr.setSize(size.x,size.y);bloom.setSize(Math.max(1,size.x>>3),Math.max(1,size.y>>3));high.uniforms.px.value.set(1/size.x,1/size.y);composite.uniforms.px.value.copy(high.uniforms.px.value);
}
function destinationShift(i){return i<3||i===5?shelfShift:i===6?potShift:matShift;}
function itemOffset(o,i){
 let q=offsets[o.box],f=0;
 if(o.mode==='placed'||o.mode==='walking')f=1;else if(o.mode==='placing')f=Math.min(1,o.travel/.85);
 return [q[0]*(1-f)+destinationShift(i)*f,q[1]*(1-f)];
}
function aim(s){
 let f=s.camera.x,a=camera.aspect;
 let d=portrait?Math.max(10.2,5.60/a):Math.max(6.80,8.46/a);
 A.set(portrait?.21:.32,portrait?.23:.298,1).normalize();
 B.set(portrait?.03:-.06,(portrait?.84:.90)+.087*f,.16-.17*f);
 camera.position.copy(B).addScaledVector(A,d+.88*f);if(portrait)camera.position.y=2.86+.12*f;camera.lookAt(B);camera.updateMatrixWorld();
}
function active(s){
 switch(s.phase){
 case 'tape':return {kind:'box',id:s.box,node:cboxes[s.box].tab,local:[0,.069,.055]};
 case 'flaps':return {kind:'box',id:s.box,node:cboxes[s.box].root,local:[.13,ParcelSim.parcels[s.box].h+.026,.11]};
 case 'item':return {kind:'item',id:s.index,node:models[s.index],local:[0,s.index<3?.24:.14,.02]};
 case 'song':{let i=s.played.indexOf(false);return {kind:'reed',id:i,node:models[i],local:[0,.29,.154]};}
 case 'walk':{let i=s.walk;return {kind:'foot',id:i,node:footprints[i],local:[0,0,.01]};}
 case 'tune':return {kind:'dial',id:0,node:radio.dial,local:[0,.01,.04]};
 case 'water':{let i=(s.watered*3+1)%11;return {kind:'leaf',id:i,node:plant.leaves[i],local:[.078,.024,0]};}
 case 'night':case 'lamp':return {kind:'lamp',id:0,node:home.pull,local:[0,-.176,0]};
 default:return null;
 }
}
function coords(obj){let p=new T.Vector3(...obj.local);return obj.node.localToWorld(p);}
function pixel(p){let v=p.clone().project(camera);return {x:(v.x*.5+.5)*W,y:(.5-v.y*.5)*H};}
function destination(i){let p=ParcelSim.destinations[i];return new T.Vector3(p[0]+destinationShift(i),p[1]+.008,p[2]);}
let stage=-1,cycle=-1,tracking=null;
function visual(s){
 aim(s);let e=s.evening.x;
 scene.background.copy(cities[0]).lerp(cities[1],e);scene.fog.color.copy(haze[0]).lerp(haze[1],e);
 sun.color.copy(sunset[0]).lerp(sunset[1],e);sun.intensity=3.45-1.68*e;sun.position.y=2.70-1.27*e;sun.position.x=2.65+2.15*e;hemi.color.copy(moods[0]).lerp(moods[1],e);hemi.intensity=1.45-.66*e;
 const shade=s.heat.x;home.lampShade.emissive.setHex(0xf7ac4c);home.lampShade.emissiveIntensity=.40*shade;home.bulb.material.emissiveIntensity=2.8*shade;home.lamplight.intensity=shade*1.9;
 home.chimes.forEach((p,i)=>{p.rotation.z=s.chimes[i].x;p.rotation.x=s.chimes[(i+2)%3].x*.32;});home.pull.rotation.z=s.switch.x;home.street.forEach((m,i)=>m.emissiveIntensity=2.7*s.street[i].x);
 home.door.position.x=home.doorX+s.door.x;home.ferry.position.x=s.ferry.x;home.ferry.rotation.z=s.boatRock.x;home.sailboat.rotation.z=-s.boatRock.x*.7;home.sail.rotation.y=s.sail.x;
 s.swell.forEach((o,i)=>waterGeo.attributes.position.setY(i,o.x));waterGeo.attributes.position.needsUpdate=true;waterGeo.computeVertexNormals();
 home.drapes.forEach((c,k)=>{let pos=c.o.geometry.attributes.position;for(let j=0;j<=c.rows;j++)for(let i=0;i<=c.cols;i++){let n=j*(c.cols+1)+i,v=j/c.rows,w=s.cloth[(Math.floor(i/3)+k)%13].x;
   pos.setZ(n,c.base[n*3+2]+w*v*v*(1+s.door.x*4));pos.setX(n,c.base[n*3]+s.cloth[(i+k)%13].x*v*.64);}
   pos.needsUpdate=true;c.o.geometry.computeVertexNormals();});
 s.boxes.forEach((b,i)=>{let carton=cboxes[i],p=ParcelSim.parcels[i],f=b.slide.x;
   let x=p.x+offsets[i][0],z=p.z+offsets[i][1];carton.root.position.set(x+(-2.03+shelfShift+i*.16-x)*f,.005+f*i*.049,z+(-1.48-z)*f);
   carton.shadow.position.x=carton.root.position.x;carton.shadow.position.z=carton.root.position.z;carton.shadow.material.opacity=.81-.41*f;carton.update(b);});s.items.forEach((o,i)=>{const ob=models[i],shift=itemOffset(o,i);ob.position.set(o.x+shift[0],o.y+.005,o.z+shift[1]);ob.rotation.z=o.tilt.x+(i<3?s.reed[i].x*.24:0);
   ob.rotation.y=i<3?-.05+i*.04:(i===5?.09:0);ob.visible=o.mode!=='packed'||(s.boxes[o.box].flaps[0].x>.20&&i>=s.index);
   let shadow=itemShadows[i];shadow.visible=o.mode==='placed'||o.mode==='walking';shadow.position.set(ob.position.x,o.ty+.006,ob.position.z);});
 radio.dial.rotation.z=-s.dial.x;plant.leaves.forEach((o,i)=>{o.rotation.z=-s.leaves[i].x;o.userData.surface.roughness=.52-.32*s.leaves[i].water;});home.bird.rotation.z=s.bird.x;home.wings.forEach((w,i)=>w.rotation.x=(i?1:-1)*s.bird.x*1.8);home.wheel.rotation.z=s.wheel.x;
 s.dust.forEach((p,i)=>{proxy.position.set(p.x,p.y,p.z);proxy.scale.setScalar(p.size*(.78+.32*Math.max(0,p.x)));proxy.updateMatrix();fleck.setMatrixAt(i,proxy.matrix);});fleck.instanceMatrix.needsUpdate=true;
 drops.visible=s.wet.x>.08;s.drops.forEach((p,i)=>{proxy.position.set(p.x+potShift,p.y,p.z-.02);let k=p.delay<=0?p.water*s.wet.x:0;proxy.scale.set(.0034*k,.014*k,.0034*k);proxy.updateMatrix();drops.setMatrixAt(i,proxy.matrix);});drops.instanceMatrix.needsUpdate=true;
 ripples.forEach((o,i)=>{let a=Math.abs(s.ripples[i].x);o.visible=a>.002&&s.wet.x>.1;o.scale.setScalar(.016+a*.65);});
 footprints.forEach((o,i)=>{o.visible=s.phase==='walk'||s.phase==='walking'||s.phase==='walkEnd';o.material.opacity=i<s.walk?.32:i===s.walk?.59:0;});
 if(s.stage!==stage||s.cycle!==cycle){stage=s.stage;cycle=s.cycle;cboxes.forEach((b,i)=>b.label.material=stamps[(i+cycle)%3]);document.querySelectorAll('#chapters i').forEach((o,i)=>{o.classList.toggle('current',i===stage);o.classList.toggle('done',i<stage);});}
 if(s.cycle){for(let i=0;i<3;i++)cboxes[i].root.rotation.y=ParcelSim.parcels[i].yaw+Math.sin(s.cycle*2+i)*.062;}
 let target=active(s);goal.visible=s.phase==='item'||s.phase==='walk';if(goal.visible){if(s.phase==='item'){goal.position.copy(destination(s.index));goal.scale.setScalar(s.index<3?.75:1);}
 else{goal.position.copy(footprints[s.walk].position);goal.position.y+=.003;goal.scale.set(.91,1.29,1);}}
 gleam.visible=!!target&&!tracking;if(target){let p=coords(target);gleam.position.copy(p).add(new T.Vector3(-.029,.064,.01));gleam.quaternion.copy(camera.quaternion);
 gleam.scale.setScalar(.82+Math.min(.49,Math.abs(s.wind[3].x)*2)+(s.phase==='tape'?.16:0));}
 let demo=s.idle-4;hint.style.opacity='0';if(target&&demo>=0&&!tracking){let u=(demo%3.55)/2.26,from=pixel(coords(target));if(u<1){let ease=Math.min(1,Math.max(0,(u-.16)/.69));ease=ease*ease*(3-2*ease);
 let offX=0,offY=0;if(s.phase==='tape'){offX=-17*ease;offY=-46*ease;}else if(s.phase==='item'){let to=pixel(destination(s.index));offX=(to.x-from.x)*ease;offY=(to.y-from.y)*ease-21*Math.sin(ease*Math.PI);}
 else if(s.phase==='tune'){offX=24*Math.sin(ease*2.7);offY=22*(1-Math.cos(ease*2.7));}else offY=-8*Math.sin(ease*Math.PI);
 hint.style.transform='translate('+Math.round(from.x+offX-8)+'px,'+Math.round(from.y+offY-7)+'px) rotate(-9deg)';hint.style.opacity=String(.9*Math.min(1,u*9,(1-u)*7));}}
 finish.style.opacity=String(Math.max(0,Math.min(1,s.fade.x)));
}
function draw(s){
 const lighting=[s.cycle,s.stage,s.door.x>.85,s.heat.x>.55,portrait].join('/');
 if(lighting!==probeState){
  // Capture the furnished room for the brass, glazing and wet ceramic.
  scene.environment=daylightEnvironment;
  const previous=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;
  reflectionCamera.update(renderer,scene);renderer.shadowMap.autoUpdate=previous;
  scene.environment=reflectionTarget.texture;probeState=lighting;
 }
 renderer.setRenderTarget(hdr);renderer.render(scene,camera);quad.material=high;renderer.setRenderTarget(bloom);renderer.render(screen,ortho);quad.material=composite;renderer.setRenderTarget(null);renderer.render(screen,ortho);}
function rayAt(x,y){ndc.set(x/W*2-1,1-y/H*2);ray.setFromCamera(ndc,camera);}
function hits(o){return ray.intersectObject(o,true).length>0;}
function near(x,y,t,r){const p=pixel(coords(t));return Math.hypot(x-p.x,y-p.y)<r;}
function pick(x,y,s){
 rayAt(x,y);const t=active(s);if(!t)return null;
 if(s.phase==='song'){let choices=models.slice(0,3).map((node,id)=>({kind:'reed',id,node,local:[0,.26,.13]}));choices.sort((a,b)=>{let pa=pixel(coords(a)),pb=pixel(coords(b));return Math.hypot(x-pa.x,y-pa.y)-Math.hypot(x-pb.x,y-pb.y);});for(let c of choices)if(hits(c.node)||near(x,y,c,24))return c;}
 const radius=portrait?31:35;
 if(near(x,y,t,radius))return t;
 if(t.kind==='box'){if(s.phase==='flaps'&&hits(cboxes[s.box].root))return t;if(s.phase==='tape'&&(hits(cboxes[s.box].strip)||hits(t.node)))return t;}
 else if(t.kind==='dial'&&hits(radio.root)||t.kind==='lamp'&&hits(home.lamp)||t.kind==='leaf'&&hits(plant.root)||hits(t.node))return t;
 return null;
}
el.addEventListener('pointerdown',e=>{if(tracking)return;audio.start();let s=game.read(),t=pick(e.clientX,e.clientY,s);
 if(!t){for(let i=0;i<3;i++)if(hits(cboxes[i].root)){game.nudge(i);break;}return;}
 const pos=coords(t),screen=pixel(pos);if(!game.grab(t.kind,t.id))return;
 tracking={pid:e.pointerId,kind:t.kind,id:t.id,x:e.clientX,y:e.clientY,total:0,time:e.timeStamp,cx:screen.x,cy:screen.y,z:pos.z,
 angle:Math.atan2(e.clientY-screen.y,e.clientX-screen.x),radius:Math.hypot(e.clientX-screen.x,e.clientY-screen.y)};
 el.setPointerCapture(e.pointerId);e.preventDefault();
});
el.addEventListener('pointermove',e=>{let p=tracking;if(!p||p.pid!==e.pointerId)return;let dx=e.clientX-p.x,dy=e.clientY-p.y,ds=Math.hypot(dx,dy),dt=Math.max(1/240,(e.timeStamp-p.time)/1000);
 let s=game.read();p.total+=ds;p.x=e.clientX;p.y=e.clientY;p.time=e.timeStamp;
 if(!ds)return;
 if(p.kind==='box'&&s.phase==='tape'){let scale=2*camera.position.distanceTo(cboxes[s.box].root.position)*Math.tan(Math.PI/12)/H;game.tug(ds*scale,ds*scale/dt);}
 if(p.kind==='dial'){let a=Math.atan2(p.y-p.cy,p.x-p.cx),r=Math.hypot(p.y-p.cy,p.x-p.cx),da=Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle));game.turn(p.radius>10&&r>10?da:(dx-dy)*.029);p.angle=a;p.radius=r;}
 if(p.kind==='item'&&s.phase==='item'){rayAt(p.x,p.y);let target=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),-p.z),A);if(target){let off=itemOffset(s.items[p.id],p.id);game.dragItem(A.x-off[0],A.y+.08,A.z-off[1]);}}
});
function up(e){let p=tracking;if(!p||p.pid!==e.pointerId)return;
 let x,z;if(p.kind==='item'){rayAt(p.x,p.y);let dst=ParcelSim.destinations[p.id];if(ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-dst[1]),A)){x=A.x-destinationShift(p.id);z=A.z;}}
 game.release(x,z,p.total<6&&e.type!=='pointercancel');tracking=null;if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);}
el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
sound.addEventListener('click',()=>sound.setAttribute('aria-pressed',String(audio.toggle())));
window.addEventListener('resize',layout);layout();let prev=performance.now();function frame(now){let dt=Math.min(.08,(now-prev)*.001);prev=now;
 game.step(dt);let s=game.read();visual(s);audio.update(s,game.events());draw(s);requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{prev=performance.now();});requestAnimationFrame(frame);
})();
