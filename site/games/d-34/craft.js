'use strict';
const Craft = (() => {
  const T = THREE, PI = Math.PI;
  let seed = 290;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296
  };
  const canvas = (w, h = w) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const texCache = new WeakMap();
  function texture(c, repeat = false) {
    if (texCache.has(c)) return texCache.get(c);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    texCache.set(c, t);
    return t;
  }
  function noise(type) {
    const c = canvas(type === 'wood' ? 768 : 192, type === 'wood' ? 256 : 192), g = c.getContext('2d'), im = g.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++)for (let x = 0; x < c.width; x++) {
      let v = 227 + rand() * 20;
      if (type === 'wood') {
        const d = y * .19 + Math.sin(x * .011 + y * .013) * .86 + Math.sin(x * .0032 - y * .061) * 1.5;
        v = 218 + 12 * Math.sin(d) + 6 * Math.cos(d * 4.1) + 9 * Math.sin(d * .31) + rand() * 11;
      }
      if (type === 'linen')v = 209 + 21 * Math.abs(Math.sin(x * 1.05)) + 16 * Math.abs(Math.cos(y * 1.57)) + rand() * 9;
      let p = (y * c.width + x) * 4;
      im.data[p] = im.data[p + 1] = im.data[p + 2] = v;
      im.data[p + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    if (type === 'wood') {
      for (let i = 0; i < 950; i++) {
        const x = rand() * c.width, y = rand() * 256, l = 4 + rand() ** 2 * 240;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + l * .3, y - 1.6, x + l * .7, y + 1, x + l, y + .6);
        g.strokeStyle = rand() > .46 ? 'rgba(66,36,13,.16)' : 'rgba(255,252,221,.34)';
        g.lineWidth = .35 + rand() * .8;
        g.stroke();
      }
    }
    return texture(c, true);
  }
  const grain = noise('wood'), weave = noise('linen'), fleck = noise('plain');
  function mat(color, rough = .65, metal = 0, map = null) {
    return new T.MeshStandardMaterial({color, roughness: rough, metalness: metal, map, roughnessMap: fleck, envMapIntensity: metal ? .82 : .38});
  }
  const palette = {
    oak: mat('#b98c5c', .49, 0, grain),
    honey: mat('#c79c6c', .48, 0, grain),
    walnut: mat('#724a34', .46, 0, grain),
    dark: mat('#493a32', .5, 0, grain),
    red: mat('#aa4335', .34, .08),
    wine: mat('#7f352e', .36, .12),
    brass: mat('#bb9759', .27, .76),
    gold: mat('#d8b47a', .28, .61),
    steel: mat('#9ba3a0', .23, .8),
    ink: mat('#323b38', .66),
    sage: mat('#697f74', .56, .12),
    leather: mat('#596e64', .78, 0, weave),
    cream: mat('#f2e6ca', .71, 0, fleck),
    cloth: mat('#d2b98d', .9, 0, weave),
    binding: mat('#926f4e', .75, 0, weave),
    plaster: mat('#ede0c4', .92, 0, fleck),
    glass: mat('#94b5af', .13, .32),
    navy: mat('#425f68', .42, .16),
    stone: mat('#9d9989', .74, 0, fleck),
    rubber: mat('#373a34', .89),
    ivory: mat('#fff5df', .78)
  };
  function group(parent, x = 0, y = 0, z = 0) {
    const o = new T.Group();
    parent.add(o);
    o.position.set(x, y, z);
    return o;
  }
  function mesh(p, geo, m, x = 0, y = 0, z = 0) {
    const o = new T.Mesh(geo, m);
    p.add(o);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    return o;
  }
  const geom = new Map();
  function cached(k, fn) {
    if (!geom.has(k)) geom.set(k, fn());
    return geom.get(k);
  }
  function box(p, x, y, z, w, h, d, m) {
    return mesh(p, cached('b' + [w, h, d], () => new T.BoxGeometry(w, h, d)), m, x, y, z);
  }
  function round(p, x, y, z, w, h, d, r, m) {
    r = Math.min(r, w * .4, d * .4, h * 1.8);
    const geo = cached('r' + [w, h, d, r], () => {
      const sh = new T.Shape(), a = w / 2 - r * .16, b = d / 2 - r * .16, q = r * .84;
      sh.moveTo(-a + q, -b);
      sh.lineTo(a - q, -b);
      sh.quadraticCurveTo(a, -b, a, -b + q);
      sh.lineTo(a, b - q);
      sh.quadraticCurveTo(a, b, a - q, b);
      sh.lineTo(-a + q, b);
      sh.quadraticCurveTo(-a, b, -a, b - q);
      sh.lineTo(-a, -b + q);
      sh.quadraticCurveTo(-a, -b, -a + q, -b);
      const v = Math.min(h * .23, r * .16), g = new T.ExtrudeGeometry(sh, {depth: h - 2 * v, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelThickness: v, bevelSize: r * .16, curveSegments: 5});
      g.rotateX(-PI / 2);
      g.translate(0, -h / 2 + v, 0);
      const uv = g.attributes.uv, pos = g.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + .5, .5 - pos.getZ(i) / d);
      return g;
    });
    return mesh(p, geo, m, x, y, z);
  }
  function sphere(p, x, y, z, a, b, c, m) {
    const o = mesh(p, cached('orb', () => new T.SphereGeometry(1, 24, 16)), m, x, y, z);
    o.scale.set(a, b, c);
    return o;
  }
  function cylinder(p, x, y, z, up, low, h, m, n = 32) {
    return mesh(p, cached('c' + [up, low, h, n], () => new T.CylinderGeometry(up, low, h, n)), m, x, y, z);
  }
  function lathe(p, x, y, z, pts, m) {
    return mesh(p, new T.LatheGeometry(pts.map(([a, b]) => new T.Vector2(a, b)), 48), m, x, y, z);
  }
  function torus(p, x, y, z, r, t, m) {
    return mesh(p, cached('t' + [r, t], () => new T.TorusGeometry(r, t, 10, 56)), m, x, y, z);
  }
  function rod(p, a, b, r, m, r2 = r, n = 12) {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), delta = B.clone().sub(A), len = delta.length();
    const o = cylinder(p, 0, 0, 0, r2, r, len, m, n);
    o.position.copy(A.add(B).multiplyScalar(.5));
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.divideScalar(len));
    return o;
  }
  function line(p, points, r, m) {
    return mesh(p, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v => new T.Vector3(...v))), Math.max(8, points.length * 4), r, 7, false), m);
  }
  function poly(p, pts, m, thick = .012) {
    const sh = new T.Shape(pts.map(v => new T.Vector2(...v)));
    return mesh(p, new T.ExtrudeGeometry(sh, {depth: thick, bevelEnabled: false}), m);
  }
  function bird(g, x, y, sz, col) {
    g.save();
    g.translate(x, y);
    g.scale(sz, sz);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(-.95, .18);
    g.quadraticCurveTo(-.43, .36, -.23, .20);
    g.quadraticCurveTo(-.48, -.08, -.58, -.79);
    g.quadraticCurveTo(-.25, -.7, .14, -.16);
    g.quadraticCurveTo(.34, -.64, .58, -.4);
    g.lineTo(.88, -.32);
    g.lineTo(.59, -.19);
    g.quadraticCurveTo(.37, .56, -.33, .43);
    g.lineTo(-.87, .53);
    g.lineTo(-.63, .3);
    g.fill();
    g.restore();
  }
  function emblem(g, i, x, y, r, col) {
    g.save();
    g.translate(x, y);
    g.fillStyle = g.strokeStyle = col;
    g.lineWidth = r * .08;
    g.lineCap = 'round';
    if (i % 5 === 2)bird(g, 0, 0, r, col); else if (i % 5 === 0) {
      for (let j = 0; j < 5; j++) {
        g.rotate(PI * 2 / 5);
        g.beginPath();
        g.ellipse(0, -r * .41, r * .25, r * .44, 0, 0, 7);
        g.fill();
      }
      g.fillStyle = '#edcf9c';
      g.beginPath();
      g.arc(0, 0, r * .16, 0, 7);
      g.fill();
    } else if (i % 5 === 1) {
      g.beginPath();
      g.moveTo(-r * .62, r * .58);
      g.quadraticCurveTo(-r * .96, -r * .48, r * .72, -r * .7);
      g.quadraticCurveTo(r * .74, r * .67, -r * .62, r * .58);
      g.fill();
      g.strokeStyle = '#edcf9c';
      g.beginPath();
      g.moveTo(-r * .54, r * .52);
      g.lineTo(r * .46, -r * .45);
      g.stroke();
    } else if (i % 5 === 3) {
      g.beginPath();
      g.arc(0, 0, r * .39, 0, 7);
      g.fill();
      for (let j = 0; j < 10; j++) {
        g.rotate(PI / 5);
        g.fillRect(-r * .043, -r * .84, r * .086, r * .25);
      }
    } else {
      g.beginPath();
      g.moveTo(0, r * .7);
      for (let j = 0; j <= 8; j++) {
        let a = PI + (j / 8) * PI;
        g.lineTo(Math.cos(a) * r * .8, Math.sin(a) * r * .7);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = '#edcf9c';
      for (let j = -2; j < 3; j++) {
        g.beginPath();
        g.moveTo(0, r * .48);
        g.lineTo(j * r * .27, -r * .46 + Math.abs(j) * r * .1);
        g.stroke();
      }
    }
    g.restore();
  }
  function badge(p, x, y, z, r, base = palette.wine, metal = palette.gold) {
    const d = cylinder(p, x, y, z, r, r, .028, base, 48);
    d.rotation.x = PI / 2;
    torus(p, x, y, z + .02, r * .89, r * .028, metal);
    const mark = poly(p, [
      [-.79, .02],
      [-.26, -.04],
      [-.53, .54],
      [-.16, .35],
      [.12, .06],
      [.34, .29],
      [.54, .25],
      [.65, .16],
      [.87, .12],
      [.58, .01],
      [.37, -.23],
      [.03, -.34],
      [-.3, -.26],
      [-.85, -.34],
      [-.59, -.13]
    ], metal, .035);
    mark.scale.setScalar(r * .83);
    mark.position.set(x, y, z + .03);
    return d;
  }
  function decal(p, x, y, z, w, h, c) {
    const m = mat('#ffffff', .8, 0, texture(c));
    m.transparent = true;
    m.depthWrite = false;
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    return mesh(p, new T.PlaneGeometry(w, h), m, x, y, z);
  }
  function paintSeal(c, index, sheet) {
    const g = c.getContext('2d'), size = c.width, unit = size / 224;
    g.clearRect(0, 0, size, size);
    g.save();
    g.scale(unit, unit);
    g.strokeStyle = '#9c4136';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(112, 112, 95, 0, PI * 2);
    g.stroke();
    g.lineWidth = 1.8;
    g.beginPath();
    g.arc(112, 112, 86, 0, PI * 2);
    g.stroke();
    emblem(g, index, 112, 112, 65, '#a34838');
    g.restore();
    const image = g.getImageData(0, 0, size, size);
    const alpha = sheet.fibre.map((f, i) => 1 - Math.exp(-2.15 * (f + sheet.ink[i] * .24)));
    for (let y = 0; y < size; y++)for (let x = 0; x < size; x++) {
      const cell = Math.floor(y / size * 7) * 7 + Math.floor(x / size * 7);
      image.data[(y * size + x) * 4 + 3] *= alpha[cell] * (.83 + .17 * Math.sin(x * 31 + y * 17));
    }
    g.putImageData(image, 0, 0);
  }
  function printFace(index) {
    const c = canvas(768, 470), g = c.getContext('2d');
    g.fillStyle = ['#f8efd9', '#f3e8cd', '#f6ecdb', '#f5e5cb', '#eee7ce'][index % 5];
    g.fillRect(0, 0, 768, 470);
    for (let i = 0; i < 10500; i++) {
      g.fillStyle = rand() > .5 ? '#a08a6330' : '#fff9e569';
      g.fillRect(rand() * 768, rand() * 470, rand() * 1.7 + .4, rand() * 1.2 + .4);
    }
    g.save();
    g.beginPath();
    g.rect(10, 10, 748, 450);
    g.rect(21, 21, 726, 428);
    g.clip('evenodd');
    for (let x = -500; x < 1250; x += 39) {
      g.fillStyle = Math.round((x + 500) / 39) % 2 ? '#a65041' : '#576d78';
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 16, 0);
      g.lineTo(x - 253, 470);
      g.lineTo(x - 270, 470);
      g.fill();
    }
    g.restore();
    g.lineWidth = 1;
    g.strokeStyle = '#bdab87';
    g.strokeRect(30, 30, 708, 410);
    // A perforated engraved postage stamp, with a bird, hills and sun.
    g.save();
    g.translate(600, 47);
    g.fillStyle = '#c5b391';
    g.fillRect(2, 3, 104, 128);
    g.fillStyle = '#fff6dc';
    g.fillRect(0, 0, 104, 128);
    for (let i = 4; i < 128; i += 9) {
      g.fillStyle = '#eee2c7';
      for (const xx of [0, 104]) {
        g.beginPath();
        g.arc(xx, i, 2.4, 0, 7);
        g.fill();
      }
    }
    const hue = ['#a25547', '#648272', '#567781', '#a67d4c', '#936663'][index % 5];
    g.fillStyle = hue;
    g.fillRect(7, 7, 90, 114);
    g.lineWidth = 1;
    g.strokeStyle = '#f1dfb8';
    g.strokeRect(11, 11, 82, 106);
    g.save();
    g.beginPath();
    g.rect(13, 13, 78, 100);
    g.clip();
    g.fillStyle = '#e9d7ac';
    g.beginPath();
    g.arc(68, 39, 13, 0, 7);
    g.fill();
    for (let j = 0; j < 20; j++) {
      g.beginPath();
      g.moveTo(12, 76 + j * 2.6);
      g.bezierCurveTo(35, 76 + j, 55, 49 + j * 2, 93, 77 + j * 2.3);
      g.stroke();
    }
    bird(g, 49, 56, 39, '#f7e7c8');
    g.restore();
    g.restore();
    g.strokeStyle = '#635d4f80';
    g.lineWidth = 2.1;
    g.beginPath();
    g.ellipse(592, 141, 44, 41, -.2, 0, 7);
    g.stroke();
    g.beginPath();
    g.arc(592, 141, 34, 0, 7);
    g.stroke();
    for (let j = 0; j < 4; j++) {
      g.beginPath();
      g.moveTo(471, 117 + j * 12);
      g.bezierCurveTo(502, 101 + j * 12, 523, 137 + j * 12, 553, 120 + j * 12);
      g.stroke();
    }
    g.strokeStyle = '#ad9e837a';
    g.lineWidth = 1.5;
    for (let j = 0; j < 3; j++) {
      g.beginPath();
      g.moveTo(433, 270 + j * 41);
      g.lineTo(671 - j * 16, 270 + j * 41);
      g.stroke();
    }
    g.setLineDash([4, 9]);
    g.lineWidth = 2.8;
    g.strokeStyle = '#b999768a';
    g.beginPath();
    g.arc(310, 257, 77, 0, PI * 2);
    g.stroke();
    g.setLineDash([]);
    return c;
  }
  const faces = Array.from({length: 5}, (_, i) => printFace(i));
  function letter(p, x, y, z, w = 1.82, d = 1.14, index = 0) {
    const ob = group(p, x, y, z);
    round(ob, 0, 0, 0, w, .027, d, .014, palette.cream);
    const face = decal(ob, 0, .0152, 0, w * .996, d * .996, faces[index % 5]);
    face.rotation.x = -PI / 2;
    ob.userData.face = face;
    return ob;
  }
  // Collapse stationary geometry into material batches, retaining every modeled face and material.
  function batch(parent) {
    parent.updateWorldMatrix(true, true);
    const inv = parent.matrixWorld.clone().invert(), sets = new Map(), remove = [];
    parent.traverse(o => {
      if (!o.isMesh || Array.isArray(o.material) || o.isInstancedMesh || o.material.transparent) return;
      const k = o.material;
      const a = sets.get(k) || [];
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      a.push(g);
      sets.set(k, a);
      remove.push(o);
    });
    for (const o of remove) o.removeFromParent();
    for (const [m, gs] of sets) {
      const g = new T.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) {
        const len = gs.reduce((n, g) => n + g.attributes[name].array.length, 0), arr = new Float32Array(len);
        let i = 0;
        for (const geom of gs) {
          const a = geom.attributes[name].array;
          arr.set(a, i);
          i += a.length;
        }
        g.setAttribute(name, new T.BufferAttribute(arr, name === 'uv' ? 2 : 3));
      }
      mesh(parent, g, m);
      gs.forEach(v => v.dispose());
    }
  }
  return {
    T,
    PI,
    rand,
    canvas,
    texture,
    mat,
    M: palette,
    grain,
    weave,
    fleck,
    group,
    mesh,
    box,
    round,
    sphere,
    cylinder,
    lathe,
    torus,
    rod,
    line,
    poly,
    bird,
    emblem,
    badge,
    decal,
    letter,
    faces,
    paintSeal,
    batch
  };
})();
