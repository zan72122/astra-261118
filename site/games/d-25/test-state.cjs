'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {Farm,SWATH}=require('./sim.js');
const H=.05,rows=[],stats={speed:0,travel:0,bend:0,tank:0,feed:0,water:0,ripple:0,light:0,bale:0,truck:0,payload:0};
let flatWind=0,flatCrop=0,flatWater=0,checks=0;
const rounded=n=>Number(n.toFixed(6));
function log(name,f,prev){
  const s=f.getState();
  const delta=(x,y)=>Math.abs(x-y);
  let lo=0,hi=0,windLo=0,windHi=0;
  if(prev&&prev.day===s.day){
    const bounds=a=>[Math.min(...a),Math.max(...a)];
    const wb=s.wind.map((v,i)=>v-prev.wind[i]);
    const cb=s.cells.map((c,i)=>c[0]-prev.cells[i][0]);
    const rb=s.ripples.map((v,i)=>v-prev.ripples[i]);
    [lo,hi]=bounds(cb);[windLo,windHi]=bounds(wb);
    if(hi-lo<1e-12)flatCrop++;if(windHi-windLo<1e-12)flatWind++;
    if(Math.max(...rb)-Math.min(...rb)<1e-12)flatWater++;checks++;
    const maxima={
      speed:delta(s.speed,prev.speed),travel:Math.hypot(s.x-prev.x,s.z-prev.z),
      bend:Math.max(-lo,hi),tank:delta(s.tank,prev.tank),
      feed:Math.max(...s.cells.map((c,i)=>delta(c[1],prev.cells[i][1]))),
      water:Math.max(...s.channels.map((v,i)=>delta(v,prev.channels[i]))),
      ripple:Math.max(...rb.map(Math.abs)),light:delta(s.climate,prev.climate),
      bale:delta(s.bale.travel,prev.bale.travel),truck:Math.hypot(s.truck.x-prev.truck.x,s.truck.z-prev.truck.z),
      payload:delta(s.truck.load,prev.truck.load)
    };
    for(const [k,v] of Object.entries(maxima)){assert.ok(Number.isFinite(v),k);stats[k]=Math.max(stats[k],v);}
  }
  rows.push([name,s.clock,s.day,s.stage,s.x,s.z,s.speed,s.odometer,s.reel,s.cutCount,s.tank,s.intake,s.inFlight,s.truck.load,s.depotGrain,s.flow,s.impactRate,s.truck.x,s.truck.z,s.bale.travel,s.bale.v,s.child.seat,s.climate,s.hintPress,s.airTravel,s.cloudCover,s.ripples[0],s.sluice,s.channels[0],s.channels[15],s.waterWheel,windLo,windHi,lo,hi,s.cells[640][0],s.cells[641][0]].map(v=>typeof v==='number'?rounded(v):v).join(','));
  return s;
}
function ten(name,hold){
  const f=new Farm(),initial=f.getState();let last=log(name,f),atRelease;
  const initialCut=f.cells.map(c=>c.cut);
  for(let i=0;i<200;i++){
    if(i===0&&hold)assert.ok(f.press('combine'));
    if(i===Math.round(hold/H)){atRelease=f.speed;f.release();}
    f.step(H);last=log(name,f,last);
    for(let j=0;j<f.cells.length;j++)if(f.cells[j].cut&&!initialCut[j])assert.ok(Math.abs(f.cells[j].x-5.4)<SWATH/2,'outside cutting width');
  }
  assert.equal(last.speed,0);
  if(!hold){
    assert.equal(last.odometer,0);assert.equal(last.cutCount,initial.cutCount);assert.equal(last.tank,0);
    assert.ok(last.hintPress>.01);assert.ok(last.airTravel>1);
  }else assert.ok(atRelease>0);
  return {distance:last.odometer,cut:last.cutCount-initial.cutCount,tank:last.tank,reel:last.reel,
    windDelta:Math.max(...last.wind.map((v,i)=>Math.abs(v-initial.wind[i]))),
    bendDelta:Math.max(...last.cells.map((a,i)=>Math.abs(a[0]-initial.cells[i][0]))),
    rippleDelta:Math.max(...last.ripples.map((v,i)=>Math.abs(v-initial.ripples[i]))),
    airTravel:last.airTravel,coverDelta:last.cloudCover-initial.cloudCover,releaseSpeed:atRelease};
}
const idle=ten('idle',0),short=ten('hold2',2),long=ten('hold6',6);
assert.ok(long.distance>short.distance&&long.cut>short.cut&&long.tank>short.tank);
const wrong=new Farm();assert.equal(wrong.press('truck'),false);wrong.step(.2);assert.ok(wrong.nudges.truck.tilt>0);assert.equal(wrong.odometer,0);
const demo=new Farm();demo.step(3.95);assert.equal(demo.hint.press,0);demo.step(.25);assert.ok(demo.hint.press>0);
const chunk=new Farm(),fine=new Farm();chunk.press('combine');fine.press('combine');chunk.step(2);for(let i=0;i<40;i++)fine.step(.05);assert.deepEqual(chunk.getState(),fine.getState());
const f=new Farm(),initialMass=f.cells.reduce((sum,c)=>sum+(c.cut?c.mass:0),0);
let prev=log('cycle',f),peakFlow=0,peakTank=0,peakStream=0,peakImpact=0,peakAirborne=0,peakWater=0,maxSeat=0,baleDistance=0,peakDusk=0,lowDawn=1,wheelAtDawn=0,seatDwell=0,fullTime=0;
const phases=['harvest'];let lastDayPose;
for(let i=0;i<8000&&!f.day;i++){
  const active=f.active();if(active&&active!==f.held)f.press(active);
  f.step(H);const s=log('cycle',f,prev);
  if(prev.stage!==s.stage)phases.push(s.stage);
  if(!s.day){
    const collected=f.cells.reduce((sum,c)=>sum+c.mass*c.feed,0)-initialMass;
    assert.ok(Math.abs(collected-f.tank-f.intake-f.truck.load-f.inFlight-f.depotGrain)<1e-7,'conservation of grain');
    assert.ok(f.tank<=f.capacity+.0001,'tank capacity');
    assert.ok(f.tank>=0&&f.truck.load>=-1e-8&&f.inFlight>-.000001);
    assert.ok(f.speed>=0&&f.speed<=2.5);
    peakFlow=Math.max(peakFlow,f.flow);peakTank=Math.max(peakTank,f.tank);
    peakStream=Math.max(peakStream,s.grain.length);peakImpact=Math.max(peakImpact,f.impactRate);
    peakAirborne=Math.max(peakAirborne,s.inFlight);peakWater=Math.max(peakWater,s.channels[15]);
    peakDusk=Math.max(peakDusk,s.climate);lowDawn=Math.min(lowDawn,s.climate);
    maxSeat=Math.max(maxSeat,s.child.seat);seatDwell=Math.max(seatDwell,s.child.rest);
    baleDistance=Math.max(baleDistance,s.bale.travel);wheelAtDawn=Math.max(wheelAtDawn,s.waterWheel);
    if(!fullTime&&f.cutCount===f.cells.length)fullTime=f.clock;
  }else lastDayPose={previous:[prev.x,prev.z],next:[s.x+f.dayOffset,s.z],replanted:s.cells.length-s.cutCount};
  prev=s;
}
assert.equal(f.day,1);assert.equal(maxSeat,1);assert.ok(seatDwell>=3);assert.ok(peakStream>1&&peakWater>.23&&f.depotGrain>3);
assert.deepEqual(phases,['harvest','arrival','unload','harvest','finish','bales','ride','dusk','morning','dawn','harvest']);
assert.equal(flatCrop+flatWind+flatWater,0);
assert.ok(stats.speed<=4.9*H+1e-8);assert.ok(stats.travel<=2.5*H+.001);
assert.ok(stats.truck<=5.2*H+.001);assert.ok(stats.bale<=1.65*H+.00001);
assert.ok(stats.bend<.1&&stats.ripple<.01&&stats.water<.1);
// The second parcel must be playable as well, including the longer approach to the barn.
for(let i=0;i<5000&&f.day<2;i++){if(f.active()!==f.held)f.press(f.active());f.step(H);}
assert.equal(f.day,2);
const head='scenario,time_s,day,stage,combine_x_m,combine_z_m,speed_m_s,distance_m,reel_rad,cut_cells,tank_m3,intake_m3,in_flight_m3,truck_m3,depot_m3,flow_m3_s,impact_m3_s,truck_x_m,truck_z_m,bale_distance_m,bale_speed_m_s,seat_fraction,sky_heat,hint_press,air_travel_m,cloud_cover,ripple_m,sluice_fraction,channel0_fraction,channel15_fraction,waterwheel_rad,wind_delta_min,wind_delta_max,bend_delta_min_m,bend_delta_max_m,bend640_m,bend641_m';
fs.writeFileSync(path.join(__dirname,'state-005.csv'),[head,...rows].join('\n')+'\n');
console.log(JSON.stringify({idle,short,long,cycle:{duration:prev.clock,fullTime,phases,peakTank,peakFlow,peakImpact,peakStream,peakAirborne,depot:prev.depotGrain,baleDistance,maxSeat,seatDwell,peakWater,wheelAtDawn,peakDusk,lowDawn,lastDayPose},maxPer005:stats,flatCrop,flatWind,flatWater,checks,samples:rows.length},(k,v)=>typeof v==='number'?rounded(v):v,2));
