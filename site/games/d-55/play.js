(function () {
  "use strict";
  const { T, M, mix, clamp } = GardenArt,
    sim = GardenPhysics.create(),
    s = sim.state;
  window.__GAME__ = { step: sim.step, getState: sim.getState };
  const canvas = document.querySelector("#garden"),
    guide = document.querySelector("#guide"),
    paletteEl = document.querySelector("#palette");
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(32, 1, 0.075, 130);
  let narrow = innerWidth / innerHeight < 0.85,
    world = GardenWorld.build(scene, sim, narrow);
  const vec = (x, y, z) => new T.Vector3(x, y, z),
    ease = (x) => {
      x = clamp(x);
      return x * x * (3 - 2 * x);
    };
  let ww = 1,
    hh = 1,
    pixel = 1;
  function resize() {
    ww = innerWidth;
    hh = innerHeight;
    pixel = Math.min(devicePixelRatio || 1, 1.65, Math.sqrt(2000000 / (ww * hh)));
    camera.aspect = ww / hh;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixel);
    renderer.setSize(ww, hh, false);
    surfaceRT.setSize(Math.round(ww * pixel), Math.round(hh * pixel));
    glowRT.setSize(
      Math.max(1, Math.round((ww * pixel) / 6)),
      Math.max(1, Math.round((hh * pixel) / 6)),
    );
  }
  // A small linear-light bloom buffer also keeps the final film grain independent of the scene.
  const surfaceRT = new T.WebGLRenderTarget(1, 1, {
    type: T.HalfFloatType,
    samples: Math.min(2, renderer.capabilities.maxSamples),
  });
  const glowRT = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, depthBuffer: false });
  const postCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    post = new T.Scene();
  const vertex = "varying vec2 uvp;void main(){uvp=uv;gl_Position=vec4(position.xy,0.,1.);}";
  const bright = new T.ShaderMaterial({
    vertexShader: vertex,
    uniforms: { src: { value: surfaceRT.texture }, size: { value: new T.Vector2() } },
    fragmentShader: `
uniform sampler2D src;uniform vec2 size;varying vec2 uvp;
void main(){vec3 c=vec3(0.);for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){vec3 a=texture2D(src,uvp+vec2(float(i),float(j))*size).rgb;c+=max(a-vec3(1.12),0.);}}gl_FragColor=vec4(c/9.,1.);}`,
  });
  const finish = new T.ShaderMaterial({
    vertexShader: vertex,
    uniforms: {
      src: { value: surfaceRT.texture },
      bloom: { value: glowRT.texture },
      size: { value: new T.Vector2() },
    },
    fragmentShader: `
uniform sampler2D src;uniform sampler2D bloom;uniform vec2 size;varying vec2 uvp;
void main(){vec3 c=texture2D(src,uvp).rgb;vec3 b=vec3(0.);for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){b+=texture2D(bloom,uvp+vec2(float(i),float(j))*size*1.35).rgb;}}c+=b*.005;
gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
float g=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
gl_FragColor.rgb+=g*.009;}`,
  });
  let reflectedWorld = null,
    probeTarget = null;
  function captureGarden() {
    if (reflectedWorld === world) return;
    if (probeTarget) probeTarget.dispose();
    probeTarget = new T.WebGLCubeRenderTarget(128, {
      type: T.HalfFloatType,
      generateMipmaps: true,
      minFilter: T.LinearMipmapLinearFilter,
    });
    const probe = new T.CubeCamera(0.11, 90, probeTarget);
    probe.position.set(world.gateX, 1.43, 0.94);
    probe.update(renderer, scene);
    scene.environment = probeTarget.texture;
    reflectedWorld = world;
  }
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), bright);
  quad.frustumCulled = false;
  post.add(quad);
  resize();
  function paintPosition(kind, u, v) {
    const w = world;
    if (kind === "fence") return vec(w.left + w.width * u, 0.03 + v * w.fenceH, 0.162);
    const row = Math.min(4, Math.floor(v * 5)),
      part = v * 5 - row;
    const local = vec(
      (u - 0.5) * 2.48,
      row < 3 ? 0.593 : 0.843 + (row - 3) * 0.23 + (part - 0.5) * 0.202,
      row < 3 ? 0.3 - row * 0.202 + (0.5 - part) * 0.18 : -0.143,
    );
    return local.multiplyScalar(w.sh).add(w.bpos);
  }
  function homePose() {
    const port = world.portrait;
    const f = Math.min(1, ww / hh / (port ? 0.462 : 1.4)); // Keep all active boards in reach on tall intermediate viewports.
    const target = port ? vec(0.1, 1.68, -0.55) : vec(-0.05, 1.52, -0.48);
    const offset = port ? vec(-4.16, 2.1, 13.42) : vec(-3.4, 1.46, 8.93);
    return [target.clone().add(offset.multiplyScalar(1 / f)), target];
  }
  function sitPose() {
    const w = world,
      aim = w.bpos.clone().add(vec(w.portrait ? -0.105 : 0, w.sh * 0.84, 0));
    const d = w.portrait ? vec(-4.15, 2.26, 3.28) : vec(-0.91, 1.4, 2.89);
    return [aim.clone().add(d), aim];
  }
  function wateringPose() {
    const aim = world.station.position.clone().add(vec(0, 0.65 * world.sh, 0));
    return [aim.clone().add(world.portrait ? vec(-1.65, 0.91, 2.8) : vec(-0.84, 0.62, 1.84)), aim];
  }
  function travelPose(back = false) {
    const w = world,
      home = homePose(),
      sit = back ? sitPose() : wateringPose(),
      gx = w.gateX + w.gateW * 0.5;
    const pathA = [
      home[0],
      vec(gx - 0.28, 2.03, 3.1),
      vec(gx, 1.82, 0.32),
      vec(gx, 1.68, -0.83),
      sit[0],
    ];
    const pathB = [
      home[1],
      vec(gx, 1.38, -0.9),
      vec(gx, 1.28, -2.25),
      w.bpos.clone().add(vec(0, 1.16, -0.45)),
      sit[1],
    ];
    const u = ease(back ? 1 - s.phaseAge / 7 : s.phaseAge / 5.5);
    return [new T.CatmullRomCurve3(pathA).getPoint(u), new T.CatmullRomCurve3(pathB).getPoint(u)];
  }
  function positionCamera() {
    let p = homePose();
    if (s.phase === "passage") p = travelPose();
    if (s.phase === "water") p = wateringPose();
    if (s.phase === "bloom") {
      p = wateringPose();
      const sit = sitPose();
      p.forEach((v, i) => v.lerp(sit[i], ease(s.phaseAge / 3.6)));
    }
    if (s.phase === "bench" || s.phase === "touch") p = sitPose();
    if (s.phase === "dusk") p = travelPose(true);
    if (s.phase === "return") {
      const x = world.span * ease(s.phaseAge / 10);
      p[0].x += x;
      p[1].x += x;
      const lift = Math.sin(Math.PI * clamp(s.phaseAge / 10));
      p[0].y += lift * 1.45;
      p[1].y += lift * 0.66;
    }
    camera.position.copy(p[0]);
    camera.lookAt(p[1]);
    camera.updateMatrixWorld();
  }
  function project(v) {
    v = v.clone().project(camera);
    return [(v.x * 0.5 + 0.5) * ww, (-v.y * 0.5 + 0.5) * hh];
  }
  function inkIcon(ctx, kind, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 32, size / 32);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.9;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const path = (points, fill = false) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (fill) {
        ctx.closePath();
        ctx.fill();
      } else ctx.stroke();
    };
    if (kind === 0) {
      for (let a of [-8, 0, 8])
        path(
          [
            [a - 2.3, 9],
            [a - 2.3, -6],
            [a, -9],
            [a + 2.3, -6],
            [a + 2.3, 9],
          ],
          true,
        );
      path([
        [-12, -1],
        [12, -1],
      ]);
      path([
        [-12, 5],
        [12, 5],
      ]);
    }
    if (kind === 1) {
      path([
        [-11, 10],
        [-11, -10],
      ]);
      path([
        [11, 10],
        [11, -10],
      ]);
      path([
        [-7, 7],
        [-7, -6],
        [7, -6],
        [7, 7],
        [-7, 7],
        [7, -6],
      ]);
    }
    if (kind === 2) {
      ctx.fillRect(-10, -8, 20, 4);
      ctx.fillRect(-10, -2, 20, 3);
      path([
        [-12, 4],
        [12, 4],
      ]);
      for (let a of [-8, 8]) {
        path([
          [a, 1],
          [a, 10],
        ]);
      }
    }
    if (kind === 3) {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, 7);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        path([
          [Math.cos(a) * 8, Math.sin(a) * 8],
          [Math.cos(a) * 11, Math.sin(a) * 11],
        ]);
      }
    }
    if (kind === 4) {
      ctx.rotate(-0.32);
      ctx.beginPath();
      ctx.roundRect(-10, -10, 16, 8, 2);
      ctx.fill();
      path([
        [7, -6],
        [10, -6],
        [10, 0],
        [0, 2],
        [0, 6],
      ]);
      ctx.beginPath();
      ctx.roundRect(-2.1, 5, 4.2, 8, 1.8);
      ctx.fill();
    }
    ctx.restore();
  }
  const ch = document.querySelector("#chapterArt"),
    ci = ch.getContext("2d"),
    pi = document.querySelector("#paletteArt").getContext("2d");
  inkIcon(pi, 4, 35, 34, 68, "#64775e");
  function chapters(idx) {
    ci.clearRect(0, 0, ch.width, ch.height);
    for (let i = 0; i < 4; i++) {
      const x = 52 + i * 106,
        y = 54;
      if (i < 3) {
        ci.fillStyle = "#bcbba5";
        for (let j = 0; j < 2; j++) {
          ci.beginPath();
          ci.arc(x + 46 + j * 12, y, 2.5, 0, 7);
          ci.fill();
        }
      }
      if (i === idx) {
        ci.fillStyle = "#d4dfc3";
        ci.beginPath();
        ci.arc(x, y, 43, 0, 7);
        ci.fill();
        ci.strokeStyle = "#afc39f";
        ci.lineWidth = 1.6;
        ci.stroke();
      }
      inkIcon(ci, i, x, y, 55, i <= idx ? "#536e52" : "#979b82");
    }
  }
  let soundOn = true,
    ac = null,
    noiseGain,
    noiseFilter,
    humGain,
    hum;
  function soundIcon() {
    const c = document.querySelector("#audio canvas").getContext("2d");
    c.clearRect(0, 0, 64, 64);
    c.fillStyle = c.strokeStyle = "#63745e";
    c.lineWidth = 3.9;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(8, 25);
    c.lineTo(18, 25);
    c.lineTo(29, 15);
    c.lineTo(29, 49);
    c.lineTo(18, 39);
    c.lineTo(8, 39);
    c.closePath();
    c.fill();
    if (soundOn) {
      for (const r of [12, 21]) {
        c.beginPath();
        c.arc(26, 32, r, -0.78, 0.78);
        c.stroke();
      }
    } else {
      c.beginPath();
      c.moveTo(40, 25);
      c.lineTo(53, 39);
      c.moveTo(53, 25);
      c.lineTo(40, 39);
      c.stroke();
    }
  }
  function audioStart() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      ac = new C();
      const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate),
        data = b.getChannelData(0),
        rng = GardenPhysics.generator(491);
      let smooth = 0;
      for (let i = 0; i < data.length; i++) {
        smooth = 0.76 * smooth + 0.24 * (rng() * 2 - 1);
        data[i] = smooth;
      }
      const n = ac.createBufferSource();
      n.buffer = b;
      n.loop = true;
      noiseFilter = ac.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.Q.value = 0.61;
      noiseGain = ac.createGain();
      noiseGain.gain.value = 0;
      n.connect(noiseFilter).connect(noiseGain).connect(ac.destination);
      n.start();
      hum = ac.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 130;
      humGain = ac.createGain();
      humGain.gain.value = 0;
      hum.connect(humGain).connect(ac.destination);
      hum.start();
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
  }
  function note(hz, duration = 0.42, delay = 0, vol = 0.04) {
    if (!soundOn || !ac) return;
    const osc = ac.createOscillator(),
      gain = ac.createGain(),
      start = ac.currentTime + delay;
    osc.type = "sine";
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.021);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.04);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  document.querySelector("#audio").onclick = () => {
    soundOn = !soundOn;
    audioStart();
    document.querySelector("#audio").setAttribute("aria-pressed", String(soundOn));
    soundIcon();
    if (soundOn) note(523, 0.22);
  };
  soundIcon();
  const swatches = [...document.querySelectorAll(".swatch")];
  function colors() {
    const color = GardenPhysics.palette[s.color];
    for (const m of [M.frit, M.paint]) m.color.setRGB(...color, T.SRGBColorSpace);
    swatches.forEach((el, i) => {
      el.classList.toggle("active", s.color === i);
      el.setAttribute("aria-pressed", String(s.color === i));
    });
  }
  swatches.forEach(
    (el, i) =>
      (el.onclick = () => {
        audioStart();
        sim.select(i);
        colors();
        note([392, 440, 494, 523][i], 0.29);
      }),
  );
  colors();
  // The ghost hand is an instructional cursor only, projected on the current material.
  const gc = guide.getContext("2d");
  gc.scale(2, 2);
  gc.save();
  gc.translate(4, 2);
  gc.rotate(-0.2);
  gc.beginPath();
  gc.moveTo(12, 36);
  gc.lineTo(10, 10);
  gc.bezierCurveTo(9, 3, 17, 2, 18, 9);
  gc.lineTo(21, 25);
  gc.bezierCurveTo(21, 19, 27, 19, 28, 24);
  gc.bezierCurveTo(28, 20, 34, 21, 35, 26);
  gc.bezierCurveTo(36, 23, 41, 25, 41, 29);
  gc.lineTo(42, 39);
  gc.bezierCurveTo(42, 50, 39, 55, 35, 58);
  gc.lineTo(20, 58);
  gc.bezierCurveTo(15, 53, 8, 45, 4, 39);
  gc.bezierCurveTo(-1, 31, 5, 29, 9, 33);
  gc.closePath();
  gc.fillStyle = "#fffae9";
  gc.fill();
  gc.strokeStyle = "#827f6a";
  gc.lineWidth = 1.5;
  gc.stroke();
  gc.restore();
  let guideLine = 2,
    guideTime = 0;
  function hand() {
    const phase = s.phase,
      allowed = ["fence", "bench", "touch", "latch", "dusk", "water"].includes(phase);
    const age = Math.max(0, s.idle - 4),
      cycle = Math.floor(age / 3.5);
    if (
      !allowed ||
      s.guide < 0.003 ||
      drag !== null ||
      s.roller.assist.length ||
      (phase === "latch" && s.gate.released) ||
      (phase === "dusk" && s.phaseAge < 7)
    ) {
      guide.style.opacity = 0;
      return;
    }
    if (painting() && guideTime !== cycle + "-" + phase) {
      guideTime = cycle + "-" + phase;
      const f = s[phase],
        count = phase === "bench" ? 5 : 9;
      let best = Infinity;
      for (let k = 0; k < count; k++) {
        let n = 0;
        for (let i = 0; i < f.cells.length; i++) {
          if ((phase === "bench" ? Math.floor(i / f.cols / 3) : Math.floor((i % f.cols) / 4)) === k)
            n += f.cells[i].filmMm;
        }
        if (n < best) {
          best = n;
          guideLine = k;
        }
      }
    }
    const u = (age % 3.5) / 3.5,
      g = ease((u - 0.11) / 0.67);
    let p;
    if (phase === "latch") p = world.latch.localToWorld(vec(-0.055, -0.09 + 0.14 * g, 0.052));
    else if (phase === "water")
      p = world.watering.localToWorld(vec(-0.14 + 0.15 * g, -0.28 - 0.1 * g, 0.16));
    else if (phase === "dusk") p = world.wheel.localToWorld(vec(0.05, 0.06, 0.1));
    else if (phase === "touch") p = paintPosition("bench", mix(0.2, 0.78, g), 0.88);
    else if (phase === "bench") p = paintPosition(phase, mix(0.16, 0.84, g), (guideLine + 0.5) / 5);
    else p = paintPosition(phase, (guideLine + 0.5) / 9, mix(0.24, 0.83, g));
    const [x, y] = project(p);
    guide.style.transform = "translate(" + Math.round(x - 9) + "px," + Math.round(y - 4) + "px)";
    guide.style.opacity = String(0.79 * s.guide * Math.min(1, u * 10, (1 - u) * 9));
  }
  const ray = new T.Raycaster(),
    ndc = new T.Vector2();
  let drag = null,
    holdingTool = false;
  function painting() {
    return s.phase === "fence" || s.phase === "bench";
  }
  function cast(e, list) {
    ndc.set((e.clientX / ww) * 2 - 1, 1 - (e.clientY / hh) * 2);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(list, false)[0];
  }
  function uvOf(hit, kind) {
    const w = world;
    if (kind === "fence")
      return [clamp((hit.point.x - w.left) / w.width), clamp((hit.point.y - 0.03) / w.fenceH)];
    const o = hit.object,
      p = o.worldToLocal(hit.point.clone()),
      i = o.userData.index;
    return [clamp(p.x / 2.48 + 0.5), (i + clamp(i < 3 ? 0.5 - p.z / 0.18 : p.y / 0.202 + 0.5)) / 5];
  }
  function aimAt(e, down) {
    const phase = s.phase,
      list = phase === "fence" ? world.pick : world.ben,
      hit = cast(e, list);
    if (hit) {
      const uv = uvOf(hit, phase);
      if (phase === "touch") sim.rub(...uv);
      else sim.aim(...uv, down || !s.roller.pressed);
      return true;
    }
    return false;
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (drag !== null) return;
    e.preventDefault();
    holdingTool = false;
    if (painting() || s.phase === "touch") {
      if (painting() && cast(e, world.rollerHits)) {
        holdingTool = true;
        s.idle = 0;
        sim.aim(s.roller.u, s.roller.v, true);
      } else if (!aimAt(e, true)) {
        if (painting() && cast(e, world.canHits)) {
          audioStart();
          sim.select(s.color);
          note(330, 0.22);
        }
        return;
      }
    } else if (s.phase === "water" && cast(e, world.watering.children)) {
      audioStart();
      sim.pour();
      note(440, 0.25);
    } else if (s.phase === "latch" && cast(e, world.latchHits)) {
      audioStart();
      sim.latch();
      note(659, 0.27);
      return;
    } else if (s.phase === "dusk" && cast(e, [...world.wheel.children, ...world.latchHits])) {
      audioStart();
      sim.stir();
      note(784, 0.4);
      return;
    } else return;
    audioStart();
    drag = e.pointerId;
    canvas.setPointerCapture(drag);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (drag !== e.pointerId) return;
    if (!painting() && s.phase !== "touch") return;
    if (aimAt(e, false)) {
      holdingTool = false;
      return;
    }
    if (painting() && !holdingTool) {
      sim.release(false);
    }
  });
  function lift(e, cancel) {
    if (drag !== e.pointerId) return;
    drag = null;
    holdingTool = false;
    sim.release(!cancel);
  }
  canvas.addEventListener("pointerup", (e) => lift(e, false));
  canvas.addEventListener("pointercancel", (e) => lift(e, true));
  canvas.addEventListener("lostpointercapture", (e) => lift(e, true));
  let previous = "",
    oldColor = -1,
    oldCycle = -1,
    last = 0;
  function visuals(dt) {
    const w = world,
      phase = s.phase,
      r = s.roller,
      benchMode = phase === "bench" || phase === "touch";
    positionCamera();
    if (phase !== previous) {
      const chapter =
        phase === "fence" || phase === "glow"
          ? 0
          : ["latch", "passage", "water", "bloom"].includes(phase)
            ? 1
            : benchMode
              ? 2
              : 3;
      chapters(chapter);
      paletteEl.classList.toggle("hidden", !painting());
      paletteEl.inert = !painting();
      if (phase === "glow" || phase === "touch" || phase === "dusk") {
        [523, 659, 784].forEach((f, i) => note(f, 0.82, i * 0.14, 0.032));
      }
      previous = phase;
    }
    if (oldColor !== s.color || s.cycle !== oldCycle) {
      colors();
      oldColor = s.color;
      oldCycle = s.cycle;
    }
    const water = s.watering;
    w.watering.rotation.z = -water.angle;
    w.blooms.forEach((petals, i) =>
      petals.forEach((o, k) => {
        o.rotation.z = (1.24 - 0.09 * (k % 3)) * (1 - water.petals[i]) + 0.09;
      }),
    );
    w.drops.forEach((o, i) => {
      const d = water.drops[i];
      o.visible = !!d;
      if (d) o.position.set(d.x, d.y, d.z);
    });
    const fly = s.butterfly,
      u = (fly.x + 3.3) / 4.01;
    const close = ease(-fly.z / 3.5);
    w.insect.position.set(
      mix(w.left + w.width * u, w.bpos.x + (fly.x - 3.37) * w.sh, close),
      fly.y * (1 - close + close * w.sh),
      mix(fly.z, w.bpos.z + (fly.z + 4.15) * w.sh, close),
    );
    w.insect.rotation.y = 0.3 + Math.atan2(fly.vx, 0.6 + Math.abs(fly.vz)) * 0.6;
    w.wings[0].rotation.z = -fly.wing[0];
    w.wings[1].rotation.z = fly.wing[1];
    w.fcoat.update(s.fence);
    w.bcoat.update(s.bench);
    w.gate.rotation.y = -s.gate.angle;
    w.latch.rotation.z = -s.gate.lift * 0.63;
    w.wheel.rotation.z = s.wheel.angle;
    w.liquid.rotation.z = s.pot.angle;
    w.tin.rotation.z = s.pot.angle * 0.23;
    for (const { o, zone, weight } of w.plants) {
      o.rotation.z = s.wind[zone].bend * weight;
      o.rotation.x = s.wind[(zone + 7) % 18].bend * 0.45;
    }
    w.benchBoards.forEach((o, i) => {
      let bend = 0;
      for (let j = i * 108; j < (i + 1) * 108; j++) bend += s.bench.cells[j].flex;
      o.rotation.x = bend * 0.7;
    });
    w.motes.forEach((o, i) => {
      const p = s.seeds[i];
      o.position.set(p.x, p.y, p.z);
      o.visible = !p.settled;
    });
    const isFence =
      phase === "fence" || phase === "glow" || phase === "latch" || phase === "passage";
    w.tool.visible = isFence || phase === "bench";
    if (w.tool.visible) {
      const pos = paintPosition(isFence ? "fence" : "bench", r.u, r.v);
      const seat = !isFence && r.v < 0.6;
      w.tool.position.copy(pos);
      w.tool.position.z += seat ? 0.025 : isFence ? 0.142 : 0.095;
      w.tool.position.y += seat ? 0.115 : 0;
      w.tool.scale.setScalar(isFence ? (w.portrait ? 0.72 : 0.96) : w.sh * 0.68);
      w.tool.rotation.order = "ZXY";
      w.tool.rotation.set(seat ? -0.9 : -0.08, 0, isFence ? -0.18 + r.du * 0.045 : -1.35);
      w.spin.rotation.x = r.spin;
    }
    w.next.visible = phase === "return";
    w.spare.position.copy(paintPosition("fence", 0.29, 0.54));
    w.spare.position.z += 0.142;
    w.spare.rotation.set(-0.08, 0, -0.18);
    w.spare.scale.setScalar(w.portrait ? 0.72 : 0.96);
    const sunX = phase === "return" ? w.span * ease(s.phaseAge / 10) : 0;
    w.sun.position.set(sunX - 5.3, s.sunHeight, 3.75);
    w.sun.target.position.set(sunX, 0, -2);
    w.sun.color.setRGB(1, mix(0.83, 0.55, s.evening), mix(0.625, 0.32, s.evening));
    w.hemi.intensity = 1.49 - 0.38 * s.evening;
    w.sun.intensity = 2.4 - 0.4 * s.evening;
    scene.fog.color.setRGB(
      mix(0.78, 0.82, s.evening),
      mix(0.79, 0.59, s.evening),
      mix(0.635, 0.41, s.evening),
    );
    scene.backgroundIntensity = 1.0 - 0.21 * s.evening;
    // A sheen passes across the wet relief as the roller finishes the last boards.
    w.fcoat.mat.emissive.setHex(0xb5c987);
    w.fcoat.mat.emissiveIntensity =
      phase === "glow" ? 0.1 * Math.sin(Math.PI * clamp(s.phaseAge / 2.6)) : 0;
    M.brass.emissive.setHex(0xffbd64);
    M.brass.emissiveIntensity = phase === "latch" ? 0.075 + 0.12 * Math.abs(s.wind[2].air) : 0.0;
    if (ac) {
      const t = ac.currentTime,
        loud = soundOn ? 1 : 0;
      noiseFilter.frequency.setTargetAtTime(
        560 + s.strokeEnergy * 1350 + s.grainSound * 2550,
        t,
        0.08,
      );
      noiseGain.gain.setTargetAtTime(
        loud *
          (0.007 + 0.29 * s.strokeEnergy + 0.21 * s.grainSound + 0.005 * s.watering.drops.length),
        t,
        0.05,
      );
      hum.frequency.setTargetAtTime(108 + s.gate.speed * 39, t, 0.13);
      humGain.gain.setTargetAtTime(loud * Math.min(0.024, Math.abs(s.gate.speed) * 0.032), t, 0.11);
    }
    scene.updateMatrixWorld();
    hand();
  }
  function render() {
    captureGarden();
    renderer.setRenderTarget(surfaceRT);
    renderer.render(scene, camera);
    quad.material = bright;
    bright.uniforms.size.value.set(2 / surfaceRT.width, 2 / surfaceRT.height);
    renderer.setRenderTarget(glowRT);
    renderer.render(post, postCamera);
    quad.material = finish;
    finish.uniforms.size.value.set(1 / glowRT.width, 1 / glowRT.height);
    renderer.setRenderTarget(null);
    renderer.render(post, postCamera);
  }
  function frame(ms) {
    const dt = last ? Math.min(0.066, (ms - last) / 1000) : 0;
    last = ms;
    sim.step(dt);
    visuals(dt);
    render();
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", () => {
    const port = innerWidth / innerHeight < 0.85;
    if (port !== narrow) {
      narrow = port;
      const old = world;
      scene.remove(old.root, old.next, old.sun, old.sun.target, old.hemi);
      const geometries = new Set(),
        materials = new Set();
      for (const root of [old.root, old.next])
        root.traverse((o) => {
          if (o.isMesh) {
            geometries.add(o.geometry);
            materials.add(o.material);
          }
        });
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      old.fcoat.dispose();
      old.bcoat.dispose();
      old.newCoat.dispose();
      old.env.dispose();
      old.sun.shadow.dispose();
      world = GardenWorld.build(scene, sim, narrow);
    }
    resize();
  });
  document.addEventListener("visibilitychange", () => {
    last = 0;
    if (document.hidden) {
      sim.release(false);
      drag = null;
      if (ac) ac.suspend().catch(() => {});
    } else if (ac && soundOn) ac.resume().catch(() => {});
  });
  visuals(0);
  requestAnimationFrame(frame);
})();
