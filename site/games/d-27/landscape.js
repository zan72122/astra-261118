/* Procedural terrain, carpentry and planting. All dimensions are in metres.
   Static models share drawn geometry by material. Nothing is downloaded. */
function terraceLandscape(scene,renderer) {
  'use strict';
  const T=THREE, root=new T.Group(), still=new T.Group(), rnd=Tanada.generator(82036);
  scene.add(root);root.add(still);
  const V=(x,y,z)=>new T.Vector3(x,y,z), TAU=Math.PI*2, C=x=>new T.Color(x);
  const rr=(a,b)=>a+(b-a)*rnd(), clamp=Tanada.clamp;
  function hash(x,z){const q=Math.sin(x*127.1+z*311.7)*43758.5453;return q-Math.floor(q);}
  function noise(x,z){let i=Math.floor(x),j=Math.floor(z),a=x-i,b=z-j;a=a*a*(3-2*a);b=b*b*(3-2*b);
    return (hash(i,j)*(1-a)+hash(i+1,j)*a)*(1-b)+(hash(i,j+1)*(1-a)+hash(i+1,j+1)*a)*b;}
  const fb=(x,z)=>.55*noise(x,z)+.28*noise(x*2.13+4,z*2.13)+.13*noise(x*4.3,z*4.3)+.04*noise(x*9,z*9);
  function surfaceTexture(wood=false) {
    const size=256, bytes=new Uint8Array(size*size*4);
    for(let j=0;j<size;j++)for(let i=0;i<size;i++){
      const n=wood ? .36*noise(i*.28+Math.sin(j*.045)*1.6,j*.015)+.50*noise(i*.78,j*.023)+.14*rnd()
        : .32*rnd()+.34*noise(i*.15,j*.15)+.34*noise(i*.045,j*.045);
      const a=(j*size+i)*4,v=wood?140+103*n:163+88*n;bytes[a]=v;bytes[a+1]=v;bytes[a+2]=v;bytes[a+3]=255;
    }
    const t=new T.DataTexture(bytes,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
  }
  const grain=surfaceTexture(),woodgrain=surfaceTexture(true);
  const mat=(color,opt={})=>new T.MeshStandardMaterial({color,roughness:.84,roughnessMap:grain,side:T.DoubleSide,...opt});
  const earth=mat('#ffffff',{map:grain,vertexColors:true}),green=mat('#ffffff',{vertexColors:true});
  const wood=mat('#94724e',{map:woodgrain}),darkwood=mat('#614b37',{map:woodgrain}),cutwood=mat('#c39862',{map:woodgrain}),bamboo=mat('#a1a172',{map:woodgrain}),rope=mat('#b5a17a',{map:grain});
  const iron=mat('#526362',{roughness:.36,metalness:.72}), brass=mat('#b59860',{roughness:.31,metalness:.64});
  const boxGeo=new T.BoxGeometry(1,1,1), sphere=new T.IcosahedronGeometry(1,1), round=new T.SphereGeometry(1,14,10);
  const breeze={value:new T.Vector4()};
  green.onBeforeCompile=sh=>{
    sh.uniforms.uBreeze=breeze;
    sh.vertexShader='uniform vec4 uBreeze;\n'+sh.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vec3 site=(modelMatrix*vec4(position,1.)).xyz;
      float band=clamp((site.z+3.)*.41,0.,2.999);
      int n=int(floor(band));
      float air=mix(uBreeze[n],uBreeze[n+1],fract(band));
      transformed.x+=air*.14*uv.y*uv.y*(.84+.16*sin(site.x*2.1));
      transformed.z+=air*.043*uv.y*uv.y;`);
  };
  function mesh(g,m,p=still){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function box(p,w,h,d,m,parent=still){const o=mesh(boxGeo,m,parent);o.position.copy(p);o.scale.set(w,h,d);return o;}
  function oval(p,x,y,z,m,parent=still,smooth=false){const o=mesh(smooth?round:sphere,m,parent);o.position.copy(p);o.scale.set(x,y,z);return o;}
  const cylCache=new Map();
  function stick(a,b,r,m,parent=still,r2=r,sides=9){
    const k=[sides,Math.round(r2/r*50)].join('-');
    if(!cylCache.has(k))cylCache.set(k,new T.CylinderGeometry(r2/r,1,1,sides));
    const d=b.clone().sub(a),o=mesh(cylCache.get(k),m,parent);o.position.copy(a).addScaledVector(d,.5);
    o.quaternion.setFromUnitVectors(V(0,1,0),d.clone().normalize());o.scale.set(r,d.length(),r);return o;
  }
  function board(a,b,w,d,m,parent=still){const v=b.clone().sub(a),o=box(a.clone().lerp(b,.5),w,v.length(),d,m,parent);o.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return o;}
  function grid(nx,ny,point,reverse=false){
    const pos=[],col=[],uv=[],idx=[];
    for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
      const a=point(x/nx,y/ny),p=a[0];pos.push(p.x,p.y,p.z);const c=a[1]||C('white');col.push(c.r,c.g,c.b);
      uv.push(...(a[2]||[x/nx,y/ny]));
    }
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,d=a+nx+1,e=d+1;
      if(reverse)idx.push(a,d,b,b,d,e);else idx.push(a,b,d,b,e,d);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  const shade=(a,b,f)=>C(a).lerp(C(b),clamp(f));
  // A luminous atmosphere around real ridgelines. Cloud density is fixed in
  // directional space, so the same sky is visible from the fields' reflection camera.
  const skyMat=mat('#ffffff',{side:T.BackSide,depthWrite:false,fog:false});
  const dusk={value:0};
  skyMat.onBeforeCompile=sh=>{
    sh.uniforms.uDusk=dusk;
    sh.vertexShader='varying vec3 skyDir;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nskyDir=position;');
    sh.fragmentShader='varying vec3 skyDir; uniform float uDusk;\n'+
      `float dh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float dn(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(dh(a),dh(a+vec2(1,0)),f.x),mix(dh(a+vec2(0,1)),dh(a+1.),f.x),f.y);}
      `+sh.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 dir=normalize(skyDir);float h=max(dir.y,0.);vec2 cp=dir.xz/(h+.065);
      float depth=1.-exp(-3.5*h);
      vec3 sky=mix(vec3(.80,.86,.77),vec3(.24,.49,.62),depth);
      float n=dn(cp*.69)*.53+dn(cp*1.22)*.28+dn(cp*2.69)*.14+dn(cp*5.77)*.05;
      float cloud=smoothstep(.49,.74,n)*smoothstep(.003,.09,h);
      sky=mix(sky,vec3(1.,.96,.824),cloud*.85);
      float sunDot=max(0.,dot(dir,normalize(vec3(-.30,.070,-1.))));
      sky+=vec3(.72,.48,.21)*pow(sunDot,25.) + vec3(1.5,1.1,.68)*smoothstep(.99977,.99988,sunDot);
      vec3 eve=mix(vec3(.98,.54,.32),vec3(.125,.20,.35),1.-exp(-3.8*h));
      eve=mix(eve,vec3(.95,.63,.46),cloud*.66);
      outgoingLight=mix(sky,eve,uDusk);#include <opaque_fragment>`.replace(';#',';\n#'));
  };
  const sky=mesh(new T.SphereGeometry(140,40,20),skyMat,scene);sky.castShadow=false;sky.receiveShadow=false;sky.renderOrder=-5;
  const sun=new T.DirectionalLight('#fff0cc',2.15);sun.position.set(-10,15,-6);sun.target.position.set(0,0,0);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:.5,far:42});
  sun.shadow.normalBias=.018;sun.shadow.bias=-.00033;sun.shadow.radius=3;scene.add(sun,sun.target);
  const hemi=new T.HemisphereLight('#d9eaec','#a59471',1.48);scene.add(hemi);
  scene.fog=new T.FogExp2('#dce2d1',.017);
  const ridges=[
    [-69,18,8.8,5.6,'#96aeb3','#b8c8c5',.52],[-47,15,6.1,5.8,'#899fa1','#a8b8af',2.4],
    [-31,11,3.65,4.9,'#748e84','#91a391',5.1],[-18.4,8,1.25,4.5,'#5b766c','#81957a',7.7],
    [-12.4,6,-.95,3.6,'#586f59','#8a9973',9.2]];
  function ridgeY(x,v,R) {
    const [z,depth,base,amp,,,k]=R;
    const ridge=base+amp*(.50*Math.sin(x*.127+k)+.29*Math.cos(x*.233-k*.85)+.9*(fb(x*.133,k)-.45));
    return ridge - v*(3.6+depth*.5) + 1.95*Math.sin(v*Math.PI)*fb(x*.35,k+v*2);
  }
  ridges.forEach((R,i)=>{
    const o=mesh(grid(220,15,(u,v)=>{const x=(u-.5)*145,z=R[0]+v*R[1]+1.3*Math.sin(x*.153+R[6]);
      const y=ridgeY(x,v,R),n=fb(x*.29+v, z*.4);
      return [V(x,y,z),shade(R[4],R[5],clamp(.16+.68*n+.18*(1-v)+.16*Math.cos(x*.68+v*6))),[x*.35,z*.35]];},true),earth);
    o.castShadow=false;
  });
  // Tree lines follow the ridge instead of floating above the skyline.
  const forestGeo=grid(10,6,(u,v)=>{
    const a=u*TAU,whorl=(1-v)*(.55+.38*Math.pow(Math.sin(v*Math.PI*3+.25),2));
    const r=Math.max(.018,whorl*(.8+.15*Math.sin(a*5+v*11)+.1*Math.cos(a*3-v*8)));
    return [V(Math.cos(a)*r,v*3,Math.sin(a)*r),shade('#445b4c','#8c9a77',.1+.46*v+.22*Math.cos(a*2+v*13))];},true);
  for(let l=1;l<5;l++){const R=ridges[l];const count=l===4?240:170;
    for(let i=0;i<count;i++){const x=rr(-44,44),v=rr(.008,.65),z=R[0]+v*R[1]+1.3*Math.sin(x*.153+R[6]);const h=rr(.19,.60)*(l===4?1.4:1);
      const p=mesh(forestGeo,green);p.position.set(x,ridgeY(x,v,R)-.10,z);p.scale.set(h*rr(.6,1.2),h,h);p.rotation.y=rnd()*6;p.castShadow=false;}}
  const defs=[
    [-1.28,3.33,-4.23,2.68,1.47],[-.34,2.48,-2.43,3.95,1.75],
    [-.31,1.58,-.40,4.70,1.77],[.13,.70,1.71,5.12,1.83],[-.11,-.18,3.87,5.64,2.06]
  ];
  const angles=[1.64,.73,2.45,.81,1.65];
  function edge(i,a,r=1){
    const [cx,y,cz,w,d]=defs[i],ca=Math.cos(a),sa=Math.sin(a);
    const x=Math.sign(ca)*Math.pow(Math.abs(ca),.88),z=Math.sign(sa)*Math.pow(Math.abs(sa),.87);
    const wav=1+.044*Math.sin(3*a+i*.78)+.034*Math.cos(4*a-.8*i)+.015*Math.sin(6*a+1.4);
    return V(cx+r*(w*x*wav + .40*z*z-.18),y,cz+r*(d*z*wav+.25*Math.sin(x*2.8+i*.81)+.18*x));
  }
  const nearAngle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function rimY(i,a,r){
    const n=fb(7*Math.cos(a)+i,7*Math.sin(a));
    const notch=Math.exp(-(nearAngle(a,angles[i])**2)/(.015/(1+i*.25)));
    const crest=Math.max(0,1-Math.abs(r-.946)/.087);
    return defs[i][1]+.035+crest*(.20+.09*n)-notch*(.14*crest+.065)+.025*(n-.5);
  }
  function floorY(i,p,r){return defs[i][1]-.18+.12*Math.pow(r,.9)+.063*(fb(p.x*1.34+i,p.z*1.54)-.47)+.015*Math.sin(p.z*12+p.x*.84);}
  function lowland(x,z){const bed=1.26-z*.415 - Math.max(0,-z-5.2)*.95;
    const skirt=Math.max(0,Math.abs(x+.2)-3.75);return bed-1.12 - .23*skirt + .48*(fb(x*.51,z*.41)-.48)+.115*Math.sin(x*1.2+z*.4);}
  mesh(grid(128,110,(u,v)=>{const x=(u-.5)*42,z=-14+30*v,y=lowland(x,z);const n=fb(x*.45,z*.45);
    return [V(x,y,z),shade('#68674b','#acb17a',n*1.33),[x*.45,z*.45]];},true),earth);
  // Two sloping side ridges frame the cultivated hollow.
  function sideHeight(x,z,side){const cx=side*(side<0?6.9:7.25);
    return lowland(x,z)+Math.exp(-((x-cx)**2/7.7+(z+3.7)**2/15))*(side<0?2.11:2.65);}
  for(const sign of [-1,1])mesh(grid(55,58,(u,v)=>{const x=sign*(3.6+u*16),z=-13+v*27,n=fb(x*.8,z*.8);
    return [V(x,sideHeight(x,z,sign)+.015,z),shade('#626e4f','#adb882',n*1.20),[x*.76,z*.76]];},sign>0),earth);
  const models={};
  // Irregular boulders have their own silhouette and stone grain.
  const stoneGeos=[];
  for(let k=0;k<13;k++){const g=new T.IcosahedronGeometry(1,1),p=g.attributes.position,colors=[],base=rnd();
    for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j),n=fb(x*2.4+k*4,z*2.4+y*1.2),r=.80+.40*n;
      p.setXYZ(j,(x+.12*y)*r,Math.max(-.72,y*r),z*r+.10*x*y);const moss=clamp((y-.26)*.76+n*.54-.20);
      const c=shade('#64675b','#a8a48d',base*.37+n*.7).lerp(C('#8c965e'),moss);colors.push(c.r,c.g,c.b);}
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();stoneGeos.push(g);}
  function rock(x,y,z,w,h,d,a=rnd()*TAU,parent=still){
    const o=mesh(stoneGeos[Math.floor(rnd()*stoneGeos.length)],earth,parent);o.position.set(x,y,z);o.scale.set(w,h,d);o.rotation.y=a;return o;}
  const grassGeometry=[],grassColor=['#6a7a45','#84935c','#9fa970','#beb77b'];
  for(let g=0;g<7;g++){
    const pos=[],co=[],uv=[],ix=[];
    for(let j=0;j<9;j++){
      const bx=rr(-.09,.09),bz=rr(-.09,.09),a=rr(0,TAU),h=rr(.11,.36),lean=rr(.05,.17),w=rr(.009,.019);
      const c=C(grassColor[Math.floor(rnd()*4)]),base=pos.length/3;
      for(let l=0;l<3;l++){
        const t=l/2,dx=Math.sin(a)*lean*t*t,dz=Math.cos(a)*lean*t*t,k=w*(1-.96*t);
        pos.push(bx+dx+Math.cos(a)*k,h*t,bz+dz-Math.sin(a)*k,bx+dx-Math.cos(a)*k,h*t,bz+dz+Math.sin(a)*k);
        for(let q=0;q<2;q++){const m=.57+.54*t;co.push(c.r*m,c.g*m,c.b*m);uv.push(q,t);}
      }
      ix.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4,base+3,base+5,base+4);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(co,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();grassGeometry.push(geo);
  }
  function grass(p,size=1,parent=still){const o=mesh(grassGeometry[Math.floor(rnd()*7)],green,parent);o.position.copy(p);o.scale.setScalar(size);o.rotation.y=rr(0,TAU);o.castShadow=false;return o;}
  const petal=mat('#e2d9ac'),gold=mat('#c7a753');
  function flowers(p,n=5){for(let j=0;j<n;j++){const a=rr(0,TAU),x=p.x+rr(-.20,.20),z=p.z+rr(-.16,.16),h=rr(.16,.37);
    stick(V(x,p.y,z),V(x+.035,p.y+h,z),.007,bamboo);const t=V(x+.035,p.y+h,z);
    for(let i=0;i<5;i++){const b=a+i*TAU/5;const o=oval(V(t.x+.027*Math.cos(b),t.y+.008,t.z+.027*Math.sin(b)),.028,.012,.024,petal);o.rotation.z=.21*Math.cos(b);}
    oval(t,.019,.022,.019,gold);}}
  for(let i=0;i<5;i++){
    const [cx,y,cz]=defs[i];
    mesh(grid(112,19,(u,v)=>{const p=edge(i,u*TAU,v*.91);p.y=floorY(i,p,v);
      const n=fb(p.x*1.75+12,p.z*1.7);return [p,shade('#64593e','#a7996d',.21+.67*n+.17*Math.cos(p.z*12+p.x*.84)),[p.x*.92,p.z*.92]];}),earth);
    mesh(grid(128,9,(u,v)=>{const a=u*TAU,r=.854+v*.171,p=edge(i,a,r),n=fb(p.x*2.7,p.z*2.7);
      p.y=rimY(i,a,r)-(1-clamp((r-.854)/.065))*.15;
      return [p,shade('#6c7545','#b2ad73',n*.92+.18*Math.sin(v*Math.PI)),[p.x,p.z]];}),earth);
    mesh(grid(128,10,(u,v)=>{const a=u*TAU,p=edge(i,a,1.025+v*.058),n=fb(p.x*2.4,p.z*2+v*2);
      p.y=rimY(i,a,1.025)-v*(1.70+.4*n);
      const c=shade('#756346','#a99a76',n*.84+.11*Math.sin(v*22+p.x*1.5)).lerp(C('#778052'),Math.exp(-v*8)*.72);
      return [p,c,[u*27,v*2.6]];}),earth);
    // Hand-laid retaining stones break into earthen banks between patches.
    for(let layer=0;layer<3;layer++){
      const count=32+i*5;
      for(let j=0;j<count;j++){const a=(j+layer*.47+rr(-.10,.1))/count*Math.PI;
        if(noise(a*2.2+i,layer*.2)<.33||Math.abs(nearAngle(a,angles[i]))<.13)continue;
        const p=edge(i,a,1.033+layer*.013);p.y=y-.15-layer*.235+rr(-.04,.04);
        const dx=edge(i,a+.016).sub(edge(i,a-.016));rock(p.x,p.y,p.z,rr(.24,.41),rr(.14,.205),rr(.10,.17),-Math.atan2(dx.z,dx.x));}
    }
    for(let n=0;n<270+i*34;n++){const a=rr(0,TAU),r=rr(.912,1.025);
      if(Math.abs(nearAngle(a,angles[i]))<.13||noise(a*4,i*2.2)<.18)continue;
      const p=edge(i,a,r);p.y=rimY(i,a,r)-.008;grass(p,rr(.32,1.12));
      if(n%85===0)flowers(p,3);
    }
  }
  for(let i=0;i<1160;i++){const x=rr(-12,12),z=rr(-8.4,12.4);
    if(Math.abs(x)<5.1 && z<5.88)continue;const y=(Math.abs(x)>=3.6?sideHeight(x,z,Math.sign(x)):lowland(x,z))+.012;
    grass(V(x,y,z),rr(.70,2.1));if(i%100===0)rock(x,y,z,rr(.23,.68),rr(.17,.38),rr(.20,.48));if(i%119===0)flowers(V(x,y,z),5);}
  // Twisted red pine, with branched limbs, uneven needle pads and open sky gaps.
  const leafShapes=[];
  for(let k=0;k<9;k++){
    const g=new T.IcosahedronGeometry(1,2),pos=g.attributes.position,cs=[];
    for(let j=0;j<pos.count;j++){const x=pos.getX(j),y=pos.getY(j),z=pos.getZ(j),n=fb(x*8.8+k,z*8.9+y*5);
      const scale=.74+n*.50;pos.setXYZ(j,x*scale,(y*.79+n*.40)*scale,z*scale);
      const c=shade('#344e3d','#839264',clamp(.10+.37*n+.42*Math.max(0,y)+.11*noise(x*17,z*17)));cs.push(c.r,c.g,c.b);}
    g.setAttribute('color',new T.Float32BufferAttribute(cs,3));g.computeVertexNormals();leafShapes.push(g);}
  function needles(p,w,h,d){const m=mesh(leafShapes[Math.floor(rnd()*9)],green);m.position.copy(p);m.scale.set(w,h,d);m.rotation.y=rr(0,TAU);return m;}
  function pine(x,y,z,h,turn){
    const pts=[V(x,y,z),V(x+.06*h,y+h*.26,z+.018*h),V(x-.025*h,y+h*.57,z+.018*h),V(x+.09*h,y+h*.82,z-.02*h),V(x+.055*h,y+h,z)];
    for(let j=0;j<4;j++)stick(pts[j],pts[j+1],h*(.036-j*.006),darkwood,still,h*(.030-j*.006),10);
    for(let i=0;i<16;i++){
      const f=i/16,j=Math.min(3,Math.floor((.26+f*.72)*4)),p=pts[j].clone().lerp(pts[j+1],.32);
      const a=turn+i*2.399,arm=h*(.30-.16*f)*rr(.81,1.25),tip=p.clone().add(V(Math.cos(a)*arm,h*.075,Math.sin(a)*arm));
      const elbow=p.clone().lerp(tip,.57);elbow.y-=h*.062;
      stick(p,elbow,h*(.015-.008*f),darkwood,still,h*.010);stick(elbow,tip,h*.010,darkwood,still,h*.004);
      for(let m=0;m<5;m++){const b=a+rr(-1.9,1.9),l=h*rr(.024,.12);
        const e=tip.clone().add(V(Math.cos(b)*l,rr(0,.049)*h,Math.sin(b)*l));needles(e,h*rr(.102,.19)*(1-f*.25),h*rr(.044,.080),h*rr(.09,.17));}
    }
    needles(pts[4],h*.14,h*.065,h*.115);
  }
  pine(-4.67,sideHeight(-4.67,-4.5,-1),-4.5,3.76,1.3);
  pine(-6.9,sideHeight(-6.9,-4.1,-1),-4.1,4.35,.55);
  pine(7.05,sideHeight(7.05,-4.2,1),-4.2,3.68,2.5);
  for(let i=0;i<43;i++){const side=i%2?-1:1,x=side*rr(6.2,13.8),z=rr(-10,-2.25);
    const y=sideHeight(x,z,side),h=rr(.68,1.8),p=mesh(forestGeo,green);p.position.set(x,y-.15,z);p.scale.set(h*.86,h,h*.91);p.rotation.y=rr(0,TAU);}
  // Gassho-style farm shelter: hipped thatch, raised sill, shoji panes, bundled ridge.
  const house=new T.Group();still.add(house);const hx=4.67,hz=-4.72,hy=sideHeight(hx,hz,1)+.06;
  house.position.set(hx,hy,hz);house.rotation.y=-.24;
  const plaster=mat('#d2c9aa',{map:grain}),paper=mat('#dfd6b8',{roughness:.62}),thatch=mat('#897752',{map:woodgrain});
  const roofMats=['#94825e','#a18d64','#86744f','#ac9970','#7d7055'].map(c=>mat(c,{map:woodgrain}));
  for(const x of [-.89,.89])for(const z of [-.57,.57]){
    const wx=hx+Math.cos(house.rotation.y)*x+Math.sin(house.rotation.y)*z;
    const wz=hz-Math.sin(house.rotation.y)*x+Math.cos(house.rotation.y)*z;
    const ground=sideHeight(wx,wz,1)-hy;
    if(ground<.02){
      rock(x,ground+.05,z,.205,.14,.18,0,house);
      stick(V(x,ground+.04,z),V(x,.09,z),.097,darkwood,house);
    }
  }
  box(V(0,.11,0),2.08,.24,1.46,darkwood,house);
  box(V(0,.72,0),1.91,1.19,1.31,plaster,house);
  for(let i=0;i<5;i++){const x=-.88+i*.44;box(V(x,.73,.673),.048,1.25,.065,darkwood,house);}
  box(V(0,.245,.70),1.99,.16,.09,wood,house);box(V(0,1.23,.70),2.04,.09,.09,darkwood,house);
  box(V(-.39,.70,.694),.73,.77,.018,paper,house);
  for(let i=0;i<6;i++)box(V(-.75+i*.145,.70,.716),.022,.77,.033,wood,house);
  for(let i=0;i<4;i++)box(V(-.39,.34+i*.233,.717),.74,.024,.033,wood,house);
  box(V(.44,.67,.70),.54,.89,.055,darkwood,house);
  for(let i=0;i<6;i++)box(V(.20+i*.081,.66,.739),.06,.84,.018,wood,house);
  for(let i=0;i<4;i++){box(V(.974,.74,-.58+i*.38),.048,1.18,.045,darkwood,house);}
  box(V(0,.11,.89),2.20,.103,.49,cutwood,house);
  for(const x of [-1.03,1.03])stick(V(x,.05,.99),V(x,1.29,.99),.049,wood,house);
  const roof=grid(72,15,(u,v)=>{
    const a=u*TAU,ca=Math.cos(a),sa=Math.sin(a),m=Math.max(Math.abs(ca),Math.abs(sa)),x=ca/m,z=sa/m;
    const w=1.39*(1-v)+.81*v,d=1.01*(1-v)+.065*v;
    return [V(x*w,1.19+v*1.12+.065*x*x+.035*(1-v)*Math.cos(a*13),z*d),shade('#716346','#ad9870',.31+.51*fb(u*91,v*4)),[u*24,v]];
  },true);mesh(roof,earth,house);
  for(const side of [-1,1])for(let j=0;j<88;j++){
    const f=j/87,x=-1+2*f;const bot=V(x*1.38,1.21+.06*x*x+rr(-.035,.035),side*1.045),top=V(x*.82,2.335+.063*x*x,side*.047);
    stick(bot,top,rr(.014,.025),roofMats[j%5],house,.010,5);}
  for(const side of [-1,1])for(let j=0;j<40;j++){
    const f=j/39,z=-1+2*f;stick(V(side*1.39,1.255+rr(-.035,.035),z*1.025),V(.82*side,2.40,z*.06),.020,roofMats[j%5],house,.008,5);}
  stick(V(-.94,2.39,0),V(.94,2.39,0),.093,darkwood,house);
  for(let i=0;i<8;i++)stick(V(-.83+i*.234-.045,2.36,-.085),V(-.83+i*.234+.045,2.46,.085),.022,rope,house);
  // Bamboo fences are sparse enough to see the water, and lashings wrap their joints.
  function fence(points,h=.49){
    points.forEach((p,i)=>{const top=p.clone().add(V(.018,h*rr(.96,1.06),0));stick(p,top,.041,bamboo);
      for(const v of [.48,.80]){const j=p.clone().lerp(top,v);stick(j.clone().add(V(0,-.021,0)),j.clone().add(V(0,.021,0)),.052,rope);
        if(i)stick(points[i-1].clone().add(V(0,h*v,0)),j,.028,bamboo);}
    });
  }
  fence(Array.from({length:7},(_,i)=>{const p=edge(1,3.35+i*.137,.99);p.y=rimY(1,3.35+i*.137,.99);return p;}),.47);
  fence(Array.from({length:6},(_,i)=>{const x=3.45+i*.46,z=-3.43+i*.024;return V(x,sideHeight(x,z,1),z);}),.55);
  fence(Array.from({length:5},(_,i)=>{const a=2.93-i*.09,p=edge(3,a,.96);p.y=rimY(3,a,.96);return p;}),.37);
  // Stepping stones on the downhill footpath.
  for(let j=0;j<18;j++){const z=-3.2+j*.48,x=4.75+.86*Math.sin(j*.17)-.30*Math.cos(j*.64);
    const y=sideHeight(x,z,1);rock(x,y+.025,z,rr(.21,.35),rr(.07,.12),rr(.17,.28));}
  const waterGroup=new T.Group();root.add(waterGroup);
  const reflections={value:null},eveningReflection={value:null},waters=[],waterUniforms=[];
  function waterMaterial(i){
    const m=mat('#73a7a1',{roughness:.16,metalness:.22,envMapIntensity:.54});
    const uniforms={uWaterTravel:{value:0},uWind:{value:0},uWave:{value:0},uDusk:dusk,uReflect:reflections,uEvening:eveningReflection,uSpring:{value:i===0?1:0}};
    waterUniforms.push(uniforms);
    m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,uniforms);
      sh.vertexShader='varying vec3 pondW;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\npondW=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader=`varying vec3 pondW; uniform samplerCube uReflect,uEvening; uniform float uWaterTravel,uWave,uWind,uDusk,uSpring;\n`+
      sh.fragmentShader.replace('#include <opaque_fragment>',`
        vec2 p=pondW.xz; float travel=uWaterTravel;
        float w1=sin(p.y*18.+p.x*2.7+travel*1.9+sin(p.x*4.-travel*.7));
        float w2=sin(p.y*36.-p.x*7.0+travel*2.3+sin(p.x*2.6+p.y*4.3));
        float w3=sin(p.y*8.3+p.x*2.+travel*.6+sin(p.x*3.+p.y*1.2));
        float wn=.58*w1+.22*w2+.20*w3;
        vec3 N=normalize(vec3(.026*sin(p.x*10.+p.y*5.+travel)+uWind*.07,1.,wn*(.091+abs(uWind)*.07)+uWave));
        vec3 E=normalize(cameraPosition-pondW),R=reflect(-E,N);
        vec3 env=textureCube(uReflect,vec3(R.x,R.y,R.z)).rgb;
        float fres=pow(1.-max(dot(N,E),0.),2.);
        vec3 deep=mix(vec3(.085,.257,.250),vec3(.080,.286,.294),uSpring);
        vec3 water=mix(deep,env,.32+.44*fres);
        float line=smoothstep(.83,.98,w1)*smoothstep(.30,.80,w2)*(.45+.55*sin(p.x*5.+p.y*3.+.4*travel));
        water+=vec3(.11,.14,.13)*max(0.,line);
        vec3 sunset=mix(vec3(.123,.157,.153),textureCube(uEvening,R).rgb,.47+.45*fres)+vec3(.15,.09,.055)*max(0.,line);
        outgoingLight=mix(water*.83+outgoingLight*.17,sunset*.93+outgoingLight*.07,uDusk);
        #include <opaque_fragment>`);};
    return m;
  }
  for(let i=0;i<5;i++){const g=grid(100,18,(u,v)=>{const p=edge(i,u*TAU,.907*v);p.y=defs[i][1]-.106;return [p,C('white'),[p.x,p.z]];});
    const o=mesh(g,waterMaterial(i),waterGroup);o.castShadow=false;waters.push(o);}
  // The spring seeps between stones under a bamboo kakei.
  const springPos=edge(0,4.31,.69);
  for(let j=0;j<19;j++){const a=3.05+j*.17,p=edge(0,a,rr(.63,.94));
    rock(p.x,p.y+.08,p.z,rr(.22,.53),rr(.18,.45),rr(.20,.48));if(j%3===0)grass(p,1.4);}
  const sp=V(springPos.x,springPos.y+.62,springPos.z+.26);
  const post=sp.clone().add(V(0,-.69,-.52));stick(post,post.clone().add(V(0,.90,0)),.072,bamboo);
  stick(sp.clone().add(V(-.03,.14,-.96)),sp,.076,bamboo,still,.073);
  const hollow=mat('#363d2f');oval(sp.clone().add(V(0,0,.012)),.058,.058,.015,hollow);
  const wetMat=mat('#a1c9c3',{roughness:.18,metalness:.30}),foam=mat('#d2e4d8',{roughness:.31});
  models.sp=sp;models.rings=[];
  for(let i=0;i<4;i++){const o=mesh(new T.TorusGeometry(1,.014,5,64),foam,root);o.rotation.x=-Math.PI/2;o.castShadow=false;models.rings.push(o);}
  const springThread=mesh(new T.CylinderGeometry(.027,.044,.68,10),wetMat,root);springThread.position.copy(sp).add(V(0,-.34,.027));models.springThread=springThread;
  const mudMats=Array.from({length:6},()=>mat('#876c4a',{map:grain}));
  models.clods=[];const outlet=edge(0,angles[0],.96);models.soilAnchor=outlet.clone();
  // Staggered lumps sit in the mouth of a shallow, stone-lined cut.
  for(let j=0;j<6;j++){
    const group=new T.Group();root.add(group);group.position.copy(outlet).add(V((j-2.5)*.125,.01,(j%2)*.05));
    for(let k=0;k<4;k++){const o=oval(V(rr(-.048,.048),k===0?.080:rr(.02,.14),rr(-.075,.075)),rr(.093,.138),rr(.105,.16),rr(.12,.19),mudMats[j],group);
      o.rotation.set(rr(-.5,.5),rr(0,5),rr(-.3,.3));}models.clods.push(group);}
  models.mudMats=mudMats;
  // A small forged trowel, hammered concave blade and a turned wooden grip.
  const shovel=new T.Group();root.add(shovel);models.shovel=shovel;
  const bladeMat=mat('#859495',{metalness:.78,roughness:.30});
  mesh(grid(10,14,(u,v)=>{const width=.011+.15*Math.sin(Math.PI*v*.83)**.59;
    return [V((u*2-1)*width,v*.46,(1-(u*2-1)**2)*.044*Math.sin(Math.PI*v)+v*v*.085),C('#ffffff')];}),bladeMat,shovel);
  stick(V(0,.37,.057),V(0,.69,.13),.039,iron,shovel,.027);
  stick(V(0,.59,.115),V(0,1.12,.234),.055,cutwood,shovel,.065,16);
  oval(V(0,1.115,.231),.066,.071,.065,cutwood,shovel,true);stick(V(0,.58,.111),V(0,.65,.128),.061,brass,shovel);
  const soilParticle=new T.InstancedMesh(sphere,mat('#826e50',{map:grain}),100);soilParticle.count=0;soilParticle.castShadow=true;soilParticle.frustumCulled=false;root.add(soilParticle);models.soilParticle=soilParticle;
  models.outlets=[];models.falls=[];models.drops=[];
  for(let i=0;i<4;i++){const a=angles[i],p=edge(i,a,.93);p.y=defs[i][1]+.015;
    const q=edge(i,a,1.08);q.z+=i===0?.08:.16;q.y=p.y-.09;
    const dest=q.clone().add(V((i===2?-.05:.05),0,.26));dest.y=defs[i+1][1]-.10;
    models.outlets.push({p,q,dest});
    const dir=q.clone().sub(p);dir.y=0;dir.normalize();const side=V(dir.z,0,-dir.x),width=i===0?.37:.42;
    for(let j=0;j<2;j++){const sign=j?1:-1,l=p.clone().addScaledVector(side,width*sign),r=q.clone().addScaledVector(side,width*sign);
      if(i===1||i===2){board(l.clone().add(V(0,-.035,0)),r.clone().add(V(0,-.035,0)),.072,.082,darkwood);
        stick(l,r,.042,cutwood);}
      else for(let k=0;k<5;k++){const b=l.clone().lerp(r,k/4);rock(b.x,b.y-.008,b.z,.133,.105,.15);}}
    const base=grid(7,13,(u,v)=>{const b=p.clone().lerp(q,v).addScaledVector(side,(u*2-1)*width);b.y-=.12;
      return [b,shade('#615944','#898471',noise(u*4,v*4))];});mesh(base,earth);
    const ribbon=grid(11,26,(u,v)=>[V(0,0,0),C('#ffffff'),[u,v]]);
    const fallMat=mat('#93c4bd',{roughness:.23,metalness:.26,transparent:true,depthWrite:false});
    const current={value:0};
    fallMat.onBeforeCompile=sh=>{
      sh.uniforms.uStream=current;
      sh.vertexShader='varying vec2 streamUV;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstreamUV=uv;');
      sh.fragmentShader='varying vec2 streamUV; uniform float uStream;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',`
        float thread=.5+.5*sin(streamUV.x*57.+.85*sin(uStream*3.-streamUV.y*15.));
        float light=smoothstep(.73,1.,thread)*(.55+.45*sin(streamUV.y*43.-uStream*7.+streamUV.x*12.));
        outgoingLight+=vec3(.36,.40,.38)*light;
        diffuseColor.a=.62+.25*thread;
        #include <opaque_fragment>`);
    };
    const fall=mesh(ribbon,fallMat,root);fall.frustumCulled=false;fall.castShadow=false;models.falls.push({fall,side,width,dir,current});
    const drops=new T.InstancedMesh(round,foam,28);drops.count=0;drops.frustumCulled=false;root.add(drops);models.drops.push(drops);
  }
  const gp=models.outlets[1].p,gate=new T.Group();root.add(gate);models.gate=gate;
  gate.position.copy(gp);gate.rotation.y=.55;const gateFrame=new T.Group();still.add(gateFrame);gateFrame.position.copy(gp);gateFrame.rotation.y=.55;
  for(const sign of [-1,1]){stick(V(sign*.41,-.16,0),V(sign*.41,.69,0),.048,darkwood,gateFrame);
    stick(V(sign*.41,.52,0),V(sign*.41,.575,0),.053,rope,gateFrame);}
  stick(V(-.52,.60,0),V(.52,.60,0),.051,cutwood,gateFrame);
  for(let i=0;i<3;i++){box(V(0,i*.108,0),.77,.10,.082,wood,gate);}
  stick(V(0,.15,0),V(0,.65,0),.032,darkwood,gate);stick(V(-.13,.66,0),V(.13,.66,0),.032,brass,gate);
  // Undershot mill wheel: two segmented wooden rims, mortised spokes and scoops.
  const wp=models.outlets[2].dest.clone().add(V(-.11,.67,.035)),mill=new T.Group();root.add(mill);
  mill.position.copy(wp);mill.rotation.y=-.69;models.wheel=mill;models.wheelAnchor=wp;
  const ax=new T.Group();still.add(ax);ax.position.copy(wp);ax.rotation.y=mill.rotation.y;
  for(let s of [-1,1]){
    board(V(-.38,-.59,s*.31),V(0,.05,s*.31),.082,.085,darkwood,ax);
    board(V(.38,-.59,s*.31),V(0,.05,s*.31),.082,.085,wood,ax);
    stick(V(0,0,-.46),V(0,0,.46),.083,cutwood,ax);
  }
  const rotor=new T.Group();mill.add(rotor);models.rotor=rotor;
  for(let j=0;j<12;j++){
    const a=j*TAU/12,b=(j+1)*TAU/12;
    for(const z of [-.16,.16]){
      const A=V(Math.cos(a)*.60,Math.sin(a)*.60,z),B=V(Math.cos(b)*.60,Math.sin(b)*.60,z);
      board(A,B,.085,.061,wood,rotor);board(V(0,0,z),A,.046,.047,cutwood,rotor);
      oval(A,.026,.026,.022,iron,rotor);}
    const paddle=box(V(.617*Math.cos(a),.617*Math.sin(a),0),.178,.045,.46,darkwood,rotor);paddle.rotation.z=a+.15;
  }
  stick(V(0,0,-.24),V(0,0,.24),.122,wood,rotor, .122,14);
  const twig=new T.Group();mill.add(twig);twig.position.set(.39,-.28,.21);models.twig=twig;
  stick(V(-.29,-.23,0),V(.23,.37,0),.030,cutwood,twig,.013);
  stick(V(.03,.13,0),V(.20,.18,-.05),.017,darkwood,twig,.009);
  // Curved seedling rows and the portable planting frame.
  models.shoots=[];models.shootP=[];
  function frontBank(i,x,r){
    let previous=edge(i,0,r),front=-Infinity;
    for(let j=1;j<=160;j++){const p=edge(i,TAU*j/160,r);
      if((previous.x-x)*(p.x-x)<=0 && Math.abs(p.x-previous.x)>.00001)
        front=Math.max(front,previous.z+(p.z-previous.z)*(x-previous.x)/(p.x-previous.x));
      previous=p;
    }return front;
  }
  const riceGeo=grassGeometry[2];
  for(let i=0;i<28;i++){
    const row=Math.floor(i/7),j=i%7,x=-2.66+j*.86,back=frontBank(2,x,1.11)+.10,front=frontBank(3,x,.83);
    const p=V(x,defs[3][1]-.081,back+(front-back)*(.06+row*.29));const rice=mesh(riceGeo,green,root);rice.position.copy(p);rice.scale.setScalar(.001);
    models.shoots.push(rice);models.shootP.push(p);
  }
  // Old stubble in the wet furrows helps reveal the new waterline.
  const stubble=mat('#abaa72');
  for(let i=1;i<=4;i++){const [cx,y,cz,w,d]=defs[i];
    for(let iz=0;iz<7;iz++)for(let ix=0;ix<23;ix++){
      const nx=(ix-11)/12,nz=(iz-3)/4+.034*Math.cos(nx*3.3+i);
      if(nx*nx+nz*nz>.73||noise(ix*.4+i,iz*.7)<.28)continue;
      const p=V(cx+nx*w,0,cz+nz*d);p.y=floorY(i,p,Math.sqrt(nx*nx+nz*nz));
      for(let j=0;j<3;j++){const b=p.clone().add(V(rr(-.03,.03),0,rr(-.03,.03)));
        stick(b,b.clone().add(V(rr(-.045,.045),rr(.038,.12),rr(-.03,.03))),.008,stubble,still,.003,4);}
    }}
  const tray=new T.Group();root.add(tray);const trayP=edge(3,2.61,.66);trayP.y=defs[3][1]-.035;tray.position.copy(trayP);tray.rotation.y=-.12;models.tray=tray;
  box(V(0,0,0),.84,.066,.49,wood,tray);
  for(const k of [-1,1]){box(V(0,.07,k*.236),.85,.11,.035,cutwood,tray);box(V(k*.404,.07,0),.035,.11,.49,cutwood,tray);}
  for(let i=0;i<18;i++)grass(V(-.32+(i%6)*.125,.055,-.15+Math.floor(i/6)*.14),.93,tray);
  // A few quiet details on the banks, including the frogs' three low perches.
  models.frogs=[];
  const frogSkin=mat('#879658',{roughness:.46}), frogEye=mat('#33372b',{roughness:.18}),eyeGold=mat('#c9b16c',{roughness:.32});
  for(let i=0;i<3;i++){const a=[2.16,1.66,.93][i],p=edge(4,a,.94);p.y=rimY(4,a,.94);
    rock(p.x,p.y-.013,p.z,.27,.15,.22);const group=new T.Group();root.add(group);group.position.copy(p).add(V(0,.117,0));group.rotation.y=[.58,-.47,-.80][i];
    oval(V(0,.041,0),.13,.099,.162,frogSkin,group,true);oval(V(0,.095,.112),.123,.079,.096,frogSkin,group,true);
    for(const sign of [-1,1]){oval(V(sign*.117,.025,-.05),.071,.046,.116,frogSkin,group,true);
      oval(V(sign*.075,.154,.135),.038,.040,.034,eyeGold,group,true);oval(V(sign*.075,.16,.16),.023,.016,.013,frogEye,group,true);}
    const throat=oval(V(0,.074,.181),.070,.037,.046,mat('#d5cd99',{roughness:.48}),group,true);models.frogs.push({group,throat});}
  models.fireflies=[];const glows=mat('#d1dd89',{emissive:'#f5db87',emissiveIntensity:2.0,roughness:.44});
  for(let i=0;i<18;i++){const o=oval(V(0,0,0),.02,.02,.02,glows,root,true);o.castShadow=false;models.fireflies.push(o);}
  // A physical brass-colored arc and drifting pollen mark the object within the world.
  const beaconMat=mat('#f8df8e',{emissive:'#e9b961',emissiveIntensity:.54,roughness:.42});
  const beacon=new T.Group();root.add(beacon);models.beacon=beacon;
  for(let k=0;k<3;k++){const arc=mesh(new T.TorusGeometry(.50,.015,6,32,1.55),beaconMat,beacon);arc.rotation.x=-Math.PI/2;arc.rotation.z=k*TAU/3;arc.castShadow=false;}
  models.pollen=[];
  for(let j=0;j<7;j++){const p=oval(V(0,0,0),.025,.025,.025,beaconMat,root,true);p.castShadow=false;models.pollen.push(p);}
  // Collect fixed pieces, preserving normal transforms, UVs and vertex colours.
  // This keeps thousands of individual stalks and hillside trees to a few draws.
  function batch(group){
    group.updateWorldMatrix(true,true);
    const inv=group.matrixWorld.clone().invert(),cache=new Map(),id=new T.Matrix4(),nm=new T.Matrix3(),pt=V(0,0,0),norm=V(0,0,0);
    group.traverse(o=>{if(!o.isMesh)return;
      const m=o.material,key=m.uuid+Number(o.castShadow);let b=cache.get(key);
      if(!b){b={pos:[],norm:[],uv:[],col:[],idx:[],mat:m,sh:o.castShadow};cache.set(key,b);}
      const g=o.geometry,base=b.pos.length/3,attr=g.attributes;
      id.multiplyMatrices(inv,o.matrixWorld);nm.getNormalMatrix(id);
      for(let j=0;j<attr.position.count;j++){
        pt.fromBufferAttribute(attr.position,j).applyMatrix4(id);b.pos.push(pt.x,pt.y,pt.z);
        norm.fromBufferAttribute(attr.normal,j).applyNormalMatrix(nm);b.norm.push(norm.x,norm.y,norm.z);
        b.uv.push(attr.uv?attr.uv.getX(j):0,attr.uv?attr.uv.getY(j):0);
        if(m.vertexColors){const c=attr.color;b.col.push(c?c.getX(j):1,c?c.getY(j):1,c?c.getZ(j):1);}
      }
      const indices=g.index;if(indices)for(let j=0;j<indices.count;j++)b.idx.push(base+indices.getX(j));
      else for(let j=0;j<attr.position.count;j++)b.idx.push(base+j);
    });
    group.clear();cache.forEach(b=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.norm,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));if(b.col.length)g.setAttribute('color',new T.Float32BufferAttribute(b.col,3));g.setIndex(b.idx);
      g.computeBoundingSphere();const o=mesh(g,b.mat,group);o.castShadow=b.sh;});
  }
  batch(still);batch(rotor);batch(tray);batch(shovel);batch(gate);
  for(const clump of models.clods)batch(clump);
  // Capture actual geometry and the sky from the waterline for wet soil, metal and water.
  const cube=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
  const envCam=new T.CubeCamera(.15,180,cube);scene.add(envCam);envCam.position.set(0,3.14,-1.2);
  waterGroup.visible=false;models.beacon.visible=false;models.pollen.forEach(p=>p.visible=false);
  envCam.update(renderer,scene);cube.texture.mapping=T.CubeReflectionMapping;reflections.value=cube.texture;eveningReflection.value=cube.texture;scene.environment=cube.texture;scene.environmentIntensity=.43;
  waterGroup.visible=true;models.beacon.visible=true;models.pollen.forEach(p=>p.visible=true);
  let capturedEvening=false;
  function captureEvening(){
    if(capturedEvening)return;
    const target=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
    const previous=dusk.value;dusk.value=1;waterGroup.visible=false;
    const visible=models.beacon.visible;models.beacon.visible=false;
    const nightCamera=new T.CubeCamera(.15,180,target);nightCamera.position.copy(envCam.position);
    sun.color.set('#ffbb83');sun.intensity=1.30;hemi.color.set('#a8b1c9');hemi.intensity=1.09;
    scene.fog.color.set('#d5aba0');sun.position.set(-14,7,-4);
    nightCamera.update(renderer,scene);eveningReflection.value=target.texture;
    dusk.value=previous;waterGroup.visible=true;models.beacon.visible=visible;capturedEvening=true;
  }
  return {root,captureEvening,models,waters,waterUniforms,defs,edge,rimY,dusk,breeze,sun,hemi,sky,grain};
}
