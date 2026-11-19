'use strict';
const sound=new KitchenSound(), tmp=new T.Object3D(), white=C(0xfff8e6), yolk=C(0xe8b867), eggColor=C(0xe6d9af),
shadeColor=C(0), bakeLo=C(0xffe3a8),bakeHi=C(0xb77134);
let portrait=false,first=true,halfWidth=0,viewFocus=V(0,1,.1);
const P=Pastry.phases,phaseIndex=()=>P.indexOf(sim.phase);
const relax=(x,y,d,k=4)=>first?y:x+(y-x)*(1-Math.exp(-k*d));
function place(o,x,y,z,d,k){o.position.set(relax(o.position.x,x,d,k),relax(o.position.y,y,d,k),relax(o.position.z,z,d,k));}
function size(o,s,d,k){const v=relax(o.scale.x,s,d,k);o.scale.setScalar(v);}
function cell(x,z){return sim.cells[Math.round(sat((z+1)*6,0,12))*13+Math.round(sat((x+1)*6,0,12))];}
function sample(x,z){
 const xx=sat((x+1)*6,0,11.9999),zz=sat((z+1)*6,0,11.9999),ix=xx|0,iz=zz|0;return [ix+iz*13,xx-ix,zz-iz];
}
function field(s,key){let i=s[0],x=s[1],z=s[2],a=sim.cells;return (a[i][key]*(1-x)+a[i+1][key]*x)*(1-z)+(a[i+13][key]*(1-x)+a[i+14][key]*x)*z;}
function prepareDisc(o){
 const b=o.userData.base; o.userData.samples=Array.from({length:b.length/3},(_,i)=>sample(b[i*3],b[i*3+2]));}
prepareDisc(surface);prepareDisc(cheeseSkin);
function updateSurface(o,isEgg){
 const p=o.geometry.attributes.position,colors=o.geometry.attributes.color,base=o.userData.base,ss=o.userData.samples;
 const q=sim.mean.air,rest=sim.phase==="return"?1-sat((sim.age-2.2)/2):1,drain=sim.transfer*rest,rad=(isEgg?1.209+.17*q-.40*drain:.925-.26*sim.moved/sim.mass),h0=isEgg?.919+.39*q-.56*drain:.713-.42*sim.moved/sim.mass;
 for(let i=0;i<p.count;i++){
  const x=base[i*3],z=base[i*3+2],s=ss[i],h=field(s,'h'),air=field(s,'air'),fine=field(s,'fine'),cut=field(s,'cut'),a=Math.atan2(z,x),r=Math.hypot(x,z);
  let y=h0+h*.86+.015*r**9;
  if(isEgg){
   const furrow=Math.cos(19*r-2.4*a+4*air+1.7*Math.sin(2*a))*.5+.5;
   y+=.15*(air-q)-cut*.079+air*.045*furrow+cut*.068*furrow**2;
   shadeColor.copy(eggColor).lerp(white,sat(air*1.72+fine*.8+.031*furrow));
  }else{
   const swirl=field(s,'swirl'),wr=field(s,'white'),ridge=(.5+.5*Math.cos(13*r-2*a+swirl*1.9+1.1*Math.sin(a)))**3;
   const cream=sim.phase==='whisk'?0:wr*(.13+1.7*ridge);
   y+=.039*cream+.045*cut*ridge-.047*cut;
   shadeColor.copy(yolk).lerp(white,sat(cream));
  }
  p.setXYZ(i,x*rad,y,z*rad);colors.setXYZ(i,shadeColor.r,shadeColor.g,shadeColor.b);
 }
 p.needsUpdate=true;colors.needsUpdate=true;o.geometry.computeVertexNormals();
}
function matrix(inst,i,x,y,z,sx,sy,sz){tmp.position.set(x,y,z);tmp.rotation.set(0,0,0);tmp.scale.set(sx,sy,sz);tmp.updateMatrix();inst.setMatrixAt(i,tmp.matrix);}
let popX=0,popZ=0,popSide=1,hadPop=false;
function bubbles(){
 const t=sim.tool;
 if(sim.popped&&!hadPop){popX=t.x;popZ=t.z;popSide=t.vx<0?-1:1;}hadPop=sim.popped;
 const q=sim.mean.air,r=1.209+.17*q;
 beads.forEach((b,i)=>{const c=cell(b.x,b.z),k=sat((c.air-b.threshold)*8+.23),rad=b.rad*(1-.58*c.fine)*(i<47?.95:k);
 matrix(pearls,i,b.x*r,.924+.39*q+c.h+.15*(c.air-q)-.039*c.cut,b.z*r,rad,rad*.68,rad);});
 for(let i=0;i<12;i++){let x=sat(popX-popSide*i*.043,-.9,.9),z=popZ+.031*Math.sin(i*.9),c=cell(x,z);
 let sz=sim.popped?(.061-.0029*i)*(1-.62*c.fine)*sat(sim.popAge*15-i*.15):0;
 matrix(pearls,beads.length+i,x*r,.936+.39*q+c.h,z*r,sz,sz*.77,sz);}
 for(let i=0;i<sim.trail.length;i++){const b=sim.trail[i],sz=b.life>0?b.size:0,c=cell(b.x,b.z);
 matrix(pearls,beads.length+12+i,b.x*r,.929+.39*q+c.h+.15*(c.air-q)-.04*c.cut,b.z*r,sz,sz*.72,sz);}
 pearls.instanceMatrix.needsUpdate=true;
 bigBubble.visible=!sim.popped;
 const bob=cell(t.x,t.z).h;at(bigBubble,t.x*1.01+.232,1.151+bob+t.lift*.72,-.045+t.z*.83);bigBubble.scale.setScalar(.257);
}
const panSkin=disc(64,16,batterMat.clone(),tin);prepareDisc(panSkin);
const pouringSugar=new T.Vector3(),sugarEnd=new T.Vector3(),kettleStart=new T.Vector3();
const waterStrand=strand(phys(0xcbd6ba,{roughness:.10,metalness:.23,transparent:true,opacity:.54,side:T.DoubleSide}),scene);
let frameCounter=0,previousStep=-1,grainsCarry=0,lastPaper=-1,lastPaperH=0;
const still=V(0,0,0),ovenSpot=V(0,0,0),screenPos=V(0,0,0);
function updateCake(o,phase){
 const g=o.body.geometry,p=g.attributes.position,b=o.body.userData.base,colors=g.attributes.color;
 for(let i=0;i<p.count;i++){const x=b[i*3],y=b[i*3+1],z=b[i*3+2],s=sample(x,z),rise=field(s,'rise'),jig=field(s,'jig'),brown=field(s,'brown'),moist=field(s,'moisture');
 const toast=sat((y-.56)*2.48)*sat(brown*2.65);shadeColor.copy(bakeLo).lerp(bakeHi,toast);
 const crumb=1-.025*(.5+.5*Math.sin(21*x+48*z+13*y))*(1-moist);colors.setXYZ(i,shadeColor.r*crumb,shadeColor.g*crumb,shadeColor.b*crumb);
 p.setXYZ(i,x+jig*y*.76,y*(.30+.99*rise)+jig*y*(.63+.28*x),z);}
 p.needsUpdate=true;colors.needsUpdate=true;g.computeVertexNormals();
 o.g.children[1].visible=false;

}
function particles(d){
 const s=sim;
 for(let i=0;i<dustData.length;i++){const p=dustData[i];p.x+=d*(s.weather.draft*(.53+.14*p.y));p.y-=d*p.v;if(p.y<.05){p.y=4.5;p.x=(rand()-.5)*9;}if(p.x>6)p.x=-6;if(p.x < -6)p.x=6;
 const r=.0035+(i%5)*.0011;matrix(dust,i,p.x,p.y,p.z,r,r,r);}
 dust.instanceMatrix.needsUpdate=true;
 grainsCarry+=s.dose*d*41;scoop.getWorldPosition(pouringSugar);
 for(let i=0;i<grainData.length;i++){const p=grainData[i];p.life-=d;
 if(p.life<=0&&grainsCarry>=1){grainsCarry--;p.x=pouringSugar.x-.09+rand()*.13;p.y=pouringSugar.y;p.z=pouringSugar.z+(rand()-.5)*.13;p.vx=(rand()-.68)*.21;p.vz=(rand()-.5)*.12;p.vy=-.17;p.life=.49+rand()*.10;}
 if(p.life>0){p.vy-=5.1*d;p.x+=p.vx*d;p.y+=p.vy*d;p.z+=p.vz*d;}let r=p.life>0?1:0;matrix(grains,i,p.x,p.y,p.z,r,r,r);}
 grains.instanceMatrix.needsUpdate=true;
 const ph=s.phase,steamOrigin=ph==='bath'?tray.position:ph==='bake'?oven.position:baked.g.position;
 steamData.forEach((p,i)=>{p.age+=d;const ambient=i<4,heat=ambient?(s.kettleHeat-35)/120:s.steam,source=ambient?milkJug.position:steamOrigin;
 if(p.age>p.life&&heat>.10&&rand()<d*heat*1.8){
 p.age=0;p.life=1.3+rand()*1.5;p.x=source.x+(rand()-.5)*(ambient?.13:1.2);p.y=source.y+(!ambient&&ph==='bake'?1.75:.72);p.z=source.z+(rand()-.5)*(ambient?.13:.6);}
 p.y+=d*.31;p.x+=d*(s.weather.draft*2+.035*Math.sin(p.y*4+i));
 const r=p.age<p.life?.074*Math.sin(PI*p.age/p.life):0;matrix(steamMesh,i,p.x,p.y,p.z,r,r*2.2,r*.6);});steamMesh.instanceMatrix.needsUpdate=true;
}
let focused=null,tappedProp=null;
const tip=V(0,0,0),pickTarget=V(0,0,0);
function layout(d){
 const s=sim,t=s.tool,ph=s.phase,ix=phaseIndex(),p=portrait;
 const working=ix<=1,folding=ix===2||ix===3||ix===4,hot=ix===7,cooling=ix===8,serving=ix>=9;
 const transfer=ph==="peak"?sat((s.age-1.65)*1.1):0,returnHome=ph==='return'&&s.age>4.25;
 const hx=p?-.18:-.57,hz=p?.72:.88;
 place(hero,working||returnHome?hx-.19*transfer:p?-1.98:-3.07,working||returnHome?.088+.75*transfer:.08,working||returnHome?hz:-.96,d,1.65);
 hero.rotation.z=relax(hero.rotation.z,-.66*transfer,d,2);
 place(cloth,-.45,.028,.67,d);cloth.scale.x=p?.85:1;
 place(cheese,folding?(ix===4?-.87:-.36):(p?1.27:1.98)-transfer*(p?.58:1.05),ix===4?.84:.064,folding?.59:(p?-.78:-.13),d,1.65);
 size(cheese,working?(p?.74:.86):folding?1:.75,d);
 cheese.rotation.z=relax(cheese.rotation.z,ph==='pour'?-.26-s.pourTilt*.89:0,d,2.1);
 place(goal,p?-1.24:-2.65,.02,p?-2.37:-1.73,d);size(goal,p?.79:.91,d);
 place(sugarPot,p?-1.65:-2.63,.026,p?-.18:.61,d);
 place(eggGroup,p?-1.66:-2.58,.034,p?1.66:1.71,d);
 place(crock,p?-2.78:-3.85,.765,-4.07,d);
 place(oven,p?1.20:2.72,.77,-4.23,d);
 ovenSpot.set(oven.position.x-.22,oven.position.y+.81,oven.position.z+.66);
 const homeX=p?1.08:1.88,homeZ=p?-2.55:-2.22;
 let trayX=ix<3||returnHome?homeX:.49,trayZ=ix<3||returnHome?homeZ:.58,trayY=.035,trayScale=ix<3||returnHome?.77:1;
 if(ix===3){const slide=sat((s.age-1.3)/2);trayX=homeX+(.49-homeX)*slide;trayZ=homeZ+(.58-homeZ)*slide;}
 if(ix===5||ix===6){trayZ-=s.pan*1.18;trayX+=s.pan*.30;}
 if(ix===6){const load=sat((s.age-4.45)/1.85);trayX+=(ovenSpot.x-trayX)*load;trayY+=(ovenSpot.y-.41-trayY)*load;trayZ+=(ovenSpot.z-.12-trayZ)*load;trayScale=1-.33*load;}
 if(hot){trayX=ovenSpot.x;trayY=ovenSpot.y-.41;trayZ=ovenSpot.z-.22;trayScale=.65;}
 if(cooling||serving&&!returnHome){trayX=p?1.90:3.23;trayZ=-1.21;trayScale=.76;}
 place(tray,trayX,trayY,trayZ,d,2.5);size(tray,trayScale,d,2.6);
 tray.visible=!hot||s.age<.8;
 const cakeX=-.26,cakeZ=.74,cakeY=.438,finished=cooling||serving&&!returnHome;
 place(tin,tray.position.x,tray.position.y+.10*tray.scale.x,tray.position.z,d,11);size(tin,tray.scale.x,d,10);
 tin.visible=!(hot&&s.age>.8);
 const laid=ph==='serve'||ph==='return'&&!returnHome?1:0;
 place(wrapGroup,finished?cakeX+laid*.93:tin.position.x,finished?cakeY-laid*.33:tin.position.y,finished?cakeZ-laid*.71:tin.position.z,d,2.1);
 wrapGroup.rotation.x=relax(wrapGroup.rotation.x,-1.13*laid,d,1.15);
 size(wrapGroup,finished?1:tin.scale.x,d,3);wrapGroup.visible=!(hot&&s.age>.8)&&!(ph==='return'&&!returnHome&&s.age>2.6);
 const pp=returnHome?0:s.peel,hh=finished?.31+s.mean.rise*.92:.87;
 if(Math.abs(lastPaper-pp)>.0003||Math.abs(lastPaperH-hh)>.001){paperShape(pp,hh);lastPaper=pp;lastPaperH=hh;}
 place(turntable,finished?cakeX:(p?-2.5:-3.7),.026,finished?cakeZ:-2.48,d,1.7);
 turntable.rotation.y=relax(turntable.rotation.y,serving?-s.turn*1.02:0,d,5);
 place(baked.g,finished?cakeX:tin.position.x,finished?cakeY:tin.position.y,finished?cakeZ:tin.position.z,d,2.5);baked.g.rotation.y=turntable.rotation.y;
 baked.g.visible=finished;baked.body.material.color.setHex(0xffffff);
 const sx=serving&&ph==='return'?sat(s.age/2.5):serving?sat((s.turn-.33)/.67)*.82:0;
 const dadX=finished?(p?1.05:1.83):(p?2.38:3.62),dadZ=finished?(p?.81:1.36):.44;
 place(fatherPlate,dadX+(ph==='return'?sat((s.age-2.4)/2.9)*2:0),finished?.3:.25,dadZ,d,1.85);
 sliceGroup.visible=finished;place(sliceGroup,baked.g.position.x+(fatherPlate.position.x-baked.g.position.x-.14)*sx,
 baked.g.position.y+(fatherPlate.position.y+.128-baked.g.position.y)*sx+Math.sin(sx*PI)*.21,
 baked.g.position.z+(fatherPlate.position.z-baked.g.position.z-.29)*sx,d,6);
 sliceGroup.rotation.y=turntable.rotation.y;
 if(finished&&frameCounter%2===0){for(const part of sliceGroup.children){const b=part.userData.rest,pos=part.geometry.attributes.position,rc=Math.cos(part.rotation.y),rs=Math.sin(part.rotation.y);
 for(let i=0;i<pos.count;i++){const x=b[3*i],y=b[3*i+1],z=b[3*i+2],local=sample(x*rc+z*rs,-x*rs+z*rc);
 const j=field(local,'jig');pos.setXYZ(i,x+.76*j*y*rc,y*(.30+.99*field(local,'rise'))+j*y*(.63+.28*(x*rc+z*rs)),z+.76*j*y*rs);}
 pos.needsUpdate=true;part.geometry.computeVertexNormals();}}
 if(finished&&frameCounter%2===0)updateCake(baked,ph);
 water.visible=s.water>.002;water.position.y=.13+.16*s.water;
 ovenCake.g.visible=hot;ovenCake.g.scale.set(.56,.65,.21);if(hot&&frameCounter%4===0)updateCake(ovenCake,ph);
 ovenPane.material.color.setHex(hot?0x61432c:0x45473f);ovenPane.material.emissive.setHex(hot?0xb46327:0x251b10);ovenPane.material.emissiveIntensity=hot?.31:.16;
 ovenLamp.material.emissiveIntensity=hot?1.2:.14;
 door.rotation.x=relax(door.rotation.x,ph==='bath'?1.28*sat((s.age-3.65)*1.5):cooling?1.15*sat(1-s.age/4):0,d,3.2);
 if(working||frameCounter%4===0){updateSurface(surface,true);bubbles();}
 if(folding||frameCounter%5===0)updateSurface(cheeseSkin,false);
 const drained=s.transfer*(ph==='return'?1-sat((s.age-2.2)/2):1);
 bulk.scale.set(1-.31*drained,1+.426*s.mean.air-.61*drained,1-.31*drained);
 pearls.visible=drained<.5;
 bulk.material.transparent=true;bulk.material.opacity=.65+.33*sat(s.mean.air*2+s.mean.fine);
 bulk.material.color.copy(eggColor).lerp(white,sat(s.mean.air*2+s.mean.fine));
 cheeseBody.scale.y=1-.6*s.moved/s.mass;
 at(whisk,t.x*1.01,.753+t.lift*.72+(working?cell(t.x,t.z).h:0),t.z*.83);
 whisk.rotation.set(-.23+t.vz*.039,0,-.58-t.vx*.047);whisk.visible=true;
 if(working){for(const o of wireMeshes){const pos=o.geometry.attributes.position,b=o.userData.rest;
 for(let i=0;i<pos.count;i++){const u=sat((b[i*3+1]-.09)/1.26)*6,j=Math.min(5,u|0),f=u-j;pos.setX(i,b[i*3]+s.wires[j].bend*(1-f)+s.wires[j+1].bend*f);}
 pos.needsUpdate=true;}}
 if(!working&&!returnHome){at(whisk,-.15,.75,-.08);whisk.rotation.z=.57;}
 if(folding){at(stick,t.x*.79,.46+t.lift*.75,t.z*.77);stick.rotation.set(-.24+t.vz*.055,0,-.48-t.vx*.09);}
 else{at(stick,.37,.53,-.24);stick.rotation.set(-.24,0,-.43);}
 if(ix===4){at(stick,-.41,.76,-.22);stick.rotation.z=.22;}
 peakMesh.visible=working&&(t.lift>.07||s.peak>.026);
 if(peakMesh.visible){const bot=V(t.x*.93,.915+.39*s.mean.air,t.z*.80);
 const h=.018+s.peak*.44+t.lift*(.16+.26*s.charge);
 updateStrand(peakMesh,bot,V(bot.x+.039,bot.y+h,bot.z),.042+s.charge*.16,'peak',s.charge*.115);}
 threadMesh.visible=working&&s.falling>.018&&t.lift>.11&&s.charge<.83;
 if(threadMesh.visible){const low=V(t.x*.99,.925+.39*s.mean.air,t.z*.83);updateStrand(threadMesh,low,V(low.x+.06,low.y+.73*t.lift,low.z),.009+.02*s.falling,'ribbon',-.027);}
 ribbonMesh.visible=folding&&(s.ribbon>.045||ix===3);
 if(ribbonMesh.visible){const x=t.x*.79,z=t.z*.77;updateStrand(ribbonMesh,V(x,.72,z),V(x+.074,.75+s.ribbon*.62,z+.045),.038+.069*s.ribbon,'ribbon',.12*s.ribbon);}
 streamMesh.visible=(ph==='pour'&&s.pourTilt>.09)||(ph==='peak'&&s.age>1.93&&s.transfer<.994);
 if(streamMesh.visible){let a,b;
 if(ph==='pour'){a=cheese.localToWorld(V(.96,.91,0));b=V(tin.position.x-.12,tin.position.y+.15+.50*s.moved/s.mass,tin.position.z);}
 else{a=hero.localToWorld(V(1.32,1.30,-.05));b=cheese.localToWorld(V(-.29,.73,0));}
 updateStrand(streamMesh,b,a,ph==='peak'?.085:.09*s.pourTilt,'ribbon',.10);}
 panSkin.visible=s.moved>.0001&&ix<=6;
 if(panSkin.visible){const pos=panSkin.geometry.attributes.position,col=panSkin.geometry.attributes.color,base=panSkin.userData.base;
 for(let i=0;i<pos.count;i++){let x=base[i*3],z=base[i*3+2],local=field(panSkin.userData.samples[i],'fill')*sim.valid.length;
 pos.setXYZ(i,x*.916,.12+.92*local+Math.sin(local*17+3*x)*.012,z*.916);col.setXYZ(i,.95,.73,.36);}
 pos.needsUpdate=true;col.needsUpdate=true;panSkin.geometry.computeVertexNormals();}
 // Mother's supporting hand rides the rim. Her other hand holds the sugar
 // spoon, then the jug and oven handle. Father's thumb stays beside his plate.
 const anchor=working?hero:folding?cheese:tray;
 place(mom,anchor.position.x-(working?1.38:1.07),anchor.position.y+(working?.98:.62),anchor.position.z-.08,d,3);
 mom.rotation.set(.07,.5*PI-.21,.19,'YXZ');
 const dose=s.dose>0,scoopHome=V(sugarPot.position.x,.47,sugarPot.position.z-.02);
 place(scoop,dose?hero.position.x-.48:scoopHome.x,dose?hero.position.y+2.15:scoopHome.y,dose?hero.position.z-.26:scoopHome.z,d,2.2);
 scoop.rotation.set(dose?.17:.04,.96,dose?-.51:0);
 const pourWater=ph==='bath'&&s.age<4.9;
 const kettleHome=V(p?-2.14:-3.18,.77,-3.48);
 place(milkJug,pourWater?tray.position.x-.94:kettleHome.x,pourWater?1.47:kettleHome.y,pourWater?tray.position.z-.15:kettleHome.z,d,2.25);
 milkJug.rotation.z=relax(milkJug.rotation.z,pourWater?-1.04:0,d,3);
 milkJug.rotation.y=PI;
 waterStrand.visible=pourWater&&s.age>.34;
 if(waterStrand.visible){const a=milkJug.localToWorld(V(-.22,.72,0));updateStrand(waterStrand,V(a.x+.065,tray.position.y+.20,a.z+.04),a,.038,'ribbon',.024);}
 let handAnchor=ph==='bath'&&!pourWater||hot||cooling?door.localToWorld(V(-.47,1.12,.23)):pourWater?milkJug.localToWorld(V(.35,.43,0)):scoop.localToWorld(V(0,.07,-.69));
 place(motherPour,handAnchor.x-.18,handAnchor.y+.067,handAnchor.z-.06,d,4);motherPour.rotation.set(.08,1.13,-.14,'YXZ');
 place(dad,fatherPlate.position.x+.61,fatherPlate.position.y+.10,fatherPlate.position.z+.06,d,5);dad.rotation.set(-.13,-1.85,.08,'YXZ');
 const interactive=['whisk','fold','pour','push','peel','serve'].includes(ph);
 if(working)whisk.localToWorld(tip.set(0,2.12,0));
 else if(ph==='fold'||ph==='ribbon')stick.localToWorld(tip.set(0,1.11,0));
 else if(ph==='pour')cheese.localToWorld(tip.set(-.80,.61,.18));
 else if(ph==='push')tray.localToWorld(tip.set(.04,.32,1.18));
 else if(ph==='peel')wrapGroup.localToWorld(tip.set(.87+.64*s.peel,.59,.54+.23*s.peel));
 else turntable.localToWorld(tip.set(-.33,.34,1.10));
 const guide=interactive&&!s.touch&&s.idle>4,cycle=Math.max(0,s.idle-4)%5.8,show=guide&&cycle<3.8;
 const move=show?sat(cycle/.8)*sat((3.8-cycle)/.8):0,gesture=show?Math.sin(sat((cycle-.65)/2.3)*TAU):0;
 const girlRest=V(p?1.95:2.75,.24,2.21);
 let gx=tip.x+.16,gy=tip.y+.09,gz=tip.z+.16;
 if(move){gx+=gesture*(ph==='push'?0:.27);gy+=ph==='fold'?Math.max(0,-gesture)*.24:0;gz+=gesture*(ph==='push'?.35:.05);}
 let amount=s.touch&&interactive?.92:move;
 place(girl,girlRest.x+(gx-girlRest.x)*amount,girlRest.y+(gy-girlRest.y)*amount,girlRest.z+(gz-girlRest.z)*amount,d,5.5);
 girl.rotation.set(-.23,-2.30,.04,'YXZ');
 if(tappedProp)tappedProp.rotation.x=relax(tappedProp.rotation.x,s.wiggle,d,16);
 sun.position.x=-4.8-Math.sin(s.weather.sunset)*1.9;sun.position.y=7.8-.95*Math.sin(s.weather.sunset);sun.intensity=2.96*s.weather.light;sun.color.setRGB(1,.80-.10*Math.sin(s.weather.sunset),.58-.13*Math.sin(s.weather.sunset));
 const focusOven=hot||ph==='bath'&&s.age>5.1,showCake=cooling||serving&&!returnHome;
 const target=focusOven?V(oven.position.x-.18,1.78,-3.78):V(p?-.06:-.01,showCake?.91:p?1.26:1.32,showCake?.42:p?-.10:.17);
 const a=world.clientWidth/world.clientHeight;
 let dist=focusOven?(p?5.44:4.64):p?Math.max(5.05,5.12/a):Math.max(6.48,8.05/Math.max(1,a));
 const angle=focusOven?.13:p?.435:.417; // sine of the downward viewing angle
 const cy=target.y+dist*angle,cz=target.z+dist*Math.sqrt(1-angle*angle);
 place(camera,target.x+.09,cy,cz,d,focusOven?.91:1.23);viewFocus.lerp(target,first?1:1-Math.exp(-d*1.5));camera.lookAt(viewFocus);
 particles(d);first=false;frameCounter++;
 const stage=ix<2?0:ix<4?1:ix<9?2:3;if(previousStep!==stage){drawSteps(stage);previousStep=stage;}
}
function drawSteps(active){
 const cv=document.querySelector('#steps canvas'),c=cv.getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,248,62);
 function path(d,fill,stroke,w=1.4){const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke(p);}}
 const dark='#665848',gold='#b59661',milk='#faf2d9',enamel='#92aeb0';
 for(let i=0;i<4;i++){const x=36+i*58.5;
 if(i<3){c.fillStyle='#c9b898';c.beginPath();c.arc(x+29.3,31,1.25,0,TAU);c.fill();}
 c.save();c.translate(x,30.5);c.lineCap='round';c.lineJoin='round';c.globalAlpha=i===active?1:.80;
 c.beginPath();c.arc(0,0,22.4,0,TAU);c.fillStyle=i===active?'#e6e5cd':'#f3ead7';c.fill();c.strokeStyle=i===active?'#a48953':'#d9cbb2';c.lineWidth=i===active?1.6:.85;c.stroke();
 if(i===active){c.beginPath();c.arc(0,0,19.9,0,TAU);c.strokeStyle='#c1b990';c.lineWidth=.7;c.stroke();}
 if(i===0){
 c.save();c.rotate(.64);path('M -1.6 -14 Q 0 -16 1.6 -14 L 1.35 -4 L -1.35 -4 Z','#a67a4f',dark,1);
 path('M -1.4 -4 Q -9 5 -5.1 10.3 Q 0 16.2 5.1 10.3 Q 9 5 1.4 -4 Z',null,dark,1.5);
 path('M -1 -4 Q -4 6 -1 12 M 1 -4 Q 4 6 1 12',null,dark,1);
 path('M -2 -4 L 2 -4 L 2 -1.7 L -2 -1.7 Z',gold,dark,.7);c.restore();}
 if(i===1){path('M -2 1 L 8 -13 Q 10 -15 11 -12 L 3 2 Z','#bd9263',dark,1.15);
 path('M -13 -1 Q -12 11 -3 12 L 4 12 Q 12 9 13 -1 Z',enamel,dark);
 path('M -13 -1 Q 0 -5 13 -1 Q 0 3 -13 -1',milk,dark,1.1);path('M -9 3 Q -7 8 -4 9',null,'#e7eadb',1.2);}
 if(i===2){path('M -12 -11 Q -12 -13 -9 -13 L 9 -13 Q 12 -13 12 -10 L 12 11 L -12 11 Z',enamel,dark);
 path('M -9 -4 L 9 -4 L 9 7 L -9 7 Z','#6d7774',dark,.8);path('M -6 5 Q -6 -2 0 -2 Q 6 -2 6 5 Z','#d7ad72','#b99262',.8);
 path('M -8 -8 L 0 -8 M -9 12 L -9 14 M 9 12 L 9 14',null,dark,1.7);
 for(const k of [5,8.5]){c.fillStyle=milk;c.beginPath();c.arc(k,-8,1.1,0,TAU);c.fill();}}
 if(i===3){path('M -14 10 Q -9 15 9 13 L 15 10 Q 12 8 5 8 Z',enamel,dark,1);
 path('M -11 -3 L 5 -11 Q 11 -9 13 -5 L 12 7 L -9 10 Z','#edd5a0',dark);
 path('M -11 -3 L 5 -11 Q 11 -10 13 -5 L -9 3 Z','#cb995c',dark,1);
 path('M -6 5 L -5 5 M 2 4 L 3 4 M 7 1 L 8 1',null,'#b79769',1.4);}
 c.restore();}
}
function drawSound(){
 const b=document.querySelector('#sound'),c=b.querySelector('canvas').getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,30,30);
 c.lineWidth=1.9;c.strokeStyle='#605847';c.lineCap='round';c.lineJoin='round';
 const p=new Path2D('M 4 12 L 9 12 L 15 7 L 15 23 L 9 18 L 4 18 Z');c.fillStyle='#b6b49c';c.fill(p);c.stroke(p);
 const waves=new Path2D(sound.muted?'M 20 11 L 26 19 M 26 11 L 20 19':'M 19 11 Q 23 15 19 19 M 22 7 Q 30 15 22 23');c.stroke(waves);
 b.setAttribute('aria-pressed',String(sound.muted));b.setAttribute('aria-label',sound.muted?'音を出す':'音を消す');
}
document.querySelector('#sound').addEventListener('click',()=>{sound.toggle();drawSound();});drawSound();
const picker=new T.Raycaster(),ndc=new T.Vector2(),pickVec=V(0,0,0);
let pointer=null,lastX=0,lastY=0,startY=0,strokeWidth=280;
const pickables=[whisk,bowl,stick,cheese,wrapper,tray,turntable,baked.g,sugarPot,goal,fatherPlate,tin,eggGroup,milkJug];
const activeFor=()=>({whisk:[whisk,bowl],fold:[stick,cheese],pour:[cheese],push:[tray],peel:[wrapper],serve:[turntable,baked.g]})[sim.phase]||[];
function hitAt(e){
 const rect=world.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
 picker.setFromCamera(ndc,camera);const active=activeFor();
 // Forgive the empty spaces between the whisk wires and little fingers
 // landing just beside a narrow handle. The proxy follows the real tool.
 const nearTool=(o,l,h,r)=>{const a=o.localToWorld(V(0,l,0)),b=o.localToWorld(V(0,h,0));return picker.ray.distanceSqToSegment(a,b)<r*r;};
 if(sim.phase==='whisk'&&nearTool(whisk,.25,2.95,.24))return whisk;
 if(sim.phase==='fold'&&nearTool(stick,.17,1.85,.20))return stick;
 if(sim.phase==='peel'){
  const end=wrapGroup.localToWorld(V(.85+.65*sim.peel,.35,.54+.23*sim.peel)),top=end.clone();top.y+=.40;
  if(picker.ray.distanceSqToSegment(end,top)<.165**2)return wrapper;
 }
 if(sim.phase==='serve'){
  const a=turntable.localToWorld(V(-.59,.32,.99)),b=turntable.localToWorld(V(.14,.32,1.12));
  if(picker.ray.distanceSqToSegment(a,b)<.15**2)return turntable;
 }
 if(sim.phase==='push'){const a=tray.localToWorld(V(-.59,.29,1.17)),b=tray.localToWorld(V(.59,.29,1.17));if(picker.ray.distanceSqToSegment(a,b)<.23**2)return tray;}
 const roots=pickables.filter(o=>o.visible&&!pickables.some(q=>q!==o&&o.parent===q));
 const hits=picker.intersectObjects(roots,true);
 for(const it of hits){let o=it.object,owner=null,visible=true;while(o){if(!o.visible)visible=false;if(!owner&&pickables.includes(o))owner=o;o=o.parent;}
 if(visible&&owner){if(sim.phase==='push'&&owner===tray)return null;return owner;}}
 return null;
}
world.addEventListener('pointerdown',e=>{
 if(pointer!==null)return;sound.start();const obj=hitAt(e);if(!obj)return;
 const active=activeFor().includes(obj);
 if(!active){if(tappedProp)tappedProp.rotation.x=0;tappedProp=obj===wrapper?wrapGroup:obj;sim.down(false);return;}
 focused=obj;pointer=e.pointerId;lastX=e.clientX;lastY=startY=e.clientY;
 const a=hero.localToWorld(V(-1,1,0)).project(camera),b=hero.localToWorld(V(1,1,0)).project(camera);
 strokeWidth=Math.max(96,Math.abs(a.x-b.x)*world.clientWidth*.5);
 if(sim.phase==='fold'||sim.phase==='pour')strokeWidth*=.8;
 world.setPointerCapture(pointer);sim.down(true);e.preventDefault();
});
world.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;
 const dx=2.18*(e.clientX-lastX)/strokeWidth,dz=2.65*(e.clientY-lastY)/strokeWidth;
 const lift=sat((startY-e.clientY-strokeWidth*.095)/(.48*strokeWidth));
 sim.drag(dx,dz,lift);lastX=e.clientX;lastY=e.clientY;e.preventDefault();
});
function release(e){if(e.pointerId===pointer){pointer=null;focused=null;sim.up();}}
world.addEventListener('pointerup',release);world.addEventListener('pointercancel',release);world.addEventListener('lostpointercapture',release);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pointer=null;sim.up();if(sound.ctx)sound.ctx.suspend().catch(()=>{});}else if(sound.ctx&&!sound.muted)sound.ctx.resume().catch(()=>{});});

// The finish samples only bright highlights in the scene's linear colour
// buffer. Subpixel grain is fixed to the glass of the display.
const hdr=renderer.extensions.has('EXT_color_buffer_float');
const target=new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:Math.min(2,renderer.capabilities?.maxSamples||0)});
const finishScene=new T.Scene(),finishCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
const finishMat=new T.ShaderMaterial({uniforms:{uMap:{value:target.texture},pixel:{value:new T.Vector2()}},depthTest:false,depthWrite:false,
vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
fragmentShader:`uniform sampler2D uMap;uniform vec2 pixel;varying vec2 vUv;
vec3 bloom(vec2 d){return max(texture2D(uMap,vUv+d*pixel).rgb-vec3(1.45),vec3(0.));}
void main(){vec3 col=texture2D(uMap,vUv).rgb;
col+=.022*(bloom(vec2(3.,2.))+bloom(vec2(-3.,2.))+bloom(vec2(3.,-2.))+bloom(vec2(-3.,-2.)));
float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
gl_FragColor=vec4(col*(1.+grain*.018),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
finishScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finishMat));
function resize(){const w=innerWidth,h=innerHeight;portrait=w<h*.88;camera.aspect=w/h;camera.fov=portrait?39:38;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
 const pr=renderer.getPixelRatio();target.setSize(Math.round(w*pr),Math.round(h*pr));finishMat.uniforms.pixel.value.set(1/target.width,1/target.height);}
window.addEventListener('resize',resize);resize();
function advance(d){sim.step(d);layout(d);sound.update(sim,d);}
window.__GAME__={step(dt){if(Number.isFinite(dt)&&dt>0){let left=dt;while(left>1e-8){const d=Math.min(left,.05);advance(d);left-=d;}}},getState:()=>sim.getState()};
let roomProbeReady=false;
function captureRoom(){
 const hidden=[hero,cheese,streamMesh,waterStrand,girl,mom,motherPour,dad,dust,grains,steamMesh],vis=hidden.map(o=>o.visible);
 hidden.forEach(o=>o.visible=false);
 const cube=new T.WebGLCubeRenderTarget(64,{type:target.texture.type,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
 const probe=new T.CubeCamera(.08,27,cube);probe.position.set(-.48,1.42,.63);probe.update(renderer,scene);
 hidden.forEach((o,i)=>o.visible=vis[i]);scene.environment=cube.texture;
}
function render(){renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(finishScene,finishCam);}
let prev=0;
function frame(ms){const d=prev?Math.min(.065,(ms-prev)/1000):0;prev=ms;if(!document.hidden){advance(d);render();if(!roomProbeReady&&frameCounter>3){roomProbeReady=true;captureRoom();}}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
