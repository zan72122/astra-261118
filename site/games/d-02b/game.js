'use strict';
(() => {
  const sim=S.create(),q=sim.state,sound=new KartSound();
  window.__GAME__={step:dt=>sim.step(dt),getState:()=>sim.getState(),setPressed:on=>sim.setPressed(on)};
  const canvas=document.getElementById('view'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.2,1150);
  const sky=environment();scene.background=sky;scene.environment=sky;scene.environmentIntensity=.53;
  scene.fog=new T.FogExp2('#c5cfc3',.0033);
  const hemi=new T.HemisphereLight('#e3eff4','#ab9572',1.54), sun=new T.DirectionalLight('#fff0cd',2.36);
  sun.castShadow=true;const sc=sun.shadow.camera;sc.left=-33;sc.right=33;sc.top=35;sc.bottom=-35;sc.near=.5;sc.far=160;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00038;sun.shadow.normalBias=.025;scene.add(hemi,sun,sun.target);
  const mountain=mountains();scene.add(mountain);
  const kart=makeKart();scene.add(kart.root);
  const hoops=S.rings.map(()=>{const g=makeRing();scene.add(g);return g;});
  const sign=trailSign(),mill=waterMill(),bore=tunnelSection();scene.add(sign,mill,bore);
  const cars=['#718d83','#d4ab69','#839cac'].map(color=>{const c=familyCar(color);scene.add(c);return c;});
  const waveUniform={value:new Float32Array(24)},windUniform={value:new Float32Array(14)},waterPhase={value:0};
  treeMat.onBeforeCompile=shader=>{
    shader.uniforms.branchBend=windUniform;
    shader.vertexShader='uniform float branchBend[14]; varying vec3 vLeafSpace;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vLeafSpace=position;
      #ifdef USE_INSTANCING
        int sector=int(mod(abs(instanceMatrix[3].x*.93+instanceMatrix[3].z*.37),14.));
        float flex=branchBend[sector]*pow(max(position.y-.9,0.),1.55)*.097;
        transformed.x+=flex; transformed.z+=flex*.36;
      #endif
    `);
    shader.fragmentShader='varying vec3 vLeafSpace;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 v=vLeafSpace;
      float d=sin(v.x*31.+sin(v.y*17.))*sin(v.z*27.+v.y*20.);
      float finer=sin(v.x*61.+v.z*51.)*sin(v.y*48.-v.x*26.);
      diffuseColor.rgb*=1.+smoothstep(2.,3.8,v.y)*(.116*d+.069*finer);
    `);
  };
  const iceUniform={value:new Float32Array(12)},strawUniform={value:new Float32Array(9)};
  roadMat.onBeforeCompile=shader=>{
    shader.uniforms.frostMass=iceUniform;
    shader.vertexShader='varying vec3 vRoad;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vRoad=position;');
    shader.fragmentShader='uniform float frostMass[12]; varying vec3 vRoad;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      int patchId=int(mod(floor(vRoad.x*1.7-vRoad.z*.67),12.));
      float frost=frostMass[patchId]*smoothstep(.25,.83,sin(vRoad.x*37.+sin(vRoad.z*31.))*sin(vRoad.z*24.));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.88,.94,.96),frost*.58);
    `);
  };
  strawMat.onBeforeCompile=shader=>{
    shader.uniforms.stemLean=strawUniform;
    shader.vertexShader='uniform float stemLean[9];\n'+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        int sector=int(mod(abs(instanceMatrix[3].x+instanceMatrix[3].z*.6),9.));
        transformed.x+=stemLean[sector]*position.y*position.y*.44;
      #endif
    `);
  };
  waterMat.onBeforeCompile=shader=>{
    shader.uniforms.waveHeights=waveUniform;shader.uniforms.streamPhase=waterPhase;
    shader.vertexShader='uniform float waveHeights[24]; varying vec3 vStream;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vStream=position; float cell=mod(position.x*.68-position.z*.37,24.);
      transformed.y+=mix(waveHeights[int(cell)],waveHeights[int(mod(floor(cell)+1.,24.))],fract(cell));
    `);
    shader.fragmentShader='uniform float streamPhase; varying vec3 vStream;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      #include <normal_fragment_maps>
      float a=sin(vStream.z*4.6+vStream.x*1.7+streamPhase*1.8+sin(vStream.x*3.2));
      float b=sin(vStream.z*9.3-vStream.x*4.2-streamPhase*2.2);
      normal=normalize(normal+mat3(viewMatrix)*vec3(.043*a,0.,(a+b)*.056));
    `);
  };
  const chunks=new Map();
  function chunkWindow(){
    const id=Math.floor(q.s/CHUNK);
    for(let i=id-1;i<=id+5;i++)if(!chunks.has(i)){
      const g=makeChunk(i);chunks.set(i,g);scene.add(g);
    }
    for(const [i,g] of chunks)if(i<id-1||i>id+5){
      scene.remove(g);g.traverse(o=>{if(o.userData.dispose)o.geometry.dispose();if(o.isInstancedMesh)o.dispose();});chunks.delete(i);
    }
  }
  const sparkleMat=material(0xffffff,.55,.1,{side:T.DoubleSide}),flakesMat=material(0xffffff,.72,0,{side:T.DoubleSide});
  const flying=new T.InstancedMesh(geo.leaf,sparkleMat,q.leaves.length),wake=new T.InstancedMesh(geo.pebble,flakesMat,180);
  const snowfall=new T.InstancedMesh(geo.pebble,material('#ecf1ee',.78),q.crystals.length);
  snowfall.frustumCulled=false;scene.add(snowfall);
  const motes=new T.InstancedMesh(geo.pebble,material('#ffe5a0',.64,.02,{emissive:0xc69648,emissiveIntensity:.45}),q.leaves.length);
  flying.frustumCulled=wake.frustumCulled=motes.frustumCulled=false;scene.add(flying,wake,motes);
  const dustColors={water:rgb('#d1e5df'),dust:rgb('#b9a586'),leaf:rgb('#a6874a'),snow:rgb('#eef5f0')};
  // Soft contact under the chassis complements the sun shadow at tyre scale.
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=96;const cc=contactCanvas.getContext('2d'),cg=cc.createRadialGradient(48,48,4,48,48,48);
  cg.addColorStop(0,'rgba(40,32,20,.56)');cg.addColorStop(.56,'rgba(45,36,22,.38)');cg.addColorStop(1,'rgba(50,41,29,0)');
  cc.fillStyle=cg;cc.fillRect(0,0,96,96);const contactMap=new T.CanvasTexture(contactCanvas);contactMap.colorSpace=T.SRGBColorSpace;
  const contact=piece(kart.root,new T.PlaneGeometry(3,4.2),material('#4b483b',1,0,{map:contactMap,transparent:true,depthWrite:false}),0,.012,0,1,1,1,-PI/2);
  contact.castShadow=false;
  const pedal=document.getElementById('pedal'),hand=document.getElementById('hand'),speaker=document.getElementById('audio'),marks=[...document.querySelectorAll('.medal')],needle=document.getElementById('needle');
  const tickGroup=document.getElementById('gaugeTicks');
  for(let i=0;i<=32;i++){const a=(i/32*252-126)*PI/180,m=i%4===0,len=m?10:i%2?4:6;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    for(const [key,val] of Object.entries({x1:75+Math.sin(a)*(52-len),y1:75-Math.cos(a)*(52-len),x2:75+Math.sin(a)*52,y2:75-Math.cos(a)*52,stroke:i>26?'#dfac6d':'#eadbb7','stroke-width':m?2.9:1.5,'stroke-linecap':'round'}))line.setAttribute(key,val);tickGroup.appendChild(line);}
  let activePointer=null,pressedElement=null,keyboard=false;
  function press(e){if(activePointer!==null||keyboard||e.button!==0)return;e.preventDefault();activePointer=e.pointerId;pressedElement=e.currentTarget;
    pressedElement.setPointerCapture(e.pointerId);sound.open();sim.setPressed(true);}
  function release(e){if(e&&activePointer!==e.pointerId)return;const el=pressedElement,id=activePointer;activePointer=null;pressedElement=null;keyboard=false;sim.setPressed(false);
    if(el&&el.hasPointerCapture(id))el.releasePointerCapture(id);}
  pedal.addEventListener('pointerdown',press);
  const ray=new T.Raycaster(),mouse=new T.Vector2();
  canvas.addEventListener('pointerdown',e=>{const b=canvas.getBoundingClientRect();mouse.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);ray.setFromCamera(mouse,camera);
    if(ray.intersectObject(kart.root,true).some(hit=>hit.object!==contact))press(e);});
  for(const el of [pedal,canvas])for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,release);
  pedal.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)&&!e.repeat&&activePointer===null){e.preventDefault();keyboard=true;sound.open();sim.setPressed(true);}});
  pedal.addEventListener('keyup',e=>{if(keyboard&&[' ','Enter'].includes(e.key)){e.preventDefault();release();}});
  speaker.addEventListener('click',()=>{sound.open();sound.enabled=!sound.enabled;speaker.classList.toggle('muted',!sound.enabled);speaker.setAttribute('aria-pressed',String(sound.enabled));});
  window.addEventListener('blur',()=>release());document.addEventListener('visibilitychange',()=>{if(document.hidden){release();sound.ctx?.suspend().catch(()=>{});}else if(sound.ctx&&sound.enabled)sound.ctx.resume().catch(()=>{});});
  // Render the highlights into a small bright-pass buffer. All geometry is PBR;
  // this full-screen pass is confined to bloom, film grain and output conversion.
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:0});
  const bloom=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
  const fx=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const vs='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const bright=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{src:{value:target.texture},px:{value:new T.Vector2()}},vertexShader:vs,fragmentShader:`
    uniform sampler2D src;uniform vec2 px;varying vec2 vUv;
    void main(){vec3 sum=vec3(0.);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec3 c=texture2D(src,vUv+vec2(float(x),float(y))*px*2.).rgb;sum+=max(c-vec3(1.18),vec3(0.));}gl_FragColor=vec4(sum/9.,1.);}`});
  const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{src:{value:target.texture},bloomTex:{value:bloom.texture},bpx:{value:new T.Vector2()}},vertexShader:vs,fragmentShader:`
    uniform sampler2D src,bloomTex;uniform vec2 bpx;varying vec2 vUv;
    void main(){vec3 col=texture2D(src,vUv).rgb;vec3 halo=vec3(0.);float weights=0.;
    for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){float w=1./(1.+float(x*x+y*y));halo+=w*texture2D(bloomTex,vUv+vec2(float(x),float(y))*bpx*1.6).rgb;weights+=w;}
    col+=halo*.13/weights;
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
    gl_FragColor.rgb+=grain*.009;
    }`});
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),bright);fx.add(quad);
  function resize(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    const px=renderer.getPixelRatio();target.setSize(Math.round(w*px),Math.round(h*px));bloom.setSize(Math.max(1,Math.round(w*px/6)),Math.max(1,Math.round(h*px/6)));
    bright.uniforms.px.value.set(1/target.width,1/target.height);finish.uniforms.bpx.value.set(1/bloom.width,1/bloom.height);
  }
  window.addEventListener('resize',resize);resize();
  const skyFog=rgb('#c9d3cb'),coldFog=rgb('#ccdade'),warmSun=rgb('#fff0cf'),coldSun=rgb('#edf4fc');
  let shownStage=-1,wasHeld=false,reflectionStage=-1;
  const reflectionTarget=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
  const reflectionCam=new T.CubeCamera(.3,440,reflectionTarget);
  function render(){
    chunkWindow();const d=S.local(q.s),p=S.point(q.s,q.route),angle=S.heading(q.s,q.route),lap=q.lap*S.LENGTH;
    q.climate.forEach((cell,i)=>iceUniform.value[i]=cell.ice);q.stubble.forEach((stem,i)=>strawUniform.value[i]=stem.tilt);
    for(let i=0;i<q.branches.length;i++)windUniform.value[i]=q.branches[i].a;
    for(let i=0;i<q.water.length;i++)waveUniform.value[i]=q.water[i].h;waterPhase.value=q.water[0].phase;
    for(const g of chunks.values())g.userData.highlights.position.y=q.water[S.mod(g.userData.start/CHUNK,24)].h*.64;
    mountain.position.set(S.baseX(q.s)*.43,p.y-4,-q.s+18*Math.sin(q.s*TAU/S.LENGTH));
    kart.root.position.set(p.x,p.y+.145,-q.s);
    const grade=Math.atan2(S.point(q.s+1,q.route).y-S.point(q.s-1,q.route).y,2/Math.cos(angle));
    kart.root.rotation.order='YXZ';kart.root.rotation.set(grade,-angle,0,'YXZ');
    const h=q.shocks; kart.body.position.y=(h[0].x+h[1].x+h[2].x+h[3].x)/4;
    kart.body.rotation.z=q.roll+(h[0].x-h[1].x)*.25;kart.body.rotation.x=(h[0].x+h[1].x-h[2].x-h[3].x)*.2;
    kart.head.rotation.z=-q.roll*.35+q.branches[2].v*.017;kart.head.rotation.y=q.roll*.31;
    for(let i=0;i<4;i++){kart.wheels[i].position.y=(i<2?.393:.427)+h[i].x*.65;kart.hubs[i].rotation.x=-q.travel/(i<2?.366:.414);}
    const steer=S.heading(q.s+3,q.route)-angle;kart.steer.rotation.z=-steer*3;kart.wheels[0].rotation.y=kart.wheels[1].rotation.y=-steer;
    const portrait=S.clamp((1-camera.aspect)/.52,0,1),back=9.65+portrait*1.55+q.speed*.032;
    const chase=S.heading(q.s-1.4,q.route);camera.position.set(p.x-Math.sin(chase)*back,p.y+4,-q.s+Math.cos(chase)*back);
    // The chase sightline anticipates the next bend while the wheels use the local tangent.
    const look=angle*.70+S.heading(q.s+12,q.route)*.3;
    camera.lookAt(camera.position.x+Math.sin(look)*17,camera.position.y-(.159-portrait*.022)*17+Math.sin(grade)*5,camera.position.z-Math.cos(look)*17);
    camera.fov=40+q.speed*.31;camera.updateProjectionMatrix();
    const focus=S.point(q.s+12,q.route);sun.target.position.set(focus.x,focus.y,-q.s-12);
    sun.position.set(focus.x+38,focus.y+56,-q.s-1);sun.color.copy(warmSun).lerp(coldSun,q.snow);
    sun.intensity=2.2*q.light;hemi.intensity=(1.40-q.echo*.89)*(1+q.snow*.07);
    scene.fog.color.copy(skyFog).lerp(coldFog,q.snow);scene.fog.density=.0032+.0008*q.snow;
    renderer.toneMappingExposure=q.exposure;
    sign.visible=d<105;const marker=S.point(lap+13);sign.position.set(marker.x+4.7,ground(lap+13,4.7),-lap-13);sign.rotation.y=-S.heading(lap+13,0)+.14;
    for(let i=0;i<hoops.length;i++){const g=hoops[i],s=lap+S.rings[i],delta=s-q.s,pt=S.point(s);
      g.visible=delta>-9&&delta<145;if(!g.visible)continue;g.position.set(pt.x,pt.y+.13,-s);g.rotation.y=-S.heading(s,0);
      const impulse=q.lastRing===s?q.ringEnergy:0;g.scale.setScalar(1+impulse*.14);
      for(let j=0;j<g.userData.sparks.length;j++){const a=q.water[(j*3+i)%24].phase*.60+j*TAU/7,r=2.37+q.branches[j].a*.55;g.userData.sparks[j].position.set(Math.cos(a)*r,1.97+Math.sin(a)*r,.05+q.water[j].h);}
    }
    bore.visible=d>575&&d<969;bore.position.z=-lap;
    if(bore.visible)for(const [s,l] of bore.userData.lamps)l.material.emissiveIntensity=.45+2.3*Math.exp(-Math.abs(s-d-5)*.05);
    mill.position.z=-lap;mill.visible=d>315&&d<563;mill.userData.wheel.rotation.x=q.wheelAngle;
    for(let i=0;i<cars.length;i++){
      const car=cars[i];car.visible=q.parade>.001;if(!car.visible)continue;
      const s=q.s+12+i*7.2+q.carSpacing[i]+(1-q.parade)*80,pt=S.point(s);
      car.position.set(pt.x+(i===1?1.46:-1.29),pt.y+.15+.025*Math.sin(q.water[i].phase),-s);car.rotation.y=-S.heading(s,0);car.rotation.z=q.shocks[i].x*.53;
    }
    for(let i=0;i<q.leaves.length;i++){
      const f=q.leaves[i],s=q.s+f.z,base=S.point(s,q.route),u=base.x-S.baseX(s)+f.x,near=Math.abs(f.x)<3.5,
        fy=(near?base.y+.145:Math.max(ground(s,u),S.height(s)-.65))+f.y;
      const scale=(.068+(i%5)*.009)*(1-q.echo)*(1-.64*q.snow);
      flying.setMatrixAt(i,matrix(base.x+f.x,fy,-s,scale,scale*.72,scale*1.32,f.onGround?0:f.angle*.7,f.angle,f.onGround?.07:f.angle*.29));
      flying.setColorAt(i,rgb(['#cc813d','#b35e32','#dba64e','#b68a42'][i%4]).lerp(rgb('#eef4ed'),q.snow));
      const sparkScale=.105*q.grain*(.17+q.stubble[i%9].release*2);
      motes.setMatrixAt(i,matrix(base.x+f.x,fy+.4,-s,sparkScale,sparkScale*1.8,sparkScale));
    }
    snowfall.visible=q.snow>.005;
    if(snowfall.visible){q.crystals.forEach((f,i)=>{const s=q.s+f.z,p=S.point(s,q.route),k=(.015+(i%4)*.005)*q.snow;
      snowfall.setMatrixAt(i,matrix(p.x+f.x,(Math.abs(f.x)<3.5?p.y+.15:ground(s,f.x))+f.y,-s,k,k*.52,k,0,f.life*.4,0));});snowfall.instanceMatrix.needsUpdate=true;}
    flying.instanceMatrix.needsUpdate=flying.instanceColor.needsUpdate=motes.instanceMatrix.needsUpdate=true;
    wake.count=Math.min(180,q.particles.length);
    for(let i=0;i<wake.count;i++){const a=q.particles[i],pt=S.point(a.s,q.route),k=a.scale*Math.max(0,1-a.age/a.life),dust=a.kind==='dust';
      const sz=k*(dust?1+a.age*3:1);wake.setMatrixAt(i,matrix(a.x,pt.y+.145+a.y,-a.s,sz,sz*(a.kind==='water'?1.85:1),sz,.3,a.id*.37,0));wake.setColorAt(i,dustColors[a.kind]);}
    wake.instanceMatrix.needsUpdate=true;if(wake.instanceColor)wake.instanceColor.needsUpdate=true;
    if(q.stage!==shownStage){marks.forEach((m,i)=>m.classList.toggle('active',i===q.stage));shownStage=q.stage;}
    if(q.held!==wasHeld){pedal.classList.toggle('down',q.held);pedal.setAttribute('aria-pressed',String(q.held));wasHeld=q.held;}
    needle.style.transform='rotate('+(-126+q.speed*14)+'deg)';
    hand.style.opacity=q.hint;const gesture=(1-Math.cos(Math.max(0,q.idle-4)*2.55))*.5;hand.style.transform='translate('+(-gesture*24)+'%,'+(-gesture*26)+'%) rotate('+(-gesture*8)+'deg)';
    if(reflectionStage!==q.stage){
      reflectionStage=q.stage;kart.root.visible=false;reflectionCam.position.set(p.x,p.y+1.6,-q.s-3);
      scene.environment=sky;renderer.shadowMap.autoUpdate=false;reflectionCam.update(renderer,scene);renderer.shadowMap.autoUpdate=true;kart.root.visible=true;
      scene.environment=reflectionTarget.texture;
    }
    renderer.setRenderTarget(target);renderer.render(scene,camera);
    quad.material=bright;renderer.setRenderTarget(bloom);renderer.render(fx,ortho);
    quad.material=finish;renderer.setRenderTarget(null);renderer.render(fx,ortho);
  }
  let last=performance.now();
  function frame(now){
    const dt=Math.min(.08,Math.max(0,(now-last)/1000));last=now;
    if(!document.hidden){sim.step(dt);render();sound.update(q);}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
