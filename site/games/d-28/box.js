'use strict';
function makeBox(scene) {
  const {T,tau,rnd,group,mesh,mat,M,ball,block,cyl,axle,rod,wire,ring,shape,rect,panel,profile,outline,star,crescent,bloom,sprig,bake}=Craft;
  const root=group(scene), body=group(root), deck=group(root,0,0,0), base=group(deck), lid=group(root,0,1.16,-1.44);
  const lidShell=group(lid), w=5.24,d=3.0;
  for(const [y,ww,dd,h,r,m] of [
    [.20,5.13,2.91,.15,.24,M.edge],[.30,5.3,3.04,.08,.22,M.cherry],[.361,5.23,2.99,.025,.22,M.gold],
    [.66,5.17,2.93,.56,.21,M.walnut],[.984,5.25,3.02,.095,.2,M.cherry],[1.05,5.24,3,.023,.19,M.gold],
    [1.095,5.19,2.98,.055,.18,M.edge]
  ])panel(body,m,0,y,0,ww,dd,h,r,.022,true);
  for(const x of [-2.08,2.08])for(const z of [-1.12,1.12]){
    profile(body,M.old,[[.10,0],[.19,.015],[.20,.055],[.16,.11],[.18,.16],[.21,.19]],x,0,z);
    cyl(body,M.gold,x,.055,z,.18,.19,.022);
  }
  // Marquetry and engraved mouldings along the show face.
  for(const y of [.419,.88]){wire(body,M.brass,[[-2.36,y,1.473],[-1.5,y,1.486],[1.5,y,1.486],[2.36,y,1.473]],.009);}
  const cart=group(body,-.38,.66,1.489);
  for(const sign of [-1,1]){
    const fil=group(cart);fil.scale.x=sign;
    wire(fil,M.gold,[[.09,.01,.012],[.34,.113,.015],[.61,.09,.019],[.88,-.015,.02],[1.04,.025,.014],[1.09,.09,.014],[1.02,.106,.014],[.99,.08,.014]],.012);
    wire(fil,M.brass,[[.15,-.022,.012],[.39,-.084,.016],[.57,-.052,.014],[.72,-.012,.014]],.009);
    for(let i=0;i<3;i++){const leaf=ball(fil,M.gold,.34+i*.15,.106-i*.033,.017,.072,.019,.009);leaf.rotation.z=.29-i*.23;}
    ball(fil,M.gold,1.22,.042,.019,.026,.026,.014);
  }
  ring(cart,M.gold,0,0,.021,.178,.183,.016);
  ring(cart,M.old,0,0,.029,.139,.146,.009);
  bloom(cart,0,0,.048,.105,M.gold,M.ivory,8);
  for(const x of [-2.22,2.22])for(const y of [.48,.825])ball(body,M.brass,x,y,1.469,.036,.032,.024);
  // Velvet deck and inlaid trim.
  panel(base,M.deep,0,1.129,0,4.99,2.78,.041,.18,.012,true);
  panel(base,M.old,0,1.158,0,4.88,2.69,.018,.15,.009,true);
  panel(base,M.blue,0,1.174,0,4.82,2.63,.018,.14,.009,true);
  const trim=group(base,0,1.194,0);trim.rotation.x=-Math.PI/2;outline(trim,M.gold,rect(4.63,2.46,.14),0,.012);
  for(const x of [-1.85,1.85]){axle(body,M.brass,x,1.19,-1.42,.091,.72);for(const f of [-.27,0,.27])axle(body,M.gold,x+f,1.19,-1.42,.097,.056);}
  // A hinged walnut lid with a recessed, modelled celestial landscape.
  function lidLayer(m,width,height,depth,z,r,b=.025){
    return panel(lidShell,m,0,1.40,z,width,height,depth,r,b);
  }
  lidLayer(M.edge,5.22,2.95,.19,-.07,.24);
  lidLayer(M.cherry,5.16,2.89,.09,.048,.22);
  lidLayer(M.brass,4.99,2.72,.046,.111,.19);
  lidLayer(M.walnut,4.93,2.66,.049,.143,.18);
  lidLayer(M.gold,4.70,2.44,.033,.177,.27);
  lidLayer(M.deep,4.63,2.37,.043,.199,.25);
  const inset=group(lidShell,0,1.40,.232);
  outline(inset,M.brass,rect(4.48,2.22,.2),0,.011);
  const sky=group(lidShell,0,1.43,.246);
  ball(sky,M.blue,0,0,0,1.56,.925,.053);
  ring(sky,M.old,0,0,.018,1.585,.958,.043);
  ring(sky,M.gold,0,0,.046,1.55,.92,.02);
  ring(sky,M.gold,0,0,.045,1.635,.993,.008);
  // Each ridge is cut to the inside of the elliptical bezel.
  function terrain(layer,depth,ridge){
    const sh=new T.Shape(),a=1.51,b=.884;
    const pts=[];
    for(let i=0;i<=90;i++){
      const x=-a+2*a*i/90,edge=Math.sqrt(Math.max(0,1-(x/a)**2))*b;
      pts.push([x,Math.max(-edge,Math.min(edge,ridge(x)))]);
    }
    for(let i=90;i>=0;i--){const x=-a+2*a*i/90;pts.push([x,-b*Math.sqrt(Math.max(0,1-(x/a)**2))]);}
    pts.forEach(([x,y],i)=>sh[i?'lineTo':'moveTo'](x,y));sh.closePath();const o=shape(sky,layer,sh,.007,0);o.position.z=depth;
  }
  terrain(M.sky,.055,x=>-.18+.24*Math.cos(x*4.7)+.08*Math.cos(12*x+.4));
  terrain(M.pale,.067,x=>-.27+.18*Math.sin(x*5.2)+.055*Math.cos(x*11));
  terrain(M.deep,.079,x=>-.47+.13*Math.sin(x*4.1-.8)+.072*Math.cos(x*8));
  terrain(M.sea,.088,x=>-.58+.013*Math.cos(x*13));
  crescent(sky,M.gold,-.61,.39,.096,.25);
  for(let i=0;i<54;i++){
    const x=(rnd()-.5)*2.96,y=(rnd()-.13)*.84;
    if((x/1.47)**2+(y/.84)**2>.95 || Math.hypot(x+.61,y-.39)<.29)continue;
    if(i%5===0)star(sky,M.pearl,x,y,.079,.032+rnd()*.03);
    else ball(sky,M.gold,x,y,.079,.009+rnd()*.009);
  }
  for(let i=0;i<9;i++){
    const x=(rnd()-.5)*1.7,y=-.60-rnd()*.15;
    wire(sky,M.pale,[[x-.05,y,.099],[x,y+.004,.10],[x+.07,y,.10]],.006);
  }
  for(const side of [-1,1]){
    sprig(lidShell,side*1.54,.58,.243,side,.67);
    const top=group(lidShell,side*2.06,2.45,.246);
    top.rotation.z=side*.26;sprig(top,0,0,0,-side,.34);
    bloom(lidShell,side*1.87,1.46,.25,.115,M.gold,M.pearl,6);
    for(let j=0;j<3;j++)ball(lidShell,M.brass,side*1.88,1.1+j*.12,.241,.016);
  }
  star(lidShell,M.gold,0,2.58,.246,.089);
  for(const k of [-1,1]){ball(lidShell,M.gold,k*.18,2.57,.244,.017);ball(lidShell,M.gold,k*.26,2.57,.244,.01);}
  // Rear face is visible when the lid closes.
  panel(lidShell,M.cherry,0,1.4,-.184,4.9,2.65,.035,.2,.025);
  const back=group(lidShell,0,1.4,-.21);back.rotation.y=Math.PI;outline(back,M.gold,rect(4.59,2.32,.22),0,.014);
  ring(back,M.brass,0,0,0,.59,.55,.014);bloom(back,0,0,.025,.31,M.gold,M.gold,8);
  // Winding bow, projecting from a chased brass escutcheon.
  const key=group(root,1.68,.69,1.84);
  axle(body,M.old,1.68,.69,1.498,.242,.082,'z');
  axle(body,M.gold,1.68,.69,1.57,.164,.11,'z');
  axle(body,M.brass,1.68,.69,1.75,.079,.38,'z');
  ring(body,M.gold,1.68,.69,1.553,.213,.213,.014);
  const bow=new T.Shape();
  bow.moveTo(0,.16);bow.bezierCurveTo(-.23,.22,-.27,.395,-.515,.335);bow.bezierCurveTo(-.89,.205,-.74,-.27,-.428,-.23);
  bow.bezierCurveTo(-.25,-.225,-.15,-.09,0,-.10);bow.bezierCurveTo(.15,-.09,.25,-.225,.428,-.23);
  bow.bezierCurveTo(.74,-.27,.89,.205,.515,.335);bow.bezierCurveTo(.27,.395,.23,.22,0,.16);
  for(const k of [-1,1]){
    const h=new T.Path();h.absellipse(k*.48,.056,.164,.151,k<0?-.25:.25,tau+(k<0?-.25:.25),true,0);bow.holes.push(h);
  }
  const handle=shape(key,M.gold,bow,.085,.035);handle.rotation.z=-.21;
  ball(key,M.brass,0,0,.059,.131,.13,.058);
  ball(key,M.pearl,0,0,.10,.073,.073,.033);
  // Steel comb with an individual cantilever for every pitch.
  panel(base,M.dark,.76,1.235,-.075,2.97,1.85,.081,.12,.024,true);
  panel(base,M.brass,.76,1.286,-.075,2.88,1.76,.025,.10,.011,true);
  const drum=group(deck,.74,1.733,-.28), radius=.401, len=2.38;
  axle(drum,M.brass,0,0,0,radius,len);
  for(const k of [-1,1]){
    axle(drum,M.old,k*1.214,0,0,.424,.085);
    axle(drum,M.gold,k*1.247,0,0,.414,.044);
    axle(drum,M.silver,k*1.285,0,0,.215,.04);
    axle(base,M.dark,.74+k*1.42,1.733,-.28,.075,.42);
    const sup=group(base,.74+k*1.375,1.31,-.28);
    panel(sup,M.old,0,.22,0,.145,.47,.32,.05,.024);
    ball(sup,M.brass,0,.413,0,.097,.18,.17);
    for(const zz of [-.51,-.05]){cyl(base,M.silver,.74+k*1.37,1.325,zz,.061,.061,.027,20);block(base,M.dark,.74+k*1.37,1.342,zz,.066,.008,.014);}
  }
  for(let i=0;i<=12;i++)axle(drum,i%3===0?M.gold:M.old,-1.11+i*.185,0,0,.4028,i%3===0?.012:.006);
  const laneX=i=>-.27+i*.184;
  const toothParts=[];
  for(let i=0;i<12;i++){
    const g=group(deck,laneX(i),1.495,.116),blade=group(g);
    const geo=new T.BoxGeometry(.129,.049,1);geo.translate(0,0,-.5);
    mesh(blade,geo,M.silver);
    const heel=group(deck,laneX(i),1.49,1.04);
    const holder=new T.BoxGeometry(.138,.074,1);holder.translate(0,0,-.5);
    mesh(heel,holder,M.brass);toothParts.push({g,blade,heel});
  }
  panel(base,M.old,.745,1.397,.957,2.56,.337,.1,.067,.022,true);
  panel(base,M.gold,.745,1.46,1.016,2.61,.189,.067,.052,.015,true);
  for(const x of [-.39,.75,1.89]){
    cyl(base,M.silver,x,1.51,1.014,.068,.066,.022,24);
    const slot=block(base,M.dark,x,1.524,1.015,.08,.005,.014);slot.rotation.y=-.52;
  }
  const gears=[];
  function cog(x,y,z,r,n){
    const g=group(deck,x,y,z),s=new T.Shape();
    for(let j=0;j<n*4;j++){
      const a=j*tau/(n*4),l=j%4===1||j%4===2?r:r*.84;
      s[j?'lineTo':'moveTo'](Math.cos(a)*l,Math.sin(a)*l);
    }s.closePath();
    for(let j=0;j<5;j++){const a=j*tau/5,h=new T.Path();h.absarc(Math.cos(a)*r*.48,Math.sin(a)*r*.48,r*.165,0,tau,true);s.holes.push(h);}
    const gear=shape(g,M.brass,s,.055,.008);gear.rotation.x=-Math.PI/2;
    cyl(g,M.gold,0,.035,0,r*.25,r*.23,.055);cyl(g,M.dark,0,.075,0,.032,.032,.032,16);
    bake(g);gears.push(g);
  }
  cog(-.91,1.38,.09,.291,18);cog(-1.21,1.365,-.18,.154,11);
  const shutter=group(deck,-.96,1.48,-.04);
  panel(shutter,M.blue,0,0,0,.61,.86,.036,.09,.01,true);
  for(let i=0;i<3;i++)block(shutter,M.gold,-.13+i*.13,.022,0,.017,.008,.57);
  // Glazed bisque figurine on a turned, clockwork pedestal.
  const podium=group(base,-1.59,1.185,.59);
  profile(podium,M.old,[[.4,0],[.49,.035],[.50,.078],[.44,.102],[.41,.135]],0,0,0);
  cyl(podium,M.gold,0,.101,0,.47,.49,.03);
  cyl(podium,M.pale,0,.143,0,.42,.445,.06);ring(podium,M.gold,0,.178,0,.394,.394,.016,'xz');
  const dancer=group(deck,-1.59,1.36,.59),doll=group(dancer);
  rod(doll,M.cream,[-.05,.02,0],[-.042,.61,0],.049,.081);ball(doll,M.rose,-.05,.052,.022,.068,.086,.083);
  rod(doll,M.cream,[.047,.60,0],[.237,.38,.025],.077,.051);rod(doll,M.cream,[.237,.38,.025],[.085,.31,.032],.049,.037);
  ball(doll,M.rose,.081,.308,.046,.063,.049,.06);
  const torso=profile(doll,M.sky,[[.125,.55],[.145,.662],[.103,.756],[.112,.836],[.156,.93],[.129,.981],[.08,1.003]]);
  torso.scale.z=.78;
  const folds=new T.BufferGeometry(),vertices=[],indices=[],uv=[];
  for(let j=0;j<=10;j++)for(let i=0;i<=88;i++){
    const u=i/88*tau,f=j/10,pleat=Math.cos(u*14),rr=.118+f*(.273+.031*pleat);
    vertices.push(Math.cos(u)*rr,.708-.18*f**1.45+.027*f*pleat+.035*f*Math.sin(u+.6),Math.sin(u)*rr*.91);
    uv.push(i/88,f);if(j<10&&i<88){let a=j*89+i;indices.push(a,a+1,a+89,a+1,a+90,a+89);}
  }
  folds.setAttribute('position',new T.Float32BufferAttribute(vertices,3));folds.setAttribute('uv',new T.Float32BufferAttribute(uv,2));folds.setIndex(indices);folds.computeVertexNormals();
  const tutu=mat(0xf3dbc7,.10,.33,{side:T.DoubleSide});mesh(doll,folds,tutu);
  wire(doll,M.gold,Array.from({length:88},(_,i)=>vertices.slice((890+i)*3,(890+i)*3+3)),.012,true,110);
  ring(doll,M.gold,0,.719,0,.121,.106,.016,'xz');
  ball(doll,M.cream,.008,1.015,0,.062,.11,.054);
  const head=group(doll,.012,1.152,0);head.rotation.z=-.15;
  ball(head,M.cream,0,0,.014,.151,.178,.139);
  const cap=mesh(head,new T.SphereGeometry(1,32,16,0,tau,0,1.52),M.hair,0,.026,-.015);cap.scale.set(.158,.171,.147);cap.rotation.x=-.43;
  ball(head,M.hair,-.058,.17,-.082,.094,.089,.09);
  ring(head,M.gold,-.055,.167,-.06,.089,.076,.011);
  bloom(head,-.103,.124,.032,.059,M.ivory,M.gold,5);
  for(const k of [-1,1]){wire(head,M.umber,[[k*.039,-.006,.145],[k*.060,-.015,.139],[k*.08,-.008,.129]],.005);}
  ball(head,M.cream,0,-.03,.149,.019,.024,.02);
  function limb(points){wire(doll,M.cream,points,.041);ball(doll,M.cream,...points[points.length-1],.044,.063,.036);}
  limb([[-.111,.945,0],[-.24,1.035,.005],[-.27,1.21,.028],[-.208,1.36,.044],[-.10,1.418,.049]]);
  limb([[.121,.94,0],[.257,.908,.018],[.368,.965,.055],[.482,1.021,.05]]);
  for(const x of [-.132,.134])ball(doll,M.pale,x,.947,0,.072,.062,.08);
  // Separate moulded mechanisms inside the lid.
  function boat(parent){
    const g=group(parent);
    const sh=new T.Shape();sh.moveTo(-.36,0);sh.quadraticCurveTo(-.2,-.18,.21,-.123);sh.lineTo(.36,.006);sh.quadraticCurveTo(0,-.034,-.36,0);
    shape(g,M.cherry,sh,.15,.014);
    rod(g,M.gold,[.035,-.021,0],[.035,.56,0],.012);
    const sail=new T.Shape();sail.moveTo(.008,.516);sail.quadraticCurveTo(-.118,.203,-.312,.095);sail.quadraticCurveTo(-.13,.118,.008,.075);sail.closePath();
    shape(g,M.cream,sail,.016,.009);
    const jib=new T.Shape();jib.moveTo(.072,.46);jib.quadraticCurveTo(.18,.222,.295,.091);jib.lineTo(.076,.078);jib.closePath();shape(g,M.rose,jib,.015,.006);
    ball(g,M.gold,.037,.562,0,.024);return bake(g);
  }
  function balloon(parent){
    const g=group(parent);
    for(let i=0;i<12;i++){
      const geo=new T.SphereGeometry(1,5,20,i*tau/12,tau/12);
      const o=mesh(g,geo,i%2?M.cream:M.rose,0,.29,0);o.scale.set(.246,.30,.246);
    }
    for(const k of [-1,1])rod(g,M.gold,[k*.088,.055,0],[k*.064,-.17,0],.009);
    cyl(g,M.old,0,-.177,0,.084,.06,.087,12);return bake(g);
  }
  function mobile(parent){
    const g=group(parent);
    ring(g,M.gold,0,0,0,.31,.31,.014);const diag=ring(g,M.brass,0,0,0,.41,.167,.012);diag.rotation.z=.45;
    ball(g,M.pearl,0,0,0,.103);ball(g,M.rose,.316,.12,0,.062);star(g,M.gold,-.31,-.13,.015,.079);
    return bake(g);
  }
  const minis=[boat(lid),balloon(lid),mobile(lid)];
  const pinGeo=new T.CylinderGeometry(.026,.039,.093,9),pinMesh=new T.InstancedMesh(pinGeo,M.gold,48);
  drum.add(pinMesh);pinMesh.castShadow=pinMesh.receiveShadow=true;pinMesh.frustumCulled=false;
  const dummy=new T.Object3D(),contact=1.52;
  for(const rigid of [body,lidShell,base,key,doll,shutter])bake(rigid);
  // Drum rings are rigid but the pins remain independently insertable.
  drum.remove(pinMesh);bake(drum);drum.add(pinMesh);
  // Each coffer has its own timber, enamel, lining and gilt ornament.
  const finishes=[
    [M.walnut,[0xa2633d,0xb17855,0x78513e]],
    [M.deep,[0x355a62,0x747b78,0x435369]],
    [M.blue,[0x477c83,0x90a6a2,0x586f88]],
    [M.rose,[0xd69a89,0xbf817a,0xb09fae]]
  ].map(([m,colors])=>[m,colors.map(c=>new T.Color(c))]);
  const fittings=[group(lid,0,2.47,.277),group(lid,0,2.47,.277),group(lid,0,2.47,.277)];
  for(let i=0;i<3;i++){
    const badge=fittings[i];
    if(i===0){
      for(const side of [-1,1])wire(badge,M.gold,[[side*.03,0,0],[side*.115,.039,.015],[side*.22,.023,.012]],.011);
    }else if(i===1){
      ball(badge,M.gold,0,0,0,.097,.097,.025);
      for(let j=0;j<9;j++){const a=j*tau/9;rod(badge,M.gold,[Math.cos(a)*.122,Math.sin(a)*.122,0],[Math.cos(a)*.176,Math.sin(a)*.176,0],.009);}
    }else{
      ring(badge,M.gold,0,0,0,.14,.14,.013);star(badge,M.pearl,0,0,.012,.124,5);
    }
    bake(badge);
  }
  function update(s){
    root.rotation.z=s.rebound*.12;lid.rotation.x=-.16+s.lid*1.731;
    const sink=Math.max(0,s.lid);deck.position.y=-sink*1.62;
    key.rotation.z=s.keyAngle;drum.rotation.x=s.angle;
    gears[0].rotation.y=s.gearAngle;gears[1].rotation.y=-s.gearAngle*18/11;
    shutter.position.z=-.04-s.gearReveal*.88;
    dancer.rotation.y=s.dollAngle;doll.rotation.z=s.sway;
    doll.scale.y=1-sink*.58;
    for(let i=0;i<12;i++){
      const t=s.teeth[i],o=toothParts[i],length=t.length*.03;
      o.g.position.z=.116+length*Math.cos(.263);o.g.position.y=1.76-length*Math.sin(.263);
      o.blade.scale.z=length;o.blade.rotation.x=.263+t.x/t.length;
      o.heel.rotation.x=.263;o.heel.scale.z=Math.max(.06,(1.04-o.g.position.z)/Math.cos(.263)+.04);
      o.heel.position.y=1.76-(1.04-.116)*Math.tan(.263)-.005;
    }
    pinMesh.count=s.pins.length;
    s.pins.forEach((p,i)=>{
      const a=contact-p.at,r=radius+p.depth*.038;
      dummy.position.set(laneX(p.lane)-.74,Math.cos(a)*r,Math.sin(a)*r);
      dummy.rotation.set(a,0,0);dummy.scale.set(1,p.depth||.001,1);
      dummy.updateMatrix();pinMesh.setMatrixAt(i,dummy.matrix);
    });pinMesh.instanceMatrix.needsUpdate=true;
    for(let i=0;i<3;i++)minis[i].visible=s.box===i;
    minis[0].position.set(s.vessel.x*.58,1.00+s.water[12].h,.396);minis[0].rotation.z=s.vessel.heel;
    minis[1].position.set(.19+s.wind[4].u*.29,1.22+s.balloon.h*.62,.445);minis[1].rotation.z=-s.wind[4].u*.13;
    minis[2].position.set(.09,1.39,.44);minis[2].rotation.z=s.mobile.angle;
    minis.forEach(o=>{o.position.z+=s.toySlide*.39;o.scale.setScalar(1+.37*s.toySlide);});
    for(const [m,colors] of finishes)m.color.setRGB(...['r','g','b'].map(k=>s.weights.reduce((v,f,i)=>v+f*colors[i][k],0)));
    fittings.forEach((f,i)=>{f.visible=s.box===i;});
  }
  return {root,deck,lid,key,drum,dancer,minis,update,boat,balloon,mobile,laneX};
}
