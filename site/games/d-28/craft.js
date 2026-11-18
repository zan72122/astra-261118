'use strict';
const Craft = (() => {
  const T=THREE, tau=Math.PI*2;
  let seed=618933;
  const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const vec=(x,y,z)=>new T.Vector3(x,y,z);
  function group(parent,x=0,y=0,z=0){const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;}
  function mesh(parent,geo,mat,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);m.castShadow=m.receiveShadow=true;return m;}
  function texture(w,h,fn){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d');fn(ctx,w,h);
    const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
  }
  const patina=texture(128,128,(c,w,h)=>{
    const im=c.createImageData(w,h);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const k=(j*w+i)*4,v=220+15*Math.sin(i*.04+Math.sin(j*.07))+17*rnd();
      im.data[k]=im.data[k+1]=im.data[k+2]=v;im.data[k+3]=255;
    }c.putImageData(im,0,0);
  });
  function grain(){
    const tex=texture(768,256,(c,w,h)=>{
      const im=c.createImageData(w,h), fibers=Array.from({length:256},()=>rnd());
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const u=x/w*tau,v=y/h*tau;
        const flow=v+.11*Math.sin(u+.8*Math.cos(v*2))+.055*Math.cos(u*2-v);
        const ring=Math.sin(flow*19+2.5*Math.sin(flow*4)), streak=Math.pow(.5+.5*Math.cos(flow*68+Math.sin(u*2)),9);
        const l=.75+.11*ring+.06*Math.sin(5*flow)+.065*fibers[Math.floor((flow/tau+2)*256)%256]-.074*streak+.036*rnd();
        const k=(y*w+x)*4;im.data[k]=255*l;im.data[k+1]=245*l;im.data[k+2]=229*l;im.data[k+3]=255;
      }c.putImageData(im,0,0);
    });tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  const woodGrain=grain();
  function mat(color,metalness=0,roughness=.48,more={}){
    return new T.MeshStandardMaterial({color,metalness,roughness,roughnessMap:patina,...more});
  }
  const M={
    walnut:mat(0xa2633d,.015,.36,{map:woodGrain}),edge:mat(0x633c2a,.02,.31,{map:woodGrain}),
    cherry:mat(0xb47d50,.03,.3,{map:woodGrain}), gold:mat(0xeac175,.78,.235),
    brass:mat(0xc49047,.86,.24),old:mat(0x866033,.75,.34), dark:mat(0x363d3a,.67,.27),
    ivory:mat(0xf6e9c8,.06,.36),cream:mat(0xfff1dd,.04,.295),sky:mat(0x82acad,.06,.44),
    blue:mat(0x477c83,.07,.47), deep:mat(0x355a62,.09,.45), silver:mat(0xd9dfd6,.86,.22),
    rose:mat(0xd69a89,.16,.37),hair:mat(0x805638,.12,.29), umber:mat(0x634536,.1,.34),
    pale:mat(0xbbd4cc,.12,.38),sea:mat(0x7faeaf,.36,.17),pearl:mat(0xffe6ae,.18,.24),
    shine:mat(0xffe2a0,.25,.23,{emissive:0xffc778,emissiveIntensity:.37})
  };
  const ballGeo=new T.SphereGeometry(1,24,16),beadGeo=new T.SphereGeometry(1,14,10);
  function ball(p,m,x,y,z,a,b=a,c=a){const o=mesh(p,Math.max(a,b,c)<.22?beadGeo:ballGeo,m,x,y,z);o.scale.set(a,b,c);return o;}
  function block(p,m,x,y,z,w,h,d){return mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);}
  function cyl(p,m,x,y,z,top,bottom,h,n=48){return mesh(p,new T.CylinderGeometry(top,bottom,h,n),m,x,y,z);}
  function axle(p,m,x,y,z,r,len,axis='x',r2=r){
    const o=cyl(p,m,x,y,z,r,r2,len);o.rotation[axis==='x'?'z':'x']=Math.PI/2;return o;
  }
  function rod(p,m,a,b,r,r2=r,n=12){
    const A=vec(...a),B=vec(...b),d=B.clone().sub(A),center=A.add(B).multiplyScalar(.5);
    const o=cyl(p,m,center.x,center.y,center.z,r2,r,d.length(),n);o.quaternion.setFromUnitVectors(vec(0,1,0),d.normalize());return o;
  }
  function wire(p,m,coords,r=.012,closed=false,quality=0){
    const curve=new T.CatmullRomCurve3(coords.map(q=>vec(...q)),closed);
    return mesh(p,new T.TubeGeometry(curve,quality||Math.max(12,coords.length*4),r,6,closed),m);
  }
  function ring(p,m,x,y,z,rx,ry,g,plane='xy'){
    const o=mesh(p,new T.TorusGeometry(1,g/Math.max(rx,ry),9,72),m,x,y,z);o.scale.set(rx,ry,Math.max(rx,ry));if(plane==='xz')o.rotation.x=Math.PI/2;return o;
  }
  function shape(p,m,s,depth=.04,bevel=.015){
    const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:15});
    geo.translate(0,0,-depth/2);return mesh(p,geo,m);
  }
  function rect(w,h,r){
    const a=w/2,b=h/2,s=new T.Shape();
    s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);return s;
  }
  function panel(p,m,x,y,z,w,h,d,r=.15,b=.025,horizontal=false){
    const o=shape(p,m,rect(w,h,r),d,b);o.position.set(x,y,z);if(horizontal)o.rotation.x=-Math.PI/2;
    const pos=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=o.geometry.attributes.uv;
    for(let i=0;i<pos.count;i++){
      const xx=pos.getX(i),yy=pos.getY(i),zz=pos.getZ(i);
      uv.setXY(i,Math.abs(n.getX(i))>.72?yy/3.5:xx/3.5,Math.abs(n.getZ(i))>.5?yy/1.5:zz*1.8);
    }return o;
  }
  function profile(p,m,points,x=0,y=0,z=0){
    return mesh(p,new T.LatheGeometry(points.map(a=>new T.Vector2(...a)),64),m,x,y,z);
  }
  function outline(p,m,s,z,r){
    wire(p,m,s.getSpacedPoints(100).slice(0,-1).map(v=>[v.x,v.y,z]),r,true,150);
  }
  function star(p,m,x,y,z,r,points=4){
    const s=new T.Shape();for(let i=0;i<points*2;i++){const a=Math.PI/2+i*Math.PI/points,l=i%2?r*.27:r;s[i?'lineTo':'moveTo'](Math.cos(a)*l,Math.sin(a)*l);}s.closePath();
    const o=shape(p,m,s,.012,.003);o.position.set(x,y,z);return o;
  }
  function crescent(p,m,x,y,z,r){
    const s=new T.Shape();s.moveTo(.32*r,.93*r);s.bezierCurveTo(-1.1*r,1.08*r,-1.29*r,-.78*r,-.06*r,-r);
    s.bezierCurveTo(.36*r,-1.06*r,.73*r,-.79*r,.9*r,-.47*r);s.bezierCurveTo(-.18*r,-.88*r,-.62*r,.37*r,.32*r,.93*r);
    const o=shape(p,m,s,.035,.012);o.position.set(x,y,z);return o;
  }
  function bloom(p,x,y,z,r,petal=M.ivory,center=M.gold,count=7){
    for(let i=0;i<count;i++){const a=i*tau/count,o=ball(p,petal,x+Math.sin(a)*r*.53,y+Math.cos(a)*r*.53,z,r*.245,r*.50,r*.13);o.rotation.z=-a;}
    ball(p,center,x,y,z+.018,r*.24,r*.24,r*.2);
  }
  function sprig(p,x,y,z,sign,scale=1,metal=M.gold){
    const g=group(p,x,y,z);g.scale.set(sign*scale,scale,scale);
    const path=[[0,0,0],[.25,.05,.018],[.52,.23,.018],[.76,.46,.014],[.93,.67,0]];
    wire(g,metal,path,.013);
    for(let i=1;i<=6;i++){
      const f=i/7,xx=f*.94,yy=.66*f*f;
      for(const k of [-1,1]){
        const leaf=ball(g,metal,xx+(k<0?.07:-.04),yy+(k<0?-.025:.085),.012,.038,.104,.014);
        leaf.rotation.z=k<0?-1.22:.42;
      }
    }return g;
  }
  // Consolidate rigid ornament pieces once. Moving assemblies keep their own transform.
  function bake(g){
    g.updateWorldMatrix(true,true);
    const inv=g.matrixWorld.clone().invert(),parts=new Map();
    const objects=[];g.traverse(o=>{if(o.isMesh)objects.push(o);});
    for(const o of objects){
      if(!parts.has(o.material))parts.set(o.material,[]);
      const geo=o.geometry.clone(),matrix=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);
      geo.applyMatrix4(matrix);
      if(!geo.index)geo.setIndex(Array.from({length:geo.attributes.position.count},(_,i)=>i));
      if(matrix.determinant()<0){
        const idx=geo.index.array;
        for(let i=0;i<idx.length;i+=3){const j=idx[i];idx[i]=idx[i+1];idx[i+1]=j;}
      }
      parts.get(o.material).push(geo);
    }
    g.clear();
    for(const [m,geos] of parts){
      const geo=new T.BufferGeometry();
      for(const name of ['position','normal','uv']){
        const n=name==='uv'?2:3,arr=new Float32Array(geos.reduce((v,a)=>v+a.attributes.position.count*n,0));let offset=0;
        for(const a of geos){if(a.attributes[name])arr.set(a.attributes[name].array,offset);offset+=a.attributes.position.count*n;}
        geo.setAttribute(name,new T.BufferAttribute(arr,n));
      }
      const count=geos.reduce((v,a)=>v+a.index.count,0),indices=new Uint32Array(count);
      let base=0,n=0;
      for(const a of geos){
        for(const i of a.index.array)indices[n++]=i+base;
        base+=a.attributes.position.count;
      }
      geo.setIndex(new T.BufferAttribute(base<65536?new Uint16Array(indices):indices,1));
      mesh(g,geo,m);geos.forEach(a=>a.dispose());
    }return g;
  }
  return {T,tau,rnd,vec,group,mesh,texture,mat,M,woodGrain,ball,block,cyl,axle,rod,wire,ring,shape,rect,panel,profile,outline,star,crescent,bloom,sprig,bake};
})();
