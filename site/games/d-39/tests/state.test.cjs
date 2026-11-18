'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {createGame,M,patches,NX,NZ}=require('../simulation.js');
const step=.05,rows=[],max={wave:0,boot:0,mass:0,leaf:0,boat:0,drop:0,channel:0,cup:0,lamp:0};
let uniform=0,checked=0,intervals=0,localChecks=0,uniformLocal=0;
let chainPeak=0,moteSpeed=0,wheelSpeed=0,keyTravel=0;
const mm=d=>d*M*1000;
function compact(n){return Math.round(n*1e6)/1e6;}
function trace(name,g,duration,control=()=>{},measure=()=>{}){
  let prev=null;
  for(let i=0;i<=Math.round(duration/step);i++){
    if(i){control(g,i*step);g.step(step);}
    const s=g.world;
    chainPeak=Math.max(chainPeak,...s.chain.map(l=>Math.abs(l.angle)*180/Math.PI));moteSpeed=Math.max(moteSpeed,...s.motes.map(m=>Math.hypot(m.vx,m.vy)*M));
    wheelSpeed=Math.max(wheelSpeed,Math.abs(s.wheelSpeed));keyTravel=Math.max(keyTravel,...s.keys.map(k=>Math.abs(k)*.052*M*1000));
    const snap={chain:s.chain.map(l=>({...l})),motes:s.motes,wheelAngle:s.wheelAngle,wheelSpeed:s.wheelSpeed,trace:name,t:compact(s.time),phase:s.phase,cycle:s.cycle,hits:s.hits,active:s.active,hint:s.hint,serial:s.serial,
      boots:s.boots.map(b=>({...b})),boat:{...s.boat},leaves:s.leaves.map(l=>({...l})),
      drops:s.drops.map(d=>({...d})),falling:s.fallingBeads.map(d=>({...d})),rainDrops:s.rainDrops,
      pools:s.pools.map(q=>({height_10um:Array.from(q.h,n=>Math.round(n*1e5)),velocity_100um_s:Array.from(q.v,n=>Math.round(n*1e4))})),
      rings:s.rings,channel:s.channel.map(c=>({...c})),outflow:s.outflow,roof:s.roof,rain:s.rain,
      cutoff:s.cutoff,cup:s.cupAngle,volume:s.catchment,lamp:s.lamp,dusk:s.dusk,wind:s.wind,sky:s.skyLight,
      keys:s.keys,spills:s.spills,last:s.last,landings:s.landingCount,strokes:s.brushCount};
    rows.push(JSON.stringify(snap,(_,v)=>typeof v==='number'?compact(v):v));
    if(prev){
      intervals++;
      for(const diffs of [s.leaves.map((l,i)=>l.x-prev.s.leaves[i].x),s.chain.map((l,i)=>l.angle-prev.s.chain[i].angle),s.channel.map((c,i)=>c.water-prev.s.channel[i].water)]){
        const lo=Math.min(...diffs),hi=Math.max(...diffs);
        if(Math.max(Math.abs(lo),Math.abs(hi))>1e-8){localChecks++;if(hi-lo<1e-10)uniformLocal++;}
      }
      s.pools.forEach((p,k)=>{
        let lo=Infinity,hi=-Infinity;
        for(let j=0;j<p.h.length;j++)if(p.mask[j]){
          const change=p.h[j]-prev.h[k][j];assert(Number.isFinite(change));lo=Math.min(lo,change);hi=Math.max(hi,change);
          max.wave=Math.max(max.wave,Math.abs(change)*1000);
        }
        if(Math.max(Math.abs(hi),Math.abs(lo))>1e-9){checked++;if(hi-lo<1e-10)uniform++;}
      });
      s.boots.forEach((b,j)=>{const a=prev.s.boots[j];max.boot=Math.max(max.boot,mm(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)));max.mass=Math.max(max.mass,Math.abs(b.mass-a.mass));assert(Math.abs(b.mass-.46-.2*b.fill)<1e-9);});
      s.leaves.forEach((l,j)=>{const a=prev.s.leaves[j];max.leaf=Math.max(max.leaf,mm(Math.hypot(l.x-a.x,l.z-a.z)));});
      const a=prev.s.boat;max.boat=Math.max(max.boat,mm(Math.hypot(s.boat.x-a.x,s.boat.y-a.y,s.boat.z-a.z)));
      for(const d of s.drops){const a=prev.s.drops.find(o=>o.id===d.id);if(a)max.drop=Math.max(max.drop,mm(Math.hypot(d.x-a.x,d.y-a.y,d.z-a.z)));}
      s.channel.forEach((c,j)=>{max.channel=Math.max(max.channel,Math.abs(c.water-prev.s.channel[j].water));assert(c.water>=0);});
      max.cup=Math.max(max.cup,Math.abs(s.cupAngle-prev.s.cup)*180/Math.PI);
      max.lamp=Math.max(max.lamp,Math.abs(s.lamp-prev.s.lamp));
    }
    prev={s:snap,h:s.pools.map(p=>p.h.slice())};measure(s,i*step);
  }
}
let idleWave=0,hintAt=0;
const idle=createGame(),leaf0={...idle.world.leaves[0]},light0=idle.world.skyLight;
trace('idle',idle,10,undefined,(s,t)=>{
  for(const p of s.pools)for(const h of p.h)idleWave=Math.max(idleWave,Math.abs(h)*1000);
  if(!hintAt&&s.hint>0)hintAt=t;
});
const idleLeaf=mm(Math.hypot(idle.world.leaves[0].x-leaf0.x,idle.world.leaves[0].z-leaf0.z));
assert(idle.world.landingCount>1&&idleWave>.1&&idleLeaf>0&&hintAt>=4&&hintAt<=4.1);
function impact(speed){
  const g=createGame();let peak=0;
  trace('speed-'+speed,g,3,(g,t)=>{if(t===.05)assert(g.stepAt(speed));},s=>{
    for(const d of s.drops)peak=Math.max(peak,(d.y-.028)*M);
  });
  assert.equal(g.world.last.speed,speed);assert.equal(g.world.phase,0);
  return {...g.world.last,sampledCm:peak*100,mass:g.world.boots[0].mass};
}
const slow=impact(.4),fast=impact(1.8);assert(Math.abs(fast.height/slow.height-20.25)<1e-10);
assert(fast.sampledCm>slow.sampledCm*16&&fast.sampledCm<=fast.height*100+.01);
const story=createGame(),phases=[],notes=new Set(),materials=new Set();
let next=0,lastEvent=0,deepFreq=0,minRoof=8000,minFoot=8200,maxFill=0,maxFlux=0,maxCup=0,maxLamp=0,maxBoatTilt=0,maxRain=0,movedLeaf=0,spillCount=0,under=0,wetTime=null,endTime=null;
const arrivals=new Array(12).fill(null);
trace('street',story,48,(g,t)=>{
  const s=g.world;if(s.cycle)return;
  // Explore each fluid patch by finger, then use the same boot controls as the page.
  if(s.phase<=1&&s.hits===1&&s.boots.every(b=>b.mode==='rest')){
    const p=patches[s.phase];g.stroke(p.x+.08*Math.cos(t),p.z+.12*Math.sin(t),.12,-.10);
  }
  if(s.phase===2&&s.rain>.4&&s.catchment>.50&&s.catchment<.60)g.pullCup(.85);
  else if(s.cupHeld)g.pullCup(null);
  if(t>=next&&s.wait===0&&s.boots.every(b=>b.mode==='rest')&&!s.returning){
    const worked=g.begin(true);assert(worked);g.drag(1,1.24);g.release(1.24);next=t+2.3;
  }
},(s,t)=>{
  if(phases.at(-1)!==s.phase)phases.push(s.phase);
  if(s.cycle&&!endTime)endTime=t;
  for(const e of s.events)if(e.id>lastEvent&&e.kind==='step'){
    materials.add(e.material);if(e.depth===4)deepFreq=e.bottomHz;if(e.material==='tile')notes.add(e.bottomHz);
    minFoot=Math.min(minFoot,e.footCutoff);
  }
  lastEvent=s.serial;maxFill=Math.max(maxFill,...s.boots.map(b=>b.fill));
  minRoof=Math.min(minRoof,s.cutoff);maxFlux=Math.max(maxFlux,s.outflow);
  maxCup=Math.max(maxCup,s.cupAngle);maxLamp=Math.max(maxLamp,s.lamp);maxRain=Math.max(maxRain,s.rain);
  maxBoatTilt=Math.max(maxBoatTilt,Math.abs(s.boat.roll));movedLeaf=Math.max(movedLeaf,...s.leaves.map(l=>Math.hypot(l.vx,l.vz)*M));
  spillCount=Math.max(spillCount,s.spills);if(s.underRoof)under++;
  for(let i=0;i<12;i++)if(arrivals[i]===null&&s.channel[i].water>.005)arrivals[i]=t;
  if(s.phase===2&&wetTime===null)wetTime=t;
});
assert.deepEqual(phases,[0,1,2,3,0]);assert.equal(materials.size,4);assert(under>0&&notes.size>=2);
assert(spillCount>0&&minRoof<1800&&maxFlux>.01&&maxLamp>.8&&maxCup>.5);
assert(arrivals.every((v,i)=>v!==null&&(!i||v>arrivals[i-1])));assert(story.world.brushCount>0);
function liftTime(fill){
  const g=createGame(),b=g.world.boots[0];b.fill=fill;b.mass=.46+.2*fill;let hit;
  trace('lift-'+fill,g,2.7,(g,t)=>{if(t===.05)g.stepAt(.86);},(s,t)=>{if(s.last&&hit===undefined)hit=t;});return hit;
}
const lightTime=liftTime(0),heavyTime=liftTime(2);assert(heavyTime>lightTime);
// Check integration independence and strict locality using the same random seed.
const a=createGame(),b=createGame();a.step(1);for(let i=0;i<20;i++)b.step(.05);
assert.deepEqual(a.getState(),b.getState());
assert.equal(uniform,0);assert(max.wave<16&&max.boot<135&&max.mass<.1&&max.leaf<42&&max.boat<42,JSON.stringify(max));
assert.equal(uniformLocal,0);
// Continuous play explores the second visit's musical waterwheel and repeated returns.
const long=createGame(719),visited=new Set();let longNext=.5,lastSerial=0,tines=0,spins=0,nextWheelEnd=0;
for(let frame=0;frame<=3600;frame++){
  const t=frame*step,s=long.world;
  if(s.phase===2&&s.connected&&nextWheelEnd===0){nextWheelEnd=t+3.5;long.turnWheel(.82);spins++;}
  if(nextWheelEnd>0&&t>=nextWheelEnd)long.turnWheel(null);
  if(s.phase!==2)nextWheelEnd=0;
  if(t>=longNext&&s.wait===0&&!s.returning&&s.boots.every(b=>b.mode==='rest')&&(!nextWheelEnd||t>=nextWheelEnd)){
    long.stepAt(.4+1.4*((frame%37)/36));longNext=t+2.4;
  }else if(s.phase<2&&frame%11===0){const p=patches[s.phase];long.stroke(p.x,p.z,.08,-.12);}
  visited.add(s.phase);
  for(const e of s.events)if(e.id>lastSerial&&e.kind==='tine')tines++;
  lastSerial=s.serial;
  rows.push(JSON.stringify({trace:'three-minutes',t:compact(t),cycle:s.cycle,phase:s.phase,boots:s.boots.map(b=>[b.x,b.y,b.z,b.mass].map(compact)),wheel_rad:compact(s.wheelAngle),flux_L_s:compact(s.outflow),lamp:compact(s.lamp)}));
  if(frame<3600)long.step(step);
}
assert(long.world.cycle>=3&&visited.size===4&&tines>0&&spins>=3);
fs.writeFileSync(path.join(__dirname,'samples.jsonl.gz'),zlib.gzipSync(rows.join('\n')+'\n',{level:8}));
const result={sampleInterval_s:step,samples:rows.length,intervals,checkedWetGridIntervals:checked,uniformChanges:uniform,localChecks,uniformLocal,chainPeak_deg:chainPeak,moteSpeed_m_s:moteSpeed,wheelSpeed_rad_s:wheelSpeed,keyTravel_mm:keyTravel,continuousPlay:{seconds:180,cycles:long.world.cycle,tines,spins},
  grid:[NX,NZ],idle:{seconds:10,beadsLanded:idle.world.landingCount,peakWave_mm:idleWave,leafDrift_mm:idleLeaf,hint_s:hintAt,skyChange:idle.world.skyLight-light0},
  slow,fast,peakRatio:fast.height/slow.height,lightTime,heavyTime,phases,endTime,deepFreq,notesHz:[...notes],
  minRoofHz:minRoof,minFootHz:minFoot,maxFill_cm:maxFill,peakOutflow_L_s:maxFlux,cupAngle_deg:maxCup*180/Math.PI,maxLamp,maxRain,boatRoll_deg:maxBoatTilt*180/Math.PI,peakLeafSpeed_m_s:movedLeaf,
  channelArrivals_s:arrivals,spills:spillCount,strokes:story.world.brushCount,maxNeighborDelta:max};
const resultText=JSON.stringify(result,(_,v)=>typeof v==='number'?compact(v):v,2);
fs.writeFileSync(path.join(__dirname,'measurements.json'),resultText+'\n');console.log(resultText);
