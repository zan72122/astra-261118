'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {create,NX,NZ}=require('../simulation.js');
const dt=.05,N=NX*NZ,rows=[],gridRuns=[],report={sampleInterval_s:dt,grid:[NX,NZ],runs:{},maxDelta:{},uniformWetUpdates:0,uniformChanges:{bladeBend:0,rimFilm:0,sectorMud:0}};
const maxima=report.maxDelta;
const sum=a=>a.reduce((s,x)=>s+x,0),max=a=>a.reduce((s,x)=>Math.max(s,x),-Infinity);
const round=x=>Number(x.toFixed(7));
function peak(key,x){maxima[key]=Math.max(maxima[key]||0,Math.abs(x));}
const columns=['case','seconds','stage','flow_L_s','rotor_rpm','shaft_rad_s','heading_rad','packets','mist','rainbow','pot_L','spillTotal_L','lipMax_mL','leafHeight_m','wheel_rad','wheel_rad_s','mud_g','soil_mL','surface_mL','grassDrops_mL','maxCellSoil_mL','maxCellDrop_mL','wetCellCount','changedWetCells','maxCellSoilStep_mL','maxMudSectorStep_g','wind_m_s','evening'];
rows.push(columns.join(','));
function run(name,game,limit,action,fullGrid=false){
  let prev=null,oldPhase=-1,firstAir=null,oldPackets=new Map(),pairCount=0,gravityError=0,measuredApex=0,guideAt=null;
  const stageTimes=[],stageValues=[],initialMud=sum(game.s.mud.map(m=>m.mass));
  let peakPot=0,peakRim=0,peakDew=0,peakWheel=0,peakRimCount=0,guided=false;
  // Four channels per cell. mL in 0.01 mL units, bend in 0.0001 rad.
  // File order is case, sample, z, x, then soil, film, dew, bend.
  const block=fullGrid?Buffer.alloc((limit+1)*N*8):null;
  for(let n=0;n<=limit;n++){
    if(n)game.step(dt);
    const s=game.getState(),live=game.s,cells=s.cells;
    if(s.phase!==oldPhase){
      oldPhase=s.phase;stageTimes.push(round(n*dt));stageValues.push({phase:s.phase,time_s:round(n*dt),flow_L_s:s.flow,rpm:s.rpm,pot_L:s.potL,
        overflow_L:s.overflowL,mud_g:sum(s.mud),dew_mL:sum(cells.map(c=>c[2]))*1000,leafHeight_m:s.leaf[1]});
    }
    if(s.guide&&!guided){guideAt=n*dt;guided=true;}
    assert(s.flow>=0&&s.flow<=.40000001&&s.rpm>=0&&s.rpm<=40.000001);
    assert(Math.abs(s.nozzleSpeed)<=2*Math.PI*40/60+1e-8);
    let wet=0,changed=0,soil=0,film=0,dew=0,soilMax=0,dropMax=0,dSoil=0,dMud=0,firstWetDelta=null,uniform=true;
    for(let i=0;i<N;i++){
      const c=cells[i];assert(c.every(Number.isFinite)&&c[0]>=0&&c[1]>=0&&c[2]>=0);
      soil+=c[0];film+=c[1];dew+=c[2];soilMax=Math.max(soilMax,c[0]);dropMax=Math.max(dropMax,c[2]);
      if(c[0]+c[1]+c[2]>1e-7)wet++;
      if(block){
        for(let j=0;j<4;j++){
          const v=Math.round(c[j]*(j===3?10000:100000));
          const offset=((n*N+i)*4+j)*2;
          if(j===3){assert(v>=-32768&&v<=32767);block.writeInt16LE(v,offset);}
          else{assert(v>=0&&v<=65535);block.writeUInt16LE(v,offset);}
        }
      }
      if(!prev)continue;
      const old=prev.cells[i],a=c[0]-old[0],b=c[1]-old[1],d=c[2]-old[2],change=a+b+d;
      if(Math.abs(a)+Math.abs(b)+Math.abs(d)>1e-13)changed++;
      if(firstWetDelta===null)firstWetDelta=change;
      if(Math.abs(change-firstWetDelta)>1e-12)uniform=false;
      dSoil=Math.max(dSoil,Math.abs(a)*1000);
      peak('cellFilm_mL',b*1000);peak('cellDew_mL',d*1000);peak('cellBend_rad',c[3]-old[3]);
    }
    if(changed&&uniform)report.uniformWetUpdates++;
    assert.equal(changed&&uniform?1:0,0,'uniform wetting across every cell');
    assert(changed<N&&wet<N);
    peak('cellSoil_mL',dSoil);
    if(prev){
      const uniformChange=(arr,old,field,key)=>{
        let lo=Infinity,hi=-Infinity;
        for(let i=0;i<arr.length;i++){
          const d=field===null?arr[i]-old[i]:arr[i][field]-old[i][field];
          lo=Math.min(lo,d);hi=Math.max(hi,d);
        }
        if(Math.max(Math.abs(lo),Math.abs(hi))>1e-10&&hi-lo<1e-12)report.uniformChanges[key]++;
      };
      uniformChange(s.cells,prev.cells,3,'bladeBend');uniformChange(s.rim,prev.rim,null,'rimFilm');uniformChange(s.mud,prev.mud,null,'sectorMud');
      for(const key of ['flow','rpm','potL','heading','rainbow','wheelV','evening','overflowL'])peak(key,s[key]-prev[key]);
      for(let j=0;j<s.mud.length;j++)dMud=Math.max(dMud,Math.abs(s.mud[j]-prev.mud[j]));
      peak('sectorMud_g',dMud);
      for(let j=0;j<s.rim.length;j++)peak('rimFilm_mL',(s.rim[j]-prev.rim[j])*1000);
      for(let j=0;j<3;j++)peak('leafPosition_m',s.leaf[j]-prev.leaf[j]);
      for(let j=0;j<s.air.length;j++){const a=s.air[j],b=prev.air[j];
        if(a[3]===b[3])peak('mote_m',Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]));}
    }
    // Compare packets with the same emission and lane, excluding contacts and newly born drops.
    const packets=new Map();
    for(const p of live.packets){
      if(p.type||p.targetHit)continue;
      measuredApex=Math.max(measuredApex,p.y);const key=p.row*9+p.lane,old=oldPackets.get(key);
      if(old){const predicted=old[0]+old[1]*dt-9.81*dt*dt/2;gravityError=Math.max(gravityError,Math.abs(p.y-predicted));pairCount++;}
      packets.set(key,[p.y,p.vy]);
    }
    oldPackets=packets;
    peakPot=Math.max(peakPot,s.potL);peakRim=Math.max(peakRim,max(s.rim));peakDew=Math.max(peakDew,dew);
    peakWheel=Math.max(peakWheel,Math.abs(s.wheelV));peakRimCount=Math.max(peakRimCount,s.rim.filter(x=>x>.001).length);
    if(!firstAir)firstAir=s.air;
    rows.push([name,n*dt,s.phase,s.flow,s.rpm,s.nozzleSpeed,s.heading,s.packetCount,s.mist,s.rainbow,s.potL,s.overflowL,max(s.rim)*1000,s.leaf[1],
      s.wheel,s.wheelV,sum(s.mud),soil*1000,film*1000,dew*1000,soilMax*1000,dropMax*1000,wet,changed,dSoil,dMud,s.breeze,s.evening]
      .map(x=>typeof x==='number'?round(x):x).join(','));
    prev=s;
    if(game.cycle||n===limit){
      let moteTravel=0;for(let j=0;j<s.air.length;j++){const a=s.air[j],b=firstAir[j];if(a[3]===b[3])moteTravel=Math.max(moteTravel,Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]));}
      report.runs[name]={seconds:n*dt,flow_L_s:s.flow,rpm:s.rpm,soil_mL:soil*1000,wetCells:wet,dew_mL:dew*1000,rainbow:s.rainbow,
        apex_m:measuredApex,moteTravel_m:moteTravel,peakPot_L:peakPot,peakLipFilm_mL:peakRim*1000,peakWetLips:peakRimCount,
        peakDew_mL:peakDew*1000,peakWheel_rad_s:peakWheel,initialMud_g:initialMud,guideAt_s:guideAt,maxBallisticError_m:gravityError,
        ballisticPairs:pairCount,stageTimes,stageValues};
      break;
    }
    if(action)action(game,n,s);
  }
  if(block)gridRuns.push(block);
  assert(gravityError<1e-9&&pairCount>1000);
}
run('idle',create(),200,null,true);
for(const [name,setting] of [['low',.3],['high',.9]]){
  run(name,create(),200,(g,n)=>{if(n===0)g.touch('valve',setting);},true);
}
const {idle,low,high}=report.runs;
assert.deepEqual(idle.stageTimes,[0]);assert(idle.wetCells>0&&idle.moteTravel_m>.02&&idle.rainbow>.05);
assert(idle.guideAt_s>=4&&idle.guideAt_s<=4.05);
assert(high.flow_L_s-low.flow_L_s>.23&&high.rpm-low.rpm>20&&high.soil_mL>low.soil_mL);
for(const [name,narrow] of [['landscape',false],['portrait',true]]){
  let stage=-1;
  run(name,create({narrow}),6500,(g,n)=>{
    if(g.phase===stage)return;stage=g.phase;
    if(stage===0)g.touch('valve',.9);
    if(stage===1)g.touch('pot');
    if(stage===2)g.touch('bike');
  });
  const r=report.runs[name];assert.deepEqual(r.stageValues.map(v=>v.phase),[0,1,2,3,4,0]);
  assert(r.stageValues[2].overflow_L>=.92&&r.peakWetLips>1);
  assert(r.stageValues[3].mud_g<r.initialMud_g*.18&&r.peakWheel_rad_s>.2);
  assert(r.stageValues[4].flow_L_s===0&&r.stageValues[4].rpm===0&&r.stageValues[4].dew_mL>0);
  assert(r.seconds>=120&&r.stageValues.at(-1).pot_L===0&&r.soil_mL<2);
}
// A held-open valve and a closed one settle within the rated flow and speed ranges.
const limits=create();limits.touch('valve',1);limits.step(30);assert(Math.abs(limits.s.flow-.4)<.000001&&limits.s.rpm>39.99);
limits.touch('valve',0);limits.step(35);assert(limits.s.flow===0&&limits.s.rpm===0);
assert(maxima.flow<.025&&maxima.rpm<5&&maxima.potL<.04&&maxima.heading<.211);
assert(maxima.cellSoil_mL<10&&maxima.sectorMud_g<.02&&maxima.evening<.003);
assert(Object.values(report.uniformChanges).every(n=>n===0));
fs.writeFileSync(path.join(__dirname,'trace-0.05s.csv.gz'),zlib.gzipSync(rows.join('\n')+'\n',{level:9}));
fs.writeFileSync(path.join(__dirname,'grid-10s.bin.gz'),zlib.gzipSync(Buffer.concat(gridRuns),{level:6}));
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(report,(k,v)=>typeof v==='number'?Number(v.toPrecision(8)):v,2)+'\n');
console.log(JSON.stringify({samples:rows.length-1,maxDelta:maxima,uniformUpdates:report.uniformWetUpdates,cycles:[report.runs.landscape.stageTimes,report.runs.portrait.stageTimes]},null,2));
