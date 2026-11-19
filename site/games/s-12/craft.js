/* All scenery, tools and sweets are modelled here, in table coordinates. */
const Craft=(()=>{
  const T=THREE, PI=Math.PI,V=(x,y,z)=>new T.Vector3(x,y,z);
  let seed=1109;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function texture(w,h,paint,repeat=true){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    paint(c.getContext('2d'),w,h);
    const t=new T.CanvasTexture(c);if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;return t;
  }
  const grain=texture(64,64,(ctx,w,h)=>{
    const im=ctx.createImageData(w,h);for(let i=0;i<im.data.length;i+=4){
      const c=192+rand()*63;im.data[i]=im.data[i+1]=im.data[i+2]=c;im.data[i+3]=255;
    }ctx.putImageData(im,0,0);
  });grain.repeat.set(3,3);
  const mat=(color,roughness=.52,metalness=0,more={})=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:grain,...more});
  const phys=(color,roughness,more={})=>new T.MeshPhysicalMaterial({color,roughness,roughnessMap:grain,...more});
  const woodTex=texture(256,128,(c,w,h)=>{
    c.fillStyle='#c5a78b';c.fillRect(0,0,w,h);
    for(let i=0;i<580;i++){let y=rand()*h,phase=rand()*6.28;
      c.strokeStyle=rand()>.4?'rgba(63,35,23,'+(.03+rand()*.18)+')':'rgba(255,235,201,.22)';
      c.lineWidth=.2+rand()*.7;c.beginPath();for(let x=0;x<=w;x+=8){
        let py=y+Math.sin(x/w*PI*2+phase)*1.5+Math.sin(x/w*PI*4+y*.04)*.7;x?c.lineTo(x,py):c.moveTo(x,py);
      }c.stroke();
    }
  });woodTex.colorSpace=T.SRGBColorSpace;
  const clay=mat(0xb8cbc6,.32),ivory=mat(0xf1e9cf,.37),indigo=mat(0x273e4e,.65);
  const brass=mat(0xb89152,.32,.73),steel=mat(0xd2d9ce,.19,.94),iron=mat(0x445454,.28,.84);
  const wood=mat(0xb48866,.47,0,{map:woodTex}),darkwood=mat(0x664c3c,.48,0,{map:woodTex});
  const coral=mat(0xbc5040,.49),ink=mat(0x294858,.59);
  const sphereGeo=new T.SphereGeometry(1,24,16);
  const diskGeo=new T.CylinderGeometry(1,1,1,40);
  function group(parent,x=0,y=0,z=0){let o=new T.Group();o.position.set(x,y,z);if(parent)parent.add(o);return o;}
  function mesh(parent,geo,m,x=0,y=0,z=0){
    let o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function ball(p,x,y,z,a,b,c,m){let o=mesh(p,sphereGeo,m,x,y,z);o.scale.set(a,b,c);return o;}
  function disk(p,x,y,z,r,h,m){let o=mesh(p,diskGeo,m,x,y,z);o.rotation.x=PI/2;o.scale.set(r,h,r);return o;}
  function box(p,x,y,z,w,h,d,m,r=.07,bevel=.025){
    r=Math.min(w*.48,h*.48,r);let a=w/2-r,b=h/2-r,s=new T.Shape();
    s.moveTo(-a,-h/2);s.lineTo(a,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-b);s.lineTo(w/2,b);
    s.quadraticCurveTo(w/2,h/2,a,h/2);s.lineTo(-a,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,b);
    s.lineTo(-w/2,-b);s.quadraticCurveTo(-w/2,-h/2,-a,-h/2);
    const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:bevel>0,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:4});
    return mesh(p,geo,m,x,y,z);
  }
  function line(p,points,r,m,steps=20,sides=8){
    let path=new T.CatmullRomCurve3(points.map(v=>V(...v)));
    return mesh(p,new T.TubeGeometry(path,steps,r,sides,false),m);
  }
  function ring(p,x,y,z,r,tube,m,rx=0){
    let o=mesh(p,new T.TorusGeometry(r,tube,8,48),m,x,y,z);o.rotation.x=rx;return o;
  }
  function revolve(p,profile,m,x=0,y=0,z=0,n=48){
    let o=mesh(p,new T.LatheGeometry(profile.map(a=>new T.Vector2(...a)),n),m,x,y,z);
    return o;
  }
  // Consolidate fixed pieces of the same material into one draw call.
  function bake(root){
    root.updateWorldMatrix(true,true);let inv=root.matrixWorld.clone().invert(),by=new Map(),mat4=new T.Matrix4();
    root.traverse(o=>{if(!o.isMesh)return;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      mat4.multiplyMatrices(inv,o.matrixWorld);g.applyMatrix4(mat4);
      if(!by.has(o.material))by.set(o.material,[]);by.get(o.material).push(g);
    });
    root.clear();for(const [m,gs] of by){
      let g=new T.BufferGeometry();
      for(const key of ['position','normal','uv']){
        let len=gs.reduce((n,v)=>n+(v.attributes[key]?.array.length||0),0);
        if(!len)continue;
        let a=new Float32Array(len),off=0;for(let v of gs){if(v.attributes[key]){a.set(v.attributes[key].array,off);off+=v.attributes[key].array.length;}}
        g.setAttribute(key,new T.BufferAttribute(a,key==='uv'?2:3));
      }
      mesh(root,g,m);gs.forEach(g=>g.dispose());
    }return root;
  }
  function flower(p,x,y,z,size,m){
    for(let i=0;i<5;i++){
      let a=i*PI*2/5;let petal=ball(p,x+Math.sin(a)*size*.48,y+Math.cos(a)*size*.48,z,size*.34,size*.49,.009,m);petal.rotation.z=-a;
    }disk(p,x,y,z+.012,size*.17,.012,m);
  }
  const tiles=[0xc7d8d3,0xc1d3d0,0xcbdad4,0xcad9d5,0xc6d7d4].map(c=>phys(c,.28,{clearcoat:.36,clearcoatRoughness:.23}));
  function slab(p,w,h){
    box(p,0,0,-.34,w+.23,h+.23,.21,darkwood,.22,.056);
    box(p,0,0,-.16,w+.10,h+.10,.13,brass,.20,.034);
    box(p,0,0,-.066,w,h,.12,mat(0x94a8a4,.67),.18,.028);
    const nx=Math.round(w/1.60),ny=Math.round(h/1.55),tw=(w-.09)/nx,th=(h-.09)/ny;
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      box(p,(i+.5-nx*.5)*tw,(j+.5-ny*.5)*th,.049,tw-.041,th-.041,.046,tiles[(i*2+j*3)%5],.055,.018);
    }
  }
  function hardware(p){
    let stand=group(p,-.61,1.38,0);
    box(stand,0,.48,.13,1.36,1.27,.17,wood,.18,.055);
    box(stand,0,.48,.327,1.00,1.04,.068,iron,.25,.037);
    for(let x of [-.35,.35])for(let y of [.13,.83]){
      disk(stand,x,y,.423,.085,.035,brass);box(stand,x,y,.445,.09,.014,.006,iron,.004,.001).rotation.z=.53;
    }
    disk(stand,0,.45,.46,.30,.14,steel);
    line(stand,[[0,.46,.47],[0,.46,.99],[.015,.33,1.34],[.035,-.05,1.39],[.07,-.39,1.09],[.10,-.55,.91],[.17,-.72,.97],[.21,-.73,1.14]],.153,steel,56,16);
    ball(stand,.21,-.73,1.14,.153,.153,.158,steel);
  }
  const silk=mat(0xe5dac0,.83),print=mat(0xac594b,.73),blueprint=mat(0x526d7b,.72);
  function wrapped(parent,x,y,z,angle=0,scale=1,printed=print){
    let g=group(parent,x,y,z);g.rotation.z=angle;g.scale.setScalar(scale);
    let profile=[[-.82,.31],[-.73,.30],[-.54,.17],[-.41,.098],[-.34,.22],[-.25,.30],[.21,.31],[.34,.24],[.42,.105],[.57,.19],[.77,.32]];
    let pts=[],idx=[],cs=[],c0=new T.Color(0xece6d1),c1=printed.color;
    const K=36;
    for(let j=0;j<profile.length;j++)for(let k=0;k<=K;k++){
      let [ax,r]=profile[j],a=2*PI*k/K,wing=Math.abs(ax)>.4,cr=1+(wing?.18:.025)*Math.cos(8*a+ax*2);
      pts.push(ax+(wing?.032:0)*Math.sin(5*a),r*cr*Math.cos(a+ax*.4),r*cr*Math.sin(a+ax*.4)*.85);
      let tone=(wing&&((k+Math.round(ax*9)+45)%9<3))||(!wing&&((k+Math.floor(ax*11)+48)%16<3));
      let c=tone?c1:c0;cs.push(c.r,c.g,c.b);
      if(j&&k){let l=j*(K+1)+k;idx.push(l-K-2,l-1,l,l-K-2,l,l-K-1);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.setAttribute('color',new T.Float32BufferAttribute(cs,3));geo.setIndex(idx);geo.computeVertexNormals();
    const pm=mat(0xffffff,.59,0,{vertexColors:true,side:T.DoubleSide});mesh(g,geo,pm);
    for(let s of [-1,1]){let r=ring(g,s*.425,0,0,.108,.019,printed);r.rotation.y=PI/2;}
    return g;
  }
  function plate(p,r){
    let profile=[[.01,.02],[r*.63,.02],[r*.96,.15],[r,.23],[r,.27],[r*.97,.28],[r*.89,.20],[r*.70,.13],[.01,.12]];
    let g=revolve(p,profile,ivory);g.rotation.x=PI/2;
    ring(p,0,0,.275,r*.985,.023,blueprint);ring(p,0,0,.16,r*.76,.013,blueprint);
    for(let i=0;i<36;i++){let a=PI*2*i/36;let q=ball(p,Math.cos(a)*r*.90,Math.sin(a)*r*.90,.228,.053,.015,.01,blueprint);q.rotation.z=a+.3;}
  }
  function sheetGeometry(width,height,fold=0){
    let nx=16,ny=12,geo=new T.PlaneGeometry(width,height,nx,ny),pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){let x=pos.getX(i),y=pos.getY(i),ax=x/(width*.5),ay=y/(height*.5);
      let curl=.045*Math.pow(Math.abs(ax),3)+.023*Math.sin((x+y)*7)*Math.pow(Math.abs(ay),4);
      pos.setXYZ(i,x*(1-.68*fold*Math.pow(Math.abs(ax),1.2)),y*(1-.66*fold*Math.pow(Math.abs(ay),1.2)),curl+fold*(.75*Math.abs(ax)**2+.28*Math.abs(ay)**2));
    }geo.computeVertexNormals();return geo;
  }
  const paperM=phys(0xfff0d2,.62,{side:T.DoubleSide,transparent:true,opacity:.91,clearcoat:.1});
  function paper(p){let g=group(p);let paper=mesh(g,sheetGeometry(2.1,1.62),paperM);return {g,paper};}
  function shears(p){
    let g=group(p);let limbs=[];
    const handle=mat(0x814537,.29,.35),glint=mat(0xe8e5d0,.22,.87);
    for(let s of [-1,1]){
      let limb=group(g,0,0,s*.022);limbs.push(limb);
      let shape=new T.Shape();shape.moveTo(-.068,-.10);shape.lineTo(.02,.04);shape.quadraticCurveTo(.14,.71,.028,1.13);
      shape.quadraticCurveTo(-.085,1.02,-.12,.18);shape.lineTo(-.068,-.10);
      mesh(limb,new T.ExtrudeGeometry(shape,{depth:.043,bevelEnabled:true,bevelSize:.016,bevelThickness:.012,bevelSegments:2}),glint);
      line(limb,[[0,.04,0],[.01,-.19,0],[s*.09,-.43,0],[s*.10,-.60,0]],.052,steel,14);
      const rim=ring(limb,s*.092,-.81,0,.245,.059,handle);rim.scale.set(.74,1.25,1);
      bake(limb);
    }disk(g,0,0,.069,.103,.062,brass);disk(g,0,0,.105,.051,.014,iron);return {g,limbs};
  }
  const knit=texture(64,64,(c,w,h)=>{
    c.fillStyle='#f0ede5';c.fillRect(0,0,w,h);c.lineWidth=1.1;
    for(let y=0;y<h;y+=5)for(let x=-3;x<w;x+=5){c.strokeStyle='rgba(132,125,111,.26)';c.beginPath();c.moveTo(x,y);c.lineTo(x+2.5,y+2.7);c.lineTo(x+4.7,y);c.stroke();}
  });knit.colorSpace=T.SRGBColorSpace;knit.repeat.set(4,4);
  const glove=mat(0xece8df,.85,0,{map:knit}),leather=mat(0xe0d2b7,.78,0,{map:knit}),skin=mat(0xdaaa86,.61);
  function sleeveMap(kind){
    const tex=texture(128,128,c=>{
      c.fillStyle=kind===0?'#35505e':kind===1?'#bd695b':'#617d79';c.fillRect(0,0,128,128);
      c.lineWidth=1;c.strokeStyle='rgba(240,230,207,.20)';
      for(let i=0;i<128;i+=4){c.beginPath();c.moveTo(i,0);c.lineTo(i,128);c.stroke();}
      if(kind===0){for(let y=0;y<128;y+=14){c.setLineDash([3,9]);c.beginPath();c.moveTo(0,y);c.lineTo(128,y);c.stroke();}}
      else for(let y=0;y<=128;y+=64)for(let x=0;x<=128;x+=64){
        let xx=x+(y%128===0?0:32);c.fillStyle=kind===1?'#e6c7a8':'#d3d6ba';
        for(let i=0;i<5;i++){let a=PI*2*i/5;c.beginPath();c.ellipse(xx+6*Math.sin(a),y+6*Math.cos(a),4,6,-a,0,PI*2);c.fill();}
      }
    });tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  function hand(p,kind){
    // Fingertips point along +Y. The wrist and the arm continue into the sleeve.
    let g=group(p),m=[leather,glove,skin][kind],sl=mat(0xffffff,.84,0,{map:sleeveMap(kind)});
    let sleeve=revolve(g,[[.28,-2.9],[.41,-2.2],[.43,-1.25],[.47,-.51],[.42,-.30],[.32,-.29]],sl,0,-.28,-.01,36);
    sleeve.scale.z=.78;
    let cuff=revolve(g,[[.25,-.68],[.32,-.64],[.33,-.48],[.29,-.42]],kind===2?sl:knitCuff,0,0,0);cuff.scale.z=.74;
    ball(g,0,-.07,0,.337,.53,.20,m);
    const lengths=kind===1?[.51,.43,.35,.27]:[.43,.48,.43,.32];
    const angles=[-.08,-.035,.025,.105],fingers=[];
    for(let i=0;i<4;i++){
      let x=-.219+i*.146,l=lengths[i],by=.19-Math.abs(1.05-i)*.045,angle=angles[i];
      let joint=group(g,x,by,.0);fingers.push(joint);let finger=ball(joint,0,l*.49,-.010,.093,l*.64,.107,m);finger.rotation.z=angle+(kind===1&&i>0?-.14:0);
      if(kind===2){let nail=ball(joint,-angle*l*.4,l*.96,.053,.050,.073,.031,nailM);nail.rotation.z=angle;}
    }
    let thumb=ball(g,-.308,.045,.032,.135,.29,.129,m);thumb.rotation.z=-.63;
    if(kind!==2){for(let i=0;i<3;i++)line(g,[[-.16+i*.14,.20,.171],[-.16+i*.14,.02,.198],[-.12+i*.12,-.19,.174]],.007,thread,8,4);}
    for(const finger of fingers)g.remove(finger);
    bake(g);for(const finger of fingers){bake(finger);g.add(finger);}
    g.userData.fingers=fingers;return g;
  }
  const knitCuff=mat(0xc6c2ae,.87,0,{map:knit}),nailM=mat(0xe9bea5,.52),thread=mat(0xc6beaa,.88);
  const lanternPaper=phys(0xcb5133,.63,{emissive:0xe87636,emissiveIntensity:.18}),rib=mat(0x98432e,.67),
        lacquer=phys(0x3d3730,.32,{clearcoat:.3}),cord=mat(0xb79965,.83);
  function lantern(p,s=1){
    let g=group(p);
    let profile=[];for(let i=0;i<=56;i++){
      let u=i/56,y=(u-.5)*1.72,r=.34+.267*Math.pow(Math.sin(PI*u),.69)-.011*Math.cos(PI*2*u*14);profile.push([r,y]);
    }revolve(g,profile,lanternPaper);
    for(let i=0;i<=14;i++){let u=i/14,r=.339+.267*Math.pow(Math.sin(PI*u),.69);ring(g,0,(u-.5)*1.72,0,r,.012,rib,PI/2);}
    for(let s of [-1,1]){let cap=revolve(g,[[.02,-.077],[.35,-.077],[.386,-.045],[.386,.057],[.33,.085],[.02,.085]],lacquer,0,s*.892,0);ring(g,0,s*.895,.0,.39,.011,brass,PI/2);}
    line(g,[[-.23,.93,0],[-.17,1.2,0],[.0,1.29,0],[.18,1.2,0],[.23,.93,0]],.026,cord);
    line(g,[[0,-.96,0],[.02,-1.03,0],[0,-1.14,0]],.031,brass);
    for(let k=0;k<13;k++){let a=k*2.4,dx=Math.cos(a)*.052;line(g,[[dx*.3,-1.11,.01],[dx*.63,-1.25,.015*Math.sin(a)],[dx*1.25+.018,-1.42+rand()*.07,.04*Math.sin(a)]],.011,rib,5,4);}
    let crest=group(g,0,.0,.59);crest.scale.x=.96;ring(crest,0,0,0,.237,.015,ivory);flower(crest,0,0,.002,.18,ivory);
    g.scale.setScalar(s);return bake(g);
  }
  function fabricMap(){
    let t=texture(256,256,(c,w,h)=>{
      c.fillStyle='#304c58';c.fillRect(0,0,w,h);
      for(let i=0;i<256;i++){c.fillStyle=i%3===0?'rgba(232,225,190,.042)':'rgba(14,34,49,.055)';c.fillRect(i,0,1,h);c.fillRect(0,i,w,1);}
      c.strokeStyle='#8d9d94';c.lineWidth=1.8;c.setLineDash([4,4]);c.strokeRect(5,5,246,244);
      c.setLineDash([]);c.lineWidth=2.5;c.strokeStyle='#b5bbab';c.beginPath();c.moveTo(0,236);c.lineTo(256,236);c.stroke();
    },false);t.colorSpace=T.SRGBColorSpace;return t;
  }
  const curtainMat=mat(0xffffff,.93,0,{map:fabricMap(),side:T.DoubleSide}),crestM=mat(0xd6d8bd,.89);
  function awning(p,w,h){
    let count=w<9?3:5,span=w/count;
    for(let j=0;j<count;j++){
      let g=group(p,(j+.5)*span-w*.5,0,0),geo=new T.PlaneGeometry(span-.045,h,26,12),pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){
        let x=pos.getX(i),y=pos.getY(i),u=x/span+.5,v=y/h+.5;
        pos.setXYZ(i,x,y+.077*Math.cos(PI*2*u)*(1-v),.07*Math.cos(u*PI*3+.4*j)+y*.24);
      }geo.computeVertexNormals();mesh(g,geo,curtainMat);
      let crest=group(g,0,-.05,.105);
      if(j===Math.floor(count/2)){ring(crest,0,0,0,.30,.018,crestM);flower(crest,0,0,.005,.21,crestM);}
      else{
        // A small repeating seigaiha wave, printed on the same indigo valance.
        for(let k=0;k<3;k++)for(let a=0;a<2;a++){
          let pts=[];for(let b=0;b<=12;b++){let angle=PI*b/12;pts.push([(k-1)*.31+(.15+a*.047)*Math.cos(angle),-.06+(.15+a*.047)*Math.sin(angle),0]);}
          line(crest,pts,.010,crestM,12,5);
        }
      }
    }
  }
  function emblem(parent,index,m){
    let g=group(parent);
    if(index===0){
      line(g,[[-.20,-.17,0],[-.18,.12,0],[-.10,.23,0],[.02,.23,0],[.11,.12,0],[.10,-.08,0],[.18,-.19,0],[.25,-.17,0]],.048,m);
      line(g,[[-.11,-.16,0],[-.09,.06,0],[-.04,.14,0],[.0,.11,0],[.0,-.05,0],[.07,-.20,0]],.023,m);
    }else if(index===1){
      for(let k=0;k<2;k++){let pts=[];for(let i=0;i<=16;i++){let u=i/16;pts.push([-.25+.50*u,(k?1:-1)*.08*Math.cos(u*PI*2.4)+u*.17-.08,0]);}line(g,pts,.032,m,18);}
    }else if(index===2){
      for(let s of [-1,1]){ring(g,s*.104,-.144,0,.076,.022,m);line(g,[[s*.10,-.07,0],[s*.024,.011,0],[-s*.126,.22,0]],.025,m,6);}
    }else{
      box(g,0,0,0,.25,.22,.025,m,.083,.012);
      for(let s of [-1,1])line(g,[[s*.14,0,0],[s*.26,.095,0],[s*.26,-.095,0],[s*.14,0,0]],.023,m,5);
    }bake(g);return g;
  }
  function guide(p){
    let g=group(p);box(g,0,0,0,4.76,.85,.07,darkwood,.34,.045);box(g,0,0,.10,4.51,.68,.045,indigo,.28,.016);
    let spots=[];for(let i=0;i<4;i++){
      let x=(i-1.5)*1.00,med=group(g,x,0,.15);disk(med,0,0,0,.295,.02,mat(0x48606a,.64));
      let icon=emblem(med,i,ivory);icon.position.z=.034;spots.push(med);
      if(i<3){line(g,[[x+.40,-.034,.15],[x+.47,.011,.15],[x+.40,.056,.15]],.012,brass,4);}
    }let q=ring(g,-1.5,0,.185,.313,.026,brass);
    for(let s of [-1,1])disk(g,s*2.13,0,.152,.037,.017,brass);
    return {g,q};
  }
  return {T,PI,V,rand,group,mesh,ball,box,line,ring,disk,revolve,mat,phys,texture,bake,slab,hardware,plate,wrapped,paper,sheetGeometry,shears,hand,lantern,awning,guide,
    brass,steel,iron,wood,darkwood,clay,indigo,coral,ivory,ink,grain,blueprint,flower};
})();
