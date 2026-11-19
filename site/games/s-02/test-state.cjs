'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const {create,section,TAU}=require('./model.js');
const DT=.05, CM=2.5;
const rows=[],peaks={},metrics={},phases=new Set();
let uniformFields=0,uniformTemperature=0,uniformThickness=0,sameBatchPairs=0;
const columns=['case','seconds','batch','phase','center_C','water','center_cm','shoulder_cm','rim0_cm','ear0_cm','ear24_cm','coverage','roll','powder_left','powder_right','turn_rad','pull','max_tension','sun','steam','max_d_thick_cm','max_d_temp_C','max_d_powder'];
function avg(a){return a.reduce((s,v)=>s+v,0)/a.length;}
function halves(cells){return [-1,1].map(sign=>avg(cells.filter(c=>c.u>.45&&sign*Math.cos(c.a)>.61).map(c=>c.powder)));}
function recorder(name,options={}){
 const m=create(options);let prev=null,time=0;
 function record(){
  const st=m.getState(),c=st.cells,ed=st.rims;phases.add(st.phase);
  let dth=0,dtc=0,dp=0;
  if(prev&&prev.cycle===st.cycle){
   sameBatchPairs++;const deltaH=[],deltaT=[];
   for(const [collection,keys] of [['cells',['temp','water','thick','powder','dent','strainX','strainZ','heave','firm','tack']],
     ['rims',['ear','fold','weld']],['cord',['tension','displacement']]]){
    const variation=Object.fromEntries(keys.map(k=>[k,[Infinity,-Infinity]]));
    for(let i=0;i<st[collection].length;i++){
     const a=st[collection][i],b=prev[collection][i];
     for(const key of keys){
      const delta=a[key]-b[key],d=Math.abs(delta);assert(Number.isFinite(d),key);
      variation[key][0]=Math.min(variation[key][0],delta);variation[key][1]=Math.max(variation[key][1],delta);
      if(!peaks[key]||d>peaks[key].delta)peaks[key]={delta:d,name,time,i};
      if(key==='thick'){deltaH.push(delta);dth=Math.max(d,dth);}
      if(key==='temp'){deltaT.push(delta);dtc=Math.max(d,dtc);}
      if(key==='powder')dp=Math.max(d,dp);
     }
    }
    for(const [lo,hi] of Object.values(variation))if(Math.max(Math.abs(lo),Math.abs(hi))>1e-7 && hi-lo<1e-10)uniformFields++;
   }
   if(Math.max(...deltaT)-Math.min(...deltaT)<1e-10)uniformTemperature++;
   if(dth>1e-7&&Math.max(...deltaH)-Math.min(...deltaH)<1e-9)uniformThickness++;
   for(const key of ['flat','coverage','roll','pull','split','delivery','thread']){
    const d=Math.abs(st[key]-prev[key]);if(!peaks[key]||d>peaks[key].delta)peaks[key]={delta:d,name,time};
   }
  }
  const sides=halves(c),vals=[name,time,st.cycle,st.phase,c[0].temp,c[0].water,c[0].thick*CM,c[4*m.N].thick*CM,c[m.R*m.N].thick*CM,ed[0].ear*CM,ed[24].ear*CM,st.coverage,st.roll,...sides,st.turn,st.pull,Math.max(...st.cord.map(b=>b.tension)),st.sun,st.steam,dth*CM,dtc,dp];
  rows.push(vals.map(v=>typeof v==='number'?+v.toFixed(8):v).join(','));
  prev=st;
 }
 function step(){m.step(DT);time+=DT;record();}
 function hold(secs){for(let i=0;i<Math.round(secs/DT);i++)step();}
 function drag(tool,x,z,tx,tz,secs){assert(m.down(tool,x,z),tool+' during '+m.s.phase);
  const count=Math.round(secs/DT);
  for(let i=1;i<=count;i++){m.move(x+(tx-x)*i/count,z+(tz-z)*i/count);step();}
  m.up();step();
 }
 record();return {m,hold,drag,step};
}
const idle=recorder('idle'),t0=idle.m.cells[0].temp,sun0=idle.m.s.sun;
idle.hold(10);
assert.equal(idle.m.s.phase,'spread');assert(idle.m.s.cue>.99);
metrics.idle={from_C:t0,to_C:idle.m.cells[0].temp,water:idle.m.cells[0].water,sun0,sun10:idle.m.s.sun,steam10:idle.m.s.steam,introPeel_s:idle.m.s.introEnd,peelHz:idle.m.s.peelHz};
function bowl(name,options){
 const d=recorder(name,options);d.hold(1.5);
 assert(d.m.down('dough',0,0));d.hold(2.8);
 const center=d.m.cells[0],shoulder=d.m.cells[4*d.m.N];
 const b={center_cm:center.thick*CM,shoulder_cm:shoulder.thick*CM,tack:center.tack,water:center.water};
 d.m.up();d.hold(.15);b.strand_cm=d.m.s.thread*CM;d.hold(1.2);
 assert(d.m.s.flat<.001);return b;
}
metrics.bowl=bowl('center');metrics.heavy=bowl('mass_1.30',{mass:1.3});metrics.drier=bowl('water_0.49',{water:.49});
assert(metrics.bowl.shoulder_cm>metrics.bowl.center_cm+.28);
assert(metrics.heavy.center_cm>metrics.bowl.center_cm);assert(metrics.drier.tack<metrics.bowl.tack);
function ready(name,ear,seconds=1.75){
 const d=recorder(name);d.hold(1.3);
 if(ear)d.drag('dough',1,0,1.72,0,seconds);
 const stretch=d.m.rims[0].ear;d.hold(.65);
 const out={near_cm:d.m.rims[0].ear*CM,far_cm:d.m.rims[24].ear*CM};assert(stretch>=0);
 function slide(){d.drag('dough',0,.02,1.46,.07,.75);d.hold(.37);}
 slide();if(d.m.s.phase==='spread')slide();d.hold(1.1);assert.equal(d.m.s.phase,'berry');
 d.drag('berry',1,-2,.1,.1,.6);d.hold(2.5);assert.equal(d.m.s.phase,'fold');
 const rad=1.5+d.m.rims[0].ear;
 d.drag('rim',rad,0,-.32,0,1.10);d.hold(1.15);
 return {d,ear:out,cover:d.m.s.coverage};
}
const short=ready('short_fold',false),long=ready('long_fold',true),fast=ready('fast_pull',true,.20);
metrics.ears={slow:long.ear,fast:fast.ear,shortCoverage:short.cover,longCoverage:long.cover};
assert(long.ear.near_cm>fast.ear.near_cm);assert(long.ear.near_cm>long.ear.far_cm+1);assert(long.cover>short.cover+.045);
function finish(d,turn){
 const {m}=d;let folds=1;
 while(m.s.phase==='fold'&&folds<12){
  let idx=0;for(let n=1;n<m.N;n++)if(m.rims[n].fold<m.rims[idx].fold)idx=n;
  const a=idx*TAU/m.N,r=1.6+m.rims[idx].ear;
  d.drag('rim',r*Math.cos(a),r*Math.sin(a),-.17*Math.cos(a),-.17*Math.sin(a),.8);
  d.hold(.9);folds++;
 }
 assert.equal(m.s.phase,'roll');d.hold(1.4);assert(m.s.imprint>.87);
 d.drag('seam',0,0,.67,0,.85);d.hold(.5);
 const halfRoll=m.s.roll,deposit=halves(m.cells);
 assert(halfRoll>.45&&halfRoll<.52);assert(Math.abs(deposit[0]-deposit[1])>.04);
 d.drag('seam',0,0,1.2,0,.85);d.hold(2);
 assert.equal(m.s.phase,'cut');if(turn)d.drag('turn',0,0,1.92,.05,1.1);
 d.hold(.8);
 const turnRad=m.s.turn,upperWidth=2*section(.8,turnRad).radius*CM;
 d.drag('loop',0,1.3,-.25,2.75,1.5);d.hold(2.5);
 assert.equal(m.s.phase,'serve');const q=m.s.split,pluck_Hz=m.s.pluckHz;
 d.drag('half',-.8,0,-1.62,-1.2,.7);d.hold(4.5);assert.equal(m.s.cycle,1);assert.equal(m.s.phase,'spread');
 return {folds,halfRoll,powder_left:deposit[0],powder_right:deposit[1],turn_rad:turnRad,upperWidth_cm:upperWidth,split:q,pluck_Hz};
}
metrics.round=finish(short.d,false);metrics.drop=finish(long.d,true);
assert(metrics.round.upperWidth_cm>metrics.drop.upperWidth_cm+.2);
assert.equal(uniformFields,0);assert.equal(uniformTemperature,0);assert.equal(uniformThickness,0);
assert(peaks.thick.delta*CM<.25);assert(peaks.fold.delta<.17);assert(peaks.powder.delta<.07);assert(peaks.roll.delta<.16);
const check={interval_s:DT,samples:rows.length,sameBatchPairs,uniformFields,uniformTemperature,uniformThickness,phases:[...phases],metrics,peaks};
fs.writeFileSync(path.join(__dirname,'state-trace.csv'),columns.join(',')+'\n'+rows.join('\n')+'\n');
console.log(JSON.stringify(check,null,2));
