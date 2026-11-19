'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const G=require('../simulation.js');
const dt=.05,deg=180/Math.PI,round=n=>Math.round(n*1e6)/1e6;
const rows=[],stats={},data={events:{},max:{},groups:{},shots:0},max=data.max;
const groups=['air','blade','wood','water','reeds','bough','flags','dust','jets'];
for(const k of groups)data.groups[k]={moving:0,uniform:0};
const peak=(key,value)=>{max[key]=Math.max(max[key]||0,Math.abs(value));};
function pack(game,name){
  const s=game.state,b=s.ball;
  return {name,t:round(s.age),hole:s.hole,phase:s.phase,round:s.round,force:round(s.lastForce),
    ball:[b.x,b.y,b.z,b.v,b.s,b.lateral,b.drop,b.spin].map(round),
    charge:round(s.charge),air:s.air.map(a=>round(a.v)),rotor:[s.rotor.angle,s.rotor.omega].map(round),
    blade:s.rotor.blades.map(q=>round(q.bend)),wood:s.wood.map(q=>round(q.bend)),water:s.water.map(q=>round(q.height)),
    reeds:s.reeds.map(q=>round(q.bend)),bough:s.boughs.map(q=>round(q.angle)),
    lift:s.flags.map(q=>round(q.lift)),flags:s.flags.flatMap(f=>f.cloth.map(q=>round(q.bend))),
    dust:s.motes.flatMap(q=>[q.x,q.y,q.z].map(round)),jets:s.drops.map(q=>q.life>0?round(q.y):0),
    flying:s.drops.flatMap((q,i)=>q.life>0?[[i,q.generation,...[q.x,q.y,q.z,q.vy].map(round)]]:[]),
    pump:round(s.pump),pad:round(s.pad.travel),catch:[s.rampCatch.s,s.rampCatch.load].map(round),
    hint:[s.hint.active,round(s.hint.depth)],complete:[...s.completed],events:[]};
}
function recorder(game,name){
  let previous,lastEvent=0;
  function record(){
    const q=pack(game,name);
    for(const e of game.state.events){if(e.id<=lastEvent)continue;lastEvent=e.id;
      q.events.push([e.id,e.type,e.part,round(e.strength)]);
      data.events[e.type]=(data.events[e.type]||0)+1;
    }
    rows.push(JSON.stringify(q));
    if(previous){
      assert(Math.abs(q.t-previous.t-dt)<.00001);
      peak('worldStep',Math.hypot(...q.ball.slice(0,3).map((v,i)=>v-previous.ball[i])));
      peak('velocityStep',q.ball[3]-previous.ball[3]);
      if(q.phase==='roll'&&previous.phase==='roll')peak('rollingVelocityStep',q.ball[3]-previous.ball[3]);
      peak('angleStep',q.rotor[0]-previous.rotor[0]);
      peak('padStep',q.pad-previous.pad);
      for(const k of groups){
        const d=q[k].map((v,i)=>v-previous[k][i]);const hi=Math.max(...d),lo=Math.min(...d);
        if(Math.max(hi,-lo)>1e-6){
          data.groups[k].moving++;
          const spread=k==='dust'?Math.max(...[0,1,2].map(axis=>{
            const values=d.filter((_,i)=>i%3===axis);return Math.max(...values)-Math.min(...values);
          })):hi-lo;
          if(spread<5e-7)data.groups[k].uniform++;
        }
        peak(k+'Step',Math.max(Math.abs(hi),Math.abs(lo)));
      }
      for(const part of q.flying){
        const old=previous.flying.find(p=>p[0]===part[0]&&p[1]===part[1]);
        if(old)peak('dropFlightStep',Math.hypot(part[2]-old[2],part[3]-old[3],part[4]-old[4]));
      }
    }
    previous=q;return q;
  }
  record();return ()=>{game.step(dt);return record();};
}
const idle=G.makeGame(),idleStart=idle.getState(),idleTick=recorder(idle,'idle');
for(let i=0;i<200;i++){
  const r=idleTick();if(r.hint[0]&&!stats.hintAt)stats.hintAt=r.t;
}
assert.equal(idle.state.phase,'ready');assert.equal(idle.state.ball.s,0);
assert(stats.hintAt>=4&&stats.hintAt<=4.05);
stats.windAngle=(idle.state.rotor.angle-idleStart.rotor.angle)*deg;
stats.waterIdle=Math.max(...idle.state.water.map((q,i)=>Math.abs(q.height-idleStart.water[i].height)));
stats.reedIdle=Math.max(...idle.state.reeds.map((q,i)=>Math.abs(q.bend-idleStart.reeds[i].bend)))*deg;
stats.boughIdle=Math.max(...idle.state.boughs.map(q=>Math.abs(q.angle)))*deg;
stats.dustIdle=Math.max(...idle.state.motes.map((q,i)=>Math.hypot(q.x-idleStart.motes[i].x,q.y-idleStart.motes[i].y)));
assert(stats.windAngle>100&&stats.waterIdle>.002&&stats.dustIdle>.1);
function shot(name,hold){
  const game=G.makeGame(),tick=recorder(game,name),s=game.state;
  // Both shots launch at t = 1.95 s, into exactly the same wind and rotor phase.
  for(let i=0;i<39-Math.round(hold/dt);i++)tick();game.press();
  for(let i=0;i<Math.round(hold/dt);i++)tick();
  game.release();
  const initial=s.ball.v,omega=s.rotor.omega,angle=s.rotor.angle;let distance=0,contact=0,bend=0,side=0,brake=0;
  for(let i=0;i<130;i++){
    const before=s.ball.v;tick();
    if(i===0)brake=(before-s.ball.v)/dt;
    if(i===19)distance=s.ball.s;
    contact=s.events.filter(e=>e.type==='sail').length;
    bend=Math.max(bend,...s.rotor.blades.map(b=>Math.abs(b.bend)));
    side=Math.max(side,Math.abs(s.ball.lateral));
  }
  return {initial,angle,omega,distance,contact,bend,side,brake};
}
stats.soft=shot('soft',.10);stats.hard=shot('strong',1.55);
assert.equal(stats.soft.omega,stats.hard.omega);assert.equal(stats.soft.angle,stats.hard.angle);
assert(Math.abs(stats.soft.brake-.981)<.0001);assert(stats.hard.distance>stats.soft.distance*5);
assert.equal(stats.hard.contact,1);assert(stats.hard.side>.12);
const tour=G.makeGame(),s=tour.state,tick=recorder(tour,'garden-tour');
let desired=.4,readyAge=0,bridgeMax=0,jetTop=0,bridgeEntry=null,maxUphill=0,maxDownhill=0,hiddenStart=0;
const order=[],cups=[],chords=new Set();
for(let i=0;i<10000;i++){
  if(s.phase==='ready'){
    readyAge+=dt;
    if(readyAge>=4.3&&(!s.round||s.hole!==0)){
      readyAge=0;desired=[.4,.68,.39][s.hole];tour.press();data.shots++;
    }
  }
  if(s.phase==='charge'&&s.charge+1e-9>=desired)tour.release();
  const prev=s.phase,prevV=s.ball.v,prevS=s.ball.s,prevH=s.hole;
  const q=tick();
  if(s.phase==='cup'&&prev!=='cup')cups.push(s.hole);
  if(s.hole!==prevH)order.push(s.hole);
  if(s.hole===1&&s.phase==='roll'&&prev==='roll'){
    const d=s.ball.v-prevV,h=G.floor(1,s.ball.s)-G.floor(1,prevS);
    if(h>.001)maxUphill=Math.max(maxUphill,-d/dt);
    if(h<-.001)maxDownhill=Math.max(maxDownhill,d/dt);
  }
  bridgeMax=Math.max(bridgeMax,...s.wood.map(q=>Math.abs(q.bend)));
  if(s.events.some(e=>e.type==='bridge')&&bridgeEntry===null)bridgeEntry=s.age;
  if(s.hole===2){
    if(s.ball.s>3.95&&prevS<=3.95)hiddenStart=s.age;
    if(s.ball.s>=6.22&&prevS<6.22)stats.hiddenTime=s.age-hiddenStart;
    if(s.ball.s>3.95&&s.ball.s<6.22)stats.tunnelMin=Math.min(stats.tunnelMin??1,s.ball.y);
  }
  stats.flagBend=Math.max(stats.flagBend||0,...q.flags.map(Math.abs));
  stats.padTravel=Math.max(stats.padTravel||0,q.pad);
  if(q.phase==='garden')stats.allFlagLift=Math.min(...q.lift)*.94;
  jetTop=Math.max(jetTop,...q.jets);if(s.phase==='garden')assert(s.completed.every(Boolean));
  for(const ev of s.events)if(ev.type==='bridge')chords.add(ev.part);
  if(s.round===1&&s.hole===0&&s.phase==='ready')break;
}
assert.deepEqual(cups,[0,1,2]);assert.deepEqual(order,[1,2,0]);assert.equal(s.round,1);assert.equal(s.phase,'ready');
assert(s.completed.every(v=>!v));assert(bridgeMax>.001&&jetTop>.4);
assert(maxUphill>1&&maxDownhill>.2);assert(stats.hiddenTime>.1);
Object.assign(stats,{bridgeMax,bridgePlanks:chords.size,jetTop,maxUphill,maxDownhill,roundTime:s.age});
for(const [k,v] of Object.entries(data.groups)){assert(v.moving>0,k+' did not move');assert.equal(v.uniform,0,k+' all changed identically');}
assert(max.worldStep<.26,'discontinuous ball position');assert(max.waterStep<.02);assert(max.woodStep<.02);
assert(max.dropFlightStep<.31);assert(max.angleStep<.05);assert(max.bladeStep<.035);
// A tap-only player must also be able to pass the ramp, without timing any blade.
const taps=G.makeGame();let tapsUsed=0;
for(let i=0;i<6000&&!taps.state.round;i++){
  if(taps.state.phase==='ready'){taps.press();taps.release();tapsUsed++;}
  taps.step(dt);
}
assert.equal(taps.state.round,1);
const blocked=G.makeGame();blocked.press();blocked.step(.55);blocked.cancel();
assert.equal(blocked.state.ball.v,0);assert.equal(blocked.state.phase,'ready');
const a=G.makeGame(71),b=G.makeGame(71);a.step(10);for(let i=0;i<200;i++)b.step(dt);
assert.deepEqual(a.getState(),b.getState());
// Exercise the real sound dispatcher with a recording AudioParam sink. A release
// can arrive between paint frames without advancing the physics tick.
function checkSound(){
  const pitches=[],vm=require('node:vm');
  const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
  const node=()=>({connect(){},disconnect(){},start(){},stop(){}});
  class Context{
    constructor(){this.sampleRate=8000;this.state='running';this.currentTime=1;this.destination=node();}
    createDynamicsCompressor(){return {...node(),threshold:param(),ratio:param()};}
    createGain(){return {...node(),gain:param()};}
    createBuffer(_,n){return {getChannelData:()=>new Float32Array(n)};}
    createBufferSource(){return node();}
    createBiquadFilter(){return {...node(),frequency:param()};}
    createOscillator(){return {...node(),frequency:{...param(),setValueAtTime(v){pitches.push(v);}}};}
  }
  const w={AudioContext:Context};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../audio.js'),'utf8'),{window:w,GardenGolf:G});
  const device=w.makeGardenAudio(),game=G.makeGame();game.step(10);device.update(game.state);device.open();
  device.update(game.state);assert.equal(pitches.length,0);
  game.press();game.step(1.55);device.update(game.state);pitches.length=0;
  game.release();device.update(game.state);assert(Math.abs(pitches[0]-1205)<1e-8);
  assert.equal(pitches.length,3);device.update(game.state);assert.equal(pitches.length,3);
  return pitches.map(round);
}
stats.strikeFrequencies=checkSound();
const archive=zlib.gzipSync(rows.join('\n')+'\n',{level:9});
fs.writeFileSync(path.join(__dirname,'state-trace.ndjson.gz'),archive);
const result={intervalSeconds:dt,samples:rows.length,tapsUsed,...stats,...data};
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
