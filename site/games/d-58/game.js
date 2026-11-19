(() => {
  'use strict';
  const T=THREE,A=AtriumMotion,sim=A.create(),s=sim.state;
  window.__GAME__={step:sim.step,getState:sim.getState};
  const canvas=document.querySelector('#view'),hand=document.querySelector('#hand'),sound=document.querySelector('#sound');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,0.065,145),world=makeAtrium(scene,renderer);
  const v=(x,y,z)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
  const stageStops=[...document.querySelectorAll('.stop')];
  let width=1,height=1,displayStage=-1,locked=null,previous=0;
  const position=v(0,0,0),focus=v(0,0,0);
  let cameraFov=38;
  function framePose(){
    const lev=Math.floor(s.bank/2),sign=(lev%2?-1:1)*s.direction,baseY=s.direction>0?lev*A.H:(lev+1)*A.H,
      z=A.point(s.bank,0).z,aspect=width/height,portrait=clamp((1.36-aspect)/0.90,0,1);
    const overviewPos=v(-sign*(6.45+8.15*portrait),lev*A.H+2.35+0.20*portrait, z+10.2-3.90*portrait);
    const overviewAim=v(-sign*(0.25+0.05*portrait),lev*A.H+2.0+0.23*portrait,z-0.47+0.74*portrait);
    let fov=38;
    if(s.direction<0){
      const top=A.point(s.bank,A.length);
      overviewPos.set(top.x-sign*2.3,baseY+2.0,top.z+2.9+portrait*1.7);
      overviewAim.set(top.x+sign*(1.4-1.28*portrait),baseY+0.03+0.36*portrait,top.z+0.24*portrait);fov=s.bank===5?48:38;
    }
    let pos=overviewPos,aim=overviewAim;
    if(s.phase==='riding'){
      const p=s.rider, dist=s.direction>0?s.progress:A.length-s.progress;
      const ahead=A.point(s.bank,dist+sign*(lev%2?-1:1)*3.7);
      const eye=v(p.x-sign*0.48+s.stance,p.y+1.42+s.shoeY,p.z+0.04);
      const gaze=v(p.x+sign*3.75,ahead.y+1.53,p.z-0.16);
      const k=clamp(s.progress/1.48,0,1),smooth=k*k*(3-2*k);
      pos.lerp(eye,smooth);aim.lerp(gaze,smooth);
      if(s.bank===4)fov+=5*smooth;
      if(s.bank===5)fov-=10*smooth;
    }
    if(s.phase==='walking'){
      const p=s.rider, prep=s.progress===0;
      if(!prep){
        pos=v(p.x-sign*0.70,p.y+1.58,p.z+0.42);
        if(s.stage===3&&s.bank>1){aim=v(sign*(A.edge+1.45),p.y+1.15,p.z+0.56);}
        else {aim=world.toys[s.stage].clone();if(pos.distanceTo(aim)<1.4)pos.z+=1.65;}
      }
    }
    if(s.phase==='gallery'){
      aim=world.toys[s.stage].clone();
      const offsets=[[ -2.08,0.94,2.55],[1.90,-0.13,3.05],[-2.03,0.05,3.70],[1.9,0.30,3.95]];
      const off=offsets[s.stage];
      pos=aim.clone().add(v(...off));if(portrait>0)pos.z+=portrait*(s.stage===0?0.7:1.4);
      if(s.stage===0){aim.y+=0.28;aim.z-=0.08;}
      if(s.stage===2)fov=51;
    }
    return {pos,aim,fov};
  }
  function cameraStep(dt,snap=false){
    const pose=framePose(),a=snap?1:1-Math.exp(-dt*(s.phase==='riding'?3.0:1.45));
    position.lerp(pose.pos,a);focus.lerp(pose.aim,a);cameraFov+=(pose.fov-cameraFov)*a;
    camera.position.copy(position);camera.lookAt(focus);camera.fov=cameraFov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  // The finishing pass samples linear radiance before the display transform.
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)});
  const finishScene=new T.Scene(),finishCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:target.texture},px:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D source; uniform vec2 px; varying vec2 vUv;
    vec3 glow(vec2 p){vec3 c=texture2D(source,p).rgb;return max(c-vec3(1.18),0.0);}
    void main(){vec3 c=texture2D(source,vUv).rgb;vec3 b=vec3(0.);
    for(int i=0;i<8;i++){float a=float(i)*0.785398;b+=glow(vUv+px*vec2(cos(a),sin(a))*3.8);}
    c+=b*0.007;
    vec2 q=(vUv-.5)*1.44;c*=1.-0.105*dot(q,q);
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
    gl_FragColor.rgb+=grain*0.008;
    }`});
  finishScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  function resize(){
    const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    const ratio=Math.min(window.devicePixelRatio||1,1.65,Math.sqrt(2050000/(width*height)));
    renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);target.setSize(canvas.width,canvas.height);
    finish.uniforms.px.value.set(1/canvas.width,1/canvas.height);camera.aspect=width/height;
    cameraStep(0,true);
  }
  resize();window.addEventListener('resize',resize);
  function project(p){const q=p.clone().project(camera);return {x:(q.x+1)*width/2,y:(1-q.y)*height/2,visible:q.z>0&&q.z<1};}
  function screenTarget(){return project(s.phase==='gallery'?world.toys[s.stage]:world.targets[s.bank]);}
  function demo(){
    if(s.phase!=='ready'&&s.phase!=='gallery'){hand.style.opacity=0;return;}
    const p=screenTarget();if(!p.visible){hand.style.opacity=0;return;}
    const beat=Math.min(1,A.wrap(s.hintClock,4.5)/1.2), glide=1-beat*beat*(3-2*beat);
    hand.style.opacity=(s.hint*0.88).toFixed(3);
    hand.style.transform='translate('+Math.round(p.x+6+19*glide)+'px,'+Math.round(p.y+5+22*glide)+'px) rotate('+(-15+10*glide)+'deg) scale('+(0.92+0.09*glide)+')';
  }
  // Only the lit bank or the mechanism at the current landing accepts a strong touch.
  const ray=new T.Raycaster(),pointer=new T.Vector2(),hitBox=new T.BoxGeometry(1,1,1),hitMat=new T.MeshStandardMaterial();
  const pickBanks=[];
  for(let b=0;b<6;b++){
    const objects=[];
    for(const [a,c] of [[0,A.flat],[A.flat,A.flat+A.slope],[A.flat+A.slope,A.length]]){
      const start=A.point(b,a),end=A.point(b,c),obj=new T.Mesh(hitBox,hitMat);
      obj.position.set((start.x+end.x)/2,(start.y+end.y)/2+0.38,start.z);
      obj.scale.set(Math.hypot(end.x-start.x,end.y-start.y)+0.12,1.01,1.40);
      obj.rotation.z=Math.atan2(end.y-start.y,end.x-start.x);obj.updateMatrixWorld();objects.push(obj);
    }pickBanks.push(objects);
  }
  function hitTest(x,y){
    const kind=(s.phase==='ready'||s.phase==='riding')?'ride':s.phase==='gallery'?'toy':null;if(!kind)return null;
    const center=screenTarget(),radius=kind==='ride'?32:[44,68,72,67][s.stage];
    if(center.visible&&Math.hypot(x-center.x,y-center.y)<radius)return kind;
    pointer.set(2*x/width-1,1-2*y/height);ray.setFromCamera(pointer,camera);
    if(kind==='ride')return ray.intersectObjects(pickBanks[s.bank],false).length?kind:null;
    const origin=world.toys[s.stage],dim=[[1.3,1.4,1.28],[2.25,2.05,2.2],[2.6,1.2,2.6],[2.9,2.65,0.6]][s.stage];
    const size=v(...dim),bb=new T.Box3().setFromCenterAndSize(origin,size);
    return ray.ray.intersectsBox(bb)?kind:null;
  }
  let ctx=null,master=null,motorGain,motorOsc,airGain,airFilter,muted=false,lastChime=-5;
  function startAudio(){
    if(!ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ctx=new Audio();
      master=ctx.createGain();master.gain.value=muted?0:0.42;master.connect(ctx.destination);
      motorOsc=ctx.createOscillator();motorOsc.type='sine';motorOsc.frequency.value=56;motorGain=ctx.createGain();motorGain.gain.value=0;
      motorOsc.connect(motorGain).connect(master);motorOsc.start();
      const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let a=0;
      for(let i=0;i<data.length;i++){a=0.97*a+0.03*(Math.random()*2-1);data[i]=a*4;}
      const air=ctx.createBufferSource();air.buffer=buffer;air.loop=true;airFilter=ctx.createBiquadFilter();airFilter.frequency.value=1000;airGain=ctx.createGain();airGain.gain.value=0.015;
      air.connect(airFilter).connect(airGain).connect(master);air.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function note(hz,gain=0.10,decay=0.64,delay=0){
    if(!ctx||muted)return;const at=ctx.currentTime+delay,o=ctx.createOscillator(),env=ctx.createGain();
    o.frequency.value=hz;env.gain.setValueAtTime(0.0001,at);env.gain.exponentialRampToValueAtTime(gain,at+0.02);env.gain.exponentialRampToValueAtTime(0.0001,at+decay);
    o.connect(env).connect(master);o.start(at);o.stop(at+decay+0.02);o.onended=()=>{o.disconnect();env.disconnect();};
  }
  function audioStep(){
    if(!ctx)return;const t=ctx.currentTime,run=Math.abs(s.banks[s.bank].speed);
    motorGain.gain.setTargetAtTime(run*(s.phase==='riding'?0.073:0.027),t,0.10);motorOsc.frequency.setTargetAtTime(46+run*28,t,0.1);
    const roof=s.stage===2&&s.phase==='gallery';airGain.gain.setTargetAtTime(roof?0.12*s.wind[0].speed:0.017,t,0.4);
    airFilter.frequency.setTargetAtTime(roof?600+900*s.wind[0].speed:510,t,0.3);
    if(s.stage===0&&s.phase==='gallery'&&s.drip<0.12&&t-lastChime>0.21){note(540+s.pressure*120+s.water[0].h*6500,0.023,0.22);lastChime=t;}
  }
  canvas.addEventListener('pointerdown',e=>{
    if(locked!==null)return;
    const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
    const kind=hitTest(x,y);
    if(!kind){
      const leaf=world.foliageTargets.findIndex(target=>{
        const p=project(target);return p.visible&&Math.hypot(x-p.x,y-p.y)<22;
      });
      if(leaf>=0)sim.nudge(leaf);
      return;
    }
    startAudio();
    if(sim.press(kind)){locked=e.pointerId;canvas.setPointerCapture(e.pointerId);note(kind==='ride'?329.63:[679,523.25,392,440][s.stage],0.064,0.60);}
  });
  function lift(e){if(e.pointerId!==locked)return;locked=null;sim.release();}
  ['pointerup','pointercancel','lostpointercapture'].forEach(k=>canvas.addEventListener(k,lift));
  sound.addEventListener('click',()=>{muted=!muted;startAudio();sound.classList.toggle('off',muted);sound.setAttribute('aria-pressed',String(!muted));if(ctx)master.gain.setTargetAtTime(muted?0:0.42,ctx.currentTime,0.06);if(!muted)note(523.25,0.05);});
  document.addEventListener('visibilitychange',()=>{previous=0;sim.release();locked=null;if(ctx&&document.hidden)ctx.suspend().catch(()=>{});});
  window.addEventListener('blur',()=>{sim.release();locked=null;});
  let priorPhase=s.phase;
  function draw(now){
    const dt=previous?Math.min(0.08,(now-previous)/1000):0;previous=now;
    sim.step(dt);world.update(s);world.reflect(s.stage);cameraStep(dt);demo();audioStep();
    if(displayStage!==s.stage){displayStage=s.stage;stageStops.forEach((el,i)=>el.classList.toggle('on',i===displayStage));}
    if(priorPhase!==s.phase&&s.phase==='gallery'){const hz=[392,440,523.25,349.23][s.stage];note(hz,0.068,1.0);note(hz*1.5,0.047,1.3,0.18);}
    priorPhase=s.phase;
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(finishScene,finishCamera);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
