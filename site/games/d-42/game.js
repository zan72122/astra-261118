'use strict';
(function(){
  const T=THREE,V=Valley,L=Landscape,R=Railway;
  const canvas=document.getElementById('view'),host=document.getElementById('game');
  const sim=V.create(),s=sim.state,sound=valleyAudio(),director=valleyDirector(s,host.clientWidth/host.clientHeight);
  function step(dt){
    if(!Number.isFinite(dt)||dt<0)throw Error('invalid dt');
    let left=dt;while(left>1e-9){const h=Math.min(left,1/60);sim.step(h);director.update(h);left-=h;}
  }
  window.__GAME__={step,getState:()=>({...sim.getState(),camera:JSON.parse(JSON.stringify(director.camera)),target:sim.target()}),
    setWind:sim.setWind,press:sim.press,release:sim.release};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.043,5400);
  scene.fog=new T.FogExp2(0xc7d3ce,.00054);
  const morning=L.sky(false),evening=L.sky(true);
  scene.environment=morning;scene.environmentIntensity=.53;
  const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
    uniforms:{a:{value:morning},b:{value:evening},day:{value:0}},
    vertexShader:'varying vec3 ray; void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 ray; uniform sampler2D a,b; uniform float day; void main(){vec3 n=normalize(ray);vec2 uv=vec2(atan(n.z,n.x)*0.15915494+.5,asin(n.y)*0.31830989+.5);float sunDot=dot(n,normalize(vec3(-19.,23.,-103.)));vec3 sky=mix(texture2D(a,uv).rgb,texture2D(b,uv).rgb,day);sky+=day*vec3(2.9,1.65,.65)*(smoothstep(.99989,.99996,sunDot)+.10*pow(max(0.,sunDot),170.));gl_FragColor=vec4(sky,1.);}'});
  const sky=new T.Mesh(new T.SphereGeometry(4200,58,24),skyMaterial);sky.renderOrder=-50;scene.add(sky);
  const ambient=new T.HemisphereLight(0xe2ecf5,0x8c8771,1.38);scene.add(ambient);
  const sun=new T.DirectionalLight(0xffe1b0,2.14);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-19,right:19,top:21,bottom:-21,near:.5,far:185});
  sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.023;sun.shadow.bias=-.00014;sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun,sun.target);
  L.mountains(scene);L.land(scene);const bendTrees=L.scatter(scene);const waterUpdate=L.river(scene);
  const stations=[0,V.MID,V.END].map(d=>R.station(scene,d));R.cables(scene);
  const cab=R.cabin(scene),scope=R.telescope(stations[1].p),bells=R.chimes(stations[2].p),birds=R.birds(scene);
  const ridgeHome=[[2,-345,5.3,6.6],[29,-369,6.0,8],[-10,-385,5.6,7.9],[35,-409,6.8,8.7],[12,-438,4.3,7.1],[54,-460,6.4,7.2]];
  for(const [x,z,w,d]of ridgeHome){const o=R.chalet(scene,x,V.terrain(x,z)-1.0,z,w,d);o.rotation.y=V.noise(x,z)*.8-.3;}
  const dustMat=L.mat(0xffefcd,.84,.02,{vertexColors:false,transparent:true,opacity:.59,depthWrite:false,emissive:0xd6c08e,emissiveIntensity:.21});
  const motes=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),dustMat,s.motes.length);motes.frustumCulled=false;scene.add(motes);
  const markerMaterial=L.mat(0xffe0a2,.30,.46,{emissive:0xeab75f,emissiveIntensity:.35});
  const marker=new T.Mesh(new T.TorusGeometry(1,.025,8,64),markerMaterial);scene.add(marker);
  const focus=new T.Vector3(),world=new T.Vector3(),screen=new T.Vector3(),matrix=new T.Object3D(),temp=new T.Vector3();
  const morningFog=new T.Color(0xc6d6d5),sunsetFog=new T.Color(0xe2bc96),sunAM=new T.Color(0xffe8c0),sunPM=new T.Color(0xffae68);
  const skyAM=new T.Color(0xdbe8f2),skyPM=new T.Color(0xa5bfde);
  const hand=document.getElementById('hint'),optic=document.getElementById('optic'),stops=[...document.querySelectorAll('.stop')];
  const ray=new T.Raycaster(),mouse=new T.Vector2();
  let activeRoots=[],hintSize=.25,drawTick=0,prevStage=-1,holding=null,startX=0;
  // One gentle optical pass in linear light, with four neighbouring bloom samples.
  const count=renderer.capabilities.maxSamples,rt=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:Math.min(2,count)});
  const finishScene=new T.Scene(),finishCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frame:{value:rt.texture},pixel:{value:new T.Vector2()}},
    vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame;uniform vec2 pixel;varying vec2 u;
    void main(){vec3 c=texture2D(frame,u).rgb;vec3 h=vec3(0.);
    for(int i=0;i<4;i++){vec2 d=vec2((i==0||i==2)?-1.:1.,i<2?-1.:1.)*pixel*3.;
    h+=max(vec3(0.),texture2D(frame,u+d).rgb-0.86);}
    c+=h*.022;vec2 q=u*2.-1.;c*=1.-.102*pow(dot(q,q)*.5,1.18);
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
    gl_FragColor.rgb+=(grain-.5)*.009;
    }`});
  finishScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  // Capture the actual timber, trees and sky in the glazing and wet surfaces.
  const probeTarget=new T.WebGLCubeRenderTarget(128,{type:rt.texture.type});
  const probe=new T.CubeCamera(.12,4900,probeTarget),filter=new T.PMREMGenerator(renderer);
  let filtered=null,probeZone=-1;
  function reflections(){
    const zone=s.distance<V.MID*.42?0:s.distance<V.MID+45?1:s.distance<V.END-85?2:3;
    if(zone===probeZone)return;probeZone=zone;
    const p=V.route(s.distance);
    probe.position.set(p.x,p.y+1.82,p.z);cab.car.visible=cab.hanger.visible=marker.visible=false;
    const shadow=renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate=false;scene.environment=morning;
    probe.update(renderer,scene);
    const previous=filtered;filtered=filter.fromCubemap(probeTarget.texture);
    scene.environment=filtered.texture;scene.environmentIntensity=.65;
    if(previous)previous.dispose();renderer.shadowMap.autoUpdate=shadow;
    cab.car.visible=cab.hanger.visible=true;marker.visible=!!sim.target()&&!s.held;
  }
  function resize(){
    const w=host.clientWidth,h=host.clientHeight;
    const dpr=Math.min(window.devicePixelRatio||1,w<650?1.60:1.36,Math.sqrt(1800000/(w*h)));
    renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);rt.setSize(Math.round(w*dpr),Math.round(h*dpr));finish.uniforms.pixel.value.set(1/rt.width,1/rt.height);
    camera.aspect=w/h;camera.updateProjectionMatrix();director.resize(camera.aspect);
  }
  function target(){
    const t=sim.target();activeRoots=[];marker.visible=true;let obj=null;
    if(t==='cabin'){
      obj=cab.med;focus.set(0,0,.080);hintSize=.276;activeRoots=[cab.car,cab.hanger];
      if(s.phase==='board'){obj=cab.car;focus.set(.2,.79,-1.28);marker.rotation.y=Math.PI;}
    }else if(t==='drive'){
      obj=cab.button;focus.set(0,0,.102);hintSize=.153;activeRoots=[cab.ctl];
      // A hand already holding the carriage stays attached when the camera enters.
      if(s.boarded.q<.85)activeRoots.push(cab.car);
    }else if(t==='boards'){
      const idx=Math.min(9,Math.max(0,Math.floor(s.walk*10+3)));obj=stations[1].boards[idx];focus.set(0,.070,0);hintSize=.16;activeRoots=[stations[1].floor];
      // The timber walkway may also be held between the raised tread plates.
    }else if(t==='scope'){obj=scope.head;focus.set(0,.13,.48);hintSize=.19;activeRoots=[scope.g];}
    else if(t==='chimes'){obj=bells.g;focus.set(0,1.64,.10);hintSize=.25;activeRoots=[bells.g];}
    else{marker.visible=false;hand.style.opacity=0;return;}
    obj.localToWorld(focus);marker.position.copy(focus);marker.scale.setScalar(hintSize*(1+.032*s.windowLight.q));
    if(t==='boards')marker.rotation.set(-Math.PI/2,0,0);
    else if(t==='cabin'&&s.phase!=='board')cab.med.getWorldQuaternion(marker.quaternion);
    else if(t==='drive')cab.button.getWorldQuaternion(marker.quaternion);
    else marker.quaternion.copy(camera.quaternion);
    markerMaterial.emissiveIntensity=.30+.45*s.windowLight.q;
    if(s.held){marker.visible=false;hand.style.opacity=0;return;}
    screen.copy(focus).project(camera);
    const elapsed=Math.max(0,s.idle-4),cycle=elapsed%3.15,reach=V.clamp(cycle/.65,0,1);
    const vis=s.hint&&screen.z>0&&screen.z<1&&Math.abs(screen.x)<.96&&Math.abs(screen.y)<.96;
    const opacity=vis?Math.min(1,cycle*3,Math.max(0,(2.46-cycle)*3))*.91:0;
    hand.style.opacity=opacity;
    const x=(.5+screen.x*.5)*host.clientWidth-15+(1-reach)*13,y=(.5-screen.y*.5)*host.clientHeight-9+(1-reach)*22;
    hand.style.transform='translate('+x+'px,'+y+'px) rotate(-12deg) scale('+(1-.075*reach)+')';
  }
  function pose(){
    const p=V.route(s.distance),day=s.day*s.day*(3-2*s.day);
    scene.fog.color.copy(morningFog).lerp(sunsetFog,day);scene.fog.density=.00052-.00011*(p.y-60)/60+day*.00007;
    sun.color.copy(sunAM).lerp(sunPM,day);sun.intensity=2.18-.37*day;
    sun.target.position.set(p.x,p.y,p.z-4);sun.position.set(p.x-51+32*day,p.y+77-day*54,p.z+43-146*day);
    ambient.color.copy(skyAM).lerp(skyPM,Math.min(1,day*.82+Math.max(0,p.y-59)*.0031));ambient.intensity=1.27-day*.23;
    skyMaterial.uniforms.day.value=day;
    cab.hanger.position.set(p.x,p.y,p.z);
    const r=s.roll.q;
    // Rotate around the overhead pin, including the translation of the suspended floor.
    cab.car.rotation.z=r;cab.car.position.set(p.x+Math.sin(r)*3.72,p.y+3.72*(1-Math.cos(r)),p.z);
    cab.door.forEach((leaf,i)=>{leaf.position.z=(i?1:-1)*s.door.q*.76;});cab.button.position.z=.20-s.drive.q*.042;cab.needle.rotation.z=1.04-s.speed*.35;
    for(const w of cab.wheels)w.rotation.x=-s.wheelAngle;
    for(const station of stations)station.segments.forEach((g,i)=>{const bend=s.flags[i].q-(i?s.flags[i-1].q:0);g.rotation.set(.11*s.flags[i].v,bend*.89,-.115+bend*.56);});
    stations[1].boards.forEach((b,i)=>{b.position.y=-.009+s.boards[i].q;});
    scope.head.rotation.y=1.20+s.scopeYaw.q*.34;scope.head.rotation.x=-.18-s.scope.q*.26;
    bells.parts.forEach((g,i)=>{g.rotation.z=s.chimes[i].q;bells.strikers[i].rotation.z=s.chimes[i].striker.q;g.rotation.x=s.flags[i+1].v*.035;});
    birds.forEach((b,i)=>{
      const v=s.birds[i];b.g.position.set(p.x+v.x,p.y+v.y,p.z+v.z);b.g.rotation.set(-v.vy*.08,-v.vx*.14,v.vx*.11);
      b.wings[0].rotation.z=-v.wingL.q;b.wings[1].rotation.z=v.wingR.q;
    });
    s.motes.forEach((m,i)=>{matrix.position.set(p.x+m.x,p.y+m.y,p.z+m.z);matrix.scale.setScalar((.004+m.seed*.007)*m.opacity);matrix.updateMatrix();motes.setMatrixAt(i,matrix.matrix);});motes.instanceMatrix.needsUpdate=true;
    bendTrees(s);if(drawTick++%3===0)waterUpdate(s);
    const e=director.camera.eye,l=director.camera.look;
    camera.position.set(e.x,e.y,e.z);
    const riding=s.phase==='ride'||s.phase==='climb';
    if(riding){camera.position.x+=Math.sin(r)*1.75*s.boarded.q;}
    camera.up.set(-Math.sin(r)*(riding?s.boarded.q:0),1,0);
    camera.lookAt(l.x,l.y,l.z);camera.zoom=1+1.45*V.clamp(s.scope.q,0,1);camera.updateProjectionMatrix();
    sky.position.copy(camera.position);optic.style.opacity=V.clamp(s.scope.q,0,1)*.97;
    const stage=({morning:0,ride:0,walk:1,look:1,board:2,climb:2,ridge:3,return:3})[s.phase];
    if(prevStage!==stage){stops.forEach((o,i)=>{o.classList.toggle('on',i===stage);o.classList.toggle('past',i<stage);});prevStage=stage;}
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);target();
  }
  function pointer(event){
    const rect=canvas.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(mouse,camera);
    if(!activeRoots.length)return false;
    const hits=ray.intersectObjects(activeRoots,true);
    if(hits.length)return true;
    // Keep the small physical control finger-sized even on a narrow phone.
    screen.copy(focus).project(camera);
    const dx=(mouse.x-screen.x)*rect.width*.5,dy=(mouse.y-screen.y)*rect.height*.5;
    return screen.z>0&&screen.z<1&&Math.hypot(dx,dy)<25;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(holding!==null||!e.isPrimary||e.button!==0)return;sound.wake();
    if(pointer(e)&&sim.press(sim.target())){holding=e.pointerId;startX=e.clientX;canvas.setPointerCapture(holding);sound.touch();e.preventDefault();}
  });
  canvas.addEventListener('pointermove',e=>{
    if(e.pointerId===holding){if(s.phase==='look'||s.phase==='ridge')sim.aim((e.clientX-startX)/(host.clientWidth*.3));}
    else if(e.pointerType==='mouse')canvas.style.cursor=pointer(e)?'pointer':'default';
  });
  function release(e){if(e&&e.pointerId!==holding)return;holding=null;sim.release();sim.aim(0);}
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,release);
  const mute=document.getElementById('sound');mute.addEventListener('click',()=>{const on=sound.toggle();mute.classList.toggle('muted',!on);mute.setAttribute('aria-pressed',String(on));});
  document.addEventListener('visibilitychange',()=>{release();if(document.hidden)sound.suspend();last=0;});
  window.addEventListener('blur',()=>release());window.addEventListener('resize',resize);
  let last=0;
  function frame(now){
    if(!document.hidden){
      step(last?Math.min(.1,(now-last)/1000):0);pose();reflections();sound.update(s);
      renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(finishScene,finishCam);
    }last=now;requestAnimationFrame(frame);
  }
  resize();pose();requestAnimationFrame(frame);
})();
