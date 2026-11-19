'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{gzipSync}=require('node:zlib');
const {create}=require('../simulation.js');
const dt=.05,rad=180/Math.PI,seed=7413,trace=[],peaks={},uniform={},changes={},checks={};
let headers=null;
function fields(s){
  return {
    wind_m_s:s.air.map(q=>q.u),bell_rad:s.bells.map(b=>b.angle),tongue_rad:s.bells.map(b=>b.tongue),
    tag_rad:s.bells.map(b=>b.tag),strip_rad:s.bells.flatMap(b=>b.strip.map(q=>q.bend)),ring_amp:s.bells.map(b=>b.ring),
    cloth_m:s.cloth.flatMap(p=>p.map(q=>q.d)),wet_fraction:s.cloth.flatMap(p=>p.map(q=>q.wet)),
    leaf_rad:s.leaves.map(q=>q.angle),water_m:s.water.map(q=>q.h),petal_m:[s.petal.x,s.petal.z],
    wheel_rad:[s.wheel.angle],hoist_m:[s.wheel.hoist],cam_m:[s.wheel.lift],sun_rad:[s.sun.alt],
    plane_m:[s.plane.x,s.plane.y,s.plane.z],pollen_x_m:s.dust.map(q=>q.x),pollen_y_m:s.dust.map(q=>q.y)
  };
}
function observe(label,s,before,caseStats){
  const values=fields(s),old=before&&fields(before),row=[label,s.elapsed.toFixed(2),s.stage];
  if(!headers)headers=['trial','seconds','chapter',...Object.entries(values).flatMap(([k,a])=>a.map((_,i)=>k+'_'+i)),
    'hits_glass','hits_iron','hits_ceramic','drop_id','drop_y_m','firework_count','spark_id_x_y_z_m'];
  for(const [key,a] of Object.entries(values)){
    assert(a.every(Number.isFinite),key+' finite');
    row.push(...a.map(x=>Number(x.toFixed(6))));
    if(!old)continue;
    let delta=a.map((x,i)=>x-old[key][i]);
    // Motes re-enter across a ten-metre-wide field, outside the camera frustum.
    if(key==='pollen_x_m')delta=delta.map((d,i)=>d+10*((s.dust[i].generation||0)-(before.dust[i].generation||0)));
    const max=Math.max(...delta.map(Math.abs));
    peaks[key]=Math.max(peaks[key]||0,max);
    if(['wind_m_s','strip_rad','cloth_m','leaf_rad','water_m'].includes(key)&&max>1e-9){
      changes[key]=(changes[key]||0)+1;
      if(Math.max(...delta)-Math.min(...delta)<1e-10)uniform[key]=(uniform[key]||0)+1;
    }
  }
  row.push(...s.bells.map(b=>b.hits),s.drip.generation,s.drip.y.toFixed(5),s.fireworks,
    s.sparks.map(p=>[p.id,p.x.toFixed(4),p.y.toFixed(4),p.z.toFixed(4)].join(':')).join('|'));
  trace.push(row.join(','));
  if(before){
    const span=Math.hypot(...values.plane_m.map((p,i)=>p-old.plane_m[i]));peaks.plane_step_m=Math.max(peaks.plane_step_m||0,span);
    const sparks=new Map(before.sparks.map(q=>[q.id,q]));
    for(const q of s.sparks){const prev=sparks.get(q.id);if(prev)peaks.spark_step_m=Math.max(peaks.spark_step_m||0,Math.hypot(q.x-prev.x,q.y-prev.y,q.z-prev.z));}
    if(s.drip.generation===before.drip.generation)peaks.drop_step_m=Math.max(peaks.drop_step_m||0,Math.abs(s.drip.y-before.drip.y));
    // Once a drop hits the water it ceases to exist. The next bead starts at the spout.
    if(s.drip.generation!==before.drip.generation)caseStats.newBeads++;
  }
  assert(s.air.every(a=>a.u>=0&&a.u<=5));
  caseStats.maxAir=Math.max(caseStats.maxAir,...values.wind_m_s);
  caseStats.maxBellDeg=Math.max(caseStats.maxBellDeg,Math.abs(values.bell_rad[0])*rad);
  caseStats.stripDeg=Math.max(caseStats.stripDeg,...values.strip_rad.map(x=>Math.abs(x)*rad));
  caseStats.fabricCm=Math.max(caseStats.fabricCm,...values.cloth_m.map(n=>n*100));
  caseStats.curtainCm=Math.max(caseStats.curtainCm,...s.cloth[3].map(q=>q.d*100));
  caseStats.leafDeg=Math.max(caseStats.leafDeg,...values.leaf_rad.map(x=>x*rad));
  caseStats.waterMm=Math.max(caseStats.waterMm,...values.water_m.map(x=>Math.abs(x)*1000));
  caseStats.hoistCm=Math.max(caseStats.hoistCm,100*s.wheel.hoist);
  caseStats.waterTravelCm=Math.max(caseStats.waterTravelCm,s.petal.travel*100);
  caseStats.flightHeightM=Math.max(caseStats.flightHeightM,s.plane.y);
  caseStats.flightRangeM=Math.max(caseStats.flightRangeM,Math.hypot(s.plane.x,s.plane.z));
  caseStats.sunMinDeg=Math.min(caseStats.sunMinDeg,s.sun.alt*rad);
  caseStats.turns=Math.max(caseStats.turns,s.wheel.turns);
  caseStats.rpm=Math.max(caseStats.rpm,s.wheel.omega*60/(2*Math.PI));
}
function stats(){return {newBeads:0,maxAir:0,maxBellDeg:0,stripDeg:0,fabricCm:0,curtainCm:0,leafDeg:0,waterMm:0,hoistCm:0,waterTravelCm:0,flightHeightM:0,flightRangeM:0,sunMinDeg:90,turns:0,rpm:0};}
for(const [label,power] of [['idle',0],['gentle',.65],['strong',4.6],['cycle',3.7]]){
  const g=create(seed),out=stats(),events={},beg=g.getState();
  let queue=[],delaySamples=[],lastBurst=0,prev=beg,releaseRing=0,tailAt7=0,stageHits=[0,0,0],chord=null,firstSound=null,sequence=[],transitions=[];
  observe(label,beg,null,out);
  for(let i=1;i<=(label==='cycle'?5000:200);i++){
    const id=[0,1,3,5,6,7,8][prev.stage];
    if(power&&(label==='cycle'||i<=120))g.touch(id,power);else g.release();
    g.step(dt);const s=g.getState();observe(label,s,prev,out);
    const burst=s.sparks.length?Math.floor(s.sparks.at(-1).id/64):lastBurst;
    if(burst>lastBurst){queue.push(i*dt);lastBurst=burst;}
    for(const e of g.drain()){if(e.type==='firework')delaySamples.push(i*dt-queue.shift());events[e.type]=(events[e.type]||0)+1;if(e.type==='chime'&&firstSound===null)firstSound=i*dt;}
    if(i===120)releaseRing=s.bells[0].ring;if(i===140)tailAt7=s.bells[0].ring;
    if(prev.stage!==s.stage){
      sequence.push(s.stage);transitions.push(Number(s.elapsed.toFixed(2)));
      if(s.stage===1)stageHits=s.bells.map(b=>b.hits);
      if(s.stage===2)chord=s.bells.map((b,i)=>b.hits-stageHits[i]);
    }
    prev=s;if(s.season)break;
  }
  Object.assign(out,{endSeconds:prev.elapsed,events,hits:prev.bells.map(b=>b.hits),firstSound,ringAt6:releaseRing,ringAt7:tailAt7,
    ringAt10:label==='cycle'?null:prev.bells[0].ring,windAt10:label==='cycle'?null:prev.air[0].u,
    firstMoteTravelCm:100*(prev.dust[0].x-beg.dust[0].x+10*(prev.dust[0].generation||0)),impacts:prev.drip.impacts});
  if(label==='cycle'){
    assert.deepEqual(sequence,[1,2,3,4,5,6,0]);assert(chord.every(n=>n>0));assert(out.flightRangeM>4);
    assert.equal(prev.plane.flying,false);assert.equal(prev.season,1);
    assert(delaySamples.every(d=>Number.isFinite(d)&&d>=.55&&d<=1.3));
    Object.assign(out,{chordHits:chord,sequence,transitions,fireworkDelaySeconds:delaySamples});
  }
  checks[label]=out;
}
assert.equal(checks.idle.hits[0],0);
assert(checks.idle.firstMoteTravelCm>1 && checks.idle.waterMm>.5 && checks.idle.impacts>1);
assert.equal(checks.gentle.hits[0],0);assert(checks.strong.hits[0]>8);
assert(checks.strong.maxBellDeg>checks.gentle.maxBellDeg*2);
assert(checks.strong.ringAt7>checks.strong.ringAt10 && checks.strong.ringAt10>0);
assert(checks.cycle.events.firework>=4);assert(checks.cycle.leafDeg>80);
for(const k of Object.keys(changes)){assert(changes[k]>200);assert.equal(uniform[k]||0,0,k+' common-mode step');}
// Per-sample bounds in the original units, including strikes and the landing contact.
for(const [k,bound] of Object.entries({wind_m_s:.95,bell_rad:.16,tongue_rad:1.18,strip_rad:.11,cloth_m:.080,leaf_rad:.51,water_m:.008,
  petal_m:.012,hoist_m:.006,sun_rad:.012,plane_step_m:.18,spark_step_m:.13,pollen_x_m:.04})){
  assert(peaks[k]<=bound,k+' step '+peaks[k]+' > '+bound);
}
const blocked=create(seed);assert.equal(blocked.touch(7,5),false);assert.equal(blocked.read().input,null);
const slow=create(seed),fast=create(seed);slow.step(10);for(let i=0;i<1200;i++)fast.step(1/120);assert.deepEqual(slow.getState(),fast.getState());
const copy=slow.getState();copy.bells[0].angle=9;assert.notEqual(slow.read().bells[0].angle,9);
// Inspect the frequencies actually assigned by the synthesizer, without speakers or a browser.
const frequencies=[];
class AudioRecorder {
  constructor(){this.sampleRate=16000;this.currentTime=0;this.state='running';this.destination=this.node();}
  param(){return {value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}};}
  node(){return {connect(){},disconnect(){},start(){},stop(){},gain:this.param(),frequency:this.param(),Q:this.param(),pan:this.param()};}
  createGain(){return this.node();}createStereoPanner(){return this.node();}createBiquadFilter(){return this.node();}
  createDynamicsCompressor(){return {...this.node(),threshold:this.param(),ratio:this.param()};}
  createConvolver(){return this.node();}createBufferSource(){return this.node();}
  createBuffer(ch,n){return {getChannelData:()=>new Float32Array(n)};}
  createOscillator(){const node=this.node();node.start=()=>frequencies.push(node.frequency.value);return node;}
}
const sound=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../audio.js'),'utf8')+';makeSound()',{window:{AudioContext:AudioRecorder}});
sound.wake();const tonesHz=[];
for(let i=0;i<3;i++){frequencies.length=0;sound.event({type:'chime',i,energy:.4});tonesHz.push([...frequencies]);}
assert.deepEqual(tonesHz.map(a=>a[0]),[1346,882,1062]);
const tap=create(seed);tap.touch(0,3.4);tap.step(.05);tap.release();tap.step(2);assert(tap.read().bells[0].hits>0);
const capped=create(seed);capped.touch(0,7);capped.step(3);assert.equal(capped.read().input.strength,5);assert(capped.read().air.every(a=>a.u<=5));
const results={sample_seconds:dt,samples:trace.length,synthesizer_frequencies_Hz:tonesHz,checks,largest_adjacent_steps:peaks,moving_samples:changes,identical_moving_samples:uniform};
fs.writeFileSync(path.join(__dirname,'state-trace.csv.gz'),gzipSync([headers.join(','),...trace].join('\n')+'\n',{level:9}));
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
