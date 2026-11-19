/* Run with node games/d-14/state.test.cjs. The gzip log has one JSON record per 0.05 s.
   Each run starts with absolute channel values. Later records contain changed indices
   and their new values, rounded to 0.00001. A piece ID identifies a fresh lump of clay. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {finished}=require('node:stream/promises');
const {create,N,A}=require('./sim.js');
const dt=.05,precision=1e5,dir=__dirname;
const output=fs.createWriteStream(path.join(dir,'state-trace.ndjson.gz')),gzip=zlib.createGzip({level:7});
gzip.pipe(output);
const peaks={},rates={},ranges={},uniform={},records={},observed={};
const checks=['radius_cm','wall_cm','moisture','water_cm','glaze','temperature_C','wareTemperature_C','vitrified','flame_height','wrap','dust_x','sway_rad'];
const grain=x=>Math.round(x*precision)/precision;
function channels(s){
  return {
    radius_cm:s.clay.map(p=>p.r),wall_cm:s.clay.map(p=>p.z),moisture:s.clay.map(p=>p.wet),radialSpeed_cm_s:s.clay.map(p=>p.vr),
    water_cm:s.water.map(p=>p.h),waterSpeed_cm_s:s.water.map(p=>p.v),dust_x:s.motes.map(p=>p.x),dust_y:s.motes.map(p=>p.y),sway_rad:s.sway.map(p=>p.x),
    glaze:s.pigment,liquid:s.film,dyes:s.dyes,temperature_C:s.heat,wareTemperature_C:s.potHeat,vitrified:s.fired,flame_height:s.fire.map(f=>f.h),wrap:s.coilPart.map(p=>p.q),
    depth_cm:[s.depth],motor_rpm:[s.rpm],motor_rad:[s.angle],force:[s.force],match:[s.match],shadowSlot:[s.shadowSlot],jarTilt:[s.tilt],door:[s.door],
    transport:[s.travel],stack:[s.stack],flowerTravel:[s.flowerAt],daylight:[s.daylight],wind:[s.wind],hint:[s.hint]
  };
}
const pieceChannels=new Set(['wareTemperature_C','radius_cm','wall_cm','moisture','radialSpeed_cm_s','glaze','dyes','liquid','vitrified','wrap','depth_cm','force','match','transport','stack','jarTilt']);
function recorder(run){
  let prev=null,piece='',flowerID='',count=0;
  return function record(s){
    const now=channels(s),id=s.cycle+'-'+s.round,fid=id+'-'+(s.flowerCount+(s.stage==='planting'?1:0));
    const changes={},full={};
    for(const [k,a] of Object.entries(now)){
      const b=prev&&prev[k],same=b&&(!pieceChannels.has(k)||id===piece)&&(k!=='flowerTravel'||fid===flowerID);
      const q=Array.from(a,grain);
      if(!same)full[k]=q;
      let max=-Infinity,min=Infinity,peak=0;
      const patch=[];
      for(let i=0;i<a.length;i++){
        assert.ok(Number.isFinite(a[i]),run+' invalid '+k);
        const bounds=ranges[k]||(ranges[k]=[Infinity,-Infinity]);bounds[0]=Math.min(bounds[0],a[i]);bounds[1]=Math.max(bounds[1],a[i]);
        if(same){const d=a[i]-b[i];max=Math.max(max,d);min=Math.min(min,d);peak=Math.max(peak,Math.abs(d));
          if(q[i]!==grain(b[i]))patch.push(i,q[i]);}
      }
      if(patch.length)changes[k]=patch;
      if(same){
        peaks[k]=Math.max(peaks[k]||0,peak);
        if(checks.includes(k)&&peak>1e-7){rates[k]=(rates[k]||0)+1;
          if(max-min<1e-10)uniform[k]=(uniform[k]||0)+1;}
      }
      now[k]=Array.from(a);
    }
    gzip.write(JSON.stringify({run,t_s:grain(s.time),piece:id,stage:s.stage,kind:s.kind,n:s.collection.length,flowers:s.flowerCount,full,changes})+'\n');
    prev=now;piece=id;flowerID=fid;records[run]=++count;
  };
}
const advance=(g,n,rec)=>{for(let i=0;i<n;i++){g.step(dt);rec(g.state);}};
async function main(){
  const idle=create({seed:118}),recordIdle=recorder('idle');recordIdle(idle.state);
  const initial=idle.getState();let onset=null,waterPeak=0,swayPeak=0;
  for(let i=0;i<200;i++){
    idle.step(dt);const s=idle.state;recordIdle(s);if(s.hint>0&&onset===null)onset=s.time;
    for(const p of s.water)waterPeak=Math.max(waterPeak,Math.abs(p.h));
    for(const p of s.sway)swayPeak=Math.max(swayPeak,Math.abs(p.x));
  }
  const drift=Math.max(...idle.state.motes.map((p,i)=>Math.hypot(p.x-initial.motes[i].x,p.y-initial.motes[i].y)));
  assert.equal(idle.state.stage,'shape');assert.ok(onset>=4&&onset<=4.1);assert.ok(drift>.01&&waterPeak>.05&&swayPeak>.0005);
  observed.idle={seconds:10,rpm:idle.state.rpm,revolutions:idle.state.angle/(2*Math.PI),hintStart_s:onset,dustCellFraction:drift,waterPeak_cm:waterPeak,sway_rad:swayPeak};
  function press(water,run){
    const g=create({water}),rec=recorder(run);rec(g.state);
    assert.ok(g.down('clay',.50,.50,.7));const init=g.getState();advance(g,80,rec);
    const release=g.getState();g.up();advance(g,12,rec);
    return {holeGain_cm:release.depth-init.depth,rimGain_cm:release.clay.at(-1).z-init.clay.at(-1).z,afterRelease_cm:g.state.clay.at(-1).z-release.clay.at(-1).z};
  }
  observed.wet=press(.82,'wet');observed.dry=press(.22,'dry');
  assert.ok(observed.wet.rimGain_cm>observed.dry.rimGain_cm*3);assert.ok(observed.wet.afterRelease_cm>.015);
  const rigid=create({water:.11}),hard=rigid.getState(),rigRec=recorder('rewet');rigRec(rigid.state);
  rigid.down('clay');advance(rigid,40,rigRec);assert.equal(rigid.state.clay[10].r,hard.clay[10].r);rigid.up();
  rigid.down('water');advance(rigid,40,rigRec);assert.ok(rigid.state.clay[12].wet>hard.clay[12].wet+.08);
  rigid.down('clay');advance(rigid,40,rigRec);assert.ok(rigid.state.clay[12].r!==hard.clay[12].r);
  observed.waterPickup=rigid.state.clay[12].wet-hard.clay[12].wet;
  const full=create(),rec=recorder('workshop');rec(full.state);let last='',piece=-1,shaped=false,extraGlaze=false;
  const stages=[],kinds=[],band=[0,0,0];let maxThermalSpread=0,liquidDelay=0,firstRim=null,secondRim=null,impact=false;
  for(let i=0;i<6000&&full.state.cycle===0;i++){
    const s=full.state;
    if(s.round!==piece){piece=s.round;shaped=false;}
    if(last!==s.stage){last=s.stage;stages.push([grain(s.time),last]);
      if(last==='aligned')kinds.push(s.kind);
      if(last==='glaze')full.down('jar'+s.round);
      if(last==='kilnReady'){
        if(piece===0&&!extraGlaze){extraGlaze=true;full.down('jar1');}else full.down('kiln');
      }
      if(last==='coil')full.down('coil');if(last==='stack')full.down('stack');
      if(last==='flower')full.down('flower'+s.flowerCount);
    }
    if((s.stage==='shape'||s.stage==='coilSeal')&&!s.inContact){full.down('clay',.5,.65,.62);}
    if(s.stage==='shape'&&piece===0&&s.age>1&&!shaped){full.move(.55,.12,.62);shaped=true;}
    full.step(dt);rec(s);
    if(piece===0){
      if(firstRim===null&&s.pigment[(N-1)*A]>.04)firstRim=s.time;
      if(secondRim===null&&s.pigment[(N-5)*A]>.04)secondRim=s.time;
    }
    if(s.stage==='firing')maxThermalSpread=Math.max(maxThermalSpread,Math.max(...s.heat)-Math.min(...s.heat));
    if(s.stage==='nesting'&&s.stackV<0)impact=true;
    for(let k=0;k<3;k++)for(let j=k;j<s.dyes.length;j+=3)band[k]=Math.max(band[k],s.dyes[j]);
  }
  assert.equal(full.state.cycle,1);assert.equal(full.state.stage,'shape');
  assert.deepEqual(kinds,['vase','jar','bowl']);assert.ok(stages.some(a=>a[1]==='winding'));assert.ok(impact);
  assert.equal(stages.filter(a=>a[1]==='planting').length,3);
  assert.ok(firstRim&&secondRim>firstRim);liquidDelay=secondRim-firstRim;
  assert.ok(maxThermalSpread>80&&ranges.temperature_C[1]>900);assert.ok(band.every(v=>v>.5));
  assert.ok(ranges.daylight[1]>.98&&full.state.daylight<.09);
  observed.workshop={time_s:full.state.time,stages,kinds,thermalSpread_C:maxThermalSpread,glazeFourRingsDelay_s:liquidDelay,
    glazeMax:band,finalDaylight:full.state.daylight};
  // Numeric bounds apply to the same physical piece. Each replacement has an explicit new ID.
  const limits={radius_cm:.25,wall_cm:.34,depth_cm:.49,water_cm:.12,glaze:.23,temperature_C:9,wrap:.065,stack:.061,transport:.052,daylight:.014};
  for(const [k,v] of Object.entries(limits))assert.ok(peaks[k]<v,k+' step '+peaks[k]+' limit '+v);
  assert.deepEqual(uniform,{});for(const key of checks)assert.ok(rates[key]>0,'no active samples for '+key);
  // Different frame intervals produce exactly the same fixed-step state.
  const coarse=create(),fine=create();coarse.step(10);for(let i=0;i<200;i++)fine.step(.05);assert.deepEqual(coarse.getState(),fine.getState());
  gzip.end();await finished(output);
  const report={dt_s:dt,records,observed,ranges,maxAdjacent:peaks,activeSectionSamples:rates,uniformSectionSamples:uniform};
  fs.writeFileSync(path.join(dir,'measurements.json'),JSON.stringify(report,(k,v)=>typeof v==='number'?grain(v):v,2)+'\n');
  console.log(JSON.stringify({records,observed,ranges,maxAdjacent:peaks,uniform},(k,v)=>typeof v==='number'?grain(v):v,2));
}
main().catch(err=>{console.error(err);gzip.destroy();output.destroy();process.exitCode=1;});
