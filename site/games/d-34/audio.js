'use strict';
function postalAudio() {
  let ac, master, noise, room, enabled = true;
  function start() {
    if (!ac) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      ac = new Audio();
      master = ac.createGain();
      master.gain.value = enabled ? .61 : 0;
      const limiter = ac.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 4;
      master.connect(limiter);
      limiter.connect(ac.destination);
      room = ac.createDelay(.2);
      room.delayTime.value = .061;
      const echo = ac.createGain();
      echo.gain.value = .091;
      room.connect(echo);
      echo.connect(master);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++)data[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume().catch (() => {});
  }
  function voice(src, filter, t, len, gain, attack = .003) {
    const vol = ac.createGain();
    vol.gain.setValueAtTime(.0001, t);
    vol.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), t + attack);
    vol.gain.exponentialRampToValueAtTime(.0001, t + len);
    src.connect(filter || vol);
    if (filter) filter.connect(vol);
    vol.connect(master);
    vol.connect(room);
    src.onended = () => {
      src.disconnect();
      vol.disconnect();
      if (filter) filter.disconnect();
    };
    src.start(t);
    src.stop(t + len + .015);
  }
  function tone(t, f, end, len, gain, type = 'sine') {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(end, t + len * .75);
    voice(o, null, t, len, gain);
  }
  function brush(t, f, end, len, gain, q = .8) {
    const src = ac.createBufferSource(), bp = ac.createBiquadFilter();
    src.buffer = noise;
    src.loop = true;
    src.playbackRate.value = .83 + Math.random() * .34;
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f, t);
    bp.frequency.exponentialRampToValueAtTime(end, t + len);
    voice(src, bp, t, len, gain, Math.min(.027, len * .14));
  }
  function play(name, p = 1) {
    if (!ac || !enabled || ac.state !== 'running') return;
    const t = ac.currentTime + .003;
    switch (name) {
      case 'pon':
        tone(t, 235 + p * 35, 76, .16, .55 * p);
        tone(t, 590, 170, .06, .119 * p, 'triangle');
        brush(t, 1680, 440, .043, .22 * p);
        tone(t + .035, 121, 66, .17, .19 * p);
        break;
      case 'paper':
        for (let i = 0; i < 3; i++)brush(t + i * .087, 1800 + i * 790, 870 + i * 120, .14 + i * .027, .16 * p / (i * .3 + 1));
        break;
      case 'bag':
        brush(t, 730, 180, .21, .15);
        tone(t, 92, 63, .16, .13);
        break;
      case 'scale':
        tone(t, 954, 866, .42, .13);
        tone(t + .069, 1443, 1220, .29, .06);
        for (let i = 0; i < 4; i++)brush(t + .045 * i, 2400, 1260, .026, .06 / (i + 1));
        break;
      case 'boatBell':
        tone(t, 526, 520, 1.35, .16 * p);
        tone(t + .018, 825, 820, .73, .052 * p);
        break;
      case 'bell':
      case 'chime':
        {
          let base = name === 'bell' ? 1064 : 789 * p;
          for (const [f, l, a] of [[1, .86, .13], [2.36, .49, .047], [3.05, .26, .025]])tone(t, base * f, base * f * .999, l, a * p);
          if (name === 'chime')tone(t + .16, base * 1.5, base * 1.5, .7, .08);
          break;
        }
      case 'buckle':
        tone(t, 1320, 870, .11, .084 * p, 'triangle');
        brush(t, 1700, 650, .061, .13 * p);
        break;
      case 'tick':
        brush(t, 3300, 2200, .038, .13 * p, 1.3);
        tone(t, 660, 445, .037, .035 * p);
        break;
      case 'stone':
        brush(t, 700 + 330 * p, 220, .073, .09 * p);
        tone(t, 152 + 66 * p, 74, .087, .067 * p);
        break;
    }
  }
  return {start, play, toggle() {
    enabled = !enabled;
    start();
    if (ac) master.gain.setTargetAtTime(enabled ? .61 : 0, ac.currentTime, .025);
    return enabled;
  }};
}
