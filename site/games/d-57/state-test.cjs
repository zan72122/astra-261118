'use strict';
const {makeGame}=require('./physics.js');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const DT=.05, log=[], maxima={}, uniform={}, comparisons={}, bounds={},boundaryMax={},rawMax={},boundaries={newShoe:0,newDroplet:0};
const rnd=x=>+x.toFixed(7);
const fields={cells:['gloss','film','heat'],cloth:['y'],boards:['flex'],dust:['x','y'],stones:['x','y','z'],water:['h'],lamps:['angle','temp'],feet:['x','y','z'],drops:['s','y']};
const scalars=['force','speed','mean','peak','dip','door','wind','flow','wheelOmega','wheelAngle','lastSlip','lastTone','bucketAngle','bucketFill','pour'];
function capture(s){
  const row={stage:s.stage,cycle:s.cycle,time:rnd(s.elapsed),contact:s.contact,ready:s.ready};
  for(const k of scalars)row[k]=rnd(s[k]);
  for(const axis of ['x','y','z'])row['clothCenter.'+axis]=rnd(s.clothCenter[axis]);
  row.dropSerial=s.drops.map(d=>d.serial);
  for(const [g,keys] of Object.entries(fields))for(const k of keys)row[g+'.'+k]=s[g].map(c=>rnd(c[k]));
  return row;
}
function trial(name){
  const sim=makeGame(41291);let prev=capture(sim.read());log.push({run:name,...prev});
  function tick(){
    sim.step(DT);const row=capture(sim.read());
    if(row.cycle!==prev.cycle)boundaries.newShoe++;
    boundaries.newDroplet+=row.dropSerial.filter((n,i)=>n!==prev.dropSerial[i]).length;
    for(const k of [...scalars,'clothCenter.x','clothCenter.y','clothCenter.z',...Object.keys(fields).flatMap(g=>fields[g].map(f=>g+'.'+f))]){
      const array=Array.isArray(row[k]),now=array?row[k]:[row[k]],old=array?prev[k]:[prev[k]];
      let diffMin=Infinity,diffMax=-Infinity,change=0;
      for(let i=0;i<now.length;i++){
        const diff=now[i]-old[i];assert.ok(Number.isFinite(diff));rawMax[k]=Math.max(rawMax[k]||0,Math.abs(diff));
        if(row.cycle!==prev.cycle||(k.startsWith('drops.')&&row.dropSerial[i]!==prev.dropSerial[i])){
          boundaryMax[k]=Math.max(boundaryMax[k]||0,Math.abs(diff));continue;}
        diffMin=Math.min(diffMin,diff);diffMax=Math.max(diffMax,diff);
        change=Math.max(change,Math.abs(diff));const b=bounds[k]||(bounds[k]=[Infinity,-Infinity]);b[0]=Math.min(b[0],now[i]);b[1]=Math.max(b[1],now[i]);}
      // New shoe and the two feet return behind an opaque fade. Respawned water beads are new droplets.
      if(row.cycle===prev.cycle){
        maxima[k]=Math.max(maxima[k]||0,change);
        if(array&&now.length>1&&change>1e-6){
          comparisons[k]=(comparisons[k]||0)+1;
          if(diffMax-diffMin<1e-7)uniform[k]=(uniform[k]||0)+1;
        }
      }
    }
    log.push({run:name,...row});prev=row;return sim.read();
  }
  return {sim,tick};
}
const idle=trial('idle10'),initial=idle.sim.getState();
for(let k=0;k<200;k++)idle.tick();
const finalIdle=idle.sim.read(),dustDrift=Math.max(...finalIdle.dust.map((d,i)=>Math.hypot(d.x-initial.dust[i].x,d.y-initial.dust[i].y)));
assert.ok(dustDrift>.02);assert.ok(finalIdle.wheelAngle>.1);assert.ok(finalIdle.dropCount>0);
assert.ok(Math.abs(finalIdle.mean-.2)<1e-10);
// All runs use the same initial state, force, stroke path, duration and foot target.
// The shorter treatment rests for the unused strokes. A stroke lasts 0.80 s.
function polish(name,count){
  const t=trial(name),{sim,tick}=t;sim.dipCream();
  for(let pass=0;pass<14;pass++){
    for(let i=0;i<16;i++){let u=.10+.78*(pass%2?1-i/15:i/15);if(pass<count)sim.brush(u,.37+.08*Math.sin(i/15*Math.PI),.54);else sim.release();tick();}
  }
  sim.release();for(let i=0;i<18;i++)tick();
  const s=sim.getState();assert.ok(s.ready,name+' should unlock the hall');assert.equal(s.peak,.8);
  assert.ok(sim.startWalk());for(let i=0;i<24;i++)tick();
  assert.ok(sim.footstep(-.17,-2.18,.5));for(let i=0;i<16;i++)tick();
  return {...t,result:{strokes:count,mean:s.mean,peak:s.peak,film:Math.max(...s.cells.map(c=>c.film)),firstTone:sim.read().lastTone,slip:sim.read().lastSlip}};
}
const brief=polish('four',4),long=polish('fourteen',14);
assert.ok(long.result.mean>brief.result.mean+.015);
assert.ok(long.result.slip>brief.result.slip);
assert.ok(long.result.firstTone>brief.result.firstTone);
const forces=trial('contact-force');for(let i=0;i<20;i++){forces.sim.brush(.40,.37,0);forces.tick();}
const minimumForce=forces.sim.read().force;for(let i=0;i<30;i++){forces.sim.brush(.40,.37,1);forces.tick();}
const maximumForce=forces.sim.read().force;assert.ok(Math.abs(minimumForce-.5)<.00001&&Math.abs(maximumForce-3)<.00001);
assert.equal(forces.sim.read().mean.toFixed(4),'0.2000');
let rooms=new Map(),stages=new Set([1]),peakLift=0,peakWave=0,peakBoard=0,peakOmega=0,peakTemp=0;
const {sim,tick}=long;
let trials=0;
while(sim.read().cycle===0&&trials++<1800){
  const s=sim.read(),mz=(s.feet[0].z+s.feet[1].z)*.5;stages.add(s.stage);
  if(!s.flight&&!s.returning){let x=s.turn?.21:-.21;
    if(s.stage===2&&trials%3===0){sim.stir(x,mz-.74,.13);if(mz< -9&&mz> -11)sim.tipBucket();}
    if(s.stage===3&&trials%3===0)sim.stir(x,mz-.74,.12);
    sim.footstep(x,mz-.94,.5);}
  const f=tick();
  for(const e of sim.drain())if(e.type==='foot')rooms.set(e.material,{tone:e.tone,room:e.room,slip:e.slip});
  if(f.stage===2)peakLift=Math.max(peakLift,...f.stones.map(c=>c.y));
  if(f.stage===3)peakWave=Math.max(peakWave,...f.water.map(c=>Math.abs(c.h)));
  peakBoard=Math.max(peakBoard,...f.boards.map(c=>Math.abs(c.flex)));
  peakOmega=Math.max(peakOmega,f.wheelOmega);peakTemp=Math.max(peakTemp,...f.lamps.map(c=>c.temp));}
assert.equal(sim.read().cycle,1);assert.equal(sim.read().stage,0);assert.ok(stages.has(2)&&stages.has(3));
assert.equal(rooms.size,3);assert.ok(peakLift>.005);assert.ok(peakWave>.002);assert.ok(peakBoard>.002);
assert.ok(peakTemp>.7);assert.deepEqual(uniform,{});
for(const [key,limit] of Object.entries({'cells.gloss':.24,'cells.film':.2,'boards.flex':.015,'stones.y':.055,'water.h':.013,'feet.z':.17,'feet.y':.085,'cloth.y':.025,'lamps.angle':.04,'dust.x':.006,'door':.12,'wheelOmega':.09,'drops.s':.09,'drops.y':.08})){
  assert.ok(maxima[key]<limit,key+' '+maxima[key]+' exceeds '+limit);
}
const result={interval_s:DT,samples:log.length,contactForce_N:[minimumForce,maximumForce],idle:{dustDisplacement_m:rnd(dustDrift),wheelAngle_rad:rnd(finalIdle.wheelAngle),drops:finalIdle.dropCount},
  polish:[brief.result,long.result],rooms:Object.fromEntries(rooms),peaks:{board_m:peakBoard,gravel_m:peakLift,wave_m:peakWave,wheel_rad_s:peakOmega,lampFraction:peakTemp},maxAdjacent:maxima,maxIncludingResets:rawMax,boundaryEvents:boundaries,maxAtBoundary:boundaryMax,uniformChangingSteps:uniform,changingGridComparisons:comparisons,range:bounds};
const dest=path.join(__dirname,'measurements');fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'states.ndjson.gz'),zlib.gzipSync(log.map(r=>JSON.stringify(r)).join('\n')+'\n',{level:8}));
fs.writeFileSync(path.join(dest,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
