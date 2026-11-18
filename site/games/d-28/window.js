'use strict';
function makeWindow(scene,box) {
  const {T,tau,rnd,group,mesh,mat,M,woodGrain,ball,block,cyl,rod,wire,ring,shape,panel,profile,bloom,bake}=Craft;
  const sill=group(scene),outside=group(scene),lace=group(scene,-.06,.011,.065);
  const oak=mat(0xd3a775,0,.49,{map:woodGrain}), seam=mat(0xa78764),frame=mat(0xdbc9a5,.025,.38,{map:woodGrain});
  for(let i=0;i<10;i++){
    const z=-4.6+i*1.55;
    const plank=block(sill,oak,(i%2)*.03,-.19,z,34,.365,1.545);
    const uv=plank.geometry.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setXY(j,uv.getX(j)*4.1+i*.36,uv.getY(j)*.9+i*.17);
  }
  block(sill,seam,0,-.39,2,34,.15,18);
  const flax=mat(0xe9d9b8,.015,.87);
  // A crocheted mat: the spaces between stitches are open geometry.
  const oval=cyl(lace,flax,0,.001,0,1,1,.024,104);oval.scale.set(3.06,1,1.89);
  for(const r of [1,1.03,1.06,1.17]){
    ring(lace,flax,0,.017,0,3.02*r,1.84*r,.018,'xz');
  }
  for(let i=0;i<68;i++){
    const a=i*tau/68,ca=Math.cos(a),sa=Math.sin(a),tangent=[-3.02*sa,1.84*ca];
    const loop=group(lace,ca*3.31,.014,sa*2.015);loop.rotation.y=-Math.atan2(tangent[1],tangent[0]);
    ring(loop,flax,0,0,0,.124,.20,.021,'xz');ring(loop,flax,0,.002,0,.087,.164,.013,'xz');
    const a2=(i+.5)*tau/68;rod(lace,flax,[ca*3.09,.02,sa*1.89],[Math.cos(a2)*3.51,.02,Math.sin(a2)*2.14],.015,.014,6);
  }
  bake(lace);
  // A broad, open casement. Mullions and fabric cast real shadows on the sill.
  for(const x of [-9.4,-4.5,4.9,10]){
    block(sill,frame,x,4.9,-4.8,.25,10,.32);
    block(sill,M.ivory,x-.07,4.9,-4.59,.06,10,.056);
  }
  for(const [y,h] of [[.12,.26],[.35,.13],[.48,.07],[5.5,.16]]){
    block(sill,frame,0,y,-4.76,29,h,.45);
    block(sill,M.ivory,0,y+h*.44,-4.50,29,.034,.061);
  }
  const glass=mat(0xc8e5e5,.16,.10,{transparent:true,opacity:.039,depthWrite:false});
  const pane=block(sill,glass,0,4,-4.91,28,8,.018);pane.castShadow=false;
  const linen=mat(0xfcf1d9,0,.85,{side:T.DoubleSide});
  function curtain(side){
    const geo=new T.PlaneGeometry(1,1,52,38),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){
      const u=p.getX(i)+.5,v=p.getY(i)+.5;
      const fold=Math.sin(u*tau*7+v*.8), edge=side<0?-5.65:5.54;
      p.setXYZ(i,edge+side*(u*2.38+.51*Math.sin(v*3.5)-.21*v),.31+v*8+.08*(1-v)**6*fold,-4.04+.21*fold+.105*Math.sin(u*tau*13+v*.48)+.23*(1-v)**2);
    }geo.computeVertexNormals();mesh(sill,geo,linen);
  }
  curtain(-1);curtain(1);
  // A porcelain bud vase and daisies, away from the winding bow.
  const vase=group(sill,-4.32,0,-.57);
  profile(vase,M.pale,[[.23,0],[.34,.022],[.37,.11],[.44,.39],[.42,.59],[.333,.81],[.19,.94],[.178,1.12],[.214,1.15],[.21,1.2],[.153,1.2]]);
  for(const [y,r] of [[.10,.364],[.13,.377],[.89,.255],[1.17,.216]])ring(vase,M.gold,0,y,0,r,r,.012,'xz');
  const leaf=mat(0x829881,.02,.54);
  for(let i=0;i<6;i++){
    const a=i*2.25,tip=[Math.cos(a)*(.22+rnd()*.3),1.7+rnd()*.79,Math.sin(a)*.36];
    const mid=[tip[0]*.6,1.4,tip[2]*.49];
    wire(vase,leaf,[[0,.99,0],mid,tip],.014);
    const ll=ball(vase,leaf,mid[0]+.087,1.46+Math.sin(a)*.12,mid[2],.178,.048,.054);ll.rotation.z=.56+Math.sin(a)*.32;
    const flower=group(vase,...tip);flower.rotation.set(-.38,Math.sin(a)*.44,Math.cos(a)*.33);
    bloom(flower,0,0,0,.126+rnd()*.065,M.cream,M.gold,9);
  }
  bake(sill);sill.children.forEach(o=>{if(o.material===glass)o.castShadow=false;});
  // Far banks slope away from the open window into atmospheric haze.
  const ridgeMats=[mat(0x9eafad),mat(0x92aaa1),mat(0xa4b4ae)];
  for(let layer=0;layer<3;layer++){
    const geom=new T.PlaneGeometry(85,12,112,8),p=geom.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),v=(p.getY(i)+6)/12;
      const hi=.8+layer*.9+1.25*Math.sin(x*.21+layer*2.6)+.46*Math.cos(x*.53+layer)+.12*Math.sin(x*1.47);
      p.setXYZ(i,x,-4+v*(4+hi),-24-layer*8-v*2+.6*Math.cos(x*.17));
    }geom.computeVertexNormals();mesh(outside,geom,ridgeMats[layer]);
  }
  const distantWater=mat(0x9cc8c7,.26,.18);
  const sea=block(outside,distantWater,0,-2.27,-19,82,.035,41);sea.receiveShadow=false;
  for(let i=0;i<66;i++){
    const x=(rnd()-.5)*48,z=-7-rnd()*28;
    ball(outside,i%3?M.pale:M.ivory,x,-2.236,z,.07+rnd()*.64,.004,.013+rnd()*.023);
  }
  bake(outside);
  const ship=box.boat(scene),airship=box.balloon(scene),orbit=box.mobile(scene);
  // View landmarks sit to the left of the lid along the camera's viewing direction.
  ship.scale.setScalar(3.05);airship.scale.setScalar(2.9);orbit.scale.setScalar(2.18);
  const rippleMat=mat(0xe2e7cc,.26,.14);
  const rippleGeo=new T.PlaneGeometry(13,1.8,27,2);rippleGeo.rotateX(-Math.PI/2);
  const ripples=mesh(scene,rippleGeo,distantWater,-14,-2.222,-21);
  ripples.castShadow=false;
  const waterPos=rippleGeo.attributes.position;
  const streaks=Array.from({length:7},(_,i)=>ball(scene,rippleMat.clone(),-18+i*1.55,-2.18,-20.1-i*.26,.35,.008,.033));
  const dustMat=mat(0xffdf97,.14,.39,{emissive:0xffdf9a,emissiveIntensity:.4});
  const motes=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),dustMat,42);scene.add(motes);motes.frustumCulled=false;
  const dummy=new T.Object3D();
  function update(s){
    for(let j=0;j<3;j++)for(let i=0;i<28;i++)waterPos.setY(j*28+i,s.water[i].h*(.7+j*.14));
    waterPos.needsUpdate=true;rippleGeo.computeVertexNormals();
    streaks.forEach((o,i)=>{o.position.y=-2.195+s.water[i*4].h;
      const slope=s.water[i*4+1].h-s.water[i*4].h;
      o.position.x=-18+i*1.55+3.8*slope;o.position.z=-20.1-i*.26+s.wind[i].u*.26;
      o.material.emissive.setHex(0xffdfaa);o.material.emissiveIntensity=s.lamps[i].light*.84;o.scale.x=.19+s.lamps[i].light*.78;o.rotation.y=s.wind[i].u*.24;});
    ship.position.set(-14.4+s.vessel.x*1.65,-2.04+s.water[10].h,-22.1);ship.rotation.z=s.vessel.heel;ship.rotation.y=.25;
    airship.position.set(-13.5+s.wind[3].u*.75,-.65+s.balloon.h*2.9,-21);airship.rotation.z=-s.wind[4].u*.22;
    orbit.position.set(-13.65,.43,-20.4);orbit.rotation.z=s.mobile.angle;
    ship.position.x-=(1-s.visits[0].lift)*32;
    airship.position.y+=(1-s.visits[1].lift)*14;
    orbit.position.y-=(1-s.visits[2].lift)*8;
    [ship,airship,orbit].forEach((o,i)=>o.visible=s.visits[i].lift>.001);
    s.dust.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(.005+(i%5)*.0017);dummy.updateMatrix();motes.setMatrixAt(i,dummy.matrix);});motes.instanceMatrix.needsUpdate=true;
  }
  return {update};
}
