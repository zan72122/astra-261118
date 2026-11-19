/* Metric world coordinates, seconds, radians. The same fixed-step solver runs in Node and in the game. */
(function (root) {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const joint = (x = 0) => ({x, v: 0});
  function spring(j, goal, k, drag, h) {
    j.v += ((goal - j.x) * k - drag * j.v) * h;
    j.x += j.v * h;
  }
  function rng(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  const stops = [14, 34, 53], bridgeX = 22;
  function create(seed = 1841) {
    const random = rng(seed), events = [];
    let remainder = 0;
    const array = (n, f) => Array.from({length: n}, (_, i) => f(i));
    const s = {
      stage: 'stamp',
      age: 0,
      time: 0,
      round: 0,
      count: 0,
      house: 0,
      held: false,
      pressure: 0,
      idle: 0,
      hint: 0,
      finger: {reach: joint(), pad: joint(), pressing: false, dwell: 0},
      stampY: joint(.26),
      stampTilt: joint(-.12),
      contact: false,
      stampPhase: 'wait',
      phaseAge: 0,
      peak: 0,
      hold: 0,
      paper: joint(),
      paperCurl: array(7, () => joint()),
      ink: array(49, () => 0),
      fibre: array(49, () => 0),
      pore: array(49, () => .65 + random() * .65),
      prints: [],
      sheets: [],
      paperID: 0,
      bag: array(16, () => joint()),
      bagLoad: 0,
      transfer: joint(),
      loadTrip: joint(),
      needle: joint(),
      pan: joint(),
      air: joint(.06),
      gust: .12,
      gustLeft: 1.4,
      motes: array(36, () => ({x: random() * 10 - 5, y: random() * 5 + .3, z: random() * 6 - 4, v: random() * .035, mass: .5 + random(), origin: random() * 3})),
      light: joint(.91),
      water: array(25, () => joint()),
      dropLeft: .35,
      dropIndex: 0,
      bikeX: .12,
      bikeYaw: joint(),
      speed: 0,
      wheel: 0,
      pedal: 0,
      drive: 0,
      axles: [joint(), joint()],
      stone: 0,
      boatZ: -13.5,
      boatSpeed: 0,
      boatWake: array(7, () => joint()),
      boatDrive: 0,
      bridgePassed: false,
      bridgeEngaged: false,
      rotor: joint(),
      span: joint(1.02),
      mail: joint(),
      mailFollow: joint(),
      pass: [joint(), joint()],
      door: array(3, () => joint()),
      flag: array(3, () => joint()),
      hand: array(3, () => joint()),
      received: [false, false, false],
      fold: [joint(), joint()],
      folded: [false, false],
      plane: {x: 53, y: 1.70, z: -7.70, vx: 0, vy: 0, vz: 0, bank: joint(), flight: 0},
      spin: joint(),
      millAngle: 0,
      wobble: joint(),
      wobbleObject: '',
      muted: false
    };
    for (let i = 0; i < 5; i++) s.sheets.push(i === 0 ? {ink: s.ink, fibre: s.fibre, pore: s.pore} : {ink: array(49, () => 0), fibre: array(49, () => 0), pore: array(49, () => .65 + random() * .65)});
    s.motes.forEach(m => {
      m.restY = m.y;
      m.vy = 0;
    });
    const emit = (name, p = 1) => {
      events.push({name, p});
      if (events.length > 80) events.shift();
    };
    function stage(name) {
      s.stage = name;
      s.age = 0;
      s.idle = 0;
      s.hint = 0;
      s.held = false;
      s.pressure = 0;
    }
    function phase(name) {
      s.stampPhase = name;
      s.phaseAge = 0;
    }
    function target() {
      switch (s.stage) {
        case 'stamp':
          return s.stampPhase === 'wait' ? 'letter' : null;
        case 'weigh':
          return 'bag';
        case 'load':
          return 'bag';
        case 'ride':
          return 'bike';
        case 'deliver':
          return 'box';
        case 'harbor':
          return 'boat';
        case 'bridge':
          return 'crank';
        case 'fold':
          return s.folded[0] ? 'wingR' : 'wingL';
        case 'launch':
          return 'plane';
        default:
          return null;
      }
    }
    function down(id, force = .5) {
      if (id !== target() || !id) {
        if (id) {
          s.wobbleObject = id;
          s.wobble.v += .18;
        }
        return false;
      }
      s.idle = 0;
      s.hint = 0;
      s.held = true;
      s.pressure = clamp(force, .08, 1);
      if (s.stage === 'stamp') {
        s.peak = s.pressure;
        s.hold = 0;
        phase('press');
      }
      else if (s.stage === 'weigh') {
        stage('weighing');
        emit('paper', .48);
      }
      else if (s.stage === 'load') {
        stage('loading');
        emit('buckle');
      }
      else if (s.stage === 'deliver') {
        stage('receiving');
        emit('paper');
      }
      else if (s.stage === 'ride') {
        s.drive = Math.min(2.4, s.drive + 1.8);
        emit('tick', .65);
      }
      else if (s.stage === 'harbor') {
        s.boatDrive = Math.min(2, s.boatDrive + 1.3);
        emit('boatBell');
      }
      else if (s.stage === 'fold') {
        s.folded[s.folded[0] ? 1 : 0] = true;
        stage('creasing');
        emit('paper', .64);
      }
      else if (s.stage === 'bridge') {
        s.bridgeEngaged = true;
        s.rotor.v += 2.4;
        emit('buckle', .5);
      }
      else if (s.stage === 'launch') {
        stage('flight');
        s.plane.vx = -2.7;
        s.plane.vy = 2.3;
        s.plane.vz = 1.2;
        emit('paper');
      }
      return true;
    }
    function pressure(p) {
      if (s.held) s.pressure = clamp(p, .08, 1);
    }
    function up() {
      s.held = false;
      s.pressure = 0;
    }
    function atmosphere(h) {
      s.gustLeft -= h;
      if (s.gustLeft <= 0) {
        s.gustLeft = .8 + random() * 3.2;
        s.gust = (random() - .40) * .35;
      }
      spring(s.air, s.gust, 1.9, 2.1, h);
      spring(s.light, .93 + s.air.x * .39, 1.2, 1.5, h);
      for (const m of s.motes) {
        m.v += (s.air.x / m.mass - .26 * m.v - .022 * (m.x - m.origin)) * h;
        m.x += m.v * h;
        m.vy += (Math.sin(m.x * .8 + m.z) * .017 / m.mass - .043 * (m.y - m.restY) - .54 * m.vy) * h;
        m.y += m.vy * h;
      }
      s.dropLeft -= h;
      if (s.dropLeft <= 0) {
        s.dropLeft = .7 + random() * 1.8;
        s.dropIndex = 1 + Math.floor(random() * 23);
        s.water[s.dropIndex].v += .024 + random() * .042;
      }
      const heights = s.water.map(w => w.x);
      s.water.forEach((w, i) => {
        const a = heights[i > 0 ? i - 1 : 0], b = heights[i < 24 ? i + 1 : 24];
        w.v += (43 * (a + b - 2 * w.x) - 7 * w.x - 1.55 * w.v) * h;
        w.x += w.v * h;
      });
    }
    function absorb(h, deposit, sheet) {
      const {ink, fibre, pore} = sheet;
      const old = ink.slice();
      for (let i = 0; i < 49; i++) {
        const x = i % 7, y = Math.floor(i / 7), near = (old[x ? i - 1 : i] + old[x < 6 ? i + 1 : i] + old[y ? i - 7 : i] + old[y < 6 ? i + 7 : i]) * .25;
        const pad = clamp(1.12 - Math.hypot((x - 3.1) * .14, (y - 3.1) * .18) + .18 * x / 6, .18, 1);
        ink[i] = clamp(old[i] + h * (deposit * pore[i] * pad * (1 - old[i]) + 1.35 * (near - old[i]) - 1.05 * old[i]), 0, 1);
        fibre[i] += h * 1.65 * ink[i] * pore[i] * (1 - fibre[i]);
      }
    }
    function counter(h) {
      const pressing = s.stage === 'stamp' && s.stampPhase === 'press';
      s.phaseAge += h;
      if (pressing) {
        s.hold += h;
        s.peak = Math.max(s.peak, s.pressure);
      }
      const force = Math.max(.08, s.peak), aim = pressing ? -.020 - force * .015 : .26;
      spring(s.stampY, aim, 185, 19, h);
      spring(s.stampTilt, pressing ? 0 : -.12, 75, 13, h);
      const contact = pressing && s.stampY.x <= .0049;
      if (contact && !s.contact) {
        emit('pon', .48 + .52 * force);
        s.paperCurl[3].v -= .19 * force;
      }
      s.contact = contact;
      if (contact) {
        s.stampY.x = Math.max(s.stampY.x, -.0097);
        s.stampY.v = Math.max(s.stampY.v, -.030);
      }
      for (let i = 0; i <= s.paperID; i++)absorb(h, contact && i === s.paperID ? (1.25 + force * 9 ) : 0, s.sheets[i]);
      if (pressing && s.phaseAge > (s.held ? .82 : .38))phase('dry');
      if (s.stage === 'stamp' && s.stampPhase === 'dry' && s.phaseAge > .78) {
        phase('slide');
        emit('paper', .85);
      }
      const sliding = s.stampPhase === 'slide';
      spring(s.paper, sliding ? 1 : 0, sliding ? 12 : 28, sliding ? 5.8 : 10, h);
      s.paperCurl.forEach((c, i) => spring(c, s.paper.v * (i - 2.8) * .041 + (contact ? -.006 * force * (1 - Math.abs(i - 3) / 4) : 0), 45 + i * 3, 7, h));
      if (sliding && s.paper.x > .995) {
        s.prints.push(s.fibre.slice());
        s.count++;
        s.bagLoad++;
        s.bag[3 + s.count].v += .12;
        emit('bag');
        phase('feed');
        if (s.count < 5) {
          s.paperID = s.count;
          Object.assign(s, s.sheets[s.paperID]);
        }
      }
      if (s.stampPhase === 'feed') {
        if (s.paper.x < .015) {
          phase('wait');
          s.idle = 0;
          if (s.count === 5)stage('weigh');
        }
      }
      s.bag.forEach((j, i) => {
        const neighbor = s.bag[(i + 15) % 16].x + s.bag[(i + 1) % 16].x;
        spring(j, s.bagLoad * (.012 + .007 * Math.cos(i * 2.1)) + .12 * (neighbor - 2 * j.x) + .018 * s.axles[i % 2].x, 25 + i * .7, 5.5, h);
      });
      const unpack = s.stage === 'landing' || s.stage === 'flight' && s.plane.x < 6.5;
      spring(s.transfer, !unpack && s.count === 5 && s.stage !== 'weigh' && s.stage !== 'stamp' ? 1 : 0, 6, 4.5, h);
      const onPan = clamp((s.transfer.x - .83) / .16, 0, 1) * (1 - clamp(s.loadTrip.x * 5, 0, 1));
      spring(s.pan, onPan * s.bagLoad * .012, 58, 10.5, h);
      spring(s.needle, s.pan.x * 31, 48, 7.8, h);
      if (s.stage === 'weighing') {
        if (s.needle.v > .45 && s.stone === 0) {
          emit('scale');
          s.stone = 1;
        }
        if (s.age > 3.8 && s.transfer.x > .96) {
          stage('load');
          emit('bell', .75);
        }
      }
      spring(s.loadTrip, !unpack && !['stamp', 'weigh', 'weighing', 'load'].includes(s.stage) ? 1 : 0, 5.5, 4.1, h);
      if (s.stage === 'loading' && s.loadTrip.x > .98) {
        stage('ride');
        s.drive = 1.4;
        s.stone = 0;
        emit('bell');
      }
    }
    function street(h) {
      const destination = s.house === 1 && !s.bridgePassed ? bridgeX : stops[s.house];
      if (s.stage === 'ride') {
        s.drive = clamp(s.drive + (s.held ? 1.8 : -.28) * h, 0, 2.4);
        const desired = Math.min(2.2, s.drive * 1.1, Math.max(0, 1.25 * (destination - s.bikeX)));
        s.speed += (desired - s.speed) * Math.min(1, h * 3.5);
        s.bikeX += Math.min(Math.max(0, destination - s.bikeX), s.speed * h);
        if (destination - s.bikeX < .012) {
          s.speed = 0;
          s.drive = 0;
          stage(destination === bridgeX ? 'harbor' : 'deliver');
          emit('bell', .63);
        }
      }
      if (s.stage === 'flight' || s.stage === 'landing') {
        const d = Math.max(0, s.bikeX - .12);
        const wanted = Math.min(5.1, Math.sqrt(4.8 * d));
        s.speed += (wanted - s.speed) * Math.min(1, 2.7 * h);
        s.bikeX -= Math.min(d, s.speed * h);
        spring(s.bikeYaw, s.round * Math.PI * 2 + (d > 1.9 ? Math.PI : Math.PI * 2), 11, 6, h);
      }
      s.wheel += s.speed * h / .44;
      s.pedal += s.speed * h * 1.07;
      s.axles.forEach((j, i) => {
        const d = s.bikeX + (i - .5) * 1.32, t = d / .35 % 1;
        const bump = .018 * (1 - Math.cos(t * 6.283)) * (.75 + .25 * Math.sin(Math.floor(d / .35) * 3));
        spring(j, bump * Math.min(1, s.speed * 2), 110 + i * 10, 12.5, h);
      });
      if (s.stage === 'ride' && Math.floor(s.bikeX / .35) !== s.stone) {
        s.stone = Math.floor(s.bikeX / .35);
        emit('stone', Math.min(1, s.speed / 2));
        if (s.stone % 5 === 0)emit('tick', .5);
        if (s.stone % 9 === 0) s.water[s.stone % 25].v += s.speed * .018;
      }
      if (s.stage === 'harbor') s.boatDrive = clamp(s.boatDrive + (s.held ? 1.2 : -.055) * h, 0, 1.5);
      const returnBoat = s.bridgePassed && s.span.x > .93 && s.boatZ > -13.5;
      const afloat = returnBoat || s.stage === 'harbor' && s.boatDrive > 0 || Math.abs(s.boatSpeed) > .002;
      if (afloat) {
        const goal = returnBoat ? -Math.min(1.25, Math.sqrt(Math.max(0, 1.8 * (s.boatZ + 13.5)))) : s.stage === 'harbor' ? s.boatDrive * .84 : 0;
        s.boatSpeed += (goal - s.boatSpeed) * h * .74;
        s.boatZ = Math.max(-13.5, s.boatZ + s.boatSpeed * h);
      }
      s.boatWake.forEach((wave, i) => spring(wave, i ? s.boatWake[i - 1].x * .82 : s.boatSpeed * .032 + s.water[13].x, 11 + i, 2.8, h));
      if (s.stage === 'harbor' && s.boatZ > -.85) {
        stage('bridge');
        s.boatDrive = 0;
        emit('boatBell', .7);
      }
      if (s.stage === 'bridge' && s.bridgeEngaged) {
        s.rotor.v += ((s.held ? 3.3 : 1.15) - .9 * s.rotor.v) * h;
      }
      else if (s.bridgePassed && s.bikeX > 29) s.rotor.v += (-s.rotor.x * 1.7 - s.rotor.v * 2.6) * h;
      else s.rotor.v *= Math.exp(-2 * h);
      s.rotor.x += s.rotor.v * h;
      spring(s.span, Math.max(0, 1.02 - s.rotor.x * .105), 8, 4.4, h);
      if (s.stage === 'bridge' && s.span.x < .033) {
        s.bridgePassed = true;
        stage('ride');
        s.drive = 1.65;
        emit('buckle');
      }
      const receive = s.stage === 'receiving';
      spring(s.mail, receive ? 1 : 0, 7, 4.7, h);
      spring(s.mailFollow, receive && s.house !== 2 && s.mail.x > .40 ? 1 : 0, 7.6, 4.9, h);
      s.pass.forEach((p, i) => {
        const ready = (i === 0 ? s.mail.x : s.mailFollow.x) > .81 && s.hand[s.house].x > .12;
        spring(p, receive && (i === 0 || s.house !== 2) && (ready || p.x > .035) ? 1 : 0, 8 + i, 4.9, h);
      });
      s.flag.forEach((j, i) => {
        const here = i === s.house && receive;
        spring(j, (s.received[i] && !(s.stage === 'flight' && s.plane.x < stops[i] - 2) && s.stage !== 'landing') || (here && s.mail.x > .69) ? 1.37 : 0, 41 + i, 5.1, h);
        spring(s.door[i], here && s.mail.x > .44 ? 1.12 : 0, 14, 5, h);
        spring(s.hand[i], here && s.door[i].x > .84 && s.mail.x > .8 && s.pass[s.house === 2 ? 0 : 1].x < .982 ? .55 : 0, 18, 6, h);
      });
      if (receive && s.age > 5.25) {
        s.received[s.house] = true;
        s.bagLoad = Math.max(0, s.bagLoad - (s.house === 2 ? 1 : 2));
        emit('chime', .7 + s.house * .12);
        if (s.house === 2) {
          stage('fold');
        } else {
          s.house++;
          stage('ride');
          s.drive = 1.8;
        }
      }
      s.fold.forEach((j, i) => spring(j, s.folded[i] && s.stage !== 'landing' ? 1.99 : 0, 14 - i * 2, 5.7, h));
      if (s.stage === 'creasing' && s.fold[s.folded[1] ? 1 : 0].x > 1.975) {
        stage(s.folded[1] ? 'launch' : 'fold');
        emit('paper', .38);
      }
      spring(s.spin, .55 + s.air.x * 2.4, 2, 1.4, h);
      s.millAngle += s.spin.x * h;
      if (s.stage === 'flight') {
        const p = s.plane;
        p.flight += h;
        const dest = p.x > 7 ? {x: -4.3, y: 5.4 + s.air.x * 2, z: -6.4} : {x: -2.3, y: 1.75, z: .5};
        p.vx += (dest.x - p.vx) * .8 * h;
        p.vy += ((dest.y - p.y) * 2.1 - 1.8 * p.vy + s.air.x * .4) * h;
        p.vz += ((dest.z - p.z) * .9 - 1.4 * p.vz) * h;
        p.x += p.vx * h;
        p.y += p.vy * h;
        p.z += p.vz * h;
        spring(p.bank, -p.vz * .16 + s.air.x, 6, 3, h);
        if (p.x < .48)stage('landing');
      }
      if (s.stage === 'landing') {
        const p = s.plane;
        p.vx += ((.07 - p.x) * 10 - p.vx * 5) * h;
        p.vy += ((1.55 - p.y) * 10 - p.vy * 5) * h;
        p.vz += ((.81 - p.z) * 10 - p.vz * 5) * h;
        p.x += p.vx * h;
        p.y += p.vy * h;
        p.z += p.vz * h;
        spring(p.bank, 0, 12, 6, h);
        if (s.age > 2.5) {
          const next = create(seed + 1).state, round = s.round + 1, muted = s.muted;
          const ambient = {
            wheel: s.wheel,
            pedal: s.pedal,
            bikeYaw: s.bikeYaw,
            air: s.air,
            light: s.light,
            motes: s.motes,
            water: s.water,
            gust: s.gust,
            gustLeft: s.gustLeft,
            dropLeft: s.dropLeft,
            dropIndex: s.dropIndex,
            time: s.time,
            millAngle: s.millAngle,
            spin: s.spin
          };
          Object.assign(s, next, ambient, {round, muted});
          emit('chime', .5);
        }
      }
    }
    function demonstrate(h) {
      const id = target();
      const showing = id && !s.held && s.idle > 4;
      const f = s.finger;
      s.hint = showing ? Math.min(1, (s.idle - 4) * 2) : 0;
      if (!showing) {
        f.pressing = false;
        f.dwell = 0;
      } else if (!f.pressing && f.reach.x < .035) {
        f.pressing = true;
        f.dwell = 0;
      } else if (f.pressing && f.reach.x > .94) {
        f.dwell += h;
        const hold = id === 'boat' || id === 'bike' ? 1.22 : .50;
        if (f.dwell > hold) f.pressing = false;
      }
      spring(f.reach, f.pressing ? 1 : 0, id === 'bag' ? 9 : 15, 6.4, h);
      spring(f.pad, Math.max(0, (f.reach.x - .71) / .29), 34, 7.5, h);
    }
    function fixed(h) {
      s.time += h;
      s.age += h;
      s.idle += h;
      atmosphere(h);
      counter(h);
      street(h);
      spring(s.wobble, 0, 38, 7, h);
      demonstrate(h);
    }
    function step(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      remainder += dt;
      while (remainder + 1e-10 >= 1 / 120) {
        fixed(1 / 120);
        remainder -= 1 / 120;
      }
    }
    return {state: s, step, down, up, pressure, target, events, getState: () => JSON.parse(JSON.stringify(s))};
  }
  const api = {create, stops, bridgeX};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PostSim = api;
})(globalThis);
