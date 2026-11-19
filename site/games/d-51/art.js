/* Local mesh and surface workshop. The only bitmaps are generated material maps. */
const Art=(()=>{
  const T=THREE,PI=Math.PI,TAU=PI*2;
  let seed=81377;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  const geo=new Map(),mats=new Map();
  function cached(id,fn){if(!geo.has(id))geo.set(id,fn());return geo.get(id)}
  function texture(fn,size=128){const c=document.createElement('canvas');c.width=c.height=size;fn(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
  const rough=texture((ctx,n)=>{const im=ctx.createImageData(n,n);for(let i=0;i<im.data.length;i+=4){const v=225+random()*30;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}ctx.putImageData(im,0,0)});rough.colorSpace=T.NoColorSpace;
  function mat(color,roughness=.58,metalness=0,extra={}){const key=[color,roughness,metalness,JSON.stringify(extra)].join('/');if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,...extra}));return mats.get(key)}
  function group(parent,x=0,y=0,z=0){const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g}
  function mesh(parent,geometry,m,x,y,z){const o=new T.Mesh(geometry,m);parent.add(o);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;return o}
  function box(p,x,y,z,w,h,d,m,r=0){
    const id=['b',w,h,d,r].join('/');const g=cached(id,()=>{
      if(!r)return new T.BoxGeometry(w,h,d);
      const radius=Math.min(w/2,h/2,d/2,r),n=7,g=new T.BoxGeometry(2,2,2,n,n,n);
      const a=g.attributes.position,nor=g.attributes.normal,v=new T.Vector3();
      for(let i=0;i<a.count;i++){
        const coords=[a.getX(i),a.getY(i),a.getZ(i)],q=coords.map(k=>Math.sign(k)*Math.max(0,(Math.abs(k)*n-1)/(n-1)));
        v.fromArray(q).normalize();nor.setXYZ(i,v.x,v.y,v.z);
        a.setXYZ(i,...[w,h,d].map((sz,k)=>Math.sign(coords[k])*(sz/2-radius)+v.getComponent(k)*radius))}
      return g});return mesh(p,g,m,x,y,z)
  }
  function cyl(p,x,y,z,rt,rb,h,m,segments=24){return mesh(p,cached(['c',rt,rb,h,segments].join(),()=>new T.CylinderGeometry(rt,rb,h,segments)),m,x,y,z)}
  function ball(p,x,y,z,rx,ry,rz,m){const o=mesh(p,cached('ball',()=>new T.SphereGeometry(1,20,14)),m,x,y,z);o.scale.set(rx,ry,rz);return o}
  function rod(p,a,b,r,m,r2=r,n=10){const start=new T.Vector3(...a),end=new T.Vector3(...b),v=end.clone().sub(start),mid=start.add(end).multiplyScalar(.5);
    const o=cyl(p,mid.x,mid.y,mid.z,r2,r,v.length(),m,n);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o}
  function wire(p,pts,r,m,n=32){const path=new T.CatmullRomCurve3(pts.map(a=>new T.Vector3(...a)));return mesh(p,new T.TubeGeometry(path,n,r,6,false),m,0,0,0)}
  function ring(p,x,y,z,rad,tube,m){return mesh(p,cached(['r',rad,tube].join(),()=>new T.TorusGeometry(rad,tube,7,42)),m,x,y,z)}
  function poly(p,pts,z,d,m,bevel=0){const sh=new T.Shape();sh.moveTo(...pts[0]);pts.slice(1).forEach(v=>sh.lineTo(...v));sh.closePath();return mesh(p,new T.ExtrudeGeometry(sh,{depth:d,bevelEnabled:!!bevel,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2}),m,0,0,z)}
  function disk(p,x,y,z,r,d,m){const o=cyl(p,x,y,z,r,r,d,m,40);o.rotation.x=PI/2;return o}
  function markDynamic(o){o.userData.dynamic=true;return o}
  // Bake static construction by material. Moving assemblies are baked separately in local coordinates.
  function bake(root){root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),sets=new Map(),nodes=[];
    function visit(o){if(o.userData.dynamic)return;if(o.isMesh&&!Array.isArray(o.material)&&!o.material.transparent){
      const k=o.material.uuid+o.castShadow+o.receiveShadow;if(!sets.has(k))sets.set(k,[]);sets.get(k).push(o);nodes.push(o)}
      for(const c of o.children)visit(c)}
    root.children.forEach(visit);
    for(const list of sets.values()){if(list.length<2)continue;
      const pos=[],nor=[],uv=[],indices=[];let offset=0;const vec=new T.Vector3();
      for(const o of list){const g=o.geometry,a=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,transform=inv.clone().multiply(o.matrixWorld),normal=new T.Matrix3().getNormalMatrix(transform);
        for(let i=0;i<a.count;i++){vec.fromBufferAttribute(a,i).applyMatrix4(transform);pos.push(vec.x,vec.y,vec.z);
          vec.fromBufferAttribute(n,i).applyMatrix3(normal).normalize();nor.push(vec.x,vec.y,vec.z);uv.push(u?u.getX(i):0,u?u.getY(i):0)}
        if(g.index)for(const j of g.index.array)indices.push(j+offset);else for(let j=0;j<a.count;j++)indices.push(j+offset);
        offset+=a.count;o.parent.remove(o)}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingSphere();
      const o=mesh(root,g,list[0].material,0,0,0);o.castShadow=list[0].castShadow;o.receiveShadow=list[0].receiveShadow}
  }
  function grain(base,spread=8,kind='stone'){const t=texture((ctx,n)=>{const col=new T.Color(base),hex=col.getHexString(),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)),im=ctx.createImageData(n,n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4;
      const v=(random()-.5)*spread+(kind==='wood'?Math.sin(y*.9+Math.sin(x*.025)*1.1)*4+Math.sin(y*.225)*4:0);
      for(let c=0;c<3;c++)im.data[i+c]=rgb[c]+v;im.data[i+3]=255}ctx.putImageData(im,0,0);
      if(kind==='stone')for(let i=0;i<n*1.5;i++){ctx.fillStyle=random()>.5?'#fff3':'#1c1b191a';ctx.fillRect(random()*n,random()*n,1+random()*2,1)}});return new T.MeshStandardMaterial({map:t,roughnessMap:rough,roughness:.84})}
  const contactMap=texture((c,n)=>{const g=c.createRadialGradient(n/2,n/2,1,n/2,n/2,n/2);g.addColorStop(0,'rgba(35,30,20,.69)');g.addColorStop(.52,'rgba(35,30,20,.33)');g.addColorStop(1,'rgba(35,30,20,0)');c.fillStyle=g;c.fillRect(0,0,n,n)});
  function contact(p,x,y,z,w,d){const m=new T.MeshStandardMaterial({map:contactMap,transparent:true,depthWrite:false,roughness:1});const o=mesh(p,new T.PlaneGeometry(w,d),m,x,y,z);o.rotation.x=-PI/2;return o}
  return {T,PI,TAU,random,rough,texture,mat,group,mesh,box,cyl,ball,rod,wire,ring,poly,disk,markDynamic,bake,grain,contact};
})();
