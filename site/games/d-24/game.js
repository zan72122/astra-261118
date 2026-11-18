'use strict';
window.__GAME__={step:sim.step,getState:sim.getState};
const sound=makeSound(),guide=document.getElementById('guide'),stations=[...document.querySelectorAll('.station')];
const kelp=mat(0x6b8067,.94), rippleCream=mat(0xd6e7d9,.32,.12),pearl=mat(0xe4ede0,.26,.12);
const foamModel=new T.InstancedMesh(ball,pearl,st.foam.length);foamModel.count=0;foamModel.frustumCulled=false;scene.add(foamModel);
const dropModel=new T.InstancedMesh(ball,mat(0xaacac1,.19,.34,'metal'),st.drops.length);dropModel.count=0;dropModel.frustumCulled=false;scene.add(dropModel);
const nozzleRuns=[];
for(let k=0;k<3;k++){const runs=[];for(let i=0;i<9;i++){const r=rod(scene,0,0,0,.029,1,mat(i%3===0?0xc0d9ce:0x80b6ae,.22,.21,'metal'),.023,6);r.castShadow=false;r.visible=false;runs.push(r);}nozzleRuns.push(runs);}
bake(land);
fishModels.forEach(f=>f.visible=false);birdModels.forEach(({b},i)=>{const a=st.birds[i];b.position.set(a.x,a.y,a.z);});
// Capture the actual stonework, sky and timber for brushed brass and glazing.
const capture=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType});
const mirrorBall=new T.CubeCamera(.24,240,capture);mirrorBall.position.set(0,3.7,-3);
tug.position.set(st.boat.x,st.boat.y,st.boat.z);pennants.position.y=-2.9;
mirrorBall.update(renderer,scene);const pm=new T.PMREMGenerator(renderer),environment=pm.fromCubemap(capture.texture);
scene.environment=environment.texture;scene.environmentIntensity=.59;capture.dispose();pm.dispose();
const waterRoot=group(),waterPatches=[],reflection=new T.WebGLRenderTarget(640,400,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
const mirrorCam=camera.clone(),reflectionMatrix=new T.Matrix4(),bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
const beacon={value:new T.Vector2()};
const planes=[],surfaceColours=[0x4b8d86,0x518d83,0x60978e,0x679c96];
function waterPatch(k,x,z,w,d,cols,rows,base=0){
 const geo=new T.PlaneGeometry(w,d,cols,rows);geo.rotateX(-pi/2);
 const ma=mat(surfaceColours[k],.245,.22,'soft');
 const drift={value:new T.Vector2()},eddy={value:0},projection={value:reflectionMatrix},inlet={value:new T.Vector2(2.5,E[k+1]===undefined?-29:E[k+1]+1.1)};
 ma.onBeforeCompile=sh=>{
 Object.assign(sh.uniforms,{uDrift:drift,uEddy:eddy,uReflect:{value:reflection.texture},uProject:projection,uInlet:inlet,uBeacon:beacon});
 sh.vertexShader='varying vec3 vCanal;uniform mat4 uProject;varying vec4 vMirror;\n'+sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvCanal=(modelMatrix*vec4(transformed,1.)).xyz; vMirror=uProject*vec4(vCanal,1.);');
 sh.fragmentShader='varying vec3 vCanal; varying vec4 vMirror; uniform sampler2D uReflect;uniform vec2 uDrift,uInlet,uBeacon;uniform float uEddy;\n'+sh.fragmentShader.replace('#include <normal_fragment_maps>',`
 vec2 cp=vCanal.xz,rv=cp-uInlet;float rad=length(rv);float turb=uEddy*exp(-rad*.72);
 float bend=sin(cp.x*1.3-cp.y*.82+uDrift.y)*.65+sin(cp.y*2.83+uDrift.x)*.29;
 float p1=dot(cp,vec2(2.61,4.83))+bend+uDrift.x*2.7;
 float p2=dot(cp,vec2(-3.4,7.5))+sin(cp.x*2.7+uDrift.y)*.89-uDrift.y*3.4;
 float p3=cp.y*15.3+cp.x*2.6+sin(cp.x*3.+cp.y)*1.57+uDrift.x*4.1;
 float fade=1./(1.+.013*length(vViewPosition));
 vec2 slopes=vec2(.038*cos(p1)-.029*cos(p2)+.012*sin(p3),.048*cos(p1)+.042*cos(p2)+.033*sin(p3));
 slopes+=turb*vec2(cos(rad*12.-uDrift.y*11.),sin(rad*13.-uDrift.y*13.))*.19;
 normal=normalize(normal+mat3(viewMatrix)*vec3(slopes.x*fade,0.,slopes.y*fade));
 `).replace('#include <opaque_fragment>',`
 vec2 scr=vMirror.xy/vMirror.w; vec2 distort=vec2(slopes.x*.081,slopes.y*.132)*fade;
 vec3 refl=texture2D(uReflect,clamp(scr+distort,vec2(.004),vec2(.996))).rgb;
 float fres=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.5);
 outgoingLight=mix(outgoingLight*.78,refl*vec3(.87,.96,.93),clamp(.21+fres*.58,.19,.77));
 float glint=pow(max(0.,dot(reflect(-normalize(vec3(-.53,.35,-.8)),normalize(vec3(slopes.x*fade,1.,slopes.y*fade))),normalize(cameraPosition-vCanal))),110.);
 outgoingLight+=vec3(1.5,1.1,.61)*glint;
 vec2 fromLamp=cp-vec2(3.9,-51.5);float lampRadius=length(fromLamp);
 float lampArc=dot(fromLamp/max(.01,lampRadius),vec2(sin(uBeacon.x),cos(uBeacon.x)));
 float reflectedBeam=smoothstep(.965,.999,abs(lampArc))*exp(-.078*lampRadius)*smoothstep(1.,4.,lampRadius);
 outgoingLight+=vec3(1.20,.77,.31)*reflectedBeam*uBeacon.y*(.20+.8*pow(.5+.5*cos(p2),3.));
 #include <opaque_fragment>`);
 };
 const ob=mesh(waterRoot,geo,ma,x,base,z);ob.castShadow=false;ob.receiveShadow=true;
 const patch={ob,geo,k,drift,eddy,base,cols,rows};waterPatches.push(patch);return patch;
}
for(let k=0;k<3;k++){planes.push(waterPatch(k,0,(E[k]+E[k+1])*.5,6.79,E[k]-E[k+1],12,24,F[k]));}
waterPatch(3,0,-66.5,165,95.03,52,42,H[2]);
waterPatch(0,0,48,175,80,54,27,F[0]-.012);
waterPatch(0,0,-1.53,170,19.08,48,14,-.105);
const arrowMetal=mat(0xffde83,.34,.45,'metal',{emissive:0xffc56a,emissiveIntensity:.23});
const focusMarker=group();const focusRing=ring(focusMarker,0,0,0,.865,.017,arrowMetal,64);
const motes=[];for(let i=0;i<11;i++){const a=orb(focusMarker,0,0,0,.026,.026,.026,arrowMetal);a.castShadow=false;motes.push(a);}
const dustGeo=new T.SphereGeometry(1,6,4),dust=new T.InstancedMesh(dustGeo,mat(0xe1d8b1,.75,0,'soft',{emissive:0x57452d,emissiveIntensity:.17}),35);
dust.frustumCulled=false;scene.add(dust);const particles=st.vapour;
const vapour=particles.map(()=>{const ma=mat(0xe4e4d7,.99,0,'soft',{transparent:true,opacity:.1,depthWrite:false});
 const o=mesh(scene,rockGeo,ma,0,0,0);o.castShadow=false;o.receiveShadow=false;return o;});
const lampGlow=mat(0xffe7ad,.23,.1,'metal',{emissive:0xffca72,emissiveIntensity:.15});
lampTarget.children[0].material=lampGlow;
const lampRotor=group(scene,3.9,10.92,-51.5);for(let i=0;i<2;i++){const lens=orb(lampRotor,0,0,i===0?.61:-.61,.21,.31,.084,lampGlow);}
const obj=new T.Object3D(),camTarget=new T.Vector3(),look=new T.Vector3(),eye=new T.Vector3(),targetEye=new T.Vector3(),tmp=new T.Vector3();
function updateCamera(immediate=false,dt=.016){
 const portrait=camera.aspect<.87,b=st.boat,ascent=clamp((4-b.z)/23,0,1),lake=clamp((-b.z-18)/8,0,1);
 const fieldOfView=44+clamp((1.41-camera.aspect)/.85,0,1)*7+lake*4;
 if(Math.abs(camera.fov-fieldOfView)>.003){camera.fov=fieldOfView;camera.updateProjectionMatrix();}
 const lx=portrait?.41:.62,baseZ=portrait?-3.45:-2.55;
 const port=clamp((-b.z-31)/12,0,1);
 look.set(lx+port*(portrait?1.85:1.0)-lake*(1-port)*1.4, b.y+(portrait?2.43:2.14)+ascent*.13+port*.86,
 b.z+baseZ-4+ascent*2.3+lake*2.45+port*2.1);
 const narrow=clamp((1.45-camera.aspect)/.58,0,1);
 const ox=8.65*(1-narrow)+3.18*narrow,oz=17.65*(1-narrow)+20.7*narrow;
 targetEye.set(ox+lake*(portrait?.6:1.4),4.58*(1-narrow)+7.7*narrow+lake*.87,oz-lake*(portrait?.85:3.1)).add(look);
 if(immediate){eye.copy(targetEye);camTarget.copy(look);}else{const blend=1-Math.exp(-dt*2.25);eye.lerp(targetEye,blend);camTarget.lerp(look,blend);}
 camera.position.copy(eye);camera.lookAt(camTarget);camera.updateMatrixWorld();
 sun.target.position.set(0,b.y,b.z-7);sun.position.set(-31.8+b.x,21+b.y,b.z-55);
}
function renderState(){
 beacon.value.set(st.harbor.rotor,st.harbor.light);
 dampLines.value.set(st.water[0].wetLine,st.water[1].wetLine,st.water[2].wetLine);
 const b=st.boat;tug.position.set(b.x,b.y,b.z);tug.rotation.set(b.pitch,b.yaw,b.roll,'YXZ');
 for(let k=0;k<3;k++){
 const w=st.water[k];for(let j=0;j<2;j++)gates[k][j].rotation.y=(j===0?1:-1)*w.gate[j];
 wheels[k].rotation.z=-w.wheel+(st.touched==='valve'+k?st.touchA*.45:0)+w.wind*.012;
 const fall=Math.max(0,H[k]-.24-w.level);
 nozzleRuns[k].forEach((r,j)=>{const stream=w.valve*clamp(w.flow*24,0,1);r.visible=stream>.024 && fall>.02;
 if(!r.visible)return;const phase=w.drift[1]*(6+j%2)+j*.85;const dx=Math.cos(phase)*.018;
 r.position.set(2.65+(j%3-1)*.051+dx,H[k]-.22-fall/2,E[k+1]+.915+(Math.floor(j/3)-1)*.045+fall*.07);
 r.scale.set(.023*stream,fall*1.012,.024*stream);r.rotation.x=-.14+dx;});
 }
 waterPatches.forEach(p=>{
 const w=st.water[p.k];p.drift.value.set(w.drift[0],w.drift[1]);p.eddy.value=w.swirl;
 p.ob.position.y=planes.includes(p)?w.level:p.base;
 const pos=p.geo.attributes.position;
 for(let i=0;i<pos.count;i++){const xx=i%(p.cols+1),zz=Math.floor(i/(p.cols+1));let a=Math.floor(xx/p.cols*6),j=Math.floor((1-zz/p.rows)*12);
 if(p.k===3)j=Math.floor(zz/p.rows*12);
 pos.setY(i,w.cells[j*7+a].h);}
 pos.needsUpdate=true;p.geo.computeVertexNormals();
 });
 let n=0;st.foam.forEach(p=>{if(p.age>=p.life)return;const f=Math.sin(pi*clamp(p.age/p.life,0,1))**.49;
 obj.position.set(p.x,p.y,p.z);obj.rotation.set(0,p.vx*3,0);obj.scale.set(p.r*f,p.r*f*.24,p.r*f*1.4);obj.updateMatrix();foamModel.setMatrixAt(n++,obj.matrix);});foamModel.count=n;foamModel.instanceMatrix.needsUpdate=true;
 let dropCount=0;for(const d of st.drops){if(!d.wet)continue;obj.position.set(d.x,d.y,d.z);obj.rotation.set(-.16,0,-.075);
 obj.scale.set(d.r,d.r*(1.3+Math.abs(d.vy)*.32),d.r);obj.updateMatrix();dropModel.setMatrixAt(dropCount++,obj.matrix);}dropModel.count=dropCount;dropModel.instanceMatrix.needsUpdate=true;
 st.fish.forEach((f,i)=>{const o=fishModels[i];o.visible=f.above;o.position.set(f.x+.12*f.y,st.water[1].level+f.y-.04,f.z);o.rotation.x=Math.atan2(f.vy,2.4);});
 const sa=st.sail;companion.p.position.z=sa.z;companion.p.position.y=H[2]+sim.wave(3,sa.x,sa.z);
 companion.p.rotation.z=st.water[3].wind*.06+(st.touched==='sail'?st.touchA*.13:0);const sp=companion.cloth.geometry.attributes.position;
 for(let i=0;i<sp.count;i++){const y=Math.floor(i/5),f=(i%5)/4;sp.setXYZ(i,companion.rest[3*i]+sa.panels[Math.min(y,7)].bend*Math.sin(f*pi)*.82,
 .81+(companion.rest[3*i+1]-.81)*sa.hoist,companion.rest[3*i+2]);}sp.needsUpdate=true;companion.cloth.geometry.computeVertexNormals();
 pennants.position.y=-2.85*(1-st.harbor.hoist);flagModels.forEach((o,i)=>{o.rotation.x=st.harbor.flags[i].a+.12;o.rotation.z=st.harbor.flags[i].a*.28;});
 bellModel.rotation.x=st.harbor.bell+(st.touched==='bell'?st.touchA*.13:0);lampRotor.rotation.y=st.harbor.rotor;lampGlow.emissiveIntensity=.16+st.harbor.light*3.1;
 st.birds.forEach((a,i)=>{const {b,wings}=birdModels[i];b.position.set(a.x,a.y,a.z);b.rotation.y=.63;wings.forEach((w,j)=>w.rotation.z=(j===0?1:-1)*a.wing);});
 flag.rotation.z=st.harbor.flags[3].a*.24;flag.rotation.y=.25+st.harbor.flags[0].a;
 const w=st.water[st.index];st.dust.forEach((d,i)=>{obj.position.set(d.x,d.y,d.z);obj.rotation.set(0,0,0);obj.scale.setScalar(d.r);obj.updateMatrix();dust.setMatrixAt(i,obj.matrix);});dust.instanceMatrix.needsUpdate=true;
 particles.forEach((p,i)=>{const o=vapour[i];o.visible=p.age<p.life;if(o.visible){o.position.set(p.x,p.y,p.z);o.scale.set(p.r,p.r*.79,p.r*.95);o.material.opacity=.105*Math.sin(pi*p.age/p.life);}});
 const current=anchors[st.target];focusMarker.visible=Boolean(current);
 if(current){current.getWorldPosition(focusMarker.position);focusMarker.quaternion.copy(camera.quaternion);
 if(st.target.startsWith('valve')){focusMarker.quaternion.setFromEuler(new T.Euler(0,.26,0));focusMarker.position.z+=.075;}
 const sz=st.target==='sail'?1.33:st.target==='bell'?.74:1;focusMarker.scale.setScalar(sz);
 focusRing.visible=st.target.startsWith('valve');if(st.target==='bell')focusMarker.position.y-=.44;
 motes.forEach((o,i)=>{const a=i*2*pi/11+w.drift[0]*.95,r=.856+.035*Math.sin(i*4+w.drift[1]);o.position.set(Math.cos(a)*r,Math.sin(a)*r,.018);o.scale.setScalar(.014+.011*(1+Math.sin(a+i)));});}
 const stage=st.mode==='lock'||st.mode==='cross'?st.index:['rig','cruise'].includes(st.mode)?2:3;
 stations.forEach((n,i)=>{n.classList.toggle('on',i===stage);n.classList.toggle('done',i<stage);});
 if(current && st.hint>0){let cycle=st.hint%4.3,approach=clamp(cycle/.75,0,1),lift=clamp((cycle-2.9)/.52,0,1);
 const opacity=Math.min(clamp(cycle/.3,0,1),1-clamp((cycle-3.05)/.65,0,1));
 current.getWorldPosition(tmp);if(st.target==='bell')tmp.y-=.44;tmp.project(camera);const x=(tmp.x*.5+.5)*innerWidth,y=(.5-tmp.y*.5)*innerHeight;
 const scale=1.06-.13*approach+.1*lift;guide.style.transform='translate('+(x-8+(1-approach+lift)*22)+'px,'+(y-6+(1-approach+lift)*22)+'px) rotate(-12deg) scale('+scale+')';guide.style.opacity=opacity*.92;
 }else guide.style.opacity=0;
}
// The reflection camera shares the lens and mirrors its eye and up vector about the current chamber.
const waterClip=new T.Plane(),clipVector=new T.Vector4(),farCorner=new T.Vector4();
function reflectScene(){
 const z=st.boat.z,k=z>E[1]?0:z>E[2]?1:z>E[3]?2:3,h=st.water[k].level;
 mirrorCam.projectionMatrix.copy(camera.projectionMatrix);mirrorCam.position.copy(camera.position);mirrorCam.position.y=2*h-camera.position.y;
 tmp.copy(camTarget);tmp.y=2*h-camTarget.y;mirrorCam.up.set(0,-1,0);mirrorCam.lookAt(tmp);mirrorCam.updateMatrixWorld();
 reflectionMatrix.copy(bias).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
 // Move the reflected lens's near plane to the free surface. Submerged masonry stays out of the reflection.
 waterClip.setComponents(0,1,0,-h+.035).applyMatrix4(mirrorCam.matrixWorldInverse);
 clipVector.set(waterClip.normal.x,waterClip.normal.y,waterClip.normal.z,waterClip.constant);
 const projection=mirrorCam.projectionMatrix.elements;
 farCorner.set((Math.sign(clipVector.x)+projection[8])/projection[0],(Math.sign(clipVector.y)+projection[9])/projection[5],-1,(1+projection[10])/projection[14]);
 clipVector.multiplyScalar(2/clipVector.dot(farCorner));projection[2]=clipVector.x;projection[6]=clipVector.y;projection[10]=clipVector.z+.997;projection[14]=clipVector.w;
 mirrorCam.projectionMatrixInverse.copy(mirrorCam.projectionMatrix).invert();
 waterRoot.visible=false;focusMarker.visible=false;const prev=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;
 renderer.setRenderTarget(reflection);renderer.render(scene,mirrorCam);renderer.setRenderTarget(null);renderer.shadowMap.autoUpdate=prev;
 waterRoot.visible=true;focusMarker.visible=!!st.target;
}
const imageTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const finalPass=new T.ShaderMaterial({uniforms:{src:{value:imageTarget.texture},pixel:{value:new T.Vector2()}},depthTest:false,depthWrite:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`uniform sampler2D src;uniform vec2 pixel;varying vec2 vUv;
 void main(){vec3 col=texture2D(src,vUv).rgb;vec3 bloom=vec3(0.);
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 off=vec2(cos(a),sin(a))*pixel*(3.+float(i%2)*3.5);bloom+=max(texture2D(src,vUv+off).rgb-vec3(1.05),vec3(0.));}
 col+=bloom*.009;gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;gl_FragColor.rgb+=grain*.006;
 }`});
postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finalPass));
function resize(){const w=world.clientWidth,h=world.clientHeight;renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.fov=44+clamp((1.41-camera.aspect)/.85,0,1)*7;camera.updateProjectionMatrix();updateCamera(true);
 const px=renderer.getPixelRatio();imageTarget.setSize(Math.round(w*px),Math.round(h*px));reflection.setSize(Math.max(128,Math.round(w*.53)),Math.max(192,Math.round(h*.53)));finalPass.uniforms.pixel.value.set(1/(w*px),1/(h*px));}
window.addEventListener('resize',resize);resize();
let activePointer=null;
function projectedHit(name,x,y){
 const anchor=anchors[name];anchor.getWorldPosition(tmp);if(name==='bell')tmp.y-=.44;
 const dist=tmp.distanceTo(camera.position);tmp.project(camera);if(tmp.z>1||tmp.z<0)return false;
 const sx=(tmp.x+1)*world.clientWidth/2,sy=(1-tmp.y)*world.clientHeight/2;
 const r=Math.max(25,(name==='sail'?1.85:name==='lamp'?1.17:.91)*world.clientHeight/(2*dist*Math.tan(camera.fov*pi/360)));
 return ((sx-x)/r)**2+((sy-y)/(name==='sail'?1.45*r:r))**2<1;
}
const cv=renderer.domElement;
cv.addEventListener('pointerdown',ev=>{
 if(activePointer!==null || ev.button!==0)return;
 const active=st.target;let obj=active&&projectedHit(active,ev.clientX,ev.clientY)?active:Object.keys(anchors).find(n=>projectedHit(n,ev.clientX,ev.clientY));
 if(obj){sound.start();activePointer=ev.pointerId;cv.setPointerCapture(ev.pointerId);sim.press(obj);ev.preventDefault();}
});
function release(ev){if(ev.pointerId===activePointer){activePointer=null;sim.release();}}
cv.addEventListener('pointerup',release);cv.addEventListener('pointercancel',release);cv.addEventListener('lostpointercapture',release);
window.addEventListener('blur',()=>{sim.release();activePointer=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){sim.release();activePointer=null;}});
document.getElementById('sound').addEventListener('click',e=>{const mute=sound.toggle();e.currentTarget.classList.toggle('mute',mute);e.currentTarget.setAttribute('aria-pressed',String(mute));});
let previous=0,frames=0;
function frame(ms){
 requestAnimationFrame(frame);if(document.hidden){previous=0;return;}
 const dt=previous?Math.min((ms-previous)/1000,.1):1/60;previous=ms;sim.step(dt);updateCamera(false,dt);renderState();sound.tick(st);
 if(frames++%3===0)reflectScene();renderer.setRenderTarget(imageTarget);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
}
requestAnimationFrame(frame);
