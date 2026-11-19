'use strict';
// Run with "node state-test.cjs". The compressed JSON Lines trace stores SI units.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {create,sockets,robotOrigin} = require('./sim.js');
const dt=.05,rows=[],maxDelta={},min={},max={},uniform={},previous=new Map(),elapsed=new Map(),phases=[];
const rounds=x=>Math.round(x*1e7)/1e7;
const copy=x=>JSON.parse(JSON.stringify(x));
function capture(name,s){
  const w=s.walker,origin=robotOrigin(s);
  const fields={
    partXYZ:s.parts.flatMap(p=>[p.pos.x,p.pos.y,p.pos.z]),partAngle:s.parts.map(p=>p.angle),
    waterHeight:s.water.map(x=>x.h),waterVelocity:s.water.map(x=>x.u),dustXYZ:s.dust.flatMap(p=>[p.x,p.y,p.z]),
    heat:s.heat,flagBend:s.flag.map(f=>f.bend),wind:[s.wind],draft:[s.draft],
    gazeXY:s.eyes.flatMap(e=>[e.x,e.y]),aperture:s.eyes.map(e=>e.aperture),
    shutter:[s.shutter],gate:[s.gate],shelf:[s.shelf,s.sailShelf],carry:s.rewards.map(r=>r.carry),current:[s.current],boat:[s.boat],
    distance:[w.distance],speed:[w.speed],stride:[w.stride],com:[w.com],bodyY:[w.bodyY],hop:[w.hop],
    legAngle:w.legAngles,wheelAngle:[w.wheelAngle],compression:w.compression,wing:s.wing,altitude:[s.altitude],
    paddleAngle:s.paddles.map(p=>p.angle),airspeed:[s.airspeed],
    robotXYZ:[origin.x,origin.y+w.bodyY,origin.z]
  };
  const prev=previous.get(name),delta=maxDelta[name]??={},lo=min[name]??={},hi=max[name]??={};
  if(prev)for(const [key,values] of Object.entries(fields)){
    const diffs=values.map((v,i)=>v-prev[key][i]);const d=Math.max(...diffs.map(Math.abs));
    if(['partXYZ','robotXYZ','dustXYZ'].includes(key)){
      for(let i=0;i<diffs.length;i+=3)delta[key+'3D']=Math.max(delta[key+'3D']||0,Math.hypot(diffs[i],diffs[i+1],diffs[i+2]));
    }
    assert(Number.isFinite(d),key+' must be finite');delta[key]=Math.max(delta[key]||0,d);
    if((name==='idle'&&['partAngle','waterHeight','heat','flagBend','aperture','dustXYZ','gazeXY'].includes(key))||(name==='journey'&&['wing','legAngle','compression','waterHeight'].includes(key))){
      const bucket=uniform[name+'.'+key]??={moving:0,identical:0};
      if(d>1e-9){bucket.moving++;if(Math.max(...diffs)-Math.min(...diffs)<1e-11)bucket.identical++;}
    }
  }
  for(const [key,values] of Object.entries(fields)){lo[key]=Math.min(lo[key]??Infinity,...values);hi[key]=Math.max(hi[key]??-Infinity,...values);}
  previous.set(name,copy(fields));const t=elapsed.get(name)||0;elapsed.set(name,t+dt);
  rows.push(JSON.stringify({run:name,t:rounds(t),phase:s.phase,drive:s.drive,attached:s.parts.map(p=>p.attached),...Object.fromEntries(Object.entries(fields).map(([k,arr])=>[k,arr.map(rounds)]))}));
}
function tick(g,name){g.step(dt);if(name)capture(name,g.s);}
function until(g,condition,limit,name){for(let i=0;i<limit/dt;i++){if(condition())return;tick(g,name);}assert(condition(),g.s.phase+' exceeded '+limit+' s');}
function fit(g,id,name){
  const p=g.s.parts.find(p=>p.id===id);assert(g.grab(id));g.aim(sockets[p.slot]);
  until(g,()=>p.caught,3,name);
  assert(Math.hypot(...['x','y','z'].map(k=>p.pos[k]-sockets[p.slot][k]))<=.05);
  until(g,()=>p.attached,3,name);
}
function build(g,drive,name){for(const id of ['head','left','right',drive])fit(g,id,name);assert.equal(g.s.phase,'ready');}
const idle=create(),initial=idle.getState();capture('idle',idle.s);
for(let i=0;i<200;i++)tick(idle,'idle');
assert.equal(idle.s.phase,'build');assert.deepEqual(idle.activeIds(),['head']);assert(!idle.action('floor'));assert(!idle.grab('long'));
for(const [key,entry] of Object.entries(uniform))assert.equal(entry.identical,0,key+' moved uniformly across every active segment');
const displacement=Math.max(...idle.s.dust.map((p,i)=>Math.hypot(...['x','y','z'].map(k=>p[k]-initial.dust[i][k]))));
assert(displacement>.01);assert(maxDelta.idle.waterHeight>0);assert(maxDelta.idle.partAngle>0);
const single=create();single.step(10);
for(let i=0;i<24;i++)assert(Math.abs(idle.s.water[i].h-single.s.water[i].h)<1e-10);
const magnet=create(),p=magnet.s.parts[0],dest=sockets.head;
assert(magnet.grab('head'));magnet.aim({x:dest.x-.051,y:dest.y,z:dest.z});for(let i=0;i<100;i++)tick(magnet);
assert(!p.caught&&!p.attached);const outside=Math.hypot(p.pos.x-dest.x,p.pos.y-dest.y,p.pos.z-dest.z);
magnet.aim({x:dest.x-.049,y:dest.y,z:dest.z});let edge;
while(!p.caught){const before=copy(p.pos);magnet.step(1/120);if(p.caught){edge=[before,p.pos].map(a=>Math.hypot(...['x','y','z'].map(k=>a[k]-dest[k])));}}
const released=create();released.grab('head');released.aim({x:-.19,y:.21,z:.1});released.step(.25);const releaseStart=copy(released.s.parts[0].pos);released.release();released.step(.05);
const drift=Math.hypot(...['x','y','z'].map(k=>released.s.parts[0].pos[k]-releaseStart[k]));assert(drift>0);
const same=create();build(same,'short');const compare={},flat={};for(const [name,L] of [['short',.106],['long',.168]]){
 const g=create();build(g,'short');g.configure('short',L);assert.equal(g.s.walker.mass,same.s.walker.mass);assert(g.action('floor'));capture(name,g.s);
 for(let i=0;i<200;i++){tick(g,name);if(i===59)flat[name]=copy(g.s.walker);}compare[name]=copy(g.s.walker);
}
assert(compare.long.stride>compare.short.stride);assert(compare.long.distance>compare.short.distance);assert(compare.long.com>compare.short.com);
const roll=create();build(roll,'wheel');roll.action('floor');capture('wheel',roll.s);for(let i=0;i<250;i++)tick(roll,'wheel');
assert.equal(roll.s.walker.legAngles[0],0);assert(roll.s.walker.wheelAngle>2);
const game=create();capture('journey',game.s);build(game,'long','journey');
const stamps={};let hopTriggered=false;
for(let i=0;i<5600&&game.s.lap===0;i++){
 const {phase,phaseAge}=game.s;if(phases.at(-1)!==phase){phases.push(phase);stamps[phase]=rounds(elapsed.get('journey'));}
 if(phaseAge>1.6){
  const ctl={ready:'floor',plaza:'spring',dock:'valve',summit:'sail'}[phase];if(ctl)assert(game.action(ctl));
  if(phase==='hill'&&!hopTriggered){game.action('pet');hopTriggered=true;}
 }
 tick(game,'journey');
}
assert.deepEqual(phases,['ready','street','plaza','equip','hill','dock','ferry','summit','rig','glide','unpack']);
assert.equal(game.s.lap,1);assert.equal(game.s.phase,'build');
for(let i=0;i<100;i++)tick(game,'journey');assert.deepEqual(game.activeIds(),['head']);
assert(max.journey.hop>.06);
for(const [key,entry] of Object.entries(uniform))assert.equal(entry.identical,0,key+' uniform moving increments');
const limits={carry:.11,partXYZ3D:.038,robotXYZ3D:.05,stride:.039,waterHeight:.003,dustXYZ:.009,partXYZ:.039,bodyY:.04,robotXYZ:.042,shutter:.035,compression:.01,gate:.055,altitude:.025,flagBend:.009,wing:.06};
for(const [key,bound] of Object.entries(limits))assert(maxDelta.journey[key]<bound,key+' step '+maxDelta.journey[key]+' exceeds '+bound);
const file=path.join(__dirname,'state-trace.jsonl.gz');fs.writeFileSync(file,zlib.gzipSync(rows.join('\n')+'\n',{level:9}));
const report={dt,samples:rows.length,idleDisplacement:displacement,magnet:{outside,edge,releaseDrift:drift},uniform,flat,compare,maxDelta,min,max,stamps,lapDuration:stamps.unpack+1.4};
console.log(JSON.stringify(report,null,2));
