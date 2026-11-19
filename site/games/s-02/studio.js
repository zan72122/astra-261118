'use strict';
const T=THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), PI=Math.PI, TAU=2*PI;
const {clamp,ease}=KitchenModel;
const game=KitchenModel.create(), canvas=document.querySelector('#kitchen');
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.09;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.1,65);
scene.background=new T.Color(0xdfdec5);scene.fog=new T.FogExp2(0xc8c5a5,.029);
const hemi=new T.HemisphereLight(0xfff6de,0xbc9b78,1.02);
const sun=new T.DirectionalLight(0xffedce,3);
sun.position.set(-7.6,8.4,-8.5);sun.target.position.set(0,0,.4);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-9,right:9,top:8,bottom:-8,near:.5,far:28});
sun.shadow.normalBias=.018;sun.shadow.bias=-.00018;sun.shadow.radius=3.2;
scene.add(hemi,sun,sun.target);
let seed=485763;
function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
function hash(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function noise(x,y){
 const i=Math.floor(x),j=Math.floor(y),u=ease(x-i),v=ease(y-j);
 return ((1-u)*hash(i,j)+u*hash(i+1,j))*(1-v)+((1-u)*hash(i,j+1)+u*hash(i+1,j+1))*v;
}
function bitmap(w,h,fn,color=true){
 const data=new Uint8Array(w*h*4);
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
   const c=fn(i,j,i/w,j/h),k=4*(j*w+i);
   data[k]=c[0];data[k+1]=c[1];data[k+2]=c[2];data[k+3]=255;
 }
 const t=new T.DataTexture(data,w,h);
 t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;
 t.generateMipmaps=true;if(color)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;
 t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;
}
// Bake the fine surface grain in small slices after the first interactive frame.
const surfaceJobs=[];
function surfaceTexture(w,h,sample,color=true){
 const preview=bitmap(w/4,h/4,(x,y,u,v)=>sample(x*4,y*4,u,v),color);
 const bytes=new Uint8Array(w*h*4);
 surfaceJobs.push({row:0,w,h,sample,bytes,preview});
 return preview;
}
function refineSurfaces(){
 const job=surfaceJobs[0];if(!job)return;
 const stop=performance.now()+3.0;
 do{
  const y=job.row++;
  for(let x=0;x<job.w;x++){
   const rgb=job.sample(x,y,x/job.w,y/job.h),k=(y*job.w+x)*4;
   job.bytes[k]=rgb[0];job.bytes[k+1]=rgb[1];job.bytes[k+2]=rgb[2];job.bytes[k+3]=255;
  }
 }while(job.row<job.h&&performance.now()<stop);
 if(job.row===job.h){job.preview.dispose();job.preview.image={data:job.bytes,width:job.w,height:job.h};job.preview.needsUpdate=true;surfaceJobs.shift();}
 if(surfaceJobs.length)requestAnimationFrame(refineSurfaces);
}
const grain=bitmap(64,64,(x,y)=>{const k=185+52*hash(x,y)+13*noise(x/5,y/5);return [k,k,k];},false);
grain.repeat.set(5,5);
function mat(color,rough=.66,metal=0,more={}){
 return new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,roughnessMap:grain,...more});
}
function group(parent=scene){const g=new T.Group();parent.add(g);return g;}
function mesh(parent,geometry,material,x=0,y=0,z=0){
 const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const smallSphere=new T.SphereGeometry(1,12,9),mediumSphere=new T.SphereGeometry(1,19,13);
const sphereGeo=new T.SphereGeometry(1,28,20),boxGeo=new T.BoxGeometry(1,1,1);
function ball(g,m,x,y,z,rx,ry,rz){const o=mesh(g,Math.max(rx,ry,rz)<.19?smallSphere:Math.max(rx,ry,rz)<.75?mediumSphere:sphereGeo,m,x,y,z);o.scale.set(rx,ry,rz);return o;}
function box(g,m,x,y,z,w,h,d){const o=mesh(g,boxGeo,m,x,y,z);o.scale.set(w,h,d);return o;}
function line(g,m,points,r=.018){
 const ar=points.map(p=>Array.isArray(p)?V(...p):p);
 return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(ar),Math.max(8,ar.length*4),r,7,false),m);
}
function lathe(g,m,profile,x=0,y=0,z=0,n=72){
 const o=mesh(g,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),n),m,x,y,z);return o;
}
function geom(pos,idx,uv,col){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(col)g.setAttribute('color',new T.Float32BufferAttribute(col,3));
 g.setIndex(idx);g.computeVertexNormals();return g;
}
/* Consolidate the small, rigid details of each object into material batches. */
function batch(g){
 g.updateWorldMatrix(true,true);
 const inverse=new T.Matrix4().copy(g.matrixWorld).invert(), sets=new Map();
 const nodes=[];
 g.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh){nodes.push(o);
 const key=o.material.uuid+'_'+o.castShadow+'_'+o.receiveShadow;
 if(!sets.has(key))sets.set(key,{m:o.material,cast:o.castShadow,receive:o.receiveShadow,p:[],n:[],u:[],c:[],idx:[]});
 const b=sets.get(key),M=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(M);
 const {position:p,normal:n,uv:u,color:c}=o.geometry.attributes,offset=b.p.length/3,v=V();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(M);b.p.push(v.x,v.y,v.z);
 v.fromBufferAttribute(n,i).applyNormalMatrix(nm);b.n.push(v.x,v.y,v.z);b.u.push(u?u.getX(i):0,u?u.getY(i):0);
 if(c)b.c.push(c.getX(i),c.getY(i),c.getZ(i));}
 const ix=o.geometry.index;
 for(let i=0;i<(ix?ix.count:p.count);i++)b.idx.push(offset+(ix?ix.getX(i):i));
 }});
 nodes.forEach(o=>o.removeFromParent());
 for(const b of sets.values()){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(b.p,3));
 geo.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(b.u,2));
 if(b.c.length)geo.setAttribute('color',new T.Float32BufferAttribute(b.c,3));geo.setIndex(b.idx);
 const o=mesh(g,geo,b.m);o.castShadow=b.cast;o.receiveShadow=b.receive;}
 return g;
}
const enamel=mat(0x264e40,.25,.22), darkGreen=mat(0x1d4036,.42,.08);
const brass=mat(0xb29157,.31,.67), ivory=mat(0xf4e9cf,.27,.04);
const clay=mat(0xe5dcc0,.45),sage=mat(0x879f83,.37,.07);
const chalk=mat(0xf5edde,.93),ink=mat(0x3c6757,.42);
const oakTexture=surfaceTexture(512,256,(i,j,u,v)=>{
 const warp=noise(u*5,v*6)*.045+noise(u*12,v*4)*.012;
 const k=v+warp+.008*Math.sin(u*9+v*8);
 const fields=noise(u*7,k*85)*.58+noise(u*20,k*270)*.28+noise(u*2,k*12)*.14;
 const vein=Math.pow(.5+.5*Math.sin(k*460+noise(u*6,k*18)*6),12);
 const pores=Math.max(0,noise(u*92,k*310)-.72)*13;
 const light=fields*42-23-11*vein+hash(i,j)*5-pores;
 return [155+light,111+light*.91,72+light*.78];
});
const wood=mat(0xffffff,.57,0,{map:oakTexture,bumpMap:grain,bumpScale:.023});
const walnut=mat(0x725339,.48,0,{map:oakTexture});
const clothMap=bitmap(128,128,(x,y)=>{
 const stripe=k=>k%64<14?.27:k%64<17?.61:k%64>58&&k%64<61?.65:1;
 const a=stripe(x)*stripe(y),f=4*Math.sin(x*PI/2)+4*Math.sin(y*PI/2)+hash(x,y)*9;
 return [85+145*a+f,105+113*a+f,87+103*a+f];
});clothMap.repeat.set(3.4,2.7);
const linen=mat(0xffffff,.99,0,{map:clothMap,bumpMap:grain,bumpScale:.019,side:T.DoubleSide});
const palette={berry:mat(0xb32729,.35), leaf:mat(0x4c754a,.69),darkleaf:mat(0x315941,.69)};
const layout={narrow:false,w:8.7,d:4.74,z:.9,start:-.65,spot:1.08,plateX:2.16,plateZ:-2.9,floor:.25};
function configureLayout(){
 const aspect=innerWidth/innerHeight, narrow=aspect<.86;
 Object.assign(layout,{narrow,w:narrow?5.52:8.65,d:narrow?4.65:4.78,z:narrow?.98:.93,
 start:narrow?-.58:-.73,spot:narrow?.87:1.24,plateX:narrow?1.44:2.13,plateZ:narrow?-2.62:-3.04});
}configureLayout();
function resizeCamera(){
 const w=innerWidth,h=innerHeight,a=w/h;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(w,h,false);
 camera.aspect=a;
 const desiredW=layout.narrow?6.65:11.75;
 const target=V(0,layout.narrow?.55:.51,layout.narrow?-.45:-.40);
 camera.position.copy(target).add(V(layout.narrow?.39:1.06,layout.narrow?9:8,layout.narrow?10.8:11.7));
 const dist=camera.position.distanceTo(target);
 const hSpan=Math.max(desiredW/a,layout.narrow?10:7.70);
 camera.fov=2*Math.atan(hSpan/(2*dist))*180/PI;
 camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
}
resizeCamera();
