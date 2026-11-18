(() => {
  'use strict';
  const T=THREE, A=HarborArt, sim=HarborPhysics.create();
  window.__GAME__={step:dt=>sim.step(dt),getState:()=>sim.getState()};
  const canvas=document.querySelector('#sea'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.01;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.12,350);
  scene.fog=new T.FogExp2(0xc8d3c8,.0092);
  const sky=HarborOcean.addSky(scene);
  const hemi=new T.HemisphereLight(0xd4e6ed,0x98a897,1.42);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffe6bc,2.25);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-24,right:24,top:23,bottom:-23,near:1,far:96});
  sun.shadow.normalBias=.018;sun.shadow.bias=-.00025;sun.shadow.radius=2;scene.add(sun,sun.target);
  const harbour=buildHarbor(scene);
  const floatMakers=[A.crate,A.stripedBall,A.dinghy,A.container,A.pontoon];
  const cargo=sim.objects.map((_,i)=>A.batch(floatMakers[i](scene)));
  const ships=sim.fleet.map((_,i)=>A.batch(A.fisher(scene,i)));
  ships[1].scale.setScalar(.84);ships[2].scale.setScalar(.93);
  const slings=[0,1,2,3].map(()=>A.cyl(scene,0,0,0,.016,.016,1,A.M.rope,7));
  const hook=new T.Vector3(),tie=new T.Vector3();
  const basket=A.batch(A.basket(scene));basket.position.set(HarborPhysics.basket.x,.03,HarborPhysics.basket.z);basket.scale.z=1.15;
  const tideUniform={value:0};
  function waterline(root){
    const humidity={value:.3};
    root.traverse(o=>{
      if(!o.isMesh)return;
      const m=o.material.clone();o.material=m;
      m.onBeforeCompile=shader=>{
        shader.uniforms.tideLevel=tideUniform;shader.uniforms.humidity=humidity;
        shader.vertexShader='varying vec2 waterlineY;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n waterlineY=vec2(position.y,(modelMatrix*vec4(transformed,1.)).y);');
        shader.fragmentShader='varying vec2 waterlineY; uniform float tideLevel,humidity;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\n float moisture=max(.84*(1.-smoothstep(tideLevel+.01,tideLevel+.11,waterlineY.y)),humidity*(1.-smoothstep(-.05,.32,waterlineY.x))); roughnessFactor*=1.-.52*moisture;diffuseColor.rgb*=1.-.19*moisture;');
      };
    });
    return humidity;
  }
  const wetCargo=cargo.map(waterline);ships.forEach(waterline);waterline(basket);
  const skyEnv=scene.environment;
  const probeTarget=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType});
  const probe=new T.CubeCamera(.18,260,probeTarget);
  let probeLocation=-1;
  const mirror=new T.WebGLRenderTarget(640,360,{type:T.HalfFloatType,depthBuffer:true});
  const mirrorCam=new T.PerspectiveCamera(),sea=HarborOcean.addWater(scene,sim,mirror);
  const seabirdMat=A.mat(0xebe8d9,.82),wingtip=A.mat(0x4a5758,.85);
  const gulls=sim.birds.map((b,n)=>{
    const root=A.group(scene);
    A.oval(root,0,0,0,.20,.077,.08,seabirdMat);A.oval(root,.17,.054,0,.11,.077,.076,seabirdMat);
    A.beam(root,[.23,.045,0],[.355,.04,0],.039,.008,A.M.brass);
    function fin(parent,vs,idx,m){m.side=T.DoubleSide;A.mesh(parent,A.geo(vs,idx),m);}
    fin(root,[-.13,0,0,-.36,.035,-.135,-.33,.027,.12],[0,1,2],seabirdMat);
    const arms=[],tips=[];
    for(const side of [-1,1]){
      const arm=A.group(root,0,.01,side*.04),tip=A.group(arm,.017,.09,side*.36);
      fin(arm,[.10,0,0,-.125,0,0,-.085,.105,side*.35,.135,.10,side*.35,.025,.128,side*.21],[0,1,4,1,2,4,2,3,4,3,0,4],seabirdMat);
      fin(tip,[.12,.01,0,-.1,.006,0,-.22,-.024,side*.30,-.11,-.02,side*.38],[0,1,2,0,2,3],seabirdMat);
      fin(tip,[-.11,-.02,side*.38,-.22,-.024,side*.30,-.31,-.052,side*.53],[0,1,2],wingtip);
      arms.push(arm);tips.push(tip);
    }
    root.scale.setScalar(1.05+n*.045);return {root,arms,tips};
  });
  // Broken rings are horizontal ribbons with actual gaps and locally varied width.
  function brokenRing(){
    const positions=[],indices=[],colors=[];
    for(let i=0;i<123;i++){
      const t=i*Math.PI*2/122,offset=.014*Math.sin(t*7+.6)+.009*Math.sin(t*13),light=.73+.17*Math.sin(t*3);
      for(const r of [1+offset,1.018+offset+.008*Math.sin(t*6)]){
        positions.push(Math.cos(t)*r,0,Math.sin(t)*r);colors.push(light,light,light);
      }
      if(i<122&&Math.sin(t*5+.2*Math.cos(t*4))>-.79){const k=i*2;indices.push(k,k+1,k+2,k+2,k+1,k+3);}
    }
    return A.geo(positions,indices,null,colors);
  }
  const pool=(geom,m,n)=>{
    const o=new T.InstancedMesh(geom,m,n);o.frustumCulled=false;o.count=0;
    o.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(o);return o;
  };
  const foam=A.mat(0xd2e2ce,.34);foam.transparent=true;foam.opacity=.49;foam.depthWrite=false;foam.side=T.DoubleSide;
  const froth=pool(brokenRing(),foam,100);
  const wakeMat=A.mat(0xc8dace,.42);wakeMat.transparent=true;wakeMat.opacity=.63;wakeMat.depthWrite=false;wakeMat.side=T.DoubleSide;
  const foamGeo=new T.SphereGeometry(1,8,4);
  const wakes=pool(foamGeo,wakeMat,1200);
  const dropMat=A.mat(0xa4d1cc,.115,.14);const drops=pool(new T.SphereGeometry(1,9,7),dropMat,250);
  const dustMat=A.mat(0xe8d8b3,.9);dustMat.transparent=true;dustMat.opacity=.48;
  const motes=pool(new T.IcosahedronGeometry(1,0),dustMat,60);
  const marker=A.group(scene),gold=A.mat(0xffdd91,.33,.33);gold.emissive.set(0xf5bd58);gold.emissiveIntensity=.47;
  function spark(p,x,y,z,size){
    const a=A.mesh(p,new T.OctahedronGeometry(1),gold,x,y,z);a.scale.set(size*.47,size,size*.47);return a;
  }
  spark(marker,0,0,0,.185);spark(marker,.23,.12,-.016,.083);spark(marker,-.19,-.09,.03,.053);
  const guideGeo=new T.SphereGeometry(1,8,5),guideMat=A.mat(0xe6d5a5,.43);guideMat.transparent=true;guideMat.opacity=.68;
  const beads=pool(guideGeo,guideMat,20);
  const dummy=new T.Object3D(),tint=new T.Color();
  function inst(o,i,x,y,z,rx,ry,rz,ax=0,ay=0,az=0){
    dummy.position.set(x,y,z);dummy.scale.set(rx,ry,rz);dummy.rotation.set(ax,ay,az);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);
  }
  // Low-energy highlight bloom, slight lens shading and fine film grain.
  const viewTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:2});
  const finishScene=new T.Scene(),finishCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({
    uniforms:{frame:{value:viewTarget.texture},pixel:{value:new T.Vector2()},grainSeed:{value:0}},
    vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame;uniform vec2 pixel;uniform float grainSeed;varying vec2 v;
    vec3 glow(vec2 off){vec3 col=texture2D(frame,v+off*pixel).rgb;return max(col-1.08,vec3(0.));}
    void main(){
      vec3 c=texture2D(frame,v).rgb;
      c+=(glow(vec2(-3.,2.))+glow(vec2(3.,-2.))+glow(vec2(1.,4.))+glow(vec2(-1.,-4.)))*.028;
      vec2 d=(v-0.5)*1.47;c*=1.-.105*dot(d,d);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float grain=fract(sin(dot(gl_FragCoord.xy+grainSeed,vec2(12.9898,78.233)))*43758.5453);
      gl_FragColor.rgb+=(grain-.5)*.007;
    }`,depthTest:false,depthWrite:false
  });
  finishScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  const ticks=document.querySelector('#ticks');for(let j=0;j<32;j++){
    const l=document.createElementNS('http://www.w3.org/2000/svg','path');
    l.setAttribute('d','M32 6.3v'+(j%4===0?'4.3':'1.8'));l.setAttribute('stroke','#e0d4b4');l.setAttribute('stroke-width',j%4===0?'1.1':'.65');l.setAttribute('transform','rotate('+j*11.25+' 32 32)');ticks.append(l);
  }
  const soundButton=document.querySelector('.audio');
  soundButton.addEventListener('click',()=>{const mute=HarborSound.toggle();soundButton.classList.toggle('muted',mute);soundButton.setAttribute('aria-pressed',String(mute));});
  const ray=new T.Raycaster(),waterPlane=new T.Plane(new T.Vector3(0,1,0),0),hit=new T.Vector3();
  let finger=null;
  function waterPoint(e){
    const r=canvas.getBoundingClientRect();ray.setFromCamera({x:2*(e.clientX-r.left)/r.width-1,y:1-2*(e.clientY-r.top)/r.height},camera);
    waterPlane.constant=-sim.scene.tide;
    if(!ray.ray.intersectPlane(waterPlane,hit))return null;
    return hit;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(finger!==null||!e.isPrimary)return;
    HarborSound.init();const p=waterPoint(e);
    if(p&&sim.touch('down',p.x,p.z,e.timeStamp/1000)){
      finger=e.pointerId;canvas.setPointerCapture(finger);e.preventDefault();
    }
  });
  canvas.addEventListener('pointermove',e=>{
    if(finger!==e.pointerId)return;const samples=e.getCoalescedEvents?.()||[];
    for(const q of samples.length?samples:[e]){const p=waterPoint(q);if(p)sim.touch('move',p.x,p.z,q.timeStamp/1000);}
    e.preventDefault();
  });
  function release(e){if(e.pointerId!==finger)return;sim.touch('up');finger=null;}
  for(const action of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(action,release);
  window.addEventListener('blur',()=>{sim.touch('cancel');finger=null;});
  const chapters=Array.from(document.querySelectorAll('.chapter')),slots=Array.from(document.querySelectorAll('.cargo-slot'));
  const hand=document.querySelector('#gesture'),needle=document.querySelector('#needle');
  let width=1,height=1;
  function resize(){
    width=canvas.clientWidth||innerWidth;height=canvas.clientHeight||innerHeight;
    const px=renderer.getPixelRatio();renderer.setSize(width,height,false);
    viewTarget.setSize(Math.round(width*px),Math.round(height*px));
    const scale=Math.min(.64,790/Math.max(width,height));mirror.setSize(Math.max(2,Math.round(width*scale)),Math.max(2,Math.round(height*scale)));
    finish.uniforms.pixel.value.set(1/(width*px),1/(height*px));
    camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  resize();window.addEventListener('resize',resize);
  const target=new T.Vector3(),dir=new T.Vector3(),up=new T.Vector3(),pt=new T.Vector3();
  function placeCamera(st){
    const narrow=Math.max(0,Math.min(1,(1.23-camera.aspect)/.77));
    const z=12.0+14*narrow*narrow,y=4.48+2.70*narrow;
    const passage=st.passage*st.passage*(3-2*st.passage);
    const crossing=1.68*Math.sin(Math.PI*passage)**4;
    const sail=st.stage===3?Math.min(1,sim.fleet[0].travel/12):st.stage===4?Math.min(1,sim.fleet[0].travel/12)*passage:0;
    camera.position.set(.05+.49*narrow-(1.20-.90*narrow)*passage,y+crossing+st.tide+(.36+2.4*narrow)*passage,z-31.75*passage);
    const tilt=.174-.068*narrow+(.023+.12*narrow)*passage;
    target.set(camera.position.x+.10-5.6*sail,camera.position.y-tilt*20-.6*sail,camera.position.z-20);
    camera.lookAt(target);camera.updateMatrixWorld();
    sky.sky.position.copy(camera.position);sky.mix.value=st.sun;
    sun.target.position.set(0,0,-8-31*passage);
    sun.position.set(-18-st.sun*8,27-st.sun*16,-13-31*passage);
    sun.color.setRGB(1,.82-.20*st.sun,.59-.27*st.sun);
    hemi.color.setRGB(.72-.09*st.sun,.85-.19*st.sun,.93);
    scene.fog.color.setRGB(.61+.13*st.sun,.66-.10*st.sun,.61+.045*st.sun);
    needle.setAttribute('transform','rotate('+(-8+sail*20+passage*4)+ ' 32 32)');
  }
  function updateModels(st){
    tideUniform.value=st.tide;cargo.forEach((o,i)=>{const b=sim.objects[i];wetCargo[i].value=b.wet;o.position.set(b.x,b.y,b.z);o.rotation.set(b.pitch,b.yaw,b.roll,'YXZ');});
    ships.forEach((o,i)=>{const b=sim.fleet[i];o.position.set(b.x,b.y,b.z);o.rotation.set(.16*b.roll,b.yaw,b.roll,'YXZ');});
    slings.forEach((line,i)=>{
      const b=sim.objects[i],j=i===3?0:1+i%2,ship=sim.fleet[j];
      line.visible=st.stage===3&&ship.latched;
      if(!line.visible)return;
      hook.set(0,3.18,.43).applyEuler(ships[j].rotation).multiplyScalar(ships[j].scale.x).add(ships[j].position);
      tie.set(b.x,b.y+b.height-b.draft,b.z);
      // After the load settles, the loose end is hauled in to the mast.
      tie.lerp(hook,Math.max(0,(ship.load-.84)/.16)*.96);
      line.position.copy(hook).add(tie).multiplyScalar(.5);
      dir.subVectors(tie,hook);line.scale.y=dir.length();line.quaternion.setFromUnitVectors(up.set(0,1,0),dir.normalize());
    });
    gulls.forEach((g,i)=>{const b=sim.birds[i];g.root.position.set(b.x,b.y,b.z);
      g.root.rotation.set(b.bank,-Math.atan2(b.vz,b.vx),b.vy*.13,'YXZ');
      g.arms.forEach((arm,j)=>{const s=j?1:-1;arm.rotation.x=s*(-.135+b.energy*.81*Math.sin(b.flap));
        g.tips[j].rotation.x=s*(.16+b.energy*.49*Math.sin(b.flap-.72));});
    });
    harbour.gates.forEach((g,i)=>g.rotation.y=(i===0?1:-1)*st.gate*1.48);
    harbour.bell.rotation.z=st.bellAngle;
    const carrier=sim.fleet[0];
    const shift=carrier.load;
    const slingY=1.98+carrier.hoist*(1.2-.86*shift);
    harbour.innerCargo.position.set(3.2+shift*1.4,slingY,-32.3-shift*1.08);
    harbour.cable.position.set((3.2+harbour.innerCargo.position.x)/2,(5.12+slingY+1)/2,(-32.3+harbour.innerCargo.position.z)/2);
    dir.set(harbour.innerCargo.position.x-3.2,slingY+1-5.12,harbour.innerCargo.position.z+32.3);
    harbour.cable.scale.y=dir.length();harbour.cable.quaternion.setFromUnitVectors(up.set(0,1,0),dir.normalize());
    basket.position.y=.03+st.tide*.67+.3*(sim.surface(basket.position.x,basket.position.z)-st.tide);
    basket.rotation.z=sim.objects[0].roll*.09;
  }
  function updateEffects(st){
    let n=0;
    for(const q of sim.laps){
      if(n>=100)break;
      const y=sim.surface(q.x,q.z)+.020;
      const k=Math.min(1,q.power*1.7);
      inst(froth,n,q.x,y,q.z,q.r,1,q.r*.91,0,q.seed,0);tint.setRGB(.42+.50*k,.61+.37*k,.56+.35*k);froth.setColorAt(n,tint);n++;
    }
    // Travelling wave packets also expose a narrow, broken specular crest.
    for(const w of sim.waves){
      if(n>=100||w.radius<.13||w.strength<.017)continue;
      inst(froth,n,w.x,st.tide+w.strength+.012,w.z,w.radius,1,w.radius,0,w.id*.87,0);
      tint.setRGB(.81,.94,.92);froth.setColorAt(n++,tint);
    }
    froth.count=n;froth.instanceMatrix.needsUpdate=true;if(froth.instanceColor)froth.instanceColor.needsUpdate=true;
    n=0;for(const q of sim.wakes){if(n>=1200)break;
      inst(wakes,n,q.x,sim.surface(q.x,q.z)+.016,q.z,q.width,.015,.27+q.age*.027,0,q.yaw,0);
      const c=.41+q.energy*.59;wakes.setColorAt(n++,tint.setRGB(c*.92,c,c*.99));}
    wakes.count=n;wakes.instanceMatrix.needsUpdate=true;if(wakes.instanceColor)wakes.instanceColor.needsUpdate=true;
    n=0;for(const p of sim.drops){if(n>=250)break;inst(drops,n++,p.x,p.y,p.z,p.size,p.size*(1+Math.abs(p.vy)*.28),p.size);}
    drops.count=n;drops.instanceMatrix.needsUpdate=true;
    n=0;for(const p of sim.motes){const r=.008+Math.abs(Math.sin(p.seed))*.007;inst(motes,n++,p.x,p.y,p.z,r,r,r);}
    motes.count=n;motes.instanceMatrix.needsUpdate=true;
  }
  let trayVersion=-1;
  function updateGuide(st){
    const inner=st.stage===2||st.stage===3,keys=inner?['container','pontoon']:['crate','buoy','dinghy'];
    if(trayVersion!==st.stage){
      slots.forEach((s,i)=>{s.style.display=i<keys.length?'flex':'none';if(i<keys.length)s.querySelector('use').setAttribute('href','#icon-'+keys[i]);});
      chapters.forEach((c,i)=>{c.classList.toggle('now',i===Math.min(st.stage,3));c.classList.toggle('done',i<Math.min(st.stage,3));});
      trayVersion=st.stage;
    }
    slots.forEach((s,i)=>s.classList.toggle('done',!!sim.objects[i+(inner?3:0)]?.delivered));
    const playable=st.stage===0||st.stage===2;
    const obj=playable?sim.objects.slice(inner?3:0,inner?5:3).find(b=>!b.delivered):null;
    const dest=sim.goal();marker.visible=!!obj;
    beads.count=0;hand.style.opacity=0;
    if(!obj){
      if((st.stage===1&&st.gate>.18||st.stage===3)&&st.guideAge>0&&finger===null){
        const b=st.stage===1?sim.objects[1]:sim.fleet[0];
        const part=st.guideAge%6.1,u=Math.min(1,part/3.1);
        const x=b.x-1.12+.6*u,z=b.z+1.15-1.6*u;
        pt.set(x,sim.surface(x,z)+.03,z).project(camera);
        hand.style.transform='translate('+((pt.x+1)*width*.5-15)+'px,'+((1-pt.y)*height*.5-8)+'px)';
        hand.style.opacity=String(.72*Math.max(0,Math.min(1,part/.5,(4.3-part)/.65)));
      }
      return;
    }
    const ph=sim.breeze[3].phase;
    marker.position.set(dest.x+.04,st.tide+(inner?1.64:1.52)+.058*Math.sin(ph),dest.z);
    marker.rotation.y=ph*.49;
    const dx=dest.x-obj.x,dz=dest.z-obj.z,dist=Math.hypot(dx,dz),ux=dx/Math.max(.001,dist),uz=dz/Math.max(.001,dist);
    if(dist>2.1){
      const gap=Math.max(1,obj.width*.68),endGap=inner?1.18:1.06;
      const span=dist-gap-endGap,count=Math.max(0,Math.min(13,Math.floor(span/.30)));
      for(let i=0;i<count;i++){
        const u=(i+.55)/count,along=gap+span*u,curve=.10*Math.sin(u*Math.PI);
        const x=obj.x+ux*along-uz*curve,z=obj.z+uz*along+ux*curve;
        const pulse=.64+.25*Math.sin(ph*2.2-i*.56),r=(.026+.011*Math.sin(u*Math.PI))*pulse;
        inst(beads,i,x,sim.surface(x,z)+.043,z,r,.013,r*1.23);
      }
      beads.count=count;beads.instanceMatrix.needsUpdate=true;
    }
    if(st.guideAge>0 && finger===null){
      const part=st.guideAge%5.6,progress=Math.max(0,Math.min(1,(part-.35)/2.7));
      const amp=Math.max(0,Math.min(1,part/.48,(4.1-part)/.58));
      const along=-1.46+progress*1.82,side=(.38+.28*Math.sin(progress*Math.PI));
      const x=obj.x+along*ux-side*uz,z=obj.z+along*uz+side*ux;
      pt.set(x,sim.surface(x,z)+.08,z).project(camera);
      hand.style.transform='translate('+((pt.x+1)*width*.5-15)+'px,'+((1-pt.y)*height*.5-8)+'px)';
      hand.style.opacity=String(.84*amp);
    }
  }
  const cutPlane=new T.Plane(),clipVec=new T.Vector4(),opposite=new T.Vector4();
  let lastReflection=-1,lastShadow=-1;
  function render(st){
    placeCamera(st);updateModels(st);updateEffects(st);updateGuide(st);sea.sync(st);
    if(st.elapsed-lastShadow>.22){renderer.shadowMap.needsUpdate=true;lastShadow=st.elapsed;}
    if(st.elapsed-lastReflection>.075){
      mirrorCam.copy(camera);
      mirrorCam.position.y=2*st.tide-camera.position.y;
      camera.getWorldDirection(dir);dir.y*=-1;
      up.set(0,1,0).applyQuaternion(camera.quaternion);up.set(-up.x,up.y,-up.z);
      mirrorCam.up.copy(up);mirrorCam.lookAt(pt.copy(mirrorCam.position).add(dir));mirrorCam.updateMatrixWorld();
      sea.uniforms.seaMatrix.value.multiplyMatrices(mirrorCam.projectionMatrix,mirrorCam.matrixWorldInverse);
      // Clip the submerged side of the mirrored view at the moving waterline.
      cutPlane.setComponents(0,1,0,-st.tide+.017).applyMatrix4(mirrorCam.matrixWorldInverse);
      clipVec.set(cutPlane.normal.x,cutPlane.normal.y,cutPlane.normal.z,cutPlane.constant);
      const projection=mirrorCam.projectionMatrix.elements;
      opposite.set((Math.sign(clipVec.x)+projection[8])/projection[0],(Math.sign(clipVec.y)+projection[9])/projection[5],-1,(1+projection[10])/projection[14]);
      clipVec.multiplyScalar(2/clipVec.dot(opposite));
      projection[2]=clipVec.x;projection[6]=clipVec.y;projection[10]=clipVec.z+.998;projection[14]=clipVec.w;
      sea.water.visible=false;renderer.setRenderTarget(mirror);renderer.render(scene,mirrorCam);sea.water.visible=true;lastReflection=st.elapsed;
    }
    const location=st.sun>.70?2:st.passage>.77?1:0;
    if(location!==probeLocation){
      probeLocation=location;scene.environment=skyEnv;
      probe.position.set(location?1:1.6,st.tide+1.8,location?-34:-3.4);
      probe.update(renderer,scene);scene.environment=probeTarget.texture;
    }
    renderer.setRenderTarget(viewTarget);renderer.render(scene,camera);
    finish.uniforms.grainSeed.value=sim.breeze[1].phase*.061;
    renderer.setRenderTarget(null);renderer.render(finishScene,finishCamera);
  }
  let previous=performance.now(),lastAmbience=-1;
  function frame(now){
    const dt=Math.max(0,Math.min(.075,(now-previous)*.001));previous=now;
    sim.step(dt);const st=sim.scene;
    while(sim.events.length)HarborSound.play(sim.events.shift());
    if(st.elapsed-lastAmbience>.18){HarborSound.ambience(st,sim.objects);lastAmbience=st.elapsed;}
    render(st);requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{previous=performance.now();if(document.hidden){sim.touch('cancel');finger=null;}});
  requestAnimationFrame(frame);
})();
