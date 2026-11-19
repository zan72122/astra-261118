'use strict';
(() => {
  const {T,R,scene,group,add,box,round,cyl,ell,beam,flush,mats,material,shapes,random:r,canvas,coach}=Art;
  const L=Landscape, sim=R.create(),s=sim.state,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  window.__GAME__={ step:sim.step, getState:sim.getState, act:sim.go };
  const view=document.getElementById('view'), renderer=new T.WebGLRenderer({canvas:view,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const camera=new T.PerspectiveCamera(28,1,.095,1400), mirror=new T.PerspectiveCamera();
  scene.fog=new T.FogExp2(0xe6c5a6,.0035);
  const hemi=new T.HemisphereLight(0xe0e9ef,0xba9f7b,1.43);scene.add(hemi);hemi.layers.enable(1);
  const sun=new T.DirectionalLight(0xffdbad,2.32);scene.add(sun,sun.target);sun.layers.enable(1);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-35,right:35,top:30,bottom:-30,near:1,far:185});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias=.023;sun.shadow.bias=-.00016;
  const coaches=[coach(0),coach(1)],link=group();
  for(let i=0;i<6;i++)round(link,'rubber',i%2?0x484b44:0x54544a,0,2.05,(i-2.5)*.069,1.18,1.89,.072);
  const consoleAssembly=group(),desk=group(consoleAssembly),lever=group(desk),button=group(desk);
  // A bolted, enamelled cast-iron point machine. The face is inclined toward
  // the platform, so both the throw and the push travel remain visible.
  const enamel=0x485d53,edge=0x34473f,brass=0xb29561,ivory=0xe5d8b2;
  round(consoleAssembly,'iron',edge,0,.077,0,1.05,.155,.75);
  round(consoleAssembly,'paint',enamel,0,.52,.055,.50,.91,.42);
  for(const x of [-.38,.38])for(const z of [-.21,.21])cyl(consoleAssembly,'iron',0x999482,x,.16,z,.076,.055,.076);
  desk.position.y=1.04;desk.rotation.x=-.62;
  round(desk,'iron',edge,0,0,0,1.87,.24,.945);
  round(desk,'paint',0x627367,0,.101,0,1.82,.126,.893);
  round(desk,'iron',brass,0,.17,0,1.72,.018,.804);
  round(desk,'paint',enamel,0,.182,0,1.694,.02,.772);
  for(const x of [-.779,.779])for(const z of [-.31,.31]){
    cyl(desk,'steel',0xc4b99b,x,.206,z,.047,.018,.047);
    box(desk,'iron',0x726f5f,x,.218,z,.028,.008,.006,0,.68);
  }
  box(desk,'paint',brass,0,.20,0,.012,.007,.57);
  round(desk,'iron',0xb8a17a,.424,.204,-.027,.575,.041,.295);
  round(desk,'rubber',0x333f37,.424,.233,-.027,.452,.033,.158);
  lever.position.set(.425,.238,-.02);
  cyl(lever,'steel',0xbaac8e,0,.201,0,.064,.44,.064);
  cyl(lever,'iron',0x635a43,0,.32,0,.09,.085,.09);
  ell(lever,'paint',0xb35436,0,.475,0,.209,.295,.197);
  cyl(lever,'iron',brass,0,.369,0,.113,.035,.113);
  // Pictorial switch and departure marks are raised metal, without lettering.
  beam(desk,'paint',ivory,[.43,.218,.172],[.43,.218,.251],.019);
  for(const sign of [-1,1])beam(desk,'paint',ivory,[.43,.218,.25],[.43+sign*.12,.218,.333],.019);
  button.position.set(-.432,.214,-.006);
  cyl(button,'iron',0x303e36,0,.038,0,.52,.075,.52);
  cyl(button,'steel',brass,0,.085,0,.475,.044,.475);
  cyl(button,'rubber',0x354d42,0,.112,0,.409,.038,.409);
  const buttonTop=group(button);
  material('goLens',.29,.18,{emissive:0xbacf73,emissiveIntensity:.19});
  ell(buttonTop,'goLens',0x93ae75,0,.148,0,.385,.13,.385);
  const arrow=new T.Shape();arrow.moveTo(-.07,-.043);arrow.lineTo(.07,-.043);arrow.lineTo(0,.086);arrow.closePath();
  const arrowM=new T.Mesh(new T.ExtrudeGeometry(arrow,{depth:.005,bevelEnabled:false}),new T.MeshStandardMaterial({color:0xf3e6bd,roughness:.4,roughnessMap:Art.rough,side:T.DoubleSide}));
  arrowM.rotation.x=Math.PI/2;arrowM.position.y=.214;buttonTop.add(arrowM);
  const ring=group(desk);
  material('guide',.34,.33,{emissive:0xffcb73,emissiveIntensity:.6});
  const glint=new T.Mesh(new T.TorusGeometry(.253,.012,8,48),mats.guide);glint.rotation.x=Math.PI/2;ring.add(glint);
  // Freestanding brake handwheel on the rear of the freight wagon.
  const brake=group(L.wagon);brake.position.set(.64,1.98,-3.43);
  const brakeRing=new T.Mesh(new T.TorusGeometry(.319,.043,10,40),mats.paint.clone());brakeRing.material.color.set(0xb95839);brake.add(brakeRing);
  for(let i=0;i<5;i++){
    const a=i*2*Math.PI/5;beam(brake,'paint',0x9d543a,[0,0,0],[.296*Math.cos(a),.296*Math.sin(a),0],.043);
  }
  cyl(brake,'iron',0xaa9c77,0,0,0,.148,.12,.148,Math.PI/2);
  const ferryBell=group(L.boat);ferryBell.position.set(0,1.68,-2.60);
  add(ferryBell,'cone','steel',0xc1a067,0,0,0,.48,.53,.48);
  cyl(ferryBell,'steel',0xd7bb7d,0,-.215,0,.52,.075,.52);
  ell(ferryBell,'iron',0x826943,0,-.305,0,.134,.145,.134);
  const sw=group(),swLight=group(sw);
  cyl(sw,'iron',0x4d564d,0,.74,0,.102,1.44,.102);
  round(swLight,'iron',0x555a4b,0,1.32,0,.43,.28,.32);
  round(swLight,'amber',0xf0c67b,0,1.32,-.176,.31,.118,.034);
  // Sparse wind-borne seed fluff, with per-particle velocity and edge fading.
  const dust=new T.InstancedMesh(shapes.ellipsoid,mats.lamp,40);scene.add(dust);dust.frustumCulled=false;
  flush();
  [...coaches,link,L.wagon,L.boat].forEach(g=>g.traverse(o=>o.layers.enable(1)));
  // The cab glazing and polished fittings reflect the actual local station
  // and landscape. Skip subpixel grass and the vehicle housing the probe.
  scene.traverse(o=>{
    if(o.isMesh && o.material.visible && o.material!==mats.grain)o.layers.enable(2);
  });
  [...coaches,link,consoleAssembly,L.wagon,L.boat].forEach(g=>g.traverse(o=>o.layers.disable(2)));
  L.waterMeshes.forEach(({m})=>m.layers.disable(2));dust.layers.disable(2);
  L.regions.filter(g=>Math.abs(g.userData.range-150)<34||g.userData.range>675).forEach(g=>g.traverse(o=>{
    if(o.isMesh && o.material!==mats.grain)o.layers.enable(1);
  }));
  sun.layers.enable(2);hemi.layers.enable(2);
  const daylightMap=scene.environment, localMap=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType});
  const probe=new T.CubeCamera(.25,1400,localMap);probe.layers.set(2);probe.children.forEach(cam=>cam.layers.set(2));
  let neighbourhood='';
  function localReflection(){
    const key=s.journey+'/'+(s.distance<90?'station':s.distance<215?'river':s.distance<336?'mountain':s.distance<495?'town':s.light>.65?'night':'shore');
    if(key===neighbourhood)return;neighbourhood=key;
    probe.position.set(s.trainX-1.5,2.75,s.distance+6);
    scene.environment=daylightMap;renderer.shadowMap.autoUpdate=false;
    probe.update(renderer,scene);renderer.shadowMap.autoUpdate=true;
    scene.environment=localMap.texture;
  }
  // Only objects that can be operated receive pointer hits.
  const hitObjects=[];
  function target(parent,name,pos,rad){
    const hit=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshStandardMaterial({visible:false}));
    hit.position.copy(pos);hit.scale.set(...rad);hit.userData.action=name;parent.add(hit);hitObjects.push(hit);return hit;
  }
  const handles={
    lever:target(lever,'lever',V(0,.36,0),[.27,.35,.27]),
    start:target(button,'start',V(0,.16,0),[.32,.22,.32]),
    couple:target(brake,'couple',V(),[.60,.63,.39]),
    ferry:target(ferryBell,'ferry',V(0,-.06,0),[.55,.60,.45])
  };
  const hand=document.getElementById('hand'),ray=new T.Raycaster(),pointer=new T.Vector2(),screen=V();
  const focus=()=>({switch:'lever',ready:'start',townSwitch:'lever',couple:'couple',loaded:'start',harbour:'ferry'})[s.stage];
  const gainPanel=document.getElementById('sound');
  let ctx,master,hum,humGain,windAudio,windGain,muted=false;
  function audioInit(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.46;master.connect(ctx.destination);
      hum=ctx.createOscillator();hum.type='triangle';humGain=ctx.createGain();humGain.gain.value=.0001;hum.frequency.value=42;hum.connect(humGain).connect(master);hum.start();
      const buf=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),a=buf.getChannelData(0);let prev=0;
      for(let i=0;i<a.length;i++){prev=(prev+(Math.random()*2-1)*.10)/1.025;a[i]=prev;}
      windAudio=ctx.createBufferSource();windAudio.buffer=buf;windAudio.loop=true;const filter=ctx.createBiquadFilter();
      filter.type='lowpass';filter.frequency.value=690;windGain=ctx.createGain();windGain.gain.value=.033;
      windAudio.connect(filter).connect(windGain).connect(master);windAudio.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function note(freq,vol,duration,wave='sine',delay=0,endFreq=null){
    if(!ctx||muted)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=wave;o.frequency.setValueAtTime(freq,t);
    if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g).connect(master);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  gainPanel.addEventListener('pointerdown',e=>{e.stopPropagation();audioInit();muted=!muted;gainPanel.classList.toggle('muted',muted);gainPanel.setAttribute('aria-pressed',String(!muted));if(master)master.gain.setTargetAtTime(muted?0:.46,ctx.currentTime,.04);});
  function worldPos(name,out){return handles[name].getWorldPosition(out);}
  function visibleTarget(o){
    return o.userData.action==='couple'?['couple','shunting'].includes(s.stage):
      o.userData.action==='ferry'?['sunset','harbour','sailing'].includes(s.stage):consoleAssembly.visible;
  }
  function pick(e) {
    const rect=view.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(hitObjects.filter(visibleTarget),false);
    if(hits.length)return hits[0].object.userData.action;
    // Preserve a fingertip-sized target for distant physical objects.
    let result=null,nearest=26;
    for(const o of hitObjects.filter(visibleTarget)){
      worldPos(o.userData.action,screen).project(camera);if(Math.abs(screen.z)>1)continue;
      const d=Math.hypot((screen.x-pointer.x)*rect.width/2,(screen.y-pointer.y)*rect.height/2);
      if(d<nearest){nearest=d;result=o.userData.action;}
    }return result;
  }
  view.addEventListener('pointerdown',e=>{
    if(!e.isPrimary)return;const act=pick(e);if(!act)return;audioInit();
    if(sim.go(act)){
      if(act==='lever'){note(198,.095,.085,'triangle',0,94);note(518,.036,.16,'sine',.21);}
      if(act==='start'){note(540,.105,.35);note(808,.075,.53,'sine',.15);}
      if(act==='couple'){note(173,.13,.18,'triangle',0,88);}
      if(act==='ferry'){note(496,.105,1.1);note(748,.035,.63);}
    }
  });
  view.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')view.style.cursor=pick(e)?'pointer':'default';});
  const pass=document.getElementById('itinerary'),pc=pass.getContext('2d'),routePaper=canvas(756,126);
  function drawMap(){
    const g=routePaper.getContext('2d');g.scale(2,2);
    // Die-cut paper pass, engraved pictorial stops and twin ruled borders.
    const path=new Path2D();path.moveTo(11,3);path.lineTo(367,3);path.quadraticCurveTo(375,3,375,11);
    path.lineTo(375,24);path.bezierCurveTo(366,25,366,37,375,38);path.lineTo(375,51);
    path.quadraticCurveTo(375,59,367,59);path.lineTo(11,59);path.quadraticCurveTo(3,59,3,51);
    path.lineTo(3,38);path.bezierCurveTo(12,37,12,25,3,24);path.lineTo(3,11);path.quadraticCurveTo(3,3,11,3);
    const grad=g.createLinearGradient(0,3,0,60);grad.addColorStop(0,'#f1e6c9');grad.addColorStop(.58,'#e7d8b6');grad.addColorStop(1,'#cfbd9c');
    g.fillStyle=grad;g.fill(path);g.strokeStyle='#776d54';g.lineWidth=1.0;g.stroke(path);g.save();g.clip(path);
    for(let i=0;i<4200;i++){g.fillStyle=r()>.5?'#6e624015':'#fffce736';g.fillRect(r()*378,r()*63,.6,.55);}
    g.strokeStyle='#9b9072';g.lineWidth=.65;
    for(const y of [6.8,55.7]){g.beginPath();g.moveTo(14,y);g.lineTo(364,y);g.stroke();}
    g.setLineDash([1.3,2.4]);for(const x of [18,360]){g.beginPath();g.moveTo(x,8);g.lineTo(x,55);g.stroke();}g.setLineDash([]);
    g.lineJoin='round';g.lineCap='round';
    const ink='#5e6758',warm='#a36b4e',pale='#bbb193',clay='#b98466',wash='#c9c3a5';
    function polygon(points,color,outline){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=color;g.fill();if(outline){g.strokeStyle=outline;g.lineWidth=.8;g.stroke();}}
    function line(points,color=ink,width=1.1){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle=color;g.lineWidth=width;g.stroke();}
    function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h);}
    function dot(x,y,rad,c){g.beginPath();g.arc(x,y,rad,0,Math.PI*2);g.fillStyle=c;g.fill();}
    // Hills, paddies and a tiny station roof.
    polygon([[24,33],[36,22],[42,25],[48,18],[64,31],[69,35]],wash);
    rect(39,26,22,11,'#c8af87');polygon([[35,26],[44,19],[58,19],[65,26]],warm,ink);
    rect(45,29,4,8,ink);rect(53,29,4,4,ink);line([[34,38],[65,38]],ink);
    for(let j=0;j<3;j++)line([[22+j*4,37],[29+j*4,32]],'#a7a083',.8);
    // Truss bridge above three engraved water strokes.
    line([[96,30],[138,30]],ink,2);for(let i=0;i<3;i++){let x=97+i*13;line([[x,29],[x+6.5,18],[x+13,29]],warm,1.8);}
    line([[102,19],[131,19]],warm);for(const x of [101,132])rect(x,31,3,6,'#959782');
    for(let j=0;j<3;j++)line([[99+j*2,37+j],[117+j*3,37+j]],'#85968a',.7);
    // Mountain with a bored masonry arch.
    polygon([[163,36],[177,16],[184,23],[194,12],[211,36]],'#a0a48a',ink);
    polygon([[181,35],[192,19],[202,35]],'#828e79');line([[171,30],[177,21],[180,24]],'#d6d0ad');
    g.fillStyle='#c7b896';g.beginPath();g.arc(190,34,7,Math.PI,0);g.lineTo(197,37);g.lineTo(183,37);g.fill();
    g.fillStyle=ink;g.beginPath();g.arc(190,34,4.4,Math.PI,0);g.lineTo(194.4,37);g.lineTo(185.6,37);g.fill();
    // Town, orange freight crate and rooftops.
    for(const [x,y,w,h,c] of [[238,26,11,10,'#bcac8f'],[249,23,14,13,'#d4bb94'],[262,28,10,8,'#bfaf8e']]){
      rect(x,y,w,h,c);polygon([[x-2,y],[x+w*.47,y-7],[x+w+2,y]],warm,ink);rect(x+3,y+3,2.7,3.7,ink);
    }rect(256,31,3.1,5,ink);line([[236,37],[275,37]],ink,.8);
    // Beacon, sea and low sun.
    dot(332,19,5,'#be8865');polygon([[304,37],[313,32],[322,32],[331,38]],'#9b9f86');
    polygon([[312,33],[314,18],[319,18],[321,33]],'#e2cdab',ink);
    polygon([[313.5,22],[319.5,22],[320,25],[313.1,25]],warm);rect(313.5,15,6,3.4,ink);
    polygon([[312,15],[316.5,11.5],[321,15]],warm);for(let j=0;j<3;j++)line([[325+j*2,31+j*2.6],[343-j,31+j*2.6]],'#87988d',.8);
    line([[48,45],[318,45]],'#a69c80',1.2);
    for(const x of [48,117,190,255,318]){dot(x,45,3.5,'#8c896e');dot(x,45,1.8,'#e7ddba');}
    g.restore();
  }drawMap();
  let prevMark=-1;
  function mapPaint(){
    const pts=[[0,48],[145,117],[278,190],[R.TOWN,255],[R.COAST,318]];
    let x=318;for(let i=1;i<pts.length;i++)if(s.distance<=pts[i][0]){
      x=pts[i-1][1]+(pts[i][1]-pts[i-1][1])*(s.distance-pts[i-1][0])/(pts[i][0]-pts[i-1][0]);break;
    }
    const key=Math.round(x*2)+s.morning*1000;if(key===prevMark)return;prevMark=key;
    pc.clearRect(0,0,756,126);pc.drawImage(routePaper,0,0);pc.save();pc.scale(2,2);
    pc.strokeStyle='#a65d3e';pc.lineWidth=2.2;pc.beginPath();pc.moveTo(48,45);pc.lineTo(x,45);pc.stroke();
    pc.fillStyle='#a7553c';pc.beginPath();pc.arc(x,45,4.8,0,Math.PI*2);pc.fill();pc.fillStyle='#fff0cd';pc.beginPath();pc.arc(x,45,2.05,0,Math.PI*2);pc.fill();pc.restore();
  }
  const eye=V(),aim=V(),wantEye=V(),wantAim=V(),at=V(),to=V(),cameraVel=V(),aimVel=V();
  let portrait=0,readyCam=false,fov=28,fovVelocity=0,ratio=1,viewW=1,viewH=1;
  const mix=(a,b,u)=>a+(b-a)*u, smooth=R.smooth;
  function damping(p,v,target,dt,k){
    // Exact critically damped response, including residual camera velocity.
    const e=Math.exp(-k*dt);for(const axis of ['x','y','z']){
      const d=p[axis]-target[axis],u=v[axis]+d*k;
      p[axis]=target[axis]+(d+u*dt)*e;v[axis]=(v[axis]-u*k*dt)*e;
    }
  }
  function stationView(pos){
    const x=R.trackX(pos,0);
    wantEye.set(x+mix(-8.9,-5.12,portrait),mix(3.40,3.67,portrait),pos+mix(-13,-30.6,portrait));
    wantAim.set(x+mix(.6,-.86,portrait),mix(2.45,2.68,portrait),pos+mix(10,7,portrait));
  }
  function cameraView(dt){
    const d=s.distance,x=R.trackX(d,s.branch),town=s.stage==='townSwitch'||s.stage==='couple'||s.stage==='shunting'||s.stage==='loaded';
    stationView(d);
    let desiredFov=28;
    if(s.stage==='outbound'||s.stage==='shoreRide'){
      const travel=smooth(s.age/4.0),loaded=s.coupled;
      // Trackside pass pans across the crossing; the bridge opens into a wide
      // side view before the camera joins the leading cab through the bore.
      const bx=R.trackX(d+11,s.branch);
      const broad=smooth((d-65)/57)*(1-smooth((d-173)/47));
      const sea=loaded?smooth((d-445)/52):0;
      at.set(bx-mix(mix(12.7,10.0,portrait),mix(33,25,portrait),Math.max(broad,sea)),mix(4.3,9.15,broad)+sea*2.25,d-mix(13,25,portrait)+broad*12);
      to.set(bx+mix(.1,-1.3,portrait),2.03,d+mix(11,6,portrait));
      const bay=smooth((d-300)/30)*(1-smooth((d-364)/28));
      at.lerp(V(bx+mix(21,15,portrait),7.25,d-mix(13,23,portrait)),bay);
      to.lerp(V(bx-2.8,2.05,d+12),bay);
      const gallery=smooth((d-186)/51)*(1-smooth((d-317)/36));
      at.lerp(V(R.trackX(d+R.LENGTH+1,s.branch),2.75,d+R.LENGTH+1),gallery);
      to.lerp(V(R.trackX(d+R.LENGTH+45,s.branch),2.6,d+R.LENGTH+45),gallery);
      const stop=1-smooth((d-(loaded?R.COAST:R.TOWN)+36)/36);
      wantEye.lerp(at,travel*stop);wantAim.lerp(to,travel*stop);
      desiredFov+=12*Math.max(broad,gallery,sea,bay)*travel*stop;
    }else if(s.stage==='couple'||s.stage==='shunting'){
      const z=s.wagon-3.56,xx=R.sidingX(s.wagon);
      wantEye.set(xx-mix(8.6,5.2,portrait),3.16,z-mix(8.0,15.8,portrait));
      wantAim.set(xx+.4,2.0,z+3.0);
      const reveal=s.stage==='shunting'?smooth(s.age/5):0;
      wantEye.lerp(V(xx-mix(16,14,portrait),4.25,z-6.1),reveal);
      wantAim.lerp(V(xx,1.8,z+7.8),reveal);desiredFov+=8*reveal;
    }else if(['sunset','harbour','sailing','dawn'].includes(s.stage)){
      const blend=s.stage==='sunset'?smooth((s.age-6)/4):1;
      // The sightline leads from the station lamps out over the quay.
      const xx=L.boat.position.x,zz=L.boat.position.z;
      at.set(xx+mix(14,10,portrait),mix(5.0,4.3,portrait),zz-mix(15,22,portrait));
      to.set(xx-1.1,1.46,zz+2.8);
      if(s.stage==='sunset'){
        const half=smooth(s.age/2.8)*(1-smooth((s.age-3)/6));
        wantEye.lerp(V(x-20,6.3,d-21),half);wantAim.lerp(V(x-5,2.3,d+5),half);
      }
      wantEye.lerp(at,blend);wantAim.lerp(to,blend);desiredFov+=12*blend;
    }
    if(!readyCam||s.mist>.965){
      eye.copy(wantEye);aim.copy(wantAim);cameraVel.set(0,0,0);aimVel.set(0,0,0);fov=desiredFov;readyCam=true;
    }else{
      damping(eye,cameraVel,wantEye,dt,4.4);damping(aim,aimVel,wantAim,dt,4.8);
      const err=fov-desiredFov,v=fovVelocity+5*err,e=Math.exp(-5*dt);
      fov=desiredFov+(err+v*dt)*e;fovVelocity=(fovVelocity-v*5*dt)*e;
    }
    camera.position.copy(eye);camera.lookAt(aim);
    if(Math.abs(fov-camera.fov)>.001){camera.fov=fov;camera.updateProjectionMatrix();}
    camera.updateMatrixWorld();L.sky.position.copy(eye);
    // Keep station controls on the passenger side of each platform.
    const z=town||s.coupled?R.TOWN:0;
    consoleAssembly.position.set(R.trackX(z,0)+mix(-7.24,-4.22,portrait),1.026,z+mix(-5.62,-21.6,portrait));
    consoleAssembly.rotation.y=mix(.26,.05,portrait);
    consoleAssembly.visible=['switch','ready','townSwitch','loaded'].includes(s.stage)||(s.stage==='outbound'||s.stage==='shoreRide')&&s.age<3;
  }
  const sunD=V(),moonFog=new T.Color(0x8f9298),duskFog=new T.Color(0xe3c2a3),dawnFog=new T.Color(0xdad8bd),baseFog=new T.Color();
  const dustDummy=new T.Object3D();
  let oldBell=0,oldState='',oldJoint=0;
  function display(dt){
    const d=s.distance;
    coaches.forEach((g,i)=>{
      const z=d+5.35+i*11.22;
      const a=R.trackX(z-4.68,s.branch),b=R.trackX(z+4.68,s.branch);
      g.position.set((a+b)*.5,s.body[i].x,z);g.rotation.y=Math.atan2(b-a,9.36);g.rotation.z=s.body[i].v*.059;
    });
    link.position.set(R.trackX(d+10.98,s.branch),s.body[0].x*.6,d+10.98);
    link.rotation.y=Math.atan2(R.trackX(d+11.78,s.branch)-R.trackX(d+10.18,s.branch),1.6);
    const wz=s.wagon-3.35;
    L.wagon.position.set(R.sidingX(wz),s.body[2].x,wz+s.buffer.x);
    const wx=R.sidingX;
    L.wagon.rotation.y=Math.atan2(wx(wz+2.7)-wx(wz-2.7),5.4);
    brake.rotation.z=(s.stage==='shunting'||s.coupled)?(s.wagon-(R.TOWN-33))*.75:0;
    L.boat.position.set(-61-s.ferry*.38,-1.05+s.water[36].x,R.COAST+11+s.ferry*Math.sqrt(1-.38*.38));
    L.boat.rotation.set(s.water[38].x*.36,-.29,s.water[35].v*.33);
    ferryBell.rotation.z=s.water[35].v*.56;
    L.gate.rotation.x=s.gate.x;L.red.forEach((m,i)=>m.emissiveIntensity=.045+s.flash[i%2]*2.5);
    L.car.position.set(s.car,0,51);L.car.visible=s.car<94;
    L.childPivot.rotation.z=s.foot.x*.17;L.family.visible=d<115;
    lever.rotation.z=s.lever.x+s.waggle.x;buttonTop.position.y=-s.button.x+s.waggle.x*.21;
    sw.position.set(R.trackX(d<R.TOWN-10?26:R.TOWN-3,0)-2.25,0,d<R.TOWN-10?26:R.TOWN-3);swLight.rotation.y=s.points*Math.PI/2;
    L.forks.forEach((pair,k)=>pair.forEach((p,i)=>{p.rotation.y=s.switches[k].blade[i]/4.2;}));
    const action=focus();brakeRing.material.emissive.setHex(0xd39546);brakeRing.material.emissiveIntensity=action==='couple'?.27:0;ring.visible=action==='lever'||action==='start';
    ring.position.set(action==='lever'?.425:-.432,action==='lever'?.249:.323,action==='lever'?-.022:-.006);
    ring.scale.setScalar(action==='lever'?.84:1);
    mats.guide.emissiveIntensity=.28+1.22*s.guide.glow;
    mats.goLens.emissiveIntensity=action==='start'?.52:.095;
    coaches.forEach((g,i)=>{mats["coachGlass"+i].emissiveIntensity=s.filament[2+i].x*1.07;});L.lanterns.forEach((m,i)=>m.emissiveIntensity=.06+s.filament[i%9].x*2.65);
    cameraView(dt);
    L.regions.forEach(p=>{p.visible=Math.abs(p.userData.range-eye.z)<310;});
    L.riceBlocks.forEach(({m,cz})=>{m.visible=Math.abs(cz-eye.z)<100;});
    s.wind.forEach((w,i)=>{L.bendUniforms[i]=w.x;});
    s.dust.forEach((p,i)=>{
      dustDummy.position.set(p.x,p.y+.56,p.z);
      const size=(.004+(i%5)*.0017)*p.life;dustDummy.scale.set(size*1.9,size,size);dustDummy.rotation.z=p.vy*5;
      dustDummy.updateMatrix();dust.setMatrixAt(i,dustDummy.matrix);
    });dust.instanceMatrix.needsUpdate=true;
    L.waterMeshes.forEach(({m,sea})=>{
      if(Math.abs(m.position.z-eye.z)>(sea?290:145))return;
      const pos=m.geometry.attributes.position;
      for(let j=0;j<pos.count;j++){
        const x=pos.getX(j),z=pos.getZ(j),col=j%85,row=Math.floor(j/85),a=s.water[(col+row*3)%48],b=s.water[(col*3+7)%48];
        pos.setY(j,a.x*.63+b.x*.31+.015*Math.sin(x*.63+z*.43+a.v*6));
      }
      pos.needsUpdate=true;m.geometry.computeVertexNormals();
    });
    let sunAz=mix(.49,.137,portrait);
    if(d>R.TOWN)sunAz=mix(sunAz,-.93,smooth((d-R.TOWN)/200));
    sunD.set(Math.sin(sunAz),Math.sin(s.sun.x),Math.cos(sunAz)).normalize();
    L.skyUniforms.sun.value.copy(sunD);L.skyUniforms.night.value=s.light;L.skyUniforms.morning.value=s.morning;
    sun.target.position.set(aim.x,1.4,aim.z);sun.position.copy(sun.target.position).addScaledVector(sunD,77);
    sun.position.y=Math.max(sun.position.y,3.1);sun.intensity=2.23*(1-.92*s.light);hemi.intensity=1.48-.78*s.light;
    baseFog.copy(duskFog).lerp(dawnFog,s.morning*.8);scene.fog.color.copy(baseFog).lerp(moonFog,s.light);
    scene.environmentIntensity=.67-.36*s.light;document.getElementById('mist').style.opacity=s.mist;
    scene.updateMatrixWorld();
    if(action&&s.idle>3.85){
      worldPos(action,screen).project(camera);
      const phase=(s.idle-3.85)%2.9,reach=smooth(phase/.78),press=smooth((phase-.77)/.21)*(1-smooth((phase-1.08)/.30));
      const alpha=smooth(phase/.25)*(1-smooth((phase-1.55)/.42));
      const x=(screen.x*.5+.5)*viewW,y=(-screen.y*.5+.5)*viewH;
      hand.style.opacity=alpha*.91;hand.style.transform='translate('+Math.round(x+18*(1-reach)-3)+'px,'+Math.round(y+26*(1-reach)+press*3-5)+'px) rotate('+(-13+reach*6)+'deg) scale('+(1-press*.13)+')';
    }else hand.style.opacity=0;
    mapPaint();
    if(ctx){
      const now=ctx.currentTime;hum.frequency.setTargetAtTime(39+s.speed*5,now,.12);humGain.gain.setTargetAtTime(.005+s.speed*.0042,now,.15);
      windGain.gain.setTargetAtTime(.034+Math.abs(s.wind[2].x)*.10+s.speed*.002,now,.25);
      if(s.bell!==oldBell&&s.crossing){note(805,.089,.48);note(1211,.033,.26);}
      if(s.stage==='loaded'&&oldState==='shunting'){note(134,.13,.16,'triangle',0,64);note(663,.066,.30,'sine',.15);}
      if(s.joint[0]!==oldJoint&&s.speed>.5){note(105,.047,.082,'triangle',0,57);note(132,.032,.072,'triangle',.12,65);}
    }
    oldBell=s.bell;oldJoint=s.joint[0];oldState=s.stage;
  }
  const reflected=new T.WebGLRenderTarget(386,240,{type:T.HalfFloatType,depthBuffer:true});L.waterUniforms.reflection.value=reflected.texture;
  function reflection(){
    const nearRiver=s.distance>77&&s.distance<198,nearHarbour=s.distance>R.COAST-13;
    if(!nearRiver&&!nearHarbour){L.waterUniforms.on.value=0;return;}
    mirror.copy(camera);mirror.layers.set(1);mirror.position.set(eye.x,-2.74-eye.y,eye.z);
    mirror.up.set(0,-1,0);mirror.lookAt(aim.x,-2.74-aim.y,aim.z);mirror.updateMatrixWorld();
    mirror.projectionMatrix.copy(camera.projectionMatrix);mirror.projectionMatrix.elements[0]*=-1;
    L.waterUniforms.matrix.value.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);
    L.waterUniforms.on.value=1;renderer.setRenderTarget(reflected);
    renderer.shadowMap.autoUpdate=false;renderer.render(scene,mirror);renderer.shadowMap.autoUpdate=true;
  }
  // Linear HDR pass followed by a low-intensity spatial bloom, then a single
  // display transform. Film grain is static fine texture, independent of motion.
  const frameTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
  frameTarget.samples=2;
  const glowTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
  const postScene=new T.Scene(),postCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const vertexShader='varying vec2 texCoord;void main(){texCoord=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const highpass=new T.ShaderMaterial({depthWrite:false,depthTest:false,vertexShader,uniforms:{frame:{value:frameTarget.texture},pixel:{value:new T.Vector2()}},
    fragmentShader:`varying vec2 texCoord;uniform sampler2D frame;uniform vec2 pixel;
    void main(){vec3 sum=vec3(0.);for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){
      vec3 c=texture2D(frame,texCoord+vec2(float(i),float(j))*pixel*2.).rgb;
      sum+=c*smoothstep(.90,1.6,dot(c,vec3(.2126,.7152,.0722)));}}gl_FragColor=vec4(sum/9.,1.);}`});
  const grading=new T.ShaderMaterial({depthWrite:false,depthTest:false,vertexShader,uniforms:{frame:{value:frameTarget.texture},glow:{value:glowTarget.texture},pixel:{value:new T.Vector2()}},
    fragmentShader:`varying vec2 texCoord;uniform sampler2D frame,glow;uniform vec2 pixel;
    void main(){vec3 c=texture2D(frame,texCoord).rgb;vec2 dx=vec2(pixel.x*1.65,0.),dy=vec2(0.,pixel.y*1.65);
    vec3 bloom=texture2D(glow,texCoord).rgb*.36+
      (texture2D(glow,texCoord+dx).rgb+texture2D(glow,texCoord-dx).rgb+
       texture2D(glow,texCoord+dy).rgb+texture2D(glow,texCoord-dy).rgb)*.16;
    gl_FragColor=vec4(c+bloom*.043,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),highpass);quad.frustumCulled=false;postScene.add(quad);
  function resize(){
    viewW=window.innerWidth;viewH=window.innerHeight;ratio=viewW/viewH;portrait=1-smooth((ratio-.48)/.80);
    camera.aspect=ratio;camera.updateProjectionMatrix();
    const pixel=Math.min(window.devicePixelRatio||1,1.65,Math.sqrt(1500000/(viewW*viewH)));
    renderer.setPixelRatio(pixel);renderer.setSize(viewW,viewH,false);
    const w=Math.round(viewW*pixel),h=Math.round(viewH*pixel),gw=Math.max(1,Math.round(w/6)),gh=Math.max(1,Math.round(h/6));
    frameTarget.setSize(w,h);glowTarget.setSize(gw,gh);highpass.uniforms.pixel.value.set(1/w,1/h);grading.uniforms.pixel.value.set(1/gw,1/gh);
    readyCam=false;
  }
  window.addEventListener('resize',resize);resize();
  document.getElementById('grain').style.backgroundImage='url('+Art.rough.image.toDataURL()+')';
  let prev=0;
  function frame(ts){
    const dt=prev?Math.min((ts-prev)/1000,.075):0;prev=ts;
    sim.step(dt);display(dt);localReflection();reflection();
    renderer.setRenderTarget(frameTarget);renderer.render(scene,camera);
    quad.material=highpass;renderer.setRenderTarget(glowTarget);renderer.render(postScene,postCam);
    quad.material=grading;renderer.setRenderTarget(null);renderer.render(postScene,postCam);
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{prev=0;if(ctx){if(document.hidden)ctx.suspend();else if(!muted)ctx.resume().catch(()=>{});}});
  requestAnimationFrame(frame);
})();
