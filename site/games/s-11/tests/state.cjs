'use strict';
// Run with node games/s-11/tests/state.cjs. All measurements come from the
// same stepper the player uses. One simulation unit of length is 100 mm.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {Kitchen,phases}=require('../sim.js');
const dt=.05,fields=['h','v','air','fine','cut','white','swirl','sugar','heat','moisture','set','brown','fill','gas','rise','jig','jv'];
const maxima={},uniform={},rows=[],measure={};
let samples=0,changes=0,replacements=0;
const rnd=x=>Number(x.toFixed(8));
const center=k=>k.cells[84];
const mean=(a,k)=>a.reduce((s,c)=>s+c[k],0)/a.length;
function rig(name,opts={},init){
 const s=new Kitchen(opts);if(init)init(s);
 let lastBatch=s.batch;
 let past=s.valid.map(c=>fields.map(k=>c[k]));
 const add=(diff=0)=>{const c=center(s);rows.push([name,s.time.toFixed(2),s.batch,s.phase,s.moved,s.mean.air,s.mean.fine,s.mean.white,s.mean.heat,s.mean.brown,s.mean.rise,s.mean.fill,s.mean.gas,s.peel,c.jig,s.peak,s.falling,c.cut,c.h,c.swirl,s.weather.light,s.trail.filter(b=>b.life>0).length,diff,...fields.map(k=>c[k])].map(n=>typeof n==='number'?rnd(n):n).join(','));};
 add();
 function step(){s.step(dt);samples++;let maxH=0;
  if(lastBatch===s.batch){
   for(let j=0;j<fields.length;j++){const f=fields[j];let min=Infinity,max=-Infinity,m=0;
    for(let i=0;i<s.valid.length;i++){const x=s.valid[i][f];assert.ok(Number.isFinite(x),f);const delta=x-past[i][j];min=Math.min(min,delta);max=Math.max(max,delta);m=Math.max(m,Math.abs(delta));past[i][j]=x;}
    if(m>1e-9){changes++;if(max-min<1e-12)uniform[f]=(uniform[f]||0)+1;}
    if(m>(maxima[f]?.delta??-1))maxima[f]={delta:rnd(m),run:name,time:rnd(s.time)};
    if(f==='h')maxH=m;
   }
  }else{replacements++;lastBatch=s.batch;past=s.valid.map(c=>fields.map(k=>c[k]));}
  add(maxH);
 }
 return {s,step,n(n,fn){for(let i=0;i<n;i++){if(fn)fn(i);step();}}};
}
{
 const r=rig('idle'),s=r.s,initial=s.getState();r.n(200);
 assert.equal(s.phase,'whisk');assert.equal(s.popped,false);assert.equal(s.touch,false);assert.ok(s.idle>=4);
 const maxShift=Math.max(...s.cells.map((c,i)=>Math.abs(c.h-initial.cells[i].h)));
 const inactiveForce=Math.abs(s.tool.x-initial.tool.x);
 assert.ok(maxShift>.001&&s.weather.light!==initial.weather.light&&inactiveForce===0);
 measure.idle={seconds:10,maxShiftMm:maxShift*100,lightStart:initial.weather.light,lightEnd:s.weather.light,inactiveToolDisplacementMm:inactiveForce};
}
{
 const r=rig('retrace'),s=r.s;
 function moveTo(x,n){s.down();const init=s.tool.tx;
 r.n(n,i=>s.drag((x-init)/n,0));}
 moveTo(-.78,20);moveTo(.80,25);
 const track=s.valid.filter(c=>Math.abs(c.z)<.12&&Math.abs(c.x)<.68),edge=s.valid.filter(c=>Math.abs(c.z)>.76);
 const air1=mean(track,'air'),fine1=mean(track,'fine');assert.ok(s.popped);
 moveTo(-.78,25);const fine2=mean(track,'fine');
 measure.retrace={firstAir:air1,edgeAir:mean(edge,'air'),firstFine:fine1,secondFine:fine2,trailBubbles:s.trail.filter(b=>b.life>0).length};
 assert.ok(fine2>fine1&&air1>mean(edge,'air')&&measure.retrace.trailBubbles>0);
}
{
 const results=[];
 for(const [label,air,fine] of [['thin',.025,.03],['whipped',.54,.63]]){
  const r=rig('lift_'+label,{air,fine}),s=r.s;s.down();r.n(16,()=>s.drag(.042,0));s.up();r.n(10);
  const c=s.cells[87],before=c.cut;r.n(10);const retention=c.cut/before;
  s.down();r.n(17,()=>s.drag(0,0,1));s.up();r.n(4);
  const axis=.018+s.peak*.44+s.tool.lift*(.16+.26*s.charge);
  const h=100*Math.max(...Array.from({length:29},(_,i)=>{const f=i/28;return axis*f-.115*s.charge*f**5;}));
  results.push({retention,bandHz:s.bandHz,falling:s.falling,peakMm:h,peak:s.peak});
 }
 assert.ok(results[1].retention>results[0].retention&&results[1].peakMm>results[0].peakMm&&results[0].falling>results[1].falling);measure.lift=results;
}
{
 const r=rig('fold_once',{},s=>{s.enter('fold');for(const c of s.cells)c.white=.15+.82*Math.exp(-3*((c.x+.26)**2+(c.z-.12)**2));s.refresh();}),s=r.s,initial=s.mean.white;
 s.down();r.n(18,()=>s.drag(.006,.052));r.n(26,()=>s.drag(-.014,-.059,.22));
 measure.fold={before:initial,after:s.mean.white,localSwirl:Math.max(...s.valid.map(c=>c.swirl)),outsideSwirl:Math.min(...s.valid.map(c=>c.swirl))};
 assert.ok(initial>s.mean.white&&measure.fold.localSwirl>10*measure.fold.outsideSwirl);
}
function bake(name,mass,air){
 const r=rig(name,{mass,air,fine:.34},s=>s.enter('pour')),s=r.s;
 for(let i=0;i<2400&&s.phase!=='cool';i++){s.down();if(s.phase==='pour'||s.phase==='push')s.drag(.12,-.14);r.step();}
 assert.equal(s.phase,'cool');const massInPan=s.valid.reduce((n,c)=>n+c.fill,0);assert.ok(Math.abs(massInPan-mass)<1e-8);
 return {massKg:mass,air,massInPan,centreHeightMm:.99*(.30+.99*center(s).rise)*100,surfaceC:s.mean.heat,brown:s.mean.brown};
}
measure.bakes=[bake('base_mass_air',.42,.26),bake('more_mass',.54,.26),bake('more_air',.42,.52)];
assert.ok(measure.bakes[1].centreHeightMm>measure.bakes[0].centreHeightMm&&measure.bakes[2].centreHeightMm>measure.bakes[0].centreHeightMm);
{
 const r=rig('partial_peel',{},s=>{s.enter('peel');for(const c of s.cells){c.set=.98;c.fill=.42/s.valid.length;c.rise=.68;c.heat=32;}s.refresh();}),s=r.s;
 s.down();r.n(10,()=>s.drag(.11,0));s.up();const stopped=s.paperTarget;let stillTime=null,peaks=[],lastV=center(s).jv,peak=0;
 for(let i=0;i<90;i++){const previous=s.peel;r.step();const velocity=(s.peel-previous)/dt;
 if(stillTime===null&&Math.abs(velocity)<.001)stillTime=s.time;
 const c=center(s);if(stillTime!==null&&Math.sign(lastV)!==Math.sign(c.jv)){peaks.push({afterPaperStops:rnd(s.time-stillTime),offsetMm:rnd(c.jig*100)});}
 lastV=c.jv;peak=Math.max(peak,Math.abs(c.jig));}
 assert.ok(s.peel<.3&&peaks.length>=3&&s.phase==='peel');
 measure.peel={fraction:stopped,maxMm:peak*100,extremaAfterStop:peaks.slice(0,3)};
}
{
 const r=rig('complete_recipe'),s=r.s,seen=[],entries={};let prev='',x0=0,z0=0,elapsed=0,popTime=null,doses=0,oldDose=0;
 for(let i=0;i<7000&&s.batch===1;i++){
  const p=s.phase;if(prev!==p){seen.push(p);entries[p]=rnd(s.time);prev=p;elapsed=0;x0=z0=0;}
  elapsed+=dt;
  if(p==='whisk'||p==='fold'){s.down();const x=.82*Math.sin(elapsed*3.5),z=.64*Math.sin(elapsed*(p==='fold'?3.5:1.6)+.15);s.drag(x-x0,z-z0,Math.max(0,-z)*.45);x0=x;z0=z;}
  if(['push','pour','peel','serve'].includes(p)){s.down();s.drag(.018,-.016);}
  r.step();if(s.popped&&popTime===null)popTime=s.time;if(s.dose&&!oldDose)doses++;oldDose=s.dose;
 }
 assert.deepEqual(seen,phases);assert.equal(s.batch,2);assert.equal(s.phase,'whisk');assert.equal(doses,3);assert.ok(s.time>120);
 measure.loop={duration:rnd(s.time),popSeconds:rnd(popTime),sugarPortions:doses,entries,returnedBatch:s.batch};
}
assert.deepEqual(uniform,{});
const bounds={h:.032,v:.25,air:.018,fine:.033,cut:.18,white:.04,swirl:.55,sugar:.03,heat:1.0,moisture:.003,set:.019,brown:.004,fill:.00014,gas:.00008,rise:.034,jig:.035,jv:.30};
for(const [k,bound] of Object.entries(bounds))assert.ok(maxima[k].delta<bound,k+' exceeds expected adjacent change '+JSON.stringify(maxima[k]));
const header='run,time_s,batch,phase,transferred_kg,mean_air,mean_fine,mean_white,mean_heat_C,mean_brown,mean_rise_dm,mean_fill_kg,mean_gas_kg_equiv,paper_fraction,centre_jig_dm,peak,falling,centre_cut,centre_h_dm,centre_swirl,light,trail_bubbles,max_delta_h_dm,'+fields.map(k=>'patch84_'+k).join(',');
fs.writeFileSync(path.join(__dirname,'trace.csv.gz'),zlib.gzipSync([header,...rows].join('\n')+'\n',{level:9}));
const report={sampleIntervalSeconds:dt,samples,activePatches:new Kitchen().valid.length,changedFieldSteps:changes,uniformChanges:uniform,freshBatchBoundaries:replacements,maxima,measure};
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
