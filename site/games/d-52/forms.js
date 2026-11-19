/* Metre-scale solid parts. A shared, fixed grain breaks up each surface's roughness. */
'use strict';
const Forms = (() => {
  const T=THREE, tau=Math.PI*2, v=(x,y,z)=>new T.Vector3(x,y,z);
  let seed=94713;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const gr=new Uint8Array(64*64*4);
  for(let i=0;i<gr.length;i+=4){let a=222+Math.floor(rand()*33);gr.set([a,a,a,255],i);}
  const grain=new T.DataTexture(gr,64,64);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearFilter;grain.repeat.set(3,3);grain.needsUpdate=true;
  function mat(rough,metal=0,other={}){return new T.MeshStandardMaterial({roughness:rough,metalness:metal,roughnessMap:grain,...other});}
  const M={
    paint:mat(.45,.14), shell:mat(.30,.28), steel:mat(.28,.72), brass:mat(.26,.78), wood:mat(.63),
    stone:mat(.86), foliage:mat(.9), cloth:mat(.76,0,{side:T.DoubleSide}), leather:mat(.5,.03),
    glass:mat(.13,.48,{transparent:true,opacity:.27,depthWrite:false}), porcelain:mat(.26,.08),
    glow:mat(.24,.12,{emissive:0xffc67c,emissiveIntensity:1.2}),
  };
  const boxG=new T.BoxGeometry(1,1,1), ballG=new T.SphereGeometry(1,20,12);
  const cache=new Map();
  function geom(key,fn){if(!cache.has(key))cache.set(key,fn());return cache.get(key);}
  function group(parent){const g=new T.Group();if(parent)parent.add(g);return g;}
  function part(p,g,m,c,x=0,y=0,z=0,sx=1,sy=1,sz=1){
    const o=new T.Mesh(g,m);o.userData.tint=c;o.position.set(x,y,z);o.scale.set(sx,sy,sz);p.add(o);return o;
  }
  function box(p,m,c,x,y,z,w,h,d){return part(p,boxG,m,c,x,y,z,w,h,d);}
  function ball(p,m,c,x,y,z,rx,ry=rx,rz=rx){return part(p,ballG,m,c,x,y,z,rx,ry,rz);}
  function cylinder(p,m,c,x,y,z,top,base,h,n=24){
    const a=Math.max(top,base), ratio=(top>=base?base:top)/a,flip=top<base;
    const geo=geom('cy'+ratio.toFixed(4)+'/'+n,()=>new T.CylinderGeometry(1,ratio,1,n));
    const o=part(p,geo,m,c,x,y,z,a,h,a);if(flip)o.rotation.x=Math.PI;return o;
  }
  function rod(p,m,c,a,b,r,n=10){
    const d=v(...b).sub(v(...a)),mid=d.clone().multiplyScalar(.5).add(v(...a));
    const o=cylinder(p,m,c,mid.x,mid.y,mid.z,r,r,d.length(),n);o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o;
  }
  function torus(p,m,c,x,y,z,r,tube,n=64){
    const g=geom('ring'+(tube/r).toFixed(4)+'/'+n,()=>new T.TorusGeometry(1,tube/r,10,n));
    return part(p,g,m,c,x,y,z,r,r,r);
  }
  function line(p,m,c,points,r,n=8){
    const curve=new T.CatmullRomCurve3(points.map(a=>v(...a)));
    return part(p,new T.TubeGeometry(curve,Math.max(12,points.length*4),r,n,false),m,c);
  }
  function rrshape(w,h,r){
    const s=new T.Shape(),x=-w/2,y=-h/2;
    r=Math.min(r,w/2,h/2);s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);
    s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  }
  function plate(p,m,c,x,y,z,w,h,d,r){
    const key='p'+[w,h,d,r].join('/');
    const g=geom(key,()=>{const a=new T.ExtrudeGeometry(rrshape(w,h,r),{depth:d,bevelEnabled:true,bevelThickness:Math.min(d*.2,r*.22),bevelSize:Math.min(d*.2,r*.22),bevelSegments:3,curveSegments:8});a.translate(0,0,-d/2);return a;});
    return part(p,g,m,c,x,y,z);
  }
  function mesh(p,m,c,verts,indices){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));const uv=[];for(let i=0;i<verts.length;i+=3)uv.push(verts[i]+.31*verts[i+2],verts[i+1]+.57*verts[i+2]);
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    return part(p,g,m,c);
  }
  // Batch fixed parts in their owner's coordinates, retaining real material responses.
  function pack(root,shadows=true) {
    root.updateWorldMatrix(true,true);
    const inv=root.matrixWorld.clone().invert(),bins=new Map(),remove=[];
    root.traverse(o=>{
      if(!o.isMesh||o.isInstancedMesh)return;
      const key=o.geometry.uuid+o.material.uuid;
      if(!bins.has(key))bins.set(key,{g:o.geometry,m:o.material,items:[]});
      bins.get(key).items.push([new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),o.userData.tint??0xffffff]);remove.push(o);
    });
    remove.forEach(o=>o.removeFromParent());
    bins.forEach(({g,m,items})=>{
      const ob=new T.InstancedMesh(g,m,items.length);
      items.forEach(([matrix,color],i)=>{ob.setMatrixAt(i,matrix);ob.setColorAt(i,new T.Color(color));});
      ob.castShadow=shadows&&!m.transparent;ob.receiveShadow=!m.transparent;root.add(ob);
    });
    return root;
  }

  // Identical fittings on independently moving carriers share one set of GPU draws.
  function carriers(parent,items){
    const groups=new Map(),local=new T.Matrix4(),result=new T.Matrix4(),color=new T.Color();
    items.filter(Boolean).forEach(owner=>{
      owner.children.filter(o=>o.isInstancedMesh).forEach(o=>{
        const key=o.geometry.uuid+o.material.uuid;
        if(!groups.has(key))groups.set(key,{g:o.geometry,m:o.material,parts:[]});
        const bin=groups.get(key);
        for(let i=0;i<o.count;i++){
          o.getMatrixAt(i,local);o.getColorAt(i,color);
          bin.parts.push({owner,local:local.clone(),color:color.clone()});
        }
        owner.remove(o);o.dispose();
      });
    });
    groups.forEach(bin=>{
      bin.batch=new T.InstancedMesh(bin.g,bin.m,bin.parts.length);bin.batch.castShadow=!bin.m.transparent;
      bin.batch.receiveShadow=true;bin.batch.frustumCulled=false;
      bin.batch.instanceMatrix.setUsage(T.DynamicDrawUsage);
      bin.parts.forEach((p,i)=>bin.batch.setColorAt(i,p.color));parent.add(bin.batch);
    });
    return ()=>{
      items.forEach(o=>{if(o)o.updateMatrix();});
      groups.forEach(bin=>{bin.parts.forEach((p,i)=>bin.batch.setMatrixAt(i,result.multiplyMatrices(p.owner.matrix,p.local)));bin.batch.instanceMatrix.needsUpdate=true;});
    };
  }
  return {carriers,T,tau,v,rand,mat,M,group,part,box,ball,cylinder,rod,torus,line,plate,rrshape,mesh,pack,geom};
})();
