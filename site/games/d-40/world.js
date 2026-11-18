'use strict';
function buildGarden(T, scene, renderer, initial) {
  const random=Autumn.seedRandom(49123), rnd=(a,b)=>a+random()*(b-a), pick=a=>a[Math.floor(random()*a.length)];
  const v=(x,y,z)=>new T.Vector3(x,y,z), col=c=>new T.Color(c);
  const groups=[], materials=[], loader=new T.TextureLoader();
  function tex(name,repeat=1,color=true){
    const t=loader.load(GARDEN_SURFACES[name]);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=Math.min(6,renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=T.SRGBColorSpace;return t;
  }
  const rough=tex('roughness',1,false),woodMap=tex('wood'),barkMap=tex('bark'),turf=tex('turf',1),stoneMap=tex('stone'),leafMap=[tex('maple'),tex('zelkova')];
  function mat(color,options={}){const m=new T.MeshStandardMaterial({color,roughness:.81,roughnessMap:rough,...options});materials.push(m);return m;}
  const wood=mat(0xffffff,{map:woodMap}), bark=mat(0xffffff,{map:barkMap}),stone=mat(0xffffff,{map:stoneMap});
  const plain=mat(0xffffff),iron=mat(0xffffff,{metalness:.68,roughness:.38}), brass=mat(0xffffff,{metalness:.55,roughness:.34}), ceramic=mat(0xffffff,{roughness:.29});
  const plant=mat(0xffffff,{side:T.DoubleSide});
  const batches=new Map(),cube=new T.BoxGeometry(1,1,1),cyl=new T.CylinderGeometry(1,1,1,12),unitBall=new T.SphereGeometry(1,14,10),up=v(0,1,0),tmp=new T.Object3D();
  function group(parent=scene){const g=new T.Group();parent.add(g);groups.push(g);return g;}
  // Bake static joinery, twigs, blades and masonry by material and parent.
  function add(geo,m,tint,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0],parent=scene,q=null){
    tmp.position.set(...pos);tmp.scale.set(...scale);tmp.rotation.set(...rot);if(q)tmp.quaternion.copy(q);tmp.updateMatrix();
    let bm=batches.get(parent);if(!bm)batches.set(parent,bm=new Map());
    let b=bm.get(m);if(!b)bm.set(m,b={p:[],n:[],uv:[],c:[],idx:[]});
    const tintColor=col(tint),p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,vc=geo.attributes.color;
    const normalM=new T.Matrix3().getNormalMatrix(tmp.matrix),base=b.p.length/3,a=v(0,0,0);
    for(let i=0;i<p.count;i++){
      a.fromBufferAttribute(p,i).applyMatrix4(tmp.matrix);b.p.push(a.x,a.y,a.z);
      a.fromBufferAttribute(n,i).applyMatrix3(normalM).normalize();b.n.push(a.x,a.y,a.z);
      b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);
      b.c.push(tintColor.r*(vc?vc.getX(i):1),tintColor.g*(vc?vc.getY(i):1),tintColor.b*(vc?vc.getZ(i):1));
    }
    if(geo.index){for(let i=0;i<geo.index.count;i++)b.idx.push(base+geo.index.getX(i));}else{for(let i=0;i<p.count;i++)b.idx.push(base+i);}
  }
  const box=(parent,x,y,z,w,h,d,m,c,rot=[0,0,0])=>add(cube,m,c,[x,y,z],[w,h,d],rot,parent);
  function pole(parent,a,b,r1,r2,m,c,sides=10){
    const d=v(...b).sub(v(...a)),mid=v(...a).add(v(...b)).multiplyScalar(.5),q=new T.Quaternion().setFromUnitVectors(up,d.clone().normalize());
    add(r1===r2&&sides===12?cyl:new T.CylinderGeometry(r2/r1,1,1,sides),m,c,mid.toArray(),[r1,d.length(),r1],[0,0,0],parent,q);
  }
  function ell(parent,x,y,z,sx,sy,sz,m,c,rot=[0,0,0]){add(unitBall,m,c,[x,y,z],[sx,sy,sz],rot,parent);}
  function ring(parent,x,y,z,r,t,m,c,rot=[Math.PI/2,0,0]){add(new T.TorusGeometry(r,t,6,32),m,c,[x,y,z],[1,1,1],rot,parent);}
  function geometry(p,ids,uv,colors){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  }
  function buildBatches(){
    for(const [parent,bm] of batches)for(const [m,b] of bm){
      const g=new T.BufferGeometry();for(const [k,val,size] of [['position',b.p,3],['normal',b.n,3],['color',b.c,3],['uv',b.uv,2]])g.setAttribute(k,new T.Float32BufferAttribute(val,size));
      g.setIndex(b.idx);m.vertexColors=true;const mesh=new T.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    }batches.clear();
  }
  function hash(x,z){const k=Math.sin(x*127.1+z*311.7)*43758.545;return k-Math.floor(k);}
  function noise(x,z){let a=Math.floor(x),b=Math.floor(z),u=x-a,w=z-b;u=u*u*(3-2*u);w=w*w*(3-2*w);return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-w)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*w;}
  // The sky is a directional radiance field surrounding the fully modelled garden.
  function skyTexture(){
    const w=768,h=384,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),img=ctx.createImageData(w,h);
    const sun=v(-.57,.34,-1).normalize();for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const lat=(.5-j/h)*Math.PI,lon=(i/w-.5)*Math.PI*2,dy=Math.sin(lat),dx=Math.cos(lat)*Math.cos(lon),dz=Math.cos(lat)*Math.sin(lon),s=Math.max(0,dx*sun.x+dy*sun.y+dz*sun.z),k=Math.pow(Math.max(0,dy),.67);
      const gold=Math.pow(s,14),cloud=Math.max(0,noise(i*.014,j*.055)+.3*noise(i*.029,j*.12)-.62)*38*(1-k);
      const o=(i+j*w)*4;[232-105*k+gold*25+cloud,222-46*k+gold*19+cloud,194+5*k+gold*12+cloud].forEach((a,n)=>img.data[o+n]=Math.min(255,a));img.data[o+3]=255;
    }ctx.putImageData(img,0,0);const t=new T.CanvasTexture(canvas);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;return t;
  }
  scene.background=skyTexture();scene.environment=scene.background;scene.environmentIntensity=.36;scene.fog=new T.FogExp2(0xe5d6b5,.038);
  const skyLight=new T.HemisphereLight(0xe1ecff,0xb7a171,1.46);scene.add(skyLight);
  const sun=new T.DirectionalLight(0xffe2ac,2.76);sun.position.set(-6.6,8.4,-6.8);sun.target.position.set(0,0,-.9);scene.add(sun,sun.target);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-11,right:11,top:10,bottom:-10,near:.2,far:32});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00026;sun.shadow.normalBias=.013;sun.shadow.radius=2.4;
  // Hills and hedgerows make three progressively lighter, distant silhouettes.
  for(let layer=0;layer<3;layer++){
    const ps=[],cs=[],ix=[];const z=-29-layer*12;
    for(let i=0;i<=108;i++){const x=-70+i*1.3,y=1.5+layer*1.24+noise(i*.052+layer*5,8)*3+noise(i*.27,13+layer)*.45;
      ps.push(x,-2,z,x,y,z);const color=col([0x88917f,0x99a091,0xa5aba2][layer]);for(let k=0;k<2;k++)cs.push(color.r,color.g,color.b);if(i)ix.push(i*2-2,i*2,i*2-1,i*2,i*2+1,i*2-1);}
    add(geometry(ps,ix,null,cs),plant,0xffffff);
  }
  // A continuous lawn with an exposed earth path. Pebbles and herbage break the surface.
  const groundM=mat(0xffffff,{map:turf,roughness:.96});
  const earth=(x,z)=>-.035+.017*Math.sin(x*1.3+z*.71)+.022*(noise(x*1.1,z*1.1)-.5);
  {
    let p=[],ids=[],uv=[],colors=[],N=168,H=152;
    for(let j=0;j<=H;j++)for(let i=0;i<=N;i++){
      const x=-22+44*i/N,z=-26+35*j/H,field=noise(x*.9,z*.9),border=Math.abs(x-Autumn.pathX(z))-.71-(field-.5)*.38;
      const c=col(0x626544).lerp(col(0x979556),field*.64+noise(x*3,z*3)*.25);
      if(border<.24)c.lerp(col(0xb29d7b),Math.min(1,(.24-border)*3.7));const shadow=1-.32*Math.exp(-((x-2.1)**2/4.8+(z+6.8)**2/1.5))-.24*Math.exp(-((x+3.7)**2+(z+2.8)**2)/2.2);
      c.multiplyScalar(shadow);p.push(x,earth(x,z),z);uv.push(x*1.15,z*1.15);colors.push(c.r,c.g,c.b);if(i&&j){const a=i+j*(N+1);ids.push(a-1,a-N-1,a-N-2,a-1,a,a-N-1);}
    }
    add(geometry(p,ids,uv,colors),groundM,0xffffff);
  }
  function rockGeometry(count,flat){
    const p=[],ids=[],uv=[],sh=[],corners=[];
    for(let i=0;i<count;i++){const a=(i+rnd(-.13,.13))/count*Math.PI*2;corners.push([Math.cos(a)*rnd(.84,1.12),Math.sin(a)*rnd(.84,1.12)]);}
    for(const [s,h] of [[.82,-.32],[1,.04],[.89,.61],[.55,.78]])for(const [x,z] of corners){
      p.push(x*s,h+rnd(-.075,.075),z*s);uv.push(x*s*.55+.5,z*s*.55+.5);const n=rnd(.88,1.04)*(h<0?.79:1);sh.push(n,n,n);}
    for(let k=0;k<3;k++)for(let i=0;i<count;i++){const a=k*count+i,b=k*count+(i+1)%count;ids.push(a,a+count,b,b,a+count,b+count);}
    p.push(0,.84,0);uv.push(.5,.5);sh.push(1,1,1);for(let i=0;i<count;i++)ids.push(4*count,3*count+(i+1)%count,3*count+i);
    return geometry(p,ids,uv,sh);
  }
  const stones=Array.from({length:12},(_,i)=>rockGeometry(6+i%4));
  for(let z=-9.5;z<5;z+=rnd(.54,.83)){
    const x=Autumn.pathX(z);add(pick(stones),stone,pick([0xb5ad98,0xa59c85,0xbab09c,0x9c9684]),[x+rnd(-.16,.13),-.021,z],[rnd(.38,.59),rnd(.05,.085),rnd(.23,.36)],[0,rnd(-.6,.6),0]);
    if(random()<.78)add(pick(stones),stone,0xaaa28e,[x+rnd(.43,.64),-.014,z+rnd(-.15,.25)],[rnd(.13,.25),.041,rnd(.13,.22)],[0,rnd(0,6),0]);
  }
  for(let i=0;i<1120;i++){const z=rnd(-9,4),x=Autumn.pathX(z)+rnd(-1,1);const r=rnd(.008,.044);add(stones[i%12],stone,pick([0xad9f84,0x9e977e,0xbeb099]),[x,earth(x,z)+.014,z],[r,r*rnd(.3,.67),r*.8],[0,rnd(0,6),0]);}
  {
    const p=[],ids=[],uv=[],cs=[];const colors=[0x85834c,0x9a975e,0x6d7547,0x737949,0xb0a46a,0x5c673f].map(col);
    for(let i=0;i<21000;i++){const x=rnd(-11,11),z=rnd(-12,4.4);if(Math.abs(x-Autumn.pathX(z))<.72+rnd(-.14,.15)||z< -6.4&&Math.abs(x-2.12)<1.7)continue;
      const h=rnd(.034,.115)*(1+.65*noise(x*.85,z*.85)),n=x*x+z*z>65?2:4,c=pick(colors);
      for(let j=0;j<n;j++){const a=rnd(0,6.28),dx=Math.cos(a),dz=Math.sin(a),w=rnd(.004,.010),r=rnd(0,.04),a0=p.length/3,y=earth(x,z),bx=x+dx*r,bz=z+dz*r,len=h*rnd(.68,1.2);
        p.push(bx-dz*w,y,bz+dx*w,bx+dz*w,y,bz-dx*w,bx+dx*len*.37+.011,y+len*.65,bz+dz*len*.37,bx+dx*len*.58+.022,y+len,bz+dz*len*.58);
        ids.push(a0,a0+2,a0+1,a0,a0+3,a0+2);for(let k=0;k<4;k++){const f=k<2?.61:k===2?.93:1.13;cs.push(c.r*f,c.g*f,c.b*f);uv.push(k%2,k/4);}
      }}
    const mesh=new T.Mesh(geometry(p,ids,uv,cs),plant);mesh.receiveShadow=true;scene.add(mesh);
  }
  // A split rail fence steps around the garden. Each rail is a separate weathered timber.
  for(let i=0;i<21;i++){
    const x=-23+i*2.12,z=-8.6-.55*Math.cos(i*.54),h=rnd(.83,1.16);
    pole(scene,[x,-.1,z],[x+.03,h,z-.03],.085,.071,wood,0x958970,6);
    if(i<20)for(const y of [.32,.71])pole(scene,[x,y,z],[x+2.14,y+rnd(-.06,.08),-8.6-.55*Math.cos((i+1)*.54)],.058,.052,wood,0x9f9276,5);
  }
  // Folded leaf surfaces with inset veins and a tapered petiole, a lobed maple and a toothed zelkova.
  const mapleHalf=[[0,-1.10],[.115,-.76],[.22,-.84],[.195,-.54],[.31,-.64],[.28,-.31],[.44,-.48],[.63,-.82],[.62,-.59],[.75,-.64],[.68,-.4],[.80,-.44],[.61,-.13],[.88,-.27],[.88,-.14],[1.11,-.18],[.97,.01],[1.02,.085],[.80,.20],[.93,.25],[.69,.35],[.50,.43],[.58,.56],[.27,.53],[.07,.64],[0,.68]];
  function makeLeaf(species,variant=0,detailed=true){
    let edge=[];
    if(species===0)edge=[...mapleHalf,...mapleHalf.slice(1,-1).reverse().map(([x,z])=>[-x,z])];
    else {const side=[[0,-1.1]];for(let i=1;i<16;i++){const t=i/16,w=.51*Math.pow(Math.sin(Math.PI*t),.84)*(1.1-.27*t),z=-1.1+t*1.90;side.push([w+.029,z-.041],[w-.012,z+.021]);}side.push([0,.86]);edge=[...side,...side.slice(1,-1).reverse().map(([x,z])=>[-x,z])];}
    if(!detailed)edge=edge.filter((_,i)=>i%2===0);
    const p=[0,.055,.48],uv=[.5,1-(.48/2.5+.48)],idx=[],cs=[1,1,1],hub=.48;
    const rings=detailed?3:1;
    for(let r=1;r<=rings;r++)for(let i=0;i<edge.length;i++){
      const t=r/rings,[ex,ez]=edge[i],x=ex*t,z=hub+(ez-hub)*t;const fold=.11*Math.abs(x)+.13*(z-.38)**2+.058*Math.sin(x*6+variant)*(z+.5)+.07*ex*t*t*Math.sin(i*.52+variant);
      p.push(x,.026+fold*t,z);uv.push(x/2.4+.5,1-(z/2.5+.48));
      const tone=(.92+.08*Math.max(0,Math.cos(i*.35+variant)))*(1-.06*(1-t));cs.push(tone,tone,tone);
      const a=1+(r-1)*edge.length+i,b=1+(r-1)*edge.length+(i+1)%edge.length;
      if(r===1)idx.push(0,b,a);else idx.push(a-edge.length,b,a,b-edge.length,b,a-edge.length);
    }
    const b=p.length/3;p.push(-.018,.038,.60,.019,.036,.60,.013,.074,1.04,.039,.079,1.15);uv.push(.5,.28,.52,.28,.55,.1,.55,.06);cs.push(.48,.38,.19,.59,.46,.22,.55,.44,.19,.53,.40,.21);idx.push(b,b+1,b+2,b+1,b+3,b+2);
    return geometry(p,idx,uv,cs);
  }
  const leafM=leafMap.map(map=>mat(0xffffff,{map,vertexColors:true,side:T.DoubleSide,roughness:.71}));
  for(const m of leafM){
    m.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
        #ifdef USE_INSTANCING
        attribute float leafDry;
        #endif
        varying float vLeafDry;`).replace('#include <begin_vertex>',`#include <begin_vertex>
        #ifdef USE_INSTANCING
        vLeafDry=leafDry;
        #else
        vLeafDry=.85;
        #endif`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying float vLeafDry;`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor*=mix(.46,1.14,vLeafDry);
        diffuseColor.rgb*=mix(vec3(.68,.64,.59),vec3(1.),vLeafDry);`).replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        vec3 toSun=normalize(mat3(viewMatrix)*vec3(-6.6,8.4,-5.9));
        float throughLeaf=pow(max(dot(normalize(vViewPosition),-toSun),0.),2.);
        reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(.44,.30,.11)*throughLeaf;`);
    };
  }
  const leafGeos=Array.from({length:8},(_,i)=>makeLeaf(i%2,i*.81));
  const mapleColors=[0xbf5632,0xbe4730,0xd66e3e,0xa84a31,0xd99145,0xcc7544,0x973d29,0xe3a653,0xb95b39,0xe19b4e,0xc45d36];
  const elmColors=[0xc59640,0xdaa646,0xac8039,0x968344,0xcd9346,0xae7138,0xc88040,0xd7af56];
  const leafColors=i=>pick(i%2?elmColors:mapleColors);
  const leaves3d=[],leafSlots=[];
  const leafTransform=new T.Object3D();
  for(let i=0;i<8;i++){
    const count=initial.leaves.filter(l=>l.id%8===i).length;
    const m=new T.InstancedMesh(leafGeos[i],leafM[i%2],count);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;m.castShadow=true;m.receiveShadow=true;scene.add(m);leaves3d.push(m);
    const dryness=new T.InstancedBufferAttribute(new Float32Array(count),1);m.geometry.setAttribute('leafDry',dryness);let j=0;for(const l of initial.leaves)if(l.id%8===i){leafSlots[l.id]=j;dryness.setX(j,l.dry);m.setColorAt(j++,col(leafColors(i)));}
  }
  // Leaf litter in the grass extends the playable bed all the way to the treeline.
  const litterGeos=Array.from({length:4},(_,i)=>makeLeaf(i%2,i,false));
  for(let i=0;i<1400;i++){
    let x=rnd(-9.4,9.4),z=rnd(-8.6,3.5);
    if(i<500){x=rnd(-3.0,2.8);z=rnd(-1.8,3.05);}
    if(Math.abs(x)<2.55&&z>-.9&&z<1.8&&random()<.78)continue;
    const id=i%4,s=rnd(.048,.14)*(z>1.8?1.27:1),onPath=Math.abs(x-Autumn.pathX(z))<.7;
    add(litterGeos[id],leafM[id%2],leafColors(id),[x,onPath?.065:earth(x,z)+.042,z],[s,s,s],[rnd(-.12,.14),rnd(-3.14,3.14),rnd(-.14,.14)]);
  }
  // Bark rings follow each branch centreline. Roots taper visibly into the turf.
  function limb(parent,points,radii,color,sides=10){
    const p=[],uv=[],ids=[],cs=[],axis=v(0,0,1);
    const irregular=Array.from({length:sides},()=>rnd(.88,1.13));let length=0;
    for(let k=0;k<points.length;k++){
      const q=v(...points[k]),dir=v(...points[Math.min(k+1,points.length-1)]).sub(v(...points[Math.max(0,k-1)])).normalize();
      const u=axis.clone().cross(dir);if(u.length()<.1)u.set(1,0,0);u.normalize();const w=dir.clone().cross(u);
      if(k)length+=q.distanceTo(v(...points[k-1]));
      for(let j=0;j<=sides;j++){
        const a=j/sides*6.283,r=radii[k]*irregular[j%sides],node=q.clone().addScaledVector(u,r*Math.cos(a)).addScaledVector(w,r*Math.sin(a));
        p.push(...node.toArray());uv.push(j/sides*2,length*.6);const shade=.78+.18*irregular[j%sides];cs.push(shade,shade,shade);
        if(k&&j){let b=k*(sides+1)+j;ids.push(b-sides-2,b-sides-1,b,b-sides-2,b,b-1);}
      }}
    add(geometry(p,ids,uv,cs),bark,color,[0,0,0],[1,1,1],[0,0,0],parent);
  }
  const crownGroups=[],foliageColors=[[0xb5833c,0xd4963d,0xdcb451,0xe4b75d,0xc77634,0xaa6b2e,0xe9c56b],[0xad5c36,0xb95f36,0xc8783e,0xd38746,0xad713d,0xd49848],[0x8d904e,0xb29d4f,0xbc9854,0xc29b45,0xa9a265]];
  const twigLeaf=Array.from({length:4},(_,i)=>makeLeaf(i%2,i+.4,false));
  function crownSprig(parent,tip,radius,palette,density){
    for(let i=0;i<density;i++){
      const a=rnd(0,6.28),r=Math.sqrt(random())*radius,dy=rnd(-.38,.4)*radius+(1-r/radius)*.27;
      const x=tip[0]+Math.cos(a)*r,z=tip[2]+Math.sin(a)*r*.77,y=tip[1]+dy;
      const s=rnd(.065,.147)*(radius>.9?1.26:1);add(twigLeaf[i%4],leafM[i%2],pick(palette),[x,y,z],[s,s,s],[rnd(-1.15,1.04),rnd(-3,3),rnd(-.9,.9)],parent);
    }
  }
  function tree(x,z,height,width,palette,index,main){
    const parent=group();parent.position.set(x,earth(x,z),z);
    const trunk=main?.32:.17,offset=rnd(-.32,.26),bc=main?0x746855:0x8f8270;
    const p=[[0,-.09,0],[-.04,.28,.01],[.01,height*.23,-.06],[offset,height*.43,.04],[offset-.24,height*.68,.12],[-.11,height*.88,.19]];
    limb(parent,p,[trunk*1.65,trunk*1.16,trunk,trunk*.83,trunk*.55,trunk*.19],bc,main?16:9);
    if(main)for(let j=0;j<8;j++){const a=rnd(0,6.28);limb(parent,[[.04,.23,0],[Math.cos(a)*.46,.075,Math.sin(a)*.45],[Math.cos(a)*.92,-.04,Math.sin(a)*.89]],[.14,.078,.008],bc,7);}
    const count=main?16:9;
    for(let j=0;j<count;j++){
      const a=j*2.4+rnd(-.3,.3),level=.31+j/count*.43,r=width*(1.17-(j/count)*.5)*rnd(.76,1.12);
      const b=[offset-.13,height*level,.03],e=[Math.cos(a)*r,height*(level+.22)+rnd(-.15,.36),Math.sin(a)*r*.8],m=[b[0]+Math.cos(a)*r*.51,b[1]+height*.084,b[2]+Math.sin(a)*r*.39];
      limb(parent,[b,m,e],[trunk*(.47-j/count*.2),trunk*.24,.025],bc,8);
      const cg=group(parent);cg.position.set(...e);crownGroups.push({g:cg,idx:(j+index*7)%initial.crown.length});
      for(let k=0;k<(main?5:3);k++){
        const aa=a+rnd(-1.6,1.6),rr=rnd(.25,main?1.12:.9),ep=[Math.cos(aa)*rr,rnd(.05,.72),Math.sin(aa)*rr];
        limb(cg,[[0,0,0],[ep[0]*.54,ep[1]*.37,ep[2]*.42],ep],[.037,.023,.006],bc,6);
        crownSprig(cg,ep,main?rnd(.56,.90):rnd(.52,.87),palette,main?64:35);
      }
    }
  }
  tree(-3.7,-2.8,5.7,2.95,foliageColors[0],0,true);
  tree(5.85,-4.9,5.9,3.25,foliageColors[1],1,true);
  tree(-6.7,-8.4,5.3,2.7,foliageColors[1],2,false);
  tree(-2.15,-12.9,4.6,2.2,foliageColors[2],3,false);
  tree(6.3,-13.2,5.8,3.2,foliageColors[0],4,false);
  // Masses of distant leaves have irregular layered rims and a directional crown.
  const hedges=[0x908646,0x9c8445,0xb69752,0xa1854b,0x8e8c55].map(col);
  for(let j=0;j<48;j++){
    const x=rnd(-23,24),z=rnd(-20,-11),h=rnd(.7,2.5);
    pole(scene,[x,-.06,z],[x+.12,h*1.5,z],.07,.026,bark,0x7b705a,6);
    for(let i=0;i<7;i++){const a=rnd(0,6.28),r=rnd(.3,.91);
      const g=new T.IcosahedronGeometry(1,1),pos=g.attributes.position,cs=[];
      for(let k=0;k<pos.count;k++){const q=v(pos.getX(k),pos.getY(k),pos.getZ(k)),f=.81+noise(q.x*3+x,q.z*4+q.y)*.41;pos.setXYZ(k,q.x*f,q.y*f,q.z*f);const c=pick(hedges);cs.push(c.r,c.g,c.b);}
      g.setAttribute('color',new T.Float32BufferAttribute(cs,3));g.computeVertexNormals();add(g,plant,0xffffff,[x+Math.cos(a)*r,h*.69+rnd(.3,.84),z+Math.sin(a)*r],[rnd(.5,1.10),rnd(.45,.89),rnd(.48,1.12)]);
    }}
  // Rough ferns, seed heads and mossy stones at the garden's margins.
  for(let j=0;j<112;j++){const x=rnd(-9,9),z=rnd(-9,1.9);if(Math.abs(x)<2.9&&z>-4.5||Math.abs(x-Autumn.pathX(z))<1)continue;
    if(j%3===0){const r=rnd(.10,.29);add(pick(stones),stone,pick([0x8f9279,0x93937a,0x8b8771]),[x,0,z],[r,r*.72,r*.9]);}
    for(let k=0;k<6;k++){const a=rnd(0,6.28),len=rnd(.16,.43),s=len*.6;add(twigLeaf[1],plant,pick([0x7b8350,0x939157,0x8b884d]),[x+Math.sin(a)*s*.6,.08+len*.24,z+Math.cos(a)*s*.6],[s*.46,s,s],[.85,a,-.14]);}
  }
  const shed=group();shed.position.set(Autumn.SHED.x,.015,Autumn.SHED.z);
  const timberColors=[0x9d8465,0xa48b69,0xa99270,0x907a60,0xb09876,0x958267],trim=0xb99c77;
  const plank=(x,y,z,w,h,d,cl=pick(timberColors),rot=[0,0,0],parent=shed)=>box(parent,x,y,z,w,h,d,wood,cl,rot);
  const W=1.60,D=2.52,E=2.15,R=3.16;
  for(let i=0;i<17;i++){
    const x=-W+(i+.5)*2*W/17,w=2*W/17-.009;plank(x,E/2,-D,w,E,.085);
    if(Math.abs(x)>.69)plank(x,E/2,-.055,w,E,.075);
    const h=(1-Math.abs(x)/W)*(R-E);
    if(h>.025)plank(x,E+h/2-.007,-.04,w,h+.03,.1);
  }
  for(let side of [-1,1])for(let j=0;j<14;j++)plank(side*W,E/2,-(j+.5)*D/14,.088,E,D/14-.008);
  for(let i=0;i<13;i++)plank(-1.48+i*.246,.035,-1.26,.237,.105,2.6,0x957b5b);
  for(const x of [-W+.045,W-.045])for(const z of [-D,-.012])plank(x,1.09,z,.14,2.23,.15,trim);
  plank(0,E,.025,3.37,.15,.14,0xa9916d);plank(0,.13,.025,3.32,.17,.12,0x8f7c63);
  // A recessed doorway open to an actual furnished interior.
  const doorGroup=group(shed);doorGroup.position.set(-.73,.1,.087);
  for(let j=0;j<8;j++)plank((j+.5)*1.45/8,.935,0,1.45/8-.006,1.87,.083,pick([0x977853,0xa1875f,0x967f60,0x8b7656]),[0,0,0],doorGroup);
  for(const y of [.17,1.64])plank(.73,y,.064,1.44,.105,.057,0x877459,[0,0,0],doorGroup);
  pole(doorGroup,[.09,.22,.061],[1.32,1.62,.061],.058,.058,wood,0x9c805e,4);
  for(const y of [.33,1.53]){box(doorGroup,.20,y,.112,.42,.052,.023,iron,0x44483e);for(let j=0;j<3;j++)ell(doorGroup,.045+j*.14,y,.129,.015,.015,.009,iron,0x59584a);}
  box(doorGroup,1.22,.89,.082,.092,.17,.034,iron,0x4f5145);ring(doorGroup,1.22,.87,.13,.062,.011,brass,0xa58b59,[0,0,0]);
  for(const x of [-.79,.78])plank(x,1.05,.10,.12,2.09,.15,trim);plank(0,2.02,.108,1.71,.15,.16,trim);
  // Small four-pane window, sill and a slatted loft vent.
  const windowM=mat(0x7f9a93,{metalness:.32,roughness:.13,emissive:0x263a37,emissiveIntensity:.33});
  box(shed,1.20,1.31,.009,.50,.65,.10,windowM,0xffffff);
  for(const x of [.92,1.48])plank(x,1.31,.08,.067,.77,.10,0xc1ae88);
  for(const y of [.94,1.68])plank(1.2,y,.08,.64,.07,.1,0xb8a582);
  plank(1.2,1.31,.086,.035,.68,.04,0xc1ac85);plank(1.2,1.30,.088,.52,.036,.046,0xb9a07e);plank(1.2,.91,.10,.72,.08,.23,0xada38b);
  for(let j=0;j<5;j++)plank(0,2.43+j*.068,.039,.44-j*.049,.05,.09,0x776d57);
  const angle=Math.atan((R-E)/W),roofMat=mat(0xffffff,{map:woodMap,roughness:.91});
  for(const s of [-1,1]){
    const w=(W+.24)/Math.cos(angle);box(shed,s*(W+.24)/2,R-Math.tan(angle)*(W+.24)/2,-D*.5,w,.13,D+.60,roofMat,0x746f5c,[0,0,-s*angle]);
    for(let r=0;r<7;r++)for(let j=0;j<14;j++){
      const run=(r+.54)*(W+.24)/7,z=-D-.24+(j+.5)*.222+(r%2)*.052;
      box(shed,s*run,R-run*Math.tan(angle)+.081+(6-r)*.003,z,.368,.052,.216,roofMat,pick([0x85816c,0x777868,0x8f8a71,0x7e7c68,0x85836e]),[0,0,-s*angle]);
    }
    for(const z of [.32,-D-.31])box(shed,s*(W+.24)/2,R-Math.tan(angle)*(W+.24)/2+.006,z,w,.138,.10,wood,0xaa9879,[0,0,-s*angle]);
  }
  plank(0,R+.115,-D/2,.13,.10,D+.77,0x978c72);
  for(let j=0;j<7;j++){const x=-1.6+j*.49;add(stones[j],stone,0xaaa391,[x,.015,.26],[.32,.12,.32],[0,rnd(-.3,.3),0],shed);}
  // Terracotta pots with rolled lips, stacked firewood and a worn threshold.
  function pot(parent,x,y,z,r,h,color){
    const shape=[[.58,0],[.71,.06],[.95,.83],[1.04,.84],[1.05,1],[.87,1],[.84,.84],[.6,.15]];
    const g=new T.LatheGeometry(shape.map(([a,b])=>new T.Vector2(a*r,b*h)),28);add(g,ceramic,color,[x,y,z],[1,1,1],[0,0,0],parent);ell(parent,x,y+h*.85,z,r*.83,.018,r*.83,plain,0x594736);
  }
  pot(shed,-1.31,.03,.44,.25,.40,0xb77f60);pot(shed,-1.73,.015,.54,.16,.26,0x9a7159);
  for(let i=0;i<27;i++){const x=-1.31+rnd(-.18,.18),z=.44+rnd(-.15,.15),h=rnd(.48,.91);pole(shed,[x,.36,z],[x+rnd(-.07,.07),h,z+.05],.007,.005,plant,0x838252,4);
    add(twigLeaf[1],plant,pick([0x979359,0x8e854b,0xaa9954]),[x,h-.08,z],[.055,.15,.15],[rnd(.1,.9),rnd(-3,3),0],shed);}
  for(let j=0;j<11;j++){const x=-1.94+(j%4)*.22,y=.12+Math.floor(j/4)*.178,z=-.36+rnd(-.08,.08);pole(shed,[x,y,z-.56],[x,y,z+.22],.115,.122,bark,0x776c55,10);pole(shed,[x,y,z+.22],[x,y,z+.226],.103,.105,wood,0xb7a17e,11);}
  // Summer objects on the far workbench (all move around their real pivots).
  const bench=group(shed);bench.position.set(0,.72,-1.62);
  for(let j=0;j<5;j++)box(bench,0,.01,-.4+j*.20,2.61,.103,.194,wood,pick(timberColors));
  for(const x of [-1.12,1.12])for(const z of [-.33,.34])box(bench,x,-.34,z,.096,.68,.095,wood,0x8e795a);
  const warm=mat(0xffe0a2,{emissive:0xffbe68,emissiveIntensity:.78,roughness:.25});
  // Sunlit back window panels provide the warm light visible through the crack.
  box(shed,0,1.53,-D+.07,1.35,.81,.055,warm,0xffe4ae);
  for(const x of [-.7,0,.7])plank(x,1.53,-D+.12,.05,.92,.075,0xba9f72);
  for(const y of [1.08,1.52,1.97])plank(0,y,-D+.12,1.43,.053,.08,0xb29b74);
  const can=group(bench);can.position.set(-.87,.32,.02);
  const enamel=mat(0xffffff,{metalness:.38,roughness:.28});
  add(new T.LatheGeometry([[.17,-.22],[.21,-.20],[.239,-.07],[.231,.12],[.195,.20],[.148,.22],[.14,.198]].map(a=>new T.Vector2(...a)),40),enamel,0x7f9f98,[0,0,0],[1,1,.84],[0,0,0],can);
  ring(can,0,-.188,0,.207,.012,enamel,0x849d91);ell(can,0,.204,0,.145,.012,.13,plain,0x494e40);
  pole(can,[.15,-.07,0],[.43,.22,.06],.086,.037,enamel,0x86a498,18);pole(can,[.43,.22,.06],[.48,.26,.068],.056,.085,brass,0xa9a17c,18);
  add(new T.TorusGeometry(.175,.024,8,32,Math.PI*1.52),enamel,0x758f85,[-.20,.045,0],[.88,1.13,1],[0,0,.72],can);
  ring(can,0,.21,0,.18,.02,enamel,0x789488,[0,0,0]);
  const vessel=group(bench);vessel.position.set(.20,0,.1);
  const basinGeo=new T.LatheGeometry([[.41,.058],[.46,.065],[.51,.192],[.52,.205],[.49,.205],[.48,.18],[.426,.088]].map(a=>new T.Vector2(...a)),48);
  add(basinGeo,iron,0x9da79c,[0,0,0],[1.45,1,.8],[0,0,0],vessel);
  const liquid=group(vessel),wp=[],wi=[],wu=[];
  for(let i=0;i<initial.ripples.length;i++){const p=initial.ripples[i];wp.push(p.x*Math.sqrt(1-p.z*p.z*.5)*.717,.157,p.z*Math.sqrt(1-p.x*p.x*.5)*.390);wu.push((p.x+1)*.5,(p.z+1)*.5);if(i%13&&i>=13)wi.push(i-1,i-13,i-14,i-1,i,i-13);}
  const surface=new T.Mesh(geometry(wp,wi,wu),mat(0x8caaa0,{roughness:.13,metalness:.29,side:T.DoubleSide}));surface.receiveShadow=true;liquid.add(surface);
  const boat=group(vessel);
  add(new T.LatheGeometry([[.0,0],[.50,.04],[1,.089],[.95,.11]].map(([a,b])=>new T.Vector2(a*.21,b)),16),wood,0xb48a59,[0,0,0],[1.43,1,.55],[0,0,0],boat);
  pole(boat,[0,.079,0],[0,.48,0],.011,.008,wood,0xb09a75,8);
  add(geometry([-.202,.14,0,-.015,.46,0,-.015,.145,.018],[0,1,2],[0,0,1,1,1,0]),plant,0xe8d9b5,[0,0,0],[1,1,1],[0,0,0],boat);
  add(geometry([.018,.395,0,.177,.153,0,.018,.145,.013],[0,1,2],[0,1,1,0,0,0]),plant,0xb5795d,[0,0,0],[1,1,1],[0,0,0],boat);
  const wheel=group(bench);wheel.position.set(.99,.9,-.16);
  pole(bench,[.99,.065,-.22],[.99,.93,-.22],.022,.017,wood,0xc8b58b,9);
  for(let i=0;i<5;i++){add(geometry([0,0,0,.10,.07,.065,.18,.22,0,-.01,.17,-.025],[0,1,2,0,2,3],[0,0,1,0,1,1,0,1]),plant,[0xc98360,0xc7ac6f,0x8ea894,0xa7b9b2,0xd6a477][i],[0,0,0],[1,1,1],[0,0,i/5*6.283],wheel);}
  ell(wheel,0,0,.043,.031,.031,.025,brass,0xbda16c);
  for(let j=0;j<3;j++){const h=.34+j*.04;pot(bench,.89+j*.12,.062,-.34,.079,h*.48,0xa18566);pole(bench,[.88+j*.12,.14,-.34],[.90+j*.13,h+.13,-.35],.018,.015,wood,0xc2a378,8);}
  const exitLeaf=group(bench);add(leafGeos[0],leafM[0],0xd48442,[0,0,0],[.15,.15,.15],[1.22,.15,.45],exitLeaf);exitLeaf.position.set(.94,.47,.36);
  // The fan is split bamboo, bound to a turned ash handle. Each tooth curves back at the soil.
  const rake=group();rake.rotation.order='YXZ';
  const hub=[0,.67,-.32],end=[-.55,2.53,-.91];
  pole(rake,hub,end,.044,.037,wood,0xd9b37c,20);
  ell(rake,...end,.038,.043,.038,wood,0xcfab76);
  const handlePoint=t=>hub.map((n,k)=>n+(end[k]-n)*t);
  for(const [a,b,r,c] of [[.012,.11,.055,0x9e7346],[.14,.165,.046,0xe0bc83],[.87,.886,.039,0x927042],[.888,.967,.040,0xb29064]]){
    pole(rake,handlePoint(a),handlePoint(b),r,r*.97,wood,c,18);
  }
  for(let j=0;j<11;j++){const t=.018+j*.008;pole(rake,handlePoint(t),handlePoint(t+.0038),.056,.056,plant,j%3?0x755d3c:0xa88959,16);}
  const tine=(i,t)=>{
    const s=i/12;return [s*(.058+.635*t),.665*(1-t)+.049*t+.061*Math.sin(t*Math.PI)-.035*t**4+.036*Math.abs(s)*t,-.312+.84*t-.145*s*s*t];
  };
  function strip(pts,width,thick,m,c,parent){
    const p=[],uv=[],ids=[];
    pts.forEach(([x,y,z],i)=>{for(const [dx,dy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){p.push(x+dx*width*.5,y+dy*thick*.5,z);uv.push(dx*.5+.5,i/(pts.length-1));}
      if(i)for(let k=0;k<4;k++){const a=(i-1)*4+k,b=(i-1)*4+(k+1)%4;ids.push(a,b,b+4,a,b+4,a+4);}});
    ids.push(0,2,1,0,3,2);const b=p.length/3-4;ids.push(b,b+1,b+2,b,b+2,b+3);
    add(geometry(p,ids,uv),m,c,[0,0,0],[1,1,1],[0,0,0],parent);
  }
  const teeth=group(rake);
  for(let i=-12;i<=12;i++){const pts=[];for(let j=0;j<=8;j++)pts.push(tine(i,j/8));const tip=pts[8];pts.push([tip[0]*1.012,tip[1]-.020,tip[2]+.058]);strip(pts,.024,.012,wood,pick([0xe4bf84,0xc79b63,0xc49a62,0xd9ad70,0xc39359]),teeth);}
  for(let t of [.26,.61])for(let i=-12;i<12;i++){const a=tine(i,t),b=tine(i+1,t);a[1]+=.012;b[1]+=.012;pole(rake,a,b,t>.5?.012:.017,t>.5?.012:.017,wood,0xb08a51,7);
    if(i%2===0){const c=tine(i,t+.015),d=tine(i+.7,t-.016);c[1]+=.018;d[1]+=.016;pole(rake,c,d,.007,.007,plant,0x826d49,5);}}
  // A forked garden peg supports the rake at rest.
  const peg=group();peg.position.set(-1.15,0,.61);
  limb(peg,[[0,-.025,0],[.026,.48,-.06],[-.008,.75,-.12],[-.145,.88,-.14]],[.052,.037,.026,.014],0x9b8a68);
  limb(peg,[[-.002,.71,-.12],[.088,.86,-.13]],[.027,.012],0x9c8968);
  const acorn=group();
  const acornBody=new T.LatheGeometry([[.005,-.135],[.034,-.118],[.072,-.067],[.088,-.018],[.086,.036],[.071,.070],[.018,.088]].map(a=>new T.Vector2(...a)),28);
  add(acornBody,wood,0xb57641,[0,0,0],[1,1,1],[0,0,0],acorn);
  ell(acorn,0,.060,0,.096,.055,.095,bark,0x886948);
  for(let k=0;k<4;k++)for(let j=0;j<16-k*2;j++){const a=j/(16-k*2)*6.283+k*.39,r=.087-k*.009;ell(acorn,Math.cos(a)*r,.045+k*.014,Math.sin(a)*r,.016,.013,.012,bark,pick([0x997a55,0xa48761,0x816546]),[0,-a,0]);}
  pole(acorn,[0,.10,0],[.03,.15,-.01],.018,.012,bark,0x806344,8);
  const puddles=group();for(let j=0;j<3;j++){const x=-1.4-j*.15,z=-4.4+j*.09;ell(puddles,x,.004,z,.22+j*.043,.009,.11,mat(0xffffff,{roughness:.095,metalness:.38}),0x92947d);}
  const motes=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xffe5ac,{emissive:0xffdc85,emissiveIntensity:.34}),initial.dust.length);motes.frustumCulled=false;scene.add(motes);
  const droplets=new T.InstancedMesh(new T.SphereGeometry(1,8,6),mat(0xb3c8bc,{metalness:.36,roughness:.10}),initial.drops.length);droplets.frustumCulled=false;bench.add(droplets);
  const accents=group();const seed=mat(0xffdf8b,{emissive:0xffbd54,emissiveIntensity:.68});
  // Tiny amber pollen grains gather over the current object.
  for(let j=0;j<5;j++){const r=.008+j%2*.003;ell(accents,rnd(-.09,.09),rnd(.02,.14),rnd(-.06,.06),r,r,r,seed,0xffffff);}
  buildBatches();
  const tineGeometry=teeth.children[0].geometry,tinePosition=tineGeometry.attributes.position,restTines=tinePosition.array.slice();
  const toothVertexCount=tinePosition.count/25;
  function update(s){
    for(let i=0;i<tinePosition.count;i++){
      const tooth=Math.floor(i/toothVertexCount),along=Math.floor((i%toothVertexCount)/4)/9;
      const free=Math.max(0,(along-.53)/.47),bend=s.tines[tooth].bend*free*free;
      tinePosition.setY(i,restTines[i*3+1]+bend);tinePosition.setZ(i,restTines[i*3+2]-bend*.32);
    }
    tinePosition.needsUpdate=true;
    rake.position.set(s.rake.x,s.rake.y,s.rake.z);rake.rotation.set(-s.rake.tilt*.85,s.rake.angle,Math.max(0,s.rake.tilt-.55)*.36,'YXZ');
    for(const l of s.leaves){leafTransform.position.set(l.x,l.y,l.z);leafTransform.rotation.set(l.roll,l.angle,l.baseTilt*.55+l.roll*.3,'YXZ');leafTransform.scale.setScalar(l.radius);leafTransform.updateMatrix();leaves3d[l.id%8].setMatrixAt(leafSlots[l.id],leafTransform.matrix);leaves3d[l.id%8].geometry.attributes.leafDry.setX(leafSlots[l.id],l.dry);}
    for(const m of leaves3d){m.instanceMatrix.needsUpdate=true;m.geometry.attributes.leafDry.needsUpdate=true;}
    for(const b of crownGroups){const q=s.crown[b.idx];b.g.rotation.set(q.angle*.35,0,q.angle);}
    for(let i=0;i<s.dust.length;i++){const d=s.dust[i];tmp.position.set(d.x,d.y,d.z);tmp.scale.setScalar(.0033+i%4*.0015);tmp.rotation.set(0,0,0);tmp.updateMatrix();motes.setMatrixAt(i,tmp.matrix);}motes.instanceMatrix.needsUpdate=true;
    acorn.visible=s.nut.visible||s.act==='burst';acorn.position.set(s.nut.x,s.nut.y,s.nut.z);acorn.rotation.set(.24+s.nut.roll,0,-.38);
    doorGroup.rotation.y=-s.door.angle;can.rotation.z=-s.water.tilt;boat.position.set(s.water.boatX,.158+s.water.level+s.water.wave*.16,.055);boat.rotation.set(s.water.boatRoll*.24,.18,s.water.boatRoll);liquid.position.y=s.water.level;
    if(s.stage===3){const waterPos=surface.geometry.attributes.position;for(let i=0;i<s.ripples.length;i++)waterPos.setY(i,.157+s.ripples[i].h);waterPos.needsUpdate=true;surface.geometry.computeVertexNormals();}wheel.rotation.z=s.water.spin;
    for(let i=0;i<s.drops.length;i++){const d=s.drops[i];tmp.position.set(d.x,d.y,d.z);tmp.scale.set(d.live?.012:0,d.live?.021:0,d.live?.012:0);tmp.updateMatrix();droplets.setMatrixAt(i,tmp.matrix);}droplets.instanceMatrix.needsUpdate=true;
    exitLeaf.visible=['play','return'].includes(s.act);exitLeaf.rotation.z=s.crown[9].angle*1.7;
    const f=focus(s);accents.position.copy(f);accents.position.y+=.09+s.cells[21].u*.12;accents.rotation.y=s.crown[17].angle*4;accents.visible=s.idle>2.2&&!['burst','opening','return'].includes(s.act);
  }
  function focus(s){
    if(s.act==='gather')return rake.localToWorld(v(0,.38,.03));
    if(['park','dive','burst'].includes(s.act))return v(Autumn.PILE.x,s.currentPile,Autumn.PILE.z);
    if(s.act==='nut')return acorn.position.clone();
    if(s.act==='wind'){const z=-.50-Math.min(5.2,s.windFront*.81);return v(Autumn.pathX(z),.19,z);}
    if(s.act==='door'||s.act==='opening')return doorGroup.localToWorld(v(1.20,.88,.13));
    if(s.act==='pour')return can.localToWorld(v(0,.17,0));if(s.act==='sail')return boat.localToWorld(v(0,.19,0));
    return exitLeaf.getWorldPosition(v(0,0,0));
  }
  // A local reflection probe includes the lawn, treetops and the shed in metal and water.
  function probe(){
    const target=new T.WebGLCubeRenderTarget(64,{generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
    const cam=new T.CubeCamera(.15,38,target);cam.position.set(.1,1,-4.9);scene.add(cam);
    cam.update(renderer,scene);scene.remove(cam);scene.environment=target.texture;scene.environmentIntensity=.49;
  }
  return {update,focus,probe,rake,shed,doorGroup,can,boat,wheel,exitLeaf,acorn,bench,materials};
}
