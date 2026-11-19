// Run with node state-test.cjs. No DOM, GPU or browser is used.
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),vm=require('node:vm');
const L=require('./lake.js'),step=.05,lines=[],stats={};
const three={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'vendor/three.min.js'),'utf8'),three);const T=three.THREE;
const round=(x,d=6)=>Number(x.toFixed(d)),dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i])),pos=o=>[o.x,o.y,o.z];
const max={water:0,reed:0,dust:0,stone:0,bubble:0,drop:0,leaf:0,lily:0,camera:0,ring:0,front:0,wet:0};
let uniformMovingFrames=0,samples=0,activeCells=0,maxBubbleRise=0;
function snapshot(s){
 return {water:s.h.slice(),reed:s.reeds.map(p=>p.bend),dust:s.motes.map(pos),stone:s.flight?[[s.flight.id,pos(s.flight)]]:[],
 bubble:s.bubbles.map(p=>[p.id,pos(p)]),drop:s.drops.map(p=>[p.id,pos(p)]),leaf:[[s.leaf.id,pos(s.leaf)]],
 lily:s.lilies.map(p=>[p.x,p.z]),camera:pos(s.camera),ring:s.rings.map(p=>[p.id,[p.r]]),front:s.front?.r,wet:[...s.wet]};
}
function differences(a,b){
 const local={};const record=(k,v)=>{assert.ok(Number.isFinite(v),k);local[k]=v;max[k]=Math.max(max[k],v);};
 for(const k of ['water','reed','wet']){
  let mi=Infinity,ma=-Infinity;for(let i=0;i<a[k].length;i++){const d=b[k][i]-a[k][i];mi=Math.min(mi,d);ma=Math.max(ma,d);}
  const change=Math.max(Math.abs(mi),Math.abs(ma));record(k,change);
  if(change>1e-9&&ma-mi<1e-10)uniformMovingFrames++;
 }
 for(const k of ['dust','lily']){
  const changes=a[k].map((p,i)=>p.map((v,j)=>b[k][i][j]-v));
  const movement=Math.max(...changes.map(v=>Math.hypot(...v)));record(k,movement);
  if(movement>1e-9&&changes.every(d=>dist(d,changes[0])<1e-10))uniformMovingFrames++;
 }
 for(const k of ['stone','bubble','leaf','drop','ring']){
  const old=new Map(a[k]);let d=0;
  for(const [id,p] of b[k])if(old.has(id))d=Math.max(d,dist(old.get(id),p));record(k,d);
 }
 record('camera',dist(a.camera,b.camera));record('front',a.front!=null&&b.front!=null?Math.abs(a.front-b.front):0);
 return local;
}
function recorder(name,m){
 let before=snapshot(m.s),lastId=0;
 return function(tick,initial=false){
  if(!initial)m.step(step);
  const s=m.s,after=snapshot(s),delta=differences(before,after);before=after;samples++;
  const events=s.events.filter(e=>e.id>lastId);if(events.length)lastId=events.at(-1).id;
  // Per-body positions and sample maxima include every section. Idle additionally
  // records all 1,755 grid elevations, in micrometres, for the ten-second audit.
  const row={run:name,t:round(s.time,2),stage:s.stage,mode:s.mode,cycle:s.cycle,
   water_um:name==='idle'?Array.from(s.h,v=>Math.round(v*1e6)):undefined,
   waterProbe_um:[425,685,820,1100].map(i=>Math.round(s.h[i]*1e6)),
   reed_mrad:s.reeds.map(r=>Math.round(r.bend*1000)),dust_mm:s.motes.map(p=>pos(p).map(x=>Math.round(x*1000))),
   lilies_mm:s.lilies.map(p=>[Math.round(p.x*1000),Math.round(p.z*1000)]),wet:s.wet.map(x=>round(x,4)),
   stone:s.flight?{id:s.flight.id,p:pos(s.flight).map(x=>round(x)),v:[s.flight.vx,s.flight.vy,s.flight.vz].map(x=>round(x)),contacts:s.flight.contacts}:null,
   rings:s.rings.map(r=>[r.id,round(r.r),round(r.limit),round(r.energy)]),
   front:s.front?[round(s.front.r),round(s.front.goal)]:null,bubbles:after.bubble,drops:after.drop,leaf:after.leaf,cam:after.camera,events,
   maxDelta:Object.fromEntries(Object.entries(delta).map(([k,v])=>[k,round(v,8)]))};
  lines.push(JSON.stringify(row));return delta;
 };
}
{
 const m=L.make(),write=recorder('idle',m),a=snapshot(m.s);write(0,true);
 for(let i=1;i<=200;i++)write(i);
 const b=snapshot(m.s);
 assert.equal(m.s.stage,0);assert.equal(m.s.mode,'ready');
 for(let i=0;i<a.water.length;i++)if(Math.abs(b.water[i]-a.water[i])>1e-6)activeCells++;
 stats.idle={water_mm:round(Math.max(...b.water.map((v,i)=>Math.abs(v-a.water[i])))*1000,3),
 reed_deg:round(Math.max(...b.reed.map((v,i)=>Math.abs(v-a.reed[i])))*180/Math.PI,3),
 mote_m:round(Math.max(...a.dust.map((p,i)=>dist(p,b.dust[i]))),3),activeCells,
 lily_mm:round(Math.max(...a.lily.map((p,i)=>dist(p,b.lily[i])))*1000,3)};
 assert.ok(activeCells>1400);assert.ok(stats.idle.reed_deg>2&&stats.idle.mote_m>.1);
}
function trial(speed,angle){
 const m=L.make(),write=recorder('throw-'+speed+'-'+angle,m),s=m.s;
 assert.equal(m.throwStone(speed,angle),true);assert.equal(m.throwStone(speed,angle),false);
 const f=s.flight,launch=[f.x,f.y,f.z],bubbles=new Map();let apex=f.y,observedRadius=0,firstRing=null;
 write(0,true);
 for(let i=1;i<=85;i++){
  write(i);if(firstRing===null&&s.rings.length)firstRing=s.rings[0].id;
  const ring=s.rings.find(r=>r.id===firstRing);if(ring)observedRadius=Math.max(observedRadius,ring.r);
  if(s.flight)apex=Math.max(apex,s.flight.y);
  for(const b of s.bubbles){
   if(!bubbles.has(b.id))bubbles.set(b.id,b.y);
   maxBubbleRise=Math.max(maxBubbleRise,b.y-bubbles.get(b.id));
  }
 }
 const hits=s.events.filter(e=>e.type==='impact'),reb=s.events.filter(e=>e.type==='rebound');
 assert.ok(hits.length>=1&&reb.length>=1&&bubbles.size===7);
 assert.ok(Math.abs(observedRadius-hits[0].limit)<1e-10);
 for(const h of hits)assert.ok(Math.abs(h.limit/h.incoming-.4)<1e-10);
 for(const r of reb){assert.ok(Math.abs(r.speed/r.incoming-.72)<1e-10);assert.ok(Math.abs(r.height/r.oldApex-.55)<1e-10);}
 return {speed,angle,range_m:round(Math.hypot(hits.at(-1).x-launch[0],hits.at(-1).z-launch[2]),3),apex_m:round(apex,3),impact_mps:round(hits[0].incoming,3),radius_m:round(observedRadius,3),speedRatio:round(reb[0].speed/reb[0].incoming,3),heightRatio:round(reb[0].height/reb[0].oldApex,3)};
}
stats.throws=[[2,5],[8,5],[2,20],[8,20]].map(([v,a])=>trial(v,a));
assert.ok(stats.throws[1].range_m>stats.throws[0].range_m*2);assert.ok(stats.throws[3].apex_m>stats.throws[1].apex_m+.2);
function screen(s,p){
 const c=s.camera,cam=new T.PerspectiveCamera(32,s.aspect,.055,390);
 cam.position.set(c.x,c.y,c.z);cam.lookAt(c.lx,c.ly,c.lz);cam.updateMatrixWorld();const v=new T.Vector3(...p).project(cam);return [v.x,v.y,v.z];
}
// Deliberate pauses exercise the moving guide, stable targets and two shore visits.
function traverse(aspect,name){
 const m=L.make(),s=m.s;s.aspect=aspect;const write=recorder(name,m),seen=new Set(),vis=[];
 let prev='',settled=0,lastWet=1,frontMax=0,inletSpeed=0,leafDrift=0,steps=0;
 write(0,true);
 for(let i=1;i<=5800;i++){
  if(prev!==s.mode){prev=s.mode;settled=0;}else settled+=step;
  seen.add(s.mode);
  for(const e of s.events)if(e.type==='inlet')frontMax=Math.max(frontMax,e.radius);
  if(s.mode==='drift')leafDrift=Math.max(leafDrift,-7.4-s.leaf.z);
  if(s.rings.some(r=>r.slow))inletSpeed=s.rings.find(r=>r.slow).v;
  if(settled>=4.1 && ['ready','cross','leaf','shade'].includes(s.mode)){
   const p=s.mode==='ready'?L.stones[s.stoneIndex]:s.mode==='cross'?[L.steps[s.stepIndex][0],.13,L.steps[s.stepIndex][1]]:pos(s.leaf);
   const v=screen(s,p);vis.push(v);
   assert.ok(Math.abs(v[0])<1&&Math.abs(v[1])<.93&&v[2]>0&&v[2]<1,'target outside '+name+' '+s.mode+' '+v);
   if(s.mode==='ready')m.throwStone(s.stage===0?2.9:6.65,s.stage===0?8:15);
   else if(s.mode==='cross'){m.foot();steps++;}else m.tapLeaf(.13);
  }
  write(i);lastWet=Math.min(lastWet,...s.wet);
  if(s.cycle===2){
   assert.equal(s.mode,'ready');assert.equal(steps,12);assert.deepEqual([...seen],['ready','flight','wave','leaf','drift','cross','walking','arrive','shade','fall','return']);
   return {duration_s:round(s.time,2),steps,front_m:round(frontMax,3),inlet_mps:inletSpeed,leafDrift_m:round(leafDrift,3),maxDried_percent:round((1-lastWet)*100,2),targets:vis.length};
  }
 }
 assert.fail('cycle did not return');
}
stats.portrait=traverse(390/844,'portrait');stats.landscape=traverse(1180/820,'landscape');
stats.bubbleRise_m=round(maxBubbleRise,3);
stats.maxPer50ms=Object.fromEntries(Object.entries(max).map(([k,v])=>[k,round(v,6)]));stats.uniformMovingFrames=uniformMovingFrames;stats.samples=samples;
assert.equal(uniformMovingFrames,0);assert.ok(max.water<.021&&max.reed<.07&&max.stone<.43&&max.leaf<.12&&max.camera<.30&&max.lily<.025);
const trace=path.join(__dirname,'state-trace.ndjson.gz');fs.writeFileSync(trace,zlib.gzipSync(lines.join('\n')+'\n',{level:6}));
console.log(JSON.stringify(stats,null,2));
