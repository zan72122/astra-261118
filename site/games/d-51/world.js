const Street=(()=>{
  const {T,PI,TAU,random,mat,box,ball,rod,ring,wire,cyl,group,poly,mesh,grain,bake,markDynamic,contact,texture}=Art;
  function skyTexture(){
    const w=1024,h=512,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),im=ctx.createImageData(w,h);
    const knots=[[-1,[111,113,98]],[-.09,[163,159,131]],[0,[251,205,159]],[.085,[249,214,179]],[.2,[215,209,187]],[.40,[162,190,195]],[.73,[123,164,183]],[1,[107,148,171]]];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const alt=Math.sin((.5-y/h)*PI),az=(x/w-.5)*TAU;let j=1;while(j<knots.length-1&&alt>knots[j][0])j++;
      const a=knots[j-1],b=knots[j],f=Math.max(0,Math.min(1,(alt-a[0])/(b[0]-a[0])));
      const wisp=Math.max(0,Math.sin(alt*49+Math.sin(az*5)*1.6+Math.cos(az*2+alt*12))-.28)*Math.exp(-((alt-.14)**2)/.033)*8;
      const warm=Math.max(0,Math.cos(az+2.1))*Math.exp(-((alt-.09)**2)/.05)*7;
      const i=(y*w+x)*4,n=(random()-.5)*1.5;for(let k=0;k<3;k++)im.data[i+k]=a[1][k]*(1-f)+b[1][k]*f+wisp+n+warm*(k===0?1:k===1?.4:-.6);im.data[i+3]=255}
    ctx.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;return t
  }
  function make(scene,game){
    const root=group(scene),rootStatic=group(root),p=rootStatic,s=game.state;
    const stone=grain('#c4b8a0',15),mortar=mat('#8f887a',.95),curb=grain('#bfbaaa',18),asphalt=grain('#777b79',33);
    const green=mat('#446b62',.49,.28),greenLight=mat('#729085',.6,.22),iron=mat('#545853',.54,.65),brass=mat('#a78c56',.41,.58);
    box(p,0,-.19,0,28,.23,12,asphalt);box(p,0,-.089,-.25,26,.153,3.35,mortar);
    const slabs=Array.from({length:5},(_,i)=>grain(['#cdbea4','#cabda8','#c6baa3','#cfc1a9','#c9bca7'][i],18));
    for(let row=0;row<6;row++)for(let j=-7;j<8;j++){
      const x=(j+(row%2)*.5)*.89,z=1.19-row*.55;box(p,x,-.021+random()*.003,z,.885,.037,.545,slabs[(random()*5)|0],.004)}
    for(let j=-8;j<=8;j++)box(p,j*.81,-.042,1.485,.803,.107,.135,curb,.012);
    const paint=grain('#d2cdb1',28);for(let j=-8;j<9;j++)box(p,j*1.5,-.072,2.18,1.12,.002,.046,paint);
    function grate(x,z){box(p,x,.003,z,.49,.015,.185,iron,.014);box(p,x,.013,z,.453,.008,.151,mat('#302f2b'));
      for(let i=0;i<17;i++)box(p,x-.212+i*.0265,.021,z,.012,.012,.148,iron,.003)}
    grate(1.52,1.244);grate(-2.19,1.244);
    // A tiled shop wall ends here, opening onto the towpath and its distant houses.
    const plaster=grain('#d7c3a0',13),tileGrout=mat('#a39f87'),tiles=['#a4b3a1','#9eafa1','#aeb8a4','#a5b5a7'].map(c=>mat(c,.42,.04));
    box(p,-3.03,1.62,-.97,5.67,3.25,.34,plaster,.014);box(p,-3.03,.42,-.781,5.67,.84,.04,tileGrout);
    for(let y=0;y<5;y++)for(let x=0;x<34;x++)box(p,-5.76+x*.166,y*.165+.082,-.753,.16,.159,.022,tiles[(random()*4)|0],.004);
    box(p,-3.03,.824,-.749,5.68,.033,.075,tiles[1],.009);
    const timber=grain('#7e6450',12,'wood'),cream=mat('#d9caae',.69),rust=mat('#ac7253',.73,.14);
    box(p,-.231,1.65,-.788,.079,3.3,.09,timber,.006);
    box(p,-3,2.73,-.74,5.63,.135,.17,timber,.01);
    // Tapered sheet-metal awning with stitched, alternating sun-faded gores.
    const awning=[mat('#b77555',.87),mat('#dfc5a0',.87)];
    for(let i=0;i<21;i++){const x=-5.8+i*.272;let a=box(p,x,2.75,-.508,.273,.033,.69,awning[i%2]);a.rotation.x=.26;
      box(p,x,2.609,-.174,.273,.104,.027,awning[i%2],.013)}
    const sill=mat('#5b6d5c',.67);box(p,-2.07,1.63,-.757,.95,1.02,.065,timber,.012);
    box(p,-2.07,1.63,-.709,.856,.934,.035,mat('#738a82',.18,.50));
    for(let j=0;j<5;j++)box(p,-2.455+j*.193,1.63,-.68,.025,.95,.043,cream);
    for(let j=0;j<3;j++)box(p,-2.07,1.26+j*.369,-.682,.88,.024,.041,cream);
    box(p,-2.07,1.102,-.66,1.03,.063,.19,sill,.012);
    const pipe=mat('#988e75',.5,.43);rod(p,[-1.46,.04,-.61],[-1.46,2.85,-.61],.034,pipe);
    for(const y of [.19,.96,1.79,2.48]){cyl(p,-1.46,y,-.61,.043,.043,.033,iron);box(p,-1.46,y,-.704,.103,.032,.134,pipe)}
    // Warm enamel gooseneck lamp.
    wire(p,[[-1.41,2.22,-.77],[-1.41,2.28,-.62],[-1.41,2.26,-.47],[-1.41,2.20,-.43]],.014,iron);
    cyl(p,-1.41,2.17,-.43,.032,.129,.078,green);cyl(p,-1.41,2.129,-.43,.115,.108,.012,mat('#fbe2ac',.43,0,{emissive:0xffce8b,emissiveIntensity:.32}));
    // Cast-iron bench ends, slatted hardwood, brass carriage bolts.
    const bench=markDynamic(group(root,s.anchor[0],0,s.anchor[2]));
    const woods=['#a87b4f','#af8154','#ab7c50','#b78b5e'].map(c=>grain(c,11,'wood'));
    for(const x of [-.40,.40]){
      for(const z of [-.134,.15]){rod(bench,[x,.415,z*.67],[x,.04,z*1.26],.023,green,.033);box(bench,x,.028,z*1.26,.106,.035,.08,green,.012)}
      rod(bench,[x,.36,.177],[x,.411,-.145],.029,green);rod(bench,[x,.38,-.12],[x,.799,-.19],.022,green);
      wire(bench,[[x,.397,.135],[x,.549,.12],[x,.57,-.12],[x,.49,-.15]],.016,green,16);
    }
    rod(bench,[-.41,.268,-.05],[.41,.268,-.05],.016,greenLight);
    for(let i=0;i<4;i++){const z=-.125+i*.079;box(bench,0,.426,z,1.04,.041,.073,woods[i],.009);
      for(const x of [-.4,.4])cyl(bench,x,.448,z,.006,.006,.004,brass,10)}
    for(let i=0;i<3;i++){const y=.554+i*.087,z=-.144-i*.016;box(bench,0,y,z,1.055,.078,.038,woods[(i+1)%4],.008);
      for(const x of [-.4,.4])Art.disk(bench,x,y,z+.021,.007,.004,brass)}
    // A small slatted crate under the seat catches the toys as the shower clears.
    const crate=grain('#958665',12,'wood');box(bench,0,.044,-.025,.413,.032,.29,crate,.006);
    for(const z of [-.167,.117])for(let i=0;i<4;i++)box(bench,0,.064+i*.051,z,.424,.048,.018,crate,.003);
    for(const x of [-.203,.203])box(bench,x,.145,-.025,.018,.212,.282,crate,.004);
    contact(bench,0,.004,.01,1.35,.63);bake(bench);
    // Two worn stone edging blocks stop the ball at either end of the short gutter.
    const stops=group(root,s.anchor[0],0,s.anchor[2]);for(const sign of [-1,1]){
      box(stops,sign*.766,.028,.588,.071,.060,.228,curb,.021);
      box(stops,sign*.766,.006,.588,.094,.008,.252,mortar,.004)}
    bake(stops);
    // River railing, two horizontal rails and collar joints.
    box(p,3,-.032,-1.44,14,.15,.27,curb,.016);
    for(let j=-1;j<8;j++){const x=j*1.02+.16;
      cyl(p,x,.375,-1.46,.026,.034,.75,green);ball(p,x,.762,-1.46,.038,.038,.038,greenLight);
      cyl(p,x,.073,-1.46,.059,.065,.095,greenLight);cyl(p,x,.664,-1.46,.038,.038,.04,greenLight)}
    for(const y of [.36,.666])rod(p,[-1.07,y,-1.46],[8,y,-1.46],.022,greenLight);
    const river=mat('#87a8a0',.17,.54);const riverSurface=markDynamic(mesh(root,new T.PlaneGeometry(34,8.76,15,5),river,0,-.437,-6.065));riverSurface.rotation.x=-PI/2;riverSurface.castShadow=false;
    const sparkles=new T.InstancedMesh(new T.SphereGeometry(1,8,4),mat('#b6c3af',.22,.37),120);
    root.add(sparkles);sparkles.frustumCulled=false;sparkles.count=0;
    const glints=Array.from({length:120},()=>{const x=random()*30-14,z=-1.87-random()*8.4;
      return {x,z,cell:Math.min(15,Math.floor((x+17)/34*16))+16*Math.max(0,Math.min(5,Math.floor((z+10.445)/8.76*6))),len:.065+random()*.37,phase:random()*.7}});
    box(p,0,-.3,-10.44,42,.48,.65,grain('#a09f8e',18));
    function hill(z,base,height,col,offset){
      const pts=[[-52,-3],[52,-3]];let drift=0;for(let j=52;j>=-52;j-=.64){drift=.84*drift+(random()-.5)*.22;
        const y=base+height*(.47+.20*Math.sin(j*.34+offset)+.26*Math.sin(j*.145-offset)+.09*Math.sin(j*.86)+drift);pts.push([j,y])}poly(p,pts,z,1.7,mat(col,.99))}
    hill(-34,1.8,4.3,'#a6ada8',1.4);hill(-26,.78,3.23,'#8fa49b',-.84);hill(-20,.15,2.03,'#8b9b88',2.1);
    const stuccos=['#c7bb9e','#cbc3ac','#bdad91','#d0c0a3'].map(c=>mat(c,.91)),roofs=['#66766e','#8c8171','#78877c'].map(c=>mat(c,.81));
    for(let i=0;i<29;i++){
      const x=-16+i*1.22+random()*.3,z=-11.2-random()*2,h=.58+random()*.92,w=.65+random()*.58;
      box(p,x,h/2-.1,z,w,h,.92,stuccos[i%4]);const roof=group(p,x,h-.10,z);
      poly(roof,[[-w*.59,0],[0,.23+random()*.17],[w*.59,0]],-.54,1.08,roofs[i%3]);
      for(let j=0;j<2;j++)box(p,x+(j-.5)*w*.46,h*.63,z+.466,w*.19,.20,.018,roofs[0]);
    }
    // A shallow arched footbridge in the middle distance.
    const bridge=mat('#a29c89',.8);
    for(let i=0;i<20;i++){const x=3.3+i*.41,y=.12+.28*Math.sin(i/19*PI);box(p,x,y,-5.1,.416,.14,.55,bridge);if(i%2===0){rod(p,[x,y,-4.87],[x,y+.37,-4.87],.017,greenLight)}if(i%6===0)box(p,x,-.25,-5.1,.23,.84,.46,bridge)}
    wire(p,[[3.3,.49,-4.87],[5,.67,-4.87],[7.2,.77,-4.87],[9.3,.66,-4.87],[11.1,.49,-4.87]],.018,greenLight);
    function pole(x,z,height){cyl(p,x,height*.5,z,.049,.078,height,mat('#8e826c',.85),12);box(p,x,height-.20,z,.83,.057,.069,timber);
      for(const dx of [-.31,0,.31]){cyl(p,x+dx,height-.125,z,.04,.03,.13,cream,10);wire(p,[[x+dx,height-.08,z],[x+dx+2.9,height-.67,z-.28],[x+dx+6.3,height-.10,z-.5]],.006,iron,20)}}
    pole(2.28,-2.22,3.18);pole(8.55,-2.72,3.18);pole(-4.02,-1.72,3.18);
    // Articulated clusters of slender leaves attached to actual forked branches.
    const foliage=['#5c764d','#788855','#879958','#667f52','#9caa68'].map(c=>mat(c,.76,0,{side:T.DoubleSide}));
    const leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-.029,.038,-.036,.109,.001,.157);leafShape.bezierCurveTo(.031,.102,.023,.031,0,0);
    const leafGeo=new T.ShapeGeometry(leafShape,5);const bark=grain('#79694f',19,'wood'),clusters=[];
    function sprig(par,x,y,z,spread,idx){
      const g=markDynamic(group(par,x,y,z));g.rotation.z=(random()-.5)*.6;
      const init=g.rotation.z;
      for(let j=0;j<5;j++){const angle=j*2.4+random()*.7,len=(.11+random()*.25)*spread,dx=Math.cos(angle)*len,dy=(.13+random()*.19)*spread,dz=Math.sin(angle)*len;rod(g,[0,0,0],[dx,dy,dz],.004*spread,bark,.0015*spread,5);
        for(let l=1;l<=6;l++){const u=l/6,o=mesh(g,leafGeo,foliage[(idx+j+l)%5],dx*u,dy*u,dz*u);
          o.rotation.set((random()-.55)*1.45,angle+(l%2)*1.7,(l%2?1:-1)*(.45+random()*1.2));o.scale.setScalar(spread*(.63+random()*.62))}}
      bake(g);clusters.push({g,init,idx:idx%24});
    }
    const tree=group(p,-1.94,0,-.03);
    rod(tree,[0,0,0],[-.07,1.35,-.02],.065,bark,.042,12);rod(tree,[-.07,1.30,-.02],[.01,2.32,.02],.046,bark,.024,10);
    for(let j=0;j<13;j++){const angle=j*2.4,len=.38+random()*.48,height=1.53+j*.078,dx=Math.cos(angle)*len,dz=Math.sin(angle)*len;
      const pt=[dx,height+.43+random()*.22,dz];rod(tree,[-.025,height-.25,0],pt,.018,bark,.0048,8);sprig(tree,...pt,1.05+random()*.4,j)}
    // Glazed planters with a little wild growth at the base of the machine.
    const pot=mat('#a27756',.73),soil=mat('#5e5942',.98);
    function planter(x,z,rad,h,n){cyl(p,x,h/2,z,rad,rad*.71,h,pot);cyl(p,x,h-.018,z,rad*1.08,rad*1.04,.049,pot);cyl(p,x,h+.01,z,rad*.95,rad*.95,.008,soil);
      for(let j=0;j<n;j++)sprig(p,x+(random()-.5)*rad,h,z+(random()-.5)*rad,.34+random()*.41,16+j)}
    planter(-1.42,.21,.137,.215,4);planter(1.62,-.12,.155,.25,4);
    // Small distant trees have broad, overlapping crowns and visible trunks.
    for(let i=0;i<23;i++){const x=random()*27-11,z=-10.2-random()*.45,h=.75+random()*.83;
      rod(p,[x,-.12,z],[x,h*.7,z],.032,bark);for(let j=0;j<5;j++)ball(p,x+(random()-.5)*.55,h-.38+random()*.4,z+random()*.3,.20+random()*.26,.28+random()*.18,.27,foliage[(i+j)%5])}
    bake(p);
    return {bench,stops,clusters,riverSurface,sparkles,glints};
  }
  return {make,skyTexture};
})();
