'use strict';
(()=>{
  const T=THREE,sim=MorningRoute.create(),sound=new TruckSound(),canvas=document.getElementById('scene');
  window.__GAME__={step:dt=>sim.step(dt),getState:()=>sim.getState()};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.15,240);
  function makeSky(){
    const w=512,h=256,pixels=new Uint8Array(w*h*4);
    const zenith=new T.Color(0x80b3cf),haze=new T.Color(0xf2e8cf),lower=new T.Color(0x9aa58e),c=new T.Color();
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const el=Math.sin((j/(h-1)-.5)*Math.PI),az=i/(w-1)*2*Math.PI,
        mix=Math.pow(Math.max(0,el),.54);
      c.copy(haze).lerp(zenith,mix);
      if(el<0)c.lerp(lower,Math.min(1,-el*3.7));
      const band=Math.max(0,1-Math.abs(el-.23)*5.6),wisps=Math.sin(az*7+el*31)+.5*Math.sin(az*13-el*22)+.28*Math.cos(az*26+el*50);
      c.lerp(haze,Math.max(0,wisps-.57)*band*.27);
      c.convertLinearToSRGB();const k=(j*w+i)*4;pixels[k]=c.r*255;pixels[k+1]=c.g*255;pixels[k+2]=c.b*255;pixels[k+3]=255;
    }
    const t=new T.DataTexture(pixels,w,h);t.colorSpace=T.SRGBColorSpace;t.mapping=T.EquirectangularReflectionMapping;t.minFilter=t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;
  }
  scene.background=makeSky();scene.fog=new T.FogExp2(0xd4dfd5,.0127);
  scene.add(new T.HemisphereLight(0xdcecf6,0xc8b797,1.61));
  const sun=new T.DirectionalLight(0xffedcc,2.52);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:78});
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00019;sun.shadow.normalBias=.028;sun.shadow.radius=2.0;
  scene.add(sun,sun.target);
  const world=buildWorld(scene),truck=buildTruck(scene);
  function contactMap(){
    const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d'),v=g.createRadialGradient(48,48,2,48,48,46);
    v.addColorStop(0,'rgba(38,43,31,0.60)');v.addColorStop(.47,'rgba(49,49,38,0.42)');v.addColorStop(.78,'rgba(55,57,42,0.15)');v.addColorStop(1,'rgba(60,60,47,0)');
    g.fillStyle=v;g.fillRect(0,0,96,96);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  const contact=new T.Mesh(new T.PlaneGeometry(6.92,3.15),new T.MeshStandardMaterial({map:contactMap(),transparent:true,depthWrite:false,roughness:1,roughnessMap:Kit.mat(0x555555).roughnessMap,polygonOffset:true,polygonOffsetFactor:-1}));
  contact.rotation.x=-Math.PI/2;contact.position.set(0,.029,0);truck.root.add(contact);
  const guide=Kit.group(scene),ink=Kit.mat(0xffebae,.58,.08,{emissive:0xe9c279,emissiveIntensity:.21});
  for(let i=0;i<8;i++){
    const arc=new T.Mesh(new T.TorusGeometry(.61,.022,7,12,.48),ink);arc.rotation.set(Math.PI/2,0,i*Math.PI/4);guide.add(arc);
  }
  const reflection=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType,generateMipmaps:false}),probe=new T.CubeCamera(.24,180,reflection),pmrem=new T.PMREMGenerator(renderer);
  let localEnv=null,lastArea=-1;
  function updateReflection(area){
    scene.environment=null;truck.root.visible=false;guide.visible=false;
    probe.position.set(sim.s.distance+.35,2.1,1.25);probe.update(renderer,scene);
    const next=pmrem.fromCubemap(reflection.texture);scene.environment=next.texture;scene.environmentIntensity=.54;
    if(localEnv)localEnv.dispose();localEnv=next;truck.root.visible=true;lastArea=area;
  }
  const buffer=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)});
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({uniforms:{picture:{value:buffer.texture},pixel:{value:new T.Vector2()}},depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D picture;uniform vec2 pixel;varying vec2 vUv;
    vec3 bright(vec2 uv){vec3 c=texture2D(picture,uv).rgb;return c*smoothstep(1.02,2.1,dot(c,vec3(.2126,.7152,.0722)));}
    void main(){vec3 c=texture2D(picture,vUv).rgb;
      vec2 a=pixel*3.7;vec3 bloom=bright(vUv+a)+bright(vUv-a)+bright(vUv+vec2(a.x,-a.y))+bright(vUv+vec2(-a.x,a.y));
      c+=bloom*.009;vec2 d=(vUv-.5)*vec2(1.,.88);c*=1.-.115*smoothstep(.21,.68,length(d));
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.004;
    }`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  let width=1,height=1;
  function resize(){width=canvas.clientWidth;height=canvas.clientHeight;
    const ratio=Math.min(window.devicePixelRatio||1,1.45,Math.sqrt(1800000/(width*height)));
    renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);buffer.setSize(Math.round(width*ratio),Math.round(height*ratio));
    finish.uniforms.pixel.value.set(1/buffer.width,1/buffer.height);camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  resize();window.addEventListener('resize',resize);
  const raycaster=new T.Raycaster(),ndc=new T.Vector2(),v=new T.Vector3(),point=new T.Vector3(),aim=new T.Vector3();
  const badge=document.querySelectorAll('.stop'),finger=document.getElementById('finger'),mute=document.getElementById('sound');
  let pointer=null,lastBadge=-1;
  function pick(e){
    ndc.set(e.clientX/width*2-1,1-e.clientY/height*2);raycaster.setFromCamera(ndc,camera);
    const active=sim.target();
    if(active && active!=='truck'){
      const obj=world.controls[active];
      if(raycaster.intersectObject(obj,true).length) return active;
      obj.getWorldPosition(v);v.project(camera);
      if(Math.hypot((v.x-ndc.x)*width/2,(v.y-ndc.y)*height/2)<Math.max(32,Math.min(width,height)*.068))return active;
    }
    if(raycaster.intersectObject(truck.root,true).some(hit=>hit.object!==contact))return 'truck';
    const hit=raycaster.intersectObjects(world.bagModels.filter(q=>q.visible),true)[0];
    if(hit){let o=hit.object;while(o){const i=world.bagModels.indexOf(o);if(i>=0)return 'bag'+i;o=o.parent;}}
    return '';
  }
  canvas.addEventListener('pointerdown',e=>{if(pointer!==null)return;
    sound.wake();pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);sim.press(pick(e));});
  function lift(e){if(e.pointerId===pointer){pointer=null;sim.release();}}
  canvas.addEventListener('pointerup',lift);canvas.addEventListener('pointercancel',lift);canvas.addEventListener('lostpointercapture',lift);
  mute.addEventListener('click',()=>{sound.wake();sound.mute();mute.classList.toggle('muted',sound.muted);mute.setAttribute('aria-pressed',String(sound.muted));mute.setAttribute('aria-label',sound.muted?'音を出す':'音を消す');});
  function compose(){
    const s=sim.s,ar=camera.aspect,portrait=1-Math.max(0,Math.min(1,(ar-.48)/.72));
    const x=s.distance-s.lap*MorningRoute.LENGTH;
    const river=Math.min(1,Math.max(0,(x-66)/35),Math.max(0,(172-x)/27));
    const focusHeight=1.73+portrait*.17+river*.38;
    // A narrower screen looks further along the street to keep both kerb and hopper in frame.
    const yaw=.63+portrait*.46,aspectDistance=8.85/(Math.max(.35,ar)*2*Math.tan(19*Math.PI/180)),
      distance=Math.max(9.4,aspectDistance)*(1+river*.18+s.view[2].x);
    const pitch=.283+portrait*.078+river*.036;
    aim.set(s.distance+.48+portrait*.72+s.view[0].x,focusHeight,1.0-portrait*.16+s.view[1].x);
    camera.position.set(aim.x-distance*Math.sin(yaw)*Math.cos(pitch),aim.y+distance*Math.sin(pitch),aim.z+distance*Math.cos(yaw)*Math.cos(pitch));
    camera.lookAt(aim);camera.updateMatrixWorld();
    sun.position.set(s.distance-21,15,16);sun.target.position.set(s.distance+1,0,-.8);
    const area=s.stop<3?0:s.stop===3?1:s.stop===4?2:3;
    if(area!==lastBadge){badge.forEach((e,i)=>{e.classList.toggle('active',i===area);e.classList.toggle('done',i<area);});lastBadge=area;}
    const district=Math.floor(s.distance/36);
    if(district!==lastArea)updateReflection(district);
    const active=sim.target();
    guide.visible=s.stop<3&&(s.mode==='drive'||s.phase==='reach')&&s.bags[s.stop].mode==='ground';
    if(guide.visible){const b=s.bags[s.stop];guide.position.set(b.x,.109,b.z);guide.rotation.y=s.wind[3].x*.20;ink.emissiveIntensity=.30+s.finger.x*.26;}
    if(active==='truck')point.set(s.distance-.51,2.05,2.43);
    else if(active){
      const obj=world.controls[active];
      point.set(0,active==='lever'?.68:0,0);obj.localToWorld(point);
      guide.position.set(point.x,.112,point.z);guide.visible=true;
      ink.emissiveIntensity=.41+s.finger.x*.31;
    }
    if(active){
      v.copy(point).project(camera);const f=s.finger.x,px=(v.x+1)*width/2,py=(1-v.y)*height/2;
      finger.style.transform='translate('+Math.round(px-5+(1-f)*12)+'px,'+Math.round(py-6+(1-f)*17)+'px) rotate('+(-13+f*9)+'deg) scale('+(.94+(1-f)*.1)+')';
      finger.style.opacity=String(Math.min(.88,Math.max(0,(s.idle-3.9)*2.5))*Math.min(1,f*4));
    }else finger.style.opacity='0';
  }
  let prev=performance.now();
  function render(now){
    const dt=Math.max(0,Math.min(.08,(now-prev)/1000));prev=now;
    sim.step(dt);world.update(sim);truck.update(sim);compose();sound.update(sim.s,sim.drain());
    renderer.setRenderTarget(buffer);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
    requestAnimationFrame(render);
  }
  function suspend(){pointer=null;sim.release();if(sound.ctx&&document.hidden)sound.ctx.suspend();prev=performance.now();}
  document.addEventListener('visibilitychange',suspend);window.addEventListener('blur',suspend);
  world.update(sim);truck.update(sim);compose();requestAnimationFrame(render);
})();
