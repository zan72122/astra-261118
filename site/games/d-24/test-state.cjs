'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const { create, floor, top } = require('./simulation.js');

const { soundInputs } = require('./sound.js');
const dt = 0.05;
const rows = [];
const peak = {};
const bounds = { level: .035, surface: .021, heave: .035, travel: .074, gate: .065,
  valve: .14, sail: .012, bell: .071, light: .035, fish: .20, bird: Math.hypot(2.4,2.4,1.9)*dt, panel: .045, dust: .025, flag: .04 };
const stages = [];
const audio={lowMin:Infinity,lowMax:0,cutoffMax:0};
let openAngle=0, wetHeight=0, wetLag=0;
const heldSeconds = [0, 0, 0], measuredRise=[0,0,0];
const exactMax = { flow: [0,0,0], swirl: [0,0,0], fishHeight:0, peakDrops:0, activeFoam:0, lift:0, speed:0, bell:0, light:0, wing:0, heave:0 };
let uniformSections=0, sectionsChecked=0, minSpread=Infinity;
const fixed = n => Number(n.toFixed(6));
const header = ['trial','seconds','mode','chamber','target','held','boat_x_m','boat_y_m','boat_z_m','speed_m_s',
  'roll_rad','pitch_rad','sail_hoist','sail_z_m','bell_rad','strikes','flag_hoist','lamp_brightness','rotor_rad','foam_count','vapour_count',
  'fish_high_m','bird0_y_m','dust0_x_m','panel0_m','panel4_m','panel7_m'];
for(let k=0;k<4;k++)header.push('level'+k+'_m','valve'+k,'inflow'+k+'_m_s','discharge'+k+'_m3_s','swirl'+k+'_rad_s','leafL'+k+'_rad','leafR'+k+'_rad','min_cell_delta'+k+'_m','max_cell_delta'+k+'_m');
rows.push(header.join(','));
function snapshot(s) {
  return {levels:s.water.map(w=>w.level),gates:s.water.flatMap(w=>w.gate),valves:s.water.map(w=>w.valve),
    grid:s.water.map(w=>w.cells.map(c=>c.h)),boatY:s.boat.y,z:s.boat.z,panel:s.sail.panels.map(p=>p.bend),sail:s.sail.hoist,
    bell:s.harbor.bell,light:s.harbor.light,fish:s.fish.map(f=>f.y),bird:s.birds.map(b=>[b.x,b.y,b.z]),
    dust:s.dust.map(p=>[p.x,p.y,p.z]),flag:s.harbor.flags.map(f=>f.a)};
}
function maximumDiff(a,b){return Math.max(...a.map((v,i)=>Math.abs(v-b[i])));}
function vectorDiff(a,b){return Math.max(...a.map((v,i)=>Math.hypot(...v.map((n,j)=>n-b[i][j]))));}
function measure(name,v){
  assert.ok(Number.isFinite(v) && v <= bounds[name]+1e-7, name+' discontinuity '+v);
  peak[name]=Math.max(peak[name]||0,v);
}
function advance(g,trial) {
  const s=g.state,before=snapshot(s);
  g.step(dt);
  const after=snapshot(s);
  measure('level',maximumDiff(after.levels,before.levels));
  measure('valve',maximumDiff(after.valves,before.valves));
  measure('gate',maximumDiff(after.gates,before.gates));
  measure('heave',Math.abs(after.boatY-before.boatY)); measure('travel',Math.abs(after.z-before.z));
  measure('panel',maximumDiff(after.panel,before.panel));measure('sail',Math.abs(after.sail-before.sail));
  measure('bell',Math.abs(after.bell-before.bell));measure('light',Math.abs(after.light-before.light));
  measure('fish',maximumDiff(after.fish,before.fish));measure('bird',vectorDiff(after.bird,before.bird));
  measure('dust',vectorDiff(after.dust,before.dust));measure('flag',maximumDiff(after.flag,before.flag));
  const section=[];
  const inputs=soundInputs(s);
  if(inputs.w.valve>.01){audio.lowMin=Math.min(audio.lowMin,inputs.lowHz);audio.lowMax=Math.max(audio.lowMax,inputs.lowHz);audio.cutoffMax=Math.max(audio.cutoffMax,inputs.cutoffHz);}

  for(let k=0;k<4;k++){
    const w=s.water[k],deltas=after.grid[k].map((n,i)=>n-before.grid[k][i]),low=Math.min(...deltas),high=Math.max(...deltas);
    openAngle=Math.max(openAngle,...w.gate);wetHeight=Math.max(wetHeight,w.wetLine);wetLag=Math.max(wetLag,w.wetLine-w.level);
    sectionsChecked++;if(high-low<1e-10)uniformSections++;minSpread=Math.min(minSpread,high-low);
    measure('surface',Math.max(Math.abs(low),Math.abs(high)));
    section.push(w.level,w.valve,w.flow,w.discharge,w.swirl,...w.gate,low,high);
    if(trial==='voyage' && k<3 && s.mode==='lock'){
      exactMax.flow[k]=Math.max(exactMax.flow[k],w.flow);exactMax.swirl[k]=Math.max(exactMax.swirl[k],w.swirl);
    }
  }
  const foam=s.foam.filter(p=>p.age<p.life).length,vapour=s.vapour.filter(p=>p.age<p.life).length,fy=Math.max(...after.fish);
  exactMax.peakDrops=Math.max(exactMax.peakDrops,s.drops.filter(d=>d.wet).length);
  exactMax.activeFoam=Math.max(exactMax.activeFoam,foam);exactMax.fishHeight=Math.max(exactMax.fishHeight,fy);
  exactMax.speed=Math.max(exactMax.speed,Math.abs(s.boat.speed)); exactMax.heave=Math.max(exactMax.heave,s.boat.y);
  exactMax.lift=Math.max(exactMax.lift,s.harbor.hoist);exactMax.bell=Math.max(exactMax.bell,Math.abs(s.harbor.bell));
  exactMax.light=Math.max(exactMax.light,s.harbor.light);exactMax.wing=Math.max(exactMax.wing,...s.birds.map(b=>b.y-7.5));
  const values=[s.boat.x,s.boat.y,s.boat.z,s.boat.speed,s.boat.roll,s.boat.pitch,s.sail.hoist,s.sail.z,s.harbor.bell,s.harbor.strikes,
    s.harbor.hoist,s.harbor.light,s.harbor.rotor,foam,vapour,fy,s.birds[0].y,s.dust[0].x,s.sail.panels[0].bend,s.sail.panels[4].bend,s.sail.panels[7].bend];
  rows.push([trial,fixed(s.elapsed),s.mode,s.index,s.target,Number(s.held),...values.map(fixed),...section.map(fixed)].join(','));
}
const idle=create(),initial=idle.getState();let hintStart=0;
for(let i=0;i<200;i++){advance(idle,'idle');if(!hintStart && idle.state.hint>0)hintStart=idle.state.elapsed;}
assert.equal(idle.state.mode,'lock');assert.equal(idle.state.boat.z,initial.boat.z);
assert.deepEqual(idle.state.water.map(w=>w.level),initial.water.map(w=>w.level));
const idleHeights=idle.state.water.flatMap((w,k)=>w.cells.map((c,i)=>Math.abs(c.h-initial.water[k].cells[i].h)));
assert.ok(idleHeights.every(n=>n>1e-8));assert.ok(hintStart>=4 && hintStart<4.06);
const idleDust=vectorDiff(idle.state.dust.map(d=>[d.x,d.y,d.z]),initial.dust.map(d=>[d.x,d.y,d.z]));
assert.ok(idleDust>.01);
const low=create({firstHead:.625}),high=create({firstHead:1.25});
for(const g of [low,high])g.press('valve0');
for(let i=0;i<20;i++){advance(low,'head-low');advance(high,'head-high');}
const lowQ=low.state.water[0].flow,highQ=high.state.water[0].flow;
assert.ok(Math.abs(highQ/lowQ-2)<1e-12);assert.equal(low.state.water[0].valve,high.state.water[0].valve);
const letgo=create();assert.equal(letgo.press('valve2'),false);assert.equal(letgo.press(''),false);
for(let i=0;i<20;i++)advance(letgo,'inactive');
assert.equal(letgo.state.water[0].level,floor[0]);assert.equal(letgo.state.water[2].valve,0);
letgo.press('valve0');for(let i=0;i<30;i++)advance(letgo,'hold');
const releaseH=letgo.state.water[0].level;letgo.release();let residual;
for(let i=0;i<80;i++){advance(letgo,'release');if(i===5)residual=letgo.state.water[0].flow;}
assert.ok(residual>0);assert.ok(letgo.state.water[0].valve<1e-5);
const voyage=create(),s=voyage.state;
let last='',maxClothSpread=0;
for(let i=0;i<7000 && s.cycle===0;i++){
  const label=s.mode+((s.mode==='lock'||s.mode==='cross')?s.index:['drain','backCross'].includes(s.mode)?s.returnIndex:'');
  if(label!==last){stages.push([label,fixed(s.elapsed)]);last=label;if(s.mode==='cross')measuredRise[s.index]=s.water[s.index].level-floor[s.index];}
  if(s.target && !s.held)assert.equal(voyage.press(s.target),true);
  if(s.mode==='lock'){
    heldSeconds[s.index]+=dt;
    if(top[s.index]-s.water[s.index].level>.002){assert.ok(s.water[s.index].gate[0]<.001);assert.ok(Math.abs(s.boat.speed)<.13);}
  }
  advance(voyage,'voyage');
  maxClothSpread=Math.max(maxClothSpread,Math.max(...s.sail.panels.map(p=>p.bend))-Math.min(...s.sail.panels.map(p=>p.bend)));
}
assert.equal(s.cycle,1);assert.equal(s.target,'valve0');assert.equal(s.harbor.hoist,0);
assert.deepEqual(stages.map(x=>x[0]),['lock0','cross0','lock1','cross1','lock2','cross2','rig','cruise','welcome','lantern','salute','return','drain2','backCross1','drain1','backCross0','drain0']);
assert.ok(heldSeconds[1]>heldSeconds[0]*1.5);assert.ok(s.fish.some(f=>f.jumps>0));assert.ok(maxClothSpread>.20);
assert.ok(s.birds.every(b=>b.air===0));assert.ok(s.water.slice(0,3).every((w,i)=>Math.abs(w.level-floor[i])<.0021));
assert.equal(uniformSections,0);assert.ok(s.elapsed>180);
// A second voyage verifies reuse of all interaction and reward state after the return.
const replayStart=s.elapsed;
while(s.cycle<2 && s.elapsed<replayStart+350){if(s.target&&!s.held)voyage.press(s.target);advance(voyage,'replay');}
assert.equal(s.cycle,2);assert.equal(uniformSections,0);
const report={step_s:dt,samples:rows.length-1,sectionsChecked,uniformSections,minSpread_m:minSpread,
  idle10s:{changedCells:idleHeights.length,maxHeightChange_m:Math.max(...idleHeights),hullChange_m:idle.state.boat.y-initial.boat.y,
    dustTravel_m:idleDust,guideStart_s:hintStart,activeVapour:idle.state.vapour.filter(p=>p.age<p.life).length},
  headTest:{head_m:[.625,1.25],flowAt1s_m_s:[lowQ,highQ],dischargeAt1s_m3_s:[low.state.water[0].discharge,high.state.water[0].discharge],ratio:highQ/lowQ},
  release:{flowAfterPoint3s_m_s:residual,additionalRise_m:letgo.state.water[0].level-releaseH},
  locks:{rise_m:measuredRise,hold_s:heldSeconds.map(fixed)},stages,firstCycle_s:replayStart,secondCycle_s:s.elapsed-replayStart,
  audio_Hz:audio,maxGate_rad:openAngle,maxWetLine_m:wetHeight,maxWetLag_m:wetLag,maxClothSpread_m:maxClothSpread,peaks:exactMax,maxStep:peak};
fs.writeFileSync(path.join(__dirname,'state-trace.csv.gz'),gzipSync(rows.join('\n')+'\n',{level:9}));
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(report,(k,v)=>typeof v==='number'?Number(v.toPrecision(9)):v,2)+'\n');
console.log(JSON.stringify(report,null,2));
