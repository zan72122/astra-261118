(function(){
'use strict';
const {T,V,range,texture,mat,mesh,box,rounded,ell,group,rod,tube,batch,wood,paperFront,reverse,matPrint}=Atelier;
const canvas=document.getElementById('world'),hand=document.getElementById('hand'),sim=PaperPlay.create(),sound=makeSound();
window.__GAME__={step:sim.step,getState:sim.getState};
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.065,200),PI=Math.PI,clamp=T.MathUtils.clamp,smooth=x=>(x=clamp(x,0,1),x*x*(3-2*x));
const sky=texture(512,256,(g,w,h)=>{const d=g.createLinearGradient(0,0,0,h);d.addColorStop(0,'#7eaccc');d.addColorStop(.37,'#bed9e3');d.addColorStop(.50,'#e1e9de');d.addColorStop(.58,'#b3c5a2');d.addColorStop(.69,'#a6a38a');d.addColorStop(1,'#b39b77');g.fillStyle=d;g.fillRect(0,0,w,h);});
sky.mapping=T.EquirectangularReflectionMapping;scene.background=sky;scene.environment=sky;scene.environmentIntensity=.32;scene.fog=new T.FogExp2(0xdbe4d4,.0145);
const hemi=new T.HemisphereLight(0xe4f1ff,0xe8cfac,1.72);scene.add(hemi);
const sun=new T.DirectionalLight(0xffedcc,2.45);scene.add(sun,sun.target);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=.5;sun.shadow.camera.far=72;sun.shadow.bias=-.00020;sun.shadow.normalBias=.006;
function shadow(x,y,z,r){sun.target.position.set(x,y,z);sun.position.set(x-10,y+17,z-13);const c=sun.shadow.camera;c.left=c.bottom=-r;c.right=c.top=r;c.updateProjectionMatrix();}
shadow(0,0,-1,8);
const garden=makeGarden(scene),desk=group(scene),frame=group(scene),matte=group(desk);
const topMat=mat(0xffffff,.56,{map:wood}),grainSide=mat(0xc8a07b,.72),cream=mat(0xece9d6,.55),trim=mat(0xb7c9be,.54),brass=mat(0xc7aa72,.32,{metalness:.67}),rim=mat(0x587b88,.75),blueInk=mat(0x527c90);
const top=rounded(desk,0,-.21,1.1,14.6,.20,6.25,.10,topMat,.021);
for(const z of [-1.17,.25,1.70,3.12]){box(desk,0,.0001,z,14.5,.002,.009,grainSide);}
const bead=mat(0xf6f3de,.60),glass=mat(0xb9d7d9,.085,{transparent:true,opacity:.19,metalness:.36,side:T.DoubleSide,depthWrite:false});
box(frame,0,-.31,-2.11,18,.63,.39,cream);
box(frame,0,.083,-1.99,17,.16,.53,trim);rounded(frame,0,.155,-1.91,17,.092,.54,.04,cream,.022);
box(frame,0,-.021,-1.68,17,.065,.043,bead);
const jambs=[],wallMat=mat(0xdbdaca);
for(const side of [-1,1]){const j=group(frame);jambs.push(j);
 box(j,side*3.13,3,-2.17,6.0,6.5,.40,wallMat);
 box(j,0,3.07,-2.11,.27,6.1,.36,trim);box(j,-side*.078,3.1,-1.88,.14,6.2,.16,cream);box(j,-side*.18,3.12,-1.87,.044,6.22,.18,bead);
 const sash=group(j);sash.position.set(-side*.20,.23,-2.14);sash.rotation.y=-side*1.34;
 const width=2.45;
 for(const a of [0,3.05,5.90])box(sash,-side*width/2,a,0,width,.103,.13,cream);
 for(const x of [0,-side*width])box(sash,x,2.95,0,.105,5.9,.13,cream);
 for(let i=0;i<2;i++)box(sash,-side*width/2,1.53+2.95*i,0,width-.13,2.81,.026,glass);
 for(const y of [.64,3.9])rod(j,[-side*.17,y,-1.93],[-side*.17,y+.22,-1.93],.043,.043,brass);
 batch(j);
}
const front=mat(0xffffff,.83,{map:paperFront,side:T.FrontSide}),edge=mat(0xd2d0bd,.91,{side:T.DoubleSide});
const backs=['#a7c3cf','#b6cbbb','#b0c4d2'].map(c=>mat(0xffffff,.82,{map:reverse(c),side:T.BackSide}));
const hero=group(scene);
let page,current=-1;
function changePage(i){if(page){hero.remove(page.group);page.dispose();}page=PaperModel.make(PaperPlay.designs[i],front,backs[i],edge);hero.add(page.group);current=i;}
changePage(0);
function finishedPlane(p,colors){
 const o=group(p),mats=colors.map(c=>mat(c,.76,{side:T.DoubleSide}));
 function panel(points,ma){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(a=>[a[0]+.5,a[2]/2+.5]),2));
 g.setIndex(points.length===3?[0,1,2]:[0,1,2,0,2,3]);g.computeVertexNormals();mesh(g,ma,o);}
 const nose=[0,.083,-1.04],tail=[0,.018,.80];
 for(const s of [-1,1]){const inner=[s*.105,.27,.82],tip=[s*.72,.36,.87];panel([nose,inner,tip],mats[s<0?0:1]);panel([nose,tail,inner],mats[2]);
 const stripe=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
 const a=stripe(nose,tip,.77),b=stripe(nose,tip,.81),c=stripe(nose,inner,.81),d=stripe(nose,inner,.77);
 panel([a,b,c,d].map(v=>[v[0],v[1]+.003,v[2]]),mats[3]);
 }batch(o);return o;
}
const example=finishedPlane(desk,[0x759eaf,0x98bbca,0x426e82,0xd8e4df]);
const tray=group(desk),pencils=[],pencilCols=[0x597c8d,0x88afa5,0xe6ba72,0xdc8b78];
for(let i=0;i<4;i++){
 const p=group(tray),r=.068,len=1.59+i*.052,lac=mat(pencilCols[i],.45),cedar=mat(0xe8c99c,.84),tipmat=mat(pencilCols[i],.68);
 // Hexagonal lacquer meets bare cedar on a sharpened cone.
 rod(p,[0,0,-len/2+.25],[0,0,len/2],r,r,lac,6);
 rod(p,[0,0,-len/2+.25],[0,0,-len/2+.066],r,.018,cedar,6);
 rod(p,[0,0,-len/2+.07],[0,0,-len/2],.019,.001,tipmat,7);
 for(const z of [len/2-.112,len/2-.075])rod(p,[0,0,z],[0,0,z+.012],r*1.015,r*1.015,brass,6);
 rod(p,[0,0,len/2],[0,0,len/2+.035],r*.99,r*.93,lac,6);
 p.position.set((i-1.5)*.163,.091,.055*Math.sin(i*2));p.rotation.y=-.032*(i-1.5);batch(p);pencils.push(p);
}
const eraser=group(desk),pink=mat(0xe9a89d,.92),wrapper=mat(0xf3efda,.72);
rounded(eraser,0,0,0,.72,.155,.33,.071,pink,.023);
rounded(eraser,-.043,-.002,0,.402,.17,.349,.018,wrapper,.014);
for(const x of [-.193,-.144,.096])box(eraser,x,.176,0,.016,.001,.329,blueInk);
box(eraser,-.015,.177,0,.104,.002,.05,blueInk);batch(eraser);
const clip=group(desk),clip2=group(desk);
function paperclip(p){tube(p,[[.0,.013,.13],[0,.013,-.12],[.026,.013,-.17],[.071,.013,-.159],[.079,.013,-.11],[.079,.013,.14],[.061,.013,.184],[.019,.013,.192],[-.022,.013,.155],[-.023,.013,-.09]],.012,brass);batch(p);}
paperclip(clip);paperclip(clip2);
// The blue-green drafting mat carries printed registration marks and fold pictograms.
let pad=null,padTexture=null,padMaterial=null,layoutKey='';
const guides=group(scene),guideInk=mat(0x527d8d,.73),lightInk=mat(0xffe9ae,.48,{emissive:0xe5b563,emissiveIntensity:.20});
const dots=[],guideRing=mesh(new T.TorusGeometry(.078,.014,8,32),guideInk,guides),startRing=mesh(new T.TorusGeometry(.061,.011,8,30),guideInk,guides);
guideRing.rotation.x=startRing.rotation.x=-PI/2;
for(let i=0;i<19;i++)dots.push(mesh(new T.SphereGeometry(1,8,6),guideInk,guides));
const glint=ell(guides,0,0,0,.046,.016,.046,lightInk),tipArrow=mesh(new T.ConeGeometry(.065,.14,3),guideInk,guides);
const airHint=group(scene);for(let j=0;j<5;j++){const o=ell(airHint,0,.0,-j*.23,.021,.016,.053,lightInk);o.rotation.x=.17;}
let returnShape=1,returnPage=PaperModel.make(PaperPlay.designs[1],front,backs[1],edge);scene.add(returnPage.group);
const park=group(scene),parked=[];
for(const c of [[0xe4d2ae,0xf3dfac,0xaf936d,0xf8ecd5],[0xb3c6c0,0xd3e0d1,0x8da79a,0xf7f2e0],[0xe5b9a7,0xf0d5c3,0xc29383,0xf3e7d6]])parked.push(finishedPlane(park,c));
const motes=new T.InstancedMesh(new T.IcosahedronGeometry(.009,0),mat(0xfff0cd,.7,{transparent:true,opacity:.46,emissive:0xffe9bc,emissiveIntensity:.18}),38);scene.add(motes);motes.frustumCulled=false;
const dummy=new T.Object3D(),base=V(),baseEye=V(),baseLook=V(),look=V(),eye=V(),focus=V();
let compact=false,aspect=1,scale=1,pageYaw=-.13,deskCenterZ=1.02,lastTime=0,rafId=0;
const fxScene=new T.Scene(),fxCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
const target=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:2});
const finish=new T.ShaderMaterial({uniforms:{image:{value:target.texture},px:{value:new T.Vector2(1,1)}},depthTest:false,depthWrite:false,
 vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`varying vec2 uv0;uniform sampler2D image;uniform vec2 px;
 void main(){vec3 c=texture2D(image,uv0).rgb;vec3 bloom=vec3(0.);
 for(int i=0;i<6;i++){float a=float(i)*1.0472;vec3 s=texture2D(image,uv0+vec2(cos(a),sin(a))*px*3.5).rgb;bloom+=max(s-vec3(.93),vec3(0.));}
 c+=bloom*.012;c*=1.-.075*pow(length((uv0-.5)*1.38),2.);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;gl_FragColor.rgb+=grain*.008;}`});
fxScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
function resize(){
 const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,1.7);
 aspect=w/h;compact=aspect<.82;camera.aspect=aspect;camera.updateProjectionMatrix();
 renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);target.setSize(Math.max(1,Math.round(w*dpr)),Math.max(1,Math.round(h*dpr)));finish.uniforms.px.value.set(1/target.width,1/target.height);
 const key=compact?'tall':'wide';
 if(key!==layoutKey){layoutKey=key;if(pad){pad.traverse(o=>{if(o.isMesh)o.geometry.dispose();});pad.removeFromParent();padTexture.dispose();padMaterial.dispose();}
 pad=group(matte);const pw=compact?3.54:5.56,pd=compact?4.55:3.56;padTexture=matPrint(pw/pd);padMaterial=mat(0xffffff,.79,{map:padTexture});
 rounded(pad,0,.018,0,pw,.042,pd,.082,rim,.012);rounded(pad,0,.064,0,pw-.012,.009,pd-.012,.078,padMaterial,.006);
 pad.position.set(0,0,compact?.73:1.05);pad.rotation.y=compact?-.025:.016;
 }
 deskCenterZ=compact?1.05:.99;scale=compact?.95:1;pageYaw=compact?-.14:-.155;
 base.set(compact?-.05:-.10,.095,deskCenterZ);
 const zoom=compact?Math.max(1,.48/aspect):Math.max(1,1.36/aspect);
 baseEye.set(compact?.03:.18,compact?4.72*zoom:3.67*zoom,compact?8.42*zoom:6.46*zoom);
 baseLook.set(0,compact?.15:.12,compact?.07:.04);
 const half=compact?2.05:Math.min(6.0,3.55*Math.max(.90,aspect/1.44));jambs[0].position.x=-half;jambs[1].position.x=half;
 example.position.set(compact?-.82:-1.90,.10,compact?-.78:.43);example.rotation.y=compact?-.93:-.68;example.scale.setScalar(compact?.68:.87);
 tray.position.set(compact?.91:1.83,.085,compact?-.87:.63);tray.rotation.y=compact?-.93:-.38;tray.scale.setScalar(compact?.65:1.02);
 eraser.position.set(compact?.92:1.77,.10,compact?2.57:2.08);eraser.rotation.y=compact?.42:.28;eraser.scale.setScalar(compact?.68:1);
 clip.position.set(compact?-1.32:-2.22,.10,compact?1.76:2.00);clip.rotation.y=.64;clip2.position.copy(clip.position).add(V(.14,0,.05));clip2.rotation.y=-.20;
}
resize();window.addEventListener('resize',resize);
function worldAt(p){return V(base.x+p.x*8,base.y+p.h*8,deskCenterZ-p.s*8);}
function crease(s){
 const c=page.creases[Math.min(s.hinges.length-1,s.fold)],d=s.design;
 return s.fold===s.hinges.length-1?{x:0,z:d.length*.46,X:0,Z:-d.length*.48}:c;
}
function onSheet(x,y,z){const v=V(x,y,z).multiplyScalar(scale);v.applyAxisAngle(V(0,1,0),pageYaw);return v.add(base);}
function toScreen(v){const a=v.clone().project(camera);return {x:(a.x*.5+.5)*canvas.clientWidth,y:(.5-a.y*.5)*canvas.clientHeight};}
function setGuides(s){
 guides.visible=s.phase==='fold';airHint.visible=s.phase==='ready';if(s.phase==='ready'){airHint.position.copy(base).add(V(0,.30,-1.10));airHint.rotation.x=.52;}
 if(!guides.visible)return;
 const c=crease(s),a=V(c.x,.043,c.z),b=V(c.X,.043,c.Z),dir=b.clone().sub(a),len=dir.length();dir.normalize();
 guides.position.copy(base);guides.rotation.y=pageYaw;guides.scale.setScalar(scale);
 startRing.position.copy(a);guideRing.position.copy(b);
 dots.forEach((o,i)=>{const t=(i+1)/20;o.position.copy(a).addScaledVector(dir,len*t);
 o.scale.set(.018,.006,len*.014);o.rotation.y=Math.atan2(dir.x,dir.z);o.visible=i%2===0||len>1.8;});
 const glide=s.guide%1,along=smooth(glide);glint.position.copy(a).addScaledVector(dir,len*along);glint.position.y+=.013;
 tipArrow.position.copy(a).addScaledVector(dir,len*.78);tipArrow.rotation.set(PI/2,0,-Math.atan2(dir.x,dir.z),'YXZ');
 tipArrow.quaternion.setFromUnitVectors(V(0,1,0),dir);tipArrow.scale.set(.76,.68,.76);
}
function flightCamera(pos,s){
 const flightEye=pos.clone().add(V(compact?.95:1.78,compact?2.28:1.65,compact?5.85:4.64));
 const gaze=pos.clone().add(V(0,.12,-1.15));
 if(s.stage!==0&&s.p.eddy>.0001){
   const feature=(s.stage===1?garden.gate:garden.wheels[2]).getWorldPosition(V());feature.y+=.72;
   gaze.lerp(feature,.68*s.p.eddy);
   const high=gaze.clone().add(V(compact?2.4:4.0,compact?5.0:3.0,compact?9.0:6.8));
   flightEye.lerp(high,s.p.eddy);
 }
 return {flightEye,gaze};
}
const landingAnchor=V(0,-4.42,-56);
function arrangePark(anchor){
 park.position.set(anchor.x, garden.ground+.045,anchor.z);parked.forEach((p,i)=>{p.position.set(-2.70+i*1.52,.015,-1.9-Math.abs(i-1)*.33);p.rotation.y=-.32+i*.28;p.scale.setScalar(.84);});
}
arrangePark(landingAnchor);
function present(s){
 if(current!==s.stage)changePage(s.stage);
 const next=(s.stage+1)%3;
 if(returnShape!==next){returnPage.group.removeFromParent();returnPage.dispose();returnPage=PaperModel.make(PaperPlay.designs[next],front,backs[next],edge);scene.add(returnPage.group);returnShape=next;}
 const q=s.hinges.map(h=>h.q);page.update(q,s.flex,s.hinges.map(a=>a.thickness));
 hero.position.copy(base);hero.rotation.set(0,pageYaw,0,'YXZ');hero.scale.setScalar(scale);
 const deskPhase=s.phase==='fold'||s.phase==='ready',flying=s.phase==='flight',land=s.phase==='land',returning=s.phase==='return';
 // A small dolly in the first seconds keeps the complete play surface in view.
 const push=1-.032*smooth((s.clock<3?s.clock:3)/3);
 eye.copy(baseEye).sub(baseLook).multiplyScalar(push).add(baseLook);focus.copy(baseLook);
 if(s.phase==='ready'){hero.position.y+=s.grasp.q*8;hero.rotation.x=.05+s.grasp.q*2;}
 if(!deskPhase){
 const pos=worldAt(s.p),{flightEye,gaze}=flightCamera(pos,s);
 const start=smooth(s.elapsed/1.65);
 hero.position.copy(pos);hero.rotation.set(s.p.pitch,clamp(-s.p.vx*.22,-.36,.36)+pageYaw*Math.exp(-s.p.s*4),s.p.roll,'YXZ');
 if(flying){
   eye.lerp(flightEye,start);focus.lerp(gaze,start);
   const v=s.p.release,approximate=[6.70+.36*v+.12*v*(v-1),7.11+.266*v+.125*v*(v-1),5.78+.23*v][s.stage];
   arrangePark(V(base.x+[0,-13.3,12.3][s.stage],garden.ground,deskCenterZ-approximate*8));
 }else{
   landingAnchor.set(base.x+s.p.landX*8,garden.ground,deskCenterZ-s.p.landS*8);
   const landEye=landingAnchor.clone().add(V(compact?2.5:3.6,compact?4.6:3.4,compact?7.8:6.0));
   const landLook=landingAnchor.clone().add(V(-.32,.42,-.70));
   const ease=land?smooth(s.elapsed/2.1):1;eye.copy(flightEye).lerp(landEye,ease);focus.copy(gaze).lerp(landLook,ease);
   if(returning){const a=smooth(s.returnMotion.q);
     eye.lerp(baseEye.clone().sub(baseLook).multiplyScalar(push).add(baseLook),a);eye.y+=Math.sin(a*PI)*3.4;focus.lerp(baseLook,a);
   }
 }
 }
 if(!deskPhase&&hero.position.y<garden.ground+.85){
   const vertices=page.group.children[0].geometry.attributes.position,v=V();let bottom=0;
   for(let i=0;i<vertices.count;i++)bottom=Math.min(bottom,v.fromBufferAttribute(vertices,i).applyQuaternion(hero.quaternion).y*scale);
   hero.position.y=Math.max(hero.position.y,garden.ground+.008-bottom);
 }
 if(s.phase==='fold'&&s.round>0&&s.elapsed<.85)hero.position.y+=(1-smooth(s.elapsed/.85))*.025;
 camera.position.copy(eye);camera.lookAt(focus);camera.updateMatrixWorld();setGuides(s);
 returnPage.group.visible=land||returning;
 if(land||returning){
   const g=returnPage.group,v=landingAnchor.clone().add(V(.62,s.sheet.h*8+.10,.34));
   g.position.copy(v);g.rotation.set(s.sheet.tilt+.12,.38,s.sheet.tilt*.62);g.scale.setScalar(.83);
   if(returning){const a=smooth(s.returnMotion.q);g.position.lerp(base.clone().add(V(0,.025,0)),a);g.position.y+=Math.sin(a*PI)*3.75;
     g.rotation.set((s.sheet.tilt+.12)*(1-a),.38+(pageYaw-.38)*a,s.sheet.tilt*(1-a));g.scale.setScalar(.83+(scale-.83)*a);}
   returnPage.update([0,0,0,0,0],s.flex);
 }
 garden.update(s);tray.rotation.z=s.prop.q*.21;eraser.rotation.z=s.prop.q*.08;example.rotation.z=s.wind[2].u*.015+s.prop.q*.18;
 s.dust.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(.55+i%5*.15);dummy.updateMatrix();motes.setMatrixAt(i,dummy.matrix);});motes.instanceMatrix.needsUpdate=true;
 if(deskPhase)shadow(0,0,-1,8.0);else if(returning){const a=smooth(s.returnMotion.q);shadow(landingAnchor.x*(1-a),garden.ground*(1-a),landingAnchor.z*(1-a)-a,13-5*a);}
 else shadow(hero.position.x,hero.position.y,hero.position.z-1.2,12);
 showHand(s);
}
function showHand(s){
 const active=s.idle>3.95&&!s.grip&&(s.phase==='fold'||s.phase==='ready'||s.phase==='land'||(s.phase==='flight'&&s.p.s>2.5&&s.p.s<4.9));
 if(!active){hand.style.opacity=0;return;}
 const u=(s.idle-3.95)%3.3/3.3,t=smooth((u-.12)/.64);let a,b;
 if(s.phase==='fold'){const c=crease(s);a=onSheet(c.x,.084,c.z);b=onSheet(c.X,.084,c.Z);}
 else if(s.phase==='ready'){a=onSheet(0,.23,.54);b=onSheet(0,.93,-1.3);}
 else if(s.phase==='land'){a=returnPage.group.position.clone();b=a.clone().add(V(0,.16,0));}
 else {const ob=s.stage===1?garden.gate:s.stage===2?garden.wheels[2]:hero;a=ob.getWorldPosition(V());b=a.clone().add(V(0,.19,-.08));}
 const at=toScreen(a.lerp(b,t));hand.style.transform='translate('+at.x+'px,'+at.y+'px) rotate(-13deg)';hand.style.opacity=String(.82*smooth(u/.10)*smooth((1-u)/.15));
}
const ray=new T.Raycaster(),ndc=new T.Vector2();
function aim(e){ndc.set(e.clientX/canvas.clientWidth*2-1,1-e.clientY/canvas.clientHeight*2);ray.setFromCamera(ndc,camera);}
function hits(o){return ray.intersectObject(o,true).length>0;}
function lineInfo(e,s){const c=crease(s),a=toScreen(onSheet(c.x,.043,c.z)),b=toScreen(onSheet(c.X,.043,c.Z));
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),t=((e.clientX-a.x)*dx+(e.clientY-a.y)*dy)/(length*length);
 return {t,dist:Math.hypot(e.clientX-a.x-clamp(t,0,1)*dx,e.clientY-a.y-clamp(t,0,1)*dy),length};}
let drag=null;
canvas.addEventListener('pointerdown',e=>{
 if(drag||!e.isPrimary)return;aim(e);sound.start();const s=sim.view();let type='';
 if(s.phase==='fold'){const l=lineInfo(e,s);if(l.dist<clamp(l.length*.26,23,39)){type='fold';drag={t:l.t,fold:s.fold};}}
 if(s.phase==='ready'&&hits(hero)){type='throw';drag={};}
 if(s.phase==='land'&&hits(returnPage.group)){sim.nudge('sheet');return;}
 if(s.phase==='flight'){
  if(s.stage===1&&hits(garden.gate)){sim.nudge('sluice');sound.rustle(790,.12,.22);return;}
  const wheelIndex=s.stage===2?garden.wheels.findIndex(hits):-1;
  if(wheelIndex>=0){sim.nudge('rotor',.6,wheelIndex);sound.rustle(1310,.1,.16);return;}
  if(hits(hero)){sim.nudge('plane',e.clientX<canvas.clientWidth/2?-.68:.68);sound.rustle(1500,.12,.19);return;}
 }
 if(!type){if([example,eraser,tray].some(hits))sim.nudge('prop');return;}
 drag=Object.assign(drag,{id:e.pointerId,type,x:e.clientX,y:e.clientY,time:e.timeStamp,velocity:0,travel:0});
 sim.grip(true);canvas.setPointerCapture(e.pointerId);
});
function motion(e){
 if(!drag||drag.id!==e.pointerId)return;const s=sim.view();
 const dist=Math.hypot(e.clientX-drag.x,e.clientY-drag.y),dt=Math.max(.006,(e.timeStamp-drag.time)/1000);
 if(drag.type==='fold'&&s.phase==='fold'&&s.fold===drag.fold){const l=lineInfo(e,s);
   if(l.dist<clamp(l.length*.36,30,50)){const t=clamp(l.t,0,1),f=Math.abs(t-clamp(drag.t,0,1))*1.42;
     if(f>0)sim.trace(f,e.pressure||.45);}
   drag.t=l.t;
 }
 if(dist>.15){drag.velocity=drag.velocity*Math.exp(-dt*18)+(dist/dt/Math.min(canvas.clientWidth,canvas.clientHeight))*1.95*(1-Math.exp(-dt*18));drag.travel+=dist;drag.time=e.timeStamp;}
 drag.x=e.clientX;drag.y=e.clientY;
}
canvas.addEventListener('pointermove',motion);
function release(e,cancel){
 if(!drag||drag.id!==e.pointerId)return;if(!cancel)motion(e);
 const d=drag;drag=null;sim.grip(false);
 if(d.type==='throw'&&!cancel)sim.launch(d.velocity*Math.exp(-Math.max(0,e.timeStamp-d.time)/170));
 if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerup',e=>release(e,false));canvas.addEventListener('pointercancel',e=>release(e,true));canvas.addEventListener('lostpointercapture',e=>release(e,true));
function frameLoop(now){
 const dt=lastTime?Math.min(.06,(now-lastTime)/1000):0;lastTime=now;sim.step(dt);const s=sim.view();present(s);sound.update(s);
 renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(fxScene,fxCam);rafId=requestAnimationFrame(frameLoop);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(rafId);lastTime=0;}else{lastTime=0;rafId=requestAnimationFrame(frameLoop);}});
// Capture the desk and the pond at their own locations for metals, wet wood and glass.
present(sim.view());
const probes=new T.PMREMGenerator(renderer);
const deskProbe=probes.fromScene(scene,0,.12,110,{size:64,position:V(.80,.88,-.48)});
const waterProbe=probes.fromScene(scene,0,.15,110,{size:64,position:V(-6.8,garden.ground+.72,-28)});
scene.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material)){if(m.roughness<.4){m.envMap=(desk.getObjectById(o.id)||frame.getObjectById(o.id)?deskProbe:waterProbe).texture;m.needsUpdate=true;}}});
probes.dispose();
rafId=requestAnimationFrame(frameLoop);
})();
