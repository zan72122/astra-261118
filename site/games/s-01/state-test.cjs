// node games/s-01/state-test.cjs
// The CSV stores 50 ms samples. Delta columns compare every material cell,
// including cells other than the selected probes, before any rounding.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const P=require('./model.js');
const dt=.05, fields=['white','displaced','liftGoal','raised','groove','print','moisture','temp','rim','bladeFilm'];
const limits={white:.95,displaced:1.3,liftGoal:2.5,raised:1.1,groove:.9,print:.25,moisture:.009,temp:.25,rim:1.5,bladeFilm:.040};
const maxima=Object.fromEntries(fields.map(f=>[f,0]));
let uniform=0,pairs=0,renewals=0,records=0;
const rows=[['scenario','t_s','sweet','stage','white_crown_mm','white_lip_mm','white_outer_mm','white_finger_mm3','white_surface_mm3','skirt_removed_mm3','lip_raised_mm3','max_rise_mm','max_groove_mm','crown_water_fraction','flank_water_fraction','crown_C','hollow_mm','wheel_rad','wheel_rad_s','blade_face_film','blade_release_Hz','board_friction_Hz','board_gain','room_air','window_light','hint','crumb_radius_mm','crumb_height_mm','lift_mm','tilt_rad',...fields.map(f=>'max_delta_'+f)].join(',')];
const sum=(f,fn)=>f.reduce((n,x,i)=>n+fn(x,i),0);
const volume=f=>sum(f,(x,i)=>x*P.AREA[i]);
const max=f=>f.reduce((a,b)=>Math.max(a,b),-Infinity);
const radius=s=>s.crumbs.length?sum(s.crumbs,p=>Math.hypot(p.x,p.z)*20)/s.crumbs.length:0;
const height=s=>s.crumbs.length?20*max(s.crumbs.map(p=>p.y)):0;
const fmt=n=>typeof n==='number'?Number(n.toFixed(8)):n;
function track(label,opts){
  const model=P.create(opts),s=model.s;
  let prev,identity=s.cycle,lastAngle=0,turnJump=0;
  function sample(){
    const diffs=[];
    for(const f of fields){
      let high=-Infinity,low=Infinity,largest=0;
      if(prev && identity===s.cycle){
        for(let i=0;i<s[f].length;i++){
          const d=s[f][i]-prev[f][i];assert.ok(Number.isFinite(d),f);
          if(d>high)high=d;if(d<low)low=d;largest=Math.max(Math.abs(d),largest);
        }
        if(largest>1e-9&&high-low<1e-12)uniform++;
        maxima[f]=Math.max(maxima[f],largest);
        assert.ok(largest<limits[f],label+' '+f+' '+largest);
      }
      diffs.push(largest);
    }
    if(prev){pairs++;if(identity!==s.cycle)renewals++;turnJump=Math.max(turnJump,Math.abs(s.angle-lastAngle));}
    rows.push([label,s.time,s.cycle,s.stage,s.white[0],s.white[6*P.N],s.white[10*P.N],s.whiteOnFinger,volume(s.white),volume(s.displaced),volume(s.raised),max(s.raised),max(s.groove),s.moisture[0],s.moisture[12*P.N+28],s.temp[0],s.hollow,s.angle,s.spin,s.bladeFilm[1],s.peelHz,s.woodHz,s.woodGain,s.wind,s.lux,s.hint,radius(s),height(s),s.carryLift,s.tilt,...diffs].map(fmt).join(','));
    records++;
    prev=Object.fromEntries(fields.map(f=>[f,s[f].slice()]));identity=s.cycle;lastAngle=s.angle;
  }
  sample();
  function next(n=1,move){for(let i=1;i<=n;i++){if(move)move(i/n);model.step(dt);sample();}}
  function smear(length=.56){
    assert.ok(model.begin('smear',0,.03,{force:.8}));next(20,t=>model.move(length*t,.03));model.end();next(10);assert.equal(s.stage,'petal');
  }
  function press(a,face=.72){
    const x=Math.cos(a),z=Math.sin(a);
    assert.ok(model.begin('push',x,z,{force:.8,face}));
    next(12,t=>model.move(x*(1-.68*t),z*(1-.68*t)));model.end();next(18);
  }
  return {s,model,next,smear,press,turnJump:()=>turnJump};
}
const idle=track('untouched');
const before=idle.model.getState(),startVol=volume(idle.s.white);let firstHint=0;
for(let i=0;i<200;i++){idle.next();if(!firstHint&&idle.s.hint>0)firstHint=idle.s.time;}
const equilibrium={
  crownC:idle.s.temp[0]-before.temp[0],waterPP:(idle.s.moisture[0]-before.moisture[0])*100,
  otherWaterPP:(idle.s.moisture[12*P.N+28]-before.moisture[12*P.N+28])*100,
  dustRise:(idle.s.particles[10].y-before.particles[10].y)*20,
  lightChange:idle.s.lux-before.lux,firstHint,stage:idle.s.stage
};
assert.ok(firstHint>=4&&firstHint<=4.06);
assert.ok(Math.abs(equilibrium.lightChange)>.002&&equilibrium.dustRise>1);
assert.equal(idle.s.stage,'white');
assert.ok(Math.abs(volume(idle.s.white)+idle.s.whiteOnFinger-startVol)<.002);
const outer=s=>sum(s.white,(w,i)=>P.X[i]>.42?w*P.AREA[i]:0);
function example(label,{length=.56,mass=1,water=.64,face=.72}={}){
  const x=track(label,{mass,water});x.next(40);x.smear(length);
  const edgeVolume=outer(x.s),before=volume(x.s.white)+x.s.whiteOnFinger;
  x.press(0,face);
  const deposited=volume(x.s.liftGoal),taken=volume(x.s.displaced);
  assert.ok(Math.abs(deposited-taken)<.002);
  assert.ok(Math.abs(volume(x.s.white)+x.s.whiteOnFinger-before)<.003);
  const halfHeight=max(x.s.rim)/2,span=x.s.rim.filter(v=>v>=halfHeight).length*360/P.N;
  return {test:x,edgeVolume,span,peak:max(x.s.raised),removed:taken,whiteTotal:before,film:x.s.bladeFilm[Math.min(2,Math.floor(face*3))]};
}
const short=example('short',{length:.13}),long=example('long',{length:.85});
const fine=example('bevel-tip',{face:.08}),broad=example('bevel-face',{face:.90});
const dry=example('drier',{water:.42}),wet=example('moister',{water:.77});
const little=example('less-paste',{mass:.78}),much=example('more-paste',{mass:1.27});
assert.ok(long.edgeVolume>short.edgeVolume+20);assert.ok(broad.span>fine.span);
assert.ok(wet.removed>dry.removed&&little.removed>much.removed);
assert.ok(wet.film>dry.film);
const full=broad.test,s=full.s;
assert.ok(!full.model.begin('pinch',0,0));
const adjacent=10*P.TAU/P.N,between=9*P.N+6,grooveBefore=s.groove[between];
full.press(adjacent,.40);
const grooveAfter=s.groove[between],groovePeak=max(s.groove);
assert.ok(grooveAfter>grooveBefore);
assert.ok(full.model.begin('turn',1,0));
const angleBefore=s.angle,releaseHz=s.peelHz;let woodLow=Infinity,woodHigh=0;
while(s.angle-angleBefore<Math.PI){full.next(1,()=>full.model.move(0,0,Math.min(.056,Math.PI-(s.angle-angleBefore)+.001)));woodLow=Math.min(s.woodHz,woodLow);woodHigh=Math.max(s.woodHz,woodHigh);}
const turned=s.angle-angleBefore;full.model.end();full.next(25);const stopped=s.spin;
assert.ok(turned<Math.PI+.025&&Math.abs(stopped)<.01);
let tries=0;while(s.stage==='petal'&&tries<12)full.press(1.18*++tries,.74);
assert.equal(s.stage,'pinch');
const hollow=s.hollow;
assert.ok(full.model.begin('pinch',.2,-.1));full.next(8);full.model.end();
while(s.stage!=='gather'&&s.age<5)full.next();
assert.equal(s.stage,'gather');const scattered=radius(s),flat=height(s);
assert.ok(full.model.begin('gather',.34,.13));full.next(13,t=>full.model.move(.34*(1-t),.13*(1-t)));full.model.end();full.next(26);
assert.equal(s.stage,'paper');const gathered=radius(s),heap=height(s);
assert.ok(gathered<scattered&&heap>flat);
assert.ok(full.model.begin('slide',0,0));full.next(13,t=>full.model.move(-.75*t,.09*t));full.model.end();
let maxLift=0,maxTilt=0;for(let n=0;n<190&&s.cycle===0;n++){full.next();maxLift=Math.max(s.carryLift,maxLift);maxTilt=Math.max(s.tilt,maxTilt);}
assert.equal(s.stage,'white');assert.equal(s.cycle,1);assert.ok(maxLift>19);
assert.equal(uniform,0);
const frozen=full.model.getState();frozen.white[0]=999;assert.notEqual(s.white[0],999);
fs.writeFileSync(path.join(__dirname,'state-trace.csv'),rows.join('\n')+'\n');
console.log(JSON.stringify({records,pairs,renewals,uniform,dt,
  idle:equilibrium,
  smear:{shortOuterMm3:short.edgeVolume,longOuterMm3:long.edgeVolume},
  bevel:{tipWidthDeg:fine.span,faceWidthDeg:broad.span,peakMm:broad.peak,grooveBefore,grooveAfter,groovePeak},
  moisture:{dryVolume:dry.removed,wetVolume:wet.removed,dryFilm:dry.film,wetFilm:wet.film},
  mass:{littleVolume:little.removed,muchVolume:much.removed,littleWhite:little.whiteTotal,muchWhite:much.whiteTotal},
  rotate:{angleDeg:turned*180/Math.PI,maxDegreesPerSample:full.turnJump()*180/Math.PI,residualRadS:stopped},
  audio:{releaseHz,woodLow,woodHigh},
  core:{hollow,scattered,gathered,flat,heap},handoff:{maxLift,maxTiltDegrees:maxTilt*180/Math.PI,cycle:s.cycle},maxima},null,2));
