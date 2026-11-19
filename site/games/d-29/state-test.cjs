'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {create, designs} = require('./sim.js');

const dt = .05, trace = [], max = {}, regions = {}, uniform = {};
const records = {
  hinges:['q','v','press','stiffness','thickness'], wind:['u','v','load','life'],
  cloth:['q','v'], branch:['q','v'], flex:['q','v'], water:['q','v'],
  rotors:['angle','omega'], dust:['x','y','z','vx','vy','cycle'],
  seeds:['x','y','z','vx','vy','free','rest','load'], drops:['x','y','vx','vy','volume','delay','live','cycle']
};
trace.push(JSON.stringify({samplePeriodSeconds:dt,fields:records,
  units:{p:'m, m/s, rad, N',wind:'m/s',cloth:'m',branch:'rad',flex:'mm',water:'m',dust:'8 scene units/m',hinges:'rad, rad/s, ratio, s^-2, mm'},
  boundaries:'A new round is a new sheet. A new particle cycle is a new emitter parcel. Reset positions are recorded with their identities.'}));
const abs = Math.abs, deg = 180/Math.PI;
function bound(name,n){assert.ok(Number.isFinite(n),name);max[name]=Math.max(max[name]||0,abs(n));}
function differences(a,b,key){return b.map((v,i)=>v[key]-a[i][key]);}
function spatial(family,ds){
  const span=Math.max(...ds)-Math.min(...ds);
  if(Math.max(...ds.map(abs))>1e-12){
    regions[family]=(regions[family]||0)+1;
    if(span<1e-13)uniform[family]=(uniform[family]||0)+1;
  }
}
function audit(a,b){
  for(const [family,key,unit] of [['wind','u',1],['flex','q',1],['cloth','q',1000],['branch','q',deg],['water','q',1000],['rotors','angle',deg]]){
    const ds=differences(a[family],b[family],key);
    ds.forEach(v=>bound(family,v*unit));spatial(family,family==='cloth'?ds.filter((_,i)=>![0,4,20,24,40,44].includes(i)):ds);
  }
  b.dust.forEach((p,i)=>{const old=a.dust[i];if(p.cycle===old.cycle)bound('dustMM',Math.hypot(p.x-old.x,p.y-old.y)/8*1000);});
  spatial('dust',b.dust.map((p,i)=>p.x-a.dust[i].x));
  b.drops.forEach((p,i)=>{const old=a.drops[i];if(p.live&&old.live&&p.cycle===old.cycle)bound('dropMM',Math.hypot(p.x-old.x,p.y-old.y)*1000);});
  bound('wheelDeg',(b.wheel-a.wheel)*deg);
  if(b.round===a.round){
    differences(a.hinges,b.hinges,'q').forEach(v=>bound('hingeDeg',v*deg));
    b.seeds.forEach((p,i)=>{const o=a.seeds[i];bound('seedMM',Math.hypot(p.x-o.x,p.y-o.y,p.z-o.z)*1000);});
    if(['flight','land'].includes(a.phase)&&['flight','land'].includes(b.phase)){
      bound('planeMM',Math.hypot(b.p.x-a.p.x,b.p.h-a.p.h,b.p.s-a.p.s)*1000);
      bound('pitchDeg',(b.p.pitch-a.p.pitch)*deg);
    }
    if(['land','return'].includes(a.phase)&&['land','return'].includes(b.phase))bound('newSheetMM',(b.sheet.h-a.sheet.h)*1000);
  }
  for(const i of [0,4,20,24,40,44])assert.equal(b.cloth[i].q,0,'peg remains attached');
}
function recorder(label,sim){
  let previous=null;
  function capture(){
    const s=sim.getState();
    if(previous){assert.ok(abs(s.clock-previous.clock-dt)<1e-7);audit(previous,s);}
    const row={run:label,t:s.clock,round:s.round,stage:s.stage,phase:s.phase,fold:s.fold,idle:s.idle,elapsed:s.elapsed,p:s.p,design:s.design,
      gate:s.gate,flow:s.flow,wheel:s.wheel,wheelV:s.wheelV,sheet:s.sheet,grasp:s.grasp,returnMotion:s.returnMotion,prop:s.prop,sound:s.sound};
    for(const [key,fields] of Object.entries(records))row[key]=s[key].map(o=>fields.map(k=>o[k]));
    trace.push(JSON.stringify(row,(_,n)=>typeof n==='number'?Number(n.toFixed(6)):n));previous=s;return s;
  }
  capture();
  return ()=>{sim.step(dt);return capture();};
}
const sim=create(407),tick=recorder('three-gardens',sim),atStart=sim.getState();
for(let i=0;i<200;i++)tick();
const ten=sim.getState();
const magnitude=(list,key)=>Math.max(...list.map(a=>abs(a[key])));
const idle={clothMM:magnitude(ten.cloth,'q')*1000,branchDeg:magnitude(ten.branch,'q')*deg,
  flexMM:magnitude(ten.flex,'q'),waterMM:magnitude(ten.water,'q')*1000,
  dustMM:Math.max(...ten.dust.map((p,i)=>Math.hypot(p.x-atStart.dust[i].x,p.y-atStart.dust[i].y)/8*1000))};
assert.equal(ten.phase,'fold');assert.equal(ten.fold,0);assert.ok(ten.idle>9.99);
for(const n of Object.values(idle))assert.ok(n>.0001);
const events=[],flight=[],stats={foldHz:0,rebound:0,thickness:0,stiffness:0,wheelOmega:0,waterMM:0,rotorOmega:0,seeds:0,airHz:0,gate:0,returnFallM:0};
let last='fold',featureUsed=false;
for(let i=0;i<5400&&sim.view().round<3;i++){
  const s=sim.view();
  if(s.phase==='fold'&&(s.fold!==0||s.elapsed>4.35))sim.trace(.035,.55);
  if(s.phase==='ready'&&s.elapsed>.9)sim.launch(1);
  if(s.phase==='flight'&&!featureUsed&&s.p.eddy>.83){sim.nudge(s.stage===1?'sluice':'rotor',.6,2);featureUsed=true;}
  const n=tick();
  if(n.phase!==last){
    events.push([n.stage,n.phase,+n.clock.toFixed(2)]);
    if(n.phase==='land')flight.push({stage:n.stage,range:n.p.s,impact:n.p.impact});
    if(n.phase==='fold')featureUsed=false;
    last=n.phase;
  }
  stats.foldHz=Math.max(stats.foldHz,n.sound.foldHz);
  stats.rebound=Math.max(stats.rebound,...n.hinges.slice(0,-1).map(a=>(a.q-Math.PI)*deg));
  stats.thickness=Math.max(stats.thickness,...n.hinges.map(a=>a.thickness));
  stats.stiffness=Math.max(stats.stiffness,...n.hinges.map(a=>a.stiffness));
  if(n.stage===1){stats.wheelOmega=Math.max(stats.wheelOmega,n.wheelV);stats.waterMM=Math.max(stats.waterMM,magnitude(n.water,'q')*1000);stats.gate=Math.max(stats.gate,n.gate);}
  if(n.stage===2){stats.rotorOmega=Math.max(stats.rotorOmega,magnitude(n.rotors,'omega'));stats.seeds=Math.max(stats.seeds,n.seeds.filter(a=>a.free).length);}
  if(n.phase==='flight')stats.airHz=Math.max(stats.airHz,n.sound.airHz);
  if(n.phase==='land')stats.returnFallM=Math.max(stats.returnFallM,(.415625-n.sheet.h));
}
assert.deepEqual(flight.map(a=>a.stage),[0,1,2]);assert.equal(sim.view().round,3);assert.equal(sim.view().stage,0);
assert.ok(stats.seeds===24&&stats.gate>.8&&stats.rebound>0);
assert.deepEqual(uniform,{});
// Same sheet dimensions, seed, garden, wind history and release instant. Only
// the crease locations differ. Neither material mass nor launch speed changes.
function comparison(label,folds){
  const model=create(821,0,{...designs[0],...folds}),advance=recorder(label,model);
  for(let i=0;i<480;i++){if(model.view().phase==='fold')model.trace(.05);advance();}
  assert.equal(model.view().phase,'ready');
  const wind=model.getState().wind;model.launch(1);
  const initialSpeed=model.view().p.speed,results={label,wind,initialSpeed,area:model.view().p.area,cg:model.view().p.cg};
  for(let i=1;i<=800;i++){const s=advance();if(i===1)results.lift=s.p.lift;
    if(i===60){results.h3=s.p.h;results.pitch3=s.p.pitch*deg;}
    if(s.phase==='land'){results.landS=s.p.landS;return results;}}
  assert.fail('flight did not settle');
}
const wide=comparison('identical-sheet-wide',{shoulder:.04,keel:.085,cross:-.60});
const narrow=comparison('identical-sheet-narrow',{shoulder:.30,keel:.15,cross:.72});
assert.equal(wide.initialSpeed,narrow.initialSpeed);assert.deepEqual(wide.wind,narrow.wind);
assert.ok(wide.area>narrow.area&&wide.cg>narrow.cg&&wide.lift>narrow.lift&&wide.h3>narrow.h3&&wide.landS>narrow.landS);
delete wide.wind;delete narrow.wind;
// Stability limits include the strongest sampled finger impulse. Each moving
// body is compared to the same body in the preceding 50 ms sample.
for(const [name,limit] of Object.entries({hingeDeg:25,planeMM:65,cloth:10,water:3,branch:2,flex:3,wind:.15,seedMM:40,dropMM:60,dustMM:3,newSheetMM:120}))assert.ok(max[name]<limit,name+' '+max[name]);
for(const v of Object.values(regions))assert.ok(v>100);
assert.deepEqual(uniform,{});
const output=path.join(__dirname,'state-trace.jsonl.gz');
fs.writeFileSync(output,zlib.gzipSync(trace.join('\n')+'\n',{level:6}));
console.log(JSON.stringify({samples:trace.length-1,idle,stats,flight,wide,narrow,max,uniformIntervals:uniform,activeIntervals:regions,events},null,2));
