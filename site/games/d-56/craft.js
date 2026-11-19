'use strict';
const Craft=(()=>{
  const T=THREE,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), TAU=Math.PI*2;
  const rng=GardenPhysics.random(78419), range=(a,b)=>a+(b-a)*rng();
  function texture(size,draw,repeat=1,color=false){
    const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);
    const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);
    if(color)t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
  }
  const rough=texture(128,(c,n)=>{
    c.fillStyle='#ededed';c.fillRect(0,0,n,n);
    for(let i=0;i<5400;i++){let k=Math.floor(range(183,251));c.fillStyle='rgb('+[k,k,k]+')';c.fillRect(rng()*n,rng()*n,range(.5,2),range(.6,3));}
  },2);
  const mat=(color,roughness=.7,metalness=0,opts={})=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,...opts});
  function group(parent){const g=new T.Group();if(parent)parent.add(g);return g;}
  function mesh(p,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
  function box(p,x,y,z,w,h,d,m){return mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);}
  function ell(p,x,y,z,rx,ry,rz,m,n=16){const o=mesh(p,new T.SphereGeometry(1,n,Math.max(5,Math.round(n*.6))),m,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function cyl(p,x,y,z,r1,r2,h,m,n=20){return mesh(p,new T.CylinderGeometry(r1,r2,h,n),m,x,y,z);}
  function rod(p,a,b,r,m,r2=r,n=10){
    const av=V(...a),bv=V(...b),v=bv.clone().sub(av),mid=av.clone().add(bv).multiplyScalar(.5);
    const o=cyl(p,mid.x,mid.y,mid.z,r2,r,v.length(),m,n);
    o.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return o;
  }
  function tor(p,x,y,z,r,t,m,axis='z',n=48){
    const o=mesh(p,new T.TorusGeometry(r,t,9,n),m,x,y,z);if(axis==='y')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.y=Math.PI/2;return o;
  }
  function tube(p,pts,r,m,n=28,ring=8,closed=false){
    const curve=new T.CatmullRomCurve3(pts.map(q=>V(...q)),closed,'centripetal');
    return mesh(p,new T.TubeGeometry(curve,n,r,ring,closed),m);
  }
  function lathe(p,profile,m,segments=60){
    return mesh(p,new T.LatheGeometry(profile.map(q=>new T.Vector2(...q)),segments),m);
  }
  function buffer(pos,colors,uvs,ids){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    if(colors)geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    if(uvs)geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    if(ids)geo.setIndex(ids);geo.computeVertexNormals();return geo;
  }
  // Bake rigid subassemblies once. Moving hinges, wheels and fluid retain their own meshes.
  function batch(parent){
    parent.updateWorldMatrix(true,true);
    const inv=parent.matrixWorld.clone().invert(),buckets=new Map(),old=[];
    parent.traverse(o=>{
      if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;
      const m=o.material,k=m.uuid+o.castShadow+o.receiveShadow;
      if(!buckets.has(k))buckets.set(k,{m,cast:o.castShadow,receive:o.receiveShadow,pos:[],nor:[],uv:[],col:[],idx:[]});
      const b=buckets.get(k),g=o.geometry,mat4=inv.clone().multiply(o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(mat4);
      const a=g.attributes,base=b.pos.length/3,v=V();
      for(let i=0;i<a.position.count;i++){
        v.fromBufferAttribute(a.position,i).applyMatrix4(mat4);b.pos.push(v.x,v.y,v.z);
        v.fromBufferAttribute(a.normal,i).applyMatrix3(nm).normalize();b.nor.push(v.x,v.y,v.z);
        b.uv.push(a.uv?a.uv.getX(i):0,a.uv?a.uv.getY(i):0);
        if(a.color)b.col.push(a.color.getX(i),a.color.getY(i),a.color.getZ(i));
      }
      if(g.index){for(let i=0;i<g.index.count;i++)b.idx.push(base+g.index.getX(i));}
      else for(let i=0;i<a.position.count;i++)b.idx.push(base+i);
      old.push(o);
    });
    old.forEach(o=>o.removeFromParent());
    for(const b of buckets.values()){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.pos,3));
      g.setAttribute('normal',new T.Float32BufferAttribute(b.nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));
      if(b.col.length)g.setAttribute('color',new T.Float32BufferAttribute(b.col,3));g.setIndex(b.idx);
      const o=mesh(parent,g,b.m);o.castShadow=b.cast;o.receiveShadow=b.receive;
    }
  }
  function inst(p,geo,m,n,shadows=false){
    const o=new T.InstancedMesh(geo,m,n);o.count=0;o.receiveShadow=true;o.castShadow=shadows;o.frustumCulled=false;p.add(o);return o;
  }
  return {T,V,TAU,rng,range,texture,rough,mat,group,mesh,box,ell,cyl,rod,tor,tube,lathe,buffer,batch,inst};
})();
