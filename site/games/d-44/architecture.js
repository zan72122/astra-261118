'use strict';
const House=(()=>{
const {T,mat,board,paper,rand,canvas,group,mesh,box,ball,cyl,rod,line,ring,face,contact,decal}=Atelier;
function build(scene){
 const plaster=mat(0xf4ecdf,.95,0,{map:paper}),trim=mat(0xf3eada,.64),deep=mat(0x9f9a86),wood=board(0xb49672,2),bronze=Parcels.brass;
 const fixed=group(scene),shelf=group(fixed,-1.73,0,-1.60);
 const grainM=['#d1ac86','#cba27d','#d4b18c','#caa17b','#cfa882'].map((v,i)=>board(v,i));
 box(fixed,13,.10,12,mat(0x8c735d),0,-.06,2);
 for(let row=0;row<32;row++){let z=-2.16+row*.25;let start=-5.9-(row%3)*.73;
   for(let col=0;col<6;col++){let len=2.20;box(fixed,len-.004,.038,.247,grainM[(rand()*5)|0],start+col*len,-.019,z,.002);}}
 const back=-2.135,L=-.37,R=2.91,upper=2.74;
 box(fixed,6.63,5.2,.16,plaster,L-3.315,2.6,back);box(fixed,4.09,5.2,.16,plaster,R+2.045,2.6,back);
 box(fixed,R-L,3,.16,plaster,(L+R)/2,upper+1.5,back);box(fixed,.15,5.4,10,plaster,-3.42,2.70,1);
 for(let [x,w] of [[(L-3.36)/2,L+3.36],[(R+6)/2,6-R]]){box(fixed,w,.124,.037,trim,x,.062,back+.10,.005);box(fixed,w,.017,.046,trim,x,.125,back+.106,.005);}
 box(fixed,.042,.13,9,trim,-3.325,.065,1.4,.004);
 box(fixed,11,.15,17,mat(0xf3ecdf,.96),1.95,3.54,6.31);
 box(fixed,10.5,.085,.071,trim,1.82,3.415,back+.101,.009);
 box(fixed,10.5,.021,.096,trim,1.82,3.381,back+.117,.004);
 box(fixed,.069,.086,14,trim,-3.326,3.415,4.84,.009);
 // Recessed window jamb, twin tracks, meeting rails and brass latch.
 for(let x of [L-.036,R+.036]){box(fixed,.102,upper+.09,.23,trim,x,upper/2,back+.006,.008);box(fixed,.022,upper,.13,deep,x+(x<0?.054:-.054),upper*.5,back-.015);}
 box(fixed,R-L+.14,.105,.23,trim,(R+L)/2,upper,back,.005);
 box(fixed,R-L+.16,.052,.32,wood,(L+R)/2,.026,back+.025,.006);
 for(let j of [-.055,.045])box(fixed,R-L,.015,.009,bronze,(L+R)/2,.055,back+j);
 const mid=(L+R)/2,gWidth=(R-L)/2,glass=mat(0xc3dce0,.12,.24,{transparent:true,opacity:.085,depthWrite:false,envMapIntensity:1.6});
 function glazed(x,z){const g=group(scene,x,.045,z),hh=upper-.078;
  for(let k of [-1,1])box(g,.049,hh,.062,trim,k*(gWidth/2-.023),hh/2,0,.004);
  for(let y of [.031,hh-.025,2.11])box(g,gWidth-.045,y===2.11?.029:.054,.062,trim,0,y,0,.003);
  let pane=box(g,gWidth-.08,hh-.09,.008,glass,0,hh/2,0);pane.castShadow=false;return g;
 }
 const door=glazed((L+mid)/2,back+.016);glazed((R+mid)/2,back-.078);
 const dx=gWidth*.5-.098;box(door,.034,.192,.012,bronze,dx,1.003,.042,.006);
 line(door,[[dx,.942,.046],[dx,.951,.083],[dx,1.062,.083],[dx,1.073,.046]],.010,bronze);
 // Real pleated linen with a curved hem and localized wind deflection.
 const curtainMat=mat(0xf5ebd6,.91,0,{map:paper,side:T.DoubleSide});
 function drape(x,w,side){
  const cols=32,rows=15,vs=[],uv=[],idx=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){let u=i/cols,v=j/rows,fold=Math.cos(u*8*Math.PI);
   vs.push(x+side*(u*w*(.72+.28*v)+.016*Math.sin(v*4+u*3)),2.87-v*(2.69+.022*fold+.04*u),-1.936+.039*fold+.060*v*v);
   uv.push(u,v);if(j<rows&&i<cols){let k=j*(cols+1)+i;idx.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const o=mesh(scene,g,curtainMat);
  for(let i=0;i<5;i++){let r=ring(fixed,x+side*i*w*.18,2.908,-1.956,.032,.0045,bronze);r.rotation.y=Math.PI/2;}
  return {o,base:vs,cols,rows};
 }
 rod(fixed,[L-.25,2.915,-1.953],[R+.22,2.915,-1.953],.013,bronze);
 const drapes=[drape(L-.17,.35,1),drape(R+.16,.43,-1)];
 // Low, mostly empty oak bookcase, stopped grooves, end grain and tapered feet.
 const oak=board(0xb49770,1),paleOak=board(0xc9af89,4),backing=board(0xb39b7b,3),sw=1.99;
 for(let x of [-.86,.86])for(let z of [-.127,.136]){rod(shelf,[x*1.025,.01,z*1.13],[x,.244,z],.035,oak,.048);}
 box(shelf,sw,.072,.443,paleOak,0,1.057,0,.022);box(shelf,sw-.036,.07,.405,paleOak,0,.319,0,.012);
 box(shelf,sw-.09,.674,.032,backing,0,.685,-.182);for(let x of [-.959,.959])box(shelf,.055,.71,.402,oak,x,.683,0,.009);
 for(let x=-.89;x<.93;x+=.207)box(shelf,.002,.67,.004,wood,x,.686,-.161);
 box(shelf,.052,.68,.393,oak,.37,.685,0,.008);
 for(let side of [-1,1]){
  let x=-.276+side*.347;
  box(shelf,.133,.005,.224,bronze,x-side*.061,.357,0,.002);
  line(shelf,[[x,.357,.085],[x,.52,.075],[x,.55,0],[x,.50,-.075],[x,.357,-.085]],.005,bronze);
 }
 box(shelf,.549,.53,.016,board(0xc3ae8b,3),.665,.665,.172,.013);
 for(let i=0;i<22;i++)box(shelf,.009,.483,.008,paleOak,.415+i*.024,.659,.183,.0036);
 const handle=cyl(shelf,.67,.862,.194,.018,.019,.014,bronze);handle.rotation.x=Math.PI/2;
 const shelfShade=contact(fixed,-1.73,.006,-1.60,2.55,.81,.69);
 // Woven flax mat provides a visible landing for the slippers.
 const textile=canvas(256,256,(c,w,h)=>{c.fillStyle='#cbbc9c';c.fillRect(0,0,w,h);
 for(let i=0;i<w;i+=2){c.fillStyle=i%4?'#c5b598':'#dbceaf';c.fillRect(i,0,1,h);}
 for(let j=0;j<h;j+=3){c.fillStyle='rgba(120,103,78,.16)';c.fillRect(0,j,w,1);}
 for(let x of [13,19,27,227,235,241]){c.fillStyle='#8e9790';c.fillRect(x,0,x%2?2:4,h);}
 });
 const matGroup=group(fixed);box(matGroup,1.38,.012,.65,mat(0xfff6df,.98,0,{map:textile}),-1.70,.007,-.73,.005);
 for(let j=0;j<48;j++){let x=-2.37+j*.028;box(matGroup,.008,.006,.038,mat(0xd5c4a4),x,.006,-.389+rand()*.008);}
 // A screen-printed seaside view in a real rebated maple frame.
 const picture=canvas(420,530,(c,w,h)=>{c.fillStyle='#ededdd';c.fillRect(0,0,w,h);
 c.fillStyle='#afc9c4';c.fillRect(34,34,352,462);c.save();c.beginPath();c.rect(34,34,352,462);c.clip();
 c.fillStyle='#efe1b5';c.beginPath();c.arc(277,149,66,0,7);c.fill();
 const hill=(color,pts)=>{c.fillStyle=color;c.beginPath();c.moveTo(0,h);pts.forEach(p=>c.lineTo(...p));c.lineTo(w,h);c.fill();};
 hill('#7e9d94',[[0,265],[122,198],[210,253],[309,274],[424,289]]);
 hill('#658881',[[0,338],[64,302],[145,316],[260,248],[314,267],[426,225]]);
 hill('#e2cea5',[[0,364],[97,350],[180,369],[320,336],[426,342]]);
 c.fillStyle='#7fa8a6';c.fillRect(0,373,w,141);c.strokeStyle='#dbdcc0';c.lineWidth=2.1;
 for(let i=0;i<36;i++){let x=rand()*w,y=381+rand()*121;c.beginPath();c.moveTo(x,y);c.lineTo(x+10+rand()*67,y);c.stroke();}
 c.restore();for(let i=0;i<9000;i++){c.fillStyle=rand()<.5?'rgba(255,248,225,.13)':'rgba(93,99,77,.07)';c.fillRect(rand()*w,rand()*h,1,2);}
 });
 const frame=group(fixed,-1.63,2.013,-2.024);frame.rotation.z=-.008;
 box(frame,.65,.82,.032,wood);face(frame,.606,.774,mat(0xfff5de,.89,0,{map:picture}),0,0,.018);
 for(let s of [-1,1]){box(frame,.019,.82,.043,paleOak,s*.315,0,.010,.003);box(frame,.619,.019,.043,paleOak,0,s*.4,.010,.003);}
 // Mushroom reading lamp with a fluted enamel shade and hanging pull.
 const lamp=group(scene,-2.37,1.092,-1.60),lampmetal=mat(0x9c9166,.38,.42),lampShade=mat(0xe1c995,.52,.18,{side:T.DoubleSide});
 cyl(lamp,0,.030,0,.135,.158,.047,lampmetal);cyl(lamp,0,.064,0,.092,.119,.024,lampmetal);cyl(lamp,0,.215,0,.021,.024,.30,bronze);
 const lg=new T.LatheGeometry([new T.Vector2(.218,.340),new T.Vector2(.221,.354),new T.Vector2(.214,.370),new T.Vector2(.183,.434),new T.Vector2(.132,.495),new T.Vector2(.073,.525),new T.Vector2(.016,.533),new T.Vector2(0,.530)],60);
 mesh(lamp,lg,lampShade);let rim=ring(lamp,0,.345,0,.218,.005,bronze);rim.rotation.x=Math.PI/2;
 const bulb=ball(lamp,0,.355,0,.054,.054,.054,mat(0xffe1ad,.31,0,{emissive:0xffba5b,emissiveIntensity:0}));
 const pull=group(lamp,.123,.344,.014);rod(pull,[0,0,0],[0,-.172,0],.0023,bronze);ball(pull,0,-.18,0,.013,.018,.013,bronze);
 const lamplight=new T.PointLight(0xffbf74,0,4,2);lamp.add(lamplight);lamplight.position.y=.302;
 const birdBase=group(scene,-1.79,1.094,-1.57);box(birdBase,.233,.045,.119,paleOak,0,.023,0,.011);rod(birdBase,[0,.04,0],[0,.18,0],.006,bronze);
 let bird=group(birdBase,0,.171,0);ball(bird,0,0,0,.10,.047,.043,mat(0x819899,.64));ball(bird,.077,.035,0,.047,.044,.040,mat(0x7c9393,.61));
 rod(bird,[.103,.031,0],[.154,.027,0],.019,bronze,.001);for(let z of [-.036,.036]) ball(bird,.092,.045,z,.006,.006,.003,inkMat());
 const wings=[];for(let side of [-1,1]){let pivot=group(bird,-.015,.014,side*.020);let wing=ball(pivot,-.016,0,side*.064,.063,.012,.082,mat(0xb18a60));wing.rotation.y=-side*.38;wings.push(pivot);}
 const wheel=group(birdBase,-.061,.082,.042);ring(wheel,0,0,0,.036,.005,bronze);for(let i=0;i<3;i++){let bar=box(wheel,.068,.004,.005,bronze);bar.rotation.z=i*Math.PI/3;}
 // Balcony decking and a narrow iron rail. The sea is actual geometry beyond it.
 box(fixed,7,.13,1.63,mat(0xc7bd9f),.72,-.057,-2.99);for(let i=0;i<17;i++)box(fixed,.366,.026,1.57,boardDeck(),-2.4+i*.373,.015,-2.99);
 const rail=mat(0x829996,.465,.36),railTop=mat(0x9e9c81,.42,.31);box(fixed,7,.064,.065,railTop,.72,.93,-3.72,.015);box(fixed,7,.027,.027,rail,.72,.136,-3.72,.004);
 for(let i=0;i<25;i++)box(fixed,i%6===0?.033:.016,.79,.024,rail,-2.68+i*.285,.535,-3.72,.004);
 for(let x of [-2.62,4.07])box(fixed,.050,.056,1.6,railTop,x,.93,-2.95);
 const awning=group(fixed,.95,2.85,-2.18);const stripe=[mat(0xd2a165,.93,0,{map:paper,side:T.DoubleSide}),mat(0xf3e6c9,.93,0,{map:paper,side:T.DoubleSide})];
 for(let i=0;i<19;i++){let x=-2.59+i*.278;let a=box(awning,.279,.024,1.42,stripe[i%2],x,-.15,-.692);a.rotation.x=-.20;
 const sh=new T.Shape();sh.moveTo(-.14,0);sh.lineTo(.14,0);sh.lineTo(.14,-.067);sh.quadraticCurveTo(.136,-.15,0,-.153);sh.quadraticCurveTo(-.138,-.15,-.14,-.067);sh.closePath();mesh(awning,new T.ShapeGeometry(sh),stripe[i%2],x,-.298,-1.391);}
 for(let x of [-1.48,3.23]){rod(fixed,[x,2.1,-2.25],[x,2.59,-3.56],.012,rail);rod(fixed,[x,2.82,-2.23],[x,2.59,-3.56],.013,rail);}
 // Three tuned brass tubes hang independently under the canvas awning.
 const chimes=[];const chimeMount=group(scene,1.37,2.49,-3.30);
 rod(chimeMount,[0,.088,0],[0,-.06,0],.003,wood);
 cyl(chimeMount,0,-.063,0,.079,.074,.013,paleOak);
 rod(chimeMount,[0,-.07,.015],[0,-.228,.015],.0022,wood);ball(chimeMount,0,-.234,.015,.022,.011,.022,paleOak);
 for(let i=0;i<3;i++){let xx=(i-1)*.047,zz=(i%2)*.036,l=.108+i*.033;
  let pivot=group(chimeMount,xx,-.067,zz);rod(pivot,[0,0,0],[0,-.064,0],.0018,wood);
  cyl(pivot,0,-.064-l/2,0,.009,.009,l,bronze,16);chimes.push(pivot);}
 const saucerGroup=group(fixed);cyl(saucerGroup,1.99,.051,-1.78,.199,.180,.039,mat(0x94aca6,.31,.05));let lip=ring(saucerGroup,1.99,.072,-1.78,.188,.008,mat(0xb4bbb0,.38,.12));lip.rotation.x=Math.PI/2;
 // Distant island silhouettes have a shoreline, a ridge and a far slope.
 const sea=mat(0x8fb9bb,.26,.26),seaPlane=box(fixed,170,.18,80,sea,0,-1.055,-41);
 const hillColors=[0xa9bcaf,0x95aca0,0x849f91];
 for(let i=0;i<16;i++){let x=-39+i*5.2;ball(fixed,x,-1.20,-28-rand()*3.5,4+rand()*5,1.7+rand()*1.65,2.2+rand()*2,mat(hillColors[i%3],.98));}
 const sunGlints=[];for(let i=0;i<72;i++){let x=-20+rand()*42,z=-5-rand()*20;const q=ball(fixed,x,-.833+rand()*.01,z,.04+rand()*.42,.002,.012+rand()*.025,mat(i%3?0xbad0c7:0xdfd9bc,.30,.12));q.castShadow=false;sunGlints.push(q);}
 const out=group(fixed,-5.4,-.82,-13.5);box(out,8.2,.33,1.2,mat(0xb5b6a3),0,.16,.22);
 const roofs=[0xb08065,0x7b9090,0xa5846e];for(let i=0;i<9;i++){let x=-3.7+i*.94,h=.55+rand()*.9,w=.60+rand()*.3;box(out,w,h,.76,mat(i%2?0xe3cda8:0xe2d8bf),x,.31+h/2,0);
   let g=new T.BufferGeometry(),v=[-w*.58,0,.46,w*.58,0,.46,0,.31,.46, -w*.58,0,-.46,w*.58,0,-.46,0,.31,-.46];g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex([0,1,2,5,4,3,0,2,5,0,5,3,2,1,4,2,4,5]);g.computeVertexNormals();mesh(out,g,mat(roofs[i%3],.83,0,{side:T.DoubleSide}),x,h+.31,0);
   for(let j of [-.18,.18])box(out,.099,.17,.013,mat(0x788c89),x+j,.33+h*.54,.388);
 }
 // Lighthouse and two boats carry the stamp motif into the actual horizon.
 const lightHouse=group(fixed,4.9,-.82,-15);ball(lightHouse,0,.03,0,1.9,.36,.72,mat(0x96a394));cyl(lightHouse,0,.91,0,.205,.313,1.48,trim);
 cyl(lightHouse,0,1.22,0,.24,.26,.33,mat(0xb57e67));cyl(lightHouse,0,1.695,0,.312,.30,.07,rail);cyl(lightHouse,0,1.855,0,.168,.18,.29,mat(0xcbbc88,.30,.4));
 cyl(lightHouse,0,2.054,0,.014,.258,.18,mat(0x788b85));
 const ferry=group(scene,-2,-.78,-9),hull=mat(0xb67859,.58,.09);ball(ferry,0,0,0,.85,.15,.274,hull);box(ferry,1.28,.104,.435,trim,0,.097,0,.031);box(ferry,.83,.193,.338,trim,-.042,.234,0,.036);
 for(let i=0;i<6;i++)box(ferry,.084,.083,.009,mat(0x789691,.22,.30),-.358+i*.123,.242,.171,.012);
 box(ferry,.93,.038,.392,rail,-.04,.342,0,.01);cyl(ferry,-.21,.435,0,.071,.076,.166,hull);
 const sailboat=group(scene,2.05,-.76,-8.6);ball(sailboat,0,0,0,.34,.072,.092,wood);rod(sailboat,[0,.02,0],[0,.74,0],.009,paleOak);
 const sail=group(sailboat,0,.08,0);for(let j=0;j<2;j++){let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(j?[.019,0,0,.246,.024,.011,.019,.501,0]:[-.024,.01,0,-.291,.019,.013,-.024,.624,0],3));g.computeVertexNormals();mesh(sail,g,mat(j?0xd39c70:0xfae6bf,.88,0,{side:T.DoubleSide}));}
 const street=[];for(let i=0;i<3;i++){let x=-2.75+i*2.48,z=-6.25-i*.5;rod(fixed,[x,-.67,z],[x,.68,z],.017,rail);let glow=mat(0xf2dbc0,.26,.14,{emissive:0xffc377,emissiveIntensity:0});ball(fixed,x,.73,z,.058,.084,.058,glow);cyl(fixed,x,.818,z,.018,.077,.045,rail);street.push(glow);}
 // Diffuse cloud clusters, modeled in the same directional light as the harbour.
 for(let i=0;i<9;i++){let x=-38+i*9.2,z=-37-rand()*7,y=3.1+rand()*3.4;for(let j=0;j<5;j++){let q=ball(fixed,x+j*.76,y+rand()*.46,z+rand()*.4,1.10+rand()*.5,.39+rand()*.65,.85,mat(0xfaefdc,.98));q.castShadow=false;}}
 return {fixed,chimes,shelf,frame,birdBase,shelfShade,matGroup,saucerGroup,door,doorX:door.position.x,drapes,lamp,lampShade,bulb,pull,lamplight,bird,wings,wheel,street,ferry,sailboat,sail,sea,sunGlints};
}
function inkMat(){return mat(0x414d45);}
let deck;function boardDeck(){return deck||(deck=Atelier.board(0xb8ac93,0));}
return {build};
})();
