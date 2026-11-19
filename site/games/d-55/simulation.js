/* Distances on paint surfaces are normalized. Film thickness is in millimetres. */
(function (root) {
  "use strict";
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const palette = [
    [0.655, 0.773, 0.616],
    [0.898, 0.686, 0.6],
    [0.624, 0.749, 0.788],
    [0.898, 0.8, 0.569],
  ];
  function generator(seed) {
    return () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  }
  function surface(cols, rows, rand) {
    return {
      cols,
      rows,
      coverage: 0,
      wet: 0,
      maxWet: 0,
      cells: Array.from({ length: cols * rows }, (_, i) => ({
        filmMm: 0,
        water: 0,
        wetBasis: 0,
        pigment: [...palette[0]],
        grain: rand(),
        exposure: 0.76 + (0.28 * Math.floor(i / cols)) / rows + 0.17 * rand(),
        drySeconds: 15 + rand() * 11,
        rub: 0,
        flex: 0,
        flexSpeed: 0,
      })),
    };
  }
  function create(seed = 421) {
    const rand = generator(seed);
    const makeRoll = () => ({
      u: 0.29,
      v: 0.54,
      du: 0,
      dv: 0,
      tu: 0.29,
      tv: 0.54,
      pressed: false,
      contact: 0,
      spin: 0,
      omega: 0,
      load: 1,
      assist: [],
      tap: false,
      travel: 0,
    });
    const s = {
      time: 0,
      phase: "fence",
      phaseAge: 0,
      cycle: 0,
      color: 0,
      idle: 0,
      guide: 0,
      evening: 0,
      fence: surface(36, 24, rand),
      bench: surface(36, 15, rand),
      roller: makeRoll(),
      gate: { angle: 0, speed: 0, lift: 0, liftSpeed: 0, released: false },
      pot: { angle: 0, speed: 0 },
      wheel: { angle: 0.2, speed: 0 },
      wind: [],
      seeds: [],
      latchGlow: 0,
      planed: 0,
      dryTravel: 0,
      strokeEnergy: 0,
      grainSound: 0,
      lastRub: null,
      sunHeight: 5.8,
      breeze: 0,
      watering: {
        angle: 0,
        speed: 0,
        held: false,
        pulse: 0,
        volume: 0.52,
        stream: 0,
        drops: [],
        soil: [0, 0, 0],
        petals: [0, 0, 0],
        petalSpeed: [0, 0, 0],
      },
      butterfly: {
        x: -1.75,
        y: 2.12,
        z: 0.15,
        vx: 0,
        vy: 0,
        vz: 0,
        wing: [0.88, 0.84],
        wingSpeed: [0, 0],
        beat: [-1, -1],
        perched: true,
        rest: 2.5,
      },
    };
    for (let i = 0; i < 18; i++)
      s.wind.push({
        air: (rand() - 0.5) * 0.35,
        force: 0,
        until: rand() * 0.8,
        bend: 0,
        speed: 0,
        stiff: 9 + rand() * 10,
      });
    for (let i = 0; i < 38; i++)
      s.seeds.push({
        x: rand() * 16 - 8,
        y: rand() * 4 + 0.2,
        z: rand() * 12 - 8,
        vx: 0,
        vy: 0,
        vz: 0,
        drag: 1.4 + rand(),
        lift: rand() * 0.045,
        settled: false,
        zone: i % 18,
      });
    // A partly painted sample shows the final colour, right underneath the parked roller.
    for (let y = 0; y < s.fence.rows; y++)
      for (let x = 0; x < s.fence.cols; x++) {
        const c = s.fence.cells[y * s.fence.cols + x],
          h = y / s.fence.rows;
        if (x >= 8 && x < 13 && h > 0.37 + 0.05 * c.grain && h < 0.81 + 0.08 * c.grain) {
          c.filmMm = 0.18 + 0.025 * c.grain;
          c.water = 0.67 + 0.13 * c.grain;
          c.wetBasis = c.water;
        }
      }
    function change(phase) {
      s.phase = phase;
      s.phaseAge = 0;
      s.idle = 0;
      s.guide = 0;
      s.lastRub = null;
      s.roller.pressed = false;
      s.roller.assist = [];
    }
    function paintable() {
      return s.phase === "fence" || s.phase === "bench";
    }
    function aim(u, v, down = false) {
      if (!paintable()) return false;
      const r = s.roller;
      if (down) {
        r.assist = [];
        r.pressed = true;
        r.travel = 0;
        r.tap = true;
      }
      if (!r.pressed) return false;
      u = clamp(u);
      v = clamp(v);
      if (!down) r.travel += Math.hypot(u - r.tu, v - r.tv);
      r.tu = u;
      r.tv = v;
      s.idle = 0;
      return true;
    }
    function release(assist = true) {
      const r = s.roller;
      if (assist && r.pressed && r.travel < 0.065 && paintable()) {
        const horizontal = s.phase === "bench";
        const line = horizontal
          ? (Math.floor(clamp(r.tv, 0, 0.999) * 5) + 0.5) / 5
          : (Math.floor(clamp(r.tu, 0, 0.999) * 9) + 0.5) / 9;
        r.assist = horizontal
          ? [
              [0.018, line],
              [0.982, line],
            ]
          : [
              [line, 0.025],
              [line, 0.975],
            ];
      }
      r.pressed = false;
      s.lastRub = null;
      s.watering.held = false;
    }
    function select(color) {
      if (!paintable()) return;
      s.color = clamp(color | 0, 0, 3);
      s.pot.speed += 0.36;
      s.roller.load = 1;
      s.idle = 0;
    }
    function pour() {
      if (s.phase !== "water") return;
      s.watering.held = true;
      s.watering.pulse = 1.55;
      s.idle = 0;
    }
    function waterStep(dt) {
      const a = s.watering;
      a.pulse = Math.max(0, a.pulse - dt);
      const tilt = s.phase === "water" && (a.held || a.pulse > 0) && a.volume > 0.004 ? 0.94 : 0;
      a.speed += (19 * (tilt - a.angle) - 6.3 * a.speed) * dt;
      a.angle += a.speed * dt;
      const out = Math.min(a.volume, Math.max(0, a.angle - 0.26) * 0.19 * dt);
      a.volume -= out;
      a.stream += out;
      // Gravity breaks the stream into drops. Each drop lands in one soil pocket.
      while (a.stream > 0.0024) {
        a.stream -= 0.0024;
        const sn = Math.sin(a.angle),
          cs = Math.cos(a.angle);
        a.drops.push({
          x: 0.47 * cs - 0.27 * sn,
          y: 0.88 - 0.47 * sn - 0.27 * cs,
          z: (rand() - 0.5) * 0.14,
          vx: 0.55 + 0.22 * rand(),
          vy: -0.22,
          vz: (rand() - 0.5) * 0.18,
          volume: 0.0024,
        });
      }
      for (let i = a.drops.length - 1; i >= 0; i--) {
        const d = a.drops[i];
        d.vy -= 3.6 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        if (d.y < 0.16) {
          const j = clamp(Math.floor((d.z + 0.12) / 0.08), 0, 2);
          a.soil[j] += d.volume;
          a.drops.splice(i, 1);
        }
      }
      for (let i = 0; i < 3; i++) {
        const target = clamp((a.soil[i] - 0.006) * 30);
        a.petalSpeed[i] += (6 * (target - a.petals[i]) - 3.9 * a.petalSpeed[i]) * dt;
        a.petals[i] += a.petalSpeed[i] * dt;
      }
    }
    function butterflyStep(dt) {
      const b = s.butterfly;
      let x, y, z;
      // Perches use a common garden coordinate system, remapped to the physical props in each layout.
      if (s.phase === "fence") {
        x = -3.3 + s.roller.u * 4.01 + 0.22;
        y = 2.11;
        z = 0.115;
      } else if (["glow", "latch", "passage"].includes(s.phase)) {
        x = 1.19;
        y = 1.86;
        z = 0.22;
      } else if (["water", "bloom"].includes(s.phase)) {
        x = 2.52;
        y = 0.97;
        z = -3.6;
      } else if (["bench", "touch"].includes(s.phase)) {
        x = 3.37;
        y = 1.18;
        z = -4.15;
      } else {
        x = 2.64;
        y = 2.81;
        z = -0.02;
      }
      b.rest -= dt;
      const dx = x - b.x,
        dz = z - b.z,
        dy = y - b.y,
        dist = Math.hypot(dx, dy, dz);
      if (dist > 0.25) b.perched = false;
      if (b.perched && b.rest <= 0) {
        b.perched = false;
        b.vy = 0.49;
        b.vx = s.wind[6].air * 0.39;
        b.rest = 2.6 + rand() * 4;
      }
      if (!b.perched) {
        const lift = clamp(dist * 2, 0, 0.77);
        b.vx += (3.6 * dx + 0.26 * s.wind[6].air - 2.45 * b.vx) * dt;
        b.vz += (3.7 * dz - 2.65 * b.vz) * dt;
        b.vy += (4.2 * dy + lift - 2.8 * b.vy) * dt;
        const speed = Math.hypot(b.vx, b.vy, b.vz);
        if (speed > 1.12) {
          b.vx *= 1.12 / speed;
          b.vy *= 1.12 / speed;
          b.vz *= 1.12 / speed;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        if (dist < 0.067 && Math.abs(b.vy) < 0.11) {
          b.perched = true;
          b.rest = 2 + rand() * 5;
          b.vx = b.vy = b.vz = 0;
        }
      }
      for (let k = 0; k < 2; k++) {
        const target = b.perched ? 0.91 + 0.18 * s.wind[7 + k].air : b.beat[k] * 0.86;
        b.wingSpeed[k] +=
          ((target - b.wing[k]) * (b.perched ? 26 : 120 + 6 * k) -
            (b.perched ? 7 : 8) * b.wingSpeed[k]) *
          dt;
        b.wing[k] += b.wingSpeed[k] * dt;
        if (!b.perched && b.beat[k] * b.wing[k] > 0.64) b.beat[k] *= -1;
      }
    }
    function stir() {
      if (s.phase !== "dusk") return;
      s.wheel.speed = Math.min(4, s.wheel.speed + 0.65);
      s.seeds.forEach((p, i) => {
        if (i % 4 === 0 || p.settled) {
          p.settled = false;
          p.vy += 0.18 + 0.028 * (i % 5);
          p.vx += 0.08;
        }
      });
      s.idle = 0;
    }
    function latch() {
      if (s.phase === "latch") {
        s.gate.released = true;
        s.idle = 0;
      }
    }
    function rub(u, v) {
      if (s.phase !== "touch") return;
      const f = s.bench,
        c =
          f.cells[
            clamp(Math.floor(v * f.rows), 0, f.rows - 1) * f.cols +
              clamp(Math.floor(u * f.cols), 0, f.cols - 1)
          ];
      const d = s.lastRub ? Math.min(0.12, Math.hypot(u - s.lastRub.u, v - s.lastRub.v)) : 0.035;
      const friction = (0.15 + 0.85 * (1 - c.water)) * (0.6 + 0.4 * c.grain);
      c.rub = clamp(c.rub + d * 2.8);
      c.flexSpeed += d * 0.26 * friction;
      s.grainSound = clamp(s.grainSound + d * friction * 2);
      s.planed += d * friction;
      if (c.water === 0) s.dryTravel += d;
      s.lastRub = { u, v };
      s.idle = 0;
    }
    function air(dt) {
      let sum = 0;
      s.wind.forEach((w, i) => {
        w.until -= dt;
        if (w.until <= 0) {
          w.force = (rand() - 0.39) * 1.28;
          w.until = 0.35 + rand() * 1.65;
        }
        w.air += (w.force + 0.17 * s.wind[(i + 17) % 18].air - 1.17 * w.air) * dt * 1.45;
        w.speed += (0.95 * w.air - w.stiff * w.bend - 2.75 * w.speed) * dt;
        w.bend += w.speed * dt;
        sum += w.air;
      });
      s.breeze = sum / 18;
      s.wheel.speed += (s.wind[4].air * 1.6 + 0.11 - 0.75 * s.wheel.speed) * dt;
      s.wheel.angle += s.wheel.speed * dt;
      s.seeds.forEach((p) => {
        if (p.settled) return;
        const w = s.wind[p.zone],
          gust = s.wind[(p.zone + 3) % 18].air;
        p.vx += (w.air * 0.68 + 0.11 - p.vx) * p.drag * dt;
        p.vy += (gust * 0.17 + p.lift - 0.057 - p.vy) * dt;
        p.vz += (w.speed * 0.8 - p.vz) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < 0.02) {
          p.y = 0.02;
          p.settled = true;
        }
      });
    }
    function moveRoll(dt) {
      const r = s.roller,
        f = s[s.phase],
        a = r.assist[0],
        bench = s.phase === "bench";
      if (a) {
        r.tu = a[0];
        r.tv = a[1];
        if (Math.hypot(r.u - r.tu, r.v - r.tv) < 0.026) r.assist.shift();
      }
      const dragging = r.pressed || !!a,
        stiff = a ? 21 : 140,
        damp = a ? 9 : 23;
      r.du += (stiff * (r.tu - r.u) - damp * r.du) * dt;
      r.dv += (stiff * (r.tv - r.v) - damp * r.dv) * dt;
      const vel = Math.hypot(r.du, r.dv);
      if (vel > 0.9) {
        r.du *= 0.9 / vel;
        r.dv *= 0.9 / vel;
      }
      r.u = clamp(r.u + r.du * dt);
      r.v = clamp(r.v + r.dv * dt);
      // A lifted roller has no paint contact while it travels to a distant new touch.
      const near = Math.hypot(r.u - r.tu, r.v - r.tv) < 0.11;
      const pressure = dragging && (near || a || r.travel > 0.025) ? 1 : 0;
      r.contact += (pressure - r.contact) * (1 - Math.exp(-dt * (pressure ? 10 : 18)));
      const speed = Math.hypot(r.du, r.dv);
      r.omega += ((bench ? r.du : r.dv) * 18 - r.omega) * Math.min(1, dt * (dragging ? 12 : 2.5));
      r.spin += r.omega * dt;
      s.strokeEnergy += (Math.min(1, speed + 0.12) * r.contact - s.strokeEnergy) * dt * 8;
      if (r.contact < 0.012) return;
      const rx = bench ? 0.095 : 0.082,
        ry = bench ? 0.133 : 0.127;
      for (
        let y = Math.max(0, Math.floor((r.v - ry) * f.rows));
        y < Math.min(f.rows, Math.ceil((r.v + ry) * f.rows));
        y++
      ) {
        for (
          let x = Math.max(0, Math.floor((r.u - rx) * f.cols));
          x < Math.min(f.cols, Math.ceil((r.u + rx) * f.cols));
          x++
        ) {
          const c = f.cells[y * f.cols + x],
            d =
              ((x + 0.5) / f.cols - r.u) ** 2 / rx ** 2 + ((y + 0.5) / f.rows - r.v) ** 2 / ry ** 2;
          if (d >= 1) continue;
          const dose =
            (1 - d) *
            r.contact *
            dt *
            (0.91 + Math.min(speed, 1) * 0.49) *
            (0.9 + 0.2 * c.grain) *
            (0.65 + 0.35 * r.load);
          const add = Math.min(0.3 - c.filmMm, dose * (1 - c.filmMm / 0.3));
          const mix = 1 - Math.exp(-Math.min(dose * 9, dt * 6.5));
          c.filmMm = clamp(c.filmMm + add, 0, 0.3);
          c.water = clamp(c.water + (1 - c.water) * mix);
          c.wetBasis = c.water;
          c.pigment.forEach((v, k) => (c.pigment[k] = v + (palette[s.color][k] - v) * mix));
          r.load = Math.max(0.35, r.load - add * 0.0008);
        }
      }
    }
    function cure(f, dt) {
      let covered = 0,
        wet = 0,
        maxWet = 0;
      f.cells.forEach((c, i) => {
        if (c.filmMm > 0) {
          const wind = s.wind[Math.floor(i / f.cols) % 18].air;
          // Exposed solvent, wood porosity and local air flux set the evaporation rate.
          const dryingTime = clamp(
            (c.drySeconds * (0.8 + 1.02 * c.filmMm)) / c.exposure,
            11.5,
            36.5,
          );
          c.water = Math.max(0, c.water - (dt * c.wetBasis * (1 + 0.1 * wind)) / dryingTime);
          covered += Math.min(1, c.filmMm / 0.093);
          wet += c.water;
          maxWet = Math.max(maxWet, c.water);
        }
        if (c.flexSpeed || c.flex) {
          c.flexSpeed += (-49 * c.flex - 5.5 * c.flexSpeed) * dt;
          c.flex += c.flexSpeed * dt;
        }
      });
      f.coverage = covered / f.cells.length;
      f.wet = wet / f.cells.length;
      f.maxWet = maxWet;
    }
    function mechanism(dt) {
      const g = s.gate;
      g.liftSpeed += ((g.released ? 1 : 0) - g.lift) * 40 * dt - 10 * g.liftSpeed * dt;
      g.lift += g.liftSpeed * dt;
      if (g.lift > 0.83) {
        g.speed += (3.1 * (1.52 - g.angle) - 2.1 * g.speed + 0.08 * s.wind[7].air) * dt;
        g.angle += g.speed * dt;
        if (g.angle > 1.54) {
          g.angle = 1.54;
          g.speed = -Math.abs(g.speed) * 0.17;
        }
      }
      s.pot.speed += (-27 * s.pot.angle - 3 * s.pot.speed) * dt;
      s.pot.angle += s.pot.speed * dt;
    }
    function tick(dt) {
      s.time += dt;
      s.phaseAge += dt;
      s.idle += dt;
      s.guide += ((s.idle >= 4 ? 1 : 0) - s.guide) * (1 - Math.exp(-3 * dt));
      air(dt);
      mechanism(dt);
      waterStep(dt);
      butterflyStep(dt);
      if (paintable()) moveRoll(dt);
      else s.strokeEnergy *= Math.exp(-6 * dt);
      cure(s.fence, dt);
      cure(s.bench, dt);
      s.grainSound *= Math.exp(-5 * dt);
      if (s.phase === "fence" && s.fence.coverage > 0.89) change("glow");
      else if (s.phase === "glow" && s.phaseAge > 2.6) change("latch");
      else if (s.phase === "latch" && s.gate.angle > 0.88) change("passage");
      else if (s.phase === "passage" && s.phaseAge > 5.5) change("water");
      else if (s.phase === "water" && s.watering.petals.reduce((a, b) => a + b, 0) > 2.48) {
        s.watering.held = false;
        change("bloom");
      } else if (s.phase === "bloom" && s.phaseAge > 3.6) {
        s.roller = makeRoll();
        change("bench");
      } else if (s.phase === "bench" && s.bench.coverage > 0.87) change("touch");
      else if (
        s.phase === "touch" &&
        s.bench.maxWet === 0 &&
        (s.dryTravel > 0.1 || s.phaseAge > 38)
      )
        change("dusk");
      else if (s.phase === "dusk" && s.phaseAge > 22) change("return");
      else if (s.phase === "return" && s.phaseAge > 10) {
        const cycle = s.cycle + 1,
          time = s.time;
        Object.assign(s, create(seed + cycle * 71).state);
        s.cycle = cycle;
        s.time = time;
      }
      const target = s.phase === "dusk" ? 1 : 0;
      s.evening +=
        (target - s.evening) * (1 - Math.exp(-dt * (s.phase === "return" ? 0.72 : 0.16)));
      s.sunHeight = 5.8 - 3.6 * s.evening;
    }
    function step(dt) {
      if (!Number.isFinite(dt) || dt < 0) return;
      while (dt > 1e-8) {
        const h = Math.min(1 / 60, dt);
        tick(h);
        dt -= h;
      }
    }
    function getState() {
      return JSON.parse(JSON.stringify(s));
    }
    return { state: s, step, getState, aim, release, select, latch, rub, stir, pour };
  }
  const api = { create, palette, generator };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GardenPhysics = api;
})(typeof window === "object" ? window : globalThis);
