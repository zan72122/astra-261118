/* Lengths are metres, angles radians, mass kilograms, time seconds. */
(function (root) {
  'use strict';
  const LENGTH = 356, STOPS = [6.8, 21.4, 36.2, 109, 214, 341];
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const smooth = x => (x = clamp(x, 0, 1), x*x*(3-2*x));
  function spring(o, target, stiffness, drag, h) {
    o.v += ((target-o.x)*stiffness-o.v*drag)*h;
    o.x += o.v*h;
  }
  function create(seed = 14318) {
    let randSeed = seed >>> 0;
    const random = () => ((randSeed = (Math.imul(randSeed,1664525)+1013904223)>>>0)/4294967296);
    const node = x => ({x, v:0});
    const makeBag = i => ({id:i,mode:'ground', mass:[18,23,16][i], volume:[.18,.235,.16][i],
      x:STOPS[i]-2.77, y:0.403, z:3.52, vx:0,vy:0,vz:0, squash:node(0),wobble:node(0),slip:0});
    const s = {time:0, distance:0, speed:0, acceleration:0, wheel:0, lap:0, stop:0, mode:'drive',
      held:'', idle:0, mass:0, volume:0, arm:node(0), grip:node(0), pressure:0, phase:'park',
      age:0, siteOffset:0, view:[node(0),node(0),node(0)], springs:[0,1,2,3].map(()=>node(0)), bags:[0,1,2].map(makeBag),
      bridge:node(.91), valve:node(0), boat:0, boatV:.4, bed:node(0), lever:node(0), belt:node(0), beltTravel:0,
      can:node(0), canX:node(1.93), wateringIndex:4, nozzleCredit:0, townBlooms:node(0),
      drips:Array.from({length:20},()=>({live:false,id:0,x:0,y:0,z:0,vx:0,vy:0,vz:0})),
      puddles:[0,0,0,0,0],soil:[0,0,0,0,0], flowers:[0,1,2,3,4].map(()=>node(0)), planted:false,
      wind:Array.from({length:9},(_,i)=>({x:.09+i*.021,v:0,goal:random()*.4-.2,life:.2+random()*2})),
      leaves:Array.from({length:18},(_,i)=>node((i%4)*.006)),
      water:Array.from({length:28},(_,i)=>({x:.012*Math.sin(i*1.19),v:.014*Math.cos(i*.51)})),
      dust:Array.from({length:18},()=>({x:random()*2-1,y:.3+random()*2.4,vx:random()*.03,vy:0,home:random()*2-1})),
      wave:node(.3),waveGoal:.5,waveLife:1.1, finger:node(0), fingerGoal:0,fingerLife:0, nudge:node(0)};
    const events=[];
    function emit(name,power=1) {events.push({name,power}); if(events.length>40) events.shift();}
    function target() {return ({drive:'truck',bridge:'wheel',unload:'lever',garden:'can'})[s.mode] || '';}
    function press(item) {
      s.idle=0; if(item && item===target()) {s.held=item;return true;}
      if(item==='truck')s.nudge.v+=.15;
      if(/^bag[0-2]$/.test(item))s.bags[Number(item[3])].wobble.v+=.18;
      return false;
    }
    function release(){s.held='';}
    function enter(mode){s.mode=mode;s.age=0;s.held='';s.idle=0;}
    function next(){s.stop++;enter('drive');}
    function wrist() {
      const a=s.arm.x;
      // Park, reach to the pavement, then swing over the open hopper.
      const reach=smooth(a), lift=smooth(a-1);
      return {x:-2.77+s.siteOffset*reach*(1-lift)+(.19+.15*Math.min(2,s.stop))*lift, y:1.65-.907*reach+1.849*lift+.62*Math.sin(lift*Math.PI),
        z:.82+1.45*reach+([-.32,.32,.02][Math.min(2,s.stop)]-2.27)*lift};
    }
    function environment(h) {
      for(let i=0;i<s.wind.length;i++){
        const w=s.wind[i]; w.life-=h;
        if(w.life<=0){w.goal=(random()-.48)*.83;w.life=.55+random()*2.8;}
        spring(w,w.goal,1.8+i*.07,1.9,h);
      }
      s.leaves.forEach((l,i)=>spring(l,s.wind[i%9].x*(.18+.008*i),12+i*.34,2.4+i*.08,h));
      const forces=s.water.map((w,i,a)=>{
        const left=a[(i+a.length-1)%a.length].x,right=a[(i+1)%a.length].x;
        const wake = s.boat>2 && s.boat<29 ? .085*Math.exp(-Math.pow(i-s.boat*.86,2)) : 0;
        return 22*(left+right-2*w.x)-1.3*w.x-.9*w.v+s.wind[i%9].x*.15+wake;
      });
      s.water.forEach((w,i)=>{w.v+=forces[i]*h;w.x+=w.v*h;});
      s.dust.forEach((p,i)=>{p.vx+=(s.wind[i%9].x*.6+(p.home-p.x)*.23-p.vx*.83)*h;
        p.vy+=((1.2+(i%7)*.19-p.y)*.56+s.wind[(i+3)%9].v*.27-p.vy*.76)*h;
        p.x+=p.vx*h;p.y+=p.vy*h;});
      s.waveLife-=h;
      if(s.waveLife<0){s.waveGoal=(s.waveGoal>.3?-.12:.68)+random()*.12;s.waveLife=.65+random()*.9;}
      spring(s.wave,s.waveGoal,12,3.2,h);
      s.idle=s.held?0:s.idle+h;
      s.fingerLife-=h;
      if(s.idle<4||!target()){s.fingerGoal=0;s.fingerLife=0;}
      else if(s.fingerLife<=0){s.fingerGoal=s.fingerGoal>.5?.16:1;s.fingerLife=s.fingerGoal>.5?1.7:1.25;}
      spring(s.finger,s.fingerGoal,17,7,h);spring(s.nudge,0,25,5,h);
    }
    function drive(h){
      const stopX=s.lap*LENGTH+(STOPS[s.stop]??(LENGTH+STOPS[0]));
      const remain=stopX-s.distance;
      const before=s.speed, wanted=s.mode==='drive' && s.held==='truck'?Math.min(4,Math.sqrt(2*2.7*Math.max(0,remain))):0;
      s.speed=clamp(s.speed+clamp(wanted-s.speed,-(s.held?3.3:5.8)*h,1.5*h),0,4);
      const dx=s.mode==='drive'?Math.min(Math.max(0,remain),s.speed*h):0;
      s.distance+=dx;s.wheel+=dx/.517;
      const withinReach=s.stop<3&&remain<=.88&&!s.held&&s.speed<.015;
      if(s.mode==='drive'&&(withinReach||remain<.009&&s.speed<.045)){
        s.speed=0;
        if(s.stop<3){if(!s.held){s.siteOffset=remain;enter('pickup');s.phase='reach';emit('pump',.45);}}
        else if(s.stop<6) enter(['bridge','unload','garden'][s.stop-3]);
      }
      if(s.stop===6 && s.distance>=LENGTH*(s.lap+1)){
        s.lap++;s.stop=0;
        s.wateringIndex=4;
      }
      s.acceleration=(s.speed-before)/h;
    }
    function pickup(h) {
      let a=0;
      if(s.mode==='pickup'){
        const b=s.bags[s.stop];
        if(s.phase==='reach'){a=1;if(Math.abs(s.arm.x-1)<.016){s.phase='clamp';}}
        if(s.phase==='clamp'){a=1;if(s.grip.x>.974){b.mode='gripped';s.phase='hoist';emit('pump',.88);}}
        if(s.phase==='hoist'){a=2;if(s.arm.x>1.987){b.mode='fall'; b.vy=-.04; s.phase='return';emit('release',.55);}}
        if(s.phase==='return'){a=0;if(s.arm.x<.013&&b.mode==='packed'){s.phase='park';next();}}
      }
      spring(s.arm,a,5.2,4.5,h);
      spring(s.grip,s.phase==='clamp'||s.phase==='hoist'?1:0,26,9,h);
    }
    function loads(h) {
      let mass=0,volume=0;
      s.bags.forEach((b,i)=>{
        const rearSink=(s.springs[0].x+s.springs[1].x)*.5;
        const shelf=1.45+i*.235-rearSink;
        if(b.mode==='gripped'){
          const w=wrist();b.x=s.distance+w.x;b.y=w.y-.34;b.z=1.25+w.z;
        } else if(b.mode==='fall'){
          b.vy-=9.81*h;b.y+=b.vy*h;
          if(b.y<=shelf){b.y=shelf;b.squash.v=Math.min(1.5,-b.vy*.34);b.vy=0;b.mode='packed';
            emit('thud',b.mass/23);s.springs[0].v+=.065;s.springs[1].v+=.052;emit('creak',.65);}
        }
        if(b.mode==='packed'){
          b.y=shelf;b.x=s.distance-2.58+.15*i;b.z=1.25+[-.32,.32,.02][i];
          if(s.mode==='unload'&&s.bed.x>.29+.034*i){
            b.mode='slide';b.vx=-.06;b.slip=0;b.vy=0;
          }
        }
        if(b.mode==='slide'){
          const accel=9.81*(Math.sin(s.bed.x)-.18*Math.cos(s.bed.x));
          b.vx-=Math.max(.02,accel)*h;b.x+=b.vx*h;b.slip-=b.vx*h;b.y+=b.vx*Math.tan(s.bed.x)*h;
          if(b.x<s.distance-3.14){b.mode='dump';}
        }else if(b.mode==='dump'){
          b.vy-=9.81*h;b.x+=b.vx*h;b.y+=b.vy*h;
          if(b.y<.22){b.y=.22;b.mode='belt';b.squash.v=.83;emit('thud',.54);}
        }else if(b.mode==='belt'){b.z-=s.belt.x*h;if(b.z<-7)b.mode='stored';}
        if(b.mode==='packed'||b.mode==='slide'){mass+=b.mass;volume+=b.volume;}
        spring(b.squash,0,76,10,h);spring(b.wobble,0,29/b.mass*18,5.6,h);
      });
      // A new household sack has a new identity. The old load has already gone inside.
      if(s.stop===5&&s.distance-s.lap*LENGTH>277&&s.bags.every(b=>b.mode==='stored')){
        s.bags=[0,1,2].map(i=>{const b=makeBag(i);b.id=(s.lap+1)*3+i;b.x+=(s.lap+1)*LENGTH;return b;});
      }
      s.mass=mass;s.volume=volume;
      s.springs.forEach((q,i)=>{
        const share=[.34,.32,.18,.16][i], stiffness=[1170,1110,1450,1390][i];
        const rut=.008*Math.sin(s.distance*(2.6+i*.025)+i*.9)*Math.min(1,s.speed);
        const compression=mass*9.81*share/stiffness+rut+s.acceleration*(i<2?.0015:-.0015);
        spring(q,compression,38+i*2,6.4+i*.24,h);
      });
    }
    function mechanisms(h){
      const river=s.mode==='bridge',dump=s.mode==='unload',garden=s.mode==='garden';
      spring(s.valve,river&&s.held==='wheel'?1:0,12,6,h);
      const wantClosed=river&&s.valve.x>.18 || s.stop>3;
      let targetAngle=s.bridge.x;
      if(wantClosed) targetAngle=0;else if(s.stop<3) targetAngle=.91;
      // Hydraulic check valve holds the load when the hand releases the control.
      spring(s.bridge,targetAngle,1.4,2.6,h);
      if(river&&s.bridge.x<.012){next();emit('latch',.4);}
      const boatDock=Math.floor(s.distance/LENGTH)*48+44;
      const boatTarget=s.stop>=3&&s.stop<5?.76:.075;
      s.boatV+=(Math.min(boatTarget,Math.max(0,(boatDock-s.boat)*.37))-s.boatV)*h*.55;s.boat+=s.boatV*h;
      spring(s.lever,dump&&s.held==='lever'?1:0,20,7,h);
      let bedTarget=s.bed.x;
      const empty=s.bags.every(b=>['belt','stored'].includes(b.mode));
      if(dump&&s.lever.x>.15&&!empty) bedTarget=.68;
      if(!dump||empty) bedTarget=0;
      spring(s.bed,bedTarget,2.4,2.9,h);
      spring(s.belt,s.stop>=4 && s.bags.some(b=>['dump','slide','belt'].includes(b.mode))?.83:0,5,4,h);
      s.beltTravel+=Math.max(0,s.belt.x)*h;
      if(dump&&empty&&s.bed.x<.008){next();emit('latch',.57);}
      spring(s.can,garden&&s.held==='can'?.95:0,7,4.8,h);
      const cellX=i=>-1.03+i*.515;
      spring(s.canX,garden?cellX(s.wateringIndex)+.95:1.93,3.8,3.9,h);
      s.nozzleCredit+=Math.max(0,s.can.x-.35)*26*h;
      if(s.nozzleCredit>=1){
        const drop=s.drips.find(d=>!d.live);
        if(drop){
          const angle=.1+s.can.x*.98;
          drop.live=true;drop.id++;
          drop.x=s.canX.x-.735*Math.cos(angle)-.31*Math.sin(angle);
          drop.y=.58+s.can.x*.43-.735*Math.sin(angle)+.31*Math.cos(angle);
          drop.z=.04+(random()-.5)*.13;drop.vx=-1.13-random()*.26+s.canX.v;drop.vy=.14;drop.vz=(random()-.5)*.18;
        }
        s.nozzleCredit-=1;
      }
      for(const d of s.drips){
        if(!d.live)continue;
        d.vy-=9.81*h;d.vx+=(s.wind[3].x-d.vx)*.26*h;
        d.x+=d.vx*h;d.y+=d.vy*h;d.z+=d.vz*h;
        if(d.y<=.318){d.y=.318;d.live=false;const i=clamp(Math.round((d.x+1.03)/.515),0,4);
          s.puddles[i]+=.027;}
      }
      for(let i=0;i<5;i++){
        const absorbed=Math.min(s.puddles[i],(.05+s.puddles[i]*2.2)*h);
        s.puddles[i]-=absorbed;
        const exposure=.78+i*.095+Math.abs(s.wind[i].x)*.32;
        const dry=garden||s.stop===6?0:.042*s.soil[i]*exposure;
        s.soil[i]=clamp(s.soil[i]+absorbed-dry*h,0,1);
        const grow=smooth((s.soil[i]-.07-i*.012)/.52);
        spring(s.flowers[i],grow,2.4+i*.12,2.8,h);
      }
      if(garden&&s.soil[s.wateringIndex]>.70&&s.wateringIndex>0)s.wateringIndex--;
      if(garden&&s.flowers.every(f=>f.x>.95)){s.planted=true;next();emit('garden',.5);}
      spring(s.townBlooms,s.planted?1:0,1.7,2.7,h);
      const shot=s.mode==='pickup'?[-.64,.25,.01]:river?[.43,.36,.06]:dump?[-1.45,.98,.11]:garden?[-.43,1.01,.06]:[0,0,0];
      s.view.forEach((q,i)=>spring(q,shot[i],3.8,3.9,h));
      const flow=Math.abs(s.arm.v)*.9+Math.abs(s.bed.v)*2+Math.abs(s.bridge.v)*(river?1:0);
      s.pressure+=(Math.min(1,flow)-s.pressure)*Math.min(1,4*h);
    }
    function step(dt) {
      if(!Number.isFinite(dt)||dt<=0)return;
      // Substeps keep contact and pressure integration independent of the display rate.
      const n=Math.ceil(dt*120-1e-10),h=dt/n;
      for(let k=0;k<n;k++){s.time+=h;s.age+=h;environment(h);drive(h);pickup(h);loads(h);mechanisms(h);}
    }
    return {s,step,press,release,target,wrist,getState:()=>JSON.parse(JSON.stringify(s)),drain:()=>events.splice(0)};
  }
  const api={create,LENGTH,STOPS};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MorningRoute=api;
})(typeof window!=='undefined'?window:globalThis);
