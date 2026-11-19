'use strict';
const T=THREE, scene=new T.Scene(), world=document.querySelector('#world');
const renderer=new T.WebGLRenderer({canvas:world,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(1.65,devicePixelRatio)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
scene.background=new T.Color(0xe6d4bc);scene.fog=new T.FogExp2(0xe5d3bb,.027);
const camera=new T.PerspectiveCamera(38,1,.07,75), sim=new Pastry.Kitchen(), sat=Pastry.clamp;
let seed=44362; function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const V=(x,y,z)=>new T.Vector3(x,y,z), C=c=>new T.Color(c), PI=Math.PI, TAU=PI*2;
function group(parent=scene){const g=new T.Group();parent.add(g);return g;}
function mesh(geo,m,parent=scene){const o=new T.Mesh(geo,m);parent.add(o);o.castShadow=true;o.receiveShadow=true;return o;}
function at(o,x,y,z){o.position.set(x,y,z);return o;}
function texture(n,fn,srgb=false){const data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const b=(x+y*n)*4,a=fn(x,y);for(let k=0;k<3;k++)data[b+k]=Array.isArray(a)?a[k]:a;data[b+3]=255;}
 const tx=new T.DataTexture(data,n,n);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.magFilter=T.LinearFilter;tx.minFilter=T.LinearMipmapLinearFilter;tx.generateMipmaps=true;tx.needsUpdate=true;if(srgb)tx.colorSpace=T.SRGBColorSpace;return tx;}
const roughMap=texture(32,()=>223+32*rand());
function mat(color,roughness=.54,metalness=0,extra={}){return new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:roughMap,...extra});}
function phys(color,extra={}){return new T.MeshPhysicalMaterial({color,roughness:.16,roughnessMap:roughMap,...extra});}
const clay=mat(0xf3e8d0,.32), porcelain=phys(0xe5ede3,{roughness:.20,clearcoat:.6}), blue=mat(0x668c95,.43), blueDark=mat(0x446a74,.36), blueLight=mat(0xadc7c4,.38),
brass=mat(0xc59b58,.27,.78), paleBrass=mat(0xe0c185,.24,.74), silver=mat(0xd2d5cd,.20,.88), iron=mat(0x343d3c,.38,.66),
seam=mat(0xcabda6,.84), trim=mat(0xf1e4c9,.43),snow=mat(0xf3e6d5,.88), paper=mat(0xefe1bf,.81,0,{side:T.DoubleSide});
const geoBox=new T.BoxGeometry(), geoSphere=new T.SphereGeometry(1,24,16);
function box(x,y,z,a,b,c,m,p=scene){const o=at(mesh(geoBox,m,p),x,y,z);o.scale.set(a,b,c);return o;}
function orb(x,y,z,a,b,c,m,p=scene){const o=at(mesh(geoSphere,m,p),x,y,z);o.scale.set(a,b,c);return o;}
function lathe(profile,m,p=scene,seg=72,start=0,length=TAU){return mesh(new T.LatheGeometry(profile.map(a=>new T.Vector2(...a)),seg,start,length),m,p);}
function ring(r,tube,y,m,p=scene,segs=80){const o=mesh(new T.TorusGeometry(r,tube,8,segs),m,p);o.rotation.x=PI/2;o.position.y=y;return o;}
function rod(a,b,r,m,p=scene,r2=r,sides=12){const d=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r2,r,d.length(),sides),m,p);o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;}
function curve(points,r,m,p=scene,segments=24){const path=new T.CatmullRomCurve3(points.map(a=>Array.isArray(a)?V(...a):a));return mesh(new T.TubeGeometry(path,segments,r,7,false),m,p);}
function wood(color,dark=false){
 const tx=texture(128,(x,y)=>{const a=TAU*x/128,b=TAU*y/128;const lines=Math.sin(20*b+1.7*Math.sin(a)+.7*Math.sin(3*a+b))*.5+.5;
 const n=245-15*lines**5-4*Math.cos(5*b+Math.sin(a))+rand()*6-(dark?8:0);return [n,n-2*lines,n-5*lines];},true);
 tx.repeat.set(3,4);return mat(color,.45,0,{map:tx,bumpMap:tx,bumpScale:.012});}
const oak=wood(0xc9a579),walnut=wood(0x885231,true),maple=wood(0xe1c49b);
const sun=new T.DirectionalLight(0xffe0ac,3.05);at(sun,-4.9,7.8,-3.7);sun.target.position.set(0,0,-.4);scene.add(sun,sun.target);sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-7,right:7,top:6,bottom:-6,near:.1,far:24});sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.015;sun.shadow.bias=-.00020;sun.shadow.radius=3;
scene.add(new T.HemisphereLight(0xe4edf1,0xae8971,.91));
/* A small linear radiance map supplies the same window, ceiling and worktop
   reflections before the first frame as the room probe used afterwards. */
const ew=128,eh=64,envData=new Float32Array(ew*eh*4);
for(let j=0;j<eh;j++)for(let i=0;i<ew;i++){const y=Math.sin((j/eh-.5)*PI),ang=(i/ew-.5)*TAU;let v=y>0?.62:.31;
 if(ang>-.18&&ang<1.8&&y>.02&&y<.86){v=3.4;if(Math.abs(Math.sin(ang*7.1))<.09||Math.abs(y-.43)<.024)v=.35;}
 if(ang<-1.4&&y>.34&&y<.66)v=1.8;
 const k=4*(j*ew+i);envData.set([v*(y<0?1.1:1.04),v*(y<0?.88:.99),v*(y<0?.64:.91),1],k);}
const env=new T.DataTexture(envData,ew,eh,T.RGBAFormat,T.FloatType);env.mapping=T.EquirectangularReflectionMapping;env.needsUpdate=true;scene.environment=env;
const glass=phys(0xc8efea,{transparent:true,opacity:.13,metalness:.11,roughness:.085,clearcoat:1,envMapIntensity:1.05,depthWrite:false,side:T.FrontSide});
const glassEdge=phys(0xb0d5cd,{transparent:true,opacity:.57,metalness:.22,roughness:.09,clearcoat:.9,depthWrite:false});
function glassObj(o,order=4){o.castShadow=false;o.renderOrder=order;return o;}
function softShadow(p,x,z,rx,rz,opacity=.18){
 const seg=64,rings=6,pos=[],colors=[],ind=[];for(let j=0;j<=rings;j++)for(let i=0;i<=seg;i++){const a=i/seg*TAU,r=j/rings;pos.push(Math.cos(a)*r*rx,.004,Math.sin(a)*r*rz);colors.push(1,1,1,opacity*(1-r*r)**3);}
 for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){let k=j*(seg+1)+i;ind.push(k,k+1,k+seg+1,k+1,k+seg+2,k+seg+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,4));g.setIndex(ind);g.computeVertexNormals();
 const o=at(mesh(g,mat(0x674525,1,0,{vertexColors:true,transparent:true,side:T.DoubleSide,depthWrite:false}),p),x,0,z);o.castShadow=false;}
/* Fixed architecture. Rows share geometry and draw calls. */
function instances(g,m,poses,p=scene){const o=new T.InstancedMesh(g,m,poses.length),tmp=new T.Object3D();
 poses.forEach(([x,y,z,a,b,c,rz=0],i)=>{tmp.position.set(x,y,z);tmp.scale.set(a,b,c);tmp.rotation.set(0,0,rz);tmp.updateMatrix();o.setMatrixAt(i,tmp.matrix);});o.receiveShadow=true;o.castShadow=true;p.add(o);return o;}
function room(){
 box(0,-.24,-.02,19,.45,6.44,oak);box(0,-.82,3.12,18.8,.74,.13,blue);
 const planks=[];for(let i=-3;i<4;i++)planks.push([0,-.011,i+.12,19,.006,.011]);instances(geoBox,mat(0x866d52,.9),planks);
 box(0,1,-5.72,23,10,.22,seam);
 const tiles=[[],[],[]];for(let j=0;j<15;j++)for(let i=-12;i<12;i++){const x=i*.96+(j%2)*.48,y=-.65+j*.49;if(x<-.2&&x>-6.9&&y>.65)continue;tiles[(rand()*3)|0].push([x,y,-5.55,.946,.477,.10]);}
 [0xf3e9cf,0xeae0c8,0xeee4d0].forEach((c,i)=>instances(geoBox,mat(c,.30),tiles[i]));
 // Recessed window and the snow-covered rooftops beyond the sash.
 box(-3.5,3.32,-5.71,6.84,5.55,.28,trim);
 const vista=group();at(vista,-3.5,.65,-5.44);
 const skyTex=texture(64,(x,y)=>{let f=y/63;return [249-71*f,196+1*f,151+58*f];},true);
 const sky=mat(0xffffff,.96,0,{map:skyTex,emissive:0xe7d0ad,emissiveIntensity:.28});
 box(0,2.6,0,6.51,5.22,.035,sky,vista);
 const houses=[0xc3a689,0xd0b299,0x9fa7a5,0xbca392,0xb3a7a0].map(c=>mat(c,.85));
 const roofs=mat(0x77858b,.8),pane=mat(0x839296,.44),lit=mat(0xffda9e,.43,0,{emissive:0xffc482,emissiveIntensity:.18});
 for(let i=0;i<12;i++){const x=-3.03+i*.55,h=.65+rand()*.75,w=.48+rand()*.16;
 box(x,h*.5,.13,w,h,.19,houses[i%5],vista);let rf=mesh(new T.ConeGeometry(w*.83,.36,4),roofs,vista);at(rf,x,h+.16,.16);rf.rotation.y=PI/4;rf.scale.z=.68;
 box(x+.11,h+.37,.15,.088,.31,.09,houses[i%5],vista);box(x+.11,h+.53,.15,.12,.035,.11,snow,vista);
 for(let u=-1;u<=1;u+=2)for(let k=0;k<2;k++)box(x+u*w*.22,.24+k*.38,.235,.088,.16,.016,(i+k)%3===0?lit:pane,vista);
 box(x,h+.01,.21,w+.06,.046,.25,snow,vista);}
 for(const x of [-3.34,-1.62,.02,1.68,3.34]){box(x,2.66,.37,.075,5.38,.11,trim,vista);box(x-.023,2.66,.439,.014,5.38,.012,paleBrass,vista);}
 for(const y of [.04,1.78,3.62,5.3])box(0,y,.41,6.75,.084,.14,trim,vista);
 box(0,.012,.48,7.04,.15,.66,maple,vista);
 // A circular pastry-shop window medallion in antique brass.
 const emblem=group(vista);at(emblem,1.01,1.64,.47);
 const hoop=mesh(new T.TorusGeometry(.46,.012,6,64),brass,emblem);hoop.castShadow=false;
 curve([[-.29,-.09,0],[-.22,.07,0],[0,.18,0],[.22,.07,0],[.29,-.09,0],[0,-.16,0],[-.29,-.09,0]],.012,brass,emblem);
 for(const x of [-.13,0,.13])curve([[x-.04,-.09,0],[x-.035,-.01,0],[x+.035,.07,0]],.010,brass,emblem);
 // Side return of the glazed shopfront, also reflected by the mixing bowl.
 box(-7.42,2.60,-.52,.14,5.8,10,blueDark);
 box(-7.31,3.02,-.52,.05,3.95,8.74,mat(0xffe2b8,.32,0,{emissive:0xffdfb9,emissiveIntensity:1.62}));
 for(let j=0;j<7;j++)box(-7.24,3,-4.68+j*1.39,.13,4.15,.106,maple);
 for(const y of [1.01,2.54,5.01])box(-7.24,y,-.50,.17,.095,8.88,maple);
 box(0,6.37,0,19,.16,23,clay);box(0,2.3,15,23,8,.15,blueLight);
 // Fitted dresser, bread-oven and rail.
 box(0,-.22,-3.96,15,1.75,1.65,blue);box(0,.69,-4,15,.15,1.88,maple);
 for(let i=-5;i<=5;i++){const x=i*1.32;box(x,-.24,-3.11,1.22,1.27,.068,blueDark);box(x,-.24,-3.05,1.13,1.16,.07,blue);
 rod(V(x-.15,.16,-2.98),V(x+.15,.16,-2.98),.028,brass);}
 box(3.98,3.03,-5.03,5.6,.115,.77,maple);
 for(const x of [1.6,4.8]){rod(V(x,2.48,-5.43),V(x,2.99,-4.76),.035,brass);box(x,2.79,-5.43,.10,.46,.07,brass);}
 for(let i=0;i<4;i++){let g=at(group(),1.68+i*.72,3.09,-5.03),h=.47+.22*(i%2);
 lathe([[0,0],[.19,0],[.23,.04],[.24,h-.09],[.19,h],[.13,h+.025]],i%2?clay:blueLight,g,40);
 lathe([[0,h+.07],[.22,h+.07],[.23,h+.035],[.19,h]],maple,g,40);orb(0,h+.11,0,.065,.05,.065,brass,g);}
}
const architecture=group();
const initialObjects=new Set(scene.children);room();
for(const child of [...scene.children])if(!initialObjects.has(child))architecture.add(child);
