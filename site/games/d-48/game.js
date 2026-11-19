(()=>{
  'use strict';
  const T=THREE, sim=BubbleGarden.create(), s=sim.state;
  window.__GAME__={step:sim.step,getState:sim.getState};
  const canvas=document.getElementById('garden'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(),M=GardenMaterials(T),sky=M.sky();scene.background=sky;scene.environment=sky;
  scene.backgroundBlurriness=.024;scene.fog=new T.FogExp2(0xe1e3c8,.041);
  const hemi=new T.HemisphereLight(0xe0f1ff,0xa4a382,1.77);scene.add(hemi);
  const key=new T.DirectionalLight(0xffe6bd,2.57);key.castShadow=true;
  key.position.set(-3.25,5.45,-3.45);scene.add(key,key.target);
  const sc=key.shadow.camera;sc.left=-3.9;sc.right=3.9;sc.top=3.9;sc.bottom=-3.9;sc.near=.1;sc.far=17;
  key.shadow.mapSize.set(1536,1536);key.shadow.normalBias=.0017;key.shadow.bias=-.00017;key.shadow.radius=2.2;
  const g=buildGarden(T,scene,M),V=(x,y,z)=>new T.Vector3(x,y,z),clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const camera=new T.PerspectiveCamera(34,1,.018,85);
  const envTarget=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType,generateMipmaps:false});
  const probe=new T.CubeCamera(.06,65,envTarget);probe.position.set(.1,1.42,-.76);
  if(renderer.extensions.has('EXT_color_buffer_float')){
    probe.update(renderer,scene);
    const prefilter=new T.PMREMGenerator(renderer),reflection=prefilter.fromCubemap(envTarget.texture);
    scene.environment=reflection.texture;prefilter.dispose();
  }
  envTarget.dispose();
  const bubbles=Array.from({length:5},()=>{const o=new T.Mesh(new T.SphereGeometry(1,64,44),M.soap(false));
    o.renderOrder=5;o.visible=false;scene.add(o);return o;});
  const shape=new T.SphereGeometry(1,8,6),dummy=new T.Object3D(),axis=V(0,1,0);
  function particles(geo,material,n){const m=new T.InstancedMesh(geo,material,n);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;}
  const drops=particles(shape,g.streamMat,200),mist=particles(shape,g.streamMat,112);
  const motes=particles(new T.IcosahedronGeometry(1,0),M.mat(0xffe9bf,.75,0,{emissive:0xad9159,emissiveIntensity:.26,transparent:true,opacity:.51,depthWrite:false}),54);
  const ripples=particles(new T.TorusGeometry(1,.018,5,43),M.mat(0xcce8d9,.16,.29,{transparent:true,opacity:.46,depthWrite:false}),60);
  const scratch=V(),scratch2=V(),waterUp=new T.Quaternion().setFromAxisAngle(V(1,0,0),-Math.PI/2);
  function instance(mesh,i,x,y,z,sx,sy,sz,q){
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);
    if(q)dummy.quaternion.copy(q);else dummy.quaternion.identity();dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  function setCount(m,n){m.count=n;m.instanceMatrix.needsUpdate=true;}
  function surface(o,values,sectors,rows,field,film){
    const a=o.geometry.attributes.position,sections=values.length;
    for(let r=0;r<=rows;r++)for(let i=0;i<sectors;i++){
      const u=i*sections/sectors,k=Math.floor(u),f=u-k;const h=values[k][field]*(1-f)+values[(k+1)%sections][field]*f;
      const rr=r/rows,weight=film?Math.sin(rr*Math.PI)*.9+(.27*(1-rr)):rr;
      a.setZ(r*sectors+i,h*weight);
    }
    a.needsUpdate=true;o.geometry.computeVertexNormals();
  }
  let width=0,height=0,aspect=1,camZ=1,routePath,lookPath;
  // A light linear-space bloom, vignette and sub-pixel grain finish the same 3D render.
  const target=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,
    samples:Math.min(2,renderer.capabilities.maxSamples)});
  const post=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const postMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frame:{value:target.texture},pixel:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame;uniform vec2 pixel;varying vec2 vUv;
      void main(){
        vec3 c=texture2D(frame,vUv).rgb;vec3 bloom=vec3(0.);
        for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
          vec3 local=texture2D(frame,vUv+vec2(float(x),float(y))*pixel*4.).rgb;
          bloom+=max(local-vec3(1.16),vec3(0.));
        }
        float vig=1.-.112*pow(length(vUv-.5)*1.34,2.);
        c=(c+bloom*.0105)*vig;gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
        gl_FragColor.rgb+=(grain-.5)*.009;
      }`});
  post.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
  function resize(){
    width=window.innerWidth;height=window.innerHeight;aspect=width/height;renderer.setSize(width,height,false);
    const sz=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(sz.x,sz.y);postMat.uniforms.pixel.value.set(1/sz.x,1/sz.y);
    camera.aspect=aspect;camera.updateProjectionMatrix();
    camZ=Math.max(1.115,.692/(.6115*aspect));
    const portrait=clamp((1.1-aspect)*1.5,0,1);
    routePath=new T.CatmullRomCurve3([V(.012,1.115+(camZ-1.115)*.067,camZ),V(.11,1.31,.48+portrait*.56),
      V(.37,1.67,-.88+portrait*.32),V(.76,1.86,-2.19),V(.98,1.56+portrait*.14,-3.68+portrait*.48)]);
    lookPath=new T.CatmullRomCurve3([V(.014,.985,-.025),V(.09,1.145,-.75),V(.38,1.21,-2.9),
      V(.58,1.12,-4.96),V(.6,.93+portrait*.14,-6.1)]);
  }
  const afternoon=new T.Color(0xffe6bd),evening=new T.Color(0xffb574),fogDay=new T.Color(0xe1e3c8),fogLate=new T.Color(0xf0d7b8);
  const temp=V(),aim=V();let lastChapter='';
  function renderWorld(){
    const route=s.route,blend=route*route*(3-2*route);
    routePath.getPoint(blend,camera.position);lookPath.getPoint(blend,aim);
    const evening=s.light*route*route;camera.position.x-=.40*evening;camera.position.z-=.41*evening;
    camera.position.y-=.13*evening;aim.y+=.19*evening;
    aim.x+=s.follow.x;aim.y+=s.follow.y;
    camera.lookAt(aim);camera.updateMatrixWorld();
    key.target.position.set(.35*route,.54,-5.8*route);key.position.copy(key.target.position).add(temp.set(-3.25-s.light*2.5,5.3-s.light*3.5,-3.5));
    key.color.copy(afternoon).lerp(evening,s.light);key.intensity=2.52-s.light*.49+s.wind[2].u*.17;
    hemi.intensity=1.69-s.light*.44;scene.fog.color.copy(fogDay).lerp(fogLate,s.light);
    scene.backgroundIntensity=.91-s.light*.19;
    scene.backgroundRotation.z=.016*s.light;
    const w=s.wand;g.wand.position.set(BubbleGarden.origin.x+w.x,BubbleGarden.origin.y+w.y,BubbleGarden.origin.z);
    g.wand.rotation.set(w.vy*.10,-w.vx*.31,-w.vx*.10);
    surface(g.liquid,s.water,48,6,'h',false);surface(g.film,s.film,54,7,'bulge',true);
    const fu=g.film.material.userData.u;fu.thick.value.set(s.film[0].nm,s.film[5].nm,s.film[9].nm,s.film[14].nm);
    fu.span.value.set(s.film[0].cover,s.film[5].cover,s.film[9].cover,s.film[14].cover);
    fu.flow.value=s.film[2].bulge*85+s.wind[2].u*1.5;fu.dusk.value=s.light;
    g.hoop.material.emissive.setHex(0xe3a951);g.hoop.material.emissiveIntensity=s.stage==='garden'?.07+s.idle/(25+s.idle)*.075:.01;
    g.pin.rotation.z=s.spinner.angle;
    for(const m of g.moving){const r=s.reeds[m.index];m.obj.rotation.z=r.angle;m.obj.rotation.x=s.reeds[(m.index+3)%28].angle*.46;}
    bubbles.forEach((o,i)=>{const b=s.bubbles[i];o.visible=!!b;if(!b)return;
      o.position.set(b.x,b.y,b.z);o.scale.set(b.r*(1-b.stretch*.50),b.r*(1+b.stretch),b.r*(1-b.stretch*.5));
      o.rotation.y=b.vx*.8;const u=o.material.userData.u;u.thick.value.set(b.skin[0],b.skin[3],b.skin[6],b.skin[9]);
      u.flow.value=(b.skin[4]-b.skin[0])*.007+b.vx*2;u.dusk.value=s.light;o.userData.id=b.id;});
    s.drops.slice(0,200).forEach((d,i)=>{instance(drops,i,d.x,d.y,d.z,d.r*.76,d.r*(1.06+Math.abs(d.vy)*.48),d.r*.76);});
    setCount(drops,Math.min(200,s.drops.length));
    s.mist.slice(0,112).forEach((d,i)=>{const r=.0024*Math.min(1,d.life*5);instance(mist,i,d.x,d.y,d.z,r,r*1.24,r);});setCount(mist,Math.min(112,s.mist.length));
    s.dust.forEach((d,i)=>{const r=.00095+(i%5)*.00028;instance(motes,i,d.x,d.y,d.z,r,r*.7,r);});setCount(motes,s.dust.length);
    s.ripples.slice(0,60).forEach((d,i)=>instance(ripples,i,d.x,d.y+.0012,d.z,d.r,d.r,d.amplitude*.032,waterUp));setCount(ripples,Math.min(60,s.ripples.length));
    s.jets.forEach((j,i)=>{const mid=i===6,a=i*Math.PI/3+j.phase*.027,dx=Math.cos(a),dz=Math.sin(a);
      function point(t,p){const side=(mid?0:.12)+(mid?.025:1.25)*j.p*t;
        return p.set(dx*side,(mid?1.35:1.035)+(mid?2.55:1.2)*j.p*t-4.905*t*t,dz*side);}
      for(let k=0;k<10;k++){const t=(mid?.18:.145)*j.p/10;point(k*t,scratch);point((k+1)*t,scratch2);
        const len=scratch.distanceTo(scratch2);dummy.position.copy(scratch).lerp(scratch2,.5);
        dummy.quaternion.setFromUnitVectors(axis,scratch2.sub(scratch).normalize());
        const r=(mid?.014:.010)*Math.sqrt(j.p)*(1-k*.047);dummy.scale.set(r,len*1.07,r);dummy.updateMatrix();g.jets.setMatrixAt(i*10+k,dummy.matrix);}
    });g.jets.instanceMatrix.needsUpdate=true;
    if(lastChapter!==s.stage){lastChapter=s.stage;const idx=['garden','flight','fountain','sunset'].indexOf(s.stage);
      document.querySelectorAll('#chapters svg').forEach((el,i)=>el.classList.toggle('here',i===(idx<0?3:idx)));}
    updateGuide();renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(post,postCamera);
  }
  // Finger examples are anchored in the projected world and follow the current affordance.
  const guide=document.getElementById('guide');
  function project(x,y,z){const p=V(x,y,z).project(camera);return {x:(p.x+1)*width*.5,y:(1-p.y)*height*.5,z:p.z};}
  function onScreen(p){return p.z<1&&p.z>-1&&p.x>12&&p.x<width-12&&p.y>18&&p.y<height-22;}
  function updateGuide(){
    const f=s.guide.stroke;if(s.guide.age<=0||f<=0||f>1.39){guide.style.opacity=0;return;}
    let p;const a=clamp((f-.18)/.75,0,1),k=a*a*(3-2*a);
    if(s.stage==='garden')p=project(g.wand.position.x+.045+k*.091,g.wand.position.y-.079+k*.099,.04);
    if(s.stage==='flight'){p=project(.52+.054*Math.sin(k*3),1.365+.052*Math.cos(k*3),-2.90);}
    if(s.stage==='fountain')p=project(.60+k*.11,1.47+k*.04,-6.1);
    if(s.stage==='sunset'&&s.bubbles.length){const b=s.bubbles[0];p=project(b.x+.027*(1-k),b.y-.044*(1-k),b.z);}
    if(!p||!onScreen(p)){guide.style.opacity=0;return;}
    guide.style.transform='translate('+(p.x-10)+'px,'+(p.y-8)+'px) rotate('+(-12+6*k)+'deg)';
    guide.style.opacity=.64*Math.min(1,f*6,(1.39-f)*4.6);
  }
  // Synthesised water, soap pops and a very quiet stream. Audio starts with the first gesture.
  let audio=null,bus,waterGain,muted=false;
  const sound=document.getElementById('sound');
  function unlock(){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    if(!audio){
      audio=new AC();bus=audio.createGain();bus.gain.value=muted?0:.37;bus.connect(audio.destination);
      const buf=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),arr=buf.getChannelData(0);let prev=0;
      for(let i=0;i<arr.length;i++){prev=.7*prev+.3*(Math.random()*2-1);arr[i]=prev;}
      const noise=audio.createBufferSource(),filter=audio.createBiquadFilter();filter.type='bandpass';filter.frequency.value=2240;filter.Q.value=.65;
      waterGain=audio.createGain();waterGain.gain.value=.002;noise.buffer=buf;noise.loop=true;noise.connect(filter).connect(waterGain).connect(bus);noise.start();
    }
    if(audio.state==='suspended')audio.resume().catch(()=>{});
  }
  function note(freq,end,len,volume,type='sine',wait=0){
    if(!audio||muted)return;const now=audio.currentTime+wait,osc=audio.createOscillator(),gain=audio.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(end,now+len);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.007);gain.gain.exponentialRampToValueAtTime(.0001,now+len);
    osc.connect(gain).connect(bus);osc.start(now);osc.stop(now+len+.02);osc.onended=()=>{gain.disconnect();osc.disconnect();};
  }
  function playEvents(){for(const ev of sim.drainEvents()){
    if(ev==='pop'){note(930,275,.095,.32);note(1390,840,.085,.055,'sine',.025);}
    else if(ev==='softPop')note(830,490,.07,.038);
    else if(ev==='birth'){note(429,674,.29,.10);note(843,906,.32,.037,'sine',.08);}
    else if(ev==='dropBirth'||ev==='water')note(690+Math.random()*120,1090,.11,.061);
    else if(ev==='wind')note(494,510,.61,.075);
  }if(audio)waterGain.gain.setTargetAtTime(.0018+.044*s.route+.012*s.shower,audio.currentTime,.25);}
  sound.addEventListener('click',()=>{unlock();muted=!muted;sound.classList.toggle('muted',muted);
    sound.setAttribute('aria-pressed',String(muted));sound.setAttribute('aria-label',muted?'音を出す':'音を消す');
    if(audio)bus.gain.setTargetAtTime(muted?0:.37,audio.currentTime,.05);});
  const ray=new T.Raycaster();
  let finger=null,action='',startX=0,startY=0,startWX=0,startWY=0,lastSpray=0;
  function localPt(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  function near(p,loc,r){return p.z<1&&p.z>-1&&Math.hypot(p.x-loc.x,p.y-loc.y)<r;}
  function nearWand(loc){
    const pts=[V(0,-.291,0),V(0,-.10,0),V(0,0,0)].map(p=>{g.tilt.localToWorld(p);return project(p.x,p.y,p.z);});
    const edge=g.tilt.localToWorld(V(.102,0,0)),e=project(edge.x,edge.y,edge.z),
      rad=Math.hypot(e.x-pts[2].x,e.y-pts[2].y);
    if(near(pts[2],loc,rad+13))return true;
    const a=pts[0],b=pts[1],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((loc.x-a.x)*dx+(loc.y-a.y)*dy)/(dx*dx+dy*dy),0,1);
    return Math.hypot(loc.x-a.x-t*dx,loc.y-a.y-t*dy)<17;
  }
  function sprayIndex(loc){
    const top=project(.6,1.50,-6.1),base=project(.6,.40,-6.1),rim=project(1.43,.40,-6.1);
    const ry=Math.abs(base.y-top.y)*.56+15,rx=Math.abs(rim.x-base.x)*.93+10;
    if(((loc.x-top.x)/rx)**2+((loc.y-(top.y+base.y)*.50)/ry)**2>1)return -1;
    let index=6,best=Infinity;
    s.drops.forEach(d=>{const p=project(d.x,d.y,d.z),dd=(p.x-loc.x)**2+(p.y-loc.y)**2;if(dd<best){best=dd;index=d.jet;}});return index;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(finger!==null||e.button!==0)return;unlock();const loc=localPt(e);
    ray.setFromCamera(new T.Vector2(loc.x/width*2-1,1-loc.y/height*2),camera);
    const hit=ray.intersectObjects(bubbles.filter(b=>b.visible),false)[0];
    if(hit){sim.pop(hit.object.userData.id);playEvents();return;}
    if(s.stage==='garden'&&nearWand(loc)&&sim.begin()){
      action='wand';startX=loc.x;startY=loc.y;startWX=s.wand.x;startWY=s.wand.y;
    }else if(s.stage==='flight'&&near(project(.52,1.365,-2.93),loc,Math.max(25,Math.abs(project(.65,1.365,-2.93).x-project(.52,1.365,-2.93).x)+8))){
      action='wind';sim.turn();
    }else if(s.stage==='fountain'&&sprayIndex(loc)>=0){action='water';sim.splash(sprayIndex(loc));lastSpray=s.time;}
    else return;
    finger=e.pointerId;canvas.setPointerCapture(finger);e.preventDefault();
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerId!==finger)return;const loc=localPt(e);
    if(action==='wand'){const scale=2*Math.tan(17*Math.PI/180)*camera.position.distanceTo(g.wand.position)/height;
      sim.move(startWX+(loc.x-startX)*scale,startWY-(loc.y-startY)*scale);}
    if(action==='water'&&s.time-lastSpray>.16){const i=sprayIndex(loc);if(i>=0){sim.splash(i);lastSpray=s.time;}}
  });
  function finish(e){if(e.pointerId!==finger)return;if(action==='wand'){if(e.type==='pointerup')sim.release();else sim.cancel();}
    finger=null;action='';}
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
  window.addEventListener('resize',resize);resize();
  let last=performance.now();
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){sim.cancel();finger=null;action='';if(audio)audio.suspend().catch(()=>{});}else if(audio&&!muted)audio.resume().catch(()=>{});});
  function frame(now){if(!document.hidden){sim.step(Math.min(.075,(now-last)/1000));playEvents();renderWorld();}last=now;requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
