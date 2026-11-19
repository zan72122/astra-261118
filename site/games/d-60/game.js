'use strict';
(() => {
 const sim=CycleWorld.create(),s=sim.state,canvas=document.querySelector('#view');
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(30,1,.035,190);
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 scene.fog=new T.FogExp2(0xc4d7d4,.015);
 function sky(){
   const cv=document.createElement('canvas');cv.width=512;cv.height=256;const c=cv.getContext('2d'),grad=c.createLinearGradient(0,0,0,256);
   [[0,'#72a8c4'],[.33,'#9fc9d8'],[.495,'#dae4d9'],[.505,'#bbcab5'],[.72,'#a5ad89'],[1,'#9b937c']].forEach(([v,k])=>grad.addColorStop(v,k));
   c.fillStyle=grad;c.fillRect(0,0,512,256);
   const t=new T.CanvasTexture(cv);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;return t;
 }
 const skyTex=sky();scene.background=skyTex;scene.environment=skyTex;scene.backgroundIntensity=.98;
 const ambient=new T.HemisphereLight(0xe5f3ff,0xe2c6a0,1.28);scene.add(ambient);
 const sun=new T.DirectionalLight(0xffefd4,2.45);scene.add(sun,sun.target);
 sun.position.set(-4.6,7.2,4.0);sun.castShadow=true;
 Object.assign(sun.shadow.camera,{left:-4.5,right:4.5,top:4.5,bottom:-4.5,near:.5,far:24});
 sun.shadow.camera.updateProjectionMatrix();sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00016;sun.shadow.normalBias=.004;
 makeLandscape(scene);
 const river=riverObjects(scene),breeze=makeBreeze(scene);
 // Capture the actual village for chrome, glazing, wet timber and the water.
 const cube=new T.WebGLCubeRenderTarget(96,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
 const probe=new T.CubeCamera(.12,155,cube);probe.position.set(.18,.84,.27);probe.update(renderer,scene);
 const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromCubemap(cube.texture);scene.environment=env.texture;scene.environmentIntensity=.65;pmrem.dispose();cube.dispose();
 const bike=makeBike(scene),pump=makePump(scene);
 // The hose has a fixed topology. Each section changes curvature as the valve releases.
 const hoseMat=mat(0x414a46,.67);const hose=mesh(scene,new T.TubeGeometry(new T.LineCurve3(V(),V(1,0,0)),36,.007,8),hoseMat);
 const valve=group(scene);rod(valve,[0,0,0],[.027,.003,0],.011,brass);box(valve,.004,.006,0,.019,.018,.012,darkRed);bake(valve);
 let lastHose=-9,lastHub=-9;
 function updateHose(){
   const y=bike.wheels[0].hub.position.y,h=['pump','ready','vent'].includes(s.phase)?s.hose:Math.max(s.hose,CycleWorld.smooth(s.d/.28));
   if(Math.abs(h-lastHose)+Math.abs(y-lastHub)<.00012)return;lastHose=h;lastHub=y;
   const end=V(-.291-.234*h,.009+(y-.132)*(1-h),.029+.25*h);
   const path=new T.CatmullRomCurve3([V(-.645,.061,.343),V(-.596,.019,.439),V(-.416,.013,.451),V(-.312,.012,.332),V(-.319-.155*h,.017,.164+.16*h),end]);
   hose.geometry.dispose();hose.geometry=new T.TubeGeometry(path,36,.0074,8,false);valve.position.copy(end);
 }
 // Both physical joints and forgiving pick volumes use the same object transforms.
 const cueMetal=mat(0xffdda1,.31,.28);cueMetal.emissive.setHex(0xe6b665);cueMetal.emissiveIntensity=.24;
 const saddleGlint=tor(bike.chassis,-.176,.675,0,.044,.0028,cueMetal,48);saddleGlint.rotation.x=-Math.PI*.5;
 const targets=[],ghost=new T.MeshStandardMaterial({visible:false});
 function target(parent,name,center,dim){const o=new T.Mesh(unitBox,ghost);o.position.set(...center);o.scale.set(...dim);parent.add(o);o.userData.kind=name;targets.push(o);return o;}
 const pumpHit=target(pump.piston,'pump',[0,.026,0],[.31,.116,.127]);
 target(pump.root,'other',[0,.213,0],[.15,.39,.13]);
 const seatHit=target(bike.chassis,'bike',[-.13,.49,0],[.62,.44,.27]);
 target(bike.root,'bike',[0,.235,0],[1.04,.38,.116]);target(bike.chassis,'bike',[.18,.735,0],[.21,.12,.44]);
 const basketHit=target(bike.chassis,'basket',[.395,.625,0],[.235,.206,.288]);
 const drumHit=target(river.drum,'drum',[0,0,-.009],[.47,.47,.19]);
 const gateHit=target(river.gate,'gate',[0,.43,0],[.49,.32,.23]);
 const sailHit=target(river.halyard,'sail',[0,0,0],[.35,.35,.32]);
 target(river.hull,'sail',[-.28,1.05,.09],[.25,.98,.69]);
 const bicyclePos=V(),focus=V(),cameraPlace=V(),cameraAim=V();
 const clamp=CycleWorld.clamp,smooth=CycleWorld.smooth;
 function poseBike(){
   const path=CycleWorld.route(s.d),next=CycleWorld.route(s.d+.015);
   let yaw=Math.atan2(path.z-next.z,next.x-path.x)*smooth(s.d/2.5);
   bicyclePos.set(path.x,path.y+.007,path.z);
   if(['mill','sail','ferry','bridge','home'].includes(s.phase)){
     const q=CycleWorld.route(74),board=s.phase==='mill'?0:s.board;
     bicyclePos.set(q.x,q.y+.008,q.z);
     bicyclePos.lerp(V(river.hull.position.x,river.hull.position.y+.286,river.hull.position.z-.32),board);
     bicyclePos.y+=Math.sin(board*Math.PI)*.103;
     const tail=CycleWorld.route(74.015);
     const dockYaw=Math.atan2(q.z-tail.z,tail.x-q.x);
     yaw=dockYaw+(-Math.PI/2-dockYaw)*board;
     if(s.phase==='home'){
       const f=smooth(s.home),path=CycleWorld.homePath(f),ahead=CycleWorld.homePath(Math.min(.99999,f)+.00001);
       bicyclePos.set(path.x,path.y,path.z);
       yaw=Math.atan2(path.z-ahead.z,ahead.x-path.x);
     }
   }
   if(['vent','pump','ready'].includes(s.phase)){bicyclePos.set(0,.009,0);yaw=0;}
   saddleGlint.visible=s.phase==='ready';saddleGlint.scale.setScalar(1+s.wind[0].u*.16);
   bike.root.position.copy(bicyclePos);bike.root.rotation.set(0,yaw,0);
   for(let j=0;j<2;j++){const w=bike.wheels[j];w.update(s.wheels[j]);w.spin.rotation.z=-s.spin;}
   const a=bike.wheels[0].hub.position.y-.2032,b=bike.wheels[1].hub.position.y-.2032;
   bike.chassis.position.y=(a+b)*.5+s.fork;bike.chassis.rotation.z=Math.atan2(b-a,.752);
   bike.root.rotateX(s.tilt+s.wiggle);bike.streamers(s.ribbons);bike.bell.rotation.x=s.bell;bike.crank.rotation.z=-s.crank;
   pump.piston.position.y=.444+.201*s.piston;pump.pointer.rotation.z=2.29-(s.pressure-150)/250*4.58;
   pump.root.rotation.z=s.wiggle*.35;updateHose();
 }
 function chooseCamera(){
   const asp=cam.aspect,vertical=1-smooth((asp-.62)/.72);
   // The side-on working distance follows the available horizontal field.
   const dist=Math.max(2.69,1.52/(2*Math.tan(Math.PI/12)*asp));
   const dir=V(.10*(1-vertical)-.088*vertical,.135+.012*vertical,.974).normalize();
   const homeAim=V(-.125,.492+vertical*.14,-.025),homePos=homeAim.clone().addScaledVector(dir,dist);
   let fov=30;cameraPlace.copy(homePos);cameraAim.copy(homeAim);
   if(['street','hill'].includes(s.phase)){
     const blend=smooth(Math.max(s.d/2.3,s.phaseAge*.4*(s.phase==='street'?1:0)));
     const dirRide=V(Math.cos(bike.root.rotation.y),0,-Math.sin(bike.root.rotation.y));
     const side=V(-dirRide.z,0,dirRide.x);
     const range=2.32+vertical*.93;
     const dest=bicyclePos.clone().addScaledVector(dirRide,-range).addScaledVector(side,.84);
     dest.y+=1.13+.22*vertical;
     const look=bicyclePos.clone().addScaledVector(dirRide,.24);look.y+=.48;
     cameraPlace.lerp(dest,blend);cameraAim.lerp(look,blend);fov=30+10*blend;
   }
   if(['mill','sail'].includes(s.phase)){
     const gate=s.phase==='mill',dest=gate?V(5.76,.29,-72.25):V(9.89,.36,-71.82);
     const look=gate?V(7.02,-.49,-74.62):V(8.15,-.48,-73.95);
     if(vertical)dest.addScaledVector(dest.clone().sub(look).normalize(),vertical*.93);
     cameraPlace.copy(dest);cameraAim.copy(look);fov=40;
   }
   if(['ferry','bridge','home'].includes(s.phase)){
     cameraPlace.copy(bicyclePos).add(V(-1.5,1.63,-2.74-vertical*.77));cameraAim.copy(bicyclePos).add(V(0,.56,.27));fov=40;
     if(s.phase==='bridge'){cameraPlace.copy(V(8.38,.09,-44.8-vertical*.35));cameraAim.copy(V(7.96-.42*vertical,-.48,-41.15));}
     if(s.phase==='home'){const t=smooth(s.home);cameraPlace.lerp(homePos,t);cameraAim.lerp(homeAim,t);fov-=10*t;}
   }
   return fov;
 }
 let initial=true,cameraFov=30;
 function updateView(dt){
   river.update(s);poseBike();breeze.update(s,bicyclePos);
   const fov=chooseCamera(),alpha=initial?1:1-Math.exp(-dt*4.3);
   cam.position.lerp(cameraPlace,alpha);focus.lerp(cameraAim,alpha);cameraFov+=(fov-cameraFov)*alpha;
   cam.fov=cameraFov;cam.updateProjectionMatrix();cam.lookAt(focus);cam.updateMatrixWorld();
   const lightAt=['mill','sail'].includes(s.phase)?V(7.4,-1,-74):bicyclePos;
   sun.target.position.copy(lightAt);sun.position.copy(lightAt).add(V(-4.6,7.2,4.0));
   scene.updateMatrixWorld(true);initial=false;
 }
 // Soft highlight spill sampled at quarter resolution, then a fine fixed grain and optical falloff.
 const full=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:renderer.capabilities.maxSamples>=4?2:0}),small=new T.WebGLRenderTarget(1,1,{depthBuffer:false,type:T.HalfFloatType});
 const pass=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const vShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const bright=new T.ShaderMaterial({uniforms:{tex:{value:full.texture},px:{value:new T.Vector2()}},vertexShader:vShader,fragmentShader:'varying vec2 vUv;uniform sampler2D tex;uniform vec2 px;void main(){vec3 s=vec3(0.);for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){vec3 c=texture2D(tex,vUv+vec2(float(i),float(j))*px*3.).rgb;s+=c*max(0.,1.-1.2/max(.001,max(c.r,max(c.g,c.b))));}}gl_FragColor=vec4(s/9.,1.);}'});
 const finish=new T.ShaderMaterial({uniforms:{tex:{value:full.texture},glow:{value:small.texture},px:{value:new T.Vector2()}},vertexShader:vShader,fragmentShader:`varying vec2 vUv;uniform sampler2D tex,glow;uniform vec2 px;
 void main(){vec3 c=texture2D(tex,vUv).rgb,b=vec3(0.);for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){b+=texture2D(glow,vUv+vec2(float(i),float(j))*px).rgb;}}c+=b*.007;
 vec2 o=(vUv-.5)*1.5;c*=1.-.075*dot(o,o);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float n=fract(sin(dot(mod(gl_FragCoord.xy,251.),vec2(12.9898,78.233)))*43758.5453);gl_FragColor.rgb+=(n-.5)*.006;
 }`});
 const quad=new T.Mesh(new T.PlaneGeometry(2,2),bright);pass.add(quad);
 function draw(){renderer.setRenderTarget(full);renderer.render(scene,cam);quad.material=bright;renderer.setRenderTarget(small);renderer.render(pass,ortho);quad.material=finish;renderer.setRenderTarget(null);renderer.render(pass,ortho);}
 function resize(){
   const w=innerWidth,h=innerHeight;cam.aspect=w/h;renderer.setSize(w,h,false);const size=renderer.getDrawingBufferSize(new T.Vector2());
   full.setSize(size.x,size.y);small.setSize(Math.max(1,Math.floor(size.x/5)),Math.max(1,Math.floor(size.y/5)));
   bright.uniforms.px.value.set(1/size.x,1/size.y);finish.uniforms.px.value.set(1/small.width,1/small.height);initial=true;updateView(0);
 }
 const soundButton=document.querySelector('#sound');let audio=null,muted=false;
 function soundOn(){
   if(!audio){
     const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
     const ctx=new AC(),master=ctx.createGain();master.gain.value=muted?0:.53;master.connect(ctx.destination);
     const buf=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),arr=buf.getChannelData(0);let last=0;
     for(let i=0;i<arr.length;i++){last=(last+(Math.random()*2-1)*.16)/1.025;arr[i]=last;}
     const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;
     function layer(f,q){const filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='bandpass';filter.frequency.value=f;filter.Q.value=q;gain.gain.value=0;src.connect(filter);filter.connect(gain);gain.connect(master);return {filter,gain};}
     const wind=layer(710,.55),water=layer(1850,.52),pumpAir=layer(1120,1.3),roll=layer(260,.8);
     src.start();audio={ctx,master,wind,water,pumpAir,roll,nextDrop:0};
   }
   if(audio.ctx.state==='suspended')audio.ctx.resume().catch(()=>{});
 }
 function tone(freq,dur,level,delay=0,endFreq=0){
   if(!audio)return;const {ctx,master}=audio,osc=ctx.createOscillator(),amp=ctx.createGain(),t=ctx.currentTime+delay;
   osc.type='sine';osc.frequency.setValueAtTime(freq,t);if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,t+dur);
   amp.gain.setValueAtTime(.00001,t);amp.gain.exponentialRampToValueAtTime(level,t+.009);amp.gain.exponentialRampToValueAtTime(.00001,t+dur);
   osc.connect(amp);amp.connect(master);osc.start(t);osc.stop(t+dur+.01);
 }
 function playBell(){
   const echo=['ready','street'].includes(s.phase)?.28:.1;
   for(const [f,a] of [[1175,.16],[2920,.054],[4650,.022]]){tone(f,1.4,a);tone(f*.998,1.05,a*echo,.15+s.d*.002);tone(f,.65,a*echo*.4,.39);}
 }
 function audioUpdate(){
   for(const e of s.events.splice(0)){
     if(e==='ding')playBell();
     if(e==='ready'){tone(590,.27,.055);tone(880,.44,.053,.17);}
     if(e==='sail'){tone(660,.32,.045);tone(990,.43,.032,.16);}
   }
   if(!audio)return;const {ctx,wind,water,pumpAir,roll}=audio,now=ctx.currentTime;
   const nearWater=['mill','sail','home','ferry','bridge'].includes(s.phase)?1:smooth((s.d-38)/36);
   wind.gain.gain.setTargetAtTime(.029+s.wind[2].u*.027+s.speed*.048,now,.18);
   wind.filter.frequency.setTargetAtTime(560+s.wind[0].u*237+s.speed*140,now,.16);
   water.gain.gain.setTargetAtTime(.005+nearWater*(.17+.17*s.flow),now,.25);
   roll.gain.gain.setTargetAtTime(s.speed*(.03+.12*smooth((s.d-39)/6)),now,.09);
   pumpAir.gain.gain.setTargetAtTime(Math.min(.41,Math.abs(s.pistonV)*.13)+(s.phase==='vent'?.17:0),now,.04);
   if(nearWater>.5&&now>audio.nextDrop){tone(360+s.wind[4].u*410,.10,.018,0,790+s.wind[5].u*250);audio.nextDrop=now+.23+s.wind[3].u*.61;}
 }
 soundButton.addEventListener('click',()=>{soundOn();muted=!muted;soundButton.classList.toggle('off',muted);soundButton.setAttribute('aria-pressed',String(!muted));if(audio)audio.master.gain.setTargetAtTime(muted?0:.53,audio.ctx.currentTime,.05);});
 const ray=new T.Raycaster(),ndc=new T.Vector2(),cue=document.querySelector('#cue'),hand=document.querySelector('#hand'),stops=[...document.querySelectorAll('.stop')];
 function pixel(point){const p=point.clone().project(cam);return {x:(p.x+1)*innerWidth*.5,y:(1-p.y)*innerHeight*.5,z:p.z};}
 function worldPos(obj){return obj.getWorldPosition(V());}
 function localToPx(o,p){return pixel(o.localToWorld(V(...p)));}
 function pick(x,y){
   ndc.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(ndc,cam);
   const hits=ray.intersectObjects(targets,false),kinds=hits.map(h=>h.object.userData.kind);
   const priority=s.phase==='pump'?['pump']:s.phase==='bridge'?['drum']:s.phase==='mill'?['gate']:s.phase==='sail'?['sail']:['basket','bike'];
   for(const kind of priority)if(kinds.includes(kind))return kind;
   // A minimum touch target on a small screen is still anchored to the moving part.
   const anchors={drum:drumHit,pump:pumpHit,gate:gateHit,sail:sailHit,basket:basketHit,bike:seatHit};
   for(const kind of priority){const k=pixel(worldPos(anchors[kind]));if(k.z<1&&k.z>-1&&Math.hypot(k.x-x,k.y-y)<24)return kind;}
   return kinds.length?'other':null;
 }
 let crankPoint=[0,0],overBasket=false;
 let finger=null,gesture='',startY=0,startValue=0,span=80;
 function updateDrag(y){const value=startValue+(startY-y)/span;
   if(gesture==='pump')sim.input('lift',value);
   if(gesture==='gate'||gesture==='sail')sim.input(gesture,value);
 }
 canvas.addEventListener('pointerdown',e=>{
   if(finger!==null)return;soundOn();const hit=pick(e.clientX,e.clientY);if(!hit)return;
   finger=e.pointerId;canvas.setPointerCapture(finger);gesture=hit;overBasket=false;startY=e.clientY;
   if(hit==='pump'&&s.phase==='pump'){
     startValue=s.piston;span=Math.max(38,Math.abs(localToPx(pump.root,[0,.444,0]).y-localToPx(pump.root,[0,.645,0]).y));sim.input('lift',s.piston);
   }else if(hit==='gate'&&s.phase==='mill'){
     startValue=s.gateTarget;span=Math.max(38,Math.abs(localToPx(river.gate,[0,0,0]).y-localToPx(river.gate,[0,.36,0]).y));sim.input('gate',startValue);
   }else if(hit==='sail'&&s.phase==='sail'){
     startValue=s.sailTarget;span=Math.max(42,Math.abs(localToPx(river.hull,[0,.6,0]).y-localToPx(river.hull,[0,1.26,0]).y));sim.input('sail',startValue);
   }else if(hit==='drum'&&s.phase==='bridge'){sim.input('wind',.1);crankPoint=[e.clientX,e.clientY];}
   else if(hit==='basket'&&['ready','street','hill','ferry'].includes(s.phase))sim.input('bell');
   else if(hit==='bike'&&['ready','street','hill'].includes(s.phase))sim.input('ride');
   else {gesture='other';sim.input('nudge');}
 });
 canvas.addEventListener('pointermove',e=>{
   if(finger!==e.pointerId)return;
   if(gesture==='drum'){sim.input('wind',Math.hypot(e.clientX-crankPoint[0],e.clientY-crankPoint[1])*.11);crankPoint=[e.clientX,e.clientY];}
   if(gesture==='bike'&&s.held){const onBasket=pick(e.clientX,e.clientY)==='basket';if(onBasket&&!overBasket)sim.input('bell');overBasket=onBasket;}
   updateDrag(e.clientY);
 });
 function release(e){if(e&&e.pointerId!==finger)return;if(finger!==null){sim.input('release');gesture='';finger=null;}}
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);window.addEventListener('blur',()=>release());
 const indices={pump:0,ready:1,street:1,hill:2,mill:3,sail:3,bridge:3,ferry:3,home:3,vent:0};
 function hints(){
   stops.forEach((o,i)=>o.classList.toggle('on',i===indices[s.phase]));
   const active=['pump','ready','street','hill','mill','sail','ferry','bridge'].includes(s.phase);
   const bellDemo=s.phase==='ferry'||(s.phase==='street'&&s.d>3&&!s.bells&&s.held);
   const obj=s.phase==='bridge'?drumHit:s.phase==='pump'?pumpHit:s.phase==='mill'?gateHit:s.phase==='sail'?sailHit:bellDemo?basketHit:seatHit;
   const point=pixel(worldPos(obj)),drag=['pump','mill','sail'].includes(s.phase),show=active&&point.z<1&&point.z>-1;
   const showCue=show&&finger===null&&drag;cue.style.display=showCue?'block':'none';
   if(showCue){cue.style.transform='translate('+Math.round(point.x-15)+'px,'+Math.round(point.y-52-s.wind[0].angle*5)+'px)';cue.style.opacity=s.idle>4?'.56':'.94';}
   const demo=show&&s.idle>4&&(finger===null||bellDemo),u=(Math.max(0,s.idle-4)%3.35)/3.35;
   hand.style.display=demo?'block':'none';if(demo){
     const wave=drag?(u<.5?smooth(u*2):1-smooth((u-.5)*2)):smooth(Math.min(u*4,1));
     const turn=s.phase==='bridge'?2*Math.PI*u:0;
     const raise=s.phase==='bridge'?16*Math.sin(turn):drag?(s.phase==='pump'&&s.piston>.52?-1:1)*Math.min(64,span)*wave:7*wave;
     hand.style.opacity=String(.82*smooth(u/.1)*smooth((1-u)/.13));
     hand.style.transform='translate('+Math.round(point.x-9+(s.phase==='bridge'?16*Math.cos(turn):0))+'px,'+Math.round(point.y-7-raise)+'px) rotate('+(-12+wave*5)+'deg)';
   }
 }
 resize();addEventListener('resize',resize);
 function advance(dt){sim.step(dt);updateView(dt);audioUpdate();hints();}
 window.__GAME__={step:sim.step,getState:sim.getState};
 let last=performance.now();
 function frame(now){const dt=Math.min(.07,Math.max(0,(now-last)/1000));last=now;advance(dt);draw();requestAnimationFrame(frame);}
 document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){release();audio?.ctx.suspend();}else if(audio)audio.ctx.resume().catch(()=>{});});
 requestAnimationFrame(frame);
})();
