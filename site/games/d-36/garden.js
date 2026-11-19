function buildGarden(scene) {
  const {T,tau,v,rnd,canvas,mat,mesh,group,ball,cube,stick,line,lathe,torus,surface,wood,boards,beam,bamboo,rope,stone,pack}=Art;
  const still=group(scene), fixes=[], leaves=[], blossoms=[];
  function place(o,wide,thin){fixes.push(f=>{o.position.x=thin+(wide-thin)*f;});}
  const skyUniform={value:0};
  // A view-independent gradient on a real sky dome doubles as the reflection sky.
  const skyMat=mat(0xffffff,{side:T.BackSide,depthWrite:false,fog:false});
  skyMat.onBeforeCompile=s=>{
    s.uniforms.dusk=skyUniform;
    s.vertexShader='varying vec3 skyDir;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n skyDir=position;');
    s.fragmentShader='varying vec3 skyDir;uniform float dusk;\n'+s.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 D=normalize(skyDir);float u=clamp(D.y*2.55,0.0,1.0);
      vec3 day=mix(vec3(.85,.91,.80),vec3(.075,.36,.65),pow(u,.47));
      vec3 eve=mix(vec3(.99,.405,.235),vec3(.105,.145,.295),pow(u,.44));
      float halo=pow(max(0.,dot(D,normalize(vec3(-.46,.16,-1.)))),28.);
      outgoingLight=mix(day,eve,dusk)+halo*mix(vec3(.24,.17,.08),vec3(.48,.21,.075),dusk);
      #include <opaque_fragment>`);
  };
  const sky=mesh(scene,new T.SphereGeometry(110,40,20),skyMat);sky.castShadow=sky.receiveShadow=false;
  const horizonMats=[];
  function ridge(z,base,amp,shade,phase){
    const pts=[],idx=[],uv=[],N=160;
    for(let i=0;i<=N;i++){
      const x=(i/N-.5)*112;
      const height=base+amp*(.43*Math.sin(x*.144+phase)+.21*Math.cos(x*.372+phase)+.09*Math.sin(x*.847-phase)+.04*Math.sin(x*2.16)+.35*Math.cos(x*.09-phase));
      for(let j=0;j<4;j++){
        const n=j/3;
        pts.push([x,height*(1-n)-.65*n+Math.sin(x*.48+phase)*n*.28,z+n*4+.65*Math.sin(x*.38+phase)]);uv.push([i/N,n]);
        if(i&&j){let a=i*4+j;idx.push(a-5,a-4,a,a-5,a,a-1);}
      }
    }
    const m=mat(shade,{side:T.DoubleSide});horizonMats.push(m);
    const o=surface(still,pts,idx,m,uv);o.castShadow=false;
  }
  ridge(-48,5.2,2.3,0x9db7b7,.4);ridge(-38,3.8,1.9,0x88a7a3,2.4);ridge(-29,2.65,1.48,0x789791,5.2);ridge(-22,1.26,1.1,0x7c937b,1.8);
  const cloudMat=mat(0xfff7e8,{roughness:1,emissive:0xcdceca,emissiveIntensity:.4});
  function cloud(x,y,z,sc,n) {
    const cl=group(still,x,y,z);cl.scale.setScalar(sc);
    for(let i=0;i<n;i++){
      const t=i/(n-1), a=Math.sin(t*Math.PI), h=.18+a*(.42+rnd()*.64);
      const o=ball(cl,(t-.5)*5.7,h*.28,rnd()*.4,.54+rnd()*.92,h,.48+rnd()*.51,cloudMat);o.castShadow=false;
    }
  }
  cloud(-10,6.5,-37,1.7,17);cloud(8.1,6.1,-35,1.42,18);cloud(3.6,4.95,-39,.66,11);cloud(-1.3,7.8,-47,.75,10);
  const groundTex=canvas(256,256,(c,w,h)=>{
    c.fillStyle='#a6aa83';c.fillRect(0,0,w,h);
    for(let i=0;i<21000;i++){const x=rnd()*w,y=rnd()*h;c.fillStyle=rnd()<.54?'rgba(71,82,54,.15)':'rgba(235,215,157,.24)';c.fillRect(x,y,1+rnd()*2,1+rnd()*3);}
  });groundTex.repeat.set(30,22);
  cube(still,0,-.255,-13,85,.18,62,mat(0xcacfb4,{map:groundTex}));
  const bark=mat(0x675f4b), twig=mat(0x80715b);
  function inst(p,geo,m,items){
    const o=new T.InstancedMesh(geo,m,items.length),tmp=new T.Object3D();
    items.forEach((a,i)=>{tmp.position.set(a[0],a[1],a[2]);tmp.scale.set(a[3],a[4],a[5]);tmp.rotation.set(a[6]||0,a[7]||0,a[8]||0);tmp.updateMatrix();o.setMatrixAt(i,tmp.matrix);if(a[9])o.setColorAt(i,a[9]);});
    o.castShadow=o.receiveShadow=true;p.add(o);return o;
  }
  const tuftGeo=new T.IcosahedronGeometry(1,1),farGeo=new T.IcosahedronGeometry(1,0);
  // Individual pointed leaves break up the outlines of the larger shaded clusters.
  const sprig=new T.BufferGeometry(),sp=[],si=[];
  for(let j=0;j<5;j++){const a=j*2.40,dx=Math.cos(a),dz=Math.sin(a),n=j*5;
    sp.push(0,0,0, .52*dx-.20*dz,.24,.52*dz+.20*dx, dx,.12,dz, .52*dx+.20*dz,.13,.52*dz-.20*dx, .48*dx,.33,.48*dz);
    si.push(n,n+1,n+4,n+1,n+2,n+4,n+2,n+3,n+4,n+3,n,n+4);}
  sprig.setAttribute('position',new T.Float32BufferAttribute(sp,3));sprig.setIndex(si);sprig.computeVertexNormals();
  function tree(x,z,size,kind){
    const p=group(scene,x,-.16,z);p.scale.setScalar(size);
    const crowns=[],small=[],tone=kind?0x738866:0x607c64;
    line(p,[[0,0,0],[.05,.8,.045],[-.10,1.54,.02],[.10,2.18,-.06],[.05,2.65,.10]],.095,bark,8);
    for(let i=0;i<16;i++){
      const az=i*2.37+.15*rnd(),rad=.34+(1-i/21)*.71, h=1.66+i*.074+rnd()*.20;
      const xx=Math.cos(az)*rad,zz=Math.sin(az)*rad, yy=h+rnd()*.25;
      line(p,[[.02,h-.85,0],[xx*.39,h-.65,zz*.36],[xx*.71,h-.18,zz*.67],[xx,yy,zz]],.028+i%3*.008,twig);
      for(let j=0;j<10;j++){
        const u=rnd()*tau,r=rnd()*.51,cx=xx+Math.cos(u)*r,cz=zz+Math.sin(u)*r,cy=yy+.09+rnd()*.25;
        crowns.push([cx,cy,cz,.22+rnd()*.29,.12+rnd()*.21,.23+rnd()*.32,rnd()*.3,u,rnd()*.34,new T.Color(tone).multiplyScalar(.69+rnd()*.57)]);
        for(let k=0;k<6;k++)small.push([cx+(rnd()-.5)*.78,cy+(rnd()-.48)*.36,cz+(rnd()-.5)*.69,.045+rnd()*.09,.018+rnd()*.035,.05+rnd()*.07,rnd(),u+rnd(),rnd(),new T.Color(kind?0x9da571:0x81976a).multiplyScalar(.68+rnd()*.55)]);
      }
    }
    pack(p);inst(p,tuftGeo,mat(0xffffff),crowns);inst(p,sprig,mat(0xffffff,{side:T.DoubleSide}),small);
  }
  tree(-4.55,-4.6,1.45,0);tree(4.3,-4.9,1.46,1);tree(-6.9,-9.7,1.04,1);tree(5.9,-10.2,1.22,0);
  const farTrees=[];
  for(let i=0;i<310;i++){const x=(rnd()-.5)*60,z=-13-rnd()*10, h=.29+rnd()*.65;farTrees.push([x,h*.52,z,.34+rnd()*.56,h,.45+rnd()*.39,0,rnd()*6,0,new T.Color().setHSL(.25+rnd()*.08,.125+rnd()*.09,.32+rnd()*.14)]);}
  inst(scene,farGeo,mat(0xffffff),farTrees);
  // Small tiled roofs in the valley, with visible ridge caps and pale plaster gables.
  const roof=mat(0x697a7f), plaster=mat(0xd8d3bc);
  function house(x,z,s){
    const p=group(still,x,-.14,z);p.scale.setScalar(s);cube(p,0,.45,0,1.74,.9,1.08,plaster);
    const pts=[[-1.1,.84,-.72],[1.1,.84,-.72],[1.1,.84,.72],[-1.1,.84,.72],[-.75,1.46,0],[.75,1.46,0]];
    surface(p,pts,[0,4,5,0,5,1,1,5,2,2,5,4,2,4,3,3,4,0],mat(0x68787c,{side:T.DoubleSide}));
    stick(p,[-.82,1.47,0],[.82,1.47,0],.045,roof);
    cube(p,0,.47,.546,.48,.55,.02,mat(0x898779));
  }
  for(let i=0;i<15;i++)house(-15+i*2.25+rnd(),-13-rnd()*4,.58+rnd()*.45);
  const fence=group(still),rail=mat(0xa18d6e,{map:wood}),ties=mat(0x5e5846);
  for(let x=-9;x<9;x+=.18){
    let h=.56+rnd()*.045;
    stick(fence,[x,-.16,-6.9],[x+.012,h,-6.9],.069,rail,.064,8);
  }
  for(const y of [.04,.38])stick(fence,[-9,y,-6.81],[9,y,-6.81],.047,bamboo);
  for(let x=-9;x<9;x+=1.65){stick(fence,[x,-.15,-6.77],[x,.73,-6.77],.083,beam);torus(fence,x,.39,-6.77,.084,.014,ties);}
  const rockColors=[0x888b7e,0x939588,0xa7a69a,0x7a837c].map(c=>mat(c));
  const rocks=Array.from({length:9},()=>{
    const g=new T.IcosahedronGeometry(1,1),p=g.attributes.position;
    for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j),n=.95+.085*Math.sin(x*8.4+y*3.1+z*9);p.setXYZ(j,x*n,Math.min(.64,y*n),z*n);}g.computeVertexNormals();return g;});
  for(let i=0;i<15;i++){
    const z=-.72-i*.405,x=-.59+Math.sin(i*.48)*.60;
    const o=mesh(still,rocks[i%9],rockColors[i%4],x,-.125,z);o.scale.set(.24+rnd()*.17,.14+rnd()*.08,.17+rnd()*.12);o.rotation.y=rnd()*tau;
  }
  const grass=[];
  for(let i=0;i<7000;i++){
    const x=(rnd()-.5)*14,z=-.42-rnd()*7.1;
    if(Math.abs(x-(-.59+Math.sin((-z-.72)/.405*.48)*.60))<.35 && rnd()<.91)continue;
    grass.push([x,-.13,z,.013+rnd()*.016,.025+rnd()*.079,.011+rnd()*.016,rnd()*.5,rnd()*tau,rnd()*.48,new T.Color().setHSL(.20+rnd()*.06,.17+rnd()*.12,.37+rnd()*.18)]);
  }
  inst(scene,new T.ConeGeometry(1,1,3),mat(0xffffff),grass);
  // Engawa. The front fascia and the board ends have a distinct finish.
  for(let i=0;i<20;i++)cube(still,0,.202,-.27+i*.264,11.5,.16,.254,boards[i%7]);
  cube(still,0,.083,-.401,11.56,.21,.092,boards[2]);
  cube(still,0,-.02,-.22,11.5,.13,.19,beam);
  const architecture=group(scene);
  cube(architecture,0,3.022,.56,11.5,.245,.30,boards[0]);
  cube(architecture,0,2.923,.59,11.48,.042,.324,beam);
  for(let i=0;i<28;i++){cube(architecture,-5.4+i*.41,3.11,1.84,.115,.155,3.5,beam);}
  for(let i=0;i<18;i++)cube(architecture,0,3.24,.0+i*.26,11.5,.11,.255,boards[(i+2)%7]);
  for(let x of [-3.05,3.13]){cube(architecture,x,1.60,.50,.178,2.7,.186,boards[1]);cube(architecture,x,.322,.50,.19,.074,.20,beam);}
  pack(architecture);
  // Morning-glory trellis and heart-shaped, reversible leaves.
  const vine=group(scene,1.76,-.15,-2.37);place(vine,1.76,.71);
  const greens=[0x667f55,0x81975d,0x739460,0x8c9b64].map(c=>mat(c,{side:T.DoubleSide}));
  const stem=mat(0x728450);
  for(let i=0;i<3;i++)stick(vine,[-.34+i*.34,0,0],[-.38+i*.36,1.67,.015],.020,bamboo,.016);
  for(let i=0;i<5;i++){stick(vine,[-.42,.22+i*.30,.005],[.43,.24+i*.30,.005],.014,bamboo);for(let j=0;j<3;j++)torus(vine,-.35+j*.35,.23+i*.30,.007,.024,.007,rope);}
  const leafPts=[[0,0,0],[-.048,.027,.006],[-.106,.006,.012],[-.115,-.058,.02],[-.074,-.118,.01],[0,-.204,0],[.069,-.12,.009],[.11,-.051,.014],[.10,.015,.008],[.05,.033,.003],[0,-.073,.032]];
  for(let i=0;i<3;i++){
    const path=[];for(let j=0;j<=45;j++){const t=j/45;path.push([-.32+i*.32+.092*Math.sin(t*11+i),.03+t*(1.36+i*.13),.05+.06*Math.cos(t*12+i)]);}
    line(vine,path,.008,stem,5,65);
  }
  for(let i=0;i<22;i++){
    const t=(i+.5)/22, x=-.31+(i%3)*.31+.11*Math.sin(t*16+i%3),y=.11+1.43*t,side=i%2?1:-1;
    const o=group(vine,x+.063*side,y,.10);
    line(vine,[[x,y+.04,.05],[x+.033*side,y+.041,.11],[o.position.x,y,.13]],.0055,stem);
    surface(o,leafPts,Array.from({length:10},(_,j)=>[10,j,(j+1)%10]).flat(),greens[i%4]);line(o,[[0,0,.003],[0,-.073,.035],[0,-.195,.005]],.0025,greens[(i+1)%4]);
    o.rotation.set(-.27-rnd()*.43,side*(.28+rnd()*.65),side*(.35+rnd()*.75));o.userData.rest=o.rotation.x;o.scale.setScalar(.72+rnd()*.43);leaves.push(o);
  }
  function flower(x,y,z,accent,s,i){
    const o=group(vine,x,y,z);o.rotation.set(1.08,i*.53-.77,i*.64);o.scale.setScalar(s);
    const N=55,pts=[],idx=[],colors=[];
    for(let j=0;j<=10;j++)for(let k=0;k<=N;k++){
      let t=j/10,a=k/N*tau,r=.018+.09*Math.pow(t,2.4);r*=1+.079*Math.cos(a*5)*t;
      pts.push([Math.cos(a)*r,.145*t+.01*Math.cos(a*5)*t*t,Math.sin(a)*r]);
      const center=new T.Color(0xfff2d7),pigment=new T.Color(accent);center.lerp(pigment,Math.min(1,t*1.37)*(1-.61*Math.pow(Math.max(0,Math.cos(5*a)),18)));colors.push(center.r,center.g,center.b);
      if(j&&k){let n=j*(N+1)+k;idx.push(n-N-2,n-1,n,n-N-2,n,n-N-1);}
    }
    const pet=surface(o,pts,idx,mat(0xffffff,{side:T.DoubleSide,vertexColors:true}));pet.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));blossoms.push(o);
  }
  [[-.27,1.38,.10,0x8789c5,1.17],[.29,1.57,.12,0x768bc1,1.04],[.14,.96,.17,0xaa83b0,1.12],[-.38,.69,.18,0x8999c8,.86],[.36,.48,.15,0x9b89bc,.94]].forEach((a,i)=>flower(...a,i));
  // Terracotta pot, low front planting and small mineral pebbles.
  const pot=lathe(vine,[[.19,0],[.21,.02],[.28,.32],[.305,.34],[.307,.38],[.276,.39],[.26,.33]],mat(0x9b7860));pot.position.y=-.02;
  ball(vine,0,.33,0,.26,.031,.26,mat(0x514e3f));
  const shrub=[];
  for(let i=0;i<1100;i++){
    let x=(rnd()-.5)*15,z=-4.9-rnd()*1.75;if(i%3===0){x=(rnd()<.5?-1:1)*(2.3+rnd()*4);z=-.8-rnd()*5;}
    shrub.push([x,.035+rnd()*.12,z,.12+rnd()*.20,.12+rnd()*.2,.12+rnd()*.22,0,rnd()*6,rnd()*.4,new T.Color().setHSL(.22+rnd()*.08,.15+rnd()*.19,.34+rnd()*.14)]);
  }
  inst(scene,farGeo,mat(0xffffff),shrub);
  pack(still);
  return {sky,skyUniform,vine,leaves,blossoms,fixes,place,architecture,cloudMat};
}
