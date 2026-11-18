'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const W = require('../world.js');

const dt = 0.05;
const deg = 180 / Math.PI;
const out = path.join(__dirname, 'records');
fs.mkdirSync(out, { recursive: true });

// Test every visible bank of independently integrated physical states, including
// dormant banks. Rest at equilibrium is allowed. Identical nonzero movement is flagged.
const banks = {
  gust: ['cells', 'gust'], flux: ['columns', 'flux'], seedHeight: ['motes', 'h'],
  flame: ['balloons', 'flame'], envelope: ['balloons', 'sway'], basket: ['balloons', 'basket'],
  condensate: ['cloud', 'water'], cloudDrift: ['cloud', 'drift'], wing: ['birds', 'wing'],
  wave: ['water', 'h'], boat: ['boats', 'roll'], sheet: ['cloth', 'angle'],
  hem: ['cloth', 'hem'], arm: ['family', 'arm'], sleeve: ['sleeves', 'bend']
};
const flightFields = ['s', 'x', 'h', 'roll', 'pitch', 'vy', 'lift', 'thermal', 'ridge', 'fog', 'speed'];
const records = [];
const csv = ['t_s,stage,lap,s_m,x_m,h_m,speed_ms,vy_ms,roll_deg,pitch_deg,lift_ms2,thermal_ms,ridge_ms,cloud_fraction,wind_cutoff_Hz,wind_gain,veil_fraction'];
const peaks = {}, jumps = {}, uniform = {}, active = {}, transitions = [];
const baseline = W.create({ thermalCount: 6 });
const noThermals = W.create({ thermalCount: 0 });
const stateLine = (obj) => JSON.stringify(obj, (k, v) => typeof v === 'number' ? +v.toFixed(6) : v);
function sample(sim) {
  const { f } = sim.model;
  const values = {};
  for (const key of flightFields) values[key] = [f[key]];
  for (const [key, [array, field]] of Object.entries(banks)) {
    values[key] = sim.model[array].flat().map(o => o[field]);
  }
  return values;
}
function track(data, prev, tick) {
  for (const [key, list] of Object.entries(data)) {
    const p = peaks[key] ||= { min: Infinity, max: -Infinity };
    p.min = Math.min(p.min, ...list);
    p.max = Math.max(p.max, ...list);
    assert(list.every(Number.isFinite), key + ' contains a nonfinite value');
    if (!prev) continue;
    const diff = list.map((v, i) => v - prev[key][i]);
    const delta = Math.max(...diff.map(Math.abs));
    const j = jumps[key] ||= { max: 0, t: 0 };
    if (delta > j.max) Object.assign(j, { max: delta, t: tick * dt });
    if (list.length <= 1) continue;
    uniform[key] ??= 0;
    active[key] ??= 0;
    if (delta > 1e-8) {
      active[key]++;
      if (Math.max(...diff) - Math.min(...diff) < 1e-10) uniform[key]++;
    }
  }
}
let prev, prevStage = -1, idle, reset, cloudSound, firstSound, longestFlight = 0;
for (let tick = 0; tick <= 4500; tick++) {
  if (tick) baseline.step(dt);
  const { f } = baseline.model;
  const data = sample(baseline);
  const sound = W.acoustics(f);
  const t = tick * dt;
  if (tick === 0) firstSound = sound;
  if (f.stage === 2 && (!cloudSound || f.fog > cloudSound.fog)) cloudSound = { ...sound, fog: f.fog };
  if (f.stage !== prevStage) transitions.push({ stage: f.stage, t, h: f.h });
  prevStage = f.stage;
  csv.push([t, f.stage, f.lap, f.s, f.x, f.h, f.speed, f.vy, f.roll * deg, f.pitch * deg, f.lift,
    f.thermal, f.ridge, f.fog, sound.windCutoff, sound.windGain, f.veil].map(n => +n.toFixed(6)).join(','));
  if (tick <= 200) {
    if (tick) noThermals.step(dt);
    records.push(stateLine({ t, six: baseline.getState(), zero: noThermals.getState() }));
    if (tick === 200) {
      idle = { sixHeight: f.h, zeroHeight: noThermals.model.f.h, distance: f.s,
        difference: f.h - noThermals.model.f.h, wind: baseline.model.cells[0].gust };
      assert.deepEqual(baseline.model.cells, noThermals.model.cells);
      assert.equal(baseline.model.columns.length, 6);
      assert.equal(noThermals.model.columns.length, 0);
      assert(idle.difference > 2);
      assert(Math.abs(f.s - 120) < 1e-7);
    }
  }
  if (f.lap === 1) {
    reset = { veil: f.veil, distanceJump: f.s - prev.s[0], heightJump: f.h - prev.h[0] };
    assert(f.veil > .985, 'route reset must be obscured by luminous fog');
    longestFlight = t;
    break;
  }
  track(data, prev, tick);
  prev = data;
}
assert.deepEqual(transitions.map(s => s.stage), [0, 1, 2, 3, 4, 5, 0]);
assert(longestFlight > 180 && longestFlight < 215);
assert(peaks.fog.max > .85);
assert(peaks.speed.min === 0);
for (const [key, count] of Object.entries(uniform)) {
  assert.equal(count, 0, key + ' moved in lockstep');
  assert(active[key] > 5, key + ' did not evolve');
}
// Quantities and limits use native simulation units, radians for angles.
const limits = { s: .601, h: .4, roll: .05, pitch: .04, wave: .04, envelope: .014,
  basket: .02, cloudDrift: .18, condensate: .011, wing: .28, boat: .025, hem: .08, arm: .18 };
for (const [key, limit] of Object.entries(limits)) {
  assert(jumps[key].max < limit, key + ' adjacent change ' + jumps[key].max);
}

// Same seed, same trajectory until contact. The shell and suspended basket
// keep different angular velocities after touch release.
const guided = W.create(), control = W.create();
guided.input(.9, .85, 0);
for (let i = 0; i < 24; i++) { guided.step(dt); control.step(dt); }
const during = guided.getState();
guided.release();
guided.step(dt);
const after = guided.getState();
assert(during.f.roll > control.model.f.roll + .1);
assert(during.balloons[0].flame > control.model.balloons[0].flame + .1);
assert(Math.abs(after.f.rollV) > .1);
assert(after.balloons[0].pulse > .5);
assert.notEqual(after.balloons[0].omega, after.balloons[0].basketV);

// Hold both control extremes through an entire flight. Every route lands and returns.
const extremes = [];
for (const [x, y] of [[1, 1], [-1, -1]]) {
  const sim = W.create();
  sim.input(x, y, -2);
  let peakRoll = 0, peakPitch = 0, touchdown;
  for (let n = 0; n < 5100 && !sim.model.f.lap; n++) {
    sim.step(dt);
    const f = sim.model.f;
    peakRoll = Math.max(peakRoll, Math.abs(f.roll) * deg);
    peakPitch = Math.max(peakPitch, Math.abs(f.pitch) * deg);
    if (!touchdown && f.stage === 5) touchdown = { s: f.s, x: f.x, h: f.h };
  }
  assert.equal(sim.model.f.lap, 1);
  assert(peakRoll <= 35.00001 && peakPitch <= 15.00001);
  assert(Math.abs(touchdown.x) < 20 && Math.abs(touchdown.s - 2250) < 66);
  extremes.push({ x, y, peakRoll, peakPitch, touchdown });
}
const result = { dt, idle, transitions, peaks, jumps, uniform, active, reset, longestFlight,
  firstSound, cloudSound, extremes, releaseAngularVelocity: after.f.rollV * deg };
fs.writeFileSync(path.join(out, 'idle-10s.jsonl.gz'), gzipSync(records.join('\n') + '\n', { level: 9 }));
fs.writeFileSync(path.join(out, 'flight.csv.gz'), gzipSync(csv.join('\n') + '\n', { level: 9 }));
fs.writeFileSync(path.join(out, 'measurements.json'), JSON.stringify(result, null, 2) + '\n');
console.log('PASS', records.length, 'paired idle samples;', csv.length - 1, 'route samples;', longestFlight, 's per flight');
console.log(JSON.stringify({ idle, jumps, uniform, extremes, reset }, null, 2));
