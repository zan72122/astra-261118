'use strict';
const Parcels=(()=>{
const {T,rand,mat,paper,board,group,mesh,box,ball,cyl,rod,line,ring,face,contact,decal,makeStamp,cargoIcon,canvas}=Atelier;
const brass=mat(0xbd965c,.31,.66), oatmeal=mat(0xe0c99f),ink=mat(0x485755);
function carton(parent,b,i){
 const root=group(parent,b.x,.005,b.z);root.rotation.y=b.yaw;
 const {w,h,d}=b,t=.019;
 const kraft=mat([0xc5996e,0xbc966c,0xbb8d5e][i],.91,0,{map:paper}),inside=mat(0x99734e,.96,0,{map:paper});
 const fluting=canvas(256,26,(c)=>{c.fillStyle='#ab8562';c.fillRect(0,0,256,26);c.strokeStyle='#7f5f43';c.lineWidth=1.6;c.beginPath();for(let j=0;j<=256;j++)c.lineTo(j,11+7*Math.sin(j*.42));c.stroke();c.fillStyle='#d8b794';c.fillRect(0,1,256,3);c.fillRect(0,21,256,4);});
 const edge=mat(0xf4d9b5,.97,0,{map:fluting});
 box(root,w,.026,d,inside,0,.017,0);
 const panels=[group(root,-w/2,0,0),group(root,w/2,0,0),group(root,0,0,-d/2),group(root,0,0,d/2)];
 for(let j=0;j<4;j++){
  let side=j%2?1:-1;
  box(panels[j],j<2?t:w,h,j<2?d-2*t:t,kraft,j<2?-side*t/2:0,h/2,j<2?0:-side*t/2,.003);
 }
 const lids=[];for(let j=0;j<4;j++){
 let side=j%2?1:-1,top=j<2,pivot=group(root,top?side*w/2:0,h+(top?.008:-.012),top?0:side*d/2);lids.push(pivot);
 let fw=top?w/2-.004:w-2*t,fd=top?d-.007:d*.38,cx=top?-side*fw/2:0,cz=top?0:-side*fd/2;
 box(pivot,fw,t,fd,kraft,cx,0,cz,.0025);
 box(pivot,top?t:fw,.013,top?fd:.005,edge,top?-side*(fw-.003):0,.001,top?0:-side*(fd-.003));
 if(top){box(pivot,fw-.006,.012,.0038,edge,cx,0,d/2-.001);box(pivot,.002,.0015,fd*.96,inside,-side*.031,.01,0);}
 }
 const tape=mat([0xe6c499,0xd7b48a,0xd6ad82][i],.40,.025,{map:paper,side:T.DoubleSide});
 // The torn end and each adhesive section follow their own moving peel front.
 const N=26,tw=i===0?.136:.111,verts=new Float32Array((N+1)*6),uv=[],indices=[];
 for(let j=0;j<=N;j++){uv.push(0,j/N,1,j/N);if(j<N){let k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
 const stripGeo=new T.BufferGeometry();stripGeo.setAttribute('position',new T.BufferAttribute(verts,3));stripGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));stripGeo.setIndex(indices);
 const strip=mesh(root,stripGeo,tape);strip.frustumCulled=false;
 const tapeFront=box(root,tw,.157,.004,tape,0,h-.074,d/2+.002);
 const tapeRear=box(root,tw,.13,.004,tape,0,h-.06,-d/2-.002);panels[2].attach(tapeRear);
 // Vermilion folded pull tab, with a stitched-looking pair of printed arrows.
 const tab=group(root);const tabMat=mat(i===0?0xbe5738:0xb6724a,.52,.02,{side:T.DoubleSide});let pp=[],ii=[];
 for(let j=0;j<=18;j++){let f=j/18;let yy=.018+.064*Math.sin(f*2.55),zz=f*.144;pp.push(-tw*.56,yy,zz,tw*.56,yy,zz);if(j<18){let k=j*2;ii.push(k,k+1,k+2,k+1,k+3,k+2);}}
 let tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(pp,3));tg.setIndex(ii);tg.computeVertexNormals();mesh(tab,tg,tabMat);
 for(let n=0;n<2;n++){let z=.062+n*.033,y=.018+.064*Math.sin(z/.144*2.55)+.002;line(tab,[[-.029,y,z],[0,y+.004,z+.016],[.029,y,z]],.0032,mat(0xffe7bd));}
 const strings=group(root);let sx=-w*.295;const hemp=mat(0xe4d3ae,.97,0,{map:paper}),hempshadow=mat(0xbba17a,.96);
 for(let j=0;j<2;j++){let cx=sx+j*.016;line(strings,[[cx,-.002,d/2-.013],[cx,h*.15,d/2+.007],[cx,h-.014,d/2+.009],[cx,h+.024,d/2-.022],[cx,h+.024,.03],[cx,h+.024,-d/2+.014],[cx,h-.012,-d/2-.009],[cx,.01,-d/2-.006]],.0065,j?hempshadow:hemp);}
 const knot=group(strings,sx,h+.029,-d*.18);
 for(let side of [-1,1]){line(knot,[[0,0,0],[side*.063,.040,-.044],[side*.116,.046,-.045],[side*.128,.030,-.008],[side*.072,.017,.010],[0,.009,0]],.0062,hemp);line(knot,[[0,.01,0],[side*.046,.012,.041],[side*.10,.005,.082],[side*.139,.003,.087]],.0058,hemp);}
 ball(knot,0,.01,0,.019,.014,.019,hemp);
 const label=face(root,w*.39,w*.39*.586,decal(makeStamp(i)),w*.204,h*.51,d/2+.004);label.rotation.z=.052-i*.049;
 let icon=face(root,w*.216,w*.19,decal(cargoIcon(i)),-w*.09,h*.44,d/2+.0045);
 const sidePrint=face(root,.19,.15,decal(canvas(128,96,c=>{c.fillStyle='#77684f';for(let x of [33,81]){c.fillRect(x-4,32,8,36);c.beginPath();c.moveTo(x-17,37);c.lineTo(x,16);c.lineTo(x+17,37);c.fill();}c.fillRect(13,72,89,4);})),w/2+.003,h*.31,.07);sidePrint.rotation.y=Math.PI/2;
 panels[3].attach(label);panels[3].attach(icon);panels[1].attach(sidePrint);panels[3].attach(tapeFront);
 for(let j=0;j<4;j++)panels[j].attach(lids[j]);
 const shadow=contact(parent,b.x,.008,b.z,w*1.55,d*1.52,.81);shadow.rotation.z=b.yaw;
 function update(state){
  root.rotation.z=state.wobble.x;
  panels.forEach((p,j)=>{const sign=j%2?1:-1;if(j<2)p.rotation.z=sign*state.panels[j].x;else p.rotation.x=-sign*state.panels[j].x;});
  const flat=Math.sin(state.panels[0].x);const free=state.pull/d;
  lids.forEach((p,j)=>{const side=j%2?1:-1;if(j<2)p.rotation.z=-side*state.flaps[j].x;else p.rotation.x=side*state.flaps[j].x;});
  let f=state.pull/d;
  for(let j=0;j<=N;j++){let c=state.cells[Math.min(j,N-1)],a=j/N,loose=(1-c.bond);
    // The loose length doubles back over the bonded length, then drapes to one side.
    const lifted=c.lift.x,front=Math.max(0,f-a),fold=Math.max(0,(f-.80)/.20);
    let z=d*(.5-a)-1.52*d*front*loose;
    let y=h+.020+lifted+loose*.008+Math.min(.08,front*.16);
    let x=loose*(.05*Math.sin(a*4.5)+fold*(w*.57+.12*Math.sin(a*3)));
    y-=fold*loose*(.30+.44*Math.pow(1-a,1.5));y=y*(1-flat)+flat*(.075+a*.019);
    verts.set([x-tw/2,y,z,x+tw/2,y+loose*.008*Math.sin(a*9),z],j*6);
  }stripGeo.attributes.position.needsUpdate=true;stripGeo.computeVertexNormals();
  tab.position.set((verts[0]+verts[3])/2,verts[1],verts[2]-.012);tab.rotation.x=-Math.min(.8,f*2);tab.rotation.z=free*.25;
  tapeFront.scale.y=Math.max(.012,1-f*32);tapeFront.position.y=h-.074*tapeFront.scale.y;
  strings.scale.y=1-flat*.94;strings.position.x=-Math.min(.26,state.flaps[0].x*.15);strings.position.y=(-state.flaps[0].x*.085+state.slip.x*.10)*(1-flat)+.014*flat;
 }
 return {root,lids,tab,strip,shadow,label,update};
}
const clothCover=[0x6f9292,0xc38b5a,0xbca368],page=mat(0xefdfbd,.94,0,{map:paper});
function book(p,i){
 const root=group(p),w=.141+i*.014,h=.39+i*.038,d=.29,m=mat(clothCover[i],.83,0,{map:paper}),gold=mat(0xe4cca2,.59,.19);
 box(root,w-.015,h-.017,d-.022,page,0,h/2,-.002,.007);
 for(let s of [-1,1])box(root,.011,h,d,m,s*w*.48,h/2,0,.004);
 box(root,w,h,.026,m,0,h/2,d/2-.008,.011);
 for(let a of [.12,.17,.78,.83])box(root,w*.88,.005,.0015,gold,0,a*h,d/2+.006);
 ball(root,0,h*.58,d/2+.007,.014,.021,.0025,gold);return root;
}
function shoe(p,i){
 const root=group(p),u=group(root);u.rotation.y=i===3?-.16:.14;
 const leather=mat(0xb87d52,.58,.02,{map:paper}),sole=mat(0xe4cfac,.87),opening=mat(0x51483c,.98);
 ball(u,0,.035,.010,.115,.032,.206,sole);ball(u,0,.086,.047,.108,.078,.161,leather);ball(u,0,.109,-.072,.099,.090,.121,leather);
 ball(u,0,.178,-.084,.070,.016,.068,opening);
 let lip=ring(u,0,.18,-.084,.071,.007,mat(0xce9e6b));lip.rotation.x=Math.PI/2;lip.scale.y=.91;
 for(let j=0;j<3;j++){let z=-.022+j*.034;line(u,[[-.063,.153-j*.008,z],[-.01,.178-j*.009,z+.005],[.06,.157-j*.009,z+.011]],.0065,oatmeal);}
 return root;
}
function radio(p){
 const root=group(p),caseMat=mat(0x7d9994,.53,.10),cream=mat(0xe9dcc0,.72),dark=mat(0x515f58,.69);
 box(root,.59,.369,.233,caseMat,0,.199,0,.041);box(root,.546,.31,.012,cream,0,.202,.116,.018);
 for(let x of [-.20,.20])box(root,.083,.028,.14,dark,x,.014,0,.007);
 // Woven grille recessed into the front panel.
 box(root,.277,.228,.012,dark,-.109,.196,.127,.018);
 for(let i=0;i<17;i++)box(root,.008,.222,.005,mat(0xc5b28a,.78),-.238+i*.016,.195,.135);
 for(let i=0;i<12;i++)box(root,.264,.005,.006,mat(0xa99e7e,.81),-.109,.095+i*.018,.138);
 box(root,.159,.045,.008,mat(0x6b786b,.27,.2),.158,.291,.128,.005);
 for(let j=0;j<9;j++)box(root,.002,.012+(j%2)*.005,.002,cream,.092+j*.016,.294,.134);
 const dial=group(root,.161,.169,.142);let c=cyl(dial,0,0,.002,.063,.067,.022,brass);c.rotation.x=Math.PI/2;
 c=cyl(dial,0,0,.018,.052,.055,.020,cream);c.rotation.x=Math.PI/2;
 box(dial,.006,.022,.003,dark,0,.027,.030,.001);
 line(root,[[-.177,.382,0],[-.177,.426,0],[-.148,.448,0],[.145,.448,0],[.177,.427,0],[.177,.382,0]],.010,mat(0x846a50));
 let a=[-.235,.38,-.075],b=[-.355,.655,-.085];rod(root,a,b,.0065,brass,.0032);ball(root,...b,.009,.009,.009,brass);return {root,dial};
}
function plant(p){
 const root=group(p),terra=mat(0xbc8064,.81,0,{map:paper});
 cyl(root,0,.133,0,.145,.107,.24,terra);cyl(root,0,.25,0,.155,.151,.042,terra);
 cyl(root,0,.272,0,.138,.138,.007,mat(0x544b37));cyl(root,0,.018,0,.137,.128,.026,terra);
 const leaves=[];
 for(let i=0;i<11;i++){let angle=i*2.399,ht=.34+.035*(i%5),len=.108+(i%3)*.024;
 let a=[0,.27,0],b=[Math.cos(angle)*len,ht+.06,Math.sin(angle)*len];rod(root,a,b,.004,mat(0x748058),.0025);
 let q=group(root,...b);q.rotation.y=-angle;let leaf=group(q);leaves.push(leaf);
 let m=mat([0x687e5a,0x81946b,0x8b9f76,0x6e8767][i%4],.46,.02,{envMapIntensity:1.1});leaf.userData.surface=m;let l=ball(leaf,.071,.003,0,.087,.013,.037,m);l.rotation.z=-.14;
 line(leaf,[[0,.012,0],[.07,.015,0],[.135,-.002,0]],.0016,mat(0xb3b894));}
 return {root,leaves};
}
return {carton,book,shoe,radio,plant,brass};
})();
