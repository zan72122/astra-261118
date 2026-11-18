// Run with node games/d-49/tests/state.cjs. The trace contains the actual samples,
// including each bed sector, wind cell, flower bend, dust coordinate and window.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {create}=require('../sim.js');
const dt=.05;
const array=(n,f)=>Array.from({length:n},(_,i)=>f(i));
const channels=[
  ['compression_m',s=>s.compression],['height_m',s=>s.height],['cameraLift_m',s=>s.cameraLift],
  ['ballCentre_m',s=>.79+.236+s.height],
  ['wheel_rad',s=>s.wheel],['boat_fraction',s=>s.boatX],['boatHeel_rad',s=>s.boatHeel],
  ['balloonY_m',s=>s.balloonY],['balloonX_m',s=>s.balloonX],['tether_m',s=>s.tether],
  ['basket_rad',s=>s.basket],['dusk_fraction',s=>s.dusk],['flow_lps',s=>s.flow],
  ...array(24,i=>['mat'+i+'_m',s=>s.mat[i].depth]),
  ...array(12,i=>['wind'+i+'_mps',s=>s.wind[i].speed]),
  ...array(48,i=>['stem'+i+'_rad',s=>s.stems[i].angle]),
  ...array(42,i=>['x','y','z'].map(axis=>['mote'+i+axis+'_m',s=>s.motes[i][axis]])).flat(),
  ...array(16,i=>['water'+i+'_m',s=>s.water[i].level]),
  ...array(3,i=>['cell'+i+'_fraction',s=>s.cells[i]]),
  ...array(12,i=>['heat'+i+'_fraction',s=>s.envelope[i].heat]),
  ...array(18,i=>['lamp'+i+'_fraction',s=>s.lamps[i].filament]),
  ['guide_opacity',s=>s.hand.visibility]
];
const csv=[['run','time_s','stage','jumps','airborne',...channels.map(c=>c[0])].join(',')];
const limits={},minima={},maxima={},nonuniform={};
let comparisons=0;
function recorder(name){
  let previous=null;
  return s=>{
    const values=channels.map(c=>c[1](s));
    assert(values.every(Number.isFinite));
    csv.push([name,s.time.toFixed(2),s.stage+1,s.jumps,+s.airborne,...values.map(x=>x.toFixed(6))].join(','));
    const delta=values.map((x,i)=>previous?x-previous[i]:0);
    for(const [i,[channel]] of channels.entries()){
      const key=channel.replace(/\d+/g,'');
      limits[key]=Math.max(limits[key]||0,Math.abs(delta[i]));
      minima[key]=Math.min(minima[key]??Infinity,values[i]);
      maxima[key]=Math.max(maxima[key]??-Infinity,values[i]);
    }
    if(previous){
      comparisons++;
      for(const prefix of ['mat','stem','wind','water','heat','lamp','cell','mote']){
        const group=channels.flatMap((c,i)=>c[0].startsWith(prefix)?[delta[i]]:[]);
        // An inactive group at rest is expected. Moving groups must retain spatial variation.
        if(Math.max(...group.map(Math.abs))>1e-7){
          assert(Math.max(...group)-Math.min(...group)>1e-10,'uniform update: '+prefix+' at '+s.time);
          nonuniform[prefix]=(nonuniform[prefix]||0)+1;
        }
      }
    }
    previous=values;
  };
}
const idle=create(),idleLog=recorder('idle10'),start=idle.getState();idleLog(idle.state);let firstGuide=null;
for(let i=0;i<200;i++){idle.step(dt);idleLog(idle.state);if(firstGuide===null&&idle.state.hand.running)firstGuide=idle.state.time;}
const atRest=idle.getState();
assert.equal(atRest.jumps,0);assert.equal(atRest.stage,0);assert(Math.abs(atRest.height)<1e-9);
const idleMote=Math.max(...atRest.motes.map((p,i)=>Math.hypot(p.x-start.motes[i].x,p.y-start.motes[i].y,p.z-start.motes[i].z)));
const idleStem=Math.max(...atRest.stems.map((p,i)=>Math.abs(p.angle-start.stems[i].angle)));
assert(idleMote>.1&&idleStem>.01&&atRest.wheel>.2);
assert(firstGuide>=4-.0001&&firstGuide<=4.05+.0001);
const firstBend={};
function repetition(count){
  const game=create(),log=recorder('jumps'+count);log(game.state);
  let peak=0,lastPeak=0,firstPeak=0,topSeconds=0;
  for(let i=0;i<720;i++){
    if(i%60===0&&i/60<count)assert(game.press(.55,-.24));
    if(i%60===15&&Math.floor(i/60)<count)game.release();
    game.step(dt);const s=game.state;log(s);
    if(i===12&&count===1){
      firstBend.min=Math.min(...s.mat.map(m=>m.depth));firstBend.max=Math.max(...s.mat.map(m=>m.depth));
    }
    if(s.jumps===1)firstPeak=Math.max(firstPeak,s.height);
    if(s.jumps===count)lastPeak=Math.max(lastPeak,s.height);
    if(s.jumps===1&&s.airborne&&Math.abs(s.velocity)<.35)topSeconds+=dt;
    peak=Math.max(peak,s.height);
  }
  assert.equal(game.state.jumps,count);return {peak,lastPeak,firstPeak,topSeconds};
}
const single=repetition(1),multiple=repetition(11);
assert(Math.abs(single.peak-1.2)<.001);assert(Math.abs(multiple.lastPeak-2.8)<.001);
assert(Math.abs(single.firstPeak-multiple.firstPeak)<1e-9);
assert(firstBend.max-firstBend.min>.025);
const game=create(),cycleLog=recorder('cycle'),transitions=[],litAt=[];
let prevStage=0,maxLit=0,eveningApex=0,apexTime=0,launch=0,afterReturnPeak=0;
cycleLog(game.state);
for(let i=0;i<4800;i++){
  if(i%60===0)game.press(.55,-.24);
  if(i%60===15)game.release();
  game.step(dt);const s=game.state;cycleLog(s);
  if(s.stage!==prevStage){transitions.push([s.stage,s.time]);prevStage=s.stage;}
  if(launch!==s.jumps){launch=s.jumps;apexTime=0;}
  if(s.stage===3&&s.airborne&&Math.abs(s.velocity)<.35){apexTime+=dt;eveningApex=Math.max(eveningApex,apexTime);}
  const lit=s.lamps.filter(l=>l.filament>=.38).length;
  if(lit>maxLit){litAt.push(s.time);maxLit=lit;}
  if(s.cycle>0&&s.targetHeight<1.21)afterReturnPeak=Math.max(afterReturnPeak,s.height);
  if(afterReturnPeak>=1.1999)break;
}
assert.deepEqual(transitions.map(t=>t[0]),[1,2,3,0]);assert(maxLit===18&&litAt.length>=15);
assert(litAt.at(-1)>litAt[0]+12);assert(eveningApex>single.topSeconds);
assert(Math.abs(afterReturnPeak-1.2)<.001);assert(transitions.at(-1)[1]>=120);
assert(maxima.compression_m<=.2200001);
// A fully loaded 15 kg bed releases at most sqrt(k/m)*stroke m/s.
// The sector oscillator is driven by at most 0.84 of that central displacement.
const springTravelPerSample=Math.sqrt(1800/15)*.22*dt;
const flightTravelPerSample=Math.sqrt(2*9.81*2.8)*dt;
assert(limits.height_m<=flightTravelPerSample && limits.compression_m<=springTravelPerSample);
assert(limits.mat_m<=springTravelPerSample*.84 && limits.cameraLift_m<.18);
assert(limits.balloonY_m<.09 && limits.tether_m<.04 && limits.basket_rad<.04);
assert(limits.water_m<.015 && limits.dusk_fraction<.032 && limits.lamp_fraction<.045);
assert(limits.stem_rad<.014 && limits.wind_mps<.066);
assert(limits.ballCentre_m<flightTravelPerSample+springTravelPerSample);
assert(limits.wheel_rad<.16 && limits.boat_fraction<.01 && limits.boatHeel_rad<.004);
assert(limits.cell_fraction<.025 && limits.heat_fraction<.025 && limits.balloonX_m<.05);
assert(limits.motex_m<.02 && limits.motey_m<.02 && limits.motez_m<.02);
for(const key of Object.keys(nonuniform))assert(nonuniform[key]>100);
// Replays with matching seeds and time. Only the selected local interaction differs.
for(const stage of [1,2,3]){
  const a=create(),b=create();
  for(let i=0;i<4700;i++){
    for(const g of [a,b]){if(i%60===0)g.press(.55,-.24);if(i%60===15)g.release();g.step(dt);}
    if(a.state.stage===stage&&!a.state.pressed)break;
  }
  const target=['','water','balloon','lamp'][stage],wrong=stage===1?'lamp':'water';
  assert.equal(b.press(0,0,wrong),false);assert(b.press(.9,0,target,6));
  for(let j=0;j<30;j++){a.step(dt);b.step(dt);}b.release();
  if(stage===1)assert(b.state.flow>a.state.flow+.3);
  if(stage===2)assert(b.state.envelope[0].heat>a.state.envelope[0].heat+.2);
  if(stage===3)assert(b.state.lamps[6].filament>a.state.lamps[6].filament+.1);
}
// Holding, cancelling and rapidly pressing during a flight never lose the next play.
const rapid=create();rapid.press();rapid.step(6);assert(rapid.state.compression<=.22);rapid.release();rapid.step(.22);
assert(rapid.state.airborne);rapid.press();rapid.step(.04);rapid.release();rapid.step(5);assert.equal(rapid.state.jumps,2);
const steady=create(),batched=create();steady.press(.4,.2);batched.press(.4,.2);
for(let j=0;j<200;j++)steady.step(dt);batched.step(10);
assert.deepEqual(steady.getState(),batched.getState());
const trace=path.join(__dirname,'state-trace.csv.gz');
fs.writeFileSync(trace,zlib.gzipSync(csv.join('\n')+'\n',{level:9}));
console.log(JSON.stringify({samples:csv.length-1,comparisons,firstGuide,idleMote,idleStem,idleWheel:atRest.wheel,firstBend,single,multiple,transitions,maxLit,firstLamp:litAt[0],lastLamp:litAt.at(-1),eveningApex,limits,minima,maxima,nonuniform},null,2));
