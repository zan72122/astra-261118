// Run: node games/d-54/tests/state.cjs
// Trace format: one JSON object per 50 ms, gzip compressed. Metres, seconds,
// radians, newtons, hertz. Coordinates and angles are never wrapped in the log.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {createGame}=require('../simulation.js');
const dt=.05,round=v=>Math.round(v*1e6)/1e6, trace=[], report={};
const mags=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function fields(s){
  return {dust:s.dust.flatMap(p=>[p.x,p.y,p.z]),air:s.air.map(a=>a.u),water:s.water.map(q=>q.x),
    leaf:s.leaves.map(q=>q.x),book:s.books.map(b=>b.p),force:s.books.map(b=>b.frictionN),jacket:s.books.map(b=>b.jacket.x),
    contact:s.books.map(b=>b.ripple.x),door:[s.door.x],nose:[s.nose.x],entry:[s.entry.x],view:[s.view.x,s.deskView.x],
    window:s.casements.map(q=>q.x),wheel:[s.wheel.angle],wet:s.wheel.wet.slice(),cup:s.cups.map(c=>c.tilt.x),
    jets:s.cups.map(c=>c.jet.x),sluice:[s.sluice.x],boat:[s.boat.x.x,s.boat.z.x,s.boat.roll.x],
    cover:[s.coverOpen.x],page:[s.page.x],light:[s.light.x],reverb:[s.soundSpace.x],hint:[s.hint.x,s.hintSweep.x]};
}
const maxima={},uniformChecks={},allObserved={};
function logger(name,g){
  let previous;
  return ()=>{
    const s=g.state,next=fields(s);
    for(const [key,array] of Object.entries(next)){
      assert(array.every(Number.isFinite),name+' finite '+key);
      if(previous){
        const deltas=array.map((v,i)=>v-previous[key][i]),abs=Math.max(...deltas.map(Math.abs));
        maxima[key]=Math.max(maxima[key]||0,abs);
        if(['dust','air','water','leaf','wet'].includes(key)||(['book','jacket','contact','window','cup','jets'].includes(key)&&abs>1e-9)){
          assert(Math.max(...deltas)-Math.min(...deltas)>1e-12,'identical increments '+key+' at '+s.seconds);
          uniformChecks[key]=(uniformChecks[key]||0)+1;
        }
      }
    }
    trace.push(JSON.stringify({run:name,t:round(s.seconds),phase:s.phase,cycle:s.cycle,index:s.book,
      cm:s.books.map(b=>b.cm),gapCm:s.books.map(b=>b.gapCm),hz:s.books.map(b=>round(b.toneHz)),
      ...Object.fromEntries(Object.entries(next).map(([k,a])=>[k,a.map(round)]))}));
    previous=next;
  };
}
{
  const g=createGame(),s=g.state,before=g.getState(),record=logger('idle',g);
  let hintOn,waterLo=0,waterHi=0,lightLo=s.light.x,lightHi=s.light.x,leafLo=0,leafHi=0;
  record();
  for(let i=0;i<200;i++){
    g.step(dt);record();
    if(hintOn===undefined&&s.hint.x>.00001)hintOn=s.seconds;
    waterLo=Math.min(waterLo,...s.water.map(q=>q.x));waterHi=Math.max(waterHi,...s.water.map(q=>q.x));
    lightLo=Math.min(lightLo,s.light.x);lightHi=Math.max(lightHi,s.light.x);
    leafLo=Math.min(leafLo,...s.leaves.map(q=>q.x));leafHi=Math.max(leafHi,...s.leaves.map(q=>q.x));
  }
  assert.equal(s.phase,'shelf');assert(s.books.every(b=>b.p===0));assert(hintOn>=4&&hintOn<=4.051);
  const moved=s.dust.map((p,i)=>mags(p,before.dust[i])*1000);assert(Math.min(...moved)>1);
  report.idle={seconds:round(s.seconds),hintSeconds:round(hintOn),dustMinMaxMm:[Math.min(...moved),Math.max(...moved)].map(round),
    waterMinMaxMm:[waterLo,waterHi].map(v=>round(v*1000)),lightRatio:[lightLo,lightHi].map(round),
    leafMinMaxRad:[leafLo,leafHi].map(round),wheelRad:round(s.wheel.angle)};
}
// Identical geometry, RNG, clearance slot width, initial state and finger target.
// Only the first volume's thickness parameter differs between the two runs.
report.thickness=[];
for(const cm of [1.2,4.8]){
  const g=createGame({thickness:[cm,1.2,4.8,3.6],gapCm:[5.1,1.65,5.1,4.0]}),s=g.state,record=logger('thickness-'+cm,g);
  record();g.input(1,'tap');
  for(let i=0;i<240&&!s.books[0].latched;i++){g.step(dt);record();}
  const b=s.books[0];assert(b.latched);report.thickness.push({cm,slotWidthCm:b.gapCm,peakN:round(b.peakN),toneHz:round(b.toneHz),seatSeconds:round(s.seconds)});
}
assert(report.thickness[1].peakN>report.thickness[0].peakN*2);
assert(report.thickness[1].toneHz<report.thickness[0].toneHz);
assert(report.thickness[1].seatSeconds>report.thickness[0].seatSeconds);
// A full play-through, waiting for the in-world demonstration, then following
// it with a continuous drag. Each contact ends with the child's finger lifted.
{
  const g=createGame(),s=g.state,record=logger('journey',g),phases=[],seenCups=new Set();
  let action='',age=0,waterTouch=0,afterRelease=0,thin=1,thick=0,boatStart,boatEnd;
  let doorPeak=0,nosePeak=0,cupPeak=0,leafPeak=0,winPeak=[0,0],pagePeak=0,wetRange=0;
  record();
  for(let i=0;i<7000&&s.cycle<1;i++){
    const key=s.phase+'/'+s.book+'/'+s.turns+(s.phase==='water'?'/'+waterTouch:'');
    if(key!==action){action=key;age=0;}age+=dt;
    if(phases.at(-1)!==s.phase)phases.push(s.phase);
    if(age>=4.25){
      if(s.phase==='water'){
        if(waterTouch<3){const choice=[1,0,2][waterTouch];
          g.input(.25,'begin',choice);g.input(0,'end');seenCups.add(choice);waterTouch++;}
      }else if(['shelf','push','window','sail','pages','ribbon'].includes(s.phase)){
        const duration={shelf:3.8,push:.9,window:2.4,sail:2.9,pages:2.55,ribbon:1.3}[s.phase],
          f=Math.max(0,Math.min(1,(age-4.25)/duration));
        if(!s.held&&age>4.25+duration+.025){/* Motion continues after release. */}
        else {g.input(f,'move');if(f>=1)g.input(0,'end');}
      }
    }
    const q=s.page.x;
    g.step(dt);record();
    if(!s.held&&s.phase==='pages')afterRelease=Math.max(afterRelease,Math.abs(s.page.x-q));
    doorPeak=Math.max(doorPeak,s.door.x);nosePeak=Math.max(nosePeak,s.nose.x);
    cupPeak=Math.max(cupPeak,...s.cups.map(c=>Math.abs(c.tilt.x)));
    leafPeak=Math.max(leafPeak,...s.leaves.map(p=>Math.abs(p.x)));pagePeak=Math.max(pagePeak,s.page.x);
    winPeak=winPeak.map((v,i)=>Math.max(v,s.casements[i].x));
    thin=Math.min(thin,s.soundSpace.x);thick=Math.max(thick,s.soundSpace.x);
    wetRange=Math.max(wetRange,Math.max(...s.wheel.wet)-Math.min(...s.wheel.wet));
    if(s.phase==='sail'&&!boatStart)boatStart=[s.boat.x.x,s.boat.z.x];
    if(s.phase==='pages'&&!boatEnd)boatEnd=[s.boat.x.x,s.boat.z.x];
    for(const e of g.events())allObserved[e.kind]=(allObserved[e.kind]||0)+1;
  }
  assert.equal(s.cycle,1,'cycle must return');assert.equal(s.phase,'shelf');
  assert.equal(seenCups.size,3);assert(s.books.every(b=>!b.latched&&b.p===0));
  assert.deepEqual(phases,['shelf','push','door','window','water','sail','pages','ribbon','return']);
  assert.equal(allObserved.wood,4);assert(afterRelease>1e-5);
  report.journey={seconds:round(s.seconds),phases,woodHits:allObserved.wood,noseMm:round(nosePeak*1000),doorDegrees:round(doorPeak*180/Math.PI),
    windowDeg:winPeak.map(v=>round(v*180/Math.PI)),cupDeg:round(cupPeak*180/Math.PI),boatTravelMm:round(1000*Math.hypot(boatEnd[0]-boatStart[0],boatEnd[1]-boatStart[1])),
    wetSpreadPercent:round(wetRange*100),pageTravelTurns:round(pagePeak),leafPeakRad:round(leafPeak),
    paperAfterReleaseRadPerSample:round(afterRelease*Math.PI),reverbSend:[round(thick*.23),round(thin*.23)]};
}
// Bounds on adjacent samples cover opening, dragging, contact and the return
// journey too. Discrete phase, collision events and tactile inputs are labels.
const limits={dust:.004,air:.008,water:.009,leaf:.08,book:.16,force:1.6,jacket:.016,contact:.002,
  door:.089,nose:.014,entry:.045,view:.055,window:.085,wheel:.18,wet:.26,cup:.08,jets:.075,
  sluice:.07,boat:.05,cover:.17,page:.12,light:.009,reverb:.03,hint:.12};
for(const [k,limit] of Object.entries(limits))assert(maxima[k]<=limit,k+' delta '+maxima[k]+' > '+limit);
report.maxDelta50ms=Object.fromEntries(Object.entries(maxima).map(([k,v])=>[k,round(v)]));
report.nonUniformSamples=uniformChecks;report.traceRows=trace.length;
fs.writeFileSync(path.join(__dirname,'states.jsonl.gz'),zlib.gzipSync(trace.join('\n')+'\n',{level:9}));
console.log(JSON.stringify(report,null,2));
