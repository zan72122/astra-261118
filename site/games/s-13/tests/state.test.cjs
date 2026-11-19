'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'),zlib=require('node:zlib');
const Kitchen=require('../kitchen.js');
const dt=.05,mm=40,deg=180/Math.PI,records=[],report={};
const max=(xs)=>Math.max(...xs),min=(xs)=>Math.min(...xs),mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const maxima={temperatureC:0,moisturePercentagePoints:0,heightMM:0,creamFallMM:0,turnDegrees:0,handleDegrees:0};
const opening={handlePeakDeg:0};const visits=new Set();let uniform=0,intervals=0,resets=0;
function inspect(name,s,previous){
 if(name==='untouched'&&s.hint>0)opening.hintAtS??=s.time;
 if(name==='slow'){if(s.stage==='drop')opening.handlePeakDeg=Math.max(opening.handlePeakDeg,Math.abs(s.toolFlex)*deg);
   if(s.seated){opening.seatedAtS??=s.time;opening.fallMM=(2.04-s.creamY)*mm}}
 const snapshot=s.getState(),rounded=x=>+x.toFixed(7);
 records.push(JSON.stringify({run:name,seconds:rounded(s.time),batch:s.cycle,stage:s.stage,
   angleRad:rounded(s.angle),creamBase:rounded(s.creamY),flex:rounded(s.toolFlex),pressure:rounded(s.nozzle.pressure),
   dustY:rounded(s.dust[0].y),plumeX:rounded(s.plume[13].x),cut:s.lastCut,portion:rounded(s.biteThickness),
   cells:s.cells.map(c=>[c.temp,c.wet,c.height,c.load,c.vel].map(rounded))}));
 if(previous){
  assert(Math.abs(snapshot.time-previous.time-dt)<1e-8);intervals++;
  // New ingredients have a fresh identity. Track the batch boundary explicitly.
  if(previous.cycle!==s.cycle){resets++;return snapshot}
  const temp=[],wet=[];
  for(let i=0;i<s.cells.length;i++){
   const c=s.cells[i],old=previous.cells[i];
   temp.push(c.temp-old.temp);wet.push(c.wet-old.wet);
   assert(Object.values(c).every(Number.isFinite));
   assert(c.height>=0&&c.wet>0&&c.wet<=1);
   maxima.heightMM=Math.max(maxima.heightMM,Math.abs(c.height-old.height)*mm);
  }
  maxima.temperatureC=Math.max(maxima.temperatureC,max(temp.map(Math.abs)));
  maxima.moisturePercentagePoints=Math.max(maxima.moisturePercentagePoints,max(wet.map(Math.abs))*100);
  maxima.creamFallMM=Math.max(maxima.creamFallMM,Math.abs(s.creamY-previous.creamY)*mm);
  maxima.turnDegrees=Math.max(maxima.turnDegrees,Math.abs(s.angle-previous.angle)*deg);
  maxima.handleDegrees=Math.max(maxima.handleDegrees,Math.abs(s.toolFlex-previous.handle)*deg);
  if(max(temp)-min(temp)<1e-12||max(wet)-min(wet)<1e-12)uniform++;
 }
 return snapshot;
}
function runner(name,options){const s=new Kitchen(options);let prev=inspect(name,s);
 function tick(seconds,action){for(let i=0;i<Math.round(seconds/dt);i++){action?.(i);s.step(dt);prev=inspect(name,s,prev);visits.add(s.stage)}}
 function until(stage){for(let i=0;i<400&&s.stage!==stage;i++)tick(dt);assert.equal(s.stage,stage)}
 function ready(){assert(s.press());until('pipe')}
 return {s,tick,until,ready};
}
const idle=runner('untouched');const init=idle.s.getState();idle.tick(10);
assert.equal(idle.s.stage,'scoop');assert(idle.s.hint>.99);
const warming=idle.s.cells.map((c,i)=>c.temp-init.cells[i].temp);
report.idle10s={warmingMinC:min(warming),warmingMaxC:max(warming),
  wetLossMaxPP:max(idle.s.cells.map((c,i)=>(init.cells[i].wet-c.wet)*100)),
  moteRiseMM:(idle.s.dust[0].y-init.dust[0].y)*mm,plumeTravelMM:idle.s.plume.at(-1).x*mm};
assert(min(warming)>0&&max(warming)>min(warming)*2);
function speedCase(name,duration){
 const r=runner(name);r.ready();r.s.startPipe();
 r.tick(duration,i=>r.s.aim(-.57+.99*(i+1)*dt/duration,1.19));
 const points=r.s.stroke.points.slice(1);r.s.endPipe();const n=r.s.lastCut;
 r.tick(.65);assert.equal(r.s.strokes[0].points.length,n);
 return {contactSpanMM:mean(points.map(p=>p.span))*mm,foldMM:mean(points.map(p=>p.fold))*mm,cutSections:n,tailSet:r.s.strokes[0].tail};
}
report.slow=speedCase('slow',3.0);report.fast=speedCase('fast',.45);
assert(report.slow.foldMM>report.fast.foldMM*1.4);assert(report.fast.contactSpanMM>report.slow.contactSpanMM*1.5);
const short=runner('lift');short.ready();short.s.startPipe();short.tick(.15,i=>short.s.aim(-.57+.025*i,1.19));short.s.endPipe();short.tick(.65);
const shortLine=short.s.strokes[0].points.map(p=>short.s.surface(p.a,p.p,p.h));
let cutLength=0;for(let i=1;i<shortLine.length;i++)cutLength+=Math.hypot(...shortLine[i].map((v,k)=>v-shortLine[i-1][k]));
report.cut={shortLengthMM:cutLength*mm,shortSections:short.s.lastCut,tailSettledPercent:short.s.strokes[0].tail*100};
assert(short.s.lastCut>0&&short.s.lastCut<report.slow.cutSections&&short.s.strokes[0].cut);
function moistureCase(w){
 const r=runner('water-'+w,{moisture:w});r.ready();r.s.startPipe();
 r.tick(2);r.s.endPipe();r.tick(.5);
 return {peakMM:max(r.s.cells.map(c=>c.height))*mm,extruded:r.s.extruded,viscosity:r.s.cells[r.s.index(-.57,1.19)].viscosity};
}
report.moist={dry:moistureCase(.51),wet:moistureCase(.85)};
assert(report.moist.wet.peakMM>report.moist.dry.peakMM);
const large=runner('mass-1.25',{mass:1.25});large.tick(10);
report.mass={normalRadiusMM:idle.s.radius*mm,largeRadiusMM:large.s.radius*mm,normalCellC:idle.s.cells[128].temp,largeCellC:large.s.cells[128].temp};
assert(large.s.radius>idle.s.radius&&large.s.cells[128].temp<idle.s.cells[128].temp);
function bake(name,faceCoated){
 const r=runner(name),s=r.s;r.ready();s.startPipe();
 r.tick(5,i=>s.aim(.07*Math.sin(i*dt*1.6),.90+.54*Math.sin(i*dt*2.05)));
 s.endPipe();r.tick(.50);assert(s.turn(1));r.until('decorate');
 const window=s.cells[s.index(-s.angle,1.10)].height*mm,back=s.cells[s.index(0,1.10)].height*mm;
 assert(back>window+.1);if(faceCoated){s.turn(1);r.tick(2.2)}
 assert(s.top());r.until('tray');assert(s.handOver(0));const portion=s.biteThickness*mm,servedAt=s.time;
 r.until('taste');assert(s.bite>.98);r.until('refill');r.until('scoop');
 assert.equal(s.cycle,1);assert.equal(s.strokes.length,0);assert.equal(s.extruded,0);
 assert(s.press());return {freshAfterS:s.time-servedAt,turnDegrees:r.s.angle*deg,windowMM:window,coatedMM:back,portionMM:portion};
}
report.bare=bake('serve-bare',false);report.layered=bake('serve-coated',true);
assert(report.layered.portionMM>report.bare.portionMM+.25);
assert.equal(uniform,0);assert(maxima.heightMM<1);assert(maxima.creamFallMM<10);assert(maxima.turnDegrees<18);
assert(maxima.temperatureC<.01&&maxima.moisturePercentagePoints<.02);
assert.equal(resets,2);
report.opening=opening;report.intervals=intervals;report.batchTransitions=resets;report.uniformIntervals=uniform;report.maxPer50ms=maxima;
report.stages=[...visits];
fs.writeFileSync(path.join(__dirname,'state-trace.ndjson.gz'),zlib.gzipSync(records.join('\n')+'\n',{level:6}));
const output=JSON.stringify(report,(k,v)=>typeof v==='number'?+v.toFixed(6):v,2)+'\n';
fs.writeFileSync(path.join(__dirname,'measurements.json'),output);process.stdout.write(output);
