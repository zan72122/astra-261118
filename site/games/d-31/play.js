(function(){
 'use strict';
 const T=THREE,G=GardenGolf,game=G.makeGame(),S=game.state;
 window.__GAME__={step:game.step,getState:game.getState};
 const canvas=document.getElementById('garden'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.01;
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.09,130);
 scene.fog=new T.FogExp2(0xd4d8c3,.0255);
 const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;
 const sc=skyCanvas.getContext('2d'),grad=sc.createLinearGradient(0,0,0,256);
 [[0,'#86afbd'],[.26,'#a8c9d1'],[.45,'#d6e1d9'],[.56,'#e8e5ca'],[.68,'#a9b698'],[1,'#6b805e']].forEach(([n,c])=>grad.addColorStop(n,c));
 sc.fillStyle=grad;sc.fillRect(0,0,512,256);
 const sky=new T.CanvasTexture(skyCanvas);sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;scene.background=sky;
 const skyLight=new T.HemisphereLight(0xe4f1ff,0xccb991,1.53);
 const sun=new T.DirectionalLight(0xffebc9,2.63);sun.position.set(-10,15,8);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,bottom:-13,top:13,near:.5,far:60});
 sun.shadow.bias=-.00027;sun.shadow.normalBias=.014;sun.shadow.radius=2.1;
 scene.add(sun,sun.target,skyLight);
 const world=makeGarden(renderer,scene);world.apply(S);
 // Capture the surrounding real geometry for highlights on the water, brass, and windows.
 const probeTarget=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType});
 const probe=new T.CubeCamera(.2,95,probeTarget);probe.position.set(3,2.05,-1.5);probe.update(renderer,scene);
 const prefilter=new T.PMREMGenerator(renderer),env=prefilter.fromCubemap(probeTarget.texture);
 scene.environment=env.texture;scene.environmentIntensity=.41;prefilter.dispose();probeTarget.dispose();
 const audio=makeGardenAudio(),sound=document.getElementById('sound');
 sound.addEventListener('click',()=>{const on=audio.toggle();sound.classList.toggle('mute',!on);sound.setAttribute('aria-pressed',String(!on));sound.setAttribute('aria-label',on?'音を切る':'音を出す');});
 const meter=document.getElementById('pressure'),bars=[],hand=document.getElementById('hand'),stages=[...document.querySelectorAll('.stage')];
 for(let i=0;i<7;i++){const bar=document.createElement('i');bar.className='bar';bar.style.height=(6+i*2.45)+'px';meter.appendChild(bar);bars.push(bar);}
 // A small linear-light highlight filter, vignette, and sub-pixel grain form the final pass.
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples)});
 const outputScene=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const shader=new T.ShaderMaterial({
   uniforms:{source:{value:target.texture},pixel:{value:new T.Vector2()}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
   fragmentShader:`
     uniform sampler2D source;uniform vec2 pixel;varying vec2 vUv;
     vec3 bright(vec2 p){vec3 c=texture2D(source,p).rgb;return max(c-vec3(.96),vec3(0.));}
     void main(){
       vec3 c=texture2D(source,vUv).rgb;vec3 bloom=vec3(0.);
       for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a))*pixel;bloom+=bright(vUv+d*4.)+bright(vUv+d*10.)*.5;}
       c+=bloom*.006;
       vec2 q=vUv*2.-1.;c*=1.-.080*dot(q,q)*.5;
       gl_FragColor=vec4(c,1.);
       #include <tonemapping_fragment>
       #include <colorspace_fragment>
       gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.006;
     }`,depthWrite:false,depthTest:false
 });
 outputScene.add(new T.Mesh(new T.PlaneGeometry(2,2),shader));
 let width=1,height=1,initial=true;
 const focus=new T.Vector3(),eye=new T.Vector3(),goalEye=new T.Vector3(),goalFocus=new T.Vector3(),eyeV=new T.Vector3(),focusV=new T.Vector3();
 function resize(){
   width=canvas.clientWidth;height=canvas.clientHeight;
   const dpr=Math.min(window.devicePixelRatio||1,1.6,Math.sqrt(2100000/(width*height)));
   renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);cam.aspect=width/height;cam.updateProjectionMatrix();
   target.setSize(Math.round(width*dpr),Math.round(height*dpr));shader.uniforms.pixel.value.set(1/target.width,1/target.height);
 }
 function spring(pos,v,to,k,dt){
   for(let i=0;i<3;i++){const a=['x','y','z'][i];v[a]+=((to[a]-pos[a])*k-2*Math.sqrt(k)*v[a])*dt;pos[a]+=v[a]*dt;}
 }
 function camera(dt){
   const h=S.hole,b=S.ball,s=b.s,hole=G.holes[h],progress=G.smooth(s/hole.length),over=G.smooth((s-2.5)/3.3)*(1-G.smooth((s-6)/2.6));
   let track=G.point(h,s),f=G.point(h,Math.min(hole.length,s+4.7-progress*1.55));
   const narrow=Math.max(0,Math.min(1,(.84-cam.aspect)/.39));
   goalEye.set(track.x+3.18+over*1.9-narrow*2.77,3.93+(track.y-.44)*.74+over*.62+narrow*.92,track.z+7.35+over*1.02+narrow*6.98);
   goalFocus.set(f.x+.04+narrow*.30+progress*.18,1.62+over*.12+(f.y-.44)*.62+narrow*.22,f.z+.54);
   if(h===0||h===2){
     const turn=G.smooth((s-(h===0?3.85:3.08))/(h===0?2.1:2.55));
     const reach=7.4+narrow*5.0;
     goalEye.x+=(track.x+reach-goalEye.x)*turn;
     goalEye.z+=(track.z+1.28-goalEye.z)*turn;
     goalEye.y+=turn*.45;
     goalFocus.x+=(track.x-.24-goalFocus.x)*turn;
     goalFocus.z+=(track.z-1.35-goalFocus.z)*turn;
   }
   if(h===1){goalEye.x+=.34;goalFocus.y-=.09;}
   if(h===2){goalEye.x+=over*1.1;goalEye.y+=over*.45;goalFocus.z-=.18;}
   if(S.phase==='garden'||(S.phase==='travel'&&h===2)){
     goalEye.set(9.6,8.0,13.9+narrow*6.5);goalFocus.set(.48,1,-4.23);
     if(narrow){goalEye.set(20,10.5,10.4);goalFocus.set(.15,.9,-5);}
   }
   if(S.phase==='travel'){
     const next=(h+1)%3,tee=G.point(next,0),end=G.point(h,hole.length);
     const distance=Math.hypot(tee.x-end.x,tee.z-end.z),u=G.smooth(S.phaseTime/Math.max(2.5,distance/3.2));
     const ahead=G.point(next,4.7);
     goalEye.x+=(tee.x+3.18-narrow*2.77+(next===1?.34:0)-goalEye.x)*u;
     goalEye.y+=(3.93+narrow*.92-goalEye.y)*u+.85*Math.sin(u*Math.PI);
     goalEye.z+=(tee.z+7.35+narrow*6.98-goalEye.z)*u;
     goalFocus.x+=(ahead.x+.04+narrow*.30-goalFocus.x)*u;
     goalFocus.y+=(1.62+(ahead.y-.44)*.62+narrow*.22-(next===1?.09:0)-goalFocus.y)*u;
     goalFocus.z+=(ahead.z+.54-(next===2?.18:0)-goalFocus.z)*u;
   }
   if(initial){eye.copy(goalEye);focus.copy(goalFocus);initial=false;}
   const k=S.phase==='garden'?1.7:S.phase==='arrive'?4.8:6.1;
   spring(eye,eyeV,goalEye,k,dt);spring(focus,focusV,goalFocus,k,dt);
   cam.position.copy(eye);cam.lookAt(focus);cam.updateMatrixWorld();
 }
 resize();camera(0);window.addEventListener('resize',resize);
 let active=null;
 const projected=new T.Vector3(),side=new T.Vector3(),screen={x:0,y:0,r:0};
 function ballScreen(){
   projected.copy(world.ball.position).project(cam);
   side.set(G.radius,0,0).applyQuaternion(cam.quaternion).add(world.ball.position).project(cam);
   screen.x=(projected.x+1)*width/2;screen.y=(1-projected.y)*height/2;
   screen.r=Math.max(28,Math.abs(side.x-projected.x)*width*.5*1.8);return screen;
 }
 function hit(e){
   const p=ballScreen(),rect=canvas.getBoundingClientRect(),dx=e.clientX-rect.left-p.x,dy=e.clientY-rect.top-p.y;
   return dx*dx+dy*dy<p.r*p.r;
 }
 canvas.addEventListener('pointerdown',e=>{
   if(e.button!==0||active!==null||!hit(e)||!game.press())return;
   e.preventDefault();active=e.pointerId;canvas.setPointerCapture(active);audio.open();
 });
 canvas.addEventListener('pointerup',e=>{
   if(e.pointerId!==active)return;e.preventDefault();active=null;game.release();
   if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 });
 function cancel(e){if(active!==null&&(!e||e.pointerId===active)){active=null;game.cancel();}}
 canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
 canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')canvas.style.cursor=S.phase==='charge'?'grabbing':S.phase==='ready'&&hit(e)?'grab':'default';});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 function hud(){
   const p=ballScreen(),h=S.hint;
   hand.style.opacity=h.active?String(Math.min(1,h.wait*4,(3.1-h.wait)*4)*.93):'0';
   hand.style.transform='translate3d('+(p.x+15-h.depth*12)+'px,'+(p.y+9-h.depth*12)+'px,0) rotate('+(-18+h.depth*6)+'deg) scale('+(.94-h.depth*.09)+')';
   meter.style.opacity=S.phase==='ready'||S.phase==='charge'?'1':'.0';
   bars.forEach((b,i)=>b.classList.toggle('lit',S.phase==='charge'&&i/7<S.charge/1.55));
   stages.forEach((e,i)=>{e.classList.toggle('on',S.hole===i);e.classList.toggle('done',S.completed[i]&&S.hole!==i);});
 }
 let prev=0;
 function frame(now){
   const dt=prev?Math.min(.067,(now-prev)/1000):0;prev=now;
   game.step(dt);world.apply(S);camera(dt);audio.update(S);hud();
   renderer.setRenderTarget(target);renderer.render(scene,cam);renderer.setRenderTarget(null);renderer.render(outputScene,ortho);
   requestAnimationFrame(frame);
 }
 document.addEventListener('visibilitychange',()=>{prev=0;if(document.hidden){cancel();audio.pause();}});
 requestAnimationFrame(frame);
})();
