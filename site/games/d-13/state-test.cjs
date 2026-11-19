'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const {create, TOWN, COAST, trackX} = require('./simulation.js');
const H = .05, digits = x => +x.toFixed(6), max = a => Math.max(...a), abs = Math.abs;
const trace = [], stats = {interval_s: H}, largest = {};
const ranges = {}, phases = {}, deg = x => x * 180 / Math.PI;
const columns = ['run','t_s','stage','distance_m','odometer_m','speed_m_s','lateral_m','blade0_m','blade1_m','townBlade0_m','townBlade1_m','gate_rad','red_A','red_B','car_m','car_m_s','wagon_m','wagon_m_s','buffer_m','sun_rad','ferry_m','ferry_m_s','guide_power'];
for(const [name,n] of [['stalk_rad',24],['water_m',48],['dust_x_m',40],['dust_y_m',40],['dust_z_m',40],['dust_visible',40],['suspension_m',3],['filament',9]])for(let i=0;i<n;i++)columns.push(name+'_'+i);
trace.push(columns.join(','));
function log(run,s) {
  const row=[run,s.elapsed,s.stage,s.distance,s.odometer,s.speed,s.trainX,...s.switches[0].blade,...s.switches[1].blade,s.gate.x,...s.flash,s.car,s.carSpeed,s.wagon,s.wagonSpeed,s.buffer.x,s.sun.x,s.ferry,s.ferrySpeed,s.guide.glow,...s.wind.map(w=>w.x),...s.water.map(w=>w.x),...s.dust.map(p=>p.x),...s.dust.map(p=>p.y),...s.dust.map(p=>p.z),...s.dust.map(p=>p.life),...s.body.map(v=>v.x),...s.filament.map(v=>v.x)];
  trace.push(row.map(v=>typeof v==='number'?digits(v):v).join(','));
}
function measure(a,b){
  // Scene origins are reset inside the opaque dawn transition. Local oscillators
  // and both physical switch assemblies still have to remain continuous there.
  const same = a.journey===b.journey;
  const delta=(key,v,bound)=>{
    assert.ok(Number.isFinite(v)&&abs(v)<=bound+1e-8,key+' '+v+' at '+b.elapsed);
    largest[key]=Math.max(largest[key]||0,abs(v));
  };
  if(same){
    delta('travel_m',b.distance-a.distance,.401);delta('speed_m_s',b.speed-a.speed,.0751);
    delta('lateral_m',b.trainX-a.trainX,.20);delta('wagon_m',b.wagon-a.wagon,.296);
    delta('car_m',b.car-a.car,.141);delta('car_m_s',b.carSpeed-a.carSpeed,.091);
    delta('ferry_m',b.ferry-a.ferry,.063);
    delta('wagon_speed_m_s',b.wagonSpeed-a.wagonSpeed,.3);
  }else assert.ok(a.mist>.99&&b.mist>.99);
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)delta('blade_m',b.switches[i].blade[j]-a.switches[i].blade[j],.032);
  for(let i=0;i<2;i++)delta('lever_rad',b.switches[i].lever.x-a.switches[i].lever.x,.32);delta('gate_rad',b.gate.x-a.gate.x,.06);
  delta('guide_fraction',b.guide.glow-a.guide.glow,.06);
  delta('button_m',b.button.x-a.button.x,.035);delta('coupler_m',b.buffer.x-a.buffer.x,.015);
  delta('sun_rad',b.sun.x-a.sun.x,.002);
  b.filament.forEach((v,i)=>delta('filament_fraction',v.x-a.filament[i].x,1-Math.exp(-H/.45)));
  b.flash.forEach((v,i)=>delta('signal_fraction',v-a.flash[i],.55));
  const section=(a,b,key,bound)=>{
    const diffs=b.map((v,i)=>v.x-a[i].x);
    diffs.forEach(v=>delta(key,v,bound));
    const spread=max(diffs)-Math.min(...diffs);
    ranges[key]=Math.min(ranges[key]??Infinity,spread);
    assert.ok(spread>1e-9,'identical section displacement '+key);
  };
  section(a.wind,b.wind,'stalk_rad',.035);section(a.water,b.water,'water_m',.009);
  b.body.forEach((v,i)=>delta('suspension_m',v.x-a.body[i].x,.003));
  b.dust.forEach((p,i)=>{const q=a.dust[i];
    if(p.life<.051&&q.life<.051)return; // reseeding occurs only after fading out
    delta('dust_m',Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z),.035);
  });
}
function sample(g,run){const prev=g.getState();g.step(H);const next=g.getState();log(run,next);measure(prev,next);return next;}
const idle=create();log('idle',idle.state);const before=idle.getState();
assert.equal(idle.go('start'),false);assert.equal(idle.go('empty'),false);
const airborne=Array(40).fill(0);
for(let i=0;i<200;i++){
  const a=idle.getState(),b=sample(idle,'idle');
  b.dust.forEach((p,j)=>{const q=a.dust[j];if(q.life>.051&&p.life>.051)airborne[j]+=Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);});
}
const end=idle.getState();
assert.equal(end.distance,0);assert.equal(end.stage,'switch');assert.ok(end.idle>=9.999);
stats.idle10s={stalkChange_deg:max(end.wind.map((w,i)=>abs(deg(w.x-before.wind[i].x)))),waterChange_mm:max(end.water.map((w,i)=>1000*abs(w.x-before.water[i].x))),dustVisibleTravel_m:max(airborne)};
let throwDuration=0,bladeTravel=[];
function prep(branch){
  const g=create();g.step(10);assert.ok(g.go('lever'));
  for(let i=0;i<6;i++)sample(g,branch?'outer':'inner');
  assert.ok(abs(g.state.points-1)<1e-10);throwDuration=g.state.throwTime;bladeTravel=g.state.blade.map(x=>abs(x)*1000);
  if(!branch)assert.ok(g.go('lever'));
  for(let i=0;i<6;i++)sample(g,branch?'outer':'inner');
  assert.equal(g.state.branch,branch);assert.ok(g.go('start'));return g;
}
const inside=prep(0),outside=prep(1);let separation=0,waterDifference=0,arrival=0,peak=0,firstFullSpeed=0,carStill=0,minRoadSpeed=9,flipCount=0,reflections=0,tunnelSamples=0,highestGate=0;
let lastRed=outside.state.bell,redTimes=[],prevSpeed=0,accel=0;
for(let i=0;i<2400;i++){
  const a=sample(inside,'inner'),b=sample(outside,'outer');
  if(b.distance<TOWN-45){assert.equal(a.odometer,b.odometer);assert.equal(a.speed,b.speed);}
  accel=Math.max(accel,(b.speed-prevSpeed)/H);prevSpeed=b.speed;
  separation=Math.max(separation,abs(a.trainX-b.trainX));peak=Math.max(peak,b.speed);
  if(!firstFullSpeed&&b.speed===8)firstFullSpeed=(i+1)*H;
  if(b.distance>3&&b.distance<15)assert.ok(abs(b.speed*b.speed-3*b.distance)<1e-6);
  highestGate=Math.max(highestGate,b.gate.x);
  if(b.crossing&&b.gate.x>1.4){minRoadSpeed=Math.min(minRoadSpeed,b.carSpeed);if(b.carSpeed<.001)carStill+=H;}
  if(b.crossing && b.relay>.26 && b.relay<.60)assert.ok(b.flash[b.bell%2]>.95 && b.flash[1-b.bell%2]<.15);
  if(b.bell!==lastRed){flipCount++;redTimes.push(b.elapsed);lastRed=b.bell;}
  if(b.distance>125&&b.distance<176){
    waterDifference=Math.max(waterDifference,...b.water.map((w,j)=>abs(w.x-a.water[j].x)));
    reflections++;
  }
  if(b.distance>=258&&b.distance<324)tunnelSamples++;
  if(b.stage==='townSwitch'){arrival=(i+1)*H;break;}
}
assert.equal(peak,8);assert.ok(firstFullSpeed>=8/1.5&&firstFullSpeed<8/1.5+H);assert.equal(outside.state.distance,TOWN);assert.ok(carStill>1&&flipCount>=10);
assert.ok(separation>=9.5999&&waterDifference>.001);
stats.departure={topSpeed_m_s:peak,acceleration_m_s2:accel,firstRecordedFullSpeed_s:firstFullSpeed,townArrival_s:arrival};
stats.switch={time_s:throwDuration,bladeTravel_mm:bladeTravel,routeSeparation_m:separation};
stats.crossing={maximumGate_deg:deg(highestGate),minimumCarSpeed_m_s:minRoadSpeed,carStopped_s:carStill,relayChanges:flipCount,relayInterval_s:(redTimes.at(-1)-redTimes[0])/(redTimes.length-1)};
stats.bridge={bridgeTransit_s:reflections*H,tunnelTransit_s:tunnelSamples*H,waterDifference_mm:waterDifference*1000};
const g=outside;let loaded=0,loadAccel=0,gap=0,shuntTime=0,buffer=0,night=null,lit=0,highSusp=0,sail=0,shipSpeed=0;
const started=g.state.elapsed, visiting=new Set();
for(let i=0;i<8000;i++){
  const s=g.state;visiting.add(s.stage);if(!phases[s.stage])phases[s.stage]=digits(s.elapsed-10.6);
  if(s.stage==='townSwitch'&&s.age>=1)assert.ok(g.go('lever'));
  if(s.stage==='couple'&&s.age>=1){gap=TOWN-.55-s.wagon;assert.ok(g.go('couple'));}
  if(s.stage==='shunting')shuntTime+=H;
  if(s.stage==='loaded'&&s.age>1)assert.ok(g.go('start'));
  if(s.stage==='shoreRide'){loaded=Math.max(loaded,s.speed);if(s.age>.5&&s.age<2)loadAccel=s.speed/s.age;}
  if(s.stage==='harbour'&&s.age>1){night=s.sun.x;lit=s.filament[2].x;assert.ok(g.go('ferry'));}
  buffer=Math.max(buffer,abs(s.buffer.x));highSusp=Math.max(highSusp,...s.body.map(b=>abs(b.x)));
  sail=Math.max(sail,s.ferry);shipSpeed=Math.max(shipSpeed,s.ferrySpeed);
  sample(g,'coast');
  if(g.state.journey===1)break;
}
assert.equal(g.state.journey,1);assert.equal(g.state.morning,1);assert.equal(g.state.stage,'switch');assert.equal(g.state.distance,0);
assert.ok(abs(loadAccel-.78)<.0001);assert.equal(loaded,5.9);assert.ok(lit>.75&&night<0&&sail>12&&buffer>.001);
assert.deepEqual([...visiting],['townSwitch','couple','shunting','loaded','shoreRide','sunset','harbour','sailing','dawn']);
stats.freight={approach_m:gap,shunt_s:shuntTime,bufferPeak_mm:buffer*1000,loadedTopSpeed_m_s:loaded,loadedAccel_m_s2:loadAccel,suspensionPeak_mm:highSusp*1000};
stats.sunset={altitude_deg:deg(night),windowPower_percent:lit*100};
stats.ferry={travel_m:sail,topSpeed_m_s:shipSpeed,cycle_s:g.state.elapsed-10.6};
stats.maximumAdjacentDifferences=largest;stats.minimumSpreadAmongCells=ranges;
stats.records=trace.length-1;
const dest=path.join(__dirname,'measurements');fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'state-005s.csv.gz'),zlib.gzipSync(trace.join('\n')+'\n',{level:9}));
fs.writeFileSync(path.join(dest,'summary.json'),JSON.stringify(stats,(k,v)=>typeof v==='number'?digits(v):v,2)+'\n');
console.log(JSON.stringify(stats,(k,v)=>typeof v==='number'?digits(v):v,2));
