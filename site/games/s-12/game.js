(()=>{
'use strict';
const C=Craft,T=THREE,{PI,V,group,mesh,box,line,ring,ball,mat,phys}=C;
const stage=document.querySelector('main'),gl=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.72));gl.shadowMap.enabled=true;gl.shadowMap.type=T.PCFShadowMap;
gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=1.20;gl.outputColorSpace=T.SRGBColorSpace;
gl.transmissionResolutionScale=.48;
stage.appendChild(gl.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x2f4145);
const cam=new T.PerspectiveCamera(32,1,.1,100),ambient=new T.HemisphereLight(0xf9eee0,0x9bb4b9,1.06);
scene.add(ambient);
const key=new T.DirectionalLight(0xffe0b1,3.25);key.position.set(-4.6,5.8,9.5);key.castShadow=true;scene.add(key,key.target);
Object.assign(key.shadow.camera,{left:-9,right:9,top:10,bottom:-10,near:.3,far:30});
key.shadow.mapSize.set(1536,1536);key.shadow.normalBias=.018;key.shadow.bias=-.00022;key.shadow.radius=2.2;
const model=new CandyBatch();window.__GAME__={step(dt){model.step(dt);},getState(){return model.getState();}};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
let portrait,worldW,worldH,layout,stamp=0,lastBatch=1,desk,details;
const hero=group(scene),sugarRoot=group(hero),table=group(scene),mount=group(hero);
C.hardware(mount);C.bake(mount);
const frame=group(scene),dish=group(scene),sheet=C.paper(scene),instrument=C.shears(scene);
const tray=group(dish);C.plate(tray,1.08);C.bake(tray);
C.wrapped(dish,-.12,.26,.48,-.23,.91);C.wrapped(dish,.20,-.29,.48,.13,.74,C.blueprint);
const legend=C.guide(scene);
const glove=C.hand(scene,1),father=C.hand(scene,0),family=C.hand(scene,2);
const lanterns=[C.lantern(scene,1),C.lantern(scene,1)];
const clampFoot=group(hero);box(clampFoot,0,0,0,.31,.94,.11,C.iron,.09);box(clampFoot,0,0,.12,.13,.89,.09,C.brass,.055);C.bake(clampFoot);
const workPad=group(scene);
box(workPad,0,0,-.13,2.34,1.87,.09,C.darkwood,.16,.035);
const sheetStack=mat(0xd4c8aa,.77);
for(let k=0;k<3;k++){let z=mesh(workPad,C.sheetGeometry(2.12,1.65),sheetStack,(k-1)*.013,k*.015,-.012+k*.016);z.rotation.z=.026*k;}
C.bake(workPad);
const foldMarks=group(sheet.g),stampInk=mat(0xb97160,.67);
for(let s of [-1,1])for(let i=0;i<2;i++)line(foldMarks,[[s*(.90-i*.055),-.77,.058],[s*(.90-i*.055),0,.051],[s*(.90-i*.055),.77,.058]],.009,stampInk,9,4);
C.flower(foldMarks,.68,-.52,.075,.128,stampInk);C.bake(foldMarks);
const parcel=C.wrapped(scene,0,0,0,.12,1.02);parcel.visible=false;
const pot=group(scene);
function cookingPot(){
  let copper=phys(0xa56443,.33,{metalness:.69,clearcoat:.21}),inside=phys(0xbf7625,.19,{clearcoat:.88});
  let b=C.revolve(pot,[[.02,-.05],[.67,-.04],[.83,.09],[.96,.55],[.98,.64],[.94,.65],[.89,.57],[.67,.04],[.02,.03]],copper);
  b.rotation.x=PI/2;ring(pot,0,0,.64,.96,.032,C.brass);C.disk(pot,0,0,.42,.88,.031,inside);
  for(let s of [-1,1])line(pot,[[s*.89,-.29,.43],[s*1.13,-.27,.46],[s*1.22,0,.48],[s*1.13,.27,.46],[s*.89,.29,.43]],.055,C.iron);
  let spoon=group(pot,.04,.05,.47);spoon.rotation.z=-.40;spoon.rotation.x=.22;
  ball(spoon,0,-.26,0,.26,.39,.069,C.wood);box(spoon,0,.77,.018,.144,1.68,.084,C.wood,.07,.02);
  C.bake(pot);
}
cookingPot();
const waterCup=group(scene);
const glass=phys(0xc0e0dd,.095,{transmission:.88,thickness:.13,ior:1.49,clearcoat:.88,side:T.DoubleSide});
let vessel=C.revolve(waterCup,[[.02,0],[.35,0],[.41,.05],[.48,.73],[.478,.79],[.45,.798],[.439,.76],[.379,.13],[.33,.095],[.02,.095]],glass);
vessel.rotation.x=PI/2;
ring(waterCup,0,0,.787,.46,.024,glass);ring(waterCup,0,0,.08,.393,.021,glass);
const water=phys(0xb5d4ce,.07,{transmission:.80,thickness:.36,ior:1.33});
C.disk(waterCup,0,0,.38,.422,.035,water);
let paddle=box(waterCup,.08,.04,.50,.134,.71,.07,C.wood,.055,.011);paddle.rotation.x=.86;paddle.rotation.z=-.44;
C.bake(waterCup);
const rings=49,sides=64;
const candyGeo=new T.BufferGeometry(),pBuf=new Float32Array(rings*sides*3),cBuf=new Float32Array(pBuf.length),airBuf=new Float32Array(rings*sides),uvBuf=new Float32Array(rings*sides*2);
let triangles=[];
for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
  let a=i*sides+j,b=i*sides+(j+1)%sides;
  uvBuf[a*2]=i/12;uvBuf[a*2+1]=j/sides;
  if(i<rings-1)triangles.push(a,b,a+sides,b,b+sides,a+sides);
}
candyGeo.setAttribute('position',new T.BufferAttribute(pBuf,3).setUsage(T.DynamicDrawUsage));
candyGeo.setAttribute('color',new T.BufferAttribute(cBuf,3).setUsage(T.DynamicDrawUsage));
candyGeo.setAttribute('scatter',new T.BufferAttribute(airBuf,1).setUsage(T.DynamicDrawUsage));
candyGeo.setAttribute('uv',new T.BufferAttribute(uvBuf,2));candyGeo.setIndex(triangles);
const candyM=phys(0xffffff,.155,{vertexColors:true,transmission:.54,thickness:.72,ior:1.49,clearcoat:.84,clearcoatRoughness:.115,
  attenuationColor:0xffd794,attenuationDistance:1.1,envMapIntensity:1.36});
candyM.onBeforeCompile=s=>{
  s.vertexShader='attribute float scatter; varying float vScatter;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvScatter = scatter;');
  s.fragmentShader='varying float vScatter;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <transmission_fragment>',T.ShaderChunk.transmission_fragment.replace('material.transmission = transmission;','material.transmission = transmission * (1.0 - vScatter);'));
};
const candy=mesh(sugarRoot,candyGeo,candyM);candy.frustumCulled=false;
const amber=new T.Color(0xe99a2c),gold=new T.Color(0xffc258),pearl=new T.Color(0xf3e9ca),milk=new T.Color(0xfff4da);
const col=new T.Color(),white=new T.Color();
const trigCos=Array.from({length:sides},(_,i)=>Math.cos(i*PI*2/sides)),trigSin=trigCos.map((_,i)=>Math.sin(i*PI*2/sides));
function drawSugar(){
  const n=model.nodes,tEnd=model.restEnd,count=Math.max(2,Math.round((rings-1)*tEnd)+1);
  // Axial material coordinates stay attached to each longitudinal fibre.
  for(let i=0;i<count;i++){
    let b=n[i],u=b.u,l=n[Math.max(0,i-1)],r=n[Math.min(rings-1,i+1)];
    let dx=r.x-l.x,dy=r.y-l.y,dz=r.z-l.z,horiz=Math.max(.001,Math.hypot(dx,dy)),len=Math.hypot(horiz,dz);
    let ax=-dy/horiz,ay=dx/horiz,bx=-dz*dx/(len*horiz),by=-dz*dy/(len*horiz),bz=horiz/len;
    let angle=.17+.38*Math.sin(u*8.6-.9)+.15*Math.cos(u*16)+b.twist+b.shine;
    let ca=Math.cos(angle),sa=Math.sin(angle);
    let roundTip=Math.min(1,Math.sqrt((u+.00004)/.047),tEnd>.998?Math.sqrt((1.00004-u)/.057):1);
    let radius=b.radius*roundTip;
    for(let j=0;j<sides;j++){
      const c=trigCos[j],s=trigSin[j],theta=2*PI*j/sides;
      let fibre=theta+.22*Math.sin(u*6.2)+u*.60;
      let fluting=1+.022*Math.cos(7*fibre)+.015*Math.cos(4*fibre+u*5)+.009*Math.cos(13*fibre);
      let px=radius*c*fluting*1.18,py=radius*s*fluting*(.79+.06*Math.cos(3*fibre));
      let a=ca*px-sa*py,d=sa*px+ca*py,idx=(i*sides+j)*3;
      pBuf[idx]=b.x+ax*a+bx*d;pBuf[idx+1]=b.y+ay*a+by*d;pBuf[idx+2]=b.z+bz*d;
      const scatter=CandyBatch.scatterAt(b,fibre);
      const light=.48+.19*Math.cos(3*fibre)+.18*Math.cos(7*fibre+u)+.08*s;
      col.copy(amber).lerp(gold,clamp(light));white.copy(pearl).lerp(milk,light);col.lerp(white,scatter);
      cBuf[idx]=col.r;cBuf[idx+1]=col.g;cBuf[idx+2]=col.b;airBuf[i*sides+j]=scatter;
    }
  }
  candyGeo.setDrawRange(0,(count-1)*sides*6);
  candyGeo.attributes.position.needsUpdate=candyGeo.attributes.color.needsUpdate=candyGeo.attributes.scatter.needsUpdate=true;
  candyGeo.computeVertexNormals();
}
function crossTexture(air,u,spin){
  const t=C.texture(128,128,(ctx,w,h)=>{
    ctx.fillStyle='#edb25d';ctx.fillRect(0,0,w,h);ctx.translate(64,64);ctx.rotate(spin*.18+.1);
    let count=3+Math.round(air*16);
    for(let k=-count;k<=count;k++){
      let x=k*103/count;ctx.beginPath();ctx.moveTo(x-10,-100);ctx.bezierCurveTo(x+25+u*14,-43,x-31,21,x+9,100);
      ctx.lineWidth=1.5+air*3.1;ctx.strokeStyle=k%3===0?'#f4d99f':'#fff0ce';ctx.stroke();
    }
  },false);t.colorSpace=T.SRGBColorSpace;return t;
}
function bite(p,data){
  let g=group(p),r=.31+.067*data.air,w=(data.to-data.from)*4.15;
  let profile=[[.008,-w*.5],[r*.89,-w*.5],[r,-w*.5+.057],[r*1.02,0],[r,w*.5-.057],[r*.88,w*.5],[.008,w*.5]];
  let shell=phys(0xffdf9d,.21,{clearcoat:.75,map:crossTexture(data.air,data.u,data.twist)});
  let body=C.revolve(g,profile,shell);body.rotation.z=PI/2;g.scale.z=.86;
  let cutM=phys(0xffffff,.34,{map:crossTexture(data.air,data.u,data.twist),side:T.DoubleSide});
  for(let s of [-1,1]){
    let face=mesh(g,new T.CircleGeometry(r*.91,40),cutM,s*(w*.5+.004),0,0);face.rotation.y=s*PI/2;
  }
  return g;
}
const sample=bite(dish,{air:.78,u:.55,from:.25,to:.395,twist:1.25});
sample.position.set(-.42,-.54,.48);sample.scale.multiplyScalar(.89);sample.rotation.set(.12,-.73,-.43);
let chips=[],endFace=null,lastEnd=1;
const contactShadowTexture=C.texture(64,64,(ctx,w,h)=>{
  let gr=ctx.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,.68)');gr.addColorStop(.45,'rgba(255,255,255,.40)');gr.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);
},false);
const shadeM=mat(0x475953,1,0,{map:contactShadowTexture,transparent:true,opacity:.24,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
const shades=[];
for(let i=0;i<8;i++){let s=mesh(sugarRoot,new T.PlaneGeometry(1,1),shadeM);s.castShadow=false;shades.push(s);}
function hdrEnvironment(){
  // Radiance of the stall: dark rafters, two paper lanterns, open sky and white ceramic.
  const w=192,h=96,data=new Float32Array(w*h*4);
  function rect(x,y,cx,cy,rx,ry){let dx=Math.abs(x-cx);dx=Math.min(dx,1-dx);return clamp((rx-dx)*w*.7)*clamp((ry-Math.abs(y-cy))*h*.7);}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let u=x/w,v=y/h,l=v>.48?.29:.43;
    let a=rect(u,v,.19,.65,.063,.14),b=rect(u,v,.72,.64,.023,.17),c=rect(u,v,.43,.73,.12,.030),d=rect(u,v,.85,.69,.075,.09);
    let i=(y*w+x)*4;
    data[i]=l+4.8*a+3.7*b+2.4*c+1.3*d;data[i+1]=l*.97+3.48*a+3.5*b+2.14*c+.64*d;data[i+2]=l*.87+1.76*a+3.68*b+2.09*c+.31*d;data[i+3]=1;
  }
  let t=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);t.mapping=T.EquirectangularReflectionMapping;t.needsUpdate=true;
  const pm=new T.PMREMGenerator(gl),env=pm.fromEquirectangular(t);scene.environment=env.texture;scene.environmentIntensity=.69;
  t.dispose();pm.dispose();
}
const baseMats=[0xa38167,0xae8a6b,0x987b65,0xb59172,0xaa8970].map(c=>mat(c,.58,0,{map:C.wood.map}));
function disposeBaked(g){g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});g.removeFromParent();}
function resize(){
  const w=innerWidth,h=innerHeight,aspect=w/h;
  portrait=aspect<.90;worldH=portrait?Math.max(10.1,6.9/aspect):Math.max(8.95,12.4/aspect);worldW=worldH*aspect;
  gl.setSize(w,h);cam.aspect=aspect;let d=worldH/(2*Math.tan(cam.fov*PI/360));
  cam.position.set(0,-d*.113,d*.993+.12);cam.lookAt(0,0,.12);cam.updateProjectionMatrix();cam.updateMatrixWorld();
  layout=portrait?{bw:6.18,bh:Math.min(8.07,worldH*.58),bx:0,by:.28,hx:-.07,hy:.72,hs:1.06,
    px:.88,py:-Math.min(worldH*.325,4.68),dx:1.62,dy:Math.min(worldH*.32,4.42),sx:1.65,sy:-2.22,ax:-2.52,ay:-Math.min(worldH*.31,4.32)}:
    {bw:8.33,bh:5.87,bx:-1.13,by:-.06,hx:-1.20,hy:-.13,hs:1.21,px:4.27,py:-1.56,dx:4.34,dy:1.26,sx:2.15,sy:-.70,ax:-6.08,ay:-.72};
  let L=layout;
  waterCup.position.set(portrait?-2.42:-4.50,portrait?2.79:-1.83,.125);
  waterCup.scale.setScalar(portrait?.79:1.0);
  hero.position.set(L.hx,L.hy,0);hero.scale.setScalar(L.hs);
  dish.position.set(L.dx,L.dy,portrait?.12:-.24);dish.rotation.z=portrait?-.16:.13;
  sheet.g.position.set(L.px,L.py,.04);sheet.g.rotation.z=portrait?.12:-.17;workPad.position.set(L.px,L.py,-.06);workPad.rotation.z=sheet.g.rotation.z;
  pot.position.set(L.ax,L.ay,-.22);pot.scale.setScalar(portrait?.85:1.06);pot.rotation.z=.30;
  legend.g.position.set(portrait?-.22:-1.12,portrait?-worldH*.428:-worldH*.425,-.10);
  legend.g.scale.setScalar(portrait?1.01:1.03);legend.g.rotation.z=portrait?-.018:.014;
  model.paperSpot={x:(L.px-L.hx)/L.hs,y:(L.py-L.hy)/L.hs};
  if(desk)disposeBaked(desk);desk=group(table);
  C.slab(desk,L.bw,L.bh);C.bake(desk);desk.position.set(L.bx,L.by,0);
  if(details)disposeBaked(details);details=group(frame);
  const deck=group(details);
  for(let i=-9;i<=9;i++){let o=box(deck,0,i*1.54,-.61,Math.max(25,worldW+3),1.522,.31,baseMats[(i+10)%5],.02,.015);o.geometry.getAttribute('uv').array.forEach((v,k,a)=>{a[k]=v*(k%2?.59:.20)+(i%4)*.25;});}
  deck.rotation.z=-.018;
  const valance=group(details,0,worldH*.5-.42,.94);C.awning(valance,worldW+1.1,portrait?2.16:1.77);
  const ledge=group(details,0,worldH*.5-1.04,.12);box(ledge,0,0,.09,worldW+1,.27,.23,C.darkwood,.05,.039);
  for(let i=0;i<2;i++){
    let s=i?1:-1,ln=lanterns[i],sz=portrait?.87:1.03;
    ln.scale.setScalar(sz);ln.position.set(s*(worldW*.5-(portrait?.51:.94)),worldH*.5-(portrait?1.04:.47),1.39);
  }
  // Dusted granules in the creases of the wrapping bench.
  for(let i=0;i<19;i++){
    let a=i*2.399,r=.44+.77*C.rand(),s=.014+.022*C.rand();
    let o=mesh(details,new T.IcosahedronGeometry(s,0),C.ivory,L.px+1.14+Math.cos(a)*r*.35,L.py+.63+Math.sin(a)*r*.43,-.252+s);o.rotation.set(a,r,a*.5);
  }
  C.bake(details);stamp++;
}
const plume=group(scene);
const steamPuffs=Array.from({length:12},(_,i)=>{
  const material=mat(0xe8dfc7,.96,0,{transparent:true,opacity:0,depthWrite:false});
  material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= pow(abs(dot(normal,normalize(vViewPosition))),2.3);\n#include <opaque_fragment>');};
  const o=ball(plume,0,0,0,.1,.1,.1,material);o.castShadow=o.receiveShadow=false;
  return o;
});
const driftingSugar=model.dust.map((_,i)=>{
  let o=mesh(scene,new T.IcosahedronGeometry(.009+(i%3)*.006,0),C.ivory);o.castShadow=false;return o;
});
let helperTime=0,helperPhase='',parcelX=0,parcelY=0;
const smooth=(x)=>{x=clamp(x);return x*x*(3-2*x);};
const exp=(k,dt)=>1-Math.exp(-k*dt);
const worldNode=(n)=>({x:layout.hx+n.x*layout.hs,y:layout.hy+n.y*layout.hs,z:n.z*layout.hs});
const toWorld=(x,y,z=.3)=>({x:layout.hx+x*layout.hs,y:layout.hy+y*layout.hs,z:z*layout.hs});
const grabSpot=()=>({x:instrument.g.position.x+.03,y:instrument.g.position.y-.80,z:instrument.g.position.z});
const familySpot=()=>portrait?{x:2.02,y:Math.min(worldH*.27,3.84),z:.76}:{x:4.82,y:1.91,z:.76};
function poseHand(o,tip,angle,size,dt,reach=.78){
  let a=exp(8.4,dt),tx=tip.x+Math.sin(angle)*reach*size,ty=tip.y-Math.cos(angle)*reach*size;
  o.position.x=mix(o.position.x,tx,a);o.position.y=mix(o.position.y,ty,a);o.position.z=mix(o.position.z,tip.z+.075,a);
  o.rotation.z+=Math.atan2(Math.sin(angle-o.rotation.z),Math.cos(angle-o.rotation.z))*a;o.scale.setScalar(size);
}
function helper(dt){
  if(helperPhase!==model.phase||model.idle<.05){helperTime=0;helperPhase=model.phase;}
  if(model.idle>3.85)helperTime+=dt;
  const demo=model.idle>3.85&&!model.grip,period=5.0,ph=(helperTime%period)/period;
  const L=layout,readyGrip=model.grip,hook=toWorld(-.59,1.05,1.52),end=worldNode(model.at(1));
  let dest={...end},angle=portrait?.47:.62,phase=model.phase;
  if(phase==='pull'||phase==='renew'){
    const u=readyGrip?.kind==='candy'?readyGrip.u:1;dest=worldNode(model.at(u));
    if(demo&&!model.folding){
      const drag=smooth(ph/.28)*(1-smooth((ph-.32)/.35)),back=smooth((ph-.32)/.35)*(1-smooth((ph-.74)/.25));
      dest.x+=drag*(portrait?.55:.84);dest.y-=drag*.65;dest.x=mix(dest.x,hook.x,back);dest.y=mix(dest.y,hook.y,back);
      dest.z+=back*.80;
      if(model.held){dest.x=mix(end.x,hook.x,back);dest.y=mix(end.y,hook.y,back);}
    }
    dest.x+=.21;dest.y-=.12;dest.z+=.10;
    if(model.grip){dest.x=layout.hx+model.grip.x*L.hs+.16;dest.y=layout.hy+model.grip.y*L.hs-.08;}
  }else if(phase==='lay'||phase==='twist'){
    let a=2*PI*smooth((ph-.08)/.74);
    dest.x+=demo?.52*Math.sin(a):.14;dest.y+=demo?.46*(Math.cos(a)-.64):-.16;
    if(readyGrip){dest=toWorld(readyGrip.x,readyGrip.y,end.z/L.hs+.13);}dest.z+=.21;
  }else if(phase==='cut'){
    dest=grabSpot();dest.x+=.15;dest.y-=.13;dest.z+=.15;angle=.36;
    if(demo){dest.x-=.18*Math.sin(PI*smooth(ph/.8));}
  }else if(phase==='roll'){
    let piece=readyGrip?.kind==='piece'?model.pieces[readyGrip.pick]:model.pieces.find(p=>!p.onPaper)||model.pieces[0];dest=toWorld(piece.x,piece.y,piece.z+.15);
    if(demo){let a=smooth((ph-.1)/.52)*(1-smooth((ph-.74)/.22));dest.x=mix(dest.x,L.px,a);dest.y=mix(dest.y,L.py,a);}
    dest.x+=.12;dest.y-=.13;
  }else{
    dest={x:parcelX,y:parcelY,z:.62};
    if(demo&&phase==='give'){let a=smooth(ph/.61)*(1-smooth((ph-.76)/.22)),other=familySpot();dest.x=mix(dest.x,other.x,a);dest.y=mix(dest.y,other.y,a);}
    dest.x+=.12;dest.y-=.28;
  }
  if(readyGrip?.kind==='shears'){dest=grabSpot();dest.x+=.12;dest.z+=.13;}
  poseHand(glove,dest,angle,portrait?.91:1.03,dt);
  const squeeze=readyGrip?.kind==='candy'?model.at(readyGrip.u).pressure:model.blade;
  glove.userData.fingers.forEach((joint,i)=>{
    const rest=i===0?-.06:-.35-.06*i;
    joint.rotation.x=mix(joint.rotation.x,rest-.45*squeeze-.09*(demo?smooth(ph/.35)*(1-smooth((ph-.65)/.25)):0),exp(7,dt));
  });
  let toolAction=['cut','roll'].includes(phase),f=toolAction?grabSpot():toWorld(-1.14,1.78,.70);
  if(toolAction){f.x-=.19;f.y+=.05;f.z+=.04;}
  else if(phase==='lay'||phase==='renew'){
    let n=worldNode(model.at(.18));f.x=mix(f.x,n.x,Math.sin(PI*model.table));f.y=mix(f.y,n.y,Math.sin(PI*model.table));
  }else if(phase==='twist'){f=toWorld(-1.98,.10,.57);}
  f.x+=clamp(model.pull,0,1)*.055;poseHand(father,f,toolAction?-1.37:-1.08,portrait?.95:1.08,dt,.73);
  const fam=familySpot(),off=['give','receive'].includes(phase)?0:.64;
  fam.x+=off;fam.y+=off*.65;poseHand(family,fam,portrait?2.03:1.99,portrait?.86:.99,dt,.77);
  family.userData.fingers.forEach((joint,i)=>joint.rotation.x=mix(joint.rotation.x,-.14-.035*i-.63*smooth(model.delivery/.62),exp(7,dt)));
  father.userData.fingers.forEach((joint,i)=>joint.rotation.x=mix(joint.rotation.x,-.22-.056*i-.3*(toolAction?model.blade:clamp(model.pull)),exp(7,dt)));
}
function updateProps(dt){
  const L=layout,phase=model.phase,a=exp(5.7,dt),activeCut=['cut','roll'].includes(phase),cut=model.at(model.cutAt);
  sugarRoot.position.x=-(worldW*.63+3.2)/L.hs*(phase==='receive'?smooth(model.delivery):phase==='renew'?smooth(model.table):0);
  if(phase==='renew')sugarRoot.rotation.x=.16*Math.sin(PI*model.table);else sugarRoot.rotation.x=0;
  let sc=activeCut?worldNode(cut):{x:L.sx,y:L.sy,z:.22};
  let bladeAngle=activeCut?.39:.105;
  instrument.g.position.x=mix(instrument.g.position.x,sc.x,a);
  instrument.g.position.y=mix(instrument.g.position.y,sc.y-(activeCut?.47:0),a);
  instrument.g.position.z=mix(instrument.g.position.z,activeCut?.62*L.hs:sc.z,a);
  instrument.g.rotation.z=mix(instrument.g.rotation.z,activeCut?-.07:portrait?-.84:-.31,a);
  for(let i=0;i<2;i++)instrument.limbs[i].rotation.z=(i?1:-1)*bladeAngle*(1-model.blade*.95);
  clampFoot.position.set(-1.87,.02,.10+.45*smooth(model.table));clampFoot.scale.setScalar(.008+.992*smooth((model.table-.4)/.6));
  lanterns.forEach((o,i)=>{o.rotation.z=(i?.09:-.12)+model.lantern*(i?.34:-.48);o.rotation.x=.14;o.rotation.y=i?-.07:.06;});
  for(let i=0;i<shades.length;i++){
    let n=model.at((i+.3)/shades.length*model.restEnd);let s=shades[i];
    s.position.set(n.x+.04*n.z,n.y-.04*n.z,.113/L.hs+i*.00008);
    s.scale.set(.93+n.z*.18,.77+n.z*.19,1);
  }
  let index=['pull','renew','lay'].includes(phase)?(model.folds>0?1:0):phase==='twist'?1:activeCut?2:3;
  legend.q.position.x=mix(legend.q.position.x,index-1.5,a);
  if(lastBatch!==model.batch){
    for(let o of chips){o.removeFromParent();o.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.map?.dispose();m.material.dispose();}});}
    chips=[];lastBatch=model.batch;
  }
  if(endFace&&lastEnd!==model.restEnd){endFace.removeFromParent();endFace.geometry.dispose();endFace.material.map.dispose();endFace.material.dispose();endFace=null;}
  if(!endFace&&model.restEnd<.999){
    let n=model.at(model.restEnd);endFace=mesh(sugarRoot,new T.CircleGeometry(1,48),phys(0xffffff,.33,{map:crossTexture(n.air,n.u,n.twist),side:T.DoubleSide}));
    endFace.rotation.y=PI*.5;
  }
  if(endFace){let n=model.at(model.restEnd);endFace.position.set(n.x+.004,n.y,n.z);endFace.scale.set(n.radius*.82,n.radius*1.15,1);}
  lastEnd=model.restEnd;
  while(chips.length<model.pieces.length)chips.push(bite(hero,model.pieces[chips.length]));
  model.pieces.forEach((p,i)=>{let o=chips[i];o.position.set(p.x,p.y,p.z);o.rotation.y=.24+(p.y-model.at(p.u).y)*.62;o.rotation.z=.07+i*.16;o.visible=model.paper<.77;});
  let fold=model.paper;
  if(Math.abs(fold-(sheet.last||0))>.009||fold===0&&sheet.last){sheet.paper.geometry.dispose();sheet.paper.geometry=C.sheetGeometry(2.10,1.62,fold);sheet.last=fold;}
  sheet.g.visible=fold<.85;foldMarks.visible=fold<.12;
  let dest={x:L.px,y:L.py},fam=familySpot();
  if(phase==='give'&&model.grip){dest=toWorld(model.grip.x,model.grip.y);}
  if(phase==='receive'){dest={x:fam.x+.8*model.delivery,y:fam.y+.45*model.delivery};}
  if(phase!=='give'&&phase!=='receive'){parcelX=L.px;parcelY=L.py;}
  else{parcelX=mix(parcelX,dest.x,exp(12,dt));parcelY=mix(parcelY,dest.y,exp(12,dt));}
  parcel.visible=fold>.60;parcel.scale.setScalar((.45+.62*smooth((fold-.6)/.4))*(1-.42*model.delivery));
  parcel.position.set(parcelX,parcelY,.39+.41*model.delivery+(model.grip?.kind==='parcel'?.22:0));parcel.rotation.z=.16+model.delivery*.63;
  plume.position.copy(pot.position);
  model.steam.forEach((s,i)=>{
    const age=s.age/s.life,o=steamPuffs[i];
    o.position.set(s.x+age*.18,s.y+age*.77,.52+s.age*(.25+model.heatHaze*.09));
    let r=.07+age*.22;o.scale.set(r*.70,r*(1.55+age),r*.54);o.rotation.z=s.vx+age*.45;
    o.material.opacity=.065*Math.sin(PI*age)*(1+model.heatHaze*.26);
  });
  model.dust.forEach((p,i)=>driftingSugar[i].position.set(L.px+p.x,L.py+p.y,p.z));
  scene.environmentRotation.y=model.lantern*.47;
  key.intensity=3.25+model.draft*.12;
  helper(dt);
}
function draw(){
  drawSugar();cam.updateMatrixWorld();scene.updateMatrixWorld();
  if(post)post.render();else gl.render(scene,cam);
}
let post=null;
function finishPass(){
  if(!gl.extensions.has('EXT_color_buffer_float'))return;
  let rt=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:Math.min(2,gl.capabilities.maxSamples)}),blur=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
  let view=new T.OrthographicCamera(-1,1,1,-1,0,1),pass=new T.Scene(),plane=new T.PlaneGeometry(2,2);
  const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  let blurM=new T.ShaderMaterial({depthTest:false,depthWrite:false,vertexShader:vertex,uniforms:{src:{value:rt.texture},pixel:{value:new T.Vector2()}},fragmentShader:`
    uniform sampler2D src;uniform vec2 pixel;varying vec2 vUv;
    void main(){vec3 light=vec3(0.);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec3 c=texture2D(src,vUv+vec2(float(x),float(y))*pixel*4.).rgb;
    light+=max(c-vec3(1.4),vec3(0.));}gl_FragColor=vec4(light/9.,1.);}`});
  let finalM=new T.ShaderMaterial({depthTest:false,depthWrite:false,vertexShader:vertex,uniforms:{src:{value:rt.texture},bloom:{value:blur.texture}},fragmentShader:`
    uniform sampler2D src;uniform sampler2D bloom;varying vec2 vUv;
    void main(){vec3 c=texture2D(src,vUv).rgb+.044*texture2D(bloom,vUv).rgb;
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float n=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
    gl_FragColor.rgb+=n*.008;}`});
  let quad=new T.Mesh(plane,blurM);quad.frustumCulled=false;pass.add(quad);let sized=-1;
  post={render(){if(sized!==stamp){let sz=gl.getDrawingBufferSize(new T.Vector2());rt.setSize(sz.x,sz.y);blur.setSize(Math.max(4,Math.round(sz.x/8)),Math.max(4,Math.round(sz.y/8)));
    blurM.uniforms.pixel.value.set(1/sz.x,1/sz.y);sized=stamp;}
    gl.setRenderTarget(rt);gl.render(scene,cam);
    quad.material=blurM;gl.setRenderTarget(blur);gl.render(pass,view);
    quad.material=finalM;gl.setRenderTarget(null);gl.render(pass,view);
  }};
}
const ray=new T.Raycaster();
function planePoint(e,z){
  let rect=gl.domElement.getBoundingClientRect(),p=new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
  ray.setFromCamera(p,cam);let v=new T.Vector3();ray.ray.intersectPlane(new T.Plane(V(0,0,1),-z),v);
  return {x:(v.x-layout.hx)/layout.hs,y:(v.y-layout.hy)/layout.hs,wx:v.x,wy:v.y};
}
let pointer=null,touchZ=.5;
function nearest(e){
  const phase=model.phase,L=layout;
  if(phase==='pull'||phase==='twist'){
    if(phase==='pull'&&model.held){
      let p=planePoint(e,1.45*L.hs);if(Math.hypot(p.x+.59,p.y-1.05)<.68)return {kind:'hook',u:.45,z:1.45*L.hs,p};
    }
    let best=null,dist=Infinity;for(let i=0;i<rings;i++){
      let n=model.nodes[i];if(phase==='twist'&&n.u<.59)continue;
      let p=planePoint(e,n.z*L.hs),d=Math.hypot(p.x-n.x,p.y-n.y);
      if(d<n.radius*1.24+.26&&d<dist){best={kind:'candy',u:n.u,z:n.z*L.hs,p};dist=d;}
    }return best;
  }
  if(['cut','roll'].includes(phase)){
    if(phase==='roll'){
      for(let i=model.pieces.length-1;i>=0;i--){
        let n=model.pieces[i],p=planePoint(e,n.z*L.hs);
        if(!n.onPaper&&Math.hypot(p.x-n.x,p.y-n.y)<.54)return {kind:'piece',u:i,z:n.z*L.hs,p};
      }
    }
    let g=instrument.g,sp=planePoint(e,g.position.z),v=g.worldToLocal(V(sp.wx,sp.wy,g.position.z));
    if(model.restEnd>.22&&v.y<-.28&&v.y>-1.30&&Math.abs(v.x)<.78)
      return {kind:'shears',u:model.cutAt,z:g.position.z,p:sp};
  }
  if(phase==='give'){
    let p=planePoint(e,parcel.position.z);if(Math.hypot((p.wx-parcelX)/1.04,(p.wy-parcelY)/.64)<1)return {kind:'parcel',u:1,p,z:parcel.position.z};
  }
  return null;
}
gl.domElement.addEventListener('pointerdown',e=>{
  if(pointer!==null)return;let hit=nearest(e);if(!hit)return;FestivalSound.unlock();
  if(model.input('down',hit.kind,hit.p.x,hit.p.y,hit.u)){pointer=e.pointerId;touchZ=hit.z;gl.domElement.setPointerCapture(pointer);}
});
function moving(e){
  if(e.pointerId!==pointer)return;
  let p=planePoint(e,touchZ),g=model.grip;if(!g)return;
  model.input('move',g.kind,p.x,p.y,g.u);
  if(g.kind==='piece')g.overPaper=Math.hypot((p.wx-layout.px)/1.34,(p.wy-layout.py)/1.1)<1;
  if(g.kind==='parcel'){let dest=familySpot();g.overHand=Math.hypot(p.wx-dest.x,p.wy-dest.y)<1.14;}
}
gl.domElement.addEventListener('pointermove',moving);
function end(e){if(e.pointerId!==pointer)return;if(e.type==='pointerup')moving(e);model.input(e.type==='pointerup'?'up':'cancel');pointer=null;}
for(let evt of ['pointerup','pointercancel','lostpointercapture'])gl.domElement.addEventListener(evt,end);
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden){model.input('cancel');pointer=null;}lastTime=performance.now();});
resize();
instrument.g.position.set(layout.sx,layout.sy,.22);
let lastTime=performance.now();
updateProps(2);draw();
function animate(now){
  let dt=clamp((now-lastTime)/1000,0,.075);lastTime=now;
  model.step(dt);FestivalSound.update(model);updateProps(dt);draw();
  requestAnimationFrame(animate);
}
requestAnimationFrame(()=>{requestAnimationFrame(()=>{hdrEnvironment();finishPass();lastTime=performance.now();requestAnimationFrame(animate);});});
})();
