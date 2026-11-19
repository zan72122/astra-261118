function buildSubjects(scene,garden){
  const {T,tau,v,rnd,mat,physical,mesh,group,ball,cube,stick,line,lathe,torus,surface,boards,beam,bamboo,rope,iron,brass,glaze,paperTexture,robe,silk,collar,pack}=Art;
  const warmCord=mat(0xa95742), darkCord=mat(0x425854), skyCord=mat(0x727c8d);
  const marks=mat(0xceb997), cords=[warmCord,darkCord,skyCord], bells=[], anchors=[];
  const shellProfiles=[
    [[.279,0],[.29,.009],[.296,.025],[.296,.042],[.308,.09],[.317,.16],[.314,.22],[.30,.285],[.267,.351],[.226,.395],[.168,.432],[.098,.455],[.03,.462],[.012,.461]],
    [[.266,0],[.276,.008],[.274,.03],[.249,.041],[.24,.061],[.238,.092],[.224,.15],[.198,.207],[.16,.251],[.116,.283],[.065,.307],[.012,.313]],
    [[.207,0],[.226,.011],[.233,.029],[.227,.049],[.226,.075],[.241,.144],[.244,.195],[.229,.259],[.199,.305],[.15,.341],[.089,.36],[.033,.37],[.009,.369]]
  ];
  const lengths=[.34,.49,.37], profiles=shellProfiles;
  for(let k=0;k<3;k++){
    const mount=group(scene,0,2.908,[.63,.03,-.37][k]);garden.place(mount,[-1.08,.35,1.46][k],[-.48,.07,.53][k]);
    const fixed=group(mount);const suspension=lengths[k],height=profiles[k].at(-1)[1];
    // A small screw eye, doubled hanging thread and whipped binding at the neck.
    torus(fixed,0,-.025,0,.03,.006,brass,true);stick(fixed,[0,-.005,0],[0,.052,0],.009,brass);
    for(const sign of [-1,1])line(fixed,[[sign*.012,-.037,0],[sign*.025,-suspension*.45,.003],[sign*.009,-suspension+.013,0]],.0042,cords[k],6);
    const pivot=group(mount,0,-suspension,0),shell=group(pivot,0,-height,0);
    torus(pivot,0,.017,0,.031,.008,cords[k],true);
    for(let n=0;n<4;n++)torus(pivot,0,.029+n*.009,0,.013,.0035,cords[k]);
    let m;
    if(k===0)m=physical(0xe4fff8,{roughness:.065,transmission:.97,thickness:.028,ior:1.47,clearcoat:1,clearcoatRoughness:.055,envMapIntensity:1.12,side:T.DoubleSide});
    else if(k===1)m=iron;
    else m=physical(0xffffff,{map:glaze(2),roughness:.235,clearcoat:.74,side:T.DoubleSide});
    const body=lathe(shell,profiles[k],m,80);
    const uv=body.geometry.attributes.uv,pos=body.geometry.attributes.position;
    for(let i=0;i<uv.count;i++)uv.setY(i,pos.getY(i)/height);
    body.castShadow=k!==0;
    if(k===0){
      const paint=mat(0xffffff,{map:glaze(0),transparent:true,alphaTest:.05,depthWrite:false,roughness:.25,side:T.FrontSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-1});
      const decal=mesh(shell,body.geometry,paint);decal.scale.set(1.005,1.001,1.005);decal.castShadow=false;
      const edge=physical(0xb1dbd2,{metalness:.21,roughness:.12,transparent:true,opacity:.72});
      torus(shell,0,.012,0,.289,.009,edge);torus(shell,0,.447,0,.109,.005,edge);
    }
    if(k===1){
      const stud=new T.SphereGeometry(1,9,6);
      const raised=physical(0x52665b,{roughness:.47,metalness:.69});
      for(let j=0;j<4;j++){
        const r=[.227,.213,.191,.162][j];
        for(let n=0;n<24-j*2;n++){let a=(n+(j%2)*.5)/(24-j*2)*tau;ball(shell,r*Math.sin(a),.124+j*.043,r*Math.cos(a),.011,.013,.011,raised).geometry=stud;}
      }
      for(const [y,r] of [[.035,.252],[.057,.24],[.083,.24],[.286,.11]])torus(shell,0,y,0,r,.0055,raised);
      torus(pivot,0,.022,0,.046,.012,iron,true);pack(shell);
    }
    if(k===2){const blue=physical(0x36597a,{roughness:.26});torus(shell,0,.021,0,.228,.005,blue);torus(shell,0,.353,0,.11,.005,blue);}
    const tongue=group(pivot,0,-.035,0), stemLen=height+.072;
    stick(tongue,[0,.0,0],[0,-stemLen,0],.0045,cords[k]);ball(tongue,0,-height+.047,0,[.086,.093,.072][k],.046,[.086,.093,.072][k],k===1?iron:k===2?m:brass);
    const tag=group(tongue,0,-stemLen,0), tagLen=[.669,.554,.606][k], tw=[.146,.127,.139][k];
    const geom=new T.PlaneGeometry(tw,tagLen,4,16);geom.translate(0,-tagLen*.5,0);
    const paper=mesh(tag,geom,mat(0xffffff,{map:paperTexture(k),side:T.DoubleSide,roughness:.85}));paper.rotation.y=[-.13,.26,-.19][k];
    torus(tag,0,-.032,.002,.011,.0022,brass,true);
    for(let n=0;n<3;n++)torus(tongue,0,-stemLen+.009*n,0,.009,.003,cords[k]);
    anchors[k]=group(tag,0,-tagLen*.40,0);bells.push({mount,pivot,tongue,tag,paper,rest:geom.attributes.position.array.slice(),shell,body});
  }
  // Cross sections give the seated child's garments volume and folds.
  function garment(p,rings,m,fold=.018){
    const N=52,pts=[],uv=[],ix=[];
    for(let j=0;j<rings.length;j++){
      const [y,w,d,z]=rings[j];
      for(let i=0;i<=N;i++){let a=i*tau/N, corr=1+fold*(Math.sin(a*9+.4*j)+.58*Math.cos(5*a));
        pts.push([w*corr*Math.sin(a),y,d*corr*Math.cos(a)+(z||0)]);uv.push([i/N*2.4,j/(rings.length-1)*1.55]);
        if(j&&i){let n=j*(N+1)+i;ix.push(n-N-2,n-N-1,n,n-N-2,n,n-1);}
      }
    }return surface(p,pts,ix,m,uv);
  }
  const girl=group(scene,-1.33,.293,-.19);garden.place(girl,-1.29,-.47);girl.rotation.y=-.32;
  const cushion=mat(0xbba582),edgeSeam=mat(0x927f63);
  ball(girl,0,.042,.035,.369,.061,.286,cushion);
  const seam=[];for(let i=0;i<=40;i++){const a=i*tau/40;seam.push([.355*Math.cos(a),.046,.035+.279*Math.sin(a)]);}line(girl,seam,.004,edgeSeam);
  const skin=physical(0xdeaa88,{roughness:.66}),hair=physical(0x352c29,{roughness:.46,clearcoat:.16}),lock=physical(0x45372f,{roughness:.43}),shine=mat(0x514034);
  // Feet hang over the edge, with bare heels visible beneath the hem.
  for(const sign of [-1,1]){
    ball(girl,.12*sign,.03,-.29,.077,.114,.077,skin).rotation.x=.20;
    ball(girl,.12*sign,-.07,-.348,.071,.064,.114,skin);
  }
  garment(girl,[[.058,.24,.18,-.10],[.08,.295,.273,-.093],[.136,.32,.292,-.088],[.226,.29,.22,-.057],[.307,.199,.15,-.007],[.37,.177,.141,.01]],robe,.046);
  garment(girl,[[.20,.22,.172],[.32,.20,.138],[.45,.167,.128],[.58,.205,.138],[.65,.221,.14,-.012],[.69,.17,.118,-.015],[.722,.083,.069,-.009]],robe);
  for(const sign of [-1,1]){
    const sleeve=group(girl,.189*sign,.557,-.046);sleeve.rotation.z=sign*.31;sleeve.rotation.x=-.27;
    garment(sleeve,[[-.23,.114,.127,-.04],[-.16,.12,.145,-.05],[-.03,.12,.112],[.07,.095,.092],[.11,.045,.055]],robe,.036);
    ball(girl,.23*sign,.322,-.22,.055,.048,.081,skin);
  }
  garment(girl,[[.291,.206,.152,.011],[.308,.211,.155,.011],[.395,.191,.15,.012],[.447,.185,.143,.011]],silk,.019);
  const sash=mat(0xa65956),sashLight=mat(0xd9917e);
  for(let j=0;j<4;j++){
    const pts=[];for(let i=0;i<=32;i++){const a=i*tau/32;pts.push([(.207-.006*j)*Math.sin(a),.307+j*.038+.004*Math.sin(a*3+j),.012+(.154-j*.002)*Math.cos(a)]);}line(girl,pts,.0045,j%2?sashLight:sash);
  }
  for(let s of [-1,1]){
    const wing=ball(girl,s*.105,.406,.185,.13,.085,.074,silk);wing.rotation.z=s*.46;
    const o=ball(girl,s*.103,.397,.245,.077,.035,.015,sash);o.rotation.z=s*.43;
    line(girl,[[s*.02,.40,.256],[s*.09,.445,.25],[s*.181,.45,.21]],.005,sashLight);
  }
  ball(girl,0,.401,.239,.055,.066,.044,sashLight);
  const head=group(girl,0,.692,-.015);ball(head,0,.049,0,.084,.114,.079,skin);
  // Kimono collar lies across the nape, and wraps around both shoulders.
  line(girl,[[-.174,.669,-.062],[-.094,.701,.023],[0,.662,.107],[.105,.703,.013],[.166,.667,-.074]],.024,collar,10);
  line(girl,[[-.174,.656,-.058],[-.10,.684,.031],[0,.64,.116],[.109,.686,.025],[.169,.653,-.069]],.013,mat(0x708d9d),8);
  ball(head,0,.235,-.034,.189,.214,.168,skin);ball(head,.011,.208,-.176,.056,.065,.038,skin);
  for(let s of [-1,1]){ball(head,.181*s,.205,-.012,.038,.05,.028,skin);ball(head,.201*s,.208,-.006,.016,.026,.021,mat(0xc88e76));}
  ball(head,0,.28,.006,.203,.213,.179,hair);
  ball(head,0,.241,.057,.189,.162,.147,hair);
  // Combed hair follows the skull toward a gathered knot.
  for(let i=0;i<58;i++){
    const a=(i/58-.5)*Math.PI*1.46,points=[];
    for(let j=0;j<9;j++){
      const t=j/8,elev=-.65+t*2.03,az=a*(1-.41*t)+.12*t;
      points.push([.201*Math.cos(elev)*Math.sin(az)-.025*t*t,.27+.208*Math.sin(elev),.022+.183*Math.cos(elev)*Math.cos(az)+.041*(1-t)]);
    }
    line(head,points,i%4===0?.005:.0027,i%5===0?shine:lock,4,16);
  }
  ball(head,-.031,.464,.023,.114,.104,.11,hair);
  for(let i=0;i<14;i++){const a=i*tau/14,pts=[];for(let j=0;j<=10;j++){const b=-1.16+j*.235;pts.push([-.031+.112*Math.cos(b)*Math.sin(a+.58*b),.46+.099*Math.sin(b),.024+.113*Math.cos(b)*Math.cos(a+.58*b)]);}line(head,pts,.005,lock,5,14);}
  const tie=torus(head,-.029,.423,.026,.086,.012,silk);tie.scale.z=.9;
  stick(head,[-.181,.408,.016],[.102,.518,.036],.008,brass);
  for(let i=0;i<5;i++){const a=i*tau/5;ball(head,-.131+Math.cos(a)*.029,.447+Math.sin(a)*.029,.074,.024,.024,.012,sashLight);}
  ball(head,-.131,.447,.087,.014,.014,.010,brass);
  head.removeFromParent();pack(girl);girl.add(head);pack(head); // Keep the neck joint movable.
  const laundry=group(scene,-1.75,-.14,-3.95);garden.place(laundry,-1.75,-.61);
  const support=group(laundry);
  for(let x of [-.86,.90]){
    stick(support,[x,0,.12],[x,1.69,0],.033,bamboo,.025);stick(support,[x,0,-.26],[x,1.39,.014],.027,bamboo,.023);
    torus(support,x,1.52,.013,.038,.009,rope);
  }
  stick(support,[-1.04,1.62,0],[1.07,1.62,0],.024,bamboo,.023,14);pack(support);
  const patches=[],linen=Art.canvas(128,128,(c,w,h)=>{c.fillStyle='#f1ede1';c.fillRect(0,0,w,h);for(let i=0;i<128;i+=2){c.fillStyle='rgba(108,137,147,.10)';c.fillRect(i,0,1,h);c.fillRect(0,i,w,1);}});
  for(let k=0;k<4;k++){
    const curtain=k===3, width=curtain?.50:[.46,.39,.385][k],len=curtain?1.46:[.79,.62,.74][k],p=curtain?group(scene,2.53,2.903,.04):group(laundry,-.60+k*.54,1.608,.033);
    if(curtain)garden.place(p,2.48,.95);
    const geo=new T.PlaneGeometry(width,len,12,18);geo.translate(0,-len*.5,0);
    geo.setAttribute("color",new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*3).fill(1),3));
    const tex=linen.clone();tex.needsUpdate=true;tex.repeat.set(2,3);
    const cloth=mesh(p,geo,mat(curtain?0xfff7e9:[0xf3f7ef,0xe1ece8,0xe5ecee][k],{map:tex,side:T.DoubleSide,roughness:.99,vertexColors:true}));
    patches.push({p,cloth,rest:geo.attributes.position.array.slice(),len,width});
    if(!curtain){
      for(let s of [-1,1]){cube(laundry,p.position.x+width*.36*s,1.625,.053,.017,.078,.022,boards[2]).rotation.x=-.12;}
    }
  }
  anchors[3]=group(laundry,0,1.22,.10);anchors[4]=group(garden.vine,0,.97,.1);anchors[5]=group(scene,0,2.7,-13);
  return {bells,girl,head,laundry,patches,anchors};
}
