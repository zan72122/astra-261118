'use strict';
(()=>{
 const T=THREE, P=PondPhysics, canvas=document.getElementById('pond'), sim=P.create(),st=sim.state;
 const {V,Model,color,rand}=Art,{clamp,mix}=P;
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.065,720);
 scene.fog=new T.FogExp2(0xdadbd4,.0043);
 const hemi=new T.HemisphereLight(0xd6e7ff,0xa49a7f,1.48),sun=new T.DirectionalLight(0xffdcac,2.05);
 scene.add(hemi,sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 Object.assign(sun.shadow.camera,{left:-21,right:21,top:18,bottom:-18,near:1,far:115});
 sun.shadow.bias=-.00016;sun.shadow.normalBias=.014;sun.shadow.camera.updateProjectionMatrix();
 const sunX={value:innerWidth/innerHeight<.8?.090:.244},dir=V(sunX.value,.151,-1).normalize();
 // An analytic sky and a locally generated environment light the PBR surfaces.
 const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;
 const ec=envCanvas.getContext('2d'),im=ec.createImageData(512,256);
 for(let y=0;y<256;y++)for(let x=0;x<512;x++){
   const v=(.5-y/255)*Math.PI,u=(x/511-.5)*Math.PI*2,sy=Math.sin(v),sx=Math.cos(v)*Math.cos(u),sz=Math.cos(v)*Math.sin(u);
   const blend=clamp(sy*2.3,0,1),sunDot=Math.max(0,sx*dir.x+sy*dir.y+sz*dir.z),g=Math.pow(sunDot,65),k=(y*512+x)*4;
   const cols=sy<0?[137,162,163]:[mix(238,115,blend),mix(217,168,blend),mix(184,202,blend)];
   for(let i=0;i<3;i++)im.data[k+i]=clamp(cols[i]+g*[48,34,23][i],0,255);
   im.data[k+3]=255;
 }
 ec.putImageData(im,0,0);
 const env=new T.CanvasTexture(envCanvas);env.mapping=T.EquirectangularReflectionMapping;env.colorSpace=T.SRGBColorSpace;scene.environment=env;scene.environmentIntensity=.62;
 const noiseGL=`
 float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float field(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1.,0.)),f.x),mix(hash2(i+vec2(0.,1.)),hash2(i+1.),f.x),f.y);}
 `;
 const dusk={value:0},morning={value:0};
 const skyMat=new T.MeshStandardMaterial({side:T.BackSide,depthWrite:false,fog:false});
 skyMat.onBeforeCompile=s=>{
   s.uniforms.uDusk=dusk;s.uniforms.uMorning=morning;s.uniforms.uSunX=sunX;
   s.vertexShader='varying vec3 vSky;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSky=position;');
   s.fragmentShader='varying vec3 vSky;uniform float uDusk;uniform float uMorning;uniform float uSunX;\n'+noiseGL+s.fragmentShader.replace('#include <opaque_fragment>',`
    vec3 d=normalize(vSky);float alt=max(0.,d.y);float elevation=mix(.151,.062,uDusk);
    vec3 sunDir=normalize(vec3(uSunX,elevation,-1.));float angle=length(d-sunDir);
    vec3 horizon=mix(vec3(1.14,.89,.67),vec3(1.18,.61,.345),uDusk);
    vec3 top=mix(vec3(.225,.487,.715),vec3(.225,.34,.51),uDusk);
    float blue=1.-exp(-alt*3.95);
    vec3 skyColor=mix(horizon,top,blue);
    skyColor=mix(skyColor,vec3(.68,.86,1.),uMorning*.14);
    vec2 plane=d.xz/max(.035,d.y+.018);
    float cloud=field(plane*vec2(.29,1.55))*.64+field(plane*vec2(.81,4.0))*.26+field(plane*vec2(2.9,8.1))*.10;
    skyColor=mix(skyColor,vec3(1.14,1.04,.92),smoothstep(.48,.83,cloud)*smoothstep(.018,.10,alt)*.48);
    skyColor+=vec3(.52,.32,.14)*exp(-angle*9.)+vec3(.74,.49,.22)*exp(-angle*53.);
    skyColor+=vec3(3.9,3.35,2.6)*(1.-smoothstep(.011,.014,angle));
    outgoingLight=skyColor;
    #include <opaque_fragment>`);
 };
 const sky=new T.Mesh(new T.SphereGeometry(540,48,24),skyMat);sky.renderOrder=-100;sky.frustumCulled=false;scene.add(sky);
 const world=buildLandscape(scene,innerWidth/innerHeight,st);
 const boots=[Art.boot(),Art.boot()];boots.forEach(b=>{b.scale.setScalar(1.47);scene.add(b);});
 // Local contact shadows darken continuously beneath both blades, including on snow.
 const shadowMat=new T.MeshStandardMaterial({color:0x3c5557,transparent:true,opacity:.24,depthWrite:false,roughness:.6});
 shadowMat.onBeforeCompile=s=>{s.vertexShader='varying vec2 vContact;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvContact=uv-.5;');
   s.fragmentShader='varying vec2 vContact;\n'+s.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=pow(max(0.,1.-4.*dot(vContact,vContact)),2.0);');};
 const contacts=boots.map(()=>{const g=new T.Mesh(new T.PlaneGeometry(.9,1.65),shadowMat);g.rotation.x=-Math.PI/2;g.renderOrder=2;scene.add(g);return g;});
 const targetType=renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType;
 const mirror=new T.WebGLRenderTarget(640,400,{type:targetType,depthBuffer:true}),mirrorCam=new T.PerspectiveCamera();
 const reflectUniform={value:mirror.texture},projUniform={value:new T.Matrix4()};
 const gridData=new Uint8Array(128*512*4),gridMap=new T.DataTexture(gridData,128,512);
 gridMap.magFilter=T.LinearFilter;gridMap.minFilter=T.LinearFilter;gridMap.needsUpdate=true;
 const iceMat=new T.MeshPhysicalMaterial({color:0x94c1c7,roughness:.17,metalness:.055,clearcoat:.65,clearcoatRoughness:.13,transparent:true,opacity:.81,depthWrite:false,envMapIntensity:.35});
 iceMat.onBeforeCompile=s=>{
   Object.assign(s.uniforms,{iceMirror:reflectUniform,reflectP:projUniform,film:{value:gridMap},uDusk:dusk,uSunX:sunX});
   s.vertexShader='varying vec3 iWorld;varying vec4 iReflect;uniform mat4 reflectP;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\niWorld=(modelMatrix*vec4(position,1.)).xyz;iReflect=reflectP*vec4(iWorld,1.);');
   s.fragmentShader='varying vec3 iWorld;varying vec4 iReflect;uniform sampler2D iceMirror;uniform sampler2D film;uniform float uDusk;uniform float uSunX;\n'+noiseGL+s.fragmentShader.replace('#include <color_fragment>',`
    #include <color_fragment>
    vec2 q=iWorld.xz;vec4 local=texture2D(film,vec2((q.x+48.)/96.,(q.y+156.)/172.));
    float frost=field(q*.42)*.62+field(q*1.4)*.27+field(q*7.9)*.11;
    float scuff=field(q*vec2(2.1,29.)+frost*3.);
    diffuseColor.rgb*=.72+.31*frost+scuff*.052;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.80,.81),smoothstep(.60,.83,frost)*.37);
    `).replace('#include <roughnessmap_fragment>',`
    #include <roughnessmap_fragment>
    roughnessFactor+=frost*.09+local.r*.065-local.g*.047;
    `).replace('#include <opaque_fragment>',`
    vec3 viewIce=normalize(cameraPosition-iWorld);
    vec2 distort=vec2(field(q*vec2(2.,9.))-.5,field(q*vec2(.8,7.)+12.)-.5)*(.00082+local.b*.0032);
    vec2 uvMirror=iReflect.xy/iReflect.w*.5+.5+distort;
    vec3 reflected=texture2D(iceMirror,clamp(uvMirror,.002,.998)).rgb;
    float grazing=pow(1.-max(0.,viewIce.y),3.1);
    outgoingLight=mix(outgoingLight,reflected,.19+.64*grazing);
    // Fragment-sized glints break up the low sun's reflection along the grain.
    vec3 skyRay=reflect(-viewIce,normalize(vec3((field(q*5.)-.5)*.037,1.,(field(q*vec2(2.,20.))-.5)*.056)));
    vec3 sd=normalize(vec3(uSunX,mix(.151,.062,uDusk),-1.));
    float glint=exp(-abs(skyRay.x-sd.x)*30.-abs(skyRay.y-sd.y)*28.)*step(.48,scuff);
    outgoingLight+=vec3(1.,.72,.38)*glint*(.22+uDusk*.61);
    diffuseColor.a=.54+.40*grazing+.05*frost;
    #include <opaque_fragment>`);
 };
 const ice=new T.Mesh(new T.PlaneGeometry(102,180),iceMat);ice.rotation.x=-Math.PI/2;ice.position.set(0,0,-69);ice.receiveShadow=true;ice.renderOrder=1;scene.add(ice);
 const filmCells=st.cells.map(c=>{const q=P.path(c.s);return {x:Math.round((q.x+48)/96*127),z:Math.round((q.z+156)/172*511)};});
 function updateFilm(){
   st.cells.forEach((c,i)=>{const pos=filmCells[i];for(let dz=-4;dz<=4;dz++)for(let dx=-3;dx<=3;dx++){
     const k=((pos.z+dz)*128+pos.x+dx)*4,weight=Math.max(0,1-Math.hypot(dx/4,dz/6));
     gridData[k]=c.rough/.8*255;gridData[k+1]=clamp(c.moisture+c.heat*.5,0,1)*255*weight;
     gridData[k+2]=clamp(Math.abs(c.wave)*1250,0,1)*255*weight;gridData[k+3]=255;
   }});gridMap.needsUpdate=true;
 }
 // Submerged disks of air, delicate mineral seams and blade scratches.
 const details=new Model(),bubbleGeo=new T.SphereGeometry(1,7,4);
 function ribbon(m,pts,width,finish,col){
   const pos=[],idx=[];pts.forEach((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],theta=Math.atan2(b[2]-a[2],b[0]-a[0]);
     const w=width*(.17+.83*Math.sin(Math.PI*(i+.1)/pts.length)),dx=-Math.sin(theta)*w,dz=Math.cos(theta)*w;
     pos.push(p[0]+dx,p[1],p[2]+dz,p[0]-dx,p[1],p[2]-dz);
     if(i){const k=i*2;idx.push(k-2,k,k-1,k,k+1,k-1);}});
   m.surface(pos,idx,finish,col);
 }
 for(let i=0;i<540;i++){
   const z=7-rand()*152,[l,r]=world.limits(z),x=mix(l,r,rand()),rr=.013+rand()*.057;
   for(let j=0;j<3;j++){const sz=rr*(.3+rand()*.8);
     details.add(bubbleGeo,'snow','#d8e2d9',Art.matrix(V(x+rand()*.17,-.03-rand()*.14,z+rand()*.23),V(sz,sz*.23,sz*.8)));}
 }
 Art.mats.etch.side=T.DoubleSide;
 for(let i=0;i<480;i++){
   const z=6-rand()*154,[l,r]=world.limits(z),x=mix(l,r,rand()),len=.3+rand()*3.7,a=rand()*5.2,pts=[];
   for(let j=0;j<7;j++){const d=j/6*len;pts.push([x+Math.cos(a)*d+Math.sin(d*1.6)*.14,-.014,z+Math.sin(a)*d]);}
   ribbon(details,pts,.006+rand()*.012,'etch',i%2?'#e3ece8':'#bad1d0');
 }
 for(let i=0;i<60;i++){
   const z=4-rand()*40,[l,r]=world.limits(z),x=mix(l,r,rand()),a=rand()*6.28,L=.75+rand()*2.6,pts=[];
   for(let j=0;j<10;j++)pts.push([x+j*L/10*Math.cos(a)+(rand()-.5)*.10,-.024,z+j*L/10*Math.sin(a)+(rand()-.5)*.12]);
   ribbon(details,pts,.009,'etch','#dae9e6');if(i%2===0){const k=pts[6];ribbon(details,[k,[k[0]+.17,-.024,k[2]-.2],[k[0]+.36,-.024,k[2]-.3]],.008,'etch','#c9dfdf');}
 }
 // A pair of shallow, curving scratches at the bank previews the mark the blades leave.
 for(const off of [-.15,.15]){
   const pts=[];for(let j=0;j<=44;j++){
     const f=j/44,a=f*2.75;
     pts.push([-.30+Math.sin(a)*2.6-f*3.3+off*Math.cos(a),-.009,2.34+(1-Math.cos(a))*.95+off*Math.sin(a)]);
   }ribbon(details,pts,.014,'etch','#e1eeeb');
 }
 const iceDetails=details.group(false);scene.add(iceDetails);
 // The golden skate line is laid into the surface. The next star is a solid faceted lure.
 const guideGroup=new T.Group();scene.add(guideGroup);
 const trailLight=new T.MeshStandardMaterial({color:0xffe5af,emissive:0xffbd55,emissiveIntensity:.59,roughness:.27,metalness:.2});
 const guideDash=new T.InstancedMesh(new T.SphereGeometry(1,7,4),trailLight,22);guideDash.frustumCulled=false;guideGroup.add(guideDash);
 function diamond(size){
   const g=new T.BufferGeometry(),pos=[0,size,0,size*.54,0,0,0,-size,0,-size*.54,0,0,0,0,size*.35,0,0,-size*.35];
   g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex([0,3,4,3,2,4,2,1,4,1,0,4,0,1,5,1,2,5,2,3,5,3,0,5]);g.computeVertexNormals();
   const m=new T.Mesh(g,trailLight);m.material.side=T.DoubleSide;return m;
 }
 const lure=new T.Group(),star=diamond(.18),little=diamond(.071),tiny=diamond(.041);
 little.position.set(.19,.09,0);tiny.position.set(-.15,-.05,.01);lure.add(star,little,tiny);guideGroup.add(lure);
 // A contact halo gets its softness from radial falloff rather than a billboard image.
 const haloMat=new T.MeshStandardMaterial({color:0xffedb4,emissive:0xffbe59,emissiveIntensity:.55,transparent:true,depthWrite:false,roughness:.65});
 haloMat.onBeforeCompile=s=>{s.vertexShader='varying vec2 uvHalo;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nuvHalo=uv-.5;');s.fragmentShader='varying vec2 uvHalo;\n'+s.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
 float rr=length(uvHalo)*2.;diffuseColor.a*=(.19*exp(-rr*rr*7.)+.53*exp(-abs(rr-.63)*65.))*(1.-smoothstep(.85,1.,rr));`);};
 const halo=new T.Mesh(new T.PlaneGeometry(1.32,1.32),haloMat);halo.rotation.x=-Math.PI/2;halo.renderOrder=3;guideGroup.add(halo);
 const N=4200,trackGeom=new T.BufferGeometry(),trackPos=new Float32Array(N*12),trackCol=new Float32Array(N*12),idx=[];
 for(let i=1;i<N;i++)for(let b=0;b<2;b++){const k=i*4+b*2;idx.push(k-4,k-3,k,k-3,k+1,k);}
 trackGeom.setAttribute('position',new T.BufferAttribute(trackPos,3).setUsage(T.DynamicDrawUsage));trackGeom.setAttribute('color',new T.BufferAttribute(trackCol,3));trackGeom.setIndex(idx);trackGeom.setDrawRange(0,0);
 const trackMat=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.46,transparent:true,opacity:.77,depthWrite:false});
 trackGeom.setAttribute('normal',new T.BufferAttribute(Float32Array.from({length:N*12},(_,i)=>i%3===1?1:0),3));
 const trackMesh=new T.Mesh(trackGeom,trackMat);trackMesh.frustumCulled=false;trackMesh.renderOrder=3;scene.add(trackMesh);let nMarks=0;
 function tracks(){
   if(st.trail.length<nMarks)nMarks=0;const k0=nMarks;
   while(nMarks<Math.min(N,st.trail.length)){
     const a=st.trail[nMarks],ac=Math.cos(a.heading),as=Math.sin(a.heading);
     const y=.012+.134*a.snow,w=mix(.014+a.depth*9,.063,a.snow),col=color('#e0ece8').lerp(color('#99acac'),a.snow);
     for(let j=0;j<4;j++){
       const off=(j<2?-.245:.245)+(j%2?w:-w),k=nMarks*12+j*3;
       trackPos[k]=a.x+ac*off;trackPos[k+1]=y;trackPos[k+2]=a.z+as*off;
       trackCol[k]=col.r;trackCol[k+1]=col.g;trackCol[k+2]=col.b;
     }nMarks++;
   }
   if(k0!==nMarks){trackGeom.attributes.position.needsUpdate=true;trackGeom.attributes.color.needsUpdate=true;}
   trackGeom.setDrawRange(0,Math.max(0,nMarks-1)*12);
 }
 const flecks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0xf9edcf,emissive:0xffe2a8,emissiveIntensity:.23,roughness:.68}),st.motes.length);
 flecks.frustumCulled=false;scene.add(flecks);
 const snowDust=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0xe6e8dd,roughness:.82}),48);snowDust.frustumCulled=false;scene.add(snowDust);
 const dummy=new T.Object3D(),look=new T.Vector3(),audio=makeSound();
 const finger=document.getElementById('finger'),veil=document.getElementById('morning'),stops=Array.from(document.querySelectorAll('.stop'));
 let lastStage=-1,lastCycle=0,reflectionDue=0,pausedByVisibility=false;
 // Downsample radiance before a small separable bloom. Only the brightest ice and lamp highlights spill.
 const hdr=new T.WebGLRenderTarget(1,1,{type:targetType,samples:Math.min(2,renderer.capabilities.maxSamples)});
 const bloomA=new T.WebGLRenderTarget(1,1,{type:targetType,depthBuffer:false}),bloomB=bloomA.clone();
 const postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),postScene=new T.Scene();
 const postVertex='varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
   uniforms:{source:{value:null},offset:{value:new T.Vector2()},extract:{value:1}},
   vertexShader:postVertex,fragmentShader:`
    varying vec2 screenUv;uniform sampler2D source;uniform vec2 offset;uniform float extract;
    vec3 tap(float n){vec3 c=texture2D(source,screenUv+n*offset).rgb;
      float y=dot(c,vec3(.2126,.7152,.0722));return c*mix(1.,smoothstep(1.18,2.4,y),extract);}
    void main(){gl_FragColor=vec4(tap(0.)*.28+(tap(1.35)+tap(-1.35))*.235+(tap(3.25)+tap(-3.25))*.125,1.);}`});
 const composite=new T.ShaderMaterial({depthTest:false,depthWrite:false,
   uniforms:{source:{value:hdr.texture},glow:{value:bloomB.texture}},vertexShader:postVertex,
   fragmentShader:`varying vec2 screenUv;uniform sampler2D source;uniform sampler2D glow;
    void main(){vec3 c=texture2D(source,screenUv).rgb+texture2D(glow,screenUv).rgb*.067;
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.003;
    }`});
 const quad=new T.Mesh(new T.PlaneGeometry(2,2),blur);quad.frustumCulled=false;postScene.add(quad);
 function present(){
   renderer.setRenderTarget(hdr);renderer.render(scene,camera);quad.material=blur;
   blur.uniforms.source.value=hdr.texture;blur.uniforms.extract.value=1;blur.uniforms.offset.value.set(1/bloomA.width,0);
   renderer.setRenderTarget(bloomA);renderer.render(postScene,postCamera);
   blur.uniforms.source.value=bloomA.texture;blur.uniforms.extract.value=0;blur.uniforms.offset.value.set(0,1/bloomA.height);
   renderer.setRenderTarget(bloomB);renderer.render(postScene,postCamera);
   quad.material=composite;renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
 }
 function resize(){
   const w=innerWidth,h=innerHeight;world.fitShore(w/h);sunX.value=w/h<.8?.090:.244;dir.set(sunX.value,.151,-1).normalize();renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
   const px=renderer.getPixelRatio();hdr.setSize(Math.round(w*px),Math.round(h*px));
   bloomA.setSize(Math.ceil(w*.33),Math.ceil(h*.33));bloomB.setSize(bloomA.width,bloomA.height);
   const d=Math.min(.7,1024/w,1100/h);mirror.setSize(Math.round(w*d),Math.round(h*d));
 }
 addEventListener('resize',resize);resize();
 function guideDistance(){return st.stage===3?9.4:st.stage===2?5.9:4.65;}
 function guidePoint(){
   const p=st.p;
   if(st.stage===3){
     const b=st.boats.find(b=>Math.hypot(b.x-p.x,b.z-p.z)<9 && (b.x-p.x)*Math.sin(st.camera.yaw)-(b.z-p.z)*Math.cos(st.camera.yaw)>1.6);
     if(b)return V(b.x,.15,b.z);
   }
   if(st.stage===4){
     const l=st.lamps.find(l=>!l.lit&&l.s>p.s&&l.s-p.s<8);
     if(l)return V(l.x,.75,l.z);
   }
   const q=P.path(Math.min(P.length,st.p.s+guideDistance()));
   return V(q.x-q.dz*st.p.lane*.32,.026+st.snow*.14,q.z+q.dx*st.p.lane*.32);
 }
 const project=v=>{const a=v.clone().project(camera);return {x:(a.x+1)*innerWidth/2,y:(1-a.y)*innerHeight/2};};
 function updateView(dt,snap=false){
   const p=st.p,qCam=st.camera,spread=st.stage>=3?1:0;
   const sx=Math.sin(qCam.yaw),cz=Math.cos(qCam.yaw);
   camera.position.set(p.x-sx*qCam.distance,qCam.height+.12*st.snow,p.z+cz*qCam.distance);
   look.set(p.x+sx*12,.16+spread*.15,p.z-cz*12);
   camera.lookAt(look);camera.updateMatrixWorld();sky.position.copy(camera.position);
   sun.position.set(p.x+dir.x*70,18+dir.y*30,p.z+dir.z*55);sun.target.position.set(p.x,.2,p.z-3);
   dusk.value=st.skyWarmth;morning.value=st.cycle?1:0;
   scene.fog.color.set(0xd8dfdf).lerp(color('#e8bea0'),st.skyWarmth*.76);
   sun.color.set(0xffdbab).lerp(color('#ffb177'),st.skyWarmth*.9);
   const heading=p.heading,cs=Math.cos(heading),ss=Math.sin(heading);
   boots.forEach((b,i)=>{
     const part=st.boots[i],side=i?1:-1,across=side*(.247+.073*(1-clamp(p.s,0,1)))+part.offset;
     const along=side*.215;
     b.position.set(p.x+cs*across+ss*along,.004+st.snow*.137,p.z+ss*across-cs*along);
     b.rotation.order='YXZ';b.rotation.y=part.yaw;b.rotation.z=part.edge;
     contacts[i].position.copy(b.position);contacts[i].position.y+=.004;contacts[i].rotation.z=part.yaw;
   });
   world.reeds.forEach((g,i)=>{g.rotation.z=-st.cells[i*5].bend;g.rotation.x=st.cells[i*5+2].bend*.27;});
   world.bells.forEach((g,i)=>{g.rotation.x=st.bells[i].angle;});
   world.boatModels.forEach(({g,sg},i)=>{const b=st.boats[i];g.position.set(b.x,.004,b.z);g.rotation.y=-b.yaw;sg.rotation.y=b.vane;});
   world.lampModels.forEach((m,i)=>{const l=st.lamps[i];m.material.emissiveIntensity=l.light*3.4;m.visible=l.light>.004;});
   const local=st.cells[clamp(Math.floor(p.s/P.length*112),0,111)],goal=guidePoint();
   for(let i=0;i<22;i++){
     const d=.65+i*.36,q=P.path(Math.min(P.length,p.s+d)),w=Math.exp(-Math.max(0,d-guideDistance())*.64);
     const lane=p.lane*clamp(1-d/7,0,1),side=(.07*Math.sin(d*1.3)+lane);
     dummy.position.set(q.x-q.dz*side,.023+st.snow*.14,q.z+q.dx*side);
     dummy.rotation.set(0,-Math.atan2(q.dx,-q.dz),0);dummy.scale.set(.023*w,.008,.064*w);dummy.updateMatrix();guideDash.setMatrixAt(i,dummy.matrix);
   }guideDash.instanceMatrix.needsUpdate=true;
   lure.position.copy(goal);lure.position.y+=.36+local.bend*.27;
   lure.quaternion.copy(camera.quaternion);lure.rotateZ(local.bend*1.5);
   halo.position.copy(goal);halo.position.y=.026+st.snow*.14;halo.material.opacity=.8+st.brush*.2;
   for(let i=0;i<st.motes.length;i++){
     const m=st.motes[i];dummy.position.set(p.x+m.x,m.y,p.z+m.z-7);
     dummy.rotation.set(.3*i,i,.4);const scale=(.0046+(i%6)*.0016)*clamp(m.y*4,0,1)*clamp((6.5-m.y)*2,0,1);
     dummy.scale.set(scale,scale,scale*.45);dummy.updateMatrix();flecks.setMatrixAt(i,dummy.matrix);
   }flecks.instanceMatrix.needsUpdate=true;
   // Grain displacement stays at the cell where the blades compressed snow.
   let n=0;
   for(const g of st.grains){if(g.life<=0)continue;
     dummy.position.set(g.x,g.y,g.z);dummy.scale.setScalar(g.radius*g.life);
     dummy.updateMatrix();snowDust.setMatrixAt(n++,dummy.matrix);
   }snowDust.count=n;snowDust.instanceMatrix.needsUpdate=true;
   tracks();world.bench.rotation.z=st.bench.angle;
   const slot=[0,1,2,2,3][st.stage];if(slot!==lastStage){stops.forEach((n,i)=>n.classList.toggle('on',i===slot));lastStage=slot;}
   veil.style.opacity=st.veil.toFixed(3);finger.style.opacity='0';
   if(st.demo>.01){
     const t=(st.idle-4)%5.6,from=project(boots[1].position.clone().add(V(0,.38,0))),to=project(goal);
     const u=clamp((t-.25)/1.6,0,1),ease=u*u*(3-2*u);
     const alpha=clamp(t*4,0,1)*clamp((2.75-t)*3,0,1)*st.demo;
     finger.style.opacity=String(alpha*.88);finger.style.transform='translate('+mix(from.x,to.x,ease)+'px,'+(mix(from.y,to.y,ease)-7)+'px) rotate('+(-12+ease*11)+'deg)';
   }
 }
 function reflection(){
   mirrorCam.copy(camera);const target=look.clone();target.y*=-1;
   mirrorCam.position.y*=-1;mirrorCam.up.set(0,-1,0);mirrorCam.lookAt(target);mirrorCam.updateMatrixWorld();
   projUniform.value.multiplyMatrices(mirrorCam.projectionMatrix,mirrorCam.matrixWorldInverse);
   const hidden=[ice,iceDetails,world.underwater,guideGroup,trackMesh,...contacts];
   hidden.forEach(o=>o.visible=false);sky.position.copy(mirrorCam.position);
   renderer.setRenderTarget(mirror);renderer.shadowMap.autoUpdate=false;renderer.render(scene,mirrorCam);renderer.setRenderTarget(null);
   renderer.shadowMap.autoUpdate=true;hidden.forEach(o=>o.visible=true);sky.position.copy(camera.position);
 }

 const probeTarget=new T.WebGLCubeRenderTarget(128,{type:targetType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
 const probe=new T.CubeCamera(.09,700,probeTarget);let probeStage=-1;
 function captureSurroundings(){
   probe.position.set(st.p.x,.68,st.p.z);sky.position.copy(probe.position);scene.environment=env;
   const hidden=[...boots,...contacts,ice,guideGroup,trackMesh];
   hidden.forEach(m=>m.visible=false);renderer.shadowMap.autoUpdate=false;
   probe.update(renderer,scene);renderer.shadowMap.autoUpdate=true;
   hidden.forEach(m=>m.visible=true);sky.position.copy(camera.position);
   scene.environment=probeTarget.texture;probeStage=st.stage;
 }

 const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(V(0,1,0),0);
 let active=null,muted=false,initialTap=null;
 function touchPoint(e){
   pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);
   const v=V(0,0,0);return ray.ray.intersectPlane(plane,v)?v:null;
 }
 function steering(e,worldPoint){
   const p=st.p,q=P.path(p.s),v=worldPoint;
   if(!v){sim.controls(true,0,.31);return;}
   const dx=v.x-p.x,dz=v.z-p.z,side=dx*(-q.dz)+dz*q.dx,forward=dx*q.dx+dz*q.dz;
   // A child can hold a skate for a gentle glide, or point farther ahead to accelerate.
   sim.controls(true,clamp(side/Math.max(1.5,Math.abs(forward)*.55),-1,1),clamp(.12+Math.hypot(dx,dz)*.054,.12,1),clamp(forward/Math.max(.2,Math.hypot(dx,dz)),-1,1));
 }
 canvas.addEventListener('pointerdown',e=>{
   if(active!==null||st.returning||st.veil>.6)return;
   audio.start();const v=touchPoint(e),goal=guidePoint(),p=st.p;
   const targets=st.stage===1?world.bells:st.stage===3?world.boatModels.map(b=>b.g):st.stage===4?world.lampModels:[];
   for(let i=0;i<targets.length;i++){
     const item=targets[i],location=item.position.clone();
     if(location.distanceTo(camera.position)>23)continue;
     if(st.stage===3)location.y+=1.3;
     const sp=project(location);
     if(Math.hypot(sp.x-e.clientX,sp.y-e.clientY)<Math.max(23,innerHeight*.041)){
       sim.touchObject(st.stage===1?'bell':st.stage===3?'sail':'lantern',i);
       if(location.distanceTo(V(p.x,0,p.z))>1.4){
         active=e.pointerId;canvas.setPointerCapture(active);initialTap={x:e.clientX,y:e.clientY,boot:false};steering(e,location);
       }return;
     }
   }
   const where=project(boots[0].position.clone().add(V(0,.48,0))),other=project(boots[1].position.clone().add(V(0,.48,0)));
   const onBoot=[where,other].some(a=>Math.hypot((a.x-e.clientX)/Math.max(32,innerHeight*.113),(a.y-e.clientY)/Math.max(40,innerHeight*.15))<=1);
   const q=P.path(p.s),ahead=v?(v.x-p.x)*q.dx+(v.z-p.z)*q.dz:0,side=v?Math.abs((v.x-p.x)*(-q.dz)+(v.z-p.z)*q.dx):99;
   const onRibbon=v&&ahead>-.3&&ahead<guideDistance()+3&&side<(st.stage===3?3.4:1.35);
   const starScreen=project(goal.clone().add(V(0,.34,0))),onStar=Math.hypot(starScreen.x-e.clientX,starScreen.y-e.clientY)<Math.max(28,innerHeight*.058);
   if(!(onBoot||onRibbon||onStar)){
     if(ray.intersectObject(world.bench,true).length)sim.touchObject('bench');
     return;
   }
   active=e.pointerId;canvas.setPointerCapture(active);
   initialTap={x:e.clientX,y:e.clientY,boot:onBoot};
   if(onBoot)sim.controls(true,0,.13);else steering(e,v);
 });
 canvas.addEventListener('pointermove',e=>{if(e.pointerId===active){
   if(initialTap.boot&&Math.hypot(initialTap.x-e.clientX,initialTap.y-e.clientY)<7)return;
   initialTap.boot=false;steering(e,touchPoint(e));}});
 function release(e){if(e.pointerId===active){active=null;initialTap=null;sim.controls(false);}}
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 const soundButton=document.getElementById('sound');
 soundButton.addEventListener('click',()=>{audio.start();muted=!muted;audio.mute(muted);soundButton.setAttribute('aria-pressed',String(muted));});
 document.addEventListener('visibilitychange',()=>{pausedByVisibility=document.hidden;if(document.hidden){sim.controls(false);active=null;audio.mute(true);}else audio.mute(muted);});
 window.__GAME__={step:sim.step,getState:sim.getState};
 let previous=performance.now();updateView(0,true);updateFilm();
 function frame(now){
   requestAnimationFrame(frame);const dt=clamp((now-previous)/1000,0,.07);previous=now;if(pausedByVisibility)return;
   sim.step(dt);
   const reset=lastCycle!==st.cycle;if(reset){active=null;lastCycle=st.cycle;}
   updateView(dt,reset);if(st.stage!==probeStage||reset)captureSurroundings();reflectionDue-=dt;
   if(reflectionDue<=0||reset){updateFilm();if(st.stage===2||reset)world.depressSnow();reflection();reflectionDue=st.p.speed>.1?1/25:1/9;}
   present();audio.update(st);
 }
 requestAnimationFrame(frame);
})();
