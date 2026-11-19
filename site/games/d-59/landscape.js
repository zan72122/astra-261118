/* Geometry, materials and illumination are all generated locally. */
(function(){
'use strict';
const T=THREE,TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
const hash=(x,y)=>{let h=Math.imul(x^7139,374761393)+Math.imul(y^151,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
function noise(x,y){const i=Math.floor(x),j=Math.floor(y),a=smooth(x-i),b=smooth(y-j);return mix(mix(hash(i,j),hash(i+1,j),a),mix(hash(i,j+1),hash(i+1,j+1),a),b);}
function fb(x,y){return noise(x,y)*.53+noise(x*2.04+9,y*2.04)*.27+noise(x*4.13,y*4.13+8)*.13+noise(x*8.34,y*8.34)*.07;}
const color=x=>new T.Color(x),vec=(x,y,z)=>new T.Vector3(x,y,z);
function geom(pos,idx,cols){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));const uv=[];for(let i=0;i<pos.length;i+=3)uv.push(pos[i]*.41+pos[i+1]*.11,pos[i+2]*.41+pos[i+1]*.23);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(cols)g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setIndex(idx);g.computeVertexNormals();return g;}
function surface(nx,nz,fn){
 const pos=[],idx=[],cols=[];
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const p=fn(i/nx,j/nz);pos.push(p[0],p[1],p[2]);if(p[3])cols.push(p[3].r,p[3].g,p[3].b);if(i<nx&&j<nz){const a=j*(nx+1)+i;idx.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}}
 return geom(pos,idx,cols.length?cols:null);
}
function texture(size,fn,srgb=false){const d=new Uint8Array(size*size*4);for(let j=0;j<size;j++)for(let i=0;i<size;i++){const p=(j*size+i)*4,c=fn(i,j);d[p]=c[0];d[p+1]=c[1];d[p+2]=c[2];d[p+3]=255;}const t=new T.DataTexture(d,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.needsUpdate=true;return t;}
const grain=texture(128,(x,y)=>{const k=180+54*hash(x,y)+17*noise(x*.1,y*.1);return[k,k,k];});
function mat(c,r=.8,extra={}){return new T.MeshStandardMaterial({color:c,roughness:r,roughnessMap:grain,...extra});}
function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
const glnoise=`
float rand3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(rand3(i),rand3(i+vec3(1,0,0)),f.x),mix(rand3(i+vec3(0,1,0)),rand3(i+vec3(1,1,0)),f.x),f.y),
mix(mix(rand3(i+vec3(0,0,1)),rand3(i+vec3(1,0,1)),f.x),mix(rand3(i+vec3(0,1,1)),rand3(i+vec3(1)),f.x),f.y),f.z);}
`;
function mineral(c,vein=false,sand=false){
 const m=mat(c,sand?.96:.61);
 m.onBeforeCompile=sh=>{
  sh.vertexShader='varying vec3 vGrain;\n'+sh.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
  vec4 grainPos=vec4(transformed,1.);
  #ifdef USE_INSTANCING
  grainPos=instanceMatrix*grainPos;
  #endif
  vGrain=${sand?'(modelMatrix*grainPos).xyz':'position'};`);
  sh.fragmentShader='varying vec3 vGrain;\n'+glnoise+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec3 gp=vGrain*${sand?'2.4':'2.8'};
  float layer=vn(gp*1.3)*.50+vn(gp*4.6)*.29+vn(gp*13.7)*.14+vn(gp*47.)*.07;
  float fleck=vn(gp*75.);
  diffuseColor.rgb*=.65+.64*layer+.22*fleck;
  ${sand?'diffuseColor.rgb+=vec3(.032,.025,.018)*smoothstep(.68,.92,fleck);':'diffuseColor.rgb+=vec3(.045,.043,.036)*smoothstep(.66,.9,fleck);'}
  ${vein?`float stratum=vGrain.x*.38+vGrain.z*.62+vGrain.y*.19+.22*vn(gp*1.9)+.04*vn(gp*7.5);
  float vein=1.-smoothstep(.017,.045,abs(stratum-.19));
  float thread=1.-smoothstep(.003,.013,abs(stratum-.102));
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.70,.60,.44)*(.67+.4*layer),.79*vein+.32*thread);`:''}`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 ${sand?`float edge=-1.89-.72*smoothstep(0.,.9,abs(vGrain.x+.26))-.26*sin(vGrain.x*1.7)-.062*sin(vGrain.x*7.);
 roughnessFactor*=mix(.28,1.,smoothstep(.04,.73,vGrain.z-edge));`:
 'roughnessFactor*=mix(.51,1.,smoothstep(-.67,.08,vGrain.y));'}`);
 };m.customProgramCacheKey=()=> 'mineral'+vein+sand;return m;
}
function rockGeo(seed,segments=36,rings=22){
 const g=new T.SphereGeometry(1,segments,rings),p=g.attributes.position;
 for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
 const n=1+.105*(fb(x*3.2+seed,z*3.5+y*3.6)-.5)+.046*Math.sin(x*4.2+z*5.1+seed);
 const q=(a,e)=>Math.sign(a)*Math.abs(a)**e;
 p.setXYZ(i,q(x,.90)*n+.055*z*y,q(y,.76)*n+.065*x-.037*z+.03*(noise(seed+x*6,z*6)-.5),q(z,.91)*n);
 }g.computeVertexNormals();return g;
}
function shoreline(x){return -1.89-.72*smooth(clamp(Math.abs(x+.26)/.9))-.26*Math.sin(x*1.7)-.062*Math.sin(x*7);}
function groundY(x,z){const d=z-shoreline(x);return -.19+.355*smooth(clamp((d+.22)/.81))+.025*Math.min(4,Math.max(0,d))+.045*(fb(x*2,z*2)-.5);}
function createSky(aspect) {
 // Equirectangular sky radiance. The sun and its halo also illuminate wet materials.
 const w=1024,h=384,dat=new Uint8Array(w*h*4),sx=-.104*clamp(aspect,.44,1.8),sy=.085;
 const sun=vec(sx,sy,-1).normalize();
 for(let j=0;j<h;j++){
  const lat=(j/(h-1)-.5)*Math.PI,y=Math.sin(lat),rad=Math.cos(lat);
  for(let i=0;i<w;i++){
   const phi=(i/(w-1)-.5)*TAU,x=Math.cos(phi)*rad,z=Math.sin(phi)*rad;
   const d=Math.max(0,1-(x*sun.x+y*sun.y+z*sun.z)),e=clamp(y/.43),a=Math.pow(e,.72);
   let r=mix(252,126,a),g=mix(207,162,a),b=mix(164,188,a);
   const cirrus=fb(x*17/(Math.max(.08,y)+.25)+17,z*27/(Math.max(.08,y)+.25));
   const veil=clamp((cirrus-.43)*1.85)*clamp((y+.009)*10)*.42;
   r=mix(r,235,veil);g=mix(g,207,veil);b=mix(b,191,veil);
   const halo=Math.exp(-d*82)*.49+Math.exp(-d*1800)*.32,core=1-smooth(clamp((d-.000028)/.000025));
   r=mix(mix(r,255,halo),255,core);g=mix(mix(g,221,halo),250,core);b=mix(mix(b,164,halo),218,core);
   const p=(j*w+i)*4;dat[p]=r;dat[p+1]=g;dat[p+2]=b;dat[p+3]=255;
  }}
 const t=new T.DataTexture(dat,w,h);t.colorSpace=T.SRGBColorSpace;t.mapping=T.EquirectangularReflectionMapping;t.minFilter=t.magFilter=T.LinearFilter;t.needsUpdate=true;return {t,sun};
}
function batch(parent,geometry,material,items,shadows=false){
 if(!items.length)return;
 const m=new T.InstancedMesh(geometry,material,items.length),d=new T.Object3D();
 items.forEach((v,i)=>{d.position.set(v[0],v[1],v[2]);d.scale.set(v[3],v[4],v[5]);d.rotation.set(v[7]||0,v[6]||0,v[8]||0);d.updateMatrix();m.setMatrixAt(i,d.matrix);if(v[9])m.setColorAt(i,v[9]);});
 m.castShadow=shadows;m.receiveShadow=true;parent.add(m);return m;
}
function pineGeometry(seed){
 const rnd=Lake.random(seed),pos=[],idx=[],cols=[];
 const vert=(x,y,z,c)=>{pos.push(x,y,z);cols.push(c,c*.99,c*.92);return pos.length/3-1;};
 for(let k=0;k<7;k++){
 const y=.12+.108*k, r=.232*(1-k*.125),tip=vert(0,y+.28-k*.012,0,1.07);
 const n=17,base=[];
 for(let i=0;i<n;i++){const a=i/n*TAU+(k%2)*.24, rr=r*(.72+rnd()*.35)*(i%2?1:.79);
 base.push(vert(rr*Math.cos(a),y+.06*rnd()+.035*(i%2),rr*Math.sin(a),.60+.35*rnd()));}
 for(let i=0;i<n;i++)idx.push(base[(i+1)%n],base[i],tip);
 }
 return geom(pos,idx,cols);
}
function mountain(scene,rng,dist,baseY,amp,palette,offset){
 const g=surface(210,12,(u,v)=>{
 const x=(u-.5)*dist*3.9,z=-dist+v*dist*.29;
 const f=fb(x/dist*6+offset,offset),ridge=.25+f*.90+.17*Math.sin(x/dist*7+offset)+.10*Math.sin(x/dist*14+offset);
 const pass=1-.62*Math.exp(-((x/dist+.115)**2)/.016);
 const peak=(baseY+amp*ridge)*pass;
 const y=mix(peak,-1.8,v)+Math.sin(v*Math.PI)*amp*(fb(x*.085+offset,v*4)-.45)*.56;
 const c=color(palette[0]).lerp(color(palette[1]),clamp(fb(x*.19+offset,v*7)*.8+v*.12));
 return[x,y,z,c];});
 const m=mat(0xffffff,.99,{vertexColors:true,side:T.DoubleSide});mesh(scene,g,m);
}
function forestShore(scene,rng){
 const trees=[],trunks=[],banks=[];
 // Receding forested points leave a sunlit opening in the centre.
 const regions=[[-90,86,-83,12,2.2],[-64,-4.0,-35,10.5,4.1],[5.3,72,-34,12.4,4.7],[-38,-4.7,-23,5.8,1.25],[8.4,40,-18,6.2,2.0]];
 for(let a=0;a<regions.length;a++){
 const [lo,hi,back,width,height]=regions[a];
 const ht=(x,v)=>{
 const u=clamp((x-lo)/(hi-lo)),env=Math.sin(Math.PI*u)**.63,curve=width*(.50+.63*env+.20*Math.sin(u*5.7+a));
 const z=back+curve*v+1.25*Math.sin(u*7+a);
 const y=-.35+height*Math.sin(Math.PI*v)**.75*env*(.75+.55*fb(x*.28+a,v*3));
 return [x,y,z];};
 const g=surface(94,15,(u,v)=>{const p=ht(mix(lo,hi,u),v);return [...p,color(0x4d5944).lerp(color(0x8a8270),fb(p[0]*.35,p[2]*.35))];});
 mesh(scene,g,mat(0xffffff,.98,{vertexColors:true,side:T.DoubleSide})).receiveShadow=true;
 const count=a===0?700:a<3?700:355;
 for(let n=0;n<count;n++){
 const x=mix(lo,hi,rng()),v=.08+rng()*.83,[,y,z]=ht(x,v);
 if(y<-.05)continue;
 const htTree=(a===0?.9:1.1)+rng()*(a===0?3.1:2.6),edge=Math.min(1,Math.max(.26,(y+.17)*1.3)),hh=htTree*edge;
 const c=color(0x283e37).lerp(color(0x78806a),rng()*.74+(a===0?.18:0));
 trees.push([x,y-.06,z,hh*(.82+rng()*.38),hh,hh,rng()*6.2,0,0,c]);trunks.push([x,y+hh*.15,z,hh*.024,hh*.3,hh*.024,0]);
 }
 for(let n=0;n<100;n++){const x=mix(lo,hi,rng()),p=ht(x,.98),w=.12+rng()*.55;banks.push([x,-.06,p[2]-.14,w,w*.45,w*.7,rng()*3,0,0,color(0x756f61)]);}
 }
 batch(scene,pineGeometry(721),mat(0xffffff,.97,{vertexColors:true,side:T.DoubleSide}),trees);
 batch(scene,new T.CylinderGeometry(.7,1,1,4),mat(0x453f32),trunks);
 batch(scene,rockGeo(14,12,7),mineral(0xb3afa1),banks);
}
function broadTree(scene,rng) {
 const [x,z]=Lake.tree,leaves=[],twigMat=mineral(0x67533f);
 function branch(a,b,r0,r1){const v=b.clone().sub(a),o=mesh(scene,new T.CylinderGeometry(r1,r0,v.length(),9),twigMat);o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(vec(0,1,0),v.normalize());o.castShadow=true;return b;}
 const origin=vec(x,.08,z),fork=branch(origin,vec(x+.13,1.8,z),.22,.145);
 const clusters=[];
 for(let i=0;i<13;i++){
 const a=i*2.399+.21*rng(),extent=.80+rng()*1.16;
 const joint=branch(fork.clone().add(vec(0,rng()*.42,0)),vec(x+Math.cos(a)*extent*.56,2.35+rng()*.54,z+Math.sin(a)*extent*.62),.084,.044);
 const tip=branch(joint,vec(x+Math.cos(a)*extent,2.68+rng()*.78,z+Math.sin(a)*extent*.73),.049,.018);
 clusters.push(tip);
 }
 for(const p of clusters)for(let k=0;k<72;k++){
 const a=rng()*TAU,r=Math.sqrt(rng())*.83,py=Math.sqrt(1-r*r)*(.25+rng()*.48);
 const q=.12+rng()*.23;const c=color(0x495532).lerp(color(0x9b9b50),rng()*.7+.2*py);
 leaves.push([p.x+Math.cos(a)*r,p.y+py-.22,p.z+Math.sin(a)*r,q*1.3,q*.73,q,rng()*TAU,rng()*.6,0,c]);
 }
 batch(scene,new T.IcosahedronGeometry(1,1),mat(0xffffff,.92),leaves,true);
}
function island(scene,rng){
 const [tx,tz]=Lake.tree;
 const g=surface(62,32,(u,v)=>{const x=tx+(u-.5)*12,z=tz+(v-.5)*6.4,r=((x-tx)/5.5)**2+((z-tz)/2.85)**2;
 return[x,-.29+.65*smooth(clamp(1-r))+.07*(fb(x*2,z*2)-.4),z,color(0x777a4e).lerp(color(0xa59a77),clamp(r*.65+noise(x,z)*.2))];});
 mesh(scene,g,mat(0xffffff,.91,{vertexColors:true})).receiveShadow=true;
 broadTree(scene,rng);
}
function reedsGeo(seed){
 const rng=Lake.random(seed),pos=[],idx=[],col=[];
 for(let i=0;i<30;i++){const a=rng()*TAU,spread=rng()*.17,h=.15+rng()*.47,w=.006+rng()*.012;
 const dx=Math.cos(a),dz=Math.sin(a),off=rng()*.27;
 const base=pos.length/3,c=color(0x57613d).lerp(color(0xc0ae74),rng()*.85);
 for(let k=0;k<5;k++){const t=k/4,width=w*(1-t*.96),cx=dx*(spread+off*t*t),cz=dz*(spread+off*t*t);
 for(const side of [-1,1]){pos.push(cx+dz*width*side,h*t,cz-dx*width*side);col.push(c.r*(.50+t*.56),c.g*(.5+t*.56),c.b*(.5+t*.56));}
 if(k<4){const b=base+k*2;idx.push(b,b+1,b+2,b+1,b+3,b+2);}}
 }return geom(pos,idx,col);
}
function build(canvas,model){
 const s=model.s,rng=Lake.random(7241),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.055,390);
 const sky=createSky(camera.aspect);scene.background=sky.t;scene.environment=sky.t;scene.environmentIntensity=.41;scene.backgroundIntensity=.90;
 scene.fog=new T.FogExp2(0xd7bba3,.0098);
 scene.add(new T.HemisphereLight(0xd3e4f5,0x7e725a,1.18));
 const sun=new T.DirectionalLight(0xffdfad,2.26);sun.position.set(-15,14,-23);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:16,bottom:-16,near:.5,far:70});sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.normalBias=.018;sun.shadow.bias=-.0003;sun.target.position.set(0,0,-7);scene.add(sun,sun.target);
 mountain(scene,rng,165,3.6,23,[0x858b9b,0xaca1a3],7);
 mountain(scene,rng,118,.5,17,[0x657889,0x9e9293],13);
 mountain(scene,rng,94,-.9,12.8,[0x536877,0x797e82],4);
 forestShore(scene,rng);island(scene,rng);
 const sand=surface(120,72,(u,v)=>{const x=(u-.5)*26,z=-4.1+v*13.4,y=groundY(x,z),d=z-shoreline(x),wet=1-clamp((d-.04)/.69);
 const c=color(0xb6a082).lerp(color(0xc4b399),fb(x*3,z*3)).lerp(color(0x625d51),wet*.89);return[x,y,z,c];});
 const sandMat=mineral(0xffffff,false,true);sandMat.vertexColors=true;mesh(scene,sand,sandMat).receiveShadow=true;
 const stonesGeo=[rockGeo(5),rockGeo(79),rockGeo(34)],stoneMats=[mineral(0x92958d,true),mineral(0x737d7b,true),mineral(0x949087,true)];
 const stones=Lake.stones.map((p,i)=>{const o=mesh(scene,stonesGeo[i],stoneMats[i],...p);o.scale.set(...[[.63,.154,.445],[.465,.119,.32],[.41,.105,.285]][i]);o.rotation.y=[-.30,.53,-.85][i];o.castShadow=o.receiveShadow=true;return o;});
 const gravel=[],stones2=[];
 for(let i=0;i<5200;i++){
 const x=(rng()-.5)*16,z=-3.45+rng()*9,y=groundY(x,z);if(y<-.17)continue;
 let size=.008+Math.pow(rng(),3)*.053;if(Math.abs(z-shoreline(x))<.24)size*=1.8;
 const c=color(0x625e53).lerp(color(0xc9baa2),rng());
 gravel.push([x,y+.006,z,size*(1+rng()*.65),size*.42,size,rng()*6,rng()*.3,0,c]);}
 for(let i=0;i<165;i++){
 const x=(rng()-.5)*14,z=-3.0+rng()*7,y=groundY(x,z);
 if(Math.abs(x)<1.48 && z<.8)continue;
 const q=.055+rng()**2*.36;stones2.push([x,y+.01,z,q,q*(.39+rng()*.23),q*.73,rng()*TAU,rng()*.13,0,color(0x6b6e64).lerp(color(0xabaa9b),rng())]);}
 batch(scene,new T.IcosahedronGeometry(1,0),mat(0xffffff,.84),gravel);
 batch(scene,rockGeo(34,16,10),mineral(0xffffff),stones2,true);
 const tufts=[],grassMat=mat(0xffffff,.94,{vertexColors:true,side:T.DoubleSide});
 for(let i=0;i<680;i++){
 const x=(rng()-.5)*17,z=-2.94+rng()*8,y=groundY(x,z),strip=fb(x*1.3,z*1.32);
 if(y<-.025 || (Math.abs(x+.15)<1.24 && z<2.65) || strip<.42)continue;
 const q=.50+rng()*.89;tufts.push([x,y,z,q,q,q,rng()*TAU]);}
 const grass=batch(scene,reedsGeo(91),grassMat,tufts,true);
 const roots=tufts.map(t=>{let best=0,dist=Infinity;s.reeds.forEach((r,i)=>{const d=(r.x-t[0])**2+(r.z-t[2])**2;if(d<dist){best=i;dist=d;}});return best;});
 const reeds=[];
 for(let k=0;k<44;k++){
 const r=s.reeds[k],side=k%2?1:-1,inlet=k>27;
 const x=r.x,z=r.z;const y=inlet?-.07:Math.max(-.12,groundY(x,z)),group=new T.Group();group.position.set(x,y,z);scene.add(group);
 const hh=.44+rng()*.60,lean=.07+rng()*.11;group.rotation.z=side*lean;
 mesh(group,new T.CylinderGeometry(.009,.015,hh,5),mat(0x858255),0,hh*.50,0);
 if(k%3!==0){const cat=mesh(group,stonesGeo[1],mat(0x604b33),0,hh*.85,0);cat.scale.set(.032,.124,.030);}
 const blades=mesh(group,reedsGeo(4+k),grassMat);blades.scale.setScalar(.76);reeds.push(group);
 }
 const pads=[],padsInfo=[],padMat=mat(0x819169,.38,{side:T.DoubleSide});
 const padGeo=new T.CylinderGeometry(1,.94,.08,32,1,false,.18,TAU-.34);
 Lake.steps.forEach((p,i)=>{
 const o=mesh(scene,stonesGeo[i%3],mineral(i%2?0x7b8078:0x91948a),p[0],-.047,p[1]);
 o.rotation.y=i*1.7;o.scale.set(.52+i*.024,.14,.40+i*.022);o.receiveShadow=o.castShadow=true;padsInfo.push(o);
 for(let j=0;j<5;j++){const a=j*2.4+i,l=.18+(j%3)*.12;
 const q=mesh(scene,padGeo,padMat,p[0]+Math.cos(a)*l,.061+.006*j,p[1]+Math.sin(a)*l);
 q.scale.set(.19+rng()*.12,.066,.16+rng()*.11);q.rotation.y=a;pads.push({o:q,p,a,l,i,j});}
 });
 // Folded leaf blade, serrated edge and raised branching veins.
 function leafMesh(){
  const group=new T.Group(),g=surface(36,12,(u,v)=>{
   const t=v*2-1,width=Math.pow(Math.max(0,Math.sin(u*Math.PI)),.80)*(.219+.024*Math.cos(u*10))*(1+.050*Math.sin(u*109));
   const x=t*width,z=(u-.48)*.74,y=.073*Math.sin(u*2.9)+.047*(1-Math.abs(t))-.016*t+.022*t*t*Math.sin(6*u);
   const c=color(0xa2612a).lerp(color(0xeabe5f),clamp(.19+.44*u+.29*noise(u*19,t*5)+t*.12));return[x,y,z,c];});
  mesh(group,g,mat(0xffffff,.53,{vertexColors:true,side:T.DoubleSide}));
  const veinMat=mat(0xc8a558,.66);
  function line(points,w){mesh(group,new T.TubeGeometry(new T.CatmullRomCurve3(points),12,w,4,false),veinMat);}
  line([vec(0,.019,-.47),vec(0,.066,-.27),vec(.001,.121,.02),vec(0,.071,.35)],.0065);
  for(let i=0;i<6;i++){const u=.18+i*.105;for(const side of [-1,1]){
   const z=(u-.48)*.74,outer=Math.sin(u*Math.PI)*.187;
   line([vec(0,.047+.073*Math.sin(u*2.9),z),vec(outer*side*.62,.035+.073*Math.sin(u*2.9),z+.053),vec(outer*side,.014+.073*Math.sin(u*2.9),z+.09)],.0023);}}
  return group;
 }
 const leaf=leafMesh();scene.add(leaf);
 const dustGeo=new T.IcosahedronGeometry(1,1),dustMat=mat(0xe7d39a,.73,{emissive:0xdec080,emissiveIntensity:.28});
 const dust=new T.InstancedMesh(dustGeo,dustMat,s.motes.length);dust.frustumCulled=false;scene.add(dust);
 const bubbles=new T.InstancedMesh(new T.SphereGeometry(1,10,8),mat(0xb4d8d4,.12,{metalness:.35,transparent:true,opacity:.69}),40);
 const drops=new T.InstancedMesh(new T.SphereGeometry(1,7,6),mat(0xc4dedc,.12,{metalness:.34}),100);
 bubbles.count=drops.count=0;bubbles.frustumCulled=drops.frustumCulled=false;scene.add(bubbles,drops);
 // A reflected scene, small capillary slopes, and the simulated surface all share a PBR water mesh.
 const reflected=new T.PerspectiveCamera(),rt=new T.WebGLRenderTarget(768,512,{type:T.HalfFloatType,depthBuffer:true});
 const reflectionVP=new T.Matrix4(),waveUniform=Array.from({length:12},()=>new T.Vector4(0,0,0,0));
 const wu={uMirror:{value:rt.texture},uMirrorVP:{value:reflectionVP},uWaves:{value:waveUniform},uSun:{value:sky.sun},
 uFront:{value:new T.Vector4()}};
 const waterG=surface(132,154,(u,v)=>{const zz=5-(v**1.58)*133,xx=(u-.5)*(36+Math.max(0,-zz)*1.9);return[xx,0,zz];});
 // Grid runs towards the horizon, so reverse winding.
 const wi=waterG.index.array;for(let i=0;i<wi.length;i+=3){const a=wi[i+1];wi[i+1]=wi[i+2];wi[i+2]=a;}waterG.computeVertexNormals();
 const patch=new T.BufferAttribute(new Float32Array(waterG.attributes.position.count*2),2);waterG.setAttribute('aWaterState',patch);
 const wm=mat(0x304e54,.22,{metalness:.19});wm.envMapIntensity=.36;
 wm.onBeforeCompile=sh=>{
  Object.assign(sh.uniforms,wu);
  sh.vertexShader='attribute vec2 aWaterState; varying vec2 vPatch; varying vec3 vLake; uniform mat4 uMirrorVP; varying vec4 vMirror;\n'+sh.vertexShader.replace('#include <project_vertex>',`transformed.y+=aWaterState.x;
  vPatch=aWaterState;vLake=transformed;vMirror=uMirrorVP*vec4(transformed,1.);
  #include <project_vertex>`);
  sh.fragmentShader=`varying vec2 vPatch;varying vec3 vLake;varying vec4 vMirror;
  uniform sampler2D uMirror;uniform vec4 uWaves[12];uniform vec4 uFront;uniform vec3 uSun;
  `+glnoise+sh.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  vec2 p=vLake.xz;float ll=length(cameraPosition-vLake);
  float d=vPatch.x*42.+vPatch.y*16.;
  float coarse=vn(vec3(p.x*.76,p.y*1.5,d*.30));
  float m1=sin(p.y*13.4+p.x*1.3+coarse*8.+d*1.3);
  float m2=sin(p.y*29.6-p.x*3.4+coarse*10.-d*.9);
  float m3=sin(p.y*54.+p.x*2.7+vn(vec3(p*.9,.8))*13.+d*1.5);
  vec2 slope=vec2((coarse-.5)*.040+m2*.007,(m1*.022+m2*.014+m3*.008)*(1.-smoothstep(20.,100.,ll))+.027*(coarse-.45));
  float rings=0.;
  for(int i=0;i<12;i++){
   vec4 w=uWaves[i];vec2 off=p-w.xy;float dist=length(off);float q=dist-w.z;
   float band=exp(-abs(q)*24.)+.42*exp(-abs(q+.108)*28.)+.16*exp(-abs(q+.225)*29.);
   slope+=off/max(.001,dist)*w.w*band*.19;
   rings+=w.w*band;
  }
  float fd=length(p-uFront.xy)-uFront.z,fw=exp(-abs(fd)*5.5)*uFront.w;
  slope+=normalize(p-uFront.xy+vec2(.00001))*fw*.11;rings+=fw*.67;
  vec3 waterN=normalize(vec3(slope.x,1.,slope.y));normal=normalize(mat3(viewMatrix)*waterN);`)
  .replace('#include <opaque_fragment>',`vec3 eye=normalize(cameraPosition-vLake);
  vec2 uv=vMirror.xy/vMirror.w*.5+.5;
  uv+=vec2(-slope.x,slope.y)*vec2(.28,.33)*clamp(15./ll,.26,1.4);
  vec3 mir=texture2D(uMirror,clamp(uv,.001,.999)).rgb;
  float fres=.29+.65*pow(1.-max(dot(eye,waterN),0.),3.);
  vec3 base=(totalDiffuse*.48+vec3(.015,.048,.063))*(.92+coarse*.19);
  vec3 halfVec=normalize(uSun+eye);
  float hx=(halfVec.x-waterN.x)*28., hz=(halfVec.z-waterN.z)*10.;
  float glint=exp(-hx*hx-hz*hz)*(.27+.73*smoothstep(.22,.92,m1*.55+m2*.27+m3*.18));
  outgoingLight=mix(base,mir*vec3(.88,.95,1.),fres)+totalSpecular*.09+vec3(1.,.70,.32)*glint*.80+vec3(.31,.31,.25)*min(1.,rings)*.68;
  #include <opaque_fragment>`);
 };
 const water=mesh(scene,waterG,wm);water.frustumCulled=false;
 // Linear radiance is resolved once, before a soft highlight bloom and film grain.
 const filmRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:2});
 const fxScene=new T.Scene(),fxCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const fx=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{film:{value:filmRT.texture},px:{value:new T.Vector2()}},
 vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`varying vec2 st;uniform sampler2D film;uniform vec2 px;
 vec3 bright(vec2 o){vec3 c=texture2D(film,st+o*px*4.).rgb;return c*smoothstep(.65,1.6,dot(c,vec3(.2126,.7152,.0722)));}
 void main(){vec3 c=texture2D(film,st).rgb;
 c+=.012*(bright(vec2(1,0))+bright(vec2(-1,0))+bright(vec2(0,1))+bright(vec2(0,-1))+bright(vec2(.71,.71))+bright(vec2(-.71,-.71)));
 vec2 v=(st-.5)*1.42;c*=1.-.12*dot(v,v);
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
 gl_FragColor.rgb+=grain*.009;
 }`});
 fxScene.add(new T.Mesh(new T.PlaneGeometry(2,2),fx));
 const dummy=new T.Object3D(),v=new T.Vector3(),clip=[new T.Plane(vec(0,1,0),.006)];
 const stepPoint=i=>vec(Lake.steps[i][0],.13,Lake.steps[i][1]);
 function focus(){
  if(s.mode==='ready')return stones[s.stoneIndex].position.clone().add(vec(0,.10,0));
  if(s.mode==='leaf'||s.mode==='drift'||s.mode==='shade'||s.mode==='return')return leaf.position.clone().add(vec(0,.10,0));
  if(s.mode==='cross')return stepPoint(s.stepIndex);
  return null;
 }
 const pAttr=waterG.attributes.position,patchMap=[];
 for(let i=0;i<pAttr.count;i++){
  const x=pAttr.getX(i),z=pAttr.getZ(i);
  if(x<Lake.X0||z<Lake.Z0||x>Lake.X0+(Lake.NX-1)*Lake.CELL||z>Lake.Z0+(Lake.NZ-1)*Lake.CELL)continue;
  const gx=(x-Lake.X0)/Lake.CELL,gz=(z-Lake.Z0)/Lake.CELL,ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz;
  patchMap.push([i,iz*Lake.NX+ix,(1-fx)*(1-fz),fx*(1-fz),(1-fx)*fz,fx*fz]);
 }
 function particles(inst,list,type){
  inst.count=Math.min(list.length,inst.instanceMatrix.count);
  for(let i=0;i<inst.count;i++){
   const p=list[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);
   const size=type==='mote'?.004+(i%7)*.0012:p.r*(type==='bubble'?Math.sqrt(Math.max(0,p.film)):1);
   dummy.scale.set(size,type==='drop'?size*1.32:size,size);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
  }inst.instanceMatrix.needsUpdate=true;
 }
 function sync(){
  const c=s.camera;camera.position.set(c.x,c.y,c.z);camera.lookAt(c.lx,c.ly,c.lz);camera.updateMatrixWorld();
  stones.forEach((o,i)=>{
   const moving=i===s.stoneIndex&&s.flight,used=s.mode!=='return'&&((s.stage>0&&i===s.cycle%3)||((s.stage>=2||s.mode==='wave')&&i===(s.cycle+1)%3));
   o.visible=!!moving||!used;
   if(moving){const f=s.flight;o.position.set(f.x,f.y,f.z);o.rotation.set(.06*Math.sin(f.spin),f.spin,-.055);o.scale.set(.63,.154,.445).multiplyScalar(i===0?1:i===1?.75:.66);}
   else {o.position.set(...Lake.stones[i]);if(s.mode==='ready'&&i===s.stoneIndex)o.position.y+=s.charge*.105;
   o.rotation.set(i===s.stoneIndex?-s.charge*.12:s.pebbles[i].angle,[ -.30,.53,-.85][i],0);}
  });
  for(let i=0;i<reeds.length;i++)reeds[i].rotation.z=(i%2?1:-1)*.09+s.reeds[i].bend;
  if(grass){for(let i=0;i<tufts.length;i++){const t=tufts[i];dummy.position.set(t[0],t[1],t[2]);dummy.rotation.set(s.reeds[roots[i]].bend*.28,t[6],s.reeds[roots[i]].bend*.62);dummy.scale.set(t[3],t[4],t[5]);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}grass.instanceMatrix.needsUpdate=true;}
  pads.forEach(({o,j},index)=>{const pad=s.lilies[index];o.position.set(pad.x,.064+model.sample(pad.x,pad.z)+j*.003,pad.z);o.rotation.z=pad.tilt;});
  padsInfo.forEach((o,i)=>{o.material.roughness=.36+(1-s.wet[i])*.34;});
  leaf.visible=s.stage>=2;
  leaf.position.set(s.leaf.x,s.leaf.y,s.leaf.z);leaf.rotation.set(s.mode==='shade'?.56:s.leaf.roll*.50,s.leaf.heading-.43,s.mode==='shade'?-.31+s.leaf.roll:s.leaf.roll);
  particles(dust,s.motes,'mote');particles(bubbles,s.bubbles,'bubble');particles(drops,s.drops,'drop');
  const NX=Lake.NX,ph=s.h,pv=s.vel;
  for(const [i,n,a,b,c,d] of patchMap)patch.setXY(i,ph[n]*a+ph[n+1]*b+ph[n+NX]*c+ph[n+NX+1]*d,pv[n]*a+pv[n+1]*b+pv[n+NX]*c+pv[n+NX+1]*d);
  patch.needsUpdate=true;
  for(let i=0;i<12;i++){const r=s.rings[s.rings.length-1-i];waveUniform[i].set(r?r.x:0,r?r.z:0,r?r.r:0,r?r.energy:0);}
  const fr=s.front;wu.uFront.value.set(fr?fr.x:0,fr?fr.z:0,fr?fr.r:0,fr?fr.power:0);
 }
 const shoreEnv=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
 const probe=new T.CubeCamera(.06,320,shoreEnv);probe.position.set(-.3,.69,-2.45);
 let capturedShore=false;
 function render(){
  sync();water.visible=false;renderer.shadowMap.autoUpdate=false;
  if(!capturedShore){
   probe.update(renderer,scene);scene.environment=shoreEnv.texture;capturedShore=true;
  }
  reflected.copy(camera,false);reflected.position.y*=-1;camera.getWorldDirection(v);v.y*=-1;
  reflected.up.copy(camera.up);reflected.up.y*=-1;reflected.lookAt(v.add(reflected.position));reflected.updateMatrixWorld();
  reflectionVP.multiplyMatrices(reflected.projectionMatrix,reflected.matrixWorldInverse);
  renderer.setRenderTarget(rt);renderer.clippingPlanes=clip;renderer.shadowMap.autoUpdate=false;
  renderer.render(scene,reflected);renderer.setRenderTarget(filmRT);renderer.clippingPlanes=[];
  water.visible=true;renderer.shadowMap.autoUpdate=true;renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(fxScene,fxCamera);
 }
 function resize(){
  const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();s.aspect=camera.aspect;
  renderer.setSize(w,h,false);const size=renderer.getDrawingBufferSize(new T.Vector2());filmRT.setSize(size.x,size.y);fx.uniforms.px.value.set(1/size.x,1/size.y);const k=Math.min(1,880/w,625/h);rt.setSize(Math.round(w*k),Math.round(h*k));
 }
 function project(p){const n=p.clone().project(camera);return {x:(n.x*.5+.5)*canvas.clientWidth,y:(.5-n.y*.5)*canvas.clientHeight,visible:n.z<1&&n.z>0};}
 resize();
 const portrait=clamp((.95-s.aspect)/.52);s.camera.y=2.16+.52*portrait;s.camera.z=5.8+1.75*portrait;s.camera.ly=.65+.28*portrait;
 return {render,resize,focus,project,stones,camera,stepPoint,canvas,renderer};
}
window.Landscape={build};
})();
