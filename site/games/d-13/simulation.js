/* Distances are metres, forces are expressed per unit mass, and time is seconds.
   Each spring keeps its own velocity. Contact impulses disappear once the wheel,
   gust or drop has passed, leaving that local oscillator free to settle. */
(function (root) {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = x => (x = clamp(x, 0, 1), x * x * (3 - 2 * x));
  const blend = (a, b, x) => a + (b - a) * x;
  const TOWN = 423, COAST = 710, LENGTH = 22.2;
  function trackX(z, branch) {
    const fork = smooth((z - 24) / 42) * (1 - smooth((z - 190) / 54));
    return 6 * smooth((z - 78) / 70) - 19 * smooth((z - 201) / 95)
      + 17 * smooth((z - 345) / 70) - 24 * smooth((z - 453) / 125)
      + 14 * smooth((z - 616) / 80) + branch * 9.6 * fork;
  }
  const sidingX = z => trackX(z, 0) - 5.4 * (1 - smooth((z - TOWN + 31) / 30));
  // Integrate horizontal arc length once, so commanded speed is along the
  // rails even where the branch curves strongly away from the centre line.
  const spacing = .25;
  const lengths = [0, 1].map(branch => {
    const table = [0];
    for (let i = 1; i <= COAST / spacing; i++) {
      const z = i * spacing;
      table.push(table[i - 1] + Math.hypot(spacing, trackX(z, branch) - trackX(z - spacing, branch)));
    }
    return table;
  });
  function chainage(metres, branch) {
    const t = lengths[branch]; let l = 0, r = t.length - 1;
    while (r - l > 1) { const m = (l + r) >> 1; if (t[m] <= metres) l = m; else r = m; }
    return (l + (metres - t[l]) / (t[r] - t[l])) * spacing;
  }
  function rng(seed) {
    return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function spring(o, target, k, drag, h) {
    o.v += ((target - o.x) * k - o.v * drag) * h;
    o.x += o.v * h;
  }
  function create(seed = 39017) {
    const rand = rng(seed), oscillator = () => ({ x: 0, v: 0 });
    const gustRng = Array.from({length:24}, (_,i)=>rng(seed + 251*i + 19));
    const waterRng = Array.from({length:48}, (_,i)=>rng(seed + 613*i + 391));
    const dustRng = Array.from({length:40}, (_,i)=>rng(seed + 457*i + 163));
    const switches = Array.from({length: 2}, () => ({points: 0, from: 0, goal: 0, throwTime: .3, blade: [0, 0], lever: {x: -.55, v: 0}}));
    const s = {
      stage: 'switch', elapsed: 0, age: 0, idle: 0, journey: 0,
      switches, activeSwitch: 0, trainX: 0, odometer: 0, distance: 0, speed: 0, branch: 0, selected: false, points: 0,
      blade: [0, 0], throwTime: .3,
      lever: oscillator(), button: oscillator(), buttonHeld: 0, guide: {charge: .35, charging: true, glow: .24},
      gate: oscillator(), relay: 0, flash: [0, 0], crossing: false, car: -24, carSpeed: 2.8,
      wind: Array.from({ length: 24 }, (_, i) => ({ ...oscillator(), gust: rand() * .7 - .25, wait: rand() * 2, stiffness: 2 + rand() * 2, z: i * 33 })),
      water: Array.from({ length: 48 }, () => ({ x: (rand() - .5) * .045, v: 0, wait: rand() * 4 + .1 })),
      dust: Array.from({ length: 40 }, () => ({ x: rand() * 18 - 9, y: .3 + rand() * 4, z: rand() * 18 - 8, vx: 0, vy: 0, vz: 0, life: 1 })),
      body: [oscillator(), oscillator(), oscillator()], joint: [-1, -1, -1],
      coupled: false, wagon: TOWN - 33, wagonSpeed: 0, buffer: oscillator(),
      sun: { x: .112, v: 0 }, filament: Array.from({ length: 9 }, () => ({ x: 0, tau: .45 + rand() * 1.25 })),
      ferry: 0, ferrySpeed: 0, mist: 0, morning: 0, light: .12,
      bell: 0, chime: 0, foot: oscillator(), waggle: oscillator()
    };
    const setStage = stage => { s.stage = stage; s.age = 0; s.idle = 0; };
    function go(action) {
      const town = s.stage === 'townSwitch';
      if (action === 'lever' && (s.stage === 'switch' || s.stage === 'ready' || town)) {
        const p = switches[s.activeSwitch];
        p.from = p.points; p.goal = 1 - p.goal; p.throwTime = 0;
        if (!town) s.branch = p.goal;
        s.selected = true; p.lever.v += p.goal ? 1 : -1;
        s.chime++; setStage(town ? 'couple' : 'ready'); return true;
      }
      if (action === 'start' && (s.stage === 'ready' || s.stage === 'loaded')) {
        s.buttonHeld = .2; s.button.v = .45; s.chime++;
        if (s.stage === 'ready') { s.crossing = true; s.relay = .01; s.bell++; }
        setStage(s.coupled ? 'shoreRide' : 'outbound'); return true;
      }
      if (action === 'couple' && s.stage === 'couple') {
        setStage('shunting'); s.chime++; return true;
      }
      if (action === 'ferry' && s.stage === 'harbour') {
        setStage('sailing'); s.chime++; return true;
      }
      if (['lever','start','couple','ferry'].includes(action)) s.waggle.v += .035;
      return false;
    }
    function points(h) {
      switches.forEach(p => {
        p.throwTime = Math.min(.3, p.throwTime + h);
        p.points = blend(p.from, p.goal, smooth(p.throwTime / .3));
        p.blade[0] = .122 * p.points;
        p.blade[1] = -.095 * blend(p.from, p.goal, smooth((p.throwTime - .02) / .28));
        spring(p.lever, (p.goal - .5) * 1.1, 123, 19, h);
      });
      const p = switches[s.activeSwitch];
      s.points = p.points; s.blade = p.blade; s.lever = p.lever; s.throwTime = p.throwTime;
      s.buttonHeld = Math.max(0, s.buttonHeld - h);
      spring(s.button, s.buttonHeld > 0 ? .055 : 0, 170, 14, h);
      const bulb = s.guide;
      bulb.charge += ((bulb.charging ? 1 : 0) - bulb.charge) * h / (bulb.charging ? .89 : .70);
      if (bulb.charge > .78) bulb.charging = false;
      if (bulb.charge < .27) bulb.charging = true;
      const contact = .87 + .12 * Math.min(1, p.throwTime / .3);
      bulb.glow += (bulb.charge * bulb.charge * contact - bulb.glow) * (1 - Math.exp(-h / .16));
      spring(s.waggle, 0, 85, 9, h);
    }
    function motion(h) {
      const riding = s.stage === 'outbound' || s.stage === 'shoreRide';
      if (riding) {
        const end = s.coupled ? COAST : TOWN;
        const destination = lengths[s.branch][end / spacing];
        const brake = s.coupled ? .72 : 1.05, thrust = s.coupled ? .78 : 1.5;
        const v0 = s.speed, limit = s.coupled ? 5.9 : 8;
        const half = brake * h * .5;
        const target = clamp(Math.sqrt(Math.max(0, half * half + 2 * brake * (destination - s.odometer) - brake * h * v0)) - half, 0, limit);
        s.speed += clamp(target - v0, -brake * h, thrust * h);
        s.odometer = Math.min(destination, s.odometer + (s.speed + v0) * .5 * h);
        s.distance = chainage(s.odometer, s.branch);
        if (s.distance >= end - .000001 && s.speed < .012) {
          s.speed = 0; s.distance = end;
          if (!s.coupled) { s.activeSwitch = 1; }
          setStage(s.coupled ? 'sunset' : 'townSwitch');
        }
      }
      s.trainX = trackX(s.distance, s.branch);
      if (s.stage === 'shunting') {
        const gap = TOWN - .55 - s.wagon;
        const desired = Math.min(2.05, Math.sqrt(Math.max(0, 2 * .45 * gap)) + .07);
        s.wagonSpeed += clamp(desired - s.wagonSpeed, -.5 * h, .48 * h);
        s.wagon += s.wagonSpeed * h;
        if (s.wagon >= TOWN - .55) {
          s.buffer.v += s.wagonSpeed * .5; s.wagonSpeed = 0;
          s.coupled = true; setStage('loaded'); s.chime++;
        }
      }
      if (s.coupled) s.wagon = s.distance - .55;
      spring(s.buffer, 0, 49, 7, h);
      s.body.forEach((b, i) => {
        const pos = i === 2 ? s.wagon : s.distance + 3.2 + i * 11.2;
        const joint = Math.floor(pos / 6.25);
        if (joint !== s.joint[i]) { b.v += Math.min(.048, (i === 2 ? s.wagonSpeed + (s.coupled ? s.speed : 0) : s.speed) * .006) * (.7 + rand() * .3); s.joint[i] = joint; }
        spring(b, 0, 44 + i * 5, 5.4 + i, h);
      });
    }
    function crossing(h) {
      if (s.distance > 61) s.crossing = false;
      spring(s.gate, s.crossing ? 1.50 : 0, 4, 4.4, h);
      if (s.crossing) { s.relay += h; if (s.relay >= .65) { s.relay -= .65; s.bell++; } }
      s.flash.forEach((x, i) => {
        const on = s.crossing && (s.bell % 2 === i);
        s.flash[i] += ((on ? 1 : 0) - x) * (1 - Math.exp(-h / (on ? .065 : .12)));
      });
      const halt = s.crossing || s.gate.x > .38;
      const parked = s.stage === 'switch' || s.stage === 'ready';
      const stopAt = parked ? -20 : halt && s.car < -8 ? -8.4 : Infinity;
      const desired = Math.min(2.8, Math.sqrt(Math.max(0, 2 * 1.5 * (stopAt - s.car))));
      s.carSpeed += clamp(desired - s.carSpeed, -1.8 * h, 1.15 * h);
      s.car += s.carSpeed * h;
    }
    function weather(h) {
      s.wind.forEach((w, i) => {
        w.wait -= h;
        if (w.wait <= 0) { w.wait = .8 + gustRng[i]() * 3.8; w.gust = (gustRng[i]() - .28) * .31; }
        const wake = Math.exp(-Math.abs(w.z - s.distance - 9) / 15) * s.speed * .026 * Math.exp(-Math.abs((i % 2 ? 5 : -4) - s.trainX) / 13);
        const upstream = i ? s.wind[i - 1].x * .19 : 0;
        spring(w, w.gust + wake + upstream, w.stiffness, 1.8, h);
      });
      s.water.forEach((w, i, cells) => {
        w.wait -= h;
        if (w.wait <= 0) { w.v += (waterRng[i]() - .45) * .046; w.wait = 1.3 + waterRng[i]() * 4.8; }
        const adj = ((cells[i - 1] || w).x + (cells[i + 1] || w).x) * .5;
        const bridgeDraft = s.speed * .008 * Math.exp(-Math.abs(129 + i % 8 * 6 - s.distance - 7) / 9 - Math.abs(-9 + (i % 6) * 5 - s.trainX) / 6);
        const pressure = bridgeDraft + s.wind[i % 24].x * .075 + (i > 23 ? s.ferrySpeed * .014 : 0);
        spring(w, pressure + adj * .66, 6 + i % 4, .95, h);
      });
      s.dust.forEach((p, i) => {
        const w = s.wind[i % 24];
        p.vx += (w.x * 1.25 - p.vx) * .8 * h;
        p.vy += ((w.v * .33 + .024 - .012 * (i % 5)) - p.vy) * .65 * h;
        p.vz += ((i % 2 ? -.09 : .07) * w.x - p.vz) * .55 * h;
        p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
        const edge = Math.max(Math.abs(p.x - s.trainX) - 8, Math.abs(p.z - s.distance) - 22, .25 - p.y, p.y - 5);
        p.life = clamp(p.life + (edge > 0 ? -1 : 1) * h, 0, 1);
        if (p.life === 0) { p.x = s.trainX + (dustRng[i]() - .5) * 14; p.y = .5 + dustRng[i]() * 3.5; p.z = s.distance + 5 + dustRng[i]() * 12; p.vx = p.vz = 0; }
      });
      spring(s.foot, s.stage === 'switch' || s.stage === 'ready' ? s.wind[1].x * .38 : 0, 11, 3.6, h);
    }
    function daylight(h) {
      const seaside = ['sunset','harbour','sailing','dawn'].includes(s.stage);
      const target = s.stage === 'dawn' || (s.morning && !seaside) ? .19 : seaside ? -.085 : .112 - s.distance * .000083;
      spring(s.sun, target, .059, .49, h);
      s.light = smooth((.025 - s.sun.x) / .062);
      s.filament.forEach((lamp, i) => {
        const power = smooth((.023 - .0012 * i - s.sun.x) / .039);
        lamp.x += (power - lamp.x) * (1 - Math.exp(-h / lamp.tau));
      });
      if (s.stage === 'sunset' && s.age > 10) setStage('harbour');
      if (s.stage === 'sailing' || s.stage === 'dawn') {
        s.ferrySpeed += clamp(1.25 - s.ferrySpeed, 0, .12 * h);
        s.ferry += s.ferrySpeed * h;
        if (s.stage === 'sailing' && s.age > 13) setStage('dawn');
      }
      if (s.stage === 'dawn') {
        s.mist = smooth((s.age - 5) / 3.5);
        if (s.age > 8.6) {
          s.journey++; s.morning = 1 - s.morning; s.distance = 0; s.odometer = 0; s.speed = 0; s.branch = 0;
          s.coupled = false; s.selected = false; s.trainX = 0; s.activeSwitch = 0;
          switches.forEach(p => {p.from = p.points; p.goal = 0; p.throwTime = 0;});
          s.wagon = TOWN - 33; s.wagonSpeed = 0; s.ferry = s.ferrySpeed = 0; s.car = -24; s.carSpeed = 2.8;
          setStage('switch');
        }
      } else if (s.journey === 0 || s.stage !== 'switch' || s.age > .25) s.mist = Math.max(0, s.mist - .35 * h);
    }
    function step(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      while (dt > 1e-9) {
        const h = Math.min(1 / 120, dt); dt -= h; s.elapsed += h; s.age += h; s.idle += h;
        points(h); motion(h); crossing(h); weather(h); daylight(h);
      }
    }
    s.lever.x = -.55;
    return { state: s, getState: () => JSON.parse(JSON.stringify(s)), step, go };
  }
  const api = { create, trackX, sidingX, smooth, clamp, TOWN, COAST, LENGTH, rng };
  if (typeof module !== 'undefined') module.exports = api;
  root.Railway = api;
})(typeof window === 'undefined' ? globalThis : window);
