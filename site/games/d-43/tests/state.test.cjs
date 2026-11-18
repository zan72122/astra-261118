'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {gzipSync} = require('node:zlib');
const P = require('../simulation.js');
const dt = .05, deg = 180/Math.PI, report = {}, rows = [];
const maxAbs = a => Math.max(...a.map(Math.abs));
const span = a => Math.max(...a)-Math.min(...a);
const f = v => Number(v.toFixed(7));
const extract = g => {
  const s=g.state,p=s.p;
  return {x:p.x,z:p.z,v:p.speed,tilt:p.tilt,phase:s.stage,cycle:s.cycle,veil:s.veil,
    r:s.roughness,hz:s.sounds.bladeHz,pan:s.sounds.pan,wind:s.sounds.wind,noise:s.sounds.crunch,
    dst:s.trackDistance,heat:s.cells.map(c=>c.heat),compact:s.cells.map(c=>c.compact),
    bend:s.cells.map(c=>c.bend),wave:s.cells.map(c=>c.wave),moisture:s.cells.map(c=>c.moisture),
    bells:s.bells.map(b=>b.angle),lamps:s.lamps.map(l=>l.light),sail:s.boats.map(b=>b.vane),
    dust:s.motes.map(m=>[m.x,m.y,m.z]),stepMarks:s.trail.length,light:s.skyWarmth};
};
const delta={metres:0,speed:0,tiltDeg:0,bladeHz:0,reedDeg:0,waveMM:0,dustM:0,lamp:0,bellDeg:0,sailDeg:0,compact:0};
const discrete={returns:0,returnJumpM:0,returnVeil:0,uniformBend:0,uniformWave:0,compared:0};
const headers=['run','time_s','stage','cycle','x_m','z_m','speed_m_s','lean_deg','rough_mm',
  'blade_Hz','pan','wind_gain','grain_envelope','trail_m','marks','dusk','veil','reed0_rad',
  'wave0_mm','heatMax_K','compactionMax','moisture0_fraction','bellMax_deg','yard0_deg','dust0_y_m','litLamps',
  'max_cell_bend_delta_rad','max_cell_wave_delta_mm'];
function record(name,g,t,prev,cur){
  const difference=(a,b)=>a.map((v,i)=>v-b[i]),bend=difference(cur.bend,prev.bend),wave=difference(cur.wave,prev.wave);
  const dist=Math.hypot(cur.x-prev.x,cur.z-prev.z);
  if(cur.cycle!==prev.cycle){
    discrete.returns++;discrete.returnJumpM=dist;discrete.returnVeil=cur.veil;
    assert(cur.veil>.98,'Dawn relocation must be occluded.');
  }else{
    const measures={metres:dist,speed:Math.abs(cur.v-prev.v),tiltDeg:Math.abs(cur.tilt-prev.tilt),
      bladeHz:Math.abs(cur.hz-prev.hz),reedDeg:maxAbs(bend)*deg,waveMM:maxAbs(wave)*1000,
      lamp:maxAbs(difference(cur.lamps,prev.lamps)),bellDeg:maxAbs(difference(cur.bells,prev.bells))*deg,
      sailDeg:maxAbs(difference(cur.sail,prev.sail))*deg,compact:maxAbs(difference(cur.compact,prev.compact)),
      dustM:Math.max(...cur.dust.map((p,i)=>Math.hypot(...difference(p,prev.dust[i]))))};
    for(const [k,v] of Object.entries(measures)){assert(Number.isFinite(v),k);delta[k]=Math.max(delta[k],v);}
    assert(dist<=dt*8+.00001,'Physical displacement exceeded the speed cap.');
    assert(measures.speed<=.141&&measures.tiltDeg<=2.5&&measures.waveMM<.14&&measures.reedDeg<1.6);
    assert(measures.dustM<.10&&measures.lamp<.08&&measures.compact<.12&&measures.bellDeg<4);
    discrete.compared++;if(span(bend)<1e-11)discrete.uniformBend++;
    if(span(wave)<1e-12)discrete.uniformWave++;
  }
  rows.push([name,f(t),cur.phase,cur.cycle,cur.x,cur.z,cur.v,cur.tilt,cur.r,cur.hz,cur.pan,
    cur.wind,cur.noise,cur.dst,cur.stepMarks,cur.light,cur.veil,cur.bend[0],cur.wave[0]*1000,
    Math.max(...cur.heat),Math.max(...cur.compact),cur.moisture[0],maxAbs(cur.bells)*deg,
    cur.sail[0]*deg,cur.dust[0][1],g.state.lamps.filter(l=>l.lit).length,maxAbs(bend),maxAbs(wave)*1000]
    .map(v=>typeof v==='number'?f(v):v).join(','));
}
function run(name,g,seconds,onStep=()=>{},done=()=>false){
  let prev=extract(g);rows.push([name,0,prev.phase,prev.cycle,prev.x,prev.z,prev.v,prev.tilt,prev.r,prev.hz,
    prev.pan,prev.wind,prev.noise,prev.dst,prev.stepMarks,prev.light,prev.veil,prev.bend[0],prev.wave[0]*1000,
    Math.max(...prev.heat),Math.max(...prev.compact),prev.moisture[0],maxAbs(prev.bells)*deg,prev.sail[0]*deg,
    prev.dust[0][1],g.state.lamps.filter(l=>l.lit).length,0,0].join(','));
  for(let i=1;i<=Math.round(seconds/dt);i++){
    g.step(dt);const cur=extract(g);record(name,g,i*dt,prev,cur);onStep(g.state,i*dt,cur,prev);prev=cur;
    if(done())break;
  }
}
const idle=P.create(),before=extract(idle);let hintAt=0;
run('idle',idle,10,(s,t)=>{if(!hintAt&&s.demo>0)hintAt=t;});
const idleEnd=extract(idle);
report.idle={seconds:10,distanceM:idle.state.trackDistance,hintAtS:hintAt,
  zones:idle.state.cells.length,reedChangeDeg:maxAbs(idleEnd.bend.map((v,i)=>v-before.bend[i]))*deg,
  waveChangeMM:maxAbs(idleEnd.wave.map((v,i)=>v-before.wave[i]))*1000,
  dustChangeM:Math.max(...idleEnd.dust.map((p,i)=>Math.hypot(...p.map((v,k)=>v-before.dust[i][k])))),
  yardChangeDeg:maxAbs(idleEnd.sail.map((v,i)=>v-before.sail[i]))*deg};
assert.equal(report.idle.distanceM,0);assert(hintAt>=4&&hintAt<=4.05);
assert(report.idle.reedChangeDeg>1&&report.idle.waveChangeMM>.05);
const sample={};
for(const speed of [2,6]){
  const g=P.create(8439,speed);
  // Same seed, initial pose, roughness and free coast; only the initial velocity differs.
  run('coast'+speed,g,10,(s,t,cur)=>{
    if(t===dt)sample[speed]={speed:cur.v,roughMM:cur.r,bladeHz:cur.hz,wind:cur.wind};
    if(t===1)Object.assign(sample[speed],{distance1sM:cur.dst,heat1sK:Math.max(...cur.heat)});
  });
  sample[speed].scrapes=g.state.sounds.stopCount;
}
assert.equal(sample[2].roughMM,sample[6].roughMM);assert(Math.abs(sample[6].bladeHz-sample[2].bladeHz-216)<1e-7);
assert(Math.abs((2-sample[2].speed)/dt/9.81-.02)<1e-9);
assert.equal(sample[2].scrapes,1);assert(sample[6].heat1sK>sample[2].heat1sK);
report.speedOnly=sample;
const trip=P.create();trip.controls(true,0,.13);
let entered=[],maxComp=0,maxGrainHeight=0,maxLit=0,peakGlow=0,maxLean=0,maxPan=0,
  maxSnow=0,maxRough=-Infinity,minRough=Infinity,maxYard=0,maxPullback=0,elapsed=0,trailBeforeBridge=0;
run('journey',trip,190,(s,t,cur)=>{
  if(entered.at(-1)?.stage!==s.stage){
    entered.push({stage:s.stage,seconds:t});
    if(s.stage===1)trailBeforeBridge=cur.dst;
  }
  maxComp=Math.max(maxComp,...cur.compact);maxSnow=Math.max(maxSnow,s.snow);
  maxGrainHeight=Math.max(maxGrainHeight,...s.grains.filter(g=>g.life>0).map(g=>g.y-.13));
  maxLit=Math.max(maxLit,s.lamps.filter(l=>l.lit).length);peakGlow=Math.max(peakGlow,...cur.lamps);
  maxLean=Math.max(maxLean,Math.abs(cur.tilt));maxPan=Math.max(maxPan,Math.abs(cur.pan));
  maxRough=Math.max(maxRough,cur.r);minRough=Math.min(minRough,cur.r);
  maxYard=Math.max(maxYard,maxAbs(cur.sail)*deg);maxPullback=Math.max(maxPullback,s.camera.distance);
  if(s.cycle===1&&!elapsed)elapsed=t;
},()=>trip.state.cycle===1&&trip.state.veil===0);
assert.deepEqual(entered.map(e=>e.stage),[0,1,2,3,4,0]);assert(maxComp>.4&&maxLit===6&&maxSnow>.99);
assert(trip.state.sounds.grainCount>50&&trip.state.sounds.bellCount>=5&&maxGrainHeight>.02);
assert(elapsed>=120&&trip.state.cycle===1&&trip.state.veil===0&&trip.state.trail.length===0);
report.journey={entered,elapsedS:elapsed,lapMarkM:trailBeforeBridge,bellStrikes:trip.state.sounds.bellCount,
  snowCrunches:trip.state.sounds.grainCount,maxCompaction:maxComp,maxThrownGrainM:maxGrainHeight,
  lights:maxLit,peakLamp:peakGlow,peakLeanDeg:maxLean,peakPan:maxPan,roughRangeMM:[minRough,maxRough],
  peakYardDeg:maxYard,wideCameraBehindM:maxPullback};
const fastest=P.create();fastest.controls(true,-1,1);let maxMeasured=0;
run('fast-turn',fastest,30,(s,t,cur,prev)=>{maxMeasured=Math.max(maxMeasured,Math.hypot(cur.x-prev.x,cur.z-prev.z)/dt);});
assert(maxMeasured>7.98&&maxMeasured<8.00001);report.maxMeasuredMps=maxMeasured;
const tap=P.create();tap.controls(true,0,.13);tap.step(1/120);tap.controls(false);run('tap',tap,8);
assert(tap.state.p.speed===0&&tap.state.trackDistance>.5&&tap.state.sounds.stopCount===1);
report.shortTap={contactS:1/120,coastM:tap.state.trackDistance,scrapes:tap.state.sounds.stopCount};
const a=P.create(),b=P.create();a.step(10);for(let i=0;i<200;i++)b.step(.05);
assert.deepEqual(a.getState(),b.getState());assert.equal(discrete.uniformBend,0);assert.equal(discrete.uniformWave,0);
report.adjacentMax=delta;report.samples={intervalS:dt,...discrete};
fs.writeFileSync(path.join(__dirname,'state-trace.csv.gz'),gzipSync([headers.join(','),...rows].join('\n')+'\n'));
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(report,(k,v)=>typeof v==='number'?f(v):v,2)+'\n');
console.log(JSON.stringify(report,(k,v)=>typeof v==='number'?f(v):v,2));
