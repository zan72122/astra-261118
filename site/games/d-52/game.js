'use strict';
(() => {
  const T=THREE,{v,mat}=Forms,cv=document.getElementById('ride'),sim=Fairground.create();
  window.__GAME__={step:sim.step,getState:sim.getState};
  const renderer=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.035,620),rig=new T.Group();scene.add(rig);rig.add(camera);
  const fogColor=new T.Color(0xe6c9b6);
  scene.fog=new T.FogExp2(fogColor,.00175);
  const skyLight=new T.HemisphereLight(0xffede1,0xb2b8b3,1.18);scene.add(skyLight);
  const key=new T.DirectionalLight(0xffdaa6,2.17);key.position.set(-37,34,-42);key.target.position.set(0,5,-25);
  scene.add(key,key.target);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-41,right:41,top:37,bottom:-39,near:.8,far:138});key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias=-.00038;key.shadow.normalBias=.025;
  const U={night:{value:0},sun:{value:v(-.128,.145,-1).normalize()}};
  const skyMat=mat(1,0,{side:T.BackSide,depthWrite:false,fog:false});
  skyMat.onBeforeCompile=sh=>{
    sh.uniforms.skyNight=U.night;sh.uniforms.sunVector=U.sun;
    sh.vertexShader='varying vec3 skyDir;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n skyDir=position;');
    sh.fragmentShader=`uniform float skyNight; uniform vec3 sunVector; varying vec3 skyDir;
    float skyHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
    float skyNoise(vec2 p){vec2 f=fract(p);f=f*f*(3.-2.*f);vec2 i=floor(p);return mix(mix(skyHash(i),skyHash(i+vec2(1,0)),f.x),mix(skyHash(i+vec2(0,1)),skyHash(i+1.),f.x),f.y);}
    float skyFbm(vec2 p){return .52*skyNoise(p)+.28*skyNoise(p*2.05+17.)+.14*skyNoise(p*4.21)+.06*skyNoise(p*8.3);}
    vec3 atmosphere(vec3 d){
      float h=clamp(d.y,0.,1.),sep=length(d-sunVector);
      vec3 zen=mix(vec3(.263,.333,.519),vec3(.153,.178,.322),skyNight);
      vec3 rim=mix(vec3(1.43,.780,.469),vec3(.818,.483,.427),skyNight);
      vec3 pink=mix(vec3(.945,.526,.485),vec3(.479,.323,.425),skyNight);
      vec3 col=mix(rim,pink,smoothstep(-.012,.207,h));
      col=mix(col,zen,smoothstep(.07,.64,h));
      vec2 q=d.xz/(max(d.y,.015)+.115);
      float clouds=skyFbm(q*vec2(.92,3.9)+vec2(12.,4.));
      float cover=smoothstep(.49,.70,clouds)*smoothstep(.006,.086,h)*(1.-smoothstep(.55,.86,h));
      float edge=smoothstep(.42,.59,clouds)*(1.-smoothstep(.57,.70,clouds));
      col=mix(col,vec3(.659,.505,.549)*(1.-.34*skyNight),cover*.60);
      col+=vec3(.27,.146,.075)*edge*smoothstep(.01,.1,h)*exp(-2.9*sep);
      col+=vec3(.82,.39,.13)*exp(-6.3*sep)*(1.-.42*skyNight);
      col+=vec3(.77,.43,.16)*exp(-24.*sep);
      col+=vec3(3.85,3.22,1.85)*(1.-smoothstep(.021,.0228,sep));
      return col;
    }\n`+sh.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=atmosphere(normalize(skyDir));\n#include <opaque_fragment>');
  };
  const sky=new T.Mesh(new T.SphereGeometry(480,48,24),skyMat);sky.frustumCulled=false;sky.renderOrder=-20;scene.add(sky);
  const park=buildPark(scene);
  const coast=Forms.group(scene);
  // Harbour beacon, its granite footing and catwalk all stand above the sea surface.
  const {M,cylinder,torus,ball,rod,box,pack}=Forms;
  for(let i=0;i<9;i++){
    const a=i*2.4,r=2.6*Math.sqrt(i/9);
    ball(coast,M.stone,i%2?0x9e988a:0xb0a597,-14+r*Math.cos(a),-1.20+i*.012,-98+r*.6*Math.sin(a),1.65,.65,1.28);
  }
  for(let i=0;i<5;i++)cylinder(coast,M.stone,i===3?0xb27264:0xe6dfc7,-14,-.26+i*.90,-98,.87-i*.08,.95-i*.08,.92,24);
  cylinder(coast,M.steel,0x647a75,-14,3.9,-98,.86,.85,.12);
  cylinder(coast,M.glass,0xeed4a8,-14,4.40,-98,.51,.51,.95,12);ball(coast,M.glow,0xffdf8e,-14,4.45,-98,.28);
  cylinder(coast,M.shell,0x967c6f,-14,5.00,-98,.09,.78,.53,12);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=-14+.76*Math.cos(a),z=-98+.76*Math.sin(a);rod(coast,M.steel,0x697772,[x,3.95,z],[x,4.37,z],.025);}
  torus(coast,M.steel,0x697772,-14,4.34,-98,.76,.027).rotation.x=Math.PI/2;
  for(let i=0;i<17;i++){
    const x=12+i*.89;
    box(coast,M.wood,0xc19c77,x,-.02,-59,.88,.21,2.1);
    if(i%3===0)for(const z of [-58.2,-59.8])cylinder(coast,M.wood,0x947964,x,-1,z,.13,.15,2.65);
  }
  pack(coast);
  // Surface normals contain fine capillary ripples. Large displacements come from the 10 x 6 water grid.
  const waterMat=mat(.245,.48,{color:0x456e7b,envMapIntensity:.79});
  const waterState={value:new Float32Array(60)},travelState={value:new Float32Array(8)};
  waterMat.onBeforeCompile=sh=>{
    sh.uniforms.swellGrid=waterState;sh.uniforms.rippleTravel=travelState;sh.uniforms.sunVector=U.sun;sh.uniforms.skyNight=U.night;
    sh.vertexShader=`uniform float swellGrid[60];varying vec3 seaPos;
    float seaLevel(vec2 p){vec2 g=clamp((p+vec2(76.,162.))/vec2(16.9,22.),vec2(0.),vec2(8.999,4.999));
    ivec2 i=ivec2(floor(g));vec2 u=fract(g);int j=i.x+10*i.y;return mix(mix(swellGrid[j],swellGrid[j+1],u.x),mix(swellGrid[j+10],swellGrid[j+11],u.x),u.y);}
    \n`+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=seaLevel(transformed.xz);seaPos=transformed;');
    sh.fragmentShader=`varying vec3 seaPos;uniform float rippleTravel[8];uniform vec3 sunVector;uniform float skyNight;
    float rip(vec2 p){float f=clamp((p.x+56.)/16.,0.,6.99);int k=int(f);float phase=mix(rippleTravel[k],rippleTravel[k+1],smoothstep(0.,1.,fract(f)));
    float a=sin(p.x*.63+p.y*1.5+phase*.9+sin(p.x*.39-p.y*.18)*1.7);
    float b=sin(p.x*1.37-p.y*3.1+phase*1.17+a*.8);
    return a*.55+b*.29+sin(p.x*2.45+p.y*5.8+phase*1.33+b)*.16;}
    \n`+sh.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec2 sp=seaPos.xz;float wave=rip(sp);float nx=(rip(sp+vec2(.18,0))-wave)*.27;
      float nz=(rip(sp+vec2(0,.15))-wave)*.31;
      vec3 waterN=normalize(vec3(-nx,1.,-nz));normal=normalize(mat3(viewMatrix)*waterN);`)
    .replace('#include <opaque_fragment>',`vec3 eye=normalize(cameraPosition-seaPos);vec3 reflection=reflect(-eye,waterN);
      float distSea=length(cameraPosition-seaPos);
      float streak=exp(-pow((reflection.x-sunVector.x)*8.5,2.))*exp(-abs(reflection.y-sunVector.y)*7.5);
      float glint=smoothstep(.18,.74,wave+.17*sin(sp.y*6.2+wave));
      vec3 deep=mix(vec3(.092,.195,.232),vec3(.096,.142,.205),skyNight);
      outgoingLight=mix(outgoingLight,deep,.56)+vec3(.18,.105,.082)*smoothstep(40.,185.,distSea);
      outgoingLight+=vec3(1.21,.69,.29)*streak*(.12+.87*glint)*(1.-skyNight*.53);
      #include <opaque_fragment>`);
  };
  const seaG=new T.PlaneGeometry(680,420,84,64);seaG.rotateX(-Math.PI/2);seaG.translate(0,-1.23,-167);
  const water=new T.Mesh(seaG,waterMat);water.receiveShadow=true;scene.add(water);
  // Capture surrounding geometry once for local reflections in glass, lacquer and brass.
  park.update(sim.read());
  const probeRT=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
  const probe=new T.CubeCamera(.35,590,probeRT);probe.position.set(0,10,-4);scene.add(probe);
  water.visible=false;probe.update(renderer,scene);water.visible=true;scene.remove(probe);
  const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromCubemap(probeRT.texture);
  scene.environment=env.texture;scene.environmentIntensity=.59;pmrem.dispose();probeRT.dispose();

  // A single low-strength bloom and restrained lens finish, applied in linear light.
  const rt=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:2});
  const post=new T.Scene(),postCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frame:{value:rt.texture},pixel:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 coord;void main(){coord=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame;uniform vec2 pixel;varying vec2 coord;
    vec3 bright(vec2 p){vec3 c=texture2D(frame,p).rgb;return c*smoothstep(1.05,3.8,max(max(c.r,c.g),c.b));}
    void main(){vec3 col=texture2D(frame,coord).rgb;vec2 r=pixel*3.3;
      vec3 halo=bright(coord+vec2(r.x,0))+bright(coord-vec2(r.x,0))+bright(coord+vec2(0,r.y))+bright(coord-vec2(0,r.y));
      halo+=bright(coord+r*1.7)+bright(coord-r*1.7)+bright(coord+vec2(-r.x,r.y)*1.7)+bright(coord+vec2(r.x,-r.y)*1.7);
      col+=halo*.007;vec2 xy=2.*coord-1.;col*=1.-.085*smoothstep(.32,1.65,dot(xy,xy));
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
      gl_FragColor.rgb+=grain*.005;
    }`});
  post.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  let cabin,previousAspect=0;
  function resize(){
    const w=Math.max(1,cv.clientWidth),h=Math.max(1,cv.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    const pixels=renderer.getDrawingBufferSize(new T.Vector2());rt.setSize(pixels.x,pixels.y);finish.uniforms.pixel.value.set(1/pixels.x,1/pixels.y);
    if(Math.abs(previousAspect-camera.aspect)>.004||!cabin){
      if(cabin){rig.remove(cabin.root);cabin.root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}
      cabin=buildCabin(rig,camera.aspect);previousAspect=camera.aspect;
    }
  }
  resize();new ResizeObserver(resize).observe(cv);
  const ray=new T.Raycaster(),pointer=new T.Vector2();
  function hits(e){
    const b=cv.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);
    camera.updateWorldMatrix(true,false);cabin.hit.updateWorldMatrix(true,false);ray.setFromCamera(pointer,camera);
    return ray.intersectObject(cabin.hit,false).length>0;
  }
  // Audio is all local synthesis, including low wind, gear vibration and resonant brass notes.
  let audio=null;
  function sound(){
    if(audio){if(audio.ctx.state==='suspended')audio.ctx.resume().catch(()=>{});return;}
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
    const ctx=new Context(),master=ctx.createGain();master.gain.value=.38;master.connect(ctx.destination);
    const noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=noise.getChannelData(0);
    let brown=0,seed=46;for(let i=0;i<data.length;i++){seed=(Math.imul(1664525,seed)+1013904223)>>>0;brown=(brown+(seed/4294967296-.5)*.15)/1.023;data[i]=brown;}
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),air=ctx.createGain();source.buffer=noise;source.loop=true;
    filter.type='bandpass';filter.Q.value=.52;filter.frequency.value=590;air.gain.value=.09;
    source.connect(filter).connect(air).connect(master);source.start();
    const gear=ctx.createOscillator(),vol=ctx.createGain();gear.type='sine';gear.frequency.value=65;vol.gain.value=0;
    gear.connect(vol).connect(master);gear.start();
    function chime(f,strength,duration){
      for(let i=0;i<3;i++){const o=ctx.createOscillator(),e=ctx.createGain(),now=ctx.currentTime;
        o.type='sine';o.frequency.value=f*[1,2.01,3.98][i];e.gain.setValueAtTime(.0001,now);
        e.gain.exponentialRampToValueAtTime(strength/[1,3.6,10][i],now+.016);
        e.gain.exponentialRampToValueAtTime(.0001,now+duration/(1+i*.23));
        o.connect(e).connect(master);o.start();o.stop(now+duration+.02);o.onended=()=>{o.disconnect();e.disconnect();};
      }
    }
    audio={ctx,air,gear,vol,filter,chime,mark:0,held:false,stage:0};
    ctx.resume().catch(()=>{});
  }
  function mix(s){
    if(!audio)return;const a=audio,n=a.ctx.currentTime;
    a.air.gain.setTargetAtTime(s.windSound*.53,n,.2);
    a.filter.frequency.setTargetAtTime(325+s.height*17+Math.max(0,s.wind[0].u)*38,n,.3);
    a.vol.gain.setTargetAtTime(s.omega/Fairground.SPEED*.024*(1-.85*s.quiet),n,.14);
    a.gear.frequency.setTargetAtTime(57+s.park.speed*12+s.omega*65,n,.22);
    const mark=Math.floor(s.turn/(Math.PI/6));
    if(s.held&&!a.held)a.chime([330,392,440,494][s.stage],.096,.91);
    if(!s.held&&a.held)a.chime(262,.042,.56);
    if(mark!==a.mark&&s.quiet<.45)a.chime([261.63,329.63,392,440,523.25,392][mark%6],.045,1.65);
    if(s.stage!==a.stage)a.chime([392,494,587,659][s.stage],.11,2.2);
    a.mark=mark;a.stage=s.stage;a.held=s.held;
  }
  let owner=null,startX=0;
  cv.addEventListener('pointerdown',e=>{
    if(owner!==null||e.button!==0||!hits(e))return;
    e.preventDefault();cv.setPointerCapture(e.pointerId);owner=e.pointerId;startX=e.clientX;sound();sim.press();
  });
  cv.addEventListener('pointermove',e=>{
    if(e.pointerId===owner){sim.move((e.clientX-startX)/Math.max(42,cv.clientWidth*.15));}
    else if(e.pointerType==='mouse'&&owner===null)cv.style.cursor=hits(e)?'pointer':'default';
  });
  function finishTouch(e){if(owner===null||(e&&e.pointerId!==undefined&&e.pointerId!==owner))return;
    const id=owner;owner=null;sim.release();if(cv.hasPointerCapture(id))cv.releasePointerCapture(id);}
  ['pointerup','pointercancel','lostpointercapture'].forEach(k=>cv.addEventListener(k,finishTouch));
  window.addEventListener('blur',()=>finishTouch());
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  const clearSky=new T.Color(0xe9cbb6),lateSky=new T.Color(0xc6aeb3),dayKey=new T.Color(0xffdaa6),nightKey=new T.Color(0xffba97);
  const airDay=new T.Color(0xdce8f7),airNight=new T.Color(0xd4d7f3);
  function renderWorld(s){
    const a=s.turn,ax=14.5*Math.sin(a),px=ax*Math.cos(.68),pz=1.45+ax*Math.sin(.68);
    // At the crown the seat glides past its highest point while the head settles back.
    const w=[0,1,2,3].map(i=>Math.pow(Math.max(0,Math.cos(s.cabin.dial-i*Math.PI/2)),4));
    const sum=w.reduce((a,b)=>a+b,0),lookX=(.08*w[0]+s.sail.x*w[1]-8*w[2]+1.7*w[3])/sum;
    const yaw=Math.atan2(px-lookX,52+pz);
    rig.position.set(px,8.42+s.height,pz-.27);rig.rotation.order='YXZ';
    rig.rotation.set(-.100-.165*s.height/29,yaw,s.pods[0].angle*.45,'YXZ');
    camera.position.set(-.009*s.quiet,.008*s.quiet,.085*s.quiet);camera.rotation.set(.018*s.quiet,-.007*s.quiet,0);
    sky.position.copy(rig.position);U.night.value=s.dusk;U.sun.value.set(-.128,.145-.135*s.dusk,-1).normalize();
    scene.fog.color.copy(clearSky).lerp(lateSky,s.dusk);scene.fog.density=(s.haze[0]*.56+s.haze[1]*.28+s.haze[2]*.16);
    key.color.copy(dayKey).lerp(nightKey,s.dusk);key.intensity=2.14-.94*s.dusk;
    skyLight.color.copy(airDay).lerp(airNight,s.dusk);skyLight.intensity=1.32-.09*s.dusk;
    for(let i=0;i<60;i++)waterState.value[i]=s.waves[i].z;
    for(let i=0;i<8;i++)travelState.value[i]=s.waves[i+20].travel;
    park.update(s);cabin.update(s);mix(s);
    renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(post,postCam);
  }
  let last=null;
  document.addEventListener('visibilitychange',()=>{last=null;if(document.hidden){finishTouch();if(audio)audio.ctx.suspend().catch(()=>{});}else if(audio)audio.ctx.resume().catch(()=>{});});
  function frame(now){if(!document.hidden){
    if(last!==null)sim.step((now-last)/1000);last=now;renderWorld(sim.read());
  }requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
