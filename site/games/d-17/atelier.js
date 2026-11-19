'use strict';
const T=THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), TAU=Math.PI*2;
const sim=Clockworks.create(), S=sim.state;
window.__GAME__={step:dt=>sim.step(dt),getState:()=>sim.getState()};
const canvas=document.getElementById('world'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.08,195);
scene.background=new T.Color(0xeecfb6);scene.fog=new T.FogExp2(0xe2c8ba,.011);
let randomSeed=8183;
function random(){randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296}
const mix=(a,b,t)=>a+(b-a)*t, sat=x=>Math.min(1,Math.max(0,x));
function group(parent=scene){const g=new T.Group();parent.add(g);return g}
function mesh(geo,mat,parent=scene,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
const cube=new T.BoxGeometry(1,1,1),ballGeo=new T.SphereGeometry(1,24,16);
function box(p,x,y,z,w,h,d,m){const a=mesh(cube,m,p,x,y,z);a.scale.set(w,h,d);return a}
function oval(p,x,y,z,w,h,d,m){const a=mesh(ballGeo,m,p,x,y,z);a.scale.set(w,h,d);return a}
const geoCache=new Map();
function cached(key,make){if(!geoCache.has(key))geoCache.set(key,make());return geoCache.get(key)}
function cyl(p,x,y,z,top,bottom,len,m,n=36){return mesh(cached(['c',top,bottom,len,n].join(),()=>new T.CylinderGeometry(top,bottom,len,n)),m,p,x,y,z)}
function disk(p,x,y,z,r,depth,m,r2=r){const a=cyl(p,x,y,z,r,r2,depth,m,48);a.rotation.x=Math.PI/2;return a}
function ring(p,x,y,z,r,t,m){return mesh(cached(['r',r,t].join(),()=>new T.TorusGeometry(r,t,8,64)),m,p,x,y,z)}
function rod(p,a,b,r,m,n=12){const A=V(...a),B=V(...b),d=B.clone().sub(A);const c=cyl(p,0,0,0,r,r,d.length(),m,n);c.position.copy(A.add(B).multiplyScalar(.5));c.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return c}
function beam(p,a,b,w,depth,m){const A=V(...a),B=V(...b),d=B.clone().sub(A);const c=box(p,0,0,0,w,d.length(),depth,m);c.position.copy(A.add(B).multiplyScalar(.5));c.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return c}
function plate(p,shape,depth,m,x=0,y=0,z=0,bevel=.012){const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:12});return mesh(geo,m,p,x,y,z)}
function lathe(p,x,y,z,points,m,n=56){return mesh(new T.LatheGeometry(points.map(([r,h])=>new T.Vector2(r,h)),n),m,p,x,y,z)}
function poly(points){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s}
function screw(p,x,y,z,r=.043){disk(p,x,y,z,r,.026,M.brass);const slot=box(p,x,y,z+.014,r*1.28,.008,.004,M.dark);slot.rotation.z=.34+random()*.6}
const grainSeed=Array.from({length:4096},random);
function noise(x,y){let a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);
 const val=(i,j)=>grainSeed[((i&63)+(j&63)*64)];return mix(mix(val(a,b),val(a+1,b),u),mix(val(a,b+1),val(a+1,b+1),u),v)}
function surface(kind){
  const n=256,data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=x/n,v=y/n,g=random(),f=noise(u*8,v*8);
    let a;
    if(kind==='wood'){const dist=v*31+1.7*noise(u*2,v*4)+.35*noise(u*7,v*9);
      a=197+22*Math.sin(dist*TAU)+19*noise(u*3,v*92)-29*Math.pow(.5+.5*Math.sin(dist*TAU),8)+(g-.5)*15}
    else if(kind==='stone')a=218+21*(f-.5)+18*(noise(u*26,v*26)-.5)+(g-.5)*20;
    else if(kind==='velvet')a=209+(g-.5)*38+6*Math.sin(x*2.6)*Math.sin(y*2.1);
    else a=220+9*(f-.5)+(g-.5)*20-((y%29===0&&g>.55)?18:0);
    let j=4*(y*n+x);data[j]=a;data[j+1]=a;data[j+2]=a;data[j+3]=255
  }
  const tex=new T.DataTexture(data,n,n);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;tex.anisotropy=4;return tex
}
const tex={wood:surface('wood'),stone:surface('stone'),metal:surface('metal'),velvet:surface('velvet')};
function mat(color,rough=.64,metal=0,kind='metal',extra={}){
 const m=new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,map:tex[kind],roughnessMap:tex[kind],bumpMap:tex[kind],bumpScale:kind==='wood'?.009:kind==='stone'?.014:.0025,...extra});return m
}
const M={
 plaster:mat(0xe6cfae,.93,0,'stone'),cream:mat(0xe9d8be,.81,0,'stone'),stone:mat(0xcab898,.84,0,'stone'),stone2:mat(0xd9c4a3,.86,0,'stone'),
 wood:mat(0x785038,.56,.02,'wood'),oak:mat(0x9c7250,.53,.02,'wood'),edge:mat(0x573829,.48,.03,'wood'),mahogany:mat(0x69382f,.44,.05,'wood'),
 brass:mat(0xd4a75a,.32,.77),gold:mat(0xf0c77e,.24,.79),aged:mat(0x9e743e,.4,.72),iron:mat(0x384646,.46,.66),green:mat(0x4b605b,.41,.52),dark:mat(0x312c29,.58,.43),steel:mat(0xaaa79a,.24,.8),
 red:mat(0x7d3539,.94,.01,'velvet'),cord:mat(0xc9aa7e,.87,0,'velvet'),face:mat(0xefdbab,.58,.12,'stone'),
 glass:mat(0xa9c9c2,.13,.36,'metal',{transparent:true,opacity:.14,depthWrite:false}),bulb:mat(0xffe4ac,.16,.12,'metal',{emissive:0xffc171,emissiveIntensity:2.2}),
 glow:mat(0xffcf68,.26,.48,'metal',{emissive:0xffa933,emissiveIntensity:1.15}),feather:mat(0xf0ebe1,.82,.02,'velvet')
};
// The window and bulb shapes in this radiance field give polished metal
// broad cool reflections along one edge and narrow warm reflections opposite.
{
 const w=256,h=128,env=new Float32Array(w*h*4);
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  const u=i/w,v=j/h,sky=.24+.44*v;
  const win=(u>.49&&u<.79&&v>.42&&v<.82)?2.4:0;
  const lamp=Math.exp(-((u-.19)**2/.0014+(v-.62)**2/.013))*4.2;
  let k=(j*w+i)*4;env[k]=sky*.94+win+lamp;env[k+1]=sky*.86+win*1.06+lamp*.64;env[k+2]=sky*.78+win*1.19+lamp*.27;env[k+3]=1
 }
 const envMap=new T.DataTexture(env,w,h,T.RGBAFormat,T.FloatType);envMap.mapping=T.EquirectangularReflectionMapping;envMap.needsUpdate=true;
 const gen=new T.PMREMGenerator(renderer);const target=gen.fromEquirectangular(envMap);scene.environment=target.texture;scene.environmentIntensity=.66;envMap.dispose();gen.dispose()
}
const hemi=new T.HemisphereLight(0xdce6ee,0xb99a7b,1.32);scene.add(hemi);
const key=new T.DirectionalLight(0xffdfad,2.6);key.position.set(4.8,8,4.4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-8,right:8,top:9,bottom:-8,near:.3,far:34});key.shadow.normalBias=.018;key.shadow.bias=-.0003;key.shadow.radius=3;scene.add(key,key.target);
function gear(parent,teeth,r,main=M.brass,spokes=6){
 const g=group(parent),s=new T.Shape(),depth=r*.14;
 // Rounded tooth shoulders and curved openings are cut through one casting.
 for(let i=0;i<teeth;i++)for(const [f,rr] of [[0,.922],[.12,.929],[.28,1.047],[.35,1.065],[.63,1.065],[.7,1.047],[.86,.929],[.99,.922]]){
  const a=(i+f)*TAU/teeth;const x=r*rr*Math.cos(a),y=r*rr*Math.sin(a);if(!i&&!f)s.moveTo(x,y);else s.lineTo(x,y)
 }
 s.closePath();
 for(let i=0;i<spokes;i++){
  const a=i*TAU/spokes,b=(i+1)*TAU/spokes,h=new T.Path();
  const pt=(rr,aa)=>[r*rr*Math.cos(aa),r*rr*Math.sin(aa)];
  h.moveTo(...pt(.27,a+.23));h.quadraticCurveTo(...pt(.5,a+.16),...pt(.77,a+.073));h.quadraticCurveTo(...pt(.805,a+.07),...pt(.805,a+.13));
  h.absarc(0,0,r*.805,a+.13,b-.13,false);
  h.quadraticCurveTo(...pt(.805,b-.063),...pt(.755,b-.079));h.quadraticCurveTo(...pt(.45,b-.13),...pt(.27,b-.23));
  h.absarc(0,0,r*.27,b-.23,a+.23,true);h.closePath();s.holes.push(h)
 }
 const hole=new T.Path();hole.absarc(0,0,r*.097,0,TAU);s.holes.push(hole);
 plate(g,s,depth,main,0,0,-depth/2,r*.012);
 ring(g,0,0,depth*.52,r*.871,r*.013,M.gold);ring(g,0,0,depth*.51,r*.822,r*.008,M.aged);
 ring(g,0,0,depth*.6,r*.192,r*.038,M.aged);ring(g,0,0,depth*.68,r*.138,r*.026,M.gold);
 for(let i=0;i<spokes;i++){const a=i*TAU/spokes;oval(g,r*.846*Math.cos(a),r*.846*Math.sin(a),depth*.59,r*.023,r*.023,r*.011,M.aged)}
 return g
}
function clockFace(p,x,y,z,r){
 const g=group(p);g.position.set(x,y,z);
 disk(g,0,0,0,r*1.08,.095,M.aged);disk(g,0,0,.062,r,.05,M.face);ring(g,0,0,.1,r*.966,r*.025,M.gold);ring(g,0,0,.1,r*.798,r*.009,M.aged);
 for(let i=0;i<60;i++){const a=i*TAU/60,L=(i%5?.041:.099)*r,b=box(g,Math.sin(a)*r*.883,Math.cos(a)*r*.883,.097,i%5?r*.01:r*.027,L,.009,M.dark);b.rotation.z=-a}
 const hands=[.68,.48].map((l,i)=>{let q=group(g);q.position.z=.12+.025*i;plate(q,poly([[0,-r*.18],[r*.028,0],[r*.035,r*l*.48],[0,r*l],[-r*.035,r*l*.48],[-r*.028,0]]),.013,M.iron);return q});
 disk(g,0,0,.175,r*.066,.041,M.gold);return {g,hands}
}
