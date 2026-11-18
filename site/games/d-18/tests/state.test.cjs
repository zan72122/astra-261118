'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {finished} = require('node:stream/promises');
const R = require('../simulation.js');

const dt = 0.05;
const audit = {frames:0, groups:0, uniformChanges:0, grainReplacements:0, dropBirths:0, dropContacts:0};
const maxima = {};
const grow = (key,n) => {
  assert.ok(Number.isFinite(n),key+' must be finite');
  maxima[key] = Math.max(maxima[key]||0,Math.abs(n));
};
const span = values => Math.max(...values)-Math.min(...values);
const difference = (a,b) => a.map((x,i)=>x-b[i]);
const round = x => Math.round(x*1e6)/1e6;
const compact = data => data.map(round);
const trace = zlib.createGzip({level:6});
const output = fs.createWriteStream(path.join(__dirname,'state-trace.ndjson.gz'));
trace.pipe(output);
function record(row){trace.write(JSON.stringify(row)+'\n');}

// The stored coordinates include inactive-to-active particle identities, so a new
// droplet is distinguishable from an existing one jumping across the sea.
function frame(S,sim) {
  return {
    t:round(S.time),mode:S.mode,chapter:S.stage,lap:S.lap,high:S.high,press:S.held,
    xyz:compact(sim.pos(S.s)),s:round(S.s),travel:round(S.travel),v:round(S.v),h:round(S.height),
    lift:round(S.lift),peak:round(S.peak),drive:compact([S.brake,S.button,S.chain,S.chainSpeed]),
    wind:round(S.wind),cloth:compact(S.flags.flat().map(f=>f.a)),
    water:compact(S.water.map(w=>w.h)),wheel:round(S.wheelAngle),hangers:compact(S.cabins.map(c=>c.a)),
    suspension:compact(S.cars.flatMap(c=>[c.heave,c.roll])),
    bay:round(S.baySwitch),signal:round(S.promptHeat),clouds:compact(S.clouds.map(c=>c.x)),boats:compact(S.boats.map(b=>b.y)),gate:round(S.gateAngle),evening:round(S.sunset),lamps:compact(S.lamps.map(l=>l.heat)),
    arms:compact(S.wavers.map(w=>w.a)),dust:S.dust.map(p=>[p.generation,...compact([p.x,p.y,p.z])]),
    drops:S.spray.flatMap((d,i)=>d.life?[[i,d.generation,...compact([d.x,d.y,d.z])]]:[]),
    emitted:S.waveCount
  };
}
function adjacent(a,b) {
  audit.frames++;
  grow('world_m',Math.hypot(...difference(b.xyz,a.xyz)));
  for(const key of ['v','h','lift','travel','wheel','gate','bay','signal','evening','wind'])grow(key,b[key]-a[key]);
  for(const key of ['cloth','water','hangers','lamps','arms','boats','clouds']){
    const changes=difference(b[key],a[key]);
    changes.forEach(x=>grow(key,x));
    // Parts at rest may all remain at zero. A common nonzero increment is suspect.
    if(changes.some(x=>Math.abs(x)>.000003)){
      audit.groups++;if(span(changes)<.0000011){audit.uniformChanges++;}
    }
  }
  b.suspension.forEach((x,i)=>grow(i%2?'bodyRoll_rad':'heave_m',x-a.suspension[i]));
  b.dust.forEach((d,i)=>{if(d[0]!==a.dust[i][0]){audit.grainReplacements++;return;}
    grow('dust_m',Math.hypot(...difference(d.slice(1),a.dust[i].slice(1))));});
  const before=new Map(a.drops.map(d=>[d[0]+':'+d[1],d]));
  b.drops.forEach(d=>{const previous=before.get(d[0]+':'+d[1]);if(!previous){audit.dropBirths++;return;}
    grow('drop_m',Math.hypot(...difference(d.slice(2),previous.slice(2))));before.delete(d[0]+':'+d[1]);});
  audit.dropContacts+=before.size;
}
function sampler(name,sim){
 let previous=frame(sim.state,sim);record({run:name,...previous});
 return ()=>{sim.step(dt);const next=frame(sim.state,sim);adjacent(previous,next);record({run:name,...next});previous=next;return next;};
}
function idle(){
 const sim=R.create(),start=frame(sim.state,sim),advance=sampler('idle',sim);
 let end=start;
 for(let i=0;i<200;i++)end=advance();
 assert.equal(end.s,start.s);assert.equal(end.v,0);
 const changes={};
 for(const key of ['cloth','water','hangers']){
   const ds=difference(end[key],start[key]);changes[key]=[Math.min(...ds),Math.max(...ds)];
   assert.ok(span(ds)>.002);
 }
 assert.ok(sim.state.idle>=9.99);assert.ok(end.wheel-start.wheel>.1);
 return {...changes,wheel_rad:end.wheel-start.wheel,cloud_m:end.clouds[0]-start.clouds[0],boat_m:end.boats[0]-start.boats[0],dust_m:Math.hypot(...difference(end.dust[0].slice(1),start.dust[0].slice(1))),flag0_rad:end.cloth[5]-start.cloth[5]};
}
function ride(cap){
 const sim=R.create({liftLimit:cap}),S=sim.state,advance=sampler('hill-'+cap,sim);
 const chapters=[0];let crest=0,valleySpeed=0,finishTime=0,firstTopSpeed=0,splashHeight=0,waveAngle=0,brightest=0,peakLift=0,gate=0,bodyRoll=0,heave=0,chainSpeed=0;
 let radius=0,passGate=false;
 for(let i=0;i<5000&&!S.lap;i++){
   // Both runs receive the same initial thirty-second press, independent of height.
   sim.press(i<600 || S.mode==='forkLift' || S.mode==='lastLift');
   const before=S.s;advance();
   if(S.stage!==chapters.at(-1)&&!S.lap)chapters.push(S.stage);
   crest=Math.max(crest,S.peak);peakLift=Math.max(peakLift,S.lift);gate=Math.max(gate,S.gateAngle);
   if(before<R.at(8)&&S.s>=R.at(8))valleySpeed=S.v;
   if(S.stage===0&&S.mode==='coast')firstTopSpeed=Math.max(firstTopSpeed,S.v);
   if(S.s>=R.gateTop&&S.s<R.at(22)&&!passGate){
     passGate=true;const p=sim.pos(R.at(21));
     radius=Math.hypot((p[0]-24)/Math.cos(.19),p[1]-22);
   }
   if(S.mode==='arrived'&&!finishTime)finishTime=S.time;
   splashHeight=Math.max(splashHeight,...S.spray.filter(d=>d.life).map(d=>d.y));
   waveAngle=Math.max(waveAngle,...S.wavers.map(w=>w.a));
   brightest=Math.max(brightest,...S.lamps.map(l=>l.heat));
   bodyRoll=Math.max(bodyRoll,...S.cars.map(c=>Math.abs(c.roll)));
   heave=Math.max(heave,...S.cars.map(c=>Math.abs(c.heave)));
   chainSpeed=Math.max(chainSpeed,S.chainSpeed);
 }
 assert.deepEqual(chapters,[0,1,2,3]);assert.equal(S.lap,1);assert.equal(S.alternate,true);
 assert.ok(finishTime>120 && finishTime<230);
 assert.ok(waveAngle>1.5 && brightest>.95 && S.waveCount>15 && splashHeight>.7);
 assert.ok(passGate);assert.equal(gate>.995,cap===8);
 const altOffset=Math.abs(R.sample(R.at(34),false,0,true)[0]-R.sample(R.at(34))[0]);assert.ok(altOffset>=7.9);
 return {cap,crest,peakLift,valleySpeed,firstTopSpeed,finishTime,restartTime:S.time,sprayCount:S.waveCount,splashHeight,
   gate,radial_m:radius,waveAngle,brightest,bodyRoll,heave,altOffset,chainSpeed};
}
async function main(){
 record({dt_s:dt,units:{xyz:'m',travel:'m',v:'m/s',lift:'m',cloth:'rad',water:'m',wheel:'rad',hangers:'rad',suspension:'m,rad',arms:'rad',dust:'generation,x_m,y_m,z_m',drops:'slot,generation,x_m,y_m,z_m',gate:'fraction',lamps:'fraction'}});
 const unattended=idle(),low=ride(2),high=ride(8);
 assert.ok(high.firstTopSpeed>low.firstTopSpeed+2);assert.ok(Math.abs(high.crest-low.crest-6)<.01);
 assert.ok(high.radial_m+1.5<12.75);
 assert.ok(maxima.world_m<1.1 && maxima.v<.50 && maxima.h<.60);
 assert.ok(maxima.cloth<.12 && maxima.water<.035 && maxima.hangers<.02 && maxima.drop_m<.42);
 assert.ok(maxima.dust_m<.06 && maxima.heave_m<.006 && maxima.gate<.09);
 assert.equal(audit.uniformChanges,0);
 // Releasing on the incline permits a bounded, reversible rollback.
 const back=R.create();back.press(true);back.step(8);const height=back.state.height;
 back.press(false);back.step(7);assert.ok(back.state.height<height);assert.ok(back.state.v<=0);back.press(true);back.step(5);assert.ok(back.state.v>1.95);
 // Render-frame partitioning cannot alter deterministic fixed-step dynamics.
 const one=R.create(),many=R.create();one.step(1);for(let i=0;i<20;i++)many.step(.05);
 assert.deepEqual(one.getState(),many.getState());
 trace.end();await finished(output);
 console.log(JSON.stringify({idle:unattended,low,high,maxima,audit},(_,v)=>typeof v==='number'?round(v):v,2));
}
main().catch(err=>{trace.destroy();output.destroy();console.error(err);process.exitCode=1;});
