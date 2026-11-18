'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {makeWorld,vessels,angles}=require('./water.js');
const dt=.05,deg=180/Math.PI,rows=[],maximum={},uniform={film:0,litres:0,twigs:0,cups:0},moving={film:0,litres:0,twigs:0,cups:0};
let columns,conservationError=0;
function packet(s){
 const p={};
 for(const k of ['rain','angle','angularVelocity','cloud','wind','surfaceRunoff','outletVolume','inletVolume'])p[k]=s[k];
 p.falling=s.drops.length;p.splash=s.splashes.length;p.ripples=s.rings.length;
 p.boatDistance=s.boat.distance;p.boatSpeed=s.boat.speed;p.wheelAngle=s.wheel.angle;p.wheelLift=s.wheel.lifted;
 p.birdX=s.fly.x;p.birdY=s.fly.y;p.birdZ=s.fly.z;
 for(const [k,v] of Object.entries(s.camera))p['camera_'+k]=v;
 s.film.forEach((v,i)=>p['film_L_'+i]=v);
 s.vessels.forEach((v,i)=>{for(const k of ['litres','channel','nozzle','spill','hits','pitch','wave','shake','wet','energy'])p[k+'_'+i]=v[k];});
 s.wheel.cells.forEach((v,i)=>p['cup_'+i]=v);s.bells.forEach((b,i)=>p['bellAngle_'+i]=b.angle);
 s.twigs.forEach((b,i)=>p['twig_'+i]=b.bend);
 return p;
}
function save(run,s){
 const p=packet(s);columns||=Object.keys(p);
 rows.push([run,s.time.toFixed(2),s.phase,...columns.map(k=>{assert.ok(Number.isFinite(p[k]),k);return Number(p[k].toFixed(7));})].join(','));
}
function max(k,d){maximum[k]=Math.max(maximum[k]||0,Math.abs(d));}
function compare(old,s){
 max('rain_L_min',s.rain-old.rain);max('angle_deg',(s.angle-old.angle)*deg);max('wheel_deg',(s.wheel.angle-old.wheel.angle)*deg);
 max('boat_percent',(s.boat.distance-old.boat.distance)/2.28*100);max('cloud_percent',(s.cloud-old.cloud)*100);
 for(let i=0;i<5;i++){
  const a=old.vessels[i],b=s.vessels[i];
  max('water_mL',(b.litres-a.litres)*1000);max('pitch_Hz',b.pitch-a.pitch);max('shake_deg',(b.shake-a.shake)*deg);
  assert.ok(b.litres>=0&&b.litres<=vessels[i].capacity+1e-9);
 }
 s.film.forEach((v,i)=>max('film_mL',(v-old.film[i])*1000));
 s.bells.forEach((v,i)=>max('bell_deg',(v.angle-old.bells[i].angle)*deg));
 s.twigs.forEach((v,i)=>max('twig_deg',(v.bend-old.twigs[i].bend)*deg));
 const groups={
  film:s.film.map((v,i)=>v-old.film[i]),
  litres:s.vessels.map((v,i)=>v.litres-old.vessels[i].litres),
  twigs:s.twigs.map((v,i)=>v.bend-old.twigs[i].bend),
  cups:s.wheel.cells.map((v,i)=>v-old.wheel.cells[i])
 };
 for(const [k,delta] of Object.entries(groups)){
  if(delta.some(v=>Math.abs(v)>1e-8)){
   moving[k]++;if(Math.max(...delta)-Math.min(...delta)<1e-9)uniform[k]++;
  }
 }
 // Track a falling body by identity. Birth, impact, and recycled background rain are discrete contacts.
 for(const body of s.drops){const before=old.drops.find(v=>v.id===body.id);if(before){const dy=body.y-before.y;assert.ok(dy<=1e-9&&Math.abs(dy)<.40);}}
 for(let i=0;i<s.rainGrains.length;i++){const a=old.rainGrains[i],b=s.rainGrains[i];if(a.generation===b.generation)assert.ok(Math.abs((b.y-a.y)+b.speed*dt)<1e-8);}
}
function inventory(s){
 return s.film.reduce((a,b)=>a+b,0)+s.lip+s.drops.reduce((a,b)=>a+b.amount,0)+
 s.vessels.reduce((a,v,i)=>a+v.litres+v.channel+(i<4?v.nozzle:0),0)+s.surfaceRunoff;
}
function trial(label,limit,control,endOnCycle=false){
 const w=makeWorld();const initial=inventory(w.s);let old=w.getState();save(label,old);
 const stages=[['gather',0]],notes=new Set();let firstTen,clearing,wheel,peal=0,travel=0,peakSpill=0,twig=0,chimes=0,changes=0;
 for(let tick=1;tick<=Math.round(limit/dt);tick++){
  if(control)control(w,tick);
  w.step(dt);const state=w.getState(),events=w.drainEvents();
  if(old.phase!==state.phase){stages.push([state.phase,Number(state.time.toFixed(2))]);changes++;}
  if(state.phase==='music')events.filter(e=>e.kind==='note').forEach(e=>notes.add(e.i));
  if(state.phase==='clear'&&!clearing)clearing=state;
  if(events.some(e=>e.kind==='bell'))chimes+=events.filter(e=>e.kind==='bell').length;
  peal=Math.max(peal,...state.bells.map(b=>Math.abs(b.angle)*deg));
  travel=Math.max(travel,state.boat.distance);peakSpill=Math.max(peakSpill,...state.vessels.map(v=>v.spill*60));twig=Math.max(twig,...state.twigs.map(b=>Math.abs(b.bend)*deg));
  if(state.phase==='bells'&&!wheel)wheel=state;
  conservationError=Math.max(conservationError,Math.abs(inventory(state)-initial-state.inletVolume));
  assert.ok(conservationError<1e-8,'water conservation');
  compare(old,state);save(label,state);old=state;if(tick===200)firstTen=state;
  if(endOnCycle&&state.cycle)break;
 }
 return {state:old,firstTen,stages,notes:[...notes],clearing,wheel,peal,travel,peakSpill,twig,chimes,changes};
}
const idle=trial('idle',10),weak=trial('light',10,(w,k)=>{if(k===1)w.setRain(.2);}),
 strong=trial('heavy',10,(w,k)=>{if(k===1)w.setRain(2);});
assert.ok(idle.state.vessels[0].hits>10&&idle.state.vessels.slice(1).every(v=>v.hits===0));
assert.ok(strong.state.vessels[0].litres>3*weak.state.vessels[0].litres);
assert.ok(strong.state.vessels[0].pitch<weak.state.vessels[0].pitch);
assert.ok(idle.twig>0);
const cycle=trial('cycle',330,null,true);
assert.deepEqual(cycle.stages.map(v=>v[0]),['gather','cascade','music','clear','boat','wheel','bells','return','gather']);
assert.equal(cycle.notes.length,5);assert.ok(cycle.state.time>120&&cycle.wheel.wheel.lifted>.22);
assert.ok(cycle.state.boat.distance<.001);assert.ok(cycle.clearing.vessels.every((v,i)=>v.litres>.99*vessels[i].capacity));
// Drag to a remote vessel and release while moving. Angular momentum must persist.
let released,afterRelease;
const touch=trial('drag-and-play',310,(w,k)=>{
 if(k===21){w.s.held=true;w.setAim(angles[4]);}
 if(k===27){released=w.s.angle;w.release();}
 if(k===28)afterRelease=w.s.angle;
 if(w.s.phase==='boat'&&k%28===0)w.push(.8);
 if(w.s.phase==='wheel'&&k%31===0)w.push(.7);
 if(w.s.phase==='bells'&&k%45===0)w.ringBell(k%7%3,.86);
},true);
assert.ok(afterRelease>released&&touch.state.cycle===1&&touch.chimes>=3);
assert.ok(touch.firstTen.vessels[4].litres>.1);
assert.ok(Object.values(uniform).every(v=>v===0));assert.ok(Object.values(moving).every(v=>v>0));
assert.ok(maximum.water_mL<10&&maximum.pitch_Hz<9&&maximum.angle_deg<20&&maximum.boat_percent<2&&maximum.film_mL<=2/60*dt*1000,JSON.stringify(maximum));
const syncA=makeWorld(),syncB=makeWorld();syncA.step(10);for(let i=0;i<200;i++)syncB.step(.05);assert.deepEqual(syncA.getState(),syncB.getState());
const headers=['run','time_s','phase',...columns],file=path.join(__dirname,'state-trace.csv.gz');
fs.writeFileSync(file,zlib.gzipSync(headers.join(',')+'\n'+rows.join('\n')+'\n',{level:9}));
const {rainResponse}=require('./sound.js');const near=rainResponse(2),far=rainResponse(10);
assert.ok(near.frequency>far.frequency&&near.gain>far.gain);
const results={rain_center_Hz:[near.frequency,far.frequency],samples:rows.length,dt,stages:cycle.stages,idle10:{litres:idle.state.vessels[0].litres,pitch:idle.state.vessels[0].pitch,
 hits:idle.state.vessels[0].hits,twig_deg:idle.twig},rain10:[weak,strong].map(t=>({flow:t.state.rain,litres:t.state.vessels[0].litres,hits:t.state.vessels[0].hits})),
 release_deg:[released,afterRelease].map(v=>v*deg),peakOverflow_L_min:cycle.peakSpill,notes:cycle.notes.length,
 wheelL:cycle.wheel.wheel.lifted,boatPercent:cycle.travel/2.28*100,playedBellPeak_deg:touch.peal,chimeNotes:touch.chimes,
 maximum,uniform,moving,volume_error_L:conservationError};
console.log(JSON.stringify(results,null,2));
