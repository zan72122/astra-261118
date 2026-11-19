'use strict';
function buildObjects(scene,game){
  const {T,V,TAU,rng,range,texture,mat,group,mesh,box,ell,cyl,rod,tor,tube,lathe,batch}=Craft;
  const brass=mat(0xcfaa64,.28,.74),oldBrass=mat(0x947547,.35,.71),edge=mat(0xd9d9ba,.22,.84),
    dark=mat(0x444941,.52,.25),enamel=mat(0x528d82,.29,.40),line=mat(0xe8d4a0,.38,.46),
    rubber=mat(0x43554a,.85),red=mat(0xb54d3a,.30,.39),silver=mat(0xc9d1c8,.20,.90),
    saddle=mat(0x80533d,.59),cream=mat(0xe8d5ad,.67),ink=mat(0x404640,.78);
  const sprinkler=group(scene),body=group(sprinkler),spindle=group(sprinkler),valve=group(sprinkler);
  // Heavy painted runners and their worn brass plugs sit on the turf.
  for(const side of [-1,1]){
    const x=side*.265;
    tube(body,[[x,.17,-.45],[x,.096,-.33],[x,.083,.32],[x,.13,.47],[x,.21,.51]],.062,enamel);
    ell(body,x,.205,.51,.057,.026,.056,brass);
    for(const z of [-.23,.24]){rod(body,[x,.116,z],[x*.42,.25,z*.64],.047,enamel);cyl(body,x,.16,z,.036,.041,.034,brass,6);}
  }
  ell(body,0,.23,.01,.26,.156,.34,enamel,32);
  tor(body,0,.299,.015,.183,.012,line,'y');
  cyl(body,0,.37,-.008,.122,.16,.16,oldBrass);
  cyl(body,0,.49,-.008,.085,.108,.12,brass,12);
  for(let i=0;i<4;i++)tor(body,0,.446+i*.028,-.008,.097,.008,dark,'y');
  rod(body,[0,.234,.25],[-.28,.25,.42],.091,enamel);
  rod(body,[-.28,.25,.42],[-.52,.24,.47],.076,oldBrass);
  for(let i=0;i<5;i++){const o=tor(body,-.40-i*.028,.248,.445+i*.004,.078,.008,brass,'x');o.rotation.z=.04;}
  // The valve wheel is canted toward the camera; the child can see the hub and the gaps.
  valve.position.set(-.24,.40,.33);valve.rotation.x=.84;
  cyl(valve,0,-.01,0,.047,.057,.19,brass);
  tor(valve,0,.09,0,.203,.036,red,'y');
  for(let i=0;i<5;i++){
    const a=i*TAU/5;rod(valve,[0,.086,0],[.2*Math.cos(a),.09,.2*Math.sin(a)],.02,red);
    ell(valve,.203*Math.cos(a),.09,.203*Math.sin(a),.043,.039,.043,red);
  }
  cyl(valve,0,.12,0,.058,.065,.044,brass,6);
  spindle.position.y=.60;
  cyl(spindle,0,.008,0,.097,.087,.16,brass);
  ell(spindle,0,.105,0,.121,.10,.109,enamel);
  for(const k of [-1,1]){
    tube(spindle,[[0,.09,0],[.083*k,.10,-.052*k],[.12*k,.15,-.13*k],[.10*k,.192,-.21*k]],.043,brass);
    rod(spindle,[.10*k,.17,-.18*k],[.10*k,.216,-.239*k],.057,oldBrass,.062,12);
    rod(spindle,[.10*k,.216,-.239*k],[.10*k,.221,-.245*k],.037,dark);
  }
  rod(spindle,[-.22,.165,.035],[.22,.165,.035],.025,edge);
  box(spindle,-.201,.164,.033,.066,.089,.083,oldBrass);
  cyl(spindle,0,.205,0,.043,.060,.054,brass,6);
  batch(spindle);batch(valve);batch(body);

  const hose=group(scene),hoseMat=mat(0x416d61,.47,.07);
  function layHose(){
    hose.clear();const h=game.layout.head;
    const pts=[[-.51,.235,.47],[-.75,.12,.57],[-1.17,.07,.69],[-1.57,.066,.61],[-2.08,.067,.68],
      [-2.47,.07,1.03],[-2.48,.07,1.47],[-2.14,.076,1.77],[-1.55,.072,1.75],[-1.29,.068,1.46],
      [-1.48,.07,1.19],[-1.91,.10,1.21],[-2.36,.175,1.52],[-3.04,.073,1.82],[-3.88,.07,1.80],[-5.55,.07,2.32],[-8,.07,3.04]];
    const o=tube(hose,pts,.054,hoseMat,150,12);o.position.set(h.x,0,h.z);
  }
  const clayTex=texture(256,(c,n)=>{
    c.fillStyle='#ded2bf';c.fillRect(0,0,n,n);
    for(let i=0;i<8500;i++){
      c.fillStyle=i%4?'rgba(99,70,48,.065)':'rgba(255,245,219,.31)';
      c.fillRect(rng()*n,rng()*n,range(.4,2),range(.4,2.4));
    }
    for(let i=0;i<75;i++){c.fillStyle='rgba(116,80,57,.044)';c.fillRect(0,rng()*n,n,range(.6,1.8));}
  },1,true);
  const clay=mat(0xc98769,.90,.02,{map:clayTex,bumpMap:clayTex,bumpScale:.011}),clayLight=mat(0xd59875,.84,0,{map:clayTex}),
    clayShade=mat(0x8c5945,.91,0,{map:clayTex});
  const potRoot=group(scene),potBody=group(potRoot);
  lathe(potBody,[[.01,.027],[.33,.027],[.405,.056],[.43,.114],[.431,.136],[.408,.147],[.38,.095],[.27,.075],[.01,.075]],clayShade);
  lathe(potBody,[[.017,.096],[.278,.096],[.296,.117],[.322,.26],[.432,.668],[.446,.694],[.461,.700],[.465,.74],[.473,.795],[.46,.816],[.430,.817],[.414,.796],[.409,.751],[.25,.147],[.017,.147]],clay);
  lathe(potBody,[[.43,.651],[.46,.651],[.480,.666],[.503,.766],[.501,.795],[.486,.811],[.460,.818],[.434,.814],[.419,.802],[.438,.775],[.44,.687]],clayLight);
  for(const [y,rad,t] of [[.657,.464,.008],[.78,.496,.009],[.615,.423,.005],[.603,.42,.003],[.141,.302,.004]])tor(potBody,0,y,0,rad,t,clay,'y',64);
  // Throwing marks and light mineral deposits in fired clay.
  for(let i=0;i<55;i++){const a=rng()*TAU,y=range(.18,.62),r=.30+(y-.12)*.238;ell(potBody,Math.cos(a)*r,y,Math.sin(a)*r,.0024,.0038,.003,clayLight,5);}
  batch(potBody);
  const waterMat=mat(0x93c4bf,.13,.42,{transparent:true,opacity:.84,envMapIntensity:1.1});
  const waterSurface=cyl(potRoot,0,.15,0,1,1,.012,waterMat,64);
  const rimStreams=[];
  for(let i=0;i<10;i++){
    const a=TAU*i/10,pts=[[.456,.006],[.493,.002],[.505,-.033],[.509,-.11],[.513,-.26],[.518,-.46],[.526,-.75]]
      .map(([r,y])=>[r*Math.cos(a),y,r*Math.sin(a)]);
    const film=tube(potRoot,pts,.011,waterMat,14,6);film.position.y=.813;rimStreams.push(film);
  }
  const ripple=tor(potRoot,0,.2,0,.22,.006,mat(0xc9e1d9,.18,.34,{transparent:true,opacity:.5}),'y');
  const leaf=group(potRoot);const leafMat=mat(0xb7a04b,.66);
  const l=ell(leaf,0,0,0,.105,.014,.048,leafMat);l.rotation.z=.11;
  rod(leaf,[-.115,0,0],[.108,.007,0],.004,oldBrass);leaf.position.set(.07,.15,.07);batch(leaf);

  const bike=group(scene), frame=group(bike);
  const wheelR=.545,axleY=.572,rear=-.83,front=.83,bb=[-.06,.46,.026],seat=[-.35,1.18,.01],top=[.56,1.18,.008],bottom=[.50,1.03,.008];
  const wheels=[],mudDots=[];
  const mudMat=mat(0x846e51,.95,.01),mudAlt=mat(0x9e8664,.95);
  for(let j=0;j<2;j++){
    const wheel=group(bike);wheel.position.set(j?front:rear,axleY,0);wheels.push(wheel);
    tor(wheel,0,0,0,wheelR,.044,ink,'z',72);
    for(const side of [-1,1]){
      tor(wheel,0,0,side*.020,wheelR-.013,.030,cream,'z',72);
      tor(wheel,0,0,side*.028,wheelR-.048,.014,silver,'z',72);
      tor(wheel,0,0,side*.028,wheelR-.074,.009,edge,'z',64);
    }
    rod(wheel,[0,0,-.077],[0,0,.077],.044,silver);
    for(let i=0;i<32;i++){
      const a=i*TAU/32,side=(i%2?1:-1);
      rod(wheel,[.038*Math.cos(a+.8*side),.038*Math.sin(a+.8*side),side*.061],
        [Math.cos(a)*(wheelR-.058),Math.sin(a)*(wheelR-.058),side*.013],.0046,silver,.0037,5);
    }
    rod(wheel,[0,-.45,.001],[0,-.49,.001],.009,oldBrass);
    batch(wheel);
    const fenderPts=[];for(let k=0;k<=25;k++){const a=(j?-.12:-.06)+(Math.PI+(j?.12:.28))*k/25;
      fenderPts.push([(j?front:rear)+Math.cos(a)*.615,axleY+Math.sin(a)*.615,0]);}
    tube(frame,fenderPts,.040,red,44,9);
    for(const side of [-1,1]){
      rod(frame,[j?front:rear,axleY,side*.052],[(j?front:rear)+(j?.50:-.53),axleY+.34,side*.029],.011,silver);
      rod(frame,[rear,axleY,side*.058],[bb[0],bb[1],side*.046],.024,red);
      rod(frame,[rear,axleY,side*.058],[seat[0],seat[1]-.10,side*.026],.019,red);
      if(j===1) tube(frame,[[front,axleY,side*.067],[.73,.65,side*.067],[.53,.99,side*.046],[.51,1.05,side*.024]],.029,red);
    }
    for(let i=0;j===1&&i<24;i++){
      const arc=group(wheel),a=i*TAU/24;arc.position.set(.525*Math.cos(a),.525*Math.sin(a),.040);arc.rotation.z=a;
      ell(arc,0,0,0,.043,range(.056,.090),range(.009,.019),i%3?mudMat:mudAlt,8);
      ell(arc,-.046,.016,.004,.030,.041,.011,mudAlt,7);
      batch(arc);mudDots.push({o:arc,i});
    }
  }
  rod(frame,bb,seat,.044,red);
  tube(frame,[[.53,1.08,.015],[.33,.77,.02],[.04,.57,.028],bb],.053,red);
  tube(frame,[[.55,1.17,.015],[.34,.95,.012],[.05,.77,.012],[-.24,.75,.012]],.031,red);
  // Fine cream enamel pinstriping on the step-through tubes.
  tube(frame,[[.52,1.09,.063],[.32,.775,.072],[.065,.597,.076]],.006,line,20,6);
  rod(frame,bottom,top,.061,red);rod(frame,[.51,1.02,.008],[.569,1.21,.008],.047,silver);
  for(const v of [[.504,1.025,.008],[.565,1.193,.008]]){const o=tor(frame,...v,.059,.009,brass,'y');o.rotation.z=-.26;}
  rod(frame,seat,[-.38,1.306,.01],.027,silver);
  ell(frame,-.405,1.331,.014,.166,.056,.092,saddle,24);ell(frame,-.312,1.333,.03,.124,.031,.062,saddle);
  for(const side of [-1,1])tor(frame,-.48,1.259,side*.051,.031,.008,dark);
  tube(frame,[[.56,1.17,.008],[.60,1.38,.008],[.65,1.408,.01]],.024,silver);
  tube(frame,[[.42,1.405,-.23],[.52,1.399,-.19],[.64,1.399,-.10],[.65,1.415,0],[.64,1.41,.12],[.54,1.427,.215],[.42,1.427,.28]],.019,silver);
  rod(frame,[.41,1.425,.282],[.527,1.426,.222],.031,saddle);
  rod(frame,[.41,1.405,-.234],[.52,1.402,-.19],.031,saddle);
  tube(frame,[[.517,1.40,.20],[.68,1.24,.22],[.69,1.00,.10],[.57,1.038,.07]],.008,ink);
  ell(frame,.534,1.461,.198,.041,.030,.040,brass);
  // Chaincase, crank, pedals, rear carrier and sprung headlamp.
  tube(frame,[[rear,.58,.10],[-.57,.568,.10],[-.18,.575,.10],[.01,.528,.10],[.045,.454,.10],
    [-.044,.377,.10],[-.37,.406,.10],[-.78,.485,.10],[rear,.535,.10],[rear,.58,.10]],.022,enamel,50);
  tor(frame,bb[0],bb[1],.11,.108,.016,edge);
  rod(frame,[bb[0],bb[1],.134],[.023,.32,.14],.018,silver);
  box(frame,.023,.317,.185,.098,.03,.088,dark);
  rod(frame,[bb[0],bb[1],-.090],[-.14,.598,-.10],.018,silver);box(frame,-.14,.598,-.16,.098,.03,.08,dark);
  for(const side of [-1,1]){
    rod(frame,[-.85,.57,side*.06],[-1.12,1.22,side*.076],.012,silver);
    rod(frame,[-.85,.57,side*.06],[-.59,1.22,side*.076],.012,silver);
    tube(frame,[[-1.22,1.22,side*.074],[-1.18,1.242,side*.09],[-.57,1.242,side*.09],[-.51,1.19,side*.056]],.017,red);
  }
  for(let x=-1.15;x<-.52;x+=.12)rod(frame,[x,1.237,-.083],[x,1.237,.083],.009,silver);
  rod(frame,[.55,1.08,0],[.76,1.10,0],.015,silver);
  ell(frame,.765,1.11,0,.096,.066,.063,brass);
  const lens=mat(0xe4e4cc,.10,.46,{envMapIntensity:1.4});
  ell(frame,.84,1.11,.002,.024,.054,.052,lens);
  rod(frame,[-.24,.47,.072],[-.41,.041,.25],.014,dark);
  // Woven open willow basket, including its rim, uprights and individual weavers.
  const willow=[mat(0xc5a371,.77),mat(0xb28a5e,.76),mat(0xd0ac76,.70)];
  function basketPt(a,h,bulge=0){return [.92+Math.cos(a)*(.16+h*.24+bulge),1.20+h,Math.sin(a)*(.18+h*.19+bulge)];}
  for(let k=0;k<12;k++){
    const h=k*.021,pts=[];for(let n=0;n<48;n++)pts.push(basketPt(n*TAU/48,h,(n%2?1:-1)*.004));
    tube(frame,pts,k===11?.013:.009,willow[k%3],64,5,true);
  }
  for(let k=0;k<24;k++){
    const a=k*TAU/24;tube(frame,[basketPt(a,0),basketPt(a+.014,.114),basketPt(a,.235)],.007,willow[1],6,5);
  }
  ell(frame,.919,1.20,0,.16,.014,.18,willow[1]);
  batch(frame);
  function place(){
    const {head:h,pot:p,bike:b,narrow}=game.layout;
    sprinkler.position.set(h.x,0,h.z);potRoot.position.set(p.x,0,p.z);
    bike.position.set(b.x,0,b.z);bike.rotation.set(-.105,narrow?-.39:-.22,-.019);
    layHose();
  }
  place();
  return {sprinkler,body,valve,spindle,potRoot,potBody,bike,place,wheels,
    update(){
      const s=game.s; spindle.rotation.y=-s.heading;spindle.rotation.z=s.wiggle.head*.15; valve.rotation.y=s.valve*2.25;valve.rotation.z=s.wiggle.valve*.08;
      potBody.rotation.z=s.wiggle.pot*.020;
      bike.rotation.z=-.019+s.wiggle.bike*.015;
      const f=Math.min(1,s.potL/game.cap),y=.151+f*.64;
      waterSurface.visible=s.potL>.007;waterSurface.position.y=y+s.wave;waterSurface.scale.set(.252+.171*f,1,.252+.171*f);
      ripple.visible=s.potL>.1;ripple.position.y=y+.009+s.wave;ripple.scale.setScalar(.64+f*.75+Math.min(.20,Math.abs(s.waveV)*8));
      for(let i=0;i<10;i++){const film=s.rim[i].film;rimStreams[i].visible=film>.0009;rimStreams[i].scale.y=Math.min(1,film*85);}
      leaf.position.set(s.leafX,s.leafLift+.012,s.leafZ);leaf.rotation.z=.09+s.leafSpeed*1.3+s.waveV;
      wheels[1].rotation.z=s.wheel;
      for(const m of mudDots){let f=s.mud[m.i].mass/s.mud[m.i].initial;m.o.visible=f>.017;m.o.scale.set(Math.sqrt(f),Math.sqrt(f),f);}
    }};
}
