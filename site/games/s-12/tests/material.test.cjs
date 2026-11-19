'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const Batch=require('../material.js');
const dt=.05,cm=4,deg=180/Math.PI;
const lerp=(a,b,t)=>a+(b-a)*t;
const records=[],results={},maxima={},phases=new Set();
const fields=['x','y','z','temperature','stretch','radius','air','pockets','seam','scatter','twist','lock','shine','pressure','frozenTwist'];
const uniformActive={};
let uniformThermalFrames=0,uniformAirFrames=0,thermalFrames=0,airFrames=0;
function record(m,name,i){
  const nodes=m.nodes.map(n=>fields.map(k=>+n[k].toFixed(6)));
  for(const row of nodes)assert(row.every(Number.isFinite));
  records.push(JSON.stringify({case:name,t:+(i*dt).toFixed(2),batch:m.batch,phase:m.phase,folds:m.folds,
    lantern:m.lantern,heatHaze:m.heatHaze,blade:m.blade,paper:m.paper,cutAt:m.cutAt,
    pieces:m.pieces.map(p=>[p.from,p.to,p.air,p.twist,p.temperature,p.x,p.y,p.z,p.onPaper]),nodes}));
}
function run(name,options={}){
  let m=new Batch(options),i=0;record(m,name,i);
  let prev=m.getState();const tick=(before=()=>{})=>{
    before();m.step(dt);i++;const state=m.getState();record(m,name,i);phases.add(m.phase);
    if(prev.batch===state.batch){
      let deltaT=[],deltaAir=[],low={},high={};
      for(let j=0;j<state.nodes.length;j++){
        const n=state.nodes[j],p=prev.nodes[j];
        for(let k of fields){
          const change=n[k]-p[k];maxima[k]=Math.max(maxima[k]||0,Math.abs(change));
          low[k]=Math.min(low[k]??Infinity,change);high[k]=Math.max(high[k]??-Infinity,change);
        }
        maxima.distance=Math.max(maxima.distance||0,Math.hypot(n.x-p.x,n.y-p.y,n.z-p.z));
        deltaT.push(n.temperature-p.temperature);deltaAir.push(n.air-p.air);
      }
      for(const k of fields){
        if(Math.max(Math.abs(low[k]),Math.abs(high[k]))>1e-6&&high[k]-low[k]<1e-8)uniformActive[k]=(uniformActive[k]||0)+1;
      }
      if(Math.max(...deltaT.map(Math.abs))>1e-7){thermalFrames++;if(Math.max(...deltaT)-Math.min(...deltaT)<1e-8)uniformThermalFrames++;}
      if(Math.max(...deltaAir)>1e-6){airFrames++;if(Math.max(...deltaAir)-Math.min(...deltaAir)<1e-8)uniformAirFrames++;}
    }
    prev=state;
  };
  const wait=seconds=>{for(let j=0;j<Math.round(seconds/dt);j++)tick();};
  const move=(x,y,seconds)=>{
    if(!m.grip)return;
    let {x:ox,y:oy,kind}=m.grip,len=Math.round(seconds/dt);
    for(let j=1;j<=len;j++){let t=j/len;tick(()=>m.input('move',kind,lerp(ox,x,t),lerp(oy,y,t)));}
  };
  return {m,tick,wait,move};
}
const idle=run('untouched');
let initial=idle.m.getState();idle.wait(10);
let final=idle.m.getState();
assert.equal(final.phase,'pull');assert.equal(final.folds,0);
results.idle={start:initial.nodes[8].temperature,end:final.nodes[8].temperature,tipStart:initial.nodes.at(-1).temperature,
  tipEnd:final.nodes.at(-1).temperature,haze:final.heatHaze,lanternDeg:final.lantern*deg};
assert(final.nodes.every((n,i)=>n.temperature<initial.nodes[i].temperature));
assert(Math.abs(final.lantern)>.0001);assert(final.heatHaze>.2);
function pullTest(name,options){
  let {m,wait,move}=run(name,options),n=m.at(.24),start=n.radius;
  assert(m.input('down','candy',n.x,n.y,n.u));
  move(n.x-.93,n.y-.67,.7);wait(.55);
  return {stretch:n.stretch,startRadius:start*cm,radius:n.radius*cm,farStretch:m.at(.91).stretch};
}
results.mass160=pullTest('160g',{});results.mass240=pullTest('240g',{mass:240});
results.cool=pullTest('cool',{temperature:29});
assert(results.mass160.stretch>results.mass240.stretch+.025);
assert(results.mass160.stretch>results.cool.stretch+.05);
assert(results.mass160.radius<results.mass160.startRadius);
assert(results.mass160.stretch>results.mass160.farStretch+.2);
function fold(r,side){
  let {m,wait,move}=r,n=m.at(.88);
  assert(m.input('down','candy',n.x,n.y,n.u));
  move(n.x+side*1.15,n.y-1.10,.75);
  let grip=m.grip;assert(grip);
  // A child can let go, then place the stretched end over the hook with a touch.
  if(m.folds%2===0){
    m.input('up');wait(.20);assert(m.held);assert(m.input('down','hook',-.59,1.05,.44));
  }else{
    move(-.59,1.05,.75);assert(m.folding);m.input('up');
  }
  wait(2.20);
}
const play=run('right-fold-large-circle-and-two-cuts'),m=play.m;
fold(play,1);
const seam=m.nodes.reduce((a,b)=>a.air>b.air?a:b);
let bands=0,previous=false;
for(let i=0;i<720;i++){
  let lit=Batch.scatterAt(seam,i*Math.PI/360)>.5;if(lit&&!previous)bands++;previous=lit;
}
results.firstFold={bands,centreAir:seam.air,seam:Batch.scatterAt(seam,1.7),sideA:Batch.scatterAt(seam,1.0),sideB:Batch.scatterAt(seam,2.4)};
assert.equal(bands,1);assert(results.firstFold.sideA<.02&&results.firstFold.sideB<.02);
while(m.phase==='pull'&&m.folds<12)fold(play,1);
play.wait(2.15);assert.equal(m.phase,'twist');
results.rightFold={folds:m.folds,near:m.at(.70).air,far:m.at(.14).air,tip:m.at(1).air};
const left=run('left-fold');
for(let k=0;k<results.rightFold.folds&&left.m.phase==='pull';k++)fold(left,-1);
results.leftAtSameSite=left.m.at(.70).air;assert(results.rightFold.near-results.leftAtSameSite>.1);
assert(results.rightFold.tip<.02);
function turn(r,radius){
  let {m,tick}=r,n=m.at(1);let ox=n.x,oy=n.y;assert(m.input('down','candy',ox,oy,1));
  for(let i=1;i<=20;i++)tick(()=>m.input('move','candy',ox+radius*i/20,oy,1));
  for(let i=1;i<=100;i++){let a=i/100*2*Math.PI;tick(()=>m.input('move','candy',ox+radius*Math.cos(a),oy+radius*Math.sin(a),1));}
  m.input('up');let lo=m.at(.70),hi=m.at(.94);
  return {pitch:2*Math.PI*(hi.u-lo.u)*4.15*cm/Math.abs(hi.twist-lo.twist),half:m.at(.5).twist*deg,lock:m.at(.4).lock,tipLock:m.at(.96).lock};
}
const twin=run('same-candy-small-circle');
while(twin.m.phase==='pull'&&twin.m.folds<12)fold(twin,1);
twin.wait(2.15);
results.largeTurn=turn(play,1.12);results.smallTurn=turn(twin,.38);
assert(results.largeTurn.pitch>results.smallTurn.pitch);
play.wait(6);assert.equal(m.phase,'cut');
results.cooled={lock:m.at(.40).lock,tipLock:m.at(.96).lock};
assert(results.cooled.lock>results.cooled.tipLock);
function cut(delta){
  assert(m.input('down','shears',1,-.7,.8));play.move(1+delta,-.7,.4);m.input('up');play.wait(.75);
}
cut(.49);cut(-.23);
assert(Math.abs(m.restEnd+m.pieces.reduce((sum,p)=>sum+p.to-p.from,0)-1)<1e-9);
assert.equal(m.pieces.length,2);assert.equal(m.phase,'roll');
results.slices=m.pieces.map(p=>({cm:p.from*4.15*cm,air:p.air,mass:(p.to-p.from)*m.mass}));
assert(Math.abs(m.pieces[0].air-m.pieces[1].air)>.05);
m.paperSpot={x:4.05,y:-1.2};
for(let i=0;i<m.pieces.length;i++){
  let p=m.pieces[i];assert(m.input('down','piece',p.x,p.y,i));play.move(m.paperSpot.x,m.paperSpot.y,1.1);
  m.grip.overPaper=true;m.input('up');play.wait(.25);
}
play.wait(1.6);assert.equal(m.phase,'give');assert.equal(m.paper,1);
assert(m.input('down','parcel',4.05,-1.2,1));play.move(4.72,1.91,.9);m.grip.overHand=true;m.input('up');play.wait(3.65);
assert.equal(m.phase,'pull');assert.equal(m.batch,2);assert.equal(m.pieces.length,0);
assert.deepEqual(uniformActive,{});assert.equal(uniformAirFrames,0);assert.equal(uniformThermalFrames,0);
assert(maxima.temperature<.075);assert(maxima.air<.12);assert(maxima.radius*cm<.16);
assert(maxima.distance*cm<2.0);assert(maxima.lock<.025);
const wrong=run('inactive-tools');assert.equal(wrong.m.input('down','shears',1,0),false);
assert.equal(wrong.m.input('down','parcel',1,0),false);wrong.wait(.25);
results.maxima={distanceCm:maxima.distance*cm,temperatureC:maxima.temperature,radiusCm:maxima.radius*cm,
  airPoints:maxima.air*100,twistDeg:maxima.twist*deg,lockPoints:maxima.lock*100};
results.traces={dtSeconds:dt,count:records.length,thermalFrames,uniformThermalFrames,airFrames,uniformAirFrames,phases:[...phases]};
const head=JSON.stringify({dtSeconds:dt,positionUnit:'4 cm',temperatureUnit:'C',airUnit:'normalized scattering air index',nodeFields:fields});
fs.writeFileSync(path.join(__dirname,'material-trace.ndjson.gz'),zlib.gzipSync([head,...records].join('\n')+'\n',{level:7}));
console.log(JSON.stringify(results,null,2));
