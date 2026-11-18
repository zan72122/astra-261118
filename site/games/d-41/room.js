'use strict';
function makeRoom(scene,D,W0,physics){
  const {T,PI,V,group,rand,mat,M,mesh,box,ball,cyl,rod,line,tor,shape,round,lathe,disc,screw,batch}=Craft;
  const {NX,NY,H}=physics, modules=[],root=group(scene), fanH=.52,wear=mat(0xaab1a0,.46);
  const veil=mat(0xffffff,.9,0,{side:T.DoubleSide,vertexColors:true}),ivory=new T.Color(0xf1ead4),thread=new T.Color(0x93a295);
  function arch(w,h,outer){
    const s=new T.Shape(),n=72;
    s.moveTo(-w/2-outer,-.12);s.lineTo(-w/2-outer,h);
    for(let i=0;i<=n;i++){const a=PI-PI*i/n;s.lineTo((w/2+outer)*Math.cos(a),h+(fanH+outer)*Math.sin(a));}
    s.lineTo(w/2+outer,-.12);s.lineTo(w/2,-.12);s.lineTo(w/2,h);
    for(let i=0;i<=n;i++){const a=PI*i/n;s.lineTo(w/2*Math.cos(a),h+fanH*Math.sin(a));}
    s.lineTo(-w/2,-.12);s.closePath();return s;
  }
  function glass(w){
    const a=new Uint8Array(NX*NY*4),tex=new T.DataTexture(a,NX,NY);
    tex.minFilter=tex.magFilter=T.LinearFilter;tex.needsUpdate=true;
    const m=new T.MeshPhysicalMaterial({color:0xecf6ed,roughness:.19,roughnessMap:M.steel.roughnessMap,metalness:0,transmission:1,thickness:.013,ior:1.48,envMapIntensity:.51});
    const span={value:w};m.onBeforeCompile=sh=>{
      sh.uniforms.wetField={value:tex};sh.uniforms.span=span;
      sh.vertexShader='varying vec2 paneUV;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npaneUV=uv;');
      sh.fragmentShader='varying vec2 paneUV;uniform sampler2D wetField;uniform float span;\n'+`
float rndP(vec2 q){return fract(sin(mod(dot(q,vec2(47.19,117.71)),221.09))*14317.13);}
float nP(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(rndP(i),rndP(i+vec2(1,0)),f.x),mix(rndP(i+vec2(0,1)),rndP(i+1.),f.x),f.y);}
vec3 beads(vec2 p){
  vec2 id=floor(p);float k=rndP(id);vec2 c=vec2(.24+.52*rndP(id+2.),.25+.49*k);
  vec2 d=(fract(p)-c)/vec2(.74,1.08);float r=.07+.20*k*k;
  float h=1.-smoothstep(r*.53,r+.018,length(d));
  return vec3(d/max(.07,r)*h,h);
}
`+sh.fragmentShader;
      sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>',`
#include <roughnessmap_fragment>
vec4 field=texture2D(wetField,paneUV);
vec2 meter=paneUV*vec2(span,3.);
float fogGrain=.54*nP(meter*2.9)+.29*nP(meter*7.9)+.17*nP(meter*18.);
vec3 drop=beads(meter*28.6);
vec3 smallDrop=beads(meter*81.4+2.);
float deposit=field.r;
float trail=smoothstep(.48,.8,nP(vec2(meter.x*25.,meter.y*1.7)))*.42;
float damp=deposit*(.88-trail)+field.g*.75;
drop=(drop+.40*smallDrop)*clamp(damp,0.,1.);
roughnessFactor=clamp(.075+deposit*(.12+.11*fogGrain)+.11*field.b-.07*drop.z-.10*field.g,.036,.58);
`).replace('#include <normal_fragment_maps>',`
#include <normal_fragment_maps>
normal=normalize(normal+vec3(drop.xy*.73,0.));
`).replace('#include <transmission_fragment>',`
#ifdef USE_TRANSMISSION
vec4 clipP=projectionMatrix*viewMatrix*vec4(vWorldPosition,1.);
vec2 screenP=clipP.xy/clipP.w*.5+.5;
screenP+=drop.xy*.0009+vec2(field.b*.0008,0.);
float straightThrough=.20+.75*(1.-deposit);
vec3 sharp=textureLod(transmissionSamplerMap,screenP,0.).rgb;
float lod=clamp(log2(transmissionSamplerSize.x)*(.21+.34*fogGrain+.11*trail),1.,7.);
vec3 scattered=textureLod(transmissionSamplerMap,screenP,lod).rgb;
float rim=pow(clamp(1.-min(min(paneUV.x,1.-paneUV.x),min(paneUV.y,1.-paneUV.y))*4.,0.,1.),2.);
scattered=mix(scattered,vec3(.66,.78,.77),.21+.30*fogGrain+.07*rim);
totalDiffuse=mix(scattered,sharp,clamp(straightThrough-.55*field.b,0.,1.))*.982;
totalDiffuse+=vec3(.88,.93,.88)*max(0.,-drop.x*.32+drop.y*.58)*.18;
float speck=beads(meter*109.+8.).z*step(.90,rndP(floor(meter*109.+8.)));
 totalDiffuse*=1.-drop.z*.06-.12*deposit*speck;
material.transmissionAlpha=1.;
#endif
`);
    };
    return {m,a,tex,span};
  }
  function curtain(parent,side,w){
    const g=group(parent,side*(w/2+.33),0,.22),verts=[],idx=[],colors=[];const ni=30,nj=26;
    for(let j=0;j<=nj;j++)for(let i=0;i<=ni;i++){
      const u=i/ni,v=j/nj,k=Math.exp(-((v-.60)**2)/.009);
      const width=.48+.18*(1-v)-.37*k;
      verts.push(side*((u-.5)*width+.04+.10*k),4.61-v*3.73+.028*Math.cos(u*PI*8)*v,.1+(.067+.022*v)*(1-.7*k)*Math.cos(u*PI*10)-.025*Math.cos(v*4));
      const tint=(i===3||i===6)?thread:ivory;colors.push(tint.r,tint.g,tint.b);
      if(i&&j){const n=j*(ni+1)+i;idx.push(n-ni-2,n-ni-1,n,n-ni-2,n,n-1);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();
    geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const m=mesh(g,geo,veil);m.castShadow=true;
    line(g,[[side*-.03,2.34,.15],[side*.09,2.29,.20],[side*.23,2.35,.13]],.016,M.gold);
    line(g,[[side*.09,2.29,.18],[side*.11,2.12,.18],[side*.15,2.03,.18]],.009,M.brass);
    cyl(g,side*.15,1.99,.18,.016,.035,.10,M.gold,16);
  }
  const badges=[];
  function symbol(p,kind,r,m){
    const g=group(p,0,0,.023);g.scale.setScalar(r);
    const path=(pts,r=.060,smooth=false)=>line(g,pts.map(([x,y])=>[x,y,0]),r,m,smooth);
    if(kind===0){path([[0,-.52],[0,.19]],.083);const a=new T.Shape();a.moveTo(-.42,-.04);a.quadraticCurveTo(-.67,.12,-.4,.31);a.quadraticCurveTo(-.38,.55,-.16,.47);a.quadraticCurveTo(.04,.77,.24,.46);a.quadraticCurveTo(.54,.51,.48,.22);a.quadraticCurveTo(.68,-.09,.35,-.10);a.quadraticCurveTo(.16,-.26,-.02,-.15);a.quadraticCurveTo(-.27,-.26,-.42,-.04);shape(g,a,.037,m,0,0,0,.012);}
    if(kind===1){path([[-.56,-.34],[.56,-.34],[.56,.34],[-.56,.34],[-.56,-.34]]);path([[-.54,.31],[0,-.05],[.54,.31]]);}
    if(kind===2){path([[-.65,-.32],[-.16,.41],[.08,.04],[.28,.28],[.62,-.32],[-.65,-.32]]);path([[-.31,.17],[-.15,.09],[-.04,.21]],.044);disc(g,.42,.44,.01,.105,.025,m);}
    if(kind===3){path([[-.55,.20],[-.05,.20],[.2,.24],[.28,.43],[.14,.52],[.035,.45]],.058,true);path([[-.63,-.07],[.23,-.07],[.47,-.02],[.53,.12]],.06,true);path([[-.3,-.31],[.1,-.31],[.23,-.42],[.15,-.53]],.055,true);}
  }
  function progress(frame,idx){
    const g=group(frame,0,-.50,.16),rad=.130,gap=.365,len=gap*3+.53;
    round(g,0,0,-.025,len,.34,.045,.166,M.edge,.012);
    round(g,0,0,.007,len-.025,.312,.018,.151,M.brass,.004);
    round(g,0,0,.024,len-.058,.276,.018,.133,M.dark,.006);
    const badgeMat=[];
    for(let i=0;i<4;i++){
      const p=group(g,(i-1.5)*gap,0,.052);
      const enamel=mat(i===idx?0x7b8f72:0x726b56,.39,.23);badgeMat.push(enamel);
      disc(p,0,0,0,rad,.03,M.brass);disc(p,0,0,.018,rad*.86,.015,enamel);
      tor(p,0,0,.029,rad*.92,.007,M.gold);symbol(group(p,0,0,.012),i,rad*.95,i<=idx?M.cream:M.gold);
      if(i<3)disc(g,(i-1)*gap,0,.058,.014,.01,M.brass);
    }batch(g);badges.push(badgeMat);
  }
  function buildModule(i){
    const w=W0*(i===2?1.055:1),anchor=group(root,D*i,0,0),fixed=group(anchor),frame=group(fixed);
    // Full-depth plaster reveal follows the arched glazing.
    const wall=new T.Shape();const wallHalf=w/2+.228;wall.moveTo(-wallHalf,-2.8);wall.lineTo(wallHalf,-2.8);wall.lineTo(wallHalf,5.8);wall.lineTo(-wallHalf,5.8);wall.closePath();
    const cut=new T.Path();cut.moveTo(-w/2-.035,-.04);cut.lineTo(-w/2-.035,H);
    for(let k=0;k<=72;k++){const a=PI-PI*k/72;cut.lineTo((w/2+.035)*Math.cos(a),H+(fanH+.03)*Math.sin(a));}
    cut.lineTo(w/2+.035,-.04);cut.closePath();wall.holes.push(cut);
    shape(frame,wall,.22,M.plaster,0,0,-.37,0);
    shape(frame,arch(w,H,.196),.10,M.dark,0,0,-.125,.014);
    shape(frame,arch(w+.047,H,.157),.10,M.wood,0,0,-.075,.021);
    shape(frame,arch(w+.266,H,.025),.039,M.edge,0,.009,.054,.010);
    shape(frame,arch(w+.055,H,.032),.055,M.cross,0,0,.046,.013);
    shape(frame,arch(w-.015,H,.026),.046,M.brass,0,0,-.021,.006);
    // Reeded fanlight, with a machined half-sun at the base of the ribs.
    const fanShape=new T.Shape();fanShape.moveTo(-w/2,0);
    for(let k=0;k<=72;k++){const a=PI-PI*k/72;fanShape.lineTo(w/2*Math.cos(a),fanH*Math.sin(a));}fanShape.closePath();
    const fanMat=mat(0xd3e2d6,.13,.13,{transparent:true,opacity:.33,side:T.DoubleSide,depthWrite:false});
    shape(frame,fanShape,.012,fanMat,0,H,-.065,0).castShadow=false;
    for(let k=1;k<8;k++){const a=k*PI/8;rod(frame,[0,H+.006,.016],[Math.cos(a)*w*.5,H+Math.sin(a)*fanH,.016],.016,M.brass,.013);}
    ball(frame,0,H+.01,.051,.145,.145,.050,M.gold);
    box(frame,0,H-.034,.088,w+.098,.112,.136,M.cross);box(frame,0,H+.032,.107,w+.10,.021,.150,M.edge);
    for(const q of [-1,1])curtain(frame,q,w);
    for(const q of [-1,1])screw(frame,q*(w/2+.12),H-.14,.084,.022);
    // Glazed sash is one physical leaf hinged on its left jamb.
    const pivot=group(anchor,-w/2,0,-.033),sash=group(pivot,w/2,0,0),wood=group(sash);
    for(const sign of [-1,1]){
      box(wood,sign*(w/2-.045),H*.5,.035,.085,H,.114,M.wood);
      box(wood,sign*(w/2-.090),H*.5,.053,.018,H-.09,.055,M.edge);
      box(wood,sign*(w/2-.105),H*.5,.018,.014,H-.12,.02,M.dark);}
    for(const y of [.056,H-.055]){box(wood,0,y,.035,w,.11,.12,M.cross);box(wood,0,y+(y<1?.057:-.057),.063,w-.14,.022,.05,M.edge);}
    for(const y of [.44,2.51]){cyl(frame,-w/2-.009,y,.14,.026,.026,.165,M.brass,20);ball(frame,-w/2-.009,y+.091,.14,.027,.021,.027,M.gold);}
    const gpu=glass(w),pane=mesh(sash,new T.PlaneGeometry(w,H),gpu.m,0,H*.5,-.013);
    pane.castShadow=false;pane.receiveShadow=false;
    const handle=group(sash,w/2-.054,1.28,.117);
    round(handle,0,0,0,.092,.33,.028,.044,M.brass);
    for(const y of [-.118,.118])screw(handle,0,y,.018,.014);
    const lever=group(handle,0,0,.042);rod(lever,[0,0,0],[0,0,.073],.034,M.brass);
    line(lever,[[0,.01,.080],[-.023,-.05,.091],[-.045,-.216,.114],[-.03,-.261,.111]],.028,M.gold);batch(wood);batch(lever);
    const wings=[-1,1].map(sign=>box(root,i*D+sign*D*.4,1.5,-.26,1,8.6,.22,M.plaster));
    const ledge=group(anchor);box(ledge,0,-.225,.196,D+.01,.28,.60,M.wood);
    round(ledge,0,-.092,.26,D+.018,.120,.79,.023,M.cross,.019);
    box(ledge,0,-.178,.558,D+.02,.034,.093,M.edge);box(ledge,0,-.234,.503,D,.025,.079,M.dark);
    box(ledge,0,-1.43,-.068,D+.01,2.27,.20,M.panel);
    box(ledge,0,-.32,.041,D,.084,.10,M.trim);box(ledge,0,-.375,.034,D,.028,.09,wear);
    for(let k=-9;k<=9;k++){const x=k*D/19;box(ledge,x,-1.46,.038,.018,2.16,.02,wear);box(ledge,x+.012,-1.46,.042,.014,2.16,.017,M.trim);}
    progress(frame,i);batch(frame);batch(ledge);
    const bigDrops=new T.InstancedMesh(new T.SphereGeometry(1,10,7),mat(0xc7ddd5,.10,.32,{transparent:true,opacity:.47,depthWrite:false}),52);
    bigDrops.frustumCulled=false;bigDrops.renderOrder=3;sash.add(bigDrops);
    modules.push({anchor,ledge,wings,wallHalf,fixed,pivot,sash,pane,lever,handle,gpu,w,bigDrops});
  }
  for(let i=0;i<3;i++)buildModule(i);

  const clothTex=Craft.texture(256,256,(u,v,x,y)=>{const stripe=(u>.11&&u<.136)||(u>.151&&u<.165)||(u>.84&&u<.855)||(u>.87&&u<.89);
    const c=stripe?[101,133,137]:[229,218,190],n=5*(x%3===0)+4*(y%4===0)+6*Craft.hash(x,y);return c.map(k=>k-n);},true);
  const linen=mat(0xffffff,.91,0,{map:clothTex,side:T.DoubleSide});
  function towel(p){
    const g=group(p,0,-.020,.44);g.rotation.y=.13;
    for(let layer=0;layer<3;layer++){
      const geom=new T.PlaneGeometry(.97-layer*.025,.51,30,24);const a=geom.attributes.position;
      for(let j=0;j<a.count;j++){const x=a.getX(j),z=a.getY(j);const over=Math.max(0,z-.145);a.setXYZ(j,x,.016*layer+.009*Math.sin(x*34+layer*.29)+.012*Math.cos(z*19+x*8)-over*1.05,z-over*.65);}
      geom.computeVertexNormals();mesh(g,geom,linen,layer*.011,0,0);}
  }
  const tray=group(scene);towel(tray);
  const bucket=group(tray,-.062,.023,.335),pailBody=group(bucket);
  const enamel=mat(0x75a39b,.30,.38),inside=mat(0x9bb8ab,.29,.32),baseR=.285,topR=.355;
  lathe(pailBody,0,0,0,[[.02,.01],[baseR-.02,.01],[baseR,.032],[baseR+.008,.07],[topR-.015,.48],[topR,.50],[topR,.522],[topR-.014,.535],[topR-.027,.516],[baseR-.004,.061],[.01,.061]],enamel);
  tor(pailBody,0,.518,0,topR-.005,.016,M.cream,true);tor(pailBody,0,.046,0,baseR-.001,.016,enamel,true);
  for(const y of [.118,.144,.418])tor(pailBody,0,y,0,baseR+.070*(y/.51),.006,inside,true);
  const water=cyl(bucket,0,.425,0,.324,.322,.009,M.water,64);
  const handle=group(bucket,0,.404,0);
  const wire=[];for(let i=0;i<=24;i++){const a=PI*i/24;wire.push([Math.cos(a)*.355,Math.sin(a)*.437,.005+Math.sin(a)*.056]);}line(handle,wire,.009,M.steel);
  rod(handle,[-.105,.426,.059],[.105,.426,.059],.032,M.wood,.032,24);for(const sx of [-1,1]){rod(handle,[sx*.087,.426,.059],[sx*.103,.426,.059],.034,M.brass);ball(pailBody,sx*.338,.405,0,.024,.039,.045,M.steel);}
  const label=group(pailBody,0,.281,.328);disc(label,0,0,0,.081,.012,M.brass);disc(label,0,0,.009,.071,.013,M.sage);tor(label,0,0,.02,.069,.0038,M.cream);
  const dew=new T.Shape();dew.moveTo(0,.045);dew.bezierCurveTo(-.007,.023,-.039,-.005,-.029,-.029);dew.bezierCurveTo(-.012,-.052,.034,-.044,.032,-.016);dew.quadraticCurveTo(.028,.003,0,.045);shape(label,dew,.004,M.cream,0,0,.017,.002);
  basketDetail();
  function basketDetail(){
    const ragGeo=new T.PlaneGeometry(.13,.34,14,18),a=ragGeo.attributes.position;
    for(let i=0;i<a.count;i++){const x=a.getX(i),t=a.getY(i)/.34+.5,ang=-.75+x/.34,r=.317+.047*Math.sin(t*PI);
      a.setXYZ(i,Math.sin(ang)*r,.535-.18*t+.022*Math.sin(t*PI)+.008*Math.cos(x*61),Math.cos(ang)*r+.025*t);}
    ragGeo.computeVertexNormals();mesh(pailBody,ragGeo,linen);
  }
  batch(pailBody);batch(handle);
  // Rubber lip, stainless channel, twin rivets, ferrule and a bored wooden grip.
  const tool=group(scene),toolModel=group(tool);round(toolModel,0,0,0,.76,.071,.039,.018,M.rubber);
  round(toolModel,0,-.038,.018,.717,.064,.061,.017,M.steel);
  round(toolModel,0,-.066,.041,.65,.022,.037,.007,M.brass,.004);
  const shoe=new T.Shape();shoe.moveTo(-.159,-.051);shoe.quadraticCurveTo(-.11,-.097,-.054,-.172);shoe.quadraticCurveTo(0,-.197,.054,-.172);shoe.quadraticCurveTo(.105,-.097,.159,-.051);shoe.closePath();
  shape(toolModel,shoe,.038,M.brass,0,0,.036,.009);
  for(const x of [-.258,.258])screw(toolModel,x,-.032,.057,.017);
  disc(toolModel,0,-.102,.083,.023,.015,M.gold);
  cyl(toolModel,0,-.203,.055,.048,.055,.125,M.brass);
  const handleMat=mat(0xb97048,.42,0,{map:M.wood.map});
  lathe(toolModel,0,-.242,.054,[[.045,.035],[.055,.014],[.063,-.020],[.058,-.061],[.049,-.136],[.058,-.23],[.070,-.35],[.068,-.418],[.056,-.452],[.032,-.469],[.001,-.473]].reverse(),handleMat);
  for(const y of [-.265,-.282,-.596,-.611])tor(toolModel,0,y,.055,y>-.4?.058:.068,.004,M.dark,true);
  ball(toolModel,0,-.658,.104,.018,.022,.009,M.dark);tor(toolModel,0,-.658,.110,.018,.004,M.brass);
  line(toolModel,[[-.009,-.66,.11],[-.019,-.72,.105],[.017,-.779,.094],[.061,-.753,.084],[.041,-.697,.064],[.013,-.657,.067]],.007,M.dark);
  batch(toolModel);
  // A translucent, porcelain-like pointing fingertip is the idle demonstration.
  const demo=group(scene),ghost=mat(0xffeccd,.37,.07,{transparent:true,opacity:.65,depthWrite:false});
  const tip=group(demo,0,-.022,0);ball(tip,.012,-.172,0,.082,.090,.044,ghost);
  const finger=(x,y,h,r,tilt)=>{const m=mesh(tip,new T.CapsuleGeometry(r,h,5,10),ghost,x,y,.014);m.rotation.z=tilt;};
  finger(-.041,-.041,.142,.024,-.13);finger(.008,-.113,.055,.023,-.14);finger(.052,-.133,.046,.021,-.28);finger(.087,-.156,.032,.018,-.34);finger(-.064,-.156,.068,.024,.75);
  demo.rotation.z=-.39;batch(demo);
  const dummy=new T.Object3D(),moteMat=mat(0xf3deaa,.56,0,{transparent:true,opacity:.49,depthWrite:false,emissive:0x8b7950,emissiveIntensity:.25});
  const motes=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),moteMat,48);motes.frustumCulled=false;scene.add(motes);
  const toolPose=V(0,0,0),rest=V(0,0,0),dull=new T.Color(0x726b56),lit=new T.Color(0x7b8f72);
  function update(s,wBase){
    const idx=Math.min(s.stage,2),active=modules[idx],scale=wBase/W0;
    for(let j=0;j<3;j++){const m=modules[j],p=s.panes[j];
      m.anchor.scale.x=scale;m.ledge.scale.x=1/scale;
      const edge=m.wallHalf*scale,wingW=Math.max(.008,D/2-edge);
      m.wings.forEach((wing,n)=>{wing.scale.x=wingW+.002;wing.position.x=D*j+(n?1:-1)*(edge+wingW/2);});m.anchor.visible=Math.abs(s.rail-j)<1.36||s.walk>.01;
      m.gpu.span.value=m.w*scale;m.pivot.rotation.y=j===2?s.angle:0;m.lever.rotation.z=j===2?-s.latch*1.35:0;
      if(!m.anchor.visible)continue;
      const a=m.gpu.a;for(let i=0;i<NX*NY;i++){a[i*4]=Math.round(255*p.haze[i]);a[i*4+1]=Math.round(255*p.film[i]);a[i*4+2]=Math.round(255*p.ridge[i]);a[i*4+3]=255;}m.gpu.tex.needsUpdate=true;
      for(let i=0;i<p.drops.length;i++){const d=p.drops[i],r=.012*Math.sqrt(d.mass);
        dummy.position.set((d.u-.5)*m.w,d.v*H,.004);dummy.scale.set(r,r*(1.29+d.vy*4),r*.47);dummy.updateMatrix();m.bigDrops.setMatrixAt(i,dummy.matrix);}m.bigDrops.instanceMatrix.needsUpdate=true;
    }
    badges[2][3].color.copy(dull).lerp(lit,s.latch);
    const w=active.w*scale;
    tray.position.set(-wBase*.305,-.018,.04);handle.rotation.x=-.22+s.water*.8;water.rotation.z=s.water;
    const transition=s.mode==='travel'||s.mode==='home';
    rest.set(D*s.rail+w*.234,.688,.34);toolPose.set(D*idx+(s.tool.x-.5)*w,s.tool.y*H,.129);
    tool.position.set(D*s.rail+(s.tool.x-.5)*w,s.tool.y*H,s.tool.z);
    tool.rotation.set(-.05+s.tool.roll*.57,s.tool.roll*.28,s.tool.roll);
    tool.visible=s.walk<.90;tray.visible=s.rail<.90;
    for(let i=0;i<s.motes.length;i++){const d=s.motes[i];dummy.position.set(D*s.rail+d.x*w*.75,d.y,.21+d.z*1.5);dummy.scale.setScalar(.0027+(i%4)*.001);dummy.updateMatrix();motes.setMatrixAt(i,dummy.matrix);}motes.instanceMatrix.needsUpdate=true;
    demo.visible=s.hint>.01&&!s.tool.down&&!transition&&['wipe','mail','garden','latch','outside'].includes(s.mode);
    if(demo.visible){
      const span=3.9,part=s.hintAge%span/span,show=Math.min(1,part*13,(1-part)*9);ghost.opacity=.59*s.hint*show;
      if(s.mode==='wipe'){const move=Math.min(1,Math.max(0,(part-.18)/.65));demo.position.copy(s.tool.held?toolPose:rest);demo.position.y+=.05+move*.85;demo.position.x-=move*.29;demo.position.z+=.16;}
      if(s.mode==='latch')demo.position.set(D*2+w/2-.06,1.22+part*.12,.34);
      if(s.mode==='garden')demo.position.set(.49,.59+part*.13,-4.04);
      if(s.mode==='mail')demo.position.set(D+.57,1.26+part*.22,-3.15);
    }
  }
  return {modules,tool,bucket,tray,demo,ghost,update};
}
