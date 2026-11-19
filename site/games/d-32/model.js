'use strict';
const Kit=(()=>{
  const T=THREE, cache=new Map(), geometries=new Map();
  let seed=637119;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const grit=new Uint8Array(64*64*4);
  for(let i=0;i<grit.length;i+=4){const x=224+rand()*31;grit[i]=grit[i+1]=grit[i+2]=x;grit[i+3]=255;}
  const grain=new T.DataTexture(grit,64,64,T.RGBAFormat);grain.needsUpdate=true;grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.repeat.set(3,3);
  function mat(color,r=.78,m=0,opts={}){
    const key=JSON.stringify([color,r,m,opts]);if(!cache.has(key))cache.set(key,new T.MeshStandardMaterial({color,roughness:r,roughnessMap:grain,metalness:m,...opts}));return cache.get(key);
  }
  const group=(p,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);if(p)p.add(g);return g;};
  function geo(key,fn){if(!geometries.has(key))geometries.set(key,fn());return geometries.get(key);}
  function mesh(p,g,m,x=0,y=0,z=0){const a=new T.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;p.add(a);return a;}
  function box(p,x,y,z,w,h,d,m){const a=mesh(p,geo('box',()=>new T.BoxGeometry(1,1,1)),m,x,y,z);a.scale.set(w,h,d);return a;}
  function ball(p,x,y,z,w,h,d,m,n=16){const a=mesh(p,geo('ball'+n,()=>new T.SphereGeometry(1,n,Math.max(6,n/2))),m,x,y,z);a.scale.set(w,h,d);return a;}
  function cyl(p,x,y,z,r1,r2,h,m,n=16){const key='c'+n+':'+r2/r1;const a=mesh(p,geo(key,()=>new T.CylinderGeometry(1,r2/r1,1,n)),m,x,y,z);a.scale.set(r1,h,r1);return a;}
  function rod(p,a,b,r,m,n=10,r2=r){const v=new T.Vector3(...a),w=new T.Vector3(...b),d=w.clone().sub(v);const o=cyl(p,(v.x+w.x)/2,(v.y+w.y)/2,(v.z+w.z)/2,r2,r,d.length(),m,n);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
  function ring(p,x,y,z,r,t,m,n=32){return mesh(p,geo('t'+r+','+t+','+n,()=>new T.TorusGeometry(r,t,8,n)),m,x,y,z);}
  function profile(p,pts,depth,m,x=0,y=0,z=0,b=.015){
    const sh=new T.Shape();sh.moveTo(...pts[0]);pts.slice(1).forEach(a=>sh.lineTo(...a));sh.closePath();
    const g=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:4});g.translate(0,0,-depth/2);
    return mesh(p,g,m,x,y,z);
  }
  function rounded(p,x,y,z,w,h,d,r,m){const s=new T.Shape(),l=-w/2,R=w/2,B=-h/2,U=h/2;
    r=Math.min(r,w*.45,h*.45);s.moveTo(l+r,B);s.lineTo(R-r,B);s.quadraticCurveTo(R,B,R,B+r);s.lineTo(R,U-r);s.quadraticCurveTo(R,U,R-r,U);s.lineTo(l+r,U);s.quadraticCurveTo(l,U,l,U-r);s.lineTo(l,B+r);s.quadraticCurveTo(l,B,l+r,B);
    const bevel=Math.min(.025,d*.15,r*.35),g=new T.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelSegments:2,bevelSize:bevel,bevelThickness:bevel,curveSegments:4});g.translate(0,0,-d/2+bevel);return mesh(p,g,m,x,y,z);}
  // Combine rigid assemblies by finish. Axles, links and suspension remain separate nodes.
  function batch(g){
    g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),bins=new Map(),remove=[];
    g.traverse(o=>{if(!o.isMesh)return;const m=o.material;const key=m.uuid+o.castShadow+o.receiveShadow;
      if(!bins.has(key))bins.set(key,{p:[],n:[],u:[],idx:[],m,cs:o.castShadow,rs:o.receiveShadow});
      const bin=bins.get(key),f=inv.clone().multiply(o.matrixWorld),normal=new T.Matrix3().getNormalMatrix(f),geom=o.geometry,
        pos=geom.attributes.position,nor=geom.attributes.normal,uv=geom.attributes.uv,v=new T.Vector3(),base=bin.p.length/3;
      for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(f);bin.p.push(v.x,v.y,v.z);v.fromBufferAttribute(nor,i).applyMatrix3(normal).normalize();bin.n.push(v.x,v.y,v.z);bin.u.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}
      const ids=geom.index;for(let i=0;i<(ids?ids.count:pos.count);i++)bin.idx.push(base+(ids?ids.getX(i):i));
      remove.push(o);
    });
    remove.forEach(o=>o.removeFromParent());
    for(const b of bins.values()){const q=new T.BufferGeometry();q.setAttribute('position',new T.Float32BufferAttribute(b.p,3));q.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));q.setAttribute('uv',new T.Float32BufferAttribute(b.u,2));q.setIndex(b.idx);q.computeBoundingSphere();
      const o=mesh(g,q,b.m);o.castShadow=b.cs;o.receiveShadow=b.rs;}
    return g;
  }
  return {T,rand,mat,group,geo,mesh,box,ball,cyl,rod,ring,profile,rounded,batch};
})();
function buildTruck(parent){
  const {T,mat,group,box,ball,cyl,rod,ring,profile,rounded,batch}=Kit;
  const root=group(parent),body=group(root),frame=group(body),bed=group(body,-2.38,.95,0),shell=group(bed,2.38,-.95,0);
  const green=mat(0x267b52,.32,.26),skin=mat(0x438c62,.36,.23),pale=mat(0xe6e7cd,.47,.18),cab=mat(0x347d5b,.27,.29),
    dark=mat(0x293a38,.56,.51),iron=mat(0x59605a,.44,.67),silver=mat(0xacb6af,.27,.78),rubber=mat(0x292d2d,.9),tread=mat(0x393d3a,.87),
    glass=mat(0x4c6a72,.14,.54),red=mat(0xb84e3c,.36,.22),amber=mat(0xe2ab4b,.23,.21,{emissive:0xb36f15,emissiveIntensity:.24}),
    light=mat(0xf0e5c6,.2,.32,{emissive:0xffdaa0,emissiveIntensity:.28}),black=mat(0x203932,.52,.36);
  rounded(frame,-.02,.76,0,5.48,.38,1.52,.08,dark);
  for(const side of [-1,1]){
    box(frame,-.53,.70,side*.77,3.4,.21,.12,iron);
    rounded(frame,.18,.62,side*.90,.99,.42,.24,.095,silver);
    for(const x of [-.16,.49])box(frame,x,.61,side*1.034,.06,.39,.023,dark);
    box(frame,1.25,.61,side*1.04,.80,.11,.27,silver);
    for(let i=0;i<8;i++)box(frame,.94+i*.09,.674,side*1.05,.027,.018,.18,dark);
  }
  // Hollow packer body with a stainless loading shelf and an open, inclined tail.
  const wall=[[-2.85,1.12],[-2.14,1.00],[.94,1.04],[1.1,1.43],[.99,2.62],[.67,2.91],[-1.63,2.91],[-2.08,2.67],[-2.43,2.14]];
  for(const side of [-1,1]){
    const z=side*1.00;
    profile(shell,wall,.125,green,0,0,z,.047);
    profile(shell,[[-2.05,1.51],[.77,1.5],[.88,1.66],[.82,2.56],[.58,2.75],[-1.54,2.75],[-1.85,2.54]],.034,skin,0,0,side*1.093,.028);
    profile(shell,[[-2.42,1.30],[.93,1.30],[.98,1.43],[-2.36,1.43]],.023,pale,0,0,side*1.088,.008);
    rod(shell,[-2.52,1.53,side*1.08],[-1.95,2.61,side*1.08],.061,silver);
    for(let i=0;i<5;i++)ball(shell,-1.76+i*.59,1.58,side*1.12,.026,.026,.014,silver,8);
    // Painted municipal leaf mark, raised a few millimetres off the enamel.
    ring(shell,-.64,2.15,side*1.129,.328,.024,pale);
    profile(shell,[[-.22,-.13],[-.19,.015],[-.10,.15],[.04,.205],[.19,.23],[.17,.074],[.09,-.058],[-.042,-.13]],.008,pale,-.64,2.15,side*1.138,.008);
    rod(shell,[-.83,2.0,side*1.15],[-.54,2.29,side*1.15],.016,skin,7);
    for(let i=0;i<3;i++)rounded(shell,.43+i*.083,2.22,side*1.125,.031,.35,.012,.013,green);
    box(shell,-2.55,1.24,side*1.097,.40,.18,.017,pale);
    for(let i=0;i<2;i++)profile(shell,[[-.077,-.084],[0,-.084],[.087,.084],[.01,.084]],.007,red,-2.65+i*.19,1.24,side*1.112,.001);
    rounded(shell,-2.65,1.72,side*1.038,.18,.35,.11,.05,black);
    rounded(shell,-2.66,1.76,side*1.099,.134,.16,.021,.029,red);
    rounded(shell,-2.66,1.6,side*1.099,.13,.084,.021,.022,amber);
  }
  box(shell,-.24,1.11,0,3.50,.18,1.97,iron);
  rounded(shell,-.30,2.84,0,2.72,.17,1.94,.08,green);
  for(let i=0;i<6;i++)box(shell,-1.51+i*.43,2.944,0,.048,.027,1.78,skin);
  box(shell,.87,1.90,0,.14,1.60,1.95,green);
  profile(shell,[[-2.94,.92],[-2.36,.88],[-1.56,1.45],[-1.56,1.61],[-2.45,1.15],[-2.94,1.12]],1.92,iron,0,0,0,.032);
  box(shell,-1.74,2.0,0,.10,1.52,1.76,black);
  rod(shell,[-2.91,1.12,-1.02],[-2.91,1.12,1.02],.08,silver,16);
  rod(shell,[-1.77,2.82,-1.03],[-1.77,2.82,1.03],.095,green,16);
  for(const side of [-1,1]){
    const z=side*.94;
    rod(shell,[-2.82,1.24,z],[-2.22,2.36,z],.086,dark);
    rod(shell,[-2.48,1.86,z],[-2.02,2.65,z],.052,silver);
    rod(shell,[-2.72,1.33,z],[-2.57,2.06,z],.039,pale);
    box(frame,-2.92,.73,side*.71,.3,.12,.59,iron);
    for(let j=0;j<5;j++)box(frame,-2.93,.804,side*.71+(j-2)*.09,.24,.018,.032,dark);
  }
  box(frame,-2.81,.83,0,.2,.24,1.91,pale);
  for(let i=0;i<7;i++){const patch=profile(frame,[[-.13,-.10],[-.006,-.10],[.125,.10],[.002,.10]],.018,red,-2.923,.83,-.8+i*.256,.003);patch.rotation.y=-Math.PI/2;}
  const cabin=[ [1.16,.88],[2.75,.88],[2.94,1.09],[2.94,1.70],[2.72,2.52],[2.56,2.73],[1.32,2.73],[1.14,2.52] ];
  profile(frame,cabin,1.89,cab,0,0,0,.075);
  rounded(frame,1.98,2.775,0,1.46,.116,1.97,.068,skin);
  for(const side of [-1,1]){
    const z=side*1.025;
    profile(frame,[[1.25,1.29],[2.77,1.29],[2.80,1.66],[2.57,2.58],[1.29,2.58]],.012,black,0,0,z,.022);
    profile(frame,[[1.28,1.32],[2.72,1.32],[2.76,1.65],[2.52,2.54],[1.32,2.54]],.018,cab,0,0,side*1.04,.012);
    profile(frame,[[1.40,1.85],[2.70,1.77],[2.47,2.48],[1.40,2.48]],.018,glass,0,0,side*1.059,.024);
    rod(frame,[2.36,1.82,side*1.08],[2.21,2.49,side*1.08],.024,black);
    rounded(frame,1.54,1.68,side*1.079,.24,.062,.034,.028,dark);
    box(frame,2.0,1.38,side*1.068,1.37,.088,.014,pale);
    rounded(frame,2.61,1.54,side*1.08,.17,.075,.026,.025,amber);
    rod(frame,[2.68,1.86,side*1.02],[2.65,2.02,side*1.33],.036,dark);
    rod(frame,[2.65,2.02,side*1.33],[2.63,2.27,side*1.33],.033,dark);
    rounded(frame,2.63,2.22,side*1.35,.205,.31,.102,.046,dark);
    rounded(frame,2.61,2.22,side*1.408,.149,.23,.012,.028,silver);
  }
  const windshield=box(frame,2.846,2.093,0,.042,.819,1.72,glass);windshield.rotation.z=.267;
  for(const side of [-1,1]){
    rod(frame,[2.936,1.78,side*.70],[2.871,2.035,side*.27],.016,black);
    rod(frame,[2.866,2.04,side*.49],[2.866,2.04,side*.07],.024,black);
    rounded(frame,2.944,1.33,side*.67,.08,.21,.41,.025,light);
    cyl(frame,1.44,2.89,side*.59,.105,.12,.14,amber);
  }
  rounded(frame,2.95,.997,0,.22,.25,1.99,.06,pale);
  for(let i=0;i<4;i++)box(frame,2.996,1.24+i*.064,0,.025,.030,.76,black);
  // Separate running gear keeps tyre contact while the loaded chassis sinks.
  const wheels=[];
  for(const x of [-1.53,2.04])for(const side of [-1,1]){
    const w=group(root,x,.517,side*1.007);
    ring(w,0,0,0,.371,.146,rubber,40);
    const disc=(r,d,z,m,n=32)=>{const c=cyl(w,0,0,z,r,r,d,m,n);c.rotation.x=Math.PI/2;return c;};
    disc(.413,.215,0,rubber);disc(.291,.04,side*.124,silver);ring(w,0,0,side*.154,.256,.021,iron);
    disc(.188,.065,side*.155,iron);disc(.105,.091,side*.182,silver);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;
      ball(w,Math.cos(a)*.22,Math.sin(a)*.22,side*.15,.032,.032,.014,dark,8);
      ball(w,Math.cos(a+.2)*.144,Math.sin(a+.2)*.144,side*.192,.023,.023,.014,silver,8);}
    for(let i=0;i<36;i++){const a=i*Math.PI/18,t=box(w,.502*Math.cos(a),.502*Math.sin(a),0,.017,.052,.163,tread);t.rotation.z=a;}
    batch(w);wheels.push(w);
    const f=[];for(let i=0;i<=15;i++){const a=.1+(Math.PI-.2)*i/15;f.push([x+.60*Math.cos(a),.517+.60*Math.sin(a)]);}
    for(let i=15;i>=0;i--){const a=.1+(Math.PI-.2)*i/15;f.push([x+.535*Math.cos(a),.517+.535*Math.sin(a)]);}
    profile(frame,f,.30,x<0?dark:cab,0,0,side*.995,.018);
    box(frame,x-.54,.49,side*.986,.065,.42,.29,rubber);
  }
  batch(frame);batch(shell);
  const arm=group(root),links=[],cylinders=[];
  function segment(m,r){const o=cyl(arm,0,0,0,r,r,1,m,14);return o;}
  for(let i=0;i<2;i++)links.push(segment(i?green:iron,i?.087:.119));
  cylinders.push(segment(dark,.071),segment(silver,.043));
  const joints=[0,1,2].map(()=>{const g=group(arm);const c=cyl(g,0,0,0,.15,.15,.18,dark,20);c.rotation.z=Math.PI/2;
    const pin=cyl(g,-.105,0,0,.088,.088,.033,silver,16);pin.rotation.z=Math.PI/2;batch(g);return g;});
  const claw=[-1,1].map(side=>{const g=group(arm);rod(g,[0,0,0],[0,-.14,side*.095],.028,silver);rod(g,[0,-.14,side*.095],[0,-.21,side*.035],.028,silver);batch(g);return g;});
  function align(o,a,b){const d=b.clone().sub(a);o.position.copy(a).lerp(b,.5);o.scale.y=d.length();o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
  function update(sim){
    const s=sim.s,w=sim.wrist(),rear=(s.springs[0].x+s.springs[1].x)*.5,front=(s.springs[2].x+s.springs[3].x)*.5;
    root.position.set(s.distance,0,1.25);body.position.y=-(rear+front)*.5;
    body.rotation.z=(rear-front)/3.57;body.rotation.x=(s.springs[0].x-s.springs[1].x)*.37+s.nudge.x*.16;
    bed.rotation.z=s.bed.x;wheels.forEach(o=>o.rotation.z=-s.wheel);
    const a=new T.Vector3(-2.74,1.16-rear,.83),c=new T.Vector3(w.x,w.y,w.z);
    const dy=c.y-a.y,dz=c.z-a.z,dist=Math.max(.01,Math.hypot(dy,dz)),rise=Math.sqrt(Math.max(0,1.14*1.14-c.distanceToSquared(a)*.25));
    const b=new T.Vector3((a.x+c.x)*.5,(a.y+c.y)*.5+dz/dist*rise,(a.z+c.z)*.5-dy/dist*rise);
    align(links[0],a,b);align(links[1],b,c);const base=a.clone().add(new T.Vector3(-.125,0,.02)),piston=b.clone().lerp(c,.30);piston.x-=.12;
    const mid=base.clone().lerp(piston,.53);align(cylinders[0],base,mid);align(cylinders[1],mid,piston);
    [a,b,c].forEach((v,i)=>joints[i].position.copy(v));
    claw.forEach((g,i)=>{g.position.copy(c);g.position.z+=(i?1:-1)*(.075-.05*s.grip.x);});
  }
  return {root,update};
}
function makeBag(p,i){
  const {group,mesh,mat,rod,profile,batch}=Kit,g=group(p),colors=[0x51645c,0x647366,0x455850],cloth=mat(colors[i],.49,.035);
  // Latitudinal folds tighten at the tied neck. The sack rests on its flattened base.
  const pts=[],idx=[],uv=[],N=32,rows=[[.00,-.32],[.26,-.306],[.39,-.18],[.417,.025],[.347,.16],[.185,.25],[.060,.314],[.041,.36]];
  rows.forEach(([r,y],j)=>{for(let k=0;k<=N;k++){const a=2*Math.PI*k/N,fold=.038*Math.cos(7*a+j*.28)+.025*Math.sin(11*a-j*.61);const rad=r*(1+fold*(j>3?3:1.35));
    pts.push(Math.cos(a)*rad+.043*Math.max(y,0),y,Math.sin(a)*rad*.88);uv.push(k/N,j/(rows.length-1));
    if(j&&k){const n=j*(N+1)+k;idx.push(n-N-2,n-1,n,n-N-2,n,n-N-1);}
  }});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();mesh(g,geo,cloth);
  const tie=mat(0xd2c5a1,.80);rod(g,[-.052,.309,0],[.061,.328,0],.028,tie);
  profile(g,[[-.016,.33],[-.14,.43],[-.102,.485],[.018,.39],[.12,.457],[.10,.386],[.034,.334]],.064,cloth,0,0,0,.016);
  rod(g,[.035,.32,.03],[.127,.259,.054],.012,tie);return batch(g);
}
