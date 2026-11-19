'use strict';
const T=THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
let gardenSeed=818;
function rand(){gardenSeed=(Math.imul(gardenSeed,1664525)+1013904223)>>>0;return gardenSeed/4294967296}
const group=(p)=>{const g=new T.Group();if(p)p.add(g);return g};
function grain(size,type){
  const cv=document.createElement('canvas');cv.width=cv.height=size;const ctx=cv.getContext('2d'),im=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,n=rand(),line=type==='wood'?8*Math.sin(y*1.9+1.5*Math.sin(x*Math.PI*2/size))+5*Math.sin(y*.84):0;
    const c=type==='rough'?216+34*n:223+25*n+line-(type==='road'&&n<.12?32:0);
    im.data[i]=im.data[i+1]=im.data[i+2]=c;im.data[i+3]=255;
  }
  ctx.putImageData(im,0,0);const tx=new T.CanvasTexture(cv);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(type==='road'?5:2,type==='wood'?2:4);if(type!=='rough')tx.colorSpace=T.SRGBColorSpace;return tx;
}
const roughTex=grain(64,'rough'),grainTex=grain(128,'stone'),woodTex=grain(128,'wood'),roadTex=grain(128,'road'),mcache=new Map();
function mat(color,rough=.72,metal=0,texture=null){
  const key=[color,rough,metal,texture?.uuid].join('/');
  if(!mcache.has(key))mcache.set(key,new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,roughnessMap:roughTex,map:texture,envMapIntensity:.75}));
  return mcache.get(key);
}
const unitBox=new T.BoxGeometry(), ballGeom=new T.SphereGeometry(1,16,12), lowBall=new T.IcosahedronGeometry(1,1), geomCache=new Map();
function mesh(p,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o}
function box(p,x,y,z,w,h,d,m){const o=mesh(p,unitBox,m,x,y,z);o.scale.set(w,h,d);return o}
function orb(p,x,y,z,a,b,c,m,low=false){const o=mesh(p,low?lowBall:ballGeom,m,x,y,z);o.scale.set(a,b,c);return o}
function cylinder(p,x,y,z,top,bot,len,m,n=16){const k=[top,bot,len,n].join(',');if(!geomCache.has(k))geomCache.set(k,new T.CylinderGeometry(top,bot,len,n));return mesh(p,geomCache.get(k),m,x,y,z)}
function rod(p,a,b,r,m,n=12,r2=r){const v=V(...a),w=V(...b),mid=v.clone().lerp(w,.5),o=cylinder(p,mid.x,mid.y,mid.z,r2,r,w.distanceTo(v),m,n);o.quaternion.setFromUnitVectors(V(0,1,0),w.sub(v).normalize());return o}
function tube(p,pts,r,m,n=22,sides=8,closed=false){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>V(...v)),closed,'centripetal'),n,r,sides,closed),m)}
function tor(p,x,y,z,r,thick,m,n=56){return mesh(p,new T.TorusGeometry(r,thick,10,n),m,x,y,z)}
// Merge stationary solids per material in local coordinates; articulated children stay separate.
function bake(p){p.updateWorldMatrix(true,true);const inv=p.matrixWorld.clone().invert(),batches=new Map();
  p.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(Array.isArray(m))return;
    let a=batches.get(m);if(!a){a={pos:[],norm:[],uv:[],ind:[],old:[]};batches.set(m,a);}
    const xf=inv.clone().multiply(o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(xf),g=o.geometry,v=V();
    const start=a.pos.length/3,at=g.attributes;for(let i=0;i<at.position.count;i++){v.fromBufferAttribute(at.position,i).applyMatrix4(xf);a.pos.push(v.x,v.y,v.z);v.fromBufferAttribute(at.normal,i).applyMatrix3(nm).normalize();a.norm.push(v.x,v.y,v.z);a.uv.push(at.uv?.getX(i)||0,at.uv?.getY(i)||0);}
    for(let i=0;i<(g.index?.count||at.position.count);i++)a.ind.push(start+(g.index?g.index.getX(i):i));a.old.push(o);
  });
  batches.forEach((a,m)=>{a.old.forEach(o=>o.removeFromParent());const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(a.pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(a.uv,2));g.setIndex(a.ind);mesh(p,g,m);});
}
const paint=mat(0x287bb1,.29,.37),blueDark=mat(0x174c70,.32,.37),skyTrim=mat(0xb4d8dd,.4,.24),chrome=mat(0xc7cdcb,.22,.83),brass=mat(0xc2934c,.24,.72),tread=mat(0x313a3b,.86),black=mat(0x48473e,.69),cream=mat(0xf7daab,.64),leather=mat(0x8c5733,.61,0,woodTex),honey=mat(0xc48e53,.68,0,woodTex),willow=mat(0xe4b47a,.61,0,woodTex),red=mat(0xcb4630,.33,.33),darkRed=mat(0x873229,.38,.3);
function arch(p,x,r,a,b,z,m,thick){const pts=[];for(let i=0;i<=24;i++){const t=a+(b-a)*i/24;pts.push([x+r*Math.cos(t),.204+r*Math.sin(t),z]);}return tube(p,pts,thick,m,36,10)}
function tyreWheel(p,x){
  const hub=group(p);hub.position.set(x,.2032,0);
  const spin=group(hub);
  tor(spin,0,0,0,.156,.009,chrome);
  tor(spin,0,0,.008,.151,.0025,blueDark);
  for(let i=0;i<28;i++){
    const a=i*Math.PI/14,b=a+(i%2?.18:-.18);
    rod(spin,[.021*Math.cos(b),.021*Math.sin(b),i%2?.027:-.027],[.155*Math.cos(a),.155*Math.sin(a),i%2?.006:-.006],.00145,chrome,5);
  }
  rod(spin,[0,0,-.039],[0,0,.039],.016,chrome);rod(spin,[0,0,-.05],[0,0,.05],.009,brass);
  box(spin,-.087,.062,.004,.033,.009,.009,cream).rotation.z=.65;
  bake(spin);
  const N=48,K=18,g=new T.BufferGeometry(),pos=new Float32Array((N+1)*(K+1)*3),uv=[],idx=[];
  for(let j=0;j<K;j++){
    const begin=idx.length;
    for(let i=0;i<N;i++){const a=i*(K+1)+j,b=a+(K+1);idx.push(a,b,a+1,b,b+1,a+1);}
    const c=Math.cos((j+.5)*Math.PI*2/K);
    const mi=c>.49?0:c>-.32?1:2,last=g.groups[g.groups.length-1];
    if(last&&last.materialIndex===mi)last.count+=idx.length-begin;else g.addGroup(begin,idx.length-begin,mi);
  }
  for(let i=0;i<=N;i++)for(let j=0;j<=K;j++)uv.push(i/N,j/K);
  g.setIndex(idx);g.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  const skin=mesh(hub,g,[tread,cream,black]);skin.frustumCulled=false;
  function update(sectors){
    const drop=sectors[36].dent;hub.position.y=.2032-drop;
    for(let i=0;i<=N;i++){const a=i*Math.PI*2/N,d=sectors[i%N].dent;
      for(let j=0;j<=K;j++){const b=j*Math.PI*2/K,r=.1792+.024*Math.cos(b);
        const ii=(i*(K+1)+j)*3;pos[ii]=Math.cos(a)*r;pos[ii+1]=Math.sin(a)*r+d*(.32+.68*(.5+.5*Math.cos(b)));pos[ii+2]=Math.sin(b)*(.024+d*.28);
      }}
    g.attributes.position.needsUpdate=true;g.computeVertexNormals();
  }return {hub,spin,update};
}
function makeBike(scene){
 const root=group(scene),chassis=group(root),steel=group(chassis);
 const A=[-.376,.204,0],C=[-.06,.237,0],S=[-.164,.54,0],H=[.25,.52,0],H2=[.216,.632,0];
 rod(steel,C,S,.021,paint);rod(steel,[-.166,.52,0],[-.183,.636,0],.014,chrome);cylinder(steel,-.174,.56,0,.023,.023,.015,brass);
 rod(steel,H,H2,.028,paint);
 tube(steel,[C,[.015,.235,0],[.115,.288,0],[.237,.523,0]],.029,paint);
 tube(steel,[[-.145,.477,0],[-.044,.362,0],[.063,.35,0],[.228,.575,0]],.015,paint);
 for(const z of [-.043,.043]){
   rod(steel,[A[0],A[1],z],[S[0],S[1],z*.24],.011,paint);
   rod(steel,[A[0],A[1],z],[C[0],C[1],z*.52],.0115,paint);
   tube(steel,[[.236,.536,z*.4],[.283,.434,z],[.335,.263,z],[.376,.204,z]],.0145,paint);
   rod(steel,[.376,.204,z],[.541,.312,z*.3],.003,chrome);rod(steel,[A[0],A[1],z],[-.562,.316,z*.27],.003,chrome);
 }
 for(const x of [-.376,.376]){
   // A rolled enamel mudguard has a broad crown and two fine beaded edges.
   for(const z of [-.019,0,.019])arch(steel,x,.22,.03*Math.PI,1.01*Math.PI,z,z===0?paint:skyTrim,z===0?.016:.006);
 }
 orb(steel,-.376,.269,.055,.183,.049,.014,paint);
 tube(steel,[[-.39,.281,.058],[-.26,.292,.058],[-.07,.318,.058],[.016,.278,.058]],.021,paint);
 tube(steel,[[-.39,.279,.07],[-.23,.289,.07],[-.092,.309,.07]],.003,cream);
 tor(steel,-.062,.24,.05,.066,.005,chrome);rod(steel,[-.061,.24,-.076],[-.061,.24,.076],.013,chrome);
 for(const z of [-1,1]){
   tube(steel,[[-.255,.618,z*.027],[-.25,.594,z*.028],[-.181,.596,z*.02],[-.136,.627,z*.013]],.004,chrome);
 }
 const saddle=orb(steel,-.195,.643,0,.113,.031,.076,leather);saddle.rotation.z=-.065;orb(steel,-.113,.643,0,.076,.019,.035,leather);
 for(let i=0;i<5;i++)orb(steel,-.277+i*.025,.64,.063+Math.sin(i*.8)*.005,.0032,.0032,.002,brass);
 tube(steel,[H2,[.204,.699,0],[.23,.729,0]],.014,chrome);
 tube(steel,[[.153,.752,-.197],[.212,.74,-.102],[.23,.724,0],[.212,.74,.102],[.153,.752,.197]],.0095,chrome);
 for(const z of [-1,1]){
   rod(steel,[.18,.748,z*.158],[.132,.76,z*.224],.017,leather);rod(steel,[.169,.732,z*.147],[.124,.727,z*.186],.0045,chrome);
   for(let i=0;i<5;i++){const u=i/6;rod(steel,[.174-.038*u,.75+.009*u,z*(.167+.052*u)],[.173-.038*u,.75+.009*u,z*(.169+.052*u)],.0176,honey,10);}
 }
 tube(steel,[[.149,.735,.145],[.273,.641,.12],[.27,.469,.058],[.31,.385,.026]],.0032,black);
 // Small enamel stripes and a brass head badge, all in relief.
 for(let i=0;i<3;i++)rod(steel,[.157+i*.013,.368+i*.024,0],[.162+i*.013,.377+i*.024,0],.0302,i===1?skyTrim:cream);
 orb(steel,.248,.588,.019,.01,.021,.009,brass);
 rod(steel,[.377,.204,-.049],[.39,.524,-.073],.0045,chrome);rod(steel,[.377,.204,.049],[.39,.524,.073],.0045,chrome);
 // Woven willow basket. The uprights pass in and out of each horizontal course.
 const basket=group(steel);basket.position.set(.399,.534,0);
 function weave(t,h,offset=0){const c=Math.cos(t),q=Math.sin(t),v=(a)=>Math.sign(a)*Math.abs(a)**.55;return [v(c)*(.081+h*.14+offset),h,v(q)*(.111+h*.18+offset)];}
 for(let j=0;j<=12;j++){const h=j*.0126,pts=[];for(let k=0;k<64;k++)pts.push(weave(k*Math.PI/32,h,.0018*Math.cos(k*Math.PI*.5+j*Math.PI)));tube(basket,pts,j===12?.007:.0047,j%3===0?honey:willow,72,6,true);}
 for(let k=0;k<32;k++){const pts=[];for(let j=0;j<7;j++)pts.push(weave(k*Math.PI/16,j*.025,.0022*Math.cos(j*Math.PI+k)));tube(basket,pts,.0034,honey,10,5);}
 box(basket,0,.003,0,.14,.008,.195,honey);
 const napkin=mat(0x87a597,.87);const parcel=box(basket,-.025,.132,-.048,.112,.045,.09,napkin);parcel.rotation.y=.17;
 for(let j=0;j<3;j++)box(basket,-.059+j*.027,.155,-.048,.006,.002,.084,cream);
 rod(steel,[.28,.45,0],[.408,.468,0],.008,chrome);orb(steel,.42,.467,0,.04,.032,.032,brass);
 orb(steel,.45,.467,0,.011,.025,.025,mat(0xffe7ae,.16,.2));
 rod(steel,A,[-.41,.12,-.055],.005,chrome);
 const crank=group(chassis);crank.position.set(-.061,.24,0);
 for(const n of [-1,1]){rod(crank,[0,0,n*.063],[n*.067,n*.024,n*.063],.007,chrome);box(crank,n*.067,n*.024,n*.084,.048,.015,.052,black);box(crank,n*.067,n*.024,n*.111,.034,.007,.002,brass);}
 bake(crank);bake(steel);
 const bell=group(chassis);bell.position.set(.198,.755,.12);cylinder(bell,0,0,0,.026,.025,.012,blueDark);orb(bell,0,.008,0,.027,.019,.027,brass);orb(bell,0,.027,0,.005,.004,.005,chrome);bake(bell);
 const wheels=[tyreWheel(root,-.376),tyreWheel(root,.376)];
 const streamers=simpleStreamers(chassis);
 return {root,chassis,wheels,crank,bell,streamers};
}
const pumpPos=[-.68,0,.32];
function makePump(scene){
 const root=group(scene);root.position.set(...pumpPos);
 const base=group(root);box(base,0,.012,0,.242,.018,.114,darkRed);
 for(const x of [-.107,.107]){orb(base,x,.014,0,.027,.013,.058,darkRed);for(let i=0;i<5;i++)box(base,x,.024,-.039+i*.018,.039,.003,.004,black);}
 cylinder(base,0,.205,0,.039,.043,.37,red,36);cylinder(base,0,.051,0,.046,.046,.039,darkRed,32);
 for(const h of [.077,.31,.324])cylinder(base,0,h,0,.0408,.0408,.0045,h<.1?brass:cream,36);
 const badge=box(base,0,.216,.040,.032,.032,.0025,cream);badge.rotation.z=Math.PI/4;
 const inset=box(base,0,.216,.042,.021,.021,.002,red);inset.rotation.z=Math.PI/4;orb(base,0,.216,.044,.005,.005,.002,brass);
 cylinder(base,0,.399,0,.044,.045,.033,brass,32);cylinder(base,0,.414,0,.032,.042,.012,darkRed,32);
 const dial=group(base);dial.position.set(.035,.112,.042);dial.rotation.x=-.47;
 rod(dial,[0,0,-.01],[0,0,.014],.041,brass,36);rod(dial,[0,0,.015],[0,0,.017],.035,cream,36);
 for(let i=0;i<9;i++){const a=-2.35+i*4.7/8;rod(dial,[Math.sin(a)*.027,Math.cos(a)*.027,.019],[Math.sin(a)*.031,Math.cos(a)*.031,.019],.0014,i<7?black:red,5);}
 bake(base);
 const needle=group(root);needle.position.set(.035,.112,.042);needle.rotation.x=-.47;const pointer=group(needle);rod(pointer,[0,-.007,.021],[0,.024,.021],.0018,red,7);orb(pointer,0,0,.022,.003,.003,.003,brass);
 const piston=group(root);cylinder(piston,0,-.108,0,.009,.009,.22,chrome,20);cylinder(piston,0,.008,0,.017,.015,.035,brass,20);
 rod(piston,[-.118,.024,0],[.118,.024,0],.02,red,24);
 for(const n of [-1,1]){orb(piston,n*.115,.024,0,.017,.024,.024,darkRed);rod(piston,[n*.046,.024,0],[n*.112,.024,0],.023,red,24);}
 bake(piston);return {root,piston,pointer};
}

function simpleStreamers(chassis){
 const parts=[];
 for(let j=0;j<3;j++){
   const g=new T.BufferGeometry(),pos=new Float32Array(14*3),idx=[];
   for(let i=0;i<6;i++)idx.push(2*i,2*i+1,2*i+2,2*i+1,2*i+3,2*i+2);
   g.setAttribute('position',new T.BufferAttribute(pos,3));g.setIndex(idx);
   const m=mat([0xe0b45e,0xc4d8c3,0xf4e6bd][j],.76);m.side=T.DoubleSide;
   const o=mesh(chassis,g,m,.136,.755,.22);o.frustumCulled=false;parts.push({g,pos});
 }
 return strips=>parts.forEach(({g,pos},j)=>{
   let x=0,y=0,z=(j-1)*.003;
   for(let i=0;i<7;i++){const k=i*6;pos[k]=x;pos[k+1]=y;pos[k+2]=z-.0034;pos[k+3]=x+.001;pos[k+4]=y;pos[k+5]=z+.0034;
     if(i<6){const a=strips[j][i].angle-.10+j*.08,len=.014+j*.0026;x-=Math.sin(a)*len;y-=Math.cos(a)*len;z+=(j-1)*.0018;}}
   g.attributes.position.needsUpdate=true;g.computeVertexNormals();
 });
}
