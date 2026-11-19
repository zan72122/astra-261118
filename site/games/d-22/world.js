'use strict';
function makeWorld(scene){
 const {T,PI,tau,group,mesh,box,cyl,tor,ball,rod,tube,screw,ticks,batch,mat,m,rnd}=Art;
 const {roadX,roadY}=RobotWorkshop;
 const world=group(scene),garage=group(world),fixed=group(garage),table=group(garage),outside=group(world);
 const set=mat(0x394c5a,.43,.6),panel=mat(0x445968,.52,.43),asphalt=mat(0x59636c,.13,.83),stone=mat(0x899293,.15,.7);
 const lino=mat(0x566f7b,.23,.63),rail=mat(0xb0bab7,.63,.4);
 // Screen-printed grid, worn enamel and machining marks belong to the physical surfaces.
 function gridTexture(){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');
  g.fillStyle='#73868b';g.fillRect(0,0,1024,512);
  for(let i=0;i<24000;i++){const k=rnd();g.fillStyle=k>.5?'rgba(234,238,224,.06)':'rgba(28,46,58,.07)';g.fillRect(rnd()*1024,rnd()*512,1+rnd()*2,1);}
  for(let i=0;i<=1024;i+=22){g.strokeStyle=i%110===0?'rgba(207,217,208,.27)':'rgba(217,228,216,.13)';g.lineWidth=i%110===0?1.3:1;
    g.beginPath();g.moveTo(i+.5,0);g.lineTo(i+.5,512);g.stroke();
    if(i<512){g.beginPath();g.moveTo(0,i+.5);g.lineTo(1024,i+.5);g.stroke();}}
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
 }
 box(table,0,-.087,.012,2.22,.16,1.47,m.edge,.034);
 box(table,0,-.025,.01,2.23,.047,1.47,m.bench,.018);
 box(table,0,-.125,.724,2.17,.021,.017,m.nickel,.006);
 box(table,0,-.205,.55,2.09,.14,.32,m.dark,.013);
 for(let i=0;i<4;i++){
  const x=-.78+i*.52;box(table,x,-.195,.721,.496,.114,.023,m.edge,.008);
  box(table,x,-.168,.74,.151,.013,.021,m.nickel,.005);
 }
 for(const x of [-1.045,1.045])for(const z of [-.64,.656])screw(table,x,-.001,z,.009,'y');
 box(table,0,-.0005,.035,1.94,.010,1.21,lino,.004);
 const matTop=mesh(table,new T.PlaneGeometry(1.932,1.20),mat(0xffffff,.19,.57,{map:gridTexture()}),0,.0047,.035);matTop.rotation.x=-PI/2;
 for(const x of [-.89,.89])for(const z of [-.493,.566]){
  box(table,x-Math.sign(x)*.032,.006,z,.064,.001,.005,m.ink);
  box(table,x,.006,z-Math.sign(z)*.032,.005,.001,.064,m.ink);
 }
 for(let i=0;i<70;i++)box(table,-.986+i*.028,.001,.67,.002,.001,i%5===0?.025:.012,m.iron);
 for(const x of [-.91,.91]){box(table,x,-.061,.748,.20,.038,.004,m.iron,.002);
  for(let i=0;i<5;i++){const a=box(table,x-.072+i*.034,-.061,.751,.013,.026,.002,m.orange);a.rotation.z=-.52;}}
 // Cast turntable with inset brass track, individual index marks and an illuminated release key.
 const plinth=group(garage);
 cyl(plinth,0,.012,0,.235,.251,.022,m.dark,80);cyl(plinth,0,.026,0,.235,.237,.014,m.nickel,80);
 cyl(plinth,0,.035,0,.223,.229,.013,m.edge,80);tor(plinth,0,.041,0,.194,.004,m.chrome,'y');
 cyl(plinth,0,.044,0,.152,.171,.009,m.iron,64);ticks(plinth,0,.045,0,.208,52,m.ink);
 for(let i=0;i<3;i++){const g=group(plinth);g.rotation.y=i*tau/3;tor(g,0,.045,0,.186,.0035,m.amber,'y',1.55);}
 const stand=group(garage);
 cyl(stand,0,.082,0,.066,.1,.072,m.dark);for(let i=0;i<4;i++)cyl(stand,0,.064+i*.013,0,.079-i*.003,.084-i*.003,.005,m.nickel);
 cyl(stand,0,.125,0,.084,.063,.040,m.iron);
 const key=group(garage,0,.008,.255);box(key,0,0,0,.116,.014,.046,m.dark,.006);
 for(const a of [-1,1]){const q=box(key,a*.013,.008,0,.033,.003,.008,m.amber);q.rotation.y=a*.56;}
 batch(table);batch(plinth);batch(stand);batch(key);
 const trays={};
 function tray(name,w,d){
  const g=group(garage);box(g,0,.012,0,w,.014,d,m.dark,.006);
  box(g,0,.020,0,w-.008,.008,d-.008,m.edge,.003);
  box(g,0,.024,0,w-.020,.002,d-.019,mat(0x52636c,.14,.69),.0008);
  for(const a of [-1,1]){
   box(g,a*(w*.5-.007),.028,0,.009,.009,d-.021,m.nickel,.003);
   for(const b of [-1,1])box(g,a*(w*.5-.025),.028,b*(d*.5-.009),.044,.009,.01,m.nickel,.003);
  }
  box(g,0,.027,d*.5-.009,.039,.003,.008,m.copper,.001);
  trays[name]=batch(g);return g;
 }
 tray('head',.273,.254);tray('arms',.291,.324);for(const id of ['short','long','wheel'])tray(id,.247,.206);
 function layout(n){
  const H=id=>RobotWorkshop.home(id,n);
  trays.head.position.set(H('head').x,0,H('head').z+.015);
  trays.arms.position.set(n?.229:.469,0,n?.329:.038);
  trays.arms.scale.x=n?.81:1;
  for(const id of ['short','long','wheel']){const p=H(id);trays[id].position.set(p.x,0,p.z+.044);trays[id].scale.x=n?.91:1;}
  // The narrow worktop extends towards the child to leave all three drive units within reach.
  table.scale.z=n?1.50:1;
  lamp.position.x=n?-.466:-.792;lamp.position.z=n?-.39:-.26;lampGlow.position.x=lamp.position.x+.16;
  board.position.x=n?.59:1.04;board.scale.setScalar(n?.78:1);
  fixed.scale.x=shutter.scale.x=n?.66:1;
 }
 // The frame, guides and slats of the roll-up door are individually modelled.
 const back=-1.48;
 box(fixed,0,-.50,-.80,3.6,.14,2.15,set);
 for(const a of [-1,1]){
  box(fixed,a*1.54,.65,back,.92,2.46,.18,set,.009);
  box(fixed,a*1.078,.53,back+.11,.092,1.99,.14,m.iron,.012);
  box(fixed,a*1.03,.53,back+.12,.019,2.0,.10,m.nickel,.003);
  box(fixed,a*1.75,.67,-.12,.16,2.4,3.1,set);
  for(let i=0;i<5;i++)box(fixed,a*1.25,.08+i*.32,back+.092,.53,.007,.006,m.dark);
 }
 box(fixed,0,1.63,back,3.5,.68,.25,set);
 for(let i=0;i<3;i++)box(fixed,0,1.52,-.93+i*.83,3.52,.09,.086,m.iron);
 const shutter=group(garage,0,0,back+.06);
 for(let i=0;i<17;i++){const y=i*.054;box(shutter,0,y,0,2.06,.052,.041,i%3?panel:set,.006);
  box(shutter,0,y-.021,.022,2.05,.004,.005,m.iron);}
 box(shutter,0,-.035,0,2.075,.053,.064,m.dark,.008);
 for(const x of [-.88,.88]){box(shutter,x,-.035,.034,.182,.019,.003,m.orange);}
 batch(shutter);
 // Articulated counterbalanced lamp: two parallel link arms, hinge caps, spun conical shade.
 const lamp=group(garage,-.792,0,-.26);
 cyl(lamp,0,.016,0,.085,.095,.024,m.dark);cyl(lamp,0,.036,0,.06,.077,.017,m.nickel);
 for(const z of [-.018,.018]){rod(lamp,[0,.042,z],[-.107,.348,z],.012,m.iron);rod(lamp,[-.107,.348,z],[.119,.577,z],.011,m.edge);}
 for(const [x,y] of [[0,.065],[-.107,.348],[.119,.577]]){cyl(lamp,x,y,0,.029,.029,.075,m.dark,32,'z');cyl(lamp,x,y,.041,.016,.016,.007,m.copper,24,'z');}
 tube(lamp,[[-.016,.039,-.023],[-.151,.34,-.028],[.05,.549,-.028],[.148,.563,0]],.006,m.black);
 const shade=group(lamp,.15,.535,0);shade.rotation.z=.36;
 cyl(shade,0,.055,0,.035,.059,.053,m.iron);cyl(shade,0,.003,0,.056,.123,.071,m.edge,48);
 cyl(shade,0,-.036,0,.123,.121,.010,m.copper,48);cyl(shade,0,-.042,0,.111,.114,.005,m.warm,48);
 const lampGlow=new T.PointLight(0xffc08a,1.3,2.2,2);lampGlow.position.set(-.61,.45,-.20);garage.add(lampGlow);
 // Tool wall: turned spanners, insulated drivers, a socket rail and a wound hose.
 const board=group(garage,1.04,.48,-.66);board.rotation.y=-.24;
 box(board,0,0,0,.60,.60,.035,m.dark,.011);
 box(board,0,0,.022,.572,.567,.013,panel,.004);
 const holeGeo=new T.CircleGeometry(.0043,8),holes=new T.InstancedMesh(holeGeo,m.dark,16*14);
 let k=0;for(let j=0;j<14;j++)for(let i=0;i<16;i++)holes.setMatrixAt(k++,new T.Matrix4().makeTranslation(-.256+i*.034,.227-j*.034,.029));board.add(holes);
 for(let i=0;i<3;i++){
  const g=group(board,-.193+i*.081,.087-i*.018,.043);g.rotation.z=(i-1)*.073;
  tor(g,0,-.117,0,.014,.005,m.nickel);box(g,0,-.027,0,.014,.166,.010,m.nickel,.004);
  const jaw=tor(g,0,.060,0,.023,.009,m.nickel,'z',4.52);jaw.rotation.z=2.45;
  cyl(g,0,.022,.001,.007,.007,.027,m.copper,12,'z');
 }
 for(let i=0;i<3;i++){const x=.065+i*.059;box(board,x,-.034,.052,.031,.089,.028,i%2?m.orange:m.blue,.013);rod(board,[x,.008,.048],[x,.122,.048],.005,m.chrome);}
 box(board,.108,-.089,.051,.233,.018,.073,m.iron,.005);
 box(board,0,.306,.031,.60,.042,.07,m.iron,.009);const strip=m.warm.clone();box(board,0,.285,.065,.51,.011,.018,strip,.004);
 for(let i=0;i<3;i++)tor(fixed,-1.21,.40,back+.11+i*.014,.102+i*.008,.009,m.rubber);
 // Low parts cabinets and small industrial canisters at the edge of the bench.
 for(let q=0;q<2;q++){const x=-1.10-q*.13;box(fixed,x,.084,-.60,.131,.16,.14,m.edge,.012);box(fixed,x,.169,-.60,.136,.012,.144,m.nickel,.004);}
 for(let i=0;i<3;i++)cyl(fixed,.76+i*.056,.045,-.44,.021,.024,.077,i===1?m.copper:m.iron);
 batch(lamp);batch(board);batch(fixed);
 // A continuous, gently graded road leads from the bench into a small evening town.
 const road=group(outside),N=130,width=.62,positions=[],uv=[],inds=[];
 for(let i=0;i<=N;i++){const d=-.72+i*.17;for(const a of [-1,1]){positions.push(roadX(d)+a*width,roadY(d)-.004,-d);uv.push((a+1)/2,i*.12);}
  if(i<N){const n=i*2;inds.push(n,n+1,n+2,n+1,n+3,n+2);}}
 const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(positions,3));rg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));rg.setIndex(inds);rg.computeVertexNormals();mesh(road,rg,asphalt);
 for(let i=0;i<93;i++){
  const d=.73+i*.201,x=roadX(d),y=roadY(d),pitch=Math.atan((roadY(d+.01)-roadY(d-.01))/.02);
  for(const a of [-1,1]){
   const b=box(road,x+a*.638,y+.014,-d,.072,.037,.196,stone);b.rotation.x=pitch;
   if(i%3===0)box(road,x+a*.519,y-.001,-d,.013,.004,.203,m.cream).rotation.x=pitch;
  }
  if(i%4===0&&d>1.6&&d<5.7)box(road,x,y-.001,-d,.014,.003,.18,m.cream).rotation.x=pitch;
 }
 const ground=mat(0x687780,.1,.85);box(road,0,-.40,-10,40,.32,42,ground);
 const gravelMat=[mat(0x909799,.06,.84),mat(0x6f7779,.1,.77),mat(0xa29c8b,.1,.75)];
 for(let i=0;i<68;i++){const d=4.32+rnd()*.98;const p=mesh(road,new T.DodecahedronGeometry(.010+rnd()*.014),gravelMat[i%3],roadX(d)+(rnd()-.5)*1.10,roadY(d),-d);p.scale.y=.36;}
 batch(road);
 const winLit=mat(0xffce98,.17,.25,{emissive:0xe8ac70,emissiveIntensity:.50}),winCool=mat(0x5c7381,.63,.20),winDim=mat(0xc1ad94,.45,.3);
 const facades=[mat(0x969ea0,.14,.72),mat(0x858f98,.18,.68),mat(0xb4aaa0,.14,.73),mat(0x6f8390,.17,.66)], roofMat=mat(0x576777,.57,.58);
 function house(parent,x,y,z,w,h,d,style){
  const g=group(parent,x,y,z),fa=facades[style%4],sill=mat(0x97a3a7,.38,.53);
  box(g,0,h*.5,0,w,h,d,fa);box(g,0,.035,0,w+.03,.065,d+.025,stone);
  for(const a of [-1,1])box(g,a*(w*.5-.025),h*.5,d*.5+.008,.033,h-.025,.025,sill);
  const rh=.14+w*.11;
  if(style%3!==0){
   const roof=new T.Shape();roof.moveTo(-w*.54,0);roof.lineTo(0,rh);roof.lineTo(w*.54,0);roof.closePath();
   mesh(g,new T.ExtrudeGeometry(roof,{depth:d+.07,bevelEnabled:false}),roofMat,0,h,-d*.5-.035);
   const wall=new T.Shape();wall.moveTo(-w*.47,0);wall.lineTo(0,rh*.87);wall.lineTo(w*.47,0);wall.closePath();
   mesh(g,new T.ExtrudeGeometry(wall,{depth:.006,bevelEnabled:false}),fa,0,h,d*.5+.037);
   cyl(g,0,h+rh*.36,d*.5+.049,.045,.045,.011,m.dark,24,'z');
  }else{box(g,0,h-.01,0,w+.06,.07,d+.06,roofMat);}
  box(g,w*.26,h+.12,-d*.16,.077,.24,.08,fa);box(g,w*.26,h+.25,-d*.16,.10,.025,.105,roofMat);
  let rows=h>.72?3:2,cols=w>.75?3:2;for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const x=(i-(cols-1)/2)*w/(cols+.35),y=.15+j*(h-.20)/rows;
   const ww=w/(cols*2.15),hh=Math.min(.152,(h-.13)/rows*.61),z=d*.5;
   box(g,x,y,z+.006,ww+.020,hh+.020,.017,m.iron);
   box(g,x,y,z+.018,ww,hh,.011,[winLit,winCool,winDim][Math.floor(rnd()*3)]);box(g,x,y,z+.026,.008,hh,.008,sill);
   box(g,x,y-hh*.51,z+.023,ww+.029,.012,.043,sill);
  }
  for(const a of [-1,1])for(let j=0;j<2;j++)for(let i=0;i<2;i++){
   box(g,a*(w*.5+.008),h*(.26+j*.42),d*(i-.5)*.46,.012,.111,.097,rnd()<.4?winLit:winCool);}
  if(style%3===2){const aw=box(g,0,.29,d*.5+.073,w*.86,.019,.152,m.blue);aw.rotation.x=.15;
   for(let i=0;i<6;i++)box(g,(i-2.5)*w*.14,.268,d*.5+.143,w*.14,.026,.012,i%2?m.cream:m.blue);}
 }
 for(let section=0;section<4;section++){
  const block=group(outside);
  for(let i=0;i<4;i++){let d=2.35+section*3.96+i*.99;
   for(const a of [-1,1]){if((d>5&&d<7.1&&a===1)||d>12)continue;
    const x=roadX(d)+a*(1.41+rnd()*.36);house(block,x,roadY(d)-.055,-d,.60+rnd()*.36,.55+rnd()*.60,.58+rnd()*.27,i+section+(a>0?2:0));}}
  batch(block);
 }
 // Distant landscape is faceted relief with a separate ridge at each depth.
 const ridgeMat=[mat(0x7c90a2,0,.97),mat(0x708699,0,.95),mat(0x8f9dab,0,.97)];
 for(let i=0;i<17;i++){const rock=mesh(outside,new T.IcosahedronGeometry(1,1),ridgeMat[i%3],(i%9-4)*4.5,-1.5,-20-(i%3)*4);rock.scale.set(4+rnd()*4,2.2+rnd()*2.1,2.9);rock.rotation.y=rnd()*3;}
 const city=group(outside);
 for(let i=0;i<23;i++){let x=(i-11)*.79;let h=.7+rnd()*1.0;box(city,x,h*.5-.22,-17-rnd()*2,.63,h,.6,facades[i%4]);}
 function streetLamp(g,x,y,z,h=.68){cyl(g,x,y+.035,z,.034,.051,.072,m.iron);cyl(g,x,y+h*.5,z,.012,.019,h,m.iron);
  cyl(g,x,y+h+.042,z,.043,.033,.085,winLit,8);cyl(g,x,y+h+.092,z,.015,.059,.034,m.dark,8);
  for(let i=0;i<4;i++){let a=i*PI/2+.78;rod(g,[x+Math.cos(a)*.030,y+h,z+Math.sin(a)*.030],[x+Math.cos(a)*.042,y+h+.083,z+Math.sin(a)*.042],.004,m.iron);}
 }
 for(let i=0;i<9;i++){const d=1.91+i*1.39;streetLamp(city,roadX(d)+(i%2?-.78:.78),roadY(d),-d);}
 // Cable with warm glass bulbs across the little square.
 for(let j=0;j<2;j++){const d=5.55+j*1.23,y=roadY(d)+.97;const pts=[];for(let i=0;i<11;i++){const x=(i/10-.5)*2.75,h=y-.18*(1-(x/1.375)**2);pts.push([x,h,-d]);if(i%2)ball(city,x,h-.029,-d,.021,.026,.021,winLit);}
  tube(city,pts,.004,m.dark);}
 batch(city);
 const flags=[];
 function flag(d,x,height){
  const base=group(outside,x,roadY(d),-d);cyl(base,0,.021,0,.073,.093,.04,m.iron);cyl(base,0,height*.5,0,.012,.019,height,m.nickel);ball(base,0,height+.008,0,.024,.024,.024,m.orange);
  const geom=new T.PlaneGeometry(.3,.155,7,1);geom.translate(.15,-.078,0);const flutter=mesh(base,geom,mat(0xe5a466,.18,.73,{side:T.DoubleSide}),.012,height-.025,0);
  const orig=geom.attributes.position.array.slice();flags.push({geom,orig});return base;
 }
 flag(5.85,roadX(5.85)-.68,.79);flag(16.02,roadX(16.02)-.56,.99);
 // Water strips have separate local heights and velocities, including the street puddle.
 const waterMat=mat(0x638b9e,.65,.11),waterMeshes=[];
 function water(d,len,w,y,isPuddle){
  const g=new T.PlaneGeometry(w,len,5,23);g.rotateX(-PI/2);
  const A=g.attributes.position;for(let i=0;i<A.count;i++){const z=A.getZ(i),x=A.getX(i);if(isPuddle){const f=Math.sin(PI*((z/len)+.5));A.setX(i,x*(.08+.92*Math.pow(Math.max(0,f),.49))+.05*Math.sin(z*7));}
    A.setY(i,isPuddle?roadY(d-z)-y+.002:0);}
  const orig=A.array.slice();const o=mesh(outside,g,waterMat,roadX(d),y,-d);o.castShadow=false;waterMeshes.push({g,orig});return o;
 }
 water(3.43,1.15,.78,roadY(3.43),true);water(14.02,4.55,2.18,roadY(12)+.025,false);
 const canal=group(outside);
 for(const a of [-1,1])for(let i=0;i<22;i++){let d=11.87+i*.204;box(canal,roadX(14)+a*1.13,roadY(12)+.023,-d,.125,.139,.20,stone,.009);}
 for(const d of [11.48,16.15])for(let i=0;i<7;i++)box(canal,roadX(d),roadY(12)+.06,-d-i*.06,1.68,.062,.056,m.edge);
 for(let i=0;i<6;i++){let d=6.65+i*.54;for(const a of [-1,1]){cyl(canal,roadX(d)+a*.73,roadY(d)+.105,-d,.016,.019,.21,m.nickel);if(i<5)rod(canal,[roadX(d)+a*.73,roadY(d)+.18,-d],[roadX(d+.54)+a*.73,roadY(d+.54)+.18,-d-.54],.011,m.iron);}}
 for(const a of [-1,1]){
  box(canal,roadX(12)+a*.993,roadY(12)+.11,-12.45,.126,.36,.158,m.iron,.012);
  box(canal,roadX(12)+a*.993,roadY(12)+.302,-12.45,.14,.032,.17,m.orange,.006);
 }
 batch(canal);
 const ferry=group(outside);box(ferry,0,-.033,0,.64,.119,.69,m.edge,.055);box(ferry,0,.026,0,.61,.036,.65,m.cream,.016);
 for(const a of [-1,1]){ball(ferry,a*.29,-.012,0,.085,.071,.31,m.orange);for(const z of [-.19,.19])tor(ferry,a*.29,-.011,z,.068,.008,m.iron);}batch(ferry);
 const paddles=[-1,1].map(side=>{
  const g=group(outside);cyl(g,0,0,0,.018,.018,.103,m.chrome,16,'x');tor(g,side*.036,0,0,.067,.005,m.orange,'x');
  for(let i=0;i<7;i++){const a=tau*i/7;rod(g,[side*.036,0,0],[side*.036,.064*Math.cos(a),.064*Math.sin(a)],.004,m.iron);
   box(g,0,.068*Math.cos(a),.068*Math.sin(a),.084,.019,.024,m.orange,.004).rotation.x=a;}
  return batch(g);
 });
 const valve=group(outside,roadX(11.9)+.34,roadY(12)+.30,-11.94);
 tor(valve,0,0,0,.113,.013,m.orange);cyl(valve,0,0,-.035,.028,.028,.082,m.iron,20,'z');
 for(let i=0;i<5;i++){let a=tau*i/5;rod(valve,[0,0,0],[.106*Math.cos(a),.106*Math.sin(a),0],.008,m.nickel);}batch(valve);
 const gate=group(outside,roadX(12),roadY(12)-.13,-12.45);box(gate,0,0,0,1.93,.22,.048,m.edge,.012);
 const shelves=[];
 for(const [d,id] of [[5.85,'spring'],[16.0,'sail']]){
  const x=roadX(d)+.48,y=roadY(d);const mount=group(outside,x,y,-d-.14);
  box(mount,0,.127,0,.273,.25,.18,m.edge,.017);box(mount,0,.26,0,.29,.018,.19,m.nickel,.006);
  for(let i=0;i<3;i++)box(mount,0,.04+i*.066,.093,.226,.056,.014,m.dark,.004);batch(mount);
  const drawer=group(outside,x,y+.233,-d-.13);box(drawer,0,0,0,.257,.017,.226,m.iron,.006);
  const gift=id==='spring'?Art.springPack(outside):group(outside);
  if(id==='sail'){cyl(gift,0,.047,0,.034,.034,.157,m.orange,22,'x');for(const a of [-1,1])cyl(gift,a*.053,.047,0,.038,.038,.017,m.cream,22,'x');batch(gift);}
  batch(drawer);shelves.push({id,drawer,gift,baseZ:drawer.position.z});
 }
 const dust=[],dm=mat(0xe1d5b3,.14,.54,{transparent:true,opacity:.34,depthWrite:false});
 const dustMesh=new T.InstancedMesh(new T.IcosahedronGeometry(.0013),dm,32);dustMesh.frustumCulled=false;garage.add(dustMesh);
 return {garage,table,stand,key,layout,shutter,lampGlow,flags,waterMeshes,ferry,paddles,valve,gate,shelves,dustMesh,back,winLit,strip};
}
