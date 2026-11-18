'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {once}=require('node:events');
const V=require('../simulation.js');
const DT=.05,round=(v,d=6)=>Number(v.toFixed(d));
const span=a=>Math.max(...a)-Math.min(...a),rms=a=>Math.sqrt(a.reduce((n,v)=>n+v*v,0)/a.length);
const bounds=()=>({lo:Infinity,hi:-Infinity,jump:0,nonuniform:0});
const fields=['distance','speed','roll','wind','crowns','water','flags','wing','birdY','motesX','chimes','boards','door','drive','scope','riverGain','riverDistance','windowLight'];
function sample(s){
  return {distance:[s.distance],speed:[s.speed],roll:[s.roll.q/V.DEG],wind:s.wind.map(w=>w.speed),
    crowns:s.crowns.map(p=>p.q/V.DEG),water:s.water.map(p=>p.h),flags:s.flags.map(p=>p.q/V.DEG),
    wing:s.birds.flatMap(b=>[b.wingL.q/V.DEG,b.wingR.q/V.DEG]),birdY:s.birds.map(b=>b.y),
    motesX:s.motes.map(m=>m.x),chimes:s.chimes.map(c=>c.q/V.DEG),boards:s.boards.map(b=>b.q),
    door:[s.door.q],drive:[s.drive.q],scope:[s.scope.q],riverGain:[s.riverGain],riverDistance:[s.riverDistance],
    windowLight:[s.windowLight.q]};
}
async function main(){
  const log=zlib.createGzip({level:6}),file=fs.createWriteStream(path.join(__dirname,'trace.ndjson.gz'));log.pipe(file);
  const scenarios={},complete=[];
  async function run(name,m,count,control,saveFull=false){
    const metrics=Object.fromEntries(fields.map(k=>[k,bounds()])),rolls=[],first=sample(m.state);
    let generation=null,prev=null,frames=0,respawns=0,stop=false;
    for(let i=0;i<=count;i++){
      if(i){control?.(m,i);m.step(DT);}
      const s=m.state,now=sample(s);
      assert(s.speed<=6.00000001&&s.speed>=0&&Math.abs(s.roll.q)<=3*V.DEG);
      assert(s.wind.every(w=>w.speed>=0&&w.speed<=4));
      rolls.push(now.roll[0]);
      for(const key of fields){
        const a=now[key],stat=metrics[key],changes=[];
        for(let k=0;k<a.length;k++){
          assert(Number.isFinite(a[k]),key);
          stat.lo=Math.min(stat.lo,a[k]);stat.hi=Math.max(stat.hi,a[k]);
          if(!prev)continue;
          const d=a[k]-prev[key][k];
          // Recycled dust is fully faded at its old boundary before re-entry.
          if(key==='motesX'&&generation[k]!==s.motes[k].generation){assert(s.motes[k].opacity<.011+4*.45*DT);respawns++;continue;}
          stat.jump=Math.max(stat.jump,Math.abs(d));changes.push(d);
        }
        if(changes.length>1&&span(changes)>1e-8)stat.nonuniform++;
      }
      const packet=saveFull?{scenario:name,...s}:{scenario:name,t:s.time,phase:s.phase,held:s.held,...now,
        dustOpacity:s.motes.map(m=>m.opacity),strikes:s.strikes,walk:s.walk,scopeYaw:s.scopeYaw.q,wheelAngle:s.wheelAngle};
      if(!log.write(JSON.stringify(packet,(_,v)=>typeof v==='number'?round(v):v)+'\n'))await once(log,'drain');
      frames++;prev=now;generation=s.motes.map(p=>p.generation);
      if(name==='journey'&&complete.at(-1)!==s.phase){complete.push(s.phase);if(i&&s.phase==='morning')stop=true;}
      if(stop)break;
    }
    assert(metrics.speed.jump<.061,'speed discontinuity '+metrics.speed.jump);
    assert(metrics.distance.jump<=.30001,'rope displacement');
    assert(metrics.roll.jump<.40&&metrics.water.jump<.025&&metrics.wind.jump<.19,'environment discontinuity');
    assert(metrics.flags.jump<6&&metrics.crowns.jump<1&&metrics.wing.jump<31&&metrics.boards.jump<.004,'segment discontinuity');
    assert(metrics.motesX.jump<.11&&metrics.chimes.jump<8,'particle/pendulum discontinuity');
    const out={frames,seconds:round(m.state.time),first,final:prev,metrics,rollRms:rms(rolls),respawns};
    scenarios[name]=out;return out;
  }
  const idle=V.create();assert.equal(idle.press('scope'),false);
  const normal=await run('idle',idle,200,null,true);
  assert.equal(idle.state.distance,0);assert(idle.state.hint);
  for(const key of ['wind','water','flags','crowns','wing','motesX'])assert.equal(normal.metrics[key].nonuniform,200,key+' moved identically');
  const calm=V.create({wind:0}),windy=V.create({wind:0});
  assert.deepEqual(calm.getState(),windy.getState());windy.setWind(4);
  const a=await run('calm',calm,200,null,true),b=await run('wind4',windy,200,null,true);
  assert(a.rollRms===0&&b.rollRms>.1&&b.final.flags[6]>a.final.flags[6]+2);
  const coasting=V.create();coasting.press('cabin');let releaseAt,coastEnd;
  const coast=await run('release',coasting,340,(m,i)=>{
    if(i===101){assert(Math.abs(m.state.speed-6)<1e-6);releaseAt=m.state.distance;m.release();}
    if(i>101&&m.state.speed<=0&&coastEnd===undefined)coastEnd=(i-1)*DT-5;
  });
  assert.equal(coasting.state.speed,0);assert(Math.abs(coasting.state.distance-releaseAt-36/1.64)<.001);
  const approach=V.create();approach.press('cabin');
  await run('stationRelease',approach,950,m=>{if(m.state.held&&m.state.distance>=V.MID-5)m.release();});
  assert.equal(approach.state.speed,0);assert(Math.abs(approach.state.distance-V.MID)<.001);
  const trip=V.create();let ridgeStrikes=0,ridgeStart,travelTime;
  const journey=await run('journey',trip,5300,m=>{
    if(!m.state.held&&m.target())m.press(m.target());
    if(m.state.phase==='ridge'){ridgeStart??=m.state.strikes;ridgeStrikes=m.state.strikes-ridgeStart;travelTime=m.state.time;}
  });
  assert.deepEqual(complete,['morning','ride','walk','look','board','climb','ridge','return','morning']);
  assert.equal(trip.state.distance,0);assert(ridgeStrikes>=3);
  // Integrating different caller frame sizes must yield the same internal states.
  const u=V.create(),v=V.create();u.step(10);for(let i=0;i<200;i++)v.step(.05);assert.deepEqual(u.getState(),v.getState());
  // The position function follows the measured arc length, including both sagging spans.
  let maxArcError=0;for(let d=0;d<V.END-.30;d+=.30){const x=V.route(d),y=V.route(d+.30);const chord=Math.hypot(x.x-y.x,x.y-y.y,x.z-y.z);if(d<V.MID&&d+.30>V.MID)continue;maxArcError=Math.max(maxArcError,Math.abs(.30-chord));}
  assert(maxArcError<.00008);
  log.end();await once(file,'close');
  const summary={dt:DT,phases:complete,coastMetres:coasting.state.distance-releaseAt,coastSeconds:coastEnd,
    ridgeStrikes,untilReturn:travelTime,arcErrorMetres:maxArcError,scenarios};
  fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(summary,(_,v)=>typeof v==='number'?round(v):v,2)+'\n');
  console.log('PASS — 0.05 s samples. Idle, identical initial state with wind 0/4, release, complete round trip, deterministic stepping, cable arc length.');
  console.log('duration',journey.seconds,'s; coasting',round(summary.coastMetres),'m;',coastEnd,'s; strikes',ridgeStrikes,'; roll RMS calm/windy',round(a.rollRms),round(b.rollRms),'deg');
  for(const k of fields){const m=journey.metrics[k];console.log(k,round(m.lo),round(m.hi),'largest adjacent delta across trials',round(Math.max(...Object.values(scenarios).map(x=>x.metrics[k].jump))));}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
