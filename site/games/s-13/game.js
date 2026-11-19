'use strict';
const sim=new Kitchen(),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>(x=clamp(x,0,1),x*x*(3-2*x));
const bagHome=V(),nutHome=V(),workTip=V(),heldTop=V(),shoulder=V(),wrist=V();
const topFrom=V();let topMoved=false;
let compact=false,viewWidth=1,viewHeight=1;
function resize(){
 viewWidth=canvas.clientWidth;viewHeight=canvas.clientHeight;const aspect=viewWidth/viewHeight;
 compact=aspect<.85;camera.aspect=aspect;
 const height=Math.max(5.88,4.43/aspect),distance=11.32;
 camera.fov=2*Math.atan(height/(2*distance))*180/Math.PI;
 const aimY=compact?1.48:1.32;
 set(camera,0,aimY+4.15,10.53);camera.lookAt(0,aimY,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 renderer.setSize(viewWidth,viewHeight,false);
 set(sample,compact?-1.42:-2.53,0,compact?-2.40:-1.52);sample.scale.setScalar(compact?.87:1);
 set(rack,compact?2.01:2.94,0,compact?-1.86:-1.16);rack.scale.setScalar(compact?.88:1);
 bagHome.set(rack.position.x-.44,.35,rack.position.z+.47);
 set(dish,compact?1.53:2.40,.008,compact?1.08:.56);dish.scale.setScalar(compact?.83:1);
 nutHome.set(dish.position.x,dish.position.y+.105,dish.position.z);
 set(grandma.g,compact?1.78:3.35,compact?1.35:1.04,-3.91);grandma.g.scale.setScalar(compact?1.15:1.25);grandma.g.rotation.y=-.32;
 set(girl.g,compact?-1.46:-1.75,compact?1.32:1.02,-3.49);girl.g.scale.setScalar(.94);girl.g.rotation.y=.22;
 set(pot,compact?-2.01:-3.39,.82,-3.4);
 set(autumn,compact?-3.02:-4.49,-.07,-2.70);
 fore.position.x=compact?.86:0;fore.position.z=compact?.77:0;
 const ceilingRay=new T.Raycaster();ceilingRay.setFromCamera(new T.Vector2(0,.945),camera);
 const target=V();ceilingRay.ray.intersectPlane(new T.Plane(V(0,0,1),2.8),target);
 set(valance,0,target.y,-2.8);
}
const colorA=new T.Color(0xfff2d6),colorB=new T.Color(0xf9e2bd);
const dPos=domeGeo.attributes.position,dcol=new T.Float32BufferAttribute(new Float32Array(dPos.count*3),3);domeGeo.setAttribute('color',dcol);domeMat.vertexColors=true;
const wetAttr=new T.BufferAttribute(new Float32Array(dPos.count),1);domeGeo.setAttribute('water',wetAttr);
domeMat.onBeforeCompile=shader=>{
 shader.vertexShader='attribute float water; varying float vWater;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWater=water;');
 shader.fragmentShader='varying float vWater;\n'+shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor *= 1.27 - 0.48*vWater;');
};
const dcell=[];for(let i=0;i<dPos.count;i++){dcell.push(sim.index(Math.atan2(dPos.getX(i),dPos.getZ(i)),Math.acos(clamp(dPos.getY(i),0,1))))}
const layerGroup=group(food),sampleLanes=7,sides=7,chunkSize=96,strokeMap=new Map();
const cutPlanes=[new T.Plane(),new T.Plane()],threadMat=mat(0xffffff,.46,0,{vertexColors:true,clipIntersection:true});
domeMat.clipIntersection=true;const strandColors=[0xc89260,0xcf9c6c,0xc28e5c,0xd4a475,0xc99567,0xcd9969,0xbf8958].map(c=>new T.Color(c));
function noodleChunk(){
 const verts=chunkSize*sampleLanes*sides,geo=new T.BufferGeometry();
 for(let name of ['position','normal','color'])geo.setAttribute(name,new T.BufferAttribute(new Float32Array(verts*3),3).setUsage(T.DynamicDrawUsage));
 let index=[];for(let i=0;i<chunkSize-1;i++)for(let j=0;j<sampleLanes;j++)for(let k=0;k<sides;k++){
 let a=(i*sampleLanes+j)*sides,b=a+sampleLanes*sides,n=(k+1)%sides;index.push(a+k,b+k,a+n,a+n,b+k,b+n)}
 geo.setIndex(index);geo.setDrawRange(0,0);const o=mesh(layerGroup,geo,threadMat);o.frustumCulled=false;return {o,geo,start:0}
}
function drawPoint(chunk,row,pt,first,tail){
 const pos=chunk.geo.attributes.position,nor=chunk.geo.attributes.normal,col=chunk.geo.attributes.color;
 const rad=pt.thick*(first?.60:1)*(1-tail*.60);
 const h=pt.h+tail*.012;
 const cp=Math.cos(pt.p),sp=Math.sin(pt.p),sa=Math.sin(pt.a),ca=Math.cos(pt.a),sd=Math.sin(pt.dir),cd=Math.cos(pt.dir);
 const offx=-sd*ca+cd*cp*sa,offy=-cd*sp,offz=sd*sa+cd*cp*ca;
 const nx=sp*sa,ny=cp,nz=sp*ca,c=sim.surface(pt.a,pt.p,h);
 for(let j=0;j<sampleLanes;j++){let offset=(j-3)*.0352,cc=strandColors[j];
 for(let k=0;k<sides;k++){let a=k*TAU/sides,co=Math.cos(a),si=Math.sin(a),normalX=co*offx+si*nx,normalY=co*offy+si*ny,normalZ=co*offz+si*nz,i=(row*sampleLanes+j)*sides+k;
 pos.setXYZ(i,c[0]+offx*offset+normalX*rad,c[1]+offy*offset+normalY*rad,c[2]+offz*offset+normalZ*rad);
 nor.setXYZ(i,normalX,normalY,normalZ);let shade=.92+.08*si;col.setXYZ(i,cc.r*shade,cc.g*shade,cc.b*shade)}}
}
function drawThreads(){
 for(const s of sim.strokes){let chunks=strokeMap.get(s);if(!chunks){chunks=[];strokeMap.set(s,chunks)}
 const cnt=s.points.length;
 for(let id=0;id<=Math.floor((cnt-1)/(chunkSize-1));id++){
 let ch=chunks[id];if(!ch){ch=noodleChunk();chunks[id]=ch}
 const start=id*(chunkSize-1),end=Math.min(cnt,start+chunkSize),tail=s.cut?s.tail:0;
 if(ch.done)continue;
 for(let i=start+ch.start;i<end;i++)drawPoint(ch,i-start,s.points[i],i===0,i===cnt-1?tail:0);
 while(ch.start+start<end-2&&sim.time-s.points[start+ch.start].birth>1.4)ch.start++;
 for(let key of ['position','normal','color'])ch.geo.attributes[key].needsUpdate=true;
 ch.geo.setDrawRange(0,Math.max(0,end-start-1)*sampleLanes*sides*6);
 if((end-start===chunkSize||s.cut)&&sim.time-s.points[end-1].birth>1.6)ch.done=true}
 }
}
const liveStrands=group();const liveGeo=new T.CylinderGeometry(1,1,1,7,1);const feeds=[];
for(let i=0;i<7;i++){let o=mesh(liveStrands,liveGeo,strandMats[i%5]);feeds.push(o)}
const creamWalls=group(food),wshape=new T.Shape();wshape.moveTo(0,0);wshape.lineTo(1,0);for(let i=1;i<=36;i++){let a=i/36*Math.PI*.5;wshape.lineTo(Math.cos(a),1.04*Math.sin(a))}wshape.closePath();
const walls=[0,1].map(()=>mesh(creamWalls,new T.ShapeGeometry(wshape),mat(0xfff3d9,.64,0,{side:T.DoubleSide}),0,.79,0));
const spare=group(),newCookie=biscuitGroup.clone(true);spare.add(newCookie);
const reserve=mesh(scoop,domeGeo,M.cream,0,-.31,0);reserve.scale.set(.91,.946,.91);
const spoonRest=V(),spoonStart=V(),spoonEnd=V(),handGoal=V();
let wobbled=null,wobbleAt=-100,hoverTop=false,active=null,muted=false;
const soundButton=document.querySelector('.audio'),stageMarks=[...document.querySelectorAll('.steps span')];let lastMark=-1;
function stageNumber(st){if(['scoop','drop','align'].includes(st))return 0;if(st==='pipe')return 1;if(['rim','turning','decorate','crown'].includes(st))return 2;return 3}
function handTarget(){
 switch(sim.stage){
 case 'scoop':return grip.localToWorld(V(0,.77,.07));
 case 'pipe':return workTip.clone();
 case 'rim':case 'turning':return V(0,.40,1.77);
 case 'decorate':return topping.position.clone().add(V(0,.35,0));
 case 'tray':return V(.28,.71,1.13);
 default:return null}
}
function updateGuide(){
 let goal=handTarget();demo.visible=!!goal&&sim.hint>.025&&!active;
 if(!demo.visible)return;
 let phase=((sim.idle-4)%4.4+4.4)%4.4,p=smooth((phase-.55)/1.8);
 if(sim.stage==='pipe'){let a=sim.nozzle.a+p*.88,pt=sim.surface(a,sim.nozzle.p-.22*Math.sin(p*Math.PI),.09);goal.set(...pt)}
 if(sim.stage==='rim'){let a=(p-.5)*1.4;goal.set(1.78*Math.sin(a),.41,1.78*Math.cos(a))}
 if(sim.stage==='decorate')goal.lerp(V(0,1.86,0),p);
 if(sim.stage==='tray')goal.z-=p*.60;
 const fade=smooth(phase/.35)*(1-smooth((phase-3.65)/.70));demo.scale.setScalar(sim.hint*fade*(compact?.88:1.03));
 demo.position.copy(goal).add(V(.03,.075+.10*Math.cos(p*Math.PI*2),.19));demo.rotation.x=-.18;demo.rotation.y=-.06;
}
const cMix=new T.Color(),worldFoot=V(),lateral=V(),restTarget=V(),elbow=V(),handOff=V(),tipOnBag=V(),axis=V(0,1,0);
const spoonCurve=new T.CatmullRomCurve3([V(),V(),V(),V()]);
let seenCycle=0;
function renderState(){
 const s=sim,q=s.nozzle,nutProg=s.garnish;
 if(seenCycle!==s.cycle){for(const chunks of strokeMap.values())for(const c of chunks){c.o.removeFromParent();c.geo.dispose()}strokeMap.clear();seenCycle=s.cycle;topMoved=false}
 const isRefill=s.stage==='refill',fadeOld=isRefill?s.refill:0;
 wheel.rotation.y=s.angle;food.rotation.y=s.angle;
 set(food,s.serve*(compact?.51:.82)+fadeOld*3.0,s.serve*.31+fadeOld*.25,-s.serve*1.13-fadeOld*4.2);
 food.scale.setScalar(1-.42*fadeOld);food.visible=fadeOld<.985;
 set(dome,0,s.creamY,0);dome.scale.set(s.radius*(1+s.squash*.27),s.radius*1.04*(1-s.squash*.60),s.radius*(1+s.squash*.27));
 for(let i=0;i<dcell.length;i++){let c=s.cells[dcell[i]],w=clamp((c.wet-.50)*1.2+(c.temp-12)*.035,0,1);cMix.copy(colorB).lerp(colorA,w);dcol.setXYZ(i,cMix.r,cMix.g,cMix.b);wetAttr.setX(i,c.wet)}dcol.needsUpdate=true;wetAttr.needsUpdate=true;
 domeMat.roughness=.68-.28*s.cells[s.index(q.a-s.angle,q.p)].wet;
 const away=s.scoopAway;set(scoop,away*(compact?-3.5:-4.9),2.35+away*.62,-away*2.33);scoop.rotation.y=(compact?.64:.18)+away*.76;
 scoop.rotation.z=s.toolFlex+away*.69;scoop.scale.setScalar(1-away*.20);
 lever.rotation.z=s.stage==='drop'?.18*Math.exp(-s.age*3.4):s.toolFlex*.6;
 reserve.visible=isRefill;reserve.scale.setScalar(.91*(isRefill?smooth(s.refill*3):0));
 const depth=s.cells[s.index(q.a-s.angle,q.p)].height,point=s.surface(q.a,q.p,depth+.055);
 workTip.set(...point);workTip.y+=.105;workTip.z+=.045;
 const ap=s.align*(1-s.bagAway);bag.position.copy(bagHome).lerp(workTip,ap);bag.position.y+=Math.sin(ap*Math.PI)*.47;
 bag.rotation.z=mix(-.12,-.60,ap)+.013*s.air;bag.rotation.x=mix(-.09,-.22,ap);bag.rotation.y=-.18*ap;
 const ps=q.pressure;bag.scale.set((compact?.91:1)*(1-.038*ps),(compact?.91:1)*(1+.018*ps),(compact?.91:1)*(1-.054*ps));
 bagSkin.roughness=.58-.09*ps;
 const wiggle=Math.max(0,1-(s.time-wobbleAt)*1.8)*Math.sin((s.time-wobbleAt)*18)*.038;
 if(wobbled===bag)bag.rotation.z+=wiggle;if(wobbled===scoop)scoop.rotation.z+=wiggle;
 dish.rotation.z=wobbled===dish?wiggle*.25:0;
 const crownTarget=V(food.position.x,.79+s.radius*1.04+food.position.y,food.position.z);
 if(active?.type==='nut'){topping.position.copy(heldTop)}
 else{topping.position.copy(topMoved?topFrom:nutHome).lerp(crownTarget,nutProg);topping.position.y+=Math.sin(nutProg*Math.PI)*.80}
 topping.rotation.z=-.12*nutProg+(wobbled===topping?wiggle:0);topping.scale.setScalar(1.06*(1-.42*fadeOld));topping.visible=food.visible;
 tray.visible=s.tray>.005&&food.visible;
 set(tray,food.position.x+(1-s.tray)*(compact?2.8:4.6),food.position.y+.558-.14*(1-s.tray),food.position.z+.26*(1-s.tray));
 tray.rotation.z=(1-s.tray)*.17;tray.scale.copy(food.scale);
 spoonRest.set(compact?1.10:2.40,.095,compact?2.74:2.05);
 const biteWorld=s.biteAngle+s.angle;
 spoonStart.copy(food.position).add(V(.89*Math.sin(biteWorld),1.04,.89*Math.cos(biteWorld)));
 spoonEnd.set(grandma.g.position.x-.15,grandma.g.position.y+1.28*grandma.g.scale.y,grandma.g.position.z+.50);
 spoonCurve.points[0].copy(spoonRest);spoonCurve.points[1].copy(spoonStart).add(V(.5,.44,.38));spoonCurve.points[2].copy(spoonStart).add(V(.14,.15,.18));spoonCurve.points[3].copy(spoonStart).add(V(-.04,.12,-.02));
 spoon.position.copy(spoonCurve.getPoint(clamp(s.spoon,0,1)));
 const biteCarry=smooth(s.bite)*.35+s.crownLift*.65;spoon.position.lerp(spoonEnd,biteCarry);
 spoon.position.y+=Math.sin(biteCarry*Math.PI)*.46;spoon.rotation.z=-.06+s.bite*.12-.33*s.crownLift;
 if(isRefill)spoon.position.lerp(spoonRest,s.refill);
 mouthful.visible=s.bite>.02&&s.crownLift<.97;
 mouthful.scale.setScalar(smooth(s.bite*2)*(1-smooth((s.crownLift-.67)/.3)));
 const portion=clamp(s.biteThickness,0,.35);spoonLayers.visible=spoonFilling.visible=portion>.0003;
 spoonLayers.scale.set(1,.98+portion*2.6,1);spoonFilling.position.y=.165+portion*.31;spoonFilling.scale.y=.076+portion*.39;
 const clipping=s.bite>.002;creamWalls.visible=clipping;
 if(clipping){const half=s.bite*.62;
 for(let j=0;j<2;j++){let sign=j===0?1:-1,a=biteWorld+sign*half;
 let n=V(sign*Math.cos(a),0,-sign*Math.sin(a));cutPlanes[j].setFromNormalAndCoplanarPoint(n,food.position);
 walls[j].rotation.y=s.biteAngle+sign*half-Math.PI/2;walls[j].scale.setScalar(s.radius)}}
 if(!!threadMat.clippingPlanes!==clipping){for(let m of [threadMat,domeMat]){m.clippingPlanes=clipping?cutPlanes:null;m.needsUpdate=true}}
 spare.visible=isRefill;set(spare,-(1-s.refill)*(compact?3.5:5.1),.34*Math.sin(s.refill*Math.PI),.13*(1-s.refill));
 drawThreads();liveStrands.visible=!!s.stroke;
 if(s.stroke){const pt=s.stroke.points.at(-1);if(pt){bag.updateMatrixWorld(true);for(let i=0;i<7;i++){let a=i*TAU/6,r=i===6?0:.065;
 tipOnBag.set(Math.sin(a)*r,0,Math.cos(a)*r);bag.localToWorld(tipOnBag);
 let la=pt.a+s.angle,off=(i-3)*.0352;worldFoot.set(...s.surface(la,pt.p,pt.h)).addScaledVector(lateral.set(-Math.sin(pt.dir)*Math.cos(la)+Math.cos(pt.dir)*Math.cos(pt.p)*Math.sin(la),-Math.cos(pt.dir)*Math.sin(pt.p),Math.sin(pt.dir)*Math.sin(la)+Math.cos(pt.dir)*Math.cos(pt.p)*Math.cos(la)),off);
 const o=feeds[i];o.position.copy(tipOnBag).lerp(worldFoot,.5);lateral.copy(tipOnBag).sub(worldFoot);o.scale.set(.018,lateral.length(),.018);o.quaternion.setFromUnitVectors(axis,lateral.normalize())}}}
 const focus=workTip.clone().lerp(spoon.position,s.gaze);
 for(const person of [girl,grandma]){const hp=person.g.localToWorld(person.head.position.clone()),delta=focus.clone().sub(hp);
 person.head.rotation.y=clamp(Math.atan2(delta.x,delta.z)-person.g.rotation.y,-.55,.55);
 person.head.rotation.x=clamp(-Math.atan2(delta.y,Math.hypot(delta.x,delta.z)),.025,.39)+.012*s.air}
 grandma.g.updateMatrixWorld(true);shoulder.set(-.43,.59,.13);grandma.g.localToWorld(shoulder);
 restTarget.copy(shoulder).add(V(-.22,-.46,.64));bag.updateMatrixWorld(true);handGoal.set(.19,1.36,-.05);bag.localToWorld(handGoal);
 // Reach towards the utensil as it clears the hook, then release it to the child.
 let reach=Math.sin(ap*Math.PI)*.96;
 wrist.copy(restTarget).lerp(handGoal,reach);handOff.copy(spoon.position).add(V(.97,.25,-1.48));wrist.lerp(handOff,clamp(s.spoon*(1-fadeOld),0,1));
 elbow.copy(shoulder).lerp(wrist,.48).add(V(-.21,-.26,.06));linkSegment(sleeve,shoulder,elbow,.206);linkSegment(forearm,elbow,wrist,.154);cuff.position.copy(wrist);grannyHand.position.copy(wrist).add(V(0,-.014,.080));
 grannyHand.rotation.x=-.10+reach*.37;
 lip.position.z=-.054+.19*s.rimReveal;
 key.intensity=3.15+.097*s.air;
 const wp=wispGeo.attributes.position;for(let j=0;j<14;j++){let v=s.plume[j];for(let k=0;k<3;k++){wp.setXYZ(j*3+k,v.x+Math.sin(j*.45+v.heat*6)*.035+(k-1)*(.019+.004*j),j*.063,j*.0008)}}wp.needsUpdate=true;
 updateGuide();
 for(let i=0;i<vapour.length;i++){let p=s.dust[i],o=vapour[i],h=(p.y%3.5+3.5)%3.5;set(o,((p.x+5)%10+10)%10-5,.2+h,p.z);o.material.opacity=.38*smooth(h/.35)*smooth((3.5-h)/.48)}
 const mark=stageNumber(s.stage);if(mark!==lastMark){stageMarks.forEach((el,i)=>el.className=i===mark?'on':i<mark?'done':'');lastMark=mark}
}
// All sound is generated after a touch. Pressure drives the breath through the die.
let audioCtx,master,breath,breathFilter,noiseData;
function openAudio(){if(muted)return;try{
 if(!audioCtx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioCtx=new Audio();master=audioCtx.createGain();master.gain.value=.62;master.connect(audioCtx.destination);
 noiseData=audioCtx.createBuffer(1,audioCtx.sampleRate*1.6,audioCtx.sampleRate);let n=0;const arr=noiseData.getChannelData(0);for(let i=0;i<arr.length;i++){n=.38*n+.62*(Math.random()*2-1);arr[i]=n}
 let src=audioCtx.createBufferSource();src.buffer=noiseData;src.loop=true;breathFilter=audioCtx.createBiquadFilter();breathFilter.type='bandpass';breathFilter.frequency.value=1350;breathFilter.Q.value=.68;
 breath=audioCtx.createGain();breath.gain.value=0;src.connect(breathFilter).connect(breath).connect(master);src.start()}
 if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
 }catch(e){/* The workshop continues in silent mode when audio is unavailable. */}}
function note(freq,len,amp,type='sine',end=freq,delay=0){if(!audioCtx||muted)return;const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+len);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(g).connect(master);o.start(t);o.stop(t+len+.01);o.onended=()=>{o.disconnect();g.disconnect()}}
function noise(freq,len,amp,q=1){if(!audioCtx||muted)return;let src=audioCtx.createBufferSource(),fil=audioCtx.createBiquadFilter(),g=audioCtx.createGain(),t=audioCtx.currentTime;src.buffer=noiseData;fil.type='bandpass';fil.frequency.value=freq;fil.Q.value=q;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+len);src.connect(fil).connect(g).connect(master);src.start(t,Math.random()*.6);src.stop(t+len+.01);src.onended=()=>{src.disconnect();fil.disconnect();g.disconnect()}}
function sounds(){if(audioCtx){let t=audioCtx.currentTime,c=sim.cells[sim.index(sim.nozzle.a-sim.angle,sim.nozzle.p)];breath.gain.setTargetAtTime(muted?0:sim.nozzle.pressure*(.10+.052*Math.min(sim.nozzle.speed,2)),t,.038);
 breathFilter.frequency.setTargetAtTime(780+sim.nozzle.speed*420+c.wet*640,t,.055)}
 for(const e of sim.events.splice(0)){switch(e){
 case 'drop':note(2450,.043,.13,'triangle',1830);note(3900,.09,.041,'sine',3700,.021);noise(3900,.043,.19,1.3);break;
 case 'plop':note(243,.16,.18,'sine',104);noise(460,.083,.10);break;
 case 'cut':noise(1550,.054,.10,1.4);break;
 case 'knock':note(269,.105,.25,'sine',183);note(602,.064,.092,'triangle',480,.009);noise(840,.05,.14);break;
 case 'crown':note(475,.14,.085,'sine',290);break;
 case 'tray':noise(1620,.25,.11);break;
 case 'serving':noise(890,.39,.14);break;
 case 'taste':note(1120,.24,.077);note(1680,.33,.033,'sine',1675,.04);break;
 case 'fresh':noise(670,.16,.11);note(235,.09,.09,'sine',201);break;}}
}
const ray=new T.Raycaster(),pointerNdc=new T.Vector2();
function cast(x,y){pointerNdc.set(x/viewWidth*2-1,1-y/viewHeight*2);ray.setFromCamera(pointerNdc,camera)}
function hits(o){return o.visible&&ray.intersectObject(o,true).length>0}
function pixel(p){p=p.clone().project(camera);return {x:(p.x+1)*viewWidth/2,y:(1-p.y)*viewHeight/2}}
function near(x,y,p,r){const c=pixel(p);return Math.hypot(x-c.x,y-c.y)<r}
function atSurface(x,y){cast(x,y);const r=sim.radius,ray0=ray.ray;
 let o=ray0.origin.clone().sub(V(0,.79,0));o.y/=1.04;
 const d=ray0.direction.clone();d.y/=1.04;d.normalize();const t=-o.dot(d),sq=r*r-o.lengthSq()+t*t;
 o.addScaledVector(d,t-Math.sqrt(Math.max(0,sq)));o.y=Math.max(.025,o.y);o.normalize();return [Math.atan2(o.x,o.z),Math.acos(clamp(o.y,-1,1))]}
function frontEdge(x,y){let hit=ray.intersectObject(wheel,true)[0];if(hit&&hit.point.z>.12&&Math.hypot(hit.point.x,hit.point.z)>1.35)return true;
 for(let i=-5;i<=5;i++){let a=i*.24;if(near(x,y,V(1.79*Math.sin(a),.37,1.79*Math.cos(a)),compact?17:20))return true}return false}
function pickup(type,e){active={type,id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0,prevX:e.clientX,prevY:e.clientY};
 try{canvas.setPointerCapture(e.pointerId)}catch(e){}}
canvas.addEventListener('pointerdown',e=>{
 if(active||!e.isPrimary)return;e.preventDefault();openAudio();const x=e.clientX,y=e.clientY;cast(x,y);scene.updateMatrixWorld(true);
 if(sim.stage==='scoop'&&(hits(grip)||hits(lever)||near(x,y,grip.localToWorld(V(0,.63,.07)),23))){sim.press();sounds();return}
 if(sim.stage==='decorate'&&(hits(topping)||near(x,y,topping.position.clone().add(V(0,.2,0)),25))){pickup('nut',e);heldTop.copy(topping.position);sim.touch();return}
 if(['pipe','decorate'].includes(sim.stage)&&(hits(bag)||near(x,y,workTip,25))){
    pickup('pipe',e);active.tip=pixel(workTip);sim.startPipe();return}
 if(['rim','decorate'].includes(sim.stage)&&frontEdge(x,y)){pickup('rim',e);sim.touch();return}
 if(sim.stage==='tray'&&((hits(tray)&&!hits(dome)&&!hits(biscuitGroup))||near(x,y,V(0,.66,1.14),26))){pickup('tray',e);sim.touch();return}
 for(const obj of [scoop,bag,topping,dish])if(hits(obj)){wobbled=obj;wobbleAt=sim.time;break}
});
canvas.addEventListener('pointermove',e=>{
 if(!active||active.id!==e.pointerId)return;e.preventDefault();const a=active;
 a.dx=e.clientX-a.x;a.dy=e.clientY-a.y;sim.touch();
 if(a.type==='pipe'){const [u,p]=atSurface(a.tip.x+a.dx,a.tip.y+a.dy);sim.aim(u,p)}
 if(a.type==='nut'){cast(e.clientX,e.clientY);ray.ray.intersectPlane(new T.Plane(camera.getWorldDirection(V()),-camera.getWorldDirection(V()).dot(nutHome)),heldTop);heldTop.y=Math.max(.12,heldTop.y+.04)}
 if(a.type==='rim'&&!a.turned&&Math.hypot(a.dx,a.dy)>7){a.turned=true;sim.turn((a.dx||-a.dy)>0?1:-1)}
 a.prevX=e.clientX;a.prevY=e.clientY;
});
function release(e,cancel=false){if(!active||active.id!==e.pointerId)return;
 const a=active;active=null;
 if(a.type==='pipe')sim.endPipe();
 if(a.type==='rim'&&!a.turned&&!cancel)sim.turn(1);
 if(a.type==='nut'&&!cancel){topFrom.copy(heldTop);topMoved=true;sim.top()}
 if(a.type==='tray'&&!cancel){const [u]=atSurface(clamp(e.clientX,viewWidth*.2,viewWidth*.8),pixel(V(0,1.18,.77)).y);sim.handOver(clamp(u,-1.05,1.05))}
 sim.touch();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerup',e=>release(e));canvas.addEventListener('pointercancel',e=>release(e,true));canvas.addEventListener('lostpointercapture',e=>release(e,true));
soundButton.addEventListener('click',()=>{muted=!muted;soundButton.classList.toggle('muted',muted);soundButton.setAttribute('aria-pressed',String(!muted));if(!muted){openAudio();note(740,.15,.06)}if(master)master.gain.setTargetAtTime(muted?0:.62,audioCtx.currentTime,.02)});
document.querySelector('.seal').addEventListener('click',()=>{openAudio();sim.idle=4.1;sim.hint=.22});
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(active)release({pointerId:active.id},true);audioCtx?.suspend().catch(()=>{})}else{last=performance.now();if(audioCtx&&!muted)audioCtx.resume().catch(()=>{})}});
window.__GAME__=Object.freeze({step:dt=>sim.step(dt),getState:()=>sim.getState()});
// A small highlight bleed and sub-pixel film grain, applied in linear light.
let film=null;
finishJobs.push(()=>{if(renderer.extensions?.has('EXT_color_buffer_float')){
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:Math.min(2,renderer.capabilities.maxSamples),depthBuffer:true});
 const fs=new T.Scene(),fc=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const fm=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frame:{value:target.texture},pixelSize:{value:new T.Vector2()}},
 vertexShader:'varying vec2 coord;void main(){coord=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`uniform sampler2D frame;uniform vec2 pixelSize;varying vec2 coord;
 vec3 glow(vec2 uv){vec3 s=texture2D(frame,uv).rgb;return max(s-vec3(1.08),vec3(0.));}
 void main(){vec3 c=texture2D(frame,coord).rgb;
 vec2 d=pixelSize*3.3;vec3 b=glow(coord+d)+glow(coord-d)+glow(coord+vec2(d.x,-d.y))+glow(coord+vec2(-d.x,d.y));
 gl_FragColor=vec4(c+.006*b,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
 gl_FragColor.rgb+=grain/330.;}`});
 fs.add(new T.Mesh(new T.PlaneGeometry(2,2),fm));film={target,fs,fc,fm};
}});
function draw(){if(!film){renderer.render(scene,camera);return}
 const w=canvas.width,h=canvas.height;if(film.target.width!==w||film.target.height!==h){film.target.setSize(w,h);film.fm.uniforms.pixelSize.value.set(1/w,1/h)}
 renderer.setRenderTarget(film.target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(film.fs,film.fc)}
resize();renderState();draw();
function enhance(){
 const job=finishJobs.shift();if(!job)return;job();
 if(finishJobs.length)requestAnimationFrame(()=>scheduleDetail())
}
function scheduleDetail(){if(window.requestIdleCallback)window.requestIdleCallback(enhance,{timeout:180});else setTimeout(enhance,0)}
requestAnimationFrame(scheduleDetail);
let last=performance.now();function frame(now){const dt=clamp((now-last)/1000,0,.085);last=now;if(!document.hidden){sim.step(dt);renderState();sounds();draw()}requestAnimationFrame(frame)}requestAnimationFrame(frame);
