'use strict';
const wall=mat(0xf5ead6,.89,0,grainTex),chalk=mat(0xfff5df,.77),stone=mat(0xc4b9a0,.84,0,grainTex),slate=mat(0x748083,.81),clay=mat(0xb57559,.89,0,grainTex),teal=mat(0x608f88,.62,0,woodTex),deepTeal=mat(0x486d69,.66,0,woodTex),wood=mat(0xa78057,.76,0,woodTex),railWood=mat(0xd7b994,.74,0,woodTex),glass=mat(0x749799,.17,.46),darkGlass=mat(0x54747a,.19,.45),ochre=mat(0xd4a143,.74),ivory=mat(0xf5e1bc,.84),soil=mat(0x665944,.95),grass=mat(0x98a878,.97,0,grainTex);
const leafM=[0x657f54,0x819655,0x96ad68,0x526f50,0xb3bc72].map(c=>mat(c,.81)),petalM=[0xffedc6,0xe0a16c,0xfff4db].map(c=>mat(c,.73));
const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.45,.37,0,-.36,.72,.12,0,1,.16,.36,.72,.12,.45,.37,0,0,.5,.19],3));leafGeo.setIndex([0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6,6,1,0,6,2,1,6,3,2,6,4,3,6,5,4,6,0,5]);leafGeo.computeVertexNormals();
// Creased two-sided leaf with separated face normals.
const leafBlade=leafGeo.toNonIndexed();leafBlade.computeVertexNormals();
function blade(p,x,y,z,w,l,a,b,m){const o=mesh(p,leafBlade,m,x,y,z);o.scale.set(w,l,w);o.rotation.set(a,b,0,'YXZ');return o}
function flowers(p,x,y,z,size,count){
 for(let i=0;i<count;i++){
  const a=rand()*6.283,rad=Math.sqrt(rand())*size*.57,dx=Math.cos(a)*rad,dz=Math.sin(a)*rad,h=size*(.65+.65*rand());
  rod(p,[x+dx*.6,y,z+dz*.6],[x+dx,y+h,z+dz],size*.009,leafM[0],5);
  blade(p,x+dx*.8,y+h*.4,z+dz*.8,size*.11,size*.39,.95,a,leafM[i%4]);blade(p,x+dx*.92,y+h*.65,z+dz*.92,size*.09,size*.32,1.1,a+2,leafM[(i+1)%4]);
  const bloom=group(p);bloom.position.set(x+dx,y+h,z+dz);bloom.rotation.set(.3+rand()*.72,a,0,'YXZ');
  for(let j=0;j<8;j++){const t=j*Math.PI/4;const o=orb(bloom,Math.sin(t)*size*.066,.004,Math.cos(t)*size*.066,size*.033,size*.018,size*.064,petalM[i%3]);o.rotation.y=t;}
  orb(bloom,0,.012,0,size*.036,size*.026,size*.036,ochre);
 }
}
function pot(p,x,y,z,r,h,m=clay){cylinder(p,x,y+h*.47,z,r*.94,r*.68,h*.94,m,24);cylinder(p,x,y+h*.92,z,r,r*.98,h*.14,m,24);cylinder(p,x,y+h*.995,z,r*.86,r*.86,.004,soil,24);}
function windowBox(p,x,y,z,w,h,shutters){
 box(p,x,y,z,w+.12,h+.14,.09,chalk);box(p,x,y,z+.062,w,h,.05,darkGlass);
 for(let k=0;k<4;k++)box(p,x+(k%2-.5)*w*.46,y+(Math.floor(k/2)-.5)*h*.47,z+.094,w*.42,h*.43,.009,k%3?glass:darkGlass);
 box(p,x,y,z+.108,.04,h,.035,ivory);box(p,x,y,z+.108,w,.041,.035,ivory);box(p,x,y-h*.54,z+.091,w+.19,.075,.20,stone);
 if(shutters)for(let n of [-1,1]){const sx=x+n*(w*.68+.067);box(p,sx,y,z+.035,w*.31,h+.08,.062,teal);for(let i=0;i<8;i++)box(p,sx,y-h*.43+i*h*.122,z+.076,w*.25,.037,.025,deepTeal).rotation.x=-.20;}
}
function roof(p,w,d,eave,rise,m){
 const g=new T.BufferGeometry(),z=d/2+.18,a=w/2+.24;
 const pts=[-a,eave,z,a,eave,z,0,eave+rise,z, a,eave,-z,-a,eave,-z,0,eave+rise,-z];
 g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setIndex([0,1,2,3,4,5,0,2,5,0,5,4,1,3,5,1,5,2]);g.computeVertexNormals();mesh(p,g,wall);
 for(const n of [-1,1]){const o=box(p,n*a*.5,eave+rise*.5,0,Math.hypot(a,rise)+.14,.12,2*z,m);o.rotation.z=-n*Math.atan2(rise,a);
  rod(p,[n*a,eave-.028,-z],[n*a,eave-.028,z],.057,deepTeal);
  for(let j=0;j<5;j++){const f=j/5;box(p,n*a*(1-f),eave+rise*f+.065,0,.07,.045,2*z,m);}
 }
 box(p,0,eave+rise+.077,0,.16,.13,d+.44,m);
 box(p,-w*.27,eave+rise*.7+.3,-d*.18,.35,.91,.4,wall);box(p,-w*.27,eave+rise*.7+.76,-d*.18,.44,.12,.49,clay);
}
function homeHouse(scene){
 const p=group(scene);p.position.set(-2.56,0,-4.9);
 const w=4.04,h=2.7,d=2.5,f=d/2;
 box(p,0,h/2,0,w,h,d,wall);box(p,0,.11,f+.02,w,.22,.11,stone);roof(p,w,d,h,1.0,slate);
 for(const x of [-w*.49,w*.49])box(p,x,1.37,f+.045,.085,2.7,.09,chalk);
 const door=-.63;
 box(p,door,.95,f+.06,.99,1.91,.115,chalk);box(p,door,.91,f+.125,.855,1.82,.07,deepTeal);
 box(p,door,1.27,f+.171,.63,.82,.035,glass);
 for(let i=0;i<3;i++)box(p,door-.32+i*.32,1.27,f+.201,.032,.84,.025,teal);
 box(p,door,1.26,f+.201,.65,.032,.025,teal);
 for(let i=0;i<2;i++)box(p,door+(i-.5)*.35,.49,f+.185,.29,.52,.029,teal);
 orb(p,door+.316,.86,f+.217,.034,.037,.032,brass);
 box(p,door,.044,f+.30,1.23,.082,.54,stone);box(p,door,.1,f+.213,1.05,.064,.39,chalk);
 windowBox(p,.91,1.20,f+.025,1.14,.97,false);
 box(p,.91,.64,f+.18,1.25,.19,.27,teal);for(let i=0;i<10;i++){const x=.37+i*.115;for(let j=0;j<7;j++)blade(p,x,.72,f+.17,.075,.17+rand()*.09,.2+rand()*1.7,rand()*6.28,leafM[j%5]);}
 flowers(p,.9,.71,f+.19,.24,10);
 // Striped canvas with a pitched top, stitched seams and rounded scalloped valance.
 const aw=1.66,ac=1.03,y=1.78;
 for(let j=0;j<11;j++){const x=ac-aw/2+(j+.5)*aw/11,m=j%2?ivory:ochre;
  const strip=box(p,x,y-.075,f+.31,aw/11+.001,.034,.68,m);strip.rotation.x=.23;
  box(p,x,y-.207,f+.638,aw/11,.12,.024,m);
  orb(p,x,y-.264,f+.639,aw/22,.043,.014,m);
 }
 for(const n of [-1,1])rod(p,[ac+n*.78,y-.52,f+.06],[ac+n*.78,y-.16,f+.61],.014,brass);
 // Wall lantern, downpipe and rain shoe.
 box(p,-.018,1.65,f+.105,.13,.2,.10,deepTeal);
 rod(p,[-.018,1.7,f+.12],[-.018,1.7,f+.29],.013,black);box(p,-.018,1.54,f+.26,.12,.2,.12,mat(0xf2d9a1,.23,.25));
 for(let n of [-1,1])for(let k of [-1,1])rod(p,[-.018+n*.061,1.435,f+.26+k*.061],[-.018+n*.065,1.64,f+.26+k*.065],.007,black,7);
 cylinder(p,-.018,1.66,f+.26,.029,.112,.075,deepTeal,4).rotation.y=Math.PI/4;
 rod(p,[1.94,.17,f+.087],[1.94,2.69,f+.087],.031,teal);tube(p,[[1.94,.18,f+.087],[1.94,.085,f+.13],[1.94,.072,f+.22]],.031,teal);
 pot(p,1.66,0,f+.29,.157,.226);
 for(let j=0;j<33;j++)blade(p,1.66+(rand()-.5)*.15,.22,f+.29+(rand()-.5)*.14,.058+rand()*.07,.21+rand()*.23,rand()*1.4,rand()*6.28,leafM[j%5]);
 pot(p,1.30,0,f+.42,.105,.13);flowers(p,1.3,.13,f+.42,.21,9);
 bake(p);return p;
}
function cottage(scene,x,z,angle,variant){
 const p=group(scene),w=2.8+rand()*1.6,d=2.65,h=2.12+rand()*.75;
 p.position.set(x,x>21?-1.41:CycleWorld.ground(-z)-.03,z);p.rotation.y=angle;
 box(p,0,h/2,0,w,h,d,wall);box(p,0,.12,0,w+.045,.24,d+.05,stone);
 roof(p,w,d,h,.82+rand()*.53,[clay,slate,mat(0x849087,.81)][variant%3]);
 windowBox(p,w*.16,h*.53,d/2,1,.83,true);box(p,-w*.32,.81,d/2+.022,.66,1.62,.068,teal);box(p,-w*.32,1.17,d/2+.062,.44,.50,.022,glass);
 box(p,w*.501,h*.55,.05,.052,.94,.83,chalk);box(p,w*.513,h*.55,.05,.052,.82,.72,glass);
 box(p,w*.526,h*.55,.05,.056,.82,.032,chalk);
 bake(p);return p;
}
const crownM=[0x839b67,0x92a36c,0x758d60,0x849c72].map(c=>mat(c,.89,0,grainTex));
function tree(scene,x,z,size,near=false){
 const p=group(scene);p.position.set(x,bankHeight(x,-z)-.025,z);p.scale.setScalar(size);
 const bark=mat(0x897b61,.89,0,woodTex);
 rod(p,[0,0,0],[.04,.59,.015],.065,bark,10,.038);
 for(let i=0;i<7;i++){
  const a=i*2.399+rand()*.4,r=.17+rand()*.18,cx=Math.cos(a)*r,cz=Math.sin(a)*r,cy=.73+rand()*.26;
  rod(p,[.025,.39+i*.027,.01],[cx,cy,cz],.025,bark,8,.009);
  const leaf=orb(p,cx,cy,cz,.32+rand()*.07,.25+rand()*.12,.30+rand()*.08,crownM[i%4],true);leaf.rotation.set(rand(),rand(),rand());
  if(near)for(let j=0;j<48;j++){const b=rand()*6.28,v=rand()*2-1,r2=Math.sqrt(1-v*v);blade(p,cx+.32*r2*Math.cos(b),cy+.27*v,cz+.33*r2*Math.sin(b),.032+rand()*.035,.055+rand()*.067,.7+rand()*1.7,b,leafM[j%5]);}
 }bake(p);return p;
}
function fence(p,x,z1,z2,spacing,small=false){
 const h=small?.51:.74;
 for(let z=z1;z>z2;z-=spacing){
  const y=CycleWorld.ground(-z);box(p,x,y+h*.48,z,.065,h*.96,.089,ivory);const cap=cylinder(p,x,y+h,z,0,.066,.08,chalk,4);cap.rotation.y=Math.PI*.25;
 }
 for(let f of [.31,.75])rod(p,[x-.025,CycleWorld.ground(-z1)+h*f,z1],[x-.025,CycleWorld.ground(-z2)+h*f,z2],.029,ivory,4);
}
function roadRibbon(p,left,right,za,zb,m,offset=0){
 const pos=[],uv=[],idx=[],n=Math.ceil(Math.abs(zb-za)/1.5);
 for(let i=0;i<=n;i++){const d=za+(zb-za)*i/n,x=1.7+.55*Math.sin(d*.085)+2.65*CycleWorld.smooth((d-64)/10),h=CycleWorld.ground(d)+offset;
 pos.push(x+left,h,-d,x+right,h,-d);uv.push(0,d*.38,(right-left)*.32,d*.38);if(i<n){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(p,g,m);
}
function bankHeight(x,d){
 const inner=3.25+.55*Math.sin(d*.085)+2.65*CycleWorld.smooth((d-64)/10);
 const t=CycleWorld.smooth((x-inner)/(7.28-inner));
 return CycleWorld.ground(d)*(1-t)-1.54*t;
}
function groundWorks(scene){
 const p=group(scene),asphalt=mat(0xa5a59b,.9,0,roadTex),dirt=mat(0xcab28a,.93,0,roadTex);
 roadRibbon(p,-1.55,1.55,-30,41,asphalt,.003);roadRibbon(p,-1.55,1.55,41,75.5,dirt,.003);
 roadRibbon(p,-40,-1.55,-30,77,grass,-.023);const bankPos=[],bankUV=[],bankIdx=[];
 for(let k=0;k<=107;k++){const d=k-30,edge=3.25+.55*Math.sin(d*.085)+2.65*CycleWorld.smooth((d-64)/10);
   for(let i=0;i<6;i++){const x=edge+(7.28-edge)*i/5;bankPos.push(x,bankHeight(x,d)-.015,-d);bankUV.push(i*.32,d*.28);
   if(i<5&&k<107){const j=k*6+i;bankIdx.push(j,j+1,j+6,j+1,j+7,j+6);}}
 }
 const bankGeo=new T.BufferGeometry();bankGeo.setAttribute('position',new T.Float32BufferAttribute(bankPos,3));bankGeo.setAttribute('uv',new T.Float32BufferAttribute(bankUV,2));bankGeo.setIndex(bankIdx);bankGeo.computeVertexNormals();mesh(p,bankGeo,grass);
 roadRibbon(p,-1.73,-1.55,-30,38,stone,.012);roadRibbon(p,1.55,1.69,-30,38,stone,.012);
 // Porch pavers in running bond, individual natural stone tones and mortar joints.
 const stones=[0xd1bc99,0xdcc4a2,0xe6d2b3,0xcfb998,0xe1c8a7].map(c=>mat(c,.82,0,grainTex));
 box(p,-1.97,-.035,1.1,5.12,.07,7.9,stone);
 for(let row=0;row<23;row++)for(let col=0;col<9;col++){
  const w=.62,d=.353,x=-4.76+col*w+(row%2)*w*.5,z=-2.68+row*d;
  const R=Math.min(x+w/2,.563),L=Math.max(-4.54,x-w/2);if(R-L<.05)continue;
  box(p,(R+L)*.5,.002,z,R-L-.005,.008,d-.004,stones[Math.floor(rand()*5)]);
 }
 // The soil edge is irregular; aggregate thins gradually as the road leaves the village.
 for(let i=0;i<310;i++){const d=35+rand()*39,x=CycleWorld.route(d).x+(rand()-.5)*3.05;if(d<41&&rand()>(d-35)/6)continue;orb(p,x,CycleWorld.ground(d)+.006,-d,.012+rand()*.036,.005+rand()*.004,.014+rand()*.03,stones[i%5],true);}
 fence(p,3.65,-1.5,-9,.32,true);fence(p,-.78,-5,-14,.34);fence(p,-.71,-19,-24,.36,true);
 // Riprap at the water line, a return quay, and a gently rising path to the courtyard.
 for(let i=0;i<116;i++){const z=7-rand()*92;const y=bankHeight(6.97,-z);orb(p,6.97+rand()*.25,y-.07,z,.32,.12,.46+rand()*.43,stone,true);}
 
 for(let i=0;i<74;i++){const a=CycleWorld.homePath(i/74),b=CycleWorld.homePath((i+1)/74),delta=V(b.x-a.x,b.y-a.y,b.z-a.z);
  if(a.x<6.18)continue;
  const plank=box(p,(a.x+b.x)/2,(a.y+b.y)/2-.033,(a.z+b.z)/2,.84,.065,delta.length()*.983,railWood);
  plank.quaternion.setFromUnitVectors(V(0,0,1),delta.normalize());
  if(i%7===0)cylinder(p,a.x+.3,(a.y-1.65)/2,a.z,.041,.049,a.y+1.65,wood,9);
 }
 bake(p);
}
function makeLandscape(scene){
 groundWorks(scene);homeHouse(scene);
 for(let i=0;i<8;i++)cottage(scene,-2.85-(i%2)*.5,-7.2-i*7.55,.53+(i%3)*.22,i);
 for(const [x,z] of [[23.5,-12],[24.3,-31],[23.9,-48]])cottage(scene,x,z,-1.21,Math.floor(-z)%3);
 for(const [x,z,size,near] of [[-5.02,2.57,3.8,true],[-1.8,-5.5,3.2,true],[4.9,-5.7,3.9,true],[5.8,-21,3.8],[-2.4,-21.1,4.1],[5.3,-39,3.7],[-1.8,-37,3.3],[-1,-50,4.1],[5.7,-56,4],[-1.6,-63,4],[-1.7,-72,4],[4.9,3.7,3.1]])tree(scene,x,z,size,near);
 const p=group(scene);
 const hillM=[0xadbd9f,0x9aaf9e,0x879f8d].map(c=>mat(c,.95));
 for(let i=0;i<12;i++)orb(p,-90+i*17,-5,-113-(i%3)*8,20+rand()*11,9+rand()*8,16,hillM[i%3]);
 for(let i=0;i<11;i++)orb(p,35+i%2*6,-4,15-i*10,14+rand()*9,5+rand()*3,12,hillM[(i+1)%3]);
 box(p,44,-1.65,-35,47,.5,120,grass);
 for(let i=0;i<32;i++){const z=12-i*2.9,x=22+rand()*5,h=1.4+rand()*2.4;
  rod(p,[x,-1.42,z],[x,.8,z],.09,wood,8);orb(p,x,-1.4+h*.77,z,h*.52,h*.72,h*.54,crownM[i%4],true);}
 for(let j=0;j<4;j++)for(let i=0;i<7;i++){const az=[-32,-7,16,48][j];orb(p,az+i*1.18,10+j%2*2+rand()*1.1,-87-j*3,2+rand()*2,1+rand()*.8,2,mat(0xfff9e9,.96));}
 // Small tufts and buttercups along the curb leave the bicycle silhouette clear.
 for(let i=0;i<270;i++){const d=rand()*76,x=CycleWorld.route(d).x+(i%2?1:-1)*(1.61+rand()*1.22),y=bankHeight(x,d);
  for(let j=0;j<3;j++)blade(p,x+.028*j,y,-d,.019+rand()*.019,.07+rand()*.12,.25+rand()*.8,rand()*6.28,leafM[(i+j)%5]);
  if(i%7===0)orb(p,x,y+.11,-d,.025,.014,.022,ochre,true);
 }
 bake(p);
}
function riverObjects(scene){
 const waterMat=mat(0x74a89c,.21,.36);waterMat.envMapIntensity=1.12;
 const rows=186,cols=42,g=new T.PlaneGeometry(1,1,cols,rows);g.rotateX(-Math.PI/2);
 const attr=g.attributes.position,base=[],indexMap=[];
 for(let i=0;i<attr.count;i++){
   const x=attr.getX(i),z=attr.getZ(i);base.push([x,z]);
   attr.setXYZ(i,7.05+(x+.5)*18,CycleWorld.waterY,12+(z-.5)*110);
   const gx=(x+.5)*11,gy=(z+.5)*34,ix=Math.min(10,Math.floor(gx)),iy=Math.floor(gy)%8;
   indexMap.push([iy*12+ix,((iy+1)%8)*12+ix,gx-ix,gy-Math.floor(gy),.75+.25*Math.cos(gy*.68)]);
 }
 const water=mesh(scene,g,waterMat);water.castShadow=false;
 const estuary=box(scene,1,CycleWorld.waterY-.035,-100,95,.05,44,waterMat);estuary.castShadow=false;
 const dock=group(scene);dock.position.set(5.86,-.92,-74);
 for(let i=0;i<20;i++)box(dock,-1.81+i*.195,.055,0,.186,.11,1.35,railWood);
 for(const x of [-1.7,.1,1.75])for(const z of [-.61,.61]){cylinder(dock,x,-.22,z,.064,.072,.82,wood);cylinder(dock,x,.205,z,.072,.072,.045,brass);}
 const mill=group(scene);mill.position.set(7.38,-1.04,-74.7);
 for(const x of [-.50,.51]){box(mill,x,.27,0,.087,1.04,.12,wood);box(mill,x,.05,-.32,.087,.69,.1,wood);}
 rod(mill,[-.54,-.104,0],[.55,-.104,0],.041,brass);
 box(mill,0,.038,-.39,1.14,.075,.49,wood);
 for(const x of [-.56,.56])box(mill,x,.16,-.39,.043,.21,.57,teal);
 const wheel=group(scene);wheel.position.set(7.38,-1.144,-74.7);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;
   for(const x of [-.26,.26])rod(wheel,[x,0,0],[x,.54*Math.sin(a),.54*Math.cos(a)],.025,railWood,8);
   box(wheel,0,.53*Math.sin(a),.53*Math.cos(a),.59,.19,.045,teal).rotation.x=-a;
 }
 for(const x of [-.27,.27]){const ring=tor(wheel,x,0,0,.47,.024,wood);ring.rotation.y=Math.PI*.5;}
 bake(wheel);
 const gate=group(scene);gate.position.set(6.83,-.88,-74.37);box(gate,0,.1,0,.35,.34,.042,teal);
 rod(gate,[0,.22,0],[0,.5,0],.014,brass);rod(gate,[-.135,.5,0],[.135,.5,0],.027,red,20);bake(gate);
 const hull=group(scene),body=group(hull);
 // Shallow pram ferry, flared sheer, planked deck, cleats and a gaff sail.
 const stations=[[-1.25,.20],[-1.04,.46],[-.55,.56],[.47,.56],[.98,.43],[1.27,.12]];
 const hp=[],hi=[];
 stations.forEach(([z,w],i)=>{hp.push(-w,.28,z,-w*.69,.018,z,w*.69,.018,z,w,.28,z);
   if(i)for(let j=0;j<3;j++){const a=(i-1)*4+j;hi.push(a,a+1,a+5,a,a+5,a+4);}});
 const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hp,3));hg.setIndex(hi);hg.computeVertexNormals();const hullPaint=mat(0x547f83,.37,.16);hullPaint.side=T.DoubleSide;mesh(body,hg,hullPaint);
 for(let i=0;i<24;i++){const z=-1.21+i*.105;let k=0;while(k<stations.length-2&&z>stations[k+1][0])k++;const [z0,w0]=stations[k],[z1,w1]=stations[k+1],w=w0+(w1-w0)*(z-z0)/(z1-z0);
 box(body,0,.245,z,w*1.95,.053,.102,railWood);}
 for(const n of [-1,1])tube(body,stations.map(([z,w])=>[n*w,.29,z]),.026,ivory,32);
 box(body,0,.17,-1.25,.39,.2,.065,hullPaint);box(body,0,.17,1.255,.24,.2,.065,hullPaint);
 for(const z of [-.91,.86])box(body,0,.36,z,.85,.044,.17,wood);
 rod(body,[-.28,.27,.31],[-.28,1.94,.31],.028,wood,16,.018);
 for(const z of [-.98,1.07])rod(body,[-.28,1.81,.31],[0,.3,z],.0048,ivory,5);
 const halyard=group(hull);halyard.position.set(-.25,.56,.37);orb(halyard,0,0,0,.037,.067,.037,red);tor(halyard,0,-.066,0,.052,.013,brass,24);bake(halyard);
 bake(body);bake(dock);bake(mill);
 const sailGeo=new T.BufferGeometry(),positions=new Float32Array(9*5*3),colors=[],ids=[];
 for(let j=0;j<9;j++){for(let k=0;k<5;k++){const c=new T.Color(j===2||j===3?0xdfb065:0xffe9c5);colors.push(c.r,c.g,c.b);
 if(j<8&&k<4){const a=j*5+k;ids.push(a,a+1,a+5,a+1,a+6,a+5);}}}
 sailGeo.setAttribute('position',new T.BufferAttribute(positions,3));sailGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));sailGeo.setIndex(ids);
 const sailMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.82,roughnessMap:roughTex,side:T.DoubleSide,vertexColors:true});const sail=mesh(hull,sailGeo,sailMat);sail.frustumCulled=false;
 // A counterweighted pedestrian bridge spans the ferry channel.
 const bridge=group(scene),leaves=[],walkY=-.18,bz=-39.38;
 for(const n of [-1,1]){
   const hinge=n<0?6.68:9.92,part=group(scene);part.position.set(hinge,walkY,bz);
   for(let i=0;i<10;i++)box(part,-n*(i+.5)*.162,.02,0,.155,.09,.91,railWood);
   for(const z of [-.40,.40]){
     box(part,-n*.79,-.059,z,1.73,.125,.063,deepTeal);
     for(const x of [.04,.81,1.56])box(part,-n*x,.285,z,.046,.54,.046,teal);
     box(part,-n*.80,.567,z,1.61,.055,.055,teal);
   }
   box(part,n*.23,-.042,0,.37,.20,.77,stone);
   rod(bridge,[hinge,walkY,bz-.54],[hinge,walkY,bz+.54],.081,brass);
   for(const zz of [-.41,.41])cylinder(bridge,hinge,-.86,bz+zz,.093,.112,1.42,wood);
   bake(part);leaves.push(part);
 }
 for(const [a,b] of [[5.68,6.64],[9.95,22.84]]){
   box(bridge,(a+b)/2,walkY,bz,b-a,.12,.92,railWood);
   for(const zz of [-.42,.42]){
     box(bridge,(a+b)/2,walkY+.55,bz+zz,b-a,.065,.065,teal);
     for(let x=a;x<b;x+=1.2){box(bridge,x,walkY+.27,bz+zz,.054,.56,.053,teal);if((x-a)%3<1.20)cylinder(bridge,x,-.92,bz+zz,.073,.10,1.62,wood);}
   }
 }
 const crankStand=group(bridge);crankStand.position.set(7.60,-.84,-42.10);
 box(crankStand,0,-.48,.11,.14,1.35,.18,wood);rod(crankStand,[0,0,-.03],[0,0,.23],.055,brass);
 tube(bridge,[[7.60,-.84,-42.00],[7.13,-.63,-41.32],[6.68,-.21,bz]],.013,black);
 const drum=group(scene);drum.position.set(7.60,-.84,-42.16);
 tor(drum,0,0,0,.172,.019,red,48);
 for(let j=0;j<5;j++){const a=j*Math.PI*2/5;rod(drum,[0,0,.004],[.168*Math.cos(a),.168*Math.sin(a),.004],.009,brass); }
 rod(drum,[.141,.058,-.005],[.141,.058,-.079],.022,leather);
 bake(drum);bake(bridge);
 // Local discharge propagates down the lip before entering the tailwater.
 const jetGeo=new T.BufferGeometry(),jetPos=new Float32Array(8*6),jetIndex=[];
 for(let j=0;j<7;j++){const n=j*2;jetIndex.push(n,n+1,n+2,n+1,n+3,n+2);}
 jetGeo.setAttribute('position',new T.BufferAttribute(jetPos,3));jetGeo.setIndex(jetIndex);
 const jetMat=mat(0xaccdc1,.16,.18);jetMat.side=T.DoubleSide;
 const stream=mesh(scene,jetGeo,jetMat);stream.frustumCulled=false;
 const glints=group(scene),glintMat=mat(0xc4d9b9,.19,.25);
 for(let i=0;i<68;i++)orb(glints,7.3+rand()*14,CycleWorld.waterY,-85+rand()*95,.045+rand()*.16,.002,.011+rand()*.026,glintMat,true);
 return {water,wheel,gate,hull,halyard,drum,update(s){
   for(let j=0;j<8;j++){
     const u=j/7,flux=s.jet[j],w=.012+Math.sqrt(flux)*.112/(1+u*.8);
     const z=-75.08+u*(.21+flux*.28),y=-1.005-.44*u*u;
     jetPos.set([7.38-w,y,z,7.38+w,y+.003*s.wind[j].angle,z+.012*u],j*6);
   }
   jetGeo.attributes.position.needsUpdate=true;jetGeo.computeVertexNormals();
   leaves.forEach((o,i)=>o.rotation.z=(i?-1:1)*s.leaves[i].angle);drum.rotation.z=s.drum;
   for(let i=0;i<attr.count;i++){const [a,b,u,v,scale]=indexMap[i],w=s.water;
     const h=(1-v)*(w[a].h*(1-u)+w[a+1].h*u)+v*(w[b].h*(1-u)+w[b+1].h*u);
     const [x,z]=base[i];attr.setY(i,CycleWorld.waterY+h*scale+.011*Math.sin(x*82+z*212+s.wind[a%9].angle*8)*Math.cos(z*92+s.water[b].v*54));}
   attr.needsUpdate=true;g.computeVertexNormals();wheel.rotation.x=-s.wheel;gate.position.y=-.88+.31*s.gate;
   hull.position.set(8.29+.16*Math.sin(s.boat*Math.PI*2),CycleWorld.waterY+s.heave,-74+74*s.boat);hull.rotation.z=s.water[43].h*.65+s.wind[6].angle*.026;
   halyard.position.y=.57+.46*s.sail;
   for(let j=0;j<9;j++)for(let k=0;k<5;k++){const u=k/4,v=j/8,i=(j*5+k)*3;
    positions[i]=-.28+(.16+s.cloth[Math.min(7,j)].bow*1.8)*Math.sin(Math.PI*u)*(1-v);
    positions[i+1]=.59+v*(.079+s.sail*1.19)+u*.043;
    positions[i+2]=.31-u*(1-.95*v)*.96;
   }sailGeo.attributes.position.needsUpdate=true;sailGeo.computeVertexNormals();
   glints.children.forEach((o,i)=>{const c=s.water[(i*7)%96];o.position.y=CycleWorld.waterY+.007+c.h;o.scale.x=(.065+(i%5)*.034)*(1+Math.min(.8,Math.abs(c.v)*41));});
 }};
}
function makeBreeze(scene){
 const sprigs=[],motes=[],echoChimes=[];
 for(let i=0;i<9;i++){const stalk=group(scene),x=i<3?-.91-i*.15:3.5+(i%2)*.5,z=i<3?-.61-i*.11:-5-i*6;
 stalk.position.set(x,CycleWorld.ground(-z),z);const h=i<3?.175:.46;
 tube(stalk,[[0,0,0],[.012,h*.45,0],[.023,h,.008]],.003,leafM[0],8,5);
 for(let j=0;j<5;j++)blade(stalk,.018,h*(.23+j*.135),0,.027,h*.46,.95,j*2.3,leafM[(i+j)%5]);
 bake(stalk);sprigs.push(stalk);}
 const dustMat=mat(0xe2ce9b,.66);for(let i=0;i<14;i++)motes.push(orb(scene,0,0,0,.0016,.002,.0016,dustMat,true));
 for(let i=0;i<6;i++){const root=group(scene),d=5+i*5.5,rx=CycleWorld.route(d).x-1.69;
 root.position.set(rx,CycleWorld.ground(d)+.76,-d);const post=group(scene);rod(post,[rx,CycleWorld.ground(d),-d],[rx,CycleWorld.ground(d)+.76,-d],.017,wood);bake(post);
 for(let j=0;j<4;j++){const bladeRoot=group(root);bladeRoot.rotation.z=j*Math.PI/2;const b=box(bladeRoot,.043,.052,0,.068,.115,.012,j%2?ochre:ivory);b.rotation.set(.24,0,-.48);}
 orb(root,0,0,.01,.019,.019,.012,brass);bake(root);echoChimes.push(root);}
 return {update(s,anchor){
 sprigs.forEach((o,i)=>{o.rotation.z=s.wind[i].angle*(i%2?1:-1);o.rotation.x=s.wind[i].v*.09;});
 motes.forEach((o,i)=>{const d=s.dust[i];o.position.set(anchor.x-.86+(i%5)*.34+d.x,anchor.y+.12+d.y+i*.027,anchor.z-.4+(i%4)*.16+d.z);});
 echoChimes.forEach((o,i)=>{o.rotation.z=s.wind[i].angle*1.7+s.echoes[i]*4;});
 }};
}
