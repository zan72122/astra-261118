'use strict';
(()=>{
  const {T,V,TAU,mat,mesh,inst,group,buffer,rng}=Craft;
  const canvas=document.getElementById('view'), width=()=>canvas.clientWidth,height=()=>canvas.clientHeight;
  const game=GardenPhysics.create({narrow:innerWidth/innerHeight<.77});
  window.__GAME__={step:game.step,getState:game.getState};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const scene=new T.Scene();scene.background=new T.Color(0xc2d4c1);scene.fog=new T.FogExp2(0xcbd5bd,.039);
  const camera=new T.PerspectiveCamera(36,1,.08,100),target=V(),cameraRest=V(),targetRest=V(),cameraGoal=V(),targetGoal=V();
  const sun=new T.DirectionalLight(0xffefd0,2.76);sun.position.set(-5.6,8.7,-3.7);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-8.6;sun.shadow.camera.right=8.6;
  sun.shadow.camera.top=7.3;sun.shadow.camera.bottom=-7.3;sun.shadow.camera.near=.2;sun.shadow.camera.far=29;
  sun.shadow.bias=-.00022;sun.shadow.normalBias=.012;sun.shadow.radius=2;
  const ambient=new T.HemisphereLight(0xe3f1ff,0xabb995,1.56);scene.add(ambient);
  const world=buildLandscape(scene,game),props=buildObjects(scene,game);
  // Capture reflections from the actual garden once while the water is still in the pipes.
  const cubeTarget=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType});
  const reflectionCamera=new T.CubeCamera(.09,75,cubeTarget);reflectionCamera.position.set(.12,1.10,-.04);
  reflectionCamera.update(renderer,scene);
  const prefilter=new T.PMREMGenerator(renderer),filtered=prefilter.fromCubemap(cubeTarget.texture);
  scene.environment=filtered.texture;scene.environmentIntensity=.46;
  prefilter.dispose();cubeTarget.dispose();

  const streamMat=mat(0xc0e2dd,.13,.43,{transparent:true,opacity:.80,envMapIntensity:1.20});
  const beadMat=mat(0xdcebe0,.14,.54,{envMapIntensity:1.36});
  const jet=inst(scene,new T.CylinderGeometry(1,1,1,5,1),streamMat,420);
  const beads=inst(scene,new T.SphereGeometry(1,7,5),beadMat,650);
  const mudBits=inst(scene,new T.IcosahedronGeometry(1,0),mat(0x8d765b,.84),170);
  const pollen=inst(scene,new T.IcosahedronGeometry(1,0),mat(0xf5e6ac,.45,.14,{transparent:true,opacity:.62}),44);
  const dew=inst(scene,new T.SphereGeometry(1,7,5),beadMat,650);
  const dummy=new T.Object3D(),up=V(0,1,0),v=V(),dir=V(),lanePrev=Array(9).fill(null);
  const setBlob=(o,n,x,y,z,rx,ry,rz)=>{
    dummy.position.set(x,y,z);dummy.quaternion.identity();dummy.scale.set(rx,ry,rz);dummy.updateMatrix();o.setMatrixAt(n,dummy.matrix);
  };
  const rainPos=[],rainCol=[],rainId=[],rainUv=[];
  const spectrum=[0xd88f78,0xf4ba82,0xefe1a1,0xb5d19a,0x9dc9bc,0x9cb9d2,0xbcaac7];
  for(let band=0;band<7;band++){
    const c=new T.Color(spectrum[band]),k=rainPos.length/3;
    for(let i=0;i<=64;i++){
      const a=.045*Math.PI+.91*Math.PI*i/64;
      for(let j=0;j<2;j++){
        const r=.72-(band+j)*.018;rainPos.push(Math.cos(a)*r,Math.sin(a)*r*.87,0);
        rainCol.push(c.r,c.g,c.b,Math.sin(Math.PI*i/64)**.45*(band===0||band===6?.57:.83));rainUv.push(i/64,j);
      }
      if(i<64){let p=k+i*2;rainId.push(p,p+2,p+1,p+1,p+2,p+3);}
    }
  }
  const rainbowGeo=buffer(rainPos,null,rainUv,rainId);rainbowGeo.setAttribute('color',new T.Float32BufferAttribute(rainCol,4));
  const rainbowMat=mat(0xffffff,.86,0,{transparent:true,vertexColors:true,side:T.DoubleSide,depthWrite:false,opacity:.42});
  const rainbow=mesh(scene,rainbowGeo,rainbowMat);rainbow.castShadow=rainbow.receiveShadow=false;
  const sparkleMat=mat(0xffeac3,.20,.38,{emissive:0xffe5aa,emissiveIntensity:.27,transparent:true,depthWrite:false});
  const sparkle=group(scene);
  for(const rot of [0,Math.PI/2]){
    const g=buffer([0,.060,0,.007,0,0,0,-.060,0,-.007,0,0],null,null,[0,3,1,1,3,2]);
    const o=mesh(sparkle,g,sparkleMat);o.rotation.z=rot;o.castShadow=o.receiveShadow=false;
  }
  const dewSites=[];
  for(let i=0;i<600;i++){
    const x=rng()*9-4.5,z=rng()*7.5-3.2;
    dewSites.push({x,z,h:.065+rng()*.061,threshold:.0003+rng()*.0052,id:game.cellIndex(x,z)});
  }
  function fluids(){
    const s=game.s;lanePrev.fill(null);let links=0,drops=0,soil=0;
    for(const p of s.packets){
      const prev=p.type?null:lanePrev[p.lane];
      const dist=prev?Math.hypot(prev.x-p.x,prev.y-p.y,prev.z-p.z):0;
      const radius=(.0066+.0052*Math.sqrt(s.flow/.4))*(p.lane===4?1.42:.81);
      // Detached packets keep their ballistic shape. The laminar core joins only consecutive emissions.
      if(prev && links<420 && prev.row===p.row-1&&dist<.48&&!p.targetHit&&!prev.targetHit&&
        (p.age<.52||p.lane===4||((p.row+p.lane)%5!==0&&p.age<.67))){
        dir.set(prev.x-p.x,prev.y-p.y,prev.z-p.z);dummy.position.set((prev.x+p.x)*.5,(prev.y+p.y)*.5,(prev.z+p.z)*.5);
        dummy.quaternion.setFromUnitVectors(up,dir.normalize());dummy.scale.set(radius,dist,radius);dummy.updateMatrix();jet.setMatrixAt(links++,dummy.matrix);
      }
      if(drops<650){
        const rr=p.type?.018:radius*(1+.34*p.age);setBlob(beads,drops++,p.x,p.y,p.z,rr,rr*(p.type?1.9:1.38),rr);
      }
      if(!p.type)lanePrev[p.lane]=p;
    }
    for(const f of s.flecks){
      if(f.kind===1&&soil<170)setBlob(mudBits,soil++,f.x,f.y,f.z,f.r,f.r*.8,f.r);
      else if(drops<650)setBlob(beads,drops++,f.x,f.y,f.z,f.r,f.r*1.18,f.r);
    }
    jet.count=links;beads.count=drops;mudBits.count=soil;jet.instanceMatrix.needsUpdate=beads.instanceMatrix.needsUpdate=mudBits.instanceMatrix.needsUpdate=true;
    s.air.forEach((a,i)=>{let r=(.004+(i%5)*.0013)*Math.max(0,Math.min(1,(a.y-.10)*12,(4.5-a.y)*8,(7-a.x)*8));setBlob(pollen,i,a.x,a.y,a.z,r,r*.85,r);});pollen.count=s.air.length;pollen.instanceMatrix.needsUpdate=true;
    let dn=0;for(const q of dewSites){
      const c=s.cells[q.id];if(c.dew<q.threshold)continue;
      const rad=.005+Math.min(.011,Math.cbrt(c.dew-q.threshold)*.035);
      setBlob(dew,dn++,q.x+c.bend*q.h,q.h,q.z,rad,rad*1.26,rad);
    }dew.count=dn;dew.instanceMatrix.needsUpdate=true;
    rainbow.position.set(s.mistX+.12,Math.max(.38,s.mistY-.45),s.mistZ);
    rainbow.quaternion.copy(camera.quaternion);rainbow.rotateX(-.13);
    rainbowMat.opacity=Math.min(.55,.11+s.rainbow*.48)*(1-s.evening);
    rainbow.visible=s.mist>.07&&s.flow>.012;
  }
  const rt=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:0});
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:rt.texture},px:{value:new T.Vector2()}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D picture;uniform vec2 px;varying vec2 vUv;
    void main(){vec3 c=texture2D(picture,vUv).rgb;vec3 glow=vec3(0.);
      for(int i=0;i<6;i++){float a=float(i)*1.047198;vec3 b=texture2D(picture,vUv+vec2(cos(a),sin(a))*px*3.).rgb;glow+=max(vec3(0.),b-1.12);}
      c+=glow*.012;c*=1.-.090*pow(length((vUv-.5)*1.41),1.8);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.007;
    }`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));

  let pixelRatio=Math.min(devicePixelRatio||1,1.65),narrow=false,started=false,aspect=1;
  function resize(){
    const w=width(),h=height();aspect=w/h;narrow=aspect<.77;
    renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);
    rt.setSize(Math.max(1,Math.round(w*pixelRatio)),Math.max(1,Math.round(h*pixelRatio)));
    finish.uniforms.px.value.set(1/rt.width,1/rt.height);camera.aspect=aspect;camera.updateProjectionMatrix();
    if(narrow){
      const d=Math.max(1,.465/aspect)*(game.layout.narrow?1:1.56);
      targetRest.set(-.02,.70,-.43);cameraRest.set(-2.23*d, .70+2.66*d, -.43+9.45*d);
    }else{
      const k=Math.max(.90,1.37/aspect);
      targetRest.set(-.04,.80,-.16);cameraRest.set(.97*k,.80+1.93*k,-.16+7.14*k);
    }
    if(!started){camera.position.copy(cameraRest);target.copy(targetRest);camera.lookAt(target);camera.updateMatrixWorld();}
  }
  resize();window.addEventListener('resize',resize);if(window.visualViewport)visualViewport.addEventListener('resize',resize);
  const sunColor=new T.Color(),dayColor=new T.Color(0xffefd0),duskColor=new T.Color(0xffb27f),fogDay=new T.Color(0xcbd5bd),fogDusk=new T.Color(0xdaae91);
  function lightAndCamera(dt){
    let e=game.s.evening;sunColor.copy(dayColor).lerp(duskColor,e);sun.color.copy(sunColor);
    sun.position.set(-5.6-e*3.5,8.7-5.4*e,-3.7-e*1.5);sun.intensity=2.76-.94*e;
    ambient.intensity=1.56-.55*e;scene.environmentIntensity=.46-.12*e;scene.fog.color.copy(fogDay).lerp(fogDusk,e);
    cameraGoal.copy(cameraRest);targetGoal.copy(targetRest);
    const focus=narrow?.38:1;
    if(game.phase===0){cameraGoal.x+=game.s.rainbow*.46*focus;}
    if(game.phase===1){targetGoal.x-=.32*focus;targetGoal.y-=.055;cameraGoal.z-=.33*focus;}
    if(game.phase===2){targetGoal.x+=.38*focus;targetGoal.y+=.10;cameraGoal.z-=.38*focus;}
    if(game.phase>=3){cameraGoal.z+=.38*e;targetGoal.y+=.32*e;}
    const k=1-Math.exp(-dt*1.25);camera.position.lerp(cameraGoal,k);target.lerp(targetGoal,k);camera.lookAt(target);camera.updateMatrixWorld();
  }

  const soundButton=document.getElementById('sound');
  let ac=null,audioOn=true,noiseGain,filter,master,lastPing=0,lastRipple=0,gearPhase=0;
  function startAudio(){
    if(!audioOn)return;
    if(!ac){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      ac=new Audio();master=ac.createGain();master.gain.value=.60;master.connect(ac.destination);
      const source=ac.createBufferSource(),n=ac.sampleRate*3,b=ac.createBuffer(1,n,ac.sampleRate),a=b.getChannelData(0);
      let brown=0;const rand=GardenPhysics.random(345);
      for(let i=0;i<n;i++){const white=rand()*2-1;brown=(brown+.12*white)/1.12;a[i]=brown*.8+white*.23;}
      source.buffer=b;source.loop=true;filter=ac.createBiquadFilter();filter.type='bandpass';filter.Q.value=.61;
      noiseGain=ac.createGain();noiseGain.gain.value=0;source.connect(filter);filter.connect(noiseGain);noiseGain.connect(master);source.start();
    }
    if(ac.state==='suspended')ac.resume().catch(()=>{});
  }
  function note(hz,vol,len,type='sine',delay=0){
    if(!audioOn||!ac||ac.state!=='running')return;
    const now=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();
    o.type=type;o.frequency.setValueAtTime(hz,now);o.frequency.exponentialRampToValueAtTime(hz*.98,now+len);
    g.gain.setValueAtTime(.00001,now);g.gain.exponentialRampToValueAtTime(vol,now+.007);g.gain.exponentialRampToValueAtTime(.00001,now+len);o.connect(g);g.connect(master);o.start(now);o.stop(now+len+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function sound(dt){
    if(!ac)return;const s=game.s,now=ac.currentTime;
    noiseGain.gain.setTargetAtTime(audioOn?s.flow*.34:0,now,.12);filter.frequency.setTargetAtTime(1650+s.flow*4500,now,.14);
    if(lastPing!==s.ping){lastPing=s.ping;if(game.phase<4){const tones=[[493.9,659.3],[523.3,784],[587.3,880],[659.3,493.9]][game.phase];note(tones[0],.085,.75);note(tones[1],.048,1.1,'sine',.17);}}
    if(game.phase===1&&s.potL-lastRipple>.18){lastRipple=s.potL;note(520+330*(s.potL/game.cap),.028,.16);}
    if(game.phase!==1)lastRipple=0;
    gearPhase+=s.wheelV*dt;
    if(gearPhase>.92){gearPhase-=.92;if(game.phase===2)note(1150,.013,.057,'triangle');}
  }
  soundButton.addEventListener('click',()=>{audioOn=!audioOn;soundButton.setAttribute('aria-pressed',String(audioOn));if(audioOn)startAudio();if(master)master.gain.setTargetAtTime(audioOn?.6:0,ac.currentTime,.08);});

  const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(V(0,1,0),-.71);
  const handles=[],hitMat=mat(0xffffff,1);
  function addHandle(part,p,x,y,z,rx,ry,rz){
    const o=new T.Mesh(new T.SphereGeometry(1,12,9),hitMat);o.position.set(x,y,z);o.scale.set(rx,ry,rz);
    o.userData.part=part;o.visible=false;p.add(o);handles.push(o);
  }
  addHandle('valve',props.sprinkler,-.27,.37,.34,.38,.31,.32);
  addHandle('head',props.sprinkler,0,.66,-.03,.36,.32,.30);
  addHandle('pot',props.potRoot,0,.43,0,.56,.48,.55);addHandle('bike',props.bike,0,.75,0,1.52,.85,.29);
  function setRay(e){
    const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
    ray.setFromCamera(ndc,camera);
  }
  function anchor(part){
    const h=game.layout.head,p=game.layout.pot,b=game.layout.bike;
    if(part==='valve')return V(h.x-.26,.49,h.z+.34);
    if(part==='head')return V(h.x,.82,h.z-.06);
    if(part==='pot')return V(p.x+.22,.83,p.z+.28);
    return V(b.x+.52,.96,b.z+.12);
  }
  let pointer=null,drag=null,beginX=0,beginY=0,beginValve=0,lastWheelAngle=0,dragged=false;
  function wheelTouchAngle(e){
    const w=props.wheels[1].getWorldPosition(v).project(camera);
    return Math.atan2((1-w.y)*height()*.5-e.clientY,e.clientX-(w.x+1)*width()*.5);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null)return;setRay(e);
    scene.updateMatrixWorld();const hits=ray.intersectObjects(handles,false);
    let part=hits.length?hits[0].object.userData.part:null;
    if(!part){
      // Give the small fittings a fingertip-sized hit area even in a tall viewport.
      for(const k of ['valve','head']){v.copy(anchor(k)).project(camera);
        if(Math.hypot((v.x-ndc.x)*width()/2,(v.y-ndc.y)*height()/2)<22){part=k;break;}}
    }
    if(!part)return;startAudio();
    pointer=e.pointerId;drag=part;beginX=e.clientX;beginY=e.clientY;beginValve=game.s.setting;dragged=false;
    canvas.setPointerCapture(pointer);if(part==='bike')lastWheelAngle=wheelTouchAngle(e);
    game.touch(part);if((part==='pot'&&game.phase===1)||(part==='bike'&&game.phase===2))note(part==='pot'?493:989,.050,.41);
    if(part==='valve')note(284,.021,.10,'triangle');
  });
  canvas.addEventListener('pointermove',e=>{
    if(pointer!==e.pointerId||!drag)return;
    let dx=e.clientX-beginX,dy=e.clientY-beginY;
    if(Math.hypot(dx,dy)<5&&!dragged)return;
    dragged=true;game.s.idle=0;
    if(drag==='valve')game.touch('valve',beginValve+(dx-dy)/Math.min(155,width()*.33));
    if(drag==='bike'&&game.phase===2){const a=wheelTouchAngle(e);game.flick(Math.atan2(Math.sin(a-lastWheelAngle),Math.cos(a-lastWheelAngle)));lastWheelAngle=a;}
    if(drag==='head'){
      setRay(e);const loc=ray.ray.intersectPlane(plane,v);
      if(loc){const h=game.layout.head;game.touch('head',Math.atan2(loc.x-h.x,h.z-loc.z));}
    }
  });
  function release(e){
    if(pointer!==e.pointerId)return;
    if(dragged&&drag==='head'&&(game.phase===1||game.phase===2)){
      const goal=game.target,h=game.layout.head,angle=Math.atan2(goal.x-h.x,h.z-goal.z);
      if(Math.cos(angle-game.s.aim)>.85)game.touch(game.phase===1?'pot':'bike');
    }
    pointer=null;drag=null;
  }
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  const hint=document.getElementById('hint'),stamps=[...document.querySelectorAll('.stamp')];let stage=-1;
  function directions(){
    const s=game.s,phase=game.phase,part=phase===0?'valve':phase===1?'pot':'bike';
    const at=anchor(part),handPos=at.clone();
    if(stage!==phase){
      stage=phase;stamps.forEach((o,i)=>{o.classList.toggle('active',i===Math.min(stage,3));o.classList.toggle('done',i<stage);});
    }
    const t=s.idle-4,g=((Math.max(0,t)%3.8)/3.8),need=phase<3&&pointer===null&&s.idle>4;
    if(need){
      if(phase===0){const angle=-.7+g*2.8;handPos.x+=Math.cos(angle)*.12;handPos.y+=Math.sin(angle)*.085;}
      else if(phase===2&&s.locked){
        const b=game.layout.bike,a=2.34-g*4.4,yaw=game.layout.narrow?-.39:-.22;
        const lx=.83+.50*Math.cos(a);handPos.set(b.x+lx*Math.cos(yaw),.572+.50*Math.sin(a),b.z-lx*Math.sin(yaw)+.06);
      }
      else{const start=anchor('head'),f=Math.min(1,g/.65);handPos.lerpVectors(start,at,f*f*(3-2*f));handPos.y+=Math.sin(Math.PI*f)*.19;}
      handPos.project(camera);const x=(handPos.x+1)*width()/2,y=(1-handPos.y)*height()/2;
      hint.style.transform='translate('+(x-9)+'px,'+(y-1)+'px) rotate('+(-13+g*15)+'deg)';
      hint.style.opacity=String(Math.min(.89,t*3,g*9,(1-g)*6));
    }else hint.style.opacity='0';
    sparkle.visible=phase<3;
    if(sparkle.visible){
      sparkle.position.copy(at);sparkle.position.y+=.095;sparkle.position.x-=.07;
      sparkle.quaternion.copy(camera.quaternion);let shine=.36+.64*Math.pow(.5+.5*Math.cos(s.guide*2.1+s.breeze*2),5);
      sparkle.scale.setScalar(shine*(narrow?1.35:1));sparkleMat.opacity=shine*.85;
    }
  }
  game.step(.85);game.s.idle=0;world.update();props.update();
  let last=performance.now(),slow=0,shadowAge=1;renderer.shadowMap.autoUpdate=false;
  function frame(now){
    requestAnimationFrame(frame);
    if(document.hidden){last=now;return;}
    const measured=Math.max(.0001,(now-last)/1000);last=now;const dt=Math.min(.075,measured);
    game.step(dt);lightAndCamera(dt);world.update();props.update();fluids();directions();sound(dt);
    shadowAge+=dt;if(shadowAge>.13){renderer.shadowMap.needsUpdate=true;shadowAge=0;}
    renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
    started=true;slow=measured>.060?slow+1:Math.max(0,slow-1);
    if(slow>35&&pixelRatio>1){pixelRatio=Math.max(1,pixelRatio-.25);resize();slow=0;}
  }
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden&&ac)ac.suspend();else if(ac&&audioOn)ac.resume().catch(()=>{});});
  requestAnimationFrame(frame);
})();
