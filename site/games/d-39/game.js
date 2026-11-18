'use strict';
(()=>{
const {T,TAU,V,mat,group,obj,box,ball}=Art,S=RainLane,game=S.createGame(),s=game.world;
window.__GAME__={step:game.step,getState:game.getState};
const canvas=document.querySelector('#lane'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new T.Scene();scene.background=new T.Color(0xc3d1c7);scene.fog=new T.FogExp2(0xc5d0c4,.042);
const camera=new T.PerspectiveCamera(32,1,.055,100),mirror=new T.PerspectiveCamera();
const environment=new T.HemisphereLight(0xdeeff7,0xae9475,1.45);scene.add(environment);
const sun=new T.DirectionalLight(0xffe1b7,2.63);sun.position.set(-6.3,9.4,-4.6);sun.target.position.set(0,0,-2.7);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:10,bottom:-8,near:.1,far:30});sun.shadow.normalBias=.012;sun.shadow.bias=-.00019;sun.shadow.radius=3.6;scene.add(sun,sun.target);
const duskU={value:0},cloudU={value:.9};
const skyMat=mat(0xf1eee1,1,0,{side:T.BackSide,depthWrite:false,fog:false});
skyMat.onBeforeCompile=sh=>{
  sh.uniforms.duskMix=duskU;sh.uniforms.brightness=cloudU;
  sh.vertexShader='varying vec3 skyRay;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nskyRay=position;');
  sh.fragmentShader='varying vec3 skyRay; uniform float duskMix; uniform float brightness;\n'+sh.fragmentShader.replace('void main() {',`
    float hn(vec2 p){return fract(sin(dot(p,vec2(21.63,76.11)))*41785.33);}
    float ns(vec2 p){vec2 a=floor(p),b=fract(p);b=b*b*(3.-2.*b);return mix(mix(hn(a),hn(a+vec2(1,0)),b.x),mix(hn(a+vec2(0,1)),hn(a+1.),b.x),b.y);}
    void main() {`).replace('#include <opaque_fragment>',`
    vec3 dir=normalize(skyRay);float up=max(0.,dir.y);
    vec2 st=dir.xz/(max(dir.y,0.)+.17)*1.7;
    float n=ns(st)*.48+ns(st*2.1+3.)*.29+ns(st*4.3)*.15+ns(st*8.1)*.08;
    vec3 sky=mix(vec3(.84,.91,.86),vec3(.35,.56,.65),sqrt(up));
    vec3 cloud=mix(vec3(.61,.68,.69),vec3(1.29,1.22,1.04),n);
    sky=mix(sky,cloud,smoothstep(.27,.66,n)*.89);
    vec3 sunset=mix(vec3(1.55,.79,.43),vec3(.47,.51,.65),sqrt(up));
    outgoingLight=mix(sky,sunset*(.76+.4*n),duskMix)*brightness;
    #include <opaque_fragment>`);
};
const sky=obj(scene,new T.SphereGeometry(72,36,18),skyMat);sky.castShadow=sky.receiveShadow=false;sky.renderOrder=-10;
const street=makeStreet(scene);
const boots=s.boots.map((b,i)=>{const g=Art.batch(Art.boot(scene));g.position.set(b.x,b.y,b.z);g.rotation.y=i?1.32:1.47;return g;});
const bootWater=boots.map(g=>{const w=obj(g,new T.CylinderGeometry(1,1,.008,32),mat(0x786b54,.12,.29),0,.558,-.096);w.scale.set(.166,1,.201);w.visible=false;return w;});
const boat=Art.batch(Art.boat(scene));boat.position.set(s.boat.x,.031,s.boat.z);boat.scale.setScalar(.72);
const foliage=s.leaves.map((l,i)=>{const g=Art.batch(Art.leaf(scene,i));g.scale.setScalar(l.size);return g;});
// A single cubemap captures this street's actual masonry, trees, rubber and sky for PBR highlights.
const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromScene(scene,0,.06,90,{size:128,position:V(.12,.79,-1.12)});
scene.environment=env.texture;scene.environmentIntensity=.62;pmrem.dispose();
const half=renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType;
const refl=new T.WebGLRenderTarget(640,480,{type:half,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
const vp=new T.Matrix4(),reflection={value:refl.texture},mirrorVP={value:vp},waterGroup=group(scene);
const waterY=.023, wetEdge=mat(0x52615b,.26,.18,{map:Art.rock});
function patchGeometry(p,pi,scale=1,rings=18,segments=90){
  const pos=[],uv=[],idx=[];
  for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
    const a=i/segments*TAU,r=S.edge(pi,a)*j/rings*scale;
    pos.push(p.x+p.rx*r*Math.cos(a),0,p.z+p.rz*r*Math.sin(a));uv.push(i/segments,j/rings);
    const k=j*(segments+1)+i;if(i<segments&&j<rings)idx.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
const windU={value:0};
function waterMat(distant=false){
  const m=mat(distant?0x71847a:0x4c6c62,.115,.30,{envMapIntensity:.72,side:T.DoubleSide});
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,{mirrorVP,reflection,windValue:windU});
    sh.vertexShader='uniform mat4 mirrorVP; varying vec4 reflectionPos; varying vec3 wetWorld; varying float shore;\n'+sh.vertexShader.replace('#include <project_vertex>',`
      #include <project_vertex>
      wetWorld=(modelMatrix*vec4(transformed,1.)).xyz;
      reflectionPos=mirrorVP*vec4(wetWorld,1.);shore=uv.y;`);
    sh.fragmentShader='uniform sampler2D reflection; uniform float windValue; varying vec4 reflectionPos; varying vec3 wetWorld; varying float shore;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 c=reflectionPos.xy/reflectionPos.w*.5+.5;
      float capillary=sin(wetWorld.x*33.+wetWorld.z*17.+sin(wetWorld.z*7.)+windValue*.65);
      float rip=sin(wetWorld.z*67.+sin(wetWorld.x*13.)*2.)*.00052+capillary*.00077;
      vec2 slope=vec2(dFdx(wetWorld.y),dFdy(wetWorld.y))*1.1;
      c=clamp(c+vec2(rip,rip*.67)+clamp(slope,vec2(-.026),vec2(.026)),.002,.998);
      vec3 reflected=texture2D(reflection,c).rgb;float edgeFade=smoothstep(.89,1.,shore);
      float facing=1.-abs(normalize(cameraPosition-wetWorld).y);
      float reflectance=.40+.43*facing-edgeFade*.16;
      outgoingLight=mix(outgoingLight*vec3(.57,.80,.78),reflected*vec3(.89,.97,.91),reflectance);
      outgoingLight+=vec3(.029,.037,.030)*smoothstep(.96,1.,shore);
      #include <opaque_fragment>`);
  };return m;
}
const water=waterMat(),farWater=waterMat(true);
const inlet=new T.CatmullRomCurve3([V(.74,0,-.78),V(1.07,0,-1.02),V(1.38,0,-1.44),V(1.63,0,-1.85),V(1.76,0,-2.18)]);
function inletBed(width,y,m){
  const vertices=[],uv=[],indices=[];
  for(let i=0;i<=40;i++){const f=i/40,p=inlet.getPoint(f),t=inlet.getTangent(f),r=width*(.86+.16*Math.sin(f*17)+.08*Math.cos(f*31));
    for(const side of [-1,1]){vertices.push(p.x+side*t.z*r,y,p.z-side*t.x*r);uv.push(f,.76);}
    if(i<40){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();obj(waterGroup,g,m).castShadow=false;
}
inletBed(.23,.0055,wetEdge);inletBed(.167,.0185,water);
const mainPools=[];
for(let i=0;i<S.patches.length;i++){
  const p=S.patches[i];
  obj(waterGroup,patchGeometry(p,i,1.055,4),wetEdge,0,.004,0).castShadow=false;
  const w=obj(waterGroup,patchGeometry(p,i),water,0,waterY,0);w.castShadow=false;mainPools.push(w);
}
for(const [x,z,rx,rz] of [[-.76,-4.16,.91,.71],[-1.90,-6.35,.53,1.46],[.44,-7.18,1.14,.62],[-.38,-10.49,1.53,1.13],[1.05,-13.63,.88,1.59],[-.29,-17.40,1.54,.81],[-2.03,.65,.32,.60]]){
  const w=obj(waterGroup,patchGeometry({x,z,rx,rz},1,1,5,60),farWater,0,.010,0);w.castShadow=false;
}
function shadowDisc(){
  const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d'),grad=g.createRadialGradient(48,48,3,48,48,48);
  grad.addColorStop(0,'rgba(31,35,25,.64)');grad.addColorStop(.34,'rgba(31,35,25,.49)');grad.addColorStop(.72,'rgba(31,35,25,.16)');grad.addColorStop(1,'rgba(31,35,25,0)');g.fillStyle=grad;g.fillRect(0,0,96,96);
  return new T.CanvasTexture(c);
}
const contact=shadowDisc();
const shadows=s.boots.map(()=>{const o=obj(scene,new T.PlaneGeometry(.91,1.43),mat(0x766c5a,1,0,{map:contact,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));o.rotation.x=-Math.PI/2;o.castShadow=false;return o;});
// Crests are clipped at each irregular bank. Only the skyward side catches the low light.
const ringCount=42,ringN=88,ringGeo=new T.BufferGeometry(),rp=new Float32Array(ringCount*ringN*6*3),rc=new Float32Array(rp.length);
ringGeo.setAttribute('position',new T.BufferAttribute(rp,3).setUsage(T.DynamicDrawUsage));ringGeo.setAttribute('color',new T.BufferAttribute(rc,3).setUsage(T.DynamicDrawUsage));
const ringNormals=new Float32Array(rp.length);for(let i=1;i<ringNormals.length;i+=3)ringNormals[i]=1;ringGeo.setAttribute('normal',new T.BufferAttribute(ringNormals,3));
const ringMaterial=mat(0xffffff,.22,.22,{vertexColors:true,side:T.DoubleSide,transparent:true,opacity:.62,depthWrite:false});
const rings=obj(waterGroup,ringGeo,ringMaterial);rings.castShadow=false;rings.frustumCulled=false;
const dripMat=mat(0xb7d3ca,.10,.33,{envMapIntensity:1.3});
const dropMesh=new T.InstancedMesh(new T.SphereGeometry(1,8,6),dripMat,160);scene.add(dropMesh);dropMesh.frustumCulled=false;
const rainMesh=new T.InstancedMesh(new T.CylinderGeometry(.0035,.004,.15,4),mat(0xbdcfc9,.24,.14,{transparent:true,opacity:.56}),160);scene.add(rainMesh);rainMesh.frustumCulled=false;
const stream=box(scene,2.63,.80,-3.82,.041,1,.052,dripMat);stream.rotation.z=-.064;
const cursorBead=ball(scene,0,0,0,.024,.018,.024,mat(0xffdda1,.32,.1,{emissive:0xfacb81,emissiveIntensity:.41}));cursorBead.castShadow=false;
const pollen=new T.InstancedMesh(new T.SphereGeometry(1,5,4),mat(0xe3d8ac,.65,0,{emissive:0x9f8c61,emissiveIntensity:.12}),s.motes.length);scene.add(pollen);pollen.frustumCulled=false;
const dummy=new T.Object3D();
const pixScene=new T.Scene(),flatCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
const frame=new T.WebGLRenderTarget(1,1,{type:half,samples:Math.min(2,renderer.capabilities.maxSamples)});
const glowTarget=new T.WebGLRenderTarget(1,1,{type:half,depthBuffer:false});
const vert='varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const glowMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:frame.texture},dx:{value:new T.Vector2()}},vertexShader:vert,fragmentShader:`
varying vec2 vUv;uniform sampler2D picture;uniform vec2 dx;
void main(){vec3 col=vec3(0.);for(int i=-3;i<=3;i++){vec3 c=texture2D(picture,vUv+dx*float(i)*2.).rgb;
col+=max(vec3(0.),c-.91)*(.23-.039*abs(float(i)));}gl_FragColor=vec4(col,1.);}`});
const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:frame.texture},glow:{value:glowTarget.texture},dy:{value:new T.Vector2()}},vertexShader:vert,fragmentShader:`
varying vec2 vUv;uniform sampler2D picture;uniform sampler2D glow;uniform vec2 dy;
void main(){vec3 c=texture2D(picture,vUv).rgb;vec3 b=vec3(0.);
for(int i=-3;i<=3;i++)b+=texture2D(glow,vUv+dy*float(i)).rgb*(.23-.039*abs(float(i)));
c+=b*.095;float g=fract(sin(dot(gl_FragCoord.xy,vec2(17.13,49.89)))*43758.545);
gl_FragColor=vec4(c+(g-.5)*.005,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
const quad=new T.Mesh(new T.PlaneGeometry(2,2),finish);pixScene.add(quad);
let W=0,H=0,frames=0,aspect=1;
function size(){
  W=canvas.clientWidth;H=canvas.clientHeight;aspect=W/H;const dpr=Math.min(devicePixelRatio||1,1.65,Math.sqrt(2500000/(W*H)));
  renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);camera.aspect=aspect;camera.updateProjectionMatrix();
  frame.setSize(Math.round(W*dpr),Math.round(H*dpr));glowTarget.setSize(Math.max(1,W>>2),Math.max(1,H>>2));
  glowMat.uniforms.dx.value.set(1/W,0);finish.uniforms.dy.value.set(0,3.4/H);
  const k=Math.min(1,800/Math.max(W,H));refl.setSize(Math.round(W*k),Math.round(H*k));frames=0;
}
window.addEventListener('resize',size);size();
const look=V(0,0,0),desired=V(0,0,0),eye=V(0,0,0),gaze=V(0,0,0),vel=V(0,0,0),gazeV=V(0,0,0);
const views=[
  [[-.16,.69,-.24],[.95,2.15,4.38],[-.24,.73,-.10],[-2.08,3.3,7.46]],
  [[.91,.65,-1.68],[.06,2.60,3.13],[1.14,.66,-1.50],[-1.34,3.16,5.71]],
  [[1.64,1.00,-3.8],[-.61,2.79,2.31],[2.02,1.19,-3.75],[-1.69,3.83,3.55]],
  [[2.55,1.04,-4.77],[-.09,2.16,.30],[2.91,1.12,-4.85],[-1.15,2.86,1.64]]
];
function cameraStep(dt,init){
  const portrait=Math.max(0,Math.min(1,(1.22-aspect)/.76)),v=views[s.phase];
  gaze.fromArray(v[0]).lerp(V(...v[2]),portrait);desired.fromArray(v[1]).lerp(V(...v[3]),portrait);
  // Preserve the horizontal field on especially narrow displays.
  if(aspect<.46)desired.sub(gaze).multiplyScalar(.46/aspect).add(gaze);
  if(init){look.copy(gaze);eye.copy(desired);}else{
    const step=dt/3;for(let i=0;i<3;i++){vel.addScaledVector(desired.clone().sub(eye).multiplyScalar(4.2).addScaledVector(vel,-4.2),step);eye.addScaledVector(vel,step);
      gazeV.addScaledVector(gaze.clone().sub(look).multiplyScalar(5).addScaledVector(gazeV,-4.6),step);look.addScaledVector(gazeV,step);}
  }
  camera.position.copy(eye);camera.lookAt(look);camera.updateMatrixWorld();
}
cameraStep(0,true);
const hints=document.querySelector('#hand'),chap=document.querySelectorAll('#chapter i'),weather=document.querySelector('#weather');
const icons=[
  '<circle cx="17" cy="9" r="4" fill="#edca88" stroke="none"/><path d="M4 19a4 4 0 0 1 2-7.5 6 6 0 0 1 11.3-.6A4.1 4.1 0 1 1 19 19Z"/>',
  '<path d="M14 3c-1 5-7 10-7 14a7 7 0 0 0 14 0c0-4-6-9-7-14Z"/><path d="M10.5 17a3.4 3.4 0 0 0 3.5 3"/>',
  '<path d="M4 15a4 4 0 0 1 2-7 6 6 0 0 1 11.3-.5 4.1 4.1 0 1 1 2 7.5Z"/><path d="m8 19-2 4m9-4-2 4m9-4-2 4"/>',
  '<path d="M4 19h20M7 23h14M8 17a6 6 0 0 1 12 0M14 4v3M3 12l3 1m19-1-3 1M6 6l2 2m14-2-2 2"/>'
];let shown=-1;
function project(x,y,z){const p=V(x,y,z).project(camera);return {x:(p.x*.5+.5)*W,y:(.5-p.y*.5)*H};}
function updateHint(){
  if(shown!==s.phase){shown=s.phase;weather.innerHTML=icons[s.phase];chap.forEach((e,i)=>e.classList.toggle('on',i<=s.phase));}
  if(s.hint<=0){hints.style.opacity=0;return;}
  const b=s.boots[s.active],t=game.target(),p=project(b.x,b.y+.79,b.z),q=project(t[0],s.phase>=2?.18:.05,t[1]);
  const f=Math.max(0,Math.min(1,(s.hint-.46)/1.54)),a=f*f*(3-2*f);
  hints.style.opacity=Math.max(0,Math.min(.84,s.hint*3,(2.6-s.hint)*2.5));
  hints.style.transform='translate('+((1-a)*p.x+a*q.x-12)+'px,'+((1-a)*p.y+a*q.y-Math.sin(a*Math.PI)*26-4)+'px) rotate('+(-12+15*a)+'deg)';
}
function updateRings(){
  let write=0;
  for(const r of s.rings){
    const p=S.patches[r.pi];for(let j=0;j<ringN;j++){
      const a=j/ringN*TAU,an=(j+1)/ringN*TAU;
      const x=r.x+r.r*Math.cos(a),z=r.z+r.r*Math.sin(a),u=(x-p.x)/p.rx,v=(z-p.z)/p.rz;
      if(Math.hypot(u,v)>S.edge(r.pi,Math.atan2(v,u))*.986)continue;
      const gleam=.5+.5*Math.cos(a*2+.83+Math.sin(a*5+r.x)*.32);
      const width=(.004+.019*gleam)*Math.min(1,r.energy*1.75)*Math.min(1,(r.limit-r.r)*12);
      for(const [ang,delta] of [[a,0],[an,0],[a,width],[an,0],[an,width],[a,width]]){
        const xx=r.x+(r.r+delta)*Math.cos(ang),zz=r.z+(r.r+delta)*Math.sin(ang);
        rp[write]=xx;rp[write+1]=.031+game.sample(r.pi,xx,zz)/S.M;rp[write+2]=zz;
        const l=.13+gleam*r.energy*.85;rc[write]=l*.91;rc[write+1]=l*1.04;rc[write+2]=l*.96;write+=3;
      }
    }
  }
  ringGeo.setDrawRange(0,write/3);ringGeo.attributes.position.needsUpdate=ringGeo.attributes.color.needsUpdate=true;
}
const day=new T.Color(0xffe1b7),evening=new T.Color(0xffba80),fogDay=new T.Color(0xc5d0c4),fogEvening=new T.Color(0xccac9c);
function sync(){
  boots.forEach((g,i)=>{const b=s.boots[i];g.position.set(b.x,b.y,b.z);g.rotation.order='YXZ';g.rotation.x=b.tilt;g.rotation.z=b.vx*.023;const w=bootWater[i];w.visible=b.fill>.015;w.position.y=.557+b.fill*.01/S.M;w.rotation.x=b.slosh;const shadow=shadows[i];shadow.position.set(b.x,b.x>2.46?.149:.026,b.z);shadow.rotation.z=-(i?1.32:1.47);shadow.material.opacity=Math.max(.23,.85-b.y*.8);});
  const b=s.boat;boat.position.set(b.x,waterY+.017+b.y,b.z);boat.rotation.set(b.roll*.47,b.yaw,b.roll);
  foliage.forEach((g,i)=>{const l=s.leaves[i];g.position.set(l.x,.028+game.sample(l.pool,l.x,l.z)/S.M,l.z);g.rotation.set(l.roll*.46,l.yaw,l.roll);});
  for(let i=0;i<3;i++){const p=mainPools[i].geometry.attributes.position;
    for(let k=0;k<p.count;k++)p.setY(k,game.sample(i,p.getX(k),p.getZ(k))/S.M);p.needsUpdate=true;
    if(frames%2===0)mainPools[i].geometry.computeVertexNormals();
  }
  updateRings();windU.value=s.wind;
  const beads=s.drops.concat(s.fallingBeads);dropMesh.count=Math.min(160,beads.length);for(let i=0;i<dropMesh.count;i++){const d=beads[i];dummy.position.set(d.x,d.y,d.z);dummy.scale.set(d.size,d.size*(1.27+.09*Math.abs(d.vy)),d.size);dummy.rotation.set(0,0,-(d.vx||0)*.23);dummy.updateMatrix();dropMesh.setMatrixAt(i,dummy.matrix);}dropMesh.instanceMatrix.needsUpdate=true;
  rainMesh.count=Math.min(160,s.rainDrops.length);for(let i=0;i<rainMesh.count;i++){const r=s.rainDrops[i];dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(0,0,s.wind*.12);dummy.scale.setScalar(1);dummy.updateMatrix();rainMesh.setMatrixAt(i,dummy.matrix);}rainMesh.instanceMatrix.needsUpdate=true;
  let chainX=2.67,chainY=2.568;
  street.chain.forEach((o,i)=>{const a=s.chain[i].angle;chainX+=Math.sin(a)*.126;chainY-=Math.cos(a)*.126;o.position.set(chainX,chainY+.126,-3.79);o.rotation.z=a;});
  s.motes.forEach((m,i)=>{dummy.position.set(m.x,m.y,m.z);dummy.scale.setScalar(.0045*m.opacity);dummy.rotation.set(0,0,0);dummy.updateMatrix();pollen.setMatrixAt(i,dummy.matrix);});pollen.instanceMatrix.needsUpdate=true;
  street.keys.forEach((k,i)=>{k.position.y=.149-s.keys[i]*.052;});
  street.wheel.rotation.x=s.wheelAngle;street.cup.rotation.z=s.cupAngle;street.cupWater.position.y=-.12+Math.min(.25,s.catchment*.36);
  street.cupWater.scale.x=street.cupWater.scale.z=.51+Math.min(.48,s.catchment*.68);
  stream.visible=s.cupAngle>.48&&s.catchment>.005;stream.scale.x=.6+s.catchment*.9;
  street.channel.forEach((c,i)=>{const w=s.channel[i].water;c.visible=w>.002;c.scale.x=Math.min(1,w*11);c.scale.y=1+w*8;});
  street.lamps.forEach(l=>l.emissiveIntensity=.12+s.lamp*2.9);
  scene.fog.color.copy(fogDay).lerp(fogEvening,s.dusk);scene.fog.density=.042+s.rain*.011;
  duskU.value=s.dusk;cloudU.value=s.skyLight;sun.color.copy(day).lerp(evening,s.dusk);
  sun.intensity=(2.44+s.skyLight*.28)*(1-.31*s.rain);environment.intensity=1.45-.32*s.dusk;
  const dest=game.target(),p=s.phase===1?1:0;
  cursorBead.visible=s.phase>=2&&s.boots[s.active].mode==='rest';
  cursorBead.position.set(dest[0],.167+(s.phase<2?game.sample(p,...dest):0),dest[1]);
  updateHint();
}
const clip=[new T.Plane(V(0,1,0),-waterY+.0005)];
function draw(){
  if(frames%3===0){
    mirror.copy(camera,false);mirror.position.y=2*waterY-eye.y;mirror.up.set(0,-1,0);mirror.lookAt(look.x,2*waterY-look.y,look.z);mirror.updateMatrixWorld();
    vp.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);
    waterGroup.visible=false;renderer.clippingPlanes=clip;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(refl);renderer.render(scene,mirror);
    renderer.clippingPlanes=[];waterGroup.visible=true;renderer.shadowMap.autoUpdate=true;
  }
  renderer.setRenderTarget(frame);renderer.render(scene,camera);
  quad.material=glowMat;renderer.setRenderTarget(glowTarget);renderer.render(pixScene,flatCam);
  quad.material=finish;renderer.setRenderTarget(null);renderer.render(pixScene,flatCam);frames++;
}
const ray=new T.Raycaster(),audio=new LaneSound(),ndc=new T.Vector2();
function pointRay(e){ndc.set(e.clientX/W*2-1,1-e.clientY/H*2);ray.setFromCamera(ndc,camera);}
let picked=null;
function hit(e){
  picked=null;
  pointRay(e);const active=s.active,b=s.boots[active],g=boots[active];
  if(s.phase===2&&ray.intersectObject(street.cup,true).length)return 'cup';
  if(s.phase===2&&s.connected&&ray.intersectObject(street.wheel,true).length)return 'wheel';
  if(ray.intersectObject(g,true).length)return 'boot';
  const p=project(b.x,b.y+.52,b.z);
  if(Math.hypot(e.clientX-p.x,e.clientY-p.y)<24)return 'boot';
  const floor=s.phase>=2?.146:waterY,q=ray.ray.intersectPlane(new T.Plane(V(0,1,0),-floor),new T.Vector3());
  if(!q)return '';
  if(s.phase<2){
    const p=S.patches[s.phase],u=(q.x-p.x)/p.rx,v=(q.z-p.z)/p.rz;
    if(Math.hypot(u,v)<S.edge(s.phase,Math.atan2(v,u))*.94){picked=[q.x,q.z];return 'target';}
  }else {const t=game.target();if(s.phase===3&&q.x>2.51&&q.x<3.92&&q.z< -4.65&&q.z> -5.78){picked=[q.x,q.z];return 'target';}if(Math.hypot(q.x-t[0],q.z-t[1])<.68)return 'target';}
  if(ray.intersectObject(boots[1-active],true).length)s.boots[1-active].tiltV+=.11;
  return '';
}
let finger=null;
canvas.addEventListener('pointerdown',e=>{
  if(finger||!e.isPrimary)return;audio.start();const result=hit(e);
  if(result==='wheel'){canvas.setPointerCapture(e.pointerId);finger={id:e.pointerId,wheel:true,y:e.clientY};game.turnWheel(.45);return;}
  if(result==='cup'){canvas.setPointerCapture(e.pointerId);finger={id:e.pointerId,cup:true,y:e.clientY};game.pullCup(.30);return;}
  if(!result)return;
  if(result==='target'&&picked&&s.phase<2){canvas.setPointerCapture(e.pointerId);finger={id:e.pointerId,water:true,start:picked,prev:picked,x:e.clientX,y:e.clientY,moved:false};return;}
  if(!game.begin(true,picked))return;
  canvas.setPointerCapture(e.pointerId);const b=s.boots[s.active],dest=game.target(),a=project(b.x,b.y+.41,b.z),z=project(dest[0],s.phase>=2?.16:waterY,dest[1]);
  finger={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,last:e.timeStamp,velocity:.86,moved:false,distance:Math.max(45,Math.hypot(a.x-z.x,a.y-z.y)),pixels:Math.max(50,Math.abs(project(b.x,b.y+1,b.z).y-project(b.x,b.y,b.z).y)),target:result==='target'};
});
canvas.addEventListener('pointermove',e=>{
  if(!finger||finger.id!==e.pointerId)return;const f=finger;
  if(f.wheel){game.turnWheel(Math.max(-1,Math.min(1,(e.clientY-f.y)/36)));return;}
  if(f.cup){game.pullCup(Math.min(1,.3+Math.abs(e.clientY-f.y)/70));return;}
  if(f.water){if(Math.hypot(e.clientX-f.x,e.clientY-f.y)>5)f.moved=true;
    if(f.moved){pointRay(e);const q=ray.ray.intersectPlane(new T.Plane(V(0,1,0),-waterY),new T.Vector3());
      if(q&&s.time-s.lastStroke>=.065){game.stroke(q.x,q.z,q.x-f.prev[0],q.z-f.prev[1]);f.prev=[q.x,q.z];}}return;}
  const dist=Math.hypot(e.clientX-f.x,e.clientY-f.y),dt=Math.max(.008,(e.timeStamp-f.last)/1000);
  const speed=Math.hypot(e.clientX-f.lx,e.clientY-f.ly)/f.pixels*S.M/dt;
  f.velocity=Math.max(.4,Math.min(1.8,.28*f.velocity+.72*speed));f.moved=f.moved||dist>4;
  game.drag(f.target?1:Math.min(1,dist/f.distance+.16),f.velocity);
  f.lx=e.clientX;f.ly=e.clientY;f.last=e.timeStamp;
});
function end(e){if(!finger||e.pointerId!==finger.id)return;
  if(finger.wheel)game.turnWheel(null);else if(finger.cup)game.pullCup(null);else if(finger.water){if(!finger.moved&&e.type==='pointerup')game.begin(false,finger.start);}else game.release(finger.moved?(e.timeStamp-finger.last>180?.4:finger.velocity):.86);finger=null;
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,end);
document.querySelector('#sound').addEventListener('click',()=>{const on=audio.toggle();document.querySelector('#sound').setAttribute('aria-pressed',on);document.querySelector('#soundwave').setAttribute('d',on?'M16 8.4a5.3 5.3 0 0 1 0 7.2m3-10.1a9.2 9.2 0 0 1 0 13':'m16 9 6 6m0-6-6 6');});
let last=performance.now();function loop(now){let dt=Math.min(.06,Math.max(0,(now-last)/1000));last=now;
  if(!document.hidden){game.step(dt);cameraStep(dt,false);sync();audio.update(s);draw();}
  requestAnimationFrame(loop);}
document.addEventListener('visibilitychange',()=>{last=performance.now();if(audio.ctx){if(document.hidden)audio.ctx.suspend();else if(audio.on)audio.ctx.resume().catch(()=>{});}});
sync();draw();requestAnimationFrame(loop);
})();
