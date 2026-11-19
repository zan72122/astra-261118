'use strict';
(()=>{
  const T=THREE,canvas=document.querySelector('#room'),sim=FutonPhysics.create(),s=sim.state,sound=makeSound();
  window.__GAME__={step:sim.step,getState:sim.getState,hit:sim.hit,act:sim.act};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene();scene.background=new T.Color('#c3d9dd');scene.fog=new T.FogExp2('#cbd8d4',.013);
  const camera=new T.PerspectiveCamera(32,1,.055,160);
  const ambient=new T.HemisphereLight(0xe3efff,0xe4c59e,1.56);scene.add(ambient);
  const sun=new T.DirectionalLight(0xffe1ac,2.48);scene.add(sun,sun.target);
  sun.position.set(-3.8,5.3,-8.0);sun.target.position.set(-.1,.2,.7);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5.8,right:5.8,top:5.4,bottom:-5.4,near:.1,far:24});sun.shadow.bias=-.00012;sun.shadow.normalBias=.014;sun.shadow.radius=2;
  const W=buildWorld(scene),B=makeBedding(scene,W,sim),V=W.V;
  const domeG=new T.SphereGeometry(96,48,28);const skyColors=[],skyDay=new T.Color('#85bcd5'),skyLow=new T.Color('#e8e8d2');
  for(let i=0;i<domeG.attributes.position.count;i++){let f=FutonPhysics.clamp(domeG.attributes.position.getY(i)/96*2.7);const c=skyLow.clone().lerp(skyDay,Math.sqrt(f));skyColors.push(c.r,c.g,c.b);}
  domeG.setAttribute('color',new T.Float32BufferAttribute(skyColors,3));
  const skyMat=Loom.mat('#ffffff',{side:T.BackSide,vertexColors:true,fog:false,depthWrite:false});
  skyMat.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=diffuseColor.rgb*1.06;\n#include <opaque_fragment>');};
  const dome=new T.Mesh(domeG,skyMat);scene.add(dome);dome.renderOrder=-10;
  const clouds=Loom.mat('#fff1d9',{roughness:1});clouds.emissive.set('#b4c1bd');clouds.emissiveIntensity=.31;
  for(let i=0;i<4;i++){const cx=-33+i*18,cy=4.7+Loom.rng()*2.9,cz=-49+Loom.rng()*6;for(let j=0;j<8;j++){let a=W.ell(cx+j*1.25,cy+Math.sin(j*.7)*.35,cz+Loom.rng()*.65,2+Loom.rng()*1.8,.42+Loom.rng()*.8,1.5,clouds,scene);a.castShadow=false;}}
  // Surroundings captured once provide the sky and wooden frame reflected in glass and steel.
  B.update(0);
  const probe=new T.PMREMGenerator(renderer),reflections=probe.fromScene(scene,0,.08,110,{size:64,position:V(0,1.62,-2.8)});
  scene.environment=reflections.texture;scene.environmentIntensity=.29;probe.dispose();
  const beams=[];
  for(let i=0;i<3;i++){
    const m=Loom.mat('#fff2cd',{emissive:0xffe2a0,emissiveIntensity:.7,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,opacity:.039});
    m.onBeforeCompile=sh=>{
      sh.vertexShader='varying vec2 beamUV;\n'+sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nbeamUV=uv;');
      sh.fragmentShader='varying vec2 beamUV;\n'+sh.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=pow(max(0.,sin(beamUV.x*3.14159)),2.6)*pow(sin(beamUV.y*3.14159),.65);');
    };
    const g=new T.PlaneGeometry(1,1),p=g.attributes.position,x=-2.65+i*.83;
    p.setXYZ(0,x,3.02,-2.39);p.setXYZ(1,x+.47,3.02,-2.39);p.setXYZ(2,x+1.88,.018,1.75);p.setXYZ(3,x+2.63,.018,1.75);p.needsUpdate=true;g.computeVertexNormals();
    const o=new T.Mesh(g,m);o.renderOrder=2;scene.add(o);beams.push(o);
  }
  const particleMat=Loom.mat('#fff3ca',{emissive:0xffe5a9,emissiveIntensity:.74,roughness:.8});
  const dust=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),particleMat,160);dust.frustumCulled=false;scene.add(dust);
  const particlePose=new T.Object3D();
  // Linear radiance is resolved before a restrained highlight bloom, film grain and vignette.
  const target=new T.WebGLRenderTarget(2,2,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:renderer.capabilities.maxSamples>=4?2:0});
  const post=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({uniforms:{frame:{value:target.texture},texel:{value:new T.Vector2()},noiseSeed:{value:0}},
    depthTest:false,depthWrite:false,vertexShader:'varying vec2 q;void main(){q=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame;uniform vec2 texel;uniform float noiseSeed;varying vec2 q;
    void main(){vec3 c=texture2D(frame,q).rgb;vec3 b=vec3(0.);
      for(int j=0;j<8;j++){float a=float(j)*.785398;vec3 k=texture2D(frame,q+vec2(cos(a),sin(a))*texel*4.).rgb;b+=max(k-vec3(1.05),vec3(0.));}
      c+=b*.008;float vign=dot(q-.5,q-.5);c*=1.-.235*vign;
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy+noiseSeed,vec2(12.9898,78.233)))*43758.5453)-.5)*.009;
    }`});
  post.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  const roomPos=V(0,0,0),roomLook=V(0,0,0),outsidePos=V(0,0,0),outsideLook=V(0,0,0);
  function cameraPose(){
    const aspect=camera.aspect,portrait=FutonPhysics.clamp((1.12-aspect)/.66),distance=Math.max(0,1/aspect-.90);
    roomPos.set(1.72-portrait*.62,2.16+distance*.86,6.42+distance*5.82);
    roomLook.set(-.23+portrait*.02,1.085+portrait*.05,.59+portrait*.34);
    outsidePos.set(1.42-portrait*.78,2.02+distance*.18,1.56+distance*4.25);
    outsideLook.set(-.34,1.54,-3.72);
    let f=s.travel*s.travel*(3-2*s.travel),quiet=s.stow;
    camera.position.copy(roomPos).lerp(outsidePos,f);camera.position.z+=quiet*.19;camera.position.y+=quiet*.13;
    const aim=roomLook.clone().lerp(outsideLook,f);aim.x-=quiet*.53;camera.lookAt(aim);camera.updateMatrixWorld();
  }
  function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    let pix=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(pix.x,pix.y);finish.uniforms.texel.value.set(1/pix.x,1/pix.y);cameraPose();}
  resize();window.addEventListener('resize',resize);
  const stages=[...document.querySelectorAll('#journey span')],finger=document.querySelector('#finger'),button=document.querySelector('#audio');
  button.addEventListener('click',()=>{const off=sound.toggle();button.classList.toggle('off',off);button.setAttribute('aria-pressed',String(!off));});
  const ray=new T.Raycaster(),mouse=new T.Vector2();
  function screen(p){p=p.clone().project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}
  function pick(x,y){mouse.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(mouse,camera);
    const quilt=ray.intersectObject(B.hero,false)[0];const bat=ray.intersectObject(B.bat,true)[0];
    const a=screen(B.bat.localToWorld(V(0,0,.05))),b=screen(B.bat.localToWorld(V(0,0,1.12)));
    let k=FutonPhysics.clamp(((x-a.x)*(b.x-a.x)+(y-a.y)*(b.y-a.y))/Math.max(1,(a.x-b.x)**2+(a.y-b.y)**2));
    const onBat=Math.hypot(x-a.x-k*(b.x-a.x),y-a.y-k*(b.y-a.y))<18;
    if((bat||onBat)&&['beat','lift'].includes(s.phase)&&(!quilt||onBat||bat.distance<quilt.distance))return {type:'bat',u:.78,v:.63,pt:B.at(.78,.63)};
    if(quilt)return {type:'cloth',u:FutonPhysics.clamp(quilt.uv.x),v:FutonPhysics.clamp(1-quilt.uv.y),pt:quilt.point};
    const rod=ray.intersectObjects(W.rodParts,false)[0];if(rod)return {type:'rod',pt:rod.point};
    return null;
  }
  let pointer=null;
  function aim(u,v){B.drag.toU=u;B.drag.toV=v;B.drag.held=true;}
  canvas.addEventListener('pointerdown',e=>{
    if(pointer||!e.isPrimary)return;sound.open();sim.wake();
    const hit=pick(e.clientX,e.clientY);if(!hit)return;
    if(hit.type==='rod'&&s.phase!=='lift')return;
    canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,first:hit,
      lastX:e.clientX,lastY:e.clientY,lastTime:e.timeStamp,speed:1.35,distance:0,sinceHit:0,phase:s.phase,didHit:false,fanIn:0};
    if(s.phase==='beat'||hit.type==='bat')aim(hit.u,hit.v);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointer||e.pointerId!==pointer.id)return;const p=pointer,dx=e.clientX-p.lastX,dy=e.clientY-p.lastY,
      pixels=Math.hypot(dx,dy),dt=Math.max(.008,(e.timeStamp-p.lastTime)/1000);
    const depth=p.first.pt.distanceTo(camera.position),metres=pixels/innerHeight*2*depth*Math.tan(16*Math.PI/180);
    p.speed=FutonPhysics.clamp(metres/dt,1,4);p.distance+=pixels;p.sinceHit+=metres;p.fanIn+=metres;p.lastX=e.clientX;p.lastY=e.clientY;p.lastTime=e.timeStamp;
    const hit=pick(e.clientX,e.clientY);sim.wake();
    if(p.phase==='beat'||p.first.type==='bat'){
      // Raycast the cloth independently while the moving cane overlaps it.
      const surface=ray.intersectObject(B.hero,false)[0];
      if(surface){let u=surface.uv.x,v=1-surface.uv.y;aim(u,v);if(p.sinceHit>.16&&sim.hit(u,v,p.speed)){p.didHit=true;p.sinceHit=0;}}
    }else if(['air','sun','turn','collect'].includes(p.phase)&&hit?.type==='cloth'&&p.fanIn>.09){
      sim.act('fan',hit.u,hit.v,p.speed);p.fanIn=0;
    }
  });
  function release(e,cancel=false){
    if(!pointer||pointer.id!==e.pointerId)return;
    const p=pointer;pointer=null;B.drag.held=false;
    if(cancel)return;const h=p.first;sim.wake();
    if(p.phase==='beat'||h.type==='bat'){
      if(!p.didHit){aim(h.u,h.v);sim.hit(h.u,h.v,p.speed);B.drag.held=false;B.drag.linger=.27;}return;
    }
    if(p.phase==='lift'){sim.act('hang');return;}
    if(h.type!=='cloth')return;
    if(p.phase==='air'||p.phase==='sun'){if(p.distance<14)sim.hit(h.u,h.v,1.2);sim.act('fan',h.u,h.v,p.speed);}
    else if(p.phase==='turn')sim.act('turn');
    else if(p.phase==='collect')sim.act('collect');
    else if(p.phase==='fold')sim.act('fold');
    else if(p.phase==='store')sim.act('store');
  }
  canvas.addEventListener('pointerup',e=>release(e));canvas.addEventListener('pointercancel',e=>release(e,true));canvas.addEventListener('lostpointercapture',e=>release(e,true));
  function guide(dt){
    let stage=['beat','lift'].includes(s.phase)?0:['hanging','air','turn','turning'].includes(s.phase)?1:['sun','collect'].includes(s.phase)?2:3;
    if(s.phase==='dawn')stage=0;
    stages.forEach((el,i)=>{el.classList.toggle('active',i===stage);el.classList.toggle('done',i<stage);});
    if(s.idle<4||pointer||['hanging','turning','returning','stowing','rest','dawn'].includes(s.phase)){finger.style.opacity=0;return;}
    const cyc=(s.idle-4)%4.4,progress=FutonPhysics.clamp((cyc-.36)/1.3);let from,to;
    if(s.phase==='beat'){from=B.bat.localToWorld(V(0,0,.38));to=B.at(.65,.58);}
    else if(s.phase==='lift'){from=B.at(.65,.38);to=V(.12,1.9,-3.10);}
    else if(s.phase==='collect'){from=B.at(.66,.83);to=from.clone().add(V(.02,.33,.67));}
    else if(s.phase==='fold'){from=B.at(s.fold>.9?.72:.06,s.fold>.9?.94:.56);to=B.at(.81,s.fold>.9?.13:.53);}
    else if(s.phase==='store'){from=B.at(.78,.31);to=from.clone().add(V(-.86,.1,-.38));}
    else{from=B.at(.23,.83);to=B.at(.76,s.phase==='turn'?.51:.83);}
    const n=progress*progress*(3-2*progress),q=screen(from.lerp(to,n));
    finger.style.transform='translate('+(q.x-11)+'px,'+(q.y-3-7*Math.sin(n*Math.PI))+'px)';
    finger.style.opacity=String(.87*FutonPhysics.clamp(cyc/.34)*FutonPhysics.clamp((2.32-cyc)/.48));
  }
  const morning=new T.Color('#ffdfaa'),evening=new T.Color('#ffb582'),skyEvening=new T.Color('#edc4ab'),fogDay=new T.Color('#cbd8d4'),fogEvening=new T.Color('#e2c6ac');
  function draw(dt){
    cameraPose();B.update(dt);
    const light=s.dayLight;sun.color.copy(morning).lerp(evening,light);sun.position.set(-3.8-light*2.7,5.3-light*2.1,-8+light*.8);sun.intensity=2.48-light*.38;
    skyMat.color.setRGB(1,1,1).lerp(skyEvening,light*.51);scene.fog.color.copy(fogDay).lerp(fogEvening,light);ambient.intensity=1.56-light*.25;
    beams.forEach((o,i)=>{o.material.opacity=(.023+.016*s.zones[i+1].wind)*(1-light*.36);});
    W.bell.rotation.z=s.chime;W.strip.rotation.z=s.paper;W.strip.rotation.y=s.zones[5].velocity*.55+s.paper;W.pin.rotation.z=s.rotor;
    const surfacePos=W.surface.geometry.attributes.position;
    s.water.forEach((p,i)=>{
      const gx=i%19,gz=Math.floor(i/19),idx=(10-gz)*19+gx;
      surfacePos.setY(idx,-2.355+p.height);
      const left=s.water[gx?i-1:i],o=W.glintOffsets[i],slope=p.height-left.height;
      const shine=FutonPhysics.clamp(.37+slope*22+p.velocity*2,.04,1);
      particlePose.position.set(p.x+o[0],-2.343+p.height,p.z+o[1]);
      particlePose.scale.set((.18+shine*.86)*o[2],.003,.006+shine*.024);
      particlePose.updateMatrix();W.glints.setMatrixAt(i,particlePose.matrix);
    });
    surfacePos.needsUpdate=true;W.surface.geometry.computeVertexNormals();W.glints.instanceMatrix.needsUpdate=true;
    const sailColumn=Math.round(FutonPhysics.clamp((s.sailX+38)/76)*18);
    W.sail.position.y=-2.34+s.water[3*19+sailColumn].height;
    W.sail.position.x=s.sailX;W.sail.rotation.z=s.zones[0].velocity*.045;
    W.rodParts.forEach((o,i)=>{const a=s.rods[i].bend,b=s.rods[i+1].bend;o.position.y=1.84-(a+b)*.5;o.quaternion.setFromUnitVectors(V(0,1,0),V(.9,a-b,0).normalize());});
    dust.count=s.particles.length;s.particles.forEach((p,i)=>{particlePose.position.set(p.x,p.y,p.z);
      const beam=Math.exp(-Math.pow((p.x+p.y*.65+p.z*.18+.3)%1.3,2)*2.5);
      particlePose.scale.setScalar(p.r*p.alpha*(.43+.86*beam));particlePose.updateMatrix();dust.setMatrixAt(i,particlePose.matrix);});dust.instanceMatrix.needsUpdate=true;
    guide(dt);finish.uniforms.noiseSeed.value=(Math.floor(s.time*12)%73)*.13;
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(post,ortho);
  }
  let last=performance.now();function frame(now){const dt=Math.max(0,Math.min(.065,(now-last)/1000));last=now;sim.step(dt);sound.update(s);draw(dt);requestAnimationFrame(frame);}
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){pointer=null;B.drag.held=false;}});
  requestAnimationFrame(frame);
})();
