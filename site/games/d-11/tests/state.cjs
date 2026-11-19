'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {once}=require('node:events');
const F=require('../simulation.js');
const step=.05, cellArea=F.L*F.W/(F.NX*F.NZ), round=n=>+n.toFixed(9);
const max=a=>Math.max(...a),min=a=>Math.min(...a),sum=a=>a.reduce((x,y)=>x+y,0);
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,`${a} is not within ${eps} of ${b}`);
const trace=zlib.createGzip({level:7}),file=fs.createWriteStream(path.join(__dirname,'trace.ndjson.gz'));
trace.pipe(file);
const write=row=>trace.write(JSON.stringify(row)+'\n');
const maxStep={belt_m:0,feed_m:0,road_m:0,bodyHeight_m:0,tool_m:0,coat_mm:0,wet_mL:0,
  wave_m:0,door_m:0,pendant_rad:0,dust_m:0,deckCar_m:0,truck_m:0,airborneDrop_m:0};
const stats={paintUniformSteps:0,paintActiveSteps:0,waterUniformSteps:0,waterActiveSteps:0};
const updateMax=(k,n)=>{assert.ok(Number.isFinite(n));maxStep[k]=Math.max(maxStep[k],Math.abs(n));};
function snapshot(s,detail){
  const c=s.car;
  return {t:round(s.time),phase:s.phase,batch:s.batch,id:c.id,belt:s.belt,x:c.x,d:c.distance,speed:c.speed,height:c.height,
    litres:c.volume,landed:c.deposited,wet:c.cells.map(a=>a.wet),film:c.cells.map(a=>(a.solids+a.wet)/cellArea),
    arm:s.arm.joint.map(a=>a.p),wheels:c.wheels.join(''),door:s.door.p,water:s.water.map(a=>a.h),pendant:s.pendants.map(a=>a.p),
    deck:s.garage.map(a=>[a.id,a.x.p,a.y.p,a.z.p]),truck:s.truck.p,drops:s.splashes.map(a=>({p:a,y:a.y})),
    ...(detail?{heat:c.cells.map(a=>a.heat),pigment:c.cells.map(a=>a.pigment.slice()),dust:s.dust.map(a=>[a.x,a.y,a.z])}:{})};
}
function inspect(prev,b,caseName,detail){
  let wetChange=0,spread=0;
  if(prev){
    updateMax('belt_m',b.belt-prev.belt);updateMax('tool_m',Math.hypot(...prev.arm.map((a,i)=>b.arm[i]-a)));
    updateMax('door_m',b.door-prev.door);
    b.pendant.forEach((a,i)=>updateMax('pendant_rad',a-prev.pendant[i]));
    if(detail)b.dust.forEach((v,i)=>updateMax('dust_m',Math.hypot(...v.map((n,j)=>n-prev.dust[i][j]))));
    if(b.truck>=prev.truck)updateMax('truck_m',b.truck-prev.truck);
    for(const a of b.deck){const old=prev.deck.find(o=>o[0]===a[0]);if(old)updateMax('deckCar_m',Math.hypot(...a.slice(1).map((v,i)=>v-old[i+1])));}
    for(const drop of b.drops){const old=prev.drops.find(o=>o.p===drop.p);if(old)updateMax('airborneDrop_m',drop.y-old.y);}
    if(b.id===prev.id){
      updateMax('feed_m',b.x-prev.x);updateMax('road_m',b.d-prev.d);updateMax('bodyHeight_m',b.height-prev.height);
      const dv=b.wet.map((a,i)=>(a-prev.wet[i])*1000);
      wetChange=max(dv.map(Math.abs));spread=max(dv)-min(dv);updateMax('wet_mL',wetChange);
      if(wetChange>1e-8){stats.paintActiveSteps++;if(spread<1e-10)stats.paintUniformSteps++;}
      b.film.forEach((v,i)=>updateMax('coat_mm',v-prev.film[i]));
    }
    const w=b.water.map((a,i)=>a-prev.water[i]);updateMax('wave_m',max(w.map(Math.abs)));
    if(max(w.map(Math.abs))>1e-8){stats.waterActiveSteps++;if(max(w)-min(w)<1e-12)stats.waterUniformSteps++;}
  }
  const row={case:caseName,t:b.t,phase:b.phase,car:b.id,belt_m:round(b.belt),feed_m:round(b.x),road_m:round(b.d),
    speed_m_s:round(b.speed),bodyHeight_m:round(b.height),emitted_L:round(b.litres),landed_L:round(b.landed),
    water_m:b.water.map(round),arm_m:b.arm.map(round),wheels:b.wheels,door_m:round(b.door),pendant_rad:b.pendant.map(round),
    localWetMaxDelta_mL:round(wetChange),localWetDeltaRange_mL:round(spread),truck_m:round(b.truck),deck_m:b.deck};
  if(detail)Object.assign(row,{wet_L:b.wet.map(round),film_mm:b.film.map(round),heat:b.heat.map(round),
    pigment_L:b.pigment.map(p=>p.map(round)),dust_m:b.dust.map(v=>v.map(round))});
  write(row);return b;
}
const result={};
function idle(){
  const g=F.create(),start=g.getState();let prev=inspect(null,snapshot(g.state,true),'idle',true),hintAt=null;
  for(let i=0;i<200;i++){g.step(step);const s=g.state;if(s.tip&&hintAt===null)hintAt=round(s.time);prev=inspect(prev,snapshot(s,true),'idle',true);}
  const s=g.getState(),displacements=s.dust.map((p,i)=>Math.hypot(p.x-start.dust[i].x,p.y-start.dust[i].y,p.z-start.dust[i].z));
  near(s.belt,5);near(s.car.x-start.car.x,1);assert.equal(s.phase,'paint');near(s.car.volume,0);assert.ok(hintAt>=4&&hintAt<=4.05);
  result.idle={belt_m:s.belt,feed_m:s.car.x-start.car.x,dustDriftRange_m:[min(displacements),max(displacements)],firstHint_s:hintAt,
    pendant_rad:s.pendants.map(p=>p.p),waveMax_mm:max(s.water.map(p=>Math.abs(p.h)))*1000,lightChange:s.light.p-start.light.p};
}
function spray(seconds){
  const g=F.create();let prev=inspect(null,snapshot(g.state,true),'spray'+seconds,true),nearRelease,peakFilm=0;
  for(let i=0;i<160;i++){
    if(i===20)g.touch('can',1);
    if(i===20+seconds/step){g.release();nearRelease=g.state.car.volume;}
    g.step(step);prev=inspect(prev,snapshot(g.state,true),'spray'+seconds,true);peakFilm=Math.max(peakFilm,max(prev.film));
  }
  const c=g.state.car,wet=sum(c.cells.map(a=>a.wet)),solid=sum(c.cells.map(a=>a.solids));
  near(c.volume,.4*seconds);near(c.volume,nearRelease);near(c.deposited,c.volume*.88);near(solid,c.deposited*.43);
  assert.ok(wet<c.deposited*.57);assert.ok(c.cells.every(a=>a.wet>=0&&a.solids>=0&&a.pigment[0]===0&&a.pigment[2]===0));
  return {emitted_L:c.volume,deposited_L:c.deposited,drySolids_L:solid,wetAt8s_L:wet,evaporated_L:c.deposited*.57-wet,
    peakLocalFilm_mm:peakFilm,peakSolids_mm:max(c.cells.map(a=>a.solids/cellArea))};
}
function cycle(){
  const g=F.create(),events=[],flights=[],masses=[],controlHold=[],wheelCounts=[];let prev=inspect(null,snapshot(g.state,false),'cycle',false);
  let peakSpray=0,splashHeight=0,peakWave=0,doorTop=0,lightPeak=0,peakLift=0,peakBank=0,fordDepth=0,samples=1;
  for(let i=0;i<6000&&!g.state.cycles;i++){
    const s=g.state,phase=s.phase,idx=s.batch;
    if(phase==='paint'&&s.age<1.25&&!s.held)g.touch('can',idx);
    if(s.held&&s.age>=1.25)g.release();
    if(phase==='gate'){
      const before=s.car.distance;
      if(s.age>4.5){
        assert.equal(s.tip,true);controlHold.push(s.age);assert.equal(g.touch('elsewhere'),false);assert.equal(g.touch(s.feature),true);
      }else {assert.equal(s.car.speed,0);assert.equal(before,s.car.distance);}
    }
    g.step(step);
    const b=snapshot(s,false);prev=inspect(prev,b,'cycle',false);samples++;
    if(phase!==s.phase)events.push([round(s.time),s.phase,s.feature]);
    peakSpray=Math.max(peakSpray,s.splashes.length);
    for(const a of s.splashes)splashHeight=Math.max(splashHeight,a.y);
    peakWave=Math.max(peakWave,...s.water.map(a=>Math.abs(a.h)));
    if(s.batch===1)peakBank=Math.max(peakBank,s.bridge.p*.93);if(s.batch===2)fordDepth=Math.max(fordDepth,s.waterDepth);
    doorTop=Math.max(doorTop,s.door.p);lightPeak=Math.max(lightPeak,s.twilight.p);peakLift=Math.max(peakLift,s.lift.p);
    if(s.phase==='park'&&phase!=='park'){flights.push(s.car.maxHeight);masses.push(s.car.mass);wheelCounts.push(sum(s.car.wheels));}
  }
  assert.equal(g.state.cycles,1);assert.equal(g.state.phase,'paint');assert.equal(g.state.car.shape,3);
  assert.deepEqual(wheelCounts,[4,4,4]);assert.equal(controlHold.length,3);assert.ok(peakSpray>20&&splashHeight>.2);
  result.cycle={seconds:g.state.time,samples,flights_m:flights,masses_kg:masses,doorTop_m:doorTop,liftTravel_m:.934*peakLift,
    bridgeRaised_deg:peakBank*180/Math.PI,fordDepth_m:fordDepth,peakSplashes:peakSpray,splashTop_m:splashHeight,peakWave_m:peakWave,twilightPeak:lightPeak,events};
}
function massTrial(mass){
  const g=F.create();g.step(1);const s=g.state,c=s.car;
  s.phase='drive';s.batch=2;s.feature='sluice';s.gate=true;s.sluice.p=1;s.waterDepth=.1;
  c.distance=F.ford-.04;c.height=F.roadY(c.distance);c.mass=mass;c.speed=3;
  let ymax=0,n=0;for(let i=0;i<25;i++){g.step(step);n=Math.max(n,s.splashes.length);for(const p of s.splashes)ymax=Math.max(ymax,p.y);}
  return {mass_kg:mass,particles:n,top_m:ymax};
}
(async()=>{
  idle();result.spray1s=spray(1);result.spray2s=spray(2);
  near(result.spray2s.emitted_L/result.spray1s.emitted_L,2);
  assert.ok(result.spray2s.peakLocalFilm_mm>result.spray1s.peakLocalFilm_mm);
  cycle();result.massTrial=[massTrial(.46),massTrial(.9)];
  assert.ok(result.massTrial[1].particles>result.massTrial[0].particles&&result.massTrial[1].top_m>result.massTrial[0].top_m);
  assert.equal(stats.paintUniformSteps,0);assert.equal(stats.waterUniformSteps,0);
  // Limits in physical units, per 50 ms, across identical parts and chassis IDs.
  for(const [k,limit] of Object.entries({belt_m:.025001,feed_m:.025001,road_m:.19,bodyHeight_m:.05*Math.sqrt(2*9.81*1.5),tool_m:Math.sqrt(3)*2.25*.05,
    coat_mm:.05,wet_mL:.7,wave_m:.055,door_m:.06,pendant_rad:.006,dust_m:.03,deckCar_m:.5,truck_m:.13,airborneDrop_m:.25})){
    assert.ok(maxStep[k]<=limit,`${k}: ${maxStep[k]} > ${limit}`);
  }
  result.maxStep=maxStep;result.uniformity=stats;
  write({summary:result});trace.end();await once(file,'finish');
  console.log(JSON.stringify(result,(k,v)=>typeof v==='number'?round(v):v,2));
})().catch(err=>{trace.end();console.error(err);process.exitCode=1;});
