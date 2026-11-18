const Toys = (()=>{
  const {T,PI,TAU,M,group,mesh,box,cyl,sphere,ring,rod,tube,mat,route,slab,inlay,extrude,arch,flag,rnd,texture,texCanvas}=Art;
  const cream=M.ivory, paint=[M.red,M.yellow,M.blue,M.teal,M.coral];
  const anchors=[], clickable=[];
  function target(o,name,stage,minor=false){o.userData.hit={name,stage,minor};clickable.push(o);if(!minor)anchors.push({name,stage,o});return o;}
  function matPad(p,tint=M.rug){
    slab(p,13.75,.061,8.35,1.07,tint,0,.012,.05);
    const border=group(p,0,0,.05);
    inlay(border,13.48,8.08,.96,M.birch,.055,.055);inlay(border,13.26,7.86,.88,M.ivory,.057,.023);
    // A woven running stitch around the binding.
    const stitch=mat('#c8c8aa','cloth',.94);
    for(let i=0;i<42;i++)for(const side of [-1,1])box(border,.115,.008,.030,stitch,(i-20.5)*.273,.060,side*3.81,.003);
    for(let j=0;j<8;j++)for(const side of [-1,1]){
      const x=side*6.60,z=(j-3.5)*.71;
      for(let k=-1;k<=1;k++){const o=box(border,.065,.009,.23,stitch,x-k*.086*side,.063,z+k*.067,.003);o.rotation.y=side*.68;}
    }
  }
  const dz = t=>-1.60-.68*Math.sin(Math.PI*t)+.17*t;
  const top=1.61;
  function back(t){return [-5.98+t*6.88,top,dz(t)];}
  function ramp(t){return [.70+3.99*Math.sin(t*PI*.51),top-.678*t-.026*Math.sin(PI*t),-1.45+2.62*t*t];}
  function road(t){return [1.95-6.16*t,1.17-.76*t,1.17+1.64*t+.36*Math.sin(t*PI)];}
  function placeOn(o,fn,t,y=0){const c=fn(t),n=fn(Math.min(1,t+.002)),a=fn(Math.max(0,t-.002));o.position.set(c[0],c[1]+y,c[2]);o.rotation.y=-Math.atan2(n[2]-a[2],n[0]-a[0]);}
  function bolt(p,x,y,z,r=.07){const b=cyl(p,r,r,.032,M.brass,x,y,z);b.rotation.x=PI/2;const slot=box(p,r*.91,.015,.012,M.dark,x,y,z+.018,.004);slot.rotation.z=-.68;return b;}
  function block(p,w,h,d,m,x,y,z,angle=0){
    const g=group(p,x,y,z);g.rotation.y=angle;box(g,w,h,d,m,0,h/2,0,.065);return g;
  }
  function bridge(p,x,y,z,w,h,d,m){
    const g=group(p,x,y,z);arch(g,0,0,0,w,h,d,m);
    for(const sign of [-1,1]){bolt(g,sign*(w/2-.19),h-.18,d/2+.04,.055);}
    return g;
  }
  function swirledBall(p,r,colors) {
    const c=texCanvas(512,256),g=c.getContext('2d');
    g.fillStyle=colors[0];g.fillRect(0,0,512,256);
    for(let i=-2;i<4;i++){
      for(const [off,w,col] of [[0,21,colors[1]],[27,9,colors[2]],[41,3,colors[1]]]){
        g.beginPath();for(let x=-2;x<=514;x+=2){const y=72+i*115+off+39*Math.sin(x/512*TAU+.75)+13*Math.sin(x/512*TAU*2-.35);if(x===-2)g.moveTo(x,y);else g.lineTo(x,y);}
        g.strokeStyle=col;g.lineWidth=w;g.stroke();
      }
    }
    const m=new T.MeshPhysicalMaterial({map:texture(c),roughness:.135,roughnessMap:M.glass.roughnessMap,metalness:.12,clearcoat:1,clearcoatRoughness:.08});
    return sphere(p,r,r,r,m,0,0,0);
  }
  function wheel(p,x,y,z,r) {
    const g=group(p,x,y,z);const tire=cyl(g,r,r,.135,M.rubber,0,0,0);tire.rotation.x=PI/2;
    const side=Math.sign(z)||1;const rim=cyl(g,r*.67,r*.67,.027,M.birch,0,0,side*.075);rim.rotation.x=PI/2;
    const hub=ring(g,r*.46,.019,M.dark,0,0,side*.093);
    bolt(g,0,0,side*.105,r*.19);return g;
  }
  function carToy(p){
    const o=group(p),axles=[];
    box(o,1.31,.145,.55,M.dark,0,.275,0,.055);
    const sh=new T.Shape();sh.moveTo(-.76,.29);sh.quadraticCurveTo(-.83,.57,-.57,.59);sh.lineTo(-.28,.60);sh.quadraticCurveTo(-.16,.46,.06,.46);sh.lineTo(.23,.60);sh.quadraticCurveTo(.65,.63,.78,.42);sh.lineTo(.77,.30);sh.closePath();
    extrude(o,sh,.56,M.red,0,0,0,.065);
    sphere(o,.45,.13,.30,M.red,.29,.54,0);
    box(o,.62,.018,.108,M.ivory,.34,.653,0,.008);
    box(o,.27,.12,.39,M.honey,-.20,.54,0,.048);
    const windscreen=box(o,.05,.21,.44,M.blueglass,.01,.63,0,.023);windscreen.rotation.z=.27;
    for(const sign of [-1,1]){
      for(const xx of [-.49,.49])axles.push(wheel(o,xx,.247,sign*.322,.242));
      const circle=cyl(o,.116,.116,.014,M.ivory,-.12,.407,sign*.337);circle.rotation.x=PI/2;
      const light=sphere(o,.074,.075,.064,M.ivory,.747,.457,sign*.17);
    }
    return {o,axles};
  }
  function chain(p){
    matPad(p);const f=group(p);
    // The viaduct is built from solid painted arches topped with a maple rail.
    for(const [t,w,m] of [[.105,1.42,M.blue],[.34,1.54,M.birch],[.58,1.53,M.red],[.82,1.52,M.birch]]){
      const [x,y,z]=back(t);const pier=bridge(f,x,.085,z,w,1.29,.83,m);pier.rotation.y=-Math.atan((dz(t+.01)-dz(t))/.0688);
      box(pier,w+.08,.09,.93,M.honey,0,1.30,0);
    }
    route(f,back,1.03,.19,M.birch);
    const dock=group(f,-5.78,top-.015,dz(.03));box(dock,.12,.22,1.04,M.teal,-.24,.10,0);
    const starter=swirledBall(f,.425,['#eeb337','#fff3cf','#cf7142']);
    target(starter,'starter',0);
    const domino=[],colors=[M.red,M.yellow,M.teal,M.blue,M.birch,M.red,M.yellow,M.aqua,M.blue,M.coral,M.yellow];
    const dots=[[-.15,.76],[.15,.76],[0,.61],[.13,.33],[-.13,.21]];
    for(let i=0;i<11;i++){
      const g=group(f),hinge=group(g);domino.push({g,hinge});
      box(hinge,.208,1.12,.64,colors[i],-.105,.558,0,.058);
      // Inlaid pips on both broad faces and a single circular dowel on the narrow edge.
      for(const side of [-1,1]){
        const x=-.105+side*.105;
        for(let j=0;j<5;j++)if((j+i)%4!==1){const a=cyl(hinge,.041,.041,.012,colors[i]===M.birch?M.dark:M.ivory,x,dots[j][1]+.12,dots[j][0],14);a.rotation.z=PI/2;}
        box(hinge,.010,.014,.46,M.honey,x,.548,0,.004);
      }
      bolt(hinge,-.104,.89,.322,.034);
      target(hinge,'tile'+i,0,true);
    }
    route(f,t=>ramp(t*.92),.78,.19,M.birch);
    for(const [t,m] of [[.13,M.teal],[.48,M.yellow],[.82,M.blue]]){
      const a=ramp(t),h=a[1]-.27;block(f,.66,h,.67,m,a[0],.069,a[2],.1*t);box(f,.81,.09,.81,M.honey,a[0],h+.072,a[2]);
    }
    const marble=swirledBall(f,.31,['#458c9c','#cde5ce','#f0d693']);target(marble,'second',0,true);
    const lever=group(f,3.34,.72,1.18);
    const foot=group(f,3.34,.085,1.18);
    for(const sign of [-1,1]){
      const triangle=new T.Shape();triangle.moveTo(-.59,0);triangle.lineTo(.59,0);triangle.lineTo(.14,.65);triangle.quadraticCurveTo(0,.76,-.14,.65);triangle.closePath();
      extrude(foot,triangle,.15,M.teal,0,0,sign*.42);
      bolt(foot,0,.58,sign*.42+.11,.104);
    }
    box(lever,2.9,.17,.73,M.birch,0,0,0,.06);
    for(const sign of [-1,1])box(lever,.085,.17,.79,M.red,sign*1.41,.095,0);
    target(lever,'lever',0,true);
    route(f,road,1.02,.15,M.honey);
    // Cream lane dashes and painted kerbs are separate inset wooden pieces.
    for(let i=0;i<13;i++){const marker=group(f);placeOn(marker,road,(i+.5)/13,.006);box(marker,.23,.012,.052,M.ivory,0,0,0,.004);}
    for(const [t,m] of [[.09,M.blue],[.37,M.birch],[.65,M.teal],[.91,M.birch]]){
      const q=road(t);const b=bridge(f,q[0],.08,q[2],1.03,q[1]-.23,.76,m);b.rotation.y=.23;
    }
    const car=carToy(f);target(car.o,'car',0,true);
    const station=group(f,-4.73,.085,2.90);
    slab(station,2.12,.14,1.62,.28,M.birch,0,.08,0);slab(station,1.86,.054,1.4,.20,M.teal,0,.17,0);
    box(station,.45,.32,.82,M.red,.58,.35,-.01);const pad=group(station,.73,.57,0);sphere(pad,.13,.23,.35,M.coral,0,0,0);
    cyl(station,.25,.32,.18,M.honey,-.61,.30,-.32);cyl(station,.043,.064,2.89,M.birch,-.61,1.78,-.32);
    sphere(station,.11,.12,.11,M.brass,-.61,3.29,-.32);
    const banner=group(station,-.59,1.35,-.32);flag(banner,0,0,0,.92,M.flag);
    const balloon=group(station,.16,1.60,.08),bm=mat('#df7350','plain',.27,.045);
    sphere(balloon,.484,.63,.47,bm,0,0,0);
    cyl(balloon,.040,.088,.11,bm,0,-.635,0);
    const tie=ring(balloon,.047,.014,M.goldflag,0,-.604,0);tie.rotation.x=PI/2;
    const string=rod(station,[.13,.37,.08],[.16,.96,.08],.014,M.ivory,8);
    target(balloon,'balloon',0,true);
    // A pair of quietly scattered nursery blocks near the far edge of the rug.
    const a=block(p,.63,.62,.63,M.coral,-5.98,.065,-2.93,.25);
    const med=cyl(a,.15,.15,.018,M.birch,0,.31,.325);med.rotation.x=PI/2;
    block(p,.53,.52,.52,M.birch,-5.95,.685,-2.96,-.13);
    const cap=cyl(p,.0,.405,.38,M.teal,-5.95,1.38,-2.96,4);cap.rotation.y=PI*.25;
    return {f,starter,domino,marble,lever,car,balloon,banner,string,pad,station};
  }
  function lake(p){
    matPad(p,mat('#86a395','cloth',.9));const g=group(p);
    slab(g,10.6,.30,5.3,1.3,M.honey,0,.23,.15);slab(g,10.3,.17,5.05,1.23,M.birch,0,.41,.15);
    const wet=mat('#72b5bb','plain',.15,.22);slab(g,9.94,.1,4.69,1.12,wet,0,.52,.15);
    const surface=new T.PlaneGeometry(8.10,3.15,31,8);surface.rotateX(-PI/2);
    const water=mesh(g,surface,wet,0,.592,.15);
    const shaft=group(g,-4.12,1.6,-.08),wheel=group(shaft);
    for(const x of [-4.73,-3.67]){block(g,.21,1.42,.32,M.teal,x,.10,-.08);bolt(g,x,1.6,.11);}
    wheel.rotation.y=.33;
    const wheelspin=group(wheel);
    for(let i=0;i<8;i++){const spoke=group(wheelspin);spoke.rotation.z=i*TAU/8;box(spoke,.12,1.17,.18,M.birch,0,.6,0);box(spoke,.37,.14,.58,i%2?M.coral:M.red,0,1.10,0);}
    for(const z of [-.215,.215])ring(wheelspin,.82,.072,M.honey,0,0,z);
    bolt(wheelspin,0,0,.29,.21);target(wheelspin,'wheel',1);
    const hull=group(g),sh=new T.Shape();sh.moveTo(-.81,.12);sh.quadraticCurveTo(-.64,-.22,-.4,-.22);sh.lineTo(.32,-.22);sh.quadraticCurveTo(.58,-.20,.90,.16);sh.closePath();
    extrude(hull,sh,.49,M.red,0,0,0,.077);box(hull,1.35,.093,.50,M.birch,0,.107,0);
    rod(hull,[-.07,.16,0],[-.07,1.52,0],.031,M.birch);
    const sail=new T.Shape();sail.moveTo(.01,.32);sail.lineTo(.01,1.5);sail.quadraticCurveTo(.48,1.03,.73,.32);sail.closePath();
    extrude(hull,sail,.028,cream,0,0,0,.015);
    const jib=new T.Shape();jib.moveTo(-.17,1.29);jib.lineTo(-.7,.31);jib.lineTo(-.17,.31);jib.closePath();extrude(hull,jib,.025,M.yellow,0,0,0,.013);
    flag(hull,-.07,1.54,0,.39,M.flag);
    const buoys=[];for(let i=0;i<3;i++){const b=group(g,[-1.2,1.1,3.62][i],.64,.98);sphere(b,.14,.20,.14,M.ivory,0,0,0);cyl(b,.10,.135,.09,M.red,0,.11,0);buoys.push(b);}
    bridge(g,2.65,.58,-1.46,2.07,1.05,.52,M.birch);
    for(const x of [1.69,3.58]){cyl(g,0,.38,.48,M.red,x,1.91,-1.46,4);block(g,.52,.93,.51,M.ivory,x,.75,-1.46);}
    for(let i=0;i<10;i++){const x=-2.6+rnd()*4.3,z=-1.36+rnd()*.34;const h=.38+rnd()*.48;rod(g,[x,.60,z],[x+.07,.60+h,z],.023,M.leaf);sphere(g,.051,.14,.051,M.honey,x+.075,.68+h,z);}
    return {wheelspin,hull,water,buoys};
  }
  function planeToy(p){
    const a=group(p);sphere(a,.93,.29,.30,M.coral,0,0,0);sphere(a,.29,.30,.3,M.birch,.68,0,0);
    for(const y of [-.18,.48]){box(a,.52,.095,2.37,M.yellow,-.01,y,0,.043);for(const sign of [-1,1])box(a,.51,.102,.1,M.red,-.01,y,sign*.98);}
    for(const sign of [-1,1]){rod(a,[-.19,-.14,sign*.77],[.16,.45,sign*.86],.025,M.dark);rod(a,[.18,-.14,sign*.77],[-.19,.45,sign*.86],.025,M.dark);}
    sphere(a,.30,.045,.57,M.teal,-.74,.075,0);sphere(a,.25,.28,.049,M.teal,-.74,.18,0);
    sphere(a,.22,.11,.16,M.ink,-.22,.23,0);const prop=group(a,.95,0,0);
    sphere(prop,.053,.51,.076,M.honey,0,0,0);sphere(prop,.099,.11,.11,M.brass,.065,0,0);
    for(const sign of [-1,1])wheel(a,.22,-.32,sign*.22,.115);
    return {a,prop};
  }
  function sky(p){
    matPad(p,mat('#8ba9a2','cloth',.95));const g=group(p);
    slab(g,10.0,.2,5.7,1.9,M.birch,0,.19,0);slab(g,9.65,.08,5.36,1.75,M.moss,0,.34,0);
    const tower=group(g,0,.37,-.25);cyl(tower,.42,.59,.25,M.honey,0,.13,0);cyl(tower,.12,.19,2.43,M.birch,0,1.44,0);
    sphere(tower,.23,.22,.23,M.brass,0,2.76,0);
    const spindle=group(tower,0,2.77,0);rod(spindle,[-2.4,0,0],[3.27,0,0],.043,M.brass);sphere(spindle,.20,.20,.20,M.red,-2.39,0,0);
    const air=planeToy(g);
    const fan=group(g,-3.56,1.85,1.15);block(g,.65,1.43,.61,M.teal,-3.56,.36,1.15);
    ring(fan,1.02,.078,M.birch,0,0,-.08);const blades=group(fan);
    for(let i=0;i<4;i++){const arm=group(blades);arm.rotation.z=i*PI/2;const blade=sphere(arm,.20,.46,.083,i%2?M.yellow:M.red,0,.49,0);blade.rotation.z=-.22;}
    sphere(blades,.2,.2,.17,M.brass,0,0,.15);target(fan,'prop',2);
    for(let i=0;i<7;i++){
      const x=(i%4-1.5)*1.08,z=-1.02-Math.floor(i/4)*.68;
      block(g,.65,.55+i%2*.17,.55, i%2?M.ivory:M.edge,x,.4,z);
      const roof=cyl(g,0,.58,.57,paint[i%5],x,1.20+i%2*.17,z,4);roof.rotation.y=PI/4;
      box(g,.14,.19,.015,M.blue,x, .67,z+.28);
    }
    const clouds=[];for(const [x,y,z,k] of [[-2.3,2.78,-.95,.8],[2.62,3.18,-1.52,.92],[.99,1.98,1.45,.56]]){
      const a=group(g,x,y,z);clouds.push(a);rod(g,[x,.4,z],[x,y,z],.019,M.brass);
      for(let i=-1;i<=1;i++)sphere(a,k*(.46-Math.abs(i)*.07),k*(.34-Math.abs(i)*.13),.22,M.ivory,i*.4*k,-Math.abs(i)*.075,0);
    }
    const thread=rod(g,[0,0,0],[0,1,0],.016,M.ivory);return {air,spindle,blades,clouds,thread};
  }
  function carousel(p){
    matPad(p,mat('#a2a68b','cloth',.96));const g=group(p,0,.07,-.42);
    cyl(g,2.49,2.63,.26,M.honey,0,.18,0,64);cyl(g,2.48,2.51,.13,M.red,0,.365,0,64);
    const rotor=group(g,0,.44,0);cyl(rotor,2.42,2.42,.12,M.birch,0,.06,0,64);
    cyl(rotor,.28,.42,2.77,M.teal,0,1.50,0);
    const animals=[];
    for(let i=0;i<4;i++){
      const a=group(rotor);a.rotation.y=i*PI/2;rod(a,[1.66,.10,0],[1.66,2.89,0],.037,M.brass);
      const duck=group(a,1.66,1.17,0);animals.push(duck);
      sphere(duck,.29,.32,.52,i%2?cream:M.yellow,0,0,0);
      sphere(duck,.23,.25,.23,i%2?cream:M.yellow,0,.29,.32);
      for(const sign of [-1,1])sphere(duck,.029,.035,.03,M.ink,sign*.204,.345,.417);
      if(i%2){for(const sign of [-1,1])sphere(duck,.068,.27,.092,cream,sign*.092,.58,.29);}
      else sphere(duck,.16,.062,.15,M.coral,0,.24,.55);
      sphere(duck,.18,.12,.28,M.teal,0,.24,-.10);
    }
    for(let i=0;i<12;i++){
      const material=i%2?M.ivory:M.red;
      mesh(rotor,new T.ConeGeometry(2.83,.98,5,1,true,i*TAU/12,TAU/12),material,0,3.36,0);
      const a=i*TAU/12;sphere(rotor,.23,.13,.23,material,Math.sin(a)*2.69,2.88,Math.cos(a)*2.69);
    }
    cyl(rotor,2.74,2.74,.14,M.yellow,0,2.86,0,64);sphere(rotor,.17,.19,.17,M.brass,0,3.94,0);flag(rotor,0,4.22,0,.59,M.goldflag);
    const keys=[],bells=[];const board=group(p,0,.34,2.71);slab(board,6.10,.30,1.54,.26,M.honey,0,0,0);
    for(let i=0;i<5;i++){
      const k=group(board,(i-2)*1.06,.22,0);keys.push(k);box(k,.93,.22,1.24,paint[i],0,0,0,.08);
      const dot=cyl(k,.092,.092,.013,M.ivory,0,.12,.37);
      const bell=group(p,(i-2)*.77,2.28,-2.46);bells.push(bell);
      rod(bell,[0,0,0],[0,-.18,0],.016,M.brass);cyl(bell,.065,.24,.32,M.brass,0,-.30,0);
      target(k,'key'+i,3);
    }
    for(const x of [-2.04,2.04])rod(p,[x,.08,-2.46],[x,2.37,-2.46],.049,M.honey);
    rod(p,[-2.04,2.32,-2.46],[2.04,2.32,-2.46],.048,M.birch);
    return {rotor,animals,keys,bells};
  }
  return {chain,lake,sky,carousel,anchors,clickable,back,ramp,road,placeOn};
})();
