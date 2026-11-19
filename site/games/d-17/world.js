'use strict';
const room=group(),furniture=group(),village=group(),hills=group(),machinery=group(),loft=group();
const ZW=-2.4,WX=2.64,WR=1.83,YS=1.53,YR=3.78;
function archWall(p,c,r,base,shoulder,top,z,left,right){
 box(p,(left+c-r)/2,(base+top)/2,z,c-r-left,top-base,.42,M.plaster);
 box(p,(right+c+r)/2,(base+top)/2,z,right-c-r,top-base,.42,M.plaster);
 const s=new T.Shape();s.moveTo(-r,shoulder);s.absarc(0,shoulder,r,Math.PI,0,true);s.lineTo(r,top);s.lineTo(-r,top);s.closePath();plate(p,s,.42,M.plaster,c,0,z-.21,0);
}
function arcBand(p,c,y,z,r,w,mat,start=0,end=Math.PI,d=.13){
 const s=new T.Shape();s.absarc(0,0,r+w,start,end);s.absarc(0,0,r,end,start,true);s.closePath();return plate(p,s,d,mat,c,y,z,.008)
}
function stoneWindow(p,c,r,sill,shoulder,z){
 const w=.255;for(let i=0;i<15;i++){
 const a=i*Math.PI/15+.004,b=(i+1)*Math.PI/15-.004,k=i===7;
 arcBand(p,c,shoulder,z+.025,r,w+(k?.08:0),i%3===0?M.cream:M.stone2,a,b,k?.22:.15)}
 arcBand(p,c,shoulder,z-.01,r+w+.015,.052,M.stone);
 arcBand(p,c,shoulder,z+.10,r-.036,.055,M.cream,0,Math.PI,.09);
 for(const side of [-1,1]){
 const H=shoulder-sill,N=Math.ceil(H/.43);for(let j=0;j<N;j++)box(p,c+side*(r+w/2),sill+(j+.5)*H/N,z+.08,w,H/N-.009,.25,j%3?M.stone2:M.cream);
 box(p,c+side*(r+.025),.5*(shoulder+sill),z+.15,.065,H,.22,M.cream);
 box(p,c+side*(r+.11),shoulder-.045,z+.15,.38,.11,.35,M.cream)
 }
 box(p,c,sill-.075,z+.13,2*r+.74,.15,.76,M.cream);box(p,c,sill-.22,z+.07,2*r+.52,.13,.54,M.stone);
 for(const side of [-1,1]){box(p,c+side*r*.81,sill-.38,z+.15,.22,.25,.35,M.stone2)}
}
archWall(room,WX,WR,-.4,YR,6,ZW,-12,12);
box(room,WX,(YS-.4)/2,ZW,WR*2,YS+.4,.42,M.plaster);stoneWindow(room,WX,WR,YS,YR,ZW+.22);
// Recessed painted casement and slender glazing bars, with a clear view beyond.
for(const sign of [-1,1]){box(room,WX+sign*(WR-.055),(YS+YR)/2,ZW-.09,.10,YR-YS,.10,M.green)}
arcBand(room,WX,YR,ZW-.15,WR-.102,.10,M.green,0,Math.PI,.13);
box(room,WX,YR-.04,ZW-.1,WR*2,.052,.065,M.green);
for(const dx of [-.66,.66]){const height=YR+Math.sqrt(WR*WR-dx*dx)-YS;box(room,WX+dx,YS+height/2,ZW-.12,.041,height,.055,M.green)}
for(const a of [.24,.5,.76]){const t=a*Math.PI;rod(room,[WX,YR,ZW-.12],[WX+Math.cos(t)*WR,YR+Math.sin(t)*WR,ZW-.12],.02,M.green)}
box(room,WX,(YS+YR)/2,ZW-.18,WR*2-.2,YR-YS,.015,M.glass);
const UW=.65,UR=2.27,US=6.55,UA=8.28;
archWall(room,UW,UR,6,UA,11.37,ZW,-12,12);
box(room,UW,(US+6)/2,ZW,UR*2,US-6,.42,M.plaster);stoneWindow(room,UW,UR,US,UA,ZW+.22);
box(room,-6.9,5.25,2.5,.35,12,10.2,M.plaster);box(room,7.2,5.25,2.5,.38,12,10.2,M.plaster);
// Timber framing and lime plaster dado moulding.
for(const x of [-6.65,-4.62,5.06,6.9]){
 box(room,x,5.51,ZW+.27,.26,11.1,.25,M.wood);
 for(const y of [.46,5.72,10.9]){box(room,x,y,ZW+.35,.32,.22,.31,M.edge);screw(room,x,y,ZW+.53,.042)}
}
for(const y of [.18,.85,5.77,5.98,10.94]){
 const h=y>5?.19:.09;box(room,0,y,ZW+.23,14.1,h,.22,y>5?M.wood:M.stone);box(room,0,y+h*.63,ZW+.25,14.1,.034,.26,y>5?M.oak:M.cream)
}
for(const x of [-4.65,5.03]){
 const sign=x<0?1:-1;beam(room,[x,4.43,ZW+.35],[x+sign*1.45,5.69,ZW+.35],.155,.19,M.oak)
}
for(let i=0;i<4;i++){const x=-5.1+i*3.75;box(room,x,5.91,-.43,.20,.29,4.0,M.wood);box(room,x,11.2,-.1,.29,.34,5.6,M.edge)}
// Plank floor with staggered end joints, pinned heads and a framed clock porthole.
const floorM=Array.from({length:9},(_,i)=>mat(new T.Color(0x997753).multiplyScalar(.8+i*.04),.61,.025,'wood'));
box(room,0,-.13,2,15,.20,10.5,M.edge);
const portX=1.82,portZ=.12;
for(let j=0;j<47;j++){
 let z=-2.55+j*.475;
 for(let i=-3;i<4;i++){let x=i*2.86+(j%3)*.91;box(room,x,-.008,z,2.852,.048,.466,floorM[(i+6+j*7)%9]);
 if((i+j)%3===0)for(const e of [-1,1]){cyl(room,x+e*1.36,.019,z+.13,.013,.013,.006,M.dark,8)}}
}
const floorClock=clockFace(furniture,portX,.068,portZ,.42);floorClock.g.rotation.x=-Math.PI/2;
ring(floorClock.g,0,0,.13,.48,.043,M.aged);disk(floorClock.g,0,0,.185,.426,.014,M.glass);
// Main carved walnut bench. The pendulum is visible through the open lower frame.
for(const [x,z] of [[-3.2,-.6],[.94,-.6],[-3.2,1.10],[.94,1.10]]){
 lathe(furniture,x,.045,z,[[.21,0],[.22,.055],[.19,.10],[.15,.16],[.149,.28],[.175,.34],[.125,.41],[.13,.78],[.18,.91],[.20,1.04]],M.wood,20);
 cyl(furniture,x,.153,z,.195,.198,.04,M.aged);box(furniture,x,1.04,z,.39,.25,.37,M.mahogany)
}
box(furniture,-1.13,1.105,.23,4.63,.22,2.05,M.edge);
box(furniture,-1.13,1.253,.24,4.78,.125,2.18,M.oak);
box(furniture,-1.13,1.183,.24,4.81,.065,2.21,M.mahogany);
box(furniture,-1.13,1.174,1.351,4.66,.021,.018,M.aged);
for(const x of [-3.13,-2.8,.55,.88])screw(furniture,x,1.09,1.265);
box(furniture,-1.11,.307,-.48,4.16,.16,.23,M.wood);
for(const x of [-3.2,.94])box(furniture,x,.32,.26,.22,.15,1.72,M.wood);
// Curved cast-iron clock frame with through-openings between its columns.
const bed=machinery;
box(bed,-1.08,1.353,-.14,4.29,.10,.95,M.iron);box(bed,-1.08,1.419,-.14,4.11,.056,.85,M.green);
for(const [x,h] of [[-2.84,1.54],[-1.13,2.22],[.72,1.28]]){
 lathe(bed,x,1.43,-.14,[[.225,0],[.22,.09],[.147,.14],[.14,.23],[.10,.3],[.09,h-.29],[.13,h-.23],[.13,h-.18],[.18,h-.13],[.18,h],[0,h]],M.green,32);
 for(const y of [.13,h-.2])cyl(bed,x,1.43+y,-.14,.15,.15,.036,M.aged)
}
beam(bed,[-2.84,2.97,-.14],[-.48,3.62,-.14],.185,.21,M.green);
beam(bed,[-.48,3.62,-.14],[.74,2.50,-.14],.18,.22,M.green);
beam(bed,[-2.8,1.52,-.15],[-.65,3.55,-.15],.10,.14,M.iron);
beam(bed,[.72,1.5,-.15],[-.73,2.0,-.15],.13,.17,M.green);
const gearModels=[],axles=[],halos=[];
for(let i=0;i<4;i++){
 let [x,y,z]=sim.sockets[i],r=S.gears[i].teeth*.043;
 disk(bed,x,y,-.045,r*.31,.32,M.green);ring(bed,x,y,.117,r*.262,.025,M.aged);
 disk(bed,x,y,.185,r*.13,.29,M.steel);
 const item=gear(scene,S.gears[i].teeth,r,i===2?M.aged:M.brass,i%2?5:6);gearModels.push(item);
 const cap=group();cap.position.set(x,y,z+r*.08);disk(cap,0,0,0,r*.139,.085,M.gold);
 disk(cap,0,0,.05,r*.087,.045,M.aged);screw(cap,0,0,.085,r*.062);axles.push(cap);
 if(i%2){
  const halo=group();halo.position.set(x,y,z+.02);
  ring(halo,0,0,0,r*.82,.012,M.glow);ring(halo,0,0,.008,r*.48,.012,M.gold);
  for(let j=0;j<12;j++){let a=j*TAU/12;const piece=box(halo,r*.895*Math.cos(a),r*.895*Math.sin(a),.007,.044,.012,.018,M.glow);piece.rotation.z=a}
  disk(halo,0,0,.075,.1,.08,M.glow);halos[i]=halo
 }
}
// Burgundy felt-lined parts tray, dovetailed lip and brass corner protectors.
const tray=group(furniture);tray.position.set(-1.56,1.34,1.52);tray.rotation.x=.47;
box(tray,0,-.035,0,2.72,.13,1.44,M.mahogany);box(tray,0,.039,0,2.59,.039,1.32,M.red);
for(const z of [-.694,.694]){box(tray,0,.077,z,2.73,.102,.065,M.oak);box(tray,0,.136,z,2.73,.015,.065,M.aged)}
for(const x of [-1.328,1.328])box(tray,x,.077,0,.065,.105,1.39,M.oak);
for(const x of [-1.27,1.27])for(const z of [-.627,.627]){box(tray,x,.14,z,.13,.023,.14,M.aged);cyl(tray,x,.158,z,.020,.020,.015,M.gold)}
for(const x of [-2.75,-.39]){
 beam(furniture,[x,.72,1.24],[x,1.00,2.03],.10,.103,M.edge);
 box(furniture,x,.94,1.275,.15,.36,.075,M.aged);screw(furniture,x,.82,1.324,.035)
}
const seats=[1,3].map((id,i)=>{
 const ringSeat=ring(tray,sim.rests[id][0]+1.56,.066,0,S.gears[id].teeth*.043*1.074,.012,M.aged);
 ringSeat.rotation.x=-Math.PI/2;return ringSeat
});
const pendulum=group();pendulum.position.set(-1.59,2.83,.57);
rod(pendulum,[0,0,0],[0,-2.16,0],.025,M.gold);oval(pendulum,0,-2.14,0,.224,.255,.085,M.brass);
ring(pendulum,0,-2.14,.055,.164,.014,M.gold);disk(pendulum,0,-2.14,.085,.055,.04,M.aged);
const winder=group();winder.position.set(.37,1.713,.56);
disk(furniture,.37,1.713,.22,.26,.35,M.iron);disk(winder,0,0,0,.202,.075,M.aged);ring(winder,0,0,.054,.176,.018,M.gold);
disk(winder,0,0,.115,.07,.16,M.brass);
for(const sg of [-1,1]){const h=ring(winder,sg*.135,.025,.213,.104,.035,M.gold);h.scale.y=.71;h.rotation.z=sg*.22}
const coil=group(bed);coil.position.set(.36,1.71,.38);
const spiral=[];for(let j=0;j<133;j++){let a=j*.19,r=.055+j*.00127;spiral.push(V(Math.cos(a)*r,Math.sin(a)*r,0))}
mesh(new T.TubeGeometry(new T.CatmullRomCurve3(spiral),136,.008,5,false),M.steel,coil);
// Ladder slides in brass guide shoes from the gallery. A short flight follows the side wall.
const ladder=group();ladder.position.set(2.38,0,-1.28);ladder.rotation.x=-.115;
for(const x of [-.285,.285]){box(ladder,x,2.71,0,.083,5.38,.097,M.oak);
 for(const y of [.13,2.54,5.18])box(ladder,x,y,0,.096,.16,.11,M.aged)}
for(let j=0;j<15;j++)rod(ladder,[-.286,.29+j*.349,.009],[.286,.29+j*.349,.009],.037,M.wood,16);
for(const x of [2.08,2.68]){box(room,x,4.36,-1.71,.116,.27,.21,M.aged);screw(room,x,4.36,-1.592)}
const stair=group(room);
for(let j=0;j<10;j++){
 const x=4.45,y=.16+j*.23,z=2.15-j*.35;box(stair,x,y,z,1.27,.12,.42,M.oak);
 box(stair,x,y-.115,z-.1,1.23,.16,.12,M.wood);
 if(j%2===0){lathe(stair,x-.57,y+.06,z,[[.05,0],[.055,.07],[.033,.13],[.027,.62],[.05,.71],[.045,.78]],M.wood,12)}
}
rod(stair,[3.88,.98,2.18],[3.88,3.09,-1.1],.067,M.wood);
beam(stair,[3.90,-.04,2.4],[3.90,2.23,-1.28],.21,.12,M.edge);
// Overhead oil-brass electric fixtures, a ribbed shade and a porcelain bulb.
const bulbs=[];
function lamp(p,x,y,z,index,scale=1){
 const g=group(p);g.position.set(x,y,z);g.scale.setScalar(scale);
 rod(g,[0,.09,0],[0,1.61,0],.014,M.dark);lathe(g,0,0,0,[[0,.26],[.075,.26],[.085,.19],[.105,.17],[.096,.12],[.125,.104],[.125,.065],[.17,.04],[.255,-.052],[.301,-.073],[.308,-.10],[.30,-.115],[.278,-.09],[.24,-.063],[.14,.012],[.089,.025]],M.aged);
 const rim=ring(g,0,-.094,0,.303,.012,M.gold);rim.rotation.x=Math.PI/2;
 const bmat=M.bulb.clone();oval(g,0,-.111,0,.117,.142,.117,bmat);bulbs[index]=bmat;
 return g
}
lamp(room,-3.55,4.45,.25,0,1.17);lamp(loft,-2.9,8.97,-.16,1,.96);
lamp(room,4.18,4.92,-.54,2,.70);
const glowLight=new T.PointLight(0xffbb71,6.0,6,2);glowLight.position.set(-3.55,4.24,.28);scene.add(glowLight);
// A smaller clock bell at the stair landing previews the belfry above.
function bellModel(p,x,y,z,r){
 const g=group(p);g.position.set(x,y,z);
 const profile=[[.02,.02],[.16,.035],[.24,-.028],[.26,-.09],[.33,-.13],[.40,-.21],[.45,-.45],[.53,-.69],[.69,-.88],[.79,-.94],[.81,-1.025],[.78,-1.055],[.70,-1.04],[.64,-.965],[.55,-.87],[.47,-.69],[.36,-.37],[.28,-.21],[.06,-.15]];
 lathe(g,0,0,0,profile.map(([a,b])=>[a*r,b*r]),M.brass);
 for(const [rr,yy] of [[.38,-.205],[.416,-.27],[.739,-.934],[.798,-1.005]]){let band=ring(g,0,yy*r,0,rr*r,.014*r,M.gold);band.rotation.x=Math.PI/2}
 const crown=ring(g,0,.08*r,0,.11*r,.039*r,M.aged);return g
}
const signalBell=bellModel(room,2.39,4.72,-1.82,.42);
beam(room,[1.94,4.86,-1.82],[2.86,4.86,-1.82],.10,.11,M.edge);
rod(room,[2.39,4.80,-1.82],[2.39,4.68,-1.82],.034,M.aged);
oval(room,2.39,4.255,-1.82,.067,.078,.067,M.dark);
// Belfry: an open-sided mezzanine below a massive bell headstock.
box(loft,-.68,5.55,-1.67,8.35,.23,1.27,M.wood);
box(loft,-1.0,5.44,-.99,8.4,.18,.16,M.edge);
for(let j=0;j<27;j++)box(loft,-4.66+j*.31,5.686,-1.65,.305,.047,1.25,floorM[j%9]);
for(const x of [-2.54,1.52]){
 box(loft,x,7.5,-.85,.23,3.68,.26,M.wood);box(loft,x,5.84,-.85,.36,.28,.39,M.edge);
 box(loft,x,8.76,-.85,.256,.13,.28,M.aged);screw(loft,x,8.76,-.697,.052)
}
beam(loft,[-2.77,9.23,-.85],[1.77,9.23,-.85],.31,.37,M.wood);
for(const [x,dx] of [[-2.54,.84],[1.52,-.84]])beam(loft,[x,8.28,-.85],[x+dx,9.08,-.85],.155,.18,M.oak);
const bell=bellModel(scene,-.58,8.61,-.43,1.23),clap=group();
box(loft,-.58,8.84,-.43,2.28,.23,.34,M.mahogany);
for(const x of [-1.5,.34]){box(loft,x,8.84,-.43,.084,.29,.41,M.iron);rod(loft,[x,8.94,-.43],[x,9.2,-.76],.048,M.iron)}
clap.position.copy(bell.position);rod(clap,[0,-.18,0],[0,-1.18,0],.035,M.dark);oval(clap,0,-1.21,0,.118,.142,.118,M.aged);
const upperGear=gear(scene,36,1.21,M.aged,8);upperGear.position.set(-2.48,7.26,-.46);
rod(loft,[-2.48,7.26,-.78],[-2.48,7.26,-.28],.101,M.steel);
const beltPos=[[-2.65,7.25,-.55],[-2.72,3.03,-.21]];
rod(loft,...beltPos,.023,M.edge);rod(loft,[-2.29,7.25,-.56],[-2.12,3.03,-.21],.023,M.edge);
const rope=group();rope.position.set(.87,8.81,-.27);
const ropeLine=rod(rope,[0,0,0],[0,-1.72,0],.028,M.cord);
const ropeGrip=group(rope);ropeGrip.position.y=-1.72;
lathe(ropeGrip,0,-.24,0,[[.018,0],[.05,.025],[.063,.07],[.059,.19],[.034,.25]],M.red,20);
const ropeLoop=ring(ropeGrip,0,-.35,0,.088,.022,M.cord);ropeLoop.scale.y=1.35;
const panes=[];
for(let i=0;i<2;i++){
 const sign=i?1:-1,g=group();g.position.set(UW+sign*UR,US,ZW+.08);panes.push(g);
 const inner=-sign, s=new T.Shape();s.moveTo(0,0);s.lineTo(inner*UR,0);s.lineTo(inner*UR,UA+UR-US);
 for(let j=0;j<=24;j++){const theta=(j/24)*Math.PI/2;s.lineTo(inner*UR*(1-Math.sin(theta)),UA-US+UR*Math.cos(theta))}s.closePath();
 plate(g,s,.035,M.glass,0,0,-.03,0);
 for(const x of [inner*.039,inner*(UR-.041)])box(g,x,(UA-US)/2,-.01,.07,UA-US,.095,M.oak);
 box(g,inner*(UR-.041),(UA-US+UR)/2,-.005,.065,UA-US+UR,.095,M.oak);
 for(const y of [.035,UA-US,.87])box(g,inner*UR*.5,y,0,UR,.065,.09,M.oak);
 let old=[0,UA-US,0];for(let j=1;j<=16;j++){const a=j*Math.PI/32,b=[inner*UR*(1-Math.cos(a)),UA-US+UR*Math.sin(a),0];rod(g,old,b,.045,M.oak);old=b}
 const handle=ring(g,inner*(UR-.18),.83,.09,.10,.019,M.gold);handle.scale.x=.57
}
for(let i=0;i<11;i++){const x=3.35,y=5.76+i*.244,z=.78-i*.32;box(loft,x,y,z,1.13,.095,.39,M.oak);if(i%2===0)rod(loft,[x+.5,y,z],[x+.5,y+.71,z],.036,M.wood)}
rod(loft,[3.85,6.47,.78],[3.85,8.91,-2.42],.049,M.wood);
// Auxiliary flywheel and grooved barrel sit on their own rear arbors.
const flywheel=gear(scene,16,.55,M.aged,5);flywheel.position.set(-2.83,2.05,-.005);
disk(bed,-2.83,2.05,.061,.092,.107,M.gold);
for(let i=0;i<7;i++)disk(bed,-1.99,3.02,-.14+i*.044,.50,.032,i%2?M.aged:M.iron);
for(const [x,y] of [[-2.84,1.52],[.72,1.52],[-2.84,2.97],[-1.13,3.55],[.72,2.62]]){disk(bed,x,y,-.002,.075,.09,M.aged);screw(bed,x,y,.058,.045)}
const roofSet=group(),roofDial=group();
roofDial.position.set(-1.66,12.95,-1.30);roofDial.rotation.y=.12;
for(const [r,w,material] of [[1.83,.082,M.aged],[1.70,.028,M.gold],[1.45,.032,M.aged],[.245,.052,M.aged]])ring(roofDial,0,0,0,r,w,material);
for(let i=0;i<60;i++){
 const a=i*TAU/60,major=i%5===0,rr=major?1.55:1.67;
 const mark=box(roofDial,rr*Math.sin(a),rr*Math.cos(a),0,major?.052:.023,major?.32:.075,.057,major?M.gold:M.aged);mark.rotation.z=-a
}
for(let j=0;j<6;j++){const a=(j+.5)*Math.PI/3;rod(roofDial,[.21*Math.sin(a),.21*Math.cos(a),-.055],[1.8*Math.sin(a),1.8*Math.cos(a),-.055],.025,M.iron)}
const sunsetHand=group(roofDial);sunsetHand.position.z=.095;
plate(sunsetHand,poly([[0,1.43],[-.084,1.09],[-.049,.98],[-.033,.17],[-.099,-.28],[0,-.48],[.099,-.28],[.033,.17],[.049,.98],[.084,1.09]]),.04,M.iron);
ring(sunsetHand,0,.96,.05,.103,.03,M.gold);disk(roofDial,0,0,.17,.15,.09,M.gold);
for(const x of [-3.19,-.19]){beam(roofSet,[x,11.32,-1.3],[x,12.04,-1.3],.12,.15,M.iron);box(roofSet,x,11.39,-1.3,.32,.12,.33,M.aged)}
for(let i=0;i<31;i++)box(roofSet,-5.3+i*.355,11.27,-.03,.35,.15,3.44,floorM[i%9]);
for(let j=0;j<20;j++){
 const x=-5.2+j*.55;box(roofSet,x,11.65,-1.72,.077,.7,.078,M.green);
 oval(roofSet,x,12.03,-1.72,.059,.08,.059,M.aged)
}
rod(roofSet,[-5.5,11.95,-1.72],[5.47,11.95,-1.72],.047,M.aged);
const birds=S.birds.map(()=>{
 const b=group(),body=oval(b,0,0,0,.098,.11,.205,M.feather);body.rotation.x=-.16;
 oval(b,0,.107,-.11,.076,.083,.084,M.feather);
 const beak=cyl(b,0,.107,-.204,0,.034,.072,M.aged,10);beak.rotation.x=-Math.PI/2;
 for(const sg of [-1,1])oval(b,sg*.062,.125,-.148,.015,.016,.013,M.dark);
 const tail=oval(b,0,.012,.213,.080,.034,.161,M.feather);tail.rotation.x=-.13;
 const wings=[-1,1].map(sg=>{let q=group(b);q.position.set(sg*.065,.06,.01);
 const shape=poly([[0,-.1],[sg*.18,-.055],[sg*.30,.058],[sg*.40,.19],[sg*.21,.16],[sg*.12,.136],[0,.118]]);
 const w=plate(q,shape,.012,M.feather,0,0,0,.008);w.rotation.x=Math.PI/2;return q});
 return {b,wings}
});
// Contiguous mountain ridges have erosion channels instead of cone silhouettes.
function ridge(zfront,back,length,base,amp,material,seed){
 const n=83,m=8,pts=[],colors=[],idx=[];
 for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){
  const x=(i/n-.5)*length,fr=j/m,profile=Math.sin(fr*Math.PI*.87);
  const high=(noise(i*.072+seed,seed)*.69+noise(i*.23,seed+3)*.30+noise(i*.68,seed)*.075)*amp;
  const yy=base+profile*(high+1.5)+noise(i*.19+fr*.65,fr*3+seed)*1.6;
  pts.push(x,yy,mix(zfront,back,fr));const c=new T.Color(material).multiplyScalar(.84+.23*noise(i*.28+fr,seed+.7)+.11*fr);colors.push(c.r,c.g,c.b);
  if(i<n&&j<m){const a=j*(n+1)+i;idx.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1)}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
 const meshHill=mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:.01,roughnessMap:tex.stone}),hills);meshHill.castShadow=false
}
ridge(-63,-106,235,-4.5,29,0x8e9ca6,13);ridge(-47,-82,185,-4.9,21,0x9699a0,4);ridge(-37,-62,144,-5,13,0x889485,32);
ridge(-29,-48,127,-5,7.7,0x9b9c80,24);
const skySun=mat(0xffe9ce,.98,0,'stone',{emissive:0xffd3a0,emissiveIntensity:.9});
oval(hills,16,11.9,-90,2.26,2.26,2.26,skySun).castShadow=false;
const buildings=[0xe6cbb0,0xd3b399,0xd7c6a7,0xcac4a9,0xd6af99].map(c=>mat(c,.92,0,'stone'));
const roofs=[0x935a49,0x9f6d59,0x696f73,0x856858,0x967361].map(c=>mat(c,.79,.06,'stone'));
const shutterMat=mat(0x657a70,.77,.03,'wood'),windowMat=mat(0x56656a,.27,.34),ground=mat(0xaba182,.96,0,'stone');
box(village,0,-3.37,-25,100,.4,70,ground);
const riverCenter=z=>4.5+2.9*Math.sin(z*.13)+.07*(z+10);
const waterGeo=new T.PlaneGeometry(1,1,4,31);waterGeo.rotateX(-Math.PI/2);
const waterMat=mat(0x8faeab,.185,.54);const water=mesh(waterGeo,waterMat);water.castShadow=false;
function waterCoords(){const pos=waterGeo.attributes.position;for(let j=0;j<32;j++)for(let i=0;i<5;i++){
 let z=3-j*1.39;pos.setXYZ(j*5+i,riverCenter(z)+(i-2)*1.03,-3.117+(S.water?.[j]?.height||0)*(1-Math.abs(i-2)*.22),z)
}pos.needsUpdate=true;waterGeo.computeVertexNormals()}
waterCoords();waterGeo.computeBoundingSphere();
const houseWindows=[];
function house(i,x,z,w,d,h){
 const g=group(village);g.position.set(x,-3.16,z);g.rotation.y=(random()-.5)*.47;
 const facade=buildings[i%5],roofmat=roofs[(i*7+3)%5],roofH=w*(.43+random()*.23);
 box(g,0,h/2,0,w,h,d,facade);box(g,0,.12,0,w+.065,.24,d+.065,M.stone);
 plate(g,poly([[-w/2,h],[0,h+roofH],[w/2,h]]),d,facade,0,0,-d/2,0);
 for(const sign of [-1,1]){
 const hyp=Math.hypot(w/2+.12,roofH+.08);const r=box(g,sign*(w/4+.055),h+roofH/2,0,hyp,.084,d+.24,roofmat);
 r.rotation.z=-sign*Math.atan2(roofH+.08,w/2+.12);
 for(let k=1;k<6;k++){let u=k/6;box(g,sign*(w*.5+.115)*u,h+roofH*(1-u)+.045,0,.035,.042,d+.245,roofmat)}
 }
 box(g,0,h+roofH+.035,0,.10,.13,d+.26,roofmat);
 box(g,-w*.26,h+roofH*.81,-d*.22,.23,.73,.25,M.stone2);box(g,-w*.26,h+roofH*.81+.36,-d*.22,.29,.11,.3,roofmat);
 const lit=windowMat.clone();houseWindows[i]=lit;
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  const xx=(col-.5)*w*.48,yy=h*(.32+row*.43),ww=w*.17,hh=h*.23;
  box(g,xx,yy,d/2+.019,ww+.072,hh+.07,.055,M.cream);box(g,xx,yy,d/2+.055,ww,hh,.03,lit);
  box(g,xx,yy-.02,d/2+.075,.021,hh,.017,M.oak);box(g,xx,yy+.012,d/2+.078,ww,.021,.017,M.oak);
  for(const sg of [-1,1])box(g,xx+sg*ww*.72,yy,d/2+.047,ww*.30,hh,.049,shutterMat)
 }
 box(g,w*.5+.014,h*.66,0,.04,h*.27,w*.20,lit)
}
for(let j=0;j<6;j++)for(let i=0;i<7;i++){
 let z=-6.2-j*3.9-random()*1.0,x=(i-3)*4.12+(j%2)*1.7+(random()-.5)*.65;
 const mid=riverCenter(z);if(x>mid-3&&x<mid+3)x+=(x<mid?-1:1)*(3.3-Math.abs(x-mid));
 house(j*7+i,x,z,1.65+random()*.83,2+random(),1.87+random()*1.53)
}
// The town's campanile punctuates the roofline through the lower window.
const steeple=group(village);steeple.position.set(4.8,-3.08,-17);
box(steeple,0,2.8,0,1.17,5.6,1.18,M.stone2);
for(let i=0;i<3;i++)box(steeple,0,3.78+i*.86,0,1.35,.095,1.35,M.cream);
for(const sg of [-1,1]){box(steeple,sg*.27,5.12,.6,.22,.49,.05,M.dark);oval(steeple,sg*.27,5.36,.6,.11,.13,.026,M.dark)}
const spire=cyl(steeple,0,6.42,0,.052,1.03,1.9,roofs[2],4);spire.rotation.y=Math.PI/4;
rod(steeple,[0,7.3,0],[0,7.77,0],.022,M.aged);oval(steeple,0,7.54,0,.074,.074,.074,M.gold);
const treeM=[0x75846c,0x687b64,0x849172,0x9a9c76].map(c=>mat(c,.9,0,'stone'));
const treeGeo=new T.IcosahedronGeometry(1,1);
for(let i=0;i<115;i++){
 const z=-5-random()*37,x=(random()-.5)*43;if(Math.abs(x-riverCenter(z))<2.1)continue;
 const h=1.05+random()*1.77;
 cyl(village,x,-3.1+h*.33,z,.046,.086,h*.67,M.edge,7);
 for(let j=0;j<3;j++){const t=mesh(treeGeo,treeM[(i+j)%4],village,x+(j-1)*.23,-3.0+h*(.66+j*.06),z+(random()-.5)*.43);t.scale.set(.37+h*.11,h*.39,.35+h*.12)}
}
// Footbridge with stone piers spans the river below the balcony.
const bridgeX=riverCenter(-14);
box(village,bridgeX,-2.61,-14,5.9,.21,1.07,M.stone2);
for(let i=0;i<9;i++)for(const sg of [-1,1])box(village,bridgeX-2.69+i*.67,-2.28,-14+sg*.49,.091,.48,.11,M.stone);
for(const sg of [-1,1])box(village,bridgeX,-2.02,-14+sg*.49,5.8,.10,.16,M.stone2);
// Instance static pieces by material and source geometry. Dynamic mechanisms
// retain independent transforms, including the clock hands and hinged sashes.
function batch(parent,exclude=[]){
 parent.updateWorldMatrix(true,true);const sets=new Map(),inverse=parent.matrixWorld.clone().invert();
 parent.traverse(o=>{if(!o.isMesh)return;for(let p=o;p!==parent;p=p.parent)if(exclude.includes(p))return;
 const key=o.material.uuid+o.geometry.uuid;let list=sets.get(key);if(!list)sets.set(key,list=[]);list.push(o)});
 for(const list of sets.values()){if(list.length<3)continue;
 const o=list[0],im=new T.InstancedMesh(o.geometry,o.material,list.length);im.castShadow=o.castShadow;im.receiveShadow=true;
 list.forEach((a,i)=>{im.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inverse,a.matrixWorld));a.removeFromParent()});parent.add(im);im.computeBoundingSphere()
 }
}
batch(room,[signalBell]);batch(furniture,[...floorClock.hands,...seats]);batch(village);batch(machinery);batch(loft);batch(roofSet);batch(ladder);panes.forEach(p=>batch(p));gearModels.forEach(p=>batch(p));
const dustMat=mat(0xffe4b0,.75,0,'metal',{transparent:true,opacity:.39,emissive:0xffd39a,emissiveIntensity:.25,depthWrite:false});
const dustMesh=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),dustMat,S.dust.length);dustMesh.frustumCulled=false;scene.add(dustMesh);
const hatchLeaves=[-1,1].map(sign=>{
 const p=group();p.position.set(portX,.292,portZ);
 const sh=new T.Shape();sh.absarc(0,0,.412,sign>0?-Math.PI/2:Math.PI/2,sign>0?Math.PI/2:Math.PI*1.5,false);sh.closePath();
 const l=plate(p,sh,.018,M.wood);l.rotation.x=-Math.PI/2;
 const latch=box(p,sign*.20,.029,.013,.125,.036,.055,M.aged);return p
});
// Continuous atmospheric sky radiance with subtle strata along the horizon.
{
 const w=512,h=256,pix=new Uint8Array(w*h*4);
 const lo=new T.Color(0xf6d6b5),mid=new T.Color(0xb7c9cf),hi=new T.Color(0x839eb3),c=new T.Color();
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  const v=j/h-.5,u=i/w,cloud=noise(u*24,v*98)*noise(u*12,v*43)*Math.exp(-Math.pow((v-.074)/.09,2));
  c.copy(lo).lerp(mid,sat(v*7.6)).lerp(hi,sat((v-.11)*2.9)).lerp(lo,cloud*.65);
  let k=(j*w+i)*4;c.convertLinearToSRGB();pix[k]=255*c.r;pix[k+1]=255*c.g;pix[k+2]=255*c.b;pix[k+3]=255
 }
 const sky=new T.DataTexture(pix,w,h);sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;sky.minFilter=sky.magFilter=T.LinearFilter;sky.needsUpdate=true;scene.background=sky
}
