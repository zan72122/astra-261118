'use strict';
function buildPark(scene) {
  const {T,tau,v,rand,mat,M,group,part,box,ball,cylinder,rod,torus,line,plate,mesh,pack,geom}=Forms;
  const ivory=0xf6edd3,iron=0x455654,gold=0xd9ab69,rose=0xb96858,sage=0x80a9a1,blue=0x849aa8;
  const solid=group(scene), wakes=[], flags=[], lampSets=[];
  const podPalette=[0xaf5550,0x739b99,0xd4a15f,0x8497a6,0xb98386,0x839986];
  function pod(p,i,scale) {
    const g=group(p);g.scale.setScalar(scale);
    line(g,M.steel,ivory,[[-.66,-.9,0],[-.6,-.42,0],[0,0,0],[.6,-.42,0],[.66,-.9,0]],.045);
    ball(g,M.shell,podPalette[i%6],0,-1.52,0,.73,.38,.77);
    cylinder(g,M.shell,podPalette[i%6],0,-1.47,0,.72,.65,.27,24).scale.z*=1.05;
    const lip=torus(g,M.brass,gold,0,-1.34,0,.72,.028);lip.rotation.x=Math.PI/2;lip.scale.y*=1.05;
    for(const x of [-.56,.56])for(const z of [-.4,.4])rod(g,M.steel,ivory,[x,-1.36,z],[x*.92,-.76,z*.94],.026);
    cylinder(g,M.shell,ivory,0,-.77,0,.49,.78,.13);ball(g,M.shell,podPalette[i%6],0,-.70,0,.56,.095,.56);
    box(g,M.leather,0x855749,0,-1.35,-.38,1.04,.34,.15);
    return pack(g);
  }
  function wheel(x,y,z,R,n,yaw,main){
    const base=group(scene);base.position.set(x,y,z);base.rotation.y=yaw;
    const supports=group(base),wheel=group(base),pods=[],rim=main?1.18:.68;
    for(const side of [-1,1]){
      const sideZ=side*rim;
      for(const dir of [-1,1]){
        rod(supports,M.paint,ivory,[dir*R*.62,-y+.18,side*(rim+1.05)],[0,0,sideZ],main?.23:.16,12);
        cylinder(supports,M.stone,0xd4c8b2,dir*R*.62,-y+.18,side*(rim+1.05),.5,.65,.42);
      }
      torus(wheel,M.paint,ivory,0,0,sideZ,R,.078,120);
      torus(wheel,M.paint,ivory,0,0,sideZ,R*.946,.055,120);
      torus(wheel,M.paint,ivory,0,0,sideZ,R*.22,.058,72);
      for(let i=0;i<n;i++){
        const a=i*tau/n,nxt=a+tau/n;
        const point=(r,an,zz)=>[Math.sin(an)*r,-Math.cos(an)*r,zz];
        rod(wheel,M.paint,ivory,point(R*.18,a+.38,sideZ*.55),point(R,a,sideZ),main?.041:.037);
        rod(wheel,M.paint,ivory,point(R*.18,a-.38,sideZ*.55),point(R,a,sideZ),main?.038:.031);
        rod(wheel,M.steel,0xd6ccc2,point(R*.946,a,sideZ),point(R,nxt,sideZ),.027);
        if(side===1)rod(wheel,M.paint,ivory,point(R,a,-sideZ),point(R,a,sideZ),.069);
        ball(wheel,M.porcelain,gold,...point(R*.946,a,sideZ+side*.06),.105);
      }
    }
    rod(supports,M.steel,iron,[0,0,-rim-.29],[0,0,rim+.29],main?.46:.33,32);
    for(const side of [-1,1]) {
      ball(wheel,M.brass,gold,0,0,side*(rim+.18),R*.117,R*.117,.24);
      torus(wheel,M.paint,ivory,0,0,side*(rim+.20),R*.14,.075);
      ball(wheel,M.porcelain,ivory,0,0,side*(rim+.39),R*.055,R*.055,.095);
    }
    pack(wheel);pack(supports);
    for(let i=0;i<n;i++)pods.push(main&&i===0?null:pod(base,i,main?1:.86));
    const updatePods=Forms.carriers(base,pods);
    return {update(a,s){
      wheel.rotation.z=a;
      pods.forEach((p,i)=>{if(p){const q=a+i*tau/n;p.position.set(R*Math.sin(q),-R*Math.cos(q),0);p.rotation.z=s.pods[i%12].angle;}});updatePods();
    }};
  }
  // Level boarding deck on the uphill side. The active seat clears its rounded sill.
  const station=group(solid);
  box(station,M.wood,0xa28768,0,7.43,5.3,5.2,.36,5.4);
  for(let k=0;k<25;k++)box(station,M.wood,k%3?0xc7ac89:0xbf9f7b,0,7.635,2.71+.217*k,5.16,.045,.208);
  for(const x of [-2.37,2.37])for(const z of [2.85,7.78]){
    rod(station,M.paint,ivory,[x,0,z],[x,7.45,z],.16,12);
    cylinder(station,M.stone,0xbcae96,x,.18,z,.43,.52,.4,12);
    rod(station,M.paint,ivory,[x,7.62,z],[x,8.53,z],.060);
    ball(station,M.brass,gold,x,8.56,z,.088);
  }
  for(const x of [-2.37,2.37]){
    rod(station,M.brass,gold,[x,8.50,2.85],[x,8.50,7.78],.057);
    rod(station,M.paint,ivory,[x,.35,2.85],[x,7.35,7.78],.095);
  }
  for(let k=0;k<40;k++)box(station,M.wood,0xc4a37e,0,7.45-k*.184,8.1+.29*k,2.87,.21,.32);
  const mainWheel=wheel(0,24.15,1.45,14.5,12,-.68,true);
  const pierWheel=wheel(1.45,9.42,-45.3,7.5,14,-.40,false);
  // Terraced headland with broken edges, seaward retaining wall and promenade.
  box(solid,M.stone,0xb9b79b,0,-1.65,-5,117,3.4,99);
  box(solid,M.stone,0xb5a08a,0,-1.13,-54.3,118,2.5,1.25);
  box(solid,M.stone,0xe0d0b7,0,.135,-51.9,118,.18,4.4);
  box(solid,M.stone,0xdbbfa6,-1,.11,-24,7,.13,59);
  box(solid,M.stone,0xe1c6ab,0,.14,-32,105,.12,4.7);
  for(let i=0;i<47;i++){
    box(solid,M.stone,0xcbb7a0,-57.5+i*2.5,.235,-52.1,.026,.015,4.2);
    if(i%2===0){rod(solid,M.steel,ivory,[-57.5+i*2.5,.18,-54],[-57.5+i*2.5,1.05,-54],.048);ball(solid,M.brass,gold,-57.5+i*2.5,1.08,-54,.072);}
  }
  rod(solid,M.steel,ivory,[-58,1,-54],[58,1,-54],.041);
  rod(solid,M.steel,ivory,[-58,.61,-54],[58,.61,-54],.025);
  // Gabled and hipped roofs have independent ridges, eaves, painted fascias and windows.
  function building(p,x,y,z,w,h,d,wall,roof,detailed=true) {
    const g=group(p);g.position.set(x,y,z);box(g,M.stone,wall,0,h/2,0,w,h,d);
    const lift=Math.min(w*.42,h*.47),W=w*.55,D=d*.55;
    const roofG=geom('hipped roof',()=>{
      const a=mesh(group(),M.paint,roof,[-1,0,1,1,0,1,.64,1,0,-.64,1,0,-1,0,-1,1,0,-1],[0,1,2,0,2,3,1,5,2,5,4,3,5,3,2,4,0,3]);
      return a.geometry;
    });
    part(g,roofG,M.paint,roof,0,h,0,W,lift,D);
    box(g,M.paint,ivory,0,h-.06,0,w+.12,.12,d+.12);
    box(g,M.stone,wall,w*.25,h+lift*.55,-d*.15,w*.13,lift*.77,d*.15);
    if(detailed){
      for(let k=0;k<3;k++){
        const xx=(k-1)*w*.29;box(g,M.paint,ivory,xx,h*.58,d/2+.02,w*.18,h*.36,.06);
        box(g,M.glass,0x536569,xx,h*.58,d/2+.062,w*.135,h*.295,.045);
        box(g,M.wood,ivory,xx,h*.59,d/2+.09,w*.14,.055,.055);
      }
      box(g,M.paint,roof,0,h*.29,d/2+.17,w*1.04,.09,.4);
    }
    return g;
  }
  const roofs=[0xa56758,0xb67e6e,0x758d8c,0x879392,0x9a8c9a];
  const facades=[0xeadbc1,0xd0b09c,0xe2ccac,0xcac5b8,0xdabbb2];
  for(let i=0;i<35;i++){
    const x=(i%12-5.5)*4.9+(rand()-.5)*1.35,z=-43-Math.floor(i/12)*3.5;
    if(Math.abs(x-3)<10||Math.abs(x+4)<4)continue;
    building(solid,x,.18,z,2.8+rand()*1.7,2+rand()*2.2,2.9,facades[i%5],roofs[i%5]);
  }
  const foliageG=geom('treeCrown',()=>{
    const g=new T.IcosahedronGeometry(1,2),a=g.attributes.position,col=[];
    for(let i=0;i<a.count;i++){
      const x=a.getX(i),y=a.getY(i),z=a.getZ(i),j=.95+.074*Math.sin(13*x+7*z)*Math.cos(11*y-3*z);
      a.setXYZ(i,x*j,y*j,z*j);const shade=.87+.08*y+.055*Math.cos(x*23-y*15);
      col.push(shade,shade,shade*.97);
    }g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
  });
  const leaf=mat(.95,0,{vertexColors:true});
  function tree(x,y,z,h,i){
    const c=[0x718570,0x758975,0x88a08b,0x9caa86,0x698678][Math.abs(i)%5],slender=i%4===0;
    cylinder(solid,M.wood,0x8b7865,x,y+h*.26,z,h*.028,h*.046,h*.52,9);
    if(slender){for(let k=0;k<3;k++){const r=h*(.17-k*.037);part(solid,foliageG,leaf,c,x,y+h*(.42+k*.21),z,r,h*(.29-.055*k),r*.91);}return;}
    for(let j=0;j<6;j++){
      const a=j*tau/5+i,r=j===5?0:h*.16,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r,yy=y+h*(j===5?.83:.62+.12*rand());
      rod(solid,M.wood,0x887760,[x,y+h*.3,z],[xx,yy,zz],h*.019,7);
      part(solid,foliageG,leaf,c,xx,yy,zz,h*(.20+rand()*.045),h*(.16+rand()*.05),h*.225);
    }
  }
  for(let i=0;i<82;i++){
    let x=(rand()-.5)*88,z=3-rand()*54;if(Math.abs(x)<10&&z>-35)continue;
    if(Math.abs(x-3)<9&&Math.abs(z+41)<4)continue;
    tree(x,.18,z,2.7+rand()*4.5,i);
  }
  tree(-5.9,.18,-13.3,5.7,5);tree(7.8,.18,-15,5.8,3);
  // Undulating islands and their waterfront town, each ridge a volumetric landform.
  function island(cx,cz,length,depth,h,col) {
    const g=group(solid);g.position.set(cx,-1.9,cz);const verts=[],indices=[],segs=60;
    const shape=[];
    for(let i=0;i<=segs;i++){const a=tau*(i%segs)/segs,rad=.88+.09*Math.sin(3*a+.7)+.052*Math.cos(5*a);shape.push([Math.cos(a)*rad,Math.sin(a)*rad]);}
    for(let k=0;k<=8;k++)for(let i=0;i<=segs;i++){
      const [x,z]=shape[i],r=(8-k)/8,yy=h*(1-r*r)*(.78+.13*Math.cos(x*r*11)+.09*Math.sin(z*r*8));
      verts.push(x*length*r,yy,z*depth*r);
      if(k&&i){const b=k*(segs+1)+i;indices.push(b-1,b,b-segs-1,b-1,b-segs-1,b-segs-2);}
    }const o=mesh(g,M.stone,col,verts,indices);o.geometry.computeBoundingSphere();
  }
  island(-113,-203,130,34,17,0x9b98a5);island(100,-223,115,33,21,0xa9a0ac);
  island(72,-133,67,20,13,0x8b9b98);island(-94,-120,67,24,11,0x8c9c96);
  for(let i=0;i<106;i++){
    const side=i%3?1:-1,x=side*(22+rand()*105),z=-112-rand()*22,y=-.9+Math.max(0,1-Math.abs(Math.abs(x)-73)/65)*2.3+rand()*1.1;
    building(solid,x,y,z,1.8+rand()*2.9,1.7+rand()*3.5,2+rand()*1.8,facades[i%5],roofs[i%5],false);
  }
  // Inlaid limestone rondel around the ride, low planted borders and individual blooms.
  cylinder(solid,M.stone,0xd6c1a5,-3.75,.178,-27.6,6.22,6.22,.056,72);
  for(const r of [5.63,5.82,6.11])torus(solid,M.stone,r===5.82?0xc39b85:0xe4d6bc,-3.75,.211,-27.6,r,r===5.82?.082:.032,96).rotation.x=Math.PI/2;
  function bed(x,z,sx,sz,tint){
    const edging=cylinder(solid,M.stone,0xcdbfa1,x,.23,z,1,1.035,.27,32);edging.scale.x*=sx;edging.scale.z*=sz;
    ball(solid,M.foliage,0x798569,x,.36,z,sx*.96,.16,sz*.96);
    for(let k=0;k<20;k++){
      const a=rand()*tau,r=Math.sqrt(rand())*.87,xx=x+sx*Math.cos(a)*r,zz=z+sz*Math.sin(a)*r;
      part(solid,foliageG,leaf,k%3?0x889474:0x9ba483,xx,.47,zz,.19,.17+rand()*.15,.19);
      for(let j=0;j<3;j++)ball(solid,M.cloth,j%2?tint:0xe6d9b6,xx+(rand()-.5)*.24,.67+rand()*.105,zz+(rand()-.5)*.24,.062,.043,.062);
    }
  }
  bed(2.5,-25.8,1.05,2.15,0xc69a8c);bed(-8,-18,2.2,1.15,0xc6a4aa);bed(7.4,-38.4,2.6,1.2,0xc3a493);
  // Working carousel. Individual horses hang from crank-driven brass poles.
  const merry=group(scene);merry.position.set(-3.75,.22,-27.6);
  const deck=group(merry), merryBase=group(merry), horses=[];
  cylinder(merryBase,M.stone,0xc0a797,0,.12,0,4.8,4.9,.24,64);
  cylinder(deck,M.wood,0xb59264,0,.32,0,4.45,4.64,.29,64);
  cylinder(deck,M.wood,0xdab98c,0,.51,0,4.45,4.45,.13,64);
  cylinder(merryBase,M.shell,0xb88570,0,2.4,0,.82,.98,4.3,24);
  for(let i=0;i<24;i++){
    const a=i*tau/24;
    const g=geom('awning'+i,()=>new T.LatheGeometry([new T.Vector2(.025,5.55),new T.Vector2(.7,5.3),new T.Vector2(2.3,4.60),new T.Vector2(4.6,4.19),new T.Vector2(4.72,4.1),new T.Vector2(4.70,3.94)],5,a,tau/24));
    part(merryBase,g,M.cloth,i%2?ivory:rose);
    const ang=a+tau/48;ball(merryBase,M.paint,i%2?ivory:rose,4.69*Math.sin(ang),3.98,4.69*Math.cos(ang),.60,.30,.11).rotation.y=ang;
    ball(merryBase,M.glow,ivory,4.68*Math.sin(a),4.10,4.68*Math.cos(a),.072);
  }
  for(const [y,r,th] of [[4.18,4.69,.075],[3.94,4.67,.043],[.52,4.47,.045]]){const o=torus(merryBase,M.brass,gold,0,y,0,r,th,80);o.rotation.x=Math.PI/2;}
  rod(merryBase,M.brass,gold,[0,5.45,0],[0,6.55,0],.042);ball(merryBase,M.brass,gold,0,6.54,0,.10);
  function pennant(parent,x,y,z,c,scale,idx){
    const g=group(parent);g.position.set(x,y,z);g.scale.setScalar(scale);
    const o=mesh(g,M.cloth,c,[0,0,0,.39,-.04,.03,1,-.16,.09,.39,-.30,.025,0,-.39,0],[0,1,3,0,3,4,1,2,3]);
    // Free edge responds far more than the sewn hoist.
    o.geometry.userData.rest=Array.from(o.geometry.attributes.position.array);o.material=M.cloth.clone();o.material.color.set(c);
    flags.push({o,idx});return g;
  }
  pennant(merry,0,6.49,0,rose,1.45,0);
  for(let i=0;i<10;i++){
    const a=i*tau/10,r=(i%2?2.8:3.68),x=r*Math.sin(a),z=r*Math.cos(a);
    rod(deck,M.brass,gold,[x,.56,z],[x,4.08,z],.047,12);
    const horse=group(merry),g=group(horse),col=[ivory,0xaf7963,0xd1bbaa][i%3];
    ball(g,M.porcelain,col,0,0,0,.48,.23,.17);
    ball(g,M.porcelain,col,.31,.22,0,.17,.32,.14).rotation.z=-.48;
    ball(g,M.porcelain,col,.46,.39,0,.23,.135,.135);
    ball(g,M.wood,0x926b56,.26,.35,0,.12,.26,.12);
    for(const side of [-1,1]){
      ball(g,M.porcelain,col,.39,.54,side*.073,.044,.10,.035);
      ball(g,M.leather,0x493d38,.46,.42,side*.12,.026);
      for(const dir of [-1,1])line(g,M.porcelain,col,[[dir*.29,-.08,side*.10],[dir*.37,-.24,side*.14],[dir*.48,-.3,side*.14]],.053);
    }
    line(g,M.wood,0x936f58,[[-.37,.07,0],[-.52,.01,0],[-.57,-.22,.04]],.081);
    ball(g,M.leather,rose,-.04,.18,0,.22,.085,.19);pack(horse);horses.push({horse,a,r});
  }
  pack(deck);pack(merryBase);const updateHorses=Forms.carriers(merry,horses.map(h=>h.horse));
  // Kiosks with canvas awnings, counters, shutters, individual terracotta courses.
  function booth(x,z,rot,c){
    const g=group(solid);g.position.set(x,.19,z);g.rotation.y=rot;
    building(g,0,0,0,3.35,2.38,2.5,0xe2cbae,c,false);
    box(g,M.wood,c,0,.58,1.32,3.35,1.13,.13);box(g,M.wood,0x816753,0,1.11,1.49,3.65,.13,.52);
    box(g,M.wood,0x786c5e,0,1.63,1.27,2.69,.84,.12);
    for(let j=0;j<9;j++){
      const o=box(g,M.cloth,j%2?ivory:c,(j-4)*.409,2.22,1.65,.41,.08,1.03);o.rotation.x=.20;
      plate(g,M.cloth,j%2?ivory:c,(j-4)*.409,2.04,2.13,.41,.25,.045,.09);
    }
    for(const side of [-1,1])rod(g,M.brass,gold,[side*1.72,1.14,1.34],[side*1.72,2.03,2.05],.038);
  }
  booth(5,-20,-.34,sage);booth(-13,-34,.21,rose);booth(12,-34,-.15,rose);booth(-4.5,-40,.15,blue);
  function bench(x,z,rot){
    const g=group(solid);g.position.set(x,.18,z);g.rotation.y=rot;
    for(let j=0;j<4;j++)box(g,M.wood,0xc09573,0,.47,-.21+j*.14,1.85,.085,.115);
    for(let j=0;j<2;j++)box(g,M.wood,0xb18b6b,0,.70+j*.18,-.26,1.85,.15,.075);
    for(const x of [-.66,.66]){rod(g,M.steel,iron,[x,0,.2],[x,.45,.2],.045);rod(g,M.steel,iron,[x,0,-.24],[x,.88,-.24],.047);}
  }
  for(let i=-3;i<=3;i++){bench(i*6,-50,Math.PI);if(i!==0)bench(i*5,-29,.03);}
  // Festoon cables have static catenary sag. Independent filaments follow local voltage.
  for(let j=0;j<3;j++){
    const start=[-16+j*3,4.4,-17-j*13],end=[16+j,4.4,-19-j*13];
    const points=[];
    for(let i=0;i<=16;i++){const q=i/16;points.push([start[0]+(end[0]-start[0])*q,4.4-4*q*(1-q)*1.08,start[2]+(end[2]-start[2])*q]);}
    line(solid,M.steel,iron,points,.018,5);
    for(const a of [start,end]){rod(solid,M.wood,0x89745a,[a[0],.12,a[2]],a,.087);ball(solid,M.brass,gold,a[0],a[1]+.03,a[2],.107);}
    for(let k=0;k<8;k++){
      const [x,y,z]=points[1+k*2],g=group(scene);
      const bulbMat=mat(.19,.09,{color:0xffdd9e,emissive:0xffb855,emissiveIntensity:.16});
      rod(solid,M.steel,iron,[x,y,z],[x,y-.14,z],.028);ball(g,bulbMat,0xffffff,x,y-.22,z,.085,.112,.085);pack(g,false);lampSets.push(bulbMat);
    }
  }
  for(let i=0;i<18;i++){
    const x=(i%9-4)*6.5,z=i<9?-52:-31;
    cylinder(solid,M.steel,iron,x,.18,z,.15,.24,.35);rod(solid,M.steel,iron,[x,.23,z],[x,2.8,z],.062);
    cylinder(solid,M.brass,gold,x,2.81,z,.16,.09,.16);ball(solid,lampSets[(i*5)%24],0xffe4b6,x,3.04,z,.19,.245,.19);
    cylinder(solid,M.steel,iron,x,3.29,z,.035,.21,.14);
  }
  // Opal panes share the neighbouring lamp circuit, so the shop fronts warm in succession.
  for(const [x,z,yaw,circuit] of [[5,-20,-.34,10],[-13,-34,.21,7],[12,-34,-.15,18],[-4.5,-40,.15,21]]){
    const frame=group(solid);frame.position.set(x,.19,z);frame.rotation.y=yaw;
    for(let j=-1;j<=1;j++){
      box(frame,lampSets[circuit+j],0xf2d4a7,j*.80,1.65,1.354,.70,.70,.05);
      for(const y of [1.45,1.82])box(frame,M.wood,0x9b8168,j*.80,y,1.39,.715,.037,.031);
    }
  }
  // Sailing cutter, including a planked hull, boom, jib and canted mainsail.
  const boat=group(scene),hull=group(boat),boom=group(boat);
  const cross=[[-3.05,.04],[-2.48,.69],[-1.5,.99],[.85,1.03],[2.09,.78],[3.3,.025]];
  const hullVerts=[],hullIdx=[];
  cross.forEach(([x,r],i)=>{
    hullVerts.push(x,.61,r,x,.12,r*.77,x,-.2,0,x,.12,-r*.77,x,.61,-r);
    if(i){for(let j=0;j<4;j++){const a=(i-1)*5+j;hullIdx.push(a,a+5,a+1,a+1,a+5,a+6);}const a=(i-1)*5;hullIdx.push(a,a+4,a+5,a+4,a+9,a+5);}
  });
  const hullMaterial=M.shell.clone();hullMaterial.side=T.DoubleSide;
  mesh(hull,hullMaterial,ivory,hullVerts,hullIdx);
  for(const side of [-1,1])line(hull,M.wood,0xa27d5c,cross.map(([x,r])=>[x,.63,r*side]),.056);
  box(hull,M.wood,0xb18a6c,-.73,.8,0,1.68,.46,1.28);
  box(hull,M.paint,ivory,-.73,1.08,0,1.86,.12,1.43);
  rod(hull,M.wood,0xbc946a,[.54,.58,0],[.54,6.97,0],.073);
  for(const z of [-.89,.89])rod(hull,M.steel,0x9c9283,[-1.27,.63,z],[.54,6.87,0],.018);
  mesh(hull,M.cloth,0xe4c49d,[.7,6.48,0,2.97,.87,0,1.38,1.66,.24,.81,1.46,.06],[0,1,2,0,2,3,2,1,3]);
  rod(boom,M.wood,0xab835a,[0,1.28,0],[-2.65,1.13,0],.053);
  mesh(boom,M.cloth,ivory,[0,6.72,0,-.04,1.4,0,-2.61,1.23,0,-1.19,3.06,.33],[0,3,2,0,1,3,1,2,3]);
  mesh(boom,M.cloth,rose,[-.14,6.38,.011,-.4,5.88,.11,-.015,5.79,.061,-.015,6.28,.025],[0,1,2,0,2,3]);
  boom.position.x=.54;pack(hull);pack(boom);
  for(let i=0;i<4;i++){
    const x=i===0?-12:29+i*15,z=-80-i*9;
    const g=group(scene);g.position.set(x,-1.1,z);g.scale.setScalar(.44+i*.085);
    ball(g,M.wood,0x836e60,0,.27,0,2,.34,.62);
    rod(g,M.wood,0xa38e76,[0,.43,0],[0,4.56,0],.046);
    mesh(g,M.cloth,i%2?0xdfc8ba:ivory,[0,4.49,0,-1.73,.75,0,-.01,.90,.07],[0,1,2]);pack(g);wakes.push(g);
  }
  // The envelope is sewn from gores. Shading follows the bulge between the seams.
  const aerostat=group(scene),envelope=group(aerostat);
  const profile=[[.37,1.25],[.59,1.76],[1.46,2.84],[2.04,3.95],[2.19,4.9],[2.02,5.74],[1.49,6.44],[.79,6.84],[.06,6.97]];
  for(let j=0;j<16;j++){
    const verts=[],idx=[];
    for(let k=0;k<profile.length;k++)for(let n=0;n<=4;n++){
      const a=tau*(j+n/4)/16,r=profile[k][0]*(1+.046*Math.sin(n*Math.PI/4));
      verts.push(r*Math.sin(a),profile[k][1],r*Math.cos(a));
      if(n&&k){const i=k*5+n;idx.push(i-6,i-5,i,i-6,i,i-1);}
    }
    mesh(envelope,M.cloth,j%4===0?0xb97463:j%2?0xe8d5ae:0xbca88a,verts,idx);
  }
  for(const x of [-.31,.31])for(const z of [-.25,.25])rod(envelope,M.wood,0x997857,[x,.51,z],[x*1.2,1.65,z*1.2],.028);
  box(envelope,M.wood,0xb78955,0,.3,0,.91,.55,.72);
  for(let k=0;k<4;k++)box(envelope,M.wood,0x97794f,0,.1+k*.12,0,.93,.035,.74);
  pack(envelope);
  // Mooring post, windsock and small landing platform.
  cylinder(solid,M.wood,0xb49c7a,-10,.19,-46,2.8,2.95,.23,32);
  pack(solid);
  return {update(s){
    mainWheel.update(s.turn,s);pierWheel.update(s.park.angle*.16,s);
    deck.rotation.y=s.park.angle;
    horses.forEach(({horse,a,r},i)=>{const q=a+s.park.angle;horse.position.set(r*Math.sin(q),1.53+.22*Math.sin(2*q+i*.43),r*Math.cos(q));horse.rotation.y=q;});updateHorses();
    flags.forEach(({o,idx})=>{const pos=o.geometry.attributes.position,rest=o.geometry.userData.rest;
      for(let i=0;i<pos.count;i++){const u=rest[i*3];pos.setZ(i,rest[i*3+2]+u*u*s.flags[(idx+i)%9].bend*.5);}
      pos.needsUpdate=true;o.geometry.computeVertexNormals();
    });
    boat.position.set(s.sail.x,-1.10+s.waves[24].z,-71);boat.rotation.set(s.sail.heel,-.32,s.waves[23].z*.4);
    boom.rotation.y=-s.sail.boom;boom.scale.z=.40+s.sail.trim;
    wakes.forEach((o,i)=>{o.position.y=-1.13+s.waves[i*7].z;o.rotation.z=s.waves[i*7+1].z;});
    aerostat.position.set(-10+s.balloon.lift*.23,.33+s.balloon.lift,-46);envelope.rotation.z=-s.balloon.lean*.33;
    lampSets.forEach((m,i)=>m.emissiveIntensity=.11+4.4*s.bulbs[i].heat);
  }};
}
