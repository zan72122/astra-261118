'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {create}=require('../sim.js');

const dt=.05;
const maximum=(arr)=>Math.max(...arr);
const minimum=(arr)=>Math.min(...arr);
const span=arr=>maximum(arr)-minimum(arr);
const magnitude=arr=>Math.hypot(...arr);
const difference=(arr,prev)=>arr.map((v,i)=>v-prev[i]);
const maxAbs=arr=>maximum(arr.map(Math.abs));
const pos=section=>section.map(({x})=>x);
const records=[];
const report={};
const scenario=(name,sim,t)=>{
 const s=sim.s;
 const row={name,t:+t.toFixed(2),phase:s.phase,world:s.world,cycles:s.cycles,
  mode:s.items.map(b=>b.mode),mass:s.items.map(b=>b.m),
  cargo:s.items.flatMap(b=>b.p),velocity:s.items.flatMap(b=>b.v),
  yaw:s.items.map(b=>b.yaw.x),tilt:s.items.map(b=>b.tilt.x),overhang:s.items.map(b=>b.overhang),
  wind:s.air.map(a=>a.u),leaf:s.air.map(a=>a.leaf.x),light:s.air.map(a=>a.light.x),
  dust:s.dust.flatMap(d=>d.p),waves:pos(s.waves),shocks:pos(s.shocks),rope:pos(s.rope),
  door:pos(s.door),bridge:pos(s.bridge),crank:s.crank.x,shutters:pos(s.shutters),
  sail:s.sail.x,boatRun:s.boatRun,boatSpeed:s.boatSpeed,boatHeel:s.boatHeel.x,
  engine:s.engine.x,travel:s.travel,wheel:pos(s.wheel),viewPull:s.viewPull.x};
 records.push(row);
 for(const v of Object.values(row)){if(typeof v==='number')assert(Number.isFinite(v));if(Array.isArray(v))for(const n of v)if(typeof n==='number')assert(Number.isFinite(n));}
 return row;
};
const idle=create();const idleRows=[scenario('idle',idle,0)];
for(let n=1;n<=200;n++){idle.step(dt);idleRows.push(scenario('idle',idle,n*dt));}
assert.equal(idle.s.count,0);assert.equal(idle.s.phase,'load');assert.equal(idle.s.held,-1);
assert(Math.abs(idle.s.idle-10)<1e-8);
report.idle={seconds:10,windRange0:span(idleRows.map(r=>r.wind[0])),leafRange0:span(idleRows.map(r=>r.leaf[0])),
 waterRange10:span(idleRows.map(r=>r.waves[10])),sunRange:span(idleRows.map(r=>r.light[9]*.85)),
 dustTravel0:magnitude(difference(idleRows.at(-1).dust.slice(0,3),idleRows[0].dust.slice(0,3)))};
assert(report.idle.leafRange0>.02&&report.idle.waterRange10>.01&&report.idle.dustTravel0>.03);

// Identical initial positions, random seed, pointer target, release time and drop offset.
function massTrial(m){
 const sim=create({masses:[m]});const first=sim.s.items[0],trial={mass:m};const rows=[];
 rows.push(scenario('mass-'+m,sim,0));assert(sim.grab(0));sim.move([.95,1.65,1.66]);
 for(let i=1;i<=320;i++){if(i===31)sim.release(true,.23);
  sim.step(dt);rows.push(scenario('mass-'+m,sim,i*dt));
  if(i===10)trial.heightAtHalfSecond=first.p[1];
 }
 assert.equal(sim.s.count,1);trial.staticMaxShock=maximum(rows.at(-1).shocks);
 trial.maxImpulseSpeed=maximum(rows.filter(r=>r.mode[0]==='lower').map(r=>Math.abs(r.velocity[1])));
 return trial;
}
report.mass=[massTrial(5),massTrial(15)];
assert(report.mass[0].heightAtHalfSecond>report.mass[1].heightAtHalfSecond+.2);
assert(Math.abs(report.mass[1].staticMaxShock/report.mass[0].staticMaxShock-3)<.001);

const sim=create();const s=sim.s,journey=[scenario('journey',sim,0)],phases=[],landings=[];
let activeSince=0,lastKey='',lastAction=0,released=false;
for(let i=1;i<=6000&&!s.cycles;i++){
 const t=i*dt,active=sim.active(),b=s.items[active],key=[s.world,s.phase,active].join('/');
 if(key!==lastKey){activeSince=t;lastKey=key;lastAction=t;released=false;}
 if(phases.at(-1)!==s.phase)phases.push(s.phase);
 const age=t-activeSince;
 // The journey imitates a child watching the four-second gesture cue.
 if(active>=0&&age>4.8){
  if(!released&&['yard','waiting'].includes(b.mode)&&sim.s.held<0)sim.grab(active);
  if(sim.s.held===active){
   const goal=s.world==='yard'?[2.35,1.49,-1.62]:sim.goal(),q=Math.min(1,(age-4.8)/1.73);
   const source=s.world==='yard'?require('../sim.js').homes[active]:[-3.65,.23,1.6];
   sim.move(source.map((n,j)=>n+(goal[j]-n)*q+(j===1?.49*Math.sin(Math.PI*q):0)));
   if(q===1){sim.release(true,active===2?.31:.13);released=true;}
  }
 }else if(active<0&&age>4.8&&t-lastAction>=.61){sim.operate(.22);lastAction=t;}
 sim.step(dt);
 for(const e of s.events.splice(0))if(e.type==='land')landings.push([s.world,e.id,e.power]);
 journey.push(scenario('journey',sim,t));
}
assert.equal(s.cycles,1);assert.equal(s.phase,'load');assert.equal(sim.active(),0);
assert.deepEqual(phases,['load','tie','load','door','depart','bridge','cross','room','window','sail','coast']);
assert.equal(landings.length,10);assert.equal(new Set(landings.map(e=>e.slice(0,2).join('/'))).size,10);
assert(journey.filter(r=>r.phase==='tie').some(r=>r.overhang[2]>.1));
assert(maximum(journey.filter(r=>r.phase==='tie').map(r=>r.tilt[2]))>.05);
const pickPhase=p=>journey.filter(r=>r.phase===p);
report.journey={
 seconds:journey.at(-1).t,landings:landings.length,
 chairOverhang:maximum(pickPhase('tie').map(r=>r.overhang[2])),
 maximumChairTilt:maximum(pickPhase('tie').map(r=>r.tilt[2])),
 securedChairTilt:pickPhase('door').at(-1).tilt[2],
 ropeLoose:maximum(pickPhase('tie').map(r=>r.rope[6])),ropeTight:pickPhase('door').at(-1).rope[6],
 doorTravel:maximum(pickPhase('depart').map(r=>r.door[11]*2.48)),
 bridgeStart:pickPhase('bridge')[0].bridge,bridgeEnd:pickPhase('bridge').at(-1).bridge,
 crankTurn:maximum(pickPhase('cross').map(r=>r.crank)),
 windowAngles:pickPhase('coast').at(-1).shutters,
 wheelRadians:pickPhase('cross').at(-1).wheel,
 boatTravel:maximum(pickPhase('coast').map(r=>r.boatRun)),boatSpeed:maximum(pickPhase('coast').map(r=>r.boatSpeed)),
 boatHeel:maxAbs(pickPhase('coast').map(r=>r.boatHeel)),
 cameraPull:maximum(journey.map(r=>r.viewPull)),sailHeight:maximum(pickPhase('coast').map(r=>1.58*(.22+.78*r.sail)))};

// Discrete scene changes are recorded verbatim. Compare visible motion in a single
// coordinate system. A stored item becomes visible at the room doorway on delivery.
const maxDelta={},uniform={},counts={worldCuts:0,newlyDelivered:0};
const sections=['wind','leaf','light','dust','waves','rope','shocks','door','bridge','shutters','wheel','yaw'];
for(const key of sections){maxDelta[key]=0;uniform[key]={moving:0,identical:0};}
maxDelta.cargo=0;maxDelta.tilt=0;
for(let i=1;i<records.length;i++){
 const a=records[i-1],b=records[i];if(a.name!==b.name)continue;
 if(a.world!==b.world||a.cycles!==b.cycles){counts.worldCuts++;continue;}
 for(let id=0;id<5;id++){
  if(a.mode[id]==='stored'||b.mode[id]==='stored'){
   if(a.mode[id]==='stored'&&b.mode[id]==='delivery')counts.newlyDelivered++;continue;
  }
  const n=3*id;const deltaCargo=magnitude(difference(b.cargo.slice(n,n+3),a.cargo.slice(n,n+3)));if(deltaCargo>maxDelta.cargo)report.fastestCargo={name:b.name,time:b.t,id,previous:a.mode[id],mode:b.mode[id],deltaCargo};maxDelta.cargo=Math.max(maxDelta.cargo,magnitude(difference(b.cargo.slice(n,n+3),a.cargo.slice(n,n+3))));
  maxDelta.tilt=Math.max(maxDelta.tilt,Math.abs(b.tilt[id]-a.tilt[id]));
 }
 for(const key of sections){const delta=difference(b[key],a[key]);const max=maxAbs(delta);maxDelta[key]=Math.max(maxDelta[key],max);
  if(max>1e-6){uniform[key].moving++;if(span(delta)<1e-10)uniform[key].identical++;}
 }
}
for(const [key,data] of Object.entries(uniform)){assert(data.moving>0,key);assert.equal(data.identical,0,key);}
assert(maxDelta.cargo<.25,JSON.stringify(report.fastestCargo));
assert(maxDelta.tilt<.12&&maxDelta.bridge<.14&&maxDelta.leaf<.04&&maxDelta.waves<.015);
report.maxDelta=maxDelta;report.uniform=uniform;report.boundaries=counts;

// Locality and gentle recovery are independent of order and viewport.
for(const compact of [false,true]){
 const game=create({compact});const before=game.getState();
 assert(!game.grab(3));game.step(.1);assert.equal(game.s.count,0);
 assert(game.s.items[3].spin.x>0);assert.deepEqual(game.s.items[3].p,before.items[3].p);
 game.grab(0);game.move([1.8,1.25,-.6]);game.step(.74);game.release(false);
 game.step(7);assert.equal(game.s.items[0].mode,'yard');assert.equal(game.s.index,0);
 assert(magnitude(difference(game.s.items[0].p,before.items[0].p))<.03);
}
const dir=__dirname;
fs.writeFileSync(path.join(dir,'samples.ndjson.gz'),zlib.gzipSync(records.map(r=>JSON.stringify(r,(_,v)=>typeof v==='number'?+v.toFixed(7):v)).join('\n')+'\n',{level:9}));
fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS',records.length,'samples at 0.05 s');console.log(JSON.stringify(report,null,2));
