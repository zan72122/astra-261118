'use strict';
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { create } = require('../simulation.js');

const dt=.05, seed=3721, lines=[], traceRuns={}, changes={}, homogeneous={};
const sum=a=>a.reduce((s,n)=>s+n,0);
const max=a=>Math.max(...a);
const stateGroups=s=>({
  head:[s.spring.head], moisture:s.soil.map(p=>p.wet), mass:s.soil.map(p=>p.mass),
  force:s.soil.map(p=>p.force), level:s.fields.flatMap(p=>p.h), ripple:s.fields.flatMap(p=>p.ripple),
  flow:s.channels.map(p=>p.q), section:s.channels.map(p=>p.section), splash:s.channels.map(p=>p.splash),
  gate:[s.gate.lift], angle:[s.wheel.angle], speed:[s.wheel.speed], tool:[s.tool.depth],
  height:s.shoots.map(p=>p.height), bend:s.shoots.map(p=>p.bend), wind:s.wind.slice(),
  throat:s.frogs.map(p=>p.voice), glow:s.motes.map(p=>p.glow), dusk:[s.dusk], camera:[s.camera]
});
const multi=['moisture','mass','flow','level','ripple','height','bend','wind','throat','glow'];
const bounds={head:.004,moisture:.025,mass:.023,force:.60,level:.013,ripple:.0015,
  flow:.007,section:.015,splash:.02,gate:.011,angle:.067,speed:.055,tool:.061,
  height:.018,bend:.015,wind:.060,throat:.36,glow:.19,dusk:.01,camera:.05};
const results={};
function record(name,sim,prev){
  const s=sim.getState(),g=stateGroups(s);
  for(const c of s.channels)assert.ok(Math.abs(c.q-1.35*c.section*c.slope)<1e-12);
  traceRuns[name]=(traceRuns[name]||0)+1;
  // Field order, units and all discrete events are in every full-state sample.
  // Five decimal places retain sub-millimetre changes without huge trace files.
  lines.push(JSON.stringify({run:name,...s},(k,v)=>typeof v==='number'?+v.toFixed(5):v));
  for(const values of Object.values(g))for(const v of values)assert.ok(Number.isFinite(v));
  if(!prev)return g;
  for(const key of Object.keys(g)){
    const delta=g[key].map((v,i)=>v-prev[key][i]),big=max(delta.map(Math.abs));
    changes[key]=Math.max(changes[key]||0,big);
    if(big>bounds[key])throw Error(name+' '+s.time+' '+key+' step '+big+' > '+bounds[key]);
    if(multi.includes(key)){
      const check = part => {
        const peak=max(part.map(Math.abs));
        if(peak>1e-6 && max(part)-Math.min(...part) < Math.max(1e-11,peak*1e-7))
          homogeneous[key]=(homogeneous[key]||0)+1;
      };
      if(key==='level'||key==='ripple')for(let i=0;i<4;i++)check(delta.slice(7*i,7*i+7));
      else check(delta);
    }
  }
  return g;
}
const idle=create(seed),start=idle.getState(),heads=[start.spring.head];
let prev=record('idle',idle);
for(let i=0;i<200;i++){idle.step(dt);heads.push(idle.state.spring.head);prev=record('idle',idle,prev);}
const rest=idle.getState();
assert.equal(rest.phase,0);assert.equal(rest.planted,0);assert.equal(rest.gritCount,0);
assert.ok(rest.hint>.98);
assert.deepEqual(rest.soil.map(p=>p.mass),start.soil.map(p=>p.mass));
const wetGain=rest.soil.map((p,i)=>p.wet-start.soil[i].wet);
assert.ok(max(heads)-Math.min(...heads)>.005);
assert.ok(Math.min(...wetGain)>.09 && max(wetGain)-Math.min(...wetGain)>.18);
results.idle={headRange_m:[Math.min(...heads),max(heads)],moistureGain:wetGain,
  endMaxWind_m_s:max(rest.wind.map(Math.abs)),hint:rest.hint};
const ab={};
for(const [name,wet] of [['dry',.15],['wet',.85]]){
  const game=create(seed);game.state.soil[3].wet=wet;
  const initial=game.getState();prev=record(name,game);
  assert.equal(game.press('wheel'),false);assert.equal(game.press('soil',.60,1),true);
  for(let i=0;i<20;i++){game.step(dt);prev=record(name,game,prev);}
  const end=game.getState();game.release();
  for(let i=0;i<10;i++){game.step(dt);prev=record(name,game,prev);}
  ab[name]={erosion_kg:initial.soil[3].mass-end.soil[3].mass,total_kg:sum(initial.soil.map((p,i)=>p.mass-end.soil[i].mass)),
    afterRelease_kg:end.soil[3].mass-game.state.soil[3].mass,forceAtRelease:end.soil[3].force};
  assert.ok(ab[name].afterRelease_kg>.002);
}
assert.ok(ab.wet.erosion_kg>ab.dry.erosion_kg*2.4);
results.moisturePair=ab;
const game=create(seed);let phase=-1,age=0,sequence=[],peakH=[0,0,0,0],peakQ=[0,0,0,0],peakRpm=0,peakShoot=0,peakDusk=0,peakCalls=0,peakGlow=0,peakGate=0;
prev=record('cycle',game);
for(let i=0;i<6400 && !game.state.cycle;i++){
  const s=game.state;
  if(phase!==s.phase){phase=s.phase;age=0;sequence.push([phase,+s.time.toFixed(3)]);}
  if(phase===0){
    if(age%44===0)game.press('soil',((Math.floor(age/44)*3)%7)/6);
    if(age%44===34)game.release();
  }else if(phase===1||phase===2){
    if(age%26===0)game.press(game.active(),.5);
    if(age%26===16)game.release();
  }else if(phase===3){
    const next=s.shoots.find(p=>!p.planted);
    if(next && age%20===0)game.press('rice',(next.row+.5)/4);
    if(age%20===17)game.release();
  }else if(phase===4){
    if(age%78===0)game.press('frog',(Math.floor(age/78)%3+.5)/3);
    if(age%78===12)game.release();
  }
  game.step(dt);age++;
  prev=record('cycle',game,prev);
  s.fields.forEach((f,j)=>peakH[j]=Math.max(peakH[j],f.level));
  s.channels.forEach((c,j)=>peakQ[j]=Math.max(peakQ[j],c.q));
  peakRpm=Math.max(peakRpm,s.wheel.speed*60/(Math.PI*2));
  peakShoot=Math.max(peakShoot,...s.shoots.map(p=>p.height));peakDusk=Math.max(peakDusk,s.dusk);
  peakCalls=Math.max(peakCalls,sum(s.frogs.map(p=>p.calls)));
  peakGlow=Math.max(peakGlow,...s.motes.map(p=>p.glow*s.dusk));
  peakGate=Math.max(peakGate,s.gate.lift);
}
sequence.push([game.state.phase,+game.state.time.toFixed(3)]);
assert.deepEqual(sequence.map(p=>p[0]),[0,1,2,3,4,5,0]);
assert.equal(game.state.cycle,1);assert.ok(peakRpm>3);assert.ok(peakCalls>=9);
assert.ok(peakShoot>.22 && peakDusk>.94 && peakGlow>.90);
assert.ok(game.state.fields.every(p=>p.level<.033));
assert.ok(game.state.soil.every(p=>p.original-p.mass<.001));
assert.equal(game.press('soil',.2),true);game.step(.6);
assert.ok(game.state.soil[1].mass<game.state.soil[1].original);
results.cycle={phaseAt_s:sequence,peakH_m:peakH,peakQ_m3_s:peakQ,peakRpm,peakGate_m:peakGate,
  peakShoot_m:peakShoot,peakDusk,peakCalls,peakGlow};
const continuous=create(seed),split=create(seed);continuous.step(10);
for(let i=0;i<200;i++)split.step(dt);
assert.deepEqual(continuous.getState(),split.getState());
assert.deepEqual(homogeneous,{});
results.step_s=dt;results.samples=traceRuns;results.maxAdjacentStep=changes;results.uniformChanges=homogeneous;
writeFileSync(join(__dirname,'states.jsonl.gz'),gzipSync(lines.join('\n')+'\n',{level:6}));
writeFileSync(join(__dirname,'results.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
