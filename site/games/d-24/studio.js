'use strict';
const T=THREE, world=document.getElementById('world'), sim=LockWater.create(), st=sim.state;
const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.11;world.prepend(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(39,1,.15,440);
scene.fog=new T.FogExp2(0xc4d0c9,.0077);
const sun=new T.DirectionalLight(0xffe2b3,2.52);sun.position.set(-31.8,21,-48);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:27,bottom:-27,near:1,far:130});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00037;sun.shadow.normalBias=.028;scene.add(sun,sun.target,new T.HemisphereLight(0xd1e6f3,0xb4a88b,1.64));
let randomSeed=668161;function rnd(){randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;}
const range=(a,b)=>a+(b-a)*rnd(),pick=a=>a[Math.floor(rnd()*a.length)],clamp=(v,a,b)=>Math.max(a,Math.min(v,b)),pi=Math.PI;
function group(parent=scene,x=0,y=0,z=0){const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;}
function hash(i,j){let u=Math.imul(i+37,374761393)+Math.imul(j+51,668265263);u=Math.imul(u^(u>>>13),1274126177);return ((u^(u>>>16))>>>0)/4294967295;}
function noise(x,y,n){const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);
  const h=(a,b)=>hash(((a%n)+n)%n,((b%n)+n)%n);return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v;}
function texture(kind){const n=256, data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=x/n,v=y/n, g=rnd(),a=noise(u*8,v*8,8),b=noise(u*39,v*39,39);
    let q=181+34*a+19*b+22*g;
    if(kind==='wood'){const grain=Math.sin((v*43+noise(u*3,v*8,8)*1.8+.22*Math.sin(u*2*pi))*2*pi);q=183+30*noise(u*4,v*46,46)+grain*(5+11*b)+19*g+12*a;if(grain>.94)q-=23;}
    if(kind==='stone')q=158+47*a+30*b+24*g-(g>.989?48:0);
    if(kind==='metal')q=192+21*a+16*b+20*g;
    const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=q;data[i+3]=255;
  }
  const tex=new T.DataTexture(data,n,n,T.RGBAFormat);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;return tex;
}
const tex={wood:texture('wood'),stone:texture('stone'),metal:texture('metal'),soft:texture('soft')};
function mat(c,rough=.75,metal=0,type='soft',extra={}){return new T.MeshStandardMaterial({color:c,roughness:rough,metalness:metal,map:tex[type],roughnessMap:tex[type],...(type==='stone'||type==='wood'?{bumpMap:tex[type],bumpScale:type==='stone'?.056:.023}:{}),...extra});}
const m={
 stone:mat(0xa29b83,.96,0,'stone'),cap:mat(0xcac2a7,.86,0,'stone'),wet:mat(0x696f62,.38,.08,'stone'),mortar:mat(0x726e5d,.94,0,'stone'),
 oak:mat(0x976437,.72,0,'wood'),honey:mat(0xbd8a4e,.64,0,'wood'),walnut:mat(0x65472e,.69,0,'wood'),darkwood:mat(0x494637,.52,0,'wood'),
 iron:mat(0x344748,.48,.62,'metal'),steel:mat(0x637475,.4,.54,'metal'),brass:mat(0xd2a354,.32,.67,'metal'),gold:mat(0xf3c769,.31,.58,'metal'),
 cream:mat(0xf3e3bf,.67,0,'wood'),red:mat(0xac513a,.75,0,'wood'),green:mat(0x526d60,.7,0,'wood'),
 roof:mat(0x9e5840,.91,0,'stone'),slate:mat(0x51656c,.75,.1,'metal'),glass:mat(0x537b81,.13,.49,'metal'),rope:mat(0xb4a17b,.93,0,'wood'),
 grass:mat(0x8b9671,.96),leaf:mat(0x526f57,.93),pine:mat(0x47654f,.97),bank:mat(0x938a6b,.97,0,'stone'),white:mat(0xf6eed2,.85),black:mat(0x293736,.6,.1),
 lamp:mat(0xffdda0,.18,.2,'soft',{emissive:0xf7b44f,emissiveIntensity:.35})
};
const dampLines={value:new T.Vector3(...LockWater.floor)};
for(const material of [m.stone,m.wet,m.cap,m.mortar,m.oak,m.walnut]){
 material.onBeforeCompile=shader=>{
  shader.uniforms.uDamp=dampLines;
  shader.vertexShader='varying vec3 vBank;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
  vec4 bankPosition=vec4(transformed,1.);
  #ifdef USE_INSTANCING
  bankPosition=instanceMatrix*bankPosition;
  #endif
  vBank=(modelMatrix*bankPosition).xyz;`);
  shader.fragmentShader='varying vec3 vBank;uniform vec3 uDamp;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  float line=vBank.z>-2.?uDamp.x:(vBank.z>-10.5?uDamp.y:uDamp.z);
  float waterMark=(1.-smoothstep(line-.08,line+.08,vBank.y+.022*sin(12.*vBank.x+9.*vBank.z)))*step(abs(vBank.x),4.31)*step(-20.,vBank.z)*step(vBank.z,8.6);
  diffuseColor.rgb*=mix(vec3(1.),vec3(.60,.68,.65),waterMark);`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.29,waterMark);');
 };
}
const cube=new T.BoxGeometry(1,1,1,3,3,3);
{const p=cube.attributes.position;for(let i=0;i<p.count;i++){
 const a=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.sign(v)*(Math.abs(v)>.4?.5:.469));
 const base=a.map(v=>clamp(v,-.469,.469));const d=new T.Vector3(...a.map((v,j)=>v-base[j])).normalize().multiplyScalar(.031);
 p.setXYZ(i,base[0]+d.x,base[1]+d.y,base[2]+d.z);
}cube.computeVertexNormals();}
const cyl=new T.CylinderGeometry(1,1,1,20),ball=new T.SphereGeometry(1,16,10), rockGeo=new T.IcosahedronGeometry(1,1);
const geometryCache=new Map();function cached(key,make){if(!geometryCache.has(key))geometryCache.set(key,make());return geometryCache.get(key);}
function mesh(p,g,material,x,y,z,sx=1,sy=1,sz=1){const a=new T.Mesh(g,material);a.position.set(x,y,z);a.scale.set(sx,sy,sz);a.castShadow=true;a.receiveShadow=true;p.add(a);return a;}
function box(p,x,y,z,w,h,d,ma){return mesh(p,cube,ma,x,y,z,w,h,d);}
function rod(p,x,y,z,r,h,ma,r2=r,n=20){const ratio=Math.round(r2/r*100)/100;const g=r===r2 && n===20?cyl:cached('c'+ratio+','+n,()=>new T.CylinderGeometry(ratio,1,1,n));return mesh(p,g,ma,x,y,z,r,h,r);}
function orb(p,x,y,z,a,b,c,ma){return mesh(p,ball,ma,x,y,z,a,b,c);}
function ring(p,x,y,z,r,t,ma,n=32){const f=Math.round(t/r*1000)/1000,g=cached('r'+f+','+n,()=>new T.TorusGeometry(1,f,8,n));return mesh(p,g,ma,x,y,z,r,r,r);}
function beam(p,a,b,r,ma,r2=r,n=12){const v=new T.Vector3(...a),d=new T.Vector3(...b).sub(v),center=v.addScaledVector(d,.5);const obj=rod(p,center.x,center.y,center.z,r,d.length(),ma,r2,n);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return obj;}
function slat(p,a,b,w,d,ma){const v=new T.Vector3(...a),u=new T.Vector3(...b).sub(v);v.addScaledVector(u,.5);const obj=box(p,v.x,v.y,v.z,w,u.length(),d,ma);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),u.normalize());return obj;}
function cable(p,points,r,ma){let curve=new T.CatmullRomCurve3(points.map(q=>new T.Vector3(...q)));return mesh(p,new T.TubeGeometry(curve,Math.max(12,points.length*4),r,6,false),ma,0,0,0);}
function triangles(p,verts,idx,material){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();return mesh(p,geo,material,0,0,0);}
function bake(root){root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),buckets=new Map();
 root.traverse(o=>{if(o.isMesh && !o.isInstancedMesh && !o.userData.keep && !Array.isArray(o.material)){const key=o.geometry.uuid+o.material.uuid;const arr=buckets.get(key)||[];arr.push(o);buckets.set(key,arr);}});
 for(const arr of buckets.values()){if(arr.length<2)continue;const im=new T.InstancedMesh(arr[0].geometry,arr[0].material,arr.length);im.castShadow=arr[0].castShadow;im.receiveShadow=true;arr.forEach((o,i)=>{im.setMatrixAt(i,inv.clone().multiply(o.matrixWorld));if(o.userData.tint)im.setColorAt(i,o.userData.tint);o.removeFromParent();});root.add(im);}
}
const tint=(o,color)=>{o.userData.tint=new T.Color(color);return o;};
const land=group(),gates=[],wheels=[],anchors={},fishModels=[],birdModels=[],flagModels=[];
const skyMat=new T.MeshStandardMaterial({side:T.BackSide,depthWrite:false,roughness:1,fog:false});
skyMat.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 vSky;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSky=position;');
sh.fragmentShader='varying vec3 vSky;\nfloat hsky(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float nsky(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsky(i),hsky(i+vec2(1,0)),f.x),mix(hsky(i+vec2(0,1)),hsky(i+1.),f.x),f.y);}\n'+sh.fragmentShader.replace('#include <opaque_fragment>',`vec3 d=normalize(vSky);float h=max(0.,d.y);vec3 col=mix(vec3(.83,.86,.76),vec3(.245,.49,.65),smoothstep(-.03,.71,h));vec2 uv=d.xz/(h+.13)*2.;float clouds=nsky(uv)*.57+nsky(uv*2.3)*.28+nsky(uv*5.)*.15;col=mix(col,vec3(1.02,.985,.87),smoothstep(.49,.78,clouds)*.61*smoothstep(.012,.2,h));float sd=dot(d,normalize(vec3(-.53,.35,-.80)));col+=vec3(1.,.73,.41)*(.26*pow(max(0.,sd),12.)+.78*pow(max(0.,sd),185.)+3.*smoothstep(.9993,.99985,sd));outgoingLight=col;
#include <opaque_fragment>`);};
const sky=new T.Mesh(new T.SphereGeometry(270,36,20),skyMat);sky.renderOrder=-5;scene.add(sky);
