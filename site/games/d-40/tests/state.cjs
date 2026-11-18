'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { makeGarden, PILE } = require('../garden.js');

const DT = .05;
const mm = value => Math.round(value * 1000);
const xyz = a => [a.x, a.y, a.z];
const distance = (a,b) => Math.hypot(...a.map((x,i) => x-b[i]));
const range = values => Math.max(...values) - Math.min(...values);
const limits = {leaf_m:.29, rake_m:.25, wind_mps:.16, crown_rad:.030, door_rad:.125, dust_m:.035, ripple_m:.014, stack_m:.05,leafRoll_rad:.28,leafYaw_rad:.42,rakeTilt_rad:.09,resistance_N:.8,boat_m:.06,can_rad:.12,wheel_rad:.72,nut_m:.29,drop_m:.15,tine_m:.033};
const maxDelta = Object.fromEntries(Object.keys(limits).map(k => [k,0]));
const metrics = {dt_s:DT, runs:{}, maxDelta, uniformWindSteps:0, uniformLeafSteps:0};
const rows = [];
function record(name, s) {
  // Fixed point storage is for the trace only. All assertions use full precision.
  rows.push(JSON.stringify({
    run:name, ms:Math.round(s.elapsed*1000), act:s.act, cycle:s.cycle,
    leaves:s.leaves.map(l => [mm(l.x),mm(l.y),mm(l.z),mm(l.roll),mm(l.angle),mm(l.dry),+l.air+2*l.piled+4*l.caught]),
    air:s.cells.map(c => [mm(c.u),mm(c.w)]), crowns:s.crown.map(b => mm(b.angle)),
    dust:s.dust.map(d => xyz(d).map(mm)), pile:s.stack.map(p => mm(p.height)),
    rake:[...xyz(s.rake).map(mm),mm(s.rake.tilt),mm(s.rake.resistance)],
    tines_um:s.tines.map(t=>Math.round(t.bend*1e6)),nut:xyz(s.nut).map(mm), door_mrad:mm(s.door.angle), front_mm:mm(s.windFront),
    can_mrad:mm(s.water.tilt), waves_um:s.ripples.map(p => Math.round(p.h*1e6)),
    drops:s.drops.map(d => d.live?xyz(d).map(mm):null), boat_mm:mm(s.water.boatX),
    wheel_mrad:mm(s.water.spin), audio:[Math.round(s.fx.pitch),Math.round(s.fx.toothHz),Math.round(s.fx.crunchHz),mm(s.fx.rustle),mm(s.fx.scrape),mm(s.fx.crunch)]
  }));
}
function track(name, sim) {
  const s=sim.view();
  let previous=null,ticks=0;
  function sample() {
    record(name,s);
    const now={
      leaf_m:s.leaves.map(xyz), rake_m:[xyz(s.rake)], wind_mps:s.cells.map(c => [c.u,c.w]),
      crown_rad:s.crown.map(b => [b.angle]), door_rad:[[s.door.angle]],dust_m:s.dust.map(xyz),
      leafRoll_rad:s.leaves.map(l=>[l.roll]),leafYaw_rad:s.leaves.map(l=>[l.angle]),rakeTilt_rad:[[s.rake.tilt]],resistance_N:[[s.rake.resistance]],boat_m:[[s.water.boatX]],can_rad:[[s.water.tilt]],wheel_rad:[[s.water.spin]],
      tine_m:s.tines.map(t=>[t.bend]),nut_m:[s.nut.visible?xyz(s.nut):null],drop_m:s.drops.map(d=>d.live?[...xyz(d),d.serial]:null),
      ripple_m:s.ripples.map(p => [p.h]),stack_m:s.stack.map(p=>[p.height])
    };
    if(previous){
      for(const key of Object.keys(now)){
        const d=now[key].map((p,i)=>{
          const prior=previous[key][i];if(!prior||!p)return 0;
          if(key==='drop_m'&&p[3]!==prior[3])return 0;
          return distance(p,prior);
        });
        const largest=Math.max(...d);
        assert.ok(Number.isFinite(largest),name+' contains non-finite '+key);
        maxDelta[key]=Math.max(maxDelta[key],largest);
        if(largest>=limits[key]&&key==='leaf_m'){const id=d.indexOf(largest);console.log({id,previous:previous[key][id],leaf:s.leaves[id]});}
        assert.ok(largest<limits[key],name+' at '+s.elapsed.toFixed(2)+' s, '+key+' jumped by '+largest);
        if(key==='wind_mps'&&range(d)<1e-11)metrics.uniformWindSteps++;
        if(key==='leaf_m'&&range(d)<1e-11)metrics.uniformLeafSteps++;
      }
    }
    assert(s.rake.resistance>=.5&&s.rake.resistance<=4);
    previous=now;
  }
  sample();
  function step(count=1,onStep=()=>{}) {
    for(let i=0;i<count;i++){sim.step(DT);Object.assign(s,sim.view());ticks++;sample();onStep(s);}
  }
  function until(check,limit=180,onStep=()=>{}){
    let n=0;while(!check(s)&&n++<limit)step(1,onStep);
    assert(check(s),name+' did not reach its next action, currently '+s.act);
  }
  function save(){metrics.runs[name]={samples:ticks+1,seconds:ticks*DT};}
  return {s,step,until,save};
}

const seed=5451;
const idle=makeGarden(seed), base=idle.getState(), noInput=track('idle',idle);
noInput.step(200);noInput.save();
const idleEnd=idle.getState();
assert.equal(idleEnd.act,'gather');assert.equal(idleEnd.captured,0);
metrics.idle={
  meanDustTravel_m:idleEnd.dust.reduce((sum,d,i)=>sum+distance(xyz(d),xyz(base.dust[i])),0)/base.dust.length,
  maxBranchChange_rad:Math.max(...idleEnd.crown.map((b,i)=>Math.abs(b.angle-base.crown[i].angle))),
  maxWindChange_mps:Math.max(...idleEnd.cells.map((c,i)=>distance([c.u,c.w],[base.cells[i].u,base.cells[i].w]))),
  leavesLanded:base.leaves.filter(l=>l.air).length-idleEnd.leaves.filter(l=>l.air).length
};
assert(metrics.idle.meanDustTravel_m>.05);assert(metrics.idle.maxBranchChange_rad>.01);assert(metrics.idle.leavesLanded>0);
metrics.mass_kg=[Math.min(...base.leaves.map(l=>l.mass)), Math.max(...base.leaves.map(l=>l.mass))];
assert(metrics.mass_kg[0]>=.002&&metrics.mass_kg[1]<=.008);

// Identical seed, leaf masses, starting positions, tines and input samples.
function moistureRun(dry,name){
  const sim=makeGarden(seed,dry),t=track(name,sim),start=sim.getState();
  const x=t.s.rake.x,z=t.s.rake.z;
  assert(sim.begin('rake',x,z));
  let pitch=0,tooth=0,scrape=0,rustle=0;
  for(let i=1;i<=32;i++){
    sim.move(x+(PILE.x-x)*i/32,z+(PILE.z-z)*i/32);
    t.step();if(i===22){pitch=t.s.fx.pitch;tooth=t.s.fx.toothHz;}
    scrape=Math.max(scrape,t.s.fx.scrape);rustle=Math.max(rustle,t.s.fx.rustle);
  }
  const beforeRelease=t.s.rake.x;sim.end();t.step(32);t.save();
  const moved=t.s.leaves.slice(92,143).reduce((sum,l)=>sum+distance(xyz(l),xyz(start.leaves[l.id])),0)/51;
  return {start,stats:{dryness:dry,friction:.18+(1-dry)*.71,pitch_Hz:pitch,tooth_Hz:tooth,meanMove_m:moved,peakScrape:scrape,peakRustle:rustle,coast_m:Math.abs(t.s.rake.x-beforeRelease)}};
}
const dry=moistureRun(.94,'dry'),wet=moistureRun(.20,'wet');
for(const l of dry.start.leaves)l.dry=.20;
assert.deepEqual(dry.start,wet.start);
metrics.dry=dry.stats;metrics.wet=wet.stats;
assert(dry.stats.pitch_Hz>wet.stats.pitch_Hz+1500);
assert(Math.abs(dry.stats.meanMove_m-wet.stats.meanMove_m)>.025);
assert(dry.stats.coast_m>.015);

// Exercise the same contextual actions as the Pointer Events adapter.
const sim=makeGarden(seed),t=track('cycle',sim),s=t.s,actions=[];
let maxToothBend=0,maxToothSpread=0,maxPile=0,maxResistance=0,minResistance=Infinity,maxJump=0,maxDoorCrack=0,maxRipple=0,maxBoat=0,maxCan=0,maxDrops=0,burstPeak=0;
const see=s=>{
  maxToothBend=Math.max(maxToothBend,...s.tines.map(t=>t.bend));maxToothSpread=Math.max(maxToothSpread,range(s.tines.map(t=>t.bend)));
  if(actions.at(-1)!==s.act)actions.push(s.act);
  maxPile=Math.max(maxPile,s.currentPile);maxResistance=Math.max(maxResistance,s.rake.resistance);minResistance=Math.min(minResistance,s.rake.resistance);
  if(s.act==='burst'){maxJump=Math.max(maxJump,...s.leaves.filter(l=>l.released).map(l=>l.y));burstPeak=Math.max(burstPeak,s.leaves.filter(l=>l.released&&l.air).length);}
  if(s.stage===2)maxDoorCrack=Math.max(maxDoorCrack,s.door.angle);
  maxRipple=Math.max(maxRipple,...s.ripples.map(p=>p.h));maxBoat=Math.max(maxBoat,Math.abs(s.water.boatX));maxCan=Math.max(maxCan,s.water.tilt);maxDrops=Math.max(maxDrops,s.water.poured);
};
const tap=(kind,x=0,z=0)=>{assert(sim.begin(kind,x,z),'could not touch '+kind+' during '+s.act);sim.end();Object.assign(s,sim.view());};
const waitFor=act=>t.until(s=>s.act===act,280,see);
assert.equal(sim.begin('door',0,0),false);
t.step(82,see);
tap('rake',s.rake.x,s.rake.z);t.step(70,see);
for(let i=0;i<16&&s.stage===0;i++){
  const patch=s.leaves.find(l=>!l.piled&&!l.air&&Math.hypot(l.x-PILE.x,l.z-PILE.z)>1);
  tap('leaves',patch.x,patch.z);t.step(85,see);
}
assert.equal(s.act,'park');tap('pile');waitFor('dive');tap('pile');waitFor('nut');
const nutHeight=s.nut.y;tap('nut');assert.equal(s.act,'wind');
assert(sim.begin('path',-1.5,-.8));
for(let i=0;i<90;i++){sim.move(-1.5+i*.006,-.8-i*.014);t.step(1,see);}sim.end();
if(s.act==='wind'){tap('path');waitFor('door');}
t.step(20,see);const front=s.windFront;
tap('door');waitFor('pour');const doorOpen=s.door.angle;
tap('can');waitFor('sail');t.step(40,see);tap('boat');t.step(54,see);
tap('wheel');t.step(24,see);tap('can');t.step(62,see);tap('boat');t.step(35,see);
tap('exit');waitFor('gather');assert.equal(s.cycle,1);
t.save();
metrics.cycle={actions,maxToothBend_m:maxToothBend,maxToothSpread_m:maxToothSpread,maxPile_m:maxPile,minResistance_N:minResistance,maxResistance_N:maxResistance,
  burstPeak_leaves:burstPeak,burstHeight_m:maxJump,nutHeight_m:nutHeight,crunch_Hz:s.fx.crunchHz,windFront_m:front,
  doorCrack_rad:maxDoorCrack,doorOpen_rad:doorOpen,maxCanTilt_rad:maxCan,drops:maxDrops,
  maxRipple_m:maxRipple,boatDisplacement_m:maxBoat,loops:s.cycle};
assert(burstPeak>70&&maxJump>.9);assert(maxDoorCrack>.2&&doorOpen>1.5);
assert(maxRipple>.002&&maxBoat>.12&&maxCan>.4);
assert.equal(metrics.uniformWindSteps,0);assert.equal(metrics.uniformLeafSteps,0);

// The two step schedules integrate exactly the same fixed physical substeps.
const a=makeGarden(19),b=makeGarden(19);a.step(1);for(let i=0;i<20;i++)b.step(DT);assert.deepEqual(a.getState(),b.getState());
const traceHeader={format:'Autumn garden state trace',sample_s:DT,units:{leaves:'x y z mm, roll yaw mrad, dry per mille, flags (air 1, piled 2, caught 4)',air:'mm/s',crowns:'mrad',dust:'mm',pile:'mm',rake:'x y z mm, tilt mrad, resistance mN',nut:'mm',drops:'mm, null when detached stream has no particle in this slot',audio:'leaf Hz, tine Hz, mound Hz, normalized rustle/scrape/crunch per mille'},seed,mass_kg:base.leaves.map(l=>l.mass)};
const out=path.join(__dirname,'state-trace.ndjson.gz');
fs.writeFileSync(out,zlib.gzipSync([JSON.stringify(traceHeader),...rows].join('\n')+'\n',{level:7}));
metrics.totalSamples=rows.length;metrics.transitions=rows.length-Object.keys(metrics.runs).length;
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(metrics,null,2)+'\n');
console.log(JSON.stringify(metrics,null,2));
