'use strict';
const T=THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), TAU=Math.PI*2;
const scene=new T.Scene(), camera=new T.PerspectiveCamera(33,1,.08,75);
const canvas=document.getElementById('scene'), renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;renderer.localClippingEnabled=true;
scene.background=new T.Color(0xeed6bf);scene.fog=new T.FogExp2(0xf4ddc9,.036);
let seed=48377;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function group(parent=scene){let g=new T.Group();parent.add(g);return g}
function set(o,x,y,z){o.position.set(x,y,z);return o}
function dataTex(w,h,fn,color=true){const a=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=fn(x,y,w,h),i=4*(y*w+x);a[i]=c[0];a[i+1]=c[1];a[i+2]=c[2];a[i+3]=c[3]??255}const tex=new T.DataTexture(a,w,h);if(color)tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;return tex}
const finishJobs=[];
function progressiveTexture(w,h,fn){
 const stride=4,tex=dataTex(w/stride,h/stride,(x,y)=>fn(x*stride,y*stride,w,h));
 finishJobs.push(()=>{const full=dataTex(w,h,fn);tex.dispose();tex.image=full.image;tex.needsUpdate=true;full.dispose()});return tex
}
const rough=dataTex(32,32,()=>{let q=224+rand()*30;return [q,q,q]},false);
function mat(c,r=.62,m=0,extra={}){return new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,roughnessMap:rough,...extra})}
const woodTex=progressiveTexture(256,256,(x,y)=>{let u=x/256*TAU,v=y/256*TAU;let bend=1.7*Math.sin(u+.4*Math.sin(v))+.7*Math.sin(2*u-v),w=v*23+bend;
 let n=Math.sin(w)*.045+Math.sin(w*3+.9*Math.sin(u))* .022+.017*Math.sin(w*6)+.038*Math.sin(v*4+bend*.3)+rand()*.024;return [223*(1+n),180*(1+n),135*(1+n)]});
const stoneTex=progressiveTexture(192,192,(x,y)=>{let u=TAU*x/192,v=TAU*y/192,k=.035*Math.pow(.5+.5*Math.cos(u*2+v+.5*Math.sin(v*3)+.3*Math.sin(u*4-v*2)),17)+rand()*.015+.009*Math.sin(v*7+u*3);return[246-k*200,224-k*260,200-k*260]});stoneTex.repeat.set(3,2);
const clothTex=dataTex(128,128,(x,y)=>{const ix=x%64<28,iy=y%64<28,e=(ix?1:0)+(iy?1:0),w=(x%2)*3+(y%3===0?3:0)+rand()*4;return [244-e*12-w,222-e*31-w,198-e*25-w]});clothTex.repeat.set(8,7);
const M={wood:mat(0xffffff,.47,0,{map:woodTex}),lightwood:mat(0xffe5bd,.55,0,{map:woodTex}),darkwood:mat(0x9c6b48,.49,0,{map:woodTex}),
 brass:mat(0xc59a60,.28,.68),gold:mat(0xc9a060,.32,.47),ceramic:mat(0xfff1d8,.26),ivory:mat(0xffedd4,.52),
 rose:mat(0xd49b87,.55),pink:mat(0xe9bfaf,.56),pinkDark:mat(0xb8796c,.55),linen:mat(0xffe7cf,.88),tile:mat(0xf1d4c3,.31),
 tile2:mat(0xe7c4b3,.34),grout:mat(0xffe8d1,.87),metal:mat(0xe3dacf,.19,.93),darkMetal:mat(0x9d8d7c,.27,.84),
 nut:mat(0xa64e24,.27),nutBase:mat(0xca955c,.69),hole:mat(0x64432e,.8),cream:mat(0xfff5dc,.48),caramel:mat(0xc18a56,.5),
 stone:mat(0xffffff,.43,0,{map:stoneTex}),cloth:mat(0xffffff,.9,0,{map:clothTex,side:T.DoubleSide}),sage:mat(0x919373,.72)};
const sphGeo=new T.SphereGeometry(1,30,20), boxGeo=new T.BoxGeometry(1,1,1);
function mesh(p,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.castShadow=true;o.receiveShadow=true;p.add(o);return set(o,x,y,z)}
function ell(p,m,x,y,z,sx,sy,sz){const o=mesh(p,sphGeo,m,x,y,z);o.scale.set(sx,sy,sz);return o}
function box(p,m,x,y,z,w,h,d){const o=mesh(p,boxGeo,m,x,y,z);o.scale.set(w,h,d);return o}
function lathe(p,m,profile,x=0,y=0,z=0,n=72){return mesh(p,new T.LatheGeometry(profile.map(([a,b])=>new T.Vector2(Math.max(.00001,a),b)),n),m,x,y,z)}
function cyl(p,m,x,y,z,rt,rb,h,n=48){return mesh(p,new T.CylinderGeometry(rt,rb,h,n),m,x,y,z)}
function ring(p,m,x,y,z,r,thick,n=96){const o=mesh(p,new T.TorusGeometry(r,thick,8,n),m,x,y,z);o.rotation.x=Math.PI/2;return o}
function pipe(p,m,points,r,segments=24,sides=8){const curve=new T.CatmullRomCurve3(points.map(pt=>Array.isArray(pt)?V(...pt):pt));return mesh(p,new T.TubeGeometry(curve,segments,r,sides,false),m)}
function rod(p,m,from,to,r,r2=r){let a=V(...from),b=V(...to),c=b.clone().sub(a),o=cyl(p,m,0,0,0,r2,r,c.length(),16);o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(V(0,1,0),c.normalize());return o}
const fleckGeo=new T.SphereGeometry(1,8,5);
function dots(p,m,items){let o=new T.InstancedMesh(fleckGeo,m,items.length),dummy=new T.Object3D();
  items.forEach(([x,y,z,sx,sy,sz,rz=0],i)=>{set(dummy,x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.z=rz;dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix)});p.add(o);o.castShadow=o.receiveShadow=true;return o}
function batch(g){g.updateWorldMatrix(true,true);const inverse=g.matrixWorld.clone().invert(),buckets=new Map();
 g.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;let a=buckets.get(o.material);if(!a)buckets.set(o.material,a=[]);a.push(o)});
 for(const [m,a] of buckets){if(a.length<2)continue;let pos=[],nor=[],uv=[],idx=[],offset=0;
 for(const o of a){const geo=o.geometry,pm=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(pm),vec=V(),pn=geo.attributes.position,nn=geo.attributes.normal,tx=geo.attributes.uv;
 for(let i=0;i<pn.count;i++){vec.fromBufferAttribute(pn,i).applyMatrix4(pm);pos.push(vec.x,vec.y,vec.z);vec.fromBufferAttribute(nn,i).applyNormalMatrix(nm);nor.push(vec.x,vec.y,vec.z);uv.push(tx?tx.getX(i):0,tx?tx.getY(i):0)}
 if(geo.index){for(const i of geo.index.array)idx.push(i+offset)}else for(let i=0;i<pn.count;i++)idx.push(i+offset);offset+=pn.count;o.removeFromParent()}
 let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(nor,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);mesh(g,geo,m)}
}
const hemi=new T.HemisphereLight(0xfff1de,0xdfad96,1.35);scene.add(hemi);
const key=new T.DirectionalLight(0xffebc9,3.15);set(key,-4.7,8.3,4.4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-6.6,right:6.6,top:6.8,bottom:-5.7,near:.1,far:23});key.shadow.normalBias=.012;key.shadow.bias=-.00036;key.shadow.radius=3;scene.add(key);
function reflection(){const tex=dataTex(128,64,(x,y)=>{const u=x/128,v=y/64;
 let c=v>.48?[196,165,145]:[226,201,177];if(v>.78)c=[242,220,194];
 if(u>.11&&u<.39&&v>.47&&v<.76)c=(Math.abs((u-.11)% .091-.045)<.04&&Math.abs(v-.615)>.009)?[255,251,231]:[159,126,100];
 if(u>.5&&u<.73&&v>.45&&v<.63)c=[121,77,61];if(v<.23)c=[144,107,82];return c});tex.mapping=T.EquirectangularReflectionMapping;scene.environment=tex;scene.environmentIntensity=.63}
reflection();
const room=group(),bench=group();
box(room,M.pink,0,.12,-3.68,15,1.10,1.15);box(room,M.lightwood,0,.73,-3.64,15,.16,1.26);
box(room,M.gold,0,.608,-3.079,15,.021,.04);
for(let k=-5;k<=5;k++){box(room,M.rose,k*1.25,.19,-3.09,1.16,.65,.025);box(room,M.pink,k*1.25,.18,-3.059,1.06,.53,.025);box(room,M.brass,k*1.25,.39,-3.031,.21,.032,.043)}
box(bench,M.stone,0,-.32,1,27,.61,8.6);box(bench,M.rose,0,-.85,1,27,.46,8.51);
box(room,M.grout,0,2,-5.5,24,8,.22);
for(let j=0;j<6;j++)for(let i=-10;i<=10;i++)box(room,(i+j)%5?M.tile:M.tile2,i*1.03+(j%2)*.515,j*.61-.5,-5.34,1.014,.593,.10);
box(room,M.wood,0,2.94,-5.22,24,.15,.2);
const windowM=mat(0xfff1d0,.4,0,{emissive:0xffdcaa,emissiveIntensity:.4}), windowShade=mat(0xf3d8b4,.4,0,{emissive:0xf6ca9e,emissiveIntensity:.28});
function windowArch(x){const w=2.5,y=.65,h=2.9;const s=new T.Shape();s.moveTo(-w,0);s.lineTo(w,0);s.lineTo(w,h);s.absarc(0,h,w,0,Math.PI,false);s.closePath();mesh(room,new T.ShapeGeometry(s,56),windowM,x,y,-5.09);
 const pts=[];for(let i=0;i<=48;i++){let a=i*Math.PI/48;pts.push([x+w*Math.cos(a),y+h+w*Math.sin(a),-5.02])}pipe(room,M.lightwood,pts,.085,50);
 for(const n of [-1,-.48,0,.48,1])box(room,M.lightwood,x+n*w,y+(h+Math.sqrt(1-n*n)*w)/2,-5,w===0?0:.072,h+Math.sqrt(1-n*n)*w,.12);
 box(room,M.lightwood,x,y+h-.55,-4.99,5,.08,.14);box(room,M.lightwood,x,y+.74,-4.99,5,.065,.12);box(room,M.wood,x,y-.02,-4.92,5.28,.16,.45)}
windowArch(-2.7);
function jar(p,x,y,z,s,m){const g=group(p);set(g,x,y,z);g.scale.setScalar(s);
 lathe(g,m,[[0,0],[.27,0],[.31,.04],[.32,.11],[.32,.52],[.30,.59],[.24,.64],[.24,.67],[.01,.67]]);
 lathe(g,M.wood,[[.01,.66],[.27,.66],[.28,.69],[.27,.72],[0,.73]]);ell(g,M.brass,0,.76,0,.06,.046,.06);
 ring(g,M.gold,0,.18,0,.32,.012);ring(g,M.gold,0,.50,0,.32,.008);return g}
for(let k=0;k<2;k++){let y=.99+1.8*k;box(room,M.wood,3.9,y,-4.8,4.8,.13,.7);
 for(let x of [2,5.6]){rod(room,M.brass,[x,y-.56,-5.13],[x,y-.07,-4.56],.035);box(room,M.gold,x,y-.28,-5.13,.08,.56,.08)}
 for(let i=0;i<3;i++)jar(room,2.35+i*.82,y+.07,-4.79,.74+(i%2)*.29,i%2?M.pink:M.ceramic);
 for(let i=0;i<4;i++)lathe(room,M.ceramic,[[0,0],[.34,0],[.48,.05],[.54,.1],[.53,.13],[.34,.06],[0,.04]],5.18,y+.07+i*.066,-4.77)}
// Folded gingham, with a sewn hem and short woven fringe.
const cloth=group();set(cloth,-1.66,.006,.62);cloth.rotation.y=-.29;
function fabric(x,z){return .018+.029*(.5+.5*Math.sin(6*x+1.9*z))*(.4+.6*Math.abs(x)/1.5)+.018*Math.cos(z*2.3-x*3.4)}
{let geo=new T.PlaneGeometry(2.85,3.9,32,44);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,fabric(p.getX(i),p.getZ(i)));geo.computeVertexNormals();mesh(cloth,geo,M.cloth);
 for(const x of [-1.4,1.4]){let pts=[];for(let i=0;i<20;i++){let z=-1.94+i*3.88/19;pts.push([x,fabric(x,z)+.009,z])}pipe(cloth,M.linen,pts,.011,35,5)}
 for(let i=0;i<58;i++){let x=-1.4+i*.049;rod(cloth,M.linen,[x,fabric(x,1.93),1.93],[x+.013*Math.sin(i),.012,2.03+rand()*.055],.009)}
 batch(cloth)}
const stand=group(),wheel=group(stand);
lathe(stand,M.darkwood,[[0,.038],[1.15,.038],[1.23,.08],[1.22,.17],[1.13,.2],[.96,.22],[.96,.32],[0,.32]]);
lathe(wheel,M.wood,[[0,.19],[1.5,.19],[1.70,.23],[1.79,.28],[1.81,.32],[1.80,.40],[1.84,.43],[1.84,.48],[1.79,.53],[1.69,.55],[0,.55]]);
ring(wheel,M.gold,0,.289,0,1.794,.018);ring(wheel,M.darkwood,0,.401,0,1.803,.013);ring(wheel,M.wood,0,.48,0,1.805,.027);
for(let r of [1.57,1.61,1.69])ring(wheel,M.darkwood,0,.549,0,r,.005);
const ribs=group(wheel);for(let i=0;i<132;i++){let a=i/132*TAU;let o=ell(ribs,M.lightwood,1.804*Math.sin(a),.35,1.804*Math.cos(a),.018,.046,.009);o.geometry=fleckGeo;o.rotation.y=a+.12}batch(ribs);
const food=group(), cookieM=mat(0xffffff,.84,0,{vertexColors:true});
function biscuit(p){let geo=new T.CylinderGeometry(1.10,1.09,.21,144,5),pos=geo.attributes.position,col=[];
 for(let i=0;i<pos.count;i++){let x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),r=Math.hypot(x,z),a=Math.atan2(x,z);
 const scallop=1+.018*Math.cos(a*24)+.004*Math.sin(7*a);pos.setXYZ(i,x*scallop,y+.004*Math.sin(3*a)*r,z*scallop);
 let c=new T.Color(y>.099?0xe6b575:y<-.088?0xae6938:0xc78c4c);c.multiplyScalar(.92+.1*rand());col.push(c.r,c.g,c.b)}
 geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.computeVertexNormals();mesh(p,geo,cookieM,0,.672,0);
 let dark=[],light=[],pin=[];for(let i=0;i<520;i++){let r=Math.sqrt(rand())*1.075,a=rand()*TAU,s=.004+rand()*.011;(i%4===0?dark:light).push([r*Math.cos(a),.778+rand()*.002,r*Math.sin(a),s,.0025,s*(.5+rand())])}
 for(let j=0;j<2;j++)for(let i=0;i<(j?20:10);i++){let a=i*TAU/(j?20:10)+j*.12,r=j?.83:.43;pin.push([Math.sin(a)*r,.779,Math.cos(a)*r,.027,.003,.024])}
 dots(p,mat(0xb7844c,.85),dark);dots(p,mat(0xedd195,.89),light);dots(p,mat(0xc49052,.9),pin);
 for(let i=0;i<2;i++)ring(p,mat(i?0xe4b375:0xd09a5c,.77),0,.779,0,.973+i*.035,.006);
}
const biscuitGroup=group(food);biscuit(biscuitGroup);
const dome=group(food),domeMat=M.cream.clone();
const domeGeo=new T.SphereGeometry(1,72,34,0,TAU,0,Math.PI/2);const creamMesh=mesh(dome,domeGeo,domeMat);
function makeNut(p,scale=1){let g=group(p);g.scale.setScalar(scale);
 let profile=[[0,0],[.15,.002],[.26,.045],[.316,.13],[.32,.21],[.29,.30],[.23,.38],[.14,.445],[.069,.49],[.025,.542],[0,.558]];
 let geo=new T.LatheGeometry(profile.map(pt=>new T.Vector2(...pt)),48),a=geo.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i),theta=Math.atan2(a.getX(i),a.getZ(i));let b=1+.023*Math.sin(8*theta+y*5)+.014*Math.sin(13*theta);a.setXYZ(i,a.getX(i)*b+y*y*.29,y,a.getZ(i)*.84*b)}geo.computeVertexNormals();mesh(g,geo,M.nut);
 ell(g,M.nutBase,0,.041,.006,.25,.062,.21);
 const marks=[];for(let i=0;i<30;i++){let t=rand()*TAU,r=rand();marks.push([Math.sin(t)*r*.22,.012,Math.cos(t)*r*.18,.008,.005,.007])}dots(g,M.hole,marks);
 return g}
function leaf(p,x,y,z,size,rotation,color){let g=group(p);set(g,x,y,z);g.scale.setScalar(size);g.rotation.y=rotation;
 const vertices=[],indices=[];for(let i=0;i<=32;i++){let t=i/32,wd=.245*Math.pow(Math.sin(Math.PI*t),.85)*(i%2?.88:1);
 for(let j=-1;j<=1;j++){vertices.push(j*wd,.04+.14*t*t-.054*Math.abs(j)*Math.sin(Math.PI*t),t-.5)}
 if(i){let a=3*i;for(let k=0;k<2;k++)indices.push(a-3+k,a+k,a-2+k,a-2+k,a+k,a+1+k)}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const m=mat(color,.78,0,{side:T.DoubleSide});mesh(g,geo,m);
 pipe(g,M.nutBase,[[0,.04,-.65],[0,.04,-.5],[0,.08,0],[0,.18,.5]],.009,12,5);
 for(let i=0;i<5;i++){let t=(i+1)/7,w=.216*Math.sin(Math.PI*t);for(let j of [-1,1])rod(g,M.nutBase,[0,.045+.14*t*t,t-.5],[w*j,.015+.14*(t+.1)**2,t-.39],.0045)}return g}
function fluted(p,m,r,h){let pr=[[0,0],[.74,.008],[.85,.02],[.99,h*.85],[1,h],[.985,h+.012],[.84,.038],[.74,.028],[0,.027]];
 let geo=new T.LatheGeometry(pr.map(([a,b])=>new T.Vector2(a*r,b)),128),v=geo.attributes.position;for(let i=0;i<v.count;i++){const x=v.getX(i),z=v.getZ(i),y=v.getY(i),f=1+.039*Math.cos(Math.atan2(x,z)*32)*Math.min(1,y/h);v.setXYZ(i,x*f,y,z*f)}geo.computeVertexNormals();return mesh(p,geo,m)}
const sample=group();set(sample,-2.52,0,-1.52);
lathe(sample,M.ceramic,[[0,.013],[.77,.013],[.83,.05],[.82,.11],[.68,.15],[.34,.17],[.23,.26],[.22,.43],[.28,.50],[.73,.56],[.94,.62],[1.01,.70],[1.01,.74],[.95,.77],[0,.77]]);
ring(sample,M.gold,0,.718,0,1.012,.012);ring(sample,M.gold,0,.117,0,.777,.012);
const cakeExample=group(sample);cakeExample.position.y=.77;fluted(cakeExample,M.rose,.84,.15);
lathe(cakeExample,M.caramel,[[0,.065],[.65,.065],[.68,.13],[.63,.23],[.52,.45],[.39,.63],[.23,.82],[0,.89]]);
const strandMats=[0xc69561,0xc18b55,0xd4a36e,0xbc8653,0xc99868].map(c=>mat(c,.47));
for(let lane=0;lane<5;lane++){let pts=[];for(let k=0;k<=340;k++){
 const f=k/340,ang=f*TAU*7.3+lane*.028,h=.145+.72*f+lane*.024+.025*Math.sin(ang*2+.2)+.022*Math.sin(ang*3.0+f*3);
 let r=.735*Math.pow(Math.max(.035,1-(h-.13)/.93),.64)+.018*Math.cos(ang*2)+.012*Math.sin(ang*5+lane*.07);
 pts.push([r*Math.sin(ang),h,r*.96*Math.cos(ang)])}
 pipe(cakeExample,strandMats[lane],pts,.026,310,7)}
const topEx=makeNut(cakeExample,.94);set(topEx,-.01,.88,0);topEx.rotation.z=-.15;
const goldLeaf=leaf(cakeExample,.235,1.06,-.025,.56,-.7,0xc99c46);goldLeaf.rotation.z=-.33;
let spr=[];for(let i=0;i<36;i++){let a=rand()*TAU,r=.14+.63*rand();spr.push([Math.sin(a)*r,.995-Math.pow(r/.77,1.62)*.75+.038,Math.cos(a)*r,.012,.008,.009])}dots(cakeExample,M.ivory,spr);batch(cakeExample);
const dish=group();lathe(dish,M.ceramic,[[0,.02],[.41,.02],[.47,.07],[.56,.145],[.59,.20],[.58,.225],[.54,.225],[.45,.13],[.25,.10],[0,.10]]);
ring(dish,M.gold,0,.21,0,.579,.012);const topping=makeNut(scene,1.06);
const fore=group();let nut1=makeNut(fore,.86);set(nut1,-2.39,.081,1.24);nut1.rotation.z=-.36;let nut2=makeNut(fore,.7);set(nut2,-2.76,.06,.88);nut2.rotation.z=.46;
leaf(fore,-2.73,.07,1.62,1.02,-1.36,0xb0733d);leaf(fore,-2.57,.08,1.76,.73,.99,0xd29b52);batch(fore);
// Hinged ice-cream disher. The enamel grip, spring lever and scraper share the bowl pivot.
const scoop=group(),hood=group(scoop);
hood.rotation.x=-.30;
const steelShell=lathe(hood,M.metal,[[.887,0],[.93,.015],[.95,.06],[.943,.17],[.912,.29],[.846,.42],[.755,.54],[.63,.65],[.466,.735],[.283,.788],[.07,.812],[0,.815]]);
ring(hood,M.darkMetal,0,.027,0,.941,.037);ring(hood,M.metal,0,.044,0,.949,.022);
const neckA=[.76,.34,-.04],neckB=[1.37,.61,-.04];rod(scoop,M.metal,neckA,neckB,.14,.10);
const grip=group(scoop);set(grip,1.17,.53,-.04);grip.rotation.z=-1.15;
lathe(grip,M.brass,[[0,0],[.135,0],[.141,.04],[.14,.15],[.124,.18],[0,.18]]);
lathe(grip,M.rose,[[0,.12],[.118,.12],[.142,.18],[.157,.36],[.157,1.16],[.147,1.29],[.115,1.36],[.05,1.40],[0,1.40]]);
for(let h of [.20,.235,1.20])ring(grip,M.gold,0,h,0,h>1?.156:.146,.009);
const lever=group(scoop);set(lever,.80,.14,.08);
pipe(lever,M.metal,[[0,0,0],[.22,-.09,0],[.47,-.1,0],[.75,-.02,0],[1.12,.17,0],[1.28,.29,0]],.045,26);
const thumb=ell(lever,M.pink,1.17,.235,0,.24,.064,.098);thumb.rotation.z=.41;
const axle=cyl(scoop,M.brass,.83,.23,.145,.115,.115,.13);axle.rotation.x=Math.PI/2;
ell(scoop,M.darkMetal,.83,.23,.224,.057,.057,.018);box(scoop,M.metal,.83,.23,.243,.058,.010,.004).rotation.z=.45;
const spring=[];for(let i=0;i<100;i++){let f=i/99,a=f*TAU*7;spring.push([1.02+f*.26,.25+f*.10+Math.sin(a)*.075,.015+Math.cos(a)*.075])}pipe(scoop,M.darkMetal,spring,.015,100,6);
const bag=group(),bagSkin=mat(0xe2a994,.57);
lathe(bag,M.metal,[[.105,0],[.135,.015],[.147,.065],[.19,.3],[.21,.37],[.217,.405],[.20,.44],[0,.44]]);
cyl(bag,M.darkMetal,0,.005,0,.107,.107,.014);for(let i=0;i<7;i++){let a=i*TAU/6;let r=i===6?0:.065;cyl(bag,M.hole,r*Math.sin(a),-.004,r*Math.cos(a),.023,.023,.006,12)}
lathe(bag,M.ceramic,[[0,.32],[.206,.32],[.227,.36],[.235,.46],[.22,.49],[0,.49]]);
for(let y of [.354,.388,.425,.459])ring(bag,M.gold,0,y,0,.228,.008);
let bagGeo=new T.LatheGeometry([[.17,.44],[.229,.49],[.266,.61],[.324,.79],[.387,1.03],[.448,1.30],[.47,1.49],[.46,1.62],[.39,1.76],[.21,1.89],[.126,1.96],[.088,2.02],[.13,2.09],[.22,2.20],[.26,2.31],[.22,2.35],[.06,2.25]].map(p=>new T.Vector2(...p)),96);
const bp=bagGeo.attributes.position;for(let i=0;i<bp.count;i++){let x=bp.getX(i),y=bp.getY(i),z=bp.getZ(i),a=Math.atan2(x,z);
let f=1+(.025+.14*Math.pow(Math.min(1,Math.abs(y-1.05)),2))*Math.cos(9*a+y*1.4)+.026*Math.sin(3*a-y);bp.setXYZ(i,x*f+.035*y*y,y+(y>2.25?.051*Math.sin(5*a):0),z*f*.86)}bagGeo.computeVertexNormals();mesh(bag,bagGeo,bagSkin);
for(let i=0;i<3;i++)ring(bag,M.linen,.14,1.972+i*.034,0,.123,.025);
pipe(bag,M.rose,[[.17,2,.01],[.43,2.1,.02],[.48,1.97,0],[.25,1.99,0],[.38,1.72,.13]],.033,25);
pipe(bag,M.rose,[[.1,2,0],[-.13,2.07,0],[-.16,1.92,0],[.13,1.99,0],[-.04,1.68,.16]],.029,28);
const seam=[];for(let j=0;j<16;j++){let f=j/15;seam.push([.046+.11*f,.48+f*1.35,.86*(.22+.25*Math.sin(f*2.14))])}pipe(bag,M.pink,seam,.012,28);
const rack=group();lathe(rack,M.wood,[[0,.02],[.46,.02],[.47,.08],[.43,.12],[.29,.16],[0,.16]]);
pipe(rack,M.brass,[[0,.12,0],[0,1.7,0],[0,2.58,0],[-.07,2.82,0],[-.25,2.91,.04],[-.42,2.80,.12],[-.40,2.62,.19]],.04,40);
ell(rack,M.gold,-.40,2.61,.19,.065,.068,.065);batch(rack);
const tray=group();fluted(tray,M.linen,1.34,.16);ring(tray,M.rose,0,.038,0,.98,.013);
const spoon=group();const spoonHead=lathe(spoon,M.metal,[[0,-.053],[.16,-.048],[.25,-.02],[.32,.032],[.36,.081],[.36,.096],[.347,.097],[.31,.060],[.248,.012],[.16,-.018],[0,-.024]]);spoonHead.scale.z=1.39;spoonHead.rotation.x=-.10;
pipe(spoon,M.metal,[[.10,.01,-.22],[.24,.05,-.42],[.45,.11,-.73],[.73,.19,-1.1]],.057,22);
rod(spoon,M.brass,[.64,.17,-.99],[.75,.2,-1.15],.076);
const spoongrip=ell(spoon,M.rose,.98,.25,-1.48,.092,.082,.48);spoongrip.rotation.y=-.58;
const mouthful=group(spoon);ell(mouthful,M.cream,0,.085,0,.255,.19,.29);
const spoonFilling=ell(mouthful,M.caramel,0,.17,0,.252,.08,.276);const spoonLayers=group(mouthful);for(let i=0;i<9;i++){const x=(i-4)*.054;pipe(spoonLayers,strandMats[i%5],[[x,.13,.22],[x+.012,.26,.11],[x-.012,.28,-.07],[x,.18,-.23]],.022,15,7)}
// The kitchen staff stay behind the counter. Separate head and arm pivots follow the work.
const skin=mat(0xe9b496,.65),skinLight=mat(0xf1c2a3,.69),blush=mat(0xde9f88,.8),hair=mat(0x684332,.73),silver=mat(0xc5b9a9,.77),silverDark=mat(0xb7a897,.7),ink=mat(0x563e34,.72);
function human(parent,young){
 const g=group(parent),head=group(g),hm=young?hair:silver,sm=young?skinLight:skin,sz=young?.88:1;
 g.scale.setScalar(sz);
 lathe(g,young?M.sage:M.rose,[[0,-.48],[.48,-.46],[.50,.07],[.56,.38],[.52,.61],[.38,.75],[.20,.77],[0,.76]],0,0,0,40);
 ell(g,M.linen,0,.21,.26,.403,.58,.28);for(let side of [-1,1]){let strap=box(g,M.linen,side*.30,.59,.282,.098,.45,.064);strap.rotation.z=-side*.16}
 ell(g,sm,0,.83,0,.19,.22,.20);set(head,0,1.35,0);
 ell(head,sm,0,0,0,.457,.503,.405);
 for(let s of [-1,1]){ell(head,sm,.422*s,-.04,0,.085,.115,.084);ell(head,blush,s*.268,-.106,.318,.083,.034,.014);
 const eye=ell(head,ink,s*.176,-.009,.366,.030,.042,.018);eye.rotation.z=-.13*s;
 pipe(head,hm,[[s*.096,.107,.388],[s*.17,.133,.37],[s*.248,.115,.33]],.014,8,6)}
 ell(head,sm,0,-.071,.392,.088,.084,.089);pipe(head,mat(0xa46e5c,.72),[[-.083,-.199,.35],[0,-.216,.365],[.08,-.196,.346]],.012,12,6);
 const hairGeo=new T.SphereGeometry(1,44,20,0,TAU,0,1.64),hp=hairGeo.attributes.position;
 for(let i=0;i<hp.count;i++){let x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i);let edge=Math.max(0,1-y);
 hp.setXYZ(i,x*.474,y*.50+.05+edge*(z>.0?(.16*z+.038*Math.sin(x*5)):z*.37),z*.423-.018)}hairGeo.computeVertexNormals();mesh(head,hairGeo,hm);
 if(young){for(const s of [-1,1]){ell(head,hair,s*.385,-.065,-.038,.109,.31,.289);ell(head,hair,s*.35,-.28,-.17,.168,.17,.15)}
 let lock=ell(head,hair,-.14,.277,.293,.29,.103,.104);lock.rotation.z=.38;
 for(let s of [-1,1]){let bow=ell(head,M.rose,.378+s*.061,.218,.213,.087,.06,.045);bow.rotation.z=s*.42}ell(head,M.gold,.381,.216,.251,.034,.034,.021);
 }else{
 ell(head,silverDark,0,.21,-.392,.26,.24,.22);ell(head,silver,-.02,.22,-.45,.24,.22,.18);
 for(let k=0;k<8;k++){let a=k/8*Math.PI*1.7-.8,pts=[];for(let i=0;i<=12;i++){let t=i/12,phi=.20+t*1.10,ang=a+.53*t;pts.push([.476*Math.sin(phi)*Math.sin(ang),.55*Math.cos(phi)+.095,.43*Math.sin(phi)*Math.cos(ang)-.017])}pipe(head,silverDark,pts,.008,18,5)}
 for(let s of [-1,1]){const spec=mesh(head,new T.TorusGeometry(.128,.012,6,32),M.brass,s*.175,-.008,.393);spec.rotation.y=s*.24;pipe(head,M.brass,[[s*.29,.004,.37],[s*.40,.029,.20],[s*.445,.044,.014]],.012,10)}
 pipe(head,M.brass,[[-.052,.01,.399],[0,.037,.427],[.052,.01,.399]],.012,9)}
 finishJobs.push(()=>batch(head));return {g,head,young}
}
const grandma=human(scene,false),girl=human(scene,true);const grannyArm=group(),girlArms=group(girl.g);
for(let s of [-1,1]){ell(girlArms,M.sage,s*.40,.29,.19,.168,.35,.17).rotation.z=s*.22;ell(girlArms,skinLight,s*.32,.09,.38,.115,.117,.126)}
const fixedArm=ell(grandma.g,M.rose,.46,.26,.10,.172,.38,.185);fixedArm.rotation.z=.19;ell(grandma.g,skin,.42,-.01,.21,.13,.16,.13);
const sleeve=ell(grannyArm,M.rose,0,0,0,.18,1,.18),forearm=ell(grannyArm,M.pink,0,0,0,.15,1,.15),cuff=ell(grannyArm,M.linen,0,0,0,.142,.11,.145);
function handModel(p,m){const g=group(p);ell(g,m,0,0,0,.14,.093,.156);for(let j=0;j<4;j++){let finger=ell(g,m,(j-1.5)*.063,-.021,.115,.033,.042,.104-Math.abs(j-1.3)*.011);finger.rotation.x=.36}
 ell(g,m,-.128,-.009,.04,.055,.055,.104).rotation.y=-.54;batch(g);return g}
const grannyHand=handModel(grannyArm,skin);
function linkSegment(obj,a,b,r){obj.position.copy(a).lerp(b,.5);obj.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());obj.scale.set(r,a.distanceTo(b)/2+r*.3,r)}
// Low, scalloped canvas valance of the service window.
const valance=group(),awningIvory=mat(0xf8e6ca,.85),awningRose=mat(0xddae9c,.83);
{
 const w=.52,s=new T.Shape();s.moveTo(-w/2,.68);s.lineTo(w/2,.68);s.lineTo(w/2,.13);s.bezierCurveTo(w/2,-.045,w*.17,-.12,0,-.12);s.bezierCurveTo(-w*.17,-.12,-w/2,-.045,-w/2,.13);s.closePath();
 const flounce=new T.ExtrudeGeometry(s,{depth:.045,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008,bevelThickness:.008,curveSegments:8});
 const pts=[];for(let k=0;k<15;k++){let a=Math.PI*k/14;pts.push(V(w*.49*Math.cos(a),.113-.197*Math.sin(a),.055))}
 const hem=new T.TubeGeometry(new T.CatmullRomCurve3(pts),16,.008,5,false);
 for(let parity=0;parity<2;parity++){
  const n=parity?16:17,panels=new T.InstancedMesh(flounce,parity?awningIvory:awningRose,n),stitch=new T.InstancedMesh(hem,parity?M.linen:M.pink,n);
  for(let i=0;i<n;i++){const matrix=new T.Matrix4().makeTranslation((-16+parity+i*2)*w,0,0);panels.setMatrixAt(i,matrix);stitch.setMatrixAt(i,matrix)}
  panels.castShadow=panels.receiveShadow=true;valance.add(panels,stitch)
 }
}
batch(room);
const autumn=group();
lathe(autumn,M.ceramic,[[0,0],[.28,0],[.34,.08],[.38,.38],[.34,.55],[.17,.70],[.15,.88],[.18,.89],[.18,.94],[.13,.94],[.13,.88]]);
finishJobs.push(()=>{for(let k=0;k<3;k++){const dx=(k-1)*.47,top=2.32+rand()*.54;pipe(autumn,M.darkwood,[[0,.73,0],[dx*.30,1.37,0],[dx*.75,1.98,-.09],[dx,top,-.15]],.018,20);
 for(let j=0;j<5;j++){let t=(j+1)/6,side=j%2?1:-1,x=dx*t+.20*side,y=1.12+t*(top-1.0);
 rod(autumn,M.darkwood,[dx*t,y-.17,-.05],[x,y,-.08],.011,.006);let l=leaf(autumn,x,y,-.11,.41+rand()*.14,side*1.21, j%3?0xc6975e:0x9b9a6b);l.rotation.z=side*.50;l.rotation.x=.67}}
batch(autumn)});
const penumbra=dataTex(64,64,(x,y)=>{let r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5);return [104,67,44,Math.round(99*Math.pow(Math.max(0,1-r*r),3))]});
function contact(parent,x,y,z,rx,rz,opacity=.7){let m=mat(0xffffff,1,0,{map:penumbra,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});let o=mesh(parent,new T.PlaneGeometry(rx*2,rz*2),m,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=false;return o}
contact(stand,.07,.033,.05,1.85,1.65,.7);contact(sample,0,.014,0,1.04,.96);contact(food,0,.563,0,1.3,1.28,.66);contact(dish,0,.011,0,.68,.61);
const crumbBits=[];for(let i=0;i<52;i++){let a=rand()*TAU,r=1.17+rand()*.49,s=.008+Math.pow(rand(),3)*.023;crumbBits.push([r*Math.sin(a),.558+s*.3,r*Math.cos(a),s,s*.51,s*.7])}dots(wheel,mat(0xd5a062,.79),crumbBits);
const demo=group(),porcelain=mat(0xffefcf,.45),guideHand=group(demo);
ell(guideHand,porcelain,.13,.28,0,.165,.162,.075);
ell(guideHand,porcelain,.008,.158,.003,.052,.184,.059).rotation.z=.0;
for(let i=0;i<3;i++)ell(guideHand,porcelain,.109+i*.085,.215,0,.052,.094-i*.009,.069);
ell(guideHand,porcelain,.022,.32,0,.065,.126,.065).rotation.z=-.77;
const demoCuff=box(guideHand,M.rose,.155,.444,0,.28,.106,.15);demoCuff.rotation.z=-.06;
guideHand.rotation.z=.47;batch(guideHand);
const vapour=[];for(let i=0;i<18;i++){let m=mat(0xffe7b9,.9,0,{transparent:true,depthWrite:false,opacity:.4});
 const mote=ell(scene,m,0,0,0,.006,.006,.006);mote.castShadow=false;vapour.push(mote)}

const lip=group(stand);
const lg=new T.LatheGeometry([[1.72,.305],[1.798,.309],[1.818,.327],[1.82,.392],[1.80,.407],[1.73,.405]].map(p=>new T.Vector2(...p)),48,-.51,1.02);
mesh(lip,lg,M.wood);for(let j of [-1,1])ell(lip,M.brass,.65*j,.361,1.694,.025,.025,.014);
const pot=group();lathe(pot,M.rose,[[0,0],[.28,0],[.33,.05],[.36,.33],[.35,.41],[.319,.41],[.31,.11],[0,.06]]);
ring(pot,M.brass,0,.401,0,.345,.019);cyl(pot,M.caramel,0,.34,0,.33,.33,.018);
pipe(pot,M.rose,[[.31,.31,0],[.49,.34,0],[.55,.24,0],[.48,.13,0],[.33,.12,0]],.041,16);
const vapMat=mat(0xfff8e5,1,0,{transparent:true,opacity:.105,depthWrite:false,side:T.DoubleSide,vertexColors:true});
const wispGeo=new T.PlaneGeometry(1,1,2,13),wispCol=[];for(let j=0;j<14;j++)for(let k=0;k<3;k++)wispCol.push(1,1,1,k===1?Math.sin(j/13*Math.PI)*.88:0);
wispGeo.setAttribute('color',new T.Float32BufferAttribute(wispCol,4));const wisp=mesh(pot,wispGeo,vapMat,0,.35,0);wisp.castShadow=false;wisp.frustumCulled=false;
