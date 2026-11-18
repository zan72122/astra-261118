'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {create,TAU}=require('./mechanism');
const dt=.05, mm=100/3, logs=[],max={},rows={};
const r=x=>Number(x.toFixed(6));
const popStats={idleSamples:0,uniformMoving:0,activeTeethSamples:0};
function snapshot(s){
  return {
    time:s.clock,box:s.box,phase:s.phase,spring:s.spring,torque:s.torque,
    drum:s.angle,speed:s.omega,key:s.keyAngle,gear:s.gearAngle,gearReveal:s.gearReveal,
    pinDepth:s.pins.filter(p=>p.extra).map(p=>p.depth),
    flex:s.teeth.map(t=>t.x),contacts:s.teeth.map(t=>t.contacts),lastHz:s.lastHz,
    doll:s.dollAngle,sway:s.sway,visits:s.visits.map(q=>q.lift),toySlide:s.toySlide,toyNotes:s.toyNotes,lid:s.lid,boat:s.vessel.x*mm,heel:s.vessel.heel,
    balloon:s.balloon.h*mm,heat:s.balloon.heat,orrery:s.mobile.angle,
    gust:s.wind.map(w=>w.u),water:s.water.map(p=>p.h*mm),
    dustX:s.dust.map(p=>p.x*mm),dustY:s.dust.map(p=>p.y*mm),light:s.lamps.map(p=>p.light)
  };
}
function track(name,g){
  let prev;
  function record(events=[]){
    const v=snapshot(g.s);
    logs.push(JSON.stringify({run:name,...v,events},(k,a)=>typeof a==='number'?r(a):a));
    if(prev){
      for(const k of ['drum','speed','key','gear','gearReveal','flex','pinDepth','doll','sway','toySlide','visits','lid','boat','heel','balloon','orrery','gust','water','dustX','dustY','light']){
        const a=[v[k]].flat(),b=[prev[k]].flat();
        a.forEach((n,i)=>{assert(Number.isFinite(n),k);if(b[i]!==undefined)max[k]=Math.max(max[k]||0,Math.abs(n-b[i]));});
      }
      function diverse(k){const changes=v[k].map((x,i)=>x-prev[k][i]);return Math.max(...changes)-Math.min(...changes)>1e-10;}
      if(name==='idle'){
        for(const k of ['gust','water','dustX','dustY','light'])if(!diverse(k))popStats.uniformMoving++;
        popStats.idleSamples++;
      }
      if(v.box===prev.box && v.flex.some((x,i)=>Math.abs(x-prev.flex[i])>.000001)){
        assert(diverse('flex'),'all tines moved identically');popStats.activeTeethSamples++;
      }
    }
    prev=v;return events;
  }
  record();return ()=>{g.step(dt);return record(g.events());};
}
for(const [name,amount] of [['idle',0],['weak',1.6],['strong',4.8]]){
  const g=create(),start=snapshot(g.s);if(amount)for(let i=0;i<8;i++)g.wind(amount/8);
  const tick=track(name,g),initialTorque=g.s.spring*.024;
  let peakSpeed=0,peakFlex=0;const notes=[];
  for(let i=0;i<200;i++){
    const events=tick();peakSpeed=Math.max(peakSpeed,g.s.omega);
    peakFlex=Math.max(peakFlex,...g.s.teeth.map(t=>Math.abs(t.x)));
    notes.push(...events.filter(e=>e.type==='note'));
  }
  const end=snapshot(g.s);
  rows[name]={amount,initialTorque,peakSpeed,drum:g.s.angle,gear:g.s.gearAngle,key:g.s.keyAngle,clicks:g.s.clickCount,
    notes:notes.length,firstHz:notes[0]?.hz||0,peakFlex,doll:g.s.dollAngle+.24,
    dust:Math.max(...end.dustX.map((x,i)=>Math.hypot(x-start.dustX[i],end.dustY[i]-start.dustY[i]))),
    water:Math.max(...end.water.map((x,i)=>Math.abs(x-start.water[i]))),
    light:Math.max(...end.light.map((x,i)=>Math.abs(x-start.light[i]))),
    boat:end.boat-start.boat,balloon:end.balloon-start.balloon,orrery:end.orrery-start.orrery};
}
assert.equal(rows.idle.notes,0);assert.equal(rows.idle.drum,0);
assert(rows.idle.dust>.2&&rows.idle.water>.2&&rows.idle.light>.02);
assert(rows.strong.peakSpeed>rows.weak.peakSpeed&&rows.strong.notes>rows.weak.notes);
assert(rows.strong.firstHz>rows.weak.firstHz&&rows.strong.clicks>rows.weak.clicks);
assert.equal(popStats.uniformMoving,0);
const repeat=create();repeat.step(10);assert(Math.abs(repeat.s.vessel.x*mm+(.68*mm)-rows.idle.boat)<1e-9);
const suite=create(),cycleTick=track('three-boxes',suite),chapters=[];
for(let chapter=0;chapter<3;chapter++){
  assert.equal(suite.s.box,chapter);
  const history=[0],startTime=suite.s.clock;let added=false,touched=false,closed=false,hitCount=0,latches=0,looped=false;
  let minHeight=Infinity,maxHeight=-Infinity,minX=Infinity,maxX=-Infinity,minOrbit=Infinity,maxOrbit=-Infinity,angleAtDance,angleAtClose,maxDepth=0,bells=0;
  for(let frame=0;frame<2600;frame++){
    const s=suite.s,elapsed=s.clock-startTime;
    if(elapsed<1.3)suite.wind(.28);
    if(s.phase===1&&s.added<3&&frame%14===0){
      assert(suite.pin([2,6,10][s.added],s.angle+.51+s.added*.13));added=true;
    }
    if(s.phase===2&&!touched){angleAtDance=s.dollAngle;suite.dance(.42,true);touched=true;}
    if(s.phase>=2&&!s.closing){
      // Explore each toy at leisure, then close it. There is no time gate.
      if(frame%29===0){
        if(s.toyAwake)suite.playToy(chapter===2?-.46:.46);
        else suite.dance(.46,true);
      }
      if(s.phase===3&&elapsed>40){angleAtClose=s.dollAngle;hitCount=s.addedHits;closed=suite.close();}
    }
    const events=cycleTick();bells+=events.filter(e=>e.type==='bell').length;latches+=events.filter(e=>e.type==='latch').length;
    maxDepth=Math.max(maxDepth,...s.pins.filter(p=>p.extra).map(p=>p.depth),0);
    minHeight=Math.min(minHeight,s.balloon.h);maxHeight=Math.max(maxHeight,s.balloon.h);
    minX=Math.min(minX,s.vessel.x);maxX=Math.max(maxX,s.vessel.x);
    minOrbit=Math.min(minOrbit,s.mobile.angle);maxOrbit=Math.max(maxOrbit,s.mobile.angle);
    if(s.box!==chapter){looped=true;break;}
    if(history.at(-1)!==s.phase)history.push(s.phase);
  }
  assert(looped&&added&&touched&&closed);assert.equal(latches,1);assert.deepEqual(history,[0,1,2,3]);assert(hitCount>0&&bells>0);
  chapters.push({history,bells,seconds:suite.s.clock-startTime,addedHits:hitCount,pinDepth:maxDepth,dollRotation:angleAtClose-angleAtDance,
    boatSpan:(maxX-minX)*mm,balloonSpan:(maxHeight-minHeight)*mm,orbitSpan:maxOrbit-minOrbit});
  for(let i=0;i<54;i++)cycleTick();
}
assert.equal(suite.s.cycles,1);assert.equal(suite.s.box,0);assert(suite.s.lid<.001);
const decel=create();
for(let i=0;i<9;i++)decel.wind(1.18);
const initialPins=decel.s.pins.length,slowTick=track('run-down',decel);
const contact=decel.s.pins[0],pass=[];let priorTurn=-1;
for(let i=0;i<2400;i++){
  const old=decel.s.angle,events=slowTick();
  const turn=Math.floor((decel.s.angle-contact.at)/TAU);
  const notes=events.filter(e=>e.type==='note'&&e.lane===contact.lane);
  if(turn>priorTurn&&notes.length){
    pass.push({time:decel.s.clock,Hz:notes[0].hz,speed:decel.s.omega});priorTurn=turn;
  }assert(decel.s.angle>=old);
}
assert(pass.length>=4&&pass.at(-1).Hz<pass[1].Hz);
assert(pass.at(-1).time-pass.at(-2).time>pass[2].time-pass[1].time);
assert(max.drum<.061&&max.flex<1.4&&max.water<.3&&max.dustX<.42&&max.dustY<.5);
assert(max.key<=7.2*dt+1e-9);
assert(max.lid<.13&&max.pinDepth<.20&&max.doll<.18&&max.orrery<.13);
assert(initialPins>=25&&popStats.activeTeethSamples>100);
const report={stepSeconds:dt,samples:logs.length,rows,chapters,samePinPasses:pass,maximumAdjacentDifferences:max,populations:popStats};
const outputs=path.join(__dirname,'measurements');fs.mkdirSync(outputs,{recursive:true});
fs.writeFileSync(path.join(outputs,'state-005s.ndjson.gz'),zlib.gzipSync(logs.join('\n')+'\n',{level:9}));
const json=JSON.stringify(report,(k,v)=>typeof v==='number'?r(v):v,2);
fs.writeFileSync(path.join(outputs,'summary.json'),json+'\n');console.log(json);
