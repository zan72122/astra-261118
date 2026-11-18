/* The harbour is built in metres, including the narrow strips of caulking,
   hull strakes, woven willow, roof ridges and iron fittings. */
const HarborArt = (() => {
  'use strict';
  const T=THREE, PI=Math.PI, TAU=2*PI;
  let seed=8417;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const vec=(x,y,z)=>new T.Vector3(x,y,z);
  const boxGeo=new T.BoxGeometry(1,1,1);
  const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;};
  function mesh(p,geo,mat,x=0,y=0,z=0){
    const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);return m;
  }
  function box(p,x,y,z,w,h,d,m,rot=0){const a=mesh(p,boxGeo,m,x,y,z);a.scale.set(w,h,d);a.rotation.y=rot;return a;}
  const cylinders=new Map();
  function cyl(p,x,y,z,rt,rb,h,m,n=12){
    const key=[rt,rb,h,n].join('|');
    if(!cylinders.has(key))cylinders.set(key,new T.CylinderGeometry(rt,rb,h,n));
    return mesh(p,cylinders.get(key),m,x,y,z);
  }
  const sphere=new T.SphereGeometry(1,32,20);
  function oval(p,x,y,z,rx,ry,rz,m){
    const a=mesh(p,sphere,m,x,y,z);a.scale.set(rx,ry,rz);return a;
  }
  function beam(p,a,b,w,d,m,square=false){
    const A=vec(...a),B=vec(...b),len=A.distanceTo(B);
    const o=square?box(p,0,0,0,w,len,d,m):cyl(p,0,0,0,w,d,len,m,10);
    o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(vec(0,1,0),B.sub(A).normalize());return o;
  }
  function line(p,pts,r,m,closed=false,segments=0,sides=6){
    const curve=new T.CatmullRomCurve3(pts.map(a=>vec(...a)),closed,'centripetal');
    return mesh(p,new T.TubeGeometry(curve,segments||Math.max(10,pts.length*3),r,sides,closed),m);
  }
  function ring(p,x,y,z,r,t,m,flat=false){
    const a=mesh(p,new T.TorusGeometry(r,t,8,40),m,x,y,z);if(flat)a.rotation.x=PI/2;return a;
  }
  function geo(verts,idx,uvs,colors){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);
    g.setAttribute('uv',new T.Float32BufferAttribute(uvs||Array(verts.length/3*2).fill(0),2));
    if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    g.computeVertexNormals();return g;
  }
  // Merge static pieces by finish, retaining UVs, normals and the real geometry.
  function batch(root){
    root.updateWorldMatrix(true,true);
    const inv=root.matrixWorld.clone().invert(), batches=new Map();
    root.traverse(o=>{if(!o.isMesh||!o.geometry.attributes.position)return;
      let g=batches.get(o.material);if(!g)batches.set(o.material,g={p:[],n:[],uv:[],c:[],i:[]});
      const src=o.geometry,attrs=src.attributes,off=g.p.length/3,mat=inv.clone().multiply(o.matrixWorld);
      const nm=new T.Matrix3().getNormalMatrix(mat),pt=vec(0,0,0);
      for(let i=0;i<attrs.position.count;i++){
        pt.fromBufferAttribute(attrs.position,i).applyMatrix4(mat);g.p.push(pt.x,pt.y,pt.z);
        pt.fromBufferAttribute(attrs.normal,i).applyMatrix3(nm).normalize();g.n.push(pt.x,pt.y,pt.z);
        g.uv.push(attrs.uv?attrs.uv.getX(i):0,attrs.uv?attrs.uv.getY(i):0);
        if(attrs.color)g.c.push(attrs.color.getX(i),attrs.color.getY(i),attrs.color.getZ(i));
      }
      if(src.index)for(const j of src.index.array)g.i.push(off+j);else for(let j=0;j<attrs.position.count;j++)g.i.push(off+j);
    });
    root.clear();
    for(const [material,b] of batches){
      const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(b.p,3));
      geom.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));geom.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));
      if(b.c.length)geom.setAttribute('color',new T.Float32BufferAttribute(b.c,3));
      geom.setIndex(b.i);geom.computeBoundingSphere();mesh(root,geom,material);
    }
    return root;
  }
  function makeTexture(kind){
    const size=256,a=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const k=(y*size+x)*4, warp=Math.sin(x*.024+y*.018)*1.5+Math.sin(x*.051)*.33;
      const stripe=Math.sin((y+warp)*2.6)*.028+Math.sin((y+warp)*.52)*.038;
      let val=kind==='wood'?.84+stripe*1.8+.042*Math.sin(y*.21+Math.sin(x*.016))*Math.cos(x*.013)+.08*rand():
        kind==='rope'?.8+.13*Math.sin((y*2+x*.7))+.07*rand():.86+.14*rand();
      a[k]=a[k+1]=a[k+2]=Math.round(255*Math.max(0,Math.min(1,val)));a[k+3]=255;
    }
    const tx=new T.DataTexture(a,size,size,T.RGBAFormat);tx.wrapS=tx.wrapT=T.RepeatWrapping;
    tx.magFilter=T.LinearFilter;tx.minFilter=T.LinearMipmapLinearFilter;tx.generateMipmaps=true;tx.needsUpdate=true;tx.anisotropy=4;return tx;
  }
  const grain=makeTexture('wood'),rough=makeTexture('rough'),fiber=makeTexture('rope');
  function mat(hex,r=.72,metal=0,texture=null){
    return new T.MeshStandardMaterial({color:hex,roughness:r,metalness:metal,roughnessMap:rough,
      map:texture,bumpMap:texture||null,bumpScale:texture===grain?.015:.004,envMapIntensity:.63});
  }
  const M={
    wood:mat(0xb98b59,.75,0,grain),wood2:mat(0xd8af77,.7,0,grain),wood3:mat(0x8a6649,.75,0,grain),
    crate:mat(0xd5a564,.7,0,grain),crate2:mat(0xbc8b53,.71,0,grain),edge:mat(0xe0b77c,.68,0,grain),
    pier:mat(0x9c8468,.68,0,grain),pier2:mat(0xb6a080,.7,0,grain),pier3:mat(0x887760,.62,0,grain),
    wet:mat(0x524e40,.31,0,grain),tar:mat(0x3c403b,.81),iron:mat(0x535f5d,.43,.62),
    zinc:mat(0xa4b1aa,.36,.7),brass:mat(0xbaa06a,.29,.68),rope:mat(0xc4a77c,.84,0,fiber),
    wicker:mat(0xc5a16c,.65,0,fiber),willow:mat(0x98734d,.74,0,fiber),rim:mat(0xd8b47c,.56,0,fiber),
    white:mat(0xe3e2cd,.52),cream:mat(0xf3e7c9,.57),green:mat(0x447a77,.46),
    hull:mat(0x295a60,.33,.08),hull2:mat(0x355564,.35,.09),red:mat(0xaf5741,.46),rubber:mat(0x343c3a,.84),
    orange:mat(0xcc6d49,.4),glass:mat(0x527b82,.13,.68),lamp:mat(0xffe5a3,.22,.12),
    slate:mat(0x525f64,.63),slate2:mat(0x687476,.6),tile:mat(0x758083,.56),
    wall:mat(0xd3ceba,.87),timber:mat(0x66594c,.83,0,grain),siding:mat(0x927862,.86,0,grain),
    stone:mat(0x9a9a89,.91),stone2:mat(0xb0ac95,.91),stone3:mat(0x8a8c80,.86),concrete:mat(0xc6c1a9,.85),
    leaf:mat(0x617965,.98),leaf2:mat(0x738572,.95),leaf3:mat(0x536c60,.92),tree:mat(0x665f4e,.83),
    blue:mat(0x658b92,.63),net:mat(0x627a70,.89),dark:mat(0x394647,.85)
  };
  M.lamp.emissive.set(0xffbb55);M.lamp.emissiveIntensity=.65;
  const stripedBall=p=>{
    const a=group(p);
    const sect=(top,end,m)=>mesh(a,new T.SphereGeometry(.49,48,Math.ceil((end-top)*12),0,TAU,top,end-top),m,0,.14,0);
    sect(0,1.01,M.orange);sect(1.01,1.42,M.cream);sect(1.42,1.58,M.orange);sect(1.58,2.29,M.cream);sect(2.29,PI,M.hull);
    cyl(a,0,.635,0,.083,.115,.12,M.iron);ring(a,0,.72,0,.095,.022,M.rope);
    line(a,[[.08,.66,0],[.31,.49,.2],[.34,.03,.37],[.14,-.15,.52]],.018,M.rope);
    return a;
  };
  function crate(p,w=1.42,h=1.28,d=1.32){
    const a=group(p),bottom=-h*.29;
    box(a,0,bottom+h*.5,0,w-.08,h-.045,d-.08,M.wood3);
    for(const s of [-1,1]){
      for(let j=0;j<6;j++){
        box(a,0,bottom+(j+.5)*h/6,s*d*.5,w-.06,h/6-.012,.052,j%3===0?M.crate2:M.crate);
        box(a,s*w*.5,bottom+(j+.5)*h/6,0,.052,h/6-.012,d-.06,j%2?M.crate:M.crate2);
      }
      for(const xx of [-1,1]){
        box(a,xx*(w/2-.066),bottom+h*.5,s*(d/2+.048),.129,h,.07,M.edge);
        for(const yy of [.11,h-.1]){const pin=cyl(a,xx*(w/2-.067),bottom+yy,s*(d/2+.089),.019,.019,.009,M.iron,8);pin.rotation.x=PI/2;}
      }
      for(const yy of [.079,h-.079]){
        box(a,0,bottom+yy,s*(d/2+.052),w,.139,.078,M.edge);
        box(a,s*(w/2+.042),bottom+yy,0,.078,.139,d,M.edge);
      }
      const bar=box(a,0,bottom+h*.5,s*(d/2+.052),Math.hypot(w-.23,h-.25),.132,.066,M.edge);
      bar.rotation.z=s*Math.atan2(h-.25,w-.23);
      const side=box(a,s*(w/2+.042),bottom+h*.5,0,.055,.115,Math.hypot(d-.12,h-.25),M.wood2);side.rotation.x=s*.71;
    }
    for(let j=0;j<7;j++)box(a,(j-3)*w/7,bottom+h+.011,0,w/7-.009,.055,d,M.crate);
    for(const s of [-1,1])box(a,0,bottom+h+.058,s*(d*.5-.1),w,.075,.16,M.edge);
    return a;
  }
  // Each row of hull sections has its own sheer, flare, chine and waterline.
  function hull(p,L,W,H,outer,small=false){
    const shape=t=>{const u=(t+1)*.5;return Math.pow(Math.max(.001,1-Math.pow(u,3.3)),.70)*(.78+.26*Math.sin(u*PI));};
    const rail=(t)=>H*(.76+.29*t*t+.19*Math.max(0,t));
    const layers=[[-.58,.16],[-.39,.56],[-.15,.86],[.18,.96],[.57,1],[1,1]];
    const steps=28;
    function point(t,yf,xf,s){
      const height=yf>=0?yf*rail(t):yf*H*(1-.43*t*t);
      return [s*W*.5*shape(t)*xf,height,t*L*.5];
    }
    function strip(a,b,ma,inward=false){
      const vs=[],ix=[],uv=[];
      for(const side of [-1,1]){
        const o=vs.length/3;
        for(let j=0;j<=steps;j++){const t=j/steps*2-1;
          vs.push(...point(t,a[0],a[1],side),...point(t,b[0],b[1],side));uv.push(j/steps,0,j/steps,1);
          if(j<steps){let k=o+j*2;ix.push(k,k+1,k+2,k+2,k+1,k+3);}
        }
      }
      ma.side=T.DoubleSide;mesh(p,geo(vs,ix,uv),ma);
    }
    for(let k=0;k<layers.length-1;k++)strip(layers[k],layers[k+1],k===0?M.red:k===1?M.tar:outer);
    strip([.60,1.01],[.758,1.014],small?M.cream:M.white);
    strip([.88,1.012],[1,1.014],small?M.wood2:M.wood);
    strip([.1,.78],[1,.94],small?M.wood:M.cream,true);
    for(const s of [-1,1]){
      const pts=[];for(let j=0;j<=16;j++){const t=j/8-1;pts.push(point(t,1,1.012,s));}
      line(p,pts,small?.039:.058,small?M.edge:M.wood2);
      const seam=[];for(let j=0;j<=15;j++)seam.push(point(j/7.5-1,.13,.96,s));line(p,seam,.013,M.hull2);
    }
    const sternW=W*.5*shape(-1);
    const stern=geo([-sternW,rail(-1),-L/2,sternW,rail(-1),-L/2,sternW*.82,-.16*H,-L/2,-sternW*.82,-.16*H,-L/2],[0,1,2,0,2,3]);mesh(p,stern,outer);
    const vs=[],ids=[],uv=[];
    for(let j=0;j<=steps;j++){
      const t=j/steps*2-1,hw=W*.465*shape(t);
      for(const s of [-1,1]){vs.push(s*hw,H*(small?.11:.58)+H*.065*t*t,t*L/2);uv.push(s>0?1:0,j/steps*2);}
      const k=j*2;if(j<steps)ids.push(k,k+2,k+1,k+1,k+2,k+3);
    }
    M.wood.side=T.DoubleSide;mesh(p,geo(vs,ids,uv),M.wood);return {shape,rail};
  }
  function dinghy(p){
    const a=group(p);hull(a,3.04,1.13,.51,M.green,true);
    for(const z of [-.85,-.12,.61]){
      box(a,0,.39,z,z>.5?.83:1.01,.074,.21,M.edge);
      for(const s of [-1,1])beam(a,[s*.42,.07,z],[s*.5,.4,z],.035,.046,M.wood3,true);
    }
    for(const s of [-1,1]){const o=group(a,s*.26,.44,-.04);o.rotation.y=s*.18;
      beam(o,[0,0,-.97],[0,0,.67],.023,.032,M.wood2);oval(o,0,.009,.86,.079,.023,.32,M.wood2);}
    line(a,[[0,.62,1.52],[.08,.42,1.67],[.15,.05,1.72],[.18,.004,1.83]],.019,M.rope);
    return a;
  }
  function lifeRing(p,x,y,z,r){
    for(let i=0;i<8;i++) {
      const m=mesh(p,new T.TorusGeometry(r,.235*r,8,10,PI/4+.005),i%2?M.orange:M.cream,x,y,z);m.rotation.z=i*PI/4;
    }
    ring(p,x,y,z,r*1.28,r*.043,M.rope);
  }
  function coil(p,x,y,z,r,n=3){
    const pts=[];for(let i=0;i<n*30;i++){const a=i*TAU/30,R=r*(.53+.47*i/(n*30));pts.push([x+Math.cos(a)*R,y+.008*Math.sin(a*3),z+Math.sin(a)*R*.87]);}
    line(p,pts,.022,M.rope,false,n*32);
  }
  function fisher(p,variant=0){
    const a=group(p),L=5.7,W=1.92;hull(a,L,W,.83,variant===1?M.hull2:M.hull);
    // Raised wheelhouse with individual, inset windows and an overhanging roof.
    box(a,0,1.105,-.30,1.48,1.19,1.65,M.white);
    box(a,0,1.90,-.30,1.46,.45,1.55,M.cream);
    for(const s of [-1,1]){
      for(let j=0;j<3;j++)box(a,s*.748,1.81,-.83+j*.52,.026,.52,.435,M.glass);
      for(const z of [-.86,-.34,.18])box(a,s*.77,1.48,z,.043,.055,.47,M.wood);
      box(a,s*.769,1.09,-.72,.03,.54,.43,M.green);
      box(a,s*.79,1.16,-.62,.045,.045,.06,M.brass);
    }
    for(let i=0;i<3;i++)box(a,(i-1)*.474,1.82,.497,.399,.51,.036,M.glass);
    for(const xx of [-.45,.45]){const w=box(a,xx,1.75,.526,.018,.34,.014,M.iron);w.rotation.z=-.45;}
    box(a,0,2.19,-.29,1.78,.13,1.92,M.cream);box(a,0,2.267,-.29,1.68,.034,1.85,M.green);
    cyl(a,.44,2.44,-.70,.08,.098,.44,M.zinc);cyl(a,.44,2.68,-.70,.105,.104,.06,M.tar);
    cyl(a,0,2.36,-.31,.113,.145,.18,M.white);box(a,0,2.49,-.31,.66,.09,.14,M.white);
    const mastZ=.57;
    beam(a,[0,.66,mastZ],[0,3.57,mastZ-.12],.05,.026,M.wood2);beam(a,[-.73,2.85,.49],[.73,2.85,.49],.027,.027,M.cream);
    for(const side of [-1,1]){
      line(a,[[0,3.45,.42],[side*.42,2.06,.97],[side*.77,.85,1.34]],.012,M.tar);
      line(a,[[0,3.45,.42],[side*.53,2.61,-.5],[side*.74,.86,-2.43]],.011,M.tar);
      const rail=[];for(let i=0;i<7;i++){const z=.58+i*.34,x=side*.90*(1-Math.pow((z-.3)/2.63,2.55));
        rail.push([x,1.29+.18*(z/2.7)**2,z]);if(i%2===0)beam(a,[x,.65,z],[x,1.29+.18*(z/2.7)**2,z],.019,.019,M.zinc);}
      line(a,rail,.024,M.zinc);
      for(const z of [-1.72,-.20,1.13]){
        const ra=ring(a,side*(z>1?.82:.96),.43,z,.195,.074,M.rubber);ra.rotation.y=PI/2;
        line(a,[[side*.88,.81,z-.07],[side*.99,.66,z],[side*.97,.52,z+.04]],.018,M.rope);
      }
      for(const z of [-2.12,-1.28])beam(a,[side*.77,.66,z],[side*.77,1.92,z],.023,.023,M.zinc);
    }
    box(a,0,1.95,-1.86,1.82,.075,1.18,variant===1?M.blue:M.green);
    lifeRing(a,-.43,1.07,-1.152,.19);coil(a,.17,.57,1.42,.26);
    for(let j=0;j<3;j++)box(a,-.52+j*.46,.77,-1.90,.39,.26,.49,j===1?M.blue:M.green);
    beam(a,[.25,2.22,-.89],[.34,3.29,-.98],.014,.008,M.zinc);
    // A triangular pennant is a folded piece of geometry.
    M.red.side=T.DoubleSide;mesh(a,geo([0,3.49,.44,0,3.23,.44,.57,3.35,.38,.25,3.36,.32],[0,1,3,1,2,3,2,0,3]),M.red);
    return a;
  }
  function basket(p){
    const a=group(p),rows=18;
    const r=y=>.68+.34*Math.sin(Math.max(0,y/1.18)*1.26);
    for(let j=0;j<36;j++){
      const angle=j*TAU/36,pts=[];
      for(let k=0;k<=14;k++){
        const yy=k/14*1.13-.22,R=r(yy+.22)+.019*Math.cos(k*1.8+j*PI);
        pts.push([Math.cos(angle)*R,yy,Math.sin(angle)*R*.83]);
      }
      line(a,pts,.023,M.willow,false,18,5);
    }
    for(let j=0;j<rows;j++){
      const y=-.22+j*.065,pts=[];
      for(let k=0;k<108;k++){
        const ang=k*TAU/108,R=r(y+.22)+.023*Math.cos(18*ang+j*PI);
        pts.push([Math.cos(ang)*R,y+.006*Math.sin(ang*3+j),Math.sin(ang)*R*.83]);
      }
      line(a,pts,.032,j%3===1?M.willow:M.wicker,true,108,5);
    }
    for(const y of [.875,.95]){const t=ring(a,0,y,0,r(1.15),.048,M.rim,true);t.scale.y=.83;}
    for(const s of [-1,1]){
      const pts=[];for(let k=0;k<=20;k++){const aa=k*PI/20;pts.push([s*.91,.91+.36*Math.sin(aa),Math.cos(aa)*.32]);}
      line(a,pts,.048,M.rim);
    }
    cyl(a,0,-.19,0,.69,.67,.06,M.willow,40).scale.z=.83;
    return a;
  }
  function piling(p,x,z,top){
    cyl(p,x,(top-1.7)/2,z,.17,.198,top+1.7,M.wet,14);
    cyl(p,x,(top+.33)/2,z,.173,.183,top-.33,M.pier3,14);
    cyl(p,x,top+.016,z,.159,.168,.039,M.pier2,14);
    for(let k=0;k<3;k++)ring(p,x,top-.19-k*.046,z,.18,.025,M.rope,true);
    cyl(p,x,top-.44,z,.183,.184,.073,M.iron,14);
  }
  function dock(p,x,z,length,width,high=.72){
    const a=group(p,x,0,z);
    for(const s of [-1,1])box(a,s*(width*.5-.17),high-.24,0,.23,.26,length+.11,M.wet);
    const n=Math.ceil(length/.29);
    for(let i=0;i<n;i++){
      const zz=(i+.5)*length/n-length*.5;
      box(a,(rand()-.5)*.017,high,zz,width+.019*rand(),.16,length/n-.012,[M.pier,M.pier2,M.pier3,M.pier][Math.floor(rand()*4)]);
      for(const s of [-1,1])cyl(a,s*(width*.5-.18),high+.082,zz,.014,.014,.009,M.iron,7);
    }
    for(const zz of [-length*.5+.12,.07,length*.5-.13])for(const s of [-1,1])piling(a,s*(width*.5-.15),zz,high+.39+rand()*.18);
    const xx=-width*.5+.14;
    for(const [za,zb] of [[-length*.5+.12,.07],[.07,length*.5-.13]])
      line(a,[[xx,high+.37,za],[xx-.04,high+.02,(za+zb)/2],[xx,high+.37,zb]],.032,M.rope);
    coil(a,width*.19,high+.104,length*.28,.31,4);
    return a;
  }
  function lantern(p,x,y,z){
    const a=group(p,x,y,z);
    cyl(a,0,.055,0,.14,.18,.11,M.brass,20);cyl(a,0,.135,0,.113,.127,.10,M.iron,16);
    cyl(a,0,.28,0,.096,.115,.22,M.lamp,20);
    for(const s of [-1,1])for(const z of [-.068,.068])beam(a,[s*.08,.14,z],[s*.09,.408,z],.012,.012,M.iron);
    cyl(a,0,.427,0,.06,.15,.09,M.iron,16);ring(a,0,.52,0,.068,.013,M.brass);
    return a;
  }
  function container(p){
    const a=group(p);box(a,0,.117,0,1.63,1.22,2.75,M.blue);
    for(const s of [-1,1]){
      for(let j=0;j<18;j++)box(a,s*.835,.12,-1.29+j*.152,.071,1.14,.06,M.green);
      for(const y of [-.45,.70])box(a,0,y,s*1.388,1.69,.093,.09,M.zinc);
      for(const x of [-.79,-.39,.39,.79])beam(a,[x,-.4,s*1.405],[x,.68,s*1.405],.025,.025,M.zinc);
    }
    for(let j=0;j<15;j++)box(a,0,.744,-1.24+j*.178,1.53,.035,.069,M.blue);
    return a;
  }
  function pontoon(p){
    const a=group(p);
    for(const x of [-.65,.65]){const f=cyl(a,x,-.09,0,.235,.235,2.75,M.hull);f.rotation.x=PI/2;}
    for(let i=0;i<14;i++)box(a,0,.23,-1.33+i*.205,1.78,.14,.194,i%3?M.pier2:M.pier);
    for(const x of [-.74,.74])for(const z of [-1.19,1.19])cyl(a,x,.38,z,.065,.071,.24,M.brass);
    coil(a,.3,.314,.61,.25);return a;
  }
  return {T,PI,TAU,rand,vec,group,mesh,box,cyl,oval,beam,line,ring,geo,batch,mat,M,
    stripedBall,crate,dinghy,fisher,basket,dock,piling,lantern,container,pontoon,lifeRing,coil};
})();
