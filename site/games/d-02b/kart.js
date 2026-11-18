'use strict';
const paint=material('#b52c25',.27,.38), cherry=material('#a62722',.28,.35),cream=material('#eee0bd',.38,.22),
  chrome=material('#ccd0c6',.19,.92),steel=material('#6e7571',.31,.78),rubber=material('#292b29',.88,.015),
  tread=material('#373833',.82),black=material('#343733',.56,.23),leather=material('#534638',.78),
  gold=material('#c79649',.31,.72),tailRed=material('#c94725',.20,.3,{emissive:0x9b2910,emissiveIntensity:.45}),
  hair=material('#503626',.83),suit=material('#d6a354',.92),glove=material('#73573b',.84);
function loft(parent,profiles,mat){
  const pos=[],idx=[],uv=[],n=16;
  for(const [z,w,y,h] of profiles)for(let i=0;i<n;i++){const a=i/n*TAU,cs=Math.cos(a),si=Math.sin(a);pos.push(w*Math.sign(cs)*Math.abs(cs)**.6,y+h*Math.sign(si)*Math.abs(si)**.66,z);uv.push(i/n,z);}
  for(let j=0;j<profiles.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;idx.push(a,b,a+n,b,b+n,a+n);}
  for(let i=1;i<n-1;i++){idx.push(0,i+1,i);const n0=n*(profiles.length-1);idx.push(n0,n0+i,n0+i+1);}
  return piece(parent,meshData(pos,idx,null,uv),mat,0,0,0);
}
function makeKart(){
  const root=new T.Group(),body=new T.Group();root.add(body);
  const wheels=[], hubs=[];
  // A lathed tyre has rounded shoulders, a flat contact band and an inset hub.
  const wheelGeom=new T.LatheGeometry([[.16,-.20],[.28,-.203],[.36,-.19],[.405,-.146],[.414,-.105],[.414,.105],[.405,.146],[.36,.19],[.28,.203],[.16,.20]].map(([x,y])=>new T.Vector2(x,y)),48);
  for(let i=0;i<4;i++){
    const rear=i>=2,side=i%2?1:-1,pivot=new T.Group(),rotor=new T.Group();pivot.position.set(side*(rear?1.005:.89),rear?.427:.393,rear?.9:-.99);
    root.add(pivot);pivot.add(rotor);wheels.push(pivot);hubs.push(rotor);
    if(!rear)rotor.scale.set(.88,.89,.89);
    piece(rotor,wheelGeom,rubber,0,0,0,1.12,1,1,0,0,PI/2);
    for(const off of [-.087,.087]){
      const seam=ring(rotor,.411,.006,tread,off,0,0);seam.rotation.y=PI/2;
    }
    const decals=new Batch();
    for(let j=0;j<32;j++)for(const sign of [-1,1]){
      const a=j*TAU/32+.04*sign;decals.put(geo.box,'#393b35',sign*.131,Math.cos(a)*.404,Math.sin(a)*.404,.11,.009,.038,a,.19*sign,0);
    }
    decals.finish(rotor,worldMat);
    for(const k of [-1,1]){const x=k*.203;
      piece(rotor,geo.cylinder,steel,x,0,0,.227,.036,.227,0,0,PI/2);
      const rim=ring(rotor,.209,.024,chrome,x+k*.016,0,0);rim.rotation.y=PI/2;
      piece(rotor,geo.cylinder,black,x+k*.022,0,0,.155,.032,.155,0,0,PI/2);
      piece(rotor,geo.cylinder,chrome,x+k*.041,0,0,.086,.039,.086,0,0,PI/2);
      for(let j=0;j<4;j++){const a=j*PI/2+.55;piece(rotor,geo.cylinder,gold,x+k*.04,Math.cos(a)*.121,Math.sin(a)*.121,.024,.03,.024,0,0,PI/2);}
    }
    strut(body,V(side*.27,.36,rear?.89:-1),V(side*.97,.42,pivot.position.z),.072,black);
  }
  loft(body,[[-1.49,.40,.39,.095],[-1.20,.68,.39,.15],[-.62,.78,.42,.13],[.62,.79,.43,.13],[1.29,.66,.47,.15]],cherry);
  loft(body,[[-1.57,.33,.47,.088],[-1.37,.53,.53,.16],[-.88,.50,.62,.21],[-.60,.37,.58,.15]],paint);
  for(const side of [-1,1]){
    const pod=new T.Group();body.add(pod);pod.position.x=side*.756;
    loft(pod,[[-.69,.105,.46,.10],[-.53,.204,.50,.18],[.38,.23,.53,.205],[.74,.16,.54,.16]],paint);
    tubePath(body,[[side*.78,.34,-1.36],[side*.98,.3,-1.26],[side*1.02,.31,-.81],[side*.98,.32,-.69]],.046,chrome);
    tubePath(body,[[side*.93,.37,-.65],[side*.988,.34,-.48],[side*1.02,.34,.40],[side*.88,.4,.66]],.049,chrome);
    tubePath(body,[[side*.91,.56,-.45],[side*.955,.59,.1],[side*.935,.61,.46]],.022,cream);
  }
  // Seat, steering shaft, and the child's arms all have distinct silhouettes.
  piece(body,geo.ball,leather,0,.57,-.02,.53,.18,.55);
  piece(body,geo.ball,leather,0,.91,.25,.52,.47,.17,-.13);
  tubePath(body,[[-.46,.72,.25],[-.46,1.1,.30],[-.32,1.29,.31],[.32,1.29,.31],[.46,1.10,.30],[.46,.72,.25]],.021,cream);
  strut(body,V(0,.41,-.94),V(0,1.03,-.68),.035,steel);
  const steer=ring(body,.285,.031,black,0,1.04,-.68);steer.rotation.x=-.58;
  for(let i=0;i<3;i++)strut(steer,V(0,0,0),V(Math.cos(i*TAU/3)*.26,Math.sin(i*TAU/3)*.26,0),.018,steel);
  piece(body,geo.ball,suit,0,1.04,-.075,.431,.50,.30,-.09);
  const scarf=material('#a64c30',.91);
  piece(body,geo.ball,scarf,0,1.43,-.10,.302,.112,.251);
  for(const side of [-1,1]){
    const a=V(side*.31,1.25,-.11),b=V(side*.48,1.03,-.38),c=V(side*.243,1.10,-.64);
    strut(body,a,b,.13,suit);piece(body,geo.ball,suit,b.x,b.y,b.z,.127,.133,.13);strut(body,b,c,.094,suit);
    piece(body,geo.ball,glove,c.x,c.y,c.z,.102,.095,.10);
    // Hair visible only beneath the rounded, strapped helmet.
    piece(body,geo.ball,hair,side*.285,1.44,.06,.147,.166,.13,0,0,-side*.35);
    piece(body,geo.ball,hair,side*.345,1.34,.105,.105,.157,.10,0,0,-side*.48);
    piece(body,geo.ball,scarf,side*.326,1.41,.10,.112,.042,.105,0,0,side*.45);
  }
  const head=new T.Group();head.position.set(0,1.59,-.095);body.add(head);
  piece(head,geo.ball,hair,0,-.03,0,.385,.25,.361);
  const helmet=material('#eae4ce',.29,.19);
  const dome=piece(head,new T.SphereGeometry(1,56,30,0,TAU,0,PI*.61),helmet,0,0,0,.445,.422,.415);
  const band=ring(head,.416,.023,cherry,0,-.143,0);band.rotation.x=PI/2;band.scale.set(1.023,.958,1);
  for(const side of [-1,1]){
    const stripe=piece(head,new T.SphereGeometry(1,5,32,PI*.5+side*.21-.052,.104,0,PI*.606),paint,0,0,0,.446,.424,.417);
    piece(head,new T.SphereGeometry(1,4,32,PI*.5+side*.31-.016,.032,0,PI*.606),gold,0,0,0,.447,.424,.417);
    piece(head,geo.ball,helmet,side*.369,-.104,0,.080,.145,.156);
    piece(head,geo.cylinder,steel,side*.439,-.12,.02,.035,.024,.035,0,0,PI/2);
  }
  // Rear-mounted air-cooled motor with a finned cylinder and protective pipework.
  piece(body,geo.box,black,.44,.67,.72,.52,.42,.54,0,.08,0);
  for(let i=0;i<7;i++)piece(body,geo.box,i%2?steel:chrome,.44,.72+i*.037,.77,.50,.018,.42,0,.08,0);
  piece(body,geo.cylinder,black,.43,.998,.77,.17,.07,.17);
  piece(body,geo.box,steel,-.39,.72,.68,.40,.33,.42);
  for(let i=0;i<7;i++)piece(body,geo.box,black,-.55+i*.052,.78,.904,.024,.185,.025);
  tubePath(body,[[.50,.83,.57],[.7,.78,.70],[.70,.67,1.03],[.51,.66,1.20],[.21,.69,1.22]],.050,steel);
  // A low red coachwork panel frames the exposed motor from the chase camera.
  loft(body,[[.95,.67,.59,.13],[1.03,.86,.60,.195],[1.27,.88,.595,.20],[1.38,.72,.57,.15]],paint);
  for(const side of [-1,1]){
    tubePath(body,[[side*.21,.79,1.06],[side*.21,.80,1.22],[side*.21,.756,1.31],[side*.21,.707,1.36],[side*.21,.61,1.39]],.035,cream);
    piece(body,geo.cylinder,chrome,side*.635,.58,1.365,.108,.047,.108,PI/2);
    piece(body,geo.ball,tailRed,side*.635,.58,1.394,.082,.076,.030);
  }
  // Crown badge is a small pressed-metal leaf, without lettering.
  piece(body,geo.leaf,gold,0,.607,1.395,.093,.08,.095,PI/2,0,-.21);
  tubePath(body,[[-.83,.43,1.08],[-.96,.41,1.39],[-.79,.41,1.51],[-.4,.41,1.54],[.4,.41,1.54],[.79,.41,1.51],[.96,.41,1.39],[.83,.43,1.08]],.052,chrome);
  for(const side of [-1,1])strut(body,V(side*.49,.33,1.13),V(side*.55,.41,1.52),.038,black);
  return {root,body,wheels,hubs,head,steer};
}
