(()=>{
  'use strict';
  const {T,PI,TAU,M,group,mesh,box,cyl,ring,sphere,extrude}=Art;
  const game=KorokoroPhysics.createGame(),s=game.state,audio=new NurseryAudio();
  window.__GAME__={step:dt=>game.step(dt),getState:()=>game.getState()};
  const canvas=document.getElementById('world'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.85));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.085;
  const finish=nurseryFinish(renderer);
  const scene=new T.Scene();scene.background=new T.Color(0xe9dcc8);scene.fog=new T.FogExp2(0xe7d9bf,.009);
  Art.env(renderer,scene);
  scene.add(new T.HemisphereLight(0xe0eeff,0xe2bf95,1.56));
  const sun=new T.DirectionalLight(0xffe4b4,2.46);sun.position.set(-6,10,-4.6);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:37});sun.shadow.normalBias=.012;sun.shadow.bias=-.00020;sun.shadow.radius=2.4;scene.add(sun,sun.target);
  const room=Art.room(scene),layout=group(scene);
  const boards=Array.from({length:4},()=>group(layout));
  const chain=Toys.chain(boards[0]),lake=Toys.lake(boards[1]),sky=Toys.sky(boards[2]),music=Toys.carousel(boards[3]);
  // A short wooden tappet couples the lifting end of the seesaw to the car.
  box(chain.lever,.29,.33,.24,M.honey,-1.22,.20,0);
  const dustMat=Art.mat('#ffebc2','plain',.9);dustMat.emissive.setHex(0xffdc9e);dustMat.emissiveIntensity=.33;
  const dust=new T.InstancedMesh(new T.OctahedronGeometry(1,0),dustMat,s.dust.length);scene.add(dust);dust.frustumCulled=false;
  const particle=new T.Object3D();
  // Join rigid parts by material while preserving every moving joint and hit target.
  const movable=new Set([room.p,...room.sashes,...room.drapes,layout,...boards,chain.f,chain.starter,chain.marble,chain.lever,chain.car.o,...chain.car.axles,chain.balloon,chain.banner,chain.string,chain.pad,
    ...chain.domino.flatMap(d=>[d.g,d.hinge]),lake.hull,lake.wheelspin,lake.water,...lake.buoys,sky.air.a,sky.air.prop,sky.blades,sky.spindle,sky.thread,...sky.clouds,music.rotor,...music.animals,...music.keys,...music.bells,...Toys.clickable]);
  function batch(root){
    const meshes=new Map();
    function visit(o){
      if(movable.has(o)){batch(o);return;}
      if(o.isMesh && !o.isInstancedMesh && !o.material.transparent){
        if(!meshes.has(o.material))meshes.set(o.material,[]);
        meshes.get(o.material).push(o);
      }
      o.children.slice().forEach(visit);
    }
    root.children.slice().forEach(visit);const inverse=root.matrixWorld.clone().invert();
    for(const [material,items] of meshes){
      if(items.length<2)continue;
      const pos=[],nor=[],uv=[],idx=[];const v=new T.Vector3();
      for(const item of items){
        const g=item.geometry,a=g.attributes,base=pos.length/3;
        const matrix=new T.Matrix4().multiplyMatrices(inverse,item.matrixWorld),normal=new T.Matrix3().getNormalMatrix(matrix);
        for(let i=0;i<a.position.count;i++){
          v.fromBufferAttribute(a.position,i).applyMatrix4(matrix);pos.push(v.x,v.y,v.z);
          v.fromBufferAttribute(a.normal,i).applyMatrix3(normal).normalize();nor.push(v.x,v.y,v.z);
          uv.push(a.uv.getX(i),a.uv.getY(i));
        }
        if(g.index)for(let i=0;i<g.index.count;i++)idx.push(base+g.index.getX(i));else for(let i=0;i<a.position.count;i++)idx.push(base+i);
        item.removeFromParent();
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
      const combined=mesh(root,g,material);combined.castShadow=combined.receiveShadow=true;
    }
  }
  scene.updateMatrixWorld(true);batch(room.p);boards.forEach(batch);
  // The window aperture modulates direct sunlight in world coordinates on solid surfaces.
  const warmth={value:.36},wallShift={value:0},materials=new Set();
  scene.traverse(o=>{if(o.isMesh && !o.isInstancedMesh)materials.add(o.material);});
  materials.forEach(m=>{
    m.onBeforeCompile=shader=>{
      shader.uniforms.nurseryGlow=warmth;shader.uniforms.wallShift=wallShift;
      shader.vertexShader='varying vec3 roomPoint;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nroomPoint=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader='varying vec3 roomPoint; uniform float nurseryGlow; uniform float wallShift;\n'+shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      float distToWindow=roomPoint.z+5.64-wallShift;
      vec2 aperture=vec2(roomPoint.x+.30-distToWindow*.59,roomPoint.y+distToWindow*.78-3.82);
      vec2 edge=vec2(1.)-smoothstep(vec2(2.7,1.84),vec2(2.88,2.04),abs(aperture));
      float mullionX=smoothstep(.018,.105,abs(sin(aperture.x*2.225)));
      float mullionY=smoothstep(.025,.105,abs(aperture.y-.09));
      float patch=edge.x*edge.y*mullionX*mullionY;
      reflectedLight.directDiffuse*=.73+patch*(.72+nurseryGlow*.42);
      reflectedLight.directSpecular*=.84+patch*.46;`);
    };
  });
  // A small optical halo around the ceramic starting marker, with a solid brass rim.
  const cue=group(scene),halo=ring(cue,.51,.023,M.brass,0,.025,0);halo.rotation.x=PI/2;
  const cueM=Art.mat('#ffc957','plain',.28,.15);cueM.emissive.setHex(0xffb64a);cueM.emissiveIntensity=.20;
  const marker=group(cue);const sh=new T.Shape();sh.moveTo(-.185,.105);sh.quadraticCurveTo(-.222,.185,-.14,.185);sh.lineTo(0,.115);sh.lineTo(.14,.185);sh.quadraticCurveTo(.222,.185,.185,.105);sh.lineTo(.045,-.072);sh.quadraticCurveTo(0,-.115,-.045,-.072);sh.closePath();
  extrude(marker,sh,.069,cueM,0,0,0,.018);
  const finger=document.getElementById('finger'),camera=new T.PerspectiveCamera(34,1,.08,160);
  const aim=new T.Vector3(),goal=new T.Vector3(),dir=new T.Vector3(),tmp=new T.Vector3(),focus=new T.Vector3(),pointer=new T.Vector2(),ray=new T.Raycaster();
  let distance=20,first=true,aspect=1,port=0,du=0,dv=0,current=-1,held=null;
  function resize(){
    du=window.innerWidth;dv=window.innerHeight;renderer.setSize(du,dv,false);finish.resize(du,dv);aspect=du/dv;camera.aspect=aspect;camera.updateProjectionMatrix();
    port=T.MathUtils.smoothstep(1.18-aspect,0,.65);layout.rotation.y=port*1.52;
    room.p.position.z=-port*2.35;wallShift.value=room.p.position.z;
    dir.set(.292*(1-port)+.035*port,.495+port*.49,.846-port*.30).normalize();
    goal.set(0,1.04+port*.08,-.04);
    // Fit the physical corners and raised goal to a safe perspective frustum.
    const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),dir).normalize(),up=new T.Vector3().crossVectors(dir,right);
    const k=Math.tan(17*PI/180),axis=new T.Vector3(0,1,0);distance=14.25;
    for(const x of [-6.85,6.85])for(const z of [-4.13,4.19])for(const y of [.05,1.05]){
      const v=new T.Vector3(x,y,z).applyAxisAngle(axis,layout.rotation.y).sub(goal);
      distance=Math.max(distance,v.dot(dir)+Math.abs(v.dot(right))/(k*aspect*.962),v.dot(dir)+Math.abs(v.dot(up))/(k*.88));
    }
    first=true;
  }
  function cable(o,a,b){
    const d=tmp.copy(b).sub(a);o.position.copy(a).addScaledVector(d,.5);
    o.scale.y=d.length()/o.geometry.parameters.height;
    o.quaternion.setFromUnitVectors(up,d.normalize());
  }
  const up=new T.Vector3(0,1,0),va=new T.Vector3(),vb=new T.Vector3();
  function sync(dt){
    for(let i=0;i<4;i++){let off=i-s.travel.x;off-=Math.round(off/4)*4;
      // The unplayed trays stay off-stage until their preceding reward releases them.
      boards[i].position.x=off*21;boards[i].visible=Math.abs(off)<.94;
    }
    {for(let i=0;i<chain.domino.length;i++){
      const t=(1.67+i*.474)/6.88;Toys.placeOn(chain.domino[i].g,Toys.back,t,.010);
      chain.domino[i].g.position.z+=s.domino[i].offset;chain.domino[i].g.rotation.y+=s.domino[i].offset*1.5;
    }}
    chain.f.rotation.z=s.frame.x;chain.f.rotation.x=s.frame.x*.39;
    Toys.placeOn(chain.starter,Toys.back,(.225+s.starter.x)/6.88,.427);chain.starter.rotation.z=-s.starter.x/.425+s.accents[11].x;
    chain.domino.forEach((d,i)=>d.hinge.rotation.z=-s.domino[i].a+s.accents[i].x*.33);
    Toys.placeOn(chain.marble,Toys.ramp,Math.min(1,s.marble.x/5.65),.313);
    chain.marble.rotation.z=-s.marble.x/.31;chain.marble.rotation.x=s.accents[12].x;
    if(s.marble.x>=5.65)chain.marble.position.y=.72+1.345*Math.sin(s.lever.x)+.085+.31;
    chain.lever.rotation.z=s.lever.x+s.accents[13].x*.24;
    Toys.placeOn(chain.car.o,Toys.road,.025+.94*s.car.x/5.95,.01);
    chain.car.o.rotation.z=-.115+s.accents[14].x;chain.car.axles.forEach(a=>a.rotation.z=-s.car.x/.242);
    chain.pad.position.x=.73+s.pad.x;
    chain.balloon.position.set(.16+s.sway.x,1.60+s.balloon.x,.08+s.sway.x*.27);chain.balloon.rotation.z=-s.sway.x*.83+s.accents[15].x;
    chain.banner.position.y=1.48+s.flag.x;chain.banner.rotation.y=s.curtains[2].x*1.75;
    cable(chain.string,va.set(.13,.37,.08),vb.copy(chain.balloon.position).add(new T.Vector3(-Math.sin(s.sway.x)*.50,-.64,0)));
    room.sashes.forEach((o,i)=>o.rotation.y=(i===0?-1:1)*s.window.x*.87);
    room.drapes.forEach((o,i)=>{o.rotation.z=s.curtains[i*6].x*.11;o.rotation.x=s.curtains[2+i*2].x*.19;});
    warmth.value=s.glow.x;sun.intensity=2.39+s.glow.x*.35;
    if(boards[1].visible){
      lake.wheelspin.rotation.z=-s.wheel.x;
      const pos=lake.water.geometry.attributes.position;for(let i=0;i<pos.count;i++){const j=i%32,k=Math.floor(i/32);pos.setY(i,s.water[j].x*(.63+.37*Math.cos(k*.5-j*.13)));}
      pos.needsUpdate=true;lake.water.geometry.computeVertexNormals();
      const j=Math.min(31,Math.floor(s.boat.x/6.65*31));lake.hull.position.set(-3.25+s.boat.x,.84+s.water[j].x,.60-.50*Math.sin(s.boat.x*.81));lake.hull.rotation.set(s.boat.roll.x,-.20*Math.cos(s.boat.x*.81),s.boat.roll.x*.49);
      lake.buoys.forEach((b,i)=>{b.position.y=.65+s.water[[9,19,30][i]].x;b.rotation.z=s.water[[8,18,29][i]].v*.4;});
    }
    if(boards[2].visible){
      const a=s.plane.angle;sky.spindle.rotation.y=-a;sky.blades.rotation.z=-s.prop.x;
      sky.air.a.position.set(3.27*Math.cos(a),.62+s.plane.height.x,-.25+3.27*Math.sin(a));
      sky.air.a.rotation.order='YXZ';sky.air.a.rotation.y=-a-PI/2;sky.air.a.rotation.x=s.plane.bank.x;sky.air.prop.rotation.x=s.prop.x;
      cable(sky.thread,va.set(sky.air.a.position.x,3.14,sky.air.a.position.z),vb.copy(sky.air.a.position).add(new T.Vector3(0,.28,0)));
      sky.clouds.forEach((c,i)=>c.rotation.z=s.curtains[1+i].x*.16);
    }
    if(boards[3].visible){
      music.rotor.rotation.y=s.carousel.angle;
      music.animals.forEach((o,i)=>o.position.y=1.17+s.carousel.animals[i].x);
      music.keys.forEach((o,i)=>{o.position.y=.22+s.keys[i].x;o.rotation.x=-s.keys[i].x*.4;music.bells[i].rotation.z=s.bells[i].x;});
    }
    s.dust.forEach((q,i)=>{particle.position.set(q.x,q.y,q.z);particle.scale.setScalar(.0045+(i%6)*.0013);particle.updateMatrix();dust.setMatrixAt(i,particle.matrix);});dust.instanceMatrix.needsUpdate=true;
    focus.copy(goal);let follow=null;
    if(s.phase==='moving'){
      if(s.stage===0){follow=!s.starter.hit?chain.starter:!s.marble.free?chain.domino[Math.max(0,s.domino.filter(d=>d.hit).length-1)].hinge:s.marble.x<5.65?chain.marble:s.car.x<5.95?chain.car.o:chain.balloon;}
      if(s.stage===1)follow=lake.hull;if(s.stage===2)follow=sky.air.a;if(s.stage===3)follow=music.rotor;
    }else if(s.phase==='reward'&&s.stage===0)follow=chain.balloon;
    if(follow){follow.getWorldPosition(tmp);focus.lerp(tmp,port?.082:.13);}
    if(first){aim.copy(focus);first=false;}else aim.lerp(focus,1-Math.exp(-dt*1.45));
    camera.position.copy(aim).addScaledVector(dir,distance);camera.lookAt(aim);camera.updateMatrixWorld();
    const name=game.active(),entry=Toys.anchors.find(a=>a.stage===s.stage && a.name===name);
    cue.visible=Boolean(entry);finger.style.opacity='0';
    if(entry){
      entry.o.getWorldPosition(tmp);const isBall=s.stage===0,isKey=s.stage===3;
      cue.position.copy(tmp);cue.position.y+=isBall?-.324:isKey?.145:-.53;
      halo.visible=isBall||isKey;halo.scale.setScalar(isKey?.66:1.03);
      marker.position.y=(isBall?1.11:isKey?.55:1.98)+s.wind.x*.1-s.guide.x*.07;
      marker.quaternion.copy(camera.quaternion);
      if(s.hint.x>.015 && !held){
        entry.o.getWorldPosition(tmp);tmp.project(camera);
        const h=s.guide.x;
        finger.style.transform='translate('+((tmp.x*.5+.5)*du+6-h*10)+'px,'+((.5-tmp.y*.5)*dv+19-h*18)+'px) rotate('+(-15+h*10)+'deg)';
        finger.style.opacity=String(Math.min(.94,s.hint.x*.94));
      }
    }
    if(current!==s.stage){current=s.stage;document.querySelectorAll('.bead').forEach((b,i)=>{b.classList.toggle('current',i===current);b.classList.toggle('past',i<current);});}
  }
  function hit(e){
    pointer.set(e.clientX/du*2-1,1-e.clientY/dv*2);ray.setFromCamera(pointer,camera);
    const options=Toys.clickable.filter(o=>o.userData.hit.stage===s.stage);
    const hits=ray.intersectObjects(options,true);
    for(const h of hits){let o=h.object;while(o && !o.userData.hit)o=o.parent;if(o)return o.userData.hit;}
    // A fingertip can cover the whole marble on a phone. The extra area is local to the active toy.
    const entry=Toys.anchors.find(o=>o.stage===s.stage && o.name===game.active());
    if(entry){entry.o.getWorldPosition(tmp);tmp.project(camera);
      if(Math.hypot((pointer.x-tmp.x)*du/2,(pointer.y-tmp.y)*dv/2)<22)return entry.o.userData.hit;}
    return null;
  }
  function push(e){
    const d=Math.hypot(e.clientX-held.x,e.clientY-held.y),age=Math.max(.07,(performance.now()-held.at)/1000);
    game.touch(held.name,Math.min(1,.17+d/(du*.19)+d/age*.00067+held.pressure*.16));held=null;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(held||!e.isPrimary)return;audio.start();const h=hit(e);if(!h)return;
    if(h.name===game.active()){held={id:e.pointerId,name:h.name,x:e.clientX,y:e.clientY,at:performance.now(),pressure:e.pressure||0};canvas.setPointerCapture(e.pointerId);}
    else if(s.stage===0){const category=h.name.startsWith('tile')?Number(h.name.slice(4)):({starter:11,second:12,lever:13,car:14,balloon:15})[h.name];game.nudge(category);}
  });
  canvas.addEventListener('pointermove',e=>{if(held && held.id===e.pointerId){if(Math.hypot(e.clientX-held.x,e.clientY-held.y)>30)push(e);}else if(e.pointerType==='mouse'){canvas.style.cursor=hit(e)?.name===game.active()?'pointer':'default';}});
  canvas.addEventListener('pointerup',e=>{if(held && held.id===e.pointerId)push(e);});
  canvas.addEventListener('pointercancel',()=>{held=null;});
  const sound=document.getElementById('sound');sound.addEventListener('click',()=>{const on=audio.toggle();sound.classList.toggle('off',!on);sound.setAttribute('aria-pressed',String(on));});
  window.addEventListener('resize',resize);resize();
  let prev=0;
  document.addEventListener('visibilitychange',()=>{prev=0;if(document.hidden){held=null;audio.ctx?.suspend();}else if(audio.ctx&&audio.enabled)audio.ctx.resume().catch(()=>{});});
  renderer.setAnimationLoop(ms=>{const dt=prev?Math.min(.10,(ms-prev)/1000):0;prev=ms;game.step(dt);sync(dt);audio.update(s,game.drain());finish.draw(scene,camera);});
})();
