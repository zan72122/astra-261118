(function () {
  "use strict";
  const {
    T,
    M,
    group,
    obj,
    box,
    ell,
    cyl,
    bar,
    path,
    ring,
    leaf,
    bake,
    boardGeo,
    shed,
    pot,
    spray,
    paintCan,
    roller,
    mat,
    timber,
    wood,
    fleck,
    texture,
    noise,
    mix,
    clamp,
    TAU,
    rand,
  } = GardenArt;
  const palette = GardenPhysics.palette;
  function environment() {
    const sky = texture(
      768,
      384,
      (u, v) => {
        const lat = (v - 0.5) * Math.PI,
          dir = Math.sin(lat),
          height = clamp(dir, 0, 1);
        const n =
          noise(u * 31, v * 19) * 0.51 +
          noise(u * 70, v * 45) * 0.32 +
          noise(u * 135, v * 89) * 0.17;
        const haze = Math.exp(-height * 3.3),
          cloud = clamp((n - 0.5) * 4.0) * clamp(height * 5) * (0.75 - 0.45 * height);
        if (dir < -0.004) {
          const t = Math.max(0, noise(u * 60, v * 12) - 0.37);
          return [106 + 68 * t, 122 + 67 * t, 87 + 42 * t];
        }
        return [
          mix(mix(121, 234, haze), 255, cloud),
          mix(mix(177, 232, haze), 250, cloud),
          mix(mix(195, 208, haze), 231, cloud),
        ];
      },
      true,
    );
    sky.mapping = T.EquirectangularReflectionMapping;
    return sky;
  }
  function filmMaterial(f, base, bench) {
    const w = f.cols,
      h = f.rows,
      ink = new Uint8Array(w * h * 4),
      wet = new Uint8Array(w * h * 4);
    function map(bytes) {
      const t = new T.DataTexture(bytes, w, h);
      t.magFilter = t.minFilter = T.LinearFilter;
      t.needsUpdate = true;
      return t;
    }
    const im = map(ink),
      wm = map(wet),
      mat = timber(base);
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.coating = { value: im };
      sh.uniforms.moisture = { value: wm };
      sh.vertexShader =
        "uniform sampler2D coating; attribute vec2 paintUv; varying vec2 vCoat;\n" +
        sh.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvCoat=paintUv;transformed+=normal*(texture2D(coating,paintUv).a*.0003);",
        );
      sh.fragmentShader =
        "uniform sampler2D coating; uniform sampler2D moisture; varying vec2 vCoat;\n" +
        sh.fragmentShader;
      sh.fragmentShader = sh.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
 vec4 layer=texture2D(coating,vCoat);vec3 detail=texture2D(moisture,vCoat).rgb;
 float coverage=smoothstep(.004,.41,layer.a);
 vec3 pigment=pow(layer.rgb,vec3(2.2))*(.82+.18*detail.r+.09*detail.g);
 float grain=texture2D(map,vMapUv).r;diffuseColor.rgb=mix(diffuseColor.rgb*.88,pigment*(.80+.25*grain),coverage);`,
      );
      sh.fragmentShader = sh.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance*=coverage*detail.r*(.24+.76*grain);",
      );
      sh.fragmentShader = sh.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.70-.53*detail.r+.035*grain-.07*detail.g,coverage);",
      );
    };
    function update(field) {
      for (let i = 0; i < field.cells.length; i++) {
        const c = field.cells[i],
          k = i * 4;
        for (let j = 0; j < 3; j++) ink[k + j] = Math.round(255 * c.pigment[j]);
        ink[k + 3] = Math.round((255 * c.filmMm) / 0.3);
        wet[k] = Math.round(255 * c.water);
        wet[k + 1] = Math.round(255 * c.rub);
        wet[k + 3] = 255;
      }
      im.needsUpdate = wm.needsUpdate = true;
    }
    update(f);
    return {
      mat,
      update,
      dispose() {
        im.dispose();
        wm.dispose();
      },
    };
  }
  function paintUV(g, fn) {
    const uv = g.attributes.uv,
      arr = new Float32Array(uv.count * 2);
    for (let i = 0; i < uv.count; i++) {
      const a = fn(i);
      arr[i * 2] = a[0];
      arr[i * 2 + 1] = a[1];
    }
    g.setAttribute("paintUv", new T.BufferAttribute(arr, 2));
  }
  function build(scene, sim, portrait) {
    const env = environment();
    scene.background = env;
    scene.environment = env;
    scene.environmentIntensity = 0.54;
    scene.backgroundIntensity = 1.03;
    scene.fog = new T.FogExp2(0xe6ddbf, 0.027);
    const hemi = new T.HemisphereLight(0xe3f1ff, 0xcebb91, 1.54);
    scene.add(hemi);
    const sun = new T.DirectionalLight(0xffe6bd, 2.45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -10,
      right: 10,
      bottom: -10,
      top: 10,
      near: 0.4,
      far: 38,
    });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.normalBias = 0.022;
    sun.shadow.bias = -0.00024;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    const root = group(scene),
      yard = group(root),
      plants = [],
      gateParts = [],
      sh = portrait ? 0.74 : 0.87,
      hx = portrait ? 2.25 : 4.05,
      hz = portrait ? -5.35 : -6.05;
    const left = portrait ? -1.72 : -3.3,
      right = portrait ? 0.46 : 0.71,
      width = right - left,
      gateW = portrait ? 1.02 : 1.62,
      gateX = right + 0.2,
      gateH = 1.7,
      bw = 2.49 * sh;
    const bpos = new T.Vector3(hx - 0.82 * sh, 0.19 * sh, hz + 2.36 * sh);
    const fenceH = 2.02,
      ph = sim.state;
    const fcoat = filmMaterial(ph.fence, 0xc5b29f, false),
      bcoat = filmMaterial(ph.bench, 0xc8a384, true);
    const pick = [],
      ben = [],
      latchHits = [],
      canHits = [],
      rollerHits = [];
    const field = box(root, 0, -0.139, -7, 130, 0.26, 126, M.ground);
    field.castShadow = false;
    // A bed of paving stones gradually curves through the gate towards the porch.
    for (let i = 0; i < 28; i++) {
      const z = 4.2 - i * 0.45,
        x =
          gateX +
          gateW * 0.55 +
          Math.sin((3.1 - z) * 0.47) * 0.47 +
          (z < -0.6 ? (hx - gateX - 1) * clamp(-z / 5) : 0);
      for (let j = 0; j < 2; j++) {
        const sx = x + (j - 0.5) * 0.5 + (rand() - 0.5) * 0.1;
        const st = cyl(
          yard,
          sx,
          0.006 + rand() * 0.014,
          z + (rand() - 0.5) * 0.1,
          0.36 + rand() * 0.05,
          0.34 + rand() * 0.04,
          0.062,
          M.stone,
          7 + Math.floor(rand() * 3),
        );
        st.scale.z = 0.65 + rand() * 0.18;
        st.rotation.y = rand() * 3;
      }
    }
    function post(x, h = 2.22, z = 0) {
      box(yard, x, h * 0.5, z, 0.19, h, 0.21, M.wood);
      box(yard, x, h - 0.04, z, 0.252, 0.1, 0.26, M.cream);
      const t = cyl(yard, x, h + 0.046, z, 0.173, 0.015, 0.12, M.cream, 4);
      t.rotation.y = Math.PI / 4;
    }
    const froot = group(root);
    for (let i = 0; i < 9; i++) {
      const x = left + (width * (i + 0.5)) / 9,
        h = fenceH + 0.042 * Math.sin(i * 1.75) + 0.04 * Math.cos(i * 0.6);
      const g = boardGeo(width / 9 - 0.021, h, 0.115),
        uv = g.attributes.uv;
      paintUV(g, (j) => [(i + clamp(uv.getX(j), 0.015, 0.985)) / 9, uv.getY(j)]);
      for (let j = 0; j < uv.count; j++)
        uv.setXY(
          j,
          uv.getX(j) * (0.88 + 0.025 * (i % 6)) + i * 0.238,
          uv.getY(j) * 0.93 + i * 0.136,
        );
      const o = obj(froot, g, fcoat.mat, x, 0.022, 0.022 + (rand() - 0.5) * 0.022);
      o.userData = { kind: "fence", index: i };
      pick.push(o);
      for (let v of [0.47, 1.52]) {
        const nail = ell(yard, x, v, 0.159, 0.014, 0.014, 0.007, M.iron, "bud");
        nail.castShadow = false;
      }
    }
    for (const y of [0.47, 1.52])
      box(yard, (right + left) / 2, y, -0.036, width + 0.07, 0.15, 0.11, M.rail);
    post(gateX - 0.066);
    post(gateX + gateW + 0.11, 2.14);
    function boundary(from, to, h, z = 0) {
      const w = 0.33,
        n = Math.ceil(Math.abs(to - from) / w);
      for (let i = 0; i < n; i++) {
        const x = from + ((to - from) * (i + 0.5)) / n;
        obj(
          yard,
          boardGeo(Math.abs(to - from) / n - 0.024, h + (rand() - 0.5) * 0.13, 0.095),
          M.wood,
          x,
          0,
          z,
        );
      }
      for (const y of [0.41, 1.24])
        box(yard, (from + to) / 2, y, z - 0.076, Math.abs(to - from), 0.13, 0.1, M.rail);
    }
    boundary(left - 6, left - 0.045, 1.76, -0.075);
    boundary(gateX + gateW + 0.22, gateX + gateW + 7, 1.62, -0.11);
    const gate = group(root);
    gate.position.set(gateX + gateW, 0, -0.035);
    for (let i = 0; i < 6; i++) {
      const u = (i + 0.5) / 6,
        h = gateH + 0.23 * Math.cos((u - 0.5) * Math.PI);
      obj(gate, boardGeo(gateW / 6 - 0.018, h, 0.12, 1), M.sage, -gateW + u * gateW, 0.06, 0);
    }
    for (const y of [0.41, 1.34]) {
      box(gate, -gateW / 2, y, 0.146, gateW - 0.03, 0.132, 0.065, M.sage);
      box(gate, -0.19, y, 0.19, 0.37, 0.069, 0.034, M.iron);
      for (const x of [-0.32, -0.1]) ell(gate, x, y, 0.213, 0.022, 0.022, 0.013, M.brass);
    }
    const diag = bar(
      gate,
      [-gateW + 0.07, 0.44, 0.13],
      [-0.12, 1.32, 0.13],
      0.075,
      M.sage,
      0.075,
      4,
    );
    bake(gate);
    latchHits.push(...gate.children);
    const latch = group(gate);
    latch.position.set(-gateW + 0.27, 1.24, 0.224);
    box(latch, -0.095, 0, 0, 0.31, 0.066, 0.055, M.brass);
    const latchRing = ring(latch, -0.07, -0.079, 0.045, 0.085, 0.019, M.brass);
    latchRing.rotation.x = 0.06;
    bake(latch);
    latchHits.push(...latch.children);
    const house = group(yard);
    house.position.set(hx, 0, hz);
    house.scale.setScalar(sh);
    shed(house);
    // Bench paint coordinates traverse three seat boards, then two backrest boards.
    const bench = group(root);
    bench.position.copy(bpos);
    bench.scale.setScalar(sh);
    const supporting = group(bench);
    for (let x of [-1, 1])
      for (let z of [-0.195, 0.29]) {
        const leg = box(supporting, x, 0.255, z, 0.115, 0.51, 0.115, M.rail);
        leg.rotation.z = -x * 0.06;
      }
    for (let x of [-1.04, 1.04]) {
      box(supporting, x, 0.785, -0.2, 0.097, 0.75, 0.095, M.rail);
      box(supporting, x, 0.43, 0.05, 0.12, 0.12, 0.72, M.wood);
    }
    box(supporting, 0, 0.37, 0.26, 2.27, 0.15, 0.075, M.wood);
    bake(supporting);
    const benchBoards = [];
    for (let i = 0; i < 5; i++) {
      const seat = i < 3,
        g = new T.BoxGeometry(2.48, seat ? 0.092 : 0.202, seat ? 0.18 : 0.098),
        at = g.attributes;
      paintUV(g, (j) => {
        const u = at.position.getX(j) / 2.48 + 0.5,
          v = seat ? 0.5 - at.position.getZ(j) / 0.18 : at.position.getY(j) / 0.202 + 0.5;
        return [u, (i + clamp(v, 0.012, 0.988)) / 5];
      });
      // Align the wood fibres with the long axis of the slats.
      for (let j = 0; j < at.uv.count; j++) {
        const u = at.position.getX(j) / 2.48 + 0.5,
          v = seat ? at.position.getZ(j) / 0.18 + 0.5 : at.position.getY(j) / 0.202 + 0.5;
        at.uv.setXY(j, v, u);
      }
      const o = obj(
        bench,
        g,
        bcoat.mat,
        0,
        seat ? 0.54 : 0.843 + (i - 3) * 0.23,
        seat ? 0.3 - i * 0.202 : -0.2,
      );
      o.userData = { kind: "bench", index: i };
      ben.push(o);
      benchBoards.push(o);
    }
    // Hand-built pinwheel with four curled, two-tone metal vanes.
    const wheel = group(root);
    wheel.position.set(gateX + gateW + 0.11, 2.62, -0.02);
    wheel.rotation.z = 0.18;
    bar(yard, [wheel.position.x, 2.12, -0.04], [wheel.position.x, 2.63, -0.04], 0.024, M.rail);
    const colors = [0xc68b67, 0xe9ce9b, 0x8da99b, 0xb5c6ba].map((c) =>
      mat(c, 0.5, 0.13, { side: T.DoubleSide }),
    );
    for (let i = 0; i < 4; i++) {
      const g = new T.BufferGeometry();
      g.setAttribute(
        "position",
        new T.Float32BufferAttribute(
          [0, 0, 0.04, 0.03, 0.23, 0, 0.208, 0.25, -0.04, 0.065, 0.11, 0.09],
          3,
        ),
      );
      g.setAttribute("uv", new T.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
      g.setIndex([0, 1, 3, 1, 2, 3]);
      g.computeVertexNormals();
      obj(wheel, g, colors[i]).rotation.z = (i * Math.PI) / 2;
    }
    ell(wheel, 0, 0, 0.077, 0.047, 0.047, 0.038, M.brass);
    bake(wheel);
    // A little hanging watering can pivots on its handle above three thirsty flowers.
    const station = group(root);
    station.position.copy(bpos).add(new T.Vector3(-1.72 * sh, -bpos.y, 0.31));
    station.scale.setScalar(sh);
    const frame = group(station);
    box(frame, -0.32, 0.64, -0.2, 0.065, 1.29, 0.076, M.wood);
    bar(frame, [-0.32, 1.23, -0.2], [0.025, 1.23, -0.2], 0.035, M.rail);
    path(
      frame,
      [
        [0.025, 1.24, -0.2],
        [0.025, 1.14, 0.01],
        [0, 0.885, 0.01],
      ],
      0.015,
      M.brass,
    );
    pot(frame, 0.27, 0, 0.245, 0.151);
    bake(frame);
    const watering = group(station);
    watering.position.y = 0.88;
    const enamel = mat(0x9ebba9, 0.37, 0.26);
    cyl(watering, -0.14, -0.36, 0, 0.225, 0.201, 0.319, enamel, 32);
    ring(watering, -0.14, -0.52, 0, 0.222, 0.016, M.iron);
    ring(watering, -0.14, -0.2, 0, 0.2, 0.015, M.metal);
    cyl(watering, -0.14, -0.202, 0, 0.186, 0.186, 0.01, M.inside, 32);
    bar(watering, [-0.005, -0.42, 0], [0.459, -0.275, 0], 0.081, enamel, 0.035, 20);
    const rose = bar(watering, [0.44, -0.275, 0], [0.474, -0.263, 0], 0.037, M.brass, 0.072, 20);
    path(
      watering,
      [
        [-0.32, -0.24, 0],
        [-0.35, -0.12, 0],
        [-0.26, -0.016, 0],
        [-0.08, 0.018, 0],
        [0.02, -0.039, 0],
        [0.041, -0.23, 0],
      ],
      0.019,
      M.iron,
    );
    path(
      watering,
      [
        [-0.32, -0.28, 0],
        [-0.435, -0.22, 0],
        [-0.484, -0.32, 0],
        [-0.46, -0.405, 0],
        [-0.335, -0.45, 0],
      ],
      0.025,
      enamel,
    );
    bake(watering);
    const blooms = [];
    for (let i = 0; i < 3; i++) {
      const x = 0.25 + 0.106 * Math.cos(i * 2.35),
        z = 0.102 * Math.sin(i * 2.35),
        h = 0.46 + 0.058 * i;
      bar(station, [x, 0.14, z], [x + 0.025, h, z], 0.011, M.stem, 0.007, 8);
      leaf(station, [x, 0.25, z], [x - 0.09, 0.36, z + 0.043], 0.036, M.leaf);
      const petals = [];
      for (let k = 0; k < 8; k++) {
        const stem = group(station);
        stem.position.set(x + 0.025, h, z);
        stem.rotation.y = (k * TAU) / 8 + i;
        const petal = group(stem);
        ell(petal, 0.07, 0.02, 0, 0.082, 0.03, 0.036, i === 1 ? M.rose : M.petal, "bud");
        petals.push(petal);
      }
      ell(station, x + 0.025, h + 0.031, z, 0.048, 0.035, 0.048, M.gold, "bud");
      blooms.push(petals);
    }
    const drops = [];
    const waterMat = mat(0xaccfcb, 0.11, 0.35);
    for (let i = 0; i < 50; i++) {
      const d = ell(station, 0, 0, 0, 0.013, 0.029, 0.013, waterMat, "bud");
      d.castShadow = false;
      d.visible = false;
      drops.push(d);
    }
    // Two independent pairs of shaped wings, with solid edging and slender antennae.
    const insect = group(root),
      wings = [],
      amber = mat(0xe8bf70, 0.63),
      ivory = mat(0xf4e7b7, 0.71),
      umber = mat(0x71634a, 0.71);
    ell(insect, 0, 0, 0, 0.017, 0.018, 0.083, umber, "bud");
    for (const sign of [-1, 1]) {
      const pivot = group(insect);
      wings.push(pivot);
      const side = group(pivot);
      side.scale.x = sign;
      const fore = ell(side, 0.085, 0, 0.038, 0.111, 0.012, 0.066, umber);
      fore.rotation.y = -0.45;
      const fill = ell(side, 0.079, 0.005, 0.038, 0.099, 0.012, 0.057, amber);
      fill.rotation.y = -0.45;
      const hind = ell(side, 0.069, -0.001, -0.041, 0.08, 0.012, 0.058, ivory);
      hind.rotation.y = 0.37;
      for (let j = 0; j < 3; j++)
        ell(side, 0.13 + j * 0.011, 0.014, 0.029 + j * 0.02, 0.011, 0.004, 0.007, ivory, "bud");
      bar(
        insect,
        [sign * 0.008, 0.006, 0.07],
        [sign * 0.031, 0.041, 0.105],
        0.0032,
        umber,
        0.002,
        6,
      );
      bake(pivot);
    }
    // Painter's folded drop cloth, tin and lid. The hem follows the actual folds.
    const canPos = new T.Vector3(portrait ? -0.52 : -1.38, 0.035, portrait ? 1.52 : 1.6);
    const cloth = group(yard);
    cloth.position.copy(canPos);
    cloth.rotation.y = 0.28;
    const cg = new T.PlaneGeometry(1.7, 1.15, 26, 18);
    cg.rotateX(-Math.PI / 2);
    const ca = cg.attributes.position;
    for (let i = 0; i < ca.count; i++) {
      const x = ca.getX(i),
        z = ca.getZ(i);
      ca.setY(
        i,
        0.016 +
          0.021 * Math.sin(x * 12 + z * 4) +
          0.043 * Math.pow(Math.abs(x), 3) * Math.sin(z * 12 + 1),
      );
      ca.setX(i, x + 0.025 * Math.sin(10 * z + x));
    }
    cg.computeVertexNormals();
    obj(cloth, cg, M.linen);
    for (const xx of [-0.73, -0.67, 0.68]) {
      const stripe = group(cloth);
      const positions = [];
      for (let j = 0; j <= 20; j++) {
        let z = (j / 20) * 1.15 - 0.575;
        positions.push([
          xx + 0.025 * Math.sin(10 * z + xx),
          0.023 +
            0.021 * Math.sin(xx * 12 + z * 4) +
            0.043 * Math.pow(Math.abs(xx), 3) * Math.sin(z * 12 + 1),
          z,
        ]);
      }
      path(stripe, positions, 0.009, M.sage);
    }
    const tin = group(root);
    tin.position.copy(canPos);
    tin.position.y += 0.031;
    tin.rotation.y = -0.28;
    tin.scale.setScalar(portrait ? 1.04 : 1.1);
    const liquid = paintCan(tin);
    tin.traverse((o) => {
      if (o.isMesh) canHits.push(o);
    });
    const lid = group(cloth);
    lid.position.set(0.54, 0.051, 0.1);
    lid.rotation.z = -0.034;
    cyl(lid, 0, 0.015, 0, 0.282, 0.28, 0.033, M.metal, 36);
    ring(lid, 0, 0.034, 0, 0.258, 0.016, M.metal);
    cyl(lid, 0, 0.037, 0, 0.232, 0.232, 0.007, M.paint, 36);
    const tool = group(root),
      spin = roller(tool);
    tool.traverse((o) => {
      if (o.isMesh) rollerHits.push(o);
    });
    // Mixed planting in drifts. Individual upright sprays bend from their own stems.
    const leafM = [0x677e52, 0x77925c, 0x849c62, 0x94a66b, 0xa5b57d, 0x8b9c6b].map((c) =>
      mat(c, 0.89, 0, { bumpMap: fleck, bumpScale: 0.022 }),
    );
    const canopyM = [0x809260, 0x8a9d6c, 0x70875c, 0x9bae75, 0xa8b980].map((c) => mat(c, 0.92));
    function bush(x, y, z, size, round = false) {
      for (let i = 0; i < (round ? 14 : 10); i++) {
        const a = rand() * TAU,
          r = Math.sqrt(rand()) * 0.68 * size;
        const o = ell(
          yard,
          x + r * Math.cos(a),
          y + (1 - r / size) * size * 0.42 + rand() * size * 0.12,
          z + r * Math.sin(a),
          size * (0.34 + rand() * 0.19),
          size * (0.27 + rand() * 0.18),
          size * (0.31 + rand() * 0.21),
          leafM[Math.floor(rand() * 6)],
          "rock",
        );
        o.rotation.set(rand(), rand(), rand());
      }
    }
    function flowerPatch(x, y, z, num, r, h, type, zone) {
      const sprayGroup = group(root);
      sprayGroup.position.set(x, y, z);
      for (let i = 0; i < num; i++) {
        const a = rand() * TAU,
          d = Math.sqrt(rand()) * r;
        const spr = group(sprayGroup);
        spr.position.set(d * Math.cos(a), 0, d * Math.sin(a));
        spray(spr, type, h * (0.67 + rand() * 0.46), 0.27);
      }
      bake(sprayGroup);
      plants.push({ o: sprayGroup, zone, weight: 1.0 });
    }
    const potX = portrait ? -1.72 : -3.52,
      potZ = portrait ? 1.0 : 1.43;
    pot(yard, potX, potZ, 0.367, 0.53);
    flowerPatch(potX, 0.55, potZ, 17, 0.245, 0.62, "spike", 1);
    flowerPatch(potX + 0.05, 0.54, potZ + 0.04, 9, 0.235, 0.45, "white", 2);
    for (let s of [-1, 1]) {
      const x = hx + s * 2.48 * sh;
      pot(yard, x, hz + 1.87 * sh, 0.29, 0.44);
      flowerPatch(x, 0.45, hz + 1.87 * sh, 12, 0.21, 0.52, "white", 3 + (s + 1));
      bush(x + s * 0.7, 0.03, hz + 0.6, 0.9);
    }
    for (let i = 0; i < 19; i++) {
      const x = (i - 9) * 1.01,
        z = -2.6 - rand() * 0.8;
      if (Math.abs(x - (gateX + 0.9)) > 1.5 && Math.abs(x - hx) > 1.65)
        bush(x, -0.1, z, 0.6 + rand() * 0.56);
    }
    for (let i = 0; i < 12; i++) {
      const x = -6.0 + i * 0.52;
      if (x > left - 0.4 && x < right + 0.2) continue;
      flowerPatch(
        x,
        0,
        -0.6 - rand() * 0.3,
        4,
        0.2,
        0.42 + rand() * 0.31,
        i % 3 === 1 ? "pink" : "white",
        i % 18,
      );
    }
    flowerPatch(right + 0.22, 0, 0.28, 6, 0.16, 0.33, "white", 7);
    // Blades and low clover in tufts, denser around edges, keeping paving and play surfaces clear.
    const grasses = leafM.slice(1, 5),
      gv = [],
      gn = [],
      gu = [],
      gi = [];
    for (let i = 0; i < 16000; i++) {
      const x = rand() * 26 - 13,
        z = rand() * 19 - 11;
      if (
        z < -9 ||
        Math.abs(x - (gateX + gateW * 0.55 + Math.sin((3.1 - z) * 0.47) * 0.47)) < 0.68 ||
        (x - canPos.x) ** 2 + (z - canPos.z) ** 2 < 1.16
      )
        continue;
      if (z > -0.55 && z < 0.3 && x >= left && x <= right) continue;
      const a = rand() * TAU,
        h = 0.021 + rand() * 0.073,
        w = 0.008 + rand() * 0.011,
        k = gv.length / 3;
      const lx = Math.cos(a) * w,
        lz = Math.sin(a) * w;
      gv.push(x - lx, 0, z - lz, x + lx, 0, z + lz, x + lx * 2 + 0.012, h, z + lz * 2);
      for (let j = 0; j < 3; j++) gn.push(0.1, 0.97, 0.2);
      gu.push(0, 0, 1, 0, 1, 1);
      gi.push(k, k + 1, k + 2);
    }
    const grassGeo = new T.BufferGeometry();
    grassGeo.setAttribute("position", new T.Float32BufferAttribute(gv, 3));
    grassGeo.setAttribute("normal", new T.Float32BufferAttribute(gn, 3));
    grassGeo.setAttribute("uv", new T.Float32BufferAttribute(gu, 2));
    grassGeo.setIndex(gi);
    const grassMat = mat(0x91a16d, 0.96, 0, { side: T.DoubleSide });
    obj(yard, grassGeo, grassMat).castShadow = false;
    // Trees have radial branching and overlapping clusters of leaves in shallow crowns.
    function tree(x, z, h, spread, front = false) {
      const bark = mat(front ? 0x786955 : 0x928272, 0.93, 0, {
        map: wood,
        bumpMap: wood,
        bumpScale: 0.044,
      });
      bar(yard, [x, -0.05, z], [x + 0.13, h * 0.67, z + 0.05], h * 0.039, bark, h * 0.022, 10);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399 + 0.4,
          r = spread * (0.4 + rand() * 0.52),
          cx = x + r * Math.cos(a),
          cz = z + r * Math.sin(a),
          cy = h * (0.78 + rand() * 0.22);
        const mid = [mix(x, cx, 0.46), cy - 0.62, mix(z, cz, 0.48)];
        bar(yard, [x + 0.09, h * (0.42 + rand() * 0.2), z], mid, h * 0.022, bark, h * 0.012, 8);
        bar(yard, mid, [cx, cy, cz], h * 0.012, bark, 0.022, 7);
        for (let j = 0; j < 14; j++) {
          const b = rand() * TAU,
            rad = rand() * spread * 0.43;
          const o = ell(
            yard,
            cx + rad * Math.cos(b),
            cy + (rand() - 0.5) * spread * 0.29,
            cz + rad * Math.sin(b),
            spread * (0.24 + rand() * 0.15),
            spread * (0.19 + rand() * 0.14),
            spread * (0.25 + rand() * 0.15),
            canopyM[Math.floor(rand() * 5)],
            "rock",
          );
          o.rotation.set(rand(), rand(), rand());
        }
      }
    }
    function bough(x, y, z, dir) {
      const points = [
        [x, y, z],
        [x + 0.42 * dir, y + 0.08, z - 0.28],
        [x + 1.04 * dir, y + 0.18, z - 0.52],
        [x + 1.63 * dir, y + 0.11, z - 0.77],
      ];
      path(yard, points, 0.055, M.rail);
      for (let i = 0; i < 12; i++) {
        const t = (i + 0.6) / 12,
          base = [x + 1.6 * t * dir, y + 0.12 * t, z - 0.74 * t],
          side = i % 2 ? 1 : -1;
        const tip = [
          base[0] + (0.33 + 0.09 * rand()) * dir,
          base[1] + side * 0.23,
          base[2] + side * (0.38 + rand() * 0.16),
        ];
        bar(yard, base, tip, 0.016, M.rail, 0.005, 7);
        for (let k = 0; k < 5; k++) {
          const u = (k + 0.7) / 5,
            a = base.map((v, j) => mix(v, tip[j], u));
          const b = [
            a[0] + 0.18 * dir,
            a[1] - 0.068 + rand() * 0.11,
            a[2] + (k % 2 ? 1 : -1) * 0.15,
          ];
          leaf(yard, a, b, 0.087, leafM[(k + i) % 6]);
        }
      }
    }
    bough(portrait ? -2.8 : -4.73, portrait ? 4.55 : 3.91, portrait ? 3.29 : 2.2, 1);
    tree(-6.15, -3.6, 6.05, 2.4, true);
    tree(8.3, -4.0, 6.0, 2.4, true);
    for (let i = 0; i < 12; i++) {
      const x = -25 + i * 4.9;
      tree(x, -13 - rand() * 8, 4 + rand() * 3, 2.2 + rand());
    }
    // Soft rolling landscape and distant hedgerows frame the open view.
    const hillM = [0xa5b49a, 0xb5c1a4, 0x9baa92].map((c) => mat(c, 0.97));
    for (let i = 0; i < 13; i++) {
      const o = ell(
        yard,
        (i - 6) * 9,
        -2.2,
        -35 - rand() * 12,
        9 + rand() * 7,
        4 + rand() * 4,
        6 + rand() * 5,
        hillM[i % 3],
      );
      o.castShadow = false;
    }
    for (let i = 0; i < 31; i++)
      bush((i - 15) * 1.08, -0.25, -10.6 - rand(), 1.25 + rand() * 0.55, true);
    bake(yard);
    // Static copies surround the active plot so the camera can travel to the adjoining garden.
    const next = group(scene),
      span = 19;
    next.position.x = span;
    next.add(yard.clone());
    const nf = froot.clone();
    const newCoat = filmMaterial(GardenPhysics.create().state.fence, 0xc5b29f, false);
    nf.children.forEach((o) => (o.material = newCoat.mat));
    next.add(nf);
    const ng = gate.clone();
    ng.rotation.y = 0;
    next.add(ng);
    const nb = bench.clone();
    nb.children.filter((o) => o.isMesh).forEach((o) => (o.material = M.wood));
    next.add(nb, tin.clone(), wheel.clone());
    for (const p of plants) next.add(p.o.clone());
    const spare = tool.clone();
    next.add(spare);
    const dust = group(root);
    const dustMat = mat(0xffefbe, 0.68, 0, { emissive: 0xd6b66b, emissiveIntensity: 0.24 });
    const motes = sim.state.seeds.map((p, i) =>
      ell(dust, p.x, p.y, p.z, 0.007 + (i % 3) * 0.002, 0.008, 0.008, dustMat, "bud"),
    );
    motes.forEach((o) => (o.castShadow = false));
    return {
      scene,
      root,
      yard,
      env,
      sun,
      hemi,
      left,
      right,
      width,
      fenceH,
      gateX,
      gateW,
      gate,
      latch,
      wheel,
      bench,
      bpos,
      bw,
      sh,
      hx,
      hz,
      station,
      watering,
      drops,
      blooms,
      insect,
      wings,
      plants,
      liquid,
      tin,
      canPos,
      tool,
      spin,
      pick,
      ben,
      canHits,
      latchHits,
      rollerHits,
      benchBoards,
      fcoat,
      bcoat,
      newCoat,
      motes,
      next,
      spare,
      span,
      portrait,
    };
  }
  window.GardenWorld = { build };
})();
