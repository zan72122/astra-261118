'use strict';
const HillArt=(()=>{
  const T=THREE,W=HillWind,V=(x,y,z)=>new T.Vector3(x,y,z),col=c=>new T.Color(c);
  const rand=W.randomSource(13171),r=(a,b)=>a+(b-a)*rand(),choose=a=>a[Math.floor(rand()*a.length)];
  const one=new T.Vector3(1,1,1),up=V(0,1,0),q=new T.Quaternion(),temp=new T.Object3D();
  const box=new T.BoxGeometry(1,1,1),orb=new T.SphereGeometry(1,14,10),stone=new T.IcosahedronGeometry(1,1),cylinder=new T.CylinderGeometry(1,1,1,12);
  function mat(color,rough=.86,metalness=0,extra={}){
    const m=new T.MeshStandardMaterial({color,roughness:rough,metalness,...extra});
    m.onBeforeCompile=s=>{
      s.vertexShader='varying vec3 vGrain;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGrain=position;');
      s.fragmentShader='varying vec3 vGrain;\n'+s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+.022*sin(dot(vGrain,vec3(83.1,62.7,37.4))),.025,1.);');};
    return m;
  }
  // Weld all stationary parts sharing a finish into a single indexed draw.
  class Batch{
    constructor(){this.p=[];this.n=[];this.c=[];this.idx=[];}
    add(g,color,matrix,shade) {
      const p=g.attributes.position,n=g.attributes.normal,base=this.p.length/3,c=col(color),nm=new T.Matrix3().getNormalMatrix(matrix),vv=V(0,0,0),nn=V(0,0,0);
      for(let i=0;i<p.count;i++){vv.fromBufferAttribute(p,i).applyMatrix4(matrix);nn.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();
        this.p.push(vv.x,vv.y,vv.z);this.n.push(nn.x,nn.y,nn.z);const k=shade?shade(vv,nn):1;
        this.c.push(c.r*k,c.g*k,c.b*k);}
      const count=g.index?g.index.count:p.count;for(let i=0;i<count;i++)this.idx.push(base+(g.index?g.index.getX(i):i));
    }
    place(g,c,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz);temp.scale.set(sx,sy,sz);temp.updateMatrix();this.add(g,c,temp.matrix);}
    beam(a,b,rad,c,end=rad){const d=b.clone().sub(a),mid=a.clone().addScaledVector(d,.5),rot=new T.Quaternion().setFromUnitVectors(up,d.clone().normalize());
      this.add(end===rad?cylinder:new T.CylinderGeometry(end/rad,1,1,9),c,new T.Matrix4().compose(mid,rot,V(rad,d.length(),rad)));}
    build(parent,material,cast=true,receive=true){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.n,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.setIndex(this.idx);
      const m=new T.Mesh(g,material||mat(0xffffff,.86,0,{vertexColors:true}));m.castShadow=cast;m.receiveShadow=receive;parent.add(m);return m;}
  }
  function mesh(parent,geo,material,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function noise(x,z){
    function h(i,j){const n=Math.sin(i*127.1+j*311.7)*43758.5453123;return n-Math.floor(n);}
    const a=Math.floor(x),b=Math.floor(z),u=W.smooth(x-a),v=W.smooth(z-b);
    return W.mix(W.mix(h(a,b),h(a+1,b),u),W.mix(h(a,b+1),h(a+1,b+1),u),v);
  }
  function terrainTexture(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#bfc3a5';ctx.fillRect(0,0,256,256);
    for(let i=0;i<30400;i++){const x=r(0,256),y=r(0,256);ctx.strokeStyle=choose(['#85907d55','#75846a48','#faf0c448','#b3ab8f6b','#64795a37']);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+r(-1,1.3),y+r(.4,2.4));ctx.stroke();}
    const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
  const pathX=z=>1.8+1.35*Math.sin(.11*z+1)+.09*(-z)+.72*Math.sin(.38*z);
  function countryside(scene) {
    const g=new T.BufferGeometry(),p=[],colors=[],uv=[],idx=[],nx=164,nz=126,turf=terrainTexture();
    const grassA=col('#88a353'),grassB=col('#bdc575'),pathC=col('#d4bb8e'),cc=new T.Color();
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const x=(i/nx-.5)*108,z=W.mix(14,W.coast(x),j/nz),co=W.ground(x,z),n=noise(x*.38,z*.38),n2=noise(x*.095-3,z*.095);
      const w=.53+W.smooth((-z-6)/18)*.55,d=Math.abs(x-pathX(z));
      cc.copy(grassA).lerp(grassB,.13+.47*n2+.34*n);
      cc.lerp(pathC,W.smooth((w+.26*n-d)/.46)*.93);
      p.push(x,co,z);colors.push(cc.r,cc.g,cc.b);uv.push(x*.7,z*.7);
      if(j<nz&&i<nx){const a=j*(nx+1)+i;idx.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}
    }
    g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const field=mesh(scene,g,mat(0xffffff,.94,0,{vertexColors:true,map:turf}));field.castShadow=false;
    const b=new Batch(),glass=new Batch();
    // Light limestone breaks into strata along the edge of the bay.
    for(let i=0;i<210;i++){const x=-54+i*.52,z=W.coast(x)+r(-.6,.2),y=W.ground(x,z);
      b.place(stone,choose(['#b9b4a1','#c9c2ab','#c2bda9','#a6a493']),x,y-1.56,z,r(.65,1.5),r(1.8,2.7),r(.62,1.6),r(-.12,.12),r(0,6));}
    // Low dry stone wall, a little way down the hill with an opening for the track.
    for(let i=-37;i<42;i++){const x=i*.56,z=-10.8+Math.sin(x*.22)*1.2;if(Math.abs(x-pathX(z))<1.1)continue;
      for(let j=0;j<2;j++)b.place(stone,choose(['#a6a28a','#b7b399','#969c85','#c5c0a6']),x+r(-.12,.12),W.ground(x,z)+.09+j*.22,z+r(-.08,.08),r(.32,.49),r(.15,.24),r(.22,.33),r(-.14,.19),r(0,6));}
    const foliageColors=['#798e58','#647f57','#7e915b','#849660','#57765a','#97a26a'];
    function tree(x,z,size){
      const y=W.ground(x,z);b.beam(V(x,y-.05,z),V(x+.05*size,y+1.23*size,z),.105*size,'#7a7158',.054*size);
      for(let j=0;j<8;j++){const a=j*2.4,spread=j<6?r(.3,.59):.1,dx=Math.cos(a)*spread*size,dz=Math.sin(a)*spread*size,dy=(j<6?r(1.12,1.42):r(1.62,1.87))*size;
        if(j<3)b.beam(V(x,y+.65*size,z),V(x+dx,y+dy,z+dz),.045*size,'#756e54');
        b.place(stone,choose(foliageColors),x+dx,y+dy,z+dz,r(.48,.72)*size,r(.49,.71)*size,r(.48,.68)*size,.1,r(0,6));}
    }
    const roofG=new T.BufferGeometry();roofG.setAttribute('position',new T.Float32BufferAttribute([-1,0,-1,1,0,-1,0,1,-1,-1,0,1,1,0,1,0,1,1],3));roofG.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);roofG.computeVertexNormals();
    function house(x,z,sz,angle) {
      const y=W.ground(x,z)-.19,w=r(.85,1.19)*sz,h=r(.86,1.22)*sz,d=r(1.05,1.55)*sz;const c=choose(['#eadbbd','#f4e8cd','#d9c5ac','#e9d0b0','#dfdbcc']);
      const co=Math.cos(angle),si=Math.sin(angle);
      function item(batch,g,c,lx,ly,lz,sx,sy,sz){batch.place(g,c,x+lx*co+lz*si,y+ly,z-lx*si+lz*co,sx,sy,sz,0,angle);}
      item(b,box,c,0,h*.5,0,w,h,d);item(b,roofG,choose(['#a46c55','#ac735c','#bea180','#918c7e','#a47e66','#88928b']),0,h,0,w*.605,w*.58,d*.56);
      item(b,box,'#c8b29a',w*.25,h+w*.46,-d*.22,w*.17,w*.62,w*.17);
      item(b,box,'#9f8873',w*.25,h+w*.78,-d*.22,w*.21,w*.07,w*.21);
      item(b,box,'#c4a48a',0,h+w*.572,0,w*.080,w*.048,d*1.14);
      for(const side of [-1,1])item(b,box,'#b3a08a',side*w*.55,h-.021,0,w*.10,w*.068,d*1.12);
      for(const xx of [-.26,.26]){item(b,box,'#ebe4cc',xx*w,h*.57,d*.505,w*.24,h*.37,.036);item(glass,box,'#678081',xx*w,h*.57,d*.525,w*.17,h*.29,.033);}
      item(b,box,'#827c6c',0,h*.23,d*.514,w*.17,h*.46,.044);
      for(const zz of [-.25,.25])item(glass,box,'#7b8b84',w*.51,h*.57,d*zz,.032,h*.27,w*.16);
    }
    for(let row=0;row<4;row++)for(let j=0;j<19;j++){
      const z=-19.8-row*4.5+r(-1.05,.96),x=-31+j*3.05+(row%2)*1.1+r(-.7,.65);
      if(Math.abs(x-pathX(z))<1.5||rand()<.25)continue;house(x,z,r(.81,1.32),r(-.69,.57));}
    for(let i=0;i<104;i++){const x=r(-42,40),z=r(-43,-14);if(Math.abs(x-pathX(z))<1.6)continue;tree(x,z,r(.65,1.65));}
    // A working harbour beacon on the near headland.
    const lx=-5.7,lz=-40,ly=W.ground(lx,lz);
    b.place(new T.CylinderGeometry(.44,.69,3.15,20),'#eee6ca',lx,ly+1.49,lz,1,1,1);
    for(let j=0;j<2;j++)b.place(new T.CylinderGeometry(.548-j*.079,.575-j*.079,.46,20),'#b6614f',lx,ly+1.26+j*.98,lz,1,1,1);
    b.place(cylinder,'#646e68',lx,ly+3.12,lz,.61,.13,.61);glass.place(cylinder,'#92b4b6',lx,ly+3.48,lz,.35,.6,.35);
    for(let j=0;j<6;j++){const a=j*Math.PI/3;b.place(cylinder,'#606b64',lx+.36*Math.cos(a),ly+3.48,lz+.36*Math.sin(a),.028,.65,.028);}
    b.place(new T.ConeGeometry(.56,.49,16),'#ad6653',lx,ly+3.99,lz,1,1,1);
    // An offshore limestone shelf rises above the tide, with grass only on its crown.
    for(let j=0;j<31;j++){
      const x=7.4+j*.56,z=-76+.32*j+1.25*Math.sin(j*.27),profile=Math.sin(Math.PI*j/31);
      const crest=-8.41+profile*(1.1+.45*Math.sin(j*.47));
      b.place(stone,'#b9b8a4',x,crest-.84,z,.96,1.09,1.22,0,r(0,6));
      b.place(stone,choose(['#9baa78','#a4af81','#97a57c']),x,crest+.03,z,.89,.28,.94,0,r(0,6));
      if(j%3===0)b.place(stone,'#c2c1ac',x+.38,-8.45,z+1.32,r(.5,1.1),.37,.61,0,r(0,6));}
    // Long low islands, with an irregular silhouette dipping into the water.
    for(let i=0;i<86;i++){
      const group=i%3,cx=[-72,46,115][group],cz=[-144,-178,-140][group],x=cx+r(-35,35),z=cz+r(-4,4);
      const height=2.3+3.6*Math.pow(Math.max(0,1-Math.abs(x-cx)/36),1.7);
      b.place(stone,choose(['#8eaa9f','#90aaa8','#9db3ab']),x,-8.7,z,r(4,11),height*r(.46,.9),r(3,9),0,r(0,6));}
    // The foreground is a meadow, with stone and pale seed heads in the grass.
    for(let i=0;i<850;i++){const x=r(-16,16),z=r(-14,7),path=Math.abs(x-pathX(z))<.75;
      if(!path && rand()>.23)continue;const scale=path?r(.012,.062):r(.05,.21);
      b.place(stone,choose(['#a7a991','#bcb49e','#979b86','#d0c2a3']),x,W.ground(x,z)+.008,z,scale,scale*.48,scale*.82,0,r(0,6));}
    // Weathered chestnut rails follow the outer bend of the path.
    const posts=[];
    for(let j=0;j<7;j++){const z=1.1-j*1.68,x=2.75+.48*Math.sin(z*.33),y=W.ground(x,z),lean=.055*Math.sin(j*2.2);
      const bottom=V(x,y-.10,z),top=V(x+lean,y+.61+r(-.04,.05),z+.022);
      b.beam(bottom,top,.057,'#8b8268',.052);posts.push({x:x+lean*.62,y,z});}
    for(let j=0;j<posts.length-1;j++){const a=posts[j],n=posts[j+1];for(const d of [.23,.47]){
      b.beam(V(a.x-.032,a.y+d,a.z+.05),V(n.x-.032,n.y+d,n.z-.048),.029,'#aaa085',.034);}}
    b.build(scene);glass.build(scene,mat(0xffffff,.18,.27,{vertexColors:true}));
  }
  function meadow(scene){
    const p=[],idx=[],c=[],attrs=[],flowers=new Batch();
    const palette=['#789740','#89a14c','#a6b558','#859d47','#acb965','#9cae5a','#728f46'].map(col);
    for(let i=0;i<19000;i++){
      const x=r(-18,18),z=r(-14,7),y=W.ground(x,z),onPath=Math.abs(x-pathX(z))<.42+.21*rand();
      if(onPath && rand()<.98)continue;
      const cell=((Math.floor((x+30)*.64)%6)+6*((Math.floor((z+32)*.73)%5)))%30;
      const cluster=r(.63,1.4)*(.72+.58*noise(x,z)),color=choose(palette);
      for(let j=0;j<(i%3?3:5);j++){
        const px=x+r(-.052,.052),pz=z+r(-.043,.043),h=r(.065,.24)*cluster*(onPath?.39:1),angle=r(0,6.28),w=r(.007,.018)*cluster,lx=Math.sin(angle)*h*.37,lz=Math.cos(angle)*h*.37;
        const wx=Math.cos(angle)*w,wz=-Math.sin(angle)*w,base=p.length/3;
        p.push(px-wx,y-.018,pz-wz,px+wx,y-.018,pz+wz,px+lx*.4-wx*.5,y+h*.63,pz+lz*.4-wz*.5,px+lx*.4+wx*.5,y+h*.63,pz+lz*.4+wz*.5,px+lx,y+h,pz+lz);
        for(const f of [0,0,.39,.39,1]){attrs.push(cell,f*h);const shade=.65+.41*f+.085*rand();c.push(color.r*shade,color.g*shade,color.b*shade);}
        idx.push(base,base+2,base+1,base+1,base+2,base+3,base+2,base+4,base+3);
      }
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(c,3));
    geo.setAttribute('blade',new T.Float32BufferAttribute(attrs,2));geo.setIndex(idx);geo.computeVertexNormals();
    const bends=Array.from({length:30},()=>new T.Vector2()),m=mat(0xffffff,.91,0,{vertexColors:true,side:T.DoubleSide});
    const original=m.onBeforeCompile;m.onBeforeCompile=s=>{original(s);s.uniforms.bends={value:bends};
      s.vertexShader='attribute vec2 blade; uniform vec2 bends[30];\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vec2 b=bends[int(blade.x)];float angle=length(b);transformed.xz+=blade.y*b*(sin(angle)/max(.00001,angle)); transformed.y+=blade.y*(cos(angle)-1.);');};
    const lawn=mesh(scene,geo,m);lawn.castShadow=false;
    const petal=new T.BufferGeometry();
    petal.setAttribute('position',new T.Float32BufferAttribute([-1,0,0,-.5,.21,-.73,.50,.33,-.94,1,.45,-.43,1,.45,.43,.50,.33,.94,-.5,.21,.73,0,.13,0],3));
    petal.setIndex([7,1,0,7,2,1,7,3,2,7,4,3,7,5,4,7,6,5,7,0,6]);petal.computeVertexNormals();
    const pollen=new T.IcosahedronGeometry(1,0),stem=new T.CylinderGeometry(.7,1,1,4);
    for(let i=0;i<490;i++){const cx=r(-12,12),cz=r(-10,6);if(Math.abs(cx-pathX(cz))<.7)continue;
      const kind=rand(),hue=kind<.63?'#fff6d9':kind<.90?'#f1c14e':'#9b9cbb';
      for(let n=0;n<(i%3?2:4);n++){const x=cx+r(-.24,.24),z=cz+r(-.19,.19),y=W.ground(x,z),h=r(.1,.31);
        flowers.place(stem,'#728a48',x,y+h*.48,z,.005,h,.005,.035,0,.035);
        const count=kind<.63?8:5,size=r(.013,.026);
        for(let k=0;k<count;k++){const a=k/count*Math.PI*2;flowers.place(petal,hue,x+Math.cos(a)*size*.8,y+h+.002,z+Math.sin(a)*size*.8,size*.83,size*.29,size*.43,.12,-a,.2);}
        flowers.place(pollen,'#d9a734',x,y+h+.008,z,size*.48,size*.32,size*.48);}
    }
    const flowerMesh=flowers.build(scene,mat(0xffffff,.85,0,{vertexColors:true}),false,true);
    // Flower stalks share the local meadow bend, anchored at their individual ground height.
    const fp=flowerMesh.geometry.attributes.position,fa=[];
    for(let i=0;i<fp.count;i++){const x=fp.getX(i),z=fp.getZ(i);fa.push(((Math.floor((x+30)*.64)%6)+6*(Math.floor((z+32)*.73)%5))%30,Math.max(0,fp.getY(i)-W.ground(x,z))*.54);}
    flowerMesh.geometry.setAttribute('blade',new T.Float32BufferAttribute(fa,2));flowerMesh.material.onBeforeCompile=m.onBeforeCompile;
    return s=>{s.cells.forEach((c,i)=>bends[i].set(c.side,-c.bend));};
  }
  function cloudGeometry(seed){
    const rr=W.randomSource(seed),blobs=[[-.94,-.035,.04,.79,.32,.5],[-.34,.23,0,.7,.55,.53],[.25,.37,.01,.62,.68,.59],[.8,.14,-.02,.57,.45,.46],[1.15,-.015,.02,.42,.25,.39],[0,-.08,.06,1.24,.25,.54]];
    for(let i=0;i<19;i++){const x=rr()*2.45-1.22;blobs.push([x,.02+rr()*(.48-.18*Math.abs(x)),rr()*.7-.35,.21+rr()*.32,.15+rr()*.25,.2+rr()*.21]);}
    function field(x,y,z){let d=2;for(const b of blobs){const n=(Math.hypot((x-b[0])/b[3],(y-b[1])/b[4],(z-b[2])/b[5])-1)*Math.min(b[3],b[4],b[5]);
      const h=Math.max(.091-Math.abs(d-n),0)/.091;d=Math.min(d,n)-h*h*.091*.25;}return d+.013*Math.sin(17*x+4*z)*Math.sin(18*y-z)*Math.sin(12*z+x);}
    const ps=[],ns=[],cs=[],nx=40,ny=21,nz=18,points=[],values=[];
    const index=(x,y,z)=>x+(nx+1)*(y+(ny+1)*z);
    for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const a=V(-1.95+x*3.9/nx,-.55+1.84*y/ny,-.95+1.9*z/nz);points.push(a);values.push(field(a.x,a.y,a.z));}
    const tetra=[[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]];
    const vert=(a,b)=>points[a].clone().lerp(points[b],values[a]/(values[a]-values[b]));
    function tri(a,b,c){const o=a.clone().add(b).add(c).multiplyScalar(1/3),ep=.006,n=V(field(o.x+ep,o.y,o.z)-field(o.x-ep,o.y,o.z),field(o.x,o.y+ep,o.z)-field(o.x,o.y-ep,o.z),field(o.x,o.y,o.z+ep)-field(o.x,o.y,o.z-ep));
      if(b.clone().sub(a).cross(c.clone().sub(a)).dot(n)<0){const k=b;b=c;c=k;}for(const v of [a,b,c]){const k=1+.1*Math.max(0,v.y);ps.push(v.x,v.y,v.z);cs.push(.93*k,.93*k,.91*k);}}
    for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
      const ids=[0,1,2,3,4,5,6,7].map(i=>index(x+(i&1),y+((i>>1)&1),z+((i>>2)&1)));
      if(ids.every(i=>values[i]>0)||ids.every(i=>values[i]<=0))continue;
      for(const t of tetra){const inside=t.map(i=>ids[i]).filter(i=>values[i]<0),outside=t.map(i=>ids[i]).filter(i=>values[i]>=0);
        if(inside.length===1||outside.length===1){const a=inside.length===1?inside:outside,b=inside.length===1?outside:inside;tri(...b.map(n=>vert(a[0],n)));}
        else if(inside.length===2){const [a,b]=inside,[c,d]=outside,A=vert(a,c),B=vert(a,d),C=vert(b,c),D=vert(b,d);tri(A,B,C);tri(B,D,C);}}}
    // Analytic field normals keep the cloud banks soft at the joins.
    const gradCache=new Map();for(let i=0;i<ps.length;i+=3){const x=ps[i],y=ps[i+1],z=ps[i+2],key=x.toFixed(4)+','+y.toFixed(4)+','+z.toFixed(4);let n=gradCache.get(key);if(!n){const e=.023;n=V(field(x+e,y,z)-field(x-e,y,z),field(x,y+e,z)-field(x,y-e,z),field(x,y,z+e)-field(x,y,z-e)).normalize();gradCache.set(key,n);}ns.push(n.x,n.y,n.z);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('normal',new T.Float32BufferAttribute(ns,3));g.setAttribute('color',new T.Float32BufferAttribute(cs,3));return g;
  }
  function skyAndSea(scene){
    const evening={value:0},skyMat=mat(0xffffff,1,0,{side:T.BackSide,fog:false,depthWrite:false});
    skyMat.onBeforeCompile=s=>{s.uniforms.evening=evening;s.vertexShader='varying vec3 skyDir;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nskyDir=position;');
    s.fragmentShader='varying vec3 skyDir;uniform float evening;\n'+s.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 dir=normalize(skyDir);float altitude=1.-exp(-max(0.,dir.y)*8.5);
      vec3 day=mix(vec3(.61,.76,.77),vec3(.067,.209,.410),altitude);
      vec3 dusk=mix(vec3(1.08,.53,.278),vec3(.25,.274,.478),altitude);
      float d=distance(dir,normalize(vec3(-10.+5.*evening,18.-17.*evening,6.-31.*evening)));
      outgoingLight=mix(day,dusk,evening)+vec3(1.,.83,.62)*(.08*exp(-3.5*d)+.54*exp(-29.*d)+.59*(1.-smoothstep(.017,.022,d)));
      #include <opaque_fragment>`);};
    const dome=mesh(scene,new T.SphereGeometry(420,48,28),skyMat);dome.castShadow=dome.receiveShadow=false;dome.renderOrder=-20;
    const cg=cloudGeometry(571),cloudMat=mat('#fffaee',1,0,{vertexColors:true,emissive:'#ced5dc',emissiveIntensity:.30});
    const sizes=[3.3,3.55,4.9,3.55,4.15,4.6,3.25,1.67,2.25,2.9];
    const clouds=sizes.map((a,i)=>{const m=mesh(scene,cg,cloudMat);m.scale.set(a*(i%2?.95:1.15),a*(i%3?.72:.84),a*.85);m.rotation.y=i*2.37;m.castShadow=m.receiveShadow=false;return m;});
    const waves={value:new Float32Array(48)},waterMat=mat('#79adad',.27,.23);
    waterMat.onBeforeCompile=s=>{s.uniforms.waveH=waves;s.vertexShader='uniform float waveH[48];varying vec3 seaP;\n'+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      int ix=int(mod(floor(position.x*.26+200.),8.));int iz=int(mod(floor(position.z*.19+200.),6.));float wh=waveH[ix+iz*8];
      transformed.y+=wh*.53;seaP=transformed;`);
      s.fragmentShader='uniform float waveH[48];varying vec3 seaP;\n'+s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float u=seaP.x*.33+seaP.z*2.47;int k=int(mod(floor((seaP.x+seaP.z)*.18+200.),48.));float wh=waveH[k];
      float ripple=sin(u+wh*14.+.93*sin(seaP.x*.56))*.041+sin(u*2.17+seaP.x*.71-wh*8.)*.025;
      normal=normalize(normal+vec3(ripple,.018*cos(u+wh*7.),0.));`).replace('#include <color_fragment>',`#include <color_fragment>
      float band=.5+.5*sin(seaP.z*1.97+.5*sin(seaP.x*1.58)+seaP.y*13.);diffuseColor.rgb*=.94+.11*band;`);};
    const seaGeo=new T.PlaneGeometry(520,372,180,144);seaGeo.rotateX(-Math.PI/2);seaGeo.translate(0,-8.38,-146);const sea=mesh(scene,seaGeo,waterMat);sea.castShadow=false;
    const foam=new Batch(),foamPebble=new T.SphereGeometry(1,7,4);for(let i=0;i<780;i++){const x=r(-53,53),z=W.coast(x)-r(.05,1.48);foam.place(foamPebble,choose(['#c2d8c9','#dfdfc7','#a8c9b9']),x,-8.29+r(-.018,.01),z,r(.12,.81),r(.008,.029),r(.037,.12));}foam.build(scene,null,false,false);
    const boat=new T.Group();scene.add(boat);const b=new Batch();b.place(orb,'#a07757',0,0,0,.44,.20,1.15);b.place(orb,'#f5e4be',0,.085,0,.42,.13,1.13);
    b.beam(V(0,0,.18),V(0,2.2,.18),.028,'#977859');
    const sail=new T.BufferGeometry();sail.setAttribute('position',new T.Float32BufferAttribute([0,2.13,.15,0,.31,.13,.12,.44,-.98,0,1.85,.24,0,.35,1.05,.07,.4,.27],3));sail.computeVertexNormals();b.add(sail,'#fff0ce',new T.Matrix4());b.build(boat,mat(0xffffff,.81,0,{vertexColors:true,side:T.DoubleSide}));
    const sail2=boat.clone();scene.add(sail2);sail2.scale.setScalar(.58);
    return s=>{evening.value=s.sunset;clouds.forEach((m,i)=>{const c=s.clouds[i];m.position.set(c.x,c.y,c.z);});s.waves.forEach((w,i)=>waves.value[i]=w.h);
      boat.position.set(s.boat.x,-8.31+s.waves[12].h,s.boat.z);boat.rotation.set(s.waves[8].h,s.boat.heading+1,s.boat.heel);
      sail2.position.set(6+s.boat.x*.13,-8.34+s.waves[3].h,-82+2*s.waves[6].h);sail2.rotation.set(0,-.8+s.boat.heading*.28,s.waves[9].h);};
  }
  return {V,col,r,choose,mat,mesh,Batch,box,orb,stone,cylinder,countryside,meadow,skyAndSea};
})();
