'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {gzipSync} = require('node:zlib');
const A = require('./simulation.js');
const stepSize = 0.05, rad = 180 / Math.PI;
const trace = [], stats = new Map();
const round = n => Number(n.toFixed(7));
const values = (array, property) => array.map(item => item[property]);
const maxAbs = a => Math.max(...a.map(Math.abs));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const groups = {
  indicator:s=>values(s.banks,'filament'),
  speed: s=>values(s.banks,'speed'),
  flex: s=>s.banks.flatMap(b=>values(b.flex,'y')),
  stance: s=>[s.stance], shoe: s=>[s.shoeY], gust: s=>values(s.wind,'speed'),
  foliage: s=>values(s.leaves,'angle'), wet: s=>values(s.leaves,'wet'),
  head: s=>[s.pressure], jet: s=>s.jets.flat(), surface: s=>values(s.water,'h'),
  heat: s=>values(s.lamps,'heat').map(t=>t*40), pendant: s=>values(s.lamps,'angle'),
  rotor: s=>[s.rotor], omega:s=>[s.omega], wing:s=>values(s.wings,'angle'),
  door:s=>values(s.door,'x'), dust:s=>s.dust.flatMap(p=>[p.x,p.y,p.z]),
  hint:s=>[s.hint]
};
// Limits cover continuous physical output. Switches, impulses, comb tooth indices,
// route changes and individual drop impacts have intentional discrete events.
const limits = {indicator:0.20,speed:0.064,flex:0.0018,stance:0.012,shoe:0.004,gust:0.16,
  foliage:0.016,wet:0.05,head:0.046,jet:0.125,surface:0.009,
  heat:3.6,pendant:0.026,rotor:0.20,omega:0.19,wing:0.062,door:0.075,dust:0.014,hint:0.115};
let previous, lastRider, maxRider=0, maxRide=0;
function record(label,s) {
  const row={run:label,t:round(s.time),stage:s.stage,bank:s.bank,phase:s.phase,held:s.held,toyHeld:s.toyHeld,
    progress:round(s.progress),rider:[s.rider.x,s.rider.y,s.rider.z].map(round)};
  const cont={};
  for(const [name,fn] of Object.entries(groups)){
    const a=fn(s);cont[name]=a;assert(a.every(Number.isFinite),name);
    row[name]=a.map(round);
    let stat=stats.get(name);if(!stat){stat={delta:0,min:Infinity,max:-Infinity,changing:0,uniform:0};stats.set(name,stat);}
    stat.min=Math.min(stat.min,...a);stat.max=Math.max(stat.max,...a);
    if(previous){
      const delta=a.map((v,i)=>v-previous[name][i]),max=maxAbs(delta);
      stat.delta=Math.max(stat.delta,max);
      if(a.length>1 && max>0.00001){stat.changing++;if(Math.max(...delta)-Math.min(...delta)<0.00000001)stat.uniform++;}
    }
  }
  if(lastRider){
    const change=distance(lastRider.p,s.rider);maxRider=Math.max(maxRider,change);
    if(s.phase==='riding'&&lastRider.phase==='riding')maxRide=Math.max(maxRide,change);
  }
  trace.push(JSON.stringify(row));previous=cont;lastRider={p:{...s.rider},phase:s.phase};
}
function run(label,options){
  previous=null;lastRider=null;
  const sim=A.create(options);record(label,sim.state);
  return {sim,s:sim.state,tick(){sim.step(stepSize);record(label,sim.state);}};
}
const tickFor=(r,seconds)=>{for(let i=0;i<Math.round(seconds/stepSize);i++)r.tick();};
const idle=run('idle'),start=idle.sim.getState();tickFor(idle,10);
assert.equal(idle.s.phase,'ready');assert.equal(idle.s.progress,0);
const idleDelta=(key,fn)=>maxAbs(fn(idle.s).map((v,i)=>v-fn(start)[i]));
const idleResult={};
for(const name of ['gust','foliage','surface','pendant','rotor','wing','dust']) {
  idleResult[name]=idleDelta(name,groups[name]);assert(idleResult[name]>1e-5,name+' idle');
}
assert.equal(idle.s.banks[0].speed,0.5);assert(idle.s.banks.slice(1).every(b=>b.speed===0));
const hintRun=trace.map(JSON.parse).find(r=>r.hint>0.001);
const dirs=[];
for(const direction of [1,-1]){
  const r=run(direction===1?'up':'down',{seed:99,direction});
  tickFor(r,0.5);const y0=r.s.rider.y;
  assert(r.sim.press('ride'));tickFor(r,1);r.sim.release();tickFor(r,9);
  dirs.push({travel:r.s.banks[0].travel,dy:r.s.rider.y-y0,speed:r.s.banks[0].speed,
    wind:r.s.wind.map(w=>w.speed),distance:r.s.progress});
}
assert.equal(dirs[0].distance,dirs[1].distance);assert(Math.abs(dirs[0].dy+dirs[1].dy)<1e-9);
assert.deepEqual(dirs[0].wind,dirs[1].wind);assert.equal(dirs[0].speed,-dirs[1].speed);
assert(Math.abs(dirs[0].distance-5)<1e-8);assert(dirs[0].dy>1.8);
const r=run('tour'),visits=[],linger=[],durations=[3.5,3.5,4,3];
let rideAge=0,toyAge=0,hasToy=false,wasStage=-1,firstRelease=null;
for(let i=0;i<7200;i++){
  if(r.s.phase==='ready'){
    if(r.s.tours===1)break;
    assert(!r.sim.press('toy'));assert(r.sim.press('ride'));rideAge=0;
  }
  if(r.s.phase==='riding'&&r.s.held){
    rideAge+=stepSize;if(rideAge>=2.5){r.sim.release();if(!firstRelease)firstRelease=r.s.time;}
  }
  if(r.s.phase==='gallery'){
    if(wasStage!==r.s.stage){wasStage=r.s.stage;visits.push([r.s.stage,round(r.s.time)]);toyAge=0;hasToy=false;}
    toyAge+=stepSize;
    if(!hasToy && toyAge>=0.8){assert(r.sim.press('toy'));hasToy=true;}
    if(r.s.toyHeld && toyAge>=durations[r.s.stage]+0.8){
      r.sim.release();linger.push({stage:r.s.stage,at:r.s.time,before:groups[['head','heat','omega','door'][r.s.stage]](r.s)});
    }
    const probe=linger.at(-1);
    if(probe && probe.stage===r.s.stage && !probe.after && r.s.time-probe.at>=0.5){
      probe.after=groups[['head','heat','omega','door'][r.s.stage]](r.s);
    }
  }
  r.tick();
}
assert.equal(r.s.phase,'ready');assert.equal(r.s.tours,1);assert.equal(r.s.bank,0);
assert.deepEqual(visits.map(v=>v[0]),[0,1,2,3]);assert(visits[0][1]>firstRelease);
assert(linger.every(l=>l.after && maxAbs(l.after.map((n,i)=>n-l.before[i]))>1e-5));
assert(maxRide<0.025001);assert(maxRider<0.062);
for(const [key,st] of stats){
  assert(st.delta<=limits[key],key+' delta '+st.delta+' > '+limits[key]);
  assert.equal(st.uniform,0,key+' had identical active increments');
}
const one=A.create(),many=A.create();one.step(10);for(let i=0;i<200;i++)many.step(stepSize);
assert.deepEqual(one.getState(),many.getState());
const outfile=path.join(__dirname,'motion-trace.ndjson.gz');fs.writeFileSync(outfile,gzipSync(trace.join('\n')+'\n',{level:9}));
console.log(JSON.stringify({step_s:stepSize,samples:trace.length,firstHint_s:hintRun.t,tour_s:round(r.s.time),visits,
  direction_m:dirs.map(d=>({dy:d.dy,speed:d.speed,distance:d.distance})),idleDelta:idleResult,
  maxRider_m:maxRider,maxRide_m:maxRide,linger,measures:Object.fromEntries(stats)},null,2));
