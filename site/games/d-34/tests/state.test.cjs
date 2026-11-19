'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {create} = require('../simulation.js');
const dt = .05, deg = 180 / Math.PI, seed = 1841;
const output = path.join(__dirname, 'trace.csv.gz'), rows = [], summary = {
  interval_s: dt,
  seed,
  trials: {},
  maxStep: {},
  uniformMovingIntervals: {},
  audio: {},
  units: {ink: 'fraction of local capacity', length: 'm', angle: 'rad', time: 's'}
};
const avg = a => a.reduce((n, v) => n + v, 0) / a.length;
const range = a => Math.max(...a) - Math.min(...a);
const jvalues = a => a.map(j => j.x);
function signals(s) {
  const readings = {
    air: [s.air.x],
    light: [s.light.x],
    moteX: s.motes.map(m => m.x),
    moteY: s.motes.map(m => m.y),
    water: jvalues(s.water),
    stampY: [s.stampY.x],
    stampTilt: [s.stampTilt.x],
    paperSlide: [s.paper.x],
    paperCurl: jvalues(s.paperCurl),
    bag: jvalues(s.bag),
    transfer: [s.transfer.x],
    loadTrip: [s.loadTrip.x],
    pan: [s.pan.x],
    needle: [s.needle.x],
    bikeX: [s.bikeX],
    bikeSpeed: [s.speed],
    wheel: [s.wheel],
    bikeYaw: [s.bikeYaw.x],
    axles: jvalues(s.axles),
    boatZ: [s.boatZ],
    boatWake: jvalues(s.boatWake),
    crank: [s.rotor.x],
    bridgeAngle: [s.span.x],
    mail: [s.mail.x],
    mailFollow: [s.mailFollow.x],
    pass: jvalues(s.pass),
    door: jvalues(s.door),
    flag: jvalues(s.flag),
    hand: jvalues(s.hand),
    millAngle: [s.millAngle],
    fold: jvalues(s.fold),
    planeX: [s.plane.x],
    planeY: [s.plane.y],
    planeZ: [s.plane.z],
    planeBank: [s.plane.bank.x]
  };
  s.sheets.forEach((sheet, i) => {
    readings['wet' + i] = sheet.ink.slice();
    readings['fibre' + i] = sheet.fibre.slice();
  });
  return readings;
}
const spatial = new Set([
  'moteX',
  'moteY',
  'water',
  'paperCurl',
  'bag',
  'axles',
  'boatWake',
  'pass',
  'door',
  'flag',
  'hand',
  'fold',
  ...Array.from({length: 5}, (_, i) => 'wet' + i),
  ...Array.from({length: 5}, (_, i) => 'fibre' + i)
]);
function observe(name) {
  const game = create(seed), s = game.state;
  let previous, prevRound = 0, n = 0;
  const peaks = {}, spreads = {}, transitions = [], sounds = {};
  function capture() {
    const values = signals(s), flat = [];
    if (!rows.length) {
      const header = Object.entries(values).flatMap(([key, a]) => a.map((_, i) => key + (a.length > 1 ? '_' + i : '')));
      rows.push(['trial', 'clock_s', 'round', 'stage', 'sheet', 'paper_phase', 'contact', 'hint', ...header].join(','));
    }
    if (!transitions.length || transitions.at(-1).stage !== s.stage) transitions.push({stage: s.stage, at_s: n * dt});
    for (const [key, a] of Object.entries(values)) {
      for (const v of a) {
        assert(Number.isFinite(v), name + ' ' + key);
        flat.push(Math.abs(v) < .0000005 ? '0' : String(+v.toFixed(6)));
      }
      const abs = Math.max(...a.map(Math.abs));
      peaks[key] = Math.max(peaks[key] || 0, abs);
      spreads[key] = Math.max(spreads[key] || 0, range(a));
      // New paper and the next reply plane have new identities at a round boundary.
      // Keep their absolute positions in the CSV and count the boundary separately.
      const changedIdentity = s.round !== prevRound && (key.startsWith('wet') || key.startsWith('fibre') || key.startsWith('plane'));
      if (previous && !changedIdentity) {
        const d = a.map((v, i) => v - previous[key][i]), largest = Math.max(...d.map(Math.abs));
        summary.maxStep[key] = Math.max(summary.maxStep[key] || 0, largest);
        if (spatial.has(key)) {
          summary.uniformMovingIntervals[key] ??= 0;
          if (largest > 1e-7 && range(d) < 1e-10) summary.uniformMovingIntervals[key]++;
        }
      }
    }
    rows.push([name, (n * dt).toFixed(2), s.round, s.stage, s.paperID, s.stampPhase, +s.contact, s.hint.toFixed(3), ...flat].join(','));
    for (const e of game.events.splice(0))sounds[e.name] = (sounds[e.name] || 0) + 1;
    previous = values;
    prevRound = s.round;
  }
  capture();
  return {game, s, peaks, spreads, transitions, sounds, tick() {
    n++;
    game.step(dt);
    capture();
  }, time: () => n * dt};
}
const idle = observe('idle'), initial = idle.s.motes.map(m => [m.x, m.y]);
for (let i = 0; i < 200; i++) idle.tick();
assert.equal(idle.s.stage, 'stamp');
assert.equal(idle.s.count, 0);
assert.equal(idle.s.hint, 1);
assert(idle.peaks.water > .003);
summary.trials.idle = {
  duration_s: idle.time(),
  maxMoteDisplacement_m: Math.max(...idle.s.motes.map((m, i) => Math.hypot(m.x - initial[i][0], m.y - initial[i][1]))),
  maxWater_m: idle.peaks.water,
  sunGainAt10s: idle.s.light.x,
  airAt10s_m_s: idle.s.air.x
};
const impressions = [];
for (const pressure of [.25, .85]) {
  const p = observe(pressure < .5 ? 'soft' : 'firm');
  p.game.down('letter', pressure);
  for (let i = 0; i < 20; i++) {
    if (i === 10) p.game.up();
    p.tick();
  }
  const value = {
    pressure,
    held_s: .5,
    at_s: p.time(),
    fibreMean: avg(p.s.fibre),
    fibreSpatialRange: range(p.s.fibre),
    wetMax: p.peaks.wet0,
    stampHeightAt1s_m: p.s.stampY.x
  };
  impressions.push(value);
  assert(p.sounds.pon === 1);
  assert(value.fibreSpatialRange > .05);
}
summary.trials.impressions = impressions;
assert(impressions[1].fibreMean - impressions[0].fibreMean > .10);
const r = observe('route');
let intent = '', lastAction = -10;
const pickups = [];
while (!r.s.round && r.time() < 440) {
  const {game, s} = r, id = game.target();
  if (id && s.idle >= 4.6 && !s.held && (intent !== s.stage + ':' + id + ':' + s.count || r.time() - lastAction > 5)) {
    intent = s.stage + ':' + id + ':' + s.count;
    game.down(id, .62);
    lastAction = r.time();
  }
  if (s.held && s.stage === 'stamp' && r.time() - lastAction >= .52) game.up();
  if (s.stage === 'receiving' && s.age > 2.6 && s.age < 2.66) pickups.push([s.house, s.hand[s.house].x]);
  r.tick();
}
assert.equal(r.s.round, 1);
assert.equal(r.s.count, 0);
assert.equal(r.s.stage, 'stamp');
const stages = r.transitions.map(o => o.stage);
for (const stage of ['weigh', 'weighing', 'load', 'loading', 'ride', 'harbor', 'bridge', 'fold', 'creasing', 'launch', 'flight', 'landing'])assert(stages.includes(stage), stage);
assert.equal(stages.filter(n => n === 'receiving').length, 3);
assert.equal(stages.filter(n => n === 'creasing').length, 2);
assert.equal(r.sounds.pon, 5);
assert(r.sounds.scale >= 1);
assert(r.peaks.flag > 1.3 && r.peaks.hand > .50 && r.peaks.needle > 1.7 && r.peaks.boatWake > .02);
assert.equal(Object.values(summary.uniformMovingIntervals).reduce((a, b) => a + b, 0), 0);
// Reject a movement faster than the mechanism can plausibly produce in one sample.
for (const [key, limit] of Object.entries({
  stampY: .16,
  paperSlide: .11,
  water: .006,
  bag: .014,
  pan: .012,
  needle: .27,
  bikeX: .27,
  axles: .012,
  boatZ: .08,
  bridgeAngle: .038,
  hand: .060,
  flag: .43,
  planeX: .225,
  planeY: .17,
  fold: .21
})) {
  assert(summary.maxStep[key] < limit, key + ' delta ' + summary.maxStep[key] + ' >= ' + limit);
}
summary.trials.route = {
  duration_s: r.time(),
  frames: Math.round(r.time() / dt) + 1,
  transitions: r.transitions,
  peaks: r.peaks,
  spatialRanges: r.spreads,
  needlePeak_deg: r.peaks.needle * deg,
  flagPeak_deg: r.peaks.flag * deg,
  pickups,
  sounds: r.sounds
};
const off = create(seed);
assert.equal(off.down(null, 1), false);
off.down('bag', 1);
off.step(.5);
assert.equal(off.state.count, 0);
assert.equal(off.state.stampPhase, 'wait');
assert.equal(off.state.bagLoad, 0);
const splitA = create(seed), splitB = create(seed);
splitA.step(10);
for (let i = 0; i < 200; i++) splitB.step(dt);
assert.deepEqual(splitA.getState(), splitB.getState());
fs.writeFileSync(output, zlib.gzipSync(rows.join('\n') + '\n', {level: 9}));
fs.writeFileSync(path.join(__dirname, 'measurements.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({
  idle: summary.trials.idle,
  pressure: impressions,
  route_s: r.time(),
  stages,
  sounds: r.sounds,
  peaks: r.peaks,
  maxStep: summary.maxStep,
  uniformMovingIntervals: 0,
  rows: rows.length - 1
}, null, 2));
