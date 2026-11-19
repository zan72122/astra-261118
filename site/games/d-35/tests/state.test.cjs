'use strict';
// Run with node games/d-35/tests/state.test.cjs. No DOM, GPU or audio device is used.
const assert = require('node:assert/strict');
const {createWriteStream} = require('node:fs');
const {once} = require('node:events');
const {join} = require('node:path');
const {createGzip} = require('node:zlib');
const {make, materials, chapters} = require('../simulation.js');
const dt=.05, cm=5, degrees=180/Math.PI;
const stats={dt, samples:0, idle:{}, materials:{}, chapters:[], max:{}, uniform:0};
const archive=createGzip({level:7});
const output=createWriteStream(join(__dirname,'state-trace.ndjson.gz'));
archive.pipe(output);
const end=once(output,'finish');
const numerics=x=>Number.isFinite(x)?Math.round(x*1e6)/1e6:x;
const max=(name,x)=>{assert.ok(Number.isFinite(x),name);stats.max[name]=Math.max(stats.max[name]||0,x);};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const span=a=>Math.max(...a)-Math.min(...a);
function localDifferences(old,now,field,flags,name) {
  const changes=now.map((p,i)=>p[field]-old[i][field]);
  if(changes.some(x=>Math.abs(x)>1e-10)){
    flags[name]=(flags[name]||0)+1;
    if(span(changes)<1e-12)stats.uniform++;
  }
}
let previous,scenario,flags;
function record(g,label){
  const s=g.getState(),same=previous&&label===scenario,old=previous;
  if(!same)flags={};
  if(same){
    assert.ok(Math.abs(s.time-old.time-dt)<1e-8,'sample interval');
    localDifferences(old.dust,s.dust,'x',flags,'dust');
    localDifferences(old.leaves,s.leaves,'x',flags,'leaves');
    localDifferences(old.water,s.water,'x',flags,'water');
    max('dustCm',Math.max(...s.dust.map((p,i)=>distance(p,old.dust[i])*cm)));
    max('leafDeg',Math.max(...s.leaves.map((p,i)=>Math.abs(p.x-old.leaves[i].x)*degrees)));
    max('waterCm',Math.max(...s.water.map((p,i)=>Math.abs(p.x-old.water[i].x)*cm)));
    max('carriageStep',Math.abs(s.travel-old.travel));
    if(s.serial===old.serial){
      localDifferences(old.bodies,s.bodies,'y',flags,'buttons');
      localDifferences(old.facets,s.facets,'x',flags,'facets');
      localDifferences(old.facets,s.facets,'energy',flags,'transmittedLight');
      max('lightFraction',Math.max(...s.facets.map((f,i)=>Math.abs(f.energy-old.facets[i].energy))));
      for(const b of s.bodies)max('buttonCm',distance(b,old.bodies[b.id])*cm);
      max('lidDeg',Math.abs(s.lid.x-old.lid.x)*degrees);
      max('wheelDeg',Math.abs(s.wheel-old.wheel)*degrees);
      max('pumpCm',Math.abs(s.pump.x-old.pump.x)*cm);
      max('prismDeg',Math.max(...s.facets.map((f,i)=>Math.abs(f.x-old.facets[i].x)*degrees)));
      max('zoom',Math.abs(s.zoom.x-old.zoom.x));
    }else{
      assert.equal(old.phase,'out');assert.equal(s.phase,'in');
      assert.ok(Math.abs(s.serial-s.travel)>.42,'new assembly starts offstage');
    }
  }
  // All modeled regions, including velocities, are saved at each observation.
  archive.write(JSON.stringify({case:label,...s},(_,v)=>typeof v==='number'?numerics(v):v)+'\n');
  stats.samples++;previous=s;scenario=label;return s;
}
function advance(g,label){g.step(dt);return record(g,label);}
async function run(){
  const idle=make(),base=record(idle,'idle');
  let hintAt=null,finish;
  for(let i=0;i<200;i++){
    finish=advance(idle,'idle');if(hintAt===null&&finish.hint.age>0)hintAt=finish.time;
  }
  assert.equal(finish.fill,0);assert.equal(finish.contacts,0);
  stats.idle.dustCm=cm*Math.max(...finish.dust.map((p,i)=>distance(p,base.dust[i])));
  stats.idle.leafDeg=Math.max(...finish.leaves.map((p,i)=>Math.abs(p.x-base.leaves[i].x)))*degrees;
  stats.idle.waterMm=Math.max(...finish.water.map((p,i)=>Math.abs(p.x-base.water[i].x)))*50;
  stats.idle.hintAt=hintAt;stats.idle.movingIntervals={...flags};
  assert.ok(hintAt>=4-1e-7&&hintAt<4.06);assert.ok(stats.idle.dustCm>.5);
  for(const name of ['dust','leaves','water'])assert.equal(flags[name],200);
  for(let mi=0;mi<5;mi++){
    const g=make(8904),b=g.s.bodies[0],label='material-'+materials[mi].name;
    // The five runs differ only in the material ID of a single identical disc.
    b.mat=mi;assert.ok(g.pick(0));g.aim(g.s.jar.x,2.58,g.s.jar.z);record(g,label);
    for(let i=0;i<26;i++)advance(g,label);
    g.release(true);
    let first=null,peak=0,rebounds=0,restAt=0;
    for(let i=0;i<90;i++){
      advance(g,label);const hits=g.drain().filter(e=>e.type==='hit');
      if(hits.length){if(!first)first=hits[0];rebounds+=hits.length;}
      if(first&&rebounds===1)peak=Math.max(peak,(b.y-b.floor)*cm);
      if(b.status==='rest'&&!restAt)restAt=g.s.time;
    }
    assert.equal(g.s.fill,1);assert.ok(first);assert.ok(restAt>0);
    stats.materials[materials[mi].name]={frequencyHz:first.hz,reboundCmS:first.rebound*cm,
      sampledBounceCm:peak,ringDecayS:first.decay,settleS:restAt-first.time,impactCount:rebounds};
  }
  const m=stats.materials;
  assert.ok(m.metal.frequencyHz>m.shell.frequencyHz&&m.shell.frequencyHz>m.wood.frequencyHz);
  assert.ok(m.metal.reboundCmS>m.wood.reboundCmS&&m.wood.reboundCmS>m.shell.reboundCmS);
  assert.ok(m.metal.ringDecayS>m.shell.ringDecayS&&m.shell.ringDecayS>m.wood.ringDecayS);
  assert.ok(m.metal.sampledBounceCm>m.wood.sampledBounceCm*1.5);
  const g=make(),s=g.s;record(g,'workshop');
  // An abandoned pick returns to its own pocket without awarding a contact.
  assert.ok(!g.pick(-1));assert.ok(!g.ripple(0));assert.ok(!g.crank(1));assert.ok(!g.blow(0));
  const initial={...s.bodies[4]};g.pick(4);g.aim(initial.x+.50,1,initial.z);
  for(let i=0;i<13;i++)advance(g,'workshop');g.release(false);
  for(let i=0;i<50;i++)advance(g,'workshop');
  assert.equal(s.bodies[4].status,'ready');assert.ok(distance(initial,s.bodies[4])<1e-7);assert.equal(s.fill,0);
  let counter=0,active=-1,chapter,closedAt=null,heldAge=0,delay=0;
  while(!(s.serial===4&&s.phase==='play')){
    assert.ok(counter++<6500,'four chapters finish');
    if(active!==s.serial){
      active=s.serial;closedAt=null;delay=0;heldAge=0;
      chapter={stage:s.chapter,first:null,last:null,contacts:0,maxWaterMm:0,maxOmega:0,maxSailCm:0,maxPumpCm:0,maxFacet:0,maxLidSpeed:0};
      if(active<4)stats.chapters.push(chapter);
    }
    if(s.phase==='play'&&s.serial<4){
      const b=g.nextReady();
      if(s.held>=0){const body=s.bodies[s.held];heldAge+=dt;
        const q=Math.min(1,heldAge/.80);
        g.aim(initialTarget.x+(s.jar.x-initialTarget.x)*q,initialTarget.y+(chapters[0].h+.32-initialTarget.y)*q+.26*4*q*(1-q),initialTarget.z+(s.jar.z-initialTarget.z)*q);
        if(heldAge>=1.05){g.release(true);delay=1.33;}
      }else if(b&&delay<=0){
        if(s.chapter===0){initialTarget={x:b.x,y:b.y,z:b.z};g.pick(b.id);heldAge=0;}
        if(s.chapter===1){g.ripple(b.id,b.id%19);delay=1.85;}
        if(s.chapter===2){g.crank(.88);delay=1.22;}
        if(s.chapter===3){g.blow(b.id);delay=2.1;}
      }
      delay-=dt;
    }
    const before=s.phase;advance(g,'workshop');
    if(active!==s.serial)continue;
    for(const e of g.drain())if(e.type==='hit'){
      if(!chapter.first)chapter.first={...e};chapter.last={...e};chapter.contacts++;
    }
    if(before==='play'&&s.phase==='close'){
      closedAt=s.time;assert.equal(s.fill,chapters[s.chapter].count);
      chapter.stackTopCm=Math.max(...s.bodies.map(b=>b.supportTop))*cm;
      assert.ok(chapter.stackTopCm<=chapters[s.chapter].h*cm+.005,'pile fits below lid');
    }
    if(before==='close'&&s.phase==='prism'){chapter.closeS=s.time-closedAt;assert.ok(s.lid.x<.035);}
    chapter.maxWaterMm=Math.max(chapter.maxWaterMm,...s.water.map(c=>Math.abs(c.x)*50));
    chapter.maxOmega=Math.max(chapter.maxOmega,s.omega);chapter.maxPumpCm=Math.max(chapter.maxPumpCm,-s.pump.x*cm);
    chapter.maxSailCm=Math.max(chapter.maxSailCm,...s.bodies.filter(b=>b.status==='sail').map(b=>(b.y-b.startY)*cm));
    chapter.maxFacet=Math.max(chapter.maxFacet,...s.facets.map(f=>f.energy));
    chapter.maxLidSpeed=Math.max(chapter.maxLidSpeed,Math.abs(s.lid.v)*degrees);
    if(s.phase==='prism')assert.ok(s.fill===chapters[s.chapter].count);
  }
  for(const c of stats.chapters){
    assert.ok(c.first&&c.last&&c.closeS<2&&c.closeS>.4&&c.maxFacet>.6);
    assert.ok(c.last.bottomGain<c.first.bottomGain*.5);assert.ok(c.last.level>c.first.level);
    c.firstPitchMultiplier=c.first.hz/materials[c.first.mat].hz;
    c.lastPitchMultiplier=c.last.hz/materials[c.last.mat].hz;
  }
  assert.ok(stats.chapters[1].maxWaterMm>1);assert.ok(stats.chapters[2].maxOmega>.70);
  assert.ok(stats.chapters[3].maxSailCm>8);
  assert.equal(s.fill,0);assert.equal(stats.uniform,0);
  // Continuous quantities are bounded; impulses, latch contacts and gate events are discrete.
  assert.ok(stats.max.buttonCm<2.8);assert.ok(stats.max.lidDeg<15.5);assert.ok(stats.max.waterCm<.18);
  assert.ok(stats.max.lightFraction<.16);assert.ok(stats.max.carriageStep<.05);assert.ok(stats.max.pumpCm<.8);
  stats.cycleS=s.time;archive.end();await end;
  console.log(JSON.stringify(stats,(_,v)=>typeof v==='number'?numerics(v):v,2));
}
let initialTarget;
run().catch(e=>{archive.end();console.error(e);process.exitCode=1;});
