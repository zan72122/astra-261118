'use strict';
const Landscape = (() => {
  const {T,R,scene,group,add,box,round,cyl,ell,beam,flush,mats,material,shapes,random:r,canvas,tex,rough}=Art;
  const V=(x,y,z)=>new T.Vector3(x,y,z), pick=a=>a[Math.floor(r()*a.length)];
  const TAU=Math.PI*2, mix=(a,b,t)=>a+(b-a)*t;
  function hash(x,y){const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);}
  function noise(x,y){const i=Math.floor(x),j=Math.floor(y),u=R.smooth(x-i),v=R.smooth(y-j);
    return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v);}
  function fb(x,y){return noise(x,y)*.5+noise(x*2.04+8,y*2.04)*.27+noise(x*4.2,y*4.2+17)*.14+noise(x*8.6,y*8.6)*.064+noise(x*17,y*17)*.026;}
  // Directional radiance panorama. All terrain, clouds' setting, rolling stock,
  // people, tracks and stations share this generated local light environment.
  const skyCanvas=canvas(1024,384), skyCtx=skyCanvas.getContext('2d'), img=skyCtx.createImageData(1024,384);
  for(let j=0;j<384;j++)for(let i=0;i<1024;i++){
    const lat=(.5-j/384)*Math.PI, az=(i/1024-.5)*TAU;
    const Y=Math.sin(lat),X=Math.cos(lat)*Math.cos(az),Z=Math.cos(lat)*Math.sin(az);
    const k=R.clamp(Y/.50,0,1)**.66, low=[255,207,158], high=[139,163,183];
    const col=low.map((a,l)=>mix(a,high[l],k));
    const w=1/(Math.max(Y,0)+.073);
    const vapor=fb(X*w*.96+2,Z*w*1.65-5);
    const cloud=R.smooth((vapor-.45)/.31)*R.smooth(Y/.10);
    const cirrus=fb(X*w*2.3+12,Z*w*5.3+4);
    for(let n=0;n<3;n++){
      col[n]=mix(col[n],[239,200,183][n],R.smooth((cirrus-.44)/.30)*.48);
      col[n]=mix(col[n],mix([255,224,192][n],[177,161,165][n],R.smooth((vapor-.52)/.23)),cloud*.9);
    }
    const ix=(j*1024+i)*4;
    img.data.set([...col.map(k=>Math.round(k+(r()-.5)*1.3)),255],ix);
  }skyCtx.putImageData(img,0,0);
  const skyMap=tex(skyCanvas);skyMap.mapping=T.EquirectangularReflectionMapping;scene.environment=skyMap;scene.environmentIntensity=.65;
  const skyUniforms={sun:{value:V(.4,.112,1).normalize()},night:{value:0},morning:{value:0}};
  const skyMat=new T.MeshStandardMaterial({color:0,emissive:0xffffff,side:T.BackSide,fog:false,depthWrite:false,roughness:1});
  skyMat.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,{skyTex:{value:skyMap},sunDir:skyUniforms.sun,nightAmt:skyUniforms.night,morningAmt:skyUniforms.morning});
    sh.vertexShader='varying vec3 skyP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n skyP=position;');
    sh.fragmentShader='varying vec3 skyP;uniform sampler2D skyTex;uniform vec3 sunDir;uniform float nightAmt,morningAmt;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`
      vec3 D=normalize(skyP);
      vec2 uvS=vec2(atan(D.z,D.x)/6.2831853+.5,asin(D.y)/3.1415927+.5);
      vec3 daylight=texture2D(skyTex,uvS).rgb;
      daylight=mix(daylight,daylight*vec3(.87,1.06,1.22),morningAmt*.7);
      float sep=length(D-sunDir);
      vec3 sky=mix(daylight,daylight*vec3(.36,.35,.52)+vec3(.024,.016,.036),nightAmt);
      sky+=vec3(.45,.13,.018)*exp(-sep*10.)+vec3(.44,.15,.012)*exp(-sep*42.);
      sky=mix(sky,vec3(2.22,.50,.19),1.-smoothstep(.0162,.0178,sep));
      totalEmissiveRadiance=sky;
    `);
  };
  const sky=new T.Mesh(new T.SphereGeometry(1050,48,24),skyMat);sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);sky.layers.enable(1);
  function geometry(pos,ind,colors){
    let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ind);
    const uv=[];for(let i=0;i<pos.length;i+=3)uv.push(pos[i]*.4,pos[i+2]*.4+pos[i+1]*.15);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  }
  function mesh(p,geo,mat,shadow=true){
    const m=new T.Mesh(geo,mat);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m;
  }
  // Gravel is a continuous profiled bed, with a fixed granular albedo.
  function surfaceTex(base,fleck,n=256){
    const c=canvas(n,n),ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,n,n);
    for(let i=0;i<n*n*.32;i++){
      ctx.globalAlpha=.12+r()*.43;ctx.fillStyle=pick(fleck);
      const k=.3+r()*2.2;ctx.fillRect(r()*n,r()*n,k,k*(.4+r()*.6));
    }
    const tx=tex(c);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=4;return tx;
  }
  const gravel=material('ballast',.99,.03,{map:surfaceTex('#786f61',['#e2d4b9','#332f2c','#4d5250','#a59a84'])});
  const platformMat=material('platform',.93,0,{map:surfaceTex('#a79c85',['#daceb5','#787464','#c0b298','#978671'])});
  const soil=material('field',.91,0,{map:surfaceTex('#c4ac78',['#dbb970','#726d3c','#c9b57c','#d5c18b'])});
  const grassMat=material('grain',.88,0,{side:T.DoubleSide,vertexColors:true});
  const geoMat=material('land',.96,0,{vertexColors:true,side:T.DoubleSide});
  function strip(p,z0,z1,fun,profile,mat,spacing=3) {
    const pos=[],norm=[],uv=[],indices=[],steps=Math.ceil((z1-z0)/spacing);
    for(let i=0;i<=steps;i++){
      const z=mix(z0,z1,i/steps),x=fun(z);
      profile.forEach(([off,y],j)=>{pos.push(x+off,y,z);uv.push(off*.77,z*.77);
        if(i&&j){const a=i*profile.length+j;indices.push(a-profile.length-1,a-1,a,a-profile.length-1,a,a-profile.length);}
      });
    }
    const g=geometry(pos,indices);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return mesh(p,g,mat);
  }
  const regions=[], regionMap=new Map();
  function region(z){if(regionMap.has(z))return regionMap.get(z);const g=group();g.userData.range=z;regions.push(g);regionMap.set(z,g);return g;}
  function rail(p,x0,z0,x1,z1,color,rad,y,wide=0){
    beam(p,'steel',color,[x0,y,z0],[x1,y,z1],rad,true);
    if(wide)beam(p,'iron',0x5b534a,[x0,y-.072,z0],[x1,y-.072,z1],wide,true);
  }
  const forks=[];
  function path(p,z0,z1,fun,ballast,bridge=false){
    if(ballast)strip(p,z0,z1,fun,[[-2.05,-.17],[-1.56,.105],[1.56,.105],[2.05,-.17]],gravel);
    for(let z=z0;z<z1-.001;z+=.78){
      const x=fun(z),yaw=Math.atan((fun(z+.2)-fun(z-.2))/.4);
      box(p,'wood',pick([0x605348,0x695c4e,0x756854,0x625b50]),x,.149,z,2.34,.112,.23,0,yaw);
      if(z<30||bridge)for(const s of [-1,1])box(p,'iron',0x635f52,x+s*.748,.213,z,.255,.052,.145,0,yaw);
    }
    for(let z=z0;z<z1;z+=2){const next=Math.min(z+2,z1);
      for(let s of [-.749,.749])rail(p,fun(z)+s,z,fun(next)+s,next,0xb3afa2,.075,.261,.108);
    }
  }
  const base=z=>R.trackX(z,0),alt=z=>R.trackX(z,1);
  for(let start=-65;start<780;start+=50){
    const g=region(start+25),end=start+50;
    for(const [a,b] of [[start,Math.min(end,125)],[Math.max(start,125),Math.min(end,176)],[Math.max(start,176),end]]){
      if(b<=a)continue;
      path(g,a,b,base,!(a>=125&&b<=176),a>=125&&b<=176);
      const k=Math.max(a,27),l=Math.min(239,b);
      if(k<l)path(g,k,l,alt,!(a>=125&&b<=176)&&k>45,a>=125&&b<=176);
    }
  }
  const townTrack=region(R.TOWN);path(townTrack,R.TOWN-57,R.TOWN-.7,R.sidingX,true);
  function blades(z,fun){const g=region(z),pivot=[];for(let i=0;i<2;i++){
    const q=group(g);q.position.set(fun(z)+(i?-.749:.749),.275,z);box(q,'steel',0xdfd7c2,0,0,2.1,.054,.071,4.2);pivot.push(q);
    box(g,'wood',0x514a3e,fun(z),.161,z+i*2,2.9,.115,.22);
    box(g,'iron',0x5e5b4d,fun(z),.215,z+.4+i*1.4,2.3,.064,.08);
  }forks.push(pivot);}
  blades(25,base);blades(R.TOWN-5,base);
  // Ground is absent at the river mouth and beyond the shore.
  const ground=group();
  box(ground,'stone',0x918762,0,-.61,24,670,.80,200);box(ground,'stone',0x968d69,0,-.61,259,650,.80,166);
  box(ground,'stone',0x968d69,144,-.61,414,362,.80,144);
  box(ground,'stone',0xbfb097,-39,-.90,414,6,.54,144);
  box(ground,'stone',0xabb198,5,-.67,612,84,.80,265);
  box(ground,'stone',0xc4b690,-43,-.93,614,15,.5,270);
  const waterMeshes=[];
  const waterUniforms={reflection:{value:null},matrix:{value:new T.Matrix4()},on:{value:0}};
  const waterMaterial=material('water',.185,.40,{color:0x8daba3,transparent:true,opacity:.95});
  waterMaterial.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,{waterReflection:waterUniforms.reflection,reflectionMatrix:waterUniforms.matrix,hasReflection:waterUniforms.on});
    sh.vertexShader='uniform mat4 reflectionMatrix; varying vec4 reflUV; varying vec3 wetWorld;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n wetWorld=(modelMatrix*vec4(transformed,1.)).xyz;reflUV=reflectionMatrix*vec4(wetWorld,1.);');
    sh.fragmentShader='uniform sampler2D waterReflection;uniform float hasReflection;varying vec4 reflUV;varying vec3 wetWorld;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 ruv=reflUV.xy/reflUV.w*.5+.5;
      ruv.y+=normal.x*.007+sin(wetWorld.x*2.7+wetWorld.z*.75)*.0018;
      if(hasReflection>.5 && all(greaterThan(ruv,vec2(0.))) && all(lessThan(ruv,vec2(1.))))outgoingLight=mix(outgoingLight,texture2D(waterReflection,ruv).rgb,.58);
      #include <opaque_fragment>`);
  };
  function water(x,z,w,d,sea=false) {
    const g=new T.PlaneGeometry(w,d,84,sea?42:17);g.rotateX(-Math.PI/2);
    const m=mesh(scene,g,waterMaterial,false);m.position.set(x,-1.37,z);waterMeshes.push({m,sea});
  }
  water(0,150.5,650,53);water(-224,615,352,288,true);water(-220,410,362,145,true);water(0,973,1040,455,true);water(204,611,314,279,true);
  for(const z of [124.7,176.2]){
    box(ground,'stone',0x87846d,0,-.72,z,550,1.33,1.45);
    for(let i=0;i<180;i++){const x=r()*220-110;add(ground,'leaf','stone',pick([0x9c9a86,0x807d68,0xb2a997]),x,-1.03,z+(r()-.5)*2.4,1+r(),.45+r()*.45,.68+r()*.5);}
  }
  function bridge(fun,tint){
    const g=region(149);
    for(let z=125;z<176;z+=6.375){
      const e=z+6.375,mid=(z+e)*.5;
      box(g,'iron',0x5d6258,fun(mid),-.045,mid,3.65,.30,6.42);
      for(const side of [-1,1]){
        const at=(z,y)=>[fun(z)+side*2.11,y,z];
        for(const y of [.05,4.7])beam(g,'paint',tint,at(z,y),at(e,y),.205,true);
        beam(g,'paint',tint,at(z,.05),at(z,4.7),.17,true);
        beam(g,'paint',tint,at(z,.12),at(mid,4.67),.126,true);
        beam(g,'paint',tint,at(mid,4.67),at(e,.12),.126,true);
        for(let b=0;b<3;b++)box(g,'iron',0x6c6656,fun(z)+side*2.11,.18+b*.10,z,.24,.075,.2);
      }
      beam(g,'paint',tint,[fun(z)-2.1,4.7,z],[fun(z)+2.1,4.7,z],.14,true);
      if(Math.round((z-125)/6.375)%3===0)round(g,'stone',0x8d8c79,fun(z),-1.37,z,5.3,2.56,1.32);
    }
  }bridge(base,0x924e3c);bridge(alt,0x656e60);
  const riceBlocks=[];
  // A patch contains individual arced stalks and bent grain-bearing tips.
  const stems=[],inds=[],grainColors=[],cc=new T.Color();
  function triangle(a,b,c,col){const k=stems.length/3;stems.push(...a,...b,...c);inds.push(k,k+1,k+2);cc.set(col);for(let i=0;i<3;i++)grainColors.push(cc.r,cc.g,cc.b);}
  for(let i=0;i<110;i++){
    const x=(r()-.5)*3.7,z=(r()-.5)*3.7,h=.43+r()*.33,dx=r()*.19+.03,dz=(r()-.5)*.14;
    const col=pick([0xc2aa59,0xcbb46a,0xada052,0xdec176]);
    triangle([x-.022,0,z],[x+.026,0,z],[x+dx,h,z+dz],col);
    triangle([x,0,z],[x-.047,h*.57,z+.033],[x-.10,h*.83,z+.07],0xa39c54);
    triangle([x+dx,h,z+dz],[x+dx+.08,h+.025,z+dz],[x+dx+.15,h-.094,z+dz+.022],pick([0xe0bb69,0xcaa052,0xd9b064]));
  }
  const bladesGeo=geometry(stems,inds,grainColors);
  const fieldCols=[0xc8aa68,0xc7ae6d,0xd4b675,0xb7a66b,0xc8aa65,0xb7a16a];
  function parcel(p,cx,cz,w,d,active){
    box(p,'stone',pick(fieldCols),cx,-.053,cz,w,.32,d);
    box(p,'stone',0x8d8f58,cx-w*.5,.005,cz,.56,.45,d+.52);
    for(let x=cx-w/2+.72;x<cx+w/2;x+=1.39)
      box(p,'leaf',pick(fieldCols),x,.139,cz,.68,.19,d-.5);
    if(!active)return;
    const gp=group(p),nX=Math.floor(w/3.7),nZ=Math.floor(d/3.7);
    const m=new T.InstancedMesh(bladesGeo,grassMat,nX*nZ),dmy=new T.Object3D();
    for(let i=0;i<nX;i++)for(let j=0;j<nZ;j++){
      dmy.position.set(cx-w*.5+(i+.5)*w/nX,.105,cz-d*.5+(j+.5)*d/nZ);
      dmy.rotation.y=(r()-.5)*.6;dmy.scale.set(1,.74+r()*.38,1);dmy.updateMatrix();m.setMatrixAt(i*nZ+j,dmy.matrix);
    }
    m.receiveShadow=true;gp.add(m);riceBlocks.push({m,region:p,cz,idx:Math.min(23,Math.max(0,Math.floor((cz+50)/32)))});
  }
  const bendUniforms=new Float32Array(24);
  grassMat.onBeforeCompile=sh=>{
    sh.uniforms.bendGrid={value:bendUniforms};
    sh.vertexShader='uniform float bendGrid[24];\n'+sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n int cell=int(clamp(floor((instanceMatrix[3].z+50.)/32.),0.,23.)); transformed.x+=bendGrid[cell]*position.y*position.y*(.9+.16*position.z);');
  };
  for(let row=0;row<14;row++){
    const z=-46+row*30;if(z>115&&z<185)continue;
    const p=region(z);
    for(const sign of [-1,1])for(let j=0;j<4;j++){
      if(sign<0&&z>335)continue;
      const inner=(sign>0&&z>35&&z<245?19:4.5)+(sign<0&&z<35?6:0),w=20+j*4;
      const x=base(z)+sign*(inner+10+j*25);
      parcel(p,x,z,w,27.8,j<2 && (row<6 || j===0));
    }
  }
  // Distant relief retains depth and occlusion as the camera rounds the mountain.
  function hillRange(axis,offset,start,length,baseH,amp,seed,color) {
    const pos=[],idx=[],cols=[],nx=110,nz=9;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const a=start+length*i/nx,b=j/nz,crest=.35+.9*fb(a*.010+seed,seed)+.32*noise(a*.016,seed+8);
      const h=Math.max(-1,Math.pow(Math.sin(b*Math.PI),1.4)*(baseH+amp*crest)*(1+.19*noise(a*.052,b*9))-.8);
      const side=offset+(b-.5)*100;
      pos.push(axis?a:side,h,axis?side:a);cc.set(color).multiplyScalar(.85+fb(a*.03,b*8)*.28);cols.push(cc.r,cc.g,cc.b);
      let k=j*(nx+1)+i;if(i&&j)idx.push(k-nx-2,k-1,k,k-nx-2,k,k-nx-1);
    }
    return mesh(scene,geometry(pos,idx,cols),geoMat,false);
  }
  hillRange(1,870,-910,1850,4,30,14,0x778389);
  hillRange(0,246,-200,1120,15,37,27,0x7a8074);
  hillRange(0,144,-110,730,4,22,83,0x8a8b74);
  hillRange(0,-195,-220,760,6,34,17,0x868577);
  function tree(p,x,z,size,ever=false){
    const y=-.02;
    beam(p,'wood',0x605543,[x,y,z],[x+.12*size,y+size*.77,z],size*.061);
    if(ever){
      for(let i=0;i<4;i++)add(p,'cone','leaf',pick([0x535e4c,0x5b6752,0x626b55]),x+i*.026*size,size*(.39+i*.135),z,size*(.52-i*.083),size*.51,size*(.5-i*.076));
    }else{
      for(let i=0;i<8;i++){
        const a=i*2.4,rad=(i?1:0)*size*(.15+r()*.09),ex=x+Math.cos(a)*rad,ez=z+Math.sin(a)*rad,ey=y+size*(.62+r()*.33);
        if(i%2===0)beam(p,'wood',0x615744,[x,size*.36,z],[ex,ey,ez],size*.035);
        add(p,'leaf','leaf',pick([0x727852,0x858451,0x9e925c,0x847c4b,0x666f4d]),ex,ey,ez,size*(.34+r()*.13),size*(.35+r()*.16),size*(.38+r()*.14),r(),r(),0);
      }
    }
  }
  for(let i=0;i<440;i++){
    const z=r()*850-65,sg=r()<.52?-1:1;
    if(z>124&&z<178 || z>480&&sg<0)continue;
    const p=region(Math.floor(z/80)*80+40);const x=base(z)+sg*(19+r()*92);
    if(z>338&&x< -36)continue;
    tree(p,x,z,2.6+r()*5.8,r()<.32);
  }
  // Tunnel portal and its actual hollow bore, with a solid hillside on all sides.
  const tunnel=region(287),portalMat=material('masonry',.9,0,{color:0x888674});
  const tunnelLining=material('lining',.96,0,{color:0x5d625d,side:T.DoubleSide});
  function archSurface(z,t,rad){return [base(z)+Math.cos(t)*rad,1.55+Math.sin(t)*rad,z];}
  {
    const pos=[],idx=[],cols=[],nz=28,na=38;
    for(let j=0;j<=nz;j++)for(let i=0;i<=na;i++){
      const z=258+66*j/nz,a=i/na*Math.PI,f=Math.sin(j/nz*Math.PI)**.65;
      const rad=4.8+f*(20+8*noise(i*.12,j*.14)),v=archSurface(z,a,rad);
      pos.push(...v);cc.set(pick([0x777d60,0x848163,0x868569,0x7a7e61]));cols.push(cc.r,cc.g,cc.b);
      const k=j*(na+1)+i;if(i&&j)idx.push(k-na-2,k-1,k,k-na-2,k,k-na-1);
    }
    mesh(tunnel,geometry(pos,idx,cols),geoMat);
    for(let z=258;z<324;z+=3){
      for(let i=0;i<14;i++){
        const a=i/14*Math.PI,b=(i+1)/14*Math.PI;
        const p=[...archSurface(z,a,2.75),...archSurface(z,b,2.75),...archSurface(z+3,b,2.75),...archSurface(z+3,a,2.75)];
        // Collect the lining as a single indexed mesh.
        if(!tunnel.userData.lining)tunnel.userData.lining=[];
        tunnel.userData.lining.push(...p);
      }
      for(const sign of [-1,1])box(tunnel,'stone',0x686c60,base(z)+sign*3.63,.69,z+1.5,1.9,1.83,3.04);
    }
    const lp=tunnel.userData.lining,li=[];for(let i=0;i<lp.length/3;i+=4)li.push(i,i+1,i+2,i,i+2,i+3);
    mesh(tunnel,geometry(lp,li),tunnelLining);delete tunnel.userData.lining;
    for(const z of [258,324]){
      for(let i=0;i<27;i++){let a=i/27*Math.PI,b=(i+1)/27*Math.PI;
        const p=[...archSurface(z,a,2.75),...archSurface(z,b,2.75),...archSurface(z,b,4.81),...archSurface(z,a,4.81)];
        mesh(tunnel,geometry(p,[0,1,2,0,2,3,2,1,0,3,2,0]),portalMat);
        beam(tunnel,'stone',0x666a60,archSurface(z,a,2.77),archSurface(z,a,4.74),.032);
      }
    }
  }
  function roof(p,x,y,z,w,d,h,color){
    const ang=Math.atan2(h,w/2),slope=Math.hypot(h,w/2);
    for(const sg of [-1,1]){
      box(p,'iron',color,x+sg*w/4,y+h/2,z,slope,.117,d,0,0,-sg*ang);
      for(let i=-d*.5;i<=d*.5;i+=.52)beam(p,'iron',0x6b7168,[x,y+h+.07,z+i],[x+sg*w*.5,y+.07,z+i],.044);
    }
  }
  function house(p,x,z,size){
    const h=2.9*size,w=4.5*size,d=5.5*size;
    box(p,'wood',pick([0xc4b59a,0xb09e80,0xd5c5a4,0xaba287]),x,h*.5,z,w,h,d);
    roof(p,x,h,z,w+.7,d+.7,1.18*size,pick([0x606764,0x756b61,0x616d6a,0x807469]));
    for(const side of [-1,1])for(const dz of [-d*.28,d*.25]){
      box(p,'wood',0x776e5e,x+side*(w*.5+.02),h*.58,z+dz,.06,1.16*size,1.58*size);
      box(p,'glass',0x82908a,x+side*(w*.5+.055),h*.58,z+dz,.035,1.04*size,1.46*size);
      box(p,'wood',0x7b7666,x+side*(w*.5+.076),h*.58,z+dz,.035,1.12*size,.055);
    }
  }
  for(const [x,z,size] of [[26,74,.94],[38,78,.8],[-33,94,1],[48,103,.83],[30,202,.9],[-36,242,1.2]])house(region(z),x,z,size);
  for(let i=0;i<52;i++){
    const z=353+r()*208,sg=i%2?1:-1,x=base(z)+sg*(14+r()*39);
    if(x> -33)house(region(Math.round(z/40)*40),x,z,.68+r()*.53);
  }
  function poles(z0,z1){
    const pts=[];
    for(let z=z0;z<z1;z+=28.5){
      const g=region(Math.round(z/50)*50),x=base(z)+5.45+(z>36&&z<249?11:0);
      if(z>123&&z<177||z>257&&z<326)continue;
      cyl(g,'wood',0x685b49,x,3.64,z,.197,7.6,.197,0,0,.014);
      cyl(g,'wood',0x796b55,x+.045,1.47,z,.228,3.08,.228,0,0,.014);
      box(g,'wood',0x605849,x,6.96,z,1.82,.13,.16);
      beam(g,'iron',0x5e6054,[x,6.27,z],[x+.7,6.95,z],.048);
      beam(g,'iron',0x5e6054,[x,6.27,z],[x-.71,6.95,z],.048);
      for(let i=-1;i<=1;i++){
        const dx=i*.72;for(let k=0;k<3;k++)cyl(g,'shine',0xb3baaa,x+dx,7.09+k*.064,z,.124-k*.015,.04,.124-k*.015);
        if(pts.length){
          const last=pts[pts.length-1],span=z-last.z;
          for(let j=0;j<8;j++){
            const cord=f=>[mix(last.x,x,f)+dx,7.25-4*f*(1-f)*span*.028,mix(last.z,z,f)];
            beam(g,'iron',0x535952,cord(j/8),cord((j+1)/8),.019);
          }
        }
      }pts.push({x,z});
    }
  }poles(-18,455);
  const lanterns=[];
  function lamp(p,x,z,y=1.04) {
    cyl(p,'iron',0x515952,x,y+1.72,z,.096,3.45,.096);
    cyl(p,'iron',0x74776a,x,y+.14,z,.237,.28,.237);
    beam(p,'iron',0x575d54,[x,y+3.39,z],[x+.56,y+3.57,z],.074);
    beam(p,'iron',0x575d54,[x+.56,y+3.57,z],[x+.65,y+3.42,z],.071);
    add(p,'cone','iron',0x5e6862,x+.65,y+3.30,z,.69,.26,.69);
    const m=material('globe'+lanterns.length,.25,.14,{color:0xf3e5bc,emissive:0xffb85a,emissiveIntensity:.12});
    const globe=mesh(p,shapes.sphere,m);globe.scale.set(.36,.22,.36);globe.position.set(x+.65,y+3.15,z);
    lanterns.push(m);
  }
  function platform(z,x,coast=false){
    const p=region(z);const len=z?46:70,mid=z+(z?4:0),edge=x-1.7,w=7.45;
    box(p,'stone',0x817f70,edge-w/2,.44,mid,w,1.12,len);
    // Masonry courses and individual stone caps catch the low sun.
    for(let zz=mid-len/2;zz<mid+len/2;zz+=1.36){
      for(let j=0;j<3;j++)box(p,'stone',pick([0x878675,0x918f7c,0x888679]),edge+.019,.13+j*.28,zz+(j%2)*.37,.074,.258,1.337);
      box(p,'stone',0xbab39f,edge-.125,.99,zz,.34,.143,1.35);
    }
    const g=strip(p,mid-len/2,mid+len/2,()=>edge,[[-w,1.015],[0,1.015]],platformMat,5);
    for(let zz=mid-len/2;zz<mid+len/2;zz+=.78){
      box(p,'stone',pick([0xc9ac60,0xcdaf62,0xc6a85d]),edge-.47,1.032,zz,.342,.034,.765);
      if(!z||coast)for(let a=0;a<3;a++)for(let b=0;b<6;b++)cyl(p,'stone',0xd7b76a,edge-.568+a*.096,1.055,zz-.30+b*.12,.036,.012,.036);
    }
    for(let zz=mid-len/2+2;zz<mid+len/2;zz+=4.75)box(p,'stone',0x887f6e,edge-w*.5,1.017,zz,w-.75,.008,.014);
    const hZ=z+12,hh=3.78,rx=x-7.03;
    for(const xx of [rx-1.6,rx+1.55])for(const dz of [-5.75,0,5.75]){
      box(p,'wood',0x706142,xx,2.41,hZ+dz,.145,2.83,.15);
      box(p,'iron',0x66695c,xx,1.22,hZ+dz,.17,.36,.18);
      for(const b of [-1,1])beam(p,'wood',0x7d6b4e,[xx,3.16,hZ+dz],[xx,3.72,hZ+dz+b*.58],.077,true);
    }
    box(p,'wood',0x797057,rx,hh,hZ,3.86,.148,12.4);
    roof(p,rx,hh+.02,hZ,4.35,13.22,.65,coast?0x71807a:0x58665e);
    for(const dz of [-3.1,3.1]){
      for(const a of [-1,0,1])box(p,'wood',0x9f7951,rx+.16+a*.155,1.51,hZ+dz,.14,.071,2.1);
      for(const a of [-.65,.65])box(p,'iron',0x566059,rx+.16,1.28,hZ+dz+a,.40,.44,.075);
      for(let i=0;i<2;i++)box(p,'wood',0x9a754f,rx-.15,1.77+i*.144,hZ+dz,.077,.116,2.08);
    }
    lamp(p,edge-1.21,z+19);lamp(p,edge-1.41,z?z-11:z+32);
    // Double-sided enamel station clock, entirely modelled, with index strokes.
    const clock=group(p);clock.position.set(x-4.3,3.47,hZ-4.7);
    cyl(clock,'iron',0x515e58,0,0,0,.87,.19,.87,Math.PI/2);
    cyl(clock,'paint',0xe5d8b6,0,0,-.103,.769,.035,.769,Math.PI/2);
    for(let i=0;i<12;i++){let a=i*Math.PI/6;box(clock,'iron',0x565c50,Math.sin(a)*.318,Math.cos(a)*.318,-.128,.018,i%3?.042:.074,.011,0,0,-a);}
    beam(clock,'iron',0x49534b,[0,0,-.143],[.205,.085,-.143],.028);
    beam(clock,'iron',0x49534b,[0,0,-.15],[-.14,.207,-.15],.022);
    beam(p,'iron',0x525e57,[x-5.5,3.62,hZ-4.7],[x-4.3,3.62,hZ-4.7],.076);
    if(coast)for(let a=0;a<4;a++)lamp(p,x-8.1,z-16+a*9);
    return p;
  }
  const home=platform(0,0),town=platform(R.TOWN,base(R.TOWN)),coast=platform(R.COAST,base(R.COAST),true);
  // Family, facing the railcar. Layered clothing, lifted collars, shoes, hat
  // ribbon and shoulder bag give each silhouette a different outline.
  const family=group(),childPivot=group(family);
  function person(parent,x,z,scale,style,rot) {
    const p=group(parent);p.position.set(x,1.047,z);p.rotation.y=rot;p.scale.setScalar(scale);
    const skin=0xc69875,hair=style===1?0x4b392f:0x443c31,coat=[0x808978,0xb9654f,0x9c845f][style];
    const trousers=style===1?0xc3b196:style===2?0x555b55:0x505751;
    for(const side of [-1,1]){
      round(p,'cloth',trousers,side*.105,.406,0,.166,.65,.186,side*.035);
      ell(p,'rubber',0x453f34,side*.112,.091,.056,.183,.143,.30);
      box(p,'rubber',0x554e3f,side*.112,.036,.048,.174,.043,.26);
    }
    add(p,'sphere','cloth',coat,0,1.066,0,.48,.76,.31);
    round(p,'cloth',coat,0,.91,-.005,.439,.37,.295);
    if(style===1){
      add(p,'cone','cloth',0xa95e4d,0,.775,0,.60,.63,.446);
      for(const side of [-1,1])ell(p,'cloth',0xdbc299,side*.11,.24,.005,.15,.16,.166);
    }
    cyl(p,'cloth',0x766451,0,1.358,0,.25,.093,.24);
    cyl(p,'paint',skin,0,1.408,.012,.156,.16,.16);
    ell(p,'paint',skin,0,1.557,.025,.306,.365,.289);
    ell(p,'cloth',hair,0,1.606,-.033,.332,.31,.279);
    ell(p,'cloth',hair,0,1.55,-.095,.32,.25,.16);
    for(const side of [-1,1]){
      ell(p,'paint',skin,side*.147,1.55,.023,.055,.09,.053);
      const handX=side*(style===1?.305:.262);
      beam(p,'cloth',coat,[side*.179,1.278,.004],[side*.244,1.022,.018],.175);
      ell(p,'cloth',coat,side*.238,1.035,.018,.165,.18,.164);
      beam(p,'cloth',coat,[side*.244,1.04,.018],[handX,.854,.07],.148);
      ell(p,'paint',skin,handX,.81,.077,.109,.15,.102);
    }
    if(style===1){
      ell(p,'cloth',0xcda15f,0,1.746,-.016,.428,.225,.39);
      cyl(p,'cloth',0xd6b474,0,1.686,-.013,.512,.027,.454,0,0,-.04);
      cyl(p,'cloth',0x916741,0,1.71,-.015,.382,.041,.352);
      for(let s of [-1,1])ell(p,'cloth',hair,s*.135,1.48,-.069,.115,.174,.14);
      beam(p,'cloth',0xc9ad73,[-.15,1.29,-.143],[.154,.84,-.172],.036);
      round(p,'cloth',0x95714c,.161,.847,-.159,.204,.187,.074,0,0,-.09);
    }else if(style===0){
      ell(p,'cloth',hair,0,1.489,-.175,.244,.198,.205);
      beam(p,'cloth',0xb69870,[-.18,1.255,-.117],[.177,.834,-.146],.046);
      round(p,'cloth',0x916e4c,.203,.753,-.104,.22,.265,.145);
    }else{
      ell(p,'cloth',0x6b705c,0,1.716,-.012,.375,.175,.35);
      ell(p,'cloth',0x696c59,0,1.681,.147,.33,.046,.22);
      box(p,'cloth',0x827357,0,1.30,-.158,.39,.047,.013);
    }
    return p;
  }
  person(family,-3.14,2.95,1.005,0,1.03);person(childPivot,-3.19,1.98,.654,1,1.1);person(family,-3.82,3.75,1.066,2,1.13);
  const crossing=region(51),gate=group(crossing),red=[];
  box(crossing,'stone',0x9a9687,0,-.08,51,112,.21,5.0);
  for(const x of [-3.1,18.2]){
    cyl(crossing,'iron',0x464b42,x,1.78,48,.151,3.62,.151);
    for(let j=0;j<7;j++)cyl(crossing,'paint',0xc2a04d,x,.23+j*.47,48,.169,.24,.169);
    for(const s of [-1,1]){
      box(crossing,'paint',0xe0bc67,x,3.44,48,.18,1.48,.087,0,0,s*.76);
      for(const j of [-1,1])box(crossing,'paint',0x585444,x+j*.38*s,3.44+j*.40,47.947,.18,.245,.024,0,0,s*-.76);
    }
    for(const s of [-1,1]){
      const xx=x+s*.321;cyl(crossing,'iron',0x454c45,xx,2.63,48,.46,.22,.46,Math.PI/2);
      const mat=material('signal'+red.length,.22,.16,{color:0x8b382b,emissive:0xff3b18,emissiveIntensity:0});
      const m=mesh(crossing,shapes.sphere,mat);m.scale.set(.321,.321,.10);m.position.set(xx,2.636,47.851);red.push(mat);
      box(crossing,'iron',0x454b43,xx,2.86,47.867,.464,.049,.30);
    }
  }
  gate.position.set(-5.65,.93,48.35);
  box(crossing,'paint',0x9b8861,-5.65,.55,48.35,.43,1.10,.49);
  for(let j=0;j<12;j++)box(gate,'paint',j%2?0xaca05b:0x59574c,0,.22+j*.403,0,.095,.417,.098);
  round(gate,'iron',0x61675c,0,-.29,0,.26,.66,.22);
  const car=group();round(car,'paint',0x80999a,0,.70,0,3.57,.70,1.59);
  round(car,'paint',0xadb1a0,-.2,1.19,0,2.02,.76,1.45);
  for(const sign of [-1,1]){
    round(car,'glass',0x536c6c,-.17,1.25,sign*.728,1.78,.49,.035);
    box(car,'iron',0x8c9388,-.1,1.25,sign*.75,.073,.51,.032);
    for(const x of [-1.13,1.13])cyl(car,'rubber',0x3e4340,x,.38,sign*.756,.64,.15,.64,Math.PI/2);
  }
  const wagon=group();
  box(wagon,'iron',0x464c44,0,.87,0,2.38,.26,6.7);
  for(const sign of [-1,1]){
    round(wagon,'iron',0x434940,0,.858,sign*3.51,.345,.22,.43);
    for(const x of [-.68,.68])cyl(wagon,'iron',0x676b5f,x,.94,sign*3.39,.175,.19,.175,Math.PI/2);
  }
  for(let j=0;j<3;j++)for(const sign of [-1,1]){
    box(wagon,'wood',j%2?0x8d7961:0x9d8867,sign*1.19,1.12+j*.19,0,.12,.17,6.56);
    box(wagon,'wood',0x85775d,0,1.12+j*.19,sign*3.24,2.40,.17,.13);
  }
  for(const s of [-1,1])for(const z of [-2.04,2.04]){
    cyl(wagon,'iron',0x454b45,s*1.08,.599,z,.64,.2,.64,0,0,Math.PI/2);
  }
  for(let j=0;j<4;j++)for(let i=0;i<2;i++){
    const z=-2.37+j*1.55,x=(i-.5)*1.03;
    round(wagon,'wood',pick([0xc09c63,0xad8e5c,0xb79769]),x,1.60,z,.93,.95,1.32);
    for(const side of [-1,1]){
      box(wagon,'wood',0x937950,x+side*.369,2.085,z,.074,.044,1.26);
      for(let l=0;l<3;l++)box(wagon,'wood',0xa2845a,x+side*.469,1.28+l*.3,z,.024,.025,1.29);
    }
    if(j%2===0)for(let a=0;a<5;a++)ell(wagon,'paint',pick([0xbd7339,0xd18b43,0xbb6635]),x+(r()-.5)*.71,2.126,z+(r()-.5)*.87,.235,.19,.235);
  }
  const boat=group();add(boat,'body','paint',0x516e73,0,-.06,0,2.55,.89,7.7);
  add(boat,'body','paint',0xb97854,0,.193,0,2.62,.19,7.62);
  round(boat,'wood',0xb69e78,0,.34,0,2.45,.10,7.40);
  round(boat,'paint',0xddd4ad,0,1.18,-.6,1.96,1.55,3.6);
  round(boat,'iron',0x647875,0,2.015,-.6,2.15,.17,3.85);
  for(const sg of [-1,1])for(let j=0;j<3;j++)round(boat,'glass',0x607b7b,sg*1.00,1.45,-1.76+j*1.08,.03,.68,.81);
  cyl(boat,'wood',0x988567,0,2.33,1.97,.08,3.94,.08);
  add(boat,'cone','cloth',0xb0664e,.31,4.06,1.97,.43,.62,.09,0,0,-Math.PI/2);
  for(const s of [-1,1])for(let i=0;i<9;i++){
    const z=-3.44+i*.85;beam(boat,'steel',0xafaa90,[s*1.17,.38,z],[s*1.17,1.02,z],.032);
  }
  for(const s of [-1,1])beam(boat,'steel',0xafaa90,[s*1.17,1.02,-3.44],[s*1.17,1.02,3.36],.046);
  const pier=region(R.COAST);
  for(let i=0;i<29;i++){
    box(pier,'wood',pick([0x9a876b,0x9f8e73,0xa28f70]),-47-i*.52,-.20,R.COAST+12,.50,.19,3.2);
    if(i%7===0)for(const j of [-1,1])cyl(pier,'wood',0x70664e,-47-i*.52,-.87,R.COAST+12+j*1.41,.20,2.41,.20);
  }
  // Piers, breakwater and headland beacon place a clear destination on the water.
  const lighthouse=region(722);
  for(let i=0;i<96;i++)add(lighthouse,'leaf','stone',pick([0x8a8d80,0xa09d8d,0x767f74]),-58-r()*26,-1.19+r()*.48,731+r()*7,1+r()*3,1+r(),1+r()*3,r(),r(),r());
  const lx=-73,lz=735;
  cyl(lighthouse,'stone',0xe0d6b7,lx,2.97,lz,2.04,6.29,2.04);
  cyl(lighthouse,'paint',0xa45944,lx,4.24,lz,2.058,1.34,2.058);
  cyl(lighthouse,'iron',0x5a6962,lx,6.1,lz,2.64,.22,2.64);
  cyl(lighthouse,'lamp',0xffd99a,lx,6.68,lz,1.38,1.02,1.38);
  add(lighthouse,'cone','paint',0x995b49,lx,7.52,lz,2.19,.78,2.19);
  for(let i=0;i<8;i++){const a=i*TAU/8;beam(lighthouse,'iron',0x5d685e,[lx+.77*Math.cos(a),6.14,lz+.77*Math.sin(a)],[lx+.77*Math.cos(a),7.2,lz+.77*Math.sin(a)],.055);}
  // Irrigation ditches and plume grass along the edge of the ballast.
  for(let z=-44;z<118;z+=3.5){
    const p=region(Math.round(z/40)*40);
    if(z<21)box(p,'glass',0x99a49a,3.72,-.04,z,.92,.06,3.54);
    for(let n=0;n<4;n++){
      const x=base(z)+2.16+r()*1.17+(z>36?11:0),zz=z+r()*3.3;
      for(let j=0;j<5;j++){
        const h=.35+r()*.57,dx=.17+r()*.22,dz=(r()-.5)*.33;
        beam(p,'leaf',0x9c9563,[x,-.05,zz],[x+dx,h,zz+dz],.015);
        ell(p,'leaf',pick([0xd0b98a,0xc7b384,0xd8c494]),x+dx+.035,h+.065,zz+dz,.054,.24,.065,0,0,-.41);
      }
    }
  }
  return {sky,skyUniforms,waterMeshes,waterUniforms,regions,riceBlocks,bendUniforms,family,childPivot,gate,red,car,wagon,boat,lanterns,forks,mesh,tree,base,TAU};
})();
