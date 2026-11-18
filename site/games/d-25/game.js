(()=>{
  'use strict';
  const T=THREE,M=FarmModel,f=new M.Farm(),sound=new FarmSound(),canvas=document.getElementById('field');
  window.__GAME__={step:dt=>f.step(dt),getState:()=>f.getState(),press:id=>f.press(id),release:()=>f.release()};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.12,340);
  scene.fog=new T.FogExp2(0xf2dfbc,.0086);
  const sky=Atmosphere.sky(scene);Atmosphere.environment(renderer,scene);
  const fill=new T.HemisphereLight(0xe0f0fc,0xc7b38d,1.27);scene.add(fill);
  const sun=new T.DirectionalLight(0xffe1ad,2.42);sun.castShadow=true;scene.add(sun,sun.target);
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:1,far:105});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.00024;sun.shadow.normalBias=.024;sun.shadow.radius=2;
  const field=Art.group(scene),land=Land.landscape(scene,field),crops=Crops.crop(scene,f,field);Crops.meadow(scene,land);
  const machine=Machines.combine(field),truck=Machines.truck(field),bale=Machines.bale(field),child=Machines.person(field,.93,true);
  const targetables={combine:machine.base,truck:truck.base,bale:bale.g,gate:land.lock.g};
  const finalPass=Atmosphere.finish(renderer),D=Art.dummy,V=new T.Vector3(),P=new T.Vector3(),look=new T.Vector3(),camPos=new T.Vector3(),camAim=new T.Vector3();
  const grain=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),Art.mat(0xe5b65e,.61,.06),f.grains.length);
  grain.frustumCulled=false;grain.instanceMatrix.setUsage(T.DynamicDrawUsage);field.add(grain);
  const dust=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),Art.mat(0xf2d491,.72,.13),f.dust.length);dust.frustumCulled=false;field.add(dust);
  // The stream above the gate remains wet and wind-driven even with the sluice shut.
  const poolG=new T.PlaneGeometry(2.67,3.5,4,4);poolG.rotateX(-Math.PI/2);
  const pool=Art.obj(scene,poolG,Art.mat(0x709590,.13,.47),M.LOCK.x,.245,M.LOCK.z-1.28);pool.castShadow=false;
  for(const side of [-1,1])Art.box(scene,M.LOCK.x+side*1.38,.15,M.LOCK.z-1.25,.15,.33,3.57,0x979781);
  // A pale contact ring is a sunlit metal detail on the current object. Its world-space
  // projection also anchors the finger demonstration, so it tracks a moving vehicle.
  const cueMat=new T.MeshStandardMaterial({color:0xffdead,emissive:0xc09341,emissiveIntensity:.39,roughness:.37,metalness:.39});
  const cue=new T.Mesh(new T.TorusGeometry(.143,.018,8,30),cueMat);scene.add(cue);
  const hint=document.getElementById('hint'),stages=[...document.querySelectorAll('#trail b')],marks=[...document.querySelectorAll('#measure i')];
  const soundButton=document.getElementById('sound');
  soundButton.addEventListener('click',()=>{sound.start();sound.toggle();soundButton.classList.toggle('off',sound.muted);soundButton.setAttribute('aria-pressed',String(!sound.muted));});
  let currentDay=-1,firstCamera=true,width=0,height=0,stageIcon=-1,previous=tickNow();
  function tickNow(){return performance.now()*.001;}
  function resize(){
    width=canvas.clientWidth;height=canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,width<600?1.6:1.50));renderer.setSize(width,height,false);
    camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();finalPass.resize();firstCamera=true;
  }
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  let pointer=null;const ray=new T.Raycaster(),point=new T.Vector2();
  function pick(e){
    const rect=canvas.getBoundingClientRect();point.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(point,camera);
    const eligible=Object.entries(targetables).filter(([,o])=>o.visible);
    const hits=ray.intersectObjects(eligible.map(([,o])=>o),true);
    if(hits.length){
      let o=hits[0].object;while(o&&!o.userData.hit)o=o.parent;if(o)return o.userData.hit;
    }
    // Sample a small fingertip around the contact point against the actual solid parts.
    const active=f.active(),obj=targetables[active];if(!obj||!obj.visible)return '';
    const margin=e.pointerType==='touch'?9:3;
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      ray.setFromCamera(new T.Vector2(point.x+dx*margin*2/width,point.y+dy*margin*2/height),camera);
      if(ray.intersectObject(obj,true).length)return active;
    }
    return '';
  }
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;canvas.setPointerCapture(pointer);
    sound.start();f.press(pick(e));
  });
  function release(e){if(!e||pointer===e.pointerId){f.release();pointer=null;}}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  window.addEventListener('blur',()=>release());document.addEventListener('visibilitychange',()=>{release();previous=tickNow();if(document.hidden&&sound.ctx)sound.ctx.suspend();});
  const smooth=x=>x*x*(3-2*x),minmax=(x,l,h)=>Math.max(l,Math.min(h,x));
  function drawModels(){
    if(currentDay!==f.day){currentDay=f.day;field.position.x=f.dayOffset;crops.plant();}
    machine.base.position.set(f.x,0,f.z);machine.base.rotation.set(f.shake*.23,f.yaw,f.nudges.combine.tilt,'YXZ');
    machine.h.rotation.z=f.shake*.28;machine.h.position.y=Math.abs(f.shake)*.07;
    machine.wheels.forEach((w,i)=>w.rotation.x=-f.wheel*(i%2?.91/.63:1));
    machine.reel.rotation.x=-f.reel;machine.pipe.rotation.y=-(1-f.pipe)*Math.PI*.49;
    machine.load.position.y=3.09+f.tank/(2.32*1.91);machine.load.visible=f.tank>.006;
    truck.base.position.set(f.truck.x,0,f.truck.z);truck.base.rotation.set(0,f.truck.yaw,f.nudges.truck.tilt,'YXZ');
    truck.wheels.forEach(w=>w.rotation.x=-f.truck.wheel);const tilt=f.truck.tip;
    truck.bed.rotation.x=tilt;truck.bed.position.set(0,-f.truck.bedSpring+2.45*Math.sin(tilt)+1.15*(1-Math.cos(tilt)),2.45*(1-Math.cos(tilt))-1.15*Math.sin(tilt));
    truck.load.visible=f.truck.load>.008;truck.load.position.y=1.205+f.truck.load/(2.05*2.60);
    bale.g.visible=['bales','ride','dusk','morning','dawn'].includes(f.stage);child.g.visible=bale.g.visible;
    if(bale.g.visible){
      const b=f.bale,bt=b.travel;
      bale.g.position.set(b.x-.12*bt, .78-(1-smooth(b.emerge))*.48,b.z+bt);bale.g.rotation.z=f.nudges.bale.tilt;
      bale.drum.rotation.x=b.spin;const walk=smooth(f.child.approach),sit=smooth(f.child.seat);
      child.g.position.set(bale.g.position.x-2.12*(1-walk)-.34*(1-sit),1.01*sit,bale.g.position.z+.38*(1-walk)+.075);
      child.g.rotation.y=-.65;child.legs.rotation.x=sit*1.30;child.arm.rotation.z=-.27+f.wave*.50;
    }
    land.person.arm.rotation.z=(f.wave-.65)*.91;
    land.doors.forEach((d,i)=>d.position.x=(i?1:-1)*(.8+1.16*f.barnDoor));
    land.lock.wheel.rotation.x=f.waterWheel;land.lock.valve.position.y=1.14+f.sluice*.44;land.lock.g.rotation.z=f.nudges.gate.tilt;
    for(let i=0;i<land.lock.water.length;i++){const w=land.lock.water[i],v=f.channels[i].water;w.visible=v>.006;w.scale.x=.90*Math.min(1,v*5);w.position.y=.059+v*.083;}
    const pos=poolG.attributes.position;for(let i=0;i<25;i++)pos.setY(i,f.ripples[i].level);pos.needsUpdate=true;poolG.computeVertexNormals();
    let ni=0;for(const g of f.grains)if(g.live){D.position.set(g.x,g.y,g.z);D.rotation.set(0,g.vx*2.5,g.vy*.10);D.scale.set(.035,.062,.034);D.updateMatrix();grain.setMatrixAt(ni++,D.matrix);}grain.count=ni;grain.instanceMatrix.needsUpdate=true;
    for(let i=0;i<f.dust.length;i++){
      const p=f.dust[i],r=.006+Math.max(0,Math.min(1,p.life,8-p.life))*.009;D.position.set(p.x,p.y,p.z);D.rotation.set(p.vz,p.vy,p.vx);D.scale.set(r,r*.38,r*.71);D.updateMatrix();dust.setMatrixAt(i,D.matrix);
    }dust.instanceMatrix.needsUpdate=true;crops.draw();
    sky.u.heat.value=f.climate;sky.u.air.value.set(f.airTravel*.0016,f.airTravel*.0006);
    sun.intensity=2.79-f.cloudCover*.91-Math.max(0,f.climate-.12)*.36;
    sun.color.setRGB(1,.847-Math.max(0,f.climate)*.30,.630-Math.max(0,f.climate)*.28);
    scene.fog.color.setRGB(.82,.79-f.climate*.10,.66-f.climate*.10);
  }
  function cameraPose(dt){
    const aspect=camera.aspect,scale=Math.max(1,1.04/aspect),far=scale-1;
    const wp=f.x+f.dayOffset,wz=f.z,truckX=f.truck.x+f.dayOffset;
    let az=f.yaw,offX=-8.80,offZ=8.1,cy=2.02+3.50*scale;
    let tx=wp,tz=wz,ay=2.96+.60*far,aimX=.55,aimZ=-.66,zoom=1-Math.min(1,f.tank/f.capacity)*.057;
    if(['arrival','unload','finish'].includes(f.stage)){
      tx=wp;tz=wz;offX=-2.1;offZ=11.3;cy=3.01+3.2*scale;aimX=2.12;aimZ=.35;ay=2.62+.42*far;zoom=1.02;
    }else if(f.stage==='bales'){
      tx=bale.g.position.x+f.dayOffset;tz=bale.g.position.z;az=0;offX=-4.7;offZ=5.9;cy=2.1+1.71*scale;aimX=-.35;aimZ=-.5;ay=1.68+.30*far;zoom=1;
    }else if(f.stage==='ride'||f.stage==='dusk'){
      tx=truckX;tz=f.truck.z;az=0;offX=-6.15;offZ=7.4;cy=2.54+2.63*scale;aimX=1.25;aimZ=-.35;ay=2.5+.4*far;
      if(f.stage==='dusk'){tx=M.BARN.x-1;tz=M.BARN.z+2;offX=-8.6;offZ=10.9;ay=2.92;}
    }else if(f.stage==='morning'||f.stage==='dawn'){
      tx=M.LOCK.x;tz=M.LOCK.z;az=0;offX=-4.1;offZ=5.07;cy=1.82+2.10*scale;aimX=.2;aimZ=.03;ay=1.19+.45*far;zoom=1;
    }
    const co=Math.cos(az),si=Math.sin(az);
    camPos.set(tx+(offX*co+offZ*si)*scale*zoom,cy,tz+(-offX*si+offZ*co)*scale*zoom);
    camAim.set(tx+aimX*co+aimZ*si,ay,tz-aimX*si+aimZ*co);
    const a=firstCamera?1:1-Math.exp(-dt*2.12);
    camera.position.lerp(camPos,a);look.lerp(camAim,a);camera.lookAt(look);camera.updateMatrixWorld();firstCamera=false;
    sky.dome.position.copy(camera.position);
    sun.target.position.set(tx,.1,tz);sun.position.set(tx-25,23-f.climate*9,tz-19);
  }
  function cues(dt){
    const act=f.active(),o=targetables[act];cue.visible=!!o;
    const stage=f.stage==='harvest'?(f.relay?1:0):['arrival','unload','finish'].includes(f.stage)?1:f.stage==='bales'?2:['ride','dusk'].includes(f.stage)?3:4;
    if(stage!==stageIcon){stageIcon=stage;stages.forEach((s,i)=>s.className=i===stage?'active':i<stage?'done':'');}
    marks.forEach((m,i)=>m.classList.toggle('on',f.tank/f.capacity>(i+.25)/7));
    if(!o){hint.style.opacity=0;return;}
    if(act==='combine')P.set(-1.38,2.06,.18);
    else if(act==='truck')P.set(-1.16,1.58,.72);
    else if(act==='bale')P.set(-.74,.10,.03);
    else P.set(-.57,1.36+f.sluice*.44,.02);
    o.localToWorld(P);cue.position.copy(P);cue.quaternion.copy(camera.quaternion);cue.position.addScaledVector(V.copy(camera.position).sub(P).normalize(),.06);
    const waiting=f.idle>=4&&!f.held;
    const hintPress=f.hint.press;
    cue.scale.setScalar((act==='bale'?.76:1)*(1+.25*hintPress));cueMat.emissiveIntensity=.25+hintPress*.7;
    V.copy(P).project(camera);const onScreen=V.z>0&&V.z<1&&Math.abs(V.x)<.98&&Math.abs(V.y)<.98;
    const ht=width<=540?59:70;
    hint.style.opacity=waiting&&onScreen?Math.min(1,(f.idle-4)*2.65):0;
    hint.style.transform='translate('+((V.x*.5+.5)*width-ht*.20+(1-hintPress)*13)+'px,'+((.5-V.y*.5)*height-ht*.20+(1-hintPress)*12)+'px) rotate('+((1-hintPress)*9-3)+'deg)';
  }
  function frame(){
    const now=tickNow(),dt=Math.min(.10,Math.max(0,now-previous));previous=now;
    if(!document.hidden){f.step(dt);drawModels();cameraPose(dt);cues(dt);sound.paint(f);finalPass.render(scene,camera,f.wind[8].p);}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
