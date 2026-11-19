// Distances are metres, time seconds, angular variables radians. Fixed-step mechanics.
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, H = 1 / 120;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const zones = [[-1.08,.62],[.35,.03],[1.46,-.37],[-1.72,-3.9],[1.88,-2.45],[.53,-7.8],[1.39,-.95],[1.12,-1.85],[.67,.35]];
  const groups = [[0],[0,1,2],[3,4],[0,1,2,5],[6],[7],[8]];
  const masses = [.047,.145,.086];
  function create(seed = 7413) {
    let rng = seed >>> 0;
    function random() { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; }
    let elapsed=0, remainder=0, stage=0, season=0, age=0, effort=0, idle=0, completed=0;
    let input=null, gust=.12, airTarget=.20, airClock=0, events=[], tags=0, fireworks=0, burstWait=0, bloom=0;
    const air=zones.map((p,i)=>({u:.12+i*.006, phase:random()*TAU, eddy:.02, drive:0,puff:0}));
    const bells=masses.map((mass,i)=>({mass,angle:0,speed:0,tongue:.012*(i+1),tongueSpeed:0,tag:0,tagSpeed:0,ring:0,hits:0,cool:0,strip:Array.from({length:8},()=>({bend:0,v:0}))}));
    const cloth=Array.from({length:4},(_,k)=>Array.from({length:20},(_,j)=>({d:.004*Math.sin(k+j),v:0,wet:.78-.10*k,light:0})));
    const leaves=Array.from({length:22},(_,i)=>({angle:.06*Math.sin(i),v:0,phase:random()*TAU}));
    const water=Array.from({length:36},(_,i)=>({h:.0009*Math.sin(i*1.9),v:0}));
    const petal={x:-.18,z:.06,vx:0,vz:0,travel:0,docked:false};
    const wheel={angle:.2,omega:0,turns:0,lift:0,hoist:0};
    const plane={x:0,y:0,z:0,vx:0,vy:0,vz:0,flying:false,landed:false,returning:false,heading:0,trim:0};
    const sun={alt:.64,velocity:0}, dust=Array.from({length:32},()=>({x:random()*8-4,y:random()*2.9,z:random()*6-4,v:.01+random()*.06,phase:random()*TAU}));
    const drip={y:.46,v:0,volume:0,falling:false,impacts:0,generation:0};
    const cameraMix=[1,0,0,0],cameraSpeeds=[0,0,0,0];
    let sparks=[],pendingSounds=[],burstId=0, ripplePhase=.1, focus=0;
    function active(i) {return groups[stage].includes(i);}
    function touch(i,strength,x=zones[i]?.[0],z=zones[i]?.[1],direction=1) {
      if(!active(i)||!Number.isFinite(strength)) {input=null;return false;}
      if(!input||input.i!==i)air[i].puff=Math.max(air[i].puff,clamp(strength,0,5));
      input={i,strength:clamp(strength,0,5),x,z,dir:clamp(direction,-1,1)}; idle=0; return true;
    }
    function advance() {
      stage=(stage+1)%7; completed++; age=0; effort=0; tags=0; fireworks=0; burstWait=.9; input=null; idle=0;
      if(stage===0) {season++; plane.flying=plane.landed=plane.returning=false;plane.heading=0;plane.x=plane.y=plane.z=0;}
      if(stage===4) {petal.travel=0;petal.docked=false;}
      if(stage===5) wheel.turns=0;
      events.push({type:'stage',stage});
    }
    function moveAir(h) {
      airClock-=h;
      if(airClock<=0){airClock=.45+1.5*random();airTarget=.07+.37*random();}
      gust+=(airTarget-gust)*(1-Math.exp(-h*1.2));
      air.forEach((a,i)=>{
        let local=0;
        if(input) {
          const p=zones[i], dist=Math.hypot(p[0]-input.x,(p[1]-input.z)*.48);
          local=input.strength*Math.exp(-dist*(stage===1?.32:stage===2&&active(i)?.13:.95))*(active(i)?1:.065);
        }
        a.puff*=Math.exp(-h*1.8);
        a.drive+=(Math.max(local,a.puff)-a.drive)*(1-Math.exp(-h*(a.puff>a.drive?15:input?2.7:1.65)));
        a.phase+=h*(2.2+i*.16+a.u*(2.4+i*.11));
        a.eddy+=(Math.sin(a.phase)+.37*Math.sin(a.phase*1.69)-a.eddy)*h*3.1;
        a.u+=(clamp(gust*(.68+i*.034+.21*a.eddy)+a.drive,0,5)-a.u)*(1-Math.exp(-4*h));
      });
    }
    function moveBells(h) {
      bells.forEach((b,i)=>{
        const a=air[i], pressure=a.u*a.u/Math.sqrt(b.mass/.05);
        b.tagSpeed+=h*(pressure*(.26+.48*Math.sin(a.phase)) - 18*b.tag - 1.45*b.tagSpeed);
        b.tag+=h*b.tagSpeed;
        b.strip.forEach((node,j)=>{
          const parent=j?b.strip[j-1].bend:0;
          const child=b.strip[Math.min(7,j+1)].bend;
          const push=pressure*(.049+j*.011)*(1+.64*Math.sin(a.phase-j*.51));
          node.v+=h*(push+39*(parent+child-2*node.bend)-9*node.bend-3.4*node.v);
        });
        b.strip.forEach(node=>node.bend+=h*node.v);
        b.speed+=h*(pressure*(.084+.105*Math.sin(a.phase-.65))+b.tag*.82-(31+i*3)*b.angle-1.28*b.speed);
        b.angle+=h*b.speed;
        b.tongueSpeed+=h*(pressure*(1.54+4.35*Math.sin(a.phase*.62))+(b.tag-b.tongue)*4-39*b.tongue-1.02*b.tongueSpeed);
        b.tongue+=h*b.tongueSpeed;
        const delta=b.tongue-b.angle, rel=b.tongueSpeed-b.speed, stop=[.52,.68,.51][i];
        b.cool-=h;b.ring*=Math.exp(-h/[1.42,2.45,.74][i]);
        if(Math.abs(delta)>=stop && delta*rel>0) {
          b.tongue=b.angle+Math.sign(delta)*stop;
          b.tongueSpeed=b.speed-rel*.56;b.speed+=rel*.032;
          if(b.cool<=0 && Math.abs(rel)>.14) {
            const energy=clamp(Math.abs(rel)*.57,.06,1);b.ring=Math.min(1,b.ring+energy);b.hits++;b.cool=.14;
            events.push({type:'chime',i,energy});if(active(i)) tags|=(1<<i);
          }
        }
      });
    }
    function moveGarden(h) {
      cloth.forEach((patch,k)=>{
        const a=air[k===3?4:3], u=a.u*(1-.095*k);
        for(let j=0;j<20;j++) {
          const q=patch[j], row=Math.floor(j/5), col=j%5;
          const tether=row?patch[j-5].d:0, side=col?patch[j-1].d:q.d;
          const evaporation=stage===2?u*(.0021+.0006*row)*(1+.10*col):u*.00012;
          q.wet=clamp(q.wet+h*((stage===0?.033:0)*(.78-.10*k-q.wet)-evaporation),.13,1);
          const lift=(k===3?2.1:1.28)*u*u*(.058+.028*row)*(1+.57*Math.sin(a.phase*.64-row*.72+col*.28+k*1.17));
          q.v+=h*(lift+26*(tether-q.d)+7*(side-q.d)-(8+q.wet*5)*q.d-(2.2+q.wet)*q.v);
        }
        patch.forEach(q=>{q.d+=h*q.v;q.light=q.d*(1-q.wet*.34);});
      });
      leaves.forEach((l,i)=>{
        const a=air[4], exposure=.68+.32*Math.sin(i*2.37);l.phase+=h*(2.5+a.u*.87+i*.017);
        l.v+=h*(a.u*a.u*exposure*(2.27+.66*Math.sin(l.phase))-(12+i%4)*Math.sin(l.angle)-2.15*l.v);
        l.angle+=h*l.v;
        if(Math.abs(l.angle)>1.62){l.angle=clamp(l.angle,-1.62,1.62);l.v*=-.32;}
      });
    }
    function moveWater(h) {
      const a=air[6];
      if(drip.falling){
        drip.v-=9.81*h;drip.y+=drip.v*h;
        if(drip.y<=.323){drip.y=.323;drip.falling=false;drip.volume=0;drip.impacts++;water[7].v+=.048;events.push({type:'drop',energy:stage===4?.55:.045});}
      }else{
        if(drip.volume===0)drip.generation++;
        drip.volume+=h*(.62+.10*gust);drip.y=.466-.009*Math.min(drip.volume*6,1);
        if(drip.volume>=1){drip.v=0;drip.falling=true;}
      }
      ripplePhase+=h*(2.4+a.u*.67);
      water.forEach((q,i)=>{
        const x=i%6,y=Math.floor(i/6), ns=[x?i-1:i,x<5?i+1:i,y?i-6:i,y<5?i+6:i];
        const pressure=(a.u+.11)*.021*Math.sin(ripplePhase-x*.74-y*.47)*(1+.48*Math.cos(x+y*2));
        q.v+=h*(pressure+ns.reduce((f,j)=>f+22*(water[j].h-q.h),0)-10*q.h-1.24*q.v);
      });
      water.forEach(q=>q.h+=q.v*h);
      const dir=input?.dir??1,cell=water[15];
      petal.vx+=h*(.011*a.drive*dir+cell.v*.4+(stage===4?0:(-.18-petal.x)*.13)-1.35*petal.vx);
      petal.vz+=h*(.006*a.drive*Math.sin(ripplePhase*.47)-1.14*petal.vz);
      petal.x+=h*petal.vx;petal.z+=h*petal.vz;
      const r=Math.hypot(petal.x,petal.z);
      if(r>.237){if(stage===4&&!petal.docked){petal.docked=true;water[23].v+=.09;events.push({type:"drop",energy:.82});}petal.x*=.237/r;petal.z*=.237/r;petal.vx*=-.38;petal.vz*=-.38;}
      if(stage===4)petal.travel+=h*Math.hypot(petal.vx,petal.vz);
    }
    function moveToys(h) {
      const a=air[7];
      wheel.omega+=h*(1.16*a.u*a.u-.78*wheel.omega-.12*wheel.omega*Math.abs(wheel.omega));
      const notch=Math.floor(wheel.angle/TAU);wheel.angle+=h*wheel.omega;if(stage===5&&Math.floor(wheel.angle/TAU)>notch)events.push({type:'click'});if(stage===5)wheel.turns+=h*wheel.omega/TAU;
      wheel.hoist=clamp(wheel.hoist+(stage===5?.0031*wheel.omega:-Math.min(.035,wheel.hoist*1.2))*h,0,.31);
      wheel.lift+=(.13*(1-Math.cos(wheel.angle))*.5-wheel.lift)*(1-Math.exp(-h*11));
      const p=plane, wind=air[8];
      if(!p.flying){p.heading*=Math.exp(-h*.6);p.trim*=Math.exp(-h*1.2);}
      if(stage===6&&!p.flying&&!p.landed&&effort>14) {
        p.flying=true;p.vz=-1.65-wind.drive*.17;p.vy=1.28+wind.drive*.14;p.vx=.24;events.push({type:'launch'});
      }
      if(p.flying) {
        // Beyond the fence the sheltered return current turns the folded wings.
        // Lift falls with distance from the finger and with diminishing airspeed.
        const range=Math.hypot(p.x,p.z), jet=wind.drive*Math.exp(-range*.72);
        if(p.z< -4.7)p.returning=true;
        const drift=p.returning?-.72*p.x:.37+.07*jet;
        const along=p.returning?-.56*p.z:-1.78-.085*jet;
        p.vx+=h*(drift-p.vx)*1.31;p.vz+=h*(along-p.vz)*1.08;
        const speed=Math.hypot(p.vx,p.vz);
        let direction=Math.atan2(p.vx,-p.vz);
        if(direction<-.8)direction+=TAU;
        p.heading+=h*(direction-p.heading)*Math.min(2,speed*2);
        p.trim+=h*(wind.eddy*.12+.18*(direction-p.heading)-p.trim*.89);
        const lift=.27*speed+.10*jet-.61;
        p.vy+=h*(p.returning?.92*(Math.min(1.26,range*.34)-p.y)-1.68*p.vy:lift-.60*p.vy);
        p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;
        if(p.returning&&range<.018&&Math.abs(p.y)<.012&&Math.abs(p.vy)<.03){
          p.x=p.y=p.z=p.vx=p.vy=p.vz=0;p.flying=false;p.landed=true;
        }
      }
    }
    function moveLight(h) {
      const target=stage<3?.64:stage===3?clamp(.64-effort*.014,-.115,.64):stage===6?clamp(-.115+age*.021,-.115,.64):-.115;
      sun.velocity+=h*(1.5*(target-sun.alt)-2.25*sun.velocity);sun.alt+=h*sun.velocity;
      bloom*=Math.exp(-h*2.8);
      if(stage===3 && sun.alt<.31 && (input||fireworks>0)) {
        burstWait-=h;
        if(burstWait<=0) {
          burstWait=2.5+random()*2.1;fireworks++;burstId++;
          const x=(random()-.5)*7,y=3.2+random()*1.2,z=-17-random()*4,hue=burstId%3;
          for(let k=0;k<49;k++){
            const cost=random()*2-1,ph=random()*TAU,speed=.64+random()*1.38, s=Math.sqrt(1-cost*cost);
            sparks.push({id:burstId*64+k,x,y,z,vx:Math.cos(ph)*s*speed,vy:cost*speed,vz:Math.sin(ph)*s*speed,life:1.35+random()*1.25,hue});
          }
          pendingSounds.push({delay:.6+random()*.65,energy:.22+random()*.32});bloom=.06;
        }
      }
      for(const s of sparks){s.life-=h;s.vx*=1-.73*h;s.vz*=1-.73*h;s.vy+=h*(-.46-.73*s.vy);s.x+=h*s.vx;s.y+=h*s.vy;s.z+=h*s.vz;}
      sparks=sparks.filter(s=>s.life>0);
      pendingSounds.forEach(s=>{s.delay-=h;if(s.delay<=0)events.push({type:'firework',energy:s.energy});});
      pendingSounds=pendingSounds.filter(s=>s.delay>0);
      dust.forEach((d,i)=>{d.phase+=h*(.58+d.v);d.x+=h*(d.v+.085*air[i%9].u);d.y+=h*.018*Math.sin(d.phase);if(d.x>5){d.x-=10;d.generation=(d.generation||0)+1;}});
    }
    function tick(h) {
      elapsed+=h;age+=h;if(!input)idle+=h;else idle=0;
      moveAir(h);moveBells(h);moveGarden(h);moveWater(h);moveToys(h);moveLight(h);
      effort+=h*Math.max(...groups[stage].map(i=>air[i].drive));
      const target=stage===0?.0:stage===1?.25:stage===2?.83:stage===3?1:.54;
      focus+=(target-focus)*(1-Math.exp(-h*.54));
      const shot=stage<4||stage===6&&plane.landed?0:stage-3;
      cameraMix.forEach((w,j)=>{cameraSpeeds[j]+=h*(4.2*((j===shot?1:0)-w)-4.12*cameraSpeeds[j]);cameraMix[j]+=h*cameraSpeeds[j];});
      if((stage===0 && tags && effort>32)||(stage===1 && tags===7 && effort>63)||
        (stage===2 && cloth[0][19].wet<.39 && leaves.some(l=>l.angle>.99) && cloth.some(p=>p.some(q=>q.d>.067)))||
        (stage===3 && fireworks>=4 && sun.alt<-.055)||
        (stage===4 && petal.docked)||
        (stage===5 && wheel.hoist>=.31)||
        (stage===6 && plane.landed && sun.alt>.60))advance();
    }
    function state(){return {elapsed,stage,season,age,effort,idle,completed,air,bells,cloth,leaves,water,drip,petal,wheel,plane,sun,dust,sparks,fireworks,bloom,focus,cameraMix,input};}
    return {step(dt){if(!(dt>=0&&Number.isFinite(dt)))return;remainder+=dt;while(remainder>=H-1e-11){tick(H);remainder-=H;}},
      getState(){return JSON.parse(JSON.stringify(state()));},read:state,touch,release(){input=null;},active,
      drain(){const out=events;events=[];return out;},zones,groups};
  }
  root.EngawaSim={create,zones,groups};
  if(typeof module!=='undefined')module.exports=root.EngawaSim;
})(typeof window==='undefined'?globalThis:window);
