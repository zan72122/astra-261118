'use strict';
function buildWorld(scene){
  const {T,rand,mat,group,geo,mesh,box,ball,cyl,rod,ring,profile,rounded,batch}=Kit;
  const L=MorningRoute.LENGTH, chunks=[],crowns=[],people=[],beds=[],controls={},streams=[];
  function section(x,range=65){const g=group(scene,x);chunks.push({x,g,range});return g;}
  const lawn=mat(0x9ea177),grass=mat(0x889666),grassD=mat(0x617c53),stone=mat(0xbeb9a5),curb=mat(0xc6c7b9),walk=mat(0xd8cdb5),
    stripe=mat(0xe7e4cd,.88),iron=mat(0x455454,.50,.65),steel=mat(0x9da9a2,.35,.74),wood=mat(0x927658,.82),
    cream=mat(0xf1e8d3),trim=mat(0xe7e3d1,.67),glass=mat(0x6d898e,.16,.56),glassD=mat(0x415755,.18,.46),
    green=mat(0x577a61,.60,.08),red=mat(0xad5945,.53,.12),terr=mat(0xae785a),soil=mat(0x76674e),bark=mat(0x7e705a),black=mat(0x525952);
  function noiseSurface(base,contrast,repeat){
    const size=192,data=new Uint8Array(size*size*4);
    for(let j=0;j<size;j++)for(let i=0;i<size;i++){
      const n=(rand()-.52)*contrast+.008*Math.cos(i*Math.PI/48)*Math.sin(j*Math.PI/24),v=Math.min(255,Math.max(0,(.91+n)*255)),k=(j*size+i)*4;
      data[k]=v;data[k+1]=v;data[k+2]=v;data[k+3]=255;
    }
    const tex=new T.DataTexture(data,size,size);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;
    const m=mat(base,.90).clone();m.map=tex;return m;
  }
  const asphalt=noiseSurface(0x888b87,.23,[11,4]),roofFinishes=[mat(0xa7654b),mat(0x66766e),mat(0x846f5b),mat(0x9b6c58)];
  const leafMats=[0x819153,0x92a065,0x718a55,0x657e4e,0xa4ad72,0x869b61].map(c=>mat(c,.91,0,{vertexColors:true}));
  const leafGeo=geo('organic foliage',()=>{
    const g=new T.IcosahedronGeometry(1,3),p=g.attributes.position,col=[];
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const noise=.066*Math.sin(x*12+y*7)*Math.cos(z*8)+.057*Math.sin(z*13-y*8+x*4)+.029*Math.cos(x*26-z*17);
      p.setXYZ(i,x*(1+noise),y*(1+noise),z*(1+noise));
      const v=.80+noise*1.1+y*.095+.053*Math.sin(x*32+z*17)*Math.cos(y*21-z*11);
      col.push(v*.99,v,.96*v);
    }
    g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
  });
  // Foliage uses its own vertex colours, so it is instanced without rigid batching.
  const treeProtos=[];
  function tree(p,x,z,size,id=0){
    const g=group(p,x,0,z);g.scale.setScalar(size);
    let proto=treeProtos[id%4];
    if(!proto){
      const trunk=group(),crown=group(),crownB=group();
      rod(trunk,[0,0,0],[.04,2.57,.035],.157,bark,10,.095);
      for(let j=0;j<7;j++){const a=j*2.37+.35;rod(trunk,[.024,1.36+j*.13,0],[Math.cos(a)*.73,2.63+j*.14,Math.sin(a)*.69],.083,bark,9,.03);}
      batch(trunk);
      for(let k=0;k<22;k++){
        const a=k*2.399+id*.72,level=k/22,rad=Math.sin(Math.PI*(.14+level*.80))*(1.41+rand()*.28);
        const target=k%3===0?crownB:crown,m=leafMats[(id+k%3+2)%6],o=mesh(target,leafGeo,m,Math.cos(a)*rad,level*2.25+.12,Math.sin(a)*rad*.85);
        o.scale.set(.62+rand()*.38,.64+rand()*.37,.62+rand()*.37);o.rotation.y=a;
      }
      // One instanced draw per leaf finish and branch.
      for(const branch of [crown,crownB]){const bins=new Map();for(const o of branch.children){o.updateMatrix();if(!bins.has(o.material))bins.set(o.material,[]);bins.get(o.material).push(o.matrix.clone());}
        branch.clear();for(const [m,ms] of bins){const ins=new T.InstancedMesh(leafGeo,m,ms.length);ms.forEach((v,i)=>ins.setMatrixAt(i,v));ins.castShadow=ins.receiveShadow=true;branch.add(ins);}}
      proto=treeProtos[id%4]=[trunk,crown,crownB];
    }
    g.add(proto[0].clone());for(let k=1;k<=2;k++){const c=proto[k].clone();c.position.y=2.0;g.add(c);crowns.push({o:c,i:(id*3+k*2+crowns.length)%18});}
  }
  function shrub(p,x,y,z,w,h,d,tone=0){
    // Rounded hedge with clipped shoulders, leaf stippling and a dark lower edge.
    const m=[mat(0x85955d),mat(0x728756),mat(0x91a16a)][tone%3];
    rounded(p,x,y+h*.48,z,w,h*.94,d,.16,m);
    for(let i=0;i<Math.ceil(w*1.7);i++){
      const k=(i+.5)/Math.ceil(w*1.7);
      ball(p,x+(k-.5)*w,y+h*.83,z+Math.sin(i*18)*d*.14,.34,.16+rand()*.075,d*.50,m,8);
    }
  }
  const flowerColors=[0xd39a65,0xf2dfaf,0xcc897e,0xd9b7ca].map(c=>mat(c));
  function flower(p,x,y,z,h,m){
    rod(p,[x,y,z],[x+.035,y+h,z],.012,grassD,6);
    const l=ball(p,x-.044,y+h*.48,z,.080,.026,.035,grassD,8);l.rotation.z=-.4;
    for(let k=0;k<5;k++){const a=k*1.2566;ball(p,x+.035+Math.cos(a)*.045,y+h+.017,z+Math.sin(a)*.045,.051,.026,.049,m,8);}
    ball(p,x+.035,y+h+.035,z,.030,.023,.029,mat(0xcfab58),8);
  }
  function planter(p,x,z,w=.89,small=false){
    box(p,x,.18,z,w,.3,.44,terr);box(p,x,.34,z,w+.055,.07,.49,terr);box(p,x,.377,z,w-.05,.018,.39,soil);
    for(let i=0;i<(small?3:6);i++)flower(p,x+(rand()-.5)*w*.84,.38,z+(rand()-.5)*.30,.14+rand()*.17,flowerColors[i%4]);
  }
  function fence(p,x,z,w){
    const n=Math.floor(w/.32);
    for(const y of [.31,.61])box(p,x,y,z-.06,w,.077,.073,trim);
    for(let i=0;i<n;i++){const px=x-w/2+(i+.5)*w/n;
      profile(p,[[-.073,.08],[.073,.08],[.073,.73],[0,.81],[-.073,.73]],.068,trim,px,0,z,0);}
    for(const dx of [-w/2,w/2]){box(p,x+dx,.46,z,.17,.83,.18,cream);box(p,x+dx,.90,z,.215,.065,.21,trim);}
  }
  function mailbox(p,x,z){
    box(p,x,.62,z,.105,1.21,.12,wood);rounded(p,x,1.20,z,.43,.34,.34,.079,red);
    box(p,x,1.267,z+.174,.255,.026,.013,black);box(p,x,1.17,z+.18,.089,.038,.017,mat(0xe1d4ac));
  }
  function windowModel(p,x,y,z,w,h,shutters,accent,lit=false){
    box(p,x,y,z,w+.16,h+.18,.127,trim);box(p,x,y,z+.077,w,h,.052,lit?glassD:glass);
    for(const side of [-1,1]){
      box(p,x+side*w*.5,y,z+.122,.049,h+.055,.071,cream);
      if(shutters){
        const sx=x+side*(w*.5+.207);box(p,sx,y,z+.058,.311,h+.04,.080,accent);
        for(let j=0;j<8;j++){const b=box(p,sx,y-h*.38+j*h*.11,z+.108,.239,.036,.028,accent);b.rotation.x=-.24;}
      }
    }
    box(p,x,y,z+.118,.057,h,.069,trim);box(p,x,y+.035,z+.12,w,.057,.07,trim);
    box(p,x,y-h*.5-.095,z+.03,w+.27,.108,.29,stone);
    // Interior curtain panels behind the window mullions.
    for(const side of [-1,1])profile(p,[[0,0],[side*w*.18,0],[side*w*.048,-h*.60]],.006,mat(0xd6d5bf),x+side*(-w/2+.035),y+h/2-.027,z+.106,0);
  }
  const houseProtos=[];
  function houseProto(id,two){
    const key=id%6+(two?6:0);if(houseProtos[key])return houseProtos[key];
    const g=group(),w=5.4+(id%3)*.35,d=4.1+(id%2)*.5,h=two?4.25:2.94,rise=1.72+(id%3)*.17,
      wall=[cream,mat(0xc4c9b3),mat(0xddc4a8),mat(0xb7c7c0),mat(0xe2d8bf),mat(0xcec5ae)][id%6],
      roof=roofFinishes[id%4],accent=[green,mat(0x758a83),mat(0x899270),mat(0x7a8589)][id%4],face=d*.5;
    box(g,0,.25,0,w+.12,.49,d+.10,stone);box(g,0,h*.5+.35,0,w,h-.25,d,wall);
    const eave=h+.22;
    profile(g,[[-w/2,eave-.03],[w/2,eave-.03],[0,eave+rise]],d,wall,0,0,0,.007);
    const angle=Math.atan2(rise,w/2),span=Math.hypot(w/2+.35,rise+.35*Math.tan(angle));
    for(const side of [-1,1]){
      const p=group(g,side*(w/2+.35)*.5,eave+rise-(w/2+.35)*.5*Math.tan(angle),0);p.rotation.z=-side*angle;
      box(p,0,0,0,span,.15,d+.68,roof);
      box(p,side*span*.5,-.075,0,.139,.20,d+.72,trim);
      // Overlapping tile courses and sparingly placed tile joints catch raking sunlight.
      const n=Math.round(span/.31);
      for(let i=0;i<n;i++)box(p,-span/2+i*span/n,.087,0,.046,.051,d+.68,roof);
      for(let i=0;i<9;i++)box(p,0,.080,(i-4)*(d+.58)/9,span,.017,.026,roof);
      box(p,0,-.015,face+.37,span,.175,.095,trim);
      rod(g,[side*(w*.5+.34),eave-.13,-face-.32],[side*(w*.5+.34),eave-.13,face+.32],.070,steel);
      rod(g,[side*(w*.5+.09),eave-.13,face-.32],[side*(w*.5+.09),.19,face-.32],.055,steel);
    }
    rod(g,[0,eave+rise+.08,-face-.39],[0,eave+rise+.08,face+.39],.136,roof,12);
    const chimney=mat(0x98755f);box(g,w*.26,eave+rise*.71+.40,-d*.23,.53,1.54,.65,chimney);
    for(let i=0;i<6;i++)box(g,w*.26,eave+rise*.71-.16+i*.21,-d*.23,.54,.022,.66,mat(0xc0a184));
    box(g,w*.26,eave+rise*.71+1.17,-d*.23,.66,.13,.78,chimney);
    const doorx=id%2?-.64:.55;
    rounded(g,doorx,1.20,face+.057,.96,2.04,.118,.059,trim);
    rounded(g,doorx,1.18,face+.14,.78,1.91,.060,.035,accent);
    box(g,doorx,1.57,face+.182,.52,.62,.023,glassD);
    for(const k of [-1,1])box(g,doorx+k*.147,.78,face+.187,.223,.47,.027,accent);
    ball(g,doorx+.276,1.13,face+.208,.041,.041,.036,mat(0xc2a36e,.32,.66),10);
    for(let i=0;i<2;i++)box(g,doorx,.073+i*.085,face+.49-i*.17,1.48,.14,.72-i*.19,stone);
    const awning=box(g,doorx,2.38,face+.43,1.56,.11,.84,roof);awning.rotation.x=.15;
    for(const side of [-1,1])rod(g,[doorx+side*.59,2.04,face+.11],[doorx+side*.59,2.32,face+.64],.042,wood);
    const wx=doorx>0?-1.28:1.32;
    windowModel(g,wx,1.60,face,1.33,1.18,true,accent);
    const winx=doorx>0?1.94:-1.94;windowModel(g,winx,1.59,face,.74,.99,false,accent);
    if(two)for(const x of [-1.39,1.34])windowModel(g,x,3.43,face,1.10,.99,true,accent);
    windowModel(g,0,eave+.45,face,.70,.66,false,accent,true);
    for(const side of [-1,1]){const sidewin=group(g,side*w/2,0,-.15);sidewin.rotation.y=side*Math.PI/2;windowModel(sidewin,0,1.64,0,1.44,1.13,false,accent);}
    box(g,wx,.916,face+.21,1.31,.20,.32,terr);
    for(let j=0;j<10;j++)ball(g,wx+(j-4.5)*.12,1.042+rand()*.074,face+.19,.115,.105,.101,j%3?grassD:flowerColors[id%4],8);
    const lighting=mat(0xf6e5b7,.47,.05,{emissive:0xe7cb8a,emissiveIntensity:.22});
    box(g,doorx-.62,1.88,face+.13,.15,.25,.16,lighting);box(g,doorx-.62,2.027,face+.13,.207,.06,.196,iron);
    return houseProtos[key]={o:batch(g),eave,face,wx};
  }
  function home(x,z,id,two=false,reverse=false,wave=false){
    const p=section(x),lot=group(p,0,0,z);if(reverse)lot.rotation.y=Math.PI;
    const h=houseProto(id,two);lot.add(h.o.clone());const front=h.face;
    const land=group(lot);
    box(land,0,.013,front+1.68,8.8,.032,3.65,lawn);
    box(land,id%2?-.64:.55,.045,front+1.75,1.22,.052,3.1,walk);
    for(let j=0;j<4;j++)box(land,id%2?-.64:.55,.074,front+.99+j*.55,1.22,.017,.024,stone);
    shrub(land,-2.24,.055,front+2.18,2.58,.83,.73,id);
    shrub(land,2.51,.055,front+2.06,1.98,.62,.70,id+1);
    fence(land,-2.49,front+2.88,2.92);fence(land,2.58,front+2.88,2.01);
    mailbox(land,1.22,front+2.76);
    planter(land,-1.41,front+.50,.77,true);batch(land);
    if(wave){
      const person=group(lot,-.14,h.eave+.33,h.face+.151),shade=mat(0x57635b,.88);
      ball(person,0,.14,0,.093,.11,.044,shade);ball(person,0,-.015,0,.13,.15,.046,shade);
      const arm=group(person,.082,.005,.009);rod(arm,[0,0,0],[.08,.18,.011],.035,shade);ball(arm,.08,.19,.01,.039,.047,.029,shade);
      people.push(arm);
    }
  }
  // Street tiles meet at road level. The bridge replaces a whole stretch of riverbank.
  const roadTiles=[[-35,42],[42,70],[70,94],[94,118],[134,176],[176,228],[228,283],[283,321]];
  for(const [a,b] of roadTiles){
    const len=b-a,x=(a+b)/2,p=section(x,len/2+84),g=group(p);box(g,0,-.28,0,len,.54,6.50,asphalt);
    const town=b<=42||a>=283||a<0;
    for(const side of [-1,1]){
      box(g,0,-.18,side*3.39,len,.48,.31,curb);
      box(g,0,.025,side*4.13,len,.126,1.21,walk);
      if(a<70||a>=176)box(g,0,-.14,side*30.8,len,.29,52,lawn);
      else if(side>0)box(g,0,-.14,30,len,.29,51,lawn);
      if(a>=70&&a<176&&side<0)box(g,0,-.14,-5.2,len,.27,1.1,lawn);
      for(let i=0;i<len;i+=1.42){box(g,i-len*.5,.066,side*3.40,.016,.006,.29,stone);}
      for(let i=0;i<len;i+=2.65)box(g,i-len*.5,.092,side*4.13,.014,.008,1.18,stone);
      for(let i=0;i<len;i+=4.2)box(g,i-len*.5+1,.002,side*2.95,town?2.1:3.2,.012,.065,stripe);
    }
    for(let i=0;i<len;i+=6.8)box(g,i-len*.5+1.66,.003,0,2.85,.012,.093,stripe);
    batch(g);
  }
  const damp=mat(0x78817b,.18,.31);
  for(const [x,z,length] of [[-2.7,3.05,2.1],[5.9,-3.11,1.45],[26.8,3.04,2.4],[98,-3.07,1.7],[204,-3.02,2.2],[319,3.07,1.58]]){
    const p=section(x),outline=new T.Shape();
    for(let i=0;i<35;i++){const a=i*Math.PI*2/34,k=.85+.12*Math.cos(a*3)+.041*Math.cos(a*7);
      const xx=Math.cos(a)*length*k,zz=Math.sin(a)*.16*k;i?outline.lineTo(xx,zz):outline.moveTo(xx,zz);}
    const wet=mesh(p,new T.ShapeGeometry(outline),damp,0,-.003,z);wet.rotation.x=-Math.PI/2;wet.castShadow=false;
  }
  // Zebra crossing and recessed drains are physical inlays.
  for(const x of [9.7,42,290.2,325]){const p=section(x);
    for(let j=0;j<9;j++)box(p,0,.014,(j-4)*.70,1.57,.016,.36,stripe);batch(p);}
  for(const x of [-4,12,31,61,200,301,338]){const p=section(x);
    for(const side of [-1,1]){box(p,0,.005,side*3.06,.63,.011,.25,iron);for(let i=0;i<10;i++)box(p,(i-4.5)*.056,.014,side*3.055,.020,.013,.19,steel);}
    batch(p);}
  const rows=[[-24,4],[-14,3],[-5.7,1],[3.3,0],[12.7,2],[22.5,3],[32.3,4],[43.7,1],[55.5,5],[281,1],[293,2],[308,4],[319,0]];
  rows.forEach(([x,id],i)=>home(x,-9.8-(i%2)*.24,id,i%5===0,false,i===3||i===6||i===16));
  for(const [x,id] of [[-15,4],[17,2],[40,3],[65,1],[289,2],[316,3]])home(x,18.4,id,false,true);
  for(const [x,z,size,id] of [[-10,-6.1,1.05,1],[8,-7.8,.99,3],[18,-6.8,1.05,0],[29,-6.8,1.11,1],[39,-6,1.2,2],[-10,15.9,.89,2],[26,16.4,.91,1],[-21,16.6,1.02,0]]){
    const p=section(x);tree(p,0,z,size,id);}
  for(let x=48,i=0;x<320;x+=9.7,i++){
    const p=section(x);if(x<70||x>176)tree(p,0,-7.8-(i%3)*2.3,.86+(i%5)*.11,i%4);
    if(i%2===0&&(x<88||x>260))tree(p,1.9,16.1,.89,i%3);
  }
  // Far neighbourhoods are low relief only through camera distance, each is solid geometry.
  for(let i=0;i<23;i++){
    const x=-30+i*15.5,p=section(x,110),z=(x>65&&x<182?-60:-24)-(i%4)*3.1;
    const hg=group(p,0,0,z);hg.rotation.y=(i%3-1)*.19;hg.scale.setScalar(.85+(i%3)*.09);
    hg.add(houseProto((i+2)%6,i%4===0).o.clone());
    tree(p,5.9,z+2.9,1.03+(i%4)*.12,(i+2)%4);
  }
  // Local street furniture.
  function lamp(x,z){
    const p=section(x);cyl(p,0,.13,z,.16,.23,.27,iron);cyl(p,0,2.15,z,.065,.092,4.25,mat(0x67746c,.50,.48));
    rod(p,[0,4.22,z],[.08,4.49,z+.05],.063,iron);rod(p,[.08,4.49,z+.05],[.77,4.54,z+.08],.060,iron);
    ball(p,.77,4.49,z+.08,.29,.086,.16,iron);ball(p,.77,4.439,z+.08,.24,.041,.135,mat(0xe5dec5,.34));batch(p);
  }
  [-8.8,15.8,37.8,79.8,162.8,197.4,286,315].forEach(x=>lamp(x,-4.30));
  function basket(x,z){
    const p=section(x),g=group(p,0,.09,z),wire=mat(0x81938a,.41,.51);
    box(g,0,.075,0,.79,.09,.55,iron);
    for(const side of [-1,1]){
      for(let j=0;j<7;j++)rod(g,[-.37+j*.122,.09,side*.24],[-.395+j*.13,.48,side*.291],.017,wire,7);
      for(let j=0;j<4;j++)rod(g,[side*.36,.09,-.23+j*.147],[side*.397,.48,-.28+j*.185],.017,wire,7);
      for(const y of [.12,.31,.51]){rod(g,[-.40,y,side*.286],[.40,y,side*.286],.020,wire,7);rod(g,[side*.398,y,-.286],[side*.398,y,.286],.020,wire,7);}
    }batch(p);
  }
  MorningRoute.STOPS.slice(0,3).forEach((x,i)=>basket(x-3.64,3.9+i*.04));
  const fg=section(.3);planter(fg,-.3,5.0,1.22);batch(fg);
  // River curves into the horizon on the right and under the balance bridge.
  const riverG=section(126,110),waterMat=mat(0x779c9b,.21,.42),waterGeo=new T.PlaneGeometry(1,1,68,34);waterGeo.rotateX(-Math.PI/2);
  const waterMesh=mesh(riverG,waterGeo,waterMat);waterMesh.castShadow=false;
  const wp=waterGeo.attributes.position,waterBase=[];
  for(let i=0;i<wp.count;i++){const x=wp.getX(i)*132,z=wp.getZ(i)*108-8;waterBase.push([x,z]);wp.setXYZ(i,x,-1.12,z);}
  waterGeo.computeBoundingSphere();
  const bank=group(riverG);
  for(const side of [-1,1]){const edge=side*9.0;
    box(bank,edge,-.67,-.7,2.0,1.48,14.8,stone);
    for(let j=0;j<13;j++)box(bank,edge, .12,-7.4+j*1.14,2.16,.18,1.11,curb);
    cyl(bank,side*5.0,-.80,-2.9,.41,.54,1.0,stone);
  }
  for(let j=0;j<25;j++){const x=-60+j*4.95;
    ball(bank,x,-.91,-54+Math.cos(j*.8)*3.7,5.2+rand()*2,1.17+rand()*.71,6.2,grass,12);}
  for(const [start,end] of [[-56,-8],[8,50]]){
    box(bank,(start+end)/2,-.53,-5.77,end-start,1.28,.42,stone);
    for(let j=start;j<end;j+=2.4){
      cyl(bank,j,.44,-4.66,.052,.075,.87,iron);
      rod(bank,[j,.78,-4.66],[Math.min(j+2.4,end),.78,-4.66],.041,steel);
      rod(bank,[j,.39,-4.66],[Math.min(j+2.4,end),.39,-4.66],.025,steel);
    }
  }
  batch(bank);
  const bridge=group(riverG,-8,0,0),deck=group(bridge);
  box(deck,8,-.12,0,16,.22,6.54,asphalt);
  for(const side of [-1,1]){
    box(deck,8,.075,side*3.66,16,.20,.96,walk);
    box(deck,8,-.27,side*3.85,16,.38,.26,green);
    for(let i=0;i<=8;i++){
      box(deck,i*1.96,.69,side*4,.093,1.27,.102,iron);
      if(i<8)rod(deck,[i*1.96,.23,side*4],[(i+1)*1.96,1.20,side*4],.032,green);
    }
    for(const y of [.30,1.25])rod(deck,[0,y,side*4],[16,y,side*4],.067,green);
    box(deck,8,.016,side*2.95,16,.02,.066,stripe);
  }
  for(let j=0;j<3;j++)box(deck,j*5.2+1.7,.018,0,2.50,.02,.091,stripe);batch(deck);
  const wheelRoot=section(110.1),wheelBase=group(wheelRoot,0,.07,3.72);
  box(wheelBase,0,.42,0,.67,.84,.64,green);rounded(wheelBase,0,.85,0,.79,.12,.74,.04,cream);
  const handwheel=group(wheelBase,0,1.13,.29);ring(handwheel,0,0,0,.48,.065,red);
  for(let i=0;i<5;i++)rod(handwheel,[0,0,0],[.45*Math.cos(i*1.257),.45*Math.sin(i*1.257),0],.033,red);
  ball(handwheel,0,0,.03,.10,.10,.08,steel);batch(handwheel);controls.wheel=handwheel;
  const boat=group(riverG,3,-.91,4),hull=group(boat);
  profile(hull,[[-2.5,.26],[-2.04,-.14],[1.59,-.16],[2.44,.39],[1.82,.42],[-2.24,.40]],1.32,mat(0x587b7e,.34,.22),0,0,0,.12);
  box(hull,0,.47,0,3.68,.097,1.32,trim);rounded(hull,-.37,.79,0,1.5,.64,1.07,.09,cream);
  box(hull,-.36,1.16,0,1.67,.09,1.24,red);for(const z of [-.55,.55])box(hull,-.35,.88,z,1.07,.35,.034,glass);
  rod(hull,[.65,.48,0],[.65,1.69,0],.040,wood);profile(hull,[[0,0],[-.56,-.15],[0,-.26]],.02,red,.65,1.69,0,.006);
  for(const z of [-.75,.75])for(const x of [-1.4,.79])ring(hull,x,.37,z,.17,.046,black,20);batch(hull);
  boat.rotation.y=1.34;
  for(const [x,id] of [[241,0],[257,1],[272,2]]){
    const p=section(x),k=group(p),z=-8.0;
    for(let j=0;j<5;j++){
      box(k,0,.12,z-j*1.12,9.5,.23,.78,soil);
      for(let t=0;t<16;t++){
        const px=(t-7.5)*.56,py=.27+(j%3)*.055;
        ball(k,px,py,z-j*1.12,.223,.20,.209,j%2?grassD:grass,10);
        if(j===2)ball(k,px+.10,py+.145,z-j*1.12+.04,.083,.079,.072,flowerColors[id%3],8);
      }
    }
    fence(k,0,-5.55,7.14);
    const pot=group(k,-4.4,.02,-5.95);
    for(let j=0;j<3;j++){cyl(pot,j*.46,.22,0,.22,.15,.42,terr);ball(pot,j*.46,.53,0,.23,.24,.23,grassD,10);}
    if(id===1){
      const shed=group(k,1,0,-17.8),panes=mat(0xabbeb2,.24,.37);
      box(shed,0,1.23,0,7.1,2.45,3.6,panes);
      profile(shed,[[-3.55,2.44],[3.55,2.44],[0,3.95]],3.6,panes,0,0,0,.018);
      for(let q=0;q<9;q++){const xx=-3.55+q*.8875;
        box(shed,xx,1.23,1.83,.062,2.46,.065,trim);
        rod(shed,[xx,2.46,1.83],[xx,3.94-Math.abs(xx)*.417,1.83],.032,trim);
      }
      for(const y of [.10,1.25,2.45])box(shed,0,y,1.83,7.19,.068,.069,trim);
    }
    batch(k);
  }
  // Receiving hall: glazed clerestory, green sliding doors and an exposed conveyor.
  const plant=section(214,83),factory=group(plant),factoryWall=mat(0xc8caba),roofMetal=mat(0x70867e,.45,.42);
  box(factory,2,2.46,-12.1,15.9,4.92,7.7,factoryWall);
  for(let j=0;j<3;j++){
    const bay=group(factory,-5.96+j*5.29,0,-12.1);
    profile(bay,[[0,4.87],[5.27,4.87],[5.27,6.14]],8.02,roofMetal,0,0,0,.03);
    box(bay,5.30,5.45,0,.052,.79,7.75,glass);
  }
  for(let j=0;j<3;j++){const x=-3.3+5.29*j;
    box(factory,x,1.74,-8.17,4.2,3.55,.25,green);
    for(let k=0;k<11;k++)box(factory,x,.20+k*.306,-8.015,4.06,.037,.052,roofMetal);
    for(let k=0;k<3;k++)box(factory,x-1.35+k*1.35,4.21,-8.16,1.15,.63,.13,glass);
  }
  for(let j=0;j<2;j++){
    const x=12.8+j*2.61;cyl(factory,x,2.3,-11.5,1.09,1.09,4.6,mat(0xc6cbc2,.34,.65),32);
    ball(factory,x,4.58,-11.5,1.08,.39,1.08,steel);for(let k=0;k<4;k++)ring(factory,x,.68+k*1.12,-11.5,1.088,.029,iron).rotation.x=Math.PI/2;
  }
  box(factory,-3.85,.11,-3.14,1.48,.20,11.0,black);
  for(const x of [-4.63,-3.07])box(factory,x,.26,-3.15,.09,.38,11.2,green);
  for(let j=0;j<4;j++)cyl(factory,-4.65,.42,-.2-j*1.64,.076,.076,.84,steel);
  batch(factory);
  const slats=group(plant,-3.84,.24,-3.16);for(let i=0;i<28;i++)box(slats,0,0,-5.13+i*.38,1.39,.029,.046,steel);batch(slats);
  const leverBase=group(plant,-2.9,0,3.98);box(leverBase,0,.48,0,.63,.97,.57,green);
  rounded(leverBase,0,.99,0,.70,.14,.64,.035,cream);
  const lever=group(leverBase,0,1.02,0);rod(lever,[0,0,0],[.04,.68,.03],.057,steel);rounded(lever,.04,.72,.03,.56,.17,.18,.079,red);batch(lever);controls.lever=lever;
  const garden=section(341),yard=group(garden,-1.2,.09,3.98);
  box(yard,0,.14,0,2.91,.28,.86,wood);box(yard,0,.287,0,2.76,.035,.74,soil);
  const stems=[];
  for(let i=0;i<5;i++){const plant=group(yard,-1.03+i*.515,.308,(i%2-.5)*.20);flower(plant,0,0,0,.36+i%3*.12,flowerColors[i%4]);batch(plant);stems.push(plant);}
  const can=group(yard,2.34,.58,.04);
  cyl(can,0,0,0,.27,.32,.52,mat(0x809988,.34,.40),24);
  rod(can,[-.19,-.16,0],[-.73,.29,0],.095,green,16,.052);
  ball(can,-.735,.31,0,.117,.075,.12,steel);ring(can,.29,.09,0,.22,.044,green);
  ring(can,0,.22,0,.25,.041,green);batch(can);controls.can=can;
  const drops=[];for(let i=0;i<20;i++){const o=ball(yard,0,0,0,.021,.049,.021,mat(0x93bbc4,.12,.33),8);drops.push(o);}
  for(const x of [2.0,13,31,342]){const p=section(x),flowerbed=group(p,0,.10,-4.94);
    box(flowerbed,0,.08,0,1.62,.15,.54,terr);box(flowerbed,0,.162,0,1.51,.025,.44,soil);
    const blooms=group(flowerbed,0,.17,0);for(let i=0;i<7;i++)flower(blooms,(i-3)*.20,0,(i%2-.5)*.12,.24+i%3*.046,flowerColors[(i+2)%4]);batch(blooms);beds.push(blooms);}
  const bagModels=[0,1,2].map(i=>makeBag(scene,i));
  // Low relief hills sit beyond the furthest street; atmospheric fog separates their silhouettes.
  const horizon=group(scene);
  for(let i=0;i<28;i++){
    const a=i*Math.PI*2/28,rr=156+(i%5)*4.3;
    ball(horizon,Math.cos(a)*rr,-1.9,Math.sin(a)*rr,28+i%5*4.5,9+(i%4)*2.8,24+i%3*4.1,mat([0x94aa98,0xa0afa0,0xa9b6a4][i%3]),16).castShadow=false;
  }batch(horizon);
  const moteAnchors=[-7,-5,-2,0,1.5,3.2,5.5,12,25,36,72,109,124,190,212,241,314,340];
  const motes=[];for(let i=0;i<18;i++){const o=ball(scene,0,0,0,.011,.014,.011,mat(0xe4d9ac,.72,0,{emissive:0xe2cda4,emissiveIntensity:.12}),6);o.castShadow=false;motes.push(o);}
  return {controls,bagModels,update(sim){
    const s=sim.s,dist=s.distance;
    for(const {x,g,range} of chunks){g.position.x=x+Math.round((dist-x)/L)*L;g.visible=Math.abs(g.position.x-dist)<range;}
    horizon.position.x=dist;
    for(const {o,i} of crowns){o.rotation.z=s.leaves[i].x*.76;o.rotation.x=s.leaves[(i+4)%18].x*.41;}
    people.forEach((o,i)=>o.rotation.z=-(s.wave.x+s.leaves[i].x));
    for(let i=0;i<bagModels.length;i++){
      const b=s.bags[i],o=bagModels[i];o.visible=b.mode!=='stored'&&Math.abs(dist-b.x)<54;
      const packed=b.mode==='packed'||b.mode==='slide';
      o.position.set(b.x,b.y,b.z);
      const compression=b.squash.x,width=Math.sqrt(b.volume/.18);o.scale.set((1+compression*.42)*width,1-compression,(1+compression*.5)*width);
      o.rotation.z=b.mode==='gripped'?sim.s.arm.v*.15:packed?s.bed.x*.64:s.leaves[i].x*.16+b.wobble.x;
    }
    if(riverG.visible){
      for(let i=0;i<wp.count;i++){
        const [x,z]=waterBase[i],j=(Math.abs(Math.floor(x*1.3+z*.89))%28),k=Math.abs(Math.floor(z*.73-x*.88))%28;
        wp.setY(i,-1.12+s.water[j].x*.8+s.water[k].x*.6+.013*Math.cos(z*1.71+x*.62));
      }wp.needsUpdate=true;waterGeo.computeVertexNormals();
      boat.position.set(2.4+Math.sin(s.boat*.06)*3.4,-.91+s.water[13].x,11-s.boat+s.lap*48);boat.rotation.z=s.water[2].x*.85;
    }
    bridge.rotation.z=s.bridge.x;handwheel.rotation.z=s.valve.x*.3+(1-s.bridge.x/.91)*4.3;
    slats.position.z=-3.16-s.beltTravel%.38;lever.rotation.z=-.34+s.lever.x*.99;
    can.rotation.z=.1+s.can.x*.98;can.position.y=.58+s.can.x*.43;can.position.x=s.canX.x;
    stems.forEach((o,i)=>{o.scale.y=.11+.89*s.flowers[i].x;o.rotation.z=s.leaves[i+5].x*(.24+s.flowers[i].x);});
    drops.forEach((o,i)=>{const d=s.drips[i];o.visible=d.live;if(d.live)o.position.set(d.x,d.y,d.z);});
    beds.forEach(o=>{o.scale.y=.18+.82*s.townBlooms.x;});
    motes.forEach((o,i)=>{const d=s.dust[i];o.position.set(moteAnchors[i]+Math.round((dist-moteAnchors[i])/L)*L+d.x,d.y,((i*7)%13)-6.2+d.x*.3);});
  }};
}
