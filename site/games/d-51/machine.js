const Kiosk=(()=>{
  const {T,PI,TAU,mat,box,ball,rod,ring,wire,cyl,group,poly,mesh,disk,bake,markDynamic,contact,texture}=Art;
  const L=StreetMachine.layout;
  const ivory=mat('#e9e2ca',.39,.21),lip=mat('#f4ecd7',.31,.22),red=mat('#ad392a',.36,.26),verm=mat('#c7432e',.33,.21),
    deep=mat('#713329',.49,.28),steel=mat('#a0aaa0',.28,.77),bright=mat('#d3d6c9',.21,.78),black=mat('#272f2c',.69,.18),
    rubber=mat('#41473e',.79),gold=mat('#c29648',.31,.65),amber=mat('#ffe2a1',.32,.2,{emissive:0xffb846,emissiveIntensity:.52});
  const palette=['#d88a43','#7c9c6b','#7aafb1','#c36c65'];
  const enamel=palette.map(c=>mat(c,.34,.32));
  function screw(p,x,y,z,r=.009){disk(p,x,y,z,r,.005,steel);box(p,x,y,z+.003,r*1.12,.0019,.002,black).rotation.z=.55}
  function bird(p,x,y,z,scale,ink){const g=group(p,x,y,z);g.scale.setScalar(scale);
    poly(g,[[-.54,.19],[-.22,.13],[-.42,.42],[-.10,.29],[.17,.06],[.34,.13],[.46,.10],[.58,.12],[.45,.035],[.29,-.09],[.04,-.16],[-.18,-.13],[-.46,-.28],[-.36,-.09],[-.64,-.14],[-.29,.015]],0,.007,ink);return g}
  // Ink is wrapped on a metal cylinder; rims, shoulder, lid and pull ring are separate meshes.
  const labels=palette.map((col,k)=>{
    const t=texture((c,n)=>{c.fillStyle=col;c.fillRect(0,0,n,n);
      c.fillStyle=['#f3d9a6','#d8ddb8','#daeadb','#f1c9a7'][k];c.fillRect(0,n*.055,n,n*.105);c.fillRect(0,n*.876,n,n*.065);
      const ink=['#a7552e','#4f7458','#4a7a80','#9c4941'][k],paper='#f6e8c8';
      for(let j=-1;j<4;j++){const cx=j*n*.5+n*.24,cy=n*.5;c.save();c.translate(cx,cy);c.rotate(-.14);
        c.fillStyle=paper;c.beginPath();c.ellipse(0,0,n*.197,n*.257,0,0,TAU);c.fill();
        c.strokeStyle=ink;c.lineWidth=n*.005;c.beginPath();c.ellipse(0,0,n*.181,n*.236,0,0,TAU);c.stroke();
        c.fillStyle=col;c.strokeStyle=ink;c.lineWidth=2;
        if(k===0){c.beginPath();c.arc(0,5,n*.105,0,TAU);c.fill();c.stroke();c.strokeStyle=paper;for(let i=0;i<7;i++){const a=i*TAU/7;c.beginPath();c.moveTo(Math.cos(a)*5,5+Math.sin(a)*5);c.lineTo(Math.cos(a)*n*.085,5+Math.sin(a)*n*.085);c.stroke()}}
        if(k===1){for(let i=0;i<3;i++){c.save();c.translate((i-1)*10,(i%2)*13);c.rotate((i-1)*.55);c.beginPath();c.ellipse(0,0,10,26,.4,0,TAU);c.fill();c.stroke();c.restore()}}
        if(k===2){for(let i=0;i<3;i++){c.beginPath();c.moveTo(-25,6+i*9);c.quadraticCurveTo(-9,-10+i*9,3,1+i*9);c.quadraticCurveTo(15,10+i*9,25,-4+i*9);c.stroke()}c.fillStyle='#c9a95e';c.beginPath();c.arc(10,-18,11,0,TAU);c.fill()}
        if(k===3){for(const x of [-11,11]){c.beginPath();c.arc(x,10,14,0,TAU);c.fill();c.stroke();c.beginPath();c.moveTo(x,0);c.quadraticCurveTo(x+4,-12,2,-25);c.stroke()}}
        c.fillStyle='#667954';if(k===0||k===3){c.beginPath();c.ellipse(7,-n*.104,12,5,-.55,0,TAU);c.fill()}
        c.restore()}
      c.strokeStyle=paper;c.lineWidth=1.6;for(const y of [.186,.823,.849]){c.beginPath();c.moveTo(0,n*y);c.lineTo(n,n*y);c.stroke()}
      for(let j=0;j<26;j++){c.fillStyle=paper;c.beginPath();c.arc(j*n/25,n*.11,1.8,0,TAU);c.fill()}
    },256);return new T.MeshStandardMaterial({map:t,metalness:.29,roughness:.34,roughnessMap:Art.rough})});
  function can(parent,k){const g=group(parent);cyl(g,0,0,0,.055,.055,.144,labels[k],42);
    for(const sign of [-1,1]){cyl(g,0,sign*.076,0,sign===1?.049:.055,sign===1?.055:.049,.009,bright,36);
      const rim=ring(g,0,sign*.083,0,.0485,.003,bright);rim.rotation.x=PI/2}
    cyl(g,0,.081,0,.048,.048,.004,steel,36);cyl(g,0,-.081,0,.047,.047,.004,steel,32);
    ball(g,0,.084,-.014,.017,.0015,.012,black);const tab=ring(g,0,.085,.004,.011,.003,bright);tab.rotation.x=-PI/2;tab.scale.y=1.48;
    return g}
  const wingMats=['#d58353','#e2b75f','#839e87','#7ca7ac','#bc6d59'].map(c=>mat(c,.46,.10,{side:T.DoubleSide}));
  function windmill(p,k){const g=group(p),wings=[];rod(g,[0,-.385,0],[0,0,0],.008,mat('#b99e69',.67));
    const hub=group(g,0,0,.018);
    for(let i=0;i<5;i++){const wing=group(hub);wing.rotation.z=i*TAU/5;const m=wingMats[(i+k)%5];
      const vs=[0,0,.002,.025,.076,.033,.104,.120,-.005,.024,.143,-.021,-.024,.085,.014,0,0,.002];const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vs,3));geo.setIndex([0,1,2,1,3,2,1,4,3,0,4,1]);geo.computeVertexNormals();mesh(wing,geo,m,0,0,0);wings.push(wing)}
    ball(hub,0,0,.018,.016,.016,.01,gold);return {hub,wings,g}}
  function playBall(p,k){const g=group(p);for(let i=0;i<8;i++){
    const geo=new T.SphereGeometry(.077,7,20,i*TAU/8,TAU/8);mesh(g,geo,i%2?ivory:enamel[(k+(i>>1))%4],0,0,0)}
    for(const s of [-1,1])cyl(g,0,s*.076,0,.014,.014,.003,gold,20);return g}
  function parasol(p,k){const g=group(p),ribs=[];rod(g,[0,-.48,0],[0,.04,0],.008,brassMat());wire(g,[[0,-.47,0],[0,-.51,0],[.035,-.52,0],[.048,-.49,0]],.010,red);
    for(let i=0;i<8;i++){const a=i*TAU/8,b=(i+1)*TAU/8,m=(a+b)/2;
      const pts=[[0,.035,0],[.27*Math.cos(a),-.04,.27*Math.sin(a)],[.28*Math.cos(m),-.018,.28*Math.sin(m)],[.27*Math.cos(b),-.04,.27*Math.sin(b)],[.47*Math.cos(a),-.178,.47*Math.sin(a)],[.442*Math.cos(m),-.151,.442*Math.sin(m)],[.47*Math.cos(b),-.178,.47*Math.sin(b)]];
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts.flat(),3));geo.setIndex([0,2,1,0,3,2,1,2,4,4,2,5,2,3,5,5,3,6]);geo.computeVertexNormals();const r=group(g);mesh(r,geo,mat(i%2?'#dcc59c':'#a4513d',.59,0,{side:T.DoubleSide}),0,0,0);
      wire(r,[pts[0],pts[1],pts[4]],.0028,steel);ribs.push(r)}
    ball(g,0,.044,0,.012,.019,.012,brassMat());return {g,ribs}}
  function brassMat(){return gold}
  function product(parent,type,k){const g=group(parent),model=group(g);let toy=null;
    if(type===0)can(model,k);
    if(type===1)toy=windmill(model,k);
    if(type===2)playBall(model,k);
    if(type===3)toy=parasol(model,k);
    if(type===0||type===2)bake(model);
    return {g,model,toy,type,k}}
  function setFold(v,open,s,turn=0){
    if(v.type===1){const t=v.toy;t.g.scale.setScalar(.42+.58*open);t.hub.rotation.z=turn;
      t.wings.forEach((w,i)=>{w.rotation.y=(1-open)*.91+open*s.rotor.flex[i].x;w.rotation.x=(1-open)*.51})}
    if(v.type===3){const t=v.toy;t.g.scale.setScalar(.32+.68*open);t.ribs.forEach((r,i)=>{const f=Math.max(.012,Math.min(1.08,s.umbrella.ribs[i].x*open));r.scale.set(.14+.86*f,2.05-f,.14+.86*f)})}
  }
  function build(scene){
    const machine=group(scene,L.mx,0,0);const p=group(machine);const m={machine,buttons:[],coils:[],stock:[],lights:[]};
    contact(p,0,.004,.012,1.80,1.22);
    for(const x of [-.51,.51])for(const z of [-.235,.226]){box(p,x,.056,z,.13,.11,.116,black,.015);box(p,x,.013,z,.167,.018,.15,steel,.008)}
    box(p,0,1.112,-.192,1.335,2.055,.358,ivory,.055);
    for(const x of [-.626,.626])box(p,x,1.11,.137,.082,2.012,.453,ivory,.035);
    box(p,0,2.094,.142,1.298,.095,.421,lip,.035);
    box(p,0,.158,.132,1.297,.128,.452,red,.027);
    // Entire door floats in a dark gasket, independently of the back and side skins.
    box(p,0,1.129,.148,1.285,1.915,.079,rubber,.034);
    box(p,0,1.515,.208,1.261,1.167,.126,verm,.032);
    box(p,0,.587,.219,1.257,.754,.160,ivory,.025);
    box(p,0,.25,.287,1.247,.073,.059,verm,.013);
    for(let i=0;i<2;i++)box(p,0,.306+i*.020,.302,1.234,.008,.008,verm,.002);
    // Painted side flashes run around the corners.
    for(const sign of [-1,1])for(const [y,h] of [[.251,.07],[.307,.009],[.327,.009],[1.938,.034],[1.993,.012]]){
      box(p,sign*.667,y,-.017,.004,h,.583,verm,.002)}
    for(const x of [-.578,.578])for(const y of [.367,.891,2.042])screw(p,x,y,y>.95?.276:.306);
    // Luminous enamel marquee with a raised swallow crossing a small apricot sun.
    box(p,0,1.937,.28,1.17,.242,.076,deep,.026);
    box(p,0,1.937,.325,1.136,.211,.035,bright,.021);
    m.sign=mat('#f5e6bf',.29,.14,{emissive:0xffe0a6,emissiveIntensity:.18});
    box(p,0,1.937,.348,1.113,.189,.020,m.sign,.016);
    disk(p,.016,1.953,.363,.063,.005,mat('#d99747',.38,.21));bird(p,-.008,1.934,.370,.187,verm);
    for(const sign of [-1,1])for(let i=0;i<3;i++){const len=[.267,.321,.225][i];box(p,sign*(.127+len/2),1.964-i*.027,.362,len,.0065,.004,i===1?red:gold,.002)}
    // Inset product well, aluminium edges, back reflector and fluorescent tubes.
    box(p,-.119,1.435,.260,.968,.736,.048,deep,.017);
    box(p,-.119,1.435,.287,.953,.719,.028,bright,.012);
    // Back of the display is recessed behind all of the products.
    // Cutout uses four extruded frame rails around the cavity (no solid pane across the stock).
    const bayBack=mat('#8e9b8c',.45,.47);
    const wx=-.119,wy=1.435,ww=.922,wh=.685;
    box(p,wx,wy,.303,ww,wh,.013,bayBack,.009);
    for(const x of [-.579,.343])box(p,x,wy,.337,.020,wh,.082,steel,.005);
    for(const y of [1.094,1.776])box(p,wx,y,.337,ww,.018,.082,bright,.005);
    for(let row=0;row<2;row++){
      const y=L.shelf[row];
      box(p,wx,y-.095,.373,.913,.022,.119,steel,.005);
      box(p,wx,y-.125,.384,.916,.061,.055,black,.007);
      box(p,wx,y-.159,.382,.918,.008,.063,bright,.002);
      for(let col=0;col<4;col++){
        const x=L.col[col],id=row*4+col;
        if(col<3)box(p,x+.108,y+.016,.341,.003,.226,.083,bayBack);
        const coil=markDynamic(group(machine,x,y-.037,.362));const points=[];
        for(let j=0;j<=76;j++){const a=j/76*TAU*2.65;points.push([Math.cos(a)*.067,Math.sin(a)*.05,-.038+j/76*.094])}
        wire(coil,points,.0038,bright,82);m.coils.push(coil);
        const key=markDynamic(group(machine,x,y-.125,.417));
        box(key,0,0,0,.135,.044,.016,steel,.013);
        const lamp=mat('#c8b979',.31,.32,{emissive:0xffce66,emissiveIntensity:.06, name:'key'+id});
        box(key,0,0,.010,.120,.035,.012,lamp,.012);box(key,0,0,.017,.100,.024,.012,greenKey(),.009);
        box(key,0,.001,.024,.036,.004,.002,ivory,.001);bake(key);m.buttons.push(key);m.lights.push(lamp)
      }
      const lum=mat('#fff2ce',.24,.10,{emissive:0xffdf97,emissiveIntensity:.46,name:'lamp'+row});
      box(p,wx,y+.114,.348,.884,.011,.015,lum,.004);m['tube'+row]=lum;
    }
    const glass=mat('#c2ddce',.12,.52,{transparent:true,opacity:.064,depthWrite:false,envMapIntensity:1.12});
    for(const y of L.shelf)box(p,wx,y+.017,.438,ww-.008,.209,.003,glass,.001);
    // Narrow payment column with a vertical coin slit, return lever and its own recessed cup.
    box(p,.479,1.443,.297,.213,.678,.061,red,.017);
    box(p,.478,1.483,.335,.166,.386,.034,deep,.014);
    box(p,.478,1.489,.358,.148,.363,.023,steel,.012);
    for(let i=0;i<6;i++)box(p,.476,1.602-i*.016,.371,.093,.004,.003,black,.001);
    disk(p,.481,1.425,.383,.042,.016,bright);box(p,.481,1.425,.398,.046,.014,.016,rubber,.005).rotation.z=-.35;
    box(p,L.slot[0],L.slot[1],.351,.151,.181,.083,black,.02);
    box(p,L.slot[0],L.slot[1],.399,.124,.155,.020,bright,.015);box(p,L.slot[0],L.slot[1],.413,.037,.12,.012,gold,.011);
    box(p,L.slot[0],L.slot[1],.421,.012,.093,.006,black,.004);
    for(const dx of [-.054,.054])screw(p,.466+dx,1.136,.409,.004);
    box(p,.47,.811,.319,.17,.185,.028,steel,.017);
    box(p,.47,.823,.337,.12,.088,.022,black,.011);box(p,.47,.776,.357,.126,.018,.060,bright,.006);
    for(let i=0;i<9;i++)box(p,.475,.642-i*.023,.309,.157,.009,.011,rubber,.004);
    // Deep retrieval opening: side walls, rubber flap, sloping floor and raised front lip.
    const tx=L.tray[0];box(p,tx,.546,.305,.84,.303,.055,steel,.026);
    box(p,tx,.548,.340,.795,.259,.038,black,.018);
    box(p,tx,.536,.366,.757,.211,.019,mat('#40473f',.46,.51),.009);
    box(p,tx,.421,.402,.792,.021,.133,steel,.007);
    for(const x of [tx-.388,tx+.388])box(p,x,.511,.401,.020,.179,.13,bright,.004);
    m.shutter=markDynamic(group(machine,tx,.655,.407));box(m.shutter,0,-.029,0,.75,.062,.018,rubber,.006);
    box(p,tx,.420,.467,.81,.025,.029,bright,.008);
    box(p,tx,.694,.348,.837,.024,.08,lip,.008);
    // A small medallion and fine sun-stripes on the lower fascia.
    disk(p,-.443,.825,.305,.050,.005,gold);disk(p,-.443,.825,.311,.043,.004,ivory);bird(p,-.443,.825,.316,.056,red);
    for(let i=0;i<3;i++)box(p,-.247,.842-i*.014,.306,.251-i*.029,.004,.004,gold,.001);
    box(p,.174,.828,.318,.17,.045,.026,steel,.009);box(p,.174,.828,.336,.131,.013,.008,rubber,.005);
    m.coin=markDynamic(group(machine,...L.coin));
    disk(m.coin,0,0,0,.063,.010,mat('#c3984e',.28,.69));ring(m.coin,0,0,.006,.056,.0035,mat('#f1cd7c',.25,.62));
    for(let j=0;j<36;j++){const a=j*TAU/36;box(m.coin,Math.cos(a)*.050,Math.sin(a)*.050,.007,.004,.0015,.002,gold).rotation.z=a}
    const star=[];for(let i=0;i<10;i++){const a=PI/2+i*PI/5,r=i%2?.015:.032;star.push([r*Math.cos(a),r*Math.sin(a)])}poly(m.coin,star,.007,.003,amber,.0007);
    bake(m.coin);
    for(let i=0;i<8;i++){const g=markDynamic(group(machine,L.col[i%4],L.shelf[i>>2],.374));m.stock.push(g)}
    bake(p);return m
  }
  function greenKey(){return mat('#384c41',.34,.3)}
  return {build,product,setFold};
})();
