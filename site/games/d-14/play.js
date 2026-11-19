'use strict';
(()=>{
 const T=THREE,{V,C,tau,rand,noise,mix,ease,mat,M,mesh,group,box,ball,lathe,cyl,ring,rod,tube,batch,ceramic,glazeColors}=Art;
 const game=Pottery.create(),s=game.state,clamp=Pottery.clamp,canvas=document.querySelector('canvas');
 window.__GAME__={step:game.step,getState:game.getState};
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.07;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.12,115);
 const sky=new T.Color('#c5dce0'),duskSky=C('#edc9ac');scene.background=sky;scene.fog=new T.FogExp2('#c9d7d5',.019);
 const ambient=new T.HemisphereLight(0xedf6ff,0xcdb696,1.65);scene.add(ambient);
 const sun=new T.DirectionalLight(0xffeed6,2.18);sun.position.set(-4.4,7.7,-3.6);sun.target.position.set(0,1.1,.6);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:4.3,bottom:-4.3,near:.3,far:19});sun.shadow.bias=-.00025;sun.shadow.normalBias=.014;sun.shadow.radius=2.6;scene.add(sun,sun.target);
 // An angular radiance map of the studio gives metal, glass and wet slip window reflections.
 const ew=256,eh=128,env=new Uint16Array(ew*eh*4);
 for(let y=0;y<eh;y++)for(let x=0;x<ew;x++){
   let a=(x/ew-.5)*tau,b=(y/eh-.5)*Math.PI,dx=Math.cos(a)*Math.cos(b),dy=Math.sin(b),dz=Math.sin(a)*Math.cos(b);
   let rgb=[.22,.165,.109];
   if(dy<-.25)rgb=[.36,.26,.155];else if(dy>.77)rgb=[.39,.35,.28];
   if(dz<-.18){let xx=dx/-dz,yy=dy/-dz;
     if(Math.abs(xx)<1.85&&yy>-.44&&yy<1.4){let k=yy<-.10?1.2:2.9;
       if(Math.abs(xx+.91)<.035||Math.abs(xx-1.18)<.046)k=.26;
       rgb=[k*.84,k*.97,k*1.05];}}
   if(dx<-.65&&dy>.05)rgb=rgb.map((v,i)=>v+[.45,.39,.25][i]);
   const k=4*(y*ew+x);for(let j=0;j<4;j++)env[k+j]=T.DataUtils.toHalfFloat(j===3?1:rgb[j]);
 }
 const eTex=new T.DataTexture(env,ew,eh,T.RGBAFormat,T.HalfFloatType);eTex.mapping=T.EquirectangularReflectionMapping;eTex.needsUpdate=true;
 const gen=new T.PMREMGenerator(renderer),et=gen.fromEquirectangular(eTex);scene.environment=et.texture;scene.environmentIntensity=.47;gen.dispose();eTex.dispose();
 const hills=makeLandscape(scene),arch=Studio.architecture(scene),side=Studio.windowSide(scene);
 const west=group(scene);box(west,0,3.22,-2.45,.16,2.75,.24,M.trim);box(west,.085,3.22,-2.44,.055,2.75,.14,M.honey);
 const head=group(scene);box(head,0,0,0,10,.18,.27,M.trim);box(head,0,-.1,.047,10,.043,.17,M.honey);
 const fast=mat('#6e6c5c',.52,.45);for(let i=0;i<4;i++)ball(west,0,2+i*.78,-2.31,.017,.017,.011,fast);batch(west);batch(head);
 const kiln=Studio.kiln(scene),wheel=Studio.wheel(scene),bucket=Studio.bucket(scene),tools=Studio.toolsOnTable(scene),plant=Studio.hangingPlant(scene);
 const jars=[0,1,2].map(i=>Studio.jar(scene,i)),jarBase=[V(),V(),V()];
 const glazeBoard=group(scene);
 box(glazeBoard,0,0,0,1.87,.073,.75,M.end);box(glazeBoard,0,.04,.36,1.87,.046,.049,M.honey);box(glazeBoard,0,.04,-.36,1.87,.046,.049,M.honey);
 for(const x of [-.9,.9])box(glazeBoard,x,.04,0,.057,.047,.72,M.honey);batch(glazeBoard);
 const jarRack=group(scene);for(const x of [-.58,.58])box(jarRack,x,.195,0,.075,.39,.57,M.honey);
 box(jarRack,0,.32,-.23,1.25,.072,.069,M.trim);batch(jarRack);
 const shelf=group(scene),goals=['bowl','jar','vase'].map((kind,i)=>Studio.paintedWare(shelf,kind,[.51,.48,.50][i],i===2?0:i));
 box(shelf,0,-.039,0,2.89,.08,.76,M.trim);
 for(let i=0;i<3;i++){goals[i].position.x=(i-1)*.91;goals[i].rotation.y=.25+i*.6;}
 // The sprung wooden shelf carries three inlaid foot marks for comparing silhouettes.
 const marks=goals.map((o,i)=>{const m=mat('#b8ad92',.46,.24);const rr=ring(shelf,o.position.x,.006,0,[.32,.37,.27][i],.012,m);return rr;});
 const comparisonGeometry=new T.PlaneGeometry(1,1,1,Pottery.N-1);
 const comparison=mesh(shelf,comparisonGeometry,mat('#7c827a',.96,0,{transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}));
 comparison.castShadow=false;comparison.frustumCulled=false;
 const offered=group(scene),nest=Studio.paintedWare(offered,'bowl',.67,0);
 const extrasBoard=box(scene,0,0,0,.94,.078,.69,M.honey);
 const cord=group(scene),cordMat=mat('#dfcbb5',.41,0,{bumpMap:Art.rough,bumpScale:.007});
 const cordPoints=Array.from({length:56},()=>V());
 const cordGeo=new T.BufferGeometry(),cordPos=new Float32Array(56*9*3),cordInd=[];
 for(let k=0;k<55;k++)for(let j=0;j<9;j++){const a=k*9+j,b=k*9+(j+1)%9;cordInd.push(a,b,a+9,b,b+9,a+9);}
 cordGeo.setAttribute('position',new T.BufferAttribute(cordPos,3).setUsage(T.DynamicDrawUsage));cordGeo.setIndex(cordInd);const cordMesh=mesh(cord,cordGeo,cordMat);cordMesh.frustumCulled=false;
 const toolsFlowers=[0,1,2].map(i=>Studio.bloom(scene,0,0,0,i,.91));
 const flowerBasket=group(scene),willow=mat('#bd996e',.83),reed=mat('#9b7a56',.82);
 const basketPts=(a,h)=>[Math.cos(a)*(.57+.10*h),h,Math.sin(a)*(.27+.11*h)];
 for(let i=0;i<24;i++){let a=i*tau/24;rod(flowerBasket,basketPts(a,.035),basketPts(a,.265),.010,reed);}
 for(let j=0;j<10;j++){let pp=[];for(let i=0;i<=72;i++){let a=i*tau/72,p=basketPts(a,.035+j*.025);
   const weave=.009*Math.cos(12*a+j*Math.PI);p[0]+=Math.cos(a)*weave;p[2]+=Math.sin(a)*weave;pp.push(p);}
   tube(flowerBasket,pp,j===9?.019:.013,willow,88);}
 const bedding=ball(flowerBasket,0,.11,0,.55,.065,.25,M.linen);
 tube(flowerBasket,[[-.55,.23,0],[-.43,.70,-.10],[0,.89,-.18],[.43,.70,-.10],[.55,.23,0]],.020,reed,40);
 batch(flowerBasket);
 const readyBouquet=group(scene),bouquetFlowers=[],display=group(scene),gallery=[];
 const shelfBed=group(scene);box(shelfBed,0,-.055,0,2.38,.10,.68,M.honey);batch(shelfBed);
 const hearth=V(),center=V(),accessory=V(),slots=[V(),V(),V()],flowersHome=[V(),V(),V()];
 function makeBody(){
   const N=Pottery.N,A=80,R=2*N+7,points=new Float32Array(R*(A+1)*3),colors=new Float32Array(points.length),uv=[],ids=[];
   for(let i=0;i<R;i++)for(let j=0;j<=A;j++){uv.push(j/A,i/(R-1));if(i<R-1&&j<A){let k=i*(A+1)+j;ids.push(k,k+1,k+A+1,k+1,k+A+2,k+A+1);}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(points,3).setUsage(T.DynamicDrawUsage));g.setAttribute('color',new T.BufferAttribute(colors,3).setUsage(T.DynamicDrawUsage));g.setAttribute('slipGloss',new T.BufferAttribute(new Float32Array(points.length/3),1).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);
   const m=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.36,metalness:.03,clearcoat:.26,clearcoatRoughness:.25,roughnessMap:Art.rough,bumpMap:Art.rough,bumpScale:.0035,vertexColors:true,side:T.DoubleSide});
   m.onBeforeCompile=shader=>{
     shader.vertexShader='attribute float slipGloss; varying float vSlip; varying vec3 vTurn;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vSlip=slipGloss;vTurn=position;');
     shader.fragmentShader='varying float vSlip; varying vec3 vTurn;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor*=1.-.47*vSlip;');
     shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n float ridge=.5+.5*sin(vTurn.y*208.+.8*sin(vTurn.x*9.+vTurn.z*5.)); diffuseColor.rgb*=1.-.038*ridge*ridge*(1.-vSlip*.5);');
   };
   const o=mesh(scene,g,m);o.frustumCulled=false;return {o,g,m,N,A,R};
 }
 const body=makeBody(),cream=C('#e7dcd0'),tempered=C('#e6d8c0'),coat=glazeColors.map(C),wetCoat=['#779ba6','#9da68e','#bc9b81'].map(C);
 const cb=new T.Color(),cr=new T.Color(),SCALE=1/13.8;
 function bodyShape(obj,rows,depth,pigment,fire,pick,dyes,temperature){
   const {g,N,A,R}=obj,pp=g.attributes.position,cc=g.attributes.color;
   const H=rows[N-1].z,wall=.71,base=H-depth;
   for(let i=0;i<R;i++){
     let idx,u,r,y,inner=false;
     if(i===0){idx=0;r=.001;y=.005;}
     else if(i<=N){idx=i-1;r=rows[idx].r;y=rows[idx].z;}
     else if(i<=N+4){idx=N-1;const ang=(i-N)*Math.PI/5;r=rows[idx].r-wall*.5+Math.cos(ang)*wall*.5;y=H+Math.sin(ang)*.34;}
     else if(i<=2*N+4){idx=2*N+4-i;u=idx/(N-1);inner=true;
       r=(rows[idx].r-wall)*(.18+.82*Math.sin(Math.PI*.5*u)**.40);y=base+depth*(.05+.95*u);}
     else{idx=0;inner=true;r=.001;y=base+depth*.045;}
     const row=rows[idx],height=idx/(N-1);
     for(let j=0;j<=A;j++){
       const a=j/A*tau,si=Math.sin(a),co=Math.cos(a),k=i*(A+1)+j;
       const throwLine=.042*Math.sin((y*.98+height*.37)*Math.PI*2+.13*si)+.045*Math.sin(a*3+.7*y)*(.35+.65*height);
       let rad=Math.max(.0004,r+throwLine),wobble=.032*Math.cos(a*2+height*3)*height;
       pp.setXYZ(k,rad*si*SCALE,(y+wobble)*SCALE,rad*co*SCALE);
       const aj=(j/A*Pottery.A)%Pottery.A,sector=Math.floor(aj),k0=idx*Pottery.A;
       const ink=mix(pigment[k0+sector],pigment[k0+(sector+1)%Pottery.A],aj-sector);
       const f=fire[idx];const coverage=inner?Math.max(ink*(.56+.38*height),pigment[(N-1)*Pottery.A+sector]*.45*height):ink;
       cb.copy(cream).lerp(tempered,f);cr.copy(wetCoat[pick]).lerp(coat[pick],f);
       if(dyes&&ink>.001){
         let weights=0,R=0,G=0,B=0;
         for(let c=0;c<3;c++){const w=mix(dyes[(k0+sector)*3+c],dyes[(k0+(sector+1)%Pottery.A)*3+c],aj-sector);weights+=w;
           R+=mix(wetCoat[c].r,coat[c].r,f)*w;G+=mix(wetCoat[c].g,coat[c].g,f)*w;B+=mix(wetCoat[c].b,coat[c].b,f)*w;}
         if(weights>.001)cr.setRGB(R/weights,G/weights,B/weights);
       }
       cb.lerp(cr,Math.min(1,coverage*1.17));
       if(temperature){const glow=clamp((temperature[idx]-410)/630);cb.r+=.26*glow;cb.g+=.047*glow;}
       g.attributes.slipGloss.setX(k,clamp(.18*(row.wet??0)+.62*coverage+.18*f));
       const grooves=Math.sin(y*5.6+si*.21),af=.992+.022*grooves+.012*Math.cos(a*3+height*9);
       const shade=inner?.72+.27*height:1;
       cc.setXYZ(k,cb.r*af*shade,cb.g*af*shade,cb.b*af*shade);
     }
   }pp.needsUpdate=true;cc.needsUpdate=true;g.attributes.slipGloss.needsUpdate=true;g.computeVertexNormals();
   // Weld the two UV seam normals while keeping their independent texture coordinates.
   const nn=g.attributes.normal;for(let i=0;i<R;i++){let k=i*(A+1),l=k+A;let x=(nn.getX(k)+nn.getX(l))*.5,y=(nn.getY(k)+nn.getY(l))*.5,z=(nn.getZ(k)+nn.getZ(l))*.5;nn.setXYZ(k,x,y,z);nn.setXYZ(l,x,y,z);}
 }
 const streamM=ceramic('#7c9da9'),streams=[];
 for(let i=0;i<13;i++)streams.push(ball(scene,0,0,0,.032,.06,.032,streamM));
 const dustMat=mat('#eee0bf',.63,0,{transparent:true,opacity:.42,depthWrite:false,emissive:'#ad9e7d',emissiveIntensity:.3});
 const dust=new T.InstancedMesh(geoBall(),dustMat,s.motes.length);scene.add(dust);dust.frustumCulled=false;
 function geoBall(){return new T.IcosahedronGeometry(1,0);}
 const dummy=new T.Object3D();
 // A small sculpted finger demonstrates the motion within the scene.
 const guide=group(scene),guideMat=mat('#fff2d5',.48,0,{transparent:true,opacity:0,depthWrite:false,emissive:'#ffdfa2',emissiveIntensity:.17});
 const finger=group(guide);ball(finger,.05,-.19,0,.109,.116,.048,guideMat);
 function digit(a,b,r){rod(finger,a,b,r,guideMat,r,16);ball(finger,...a,r,r,r,guideMat);ball(finger,...b,r,r,r,guideMat);}
 digit([-.017,-.015,.006],[-.026,-.173,.008],.030);digit([.03,-.092,-.002],[.033,-.176,0],.031);
 digit([.082,-.108,-.006],[.081,-.19,0],.030);digit([.13,-.134,-.01],[.12,-.208,-.006],.026);
 digit([-.087,-.155,.009],[-.011,-.229,.016],.032);finger.rotation.z=.48;batch(finger);
 const halo=ring(scene,0,0,0,.13,.006,guideMat);guide.traverse(o=>{o.castShadow=o.receiveShadow=false;});
 const focusRing=ring(scene,0,0,0,.46,.009,mat('#d4c79b',.32,.16,{transparent:true,opacity:.49,emissive:'#d1b879',emissiveIntensity:.22,depthWrite:false}));focusRing.castShadow=false;
 const trayG=group(scene);lathe(trayG,[[.01,0],[.75,0],[.81,.035],[.82,.082],[.8,.092],[.01,.092]],M.honey);
 const waterGeo=new T.PlaneGeometry(.69,.69,38,38);waterGeo.rotateX(-Math.PI/2);
 // Clip the radial mesh exactly to the inside of the bucket.
 {const v=waterGeo.attributes.position;for(let i=0;i<v.count;i++){let x=v.getX(i),z=v.getZ(i),r=Math.hypot(x,z);if(r>.346){v.setX(i,x*.346/r);v.setZ(i,z*.346/r);}}}
 bucket.water.geometry=waterGeo;
 const look=V(),baseCam=V(),baseLook=V(),vLook=V(),vCam=V(),focus=V(),wantCam=V(),temp=V();
 let W=0,H=0,portrait=false,aspect=1,packing=1,lastStage='',lastRound=-1,lastCycle=-1;
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true,samples:0});
 target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
 const postScene=new T.Scene(),postCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const post=new T.ShaderMaterial({uniforms:{frame:{value:target.texture},depth:{value:target.depthTexture},px:{value:new T.Vector2()},focal:{value:6.2},grain:{value:0},near:{value:camera.near},far:{value:camera.far}},
 vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`uniform sampler2D frame,depth;uniform vec2 px;uniform float focal,grain,near,far;varying vec2 uv0;
 void main(){float d=texture2D(depth,uv0).r;float z=near*far/(far-d*(far-near));
 float coc=clamp(abs(z-focal)/max(z,.5)*3.15,0.,1.8);vec3 original=texture2D(frame,uv0).rgb,col=original*2.,bloom=vec3(0.);
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 off=vec2(cos(a),sin(a))*px;
 col+=texture2D(frame,uv0+off*coc).rgb;bloom+=max(texture2D(frame,uv0+off*4.3).rgb-vec3(1.23),vec3(0.));}
 col=col*.1+bloom*.0055;vec2 v=uv0-.5;col*=1.-.14*dot(v,v);
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float n=fract(sin(dot(gl_FragCoord.xy+grain,vec2(12.9898,78.233)))*43758.5453);gl_FragColor.rgb+=(n-.5)*.004;}
 `,depthTest:false,depthWrite:false});
 postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
 function layout(){
   W=canvas.clientWidth;H=canvas.clientHeight;aspect=W/H;portrait=aspect<.86;
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7,Math.sqrt(2100000/(W*H))));renderer.setSize(W,H,false);
   const sz=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(sz.x,sz.y);post.uniforms.px.value.set(1/sz.x,1/sz.y);
   camera.aspect=aspect;camera.updateProjectionMatrix();
   const p=portrait;packing=p?.78:1;
   baseCam.set(0,p?4.60:3.71,p?Math.max(9.8,4.86/aspect):Math.max(6.64,7.85/aspect));
   baseLook.set(0,p?1.93:1.86,0);camera.position.copy(baseCam);look.copy(baseLook);camera.lookAt(look);
   const wheelScale=p?.81:1;wheel.g.scale.setScalar(wheelScale);wheel.g.position.set(p?-.08:-.25,1.071,p?.89:.95);
   center.copy(wheel.g.position);center.y+=.465*wheelScale;
   const ks=p?.64:.86;kiln.g.scale.setScalar(ks);kiln.g.position.set(p?1.10:2.42,p?1.17:.87,p?-2.38:-2.10);
   hearth.set(kiln.g.position.x,kiln.g.position.y+.43*ks,kiln.g.position.z+1.01*ks);
   side.position.x=p?.47:1.18;west.position.x=p?-1.57:-3.18;
   head.position.set(0,p?4.43:3.57,-2.47);
   bucket.g.scale.setScalar(p?.8:1.06);bucket.g.position.set(p?-.98:-1.68,1.071,p?1.58:1.55);
   tools.position.set(p?.88:1.46,1.071,p?1.67:1.54);tools.scale.setScalar(p?.66:1);
   plant.position.set(p?-1.43:-2.78,1.894,-2.22);plant.scale.setScalar(p?.75:1.1);
   shelf.scale.setScalar(p?.63:.81);shelf.position.set(p?-.43:-1.03,1.938,-2.12);
   const jarScale=p?.77:1.05;
   glazeBoard.position.set(p?.59:1.46,p?1.48:1.105,p?-.76:.22);glazeBoard.scale.set(p?.76:1,p?.8:1,p?.82:1);
   glazeBoard.rotation.y=p?.03:-.14;jarRack.visible=p;jarRack.position.set(.59,1.07,-.76);
   for(let i=0;i<3;i++){const loc=V((i-1)*.61,.042,0);glazeBoard.localToWorld(loc);jarBase[i].copy(loc);jars[i].scale.setScalar(jarScale);}
   accessory.set(p?-.78:-1.47,1.15,p?-.43:-.32);extrasBoard.position.copy(accessory);extrasBoard.scale.setScalar(p?.7:.95);
   shelfBed.position.set(p?-.23:.35,1.96,p?-1.61:-1.56);shelfBed.scale.setScalar(p?.70:.95);
   for(let i=0;i<3;i++){
     slots[i].set(shelfBed.position.x+(i-1)*(p?.55:.79),1.955,shelfBed.position.z);
     flowersHome[i].set(center.x+(i-1)*(p?.46:.64),1.52,center.z+.13);}
   if(gallery.length)gallery.forEach((g,i)=>g.position.copy(slots[i]));
   if(p){hills.scale.x=.85;hills.position.x=1.0;}else {hills.scale.x=1;hills.position.x=0;}
 }
 const projections={},ray=new T.Raycaster(),pointer=new T.Vector2(),hits=[],hitMesh=new T.SphereGeometry(1,16,12);
 function zone(key,pos,scale){let o=projections[key];if(!o){o=new T.Mesh(hitMesh);o.userData.id=key;projections[key]=o;hits.push(o);}
   o.position.copy(pos);o.scale.set(...scale);o.updateMatrixWorld();}
 function active(key){const st=s.stage;return (key==='clay'&&['shape','coilSeal','kilnReady'].includes(st))||
   (key==='water'&&['shape','coilSeal'].includes(st))||(key.startsWith('jar')&&['glaze','kilnReady'].includes(st))||
   (key==='kiln'&&st==='kilnReady')||(key==='coil'&&st==='coil')||(key==='stack'&&st==='stack')||
   (key.startsWith('flower')&&st==='flower'&&!s.flowers.includes(Number(key.slice(-1))));}
 function rayHit(e){
   pointer.set(e.clientX/W*2-1,1-e.clientY/H*2);ray.setFromCamera(pointer,camera);
   const list=ray.intersectObjects(hits,false);return list.find(r=>active(r.object.userData.id))||list[0];
 }
 const topPos=V(),basePos=V();function fingerCoords(e){
   topPos.copy(center);topPos.y+=Math.max(.45,s.clay.at(-1).z*SCALE*packing);
   basePos.copy(center);topPos.project(camera);basePos.project(camera);
   const height=Math.max(65,Math.abs(basePos.y-topPos.y)*H*.5);
   return [(e.clientX-(basePos.x+1)*W*.5)/Math.max(90,height*1.55)+.5,(e.clientY-(1-topPos.y)*H*.5)/height];
 }
 let pointerId=null,audioCtx=null,hum=null,humVol=null,audioNext=0;
 function note(hz,seconds,volume=.06,type='sine',end=hz){
   if(!audioCtx)return;const t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();
   o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(end,t+seconds);g.gain.setValueAtTime(.0001,t);
   g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+seconds);o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+seconds+.03);
 }
 function soundOn(){if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC();hum=audioCtx.createOscillator();humVol=audioCtx.createGain();
    hum.type='sine';humVol.gain.value=0;hum.connect(humVol).connect(audioCtx.destination);hum.start();}
   if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
 }
 canvas.addEventListener('pointerdown',e=>{if(pointerId!==null)return;e.preventDefault();soundOn();let h=rayHit(e);if(!h)return;
   let key=h.object.userData.id;const [x,y]=fingerCoords(e);const used=game.down(key,x,y,e.pressure);pointerId=e.pointerId;canvas.setPointerCapture(e.pointerId);
   if(used){if(key.startsWith('jar')){note([494,587,659][+key.slice(-1)],.53,.044);note(1318,.17,.008);}
     else if(key==='water')note(710,.16,.041,'sine',330);else if(key.startsWith('flower'))note(740,.7,.029);
     else if(key!=='clay')note(181,.26,.032,'sine',118);}
 });
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointerId){if(e.pointerType==='mouse'){const h=rayHit(e);canvas.style.cursor=h&&active(h.object.userData.id)?'pointer':'default';}return;}
    const [x,y]=fingerCoords(e);game.move(x,y,e.pressure);});
 const release=e=>{if(e.pointerId===pointerId){game.up();pointerId=null;}};for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,release);
 window.addEventListener('blur',()=>{game.up();pointerId=null;});
 function soundStep(){
   if(!audioCtx)return;const t=audioCtx.currentTime;
   hum.frequency.setTargetAtTime(42+s.rpm*.25,t,.12);humVol.gain.setTargetAtTime(.0025*s.rpm/120+.007*s.force,t,.15);
   if(s.stage!==lastStage){if(s.stage==='aligned'||s.stage==='display'){note(s.stage==='display'?659:523,.96,.031);note(s.stage==='display'?988:784,1.4,.016);}
     if(s.stage==='nesting')note(388,.3,.031);if(s.stage==='firing')note(94,.8,.025,'triangle',59);}
   if(s.time>audioNext){audioNext=s.time+.19+Math.random()*.27;
     if(s.fuel>.15)note(64+Math.random()*87,.07,.009*s.fuel,'triangle',42);
     else if(s.feed>.3)note(414+Math.random()*140,.09,.009,'sine',208);}
 }
 // A narrow sash, a small kiln maker's flower and pins pick up the northern light.
 const badge=group(wheel.g,0,.137,.716),badgeM=mat('#c1ab79',.38,.6);
 ball(badge,0,0,0,.076,.065,.012,badgeM);for(let j=0;j<7;j++){let a=j*tau/7;const b=ball(badge,.028*Math.sin(a),.028*Math.cos(a),.012,.008,.019,.003,M.enamel);b.rotation.z=-a;}batch(badge);
 const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;
 const ctx=skyCanvas.getContext('2d'),skyPixels=ctx.createImageData(512,256);
 for(let j=0;j<256;j++)for(let i=0;i<512;i++){const t=j/256,h=clamp((.53-t)*3.2),v=noise(i*.015,j*.126)*.55+noise(i*.043,j*.33)*.29+noise(i*.096,j*.41)*.16;
   const cloud=clamp((v-.52)*4)*clamp(1-Math.abs(t-.47)*14)*.48,k=(j*512+i)*4;
   skyPixels.data[k]=mix(mix(214,107,h),243,cloud);skyPixels.data[k+1]=mix(mix(226,163,h),239,cloud);skyPixels.data[k+2]=mix(mix(223,193,h),225,cloud);skyPixels.data[k+3]=255;}
 ctx.putImageData(skyPixels,0,0);const skyTex=new T.CanvasTexture(skyCanvas);skyTex.colorSpace=T.SRGBColorSpace;
 const skyMat=mat(0x000000,1,0,{emissive:0xffffff,emissiveMap:skyTex,emissiveIntensity:1.0,side:T.BackSide,fog:false});
 const dome=mesh(scene,new T.SphereGeometry(86,56,28),skyMat);dome.castShadow=dome.receiveShadow=false;
 const slipMarks=group(scene);const slipM=mat('#c6b694',.71),pr=Art.rng(719);
 for(let j=0;j<21;j++){const x=pr()*1.8-.95,z=pr()*1.8-.80;if(Math.hypot(x,z)<.83)continue;
    ball(slipMarks,x,0,z,.025+pr()*.055,.002,.014+pr()*.035,slipM);}
 batch(slipMarks);
 function removeArt(g){g.traverse(o=>{if(o.isMesh&&!Object.values(Art.geo).includes(o.geometry))o.geometry.dispose();});g.removeFromParent();}
 function syncGallery(){
   while(gallery.length>s.collection.length){removeArt(gallery.pop());}
   while(gallery.length<s.collection.length){
     const i=gallery.length,item=s.collection[i],g=group(display),b=makeBody();g.add(b.o);
     bodyShape(b,item.profile.map(p=>({r:p[0],z:p[1]})),item.depth,item.coat,item.fire,item.color,item.dyes);
     b.m.roughness=.19;b.m.clearcoat=.86;
     if(item.stacked){const n=Studio.paintedWare(g,'bowl',.79,item.color);n.position.y=item.profile.at(-1)[1]*SCALE*.73;}
     if(item.large){const h=item.profile.at(-1)[1]*SCALE,R=item.profile.at(-1)[0]*SCALE;for(let j=0;j<2;j++)ring(g,0,h+.035+j*.060,0,R-.02*j,.045,ceramic(glazeColors[item.color]));}
     g.scale.setScalar(portrait?.40:.48);g.position.copy(slots[i]);gallery.push(g);
   }
   while(bouquetFlowers.length>s.flowers.length)removeArt(bouquetFlowers.pop());
   while(bouquetFlowers.length<s.flowers.length){let i=bouquetFlowers.length,g=Studio.bloom(readyBouquet,0,0,0,s.flowers[i],portrait?.83:1.02);bouquetFlowers.push(g);}
 }
 const ax=V(),ay=V(),az=V(),nUp=V(0,1,0),va=V(),vb=V(),vc=V(),journey=V(),guideTarget=V(),camAim=V();
 function poseCord(r,rootScale){
   const top=s.clay.at(-1),R=(top.r-.16)*SCALE;
   for(let i=0;i<cordPoints.length;i++){const u=i/(cordPoints.length-1),p=s.coilPart[i].q,a=u*tau*1.87;
     va.copy(accessory);va.x+=Math.sin(u*6.9)*.34*packing;va.y+=.064+.011*Math.sin(u*4.1);va.z+=(u-.5)*.47;
     vb.set(Math.sin(a)*R,top.z*SCALE+.028+u*.102,Math.cos(a)*R).multiplyScalar(rootScale).add(r);
     cordPoints[i].copy(va).lerp(vb,p);cordPoints[i].y+=Math.sin(p*Math.PI)*(.57+.20*u);
   }
   for(let i=0;i<56;i++){
     ax.copy(cordPoints[Math.min(55,i+1)]).sub(cordPoints[Math.max(0,i-1)]).normalize();az.crossVectors(ax,nUp).normalize();ay.crossVectors(az,ax).normalize();
     for(let j=0;j<9;j++){let a=j*tau/9;va.copy(cordPoints[i]).addScaledVector(az,.041*rootScale*Math.cos(a)).addScaledVector(ay,.041*rootScale*Math.sin(a));
       cordGeo.attributes.position.setXYZ(9*i+j,va.x,va.y,va.z);}
   }cordGeo.attributes.position.needsUpdate=true;cordGeo.computeVertexNormals();
 }
 const waveM=waterGeo.attributes.position,dates=[C('#ffeed6'),C('#ffc39b'),C('#edf6ff'),C('#cfdaef'),C('#ffffff'),C('#ffcfaa'),C('#c9d7d5'),C('#dac3b3')];
 function sceneStep(){
   const st=s.stage,rr=s.round,done=['display','flower','planting','bouquet','dawn'].includes(st),p=portrait;
   const showFlowers=['flower','planting','bouquet','dawn'].includes(st),atKiln=st==='firing',loading=st==='loading',unload=st==='unloading';
   const travel=loading?s.travel:atKiln?1:unload?clamp(2-s.travel):0,out=unload?clamp(s.travel-1):done?1:0;
   if(rr!==lastRound||s.cycle!==lastCycle||st!==lastStage)syncGallery();
   const dawn=st==='dawn'?ease(clamp(s.age/8.8)):0;display.position.x=dawn*(p?-3.6:-6.7);readyBouquet.position.x=display.position.x;
   shelfBed.visible=s.collection.length>0||unload;shelfBed.position.x=(p?-.23:.35)+display.position.x;
   slipMarks.position.copy(center);slipMarks.position.y=1.073;
   // The ware board follows the kiln rails, then arcs to the display ledge.
   const sz=(p?.81:1)*(1-.40*travel)*(1-out)+out*(p?.40:.48);
   journey.copy(center);
   if(loading||atKiln){journey.lerp(hearth,travel);journey.y+=Math.sin(travel*Math.PI)*.52;journey.z-=atKiln?.48:travel**4*.48;}
   else if(unload){journey.copy(hearth);journey.z-=.48;journey.lerp(slots[rr],out);journey.y+=Math.sin(Math.PI*out)*.59;journey.z+=Math.sin(Math.PI*out)*.72;}
   else if(!done&&s.entry<1){journey.x-=(1-s.entry)*(p?1.7:2.6);journey.y+=.18*Math.sin(s.entry*Math.PI);}
   body.o.visible=!done;body.o.position.copy(journey);body.o.scale.setScalar(sz);body.o.rotation.y=s.angle%tau;
   if(!done){
     bodyShape(body,s.clay,s.depth,s.pigment,s.fired,s.color,s.dyes,s.potHeat);
     let gloss=s.fired[12];body.m.roughness=.63-.34*s.clay[11].wet-.13*gloss;body.m.clearcoat=.16+.22*s.clay[18].wet+.54*gloss;
   }
   trayG.visible=loading||unload;trayG.scale.setScalar(sz);trayG.position.copy(journey);trayG.position.y-=.093*sz;
   wheel.disc.rotation.y=s.angle%tau;
   const kAim=.34+.73*s.door+.29*s.fuel;kiln.gate.rotation.y=-kAim*1.35;
   kiln.pieces.forEach((f,i)=>{const heat=s.heat[Math.floor(i*8/14)],b=s.fire[i];
     f.visible=b.h>.005&&s.fuel>.006;f.scale.set(.69+.34*b.w,Math.min(1.82,.09+b.h*2.7)*s.fuel,.61);f.rotation.z=(b.w-.5)*.48+s.wind*.08;
     f.material.emissiveIntensity=.43+heat*.0011;});
   kiln.gate.traverse(o=>{if(o.isMesh&&o.material.color){o.material.emissive.setRGB(.20,.052,.009);o.material.emissiveIntensity=s.fuel*.48;}});
   let pour=st==='pour'?s.tilt:0;
   const height=s.clay.at(-1).z*SCALE*sz;
   jars.forEach((j,i)=>{const v=i===s.color?pour:0;j.position.copy(jarBase[i]);
     va.copy(center);va.x+=.56*packing;va.y+=height+.53;va.z-=.07;
     j.position.lerp(va,v);j.position.y+=.19*Math.sin(v*Math.PI);j.rotation.z=1.81*v+(s.hitPart==='jar'+i?s.hit*.045:0);
     const cap=j.userData.cap,rest=j.userData.capRest,open=clamp(v*3.1);
     vb.copy(jarBase[i]);vb.y+=rest*j.scale.y;vc.copy(jarBase[i]);vc.x+=.20*packing;vc.z+=.24*packing;vc.y+=.046*packing;
     vb.lerp(vc,open);vb.y+=.24*Math.sin(open*Math.PI);j.worldToLocal(vb);cap.position.copy(vb);cap.rotation.z=-j.rotation.z;
   });
   // The stream breaks into drops below the mouth, with a gap as the bottle rights itself.
   if(s.feed>.01){
     const jar=jars[s.color];ax.set(0,[.57,.5,.48][s.color]*1.1,0);jar.localToWorld(ax);ay.copy(center);ay.x=ax.x-.045;ay.z=ax.z+.02;ay.y+=height+.015;
     streamM.color.copy(wetCoat[s.color]);
     streams.forEach((m,i)=>{let u=(i+.5)/streams.length;m.visible=s.feed>i/34;
       m.position.copy(ax).lerp(ay,u);m.position.x-=.037*Math.sin(u*Math.PI);m.scale.set(.024*packing*(1-u*.36),(.036+.023*s.feed)*packing,.024*packing);});
   }else streams.forEach(o=>o.visible=false);
   const coiling=rr===1&&(!['shape','display'].includes(st))&&!done;
   cord.visible=coiling;extrasBoard.visible=st==='coil'||st==='winding'||st==='stack'||st==='nesting';if(coiling)poseCord(journey,sz);
   const stacking=rr===2&&st!=='shape'&&!done;offered.visible=stacking;
   if(stacking){const q=s.stack;offered.position.copy(accessory);va.copy(journey);va.y+=height*.73;
     offered.position.lerp(va,q);offered.position.y+=Math.sin(q*Math.PI)*.67+.053*(1-q);
     offered.scale.setScalar(mix(p?.65:.79,sz*.79/.67,q));offered.rotation.z=(1-q)*-.105+s.stackBounce*.045;}
   const familyHere=s.round===2&&(s.basket>.001||showFlowers),basketSlide=(1-s.basket)*(p?3.2:5.1);
   flowerBasket.visible=familyHere;flowerBasket.position.copy(center);flowerBasket.position.y+=.023;flowerBasket.position.x+=basketSlide;
   flowerBasket.scale.setScalar(p?.82:1.12);
   for(let i=0;i<3;i++){
     const f=toolsFlowers[i],moving=st==='planting'&&i===s.bloomChoice,q=moving?s.flowerAt:0;
     f.visible=familyHere&&!s.flowers.includes(i);f.position.copy(flowersHome[i]);f.position.x+=basketSlide;f.position.y=flowerBasket.position.y+.17;
     va.copy(slots[1]);va.x+=(s.flowerCount-1)*.055;va.y+=p?.47:.62;f.position.lerp(va,q);f.position.y+=Math.sin(q*Math.PI)*.70;
     f.rotation.z=mix((i-1)*-.31,(s.flowerCount-1)*.32,q)+s.sway[i].x;f.rotation.x=mix(.78,-.15,q);f.scale.setScalar(p?.83:1.02);
   }
   bouquetFlowers.forEach((f,i)=>{f.position.copy(slots[1]);f.position.x+=(i-1)*.055;f.position.y+=p?.47:.62;f.rotation.z=(i-1)*.32+s.sway[i].x;f.rotation.x=-.15+s.sway[i+1].x*.51;});
   plant.rotation.z=s.sway[1].x*.65;
   const kindIndex=['bowl','jar','vase'].indexOf(s.kind),referenceScale=[.51,.48,.50][kindIndex],aligned=clamp((s.match-.36)/.53);
   comparison.visible=['shape','aligned','coilSeal'].includes(st);
   comparison.position.set(.91*s.shadowSlot+.22*(1-aligned),.004,-.11);
   const outline=comparisonGeometry.attributes.position;
   for(let i=0;i<Pottery.N;i++){let q=Pottery.N-1-i,u=q/(Pottery.N-1),p=s.clay[q],
     target=Pottery.profile(s.kind,u),r=mix(p.r/(s.round===1?1.17:1),target,aligned)*referenceScale/14;
     let y=mix(p.z/(s.round===1?1.30:1),Pottery.heightOf(s.kind,false)*u,aligned)*referenceScale/14;
     outline.setXYZ(i*2,-r,y,0);outline.setXYZ(i*2+1,r,y,0);}
   outline.needsUpdate=true;
   const lift=(st==='aligned'?ease(clamp(s.age/.65))*clamp((3-s.age)/.6):0);
   goals.forEach((g,i)=>{const same=i===['bowl','jar','vase'].indexOf(s.kind),match=s.match*Math.exp(-5.4*(s.shadowSlot-(i-1))**2);
     g.position.y=same?.049*lift:0;const m=marks[i].material;
     m.emissive.setRGB(.45,.28,.085);m.emissiveIntensity=match*(.26+.95*lift);});
   for(let i=0;i<waveM.count;i++){let x=waveM.getX(i),z=waveM.getZ(i),r=Math.hypot(x+.018,z-.012);
     const idx=clamp(r/.37)*20,j=Math.floor(idx),h=mix(s.water[j].h,s.water[Math.min(20,j+1)].h,idx-j);waveM.setY(i,h*.066);}
   waveM.needsUpdate=true;waterGeo.computeVertexNormals();
   bucket.rings.forEach((r,i)=>{r.position.y=.426+s.water[2+i*3].h*.066;r.scale.setScalar(1+s.water[2+i*3].v*.017);});
   bucket.drop.visible=s.drop>0;bucket.drop.position.y=.70-.27*s.drop*s.drop;bucket.drop.scale.y=.019+.018*s.drop;
   s.motes.forEach((m,i)=>{dummy.position.set((m.x-.5)*6.5,1.2+m.y*2.2,-2.1+m.z*3.7);dummy.scale.setScalar(.0017+m.z*.0023);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);});dust.instanceMatrix.needsUpdate=true;
   const d=s.daylight;scene.fog.color.copy(dates[6]).lerp(dates[7],d);skyMat.emissive.copy(dates[4]).lerp(dates[5],d*.94);
   sun.color.copy(dates[0]).lerp(dates[1],d);ambient.color.copy(dates[2]).lerp(dates[3],d);sun.intensity=2.18-.53*d+.043*s.wind;
   sun.position.set(-4.4-d*1.02,7.7-d*3.2,-3.6+d*.7);sun.target.updateMatrixWorld();
   const k=s.camKiln,b=s.camShelf;wantCam.copy(baseCam);wantCam.x+=k*(p?.41:.69)-b*.09;wantCam.z-=k*.46+b*.68;wantCam.y-=k*.12+b*.25;
   camera.position.copy(wantCam);look.copy(baseLook);look.x+=k*(p?.61:1.13)+b*(p?-.11:.07);look.y+=k*.15+b*.32;look.z-=k*.59+b*.98;camera.lookAt(look);camera.updateMatrixWorld();
   zone('clay',va.copy(journey).add(V(0,height*.52,0)),[s.clay[15].r*SCALE*sz*1.08,height*.62,s.clay[15].r*SCALE*sz*1.08]);
   zone('water',va.copy(bucket.g.position).add(V(0,.32,0)),[.40*packing,.38*packing,.40*packing]);
   jars.forEach((g,i)=>zone('jar'+i,va.copy(g.position).add(V(0,.28*packing,0)),[.28*packing,.35*packing,.29*packing]));
   zone('kiln',va.copy(kiln.g.position).add(V(0,kiln.g.scale.y,0)),[.99*kiln.g.scale.x,1.1*kiln.g.scale.y,.97*kiln.g.scale.z]);
   zone('coil',va.copy(accessory).add(V(0,.1,0)),[.44*packing,.19,.40*packing]);
   zone('stack',va.copy(accessory).add(V(0,.23,0)),[.52*packing,.34,.51*packing]);
   toolsFlowers.forEach((g,i)=>zone('flower'+i,va.copy(g.position).add(V(0,.54*packing,.29*packing)),[.26*packing,.58*packing,.38]));
   let key='clay';if(st==='glaze')key='jar0';if(st==='kilnReady')key='kiln';if(st==='coil'||st==='stack')key=st;if(st==='flower')key='flower'+[0,1,2].find(i=>!s.flowers.includes(i));
   if(st==='shape'&&s.clay[12].wet<.21)key='water';
   const h=s.guidePhase;guideTarget.copy(projections[key].position);
   if(key==='clay'){guideTarget.x+=.35*sz;guideTarget.y+=height*(.05+.76*ease(h));guideTarget.z+=.49*sz;}
   else if(key==='kiln'){guideTarget.z+=.78*kiln.g.scale.z;guideTarget.y+=.16;}
   else{guideTarget.z+=.19*packing;guideTarget.y+=.05+Math.abs(h-.55)*.20;}
   guide.position.copy(guideTarget);guide.position.z+=.045;guide.quaternion.copy(camera.quaternion);guide.scale.setScalar(p?1:1.04);
   guide.visible=s.hint>.006;guideMat.opacity=s.hint*.87*clamp((1-h)*7);
   halo.visible=guide.visible;halo.position.copy(guideTarget);halo.quaternion.copy(camera.quaternion);halo.scale.setScalar(.37+.43*h);
   focusRing.visible=['shape','coilSeal','glaze','kilnReady','flower','stack','coil'].includes(st);
   if(key==='clay'){focusRing.position.copy(journey);focusRing.position.y+=.009;focusRing.scale.setScalar((s.clay[0].r*SCALE+.03)*sz/.46);}
   else{focusRing.position.copy(projections[key].position);focusRing.position.y-=key==='kiln'?.55: .22*packing;focusRing.scale.setScalar(key==='kiln'?.92:.59*packing);}
   post.uniforms.focal.value=camera.position.distanceTo(focus.copy(center).lerp(hearth,k).lerp(slots[1],b));post.uniforms.grain.value=s.motes[2].x*4;
   soundStep();lastStage=st;lastRound=rr;lastCycle=s.cycle;
 }
 const fixedLayout=()=>{layout();sceneStep();};
 window.addEventListener('resize',fixedLayout);layout();sceneStep();
 let frameTime=performance.now();function frame(now){
   const dt=Math.max(0,Math.min(.08,(now-frameTime)*.001));frameTime=now;
   if(!document.hidden){game.step(dt);sceneStep();renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCam);}
   requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})();
