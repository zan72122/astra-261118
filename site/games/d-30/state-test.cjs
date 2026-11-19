// Run with node state-test.cjs. No DOM, browser, GPU, network or audio device.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const P=require('./sand.js');
const SoundGarden=require('./sound.js');
const dt=.05, mm=200, litres=8, radToDeg=180/Math.PI;
const reachLitres=.188*.44*litres; // Reference width and length of a water reach.
const csv=[['scenario','seconds','stage','crest_mm','mean_wet_pct','angle_at_crest_deg','max_grain_mm','bore_advance_mm','outlet_ml_s','bridge_position','car_mm','loaded_plank_mm','rain_fraction','sand_changed_cells','wet_changed_cells','max_dh_mm','max_dw_pctpt','sand_at_mouth_mm','sand_at_bank_mm','first_leaf_mm','last_leaf_mm','dust0_x_mm','bough0_deg','can_surface_mm','grains_airborne'].join(',')];
const limits={height:10,water:3,bore:4,board:1.5,car:8,bridge:.045,wind:.7,dust:2.5,waterSurface:3,riverDepth:4,leaf:12};
const maximum=Object.fromEntries(Object.keys(limits).map(k=>[k,0]));
let uniform=0,checked=0,checkedPairs=0,playRows=0;
const measures={},milestones=[];
function zoneStats(arr,prev,scale){
  let lo=Infinity,hi=-Infinity,changed=0,largest=0;
  for(let i=0;i<arr.length;i++){
    const delta=(arr[i]-prev[i])*scale;
    assert(Number.isFinite(delta));lo=Math.min(lo,delta);hi=Math.max(hi,delta);
    largest=Math.max(largest,Math.abs(delta));if(Math.abs(delta)>1e-7)changed++;
  }
  // A resting field may correctly be all zero. An identical, nonzero increment is a fault.
  if(changed===arr.length&&hi-lo<1e-7)uniform++;
  checked++;return{changed,largest};
}
function watch(name,value){
  assert(Number.isFinite(value),name);maximum[name]=Math.max(maximum[name],Math.abs(value));
}
function capture(m){
  const s=m.s;
  return {h:s.h.slice(),water:s.water.slice(),bore:s.bore,bridge:s.bridge.p,car:s.car.x,
    board:s.plank.map(v=>v.p),wind:s.wind.map(v=>v.p),dust:s.dust.map(d=>[d.x,d.y,d.z]),
    pool:s.meniscus.map(v=>v.p),depth:s.stream.map(a=>a.depth),leaf:s.leaves.map(l=>[l.active,l.u])};
}
function examine(name,t,m,prev){
  const s=m.s,h=zoneStats(s.h,prev.h,mm),wet=zoneStats(s.water,prev.water,100);
  watch('height',h.largest);watch('water',wet.largest);watch('bore',(s.bore-prev.bore)*4.4*mm);
  watch('bridge',s.bridge.p-prev.bridge);watch('car',(s.car.x-prev.car)*mm);
  const now=capture(m);
  for(const [key,metric,scale] of [['board','board',mm],['wind','wind',radToDeg],['pool','waterSurface',mm],['depth','riverDepth',mm]]){
    const d=zoneStats(now[key],prev[key],scale);watch(metric,d.largest);
  }
  now.dust.forEach((p,i)=>watch('dust',Math.hypot(...p.map((x,k)=>x-prev.dust[i][k]))*mm));
  now.leaf.forEach(([active,z],i)=>{if(active&&prev.leaf[i][0])watch('leaf',(z-prev.leaf[i][1])*mm);});
  const ground=m.sample(s.h,P.cx,P.cz),localWet=m.sample(s.water,P.cx,P.cz);
  const furthest=s.grains.reduce((v,g)=>Math.max(v,g.y-m.sample(s.h,g.x,g.z)),0)*mm;
  const line=[name,t,s.stage,ground*mm,s.wetMean*100,P.slope(localWet),furthest,s.bore*4.4*mm,
    s.flow*reachLitres*1000,s.bridge.p,s.car.x*mm,Math.min(...s.plank.map(o=>o.p))*mm,s.rain,
    h.changed,wet.changed,h.largest,wet.largest,m.sample(s.h,P.cx,1.46)*mm,m.sample(s.h,P.cx+.78,.12)*mm,
    s.leaves[0].active?s.leaves[0].u*mm:'',s.leaves[4].active?s.leaves[4].u*mm:'',
    s.dust[0].x*mm,s.wind[0].p*radToDeg,s.meniscus[0].p*mm,s.grains.length];
  csv.push(line.map(v=>typeof v==='number'?Number(v.toFixed(6)):v).join(','));
  checkedPairs++;return {now,furthest};
}
{
  const m=P.create(),start=capture(m);let prev=start;
  for(let i=1;i<=200;i++){m.step(dt);prev=examine('idle',i*dt,m,prev).now;}
  assert.equal(m.s.stage,'pile');assert.equal(m.s.pile,0);
  measures.idleWindDeg=Math.max(...start.wind.map((w,i)=>Math.abs(m.s.wind[i].p-w)))*radToDeg;
  measures.idleDustMm=Math.max(...start.dust.map((p,i)=>Math.hypot(m.s.dust[i].x-p[0],m.s.dust[i].y-p[1])))*mm;
  measures.idlePoolMm=Math.max(...m.s.meniscus.map(o=>Math.abs(o.p)))*mm;
  assert(measures.idleDustMm>10&&measures.idleWindDeg>.2&&measures.idlePoolMm>.1);
  assert(!m.act('can'));assert(!m.act('sand',5.1,3));m.step(.2);assert.equal(m.s.pile,0);
}
for(const [name,amount] of [['dry',0],['damp',.0016],['soaked',.012]]){
  const m=P.create(822);let prev=capture(m);
  for(let i=1;i<=280;i++){m.wet(P.cx,P.cz,amount,2.1);m.step(dt);prev=examine(name,i*dt,m,prev).now;}
  const w=m.sample(m.s.water,P.cx,P.cz);
  measures[name]={saturationPct:w*100,angleDeg:P.slope(w),crestMm:m.sample(m.s.h,P.cx,P.cz)*mm,movedMl:m.s.slides*litres*1000};
}
assert(measures.damp.angleDeg>measures.dry.angleDeg+15);assert(measures.soaked.angleDeg<measures.dry.angleDeg-10);
assert(measures.soaked.crestMm<measures.damp.crestMm-20);
assert(measures.damp.movedMl<measures.dry.movedMl);
{
  const m=P.create(),s=m.s,actions={pile:'sand',wet:'can',dig:'shovel',stream:'can',bridge:'bridge',drive:'car'};
  const sandMass=()=>s.h.reduce((a,b)=>a+b,0)*P.dx*P.dz;
  const initialMass=sandMass(),initialTop=Math.max(...s.h);
  const synth=new SoundGarden(),voices={grains:0,water:0,spade:0,deck:0};
  synth.ctx={}; // Count synthesis commands at the audio-device boundary without playback.
  synth.voice=(frequency,duration,amplitude,noisy,pan,end)=>{
    assert(frequency>0&&end>0&&amplitude>0&&duration>0);
    if(noisy&&duration<.113)voices.grains++;
    if(!noisy&&duration===.055)voices.water++;
    if(frequency===680)voices.spade++;
    if(!noisy&&duration===.09)voices.deck++;
  };
  let prev=capture(m),last='',high=initialTop,minBoard=0,peakFlow=0,vel=0,grainHeight=0,maxRain=0,maxBore=0;
  for(let i=1;i<=5600&&!s.cycle;i++){
    if(s.stage!==last){
      milestones.push([s.stage,+s.time.toFixed(3)]);last=s.stage;
      if(last==='wet'){assert(Math.abs(initialMass-sandMass())<1e-7,'dry sand mass conservation');measures.piledLitres=s.pile*litres;}
      if(last==='rain')measures.rainStartMm=m.sample(s.h,P.cx,P.cz)*mm;
      if(last==='river')measures.rainEndMm=m.sample(s.h,P.cx,P.cz)*mm;
      if(last==='drain')measures.leafPathMm=(s.leaves[4].u+2.55)*mm;
      if(actions[last])assert(m.act(actions[last]),last+' receives input');
    }
    m.step(dt);synth.update(s,dt);const observed=examine('play',i*dt,m,prev);prev=observed.now;playRows++;
    grainHeight=Math.max(grainHeight,observed.furthest);if(s.stage==='pile'&&!s.cycle)high=Math.max(high,...s.h);
    minBoard=Math.min(minBoard,...s.plank.map(o=>o.p));peakFlow=Math.max(peakFlow,s.flow);vel=Math.max(vel,s.car.v);
    maxRain=Math.max(maxRain,s.rain);maxBore=Math.max(maxBore,s.bore);
  }
  assert.equal(s.cycle,1,'rain and river return to the sandbox');assert.equal(s.stage,'pile');
  assert.deepEqual(milestones.map(v=>v[0]),P.stages);
  Object.assign(measures,{peakGrowthMm:(high-initialTop)*mm,grainHeightMm:grainHeight,
    peakOutletMlS:peakFlow*reachLitres*1000,boreAdvanceMm:maxBore*4.4*mm,
    boardMm:-minBoard*mm,carSpeedMmS:vel*mm,wheelTurns:s.rideDistance/(.142*2*Math.PI),cycleSeconds:s.time,
    finalReliefMm:(Math.max(...s.h)-Math.min(...s.h))*mm});
  measures.audioCommands=voices;assert(Object.values(voices).every(n=>n>0));
  assert(peakFlow>.04&&minBoard<-.023&&maxRain>.85);assert(measures.rainStartMm>measures.rainEndMm+75);
  assert(measures.finalReliefMm<26,'sandbox settles');
  // A fresh pile can actually be built after the sediment and toys settle.
  assert(m.act('sand'));for(let i=0;i<800&&s.stage==='pile';i++)m.step(dt);assert.equal(s.stage,'wet');
}
{
  // Button-up leaves the watering can coasting. It gradually comes to rest.
  const m=P.create();m.act('bucket');while(m.s.stage==='pile')m.step(.05);
  m.act('can');m.step(.5);m.release();const before=m.s.canTilt.p;m.step(.05);
  assert(m.s.canTilt.p>before*.75);m.step(4);assert(Math.abs(m.s.canTilt.p)<.01);
  const a=P.create(70),b=P.create(70);a.step(1);for(let i=0;i<20;i++)b.step(.05);
  assert.deepEqual(a.getState(),b.getState(),'fixed substeps do not depend on drawing cadence');
}
for(const [key,limit] of Object.entries(limits))assert(maximum[key]<limit,key+' jump '+maximum[key]+' >= '+limit);
assert.equal(uniform,0,'uniform non-zero movement');
fs.writeFileSync(path.join(__dirname,'measurements.csv'),csv.join('\n')+'\n');
console.log(JSON.stringify({stepSeconds:dt,checkedPairs,fieldComparisons:checked,uniformNonzero:uniform,playRows,milestones,measures,maximum},null,2));
