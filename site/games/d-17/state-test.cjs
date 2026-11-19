'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {create}=require('./mechanism.js');
const H=.05,radToDeg=180/Math.PI,rows=[],results={},maximum={},changes={},allUniform={};
const copy=v=>Math.round(v*1e5)/1e5;
const vec=(obj,keys)=>keys.map(k=>copy(obj[k]));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function read(s){
 return {t:copy(s.time),stage:s.stage,cycle:s.cycles,
  gears:s.gears.map(g=>[...g.p.map(copy),...vec(g,['angle','omega','tilt','contact']),+g.installed]),
  spring:vec(s.spring,['energy','angle','speed','torque']),pend:vec(s.pend,['a','v']),dial:copy(s.dial),hatch:copy(s.shutter.x),
  ladder:copy(2.66*s.ladder.x),upper:vec(s.upper,['angle','omega']),lift:copy(s.lift.x),roof:copy(s.roof.x),
  bell:vec(s.bell,['a','v','clapper','cv','strikes']),rope:vec(s.rope,['x','v']),
  panes:s.panes.map(p=>vec(p,['a','v'])),tour:vec(s.tour,['u','speed','bank','dive','splash']),
  dust:s.dust.map(d=>vec(d,['x','y','z','vx','vy'])),water:s.water.map(w=>vec(w,['height','velocity'])),
  lamps:s.lamps.map(l=>vec(l,['heat','current'])),sway:copy(s.sway.a),
  birds:s.birds.map(b=>vec(b,['x','y','z','wing','vx','vy','vz'])),houses:s.houses.map(l=>copy(l.heat)),
  hand:vec(s.hand,['a','v','work']),dusk:copy(s.dusk)}
}
function largest(key,deltas){for(const val of deltas){assert(Number.isFinite(val),key);maximum[key]=Math.max(maximum[key]||0,Math.abs(val))}}
function varied(key,deltas){
 const spread=Math.max(...deltas)-Math.min(...deltas);
 if(Math.max(...deltas.map(Math.abs))<=.00002)return; // A fully seated part can be still.
 changes[key]=(changes[key]||0)+1;
 if(spread<.000001)allUniform[key]=(allUniform[key]||0)+1
}
function track(label,config){
 const g=create(config),s=g.state;let prev=read(s);
 function record(v){rows.push(JSON.stringify({run:label,...v}))}
 record(prev);
 function step(){g.step(H);const n=read(s),p=prev;
  const delta=(key,j)=>n[key].map((v,i)=>v[j]-p[key][i][j]);
  largest('gearAngle',delta('gears',3));largest('gearPosition',n.gears.map((v,i)=>distance(v.slice(0,3),p.gears[i].slice(0,3))));
  largest('pend',[n.pend[0]-p.pend[0]]);largest('upper',[n.upper[0]-p.upper[0]]);largest('dial',[n.dial-p.dial]);
  largest('spring',[n.spring[0]-p.spring[0]]);largest('ladder',[n.ladder-p.ladder]);largest('bell',[n.bell[0]-p.bell[0]]);
  largest('clapper',[n.bell[2]-p.bell[2]]);largest('pane',delta('panes',0));largest('hand',[n.hand[0]-p.hand[0]]);
  const airborne=n.birds.map((v,i)=>distance(v.slice(0,3),p.birds[i].slice(0,3)));largest('bird',airborne);varied('flock',airborne);
  const airborneDust=n.dust.map((v,i)=>distance(v.slice(0,3),p.dust[i].slice(0,3)));largest('dust',airborneDust);varied('dust',airborneDust);
  for(const [arr,key] of [['water','water'],['lamps','lampHeat'],['panes','hinge']]){const del=delta(arr,0);largest(key,del);varied(key,del)}
  const town=n.houses.map((v,i)=>v-p.houses[i]);largest('houseHeat',town);varied('districts',town);
  record(n);prev=n;return n
 }
 const wait=seconds=>{for(let i=0;i<Math.round(seconds/H);i++)step()};
 const until=(condition,limit)=>{for(let i=0;i<Math.round(limit/H);i++){if(condition())return;step()}assert(condition(),label+' timed out in '+s.stage)};
 function mount(i){
  assert(g.begin('gear',i));const a=g.rests[i],b=g.sockets[i];
  for(let j=1;j<=30;j++){const u=j/30,e=u*u*(3-2*u);g.move(a.map((v,k)=>v+(b[k]-v)*e+(k===1?.18*Math.sin(Math.PI*u):0)));step()}
  g.release();until(()=>s.gears[i].installed,2)
 }
 return {g,s,step,wait,until,mount}
}
{
 const {g,s,wait}=track('untouched');const initial=g.getState();wait(10);assert.equal(s.stage,'assemble');
 results.idle={dustMaxM:Math.max(...s.dust.map((d,i)=>distance([d.x,d.y],[initial.dust[i].x,initial.dust[i].y]))),
  dustMinM:Math.min(...s.dust.map((d,i)=>distance([d.x,d.y],[initial.dust[i].x,initial.dust[i].y]))),
  lamp0Percent:initial.lamps[0].heat*100,lamp10Percent:s.lamps[0].heat*100,
  surfaceMm:Math.max(...s.water.map((w,i)=>Math.abs(w.height-initial.water[i].height)))*1000,
  swayDegrees:(s.sway.a-initial.sway.a)*radToDeg};
 assert(results.idle.dustMinM>.005);assert(results.idle.surfaceMm>.1);assert(s.idle>=9.99)
}
const speedTrials=[];
for(const toothCount of [14,7]){
 const {s,wait,mount,g,until}=track('teeth-'+toothCount,{teeth:[24,toothCount,18,10]});mount(1);mount(3);
 assert(g.begin('wind'));wait(7);g.release();wait(2.5);
 speedTrials.push({teeth:toothCount,driverRadS:s.gears[0].omega,drivenRadS:s.gears[1].omega});
 if(toothCount===14){until(()=>s.gears.every(w=>w.omega===0),230);results.stall={torqueNm:s.spring.torque,omega:s.gears[0].omega,timeS:s.time}}
}
results.teeth=speedTrials;assert(Math.abs(speedTrials[0].driverRadS-speedTrials[1].driverRadS)<1e-8);
assert(Math.abs(speedTrials[1].drivenRadS/speedTrials[0].drivenRadS-2)<.002);
{
 const {s,g,step,wait,until,mount}=track('round-trip');const seq=['assemble'];
 function stage(name){until(()=>s.stage===name,30);seq.push(name)}
 wait(4.8);assert.equal(g.begin('gear',3),false);assert(g.begin('gear',1));g.move([-2.6,1.9,1.03]);wait(.4);g.release();wait(1.8);
 assert(!s.gears[1].installed);mount(1);wait(6.7);mount(3);stage('wind');
 wait(4.6);g.begin('wind');wait(.56);g.release();wait(1.3);
 assert(s.spring.energy<4.7);g.begin('wind');stage('peek');g.release();results.woundJ=s.spring.energy;
 wait(6);results.mechanism={pendDegrees:s.pend.a*radToDeg,dialDegrees:s.dial*radToDeg,shaftRadS:s.gears[3].omega};
 g.begin('port');stage('climb');wait(5.2);results.climb={dropM:2.66*s.ladder.x,upperRadS:s.upper.omega};
 g.begin('ladder');stage('ascent');stage('bell');wait(4.3);g.begin('rope');wait(.58);g.release();
 const tail=s.bell.a;wait(.25);results.bellTailDeg=Math.abs(s.bell.a-tail)*radToDeg;stage('window');
 wait(4.6);g.begin('window',1);wait(2.0);assert(s.panes[1].a>1&&!s.panes[0].free);
 results.hingeDeg=s.panes[1].a*radToDeg;g.begin('window',0);stage('view');wait(5.1);
 results.strikes=s.bell.strikes;g.begin('bird');stage('flight');const departure=s.time;
 until(()=>s.tour.u>2.09,15);g.begin('bird');g.move([-.14]);
 until(()=>s.tour.u>4.5,15);g.release();stage('landing');
 results.flight={seconds:s.time-departure,wake:s.tour.splash};
 wait(4.6);g.begin('stair');stage('rooftop');stage('lights');wait(4.2);
 const initialHand=s.hand.a;g.begin('hand');wait(2.3);g.release();wait(2.8);
 results.firstLights=s.houses.filter(l=>l.on).length;g.begin('hand');wait(3.5);g.release();wait(1.7);
 g.begin('hand');stage('rest');g.release();results.town={lit:s.houses.filter(l=>l.on).length,workRad:s.hand.a-initialHand};
 until(()=>s.stage==='return',22);seq.push('return');stage('assemble');
 assert.equal(g.next(),1);assert.equal(s.cycles,1);assert(g.begin('gear',1));g.release();
 results.roundTripSeconds=s.time;results.stages=seq
}
// Check consecutive samples in units specific to each mechanism.
// Impacts change velocity at contact, while positions stay continuous.

assert(maximum.gearAngle<.24);assert(maximum.gearPosition<.34);assert(maximum.pane<.13);
assert(maximum.bird<.49);assert(maximum.dust<.04);assert(maximum.water<.015);assert(maximum.houseHeat<.13);
for(const key of ['dust','water','lampHeat','flock','districts','hinge'])assert(changes[key]>30,key);
assert.deepEqual(allUniform,{});
const report={sampleIntervalSeconds:H,samples:rows.length,results,maximum,nonstationarySamples:changes,uniformAtRecordedPrecision:allUniform};
fs.writeFileSync(path.join(__dirname,'state-samples.ndjson.gz'),zlib.gzipSync(rows.join('\n')+'\n',{level:7}));
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
