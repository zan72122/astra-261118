/* Procedural materials and solid garden models. No image assets. */
(function () {
  "use strict";
  const T = THREE,
    rand = GardenPhysics.generator(9702),
    TAU = 2 * Math.PI;
  const localRand = GardenPhysics.generator(110);
  const mix = (a, b, t) => a + (b - a) * t,
    clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  function hash(x, y) {
    let h = Math.imul(x + 71, 374761393) + Math.imul(y + 19, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise(x, y) {
    let i = Math.floor(x),
      j = Math.floor(y),
      a = x - i,
      b = y - j;
    a = a * a * (3 - 2 * a);
    b = b * b * (3 - 2 * b);
    return mix(mix(hash(i, j), hash(i + 1, j), a), mix(hash(i, j + 1), hash(i + 1, j + 1), a), b);
  }
  function texture(w, h, fill, srgb = false) {
    const data = new Uint8Array(w * h * 4);
    for (let y = 0, k = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = fill(x / w, y / h, x, y);
        for (let i = 0; i < 3; i++) data[k++] = clamp(v[i], 0, 255);
        data[k++] = 255;
      }
    const tex = new T.DataTexture(data, w, h);
    tex.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.magFilter = T.LinearFilter;
    tex.minFilter = T.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }
  const wood = texture(
    256,
    512,
    (u, v, x, y) => {
      const warp =
        0.022 * Math.sin(v * 8 + u * 5) +
        0.011 * Math.sin(v * 17) +
        0.022 * (noise(u * 5, v * 4) - 0.5);
      let knot = 0;
      for (const [cx, cy] of [
        [0.29, 0.64],
        [0.78, 0.18],
      ]) {
        const dx = u - cx,
          dy = (v - cy) * 3.5,
          r = Math.sqrt(dx * dx + dy * dy);
        knot += Math.exp(-r * r * 55) * Math.cos(r * 138) * 12 + Math.exp(-r * r * 660) * 32;
      }
      const f = u + warp + 0.016 * noise(u * 12, v * 9);
      const ridge = Math.pow(0.5 + 0.5 * Math.sin(f * 320 + 3 * noise(f * 30, v * 5)), 8);
      const n =
        224 +
        26 * (noise(f * 25, v * 2) - 0.5) +
        21 * (noise(f * 100, v * 7) - 0.5) -
        16 * ridge -
        knot +
        7 * (hash(x, y) - 0.5);
      return [n, n * 0.982, n * 0.955];
    },
    true,
  );
  const fleck = texture(128, 128, (u, v, x, y) => {
    const n = 213 + 25 * noise(u * 9, v * 9) + 17 * (hash(x, y) - 0.5);
    return [n, n, n];
  });
  const nap = texture(
    256,
    128,
    (u, v, x, y) => {
      const n = 173 + 40 * noise(u * 90, v * 50) + 40 * hash(x, y);
      return [n, n, n];
    },
    true,
  );
  const groundMap = texture(
    256,
    256,
    (u, v, x, y) => {
      const a = noise(9 * u, 9 * v) * 0.45 + noise(33 * u, 33 * v) * 0.35 + hash(x, y) * 0.2;
      return [170 + 49 * a, 182 + 49 * a, 150 + 55 * a];
    },
    true,
  );
  groundMap.repeat.set(24, 24);
  function mat(color, rough = 0.78, metal = 0, extra = {}) {
    return new T.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      roughnessMap: fleck,
      ...extra,
    });
  }
  const timber = (c) => mat(c, 0.82, 0, { map: wood, bumpMap: wood, bumpScale: 0.023 });
  const M = {
    wood: timber(0xb6a08a),
    cedar: timber(0xc9a889),
    rail: timber(0x8d7964),
    cream: timber(0xf3e3c1),
    sage: timber(0x8eaa90),
    dark: mat(0x474e46),
    metal: mat(0xa1aaa2, 0.28, 0.78),
    brass: mat(0xbd985c, 0.32, 0.67),
    iron: mat(0x55615e, 0.47, 0.68),
    glass: mat(0x91b8b8, 0.13, 0.55),
    inside: mat(0x405958),
    clay: mat(0xc58563),
    clayLip: mat(0xd89a77),
    ground: mat(0xafba84, 0.97, 0, { map: groundMap, bumpMap: fleck, bumpScale: 0.026 }),
    soil: mat(0x7e7654),
    stone: mat(0xd3c2a2, 0.95, 0, { bumpMap: fleck, bumpScale: 0.04 }),
    leaf: mat(0x789258),
    deepLeaf: mat(0x657f52),
    lime: mat(0xa3b77a),
    stem: mat(0x738655),
    petal: mat(0xffefd8),
    gold: mat(0xd9a64e),
    rose: mat(0xdca0a1),
    lavender: mat(0xa299bc),
    green: mat(0x9abc9e),
    linen: mat(0xe2d5b9, 0.94, 0, { bumpMap: nap, bumpScale: 0.012 }),
    paint: mat(0xa4c49e, 0.21, 0.03),
    handle: timber(0xc68c58),
    tire: mat(0x454a40),
    frit: mat(0xc7d7af, 0.85, 0, { map: nap, bumpMap: nap, bumpScale: 0.035 }),
  };
  const geo = {
    box: new T.BoxGeometry(1, 1, 1),
    orb: new T.SphereGeometry(1, 14, 10),
    bud: new T.SphereGeometry(1, 9, 7),
    rock: new T.IcosahedronGeometry(1, 1),
  };
  function group(parent) {
    const g = new T.Group();
    if (parent) parent.add(g);
    return g;
  }
  function obj(parent, geometry, material, x = 0, y = 0, z = 0) {
    const o = new T.Mesh(geometry, material);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function box(p, x, y, z, w, h, d, m) {
    const o = obj(p, geo.box, m, x, y, z);
    o.scale.set(w, h, d);
    return o;
  }
  function ell(p, x, y, z, rx, ry, rz, m, kind = "orb") {
    const o = obj(p, geo[kind], m, x, y, z);
    o.scale.set(rx, ry, rz);
    return o;
  }
  const cylinders = new Map();
  function cyl(p, x, y, z, rb, rt, h, m, n = 20) {
    const key = [rb, rt, h, n].join();
    if (!cylinders.has(key)) cylinders.set(key, new T.CylinderGeometry(rt, rb, h, n));
    return obj(p, cylinders.get(key), m, x, y, z);
  }
  function bar(p, a, b, r, m, rt = r, n = 10) {
    const v = new T.Vector3(...a),
      w = new T.Vector3(...b),
      d = w.clone().sub(v);
    const o = cyl(p, 0, 0, 0, r, rt, d.length(), m, n);
    o.position.copy(v.add(w).multiplyScalar(0.5));
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return o;
  }
  function path(p, points, r, m) {
    return obj(
      p,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((v) => new T.Vector3(...v))),
        Math.max(16, points.length * 6),
        r,
        8,
        false,
      ),
      m,
    );
  }
  function ring(p, x, y, z, R, r, m) {
    const o = obj(p, new T.TorusGeometry(R, r, 9, 48), m, x, y, z);
    o.rotation.x = Math.PI / 2;
    return o;
  }
  function leaf(p, a, b, r, m) {
    const v = new T.Vector3(...a),
      w = new T.Vector3(...b),
      d = w.clone().sub(v);
    const o = ell(p, 0, 0, 0, r, d.length() * 0.54, r * 0.38, m, "bud");
    o.position.copy(v.add(w).multiplyScalar(0.5));
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return o;
  }
  // Merge static triangles by material in local space. Moving joints are baked separately.
  function bake(p) {
    p.updateWorldMatrix(true, true);
    const inverse = p.matrixWorld.clone().invert(),
      batches = new Map(),
      v = new T.Vector3(),
      normal = new T.Matrix3();
    p.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material,
        key = m.uuid + o.castShadow + o.receiveShadow;
      if (!batches.has(key))
        batches.set(key, {
          m,
          cast: o.castShadow,
          rec: o.receiveShadow,
          pos: [],
          nor: [],
          uv: [],
          ind: [],
        });
      const b = batches.get(key),
        offset = b.pos.length / 3,
        g = o.geometry,
        at = g.attributes,
        xf = new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld);
      normal.getNormalMatrix(xf);
      for (let i = 0; i < at.position.count; i++) {
        v.fromBufferAttribute(at.position, i).applyMatrix4(xf);
        b.pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(at.normal, i).applyNormalMatrix(normal);
        b.nor.push(v.x, v.y, v.z);
        b.uv.push(at.uv ? at.uv.getX(i) : 0, at.uv ? at.uv.getY(i) : 0);
      }
      const ix = g.index,
        reverse = xf.determinant() < 0;
      for (let i = 0; i < (ix ? ix.count : at.position.count); i += 3) {
        const a = ix ? ix.getX(i) : i,
          b1 = ix ? ix.getX(i + 1) : i + 1,
          c = ix ? ix.getX(i + 2) : i + 2;
        b.ind.push(offset + a, offset + (reverse ? c : b1), offset + (reverse ? b1 : c));
      }
    });
    p.clear();
    for (const b of batches.values()) {
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(b.pos, 3));
      g.setAttribute("normal", new T.Float32BufferAttribute(b.nor, 3));
      g.setAttribute("uv", new T.Float32BufferAttribute(b.uv, 2));
      g.setIndex(b.ind);
      const o = obj(p, g, b.m);
      o.castShadow = b.cast;
      o.receiveShadow = b.rec;
    }
    return p;
  }
  function boardGeo(w, h, d, style = 0) {
    const s = new T.Shape();
    const k = w / 2;
    s.moveTo(-k, 0.035);
    s.lineTo(-k, h - 0.2);
    if (style === 0) {
      s.lineTo(-k * 0.77, h - 0.145);
      s.quadraticCurveTo(-k * 0.59, h - 0.07, -0.028, h - 0.009);
      s.quadraticCurveTo(0, h + 0.008, 0.028, h - 0.009);
      s.quadraticCurveTo(k * 0.59, h - 0.07, k * 0.77, h - 0.145);
      s.lineTo(k, h - 0.2);
    } else {
      s.lineTo(-k + 0.052, h - 0.042);
      s.lineTo(k - 0.052, h - 0.042);
      s.lineTo(k, h - 0.2);
    }
    s.lineTo(k, 0.035);
    s.closePath();
    const g = new T.ExtrudeGeometry(s, {
      depth: d,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 2,
      curveSegments: 4,
    });
    const at = g.attributes;
    for (let i = 0; i < at.position.count; i++)
      at.uv.setXY(i, clamp(at.position.getX(i) / w + 0.5), clamp(at.position.getY(i) / h));
    return g;
  }
  function shed(p) {
    const wall = group(p),
      W = 4.35,
      H = 2.95,
      D = 3.35,
      peak = 4.65;
    box(wall, 0, H / 2, 0, W, H, D, M.rail);
    for (let i = 0; i < 24; i++) {
      const x = ((i + 0.5) * W) / 24 - W / 2,
        hh = peak - H;
      const h = H + hh * (1 - Math.abs(x) / (W / 2));
      const m = [M.cedar, M.wood, M.cedar, M.cream][i % 7 === 0 ? 1 : 0];
      box(wall, x, h / 2, D / 2 + 0.01, W / 24 - 0.012, h, 0.075, m);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 16; i++)
        box(
          wall,
          side * (W / 2 + 0.012),
          H * 0.5,
          ((i + 0.5) * D) / 16 - D / 2,
          0.08,
          H,
          D / 16 - 0.008,
          M.cedar,
        );
      box(wall, side * (W / 2 - 0.035), H / 2, D / 2 + 0.075, 0.15, H, 0.14, M.cream);
    }
    const tileM = [0xa16f5b, 0xb17e65, 0x996c59, 0xc28d72, 0xad7c6b].map((v) =>
      mat(v, 0.91, 0, { bumpMap: fleck, bumpScale: 0.018 }),
    );
    const dx = W / 2 + 0.37,
      rise = ((peak - H) * dx) / (W / 2),
      angle = Math.atan2(rise, dx),
      len = Math.hypot(dx, rise);
    for (const side of [-1, 1]) {
      const roof = group(wall);
      roof.position.set(side * dx * 0.5, peak - rise * 0.5 + 0.09, 0);
      roof.rotation.z = -side * angle;
      box(roof, 0, 0, 0, len + 0.06, 0.16, D + 0.8, M.rail);
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 13; c++) {
          const z = ((c - 6) * (D + 0.74)) / 13 + (r % 2 ? 0.045 : -0.045);
          const o = box(
            roof,
            side * ((r + 0.5) / 9 - 0.5) * len,
            0.112 + (8 - r) * 0.004,
            z,
            len / 9 + 0.053,
            0.065,
            (D + 0.74) / 13 - 0.006,
            tileM[Math.floor(rand() * 5)],
          );
          o.rotation.z = -side * 0.035;
        }
      box(roof, 0, 0.012, (D + 0.85) / 2, len + 0.11, 0.19, 0.13, M.cream);
      box(roof, side * (len * 0.5), -0.02, 0, 0.13, 0.2, D + 0.86, M.rail);
    }
    bar(
      wall,
      [0, peak + 0.21, -D / 2 - 0.49],
      [0, peak + 0.21, D / 2 + 0.5],
      0.105,
      tileM[0],
      0.105,
      12,
    );
    const win = (x, y, w, h) => {
      box(wall, x, y, D / 2 + 0.066, w + 0.19, h + 0.19, 0.085, M.cream);
      box(wall, x, y, D / 2 + 0.117, w, h, 0.035, M.inside);
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
          box(
            wall,
            x + (i - 0.5) * w * 0.49,
            y + (j - 0.5) * h * 0.49,
            D / 2 + 0.146,
            w * 0.46,
            h * 0.46,
            0.026,
            M.glass,
          );
      box(wall, x, y, D / 2 + 0.17, w, 0.047, 0.05, M.cream);
      box(wall, x, y, D / 2 + 0.17, 0.047, h, 0.05, M.cream);
      box(wall, x, y - h / 2 - 0.115, D / 2 + 0.15, w + 0.35, 0.11, 0.3, M.cream);
    };
    win(-0.87, 1.79, 1.46, 1.15);
    box(wall, 1.04, 1.22, D / 2 + 0.09, 1.16, 2.44, 0.1, M.cream);
    box(wall, 1.04, 1.15, D / 2 + 0.15, 1.01, 2.3, 0.07, M.sage);
    for (let i = 0; i < 5; i++)
      box(wall, 0.65 + i * 0.195, 0.72, D / 2 + 0.198, 0.181, 1.23, 0.026, M.sage);
    box(wall, 1.04, 1.78, D / 2 + 0.203, 0.69, 0.61, 0.03, M.inside);
    box(wall, 1.04, 1.78, D / 2 + 0.222, 0.59, 0.51, 0.03, M.glass);
    ell(wall, 1.4, 1.1, D / 2 + 0.25, 0.056, 0.056, 0.065, M.brass);
    const z = D / 2 + 0.12,
      y = 3.46;
    const disk = cyl(wall, 0, y, z, 0.327, 0.327, 0.1, M.inside, 48);
    disk.rotation.x = Math.PI / 2;
    const trim = ring(wall, 0, y, z + 0.063, 0.335, 0.049, M.cream);
    trim.rotation.x = 0;
    box(wall, 0, y, z + 0.072, 0.055, 0.6, 0.04, M.cream);
    box(wall, 0, y, z + 0.072, 0.6, 0.055, 0.04, M.cream);
    box(wall, 0, 0.1, D / 2 + 0.53, W + 0.2, 0.18, 0.98, M.wood);
    bake(wall);
  }
  function pot(p, x, z, r, h) {
    cyl(p, x, h * 0.52, z, r * 0.71, r, h, M.clay, 32);
    cyl(p, x, h * 0.93, z, r * 1.065, r * 1.065, h * 0.18, M.clayLip, 32);
    ring(p, x, h * 1.02, z, r * 0.999, 0.025, M.clayLip);
    cyl(p, x, h * 1.007, z, r * 0.94, r * 0.94, 0.016, M.soil, 32);
  }
  function spray(p, kind, h, spread) {
    const dx = (rand() - 0.5) * spread,
      dz = (rand() - 0.5) * spread;
    bar(p, [0, 0, 0], [dx, h, dz], 0.012, M.stem, 0.006, 6);
    for (let j = 0; j < 4; j++) {
      const u = (j + 1) * 0.155,
        a = rand() * TAU;
      leaf(
        p,
        [dx * u, h * u, dz * u],
        [dx * u + 0.135 * Math.cos(a), h * u + 0.105, dz * u + 0.135 * Math.sin(a)],
        0.037,
        j % 2 ? M.deepLeaf : M.leaf,
      );
    }
    if (kind === "spike") {
      for (let j = 0; j < 7; j++)
        for (let k = 0; k < 3; k++) {
          const a = k * 2.1 + j * 2,
            hf = j / 7;
          ell(
            p,
            dx + 0.028 * Math.cos(a),
            h - 0.17 + j * 0.029,
            dz + 0.028 * Math.sin(a),
            0.041 * (1 - 0.55 * hf),
            0.049 * (1 - 0.46 * hf),
            0.04 * (1 - 0.5 * hf),
            M.lavender,
            "bud",
          );
        }
    } else {
      const blossom = group(p);
      blossom.position.set(dx, h, dz);
      blossom.rotation.set(0.4 + rand() * 0.85, rand(), rand() * 0.6);
      for (let j = 0; j < 9; j++) {
        const a = (j * TAU) / 9;
        const o = ell(
          blossom,
          0.057 * Math.cos(a),
          0.057 * Math.sin(a),
          0,
          0.064,
          0.031,
          0.018,
          kind === "pink" ? M.rose : M.petal,
          "bud",
        );
        o.rotation.z = a;
      }
      ell(blossom, 0, 0, 0.015, 0.039, 0.039, 0.024, M.gold, "bud");
    }
  }
  function paintCan(p) {
    cyl(p, 0, 0.32, 0, 0.315, 0.34, 0.62, M.metal, 48);
    cyl(p, 0, 0.315, 0, 0.324, 0.339, 0.405, M.sage, 48);
    for (let y of [0.035, 0.076, 0.563, 0.615])
      ring(p, 0, y, 0, 0.32 + (0.019 * y) / 0.62, 0.013, M.metal);
    cyl(p, 0, 0.602, 0, 0.322, 0.322, 0.015, M.inside, 40);
    const liquid = cyl(p, 0, 0.609, 0, 0.316, 0.316, 0.012, M.paint, 48);
    ring(p, 0, 0.632, 0, 0.341, 0.023, M.metal);
    // A little raised botanical maker's mark on the tin.
    const coin = ell(p, -0.02, 0.312, 0.332, 0.103, 0.112, 0.012, M.cream);
    for (const sign of [-1, 1]) {
      const o = ell(p, -0.023 + sign * 0.027, 0.319, 0.349, 0.023, 0.052, 0.008, M.sage);
      o.rotation.z = -sign * 0.55;
    }
    for (const [a, l] of [
      [0.4, 0.18],
      [0.58, 0.098],
      [2.4, 0.13],
    ]) {
      const x = Math.cos(a) * 0.34,
        z = Math.sin(a) * 0.34;
      ell(p, x, 0.624 - l * 0.47, z, 0.023, l * 0.53, 0.023, M.paint, "bud");
    }
    path(
      p,
      [
        [-0.34, 0.45, 0],
        [-0.42, 0.67, -0.05],
        [-0.3, 0.92, -0.1],
        [0, 1.02, -0.13],
        [0.3, 0.92, -0.1],
        [0.42, 0.67, -0.05],
        [0.34, 0.45, 0],
      ],
      0.014,
      M.iron,
    );
    for (const x of [-0.335, 0.335]) ell(p, x, 0.456, 0, 0.04, 0.041, 0.04, M.metal);
    return liquid;
  }
  function roller(p) {
    const head = group(p),
      m = M.frit;
    const body = cyl(head, 0, 0, 0, 0.153, 0.153, 0.695, m, 40);
    body.rotation.z = Math.PI / 2;
    for (const x of [-0.347, 0.347]) {
      ell(head, x, 0, 0, 0.027, 0.149, 0.149, m);
      const cap = cyl(head, x * 1.07, 0, 0, 0.058, 0.058, 0.023, M.iron);
      cap.rotation.z = Math.PI / 2;
    }
    path(
      p,
      [
        [0.376, 0, 0],
        [0.438, 0, 0],
        [0.455, -0.036, 0.009],
        [0.455, -0.205, 0.046],
        [0.41, -0.254, 0.061],
        [0.113, -0.37, 0.11],
        [0.077, -0.424, 0.125],
        [0.077, -0.52, 0.138],
      ],
      0.024,
      M.metal,
    );
    const a = [0.077, -0.48, 0.13],
      b = [0.077, -1.075, 0.305];
    bar(p, a, b, 0.055, M.iron, 0.049);
    const pts = [
      [0, -0.31],
      [0.071, -0.3],
      [0.098, -0.27],
      [0.103, -0.21],
      [0.08, -0.02],
      [0.073, 0.13],
      [0.089, 0.22],
      [0.087, 0.26],
      [0.063, 0.28],
      [0, 0.28],
    ];
    const h = obj(
      p,
      new T.LatheGeometry(
        pts.map((v) => new T.Vector2(...v)),
        32,
      ),
      M.handle,
      0.077,
      -0.775,
      0.217,
    );
    h.rotation.x = -0.265;
    const ferrule = cyl(p, 0.077, -0.504, 0.139, 0.072, 0.071, 0.082, M.metal);
    ferrule.rotation.x = -0.26;
    const band = cyl(p, 0.077, -0.989, 0.277, 0.102, 0.102, 0.018, M.cream);
    band.rotation.x = -0.26;
    return head;
  }
  window.GardenArt = {
    T,
    rand,
    TAU,
    mix,
    clamp,
    texture,
    noise,
    wood,
    fleck,
    mat,
    timber,
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
  };
})();
