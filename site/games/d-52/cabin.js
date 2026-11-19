'use strict';
function buildCabin(rig,aspect) {
  const {T,v,tau,M,mat,group,box,ball,cylinder,rod,plate,torus,line,part,mesh,pack,rrshape}=Forms;
  const root=group(rig),shell=group(root), moving=group(root),drum=group(moving);
  root.rotation.y=.084;root.position.set(1.08*Math.sin(.084),0,1.08*(Math.cos(.084)-1));
  const teal=0x70958c, pale=0xf2e3c8, trim=0xc49d65, dark=0x524e42, honey=0xaa7858;
  const D=1.18,H=D*Math.tan(21*Math.PI/180),W=H*aspect;
  // Deep rolled aperture: an extruded enamel casting, nested seals and window beads.
  function surround(parent,w,h,r,outerW,outerH,m,c,z,y,depth){
    const s=rrshape(outerW,outerH,.06),inner=rrshape(w,h,r),path=new T.Path(inner.getPoints(72));s.holes.push(path);
    const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.003,bevelThickness:.004,bevelSegments:3,curveSegments:14});
    return part(parent,geo,m,c,0,y,z);
  }
  const top=H*.971,bottom=-H*.616,mid=(top+bottom)/2,opening=top-bottom,width=2*W*.978;
  const radius=Math.min(.153,width*.25);
  surround(shell,width,opening,radius,2*W+1.6,2*H+1.6,M.shell,teal,-D-.006,mid,.037);
  surround(shell,width-.010,opening-.012,radius, width+.075,opening+.077,M.brass,trim,-D+.034,mid,.008);
  surround(shell,width+.011,opening+.01,radius, width+.063,opening+.060,M.shell,pale,-D+.045,mid,.010);
  // Wooden window sill with polished top, brass reveal and old green enamel apron.
  plate(shell,M.wood,honey,0,bottom-.020,-D+.063,2*W+.39,.040,.094,.018);
  plate(shell,M.brass,trim,0,bottom-.043,-D+.077,2*W+.35,.008,.081,.003);
  for(let k=0;k<4;k++){
    const pts=[];for(let j=0;j<7;j++){const f=j/6;pts.push([(f-.5)*(2*W+.32),bottom-.015+k*.004+.0009*Math.sin(j*1.6+k),-D+.112]);}
    line(shell,M.wood,k%2?0xbe916c:0x9b7056,pts,.0008,4);
  }
  // Panel folds back into the cabin. A length of welted upholstery is visible at the side.
  const apron=plate(shell,M.shell,teal,0,-H*.98,-D+.095,2*W+.57,H*.63,.10,.03);apron.rotation.x=-.20;
  for(const side of [-1,1]){
    for(let i=0;i<3;i++){
      const x=side*(width/2+.022),y=mid+(i-1)*opening*.361;
      ball(shell,M.brass,trim,x,y,-D+.062,.007,.007,.003);
      box(shell,M.steel,dark,x,y,-D+.064,.006,.001,.001).rotation.z=side*.66;
    }
  }
  const chair=group(shell);chair.position.set(W*.95,-H*.93,-.91);chair.rotation.set(.07,-.31,-.12);
  plate(chair,M.leather,0x9a614a,.08,0,0,Math.max(.18,W*.65),.135,.10,.048);
  for(let i=0;i<4;i++) {
    const x=.006+i*.042;
    line(chair,M.leather,0xb48163,[[x,-.057,.052],[x-.006,.004,.055],[x,.057,.044]],.0016,5);
  }
  // Arched nickel-brass grab rail at the right-hand seat, bolted through the side return.
  const gx=W*.78;
  for(const xx of [gx-.044,gx+.044]){
    ball(shell,M.brass,trim,xx,bottom-.074,-D+.164,.016,.016,.005);
    ball(shell,M.steel,0xe1c49a,xx,bottom-.074,-D+.169,.005,.005,.003);
  }
  line(shell,M.brass,trim,[[gx-.044,bottom-.074,-D+.167],[gx-.049,bottom-.055,-D+.192],
    [gx-.040,bottom-.041,-D+.207],[gx+.040,bottom-.041,-D+.207],[gx+.049,bottom-.055,-D+.192],[gx+.044,bottom-.074,-D+.167]],.0064,12);
  // Instrument mounting is attached to the sill. The four-position picture drum sits behind glass.
  const Z=-.88,hh=-Z*Math.tan(Math.PI*21/180), ww=hh*aspect;
  const yy=-hh*.775,xx=-ww*.074;
  const unit=group(shell);unit.position.set(xx,yy,Z);unit.rotation.x=-.15;
  const pw=Math.min(ww*1.80,.39);
  plate(unit,M.wood,0x8c7157,0,-.016,-.043,pw+.012,.148,.05,.046);
  plate(unit,M.brass,trim,0,-.013,-.018,pw,.142,.022,.041);
  plate(unit,M.shell,0x547c75,0,-.013,-.003,pw-.014,.126,.016,.034);
  for(const sign of [-1,1]){
    for(const j of [-1,1]){
      const x=sign*(pw/2-.027),y=j*.035-.012;
      ball(unit,M.brass,trim,x,y,.009,.0052,.0052,.0029);box(unit,M.steel,dark,x,y,.0118,.0053,.0011,.0007).rotation.z=.43*sign;
    }
    // Pressed decorative flutes repeat the fine lines on the overhead casting.
    for(let j=0;j<3;j++){
      const x1=sign*(.073+.002*j),x2=sign*(pw/2-.045-.005*j);
      if(Math.abs(x2)>Math.abs(x1))rod(unit,M.brass,trim,[x1,(1-j)*.009-.004,.008],[x2,(1-j)*.009-.004,.008],.00165);
    }
  }
  function disc(p,m,c,x,y,z,r,d){
    const o=cylinder(p,m,c,x,y,z,r,r,d,64);o.rotation.x=Math.PI/2;return o;
  }
  disc(unit,M.brass,trim,0,.006,.012,.067,.024);torus(unit,M.steel,dark,0,.006,.025,.057,.0035);
  const halo=mat(.23,.2,{emissive:0xf9c985,emissiveIntensity:.50});
  torus(unit,halo,0xf9e6b5,0,.006,.029,.0577,.0023);
  moving.position.set(xx,yy+.006,Z+.041);
  disc(moving,M.shell,pale,0,0,0,.053,.018);
  torus(moving,M.brass,trim,0,0,.010,.0485,.0030);
  disc(moving,M.shell,0x67968b,0,0,.011,.046,.009);
  // The tiny convex inspection lens has a polished metal bezel.
  drum.position.set(0,0,.018);const d=.020;
  box(drum,M.shell,0x67968b,0,0,0,.040,.054,.040);
  for(let j=0;j<4;j++){
    const face=group(drum);face.rotation.y=-j*Math.PI/2;const g=group(face);g.position.z=d+.0005;
    if(j===0){
      torus(g,M.brass,0xffe7ad,0,.003,.0004,.016,.0018,40);
      for(let k=0;k<8;k++){
        const a=k*tau/8;rod(g,M.porcelain,pale,[0,.003,.001],[.015*Math.sin(a),.003+.015*Math.cos(a),.001],.00085,6);
        ball(g,M.porcelain,pale,.016*Math.sin(a),.003+.016*Math.cos(a),.001,.0024);
      }
      for(const sign of [-1,1])rod(g,M.brass,trim,[sign*.010,-.021,.002],[0,.003,.002],.0015);
    } else if(j===1){
      rod(g,M.brass,trim,[0,-.013,.001],[0,.022,.001],.0011);
      mesh(g,M.porcelain,pale,[-.003,.02,.001,-.017,-.009,.001,-.002,-.007,.001],[0,1,2]);
      mesh(g,M.porcelain,pale,[.002,.013,.001,.002,-.009,.001,.016,-.01,.001],[0,1,2]);
      line(g,M.brass,trim,[[-.018,-.013,.001],[0,-.017,.001],[.018,-.012,.001]],.0022);
    } else if(j===2){
      ball(g,M.porcelain,pale,0,.007,.001,.014,.017,.003);box(g,M.brass,trim,0,-.017,.003,.011,.007,.003);
      for(const sign of [-1,1])rod(g,M.brass,trim,[sign*.006,-.014,.002],[sign*.009,-.004,.002],.0012);
    } else {
      ball(g,M.porcelain,pale,0,.001,.001,.011,.014,.004);torus(g,M.brass,trim,0,.017,.001,.005,.0013);
      for(const sign of [-1,1]){rod(g,M.brass,trim,[sign*.014,-.012,.001],[sign*.014,.015,.001],.0017);}
      box(g,M.brass,trim,0,-.015,.001,.028,.004,.002);box(g,M.brass,trim,0,.016,.001,.028,.004,.002);
    }
  }
  const glass=mat(.11,.22,{transparent:true,opacity:.105,depthWrite:false});
  ball(moving,glass,0xf4fff7,0,0,.037,.041,.041,.006);
  const jewels=[];
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.016,y=-.062;
    torus(unit,M.brass,trim,x,y,.009,.0048,.0014,24);
    const m=mat(.18,.17,{emissive:0xffc46f,emissiveIntensity:.05});ball(unit,m,0xdfbc84,x,y,.010,.0039,.0039,.0024);jewels.push(m);
  }
  // A small unlettered manufacturer's sunburst cast into the top cornice.
  const crest=group(shell);crest.position.set(0,top+.021,-D+.07);
  for(let i=0;i<7;i++){
    const a=(i-3)*.34;
    rod(crest,M.brass,trim,[.010*Math.sin(a),-.009+.010*Math.cos(a),0],[.021*Math.sin(a),-.009+.021*Math.cos(a),0],.0013);
  }
  ball(crest,M.brass,trim,0,-.006,0,.0065,.004,.002);
  pack(shell,false);
  // The pictogram drum and sprung cap retain independent transforms.
  moving.remove(drum);pack(moving,false);moving.add(drum);pack(drum,false);
  const hand=group(root),ghost=mat(.43,.02,{transparent:true,opacity:0,depthWrite:false,emissive:0xffe3af,emissiveIntensity:.21});
  const sh=new T.Shape();
  sh.moveTo(-.011,-.025);sh.quadraticCurveTo(-.020,-.014,-.025,-.003);
  sh.quadraticCurveTo(-.030,.006,-.024,.008);sh.quadraticCurveTo(-.021,.010,-.014,.000);
  sh.lineTo(-.014,.033);sh.quadraticCurveTo(-.013,.043,-.006,.042);sh.quadraticCurveTo(.000,.042,.000,.034);
  sh.lineTo(.000,.014);sh.quadraticCurveTo(.006,.019,.010,.012);sh.quadraticCurveTo(.019,.016,.021,.006);
  sh.quadraticCurveTo(.030,.010,.030,-.001);sh.lineTo(.028,-.017);sh.quadraticCurveTo(.026,-.031,.016,-.034);
  sh.lineTo(.016,-.041);sh.lineTo(-.009,-.041);sh.closePath();
  const hg=new T.ExtrudeGeometry(sh,{depth:.005,bevelEnabled:true,bevelThickness:.0022,bevelSize:.0022,bevelSegments:3,curveSegments:10});
  part(hand,hg,ghost,0xffeed0);pack(hand,false);hand.rotation.z=.62;
  const dustGroup=group(root);
  const dust=mat(.67,0,{transparent:true,opacity:.24,emissive:0xffddaa,emissiveIntensity:.55,depthWrite:false});
  const particles=new T.InstancedMesh(new T.SphereGeometry(.00085,5,4),dust,18);particles.frustumCulled=false;dustGroup.add(particles);
  const hit=new T.Mesh(new T.SphereGeometry(.079,20,12),M.shell);hit.position.set(xx,yy+.006,Z+.04);hit.scale.z=.52;hit.visible=false;root.add(hit);
  return {root,hit,update(s){
    moving.position.z=Z+.041-s.cabin.press*.73;drum.rotation.y=s.cabin.dial;
    halo.emissiveIntensity=.45+.84*s.cabin.guide+.35*s.cabin.press/.016;
    jewels.forEach((m,i)=>{m.emissiveIntensity=.04+1.4*Math.pow(Math.max(0,Math.cos(s.cabin.dial-i*Math.PI/2)),5);});
    const q=(1-Math.cos(s.cabin.demo*2.45))*.5,slide=(s.stage===0?0:.022)*Math.sin(s.cabin.demo*2.45);
    hand.visible=s.cabin.guide>.014;hand.position.set(xx+.043+(1-q)*.039+slide,yy-.037-(1-q)*.038,Z+.077+(1-q)*.028);
    ghost.opacity=s.cabin.guide*(.30+.38*q);
    const matrix=new T.Matrix4();
    s.motes.forEach((m,i)=>{matrix.makeTranslation(m.x*W*1.2,(m.y-.45)*H*1.65,-.65-.45*m.z);particles.setMatrixAt(i,matrix);});particles.instanceMatrix.needsUpdate=true;
  }};
}
