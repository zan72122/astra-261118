/* All shop fittings, ornaments, surfaces and planting are built locally in metres. */
function makeAtrium(scene, renderer) {
  'use strict';
  const T=THREE, A=AtriumMotion, PI=Math.PI, V=(x,y,z)=>new T.Vector3(x,y,z);
  let seed=38211;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function texture(w,h,paint) {
    const c=document.createElement('canvas'); c.width=w;c.height=h;paint(c.getContext('2d'),w,h);
    const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy()); return t;
  }
  const rough=texture(128,128,(g,w,h)=>{
    const im=g.createImageData(w,h);
    for(let i=0;i<im.data.length;i+=4){const a=213+random()*40;im.data.set([a,a,a,255],i);}
    g.putImageData(im,0,0);
  });
  const stone=texture(512,512,(g,w,h)=>{
    const im=g.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const q=2*PI/w, u=x*q,v=y*q;
      const river=Math.sin(u+2*v+1.85*Math.sin(u-v)+0.23*Math.sin(3*u+4*v)+0.09*Math.sin(13*u+6*v));
      const f=241+3*Math.sin(u+v)+3*Math.sin(2*u-v)-17*Math.exp(-Math.abs(river)*36)-7*Math.exp(-Math.abs(river)*6)+6*(random()-0.5);
      im.data.set([f,f-1,f-4,255],4*(x+y*w));
    } g.putImageData(im,0,0);
  });stone.colorSpace=T.SRGBColorSpace;
  const machined=texture(128,128,(g,w,h)=>{
    for(let y=0;y<h;y++){const v=[45,105,183,209][y%4];g.fillStyle='rgb('+v+','+v+','+v+')';g.fillRect(0,y,w,1);}
  });machined.colorSpace=T.SRGBColorSpace;
  function mat(color,metalness=0,roughness=0.54,more={}) {
    return new T.MeshStandardMaterial({color,metalness,roughness,roughnessMap:rough,...more});
  }
  const cream=mat(0xe9d8b6),ivory=mat(0xffeacc,0.06,0.35),limestone=mat(0xe2c8a8,0,0.57,{map:stone}),
    peach=mat(0xd6a892,0.04,0.52,{map:stone}),pink=mat(0xb46d57,0.08,0.44),oak=mat(0x94734f,0.12,0.48),
    forest=mat(0x284f45,0.29,0.29),green=mat(0x648b76,0.25,0.38),celadon=mat(0x9db29a,0.13,0.38),
    gilt=mat(0xd2aa65,0.80,0.25),bright=mat(0xf0cb80,0.76,0.21),bronze=mat(0x856847,0.70,0.38),
    steel=mat(0xafb9b5,0.84,0.25),rubber=mat(0x303936,0.16,0.33),
    glass=mat(0x9bc9bf,0.32,0.12,{transparent:true,opacity:0.27,depthWrite:false}),
    enamel=mat(0x40695f,0.38,0.28),soil=mat(0x514b36),opal=mat(0xffebbe,0.12,0.23,{emissive:0xffda9a,emissiveIntensity:0.50}),
    leafM=[0x597854,0x638358,0x829669,0x476d52,0x8a9e68,0x496a43].map(c=>mat(c,0.04,0.48,{side:T.DoubleSide}));
  const groundColors=[0xede0c6,0xf6e7d3,0xefe1cc,0xe5d7bd].map(c=>mat(c,0.11,0.32,{map:stone}));
  // A locally generated light probe contains the warm floor, sky and bright window banks.
  const env=texture(512,256,(g,w,h)=>{
    const grad=g.createLinearGradient(0,0,0,h);
    [[0,'#a8c9d8'],[0.34,'#e5e8da'],[0.52,'#d3bb9a'],[0.65,'#988674'],[1,'#d6c7a5']].forEach(([p,c])=>grad.addColorStop(p,c));
    g.fillStyle=grad;g.fillRect(0,0,w,h);
    for(let i=0;i<18;i++){g.fillStyle=i%5===0?'#797b6d':'#fff7dc';g.fillRect(i*28,63,24,54);g.fillStyle='#958976';g.fillRect(i*28,91,24,2);}
  });env.colorSpace=T.SRGBColorSpace;env.mapping=T.EquirectangularReflectionMapping;
  const pm=new T.PMREMGenerator(renderer);const probe=pm.fromEquirectangular(env);scene.environment=probe.texture;scene.environmentIntensity=0.72;pm.dispose();env.dispose();
  scene.background=new T.Color(0xc4dce1);scene.fog=new T.FogExp2(0xe6dfca,0.015);
  scene.add(new T.HemisphereLight(0xf4f9ff,0xe1c3a2,1.45));
  const sun=new T.DirectionalLight(0xffeccb,3.0);sun.position.set(-12,22,7);sun.target.position.set(1,2,-2);
  sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-16,right:16,bottom:-14,top:16,near:1,far:52});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=0.025;sun.shadow.bias=-0.00017;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
  scene.add(sun,sun.target);
  const fixed=new T.Group();scene.add(fixed);
  const cube=new T.BoxGeometry(1,1,1),cyl=new T.CylinderGeometry(1,1,1,24),sphere=new T.SphereGeometry(1,20,14);
  const geomCache=new Map(), cached=(key,fn)=>{if(!geomCache.has(key))geomCache.set(key,fn());return geomCache.get(key);};
  function group(parent,x=0,y=0,z=0) {const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function mesh(g,geo,m,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=!m.transparent;o.receiveShadow=true;g.add(o);return o;}
  function box(g,x,y,z,w,h,d,m){return mesh(g,cube,m,x,y,z,w,h,d);}
  function ball(g,x,y,z,rx,ry,rz,m){return mesh(g,sphere,m,x,y,z,rx,ry,rz);}
  function cylinder(g,x,y,z,top,bottom,height,m,n=32){
    const geo=cached('c'+(bottom/top).toFixed(4)+n,()=>new T.CylinderGeometry(1,bottom/top,1,n));
    return mesh(g,geo,m,x,y,z,top,height,top);
  }
  function rod(g,a,b,r,m){
    const p=V(...a),q=V(...b),dir=q.clone().sub(p);
    const section=r<0.031?8:r<0.08?12:24;
    const shaft=section===24?cyl:cached('shaft'+section,()=>new T.CylinderGeometry(1,1,1,section));
    const o=mesh(g,shaft,m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,dir.length(),r);
    o.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());return o;
  }
  function tube(g,points,r,m,segments=32){
    const path=new T.CatmullRomCurve3(points.map(p=>V(...p)),false,'centripetal');
    return mesh(g,new T.TubeGeometry(path,segments,r,8,false),m,0,0,0);
  }
  function shape(g,s,depth,m,x=0,y=0,z=0,bevel=0){
    return mesh(g,new T.ExtrudeGeometry(s,{depth,bevelEnabled:!!bevel,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:20}),m,x,y,z);
  }
  function panel(g,points,depth,m,z){
    const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return shape(g,s,depth,m,0,0,z);
  }
  function ring(g,x,y,z,r,t,m,vertical=false){
    const geo=cached('r'+(t/r).toFixed(3),()=>new T.TorusGeometry(1,t/r,8,56));
    const o=mesh(g,geo,m,x,y,z,r,r,r);if(!vertical)o.rotation.x=PI/2;return o;
  }
  function arch(g,x,y,z,w,h,m,depth=0.12){
    const s=new T.Shape(),r=w/2;s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,PI,false);s.lineTo(-r,0);
    return shape(g,s,depth,m,x,y,z);
  }
  function archRim(g,x,y,z,w,h,r,m){
    const a=w/2;const pts=[[x-a,y,z],[x-a,y+h-a,z]];
    for(let i=1;i<=24;i++){const t=PI-i*PI/24;pts.push([x+Math.cos(t)*a,y+h-a+Math.sin(t)*a,z]);}pts.push([x+a,y,z]);
    for(let i=1;i<pts.length;i++)rod(g,pts[i-1],pts[i],r,m);
  }
  // Batch repeated fittings by mesh and alloy. Animated assemblies keep their own transforms.
  function pack(g) {
    g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),bins=new Map(),solos=[];
    g.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;
      if(!bins.has(key))bins.set(key,[]);bins.get(key).push(o);});
    for(const objects of bins.values()){
      const first=objects[0];
      if(first.material.transparent || objects.length===1)continue;
      const inst=new T.InstancedMesh(first.geometry,first.material,objects.length);
      objects.forEach((o,i)=>{inst.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));solos.push(o);});
      inst.castShadow=first.castShadow;inst.receiveShadow=true;inst.computeBoundingSphere();g.add(inst);
    }
    // Unshared curved profiles are assembled by finish to keep the mobile draw count low.
    const profiles=new Map();
    for(const list of bins.values()){
      const o=list[0];if(list.length!==1||o.material.transparent)continue;
      if(!profiles.has(o.material))profiles.set(o.material,[]);profiles.get(o.material).push(o);
    }
    for(const [material,list] of profiles){
      if(list.length<3)continue;
      const positions=[],normals=[],coords=[],indices=[];
      for(const o of list){
        const geo=o.geometry,transform=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);
        const normalMatrix=new T.Matrix3().getNormalMatrix(transform),vec=new T.Vector3();
        const start=positions.length/3,pa=geo.attributes.position,na=geo.attributes.normal,ua=geo.attributes.uv;
        for(let i=0;i<pa.count;i++){
          vec.fromBufferAttribute(pa,i).applyMatrix4(transform);positions.push(vec.x,vec.y,vec.z);
          vec.fromBufferAttribute(na,i).applyNormalMatrix(normalMatrix);normals.push(vec.x,vec.y,vec.z);coords.push(ua.getX(i),ua.getY(i));
        }
        const ind=geo.index;for(let i=0;i<(ind?ind.count:pa.count);i++)indices.push(start+(ind?ind.getX(i):i));
        solos.push(o);
      }
      const merged=new T.BufferGeometry();
      merged.setAttribute('position',new T.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
      merged.setAttribute('uv',new T.Float32BufferAttribute(coords,2));merged.setIndex(indices);mesh(g,merged,material,0,0,0);
    }
    solos.forEach(o=>o.removeFromParent());
  }
  const tile=1.36;
  box(fixed,0,-0.175,-2,27,0.28,26,limestone);
  for(let iz=-9;iz<9;iz++)for(let ix=-10;ix<10;ix++){
    const x=ix*tile,z=iz*tile;box(fixed,x,-0.035,z,tile-0.009,0.065,tile-0.009,groundColors[Math.floor(random()*4)]);
    if((iz===3||iz===4)&&ix%2===0){
      const d=box(fixed,x+tile*0.5,0.001,z+tile*0.5,0.135,0.006,0.135,green);d.rotation.y=PI/4;
    }
  }
  for(const z of [4.85,4.91,6.9,6.96])box(fixed,0,0.008,z,26,0.009,0.018,bronze);
  function floorBorder(x,z,r){
    [r,r-0.07,r-0.27].forEach((rad,i)=>ring(fixed,x,0.012,z,rad,i===1?0.023:0.009,i===1?celadon:bronze));
    for(let j=0;j<16;j++){const a=j*PI/8;const deco=box(fixed,x+Math.cos(a)*(r-0.16),0.012,z+Math.sin(a)*(r-0.16),0.075,0.012,0.075,bronze);deco.rotation.y=PI/4-a;}
  }floorBorder(-5.15,2.2,1.49);
  // The same galleries connect all three flights, with a broad central light well.
  function deck(g,x,y,z,w,d) {
    box(g,x,y-0.24,z,w,0.48,d,limestone);
    box(g,x,y-0.39,z,w+0.04,0.065,d+0.04,cream);
    box(g,x,y-0.155,z,w+0.032,0.027,d+0.032,bright);
    box(g,x,y-0.065,z,w+0.06,0.07,d+0.06,ivory);
  }
  function bal(g,x1,z1,x2,z2,y){
    const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),n=Math.ceil(len/1.08);
    for(let i=0;i<=n;i++){
      const x=x1+dx*i/n,z=z1+dz*i/n;
      rod(g,[x,y,z],[x,y+0.87,z],0.026,gilt);cylinder(g,x,y+0.06,z,0.062,0.075,0.11,bronze);
      if(i<n){
        const gp=group(g,x+dx/n/2,y+0.44,z+dz/n/2);gp.rotation.y=-Math.atan2(dz,dx);
        box(gp,0,0,0,len/n-0.08,0.64,0.025,glass);
      }
    }
    rod(g,[x1,y+0.9,z1],[x2,y+0.9,z2],0.042,gilt);
  }
  for(let level=1;level<=3;level++){
    const y=level*A.H;
    for(const side of [-1,1]){
      const front=level===1?(side===1?2.63:-3.35):level===2?-1.2:-4.1;
      const back=-11.4,mid=(front+back)/2;
      deck(fixed,side*(A.edge+3.49),y,mid,7,front-back);
      bal(fixed,side*(A.edge+0.03),front,side*11.5,front,y);
    }
    deck(fixed,0,y,-9.83,9.2,3.24);
    if(level!==3)bal(fixed,-A.edge,-8.17,A.edge,-8.17,y);
  }
  // Fluted pilasters and scalloped shopfronts face the light well.
  function pillar(x,z,top){
    box(fixed,x,top/2,z,0.67,top,0.67,peach);
    for(let i=-3;i<=3;i++)box(fixed,x+i*0.078,top/2,z+0.345,0.032,top-0.4,0.042,limestone);
    for(let k=0;k<4;k++){const y=k*A.H;box(fixed,x,y+0.18,z,0.84,0.36,0.82,limestone);box(fixed,x,y+0.37,z,0.83,0.038,0.8,gilt);}
  }
  for(const x of [-10.9,-4.75,4.9,10.9])pillar(x,-8.33,A.H*3+0.13);
  pillar(10.1,0.92,2*A.H);
  const shadePink=mat(0xbe7c68),shadeCream=mat(0xf0d8ae),shopDark=mat(0x334b41,0.13,0.42),
    packages=[0xbfa482,0xb37b64,0x95a594,0xd7bd92,0x889b9e].map(c=>mat(c,0.12,0.48));
  function boutique(x,z,w,base=0) {
    const g=group(fixed,x,base,z);box(g,0,1.7,-0.28,w,3.4,0.4,peach);
    arch(g,0,0.05,0,w-0.42,3.14,shopDark);archRim(g,0,0.05,0.135,w-0.42,3.14,0.047,gilt);
    box(g,0,0.29,0.3,w-0.6,0.50,0.6,forest);
    for(const h of [0.61,1.30]){box(g,0,h,0.22,w-0.54,0.065,0.43,oak);
      for(let i=0;i<5;i++){
        const a=0.22+random()*0.30, xx=(i-2)*(w-0.94)/5;
        if(i%2){ball(g,xx,h+a/2+0.04,0.25,0.11,a/2,0.11,packages[(i+1)%5]);cylinder(g,xx,h+a+0.04,0.25,0.062,0.066,0.08,gilt);}
        else {box(g,xx,h+a/2+0.04,0.26,a*1.36,a,0.24,packages[i]);box(g,xx,h+a/2+0.04,0.387,0.035,a,0.015,bright);}
      }
    }
    for(const q of [-0.25,0.25])box(g,w*q,1.31,0.53,0.036,2.5,0.04,gilt);
    const ns=13,sw=(w-0.14)/ns;
    for(let i=0;i<ns;i++){
      const xx=(i-(ns-1)/2)*sw,m=i%2?shadeCream:shadePink;
      const strip=box(g,xx,2.53,0.42,sw+0.003,0.052,0.94,m);strip.rotation.x=0.25;
      box(g,xx,2.35,0.869,sw,0.14,0.055,m);
      ball(g,xx,2.29,0.87,sw/2,0.13,0.027,m);
    }
  }
  boutique(-7.67,-5.8,4.9);boutique(-2.15,-8.65,4.2);boutique(7.7,-2.8,4.45);
  boutique(7.8,-8.62,4.6,A.H);boutique(-7.6,-9.65,4.4,A.H*2);
  // Large recessed arched windows have real mullions, reveals, sills and a distant skyline.
  const skyGlass=mat(0xc4e1df,0.18,0.16,{transparent:true,opacity:0.18,depthWrite:false});
  function windowBay(g,x,y,z,w,h){
    const r=w/2;
    arch(g,x,y,z,w,h,skyGlass,0.045);
    archRim(g,x,y,z+0.045,w,h,0.135,limestone);archRim(g,x,y,z+0.19,w-0.23,h-0.13,0.04,gilt);
    for(let i=-1;i<=1;i++){
      const xx=i*w/4,high=h-r+Math.sqrt(r*r-xx*xx);
      box(g,x+xx,y+high/2,z+0.12,0.048,high,0.065,bronze);
    }
    for(let yy=1.12;yy<h-r+0.1;yy+=1.35)box(g,x,y+yy,z+0.12,w,0.046,0.068,bronze);
    box(g,x,y-0.08,z,w+0.25,0.15,0.45,ivory);
  }
  for(let i=-2;i<=2;i++)windowBay(fixed,i*4.38,0.7,-11.64,4.15,A.H*3-0.9);
  const west=group(fixed,-11.2,0,-2.8);west.rotation.y=PI/2;
  for(let k=-1;k<=1;k++)windowBay(west,k*4.95,0.35,0,4.72,10.7);
  const skyline=[0xb9b4a4,0xcac8b8,0xe1c7ac,0xa7b8b7,0xd8bd9f].map(c=>mat(c));
  const roofs=[mat(0xa2705b),mat(0x74928a),mat(0x799098)];
  function city(g,x,z,w,d,h) {
    box(g,x,h/2-0.4,z,w,h,d,skyline[Math.floor(random()*5)]);
    const y=h-0.4;
    box(g,x,y-0.1,z,w+0.15,0.22,d+0.16,ivory);
    const s=new T.Shape();s.moveTo(-w/2-0.12,0);s.lineTo(0,0.65+w*0.07);s.lineTo(w/2+0.12,0);s.closePath();
    shape(g,s,d+0.18,roofs[Math.floor(random()*3)],x,y,z-d/2-0.09);
    for(let row=1;row<h/1.5-0.6;row++)for(let col=0;col<Math.floor(w/1.1);col++){
      box(g,x-w/2+0.62+col*1.05,row*1.4,z+d/2+0.017,0.48,0.68,0.035,green);
    }
    box(g,x+0.3,y+0.75,z+0.2,0.43,1.25,0.45,skyline[0]);
  }
  for(let i=-7;i<=7;i++){city(fixed,i*3.8,-18-random()*8,2.2+random()*1.3,3+random()*2,4+random()*5);city(fixed,i*5.6,-35-random()*7,4,4,7+random()*6);}
  const westCity=group(fixed,-20,0,-2);westCity.rotation.y=PI/2;for(let i=-4;i<=4;i++)city(westCity,i*4,-2,3.4,4,4+random()*5);
  const plaques=[],treads=[],targets=[],toys=[],leafPivots=[],lampPivots=[],birdPivots=[],doors=[],ripples=[];
  const accents=[0x699478,0xcaa467,0x84a9b0,0xca917a];
  function emblem(g,id,r,m) {
    const a=group(g);a.scale.setScalar(r);
    if(id===0){
      const s=new T.Shape();s.moveTo(-0.43,-0.42);s.bezierCurveTo(-0.98,0.38,-0.12,0.71,0.64,0.76);
      s.bezierCurveTo(0.7,-0.07,0.26,-0.68,-0.43,-0.42);shape(a,s,0.038,m);
      rod(a,[-0.56,-0.67,0.06],[0.37,0.47,0.06],0.044,forest);
      rod(a,[-0.05,-0.05,0.06],[-0.1,0.3,0.06],0.029,forest);
      rod(a,[-0.24,-0.27,0.06],[0.13,-0.21,0.06],0.025,forest);
    }else if(id===1){
      rod(a,[0,0.71,0],[0,0.45,0],0.05,m);
      panel(a,[[-0.23,0.43],[0.23,0.43],[0.61,-0.21],[-0.61,-0.21]],0.05,m,0);
      ball(a,0,-0.28,0,0.28,0.24,0.055,m);
    }else if(id===2){
      ball(a,0,0,0,0.35,0.35,0.06,m);
      for(let i=0;i<8;i++){let ang=i*PI/4;rod(a,[0.49*Math.cos(ang),0.49*Math.sin(ang),0],[0.73*Math.cos(ang),0.73*Math.sin(ang),0],0.04,m);}
    }else{archRim(a,0,-0.56,0,1.02,1.25,0.066,m);rod(a,[-0.5,0.14,0],[0.5,0.14,0],0.047,m);rod(a,[0,0.14,0],[0,-0.55,0],0.047,m);}
    return a;
  }
  function roundSign(g,x,y,z,id,bank) {
    const post=group(g,x,y,z);
    cylinder(post,0,0.38,0,0.045,0.065,0.74,gilt);cylinder(post,0,0.06,0,0.12,0.16,0.12,bright);
    const head=group(post,0,0.80,0);head.rotation.y=-g.rotation.y-0.50*(Math.floor(bank/2)%2?-1:1)*(bank%2?-1:1);
    const disc=(r,dep,m,zz)=>{const o=cylinder(head,0,0,zz,r,r,dep,m,48);o.rotation.x=PI/2;};
    const face=mat(accents[id],0.3,0.23,{emissive:accents[id],emissiveIntensity:0.10});
    disc(0.335,0.12,bright,0);disc(0.307,0.14,forest,0.015);disc(0.27,0.035,face,0.09);
    ring(head,0,0,0.116,0.263,0.009,bright,true);const icon=group(head,0,0,0.125);emblem(icon,id,0.249,opal);
    plaques.push({bank,face,head});targets[bank]=head;
  }
  function flight(bank){
    const side=bank%2,level=Math.floor(bank/2),sign=level%2?-1:1;
    const origin=group(fixed,0,level*A.H,A.lane[level]-side*1.46);origin.rotation.y=sign<0?PI:0;
    const lo=-A.edge,hi=A.edge,L=-A.run/2,R=A.run/2,H=A.H;
    const baseline=[[lo,0],[L,0],[R,H],[hi,H]];
    function strip(z,bot,top,depth,m,ends=0){
      const pts=baseline.map(([x,y],i)=>[x+(i===0?ends:i===3?-ends:0),y+top]);
      pts.push(...baseline.slice().reverse().map(([x,y],i)=>[x+(i===0?-ends:i===3?ends:0),y+bot]));
      return panel(origin,pts,depth,m,z);
    }
    strip(-0.683,-0.42,-0.115,1.366,steel);strip(-0.692,-0.35,-0.23,1.384,enamel);
    strip(-0.698,-0.36,-0.345,1.396,bright);
    for(const z of [-0.64,0.64]){
      strip(z-0.049,-0.25,0.078,0.098,steel);
      strip(z-0.053,0.065,0.098,0.106,bright);
      const s=new T.Shape();s.moveTo(lo-0.04,0.08);s.lineTo(L,0.08);s.lineTo(R,H+0.08);s.lineTo(hi+0.03,H+0.08);
      s.bezierCurveTo(hi+0.55,H+0.12,hi+0.48,H+0.88,hi-0.02,H+0.88);
      s.lineTo(R-0.04,H+0.88);s.lineTo(L-0.06,0.88);s.lineTo(lo+0.02,0.88);
      s.bezierCurveTo(lo-0.47,0.88,lo-0.51,0.14,lo-0.04,0.08);
      shape(origin,s,0.048,glass,0,0,z-0.024);
      const hand=[[lo+0.02,0.095,z],[lo-0.24,0.20,z],[lo-0.346,0.47,z],[lo-0.27,0.73,z],[lo-0.10,0.865,z],[lo+0.12,0.89,z],
        [L-0.13,0.89,z],[L+0.17,0.976,z],[R-0.17,H+0.802,z],[R+0.12,H+0.89,z],[hi-0.02,H+0.89,z],
        [hi+0.22,H+0.80,z],[hi+0.34,H+0.55,z],[hi+0.29,H+0.29,z],[hi+0.03,H+0.092,z]];
      tube(origin,hand.map(([x,y,z])=>[x,y-0.047,z]),0.050,gilt,90);tube(origin,hand,0.059,rubber,100);
      for(let i=0;i<8;i++){
        const x=L+0.22+i*(A.run-0.44)/7, y=(x-L)*H/A.run;
        rod(origin,[x,y+0.08,z],[x,y+0.85,z],0.014,steel);
        for(const yy of [0.18,0.70])ball(origin,x,y+yy,z+0.031,0.021,0.021,0.011,gilt);
      }
    }
    for(const e of [-1,1]){
      const x=e*A.edge,y=e<0?0:H;
      box(origin,x+e*0.36,y+0.01,0,0.85,0.039,1.26,steel);
      for(let i=-20;i<=20;i++)box(origin,x+e*0.32,y+0.034,i*0.029,0.6,0.005,0.009,bronze);
      box(origin,x+e*0.07,y+0.037,0,0.095,0.012,1.19,bright);
    }
    const entry=side===0?-1:1;
    const entryY=entry<0?0:H;
    const arrowMat=mat(side===0?accents[level]:accents[3],0.22,0.27,{emissive:side===0?accents[level]:accents[3],emissiveIntensity:0.6});
    for(const k of [0,1]){
      const arrowX=entry*(A.edge+0.44+k*0.18);
      for(const left of [-1,1])rod(origin,[arrowX+entry*0.08,entryY+0.049,left*0.145],[arrowX-entry*0.025,entryY+0.049,0],0.014,arrowMat);
    }
    const id=side===0?level:3;
    roundSign(origin,side===0?lo-0.32:hi+0.32,(side===0?0:H)+0.03,(sign>0?1:-1)*0.85,id,bank);
    const mobile=group(scene,origin.position.x,origin.position.y,origin.position.z);mobile.rotation.y=origin.rotation.y;
    treads.push(mobile);
  }
  for(let b=0;b<6;b++)flight(b);
  const treadMat=mat(0x8d9690,0.67,0.44,{map:machined,bumpMap:machined,bumpScale:0.006});
  const treadGeo=new T.BoxGeometry(0.4,0.232,1.165);
  const uv=treadGeo.attributes.uv;for(let i=0;i<8;i++){const a=uv.getX(i);uv.setXY(i,uv.getY(i),a);}
  treads.forEach(g=>{
    g.steps=new T.InstancedMesh(treadGeo,treadMat,A.count);g.noses=new T.InstancedMesh(cube,bright,A.count);
    [g.steps,g.noses].forEach(o=>{o.frustumCulled=false;o.receiveShadow=true;g.add(o);o.instanceMatrix.setUsage(T.DynamicDrawUsage);});
  });
  // Pressed brass planters, hand-shaped leaf blades and branching stems.
  function pot(g,x,y,z,r,h,m=celadon){
    cylinder(g,x,y+h*0.53,z,r,r*0.75,h*0.88,m);
    cylinder(g,x,y+h*0.12,z,r*0.76,r*0.67,h*0.22,gilt);
    [0.91,0.985].forEach(k=>ring(g,x,y+h*k,z,r*(k===0.91?0.99:1.005),r*0.029,bright));
    cylinder(g,x,y+h*0.973,z,r*0.955,r*0.955,0.035,soil);
    for(let j=0;j<32;j++){const a=2*PI*j/32;
      rod(g,[x+r*0.78*Math.cos(a),y+h*0.18,z+r*0.78*Math.sin(a)],[x+r*0.985*Math.cos(a),y+h*0.91,z+r*0.985*Math.sin(a)],r*0.012,m);}
  }
  const blade=new T.BufferGeometry();
  blade.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-0.48,0.33,0.055,0,0.37,0.22,0.49,0.36,0.02,-0.36,0.68,-0.02,0,0.73,0.13,0.32,0.7,0,0,1,-0.12],3));
  blade.setIndex([0,2,1,0,3,2,1,2,4,2,5,4,2,3,6,2,6,5,4,5,7,5,6,7]);blade.computeVertexNormals();
  function palm(x,y,z,size,animated=false){
    const potGroup=group(fixed,x,y,z);potGroup.scale.setScalar(size);pot(potGroup,0,0,0,0.49,0.65,forest);
    for(let i=0;i<11;i++){
      const a=i*2.4+random()*0.3, reach=0.5+random()*0.48,h=1.04+random()*0.76;
      const par=animated&&i<4?scene:fixed;
      const pivot=group(par,x,y+0.60*size,z);pivot.rotation.y=a;pivot.scale.setScalar(size);
      if(par===scene)leafPivots.push(pivot);
      const curve=new T.QuadraticBezierCurve3(V(0,0,0),V(0,h*1.16,reach*0.37),V(0,h*0.85,reach));
      mesh(pivot,new T.TubeGeometry(curve,14,0.012,6,false),leafM[0],0,0,0);
      for(let k=1;k<=11;k++){const u=k/12,p=curve.getPoint(u),l=(0.11+Math.sin(u*PI)*0.37)*(0.80+random()*0.3);
        for(const sign of [-1,1]){
          const o=mesh(pivot,blade,leafM[(i+k)%6],p.x,p.y,p.z,l*0.30,l,l*0.43);
          o.rotation.set(0.61+u*0.72,sign*0.24,-sign*(0.8+u*0.84));
        }
      }
      if(par===scene)pack(pivot);
    }
  }
  palm(-7.88,0,1.45,1.16,true);palm(7.48,0,3.0,1.02);palm(-5.9,A.H,-5.4,0.9);palm(-7.7,0,-4.55,0.74);
  function tree(x,y,z,scale){
    const g=group(fixed,x,y,z);g.scale.setScalar(scale);pot(g,0,0,0,0.59,0.70,celadon);
    tube(g,[[0,0.62,0],[0.06,1.15,0],[-0.03,1.65,0.07],[0.1,2.22,0]],0.073,oak);
    for(let i=0;i<14;i++){
      const a=i*2.399,rad=0.34+0.40*random(),xx=rad*Math.cos(a),zz=rad*Math.sin(a),h=1.9+random()*0.9;
      tube(g,[[0.015,1.18+i*0.035,0],[xx*0.60,h-0.35,zz*0.54],[xx,h,zz]],0.026,oak,12);
      const pivot=group(scene,x+scale*xx,y+scale*h,z+scale*zz);pivot.scale.setScalar(scale);leafPivots.push(pivot);
      for(let k=0;k<6;k++){
        const t=k*1.9+i,ex=0.32*Math.cos(t),ez=0.32*Math.sin(t),ey=0.14+0.21*random();
        rod(pivot,[0,-0.05,0],[ex,ey,ez],0.008,oak);
        for(let j=0;j<7;j++){
          const u=(j+1)/8,dir=j%2?1:-1;
          const l=mesh(pivot,blade,leafM[(i+j+k)%6],ex*u,ey*u,ez*u,0.08+random()*0.07,0.16+random()*0.06,0.08);
          l.rotation.set(dir*(0.4+random()),-t,dir*(0.69+random()*0.54));
        }
      }pack(pivot);
    }
  }
  tree(6.55,A.H,-0.48,1.08);
  const bench=group(fixed,7.55,A.H,-1.9);bench.rotation.y=-0.54;
  for(const side of [-1,1]){
    box(bench,side*0.83,0.24,0,0.18,0.48,0.52,limestone);
    rod(bench,[side*0.88,0.16,-0.18],[side*0.88,0.93,-0.27],0.028,gilt);
  }
  for(let i=0;i<5;i++)box(bench,0,0.50,i*0.108-0.22,2.05,0.068,0.093,oak);
  for(let i=0;i<3;i++)box(bench,0,0.66+i*0.10,-0.25,2.04,0.085,0.045,oak);
  const bowl=group(fixed,6.01,A.H,1.40);
  cylinder(bowl,0,0.085,0,0.45,0.54,0.17,limestone);cylinder(bowl,0,0.34,0,0.22,0.3,0.43,celadon);
  cylinder(bowl,0,0.6,0,0.62,0.25,0.24,green);ring(bowl,0,0.727,0,0.604,0.035,bright);
  const waterMat=mat(0x71ac9d,0.55,0.09);cylinder(bowl,0,0.718,0,0.583,0.583,0.016,waterMat);
  tube(bowl,[[-0.48,0.7,-0.08],[-0.52,1.07,-0.08],[-0.41,1.18,-0.08],[-0.27,1.12,-0.08]],0.025,bright);
  const stream=group(scene,5.74,A.H+0.73,1.32);
  const wet=mat(0xbce4d8,0.4,0.09,{transparent:true,opacity:0.77});
  cylinder(stream,0,0.19,0,0.014,0.01,0.38,wet);
  for(let i=0;i<5;i++){
    const a=i*0.52+2.0;
    const p=group(scene,6.01+0.39*Math.cos(a),A.H+0.738,1.4+0.39*Math.sin(a));p.rotation.y=-a;
    const leaf=mesh(p,blade,leafM[(i+1)%6],0,0,0,0.095,0.26+i*0.013,0.12);
    leaf.rotation.z=0.66+i*0.08;leafPivots.push(p);
  }
  const jetMesh=new T.InstancedMesh(cyl,wet,40);jetMesh.frustumCulled=false;scene.add(jetMesh);
  const nozzle=mat(0xa6b99d,0.48,0.21);
  cylinder(bowl,0,0.756,0,0.103,0.139,0.097,nozzle);
  for(let j=0;j<5;j++){
    const a=j*2*PI/5;ball(bowl,0.082*Math.cos(a),0.795,0.082*Math.sin(a),0.025,0.035,0.025,bright);
  }
  const waterGeo=new T.CircleGeometry(0.569,80,0,2*PI);waterGeo.rotateX(-PI/2);
  const surface=mesh(scene,waterGeo,waterMat,6.01,A.H+0.731,1.4);
  for(let j=0;j<3;j++)ripples.push(ring(scene,5.81+j*0.05,A.H+0.737,1.35,0.11+j*0.105,0.006,wet));
  toys[0]=V(6.01,A.H+0.86,1.40);
  // The lamp gallery's nine floating opal shades hang in an arc from a bronze crown.
  const chandelier=group(fixed,-7.16,2*A.H,-3.64);
  cylinder(chandelier,0,0.11,0,0.62,0.73,0.22,limestone);
  cylinder(chandelier,0,1.5,0,0.043,0.077,2.72,gilt);
  ring(chandelier,0,2.84,0,0.91,0.041,gilt);ball(chandelier,0,2.91,0,0.11,0.13,0.11,bright);
  for(let i=0;i<9;i++){
    const a=i*PI*2/9,x=Math.cos(a)*0.9,z=Math.sin(a)*0.9;
    rod(chandelier,[0,2.90,0],[x,2.84,z],0.019,gilt);
    const top=group(scene,-7.16+x,2*A.H+2.83,-3.64+z);
    const l=0.31+(i%3)*0.28+0.1*(i%2);
    rod(top,[0,0,0],[0,-l,0],0.009,bronze);
    const m=mat(0xffdfa2,0.12,0.21,{emissive:0xffc176,emissiveIntensity:0.68});
    ball(top,0,-l-0.17,0,0.166,0.22,0.166,m);cylinder(top,0,-l,0,0.073,0.107,0.089,gilt);
    ring(top,0,-l-0.18,0,0.165,0.009,gilt);ball(top,0,-l-0.39,0,0.043,0.06,0.043,gilt);
    lampPivots.push({top,m});
  }toys[1]=V(-7.16,2*A.H+2.04,-3.64);
  // Rooftop garden and six folded copper swallows on a wind wheel.
  const roof=3*A.H,rotor=group(scene,6.54,roof+2.20,-5.65);
  cylinder(fixed,6.54,roof+0.21,-5.65,0.46,0.59,0.42,limestone);
  cylinder(fixed,6.54,roof+1.32,-5.65,0.054,0.085,1.9,gilt);
  ball(rotor,0,0,0,0.16,0.14,0.16,bright);
  for(let i=0;i<6;i++){
    const arm=group(rotor);arm.rotation.y=i*PI/3;rod(arm,[0,0,0],[1.0,0.08,0],0.018,gilt);
    const bird=group(arm,1.03,0.10,0);birdPivots.push(bird);
    ball(bird,0,0,0,0.083,0.082,0.24,i%2?pink:ivory);ball(bird,0,0.065,0.15,0.069,0.076,0.085,forest);
    const beak=mesh(bird,cached('beak',()=>new T.ConeGeometry(0.034,0.10,8)),bright,0,0.055,0.26);beak.rotation.x=PI/2;
    for(const side of [-1,1]){
      const s=new T.Shape();s.moveTo(0,0.1);s.quadraticCurveTo(side*0.18,0.14,side*0.42,0.33);s.quadraticCurveTo(side*0.27,0.03,0,-0.10);
      const wing=shape(bird,s,0.022,i%2?ivory:green);wing.rotation.x=-0.98;
    }
  }toys[2]=V(6.54,roof+2.20,-5.65);
  for(let i=0;i<4;i++)palm(i%2?8.2:-8.2,roof,-7.4-(i>1?2:0),0.68+i*0.06);
  // Ground-floor entrance. The leaves slide on separate tracks into brass pockets.
  const gate=group(fixed,-6.70,0,-0.32);
  const surround=new T.Shape();
  surround.moveTo(-1.78,0);surround.lineTo(-1.78,3.63);surround.lineTo(1.78,3.63);surround.lineTo(1.78,0);
  surround.lineTo(1.39,0);surround.lineTo(1.39,1.96);surround.absarc(0,1.96,1.39,0,PI,false);surround.lineTo(-1.39,0);surround.closePath();
  shape(gate,surround,0.36,limestone,0,0,-0.38);
  box(gate,0,3.63,-0.18,3.72,0.14,0.57,ivory);
  for(const side of [-1,1]){
    box(gate,side*1.60,1.55,0,0.15,3.08,0.14,forest);
    ball(gate,side*1.63,1.90,0.11,0.102,0.18,0.112,opal);
  }
  archRim(gate,0,0,0.02,2.78,3.35,0.095,gilt);
  box(gate,0,2.13,0.03,2.66,0.082,0.12,forest);
  for(let i=0;i<9;i++){
    const angle=(i+0.5)*PI/9;rod(gate,[0,2.12,0.025],[Math.cos(angle)*1.23,2.12+Math.sin(angle)*1.13,0.025],0.017,gilt);
  }
  for(let i=0;i<2;i++){
    const g=group(scene,-6.70+(i?1:-1)*0.64,0,-0.28-i*0.052);doors.push(g);
    box(g,0,1.04,0,1.25,2.05,0.045,glass);
    for(const x of [-0.62,0.62])box(g,x,1.04,0,0.048,2.07,0.066,gilt);
    for(const y of [0.13,0.65,2.045])box(g,0,y,0,1.26,y===0.13?0.24:0.048,0.068,gilt);
    rod(g,[i?-0.48:0.48,0.90,0.065],[i?-0.48:0.48,1.29,0.065],0.022,gilt);
  }toys[3]=V(-6.7,1.32,-0.28);
  // Street and gallery globe lamps give the atrium a consistent human scale.
  function lampPost(x,y,z,h){
    cylinder(fixed,x,y+0.08,z,0.13,0.19,0.16,gilt);cylinder(fixed,x,y+h/2,z,0.034,0.058,h,gilt);
    cylinder(fixed,x,y+h-0.03,z,0.11,0.065,0.10,bronze);
    ball(fixed,x,y+h+0.15,z,0.183,0.195,0.183,opal);ball(fixed,x,y+h+0.358,z,0.041,0.038,0.041,gilt);
  }
  lampPost(8.8,A.H,2.39,1.48);lampPost(-4.88,A.H*2,-1.53,1.36);lampPost(-8.6,0,0.94,2.02);
  for(let i=0;i<4;i++)lampPost(-8.8+i*5.65,A.H,-8.25,1.28);
  // Art Deco sunbursts set into the gallery fascia, and reeded pilasters at the window side.
  for(let i=0;i<3;i++){
    const x=5.65+i*2.19;const g=group(fixed,x,A.H-0.273,2.65);
    for(let j=-2;j<=2;j++)rod(g,[j*0.018,-0.065,0],[j*0.083,0.066-Math.abs(j)*0.022,0],0.009,gilt);
    rod(g,[-0.94,0,0],[-0.23,0,0],0.009,gilt);rod(g,[0.23,0,0],[0.94,0,0],0.009,gilt);
  }
  const dustMat=mat(0xffedba,0.1,0.45,{emissive:0xffe9bf,emissiveIntensity:0.3,transparent:true,opacity:0.51});
  const motes=new T.InstancedMesh(sphere,dustMat,28);motes.frustumCulled=false;scene.add(motes);
  pack(fixed);scene.updateMatrixWorld(true);
  const targetPoints=targets.map(t=>t.getWorldPosition(V(0,0,0)));
  const mark=new T.Object3D();
  function stamp(o,i,x,y,z,sx=1,sy=1,sz=1){
    mark.position.set(x,y,z);mark.scale.set(sx,sy,sz);mark.updateMatrix();o.setMatrixAt(i,mark.matrix);
  }
  let shadowTime=-1;
  function update(s){
    if(s.time-shadowTime>=(s.phase==='gallery'?1/20:0.25)){sun.shadow.needsUpdate=true;shadowTime=s.time;}
    treads.forEach((g,b)=>{
      const motor=s.banks[b];if(g.last===motor.travel && !motor.speed && g.settled)return;
      g.settled=!motor.flex.some(c=>Math.abs(c.v)>0.00002);
      let n=0;
      for(let i=0;i<A.count;i++){
        const d=A.wrap(i*A.pitch+motor.travel,A.circuit);
        if(d>A.length)continue; // The concealed return strand is inside the truss.
        const p=A.point(b,d),sign=Math.floor(b/2)%2?-1:1;
        const x=p.x*sign,y=p.y-Math.floor(b/2)*A.H+motor.flex[i].y;
        const width=(d>A.flat&&d<A.flat+A.slope?A.run/A.slope:1)*A.pitch;
        stamp(g.steps,n,x,y-0.122,0,(width-0.002)/0.4,1,1);
        stamp(g.noses,n,x-width/2+0.012,y-0.005,0,0.019,0.010,1.155);n++;
      }g.steps.count=g.noses.count=n;g.steps.instanceMatrix.needsUpdate=g.noses.instanceMatrix.needsUpdate=true;g.last=motor.travel;
    });
    plaques.forEach(p=>{p.face.emissiveIntensity=0.02+0.95*s.banks[p.bank].filament;});
    leafPivots.forEach((p,i)=>{p.rotation.z=s.leaves[i].angle;p.rotation.x=s.leaves[i].wet*0.24;});
    const pos=waterGeo.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,s.water[i===0?2:Math.floor((i-1)/4)%20].h);pos.needsUpdate=true;waterGeo.computeVertexNormals();
    const swell=s.pressure;stream.scale.set(0.78+swell,1,0.78+swell);
    ripples.forEach((r,i)=>{r.scale.setScalar((0.11+i*0.105)*(1+6*s.water[i+2].h));r.position.y=A.H+0.738+s.water[2+i].h;});
    const nozzleBase=V(6.01,A.H+0.80,1.40),up=V(0,1,0),segment=new T.Object3D();
    s.jets.forEach((sections,j)=>{
      const angle=j*2*PI/5,dx=Math.cos(angle),dz=Math.sin(angle);let before;
      sections.forEach((speed,k)=>{
        const t=k/(sections.length-1)*(speed+Math.sqrt(speed*speed+2*9.81*0.068))/9.81;
        const dist=0.082+t*(0.42+0.019*j);
        const next=V(nozzleBase.x+dx*dist,nozzleBase.y+speed*t-0.5*9.81*t*t,nozzleBase.z+dz*dist);
        if(k){
          const dir=next.clone().sub(before),r=0.006+0.0027*speed;
          segment.position.copy(before).lerp(next,0.5);segment.scale.set(r,dir.length()+0.004,r);
          segment.quaternion.setFromUnitVectors(up,dir.normalize());segment.updateMatrix();jetMesh.setMatrixAt(j*8+k-1,segment.matrix);
        }before=next;
      });
    });jetMesh.instanceMatrix.needsUpdate=true;
    lampPivots.forEach((l,i)=>{l.top.rotation.z=s.lamps[i].angle;l.m.emissiveIntensity=0.15+1.85*s.lamps[i].heat;});
    rotor.rotation.y=s.rotor;birdPivots.forEach((p,i)=>{p.rotation.z=s.wings[i].angle;});
    doors.forEach((p,i)=>p.position.x=-6.70+(i?1:-1)*(0.64+s.door[i].x));
    s.dust.forEach((p,i)=>{const r=0.003+i%4*0.001;stamp(motes,i,p.x-1,p.y+(i%3)*A.H,p.z-0.22,r,r,r);});motes.instanceMatrix.needsUpdate=true;
  }
  // Capture the actual galleries once per stop so brass, wet stone and glazing reflect nearby fittings.
  const reflections=[],capture=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
  const cubeEye=new T.CubeCamera(0.12,80,capture);
  const probePositions=[V(-1.65,2.04,2.92),V(4.92,A.H+1.38,-0.65),V(-5.05,2*A.H+1.62,-3.0),V(5.21,3*A.H+1.32,-6.57)];
  let activeReflection=-1;
  function reflect(stage){
    if(activeReflection===stage)return;
    if(!reflections[stage]){
      scene.environment=probe.texture;cubeEye.position.copy(probePositions[stage]);cubeEye.updateMatrixWorld();
      cubeEye.update(renderer,scene);
      const filter=new T.PMREMGenerator(renderer);reflections[stage]=filter.fromCubemap(capture.texture);filter.dispose();
    }
    scene.environment=reflections[stage].texture;activeReflection=stage;
  }
  const foliageTargets=leafPivots.map((p,i)=>p.position.clone().add(V(0,i<4?1.12:0.16,0)));
  return {update,reflect,targets:targetPoints,toys,foliageTargets};
}
