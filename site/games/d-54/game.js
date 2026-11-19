'use strict';
(()=>{
  const T=THREE,canvas=document.getElementById('world'),sim=LibraryPhysics.createGame(),s=sim.state;
  window.__GAME__={step:dt=>sim.step(dt),getState:sim.getState};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.09;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.035,46);
  scene.background=new T.Color(0xdce6db);scene.fog=new T.FogExp2(0xe3e3cf,.070);
  const hemi=new T.HemisphereLight(0xe0edff,0xdfc6a5,1.56);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffe3b4,3.55);sun.position.set(-3.9,5.45,2.52);sun.target.position.set(.35,.78,-.75);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-4.9,right:4.9,top:4.8,bottom:-4.8,near:.1,far:17});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00022;sun.shadow.normalBias=.004;
  const world=buildLibrary(scene,sim),audio=createRoomSound(),vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  const dampLight={value:s.light.x};
  const materials=new Set();
  scene.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial)materials.add(o.material);});
  for(const m of materials){
    // Soft penumbra from the window reveal and muntins, in world coordinates.
    // This adds bounced sunlight to the shadow-mapped key, including moving books.
    m.onBeforeCompile=shader=>{
      shader.uniforms.uDaylight=dampLight;
      shader.vertexShader='varying vec3 vLibraryPosition;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvec4 libPos=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nlibPos=instanceMatrix*libPos;\n#endif\nvLibraryPosition=(modelMatrix*libPos).xyz;');
      shader.fragmentShader='varying vec3 vLibraryPosition;uniform float uDaylight;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec3 P=vLibraryPosition;
        vec2 w=vec2(P.x-P.z*.59+P.y*.83, P.z+P.y*.97+P.x*.18);
        float pane=smoothstep(-2.85,-2.58,w.x)*(1.-smoothstep(.92,1.26,w.x))*smoothstep(-.95,-.66,w.y)*(1.-smoothstep(2.6,3.,w.y));
        vec2 bar=abs(fract((w+vec2(.16,.25))/vec2(.86,.88))-.5)*2.;
        float mullion=smoothstep(.022,.112,bar.x)*smoothstep(.025,.12,bar.y);
        float sunlight=pane*mullion*uDaylight;
        outgoingLight*=vec3(.92,.925,.925)+sunlight*vec3(.30,.23,.115);
        #include <opaque_fragment>`);
    };
  }
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
  const upright=Craft.upright,dummy=new T.Object3D(),lift=vec(),tmpQ=new T.Quaternion();
  const pathPoint=(i,p,out)=>{
    const src=world.start[i],dest=world.slots[i],f=smooth(p/.81),seat=smooth((p-.71)/.29);
    out.copy(src).lerp(dest,f);out.y+=Math.sin(Math.PI*f)*.19;
    out.z+=.28*f*(1-seat);return out;
  };
  function poseBooks(){
    const q=new T.Vector3();
    world.hinge.rotation.y=s.door.x;
    world.protrude.position.z=world.noseBase-s.nose.x;
    for(let i=0;i<4;i++){
      const b=s.books[i],model=world.bookModels[i],p=b.p;
      pathPoint(i,p,model.position);
      model.quaternion.copy(world.bookRot[i]).slerp(upright,smooth((p-.038)/.70));
      model.rotateY(b.jacket.x);model.position.y+=b.ripple.x;
      if(p>.78&&s.door.x>.00001){
        q.copy(model.position).sub(world.hinge.position).applyQuaternion(tmpQ.identity().slerp(world.hinge.quaternion,smooth((p-.78)/.22))).add(world.hinge.position);
        model.position.copy(q);model.quaternion.premultiply(tmpQ);
      }
    }
    world.windows[0].rotation.y=s.casements[0].x;world.windows[1].rotation.y=-s.casements[1].x;
    world.cups.forEach((c,i)=>{c.rotation.z=s.cups[i].tilt.x;c.position.y=.807+s.water[[17,36,25][i]].x;
      const jet=world.spills[i],h=Math.max(0,s.cups[i].jet.x);jet.scale.set(.006,h+.002,.006);jet.position.y=.805+h;});
    const water=world.surface.geometry,verts=water.attributes.position;
    for(let i=0;i<49;i++)verts.setY(i,s.water[i].x);
    verts.needsUpdate=true;water.computeVertexNormals();
    world.nozzle.rotation.z=s.spout.x;
    world.wheel.rotation.z=-s.wheel.angle;
    world.paddles.forEach((m,i)=>{m.roughness=.60-.33*s.wheel.wet[i];});
    const streamPoint=(u)=>vec(.215-(.017+s.sluice.x*.011)*u,1.075+.010*u-.057*u*u,-5.025+s.spout.x*.009*u);
    world.stream.forEach((o,i)=>{const a=streamPoint(i/10),b=streamPoint((i+1)/10),delta=b.clone().sub(a);
      o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(vec(0,1,0),delta.clone().normalize());
      o.scale.set(.85+s.sluice.x*.44,delta.length()+.0004,.85+s.sluice.x*.44);});
    world.boat.position.set(.245+s.boat.x.x,.812+s.water[24].x,-4.87+s.boat.z.x);
    world.boat.rotation.set(s.boat.roll.x,.38+s.boat.x.v,s.boat.roll.x*.61);
    world.coverHinge.rotation.z=-Math.PI+clamp(s.coverOpen.x,0,Math.PI);
    for(let j=0;j<3;j++){
      const sheet=world.sheets[j],geo=sheet.o.geometry,a=geo.attributes.position,progress=clamp(s.page.x-j);
      for(let i=0;i<a.count;i++){
        const [u,w]=sheet.original[i],k=Math.min(11,Math.floor(u*12)),r=u*.332;
        const fold=s.leaves[k].x*(.7+.3*w),angle=progress*Math.PI+(.58*Math.sin(progress*Math.PI)*(1-u)+fold)*u;
        a.setXYZ(i,.004+Math.cos(angle)*r,.024+((2-j)*(1-progress)+j*progress)*.0012+.009*Math.sin(u*Math.PI)+Math.sin(angle)*r+.004*u,w*.449-.2245);
      }
      a.needsUpdate=true;geo.computeVertexNormals();
      const sprout=world.sprouts[j];sprout.rotation.x=-Math.PI/2+smooth((s.page.x-j-.23)/.76)*1.42+s.leaves[4+j].x;
      sprout.visible=s.page.x>j+.26;
    }
    world.ribbon.rotation.z=s.leaves[10].x*.25;
    for(let i=0;i<s.dust.length;i++){
      const p=s.dust[i];dummy.position.set(p.x,p.y,p.z);
      const r=(.00095+.00105*p.weight)*(i%11===0?1.42:1);
      dummy.scale.set(r,r*(.71+p.weight*.5),r);dummy.rotation.set(p.vx*12,p.vy*15,i);dummy.updateMatrix();
      world.motes.setMatrixAt(i,dummy.matrix);
    }world.motes.instanceMatrix.needsUpdate=true;dampLight.value=s.light.x;
  }
  const flag={portrait:0},target=vec(),eye=vec();
  function cameraPose(){
    const n=flag.portrait;
    // The portrait viewpoint centres the return pile and the hinged bay together.
    eye.set(.99-1.56*n,2.27+.20*n,5.21+2.62*n);target.set(-.20-.24*n,1.46-.11*n,-.17);
    const travel=smooth(s.entry.x);
    // A waypoint in front of the opening keeps the camera clear of the pivot.
    eye.lerp(vec(.13,1.59,.38),smooth(travel/.63));target.lerp(vec(.18,1.39,-2.40),smooth(travel/.66));
    eye.lerp(vec(.20,1.61,-1.13+.14*n),smooth((travel-.53)/.47));
    target.lerp(vec(.225,1.43,-3.79),smooth((travel-.48)/.52));
    eye.lerp(vec(.24,1.69+.38*n,-3.23+.99*n),smooth(s.view.x));target.lerp(vec(.245,.823,-4.90),smooth(s.view.x));
    eye.lerp(vec(.48,1.67+.93*n,-1.63+1.69*n),smooth(s.deskView.x));target.lerp(vec(.46,.97,-2.54),smooth(s.deskView.x));
    camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();
  }
  const pos=(o,local)=>o.localToWorld(local||vec()),finger=document.getElementById('finger');
  const seals=Array.from(document.querySelectorAll('.seal'));
  function cues(){
    let from,to,idx=0,visible=true,cu=s.cups.findIndex(c=>!c.touched);
    if(s.phase==='shelf'){
      const i=s.book;from=pos(world.bookModels[i],vec(.037,world.bookSizes[i].t/2+.007,.017));
      to=world.slots[i].clone().add(vec(0,0,world.bookSizes[i].w*.52+.024));
    }else if(s.phase==='push'){
      from=pos(world.protrude,vec(-.159,0,.005));to=from.clone().add(vec(0,.009,-.13));idx=1;
    }else if(s.phase==='window'){
      from=pos(world.windows[1],vec(-.82,.76,.071));to=pos(world.windows[1],vec(-.45,.79,-.38));idx=1;
    }else if(s.phase==='water'){
      from=pos(world.cups[Math.max(cu,0)],vec(0,.033,0));to=from.clone().add(vec(.025,-.02,-.045));idx=2;visible=cu>=0;
    }else if(s.phase==='sail'){
      from=pos(world.boat,vec(0,.050,0));to=vec(.56,.865,-5.12);idx=2;
    }else if(s.phase==='pages'){
      from=pos(world.openBook,vec(.27,.045,.12));to=pos(world.openBook,vec(-.22,.085,.065));idx=3;
    }else if(s.phase==='ribbon'){
      from=pos(world.ribbon,vec(0,.032,.10));to=from.clone().add(vec(.01,-.028,.09));idx=3;
    }else{from=pos(world.protrude);to=from.clone();visible=false;idx=1;}
    return {from,to,idx,visible};
  }
  function guidePose(){
    const g=cues(),bx=s.phase==='shelf'?s.books[s.book].p:0;
    for(let i=0;i<world.pathDots.length;i++){
      const o=world.pathDots[i],f=(i+1)/10;
      o.visible=s.phase==='shelf'&&bx<.77;
      if(!o.visible)continue;o.position.copy(g.from).lerp(g.to,f);
      o.position.y+=Math.sin(f*Math.PI)*.175+s.air[i].u*.20;
      o.position.x+=Math.sin(f*Math.PI)*.055+s.air[i].u*.16;
      o.children[0].material.opacity=(.26+.43*Math.sin(f*2.7))*(1-smooth(bx/.77));
      o.rotation.y=s.air[i].u*8+i*.88;
    }
    world.knob.visible=g.visible;world.knob.position.copy(s.phase==='shelf'?g.to:g.from);
    world.knob.quaternion.copy(camera.quaternion);world.knob.scale.setScalar(.72+s.light.x*.29+s.air[2].u);
    const f=clamp(s.hintSweep.x);lift.copy(g.from).lerp(g.to,smooth(f));
    lift.y+=Math.sin(f*Math.PI)*(s.phase==='shelf'?.164:.022);
    lift.project(camera);const x=(lift.x*.5+.5)*innerWidth,y=(-lift.y*.5+.5)*innerHeight;
    finger.style.transform='translate('+(x-11)+'px,'+(y-10)+'px) rotate('+(-9+f*12)+'deg)';
    finger.style.opacity=g.visible?String(clamp(s.hint.x)*.88):'0';
    seals.forEach((o,i)=>o.classList.toggle('on',i===g.idx));
  }
  poseBooks();cameraPose();scene.updateMatrixWorld(true);
  // Capture the actual room and courtyard for polished brass, glass and water.
  function capture(at){
    const rt=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType});
    const cc=new T.CubeCamera(.08,22,rt);cc.position.copy(at);cc.update(renderer,scene);
    const pm=new T.PMREMGenerator(renderer),map=pm.fromCubemap(rt.texture);rt.dispose();pm.dispose();return map.texture;
  }
  scene.environment=capture(vec(-.45,1.44,.99));scene.environmentIntensity=.36;
  Craft.M.water.envMap=capture(vec(.25,.86,-4.88));Craft.M.water.envMapIntensity=.83;
  // One subtle optical finishing pass: highlight bloom, fine grain and corner falloff.
  const screenScene=new T.Scene(),screenCam=new T.OrthographicCamera(-1,1,1,-1,0,1),
    buffer=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)});
  const finish=new T.ShaderMaterial({uniforms:{image:{value:buffer.texture},pixel:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D image;uniform vec2 pixel;varying vec2 vUv;
    void main(){vec3 c=texture2D(image,vUv).rgb,bloom=vec3(0.);
      for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a))*pixel;
      bloom+=max(texture2D(image,vUv+d*4.).rgb-vec3(1.19),0.)*.006+max(texture2D(image,vUv+d*10.).rgb-vec3(1.39),0.)*.002;}
      vec2 q=(vUv-.5)*2.;c=(c+bloom)*(1.-.07*pow(dot(q,q)*.5,1.48));
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.005;
    }`,depthTest:false,depthWrite:false});
  screenScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  function resize(){
    const w=canvas.clientWidth,h=canvas.clientHeight;flag.portrait=clamp((1.04-w/h)/.57);
    const d=Math.min(devicePixelRatio||1,w<550?1.8:1.5);renderer.setPixelRatio(d);renderer.setSize(w,h,false);
    buffer.setSize(Math.floor(w*d),Math.floor(h*d));finish.uniforms.pixel.value.set(1/(w*d),1/(h*d));
    camera.aspect=w/h;camera.updateProjectionMatrix();cameraPose();
  }
  resize();window.addEventListener('resize',resize);
  const ray=new T.Raycaster(),pointer=new T.Vector2();
  const coords=(v)=>{const t=v.clone().project(camera);return {x:(t.x*.5+.5)*canvas.clientWidth,y:(.5-t.y*.5)*canvas.clientHeight};};
  function hittable(){
    if(s.phase==='shelf')return [world.bookModels[s.book]];
    if(s.phase==='push')return [world.protrude];
    if(s.phase==='window')return world.windows;
    if(s.phase==='water')return world.cups;
    if(s.phase==='sail')return [world.boat];
    if(s.phase==='pages')return [world.openBook];
    if(s.phase==='ribbon')return [world.ribbon];return [];
  }
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{
    if(drag||!e.isPrimary)return;audio.init();
    const list=hittable();if(!list.length)return;
    const x=e.clientX,y=e.clientY;
    pointer.set(x/canvas.clientWidth*2-1,1-y/canvas.clientHeight*2);
    ray.setFromCamera(pointer,camera);
    let hit=-1,dist=Infinity;
    list.forEach((o,i)=>{const h=ray.intersectObject(o,true)[0];if(h&&h.distance<dist){hit=i;dist=h.distance;}});
    // Thin book spines and metal handles have a child-sized contact allowance.
    if(hit<0){
      let closest=s.phase==='water'?23:24;
      list.forEach((obj,i)=>{const p=coords(s.phase==='water'?pos(obj):cues().from);const d=Math.hypot(p.x-x,p.y-y);if(d<closest){closest=d;hit=i;}});
    }
    if(hit<0)return;
    const g=cues(),end=coords(g.to),start=coords(g.from);
    const base=s.phase==='shelf'?s.books[s.book].p:s.phase==='push'?s.noseGoal:s.phase==='window'?s.windowGoal:s.phase==='pages'?s.pageGoal-s.turns:s.phase==='sail'?s.sailGoal:0;
    drag={id:e.pointerId,x,y,end,start,phase:s.phase,book:s.book,turn:s.turns,hit,base,moved:0};
    canvas.setPointerCapture(e.pointerId);
    sim.input(base,s.phase==='water'?'begin':'move',hit);canvas.style.cursor='grabbing';
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved=Math.max(drag.moved,Math.hypot(dx,dy));
    if(drag.phase!==s.phase||drag.book!==s.book||drag.turn!==s.turns)return;
    let progress=0;
    if(s.phase==='shelf'||s.phase==='sail'){
      const ax=drag.end.x-drag.start.x,ay=drag.end.y-drag.start.y,den=Math.max(24,Math.hypot(ax,ay));
      progress=(dx*ax+dy*ay)/(den*den);
      if(Math.hypot(e.clientX-drag.end.x,e.clientY-drag.end.y)<32)progress=1;
    }else if(s.phase==='pages')progress=-dx/Math.max(62,canvas.clientWidth*.20)+Math.max(0,-dy)*.002;
    else progress=Math.hypot(dx,dy)/(s.phase==='push'?41:78);
    sim.input(clamp(drag.base+progress*(1-drag.base)),'move',drag.hit);
  });
  function release(e,allowTap){
    if(!drag||drag.id!==e.pointerId)return;
    if(allowTap&&drag.moved<11&&drag.phase===s.phase&&drag.book===s.book&&drag.turn===s.turns&&s.phase!=='water')sim.input(1,'tap',drag.hit);
    sim.input(0,'end');drag=null;canvas.style.cursor='default';if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener('pointerup',e=>release(e,true));canvas.addEventListener('pointercancel',e=>release(e,false));
  canvas.addEventListener('lostpointercapture',e=>release(e,false));
  const sound=document.getElementById('sound');
  sound.addEventListener('click',()=>{const on=audio.toggle();sound.classList.toggle('off',!on);sound.setAttribute('aria-pressed',String(on));});
  let last=performance.now();
  function frame(now){
    const dt=Math.min(.08,Math.max(0,(now-last)/1000));last=now;sim.step(dt);poseBooks();cameraPose();guidePose();audio.update(s,sim.events());
    renderer.setRenderTarget(buffer);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(screenScene,screenCam);
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden&&drag){sim.input(0,'end');drag=null;}});
  requestAnimationFrame(frame);
})();
