'use strict';
(()=>{
const T=THREE,el=document.querySelector('#world'),renderer=new T.WebGLRenderer({canvas:el,antialias:true,powerPreference:'high-performance',alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(26,1,.035,90),ray=new T.Raycaster(),pointer=new T.Vector2();
const sound=new WinterSound(),vec=(x,y,z)=>new T.Vector3(x,y,z),group=(parent=scene)=>{let a=new T.Group();parent.add(a);return a},rng=winterRandom(53422),mat=Surface.mat,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const viewH=2.15,ratio=innerWidth/innerHeight,viewW=viewH*ratio,paneW=Math.min(viewW*.862,2.45),paneH=1.62,base=.476,top=base+paneH;
const sim=new Winter(paneW/paneH),eye=vec(0,1.43,4.65),focus=vec(0,1.228,0);
const env=Surface.environment();scene.environment=env;scene.environmentIntensity=.68;scene.background=new T.Color(0xb9d0d5);scene.fog=new T.FogExp2(0xc5d4d2,.048);
const skyLight=new T.HemisphereLight(0xe0f2ff,0xa0a099,1.32);scene.add(skyLight);
const sunLight=new T.DirectionalLight(0xffebca,2.55);sunLight.position.set(3.4,5.5,-5);sunLight.target.position.set(0,.35,-.8);scene.add(sunLight,sunLight.target);sunLight.castShadow=true;sunLight.shadow.mapSize.set(2048,2048);Object.assign(sunLight.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.2,far:19});sunLight.shadow.camera.updateProjectionMatrix();sunLight.shadow.normalBias=.008;sunLight.shadow.bias=-.00024;
const boxGeo=new T.BoxGeometry(1,1,1),ballGeo=new T.SphereGeometry(1,20,14),roundGeo=new T.SphereGeometry(1,32,24);
function mesh(g,m,parent,x=0,y=0,z=0){let o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(p,x,y,z,w,h,d,m){const o=mesh(boxGeo,m,p,x,y,z);o.scale.set(w,h,d);return o}
function ell(p,x,y,z,w,h,d,m,high=false){let o=mesh(high?roundGeo:ballGeo,m,p,x,y,z);o.scale.set(w,h,d);return o}
function stick(p,a,b,r1,r2,m,n=9){let v=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r2,r1,v.length(),n),m,p);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(vec(0,1,0),v.normalize());return o}
function tube(p,points,r,m,n=20){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>vec(...a))),n,r,7,false),m,p)}
function lathe(p,profile,m,x,y,z){return mesh(new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),48),m,p,x,y,z)}
// Combine stationary parts sharing a material so dense twigs and carved profiles cost few draw calls.
function bake(p){
 let batches=new Map();
 for(const o of [...p.children]){
  if(!o.isMesh||Array.isArray(o.material))continue;
  o.updateMatrix();let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);
  let key=o.material.uuid+'_'+o.castShadow+'_'+o.receiveShadow;
  if(!batches.has(key))batches.set(key,{m:o.material,cast:o.castShadow,rec:o.receiveShadow,gs:[]});
  batches.get(key).gs.push(g);p.remove(o);
 }
 for(const b of batches.values()){
  let g=new T.BufferGeometry();for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
   let total=b.gs.reduce((v,k)=>v+k.attributes.position.count,0),arr=new Float32Array(total*size),at=0;
   for(const k of b.gs){if(k.attributes[name])arr.set(k.attributes[name].array,at);at+=k.attributes.position.count*size}
   g.setAttribute(name,new T.BufferAttribute(arr,size));
  }let o=mesh(g,b.m,p);o.castShadow=b.cast;o.receiveShadow=b.rec;
 }
}
const shell=group(),leaf=group(),sash=group(leaf),peg=group(leaf);
const painted=mat(0xb8c8c4,.53,0,{map:Surface.timber(true)}),shadowTrim=mat(0x536f72,.52),lip=mat(0xa8bab5,.42),deep=mat(0x364d51,.62),putty=mat(0x718c90,.38),oak=mat(0xcbb99d,.48,0,{map:Surface.timber(false)}),darkWood=mat(0x71604e,.51,0,{map:Surface.timber(false)}),brass=mat(0xb18a51,.30,.8),brassEdge=mat(0xd5b57c,.24,.77),blackMetal=mat(0x434843,.34,.75),plaster=mat(0xbec5b9,.88);
leaf.position.set(-paneW/2,0,0);sash.position.x=paneW/2;
// Recessed interior joinery and glazing beads, with a deep oak sill.
box(shell,0,.03,.005,14,.78,.23,deep);
for(let x=-4;x<4;x+=.155){box(shell,x,.17,.14,.143,.53,.052,shadowTrim);box(shell,x-.063,.17,.177,.013,.53,.014,deep)}
box(shell,0,base-.096,.235,12,.115,.57,darkWood);
box(shell,0,base-.06,.24,12,.068,.63,oak);box(shell,0,base-.11,.50,12,.026,.045,darkWood);
box(shell,0,base-.158,.23,12,.023,.34,lip);
// Off-camera timber and plaster also appear in the handle and glass reflections.
box(shell,0,1.65,6.12,9,3.3,.16,plaster);
box(shell,0,3.29,3.1,9,.16,6.1,painted);
box(shell,0,-.16,2.99,9,.21,6.18,oak);
for(let side of [-1,1])box(shell,side*4.45,1.62,3.06,.14,3.28,6.15,plaster);
const outer=paneW/2+.096;
for(let side of [-1,1]){
 let x=side*outer;box(shell,x,1.28,-.023,.127,2.04,.19,painted);
 box(shell,x+side*.061,1.27,.02,.018,2.02,.215,lip);
 box(shell,x+side*.093,1.27,-.063,.042,2.13,.18,shadowTrim);
 box(shell,x+side*1.06,1.28,-.115,2,2.29,.12,plaster);
 box(shell,x+side*.145,1.28,-.018,.047,2.33,.23,painted);
}
box(shell,0,top+.145,-.018,12,.13,.24,painted);box(shell,0,top+.223,-.054,12,.045,.28,lip);box(shell,0,top+.50,-.16,12,.51,.21,plaster);
box(shell,0,top+.063,-.085,paneW+.16,.041,.13,shadowTrim);
function casementRails(p,w,y0,y1,thick,z,depth,m){
 for(const sign of [-1,1])box(p,sign*(w/2+thick/2),(y0+y1)/2,z,thick,y1-y0+2*thick,depth,m);
 for(const yy of [y0-thick/2,y1+thick/2])box(p,0,yy,z,w,thick,depth,m)
}
casementRails(sash,paneW,base,top,.050,.002,.092,painted);casementRails(sash,paneW-.016,base+.008,top-.008,.013,.038,.020,putty);casementRails(sash,paneW+.011,base-.005,top+.005,.012,.052,.016,lip);
for(let y of [base+.17,top-.2]){stick(sash,vec(-paneW/2-.034,y-.052,.058),vec(-paneW/2-.034,y+.052,.058),.012,.012,brass);for(let off of [-.047,.047])ell(sash,-paneW/2-.034,y+off,.058,.013,.009,.013,brassEdge)}
// Oval escutcheon, pivot and a curved lever in aged brass.
const handleY=base+.51,handleX=paneW+.021;peg.position.set(handleX,handleY,.09);
ell(sash,handleX-paneW/2,handleY,.055,.03,.083,.011,brass,true);ell(sash,handleX-paneW/2,handleY,.066,.023,.072,.008,blackMetal,true);
for(let y of [handleY-.052,handleY+.054]){ell(sash,handleX-paneW/2,y,.076,.006,.006,.004,brassEdge);box(sash,handleX-paneW/2,y,.08,.006,.0015,.001,blackMetal)}
const leverPolish=brassEdge.clone();leverPolish.emissive.setHex(0xc99e56);leverPolish.emissiveIntensity=0;
tube(peg,[[0,0,-.025],[0,0,.015],[-.012,-.015,.044],[-.025,-.067,.05],[-.036,-.118,.052]],.011,brass);ell(peg,-.032,-.098,.052,.016,.041,.015,leverPolish).rotation.z=-.19;
const statePixels=new Uint8Array(sim.cols*sim.rows*4),stateTex=new T.DataTexture(statePixels,sim.cols,sim.rows);stateTex.minFilter=stateTex.magFilter=T.LinearFilter;stateTex.needsUpdate=true;
const frostMap=Surface.frost(sim.aspect),frostMat=mat(0xffffff,.68,.075,{map:frostMap,transparent:true,depthWrite:false,side:T.DoubleSide,bumpMap:frostMap,bumpScale:.00145});
frostMat.onBeforeCompile=s=>{
 s.uniforms.uState={value:stateTex};
 s.fragmentShader='uniform sampler2D uState;\n'+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec4 climate=texture2D(uState,vMapUv);
 float mass=climate.r;
 float edge=smoothstep(.018,.3,mass)*(1.-smoothstep(.32,.88,mass));
 float mist=smoothstep(.012,.94,mass);
 float flake=dot(sampledDiffuseColor.rgb,vec3(.21,.71,.08));
 float vein=sin(vMapUv.x*1731.+sin(vMapUv.y*18.)*.66);
 float film=climate.g*smoothstep(.44,.99,vein);
 diffuseColor.rgb*=mix(vec3(.56,.73,.82),vec3(1.),mist);
 diffuseColor.rgb+=edge*.13+film*.28;
 diffuseColor.a=clamp(.014+mist*(.89+.07*flake)+edge*.20+film*.29,0.,.998);
 `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=mix(.085,roughnessFactor,mist);')
 .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=diffuseColor.rgb*(.14+edge*.25)+vec3(.14,.19,.2)*film;');
};
const glass=mesh(new T.PlaneGeometry(paneW,paneH),frostMat,sash,0,(base+top)/2,.009);glass.castShadow=false;glass.receiveShadow=false;glass.renderOrder=4;
const clearGlass=mesh(new T.PlaneGeometry(paneW,paneH),mat(0xaed5da,.10,.72,{transparent:true,opacity:.065,side:T.DoubleSide,depthWrite:false}),sash,0,(base+top)/2,-.003);clearGlass.castShadow=false;clearGlass.renderOrder=3;
// A hand-thrown blue stoneware bud vase and a sprig of winter rose hips.
const ceramics=group(shell),vase=mat(0x638b90,.27,.13),rimGlaze=mat(0x829fa0,.27,.09),clay=mat(0x8f8072,.86),stem=mat(0x66503c,.73),hip=mat(0xaa5234,.39),hipLight=mat(0xc46d48,.42),calyx=mat(0x635344,.72);
let vx=-Math.min(viewW*.334,1.16),vz=.32,vy=base-.022;
const vs=ratio<.7?.76:1;
const vaseBody=group(ceramics);vaseBody.position.set(vx,vy,vz);vaseBody.scale.setScalar(vs);
lathe(vaseBody,[[.002,0],[.057,0],[.066,.009],[.069,.017],[.076,.026],[.095,.055],[.104,.11],[.098,.15],[.086,.168],[.063,.181],[.045,.198],[.044,.222],[.05,.226],[.05,.236],[.038,.238],[.036,.223],[.037,.199],[.001,.178]],vase,0,0,0);
lathe(vaseBody,[[.046,.224],[.051,.229],[.051,.235],[.046,.238]],rimGlaze,0,0,0);
lathe(vaseBody,[[.061,.003],[.067,.007],[.069,.014]],clay,0,0,0);
for(let j=0;j<9;j++){let y=.048+j*.011,r=.1035*Math.sqrt(Math.max(.25,1-((y-.112)/.122)**2));lathe(vaseBody,[[r,y],[r+.001,y+.0015],[r,y+.003]],j%3===0?rimGlaze:vase,0,0,0)}
for(let s=0;s<4;s++){
 let x=(s-1.5)*.047,z=(s%2-.5)*.065,h=.36+rng()*.12;
 tube(vaseBody,[[0,.18,0],[x*.35,.29,z*.5],[x*.74,h-.025,z],[x*1.3,h+.085,z*1.4]],.0028,stem);
 for(let j=0;j<3;j++){
  let by=h-.024+j*.037,xx=x*(.7+j*.23),end=vec(xx+(j%2?1:-1)*(.025+rng()*.022),by+.037+rng()*.022,z+(rng()-.5)*.04);
  stick(vaseBody,vec(xx,by,z),end,.0026,.0012,stem,6);let b=ell(vaseBody,end.x,end.y,end.z,.014,.021,.013,j%2?hip:hipLight);b.rotation.z=(rng()-.5)*.8;
  ell(vaseBody,end.x,end.y+.018,end.z,.004,.005,.004,calyx);
 }
}bake(vaseBody);
// A pair of wool mittens on the sill. Raised knit stitches follow the curved wool surface.
const wool=mat(0xb97648,.97),wool2=mat(0xc78b59,.94),woolLight=mat(0xd4ad7b,.96);
const stitchGeo=new T.SphereGeometry(1,6,4);
function mitten(p,x,y,z,turn,s){
 let o=group(p);o.position.set(x,y,z);o.rotation.y=turn;o.scale.setScalar(s);
 ell(o,0,.025,-.018,.075,.032,.12,wool,true);ell(o,-.063,.025,-.044,.027,.027,.061,wool).rotation.y=.43;
 box(o,0,.027,.084,.118,.048,.075,wool2);for(let i=-6;i<=6;i++)ell(o,i*.009,.036,.087,.0038,.022,.038,woolLight);
 for(let j=0;j<19;j++)for(let i=-7;i<=7;i++){let xx=i*.009,zz=(j-9)*.009-.025,q=1-(xx/.075)**2-((zz+.018)/.12)**2;if(q<.09)continue;
  let yy=.025+.032*Math.sqrt(q);let st=mesh(stitchGeo,(j===5||j===6)?woolLight:wool2,o,xx,yy,zz);st.scale.set(.002,.0017,.0042);st.rotation.y=(i%2?1:-1)*.48}
 bake(o);
}
let mx=Math.min(viewW*.315,1.12);mitten(shell,mx,vy,.285,-.83,vs);mitten(shell,mx-.018,vy+.028*vs,.32,-1.16,vs);
bake(shell);sash.remove(glass,clearGlass);bake(sash);sash.add(glass,clearGlass); // The pickable glass is retained separately from the frame batch.
// The dawn sky and distant orchard surround the casement in world space.
const skyMat=mat(0xd1e1e5,1,0,{side:T.BackSide,depthWrite:false,fog:false});
skyMat.onBeforeCompile=s=>{s.vertexShader='varying vec3 vDome;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vDome=position;');s.fragmentShader='varying vec3 vDome;\n'+s.fragmentShader.replace('#include <opaque_fragment>',`vec3 d=normalize(vDome);float up=smoothstep(-.04,.57,d.y);
 vec3 sky=mix(vec3(1.28,1.24,1.02),vec3(.33,.59,.8),up);
 float a=distance(d,normalize(vec3(.38,.26,-1.)));
 outgoingLight=sky+vec3(.64,.35,.13)*exp(-a*5.)+vec3(3.,2.5,1.7)*(1.-smoothstep(.026,.030,a));
 #include <opaque_fragment>`)};
const sky=mesh(new T.SphereGeometry(62,40,22),skyMat,scene);sky.castShadow=sky.receiveShadow=false;
const yard=group(),snow=mat(0xc7d7cf,.82),snowCap=mat(0xe0e7df,.81),distant=mat(0x839f9f,.94),grassBase=mat(0xa4b5a3,.91),fenceWood=mat(0x7a8071,.83,0,{map:Surface.timber(false)}),bark=mat(0x574c43,.89),barkLight=mat(0x827766,.85),birch=mat(0xc5c4b7,.86),pine1=mat(0x59766c,.91),pine2=mat(0x71887e,.95);
box(yard,0,-.084,-8,62,.16,52,grassBase);
for(let j=0;j<12;j++)ell(yard,-23+j*4,-1.35,-19-rng()*6,5+rng()*7,2.0+rng()*2,4.6,distant);
for(let j=0;j<19;j++)ell(yard,-12+j*1.45,-.27,-8-rng()*5,2.1+rng()*2, .44+rng()*.43,2.3,snow);
for(let j=0;j<32;j++){
 let x=-18+j*1.17+rng()*.5,z=-9-rng()*8,h=1.3+rng()*3.4;
 stick(yard,vec(x,0,z),vec(x,h*.73,z),h*.039,h*.019,bark,7);
 for(let k=0;k<5;k++){let y=h*(.12+k*.14),hs=h*(.44-k*.039),r=h*(.22-k*.036);
  let o=mesh(new T.ConeGeometry(r,hs,11),k%2?pine1:pine2,yard,x,y+hs/2,z);o.rotation.y=k*1.7;
  let topSnow=mesh(new T.ConeGeometry(r*.81,hs*.80,11),snow,yard,x,y+hs*.60+.008,z);topSnow.rotation.y=o.rotation.y;
 }
}
for(let i=-17;i<=17;i++){
 let x=i*.31,z=-5.3+.13*Math.sin(i*.23),h=.55+rng()*.09;
 box(yard,x,h*.5,z,.088,h,.071,fenceWood).rotation.z=(rng()-.5)*.07;
 ell(yard,x,h,z,.056,.027,.046,snowCap);
}
for(let yy of [.18,.42])box(yard,0,yy,-5.38,11,.044,.049,fenceWood);
function bareTree(x,z,h){
 let basePt=vec(x,0,z),topPt=vec(x+(rng()-.5)*.3,h*.92,z);
 stick(yard,basePt,topPt,h*.036,h*.013,birch,11);
 for(let k=1;k<24;k++){let u=k/25;let pos=basePt.clone().lerp(topPt,u);let mark=ell(yard,pos.x+(rng()-.5)*.04,pos.y,pos.z+(1-u*.63)*h*.033,.018+rng()*.04,.005+rng()*.01,.008,barkLight);mark.rotation.z=(rng()-.5)*.27}
 function branch(a,dir,len,rad,depth){
  let b=a.clone().addScaledVector(dir,len);stick(yard,a,b,rad,rad*.58,depth>1?birch:barkLight,6);
  if(depth)for(let j=0;j<2;j++){let d=dir.clone().add(vec((j?1:-1)*(.38+rng()*.7),rng()*.28-.12,(rng()-.5)*1)).normalize();branch(b,d,len*(.53+.2*rng()),rad*.56,depth-1)}
 }
 for(let j=0;j<7;j++)branch(basePt.clone().lerp(topPt,.40+j*.081),vec((j%2?1:-1)*(.36+rng()*.7),.6+rng()*.5,(rng()-.5)*.6).normalize(),h*(.15+.10*rng()),h*.013,3);
}
bareTree(-2.4,-4.85,3.15);bareTree(2.45,-5.65,4.1);bareTree(3.1,-7.15,3.9);bareTree(-4.3,-7.4,3.8);
// The near bough, with snow ridges and fruit clusters, curves into the little opening.
const bough=group(),branchRoot=vec(1.72,.66,-1.25);bough.position.copy(branchRoot);
function twigCurve(points,r){
 let pts=points.map(a=>vec(...a).sub(branchRoot));for(let i=1;i<pts.length;i++)stick(bough,pts[i-1],pts[i],r*(1-(i-1)/pts.length*.85),r*(1-i/pts.length*.85),bark,10);
 for(let i=1;i<pts.length;i++)if(r>.021){
  let a=pts[i-1].clone(),b=pts[i].clone();a.y+=r*.78*(1-(i-1)/pts.length*.85);b.y+=r*.78*(1-i/pts.length*.85);stick(bough,a,b,r*.43*(1-(i-1)/pts.length*.8),r*.42*(1-i/pts.length*.8),snowCap,8);
 }
}
const perchY=1.210,perchZ=-.68;
twigCurve([[1.72,.66,-1.25],[1.19,.83,-1.11],[.76,.916,-.94],[.41,1.086,-.78],[.12,1.166,-.70],[-.055,perchY,perchZ],[-.29,1.233,-.71],[-.47,1.299,-.75],[-.62,1.305,-.78]],.043);
twigCurve([[.56,1.02,-.83],[.61,1.24,-.92],[.54,1.40,-.91],[.57,1.52,-.94]],.021);
twigCurve([[-.27,1.233,-.71],[-.37,1.35,-.75],[-.49,1.425,-.78],[-.59,1.51,-.8]],.012);
twigCurve([[.25,1.125,-.74],[.30,1.23,-.66],[.25,1.32,-.64]],.011);
for(const [cx,cy,cz] of [[-.38,1.34,-.73],[.26,1.31,-.64],[.55,1.39,-.9],[.38,1.08,-.75]]){
 for(let i=0;i<7;i++){let dx=(rng()-.5)*.097,dy=(rng()-.55)*.061,dz=(rng()-.5)*.063;let e=vec(cx+dx,cy+dy,cz+dz).sub(branchRoot);
  stick(bough,vec(cx,cy+.014,cz).sub(branchRoot),e,.0019,.0012,stem,5);ell(bough,e.x,e.y,e.z,.013,.015,.013,i%3?hip:hipLight);ell(bough,e.x,e.y-.009,e.z+.008,.004,.004,.003,calyx)
 }
}
bake(bough);
// A European robin, modelled with overlapping contour feathers, folded primaries and three toes per foot.
const bird=group(),birdBody=group(bird),head=group(birdBody),wing=group(birdBody),farWing=group(birdBody);
const feathers=mat(0x82765c,.92),mantle=mat(0x716b55,.94),down=mat(0xd8cdb0,.98),chest=mat(0xd58448,.93),face=mat(0xc37d49,.94),quill=mat(0x635e4e,.84),featherEdge=mat(0x9e957b,.93),bill=mat(0x433f36,.39),eyeMat=mat(0x181f1c,.12,.18),gleam=mat(0xf1f3df,.18),feet=mat(0x715b4d,.53);
bird.position.set(-.019,perchY+.008,perchZ+.003);bird.rotation.y=-.24;
ell(birdBody,.004,.122,0,.123,.129,.093,down,true).rotation.z=-.20;
ell(birdBody,.031,.164,-.008,.12,.096,.087,feathers,true).rotation.z=-.37;
ell(birdBody,-.045,.164,.003,.097,.099,.09,chest,true).rotation.z=-.17;
head.position.set(-.051,.226,0);
ell(head,0,0,0,.085,.081,.076,feathers,true);ell(head,-.032,-.014,.002,.068,.068,.073,face,true);
for(let side of [-1,1]){
 ell(head,-.047,.009,side*.058,.022,.022,.013,quill,true);
 ell(head,-.049,.010,side*.068,.015,.016,.009,eyeMat,true);ell(head,-.054,.016,side*.075,.0043,.0043,.0027,gleam);
}
stick(head,vec(-.092,-.014,.001),vec(-.141,-.020,.005),.014,.001,bill,12);
for(let sign of [-1,1]){
 let w=sign===1?wing:farWing;w.position.set(.028,.178,sign*.064);
 let cover=ell(w,.014,-.007,0,.091,.052,.035,mantle,true);cover.rotation.z=-.52;
 for(let j=0;j<6;j++){let f=ell(w,.059+j*.004,-.024-j*.006,sign*(.015-j*.0025),.090-j*.003,.012,.009,j%2?quill:featherEdge);f.rotation.z=-.49+j*.017}
 for(let j=0;j<6;j++){let f=ell(w,-.011+j*.009,.005-j*.003,sign*.024,.035,.016,.011,j%2?feathers:mantle);f.rotation.z=-.5}
 for(let j=0;j<3;j++){let f=ell(birdBody,.132,.082,sign*(.008+j*.008),.103,.010,.014,j%2?quill:mantle);f.rotation.z=-.22}
 let A=vec(sign*.029,.062,sign*.029),B=vec(sign*.026+.005,.014,sign*.027+.004);stick(birdBody,A,B,.0036,.003,feet,7);
 for(let j=0;j<3;j++)tube(birdBody,[[B.x,B.y,B.z],[B.x-.005+j*.006,.013,B.z+.01],[B.x-.018+j*.012,.004,B.z+.021],[B.x-.018+j*.012,-.004,B.z+.018]],.0016,feet,7);
}
bake(head);bake(wing);bake(farWing);bake(birdBody);
const groundScaleX=Math.min(1.12,ratio*.94),wx=x=>x*groundScaleX,wz=z=>-3.5+(z+2.6)*1.06;
const garden=group(),tuftMats=[mat(0x6f8664,.9),mat(0x93a687,.92),mat(0xb8c7ae,.86),mat(0xd4dece,.81)];
const stoneMats=[mat(0x90958b,.86),mat(0x7e8680,.75),mat(0xb4b4a5,.8)];
for(let i=0;i<115;i++){
 let x=(rng()-.5)*12,z=-.7-rng()*7;if(Math.abs(x)<groundScaleX*.87&&Math.abs(z+3.5)<.90)continue;
 let s=.026+rng()**3*.12;ell(garden,x,s*.13,z,s*1.4,s*.53,s,stoneMats[i%3]);
 if(i%3===0)ell(garden,x,s*.49,z,s*.97,s*.20,s*.72,snow)
}
// Individual bent blades are triangulated, including their silvery frost tips.
let blades=[[],[],[],[]];
function blade(x,z,h,w,angle,lean,idx){
 let dx=Math.cos(angle)*w,dz=Math.sin(angle)*w,tx=lean*Math.sin(angle),tz=lean*Math.cos(angle),baseY=.0007;
 let a=[x-dx,baseY,z-dz],b=[x+dx,baseY,z+dz],c=[x+tx*.26+dx*.55,h*.64,z+tz*.26+dz*.55],d=[x+tx*.26-dx*.55,h*.64,z+tz*.26-dz*.55],e=[x+tx,h,z+tz];
 blades[idx].push(...a,...b,...c,...a,...c,...d);blades[Math.min(3,idx+1)].push(...d,...c,...e)
}
for(let i=0;i<3400;i++){
 let x=(rng()-.5)*9,z=-.31-rng()*6.7;
 if(Math.abs(x)<.95*groundScaleX&&Math.abs(z+3.49)<.97&&rng()<.86)continue;
 const scale=.018+rng()**2*.067;
 for(let j=0;j<5;j++)blade(x+(rng()-.5)*.034,z+(rng()-.5)*.035,scale*(.48+rng()),.003+rng()*.006,rng()*6.28,(rng()-.5)*.063,(rng()*3)|0);
}
for(const p of sim.patches){for(let i=0;i<115;i++){
 let angle=rng()*6.28,rad=Math.sqrt(rng())*.23,x=wx(p.x+Math.cos(angle)*rad),z=wz(p.z+Math.sin(angle)*rad*.73);
 blade(x,z,.017+rng()*.045,.003+rng()*.004,rng()*6.28,(rng()-.5)*.043,(rng()*3)|0)
}}
for(let i=0;i<4;i++){let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(blades[i],3));g.computeVertexNormals();tuftMats[i].side=T.DoubleSide;mesh(g,tuftMats[i],garden)}
bake(yard);bake(garden);
const iceMat=mat(0xd7eae5,.18,.30,{flatShading:true}),iceGeo=new T.CylinderGeometry(.59,1,1,5),columnCount=sim.patches.length*20,crystals=new T.InstancedMesh(iceGeo,iceMat,columnCount);crystals.castShadow=true;crystals.receiveShadow=true;crystals.frustumCulled=false;scene.add(crystals);
const chipMesh=new T.InstancedMesh(new T.OctahedronGeometry(1),iceMat,180);chipMesh.frustumCulled=false;scene.add(chipMesh);
const puddleMat=mat(0x8da8a6,.08,.79,{transparent:true,opacity:.94}),puddles=[];
function puddleMesh(){
 const a=[vec(0,0,0)],idx=[],n=70;
 const phase=rng()*6.28;for(let i=0;i<n;i++){let t=i/n*6.283185,r=.88+.065*Math.sin(t*3+phase)+.04*Math.sin(t*7-.8)+.02*Math.cos(t*11+phase);a.push(vec(Math.cos(t)*r,0,Math.sin(t)*r));idx.push(0,1+(i+1)%n,1+i)}
 const g=new T.BufferGeometry().setFromPoints(a);g.setIndex(idx);g.computeVertexNormals();let o=mesh(g,puddleMat,scene);o.castShadow=false;return o
}
for(let p of sim.patches)puddles.push(puddleMesh());const centerPool=puddleMesh();
// A curled alder leaf rests in the drainage hollow. Its ribs and blade are separate surfaces.
const alder=group(),leafGold=mat(0xa56937,.57,0,{side:T.DoubleSide}),leafVein=mat(0xb58d51,.68);
const lp=[],li=[];
for(let i=0;i<=16;i++){let u=i/16,z=(u-.5)*.16,w=.039*Math.sin(Math.PI*u)**.79;
 for(let j=-2;j<=2;j++){let v=j/2;lp.push(v*w+.006*Math.sin(u*5),.002+Math.abs(v)*.006+.016*(u-.38)**2+.0017*Math.sin(i*2+j),z)}
 if(i)for(let j=0;j<4;j++){let k=i*5+j;li.push(k-5,k,k+1,k-5,k+1,k-4)}
}
{let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(lp,3));g.setIndex(li);g.computeVertexNormals();mesh(g,leafGold,alder)}
tube(alder,[[0,.004,-.103],[0,.007,-.075],[.005,.004,-.024],[.002,.004,.026],[-.005,.01,.076]],.0013,leafVein);
for(let j=0;j<6;j++)for(const side of [-1,1]){let u=.14+j*.12,z=(u-.5)*.16;stick(alder,vec(.002,.005,z),vec(side*Math.sin(Math.PI*u)*.033,.009,z+.020),.00085,.00028,leafVein,5)}
bake(alder);
const moss=mat(0x89937b,.89),soil=mat(0x786e5b,.94),caps=[];
for(const p of sim.patches){
 let cap=group();cap.position.set(wx(p.x),0,wz(p.z));
 for(let i=0;i<5;i++){
  let x=(rng()-.5)*.24*groundScaleX,z=(rng()-.5)*.16,h=.048+rng()*.018;
  let c=ell(cap,x,h,z,(.044+rng()*.028)*groundScaleX,.014,.045+rng()*.018,i%2?moss:soil);c.rotation.y=rng()*2;
  ell(cap,x,h+.012,z,.047*groundScaleX,.007,.032,snow);
 }bake(cap);caps.push(cap)
}
const reflected=new T.WebGLRenderTarget(400,320,{minFilter:T.LinearFilter,magFilter:T.LinearFilter});
const mirrorCam=new T.PerspectiveCamera(26,1,.035,90),reflectProjection=new T.Matrix4();
puddleMat.onBeforeCompile=shader=>{
 shader.uniforms.winterReflection={value:reflected.texture};shader.uniforms.reflectProjection={value:reflectProjection};
 shader.vertexShader='uniform mat4 reflectProjection;varying vec4 waterProjection;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n waterProjection=reflectProjection*modelMatrix*vec4(transformed,1.0);');
 shader.fragmentShader='uniform sampler2D winterReflection;varying vec4 waterProjection;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`vec2 waterUV=waterProjection.xy/waterProjection.w*.5+.5;
 vec3 reflection=texture2D(winterReflection,clamp(waterUV,vec2(.002),vec2(.998))).rgb;
 outgoingLight=mix(outgoingLight,reflection*vec3(.88,.95,.97),.69);
 #include <opaque_fragment>`);
};
const ringMat=mat(0xc6d9cc,.12,.55,{transparent:true,opacity:.55,depthWrite:false});
const rippleMeshes=Array.from({length:9},()=>{let o=mesh(new T.TorusGeometry(1,.011,5,60),ringMat.clone(),scene);o.rotation.x=-Math.PI/2;o.castShadow=false;return o});
const dummy=new T.Object3D(),crystalTint=new T.Color();
// Condensation lenses share the same falling film as the glass shader.
const beadMat=mat(0xc5e5e8,.07,.53,{transparent:true,opacity:.68});
const beads=new T.InstancedMesh(stitchGeo,beadMat,240);beads.frustumCulled=false;beads.renderOrder=5;sash.add(beads);
const dustMat=mat(0xf2f1da,.78,0,{transparent:true,opacity:.40,emissive:0xc6d4c8,emissiveIntensity:.27,depthWrite:false});
const dust=new T.InstancedMesh(new T.OctahedronGeometry(1),dustMat,sim.motes.length);dust.frustumCulled=false;scene.add(dust);
const hint=document.querySelector('#hint'),trail=[...document.querySelectorAll('.trail span')];
const route=new T.CatmullRomCurve3([eye,vec(0,1.42,3.05),vec(.055,1.43,.89),vec(-.02,1.66,-.48),vec(0,2.43,-.59)]);
const gaze=new T.CatmullRomCurve3([focus,vec(.02,1.22,-.23),vec(-.04,1.10,-2.74),vec(0,.49,-4.06),vec(0,.035,-3.48)]);
const outsideFit=()=>Math.max(1,ratio/camera.aspect);
function vCamera(){
 let p=sim.travel;
 camera.position.copy(route.getPoint(p));let target=gaze.getPoint(p);
 // Resizing and rotating retain the physical pane and its painted state.
 const fit=Math.max(1,Math.min(paneW+.12,3.2)/(camera.aspect*2.15));
 camera.position.z+=(fit-1)*eye.z*(1-p);
 if(p>0&&outsideFit()>1){let add=(Math.min(2.4,outsideFit())-1)*p;camera.position.y+=add*1.6;camera.position.z+=add*.27}
 camera.position.x+=sim.shiver*.013;camera.lookAt(target);camera.updateMatrixWorld();
}
function film(){
 let cnt=0;
 for(let k=0;k<sim.ice.length;k++){
  let off=k*4,w=sim.water[k];statePixels[off]=Math.round(sim.ice[k]*255);statePixels[off+1]=Math.min(255,w*660);statePixels[off+2]=Math.min(255,sim.flow[k]*95);statePixels[off+3]=255;
  if(cnt<240&&w>.023&&k%11===3){
   let i=k%sim.cols,j=(k/sim.cols)|0;const rr=.0016+Math.min(.004,w*.015);
   dummy.position.set(((i+.5)/sim.cols-.5)*paneW,base+(j+.5)/sim.rows*paneH,.014);dummy.rotation.set(0,0,0);dummy.scale.set(rr,rr*(1.2+Math.min(3,sim.flow[k]*9)),rr*.52);dummy.updateMatrix();beads.setMatrixAt(cnt++,dummy.matrix)
  }
 }
 beads.count=cnt;beads.instanceMatrix.needsUpdate=true;stateTex.needsUpdate=true;
}
function gardenFrame(){
 const l=sim.leaf;alder.position.set(wx(l.x),.013+l.wet*.004,-3.5+l.z*1.06);alder.rotation.set(l.tilt,l.angle,l.tilt*.4);
 let i=0;
 for(let j=0;j<sim.patches.length;j++){let p=sim.patches[j];
  for(let c of p.columns){
   const h=(c.h*(.14+.86*p.ice)),r=.008+c.strength*.017,lean=c.fall+c.stress*.11;
   dummy.position.set(wx(p.x+c.dx)+Math.sin(lean)*h*.44,.006+h*.5*Math.cos(lean)-p.dent*.16,wz(p.z+c.dz));dummy.rotation.set(c.dx*.75,c.strength*7,-lean-c.dz*.45);dummy.scale.set(r,h,r*.83);dummy.updateMatrix();crystals.setMatrixAt(i,dummy.matrix);
   crystalTint.setRGB(1,1,1);if(sim.stage==='grass'&&j===sim.hintPatch)crystalTint.setRGB(1.58,1.38,1.12);
   crystals.setColorAt(i++,crystalTint)
  }
  let cap=caps[j],avg=p.columns.reduce((sum,c)=>sum+Math.cos(c.fall)*p.ice,0)/p.columns.length;
  cap.position.y=-.052*(1-avg)-p.dent*.36;cap.rotation.z=p.dent*.95;
  let puddle=puddles[j],s=Math.sqrt(p.water)*.70;puddle.visible=s>.018;puddle.position.set(wx(p.x),.005,wz(p.z));puddle.scale.set(s*groundScaleX,1,s*.70)
 }
 crystals.instanceMatrix.needsUpdate=true;crystals.instanceColor.needsUpdate=true;i=0;
 for(const f of sim.fragments){if(i>=180)break;dummy.position.set(wx(f.x),f.y,wz(f.z));dummy.rotation.set(f.angle,0,f.angle*.68);dummy.scale.set(.009*f.life,.018*f.life,.007*f.life);dummy.updateMatrix();chipMesh.setMatrixAt(i++,dummy.matrix)}
 chipMesh.count=i;chipMesh.instanceMatrix.needsUpdate=true;
 let sz=Math.sqrt(sim.pond)*.33;centerPool.visible=sz>.025;centerPool.position.set(0,.008,-3.5);centerPool.scale.set(sz*groundScaleX,1,sz*.72);
 for(let k=0;k<rippleMeshes.length;k++){let o=rippleMeshes[k],r=sim.ripples[k];o.visible=!!r;if(r){o.position.set(wx(r.x),.014,wz(r.z));o.scale.set(r.r*groundScaleX,r.r,r.r);o.material.opacity=r.amp*.55}}
}
let prevStage='',lastFilm=-1;
function hintPoint(){
 const age=sim.idle-4;if(age<0||['walk','return'].includes(sim.stage))return null;
 const period=4.1,lap=Math.floor(age/period),u=(age%period)/period,fade=Math.min(1,u*9,(1-u)*8);
 if(sim.stage==='frost'){
  // Each demonstration starts at an actual edge of the remaining frost.
  let side=lap%8,theta=.18+side*2.399,dx=Math.cos(theta),dy=Math.sin(theta),ux=.48,uy=.545;
  for(let d=.015;d<1.7;d+=.012){let x=.48+dx*d/paneW,y=.545+dy*d/paneH;if(x<.055||x>.94||y<.06||y>.93)break;let k=Math.floor(y*sim.rows)*sim.cols+Math.floor(x*sim.cols);ux=x;uy=y;if(sim.ice[k]>.60)break}
  let slide=Math.sin(Math.PI*clamp((u-.10)/.9,0,1)*.5);return {p:vec((ux-.5)*paneW+dx*.070*slide,base+uy*paneH+dy*.070*slide,.038),fade}
 }
 if(sim.stage==='door'&&!sim.opened)return {p:peg.localToWorld(vec(-.028,-.055-.025*Math.sin(u*Math.PI),.054)),fade};
 if(sim.stage==='grass'){let p=sim.patches[Math.max(0,sim.hintPatch)];return {p:vec(wx(p.x),.085-.043*Math.sin(u*Math.PI),wz(p.z)),fade}}
 if(sim.stage==='sun'&&sim.pond<=.24){let p=sim.patches[4];return {p:vec(wx(p.x),.04,wz(p.z)),fade}}
 if(sim.stage==='sun'&&sim.leaf.wet>.8&&lap%2===0)return {p:alder.localToWorld(vec(.012*u,.012,.02)),fade};
 if(sim.stage==='sun'&&sim.pond>.24)return {p:vec(.012,.016,-3.5+.062*Math.sin(u*Math.PI)),fade};
 return null;
}
function renderState(){
 vCamera();leverPolish.emissiveIntensity=sim.stage==='door'?(.08+.38*sim.glow)*(1-sim.latch):0;leaf.rotation.y=sim.doorAngle;peg.rotation.z=-sim.latch*.98;
 bough.rotation.z=sim.twig*.16;const f=sim.flight;
 bird.position.set(f.x,f.y,f.z);bird.rotation.z=clamp(f.vy*.10,-.15,.15);
 birdBody.rotation.z=sim.sip*.35;head.rotation.y=sim.birdLook*.68+(sim.stage==='door'?-.64:0);head.rotation.z=sim.stage==='sun'&&f.y<.095?.10*sim.birdLook+.64*sim.sip:sim.birdLook*.14;
 wing.rotation.x=-f.wing*.88;farWing.rotation.x=f.wing*.88;
 sunLight.color.setRGB(1,.91-sim.sun*.09,.76-sim.sun*.16);sunLight.intensity=2.32+sim.glow*.31+sim.sun*.9;sunLight.position.y=4.35+2.6*sim.sun;sunLight.position.x=3.45-sim.sun*.6;
 if(sim.stage==='frost'||sim.stage==='door'||sim.stage==='return'||lastFilm<0){if(Math.abs(sim.time-lastFilm)>.024||lastFilm<0){film();lastFilm=sim.time}}
 if(sim.stage!=='frost'&&sim.stage!=='door'||prevStage!==sim.stage)gardenFrame();
 let idx=0;for(const d of sim.motes){dummy.position.set(d.x,d.y,d.z);dummy.rotation.set(d.phase,0,0);dummy.scale.setScalar(.0008+d.drag*.0009);dummy.updateMatrix();dust.setMatrixAt(idx++,dummy.matrix)}dust.instanceMatrix.needsUpdate=true;
 scene.updateMatrixWorld();
 const h=hintPoint();if(h){let v=h.p.project(camera),x=(v.x*.5+.5)*innerWidth,y=(.5-v.y*.5)*innerHeight;hint.style.opacity=(.85*h.fade).toFixed(3);hint.style.transform='translate('+(x-12)+'px,'+(y-12)+'px)';}else hint.style.opacity=0;
 if(prevStage!==sim.stage){const n=({frost:0,door:1,walk:1,grass:2,sun:3,return:3})[sim.stage];trail.forEach((s,i)=>s.className=i===n?'on':i<n?'done':'');prevStage=sim.stage}
}
// Optical finish: a low-intensity wide highlight from mipmapped scene radiance and subpixel grain.
const half=renderer.extensions.has('EXT_color_buffer_float');
const target=new T.WebGLRenderTarget(1,1,{type:half?T.HalfFloatType:T.UnsignedByteType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
const post=new T.Scene(),flatCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
const composite=new T.ShaderMaterial({uniforms:{frame:{value:target.texture}},depthTest:false,depthWrite:false,vertexShader:'varying vec2 vCoord;void main(){vCoord=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D frame;varying vec2 vCoord;
void main(){vec3 c=texture2D(frame,vCoord).rgb;
vec3 bloom=textureLod(frame,vCoord,4.).rgb; c+=max(bloom-vec3(.82),vec3(0.))*.060;
gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));gl_FragColor.rgb+=(grain-.5)*.009;
}`});post.add(new T.Mesh(new T.PlaneGeometry(2,2),composite));
function resize(){let w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);target.setSize(Math.round(w*renderer.getPixelRatio()),Math.round(h*renderer.getPixelRatio()));camera.aspect=w/h;reflected.setSize(Math.max(96,Math.round(288*w/h)),288);camera.updateProjectionMatrix();vCamera()}
addEventListener('resize',resize);resize();
const groundPlane=new T.Plane(vec(0,1,0),-.018),contactPt=vec(0,0,0);let active=null;
function input(e,first){
 pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);
 if(sim.stage==='frost'){
  const hit=ray.intersectObject(glass,false)[0];if(hit){sim.setContact('glass',hit.uv.x,hit.uv.y);return}
 }else if(sim.stage==='door'){
  let handlePt=peg.localToWorld(vec(-.014,-.045,.045)).project(camera);
  let px=(handlePt.x*.5+.5)*innerWidth,py=(.5-handlePt.y*.5)*innerHeight;
  if(Math.hypot(e.clientX-px,e.clientY-py)<Math.max(36,innerHeight*.077)){sim.setContact('handle');return}
 }else if((sim.stage==='grass'||sim.stage==='sun')&&ray.ray.intersectPlane(groundPlane,contactPt)){
  let x=contactPt.x/groundScaleX,z=(contactPt.z+3.5)/1.06-2.6;
  if(sim.stage==='grass'&&sim.patches.some(p=>Math.hypot(x-p.x,z-p.z)<.29)){sim.setContact('grass',x,z);return}
  if(sim.stage==='sun'&&sim.leaf.wet>.44&&(sim.contact?.kind==='leaf'||Math.hypot(x-sim.leaf.x,z+2.6-sim.leaf.z)<.09)&&Math.hypot(x,(z+2.6)*1.45)<Math.sqrt(sim.pond)*.34){sim.setContact('leaf',x,z);return}
  if(sim.stage==='sun'&&sim.pond>.025&&Math.hypot(x,(z+2.6)*1.45)<Math.sqrt(sim.pond)*.28){sim.setContact('pool',x,z);return}
  if(sim.stage==='sun'&&sim.patches.some(p=>p.ice>.1&&Math.hypot(x-p.x,z-p.z)<.26)){sim.setContact('sunIce',x,z);return}
 }
 sim.release();if(first)sim.disturb();
}
el.addEventListener('pointerdown',e=>{if(active!==null)return;active=e.pointerId;el.setPointerCapture(active);sound.start();input(e,true)});
el.addEventListener('pointermove',e=>{if(e.pointerId===active)input(e,false)});
function release(e){if(!e||e.pointerId===active){active=null;sim.release()}}
el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);window.addEventListener('blur',()=>release());
document.querySelector('#sound').onclick=e=>e.currentTarget.setAttribute('aria-pressed',String(sound.mute()));
const full=document.querySelector('#full');if(!document.documentElement.requestFullscreen&&!document.documentElement.webkitRequestFullscreen)full.hidden=true;
full.onclick=()=>{let d=document.documentElement;if(document.fullscreenElement)document.exitFullscreen();else if(d.requestFullscreen)d.requestFullscreen().catch(()=>{});else if(d.webkitRequestFullscreen)d.webkitRequestFullscreen()};
window.__GAME__={step:dt=>sim.step(dt),getState:()=>sim.getState()};
const roomProbeTarget=new T.WebGLCubeRenderTarget(64,{type:half?T.HalfFloatType:T.UnsignedByteType});
const roomProbe=new T.CubeCamera(.036,80,roomProbeTarget);roomProbe.position.set(.01,1.34,.23);scene.add(roomProbe);
let probeReady=false;
function captureRoom(){
 if(probeReady||sim.time<.12)return;
 roomProbe.update(renderer,scene);
 for(const surface of [brass,brassEdge,leverPolish,blackMetal,vase,clearGlass.material,beadMat,frostMat]){
  surface.envMap=roomProbeTarget.texture;surface.envMapIntensity=.78;surface.needsUpdate=true;
 }
 probeReady=true;
}
let prev=null,lastReflection=-1;
const mirrorLook=vec(0,0,0),clipSurface=[new T.Plane(vec(0,1,0),-.011)],mirrorObjects=[centerPool,...puddles,...rippleMeshes];
function reflectWater(){
 if(!centerPool.visible||sim.time-lastReflection<.13)return;
 lastReflection=sim.time;mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
 mirrorCam.position.copy(camera.position);mirrorCam.position.y=.016-camera.position.y;
 camera.getWorldDirection(mirrorLook).add(camera.position);mirrorLook.y=.016-mirrorLook.y;
 mirrorCam.up.copy(camera.up).applyQuaternion(camera.quaternion);mirrorCam.up.y*=-1;mirrorCam.lookAt(mirrorLook);mirrorCam.updateMatrixWorld();
 reflectProjection.multiplyMatrices(mirrorCam.projectionMatrix,mirrorCam.matrixWorldInverse);
 const visible=mirrorObjects.map(o=>o.visible);mirrorObjects.forEach(o=>o.visible=false);
 renderer.clippingPlanes=clipSurface;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(reflected);renderer.render(scene,mirrorCam);renderer.clippingPlanes=[];renderer.shadowMap.autoUpdate=true;
 mirrorObjects.forEach((o,i)=>o.visible=visible[i]);
}
function frame(now){const d=prev===null?0:Math.min(.075,(now-prev)/1000);prev=now;if(!document.hidden){sim.step(d);renderState();sound.update(sim);captureRoom();reflectWater();renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(post,flatCam)}requestAnimationFrame(frame)}
document.addEventListener('visibilitychange',()=>{prev=null;if(document.hidden){release();if(sound.ctx)sound.ctx.suspend()}else if(sound.ctx)sound.start()});
requestAnimationFrame(frame);
})();
