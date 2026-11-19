'use strict';
function parcelMark(g,x,y,z,scale,ink=C.teal){
 const a=group(g,x,y,z);a.scale.setScalar(scale);
 const line=(p,q)=>stick(a,[...p,.018],[...q,.018],.043,ink,.043,10);
 const P=[[0,.62],[.61,.30],[.61,-.36],[0,-.69],[-.61,-.36],[-.61,.30]];
 P.forEach((p,i)=>line(p,P[(i+1)%6]));line(P[5],[0,-.025]);line([0,-.025],P[1]);line([0,-.025],P[3]);line([-.33,.44],[.29,.13]);
 return a;
}
function truck(parent){
 const root=group(parent,0,0,-1.75),g=group(root);g.userData.live=true;
 const wheels=[];
 for(const x of [-3.18,.96])for(const z of [-1.05,1.05]){
  const w=group(root,x,.477,z);w.userData.live=true;wheels.push(w);
  const tire=cyl(w,0,0,0,.48,.34,C.rubber,.48,40);tire.rotation.x=PI/2;
  const s=Math.sign(z);
  ring(w,0,0,s*.17,.363,.072,'#343c3b');
  const hub=cyl(w,0,0,s*.194,.287,.045,mat('#d5d4be','metal'));hub.rotation.x=PI/2;
  ring(w,0,0,s*.221,.235,.02,C.metal);
  ball(w,0,0,s*.23,.142,.142,.053,C.teal);
  for(let i=0;i<6;i++){const a=i*PI/3;ball(w,Math.cos(a)*.19,Math.sin(a)*.19,s*.227,.024,.024,.014,C.dark);}
  for(let i=0;i<32;i++){const a=i*PI/16;let tread=box(w,.461*Math.cos(a),.461*Math.sin(a),0,.039,.06,.25,'#363f3d',true);tread.rotation.z=a;}
  batch(w);
 }
 box(g,-.98,.63,0,5.95,.28,1.65,'#394a49',true);
 box(g,-.20,.93,0,4.4,.25,2.55,C.teal,true);
 for(let i=0;i<11;i++)box(g,-.17,1.065,-1.12+i*.225,4.18,.095,.215,i%3===1?C.honey:C.oak,true);
 // Low packing battens support the chair near its centre of mass.
 for(let z of [-.55,-.04])box(g,.28,1.102,z,.27,.029,.18,C.wood,true);
 const cab=group(g,-3.15,0,0);
 const side=[[-1.10,.68],[-1.19,1.29],[-1.02,1.56],[-.46,2.65],[-.23,2.78],[.75,2.78],[.87,2.61],[.87,.75],[.52,.68],[.43,1.00],[.25,1.16],[-.17,1.18],[-.4,1.05],[-.55,.69]];
 profile(cab,side,2.07,C.white,0,0,-1.035,.06);
 box(cab,-.92,1.36,0,.45,.13,2.12,C.white,true);
 for(const sign of [-1,1]){const z=sign*1.091;
  profile(cab,[[-.87,1.62],[-.39,2.58],[.59,2.58],[.62,1.62]],.018,'#354f50',0,0,z,.021);
  profile(cab,[[-.78,1.69],[-.34,2.50],[.52,2.50],[.54,1.69]],.018,C.glass,0,0,z+.024,.008);
  stick(cab,[-.23,1.65,z+.043],[-.23,2.54,z+.043],.029,C.white);
  box(cab,.36,1.51,z+.035,.24,.055,.046,C.dark,true);
  path(cab,[[.69,2.55,z],[.69,.98,z],[.52,.92,z]],.009,'#b2b8ab');
  box(cab,.17,.78,sign*1.16,1.15,.10,.23,C.metal,true);
  stick(cab,[-.66,1.78,z],[-.82,1.98,sign*1.34],.029,C.dark);
  box(cab,-.82,2.05,sign*1.36,.165,.31,.125,C.dark,true);
  box(cab,-.94,1.29,z,.17,.085,.025,'#e6a64b',true);
 }
 const screen=box(cab,-.791,2.069,0,.054,1.01,1.91,C.glass,true);screen.rotation.z=-.475;
 for(let j of [-.48,.48])stick(cab,[-1.022,1.65,j-.2],[-.979,1.73,j+.30],.016,C.rubber);
 box(cab,.08,2.78,0,1.67,.15,2.24,C.white,true);
 box(cab,-1.195,1.12,0,.06,.39,1.35,C.dark,true);
 for(let j=0;j<4;j++)box(cab,-1.234,.99+j*.08,0,.018,.025,1.25,C.metal,true);
 for(let z of [-.854,.854]){box(cab,-1.166,1.20,z,.10,.20,.31,'#fff2bd',true);box(cab,-1.169,1.01,z,.095,.095,.30,'#e5a855',true);}
 box(cab,-1.18,.795,0,.27,.19,2.22,C.teal,true);
 // The furniture van has a planked interior, a painted alloy shell and a roll-up tailgate.
 for(let sign of [-1,1]){
  const z=sign*1.236;box(g,-.18,2.36,z,4.23,2.49,.11,C.white,true);
  for(let j=0;j<7;j++)box(g,-.18,1.27+j*.33,z-sign*.074,4.12,.314,.035,j%3===0?C.honey:C.oak);
  box(g,-.18,1.42,z+sign*.064,4.16,.39,.026,C.teal);
  box(g,-.18,1.69,z+sign*.064,4.17,.045,.027,'#d6a05d');
  box(g,-.18,1.17,z+sign*.07,4.31,.084,.07,C.metal,true);
  for(let x of [-2.26,1.91])box(g,x,2.37,z+sign*.018,.087,2.55,.14,'#e2ddc9',true);
  for(let j=0;j<12;j++){for(let y of [1.22,3.50])ball(g,-2.16+j*.356,y,z+sign*.072,.016,.016,.011,C.metal);}
  for(let x of [-2.05,1.70])box(g,x,3.5,z+sign*.084,.137,.055,.024,'#e9a34c',true);
 }
 const livery=group(g,-.14,2.57,1.305);
 const disc=cyl(livery,0,0,0,.648,.012,mat('#dce4d6'));disc.rotation.x=PI/2;
 ring(livery,0,0,.020,.626,.015,C.teal);
 parcelMark(livery,0,-.017,.034,.64);
 for(let sg of [-1,1])for(let i=0;i<3;i++)box(livery,sg*(.85+i*.035),.12-.105*i,.026,.43-i*.1,.037,.022,i===1?'#c28c4e':C.teal,true);
 box(g,-2.24,2.35,0,.12,2.49,2.42,C.oak);
 for(let j=0;j<8;j++)box(g,-2.16,1.26+j*.301,0,.028,.284,2.34,j%2?C.oak:C.honey);
 box(g,-.17,3.65,0,4.36,.13,2.68,C.white,true);
 for(const s of [-1,1]){
  box(g,1.982,2.36,s*1.219,.11,2.57,.12,C.metal,true);
  box(g,2.046,1.02,s*.98,.061,.18,.34,C.dark,true);
  box(g,2.081,1.04,s*1.039,.028,.118,.14,'#b95339',true);
  box(g,2.082,1.04,s*.88,.026,.116,.11,'#efa752',true);
  box(g,-1.62,.74,s*1.11,.70,.33,.30,C.metal,true);
 }
 box(g,2.017,.78,0,.25,.155,2.60,C.dark,true);
 box(g,1.987,3.53,0,.19,.21,2.49,C.white,true);
 const slats=Array.from({length:12},(_,i)=>{const p=group(g);p.userData.live=true;box(p,0,0,0,.092,.218,2.32,i===11?'#78a6a0':'#d8d9c9',true);if(i===11){box(p,.057,0,0,.072,.07,.45,C.dark,true);}return p;});
 const ramp=group(g,1.96,1.078,0);ramp.userData.live=true;
 box(ramp,1.13,-.06,0,2.26,.12,1.72,mat('#b5b7a8','metal'),true);
 for(let i=0;i<11;i++)box(ramp,.11+i*.201,.010,0,.043,.027,1.62,mat('#d7d6be','metal'),true);
 for(let z of [-.875,.875])box(ramp,1.13,.035,z,2.27,.11,.042,'#d1b16f',true);
 batch(ramp);batch(g);
 return {root,body:g,wheels,slats,ramp};
}
function carton(g){
 box(g,0,.403,0,1.0,.806,.81,mat('#bf8a56','wood'),true);
 for(let side of [-1,1]){box(g,side*.252,.815,0,.492,.030,.809,'#cda475',true);box(g,0,.43,side*.409,.166,.766,.009,'#dfbd87');}
 box(g,0,.836,0,.17,.013,.81,'#e4c797');
 for(let x of [-.498,.498])box(g,x,.66,0,.014,.074,.238,'#694c37',true);
 box(g,.282,.467,.414,.235,.203,.014,'#eeead6',true);parcelMark(g,.283,.47,.425,.11,'#657c70');
 for(let j=0;j<2;j++){box(g,-.37+j*.091,.245,.414,.024,.115,.014,'#725c45');profile(g,[[-.045,0],[0,.061],[.045,0]],.006,'#725c45',-.37+j*.091,.29,.412,0);}
 box(g,-.321,.165,.418,.195,.018,.01,'#725c45');
}
function bookcase(g){
 const w=1.28,d=.47;for(const x of [-.56,.56]){for(const z of [-.16,.16])box(g,x,.09,z,.10,.18,.1,C.wood,true);box(g,x,.981,0,.096,1.66,d,C.oak,true);}
 box(g,0,.96,-.218,1.11,1.63,.05,mat('#987650','wood'));
 for(let i=0;i<5;i++)box(g,0,.958,-.182,.012,1.58,.015,'#8d704f').position.x=-.48+i*.23;
 for(let y of [.19,.72,1.24,1.81])box(g,0,y,0,y===1.81?w:1.18,.085,y===1.81?.55:d,C.honey,true);
 const palette=['#596f73','#c48658','#d6b877','#78978a','#8b6260','#e1cc9f'];
 function book(x,y,h,w,col,lean=0){const a=group(g,x,y,0);a.rotation.z=lean;box(a,0,h/2,.015,w,h,.276,col,true);box(a,0,h-.012,.012,w*.77,.018,.24,'#e1d7b8');for(let k of [.16,.76])box(a,0,h*k,.158,w*.77,.014,.008,'#d9c492');}
 for(let i=0;i<6;i++)book(-.447+i*.131,.233,.33+(i%3)*.051,.112,palette[i],i===5?-.13:0);
 for(let i=0;i<3;i++)book(-.44+i*.145,.766,.32+i*.034,.125,palette[5-i],.025);
 for(let i=0;i<2;i++)box(g,.266,.795+.078*i,.008,.38,.072,.277,palette[i+1],true);
 for(let i=0;i<3;i++)book(.025+i*.137,1.283,.342+i*.024,.11,palette[i+2],i===0?-.18:0);
}
function chair(g){
 for(const x of [-.315,.315])for(const z of [-.295,.295])stick(g,[x*1.20,.032,z*1.22],[x*.90,.582,z*.89],.047,C.wood,.062);
 for(let x of [-.339,.339])stick(g,[x,.235,-.293],[x,.235,.30],.031,C.oak);
 stick(g,[-.335,.245,.03],[.335,.245,.03],.032,C.oak);
 box(g,0,.574,0,.82,.117,.76,C.honey,true);
 box(g,0,.654,.041,.708,.09,.60,'#87a49b',true);
 for(let x of [-.346,.346])stick(g,[x,.562,-.269],[x,1.27,-.379],.049,C.wood,.042);
 for(let i=0;i<5;i++)stick(g,[-.24+i*.12,.63,-.28],[-.24+i*.12,1.19,-.36],.024,C.honey,.023);
 const top=box(g,0,1.225,-.365,.79,.157,.116,C.honey,true);top.rotation.x=-.12;
}
function plant(g){
 cyl(g,0,.244,0,.235,.48,mat('#b87b53'),.319,40);
 cyl(g,0,.476,0,.333,.097,mat('#c78d67'),.342,40);
 cyl(g,0,.53,0,.289,.015,'#514d39');
 const leaves=[];for(let i=0;i<12;i++){
  const a=i*2.398,dx=Math.cos(a),dz=Math.sin(a),h=.65+(i%4)*.108,reach=.15+(i%3)*.046;
  const b=group(g,dx*.046,.51,dz*.046);b.userData.live=true;b.rotation.y=-a;
  stick(b,[0,0,0],[reach,h-.51,0],.014,'#66805b',.009);
  const leaf=ball(b,reach+.063,h-.48,0,.195,.041,.095,['#4c7854','#698e60','#7d9c68','#507d5c'][i%4]);leaf.rotation.z=.57+i%3*.13;
  stick(b,[reach-.038,h-.522,0],[reach+.211,h-.425+.063*(i%3),0],.006,'#97a878',.003);
  leaves.push(b);
 }
 return leaves;
}
function bicycle(g){
 const tyre=C.rubber,frame=mat('#609c93','metal'),chrome=C.metal,R=.39;
 for(const x of [-.64,.64]){
 ring(g,x,.413,0,R,.047,tyre);ring(g,x,.413,0,R-.047,.017,chrome);
 for(let i=0;i<20;i++){let a=i*PI/10;stick(g,[x,.413,(i%2?1:-1)*.042],[x+Math.cos(a)*.341,.413+Math.sin(a)*.341,0],.005,chrome,.005,6);}
 const hub=cyl(g,x,.413,0,.056,.145,chrome);hub.rotation.x=PI/2;
 const pts=Array.from({length:13},(_,i)=>[x+Math.cos(.15+i*.226)*.462,.413+Math.sin(.15+i*.226)*.462,0]);path(g,pts,.032,'#c6c9ad');
 }
 const rear=[-.64,.413,.003],ped=[-.117,.326,0],seat=[-.28,.903,0],head=[.442,.921,0],front=[.64,.413,0];
 for(let [a,b,r] of [[rear,ped,.028],[rear,seat,.025],[ped,seat,.048],[ped,[.312,.53,0],.054],[[.312,.53,0],head,.052],[[-.23,.674,0],[.32,.655,0],.035],[head,front,.031]])stick(g,a,b,r,frame);
 stick(g,seat,[-.31,1.036,0],.027,chrome);ball(g,-.337,1.043,0,.171,.048,.085,mat('#885d40'));
 path(g,[[.437,.90,0],[.395,1.17,0],[.45,1.208,0]],.026,chrome);
 for(let k of [-1,1]){path(g,[[.44,1.20,0],[.421,1.22,k*.154],[.34,1.20,k*.262]],.022,chrome);stick(g,[.39,1.218,k*.21],[.32,1.198,k*.29],.028,C.wood);}
 ring(g,-.117,.326,.074,.115,.017,chrome);
 for(let k of [-1,1]){stick(g,[-.117,.326,k*.08],[-.117+k*.11,.326+k*.068,k*.09],.015,chrome);box(g,-.117+k*.11,.326+k*.068,k*.145,.076,.029,.10,tyre);}
 path(g,[[-.64,.416,.071],[-.115,.218,.08],[-.026,.348,.08],[-.142,.433,.08],[-.64,.446,.071]],.009,C.dark);
 // Slatted wicker basket with a rolled rim.
 const basket=group(g,.669,1.00,0);for(let i=0;i<6;i++){const f=i/5;const o=ring(basket,0,.04+i*.042,0,.162+f*.037,.012,C.honey,24);o.rotation.x=PI/2;o.scale.y*=1.19;}
 for(let i=0;i<16;i++){const a=i*PI/8;stick(basket,[.15*Math.cos(a),.02,.181*Math.sin(a)],[.203*Math.cos(a),.261,.24*Math.sin(a)],.008,C.wood);}
 stick(g,[-.13,.33,.018],[-.23,.017,.22],.016,chrome);
}
