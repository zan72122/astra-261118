'use strict';
(() => {
  const T=THREE,sim=Autumn.makeGarden(),sound=gardenSound();
  window.__GAME__={step:sim.step,getState:sim.getState};
  const canvas=document.getElementById('garden'),hand=document.getElementById('hint'),icons=[...document.querySelectorAll('.chapter')],soundButton=document.querySelector('.sound');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.045,84),world=buildGarden(T,scene,renderer,sim.view());
  const v=(x,y,z)=>new T.Vector3(x,y,z),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const eye=v(0,0,0),aim=v(0,0,0),eyeV=v(0,0,0),aimV=v(0,0,0),tar=v(0,0,0),look=v(0,0,0),projected=v(0,0,0);
  let width=1,height=1,portrait=false,lastStage=-1,activePointer=null,lastTs=0,dragOffsetX=0,dragOffsetY=0;
  // Scene radiance is downsampled once for a restrained highlight bloom.
  const target=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
  target.samples=renderer.capabilities.maxSamples>=2?2:0;
  const bloom=new T.WebGLRenderTarget(1,1,{depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
  const postScene=new T.Scene(),flat=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const vert='varying vec2 p; void main(){ p=uv; gl_Position=vec4(position.xy,0.,1.); }';
  const bright=new T.ShaderMaterial({uniforms:{frame:{value:target.texture},px:{value:new T.Vector2()}},vertexShader:vert,fragmentShader:`
    uniform sampler2D frame; uniform vec2 px; varying vec2 p;
    void main(){vec3 c=vec3(0.);for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){vec3 s=texture2D(frame,p+vec2(float(i),float(j))*px*2.).rgb;c+=max(s-vec3(.83),vec3(0.));}gl_FragColor=vec4(c/9.,1.);}`});
  const finish=new T.ShaderMaterial({uniforms:{frame:{value:target.texture},glow:{value:bloom.texture},pixel:{value:new T.Vector2()}},vertexShader:vert,fragmentShader:`
    uniform sampler2D frame; uniform sampler2D glow; uniform vec2 pixel; varying vec2 p;
    void main(){vec3 c=texture2D(frame,p).rgb;vec3 g=texture2D(glow,p).rgb*.28;
    for(int i=0;i<8;i++){float a=float(i)*.785398;g+=texture2D(glow,p+vec2(cos(a),sin(a))*pixel*4.).rgb*.09;}
    float vig=1.-.105*smoothstep(.18,.72,length(p-.5));gl_FragColor=vec4((c+g*.10)*vig,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float grain=fract(sin(dot(gl_FragCoord.xy,vec2(127.1,311.7)))*43758.5453)-.5;
    gl_FragColor.rgb+=grain*.006;}`});
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),finish);postScene.add(quad);
  function cameraGoals(s){
    const r=s.rake,follow=r.wake?1:0;
    if(portrait){tar.set(-2.38,2.29,10.82);look.set(-.12,1.12,-1.14);}
    else{tar.set(.20,1.84,6.88);look.set(-.09,.94,-1.84);}
    tar.y-=follow*(portrait?.83:.91);look.y-=follow*.35;tar.x+=r.x*.115*follow;tar.z+=(r.z-.75)*.09*follow;look.x+=(r.x+.9)*.17*follow;look.z+=(r.z-.75)*.11*follow;
    if(s.stage===1){
      if(s.act==='burst'){const e=Math.sin((1-s.diveEnergy)*Math.PI);tar.z+=e*1.12;tar.y+=e*.26;look.y+=e*.23;}
      if(s.act==='nut'){
        const d=portrait?4.85:3.54;tar.set(s.nut.x-.52,1.25,s.nut.z+d);look.set(s.nut.x,.36,s.nut.z-.38);
      }
    }
    if(s.stage===2){
      const f=clamp(s.windFront/6.4,0,1),z=-.65-s.windFront*.71;
      if(s.act==='wind'){tar.set(-.79-f*.42,1.58+f*.16,(portrait?7.9:4.55)-f*4.82);look.set(Autumn.pathX(z)*.7,.63+f*.53,z-1.14);}
      else{tar.set(.27,1.75,portrait?2.06:.23);look.set(Autumn.SHED.x,1.24,Autumn.SHED.z);}
    }
    if(s.stage===3){
      const bias=s.act==='pour'||s.act==='opening'?-.59:s.act==='sail'?.15:.63;
      tar.set(Autumn.SHED.x+bias*.08,1.38,Autumn.SHED.z+(portrait?1.72:1.20));
      look.set(Autumn.SHED.x+bias*(portrait?1:.58),1.10,Autumn.SHED.z-1.62);
      if(s.act==='return'){
        const progress=clamp((1-s.returnEnergy-.06)/.87,0,1);
        tar.lerp(portrait?v(-2.38,2.29,10.82):v(.2,1.84,6.88),progress);
        look.lerp(portrait?v(-.12,1.12,-1.14):v(-.09,.94,-1.84),progress);
      }
    }
  }
  function updateCamera(s,dt,reset=false){
    cameraGoals(s);
    if(reset){eye.copy(tar);aim.copy(look);eyeV.set(0,0,0);aimV.set(0,0,0);}
    else{const k=s.stage===3?6.8:10.5,c=2*Math.sqrt(k);for(let i=0;i<3;i++){const h=dt/3;
      eyeV.addScaledVector(tar.clone().sub(eye),k*h).multiplyScalar(Math.exp(-c*h));eye.addScaledVector(eyeV,h);
      aimV.addScaledVector(look.clone().sub(aim),k*h).multiplyScalar(Math.exp(-c*h));aim.addScaledVector(aimV,h);}}
    camera.position.copy(eye);camera.lookAt(aim);camera.updateMatrixWorld();
  }
  function resize(){
    width=canvas.clientWidth;height=canvas.clientHeight;portrait=width/height<.88;
    const ratio=Math.min(devicePixelRatio||1,portrait?1.65:1.45,Math.sqrt(1950000/(width*height)));
    renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    const w=Math.round(width*ratio),h=Math.round(height*ratio);target.setSize(w,h);bloom.setSize(Math.max(1,w>>3),Math.max(1,h>>3));
    bright.uniforms.px.value.set(1/w,1/h);finish.uniforms.pixel.value.set(8/w,8/h);updateCamera(sim.view(),0,true);
  }
  function screen(pos){projected.copy(pos).project(camera);return {x:(projected.x+1)*.5*width,y:(1-projected.y)*.5*height,z:projected.z};}
  const ray=new T.Raycaster();
  function ground(x,y){ray.setFromCamera(new T.Vector2(x/width*2-1,1-y/height*2),camera);const at=v(0,0,0);if(!ray.ray.intersectPlane(new T.Plane(v(0,1,0),0),at))return null;return at;}
  const distance=(x,y,p)=>Math.hypot(x-p.x,y-p.y);
  function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
  function hit(s,x,y,g){
    const near=(pos,px)=>{const p=screen(pos);return p.z<1&&distance(x,y,p)<px;},focus=world.focus(s);
    const onRake=()=>{const a=screen(world.rake.localToWorld(v(-.55,2.53,-.91))),b=screen(world.rake.localToWorld(v(0,.66,-.31))),c=screen(world.rake.localToWorld(v(0,.08,.45))),left=screen(world.rake.localToWorld(v(-.67,.08,.40))),right=screen(world.rake.localToWorld(v(.67,.08,.40)));
      return segmentDistance(x,y,a,b)<23||segmentDistance(x,y,b,c)<30||segmentDistance(x,y,left,right)<31||ray.intersectObject(world.rake,true).length>0;};
    if(s.stage===0){
      if(onRake())return 'rake';
      if(g&&s.rake.wake&&s.leaves.some(l=>!l.piled&&!l.air&&Math.hypot(g.x-l.x,g.z-l.z)<l.radius+.15))return 'leaves';
    }
    if(s.act==='park'&&onRake())return 'rake';
    if(['dive','park'].includes(s.act)&&(near(focus,42)||g&&Math.hypot(g.x-Autumn.PILE.x,(g.z-Autumn.PILE.z)*1.17)<1.12))return 'pile';
    if(s.act==='nut'&&near(focus,42))return 'nut';
    if(s.act==='wind'){
      if(near(world.acorn.position,43))return 'nut';
      if(near(focus,56)||g&&g.z<.25&&g.z> -7.2&&Math.abs(g.x-Autumn.pathX(g.z))<.87)return 'path';
    }
    if(s.act==='door'&&(near(focus,40)||ray.intersectObject(world.doorGroup,true).length))return 'door';
    if(s.stage===3&&['pour','sail','play'].includes(s.act)){
      for(const [name,obj] of [['exit',world.exitLeaf],['can',world.can],['boat',world.boat],['wheel',world.wheel]]){
        if((name==='exit'&&s.act!=='play')||(name==='boat'&&!s.water.poured))continue;
        const center=obj.localToWorld(v(0,name==='boat'?.18:0,0));
        if(near(center,name==='can'?36:30)||ray.intersectObject(obj,true).length)return name;
      }
    }return '';
  }
  canvas.addEventListener('pointerdown',e=>{
    if(activePointer!==null||e.button>0)return;
    sound.unlock();const s=sim.view(),g=ground(e.clientX,e.clientY),kind=hit(s,e.clientX,e.clientY,g);
    let pos=g||v(s.rake.x,0,s.rake.z);
    dragOffsetX=0;dragOffsetY=0;
    if(kind==='rake'){
      const foot=screen(v(s.rake.x,0,s.rake.z));
      dragOffsetX=foot.x-e.clientX;dragOffsetY=foot.y-e.clientY;
      pos=v(s.rake.x,0,s.rake.z);
    }
    if(sim.begin(kind,pos.x,pos.z)){activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);}
    else if(g)sim.nudge(g.x,g.z);
    hand.style.opacity='0';
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerId!==activePointer)return;const p=ground(e.clientX+dragOffsetX,e.clientY+dragOffsetY);if(p)sim.move(p.x,p.z);});
  function release(e){if(e.pointerId!==activePointer)return;activePointer=null;sim.end();}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  soundButton.addEventListener('click',()=>{const muted=sound.toggle();soundButton.classList.toggle('muted',muted);soundButton.setAttribute('aria-pressed',String(!muted));});
  function guide(s){
    if(s.idle<4||activePointer!==null||['burst','opening','return'].includes(s.act)){hand.style.opacity='0';return;}
    const phase=((s.idle-4)%4.4)/4.4;
    const phaseAlpha=Math.min(1,phase*10,(1-phase)*8)*.92;
    let from=world.focus(s),to=from.clone();
    if(s.act==='gather'){
      if(s.rake.wake&&Math.hypot(s.rake.x-Autumn.PILE.x,s.rake.z-Autumn.PILE.z)<.92){const patch=s.leaves.find(l=>!l.piled&&!l.air&&Math.hypot(l.x-Autumn.PILE.x,l.z-Autumn.PILE.z)>1.0);if(patch)from=v(patch.x,patch.y,patch.z);}
      to=v(Autumn.PILE.x,s.currentPile*.46,Autumn.PILE.z);
    }else if(s.act==='park'){from=world.rake.localToWorld(v(0,.44,-.03));to=v(Autumn.PILE.x,.25,Autumn.PILE.z);}
    else if(s.act==='wind'){to.z-=.94;to.x=Autumn.pathX(to.z);}
    else if(s.act==='nut'){to.x-=.32;to.z-=.35;}
    else{to.y-=s.stage===3?.06:.095;}
    let t=clamp((phase-.21)/.55,0,1);t=t*t*(3-2*t);
    const p=screen(from.lerp(to,t));const k=portrait?.77:.87,angle=-10+7*t;
    hand.style.transform='translate('+Math.round(clamp(p.x,12,width-35)-12*k)+'px,'+Math.round(clamp(p.y,65,height-40)-9*k)+'px) rotate('+angle+'deg) scale('+k+')';
    hand.style.opacity=String(phaseAlpha);
  }
  function draw(){
    const s=sim.view();world.update(s);scene.updateMatrixWorld();
    if(lastStage!==s.stage){icons.forEach((a,i)=>{a.classList.toggle('current',i===s.stage);a.classList.toggle('done',i<s.stage);});lastStage=s.stage;}
    guide(s);
    renderer.setRenderTarget(target);renderer.render(scene,camera);
    quad.material=bright;renderer.setRenderTarget(bloom);renderer.render(postScene,flat);
    quad.material=finish;renderer.setRenderTarget(null);renderer.render(postScene,flat);
  }
  resize();world.update(sim.view());scene.updateMatrixWorld();
  T.DefaultLoadingManager.onLoad=()=>{world.probe();};
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
  function frame(ts){
    const dt=lastTs?Math.min(.06,(ts-lastTs)/1000):0;lastTs=ts;sim.step(dt);const s=sim.view();
    updateCamera(s,dt);sound.update(s,dt);draw();requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{lastTs=0;if(document.hidden){activePointer=null;sim.end();}});
  requestAnimationFrame(frame);
})();
