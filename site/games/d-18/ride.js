(() => {
'use strict';
const T=THREE, R=CoastRide, sim=R.create(), S=sim.state;
const canvas=document.querySelector('#world');
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new T.Scene(),cam=new T.PerspectiveCamera(48,1,.08,920);
scene.fog=new T.FogExp2(0xc1d4cf,.0036);
const skyLight=new T.HemisphereLight(0xd9ecff,0x9e8463,1.48);scene.add(skyLight);
const sun=new T.DirectionalLight(0xffe5b4,2.75);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-31,right:31,top:31,bottom:-31,near:1,far:170});sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias=.026;sun.shadow.bias=-.00028;scene.add(sun,sun.target);
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), vec=a=>V(...a), rand=R.rngFactory(10029);
const texture=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');fn(x,w,h);const tx=new T.CanvasTexture(c);tx.wrapS=tx.wrapT=T.RepeatWrapping;return tx;};
const rough=texture(64,64,(c,w,h)=>{const d=c.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){const n=224+rand()*30;d.data.set([n,n,n,255],i);}c.putImageData(d,0,0);});
const woodgrain=texture(128,256,(c,w,h)=>{c.fillStyle='#f3ead8';c.fillRect(0,0,w,h);
  for(let i=0;i<1250;i++){const a=rand(),x=rand()*w,y=rand()*h;c.strokeStyle='rgba(81,49,29,'+(.018+a*.11)+')';c.lineWidth=.22+rand()*1.3;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-1,y+9,x+1,y+20,x+rand()*1.2,y+10+rand()*74);c.stroke();}
  for(let i=0;i<9;i++){const x=rand()*w,y=rand()*h;for(let j=1;j<5;j++){c.strokeStyle='rgba(99,66,44,.10)';c.lineWidth=.65;c.beginPath();c.ellipse(x,y,j*.6,j*2.6,.03,0,Math.PI*2);c.stroke();}}});
woodgrain.colorSpace=T.SRGBColorSpace;woodgrain.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const mat=(color,r=.55,m=0,extra={})=>new T.MeshStandardMaterial({color,roughness:r,metalness:m,roughnessMap:rough,...extra});
const wood=(color)=>mat(color,.78,0,{map:woodgrain});
const env=texture(512,256,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);[[0,'#377aa9'],[.34,'#acd7ee'],[.48,'#ffedc5'],[.52,'#4f9697'],[.64,'#5f7969'],[1,'#6d5140']].forEach(e=>g.addColorStop(...e));c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#fff9df';c.fillRect(355,73,23,35);c.fillStyle='#d7edf1';c.fillRect(90,82,72,8);});
env.mapping=T.EquirectangularReflectionMapping;env.colorSpace=T.SRGBColorSpace;scene.environment=env;scene.environmentIntensity=.42;
const cube=new T.BoxGeometry(),ball=new T.SphereGeometry(1,24,16),rod=new T.CylinderGeometry(1,1,1,10);
function mesh(geo,material,parent=scene){const m=new T.Mesh(geo,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function group(parent=scene){const g=new T.Group();parent.add(g);return g;}
function obj(geo,material,p,scale,parent=scene){const m=mesh(geo,material,parent);m.position.copy(p);m.scale.copy(scale);return m;}
function sphere(parent,m,x,y,z,a,b,c){return obj(ball,m,V(x,y,z),V(a,b,c),parent);}
function box(parent,m,x,y,z,a,b,c){return obj(cube,m,V(x,y,z),V(a,b,c),parent);}
function bar(parent,m,a,b,r,w,geo=rod){const d=b.clone().sub(a);const n=obj(geo,m,a.clone().lerp(b,.5),V(r,d.length(),w??r),parent);n.quaternion.setFromUnitVectors(up,d.normalize());return n;}
const up=V(0,1,0), dummy=new T.Object3D();
function batch(parent=scene){
  const collections=new Map();let built=false;
  function add(geo,material,p,scale,rot=null,color=null){
    const key=geo.uuid+material.uuid;let arr=collections.get(key);if(!arr){arr={geo,material,items:[]};collections.set(key,arr);}
    dummy.position.copy(p);dummy.scale.copy(scale);dummy.quaternion.identity();if(rot){if(rot.isQuaternion)dummy.quaternion.copy(rot);else dummy.rotation.set(...rot);}
    dummy.updateMatrix();const item={matrix:dummy.matrix.clone(),color,index:arr.items.length,arr};arr.items.push(item);return item;
  }
  function beam(a,b,x,z,material,geo=cube){
    const d=b.clone().sub(a);return add(geo,material,a.clone().lerp(b,.5),V(x,d.length(),z),new T.Quaternion().setFromUnitVectors(up,d.normalize()));
  }
  function finish(){
    if(built)return;built=true;
    collections.forEach(a=>{const inst=new T.InstancedMesh(a.geo,a.material,a.items.length);a.mesh=inst;
      a.items.forEach((o,i)=>{inst.setMatrixAt(i,o.matrix);if(o.color)inst.setColorAt(i,o.color);});
      inst.castShadow=inst.receiveShadow=true;inst.computeBoundingSphere();parent.add(inst);});
  }
  return {add,beam,finish,collections};
}
const ctx={T,R,S,sim,scene,cam,renderer,sun,skyLight,V,vec,rand,rough,texture,woodgrain,mat,wood,mesh,group,obj,box,sphere,bar,cube,ball,rod,batch,up};
const park=buildPark(ctx),train=buildTrain(ctx);
const drive=document.querySelector('#drive'),sound=document.querySelector('#sound'),guide=document.querySelector('#guide'),seals=[...document.querySelectorAll('.seal')];
const ray=new T.Raycaster(),pointer=new T.Vector2();let finger=null,audio=null,muted=false;
function setupAudio(){
 if(audio){if(audio.ac.state==='suspended')audio.ac.resume().catch(()=>{});return;}
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 const ac=new AC(),master=ac.createGain();master.gain.value=muted?0:.22;master.connect(ac.destination);
 const noise=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate),data=noise.getChannelData(0);let smooth=0;
 for(let i=0;i<data.length;i++){smooth=(smooth+(rand()-.5)*.075)/1.025;data[i]=smooth*3.2;}
 const src=ac.createBufferSource();src.buffer=noise;src.loop=true;
 const filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=550;
 const gain=ac.createGain();gain.gain.value=.09;src.connect(filter).connect(gain).connect(master);src.start();
 function chime(f,d,g,type='sine',when=0){const o=ac.createOscillator(),v=ac.createGain(),t=ac.currentTime+when;o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.94,t+d);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(g,t+.008);v.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(v).connect(master);o.start(t);o.stop(t+d+.01);}
 audio={ac,master,gain,filter,chime,link:0,stage:S.stage,mode:S.mode,splash:0};
}
function begin(e){
 if(finger!==null||S.mode==='arrived')return;
 finger=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);setupAudio();sim.press(true);e.preventDefault();
}
drive.addEventListener('pointerdown',begin);
canvas.addEventListener('pointerdown',e=>{pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,cam);if(ray.intersectObjects(train.targets,true).length)begin(e);});
function end(e){if(finger===e.pointerId){finger=null;sim.press(false);}}
for(const el of [canvas,drive])for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,end);
window.addEventListener('blur',()=>{finger=null;sim.press(false);});
sound.addEventListener('click',()=>{setupAudio();muted=!muted;sound.classList.toggle('mute',muted);sound.setAttribute('aria-pressed',String(!muted));if(audio)audio.master.gain.setTargetAtTime(muted?0:.22,audio.ac.currentTime,.06);});
drive.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();setupAudio();sim.press(true);}});
drive.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key))sim.press(false);});
function camera(){
 const p=vec(sim.pos(S.s)),a=vec(sim.pos(S.s+1.7)),d=a.sub(p).normalize(),forward=V(d.x,0,d.z).normalize(),right=V(-forward.z,0,forward.x);
 const narrow=R.smooth((1.25-cam.aspect)/.82),view=S.view;
 const throat=R.smooth((S.s-R.at(14.4))/9)*R.smooth((R.at(17.2)-S.s)/8);
 const z=6.65+narrow*3.4+view*1.6, x=(3.12*(1-narrow)-1.05*narrow)*(1-throat);
 const eye=p.clone().addScaledVector(forward,-z).addScaledVector(right,x);
 eye.y+=3.38+narrow*.48+view*1.55;
 if(throat>0){const bridgeEye=vec(sim.pos(S.s-z));bridgeEye.y+=2.85;eye.lerp(bridgeEye,throat);}
 const sight=p.clone().addScaledVector(forward,10).addScaledVector(right,-.48+narrow*2.13);
 sight.y+=1.72+view*.4+d.y*6;
 cam.position.copy(eye);cam.up.set(0,1,0);cam.lookAt(sight);cam.updateMatrixWorld();
 sun.target.position.copy(p);sun.position.copy(p).add(V(-44,36-14*S.sunset,23));
}
// Render linear radiance first. Only its brightest highlights feed the small bloom buffer.
const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:Math.min(2,renderer.capabilities.maxSamples)});
const glow=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
const quadCam=new T.OrthographicCamera(-1,1,1,-1,0,1),screen=new T.Scene();
const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const bright=new T.ShaderMaterial({vertexShader,depthTest:false,depthWrite:false,uniforms:{src:{value:target.texture},pixel:{value:new T.Vector2()}},fragmentShader:`
uniform sampler2D src;uniform vec2 pixel;varying vec2 vUv;
void main(){vec3 a=vec3(0.);for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){
vec3 c=texture2D(src,vUv+vec2(float(i),float(j))*pixel).rgb;
a+=c*smoothstep(1.08,2.6,max(max(c.r,c.g),c.b));}gl_FragColor=vec4(a/9.,1.);}`});
const finish=new T.ShaderMaterial({vertexShader,depthTest:false,depthWrite:false,uniforms:{src:{value:target.texture},bloom:{value:glow.texture},pixel:{value:new T.Vector2()}},fragmentShader:`
uniform sampler2D src,bloom;uniform vec2 pixel;varying vec2 vUv;
void main(){vec3 c=texture2D(src,vUv).rgb;vec3 halo=vec3(0.);
for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){float w=(i==0?2.:1.)*(j==0?2.:1.);
halo+=texture2D(bloom,vUv+vec2(float(i),float(j))*pixel*1.6).rgb*w;}
gl_FragColor=vec4(c+.047*halo/16.,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
gl_FragColor.rgb+=grain/290.;
}`});
const quad=new T.Mesh(new T.PlaneGeometry(2,2),bright);quad.frustumCulled=false;screen.add(quad);
function draw(){
 renderer.setRenderTarget(target);renderer.render(scene,cam);
 quad.material=bright;renderer.setRenderTarget(glow);renderer.render(screen,quadCam);
 quad.material=finish;renderer.setRenderTarget(null);renderer.render(screen,quadCam);
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();camera();
 const size=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(size.x,size.y);glow.setSize(Math.max(1,size.x>>2),Math.max(1,size.y>>2));
 bright.uniforms.pixel.value.set(1.6/size.x,1.6/size.y);finish.uniforms.pixel.value.set(1/glow.width,1/glow.height);
}
window.addEventListener('resize',resize);resize();
function feedback(){
 document.documentElement.style.setProperty('--press',S.button.toFixed(3));
 seals.forEach((e,i)=>{e.classList.toggle('on',i===S.stage);e.classList.toggle('past',i<S.stage);});
 const prompts=['lift','forkLift','lastLift','summit','release'];
 const stuck=S.held&&(S.mode==='release'||(S.mode==='summit'&&S.liftRate===0));
 const hint=prompts.includes(S.mode)&&(S.idle>4||stuck),phase=(stuck?S.time:S.idle-4)%3.8;
 const reach=R.smooth(phase/.8)*(1-R.smooth((phase-2.1)/.86));
 guide.style.opacity=hint?String(reach*.96):'0';
 guide.style.transform='translate('+(-17*reach)+'px,'+((stuck?-43:-19)*reach)+'px) rotate('+(-11+reach*6)+'deg)';
 if(!audio)return;const a=audio,t=a.ac.currentTime;
 a.gain.gain.setTargetAtTime(.08+Math.abs(S.v)*.037,t,.15);a.filter.frequency.setTargetAtTime(440+Math.abs(S.v)*93,t,.2);
 if(S.chain-a.link>.28){a.link=S.chain;a.chime(140+rand()*60,.062,.085,'triangle');}
 if(S.stage!==a.stage || S.mode==='summit'&&a.mode!=='summit'||S.mode==='arrived'&&a.mode!=='arrived'){
  [523.25,659.25,783.99].forEach((f,i)=>a.chime(f,.75,.10,'sine',i*.14));}
 if(S.waveCount-a.splash>9){a.splash=S.waveCount;a.chime(720+rand()*280,.13,.026);}
 a.stage=S.stage;a.mode=S.mode;
}
window.__GAME__={step(dt){sim.step(dt);},getState:sim.getState};
let reflection=null,reflectionEvening=false;
function sampleParkReflection(){
 const evening=S.sunset>.68;
 if(reflection&&(reflectionEvening===evening || !evening&&S.sunset>.12))return;
 const previous=reflection,baker=new T.PMREMGenerator(renderer),shadows=renderer.shadowMap.autoUpdate;
 renderer.shadowMap.autoUpdate=false;
 reflection=baker.fromScene(scene,.015,.5,900,{size:128,position:V(13,9,-43)});
 renderer.shadowMap.autoUpdate=shadows;scene.environment=reflection.texture;scene.environmentIntensity=.56;
 reflectionEvening=evening;baker.dispose();if(previous)previous.dispose();
}
let last=0;
function frame(now){const dt=last?Math.min(.08,(now-last)/1000):0;last=now;sim.step(dt);park.update();train.update();camera();sampleParkReflection();feedback();draw();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
})();
