const buildHarbor = (scene) => {
  const {T,PI,TAU,rand,vec,group,mesh,box,cyl,oval,beam,line,ring,geo,batch,mat,M,fisher,crate,dock,piling,lantern,lifeRing,coil}=HarborArt;
  const world=group(scene), gates=[], bell=group(scene,4.49,1.93,-1.09);
  function masonry(p,x,z,w,h,d){
    box(p,x,h*.5-1.52,z,w,h,d,M.stone3);
    const n=Math.max(2,Math.ceil(w/1.23)), cols=Math.max(2,Math.ceil(d/1.82)), rows=Math.ceil(h/.46);
    for(let j=0;j<rows;j++){
      const y=-1.52+(j+.5)*h/rows;
      for(let k=0;k<n;k++){
        const width=w/n,dx=Math.min(w/2-.14,-w*.5+(k+.5)*width+(j%2?.26:0));
        box(p,x+dx,y,z+d*.5,width-.03,h/rows-.03,.10+rand()*.05,[M.stone,M.stone2,M.stone3][(j+k)%3]);
      }
      for(let k=0;k<cols;k++){
        const len=d/cols;
        box(p,x-w*.5,y,z-d*.5+(k+.5)*len,.12+rand()*.05,h/rows-.033,len-.03,[M.stone,M.stone3,M.stone2][(k+j)%3]);
      }
    }
    box(p,x,h-1.49,z,w+.19,.19,d+.18,M.concrete);
  }
  // Mountain ridges have continuous triangulated slopes in three depth planes.
  const land=mat(0xffffff,.98);land.vertexColors=true;land.side=T.DoubleSide;
  function hills(cx,cz,w,d,H,index){
    const vs=[],ids=[],uv=[],cs=[],nx=88,nz=19;
    const tones=[['#91a8a6','#b2bcb2'],['#768e83','#98a58c'],['#5b7768','#929e7d']][index];
    const ca=new T.Color(tones[0]),cb=new T.Color(tones[1]);
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const u=i/nx,v=j/nz,x=(u-.5)*w;
      const shore=1.5*Math.sin(x*.23)+.84*Math.cos(x*.52);
      const edge=Math.pow(Math.sin(PI*u),.48);
      const ridge=.68+.23*Math.sin(u*TAU*2.32+index)+.17*Math.cos(u*TAU*3.8)+.09*Math.sin(u*TAU*8.3);
      const broad=Math.pow(Math.max(0,Math.sin(v*PI)),.78);
      const y=H*edge*broad*ridge + edge*broad*(.32*Math.sin(x*1.3+v*15)+.25*Math.sin(v*32+x*.4))-.65;
      vs.push(cx+x,y,cz+(v-.5)*d+shore);uv.push(u,v);
      const t=.25+.21*Math.sin(u*116+v*16)+.18*Math.cos(u*84-v*15)+.20*(y/H)+rand()*.14;
      const c=ca.clone().lerp(cb,t);cs.push(c.r,c.g,c.b);
      const a=j*(nx+1)+i;if(i<nx&&j<nz)ids.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);
    }
    mesh(world,geo(vs,ids,uv,cs),land);
  }
  hills(-23,-105,222,36,22,0);hills(33,-83,145,28,16,1);hills(-41,-64,93,23,11,2);
  hills(29,-53,44,19,9,2);hills(-30,-34,23,13,4.3,2);
  const ig=new T.IcosahedronGeometry(1,1);
  function pine(p,x,y,z,height,s=.9){
    const a=group(p,x,y,z),skew=(rand()-.5)*.5;
    beam(a,[0,0,0],[skew,height*.78,.1],height*.045,height*.022,M.tree);
    for(let j=0;j<7;j++){
      const ang=rand()*TAU,l=height*(.09+.17*rand())*(1-j*.085);
      const dx=skew+Math.cos(ang)*l,dz=Math.sin(ang)*l,yy=height*(.49+j*.067);
      beam(a,[skew*.7,yy-.27,0],[dx,yy,dz],.045,.021,M.tree);
      const o=mesh(a,ig,[M.leaf,M.leaf2,M.leaf3][j%3],dx,yy+.13,dz);
      o.scale.set(height*(.19+.075*rand())*s,height*(.085+.035*rand()),height*(.18+.09*rand())*s);o.rotation.y=ang;
    }
  }
  // Low coastal houses. The roof is a pitched slab and parallel ceramic rolls.
  function house(p,x,y,z,w,h,d,angle,style){
    const a=group(p,x,y,z);a.rotation.y=angle;
    box(a,0,.12,0,w+.14,.24,d+.12,M.stone);
    box(a,0,h*.51,0,w,h,d,style%3===1?M.siding:M.wall);
    const roofH=w*.31,edge=w*.5+.32,depth=d+.65;
    const g=geo([-w/2,h,d/2,w/2,h,d/2,0,h+roofH,d/2,-w/2,h,-d/2,w/2,h,-d/2,0,h+roofH,-d/2],[0,1,2,3,5,4]);
    M.wall.side=T.DoubleSide;mesh(a,g,M.wall);
    for(const side of [-1,1]){
      const slope=Math.hypot(edge,roofH+.13),ang=-side*Math.atan2(roofH+.13,edge);
      const roof=box(a,side*edge*.5,h+roofH*.5-.02,0,slope,.14,depth,M.slate);roof.rotation.z=ang;
      for(let j=0;j<=Math.ceil(depth/.20);j++){
        const zz=depth*(j/Math.ceil(depth/.20)-.5);
        beam(a,[0,h+roofH+.08,zz],[side*edge,h-.04,zz],.056,.067,j%4===0?M.tile:M.slate2);
      }
      for(let j=1;j<7;j++){const t=j/7;box(a,side*edge*t,h+roofH+.076-(roofH+.12)*t,0,.058,.041,depth,M.slate2);}
      beam(a,[side*edge,h-.095,-depth/2],[side*edge,h-.095,depth/2],.085,.085,M.timber);
    }
    beam(a,[0,h+roofH+.10,-depth/2-.12],[0,h+roofH+.10,depth/2+.12],.126,.126,M.tile);
    for(const s of [-1,1])for(const xx of [-1,1])box(a,xx*(w*.5-.062),h*.5,s*d*.5,.115,h,.10,M.timber);
    for(const yy of [.33,h*.62,h-.13])box(a,0,yy,d*.5+.041,w,.097,.085,M.timber);
    function window(xx,yy,zz,ww,hh){
      box(a,xx,yy,zz,ww+.13,hh+.14,.105,M.timber);
      box(a,xx,yy,zz+.062,ww,hh,.058,M.glass);
      for(let j=1;j<4;j++)box(a,xx+ww*(j/4-.5),yy,zz+.103,.036,hh,.035,M.wood3);
      box(a,xx,yy+.014,zz+.113,ww,.037,.04,M.wood3);
      box(a,xx,yy-hh*.5-.08,zz+.1,ww+.21,.065,.17,M.wood3);
    }
    window(-w*.205,h*.70,d*.5+.06,w*.36,h*.34);window(w*.22,h*.70,d*.5+.06,w*.31,h*.34);
    box(a,-w*.20,h*.245,d*.5+.055,w*.3,h*.48,.095,M.timber);
    for(let k=0;k<6;k++)box(a,-w*.33+k*w*.053,h*.252,d*.5+.11,.029,h*.44,.027,M.wood3);
    window(w*.237,h*.28,d*.5+.072,w*.28,h*.32);
    for(const s of [-1,1]) {
      for(let k=0;k<2;k++){box(a,s*(w*.5+.035),h*.59,(k-.5)*d*.47,.082,h*.46,d*.32,M.timber);
        box(a,s*(w*.5+.09),h*.59,(k-.5)*d*.47,.044,h*.4,d*.27,M.glass);
        box(a,s*(w*.5+.12),h*.59,(k-.5)*d*.47,.035,h*.4,.043,M.timber);}
    }
    const aw=box(a,0,h*.49,d*.5+.36,w+.13,.077,.85,style%4===0?M.red:M.slate2);aw.rotation.x=.13;
    if(style%2===0){for(let j=0;j<4;j++)box(a,-w*.34+j*w*.09,h*.421,d*.5+.71,w*.085,.29,.048,M.hull);}
    return a;
  }
  masonry(world,14.1,-17.2,11.8,2.82,34.7);masonry(world,13.2,-39,11,3.08,17);
  // A landing parallel to the quay, with chafing tyres, ladders and stone steps.
  for(let i=0;i<6;i++){
    const zz=-6-i*4.3;const tyre=ring(world,8.13,.73,zz,.33,.115,M.rubber);tyre.rotation.y=PI/2;
    line(world,[[8.28,1.39,zz-.2],[8.12,1.19,zz],[8.1,.91,zz]],.027,M.rope);
  }
  for(let i=0;i<7;i++)box(world,7.30,1.25-i*.202,-8.1+i*.39,1.7,.24,.48,M.stone2);
  const specs=[[11.44,-6.8,3.65,3.22,3.9,-1.20,0],[11.69,-12.4,4.25,3.4,4.21,-1.44,1],
    [11.52,-18.2,3.74,4.25,3.55,-1.39,2],[11.77,-23.5,4.04,3.48,4.24,-1.45,3],
    [11.48,-29.4,4.22,4.05,3.53,-1.40,4],[11.13,-36.3,4.05,3.13,3.8,-1.32,5]];
  for(const [x,z,w,h,d,r,s] of specs)house(world,x,1.39,z,w,h,d,r,s);
  for(let i=0;i<7;i++){const z=-5.1-i*5.29;house(world,16.6,1.53,z,3.7,4.1+rand()*1.5,4.0,-1.3,i);}
  for(let i=0;i<8;i++){const x=7.6+i*2.95;house(world,x,1.05,-48-i*.32,2.35+rand(),2.24+rand(),2.4,rand()*.55,i);}
  for(let i=0;i<23;i++)pine(world,15.1+rand()*5,1.4,-4-rand()*43,3.1+rand()*4.2);
  for(let i=0;i<17;i++)pine(world,-36+rand()*14,.8+rand()*.7,-30-rand()*5.4,2.3+rand()*2.6);
  for(let i=0;i<12;i++)pine(world,5+rand()*25,1.2+rand()*1.6,-49-rand()*4,2.2+rand()*2.3);
  for(let i=0;i<3;i++){
    const x=9.18+i*.04,z=-4-i*12.6;
    cyl(world,x,4.77,z,.083,.15,6.85,M.timber);
    box(world,x,7.72,z,1.41,.11,.10,M.timber);
    for(let j=0;j<3;j++){
      const xx=x-.53+j*.51;cyl(world,xx,7.84,z,.065,.058,.19,M.cream);
      if(i<2)line(world,[[xx,7.94,z],[xx+.018,7.18,z-6],[xx+.04,7.94,z-12.6]],.013,M.dark,false,12);
    }
  }
  function arch(){
    const p=group(world,-.8,0,-19.3),span=4.5,H=3.75,D=2.15,steps=34;
    // Stone spandrels leave an actual navigable opening.
    const vs=[],ids=[],uv=[];
    for(const side of [-1,1]){
      const base=vs.length/3;
      for(let j=0;j<=steps;j++){const u=j/steps,ang=PI*(1-u),x=span*Math.cos(ang),low=.16+2.94*Math.sin(ang);
        vs.push(x,low,side*D*.5,x,H,side*D*.5);uv.push(u,0,u,1);
        if(j<steps){const k=base+j*2;ids.push(k,k+1,k+2,k+2,k+1,k+3);}
      }
    }
    M.stone.side=T.DoubleSide;mesh(p,geo(vs,ids,uv),M.stone);
    for(let j=0;j<25;j++){
      const a=PI*j/25+.004,b=PI*(j+1)/25-.004,points=[],ii=[];
      for(const z of [-D*.5-.043,D*.5+.043])for(const R of [0,.30])for(const angle of [a,b])
        points.push((span+R)*Math.cos(angle),.16+(2.94+R)*Math.sin(angle),z);
      for(const q of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])ii.push(q[0],q[1],q[2],q[0],q[2],q[3]);
      const m=j%4?M.stone2:M.concrete;m.side=T.DoubleSide;mesh(p,geo(points,ii),m);
    }
    for(const s of [-1,1]){
      masonry(p,s*(span+1.3),0,2.6,H+1.49,D);
      const hinge=group(scene,-.8+s*span,0,-19.3);
      const leaf=group(hinge,-s*span*.48,.25,0);
      for(let i=0;i<4;i++)box(leaf,0,i*.215,0,span*.95,.184,.12,M.wet);
      for(const xx of [-1,0,1])box(leaf,xx*span*.40,.32,.09,.13,1.03,.12,M.iron);
      batch(hinge);gates.push(hinge);
    }
    box(p,0,H+.045,0,span*2+5.6,.19,D+.43,M.concrete);
    for(const z of [-D*.5,D*.5]){
      for(let j=0;j<13;j++){const xx=-6.86+j*1.145;box(p,xx,H+.49,z,.19,.84,.23,M.stone2);
        box(p,xx,H+.94,z,.25,.10,.28,M.concrete);}
      box(p,0,H+.77,z,13.85,.12,.16,M.slate2);box(p,0,H+.46,z,13.85,.086,.116,M.zinc);
    }
  }
  arch();
  masonry(world,7.28,-24.6,3.05,2.72,6.3);
  house(world,7.28,1.28,-24.7,3.00,2.86,3.55,-.44,1);
  pine(world,6.5,1.3,-27.1,4.2);
  // The breakwater and painted harbour light give a distinct outer coastline.
  masonry(world,-15.45,-22.2,15.5,2.28,2.9);
  function lighthouse(p,x,y,z){
    const a=group(p,x,y,z);
    cyl(a,0,.18,0,.82,.96,.36,M.concrete,24);cyl(a,0,1.61,0,.40,.59,2.6,M.red,24);
    cyl(a,0,.85,0,.551,.576,.42,M.cream,24);
    cyl(a,0,2.99,0,.69,.53,.17,M.red,24);cyl(a,0,3.28,0,.32,.35,.46,M.glass,16);
    cyl(a,0,3.20,0,.19,.22,.23,M.lamp,16);cyl(a,0,3.58,0,.12,.48,.22,M.red,24);
    cyl(a,0,3.76,0,.034,.049,.24,M.brass);
    for(let i=0;i<12;i++){const ang=i*TAU/12;beam(a,[Math.cos(ang)*.60,3.01,Math.sin(ang)*.60],[Math.cos(ang)*.60,3.37,Math.sin(ang)*.60],.019,.019,M.cream);}
    ring(a,0,3.37,0,.60,.026,M.cream,true);box(a,0,1.05,.52,.32,.77,.04,M.red);
    box(a,.18,1,.55,.05,.06,.04,M.brass);
  }
  lighthouse(world,-8.76,.84,-22.0);
  for(let i=0;i<24;i++){
    const r=mesh(world,ig,M.stone3,-10-rand()*12,-.02+rand()*.34,-19.9+rand()*.5);
    r.scale.set(.52+rand()*.34,.52,.67);r.rotation.set(rand(),rand(),rand());
  }
  const landing=dock(world,5.36,.68,7.83,2.35,.84);landing.rotation.y=-.22;
  lantern(landing,-.85,.927,3.45);coil(landing,-.25,.947,2.88,.39,4);
  for(const z of [1.4,3.05]){
    cyl(landing,.80,1.02,z,.095,.105,.20,M.iron);
    const cleat=cyl(landing,.80,1.138,z,.055,.055,.38,M.zinc);cleat.rotation.x=PI/2;
  }
  // A fixed wharf connects the landing with the shore at its far end.
  dock(world,7.9,-2.66,1.45,3.2,.84);
  dock(world,5.48,-32.91,8.6,2.05,1.49);
  dock(world,7.3,-36.2,1.92,2.6,1.49);

  for(const zz of [-1.74,-.10]){
    beam(world,[4.48,.83,zz],[3.79,.05,zz],.076,.083,M.wet,true);
    line(world,[[4.56,1.29,zz],[4.15,.93,zz],[3.96,.83,zz]],.032,M.rope);
  }
  // Brass receiving bell and a real pivot.
  beam(world,[4.53,.9,-.99],[4.53,2.44,-.99],.073,.066,M.timber,true);
  beam(world,[4.53,2.38,-.99],[4.09,2.38,-.99],.071,.071,M.wood,true);
  bell.position.set(4.12,2.35,-.99);
  line(bell,[[0,0,0],[0,-.10,0],[0,-.14,0]],.022,M.brass);
  const profile=[[.024,-.115],[.105,-.15],[.11,-.24],[.137,-.32],[.194,-.384],[.199,-.406],[.172,-.411],[.096,-.299]];
  mesh(bell,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),28),M.brass);
  oval(bell,0,-.40,0,.045,.058,.045,M.iron);batch(bell);
  for(let i=0;i<15;i++){
    const x=8.78+rand()*.74,z=-6-rand()*25;
    if(i%3===0){const cr=crate(world,.64,.52,.66);cr.position.set(x,1.56,z);cr.rotation.y=rand()*.7;}
    else{box(world,x,1.52,z,.62,.24,.48,i%2?M.green:M.blue);
      box(world,x,1.66,z,.66,.052,.52,M.blue);box(world,x,1.697,z,.53,.026,.39,M.dark);}
  }
  for(const z of [-30,-33.5]){
    const boat=fisher(world,1);boat.scale.setScalar(.60);boat.rotation.y=.91;boat.position.set(-10.9,0,z);
  }
  // Small loading derrick at the inner quay.
  const crane=group(world,6.08,1.58,-31.50);
  cyl(crane,0,.13,0,.48,.59,.26,M.iron);cyl(crane,0,1.41,0,.16,.20,2.41,M.green);
  beam(crane,[0,2.02,0],[-2.91,3.54,-.8],.14,.14,M.green,true);
  beam(crane,[0,3.29,0],[-2.89,3.55,-.8],.023,.023,M.tar);
  cyl(crane,0,2.89,0,.10,.11,.91,M.green);ring(crane,-2.88,3.54,-.80,.12,.033,M.brass);
  const innerCargo=group(scene,3.2,0,-32.3);
  const load=crate(innerCargo,.84,.7,.90);load.position.y=-.04;
  for(const s of [-1,1])line(innerCargo,[[s*.39,.47,0],[s*.25,.80,0],[0,1.06,0]],.024,M.rope);
  batch(innerCargo);
  const cable=cyl(scene,3.2,3,-32.3,.015,.015,1,M.tar,7);
  batch(world);return {world,gates,bell,innerCargo,cable};
};
