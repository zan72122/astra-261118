(()=>{
'use strict';
const T=THREE,game=RainWalk.create(),s=game.s;
const canvas=document.getElementById('street'),hint=document.getElementById('guide');
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.065,110);
scene.fog=new T.FogExp2(0xb4c3bf,.028);
const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;
const skyCtx=skyCanvas.getContext('2d'),im=skyCtx.createImageData(512,256);
const hash=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296};
function noise(x,y){const a=Math.floor(x),b=Math.floor(y);let u=x-a,w=y-b;u=u*u*(3-2*u);w=w*w*(3-2*w);
 return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-w)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*w}
for(let y=0;y<256;y++)for(let x=0;x<512;x++){const h=Math.max(0,1-y/132),n=noise(x/53,y/19)*.54+noise(x/20,y/8)*.28+noise(x/8,y/3)*.18;
 const c=(n-.48)*41*Math.min(1,h*4),sun=Math.exp(-Math.pow((x-166)/70,2)-Math.pow((y-111)/24,2));
 const off=(y*512+x)*4;im.data[off]=198-84*h+c+30*sun;im.data[off+1]=206-62*h+c+15*sun;
 im.data[off+2]=198-39*h+c+3*sun;im.data[off+3]=255}
skyCtx.putImageData(im,0,0);const sky=new T.CanvasTexture(skyCanvas);sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;
scene.background=sky;scene.environment=sky;scene.backgroundIntensity=1.0;scene.environmentIntensity=.58;
const hemi=new T.HemisphereLight(0xd9e6ef,0xa89a78,1.34);scene.add(hemi);
const sun=new T.DirectionalLight(0xffe3ba,2.35);sun.position.set(-8,15,7);sun.target.position.set(0,.25,-6);scene.add(sun,sun.target);
sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-14,right:14,top:17,bottom:-17,near:.5,far:57});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00034;sun.shadow.normalBias=.027;sun.shadow.radius=2;
const world=makeStreet(T,scene);world.update(s);
const envTarget=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});const eye=new T.CubeCamera(.12,67,envTarget);eye.position.set(.12,1.58,-3.5);
eye.update(renderer,scene);const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromCubemap(envTarget.texture);scene.environment=env.texture;scene.environmentIntensity=.73;envTarget.dispose();pmrem.dispose();
const mirror=new T.PerspectiveCamera(),mirrorRT=new T.WebGLRenderTarget(384,384,{type:T.HalfFloatType});
const mirrorMatrix=new T.Matrix4(),clip=new T.Plane(new T.Vector3(0,1,0),-.048);
const wetGrid=new T.DataTexture(new Uint8Array(36*4),6,6,T.RGBAFormat);wetGrid.magFilter=T.LinearFilter;wetGrid.minFilter=T.LinearFilter;wetGrid.wrapS=wetGrid.wrapT=T.ClampToEdgeWrapping;
for(const m of world.wetMaterials){const isPuddle=world.pools.some(p=>p.puddle.material===m)||m===world.M.water;
 m.onBeforeCompile=shader=>{shader.uniforms.uMirror={value:mirrorRT.texture};shader.uniforms.uReflectMatrix={value:mirrorMatrix};shader.uniforms.uWater={value:wetGrid};
 shader.vertexShader='uniform mat4 uReflectMatrix; varying vec4 vReflect; varying vec3 vPaving;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec4 pavement=vec4(transformed,1.);\n#ifdef USE_INSTANCING\npavement=instanceMatrix*pavement;\n#endif\npavement=modelMatrix*pavement; vPaving=pavement.xyz;vReflect=uReflectMatrix*pavement;');
 shader.fragmentShader='uniform sampler2D uMirror; uniform sampler2D uWater; varying vec4 vReflect; varying vec3 vPaving;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec2 localUV=vec2((vPaving.x+2.7)/5.4,(6.175-vPaving.z)/33.3);
 vec4 film=texture2D(uWater,localUV);vec2 reflectedUV=vReflect.xy/vReflect.w*.5+.5;
 float grit=texture2D(roughnessMap,vRoughnessMapUv).g-.83;reflectedUV+=vec2(grit*.0027,(film.g-.3)*.004+grit*.005);
 vec3 reflected=texture2D(uMirror,clamp(reflectedUV,.002,.998)).rgb;
 float grazing=1.-clamp(normalize(cameraPosition-vPaving).y,0.,1.);
 float wet=clamp(${isPuddle?'.39+grazing*.34':'.085+film.r*.17+grazing*grazing*.19'}+grit*.11,0.,.78);
 outgoingLight=mix(outgoingLight,reflected,wet);\n#include <opaque_fragment>`);
 };m.customProgramCacheKey=()=>isPuddle?'puddle-v1':'road-v1';m.needsUpdate=true}
const hiddenOnMirror=[];scene.traverse(o=>{if(o.isMesh&&world.wetMaterials.includes(o.material))hiddenOnMirror.push(o)});
const frameRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),screenUniforms={photo:{value:frameRT.texture},px:{value:new T.Vector2(1,1)}};
const postMat=new T.ShaderMaterial({uniforms:screenUniforms,depthTest:false,depthWrite:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`uniform sampler2D photo;uniform vec2 px;varying vec2 vUv;
 void main(){vec3 col=texture2D(photo,vUv).rgb;vec3 bloom=vec3(0.);
 for(int j=0;j<8;j++){float a=float(j)*.785398;vec2 d=vec2(cos(a),sin(a))*px;
 bloom+=max(texture2D(photo,vUv+d*3.).rgb-vec3(1.14),vec3(0.));
 bloom+=max(texture2D(photo,vUv+d*7.).rgb-vec3(1.36),vec3(0.))*.45;}
 col+=bloom*.012;float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 col+=grain*.005;gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
const sound=streetSound(),ray=new T.Raycaster(),ndc=new T.Vector2(),floor=new T.Plane(new T.Vector3(0,1,0),-.04);
const V=(x,y,z)=>new T.Vector3(x,y,z);
const eyePos=V(0,0,0),look=V(0,0,0),wantEye=V(0,0,0),wantLook=V(0,0,0),direction=V(0,0,0);
let initial=true,pointer=null,pointerX=0,pointerY=0,onGround=false,gesture=null,startX=0,startY=0,w=1,h=1,sinceMirror=1;
function resize(){w=canvas.clientWidth;h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);const d=renderer.getPixelRatio();frameRT.setSize(Math.round(w*d),Math.round(h*d));screenUniforms.px.value.set(1/(w*d),1/(h*d));
 mirrorRT.setSize(Math.max(160,Math.round(w*.55)),Math.max(240,Math.round(h*.55)));sinceMirror=1}
window.addEventListener('resize',resize);resize();
function view(dt){
 const portrait=Math.max(0,Math.min(1,(1.1-w/h)/.63)),angle=s.heading,back=6.24+portrait*4.75;
 const entry=s.stage==='umbrella'||s.stage==='opening'||s.stage==='closing';
 wantEye.set(s.x*.32+Math.sin(angle)*Math.min(back,2.35),entry?1.79+portrait*.35:2.37+portrait*.29,s.z+Math.cos(angle)*back);
 wantLook.set(s.x*.18-Math.sin(angle)*5,entry?1.64:1.47,s.z-Math.cos(angle)*5.6);
 if(['shoe','soles','paper','turning'].includes(s.stage)){
 const shoe=s.stage==='shoe'||s.stage==='soles',side=shoe?-1:1,z=shoe?-7.64:-16.24;
 wantEye.set(side*(1.18-portrait*3.56),1.89+portrait*.10,z-.91);wantLook.set(side*3.68,1.32,z-.01);
 }else if(['bells','winder','winding'].includes(s.stage)){
 wantEye.set(1.86,1.47,-23.22+portrait*2.46);wantLook.set(1.62,1.04,-25.5);
 }else if(s.stage==='rainbow'){
 wantEye.set(.85,2.35,-19.4+portrait*2.8);wantLook.set(0,3.82,-32);
 }else if(['sluice','sailing','prism'].includes(s.stage)){
 const sailed=s.stage==='sailing'?s.boat/4.1:s.stage==='sluice'?0:1;
 wantEye.set(1.63+portrait*.35,1.82+portrait*.26,-19.72-2.9*sailed+portrait*2.35);
 wantLook.set(-.1,.92+sailed*.9,-24.28-4.78*sailed);
 }
 if(initial){eyePos.copy(wantEye);look.copy(wantLook);initial=false}
 const k=1-Math.exp(-dt*(entry?2.3:2.0));eyePos.lerp(wantEye,k);look.lerp(wantLook,k);camera.position.copy(eyePos);camera.lookAt(look);camera.updateMatrixWorld();
}
function reflect(){
 mirror.copy(camera);mirror.position.y=.056-camera.position.y;camera.getWorldDirection(direction);direction.y*=-1;
 mirror.up.set(0,1,0);mirror.lookAt(mirror.position.clone().add(direction));mirror.updateMatrixWorld();
 mirrorMatrix.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);
 const saved=hiddenOnMirror.map(o=>o.visible);hiddenOnMirror.forEach(o=>o.visible=false);
 renderer.clippingPlanes=[clip];renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(mirrorRT);renderer.render(scene,mirror);
 renderer.clippingPlanes=[];hiddenOnMirror.forEach((o,i)=>o.visible=saved[i]);renderer.shadowMap.autoUpdate=true;
}
function guideDrawing(){const c=hint.getContext('2d');c.scale(2,2);c.lineJoin='round';c.lineCap='round';c.lineWidth=1.6;c.strokeStyle='#836f4f';c.fillStyle='#fff7df';
 c.beginPath();c.moveTo(14,31);c.lineTo(5,15);c.bezierCurveTo(2,9,7,6,10,11);c.lineTo(19,24);
 c.lineTo(17.5,19);c.bezierCurveTo(17,16,20.8,15.2,22,18);c.lineTo(24,21);c.bezierCurveTo(22,15.7,26,15.5,28,19);
 c.lineTo(30,22);c.bezierCurveTo(29,18.5,32.5,18,34.5,21.5);c.bezierCurveTo(41,31,40.2,36,35.9,41);c.lineTo(28.5,47);
 c.bezierCurveTo(25,49,20.5,46,18,44);c.lineTo(6,34);c.bezierCurveTo(1.6,30,5,26.5,9,29);c.lineTo(15,33);c.closePath();c.fill();c.stroke()}
guideDrawing();
function screen(v){return v.clone().project(camera)}
const travel=['arcade','shoeDoor','paperDoor','plaza'];
function nearbyFocus(){const point=world.focus(s);
 if(travel.includes(s.stage)){const delta=point.clone().sub(V(s.x,.07,s.z)),d=delta.length();if(d>2.9)point.copy(V(s.x,.07,s.z)).add(delta.multiplyScalar(2.9/d))}
 return point}
function showHint(){let visible=!!(travel.includes(s.stage)||['umbrella','shoe','soles','paper','sluice','prism','rainbow','bells','winder'].includes(s.stage));
 if(!visible||pointer!==null||s.idle<4){hint.style.opacity='0';return}
 const a=(s.idle-4)%4.25,t=Math.min(1,a/.78),q=(1-Math.cos(t*Math.PI))*.5;
 const proj=screen(nearbyFocus());if(proj.z<0||proj.z>1||Math.abs(proj.x)>1||Math.abs(proj.y)>1){hint.style.opacity='0';return}
 const swipe=travel.includes(s.stage)||s.stage==='paper',drag=swipe?Math.max(0,Math.min(1,(a-1.25)/.93)):0;
 const x=(proj.x*.5+.5)*w+(1-q)*19-(s.stage==='paper'?drag*37:0),y=(-proj.y*.5+.5)*h+(1-q)*21-(swipe?drag*16:0);
 hint.style.transform='translate('+Math.round(x-5)+'px,'+Math.round(y-10)+'px) scale('+(.94+.06*(1-q))+')';
 hint.style.opacity=String(Math.max(0,Math.min(.82,a*2.7,(2.86-a)*2)))}
function pointerRay(x,y){ndc.set(x/w*2-1,1-y/h*2);ray.setFromCamera(ndc,camera)}
function groundPoint(){const pt=V(0,0,0);if(!ray.ray.intersectPlane(floor,pt)||Math.abs(pt.x)>2.88||pt.z<-31||pt.z>6)return null;return [Math.max(-2.25,Math.min(2.25,pt.x)),pt.z]}
function nearPixel(pos,x,y,r){const p=screen(pos);return p.z>0&&p.z<1&&Math.hypot(x-(p.x*.5+.5)*w,y-(.5-p.y*.5)*h)<r}
function hit(o,pad=0){const b=new T.Box3().setFromObject(o);b.expandByScalar(pad);return ray.ray.intersectsBox(b)}
function interact(x,y){
 pointerRay(x,y);const radius=Math.min(53,Math.max(32,w*.049));
 if(s.stage==='umbrella'&&(hit(world.umbrella,.17)||nearPixel(world.focus(s),x,y,radius)))return game.press('umbrella');
 if(s.stage==='arcade'){const impacts=ray.intersectObjects(world.fabric,false);if(impacts.length)return game.press('rib'+impacts[0].object.userData.rib)}
 if(s.stage==='shoe'&&(hit(world.targets.boot,.16)||nearPixel(world.focus(s),x,y,radius)))return game.press('boot');
 if(s.stage==='soles'){let found=-1,min=Infinity;world.blocks.forEach((b,i)=>{const p=screen(b.localToWorld(V(0,.15,0)));
 const d=Math.hypot(x-(p.x*.5+.5)*w,y-(.5-p.y*.5)*h);if((hit(b,.09)||d<radius)&&d<min){found=i;min=d}});
 if(found>=0)return game.press('sole'+found)}
 if(s.stage==='paper'&&hit(world.book,.14))return game.press('page');
 if(s.stage==='sluice'&&(hit(world.gate,.23)||nearPixel(world.focus(s),x,y,radius)))return game.press('gate');
 if(s.stage==='prism'&&(hit(world.prism,.19)||nearPixel(world.focus(s),x,y,radius)))return game.press('prism');
 if(s.stage==='bells'){let best=-1,dist=Infinity;for(let i=0;i<3;i++){const p=world.targets['bell'+i].localToWorld(V(0,-.31,0)),q=screen(p);
 const d=Math.hypot(x-(q.x*.5+.5)*w,y-(.5-q.y*.5)*h);if(d<dist&&(hit(world.targets['bell'+i],.075)||d<radius*.89)){dist=d;best=i}}
 if(best>=0)return game.press('bell'+best)}
 if(s.stage==='winder'&&(hit(world.targets.key,.12)||nearPixel(world.focus(s),x,y,radius)))return game.press('key');
 if(s.stage==='rainbow'&&hit(world.prism,.28))return game.press('home');
 if(travel.includes(s.stage)||s.stage==='return'){
 if(s.stage==='shoeDoor'&&hit(world.shopSigns[0],.13))return game.press('shoeDoor');
 if(s.stage==='paperDoor'&&hit(world.shopSigns[1],.13))return game.press('paperDoor');
 if(s.stage==='arcade'&&nearPixel(V(0,5,-2.65),x,y,radius*1.18))return game.press('arcade');
 if(s.stage==='plaza'&&hit(world.prism,.23))return game.press('plaza');
 const p=s.stage==='return'?RainWalk.path.home:RainWalk.path[s.stage];
 if(nearPixel(V(p[0],.26,p[1]),x,y,radius*.85))return game.press(s.stage==='return'?'home':s.stage);
 const point=groundPoint();if(point){onGround=true;return game.press('walk',point)}
 }
 for(let i=0;i<world.shopSigns.length;i++){if(hit(world.shopSigns[i],.035)){game.nudge(i);break}}
 return false
}
canvas.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();sound.wake();pointer=e.pointerId;
 canvas.setPointerCapture(pointer);pointerX=e.clientX;pointerY=e.clientY;s.idle=0;onGround=false;startX=pointerX;startY=pointerY;
 const before=s.stage;gesture=interact(pointerX,pointerY)?before:null});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;
 const travel=Math.hypot(e.clientX-pointerX,e.clientY-pointerY);pointerX=e.clientX;pointerY=e.clientY;
 if(gesture==='paper'&&Math.abs(pointerX-startX)>7)game.dragPage(Math.abs(pointerX-startX)/Math.min(180,w*.32));
 if(gesture==='sluice'&&Math.abs(pointerY-startY)>8)game.liftGate(.63+(startY-pointerY)/130);
 if(gesture==='winder'&&travel>1)game.windKey(travel)});
function release(e){if(e.pointerId!==pointer)return;pointer=null;onGround=false;gesture=null;s.idle=0;game.release()}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pointer=null;onGround=false;game.release()}});
function draw(dt){
 world.update(s);view(dt);
 for(let i=0;i<s.cells.length;i++){const c=s.cells[i],a=wetGrid.image.data;a[i*4]=Math.round(255*(1-Math.exp(-c.water*.67)));a[i*4+1]=Math.max(0,Math.min(255,75+c.wave*4800));a[i*4+2]=0;a[i*4+3]=255}wetGrid.needsUpdate=true;
 sun.intensity=2.1+(1-s.rain)*1.15;scene.fog.density=.021+.006*s.rain;sinceMirror+=dt;
 if(sinceMirror>.09){reflect();sinceMirror=0}
 renderer.setRenderTarget(frameRT);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);showHint()
}
let last=0;function frame(now){requestAnimationFrame(frame);if(document.hidden){last=0;return}
 const dt=last?Math.min(.075,(now-last)/1000):1/60;last=now;
 if(onGround&&pointer!==null){pointerRay(pointerX,pointerY);const p=groundPoint();if(p)game.move(p);else game.release()}
 game.step(dt);sound.update(s,game.takeEvents());draw(dt)}
window.__GAME__={step:dt=>game.step(dt),getState:()=>game.getState()};requestAnimationFrame(frame)
})();
