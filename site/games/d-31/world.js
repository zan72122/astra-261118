/* All visible garden objects are modelled geometry. Canvas textures supply material grain. */
(function(){
'use strict';
const T=THREE,G=GardenGolf,TAU=Math.PI*2;
window.makeGarden=function(renderer,scene){
 const rand=G.random(804716),range=(a,b)=>a+(b-a)*rand(),choose=a=>a[Math.floor(rand()*a.length)];
 const V=(x,y,z)=>new T.Vector3(x,y,z);
 const fixed=new T.Group();scene.add(fixed);
 const geoCache=new Map();
 function geo(key,fn){if(!geoCache.has(key))geoCache.set(key,fn());return geoCache.get(key);}
 const cube=geo('cube',()=>new T.BoxGeometry(1,1,1));
 const orb=geo('orb',()=>new T.SphereGeometry(1,16,12));
 const ballOrb=geo('ball',()=>new T.SphereGeometry(1,64,48));
 function roundedCluster(detail){
   const original=new T.IcosahedronGeometry(1,detail),points=original.attributes.position;
   const seen=new Map(),ps=[],uv=[],ix=[];
   for(let i=0;i<points.count;i++){
     const x=points.getX(i),y=points.getY(i),z=points.getZ(i),key=[x,y,z].map(n=>Math.round(n*10000)).join(',');
     if(!seen.has(key)){seen.set(key,ps.length/3);ps.push(x,y,z);uv.push(.5+Math.atan2(z,x)/TAU,.5+Math.asin(y)/Math.PI);}
     ix.push(seen.get(key));
   }
   const g=geometry(ps,uv,ix);g.setAttribute('normal',new T.Float32BufferAttribute(ps,3));original.dispose();return g;
 }
 const leafOrb=roundedCluster(0),bushOrb=roundedCluster(1);
 function mesh(g,m,x,y,z,p=fixed){
   const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;
 }
 function box(x,y,z,w,h,l,m,p=fixed){const o=mesh(cube,m,x,y,z,p);o.scale.set(w,h,l);return o;}
 function oval(x,y,z,w,h,l,m,p=fixed,g=orb){const o=mesh(g,m,x,y,z,p);o.scale.set(w,h,l);return o;}
 function cylinder(x,y,z,top,bottom,height,m,n=16,p=fixed,open=false){
   return mesh(geo([top,bottom,height,n,open].join(':'),()=>new T.CylinderGeometry(top,bottom,height,n,1,open)),m,x,y,z,p);
 }
 function beam(a,b,w,l,m,p=fixed){
   const A=V(...a),B=V(...b),dir=B.clone().sub(A),mid=A.add(B).multiplyScalar(.5);
   const o=box(mid.x,mid.y,mid.z,w,dir.length(),l,m,p);o.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());return o;
 }
 function twig(a,b,r1,r2,m,n=9,p=fixed){
   const A=V(...a),B=V(...b),v=B.clone().sub(A),mid=A.add(B).multiplyScalar(.5);
   const o=cylinder(mid.x,mid.y,mid.z,r2,r1,v.length(),m,n,p);o.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return o;
 }
 function ring(x,y,z,r,t,m,p=fixed){
   const o=mesh(geo('ring'+r+','+t,()=>new T.TorusGeometry(r,t,8,64)),m,x,y,z);p.add(o);o.rotation.x=-Math.PI/2;return o;
 }
 function geometry(pos,uv,idx){
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
   g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
 }
 function canvas(w,h,draw,repeat=true,srgb=true){
   const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
   const t=new T.CanvasTexture(c);if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;
   if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
 }
 function noiseTile(size,mode){
   return canvas(size,size,(ctx,w,h)=>{
     const a=ctx.createImageData(w,h),pixels=a.data;
     const grid=Array.from({length:256},()=>rand());
     const n=(x,y)=>grid[((x%16+16)%16)+16*((y%16+16)%16)];
     function smoothNoise(x,y){
       let i=Math.floor(x),j=Math.floor(y),u=G.smooth(x-i),v=G.smooth(y-j);
       return (n(i,j)*(1-u)+n(i+1,j)*u)*(1-v)+(n(i,j+1)*(1-u)+n(i+1,j+1)*u)*v;
     }
     for(let y=0;y<h;y++)for(let x=0;x<w;x++){
       const u=x/w,v=y/h,k=(x+y*w)*4;
       let col;
       if(mode==='wood'){
         const wav=1.6*Math.sin(TAU*u)+1.95*Math.sin(2*TAU*u+v*9)+smoothNoise(u*4,v*16)*2.1;
         const vein=Math.sin(v*TAU*42+wav*1.6),fine=Math.sin(v*TAU*105+wav*3.2);
         const stain=14*smoothNoise(u*4,v*16)+8*rand()-16*Math.pow(Math.max(0,vein),8)-7*Math.pow(Math.max(0,fine),4);
         col=[230+stain,218+stain,196+stain];
       }else if(mode==='field'){
         const a=smoothNoise(u*16,v*16),b=smoothNoise(u*4,v*4),c=rand(),v0=20*(a-.5)+32*(b-.5)+24*(c-.5);
         col=[151+v0*1.1,159+v0*.83,106+v0*.86];
       }else {
         const value=(mode==='rough'?193:218)+(rand()-.5)*(mode==='rough'?46:36)+(smoothNoise(u*16,v*16)-.5)*16;col=[value,value,value];
       }
       for(let j=0;j<3;j++)pixels[k+j]=col[j];pixels[k+3]=255;
     }
     ctx.putImageData(a,0,0);
     if(mode==='wood'){
       for(let i=0;i<100;i++){ctx.strokeStyle='rgba(77,57,34,'+range(.03,.15)+')';ctx.lineWidth=range(.35,1.3);
         const x=rand()*w,y=rand()*h;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+14,y-1,x+range(19,105),y+.65);ctx.stroke();}
     }
   },true,mode!=='rough');
 }
 const rough=noiseTile(128,'rough'),timber=noiseTile(512,'wood'),cloth=noiseTile(256,'cloth'),fieldTex=noiseTile(512,'field');
 const material=(color,values={})=>new T.MeshStandardMaterial({color,roughness:.91,roughnessMap:rough,...values});
 const wood=(c)=>material(c,{map:timber,roughness:.84,bumpMap:timber,bumpScale:.014});
 const oak=wood(0xc29563),oakLight=wood(0xe1ba84),endgrain=wood(0xb18354),darkWood=wood(0x896b4c);
 const rim=wood(0xd9b78c),rust=wood(0xb74e39),redWood=[0xc55c46,0xbb5441,0xcb604a,0xae4938,0xc65d49].map(wood);
 const ivory=wood(0xf6e6c3),sail=material(0xf6eacf,{map:cloth,side:T.DoubleSide,roughness:.92});
 const slate=[0x515957,0x626866,0x585f5a,0x6a6a5f].map(c=>wood(c));
 const brass=material(0xb49a5e,{metalness:.76,roughness:.39}), blackIron=material(0x544e40,{metalness:.63,roughness:.45});
 const felt=material(0x839975,{map:cloth,roughness:1,bumpMap:cloth,bumpScale:.015});
 const lip=material(0x485e48),dark=material(0x27352b),chalk=material(0xe2d6ac,{roughness:.83});
 const poleMat=material(0xf0d8a1,{metalness:.35,roughness:.48});
 const flagMat=material(0xbb503e,{map:cloth,side:T.DoubleSide}), stripeMat=material(0xf7e5bc,{side:T.DoubleSide,map:cloth});
 const live={flag:[],rotor:null,blades:[],slats:[],reeds:[]};
 const field=material(0xffffff,{map:fieldTex,roughness:1,bumpMap:cloth,bumpScale:.045});
 fieldTex.repeat.set(18,18);
 const ground=box(0,-.17,0,125,.32,115,field);ground.castShadow=false;
 // Longitudinal timber shoulders, inset baize, and a true opening in every putting green.
 function width(h,s){
   const len=G.holes[h].length;
   const end=s<-.22?(-s-.22)/.85:s>len+.12?(s-len-.12)/1.07:0;
   return (1.16+.18*G.smooth((s-len+2)/1.6)) * Math.sqrt(Math.max(.001,1-Math.min(1,end)**2));
 }
 function surfacePoint(h,s,x,raise=0,deck=false){
   const p=G.point(h,s,x);return [p.x,(deck&&h===2?.44:p.y)+raise,p.z];
 }
 function strip(h,start,end,left,right,raise,m,N=20,deck=true){
   const pos=[],uv=[],idx=[];
   for(let i=0;i<=N;i++){
     const s=start+(end-start)*i/N, l=left(s),r=right(s);
     pos.push(...surfacePoint(h,s,l,raise,deck),...surfacePoint(h,s,r,raise,deck));
     uv.push(s*.58,l*.94,s*.58,r*.94);
     if(i<N){const n=i*2;idx.push(n,n+1,n+3,n,n+3,n+2);}
   }mesh(geometry(pos,uv,idx),m,0,0,0);
 }
 function walls(h,s0,s1,side,add,height,depth,m,offset=0){
   const pos=[],uv=[],idx=[];let n=14;
   for(let j=0;j<=n;j++){
     const s=s0+(s1-s0)*j/n,x=side*(width(h,s)+offset);
     pos.push(...surfacePoint(h,s,x,add,true),...surfacePoint(h,s,x,add-depth,true));uv.push(s*.55,height,s*.55,height-depth);
     if(j<n){let a=j*2;if(side>0)idx.push(a,a+1,a+2,a+1,a+3,a+2);else idx.push(a,a+2,a+1,a+1,a+2,a+3);}
   }const mat=m;mat.side=T.DoubleSide;mesh(geometry(pos,uv,idx),mat,0,0,0);
 }
 const boards=[oak,oakLight,rim,endgrain];
 for(let h=0;h<3;h++){
   const len=G.holes[h].length,start=-1.07,end=len+1.19;
   function green(a,b,cut=false){
     const holeRad=s=>Math.sqrt(Math.max(0,.244**2-(s-len)**2));
     if(cut){
       strip(h,a,b,s=>-width(h,s)*.83,s=>-holeRad(s),0,felt,38);
       strip(h,a,b,s=>holeRad(s),s=>width(h,s)*.83,0,felt,38);
     }else strip(h,a,b,s=>-width(h,s)*.83,s=>width(h,s)*.83,0,felt,Math.max(8,Math.ceil((b-a)*11)));
   }
   if(h===1){green(start,4);green(6.55,len-.244);}
   else if(h===2){
     green(start,3.37);green(6.61,len-.244);
     strip(h,3.37,6.61,()=>-.87,()=>.87,0,lip,56,false);
   }else green(start,len-.244);
   green(len-.244,len+.244,true);green(len+.244,end);
   for(let side of [-1,1]){
     for(let s=start;s<end-.001;s+=.85){
       const e=Math.min(end,s+.846);
       const val=(fraction,p)=>q=>side*(width(h,q)*fraction+p);
       strip(h,s,e,val(side<0?1:.83,0),val(side<0?.83:1,0),.009,choose(boards),9);
       walls(h,s,e,side,.01,.12,.32,choose([oak,darkWood,endgrain]));
       walls(h,s,e,side,.147,.2,.138,choose([oak,rim,oakLight]),.014);
       strip(h,s,e,val(side<0?1:1,side<0?.018:-.067),val(1,side<0?-.067:.018),.147,rim,9);
       walls(h,s,e,side,.147,.18,.137,oak,-.067);
       if(s>-.5&&s<len+.1){
         const p=surfacePoint(h,s+.13,side*(width(h,s+.13)-.025),.15,true);
         cylinder(p[0],p[1],p[2],.014,.014,.006,blackIron,8);
       }
     }
   }
   const p=G.point(h,len);
   cylinder(p.x,p.y-.19,p.z,.244,.20,.38,dark,48,fixed,true).material.side=T.DoubleSide;
   cylinder(p.x,p.y-.37,p.z,.205,.205,.015,blackIron,36);
   ring(p.x,p.y+.009,p.z,.245,.018,brass);
   const pole=G.point(h,len,.195);pole.z-=.075;
   cylinder(pole.x,pole.y+.85,pole.z,.022,.029,1.7,poleMat,16);
   for(let i=0;i<3;i++)cylinder(pole.x,pole.y+.18+i*.38,pole.z,.031-i*.001,.031-i*.001,.12,rust,16);
   oval(pole.x,pole.y+1.72,pole.z,.064,.071,.064,brass);
   const flag=new T.Group();scene.add(flag);flag.position.set(pole.x,pole.y+1.7,pole.z);
   function pennant(){
     const ps=[],uv=[],ix=[],groups=[];
     for(let j=0;j<=8;j++){
       const u=j/8;ps.push(u*.76,0,0,u*.76,-.41*(1-u*.95),0);uv.push(u,1,u,0);
       if(j<8){const n=j*2;ix.push(n,n+1,n+3,n,n+3,n+2);groups.push(j===1?1:0);}
     }const g=geometry(ps,uv,ix);groups.forEach((m,j)=>g.addGroup(j*6,6,m));return g;
   }
   const fl=mesh(pennant(),[flagMat,stripeMat],0,0,0,flag);live.flag.push({group:flag,cloth:fl,base:pole.y});
   const tee=G.point(h,0);
   cylinder(tee.x,tee.y+.006,tee.z,.39,.39,.018,oakLight,64);
   cylinder(tee.x,tee.y+.019,tee.z,.317,.33,.014,lip,64);
   ring(tee.x,tee.y+.03,tee.z,.332,.014,brass);
   for(let i=0;i<3;i++){
     const q=G.point(h,.62+.29*i);oval(q.x,q.y+.014,q.z,.032-i*.004,.008,.049-i*.005,chalk);
   }
 }
 // An octagonal clapboard smock mill. Its open masonry arch straddles the lane.
 const mill=G.point(0,G.holes[0].feature),mx=mill.x,mz=mill.z,fy=mz+1.14;
 const stones=[0xbab3a0,0xc9c0a9,0xd6c9ad,0xb9af97,0xc8bea5].map(c=>material(c,{bumpMap:cloth,bumpScale:.035}));
 function arch(x,y,z,r,thickness,depth,mats,n=13){
   for(let i=0;i<n;i++){
     const a=i*Math.PI/n+.006,b=(i+1)*Math.PI/n-.006,R=r+thickness;
     const sh=new T.Shape();sh.moveTo(Math.cos(a)*r,Math.sin(a)*r);sh.lineTo(Math.cos(a)*R,Math.sin(a)*R);
     sh.lineTo(Math.cos(b)*R,Math.sin(b)*R);sh.lineTo(Math.cos(b)*r,Math.sin(b)*r);sh.closePath();
     mesh(new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,steps:1}),mats[i%mats.length],x,y,z);
   }
 }
 for(const side of [-1,1]){
   box(mx+side*.86,.88,mz,.49,.89,1.94,stones[1]);
   for(let i=0;i<3;i++)box(mx+side*.85,.52+i*.195,mz+.97,.46-i*.008,.177,.11,stones[(i+2)%5]);
 }
 arch(mx,.85,mz-.95,.62,.415,1.92,stones);
 arch(mx,.85,mz+.97,.625,.26,.12,stones,11);
 const sideCount=8,angOffset=Math.PI/8;
 function oct(x,y,z,b,t,height,m){const o=cylinder(x,y,z,t,b,height,m,sideCount);o.rotation.y=angOffset;return o;}
 for(let j=0;j<13;j++){
   const y=1.54+j*.157,rad=1.24-j*.031;
   oct(mx,y,mz,rad,rad-.03,.164,redWood[(j*3)%5]);
   oct(mx,y-.07,mz,rad+.018,rad+.012,.021,redWood[(j+2)%5]);
 }
 oct(mx,1.5,mz,1.30,1.28,.11,ivory);
 oct(mx,3.56,mz,.91,.9,.115,ivory);
 for(let i=0;i<8;i++){
   const a=(i+.5)*TAU/8;
   beam([mx+Math.sin(a)*1.238,1.54,mz+Math.cos(a)*1.238],[mx+Math.sin(a)*.836,3.57,mz+Math.cos(a)*.836],.069,.067,ivory);
 }
 // Small glazed side windows sit in projecting cream frames.
 const glass=material(0x637e80,{roughness:.17,metalness:.50});
 function millWindow(x,y,z,rotation){
   const g=new T.Group();fixed.add(g);g.position.set(x,y,z);g.rotation.y=rotation;
   box(0,0,0,.405,.54,.075,ivory,g);box(0,0,.049,.31,.44,.033,glass,g);
   box(0,0,.073,.032,.45,.036,ivory,g);box(0,.015,.073,.315,.03,.036,ivory,g);
   box(0,-.274,.037,.47,.075,.16,ivory,g);
 }
 millWindow(mx,2.14,mz+1.06,0);millWindow(mx+.95,2.56,mz,Math.PI/2);millWindow(mx-.7,2.65,mz+.7,-Math.PI/4);
 // A layered, flared cap with individually laid dark timber shingles.
 const capY=3.63;oct(mx,capY,mz,1.15,1.15,.12,slate[0]);
 for(let j=0;j<6;j++){
   const r0=1.22*(1-j/6)**.75,r1=1.22*(1-(j+1)/6)**.75;
   oct(mx,capY+.13+j*.122,mz,r0,r1,.16,slate[j%4]);
 }
 cylinder(mx,4.49,mz,.035,.069,.19,brass);oval(mx,4.615,mz,.065,.09,.065,brass);
 // Sails have a tapered wooden spar, linen panels, and raised lattice ribs on their fronts.
 const rotor=new T.Group();scene.add(rotor);rotor.position.set(mx,2.96,fy);
 const rotorBack=cylinder(mx,2.96,fy-.17,.134,.16,.47,blackIron,24);rotorBack.rotation.x=Math.PI/2;
 for(let i=0;i<4;i++){
   const arm=new T.Group();rotor.add(arm);arm.rotation.z=i*Math.PI/2;
   const panel=new T.Group();arm.add(panel);live.blades.push(panel);
   beam([0,.025,0],[0,2.46,0],.067,.087,oakLight,panel);
   const shape=geometry([.03,.72,0,.258,.79,0,.477,2.32,0,.03,2.45,0],[0,0,1,0,1,1,0,1],[0,1,2,0,2,3]);
   mesh(shape,sail,0,0,.003,panel);
   beam([.265,.75,.022],[.49,2.36,.022],.041,.039,ivory,panel);
   beam([.136,.75,.032],[.24,2.4,.032],.023,.03,oakLight,panel);
   for(let j=0;j<8;j++){
     const u=j/7,y=.72+u*1.73;
     beam([-.035,y,.048],[.29+u*.215,y+.07-u*.18,.048],.032,.033,oakLight,panel);
   }
   box(0,.44,.018,.086,.089,.097,blackIron,panel);
 }
 // The geared floor rollers carry a slow ball through the arch until it is in the open.
 live.rollers=[];
 for(let i=0;i<6;i++){
   const p=G.point(0,3.93+i*.43),roller=new T.Group();scene.add(roller);roller.position.set(p.x,p.y-.045,p.z);
   const axle=cylinder(0,0,0,.054,.054,.60,oakLight,14,roller);axle.rotation.z=Math.PI/2;
   for(let j=0;j<3;j++)box(0,.046*Math.cos(j*2.094),.046*Math.sin(j*2.094),.55,.012,.012,brass,roller);
   live.rollers.push(roller);
 }
 const hub=cylinder(0,0,0,.19,.20,.24,ivory,32,rotor);hub.rotation.x=Math.PI/2;
 oval(0,0,.17,.091,.091,.062,brass,rotor);live.rotor=rotor;
 // A little stream runs through the second garden and disappears under reed beds.
 const streamX=G.holes[1].x,streamZ=G.holes[1].z+4.25-5.2;
 function creekZ(x){return streamZ+.42*Math.sin((x-streamX)*.53)+.10*(x-streamX);}
 const waterMat=material(0x83b6a7,{roughness:.18,metalness:.37,envMapIntensity:.83});
 const gravel=[0x979887,0xb3b29a,0x9c9d8a,0xc3bda6].map(c=>material(c));
 const streamLeft=3.15,streamRight=19.8;
 function creekWidth(x){return Math.min(1,Math.sqrt(Math.max(0,(x-streamLeft)/1.4)))*(.98+.16*Math.sin(x*.78));}
 const waterPos=[],waterUV=[],waterIx=[];
 for(let i=0;i<=54;i++){
   const x=streamLeft+(streamRight-streamLeft)*i/54,cz=creekZ(x),w=creekWidth(x);
   for(let j=0;j<=8;j++){
     waterPos.push(x,.033,cz+(j/4-1)*w);waterUV.push(i/8,j/5);
     if(j<8&&i<54){let a=i*9+j;waterIx.push(a,a+1,a+9,a+1,a+10,a+9);}
   }
   if(i%2===0)for(const k of [-1,1]){
     const r=range(.13,.27);oval(x,range(.015,.065),cz+k*(w+.03),r*1.3,r*.57,r,choose(gravel),fixed,bushOrb);
   }
 }
 const waterG=geometry(waterPos,waterUV,waterIx),water=mesh(waterG,waterMat,0,0,0,scene);water.castShadow=false;live.water=water;
 for(let i=0;i<15;i++){
   const s=4+.17*(i+.5),p=G.point(1,s),o=box(p.x,p.y-.043,p.z,2.19,.096,.16,boards[i%4],scene);
   live.slats.push({mesh:o,base:o.position.y});
 }
 for(let side of [-1,1]){
   for(let i=0;i<5;i++){
     const s=3.89+i*.68,p=G.point(1,s,side*1.12);
     box(p.x,p.y+.22,p.z,.098,.74,.11,darkWood);box(p.x,p.y+.59,p.z,.14,.073,.15,oakLight);
     if(i<4){
       const b=G.point(1,s+.68,side*1.12);
       beam([p.x,p.y+.53,p.z],[b.x,b.y+.53,b.z],.095,.086,oakLight);
       beam([p.x,p.y+.28,p.z],[b.x,b.y+.28,b.z],.042,.043,oak);
     }
   }
 }
 // The small sliding maple chock rests in two brass guides on the uphill approach.
 live.catch=new T.Group();scene.add(live.catch);
 box(0,.034,0,.38,.053,.061,oakLight,live.catch);
 for(const k of [-1,1]){box(k*.17,0,0,.034,.049,.11,brass,live.catch);
   strip(1,2.02,4,s=>k*.17-.012,s=>k*.17+.012,.004,brass,24);}
 // The two openings are separated by a solid stone-covered earthen mound.
 const entry=G.point(2,3.39),exit=G.point(2,6.65);
 const moss=material(0x7f9162,{map:cloth,roughness:1});
 function tunnelShell(inner){
   const ps=[],uv=[],ix=[],count=30,ribs=24;
   for(let j=0;j<=count;j++){
     const u=j/count,s=3.39+u*3.26,p=G.point(2,s);
     const bulge=Math.sin(u*Math.PI),width=inner?.65:1.08+.36*bulge;
     for(let i=0;i<=ribs;i++){
       const a=i*Math.PI/ribs,x=Math.cos(a)*width;
       const y=inner?.705+.667*Math.sin(a):.21+(1.39+.20*bulge)*Math.sin(a);
       ps.push(p.x+x,y,p.z);uv.push(u*3,i/ribs);
       if(i<ribs&&j<count){const n=j*(ribs+1)+i;ix.push(n,n+1,n+ribs+2,n,n+ribs+2,n+ribs+1);}
     }
   }
   const m=inner?dark:moss;m.side=T.DoubleSide;mesh(geometry(ps,uv,ix),m,0,0,0);
 }
 tunnelShell(false);tunnelShell(true);
 for(let j=0;j<20;j++){
   const u=(j+.5)/20,p=G.point(2,3.68+u*2.7),sign=j%2?1:-1;
   oval(p.x+sign*1.07,.27,p.z,.40,.42,.39,moss,fixed,bushOrb);
 }
 function portal(p,face){
   arch(p.x,.71,p.z-.18,.67,.28,.39,stones,13);
   for(const k of [-1,1]){
     for(let i=0;i<2;i++) box(p.x+k*.815,.49+i*.18,p.z,.29,.176,.4,stones[(i+2)%5]);
   }
   // The dark lining lies behind the arch and the moving ball enters ahead of it.
   const tunnelWall=material(0x363f33,{side:T.DoubleSide});
   const pos=[],uv=[],ind=[];
   for(let i=0;i<=24;i++){
     const a=Math.PI*i/24,x=p.x+.665*Math.cos(a),y=.71+.665*Math.sin(a);
     pos.push(x,y,p.z+face*.17,x,y,p.z-face*.7);uv.push(i/24,0,i/24,1);
     if(i<24){let n=i*2;ind.push(n,n+1,n+2,n+1,n+3,n+2);}
   }
   mesh(geometry(pos,uv,ind),tunnelWall,0,0,0);
 }
 portal(entry,1);portal(exit,-1);
 live.fountain={x:2.98,y:.4,z:-7.35};
 const fountain=live.fountain;
 cylinder(fountain.x,.095,fountain.z,.95,1.06,.18,stones[1],48);
 cylinder(fountain.x,.24,fountain.z,.88,.65,.28,stones[1],48);
 cylinder(fountain.x,.38,fountain.z,.82,.82,.025,waterMat,48);ring(fountain.x,.405,fountain.z,.87,.064,stones[2]);
 cylinder(fountain.x,.44,fountain.z,.125,.205,.15,brass,24);
 const dropletMat=material(0xb6e6df,{metalness:.27,roughness:.12});
 live.drops=new T.InstancedMesh(orb,dropletMat,70);live.drops.frustumCulled=false;scene.add(live.drops);
 // Terracotta planters have a rolled lip, tapered walls, loose soil, and modelled flowers.
 const clay=material(0xc68464,{map:cloth}),clayL=material(0xda9b78,{map:cloth}),soil=material(0x625641);
 const stems=[0x667950,0x697d50,0x819361].map(c=>material(c)),greens=[0x778957,0x92a46a,0xa7b376,0x667b4e,0x8e9f61].map(c=>material(c));
 const petals=[0xf8eed0,0xfff5e7,0xe8b962,0xd9a492,0xb5a9c9,0xd58d70].map(c=>material(c));
 const pollen=material(0xe1ac4b),pale=material(0xf8e3a6);
 function flower(x,y,z,h,type,scale=1){
   const sx=x+range(-.065,.065),sz=z+range(-.045,.045),head=y+h,r=range(.07,.104)*scale;
   twig([x,y,z],[sx,head,sz],.009*scale,.006*scale,choose(stems),5);
   for(let i=0;i<2;i++){
     const a=range(0,TAU),off=.056*scale,leaf=oval(x+Math.cos(a)*off,y+h*(.33+i*.24),z+Math.sin(a)*off,.042*scale,.10*scale,.026*scale,choose(greens),fixed,leafOrb);
     leaf.rotation.set(.28,a,.64*(i?1:-1));
   }
   if(type===4){
     for(let i=0;i<6;i++){
       const a=i*2.42;oval(sx+.024*Math.cos(a),head+i*.032,sz+.024*Math.sin(a),.036,.05,.036,petals[4],fixed,bushOrb);
     }return;
   }
   const count=type<2?10:6,tilt=range(-.38,.42);
   for(let k=0;k<count;k++){
     const a=TAU*k/count,dx=Math.sin(a),dz=Math.cos(a);
     const petal=oval(sx+dx*r*.61,head+r*.18+dz*tilt*r*.6,sz+dz*r*.61,r*(type<2?.26:.46),r*.21,r*.55,petals[type],fixed,leafOrb);
     petal.rotation.order='YXZ';petal.rotation.y=a;petal.rotation.x=-.24-tilt*dz;
   }
   oval(sx,head+.022*scale,sz,r*.35,.025*scale,r*.35,type===2?pale:pollen,fixed,bushOrb);
 }
 function plantPot(x,z,r,h,type){
   cylinder(x,h*.50,z,r*.88,r*.59,h,clay,32);
   cylinder(x,h*.88,z,r,r*.955,h*.20,clayL,32);
   ring(x,h*.99,z,r*.956,.028,clayL);
   cylinder(x,h*.99,z,r*.9,r*.9,.014,soil,32);
   for(let i=0;i<16;i++){
     const a=rand()*TAU,b=r*Math.sqrt(rand())*.83;
     flower(x+Math.cos(a)*b,h,z+Math.sin(a)*b,range(.16,.49),type,range(.78,1.2));
   }
 }
 plantPot(mx-1.65,mz+.63,.34,.51,0);plantPot(mx-1.92,mz+.16,.253,.36,2);
 plantPot(mx+1.62,mz-.73,.31,.44,4);
 plantPot(exit.x-1.44,exit.z,.31,.43,3);
 const patches=[
   [-1.86,3.80,27,0],[-1.88,2.43,13,2],[1.92,3.4,20,0],[2.2,1.43,24,2],[-2.21,-.30,18,1],
   [-1.63,-2.55,23,3],[3.76,-3.12,28,0],[4.03,-4.64,15,4],[-.83,-5.05,20,1],
   [6.39,-1.6,24,0],[9.83,.3,16,2],[9.9,-6.65,20,4],[-8.47,-3.83,21,3],[-4.4,-7.71,25,2],
   [-3.75,6.5,18,1],[2.92,5.04,19,1],[3.79,-8.62,25,3],[-3.85,-10.42,16,4]
 ];
 for(const [x,z,count,type] of patches){
   for(let i=0;i<count;i++){
     const a=rand()*TAU,b=Math.sqrt(rand());
     flower(x+Math.cos(a)*b*.52,.016,z+Math.sin(a)*b*.7,range(.16,.42)*(type===4?1.28:1),rand()<.14?2:type,range(.70,1.1));
   }
 }
 // Tree silhouettes come from branching trunks, clustered crowns and individual sunlit leaves.
 const bark=[0x807058,0x75684f,0x958268].map(wood);
 const foliage=[0x758961,0x869968,0xa0ad78,0x899e6f,0x9aa775,0x697f5a,0xb1b784].map(c=>material(c,{map:cloth}));
 function canopy(x,y,z,r,shade=0,host=fixed){
   const c=oval(x,y,z,r*1.08,r*.84,r,foliage[shade],host,bushOrb);c.rotation.y=rand()*TAU;
   for(let i=0;i<36;i++){
     const a=rand()*TAU,v=range(-.81,1),rr=Math.sqrt(1-v*v);
     const m=choose(foliage.slice(v>.35?1:0,v>.35?7:5)),sz=r*range(.16,.31);
     const o=oval(x+1.02*r*rr*Math.cos(a),y+v*.78*r,z+r*rr*Math.sin(a),sz*1.4,sz*.80,sz,m,host,bushOrb);
     o.rotation.y=a;
   }
   for(let i=0;i<60;i++){
     const a=rand()*TAU,v=range(-.65,1),rr=Math.sqrt(1-v*v),r0=r*range(1.02,1.16);
     const o=oval(x+r0*rr*Math.cos(a),y+v*.80*r0,z+r0*rr*Math.sin(a),r*.092,r*.045,r*.12,choose(foliage),host,leafOrb);
     o.rotation.set(range(-.5,.5),a,range(-.52,.52));
   }
 }
 function tree(x,z,h){
   const tx=x+range(-.28,.28),tz=z+range(-.28,.28);
   twig([x,0,z],[tx,h*.61,tz],h*.056,h*.034,choose(bark),13);
   for(let i=0;i<5;i++){
     const a=i*2.4+rand()*.71,r=h*(i===4?.06:range(.15,.28)),ey=h*(i===4?.91:range(.65,.82)),ex=tx+Math.cos(a)*r,ez=tz+Math.sin(a)*r;
     const joint=[(ex+tx)*.5,h*.60,(ez+tz)*.5];
     twig([tx,h*(.39+i*.025),tz],joint,h*.033,h*.019,choose(bark));
     twig(joint,[ex,ey,ez],h*.022,h*.009,choose(bark));canopy(ex,ey,ez,h*range(.214,.27),i%5);
   }
 }
 tree(-13.95,7.65,6.05);tree(-3.87,-12.52,6.35);tree(5.3,-9.65,6.6);tree(-10.9,-10.4,6.8);
 tree(13.3,-7.3,6.24);tree(-3.3,-16.5,5.7);tree(16.9,6.8,5.52);tree(-10.8,3.5,5.6);
 for(let i=0;i<23;i++){
   let x=range(-19,18),z=range(-17,-13.3),r=range(.62,1.36);
   canopy(x,r*.52,z,r*.9,i%5);
 }
 // The high oak branch throws moving patches of shade across the approach.
 live.boughs=[];
 twig([-13.91,2.78,7.62],[-8.48,5.04,6.55],.26,.14,bark[1],11);
 twig([-8.48,5.04,6.55],[-5.60,5.62,6.13],.145,.074,bark[0]);
 for(let i=0;i<5;i++){
   const g=new T.Group();scene.add(g);g.position.set(-6.30+i*.27,5.41+i*.084,6.26-i*.05);
   const dx=1.53+i*.24,dy=.46+(i%2)*.58,dz=(i-2)*.85;
   twig([0,0,0],[dx,dy,dz],.079-i*.007,.018,bark[i%3],8,g);
   canopy(dx,dy,dz,.67+i*.055,i%5,g);live.boughs.push(g);
 }
 // A low scalloped garden fence, receding in perspective into the trees.
 const fenceM=[0xe1d6b8,0xd8cdaf,0xe7ddc4,0xd4c7a8].map(wood);
 function fence(x1,z1,x2,z2){
   const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx),n=Math.ceil(len/.46);
   for(let i=0;i<=n;i++){
     const x=x1+dx*i/n,z=z1+dz*i/n,post=i%8===0,H=post?1.62:1.16+.15*Math.cos(i*Math.PI/4);
     const g=new T.Group();g.position.set(x,0,z);g.rotation.y=yaw;fixed.add(g);const m=fenceM[i%4];
     box(0,H*.5,0,post?.18:.246,H,.11,m,g);
     if(post){box(0,H,0,.245,.09,.20,m,g);cylinder(0,H+.095,0,0,.153,.13,m,4,g).rotation.y=Math.PI/4;}
     else{const tip=new T.Shape();tip.moveTo(-.123,0);tip.lineTo(0,.148);tip.lineTo(.123,0);tip.closePath();
       mesh(geo('tip',()=>new T.ExtrudeGeometry(tip,{depth:.109,bevelEnabled:false})),m,0,H,-.055,g);}
   }
   for(const y of [.43,.91])beam([x1,y,z1-.07],[x2,y,z2-.07],.088,.11,oakLight);
 }
 fence(-19,-11.55,18,-12.65);fence(15.4,-12.55,17,6.5);fence(-11.8,-11.76,-12.6,5.15);
 // Distant hills and high, soft cloud banks leave open sky over the windmill.
 const hillM=[0x97a791,0x9dab96,0xaab6a1,0x839b86].map(c=>material(c));
 for(let i=0;i<13;i++){const x=-56+i*9+range(-2,2);oval(x,-1.9,-27-range(0,9),range(8,16),range(3.9,7.4),range(4,9),hillM[i%4],fixed,orb);}
 const cloudMat=material(0xfffbec,{roughness:1,emissive:0xd2dbd9,emissiveIntensity:.49});
 for(let i=0;i<9;i++){
   const x=-54+i*13.3+range(-2,2),y=range(8.3,11),z=range(-49,-38);
   for(let j=0;j<5;j++){const o=oval(x+j*1.02,y+range(-.2,.45),z+range(-.5,.5),range(1.25,2.6),range(.56,1.25),range(1,2),cloudMat);o.castShadow=false;}
 }
 // Separate grass blades in local bunches catch the side light along the course and bank.
 const grassGeometry=[[],[],[]],grassM=[0x99a777,0xa8b480,0x829365].map(c=>material(c,{side:T.DoubleSide}));
 function clear(x,z){
   for(let h=0;h<3;h++){let s=G.holes[h].z+4.25-z;
     if(s>=-1.1&&s<=G.holes[h].length+1.2&&Math.abs(x-G.point(h,s).x)<width(h,s)+.03)return false;}
   return !(x>streamLeft&&x<streamRight&&Math.abs(z-creekZ(x))<creekWidth(x));
 }
 for(let i=0;i<11800;i++){
   const x=range(-13,16),z=range(-13,8);
   if(!clear(x,z))continue;
   const n=3+Math.floor(rand()*4),base=range(.049,.155);
   for(let j=0;j<n;j++){
     const a=rand()*TAU,dx=Math.cos(a),dz=Math.sin(a),r=range(.015,.048),b=range(.005,.016),h=base*range(.65,1.23),bend=h*range(.18,.62);
     const bx=x+dx*r,bz=z+dz*r,buf=grassGeometry[(i+j)%3];
     buf.push(bx-dz*b,.002,bz+dx*b,bx+dz*b,.002,bz-dx*b,bx+dx*bend,h,bz+dz*bend);
   }
 }
 grassGeometry.forEach((pos,i)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();const o=mesh(g,grassM[i],0,0,0,scene);o.castShadow=false;});
 for(let i=0;i<30;i++){
   const g=new T.Group();scene.add(g);let x,z;
   if(i<15){x=range(3.8,14.5);z=creekZ(x)+(i%2?1:-1)*creekWidth(x)*range(.88,1.12);}
   else{const p=patches[(i-15)%patches.length];x=p[0]+range(-.3,.3);z=p[1]+range(-.3,.3);}
   g.position.set(x,0,z);
   for(let j=0;j<4;j++){
     const a=j*2.4+rand(),h=range(.25,.64);
     const o=oval(.06*Math.sin(a),h*.46,.06*Math.cos(a),.024,h*.54,.042,greens[(i+j)%5],g,bushOrb);o.rotation.set(.16*Math.cos(a),a,.24*Math.sin(a));
     if(i<15&&j===0){twig([0,0,0],[.04,h+.19,.012],.009,.007,stems[1],6,g);oval(.04,h+.18,.012,.022,.075,.025,darkWood,g);}
   }
   live.reeds.push(g);
 }
 // Low field stones in informal stepping paths beside the beds.
 for(let i=0;i<36;i++){
   const x=-3.68+.31*Math.sin(i*.6)+(i>16?9.07:0),z=7.1-(i%18)*.94;
   if(!clear(x,z))continue;
   const o=oval(x,.018,z,range(.23,.41),range(.045,.085),range(.15,.3),choose(gravel),fixed,bushOrb);o.rotation.y=rand()*TAU;
 }
 // Worn stepping stones lead from the lawn to the rounded tee.
 for(let i=0;i<4;i++){
   const o=oval(-.18-i*.42,.022,5.88+i*.73,.40+.045*(i%2),.047,.25+.045*(i%2),gravel[i%4],fixed,bushOrb);
   o.rotation.y=.28+i*.37;
 }
 // Golf-ball dimples are a spherical normal field, with equal angular spacing along each latitude.
 const dimple=canvas(768,384,(ctx,w,h)=>{
   const a=ctx.createImageData(w,h),p=a.data,rows=19;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const lat=(y+.5)*Math.PI/h,row=Math.floor(lat/Math.PI*rows),dy=(lat/Math.PI*rows-row-.5)*2;
     const count=Math.max(3,Math.round(2*rows*Math.sin((row+.5)*Math.PI/rows)));
     const phase=(x/w*count+(row%2)*.5),dx=(phase-Math.floor(phase)-.5)*2;
     const rr=dx*dx+dy*dy,k=4*(y*w+x),strength=rr<.72?.78*(1-rr/.72):0;
     p[k]=128+dx*strength*170;p[k+1]=128-dy*strength*170;p[k+2]=255;p[k+3]=255;
   }ctx.putImageData(a,0,0);
 },true,false);
 const ballMat=material(0xfff6da,{roughness:.36,normalMap:dimple,normalScale:new T.Vector2(1.45,1.45)});
 live.ball=mesh(ballOrb,ballMat,0,0,0,scene);live.ball.scale.setScalar(G.radius);
 live.ballHalo=ring(0,0,0,.235,.009,brass,scene);
 const moteMat=material(0xf9e5b1,{emissive:0xffedb6,emissiveIntensity:.23});
 live.dust=new T.InstancedMesh(leafOrb,moteMat,30);live.dust.frustumCulled=false;scene.add(live.dust);
 // Static sections sharing a material are batched once for mobile GPUs.
 fixed.updateMatrixWorld(true);
 function mergeStatic(group){
   const batches=new Map();group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert();
   group.traverse(o=>{
     if(!o.isMesh)return;
     const key=o.material.uuid+o.castShadow;
     if(!batches.has(key))batches.set(key,{mat:o.material,cast:o.castShadow,ps:[],ns:[],uv:[],ix:[]});
     const b=batches.get(key),g=o.geometry,pos=g.attributes.position,nor=g.attributes.normal,uv=g.attributes.uv,base=b.ps.length/3;
     const mat=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(mat),v=V(0,0,0);
     for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mat);b.ps.push(v.x,v.y,v.z);
       v.fromBufferAttribute(nor,i).applyNormalMatrix(nm);b.ns.push(v.x,v.y,v.z);b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}
     if(g.index)for(let i=0;i<g.index.count;i++)b.ix.push(base+g.index.getX(i));else for(let i=0;i<pos.count;i++)b.ix.push(base+i);
   });
   group.clear();
   batches.forEach(b=>{
     const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.ps,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.ns,3));
     g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setIndex(b.ix);
     const o=mesh(g,b.mat,0,0,0,group);o.castShadow=b.cast;
   });
 }
 mergeStatic(fixed);live.blades.forEach(mergeStatic);live.reeds.forEach(mergeStatic);live.boughs.forEach(mergeStatic);
 const dummy=new T.Object3D();
 function instance(mesh,i,x,y,z,w,h,l){
   dummy.position.set(x,y,z);dummy.scale.set(w,h,l);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
 }
 function apply(S){
   live.rotor.rotation.z=S.rotor.angle;live.rollers.forEach((r,i)=>r.rotation.x=-S.rotor.angle*18+i*.72);
   live.blades.forEach((o,i)=>o.rotation.x=S.rotor.blades[i].bend);
   const b=S.ball;live.ball.position.set(b.x,b.y,b.z);live.ball.rotation.x=-b.spin;live.ball.rotation.z=-b.lateral/G.radius;
   live.ball.visible=b.drop<.4&&!(S.hole===2&&b.s>3.95&&b.s<6.22);
   live.ballHalo.position.set(b.x,G.floor(S.hole,b.s)+.029,b.z);
   live.ballHalo.visible=S.phase==='ready'||S.phase==='charge';
   live.ballHalo.scale.setScalar(1+S.pad.travel*2+S.hint.depth*.10);
   live.flag.forEach((f,i)=>{
     f.group.position.y=f.base+.75+.94*S.flags[i].lift;
     const pos=f.cloth.geometry.attributes.position;
     for(let j=0;j<=8;j++){
       const u=j/8,q=S.flags[i].cloth[Math.max(0,j-1)],a=u*q.bend;
       for(let k=0;k<2;k++){
         pos.setXYZ(j*2+k,u*.75-.018*u*u,-k*.41*(1-u*.95)-.096*u*u+u*q.v*.17,a+u*.045*Math.sin(u*11+q.bend*10));
       }
     }pos.needsUpdate=true;f.cloth.geometry.computeVertexNormals();
   });
   for(let i=0;i<live.slats.length;i++)live.slats[i].mesh.position.y=live.slats[i].base+S.wood[i].bend;
   const chock=G.point(1,S.rampCatch.s-.10);
   live.catch.position.set(chock.x,chock.y+.014-S.rampCatch.load,chock.z);
   const pos=waterG.attributes.position;
   for(let i=0;i<=54;i++)for(let j=0;j<=8;j++){
     const k=i*9+j,u=i/54*5,v=j/8*5,ix=Math.floor(u),iy=Math.floor(v),x=u-ix,y=v-iy;
     const sample=(a,b)=>S.water[Math.min(5,b)*6+Math.min(5,a)].height;
     const y0=(1-x)*sample(ix,iy)+x*sample(ix+1,iy),y1=(1-x)*sample(ix,iy+1)+x*sample(ix+1,iy+1);
     pos.setY(k,.034+(y0*(1-y)+y1*y)*.88+.009*Math.sin(i*.73+j*.92+S.water[(i+j)%36].height*29));
   }pos.needsUpdate=true;waterG.computeVertexNormals();
   live.boughs.forEach((o,i)=>{o.rotation.z=S.boughs[i].angle;o.rotation.y=-S.boughs[i].angle*.45;});
   live.reeds.forEach((o,i)=>{o.rotation.z=S.reeds[i].bend;o.rotation.x=.29*S.reeds[i].bend;});
   S.motes.forEach((q,i)=>{const r=.005+.002*(i%4);instance(live.dust,i,q.x,q.y,q.z,r,r*.8,r);});live.dust.instanceMatrix.needsUpdate=true;
   S.drops.forEach((q,i)=>{const r=q.life>0?.023+(i%4)*.003:0;
     instance(live.drops,i,fountain.x+q.x,fountain.y+q.y,fountain.z+q.z,r,r*(1+Math.abs(q.vy)*.25),r);
   });live.drops.instanceMatrix.needsUpdate=true;live.drops.visible=S.pump>.005||S.drops.some(d=>d.life>0);
 }
 return {apply,ball:live.ball,mill:live.rotor,fountain};
};
})();
