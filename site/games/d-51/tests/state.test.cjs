'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {createGame,layout}=require('../sim.js');
const dt=.05,round=x=>Math.round(x*1e6)/1e6;
const records=[],uniform={},maxDelta={},maxima={};
const score=(obj,k,x)=>{assert(Number.isFinite(x),k);obj[k]=Math.max(obj[k]??0,Math.abs(x))};
const prop=(p,k)=>p.map(a=>round(a[k]));
// Every array retains the same cell order. Birth/contact markers delimit separate trajectories.
function sample(s){return {time:round(s.time),chapter:s.chapter,round:s.round,phase:s.phase,hint:s.hint,
  coin:[s.coin.visible,...['x','y','z','angle','spin'].map(k=>round(s.coin[k]))],
  chute:[s.coin.chute,s.coin.dropSpeed,s.coin.strikes].map(round),
  coils:s.coils.map(c=>[c.angle,c.speed,c.elastic.x,c.button.x,c.glow,c.feed.x].map(round)),
  lamps:prop(s.lamps,'heat'),air:prop(s.gusts,'air'),leaves:s.leaves.map(l=>round(l.bend.x)),
  river:prop(s.river,'height'),dust:s.dust.map(p=>[p.x,p.y,p.z].map(round)),
  wet:prop(s.water,'depth'),ripples:s.water.map(w=>round(w.ripple.x)),
  rain:s.rain.map(d=>d.active?[d.x,d.y,d.z].map(round):null),
  rotor:[s.rotor.angle,s.rotor.speed].map(round),blades:s.rotor.flex.map(b=>round(b.x)),
  ribs:s.umbrella.ribs.map(r=>round(r.x)),load:s.umbrella.loads.map(round),beads:s.umbrella.beads.map(d=>d.free?[d.x,d.y,d.z].map(round):null),
  weather:[s.evening,s.rainRate,s.umbrella.open.x].map(round),
  mechanical:[s.cabinet.x,s.shutter.x,s.camera.x].map(round),
  items:[...s.keeps,s.item].filter(Boolean).map(p=>({type:p.type,mode:p.mode,mass:p.mass,contacts:p.contacts,
    xyz:[p.x,p.y,p.z].map(round),v:[p.vx,p.vy,p.vz].map(round),angle:round(p.angle),spin:round(p.spin),lay:round(p.lay.x),tilt:round(p.tilt.x)}))
}}
function compareCells(k,a,b){
  const d=a.map((v,i)=>v-b[i]);for(const x of d)score(maxDelta,k,x);
  if(Math.max(...d.map(Math.abs))>3e-6){const u=uniform[k]??={moving:0,uniform:0};u.moving++;
    if(Math.max(...d)-Math.min(...d)<1e-7)u.uniform++}
}
function audit(a,b){
  assert(Math.abs(a.time-b.time-dt)<1e-7);
  for(const k of ['lamps','air','leaves','river','wet','ripples','blades','ribs'])compareCells(k,a[k],b[k]);
  compareCells('coil',a.coils.map(c=>c[0]),b.coils.map(c=>c[0]));
  compareCells('stock',a.coils.map(c=>c[5]),b.coils.map(c=>c[5]));
  score(maxDelta,'rotor',a.rotor[0]-b.rotor[0]);score(maxDelta,'shutter',a.mechanical[1]-b.mechanical[1]);
  if(a.coin[0]&&b.coin[0])score(maxDelta,'coinPosition',Math.hypot(...a.coin.slice(1,4).map((n,i)=>n-b.coin[i+1])));
  a.dust.forEach((p,i)=>{const old=b.dust[i];if(p[0]>=old[0]&&p[1]>.03)score(maxDelta,'dustPosition',Math.hypot(...p.map((n,j)=>n-old[j])))});
  a.rain.forEach((p,i)=>{const old=b.rain[i];if(p&&old&&p[1]<=old[1])score(maxDelta,'rainPosition',Math.hypot(...p.map((v,j)=>v-old[j])))});
  for(const p of a.items){const old=b.items.find(q=>q.type===p.type);if(!old)continue;
    const distance=Math.hypot(...p.xyz.map((x,i)=>x-old.xyz[i]));score(maxDelta,'itemPosition',distance);
    score(maxDelta,'itemAngle',p.angle-old.angle);score(maxDelta,'itemLay',p.lay-old.lay);score(maxDelta,'itemSpeedChange',Math.hypot(...p.v.map((v,i)=>v-old.v[i])));
    assert(distance<.26,'continuous item flight and carry');assert(Math.abs(p.angle-old.angle)<1.6,'bounded angular displacement');
    if(p.mode==='play'&&p.type===2)score(maxima,'ballExcursion',p.xyz[0]-layout.bench[0])}
  assert(maxDelta.coil<.525,'one-turn motor velocity envelope');
}
function run(name,control,done,seed=8492){
  const g=createGame(seed),events=[],snapshots=[];let prev=sample(g.state);
  const inputs=[];const act=(kind,...args)=>{inputs.push([kind,...args]);assert(g.action(kind,...args),kind)};
  function log(data,ev){records.push(JSON.stringify({run:name,inputs:inputs.splice(0),events:ev,...data}));snapshots.push(data)}
  log(prev,[]);
  for(let n=1;n<=5000;n++){
    control(g,n,act);g.step(dt);const ev=g.events(),next=sample(g.state);audit(next,prev);log(next,ev);
    for(const e of ev){events.push({time:next.time,...e});if(e.kind==='impact')score(maxima,'impactSpeed',e.force)}
    for(const x of next.wet)score(maxima,'filmMm',x);
    score(maxima,'wheelSpeed',next.rotor[1]);score(maxima,'lamp',Math.max(...next.lamps));score(maxima,'rib',Math.max(...next.ribs));
    prev=next;if(done(g,n))return {g,snapshots,events}
  }
  throw Error('sequence did not finish: '+name)
}
const idle=run('idle',()=>{},(_,i)=>i===200);
assert.equal(idle.g.state.phase,'coin');assert(idle.g.state.hint>.99);
const firstHint=idle.snapshots.find(q=>q.hint>0).time;
const first=idle.snapshots[0],last=idle.snapshots.at(-1);
const change=(a,b)=>Math.max(...a.map((n,i)=>Math.abs(n-b[i])));
const idleFacts={hintStart_s:firstHint,windDifference_m_s:round(change(first.air,last.air)),leafDifference_rad:round(change(first.leaves,last.leaves)),
  dustTravel_m:round(Math.max(...last.dust.map((p,i)=>Math.hypot(...p.map((n,j)=>n-first.dust[i][j]))))),
  riverDifference_m:round(change(first.river,last.river))};
assert(idleFacts.dustTravel_m>.1&&idleFacts.leafDifference_rad>.03&&idleFacts.riverDifference_m>.001);
function choiceTest(choice){return run('button-'+choice,(g,n,act)=>{
  if(n===1)act('coinDown');if(n>1&&n<=7){const f=(n-1)/6;act('coinMove',layout.coin[0]+f*(layout.slot[0]-layout.coin[0]),layout.coin[1]+f*(layout.slot[1]-layout.coin[1]))}
  if(n===8)act('coinUp');if(g.state.phase==='choose')act('button',choice);
},(g)=>g.state.phase==='pickup'&&g.state.age>=1)}
const a=choiceTest(0),b=choiceTest(3);
const posAt=s=>s.snapshots.find(p=>p.phase==='pickup').items[0].xyz;
for(const [g,i] of [[a.g,0],[b.g,3]]){assert(Math.abs(g.state.coils[i].angle-2*Math.PI)<1e-8);assert(g.state.coils.every((c,j)=>j===i||c.angle===0));
  assert.equal(g.state.item.settled,true);assert(g.state.item.z<=.435);assert(Math.abs(g.state.item.vx)<.003)}
const va=a.snapshots.findIndex(p=>p.phase==='vend');
assert.deepEqual(a.snapshots.slice(0,va),b.snapshots.slice(0,va));
const motorDuration=round(a.snapshots.find(p=>p.phase==='drop').time-a.snapshots[va-1].time);
assert.equal(motorDuration,1.2);
const choices={coinChute_m:round(Math.max(...a.snapshots.map(s=>s.chute[0]))),coinImpact_m_s:a.events.filter(e=>e.kind==='coin').map(e=>round(e.force)),
  buttonTravel_m:round(Math.max(...a.snapshots.map(s=>Math.abs(s.coils[0][3])))),motor_s:motorDuration,angle_rad:round(a.g.state.coils[0].angle),mass_kg:[a.g.state.item.mass,b.g.state.item.mass],
  stopDifference_m:round(Math.abs(posAt(a)[0]-posAt(b)[0])),tone_Hz:[a,b].map(v=>v.events.find(e=>e.kind==='button').freq),
  contacts:[a,b].map(v=>v.g.state.item.contacts),peakImpact_J:[a,b].map(v=>round(.5*v.g.state.item.mass*Math.max(...v.events.filter(e=>e.kind==='impact').map(e=>e.force))**2))};
assert(choices.stopDifference_m>.04);assert(choices.peakImpact_J[1]>choices.peakImpact_J[0]);
let prevPhase='',prevChapter=-1,playedAt=-1;const phases=[],chapters=[],touchTimes=[];
const loop=run('street-cycle',(g,n,act)=>{
  const s=g.state;if(s.phase!==prevPhase||s.chapter!==prevChapter){phases.push([round(s.time),s.phase,s.chapter]);prevPhase=s.phase;prevChapter=s.chapter}
  if(s.phase==='coin'){const age=s.age;if(age>[5,13,15,12][s.chapter])act('insert');
    else if(s.chapter>0&&age>1.2&&Math.floor(age*2)!==playedAt){playedAt=Math.floor(age*2);if(playedAt%5===0)act('oldPlay',s.chapter-1,playedAt%3?-1:1.3)}}
  if(s.phase==='choose'&&s.age>.8){chapters.push(s.chapter);act('button',[1,6,3,4][s.chapter])}
  if(s.phase==='pickup'&&s.age>1.1)act('collect');
  if(s.phase==='play'&&s.age<12){const q=Math.floor(s.age*2);if(q!==playedAt){playedAt=q;if(q%4===1){act('play',q%3?1.15:-1.3,.15);touchTimes.push(round(s.time))}}}
},g=>g.state.round===1);
assert(loop.events.some(e=>e.from==='hem'));assert.deepEqual(chapters,[0,1,2,3]);assert.equal(loop.g.state.phase,'coin');assert(loop.events.some(e=>e.kind==='drip'));
assert(maxima.wheelSpeed>2&&maxima.filmMm>.04&&maxima.ballExcursion>.30);
assert(loop.snapshots.some(s=>s.items.length===4));
for(const k of ['lamps','air','river','leaves','wet','ripples','ribs','blades','coil','stock'])assert(uniform[k]?.moving>0&&uniform[k].uniform===0,'nonuniform local changes: '+k);
const activeRibs=loop.snapshots.filter(s=>s.chapter===3&&s.phase==='play');
const report={sample_s:dt,counts:{idle:idle.snapshots.length,choice0:a.snapshots.length,choice3:b.snapshots.length,cycle:loop.snapshots.length},
  idle:idleFacts,choices,cycle_s:round(loop.g.state.time),rainContacts:loop.events.filter(e=>e.kind==='drip').length,
  hemDrops:loop.events.filter(e=>e.from==='hem').length,
  maxRibDifference:round(Math.max(...activeRibs.map(s=>Math.max(...s.ribs)-Math.min(...s.ribs)))),
  maxima:Object.fromEntries(Object.entries(maxima).map(([k,v])=>[k,round(v)])),maxDelta:Object.fromEntries(Object.entries(maxDelta).map(([k,v])=>[k,round(v)])),uniform,phases};
fs.writeFileSync(path.join(__dirname,'trace.ndjson.gz'),zlib.gzipSync(records.join('\n')+'\n',{level:9}));
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,phases:undefined},null,2));
