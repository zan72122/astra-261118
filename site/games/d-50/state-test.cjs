'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {create}=require('./simulation.js');
const dt=.05,folder=path.join(__dirname,'measurements');
fs.mkdirSync(folder,{recursive:true});
const lines=[],stats={},quant=x=>Math.round(x*1e6)/1e6;
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const spread=a=>Math.max(...a)-Math.min(...a);
const values=(a,key)=>a.map(b=>b[key]);
const units={water:'mm',wave:'m',bend:'m',opening:'fraction',page:'rad',bulb:'norm',pool:'m',
  soles:'m',bell:'rad',gate:'m',boat:'m',wheel:'rad',boot:'m',cart:'m',cutoff:'Hz',reflection:'s',
  rain:'fraction',rainbow:'fraction',puddleRadius:'m',gust:'m/s',basin:'m',jetHeight:'m'};
function record(name,s){
 // Every active region is retained. Particle generations distinguish impacts from new falls.
 const now={water:values(s.cells,'water'),wave:values(s.cells,'wave'),bend:values(s.rib,'bend'),
  opening:values(s.rib,'opening'),page:values(s.page,'a'),bulb:values(s.bulbs,'heat'),pool:values(s.pools,'h'),
  soles:s.soles.slice(),bell:values(s.bells,'angle'),gate:[s.gate*.59],boat:[s.boat],wheel:[s.wheel],
  boot:[s.bootX,s.bootY],cart:[s.cartZ],cutoff:[s.cutoff],reflection:[s.reflection],rain:[s.rain],
  rainbow:[s.rainbow],gust:[s.wind],basin:[s.basin]};
 const data=stats[name]||(stats[name]={samples:0,maxDelta:{},uniform:{},range:{},walkJump:0,fallJump:0,
   particleRestarts:0,maxWalkSpeed:0,minCruise:Infinity,impacts:0,stages:[]});
 for(const [key,arr] of Object.entries(now)){assert(arr.every(Number.isFinite),name+' '+key);
   const rr=data.range[key]||(data.range[key]=[Infinity,-Infinity]);rr[0]=Math.min(rr[0],...arr);rr[1]=Math.max(rr[1],...arr);
   if(data.prev){const deltas=arr.map((n,i)=>n-data.prev[key][i]);const peak=Math.max(...deltas.map(Math.abs));
    data.maxDelta[key]=Math.max(data.maxDelta[key]||0,peak);
    if(arr.length>2&&peak>1e-8&&spread(deltas)<1e-10)data.uniform[key]=(data.uniform[key]||0)+1}
 }
 if(data.xy)data.walkJump=Math.max(data.walkJump,Math.hypot(s.x-data.xy[0],s.z-data.xy[1]));
 const drops=s.drops.map(d=>[d.generation,quant(d.y)]);
 if(data.drops)drops.forEach(([gen,y],i)=>{const last=data.drops[i];if(gen===last[0]){
  data.fallJump=Math.max(data.fallJump,Math.abs(last[1]-y));assert(y<=last[1]+1e-6)
 }else data.particleRestarts+=gen-last[0]});
 if(s.speed>.6)data.minCruise=Math.min(data.minCruise,s.speed);data.maxWalkSpeed=Math.max(data.maxWalkSpeed,s.speed);
 assert(s.speed<=1.200001);assert(data.walkJump<=dt*1.2+1e-7);assert(data.fallJump<=dt*6.8+1e-5);
 if(!data.stages.length||data.stages.at(-1)[0]!==s.stage)data.stages.push([s.stage,quant(s.time)]);
 data.prev=now;data.xy=[s.x,s.z];data.drops=drops;data.samples++;
 const log={run:name,time:quant(s.time),stage:s.stage,cycle:s.cycle,position:data.xy.map(quant),
  speed:quant(s.speed),rainHits:s.weatherCount,canopy:quant(s.canopy),
  density:quant(s.density),wet:values(s.rib,'wet').map(quant),gutter:s.gutters.map(g=>[quant(g.load),g.falling?quant(g.y):null]),
  tried:s.tried.slice(),bellTouch:s.bells.map(b=>b.touched),keyAngle:quant(s.keyAngle),springWind:quant(s.springWind),flow:quant(s.flow),
  rings:s.pools.map(p=>p.rings.map(r=>[quant(r.radius),quant(r.energy)]))};
 for(const [key,arr] of Object.entries(now))log[key]=arr.map(quant);
 if(name==='idle'){log.drops=drops;log.jets=s.jets.map(j=>[quant(j.x),quant(j.y),quant(j.z)]);log.dust=s.dust.map(d=>[quant(d.x),quant(d.y)])}
 lines.push(JSON.stringify(log));
}
const idle=create(),start=idle.getState();record('idle',idle.s);
assert.equal(idle.press('boot'),false);assert.equal(idle.press('page'),false);assert.equal(idle.press('walk',[0,0]),false);
let idleDetachment=0,oldDrops=idle.s.gutters.map(g=>g.falling);
for(let i=0;i<200;i++){idle.step(dt);record('idle',idle.s);idle.takeEvents();
 idle.s.gutters.forEach((g,j)=>{if(g.falling&&!oldDrops[j])idleDetachment++});oldDrops=idle.s.gutters.map(g=>g.falling)}
const last=idle.s,deltaWater=last.cells.map((c,i)=>c.water-start.cells[i].water);
assert.equal(last.stage,'umbrella');assert.deepEqual([last.x,last.z],[start.x,start.z]);
assert(last.weatherCount>20&&spread(deltaWater)>.3);assert(spread(values(last.rib,'bend'))>.0001);
assert.equal(stats.idle.uniform.water||0,0);assert.equal(stats.idle.uniform.bend||0,0);
const summary={dt,units,idle:{waterGain:deltaWater,wind:last.wind,impacts:last.weatherCount,
  bulbChange:last.bulbs.map((b,i)=>b.heat-start.bulbs[i].heat),bend:values(last.rib,'bend'),gutterDrops:idleDetachment}};
const clips={};
for(const [name,z] of [['open',1.5],['roof',-10.36]]){
 const g=create(43281);g.press('umbrella');g.step(3);assert.equal(g.s.stage,'arcade');
 // Exactly one initial coordinate differs. Gesture, seed, steps and all material parameters match.
 g.s.stage='paperDoor';g.s.x=-1.85;g.s.z=z;g.press('walk',[1.85,z]);record(name,g.s);
 let density=0,delay=0,cut=0,count=0,cloth=0,tin=0;
 for(let i=0;i<200;i++){if(i===100)g.press('walk',[-1.85,z]);g.step(dt);record(name,g.s);
   const hits=g.takeEvents();if(i>=100){density+=g.s.density;delay+=g.s.reflection;cut+=g.s.cutoff;count++;
   cloth+=hits.filter(e=>e.type==='cloth').length;tin+=hits.filter(e=>e.type==='tin').length}}
 clips[name]={x:g.s.x,z:g.s.z,walked:g.s.walked,cutoffHz:cut/count,firstReflectionMs:delay*1e3/count,
   density:density/count,cloth,tin,wetMean:mean(values(g.s.rib,'wet'))}
}
assert.equal(clips.open.x,clips.roof.x);assert(Math.abs(clips.open.walked-clips.roof.walked)<1e-7);
assert(clips.open.cutoffHz>clips.roof.cutoffHz*2.9);assert(clips.roof.firstReflectionMs>clips.open.firstReflectionMs*4);
assert(clips.open.wetMean>clips.roof.wetMean);summary.location=clips;
const game=create(),s=game.s,name='walkthrough';record(name,s);
let delay=0,prior='',nextSole=0,nextBell=0,pageCompleted=0,innerMin=1,prismPeak=0,maxSole=0,poolPeak=0,boatMax=0,maxHeat=0;
let ringMax=0,springMax=0,maxBell=0,wheelMax=0,maxKey=0,bootPeak=0,maxGuide=0,gatePeak=0,gutterFalls=0;
let gutterPrevious=s.gutters.map(g=>g.falling),afterRelease=null;
for(let i=0;i<4800&&!s.cycle;i++){
 if(prior!==s.stage){delay=0;prior=s.stage}
 delay+=dt;
 // A child follows each four-second demonstration. Rapid taps and a released walk are also exercised.
 if(s.stage==='umbrella'&&delay>=4.3)game.press('umbrella');
 if(s.stage==='arcade'&&delay>1&&delay<1.06){game.press('rib3');game.press('rib4')}
 if(s.stage==='arcade'&&delay>2&&delay<2.06)game.press('walk',[s.x+.65,s.z-.85]);
 if(s.stage==='arcade'&&delay>2.65&&delay<2.71){game.release();afterRelease=s.speed}
 if(['arcade','shoeDoor','paperDoor','plaza'].includes(s.stage)&&delay>4.4)game.press(s.stage);
 if(s.stage==='shoe'&&delay>4.3)game.press('boot');
 if(s.stage==='soles'&&!s.bootBusy&&s.tried[0]&&delay>4.3+nextSole*4.1&&nextSole<2){game.press('sole'+(nextSole+1));nextSole++}
 if(s.stage==='paper'&&delay>4.3)game.press('page');
 if(s.stage==='sluice'&&delay>4.3)game.press('gate');
 if(s.stage==='prism'&&delay>4.3)game.press('prism');
 if(s.stage==='bells'&&delay>=4.3+nextBell*3.88&&nextBell<3){game.press('bell'+nextBell);nextBell++}
 if(s.stage==='winder'&&delay>=4.3)game.press('key');
 game.step(dt);record(name,s);game.takeEvents();
 if(s.stage==='shoe'||s.stage==='paper')innerMin=Math.min(innerMin,s.density);
 pageCompleted=Math.max(pageCompleted,s.page.at(-1).a);prismPeak=Math.max(prismPeak,s.rainbow);
 maxSole=Math.max(maxSole,...s.soles.map(Math.abs));maxBell=Math.max(maxBell,...s.bells.map(b=>Math.abs(b.angle)));
 poolPeak=Math.max(poolPeak,...s.pools.map(p=>Math.abs(p.h)));boatMax=Math.max(boatMax,s.boat);
 ringMax=Math.max(ringMax,...s.pools.flatMap(p=>p.rings.map(r=>r.radius)));bootPeak=Math.max(bootPeak,s.bootY);
 maxHeat=Math.max(maxHeat,...s.bulbs.map(b=>b.heat));maxGuide=Math.max(maxGuide,...s.guides.map(b=>b.heat));
 wheelMax=Math.max(wheelMax,s.wheelV);maxKey=Math.max(maxKey,s.keyAngle);springMax=Math.max(springMax,s.springWind);
 gatePeak=Math.max(gatePeak,s.gate*.59);
 s.gutters.forEach((g,i)=>{if(g.falling&&!gutterPrevious[i])gutterFalls++});gutterPrevious=s.gutters.map(g=>g.falling);
}
assert.equal(s.cycle,1);assert.equal(s.stage,'umbrella');assert(s.canopy<.03);
assert(afterRelease>.5);assert(pageCompleted>3.1);assert(maxSole>.001);assert(prismPeak>.84);
assert(boatMax>=4.09);assert(nextBell===3&&springMax>4);
assert(stats.walkthrough.maxDelta.water<.025);assert(stats.walkthrough.maxDelta.bend<.026);
assert(stats.walkthrough.maxDelta.opening<.076,JSON.stringify(stats.walkthrough.maxDelta));assert((stats.walkthrough.uniform.water||0)===0);
for(const result of Object.values(stats))assert.deepEqual(result.uniform,{});assert(s.time>120);
summary.walkthrough={seconds:s.time,metres:s.walked,afterRelease,innerMin,pageCompleted,prismPeak,maxSole,poolPeak,
 boatMax,maxHeat,ringMax,springMax,maxBell,wheelMax,maxKey,bootPeak,maxGuide,gatePeak,gutterFalls};
// Start a second trip to catch stale per-cycle input flags.
game.press('umbrella');game.step(2);assert.equal(s.stage,'arcade');assert(s.tried.every(x=>!x)&&s.bells.every(b=>!b.touched));
for(const d of Object.values(stats)){delete d.prev;delete d.xy;delete d.drops;if(!Number.isFinite(d.minCruise))d.minCruise=null}
summary.series=stats;
fs.writeFileSync(path.join(folder,'state-0.05s.jsonl.gz'),zlib.gzipSync(lines.join('\n')+'\n',{level:9}));
fs.writeFileSync(path.join(folder,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({samples:Object.fromEntries(Object.entries(stats).map(([key,d])=>[key,d.samples])),
 seconds:summary.walkthrough.seconds,location:clips,maxDelta:stats.walkthrough.maxDelta,uniform:stats.walkthrough.uniform},null,2));
