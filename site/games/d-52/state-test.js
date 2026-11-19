'use strict';
// Run with: node games/d-52/state-test.js
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {Readable}=require('node:stream'),{pipeline}=require('node:stream/promises');
const {create,TAU,SPEED,N}=require('./simulation.js');
const dt=.05,records=[],peak={},range={},activeChecks={};
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} differs from ${b}`);
const copy=o=>JSON.parse(JSON.stringify(o));
const groups=s=>({
  turn:[s.turn],omega:[s.omega],height:[s.height],wind:s.wind.map(p=>p.u),haze:s.haze,
  gust:s.wind.map(p=>p.gust),pod:s.pods.map(p=>p.angle),podVelocity:s.pods.map(p=>p.v),
  wave:s.waves.map(p=>p.z),waveVelocity:s.waves.map(p=>p.v),waveTravel:s.waves.map(p=>p.travel),
  flag:s.flags.map(p=>p.bend),flagVelocity:s.flags.map(p=>p.v),lamp:s.bulbs.map(p=>p.heat),charge:s.bulbs.map(p=>p.charge),
  dustX:s.motes.map(p=>p.x),dustY:s.motes.map(p=>p.y),dustVX:s.motes.map(p=>p.vx),dustVY:s.motes.map(p=>p.vy),
  spring:[s.park.spring],carousel:[s.park.angle],carouselSpeed:[s.park.speed],boatX:[s.sail.x],boatSpeed:[s.sail.speed],
  sailTrim:[s.sail.trim],sailBoom:[s.sail.boom],boatRoll:[s.sail.heel],boatRollSpeed:[s.sail.roll],boomRate:[s.sail.rate],
  temp:[s.balloon.temp],lift:[s.balloon.lift],liftSpeed:[s.balloon.v],lean:[s.balloon.lean],leanSpeed:[s.balloon.spin],
  press:[s.cabin.press],pressSpeed:[s.cabin.pv],dial:[s.cabin.dial],dialSpeed:[s.cabin.dialV],
  guide:[s.cabin.guide],guideSpeed:[s.cabin.guideV],quiet:[s.quiet],windSound:[s.windSound],dusk:[s.dusk],
  current:[s.current],lampFocus:[s.lampFocus]
});
const independent=['wind','haze','pod','wave','flag','lamp','dustX','dustY'];
let headers;
function observe(label,s,prev){
  const data=groups(s);
  if(!headers){
    headers=['case','seconds','stage','pressed','finger','braking',...Object.entries(data).flatMap(([k,a])=>a.map((_,i)=>k+(a.length===1?'':'.'+i)))];
    records.push(headers.join(',')+'\n');
  }
  const row=[label,s.elapsed.toFixed(2),s.stage,Number(s.held),s.finger.toFixed(4),Number(s.braking)];
  for(const [k,a] of Object.entries(data)){
    const diff=[];
    if(!range[k])range[k]=[Infinity,-Infinity];
    a.forEach((x,i)=>{
      assert.ok(Number.isFinite(x),k);range[k][0]=Math.min(range[k][0],x);range[k][1]=Math.max(range[k][1],x);
      if(prev){const d=x-prev[k][i];diff.push(d);peak[k]=Math.max(peak[k]||0,Math.abs(d));}
      row.push(x.toFixed(k==='haze'?9:7));
    });
    if(prev&&independent.includes(k)&&Math.max(...diff.map(Math.abs))>1e-10){
      assert.ok(Math.max(...diff)-Math.min(...diff)>1e-12,'identical changes in '+label+' '+k+' at '+s.elapsed);
      activeChecks[k]=(activeChecks[k]||0)+1;
    }
  }
  records.push(row.join(',')+'\n');
  return copy(data);
}
function run(label,sim,frames,before,after){
  let prev=observe(label,sim.read(),null);
  for(let i=1;i<=frames;i++){
    if(before)before(i,sim);
    sim.step(dt);const s=sim.read();prev=observe(label,s,prev);
    if(after)after(i,s);
  }
  return sim.getState();
}
const lowStart=create().getState();
const low=run('idle-ground',create(),200,null,(i,s)=>{if(i<=80)near(s.cabin.guide,0);});
const mid=run('idle-middle',create({angle:Math.PI/2}),200);
const top=run('idle-crown',create({angle:Math.PI}),200);
assert.equal(low.omega,0);assert.equal(mid.omega,0);assert.equal(top.omega,0);
near(low.turn,0);near(mid.height,14.5);near(top.height,29);
assert.ok(low.cabin.guide>.98);assert.ok(mid.wind[0].u-low.wind[0].u>1);
assert.ok(mid.haze[0]-low.haze[0]>.001);assert.ok(top.quiet>.99);
assert.ok(Math.max(...low.waves.map((w,i)=>Math.abs(w.z-lowStart.waves[i].z)))>.015);
assert.ok(Math.max(...low.pods.map((p,i)=>Math.abs(p.angle-lowStart.pods[i].angle)))>.005);
const full=create(),stages=[0],reward={spring:0,boatStart:0,boatEnd:0,temp:0,lift:0,light:0},at={};
let minSpeed=Infinity,maxSpeed=0,quietCount=0;
run('four-rides',full,6000,(i,g)=>{
  if(i===1)g.press();
  if(i===1501)g.move(.75);if(i===3001)g.move(.54);if(i===4501)g.move(-.65);if(i===5200)g.move(.65);
},(i,s)=>{
  minSpeed=Math.min(minSpeed,s.omega);maxSpeed=Math.max(maxSpeed,s.omega);
  if(s.stage!==stages.at(-1))stages.push(s.stage);
  if(s.stage===0&&i<1500){reward.spring=Math.max(reward.spring,s.park.speed);if(s.quiet>.9)quietCount++;}
  if(i===1500)reward.boatStart=s.sail.x;if(i===3000)reward.boatEnd=s.sail.x;
  if(s.stage===2){reward.lift=Math.max(reward.lift,s.balloon.lift);reward.temp=Math.max(reward.temp,s.balloon.temp);}
  if(s.stage===3)reward.light=Math.max(reward.light,...s.bulbs.map(b=>b.heat));
  if(i===750||i===1125)at[i]={height:s.height,quiet:s.quiet,dusk:s.dusk,lamp:Math.max(...s.bulbs.map(b=>b.heat))};
});
assert.deepEqual(stages,[0,1,2,3,0]);near(full.read().turn,4*TAU);near(minSpeed,SPEED);near(maxSpeed,SPEED);
assert.ok(quietCount*dt>3);assert.ok(reward.boatEnd-reward.boatStart>4);assert.ok(reward.lift>12);assert.ok(reward.light>.9);
const coast=create();let atRelease=0,stoppedBy=0,lastSpeed=SPEED;
const stop=run('release',coast,300,(i,g)=>{if(i===1)g.press();if(i===48){atRelease=g.read().turn;g.release();}},(i,s)=>{
  if(i>=48){assert.ok(s.omega<=lastSpeed+1e-12);lastSpeed=s.omega;if(!stoppedBy&&s.omega===0)stoppedBy=s.elapsed-2.35;}
});
assert.equal(stop.omega,0);near(stop.turn,TAU/N);assert.ok(stop.turn>atRelease);near(stop.height,14.5*(1-Math.cos(TAU/N)));
const resume=create();resume.press();resume.step(1.2);resume.release();resume.step(.6);const beforeResume=resume.read().turn;resume.press();resume.step(dt);near(resume.read().turn,beforeResume+dt*SPEED);
// Continuous visual channels are bounded in physical units per 50 ms sample.
const bounds={turn:.0042,height:.062,wind:.18,haze:.00013,pod:.009,wave:.009,flag:.12,lamp:.04,dustX:.014,dustY:.009,
  carousel:.028,boatX:.10,boatRoll:.01,lift:.17,temp:.30,press:.004,dial:.14,quiet:.065,dusk:.026};
Object.entries(bounds).forEach(([k,max])=>assert.ok(peak[k]<max,`${k} jumped by ${peak[k]} (limit ${max})`));
const maxGap=(a,b,fn)=>Math.max(...a.map((p,i)=>Math.abs(fn(p)-fn(b[i]))));
const out={samples:records.length-1,step:dt,stages,reward,quietSeconds:quietCount*dt,brakeSeconds:stoppedBy,brakeGoalDegrees:stop.turn*180/Math.PI,
  stoppedHeight:stop.height,lowMidTop:[low,mid,top].map(s=>({height:s.height,wind:s.wind[0].u,haze:s.haze[0],sound:s.windSound})),
  idle:{wave:maxGap(low.waves,lowStart.waves,p=>p.z),pod:maxGap(low.pods,lowStart.pods,p=>p.angle),
    flag:maxGap(low.flags,lowStart.flags,p=>p.bend),dust:maxGap(low.motes,lowStart.motes,p=>p.x),guide:low.cabin.guide},
  at,peak,range,activeChecks};
async function save(){
  const dir=__dirname;
  await pipeline(Readable.from(records),zlib.createGzip({level:6}),fs.createWriteStream(path.join(dir,'state-trace.csv.gz')));
  fs.writeFileSync(path.join(dir,'measurements.json'),JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out,null,2));
}
save().catch(err=>{console.error(err);process.exitCode=1;});
