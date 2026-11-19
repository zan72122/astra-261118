'use strict';
function factoryWorld(scene){
  const shop=group(scene), architecture=group(shop),station=group(shop);
  const build=architecture;
  box(build,0,-.13,1,31,.25,16,M.floor);
  for(let x=-14;x<15;x+=2.5)box(build,x,.001,.6,.011,.006,15,M.seam);
  for(let z=-6.5;z<9;z+=2.5)box(build,0,.002,z,30,.006,.011,M.seam);
  for(const z of [-1.93,1.13])box(build,-3,.008,z,13,.009,.041,M.chalk);
  // The open bay frames the road. Layered reveals cast real shadows inside the jamb.
  const doorMid=1.34, bay=9.0, left=doorMid-bay/2,right=doorMid+bay/2, back=-5.45;
  const wall=(x,w,y,h,m=M.wall)=>box(build,x,y,back,w,h,.29,m);
  wall((-13+left)/2,13+left,1.27,2.54);wall((-13+left)/2,13+left,5.38,1.45);
  wall((right+14)/2,14-right,2.9,5.8);wall(doorMid,bay,5.64,1.12);
  wall((-13+left)/2,13+left,.41,.82,M.mint);
  box(build,(-13+left)/2,.86,back+.165,13+left,.06,.07,M.deep);
  // Glazed clerestory, narrow steel mullions, deep sills.
  const glazing=mat('#bad6d2',.16,.31,{transparent:true,opacity:.67});
  for(let x=-12.4;x<left;x+=1.32){
    box(build,x,3.61,back,1.25,2.06,.047,glazing);
    box(build,x-.65,3.61,back+.022,.057,2.19,.16,M.cream);
    box(build,x,3.83,back+.046,1.32,.037,.09,M.cream);
  }
  for(const y of [2.54,4.68])box(build,(-13+left)/2,y,back+.09,13+left,.11,.27,M.cream);
  for(const x of [left-.13,right+.13]){
    rounded(build,x,2.52,back+.12,.32,5.04,.45,.032,M.green);
    box(build,x,2.52,back+.38,.073,5.04,.066,M.metal);
    rounded(build,x,.57,back+.37,.49,1.12,.43,.075,M.enamel);
    for(let i=0;i<3;i++){
      const band=box(build,x,.27+i*.23,back+.599,.448,.089,.012,M.deep);band.rotation.z=.24;
    }
  }
  rounded(build,doorMid,5.08,back+.12,bay+.69,.38,.51,.096,M.green);
  const door=group(shop,doorMid,0,back);
  for(let j=0;j<9;j++){
    box(door,0,j*.27+.13,0,bay-.06,.268,.14,M.white);
    box(door,0,j*.27+.022,.079,bay-.05,.028,.036,M.metal);
  }
  box(door,0,.024,.033,bay-.04,.056,.22,M.dark);bake(door);
  // Sawtooth skylight framing and suspended opal industrial lights.
  const pendants=[];
  for(let x=-12;x<15;x+=3.5){
    box(build,x,5.72,.8,.19,.24,13.1,M.white);
    box(build,x,5.51,.8,.28,.085,13.1,M.metal);
    box(build,x,5.15,.8,.14,.12,13.1,M.cream);
    for(let z=-5.2;z<7;z+=1.1)rod(build,[x,5.19,z],[x,5.59,z+.7],.025,M.metal);
    for(let z=-4.9;z<7;z+=2.75){
      box(build,x+1.7,5.94,z,3.3,.09,1.58,M.white);
      box(build,x+1.7,5.97,z+1.34,3.3,.04,.96,M.skyglass).castShadow=false;
      box(build,x+1.7,5.89,z+.85,3.3,.11,.064,M.metal);
    }
    if(x<8){
      const pendant=group(shop,x,5.48,-2.9);pendants.push(pendant);
      rod(pendant,[0,0,0],[0,-.51,0],.013,M.dark);
      cyl(pendant,0,-.55,0,.073,.11,.14,M.dark);
      cyl(pendant,0,-.667,0,.10,.315,.15,M.green);
      cyl(pendant,0,-.75,0,.30,.267,.035,M.lamp);bake(pendant);
    }
  }
  for(const z of [-4.5,2.8]){box(build,-10.1,2.82,z,.3,5.65,.34,M.white);box(build,-10.1,.45,z,.38,.91,.4,M.green);}
  for(const y of [1.04,1.16])pipe(build,[[-11,y,-5.18],[-5.4,y,-5.18],[-4.9,y+.46,-5.18],[-1.55,y+.46,-5.18]],.035,M.metal);
  // An enamel winged wheel marks the workshop without a written sign.
  const badge=group(build,-4.99,1.85,-5.23);
  rounded(badge,0,0,0,2.34,.87,.095,.19,M.green);
  rounded(badge,0,0,.045,2.25,.77,.06,.17,M.deep);
  ring(badge,0,0,.102,.224,.044,M.cream);ring(badge,0,0,.104,.105,.019,M.cream);
  for(const side of [-1,1])for(let j=0;j<3;j++){
    const fin=rounded(badge,side*(.39+j*.057),-.11+j*.094,.103,.39+j*.09,.047,.043,.021,M.cream);fin.rotation.z=side*.105;
  }
  for(const x of [-1,1])for(const y of [-.27,.27])ball(badge,x,y,.09,.027,.027,.012,M.chrome);
  // Distant figure viewed from behind in the service bay.
  const worker=group(build,8.2,0,-6.7);worker.rotation.y=.14;
  for(const x of [-.068,.068]){rounded(worker,x,.20,0,.111,.38,.14,.036,M.deep);ball(worker,x,.043,-.027,.081,.051,.116,M.dark);}
  rounded(worker,0,.52,0,.34,.34,.21,.10,M.green);
  ball(worker,0,.788,0,.112,.14,.107,M.wood);
  ball(worker,0,.824,.04,.11,.095,.082,M.dark);
  for(const x of [-.181,.181])ball(worker,x,.49,-.028,.062,.153,.069,M.green);

  // Indexing conveyor with a heavy enamel chassis, brushed rails, roller bearings and drive cover.
  for(const z of [-.78,.78]){
    rounded(station,-1.58,.813,z,8.95,.39,.143,.056,M.green);
    rounded(station,-1.58,1.022,z,8.94,.075,.127,.028,M.chrome);
    box(station,-1.58,.699,z+Math.sign(z)*.073,8.58,.039,.019,M.mint);
    for(let x=-5.77;x<2.9;x+=.49){
      const bearing=cyl(station,x,.903,z+Math.sign(z)*.086,.057,.057,.022,M.dark,20);bearing.rotation.x=Math.PI/2;
      const pin=cyl(station,x,.903,z+Math.sign(z)*.106,.029,.029,.022,M.chrome,8);pin.rotation.x=Math.PI/2;
    }
  }
  rounded(station,-1.58,.974,0,8.9,.205,1.5,.1,M.belt);
  for(const x of [-5.62,-3.6,-.9,2.32]){
    for(const z of [-.62,.62]){
      rounded(station,x,.382,z,.211,.706,.2,.027,M.mint);
      rounded(station,x,.067,z,.37,.095,.32,.033,M.dark);
      rod(station,[x,.17,z],[x+.32,.65,z],.038,M.metal);
    }box(station,x,.27,0,.14,.11,1.32,M.green);
  }
  const slats=group(shop);
  for(let i=0;i<66;i++){const x=-5.98+i*.135;box(slats,x,1.081,0,.009,.007,1.45,M.groove);}
  bake(slats);
  // Mobile transfer skid under the unfinished body.
  const skid=group(shop);rounded(skid,0,1.124,0,2.43,.08,1.12,.034,M.metal);
  for(const x of [-.91,.91])for(const z of [-.42,.42])rounded(skid,x,1.212,z,.28,.143,.19,.034,M.rubber);
  bake(skid);
  // Tire magazine with real, stacked tires and a raised pictogram.
  const rack=group(shop,-2.16,.013,-.96);
  rounded(rack,0,.52,0,1.34,.93,.9,.069,M.green);
  rounded(rack,0,.98,0,1.44,.133,.99,.049,M.cream);
  rounded(rack,0,1.048,0,1.27,.028,.808,.052,M.black);
  for(const x of [-.52,.52]){rounded(rack,x,.52,.46,.066,.89,.047,.017,M.mint);}
  ring(rack,.01,.59,.47,.175,.041,M.cream);ring(rack,.01,.59,.473,.082,.018,M.cream);
  bake(rack);
  const supplyWheels=Array.from({length:4},(_,i)=>{
    const w=wheel(shop);w.position.set(-2.16+(i%2?.346:-.346),1.41,-.96+(i<2?.20:-.20));return w;
  });
  rounded(station,-.63,.146,-1.68,5.31,.238,.69,.072,M.deep);
  for(const z of [-1.92,-1.44])rounded(station,-.63,.27,z,5.23,.073,.075,.026,M.chrome);
  for(let i=0;i<14;i++)box(station,-3.04+i*.367,.27,-1.68,.096,.032,.21,M.metal);
  const robot=group(shop,-2.78,.277,-1.68);
  rounded(robot,0,.17,0,.92,.31,.81,.103,M.green);
  cyl(robot,0,.48,0,.294,.37,.35,M.cream);cyl(robot,0,.69,0,.29,.3,.108,M.dark);
  cyl(robot,0,.77,0,.255,.282,.09,M.enamel);bake(robot);
  const arm=group(shop),links=[],pivots=[];
  for(let i=0;i<2;i++){
    const link=group(arm);
    rounded(link,0,.5,0,i?.16:.23,.93,i?.17:.23,.075,M.cream);
    rounded(link,0,.49,.093,.091,.61,.053,.026,M.enamel);bake(link);links.push(link);
  }
  for(let i=0;i<3;i++){
    const v=group(arm);ball(v,0,0,0,.145,.145,.14,M.dark);
    const axle=cyl(v,0,0,.085,.107,.107,.16,M.metal);axle.rotation.x=Math.PI/2;
    const cap=cyl(v,0,0,.173,.068,.068,.023,M.enamel);cap.rotation.x=Math.PI/2;bake(v);pivots.push(v);
  }
  const tool=group(arm);rounded(tool,0,.067,0,.197,.154,.21,.043,M.deep);
  bake(tool);
  const jaws=[-1,1].map(side=>{const g=group(tool,0,0,side*.142);
    rounded(g,0,-.042,0,.12,.16,.052,.019,M.chrome);return bake(g);});
  const carried=wheel(arm);
  const cans=[],caps=[],canPos=[],cradle=group(shop);
  const center=[.96,0,2.20];
  rounded(cradle,center[0],.775,center[2],3.08,.196,.998,.089,M.green);
  rounded(cradle,center[0],.886,center[2],3.02,.071,.957,.032,M.cream);
  for(const x of [-.26,2.18])for(const z of [1.91,2.47]){
    rounded(cradle,x,.385,z,.128,.742,.139,.028,M.metal);rounded(cradle,x,.036,z,.25,.068,.224,.021,M.dark);
  }
  for(let k=0;k<3;k++){
    const x=center[0]+(k-1)*.924,z=center[2];
    cyl(cradle,x,.935,z,.371,.388,.078,M.deep);
    cyl(cradle,x,.98,z,.341,.365,.054,M.chrome);
    cyl(cradle,x,1.014,z,.309,.322,.05,M.black);
    const g=group(shop,x,1.018,z),can=group(g);
    // Spun seams, a satin enamel wrapper and a bare aluminium shoulder.
    cyl(can,0,.052,0,.269,.25,.099,M.chrome,48);
    cyl(can,0,.487,0,.267,.267,.861,M.paint[k],48);
    for(const y of [.079,.887]){cyl(can,0,y,0,.275,.275,.033,M.chrome,48);}
    cyl(can,0,.941,0,.227,.269,.08,M.metal,48);cyl(can,0,1.004,0,.139,.229,.06,M.chrome,48);
    cyl(can,0,1.045,0,.102,.125,.06,M.dark);
    const cap=group(g);caps.push(cap);
    rounded(cap,0,1.119,0,.199,.129,.18,.045,M.cream);
    const nozzle=cyl(cap,0,1.123,-.098,.042,.051,.037,M.dark);nozzle.rotation.x=Math.PI/2;bake(cap);
    for(const y of [.122,.158,.817])cyl(can,0,y,0,.2685,.2685,.012,M.cream,48);
    // Raised lacquer droplet, oriented toward the visitor.
    const badge=group(can);badge.rotation.y=.26;
    const shape=new T.Shape();shape.moveTo(0,.154);shape.bezierCurveTo(-.016,.089,-.097,.021,-.097,-.044);shape.bezierCurveTo(-.097,-.166,.097,-.166,.097,-.044);shape.bezierCurveTo(.097,.021,.023,.091,0,.154);
    const drop=mesh(badge,new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:2,curveSegments:12}),M.cream,0,.488,.266);
    bake(can);cans.push(g);canPos.push(V(x,1.018,z));
  }bake(cradle);
  // A physical, ivory pointing glove. Only appears when the next touch is due.
  const glove=group(scene),fingerMat=mat('#fff1d8',.48,.04);
  ball(glove,0,.11,0,.115,.154,.074,fingerMat);
  const finger=(a,b,r)=>{rod(glove,a,b,r,fingerMat);ball(glove,...a,r,r,r,fingerMat);ball(glove,...b,r,r,r,fingerMat);};
  finger([-.068,.054,.018],[-.094,-.19,0],.044);
  finger([.013,.054,.025],[.017,-.045,.06],.046);
  finger([.078,.067,.023],[.085,-.013,.053],.043);
  finger([.116,.103,.011],[.128,.037,.041],.037);
  finger([-.068,.122,.024],[-.122,.044,.088],.047);
  cyl(glove,0,.259,0,.089,.103,.07,M.green);bake(glove);
  bake(architecture);bake(station);
  return {shop,pendants,robot,door,slats,skid,rack,supplyWheels,cans,caps,canPos,glove,links,pivots,tool,jaws,carried};
}
function courseWorld(scene){
  const land=group(scene),details=group(scene),ground=mat('#a5bca4',.88,.035),
    asphalt=mat('#778685',.83,.07),paved=mat('#b9bca8',.74,.1),curb=mat('#c47f68',.58,.17),
    dam=mat('#a3a79c',.7,.15),waterMat=mat('#6ea7a4',.15,.4,{transparent:true,opacity:.87}),
    tree=mat('#7c9e85',.86,.01),lightTree=mat('#a0b393',.87,.01),mountain=mat('#91afa4',.91,0);
  box(land,0,-.3,-37,260,.51,225,ground);
  for(let i=0;i<34;i++){
    const ang=(i/34)*2*Math.PI,dist=56+rnd()*42,x=8+Math.cos(ang)*dist,z=-19+Math.sin(ang)*dist;
    ball(land,x,-2.15,z,6+rnd()*13,4+rnd()*9,5+rnd()*9,i%3?mountain:lightTree);
  }
  // Small groves leave the inner road silhouette clear.
  for(let i=0;i<51;i++){
    const x=-41+rnd()*78,z=-63+rnd()*58;
    if(x>-15&&x<20&&z>-33)continue;
    const h=1.6+rnd()*2.5;
    cyl(land,x,h*.26,z,.07,.12,h*.52,M.wood,8);
    for(let j=0;j<3;j++){
      const o=ball(land,x+(rnd()-.5)*.5,h*(.6+j*.11),z+(rnd()-.5)*.5,h*(.28-j*.04),h*.32,h*(.25-j*.039),j%2?tree:lightTree);o.rotation.y=rnd()*4;
    }
  }
  function trackSide(s,lateral,y=.014) {
    const q=F.point(s);return [q.x+Math.sin(q.yaw)*lateral,F.roadY(s)+y,q.z+Math.cos(q.yaw)*lateral];
  }
  function ribbon(p,from,to,l0,l1,m,y=.006,mode='road'){
    const rows=[];const n=Math.max(1,Math.ceil((to-from)/.24));
    for(let i=0;i<=n;i++){const s=from+(to-from)*i/n;
      const a=trackSide(s,l0,y),b=trackSide(s,l1,y);
      if(mode==='flat'){a[1]=b[1]=.082+y;}
      rows.push([a,b]);}
    return surface(p,rows,m);
  }
  const road=group(land),baseRoad=group(scene),bridgeParts=[],rampParts=[];
  for(const [a,b] of [[0,F.jump-4],[F.jump+2.4,F.bridge-3.3],[F.bridge+3.3,F.end]]){
    ribbon(road,a,b,-1.43,1.43,asphalt);for(const side of [-1,1])ribbon(road,a,b,side*1.29,side*1.34,M.chalk,.016);
    if(a<.1){ribbon(road,a,b,-1.44,-1.49,M.metal,-.013);ribbon(road,a,b,1.44,1.49,M.metal,-.013);}
  }
  for(let d=6;d<F.end-2;d+=2.5){
    if(Math.abs(d-F.bridge)<4||Math.abs(d-F.jump)<4.6||Math.abs(d-F.ford)<3)continue;
    for(const side of [-1,1])ribbon(road,d,d+1.12,side*1.34,side*1.46,curb,.02);
  }
  for(let d=1.45;d<7.6;d+=1.21) {
    const q=F.point(d),frame=group(land,q.x,0,q.z);frame.rotation.y=q.yaw;
    for(const side of [-1,1]) {
      const h=F.roadY(d);
      rounded(frame,0,h*.45,side*1.19,.15,h*.89,.16,.026,M.green);
      rounded(frame,0,.047,side*1.19,.27,.083,.28,.028,M.dark);
    }
    box(frame,0,F.roadY(d)-.085,0,.13,.14,2.88,M.metal);
  }
  // Mechanical tilting launch plate, supported on an exposed triangular frame.
  const rampGeo=[];
  for(let k=0;k<3;k++){
    const o=ribbon(scene,F.jump-4,F.jump+2.4,k===0?-1.43:k===1?-1.36:1.29,k===0?1.43:k===1?-1.29:1.36,k===0?M.green:M.cream,k===0?.008:.017);
    const pos=o.geometry.attributes.position;const distances=[];
    for(let i=0;i<pos.count;i++){distances.push(F.jump-4+6.4*Math.floor(i/2)/(pos.count/2-1));}
    rampGeo.push({o,distances,dy:k===0?.008:.017});
  }
  for(let s=F.jump-3.6;s<F.jump+2.3;s+=.56){
    for(const side of [-1,1]){
      const a=trackSide(s,1.38*side);rod(land,[a[0],.03,a[2]],[a[0],Math.max(.1,(a[1]-.05)*.49),a[2]],.048,M.metal);
    }
  }
  ribbon(baseRoad,F.bridge-3.3,F.bridge+3.3,-1.44,1.44,asphalt);
  const bridgeGroup=group(scene);
  for(let i=0;i<2;i++){
    const side=i===0?1:-1,hinge=F.bridge-side*3.3,q=F.point(hinge),fixed=group(bridgeGroup,q.x,F.roadY(hinge)-.135,q.z);
    fixed.rotation.y=q.yaw+(i?Math.PI:0);
    const pivot=group(fixed),span=3.45;
    rounded(pivot,span/2,0,0,span,.165,2.94,.051,M.green);
    for(let k=0;k<13;k++){box(pivot,(k+.5)*span/13,.1,0,span/13-.013,.07,2.79,M.wood);}
    for(const b of [-1,1]){
      for(const y of [.14,.72])rod(pivot,[0,y,b*1.48],[span,y,b*1.48],.045,M.cream);
      for(let k=0;k<=4;k++)rod(pivot,[k*span/4,.15,b*1.48],[k*span/4,.72,b*1.48],.038,M.green);
      for(let k=0;k<4;k++)rod(pivot,[k*span/4,.18,b*1.48],[(k+1)*span/4,.70,b*1.48],.027,M.enamel);
      cyl(fixed,0,.14,b*1.65,.155,.18,.52,M.metal);
    }bake(pivot);bridgeParts.push(pivot);
  }
  function creekAt(s,length,width){
    const q=F.point(s),g=group(scene,q.x,.009,q.z);g.rotation.y=q.yaw;
    rounded(g,0,-.033,0,width,.118,length,.055,dam);
    const water=mesh(g,new T.PlaneGeometry(width*.95,length-.1,11,21),waterMat,0,.062,0);
    water.rotation.x=-Math.PI/2;water.castShadow=false;
    for(let j=0;j<18;j++){
      const z=(rnd()-.5)*length; if(Math.abs(z)<1.7)continue;
      ball(g,(j%2?1:-1)*(width*.51+rnd()*.26),.025,z,.16+rnd()*.22,.09+rnd()*.15,.15+rnd()*.24,paved);
    }
    return {g,water};
  }
  const brook=creekAt(F.bridge,15,5.9),ford=creekAt(F.ford,12,3.3);
  const waves=[];
  for(let i=0;i<24;i++){
    const x=(i%4-1.5)*.51,z=(Math.floor(i/4)-2.5)*1.62;
    const stripe=ball(ford.g,x,.074,z,.024,.008,.23+rnd()*.19,M.skyglass);
    waves.push(stripe);
  }
  // Separate, tangible course controls. Their coloured wheel / paddle tips invite a tap.
  const controls={},cranks={};
  for(const [type,s] of [['ramp',F.jump-4],['bridge',F.bridge-5.8],['sluice',F.ford-4.5]]){
    const q=F.point(s),g=group(scene,q.x+Math.sin(q.yaw)*1.96,.062,q.z+Math.cos(q.yaw)*1.96);
    g.rotation.y=q.yaw;
    rounded(g,0,.095,0,.69,.18,.67,.062,M.metal);
    rounded(g,0,.48,0,.39,.77,.38,.068,M.green);
    const h=group(g,0,.84,.20);
    if(type==='ramp'){
      rod(h,[0,0,0],[-.18,.37,0],.055,M.chrome);
      rounded(h,-.22,.408,0,.43,.155,.199,.069,M.enamel);
    }else{
      ring(h,0,0,0,.278,.047,type==='bridge'?M.enamel:M.paint[2]);
      for(let i=0;i<3;i++){const a=i*2*Math.PI/3;rod(h,[0,0,0],[.247*Math.cos(a),.247*Math.sin(a),0],.031,M.cream);}
      ball(h,0,0,.02,.061,.061,.041,M.chrome);ball(h,.226,.1,.072,.065,.065,.09,M.cream);
    }bake(h);controls[type]=g;cranks[type]=h;
  }
  const sluice=group(ford.g,-.3,.1,-2.31);
  for(const x of [-1.61,1.61])rounded(ford.g,x,.47,-2.31,.15,.94,.2,.033,M.green);
  rounded(sluice,.3,.22,0,3.08,.46,.12,.03,M.wood);bake(sluice);
  // Simple checkered enamel finish gantry and bollards, all separate solid parts.
  const finish=F.point(F.end-4),gantry=group(details,finish.x,.07,finish.z);gantry.rotation.y=finish.yaw;
  for(const z of [-1.84,1.84]){cyl(gantry,0,1.58,z,.072,.113,3.14,M.green);cyl(gantry,0,.19,z,.20,.25,.34,M.cream);}
  rounded(gantry,0,3.17,0,.17,.55,3.93,.069,M.green);
  for(let i=0;i<14;i++)for(let j=0;j<2;j++)box(gantry,-.093,3.04+j*.245,-1.6+i*.247,.02,.241,.243,(i+j)%2?M.chalk:M.deep);
  for(let d=12;d<F.end-6;d+=3.9){
    const q=trackSide(d,1.92),b=group(details,q[0],.02,q[2]);cyl(b,0,.218,0,.068,.09,.43,M.cream,12);cyl(b,0,.344,0,.071,.071,.103,M.enamel,12);
  }
  // Depot apron and three parking bays, just beyond the finish.
  box(land,1,.006,-10.56,20,.06,9.1,paved);
  for(let i=0;i<4;i++){box(land,.24,.046,-14.675+i*2.13,3.62,.014,.045,M.chalk);}
  // A finished roadster in the sun shows the result from the paint station.
  const sample=buildCar(scene,3);sample.root.position.set(-2.93,.115,-12.15);
  sample.root.rotation.y=-.54;sample.root.scale.setScalar(.81);
  const lacquer=Array.from({length:F.NX*F.NZ},()=>({wet:0,solids:.001,pigment:[.0006,.003,0]}));
  updateCoat(sample.coat,lacquer);
  rounded(land,-2.93,.042,-12.15,3.38,.13,2.53,.065,M.metal);
  const truck=group(scene,0,0,-6.91),chassis=group(truck),truckWheels=[];
  rounded(chassis,-2.05,.751,0,10.07,.246,1.89,.065,M.green);
  rounded(chassis,-2.05,.934,0,10.08,.139,2.06,.041,M.wood);
  for(const z of [-1.03,1.03])rounded(chassis,-2.05,.931,z,10.06,.206,.09,.029,M.chrome);
  rounded(chassis,-7.9,1.211,0,1.85,1.69,1.86,.234,M.paint[2]);
  rounded(chassis,-7.97,1.774,0,1.64,.66,1.882,.143,M.glass);
  rounded(chassis,-7.91,2.116,0,1.85,.161,1.99,.079,M.cream);
  for(const z of [-.96,.96]){
    for(const x of [-8.64,-7.31])rounded(chassis,x,1.773,z,.085,.531,.053,.022,M.paint[2]);
    rod(chassis,[-8.44,1.49,z],[-8.46,1.68,z*1.21],.023,M.chrome);
    rounded(chassis,-8.47,1.74,z*1.23,.09,.211,.13,.04,M.dark);
    for(const x of [-8.25,-5.87,1.32,2.15]){const w=wheel(truck);truckWheels.push(w);w.scale.setScalar(1.32);w.position.set(x,.467,z*.97);}
    ball(chassis,-8.83,1.1,z*.71,.054,.094,.141,M.lamp);
  }
  rounded(chassis,-8.85,.72,0,.17,.21,1.86,.06,M.chrome);bake(chassis);
  const lift=group(truck,4.69,.09,0);rounded(lift,0,0,0,3.39,.14,1.97,.046,M.metal);
  for(let i=0;i<12;i++)box(lift,-1.46+i*.266,.076,0,.047,.012,1.8,M.enamel);bake(lift);
  const liftArms=[-.76,.76].map(z=>{const o=group(truck,2.57,.47,z);
    rounded(o,0,.5,0,.103,1,.103,.038,M.chrome);return bake(o);});
  bake(land);bake(details);bake(baseRoad);
  return {truck,truckWheels,lift,liftArms,baseRoad,bridgeGroup,bridgeParts,brook,ford,waves,sluice,controls,cranks,rampGeo};
}
