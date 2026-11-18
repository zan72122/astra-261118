/* Small, locally generated surface maps and solid modelling tools. */
(function(){
'use strict';
const T=THREE, TAU=Math.PI*2;let seed=90635;
const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const mix=(a,b,t)=>a+(b-a)*t, v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const grid=Float32Array.from({length:128*128},rnd);
function noise(x,y){
  const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);
  const g=(a,b)=>grid[(a&127)+((b&127)<<7)];
  return mix(mix(g(i,j),g(i+1,j),u),mix(g(i,j+1),g(i+1,j+1),u),v);
}
const maps={};
function surface(kind){
 if(maps[kind])return maps[kind];
 const w=kind==='wood'?1024:256,h=256,data=new Uint8Array(w*h*4),rough=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/w,v=y/h,n=noise(u*8,v*8),fine=rnd(),cloud=noise(u*32,v*32);
  let c=0,gr=0;
  if(kind==='wood'){
    const bend=.012*Math.sin(u*6.283+v*18)+.016*noise(u*5,v*9);
    const g=(v+bend)*76+noise(u*3,v*13)*1.4,ring=Math.pow(.5+.5*Math.cos(g*TAU),9);
    const grain=noise(u*12,(v+bend)*168);
    c=183+noise(u*4,v*23)*38-27*ring+18*grain+(fine-.5)*12-18*Math.pow(grain,5);gr=115+80*n+34*grain;
  }else if(kind==='stone'){c=150+42*n+31*cloud+(fine-.5)*40+19*noise(u*90,v*90);gr=182+53*n;}
  else if(kind==='metal'){c=177+30*n+18*cloud+19*noise(u*3,v*172)+fine*13;gr=120+66*n+30*cloud;}
  else if(kind==='moss'){c=143+40*n+37*cloud+fine*35;gr=193+47*cloud;}
  else{c=220+17*n+9*cloud+fine*5;gr=166+43*n+17*cloud;}
  const k=(y*w+x)*4;data[k]=c;data[k+1]=c;data[k+2]=c;data[k+3]=255;rough[k]=rough[k+1]=rough[k+2]=gr;rough[k+3]=255;
 }
 function tex(bytes,srgb){const m=new T.DataTexture(bytes,w,h);m.wrapS=m.wrapT=T.RepeatWrapping;m.minFilter=T.LinearMipmapLinearFilter;m.magFilter=T.LinearFilter;m.generateMipmaps=true;m.anisotropy=4;if(srgb)m.colorSpace=T.SRGBColorSpace;m.needsUpdate=true;return m;}
 return maps[kind]={map:tex(data,true),roughnessMap:tex(rough,false)};
}
function mat(color,roughness=.6,metalness=0,kind='glaze',extra={}){
 return new T.MeshStandardMaterial({color,roughness,metalness,...surface(kind),...extra});
}
const cube=new T.BoxGeometry(1,1,1),orb=new T.SphereGeometry(1,20,12);
function mesh(parent,geo,material,x=0,y=0,z=0){const o=new T.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(p,x,y,z,w,h,d,m){const o=mesh(p,cube,m,x,y,z);o.scale.set(w,h,d);return o;}
function ell(p,x,y,z,w,h,d,m){const o=mesh(p,orb,m,x,y,z);o.scale.set(w,h,d);return o;}
function group(p,x=0,y=0,z=0){const o=new T.Group();p.add(o);o.position.set(x,y,z);return o;}
function lathe(p,points,m,x=0,y=0,z=0,n=64){return mesh(p,new T.LatheGeometry(points.map(([r,h])=>new T.Vector2(r,h)),n),m,x,y,z);}
function ring(p,x,y,z,r,wire,m){const o=mesh(p,new T.TorusGeometry(r,wire,8,64),m,x,y,z);o.rotation.x=Math.PI/2;return o;}
function pipe(p,points,r,m,n=24){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>v3(...a))),n,r,7,false),m);}
function rod(p,a,b,r,material,r2=r,sides=12){
 const start=v3(...a),end=v3(...b),axis=end.clone().sub(start);
 const o=mesh(p,new T.CylinderGeometry(r2,r,axis.length(),sides),material);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v3(0,1,0),axis.normalize());return o;
}
function handmade(p,points,indices,m,uvs,colors){
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices);
 geo.setAttribute('uv',new T.Float32BufferAttribute(uvs||Array(points.length/3*2).fill(0),2));if(colors)geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return mesh(p,geo,m);
}
// Bake static details into one indexed draw per material, preserving PBR normals and UVs.
function bake(p){
 p.updateWorldMatrix(true,true);const inv=p.matrixWorld.clone().invert(),batches=new Map();
 p.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;
   const m=o.material,key=m.id+'_'+o.castShadow+'_'+o.receiveShadow;let b=batches.get(key);
   if(!b){b={m,cast:o.castShadow,receive:o.receiveShadow,pos:[],norm:[],uv:[],col:[],ix:[]};batches.set(key,b);}
   const geo=o.geometry,matx=inv.clone().multiply(o.matrixWorld),normal=new T.Matrix3().getNormalMatrix(matx),pt=v3(),a=geo.attributes,offset=b.pos.length/3;
   for(let i=0;i<a.position.count;i++){
     pt.fromBufferAttribute(a.position,i).applyMatrix4(matx);b.pos.push(pt.x,pt.y,pt.z);
     if(a.normal){pt.fromBufferAttribute(a.normal,i).applyNormalMatrix(normal);b.norm.push(pt.x,pt.y,pt.z);}
     b.uv.push(a.uv?a.uv.getX(i):0,a.uv?a.uv.getY(i):0);
     if(a.color)b.col.push(a.color.getX(i),a.color.getY(i),a.color.getZ(i));
   }
   if(geo.index)for(let i=0;i<geo.index.count;i++)b.ix.push(offset+geo.index.getX(i));
   else for(let i=0;i<a.position.count;i++)b.ix.push(offset+i);
 });
 p.clear();for(const b of batches.values()){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));if(b.col.length)g.setAttribute('color',new T.Float32BufferAttribute(b.col,3));g.setIndex(b.ix);g.computeBoundingSphere();const o=mesh(p,g,b.m);o.castShadow=b.cast;o.receiveShadow=b.receive;
 }
}
const brass=mat(0xcba65c,.32,.77,'metal'), iron=mat(0x38413f,.58,.69,'metal'),
 zinc=mat(0xb4bfc0,.34,.84,'metal'), edge=mat(0xd5d7c3,.25,.82,'metal'),
 oak=mat(0xbd915d,.64,.02,'wood'), copper=mat(0xb97b4d,.40,.77,'metal'),
 patina=mat(0x658b80,.53,.60,'metal'),black=mat(0x313d3a,.64,.44,'metal'),
 porcelain=mat(0xe2d8b9,.23,.12),blue=mat(0x536c74,.27,.23),jade=mat(0x83b8a9,.16,.23),
 glass=new T.MeshPhysicalMaterial({color:0xb1e2d0,roughness:.075,metalness:.06,transparent:true,opacity:.42,
   side:T.DoubleSide,depthWrite:false,ior:1.49,clearcoat:1,envMapIntensity:1.65,...surface('glaze')});
const water=mat(0x789e94,.13,.50,'glaze',{transparent:true,opacity:.79});
function vessel(parent,i){
 const p=RainGarden.vessels[i],g=group(parent,p.x,0,p.z),body=group(g),r=p.radius,h=p.rim;
 let profile;
 if(i===0){
  profile=[[.015,.045],[.335,.045],[.354,.07],[.357,.13],[.48,h-.07],[.498,h-.025],[.48,h],[.466,h-.035],[.34,.13],[.025,.125]];
  lathe(body,profile,zinc);[.11,.18,.75,.81].forEach(y=>ring(body,0,y,0,.349+y*.139,.009,edge));
  ring(body,0,h-.018,0,.484,.019,edge);
  for(const a of [-1,1]){ell(body,a*.458,.83,0,.038,.066,.064,zinc);ell(body,a*.483,.84,0,.025,.035,.04,brass);}
  const pts=[];for(let j=0;j<=20;j++){const a=j*Math.PI/20;pts.push([.476*Math.cos(a),.84+.57*Math.sin(a),-.19*Math.sin(a)]);}
  pipe(body,pts,.014,iron);pipe(body,pts.slice(7,14),.031,oak);
  for(let k=0;k<5;k++)ell(body,.29,.23+k*.13,.15+k*.025,.018,.018,.018,edge);
 } else if(i===1){
  profile=[[.015,.025],[.285,.025],[.334,.07],[.348,.17],[.348,.59],[.339,.67],[.29,.736],[.226,.78],[.219,.873],[.242,.891],[.254,.935],[.243,h],[.201,h],[.202,.791],[.307,.655],[.321,.15],[.28,.102],[.015,.098]];
  lathe(body,profile,glass);ring(body,0,.07,0,.308,.024,jade);ring(body,0,h-.023,0,.234,.015,jade);
  for(let k=0;k<16;k++){const a=k*Math.PI/8;pipe(body,[[.317*Math.sin(a),.096,.317*Math.cos(a)],[.349*Math.sin(a),.25,.349*Math.cos(a)],[.348*Math.sin(a),.56,.348*Math.cos(a)]],.006,glass,5);}
  const string=mat(0xb89b66,.92,0,'wood');for(let k=0;k<3;k++)ring(body,0,.81+k*.016,0,.223,.009,string);
  pipe(body,[[.01,.84,.225],[-.035,.72,.287],[.04,.62,.34]],.009,string,7);
 } else if(i===2){
  const n=16;
  for(let j=0;j<n;j++){
   const w=TAU/n,a=j*w+.005,b=(j+1)*w-.005,hi=h+Math.sin(j*8.77)*.007,pts=[];
   for(const [angle,rad,y] of [[a,.372,.05],[b,.372,.05],[b,r,hi],[a,r,hi],[a,r-.046,hi],[b,r-.046,hi],[b,.338,.10],[a,.338,.10]])pts.push(Math.sin(angle)*rad,y,Math.cos(angle)*rad);
   const colors=[0xbc9461,0xc59e6a,0xa87e50,0xc19b69];const m=woodStaves[j%4]||(woodStaves[j%4]=mat(colors[j%4],.60,.01,'wood'));
   handmade(body,pts,[0,1,2,0,2,3,3,2,5,3,5,4,4,5,6,4,6,7,0,3,4,0,4,7,1,6,5,1,5,2],m,[0,0,0,.27,1,.27,1,0,1,.32,1,.59,0,.59,0,.32]);
  }
  lathe(body,[[.01,.1],[.344,.1],[.344,.12],[.01,.12]],oak);
  for(const y of [.19,.69]){const rr=.371+(y-.05)*.141;lathe(body,[[rr,y-.024],[rr+.011,y-.019],[rr+.013,y+.017],[rr,y+.024]],iron);}
 } else if(i===3){
  profile=[[.01,.034],[.32,.035],[.398,.09],[.477,.24],[.534,.49],[.535,h-.078],[.554,h-.048],[.555,h-.019],[.527,h],[.508,h-.036],[.495,.48],[.432,.23],[.321,.117],[.013,.112]];
  lathe(body,profile,black);ring(body,0,h-.029,0,.55,.016,iron);
  for(const a of [-1,1]){pipe(body,[[a*.49,.57,.135],[a*.655,.625,.153],[a*.722,.659,0],[a*.655,.625,-.153],[a*.49,.57,-.135]],.045,iron,17);}
  ring(body,0,.11,0,.396,.012,black);
 } else{
  profile=[[.012,.029],[.225,.03],[.246,.072],[.25,.128],[.305,.16],[.395,.287],[.465,.505],[.483,.647],[.49,.689],[.474,h],[.445,h-.009],[.443,.644],[.418,.5],[.349,.29],[.223,.167],[.014,.157]];
  lathe(body,profile,porcelain);ring(body,0,h-.014,0,.472,.012,blue);ring(body,0,.126,0,.25,.012,blue);
  for(const yy of [.581,.604])ring(body,0,yy,0,.477-(.63-yy)*.1,.006,blue);
  for(let j=0;j<12;j++){
   const a=j*TAU/12,pts=[];for(let k=0;k<=10;k++){const t=k/10,ang=a+t*.50,yy=.48+Math.sin(t*Math.PI)*.072,rr=.462+(yy-.48)*.15;pts.push([Math.sin(ang)*rr,yy,Math.cos(ang)*rr]);}pipe(body,pts,.009,blue,10);
  }
 }
 // Cobalt brushwork follows the curved clay surface in individual tapered strokes.
 if(i===4){
  const rr=y=>y<.287?.305+(y-.16)*.709:.395+(y-.287)*.319;
  for(let j=0;j<7;j++){
   const base=j*TAU/7+.18,points=[],ix=[];
   const petal=(a,y,sweep,rise,width)=>{
    const off=points.length/3;
    for(let k=0;k<=7;k++){const f=k/7,h=y+rise*f,th=a+sweep*f,bulge=width*Math.sin(Math.PI*f);
     for(const side of [-1,1]){const q=th+side*bulge,rad=rr(h)+.0035;points.push(rad*Math.sin(q),h,rad*Math.cos(q));}if(k<7){const v=off+k*2;ix.push(v,v+1,v+2,v+1,v+3,v+2);}
    }
   };
   petal(base,.207,.23,.245,.011);petal(base+.065,.273,-.18,.075,.060);petal(base+.10,.312,.21,.070,.062);petal(base+.154,.372,-.142,.062,.046);petal(base+.195,.405,.14,.055,.041);
   blue.side=T.DoubleSide;handmade(body,points,ix,blue);
  }
 }
 // Residual rain beads cling to the outer wall and the rolled lips.
 const dew=mat(0xc3d9d0,.10,.51,'glaze',{transparent:true,opacity:.68});
 if(i===0||i===1||i===3){for(let j=0;j<21;j++){
   const a=rnd()*TAU,y=.25+rnd()*(i===1?.31:h-.32),rad=i===0?.345+y*.138:i===1?.350:.479+Math.min(.055,(y-.24)*.23),size=.006+rnd()*.008;
   ell(body,Math.sin(a)*rad,y,Math.cos(a)*rad,size,size*(1.05+rnd()*.9),size,dew);
 }}
 bake(body);
 body.children.forEach(o=>{o.material=o.material.clone();o.userData.dry=o.material.roughness;});
 const surf=mesh(g,new T.CircleGeometry(1,56),water);surf.rotation.x=-Math.PI/2;surf.castShadow=false;
 return {g,body,surf};
}
const woodStaves=[];
function trough(p,length,width,drop,outer=copper,inner=patina){
 const g=group(p),profile=[],indices=[],uv=[],n=28;
 for(let j=0;j<=n;j++){
  const a=-Math.PI*.53+j/n*Math.PI*1.06;
  for(const z of [0,length]){profile.push(Math.sin(a)*width,-Math.cos(a)*width-z/length*drop,z);uv.push(j/n,z/length);}
  if(j<n){const i=j*2;indices.push(i,i+3,i+1,i,i+2,i+3);}
 }
 inner.side=T.DoubleSide;handmade(g,profile,indices,inner,uv);
 const skin=handmade(g,profile.map((v,k)=>k%3===0?v*1.055:k%3===1?v-.012:v),indices,outer,uv);skin.material.side=T.DoubleSide;
 for(const a of [-1,1])rod(g,[a*width*.998,.017,0],[a*width*.998,-drop+.017,length],width*.071,outer);
 return g;
}
function spout(parent){
 const pivot=group(parent,0,2.51,-2.12),tube=trough(pivot,2.48,.172,.585),wrap=(z)=>{
 const pts=[];for(let k=0;k<=20;k++){const a=-1.67+k/20*3.34;pts.push([.186*Math.sin(a),-.585*z/2.48-.184*Math.cos(a),z]);}pipe(tube,pts,.019,brass,20);
 };
 [.14,.28,1.91,2.03,2.39].forEach(wrap);
 for(const side of [-1,1])for(const z of [.18,1.96,2.36])ell(tube,side*.176,-.585*z/2.48-.042,z,.016,.027,.024,brass);
 // A porcelain raindrop and a brass loop are the moving pull at the lip.
 const pull=group(tube,.189,-.585*2/2.48,2.01);
 ring(pull,0,-.065,0,.054,.011,brass).rotation.x=0;
 lathe(pull,[[.003,-.081],[.035,-.136],[.063,-.183],[.064,-.212],[.047,-.244],[.017,-.258],[.001,-.26]],porcelain,0,0,0,32);
 bake(tube);
 return pivot;
}
window.Craft={T,TAU,rnd,noise,mix,v3,mat,box,ell,rod,pipe,ring,mesh,group,lathe,handmade,bake,vessel,spout,trough,
 brass,iron,zinc,edge,oak,copper,patina,black,porcelain,blue,jade,water,surface};
})();
