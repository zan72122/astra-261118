'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {once}=require('node:events');
const {pipeline}=require('node:stream/promises');
const {create}=require('../physics.js');
const dt=.05;
const report={sampleSeconds:dt,scenarios:{},maximumDelta:{},events:{},stages:[]};
const outfile=path.join(__dirname,'samples.ndjson.gz');
const zip=zlib.createGzip({level:6}),done=pipeline(zip,fs.createWriteStream(outfile));
const round=n=>Number(n.toFixed(7));
const data=(objects,fields)=>objects.map(b=>fields.map(k=>round(b[k])));
const bkeys=['x','y','z','vx','vy','vz','pitch','roll','immersed','volume','charge','ride','wet','releases'];
const fkeys=['x','y','z','yaw','roll','speed','load','hoist','pendulum','travel'];
const fields={body:bkeys,ship:fkeys,bird:['x','y','z','vx','vy','vz','flap','energy'],
  crest:['id','x','z','radius','lambda','amp','age'],wake:['id','x','z','width','energy','age'],
  spray:['id','x','y','z','vx','vy','vz'],lap:['id','x','z','r','power'],mote:['x','y','z']};
const gaugeXY=[[-2.16,-1.8],[-1.33,-1.3],[0,1.42],[.55,-5.55],[3.34,-.85],[0,-18],[-2.7,-34.6],[2.9,-33.1]];
const metadata={dt,fields,gaugeXY,encoding:'cells and velocities are base64 ZigZag LEB128 signed deltas from the preceding row of the same run (initially zero), in units of 0.0001 m and m/s. Grid origin (-12.6,-52.2) m, dx=dz=0.6 m, row length 43. Angles are radians.'};
const priorGrid=new Map();
function encoded(values,key){
  let prev=priorGrid.get(key);
  if(!prev){prev=new Int32Array(values.length);priorGrid.set(key,prev);}
  const buf=Buffer.allocUnsafe(values.length*5);let o=0;
  for(let i=0;i<values.length;i++){
    const val=Math.round(values[i]*1e4),delta=val-prev[i];prev[i]=val;
    let bits=(delta<<1)^(delta>>31);
    while(bits>127){buf[o++]=(bits&127)|128;bits>>>=7;}
    buf[o++]=bits;
  }
  return buf.subarray(0,o).toString('base64');
}
const maxima=report.maximumDelta;
function peak(name,val){maxima[name]=Math.max(maxima[name]||0,val);}
function makeRecord(st,sim,name){
  return {run:name,t:round(st.elapsed),stage:st.stage,cycle:st.cycle,tide:round(st.tide),
    gate:round(st.gate),sun:round(st.sun),gust:round(st.gust),passage:round(st.passage),bell:round(st.bellAngle),
    guide:round(st.guideAge),body:data(st.objects,bkeys),received:st.objects.map(b=>b.delivered),
    ship:data(st.fleet,fkeys),bird:data(st.birds,fields.bird),mote:data(st.motes,fields.mote),
    crest:data(st.waves,fields.crest),wake:data(st.wakes,fields.wake),spray:data(st.particles,fields.spray),
    lap:data(st.laps,fields.lap),gauge:gaugeXY.map(q=>round(sim.surface(...q))),
    cells:encoded(st.cells,name+'.h'),velocities:encoded(st.cellVelocity,name+'.v')};
}
async function write(row){if(!zip.write(JSON.stringify(row)+'\n'))await once(zip,'drain');}
const prev=new Map();
let uniformSteps=0,uniformBodies=0,uniformBirds=0,uniformMotes=0,inspected=0;
async function record(sim,name){
  const s=sim.getState(),r=makeRecord(s,sim,name),older=prev.get(name);
  if(older){
    const p=older.s;let min=Infinity,max=-Infinity;
    for(let i=0;i<s.cells.length;i++){
      const d=s.cells[i]-p.cells[i];assert(Number.isFinite(d));
      min=Math.min(min,d);max=Math.max(max,d);peak('gridM',Math.abs(d));
      peak('gridVelocityMps',Math.abs(s.cellVelocity[i]-p.cellVelocity[i]));
    }
    if(max-min<1e-13)uniformSteps++;inspected++;
    const uniform=(list,old)=>{const dy=list.map((b,i)=>b.y-old[i].y);return Math.max(...dy)-Math.min(...dy)<1e-13;};
    if(uniform(s.objects,p.objects))uniformBodies++;
    if(uniform(s.birds,p.birds))uniformBirds++;
    if(uniform(s.motes,p.motes))uniformMotes++;
    s.objects.forEach((b,i)=>{
      const a=p.objects[i];peak('bodyHorizontalM',Math.hypot(b.x-a.x,b.z-a.z));peak('bodyVerticalM',Math.abs(b.y-a.y));
      peak('bodyRollRad',Math.abs(b.roll-a.roll));peak('draftM',Math.abs(b.immersed-a.immersed));
    });
    for(const [i,q] of r.gauge.entries())peak('surfaceM',Math.abs(q-older.r.gauge[i]));
    for(const k of ['tide','gate','sun','bellAngle','passage'])peak(k,Math.abs(s[k]-p[k]));
    s.fleet.forEach((b,i)=>peak('shipHorizontalM',Math.hypot(b.x-p.fleet[i].x,b.z-p.fleet[i].z)));
    s.birds.forEach((b,i)=>peak('birdHorizontalM',Math.hypot(b.x-p.birds[i].x,b.z-p.birds[i].z)));
    const op=new Map(p.particles.map(q=>[q.id,q]));
    for(const q of s.particles)if(op.has(q.id))peak('dropVerticalM',Math.abs(q.y-op.get(q.id).y));
  }
  prev.set(name,{s,r});await write(r);return s;
}
async function idle(){
  const sim=create(),ys=sim.objects.map(()=>[]);let first,guide=0;
  for(let j=0;j<=200;j++){
    const s=await record(sim,'idle10');if(!first)first=s;
    if(!guide&&s.guideAge>0)guide=s.elapsed;
    s.objects.forEach((b,i)=>ys[i].push(b.y));
    if(j<200)sim.step(dt);
  }
  const s=sim.getState();
  const ranges=ys.map(a=>round(Math.max(...a)-Math.min(...a)));
  assert(ranges.every(x=>x>.018));assert.equal(s.stage,0);assert(guide>=4&&guide<=4.06);
  assert.equal(s.objects.filter(b=>b.delivered).length,0);
  assert.equal(sim.touch('down',30,20),false);
  assert.equal(sim.touch('down',-2.8,-34.55),false);
  report.scenarios.idle={seconds:s.elapsed,verticalRangesM:ranges,depthsM:s.objects.map(b=>round(b.immersed)),
    volumesM3:s.objects.map(b=>round(b.volume)),guideStartsS:round(guide),
    gullDisplacementM:round(Math.hypot(s.birds[0].x-first.birds[0].x,s.birds[0].z-first.birds[0].z)),
    moteDisplacementM:round(Math.hypot(...['x','y','z'].map(k=>s.motes[0][k]-first.motes[0][k])))};
}
async function speed(name,speed){
  const sim=create(),x=-2.69,z=-1.75,span=.36,values=[];
  sim.touch('down',x,z,0);
  sim.touch('move',x+span,z,span/speed);sim.touch('up');
  const src=sim.getState().lastWave;let one,oneHalf;
  for(let i=0;i<=50;i++){
    const s=await record(sim,name);values.push(sim.surface(x+span+.76,z));
    const w=s.waves.find(q=>q.id===src.id);assert(Math.abs(w.radius-1.2*i*dt)<1e-9);
    if(i===20)one=w;if(i===30)oneHalf=w;
    if(i<50)sim.step(dt);
  }
  report.scenarios[name]={speedMps:speed,lambdaM:round(src.lambda),sourceAmplitudeM:src.amp,
    radiusAt1sM:round(one.radius),measuredSpeedMps:round((oneHalf.radius-one.radius)/.5),measuredDecayPerS:round(Math.log(one.strength/oneHalf.strength)/.5),amplitudeEnvelopeAfter1sM:round(one.strength),
    sampleAtHalfSecondM:round(values[10])};
  return {src,values};
}
async function gesture(speed,wiggle,name){
  const sim=create(),origin=-2.8,z=-1.7;
  sim.touch('down',origin,z,0);let peak=0,crest=0;
  const end=2.12/speed;
  for(let i=0;i*dt<end+1;i++){
    const t=i*dt;
    if(i>0&&t<=end){
      const distance=t*speed;
      const span=wiggle?.11-Math.abs(distance%.22-.11):distance;
      sim.touch('move',origin+span,z,t);
    }else if(t>end)sim.touch('up');
    const s=await record(sim,name);peak=Math.max(peak,s.lastWave.amp);
    for(const w of s.waves)crest=Math.max(crest,w.strength);
    sim.step(dt);
  }
  return {sourceM:round(peak),crestM:round(crest)};
}
async function journey(){
  const sim=create(),name='voyage',n=sim.objects.length;
  let stroke=null,cool=0,count=0,last=0,loadMax=0,gateMax=0,tideMax=0,maxDrops=0,maxWake=0,maxRun=0,wakeReach=0;
  let maxRise=0,maxCharge=0,maxRelease=0,maxSun=0,maxBell=0,peakFleet=0,maxWaterContact=0,departSurface=0;
  const deliveries=Array(n).fill(null),draftMin=Array(n).fill(9);
  for(let j=0;j<6000;j++){
    const t=j*dt,s=await record(sim,name);
    if(s.stage!==last||j===0){report.stages.push({stage:s.stage,atS:round(t)});last=s.stage;stroke=null;cool=0;}
    tideMax=Math.max(tideMax,s.tide);gateMax=Math.max(gateMax,s.gate);maxSun=Math.max(maxSun,s.sun);maxBell=Math.max(maxBell,Math.abs(s.bellAngle));
    for(let i=0;i<n;i++){const b=s.objects[i];maxCharge=Math.max(maxCharge,b.charge);maxRelease=Math.max(maxRelease,b.releases);
      if(b.delivered&&deliveries[i]===null)deliveries[i]=round(t);
      if(s.stage===3){draftMin[i]=Math.min(draftMin[i],b.immersed);maxWaterContact=Math.max(maxWaterContact,b.ride);}
    }
    for(const b of s.fleet){loadMax=Math.max(loadMax,b.hoist);maxRun=Math.max(maxRun,b.travel);peakFleet=Math.max(peakFleet,b.speed);}
    maxDrops=Math.max(maxDrops,s.particles.length);maxWake=Math.max(maxWake,s.wakes.length);
    for(const p of s.particles)maxRise=Math.max(maxRise,p.y-sim.surface(p.x,p.z));
    if(s.stage===3){
      departSurface=Math.max(departSurface,Math.abs(sim.objects[4].roll));
      for(const p of s.wakes){const b=s.fleet[p.ship??0];if(p.ship!==undefined)wakeReach=Math.max(wakeReach,Math.hypot(b.x-p.x,b.z-p.z));}
    }
    for(const e of sim.events.splice(0))report.events[e.kind]=(report.events[e.kind]||0)+1;
    if(s.cycle){
      report.scenarios.voyage={seconds:round(t),strokes:count,deliveriesS:deliveries,maxTideM:round(tideMax),maxGateRad:round(1.48*gateMax),
        maxSimultaneousDrops:maxDrops,maxSprayAboveSeaM:round(maxRise),maxBellRad:round(maxBell),maxChargeM:round(maxCharge),maxReleases:maxRelease,
        maximumHoistFraction:round(loadMax),maxLiftM:round(maxWaterContact),minimumDraftDuringLoadingM:draftMin.map(round),
        maxWakeSamples:maxWake,maxWakeLengthM:round(wakeReach),maxVesselTravelM:round(maxRun),maxShipSpeedMps:round(peakFleet),
        pontoonRollDuringDepartureRad:round(departSurface),maxSunFraction:round(maxSun)};break;
    }
    if(s.stage===0||s.stage===2){
      const b=(s.stage===0?sim.objects.slice(0,3):sim.objects.slice(3)).find(b=>!b.delivered);
      if(!stroke||stroke.b!==b){
        if(stroke)sim.touch('up');stroke=null;
        if(cool<=0){
          const g=sim.goal(),d=Math.hypot(g.x-b.x,g.z-b.z),ux=(g.x-b.x)/d,uz=(g.z-b.z)/d;
          const x=b.x-ux*1.65-.4*uz,z=b.z-uz*1.65+.4*ux;
          stroke={b,x,z,ux,uz,t};sim.touch('down',x,z,t);count++;
        }else cool-=dt;
      }else if(t-stroke.t<2.35)sim.touch('move',stroke.x+stroke.ux*.93*(t-stroke.t),stroke.z+stroke.uz*.93*(t-stroke.t),t);
      else{sim.touch('up');stroke=null;cool=.43;}
    }
    sim.step(dt);
  }
  assert.deepEqual(report.stages.map(s=>s.stage),[0,1,2,3,4,0]);assert(deliveries.every(Number.isFinite));
  assert.equal(report.events.bell,5);assert.equal(report.events.horn,3);assert(maxRelease>0&&maxWake>75&&gateMax>.98&&tideMax>.97);
  assert(draftMin[3]<.01);assert(sim.objects.every(b=>!b.delivered));
}
(async()=>{
  await write({metadata});
  await idle();const slow=await speed('speed2',2),fast=await speed('speed4',4);
  assert(Math.abs(slow.src.amp-fast.src.amp)<1e-12);assert(slow.src.lambda>fast.src.lambda);
  const difference=Math.max(...slow.values.map((x,i)=>Math.abs(x-fast.values[i])));
  assert(difference>.003);report.scenarios.wavelengthOnlyMaxDifferenceM=round(difference);
  const swell=await gesture(.85,false,'broadSlow'),fastStroke=await gesture(4,false,'broadFast'),wiggle=await gesture(.85,true,'smallSlow');
  assert(swell.sourceM>.20&&fastStroke.sourceM<.073&&wiggle.sourceM<.073);
  report.scenarios.swell={broadSlow:swell,broadFast:fastStroke,smallSlow:wiggle};
  await journey();
  assert.equal(uniformSteps+uniformBodies+uniformBirds+uniformMotes,0);report.spatialCheck={adjacentIntervals:inspected,uniformGridIntervals:uniformSteps,uniformBodyIntervals:uniformBodies,uniformBirdIntervals:uniformBirds,uniformMoteIntervals:uniformMotes,cellsPerInterval:43*104};
  assert(maxima.tide<.01&&maxima.bodyVerticalM<.12&&maxima.bodyHorizontalM<.30&&maxima.gridM<.10&&maxima.surfaceM<.16,JSON.stringify(maxima));
  for(const k of Object.keys(maxima))maxima[k]=round(maxima[k]);
  const a=create(),b=create();a.step(1);for(let j=0;j<20;j++)b.step(.05);
  assert.deepEqual(a.getState(),b.getState());
  zip.end();await done;
  fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{done.catch(()=>{});zip.destroy();console.error(e);process.exitCode=1;});
