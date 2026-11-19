'use strict';
(() => {
  const sim=F.create(),s=sim.state;
  window.__GAME__={step:dt=>sim.step(dt),getState:()=>sim.getState()};
  const canvas=document.querySelector('canvas'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.09,210);
  const day=new T.Color('#d3e7e5'),dusk=new T.Color('#e9c6af');
  scene.background=day.clone();scene.fog=new T.FogExp2(day,.011);
  const hemi=new T.HemisphereLight(0xe7f5ff,0xbac0a8,1.68),key=new T.DirectionalLight(0xffedcf,2.94);
  scene.add(hemi,key,key.target);key.castShadow=true;
  const sh=key.shadow;sh.mapSize.set(2048,2048);Object.assign(sh.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:64});
  sh.camera.updateProjectionMatrix();sh.normalBias=.013;sh.bias=-.00022;sh.radius=2.5;
  const factory=factoryWorld(scene),course=courseWorld(scene);
  const carPool=new Map(),stock=[];
  function carFor(id,kind){
    if(carPool.has(id))return carPool.get(id);
    const old=stock.findIndex(o=>o.kind===kind),v=old>=0?stock.splice(old,1)[0]:buildCar(scene,kind);
    v.kind=kind;v.root.visible=true;v.root.scale.setScalar(1);v.shell.rotation.set(0,0,0);
    carPool.set(id,v);return v;
  }
  const v0=carFor(s.car.id,s.car.shape);updateCoat(v0.coat,s.car.cells);
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=64;
  const ctx=contactCanvas.getContext('2d'),grad=ctx.createRadialGradient(32,32,0,32,32,32);
  grad.addColorStop(0,'rgba(13,37,31,0.72)');grad.addColorStop(.43,'rgba(17,36,32,0.45)');grad.addColorStop(1,'rgba(23,39,33,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
  const aoMap=new T.CanvasTexture(contactCanvas),aoMat=mat('#48594f',1,0,{map:aoMap,transparent:true,opacity:.6,depthWrite:false});
  function shadowPatch(parent,x,y,z,w,h){
    const o=mesh(parent,geo('aoPlane',()=>new T.PlaneGeometry()),aoMat,x,y,z);
    o.rotation.x=-Math.PI/2;o.scale.set(w,h,1);o.castShadow=false;return o;
  }
  const ao=shadowPatch(scene,0,1.173,0,3.48,1.82);
  shadowPatch(factory.shop,.96,.021,2.2,3.8,1.61);shadowPatch(factory.shop,-1.55,.018,0,9.2,2.3);
  const markerColor=mat('#fff1ce',.22,.36,{emissive:0xffce8c,emissiveIntensity:.14});
  const halos=factory.canPos.map(p=>{
    const o=ring(factory.shop,p.x,.994,p.z,.337,.012,markerColor);
    o.rotation.x=Math.PI/2;return o;
  });
  function particles(max,material,geometry){
    const m=new T.InstancedMesh(geometry,finishMaterial(material),max);m.count=0;m.frustumCulled=false;scene.add(m);return m;
  }
  const orb=new T.IcosahedronGeometry(1,1);
  const dust=particles(40,mat('#fff9de',.87,.03,{transparent:true,opacity:.43,depthWrite:false}),orb),
    drops=particles(192,mat('#ffffff',.16,.27),orb),splashes=particles(220,mat('#b1dbd9',.12,.22),orb);
  const dummy=new T.Object3D(),sprayColors=palette.map(c=>new T.Color(c));
  function drawParticles(obj,arr,type){
    obj.count=Math.min(obj.instanceMatrix.count,arr.length);
    for(let i=0;i<obj.count;i++){
      const a=arr[i],size=a.size*(type==='spray'?(.6+.48*a.age/a.life):1);
      dummy.position.set(a.x,a.y,a.z);dummy.rotation.z=type==='splash'?Math.atan2(-a.vx,Math.max(.1,a.vy)):0;
      dummy.scale.set(size,size*(type==='splash'?1.6:type==='spray'?1.45:1),size);dummy.updateMatrix();obj.setMatrixAt(i,dummy.matrix);
      if(type==='spray')obj.setColorAt(i,sprayColors[a.k]);
    }obj.instanceMatrix.needsUpdate=true;if(obj.instanceColor)obj.instanceColor.needsUpdate=true;
  }
  // Render the actual surroundings into a low-resolution reflection probe in each setting.
  let probe,probeArea='';
  const pm=new T.PMREMGenerator(renderer);
  function reflection(area){
    if(probeArea===area)return;
    const prev=probe;scene.environment=null;
    const pos=area==='shop'?V(0,2.6,.34):V(1,2.8,-20);
    probe=pm.fromScene(scene,.035,.12,155,{size:64,position:pos});
    scene.environment=probe.texture;scene.environmentIntensity=.69;
    if(prev)prev.dispose();probeArea=area;
  }
  // Quarter-resolution highlight blur, restrained vignette and fixed fine grain.
  const rt=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:0,depthBuffer:true});
  const glow=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
  const post=new T.Scene(),flat=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const vert='varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}';
  const bright=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{src:{value:rt.texture},px:{value:new T.Vector2()}},vertexShader:vert,
    fragmentShader:'varying vec2 vUv; uniform sampler2D src; uniform vec2 px; void main(){vec3 c=vec3(0.); for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){vec3 p=texture2D(src,vUv+vec2(float(x),float(y))*px*2.6).rgb; c+=max(p-vec3(1.12),vec3(0.));}}gl_FragColor=vec4(c*.04,1.);}'});
  const composite=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{src:{value:rt.texture},bloom:{value:glow.texture}},vertexShader:vert,
    fragmentShader:`varying vec2 vUv;uniform sampler2D src;uniform sampler2D bloom;
    void main(){vec3 rgb=texture2D(src,vUv).rgb+texture2D(bloom,vUv).rgb*.078;
    vec2 q=(vUv-.5)*1.6;rgb*=1.-.083*dot(q,q);
    gl_FragColor=vec4(rgb,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.007;
    }`});
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),bright);post.add(quad);
  // A single running air source, short resonant metal contacts, motor and water.
  let sound=null;
  function unlockSound(){
    if(sound){if(sound.ac.state==='suspended')sound.ac.resume().catch(()=>{});return;}
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    const ac=new Audio(),master=ac.createGain();master.gain.value=.19;master.connect(ac.destination);
    const buffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),data=buffer.getChannelData(0);
    let smooth=0;for(let i=0;i<data.length;i++){smooth=.65*smooth+.35*(rnd()*2-1);data[i]=smooth;}
    const noise=ac.createBufferSource(),filter=ac.createBiquadFilter(),airGain=ac.createGain();
    noise.buffer=buffer;noise.loop=true;filter.type='bandpass';filter.frequency.value=3300;filter.Q.value=.62;
    airGain.gain.value=0;noise.connect(filter).connect(airGain).connect(master);noise.start();
    const motor=ac.createOscillator(),motorGain=ac.createGain();motor.type='sine';motor.frequency.value=65;motorGain.gain.value=.008;motor.connect(motorGain).connect(master);motor.start();
    sound={ac,master,airGain,motor,motorGain,events:{...s.sound}};ac.resume().catch(()=>{});
  }
  function note(hz,length,strength,delay=0,endHz=hz){
    if(!sound)return;const {ac,master}=sound,t=ac.currentTime+delay;
    const osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(endHz,t+length);
    gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(strength,t+.017);gain.gain.exponentialRampToValueAtTime(.001,t+length);
    osc.connect(gain).connect(master);osc.start(t);osc.stop(t+length+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  function audioFrame() {
    if(!sound)return;const t=sound.ac.currentTime,c=s.car;
    sound.airGain.gain.setTargetAtTime(s.held?.42:0,t,s.held?.045:.027);
    sound.motor.frequency.setTargetAtTime(64+c.speed*22+(s.phase==='assembly'?Math.abs(s.arm.joint[0].v)*12:0),t,.1);
    sound.motorGain.gain.setTargetAtTime(.009+c.speed*.011+(s.phase==='assembly'?.018:0),t,.12);
    for(const key of Object.keys(s.sound))if(sound.events[key]!==s.sound[key]){
      sound.events[key]=s.sound[key];if(key==='clack'){note(590,.12,.13);note(914,.16,.045,.016);}
      if(key==='jump')note(420,.4,.1,0,710);
      if(key==='splash')for(let i=0;i<5;i++)note(420+rnd()*520,.13,.08,i*.035,160);
      if(key==='finish')for(const [i,h] of [523,659,784].entries())note(h,.36,.12,i*.13);
    }
  }
  const camV=V(),look=V(),lookV=V(),camGoal=V(),lookGoal=V(),bodyPos=V();
  let area='',cut=true,lastAspect=0;
  const isDepot=()=>['load','depart','park'].includes(s.phase);
  const isOutside=()=>isDepot()||(['drive','gate'].includes(s.phase)&&s.car.distance>7.8);
  function updateCar(){
    const c=s.car,v=carFor(c.id,c.shape),driving=s.phase==='drive'||s.phase==='gate';
    const parked=s.phase==='park';
    v.root.visible=!['load','depart'].includes(s.phase);
    const q=F.point(c.distance);
    if(driving){v.root.position.set(q.x,c.height,q.z);v.root.rotation.y=q.yaw;}
    else if(parked){v.root.position.set(c.parkX.p,.075,c.parkZ.p);v.root.rotation.y=c.parkYaw.p;}
    else{v.root.position.set(c.x,1.18,0);v.root.rotation.y=0;}
    bodyPos.copy(v.root.position);
    v.shell.rotation.z=c.pitch.p;v.shell.rotation.x=c.roll.p;
    v.shell.position.y=c.axles.reduce((sum,a)=>sum+a.p,0)/4;
    for(let i=0;i<4;i++){
      v.wheels[i].visible=!!c.wheels[i];v.wheels[i].rotation.z=-c.spin;
      v.wheels[i].position.y=.35+c.axles[i].p*.36;
    }
    updateCoat(v.coat,c.cells);
    ao.visible=v.root.visible;ao.position.copy(bodyPos);ao.position.y=driving?F.roadY(c.distance,s.ramp.p)+.021:parked?.099:1.17;
    ao.rotation.z=v.root.rotation.y;
    for(const p of s.garage){
      const stored=carFor(p.id,p.shape);stored.root.visible=true;stored.root.position.set(p.x.p-s.truck.p,p.y.p,p.z.p);
      stored.shell.rotation.set(0,0,0);stored.root.rotation.y=p.yaw.p;stored.shell.position.y=0;
      for(const w of stored.wheels){w.visible=true;w.rotation.z=-p.spin;}
      if(!stored.dry){updateCoat(stored.coat,p.cells);stored.dry=true;}
    }
    for(const [id,v] of carPool)if(id!==c.id&&!s.garage.some(p=>p.id===id)){
      v.root.visible=false;v.dry=false;stock.push(v);carPool.delete(id);
    }
  }
  function poseFactory(){
    factory.pendants.forEach((o,i)=>o.rotation.z=s.pendants[i].p);
    factory.door.position.y=s.door.p;factory.slats.position.x=s.belt%.135;
    factory.skid.position.x=s.car.x;factory.skid.visible=['paint','feed','assembly'].includes(s.phase);
    for(let k=0;k<3;k++){
      const can=factory.cans[k],f=Math.max(0,Math.min(1,s.cans[k].p)),tip=F.nozzle(s,k);
      const dx=s.car.x+s.aimX.p-tip.x,dz=s.aimZ.p-tip.z,dy=(Math.abs(s.aimX.p)<.54?2.32:1.99)-tip.y;
      can.rotation.set(f*Math.atan2(dy,Math.hypot(dx,dz)),f*Math.atan2(-dx,-dz),.071*f+.038*s.cans[k].v,'YXZ');
      factory.caps[k].position.y=-.032*s.triggers[k].p;
      const origin=V(0,1.123+factory.caps[k].position.y,-.102).applyQuaternion(can.quaternion);
      can.position.set(tip.x-origin.x,tip.y-origin.y,tip.z-origin.z);
      halos[k].visible=s.phase==='paint';halos[k].material.emissiveIntensity=.2+.3*s.hint.p;
    }
    const a=s.arm,p0=V(-2.78,1.09,-1.68),hand=V(...a.joint.map(q=>q.p)),dir=hand.clone().sub(p0);
    // Carriage slides along the gantry; the elbow folds above the tool.
    const slide=Math.max(0,hand.x+1.49);p0.x+=slide*.85;factory.robot.position.x=p0.x;
    dir.copy(hand).sub(p0);const mid=p0.clone().lerp(hand,.47);
    mid.y+=.77+.19/(1+dir.length());mid.x-=.12;mid.z-=.11;
    const positions=[p0,mid,hand];
    for(let i=0;i<2;i++){
      const A=positions[i],B=positions[i+1],d=B.clone().sub(A),o=factory.links[i];o.position.copy(A);o.scale.y=d.length();o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());
    }
    positions.forEach((v,i)=>factory.pivots[i].position.copy(v));
    factory.supplyWheels.forEach((w,i)=>w.visible=i>=a.wheel+(a.carry?1:0));
    factory.tool.position.copy(hand);factory.tool.position.y+=.245;
    factory.jaws.forEach((j,i)=>j.position.z=(i?1:-1)*(.193-.066*a.grip.p));factory.carried.visible=s.arm.carry;
    factory.carried.position.copy(hand);
  }
  function poseCourse(){
    const b=s.batch;
    course.baseRoad.visible=b===0;course.bridgeGroup.visible=course.brook.g.visible=b>0;course.ford.g.visible=b>1;
    for(const p of course.bridgeParts)p.rotation.z=s.bridge.p*.93;
    for(const {o,distances,dy} of course.rampGeo){const pos=o.geometry.attributes.position;
      for(let i=0;i<pos.count;i++)pos.setY(i,F.roadY(distances[i],s.ramp.p)+dy);
      pos.needsUpdate=true;o.geometry.computeVertexNormals();}
    course.sluice.position.y=.1+.65*s.sluice.p;
    course.ford.water.position.y=.064+s.waterDepth;
    if(b===2){
      const geom=course.ford.water.geometry,pos=geom.attributes.position,uv=geom.attributes.uv;
      for(let i=0;i<pos.count;i++){
        const x=uv.getX(i)*3,z=(1-uv.getY(i))*5,ix=Math.min(2,Math.floor(x)),iz=Math.min(4,Math.floor(z)),f=x-ix,g=z-iz;
        const j=iz*4+ix,h0=s.water[j].h*(1-f)+s.water[j+1].h*f,h1=s.water[j+4].h*(1-f)+s.water[j+5].h*f;
        pos.setZ(i,h0*(1-g)+h1*g);
      }pos.needsUpdate=true;geom.computeVertexNormals();
    }
    course.waves.forEach((v,i)=>{v.position.y=.07+s.waterDepth+s.water[i].h;v.scale.x=.022+Math.abs(s.water[i].v)*.17;});
    for(const [k,o] of Object.entries(course.controls))o.visible=k===['ramp','bridge','sluice'][b];
    course.cranks.ramp.rotation.z=-.81*s.ramp.p;course.cranks.bridge.rotation.z=-2.83*s.bridge.p;course.cranks.sluice.rotation.z=-4.7*s.sluice.p;
    course.truck.position.x=-s.truck.p;course.lift.position.y=.005+.934*s.lift.p;
    for(const w of course.truckWheels)w.rotation.z=s.truck.p/.462;
    for(const a of course.liftArms){
      const d=V(1.72,course.lift.position.y-.53,0);
      a.scale.y=d.length();a.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());
    }
    course.truck.visible=s.batch===2&&isDepot();
  }
  function follow(v,velocity,target,dt,k=36,drag=12){
    const n=Math.max(1,Math.ceil(dt/.0167)),h=dt/n;
    for(let i=0;i<n;i++){velocity.addScaledVector(target.clone().sub(v),k*h).multiplyScalar(Math.exp(-drag*h));v.addScaledVector(velocity,h);}
  }
  function frameCamera(dt){
    const asp=camera.aspect,out=isOutside(),depot=isDepot(),zone=out?(depot?'depot':'course'):'shop',portrait=asp<.85;
    const half=Math.tan(15*Math.PI/180),c=s.car;
    if(!out){
      // Retain the working width on narrow phones. Extra vertical space shows roof and foreground.
      const target=portrait?V(-.045,1.63,.05):V(-.035,1.55,.05);
      const dir=portrait?V(.205,.373,.905).normalize():V(.436,.307,.846).normalize();
      const distance=Math.max(portrait?8.8:8.9,(portrait?2.50:3.27)/(half*asp));
      if(s.phase==='feed'||s.phase==='assembly'||s.phase==='drive'){
        target.x+=.48;target.z-=s.phase==='drive'?.65:.06;
      }
      camGoal.copy(target).addScaledVector(dir,distance);lookGoal.copy(target);
    }else if(depot){
      const truck=s.phase!=='park',mid=truck?-1.92-s.truck.p:c.parkX.p;
      lookGoal.set(mid,truck?.86:.75,truck?-8.65:c.parkZ.p);
      const dist=truck?Math.max(13,8.7/(.384*asp)):Math.max(8.3,3.7/(.384*asp));
      camGoal.copy(lookGoal).addScaledVector(V(.32,.46,-.824).normalize(),dist);
    }else{
      const q=F.point(c.distance),ahead=F.point(c.distance+2.6),g=course.controls[s.feature],watch=s.phase==='gate';
      lookGoal.set(q.x*.65+ahead.x*.35,c.height+.64,q.z*.65+ahead.z*.35);
      if(watch && g){lookGoal.lerp(g.position.clone().add(V(0,.68,0)),.45);}
      const dist=Math.max(8.4,(watch?3.1:2.95)/(.384*asp));
      const dir=V(.49,.43,q.z> -13?-.79:.76).normalize();
      // Smoothly change the view along the back straight using course position.
      dir.z=.79*Math.max(-1,Math.min(1,(-q.z-15)/4));dir.x=.5+.55*(1-Math.min(1,Math.abs(dir.z)/.79));dir.normalize();
      camGoal.copy(lookGoal).addScaledVector(dir,dist);
    }
    camera.fov=out?42:30;
    if(cut||area!==zone||lastAspect!==asp){
      camera.position.copy(camGoal);look.copy(lookGoal);camV.set(0,0,0);lookV.set(0,0,0);cut=false;
    }else{follow(camera.position,camV,camGoal,dt);follow(look,lookV,lookGoal,dt,47,13);}
    camera.lookAt(look);camera.updateProjectionMatrix();lastAspect=asp;area=zone;
    camera.updateMatrixWorld();return out;
  }
  function hints(){
    const h=factory.glove;h.visible=s.hint.p>.016;
    if(!h.visible)return;
    if(s.phase==='gate'){
      const g=course.controls[s.feature];g.getWorldPosition(h.position);
      h.position.add(V(.09,1.34+s.hintStroke.p,.01));
      h.scale.setScalar(Math.max(.01,s.hint.p)*1.45);
    }else{
      const p=factory.canPos[s.selected];h.position.copy(p).add(V(.16,1.57+s.hintStroke.p,.16));
      h.scale.setScalar(Math.max(.01,s.hint.p)*1.12);
    }h.rotation.set(.14,Math.atan2(camera.position.x-h.position.x,camera.position.z-h.position.z),.37);
  }
  const dayKey=new T.Color(0xffedcf),duskKey=new T.Color(0xffbb86);
  function lighting(out){
    const warm=s.twilight.p;scene.background.copy(day).lerp(dusk,warm);scene.fog.color.copy(scene.background);
    key.color.copy(dayKey).lerp(duskKey,warm);key.intensity=(2.36+.49*s.light.p)*(1-warm*.18);
    const focus=out?look:V(0,0,0);
    key.target.position.set(focus.x,0,focus.z);key.position.copy(key.target.position).add(V(-7-warm*9,14.2-warm*8,-9));
  }
  const ray=new T.Raycaster(),pointer=new T.Vector2();let pointerId=null;
  function pick(event){
    pointer.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);
    ray.setFromCamera(pointer,camera);
    const targets=isOutside()?Object.entries(course.controls).filter(([k,o])=>o.visible).map(([name,o])=>({o,name})):
      [...factory.cans.map((o,k)=>({o,name:'can',index:k})),{o:factory.rack,name:'rack'}];
    if(course.truck.visible)targets.push({o:course.truck,name:'truck'});
    const hits=[];
    for(const target of targets){
      const [hit]=ray.intersectObject(target.o,true);
      if(hit)hits.push({...target,distance:hit.distance});
    }
    hits.sort((a,b)=>a.distance-b.distance);
    return hits[0];
  }
  canvas.addEventListener('pointerdown',e=>{
    if(pointerId!==null)return;const t=pick(e);if(!t)return;
    e.preventDefault();advanceClock(performance.now());unlockSound();pointerId=e.pointerId;canvas.setPointerCapture(e.pointerId);
    if(sim.touch(t.name,t.index)&&t.name==='can')note([392,494,587][t.index],.17,.071);
  });
  function release(e){if(pointerId!==null&&(!e||e.pointerId===pointerId)){advanceClock(performance.now());sim.release();pointerId=null;}}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
  window.addEventListener('blur',()=>release());
  document.addEventListener('visibilitychange',()=>{if(document.hidden){release();sound?.ac.suspend().catch(()=>{});}prev=0;});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  function resize(){
    const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    const v=renderer.getDrawingBufferSize(new T.Vector2());rt.setSize(v.x,v.y);glow.setSize(Math.max(1,Math.floor(v.x/4)),Math.max(1,Math.floor(v.y/4)));
    bright.uniforms.px.value.set(1/v.x,1/v.y);cut=true;
  }
  window.addEventListener('resize',resize);resize();
  let prev=0;
  function advanceClock(now){
    const dt=prev?Math.max(0,Math.min(.08,(now-prev)/1000)):0;
    prev=Math.max(prev,now);sim.step(dt);return dt;
  }
  function frame(now){
    const dt=advanceClock(now);updateCar();poseFactory();poseCourse();const out=frameCamera(dt);hints();lighting(out);
    drawParticles(dust,s.dust,'dust');drawParticles(drops,s.spray,'spray');drawParticles(splashes,s.splashes,'splash');
    scene.updateMatrixWorld();reflection(out?'course':'shop');audioFrame();
    renderer.setRenderTarget(rt);renderer.render(scene,camera);
    quad.material=bright;renderer.setRenderTarget(glow);renderer.render(post,flat);
    quad.material=composite;renderer.setRenderTarget(null);renderer.render(post,flat);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
