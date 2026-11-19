'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {create, ground} = require('../simulation.js');

const dt = .05;
const rows = [];
const maxima = {};
const uniform = {};
const stages = [];
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const scalar = (a,b) => Math.abs(a-b);
const angular = b => b.map(v => v.angle);
const off = (v,keys) => keys.map(k => v[k]);
const pack = (array,keys) => array.flatMap(v => off(v,keys));
const xyz = ['x','y','z'];

// Retain every independent section in the trace, including the two visitors' cords.
const groups = [
  ['wind_mps', s => s.cells.map(c=>c.wind), 1],
  ['grass_rad', s=>pack(s.cells,['side','bend']),2],
  ['cloth_m',s=>s.cloth.map(c=>c.bow),1],
  ['rope_m',s=>pack(s.rope,xyz),3],['tail_m',s=>pack(s.tail,xyz),3],
  ['cloud_m',s=>pack(s.clouds,xyz),3],['water_m',s=>s.waves.map(w=>w.h),1],
  ['seed_m',s=>pack(s.seeds,xyz),3],['bell_rad',s=>angular(s.bells),1],
  ['friend_m',s=>pack(s.friends,xyz),3],
  ['friendRope_m',s=>s.friends.flatMap(f=>pack(f.rope,xyz)),3],
  ['friendTail_m',s=>s.friends.flatMap(f=>pack(f.tail,xyz)),3]
];
const main = [
  ['kite_m',s=>off(s.kite,xyz)],['inlet_mps',s=>[s.windSpeed]],
  ['tension_N',s=>[s.tension]],['line_m',s=>[s.lineLength]],
  ['boat_m',s=>[s.boat.x,s.boat.z]],['sunset_fraction',s=>[s.sunset]],
  ['reel_rad',s=>[s.reel]],['bank_rad',s=>[s.kite.bank]],
  ['grassSound_radps',s=>[s.grassSound]],['clothSound_mps',s=>[s.clothSound]]
];
function sample(s){return Object.fromEntries([...groups,...main].map(([key,fn])=>[key,fn(s)]));}
function record(label,i,s,prev) {
  const now=sample(s),row=[label,(i*dt).toFixed(2),s.stage,s.cycle,s.strikes,s.down?1:0];
  for(const [key,values] of Object.entries(now)){
    assert(values.every(Number.isFinite),key+' has nonfinite values');
    row.push(...values.map(n=>Number(n.toFixed(5))));
    if(!prev)continue;
    const group=groups.find(([name])=>name===key),stride=group?group[2]:values.length;
    let difference=0;const first=[];
    for(let j=0;j<values.length;j+=stride){
      const delta=values.slice(j,j+stride).map((v,k)=>v-prev[key][j+k]);
      maxima[key]=Math.max(maxima[key]||0,Math.hypot(...delta));
      if(j===0)first.push(...delta);else for(let k=0;k<stride;k++)difference=Math.max(difference,Math.abs(first[k]-delta[k]));
    }
    if(group&&difference<1e-10)uniform[key]=(uniform[key]||0)+1;
  }
  rows.push(row.join(','));
  assert(s.windSpeed>=0&&s.windSpeed<=8);
  assert(s.lineLength>=3.95&&s.lineLength<=29.2);
  assert(s.kite.y>=ground(s.kite.x,s.kite.z)+.86);
  return now;
}
function run(label,seconds,setup,control){
  const g=create(),start=g.getState();if(setup)setup(g);
  let prev=record(label,0,g.state,null),peak=g.state.kite.y,peakT=0;
  for(let i=1;i<=Math.round(seconds/dt);i++){if(control)control(g,i);
    g.step(dt);prev=record(label,i,g.state,prev);peak=Math.max(peak,g.state.kite.y);peakT=Math.max(peakT,g.state.tension);}
  return {g,start,end:g.getState(),peak,peakT};
}
const idle=run('idle',10);
const weak=run('weak',10,g=>g.touch(.25,.7,.26));
const strong=run('strong',10,g=>g.touch(.25,.7,1));
assert(distance(idle.start.clouds[0],idle.end.clouds[0])>.1);
assert(scalar(idle.start.waves[0].h,idle.end.waves[0].h)>.001);
assert(distance(idle.start.seeds[0],idle.end.seeds[0])>.05);
assert(strong.end.kite.y>weak.end.kite.y+3);
assert(strong.end.cells[9].bend>weak.end.cells[9].bend+.15);
assert(strong.end.clouds[0].vx>weak.end.clouds[0].vx);
assert(strong.end.cloth[24].bow>weak.end.cloth[24].bow+.06);
assert(strong.end.strikes>weak.end.strikes);
assert(strong.end.tension>weak.end.tension);
const before=strong.g.getState();
strong.g.release();
let recovery=record('released',0,strong.g.state,null),after;
for(let i=1;i<=200;i++){strong.g.step(dt);recovery=record('released',i,strong.g.state,recovery);if(i===1)after=strong.g.getState();}
assert(after.windSpeed>4&&after.windSpeed<before.windSpeed);
assert(strong.g.state.kite.y<before.kite.y);
let last=-1,cycleTime=0,landY=0,approach=0;
const journey=run('journey',187,null,(g,i)=>{
  const s=g.state;
  if(last!==s.stage){stages.push([s.stage,Number(((i-1)*dt).toFixed(2))]);last=s.stage;
    if(s.cycle===0)g.touch(.24,.7,.94,s.stage===1?1:s.stage===2?2:0);
    else if(!cycleTime){cycleTime=(i-1)*dt;landY=s.kite.y-ground(s.kite.x,s.kite.z);}
    if(s.stage===2)approach=distance(s.friends[1],s.kite);}
  if(s.stage===2)g.steer(.36*Math.sin(s.dance*9.3),.65,.94);
});
assert.deepEqual(stages.map(x=>x[0]),[0,1,2,3,0]);
assert(cycleTime>120&&cycleTime<180);
assert(landY<1.0);
assert(journey.end.sunset<.42);
assert(approach<10);
assert.deepEqual(uniform,{},'all sections received identical deltas');
for(const [key,bound] of Object.entries({kite_m:.27,rope_m:.33,tail_m:.39,friend_m:.39,friendRope_m:.46,friendTail_m:.58,wind_mps:.18,grass_rad:.08,cloth_m:.02,cloud_m:.07,water_m:.02,bell_rad:.18,seed_m:.09,sunset_fraction:.01})){
  assert(maxima[key]<bound,key+' step displacement '+maxima[key]+' exceeds '+bound);
}
// Fixed internal substeps give identical results with different caller frame rates.
const a=create(),b=create();a.touch(.2,.8);b.touch(.2,.8);a.step(1);for(let j=0;j<20;j++)b.step(.05);
assert.deepEqual(a.getState(),b.getState());
const zero=create();zero.touch(0,0,0);zero.step(10);assert(zero.state.windSpeed<.001);
const header=['run','time_s','stage','cycle','strikes','touched'];
for(const [key,vs] of Object.entries(sample(idle.start)))for(let j=0;j<vs.length;j++)header.push(key+'_'+j);
const outfile=path.join(__dirname,'state-trace.csv.gz');
fs.writeFileSync(outfile,zlib.gzipSync([header.join(','),...rows].join('\n')+'\n',{level:6}));
const summary=s=>({wind:s.windSpeed,height:s.kite.y,tension:s.tension,cloth:s.cloth[24].bow,
  bend:s.cells[9].bend,cloudSpeed:s.clouds[0].vx,bells:s.strikes,grassSound:s.grassSound,clothSound:s.clothSound});
console.log(JSON.stringify({rows:rows.length,columns:header.length,idle:{
  cloud:distance(idle.start.clouds[0],idle.end.clouds[0]),waveStart:idle.start.waves[0].h,waveEnd:idle.end.waves[0].h,
  seed:distance(idle.start.seeds[0],idle.end.seeds[0]),boat:distance({...idle.start.boat,y:0},{...idle.end.boat,y:0})},
  weak:summary(weak.end),strong:summary(strong.end),release:{wind:after.windSpeed,tenSecondsLater:strong.g.state.kite.y},
  stages,cycleTime,landY,approach,peak:journey.peak,peakT:journey.peakT,uniform,maxima},null,2));
