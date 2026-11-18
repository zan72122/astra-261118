function buildPark(k){
'use strict';
const {T,R,S,sim,scene,cam,V,vec,rand,mat,wood,mesh,group,obj,box,sphere,bar,cube,ball,rod,batch,up,sun,skyLight}=k;
const rgb=c=>new T.Color(c), range=(a,b)=>a+(b-a)*rand(),clamp=R.clamp;
const oak=wood(0xb28a57),lightOak=wood(0xcdab78),darkOak=wood(0x886642),beamOak=wood(0xa57a4e);
const iron=mat(0x43555a,.37,.67),silver=mat(0xd0d0b6,.26,.84),brass=mat(0xe2b75b,.33,.68),cream=mat(0xf2dfad,.56);
const red=mat(0xb94b36,.41,.12),teal=mat(0x397e7e,.47,.18),yellow=mat(0xe8b748,.43,.17);
const all=batch(),rock=new T.IcosahedronGeometry(1,1),cone=new T.ConeGeometry(1,1,10);
const skyUniform={value:0},skyMat=mat(0xffffff,1,0,{side:T.BackSide,fog:false,depthWrite:false});
skyMat.onBeforeCompile=sh=>{
 sh.uniforms.heat=skyUniform;sh.vertexShader='varying vec3 domeDir;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n domeDir=position;');
 sh.fragmentShader='varying vec3 domeDir;uniform float heat;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',`
 vec3 dir=normalize(domeDir);float el=max(0.,dir.y);
 vec3 horizon=mix(vec3(.70,.82,.82),vec3(1.12,.49,.24),heat);
 vec3 zenith=mix(vec3(.072,.34,.61),vec3(.14,.27,.48),heat);
 outgoingLight=mix(horizon,zenith,pow(smoothstep(-.01,.73,el),.50));
 vec3 sunAxis=normalize(vec3(-.75,.39-.22*heat,.43));float sd=max(dot(dir,sunAxis),0.);
 outgoingLight+=vec3(1.,.70,.38)*(pow(sd,34.)*.16+pow(sd,2000.)*.7+smoothstep(.9995,.99985,sd)*3.);
 #include <opaque_fragment>`);
};
const sky=mesh(new T.SphereGeometry(730,54,26),skyMat);sky.castShadow=sky.receiveShadow=false;sky.renderOrder=-10;
const waveOffsets={value:new Float32Array(96)},waterShift={value:0},waterHeat={value:0},shadowAngle={value:0};
const waterMat=mat(0x398d97,.22,.35,{envMapIntensity:.8});
waterMat.onBeforeCompile=sh=>{
 Object.assign(sh.uniforms,{cells:waveOffsets,drift:waterShift,evening:waterHeat,wheelPhase:shadowAngle});
 sh.vertexShader=`varying vec3 seaP;uniform float cells[96];uniform float drift;
 float gridHeight(vec2 p){ivec2 i=ivec2(mod(p,vec2(12.,8.)));return cells[i.x+i.y*12];}
 `+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec2 gxy=(modelMatrix*vec4(position,1.)).xz*.19;vec2 gi=floor(gxy),gf=smoothstep(vec2(0.),vec2(1.),fract(gxy));
 transformed.z+=mix(mix(gridHeight(gi),gridHeight(gi+vec2(1,0)),gf.x),mix(gridHeight(gi+vec2(0,1)),gridHeight(gi+vec2(1)),gf.x),gf.y);
 `).replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n seaP=(modelMatrix*vec4(transformed,1.)).xyz;');
 sh.fragmentShader=`varying vec3 seaP;uniform float cells[96];uniform float drift;uniform float evening,wheelPhase;
 float cellAt(vec2 p){ivec2 q=ivec2(mod(p,vec2(12.,8.)));return cells[q.x+q.y*12];}
 float field(vec2 p){vec2 v=p*.19;vec2 a=floor(v);vec2 f=fract(v);f=f*f*(3.-2.*f);return mix(mix(cellAt(a),cellAt(a+vec2(1,0)),f.x),mix(cellAt(a+vec2(0,1)),cellAt(a+vec2(1)),f.x),f.y);}
 float swell(vec2 p){float n=field(p);return n+.041*sin(.48*p.x+1.46*p.y+drift*.85+2.1*sin(p.x*.16)+n*6.)+.022*sin(3.34*p.y-.44*p.x-drift*.65+sin(p.x*.71+drift*.3));}
 \n`+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float swellH=swell(seaP.xz);float seaTint=sin(seaP.x*.069+seaP.z*.081+field(seaP.xz)*4.);
 diffuseColor.rgb*=.91+.13*seaTint+.65*swellH;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.24,.30,.26),evening*.56);`)
 .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec2 st=seaP.xz;float fade=1.-smoothstep(80.,410.,distance(cameraPosition,seaP));
 vec3 wn=normalize(vec3(-(swell(st+vec2(.13,0.))-swellH)*7.*fade,1.,-(swell(st+vec2(0.,.13))-swellH)*7.*fade));normal=normalize(mat3(viewMatrix)*wn);`)
 .replace('#include <opaque_fragment>',`float streak=smoothstep(.058,.084,swellH)*smoothstep(.25,.89,sin(st.x*.56+st.y*.21+drift*.16))*fade;
 // Intersect the sun ray with the tilted plane of the wheel, including the rotating spokes.
 vec3 wd=normalize(vec3(-44.,36.-14.*evening,23.));vec3 planeN=vec3(-.18886,0.,.982);
 vec3 wc=vec3(24.,22.,-114.);float travel=dot(wc-seaP,planeN)/dot(wd,planeN);
 vec3 hit=seaP+travel*wd-wc;vec2 disc=vec2(dot(hit,vec3(.982,0.,.18886)),hit.y);float radius=length(disc);
 float ring=1.-smoothstep(.08,.34,min(abs(radius-18.5),abs(radius-12.75)));
 float spokes=(1.-smoothstep(.055,.23,abs(sin(15.*(atan(disc.x,disc.y)-wheelPhase)+(radius-12.75)*.30))*radius/15.))*smoothstep(12.6,13.,radius)*(1.-smoothstep(17.4,18.,radius));
 outgoingLight*=1.-.23*max(ring,spokes)*step(0.,travel);
 outgoingLight+=mix(vec3(.38,.62,.64),vec3(1.5,.88,.34),evening)*streak*.70;
 #include <opaque_fragment>`);
};
const seaGrid=new T.PlaneGeometry(1360,1360,160,168),seaVerts=seaGrid.attributes.position;
const stretch=v=>Math.sign(v)*680*(.16*Math.abs(v)+.84*Math.pow(Math.abs(v),2.7));
for(let i=0;i<seaVerts.count;i++)seaVerts.setXYZ(i,stretch(seaVerts.getX(i)/680),80+stretch(seaVerts.getY(i)/680),0);
const ocean=mesh(seaGrid,waterMat);ocean.rotation.x=-Math.PI/2;ocean.position.y=-.05;ocean.castShadow=false;
// The coast, coves and distant islands have actual elevation and a continuous beach.
const islands=[[83,-147,27,39,9],[37,-119,14,12,2.8],[54,-140,12,10,4.6],[85,-246,37,19,8],[-26,-251,42,25,13],[-87,-199,33,14,7],[165,-233,46,24,14],[-124,-269,73,25,15],[30,-340,65,20,9],[201,-326,50,26,12]];
function shore(z){return -10+4*Math.sin(z*.056)+2*Math.sin(z*.117);}
function ground(x,z){
 const f=shore(z)-x;let h=Math.min(1,(f+4)/11)*(3.4+1.3*Math.sin(z*.062)+.5*Math.sin(x*.12));
 h+=Math.max(0,Math.min(1,f/22))*(1.7+1.1*Math.sin(z*.039+x*.06));h-=Math.max(0,-z-117)*.26;
 h=Math.min(h,6.2);
 for(const [cx,cz,rx,rz,height] of islands){const dx=(x-cx)/rx,dz=(z-cz)/rz,q=1-dx*dx-dz*dz;
 h=Math.max(h,q*height+.59*Math.sin(x*.3+z*.12)*Math.max(0,q));}
 return Math.max(-8,h);
}
{
 const pos=[],colors=[],idx=[],nx=194,nz=225,wide=438,deep=486;
 const greens=[rgb(0xb6ad78),rgb(0x96a668),rgb(0x7d975a)],sand=rgb(0xe8c997),stone=rgb(0xa49c81),col=new T.Color();
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
 const x=-177+i*wide/nx,z=-372+j*deep/nz,h=ground(x,z);pos.push(x,h,z);
 const slope=Math.hypot(ground(x+1,z)-h,ground(x,z+1)-h),noise=.5+.5*Math.sin(x*.17+Math.sin(z*.22)*2);
 col.copy(sand).lerp(greens[0],R.smooth((h-.36)/1.85)).lerp(greens[1],R.smooth((h-.7)/2.1)*(.6+.34*noise)).lerp(greens[2],R.smooth((h-3)/4)*.7);
 col.lerp(stone,clamp((slope-.28)*1.9,0,.88));col.multiplyScalar(.96+.045*rand());colors.push(col.r,col.g,col.b);
 if(i<nx&&j<nz){const a=j*(nx+1)+i;idx.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,mat(0xffffff,.97,0,{vertexColors:true}));
}
// Sculpt soft cumulus banks from a union of ellipsoids, with a flat condensation base.
function cloudGeometry(){
 const lobes=[];for(let i=0;i<16;i++){const x=range(-.92,.92),z=range(-.31,.31),r=range(.20,.42)*(1-.19*Math.abs(x));lobes.push([x,range(.03,.18)+.16*(1-Math.abs(x)),z,r*1.5,r*range(.69,1),r]);}
 const f=(x,y,z)=>{let h=-5;for(const [a,b,c,rx,ry,rz] of lobes){const d=1-Math.sqrt(((x-a)/rx)**2+((y-b)/ry)**2+((z-c)/rz)**2);if(d>h)h=d;}
 return Math.min(h,(y+.075+.032*Math.sin(x*5+z*6))*6)+.048*Math.sin(13*x+9*y)*Math.cos(11*z+7*x);};
 const pos=[],norm=[],nx=38,ny=13,nz=21,verts=[],vals=[];
 const id=(x,y,z)=>x+(nx+1)*(y+(ny+1)*z);
 for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const p=V(-1.6+3.2*x/nx,-.19+1.18*y/ny,-.91+1.82*z/nz);verts.push(p);vals.push(f(p.x,p.y,p.z));}
 const tris=[[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]],edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
 const cache=new Map();
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
 const ids=[id(x,y,z),id(x+1,y,z),id(x,y+1,z),id(x+1,y+1,z),id(x,y,z+1),id(x+1,y,z+1),id(x,y+1,z+1),id(x+1,y+1,z+1)];if(ids.every(i=>vals[i]<0)||ids.every(i=>vals[i]>=0))continue;
 for(const tet of tris){const poly=[];for(const [a,b] of edges){const i=ids[tet[a]],j=ids[tet[b]];if((vals[i]>=0)===(vals[j]>=0))continue;const key=Math.min(i,j)*20000+Math.max(i,j);
 let node=cache.get(key);if(!node){const p=verts[i].clone().lerp(verts[j],vals[i]/(vals[i]-vals[j])),{x,y,z}=p,e=.017;
 node={p,n:V(f(x-e,y,z)-f(x+e,y,z),f(x,y-e,z)-f(x,y+e,z),f(x,y,z-e)-f(x,y,z+e)).normalize()};cache.set(key,node);}poly.push(node);}
 if(poly.length<3)continue;const center=poly.reduce((a,g)=>a.add(g.p),V()).multiplyScalar(1/poly.length),n=poly[0].n,axis=poly[0].p.clone().sub(center).normalize(),side=n.clone().cross(axis);poly.sort((a,b)=>{const u=a.p.clone().sub(center),v=b.p.clone().sub(center);return Math.atan2(u.dot(side),u.dot(axis))-Math.atan2(v.dot(side),v.dot(axis));});
 for(let i=1;i<poly.length-1;i++)for(const vert of [poly[0],poly[i],poly[i+1]]){pos.push(...vert.p.toArray());norm.push(...vert.n.toArray());}
 }}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));return g;
}
const cloudG=Array.from({length:3},cloudGeometry),cloudM=mat(0xfff9e9,.99,0,{emissive:0xa8bdc9,emissiveIntensity:.37}),clouds=[];
for(const [i,[x,y,z,l,h]] of [[-76,44,-181,36,21],[50,54,-236,31,26],[122,36,-199,43,22],[-170,40,-102,40,20],[-32,24,-273,26,13],[190,49,10,42,28],[-131,49,93,41,24],[74,46,149,45,25],[2,18,-284,13,8],[-139,21,-237,26,13],[136,20,-255,23,12]].entries()){
 const m=obj(cloudG[i%3],cloudM,V(x,y,z),V(l,h,l*.81));m.rotation.y=range(-.5,.5);m.receiveShadow=m.castShadow=false;clouds.push({m,x});}
// Wind-shaped pines, rocky beaches and coastal planting.
const bark=wood(0x806b4c),leaf=mat(0xffffff,.95),fol=[0x486c53,0x5c8057,0x60815a,0x7d9161,0x526f51],needle=new T.IcosahedronGeometry(1,1);
const railCorridor=[];
for(let s=0;s<R.length;s+=1.9){
 railCorridor.push(R.sample(s));const u=R.toU(s);
 if(u>17.5&&u<24.5)railCorridor.push(R.sample(s,true));
 if(u>30.5&&u<37.5)railCorridor.push(R.sample(s,false,0,true));
}
function pine(x,z,height){
 const y=ground(x,z);if(y<1.15||railCorridor.some(p=>Math.abs(x-p[0])<4.8&&Math.abs(z-p[2])<4.8&&p[1]<y+height+1))return;
 const h=height*range(.83,1.14),lean=range(-.13,.14)*h,base=V(x,y-.14,z),top=V(x+lean,y+h*.77,z+.12);
 all.beam(base,top,h*.038,h*.043,bark,rod);
 const count=4+Math.floor(rand()*3);const theta=rand()*6;
 for(let j=0;j<count;j++){const a=j*2.4+theta,r=j===count-1?0:h*range(.13,.27);
 const c=V(top.x+Math.cos(a)*r,y+h*(.72+j*.035)+range(-.07,.07)*h,z+Math.sin(a)*r);
 if(j<4)all.beam(base.clone().lerp(top,.57),c,h*.018,h*.018,bark,rod);
 all.add(needle,leaf,c,V(h*range(.21,.32),h*range(.15,.22),h*range(.19,.31)),[0,rand()*6,range(-.12,.12)],rgb(fol[(rand()*fol.length)|0]));
 }}
for(let i=0;i<750;i++){
 const x=range(-100,122),z=range(-206,53);
 if((x>-27&&x<3&&z>-8&&z<25)||(Math.abs(x-33)<17&&Math.abs(z+114)<15))continue;
 if(x<-15&&z>-115&&z<26&&Math.abs(x+30)<14&&rand()<.65)continue;
 pine(x,z,range(2.5,8.0));
}
for(let i=0;i<190;i++){const x=range(-146,190),z=range(-272,66),h=ground(x,z);if(h>2.5||h<-.9)continue;const s=range(.5,2.35);all.add(rock,matRock(),V(x,h-.13,z),V(s,s*.53,s*.72),[rand(),rand()*6,rand()*.4]);}
function matRock(){return matRock.m||(matRock.m=mat(0x9e9d86,.92));}
const bushMat=mat(0x879057,.95);
for(let i=0;i<480;i++){const x=range(-88,100),z=range(-200,48),h=ground(x,z);if(h>.68&&h<4)all.add(rock,bushMat,V(x,h+.2,z),V(range(.45,1.9),range(.32,.85),range(.58,1.7)),[0,rand()*6,0]);}
// Apply the lift profile to both ends of each moving beam. Pier feet remain planted.
const movable=[],raised=group(),lowGroup=group(),altGroup=group(),normalGroup=group();
function track(start,end,high,alternate,parent=scene){
 const b=batch(parent),variable=start<R.at(7), slopeAt=s=>R.smooth((R.toU(clamp(s,0,R.length))-1.5)/2.5)*R.smooth((7-R.toU(clamp(s,0,R.length)))/2.8);
 function frame(s){
 const c=vec(R.sample(s,high,0,alternate)),d=vec(R.sample(s+.05,high,0,alternate)).sub(vec(R.sample(s-.05,high,0,alternate))).normalize(),r=V(-d.z,0,d.x).normalize(),n=r.clone().cross(d).normalize();
 return {c,d,r,n,s,point(x,y){const p=c.clone().addScaledVector(r,x).addScaledVector(n,y);p.lift=variable?slopeAt(s):0;return p;}};
 }
 function line(a,c,x,z,m,g=cube){
 const entry=b.beam(a,c,x,z,m,g);
 if((a.lift||c.lift)&&variable)movable.push({entry,a:a.clone(),c:c.clone(),wa:a.lift||0,wc:c.lift||0,x,z});
 }
 const segments=Math.ceil((end-start)/.68);
 for(let j=0;j<segments;j++){
 const f=frame(start+(end-start)*j/segments),next=frame(start+(end-start)*(j+1)/segments);
 line(f.point(-1.25,-.245),f.point(1.25,-.245),.17,.26,j%4===0?lightOak:oak);
 for(const side of [-1,1]){
 line(f.point(side*.89,-.105),next.point(side*.89,-.105),.20,.21,darkOak);
 line(f.point(side*.89,.003),next.point(side*.89,.003),.058,.058,silver,rod);
 line(f.point(side*1.085,-.36),next.point(side*1.085,-.36),.15,.29,lightOak);
 }
 if((f.s< R.crest+1||f.s>R.gate&&f.s<R.gateTop||f.s>R.finalHill&&f.s<R.finalTop)){
 line(f.point(0,-.15),next.point(0,-.15),.12,.095,iron);
 
 }
 }
 const bentCount=Math.ceil((end-start)/3.35);
 for(let j=0;j<bentCount;j++){
 const f=frame(start+(end-start)*j/bentCount),g=frame(start+(end-start)*(j+1)/bentCount);
 line(f.point(-1.46,-.57),f.point(1.46,-.57),.31,.3,beamOak);
 for(const side of [-1,1]){
 const a=f.point(side*1.11,-.60),c=g.point(side*1.11,-.60),foot=f.point(side*1.34,-1),nextFoot=g.point(side*1.34,-1);
 foot.y=Math.min(a.y-.4,Math.max(-1.5,ground(foot.x,foot.z)-.25));foot.lift=0;
 nextFoot.y=Math.min(c.y-.4,Math.max(-1.5,ground(nextFoot.x,nextFoot.z)-.25));nextFoot.lift=0;
 line(foot,a,.265,.26,j%4?beamOak:oak);
 const layers=Math.max(1,Math.ceil((a.y-foot.y)/4));
 for(let n=0;n<layers;n++){
 const l=foot.clone().lerp(a,n/layers),h=foot.clone().lerp(a,(n+1)/layers);
 const nl=nextFoot.clone().lerp(c,n/layers),nh=nextFoot.clone().lerp(c,(n+1)/layers);
 l.lift=a.lift*n/layers;h.lift=a.lift*(n+1)/layers;nl.lift=c.lift*n/layers;nh.lift=c.lift*(n+1)/layers;
 if(h.y-l.y>1.0){line(l,nh,.13,.17,lightOak);line(h,nl,.125,.16,oak);if(n>0)line(l,nl,.18,.18,beamOak);}
 }
 line(a,c,.25,.29,oak);
 }
 }
 b.finish();
}
track(0,R.at(8),false,false);track(R.at(8),R.at(18),false,false);
track(R.at(18),R.at(24),false,false,lowGroup);track(R.at(18),R.at(24),true,false,raised);
track(R.at(24),R.at(31),false,false);track(R.at(31),R.at(37),false,false,normalGroup);track(R.at(31),R.at(37),false,true,altGroup);track(R.at(37),R.length,false,false);
const chainBed=[[0,R.crest],[R.gate,R.gateTop],[R.finalHill,R.finalTop]],pitch=.27;
const chainLinks=new T.InstancedMesh(new T.TorusGeometry(.053,.015,6,12),iron,
 chainBed.reduce((n,[a,b])=>n+Math.floor((b-a)/pitch),0));
scene.add(chainLinks);chainLinks.castShadow=true;chainLinks.receiveShadow=true;chainLinks.frustumCulled=false;
let lastChain=-1,lastLinkLift=-1,lastBranch=null;
function moveLinks(){
 if(Math.abs(lastChain-S.chain)<.006&&Math.abs(lastLinkLift-S.lift)<.009&&lastBranch===S.high)return;
 lastChain=S.chain;lastLinkLift=S.lift;lastBranch=S.high;let i=0;const link=new T.Object3D(),basis=new T.Matrix4();
 for(const [a,b] of chainBed){for(let j=0;j<Math.floor((b-a)/pitch);j++){
 const s=a+j*pitch+S.chain%pitch,p=vec(sim.pos(s)),d=vec(sim.pos(s+.05)).sub(p).normalize(),r=V(-d.z,0,d.x).normalize(),n=r.clone().cross(d);
 link.position.copy(p).addScaledVector(n,-.071);link.quaternion.setFromRotationMatrix(basis.makeBasis(r,d,n.clone().negate()));link.rotateY(j%2?.97:.12);link.scale.set(1,2.8,1);
 link.updateMatrix();chainLinks.setMatrixAt(i++,link.matrix);
 }}chainLinks.instanceMatrix.needsUpdate=true;
}
let lastLift=0;const mt=new T.Object3D(),va=V(),vb=V();
function refreshLift(){
 if(Math.abs(lastLift-S.lift)<.008&&!(S.lift===0&&lastLift!==0))return;lastLift=S.lift;
 for(const m of movable){va.copy(m.a);vb.copy(m.c);va.y+=m.wa*S.lift;vb.y+=m.wc*S.lift;mt.position.copy(va).lerp(vb,.5);vb.sub(va);mt.scale.set(m.x,vb.length(),m.z);mt.quaternion.setFromUnitVectors(up,vb.normalize());mt.updateMatrix();m.entry.arr.mesh.setMatrixAt(m.entry.index,mt.matrix);m.entry.arr.mesh.instanceMatrix.needsUpdate=true;m.entry.arr.mesh.frustumCulled=false;}
}
// Boarded station with open striped awning, turned posts and incandescent deck lamps.
const platformY=7.18,lampParts=[];
function lantern(x,y,z,size=1){
 all.add(rod,iron,V(x,y+.14*size,z),V(.13*size,.25*size,.13*size));
 const glass=mat(0xffe3a1,.19,.08,{emissive:0xffc16a,emissiveIntensity:.32});lampParts.push(glass);
 all.add(ball,glass,V(x,y+.43*size,z),V(.24*size,.30*size,.24*size));
 all.add(cone,iron,V(x,y+.75*size,z),V(.32*size,.25*size,.32*size));
 all.add(ball,brass,V(x,y+.91*size,z),V(.065*size,.09*size,.065*size));
}
function pole(x,y,z,h=1.38,m=teal){all.add(rod,m,V(x,y+h/2,z),V(.074,h,.074));all.add(rod,cream,V(x,y+.18,z),V(.095,.13,.095));all.add(ball,brass,V(x,y+h,z),V(.11,.11,.11));}
for(const [side,width] of [[-1,5.3],[1,1.1]]){
 const edge=side*(1.55+width),x=side*(1.55+width/2);
 for(let i=0;i<51;i++)all.add(cube,i%5===2?lightOak:oak,V(x,platformY-.12,-6.15+i*.442),V(width,.23,.426));
 all.add(cube,darkOak,V(edge,platformY-.34,4.9),V(.22,.51,22.7));
 for(let j=0;j<8;j++){const z=-6.2+j*3.18;all.beam(V(edge,-1,z),V(edge,platformY,z),.26,.27,beamOak);
 if(side<0||j<3||j>6){pole(edge,platformY,z,1.03);
 if(j<7&&(side<0||j<2))for(const d of [.46,.91])all.beam(V(edge,platformY+d,z),V(edge,platformY+d,z+3.18),.047,.047,d===.91?brass:cream,rod);}
 }
}
const stripes=[mat(0xc86245,.83,0,{side:T.DoubleSide}),mat(0xf2dfb3,.83,0,{side:T.DoubleSide})],roofY=10.5;
for(const z of [-3,4.6,12.1])for(const x of [-7,-3.65]){
 all.add(rod,teal,V(x,(roofY+platformY)/2,z),V(.083,roofY-platformY,.083));
 all.add(rod,brass,V(x,roofY-.19,z),V(.12,.12,.12));all.add(rod,cream,V(x,platformY+.31,z),V(.124,.6,.124));
 all.beam(V(x,roofY-.7,z),V(x,roofY,z+.56),.055,.055,cream,rod);
}
for(let i=0;i<23;i++){
 const z=-3.85+i*.74, s=stripes[i%2],g=new T.BufferGeometry(),p=[],uv=[];
 const profile=[[-7.36,roofY-.29],[-7.36,roofY],[-5.34,roofY+.96],[-3.28,roofY],[-3.28,roofY-.23]];
 for(let j=0;j<profile.length-1;j++){
 const [x,y]=profile[j],[u,v]=profile[j+1];
 p.push(x,y,z,u,v,z,u,v,z+.74,x,y,z,u,v,z+.74,x,y,z+.74);uv.push(0,0,1,0,1,1,0,0,1,1,0,1);
 }g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();mesh(g,s);
}
for(let z=-3;z<13;z+=3.8)lantern(-3.65,roofY-.95,z,.54);
for(const x of [-6.1,-4.55]){
 for(const z of [4.2,10.9]){all.add(cube,teal,V(x,7.38,z),V(.16,.42,1.5));all.add(cube,lightOak,V(x,7.64,z),V(.59,.13,1.9));}
}
// Flower tubs and a brass-rimmed station clockwork housing sit along the outer platform.
const foliage=mat(0x54794b,.9),daisy=mat(0xffedba,.81);
for(const z of [-4.3,1.3,8.3,14.4]){
 const x=-5.65;
 all.add(new T.CylinderGeometry(.46,.32,.65,12),teal,V(x,platformY+.325,z),V(1,1,1));
 all.add(rod,brass,V(x,platformY+.59,z),V(.466,.045,.466));
 for(let j=0;j<17;j++){const a=j*2.399,r=range(.02,.42),y=platformY+range(.70,1.09),xx=x+r*Math.cos(a),zz=z+r*Math.sin(a);
 all.add(needle,foliage,V(xx,y-.13,zz),V(.1,.17,.11),[rand()*.8,a,.2]);
 if(j%3===0){all.add(ball,daisy,V(xx,y,zz),V(.083,.034,.081));all.add(ball,yellow,V(xx,y+.025,zz),V(.029,.023,.03));}
 }}
// A wooden covered bridge frames the passage from the sea into the cove.
const tunnelTimber=wood(0x926d4d),roofMetal=mat(0x518b8c,.49,.24);
for(let i=0;i<=12;i++){
 const s=R.at(15.1)+i*1.21,p=vec(R.sample(s)),q=vec(R.sample(s+.1)),d=q.sub(p).normalize(),r=V(-d.z,0,d.x).normalize();
 const point=(x,y,z=0)=>p.clone().addScaledVector(r,x).addScaledVector(d,z).add(V(0,y,0));
 for(const side of [-1,1]){
 all.beam(point(2.04*side,-.55),point(2.04*side,3.92),.20,.19,tunnelTimber);
 all.beam(point(2.04*side,3.82),point(0,4.83),.22,.18,lightOak);
 if(i<12){
 all.beam(point(2.08*side,.2),point(2.08*side,1.7,1.23),.14,.12,oak);
 all.beam(point(2.05*side,1.7),point(2.05*side,1.7,1.25),.15,.2,lightOak);
 const a=point(2.3*side,3.78),b=point(0,4.95),c=point(0,4.95,1.30),e=point(2.3*side,3.78,1.30);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([a,b,c,a,c,e].flatMap(p=>p.toArray()),3));geo.computeVertexNormals();roofMetal.side=T.DoubleSide;mesh(geo,roofMetal);
 }}
 if(i%4===0){const l=point(1.98,2.4);lantern(l.x,l.y,l.z,.6);}
}
// Enamel gondolas hang freely from the turning double rim.
const ferris=group();ferris.position.set(24,0,-114);ferris.rotation.y=-.19;
const wheelRadius=18.5,hubY=22,wheel=group(ferris);wheel.position.y=hubY;
const wheelIvory=mat(0xede2be,.47,.38),verm=mat(0xb9543e,.4,.38),gondolaM=[red,teal,yellow,mat(0x7297ad,.38,.24)];
const staticWheel=batch(ferris),wheelBatch=batch(wheel);
// Rim-driven observation wheel. The clear bore leaves room for the elevated track.
for(const z of [-2.85,2.85])for(const side of [-1,1]){
 const bearing=V(side*13.9,hubY-11.9,z*.60);
 for(const foot of [11.4,17.3]){
 staticWheel.beam(V(side*foot,.45,z*1.4),bearing,.45,.53,teal);
 staticWheel.beam(V(side*(foot+.43),.9,z*1.4),bearing,.14,.15,cream);
 staticWheel.add(cube,lightOak,V(side*foot,.75,z*1.4),V(1.75,1.0,2.2));}
 staticWheel.add(ball,verm,bearing,V(.76,.76,.43));
 staticWheel.add(ball,brass,bearing.clone().add(V(0,0,.33*Math.sign(z))),V(.37,.37,.18));
}
staticWheel.finish();
function wheelP(a,r,z){return V(Math.sin(a)*r,Math.cos(a)*r,z);}
const cabinRoots=[];
for(let i=0;i<60;i++){
 const a=i*Math.PI/30,b=(i+1)*Math.PI/30;
 for(const z of [-1,1]){
 wheelBatch.beam(wheelP(a,wheelRadius,z),wheelP(b,wheelRadius,z),.12,.12,wheelIvory,rod);
 wheelBatch.beam(wheelP(a,wheelRadius-1.05,z),wheelP(b,wheelRadius-1.05,z),.082,.082,verm,rod);
 wheelBatch.beam(wheelP(a,wheelRadius,z),wheelP(b,wheelRadius-1.05,z),.049,.049,wheelIvory,rod);
 wheelBatch.beam(wheelP(a,12.75,z*.62),wheelP(b,12.75,z*.62),.12,.12,wheelIvory,rod);
 if(i%2===0){wheelBatch.beam(wheelP(a,12.75,z*.62),wheelP(b,wheelRadius-.8,z),.096,.096,wheelIvory,rod);
 wheelBatch.beam(wheelP(a,12.75,z*.62),wheelP(a-Math.PI/30,wheelRadius-.8,z),.084,.084,wheelIvory,rod);}
 }
 if(i%3===0){
 wheelBatch.beam(wheelP(a,wheelRadius,-1.7),wheelP(a,wheelRadius,1.7),.12,.12,verm,rod);
 const pivot=group(wheel);pivot.position.copy(wheelP(a,wheelRadius,0));cabinRoots.push(pivot);
 const gb=batch(pivot),paint=gondolaM[(i/3)%4];
 for(const z of [-1.02,1.02]){gb.beam(V(-.7,-2.5,z),V(-.34,-.27,z),.059,.059,wheelIvory,rod);gb.beam(V(.7,-2.5,z),V(.34,-.27,z),.059,.059,wheelIvory,rod);}
 gb.add(ball,paint,V(0,-2.46,0),V(1.05,.69,1.24));
 gb.add(rod,cream,V(0,-2.18,0),V(.98,.16,1.17));gb.add(ball,paint,V(0,-.7,0),V(1.13,.30,1.35));
 gb.add(ball,brass,V(0,-.42,0),V(.11,.13,.11));gb.finish();
 }}
wheelBatch.finish();
// Boathouses, a navigational light and moored little sailboats give the sea scale.
function house(x,z,w,d,h,wall,roof){
 const y=Math.max(ground(x,z),.64),base=V(x,y+h/2,z);
 all.add(cube,wall,base,V(w,h,d));all.add(cube,cream,V(x,y+.23,z),V(w+.15,.34,d+.15));
 for(const s of [-1,1]){
 const a=V(x+s*(w*.5+.3),y+h,z),b=V(x,y+h+w*.34,z);
 all.beam(a,b,.15,d+.65,roof);all.add(cube,cream,V(x+s*w*.46,y+h/2,z+d*.502),V(.13,h,.14));
 all.add(cube,teal,V(x+s*w*.26,y+h*.58,z+d*.505),V(w*.22,h*.3,.11));
 all.add(cube,cream,V(x+s*w*.26,y+h*.58,z+d*.53),V(.075,h*.31,.11));
 }all.add(cube,darkOak,V(x,y+h*.32,z+d*.513),V(w*.18,h*.64,.12));
}
for(let i=0;i<6;i++)house(19+i*5.4,-127+(i%2)*3,3.8,4.2,2.9,[cream,teal,lightOak][i%3],[red,roofMetal][i%2]);
for(let i=0;i<5;i++)house(-36-i*5,-125-i%2*4,3.8,4.8,3,cream,i%2?red:roofMetal);
const lx=83,lz=-147,ly=ground(lx,lz);
for(let i=0;i<5;i++){const h=2.05;const g=new T.CylinderGeometry(1.88-i*.15,2.03-i*.15,h,24);all.add(g,i===2||i===4?red:cream,V(lx,ly+h*(i+.5),lz),V(1,1,1));}
all.add(rod,iron,V(lx,ly+10.42,lz),V(1.95,.28,1.95));all.add(rod,mat(0xb2d7ce,.14,.20,{transparent:true,opacity:.54}),V(lx,ly+11.23,lz),V(1.13,1.56,1.13));
all.add(cone,red,V(lx,ly+12.58,lz),V(1.68,1.34,1.68));all.add(rod,brass,V(lx,ly+13.45,lz),V(.08,.65,.08));
for(let i=0;i<8;i++){const a=i*.785;all.add(rod,iron,V(lx+Math.cos(a)*1.15,ly+11.24,lz+Math.sin(a)*1.15),V(.062,1.63,.062));}
const sails=[];
function yacht(x,z,sz,i){
 const boat=group();boat.position.set(x,.05,z);boat.scale.setScalar(sz);boat.rotation.y=i*.69;const hull=sphere(boat,i%2?cream:teal,0,.28,0,.75,.4,2.5);hull.material=i%2?cream:teal;
 box(boat,lightOak,0,.51,0,1.1,.16,3.2);bar(boat,oak,V(0,.4,0),V(0,5.75,0),.056);
 for(const side of [-1,1]){
 const p=[0,.94,side*.16,0,5.48-side*.19,side*.10,.29,1.22,side*1.94];
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();const canvasMat=mat(side===1&&i%3===0?0xcf8d57:0xffecc5,.87,0,{side:T.DoubleSide});mesh(g,canvasMat,boat);
 }sails.push(boat);
}
[[19,-89,.92],[81,-88,.91],[96,-178,1.1],[-2,-177,1.1],[-59,-163,.84],[84,-55,.86]].forEach((a,i)=>yacht(...a,i));
const flags=[];
const cloth=[mat(0xd25a40,.84,0,{side:T.DoubleSide}),mat(0xe2b14c,.81,0,{side:T.DoubleSide}),mat(0x3b9294,.82,0,{side:T.DoubleSide})],flagCream=mat(0xf6e6bc,.82,0,{side:T.DoubleSide});
for(let i=0;i<R.flagSites.length;i++){
 let [x,z]=R.flagSites[i];if(i===0)x=2.69;
 const nearest=R.at([1,3,5,8,12,15,18,22,28,35][i]);
 const y=i===0?platformY:R.sample(nearest)[1]-.45,h=i===0?3.85:3.03;
 if(i>0){const path=vec(R.sample(nearest));all.beam(V(path.x,path.y-.62,path.z),V(x,y,z),.13,.16,oak);}
 all.add(rod,cream,V(x,y+h*.5,z),V(.061,h,.061));all.add(rod,brass,V(x,y+h*.86,z),V(.071,.12,.071));all.add(ball,brass,V(x,y+h+.06,z),V(.11,.15,.11));
 const g=new T.BufferGeometry(),positions=new Float32Array(7*3*3),ix=[],uv=[];
 for(let j=0;j<=6;j++)for(let row=0;row<3;row++)uv.push(j/6,row/2);
 for(let j=0;j<6;j++)for(let row=0;row<2;row++){const a=j*3+row;const which=j===1?1:0;g.addGroup(ix.length,6,which);ix.push(a,a+3,a+1,a+3,a+4,a+1);}
 g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);const m=mesh(g,[cloth[i%3],flagCream]);m.position.set(x,y+h-.14,z);m.frustumCulled=false;flags.push(m);
}
// Individual pennants on a sagging station halyard.
const pennants=[];
for(let i=0;i<9;i++){
 const a=V(-6.8+i*.32,10.9-.8*Math.sin(i/9*3.14),-5.7-i*.72),c=V(-6.8+(i+1)*.32,10.9-.8*Math.sin((i+1)/9*3.14),-5.7-(i+1)*.72);
 all.beam(a,c,.018,.018,cream,rod);const mid=a.clone().lerp(c,.5),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.21,.005,.25,.21,-.005,-.25,.2,-.57,.035],3));g.computeVertexNormals();const m=mesh(g,cloth[i%3]);m.position.copy(mid);pennants.push(m);
}
for(const end of [V(-6.8,10.9,-5.7),V(-3.92,10.9,-12.18)])all.beam(V(end.x,Math.min(ground(end.x,end.z),4),end.z),end,.056,.056,cream,rod);
for(let i=0;i<33;i++){
 const s=R.at(24.5)+(R.length-R.at(24.5))*i/33,p=vec(R.sample(s)),q=vec(R.sample(s+.1)).sub(p).normalize(),r=V(-q.z,0,q.x);p.addScaledVector(r,1.53);
 all.add(rod,teal,V(p.x,p.y+.41,p.z),V(.055,1.55,.055));lantern(p.x,p.y+1.15,p.z,.64);
}
all.finish();
const drops=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xe6f7ef,.12,.25,{transparent:true,opacity:.83}),S.spray.length),specks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xffe9b3,.83,0,{transparent:true,opacity:.42}),S.dust.length);
drops.frustumCulled=specks.frustumCulled=false;scene.add(drops,specks);
const afternoon=rgb(0xc1d4cf),dusk=rgb(0xf5bc96),warm=rgb(0xffdfac),amber=rgb(0xffaf6b),blue=rgb(0xd8ecff),lilac=rgb(0xe3d1d8);
function update(){
 refreshLift();moveLinks();raised.visible=S.gateAngle>.008||S.high&&S.stage===2;raised.position.y=-13*(1-R.smooth(S.gateAngle));
 altGroup.visible=S.baySwitch>.002;altGroup.position.y=-9*(1-R.smooth(S.baySwitch));normalGroup.visible=true;
 wheel.rotation.z=-S.wheelAngle;cabinRoots.forEach((c,i)=>c.rotation.z=S.wheelAngle+S.cabins[i].a);
 flags.forEach((m,i)=>{const attr=m.geometry.attributes.position,strip=S.flags[i];
 for(let j=0;j<=6;j++){const a=j?strip[j-1].a:0,f=j/6;
 for(let row=0;row<3;row++){const v=row/2,tip=i%2===0?1-f*.92:1-f*.23;
 attr.setXYZ(j*3+row,f*1.65-.10*a*a,-v*.72*tip-.23*f+.12*a+Math.sin(f*Math.PI)*.035,f*.23+a*(.73+.18*v));}}
 attr.needsUpdate=true;m.geometry.computeVertexNormals();});
 pennants.forEach((m,i)=>{m.rotation.x=S.flags[i%10][4].a*.45;m.rotation.z=S.flags[(i+2)%10][2].a*.17;});
 sails.forEach((b,i)=>{const hull=S.boats[i];b.position.y=hull.y;b.rotation.z=hull.a;b.rotation.x=hull.vy*.26;});
 shadowAngle.value=S.wheelAngle;waterShift.value=S.water[7].phase;waterHeat.value=skyUniform.value=S.sunset;
 S.water.forEach((c,i)=>waveOffsets.value[i]=c.h);
 clouds.forEach((c,i)=>{c.m.position.x=c.x+S.clouds[i].x;});
 sky.position.copy(cam.position);scene.fog.color.copy(afternoon).lerp(dusk,S.sunset);sun.color.copy(warm).lerp(amber,S.sunset);skyLight.color.copy(blue).lerp(lilac,S.sunset);
 lampParts.forEach((m,i)=>{m.emissiveIntensity=.28+S.lamps[i%48].heat*2.6;});
 const p=sim.pos(S.s);
 S.spray.forEach((d,i)=>{mt.position.set(d.x,d.y,d.z);mt.scale.setScalar(d.life?d.r:0);mt.scale.y*=1.35;mt.quaternion.identity();mt.updateMatrix();drops.setMatrixAt(i,mt.matrix);});drops.instanceMatrix.needsUpdate=true;
 S.dust.forEach((d,i)=>{mt.position.set(p[0]+d.x,p[1]+d.y,p[2]+d.z);mt.scale.setScalar(.009+.006*(i%3));mt.updateMatrix();specks.setMatrixAt(i,mt.matrix);});specks.instanceMatrix.needsUpdate=true;
}
return {update};
}
