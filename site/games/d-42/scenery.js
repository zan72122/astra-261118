'use strict';
const Landscape = (function(){
  const T=THREE,V=Valley,N=V.noise,H=V.hash,rand=V.generator(753021);
  const col=c=>new T.Color(c);
  const vec=(x,y,z)=>new T.Vector3(x,y,z);
  const field=new T.DataTexture(new Uint8Array(64*64*4),64,64);
  for(let i=0;i<4096;i++){const n=171+Math.floor(rand()*62);field.image.data.set([n,n,n,255],i*4);}
  field.wrapS=field.wrapT=T.RepeatWrapping;field.magFilter=T.LinearFilter;field.needsUpdate=true;
  function mat(c,r=.7,m=0,more={}){return new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,roughnessMap:field,...more});}
  function mesh(g,m,parent,x=0,y=0,z=0){
    const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function geom(pos,colors,indices,uv){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));if(indices)g.setIndex(indices);
    if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
  }
  // The sky is a radiance field used both for the horizon and rough-metal reflections.
  function sky(evening){
    const w=768,h=320,a=new Uint8Array(w*h*4);
    for(let j=0;j<h;j++){
      const lat=((j+.5)/h-.5)*Math.PI,alt=Math.sin(lat), ca=Math.cos(lat);
      for(let i=0;i<w;i++){
        const lon=((i+.5)/w-.5)*Math.PI*2,dx=Math.cos(lon)*ca,dz=Math.sin(lon)*ca;
        const k=Math.min(1,Math.max(0,alt)**.56*1.33), ground=alt<-.01;
        const top=evening?[81,106,137]:[99,160,189],base=evening?[255,196,147]:[227,231,217];
        let sun=Math.max(0,dx*(evening?-.177:-.50)+alt*(evening?.214:.76)+dz*(evening?-.961:.42));
        const haze=Math.min(.94,Math.pow(sun,13)*.50+Math.pow(sun,145)*.35);
        const sx=dx/Math.max(.045,alt+.07),sz=dz/Math.max(.045,alt+.07);
        const n=N(sx*1.3+9,sz*3.2)*.50+N(sx*2.5,sz*7.5)*.3+N(sx*6,sz*21)*.2;
        const cloud=V.clamp((n-.49)*2,0,.66)*V.clamp(alt*12,0,1);
        for(let c=0;c<3;c++){
          let v=base[c]+(top[c]-base[c])*k;
          v+=( [255,242,208][c]-v)*haze;v+=([248,246,230][c]-v)*cloud;
          if(ground)v=[65,81,76][c]+(1+alt)*10;
          a[(j*w+i)*4+c]=Math.max(0,Math.min(255,v+(rand()-.5)*1.3));
        }a[(j*w+i)*4+3]=255;
      }
    }
    const tex=new T.DataTexture(a,w,h);tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.SRGBColorSpace;tex.magFilter=tex.minFilter=T.LinearFilter;tex.needsUpdate=true;return tex;
  }
  function mountains(scene){
    const sets=[
      {z:-1790,base:119,h:363,offset:81,snow:291,rock:0x8e9ca4,summits:[[-1120,240,240],[-455,180,300],[130,120,220],[620,198,230]]},
      {z:-1310,base:85,h:235,offset:33,snow:260,rock:0x73878d,summits:[[-985,135,220],[-565,205,200],[-385,125,144],[-180,90,135],[186,132,220],[636,217,209]]},
      {z:-943,base:55,h:140,offset:12,snow:300,rock:0x667d7b,summits:[[-864,102,242],[-415,75,195],[218,68,218],[750,92,264]]}
    ];
    sets.forEach((p,layer)=>{
      const vs=[],cs=[],is=[],uv=[],nx=342,nz=54;const stone=col(p.rock),snow=col(0xe5e7de),shade=col(0x63787e);
      for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
        const x=-2500+5000*i/nx, u=j/nz;
        const ridge=p.z+Math.sin(x*.004+p.offset)*66+N(x*.006,p.offset)*95;
        const z=ridge+(u-.43)*(layer===2?565:760);
        const n=N(x*.008+p.offset,z*.008)*.55+N(x*.022,z*.022)*.28+N(x*.062,z*.062)*.17;
        let summit=0;for(const [cx,ht,wd] of p.summits)summit+=ht*Math.max(0,1-Math.abs(x-cx)/wd)**.9;
        const envelope=Math.max(0,1-Math.abs(u-.43)*(u>.43?1.75:2.1));
        const cut=1-Math.abs(2*N(x*.017+u*1.9,p.offset+z*.002)-1);
        const y=p.base+envelope*(p.h*(.39+N(x*.003,p.offset)*.46)+summit+46*n)+((n-.5)*84+cut*28)*envelope-Math.max(0,(u-.87)/.13)*(p.base+20);
        const talus=N(x*.065,z*.058)*.30+N(x*.018+u*3,z*.019)*.7;
        const whiten=V.clamp((y-p.snow-90*talus+envelope*14)/28,0,1);
        const c=stone.clone().lerp(shade,.28*cut).multiplyScalar(.65+.44*talus+.27*n).lerp(snow,.95*whiten);
        vs.push(x,y,z);cs.push(c.r,c.g,c.b);uv.push(x*.02,z*.02);
        if(j<nz&&i<nx){const k=j*(nx+1)+i;is.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}
      }
      const o=mesh(geom(vs,cs,is,uv),mat(0xffffff,.95,0,{vertexColors:true}),scene);o.castShadow=false;
    });
  }
  function land(scene){
    const vs=[],cs=[],is=[],uv=[],nx=213,nz=202;
    const grass=col(0x849066),shade=col(0x4d644e),rock=col(0x888c81),gravel=col(0x9b9a85);
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const v=(i/nx-.5)*2;
      const x=v*(310+Math.pow(Math.abs(v),3)*850),z=-810+975*j/nz;
      const y=V.terrain(x,z), n=N(x*.049,z*.049), b=Math.abs(x-V.riverX(z))-V.riverWidth(z);
      const slope=Math.hypot(V.terrain(x+1,z)-y,V.terrain(x,z+1)-y);
      const c=grass.clone().lerp(shade,N(x*.013,z*.013)*.76).lerp(rock,V.clamp((slope-.43)*1.4+n*.48,0,1)).lerp(gravel,V.clamp((4-b)/4,0,1)).multiplyScalar(.77+.32*n);
      vs.push(x,y,z);cs.push(c.r,c.g,c.b);uv.push(x*.11,z*.11);
      if(i<nx&&j<nz){const k=j*(nx+1)+i;is.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}
    }
    const g=geom(vs,cs,is,uv),o=mesh(g,mat(0xffffff,1,0,{vertexColors:true}),scene);o.castShadow=false;
  }
  function fir(seed,lod){
    const rnd=V.generator(seed),vs=[],cs=[],uv=[];
    function tri(a,b,c,tint){vs.push(...a,...b,...c);for(let k=0;k<3;k++){cs.push(tint.r,tint.g,tint.b);uv.push(k*.36,k*.63);}}
    const bark=col(0x604e3b),dark=col(0x224d44),tip=col(0x4d7863);
    const layers=lod?7:9, teeth=lod?5:7;
    for(let i=0;i<5;i++){
      const a=i/5*Math.PI*2,b=(i+1)/5*Math.PI*2;
      tri([Math.cos(a)*.024,0,Math.sin(a)*.024],[0,.79,0],[Math.cos(b)*.024,0,Math.sin(b)*.024],bark);
    }
    for(let k=0;k<layers;k++){
      const t=k/(layers-1),base=.11+t*.81,rad=.194*(1-t*.87)*(.88+rnd()*.23);
      const apex=[.012*t,Math.min(1.05,base+.20+.12*(1-t)),.01*t];
      const ring=[],offset=rnd()*.85;
      for(let i=0;i<teeth*2;i++){const a=offset+Math.PI*i/teeth,r=rad*(i%2?.59+.12*rnd():.87+.2*rnd());ring.push([Math.cos(a)*r,base+(i%2?.048:-.02*rnd()),Math.sin(a)*r]);}
      for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],c=dark.clone().lerp(tip,.15+.36*t+rnd()*.26).multiplyScalar(.80+(i%2)*.18);
        tri(b,a,apex,c);if(!lod)tri(a,b,[0,base+.038,0],dark);}
    }
    const g=geom(vs,cs,null,uv);return g;
  }
  function scatter(scene){
    const clusters=[[],[],[],[]],rocks=[],dummy=new T.Object3D(),tint=new T.Color();
    function forest(x,z,size){
      const ground=V.terrain(x,z),bank=Math.abs(x-V.riverX(z))-V.riverWidth(z);
      if(bank<2||ground>184)return;
      if(z<-328&&z>-475&&x>-22&&x<65&&N(x*.011,z*.009)>.20)return;
      const line=-z*.0493;
      if(Math.abs(x-line)<5.9 && z<15 && z>-585)return;
      if([[0,0],[11.47,-232.9],[27.93,-566.4]].some(([sx,sz])=>Math.abs(x-sx-2)<14&&Math.abs(z-sz)<14))return;
      const h=size*(.69+rand()*.6);if(ground+h>V.route(V.clamp(-z,0,V.END)).y-2&&Math.abs(x-line)<10)return;
      clusters[Math.floor(rand()*4)].push([x,ground-.25,z,h,rand()*6,rand()]);
    }
    for(let i=0;i<5900;i++){
      const x=(rand()-.5)*1280,z=135-rand()*942;
      const grove=N(x*.019,z*.019);
      if(rand()<.33+grove*.58)forest(x,z,5.5+grove*10);
    }
    for(let i=0;i<790;i++){const x=-105+rand()*215,z=35-rand()*335;if(N(x*.026,z*.028)>.30)forest(x,z,5+rand()*7);}
    for(let grove=0;grove<330;grove++){
      const x=(rand()-.5)*480,z=72-rand()*808,density=7+Math.floor(rand()*11);
      for(let j=0;j<density;j++){const angle=rand()*Math.PI*2,rad=Math.sqrt(rand())*22;
        forest(x+Math.cos(angle)*rad,z+Math.sin(angle)*rad,7.6+rand()*6.4);}
    }
    const bending={value:new Float32Array(8)};
    // Local root cells bind each tree to its damped crown angle.
    const needles=mat(0xffffff,.92,0,{vertexColors:true,side:T.DoubleSide});
    needles.onBeforeCompile=shader=>{
      shader.uniforms.crownAngle=bending;
      shader.vertexShader='uniform float crownAngle[8];\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec2 stand=instanceMatrix[3].xz;
        int cell=int(mod(floor(stand.x/31.)+floor(stand.y/47.)*3.,8.));
        vec3 lean=vec3(1.,0.,.27)*crownAngle[cell]*position.y*position.y;
        transformed+=transpose(mat3(instanceMatrix))*lean/max(dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),.001)*length(instanceMatrix[1].xyz);
      `);
    };
    clusters.forEach((rows,k)=>{
      const tree=fir(275+k,k!==0),patches=[[],[],[],[],[]];
      for(const row of rows){
        const [x,,z]=row,near=Math.abs(x+z*.049)<58&&z<52&&z>-630;
        patches[near?1+Math.min(3,Math.max(0,Math.floor(-z/160))):0].push(row);
      }
      patches.forEach((patch,j)=>{
        if(!patch.length)return;
        const o=new T.InstancedMesh(tree,needles,patch.length);
        patch.forEach(([x,y,z,h,a,r],i)=>{
          dummy.position.set(x,y,z);dummy.rotation.set(.018*Math.sin(a),a,.024*Math.cos(a));dummy.scale.set(h*(.83+r*.26),h,h);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);
          tint.setRGB(.72+r*.26,.74+r*.23,.76+r*.20);o.setColorAt(i,tint);
        });o.castShadow=j>0;o.receiveShadow=true;scene.add(o);
      });
    });
    for(let i=0;i<1200;i++){
      const z=65-rand()*832,side=rand()>.5?1:-1,x=V.riverX(z)+side*(V.riverWidth(z)-3+rand()**1.8*36);
      const y=V.terrain(x,z),h=.42+rand()**2*3.5;rocks.push([x,y-.3,z,h,rand()*5,rand()]);
    }
    const o=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0x92938a,.73,.025),rocks.length);
    rocks.forEach(([x,y,z,h,a,r],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(a,.5*a,.34*a);dummy.scale.set(h*1.8,h*.76,h*1.2);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);tint.setRGB(.65+r*.34,.7+r*.30,.71+r*.26);o.setColorAt(i,tint);});
    o.receiveShadow=true;scene.add(o);
    return s=>{for(let i=0;i<8;i++)bending.value[i]=s.crowns[i].q;};
  }
  function river(scene){
    const vs=[],cs=[],is=[],uv=[],nz=490,nx=12;
    const shoal=col(0x82b4a7),deep=col(0x327d80);
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const z=-810+j*965/nz,u=i/nx*2-1,x=V.riverX(z)+u*(V.riverWidth(z)+2.7);
      const c=deep.clone().lerp(shoal,.13+.52*Math.abs(u)**3+.24*N(x*.15,z*.08));
      vs.push(x,V.waterY(z),z);cs.push(c.r,c.g,c.b);uv.push(x*.4,z*.4);
      if(i<nx&&j<nz){const k=j*(nx+1)+i;is.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);}
    }
    const g=geom(vs,cs,is,uv),m=mat(0xffffff,.21,.32,{vertexColors:true,envMapIntensity:.62});
    const o=mesh(g,m,scene);o.castShadow=false;
    const ripples=[];
    // Short crests separate at bends; each ribbon follows its own water cell.
    const surf=[],idx=[],base=[],ripUV=[];
    for(let i=0;i<1240;i++){
      const z=-680+rand()*760,off=(rand()-.5)*1.85,x=V.riverX(z)+off*V.riverWidth(z),length=.3+rand()**1.4*3.6;
      const w=.035+rand()*.11,slot=(i*13)%32,sl=rand()*.3-.15;const k=surf.length/3;
      for(let a=0;a<5;a++){let v=a/4-.5;let xx=x+v*length,zz=z+v*sl+v*v*.45;
        for(let b=0;b<2;b++){surf.push(xx,V.waterY(zz)+.085,zz+b*w*Math.sin(a*Math.PI/4));base.push(zz+b*w*Math.sin(a*Math.PI/4));ripUV.push(a/4,b);}
        if(a<4){let p=k+a*2;idx.push(p,p+1,p+2,p+2,p+1,p+3);}
      }ripples.push(slot);
    }
    const fg=geom(surf,null,idx,ripUV);const foam=mesh(fg,mat(0xbdd7c7,.35,.14,{transparent:true,opacity:.57,depthWrite:false,side:T.DoubleSide}),scene);foam.castShadow=false;
    return function(s){
      const p=g.attributes.position.array;
      for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
        const k=(j*(nx+1)+i)*3,z=p[k+2],w=s.water[(j+i*3)%32],w2=s.water[(j+1+i*3)%32];
        p[k+1]=V.waterY(z)+w.h*.65+w2.h*.35;
      }g.attributes.position.needsUpdate=true;g.computeVertexNormals();
      const a=fg.attributes.position.array;for(let i=0;i<ripples.length;i++){const w=s.water[ripples[i]];
        for(let k=i*10;k<i*10+10;k++){a[k*3+2]=base[k]+w.h*2.8;a[k*3+1]=V.waterY(a[k*3+2])+.10+w.h*.65;}
      }fg.attributes.position.needsUpdate=true;
    };
  }
  return {mat,mesh,vec,sky,mountains,land,scatter,river,geom,field};
})();
