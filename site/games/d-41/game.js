'use strict';
(()=>{
  const {T,V,PI}=Craft,canvas=document.getElementById('room'),D=7.10,game=WindowPhysics.create(),s=game.getState();
  window.__GAME__={step:dt=>game.step(dt),getState:()=>structuredClone(s)};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  renderer.transmissionResolutionScale=.8;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.06,130);
  scene.fog=new T.FogExp2(0xd3d9cb,.027);
  const sun=new T.DirectionalLight(0xffedcd,2.5),skyLight=new T.HemisphereLight(0xdfecfa,0xc5ad89,1.65);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:41});
  sun.shadow.normalBias=.016;sun.shadow.bias=-.00020;sun.shadow.camera.updateProjectionMatrix();scene.add(sun,sun.target,skyLight);
  function sky(){
    const w=384,h=192,a=new Float32Array(w*h*4),sunDir=V(-.42,.58,-.87).normalize();
    const horizon=new T.Color(0xf2e8d2),blue=new T.Color(0x92c0cd),zenith=new T.Color(0x689eb7),ground=new T.Color(0x9a977f),c=new T.Color();
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const u=(x+.5)/w,v=(y+.5)/h,lat=(v-.5)*PI,lon=(u-.5)*2*PI,vy=Math.sin(lat),vx=Math.cos(lat)*Math.cos(lon),vz=Math.cos(lat)*Math.sin(lon);
      if(vy<0)c.copy(horizon).lerp(ground,Math.min(1,-vy*4));
      else{c.copy(horizon).lerp(blue,1-Math.exp(-vy*4.9));c.lerp(zenith,Math.max(0,vy-.22)*.72);}
      const k=4*(y*w+x),dot=vx*sunDir.x+vy*sunDir.y+vz*sunDir.z,glow=Math.max(0,dot)**22*.28+Math.max(0,dot)**5200*11;
      const cloud=Math.max(0,Craft.noise(u*23,v*47)+.36*Craft.noise(u*63,v*116)-.77)*.17*Math.max(0,Math.min(1,vy*5));
      a[k]=c.r+glow+cloud;a[k+1]=c.g+glow*.88+cloud;a[k+2]=c.b+glow*.65+cloud*.92;a[k+3]=1;
    }
    const tex=new T.DataTexture(a,w,h,T.RGBAFormat,T.FloatType);tex.mapping=T.EquirectangularReflectionMapping;tex.needsUpdate=true;scene.background=tex;
    return tex;
  }
  const skyTex=sky(),env=new T.PMREMGenerator(renderer);
  const skyEnv=env.fromEquirectangular(skyTex);scene.environment=skyEnv.texture;scene.environmentIntensity=.80;
  const layout={width:innerWidth,height:innerHeight,w:3,distance:9};
  function measure(){const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight,aspect=width/height;
    layout.width=width;layout.height=height;layout.distance=8.97+Math.max(0,1-aspect)*1.8;
    layout.w=Math.max(1.46,Math.min(4.62,2*Math.tan(PI/12)*layout.distance*aspect*.825));
    camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
  }
  measure();
  const garden=makeGarden(scene,D),room=makeRoom(scene,D,layout.w,game),balcony=makeBalcony(scene,D),audio=makeSound();
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)});
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({uniforms:{source:{value:target.texture},pixel:{value:new T.Vector2()}},depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 q;void main(){q=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D source;uniform vec2 pixel;varying vec2 q;
      vec3 hot(vec2 p){vec3 c=texture2D(source,p).rgb;return c*smoothstep(1.45,3.1,max(max(c.r,c.g),c.b));}
      void main(){vec3 c=texture2D(source,q).rgb;vec2 d=pixel*3.;vec3 glow=hot(q+vec2(d.x,d.y))+hot(q+vec2(-d.x,d.y))+hot(q+vec2(d.x,-d.y))+hot(q-d);
      c+=.012*glow;c*=1.-.114*pow(length((q-.5)*1.43),1.65);gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(fract(sin(mod(dot(gl_FragCoord.xy,vec2(12.9898,78.233)),247.))*43758.5453)-.5)*.004;}`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  function resize(){measure();const pr=renderer.getPixelRatio();target.setSize(Math.round(layout.width*pr),Math.round(layout.height*pr));finish.uniforms.pixel.value.set(1/target.width,1/target.height);
    s.width=layout.w*(s.stage>=2?1.055:1);}
  resize();window.addEventListener('resize',resize);
  const camOut=V(),aim=V(),camIn=V(),focus=V(),look=V();
  function pose(){
    const w=s.walk,rootX=D*s.rail,z=layout.distance,eye=1.83,portrait=camera.aspect<.8;
    camIn.set(rootX+.065,eye,z);aim.set(rootX,portrait?1.26:1.47,0);
    camOut.set(2*D+.78,1.54,-1.35);focus.set(2*D+2.1,1.58,-8.5);
    camera.position.copy(camIn).lerp(camOut,w);
    // Interpolate gaze directions so the camera passes through the opening continuously.
    look.copy(aim).sub(camIn).normalize().lerp(focus.clone().sub(camOut).normalize(),w).normalize().add(camera.position);
    camera.lookAt(look);camera.updateMatrixWorld();
    sun.target.position.set(rootX,.25,-2.1);sun.position.set(rootX-7.4,12.5,-10.6);
    const light=s.panes[Math.min(s.stage,2)].light;
    sun.intensity=2.25+.91*light;skyLight.intensity=1.39+.29*light;
  }
  pose();room.update(s,layout.w);garden.update(s);balcony.update(s);scene.updateMatrixWorld(true);
  // Capture the modeled sash, sky, sill and garden in the enamel, steel and wet surfaces.
  const probe=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
  const cube=new T.CubeCamera(.06,100,probe);cube.position.set(.35,.95,.48);
  for(const m of room.modules)m.pane.visible=false;
  cube.update(renderer,scene);const reflection=env.fromCubemap(probe.texture);scene.environment=reflection.texture;
  for(const m of room.modules)m.pane.visible=true;
  probe.dispose();env.dispose();skyEnv.dispose();
  const ray=new T.Raycaster(),ndc=new T.Vector2(),surface=new T.Plane(V(0,0,1),-.10),at=V();
  let pointer=null,drag='',offsetU=0,offsetV=0,lastY=0,lastX=0,whichCloth=0;
  function project(e){ndc.set(e.clientX/layout.width*2-1,1-e.clientY/layout.height*2);ray.setFromCamera(ndc,camera);}
  function hit(o){return ray.intersectObject(o,true)[0];}
  function onGlass(){ray.ray.intersectPlane(surface,at);return {u:(at.x-D*Math.min(s.stage,2))/s.width+.5,v:at.y/game.H};}
  function nearObject(v,pixels){const n=v.clone().project(camera);return Math.hypot((n.x-ndc.x)*layout.width*.5,(n.y-ndc.y)*layout.height*.5)<pixels;}
  function strength(e){return e.pressure>0?e.pressure:.5;}
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null||e.button>0)return;project(e);audio.start();drag='';
    const u=Math.min(s.stage,2),m=room.modules[u],glassHit=hit(m.pane),hand=hit(room.tool),p=onGlass();
    if(s.mode==='wipe'&&(hand||glassHit)){
      drag='wipe';offsetU=hand?s.tool.x-p.u:0;offsetV=hand?s.tool.y-p.v:0;
      game.touch(p.u+offsetU,p.v+offsetV,strength(e));s.waterV+=hand?.06:0;
    }else if(s.mode==='garden'&&nearObject(garden.jetBase,Math.max(36,layout.height*.11))){game.act();}
    else if(s.mode==='mail'&&(hit(garden.mail)||nearObject(garden.flag.getWorldPosition(V()),Math.max(30,layout.height*.05)))){game.act();}
    else if(s.mode==='latch'&&(hit(m.handle)||nearObject(m.handle.getWorldPosition(V()),35))){game.act();}
    else if(s.mode==='outside'){
      const clothHit=ray.intersectObjects(balcony.panels.map(p=>p.o))[0];
      if(clothHit){whichCloth=clothHit.object.userData.panel;drag='cloth';game.gust(whichCloth,clothHit.uv.x,1-clothHit.uv.y,3.5);}
      else if(nearObject(balcony.charm.localToWorld(V(0,-.78,0)),28)){audio.chime();game.act();}
    }else if(s.walk<.1&&hit(room.bucket)){s.waterV=Math.min(.4,s.waterV+.14);audio.splash();}
    if(drag){pointer=e.pointerId;lastY=e.clientY;lastX=e.clientX;canvas.setPointerCapture(pointer);}
    e.preventDefault();
  });
  canvas.addEventListener('pointermove',e=>{
    if(pointer!==e.pointerId)return;project(e);
    if(drag==='wipe'&&s.mode==='wipe'){const p=onGlass(),u=p.u+offsetU,v=p.v+offsetV;
      if(u<-.045||u>1.045||v<-.028||v>1.028)game.release();else game.touch(u,v,strength(e));}
    if(drag==='cloth'){const h=hit(balcony.panels[whichCloth].o);if(h)game.gust(whichCloth,h.uv.x,1-h.uv.y,Math.min(4,Math.hypot(e.clientX-lastX,e.clientY-lastY)*.13));}
    lastY=e.clientY;lastX=e.clientX;
  });
  function finishTouch(e){if(pointer!==e.pointerId)return;pointer=null;drag='';game.release();}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,finishTouch);
  let last=0;
  function render(now){
    requestAnimationFrame(render);
    if(document.hidden){last=0;return;}
    const dt=last?Math.min(.065,(now-last)*.001):0;last=now;
    s.width=layout.w*(s.stage>=2?1.055:1);game.step(dt);
    pose();garden.update(s);room.update(s,layout.w);balcony.update(s);audio.update(s);
    if(s.mode==='outside'&&room.demo.visible){
      const p=balcony.panels[1].base[35],sweep=(s.hintAge%3.9)/3.9;
      room.demo.position.set(2*D+p[0]+sweep*.34,p[1]+sweep*.16,p[2]+.19);
    }
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  }
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){game.release();pointer=null;}});
  requestAnimationFrame(render);
})();
