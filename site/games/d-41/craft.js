'use strict';
const Craft=(()=>{
  const T=THREE, rand=WindowPhysics.random(4180), PI=Math.PI,V=(x,y,z)=>new T.Vector3(x,y,z);
  const group=(p,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};
  function hash(x,y){let v=Math.imul(x,374761393)+Math.imul(y,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;}
  function noise(x,y){const i=Math.floor(x),j=Math.floor(y);let a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);return (hash(i,j)*(1-a)+hash(i+1,j)*a)*(1-b)+(hash(i,j+1)*(1-a)+hash(i+1,j+1)*a)*b;}
  function texture(w,h,func,srgb=false){const a=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=4*(y*w+x),c=func(x/w,y/h,x,y);for(let j=0;j<3;j++)a[k+j]=Math.max(0,Math.min(255,c[j]));a[k+3]=255;}const t=new T.DataTexture(a,w,h);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;if(srgb)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;}
  const rough=texture(64,64,(u,v,x,y)=>{const n=226+22*noise(x*.22,y*.22)+7*hash(x,y);return [n,n,n];});
  function mat(color,r=.63,m=0,extra={}){return new T.MeshStandardMaterial({color,roughness:r,metalness:m,roughnessMap:rough,...extra});}
  function timber(horizontal=false){
    return texture(256,256,(u,v,x,y)=>{
      if(horizontal)[u,v]=[v,u];
      const wobble=.012*Math.sin(v*6.28)+.018*noise(u*7,v*3);
      const ring=u+wobble+.011*Math.sin(v*10+u*14);
      const n=.48*noise(ring*84,v*3)+.24*noise(ring*370,v*12)+.18*noise(u*9,v*2)+.10*hash(x,y);
      const vein=Math.pow(.5+.5*Math.sin(440*ring+2.2*Math.sin(v*5)),12);
      return [172+57*n-16*vein,123+58*n-21*vein,77+57*n-18*vein];
    },true);
  }
  const wv=timber(),wh=timber(true);
  const M={
    wood:mat(0xf4d4ad,.44,0,{map:wv}),cross:mat(0xf4d4ad,.44,0,{map:wh}),dark:mat(0xa8794e,.5,0,{map:wv}),edge:mat(0xd7a270,.36,0,{map:wh}),
    brass:mat(0xb79454,.29,.77),gold:mat(0xe5bf74,.24,.72),iron:mat(0x3c4946,.44,.65),rubber:mat(0x273330,.76),
    white:mat(0xf0e7d1,.5),sage:mat(0x80988a,.35,.2),cream:mat(0xe5d8b9,.62),
    orange:mat(0xb7613d,.46),steel:mat(0xc0c5ba,.22,.88),water:mat(0x729f9e,.105,.52),
    plaster:mat(0xd7d2bb,.93),panel:mat(0x99a49a,.64),trim:mat(0xbdc4ae,.54),bolt:mat(0x716f5c,.33,.8),
    leaf:mat(0xffffff,.8,0,{vertexColors:false}),stone:mat(0xbdb7a4,.84)
  };
  const boxGeo=new T.BoxGeometry(),ballGeo=new T.SphereGeometry(1,20,14);
  function mesh(p,geo,material,x=0,y=0,z=0){
    if(!geo.hasAttribute('uv')){
      const a=geo.getAttribute('position'),uv=new Float32Array(a.count*2);
      for(let i=0;i<a.count;i++){uv[i*2]=a.getX(i)*.33+a.getZ(i)*.09;uv[i*2+1]=a.getY(i)*.38+a.getZ(i)*.26;}
      geo.setAttribute('uv',new T.BufferAttribute(uv,2));
    }
    const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;}
  function box(p,x,y,z,w,h,d,m){const o=mesh(p,boxGeo,m,x,y,z);o.scale.set(w,h,d);return o;}
  function ball(p,x,y,z,a,b,c,m){const o=mesh(p,ballGeo,m,x,y,z);o.scale.set(a,b,c);return o;}
  function cyl(p,x,y,z,r1,r2,h,m,n=32){return mesh(p,new T.CylinderGeometry(r1,r2,h,n),m,x,y,z);}
  function rod(p,a,b,r,m,r2=r,n=12){const v=V(...b).sub(V(...a)),c=cyl(p,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r2,r,v.length(),m,n);c.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return c;}
  function line(p,pts,r,m,smooth=true){
    const a=pts.map(q=>V(...q));if(a.length===2)return rod(p,pts[0],pts[1],r,m);
    const path=smooth?new T.CatmullRomCurve3(a):new T.CurvePath();
    if(!smooth)for(let i=1;i<a.length;i++)path.add(new T.LineCurve3(a[i-1],a[i]));
    return mesh(p,new T.TubeGeometry(path,Math.max(8,a.length*4),r,8,false),m);
  }
  function tor(p,x,y,z,R,r,m,horiz=false){const o=mesh(p,new T.TorusGeometry(R,r,10,64),m,x,y,z);if(horiz)o.rotation.x=PI/2;return o;}
  function shape(p,s,d,m,x=0,y=0,z=0,b=.012){return mesh(p,new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:28}),m,x,y,z);}
  function round(p,x,y,z,w,h,d,r,m,b=.008){
    r=Math.min(r,w*.49,h*.49);let l=-w/2,t=h/2,e=w/2,u=-h/2;const s=new T.Shape();
    s.moveTo(l+r,u);s.lineTo(e-r,u);s.quadraticCurveTo(e,u,e,u+r);s.lineTo(e,t-r);s.quadraticCurveTo(e,t,e-r,t);
    s.lineTo(l+r,t);s.quadraticCurveTo(l,t,l,t-r);s.lineTo(l,u+r);s.quadraticCurveTo(l,u,l+r,u);
    return shape(p,s,d,m,x,y,z-d/2,b);
  }
  function lathe(p,x,y,z,profile,m){return mesh(p,new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(r,h)),64),m,x,y,z);}
  function disc(p,x,y,z,r,h,m){const d=cyl(p,x,y,z,r,r,h,m,48);d.rotation.x=PI/2;return d;}
  function screw(p,x,y,z,r=.028){disc(p,x,y,z,r,.012,M.brass);const cut=box(p,x,y,z+.008,r*1.2,r*.15,.002,M.bolt);cut.rotation.z=.55;}
  // Batch rigid assemblies in their own coordinates. Curves and material details stay geometric.
  function batch(g){
    g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),buckets=new Map();
    g.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.keep||Array.isArray(o.material))return;
      const key=o.material.uuid+o.castShadow+o.receiveShadow;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});
    for(const list of buckets.values()){
      if(list.length<2)continue;const data=[],norm=[],uv=[],col=[],hasColor=list[0].geometry.hasAttribute('color');
      for(const o of list){const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
        geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));
        for(const [name,out,size] of [['position',data,3],['normal',norm,3],['uv',uv,2],...(hasColor?[['color',col,3]]:[])]){
          const attr=geo.getAttribute(name);if(attr)for(const v of attr.array)out.push(v);else for(let k=0;k<geo.getAttribute('position').count*size;k++)out.push(0);
        }geo.dispose();o.removeFromParent();}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(hasColor)geo.setAttribute('color',new T.Float32BufferAttribute(col,3));
      const o=mesh(g,geo,list[0].material);o.castShadow=list[0].castShadow;o.receiveShadow=list[0].receiveShadow;
    }
  }
  return {T,PI,V,group,rand,hash,noise,texture,mat,M,mesh,box,ball,cyl,rod,line,tor,shape,round,lathe,disc,screw,batch};
})();
