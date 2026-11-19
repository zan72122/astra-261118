'use strict';
function roundPanel(w,h,r,depth,m,p){
 const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
 return mesh(new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.024,bevelSize:.026,bevelSegments:3,curveSegments:7}),m,p);
}
const oven=at(group(),2.78,.77,-4.18),ovenBody=at(roundPanel(2.65,1.76,.24,1.02,blue,oven),0,.99,-.53);
for(const x of [-.94,.94])orb(x,.065,.12,.17,.10,.18,iron,oven);
const door=at(group(oven),-.22,.32,.56);at(roundPanel(1.86,1.25,.18,.06,blueDark,door),0,.58,0);
const ovenFrame=at(roundPanel(1.59,.92,.19,.05,paleBrass,door),0,.62,.069);
const ovenGlass=phys(0x423d32,{roughness:.13,metalness:.28,clearcoat:.85});
const ovenPane=at(roundPanel(1.48,.82,.16,.024,ovenGlass,door),0,.62,.127);
const ovenInner=at(group(door),0,.62,.16);
for(let i=0;i<3;i++)box(0,-.28+i*.11,.01,1.3,.013,.015,mat(0x817563,.55,.48),ovenInner);
rod(V(-.62,1.12,.23),V(.62,1.12,.23),.052,walnut,door);
for(const x of [-.58,.58])rod(V(x,1.12,.06),V(x,1.12,.23),.037,brass,door);
for(const y of [.62,1.25]){let d=lathe([[0,0],[.177,0],[.176,.075],[.146,.095],[0,.097]],brass,oven,48);at(d,.99,y,.55);d.rotation.x=PI/2;
const knob=at(roundPanel(.056,.21,.025,.05,clay,oven),.99,y,.65);knob.rotation.z=-.51;}
const ovenLamp=orb(.99,1.60,.566,.049,.049,.022,mat(0xe5a767,.24,.2,{emissive:0xee9a39,emissiveIntensity:.14}),oven);

// Linen uses an actual displaced hem. The weave and colour bands follow its UVs.
const linenTx=texture(256,(x,y)=>{
 let band=(x>23&&x<28)||(x>33&&x<44)||(x>49&&x<53)||(x>203&&x<207)||(x>212&&x<223)||(x>228&&x<233);
 let thin=(y>20&&y<23)||(y>27&&y<30)||(y>227&&y<230)||(y>234&&y<237);
 const base=band?[104,144,153]:thin?[154,174,169]:[222,217,193],k=rand()*8+((x%3===0)!==(y%3===0)?-7:1);
 return base.map(c=>c+k);},true);
const linen=mat(0xffffff,.93,0,{map:linenTx,bumpMap:linenTx,bumpScale:.017,side:T.DoubleSide});
const cloth=at(group(),-.51,.026,1);cloth.rotation.y=-.19;
const clothG=new T.PlaneGeometry(4.15,2.90,36,32);clothG.rotateX(-PI/2);
const clothP=clothG.attributes.position;
for(let i=0;i<clothP.count;i++){let x=clothP.getX(i),z=clothP.getZ(i),e=Math.max(Math.abs(x)/2.075,Math.abs(z)/1.45);
clothP.setXYZ(i,x+Math.sin(3*z)*.023*e,.016+.042*Math.sin(4.3*x+1.6*z)*e**4+.044*Math.exp(-8*(z-.87+x*.17)**2),z+.032*Math.sin(3*x)*e);}
clothG.computeVertexNormals();mesh(clothG,linen,cloth);
const hero=at(group(),-.27,.085,.72);softShadow(hero,0,0,1.65,1.29);
const bowl=group(hero);
const glassProfile=[[.02,.07],[.45,.07],[.56,.11],[.61,.17],[.75,.22],[.91,.32],[1.04,.46],[1.16,.67],[1.255,.91],[1.326,1.17],[1.37,1.33],[1.37,1.375],[1.34,1.386],[1.313,1.366],[1.29,1.20],[1.218,.93],[1.127,.70],[1.02,.51],[.873,.376],[.68,.275],[.43,.209],[.02,.206]];
glassObj(lathe(glassProfile,glass,bowl,104));
glassObj(ring(1.351,.039,1.36,glassEdge,bowl,104),6);glassObj(ring(.48,.045,.09,glassEdge,bowl));
const fluteMat=phys(0xc2dcd3,{transparent:true,opacity:.26,roughness:.12,metalness:.15,depthWrite:false});
for(let i=0;i<36;i++){const a=TAU*i/36,pts=[[.52,.12],[.75,.22],[1.034,.454],[1.158,.665],[1.21,.81]].map(([r,y])=>[r*Math.cos(a),y,r*Math.sin(a)]);
glassObj(curve(pts,.013,fluteMat,bowl,13),5);}
const liquidMat=phys(0xffffff,{roughness:.21,clearcoat:.75,clearcoatRoughness:.14,vertexColors:true,side:T.DoubleSide,metalness:.035});
const batterMat=phys(0xffffff,{roughness:.32,clearcoat:.43,vertexColors:true,side:T.DoubleSide});
const albumenBase=phys(0xe4d9ad,{roughness:.21,clearcoat:.7});
const bulk=lathe([[0,.2],[.53,.23],[.85,.37],[1.055,.56],[1.17,.77],[1.215,.91],[0,.91]],albumenBase,bowl);
function disc(n,rings,m,p){
 const g=new T.BufferGeometry(),pos=[],colors=[],idx=[];
 for(let j=0;j<=rings;j++)for(let i=0;i<=n;i++){const a=TAU*i/n;pos.push(j/rings*Math.cos(a),0,j/rings*Math.sin(a));colors.push(1,1,1);}
 for(let j=0;j<rings;j++)for(let i=0;i<n;i++){const k=j*(n+1)+i;idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
 // Up-facing radial mesh (r cross tangent points down in xz).
 idx.reverse();g.setIndex(idx);g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 const o=mesh(g,m,p);o.userData.base=new Float32Array(pos);o.frustumCulled=false;return o;
}
const surface=disc(72,21,liquidMat,bowl);
const cheese=at(group(),2.14,.07,-.04);
softShadow(cheese,0,0,1.05,.83);
lathe([[0,.035],[.40,.035],[.51,.11],[.63,.17],[.84,.37],[.98,.72],[1.01,.88],[1,.93],[.955,.93],[.92,.72],[.75,.38],[.5,.2],[0,.16]],blue,cheese);
ring(.988,.031,.91,clay,cheese);ring(.46,.025,.08,clay,cheese);
const cheeseSkin=disc(64,19,batterMat,cheese);
const cheeseBody=lathe([[0,.16],[.48,.19],[.72,.34],[.87,.56],[.925,.72],[0,.72]],mat(0xefc879,.34),cheese);
const whisk=group(hero),wireMeshes=[];
const wire=mat(0xe4dfd3,.17,.92);
for(let i=0;i<9;i++){
 const a=i*PI/9,pts=[];
 for(let j=0;j<=38;j++){
 const f=j/38,theta=f*TAU,rad=.365*Math.sin(theta)*(.75+.25*Math.sin(theta/2)),y=.09+1.26*(1-Math.sin(theta/2))**1.4;
 pts.push([rad*Math.cos(a),y,rad*Math.sin(a)+.012*Math.sin(theta*2+i)]);}
 const loop=curve(pts,.0155,wire,whisk,42);loop.userData.rest=new Float32Array(loop.geometry.attributes.position.array);wireMeshes.push(loop);}
lathe([[0,1.28],[.089,1.28],[.112,1.33],[.115,1.55],[.116,1.59],[0,1.59]],brass,whisk,40);
lathe([[0,1.52],[.104,1.52],[.123,1.6],[.122,1.76],[.099,2.10],[.108,2.43],[.138,2.70],[.13,2.88],[.10,2.94],[0,2.95]],walnut,whisk,48);
for(const y of [1.36,1.49,2.77,2.81,2.90])ring(y>2?.131:.115,.009,y,paleBrass,whisk,40);
const hook=mesh(new T.TorusGeometry(.066,.012,8,24),brass,whisk);at(hook,0,2.994,0);
const bubbleMat=phys(0xeef3de,{transparent:true,opacity:.38,roughness:.065,metalness:.24,clearcoat:1,iridescence:.23,iridescenceIOR:1.16,depthWrite:false});
bubbleMat.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= 0.27 + 0.73 * pow(1.0 - abs(dot(normalize(normal),normalize(vViewPosition))), 1.3);\n#include <opaque_fragment>');};
const bigBubble=group(hero);glassObj(orb(0,0,0,1,1,1,bubbleMat,bigBubble),8);
const glint=phys(0xfffcdf,{roughness:.14,transparent:true,opacity:.72,depthWrite:false});
curve([[-.67,.46,.58],[-.48,.69,.55],[-.26,.79,.53]],.031,glint,bigBubble,10).renderOrder=9;
orb(-.78,.26,.56,.051,.093,.035,glint,bigBubble).renderOrder=9;
const beads=Array.from({length:96},(_,i)=>{const a=rand()*TAU,r=i<47?.78+rand()*.185:Math.sqrt(rand())*.96;
return {x:Math.cos(a)*r,z:Math.sin(a)*r,rad:i<47?.012+rand()*.053:.012+rand()*.039,threshold:rand()*.48};});
const foamMat=phys(0xf6ebce,{roughness:.20,clearcoat:1,metalness:.065});
const pearls=new T.InstancedMesh(new T.SphereGeometry(1,12,8),foamMat,beads.length+12+sim.trail.length);bowl.add(pearls);
pearls.castShadow=false;pearls.frustumCulled=false;
const stick=group(cheese),rubber=mat(0xc7d6c0,.44);
const blade=at(roundPanel(.40,.52,.10,.065,rubber,stick),0,.23,-.035);blade.rotation.z=-.08;
lathe([[0,.43],[.071,.43],[.077,.73],[.054,1.10],[.072,1.72],[.057,1.84],[0,1.86]],maple,stick,32);ring(.065,.012,1.72,brass,stick,30);
at(stick,.37,.53,-.24);stick.rotation.z=-.43;
const creamLine=phys(0xfff0cf,{roughness:.26,clearcoat:.43}), curdLine=phys(0xe9bc6e,{roughness:.34});
function strand(m,p){const g=disc(18,28,m,p);return g;}
const threadMesh=strand(phys(0xebd9aa,{roughness:.18,clearcoat:.9,side:T.DoubleSide}),hero);
const peakMesh=strand(creamLine,hero),ribbonMesh=strand(creamLine,cheese),streamMesh=strand(curdLine,scene);
function updateStrand(o,start,end,width,mode,bend=0){
 const pos=o.geometry.attributes.position,n=18,rows=28;
 for(let j=0;j<=rows;j++){const f=j/rows;
 let r=mode==='peak'?width*(.04+1.1*(1-f)**1.55):width*(.71+.28*Math.cos(f*7));
 let bx=start.x+(end.x-start.x)*f+bend*Math.sin(f*PI),by=start.y+(end.y-start.y)*f,bz=start.z+(end.z-start.z)*f;
 if(mode==='peak'){bx+=bend*f**4;by-=Math.abs(bend)*f**5;}
 for(let i=0;i<=n;i++){const a=TAU*i/n;pos.setXYZ(j*(n+1)+i,bx+r*Math.cos(a),by,bz+r*Math.sin(a)*(mode==='ribbon'?.30:1));}}
 pos.needsUpdate=true;o.geometry.computeVertexNormals();
}
// The parchment collar is a continuous curling strip. Its loose end stays
// attached to the circumference as more of the cut side becomes exposed.
const tin=group(),panMetal=mat(0x9babad,.29,.72);
lathe([[0,.035],[.87,.035],[.935,.07],[.966,.69],[.968,.73],[.938,.735],[.913,.12],[0,.11]],panMetal,tin,80);
ring(.955,.017,.70,silver,tin);
const wrapGroup=group(),paperTx=texture(128,(x,y)=>{const k=245-7*(.5+.5*Math.cos(x/128*TAU*14+.4*Math.sin(y*.05)))**6+rand()*7;return [k,k-2,k-7];},true);
const parchment=mat(0xecd8b0,.73,0,{map:paperTx,side:T.DoubleSide,bumpMap:paperTx,bumpScale:.013});
const wrapGeo=new T.PlaneGeometry(1,1,100,7),wrapper=mesh(wrapGeo,parchment,wrapGroup);
function paperShape(amount,height){
 const pos=wrapGeo.attributes.position;
 for(let j=0;j<=7;j++)for(let i=0;i<=100;i++){
 const u=i/100,v=1-j/7,arc=u*(TAU+.16),off=Math.max(0,amount*(TAU+.16)-arc),a=arc+1.0;
 let r=.955+.013*Math.cos(arc*21+v*.6)+.026*v;
 let x=Math.sin(a)*r,z=Math.cos(a)*r;
 if(off>0){let base=amount*(TAU+.16)+1.0,dist=off*.68;
 const f=off/(amount*(TAU+.16)),leave=Math.sin(base)*r,front=Math.cos(base)*r;
 x=leave+(1.09+.43*amount-leave)*f-Math.cos(base)*Math.sin(dist)*.51*Math.sin(PI*f);
 z=front+(.61+.15*amount-front)*f+Math.sin(base+dist)*.61*Math.sin(PI*f);}
 let y=.087+v*(height+.032*Math.sin(arc*3+.8)+.014*Math.cos(arc*8))-.16*Math.min(1,off)*v;
 pos.setXYZ(j*101+i,x,y,z);}
 pos.needsUpdate=true;wrapGeo.computeVertexNormals();wrapGeo.computeBoundingSphere();wrapper.frustumCulled=false;
}paperShape(0,.87);
const tray=group();const trayM=mat(0x667b7e,.32,.65);
box(0,.07,0,2.48,.12,1.98,trayM,tray);
for(const z of [-.97,.97]){box(0,.205,z,2.49,.31,.055,trayM,tray);box(0,.36,z,2.49,.034,.075,silver,tray);}
for(const x of [-1.22,1.22])box(x,.21,0,.058,.32,1.96,trayM,tray);
curve([[-.44,.27,.99],[-.43,.28,1.12],[-.29,.32,1.19],[.29,.32,1.19],[.43,.28,1.12],[.44,.27,.99]],.039,paleBrass,tray,26);
const water=box(0,.1,0,2.39,.024,1.88,phys(0xb1c9bd,{roughness:.11,metalness:.32,transparent:true,opacity:.64}),tray);
const turntable=group();lathe([[0,.01],[.62,.01],[.65,.055],[.58,.12],[.43,.16],[.42,.23],[1.06,.25],[1.16,.30],[1.16,.37],[1.11,.4],[0,.40]],blueLight,turntable);ring(1.15,.021,.34,brass,turntable);
function plate(parent,r=1){
 const g=group(parent);lathe([[0,.04],[.45,.04],[.51,.09],[.78,.12],[.96,.175],[1,.21],[.99,.24],[.92,.236],[.75,.18],[.52,.14],[0,.14]],porcelain,g,72);ring(.948,.010,.236,brass,g);ring(.875,.008,.217,blueDark,g);g.scale.setScalar(r);return g;
}
const crustGrain=texture(128,(x,y)=>{let n=rand();return n<.06?160+44*rand():225+28*rand();},true);
crustGrain.repeat.set(5,2);
const crumbGrain=texture(128,()=>{const v=rand();return v<.09?143+rand()*65:227+rand()*28;},true);crumbGrain.repeat.set(3,3);
function cake(parent,display=false){
 const g=group(parent),sideM=mat(0xffffff,.76,0,{vertexColors:true,map:crustGrain,bumpMap:crustGrain,bumpScale:.012});
 const profile=[[.001,.025],[.77,.025],[.874,.06],[.91,.14],[.92,.33],[.91,.52],[.884,.67],[.86,.735],[.81,.79],[.72,.857],[.59,.909],[.43,.954],[.24,.983],[.001,.99]];
 const geo=new T.LatheGeometry(profile.map(a=>new T.Vector2(...a)),88,display?0:.63,display?TAU:TAU-.68);
 const pos=geo.attributes.position,col=[],base=new Float32Array(pos.array),lo=C(0xffe2a4),hi=C(0xb66b2d),cc=C(0);
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),a=Math.atan2(z,x);
 const n=.022*Math.sin(9*a+2*y)+.013*Math.sin(13*a-1);
 const b=sat((y-.62)*2.55+n+(rand()-.5)*.07);
 cc.copy(lo).lerp(hi,b);col.push(cc.r,cc.g,cc.b);}
 geo.setAttribute('color',new T.Float32BufferAttribute(col,3));const body=mesh(geo,sideM,g);body.userData.base=base;
 // Sugar dust settles on the crown in a slim crescent, leaving toasted crumb visible.
 const specks=[];for(let i=0;i<(display?170:250);i++){const a=rand()*TAU,r=Math.sqrt(rand())*.82,x=Math.sin(a)*r,z=Math.cos(a)*r;
 if(!display&&a<.63&&a>-.05)continue;
 const h=.99-.29*(r/.86)**2;let k=.004+rand()*.008;specks.push([x,h+.002,z,k,k*.55,k]);}
 instances(geoSphere,mat(0xffefcb,.89),specks,g);
 return {g,body};}
const goal=group(),stand=group(goal);
lathe([[0,.01],[.60,.01],[.67,.055],[.65,.11],[.50,.16],[.24,.25],[.22,.44],[.35,.51],[.89,.57],[1.11,.61],[1.16,.67],[1.13,.71],[.96,.69],[0,.66]],clay,stand);ring(1.13,.018,.68,paleBrass,stand);
const sampleCake=cake(goal,true);at(sampleCake.g,0,.69,0);sampleCake.g.scale.set(.9,.87,.9);
const cloche=group(goal);
glassObj(lathe([[1.098,.72],[1.094,.79],[1.078,.88],[1.057,1.28],[1.008,1.52],[.91,1.72],[.71,1.90],[.46,2.02],[.18,2.08],[.035,2.09]],glass,cloche,72));
glassObj(ring(1.1,.026,.74,glassEdge,cloche));
lathe([[0,2.07],[.142,2.07],[.15,2.105],[.08,2.15],[.083,2.19],[.128,2.24],[.128,2.30],[.083,2.345],[0,2.35]],brass,cloche,40);
const baked=cake(scene),sliceGroup=group(); // Wedge has its own two open-crumb cut faces.
const wedgeProfile=[[0,.02],[.84,.02],[.91,.09],[.915,.45],[.884,.68],[.82,.79],[.64,.90],[.42,.96],[.20,.985],[0,.99]],wedgeM=mat(0xf5d59b,.79);
const wedgeShell=lathe(wedgeProfile,wedgeM,sliceGroup,14,-.05,.68);
const wp=wedgeShell.geometry.attributes.position,wcol=[];
for(let i=0;i<wp.count;i++){const c=C(0xffdfa1).lerp(C(0xb87839),sat((wp.getY(i)-.64)*2.8));wcol.push(c.r,c.g,c.b);}
wedgeShell.geometry.setAttribute('color',new T.Float32BufferAttribute(wcol,3));wedgeM.vertexColors=true;wedgeShell.userData.rest=new Float32Array(wp.array);
for(const ang of [-.05,.63]){const sh=new T.Shape();wedgeProfile.forEach(([r,y],i)=>i?sh.lineTo(r,y):sh.moveTo(r,y));
 const cutMat=mat(0xf8dca6,.86,0,{side:T.DoubleSide,map:crumbGrain,bumpMap:crumbGrain,bumpScale:.016});
 const cutGeo=new T.ShapeGeometry(sh);const f=mesh(cutGeo,cutMat,sliceGroup);f.rotation.y=ang-PI/2;f.userData.rest=new Float32Array(cutGeo.attributes.position.array);
 const inner=mesh(cutGeo,cutMat,baked.g);inner.rotation.y=f.rotation.y;inner.userData.cutFace=true;}
const smoked=at(roundPanel(1.48,.82,.16,.016,phys(0xe3cdac,{transparent:true,opacity:.115,roughness:.12,clearcoat:1,metalness:.19,depthWrite:false}),door),0,.62,.44);smoked.castShadow=false;smoked.renderOrder=5;
const ovenCake=cake(ovenInner,true);at(ovenCake.g,0,-.29,.035);ovenCake.g.scale.set(.48,.18,.16);
const fatherPlate=plate(scene,.83);
const eggGroup=group(),egg=mat(0xd5a379,.55),eggPale=mat(0xe5c09a,.59);
lathe([[0,.02],[.21,.02],[.28,.1],[.25,.23],[.19,.27],[.09,.19]],clay,eggGroup,36);
orb(0,.37,0,.201,.275,.201,egg,eggGroup).rotation.z=-.18;
const looseEgg=orb(.40,.19,.07,.18,.265,.18,eggPale,eggGroup);looseEgg.rotation.z=1.16;looseEgg.rotation.y=-.37;
const crock=at(group(),-4.0,.78,-3.93);
lathe([[0,0],[.34,0],[.39,.07],[.40,.55],[.365,.72],[.40,.76],[.4,.80],[.34,.80],[.32,.73]],blueLight,crock);
for(let i=0;i<3;i++){const s=at(group(crock),(i-1)*.13,.26,.02*(i%2));s.rotation.z=(i-1)*.21;rod(V(0,0,0),V(0,1.13,0),.034,maple,s);orb(0,1.28,0,.11,.19,.052,walnut,s);}
const sugarPot=group();lathe([[0,0],[.32,0],[.35,.06],[.395,.43],[.37,.49],[.342,.48],[.32,.39],[0,.38]],clay,sugarPot);
for(let i=0;i<28;i++){let a=i/28*TAU;rod(V(.327*Math.sin(a),.08,.327*Math.cos(a)),V(.383*Math.sin(a),.40,.383*Math.cos(a)),.016,porcelain,sugarPot);}
orb(0,.414,0,.33,.066,.33,mat(0xfff6dc,.93),sugarPot);
const scoop=group();const spoon=orb(0,0,0,.17,.046,.236,silver,scoop);rod(V(0,.02,-.12),V(0,.075,-.84),.031,brass,scoop);orb(0,.08,-.81,.054,.032,.095,brass,scoop);
const milkJug=group();lathe([[0,0],[.18,0],[.25,.09],[.27,.34],[.20,.54],[.158,.68],[.172,.72],[.14,.72],[.13,.64]],porcelain,milkJug,48);
curve([[.18,.54,0],[.37,.55,0],[.40,.35,0],[.23,.21,0]],.039,porcelain,milkJug);
const spout=at(mesh(new T.ConeGeometry(.14,.29,4),porcelain,milkJug),-.115,.64,0);spout.rotation.z=.93;
// Rounded sleeves, ribbed cuffs, soft palms and gently bent fingers. All arm
// segments stay attached to their wrist as tools and body positions change.
const skin=mat(0xc9916b,.64),nail=mat(0xe2b69a,.53),knit=mat(0x829b92,.94),roseKnit=mat(0xb88a76,.92),dadKnit=mat(0x77868c,.9);
function arm(fabric,handed,size){
 const g=group(), palm=group(g);g.scale.setScalar(size);palm.scale.x=handed;
 orb(0,0,.01,.167,.094,.207,skin,palm);
 for(let i=0;i<4;i++){const x=(i-1.5)*.074,end=.32+(i===1?.048:i===2?.028:i===3?-.047:0);
 curve([[x*.82,.012,.08],[x,.022,.19],[x+.008,-.006,end-.04],[x+.01,-.043,end]],.038-(i===3?.005:0),skin,palm,10);
 orb(x+.01,-.041,end,.037,.036,.036,skin,palm);orb(x+.01,-.015,end-.012,.021,.009,.026,nail,palm);}
 curve([[-.10,-.002,.005],[-.17,.005,.035],[-.211,-.015,.113],[-.219,-.046,.15]],.047,skin,palm,12);orb(-.219,-.046,.15,.046,.044,.046,skin,palm);
 orb(0,-.01,-.15,.116,.084,.16,skin,g);
 rod(V(0,-.015,-.20),V(0,-.052,-2.30),.155,fabric,g,.28,32);
 orb(0,-.052,-2.30,.28,.28,.28,fabric,g);rod(V(0,-.052,-2.30),V(.21,-.56,-4.8),.28,fabric,g,.35,32);
 for(let i=0;i<6;i++){let cuff=ring(.158+i*.001,.012,0,fabric,g,28);cuff.rotation.x=0;at(cuff,0,-.015,-.20-i*.026);}
 return g;
}
const mom=arm(knit,1,1.04),motherPour=arm(knit,-1,1),dad=arm(dadKnit,-1,1.12),girl=arm(roseKnit,1,.76);
const grainGroup=group(),grainCount=54,grainData=Array.from({length:grainCount},()=>({x:0,y:0,z:0,vx:0,vz:0,vy:0,life:0}));
const grains=new T.InstancedMesh(new T.IcosahedronGeometry(.012,0),mat(0xfff4d8,.8),grainCount);grainGroup.add(grains);grains.frustumCulled=false;
const dustData=Array.from({length:32},()=>({x:(rand()-.5)*12,y:rand()*4+.05,z:rand()*6-4,v:.014+rand()*.03}));
const dust=new T.InstancedMesh(new T.SphereGeometry(1,6,4),mat(0xffe8b5,.85,0,{transparent:true,opacity:.46,depthWrite:false}),dustData.length);scene.add(dust);dust.frustumCulled=false;
const steamData=Array.from({length:15},()=>({x:0,y:0,z:0,age:9,life:2}));
const steamMesh=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),phys(0xfff1d7,{transparent:true,opacity:.07,roughness:.8,depthWrite:false}),steamData.length);scene.add(steamMesh);steamMesh.frustumCulled=false;

// Underglaze details follow the curved stoneware rather than a flat label.
const glazeInk=mat(0xd9ddd0,.29);
for(const side of [-1,1]){
 const points=[];for(let i=0;i<9;i++){const t=i/8,x=side*(.038+.37*t),y=.47+.101*t+.095*t*t,r=.86+.27*(y-.47);points.push([x,y,Math.sqrt(r*r-x*x)+.027]);}
 curve(points,.009,glazeInk,cheese,15);
 for(let i=1;i<5;i++){const f=i/5,x=side*(.038+.37*f),y=.47+.101*f+.095*f*f,r=.86+.27*(y-.47),z=Math.sqrt(r*r-x*x)+.028;
 const leaf=orb(x-side*.019,y+.033,z,.020,.060,.012,glazeInk,cheese);leaf.rotation.z=side*.60;
 const leaf2=orb(x+side*.023,y-.011,z,.016,.049,.012,glazeInk,cheese);leaf2.rotation.z=-side*.95;}
}
const crumbs=[];for(let i=0;i<120;i++){const a=rand()*TAU,r=.12+rand()*.70,k=.002+rand()*.008;
 crumbs.push([-2.23+Math.cos(a)*r,.003,1.42+Math.sin(a)*r*.43,k,k*.28,k*.8]);}
instances(new T.IcosahedronGeometry(1,0),mat(0xf0e1bf,.91),crumbs);
// Batch immutable mesh parts by their actual material and preserve UVs and
// normals. Articulating objects keep independent transforms.
function batchStatic(root,only){
 root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),buckets=new Map();
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.material.transparent||o.geometry.attributes.color||(only&&!only(o)))return;
 if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(o);});
 for(const [m,items] of buckets){if(items.length<3)continue;const pos=[],normal=[],uv=[],idx=[],v=new T.Vector3(),mat4=new T.Matrix4(),nm=new T.Matrix3();
 for(const o of items){const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;if(!p||!n)continue;
 mat4.multiplyMatrices(inv,o.matrixWorld);nm.getNormalMatrix(mat4);const offset=pos.length/3;
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mat4);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();normal.push(v.x,v.y,v.z);uv.push(u?u.getX(i):0,u?u.getY(i):0);}
 if(g.index){for(const j of g.index.array)idx.push(j+offset);}else{for(let i=0;i<p.count;i++)idx.push(i+offset);}o.removeFromParent();}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);mesh(g,m,root);}
}
batchStatic(architecture);for(const g of [mom,motherPour,dad,girl,sugarPot,crock,eggGroup])batchStatic(g);
