/* Small solid modelling tools. Static parts are welded into material batches. */
const Art=(()=>{
  const T=THREE,rand=FarmModel.random(38147),geometry=new Map(),materials=new Map(),dummy=new T.Object3D();
  function canvasTex(n,paint){const c=document.createElement('canvas');c.width=c.height=n;const ctx=c.getContext('2d');paint(ctx,n);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;}
  const rough=canvasTex(64,(c,n)=>{const im=c.createImageData(n,n);for(let i=0;i<im.data.length;i+=4){const v=224+rand()*31;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}c.putImageData(im,0,0);});
  function mat(color,roughness=.8,metalness=0){
    const key=[color,roughness,metalness].join();if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough}));return materials.get(key);
  }
  function geom(key,fn){if(!geometry.has(key))geometry.set(key,fn());return geometry.get(key);}
  const boxG=geom('box',()=>new T.BoxGeometry(1,1,1));
  function group(p,x=0,y=0,z=0){const o=new T.Group();o.position.set(x,y,z);if(p)p.add(o);return o;}
  function obj(p,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,typeof m==='object'?m:mat(m));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
  function box(p,x,y,z,w,h,d,m){const o=obj(p,boxG,m,x,y,z);o.scale.set(w,h,d);return o;}
  function soft(p,x,y,z,w,h,d,r,m){
    const key=[w,h,d,r].join('/');return obj(p,geom(key,()=>{
      const s=new T.Shape(),a=w/2-r,b=h/2-r;
      s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,b);s.lineTo(-a,b);s.closePath();
      const g=new T.ExtrudeGeometry(s,{depth:d-r*2,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r});
      g.translate(0,0,-d/2+r);return g;
    }),m,x,y,z);
  }
  function cyl(p,x,y,z,rt,rb,h,m,n=16){return obj(p,geom('c'+[rt,rb,h,n],()=>new T.CylinderGeometry(rt,rb,h,n)),m,x,y,z);}
  function ball(p,x,y,z,w,h,d,m,n=12){let o=obj(p,geom('s'+n,()=>new T.SphereGeometry(1,n,Math.max(5,n/2))),m,x,y,z);o.scale.set(w,h,d);return o;}
  function bar(p,a,b,r,m,n=8,r2=r){const dir=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const o=cyl(p,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r2,r,dir.length(),m,n);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;}
  function loop(p,points,r,m,n=8){for(let i=1;i<points.length;i++)bar(p,points[i-1],points[i],r,m,n);}
  function torus(p,x,y,z,r,t,m){return obj(p,geom('t'+[r,t],()=>new T.TorusGeometry(r,t,8,36)),m,x,y,z);}
  function face(p,points,m){const pts=[];for(let i=1;i<points.length-1;i++)pts.push(...points[0],...points[i],...points[i+1]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.computeVertexNormals();const o=obj(p,g,m);o.material.side=T.DoubleSide;return o;}
  const mergedMats=new Map();
  function pack(p){
    const batches=new Map();
    for(const o of [...p.children]){
      if(!o.isMesh||o.isInstancedMesh||o.material.map||o.material.transparent||o.material.userData.keep)continue;
      const m=o.material,key=[m.roughness,m.metalness,m.side,m.flatShading,!!m.emissive?.getHex()].join('/');
      if(!batches.has(key))batches.set(key,{m,pts:[],norm:[],clr:[],uv:[],idx:[]});
      const b=batches.get(key),g=o.geometry,attr=g.attributes,off=b.pts.length/3;
      o.updateMatrix();const norm=new T.Matrix3().getNormalMatrix(o.matrix),v=new T.Vector3(),co=new T.Color();
      for(let i=0;i<attr.position.count;i++){
        v.fromBufferAttribute(attr.position,i).applyMatrix4(o.matrix);b.pts.push(v.x,v.y,v.z);
        v.fromBufferAttribute(attr.normal,i).applyMatrix3(norm).normalize();b.norm.push(v.x,v.y,v.z);
        co.copy(m.color);if(attr.color){co.r*=attr.color.getX(i);co.g*=attr.color.getY(i);co.b*=attr.color.getZ(i);}
        b.clr.push(co.r,co.g,co.b);b.uv.push(attr.uv?attr.uv.getX(i):0,attr.uv?attr.uv.getY(i):0);
      }
      if(g.index)for(let j=0;j<g.index.count;j++)b.idx.push(off+g.index.getX(j));else for(let j=0;j<attr.position.count;j++)b.idx.push(off+j);
      p.remove(o);
    }
    for(const [key,b] of batches){
      const g=new T.BufferGeometry();for(const [n,a,k] of [['position',b.pts,3],['normal',b.norm,3],['color',b.clr,3],['uv',b.uv,2]])g.setAttribute(n,new T.Float32BufferAttribute(a,k));g.setIndex(b.idx);g.computeBoundingSphere();
      if(!mergedMats.has(key)){const m=b.m.clone();m.color.set(0xffffff);m.vertexColors=true;mergedMats.set(key,m);}obj(p,g,mergedMats.get(key));
    }return p;
  }
  return {T,rand,rough,mat,group,obj,box,soft,cyl,ball,bar,loop,torus,face,pack,canvasTex,dummy};
})();
