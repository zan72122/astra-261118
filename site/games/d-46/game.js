'use strict';
(()=>{
 const T=THREE,{V,TAU,mat,m,mesh,group,box,cyl,ball}=Atelier;
 const model=WorkshopPhysics.create(),s=model.state,sound=workshopAudio();
 window.__GAME__={step:model.step,getState:model.getState,press:model.press,move:model.move,release:model.release,setBlade:model.setBlade};
 const canvas=document.getElementById('view'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(28,1,.06,120);
 scene.fog=new T.FogExp2(0xc6ceba,.022);
 // An airy afternoon sky, made locally. The reflection maps below also include the actual workshop and meadow.
 const sky=Atelier.canvas(512,256),cx=sky.getContext('2d'),grad=cx.createLinearGradient(0,0,0,256);
 grad.addColorStop(0,'#87aab6');grad.addColorStop(.31,'#b0c8c7');grad.addColorStop(.48,'#e8debd');grad.addColorStop(.56,'#bbc1a5');grad.addColorStop(1,'#908777');
 cx.fillStyle=grad;cx.fillRect(0,0,512,256);
 const skyMap=new T.CanvasTexture(sky);skyMap.mapping=T.EquirectangularReflectionMapping;skyMap.colorSpace=T.SRGBColorSpace;scene.background=skyMap;scene.environment=skyMap;
 const ambient=new T.HemisphereLight(0xe2edf0,0xb29976,1.30);scene.add(ambient);
 const sun=new T.DirectionalLight(0xffe3b3,3.05);scene.add(sun,sun.target);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00021;sun.shadow.normalBias=.008;
 Object.assign(sun.shadow.camera,{left:-6.4,right:6.4,top:6.4,bottom:-6.4,near:.1,far:33});
 sun.shadow.camera.updateProjectionMatrix();sun.shadow.radius=2.45;sun.position.set(-5.5,4.60,-8.6);sun.target.position.set(0,0,0);
 const w=buildWorkshop(scene);w.updateBoard(s.cells);
 const blank=mesh(w.local,w.board.geometry.clone(),[m.board,w.board.material[1]]);blank.visible=false;
 const U=w.unit,hand=document.getElementById('hand'),badges=[...document.querySelectorAll('.step')];
 const snd=document.getElementById('sound');snd.addEventListener('click',()=>snd.setAttribute('aria-pressed',String(sound.toggle())));
 // The recessed bed has a soft contact shadow even between the shadow-map texels.
 function occlusion(parent,x,z,width,depth,opacity){
   const c=Atelier.canvas(128,64),ctx=c.getContext('2d'),im=ctx.createImageData(128,64);
   for(let j=0;j<64;j++)for(let i=0;i<128;i++){let a=Math.abs((i+.5)/64-1),b=Math.abs((j+.5)/32-1),d=Math.max(a,b);const k=(j*128+i)*4;
     im.data[k]=im.data[k+1]=im.data[k+2]=42;im.data[k+3]=255*Math.max(0,1-d**5)**2;}
   ctx.putImageData(im,0,0);const ma=mat(0x584a37,1,0,{map:Atelier.texture(c),transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
   const g=mesh(parent,new T.PlaneGeometry(width,depth),ma,x,.003,z);g.rotation.x=-Math.PI/2;g.castShadow=g.receiveShadow=false;return g;
 }
 const contact=occlusion(w.local,0,0,3.50,.94,.28);
 const jigs=group(w.local);
 for(const x of [-1.39,1.39]){box(jigs,.12,.6,.16,m.edge,x,-.30,-.1,.012);cyl(jigs,.105,.10,.032,m.trim,x,.001,-.10);}
 // Small warm reflections on the untouched grain move the gaze ahead of the plane.
 const gleams=group(w.local),glintMat=mat(0xffe4a4,.28,.13,{transparent:true,opacity:.34,emissive:0xf9c36f,emissiveIntensity:.18,depthWrite:false});
 for(let i=0;i<3;i++){const q=ball(gleams,.064-i*.008,.002,.006,glintMat,i*.18,0,(i-1)*.038);q.castShadow=false;}
 const dustG=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xffeaca,.88,0,{transparent:true,opacity:.56,emissive:0xffda8b,emissiveIntensity:.31}),s.dust.length);
 scene.add(dustG);dustG.frustumCulled=false;
 const tempObj=new T.Object3D(),shaves=new Map(),rainHolder=group(w.boardRoot);
 const dropsG=new T.InstancedMesh(new T.SphereGeometry(1,5,5),mat(0xc3dddc,.12,.19,{transparent:true,opacity:.62}),260);
 const hitsG=new T.InstancedMesh(new T.TorusGeometry(1,.072,4,18),mat(0xe3ead9,.18,.2,{transparent:true,opacity:.55}),130);
 dropsG.frustumCulled=hitsG.frustumCulled=false;rainHolder.add(dropsG,hitsG);dropsG.count=hitsG.count=0;
 // Capture real timber, sky and greenery for metal, glass and wet surfaces.
 w.cart.visible=false;w.parts.forEach(p=>p.visible=false);
 const gen=new T.PMREMGenerator(renderer);
 function reflectAt(pos){
   const target=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType});
   const c=new T.CubeCamera(.12,90,target);c.position.copy(pos);scene.add(c);
   c.update(renderer,scene);const rt=gen.fromCubemap(target.texture);scene.remove(c);target.dispose();return rt;
 }
 const indoor=reflectAt(V(-.9,.56,.2)),outdoor=reflectAt(V(2.0,.05,-6.7));gen.dispose();scene.environment=indoor.texture;scene.environmentIntensity=.58;
 // Final HDR pass: a restrained highlight halo, fine grain and mild edge falloff.
 const frame=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:0,depthBuffer:true});
 const postScene=new T.Scene(),postCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frame:{value:frame.texture},pixel:{value:new T.Vector2()}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`uniform sampler2D frame;uniform vec2 pixel;varying vec2 vUv;
 vec3 lightAt(vec2 p){vec3 c=texture2D(frame,p).rgb;return c*max(0.,1.-1.05/max(.01,dot(c,vec3(.2126,.7152,.0722))));}
 void main(){
 vec3 c=texture2D(frame,vUv).rgb;vec3 halo=vec3(0.);
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a))*pixel;halo+=lightAt(vUv+d*3.)*.085+lightAt(vUv+d*8.)*.040;}
 c+=halo*.055;
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 gl_FragColor.rgb+=grain*.009;
 }`});postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
 const W=()=>canvas.clientWidth,H=()=>canvas.clientHeight;
 function resize(){
   const width=innerWidth,height=innerHeight,ratio=Math.min(devicePixelRatio||1,1.75,Math.sqrt(2300000/(width*height)));
   renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
   const size=renderer.getDrawingBufferSize(new T.Vector2());frame.setSize(size.x,size.y);frame.samples=renderer.capabilities.maxSamples>=2?2:0;
   finish.uniforms.pixel.value.set(1/size.x,1/size.y);
 }resize();addEventListener('resize',resize);
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function phaseId(){return ['plane','fit'].includes(s.stage)?Number(s.stage==='fit'):['carry','sun'].includes(s.stage)?2:3;}
 function point(o,x=0,y=0,z=0){return o.localToWorld(V(x,y,z));}
 function screen(p){const n=p.clone().project(camera);return {x:(n.x+1)*W()/2,y:(1-n.y)*H()/2,z:n.z};}
 function layout(){
   const portrait=smooth((1.03-camera.aspect)/.58);
   const stage=s.stage,p=s.cart,f=s.stage==='home'?1-smooth(s.returnP):1;
   const lift=.602*s.lift;
   const home=stage==='home',feed=home?s.feed:0;
   blank.visible=home;blank.position.set(-4.5*(1-feed),.20*(1-feed),0);
   blank.rotation.z=-.044*(1-feed);
   const travel=w.path.getPointAt(p);w.local.updateWorldMatrix(true,false);
   w.boardRoot.position.copy(w.local.worldToLocal(travel.clone()));w.stock.position.y=lift;
   w.stock.rotation.z=s.nudge*.036;
   for(let i=0;i<4;i++){
     const o=w.parts[i],q=s.pieces[i].p,sign=i%2?1:-1,show=s.stage!=='plane'&&(i<2||s.pieces[i-2].locked);
     o.visible=show;
     if(i<2){o.position.set(sign*(1.04+(.17-.99*portrait)*(1-q)),(1-q)*.293+Math.sin(q*Math.PI)*.096,(1-q)*(i===0?.66:-.67)*(1-.42*portrait));o.rotation.set((i===0?1:-1)*(1-q)*1.26,sign*(1-q)*.29,0);}
     else{o.position.set(sign*(1.05+(1-q)*(.15-.96*portrait)),.515-(1-q)*.457,.264+(1-q)*(.58-.35*portrait));o.rotation.y=(1-q)*.57;}
   }
   w.cart.visible=['carry','sun','rain','home'].includes(stage);
   w.cart.position.y=-.30*(1-smooth(p*19));for(const wheel of w.wheels)wheel.rotation.z=-s.wheels;
   const slide=s.lift*(1-feed);w.plane.position.set((home?-300:s.x-300)*U*(1-slide)-2.38*slide,(home?32:s.cells[Math.min(29,Math.floor(s.x/20))].thickness)*U*(1-slide)+.045*slide+Math.sin(slide*Math.PI)*.15,-.55*slide);
   w.plane.rotation.y=-.29*slide;w.plane.rotation.z=s.nudge*.13+Math.min(.005,s.edge*.000009);
   w.bladeGroup.position.y=.243-(s.blade-4)*U*.42;
   w.mouth.visible=s.ribbons.length===0||home;
   jigs.visible=stage==='fit';jigs.position.y=lift*(1-s.pieces[1].p);
   jigs.scale.y=Math.max(.001,s.lift*(1-s.pieces[1].p));
   contact.material.opacity=.29*(1-slide*.85)*(home?feed:1-smooth(p*6));
   w.updateBoard(s.cells);
   for(const r of s.ribbons){let item=shaves.get(r.id);
     if(!item){const g=Atelier.stripgeo(55),o=mesh(w.local,g,r.id%3?m.shave:m.shave2);item={o,length:-1};shaves.set(r.id,item);}
     const o=item.o;o.visible=!home;if(r.length!==item.length){Atelier.curl(o.geometry,Math.max(1,r.length)*U,r.radius*U,r.span*U,r.id*.37);item.length=r.length;}
     o.position.set(r.x*U+.012,r.y*U,r.z*U);o.rotation.set(r.tilt+r.roll*.3,r.yaw,r.tilt*.22);
   }
   if(!s.ribbons.length&&shaves.size){for(const {o} of shaves.values()){o.removeFromParent();o.geometry.dispose();}shaves.clear();}
   for(let i=0;i<s.dust.length;i++){const a=s.dust[i];tempObj.position.set(a.x*U,a.y*U,a.z*U-.4);tempObj.scale.setScalar(.0022+a.lift*.00069);tempObj.rotation.set(0,0,0);tempObj.updateMatrix();dustG.setMatrixAt(i,tempObj.matrix);}
   dustG.instanceMatrix.needsUpdate=true;
   for(let i=0;i<w.stems.length;i++){w.stems[i].rotation.z=s.leaves[i].angle;w.stems[i].rotation.x=s.leaves[i].angle*.31;}
   rainHolder.position.y=lift+s.cells[15].thickness*U;
   let nr=0,nh=0;for(const d of s.drops){
     tempObj.position.set(d.x*U,d.y*U,d.z*U);if(d.hit){
       if(nh>=130)continue;const r=.006+d.hit*.13;tempObj.scale.set(r,r,.008*(1-d.hit/.29));tempObj.rotation.set(-Math.PI/2,0,0);tempObj.updateMatrix();hitsG.setMatrixAt(nh++,tempObj.matrix);
     }else{if(nr>=260)continue;tempObj.scale.set(.0045,.022+Math.abs(d.vy)*.000025,.0045);tempObj.rotation.set(0,0,-.028);tempObj.updateMatrix();dropsG.setMatrixAt(nr++,tempObj.matrix);}
   }
   dropsG.count=nr;hitsG.count=nh;dropsG.instanceMatrix.needsUpdate=hitsG.instanceMatrix.needsUpdate=true;
   w.wheelRotor.rotation.z=-s.wheel;w.rocker.rotation.z=(s.gate-.55)*.68;w.stream.visible=s.runoff>.045&&stage==='rain';w.stream.scale.set(Math.max(.1,s.runoff),.89,Math.max(.1,s.runoff));
   sun.intensity=(2.40+s.sun*.91)*(1-s.rain*.60);sun.color.setRGB(1,.833+s.rain*.095,.589+s.rain*.28);
   const shadowFollow=travel.clone().multiplyScalar(p);sun.target.position.set(shadowFollow.x,0,shadowFollow.z);sun.position.copy(sun.target.position).add(V(-5.5,4.60,-8.6));
   scene.environment=(p*f>.67?outdoor:indoor).texture;
   gleams.visible=stage==='plane'&&!s.returning;
   gleams.position.set(Math.min(1.06,w.plane.position.x+.92),s.cells[15].thickness*U+.006,.035);
   glintMat.opacity=.23+s.sun*.16+Math.min(.20,s.edge*.0003);
   // The close camera stays with the work. It follows the outside of the gable on the journey.
   const aspect=Math.max(.43,camera.aspect);
   const distance=Math.max(1,Math.min(1.18,1.38/aspect));
   const homeAim=V(-.30,.67,-.03),homeOffset=V(2.02,1.23,5.49);
   w.sampleTable.position.set(.94-1.57*portrait,0,-1.04+.20*portrait);w.sampleTable.scale.setScalar(.94-.11*portrait);homeAim.x+=.28*portrait;homeAim.y+=.01*portrait;
   homeOffset.lerp(V(5.80,1.88,3.80),portrait).multiplyScalar(distance*(1-.0424*portrait));
   const tracking=stage==='plane'?smooth(s.x/600):0;homeAim.x+=.19*tracking;
   const fit=s.lift*(1-feed);homeAim.y+=fit*.08;homeOffset.multiplyScalar(1+fit*.072);
   const outsideOffset=V(2.05,2.05,5.28).lerp(V(6.58,3.39,3.6),portrait).multiplyScalar(distance*(1+.13*portrait));
   outsideOffset.multiplyScalar(1.12+s.rain*.045);
   const cameraTrip=stage==='home'?w.path.getPointAt(f):travel;
   const progress=stage==='home'?f:p;
   const focus=V(cameraTrip.x+.18*portrait,cameraTrip.y+.50,cameraTrip.z-.34*portrait);
   const aim=homeAim.clone().lerp(focus,smooth(progress*3.6));
   const offset=homeOffset.clone().lerp(outsideOffset,smooth(progress));
   offset.x+=Math.sin(progress*Math.PI)*2.32;offset.y+=Math.sin(progress*Math.PI)*.86;
   camera.position.copy(aim).add(offset);camera.lookAt(aim);camera.updateMatrixWorld();
   scene.updateMatrixWorld(true);
   const ph=phaseId();for(let i=0;i<badges.length;i++)badges[i].classList.toggle('live',i===ph);
 }
 let guideOrigin=null,guideIdle=0;
 function nextCell(){let index=0;for(let i=1;i<30;i++)if(s.cells[i].reveal<s.cells[index].reveal)index=i;return index;}
 function activePoint(){
   if(s.stage==='plane')return point(w.plane,.22,.40,.10);
   if(s.stage==='fit'){let i=s.pieces.findIndex(a=>!a.locked);return i<0?null:point(w.parts[i],0,i<2?.24:.01,0);}
   if(s.stage==='carry')return point(w.stock,.08,.14,.20);
   if(s.stage==='sun')return point(w.stock,(nextCell()/29-.5)*3.1,.16,.03);
   if(s.stage==='rain')return point(w.rocker,.11,.06,0);return null;
 }
 function guide(){
   const pos=activePoint();if(s.idle<3.95||!pos||s.drag||s.returning||s.stage==='carry'&&s.cartTarget===1){hand.style.opacity=0;guideOrigin=null;guideIdle=0;return;}
   const start=screen(pos);
   // Each demonstration begins from the current physical target and ends in a short rest.
   if(!guideOrigin||s.idle-guideIdle>3.15){guideOrigin=start;guideIdle=s.idle;}
   const t=s.idle-guideIdle,k=smooth((t-.4)/1.48);
   let to=pos.clone();
   if(s.stage==='plane')to=point(w.plane,.92,.395,.10);
   if(s.stage==='fit'){const i=Math.max(0,s.pieces.findIndex(a=>!a.locked));to=point(w.stock,i%2?1.04:-1.04,-.15,.20);}
   if(s.stage==='sun')to=point(w.stock,Math.min(1.39,(nextCell()/29-.5)*3.1+.39),.16,.03);
   const end=screen(to);let x=start.x+(end.x-start.x)*k,y=start.y+(end.y-start.y)*k;
   const tap=['rain','carry'].includes(s.stage);if(tap)y-=9*Math.abs(k-.5);
   hand.style.transform='translate('+(x-8)+'px,'+(y-7)+'px) rotate(-12deg) scale('+(tap?1-.08*Math.sin(k*Math.PI):1)+')';
   hand.style.opacity=String(.80*smooth(t/.25)*(1-smooth((t-2.02)/.43)));
 }
 const ray=new T.Raycaster(),ndc=new T.Vector2();
 function setRay(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(ndc,camera);}
 function hit(o){return o.visible&&ray.intersectObject(o,true)[0];}
 function closeTo(e,p,px){const a=screen(p);return Math.hypot(e.clientX-a.x,e.clientY-a.y)<=px;}
 function grainAt(e){setRay(e);const h=hit(w.board);if(!h)return null;return T.MathUtils.clamp(w.stock.worldToLocal(h.point.clone()).x/3.18+.5,0,1);}
 let pointer=null,drag=null;
 canvas.addEventListener('pointerdown',e=>{
   if(pointer!==null)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);sound.unlock();setRay(e);
   const stage=s.stage;let did=false;
   if(stage==='plane'){
     const h=hit(w.plane),metal=hit(w.bladeGroup);
     if(metal&&h&&Math.abs(metal.distance-h.distance)<.001&&w.bladeGroup.worldToLocal(metal.point.clone()).y>.32){
       // A tap adjusts the iron. Moving the same finger still starts a shaving stroke.
       drag={adjust:true};
     }
     if(h||closeTo(e,point(w.plane,.12,.24,.09),27)){
       const a=screen(point(w.local,0,.20,0)),b=screen(point(w.local,600*U,.20,0));
       drag={...drag,kind:'plane',start:s.x,x:e.clientX,y:e.clientY,dx:b.x-a.x,dy:b.y-a.y,moved:0};
       did=model.press('plane');
     }
   }else if(stage==='fit'){const i=s.pieces.findIndex(p=>!p.locked);
     if(i>=0&&(hit(w.parts[i])||closeTo(e,point(w.parts[i],0,i<2?.22:0,0),30)))did=model.press('part',i);
   }else if(stage==='carry'&&(hit(w.boardRoot)||closeTo(e,point(w.stock,0,.13,0),34)))did=model.press('cart');
   else if(stage==='sun'||stage==='rain'){
     const f=grainAt(e);if(f!==null){did=model.press('grain',f);drag={kind:'grain',f};}
     else if(stage==='rain'&&(hit(w.rocker)||closeTo(e,point(w.rocker),30)))did=model.press('gate');
   }
   if(!did)model.press('background');
 });
 canvas.addEventListener('pointermove',e=>{
   if(e.pointerId!==pointer||!drag)return;
   if(drag.kind==='plane'){
     const x=e.clientX-drag.x,y=e.clientY-drag.y;drag.moved=Math.max(drag.moved,Math.hypot(x,y));
     model.move(drag.start+(x*drag.dx+y*drag.dy)/(drag.dx**2+drag.dy**2)*785);
   }else if(drag.kind==='grain'&&s.stage==='sun'){const f=grainAt(e);if(f!==null&&Math.abs(f-drag.f)>.025){model.press('grain',f);drag.f=f;}}
 });
 function up(e){if(e.pointerId!==pointer)return;if(e.type==='pointerup'&&drag&&drag.adjust&&drag.moved<6)model.press('blade');model.release();drag=null;pointer=null;}
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,up);
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 let last=performance.now();function render(now){
   const dt=Math.max(0,Math.min((now-last)/1000,.065));last=now;model.step(dt);
   layout();guide();sound.update(s);
   renderer.setRenderTarget(frame);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCam);requestAnimationFrame(render);
 }
 document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){model.release();pointer=null;drag=null;}});
 layout();requestAnimationFrame(render);
})();
