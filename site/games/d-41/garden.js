'use strict';
function makeGarden(scene,D){
  const {T,PI,V,group,rand,noise,mat,M,mesh,box,ball,cyl,rod,line,tor,shape,round,lathe,disc,batch}=Craft;
  const rigid=group(scene), treeBones=[], leafDummy=new T.Object3D();
  const bark=mat(0x756b50,.91),lawn=mat(0x9dab74,.92),gravel=mat(0xdac8a1,.89),stone=mat(0xcac3a8,.83);
  const roof=[0xa2765c,0xb98367,0xad8063,0x947967].map(c=>mat(c,.82));
  const houses=[0xdaccac,0xe1d3b4,0xcac8b4,0xdcc4a6].map(c=>mat(c,.86));
  const shutters=mat(0x707f77,.76),windows=mat(0x657f83,.34,.18);
  function land(z0,length,hf,color,heights=13){
    const verts=[],cols=[],idx=[],m=100,base=new T.Color(color);
    for(let j=0;j<=heights;j++)for(let i=0;i<=m;i++){
      const x=-65+i*1.3,z=z0-j*length/heights,h=hf(x,z,j/heights);
      verts.push(x,h,z);const v=.92+.12*noise(x*.45,z*.6);cols.push(base.r*v,base.g*v,base.b*v);
      if(i&&j){const k=j*(m+1)+i;idx.push(k-m-2,k-m-1,k,k-m-2,k,k-1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setIndex(idx);g.computeVertexNormals();
    const o=mesh(rigid,g,mat(0xffffff,.93,0,{vertexColors:true}));o.castShadow=false;
  }
  land(-38,19,(x,z,t)=>-1+Math.sin(t*PI)*(.8+4.9*noise(x*.071,1)+3.2*noise(x*.14,3)+2.7*Math.exp(-((x-15)**2)/90)),0x839daf);
  land(-26,14,(x,z,t)=>-1+Math.sin(t*PI)*(.8+3.9*noise(x*.09,11)+2.3*noise(x*.18,19)),0x809da0);
  land(-15,16,(x,z,t)=>-1+Math.sin(t*PI)*(.9+2.4*noise(x*.095,5)+1.4*noise(x*.16,5)),0x9bab8c);
  box(rigid,8,-.69,-11,103,.4,52,lawn);
  function ribbon(pts,width,material,y){
    const verts=[],idx=[];
    for(let k=0;k<pts.length;k++){const [x,z]=pts[k],a=pts[Math.max(0,k-1)],b=pts[Math.min(pts.length-1,k+1)],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz);
      verts.push(x+dz/n*width,y,z-dx/n*width,x-dz/n*width,y,z+dx/n*width);
      if(k){let i=k*2;idx.push(i-2,i,i-1,i,i+1,i-1);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();material.side=T.DoubleSide;mesh(rigid,g,material);
  }
  const path=new T.CatmullRomCurve3([V(0,0,0),V(1.2,0,-3),V(.2,0,-6),V(1.7,0,-9),V(4,0,-13)]);
  ribbon(path.getPoints(45).map(q=>[q.x,q.z]),.44,gravel,-.475);
  const road=mat(0xb0ad94,.9);
  ribbon([[-21,-9.7],[.4,-8.9],[7,-7.3],[18,-6.3],[34,-5.5]],1.02,road,-.472);
  function house(x,y,z,w,h,d,i){
    const g=group(rigid,x,y,z);g.rotation.y=(rand()-.5)*.58;
    box(g,0,h*.5,0,w,h,d,houses[i%4]);box(g,0,.10,0,w*1.018,.19,d*1.02,stone);
    const rise=w*.37;
    const gable=new T.Shape();gable.moveTo(-w/2,0);gable.lineTo(w/2,0);gable.lineTo(0,rise);gable.closePath();shape(g,gable,d,houses[i%4],0,h,-d/2,0);
    for(const k of [-1,1]){const r=box(g,k*w*.25,h+rise/2,0,Math.hypot(w*.5,rise)+.16,.08,d+.24,roof[i%4]);r.rotation.z=-k*Math.atan2(rise,w*.5);}
    rod(g,[0,h+rise+.05,-d*.52],[0,h+rise+.05,d*.52],.047,roof[(i+1)%4]);
    box(g,w*.24,h+rise*.88,0,.19,.62,.21,houses[(i+1)%4]);box(g,w*.24,h+rise*.88+.3,0,.25,.09,.26,roof[i%4]);
    for(const k of [-1,1]){
      box(g,k*w*.27,h*.65,d*.5+.015,w*.145,h*.32,.038,windows);
      for(const j of [-1,1])box(g,k*w*.27+j*w*.099,h*.65,d*.5+.031,w*.05,h*.34,.055,shutters);
      box(g,k*w*.27,h*.65,d*.5+.039,.027,h*.32,.018,M.cream);
      box(g,k*w*.27,h*.65,d*.5+.039,w*.145,.025,.02,M.cream);
    }box(g,0,h*.25,d*.5+.012,w*.13,h*.5,.06,bark);
  }
  for(let i=0;i<26;i++){const x=-16+(i%14)*3.6+rand()*.8,z=-14.2-Math.floor(i/14)*5-rand()*2;
    if(x<1&&x>-4)continue;house(x,-.48+Math.max(0,-z-15)*.12,z,1.15+rand(),1.2+rand()*1.2,1.4+rand(),i);}
  house(4.5,-.47,-10.8,2.5,1.95,2.3,1);house(10,-.47,-10,2.65,2.3,2.2,2);
  // Unequal branch forks support individually wind-loaded sprays of foliage.
  const foliage=mat(0xffffff,.84),leafGeo=new T.IcosahedronGeometry(1,0);
  function tree(x,z,h,spread,hero=false){
    const trunk=group(rigid,x,-.49,z);
    line(trunk,[[0,0,0],[-.07*h,.35*h,.01],[-.025*h,.57*h,0],[.045*h,.72*h,-.02]],h*.035,bark);
    const palette=(hero?[0x647b4c,0x76874e,0x829555,0x91a061,0xadb177,0x536e49]:[0x71835a,0x8b995e,0x9ea674,0x647c58]);
    const n=hero?18:7;
    for(let i=0;i<n;i++){
      const ang=i*2.399+rand()*.4,r=spread*Math.sqrt((i+.5)/n)*(.8+rand()*.22);
      const a=[-.04*h,.38*h+rand()*.14*h,0],b=[Math.cos(ang)*r*.68,h*(.6+rand()*.13),Math.sin(ang)*r*.62];
      const c=[Math.cos(ang)*r,h*(1-.25*r/spread)+rand()*.16,Math.sin(ang)*r];
      rod(trunk,a,b,h*.023,bark,h*.013);rod(trunk,b,c,h*.013,bark,h*.004);
      const g=group(scene,x+c[0],-.49+c[1],z+c[2]);const num=hero?105:34;
      const inst=new T.InstancedMesh(leafGeo,foliage,num),col=new T.Color();
      for(let k=0;k<num;k++){
        const theta=rand()*2*PI,rr=Math.sqrt(rand()),dx=Math.cos(theta)*rr,dz=Math.sin(theta)*rr;
        const w=spread*(hero?.30:.44);
        leafDummy.position.set(dx*w,(1-rr*rr)*w*.36+(rand()-.5)*w*.36,dz*w);
        const size=w*(.18+rand()*.20);leafDummy.scale.set(size*(.8+rand()*.45),size*(.37+rand()*.37),size);
        leafDummy.rotation.set(rand()*.5,rand()*PI,rand()*.42);leafDummy.updateMatrix();inst.setMatrixAt(k,leafDummy.matrix);
        col.setHex(palette[Math.floor(rand()*palette.length)]);col.multiplyScalar(.90+rand()*.15);inst.setColorAt(k,col);}
      inst.castShadow=hero;inst.receiveShadow=true;g.add(inst);if(hero)treeBones.push(g);
    }
  }
  tree(-2.15,-5.5,4.8,2.2,true);
  tree(3.55,-12.4,3.35,1.35);tree(9.8,-7.9,3.75,1.42);
  const cypress=[mat(0x677e62,.9),mat(0x6c8163,.89),mat(0x81916a,.85)];
  for(let i=0;i<34;i++){const x=-17+rand()*55,z=-10-rand()*16,h=1.3+rand()*2.2;
    rod(rigid,[x,-.48,z],[x,.23,z],.06,bark);const g=group(rigid,x,-.29,z);
    lathe(g,0,0,0,[[.02,0],[.22,.15*h],[.28,.38*h],[.20,.63*h],[.12,.79*h],[.008,h]],cypress[i%3]);}
  // Flower heads, herb stalks and separate long grass blades line the gravel.
  const blades=new T.BufferGeometry(),vp=[],vc=[];
  const bladeColors=[0x8a9958,0xadb381,0x788959,0xb5b279].map(x=>new T.Color(x));
  for(let i=0;i<7100;i++){
    const x=rand()*31-7,z=-.4-rand()*12;if(z< -6.3&&z>-9)continue;
    const h=.06+rand()*.19,w=.013+rand()*.025,c=bladeColors[i%4];vp.push(x-w,-.473,z,x+w,-.473,z,x+.04,-.47+h,z-.025);
    for(let j=0;j<3;j++)vc.push(c.r,c.g,c.b);
  }
  blades.setAttribute('position',new T.Float32BufferAttribute(vp,3));blades.setAttribute('color',new T.Float32BufferAttribute(vc,3));blades.computeVertexNormals();mesh(rigid,blades,mat(0xffffff,.87,0,{vertexColors:true,side:T.DoubleSide})).castShadow=false;
  const petalGeo=new T.SphereGeometry(1,7,4);
  const flower=mat(0xf4e5b0,.77),heart=mat(0xd8b458,.7);
  for(let i=0;i<95;i++){
    const x=-3+rand()*6,z=-2-rand()*5,y=-.38+rand()*.22;
    rod(rigid,[x,-.47,z],[x+.025,y,z],.007,cypress[0],.004,5);
    for(let k=0;k<5;k++){const a=k*1.257;mesh(rigid,petalGeo,flower,x+.025+Math.cos(a)*.030,y+.005,z+Math.sin(a)*.03).scale.set(.028,.013,.026);}
    mesh(rigid,petalGeo,heart,x+.025,y+.017,z).scale.set(.019,.013,.019);
  }
  const fountain=group(rigid,.49,-.46,-4.42);
  lathe(fountain,0,0,0,[[.37,0],[.4,.055],[.27,.11],[.19,.19],[.125,.43],[.2,.56],[.54,.66],[.62,.75],[.62,.79],[.54,.8],[.14,.66]],stone);
  tor(fountain,0,.773,0,.60,.026,stone,true);cyl(fountain,0,.758,0,.574,.57,.012,M.water,64);
  lathe(fountain,0,.75,0,[[.10,0],[.085,.08],[.06,.12],[.066,.16],[.028,.18]],M.brass);
  const jetBase=V(.49,.47,-4.42),jetMesh=new T.InstancedMesh(new T.SphereGeometry(1,8,6),M.water,90),
    rippleMesh=new T.InstancedMesh(new T.TorusGeometry(1,.024,5,34),M.water,60);
  scene.add(jetMesh,rippleMesh);jetMesh.frustumCulled=rippleMesh.frustumCulled=false;

  const mail=group(scene,D+.12,-.47,-3.62),mailBody=group(mail);
  const mailpaint=mat(0x697f7b,.36,.26),red=mat(0xb96549,.38,.32);
  round(mailBody,0,.57,0,.15,1.14,.18,.022,M.wood);box(mailBody,0,1.12,.01,.62,.09,.43,M.cross);
  const ms=new T.Shape();ms.moveTo(-.36,0);ms.lineTo(.36,0);ms.lineTo(.36,.28);ms.absarc(0,.28,.36,0,PI,false);ms.closePath();
  shape(mailBody,ms,.65,mailpaint,0,1.16,-.32,.022);shape(mailBody,ms,.032,M.cream,0,1.16,.35,.011);
  const face=group(mailBody,0,1.39,.393);
  round(face,0,.032,0,.34,.19,.01,.015,red);
  line(face,[[-.15,.106,.014],[0,.00,.014],[.15,.106,.014]],.011,M.cream,false);
  box(face,0,.29,-.002,.23,.035,.08,M.brass);
  const flag=group(mail,.405,1.42,.12);
  rod(flag,[0,0,0],[0,.52,0],.022,red);round(flag,.104,.45,0,.21,.16,.04,.025,red);disc(flag,0,0,.037,.057,.03,M.gold);
  mail.rotation.y=-.30;batch(mailBody);
  const van=group(scene,D-3.9,-.464,-7.3),vanShell=group(van),vm=mat(0x8fa49a,.4,.35);
  round(vanShell,-.17,.80,0,1.56,.90,.82,.13,vm,.055);round(vanShell,.77,.64,0,.60,.66,.78,.13,M.cream,.06);
  box(vanShell,.76,.81,.403,.36,.24,.025,windows);box(vanShell,1.05,.80,0,.028,.23,.65,windows);
  round(vanShell,-.2,.8,.437,.48,.30,.018,.015,M.cream);line(vanShell,[[-.43,.94,.452],[-.2,.76,.452],[.03,.94,.452]],.016,red,false);
  const wheels=[];for(const x of [-.61,.70])for(const z of [-.41,.41]){const g=group(van,x,.235,z);disc(g,0,0,0,.237,.13,M.rubber);disc(g,0,0,Math.sign(z)*.074,.115,.018,M.steel);box(g,0,0,Math.sign(z)*.086,.13,.025,.01,M.bolt);wheels.push(g);}
  batch(vanShell);const plane=group(scene),planeColor=mat(0xe8dfbd,.38),wingColor=mat(0xb97552,.42);
  ball(plane,0,0,0,.49,.065,.073,planeColor);ball(plane,-.03,.018,0,.116,.031,.79,planeColor);
  for(const side of [-1,1])ball(plane,-.03,.018,side*.68,.083,.028,.12,wingColor);
  ball(plane,-.37,.075,0,.13,.13,.029,wingColor);ball(plane,-.33,.06,0,.096,.025,.24,planeColor);batch(plane);
  batch(rigid);
  function update(s){
    treeBones.forEach((g,i)=>{g.rotation.z=s.sprigs[i].a;g.rotation.x=s.sprigs[i+9].a*.53;});
    jetMesh.count=Math.min(90,s.jets.length);s.jets.slice(0,90).forEach((d,i)=>{leafDummy.position.copy(jetBase).add(V(d.x,d.y,d.z));leafDummy.rotation.set(0,0,0);leafDummy.scale.set(d.r,d.r*(1+Math.abs(d.vy)*.45),d.r);leafDummy.updateMatrix();jetMesh.setMatrixAt(i,leafDummy.matrix);});jetMesh.instanceMatrix.needsUpdate=true;
    rippleMesh.count=Math.min(60,s.ripples.length);s.ripples.slice(0,60).forEach((r,i)=>{leafDummy.position.set(jetBase.x+r.x,.312,jetBase.z+r.z);leafDummy.rotation.set(PI/2,0,0);leafDummy.scale.set(r.r,r.r,r.amp*18);leafDummy.updateMatrix();rippleMesh.setMatrixAt(i,leafDummy.matrix);});rippleMesh.instanceMatrix.needsUpdate=true;
    flag.rotation.z=-1.35+s.flag*1.35;van.position.x=D-3.9+s.van;wheels.forEach(w=>w.rotation.z=-s.vanWheel);
    plane.visible=s.flight>.02&&s.flight<65;plane.position.set(D*2-4.3+s.flight*.8,s.glideY,-18-s.flight*.19);plane.rotation.set(s.bank+.2,.27,s.bank*.33);
  }
  return {update,mail,jetBase,flag};
}
