'use strict';
const Craft=(()=>{
  const T=THREE,V=(x,y,z)=>new T.Vector3(x,y,z),rng=SandPhysics.random(19240);
  const grp=(parent)=>{const g=new T.Group();if(parent)parent.add(g);return g;};
  const unit=()=>rng()*2-1;
  function texture(size,paint,repeat=1){
    const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');
    paint(ctx,size);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;t.colorSpace=T.SRGBColorSpace;return t;
  }
  const noiseTile=Array.from({length:4096},()=>rng());
  function noise(x,y){
    const X=Math.floor(x),Y=Math.floor(y);let a=x-X,b=y-Y;a*=a*(3-2*a);b*=b*(3-2*b);
    const f=(i,j)=>noiseTile[((i%64+64)%64)+64*((j%64+64)%64)];
    return (f(X,Y)*(1-a)+f(X+1,Y)*a)*(1-b)+(f(X,Y+1)*(1-a)+f(X+1,Y+1)*a)*b;
  }
  function pixels(fn,size=256){
    return texture(size,(c,n)=>{const im=c.createImageData(n,n);for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const rgb=fn(i/n,j/n,i,j),k=4*(j*n+i);for(let b=0;b<3;b++)im.data[k+b]=rgb[b];im.data[k+3]=255;
    }c.putImageData(im,0,0);});
  }
  const rough=pixels(()=>{const v=226+unit()*24;return [v,v,v];},64);rough.colorSpace=T.NoColorSpace;
  const wood=pixels((u,v)=>{
    const warp=.024*Math.sin(2*Math.PI*u)+.022*Math.sin(4*Math.PI*u+2.3)+.034*(noise(u*4,v*6)-.5);
    const w=v+warp,ring=Math.pow(.5+.5*Math.cos(2*Math.PI*(w*15+noise(u*3,w*9)*1.7)),6);
    const fiber=noise(u*7,w*104)*14+noise(u*4,w*36)*10;
    const n=247-fiber-14*ring+unit()*4;return[n,n-3-ring*5,n-9-ring*8];
  },512);
  const sand=pixels((u,v)=>{const n=224+noise(u*9,v*9)*17+unit()*16-(rng()<.041?rng()*28:0);return [n,n-1.5,n-4];},256);
  const enamel=pixels((u,v)=>{const n=244+noise(u*9,v*12)*7+unit()*3;return[n,n,n];},128);
  function mat(color,roughness=.76,metalness=0,extra={}){
    return new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,...extra});
  }
  const m={
    timber:mat(0xb9855c,.76,0,{map:wood,bumpMap:wood,bumpScale:.024}),
    edge:mat(0xc79c72,.69,0,{map:wood,bumpMap:wood,bumpScale:.02}),
    log:mat(0x956844,.83,0,{map:wood}),oak:mat(0xc69a65,.62,0,{map:wood,bumpMap:wood,bumpScale:.01}),
    honey:mat(0xbb8753,.64,0,{map:wood}),rope:mat(0xc6b58b,.94),
    silver:mat(0xaab4ae,.35,.73),iron:mat(0x515d57,.5,.68),brass:mat(0xc1a16a,.34,.68),
    aqua:mat(0x6daca7,.34,.43,{map:enamel}),aquaEdge:mat(0x99c6bd,.29,.52),
    aquaDark:mat(0x426c69,.52,.44),green:mat(0x648977,.39,.37),
    orange:mat(0xc97954,.4,.4,{map:enamel}),orangeEdge:mat(0xd89c75,.36,.4),inside:mat(0x985b40,.58,.31),
    rubber:mat(0x404543,.88),paint:mat(0xd99c51,.31,.4),cream:mat(0xe6dac2,.35,.32),
    glass:new T.MeshPhysicalMaterial({color:0x446768,metalness:.35,roughness:.13,roughnessMap:rough,clearcoat:1}),
    lamp:mat(0xffe8b1,.18,.28),dark:mat(0x41473d,.91),sand:mat(0xe7c798,.95,0,{map:sand,bumpMap:sand,bumpScale:.015})
  };
  const cache=new Map();
  function geo(key,fn){if(!cache.has(key))cache.set(key,fn());return cache.get(key);}
  function mesh(parent,g,m,x=0,y=0,z=0){
    const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function rounded(w,h,d,r){
    r=Math.min(r,w*.48,h*.48,d*.48);
    const g=new T.BoxGeometry(w,h,d,8,8,8),p=g.attributes.position,n=g.attributes.normal;
    const soften=(t,half)=>{const v=Math.abs(t)/half;
      return Math.sign(t)*(v<.001?0:v<.3?(half-r)*.74:v<.6?half-r:v<.85?half-r*.35:half);};
    for(let i=0;i<p.count;i++){
      const x=soften(p.getX(i),w/2),y=soften(p.getY(i),h/2),z=soften(p.getZ(i),d/2);
      const a=SandPhysics.clamp(x,-w/2+r,w/2-r),b=SandPhysics.clamp(y,-h/2+r,h/2-r),c=SandPhysics.clamp(z,-d/2+r,d/2-r);
      const v=V(x-a,y-b,z-c).normalize();
      p.setXYZ(i,a+r*v.x,b+r*v.y,c+r*v.z);n.setXYZ(i,v.x,v.y,v.z);
    }return g;
  }
  function box(parent,w,h,d,r,material,x=0,y=0,z=0){
    return mesh(parent,geo(['b',w,h,d,r].join(),()=>r?rounded(w,h,d,r):new T.BoxGeometry(w,h,d)),material,x,y,z);
  }
  function ell(parent,x,y,z,rx,ry,rz,material){
    const o=mesh(parent,geo('ball',()=>new T.SphereGeometry(1,24,14)),material,x,y,z);o.scale.set(rx,ry,rz);return o;
  }
  function cyl(parent,top,bottom,len,material,x,y,z,seg=32,open=false){
    return mesh(parent,geo(['c',top,bottom,len,seg,open].join(),()=>new T.CylinderGeometry(top,bottom,len,seg,1,open)),material,x,y,z);
  }
  function stick(parent,a,b,r,material,rB=r,seg=12){
    const v=V(...b).sub(V(...a)),mid=V(...a).addScaledVector(v,.5);
    const o=cyl(parent,rB,r,v.length(),material,mid.x,mid.y,mid.z,seg);
    o.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return o;
  }
  function tube(parent,points,r,m,steps=32,sides=9){
    const path=new T.CatmullRomCurve3(points.map(p=>V(...p)));
    return mesh(parent,new T.TubeGeometry(path,steps,r,sides,false),m);
  }
  function ring(parent,r,thick,m,x,y,z,sx=1,sz=1){
    const o=mesh(parent,geo(['r',r,thick].join(),()=>new T.TorusGeometry(r,thick,9,72)),m,x,y,z);
    o.rotation.x=-Math.PI/2;o.scale.set(sx,sz,1);return o;
  }
  function lathe(parent,profile,m,x=0,y=0,z=0){
    return mesh(parent,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),64),m,x,y,z);
  }
  function disk(parent,r,h,material,y,sx=1,sz=1){const d=cyl(parent,r,r,h,material,0,y,0,64);d.scale.set(sx,1,sz);return d;}
  function bucket(){
    const g=grp();
    lathe(g,[[.012,0],[.5,0],[.525,.05],[.66,1.02],[.67,1.09]],m.orange);
    lathe(g,[[.65,1.08],[.50,.08],[.01,.08]],m.inside);
    ring(g,.66,.034,m.orangeEdge,0,1.08,0);ring(g,.51,.027,m.orangeEdge,0,.06,0);
    for(const yy of [.18,.26,.85])ring(g,.516+.138*yy,.009,m.orangeEdge,0,yy,0);
    const fill=ell(g,0,.24,0,.527,.094,.527,m.sand);
    g.userData.bail=grp(g);const bail=g.userData.bail;bail.position.y=.89;
    const pts=[];for(let i=0;i<=28;i++){const a=i*Math.PI/28;pts.push([.67*Math.cos(a),.87*Math.sin(a),0]);}
    tube(bail,pts,.024,m.silver);
    const handle=lathe(bail,[[.02,-.22],[.061,-.2],[.081,-.15],[.083,.14],[.06,.2],[.02,.22]],m.oak,0,.862,0);
    handle.rotation.z=Math.PI/2;
    for(const sg of [-1,1]){const riv=cyl(g,.083,.083,.061,m.silver,.655*sg,.89,0);riv.rotation.z=Math.PI/2;}
    return g;
  }
  function wateringCan(){
    const g=grp(),body=grp(g);body.scale.set(1.16,1,.81);
    lathe(body,[[.01,.02],[.58,.02],[.64,.09],[.65,.22],[.64,1.05],[.595,1.22],[.48,1.29],[.41,1.29]],m.aqua);
    lathe(body,[[.405,1.29],[.407,1.23],[.54,1.16],[.6,.17],[.03,.12]],m.aquaDark);
    ring(body,.41,.025,m.aquaEdge,0,1.29,0);
    for(const [y,r,t] of [[.073,.625,.026],[.19,.647,.012],[.25,.646,.011],[1.02,.641,.016],[1.105,.626,.013]])ring(body,r,t,m.aquaEdge,0,y,0);
    const waterGeo=new T.CircleGeometry(.429,42);waterGeo.rotateX(-Math.PI/2);
    const water=mesh(body,waterGeo,mat(0x548682,.14,.32),0,1.237,0);g.userData.pool=water;
    tube(g,[[.42,.37,0],[.91,.32,0],[1.15,.6,0],[1.18,1.02,0],[.96,1.3,0],[.55,1.23,0]],.081,m.aqua,48,12);
    tube(g,[[-.43,1.22,0],[-.405,1.55,0],[-.22,1.8,0],[.13,1.84,0],[.45,1.62,0],[.53,1.27,0]],.062,m.aquaEdge,36,12);
    stick(g,[-.5,.27,0],[-1.46,1.23,0],.183,m.aqua,.09,36);
    stick(g,[-.6,.75,0],[-.99,.83,0],.032,m.aquaEdge,.031);
    const rose=grp(g);rose.position.set(-1.44,1.22,0);rose.rotation.z=.91;
    const back=lathe(rose,[[.07,-.06],[.10,.01],[.19,.07],[.253,.16],[.25,.19]],m.aquaEdge);back.scale.z=.85;
    const face=ell(rose,0,.182,0,.248,.049,.211,m.brass);
    const hole=mat(0x625b45,.55,.36);
    for(let j=0;j<4;j++){const num=j?j*8:1;
      for(let k=0;k<num;k++){const a=2*Math.PI*(k+j*.27)/num,rr=.067*j;
        ell(rose,Math.cos(a)*rr,.184+.049*Math.sqrt(1-(rr/.25)**2),Math.sin(a)*rr*.84,.009,.003,.009,hole);}}
    return g;
  }
  function shovel(){
    const g=grp(),blade=grp(g),p=[],idx=[],uv=[];
    for(let j=0;j<=12;j++)for(let i=0;i<=12;i++){
      const v=j/12,u=i/6-1,w=.038+.326*Math.pow(Math.sin(v*Math.PI*.68),.65);
      p.push(u*w,v*.76,.12*u*u+.056*(1-v)**2);uv.push(i/12,v);
      if(i<12&&j<12){const k=j*13+i;idx.push(k,k+1,k+13,k+1,k+14,k+13);}
    }
    const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(p,3));bg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));bg.setIndex(idx);bg.computeVertexNormals();
    const bm=m.green.clone();bm.side=T.DoubleSide;mesh(blade,bg,bm);
    for(const sg of [-1,1]){const pts=[];for(let j=0;j<=12;j++){const v=j/12;pts.push([sg*(.038+.326*Math.pow(Math.sin(v*Math.PI*.68),.65)),v*.76,.12+.056*(1-v)**2]);}tube(g,pts,.017,m.silver,20,6);}
    stick(g,[0,.57,.005],[0,1.02,-.035],.081,m.aquaDark,.069);
    stick(g,[0,.91,-.03],[0,1.78,-.064],.064,m.oak,.071,22);
    tube(g,[[0,1.65,-.06],[-.16,1.82,-.065],[-.26,2.06,-.065],[-.175,2.13,-.065],[.175,2.13,-.065],[.26,2.06,-.065],[.16,1.82,-.065],[0,1.65,-.06]],.052,m.green,40);
    stick(g,[-.17,2.124,-.065],[.17,2.124,-.065],.064,m.oak,.064,20);
    ell(g,0,.88,.046,.024,.024,.011,m.brass);
    return g;
  }
  const arch=x=>.13+.38*Math.max(0,1-(x/1.6)**2);
  function bridge(){
    const g=grp(),planks=[];
    for(let i=0;i<11;i++){const x=(i-5)*.29,board=grp(g);board.position.set(x,arch(x),0);board.rotation.z=-.29*x;
      box(board,.28,.112,.91,.035,i%3?m.oak:m.edge);
      for(const side of [-1,1])ell(board,0,.057,side*.355,.024,.009,.024,m.iron);
      planks.push(board);
    }
    for(const side of [-1,1]){
      const z=side*.363,pts=[];for(let i=-5;i<=5;i++)pts.push([i*.29,arch(i*.29)-.096,z]);
      tube(g,pts,.055,m.honey);
      for(const x of [-1.44,0,1.44]){
        const y=arch(x);stick(g,[x,y-.17,z],[x,y+.51,z],.053,m.honey,.047,14);
        ell(g,x,y+.516,z,.058,.034,.058,m.oak);
        for(const d of [.36,.39])ring(g,.052,.012,m.rope,x,y+d,z);
      }
      for(const sg of [-1,1])tube(g,[[0,arch(0)+.39,z],[sg*.39,.69,z],[sg*.91,.57,z],[sg*1.44,arch(1.44)+.39,z]],.027,m.rope,30,9);
    }
    g.userData.planks=planks;return g;
  }
  function car(){
    const g=grp(),wheels=[];
    box(g,.97,.20,.49,.078,m.paint,0,.23,0);box(g,.89,.19,.49,.077,m.paint,.018,.335,0);
    box(g,.54,.245,.403,.089,m.glass,-.06,.495,0);box(g,.55,.066,.435,.033,m.cream,-.074,.619,0);
    for(const z of [-.204,.204]){
      stick(g,[-.31,.397,z],[-.275,.605,z],.018,m.cream,.014);
      stick(g,[.215,.399,z],[.174,.604,z],.016,m.cream,.013);
      box(g,.022,.19,.015,.006,m.cream,-.062,.499,z);
      box(g,.054,.014,.013,.004,m.brass,-.119,.371,z*1.21);
    }
    for(const x of [-.302,.305])for(const z of [-.248,.248]){
      const wh=grp(g);wh.position.set(x,.148,z);const tyre=cyl(wh,.141,.141,.092,m.rubber,0,0,0,28);tyre.rotation.x=Math.PI/2;
      const hub=cyl(wh,.083,.083,.097,m.cream,0,0,0,24);hub.rotation.x=Math.PI/2;
      ell(wh,0,0,Math.sign(z)*.051,.045,.045,.013,m.silver);wheels.push(wh);
    }
    box(g,.032,.083,.20,.013,m.iron,.481,.277,0);
    for(let i=-2;i<=2;i++)box(g,.011,.065,.01,.003,m.silver,.503,.279,i*.035);
    for(const z of [-.169,.169])ell(g,.466,.326,z,.031,.05,.047,m.lamp);
    box(g,.061,.053,.488,.024,m.silver,.478,.197,0);box(g,.048,.046,.461,.02,m.silver,-.486,.197,0);
    g.userData.wheels=wheels;return g;
  }
  // Static models are batched by material. Hardware, rose perforations and garden
  // foliage keep their geometry and shadows without a draw call per detail.
  function batch(group,exclude=[]){
    group.updateWorldMatrix(true,true);const inv=new T.Matrix4().copy(group.matrixWorld).invert(),bins=new Map();
    const keep=new Set();exclude.forEach(o=>o.traverse(k=>keep.add(k)));
    group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||keep.has(o)||Array.isArray(o.material))return;
      if(!bins.has(o.material))bins.set(o.material,[]);bins.get(o.material).push(o);});
    for(const [material,objs] of bins){if(objs.length<2)continue;
      const pos=[],norm=[],uv=[],color=[],idx=[];let start=0;
      for(const o of objs){const b=o.geometry,a=b.attributes,matrix=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);
        const normal=new T.Matrix3().getNormalMatrix(matrix),v=V(0,0,0);
        for(let i=0;i<a.position.count;i++){
          v.fromBufferAttribute(a.position,i).applyMatrix4(matrix);pos.push(v.x,v.y,v.z);
          v.fromBufferAttribute(a.normal,i).applyNormalMatrix(normal);norm.push(v.x,v.y,v.z);
          uv.push(a.uv?a.uv.getX(i):0,a.uv?a.uv.getY(i):0);
          if(a.color)color.push(a.color.getX(i),a.color.getY(i),a.color.getZ(i));
        }
        if(b.index){for(const ix of b.index.array)idx.push(start+ix);}else{for(let i=0;i<a.position.count;i++)idx.push(start+i);}
        start+=a.position.count;o.removeFromParent();
      }
      const b=new T.BufferGeometry();b.setAttribute('position',new T.Float32BufferAttribute(pos,3));b.setAttribute('normal',new T.Float32BufferAttribute(norm,3));b.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      if(color.length===pos.length)b.setAttribute('color',new T.Float32BufferAttribute(color,3));b.setIndex(idx);mesh(group,b,material);
    }
  }
  return {T,V,rng,unit,noise,texture,pixels,mat,m,wood,sand,rough,grp,mesh,box,ell,cyl,stick,tube,ring,lathe,bucket,wateringCan,shovel,bridge,car,arch,batch,geo};
})();
