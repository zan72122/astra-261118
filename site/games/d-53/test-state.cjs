'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {Winter}=require('./simulation');
const dt=.05,deg=180/Math.PI;
const trace=['device,case,time_s,stage,temperature_peak_C,clear_percent,film_peak_mm,runoff_ml,twig_rad,latch_deg,door_deg,travel_fraction,broken_needles,ground_peak_C,pool_reference_radius_m,ripple_m,max_cell_delta_C,max_cell_delta_ice,max_cell_delta_mm,max_needle_delta_rad,leaf_x_m,leaf_z_m,leaf_vx_mps,bird_height_m'];
const maxima={},summary={};
function maximum(key,v){maxima[key]=Math.max(maxima[key]||0,Math.abs(v))}
const sum=a=>a.reduce((v,x)=>v+x,0);
function checkArray(old,current,key,limit,stats){
 let max=0,minSigned=Infinity,maxSigned=-Infinity,changed=0;
 for(let i=0;i<old.length;i++){
  const d=current[i]-old[i];assert(Number.isFinite(d),key);max=Math.max(max,Math.abs(d));minSigned=Math.min(minSigned,d);maxSigned=Math.max(maxSigned,d);
  if(Math.abs(d)>1e-6)changed++;
 }
 if(changed===old.length&&maxSigned-minSigned<1e-7)stats.uniform++;
 maximum(key,max);assert(max<=limit,key+' jumped '+max);return max;
}
for(const [device,w,h] of [['phone',390,844],['tablet',1180,820]]){
 const aspect=Math.min(2.15*w/h*.862,2.45)/1.62;
 const create=()=>new Winter(aspect);
 const stats={uniform:0,samples:0,stages:{}};summary[device]=stats;
 function snapshot(s){return {temp:s.temp.slice(),ice:s.ice.slice(),water:s.water.slice(),clear:s.clear,door:s.doorAngle,latch:s.latch,travel:s.travel,twig:s.twig,pond:s.pond,pHeat:s.patches.map(p=>p.heat),pIce:s.patches.map(p=>p.ice),fall:s.patches.flatMap(p=>p.columns.map(c=>c.fall))}}
 function sample(s,test,prior){
  s.step(dt);const now=snapshot(s);stats.samples++;
  const td=checkArray(prior.temp,now.temp,'cellTempC',2.6,stats),id=checkArray(prior.ice,now.ice,'cellIce',.17,stats),wd=checkArray(prior.water,now.water,'cellWaterMM',.19,stats);
  const cd=checkArray(prior.fall,now.fall,'needleRad',.17,stats);checkArray(prior.pHeat,now.pHeat,'groundC',.60,stats);checkArray(prior.pIce,now.pIce,'groundIce',.11,stats);
  maximum('doorDeg',(now.door-prior.door)*deg);maximum('latchDeg',(now.latch-prior.latch)*.98*deg);maximum('travel',now.travel-prior.travel);maximum('twigRad',now.twig-prior.twig);
  maximum('poolRadiusM',(Math.sqrt(now.pond)-Math.sqrt(prior.pond))*.33);
  const ml=s.dripped*s.width*s.height/s.ice.length*1000;
  trace.push([device,test,s.time.toFixed(2),s.stage,Math.max(...s.temp),s.clear*100,Math.max(...s.water),ml,s.twig,s.latch*.98*deg,s.doorAngle*deg,s.travel,s.patches.reduce((n,p)=>n+p.columns.filter(c=>!c.intact).length,0),Math.max(...now.pHeat),Math.sqrt(s.pond)*.33,s.ripples[0]?.r||0,td,id,wd,cd,s.leaf.x,s.leaf.z,s.leaf.vx,s.flight.y].map(x=>typeof x==='number'?x.toFixed(6):x).join(','));
  return now;
 }
 let s=create(),prev=snapshot(s),baseMote={...s.motes[7]},initialWater=s.water.slice();
 for(let i=0;i<200;i++)prev=sample(s,'idle',prev);
 stats.idle={seconds:10,twigRad:s.twig,branchTipMM:1.74*Math.sin(s.twig*.16)*1000,dustMM:Math.hypot(s.motes[7].x-baseMote.x,s.motes[7].y-baseMote.y)*1000,flowMM:Math.max(...s.water.map((v,i)=>Math.abs(v-initialWater[i])))};
 assert.equal(s.stage,'frost');assert(s.getState().hint);assert(stats.idle.dustMM>1&&Math.abs(s.twig)>.00001);
 stats.holds=[];
 for(const length of [.25,2]){
  s=create();prev=snapshot(s);s.setContact('glass',.62,.25);
  for(let i=0;i<Math.round(length/dt);i++)prev=sample(s,'hold_'+length,prev);
  let area=sum(s.initial.map((v,i)=>v-s.ice[i]))*s.width*s.height/s.ice.length*10000;
  const therm={s:length,peakC:Math.max(...s.temp),radiusMM:s.warmRadius*1000,meltedEquivalentCM2:area,filmMM:Math.max(...s.water)};
  assert.equal(s.temp[s.temp.length-1],-2);s.release();const was=s.clear;
  for(let i=0;i<50;i++)prev=sample(s,'release_'+length,prev);
  therm.afterMeltCM2=(s.clear-was)*s.mass*s.width*s.height/s.ice.length*10000;assert(therm.afterMeltCM2>0);
  stats.holds.push(therm);
 }
 assert(stats.holds[1].meltedEquivalentCM2>stats.holds[0].meltedEquivalentCM2*5);
 stats.strokes=[];
 for(let duration of [.35,2.8]){
  s=create();prev=snapshot(s);let n=Math.round(duration/dt);
  for(let i=0;i<=n;i++){s.setContact('glass',.18+.60*i/n,.32);prev=sample(s,'stroke_'+duration,prev)}
  s.release();for(let i=0;i<16;i++)prev=sample(s,'stroke_tail_'+duration,prev);
  const area=sum(s.initial.map((v,i)=>v-s.ice[i]))*s.width*s.height/s.ice.length;
  stats.strokes.push({speedMPS:.6*s.width/duration,equivalentWidthMM:1000*area/(.6*s.width)});
 }
 assert(stats.strokes[1].equivalentWidthMM>stats.strokes[0].equivalentWidthMM*1.15);
 s=create();prev=snapshot(s);let lastStage='',grassIndex=-1,poolPressed=false,maxRipple=0,maxRunoff=0,maxPool=0,maxTilt=0,maxBroken=0,maxDrop=0,maxDoor=0,releaseT=0;
 let maxPTemp=-2,maxPContact=0,firstFracture=null,nonUniform=false,phaseAtPool=0,leafPressed=0,maxLeafSpeed=0,maxBirdHeight=0;
 for(let tick=0;tick<7800;tick++){
  if(lastStage!==s.stage){stats.stages[s.stage]=s.time;lastStage=s.stage}
  if(s.stage==='frost'){
   let n=Math.floor(tick/87),u=.13+(n%5)*.18,v=.16+(Math.floor(n/5)%4)*.22;
   if(tick%87<68)s.setContact('glass',u+.038*Math.sin(tick%87*.079),v);else s.release();
  }else if(s.stage==='door'){if(s.stageAge>1.9)s.setContact('handle')}
  else if(s.stage==='grass'){
   const k=Math.floor(s.stageAge/2.5)%9,p=s.patches[k];if(s.stageAge%2.5<1.15){if(grassIndex!==k){grassIndex=k;s.release()}s.setContact('grass',p.x,p.z)}else s.release()
  }else if(s.stage==='sun'){
   if(s.stageAge<2){let p=s.patches[8];s.setContact('sunIce',p.x,p.z);maxPContact=Math.max(maxPContact,p.heat)}
   else if(!poolPressed&&s.pond>.46){s.setContact('pool',0,-2.6);poolPressed=true;releaseT=s.time+.25;phaseAtPool=s.stageAge}
   else if(poolPressed&&s.time>releaseT+1.0&&leafPressed<10){s.setContact('leaf',s.leaf.x-.055,s.leaf.z-2.6+.025);leafPressed++}
   else if(s.time>releaseT)s.release();
  }
  prev=sample(s,'cycle',prev);
  const broken=s.patches.reduce((v,p)=>v+p.columns.filter(c=>!c.intact).length,0);
  if(broken&&firstFracture===null){firstFracture={time:s.stageAge,broken}}
  maxBroken=Math.max(maxBroken,broken);maxDoor=Math.max(maxDoor,s.doorAngle*deg);
  maxTilt=Math.max(maxTilt,...prev.fall);maxDrop=Math.max(maxDrop,...s.fragments.map(f=>f.y));
  if(s.stage==='sun')maxLeafSpeed=Math.max(maxLeafSpeed,Math.hypot(s.leaf.vx,s.leaf.vz));maxBirdHeight=Math.max(maxBirdHeight,s.flight.y);
  maxRipple=Math.max(maxRipple,...s.ripples.map(r=>r.r));maxRunoff=Math.max(maxRunoff,s.dripped*s.width*s.height/s.ice.length*1000);
  maxPool=Math.max(maxPool,Math.sqrt(s.pond)*.33);maxPTemp=Math.max(maxPTemp,...prev.pHeat);if(s.stage==='sun'&&Math.max(...prev.pIce)-Math.min(...prev.pIce)>.15)nonUniform=true;
  if(s.cycle)break;
 }
 assert.equal(s.cycle,1);assert.equal(s.stage,'frost');assert.equal(stats.uniform,0);assert(nonUniform&&poolPressed&&maxRipple>.07&&leafPressed===10&&maxLeafSpeed>.01);
 assert.deepEqual(Object.keys(stats.stages),['frost','door','walk','grass','sun','return']);
 stats.cycle={seconds:s.time,leafPeakCMPS:maxLeafSpeed*100,birdPeakM:maxBirdHeight,maxDoorDeg:maxDoor,firstFracture,maxBroken,maxFallDeg:maxTilt*deg,chipHeightCM:maxDrop*100,runoffML:maxRunoff,groundPeakC:maxPTemp,poolReferenceRadiusCM:maxPool*100,rippleRadiusCM:maxRipple*100,poolTouchAt:phaseAtPool};
}
assert(maxima.doorDeg<4&&maxima.travel<.024&&maxima.poolRadiusM<.026);
fs.writeFileSync(path.join(__dirname,'state-trace.csv.gz'),zlib.gzipSync(trace.join('\n')+'\n'));
console.log(JSON.stringify({dt,records:trace.length-1,summary,maxima},null,2));
