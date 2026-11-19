'use strict';
const architecture=group(), tileMats=[0x547969,0x608475,0x708b78,0x5c7d6e,0x638675].map(c=>mat(c,.31,.06));
const creamPaint=mat(0xe5d6b4,.66), plaster=mat(0xc5c6a9,.8);
const edgeWood=mat(0xb1885e,.59,0,{map:oakTexture});
box(architecture,walnut,0,-.34,-.36,30,.64,11.8);
for(let j=0;j<13;j++){
 const b=box(architecture,wood,0,-.062,5.1-j*.91,29,.122,.9);
 b.geometry=boxGeo.clone();const uv=b.geometry.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2.05+j*.57,uv.getY(i)*.5+j*.37);
}
box(architecture,darkGreen,0,-1.78,4.95,27,2.85,.66);
for(let i=-4;i<5;i++){
 box(architecture,enamel,i*2.68,-1.58,5.32,2.57,2.42,.10);
 box(architecture,darkGreen,i*2.68,-1.66,5.38,2.16,1.96,.06);
 line(architecture,brass,[[i*2.68-.32,-.85,5.42],[i*2.68-.26,-.82,5.54],[i*2.68+.26,-.82,5.54],[i*2.68+.32,-.85,5.42]],.035);
}
box(architecture,plaster,0,3.3,-6.42,32,7,.22).castShadow=false;
for(let r=0;r<2;r++)for(let c=-11;c<=12;c++){
 box(architecture,tileMats[Math.floor(random()*5)],c*1.47+(r%2)*.71,.39+r*.75,-6.24,1.451,.729,.10);
}
box(architecture,edgeWood,0,1.60,-6.12,29,.14,.43);
// A real glazed window with a view between the mullions.
const garden=mat(0xc9d6ae,.96,0,{emissive:0xadc9a0,emissiveIntensity:.45});
box(architecture,garden,-3.25,4.8,-6.23,10.5,6.2,.19).castShadow=false;
const foliage=[0xa8ba89,0xbfca99,0xd0d2a3,0x92a575].map(c=>mat(c,.92,0,{emissive:c,emissiveIntensity:.13}));
for(let i=0;i<74;i++){
 const x=-8.25+random()*10,y=1.8+random()*5.4;
 if(y>4&&x>-5&&x<-.2)continue;
 const r=.14+random()*.5;
 const o=ball(architecture,foliage[i%4],x,y,-6.04,r,r*.76,.05);o.castShadow=false;
}
const outsideBark=mat(0x929378,.9);
line(architecture,outsideBark,[[-7.3,1.8,-5.99],[-6.48,3.15,-5.98],[-6.04,4.02,-5.97],[-5.86,5.29,-5.97]],.052).castShadow=false;
line(architecture,outsideBark,[[-6.6,3.00,-5.99],[-5.86,3.59,-5.98],[-4.82,4.12,-5.98]],.029).castShadow=false;
const pane=mat(0xe9f0d8,.12,.12,{transparent:true,opacity:.08,depthWrite:false});
box(architecture,pane,-3.3,4.4,-5.95,10.2,5.3,.011).castShadow=false;
for(const x of [-8.4,-5.65,-2.9,-.15,1.85]){
 box(architecture,creamPaint,x,4.48,-5.89,.14,5.64,.19);
 box(architecture,edgeWood,x+.082,4.48,-5.97,.035,5.64,.17);
}
box(architecture,creamPaint,-3.25,3.99,-5.88,10.45,.13,.2);
box(architecture,wood,-3.25,1.69,-5.89,10.7,.15,.68);
const shutter=mat(0x3c6251,.59);
for(let i=0;i<19;i++)box(architecture,shutter,2.07+i*.5,4.47,-6.03,.485,5.61,.23);
box(architecture,darkGreen,6.6,1.9,-5.86,9.65,.17,.25);
function leaf(g,m,x,y,z,length,width,angle,lean){
 const p=[],ix=[],uv=[];for(let i=0;i<=10;i++){
  const u=i/10,w=Math.sin(PI*u)**.74*width;
  for(let j=-1;j<=1;j++){p.push(j*w,length*u,.12*length*Math.sin(PI*u)-Math.abs(j)*w*.28);uv.push((j+1)/2,u);}
  if(i<10)for(let k=0;k<2;k++){const a=3*i+k;ix.push(a,a+3,a+1,a+1,a+3,a+4);}
 }
 const o=mesh(g,geom(p,ix,uv),m,x,y,z);o.material.side=T.DoubleSide;o.rotation.set(lean||0,0,angle);return o;
}
function pottery(g,x,z,scale){
 const v=group(g);v.position.set(x,.01,z);v.scale.setScalar(scale);
 const pot=mat(0x9daf9a,.22,.08);
 lathe(v,pot,[[0,.02],[.4,.02],[.43,.09],[.54,.16],[.62,.49],[.59,.91],[.42,1.12],[.31,1.21],[.31,1.32],[.35,1.35],[.35,1.4],[.27,1.4],[.26,1.28]],0,0,0);
 lathe(v,brass,[[.346,1.337],[.354,1.35],[.353,1.36]],0,0,0);
 const twig=mat(0x70563d,.85),petal=mat(0xf7ecdf,.63),heart=mat(0xccac62,.66);
 for(let b=0;b<5;b++){
  const dx=(b-2)*.31+.09,dz=.19*Math.sin(b*1.96),height=1.55+random()*.53;
  line(v,twig,[[0,1.29,0],[dx*.27,1.92,dz*.4],[dx*.73,2.35,dz],[dx*1.47,1.32+height,dz*1.4]],.019);
  for(let j=0;j<5;j++){
   const t=.27+j*.16,sign=(j%2?1:-1),bx=dx*t*1.4,by=1.38+height*t,bz=dz*t+.1;
   line(v,twig,[[bx-.08*dx,by-.15,bz-.07],[bx+.13*sign,by+.01,bz]],.01);
   if(j%3===0)leaf(v,palette.leaf,bx,by,bz,.26,.063,sign*.95,.3);
   const blossom=group(v);blossom.position.set(bx+.13*sign,by+.03,bz);
   blossom.rotation.x=-.13-random()*.65;blossom.rotation.y=random()*.8;
   for(let k=0;k<5;k++){const a=k*TAU/5+j,pet=ball(blossom,petal,.058*Math.cos(a),.058*Math.sin(a),0,.064,.044,.025);pet.rotation.z=a;}
   ball(blossom,heart,0,0,.024,.033,.033,.019);
  }
 }
 return v;
}
pottery(architecture,layout.narrow?3:4.35,-4.6,1.04);
// A folded cotton towel runs out of frame at the near corner.
function textile(g,x,z,w,d,y,angle){
 const t=group(g);t.position.set(x,y,z);t.rotation.y=angle;
 const p=[],ix=[],uv=[],nx=32,nz=26;
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,v=j/nz;
  const a=.038*Math.sin(8.7*u+v)+.021*Math.sin(26*u-2*v)+.013*Math.cos(7*v);
  p.push((u-.5)*w+.035*Math.sin(v*8),a+.03*Math.sin(PI*v),(v-.5)*d);uv.push(u,v);
  if(j<nz&&i<nx){const k=j*(nx+1)+i;ix.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}
 }
 mesh(t,geom(p,ix,uv),linen);
 const hem=mat(0xe3dbbf,.98);
 for(let i=0;i<90;i++){const u=i/89,x0=(u-.5)*w,yy=.038*Math.sin(8.7*u+1)+.021*Math.sin(26*u-2);
 line(t,hem,[[x0,yy,d*.5-.012],[x0+.013,yy-.01,d*.5+.04],[x0+.02*Math.sin(i),yy-.015,d*.5+.09+random()*.055]],.0065);}
 return t;
}
textile(architecture,layout.narrow?-2.72:-4.13,2.76,3.3,4.2,.068,-.30);
textile(architecture,layout.narrow?-2.90:-4.32,2.73,3.15,4.08,.122,-.26);
// A lidded stoneware starch jar on the rear worktop.
const jar=group(architecture);jar.position.set(layout.narrow?-3.21:-4.65,0,-3.83);
const bone=mat(0xe0d3b1,.33);
lathe(jar,bone,[[.01,.03],[.43,.03],[.50,.09],[.55,.22],[.57,.94],[.54,1.09],[.46,1.18],[.45,1.24],[.41,1.25]]);
lathe(jar,enamel,[[.01,1.25],[.48,1.23],[.48,1.29],[.42,1.32],[.39,1.37],[.23,1.39],[.01,1.40]]);
ball(jar,edgeWood,0,1.44,0,.122,.085,.122);
for(const y of [.195,.241,1.10])lathe(jar,ink,[[y>1?.529:.55,y],[y>1?.524:.552,y+.017]]);
for(let i=0;i<8;i++){const a=i*TAU/8;
 const stem=group(jar);stem.rotation.y=a;stem.position.set(.566*Math.sin(a),.63,.566*Math.cos(a));
 line(stem,ink,[[-.075,-.12,.005],[0,0,.014],[.065,.12,0]],.009);
 const l=ball(stem,ink,-.006,.055,.012,.034,.078,.009);l.rotation.z=.58;
 const r=ball(stem,ink,.048,-.005,.011,.032,.066,.009);r.rotation.z=-.78;
}
batch(architecture);
function roundedRing(w,d,r,n=14){
 const pts=[];for(let c=0;c<4;c++){
 const a0=c*PI/2,cx=(c===0||c===3?1:-1)*(w/2-r),cz=(c<2?1:-1)*(d/2-r);
 for(let i=0;i<=n;i++){const a=a0+i/n*PI/2;pts.push([cx+r*Math.cos(a),cz+r*Math.sin(a)]);}
 }return pts;
}
const tray=group();tray.position.z=layout.z;
function trayShell(rows,m){
 const p=[],ix=[],uv=[];
 for(let j=0;j<rows.length;j++){
 const [inset,y]=rows[j],ring=roundedRing(layout.w-2*inset,layout.d-2*inset,.49-inset*.27);
 for(let i=0;i<ring.length;i++){
 const [x,z]=ring[i];p.push(x,y,z);uv.push(x/layout.w+.5,z/layout.d+.5);
 if(j>0){const a=(j-1)*ring.length+i,b=(j-1)*ring.length+(i+1)%ring.length;
 ix.push(a,b,a+ring.length,b,b+ring.length,a+ring.length);}
 }}
 const o=mesh(tray,geom(p,ix,uv),m);m.side=T.DoubleSide;return o;
}
function rim(inset,y,r,m){
 const ring=roundedRing(layout.w-inset*2,layout.d-inset*2,.49-inset*.27,12);
 const path=new T.CurvePath();ring.forEach(([x,z],i)=>{const e=ring[(i+1)%ring.length];path.add(new T.LineCurve3(V(x,y,z),V(e[0],y,e[1])));});
 return mesh(tray,new T.TubeGeometry(path,240,r,8,true),m);
}
trayShell([[.23,.075],[.09,.115],[0,.375],[.018,.409],[.087,.425],[.15,.36],[.24,.245],[.39,.22]],enamel);
rim(.038,.41,.045,darkGreen);rim(.093,.414,.019,ivory);rim(.20,.278,.014,brass);
const flourTex=surfaceTexture(448,256,(i,j,u,v)=>{
 const x=(u-.5)*layout.w,z=(v-.5)*layout.d;
 const n=.49*noise(x*2.3+8,z*2.3+5)+.26*noise(x*7.4,z*7.4)+.15*noise(x*20,z*20)+.1*hash(i,j);
 const patch=Math.exp(-(((x-layout.start)/2.05)**2+((z-.22)/1.14)**2));
 const swish=Math.pow(Math.max(0,Math.cos(Math.hypot((x+.14)*.87,z+2.77)*25+noise(x*2,z*3)*4)),5);
 const a=clamp((n+.52*patch-.59)*2.55-swish*.16)*(.75+hash(i+28,j)*.24);
 const m=noise(x*7,z*6)*7;
 return [76+m+(228-76)*a,101+m+(221-101)*a,88+m+(202-88)*a];
});
const floorMat=mat(0xffffff,.58,.13,{map:flourTex,bumpMap:flourTex,bumpScale:.017});
{
 const ring=roundedRing(layout.w-.60,layout.d-.60,.42),p=[0,.228,0],uv=[.5,.5],ix=[];
 ring.forEach(([x,z],i)=>{p.push(x,.228,z);uv.push(x/layout.w+.5,z/layout.d+.5);ix.push(0,1+(i+1)%ring.length,i+1);});mesh(tray,geom(p,ix,uv),floorMat);
}
for(const sign of [-1,1]){
 const x=sign*(layout.w*.5-.09);
 line(tray,brass,[[x,.28,-.65],[x+sign*.27,.35,-.64],[x+sign*.38,.42,-.48],[x+sign*.38,.42,.48],[x+sign*.27,.35,.64],[x,.28,.65]],.062);
 for(const z of [-.65,.65])ball(tray,brass,x,.375,z,.092,.041,.094);
}
batch(tray);
function grains(parent,count,where,material){
 const g=new T.IcosahedronGeometry(1,0),o=new T.InstancedMesh(g,material,count),dummy=new T.Object3D();
 for(let i=0;i<count;i++){const [x,y,z,r]=where(i);dummy.position.set(x,y,z);dummy.rotation.set(random()*3,random()*4,random());dummy.scale.set(r*(.68+random()),r*.35,r);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);}
 o.receiveShadow=true;parent.add(o);return o;
}
grains(tray,1050,()=>{
 const a=random()*TAU,r=Math.sqrt(random()),x=(layout.start*.52)+Math.cos(a)*r*(layout.w*.43),z=.09+Math.sin(a)*r*1.85;
 return [x,.234,z,.007+random()**3*.031];
},chalk);
const blue=mat(0x40695f,.32),glaze=mat(0xf3ead4,.2,.04);
function saucer(radius, pattern){
 const g=group(),r=radius;
 const profile=[[0,.10],[.42,.10],[.48,.08],[.49,.034],[.55,.035],[.57,.10],[.81,.138],[.98,.235],[1,.26],[.997,.29],[.974,.296],[.91,.252],[.76,.177],[.56,.145],[.25,.138],[.001,.138]];
 lathe(g,glaze,profile.map(([x,y])=>[x*r,y]),0,0,0,96);
 for(const [rr,yy,th] of [[.965,.287,.011],[.801,.201,.007]]){
 lathe(g,blue,[[rr*r-th,yy-.005],[rr*r,yy+.003],[rr*r+th,yy+.008]]);
 }
 for(let k=0;k<16;k++){
 const a=TAU*k/16, sprig=group(g);sprig.rotation.y=-a;sprig.position.set(Math.cos(a)*r*.889,.243,Math.sin(a)*r*.889);
 for(let j=-1;j<=1;j++){const l=ball(sprig,pattern?blue:sage,.01,.003,j*.051,.017,.009,.044);l.rotation.y=j*.68+.3;l.rotation.z=.28;}
 }
 batch(g);return g;
}
const goalPlate=saucer(layout.narrow?1.23:1.51,true),berryPlate=saucer(layout.narrow?1.16:1.36,false);
goalPlate.position.set(-layout.plateX,.03,layout.plateZ+.05);berryPlate.position.set(layout.plateX,.03,layout.plateZ);
const props=group();
// A bamboo flour spoon with a hollow bowl and a slender turned handle.
const spoon=group(props);spoon.position.set(layout.narrow?2.96:4.2,.10,layout.narrow?2.48:3.16);spoon.rotation.y=-.79;
const bamboo=mat(0xd8ae73,.56,0,{bumpMap:grain,bumpScale:.012});
const scoop=lathe(spoon,bamboo,[[.001,.025],[.22,.035],[.46,.12],[.50,.23],[.48,.259],[.45,.245],[.4,.17],[.2,.11],[.001,.095]]);scoop.scale.z=1.3;
line(spoon,bamboo,[[0,.2,.48],[0,.25,.85],[.02,.28,1.42],[.02,.29,2.1]],.092);
ball(spoon,chalk,-.03,.177,-.02,.40,.12,.48);
grains(props,145,()=>[spoon.position.x+(random()-.68)*1.7,.017,spoon.position.z+(random()-.6)*1.2,.008+random()*.018],chalk);
batch(props);
