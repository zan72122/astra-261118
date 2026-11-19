'use strict';
const lawnColors=['#91a76d','#a4b880','#819963','#a4af75','#778e60'];
function landscapeTex(kind,base){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
 for(let i=0;i<29000;i++){let x=rnd()*512,y=rnd()*512;ctx.fillStyle=rnd()<.54?'rgba(71,62,38,.10)':'rgba(255,247,210,.18)';const size=range(.35,2.3);ctx.beginPath();ctx.ellipse(x,y,size,kind==='grass'?size*2.8:size*.68,rnd()*PI,0,PI*2);ctx.fill();}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
function ground(g,c,w,d,y=0,x=0,z=0,type='grass'){
 let m=mat(c).clone(),tx=landscapeTex(type,c);tx.repeat.set(w/4,d/4);m.map=tx;m.color.set('#ffffff');
 const o=mesh(g,geos.plane||(geos.plane=new T.PlaneGeometry(1,1)),m,x,y,z);o.scale.set(w,d,1);o.rotation.x=-PI/2;o.castShadow=false;return o;
}
function horizontalPolygon(g,pts,y,m){
 const sh=new T.Shape();pts.forEach(([x,z],i)=>i?sh.lineTo(x,-z):sh.moveTo(x,-z));sh.closePath();
 const geo=new T.ShapeGeometry(sh);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/3.5,uv.getY(i)/3.5);
 const o=mesh(g,geo,m,0,y,0);o.rotation.x=-PI/2;o.castShadow=false;return o;
}
function windowFrame(g,x,y,z,w,h,shutter=true){
 const a=group(g,x,y,z);
 box(a,0,0,.026,w+.19,h+.18,.14,'#f6e9d0',true);
 box(a,0,0,.10,w-.05,h-.05,.055,mat('#59818a','glass'));
 for(let side of [-1,1]){const curtain=profile(a,[[0,h*.44],[side*w*.29,h*.44],[side*w*.21,h*.15],[side*w*.092,-h*.06],[side*w*.16,-h*.42],[0,-h*.42]],.012,'#d7d9bd',side*-w*.47,0,.135,0);curtain.castShadow=false;}
 box(a,0,0,.156,.052,h,.05,'#fff1d8');box(a,0,.02,.156,w,.05,.05,'#fff1d8');
 box(a,0,-h*.5-.077,.084,w+.30,.116,.27,'#e7d6b7',true);
 if(shutter)for(let sg of [-1,1]){let b=group(a,sg*(w*.5+.29),0,0);box(b,0,0,0,.42,h+.11,.076,C.teal,true);for(let j=0;j<9;j++){let l=box(b,0,-h*.40+j*h*.10,.059,.338,.064,.046,'#65938b',true);l.rotation.x=-.17;}}
}
function daisy(g,x,y,z,sz,col='#f3ebcd'){const s=group(g,x,y,z);s.scale.setScalar(sz);s.rotation.y=rnd()*PI;
 stick(s,[0,0,0],[.032,.29,0],.009,'#708152',.006,6);
 let leaf=ball(s,.029,.16,0,.074,.017,.028,'#6c915c',true);leaf.rotation.z=.55;
 const f=group(s,.032,.30,0);f.rotation.z=range(-.4,.4);f.rotation.x=.45;
 for(let j=0;j<6;j++){const a=j*PI/3;const p=ball(f,Math.cos(a)*.043,.004,Math.sin(a)*.043,.045,.014,.024,col,true);p.rotation.y=-a;}ball(f,0,.015,0,.027,.022,.027,'#d6a343',true);
}
function house(g){
 const h=group(g,-6.4,0,-7.6),w=6.2,d=4.7,wall=3.85;
 h.scale.setScalar(.84);
 box(h,0,.28,0,w+.06,.56,d+.08,'#b3aa92');
 box(h,0,wall/2+.25,0,w,wall,d,'#dfc79e');
 for(let i=0;i<22;i++){
 const col=['#e3cda6','#e6d2ad','#e7d3ae','#dfc8a1'][i%4];
 box(h,0,.49+i*.165,d/2+.018,w,.151,.067,col);
 for(let side of [-1,1])box(h,side*(w/2+.016),.49+i*.165,0,.059,.151,d,col);
 }
 for(let x of [-3.06,3.06])box(h,x,2.21,2.409,.153,3.82,.13,'#f3e7cd',true);
 profile(h,[[-3.13,4.09],[0,6.49],[3.13,4.09]],4.72,'#dbc49a',0,0,-2.36,0);
 for(let j=0;j<12;j++){const wy=5.9*(1-j/13);box(h,0,4.15+j*.176,2.38,wy,.153,.065,'#e5cfaa');}
 const roofY=6.61,slope=.744;
 for(const sg of [-1,1]){
 let r=group(h,0,roofY,0);r.rotation.z=-sg*Math.atan(slope);
 box(r,sg*2.17,0,0,4.36,.165,5.43,'#596d70');
 const pal=['#6f8586','#73898b','#667e82','#7e9291','#74898a','#687e80'];
 for(let j=0;j<10;j++)for(let k=0;k<12;k++){const lead=k===0?.0:(j%2)*.20;const z=-2.48+k*.454-lead;
 if(z<-2.66)continue;box(r,sg*(.21+j*.444),.103-j*.001,z,.483,.072,.438,pick(pal),true);}
 box(r,sg*2.16,-.035,2.763,4.47,.152,.14,'#f3e5c8',true);
 box(r,sg*4.356,-.009,0,.17,.18,5.49,'#d8dcc8',true);
 }
 for(let j=0;j<12;j++)box(h,0,6.77,-2.48+j*.452,.24,.133,.438,'#758c8c',true);
 const chin=group(h,-1.63,5.88,-.52);box(chin,0,0,0,.61,2.02,.71,'#b67d60');
 for(let row=0;row<9;row++){for(let c=0;c<2;c++){box(chin,(c-.5)*.30,-.86+row*.203,.362,.276,.18,.015,pick(['#c18c70','#b27d63','#c39577']));}}
 box(chin,0,1.03,0,.74,.18,.84,'#d5b39a',true);box(chin,0,1.126,0,.49,.03,.58,'#676559');
 const attic=cyl(h,0,4.97,2.44,.453,.12,C.white);attic.rotation.x=PI/2;
 const inner=cyl(h,0,4.97,2.51,.343,.06,C.glass);inner.rotation.x=PI/2;
 box(h,0,4.97,2.556,.045,.66,.033,C.white);box(h,0,4.97,2.556,.67,.042,.033,C.white);
 windowFrame(h,-1.58,2.06,2.41,1.27,1.41);
 windowFrame(h,1.68,2.12,2.41,1.08,1.34);
 box(h,.17,1.49,2.42,1.22,2.65,.15,C.white,true);box(h,.17,1.44,2.53,.996,2.42,.094,mat('#af7655','wood'),true);
 for(let x of [-.076,.415])for(let y of [.80,1.43])box(h,x,y,2.593,.348,.435,.042,C.wood,true);
 box(h,.17,2.19,2.60,.69,.62,.024,C.glass);box(h,.17,2.19,2.633,.032,.62,.032,C.cream);
 ball(h,.52,1.38,2.65,.058,.058,.052,mat('#b59564','metal'));
 for(let j=0;j<3;j++)box(h,.17,.059+j*.075,2.80-j*.18,1.77-j*.08,.12+j*.145,1.16-j*.21,'#c9b99b',true);
 const hood=box(h,.17,2.97,2.73,1.81,.15,1.01,'#748c87',true);hood.rotation.x=.15;
 for(const x of [-.53,.87])stick(h,[x,2.56,2.44],[x,2.94,3.05],.052,C.cream);
 for(const x of [-1.58,1.68]){
 box(h,x,1.18,2.64,1.45,.256,.39,C.wood,true);
 for(let j=0;j<15;j++){let xx=x+range(-.61,.61),zz=range(2.53,2.76);ball(h,xx,1.38,zz,.14,.12,.11,pick(['#758c62','#5d7c58','#7c9864']),true);daisy(h,xx,1.37,zz,.55,pick(['#ebcf9c','#d99072','#f3e9c9']));}
 }
 // A deep side wing and a lit carriage lantern give the facade a human scale.
 const ext=group(h,-4.4,0,-.6);box(ext,0,1.38,0,2.65,2.75,3.35,'#d8c4a0');const exroof=box(ext,0,2.89,0,3.02,.20,3.87,'#788b88',true);exroof.rotation.z=.13;windowFrame(ext,0,1.53,1.70,.94,.98);
 box(h,.954,2.09,2.56,.19,.31,.16,'#6c776c',true);box(h,.954,2.10,2.652,.124,.214,.036,'#f7d899',true);
}
const bark=mat('#907454','wood');
function crownGeo(){const geo=new T.IcosahedronGeometry(1,2),p=geo.attributes.position;
 // Consistent displacement at shared vertices keeps the dense leaf masses watertight.
 const colors=[];for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const f=Math.sin(x*14.7+z*4)*Math.cos(y*12-z*6),v=1+.075*f+.024*Math.sin(z*27+x*13);
 p.setXYZ(i,x*v,y*v,z*v);const tint=.91+.085*y+.05*f;colors.push(tint,tint*1.008,tint*.967);}
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;}
const crown=crownGeo(),leafMats=['#879d67','#98ab76','#a2af79','#7b956a','#93a971','#829b68'].map(c=>{const m=mat(c,'leaf').clone();m.vertexColors=true;return m;});
const liveCrowns=[];
function tree(g,x,z,size,style=0,live=false){
 let tr=group(g,x,0,z);tr.scale.setScalar(size);
 if(style===1){stick(tr,[0,0,0],[0,2.91,0],.17,bark,.068);
 for(let i=0;i<5;i++){const b=mesh(tr,crown,leafMats[(i+3)%6],range(-.085,.085),1.49+i*.54,0);b.scale.set(.86-i*.105,.76,.84-i*.098);}return;}
 const lean=range(-.28,.28);stick(tr,[0,0,0],[lean,1.65,.02],.244,bark,.146);stick(tr,[lean,1.64,.02],[lean-.22,2.89,.07],.148,bark,.067);
 for(let i=0;i<8;i++){const a=i*2.39,dy=range(0,.77),r=range(.7,1.54),xx=lean+Math.cos(a)*r,zz=Math.sin(a)*r;
 stick(tr,[lean,1.09+dy*.84,0],[xx*.61,2.18+dy*.4,zz*.60],.10,bark,.073);
 stick(tr,[xx*.61,2.18+dy*.4,zz*.60],[xx,2.94+dy,zz],.077,bark,.029);
 const b=group(tr,xx,2.86+dy,zz);if(live){b.userData.live=true;liveCrowns.push({g:b,idx:liveCrowns.length%12});}
 const m=leafMats[(i+style)%6];for(let j=0;j<5;j++){
 let an=j*2.39,rad=j===0?0:range(.37,.61);let o=mesh(b,crown,m,Math.cos(an)*rad,range(.03,.47),Math.sin(an)*rad);o.scale.set(range(.66,.97),range(.49,.74),range(.64,.91));o.rotation.y=rnd()*PI;
 }if(live)batch(b);}
 const o=mesh(tr,crown,leafMats[2],lean-.15,3.92,0);o.scale.set(1.23,.79,1.14);
}
function fence(g,x1,z1,x2,z2){const len=Math.hypot(x2-x1,z2-z1),f=group(g,x1,0,z1);f.rotation.y=-Math.atan2(z2-z1,x2-x1);
 for(let i=0;i<2;i++)box(f,len/2,.34+i*.49,-.053,len,.084,.082,'#c0c4a8');
 const n=Math.ceil(len/.364);
 for(let i=0;i<n;i++){const x=i*len/n,h=.99+(i%4===0?.076:0),w=.176;
 box(f,x,h/2,0,w,h,.092,'#e3e1c8',true);profile(f,[[-w/2,0],[0,.105],[w/2,0]],.094,'#e3e1c8',x,h,-.046,0);}
}
function bush(g,x,z,r){for(let i=0;i<6;i++){let a=i*2.4;let o=mesh(g,crown,leafMats[(i+3)%6],x+Math.cos(a)*r*.44,r*.42+range(-.06,.16),z+Math.sin(a)*r*.4);o.scale.set(r*.66,r*range(.49,.75),r*.64);}}
function grass(g,x,z,sz){for(let i=0;i<3;i++){const a=i*2.39;const b=mesh(g,geos.blade||(geos.blade=new T.ConeGeometry(1,1,3)),mat(lawnColors[i]),x+.06*Math.cos(a),.098*sz,z+.06*Math.sin(a));b.scale.set(.031*sz,.213*sz,.046*sz);b.rotation.z=Math.cos(a)*.39;b.rotation.x=Math.sin(a)*.39;}}
function stone(g,x,z,s){const b=ball(g,x,.044*s,z,.24*s,.14*s,.19*s,pick(['#bfb79b','#adae93','#c6bba2']),true);b.rotation.y=rnd()*PI;}
function clouds(g){for(let i=0;i<15;i++){let a=i*.42+.1,dist=range(36,57),x=dist*Math.cos(a),z=dist*Math.sin(a),y=range(6.8,13.5);for(let j=0;j<6;j++){
 let c=ball(g,x+(j-2.5)*1.14,y+range(-.12,.49),z+range(-.73,.73),range(1.4,2.47),range(.56,1.26),range(.98,1.77),'#fcf4e2');c.castShadow=false;}}}
function hills(g){const pal=['#94ac9a','#a2b7a3','#b1bfa9','#92a99a'];for(let i=0;i<30;i++){const a=i*.209;const r=range(32,48);const o=ball(g,Math.cos(a)*r,-.73,Math.sin(a)*r,range(7,14),range(2.5,5.4),range(7,12),pal[i%4],true);o.castShadow=false;}}
function yard(scene){
 const g=group(scene);ground(g,'#9cae77',130,130,-.055);
 const yardMat=mat('#ffffff').clone();yardMat.map=landscapeTex('gravel','#cfbf9f');
 const road=[[-18,-2.55],[-8,-2.65],[-6.6,-3.30],[-3.6,-3.62],[1.2,-3.64],[3.5,-3.13],[5.1,-2.1],[5.9,-.4],[5.95,1.65],[5.42,3.07],[4.1,4.21],[1.7,4.84],[-.94,4.96],[-3.22,4.45],[-4.98,3.33],[-6.05,1.61],[-7,.43],[-18,.23]];
 horizontalPolygon(g,road,-.009,yardMat);
 for(let i=1;i<road.length-1;i++){const p=road[i],q=road[i+1],len=Math.hypot(p[0]-q[0],p[1]-q[1]);if(len>5)continue;const n=Math.ceil(len/.43);
 for(let k=0;k<n;k++){let f=(k+.5)/n,x=p[0]+(q[0]-p[0])*f,z=p[1]+(q[1]-p[1])*f;const o=box(g,x,.025,z,len/n-.022,range(.078,.121),range(.185,.25),pick(['#b7ae93','#c0b399','#bbb099','#c8bca0']),true);o.rotation.y=-Math.atan2(q[1]-p[1],q[0]-p[0]);}}
 for(let i=0;i<370;i++){let x=range(-6,5.2),z=range(-3.,4.2);if((x/5.8)**2+(z/4.55)**2>1)continue;let a=range(.013,.042);let b=ball(g,x,.003,z,a,.009,a*.69,pick(['#baad92','#ded0b2','#c1b398','#cec3a8']),true);b.castShadow=false;}
 house(g);fence(g,-2.36,-4.41,7.9,-4.41);fence(g,8.3,-4.41,15.5,-5.2);fence(g,-10,-3.4,-9.9,4);
 tree(g,6.4,-3.64,1.42,2,true);tree(g,-9.3,-1.23,1.32,0,true);tree(g,1.61,-8.3,.88,0);tree(g,-.82,-10.5,.74,1);
 for(let i=0;i<30;i++){let x=range(-27,27),z=range(-24,-11);tree(g,x,z,range(.73,1.62),i%5===0?0:1);}
 for(let i=0;i<9;i++)bush(g,-2.3+i*1.39,-4.05,range(.41,.72));
 for(let i=0;i<150;i++){const a=rnd()*2*PI,r=range(1.03,1.43),x=Math.cos(a)*6.16*r,z=Math.sin(a)*4.60*r;if(z<-.3&&x<-5.6)continue;grass(g,x,z,range(.63,1.53));if(i%3===0)daisy(g,x,z,range(.7,1.27));if(i%11===0)stone(g,x+.14,z+.07,range(.42,.81));}
 for(let j=0;j<4;j++){let x=3.5+j*.43,z=4.4-j*.17;bush(g,x,z,.31);for(let i=0;i<6;i++)daisy(g,x+range(-.28,.28),z+range(-.13,.34),range(.80,1.15),i%3?'#f5e8c6':'#e1ad72');}
 hills(g);clouds(g);batch(g);return g;
}
function waterSurface(g,x,z,w,d){
 const geo=new T.PlaneGeometry(w,d,40,36);geo.rotateX(-PI/2);const m=mat('#7daca8','water').clone();
 let o=mesh(g,geo,m,x,-.12,z);o.castShadow=false;o.userData.live=true;
 const streaks=[];for(let i=0;i<65;i++){const p=ball(g,x+range(-w*.49,w*.49),-.10,z+range(-d*.49,d*.49),range(.09,.46),.007,range(.014,.039),i%4?'#a8c7b9':'#cee0cd');p.userData.live=true;p.castShadow=false;streaks.push(p);}
 return {o,streaks,w,d,x,z};
}
function updateWater(w,s){
 const p=w.o.geometry.attributes.position;
 function level(x,z){let u=Math.max(0,Math.min(6.999,x*7)),v=Math.max(0,Math.min(4.999,z*5));const i=Math.floor(u)+8*Math.floor(v);u%=1;v%=1;const q=s.waves;return (1-v)*((1-u)*q[i].x+u*q[i+1].x)+v*((1-u)*q[i+8].x+u*q[i+9].x);}
 for(let i=0;i<p.count;i++)p.setY(i,level(p.getX(i)/w.w+.5,p.getZ(i)/w.d+.5)*2.1);
 p.needsUpdate=true;w.o.geometry.computeVertexNormals();
 for(let i=0;i<w.streaks.length;i++){const a=w.streaks[i],v=level((a.position.x-w.x)/w.w+.5,(a.position.z-w.z)/w.d+.5);a.position.y=-.108+v*2.1;a.rotation.y=s.air[i%12].u*.091;}
}
function river(scene){const g=group(scene);hills(g);clouds(g);
 const water=waterSurface(g,0,-5,9.3,83);
 for(let side of [-1,1]){ground(g,'#99ad7d',49,80,-.035,side*27.6,-7);box(g,side*3.71,-.17,-2,.85,.51,53,'#abac89',true);
 for(let i=0;i<27;i++){const z=-22+i*1.13;stone(g,side*range(2.93,3.68),z,range(1.0,2.9));if(i%2===0)grass(g,side*3.66,z,1.6);}
 box(g,side*11.05,.18,-1.75,15.87,.42,3.27,'#bea887',true);
 for(let i=0;i<12;i++)tree(g,side*range(4.3,18),range(-23,-5),range(.62,1.18),i%4?1:0);}
 const leaves=[];
 for(let side of [-1,1]){const a=group(g,side*3.14,.41,-1.75);a.userData.live=true;leaves.push(a);
 for(let j=0;j<10;j++)box(a,-side*(.165+j*.312),0,0,.303,.113,3.02,j%3?C.oak:C.honey,true);
 for(let z of [-1.36,1.36]){box(a,-side*1.56,-.125,z,3.12,.18,.147,C.teal,true);for(let k of [.13,1.5,2.94])box(a,-side*k,.32,z,.064,.62,.064,C.teal,true);box(a,-side*1.55,.638,z,3.0,.055,.074,C.teal,true);}
 batch(a);}
 const gear=group(g,3.55,1.09,.49);gear.userData.live=true;box(g,3.55,.46,.43,.26,.97,.30,C.teal,true);
 ring(gear,0,0,0,.43,.058,C.orange);for(let i=0;i<4;i++){let a=i*PI/2;stick(gear,[0,0,0],[Math.cos(a)*.425,Math.sin(a)*.425,0],.035,C.metal);}
 ball(gear,0,0,.01,.103,.103,.07,C.oak);stick(gear,[.39,0,.03],[.39,0,.23],.047,C.wood);batch(gear);batch(g);
 return {g,water,leaves,gear};}
function sailboat(g,x,z){
 const boat=group(g,x,-.13,z);boat.userData.live=true;
 const sides=[[ -1.14,0,-.014],[-.79,.29,.01],[.61,.34,.016],[1.12,0,.11],[.61,-.34,.016],[-.79,-.29,.01]];
 const vertices=[];for(let i=0;i<6;i++){const a=sides[i],b=sides[(i+1)%6];const v=p=>[p[0],.34+p[2],p[1]],bottom=p=>[p[0]*.78,.042,p[1]*.63];vertices.push(...v(a),...bottom(a),...bottom(b),...bottom(b),...v(b),...v(a));stick(boat,v(a),v(b),.031,C.honey);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();let hull=mat('#386c70').clone();hull.side=T.DoubleSide;mesh(boat,geo,hull);
 box(boat,0,.30,0,1.58,.07,.53,C.oak,true);stick(boat,[-.17,.32,0],[-.17,2.25,0],.031,C.wood,.02);
 const sail=group(boat,-.17,.55,0);sail.userData.live=true;
 const canvas=mat('#f0cf91').clone();canvas.side=T.DoubleSide;
 const cloth=profile(sail,[[0,0],[.878,.084],[.079,1.58]],.012,canvas,0,0,0,.004);
 profile(sail,[[-.055,.11],[-.743,.142],[-.06,1.41]],.012,'#eee5cb',0,0,0,0);
 profile(sail,[[.041,.32],[.697,.39],[.58,.63],[.05,.571]],.014,'#cd895b',0,0,.018,0);
 stick(sail,[-.07,.02,0],[.90,.075,0],.02,C.wood);
 path(boat,[[-1.04,.38,0],[-.17,2.20,0],[.99,.43,0]],.008,'#a99574');
 batch(boat);return {boat,sail,cloth};
}
function room(scene){const g=group(scene);
 const water=waterSurface(g,0,-20,53,33);
 hills(g);clouds(g);
 // The open water and lighthouse sit physically behind the window.
 const island=ball(g,1.42,-.54,-13,4.16,.91,1.74,'#95a57d',true);
 cyl(g,1.59,1.72,-13,.54,2.93,'#ede3ce',.37,28);cyl(g,1.59,2.18,-13,.445,.54,'#bd7766',.419);
 cyl(g,1.59,3.18,-13,.52,.14,'#798a82');cyl(g,1.59,3.47,-13,.32,.50,C.glass);cyl(g,1.59,3.85,-13,.56,.36,'#ac715e',.05);
 for(let i=0;i<4;i++)tree(g,-3.7-i*.66,-16.2,range(.42,.60),1);
 box(g,0,-.158,0,10.7,.26,6.90,C.wood,true);
 for(let j=0;j<20;j++){const z=-3.22+j*.34;for(let i=0;i<4;i++){let st=-5.35+(i-1)*4.13+(j%3)*1.03,en=st+4.11;st=Math.max(-5.35,st);en=Math.min(5.35,en);if(en>st)box(g,(st+en)/2,-.034,z,en-st,.065,.33,[C.oak,C.honey,mat('#c69868','wood')][(i+j)%3],true);}}
 const wallMat=mat('#d2d5be');function wall(x,y,w,h){box(g,x,y,-3.02,w,h,.24,wallMat);
 for(let u=x-w/2+.11;u<x+w/2;u+=.225)box(g,u,y,-2.892,.014,h,.013,'#c3c9b4');}
 wall(-3.69,2.32,3.35,4.64);wall(4.06,2.32,2.58,4.64);wall(.375,.62,4.79,1.24);wall(.375,4.31,4.79,.66);
 box(g,0,.145,-2.84,10.7,.29,.12,C.cream,true);
 for(let x of [-2.05,2.81])box(g,x,2.61,-2.845,.16,2.98,.259,C.cream,true);
 for(let y of [1.21,4.015])box(g,.38,y,-2.83,5.03,.145,.32,C.cream,true);
 box(g,.38,1.15,-2.72,5.16,.136,.53,C.honey,true);
 box(g,.38,2.60,-3.01,.081,2.72,.112,C.white,true);
 const shutters=[];for(const sg of [-1,1]){
 const sh=group(g,.38+sg*2.34,1.27,-2.78);sh.userData.live=true;shutters.push(sh);
 const xx=-sg*1.154;for(let k=0;k<13;k++){const sl=box(sh,xx,.105+k*.207,.012,2.24,.166,.067,'#83a9a0',true);sl.rotation.x=-.29;}
 for(let x of [-sg*.06,-sg*2.25])box(sh,x,1.345,.0,.122,2.69,.109,C.teal,true);
 for(let y of [.078,2.60])box(sh,xx,y,.05,2.33,.132,.11,C.teal,true);
 ball(sh,-sg*2.17,1.22,.108,.061,.061,.088,'#c7a16c');
 batch(sh);}
 // Woven rug, its concentric borders modelled as threads.
 const rug=group(g,.08,.011,.28);const oval=cyl(rug,0,0,0,1,.023,'#94b4a8',1,64);oval.scale.x*=2.42;oval.scale.z*=1.32;
 for(let i=0;i<4;i++){let r=ring(rug,0,.016+i*.0005,0,1,.009,i%2?'#d1cfab':'#688e86',72);r.rotation.x=PI/2;r.scale.set(2.37-i*.087,1.27-i*.05,1);}
 const cart=group(g,-3.65,0,1.60);for(let x of [-.44,.44])for(let z of [-.31,.31]){const wh=cyl(cart,x,.094,z,.09,.076,C.dark);wh.rotation.x=PI/2;}
 box(cart,0,.201,0,1.23,.07,.96,C.honey,true);for(let z of [-.38,.38])stick(cart,[-.54,.24,z],[-.75,.98,z],.031,C.teal);stick(cart,[-.75,.98,-.38],[-.75,.98,.38],.033,C.teal);
 const boat=sailboat(g,-1.94,-7.9);batch(g);
 return {g,water,shutters,...boat};}
