'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {pipeline}=require('node:stream/promises');
const {create}=require('../physics.js');
const dt=.05,trace=zlib.createGzip({level:7});
const saved=pipeline(trace,fs.createWriteStream(path.join(__dirname,'state-trace.ndjson.gz')));
const summary={intervalSeconds:dt,records:0,uniformNonzeroUpdates:0,comparisons:0,maxDelta:{},experiments:[],stageTimes:{},sounds:{shaving:0,woodrain:0,roof:0,woodHzMin:Infinity,woodHzMax:0}};
const max=summary.maxDelta,waypoints=[],round=x=>+x.toFixed(6);
function peak(key,value){max[key]=Math.max(max[key]||0,Math.abs(value));}
function checkPartition(a,b,key){
 const ds=a.map((v,i)=>v-b[i]),lo=Math.min(...ds),hi=Math.max(...ds);
 if(hi-lo<1e-12&&Math.max(Math.abs(lo),Math.abs(hi))>1e-10)summary.uniformNonzeroUpdates++;
 peak(key,Math.max(Math.abs(lo),Math.abs(hi)));summary.comparisons++;
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
// Indexed tuples keep each full observation compact enough to inspect or replay without a decoder.
const columns={
  tool:['x','v','aim','blade','force','pitch','loud','edge'],cell:['thickness','radius','polish','heat','reveal','tap','wet','film'],
  shaving:['id','x','y','z','vx','vy','vz','length','roll','radius','span','attached','asleep'],
  drop:['id','x','y','z','vy','hit'],dust:['x','y','z','vx','vy','vz'],leaf:['angle','velocity'],
  joint:['p','v','target','locked'],weather:['sun','wind','rain','runoff','water','gate','wheel','omega'],
  carriage:['cart','cartV','wheels','lift','feed','feedV','returnP']
};
const tuple=(o,keys)=>keys.map(k=>typeof o[k]==='number'?+o[k].toFixed(4):o[k]);
trace.write(JSON.stringify({columns,dt,tiles:['water','moisture'],units:'millimetres, seconds, newtons, radians; water is fractional saturation'})+'\n');
function packed(s){return {
 stage:s.stage,cycle:s.cycle,strokes:s.strokes,idle:round(s.idle),tool:tuple(s,columns.tool),
 cells:s.cells.map(c=>tuple(c,columns.cell)),tiles:s.cells.map(c=>c.tiles.flatMap(t=>tuple(t,['water','moisture']))),
 shavings:s.ribbons.map(r=>tuple(r,columns.shaving)),drops:s.drops.map(d=>tuple(d,columns.drop)),
 dust:s.dust.map(p=>tuple(p,columns.dust)),leaves:s.leaves.map(p=>tuple(p,columns.leaf)),
 joints:s.pieces.map(p=>tuple(p,columns.joint)),weather:tuple(s,columns.weather),carriage:tuple(s,columns.carriage),
 buckets:s.buckets.map(round),events:s.events
};}
function sample(label){
 const m=create(74);let prev=null,frame=0;
 function record(){
   const s=m.getState();summary.records++;
   if(label==='journey')for(const e of s.events){
     if(['shaving','woodrain','roof'].includes(e.kind))summary.sounds[e.kind]++;
     if(e.kind==='woodrain'){summary.sounds.woodHzMin=Math.min(summary.sounds.woodHzMin,e.hz);summary.sounds.woodHzMax=Math.max(summary.sounds.woodHzMax,e.hz);}
   }
   trace.write(JSON.stringify({run:label,time:round(frame*dt),state:packed(s)})+'\n');
   if(prev&&s.cycle===prev.cycle){
     for(const k of ['x','pitch','force','wheel','cart','feed','sun'])peak(k,s[k]-prev[k]);
     for(const k of ['thickness','radius','wet','polish','reveal'])checkPartition(s.cells.map(c=>c[k]),prev.cells.map(c=>c[k]),k);
     checkPartition(s.cells.flatMap(c=>c.tiles.map(t=>t.moisture)),prev.cells.flatMap(c=>c.tiles.map(t=>t.moisture)),'moisture');
     s.dust.forEach((p,i)=>peak('dustMm',dist(p,prev.dust[i])));
     s.leaves.forEach((p,i)=>peak('stemRad',p.angle-prev.leaves[i].angle));
     s.pieces.forEach((p,i)=>peak('joint',p.p-prev.pieces[i].p));
     const old=new Map(prev.ribbons.map(r=>[r.id,r]));
     for(const r of s.ribbons){const a=old.get(r.id);if(a)peak('ribbonMm',dist(a,r));}
     const drops=new Map(prev.drops.map(d=>[d.id,d]));
     for(const d of s.drops){const a=drops.get(d.id);if(a)peak('dropMm',dist(a,d));}
   }
   assert.ok(s.cells.every(c=>c.thickness>28&&Number.isFinite(c.radius)&&c.tiles.every(a=>a.moisture>=0&&a.moisture<=1)));
   prev=s;frame++;
 }
 return {m,s:m.state,record,advance(){m.step(dt);record();m.state.events.length=0;}};
}
async function main(){
 // No input including blade adjustment. Ten seconds of air, light and flexible stems.
 const idle=sample('idle');idle.record();const atRest=idle.m.getState();
 for(let i=0;i<200;i++)idle.advance();
 const air=idle.s.dust.map((a,i)=>dist(a,atRest.dust[i]));
 summary.idle={seconds:10,minDustMm:Math.min(...air),maxDustMm:Math.max(...air),stemRad:idle.s.leaves.map(a=>a.angle),sunChange:idle.s.sun-atRest.sun};
 assert.ok(Math.min(...air)>0&&Math.max(...air)-Math.min(...air)>3);
 assert.ok(idle.s.cells.every(c=>c.thickness===32));assert.equal(idle.s.stage,'plane');
 assert.equal(idle.m.press('part',0),false);assert.equal(idle.m.press('cart'),false);
 // Two by two factorial design, same wood, same seed and starting point.
 // Compare at the same wood cell after the drive has reached steady speed.
 for(const blade of [2,8])for(const speed of [80,240]){
   const run=sample('blade'+blade+'-speed'+speed),{m,s}=run;m.setBlade(blade);m.press('plane');run.record();
   let command=0;
   for(let i=0;i<200;i++){
     command+=speed*dt;m.move(command);run.advance();
     if(s.x>=225){
       summary.experiments.push({bladeMm:blade,commandMmPerS:speed,cell:Math.floor(s.x/20),actualMmPerS:s.edge,
         pitchHz:s.pitch,forceN:s.force,averageShavingWidthMm:s.ribbons.reduce((a,r)=>a+r.span,0)/s.ribbons.length});
       break;
     }
   }
   const x=s.x;m.release();run.advance();assert.ok(s.x>x,'momentum after release');
   for(let i=0;i<80;i++)run.advance();
   assert.ok(s.v<.001&&s.ribbons.every(r=>r.asleep&&!r.attached));
 }
 const [thinSlow,thinFast,deepSlow,deepFast]=summary.experiments;
 assert.deepEqual(summary.experiments.map(r=>r.cell),[11,11,11,11]);
 assert.ok(thinFast.pitchHz>thinSlow.pitchHz+80&&deepFast.pitchHz>deepSlow.pitchHz+80);
 assert.ok(deepSlow.forceN>thinSlow.forceN+4&&deepFast.averageShavingWidthMm>thinFast.averageShavingWidthMm+7);
 // Fully traverse the normal public interaction API, including short strokes and re-grips.
 const journey=sample('journey'),{m,s}=journey;journey.record();
 let command=0,moveTime=0,rest=0,stage=s.stage,strokes=0,firstPass=null,guided=-1,grainIndex=0,nextTap=0,rainActions=0;
 summary.stageTimes.plane=0;let minForce=Infinity,maxForce=0,fullSec=0;
 for(let n=1;n<6000;n++){
   if(s.stage==='plane'){
     if(s.returning){rest=.37;moveTime=0;}
     else if(rest>0)rest-=dt;
     else{
       if(!s.drag){m.press('plane');command=s.x;moveTime=0;}
       command+=(100+52*(s.strokes%3))*dt;m.move(command);moveTime+=dt;
       if(moveTime>1.35&&s.x<550){m.release();rest=.54;moveTime=0;}
     }
   }else if(s.stage==='fit'){
     const index=s.pieces.findIndex(p=>!p.locked);if(index!==guided&&s.age>.9+(index*2.1)){m.press('part',index);guided=index;}
   }else if(s.stage==='carry'&&s.age>1.7)m.press('cart');
   else if(s.stage==='sun'&&s.age>nextTap){m.press('grain',[.08,.30,.50,.77,.96][grainIndex++%5]);nextTap+=1.15;}
   else if(s.stage==='rain'&&s.age>rainActions*3.1+.3){m.press(rainActions%3===0?'gate':'grain',(rainActions*.21)%1);rainActions++;}
   const previousStage=s.stage;journey.advance();const t=n*dt;
   if(s.edge>4){minForce=Math.min(minForce,s.force);maxForce=Math.max(maxForce,s.force);}
   if(s.strokes>strokes){strokes=s.strokes;if(strokes===1){firstPass=s.cells.map(c=>c.thickness);assert.ok(firstPass.every(v=>Math.abs(v-31.6)<1e-7));}}
   if(s.stage!==previousStage){
     waypoints.push([round(t),s.stage]);if(s.stage!=='plane')summary.stageTimes[s.stage]=round(t);
     if(s.stage==='fit')summary.wood={thicknessMm:s.cells[15].thickness,passes:s.strokes,radiusMinMm:Math.min(...s.cells.map(c=>c.radius)),radiusMaxMm:Math.max(...s.cells.map(c=>c.radius)),ribbons:s.ribbons.length};
     if(s.stage==='carry'){summary.fit={locked:s.pieces.filter(p=>p.locked).length,asleep:s.ribbons.filter(r=>r.asleep).length,highestRibbonCenterMm:Math.max(...s.ribbons.map(r=>r.y))};}
     if(s.stage==='sun')summary.cart={wheelRadians:s.wheels,end:s.cart};
     if(s.stage==='rain')summary.sun={minReveal:Math.min(...s.cells.map(c=>c.reveal)),maxReveal:Math.max(...s.cells.map(c=>c.reveal))};
     if(s.stage==='home'){
       const tile=s.cells.flatMap(c=>c.tiles.map(a=>a.moisture));
       summary.rain={wetMin:Math.min(...tile),wetMax:Math.max(...tile),wetTiles:tile.filter(n=>n>.01).length,wheelRadians:s.wheel,water:s.water};
     }
   }
   if(s.cycle===1){fullSec=t;break;}
 }
 assert.ok(fullSec>0,'the wheel brings back a fresh board');
 assert.deepEqual(waypoints.map(w=>w[1]),['fit','carry','sun','rain','home','plane']);
 assert.equal(summary.fit.locked,4);assert.equal(summary.fit.asleep,summary.wood.ribbons);
 assert.ok(summary.rain.wetMax-summary.rain.wetMin>.2&&summary.rain.wetTiles>15);
 assert.ok(minForce>=8&&maxForce<=20);
 assert.ok(s.cells.every(c=>c.thickness===32&&c.wet===0));
 m.press('plane');m.move(300);for(let i=0;i<15;i++)journey.advance();
 assert.ok(s.cells[2].thickness<32&&s.cells[29].thickness===32,'new stock responds locally');
 assert.equal(summary.uniformNonzeroUpdates,0);
 // Finite movement envelopes, excluding births, retirements and distinct pieces of timber.
 assert.ok(max.x<42&&max.dustMm<1.5&&max.thickness<=.400001&&max.radius<.69);
 assert.ok(max.cart<.06&&max.joint<.19&&max.wheel<=.140001&&max.feed<.06);
 assert.ok(max.ribbonMm<43&&max.dropMm<77&&max.moisture<.18,JSON.stringify(max));
 summary.journeySeconds=fullSec;summary.forceRangeN=[minForce,maxForce];summary.waypoints=waypoints;
 trace.end();await saved;
 const clean=JSON.stringify(summary,(k,v)=>typeof v==='number'?round(v):v,2);
 fs.writeFileSync(path.join(__dirname,'measurements.json'),clean+'\n');console.log(clean);
}
main().catch(e=>{trace.end();console.error(e);process.exitCode=1;});
