/* Distances in metres, simulation time in seconds. No rendering dependencies. */
(function (root) {
  'use strict';
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const mean = a => sum(a) / a.length;
  const relax = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
  function generator(seed) {
    return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function create(seed = 3721) {
    const random = generator(seed);
    const soil = Array.from({length: 6}, (_, i) => ({
      wet: .16 + .035 * i, mass: .38 + .045 * Math.sin(i * 2.1), original: .38 + .045 * Math.sin(i * 2.1),
      force: 0, loss: 0
    }));
    const fields = Array.from({length: 4}, (_, i) => ({
      area: [3.6, 4.25, 4.65, 5.1][i], h: Array.from({length: 7}, (_, j) => .022 + .003 * Math.cos(j * .8 + i)),
      ripple: Array(7).fill(0), rv: Array(7).fill(0), level: .022
    }));
    const channels = Array.from({length: 4}, (_, i) => ({ q: 0, slope: [.58, .76, .71, .64][i], section: 0, travel: 0, splash: 0, spray: [], carry: 0 }));
    const sprayRandom = generator(seed ^ 0x61a7);
    const shoots = Array.from({length: 28}, (_, i) => ({ height: 0, bend: .016 * Math.sin(i), speed: 0, planted: false, row: Math.floor(i / 7) }));
    const frogs = Array.from({length: 3}, (_, i) => ({ breath: .13 + i * .19, voice: 0, calling: false, calls: 0 }));
    const motes = Array.from({length: 18}, () => ({ x: random(), y: random(), z: random(), vx: 0, vy: 0, charge: random(), glow: 0 }));
    const s = { time: 0, phase: 0, cycle: 0, idle: 0, soil, fields, channels, shoots, frogs, motes,
      spring: {head: .34, velocity: .001, supply: .048, pulse: 0}, wind: [.03, .005, -.013, .018], gust: .04,
      gate: {lift: 0, v: 0, latch: 0}, wheel: {angle: .14, speed: 0, twig: 1, impact: 0},
      tool: {depth: 0, v: 0, at: 2.5, park: 0}, drain: 0, dusk: 0, afterglow: 0, grit: [], gritCount: 0, bedFlux: 0,
      input: null, impulse: 0, row: 0, planted: 0, evening: 0, camera: 0, hint: 0 };
    let noiseLeft = 0, springKick = 0, grainDebt = 0, plantDebt = 0, accumulator = 0;
    const active = () => ['soil', 'gate', 'wheel', 'rice', 'frog', 'morning'][s.phase];
    function press(kind, position = .5, strength = 1) {
      s.idle = 0;
      if (kind !== active() || kind === 'morning') return false;
      s.input = { kind, position: clamp(position), strength: clamp(strength, .24, 1.5) };
      s.impulse = Math.min(1.8, s.impulse + 1);
      return true;
    }
    function move(position, strength) {
      if (s.input) { s.input.position = clamp(position); s.input.strength = clamp(strength, .4, 1.5); s.idle = 0; }
    }
    function release() { s.input = null; }
    function phase(n) { s.phase = n; s.input = null; s.impulse = 0; s.idle = 0; }
    function springAndAir(dt) {
      noiseLeft -= dt;
      if (noiseLeft <= 0) { noiseLeft = .45 + 1.45 * random(); s.gust = (random() - .39) * .63; springKick = (random() - .48) * .035; }
      s.spring.velocity += ((.34 - s.spring.head) * 2 - s.spring.velocity * 1.1 + springKick - channels[0].q * .14) * dt;
      s.spring.head += s.spring.velocity * dt;
      s.spring.supply = .045 + (s.spring.head - .3) * .11;
      s.spring.pulse += s.spring.supply * dt;
      for (let i = 3; i >= 0; i--) s.wind[i] = relax(s.wind[i], i ? s.wind[i-1] : s.gust, 1.8 - i * .28, dt);
    }
    function ground(dt) {
      const touch = s.input && s.input.kind === 'soil';
      let at = touch ? s.input.position * 5 : s.tool.at;
      if (touch && soil[Math.round(at)].mass < .035) {
        const left = soil.map((p,i) => p.mass > .035 ? Math.abs(i-at) : 20);
        at = left.indexOf(Math.min(...left));
      }
      s.tool.park = relax(s.tool.park, s.phase === 0 ? 0 : 1, 2.5, dt);
      s.tool.at = relax(s.tool.at, at, 5, dt);
      const drive = s.phase === 0 ? ((touch ? s.input.strength : 0) + s.impulse * .66) : 0;
      s.tool.v += (drive * 7.4 - s.tool.depth * 23 - s.tool.v * 4.8) * dt;
      s.tool.depth += s.tool.v * dt;
      s.bedFlux = 0;
      soil.forEach((p,i) => {
        const exposure = (.038 + .017 * (5-i)) * (s.spring.head / .34);
        const near = Math.exp(-.62 * (i-s.tool.at)**2);
        p.wet += (exposure * (1-p.wet) + (i ? .032 * (soil[i-1].wet-p.wet) : 0) - .009*p.wet) * dt;
        p.force = relax(p.force, drive * near, 5.5, dt);
        const erosion = p.force * (.047 + .20*p.wet*p.wet) + (p.mass < .11 ? channels[0].q * .27 : 0);
        p.loss = Math.min(p.mass / dt, erosion);
        p.mass -= p.loss * dt;
        if (s.phase === 5) { p.mass = Math.min(p.original, p.mass + dt * (.035 + i*.002)); p.wet = relax(p.wet, .16 + .035*i, .5, dt); }
        s.bedFlux += p.loss;
        grainDebt += p.loss * dt * 53;
        if (grainDebt >= 1) {
          grainDebt--; s.gritCount++;
          s.grit.push({x:(i-2.5)*.083, y:.14+p.mass*.4, z:0, vx:(random()-.5)*.22, vy:.12+random()*.29, vz:.2+random()*.62, size:.025+random()*.055, rest:0});
        }
      });
      for (const p of s.grit) {
        if (p.y > -.29 || p.vy > 0) { p.vy -= 3.8*dt; p.y += p.vy*dt; p.x += p.vx*dt; p.z += p.vz*dt; }
        if (p.y <= -.29) { p.y = -.29; p.vy = Math.abs(p.vy)>.16 ? -p.vy*.19 : 0; p.vz *= .43; p.rest += dt; }
      }
      s.grit = s.grit.filter(p => p.rest < 2.1);
    }
    function mechanisms(dt) {
      const g = s.gate, w = s.wheel;
      if (s.phase === 1) g.latch = clamp(g.latch + dt * ((s.input ? .32*s.input.strength : 0) + s.impulse * .92));
      if (s.phase === 5) g.latch = Math.max(0,g.latch-dt*.14);
      g.v += (8*(g.latch*.48-g.lift) - 4*g.v)*dt; g.lift += g.v*dt;
      if (s.phase === 2) w.twig = Math.max(0, w.twig - dt*((s.input ? .22*s.input.strength : 0) + s.impulse*.58));
      if (s.phase === 5) w.twig = Math.min(1,w.twig+dt*.095);
      const torque = channels[2].q*18 + (s.phase === 2 ? s.impulse*.52 : 0);
      w.speed += (torque - (.72 + 6*w.twig)*w.speed - .32*w.speed*Math.abs(w.speed))*dt;
      const old = Math.floor(w.angle*12/(2*Math.PI));
      w.angle += w.speed*dt;
      w.impact = relax(w.impact,0,8,dt);
      if (Math.floor(w.angle*12/(2*Math.PI)) !== old) w.impact = Math.min(.8,w.speed*.5);
    }
    function hydrology(dt) {
      const opening = mean(soil.map(p => (1-p.mass/p.original)**1.7));
      const apertures = [opening, s.gate.lift/.48, (1-s.wheel.twig)**1.4, s.planted/28];
      const slopeFactor = 1.35; // m/s per unit slope. Q = section * slope * slopeFactor.
      for (let i=0; i<4; i++) {
        const c = channels[i], up = fields[i-1], f = fields[i];
        const head = up ? Math.max(0,up.h[6]-.107) : s.spring.head;
        const openSection = apertures[i] * head * [.20,.67,.74,.91][i];
        const velocity = slopeFactor * c.slope;
        const suppliedSection = (i ? .12 : s.spring.supply) / velocity;
        c.section = relax(c.section, Math.min(openSection,suppliedSection), 2.1+i*.31,dt);
        c.q = c.section * velocity;
        const sent = Math.min(c.q * dt, up ? up.h[6]*up.area/7 : 1);
        if (up) up.h[6] -= sent*7/up.area;
        f.h[0] += sent*7/f.area;
        c.travel += c.q * dt / .042;
        c.splash = relax(c.splash,c.q*Math.sqrt(2*9.81*c.slope),3,dt);
        c.carry += c.splash * 254 * dt;
        if(c.carry>=1 && c.spray.length<27){
          c.carry--;const angle=sprayRandom()*Math.PI*2, speed=.14+.55*sprayRandom();
          c.spray.push({x:(sprayRandom()-.5)*.33,y:.004,z:(sprayRandom()-.5)*.09,
            vx:Math.cos(angle)*speed,vy:(.84+.95*sprayRandom())*Math.sqrt(c.slope),
            vz:Math.sin(angle)*speed+.23,size:.012+.016*sprayRandom()});
        }
        for(const drop of c.spray){
          drop.vy-=9.81*dt;drop.y+=drop.vy*dt;drop.x+=drop.vx*dt;drop.z+=drop.vz*dt;
          if(drop.y<=0)f.rv[0]+=Math.min(.00028,drop.size*drop.size*Math.abs(drop.vy)*.4);
        }
        c.spray=c.spray.filter(drop=>drop.y>0);
      }
      fields.forEach((f,i) => {
        const old = f.h.slice(), wave = f.ripple.slice();
        for (let j=0;j<7;j++) {
          const l=old[Math.max(0,j-1)], r=old[Math.min(6,j+1)];
          // Adjacent strips exchange water down the free-surface gradient.
          f.h[j] += dt*(3.6*(l+r-2*old[j]) - Math.max(0,old[j]-.225)*2.2 - s.drain*Math.max(0,old[j]-(.019+.001*(j%4)))*(.21+.076*j));
          const impact = j===0 ? channels[i].splash*.028*Math.sin(channels[i].travel*12) : 0;
          f.rv[j] += dt*(7*(wave[Math.max(0,j-1)]+wave[Math.min(6,j+1)]-2*wave[j])-2*wave[j]-1.1*f.rv[j]+impact+s.wind[i]*(.00095+j*.00009));
          f.ripple[j] += dt*f.rv[j];
        }
        f.level = mean(f.h);
      });
    }
    function life(dt) {
      if (s.phase === 3 && (s.input || s.impulse > .03)) {
        const row = s.input ? Math.min(3,Math.floor(s.input.position*4)) : s.row;
        s.row = row;
        plantDebt += dt*((s.input ? 2.2 : 0) + s.impulse*6);
        if (plantDebt >= 1) {
          const shoot = shoots.find(p => p.row===row && !p.planted);
          if (shoot) { shoot.planted=true; s.planted++; }
          plantDebt = 0;
        }
      }
      shoots.forEach((p,i) => {
        const wet = fields[2].h[i%7];
        p.height = relax(p.height,p.planted ? .205 + .30*wet + .015*Math.sin(i*2.3) : 0, p.planted ? .72 : .30,dt);
        p.speed += ((s.wind[p.row]*(.2+i%5*.023) + fields[2].rv[i%7]*7 - 3.3*p.bend) - 1.35*p.speed)*dt;
        p.bend += p.speed*dt;
      });
      const evening = s.phase===4;
      s.dusk = relax(s.dusk,evening ? 1 : (s.phase===5 ? 0 : .20*s.planted/28), evening ? .095 : .16,dt);
      frogs.forEach((p,i) => {
        const sing = evening && s.dusk>.28;
        const touched = sing && s.input && Math.min(2,Math.floor(s.input.position*3))===i;
        p.breath = clamp(p.breath+dt*(p.calling ? -1.22-i*.19 : (sing ? .15+.03*i+(touched?.95:0)+frogs[(i+2)%3].voice*.075 : .014)) * (p.calling ? 1 : (1-p.breath*.30)));
        if (!p.calling && sing && p.breath>.91) {p.calling = true; p.calls++;}
        if (p.calling && p.breath<.12) p.calling=false;
        p.voice=relax(p.voice,p.calling ? Math.sin(Math.PI*clamp(p.breath)) : 0, 9,dt);
      });
      motes.forEach((p,i) => {
        p.vx += dt*(s.wind[i%4]*.10 + (.5-p.x)*.25 - .7*p.vx);
        p.vy += dt*((.22+.55*p.charge-p.y)*.41 - .62*p.vy);
        p.x+=dt*p.vx; p.y+=dt*p.vy;
        p.charge=clamp(p.charge+dt*((.15+.016*(i%6))*(1-p.glow) - p.glow*.85));
        if(p.charge>.92) p.lit=true;
        if(p.charge<.20) p.lit=false;
        p.glow=relax(p.glow,p.lit ? 1:0,2+i%3,dt);
      });
      s.camera=relax(s.camera,Math.min(3,s.phase===5?0:s.phase),.26,dt);
      s.drain=relax(s.drain,s.phase===5?1:0,1.3,dt);
      if (s.phase===0 && fields[0].level>.168 && mean(soil.map(p=>p.mass/p.original))<.15) phase(1);
      else if (s.phase===1 && s.gate.latch>.96 && fields[1].level>.148) phase(2);
      else if (s.phase===2 && s.wheel.speed>.16 && s.wheel.twig<.05 && fields[2].level>.143) phase(3);
      else if (s.phase===3 && s.planted===28 && fields[3].level>.134) phase(4);
      else if (evening) {
        s.evening+=dt;
        if(s.evening>32 && Math.min(...frogs.map(p=>p.calls))>=3) {phase(5); shoots.forEach(p=>p.planted=false);}
      } else if(s.phase===5 && s.dusk<.045 && fields.every(f=>f.level<.033) && soil.every(p=>p.mass>=p.original-.001)) {
        s.planted=0; s.cycle++; s.evening=0; frogs.forEach(p=>p.calls=0); phase(0);
      }
      s.hint=relax(s.hint,s.idle>3.8 && s.phase<5 ? 1:0,5,dt);
    }
    function tick(dt) {
      s.time+=dt; s.idle=s.input?0:s.idle+dt; s.impulse*=Math.exp(-5*dt);
      springAndAir(dt); ground(dt); mechanisms(dt); hydrology(dt); life(dt);
    }
    return {state:s, active, press, move, release,
      step(dt) {if(!Number.isFinite(dt)||dt<=0)return; accumulator+=dt; while(accumulator+1e-10>=.0125){tick(.0125);accumulator-=.0125;}},
      getState() {return JSON.parse(JSON.stringify(s));} };
  }
  const api = {create, generator, clamp};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.Tanada=api;
})(globalThis);
