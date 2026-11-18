/* All surfaces, vegetation, fabric, architecture and fittings are generated locally, in metres. */
function buildGarden(canvas) {
  'use strict';
  const T=THREE, pi=Math.PI, tau=2*pi, clamp=T.MathUtils.clamp;
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(38,1,.05,260);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12;
  scene.fog=new T.FogExp2(0xe2dfc7,.014);
  const sun=new T.DirectionalLight(0xffe2ac,2.55);
  sun.position.set(-9,14,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-11,right:11,top:13,bottom:-10,far:48});
  sun.shadow.normalBias=.018;sun.shadow.bias=-.00035;scene.add(sun,sun.target);
  const ambient=new T.HemisphereLight(0xdaebff,0x9a9970,1.34);scene.add(ambient);
  let seed=39017;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const range=(a,b)=>a+(b-a)*rand(), pick=a=>a[Math.floor(rand()*a.length)];
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), color=x=>new T.Color(x);
  const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a),0,1);return q*q*(3-2*q);};
  const obj=new T.Object3D(), geometries={}, batches=new Map();
  const cube=new T.BoxGeometry(), sphere=new T.SphereGeometry(1,20,14),
    pebble=new T.IcosahedronGeometry(1,1), cylinder=new T.CylinderGeometry(1,1,1,12),
    fineCylinder=new T.CylinderGeometry(1,1,1,32);
  function texture(size,paint,repeat=1,isColor=false){
    const c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),size);
    const tex=new T.CanvasTexture(c); tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeat,repeat);
    tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());if(isColor)tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  const grain=texture(64,(c,n)=>{const im=c.createImageData(n,n);for(let i=0;i<im.data.length;i+=4){const g=range(216,255);im.data[i]=im.data[i+1]=im.data[i+2]=g;im.data[i+3]=255;}c.putImageData(im,0,0);},4);
  const material=(col,rough=.84,metal=0,extra={})=>new T.MeshStandardMaterial({color:col,roughness:rough,metalness:metal,roughnessMap:grain,...extra});
  const neutral=material(0xffffff),wood=material(0xc19765), paleWood=material(0xdfc99e), bark=material(0x79664a);
  function part(geo,mat,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,tint=null){
    const key=geo.uuid+mat.uuid;
    if(!batches.has(key))batches.set(key,{geo,mat,matrices:[],colors:[]});
    obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.rotation.set(rx,ry,rz);obj.updateMatrix();
    const batch=batches.get(key);batch.matrices.push(obj.matrix.clone());batch.colors.push(color(tint===null?0xffffff:tint));
  }
  function rod(a,b,r,mat,geo=cylinder,tint=null){
    const d=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
    const ang=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(v(0,1,0),d.clone().normalize()));
    part(geo,mat,mid.x,mid.y,mid.z,r,d.length(),r,ang.x,ang.y,ang.z,tint);
  }
  function mesh(geo,mat,parent=scene){
    const m=new T.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function flush(){
    batches.forEach(b=>{const m=new T.InstancedMesh(b.geo,b.mat,b.matrices.length);
      b.matrices.forEach((mx,i)=>{m.setMatrixAt(i,mx);m.setColorAt(i,b.colors[i]);});
      m.castShadow=m.receiveShadow=true;scene.add(m);
    });batches.clear();
  }
  function geom(positions,indices,uvs,colors){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);
    if(uvs)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  }
  const skyDusk={value:0};
  const skyMat=material(0xffffff,1,0,{side:T.BackSide,fog:false,depthWrite:false});
  skyMat.onBeforeCompile=sh=>{
    sh.uniforms.evening=skyDusk;
    sh.vertexShader='varying vec3 directionSky;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndirectionSky=position;');
    sh.fragmentShader='varying vec3 directionSky;uniform float evening;\n'+
    `float skyHash(vec2 x){return fract(sin(dot(x,vec2(127.1,311.7)))*43758.5453);}
    float skyNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(skyHash(i),skyHash(i+vec2(1,0)),f.x),mix(skyHash(i+vec2(0,1)),skyHash(i+1.),f.x),f.y);}
    float vapour(vec2 p){return .53*skyNoise(p)+.27*skyNoise(p*2.07)+.13*skyNoise(p*4.12)+.07*skyNoise(p*8.27);}
    `+sh.fragmentShader.replace('#include <opaque_fragment>',`vec3 d=normalize(directionSky);
      float alt=max(0.,d.y);float deep=1.-exp(-alt*8.4);
      vec3 day=mix(vec3(1.23,1.16,.91),vec3(.105,.40,.68),deep);
      vec3 twilight=mix(vec3(1.55,.69,.32),vec3(.23,.29,.49),1.-exp(-alt*4.7));
      vec3 air=mix(day,twilight,evening);
      vec2 p=d.xz/(.105+alt)*2.65+vec2(4.6,2.1);
      float f=vapour(p*vec2(.75,1.6));float cloud=smoothstep(.545,.70,f)*smoothstep(.012,.095,alt);
      float light=clamp(.78+(f-vapour(p+vec2(-.18,.12)))*1.8,.52,1.12);
      air=mix(air,mix(vec3(1.72,1.7,1.54),vec3(1.62,1.06,.77),evening)*light,cloud*.88);
      outgoingLight=air;#include <opaque_fragment>`.replace('air;#','air;\n#'));
  };
  const sky=mesh(new T.SphereGeometry(218,40,24),skyMat);sky.castShadow=sky.receiveShadow=false;sky.renderOrder=-2;
  function ground(x,z){
    const d=Math.max(0,-z-9);
    return -.035+.035*Math.sin(x*.44)*Math.cos(z*.56)+smooth(0,12,d)*(
      .097*d+1.44*Math.sin(x*.095+d*.072)+.78*Math.cos(x*.201-d*.066));
  }
  // Meadow colours follow topography; blade marks and bare soil stay fixed to the land.
  const turf=texture(256,(ctx,n)=>{
    ctx.fillStyle='#dadccb';ctx.fillRect(0,0,n,n);
    for(let i=0;i<10500;i++){
      const x=rand()*n,y=rand()*n;ctx.strokeStyle=pick(['#89977848','#f5e9b957','#526a4b35','#ffedbd42']);
      ctx.lineWidth=range(.4,1.2);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+range(-1.4,1.6),y-range(.7,4));ctx.stroke();
    }
  },1,true);
  const turfMat=material(0xffffff,.98,0,{map:turf,vertexColors:true});
  {
    const p=[],idx=[],uv=[],cs=[],nx=130,nz=123;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const x=(i/nx-.5)*155,z=20-j/nz*129,h=ground(x,z);
      p.push(x,h,z);uv.push(x*.62,z*.62);
      const variation=.5+.25*Math.sin(x*.74+z*.25)+.19*Math.cos(x*.38-z*.53);
      const c=color(0x859a55).lerp(color(0xb4b66b),variation);
      c.lerp(color(0xaab47d),smooth(8,46,-z)*.48);
      const shade=Math.exp(-(x*x/2.9+z*z/1.7));c.multiplyScalar(1-.36*shade);
      cs.push(c.r,c.g,c.b);
      if(i<nx&&j<nz){const k=j*(nx+1)+i;idx.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1);}
    }
    const land=mesh(geom(p,idx,uv,cs),turfMat);land.castShadow=false;
  }
  // Overlapping distant ridgelines, softened by atmospheric perspective.
  for(let row=0;row<3;row++){
    const p=[],idx=[],cs=[],uv=[];
    for(let j=0;j<=6;j++)for(let i=0;i<=120;i++){
      const x=(i-60)*2.8,z=-68-row*18-j*3.8;
      const crest=8+row*2.1+4.7*Math.sin(x*.043+row*1.7)+2.2*Math.sin(x*.108+row)+.7*Math.cos(x*.24+.9*row);
      const h=-1+crest*(Math.sin(j/6*pi*.55));
      p.push(x,h,z);uv.push(i/30,j/6);const c=color([0x829c7c,0x8aa6a4,0x9eb1b0][row]).multiplyScalar(.92+j*.015);cs.push(c.r,c.g,c.b);
      if(i<120&&j<6){const k=j*121+i;idx.push(k,k+1,k+121,k+1,k+122,k+121);}
    }
    const ridge=mesh(geom(p,idx,uv,cs),material(0xffffff,.98,0,{vertexColors:true}));ridge.castShadow=false;
  }
  const slates=texture(256,(c,n)=>{
    c.fillStyle='#cebcaa';c.fillRect(0,0,n,n);
    for(let j=0;j<8;j++)for(let i=-1;i<8;i++){
      const x=i*32+j%2*16,y=j*32,g=Math.round(range(155,194));
      const a=c.createLinearGradient(x,y,x+32,y+4);
      a.addColorStop(0,'rgb('+g+','+(g-11)+','+(g-24)+')');a.addColorStop(.28,'#e0d2bb');a.addColorStop(.68,'#e9dac3');a.addColorStop(1,'#af9c8b');
      c.fillStyle=a;c.fillRect(x,y,32,31);c.fillStyle='#a99786';c.fillRect(x,y+29,32,3);
    }
  },1,true);
  const roofMat=material(0xffffff,.78,0,{map:slates}), trim=material(0xf3e3bd),
    shutter=material(0x55776d), timber=material(0x8c795f);
  const roofG=geom([-1,0,-1,0,1,-1,0,1,1,-1,0,1, 0,1,-1,1,0,-1,1,0,1,0,1,1],
    [0,3,1,3,2,1,4,7,5,7,6,5],[0,0,1,0,1,1.7,0,1.7,0,0,1,0,1,1.7,0,1.7]);
  roofMat.side=T.DoubleSide;
  const gable=geom([-1,0,1,1,0,1,0,1,1,-1,0,-1,0,1,-1,1,0,-1],[0,1,2,3,4,5],[0,0,1,0,.5,1,0,0,.5,1,1,0]);
  const lamps=[],houseTargets=[];
  const houseSites=[[-6.1,-13,.85,.28],[2,-18,1.05,-.28],[8.4,-14,1.03,-.42],[-12,-18,1.1,.5],
    [-2.7,-22,1,.38],[6,-25,.95,.64],[-9.5,-27,1.18,-.32],[15,-24,1.1,.2],[-17,-26,.94,-.6],
    [1,-30,1.12,.25],[10,-32,.86,-.7],[-5,-34,1.04,.56],[21,-30,1.07,.4],[-23,-31,.96,-.3],
    [15,-38,1.02,-.64],[-14,-40,1.24,.58],[-2,-44,1.16,-.32],[6,-47,.96,.85]];
  houseSites.forEach(([x,z,scale,rot],i)=>{
    const y=ground(x,z)-.12,w=range(1.85,2.6)*scale,h=range(1.42,2.14)*scale,d=range(1.45,2.15)*scale,rise=w*range(.32,.49);
    const wall=pick([0xe9d4a9,0xe9d9b4,0xe0b98f,0xd8c9a6]),tile=pick([0xa36951,0xb97959,0xad7459,0x757f7a,0xb78265]);
    const cos=Math.cos(rot),sin=Math.sin(rot);
    function hp(g,m,lx,ly,lz,sx,sy,sz,tint=null,rz=0){
      part(g,m,x+lx*cos+lz*sin,y+ly,z-lx*sin+lz*cos,sx,sy,sz,0,rot,rz,tint);
    }
    hp(cube,neutral,0,h/2,0,w,h,d,wall);hp(gable,neutral,0,h,0,w/2,rise,d/2,wall);
    hp(roofG,roofMat,0,h-.04,0,w/2+.14,rise+.08,d/2+.17,tile);
    hp(cube,timber,0,h+rise+.035,0,.123,.08,d+.37);
    for(const side of [-1,1]){
      hp(cube,timber,side*(w/2+.11),h-.055,0,.12,.12,d+.33);
      hp(cube,trim,side*(w/4+.036),h+rise*.5+.007,d/2+.14,
        Math.hypot(w/2+.2,rise+.08),.092,.083,null,-side*Math.atan2(rise+.08,w/2+.14));
    }
    hp(cube,neutral,-w*.27,h+rise*.62+.17,-d*.25,.24,.8,.26,0xc3997d);
    hp(cube,neutral,-w*.27,h+rise*.62+.58,-d*.25,.31,.09,.33,0x996f5a);
    const glass=material(0x789897,.21,.28,{emissive:0xffbd66,emissiveIntensity:0});
    lamps.push(glass);
    function windowAt(wx,wy,ww,wh,sideShutters){
      const front=d/2+.025;hp(cube,trim,wx,wy,front,ww+.10,wh+.09,.065);
      hp(cube,glass,wx,wy,front+.04,ww,wh,.045);
      hp(cube,trim,wx,wy,front+.066,.029,wh,.025);hp(cube,trim,wx,wy+.025,front+.066,ww,.027,.025);
      hp(cube,paleWood,wx,wy-wh*.52,front+.035,ww+.18,.055,.13);
      if(sideShutters)for(const k of [-1,1]){
        hp(cube,shutter,wx+k*ww*.82,wy,front+.017,ww*.47,wh+.025,.045);
        for(let q=0;q<3;q++)hp(cube,timber,wx+k*ww*.82,wy+wh*(q-1)*.24,front+.043,ww*.37,.016,.02);
      }
    }
    windowAt(-w*.25,h*.57,.34*scale,.49*scale,true);windowAt(w*.24,h*.57,.34*scale,.49*scale,true);
    windowAt(0,h+rise*.32,.27*scale,.33*scale,false);
    for(const side of [-1,1])hp(cube,glass,side*(w*.5+.014),h*.57,-d*.17,.035,.45*scale,.37*scale);
    houseTargets.push({p:v(x,y+h*.67,z),r:w*.76,i});
  });
  // Open-crowned fruit trees and narrow cypresses give roofs a readable scale.
  const foliage=material(0xffffff,.94,0,{vertexColors:true});
  function leafyShape(stretch=1){
    const g=new T.IcosahedronGeometry(1,2),pos=g.attributes.position,cs=[];
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      const n=Math.sin(x*13+y*7+z*5)*Math.cos(z*12-x*4+y*6);
      const r=1+.103*n+.041*Math.sin(y*25+x*10);pos.setXYZ(i,x*r,y*r*stretch,z*r);
      const l=.86+.12*y+.13*n;cs.push(l,l*.99,l*.93);
    }
    g.setAttribute('color',new T.Float32BufferAttribute(cs,3));g.computeVertexNormals();return g;
  }
  const leaves=leafyShape(),cypressG=leafyShape(1.04);
  function tree(x,z,h,broad=false){
    const y=ground(x,z);
    if(!broad){
      part(cylinder,bark,x,y+h*.29,z,h*.042,h*.58,h*.041,0,0,.035);
      for(let j=0;j<5;j++){
        const w=h*(.068+.05*Math.sin((j+1)/6*pi));
        part(cypressG,foliage,x+h*.014*Math.sin(j),y+h*(.38+j*.125),z,w*(1-j*.077),h*(.21-j*.012),w*(1-j*.077),0,j,.028,pick([0x61764e,0x697c51,0x566e51]));
      }
    }else{
      rod(v(x,y,z),v(x+.15,y+h*.63,z-.06),h*.057,bark);
      for(let j=0;j<8;j++){
        const a=j*2.399,rr=h*range(.12,.27),bx=x+rr*Math.cos(a),bz=z+rr*Math.sin(a),by=y+h*range(.66,.87);
        rod(v(x+.09,y+h*.39,z),v(bx,by,bz),h*.026,bark);
        part(leaves,foliage,bx,by,bz,h*.245,h*range(.19,.27),h*.238,.2,a,.22,pick([0x809454,0x93a262,0x718956,0x849a60]));
      }
    }
  }
  for(let i=0;i<95;i++){const x=range(-40,40),z=range(-58,-12);if(houseSites.some(h=>Math.hypot(x-h[0],z-h[1])<2.6))continue;tree(x,z,range(1.7,4.8),i%5===0);}
  tree(-7.2,-5.6,3.65,true);tree(8.8,-6.8,4.5,true);tree(-4.8,-11,3.5);tree(5.3,-9.8,3.15);
  // Clipped hedge cores with tapered shoulders and small sun-facing sprays of leaves.
  const hedgeG=(()=>{const g=new T.BoxGeometry(1,1,1,10,5,4),p=g.attributes.position,cs=[];
    for(let j=0;j<p.count;j++){let x=p.getX(j),y=p.getY(j),z=p.getZ(j);
      const n=.5+.5*Math.sin(x*37+y*19+z*51)*Math.cos(x*23-z*16);
      const shrink=1-.16*Math.max(0,y*2)**3;
      p.setXYZ(j,x*shrink,y+.036*n-.05*Math.abs(x*2)**3,z*shrink+.027*n);
      const l=.76+.32*(y+.5)+.12*n;cs.push(l,l,l*.94);}
    g.setAttribute('color',new T.Float32BufferAttribute(cs,3));g.computeVertexNormals();return g;})();
  const hedgeColors=[0x778849,0x798e4d,0x85944f,0x7a8e51,0x70864c];
  function hedge(x,z,len,rot,h){
    const y=ground(x,z),c=Math.cos(rot),sn=Math.sin(rot);
    part(hedgeG,foliage,x,y+h*.48,z,len,h,.64,0,rot,0,pick(hedgeColors));
    for(let j=0;j<Math.ceil(len*26);j++){
      const t=range(-.5,.5)*len,top=rand()<.43,lz=top?range(-.23,.24):.29+range(-.02,.04);
      const cy=top?h*.99+range(-.04,.02):h*range(.17,.96);
      const lx=x+c*t+sn*lz, zz=z-sn*t+c*lz;
      part(pebble,neutral,lx,y+cy,zz,range(.052,.108),range(.031,.067),.057,range(-.6,.6),range(0,pi),range(-.5,.5),pick(hedgeColors));
    }
  }
  for(let x=-11;x<11;x+=1.13)if(x<-3.85||x>-2.25)hedge(x,-3.65+Math.sin(x*.4)*.09,1.19,.025*Math.cos(x),.78+.065*Math.cos(x*1.3));
  for(let z=-3.0;z<5;z+=1.1){hedge(-5.05,z,1.17,pi/2,.75);hedge(5.12,z,1.17,pi/2,.81);}
  // Simple timber garden gate with a diagonal brace and carved picket tips.
  const gateX=-3.13,gateZ=-3.65;
  for(let j=0;j<10;j++){
    const x=gateX+(j-4.5)*.123,h=.77+.10*Math.abs((j-4.5)/4.5);
    part(cube,paleWood,x,h*.5,gateZ,.093,h,.068);
    part(newCap(),paleWood,x,h+.045,gateZ,.067,.09,.049,0,pi/4);
  }
  function newCap(){return geometries.cap||(geometries.cap=new T.ConeGeometry(1,1,4));}
  for(const yy of [.23,.59])part(cube,wood,gateX,yy,gateZ+.045,1.32,.09,.065);
  part(cube,wood,gateX,.409,gateZ+.061,1.31,.068,.045,0,0,.30);
  for(const dx of [-.74,.74]){part(cube,paleWood,gateX+dx,.49,gateZ,.12,.98,.14);part(newCap(),paleWood,gateX+dx,1.02,gateZ,.092,.10,.102,0,pi/4);}
  const stones=[0xc7c5a3,0xc4bea1,0xd3c9aa,0xbebba1];
  for(let j=0;j<18;j++){const z=-3.36+j*.47,x=gateX+.30*Math.sin(j*.43)-.022*j;
    part(pebble,neutral,x,ground(x,z)+.018,z,range(.28,.43),range(.049,.075),range(.21,.30),.03,range(-.5,.5),.03,pick(stones));}
  const bends={value:new Float32Array(48)};
  function swaying(mat,instanced){
    mat.onBeforeCompile=sh=>{
      sh.uniforms.flex=bends;
      sh.vertexShader='uniform float flex[48];\n'+sh.vertexShader.replace('#include <project_vertex>',
        (instanced?`vec4 botanical=instanceMatrix*vec4(transformed,1.);vec2 root=instanceMatrix[3].xz;
          int bed=int(mod(floor((root.x+12.)*1.4)+floor((root.y+12.)*1.5)*7.,48.));
          botanical.x+=flex[bed]*botanical.y*botanical.y;vec4 mvPosition=modelViewMatrix*botanical;gl_Position=projectionMatrix*mvPosition;`:
          `int bed=int(mod(floor((position.x+12.)*1.4)+floor((position.z+12.)*1.5)*7.,48.));transformed.x+=flex[bed]*max(0.,transformed.y)*1.7;\n#include <project_vertex>`));
    };return mat;
  }
  const plant=swaying(material(0xffffff,.90),true),bud=new T.SphereGeometry(1,8,5),stalk=new T.CylinderGeometry(1,1,1,5);
  const leafColors=[0x667d43,0x879955,0x6b8950,0x849b65];
  const petals=[0xf3e8c7,0xfff2d1,0xf7f0d6];
  function flower(x,z,type,h){
    const y=ground(x,z),tilt=range(-.22,.22),end=v(x+tilt*h,y+h,z+range(-.035,.035));
    rod(v(x,y,z),end,.0045,plant,stalk,0x76844b);
    for(let j=0;j<3;j++){
      const side=j%2?1:-1;part(bud,plant,x+side*.027+tilt*h*.4,y+h*(.28+j*.14),z,.017,.066,.013,range(-.36,.36),range(-1,1),side*-.66,pick(leafColors));
    }
    if(type==='sage'){
      for(let j=0;j<6;j++){let sc=.032-j*.003;part(bud,plant,end.x,end.y+j*.026,end.z,sc,.027,sc,.18,j*.9,tilt,pick([0x9283a7,0xa494b5,0x857599]));}
    }else{
      const gold=type==='gold',n=gold?7:10,size=gold?range(.050,.066):range(.034,.050),az=rand()*tau;
      const axis=v(range(-.34,.34),1,range(.12,.60)).normalize();
      const rotation=new T.Quaternion().setFromUnitVectors(v(0,1,0),axis);
      for(let j=0;j<n;j++){
        const a=j*tau/n+az,dir=v(Math.cos(a),0,Math.sin(a)).applyQuaternion(rotation);
        const p=end.clone().addScaledVector(dir,size*.56);
        const q=rotation.clone().multiply(new T.Quaternion().setFromAxisAngle(v(0,1,0),-a)).multiply(new T.Quaternion().setFromAxisAngle(v(0,0,1),gold?.25:-.08));
        const e=new T.Euler().setFromQuaternion(q);
        part(bud,plant,p.x,p.y,p.z,size*.62,size*.12,size*(gold?.41:.21),e.x,e.y,e.z,gold?pick([0xffc76c,0xefad4b,0xf4bb59]):pick(petals));
      }
      const cp=end.clone().addScaledVector(axis,.009);part(bud,plant,cp.x,cp.y,cp.z,size*.29,.015,size*.29,0,0,0,gold?0xbf8840:0xe9bd55);
    }
  }
  const beds=[[-2.05,1.68,.49,.51,35],[2.0,1.86,.53,.50,38],[-2.45,-.55,.58,.84,33],[2.64,-.5,.7,.9,41],
    [-4,-2.8,.9,.38,27],[-1.36,-2.74,.87,.25,26],[1.2,-2.8,1.08,.28,29],[3.97,-2.7,.75,.42,28],
    [-4.2,1.5,.6,1.3,33],[3.65,2.42,.8,.75,31]];
  beds.forEach(([cx,cz,rx,rz,n],bi)=>{
    for(let j=0;j<n;j++){
      const a=rand()*tau,r=Math.sqrt(rand()),x=cx+Math.cos(a)*rx*r,z=cz+Math.sin(a)*rz*r;
      const type=(bi+j%4)%6<2?'sage':j%4===0?'gold':'daisy';
      flower(x,z,type,range(type==='sage'?.23:.14,type==='sage'?.49:.36));
    }
  });
  {
    const p=[],idx=[],cs=[],uv=[];
    function grass(x,z,tall){
      const h=range(.035,.13)*tall,y=ground(x,z)-.007,a=rand()*tau,w=range(.004,.012)*Math.sqrt(tall),dx=w*Math.cos(a),dz=w*Math.sin(a);
      const lx=range(-.045,.055)*tall,lz=range(-.034,.034)*tall,k=p.length/3;
      p.push(x-dx,y,z-dz,x+dx,y,z+dz,x+dx*.52+lx*.32,y+h*.67,z+dz*.52+lz*.32,x-dx*.52+lx*.32,y+h*.67,z-dz*.52+lz*.32,x+lx,y+h,z+lz);
      idx.push(k,k+1,k+2,k,k+2,k+3,k+3,k+2,k+4);uv.push(0,0,1,0,1,.66,0,.66,.5,1);
      const c=color(pick([0x8da05c,0x9da860,0xb3b56a,0x798d55,0xb4b97c]));
      for(const n of [.66,.7,.95,.9,1.08])cs.push(c.r*n,c.g*n,c.b*n);
    }
    for(let i=0;i<14500;i++){
      const x=range(-7,7),z=range(-5.4,6);
      grass(x,z,1);
    }
    beds.forEach(([x,z,rx,rz])=>{for(let j=0;j<370;j++){const a=rand()*tau,r=Math.sqrt(rand());grass(x+Math.cos(a)*rx*r,z+Math.sin(a)*rz*r,range(1.5,3.1));}});
    const lawn=mesh(geom(p,idx,uv,cs),swaying(material(0xffffff,.94,0,{side:T.DoubleSide,vertexColors:true}),false));lawn.castShadow=false;
  }
  // A larch waterwheel, stone trough, and a continuous sheet of water fed from the spout.
  const waterX=-1.60, waterZ=-5.93;
  const copper=material(0xa87b51,.37,.53),waterM=material(0x76b6ba,.14,.26,{transparent:true,opacity:.84,side:T.DoubleSide});
  const stoneM=material(0xcbc8ad,.91),poolM=material(0x789b97,.16,.32);
  part(cube,stoneM,waterX,.19,waterZ,2.05,.41,1.07);
  for(const k of [-1,1]){
    part(cube,stoneM,waterX+k*1.02,.39,waterZ,.095,.22,1.18);part(cube,stoneM,waterX,.38,waterZ+k*.54,2.07,.19,.10);
  }
  const surface=mesh(new T.PlaneGeometry(1.98,.98,15,4).rotateX(-pi/2),poolM);surface.position.set(waterX,.40,waterZ);
  const wheel=new T.Group();wheel.position.set(waterX+.31,.97,waterZ+.05);scene.add(wheel);
  function groupMesh(parent,g,m,pos,scale,rot){
    const o=mesh(g,m,parent);o.position.copy(pos);if(scale)o.scale.copy(scale);if(rot)o.rotation.set(...rot);return o;
  }
  const wheelR=.46;
  for(const z of [-.15,.15])groupMesh(wheel,new T.TorusGeometry(wheelR,.024,7,48),copper,v(0,0,z));
  for(let i=0;i<10;i++){
    const a=i*tau/10;groupMesh(wheel,cube,wood,v(Math.sin(a)*wheelR,Math.cos(a)*wheelR,0),v(.17,.042,.39),[0,0,-a]);
    if(i<5)groupMesh(wheel,cube,paleWood,v(),v(.038,wheelR*2,.073),[0,0,-a]);
  }
  part(cylinder,copper,waterX+.31,.97,waterZ+.1,.06,.57,.06,pi/2);
  for(const z of [-.29,.32])part(cube,wood,waterX+.31,.59,waterZ+z,.095,.96,.10);
  part(cube,wood,waterX-.54,.9,waterZ,.13,1.22,.15);
  part(cube,paleWood,waterX-.28,1.5,waterZ,.73,.092,.24);
  const stream=mesh(new T.CylinderGeometry(.062,.042,1,12,8),waterM);stream.position.set(waterX+.065,1.24,waterZ);
  // A little clinker-built pond yacht floats free once the last chamber fills.
  const boat=new T.Group();scene.add(boat);
  const hullShape=new T.Shape();hullShape.moveTo(-.31,0);hullShape.quadraticCurveTo(-.22,.16,.13,.12);hullShape.quadraticCurveTo(.27,.09,.33,0);hullShape.quadraticCurveTo(.16,-.17,-.25,-.09);hullShape.closePath();
  const hull=new T.ExtrudeGeometry(hullShape,{depth:.065,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:2,steps:1});
  groupMesh(boat,hull,wood,v(0,0,0),null,[-pi/2,0,0]);
  groupMesh(boat,stalk,paleWood,v(.02,.31,0),v(.011,.5,.011));
  const sail=geom([.003,.53,0,-.019,.14,.018,-.29,.14,.014,-.10,.31,.044],[0,1,3,1,2,3,2,0,3],[1,1,1,0,0,0,.58,.51]);
  groupMesh(boat,sail,material(0xf0d9a3,.87,0,{side:T.DoubleSide}),v());
  const jib=geom([.045,.445,0,.05,.16,0,.21,.16,.021],[0,1,2],[0,1,0,0,1,0]);
  groupMesh(boat,jib,material(0xb87955,.83,0,{side:T.DoubleSide}),v());
  for(const offset of [-.34,.34])part(cube,stoneM,waterX+offset,.375,waterZ,.04,.13,1.01);
  // Pear-shaped aerostat with inflated gores, a reinforced throat, suspension lines and wicker.
  const balloon=new T.Group();scene.add(balloon);
  const envelope=new T.Group();balloon.add(envelope);
  const balloonPalette=[0xc57953,0xe6c68e,0xc58058,0xeddaaf,0xc48661,0xe9c98e];
  const ballonM=material(0xffffff,.78,0,{vertexColors:true,side:T.DoubleSide});
  let silkSurface,silkRest;
  const profile=[[0,.20],[.14,.25],[.38,.39],[.63,.59],[.9,.78],[1.18,.91],[1.43,.95],[1.64,.91],[1.83,.79],[2.01,.57],[2.12,.32],[2.16,.012]];
  {
    const p=[],idx=[],uv=[],cs=[],stripes=18,sub=6;
    for(let k=0;k<stripes;k++){
      const c=color(balloonPalette[k%6]);
      for(let j=0;j<profile.length;j++)for(let b=0;b<=sub;b++){
        const a=(k+b/sub)*tau/stripes,r=profile[j][1]*(1+.041*Math.sin(pi*b/sub)),h=profile[j][0];
        p.push(Math.cos(a)*r,h,Math.sin(a)*r);uv.push(b/sub,h/2.16);
        const shade=.86+.14*Math.sin(pi*b/sub);
        const cc=(j===0?color(0xb0855a):c);cs.push(cc.r*shade,cc.g*shade,cc.b*shade);
        if(j+1<profile.length&&b<sub){const i=k*profile.length*(sub+1)+j*(sub+1)+b;idx.push(i,i+sub+1,i+1,i+1,i+sub+1,i+sub+2);}
      }
    }
    silkSurface=mesh(geom(p,idx,uv,cs),ballonM,envelope);silkRest=new Float32Array(p);
    const band=material(0xd3ac73,.72);
    for(let k=0;k<stripes;k+=2){
      const a=k*tau/stripes,points=profile.slice(0,-1).map(([h,r])=>v(Math.cos(a)*r*1.002,h,Math.sin(a)*r*1.002));
      mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),22,.006,4,false),band,envelope);
    }
    const throat=mesh(new T.TorusGeometry(.20,.027,8,40),copper,envelope);throat.rotation.x=pi/2;
  }
  const rig=new T.Group();balloon.add(rig);
  function wire(parent,a,b,r,mat){const d=b.clone().sub(a);const m=groupMesh(parent,cylinder,mat,a.clone().add(b).multiplyScalar(.5),v(r,d.length(),r));m.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return m;}
  const cord=material(0x9e8059),wicker=material(0xb38652);
  for(const x of [-1,1])for(const z of [-1,1])wire(rig,v(x*.18,-.02,z*.12),v(x*.16,-.45,z*.13),.009,cord);
  groupMesh(rig,cube,wicker,v(0,-.56,0),v(.35,.23,.29));
  for(let j=0;j<5;j++)groupMesh(rig,cube,paleWood,v(0,-.46-.044*j,0),v(.36,.014,.30));
  for(const x of [-.13,0,.13])groupMesh(rig,cube,wood,v(x,-.56,.151),v(.014,.225,.009));
  const flameM=material(0xffce78,.6,0,{emissive:0xff9742,emissiveIntensity:.35});
  const burner=groupMesh(rig,bud,flameM,v(0,-.08,0),v(.055,.12,.055));
  const radius=1.80,bedR=1.405,deck=.79;
  const steel=material(0xc4cdc9,.26,.83),brushed=material(0x859692,.36,.74),darkRubber=material(0x394648,.83);
  const lattice=texture(1024,(c,n)=>{
    c.fillStyle='#394650';c.fillRect(0,0,n,n);
    for(let j=0;j<n;j+=3){c.fillStyle=j%2?'#52606a':'#4b5761';c.fillRect(0,j,n,1);}
    for(let i=0;i<n;i+=3){c.fillStyle='#26353f88';c.fillRect(i,0,1,n);}
    for(let j=0;j<18500;j++){c.fillStyle=rand()<.5?'#a6a99d1c':'#10242c24';c.fillRect(rand()*n,rand()*n,range(1,4),1);}
    function circle(r,stroke,w,dash=[]){c.beginPath();c.arc(512,512,r,0,tau);c.strokeStyle=stroke;c.lineWidth=w;c.setLineDash(dash);c.stroke();c.setLineDash([]);}
    circle(485,'#a1b3b272',2);circle(479,'#a4b8b492',1.8,[5,4]);circle(459,'#c3cec644',1.8,[3,8]);
    circle(135,'#e5d5a24f',2.4,[7,10]);circle(98,'#e6ce8d7d',3);
    for(let i=0;i<16;i++){
      const a=i*tau/16,r0=103,r1=i%2?112:124;
      c.strokeStyle='#e5cc8b9c';c.lineWidth=i%2?2.5:4;c.lineCap='round';c.beginPath();c.moveTo(512+Math.cos(a)*r0,512+Math.sin(a)*r0);c.lineTo(512+Math.cos(a)*r1,512+Math.sin(a)*r1);c.stroke();
    }
    for(let i=0;i<4;i++){
      const a=i*pi/2+pi/4,x=512+Math.cos(a)*435,y=512+Math.sin(a)*435;
      c.save();c.translate(x,y);c.rotate(a+pi/2);c.fillStyle='#d9d3b4a8';c.beginPath();c.moveTo(0,-7);c.quadraticCurveTo(1,-1,5,0);c.quadraticCurveTo(1,1,0,7);c.quadraticCurveTo(-1,1,-5,0);c.quadraticCurveTo(-1,-1,0,-7);c.fill();c.restore();
    }
  },1,true);
  const bedMaterial=material(0xffffff,.90,0,{map:lattice});
  const bedSegments=96,rows=17,bedPos=[],bedUV=[],bedIdx=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=bedSegments;i++){
    const a=i/bedSegments*tau,r=j/rows*bedR,x=Math.cos(a)*r,z=Math.sin(a)*r;
    bedPos.push(x,deck,z);bedUV.push(.5+x/(2*bedR),.5+z/(2*bedR));
    if(i<bedSegments&&j<rows){const k=j*(bedSegments+1)+i;bedIdx.push(k,k+1,k+bedSegments+1,k+1,k+bedSegments+2,k+bedSegments+1);}
  }
  const matMesh=mesh(geom(bedPos,bedIdx,bedUV),bedMaterial);
  const padGrain=texture(128,(c,n)=>{
    c.fillStyle='#f0f0eb';c.fillRect(0,0,n,n);
    for(let i=0;i<10000;i++){const x=rand()*n,y=rand()*n;c.fillStyle=rand()<.55?'#dddccc70':'#ffffff70';c.fillRect(x,y,1.6,.8);}
    for(let i=0;i<n;i+=3){c.fillStyle='#a0a3a015';c.fillRect(i,0,1,n);c.fillRect(0,i,n,1);}
  },3,true);
  const padM=material(0xffffff,.58,0,{map:padGrain,vertexColors:true});
  const piping=material(0x8aafbc,.61),darkPiping=material(0x365e72,.68);
  const padProfile=[[1.535,-.064],[1.508,-.014],[1.51,.030],[1.526,.066],[1.566,.087],[1.64,.099],[1.734,.088],[1.788,.060],[1.808,.019],[1.81,-.059],[1.794,-.094],[1.748,-.105],[1.58,-.088],[1.535,-.064]];
  {
    const p=[],idx=[],uv=[],cs=[],count=18,arcs=16;
    for(let s=0;s<count;s++){
      const c=color([0x467c98,0x49809d,0x467c97,0x4d819c,0x467c95,0x48809a][s%6]);
      for(let i=0;i<=arcs;i++){
        const f=i/arcs,a=(s+.004+f*.992)*tau/count,edge=Math.min(f,1-f),fold=Math.exp(-edge*27);
        for(let j=0;j<padProfile.length;j++){
          let [r,yy]=padProfile[j];const wr=Math.cos((r-1.52)*83+s*.72)*fold*.0036;
          r-=.005*fold;yy=yy*(1-.26*fold)+wr;
          p.push(Math.cos(a)*r,deck+yy,Math.sin(a)*r);uv.push(i/arcs,j/padProfile.length);
          const l=(1-.14*fold)*(j>8?.84:1);cs.push(c.r*l,c.g*l,c.b*l);
          const k=p.length/3-1;if(i<arcs&&j<padProfile.length-1)idx.push(k,k+padProfile.length,k+1,k+1,k+padProfile.length,k+padProfile.length+1);
        }
      }
    }
    padM.side=T.DoubleSide;mesh(geom(p,idx,uv,cs),padM);
  }
  function horizontalRing(r,t,y,m){const o=mesh(new T.TorusGeometry(r,t,8,132),m);o.rotation.x=pi/2;o.position.y=y;return o;}
  horizontalRing(1.799,.009,deck+.041,piping);horizontalRing(1.521,.008,deck+.050,piping);
  horizontalRing(1.803,.010,deck-.075,darkPiping);horizontalRing(1.75,.037,deck-.108,steel);
  horizontalRing(bedR,.012,deck-.006,brushed);
  function curveTube(points,r,m,segments=40){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,r,7,false),m);}
  for(let k=0;k<6;k++){
    const a=(k+.18)*tau/6;const points=[];
    for(const [offset,r,y] of [[-.258,1.72,deck-.10],[-.258,1.755,.265],[-.237,1.77,.112],[-.17,1.77,.061],[0,1.719,.051],[.17,1.77,.061],[.237,1.77,.112],[.258,1.755,.265],[.258,1.72,deck-.10]]){
      points.push(v(Math.cos(a+offset)*r,y,Math.sin(a+offset)*r));
    }
    curveTube(points,.032,steel,38);
    for(const side of [-1,1]){
      const b=a+side*.258;part(cylinder,brushed,Math.cos(b)*1.728,deck-.196,Math.sin(b)*1.728,.043,.117,.043);
      part(sphere,steel,Math.cos(b)*1.77,deck-.194,Math.sin(b)*1.77,.017,.017,.017);
      const b2=a+side*.155;part(pebble,darkRubber,Math.cos(b2)*1.771,.048,Math.sin(b2)*1.771,.076,.041,.073);
    }
  }
  // A real helix and two eyelets form each of the perimeter springs.
  const springPoints=[];
  for(let j=0;j<=54;j++){const f=j/54;springPoints.push(v(f*.117,.014*Math.cos(f*tau*7),.014*Math.sin(f*tau*7)));}
  const coil=new T.TubeGeometry(new T.CatmullRomCurve3(springPoints),70,.0038,5,false);
  for(let j=0;j<72;j++){
    const a=j*tau/72,c=Math.cos(a),s=Math.sin(a);
    part(coil,steel,c*1.415,deck-.012,s*1.415,1,1,1,0,-a);
    part(cube,brushed,c*1.41,deck-.006,s*1.41,.044,.013,.017,0,-a);
  }
  // A sewn maker's patch with a little brass sun, visible on the front pad.
  const badge=new T.Group();badge.position.set(.50,deck+.001,1.73);badge.rotation.y=.285;scene.add(badge);
  groupMesh(badge,cube,darkPiping,v(0,0,.013),v(.27,.093,.024));
  groupMesh(badge,fineCylinder,material(0xe6c484,.43,.30),v(0,0,.035),v(.029,.011,.029),[pi/2,0,0]);
  for(let k=0;k<8;k++){const a=k*tau/8;groupMesh(badge,cube,paleWood,v(.039*Math.cos(a),.039*Math.sin(a),.034),v(.009,.004,.006),[0,0,a]);}
  const ball=new T.Group();scene.add(ball);const ballR=.236;
  const ballColors=[0xefb752,0xf4c670,0xf0b95b,0xe9af4f,0xf2c273,0xebb459];
  const ballM=material(0xffffff,.68,0,{vertexColors:true});
  {
    const pp=[],cc=[],idx=[],uv=[],sectors=8,rings=30,seg=10;
    for(let k=0;k<sectors;k++)for(let j=0;j<=rings;j++)for(let i=0;i<=seg;i++){
      const u=i/seg,l=j/rings*pi,a=(k+u)*tau/sectors+.18*Math.sin(l*2);
      const seam=Math.exp(-Math.min(u,1-u)*29),r=ballR*(1-.012*seam*Math.sin(l));
      pp.push(r*Math.sin(l)*Math.cos(a),r*Math.cos(l),r*Math.sin(l)*Math.sin(a));
      uv.push((k+u)/sectors,j/rings);
      const col=color(j===9||j===10||j===21?0xf8dfaa:ballColors[k%6]).multiplyScalar(1-.13*seam);
      cc.push(col.r,col.g,col.b);
      if(j<rings&&i<seg){const n=pp.length/3-1;idx.push(n,n+1,n+seg+1,n+1,n+seg+2,n+seg+1);}
    }
    mesh(geom(pp,idx,uv,cc),ballM,ball);
  }
  ball.rotation.z=-.38;ball.rotation.x=.12;
  const dustMat=material(0xffe6aa,.9,0,{emissive:0xffe1a5,emissiveIntensity:.17});
  const dust=new T.InstancedMesh(bud,dustMat,42);dust.frustumCulled=false;scene.add(dust);
  flush();
  // Capture the actual garden for the reflections in the springs, glazing and water.
  balloon.position.set(3.15,3.54,-12.3);ball.position.set(0,deck+ballR,0);
  const pmrem=new T.PMREMGenerator(renderer),envTarget=pmrem.fromScene(scene,0,.1,250,{size:64,position:v(0,1.5,-1)});
  scene.environment=envTarget.texture;scene.environmentIntensity=.37;pmrem.dispose();
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:2});
  const finalScene=new T.Scene(),finalCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const post=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:target.texture},pixel:{value:new T.Vector2()}},
    vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D picture;uniform vec2 pixel;varying vec2 uv0;
    void main(){vec3 c=texture2D(picture,uv0).rgb,bloom=vec3(0.);
      for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 o=vec2(cos(a),sin(a))*pixel*(3.+float(i-2*(i/2))*3.);
      bloom+=max(vec3(0.),texture2D(picture,uv0+o).rgb-1.18);}
      c+=bloom*.013;c*=1.-.14*pow(length((uv0-.5)*1.40),2.);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
      gl_FragColor.rgb+=grain*.009;
    }`});
  finalScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
  let width=0,height=0;
  function resize(){
    width=canvas.clientWidth;height=canvas.clientHeight;renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();
    const d=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(d.x,d.y);post.uniforms.pixel.value.set(1/d.x,1/d.y);
  }
  const sunDay=color(0xffe2ac),sunEve=color(0xffaf79),hemiDay=color(0xdaebff),hemiEve=color(0xabb9dd),fogDay=color(0xe2dfc7),fogEve=color(0xc79a98);
  const sp=surface.geometry.attributes.position,mp=matMesh.geometry.attributes.position;
  const baseBed = new Float32Array(mp.array);
  function update(s){
    if(width!==canvas.clientWidth||height!==canvas.clientHeight)resize();
    const portrait=1-smooth(.53,1.15,camera.aspect),dist=Math.max(6.68,1.84/(.344*camera.aspect*.91));
    const up=Math.max(0,s.cameraLift),explore=s.view;
    camera.position.set(-.12*explore,1.56+portrait*1.47+up+explore*.31,dist+up*.58+explore*.2);
    camera.rotation.set((.32+portrait*.88+up*2.1)*pi/180,-.013*explore,0,'YXZ');
    camera.fov=38+up*4.35;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const dusk=s.dusk;skyDusk.value=dusk;
    sun.color.copy(sunDay).lerp(sunEve,dusk);sun.intensity=2.55-dusk*1.46;
    sun.position.set(-9-dusk*7,14-dusk*8,7-dusk*3);
    ambient.color.copy(hemiDay).lerp(hemiEve,dusk);ambient.intensity=1.34-dusk*.62;
    scene.fog.color.copy(fogDay).lerp(fogEve,dusk);scene.environmentIntensity=.37-dusk*.15;
    for(let i=0;i<48;i++)bends.value[i]=s.stems[i].angle;
    for(let j=0;j<=rows;j++)for(let i=0;i<=bedSegments;i++){
      const k=j*(bedSegments+1)+i,f=j/rows,u=i/bedSegments*24,seg=Math.floor(u)%24,n=(seg+1)%24;
      const local=s.mat[seg].depth+(s.mat[n].depth-s.mat[seg].depth)*(u-Math.floor(u));
      const depth=(1-f*f)*(s.compression*(1-f)+local*f);
      mp.array[3*k+1]=baseBed[k*3+1]-depth;
    }
    mp.needsUpdate=true;matMesh.geometry.computeVertexNormals();
    ball.position.set(-.045,deck+ballR+s.height,.015);
    ball.rotation.z=-.38+s.height*.62+s.tether*.08;ball.rotation.y=s.height*.46;
    wheel.rotation.z=-s.wheel;
    stream.scale.set(.53+s.flow*.86,.51,.56+s.flow*.7);stream.rotation.z=.083;
    for(let i=0;i<sp.count;i++){
      const column=i%16,cell=Math.min(2,Math.floor((15-column)/5.34));
      sp.setY(i,Math.min(1,s.cells[cell])*.075+s.water[column].level*(1+Math.cos(Math.floor(i/16)*1.16)*.3));
    }
    sp.needsUpdate=true;surface.geometry.computeVertexNormals();
    boat.position.set(waterX-.62+s.boatX*.94,.407+Math.min(.68,s.wet)*.10+s.water[4].level,waterZ+.15);
    boat.rotation.set(.02,s.boatX*.22-.14,s.boatHeel);
    balloon.position.set(3.55-portrait*1.95+s.tether-s.balloonX*.79,3.54+s.balloonY,-12.3-Math.max(0,s.balloonY)*1.75);
    balloon.rotation.z=-s.tether*.12;rig.rotation.z=s.basket;
    const cloth=silkSurface.geometry.attributes.position;
    for(let i=0;i<cloth.count;i++){
      const gore=Math.floor(i/(profile.length*7)),sector=Math.floor(gore*12/18);
      const strain=.026*s.envelope[sector].heat*Math.sin((i%7)*pi/6);
      cloth.setXYZ(i,silkRest[3*i]*(1+strain),silkRest[3*i+1],silkRest[3*i+2]*(1+strain));
    }
    cloth.needsUpdate=true;
    burner.scale.y=.08+s.envelope[0].heat*.13;flameM.emissiveIntensity=.3+s.envelope[0].heat*2;
    lamps.forEach((m,i)=>{m.emissiveIntensity=s.lamps[i].filament*2.9;});
    s.motes.forEach((p,i)=>{obj.position.set(p.x,p.y,p.z);obj.rotation.set(0,0,0);obj.scale.setScalar(.0022+(i%5)*.00068);obj.updateMatrix();dust.setMatrixAt(i,obj.matrix);});dust.instanceMatrix.needsUpdate=true;
  }
  const ray=new T.Raycaster(),pointer=new T.Vector2(),hit=v(),point=v();
  function hitTest(x,y,s){
    const rect=canvas.getBoundingClientRect();pointer.set(2*(x-rect.left)/width-1,1-2*(y-rect.top)/height);
    ray.setFromCamera(pointer,camera);
    const surfaceHit=ray.ray.intersectPlane(new T.Plane(v(0,1,0),-deck+s.compression*.45),hit);
    if(surfaceHit && Math.hypot(hit.x,hit.z)<=1.85)return {target:'mat',x:hit.x/bedR,z:hit.z/bedR};
    // The padded front face is also touchable at the low camera angle.
    const origin=ray.ray.origin,direction=ray.ray.direction;
    const aa=direction.x*direction.x+direction.z*direction.z;
    const bb=origin.x*direction.x+origin.z*direction.z;
    const disc=bb*bb-aa*(origin.x*origin.x+origin.z*origin.z-radius*radius);
    if(disc>=0&&aa>.00001){
      const near=(-bb-Math.sqrt(disc))/aa;
      ray.ray.at(near,point);
      if(near>0&&point.y>=deck-.11&&point.y<=deck+.10)
        return {target:'mat',x:point.x/radius,z:point.z/radius};
    }
    if(ray.ray.distanceToPoint(ball.position)<ballR*1.4)return {target:'mat',x:0,z:0};
    if(s.stage===1&&ray.ray.intersectsBox(new T.Box3(v(waterX-1.12,.33,waterZ-.65),v(waterX+1.12,1.56,waterZ+.65))))return {target:'water',x:0,z:0};
    if(s.stage===2){point.copy(balloon.position).y+=1.02;if(ray.ray.distanceToPoint(point)<1.22)return {target:'balloon',x:pointer.x,z:pointer.y};}
    if(s.stage===3){
      for(const h of houseTargets){if(ray.ray.distanceToPoint(h.p)<h.r)return {target:'lamp',x:0,z:0,index:h.i};}
    }
    return null;
  }
  function guidePoint(s){
    let p=v(.28,deck+.015,.34);
    if(s.hand.turn%2){
      if(s.stage===1)p.set(waterX+.2,1.25,waterZ);
      if(s.stage===2)p.copy(balloon.position).add(v(0,1.2,0));
      if(s.stage===3){
        let best=Infinity;
        for(const h of houseTargets){
          const screen=h.p.clone().project(camera);
          if(Math.abs(screen.x)>.84||Math.abs(screen.y)>.77)continue;
          const score=s.lamps[h.i].filament+.06*Math.abs(screen.x);
          if(score<best){best=score;p.copy(h.p);}
        }
      }
    }
    p.project(camera);return {x:(p.x*.5+.5)*width,y:(.5-p.y*.5)*height};
  }
  function render(s){update(s);renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(finalScene,finalCamera);}
  resize();return {render,hitTest,guidePoint};
}
