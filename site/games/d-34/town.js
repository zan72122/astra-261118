'use strict';
function buildTown(scene) {
  const {T, PI, rand, canvas, texture, mat, M, grain, group, mesh, box, round, sphere, cylinder, lathe, torus, rod, line, poly, bird, badge, letter, batch} = Craft;
  const world = group(scene), town = group(world), green = mat('#819477', .9), lightGreen = mat('#a8b493', .93), hedge = mat('#697f65', .91), roof = mat('#9c6655', .83), slate = mat('#677c80', .72), stucco = [mat('#e5cfae', .93), mat('#debaa0', .92), mat('#c2cab1', .94), mat('#e8d8b9', .92)], trim = mat('#f4dfbc', .67), wet = mat('#979687', .24, .17), waterMat = mat('#83a9ab', .14, .36), pink = mat('#c98971', .93);
  const mortar = mat('#787c73', .45);
  for (const [a, b] of [[-63, 22.85], [27.79, 94]]) {
    box(town, (a + b) / 2, -.38, -15, b - a, .64, 56, lightGreen);
    box(town, (a + b) / 2, -.091, -5.65, b - a, .16, 4.75, mortar);
  }
  for (const x of [22.73, 27.91]) {
    box(town, x, -.30, -9, .24, .77, 31, M.stone);
    for (let j = 0; j < 13; j++) {
      const z = -20 + j * 2.1;
      if (z > -8 && z < -3.8)continue;
      box(town, x, .116, z, .38, .129, 2.07, trim);
    }
  }
  // Individual wet setts with soft irregular edges and thin recessed mortar joints.
  const cobbles = [], colors = [];
  for (let i = -46; i < 170; i++)for (let j = 0; j < 12; j++) {
    const x = i * .386 + (j % 2) * .193;
    if (x > 22.8 && x < 27.7)continue;
    cobbles.push([x, .012 + (rand() - .5) * .018, -7.76 + j * .378, .371 + rand() * .008, .058, .357 + rand() * .014, (rand() - .5) * .035]);
    colors.push(new T.Color().setHSL(.09 + rand() * .035, .045 + rand() * .06, .66 + rand() * .17));
  }
  const proto = round(town, 0, 0, 0, .377, .057, .362, .035, wet), ig = proto.geometry;
  proto.removeFromParent();
  const stones = new T.InstancedMesh(ig, wet, cobbles.length), dummy = new T.Object3D();
  cobbles.forEach((a, i) => {
    dummy.position.set(a[0], a[1], a[2]);
    dummy.rotation.y = a[6];
    dummy.scale.set(a[3] / .377, a[4] / .057, a[5] / .362);
    dummy.updateMatrix();
    stones.setMatrixAt(i, dummy.matrix);
    stones.setColorAt(i, colors[i]);
  });
  town.add(stones);
  stones.receiveShadow = true;
  for (let k = -18; k < 68; k++) {
    if (k > 22 && k < 28)continue;
    box(town, k, .087, -8.06, .99, .17, .27, M.stone);
    box(town, k, .08, -8.64, .994, .15, .93, stucco[0]);
  }
  const water = group(world, 25.4, -.30, -8);
  box(water, 0, 0, 0, 4.9, .25, 35, waterMat);
  const ripple = [];
  for (let i = 0; i < 25; i++) {
    const z = -12 + i * .92;
    const r = torus(water, (rand() - .5) * 4, .14, z, .1 + rand() * .32, .009, mat('#b2cbca', .21, .25));
    r.rotation.x = PI / 2;
    r.scale.x = 1.45;
    ripple.push(r);
  }
  const puddles = [];
  for (let i = 0; i < 19; i++) {
    const x = -4 + i * 3.35;
    if (x > 22 && x < 28)continue;
    const p = sphere(town, x, .046, -4.4 - rand() * .62, .42 + rand() * .54, .009, .12 + rand() * .16, waterMat);
    p.rotation.y = (rand() - .5) * .5;
    puddles.push(p);
  }
  function windowBox(p, x, y, z, w, h, shutters = true) {
    box(p, x, y, z, w + .15, h + .15, .09, trim);
    box(p, x, y, z + .058, w, h, .038, M.navy);
    box(p, x, y, z + .085, w - .08, h - .08, .025, M.glass);
    box(p, x, y, z + .11, .045, h, .035, trim);
    box(p, x, y, z + .11, w, .044, .035, trim);
    box(p, x, y - h * .5 - .035, z + .13, w + .25, .09, .28, trim);
    if (shutters)for (const s of [-1, 1]) {
      box(p, x + s * w * .75, y, z + .072, w * .39, h + .03, .066, M.sage);
      for (let j = 0; j < 5; j++)box(p, x + s * w * .75, y + (j - 2) * h * .16, z + .113, w * .31, .028, .032, hedge);
    }
  }
  function house(x, z, w, h, depth, idx, detail = true) {
    const p = group(town, x, 0, z), m = stucco[idx % 4], r = idx % 3 ? roof : slate;
    box(p, 0, h / 2, 0, w, h, depth, m);
    box(p, 0, .16, 0, w + .10, .31, depth + .10, M.stone);
    const pitch = .50, roofH = w * .25;
    const shape = poly(p, [[-w * .5, h], [w * .5, h], [0, h + roofH]], m, depth);
    shape.position.z = -depth * .5;
    for (const side of [-1, 1]) {
      let sl = box(p, side * w * .25, h + roofH * .50, 0, w * .57 + .22, .15, depth + .52, r);
      sl.rotation.z = -side * Math.atan(pitch);
      for (let j = 0; j < 4; j++) {
        const dx = (j + .32) / 4 * (w * .5 + .13);
        box(p, side * dx, h + roofH - dx * pitch + .09, 0, .075, .055, depth + .54, r);
      }
    }
    box(p, 0, h + roofH + .08, 0, .13, .15, depth + .60, r);
    box(p, w * .26, h + roofH * .78 + .24, -depth * .18, .40, .86, .43, m);
    box(p, w * .26, h + roofH * .78 + .68, -depth * .18, .49, .12, .52, r);
    const front = depth * .5;
    if (detail) {
      const door = group(p, -w * .22, 0, front);
      box(door, 0, .93, .09, .95, 1.86, .14, trim);
      box(door, 0, .88, .178, .76, 1.70, .055, idx % 2 ? M.wine : M.sage);
      box(door, 0, 1.19, .21, .51, .52, .03, M.glass);
      box(door, 0, .56, .21, .54, .42, .028, M.leather);
      sphere(door, .24, .78, .254, .047, .047, .04, M.brass);
      box(door, 0, .097, .30, 1.20, .19, .51, M.stone);
      windowBox(p, w * .22, 1.32, front + .02, .91, .96);
      if (h > 3.25) {
        windowBox(p, -w * .22, h - .82, front + .02, .71, .80, false);
        windowBox(p, w * .22, h - .82, front + .02, .71, .80, false);
      }
      const e = box(p, 0, h + .055, front + .16, w + .39, .11, .20, trim);
    }
    return p;
  }
  const deliveryHouses = [];
  for (const [i, x] of PostSim.stops.entries()) {
    const p = house(x + .6, -11.36, 4.0 + i * .35, 3.25 + i * .19, 3.45, i + 1);
    deliveryHouses.push(p);
  }
  house(-5.0, -12.4, 4.7, 3.05, 3.1, 2);
  house(1.0, -13.1, 4.85, 3.65, 4, 0);
  house(6.7, -13.75, 4.1, 2.92, 3.45, 1);
  house(42, -13, 4.9, 3.1, 3.1, 2);
  for (let i = 0; i < 17; i++) {
    const x = -24 + i * 6.1;
    house(x, -20 - rand() * 4.5, 3.2 + rand() * 2, 2.4 + rand() * 1.6, 3.3, i, false);
  }
  // Trees are actual branch structures carrying clustered leaf masses.
  const foliage = [green, lightGreen, hedge, mat('#93a279', .9)], leafGeo = new T.IcosahedronGeometry(1, 1);
  leafGeo.computeVertexNormals();
  let crowns = [];
  function tree(x, z, size) {
    const p = group(town, x, 0, z);
    p.scale.setScalar(size);
    rod(p, [0, 0, 0], [.06, 2.15, -.05], .13, M.walnut, .078);
    for (let k = 0; k < 5; k++) {
      const a = k * 2.4 + rand(), cx = Math.cos(a) * (.24 + rand() * .53), cz = Math.sin(a) * .57, cy = 1.7 + rand() * .85;
      rod(p, [.03, 1.07, 0], [cx, cy + .21, cz], .061, M.walnut, .027);
      for (let j = 0; j < 6; j++) {
        const px = cx + (rand() - .5) * .68, py = cy + rand() * .72, pz = cz + (rand() - .5) * .64;
        crowns.push([x + px * size, py * size, z + pz * size, (.36 + rand() * .31) * size, (.40 + rand() * .29) * size, (.32 + rand() * .23) * size, Math.floor(rand() * 4)]);
      }
    }
  }
  for (const [x, z, sz] of [[-6, -8.8, 1.42], [3.5, -9.6, 1.12], [9.1, -10.7, 1.35], [18.5, -10.5, 1.26], [28.9, -10, 1.2], [38.7, -10, 1.4], [48, -10.9, 1.34], [57.7, -9.8, 1.66], [4, -17, 1.7], [-9, -15, 1.8]])tree(x, z, sz);
  for (let j = 0; j < 4; j++) {
    const aa = crowns.filter(v => v[6] === j), ins = new T.InstancedMesh(leafGeo, foliage[j], aa.length);
    aa.forEach((v, i) => {
      dummy.position.set(v[0], v[1], v[2]);
      dummy.rotation.set(rand(), rand(), rand());
      dummy.scale.set(v[3], v[4], v[5]);
      dummy.updateMatrix();
      ins.setMatrixAt(i, dummy.matrix);
    });
    ins.castShadow = ins.receiveShadow = true;
    town.add(ins);
  }
  for (let i = 0; i < 14; i++) {
    const hill = sphere(town, -56 + i * 10, .15, -33 - rand() * 18, 8 + rand() * 12, 4 + rand() * 5, 7 + rand() * 5, i % 2 ? green : lightGreen);
  }
  // A riveted mail launch, with seven wake sections driven by the hull displacement.
  const boat = group(world, 25.34, -.15, -13.5), hull = group(boat), hp = [], hu = [], hi = [];
  const hullSections = [[-1.13, .16], [-.88, .37], [-.32, .44], [.36, .42], [.82, .31], [1.22, .015]];
  for (let i = 0; i < hullSections.length; i++) {
    const [z, r] = hullSections[i];
    for (const [x, y] of [[-r, .31], [-r * .77, .03], [0, -.12], [r * .77, .03], [r, .31]]) {
      hp.push(x, y, z);
      hu.push(x + .5, z * .5 + .5);
    }
    if (i) {
      for (let j = 0; j < 4; j++) {
        let n = i * 5 + j;
        hi.push(n - 5, n, n - 4, n - 4, n, n + 1);
      }
    }
  }
  const hullGeo = new T.BufferGeometry();
  hullGeo.setAttribute('position', new T.Float32BufferAttribute(hp, 3));
  hullGeo.setAttribute('uv', new T.Float32BufferAttribute(hu, 2));
  hullGeo.setIndex(hi);
  hullGeo.computeVertexNormals();
  const hullPaint = M.navy.clone();
  hullPaint.side = T.DoubleSide;
  mesh(hull, hullGeo, hullPaint);
  const deckShape = poly(hull, [...hullSections.map(([z, r]) => [-r, z]), ...hullSections.slice().reverse().map(([z, r]) => [r, z])], M.honey, .032);
  deckShape.rotation.x = Math.PI / 2;
  deckShape.position.y = .32;
  for (const sign of [-1, 1])line(hull, hullSections.map(([z, r]) => [r * sign, .315, z]), .026, M.cream);
  round(hull, 0, .56, -.21, .57, .47, .75, .055, M.cream);
  for (const z of [-.40, -.07])for (const sign of [-1, 1])box(hull, .29 * sign, .61, z, .02, .21, .22, M.glass);
  box(hull, 0, .61, .177, .44, .21, .025, M.glass);
  round(hull, 0, .822, -.21, .69, .071, .85, .042, M.red);
  cylinder(hull, 0, .986, -.43, .088, .107, .30, M.red);
  cylinder(hull, 0, 1.14, -.43, .101, .10, .062, M.ink);
  torus(hull, 0, .55, .206, .103, .024, M.wine);
  rod(hull, [0, .31, .77], [0, 1.01, .77], .016, M.brass);
  const pennant = poly(hull, [[0, 0], [.25, -.065], [0, -.145]], M.red);
  pennant.position.set(0, 1.00, .77);
  for (const sign of [-1, 1])for (const z of [-.67, .37]) {
    const f = torus(hull, sign * .405, .247, z, .093, .027, M.rubber);
    f.rotation.y = Math.PI / 2;
  }
  batch(hull);
  const wakes = [];
  for (let j = 0; j < 7; j++) {
    const q = group(boat, 0, .034, -.73 - j * .31);
    for (const side of [-1, 1])line(q, [[side * .20, 0, .02], [side * (.45 + j * .04), 0, -.10], [side * (.57 + j * .07), 0, -.25]], .009, waterMat);
    wakes.push(q);
  }
  // Railings, riverside bollards and a single opening bridge.
  const bridge = group(world, 22.85, .05, -5.65);
  box(bridge, 2.47, 0, 0, 4.96, .17, 3.15, M.walnut);
  for (let i = 0; i < 14; i++)box(bridge, .17 + i * .35, .113, 0, .337, .069, 3.09, M.oak);
  for (const z of [-1.52, 1.52]) {
    for (let i = 0; i < 5; i++)rod(bridge, [i * 1.22, .12, z], [i * 1.22, .89, z], .046, M.sage);
    rod(bridge, [0, .89, z], [4.88, .89, z], .048, M.sage);
    rod(bridge, [0, .52, z], [4.88, .52, z], .024, M.brass);
  }
  batch(bridge);
  const crank = group(world, 21.84, 1.07, -4.12);
  cylinder(town, 21.84, .50, -4.16, .17, .24, .93, M.sage);
  torus(crank, 0, 0, 0, .39, .043, M.brass);
  for (let k = 0; k < 5; k++) {
    let a = k * PI * 2 / 5;
    rod(crank, [0, 0, 0], [.37 * Math.cos(a), .37 * Math.sin(a), 0], .023, M.brass);
  }
  rod(crank, [.33, 0, 0], [.33, 0, .15], .052, M.walnut);
  badge(crank, 0, 0, .01, .093, M.wine, M.gold);
  // Red delivery roadster: spoked wheels, cream sidewalls, mudguards, chain, basket and bell.
  const bike = group(world, 1.25, .06, -5.65), frame = group(bike), wheels = [];
  const red = M.red;
  for (const x of [-.68, .68]) {
    const wheel = group(bike, x, .44, 0);
    torus(wheel, 0, 0, 0, .418, .044, M.rubber);
    torus(wheel, 0, 0, .012, .398, .025, M.cream);
    torus(wheel, 0, 0, .017, .369, .013, M.steel);
    for (let j = 0; j < 24; j++) {
      let a = PI * 2 * j / 24;
      rod(wheel, [0, 0, j % 2 ? .045 : -.045], [Math.cos(a) * .366, Math.sin(a) * .366, 0], .0055, M.steel);
    }
    rod(wheel, [0, 0, -.061], [0, 0, .061], .049, M.brass);
    batch(wheel);
    wheels.push(wheel);
    let coords = [];
    for (let k = 0; k < 14; k++) {
      let a = .05 + PI * .91 * k / 13;
      coords.push([x + Math.cos(a) * .474, .44 + Math.sin(a) * .474, 0]);
    }
    line(frame, coords, .031, red);
  }
  for (const z of [-.055, .055]) {
    rod(frame, [-.68, .44, z], [-.1, .39, z], .032, red);
    rod(frame, [-.68, .44, z], [-.25, .96, z], .028, red);
    rod(frame, [.68, .44, z], [.49, 1.11, z], .036, red);
  }
  rod(frame, [-.1, .39, 0], [-.28, 1.04, 0], .044, red);
  line(frame, [[-.12, .42, 0], [.04, .47, 0], [.27, .65, 0], [.47, 1.0, 0]], .044, red);
  line(frame, [[-.23, .80, 0], [-.11, .67, 0], [.12, .68, 0], [.49, 1.08, 0]], .026, red);
  rod(frame, [-.27, 1.01, 0], [-.3, 1.145, 0], .031, M.steel);
  sphere(frame, -.31, 1.16, 0, .188, .054, .101, M.walnut);
  rod(frame, [.48, 1.05, 0], [.44, 1.31, 0], .032, M.steel);
  line(frame, [[.34, 1.30, -.23], [.47, 1.34, -.17], [.46, 1.33, .13], [.33, 1.32, .24]], .023, M.steel);
  for (const z of [-.23, .23])rod(frame, [.30, 1.31, z], [.40, 1.33, z * .84], .031, M.walnut);
  sphere(frame, .43, 1.37, .14, .046, .036, .046, M.brass);
  torus(frame, -.1, .40, .073, .114, .018, M.steel);
  line(frame, [[-.66, .49, .074], [-.11, .506, .074], [.025, .424, .074], [-.1, .304, .074], [-.67, .397, .074], [-.71, .442, .074], [-.66, .49, .074]], .009, M.ink);
  round(frame, -.69, .978, 0, .60, .045, .36, .035, M.sage);
  for (const z of [-.1, .1])rod(frame, [-.68, .44, z], [-.82, .96, z], .016, M.steel);
  const basket = group(frame, .705, 1.04, 0);
  round(basket, 0, 0, 0, .43, .044, .38, .02, M.binding);
  for (let i = 0; i < 6; i++) {
    const y = .025 + i * .045, w = .21 + i * .007, d = .18 + i * .007;
    line(basket, [[-w, y, -d], [w, y, -d], [w, y, d], [-w, y, d], [-w, y, -d]], .014, M.oak);
  }
  for (let i = 0; i < 6; i++) {
    let a = i * PI / 3;
    rod(basket, [.20 * Math.cos(a), 0, .18 * Math.sin(a)], [.24 * Math.cos(a), .28, .22 * Math.sin(a)], .012, M.binding);
  }
  batch(frame);
  const pedals = group(bike, -.10, .4, .09);
  for (const s of [-1, 1]) {
    rod(pedals, [0, 0, s * .025], [s * .119, 0, s * .046], .014, M.steel);
    box(pedals, s * .12, 0, s * .078, .10, .026, .077, M.walnut);
  }
  const boxes = [], flags = [], doors = [], hands = [], mailPos = [];
  for (let i = 0; i < 3; i++) {
    let x = PostSim.stops[i];
    const mb = group(world, x, 0, -7.72);
    box(mb, 0, .63, 0, .13, 1.24, .13, M.walnut);
    round(mb, 0, .107, 0, .34, .21, .28, .031, M.stone);
    round(mb, 0, 1.24, 0, .72, .55, .43, .075, i === 1 ? M.sage : M.wine);
    round(mb, 0, 1.52, 0, .81, .076, .53, .027, M.walnut);
    box(mb, 0, 1.31, .22, .47, .076, .026, M.ink);
    box(mb, 0, 1.365, .243, .53, .029, .092, M.brass);
    badge(mb, 0, 1.155, .222, .090, M.wine, M.gold);
    const flag = group(world, x + .369, 1.32, -7.67);
    rod(flag, [0, 0, 0], [.42, 0, 0], .026, M.brass);
    box(flag, .356, .087, 0, .16, .158, .027, M.red);
    sphere(flag, 0, 0, .024, .047, .047, .027, M.brass);
    flags.push(flag);
    batch(mb);
    boxes.push(mb);
    mailPos.push(new T.Vector3(x, 1.31, -7.42));
    const wx = x + .6 + (4 + i * .35) * .22, wy = 1.32, wz = -9.46;
    const pivot = group(world, wx - .47, wy, wz);
    box(pivot, .236, 0, 0, .465, .91, .066, M.sage);
    for (let k = 0; k < 6; k++)box(pivot, .236, (k - 2.5) * .13, .044, .37, .042, .035, M.leather);
    doors.push(pivot);
    const arm = group(world, wx, wy - .18, wz - .09);
    const glove = mat('#d3ad79', .82, 0, Craft.weave);
    line(arm, [[0, .00, -.43], [.03, .01, -.21], [-.02, .02, 0]], .063, M.brass);
    sphere(arm, 0, .024, .017, .112, .045, .118, glove);
    for (let j = 0; j < 4; j++)sphere(arm, (j - 1.5) * .044, .044, .12 + (1 - Math.abs(j - 1.5)) * .015, .027, .031, .072, glove);
    sphere(arm, -.098, .063, .044, .038, .044, .065, glove);
    batch(arm);
    hands.push(arm);
  }
  const bundles = Array.from({length: 2}, () => {
    const env = letter(world, 0, 0, 0, .55, .34, 0), surface = canvas(112), seal = Craft.decal(env, -.055, .019, .017, .16, .16, surface);
    seal.rotation.x = -PI / 2;
    return {env, surface, seal, key: ''};
  });
  const plane = group(world, 53, 1.70, -7.70);
  const wings = [], wingFacets = [];
  function triangle(parent, vertices, material) {
    let g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(vertices.flat(), 3));
    g.setAttribute('uv', new T.Float32BufferAttribute([0, .5, 1, 0, 1, 1], 2));
    g.computeVertexNormals();
    return mesh(parent, g, material);
  }
  for (const side of [-1, 1]) {
    const wing = group(plane), crease = group(wing, -.56, 0, 0), paper = M.ivory.clone();
    paper.side = T.DoubleSide;
    const edge = [1.08, 0, side * .39];
    triangle(wing, [[-.56, 0, 0], [.52, 0, 0], [.52, 0, edge[2]]], paper);
    const pale = mat(side > 0 ? '#ede2ca' : '#fbefd9', .79, 0, Craft.fleck);
    pale.side = T.DoubleSide;
    triangle(crease, [[0, 0, 0], edge, [0, 0, edge[2]]], pale);
    line(crease, [[.018, .006, edge[2] * .93], [.44, .006, edge[2] * .93], [.91, .006, edge[2] * .93]], .008, side > 0 ? M.red : M.navy);
    wings.push(wing);
    wingFacets.push({crease, axis: new T.Vector3(...edge).normalize(), side});
  }
  const windmill = group(town, 51, 0, -14.7);
  cylinder(windmill, 0, 2.05, 0, .78, 1.22, 4.1, stucco[0], 12);
  cylinder(windmill, 0, 4.5, 0, .03, 1.1, 1.1, slate, 12);
  const sails = group(world, 51, 3.5, -13.5);
  for (let j = 0; j < 4; j++) {
    const blade = group(sails);
    blade.rotation.z = j * PI / 2;
    rod(blade, [0, 0, 0], [0, 2.16, 0], .045, M.walnut);
    for (let k = 0; k < 4; k++)box(blade, .13, .92 + k * .32, 0, .32, .29, .035, M.cream);
  }
  batch(town);
  const result = {world, bike, boxes, crank, boat, plane, wings, mailPos};
  result.update = (s) => {
    bike.position.x = s.bikeX;
    bike.rotation.y = s.bikeYaw.x;
    bike.rotation.z = s.wobbleObject === 'bike' ? s.wobble.x * .24 : 0;
    frame.position.y = (s.axles[0].x + s.axles[1].x) * .5;
    frame.rotation.z = (s.axles[1].x - s.axles[0].x) / 1.36;
    for (let i = 0; i < 2; i++) {
      wheels[i].rotation.z = -s.wheel;
      wheels[i].position.y = .44 + s.axles[i].x;
    }
    pedals.rotation.z = -s.pedal;
    bridge.rotation.z = s.span.x;
    crank.rotation.z = -s.rotor.x;
    sails.rotation.z = s.millAngle || 0;
    for (let i = 0; i < 3; i++) {
      flags[i].rotation.z = s.flag[i].x;
      doors[i].rotation.y = -s.door[i].x;
      hands[i].position.z = -9.55 + s.hand[i].x;
      hands[i].visible = s.hand[i].x > .025;
    }
    for (let j = 0; j < 2; j++) {
      const item = bundles[j], mail = item.env;
      mail.visible = s.stage === 'receiving' && (j === 0 || s.house !== 2);
      if (!mail.visible)continue;
      const id = s.house * 2 + j, key = s.round + '-' + id;
      if (item.key !== key) {
        Craft.paintSeal(item.surface, id, s.sheets[id]);
        item.seal.material.map.needsUpdate = true;
        mail.userData.face.material.map = Craft.texture(Craft.faces[id]);
        item.key = key;
      }
      const f = j === 0 ? s.mail.x : s.mailFollow.x, k = s.pass[j].x;
      mail.position.set(s.bikeX - .63 + j * .08, 1.67 + j * .043, -5.64 + j * .09).lerp(mailPos[s.house], f);
      mail.position.y += .42 * Math.sin(f * PI) + j * .025;
      mail.position.lerp(new T.Vector3(hands[s.house].position.x + j * .05, 1.25 + j * .035, hands[s.house].position.z + .14), k);
      mail.rotation.set(-f * .15 - k * .76, 0, .12 * (1 - f) + j * .09);
    }
    ripple.forEach((r, i) => {
      r.position.y = .14 + s.water[i].x;
      r.scale.set(1.44 + s.water[i].x * 6, 1 + s.water[i].x * 4, 1);
    });
    boat.position.z = s.boatZ;
    boat.position.y = -.16 + s.boatWake[0].x * .46 + s.water[10].x * .71;
    boat.rotation.x = s.boatWake[1].v * .68 + s.water[11].v * .29;
    boat.rotation.z = (s.boatWake[3].x - s.boatWake[0].x) * 2;
    wakes.forEach((w, i) => {
      w.visible = Math.abs(s.boatWake[i].x) > .002;
      w.scale.x = .71 + s.boatWake[i].x * 10;
      w.position.y = .032 + s.boatWake[i].x;
    });
    plane.visible = ['fold', 'creasing', 'launch', 'flight', 'landing'].includes(s.stage);
    wings.forEach((w, i) => {
      const a = s.fold[i].x / 1.99;
      w.rotation.x = (i === 0 ? 1 : -1) * a * .21;
      const {crease, axis, side} = wingFacets[i];
      crease.quaternion.setFromAxisAngle(axis, -side * (.031 + a * 3.06));
    });
    plane.position.set(s.plane.x, s.plane.y, s.plane.z);
    plane.rotation.set(s.plane.bank.x, Math.atan2(s.plane.vz, -s.plane.vx || 1), s.stage === 'flight' ? -.08 * s.plane.vy : 0);
  };
  return result;
}
