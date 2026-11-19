"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  zlib = require("node:zlib");
const { create } = require("./simulation.js");
const dt = 0.05,
  radToDeg = 180 / Math.PI,
  round = (x, n = 5) => Number(x.toFixed(n));
const folder = path.join(__dirname, "measurements");
fs.mkdirSync(folder, { recursive: true });
const log = [],
  reports = {},
  bounds = {
    filmMm: 0,
    water: 0,
    bendRad: 0,
    gateRad: 0,
    rollerUV: 0,
    canRad: 0,
    petals: 0,
    evening: 0,
    butterflyM: 0,
    wingRad: 0,
    pollenM: 0,
  };
const peaks = { filmMm: 0, gateDegrees: 0, canDegrees: 0, drops: 0, flowerSoilMl: 0 };
let equalChanging = 0,
  partialPaint = 0,
  comparisons = 0,
  frame = 0;
// Quantized spatial fields + exact adjacent-step comparisons on unrounded values.
// Records contain index/value deltas against the preceding record of the same run.
function setup(label) {
  const g = create(),
    s = g.state;
  let old = null,
    oldPacked = [],
    oldCycle = 0;
  log.push({
    run: label,
    dtSeconds: dt,
    format:
      "row-major fence 36x24 then bench 36x15; paint entries [index, film micrometres, water per mille, rub per mille, flex micrometres]",
  });
  function record() {
    const fields = [...s.fence.cells, ...s.bench.cells],
      before = old;
    const packed = [],
      diff = [];
    for (let i = 0; i < fields.length; i++) {
      const c = fields[i],
        pp = [
          Math.round(c.filmMm * 1000),
          Math.round(c.water * 1000),
          Math.round(c.rub * 1000),
          Math.round(c.flex * 1e6),
        ];
      const p = pp.join(",");
      if (oldPacked[i] !== p) diff.push([i, ...pp]);
      packed.push(p);
      peaks.filmMm = Math.max(peaks.filmMm, c.filmMm);
      assert.ok(c.filmMm >= 0 && c.filmMm <= 0.3000001 && c.water >= 0 && c.water <= 1);
    }
    peaks.gateDegrees = Math.max(peaks.gateDegrees, s.gate.angle * radToDeg);
    peaks.canDegrees = Math.max(peaks.canDegrees, s.watering.angle * radToDeg);
    peaks.drops = Math.max(peaks.drops, s.watering.drops.length);
    peaks.flowerSoilMl = Math.max(
      peaks.flowerSoilMl,
      1000 * s.watering.soil.reduce((a, b) => a + b, 0),
    );
    const now = {
      f: fields.map((c) => c.filmMm),
      w: fields.map((c) => c.water),
      bend: s.wind.map((w) => w.bend),
      angle: s.gate.angle,
      wheel: s.wheel.angle,
      u: s.roller.u,
      v: s.roller.v,
      can: s.watering.angle,
      petals: [...s.watering.petals],
      sun: s.evening,
      fly: [s.butterfly.x, s.butterfly.y, s.butterfly.z],
      wing: [...s.butterfly.wing],
      phase: s.phase,
      seeds: s.seeds.map((p) => [p.x, p.y, p.z]),
    };
    const max = (key, d) => {
      assert.ok(Number.isFinite(d));
      bounds[key] = Math.max(bounds[key], Math.abs(d));
    };
    if (before && oldCycle === s.cycle) {
      comparisons++;
      for (const [key, field] of [
        ["filmMm", "f"],
        ["water", "w"],
      ]) {
        let min = Infinity,
          hi = -Infinity,
          changed = 0,
          benchMin = Infinity,
          benchMax = -Infinity,
          benchChanged = 0;
        for (let i = 0; i < now[field].length; i++) {
          const d = now[field][i] - before[field][i];
          max(key, d);
          if (i >= 864) {
            benchMin = Math.min(benchMin, d);
            benchMax = Math.max(benchMax, d);
            if (Math.abs(d) > 1e-10) benchChanged++;
            continue;
          }
          min = Math.min(min, d);
          hi = Math.max(hi, d);
          if (Math.abs(d) > 1e-10) changed++;
        }
        if (
          (changed === 864 && hi - min < 1e-10) ||
          (benchChanged === 540 && benchMax - benchMin < 1e-10)
        )
          equalChanging++;
        if (key === "filmMm" && changed > 0 && changed < 864) partialPaint++;
      }
      for (const [key, field] of [
        ["bendRad", "bend"],
        ["petals", "petals"],
        ["wingRad", "wing"],
      ])
        now[field].forEach((x, i) => max(key, x - before[field][i]));
      max("gateRad", now.angle - before.angle);
      max("canRad", now.can - before.can);
      max("evening", now.sun - before.sun);
      if (before.phase === now.phase)
        max("rollerUV", Math.hypot(now.u - before.u, now.v - before.v));
      max("butterflyM", Math.hypot(...now.fly.map((v, i) => v - before.fly[i])));
      now.seeds.forEach((v, i) =>
        max("pollenM", Math.hypot(...v.map((x, j) => x - before.seeds[i][j]))),
      );
    }
    log.push({
      t: round(s.time, 2),
      phase: s.phase,
      cycle: s.cycle,
      paint: diff,
      wind: s.wind.map((w) => [round(w.air, 4), round(w.bend, 5)]),
      pollen: now.seeds.map((p) => p.map((x) => round(x, 4))),
      roll: [round(now.u), round(now.v), round(s.roller.contact), round(s.roller.spin)],
      gate: round(now.angle),
      wheel: round(now.wheel),
      can: round(now.can),
      pot: round(s.pot.angle),
      waterLitres: round(s.watering.volume),
      drops: s.watering.drops.map((d) => [round(d.x, 4), round(d.y, 4), round(d.z, 4)]),
      soil: s.watering.soil.map((x) => round(x)),
      petals: now.petals.map((x) => round(x)),
      butterfly: now.fly.map((x) => round(x)),
      wings: now.wing.map((x) => round(x)),
      sunY: round(s.sunHeight),
      guide: round(s.guide),
    });
    old = now;
    oldPacked = packed;
    oldCycle = s.cycle;
    frame++;
  }
  record();
  return {
    g,
    s,
    tick() {
      g.step(dt);
      record();
    },
  };
}
{
  const { s, tick } = setup("idle-10s"),
    wind = s.wind.map((w) => w.bend),
    pollen = s.seeds.map((p) => [p.x, p.y, p.z]),
    wh = s.wheel.angle;
  let guideAt;
  for (let i = 0; i < 200; i++) {
    tick();
    if (!guideAt && s.guide > 0) guideAt = s.time;
  }
  assert.equal(s.phase, "fence");
  assert.ok(s.gate.angle === 0);
  assert.ok(guideAt >= 4 && guideAt < 4.06);
  const bend = s.wind.map((w, i) => (w.bend - wind[i]) * radToDeg),
    dist = s.seeds.map((p, i) =>
      Math.hypot(p.x - pollen[i][0], p.y - pollen[i][1], p.z - pollen[i][2]),
    );
  assert.ok(Math.max(...bend) - Math.min(...bend) > 1);
  assert.ok(Math.max(...dist) > 0.1);
  reports.idle = {
    guideAt: round(guideAt, 2),
    bendDegrees: [round(Math.min(...bend), 3), round(Math.max(...bend), 3)],
    pollenMetres: round(Math.max(...dist), 3),
    wheelDegrees: round((s.wheel.angle - wh) * radToDeg, 2),
  };
}
{
  const { g, s, tick } = setup("identical-stroke-different-drying-times");
  g.aim(0.665, 0.25, true);
  for (let i = 0; i < 34; i++) {
    g.aim(0.665, 0.25 + (0.53 * i) / 33);
    tick();
  }
  g.release(false);
  for (let i = 0; i < 14; i++) tick();
  const idx = s.fence.cells.reduce((i, c, j) => (c.water > s.fence.cells[i].water ? j : i), 0),
    c = s.fence.cells[idx];
  const h = c.filmMm,
    w = c.water,
    samples = [];
  let dried;
  const fresh = s.fence.cells
    .map((cell, j) => ({ cell, j }))
    .filter(({ cell, j }) => cell.water > 0 && j % 36 > 16);
  const dryTimes = new Map();
  for (let i = 0; i <= 800; i++) {
    if ([0, 200, 400, 800].includes(i))
      samples.push({
        seconds: i * dt,
        filmMm: round(c.filmMm),
        water: round(c.water),
        roughnessBase: round(0.7 - 0.53 * c.water),
      });
    if (c.water === 0 && dried === undefined) dried = i * dt;
    for (const { j, cell } of fresh)
      if (cell.water === 0 && !dryTimes.has(j)) dryTimes.set(j, i * dt);
    if (i < 800) tick();
  }
  assert.ok(h > 0.15 && w > 0.8);
  assert.ok(dried >= 10 && dried <= 40);
  assert.ok(Math.abs(c.filmMm - h) < 1e-8);
  assert.equal(c.water, 0);
  assert.ok(samples[1].water < samples[0].water && samples[1].water > samples[3].water);
  assert.equal(fresh.length, dryTimes.size);
  const dryRangeSeconds = [Math.min(...dryTimes.values()), Math.max(...dryTimes.values())].map(
    (x) => round(x, 2),
  );
  assert.ok(dryRangeSeconds[0] >= 10 && dryRangeSeconds[1] <= 40);
  reports.dry = {
    testedFreshCells: fresh.length,
    dryRangeSeconds,
    cell: idx,
    driedAfterSeconds: round(dried, 2),
    samples,
  };
}
{
  const { g, s, tick } = setup("one-finger-garden-cycle");
  const events = [[s.phase, 0]];
  let previous = s.phase,
    wait = 0,
    volumeAtBloom,
    wetRub,
    dryRub,
    firstDusk,
    lastDusk;
  const visited = new Set();
  let waterPress = 0,
    touchSec = 0,
    rubCell;
  // A child first explores the demonstrator, then taps or rolls across one board.
  const pauses = [3.1, 2.7, 4.3, 1.9, 3.8, 3.2, 4.1];
  let stroke = 0;
  for (let i = 0; i < 6600 && !s.cycle; i++) {
    const isPaint = ["fence", "bench"].includes(s.phase);
    if (isPaint && !s.roller.assist.length && !s.roller.pressed) {
      if (wait <= 0) {
        const fence = s.phase === "fence",
          f = s[s.phase],
          n = fence ? 9 : 5,
          sums = new Array(n).fill(0);
        f.cells.forEach(
          (c, j) =>
            (sums[fence ? Math.floor((j % 36) / 4) : Math.floor(j / 108)] += Math.min(
              1,
              c.filmMm / 0.093,
            )),
        );
        const line = sums.indexOf(Math.min(...sums));
        const u = fence ? (line + 0.5) / 9 : 0.5,
          v = fence ? 0.5 : (line + 0.5) / 5;
        g.aim(u, v, true);
        g.release();
        wait = pauses[stroke++ % pauses.length];
      } else wait -= dt;
    }
    if (s.phase === "latch" && s.phaseAge > 3.5) g.latch();
    if (s.phase === "water" && s.phaseAge > 3.2 && waterPress === 0) {
      g.pour();
      waterPress = 1;
    }
    if (s.phase === "water" && s.phaseAge > 6) g.release();
    if (s.phase === "touch") {
      touchSec += dt;
      if (Math.round(touchSec / dt) % 7 === 0) {
        const f = s.bench;
        rubCell ??= f.cells.reduce((a, c, j) => (c.water > f.cells[a].water ? j : a), 0);
        const idx = rubCell,
          c = f.cells[idx];
        // Compare identical small fingertip travel across the same wood fibre.
        g.release(false);
        const before = s.planed,
          velocity = c.flexSpeed;
        g.rub(((idx % 36) + 0.5) / 36, (Math.floor(idx / 36) + 0.5) / 15);
        if (wetRub === undefined)
          wetRub = {
            drag: s.planed - before,
            water: c.water,
            impulseMmPerSecond: (c.flexSpeed - velocity) * 1000,
          };
        if (c.water === 0)
          dryRub = {
            drag: s.planed - before,
            water: c.water,
            impulseMmPerSecond: (c.flexSpeed - velocity) * 1000,
          };
      }
    }
    if (s.phase === "dusk") {
      firstDusk ??= s.sunHeight;
      lastDusk = s.sunHeight;
      if (s.phaseAge > 10 && !visited.has("stir")) {
        g.stir();
        visited.add("stir");
      }
    }
    tick();
    if (s.phase !== previous) {
      events.push([s.phase, round(s.time, 2)]);
      if (s.phase === "bloom") volumeAtBloom = 0.52 - s.watering.volume;
      previous = s.phase;
    }
  }
  assert.equal(s.cycle, 1);
  assert.deepEqual(
    events.map((e) => e[0]),
    [
      "fence",
      "glow",
      "latch",
      "passage",
      "water",
      "bloom",
      "bench",
      "touch",
      "dusk",
      "return",
      "fence",
    ],
  );
  assert.ok(volumeAtBloom > 0.1);
  assert.ok(firstDusk / lastDusk > 2);
  assert.ok(dryRub && wetRub);
  reports.cycle = {
    events,
    durationSeconds: round(s.time, 2),
    waterDeliveredMl: round(volumeAtBloom * 1000, 1),
    wetRub,
    dryRub,
    shadowMPerMetre: [
      round(Math.hypot(5.3, 5.75) / firstDusk, 3),
      round(Math.hypot(5.3, 5.75) / lastDusk, 3),
    ],
  };
}
reports.peaks = Object.fromEntries(Object.entries(peaks).map(([k, v]) => [k, round(v, 5)]));
assert.equal(equalChanging, 0);
assert.ok(partialPaint > 10);

assert.ok(
  bounds.filmMm < 0.08 &&
    bounds.water < 0.29 &&
    bounds.gateRad < 0.12 &&
    bounds.bendRad < 0.025 &&
    bounds.butterflyM < 0.06 &&
    bounds.pollenM < 0.1,
  JSON.stringify(bounds),
);
reports.adjacent = {
  dtSeconds: dt,
  frames: frame,
  comparisons,
  equalChanging,
  partialPaint,
  ...Object.fromEntries(Object.entries(bounds).map(([k, v]) => [k, round(v, 6)])),
};
fs.writeFileSync(
  path.join(folder, "state-005.ndjson.gz"),
  zlib.gzipSync(log.map((row) => JSON.stringify(row)).join("\n") + "\n", { level: 9 }),
);
fs.writeFileSync(path.join(folder, "results.json"), JSON.stringify(reports, null, 2) + "\n");
console.log(JSON.stringify(reports, null, 2));
