'use strict';
const Art=(()=>{
 const T=THREE, PI=Math.PI, tau=PI*2;
 const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;};
 let seed=283011;
 function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 const noise=document.createElement('canvas');noise.width=noise.height=128;
 const ctx=noise.getContext('2d'), pix=ctx.createImageData(128,128);
 for(let i=0;i<pix.data.length;i+=4){const n=207+Math.floor(rnd()*48);pix.data.set([n,n,n,255],i);}ctx.putImageData(pix,0,0);
 const rough=new T.CanvasTexture(noise);rough.wrapS=rough.wrapT=T.RepeatWrapping;rough.repeat.set(3,3);
 function mat(col,metal=.25,r=.48,opt={}){return new T.MeshStandardMaterial({color:col,metalness:metal,roughness:r,roughnessMap:rough,...opt});}
 const m={ivory:mat(0xe5dfc9,.42,.32),cream:mat(0xc6c4b5,.47,.38),white:mat(0xf1e9d6,.32,.34),
  orange:mat(0xe99a53,.53,.34),copper:mat(0xbc7744,.72,.3),amber:mat(0xffb45d,.25,.3,{emissive:0xff912c,emissiveIntensity:.85}),
  cyan:mat(0xb4edeb,.18,.18,{emissive:0x9ce3e8,emissiveIntensity:.95}),
  nickel:mat(0x9daab0,.84,.32),chrome:mat(0xc1c8c5,.92,.17),iron:mat(0x4b5b66,.7,.43),
  dark:mat(0x25323b,.64,.42),rubber:mat(0x29343a,.08,.74),black:mat(0x101c25,.45,.26),
  visor:mat(0x162c34,.62,.145),glass:mat(0x416371,.69,.13),blue:mat(0x698695,.51,.4),
  bench:mat(0x88999d,.57,.52),edge:mat(0x516b79,.57,.44),ink:mat(0xaebfc0,.2,.57),
  warm:mat(0xffd8a0,.12,.32,{emissive:0xffb264,emissiveIntensity:2.3}),
  screw:mat(0x858d8c,.85,.34)};
 const geometries=new Map();
 function geom(k,build){if(!geometries.has(k))geometries.set(k,build());return geometries.get(k);}
 function mesh(p,geo,material,x=0,y=0,z=0){const o=new T.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
 function box(p,x,y,z,w,h,d,ma,r=0){
  r=Math.max(0,Math.min(r,w*.49,h*.49,d*.49));
  const geo=geom(['b',w,h,d,r].join(),()=>{
    if(!r)return new T.BoxGeometry(w,h,d);
    // Face grids concentrate all subdivisions at the fillets, keeping broad faces flat.
    const pos=[],nor=[],uv=[],idx=[],half=[w/2,h/2,d/2];
    for(let f=0;f<6;f++){
      const axis=Math.floor(f/2),sign=f%2?-1:1,u=(axis+1)%3,v=(axis+2)%3;
      const coords=a=>[-half[a],-half[a]+r*.28,-half[a]+r*.65,-half[a]+r,half[a]-r,half[a]-r*.65,half[a]-r*.28,half[a]];
      const U=coords(u),V=coords(v),start=pos.length/3;
      for(let j=0;j<8;j++)for(let i=0;i<8;i++){
        const q=[0,0,0];q[axis]=sign*half[axis];q[u]=U[i];q[v]=V[j];
        const c=q.map((v,a)=>Math.max(-half[a]+r,Math.min(half[a]-r,v))),n=q.map((v,a)=>v-c[a]),l=Math.hypot(...n);
        pos.push(...c.map((v,a)=>v+r*n[a]/l));nor.push(...n.map(v=>v/l));uv.push(i/7,j/7);
        if(i<7&&j<7){const k=start+j*8+i;idx.push(...(sign>0?[k,k+1,k+9,k,k+9,k+8]:[k,k+9,k+1,k,k+8,k+9]));}
      }
    }const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
  });return mesh(p,geo,ma,x,y,z);
 }
 function cyl(p,x,y,z,rt,rb,h,ma,n=32,axis='y'){
  const a=mesh(p,geom(['c',rt,rb,h,n].join(),()=>new T.CylinderGeometry(rt,rb,h,n)),ma,x,y,z);
  if(axis==='x')a.rotation.z=PI/2;if(axis==='z')a.rotation.x=PI/2;return a;
 }
 function ball(p,x,y,z,rx,ry,rz,ma){const a=mesh(p,geom('sphere',()=>new T.SphereGeometry(1,32,18)),ma,x,y,z);a.scale.set(rx,ry,rz);return a;}
 function tor(p,x,y,z,r,t,ma,axis='z',arc=tau){const a=mesh(p,geom(['t',r,t,arc].join(),()=>new T.TorusGeometry(r,t,8,Math.max(8,Math.ceil(56*arc/tau)),arc)),ma,x,y,z);
  if(axis==='y')a.rotation.x=-PI/2;if(axis==='x')a.rotation.y=PI/2;return a;}
 function rod(p,a,b,r,ma,n=12,rb=r){const A=new T.Vector3(...a),B=new T.Vector3(...b),mid=A.clone().lerp(B,.5),dir=B.sub(A);
  const o=cyl(p,mid.x,mid.y,mid.z,r,rb,dir.length(),ma,n);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;}
 function tube(p,pts,r,ma){const path=new T.CatmullRomCurve3(pts.map(a=>new T.Vector3(...a)));return mesh(p,new T.TubeGeometry(path,Math.max(12,pts.length*4),r,7,false),ma);}
 function screw(p,x,y,z,r=.008,ax='z'){const o=group(p,x,y,z);if(ax==='y')o.rotation.x=-PI/2;if(ax==='x')o.rotation.y=PI/2;
  cyl(o,0,0,0,r,r,.002,m.screw,12,'z');const slot=box(o,0,0,.0013,r*1.15,r*.19,.001,m.dark);slot.rotation.z=.65;}
 function ticks(p,x,y,z,r,amount=32,ma=m.nickel){for(let i=0;i<amount;i++){
  const a=i*tau/amount;box(p,x+r*Math.sin(a),y,z+r*Math.cos(a),.003,.0017,i%4===0?.017:.009,ma).rotation.y=a;}}
 // Merge rigid pieces by finish. Each joint remains its own transform.
 function batch(root){
  root.updateWorldMatrix(true,true);const inv=new T.Matrix4().copy(root.matrixWorld).invert(),sets=new Map();
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;
    const k=o.material.uuid+(o.castShadow?'c':'')+(o.receiveShadow?'r':'');if(!sets.has(k))sets.set(k,[]);sets.get(k).push(o);});
  for(const list of sets.values()){
    if(list.length<2)continue;
    let count=0,ic=0;for(const o of list){count+=o.geometry.attributes.position.count;ic+=o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count;}
    const ps=new Float32Array(count*3),ns=new Float32Array(count*3),us=new Float32Array(count*2),ix=new (count>65535?Uint32Array:Uint16Array)(ic);
    let k=0,j=0;const v=new T.Vector3(),trans=new T.Matrix4(),normal=new T.Matrix3();
    for(const o of list){const g=o.geometry,att=g.attributes;trans.multiplyMatrices(inv,o.matrixWorld);normal.getNormalMatrix(trans);
      for(let i=0;i<att.position.count;i++){v.fromBufferAttribute(att.position,i).applyMatrix4(trans).toArray(ps,(k+i)*3);v.fromBufferAttribute(att.normal,i).applyNormalMatrix(normal).toArray(ns,(k+i)*3);
       if(att.uv){us[(k+i)*2]=att.uv.getX(i);us[(k+i)*2+1]=att.uv.getY(i);}}
      for(let i=0,n=g.index?g.index.count:att.position.count;i<n;i++)ix[j++]=k+(g.index?g.index.getX(i):i);k+=att.position.count;o.removeFromParent();}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(ps,3));g.setAttribute('normal',new T.BufferAttribute(ns,3));g.setAttribute('uv',new T.BufferAttribute(us,2));g.setIndex(new T.BufferAttribute(ix,1));
    const o=mesh(root,g,list[0].material);o.castShadow=list[0].castShadow;o.receiveShadow=list[0].receiveShadow;
  }return root;
 }
 function body(parent){const g=group(parent), shell=group(g);
  box(shell,0,-.008,-.01,.362,.269,.245,m.dark,.061);
  box(shell,0,.012,.006,.371,.259,.251,m.ivory,.061);
  box(shell,0,-.033,.012,.375,.082,.235,m.cream,.031);
  // Raised porcelain bezel around the recessed smoked-glass optical panel.
  box(shell,0,.03,.119,.323,.159,.048,m.cream,.023);
  box(shell,0,.031,.14,.306,.143,.039,m.black,.019);
  box(shell,0,.031,.157,.288,.126,.022,m.visor,.0105);
  g.userData.eyes=[];
  for(const side of [-1,1]){
   const eye=group(g,side*.076,.035,.171);g.userData.eyes.push(eye);
   box(eye,0,0,0,.023,.044,.007,m.cyan,.0034);
   ball(eye,0,0,.003,.0115,.022,.002,m.cyan);
   cyl(shell,side*.185,.033,-.004,.070,.070,.027,m.dark,40,'x');
   cyl(shell,side*.202,.033,-.004,.061,.061,.018,m.nickel,40,'x');
   tor(shell,side*.213,.033,-.004,.045,.006,m.copper,'x');
   cyl(shell,side*.212,.033,-.004,.034,.034,.007,m.black,28,'x');
   for(const x of [side*.145])screw(shell,x,-.067,.123,.006);
  }
  box(shell,0,-.096,.003,.303,.058,.208,m.ivory,.025);
  for(let i=0;i<5;i++)box(shell,-.039+i*.0195,-.081,.115,.010,.024,.007,m.iron,.003);
  box(shell,-.114,-.071,.121,.029,.009,.006,m.amber,.002);
  box(shell,.105,-.073,.121,.038,.009,.005,m.copper,.002);
  cyl(shell,0,.143,-.008,.068,.084,.015,m.iron,40);
  cyl(shell,0,.151,-.008,.052,.055,.008,m.black,32);
  tor(shell,0,.151,-.008,.063,.0038,m.amber,'y');
  for(let i=0;i<7;i++)box(shell,-.106+i*.035,-.024,-.137,.015,.085,.006,m.dark,.003);
  for(let i=0;i<2;i++)cyl(shell,0,-.13-i*.009,0,.073-i*.007,.073-i*.007,.009,i?m.nickel:m.black);
  batch(shell);return g;
 }
 function head(parent){
  const g=group(parent);cyl(g,0,.012,0,.096,.088,.017,m.iron,48);tor(g,0,.024,0,.088,.006,m.copper,'y');
  ball(g,0,.032,0,.092,.06,.082,m.ivory);
  box(g,0,.037,.068,.102,.042,.026,m.iron,.012);
  cyl(g,0,.042,.083,.023,.024,.013,m.chrome,32,'z');cyl(g,0,.042,.093,.017,.017,.008,m.glass,30,'z');ball(g,-.002,.045,.098,.008,.008,.003,m.cyan);
  for(const a of [-1,1]){cyl(g,a*.087,.036,0,.03,.031,.018,m.orange,24,'x');cyl(g,a*.098,.036,0,.013,.013,.006,m.dark,16,'x');}
  rod(g,[.036,.078,-.019],[.046,.155,-.023],.004,m.chrome);
  cyl(g,.036,.081,-.019,.012,.015,.014,m.dark);ball(g,.046,.155,-.023,.014,.014,.014,m.orange);
  return batch(g);
 }
 function arm(parent,side){
  const g=group(parent),a=side;ball(g,0,0,0,.040,.04,.04,m.dark);
  cyl(g,a*.021,0,0,.050,.050,.046,m.ivory,36,'x');cyl(g,a*.047,0,0,.043,.043,.013,m.orange,32,'x');
  tor(g,a*.055,0,0,.027,.003,m.chrome,'x');cyl(g,a*.056,0,0,.010,.010,.004,m.screw,6,'x');
  rod(g,[a*.025,-.014,0],[a*.045,-.082,.007],.016,m.nickel);
  const br=box(g,a*.039,-.053,.001,.042,.063,.053,m.cream,.015);br.rotation.z=a*.21;
  cyl(g,a*.049,-.09,.008,.027,.027,.051,m.iron,28,'x');
  cyl(g,a*.077,-.09,.008,.014,.014,.007,m.copper,20,'x');
  box(g,a*.050,-.126,.019,.057,.067,.058,m.ivory,.018);
  box(g,a*.050,-.153,.018,.053,.018,.051,m.orange,.007);
  for(const q of [-1,1]){const o=box(g,a*.05+q*.017,-.175,.025,.016,.032,.026,m.iron,.007);o.rotation.z=-q*.23;
   ball(g,a*.05+q*.014,-.188,.027,.009,.011,.013,m.rubber);}
  return batch(g);
 }
 function feet(parent,id){const g=group(parent),limbs=[],L=RobotWorkshop.driveData[id].length;
  box(g,0,-.004,0,.19,.032,.077,m.iron,.012);
  for(const a of [-1,1]){
   const f=group(g,a*.077,-.003,0);limbs.push(f);
   if(id==='wheel'){
    const w=group(f,0,-.028,0);f.userData.w=w;
    tor(w,0,0,0,.041,.014,m.rubber,'x');
    cyl(w,0,0,0,.043,.043,.039,m.rubber,32,'x');cyl(w,a*.022,0,0,.036,.036,.008,m.ivory,32,'x');
    tor(w,a*.027,0,0,.027,.004,m.copper,'x');cyl(w,a*.029,0,0,.012,.012,.01,m.iron,6,'x');
    for(let i=0;i<6;i++){const ang=i*PI/3;cyl(w,a*.028,.019*Math.cos(ang),.019*Math.sin(ang),.004,.004,.004,m.dark,10,'x');}batch(w);
   }else{
    cyl(f,0,-.012,0,.024,.024,.045,m.dark,24,'x');rod(f,[0,-.011,0],[0,-L+.022,0],.013,m.chrome);
    box(f,0,-L*.43,.001,.044,L*.46,.046,id==='long'?m.orange:m.cream,.012);
    cyl(f,0,-L*.69,0,.017,.017,.011,m.iron,20);
    box(f,0,-L+.019,.015,.07,.044,.094,m.ivory,.017);box(f,0,-L+.001,.018,.072,.015,.099,m.rubber,.006);
    box(f,0,-L+.015,.059,.044,.009,.008,m.orange,.003);batch(f);
   }
  }g.userData.limbs=limbs;return g;
 }
 function coil(p,x,y,z,r,h,ma){let points=[];for(let i=0;i<=48;i++){let a=i/48*PI*9;points.push([x+Math.cos(a)*r,y+h*i/48,z+r*Math.sin(a)]);}tube(p,points,.004,ma);}
 function springPack(parent){const g=group(parent);g.userData.coils=[];for(const a of [-1,1]){const one=group(g,a*.058,0,0);cyl(one,0,.013,0,.041,.045,.021,m.orange);coil(one,0,.019,0,.026,.088,m.chrome);cyl(one,0,.111,0,.041,.034,.018,m.ivory);batch(one);g.userData.coils.push(one);}return g;}
 function sail(parent,side){const g=group(parent);
  const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(side*.39,-.045);shape.quadraticCurveTo(side*.30,.07,side*.11,.12);shape.lineTo(0,.098);shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:.005,bevelEnabled:false});geometry.rotateX(-PI/2);mesh(g,geometry,m.orange);
  for(const end of [[side*.39,0,.045],[side*.11,0,-.12]])rod(g,[0,0,0],end,.005,m.nickel);return batch(g);}
 return {T,PI,tau,group,mesh,box,cyl,tor,ball,rod,tube,screw,ticks,batch,mat,m,rnd,head,arm,feet,body,springPack,sail};
})();
