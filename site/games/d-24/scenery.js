'use strict';
const E=LockWater.edges,F=LockWater.floor,H=LockWater.top;
// Far ridges have a continuous, eroded profile and a separate tree line.
function ridge(cx,cz,rx,rz,base,height,colour,seed){
 const g=new T.SphereGeometry(1,46,18);const v=g.attributes.position;
 for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),z=v.getZ(i);
 const q=1+.16*Math.sin(x*8+seed+z*3)+.11*Math.sin(z*12+x*7+seed)+.06*Math.cos(x*25+seed);
 v.setXYZ(i,x*rx,base+Math.max(-.3,y)*height*q,z*rz);}
 g.computeVertexNormals();const ob=mesh(land,g,mat(colour,1,0,'stone'),cx,0,cz);ob.castShadow=false;
}
for(let i=0;i<11;i++){ridge(-140+i*25,-94-range(0,25),range(22,44),range(20,38),1,range(12,25),pick([0x879e9c,0x99aaa3,0x799294]),i);}
for(let i=0;i<8;i++){ridge(-83+i*21,-79-range(0,8),range(17,29),range(12,22),4.7,range(5,11),pick([0x788e7a,0x829986,0x6c887b]),i+10);}
ridge(-44,-2,24,48,-1,12,0x6c8266,11);ridge(49,-31,27,44,1.2,14.4,0x86916c,19);
function rowLevel(z){return z>E[1]?F[0]:z>E[2]?F[1]:z>E[3]?F[2]:H[2];}
function ground(side,x,z){
 const terrace=z>-2?1.25:z>-10.5?3.03:z>-19?4.97:5.43;
 return terrace+Math.max(0,Math.abs(x)-4)*.15+Math.max(0,Math.abs(x)-5)*(.11*Math.sin(z*.45)+.12*Math.cos(x*.47));
}
function terrain(side){const v=[],ind=[],colors=[];const rows=62,cols=14;
 for(let j=0;j<=rows;j++){const z=11-j*.68;
 for(let i=0;i<=cols;i++){
  let shore=3.68+(z>2?Math.pow((z-2)*.33,1.7):0);
  if(z<-19)shore+=Math.pow((-19-z)*.73,1.72);
  if(side===1 && z>0)shore+=Math.pow(z*.39,2);
  const x=side*(shore+i*1.5);let y=ground(side,x,z);
  if(i===0)y=rowLevel(z)-.24;
  if(j<9)y-=Math.pow((9-j)/9,1.1)*2;
  v.push(x,y+.125*noise(i*.44,j*.28,16),z);const c=new T.Color(0x99a47b).lerp(new T.Color(0x6d8568),rnd()*.66+.18*Math.sin(i*.8));colors.push(c.r,c.g,c.b);
  if(j&&i){const a=j*(cols+1)+i;if(side===1)ind.push(a-1,a-cols-2,a,a,a-cols-2,a-cols-1);else ind.push(a,a-cols-2,a-1,a-cols-1,a-cols-2,a);}
 }}
 const ma=mat(0xe0dece,.98,0,'stone',{vertexColors:true,side:T.DoubleSide});const ob=triangles(land,v,ind,ma);ob.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
}terrain(-1);terrain(1);
const blockShades=[0xf5f1e9,0xe8e3d7,0xfff8ec,0xdedaca,0xd8d5c6,0xe0ded1];
function wall(side,k){
 const end=E[k+1],start=k===0?7.85:E[k], base=F[k]-.42;
 const high=k===0?(side>0?1.55:1.68):H[k]+.36;
 const x=side*3.47;
 box(land,x,(high+base)/2,(start+end)/2,.72,high-base,start-end,m.mortar);
 const layers=Math.max(3,Math.round((high-base)/.36)),rh=(high-base)/layers;
 for(let r=0;r<layers;r++){let z=end;while(z<start-.015){const len=Math.min(start-z,range(.72,1.32)*(z===end && r%2===0?.57:1));
 const ob=box(land,x+side*range(-.024,.024),base+(r+.5)*rh,z+len/2,.83,rh-.025,len-.027,r<2?m.wet:m.stone);tint(ob,pick(blockShades));ob.rotation.y=range(-.012,.012);z+=len;}}
 let z=end;while(z<start-.015){const len=Math.min(start-z,range(1.01,1.56));tint(box(land,x,high+.075,z+len/2,1.03,.19,len-.026,m.cap),pick(blockShades));z+=len;}
 if(k>0 || side<0){for(let z=end+1.45;z<start;z+=3){const p=rod(land,x,high+.377,z,.091,.42,m.iron,.105);rod(land,x,high+.58,z,.135,.085,m.iron);}}
}
for(let k=0;k<3;k++){wall(-1,k);wall(1,k);}
function pier(x,z,base,top){
 box(land,x,(top+base)/2,z,1.36,top-base,1.6,m.mortar);
 const nr=Math.ceil((top-base)/.4),h=(top-base)/nr;
 for(let r=0;r<nr;r++){for(let t=0;t<2;t++){const offset=r%2===0;tint(box(land,x+(offset?(t-.5)*.71:0),base+h*(r+.5),z+(offset?0:(t-.5)*.85),offset?.69:1.44,h-.022,offset?1.69:.83,r<2?m.wet:m.stone),pick(blockShades));}}
 box(land,x,top+.09,z,1.65,.25,1.89,m.cap);
}
function paddlewheel(k) {
 const z=E[k+1],hi=H[k]+.37;
 for(const side of [-1,1])pier(side*3.47,z,F[k]-.45,hi);
 const leafs=[];
 for(const side of [-1,1]){
  const pivot=group(scene,side*3.02,F[k]-.47,z-.02);
  const len=3.075,h=hi-F[k]+.32, n=11;
  for(let i=0;i<n;i++){let x=-side*((i+.5)*len/n);
    tint(box(pivot,x,h*.5+.02,.04,len/n-.017,h,.31,i%4===1?m.walnut:m.oak),pick(blockShades));
    box(pivot,x,.30,.225,len/n-.016,.58,.06,m.darkwood);
  }
  for(const yy of [.24,h*.51,h-.13]){box(pivot,-side*len/2,yy,.245,len+.03,.145,.083,m.iron);
    for(let j=0;j<6;j++)orb(pivot,-side*(.15+j*.52),yy,.302,.037,.037,.021,m.steel);}
  slat(pivot,[-side*.14,.42,.275],[-side*(len-.16),h-.29,.275],.17,.1,m.walnut);
  box(pivot,-side*len*.5,h+.035,.04,len+.1,.14,.48,m.honey);
  rod(pivot,-side*.12,h*.5,.23,.086,h+.24,m.iron);
  bake(pivot);leafs.push(pivot);
 }gates.push(leafs);
 const bx=2.96,by=hi,wg=group(scene,bx,by+.99,z+.48);
 box(land,bx,by+.14,z+.15,.7,.19,.66,m.iron);rod(land,bx,by+.56,z+.15,.16,.76,m.iron,.12);
 const gearbox=rod(land,bx,by+.99,z+.24,.27,.32,m.iron);gearbox.rotation.x=pi/2;
 const r=k===0?.66:.59;ring(wg,0,0,0,r,.083,m.gold,40);
 for(let j=0;j<6;j++){let a=2*pi*j/6;beam(wg,[0,0,0],[Math.cos(a)*r,Math.sin(a)*r,0],.046,m.brass,.058);}
 const hub=rod(wg,0,0,0,.149,.19,m.brass);hub.rotation.x=pi/2;
 orb(wg,0,0,.11,.09,.09,.046,m.gold);
 const grip=rod(wg,0,r,.101,.078,.25,m.walnut);grip.rotation.x=pi/2;
 wg.rotation.y=.26;bake(wg);wheels.push(wg);anchors['valve'+k]=wg;
 // A short delivery elbow sits inside the right jamb, above the water.
 cable(land,[[3.07,hi-.22,z+.78],[2.78,hi-.22,z+.78],[2.65,hi-.33,z+.8],[2.65,hi-.56,z+.9]],.158,m.iron);
 const pipe=ring(land,2.65,hi-.56,z+.9,.16,.035,m.brass);pipe.rotation.x=pi/2-.18;
}for(let k=0;k<3;k++)paddlewheel(k);
// The lower river sill keeps the first chamber full when the supply is open.
for(let i=0;i<22;i++)box(land,-3.02+i*.287,.46,7.85,.279,1.96,.27,m.darkwood);
box(land,0,1.44,7.85,6.4,.13,.36,m.honey);
for(let side of [-1,1])pier(side*3.46,7.85,-.4,1.56);
function windowFrame(p,x,y,z,w,h){
 box(p,x,y,z,w+.13,h+.13,.095,m.cream);box(p,x,y,z+.057,w,h,.025,m.glass);
 box(p,x,y,z+.09,.051,h,.05,m.cream);box(p,x,y-.04,z+.091,w,.05,.048,m.cream);box(p,x,y-h/2-.065,z+.09,w+.22,.085,.18,m.cap);
}
function gable(p,w,d,wallH,rise,roofmat){
 const v=[-w/2,wallH,d/2,w/2,wallH,d/2,0,wallH+rise,d/2,-w/2,wallH,-d/2,w/2,wallH,-d/2,0,wallH+rise,-d/2];
 triangles(p,v,[0,1,2,5,4,3],m.cream);
 const slope=Math.atan2(rise,w/2),span=Math.hypot(w/2,rise)+.32;
 for(const side of [-1,1]){const roof=box(p,side*w*.25,wallH+rise*.5+.08,0,span,.14,d+.52,roofmat);roof.rotation.z=-side*slope;
  const rows=Math.ceil(span/.29);
  for(let j=0;j<rows;j++){const fraction=(j+.45)/rows;const xx=side*(w/2+.18)*fraction,yy=wallH+rise*(1-fraction)+.17;
   box(p,xx,yy,0,.096,.09,d+.54,roofmat).rotation.z=-side*slope;}
  for(let z of [d/2+.24,-d/2-.24])slat(p,[0,wallH+rise+.08,z],[side*(w/2+.19),wallH-.04,z],.12,.105,m.cream);
 }beam(p,[0,wallH+rise+.16,-d/2-.26],[0,wallH+rise+.16,d/2+.26],.102,roofmat);
}
function house(x,y,z,w,h,d,paint,roof,turn,detail=false){
 const p=group(land,x,y,z);p.rotation.y=turn;
 box(p,0,.18,0,w+.18,.36,d+.18,m.stone);box(p,0,h*.5+.2,0,w,h,d,paint);
 const wh=h+.2;gable(p,w,d,wh,h*.46,roof);
 for(let xx of [-w*.28,w*.28])windowFrame(p,xx,wh*.61,d/2+.01,w*.225,h*.36);
 windowFrame(p,0,wh+.19,d*.5+.02,w*.15,h*.21);
 box(p,0,.65,d*.5+.035,w*.2,1.26,.08,m.green);
 for(let side of [-1,1]){const sideWin=group(p,side*(w/2+.012),0,0);sideWin.rotation.y=side*pi/2;for(let zz of [-.24,.24])windowFrame(sideWin,zz*d,h*.66,0,w*.22,h*.37);}
 box(p,-w*.26,wh+h*.34,-d*.21,.43,h*.79,.49,m.stone);box(p,-w*.26,wh+h*.73,-d*.21,.53,.13,.61,m.roof);
 if(detail){
  if(roof===m.roof){
   const rise=h*.46,slope=Math.atan2(rise,w*.5),rows=7;
   for(let side of [-1,1])for(let row=0;row<rows;row++){
    const f=(row+.55)/rows;
    for(let z=-d*.5-.2;z<d*.5+.16;z+=.31){
     const tile=box(p,side*f*(w*.5+.18),wh+rise*(1-f)+.172,z+.12+(row%2)*.07,
       Math.hypot(w*.5+.18,rise)/rows*1.11,.073,.285,roof);tile.rotation.z=-side*slope;
     tint(tile,pick([0xf8e8d5,0xe8d9c8,0xf1e0cc,0xfbe7ca,0xe5cfbe]));}
   }
  }
  for(let i=0;i<Math.floor(h/.18);i++){box(p,0,.41+.18*i,d/2+.012,w,.027,.033,paint);box(p,w*.5+.01,.41+.18*i,0,.027,.026,d,paint);}
  for(let xx of [-w*.45,w*.45])box(p,xx,wh*.49,d/2+.055,.12,wh,.095,m.cream);
  for(let side of [-1,1]){box(p,side*(w*.28+w*.151),wh*.61,d/2+.088,.16,h*.40,.08,m.green);}
  const aw=group(p,0,1.65,d/2+.46);aw.rotation.x=.19;for(let i=0;i<9;i++)box(aw,(i-4)*.225,0,0,.225,.055,1.1,i%2?m.cream:m.green);
  for(let side of [-1,1]){rod(p,side*.94,.83,d/2+.95,.044,1.65,m.walnut);}
 }
}
house(-6.65,ground(-1,-6.65,-1.8)-.11,-1.8,3.23,2.75,3.9,m.cream,m.roof,.69,true);
house(-7.65,ground(-1,-7.65,-13),-13,2.5,2.16,3,m.green,m.slate,.38,true);
house(-12.2,ground(-1,-12.2,-10),-10,2.9,2.3,3.25,m.cream,m.roof,.55);
const treeMat=[m.pine,mat(0x57705b,.96),mat(0x667d5b,.98),mat(0x435e50,.98)];
const foliage=cached('foliage',()=>{const g=new T.IcosahedronGeometry(1,1),v=g.attributes.position;for(let i=0;i<v.count;i++){let x=v.getX(i),y=v.getY(i),z=v.getZ(i);const f=1+.15*Math.sin(x*23+y*17+z*13);v.setXYZ(i,x*f,y*f,z*f);}g.computeVertexNormals();return g;});
function tree(x,y,z,h,kind=0){
 const p=group(land,x,y,z),ma=pick(treeMat);p.rotation.y=rnd()*6;
 rod(p,0,h*.375,0,h*.036,h*.75,m.walnut,h*.018,9);
 if(kind===0){for(let i=0;i<7;i++){const t=i/7,r=h*(.132+.12*Math.sin((t+.13)*pi))*(1-t*.65);
  const branch=mesh(p,foliage,ma,Math.sin(i*3)*r*.22,h*(.32+t*.66),Math.cos(i*3)*r*.2,r,h*(.16-t*.065),r*.88);branch.rotation.y=i*2.4;}}
 else if(kind===1){for(let i=0;i<9;i++){const a=i*2.399+.3,r=(i/9)*h*.22;
  const cx=r*Math.cos(a),cz=r*Math.sin(a),cy=h*(.91-i*.032);
  if(i>2)beam(p,[0,h*.39,0],[cx,cy,cz],h*.022,m.walnut,h*.009,7);
  const f=mesh(p,foliage,ma,cx,cy,cz,h*range(.17,.23),h*range(.11,.17),h*range(.15,.22));f.rotation.y=a;}}
 else{for(let i=0;i<5;i++){const t=i/5;const branch=rod(p,0,h*(.33+.6*t),0,h*(.25-.21*t),h*(.43-.19*t),ma,.015,10);branch.rotation.y=rnd()*6;}}
}
for(const q of [[-8,.4,4,1],[-9,-4,5.5,0],[-7.9,-6,5,0],[-11,-3,4.6,1],[-6,-8,3.6,0],[-11,-15,5,1],[10.5,-11,4.2,0],[11.7,-15,5.8,1],[-5.1,-17,3.1,0]]){
 tree(q[0],ground(Math.sign(q[0]),q[0],q[1]),q[1],q[2],q[3]);}
for(let j=0;j<87;j++){let x=range(11,27)*(j%3===0?1:-1),z=range(-22,4);tree(x,ground(Math.sign(x),x,z),z,range(2.2,6.2),pick([0,0,1,2]));}
function rock(x,y,z,sz){const ob=mesh(land,rockGeo,m.stone,x,y,z,sz*range(.75,1.3),sz*range(.4,.72),sz);ob.rotation.set(range(0,1),rnd()*6,range(0,.6));tint(ob,pick(blockShades));}
for(let j=0;j<130;j++){const side=j%2?1:-1,z=range(-19,7),x=side*range(4,8);rock(x,ground(side,x,z)-.09,z,range(.12,.47));}
const reed=mat(0x9c9f68,.92), blossom=mat(0xe9c875,.85);
for(let j=0;j<95;j++){const side=j%3? -1:1,z=range(-18,5.8),x=side*range(4.25,7.2),y=ground(side,x,z);
 for(let i=0;i<5;i++){const dx=range(-.22,.22),dz=range(-.2,.2),ht=range(.19,.49);beam(land,[x+dx,y-.04,z+dz],[x+dx*1.6,y+ht,z+dz*1.5],.026,reed,.006,5);
 if(i===0&&j%2===0)orb(land,x+dx*1.6,y+ht,z+dz*1.5,.045,.038,.04,blossom);}}
function dock(x,z,y,len,w){for(let i=0;i<Math.ceil(len/.29);i++){let zz=z+i*.29;tint(box(land,x,y,zz,w,.13,.28,m.honey),pick(blockShades));}
 for(let side of [-1,1])for(let dz of [0,len-.2]){rod(land,x+side*w*.43,y-.55,z+dz,.128,1.9,m.walnut);for(let j=0;j<3;j++){let rr=ring(land,x+side*w*.43,y+.21+j*.035,z+dz,.129,.024,m.rope);rr.rotation.x=pi/2;}}}
dock(-4.59,3,1.13,3.8,1.85);dock(4.34,3.3,1.02,3.0,1.41);
function barrel(x,y,z,r=.31){const p=group(land,x,y,z),h=r*2.7;
 rod(p,0,h*.52,0,r,h,m.oak,r*.93,16);for(let a of [.14,.50,.86])rod(p,0,h*a,0,r*1.013,.049,m.iron,r*1.013,16);rod(p,0,h+.012,0,r*.87,.037,m.honey);}
barrel(-4.74,1.23,4);barrel(-4.85,1.23,4.69,.25);barrel(4.51,1.12,5.5,.26);
function coil(x,y,z,r){for(let j=0;j<4;j++){const t=ring(land,x+j*.014,y+.025*j,z,r-.025*j,.029,m.rope,30);t.rotation.x=pi/2;t.scale.y*=.79;}}coil(4.37,1.13,4.5,.29);
function fence(side,z0,z1,x,y){let prev=null;for(let z=z0;z<=z1;z+=1.7){const yy=y??ground(side,x,z);box(land,x,yy+.43,z,.13,.9,.15,m.walnut);if(prev)cable(land,[[x,prev[1]+.78,prev[0]],[x,(prev[1]+yy)/2+.63,(prev[0]+z)/2],[x,yy+.78,z]],.031,m.rope);prev=[z,yy];}}
fence(-1,-8,1,-4.28);fence(1,-17,-10,4.1);
// A small harbor opens beyond the staircase.
ridge(14,-50,13,12,3.8,2.5,0x8e9976,5);ridge(-21,-46,12,15,3.9,2.6,0x809270,8);
for(let i=0;i<7;i++){let x=8+i%4*3.6,z=-48-Math.floor(i/4)*4;house(x,6.02,z,range(2.1,3.2),range(2.35,3.45),3.1,i%3?m.cream:m.green,i%2?m.roof:m.slate,.14);}
for(let i=0;i<16;i++)tree(range(13,23),6.1,range(-55,-47),range(2.8,5.1),i%3);
dock(4.5,-47,5.62,9,2.1);dock(6.3,-47,5.62,9,1.52);
const lightBase=group(land,3.9,5.05,-51.5);
rod(lightBase,0,.35,0,1.61,.7,m.stone,1.48,24);rod(lightBase,0,2.82,0,.98,4.68,m.cream,.7);
rod(lightBase,0,3.27,0,.838,.76,m.red,.8);rod(lightBase,0,5.22,0,1.12,.24,m.iron);
const lanternGlass=mat(0xbad5cd,.14,.12,'metal',{transparent:true,opacity:.22,depthWrite:false});
rod(lightBase,0,5.84,0,.64,.98,lanternGlass,.64,12);
for(let band=0;band<4;band++){const hoop=ring(lightBase,0,5.47+band*.235,0,.639,.012,m.brass);hoop.rotation.x=pi/2;}
for(let i=0;i<8;i++){let a=i*pi/4;rod(lightBase,.665*Math.cos(a),5.85,.665*Math.sin(a),.046,1.07,m.brass);}
rod(lightBase,0,6.55,0,.98,.65,m.green,.10,12);rod(lightBase,0,6.99,0,.06,.4,m.brass);
for(let yy of [1.6,3.2,4.43])windowFrame(lightBase,0,yy,.86,.28,.4);
const lampTarget=group(scene,3.9,10.92,-51.5);orb(lampTarget,0,0,0,.53,.5,.53,m.lamp);anchors.lamp=lampTarget;
dock(3.08,-44.2,5.62,1.92,1.56);
for(let i=0;i<8;i++){const x=6+i*.58,z=-43-i*.45;rod(land,x,6.08,z,.085,2.63,m.walnut);rod(land,x,7.385,z,.114,.09,m.honey);}
const bellMount=group(land,3.1,5.71,-43.7);for(let xx of [-.66,.66])box(bellMount,xx,1.01,0,.13,2.02,.18,m.green);box(bellMount,0,2.04,0,1.7,.18,.26,m.cream);
const bellModel=group(scene,3.1,7.67,-43.7);rod(bellModel,0,-.34,0,.41,.53,m.brass,.19);rod(bellModel,0,-.62,0,.47,.09,m.gold,.41);orb(bellModel,0,-.68,0,.105,.115,.105,m.iron);cable(bellModel,[[0,-.72,0],[.04,-.94,.04],[.06,-1.16,0]],.031,m.rope);anchors.bell=bellModel;
const pennants=group(scene,0,0,0);
for(let side of [-1,1]){rod(land,side*4.65,7.54,-48.7,.105,5.26,m.honey,.065);orb(land,side*4.65,10.21,-48.7,.14,.19,.14,m.brass);}
cable(pennants,[[-4.65,10.04,-48.7],[0,9.13,-48.7],[4.65,10.04,-48.7]],.03,m.rope);
for(let i=0;i<13;i++){const x=-4.3+i*.71,y=9.13+.91*(x/4.65)**2;const p=group(pennants,x,y,-48.7);const ma=[m.red,m.cream,m.green,m.gold][i%4];triangles(p,[-.235,0,0,.235,0,0,.04,-.64,.08],[0,1,2,2,1,0],ma);flagModels.push(p);}
