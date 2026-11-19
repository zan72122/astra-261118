'use strict';
function buildLandscape(scene,game){
  const {T,V,TAU,rng,range,texture,mat,group,mesh,box,ell,cyl,rod,tor,tube,buffer,batch,inst}=Craft;
  const {NX,NZ,CELL,X0,Z0}=GardenPhysics;
  const fieldBytes=new Uint8Array(NX*NZ*4),field=new T.DataTexture(fieldBytes,NX,NZ);
  field.magFilter=field.minFilter=T.LinearFilter;field.needsUpdate=true;
  const sky=mesh(scene,new T.SphereGeometry(60,48,24),mat(0xffffff,1,0,{side:T.BackSide,depthWrite:false,fog:false}));
  sky.castShadow=sky.receiveShadow=false;sky.renderOrder=-20;
  const skyUniform={value:0};sky.material.onBeforeCompile=sh=>{
    sh.uniforms.evening=skyUniform;
    sh.vertexShader='varying vec3 skyDir;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nskyDir=position;');
    sh.fragmentShader='varying vec3 skyDir;uniform float evening;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 dir=normalize(skyDir);float elev=max(0.,dir.y);
      vec3 day=mix(vec3(.82,.90,.79),vec3(.32,.59,.71),smoothstep(-.04,.53,elev));
      vec3 dusk=mix(vec3(1.05,.61,.33),vec3(.40,.42,.58),smoothstep(-.06,.47,elev));
      float glow=pow(max(0.,dot(dir,normalize(vec3(-.54,.41,-.85)))),9.);
      outgoingLight=mix(day,dusk,evening)+vec3(.30,.22,.10)*glow;
      #include <opaque_fragment>`);
  };
  // Small and large spatial frequencies are fixed in soil coordinates.
  const hash=(i,j)=>{const n=Math.sin(i*127.1+j*311.7)*43758.5453;return n-Math.floor(n);};
  function noise(x,y){
    let ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
    u=u*u*(3-2*u);v=v*v*(3-2*v);
    return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;
  }
  const meadowTex=texture(512,(ctx,n)=>{
    const data=ctx.createImageData(n,n),p=data.data;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const grain=rng(), dry=.52*noise(x/50,y/50)+.28*noise(x/18,y/18)+.20*noise(x/5,y/5);
      const i=(y*n+x)*4;
      p[i]=67+dry*68+grain*36;p[i+1]=83+dry*48+grain*36;p[i+2]=46+dry*38+grain*25;p[i+3]=255;
    }ctx.putImageData(data,0,0);
    for(let i=0;i<16000;i++){
      const x=rng()*n,y=rng()*n,sz=range(1,5);ctx.strokeStyle=i%3?'rgba(192,185,121,.34)':'rgba(39,62,38,.32)';
      ctx.lineWidth=range(.4,1.1);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+range(-3,3),y-sz);ctx.stroke();
    }
  },1,true);
  const groundMat=mat(0xd8d7be,.96,0,{map:meadowTex});
  function gardenShader(m,blades){
    m.onBeforeCompile=sh=>{
      sh.uniforms.groundField={value:field};
      const pre='uniform sampler2D groundField;varying vec2 gardenUv;\n';
      sh.vertexShader=pre+(blades?'attribute float flex;':'')+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        gardenUv=(position.xz-vec2(${X0},${Z0}))/vec2(${NX*CELL},${NZ*CELL});
        ${blades?'float bend=(texture2D(groundField,gardenUv).b-.5)*2.;transformed.x+=bend*flex;transformed.z+=bend*flex*.20;':''}
      `);
      sh.fragmentShader=pre+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec4 local=texture2D(groundField,gardenUv);
        diffuseColor.rgb*=mix(vec3(1.),vec3(.45,.55,.53),local.r);
        ${blades?'diffuseColor.rgb+=vec3(.05,.067,.055)*local.g;':''}`)
        .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.17,texture2D(groundField,gardenUv).r);');
    };
    m.customProgramCacheKey=()=>blades?'blade':'sod';
  }
  gardenShader(groundMat,false);
  const ground=mesh(scene,buffer([-26,-.016,-24,-26,-.016,15,26,-.016,15,26,-.016,-24],null,[0,0,0,15.6,20.8,15.6,20.8,0],[0,1,2,0,2,3]),groundMat);
  ground.castShadow=false;
  const h=game.layout.head,p=game.layout.pot;
  const turf={pos:[],col:[],uv:[],idx:[],flex:[]};
  const greenLo=new T.Color(0x576d48),greenHi=new T.Color(0xb1b47b),green=new T.Color();
  function blade(x,z,height,w,dx,dz,c,base=0){
    let k=turf.pos.length/3,theta=range(0,TAU),wx=Math.cos(theta)*w,wz=Math.sin(theta)*w;
    turf.pos.push(x-wx,base,z-wz,x+wx,base,z+wz,x+dx*.40-wx*.66,base+height*.62,z+dz*.4-wz*.66,
      x+dx*.40+wx*.66,base+height*.62,z+dz*.4+wz*.66,x+dx,base+height,z+dz);
    for(const v of [.76,.78,.95,1,1.17])turf.col.push(c.r*v,c.g*v,c.b*v);
    turf.uv.push(0,0,1,0,0,.62,1,.62,.5,1);turf.idx.push(k,k+2,k+1,k+1,k+2,k+3,k+2,k+4,k+3);turf.flex.push(0,0,height*.22,height*.22,height*.85);
  }
  for(let i=0;i<8100;i++){
    const x=range(-7.5,7.5),z=range(-3.5,6),nr=noise(x*1.4+14,z*1.4+8);
    const clear=Math.min(1,.53+.38*Math.hypot(x-h.x,z-h.z));
    const tall=range(.050,.135)*clear*(.65+nr*.70);
    green.copy(greenLo).lerp(greenHi,range(.0,.69)+nr*.25);
    for(let j=0;j<5;j++){const a=rng()*TAU,reach=tall*range(.28,.75);
      blade(x+range(-.037,.037),z+range(-.034,.034),tall*range(.7,1.35),range(.005,.012),Math.cos(a)*reach,Math.sin(a)*reach,green);}
  }
  const grassGeo=buffer(turf.pos,turf.col,turf.uv,turf.idx);
  grassGeo.setAttribute('flex',new T.Float32BufferAttribute(turf.flex,1));
  const grasses=mat(0xffffff,.86,0,{vertexColors:true,side:T.DoubleSide});gardenShader(grasses,true);
  const lawn=mesh(scene,grassGeo,grasses);lawn.castShadow=false;
  const back=group(scene),plants=group(scene),stoneMat=[mat(0xadad95,.91),mat(0xbdb9a2,.9),mat(0xaca895,.94)],soilMat=mat(0x877056,.96);
  gardenShader(soilMat,false);
  function stone(x,z,rx,rz,height,m){
    const n=10,pos=[],uv=[],idx=[],rad=[];
    for(let k=0;k<n;k++)rad.push(range(.86,1.07));
    for(let ring=0;ring<3;ring++)for(let k=0;k<n;k++){
      const a=TAU*k/n,rr=rad[k]*[.94,1,.88][ring],xx=Math.cos(a)*rx*rr,zz=Math.sin(a)*rz*rr;
      pos.push(x+xx,[-.012,height*.64,height][ring]+rng()*.006,z+zz);uv.push(xx,zz);
    }
    pos.push(x,height+.008,z);uv.push(0,0);
    for(let k=0;k<n;k++){const j=(k+1)%n;for(let r=0;r<2;r++){const a=r*n;idx.push(a+k,a+n+k,a+j,a+j,a+n+k,a+n+j);}idx.push(n*2+k,n*3,n*2+j);}
    return mesh(back,buffer(pos,null,uv,idx),m);
  }
  stone(p.x,p.z,.83,.75,.032,soilMat);
  for(let i=0;i<8;i++){
    const x=-3.25+Math.sin(i*.81)*.21,z=2.0-i*.68;
    stone(x,z,range(.37,.54),range(.24,.32),range(.045,.07),stoneMat[i%3]);
  }
  stone(p.x-.48,p.z+.48,.28,.22,.049,stoneMat[1]);stone(p.x+.40,p.z-.39,.32,.20,.047,stoneMat[2]);
  for(let i=0;i<70;i++){const a=rng()*TAU,rr=range(.55,.87);stone(p.x+Math.cos(a)*rr,p.z+Math.sin(a)*rr,range(.019,.050),range(.015,.045),range(.013,.03),stoneMat[i%3]);}
  // Silvered timber palings, rails, grain and nail heads.
  const woodTex=texture(256,(c,n)=>{
    c.fillStyle='#e0dbcb';c.fillRect(0,0,n,n);
    for(let i=0;i<920;i++){
      let x=rng()*n,y=rng()*n,len=range(4,130);
      c.strokeStyle=i%4?'rgba(80,81,63,.082)':'rgba(255,249,222,.27)';c.lineWidth=range(.4,2.1);
      c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+1.5,y+len*.3,x-2,y+len*.5,x,y+len);c.stroke();
    }for(let i=0;i<4;i++){let x=rng()*n,y=rng()*n;c.strokeStyle='rgba(84,85,68,.18)';for(let j=1;j<4;j++){c.beginPath();c.ellipse(x,y,1.5*j,4*j,.07,0,TAU);c.stroke();}}
  },1,true);
  const timber=[0xa3ac94,0x99a590,0xaab09a,0x9eaa98,0xb0b7a2].map(c=>mat(c,.88,0,{map:woodTex,bumpMap:woodTex,bumpScale:.012}));
  const zFence=-3.07, nail=mat(0x667268,.57,.5);
  for(let i=-35;i<=35;i++){
    const x=i*.322,z=zFence+range(-.038,.038),gate=x<-2.32&&x>-4.13;
    const height=gate?1.13+.13*Math.pow(Math.abs(x+3.2),2):1.40+.065*Math.sin(x*1.1)+range(-.040,.040);
    const w=gate?.253:range(.292,.313),m=timber[(rng()*timber.length)|0];
    const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,height-.085);
    shape.lineTo(w*.29,height-.022);shape.lineTo(0,height);shape.lineTo(-w*.29,height-.022);shape.lineTo(-w/2,height-.085);shape.closePath();
    const o=mesh(back,new T.ExtrudeGeometry(shape,{depth:.067,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.009,bevelThickness:.009}),m,x,.006,z);o.rotation.z=range(-.013,.013);
    if(i%2===0)for(const y of [.41,.99])ell(back,x,y,z+.076,.011,.012,.005,nail,6);
  }
  for(const y of [.36,.99])box(back,0,y,zFence-.011,22,.111,.131,timber[1]);
  for(const x of [-7.0,-4.23,-2.23,.69,3.56,6.40]){
    box(back,x,.74,zFence+.032,.16,1.48,.165,timber[3]);box(back,x,1.49,zFence+.032,.19,.055,.19,timber[2]);
  }
  rod(back,[-4.07,.28,zFence+.12],[-2.40,.96,zFence+.12],.049,timber[2],.049,4);

  // The fence returns into the garden here. The rear carrier rests against its top rail.
  const returnRail=group(back),bikePos=game.layout.bike;
  returnRail.position.set(bikePos.x,0,bikePos.z);returnRail.rotation.y=game.layout.narrow?-.39:-.22;
  for(const x of [-1.48,-.40]){
    box(returnRail,x,.655,-.298,.118,1.31,.126,timber[2]);
    box(returnRail,x,1.32,-.298,.138,.039,.149,timber[3]);
  }
  for(const y of [.57,1.215]){
    box(returnRail,-.94,y,-.241,1.23,.114,.081,timber[3]);
    for(const x of [-1.48,-.40])ell(returnRail,x,y,-.197,.012,.012,.005,nail,7);
  }
    // Atmospheric tree lines have actual depth and vary in outline.
  for(let layer=0;layer<3;layer++){
    const pos=[],idx=[],colors=[],n=84,z=-13-layer*7;
    const c=new T.Color([0x87a797,0x98b2a2,0xabc0ad][layer]);
    for(let i=0;i<=n;i++){
      const x=-42+i,ht=1.31+layer*.79+noise(i*.095,layer+9)*2.85+noise(i*.28,layer)*.39;
      pos.push(x,-1,z,x,ht,z);colors.push(c.r*.83,c.g*.87,c.b*.83,c.r,c.g,c.b);
      if(i<n){let k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
    const m=mat(0xffffff,.98,0,{vertexColors:true,side:T.DoubleSide});const hills=mesh(back,buffer(pos,colors,null,idx),m);hills.castShadow=false;
  }
  const bark=mat(0x6c6952,.95),barkLight=mat(0x858269,.91);
  const shrubMats=[0x617d66,0x738b6c,0x839575,0x91a07a,0x9eaa83,0x6c846d].map(c=>mat(c,.91));
  function bushBlob(x,y,z,rx,ry,rz,m,detail=1){
    const g=new T.IcosahedronGeometry(1,detail),a=g.attributes.position;
    const seed=range(0,10);
    for(let k=0;k<a.count;k++){let xx=a.getX(k),yy=a.getY(k),zz=a.getZ(k);
      const q=.89+.19*noise(xx*6+seed+zz*2,yy*5+zz*3+seed);a.setXYZ(k,xx*q,yy*q,zz*q);}
    g.computeVertexNormals();const o=mesh(back,g,m,x,y,z);o.scale.set(rx,ry,rz);o.rotation.y=rng()*TAU;
  }
  for(let i=0;i<57;i++){
    const x=range(-17,17),z=range(-12,-4.1),ht=range(1.7,4.5),r=range(.47,1.25);
    if(Math.abs(x)<2.8&&z>-8&&ht>2.94)continue;
    rod(back,[x,0,z],[x+.09,ht*.71,z],.049,bark,.026);
    for(let j=0;j<5;j++){
      const a=rng()*TAU,span=j===0?0:r*.59;
      bushBlob(x+Math.cos(a)*span,ht-r*.41+(j===0?r*.45:range(-.25,.16)),z+Math.sin(a)*span,r*range(.61,.90),r*range(.77,1.1),r*.8,shrubMats[(rng()*6)|0],2);
    }
  }
  // Layered foliage along the fence and overhanging orchard branches.
  const foliage={pos:[],col:[],uv:[],idx:[]};
  function leaf3(x,y,z,dx,dy,dz,w,c,tilt=0){
    const out=foliage,k=out.pos.length/3,len=Math.hypot(dx,dz)||1,wx=-dz/len*w,wz=dx/len*w;
    out.pos.push(x,y,z,x+dx*.42+wx,y+dy*.48+tilt,z+dz*.42+wz,x+dx*.45,y+dy*.49+w*.33,z+dz*.45,
      x+dx*.42-wx,y+dy*.48-tilt,z+dz*.42-wz,x+dx,y+dy,z+dz);
    for(const f of [.69,.83,1,.94,1.03])out.col.push(c.r*f,c.g*f,c.b*f);
    out.uv.push(.5,0,1,.4,.5,.45,0,.4,.5,1);out.idx.push(k,k+2,k+1,k,k+3,k+2,k+1,k+2,k+4,k+2,k+3,k+4);
  }
  const leafColors=[0x648054,0x78935e,0x8fa36b,0x94a47d,0x849563,0xa2b07e].map(c=>new T.Color(c));
  function foliageCluster(x,y,z,r,n){
    for(let k=0;k<n;k++){
      const a=rng()*TAU,dist=Math.sqrt(rng())*r,xx=x+Math.cos(a)*dist,zz=z+Math.sin(a)*dist;
      const yy=y+Math.sqrt(Math.max(0,r*r-dist*dist))*range(.35,.8)-rng()*r*.55;
      leaf3(xx,yy,zz,range(-.19,.19),range(-.07,.16),range(-.19,.19),range(.029,.073),leafColors[(rng()*6)|0],range(-.032,.032));
    }
  }
  for(let i=0;i<90;i++){
    const x=range(-8,8),z=range(-4.8,-3.05),r=range(.28,.67),y=range(.71,1.44);
    bushBlob(x,y,z,r,r*.73,r,shrubMats[(rng()*6)|0],1);foliageCluster(x,y+r*.26,z+.12,r,40);
  }
  for(const side of [-1,1]){
    const x=side*(side<0?5.90:7.33),z=side<0?-2.4:-3.77;
    tube(back,[[x,0,z],[x+.05,1.7,z],[x-side*.22,2.8,z-.05],[x-side*.51,4.10,z-.19]],.172,bark,20,10);
    for(let j=0;j<15;j++){
      const a=rng()*TAU,reach=range(1.1,2.8),ey=range(3.56,5.92),
        ex=x+Math.cos(a)*reach,ez=z+Math.sin(a)*reach;
      rod(back,[x,range(1.8,3.15),z],[ex,ey,ez],.062,barkLight,.021);
      for(let k=0;k<6;k++){
        let xx=ex+range(-.75,.75),yy=ey+range(-.3,.52),zz=ez+range(-.77,.77);
        bushBlob(xx,yy,zz,.68,.44,.63,shrubMats[(rng()*6)|0],2);foliageCluster(xx,yy+.06,zz,.70,65);
      }
    }
  }
  const blossomM=[mat(0xf1e8cb,.80),mat(0xe7e3cb,.80),mat(0xd99875,.8),mat(0xb2a4ba,.8)],pollen=mat(0xd0a452,.82);
  const flowerParts=[[],[],[],[]],diskParts=[];
  const temp=new T.Object3D();
  function shapePart(list,x,y,z,sx,sy,sz,rx,ry,rz){
    temp.position.set(x,y,z);temp.scale.set(sx,sy,sz);temp.rotation.set(rx,ry,rz);temp.updateMatrix();list.push(temp.matrix.clone());
  }
  const stems=mat(0x718653,.88);
  function daisy(x,z,height,rad,type){
    const lean=range(-.065,.065),leanZ=range(-.046,.046),cx=x+lean,cz=z+leanZ;
    rod(plants,[x,.025,z],[cx,height,cz],height>.25?.005:.0028,stems,.0025,5);
    const count=type===2?6:10,tipped=range(.38,.90),pitch=range(-.55,.55);
    for(let k=0;k<count;k++){
      let a=k*TAU/count+range(-.09,.09),reach=rad*.58,dx=Math.cos(a),dz=Math.sin(a);
      shapePart(flowerParts[type],cx+dx*reach,height+dz*reach*tipped+dx*reach*pitch,cz+dz*reach,
        rad*(type===2?.44:.21),rad*.115,rad*.57,-tipped*.7,Math.PI/2-a,pitch*.65);
    }
    shapePart(diskParts,cx,height+.004,cz,rad*.31,rad*.235,rad*.31,-.36,0,0);
    if(height>.15)for(let j=0;j<4;j++){let a=rng()*TAU;leaf3(x+lean*.4,height*range(.2,.64),z+leanZ*.4,Math.cos(a)*.08,.06,Math.sin(a)*.08,.018,leafColors[j]);}
  }
  function border(cx,cz,rx,rz,count,ht){
    for(let i=0;i<count;i++){
      let a=rng()*TAU,r=Math.sqrt(rng()),x=cx+Math.cos(a)*r*rx,z=cz+Math.sin(a)*r*rz,h=ht*range(.47,1.2);
      for(let k=0;k<7;k++){let q=rng()*TAU;leaf3(x,.012,z,Math.cos(q)*h*.69,h*range(.33,.96),Math.sin(q)*h*.69,range(.017,.057),leafColors[(rng()*6)|0],range(-.016,.016));}
      if(i%3===0)daisy(x,z,h*1.35,range(.035,.074),i%11===0?2:i%2);
    }
  }
  border(-4.4,-1.65,1.85,.78,180,.40);border(3.42,-2.59,2.0,.34,150,.40);
  border(-.70,-2.76,1.79,.22,110,.25);border(4.31,2.96,1.26,.81,110,.36);border(-4.10,3.01,1.24,.61,95,.38);
  for(let i=0;i<280;i++){
    let x=range(-6,6),z=range(-2.6,5);
    if(Math.hypot(x-h.x,z-h.z)<.65||Math.hypot(x-p.x,z-p.z)<.61)continue;
    daisy(x,z,range(.055,.132),range(.017,.033),i%2);
  }
  // Lavender whorls grow along stems in distinct clumps.
  for(const [cx,cz] of [[-2.81,-1.71],[-3.92,-.93],[2.98,-2.10],[3.92,-2.11]]){
    for(let i=0;i<30;i++){
      const a=rng()*TAU,r=rng()*.42,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,ht=range(.29,.69);
      let dx=(x-cx)*.29,dz=(z-cz)*.29;
      rod(plants,[x,0,z],[x+dx,ht,z+dz],.004,stems,.002,5);
      for(let k=0;k<8;k++){const frac=.68+k*.041,q=k*2.4;shapePart(flowerParts[3],x+dx*frac+Math.cos(q)*.009,ht*frac,z+dz*frac+Math.sin(q)*.009,.014,.020,.017,q,0,.4);}
    }
  }
  for(let i=0;i<5;i++){
    const list=i===4?diskParts:flowerParts[i],m=i===4?pollen:blossomM[i];
    const o=inst(scene,new T.SphereGeometry(1,7,4),m,list.length);
    list.forEach((matrix,k)=>o.setMatrixAt(k,matrix));o.count=list.length;o.instanceMatrix.needsUpdate=true;
  }
  const f=mesh(scene,buffer(foliage.pos,foliage.col,foliage.uv,foliage.idx),mat(0xffffff,.84,0,{side:T.DoubleSide,vertexColors:true}));
  f.castShadow=true;batch(back);batch(plants);
  return {sky,update(){
    skyUniform.value=game.s.evening;
    game.s.cells.forEach((c,i)=>{
      fieldBytes[i*4]=255*(1-Math.exp(-4*c.soil-10*c.film));fieldBytes[i*4+1]=Math.min(255,c.dew*8000);
      fieldBytes[i*4+2]=Math.max(0,Math.min(255,128+c.bend*127));fieldBytes[i*4+3]=255;
    });field.needsUpdate=true;
  }};
}
