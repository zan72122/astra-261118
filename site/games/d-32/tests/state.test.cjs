'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {create,LENGTH,STOPS}=require('../simulation.js');
const H=.05,deg=180/Math.PI,record=process.argv.includes('--record');
const rows=[],stats={},maxDelta={},events={},seen=new Set(),landings=[],uniform={};
let fields;
function snapshot(tag,s){
  const r={test:tag,time_s:s.time,mode:s.mode,phase:s.phase,held:s.held,lap:s.lap,stop:s.stop,distance_m:s.distance,speed_mps:s.speed,
    wheel_rad:s.wheel,mass_kg:s.mass,volume_m3:s.volume,arm:s.arm.x,grip:s.grip.x,pressure:s.pressure,bed_rad:s.bed.x,bridge_rad:s.bridge.x,
    valve:s.valve.x,lever:s.lever.x,belt_mps:s.belt.x,belt_m:s.beltTravel,boat_m:s.boat,boat_mps:s.boatV,can_rad:s.can.x,can_x_m:s.canX.x,
    wave_rad:s.wave.x,finger:s.finger.x,nudge_rad:s.nudge.x,town_growth:s.townBlooms.x};
  for(const [name,col] of [['spring_m',s.springs],['wind_mps',s.wind],['leaf_rad',s.leaves],['water_m',s.water],['flower',s.flowers]])
    col.forEach((v,i)=>{r[name+i]=v.x;r[name+i+'_v']=v.v;});
  s.soil.forEach((v,i)=>{r['soil_L'+i]=v;r['surface_L'+i]=s.puddles[i];});
  for(const [name,col,keys] of [['bag',s.bags,['id','mode','x','y','z','vx','vy']],['mote',s.dust,['x','y','vx','vy']],['drop',s.drips,['id','live','x','y','z','vx','vy','vz']]]){
    col.forEach((d,i)=>{for(const k of keys)r[name+i+'_'+k]=d[k];});
  }
  s.bags.forEach((b,i)=>{r['squash'+i]=b.squash.x;});
  if(!fields)fields=Object.keys(r);
  if(record)rows.push(fields.map(f=>typeof r[f]==='number'?Number(r[f].toFixed(6)):r[f]).join(','));
}
function max(k,n){stats[k]=Math.max(stats[k]??-Infinity,n);}
function delta(k,n,bound){const a=Math.abs(n);maxDelta[k]=Math.max(maxDelta[k]||0,a);assert.ok(a<=bound+1e-8,k+' adjacent '+a+' > '+bound);}
function different(k,ds){
  const moving=Math.max(...ds.map(Math.abs));if(moving<1e-8)return;
  const u=uniform[k]??={moving:0,identical:0};u.moving++;
  if(Math.max(...ds)-Math.min(...ds)<1e-10)u.identical++;
}
function check(p,s){
  assert.ok(s.speed>=0&&s.speed<=4);
  delta('travel_m',s.distance-p.distance,4*H);
  delta('speed_mps',s.speed-p.speed,.35);
  delta('arm_stroke',s.arm.x-p.arm.x,.12);
  delta('bed_deg',(s.bed.x-p.bed.x)*deg,2.1);
  delta('bridge_deg',(s.bridge.x-p.bridge.x)*deg,1.55);
  delta('can_deg',(s.can.x-p.can.x)*deg,4.8);
  delta('can_travel_m',s.canX.x-p.canX.x,.085);
  max('speed_mps',s.speed);max('pressure_pct',s.pressure*100);max('payload_kg',s.mass);max('payload_L',s.volume*1000);
  max('bed_deg',s.bed.x*deg);max('can_deg',s.can.x*deg);max('belt_mps',s.belt.x);
  max('drips_live',s.drips.filter(d=>d.live).length);
  for(const [key,col,prev,bound] of [
    ['spring_m',s.springs,p.springs,.031],['water_m',s.water,p.water,.006],['leaf_rad',s.leaves,p.leaves,.012],
    ['wind_mps',s.wind,p.wind,.031],['flower',s.flowers,p.flowers,.042]]){
    const ds=col.map((v,i)=>v.x-prev[i].x);different(key,ds);ds.forEach(d=>delta(key,d,bound));}
  const soils=s.soil.map((v,i)=>v-p.soil[i]);different('soil_L',soils);soils.forEach(d=>delta('soil_L',d,.036));
  const dust=s.dust.map((v,i)=>Math.hypot(v.x-p.dust[i].x,v.y-p.dust[i].y));different('mote_m',dust);dust.forEach(d=>delta('mote_m',d,.035));
  s.drips.forEach((d,i)=>{const prev=p.drips[i];if(d.id===prev.id&&prev.live)
    delta('droplet_m',Math.hypot(d.x-prev.x,d.y-prev.y,d.z-prev.z),.18);});
  s.bags.forEach((b,i)=>{const old=p.bags[i];
    if(b.id===old.id)delta('bag_m',Math.hypot(b.x-old.x,b.y-old.y,b.z-old.z),.28);
    if(b.mode==='gripped'||b.mode==='fall')max('bag_lift_m',b.y-.403);
    if(b.mode==='packed'&&old.mode==='fall')landings.push({time_s:s.time,kg:s.mass,litres:s.volume*1000});
    if(b.mode==='fall')max('fall_mps',-b.vy);
  });
  if(s.mass===57&&s.speed===0&&s.mode==='bridge')stats.loaded_springs_mm=s.springs.map(q=>q.x*1000);
  max('spring_max_mm',Math.max(...s.springs.map(q=>q.x))*1000);
  max('spring_spread_mm',(Math.max(...s.springs.map(q=>q.x))-Math.min(...s.springs.map(q=>q.x)))*1000);
}
function once(sim,tag){
  const p=sim.getState();sim.step(H);const s=sim.s;
  check(p,s);snapshot(tag,s);sim.drain().forEach(e=>{if(tag==='route')events[e.name]=(events[e.name]||0)+1;});return s;
}
const idle=create(),initial=idle.getState();snapshot('idle',idle.s);
for(let i=0;i<200;i++){const s=once(idle,'idle');if(s.finger.x>.05&&!stats.hint_s)stats.hint_s=s.time;}
assert.equal(idle.s.distance,0);assert.equal(idle.s.stop,0);
stats.idle_water_mm=Math.max(...idle.s.water.map((w,i)=>Math.abs(w.x-initial.water[i].x)))*1000;
stats.idle_leaf_deg=Math.max(...idle.s.leaves.map((w,i)=>Math.abs(w.x-initial.leaves[i].x)))*deg;
stats.idle_mote_m=Math.max(...idle.s.dust.map((d,i)=>Math.hypot(d.x-initial.dust[i].x,d.y-initial.dust[i].y)));
assert.ok(stats.idle_water_mm>1&&stats.idle_leaf_deg>.3&&stats.idle_mote_m>.03&&stats.hint_s>=4&&stats.hint_s<4.3);
function hold(seconds){
  const g=create();snapshot('hold'+seconds,g.s);g.press('truck');
  let atRelease;
  for(let i=0;i<120;i++){if(i===seconds/H){atRelease=g.getState();g.release();}once(g,'hold'+seconds);}
  assert.equal(g.s.speed,0);return {hold_s:seconds,release_mps:atRelease.speed,rest_m:g.s.distance,coast_m:g.s.distance-atRelease.distance};
}
stats.holds=[hold(1),hold(2)];assert.ok(stats.holds[1].rest_m>stats.holds[0].rest_m*3);
const pass=create();snapshot('route',pass.s);const routeMarks=[];
let breakGiven=false,resumeAt=0,stayedDown=false;
for(let i=0;i<9000;i++){
  const s=pass.s,action=pass.target();
  if(s.mode==='bridge'&&s.bridge.x<.54&&!breakGiven){pass.release();breakGiven=true;resumeAt=i+20;}
  if(s.held==='truck'&&s.stop<3&&STOPS[s.stop]+LENGTH*s.lap-s.distance<.011&&s.speed<.20){pass.release();stayedDown=true;}
  else if(action&&!s.held&&i>=resumeAt)assert.ok(pass.press(action));
  const prev=s.mode,lap=s.lap;once(pass,'route');seen.add(s.mode);
  if(s.lap!==lap)stats.first_lap_s=s.time;
  if(prev!==s.mode)routeMarks.push([+s.time.toFixed(2),s.mode,s.stop]);
  if(s.lap===1&&s.stop===1&&s.mode==='drive')break;
}
assert.equal(pass.s.lap,1);assert.equal(pass.s.stop,1);assert.ok(stayedDown&&breakGiven&&pass.s.planted);
assert.deepEqual([...seen].sort(),['drive','pickup','bridge','unload','garden'].sort());
assert.deepEqual(landings.slice(0,3).map(x=>x.kg),[18,41,57]);assert.equal(landings[3].kg,18);
assert.equal(events.thud,7);assert.ok(stats.drips_live>=2);
for(const [k,v] of Object.entries(uniform)){assert.ok(v.moving>0,k);assert.equal(v.identical,0,k+' moved uniformly');}
// A child can release short of the marker. The wrist compensates for the parked position.
const early=create();early.press('truck');early.step(2.7);early.release();early.step(1.2);
assert.equal(early.s.mode,'pickup');assert.ok(early.s.siteOffset>.05&&early.s.siteOffset<.88);
early.step(11);assert.equal(early.s.mass,18);
const empty=create();assert.equal(empty.press('wheel'),false);empty.step(10);assert.equal(empty.s.distance,0);
// Identical physical inputs give identical results across two common display frame rates.
const a=create(),b=create();a.press('truck');b.press('truck');
for(let i=0;i<240;i++)a.step(1/120);for(let i=0;i<60;i++)b.step(1/30);
assert.ok(Math.abs(a.s.distance-b.s.distance)<1e-9);
if(record)fs.writeFileSync(path.join(__dirname,'state-trace.csv.gz'),zlib.gzipSync(fields.join(',')+'\n'+rows.join('\n')+'\n',{level:9}));
console.log(JSON.stringify({dt_s:H,rows:record?rows.length:undefined,stats,maxDelta,uniform,landings,events,routeMarks},(k,v)=>typeof v==='number'?+v.toFixed(6):v,2));
