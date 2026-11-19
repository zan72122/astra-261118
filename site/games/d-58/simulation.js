/* Metres, seconds and radians. A fixed mechanical tick makes input independent of rendering. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AtriumMotion = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const H = 3.85, run = 7.45, flat = 0.82, slope = Math.hypot(run, H);
  const length = slope + 2 * flat, pitch = 0.36, count = 58, circuit = count * pitch;
  const edge = run / 2 + flat, lane = [1.65, -1.55, -4.75];
  const dt = 1 / 120, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const wrap = (x, n) => ((x % n) + n) % n;
  function point(bank, distance) {
    const flight = Math.floor(bank / 2), sign = flight % 2 ? -1 : 1;
    const s = clamp(distance, 0, length);
    const hill = clamp(s - flat, 0, slope);
    const x = -edge + Math.min(s, flat) + hill * run / slope + Math.max(0, s - flat - slope);
    return {x: sign * x, y: flight * H + H * hill / slope, z: lane[flight] - (bank % 2) * 1.46};
  }
  function create(options = {}) {
    let seed = options.seed || 12587, remainder = 0;
    function rand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    const series = (n, fn) => Array.from({length:n}, (_, i) => fn(i));
    const state = {
      stage:0, phase:'ready', bank:0, direction:options.direction === -1 ? -1 : 1,
      time:0, idle:0, held:false, toyHeld:false, age:0, touched:false, tours:0,
      progress:0, shoeY:0, shoeV:0, stance:0, stanceV:0, rider:point(0, 0),
      banks:series(6, i => ({speed:0,travel:0,filament:i===0?0.92:0.03, flex:series(count,()=>({y:0,v:0}))})),
      wind:series(9, () => ({speed:0.15+rand()*0.4,force:rand(),ttl:0.1+rand()})),
      leaves:series(18,i=>({angle:0,v:0,wet:0,cell:i%9,stiff:4+rand()*4}))
        .concat(series(5,i=>({angle:0,v:0,wet:0,cell:i,stiff:3.8+i*0.29}))),
      water:series(20,()=>({h:rand()*0.0015,v:0})), pressure:0.22, valve:0.22, pumpHead:0, drip:0,
      jets:series(5,i=>series(9,()=>Math.sqrt(2*9.81*0.22)*(0.76+i*0.025))),
      lamps:series(9,i=>({heat:0.42+rand()*0.2,angle:(rand()-0.5)*0.08,v:0,charge:0,i})),
      rotor:0, omega:0.1, wings:series(6,i=>({angle:i*0.01,v:0})),
      door:series(2,i=>({x:0,v:0,mass:1+i*0.13})), welcome:0,
      dust:series(28,i=>({x:(rand()-0.5)*7,y:rand()*3.2+0.15,z:rand()*3,v:0,cell:i%9})),
      hint:0, hintV:0, hintClock:0
    };
    if (state.direction < 0) state.rider = point(0,length);
    let galleryClock = 0, move = null, afterMove = null, comb = -1;
    function phase(name) { state.phase = name; state.age = 0; state.idle = 0; state.touched = false; state.hintClock=0; }
    function walk(to, next) {
      const p = state.rider, dist = Math.hypot(to.x-p.x,to.y-p.y,to.z-p.z);
      move = {from:{...p},to,duration:Math.max(1.3,dist/0.82)};
      afterMove = next; phase('walking');
    }
    function atBoard() { return point(state.bank, state.direction > 0 ? 0 : length); }
    function prepare() {
      if (state.stage === 3) state.tours++;
      state.stage = (state.stage + 1) % 4;
      state.direction = state.stage === 3 ? -1 : 1;
      state.bank = [0,2,4,5][state.stage]; state.progress=0;
      walk(atBoard(),()=>phase('ready'));
    }
    function departure() {
      state.progress = 0; comb = -1;
      phase('riding');
    }
    function arrive() {
      const s=state, flight = Math.floor(s.bank/2), sign = (flight%2 ? -1:1)*s.direction;
      const end = point(s.bank,s.direction>0?length:0);
      walk({...end,x:end.x+sign*0.96},()=>{
        if(s.stage===3 && s.bank>1) {
          s.bank-=2; s.progress=0; walk(atBoard(),()=>{if(s.held)departure();else phase('ready');});
        } else {
          galleryClock=0; phase('gallery');
          if(s.stage===3) s.welcome=0.18;
        }
      });
    }
    function press(kind) {
      const s=state;
      if(kind==='ride' && s.phase==='riding'){s.held=true;return true;}
      if(kind==='ride' && s.phase==='ready') { s.held=true; departure(); return true; }
      if(kind==='toy' && s.phase==='gallery') {
        s.toyHeld=true; s.touched=true; galleryClock=0; s.idle=0;
        if(s.stage===0){s.pumpHead=0.98;s.water[2].v+=0.105;}
        if(s.stage===1) { const lamp=s.lamps.reduce((a,b)=>a.heat<b.heat?a:b); lamp.charge+=1.5; lamp.v+=0.24; }
        if(s.stage===2) {s.wind[0].force+=2.1; s.wind[0].ttl=1.4;}
        if(s.stage===3) s.welcome=1.8;
        return true;
      }
      return false;
    }
    function release(){state.held=false; state.toyHeld=false;}
    function tick() {
      const s=state; s.time+=dt; s.age+=dt; if(!s.held && !s.toyHeld) s.idle+=dt;
      // The motor coasts to rest off circuit. Each loaded tread rebounds when the comb clears it.
      const active=s.phase==='ready'||s.phase==='riding';
      for(let b=0;b<6;b++){
        const motor=s.banks[b];
        const target=active && b===s.bank ? 0.5*s.direction:0;
        const current=target===0?0:1;
        motor.filament+=(current*(3.8-0.08*b)*(1-motor.filament)-0.40*(motor.filament-0.03))*dt;
        motor.speed+=clamp(target-motor.speed,-1.25*dt,1.25*dt);
        motor.travel+=motor.speed*dt;
        if(Math.abs(motor.speed)<0.0001 && !motor.flex.some(c=>Math.abs(c.v)+Math.abs(c.y)>0.00001)) continue;
        motor.flex.forEach((c,i)=>{
          const p=wrap(i*pitch+motor.travel,circuit);
          const loadPos=s.direction>0?s.progress:length-s.progress;
          const load=b===s.bank && s.phase==='riding'? Math.max(0,1-Math.abs(p-loadPos)/0.32):0;
          const seam=Math.max(0,1-Math.min(Math.abs(p-0.48),Math.abs(p-length+0.48))/0.13);
          c.v+=(-160*c.y-12*c.v-0.51*load-0.32*seam*Math.abs(motor.speed))*dt;
          c.y+=c.v*dt;
        });
      }
      if(s.phase==='riding') {
        s.progress=Math.min(length,s.progress+Math.abs(s.banks[s.bank].speed)*dt);
        const dist=s.direction>0?s.progress:length-s.progress;
        s.rider=point(s.bank,dist);
        const tooth=(s.progress<0.61 || length-s.progress<0.61)? Math.floor(s.progress/0.094):-1;
        if(tooth>=0 && tooth!==comb) s.shoeV-=0.054*(s.direction>0?1:0.83);
        comb=tooth;
        if(s.progress>=length-1e-8) arrive();
      } else if(s.phase==='walking') {
        const u=clamp(s.age/move.duration,0,1), k=u*u*(3-2*u);
        for(const axis of ['x','y','z']) s.rider[axis]=move.from[axis]+(move.to[axis]-move.from[axis])*k;
        if(u>=1) afterMove();
      } else if(s.phase==='gallery' && s.touched && !s.toyHeld) {
        galleryClock+=dt; if(galleryClock>5) prepare();
      }
      s.shoeV+=(-125*s.shoeY-12*s.shoeV)*dt; s.shoeY+=s.shoeV*dt;
      // Gusts enter individual bays, lose energy to friction, then pass to their neighbours.
      for(let i=s.wind.length-1;i>=0;i--){
        const w=s.wind[i]; w.ttl-=dt;
        if(w.ttl<=0){w.force=0.04+rand()*(i===0?1.55:0.63); w.ttl=0.6+rand()*2.5;}
        const upstream=s.wind[(i+8)%9].speed;
        w.speed+=(w.force+0.48*upstream-1.5*w.speed-0.18*w.speed*Math.abs(w.speed))*dt;
      }
      const brace=s.phase==='riding'?(s.held?0.046:-0.012)*s.direction:0;
      s.stanceV+=((brace-s.stance)*23-6.5*s.stanceV)*dt;s.stance+=s.stanceV*dt;
      const watering=s.stage===0&&s.toyHeld;
      s.pumpHead*=Math.exp(-1.05*dt);
      s.valve+=((watering?1.20:0.22+s.pumpHead)-s.valve)*dt*1.6;
      s.pressure+=(s.valve-s.pressure)*dt*2.4; s.drip+=dt*s.pressure*6.8;
      // pressure is water head in metres. Each jet segment carries the launch velocity
      // from its upstream neighbour. Gravity returns each stream to the water surface.
      s.jets.forEach((sections,i)=>{
        for(let j=sections.length-1;j>=0;j--){
          const inlet=j?sections[j-1]:Math.sqrt(2*9.81*s.pressure)*(0.76+i*0.025);
          sections[j]+=(inlet-sections[j])*(21+i*0.9)*dt;
        }
      });
      if(s.drip>=1){
        s.drip-=1;
        const i=Math.floor(rand()*5);
        s.water[i].v+=0.036+0.055*s.pressure;
        const blade=s.leaves[18+i]; // The five blades overhanging this basin intercept spray.
        blade.wet=Math.min(1,blade.wet+0.038*s.pressure);
      }
      // Surface cells exchange momentum. Drops detach at the nozzle and hit the near rim.
      const wave=s.water.map(c=>c.h);
      s.water.forEach((c,i)=>{
        c.v+=(68*(wave[(i+1)%20]+wave[(i+19)%20]-2*c.h)-15*c.h-3.1*c.v)*dt;
        c.h+=c.v*dt;
      });
      // Wind and adhering drops bend each stem. Drainage removes the load; elastic damping settles it.
      s.leaves.forEach((l,i)=>{
        l.wet*=Math.exp(-0.23*dt);
        l.v+=(s.wind[l.cell].speed*(0.38+0.012*i)-l.stiff*l.angle-1.25*l.v-l.wet*1.5)*dt;
        l.angle+=l.v*dt;
      });
      // The contacted lamp conducts heat to the next socket. The glass has a separate suspension.
      // heat is a fraction of a 40 K design temperature rise above ambient.
      const temp=s.lamps.map(l=>l.heat);
      s.lamps.forEach((l,i)=>{
        const current=(s.stage===1&&s.toyHeld&&i===4?1.4:0)+l.charge;
        l.charge*=Math.exp(-1.8*dt);
        l.heat+=((0.46+0.025*i+current-l.heat)*(0.79+i*0.024)+1.7*(temp[(i+1)%9]+temp[(i+8)%9]-2*l.heat))*dt;
        l.v+=(0.10*s.wind[i].speed+0.5*(l.heat-temp[(i+1)%9])-4.3*l.angle-0.8*l.v)*dt; l.angle+=l.v*dt;
      });
      // Air torque drives the shaft against bearing drag. Each bird rocks separately on its pin.
      const gust=s.wind[0].speed+(s.stage===2&&s.toyHeld?1.1:0);
      s.omega+=(0.45*gust*gust-0.62*s.omega*Math.abs(s.omega)-0.13*s.omega)*dt; s.rotor+=s.omega*dt;
      s.wings.forEach((w,i)=>{
        const lift=0.58*(0.3+s.wind[i].speed)*s.omega*Math.cos(s.rotor+i*Math.PI/3);
        w.v+=(lift-6.2*w.angle-1.35*w.v)*dt; w.angle+=dt*w.v;
      });
      s.welcome=Math.max(0,s.welcome-dt*0.11);
      // Separate guides carry each door. The closer brakes the leaf at the jamb after release.
      s.door.forEach((d,i)=>{
        const near=s.stage===3 && s.phase==='gallery';
        const opening=near?(s.toyHeld?1.25:clamp(0.3+s.welcome,0,1.25)):0;
        d.v+=((opening-d.x)*(6.0-i*0.4)-4.6*d.v)*dt/d.mass;
        d.x=clamp(d.x+d.v*dt,0,1.3);
      });
      s.dust.forEach((p,i)=>{
        // Convection balances gravity; the enclosed air cell turns the mote at its boundaries.
        const wind=s.wind[p.cell].speed;
        p.v+=((0.6+0.11*(i%5)-p.y*0.35)*0.21+0.09*(wind-0.45)-0.9*p.v)*dt;
        p.y+=p.v*dt;
        p.x+=dt*(0.07*wind-0.023*p.x); p.z+=dt*(0.022*s.wind[(i+3)%9].speed-0.012*p.z);
      });
      const prompting=(s.phase==='ready'||(s.phase==='gallery'&&!s.touched))&&s.idle>=4;
      if(prompting)s.hintClock+=dt;
      const h=prompting?clamp(2.4*Math.sin(Math.min(1,wrap(s.hintClock,4.5)/2.6)*Math.PI),0,1):0;
      s.hintV+=((h-s.hint)*32-s.hintV*9)*dt; s.hint+=s.hintV*dt;
    }
    function step(seconds){
      if(!Number.isFinite(seconds)||seconds<0) return;
      remainder+=seconds;
      while(remainder+1e-10>=dt){tick(); remainder-=dt;}
    }
    function nudge(leaf){
      if(state.leaves[leaf])state.leaves[leaf].v+=0.025;
    }
    return {state,step,press,release,nudge,getState:()=>JSON.parse(JSON.stringify(state))};
  }
  return {create, point, H, run, flat, slope, length, edge, lane, pitch, count, circuit, wrap};
});
