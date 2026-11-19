'use strict';
(()=>{
 const T=THREE,{PI,tau,group,box,cyl,tor,mat,m,mesh,batch}=Art,{clamp,smooth,roadX,roadY,sockets}=RobotWorkshop;
 const canvas=document.getElementById('game'),sim=RobotWorkshop.create(),s=sim.s;
 window.__GAME__={step:sim.step,getState:sim.getState};
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.07;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.023,79);
 scene.fog=new T.FogExp2(0x9eafbf,.049);
 function skyTexture(studio){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const p=c.getContext('2d'),gr=p.createLinearGradient(0,0,0,512);
  for(const [a,col] of [[0,'#506d91'],[.29,'#7796b7'],[.435,'#b7c5d1'],[.496,'#e5c8b1'],[.52,'#9aaabd'],[.72,'#83909a'],[1,'#515f70']])gr.addColorStop(a,col);
  p.fillStyle=gr;p.fillRect(0,0,1024,512);
  if(studio){p.fillStyle='#fef1d2';p.fillRect(80,123,144,67);p.fillStyle='#f1e7d5';p.fillRect(637,159,94,53);
   p.fillStyle='#516271';p.fillRect(281,136,251,121);p.fillStyle='#303d47';p.fillRect(604,260,310,113);
   p.fillStyle='#fbd8a4';p.fillRect(350,163,88,6);}
  const tex=new T.CanvasTexture(c);tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.SRGBColorSpace;return tex;
 }
 scene.background=skyTexture(false);const pmrem=new T.PMREMGenerator(renderer),studio=skyTexture(true),env=pmrem.fromEquirectangular(studio);
 scene.environment=env.texture;scene.environmentIntensity=.79;studio.dispose();
 const hemi=new T.HemisphereLight(0xd3e6ff,0x7b858a,1.51);scene.add(hemi);
 const sun=new T.DirectionalLight(0xffe6ce,2.51);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
 Object.assign(sun.shadow.camera,{left:-1.9,right:1.9,top:2.05,bottom:-1.75,near:.1,far:9});sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.bias=-.00031;sun.shadow.normalBias=.002;scene.add(sun,sun.target);
 const world=makeWorld(scene);
 const bot=group(scene),torso=Art.body(bot),partViews={},partList=[];
 for(const p of s.parts){let o=p.id==='head'?Art.head(scene):p.id==='left'||p.id==='right'?Art.arm(scene,p.id==='left'?-1:1):Art.feet(scene,p.id);
   partViews[p.id]=o;partList.push(o);o.userData.id=p.id;}
 const springs=world.shelves[0].gift;
 const wings=[Art.sail(bot,-1),Art.sail(bot,1)];
 const shadowC=document.createElement('canvas');shadowC.width=shadowC.height=96;const sh=shadowC.getContext('2d'),sg=sh.createRadialGradient(48,48,2,48,48,48);
 sg.addColorStop(0,'rgba(12,25,34,.57)');sg.addColorStop(.4,'rgba(18,32,40,.32)');sg.addColorStop(1,'rgba(24,38,45,0)');sh.fillStyle=sg;sh.fillRect(0,0,96,96);
 const aoTex=new T.CanvasTexture(shadowC);aoTex.colorSpace=T.SRGBColorSpace;
 function contact(parent,r){const p=mesh(parent,new T.PlaneGeometry(r*2,r*2),mat(0xffffff,0,1,{map:aoTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));p.rotation.x=-PI/2;p.castShadow=p.receiveShadow=false;return p;}
 const contacts=s.parts.map(p=>contact(scene,p.slot==='drive'?.142:.123)),botShadow=contact(scene,.26);
 // An arched amber track leads the eye from the tray to the matching socket.
 const cueMat=mat(0xffbb71,.34,.29,{emissive:0xffac54,emissiveIntensity:.86});
 function halo(r,material){
  const g=group(scene);for(let i=0;i<3;i++){const o=group(g);o.rotation.y=tau*i/3;tor(o,0,0,0,r,.0029,material,'y',1.51);}
  return batch(g);
 }
 const sourceHalos=[halo(.109,cueMat),halo(.096,cueMat),halo(.096,cueMat)],socketHalo=halo(.061,m.cyan);
 const spark=new T.PointLight(0xffad65,.018,.28,2);scene.add(spark);
 // Thin sprung whiskers on the assembler's base show that the floor is ready.
 const screen=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
 if(!renderer.extensions.has('EXT_color_buffer_float'))screen.texture.type=T.UnsignedByteType;
 screen.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);screen.samples=0;
 const finalScene=new T.Scene(),quadCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const uniforms={picture:{value:screen.texture},depthMap:{value:screen.depthTexture},pixel:{value:new T.Vector2()},focus:{value:2},nearPlane:{value:camera.near},farPlane:{value:camera.far},grainSeed:{value:0}};
 const post=new T.ShaderMaterial({uniforms,depthWrite:false,depthTest:false,
  vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`
  uniform sampler2D picture,depthMap;uniform vec2 pixel;uniform float focus,nearPlane,farPlane,grainSeed;varying vec2 uv0;
  void main(){
   float z=texture2D(depthMap,uv0).r;float d=nearPlane*farPlane/(farPlane-z*(farPlane-nearPlane));
   float coc=clamp(abs(d-focus)/max(d,.1)*5.6-.56,0.,3.25);
   vec3 col=texture2D(picture,uv0).rgb*.28;vec3 bloom=vec3(0.);
   for(int i=0;i<8;i++){float a=float(i)*.785398+0.28;vec2 v=vec2(cos(a),sin(a))*pixel;
     col+=texture2D(picture,uv0+v*coc).rgb*.09;
     bloom+=max(texture2D(picture,uv0+v*4.8).rgb-vec3(1.18),vec3(0.))*.009;
   }
   col+=bloom;vec2 q=(uv0-.5)*1.37;col*=1.-.21*dot(q,q);
   gl_FragColor=vec4(col,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   float grain=fract(sin(dot(gl_FragCoord.xy+grainSeed,vec2(12.9898,78.233)))*43758.5453)-.5;
   gl_FragColor.rgb+=grain*.009;
  }`});
 finalScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
 const rail=document.getElementById('rail'),dots=[...document.querySelectorAll('.dots i')],hint=document.getElementById('hint');
 for(const [i,name] of ['head','arm','feet','flag'].entries()){
  if(i)rail.insertAdjacentHTML('beforeend','<span class="join"></span>');
  rail.insertAdjacentHTML('beforeend','<span class="tile"><svg><use href="#'+name+'"/></svg></span>');
 }
 const tiles=[...rail.querySelectorAll('.tile')];
 const cameraAt=new T.Vector3(),eye=new T.Vector3(),look=new T.Vector3(),pos=new T.Vector3(),q=new T.Quaternion(),unit=new T.Vector3(),matrix=new T.Matrix4();
 let aspect=1,narrow=false,homeEye=new T.Vector3(),homeLook=new T.Vector3(),poseReady=false;
 function resize(){
  const w=innerWidth,h=innerHeight;aspect=w/h;narrow=aspect<.90;sim.setLayout(narrow);world.layout(narrow);
  renderer.setSize(w,h,false);screen.setSize(canvas.width,canvas.height);uniforms.pixel.value.set(1/canvas.width,1/canvas.height);
  camera.aspect=aspect;camera.updateProjectionMatrix();
  const z=narrow?Math.max(2.23,.85/(.536*aspect)) :Math.max(1.81,1.53/(.536*aspect));
  homeLook.set(0,narrow?.202:.207,narrow?.085:-.04);
  homeEye.set(narrow?.062:.185,narrow?.202+z*.319:.207+z*.169,z+homeLook.z);
  if(!poseReady||s.phase==='build'){camera.position.copy(homeEye);cameraAt.copy(homeLook);camera.lookAt(cameraAt);poseReady=true;}
 }
 function pathPose(){const origin=RobotWorkshop.robotOrigin(s);pos.set(origin.x,origin.y,origin.z);}
 function view(h,first=false){
  pathPose();const w=s.walker,build=s.phase==='build'||s.phase==='ready'||s.phase==='unpack';
  bot.position.copy(pos);bot.rotation.set(0,w.yaw,w.lean);
  torso.position.set(0,w.bodyY,0);
  torso.userData.eyes.forEach((o,i)=>{const e=s.eyes[i];o.position.set((i?1:-1)*.076+e.x,.035+e.y,.171);o.scale.y=e.aperture;});
  springs.userData.coils.forEach((coil,i)=>coil.scale.y=1-w.compression[i]/.095);
  bot.updateMatrixWorld(true);
  for(let i=0;i<s.parts.length;i++){
   const p=s.parts[i],o=partViews[p.id],attached=p.attached||p.caught,held=p.id===s.held;
   o.visible=true;
   if(p.attached){
    o.position.set(p.pos.x,w.bodyY+p.pos.y-.278,p.pos.z);bot.localToWorld(o.position);o.quaternion.copy(bot.quaternion);
    const n=p.id==='left'?1:-1;if(p.slot==='left'||p.slot==='right')o.rotateX(n*w.legAngles[0]*.69);
   }else{
    o.position.set(p.pos.x,p.pos.y,p.pos.z);
    const home=RobotWorkshop.home(p.id,narrow),dest=sockets[p.slot];
    const total=Math.hypot(home.x-dest.x,home.y-dest.y,home.z-dest.z);
    const closeness=clamp(o.position.distanceTo(unit.set(dest.x,dest.y,dest.z))/total,0,1);
    const a=closeness*(p.slot==='drive'?-1.43:p.slot==='head'?0:-1.27);
    o.rotation.set(a,closeness*(p.id==='head'?.35:p.id==='left'?-.23:p.id==='right'?.19:p.id==='wheel'?-.73:-.15),p.angle);
   }
   if(p.slot==='drive'&&o.userData.limbs){for(let j=0;j<2;j++){const limb=o.userData.limbs[j];limb.rotation.x=p.attached?w.legAngles[j]:0;if(limb.userData.w)limb.userData.w.rotation.x=p.attached?-w.wheelAngle:0;}}
   const cl=contacts[i];cl.visible=!attached;cl.position.set(p.pos.x,.0305,p.pos.z+(p.slot==='drive'?.045:0));cl.material.opacity=clamp(1-(p.pos.y-.03)*3,.1,1);
  }
  for(let i=0;i<2;i++){const wing=wings[i];wing.visible=s.wing[i]>.005;wing.position.set((i?1:-1)*.114,w.bodyY+.086,-.065);wing.rotation.z=(i?1:-1)*(1-s.wing[i])*1.55;}
  botShadow.visible=!build;botShadow.position.set(pos.x,roadY(-pos.z)+.003,pos.z);botShadow.material.opacity=Math.exp(-s.altitude*1.8);
  world.shutter.position.y=(narrow?.95:.52)+s.shutter;
  world.stand.position.y=build?0:-.18*smooth(w.distance/.20);
  world.lampGlow.intensity=1.16*s.heat[0];
  world.winLit.emissiveIntensity=s.heat[2]*.61;world.strip.emissiveIntensity=s.heat[1]*2.4;
  world.flags.forEach(({geom,orig},fi)=>{const a=geom.attributes.position;for(let i=0;i<a.count;i++){const j=i%8,dx=s.flag[j].bend*(fi?1.11:.93);a.setZ(i,orig[i*3+2]+dx);a.setY(i,orig[i*3+1]-.009*(j/7)**2+dx*.12);}a.needsUpdate=true;geom.computeVertexNormals();});
  world.waterMeshes.forEach(({g,orig},j)=>{const a=g.attributes.position;for(let i=0;i<a.count;i++){const row=Math.floor(i/6),col=i%6,k=j?23-row:row;
    a.setY(i,orig[3*i+1]+s.water[(k+Math.floor(col/2))%24].h*(j?1.6:1));}a.needsUpdate=true;g.computeVertexNormals();});
  for(let i=0;i<s.dust.length;i++){const d=s.dust[i];world.dustMesh.setMatrixAt(i,matrix.makeTranslation(d.x,d.y,d.z));}world.dustMesh.instanceMatrix.needsUpdate=true;
  world.ferry.position.set(roadX(11.9+s.boat),roadY(12)+.048+s.water[Math.min(23,Math.floor(s.boat*5))].h,-11.9-s.boat);world.ferry.rotation.z=s.water[Math.min(23,Math.floor(s.boat*5)+2)].h*2.6;
  world.paddles.forEach((p,i)=>{p.position.copy(world.ferry.position);p.position.x+=(i?1:-1)*.348;p.rotation.x=s.paddles[i].angle;});
  world.valve.rotation.z=-s.gate*PI*1.6-s.touchForce*.38;world.gate.position.y=roadY(12)+.14-s.gate*.27;
  for(let i=0;i<2;i++){
   const a=world.shelves[i],r=s.rewards[i].carry;
   a.drawer.position.z=a.baseZ-.076+(i?s.sailShelf:s.shelf)*.182;
   const socket=i?new T.Vector3(0,w.bodyY+.05,-.121):new T.Vector3(0,w.bodyY-.14-w.legLength+.012,-.005);
   if(s.phase==='unpack')socket.y-=.29*smooth(s.phaseAge/1.23);
   bot.localToWorld(socket);
   if(s.rewards[i].returning)socket.set(0,-.23,0);
   a.gift.position.copy(a.drawer.position).lerp(socket,r);
   a.gift.position.y+=Math.sin(PI*r)*(s.rewards[i].returning?-1.35:.135);a.gift.quaternion.identity().slerp(bot.quaternion,r);
   if(!i)a.gift.scale.set(1-.17*r,1-.35*r,1-.18*r);
  }
  if(build){eye.copy(homeEye);look.copy(homeLook);}
  else{
   const f=s.phase,d=-pos.z,collect=['plaza','equip','dock','summit','rig'].includes(f),flight=f==='glide';
   const subject=pos.clone().add(new T.Vector3(collect?(narrow?.215:.105):0,.217,collect?-.045:-.11));
   const mult=narrow?1.57:1;
   eye.set(subject.x+(collect?.86:.74)*mult,subject.y+(flight?.55:.34)*mult,subject.z+(collect?1.24:1.19)*mult);look.copy(subject);
   if(f==='ferry'){eye.x+=.35;eye.y+=.19;}
   if(flight){eye.x+=.42;eye.z-=.28;eye.y+=.11;}
   if(narrow){
    eye.set(subject.x+(collect?.21:.24),subject.y+(collect?.65:.49),subject.z+(collect?3.52:2.18));look.copy(subject);
    if(f==='ferry'){eye.z+=.6;look.x+=.065;}
    if(flight){eye.y+=.15;eye.z+=.32;}
   }
   if(!collect&&d<4.4){const keep=smooth((d-2.8)/1.6);eye.x=subject.x-.13+(eye.x-subject.x+.13)*keep;}
   if(d<1.65){const mix=smooth(d/1.65);eye.lerpVectors(homeEye,eye,mix);look.lerpVectors(homeLook,look,mix);}
  }
  const camRate=first?1:1-Math.exp(-h*(s.phase==='unpack'?3:2.9));camera.position.lerp(eye,camRate);cameraAt.lerp(look,camRate);camera.lookAt(cameraAt);camera.updateMatrixWorld();
  sun.position.set(pos.x-2.85,pos.y+4.2,pos.z-2.15);sun.target.position.set(pos.x,pos.y,pos.z);sun.target.updateMatrixWorld();
  uniforms.focus.value=camera.position.distanceTo(unit.copy(pos).add(new T.Vector3(0,w.bodyY,0)));uniforms.grainSeed.value=s.wind*23;
  guide();
 }
 function actionPoint(){
  if(s.phase==='ready')return new T.Vector3(0,.048,.197);
  if(s.phase==='plaza'||s.phase==='summit'){const a=world.shelves[s.phase==='plaza'?0:1];return a.drawer.position.clone().add(new T.Vector3(0,.068,.042));}
  if(s.phase==='dock')return world.valve.position.clone();
  if(s.phase==='ferry')return world.ferry.position.clone().add(new T.Vector3(.34,.005,0));
  return bot.localToWorld(new T.Vector3(0,s.walker.bodyY+.04,0));
 }
 const phaseTarget=()=>({ready:'floor',plaza:'spring',dock:'valve',summit:'sail',ferry:'paddle',glide:'pet',street:'pet',hill:'pet'}[s.phase]);
 function toPixel(w){const a=w.clone().project(camera);return {x:(a.x+1)*innerWidth/2,y:(1-a.y)*innerHeight/2,depth:a.z};}
 function guide(){
  const active=sim.activeIds(),indices=s.parts.filter(p=>active.includes(p.id));const assembly=s.phase==='build';
  let start=null,end=null;
  for(let i=0;i<3;i++){const o=sourceHalos[i],p=indices[i];o.visible=!!p&&(!s.held||s.held===p.id);
   if(o.visible){const home=RobotWorkshop.home(p.id,narrow);o.position.set(home.x,.032,home.z+(p.slot==='drive'?.057:p.slot==='head'?0:.045));o.scale.setScalar(p.slot==='drive'?1.08:p.id==='head'?1.05:.68);o.rotation.y=p.angle*3;}}
  socketHalo.visible=assembly&&indices.length>0;
  if(socketHalo.visible){const sel=indices.find(x=>x.id===s.held)||indices[0],a=sockets[sel.slot];
   socketHalo.position.set(a.x,a.y+.004,a.z);socketHalo.rotation.set(0,0,sel.slot==='left'?PI/2:sel.slot==='right'?-PI/2:0);socketHalo.scale.setScalar(sel.slot==='drive'?1.22:1);
   start=partViews[sel.id].position.clone().add(new T.Vector3(0,.036,.010));end=socketHalo.position.clone();
  }else if(['ready','plaza','dock','summit'].includes(s.phase)){const ap=actionPoint();sourceHalos[0].visible=true;sourceHalos[0].scale.setScalar(s.phase==='ready'?1.2:.85);
   sourceHalos[0].position.copy(ap);sourceHalos[0].position.y-=s.phase==='ready'?0:.053;start=ap.clone().add(new T.Vector3(-.07,.10,.015));end=ap;}
  if(!end&&['street','hill','ferry','glide'].includes(s.phase)&&s.idle<8.4){end=actionPoint();start=end.clone().add(new T.Vector3(-.05,.09,.03));}
  spark.visible=!!end;if(end)spark.position.copy(end);
  if(start&&end&&!s.held&&s.idle>=4){
   const cycle=(s.idle-4)%5.15,t=clamp((cycle-.60)/1.70,0,1),p=start.lerp(end,smooth(t));p.y+=Math.sin(t*PI)*.033;
   const here=toPixel(p);hint.style.transform='translate('+Math.round(here.x-12)+'px,'+Math.round(here.y-4)+'px) rotate(-15deg)';
   hint.style.opacity=String(.81*smooth(cycle/.4)*(1-smooth((cycle-2.6)/.65)));
  }else hint.style.opacity='0';
  const slot=s.phase!=='build'?3:!s.parts[0].attached?0:!s.parts[1].attached||!s.parts[2].attached?1:2;
  tiles.forEach((t,i)=>{t.className='tile'+(i===slot?' active':i<slot?' done':'');});
  dots.forEach((d,i)=>{d.className=i===s.chapter?'on':'';});
 }
 // Synthesis uses the current material and the last contact, including a short release tail.
 let ac=null,bus=null,audioEnabled=true;
 function audioOn(){if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A();bus=ac.createGain();bus.gain.value=audioEnabled?.23:0;bus.connect(ac.destination);}if(ac.state==='suspended')ac.resume().catch(()=>{});}
 function note(f,d,type='sine',a=.32,delay=0,end=f){if(!ac||!audioEnabled)return;
  const o=ac.createOscillator(),g=ac.createGain(),now=ac.currentTime+delay;o.type=type;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+d);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(a,now+.014);g.gain.exponentialRampToValueAtTime(.0001,now+d);o.connect(g);g.connect(bus);o.start(now);o.stop(now+d+.02);o.onended=()=>{g.disconnect();o.disconnect();};}
 function sounds(){
  for(const ev of s.events.splice(0)){
   if(ev==='pick')note(468,.12,'sine',.19,0,539);
   if(ev==='magnet'){note(440,.15,'sine',.28,0,660);note(880,.31,'sine',.14,.075);}
   if(ev==='click')note(181,.12,'triangle',.19,0,98);
   if(ev==='step')note(123,.065,'triangle',.11,0,62);
   if(ev==='roll')note(111,.09,'sine',.052,0,70);
   if(ev==='splash'){note(833,.17,'sine',.14,0,191);note(1280,.11,'sine',.10,.06,452);}
   if(ev==='coo'){note(493,.22,'sine',.2,0,680);note(740,.22,'sine',.12,.16,660);}
   if(['ready','plaza','dock','summit','unpack'].includes(ev)){[440,554.37,659.25,880].forEach((f,i)=>note(f,.52,'sine',.16,i*.14));}
   if(['street','spring','ferry','glide'].includes(ev)){note(330,.33,'triangle',.13);note(494,.46,'sine',.20,.17);}
  }
 }
 const soundButton=document.getElementById('sound');soundButton.addEventListener('click',()=>{audioOn();audioEnabled=!audioEnabled;soundButton.classList.toggle('off',!audioEnabled);soundButton.setAttribute('aria-pressed',String(audioEnabled));if(bus)bus.gain.setTargetAtTime(audioEnabled?.23:0,ac.currentTime,.025);if(audioEnabled)note(660,.18);});
 const ray=new T.Raycaster();let press=null;
 function pick(e){
  const pt=new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pt,camera);
  if(s.phase==='build'){
   const hits=ray.intersectObjects(partList,true);
   if(hits.length){let o=hits[0].object;while(o&&!o.userData.id)o=o.parent;if(o)return o.userData.id;}
   let near=null,best=Infinity;
   for(const p of s.parts){if(!sim.available(p))continue;const a=toPixel(partViews[p.id].position.clone().add(new T.Vector3(0,.032,.023)));
    const d=Math.hypot(e.clientX-a.x,e.clientY-a.y);if(d<Math.max(25,Math.min(40,innerWidth*.037))&&d<best){near=p.id;best=d;}}return near;
  }
  const id=phaseTarget();if(!id)return null;
  if(id==='floor'){
   const ground=new T.Plane(new T.Vector3(0,1,0),-.046),hit=new T.Vector3();if(ray.ray.intersectPlane(ground,hit)&&Math.hypot(hit.x,hit.z)<.308&&hit.z>-.21)return id;
  }
  if((s.phase==='street'||s.phase==='hill'||s.phase==='glide')&&ray.intersectObject(torso,true).length)return id;
  const a=actionPoint(),px=toPixel(a),edge=toPixel(a.clone().add(new T.Vector3(.135,0,0)));
  if(Math.hypot(e.clientX-px.x,e.clientY-px.y)<Math.max(30,Math.hypot(px.x-edge.x,px.y-edge.y)))return id;
  return null;
 }
 function updateAim(e){
  if(!press||!s.held)return;
  const p=s.parts.find(v=>v.id===s.held),target=sockets[p.slot],to=toPixel(new T.Vector3(target.x,target.y,target.z));
  const from=press.anchor,ratio=clamp(Math.hypot(e.clientX-press.x,e.clientY-press.y)/Math.max(1,Math.hypot(to.x-press.x,to.y-press.y)),0,1);
  const x=e.clientX+(from.x-press.x)*(1-ratio),y=e.clientY+(from.y-press.y)*(1-ratio);
  const remain=Math.hypot(x-to.x,y-to.y)/Math.max(1,Math.hypot(from.x-to.x,from.y-to.y));const depth=to.depth+(from.depth-to.depth)*clamp(remain,0,1);
  const p3=new T.Vector3(x/innerWidth*2-1,1-y/innerHeight*2,depth).unproject(camera);
  sim.aim(p3);
 }
 canvas.addEventListener('pointerdown',e=>{
  if(press||!e.isPrimary)return;audioOn();const id=pick(e);if(!id)return;
  if(s.phase==='build'){if(!sim.grab(id))return;press={pointer:e.pointerId,id,x:e.clientX,y:e.clientY,anchor:toPixel(partViews[id].position),moved:false};}
  else press={pointer:e.pointerId,id,x:e.clientX,y:e.clientY,moved:false};
  canvas.setPointerCapture(e.pointerId);e.preventDefault();
 });
 canvas.addEventListener('pointermove',e=>{if(!press||e.pointerId!==press.pointer)return;if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>5)press.moved=true;if(press.moved)updateAim(e);});
 function up(e,cancel){
  if(!press||e.pointerId!==press.pointer)return;
  if(s.phase==='build'&&s.held){const p=s.parts.find(a=>a.id===s.held),target=sockets[p.slot];
   if(!cancel&&!press.moved){sim.aim(target);}
   else if(!cancel&&s.aim&&Math.hypot(s.aim.x-target.x,s.aim.y-target.y,s.aim.z-target.z)<=.05){sim.aim(target);}
   else sim.release();
  }else if(!cancel&&!press.moved&&pick(e)===press.id)sim.action(press.id);
  press=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 }
 canvas.addEventListener('pointerup',e=>up(e,false));canvas.addEventListener('pointercancel',e=>up(e,true));canvas.addEventListener('lostpointercapture',e=>{if(press&&press.pointer===e.pointerId){sim.release();press=null;}});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 addEventListener('resize',resize);resize();view(0,true);
 // Capture the actual workbench, street and lamps in the polished metal and glass.
 const probeTarget=new T.WebGLCubeRenderTarget(96,{type:screen.texture.type});
 const probe=new T.CubeCamera(.055,40,probeTarget);probe.position.set(.04,.42,.09);
 bot.visible=false;partList.forEach(o=>o.visible=false);sourceHalos.forEach(o=>o.visible=false);socketHalo.visible=false;
 probe.update(renderer,scene);const reflection=pmrem.fromCubemap(probeTarget.texture);
 scene.environment=reflection.texture;scene.environmentIntensity=.54;probeTarget.dispose();env.dispose();pmrem.dispose();bot.visible=true;
 view(0,true);
 let last=performance.now();
 document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden&&press){sim.release();press=null;}});
 function frame(now){
  const dt=Math.min(.075,Math.max(0,(now-last)/1000));last=now;
  if(!document.hidden){sim.step(dt);view(dt);sounds();renderer.setRenderTarget(screen);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(finalScene,quadCam);}
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})();
