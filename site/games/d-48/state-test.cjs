'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {create}=require('./simulation.js');
const dt=.05,records=[],maxima={},extrema={},uniform={},settled={},transitions=[];
const r=(v,n=6)=>Number(v.toFixed(n));
const rangeOf=a=>Math.max(...a)-Math.min(...a);
const dif=(a,b,keys)=>Math.hypot(...keys.map(k=>a[k]-b[k]));
function max(name,x){assert(Number.isFinite(x),name);maxima[name]=Math.max(x,maxima[name]||0);}
function obs(name,v){const ex=extrema[name]||(extrema[name]=[v,v]);ex[0]=Math.min(ex[0],v);ex[1]=Math.max(ex[1],v);}
function compare(a,b){
  for(const [key,prop] of [['wind','u'],['reeds','angle'],['film','nm'],['film','cover'],['film','bulge'],['water','h'],['jets','p'],['dust','x']]){
    const name=key+'.'+prop,changes=b[key].map((v,i)=>v[prop]-a[key][i][prop]);
    max(name,Math.max(...changes.map(Math.abs)));
    if(rangeOf(changes)<1e-12){const target=changes.every(v=>Math.abs(v)<1e-12)?settled:uniform;target[name]=(target[name]||0)+1;}
  }
  for(const name of ['bubbles','drops','mist','ripples']){
    const before=new Map(a[name].map(d=>[d.id,d]));
    b[name].forEach(d=>{const old=before.get(d.id);if(!old)return;
      if(name==='ripples')max('ripples.r',Math.abs(d.r-old.r));
      else max(name+'.xyz',dif(d,old,['x','y','z']));
      if(name==='bubbles'){const changes=d.skin.map((v,i)=>v-old.skin[i]);max('bubbles.skin',Math.max(...changes.map(Math.abs)));
        if(rangeOf(changes)<1e-12)uniform['bubbles.skin']=(uniform['bubbles.skin']||0)+1;}
    });
  }
  max('wand.xy',dif(a.wand,b.wand,['x','y']));max('follow.xy',dif(a.follow,b.follow,['x','y']));
  max('dust.xyz',Math.max(...a.dust.map((v,i)=>dif(v,b.dust[i],['x','y','z']))));
  max('light',Math.abs(a.light-b.light));max('route',Math.abs(a.route-b.route));
  max('spinner.angle',Math.abs(a.spinner.angle-b.spinner.angle));
}
function snapshot(label,s,full){
  const x={test:label,t:r(s.time,2),stage:s.stage,route:r(s.route),light:r(s.light),count:s.bubbles.length,
    bubble:s.bubbles.map(b=>[b.id,r(b.x),r(b.y),r(b.z),r(b.r)]),drops:s.drops.length,ripples:s.ripples.length};
  if(full){
    for(const [key,fields] of [['wind',['u','v']],['reeds',['angle','velocity']],['film',['nm','bulge','cover','wet']],['water',['h','v']],
      ['jets',['p','v','load']],['dust',['x','y','z']],['drops',['id','x','y','z','vy']],['ripples',['id','r','amplitude']]]){
      x[key]=s[key].map(q=>fields.map(k=>r(q[k],8)));
    }
    x.skin=s.bubbles.map(b=>[b.id,...b.skin.map(n=>r(n,4))]);
    x.wand=[s.wand.x,s.wand.y,s.wand.speed].map(n=>r(n));x.guide=r(s.guide.age);x.follow=[r(s.follow.x),r(s.follow.y)];
  }
  records.push(JSON.stringify(x));
}
let intervals=0,peak=0;
function sampled(name,full=true){
  const sim=create();let prior=sim.getState();snapshot(name,prior,full);
  return {sim,step(){
    sim.step(dt);const s=sim.getState();compare(prior,s);intervals++;
    assert(s.bubbles.length<=5);peak=Math.max(peak,s.bubbles.length);
    for(const b of s.bubbles){assert(b.r*2>=.08-1e-9&&b.r*2<=.25+1e-9);assert(b.skin.every(Number.isFinite));}
    assert(s.film.every(f=>f.cover>=0&&f.cover<=1&&f.nm>0));
    obs('jetPressure',Math.max(...s.jets.map(j=>j.p)));obs('reach',s.follow.y);obs('spin',s.spinner.omega);
    obs('light',s.light);obs('ripples',s.ripples.length);s.drops.forEach(d=>obs('dropHeight',d.y));snapshot(name,s,full);prior=s;return s;
  }};
}
const idle=sampled('idle'),start=idle.sim.getState();
let guideAt=0;
for(let i=0;i<200;i++){const s=idle.step();if(!guideAt&&s.guide.age>0)guideAt=s.time;}
const end=idle.sim.state;
const idleData={
  seconds:r(end.time),guideAt:r(guideAt,2),wind:r(Math.max(...end.wind.map((w,i)=>Math.abs(w.u-start.wind[i].u)))),
  reeds:r(Math.max(...end.reeds.map((v,i)=>Math.abs(v.angle-start.reeds[i].angle)))*180/Math.PI,3),
  water:r(Math.max(...end.water.map((v,i)=>Math.abs(v.h-start.water[i].h)))*1000,3),
  dust:r(Math.max(...end.dust.map((v,i)=>dif(v,start.dust[i],['x','y','z'])))*100,3),
  rise:r((end.bubbles[0].y-start.bubbles[0].y)*100,3),drops:end.drops.length
};
assert(end.stage==='garden'&&idleData.wind>.001&&idleData.water>.005&&idleData.dust>.1&&idleData.rise>0);
assert(guideAt>=4&&guideAt<=4.051);
function stroke(harness,steps){
  const sim=harness.sim;assert(sim.begin());
  for(let i=1;i<=steps;i++){sim.move(.132*i/steps,.176*i/steps);harness.step();}
  const covers=sim.state.film.map(f=>f.cover);assert(sim.release());const result={...sim.state.lastBorn,cover:covers.reduce((a,b)=>a+b)/covers.length};
  for(let i=0;i<24;i++)harness.step();
  return result;
}
const slow=stroke(sampled('slow'),44),fast=stroke(sampled('fast'),11);
assert(slow.thickness>fast.thickness+50);assert(slow.speed<fast.speed);assert(slow.cover>fast.cover);
const loop=sampled('cycle',false);stroke(loop,44);let old='garden',spun=false,sprayed=false,popped=false,impactBirths=0,priorIds=new Set(),quietGarden=0;
for(let i=0;i<3950;i++){
  const s=loop.step();
  if(s.stage!==old){transitions.push([s.stage,r(s.time,2)]);old=s.stage;}
  if(s.stage==='flight'&&!spun&&s.stageAge>4){loop.sim.turn();spun=true;}
  if(s.stage==='fountain'&&s.stageAge>6&&!sprayed){loop.sim.splash(4);sprayed=true;}
  if(s.stage==='fountain')impactBirths+=s.bubbles.filter(b=>b.kind==='spray'&&!priorIds.has(b.id)).length;
  priorIds=new Set(s.bubbles.map(b=>b.id));
  if(s.stage==='sunset'&&s.stageAge>19&&!popped){const b=s.bubbles.reduce((a,b)=>!a||b.r>a.r?b:a,null);assert(b);loop.sim.pop(b.id);popped=true;}
  if(s.stage==='return'&&s.route===0&&s.bubbles.length===0)quietGarden+=dt;
  if(s.cycle===1)break;
}
assert.deepEqual(transitions.map(v=>v[0]),['flight','fountain','sunset','return','garden']);assert(spun&&sprayed&&popped&&impactBirths>=3&&quietGarden>4.8);
assert.equal(loop.sim.state.bubbles.length,2);assert.deepEqual(uniform,{});
// Repeated pulls, early pops, cancellation and large dt exercise the same simulation entry points.
const cap=create();
for(let j=0;j<8;j++){cap.begin();cap.move(j%2?.13:-.13,.17);cap.step(.25);cap.release();assert(cap.state.bubbles.length<=5);}
assert.equal(cap.state.bubbles.length,5);peak=Math.max(peak,cap.state.bubbles.length);
cap.state.bubbles.slice().forEach(b=>cap.pop(b.id));cap.begin();cap.move(.08,.15);cap.cancel();assert(!cap.state.wand.dragging);
cap.step(16);assert.equal(cap.state.stage,'flight');assert(cap.state.bubbles.some(b=>b.id===cap.state.lead));
const a=create(),b=create();a.step(1);for(let i=0;i<20;i++)b.step(dt);assert.deepEqual(a.getState(),b.getState());
for(const [name,limit] of Object.entries({'wind.u':.02,'film.nm':55,'film.cover':.13,'film.bulge':.004,'water.h':.002,
  'reeds.angle':.016,'jets.p':.16,'bubbles.xyz':.05,'drops.xyz':.34,'mist.xyz':.06,'light':.018,'follow.xy':.006,'wand.xy':.027,'route':.007})){
  assert(maxima[name]<limit,name+' exceeds '+limit+' at '+maxima[name]);
}
const file=path.join(__dirname,'state-trace.jsonl.gz');
fs.writeFileSync(file,zlib.gzipSync(records.join('\n')+'\n',{level:6,mtime:0}));
console.log(JSON.stringify({idleData,slow,fast,intervals,samples:records.length,uniform,settled,transitions,peak,impactBirths,
  quietGardenSeconds:r(quietGarden,2),maxima,extrema,compressedBytes:fs.statSync(file).size},null,2));
