'use strict';
const T=THREE, F=MiniFactory, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const palette=['#d96954','#e4ae4d','#529aa9'];
const mat=(color,roughness=.46,metalness=.12,extra={})=>new T.MeshStandardMaterial({color,roughness,metalness,...extra});
const M={
  cream:mat('#eee2c6',.35,.24),white:mat('#e9e9dc',.57,.06),wall:mat('#dedfd1',.79,.02),
  green:mat('#719687',.37,.45),mint:mat('#a3bca9',.36,.33),deep:mat('#335d53',.39,.4),
  metal:mat('#a6ada5',.27,.77),chrome:mat('#d2d8ce',.19,.94),dark:mat('#344642',.35,.59),
  rubber:mat('#2e3533',.77,.015),belt:mat('#526660',.7,.12),groove:mat('#43534d',.69,.12),
  black:mat('#192d30',.31,.33),glass:mat('#344f54',.14,.48),lightGlass:mat('#628187',.19,.32),
  lamp:mat('#fff0cd',.21,.18,{emissive:0xffe8bd,emissiveIntensity:.4}),
  amber:mat('#d89841',.24,.37),red:mat('#9e4c3a',.21,.33),
  floor:mat('#b4c5b8',.65,.13),seam:mat('#97a99c',.65,.13),paint:palette.map(c=>mat(c,.31,.38)),
  enamel:mat('#e2bb72',.38,.39),skyglass:mat('#d7e9e4',.29,.13,{emissive:0xc4d9d6,emissiveIntensity:.29}),
  wood:mat('#c6ad87',.6,.04),chalk:mat('#ede8d3',.6,.10)
};
let noiseSeed=4825;
function rnd(){return (noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0)/4294967296;}
const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=64;
const gc=grainCanvas.getContext('2d'),gi=gc.createImageData(64,64);
for(let i=0;i<gi.data.length;i+=4){const tone=232+Math.floor(rnd()*23);gi.data[i]=gi.data[i+1]=gi.data[i+2]=tone;gi.data[i+3]=255;}
gc.putImageData(gi,0,0);
const grainTex=new T.CanvasTexture(grainCanvas);grainTex.wrapS=grainTex.wrapT=T.RepeatWrapping;grainTex.repeat.set(3,3);
function finishMaterial(m){if(!m.roughnessMap){m.roughnessMap=grainTex;m.needsUpdate=true;}return m;}
function group(parent,x=0,y=0,z=0){const q=new T.Group();q.position.set(x,y,z);if(parent)parent.add(q);return q;}
const cache=new Map();
function geo(key,make){if(!cache.has(key))cache.set(key,make());return cache.get(key);}
function mesh(p,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,finishMaterial(m));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function box(p,x,y,z,w,h,d,m){const o=mesh(p,geo('cube',()=>new T.BoxGeometry()),m,x,y,z);o.scale.set(w,h,d);return o;}
function rounded(p,x,y,z,w,h,d,r,m){
  const key=[w,h,d,r].join('/');
  const g=geo(key,()=>{
    const a=new T.BoxGeometry(1,1,1,8,8,8),pos=a.attributes.position,n=a.attributes.normal;
    const dims=[w,h,d],rr=Math.min(w/2,h/2,d/2,r),pt=V(),q=V(),nn=V();
    for(let i=0;i<pos.count;i++){
      pt.fromBufferAttribute(pos,i);
      const ar=pt.toArray().map((v,j)=>Math.abs(v)<.001?0:Math.sign(v)*((dims[j]/2-rr)+rr*Math.abs(v)*2));
      pt.fromArray(ar);q.set(...ar.map((v,j)=>Math.max(-dims[j]/2+rr,Math.min(dims[j]/2-rr,v))));
      nn.copy(pt).sub(q).normalize();pt.copy(q).addScaledVector(nn,rr);
      pos.setXYZ(i,pt.x,pt.y,pt.z);n.setXYZ(i,nn.x,nn.y,nn.z);
    }
    return a;
  });return mesh(p,g,m,x,y,z);
}
function cyl(p,x,y,z,rt,rb,h,m,n=32){return mesh(p,geo('cy'+[rt,rb,h,n],()=>new T.CylinderGeometry(rt,rb,h,n)),m,x,y,z);}
function ball(p,x,y,z,rx,ry,rz,m){const a=mesh(p,geo('sphere',()=>new T.SphereGeometry(1,24,16)),m,x,y,z);a.scale.set(rx,ry,rz);return a;}
function ring(p,x,y,z,r,t,m){return mesh(p,geo('ring'+[r,t],()=>new T.TorusGeometry(r,t,10,48)),m,x,y,z);}
function rod(p,a,b,r,m,n=12,r2=r){const av=V(...a),bv=V(...b),v=bv.clone().sub(av),o=cyl(p,0,0,0,r2,r,v.length(),m,n);o.position.copy(av).lerp(bv,.5);o.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return o;}
function pipe(p,pts,r,m,smooth=true){
  const path=new T.CatmullRomCurve3(pts.map(v=>V(...v)),false,'centripetal');
  return mesh(p,new T.TubeGeometry(path,smooth?Math.max(10,pts.length*3):pts.length, r,8,false),m);
}
// Bake stationary subassemblies by finish, preserving true normals, shadows and perspective.
function bake(p){
  p.updateWorldMatrix(true,true);const inv=p.matrixWorld.clone().invert(),sets=new Map();
  p.traverse(o=>{if(!o.isMesh)return;const src=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
    src.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));const key=o.material.uuid+o.castShadow+o.receiveShadow;
    if(!sets.has(key))sets.set(key,{m:o.material,shadow:o.castShadow,receive:o.receiveShadow,geoms:[]});sets.get(key).geoms.push(src);
  });
  p.clear();for(const {m,geoms,shadow,receive} of sets.values()){
    const g=new T.BufferGeometry();for(const [at,size] of [['position',3],['normal',3],['uv',2]]){
      let n=0;for(const gg of geoms)n+=gg.attributes.position.count;
      const arr=new Float32Array(n*size);let offset=0;
      for(const gg of geoms){const a=gg.attributes[at];if(a)arr.set(a.array,offset);offset+=gg.attributes.position.count*size;}
      g.setAttribute(at,new T.BufferAttribute(arr,size));
    }g.computeBoundingSphere();const o=mesh(p,g,m);o.castShadow=shadow;o.receiveShadow=receive;geoms.forEach(g=>g.dispose());
  }return p;
}
function surface(p,rows,m){
  const pos=[],uv=[],idx=[],n=rows[0].length;
  rows.forEach((row,i)=>row.forEach((pt,j)=>{pos.push(...pt);uv.push(i/(rows.length-1),j/(n-1));
    if(i&&j){let k=i*n+j;idx.push(k-n-1,k-n,k,k-n-1,k,k-1);}
  }));
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  m.side=T.DoubleSide;return mesh(p,g,m);
}
function wheel(p){
  const g=group(p),ty=ring(g,0,0,0,.263,.087,M.rubber);ty.scale.z=1.23;
  for(const side of [-1,1]){
    ring(g,0,0,side*.068,.267,.016,M.groove);
    const rim=cyl(g,0,0,side*.075,.224,.224,.065,M.chrome);rim.rotation.x=Math.PI/2;
    const face=cyl(g,0,0,side*.112,.19,.19,.016,M.deep);face.rotation.x=Math.PI/2;
    ring(g,0,0,side*.12,.177,.016,M.cream);
    ball(g,0,0,side*.135,.123,.123,.045,M.chrome);
    for(let j=0;j<6;j++){const a=j*Math.PI/3;ball(g,.15*Math.cos(a),.15*Math.sin(a),side*.132,.015,.015,.009,M.dark);}
  }return bake(g);
}
function makeCoat(){
  const bytes=new Uint8Array(F.NX*F.NZ*4),tex=new T.DataTexture(bytes,F.NX,F.NZ);tex.minFilter=tex.magFilter=T.LinearFilter;tex.needsUpdate=true;
  const relief=new Uint8Array(F.NX*F.NZ*4),heightMap=new T.DataTexture(relief,F.NX,F.NZ);heightMap.minFilter=heightMap.magFilter=T.LinearFilter;heightMap.needsUpdate=true;
  const m=mat('#ffffff',.34,.34);
  m.onBeforeCompile=sh=>{
    sh.uniforms.coatMap={value:tex};sh.uniforms.heightMap={value:heightMap};
    sh.vertexShader='uniform sampler2D heightMap; uniform sampler2D coatMap; varying vec2 coatUV;\n'+sh.vertexShader;
    sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      coatUV=clamp(position.xz/vec2(3.25,1.57)+.5,0.,1.);
      vec4 coating=texture2D(coatMap,coatUV);
      transformed+=normal*texture2D(heightMap,coatUV).r*.006;`);
    sh.fragmentShader='uniform sampler2D coatMap; varying vec2 coatUV;\n'+sh.fragmentShader;
    sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec4 coating=texture2D(coatMap,coatUV);
      diffuseColor.rgb*=coating.rgb;`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=max(.085,roughnessFactor-texture2D(coatMap,coatUV).a*.24);`);
  };return {material:m,tex,bytes,relief,heightMap};
}
const pigments=palette.map(c=>new T.Color(c)), primer=new T.Color('#a8c6b8');
function updateCoat(coat,cells){
  const a=coat.bytes;
  for(let i=0;i<cells.length;i++){
    const cell=cells[i],p=cell.pigment,sum=p[0]+p[1]+p[2],cover=1-Math.exp(-sum*1800);
    const wet=1-Math.exp(-cell.wet*2500);
    for(let j=0;j<3;j++){
      const ch=['r','g','b'][j],v=sum?(p[0]*pigments[0][ch]+p[1]*pigments[1][ch]+p[2]*pigments[2][ch])/sum:0;
      a[i*4+j]=Math.round(255*(primer[ch]*(1-cover)+v*cover*(.86+.14*wet)));
    }a[i*4+3]=Math.round(255*wet);
    const thickness=(cell.solids+cell.wet)*.001/(F.L*F.W/(F.NX*F.NZ));
    coat.relief[i*4]=Math.min(255,Math.round(thickness/.006*255));
  }coat.tex.needsUpdate=true;coat.heightMap.needsUpdate=true;
}
function profile(x,rows,col) {
  let i=0;while(i<rows.length-2 && x>rows[i+1][0])i++;
  const a=rows[i],b=rows[i+1],u=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));
  const f=u*u*(3-2*u);return a[col]+(b[col]-a[col])*f;
}
function wing(p,x,y,z,angle=0,scale=1){
  const g=group(p,x,y,z);g.rotation.z=angle;g.scale.setScalar(scale);
  for(const s of [-1,1])for(let i=0;i<3;i++)rod(g,[.003,.004+i*.014,s*.025],[0,.008+i*.019,s*(.082+i*.019)],.006,M.chrome,8);
  ball(g,0,.022,0,.025,.035,.04,M.enamel);
}
function buildCar(parent,kind=0){
  const root=group(parent),shell=group(root),body=group(shell),co=makeCoat();
  const long=kind===1,heavy=kind===2, low=kind===3;
  const outline=[[-1.62,.25,.54],[-1.50,.61,.65],[-1.28,.72,.79],[-.99,.784,.83],[-.64,.77,.79],[-.2,.724,.77],[.43,.75,.78],[.96,.785,.85],[1.28,.73,.76],[1.54,.59,.64],[1.65,.19,.51]];
  const width=x=>profile(x,outline,1),top=x=>profile(x,outline,2)+(heavy?.08:0);
  const sideY=x=>{
    const near=Math.min(Math.abs(x+.98),Math.abs(x-.96));
    return .29+(near<.393?Math.sqrt(Math.max(0,.393**2-near**2))+.05:0);
  };
  const rows=[];
  for(let i=0;i<=86;i++){
    const x=-1.62+3.27*i/86,w=width(x),y=top(x),lo=sideY(x);
    rows.push([[x,lo,-w*.94],[x,Math.max(y-.16,lo+.025),-w],[x,y-.068,-w*.98],[x,y+.012,-w*.84],
      [x,y+.025,-w*.65],[x,y+.032,-w*.32],[x,y+.039,0],[x,y+.032,w*.32],[x,y+.025,w*.65],
      [x,y+.012,w*.84],[x,y-.068,w*.98],[x,Math.max(y-.16,lo+.025),w],[x,lo,w*.94]]);
  }surface(body,rows,co.material);
  for(const i of [0,86]){const a=rows[i],x=a[0][0];surface(body,[a,a.map(v=>[x+(i?.015:-.015),.29,v[2]*.94])],co.material);}
  rounded(body,0,.34,0,2.85,.14,1.27,.066,M.dark);
  // A continuous glazed greenhouse with separate pillars, roof stamping and chrome gaskets.
  const cBack=long?-1.15:heavy?-1.08:-1.02, roofBack=long?-.93:heavy?-.87:-.60,roofFront=heavy?.34:.14,cFront=heavy?.59:.64;
  const roofH=heavy?1.38:long?1.25:low?1.05:1.20;
  const cabinRows=[[cBack,.765,.66],[cBack+.12,.89,.645],[roofBack,roofH-.035,.526],[roofBack+.14,roofH,.51],[roofFront,roofH-.015,.512],[cFront-.1,.9,.62],[cFront,.787,.66]];
  const roofLine=x=>profile(x,cabinRows,1), roofW=x=>profile(x,cabinRows,2);
  const glass=[];
  for(let i=0;i<=44;i++){
    const x=cBack+(cFront-cBack)*i/44,h=roofLine(x),w=roofW(x);
    glass.push([[x,.763,-.669],[x,h-.033,-w],[x,h+.012,-w*.86],[x,h+.056,0],[x,h+.012,w*.86],[x,h-.033,w],[x,.763,.669]]);
  }surface(body,glass,M.glass);
  const roof=[];
  for(let i=0;i<=16;i++){
    const x=roofBack+(roofFront-roofBack+.03)*i/16,h=roofLine(x),w=roofW(x);
    roof.push([[x,h-.025,-w-.01],[x,h+.033,-w*.89],[x,h+.074,0],[x,h+.033,w*.89],[x,h-.025,w+.01]]);
  }surface(body,roof,co.material);
  for(const side of [-1,1]){
    pipe(body,[[cBack,.796,side*.675],[roofBack,roofH-.046,side*.532],[roofFront,roofH-.04,side*.53],[cFront,.801,side*.665]],.028,M.chrome);
    for(const [xx,foot] of [[roofBack,cBack],[roofFront,cFront],[(roofFront+roofBack)/2,(roofFront+roofBack)/2-.045]]){
      rod(body,[foot,.79,.675*side],[xx,roofLine(xx)-.012,roofW(xx)*side],.026,M.mint);
    }
    pipe(body,[[cBack,.792,side*.675],[-.25,.798,side*.679],[cFront,.799,side*.667]],.017,M.chrome);
    rounded(body,-.32,.712,side*.74,.178,.035,.032,.012,M.chrome);
    pipe(body,[[-.58,.776,.746*side],[-.54,.59,.75*side],[-.48,.36,.739*side],[.48,.36,.744*side],[.55,.68,.752*side]],.007,M.deep);
    rod(body,[.43,.8,side*.646],[.46,.86,side*.797],.019,M.chrome);ball(body,.453,.862,side*.814,.071,.043,.038,M.chrome);
    for(const cx of [-.98,.96]){
      const pts=[];for(let i=0;i<=16;i++){const a=Math.PI*i/16,x=cx+.398*Math.cos(a);pts.push([x,.337+.395*Math.sin(a),side*width(x)*.964]);}
      pipe(body,pts,.016,M.chrome);
      const hub=cyl(body,cx,.36,side*.65,.141,.141,.158,M.dark);hub.rotation.x=Math.PI/2;
      const cap=cyl(body,cx,.36,side*.734,.086,.086,.021,M.metal,16);cap.rotation.x=Math.PI/2;
    }
    // Headlamps sit in individual pressed-metal fenders, with concentric lens fluting.
    const lamp=group(body,1.34,.732,side*.56);lamp.rotation.z=-.41;
    ball(lamp,0,0,0,.145,.118,.124,M.chrome);
    ball(lamp,.069,.028,0,.122,.099,.106,M.lamp);
    const rim=ring(lamp,.108,.028,0,.095,.011,M.chrome);rim.rotation.y=Math.PI/2;
    ball(body,1.548,.542,side*.47,.041,.035,.062,M.amber);
    ball(body,-1.52,.606,side*.53,.05,.047,.089,M.red);
    const stripe=[];
    for(let i=0;i<=24;i++){const x=cFront+.04+(1.54-cFront-.04)*i/24;stripe.push([[x,top(x)+.039,side*.091-.023],[x,top(x)+.039,side*.091+.023]]);}
    surface(body,stripe,M.cream);
  }
  rounded(body,1.585,.454,0,.103,.116,.84,.046,M.black);
  for(let i=0;i<3;i++)rod(body,[1.64,.42+i*.031,-.345],[1.64,.42+i*.031,.345],.009,M.chrome);
  rounded(body,1.576,.348,0,.121,.064,1.075,.031,M.chrome);rounded(body,-1.55,.379,0,.15,.073,1.08,.034,M.chrome);
  wing(body,1.42,top(1.42)+.039,0,-.1,.69);
  bake(body);
  const wheels=F.hubX.map((x,i)=>{const w=wheel(root);w.position.set(x,.35,F.hubZ[i]);return w;});
  return {root,shell,body,coat:co,wheels};
}
