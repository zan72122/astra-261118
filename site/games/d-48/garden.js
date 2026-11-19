window.buildGarden=function(T,scene,M){
  const v=(x,y,z)=>new T.Vector3(x,y,z), tau=Math.PI*2;
  let seed=24931;
  function rnd(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
  const range=(a,b)=>a+(b-a)*rnd(), pick=a=>a[Math.floor(rnd()*a.length)];
  const group=(parent=scene)=>{const g=new T.Group();parent.add(g);return g;};
  const mat=M.mat;
  function finishUV(g){
    if(g.attributes.uv)return;
    g.computeBoundingBox();
    const limit=g.boundingBox, span=limit.getSize(new T.Vector3()), axes=['x','y','z'].sort((a,b)=>span[b]-span[a]);
    const p=new T.Vector3(),uv=[],a=g.attributes.position;
    for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i);uv.push(...axes.slice(0,2).map(k=>(p[k]-limit.min[k])/Math.max(.00001,span[k])));}
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  }
  function mesh(g,m,parent=scene,shadow=true){
    finishUV(g);
    const o=new T.Mesh(g,m);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;
  }
  const box=new T.BoxGeometry(1,1,1),ball=new T.SphereGeometry(1,24,16),
    stemGeo=new T.CylinderGeometry(1,1,1,7);
  function orb(p,scale,m,par=scene){const o=mesh(ball,m,par);o.position.copy(p);o.scale.copy(scale);return o;}
  function block(p,scale,m,par=scene){const o=mesh(box,m,par);o.position.copy(p);o.scale.copy(scale);return o;}
  function lathe(profile,m,parent=scene,seg=72){return mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),seg),m,parent);}
  function tube(points,r,m,par=scene,segments=32){
    const curve=new T.CatmullRomCurve3(points);return mesh(new T.TubeGeometry(curve,segments,r,8,false),m,par);
  }
  function ring(r,th,m,p,par=scene){
    const o=mesh(new T.TorusGeometry(r,th,10,80),m,par);o.rotation.x=Math.PI/2;o.position.copy(p);return o;
  }
  const up=v(0,1,0);
  function rod(a,b,r,m,par=scene){const o=mesh(stemGeo,m,par);const d=b.clone().sub(a);o.position.copy(a).lerp(b,.5);o.scale.set(r,d.length(),r);o.quaternion.setFromUnitVectors(up,d.normalize());return o;}
  const batches=new Map(),dummy=new T.Object3D(),white=new T.Color(0xffffff);
  function inst(g,m,p,scale,rot,color,parent=scene,shadows=true){
    finishUV(g);
    const key=[g.uuid,m.uuid,parent.uuid,shadows].join(':');
    let b=batches.get(key);if(!b){b={g,m,parent,shadows,matrices:[],colors:[]};batches.set(key,b);}
    dummy.position.copy(p);dummy.scale.copy(scale);
    if(rot&&rot.isQuaternion)dummy.quaternion.copy(rot);else dummy.rotation.set(...(rot||[0,0,0]));
    dummy.updateMatrix();b.matrices.push(dummy.matrix.clone());b.colors.push(color?new T.Color(color):white);
  }
  function branch(a,b,r,m,col,parent){const d=b.clone().sub(a);inst(stemGeo,m,a.clone().lerp(b,.5),v(r,d.length(),r),new T.Quaternion().setFromUnitVectors(up,d.normalize()),col,parent);}
  function flush(){for(const b of batches.values()){const o=new T.InstancedMesh(b.g,b.m,b.matrices.length);
    b.matrices.forEach((a,i)=>{o.setMatrixAt(i,a);o.setColorAt(i,b.colors[i]);});o.castShadow=b.shadows;o.receiveShadow=true;b.parent.add(o);}batches.clear();}
  const groundMat=mat(0xffffff,.93,0,{map:M.grass});
  const ground=mesh(new T.PlaneGeometry(90,90),groundMat);ground.rotation.x=-Math.PI/2;
  const brass=mat(0xd7a84e,.255,.77), gold=mat(0xe3bc6c,.18,.78), darkBrass=mat(0x918054,.32,.65);
  const pailMat=new T.MeshPhysicalMaterial({color:0x8fb7a6,roughness:.255,roughnessMap:M.rough,metalness:.22,clearcoat:.64,clearcoatRoughness:.19});
  const ivory=mat(0xeee5c5,.31,.22),teal=mat(0x628d80,.27,.28),honey=mat(0xb77735,.36,.09);
  const boards=mat(0xffffff,.71,0,{map:M.wood,bumpMap:M.wood,bumpScale:.00065});
  const table=group();table.position.set(-.07,0,.04);table.rotation.y=-.105;
  for(let j=0;j<6;j++){let z=-.335+j*.128;
    const outline=new T.Shape();
    outline.moveTo(-.862,-.0605);outline.lineTo(.862,-.0605);outline.lineTo(.862,.0605);outline.lineTo(-.862,.0605);outline.closePath();
    const boardGeom=new T.ExtrudeGeometry(outline,{depth:.050,bevelEnabled:true,bevelSegments:2,bevelSize:.002,bevelThickness:.002});
    boardGeom.rotateX(-Math.PI/2);
    const uv=boardGeom.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*.68+j*.27,uv.getY(i)*3.7+j*.34);
    mesh(boardGeom,boards,table).position.set(-.10,.613+range(-.0004,.0004),z);
    [-.90,.69].forEach(x=>{orb(v(x,.666,z),v(.0035,.0009,.0035),darkBrass,table);});
  }
  block(v(-.1,.563,.305),v(1.63,.1,.04),boards,table);
  for(const x of [-.83,.62])for(const z of [-.26,.26])block(v(x,.29,z),v(.055,.58,.055),boards,table);
  const cloth=group(table);cloth.position.set(-.188,.668,.033);cloth.rotation.y=.18;
  const textile=mat(0xffffff,.96,0,{map:M.textile,side:T.DoubleSide});
  const clothPoint=(u,w)=>{const z=-.266+w*.684,hang=Math.max(0,z-.316);
    return v((u-.5)*.50+.009*Math.sin(w*6),.0015*Math.sin(u*15+w*4)+.0018*Math.cos(w*21-u*3)
        -hang*.95+hang*Math.sin(u*49)*.09,z-hang*.93);};
  {const g=new T.PlaneGeometry(1,1,40,50),a=g.attributes.position,uv=g.attributes.uv;
    for(let i=0;i<a.count;i++){const p=clothPoint(uv.getX(i),1-uv.getY(i));a.setXYZ(i,p.x,p.y,p.z);}g.computeVertexNormals();mesh(g,textile,cloth);
    const thread=mat(0xe8e0c9,.94);for(let i=0;i<105;i++){const p=clothPoint(i/104,1);
      branch(p,p.clone().add(v(range(-.002,.002),range(-.018,-.009),.001)),.00065,thread,null,cloth);}
  }
  // Rolled enamel lip, exposed inside wall, recessed foot and brass handle ferrules.
  const pail=group();pail.position.set(-.128,.672,-.004);
  lathe([[.001,.004],[.111,.004],[.116,.009],[.117,.017],[.124,.028],[.151,.192],[.154,.207],
    [.153,.214],[.148,.215],[.146,.207],[.144,.193],[.117,.030],[.004,.024]],pailMat,pail);
  ring(.152,.0053,ivory,v(0,.213,0),pail);ring(.123,.0033,teal,v(0,.028,0),pail);
  ring(.118,.0033,ivory,v(0,.013,0),pail);ring(.146,.0014,ivory,v(0,.177,0),pail);
  for(const sign of [-1,1]){orb(v(sign*.149,.173,0),v(.007,.019,.012),teal,pail);
    orb(v(sign*.155,.174,.001),v(.005,.008,.008),brass,pail);}
  const bail=[];for(let i=0;i<=36;i++){let a=Math.PI*i/36;bail.push(v(.155*Math.cos(a),.174+.115*Math.sin(a),-.087*Math.sin(a)));}
  tube(bail,.0029,darkBrass,pail,42);
  const grip=lathe([[.001,-.042],[.007,-.04],[.008,-.035],[.010,-.031],[.011,-.015],[.011,.018],[.009,.035],[.006,.04],[.001,.041]],honey,pail,32);
  grip.position.set(0,.287,-.086);grip.rotation.z=1.57;
  // A small botanical enamel motif follows the curvature of the pail.
  const paint=mat(0xf5ebcd,.4,.1),ochre=mat(0xd5a657,.38,.12),sage=mat(0x698f77,.48,.12);
  function surface(x,y){const r=.119+y*.166;return v(x,y,Math.sqrt(Math.max(.0001,r*r-x*x))+.0009);}
  for(const [cx,cy,sz] of [[-.003,.119,.014],[-.033,.092,.009],[.037,.102,.011]]){
    const base=surface(cx,cy);const curve=[surface(.001,.051),surface(cx*.5,cy-.017),base];tube(curve,.00115,sage,pail,11);
    for(let i=0;i<9;i++){const a=tau*i/9;
      const p=surface(cx+Math.sin(a)*sz*.60,cy+Math.cos(a)*sz*.6);
      const o=orb(p,v(sz*.23,sz*.51,.00085),paint,pail);o.rotation.z=-a;}
    orb(base.clone().add(v(0,0,.0015)),v(sz*.29,sz*.29,.0012),ochre,pail);
    const l=orb(surface(cx*.51+.004,cy-.025),v(.0034,.009,.0009),sage,pail);l.rotation.z=-.7;
  }
  const liquidMat=new T.MeshPhysicalMaterial({color:0x93c5bd,roughness:.115,roughnessMap:M.rough,metalness:.41,clearcoat:1,envMapIntensity:1.1});
  function discGeometry(radius,sectors,rows){
    const a=[],uv=[],index=[];
    for(let r=0;r<=rows;r++)for(let j=0;j<sectors;j++){
      const h=j*tau/sectors,x=r/rows*Math.cos(h),y=r/rows*Math.sin(h);a.push(radius*x,radius*y,0);uv.push(.5+.5*x,.5+.5*y);
    }
    for(let r=0;r<rows;r++)for(let j=0;j<sectors;j++){let k=(j+1)%sectors,i=r*sectors;index.push(i+j,i+sectors+j,i+sectors+k,i+j,i+sectors+k,i+k);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
  }
  const liquid=mesh(discGeometry(.1415,48,6),liquidMat,pail);liquid.rotation.x=-Math.PI/2;liquid.position.y=.174;
  ring(.142,.0016,ivory,v(0,.174,0),pail);
  // The hoop and its turned wooden grip share one pivot. The film has free radial vertices.
  const wand=group(),o=BubbleGarden.origin;wand.position.set(o.x,o.y,o.z);
  const tilt=group(wand);tilt.rotation.set(-.10,-.16,-.47);
  const hoop=mesh(new T.TorusGeometry(.100,.0041,14,112),gold,tilt);
  const film=mesh(discGeometry(.098,54,7),M.soap(true),tilt,false);film.renderOrder=2;
  rod(v(0,-.097,0),v(0,-.138,0),.0037,brass,tilt);
  lathe([[0,-.304],[.007,-.303],[.010,-.298],[.0104,-.289],[.009,-.28],[.009,-.18],
    [.010,-.16],[.009,-.145],[.007,-.139],[.006,-.132],[0,-.132]],honey,tilt,36);
  for(const y of [-.138,-.146,-.153,-.278,-.286]){ring(y>-.16?.008:.0095,.0013,gold,v(0,y,0),tilt);}
  // Fine reeding catches the afternoon light around the ferrule.
  lathe([[.006,-.146],[.0075,-.144],[.0075,-.131],[.006,-.128]],brass,tilt,32);
  for(let i=0;i<4;i++){const a=-Math.PI/2+(i-1)*.13;orb(v(.099*Math.cos(a),.099*Math.sin(a)-.002,.001),v(.002,.005+i*.0004,.002),liquidMat,tilt);}

  // A bent leaf patch is a closed faceted blade, with a raised midrib.
  function leafShape(){
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.49,.36,.015,-.45,.66,0,0,1,.04,.45,.66,0,.49,.36,.015,0,.47,.15],3));
    g.setIndex([0,6,1,1,6,2,2,6,3,3,6,4,4,6,5,5,6,0]);g.computeVertexNormals();return g;
  }
  const leaf=leafShape(), foliage=mat(0xffffff,.78,0,{side:T.DoubleSide}),bark=mat(0x786d50,.92);
  const canopyMat=mat(0xffffff,.87,0,{map:M.canopy,bumpMap:M.canopy,bumpScale:.008});
  const pebble=new T.IcosahedronGeometry(1,0),crown=new T.IcosahedronGeometry(1,2);
  {const p=crown.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),
    d=.84+.24*M.noise(x*6+z*3,y*5+z*4);p.setXYZ(i,x*d,y*d,z*d);}}
  const bushColors=[0x739361,0x839e68,0x8da872,0x6b875d,0x9cab71],deep=[0x496c4f,0x547554,0x67845c,0x738c62];
  function bush(x,y,z,rx,ry,rz,palette,density=50,core=true){
    if(core)inst(crown,canopyMat,v(x,y,z),v(rx*.96,ry*.94,rz*.94),[0,rnd()*6,0],pick(palette));
    for(let i=0;i<density;i++){
      const a=rnd()*tau,h=range(-.86,1),w=Math.sqrt(1-h*h),j=range(.84,1.05);
      const px=x+rx*Math.cos(a)*w*j,py=y+ry*h*j,pz=z+rz*Math.sin(a)*w*j;
      const k=range(.12,.23)*Math.min(rx,ry);
      inst(leaf,foliage,v(px,py,pz),v(k*1.1,k*2.4,k),[range(.55,2.25),-a+1.57,range(-1.2,1.2)],pick(palette));
    }
  }
  // Overlapping irregular domes, with thousands of separate leaves along the visible face.
  for(let i=-17;i<=17;i++){const x=i*.39,z=-2.67+Math.sin(i*.5)*.10;
    const top=1.00+.038*Math.sin(i*.72)+range(-.025,.028)-.072*Math.exp(-((x-.65)**2)/.18);
    bush(x,top*.56,z,.39,top*.49,.39,i%3===0?deep:bushColors,120);
    bush(x+.17,top*.79,z+.14,.27,top*.24,.24,bushColors,66);
  }
  // Trees have tapered limbs, individual crown masses and an outer layer of light-catching leaves.
  function tree(x,z,height,radius,palette,visibleLeaves=true,base=0){
    const p=v(x,base,z),fork=v(x+.08*radius,base+height*.52,z);
    branch(p,fork,height*.04,bark,null);
    for(let i=0;i<10;i++){
      const a=i*2.4+range(-.4,.4),h=i/10,dist=radius*(1-h*.72)*range(.55,1.05);
      const tip=v(x+Math.cos(a)*dist,base+height*(.56+h*.38)+range(-.12,.12)*radius,z+Math.sin(a)*dist);
      const joint=fork.clone().lerp(tip,.51);joint.y-=radius*.26;
      branch(fork,joint,height*.019,bark,null);branch(joint,tip,height*.012,bark,null);
      const rr=radius*range(.51,.82);
      bush(tip.x,tip.y,tip.z,rr,rr*range(.74,1.03),rr*.86,palette,visibleLeaves?58:12);
      for(let k=0;k<4;k++){
        const a=rnd()*tau,off=range(.4,.76)*rr;
        bush(tip.x+off*Math.cos(a),tip.y+range(-.22,.46)*rr,tip.z+off*Math.sin(a),rr*.51,rr*.49,rr*.52,palette,visibleLeaves?18:4);
      }
    }
  }
  const silver=[0x839e73,0x99ad7d,0xa6b585,0x7b986f,0x90a478],
    distant=[0x839c85,0x90a58a,0x9aac8e,0x8a9e83];
  for(let i=0;i<17;i++)tree(-25+i*3.4,-17-range(0,8),range(3.1,5.7),range(1.2,2.3),distant,false);
  [[-5,-7.4,3.9,1.65],[-3.25,-9.3,3.4,1.18],[4.3,-8.1,4,1.5],[7,-5.6,4.3,1.8],[-7.1,-4,3.8,1.7]].forEach(t=>tree(...t,silver));
  // The side trees frame the sky and cast broken leaf shadows onto the lawn.
  tree(-2.25,-1.85,2.78,.88,bushColors);tree(2.45,-2.18,2.93,.99,silver);
  const grassColors=[0x969c64,0x91a96e,0xa9b776,0xb1b67a,0x7d985c,0xbfc18a];
  const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute([-.45,0,0,.45,0,0,.2,.57,.09,0,1,.26,-.17,.57,.13],3));blade.setIndex([0,1,2,0,2,4,4,2,3]);blade.computeVertexNormals();
  for(let i=0;i<7900;i++){
    const x=range(-8,8),z=range(-11,.5),h=range(.037,.12);
    inst(blade,foliage,v(x,0,z),v(h*.14,h,h*.65),[range(-.3,.3),rnd()*tau,range(-.45,.45)],pick(grassColors),scene,false);
  }
  const gravel=mat(0xe4d8bd,.95),gravelBits=mat(0xffffff,.91);
  // A curved gravel walk passes through the park, around the fountain.
  function walkway(){
    const a=[],idx=[];
    for(let i=0;i<=48;i++){const x=(i/48-.5)*23,z=-6.55+.79*Math.cos(x*.57);
      a.push(x,.011,z-1.12,x,.011,z+1.12);if(i)idx.push(i*2-2,i*2-1,i*2,i*2,i*2-1,i*2+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.setIndex(idx);g.computeVertexNormals();mesh(g,gravel);
  }
  walkway();
  for(let i=0;i<1300;i++){const x=range(-8.5,8.5),z=-6.55+.79*Math.cos(x*.57)+range(-1.1,1.1),r=range(.009,.032);
    inst(pebble,gravelBits,v(x,.012,z),v(r,r*.22,r*.7),[0,rnd()*6,0],pick([0xc7bca1,0xd3c9b5,0xf1e8c9]),scene,false);}
  const moving=[];
  // Curved stems, folded leaves and two offset whorls of ivory ray florets.
  const petal=leafShape(), petalMat=mat(0xfff9e6,.58,0,{side:T.DoubleSide}), pollen=mat(0xe1ad3e,.73);
  const flowerStem=mat(0x82925b,.78);
  function flowers(x,y,z,size,number,style,index){
    const anchor=group();anchor.position.set(x,y,z);moving.push({obj:anchor,index});
    for(let f=0;f<number;f++){
      const px=range(-.48,.48)*size,pz=range(-.36,.36)*size,h=range(.48,1.0)*size,
        p=v(px,0,pz),top=v(px+range(-.16,.16)*size,h,pz+range(-.15,.15)*size),middle=p.clone().lerp(top,.55);middle.x+=size*.05;
      branch(p,middle,size*.004,flowerStem,null,anchor);branch(middle,top,size*.0032,flowerStem,null,anchor);
      for(let k=0;k<4;k++){
        const a=rnd()*tau,t=range(.14,.67),l=h*range(.14,.34);
        inst(leaf,foliage,p.clone().lerp(top,t),v(l*.25,l,l*.45),[range(.15,.8),a,range(-1,1)],pick(bushColors),anchor);
      }
      if(style==='lavender'){
        for(let k=0;k<7;k++){const off=k*h*.025;
          inst(pebble,foliage,top.clone().add(v(Math.sin(k*2.4)*h*.017,-off,Math.cos(k*2.4)*h*.019)),v(h*.023,h*.038,h*.021),
            [0,k*2.4,0],pick([0xb19cab,0x9b8eac,0xc4b0be,0xaba1b7]),anchor);}
      }else{
        const r=size*range(.056,.088), face=new T.Quaternion().setFromEuler(new T.Euler(range(.30,1.07),range(-.8,.8),range(-.5,.5)));
        const center=new T.Vector3(0,.001,0).applyQuaternion(face).add(top);
        inst(ball,pollen,center,v(r*.30,r*.20,r*.30),face,null,anchor);
        for(let k=0;k<13;k++){
          const a=k*tau/13,rot=face.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(0,a,0)))
            .multiply(new T.Quaternion().setFromAxisAngle(v(1,0,0),1.41+range(-.12,.16)));
          const pp=v(Math.sin(a)*r*.13,0,Math.cos(a)*r*.13).applyQuaternion(face).add(top);
          inst(petal,petalMat,pp,v(r*.34,r*.99,r*.36),rot,null,anchor);
        }
      }
    }
  }
  // Flower beds break up the hedge base, with a few close blossoms at the edges of the table.
  for(let i=0;i<19;i++){const x=-4.8+i*.51;flowers(x,.012,-2.14+range(-.1,.10),range(.27,.48),10,i%4===1?'lavender':'daisy',i);}
  for(let i=0;i<8;i++)flowers(-2.6+i*.82,0,-7.83,.46,11,i%2?'daisy':'lavender',19+i);
  flowers(.57,.03,-.37,.77,13,'daisy',2);flowers(-.76,.02,-.46,.76,14,'lavender',5);
  const fount=group();fount.position.set(BubbleGarden.fountain.x,0,BubbleGarden.fountain.z);
  const limestone=mat(0xffffff,.64,0,{map:M.stone}),darkStone=mat(0xb2ab93,.71);
  const basinWater=new T.MeshPhysicalMaterial({color:0x8cbdb0,roughness:.12,metalness:.34,roughnessMap:M.rough,clearcoat:1,envMapIntensity:1.3});
  lathe([[.01,.025],[.94,.025],[.97,.064],[.965,.10],[.93,.123],[.91,.304],[.95,.338],[.979,.358],
    [.982,.392],[.957,.421],[.893,.42],[.874,.392],[.849,.288],[.821,.177],[.01,.17]],limestone,fount,96);
  ring(.941,.012,darkStone,v(0,.125,0),fount);ring(.964,.009,limestone,v(0,.337,0),fount);
  const pool=mesh(discGeometry(.908,84,9),basinWater,fount);pool.rotation.x=-Math.PI/2;pool.position.y=.404;
  lathe([[.20,.34],[.21,.422],[.19,.45],[.14,.467],[.101,.51],[.077,.56],[.079,.66],[.109,.703],[.116,.727],[.101,.75],
    [.086,.77],[.113,.789],[.148,.803],[.19,.846],[.23,.913],[.30,.954],[.328,.977],[.334,1.006],[.324,1.03],[.289,1.031],[.26,1.012],[.196,.975],[.07,.934]],limestone,fount);
  const upperPool=mesh(discGeometry(.299,60,4),basinWater,fount);upperPool.rotation.x=-Math.PI/2;upperPool.position.y=1.016;
  lathe([[.065,.99],[.075,1.045],[.061,1.065],[.043,1.085],[.044,1.173],[.060,1.204],[.088,1.227],[.094,1.25],[.081,1.274],[.047,1.29],[.032,1.307],[.025,1.349],[.012,1.351]],limestone,fount);
  ring(.326,.009,limestone,v(0,.99,0),fount);
  // Spout stems are fed by the simulated pumps. Individual drops take over beyond the jet tips.
  const streamMat=new T.MeshPhysicalMaterial({color:0xc2e7dc,metalness:.28,roughness:.093,roughnessMap:M.rough,clearcoat:1,
    transparent:true,opacity:.74,depthWrite:false,envMapIntensity:1.35});
  const streamGeo=new T.CylinderGeometry(1,1,1,7), jets=new T.InstancedMesh(streamGeo,streamMat,7*10);
  jets.frustumCulled=false;fount.add(jets);
  const pin=group();pin.position.set(.52,1.365,-2.93);
  rod(v(.52,0,-2.95),v(.52,1.38,-2.95),.013,honey);
  const leaves=[mat(0xd9b16a,.39,.45),mat(0xc78e62,.39,.42),mat(0xa7bb9b,.39,.39)];
  for(let i=0;i<6;i++){
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute([0,.012,0,-.023,.057,.003,-.045,.125,.005,-.005,.135,.018,
      .038,.095,.041,.037,.07,.042,.016,.052,.027,-.008,.085,.026],3));
    g.setIndex([0,1,6,1,7,6,1,2,7,2,3,7,3,4,7,4,5,7,5,6,7]);g.computeVertexNormals();
    const m=leaves[i%3];m.side=T.DoubleSide;mesh(g,m,pin).rotation.z=tau*i/6;
  }
  orb(v(0,0,.033),v(.015,.015,.012),gold,pin);
  const seat=mat(0xa98d6b,.81),iron=mat(0x59685e,.5,.4);
  function bench(x,z,angle){
    const g=group();g.position.set(x,0,z);g.rotation.y=angle;
    for(let i=0;i<4;i++)block(v(0,.39,-.115+i*.078),v(1.33,.041,.066),seat,g);
    for(let i=0;i<3;i++){const slat=block(v(0,.56+i*.087,-.159-i*.014),v(1.33,.067,.031),seat,g);slat.rotation.x=-.10;}
    for(const a of [-.48,.48]){for(const b of [-.12,.115])rod(v(a,.013,b*1.22),v(a,.383,b),.022,iron,g);
      rod(v(a,.26,-.104),v(a,.78,-.204),.019,iron,g);rod(v(a,.365,-.15),v(a,.365,.165),.025,iron,g);}
  }
  bench(-1.8,-7.28,.24);bench(2.84,-7.47,-.36);
  // Simple turned garden pots and dense herbs sit beyond the worktable.
  const clay=mat(0xb78260,.86),soil=mat(0x635b43,.94);
  for(const [x,z,r] of [[-.92,-1.13,.18],[-1.21,-1.38,.14]]){
    const g=group();g.position.set(x,0,z);lathe([[.01,0],[r*.63,.01],[r,.28],[r*1.08,.29],[r*1.08,.33],[r*.96,.34],[r*.89,.31]],clay,g);
    orb(v(0,.304,0),v(r*.94,.013,r*.94),soil,g);flowers(x,.312,z,.42,12,'lavender',7);
  }
  flush();
  // Trees, undergrowth, and props now provide the real geometry for the reflection capture.
  return {wand,tilt,hoop,film,liquid,pin,jets,pool,upperPool,fount,moving,streamMat,liquidMat,discGeometry};
};
