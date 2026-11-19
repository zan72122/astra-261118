function buildToys(scene,garden,subjects){
  const {T,tau,rnd,canvas,mat,physical,mesh,group,ball,cube,stick,line,lathe,torus,surface,bamboo,rope,brass,boards,pack}=Art;
  const basin=group(scene,1.38,-.14,-.97);garden.place(basin,1.38,.54);
  const granite=canvas(192,192,(c,w,h)=>{c.fillStyle='#939389';c.fillRect(0,0,w,h);
    for(let i=0;i<18000;i++){c.fillStyle=rnd()<.55?'rgba(54,59,52,.24)':'rgba(246,241,211,.32)';c.fillRect(rnd()*w,rnd()*h,1+rnd()*3,1+rnd()*1.7);}});
  const mineral=mat(0xb2b2a0,{map:granite,roughness:.88,side:T.DoubleSide});
  const bowl=lathe(basin,[[.24,.01],[.32,.035],[.374,.13],[.395,.248],[.387,.342],[.36,.365],[.302,.361],[.285,.32],[.216,.16],[.042,.11]],mineral,84);
  const bp=bowl.geometry.attributes.position;
  for(let j=0;j<bp.count;j++){const a=Math.atan2(bp.getZ(j),bp.getX(j)),k=1+.029*Math.cos(3*a)+.013*Math.sin(7*a);bp.setX(j,bp.getX(j)*k);bp.setZ(j,bp.getZ(j)*k);bp.setY(j,bp.getY(j)+Math.sin(5*a)*.006);}
  bowl.geometry.computeVertexNormals();
  const wet=physical(0x638e8b,{roughness:.085,metalness:.43,clearcoat:.9,envMapIntensity:1.1});
  const pts=[[0,0,0]],idx=[];const N=60,R=12;
  for(let j=1;j<=R;j++)for(let i=0;i<N;i++){const a=i*tau/N;pts.push([Math.sin(a)*.287*j/R,0,Math.cos(a)*.287*j/R]);
    let n=1+(j-1)*N+i,next=1+(j-1)*N+(i+1)%N;
    if(j===1)idx.push(0,n,next);else idx.push(n-N,n,next,n-N,next,next-N);}
  const water=surface(basin,pts,idx,wet);water.position.y=.323;
  const petal=group(basin,0,.33,0), petalInk=mat(0xf2dccd);
  for(let i=0;i<5;i++){let a=i*tau/5;const o=ball(petal,.028*Math.sin(a),0,.028*Math.cos(a),.018,.007,.031,petalInk);o.rotation.y=a;}ball(petal,0,.005,0,.012,.007,.012,brass);
  const pipe=group(basin,-.355,0,-.18);
  stick(pipe,[0,0,0],[0,.60,0],.036,bamboo);stick(pipe,[-.044,.58,-.016],[.214,.474,.056],.043,bamboo,.037);
  ball(pipe,.214,.473,.057,.02,.029,.026,mat(0x5c6049));torus(pipe,0,.53,0,.04,.009,rope);
  const drop=ball(pipe,.212,.46,.06,.009,.014,.009,physical(0xd3ece6,{roughness:.08,metalness:.42}));
  subjects.anchors[6]=group(basin,0,.334,0);
  const wheelBase=group(scene,1.14,-.14,-1.93);garden.place(wheelBase,1.14,.43);
  const mounting=group(wheelBase);stick(mounting,[0,0,0],[.013,.99,.008],.017,bamboo,.013);
  stick(mounting,[.012,.918,-.04],[.012,.918,.101],.021,brass);
  const rotor=group(wheelBase,.012,.918,.107), bladeMats=[0x86a9a1,0xe2bc83,0xc4816d,0xcfc9ae].map(c=>mat(c,{side:T.DoubleSide}));
  for(let i=0;i<4;i++){
    const blade=group(rotor);blade.rotation.z=i*Math.PI/2;
    surface(blade,[[0,0,0],[.015,.169,-.015],[.134,.183,.032],[.125,.064,.058],[.043,.026,.067]],[0,1,2,0,2,4,4,2,3],bladeMats[i]);
    surface(blade,[[0,0,.002],[.045,.029,.068],[.125,.064,.059],[.055,.052,.027]],[0,1,3,1,2,3],mat([0x647f78,0xb79b75,0xa76f62,0xb3ae94][i],{side:T.DoubleSide}));
  }
  ball(rotor,0,0,.069,.026,.026,.019,brass);pack(rotor);
  stick(mounting,[-.19,.916,0],[.014,.916,0],.012,bamboo);
  const pulley=torus(mounting,-.17,.915,.013,.027,.008,brass,true);
  const cable=stick(wheelBase,[-.17,.45,.012],[-.17,.919,.012],.0045,rope);
  const bird=group(wheelBase,-.17,.49,0);stick(mounting,[0,.32,0],[-.17,.39,.005],.012,bamboo);
  ball(bird,0,0,0,.072,.044,.043,boards[5]);ball(bird,-.056,.037,-.004,.039,.042,.038,boards[5]);
  const beak=mesh(bird,new T.ConeGeometry(.019,.053,7),brass,-.106,.035,.0);beak.rotation.z=Math.PI/2;
  ball(bird,-.07,.046,.027,.006,.006,.006,mat(0x403e34));ball(bird,.085,.017,0,.047,.015,.018,boards[2]).rotation.z=.38;
  const wings=[];for(let s of [-1,1]){let o=ball(bird,.013,.022,s*.039,.052,.012,.064,boards[3]);wings.push(o);}
  const linkage=stick(wheelBase,[-.17,.375,0],[-.17,.495,0],.008,brass);
  subjects.anchors[7]=rotor;
  const launch=group(scene,.62,.305,.37);garden.place(launch,.62,.23);
  const plane=group(launch);plane.rotation.y=-.16;
  const pp=[[0,.02,-.22],[0,-.028,.126],[-.018,.037,.143],[.018,.037,.143],[-.162,.067,.134],[.162,.067,.134]];
  surface(plane,pp,[0,1,2,0,3,1],mat(0xccc4aa,{side:T.DoubleSide}));
  surface(plane,pp,[0,2,4,0,5,3],mat(0xf6ecd1,{side:T.DoubleSide}));
  line(plane,[[0,.021,-.218],[-.008,.035,-.045],[-.019,.039,.14]],.0016,mat(0xbcac8f),4);
  pack(plane);subjects.anchors[8]=plane;
  return {basin,water,petal,pipe,drop,wheelBase,rotor,bird,wings,cable,linkage,launch,plane};
}
