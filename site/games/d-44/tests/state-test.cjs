'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {create,parcels,destinations}=require('../simulation.js');
const dt=.05, n=x=>Number(x.toFixed(6)),max=a=>Math.max(...a),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const lines=[],results={interval_s:dt},maximum={},unitTests={},banks={};
function sample(s){
 return {time:n(s.time),cycle:s.cycle,phase:s.phase,box:s.box,index:s.index,
  dust:s.dust.map(p=>[p.x,p.y,p.z]),air:s.wind.map(w=>w.x),cloth:s.cloth.map(c=>c.x),sea:s.swell.map(c=>c.x),boat:[s.ferry.x,s.boatRock.x],chime:s.chimes.map(c=>c.x),
  tape:s.boxes.map(b=>({pull:b.pull,hz:b.pitch,bond:b.cells.map(c=>c.bond),lift:b.cells.map(c=>c.lift.x),slip:b.slip.x,panels:b.panels.map(p=>p.x),flaps:b.flaps.map(c=>c.x),slide:b.slide.x})),
  item:s.items.map(o=>[o.x,o.y,o.z,o.tilt.x]),modes:s.items.map(o=>o.mode),reeds:s.reed.map(r=>r.x),bird:s.bird.x,door:s.door.x,dial:s.dial.x,
  drops:s.drops.map(d=>[d.y,d.water,d.delay]),leaf:s.leaves.map(l=>[l.x,l.water]),wave:s.ripples.map(r=>r.x),echo:s.echo.x,
  evening:s.evening.x,heat:s.heat.x,street:s.street.map(l=>l.x),camera:s.camera.x,fade:s.fade.x};
}
function record(label,s,events=[]){const a=sample(s);lines.push(JSON.stringify({run:label,...a,events},(k,v)=>typeof v==='number'?n(v):v));return a;}
function difference(key,a,b,limit){const delta=Math.abs(a-b);assert(Number.isFinite(delta),key);maximum[key]=Math.max(maximum[key]||0,delta);assert(delta<limit,key+' adjacent delta '+delta+' >= '+limit);}
function checkBank(name,before,after){
 const changes=after.map((x,i)=>x-before[i]),peak=max(changes.map(Math.abs));
 if(peak<.00001)return;
 const tally=banks[name]||(banks[name]={moving:0,uniform:0});
 tally.moving++;
 if(max(changes)-Math.min(...changes)<.000001)tally.uniform++;
}
function compare(a,b){
 if(a.cycle!==b.cycle){assert(a.fade>.99&&b.fade>.99);return;}
 for(const key of ['air','cloth','sea','chime','reeds','wave','street'])checkBank(key,a[key],b[key]);
 checkBank('leaves',a.leaf.map(v=>v[0]),b.leaf.map(v=>v[0]));
 a.tape.forEach((v,i)=>{for(const key of ['flaps','panels','lift','bond'])checkBank(key,v[key],b.tape[i][key]);});
 for(let i=0;i<a.dust.length;i++)difference('dust_m',distance(a.dust[i],b.dust[i]),0,.025);
 for(let i=0;i<a.cloth.length;i++)difference('cloth_m',a.cloth[i],b.cloth[i],.010);
 for(let i=0;i<a.sea.length;i++)difference('sea_m',a.sea[i],b.sea[i],.025);
 a.tape.forEach((t,i)=>{const v=b.tape[i];difference('peel_m',t.pull,v.pull,.02001);
  t.lift.forEach((z,j)=>{difference('lift_m',z,v.lift[j],.042);assert(v.bond[j]<=t.bond[j]+1e-12);});
  t.flaps.forEach((z,j)=>difference('flap_rad',z,v.flaps[j],.38));t.panels.forEach((z,j)=>difference('panel_rad',z,v.panels[j],.30));
 });
 for(let i=0;i<a.item.length;i++){difference('item_m',distance(a.item[i].slice(0,3),b.item[i].slice(0,3)),0,.31);}
 a.reeds.forEach((x,i)=>difference('reed_rad',x,b.reeds[i],.14));
 difference('dial_rad',a.dial,b.dial,.35);difference('door_m',a.door,b.door,.05);difference('echo_s',a.echo,b.echo,.008);
 a.leaf.forEach((v,i)=>difference('leaf_rad',v[0],b.leaf[i][0],.20));a.wave.forEach((v,i)=>difference('ripple_m',v,b.wave[i],.055));
 for(let i=0;i<a.drops.length;i++){let p=a.drops[i],q=b.drops[i];if(p[1]>.1&&q[1]>.1&&p[2]<=0&&q[2]<=0)difference('falling_drop_m',p[0],q[0],.36);}
 difference('heat',a.heat,b.heat,.06);difference('evening',a.evening,b.evening,.035);difference('street',a.street[0],b.street[0],.04);
}
function distinct(v){return new Set(v.map(n)).size;}
{
 const g=create(),a=record('idle',g.read());let prev=a,changed=0,uniform=0;
 for(let i=0;i<200;i++){g.step(dt);let b=record('idle',g.read());compare(prev,b);let shift=b.dust.map((p,j)=>distance(p,prev.dust[j]));if(max(shift)>.000001){changed++;if(distinct(shift)===1)uniform++;}prev=b;}
 const b=prev;assert.equal(b.phase,'tape');assert.equal(b.tape[0].pull,0);assert(b.tape[0].bond.every(x=>x===1));assert.equal(uniform,0);
 results.idle={dust_max_displacement_m:n(max(b.dust.map((p,j)=>distance(p,a.dust[j])))),cloth_max_displacement_m:n(max(b.cloth.map((v,i)=>Math.abs(v-a.cloth[i])))),sea_max_displacement_m:n(max(b.sea.map((v,i)=>Math.abs(v-a.sea[i])))),ferry_m:n(b.boat[0]-a.boat[0]),spatially_uniform_intervals:uniform,moving_intervals:changed};
 assert(results.idle.dust_max_displacement_m>.05);
}
for(const speed of [.05,.4]){
 const g=create();g.grab('box',0);let prev=record('peel-'+speed,g.read()),middle,done=0,different=0,moving=0,lastLift=0,residual=0,maxLift=0;
 for(let j=1;j<=Math.ceil((parcels[0].d/speed+1.5)/dt);j++){g.tug(speed*dt,speed);g.step(dt);let b=record('peel-'+speed,g.read(),g.events());
  compare(prev,b);let v=b.tape[0].lift.map((x,i)=>x-prev.tape[0].lift[i]);if(max(v.map(Math.abs))>1e-6){moving++;if(distinct(v)>1)different++;}
  maxLift=Math.max(maxLift,...b.tape[0].lift);if(!middle&&b.tape[0].pull>=parcels[0].d*.5-1e-8)middle=b;
  if(!done&&b.phase==='flaps'){done=b.time;lastLift=b.tape[0].lift[25];}
  if(done&&Math.abs(b.time-done-.25)<.0001)residual=b.tape[0].lift[25]-lastLift;prev=b;
 }
 assert(done&&different===moving);results['speed_'+speed]={speed_m_s:speed,pitch_Hz:middle.tape[0].hz,open_ready_s:done,peak_lift_m:n(maxLift),lift_change_after_release_025s_m:n(residual),uniform_intervals:moving-different};
}
assert(results['speed_0.4'].pitch_Hz>results['speed_0.05'].pitch_Hz);
{
 const g=create(),seq=[],impacts=[],echo=[],releases=[];let prev=record('play',g.read()),last='',peaks={leaf:0,wave:0,door:0,heat:0,evening:0,water:0,bird:0,open:0,fold:0,chime:0,street:0},firstFoot=-1;
 for(let j=1;j<5800;j++){
  const s=g.read(),p=s.phase;
  if(last!==p){seq.push(p);last=p;}
  // Follow each new object's demonstration before the first action in that phase.
  if(s.phaseAge>4.35){
   if(p==='tape')g.tug(dt*.32,.32);
   if(p==='flaps')g.grab('box',s.box);
   if(p==='item'&&s.phaseAge>.95){const i=s.index;g.grab('item',i);g.dragItem(s.items[i].x+.07,s.items[i].y+.09,s.items[i].z+.018);let pos=destinations[i];g.release(pos[0]+.14,pos[2]-.08);}
   if(p==='song'&&j%10===0)g.grab('reed',s.played.indexOf(false));
   if(p==='walk'){g.grab('foot',s.walk);if(firstFoot<0)firstFoot=s.time;}
   if(p==='tune'){g.grab('dial');g.turn(.07);g.release();}
   if(p==='water'&&j%18===0)g.grab('leaf',(s.watered*3+1)%11);
   if(p==='lamp'||p==='night'&&s.lanternTouch<3&&s.idle>4.35)g.grab('lamp');
  }
  g.step(dt);let s2=g.read(),ev=g.events(),b=record('play',s2,ev);compare(prev,b);
  for(let e of ev){if(e.type==='thud'){impacts.push(e.value);echo.push(b.echo);}if(e.type==='step')releases.push(n(b.time-firstFoot));}
  peaks.fold=Math.max(peaks.fold,...b.tape.flatMap(t=>t.panels));
  peaks.open=Math.max(peaks.open,...s2.boxes.filter(t=>!t.empty).flatMap(t=>t.flaps.map(l=>l.x)));
  peaks.chime=Math.max(peaks.chime,...b.chime.map(Math.abs));peaks.street=Math.max(peaks.street,...b.street);
  peaks.leaf=Math.max(peaks.leaf,...b.leaf.map(v=>Math.abs(v[0])));peaks.wave=Math.max(peaks.wave,...b.wave);peaks.bird=Math.max(peaks.bird,Math.abs(b.bird));peaks.door=Math.max(peaks.door,b.door);peaks.water=Math.max(peaks.water,...b.leaf.map(v=>v[1]));peaks.heat=Math.max(peaks.heat,b.heat);peaks.evening=Math.max(peaks.evening,b.evening);prev=b;
  if(s2.cycle===1){results.cycle={duration_s:n(j*dt),phases:seq,masses_kg:impacts,echo_at_impact_s:echo.map(n),footfalls_s:releases,peaks};break;}
 }
 assert(results.cycle,'flow stuck in '+g.read().phase);assert.equal(impacts.length,7);assert.equal(releases.length,5);assert.equal(g.read().phase,'tape');assert.equal(g.read().cycle,1);
}
// One drag, then release. Elastic recovery must continue once the adhesive front stops.
{
 const g=create();for(let i=0;i<40;i++){g.tug(.012,.24);g.step(dt);}g.release();let a=g.getState();g.step(.25);let b=g.getState(),v=a.boxes[0].cells.map((c,i)=>Math.abs(c.lift.x-b.boxes[0].cells[i].lift.x));
 assert.equal(a.boxes[0].pull,b.boxes[0].pull);assert(max(v)>.001);unitTests.release_recovery_m=n(max(v));
}
// Off-target touch, time partitioning and two distinct landing positions.
{let a=create(),b=create();a.grab('box',2);a.step(.05);assert.equal(a.read().phase,'tape');assert.equal(a.read().boxes[0].pull,0);assert(a.read().boxes[2].wobble.x>0);
 a=create();a.step(1);for(let i=0;i<20;i++)b.step(dt);assert.deepEqual(a.getState(),b.getState());}
function landing(delta){let g=create();g.tug(.97,.4);g.step(3);g.grab('box');g.step(3);g.grab('item',0);let [x,,z]=destinations[0];g.release(x+delta,z+delta);g.step(6);return g.getState();}
{let a=landing(-.3),b=landing(.3);assert(a.items[0].mode==='placed');let d=Math.hypot(a.items[0].x-b.items[0].x,a.items[0].z-b.items[0].z);assert(d>.1);let e=Math.abs(a.echo.x-b.echo.x);assert(e>.0001);unitTests.drop_separation_m=n(d);unitTests.echo_difference_s=n(e);}
for(const [name,tally] of Object.entries(banks))assert.equal(tally.uniform,0,name+' moved every section by the same amount');
results.section_checks=banks;
results.adjacent_max=Object.fromEntries(Object.entries(maximum).map(([k,v])=>[k,n(v)]));results.checks=unitTests;results.samples=lines.length;
fs.writeFileSync(path.join(__dirname,'state-trace.jsonl.gz'),zlib.gzipSync(lines.join('\n')+'\n',{level:6}));
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
