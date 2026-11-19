'use strict'
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const zlib=require('node:zlib')
const {create,holes,PITCH,SNAP,types}=require('../simulation.js')
const dt=.05,deg=180/Math.PI,mm=1000
const trace=[],max={},measures={},uniform={}
const metadata={interval_s:dt,units:{position:'m',velocity:'m/s',angle:'rad',heat:'degC',wet:'fraction',fill:'fraction',light:'fraction',temperature:'degC'},grid:[8,6],pitch_m:PITCH,capture_radius_m:SNAP,
  columns:{cells:['placed','height','velocity','heat','wet','light','film','material'],air:['wind','angle','velocity'],dust:['x','y','z','vx','vy','vz'],chimes:['angle','velocity'],water:['h','v'],lanterns:['temperature','energy'],drips:['id','x','y','z','vy'],hand:['x','y','z','vx','vy','vz','snapId','type']}}
function rows(list,keys){return list.map(item=>keys.map(k=>typeof item[k]==='number'?+item[k].toFixed(8):item[k]))}
function sample(g,run,t) {
  const s=g.read(),cc=metadata.columns
  trace.push(JSON.stringify({run,t:+t.toFixed(2),room:s.stage,cycle:s.cycle,material:s.material,door:s.door,doorV:s.doorV,travel:s.travel,
    hand:s.hand?rows([s.hand],cc.hand)[0]:null,guide:s.guide,sourceLift:s.sourceLift,drawers:s.drawers.map(v=>v.angle),
    cells:rows(s.cells,cc.cells),seams:s.seams.map(v=>+v.fill.toFixed(8)),air:rows(s.pressure,cc.air),dust:rows(s.dust,cc.dust),
    chimes:rows(s.chimes,cc.chimes),spout:s.spout,water:rows(s.water,cc.water),petals:s.lanterns.map(l=>rows(l.petals,['angle','velocity'])),drips:rows(s.drips,cc.drips),lanterns:rows(s.lanterns,cc.lanterns)}))
}
function maximum(key,...values){max[key]=Math.max(max[key]||0,...values.map(Math.abs))}
function delta(a,b,key){return b.map((c,i)=>c[key]-a[i][key])}
function unequal(key,diff){
  const lo=Math.min(...diff),hi=Math.max(...diff)
  if(Math.max(Math.abs(lo),Math.abs(hi))<1e-10)return
  uniform[key]??={changing:0,identical:0};uniform[key].changing++
  if(hi-lo<1e-10)uniform[key].identical++
}
function audit(a,b) {
  // A room crossing creates new physical components; match IDs only inside a room.
  if(a.stage!==b.stage||a.cycle!==b.cycle)return
  for(const [label,array,key,unit] of [
    ['floor_mm','cells','height',mm],['temperature_C','cells','heat',1],['wet_pp','cells','wet',100],['light_pp','cells','light',100],
    ['seam_pp','seams','fill',100],['leaf_deg','pressure','angle',deg],['chime_deg','chimes','angle',deg],
    ['ripple_mm','water','h',mm],['lantern_C','lanterns','temperature',1]
  ]){
    const diff=delta(a[array],b[array],key).map(v=>v*unit)
    maximum(label,...diff);unequal(label,diff)
  }
  maximum('door_deg',(b.door-a.door)*deg);maximum('spout_deg',(b.spout-a.spout)*deg)
  const dust=b.dust.map((v,i)=>dist(v,a.dust[i])*mm)
  maximum('dust_mm',...dust);unequal('dust_mm',dust)
  const petals=b.lanterns.flatMap((lamp,i)=>delta(a.lanterns[i].petals,lamp.petals,'angle').map(v=>v*deg))
  maximum('petal_deg',...petals);unequal('petal_deg',petals)
  for(const q of b.drips){const old=a.drips.find(o=>o.id===q.id);if(old)maximum('drop_mm',dist(old,q)*mm)}

  if(a.hand&&b.hand)maximum('carry_mm',Math.hypot(b.hand.x-a.hand.x,b.hand.y-a.hand.y,b.hand.z-a.hand.z)*mm)
}
function recorder(g,run){
  let t=0,last=g.getState()
  sample(g,run,0)
  return (seconds,fn)=>{
    const count=Math.round(seconds/dt);assert.ok(Math.abs(count*dt-seconds)<1e-8)
    for(let i=0;i<count;i++){
      g.step(dt);t+=dt
      const now=g.getState();audit(last,now);sample(g,run,t);if(fn)fn(now,last,t);last=now
    }
  }
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)}
// Ten seconds with zero input. Guidance appears without altering the board.
{
  const g=create(),before=g.getState(),step=recorder(g,'idle')
  let peakLeaf=0,guideStart=null
  step(10,(s,_,t)=>{
    peakLeaf=Math.max(peakLeaf,...s.pressure.map(p=>Math.abs(p.angle)*deg))
    if(guideStart===null&&s.guide>0)guideStart=t
  })
  const after=g.getState()
  assert.equal(after.cells.filter(c=>!c.placed).length,6);assert.equal(after.hand,null)
  assert.ok(guideStart>=4&&guideStart<=4.051)
  const movement=after.dust.map((v,i)=>dist(v,before.dust[i])*mm)
  assert.ok(Math.min(...movement)>1 && Math.max(...movement)-Math.min(...movement)>5)
  measures.idle={dust_mm:[Math.min(...movement),Math.max(...movement)],peak_leaf_deg:peakLeaf,guide_s:guideStart,
    light_change_pp:[Math.min(...delta(before.cells,after.cells,'light'))*100,Math.max(...delta(before.cells,after.cells,'light'))*100]}
}
// Check both sides of the magnetic capture boundary with the same cell.
for(const offset of [.0499,.0501]){
  const g=create(),c=g.read().cells[holes[0][0]]
  g.pick('ceramic');g.move(c.x+offset,c.z);g.release();recorder(g,'radius-'+offset)(1.5)
  assert.equal(c.placed,offset<SNAP)
}
// Hold the room, random seed, socket, position, velocity and residual forces fixed.
// Use an identical incoming hand just outside the socket for all three specimens.
for(const type of types){
  const g=create(),id=holes[0][0],c=g.read().cells[id]
  g.pick('ceramic');Object.assign(g.read().hand,{type,x:c.x-.061,z:c.z,y:.047,vx:.19,vy:-.03,vz:0})
  g.move(c.x,c.z);g.release()
  const step=recorder(g,'material-'+type);let track=[],peakV=0,peakHeight=0,zero=null,landed=null
  step(2,(s,_,t)=>{
    if(!s.cells[id].placed)return
    if(landed===null)landed=t
    const a=s.cells[id];peakV=Math.max(peakV,Math.abs(a.velocity));peakHeight=Math.max(peakHeight,Math.abs(a.height)*mm)
    track.push(a.height)
    if(zero===null&&a.height===0&&a.velocity===0)zero=t-landed
  })
  assert.ok(c.placed);assert.ok(peakHeight>0);assert.ok(zero!==null)
  const click=g.drain().find(e=>e.type==='click');assert.equal(click.material,type)
  measures[type]={haptic_ms:click.hapticMs,peak_height_mm:peakHeight,peak_speed_mm_s:peakV*mm,rest_s:zero,click_Hz:click.frequencyHz,trajectory:track}
}
assert.notDeepEqual(measures.ceramic.trajectory,measures.wood.trajectory)
assert.notDeepEqual(measures.stone.trajectory,measures.wood.trajectory)
for(const type of types)delete measures[type].trajectory
// One continuous play-through, including each room's own playable mechanism.
{
  const g=create(),step=recorder(g,'journey')
  for(let stage=0;stage<4;stage++){
    const S=()=>g.read(),type=S().material
    if(stage===0){const before=g.getState();assert.equal(g.pick('stone'),false);step(.45);assert.equal(S().hand,null);assert.deepEqual(S().cells.map(c=>c.placed),before.cells.map(c=>c.placed))}
    let maxPetal=0,maxBell=0,maxWave=0,maxStream=0,maxSpout=0,maxLamp=0,drops=0,maxWet=0
    function observe(s){
      maxBell=Math.max(maxBell,...s.chimes.map(v=>Math.abs(v.angle)*deg));maxWave=Math.max(maxWave,...s.water.map(v=>Math.abs(v.h)*mm))
      maxStream=Math.max(maxStream,s.drips.length);maxSpout=Math.max(maxSpout,Math.abs(s.spout)*deg)
      maxPetal=Math.max(maxPetal,...s.lanterns.flatMap(l=>l.petals.map(p=>p.angle*deg)))
      maxLamp=Math.max(maxLamp,...s.lanterns.map(v=>v.temperature));maxWet=Math.max(maxWet,...s.cells.map(v=>v.wet))
      drops+=g.drain().filter(e=>e.type==='drop').length
    }
    if(stage===2){step(1,observe);assert.ok(maxWave>.01);g.tapFeature('spout');step(2.5,observe)}
    for(const id of holes[stage]){
      const c=S().cells[id];g.pick(type);g.move(c.x,c.z);g.release();step(1.35,observe);assert.ok(c.placed)
    }
    assert.equal(S().done,true)
    if(stage===1||stage===3){g.tapCell(0);step(.10,observe)}
    step(4.0,observe)
    assert.ok(S().seams.every(j=>j.fill===1));assert.ok(S().door>1.42)
    const temps=S().cells.map(c=>c.heat)
    measures['stage'+stage]={door_deg:S().door*deg,seams:S().seams.length,bell_deg:maxBell,wave_mm:maxWave,simultaneous_drops:maxStream,drops,max_spout_deg:maxSpout,
      wet_pp:maxWet*100,lamp_C:maxLamp,petal_deg:maxPetal,low_C:Math.min(...temps),high_C:Math.max(...temps)}
    if(stage===1)assert.ok(maxBell>3)
    if(stage===2)assert.ok(drops>0&&maxWave>.5&&maxWet>.01)
    if(stage===3)assert.ok(Math.max(...temps)>22&&maxLamp>30)
    if(stage!==3){g.tapFeature();step(2.35)}
    else {step(8.6)}
    assert.equal(S().stage,(stage+1)%4)
  }
  assert.equal(g.read().cycle,1);assert.equal(g.read().cells.filter(c=>!c.placed).length,6)
}
// Different external step sizes integrate to exactly the same 1/120 s trajectory.
{
  const a=create(),b=create();a.step(10);for(let i=0;i<200;i++)b.step(.05)
  assert.deepEqual(a.getState(),b.getState())
  const snapshot=b.getState();snapshot.cells[0].heat=-99;assert.notEqual(b.read().cells[0].heat,-99)
}
for(const [name,limit] of Object.entries({floor_mm:6,temperature_C:.13,wet_pp:9,light_pp:5,seam_pp:7,door_deg:6,leaf_deg:2,chime_deg:8,ripple_mm:9,lantern_C:2.3,dust_mm:2,spout_deg:7,carry_mm:70,petal_deg:5,drop_mm:110}))
  assert.ok(max[name]<limit,name+' exceeded continuity limit: '+max[name]+' >= '+limit)
for(const [name,stat] of Object.entries(uniform))assert.equal(stat.identical,0,'uniform '+name)
const out=path.join(__dirname,'state-trace.ndjson.gz')
fs.writeFileSync(out,zlib.gzipSync([JSON.stringify(metadata),...trace].join('\n')+'\n',{level:9}))
console.log(JSON.stringify({samples:trace.length,interval_s:dt,measures,max_per_step:max,uniform},(k,v)=>typeof v==='number'?Math.round(v*10000)/10000:v,2))
