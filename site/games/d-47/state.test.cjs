'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createGzip}=require('node:zlib');
const {finished}=require('node:stream/promises');
const {create}=require('./physics.js');
const dt=.05, maximum={dent:0,wave:0,corner:0,wet:0,heat:0,mass:0,rod:0,wind:0,particle:0,water:0,travel:0,turn:0,fold:0,tuck:0,stow:0},
  uniform={dent:0,wave:0,corner:0,wet:0,heat:0},round=n=>Number(n.toFixed(6));
const range=a=>Math.max(...a)-Math.min(...a);
const absmax=a=>Math.max(...a.map(Math.abs));
const out=fs.createWriteStream(path.join(__dirname,'state-trace.ndjson.gz'));
const zip=createGzip({level:6});zip.pipe(out);
const columns=['dent','wave','corner','wet','heat','mass'];
const result={};
let rows=0;
async function record(name,s,prev){
  const cells=s.cells.map(c=>columns.map(k=>round(c[k]))),wind=s.zones.map(z=>round(z.wind)),rod=s.rods.map(r=>round(r.bend));
  const particles=s.particles.map(p=>[p.id,round(p.x),round(p.y),round(p.z),round(p.alpha)]);
  const row={run:name,seconds:round(s.time),phase:s.phase,cells,wind,rod,water:s.water.map(p=>round(p.height)),particles,meanWet:round(s.meanWet),
    kg:round(s.meanMass),bat:round(s.bat),chime:round(s.chime),paper:round(s.paper),rotor:round(s.rotor),
    travel:round(s.travel),turn:round(s.turn),fold:round(s.fold),tuck:round(s.tuck),stow:round(s.stow)};
  if(prev){
    assert.ok(Math.abs(row.seconds-prev.seconds-dt)<1e-8);
    for(let k=0;k<columns.length;k++){
      const key=columns[k],delta=cells.map((c,i)=>c[k]-prev.cells[i][k]);
      maximum[key]=Math.max(maximum[key],absmax(delta));
      if(key in uniform&&absmax(delta)>2e-6&&range(delta)<1e-7)uniform[key]++;
    }
    for(const key of ['wind','rod','water'])maximum[key]=Math.max(maximum[key],absmax(row[key].map((x,i)=>x-prev[key][i])));
    for(const k of ['travel','turn','fold','tuck','stow'])maximum[k]=Math.max(maximum[k],Math.abs(row[k]-prev[k]));
    const old=new Map(prev.particles.map(p=>[p[0],p]));
    for(const p of particles){if(old.has(p[0])){const a=old.get(p[0]);maximum.particle=Math.max(maximum.particle,Math.hypot(p[1]-a[1],p[2]-a[2],p[3]-a[3]));}}
  }
  assert.ok(cells.every(c=>c.every(Number.isFinite)));
  rows++;if(!zip.write(JSON.stringify(row)+'\n'))await new Promise(resolve=>zip.once('drain',resolve));
  return row;
}
async function idle(){
  const m=create(),s=m.state,first=m.getState(),p=first.particles.find(q=>q.life-q.age>10.1);let prev=await record('idle',s);
  for(let j=0;j<200;j++){m.step(dt);prev=await record('idle',s,prev);}
  const after=s.particles.find(x=>x.id===p.id),drift=Math.hypot(after.x-p.x,after.y-p.y,after.z-p.z);
  result.idle={seconds:s.time,drift,windSpread:range(s.zones.map(z=>z.wind)),waterSpread:range(s.water.map(p=>p.height)),chime:s.chime,rotor:s.rotor,sail:s.sailX-first.sailX};
  assert.ok(drift>.1&&Math.abs(s.chime)>.005&&s.rotor>1&&s.phase==='beat');assert.ok(s.cells.every(c=>c.wet===.25));
}
async function blow(speed){
  const m=create(),s=m.state;let prev=await record('strike-'+speed,s),peak=0,footprint=0;
  assert.ok(m.hit(.45,.5,speed));const sound={...s.hitSound};
  for(let j=0;j<44;j++){m.step(dt);prev=await record('strike-'+speed,s,prev);peak=Math.max(peak,...s.cells.map(c=>c.dent));
    if(j===0)footprint=s.cells.filter(c=>c.dent>.001).length;}
  assert.ok(footprint>0&&footprint<108);assert.ok(s.cells.every(c=>c.dent<.0005));
  return {speed,peak,grains:sound.grains,footprint,hz:sound.frequency,duration:sound.duration};
}
async function breeze(wet){
  const m=create(),s=m.state;s.phase='collect';s.travel=1;s.turn=1;
  // Two otherwise identical supported quilts receive the same local gust.
  for(const c of s.cells){c.wet=wet;c.heat=15;}
  m.step(3);let prev=await record('gust-'+wet,s),start=s.cells[101].wave,peak=0;
  m.act('fan',.45,.98,3.8);
  for(let j=0;j<40;j++){m.step(dt);prev=await record('gust-'+wet,s,prev);peak=Math.max(peak,s.cells[101].wave-start);}
  return peak;
}
async function cycle(){
  const m=create(),s=m.state;let prev=await record('cycle',s),phases=[],last='',begin=0,turn=0,done=0,peakRod=0,hot=0,cold=0,stroke=null,initialSound=null;
  const kg=s.meanMass;let dryKg=0,light=0,firstLocal=0;
  for(let i=0;i<7200;i++){
    if(s.phase!==last){phases.push(s.phase);last=s.phase;}
    if(s.phase==='beat'&&i%12===0){m.hit(.45,.5,2);initialSound={...s.hitSound};}
    if(s.phase==='lift'&&s.age>1)m.act('hang');
    if(s.phase==='air'&&!begin)begin=s.time;
    if(s.phase==='air'&&i%113===0)m.act('fan',.7,.85,2.5);
    if(s.phase==='turn'&&s.age>1){turn=s.time;firstLocal=range(s.cells.map(c=>c.wet));m.act('turn');}
    if(s.phase==='collect'&&!stroke){done=s.time;dryKg=s.meanMass;light=s.dayLight;m.hit(.45,.5,2);stroke={...s.hitSound};hot=Math.max(...s.cells.map(c=>c.heat));cold=Math.min(...s.cells.map(c=>c.heat));}
    if(s.phase==='collect'&&s.age>1)m.act('collect');
    if(s.phase==='fold'&&s.age>.7)m.act('fold');
    if(s.phase==='store'&&s.age>.6)m.act('store');
    m.step(dt);prev=await record('cycle',s,prev);peakRod=Math.max(peakRod,...s.rods.map(r=>r.bend));
    if(s.day===1)break;
  }
  assert.equal(s.day,1);assert.equal(s.phase,'beat');assert.ok(s.cells.every(c=>c.wet===.25));
  assert.deepEqual(phases,['beat','lift','hanging','air','turn','turning','sun','collect','returning','fold','store','stowing','rest','dawn']);
  assert.ok(firstLocal>.02&&dryKg<kg&&done-begin>60);
  assert.ok(stroke.frequency>initialSound.frequency&&stroke.duration<initialSound.duration);
  result.cycle={begin,turn,done,day:s.time,kg,dryKg,peakRod,hot,cold,firstLocal,light,
    wetHz:initialSound.frequency,dryHz:stroke.frequency,wetTail:initialSound.duration,dryTail:stroke.duration};
}
(async()=>{
  zip.write(JSON.stringify({sampleSeconds:dt,grid:[12,9],cellColumns:columns,particleColumns:['id','x','y','z','opacity']})+'\n');
  await idle();result.slow=await blow(1);result.fast=await blow(4);
  assert.ok(result.fast.peak>result.slow.peak*2.9);assert.ok(result.fast.grains>result.slow.grains);
  result.wetGust=await breeze(.25);result.dryGust=await breeze(.05);assert.ok(result.dryGust>result.wetGust);
  await cycle();
  assert.ok(maximum.dent<.12&&maximum.wave<.06&&maximum.wet<.005&&maximum.corner<.025&&maximum.rod<.004&&maximum.particle<.14&&maximum.water<.006&&maximum.fold<.09&&maximum.tuck<.09&&maximum.stow<.06,JSON.stringify(maximum));
  assert.ok(Object.values(uniform).every(n=>n===0));
  zip.end();await finished(out);
  console.log(JSON.stringify({rows,result,maximum,uniform},null,2));
})().catch(err=>{zip.destroy();out.destroy();console.error(err);process.exitCode=1;});
