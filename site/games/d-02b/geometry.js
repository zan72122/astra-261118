'use strict';
const T=THREE, S=KartSim, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const PI=Math.PI, TAU=2*PI, mix=(a,b,f)=>a+(b-a)*f;
const geo={
  box:new T.BoxGeometry(1,1,1), ball:new T.SphereGeometry(1,18,12),
  pebble:new T.IcosahedronGeometry(1,0), crown:new T.IcosahedronGeometry(1,1),
  cylinder:new T.CylinderGeometry(1,1,1,14), log:new T.CylinderGeometry(.78,1,1,7),
  cone:new T.ConeGeometry(1,1,9), tire:new T.CylinderGeometry(1,1,1,40)
};
function meshData(pos,indices,colors,uv){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  if(indices)g.setIndex(indices);if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
geo.leaf=meshData([0,0,-1,-.48,.12,-.28,-.65,.05,.22,-.21,.05,.19,0,.18,1,.24,.01,.21,.61,.08,.29,.43,.08,-.3,0,.23,0],
  [0,8,1,1,8,2,2,8,3,3,8,4,4,8,5,5,8,6,6,8,7,7,8,0]);
geo.blade=meshData([-.12,0,0,.12,0,0,.07,.53,.07,.30,1,.09],[0,2,1,1,2,3]);
const rgb=(color)=>new T.Color(color);
function variance(color,amt,r){return rgb(color).multiplyScalar(1+(r()-.5)*amt);}
const unitY=V(0,1,0), identity=new T.Quaternion(), workMatrix=new T.Matrix4(), workEuler=new T.Euler(), workQ=new T.Quaternion();
function matrix(x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
  return workMatrix.compose(V(x,y,z),workQ.setFromEuler(workEuler.set(rx,ry,rz)),V(sx,sy,sz));
}
class Batch{
  constructor(){this.items=new Map();}
  put(g,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){this.add(g,color,matrix(x,y,z,sx,sy,sz,rx,ry,rz));}
  rod(a,b,r,color,g=geo.log){
    const d=V().subVectors(b,a),len=d.length();if(len<.0001)return;
    this.add(g,color,workMatrix.compose(V().addVectors(a,b).multiplyScalar(.5),workQ.setFromUnitVectors(unitY,d.divideScalar(len)),V(r,len,r)));
  }
  add(g,color,m){let arr=this.items.get(g);if(!arr){arr=[];this.items.set(g,arr);}arr.push([m.clone(),rgb(color)]);}
  finish(parent,mat,shadows=true){
    for(const [g,arr] of this.items){const mesh=new T.InstancedMesh(g,mat,arr.length);
      for(let i=0;i<arr.length;i++){mesh.setMatrixAt(i,arr[i][0]);mesh.setColorAt(i,arr[i][1]);}
      mesh.castShadow=shadows;mesh.receiveShadow=true;parent.add(mesh);}
    this.items.clear();
  }
}
function roughTexture(){
  const n=64,data=new Uint8Array(n*n*4),r=S.random(875);
  for(let i=0;i<n*n;i++){const c=210+Math.floor(r()*44);data.set([c,c,c,255],i*4);}
  const tex=new T.DataTexture(data,n,n);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.needsUpdate=true;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearFilter;return tex;
}
const roughMap=roughTexture();
function material(c,r=.8,m=0,opts={}){return new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,roughnessMap:roughMap,...opts});}
const worldMat=material(0xffffff,.91,0,{side:T.DoubleSide}),landMat=material(0xffffff,.94,0,{vertexColors:true,side:T.DoubleSide});
function piece(parent,g,mat,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
  const m=new T.Mesh(g,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);
  m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function strut(parent,a,b,r,mat,g=geo.cylinder){
  const d=V().subVectors(b,a),m=piece(parent,g,mat,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r,d.length(),r);
  m.quaternion.setFromUnitVectors(unitY,d.normalize());return m;
}
function tubePath(parent,points,r,mat){
  const curve=new T.CatmullRomCurve3(points.map(p=>V(...p)));
  return piece(parent,new T.TubeGeometry(curve,Math.max(16,points.length*5),r,8,false),mat,0,0,0);
}
function ring(parent,r,thick,mat,x,y,z){return piece(parent,new T.TorusGeometry(r,thick,8,72),mat,x,y,z);}
function environment(){
  const w=512,h=256,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d'),grad=ctx.createLinearGradient(0,0,0,h);
  [[0,'#6295ae'],[.28,'#8db8c8'],[.43,'#c5dbe0'],[.5,'#f4e3c3'],[.57,'#aeb5a0'],[.72,'#8b8163'],[1,'#716342']].forEach(k=>grad.addColorStop(...k));
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  const tex=new T.CanvasTexture(canvas);tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.SRGBColorSpace;return tex;
}
