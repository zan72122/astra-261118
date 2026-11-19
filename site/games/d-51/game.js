(() => {
  'use strict';
  const T=THREE,{PI,TAU,mat,group,mesh,random}=Art,L=StreetMachine.layout;
  const game=StreetMachine.createGame(),s=game.state;
  window.__GAME__={step:game.step,getState:game.getState,action:game.action};
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.035,95);
  const renderer=new T.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const surface=renderer.domElement;document.querySelector('#game').appendChild(surface);
  scene.background=Street.skyTexture();scene.environment=scene.background;scene.environmentIntensity=.49;
  scene.fog=new T.FogExp2('#d6cdb6',.032);
  const sky=new T.HemisphereLight(0xc8e0ec,0xc1a784,1.19);scene.add(sky);
  const sun=new T.DirectionalLight(0xffe2b0,2.46);sun.position.set(-3.72,5.8,3.7);sun.target.position.set(-.25,.38,-.04);scene.add(sun,sun.target);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-3.5,right:3.5,top:3.7,bottom:-2.6,near:.1,far:14});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00024;sun.shadow.normalBias=.006;sun.shadow.radius=2.3;
  const street=Street.make(scene,game),kiosk=Kiosk.build(scene);
  const prizeViews=new Map(),retired=new Map(),stockViews=[],viewCache=new Map();
  function stockView(i,type){const key=i+'/'+type;if(!viewCache.has(key)){const v=Kiosk.product(kiosk.stock[i],type,i%4);if(i>3){v.model.scale.set(.91,1.06,.91);v.model.rotation.y=.41}viewCache.set(key,v)}return viewCache.get(key)}
  for(let i=0;i<8;i++)stockViews[i]=stockView(i,0);
  const goldLight=mat('#ffe2a0',.36,.17,{emissive:0xffc351,emissiveIntensity:.52,transparent:true,opacity:.56,depthWrite:false});
  const cue=Art.ring(kiosk.machine,L.slot[0],L.slot[1],.425,.079,.0018,goldLight);cue.scale.x=.86;
  // Capture the real street once for the enamel, glazing, metal and pools.
  scene.updateMatrixWorld(true);
  const pm=new T.PMREMGenerator(renderer);
  const reflection=pm.fromScene(scene,.025,.05,65,{size:128,position:new T.Vector3(-.41,1.23,.71)});
  scene.environment=reflection.texture;scene.environmentIntensity=.64;pm.dispose();
  // Rain beads, sunlit particles and wet patches use independent local simulation cells.
  const rainMesh=new T.InstancedMesh(new T.CylinderGeometry(.0012,.0015,.067,5),mat('#c8dadd',.22,.3,{transparent:true,opacity:.62,depthWrite:false}),s.rain.length);
  const dustMesh=new T.InstancedMesh(new T.SphereGeometry(1,5,4),mat('#ecd9a5',.65,.07,{transparent:true,opacity:.52,depthWrite:false}),s.dust.length);
  rainMesh.frustumCulled=dustMesh.frustumCulled=false;scene.add(rainMesh,dustMesh);
  const beadMesh=new T.InstancedMesh(new T.SphereGeometry(1,8,6),mat('#bad1c3',.09,.65),8);
  beadMesh.frustumCulled=false;beadMesh.count=0;scene.add(beadMesh);
  const dummy=new T.Object3D(),wet=[];
  for(let i=0;i<32;i++){const row=i>>3,col=i%8,x=-2.8+(col+.51)*5.8/8,z=-1+(row+.52)*.75;
    const geo=new T.CircleGeometry(1,33),pos=geo.attributes.position;
    for(let j=1;j<pos.count;j++){const a=j/33*TAU,irreg=.88+.08*Math.sin(a*3+i)+.065*Math.sin(a*5-i*.9);pos.setXYZ(j,pos.getX(j)*irreg,pos.getY(j)*irreg,0)}
    const m=new T.MeshStandardMaterial({color:0x7f938c,metalness:.57,roughness:.115,roughnessMap:Art.rough,transparent:true,depthWrite:false,opacity:0});
    const o=mesh(scene,geo,m,x,z>1.546?-.072:.0055+i*.00001,z);o.rotation.x=-PI/2;o.castShadow=false;
    const ring=Art.ring(scene,x,o.position.y+.001,z,.115,.0018,mat('#b0bcb1',.20,.43));ring.rotation.x=-PI/2;wet.push({o,ring})}
  // Linear HDR target, small four-tap highlight spread and a single film finishing pass.
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)});target.texture.colorSpace=T.LinearSRGBColorSpace;
  const finalScene=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frame:{value:target.texture},pixel:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame; uniform vec2 pixel; varying vec2 vUv;
    vec3 hot(vec2 u){vec3 c=texture2D(frame,u).rgb;return c*max(0.,dot(c,vec3(.21,.72,.07))-1.18)/(1.+max(c.r,max(c.g,c.b)));}
    void main(){vec3 c=texture2D(frame,vUv).rgb; vec2 d=pixel*3.3;
    c+=.052*(hot(vUv+d)+hot(vUv-d)+hot(vUv+vec2(d.x,-d.y))+hot(vUv+vec2(-d.x,d.y)));
    c*=1.-.12*smoothstep(.25,.73,distance(vUv,vec2(.5,.53)));
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
    gl_FragColor.rgb+=(grain-.5)*.008;}`});
  finalScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  const a=new T.Vector3(),goal=new T.Vector3(),eye=new T.Vector3();
  let width=1,height=1,compact=false;
  function resize(){width=surface.clientWidth||innerWidth;height=surface.clientHeight||innerHeight;compact=width/height<.78;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,compact?1.8:1.65));renderer.setSize(width,height,false);
    const sz=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(sz.x,sz.y);finish.uniforms.pixel.value.set(1/sz.x,1/sz.y);
    camera.aspect=width/height;camera.updateProjectionMatrix();
    const bx=compact?.64:.91,delta=bx-s.anchor[0];street.stops.position.x=bx;street.bench.position.x=bx;street.bench.scale.x=compact?.77:1;s.anchor[0]=bx;
    for(const p of [...s.keeps,s.item])if(p&&['carry','play','stow'].includes(p.mode)){p.x+=delta;p.target[0]+=delta}
  }
  window.addEventListener('resize',resize);resize();
  function positionCamera(dt){
    const ratio=width/height;const baseDist=Math.max(4.92,2.54/(.5359*ratio)),close=s.camera.x;
    const follow=Math.min(1,Math.max(0,s.follow.x));
    const homeX=compact?-.12:-.04;
    goal.set(homeX+(L.mx+L.tray[0]-homeX)*close*.83,1.08-close*.51,.10+close*.19);
    goal.x+=(s.anchor[0]-.12-goal.x)*follow*.86;goal.y+=(.87-.36*s.lowView.x-goal.y)*follow*.88;
    const dist=baseDist*(1-close*(compact?.37:.41))*(1-follow*(compact?.20:.07));
    eye.set(goal.x-dist*.198,goal.y+.27+follow*.29,goal.z+dist*.98);
    camera.position.copy(eye);camera.lookAt(goal);camera.updateMatrixWorld()
  }
  const finger=document.querySelector('#finger'),chapters=[...document.querySelectorAll('#chapters i')];
  function project(x,y,z){a.set(x,y,z).project(camera);return {x:(a.x+1)*width*.5,y:(1-a.y)*height*.5}}
  const coinAt=()=>[L.mx+s.coin.x,s.coin.y,s.coin.z];
  const buttonAt=i=>[L.mx+L.col[i%4],L.shelf[i>>2]-.125,.44];
  const itemAt=p=>[p.x,p.y,p.z];
  function hint(){
    if(s.hint<.01||document.hidden){finger.style.opacity='0';return}
    let from,to;const h=s.hintAge,u=(h%3.15)/3.15;
    if(s.phase==='coin'){from=coinAt();to=[L.mx+L.slot[0],L.slot[1],L.slot[2]]}
    else if(s.phase==='choose'){from=buttonAt((s.chapter+1)%4);to=from}
    else if(s.phase==='pickup'&&s.item){from=itemAt(s.item);to=[from[0],from[1]+.05,from[2]+.15]}
    else if(s.phase==='play'&&s.item){from=itemAt(s.item);to=[from[0]+(s.chapter===1||s.chapter===2?.20:.025),from[1]+.034,from[2]]}else{finger.style.opacity=0;return}
    const start=project(...from),end=project(...to),v=Math.max(0,Math.min(1,(u-.15)/.54)),f=v*v*(3-2*v),x=start.x+(end.x-start.x)*f,y=start.y+(end.y-start.y)*f;
    finger.style.transform='translate('+Math.round(x-5)+'px,'+Math.round(y-3+Math.max(0,.14-u)*67)+'px) rotate(-11deg) scale('+(1-.1*Math.sin(f*PI))+')';
    finger.style.opacity=String(s.hint*.86*Math.min(1,u*12,(1-u)*7));
  }
  function updatePrizes(){
    const active=new Set(s.keeps);if(s.item)active.add(s.item);
    for(const [p,v] of prizeViews)if(!active.has(p)){v.g.visible=false;retired.set(p.type+'/'+p.flavor,v);prizeViews.delete(p)}
    for(const p of active){
      let v=prizeViews.get(p);if(!v){const key=p.type+'/'+p.flavor;v=retired.get(key)||Kiosk.product(scene,p.type,p.flavor);v.g.visible=true;retired.delete(key);prizeViews.set(p,v)}
      v.g.position.set(p.x,p.y+p.bounce.x,p.z);
      const opening=p.mode==='carry'?Math.min(1,p.age*.62):p.mode==='play'?1:p.mode==='stow'?Math.max(0,1-p.age*1.4):0;
      if(p.type===0){v.g.rotation.set(0,p.lay.x*.55,p.tilt.x,'YXZ');v.model.rotation.set(0,p.angle,p.lay.x,'ZYX')}
      else{v.g.rotation.z=p.angle+p.tilt.x;v.g.rotation.y=0}Kiosk.setFold(v,opening,s,s.rotor.angle-p.rotorBase);
    }
    for(let i=0;i<8;i++){const c=s.coils[i];if(stockViews[i].type!==c.stockType){stockViews[i].g.visible=false;stockViews[i]=stockView(i,c.stockType)}
      const v=stockViews[i];v.g.visible=!c.empty;kiosk.stock[i].position.z=.373+c.feed.x;Kiosk.setFold(v,0,s);
      kiosk.coils[i].rotation.z=c.angle+c.elastic.x;kiosk.buttons[i].position.z=.417+c.button.x;kiosk.lights[i].emissiveIntensity=.04+c.glow*.98}
  }
  function draw(dt){
    updatePrizes();kiosk.machine.rotation.z=s.cabinet.x;kiosk.shutter.rotation.x=-s.shutter.x;
    kiosk.coin.visible=s.coin.visible;kiosk.coin.position.set(s.coin.x,s.coin.y,s.coin.z);
    kiosk.coin.rotation.set(.105,.32+.18*Math.sin(s.coin.angle)+(s.phase==='insert'?Math.min(1,s.age*3)*1.03:0),-.15+.08*s.coin.spin);
    cue.visible=s.phase==='coin'||s.phase==='insert';cue.material.opacity=.35+.22*Math.cos(s.coin.angle);
    for(const v of street.clusters){const b=s.leaves[v.idx].bend.x;v.g.rotation.z=v.init+b;v.g.rotation.x=b*.53}
    kiosk.sign.emissiveIntensity=.18+s.lamps[0].heat*.97;kiosk.tube0.emissiveIntensity=.40+s.lamps[1].heat*2.4;kiosk.tube1.emissiveIntensity=.33+s.lamps[2].heat*2.1;
    sun.intensity=2.46-s.evening*1.05-s.rainRate*.75;sky.intensity=1.19-s.evening*.31;scene.backgroundIntensity=1-s.evening*.36;scene.environmentIntensity=.64-s.evening*.16;
    sun.position.y=5.8-s.evening*1.95;sun.color.setRGB(1,.76-.13*s.evening,.47-.11*s.evening);scene.fog.color.setRGB(.695-.22*s.evening,.61-.16*s.evening,.474-.04*s.evening);
    const wp=street.riverSurface.geometry.attributes.position;
    for(let i=0;i<s.river.length;i++)wp.setZ(i,s.river[i].height);wp.needsUpdate=true;street.riverSurface.geometry.computeVertexNormals();
    street.glints.forEach((g,i)=>{const cell=s.river[g.cell],shine=Math.max(.025,Math.min(1,.27+g.phase+cell.velocity*17));
      dummy.position.set(g.x+cell.height*1.4,-.421+cell.height,g.z);dummy.rotation.set(0,cell.velocity*.8,0);dummy.scale.set(g.len*shine,.0015,.009*shine);dummy.updateMatrix();street.sparkles.setMatrixAt(i,dummy.matrix)});street.sparkles.count=street.glints.length;street.sparkles.instanceMatrix.needsUpdate=true;
    for(let i=0;i<s.dust.length;i++){const p=s.dust[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(.0011+(i%5)*.00023);dummy.updateMatrix();dustMesh.setMatrixAt(i,dummy.matrix)}dustMesh.instanceMatrix.needsUpdate=true;
    let count=0;for(const d of s.rain){if(!d.active)continue;dummy.position.set(d.x,d.y,d.z);dummy.rotation.z=.092;dummy.scale.set(1,d.speed/4.3,1);dummy.updateMatrix();rainMesh.setMatrixAt(count++,dummy.matrix)}
    rainMesh.count=count;rainMesh.instanceMatrix.needsUpdate=true;
    let beads=0;for(const d of s.umbrella.beads){if(!d.free)continue;dummy.position.set(d.x,d.y,d.z);dummy.rotation.set(0,0,0);dummy.scale.set(.006,.007+Math.abs(d.vy)*.002,.006);dummy.updateMatrix();beadMesh.setMatrixAt(beads++,dummy.matrix)}
    beadMesh.count=beads;beadMesh.instanceMatrix.needsUpdate=true;
    for(let i=0;i<wet.length;i++){const w=s.water[i],{o,ring}=wet[i],f=Math.min(1,w.depth*13);o.visible=f>.007;
      o.scale.set(.39*Math.sqrt(f),.31*Math.sqrt(f),1);o.material.opacity=Math.min(.71,f*.75);o.material.roughness=.36-.28*f;
      ring.visible=f>.16&&Math.abs(w.ripple.x)>.004;ring.scale.setScalar(Math.max(.08,Math.abs(w.ripple.x)*11));ring.position.y=o.position.y+.0017}
    positionCamera(dt);hint();chapters.forEach((c,i)=>c.className=i===s.chapter?'now':i<s.chapter?'done':'');
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(finalScene,ortho);
  }
  // All hit tests are local to a visible object. Pixel allowances keep small hardware usable on a phone.
  const ray=new T.Raycaster();const ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,0,1),-.615),worldPoint=new T.Vector3();
  function onCoinPlane(x,y){ndc.set(x/width*2-1,1-y/height*2);ray.setFromCamera(ndc,camera);return ray.ray.intersectPlane(plane,worldPoint)}
  function hit(x,y){
    const choices=[];
    function add(kind,loc,r,index,priority=0){const b=project(...loc),edge=project(loc[0]+r,loc[1],loc[2]),radius=Math.max(kind==='button'?13:19,Math.abs(edge.x-b.x));const d=Math.hypot(x-b.x,y-b.y)/radius;if(d<=1)choices.push({kind,index,score:d+priority})}
    if(s.phase==='coin')add('coin',coinAt(),.098,0,-.18);
    if(s.phase==='choose')for(let i=0;i<8;i++)add('button',buttonAt(i),.097,i);
    if(s.phase==='pickup'&&s.item)add('collect',itemAt(s.item),.125,0);
    if(s.item?.mode==='play'&&!s.closing)add('play',itemAt(s.item),[.109,.18,.12,.42][s.item.type],s.item.type);
    if(!s.closing)for(const p of s.keeps)add('oldPlay',itemAt(p),[.11,.16,.12,.36][p.type],p.type,.08);
    choices.sort((a,b)=>a.score-b.score);if(choices.length)return choices[0];
    // Inactive hardware only gives a very small spring response.
    ndc.set(x/width*2-1,1-y/height*2);ray.setFromCamera(ndc,camera);
    const hitPoint=ray.ray.intersectBox(new T.Box3(new T.Vector3(L.mx-.667,.08,-.37),new T.Vector3(L.mx+.667,2.15,.43)),worldPoint);
    return hitPoint?{kind:'nudge'}:null
  }
  let held=null;
  surface.addEventListener('pointerdown',e=>{
    if(held||e.button!==0)return;Sound.unlock();const h=hit(e.clientX,e.clientY);if(!h)return;
    game.state.quiet=0;held={...h,id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};surface.setPointerCapture(e.pointerId);
    if(h.kind==='coin')game.action('coinDown');
    else if(h.kind==='button')game.action('button',h.index);
    else if(h.kind==='collect')game.action('collect');
    else if(h.kind==='nudge')game.action('nudge');
  });
  surface.addEventListener('pointermove',e=>{
    if(!held){if(e.pointerType==='mouse'){const t=hit(e.clientX,e.clientY);surface.style.cursor=t&&t.kind!=='nudge'?'pointer':'default'}return}
    if(held.id!==e.pointerId)return;
    if(held.kind==='coin'){const wp=onCoinPlane(e.clientX,e.clientY);if(wp)game.action('coinMove',wp.x-L.mx,wp.y)}
    if(held.kind==='play'||held.kind==='oldPlay'){
      const dx=e.clientX-held.lastX,dy=e.clientY-held.lastY;if(Math.hypot(dx,dy)>13){
        if(held.kind==='oldPlay')game.action('oldPlay',held.index,dx/53||.42);else game.action('play',dx/53||.42,-dy/65);
        held.lastX=e.clientX;held.lastY=e.clientY;held.played=true}}
  });
  function release(e){if(!held||held.id!==e.pointerId)return;
    if(held.kind==='coin'&&e.type!=='pointercancel')game.action('coinUp');
    if(held.kind==='coin'&&e.type==='pointercancel')s.coin.drag=false;
    if(!held.played&&e.type!=='pointercancel'){if(held.kind==='play')game.action('play',.72);if(held.kind==='oldPlay')game.action('oldPlay',held.index,.72)}
    held=null}
  surface.addEventListener('pointerup',release);surface.addEventListener('pointercancel',release);surface.addEventListener('lostpointercapture',release);
  document.querySelector('#sound').addEventListener('click',e=>{const on=Sound.toggle();e.currentTarget.classList.toggle('muted',!on);e.currentTarget.setAttribute('aria-pressed',on)});
  let last=0;function loop(now){const dt=last?Math.min(.075,(now-last)/1000):1/60;last=now;game.step(dt);Sound.update(s,game.events());draw(dt);requestAnimationFrame(loop)}
  document.addEventListener('visibilitychange',()=>{last=0});requestAnimationFrame(loop);
})();
