'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {create,NX,NY,H}=require('./simulation.js'),dt=.05,rows=[],maxima={},events=[];
let uniform=0,comparisons=0,recycled=0;
const center=Math.floor(NY/2)*NX+Math.floor(NX/2),round=n=>Number(n.toFixed(7));
const columns=['run','time_s','stage','mode','cover_fraction','center_transmission','center_film_mm','center_ridge_fraction',
  'peak_delta_transmission','peak_delta_film_mm','peak_delta_ridge_fraction','bead0_mass_mg','bead0_travel_m','peak_bead_motion_m',
  'light_relative','air3_m_s','dust0_x_m','dust0_y_m','branch0_rad','cloth115_z_m','force_N','tool_m_s','friction_Hz','edge_Hz','edge_envelope','wood_Hz','wood_gain',
  'jet_head_m','flag_rad','van_m','glider_m','sash_rad','camera_fraction','cycle'];
function instrument(name,g){
  let t=0,prev=null,lastMode=null;
  function sample(){
    const s=g.getState(),idx=Math.min(s.stage,2),p=s.panes[idx];
    const fields=[...s.panes.flatMap(glass=>[glass.haze,glass.film,glass.ridge]),s.air.map(a=>a.u),s.motes.map(a=>a.y),s.sprigs.map(a=>a.a),s.cloth.map(a=>a.z)];
    const perField=fields.map((values,k)=>{
      if(!prev)return 0;
      let hi=-Infinity,lo=Infinity;
      for(let i=0;i<values.length;i++){
        let d=values[i]-prev.fields[k][i];
        if(k<9&&k%3===0)d=-.75*d-.55*(fields[k+2][i]-prev.fields[k+2][i]);
        if(!Number.isFinite(d))throw Error(name+' non-finite state');
        hi=Math.max(hi,d);lo=Math.min(lo,d);
      }
      if(Math.max(Math.abs(lo),Math.abs(hi))>1e-10){comparisons++;if(hi-lo<1e-11)uniform++;}
      return Math.max(Math.abs(lo),Math.abs(hi));
    });
    const deltas=[0,1,2].map(k=>Math.max(perField[k],perField[k+3],perField[k+6])).concat(perField.slice(9));
    const drops=s.panes.flatMap(glass=>glass.drops.map(d=>({v:d.v,g:d.generation})));
    let beadStep=0;
    if(prev)for(let i=0;i<drops.length;i++){
      if(drops[i].g!==prev.drops[i].g){recycled++;continue;}
      beadStep=Math.max(beadStep,Math.abs(drops[i].v-prev.drops[i].v)*H);
    }
    const keys=['transmission','film_mm','ridge_fraction','air_m_s','dust_m','branch_rad','cloth_m'];
    const max=maxima[name]||={};for(let i=0;i<keys.length;i++)max[keys[i]]=Math.max(max[keys[i]]||0,deltas[i]);
    max.bead_m=Math.max(max.bead_m||0,beadStep);
    if(prev){max.sash_rad=Math.max(max.sash_rad||0,Math.abs(s.angle-prev.angle));max.walk=Math.max(max.walk||0,Math.abs(s.walk-prev.walk));}
    assert(deltas[0]<=.75*(1-Math.exp(-6.4*dt))+.55*deltas[2]+.00001,'glass relaxation rate');
    assert(deltas[1]<.22&&deltas[2]<.11,'film and groove spreading remain continuous');
    assert(beadStep<=.27*dt+.00001,'gravity/drag bead speed limit');
    assert(p.haze[center]>=0&&p.haze[center]<=1);
    assert(s.cloth.filter(c=>c.pin).every(c=>c.z===0));
    let jet=-.16;for(const d of s.jets)jet=Math.max(jet,d.y);
    const actual=.20+.75*(1-p.haze[center])-.55*p.ridge[center];
    rows.push([name,round(t),s.stage,s.mode,p.clear,actual,p.film[center],p.ridge[center],...deltas.slice(0,3),
      p.drops[0].mass,p.drops[0].distance,beadStep,p.light,s.air[3].u,s.motes[0].x,s.motes[0].y,s.sprigs[0].a,
      s.cloth[115].z,s.tool.force,s.tool.speed,s.sound.pitch,s.sound.edgeHz,s.sound.edge,s.sound.woodHz,s.sound.wood,jet,1.35*s.flag,s.van,s.flight,s.angle,s.walk,s.cycle].map(x=>typeof x==='number'?round(x):x).join(','));
    if(name==='journey'&&s.mode!==lastMode)events.push({s:round(t),stage:s.stage,mode:s.mode});
    lastMode=s.mode;prev={index:idx,fields:fields.map(a=>Float64Array.from(a)),drops,angle:s.angle,walk:s.walk};
  }
  sample();return input=>{if(input){for(let n=1;n<=6;n++){input(n/6);g.step(dt/6);}}else g.step(dt);t+=dt;sample();};
}
function idle(){
  const g=create(),s=g.getState(),p=s.panes[0],tick=instrument('idle',g);
  const startLight=p.light,initial=s.motes.map(d=>({...d})),film=p.film.slice();
  let hintTime=0,lightMin=p.light,lightMax=p.light;
  for(let i=1;i<=200;i++){tick();lightMin=Math.min(lightMin,p.light);lightMax=Math.max(lightMax,p.light);if(!hintTime&&s.hint>0)hintTime=i*dt;}
  const result={duration_s:10,firstHint_s:hintTime,drop_travel_m:Math.max(...p.drops.map(d=>d.distance)),
    moved_drops:p.drops.filter(d=>d.distance>.0001).length,beads:p.drops.length,film_change_mm:Math.max(...p.film.map((v,i)=>Math.abs(v-film[i]))),
    dust_displacement_m:Math.max(...s.motes.map((d,i)=>Math.hypot(d.x-initial[i].x,d.y-initial[i].y))),
    initial_light:startLight,light_min:lightMin,light_max:lightMax,branch_rad:Math.max(...s.sprigs.map(b=>Math.abs(b.a)))};
  assert(s.mode==='wipe'&&p.clear===0);assert(result.drop_travel_m>.01&&result.moved_drops<result.beads);assert(hintTime>=4&&hintTime<=4.05);
  assert(result.film_change_mm>.001&&result.dust_displacement_m>.001&&lightMax-lightMin>.0001);
  return result;
}
function wipe(name,speed){
  const g=create(),s=g.getState(),tick=instrument(name,g),x=.5,y=.15,length=2.1;
  g.touch(x,y,.5);for(let k=0;k<18;k++)tick();
  let pitch=0,pressure=0,actualSpeed=0,amp=0;
  const n=Math.round(length/(speed*dt));
  for(let k=1;k<=n;k++){
    tick(frac=>g.touch(x,y+length*(k-1+frac)/n/H,.5));
    if(k===Math.round(n*.7)){pitch=s.sound.pitch;pressure=s.tool.force;actualSpeed=s.tool.speed;amp=s.sound.rub;}
  }
  g.release();for(let k=0;k<12;k++)tick();
  const p=s.panes[0],region=[];
  for(let j=17;j<49;j++)for(let i=27;i<37;i++)region.push(j*NX+i);
  const avg=fn=>region.reduce((t,i)=>t+fn(i),0)/region.length;
  return {input_m_s:speed,actual_m_s:actualSpeed,force_N:pressure,distance_m:length,friction_Hz:pitch,rub_gain:amp,
    initial_transmission:.2,mean_transmission:avg(i=>.2+.75*(1-p.haze[i])-.55*p.ridge[i]),mean_ridge:avg(i=>p.ridge[i]),
    max_ridge:Math.max(...region.map(i=>p.ridge[i])),mean_film_mm:avg(i=>p.film[i]),region_cells:region.length};
}
function pressureAndLip(){
  const g=create(),s=g.getState(),tick=instrument('pressure_and_edge',g);
  g.touch(.5,.45,0);for(let k=0;k<20;k++)tick();const low=s.tool.force;
  g.touch(.5,.45,1);for(let k=0;k<20;k++)tick();const high=s.tool.force;
  let hz=0;
  for(let k=0;k<30;k++){
    tick(f=>g.touch(.50+Math.min(.50,(k+f)*.018),.45,1));
    if(s.sound.edge>0)hz=s.sound.edgeHz;
  }
  g.release();for(let i=0;i<20;i++)tick();
  assert(Math.abs(low-1)<1e-5&&Math.abs(high-6)<1e-5&&hz>600&&s.sound.rub<.0001);
  return {low_N:low,high_N:high,edge_Hz:hz,edge_duration_ms:1000*s.sound.edgeSeconds};
}
function journey(){
  const g=create(),s=g.getState(),tick=instrument('journey',g);s.width=3.2;
  let woodHz=0,maxJet=0,flag=0,van=0,flight=0,hinge=0,maxCloth=0,maxClothV=0,afterglow=0,window=0,strokes=0;
  const observe=()=>{tick();for(const d of s.jets)maxJet=Math.max(maxJet,d.y);flag=Math.max(flag,s.flag*1.35);
    if(s.sound.wood>.01)woodHz=Math.max(woodHz,s.sound.woodHz);van=Math.max(van,s.van);flight=Math.max(flight,s.flight*.8);hinge=Math.max(hinge,s.angle);
    for(const c of s.cloth){maxCloth=Math.max(maxCloth,Math.abs(c.z));maxClothV=Math.max(maxClothV,Math.abs(c.v));}};
  let total=0;
  while(!s.cycle&&total<340){
    if(s.mode==='wipe'){
      window=s.stage;
      for(let i=0;i<7&&s.mode==='wipe';i++){
        const x=.10+i*.139,y=i%2?.96:.04;g.touch(x,y,.5);
        for(let j=0;j<10;j++){observe();total+=dt;}
        for(let j=1;j<=92&&s.mode==='wipe';j++){
          g.touch(x,y+(i%2?-1:1)*.92*j/92,.5);observe();total+=dt;}
        g.release();strokes++;
      }
    }else{
      if(s.mode==='mail'&&s.age>2)g.act();
      if(s.mode==='latch'&&s.age>2)g.act();
      if(s.mode==='outside'&&s.age>3&&s.age<3.4)g.gust(1,.55,.8,2.8);
      if(s.mode==='outside'&&s.age>3.45&&s.age<3.55)afterglow=Math.max(afterglow,Math.abs(s.cloth[113].v));
      observe();total+=dt;
    }
  }
  assert.equal(s.cycle,1);assert.equal(s.mode,'wipe');assert.equal(window,2);assert(s.panes[0].clear<.001);
  assert.deepEqual([...new Set(events.map(e=>e.mode))],['wipe','garden','travel','mail','delivery','flight','latch','opening','walk','outside','home']);
  assert(maxJet>.45&&van>=12&&hinge>1.4&&maxClothV>.2&&afterglow>.01);
  return {duration_s:total,strokes,max_wood_Hz:woodHz,jet_apex_m:maxJet,flag_rad:flag,van_travel_m:van,
    glider_travel_until_cycle_m:flight,max_hinge_rad:hinge,cloth_deflection_m:maxCloth,cloth_speed_m_s:maxClothV,
    cloth_release_speed_m_s:afterglow,return_clear_fraction:s.panes[0].clear};
}
const idleResult=idle(),slow=wipe('slow',.35),fast=wipe('fast',2.10);
assert(Math.abs(slow.force_N-fast.force_N)<1e-6&&Math.abs(slow.force_N-3.5)<1e-6);
assert(slow.mean_transmission>.949&&fast.mean_ridge>slow.mean_ridge+.025&&slow.mean_film_mm>.1);
const pressure=pressureAndLip(),trip=journey();assert.equal(uniform,0);
const results={step_s:dt,grid:[NX,NY],idle:idleResult,slow,fast,pressure,journey:trip,maxima,nonzero_field_comparisons:comparisons,uniform_nonzero_fields:uniform,
  bead_births_after_drain:recycled,samples:rows.length,events};
fs.writeFileSync(path.join(__dirname,'state-trace.csv'),columns.join(',')+'\n'+rows.join('\n')+'\n');
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(results,(k,v)=>typeof v==='number'?round(v):v,2)+'\n');
console.log(JSON.stringify(results,(k,v)=>typeof v==='number'?round(v):v,2));
