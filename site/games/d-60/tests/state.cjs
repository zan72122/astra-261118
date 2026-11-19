'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {create,homePath}=require('../simulation.js');
const dt=.05, columns=['run','seconds','phase'], fieldGroups=[];
function field(name,unit,values,limit){
 const sample=values(create().state);fieldGroups.push({name,unit,values,limit});
 sample.forEach((_,i)=>columns.push(name+(sample.length>1?'_'+i:'')+'_'+unit));
}
field('pressure','kPa',s=>[s.pressure],5);
field('air','L',s=>[s.air],.23);
field('handle','m',s=>[s.piston*.201],.12);
field('resistance','N',s=>[s.resistance],.4);
field('rr','ratio',s=>[s.rr],.0003);
field('tyre','mm',s=>s.wheels.flatMap(w=>w.map(c=>c.dent*1000)),1.8);
field('lean','rad',s=>[s.tilt],.012);
field('speed','mps',s=>[s.speed],.23);
field('distance','m',s=>[s.d],.23);
field('fork','mm',s=>[s.fork*1000],4);
field('spokeRotation','rad',s=>[s.spin],1.2);
field('streamer','rad',s=>s.ribbons.flatMap(r=>r.map(c=>c.angle)),.12);
field('bell','rad',s=>[s.bell],.13);
field('echo','ratio',s=>s.echoes,.24);
field('airSpeed','mps',s=>s.wind.map(p=>p.u),.07);
field('stem','rad',s=>s.wind.map(p=>p.angle),.025);
field('dustX','m',s=>s.dust.map(p=>p.x),.018);
field('dustY','m',s=>s.dust.map(p=>p.y),.021);
field('water','mm',s=>s.water.map(c=>c.h*1000),1.4);
field('gate','m',s=>[.31*s.gate],.05);
field('flow','Lps',s=>[s.flow],.06);
field('jet','Lps',s=>s.jet,.06);
field('paddle','ratio',s=>s.paddles,.31);
field('wheel','rad',s=>[s.wheel],.15);
field('bridgeDrum','rad',s=>[s.drum],.15);
field('bridgeLeaves','rad',s=>s.leaves.map(c=>c.angle),.05);
field('sailHeight','m',s=>[1.19*s.sail],.19);
field('cloth','m',s=>s.cloth.map(c=>c.bow),.018);
field('ferryTravel','m',s=>[74*s.boat],.23);
field('heave','mm',s=>[s.heave*1000],1.1);
field('hoseReturn','m',s=>[s.hose*.234],.04);
const lines=[columns.join(',')],stats={},active={},largest={};
function sample(run,sim,t){
 const groups=fieldGroups.map(f=>Array.from(f.values(sim.state))),row=[run,t.toFixed(2),sim.state.phase],prev=stats[run];
 groups.forEach((g,j)=>{
   const {name,unit,limit}=fieldGroups[j];
   g.forEach(v=>{assert.ok(Number.isFinite(v),name+' finite');row.push(Number(v.toFixed(7)));});
   if(!prev)return;
   const deltas=g.map((v,k)=>v-prev[j][k]),amount=Math.max(...deltas.map(Math.abs)),range=Math.max(...deltas)-Math.min(...deltas);
   const q=largest[name]||(largest[name]={max:0,unit,t:0,run:''});
   if(amount>q.max)Object.assign(q,{max:amount,t,run});
   // A lab pressure step applies 250 kPa in one instant. The tyre and stand then
   // relax from their old equilibrium, unlike the gradual fill during normal play.
   const bound=run==='pressure400'&&name==='tyre'?10.5:run==='pressure400'&&name==='lean'?.025:limit;
   assert.ok(amount<bound,`${run} ${t}s ${name}: ${amount} ${unit} >= ${limit}`);
   if(g.length>1&&amount>1e-7){active[name]=(active[name]||0)+1;assert.ok(range>1e-10,`${run} ${t}s ${name} identical active increments`);}
 });
 lines.push(row.join(','));stats[run]=groups;
}
function runner(name,sim){let n=0;sample(name,sim,0);return {step(count=1,before){for(let k=0;k<count;k++){before?.(k,count);sim.step(dt);n++;sample(name,sim,n*dt);}},time:()=>n*dt};}
const distance=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
const idle=create(),start=idle.getState(),idleRun=runner('idle',idle);idleRun.step(200);const idleEnd=idle.getState();
assert.equal(idleEnd.pressure,start.pressure);assert.equal(idleEnd.d,0);assert.equal(idleEnd.phase,'pump');
const idleMotion={
 wind:distance(start.wind.map(x=>x.u),idleEnd.wind.map(x=>x.u)),
 stem:distance(start.wind.map(x=>x.angle),idleEnd.wind.map(x=>x.angle)),
 dust:distance(start.dust.map(x=>x.y),idleEnd.dust.map(x=>x.y))*1000,
 water:distance(start.water.map(x=>x.h),idleEnd.water.map(x=>x.h))*1000};
Object.values(idleMotion).forEach(x=>assert.ok(x>0));
// Identical histories, initial velocities, steering, surface, random forces and controls.
// After initialization only pressure differs. Let the wheel settle under the same load.
const comparison=[];
for(const p of [150,400]){
 const sim=create();sim.state.phase='ready';sim.state.pressure=p;
 // Record the coefficient/force change as initial data, not a transient in a running trace.
 sim.step(1/120);const r=runner('pressure'+p,sim);r.step(60);const rest=sim.getState();
 sim.state.phase='street';sim.state.speed=2;
 const coast=runner('coast'+p,sim);coast.step(20);
 comparison.push({pressure:p,rr:rest.rr,force:rest.resistance,dent:rest.wheels[0][36].dent*1000,coast:sim.state.d,speed:sim.state.speed});
}
assert.ok(comparison[1].dent<comparison[0].dent*.25);assert.ok(comparison[1].coast>comparison[0].coast);
const response=[150,350].map(p=>{const g=create({pressure:p});g.state.piston=g.state.target=1;g.input('lift',0);g.step(.05);return (1-g.state.piston)*.201*1000;});
assert.ok(response[0]>response[1]);
// A completed, settled compression displaces exactly the cylinder capacity.
const volume=create();volume.input('lift',1);volume.step(2);volume.input('lift',0);volume.step(2);assert.ok(Math.abs(volume.state.air-.4)<1e-7);
// Full loop with a real drag-shaped input, coasting, house bell, lock and sail.
const tour=create(),s=tour.state,run=runner('tour',tour),phases=['pump'];let strokes=0,maxSpeed=0,maxFork=0,maxWheel=0,maxRibbon=0,echoPeak=0,flowPeak=0,heave=0,bellDistance=0;
while(s.phase==='pump'&&strokes<15){
 run.step(10,k=>tour.input('lift',(k+1)/10));run.step(5);
 run.step(12,k=>tour.input('lift',1-(k+1)/12));run.step(6);strokes++;
}
assert.equal(s.phase,'ready');phases.push('ready');const pumpedLitres=s.air;
tour.input('release');tour.input('ride');phases.push('street');
let coasted=false,coastSpeed=0,coastDistance=0,restarted=false,gateTime=0,unfurlTime=0;
while(!s.trip&&run.time()<240){
 if(s.phase==='street'&&s.d>7&&!s.bells){tour.input('release');tour.input('bell');bellDistance=s.d;coasted=true;coastSpeed=s.speed;coastDistance=s.d;}
 if(coasted&&!restarted&&s.speed<.02){coastDistance=s.d-coastDistance;restarted=true;tour.input('ride');}
 if(s.phase==='bridge'&&s.phaseAge>4.25)tour.input('wind',.32);
 if(s.phase==='mill'){gateTime+=dt;tour.input('gate',Math.min(1,Math.max(0,(gateTime-3)/1.3)));}
 if(s.phase==='sail'){unfurlTime+=dt;tour.input('sail',Math.min(1,Math.max(0,(unfurlTime-2)/1.5)));}
 run.step();
 maxSpeed=Math.max(maxSpeed,s.speed);maxFork=Math.max(maxFork,Math.abs(s.fork)*1000);maxWheel=Math.max(maxWheel,s.wheelV);maxRibbon=Math.max(maxRibbon,s.ribbons[2][5].angle);
 echoPeak=Math.max(echoPeak,s.echoes[2]);flowPeak=Math.max(flowPeak,s.flow);heave=Math.max(heave,Math.abs(s.heave)*1000);
 if(s.phase!==phases.at(-1))phases.push(s.phase);
}
assert.deepEqual(phases,['pump','ready','street','hill','mill','sail','ferry','bridge','ferry','home','vent','pump']);
assert.equal(s.trip,1);assert.equal(s.pressure,150);assert.ok(s.bells===1&&coastDistance>0&&restarted);
assert.ok(maxWheel>1&&maxRibbon>.25&&flowPeak>.8);
assert.ok(Math.abs(homePath(1).x)+Math.abs(homePath(1).z)<1e-7);
tour.input('lift',1);tour.step(1);tour.input('lift',0);tour.step(1);assert.ok(s.pressure>170);
const out=path.join(__dirname,'state-0.05s.csv.gz');fs.writeFileSync(out,zlib.gzipSync(lines.join('\n')+'\n',{level:9}));
console.log(JSON.stringify({intervalSeconds:dt,rows:lines.length-1,idleMotion,comparison,responseMmAt50ms:response,litresPerStroke:volume.state.air,tour:{seconds:run.time(),strokes,pumpedLitres,phases,maxSpeed,maxFork,maxWheel,maxRibbon,echoPeak,bellDistance,coastSpeed,coastDistance,flowPeak,heave},active,largest},null,2));
