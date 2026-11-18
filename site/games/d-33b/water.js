/* All dynamics run on a fixed clock. Rendering and audio only consume this model. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const angles = [-1.035, -.51, 0, .51, 1.045];
  const specs = [
    ['tin', .41, 1.04, .50, 784, .68],
    ['glass', .28, .965, .33, 1046.5, 1.10],
    ['wood', .48, .89, .49, 523.25, .24],
    ['iron', .40, .80, .54, 659.25, .51],
    ['clay', .36, .72, .47, 880, .41]
  ];
  const vessels = specs.map(([material, capacity, rim, radius, pitch, decay], i) => ({
    material, capacity, rim, radius, pitch, decay, angle: angles[i],
    x: 2.48 * Math.sin(angles[i]), z: -2.12 + 2.48 * Math.cos(angles[i])
  }));
  function makeWorld(seed = 4351, initialRain = 1.36) {
    let bits = seed >>> 0, carry = 0, nextId = 0, gustDue = .3, weatherDue = 6.1;
    const random = () => ((bits = (Math.imul(bits, 1664525) + 1013904223) >>> 0) / 4294967296);
    const events = [];
    const rainGrain = () => ({x:(random()-.5)*22, y:random()*7, z:-12+random()*14, generation:0,speed:4+random()*2.3});
    const s = {
      time:0, phase:'gather', phaseAge:0, cycle:0, idle:0, held:false, manualRain:false,
      rain:initialRain, rainTarget:initialRain, cloud:1, wind:.04, windTarget:.04,
      angle:angles[0], angularVelocity:0, aim:angles[0], pin:0,
      film:Array.from({length:8},(_,i)=>initialRain/60/(5.8+i*.21)), lip:0,
      vessels:vessels.map((v,i)=>({litres:0, spill:0, channel:0, nozzle:0, shake:0, velocity:0,
        wave:0, waveV:0, wet:.25+i*.012, energy:0, hits:0, pitch:v.pitch})),
      drops:[], splashes:[], rings:[], rainGrains:Array.from({length:140},rainGrain),
      twigs:Array.from({length:25},(_,i)=>({bend:0,velocity:0,stiff:5+(i*7%11),drag:2+i%4})),
      boat:{distance:0,speed:0,roll:0,rollV:0,launch:0}, wheel:{angle:0,speed:0,lifted:0,startLift:0,cells:Array(10).fill(0),lips:Array(10).fill(0)},
      bells:[0,1,2].map(()=>({angle:0,speed:0,sound:0})), breeze:0, bird:0,
      skyTravel:[0,0,0,0], camera:{x:0,y:1.17,z:-.45,pull:0}, fly:{x:6,y:4.1,z:-11,vx:0,vy:0,vz:0,wing:0,wingV:0,perched:false},
      chord:[0,0,0,0,0], focus:0, inletVolume:0, outletVolume:0, surfaceRunoff:0
    };
    const sound = (kind, extra={}) => { if(events.length < 512) events.push({kind, ...extra}); };
    const phase = name => {s.phase=name;s.phaseAge=0;s.idle=0;s.held=false;};
    function wave(x,z,y,amp,domain='pond') {
      s.rings.push({id:++nextId,x,z,y,r:.012,amp,domain});
      if(s.rings.length>100) s.rings.shift();
    }
    function strike(i, strength, x=vessels[i].x, z=vessels[i].z) {
      const v=s.vessels[i], spec=vessels[i], fill=clamp(v.litres/spec.capacity,0,1);
      v.velocity += strength*(.14+i*.008)*(random()>.5?1:-1);
      v.waveV += strength*(.1+random()*.1);
      v.energy=Math.min(1,v.energy+.27*strength);v.hits++;
      v.pitch=spec.pitch*(1-.34*fill);
      sound('note',{i,pitch:v.pitch,decay:spec.decay*(1-.32*fill),strength,x,z});
      const y=.13+(spec.rim-.16)*fill;
      wave(x,z,y+.008,.3*strength,'v'+i);
      for(let j=0;j<3;j++){
        const a=random()*Math.PI*2, speed=.16+random()*.28;
        s.splashes.push({id:++nextId,x,y,z,vx:Math.cos(a)*speed,vy:.72+random()*1.02,vz:Math.sin(a)*speed,floor:y});
      }
    }
    function hitPond(x,z,size) {wave(x,z,-.246,size); sound('rain',{x,z,strength:size});}
    function push(amount=.55) {
      if(s.phase==='clear'){phase('boat');}
      if(s.phase==='boat'){s.boat.speed=clamp(s.boat.speed+amount*.16,0,.44);s.boat.rollV+=amount*.6;hitPond(.7+s.boat.distance,-4,.55);}
      if(s.phase==='wheel') s.wheel.speed=clamp(s.wheel.speed+amount*.65,-1.5,2.3);
    }
    function ringBell(i,force=.8) {
      if(s.phase==='bells'){s.bells[i].speed=clamp(s.bells[i].speed+force*3,-5,5);}
    }
    function setAim(a) {s.aim=clamp(a,angles[0],angles[4]);s.idle=0;s.pin=0;}
    function fixed(dt) {
      s.time+=dt;s.phaseAge+=dt;s.idle=s.held?0:s.idle+dt;
      const wet=['gather','cascade','music','return'].includes(s.phase);
      if((weatherDue-=dt)<=0){weatherDue=5+random()*9;if(!s.manualRain)s.rainTarget=.58+random()*1.38;}
      if((gustDue-=dt)<=0){gustDue=.55+random()*2.55;s.windTarget=(random()-.38)*.9;}
      s.wind+=(s.windTarget-s.wind)*dt*.95;
      s.rain+=( (wet?s.rainTarget:0)-s.rain)*dt*(wet?.9:.72);
      if(!wet && s.rain<.002)s.rain=0;
      s.cloud+=((wet?1:0)-s.cloud)*dt*.22;
      s.twigs.forEach((b,i)=>{
        b.velocity+=(s.wind*(.45+i%5*.11)-b.stiff*b.bend-b.drag*b.velocity)*dt;
        b.bend+=b.velocity*dt;
      });
      s.angularVelocity+=((s.aim-s.angle)*28-s.angularVelocity*8)*dt;
      s.angle+=s.angularVelocity*dt;
      if(!s.held && s.phase==='cascade'){
        const near=angles.reduce((a,b,i)=>Math.abs(b-s.angle)<Math.abs(angles[a]-s.angle)?i:a,0);
        s.pin=s.vessels[near].litres>=vessels[near].capacity*.998?s.pin+dt:0;
        // At the end stop the weighted spout swings back to the first unfilled mouth.
        if(s.pin>5 && s.vessels.slice(near).every((v,k)=>v.litres>=vessels[near+k].capacity*.998)){const empty=s.vessels.findIndex((v,i)=>v.litres<vessels[i].capacity*.998);if(empty>=0){s.aim=angles[empty];s.pin=0;}}
      }
      let incoming=s.rain/60*dt;s.inletVolume+=incoming;
      for(let i=0;i<s.film.length;i++){
        const out=Math.min(s.film[i],s.film[i]*(5.8+i*.21)*dt);
        s.film[i]+=incoming-out;incoming=out;
      }
      s.lip+=incoming;
      if(s.lip>=.00265){
        const a=s.angle, amount=s.lip; s.lip=0;s.outletVolume+=amount;
        s.drops.push({id:++nextId,x:2.48*Math.sin(a),y:1.76,z:-2.12+2.48*Math.cos(a),vy:-.52,
          vx:(random()-.5)*.065+s.angularVelocity*.18*Math.cos(a),vz:(random()-.5)*.04,amount});
      }
      s.drops=s.drops.filter(d=>{
        const py=d.y; d.vy-=13.8*dt;d.y+=d.vy*dt;d.x+=d.vx*dt;d.z+=d.vz*dt;
        for(let i=0;i<5;i++){
          const v=s.vessels[i],p=vessels[i],waterY=.13+(p.rim-.16)*v.litres/p.capacity;
          if(d.target===undefined && py>=p.rim && d.y<=p.rim && Math.hypot(d.x-p.x,d.z-p.z)<p.radius*(i===1?.61:.95))d.target=i;
          if(d.target===i && py>=waterY && d.y<=waterY){
            v.litres+=d.amount;strike(i,.42+Math.min(.35,-d.vy*.055),d.x,d.z);return false;
          }
        }
        if(d.y<.012){wave(d.x,d.z,.014,.26,'floor');s.surfaceRunoff+=d.amount;return false;}return true;
      });
      s.vessels.forEach((v,i)=>{
        const p=vessels[i],excess=Math.max(0,v.litres-p.capacity);
        v.litres-=excess;v.channel+=excess;
        const transfer=v.channel*(2.8+.16*i)*dt;v.channel-=transfer;
        v.spill+=(transfer/dt-v.spill)*dt*4;
        if(i<4){
          v.nozzle+=transfer;
          if(v.nozzle>=.00265){
            const next=vessels[i+1],dx=p.x-next.x,dz=p.z-next.z,k=next.radius*.46/Math.hypot(dx,dz);
            s.drops.push({id:++nextId,x:next.x+dx*k,y:next.rim+.026,z:next.z+dz*k,vy:-.14,vx:0,vz:0,amount:v.nozzle,target:i+1});
            v.nozzle=0;
          }
        }
        else {
          s.surfaceRunoff+=transfer;v.nozzle+=transfer;
          if(v.nozzle>.003){v.nozzle=0;s.splashes.push({id:++nextId,x:p.x,y:-.027,z:-2.68,vx:0,vy:-.68,vz:-.16,floor:-.246,garden:true});}
        }
        v.velocity+=(-88*v.shake-5.6*v.velocity)*dt;v.shake+=v.velocity*dt;
        v.waveV+=(-62*v.wave-(3+i*.2)*v.waveV)*dt;v.wave+=v.waveV*dt;
        v.energy*=Math.exp(-dt/(.25+p.decay*.38));
        v.wet+=(Math.min(1,.18+v.litres/p.capacity+v.channel*10)-v.wet)*dt*.4;
        v.pitch=p.pitch*(1-.34*v.litres/p.capacity);
        if(s.phase==='return'){
          const drain=Math.min(v.litres,p.capacity*(.30+i*.025)*Math.sqrt(v.litres/p.capacity)*dt);
          v.litres-=drain;s.surfaceRunoff+=drain;
        }
        if(s.phase==='music')s.chord[i]+=dt*(.0017+i*.00027)*(1+.2*s.wind);
        if(s.chord[i]>.0029){s.chord[i]=0;strike(i,.48+random()*.16);}
      });
      s.splashes=s.splashes.filter(d=>{d.vy-=10*dt;d.y+=d.vy*dt;d.x+=d.vx*dt;d.z+=d.vz*dt;if(d.garden && d.y<=d.floor)hitPond(d.x,d.z,.40);return d.y>d.floor;});
      s.rings=s.rings.filter(r=>{r.r+=dt*(r.domain==='pond'?.39:.20);r.amp*=Math.exp(-dt*(r.domain==='pond'?1.6:3.7));return r.amp>.021;});
      for(const g of s.rainGrains){
        g.y-=g.speed*dt;g.x+=s.wind*dt*.3;
        if(g.y<-.25){
          if(g.z< -2 && random()<s.rain*.075)hitPond(g.x,g.z,.16+random()*.30);
          g.generation++;g.y=5+random()*3;g.x=(random()-.5)*22;g.z=-12+random()*14;
        }
      }
      const b=s.boat,w=s.wheel;
      b.launch+=((['clear','boat','wheel','bells'].includes(s.phase)?1:0)-b.launch)*dt*1.15;
      if(s.phase==='boat'){
        b.speed+=((.065+Math.max(0,s.wind)*.1)-b.speed)*dt*.85;b.distance+=b.speed*dt;
        b.rollV+=s.wind*.17*dt;
        if(b.distance>=2.28){b.distance=2.28;w.startLift=w.lifted;phase('wheel');}
      } else if(s.phase==='bells'||s.phase==='return'){
        const back=-Math.min(.155,b.distance*1.5);b.speed+=(back-b.speed)*dt*1.8;
        b.distance=Math.max(0,b.distance+b.speed*dt);
      } else b.speed*=Math.exp(-dt*2.1);
      b.rollV+=(-b.roll*12-b.rollV*1.9)*dt;b.roll+=b.rollV*dt;
      const waterLoad=w.cells.reduce((torque,fill,i)=>torque-fill*Math.cos(w.angle+i*Math.PI*.2)*.022,0);
      const drive=s.phase==='wheel'?.34+s.wind*.055+waterLoad:waterLoad;
      w.speed+=(drive-w.speed*.62)*dt;w.angle+=w.speed*dt;
      w.cells.forEach((volume,i)=>{
        const height=Math.sin(w.angle+i*Math.PI*.2);
        const fill=height<-.65 && s.phase==='wheel'?(1-volume)*1.6:0;
        const pour=height>.33?volume*(height-.33)*2.6:0;
        w.cells[i]=clamp(volume+(fill-pour)*dt,0,1);w.lifted+=pour*.018*dt;w.lips[i]+=pour*.018*dt;
        if(w.lips[i]>=.0018){w.lips[i]=0;const a=w.angle+i*Math.PI*.2;
          s.splashes.push({id:++nextId,x:3.11+.66*Math.cos(a),y:.42+.66*Math.sin(a),z:-5.45+.13,
            vx:-w.speed*.35*Math.sin(a),vy:-.18,vz:.07,floor:-.246,garden:true});
        }
      });
      s.breeze+=( (s.phase==='bells'?.36+s.wind:0)-s.breeze)*dt*.8;
      s.bells.forEach((bell,i)=>{
        const prev=bell.angle;
        bell.speed+=(s.breeze*(.8+i*.24)-bell.angle*(7+i*1.4)-bell.speed*.78)*dt;
        bell.angle+=bell.speed*dt;bell.sound*=Math.exp(-dt*1.4);
        if(prev*bell.angle<=0 && Math.abs(bell.speed)>.28 && s.phase==='bells'){
          sound('bell',{i,strength:Math.min(1,.28+Math.abs(bell.speed)*.2)});bell.sound=1;
        }
      });
      if(!wet && (s.bird-=dt)<=0){sound('bird',{pitch:1550+random()*530});s.bird=2.8+random()*4.7;}
      const fills=s.vessels.map((v,i)=>v.litres/vessels[i].capacity);
      if(s.phase==='gather' && fills.some(f=>f>=.999))phase('cascade');
      if(s.phase==='cascade' && fills.every(f=>f>=.999)){phase('music');s.chord=s.chord.map((v,i)=>i*.0005);}
      if(s.phase==='music' && s.phaseAge>20)phase('clear');
      if(s.phase==='clear' && s.phaseAge>12)push(.38);
      if(s.phase==='wheel' && w.lifted-w.startLift>.22)phase('bells');
      if(s.phase==='bells' && s.phaseAge>24)phase('return');
      if(s.phase==='return' && s.phaseAge>8){s.cycle++;s.aim=angles[0];phase('gather');}
      const bird=s.fly, perch=s.phase==='bells'?[-1.78,2.02,-5.04]:[4.01,1.992,-6.05];
      const target=wet?[7,4.8,-14]:perch;
      for(const [i,key] of ['x','y','z'].entries()){
        const speed='v'+key;
        const delta=target[i]-bird[key];
        bird[speed]+=(delta*1.45-bird[speed]*2.32)*dt;
        bird[key]+=bird[speed]*dt;
      }
      bird.perched=!wet && Math.hypot(bird.x-perch[0],bird.y-perch[1],bird.z-perch[2])<.045;
      bird.wingV+=(-120*bird.wing-5.1*bird.wingV)*dt;
      if(!bird.perched && bird.wing<.05 && bird.wingV<.1 && Math.abs(bird.vx)+Math.abs(bird.vz)>.12)bird.wingV+=7;
      bird.wing+=bird.wingV*dt;
      s.skyTravel.forEach((x,i)=>{s.skyTravel[i]+=(s.wind*(.06+i*.009)-x*.023)*dt;});
      const rig=s.camera, garden=['clear','boat','wheel','bells'].includes(s.phase);
      const camGoal=s.phase==='wheel'?[2.35,.16,-4.95,-1.55]:s.phase==='bells'?[-1.04,1.12,-4.88,-2.35]:garden?[.35,.15,-4.04,.15]:s.phase==='music'?[0,1.15,-1.58,1.0]:[0,1.17,-.45,0];
      for(const [i,key] of ['x','y','z','pull'].entries())rig[key]+=(camGoal[i]-rig[key])*dt*.45;
      const focus=['boat','wheel','bells','clear'].includes(s.phase)?1:s.phase==='music'?.31:0;
      s.focus+=(focus-s.focus)*dt*.32;
    }
    function step(dt) {
      if(!Number.isFinite(dt)||dt<0)return;
      carry+=dt;while(carry>=1/120-1e-12){fixed(1/120);carry-=1/120;}
    }
    return {s,step,getState:()=>JSON.parse(JSON.stringify(s)),drainEvents:()=>events.splice(0),
      setRain(rate){s.manualRain=true;s.rainTarget=clamp(rate,.2,2);},
      setAim,push,ringBell,touch(){s.idle=0;},strike,
      release(){s.held=false;if(['gather','cascade','music'].includes(s.phase)){s.aim=angles.reduce((a,b)=>Math.abs(a-s.aim)<Math.abs(b-s.aim)?a:b);}},
      wave};
  }
  const api={makeWorld,vessels,angles};root.RainGarden=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
