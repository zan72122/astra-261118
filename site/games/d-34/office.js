'use strict';
function buildOffice(scene, narrow) {
  const {T, PI, rand, canvas, texture, mat, M, grain, weave, group, mesh, box, round, sphere, cylinder, lathe, torus, rod, line, poly, bird, emblem, badge, decal, letter, batch} = Craft;
  const room = group(scene), fixed = group(room), props = group(room), desk = 1.38;
  const layout = {
    sheet: [narrow ? .02 : .15, desk + .125, narrow ? .96 : .75],
    bag: [narrow ? 1.03 : 2.24, desk, narrow ? -.68 : -.16],
    scale: [narrow ? -1.0 : -2.15, desk, narrow ? -1.18 : -.83],
    stack: [narrow ? -.99 : -2.24, desk + .12, narrow ? .62 : .84]
  };
  // Joinery, planks and an inset leather writing surface.
  const work = group(fixed);
  round(work, 0, 1.18, .08, 9.2, .31, 4.56, .075, M.walnut);
  for (let i = 0; i < 6; i++) {
    const wood = M.honey.clone();
    wood.color.offsetHSL(.003 * (i % 2), 0, (rand() - .5) * .045);
    round(work, 0, desk - .029, -1.82 + i * .765, 9.32, .058, .763, .014, wood);
  }
  box(work, 0, 1.29, 2.365, 9.24, .034, .025, M.brass);
  box(work, 0, .63, 2.14, 9, .98, .26, M.walnut);
  for (let i = -3; i <= 3; i++) {
    box(work, i * 1.38, .67, 2.29, 1.24, .73, .036, M.oak);
    box(work, i * 1.38, .67, 2.31, 1.11, .61, .026, M.walnut);
    const cup = torus(work, i * 1.38, .75, 2.36, .083, .014, M.brass);
    cup.scale.y = .58;
  }
  badge(work, .25, .70, 2.348, .23, M.wine, M.gold);
  const px = layout.sheet[0], pz = layout.sheet[2], board = group(fixed, px, desk, pz);
  board.rotation.y = -.085;
  round(board, 0, .045, 0, narrow ? 2.43 : 3.10, .09, narrow ? 1.75 : 1.98, .085, M.walnut);
  round(board, 0, .09, 0, narrow ? 2.35 : 3.00, .035, narrow ? 1.67 : 1.89, .075, M.leather);
  const stitch = canvas(640, 380), sg = stitch.getContext('2d');
  sg.strokeStyle = '#d8c9a279';
  sg.lineWidth = 1.5;
  sg.setLineDash([5, 4]);
  sg.beginPath();
  sg.roundRect(8, 8, 624, 364, 15);
  sg.stroke();
  let seam = decal(board, 0, .109, 0, narrow ? 2.32 : 2.97, narrow ? 1.64 : 1.86, stitch);
  seam.rotation.x = -PI / 2;
  for (const sx of [-1, 1])for (const sz of [-1, 1]) {
    let x = sx * (narrow ? 1.1 : 1.42), z = sz * (narrow ? .75 : .86);
    cylinder(board, x, .114, z, .028, .028, .008, M.brass, 16);
  }
  // A deep real window bay opens onto the lane, under a striped canvas valance.
  const wz = -3.30, left = narrow ? -2.53 : -3.05, right = 5.50, center = (left + right) / 2, ww = right - left;
  box(fixed, -5.9, 3, wz, 2 * (5.9 + left), 8, .32, M.plaster);
  box(fixed, 7, 3, wz, 2 * (7 - right), 8, .32, M.plaster);
  box(fixed, center, .39, wz, ww, .86, .32, M.sage);
  box(fixed, center, 6.76, wz, ww, 2, .32, M.plaster);
  for (let x = -8; x < 7.5; x += .54) {
    box(fixed, x, .72, wz + .19, .53, 1.5, .09, M.sage);
  }
  box(fixed, 0, 1.04, wz + .26, 17, .11, .21, M.walnut);
  box(fixed, center, .99, wz + .24, ww + .2, .14, .58, M.honey);
  for (const x of [left, right]) {
    box(fixed, x, 3.12, wz, .15, 4.25, .29, M.walnut);
    box(fixed, x + .013, 3.08, wz + .17, .059, 4.2, .07, M.honey);
  }
  box(fixed, center, 4.72, wz, ww, .13, .29, M.walnut);
  for (const x of [left + ww * .34, left + ww * .77])box(fixed, x, 3.03, wz, .07, 4.05, .13, M.oak);
  box(fixed, center, 3.66, wz, ww, .066, .12, M.oak);
  const stripeColors = [mat('#a65345', .88, 0, weave), mat('#eee2c5', .92, 0, weave)];
  const n = 22, sw = ww / n;
  for (let i = 0; i < n; i++) {
    let x = left + (i + .5) * sw;
    let roof = box(fixed, x, 3.89, wz - .55, sw + .004, .045, 1.4, stripeColors[i % 2]);
    roof.rotation.x = -.2;
    box(fixed, x, 3.56, wz - 1.23, sw + .002, .28, .037, stripeColors[i % 2]);
    let cap = sphere(fixed, x, 3.435, wz - 1.23, sw * .5, .105, .022, stripeColors[i % 2]);
  }
  // A small sorting cabinet and pigeonholes in the shade beside the window.
  const cabinet = group(fixed, left - .80, 2.75, wz + .26);
  box(cabinet, 0, 0, -.12, 1.43, 1.65, .22, M.dark);
  for (const x of [-.72, 0, .72])box(cabinet, x, 0, .04, .065, 1.7, .47, M.walnut);
  for (let j = 0; j < 4; j++) {
    let y = -.78 + j * .52;
    box(cabinet, 0, y, .04, 1.5, .065, .49, M.oak);
    if (j < 3)for (let k = 0; k < 2; k++) {
      for (let h = 0; h < (j + k) % 3 + 1;h++) {
        let l = box(cabinet, -.35 + k * .69, y + .07 + h * .04, .04, .45, .037, .34, M.cream);
        l.rotation.y = (rand() - .5) * .21;
      }
    }
  }
  const stampSign = group(fixed, left - .8, 4.06, wz + .18);
  badge(stampSign, 0, 0, 0, .38, M.wine, M.gold);
  // Side wall is behind the cabinet and catches the sun from the window.
  box(fixed, -5.45, 2.9, -.7, .22, 6.0, 6, M.plaster);
  for (let z = -3; z < 2.5; z += .62)box(fixed, -5.32, .8, z, .11, 1.6, .60, M.sage);
  box(fixed, -5.26, 1.58, -.5, .24, .15, 6, M.walnut);
  // Stacked correspondence with different thicknesses and imperfectly aligned edges.
  const pile = group(props, ...layout.stack);
  pile.rotation.y = .15;
  for (let i = 0; i < 7; i++) {
    const env = letter(pile, (rand() - .5) * .09, i * .038, (rand() - .5) * .09, narrow ? .91 : 1.32, narrow ? .61 : .82, i % 5);
    env.rotation.y = (rand() - .5) * .13;
  }
  const stringMat = mat('#a8906e', .95, 0, weave);
  const pw = narrow ? .9 : 1.32, pd = narrow ? .61 : .82;
  for (let i = 0; i < 2; i++) {
    line(pile, [[-pw * .52, .14, -.08 + i * .036], [-pw * .49, .271, -.075 + i * .036], [0, .273, -.07 + i * .036], [pw * .49, .269, -.071 + i * .036], [pw * .52, .05, -.07 + i * .036]], .009, stringMat);
  }
  // Ink pad in a brass tin and a few desk-side tools.
  const pad = group(props, narrow ? .17 : .65, desk + .01, narrow ? -1.29 : -1.17);
  pad.rotation.y = .14;
  round(pad, 0, .047, 0, .82, .094, .59, .065, M.brass);
  round(pad, 0, .103, 0, .75, .04, .52, .05, M.wine);
  round(pad, 0, .13, 0, .66, .027, .43, .043, mat('#643c3c', .86, 0, weave));
  let lid = group(pad, 0, .09, -.33);
  lid.rotation.x = -.97;
  round(lid, 0, .014, -.24, .80, .045, .54, .046, M.wine);
  round(lid, 0, .041, -.24, .68, .018, .43, .038, M.brass);
  // Glazed bud vase with stems, cut leaves and small porcelain-white marguerites.
  const blooms = group(fixed, narrow ? -1.75 : -3.66, desk, -.32);
  lathe(blooms, 0, 0, 0, [[.11, 0], [.17, .035], [.19, .18], [.17, .34], [.085, .42], [.084, .50], [.098, .51], [.097, .53], [.074, .53]], M.glass);
  const stemPaint = mat('#728064', .82), petal = mat('#f5e9cc', .74), pollen = mat('#c39a4e', .78);
  for (let i = 0; i < 5; i++) {
    const a = i * 2.39, fx = .23 * Math.cos(a), fz = .18 * Math.sin(a), fy = .82 + .11 * (i % 3);
    line(blooms, [[0, .31, 0], [.13 * fx, .62, .2 * fz], [fx, fy, fz]], .009, stemPaint);
    let leaf = sphere(blooms, fx * .7, fy - .12, fz * .65, .052, .094, .017, stemPaint);
    leaf.rotation.z = .8 * (i % 2 ? 1 : -1);
    const head = group(blooms, fx, fy, fz);
    head.rotation.x = -.36;
    for (let j = 0; j < 9; j++) {
      const b = j * PI * 2 / 9;
      let l = sphere(head, Math.sin(b) * .051, Math.cos(b) * .051, 0, .023, .047, .011, petal);
      l.rotation.z = -b;
    }
    sphere(head, 0, 0, .012, .031, .032, .02, pollen);
  }
  const penPot = group(props, narrow ? -2.0 : -3.68, desk, -1.25);
  lathe(penPot, 0, 0, 0, [[.18, 0], [.19, .03], [.17, .41], [.18, .44], [.15, .44], [.14, .35]], M.sage);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 2 * PI;
    rod(penPot, [Math.cos(a) * .07, .18, Math.sin(a) * .07], [Math.cos(a) * .21, .91 + i * .05, Math.sin(a) * .16], .022, i % 2 ? M.walnut : M.red);
  }
  // Mechanical weighing scale, cast enamel and a calibrated enamel dial with no numerals.
  const scale = group(props, ...layout.scale);
  scale.rotation.y = .20;
  round(scale, 0, .082, 0, 1.03, .164, .77, .095, M.ink);
  round(scale, 0, .167, 0, .99, .11, .73, .085, M.sage);
  const housing = lathe(scale, 0, .17, 0, [[.38, 0], [.39, .05], [.33, .26], [.27, .63], [.22, .68]], M.sage);
  housing.scale.z = .77;
  const dial = group(scale, 0, .53, .197);
  dial.rotation.x = -.15;
  const disk = cylinder(dial, 0, 0, .108, .355, .35, .10, M.brass, 64);
  disk.rotation.x = PI / 2;
  const c = canvas(384), g = c.getContext('2d');
  g.fillStyle = '#f1e6c9';
  g.fillRect(0, 0, 384, 384);
  g.translate(192, 192);
  g.strokeStyle = '#786a54';
  for (let i = 0; i <= 44; i++) {
    const a = -2.36 + i * 4.72 / 44;
    g.save();
    g.rotate(a);
    g.lineWidth = i % 4 === 0 ? 4 : 1.5;
    g.beginPath();
    g.moveTo(0, -154);
    g.lineTo(0, i % 4 === 0 ? -125 : -140);
    g.stroke();
    g.restore();
  }
  bird(g, 0, 63, 39, '#95815f');
  g.beginPath();
  g.arc(0, 0, 167, 0, 2 * PI);
  g.lineWidth = 1.6;
  g.stroke();
  const dg = new T.CircleGeometry(.324, 64);
  mesh(dial, dg, mat('#ffffff', .46, 0, texture(c)), 0, 0, .163);
  torus(dial, 0, 0, .169, .329, .012, M.gold);
  const needle = group(dial, 0, 0, .178);
  let ptr = poly(needle, [[-.013, -.062], [0, .274], [.013, -.062]], M.red, .005);
  sphere(dial, 0, 0, .193, .031, .031, .012, M.brass);
  const pan = group(scale, 0, .84, 0);
  cylinder(pan, 0, .068, 0, .091, .082, .18, M.brass);
  let tray = lathe(pan, 0, .14, 0, [[.05, 0], [.19, 0], [.47, .08], [.59, .16], [.61, .17], [.615, .19], [.595, .194], [.47, .103], [.18, .025], [.02, .025]], M.brass);
  tray.scale.set(1.1, 1, .78);
  // Soft open mail sack, with a shaped hem, visible dark inner canvas and a stitched badge.
  const bag = group(scene, ...layout.bag), N = 48, rows = 12, verts = [], uv = [], indices = [];
  const radius = [.34, .43, .50, .52, .51, .49, .46, .425, .416, .435, .455, .443];
  for (let j = 0; j < rows; j++)for (let i = 0; i <= N; i++) {
    const a = i / N * PI * 2;
    verts.push(Math.cos(a) * radius[j], j / (rows - 1) * 1.16, Math.sin(a) * radius[j] * .75);
    uv.push(i / N * 2, j / (rows - 1));
    if (j < rows - 1 && i < N) {
      let q = j * (N + 1) + i;
      indices.push(q, q + N + 1, q + 1, q + 1, q + N + 1, q + N + 2);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const cloth = M.cloth.clone();
  cloth.side = T.DoubleSide;
  const bagMesh = mesh(bag, geo, cloth);
  bagMesh.frustumCulled = false;
  const throat = lathe(bag, 0, .57, 0, [[.29, 0], [.38, .15], [.405, .49], [.417, .565]], mat('#72644c', .94, 0, weave));
  throat.material.side = T.DoubleSide;
  throat.scale.z = .74;
  cylinder(bag, 0, .58, 0, .31, .31, .015, M.dark).scale.z = .73;
  for (let i = 0; i < 3; i++) {
    const profile = [];
    for (let k = 0; k <= N; k++) {
      const a = k / N * 2 * PI;
      profile.push([Math.cos(a) * (.438 + .017 * Math.cos(8 * a)), 1.14 + i * .014 + .037 * Math.cos(3 * a + .7), Math.sin(a) * (.335 + .011 * Math.cos(8 * a))]);
    }
    line(bag, profile, .013, i === 1 ? M.binding : M.cloth);
  }
  const patch = group(bag, 0, .60, .373);
  const tag = round(patch, 0, 0, 0, .55, .032, .43, .07, M.wine);
  tag.rotation.x = PI / 2;
  badge(patch, 0, .01, .021, .174, M.wine, M.cream);
  for (let k = 0; k < 2; k++)for (let l = 0; l < 2; l++)sphere(patch, (k - .5) * .43, (l - .5) * .31, .021, .015, .015, .01, M.brass);
  line(bag, [[.29, 1.09, .25], [.43, 1.0, .25], [.46, .76, .32], [.37, .60, .38]], .021, M.binding);
  sphere(bag, .37, .60, .38, .040, .045, .037, M.binding);
  const bagLetters = [];
  for (let i = 0; i < 5; i++) {
    const e = letter(bag, (i - 2) * .056, .73 + i * .014, -.08 + i * .052, .59, .40, i);
    e.rotation.x = -1.30 + i * .055;
    e.rotation.z = (i - 2) * .14;
    bagLetters.push(e);
  }
  // Ruby lacquer handle is turned from a continuous lathe profile. The foot is wood, brass and rubber.
  const stamp = group(room);
  const shoe = group(stamp);
  round(shoe, 0, .025, 0, .70, .05, .53, .055, M.rubber);
  round(shoe, 0, .078, 0, .74, .073, .56, .054, M.walnut);
  round(shoe, 0, .137, 0, .72, .058, .54, .053, M.brass);
  round(shoe, 0, .174, 0, .68, .031, .50, .046, M.walnut);
  lathe(shoe, 0, .185, 0, [[.162, 0], [.172, .026], [.160, .06], [.126, .081], [.127, .149], [.109, .175]], M.brass);
  lathe(shoe, 0, .34, 0, [
    [.119, 0],
    [.130, .021],
    [.125, .063],
    [.105, .15],
    [.112, .231],
    [.147, .294],
    [.207, .336],
    [.247, .38],
    [.257, .437],
    [.245, .493],
    [.217, .533],
    [.15, .562],
    [.05, .575],
    [.001, .576]
  ], M.red);
  const ring = torus(shoe, 0, .38, 0, .126, .009, M.gold);
  ring.rotation.x = PI / 2;
  cylinder(shoe, 0, .915, 0, .076, .09, .014, M.gold);
  cylinder(shoe, 0, .925, 0, .056, .056, .01, M.wine);
  const dock = group(fixed, px + .37, desk + .11, pz - .69);
  dock.rotation.y = -.13;
  round(dock, 0, .095, 0, .86, .19, .59, .043, M.walnut);
  round(dock, 0, .197, 0, .83, .023, .57, .035, M.brass);
  round(dock, 0, .221, 0, .78, .025, .53, .033, M.leather);
  const active = letter(room, 0, 0, 0, 1.84, 1.15, 0), face = active.userData.face, faces = Craft.faces.map(c => texture(c));
  face.geometry = new T.PlaneGeometry(1.84 * .996, 1.15 * .996, 12, 4);
  const shell = active.children[0];
  shell.geometry = shell.geometry.clone();
  const inkCanvas = canvas(224);
  const ink = decal(active, -.18, .0175, .055, .52, .52, inkCanvas);
  ink.rotation.x = -PI / 2;
  ink.renderOrder = 3;
  ink.geometry = new T.PlaneGeometry(.52, .52, 6, 3);
  const layers = [shell, face, ink].map(obj => ({obj, rest: obj.geometry.attributes.position.array.slice()}));
  function flex(s) {
    for (const {obj, rest} of layers) {
      const p = obj.geometry.attributes.position, flat = obj !== shell;
      for (let k = 0; k < p.count; k++) {
        const x = rest[k * 3] + obj.position.x, u = Math.max(0, Math.min(5.999, (x / 1.84 + .5) * 6)), j = Math.floor(u), v = s.paperCurl[j].x * (1 - u + j) + s.paperCurl[j + 1].x * (u - j);
        if (flat) p.setZ(k, rest[k * 3 + 2] + v); else p.setY(k, rest[k * 3 + 1] + v);
      }
      p.needsUpdate = true;
      obj.geometry.computeVertexNormals();
    }
  }
  let lastIndex = -1, lastDensity = -1;
  const ref = {};
  function inkFace(s) {
    const index = Math.min(4, s.count), density = s.fibre.reduce((a, b) => a + b, 0) / 49;
    if (index !== lastIndex) {
      face.material.map = faces[index];
      face.material.needsUpdate = true;
    }
    if (Math.abs(lastDensity - density) > .004 || index !== lastIndex) {
      Craft.paintSeal(inkCanvas, index, s);
      ink.material.map.needsUpdate = true;
      lastDensity = density;
      lastIndex = index;
    }
  }
  const letterPos = new T.Vector3(...layout.sheet), bagPos = new T.Vector3(...layout.bag), scalePos = new T.Vector3(...layout.scale).add(new T.Vector3(0, 1.19, 0)), bikePos = new T.Vector3();
  function update(s) {
    inkFace(s);
    flex(s);
    const f = s.stampPhase === 'slide' ? s.paper.x : 0, feed = s.stampPhase === 'feed' ? s.paper.x : 0;
    active.position.copy(letterPos);
    active.rotation.set(0, -.13, 0);
    if (f) {
      active.position.lerp(bagPos.clone().add(new T.Vector3(0, .77, 0)), f);
      active.position.y += Math.sin(PI * f) * .86;
      active.rotation.z = f * .37;
      active.rotation.x = -1.3 * f;
      active.scale.setScalar(1 - f * .58);
    } else {
      active.position.lerp(new T.Vector3(...layout.stack).add(new T.Vector3(0, .32, 0)), feed);
      active.scale.setScalar(1 - feed * .36);
      active.rotation.z = .10 * feed;
    }
    active.visible = s.stage === 'stamp' && !(s.count >= 5 && s.stampPhase === 'feed');
    active.rotation.x += s.paperCurl[0].x * .9;
    active.rotation.z += s.paperCurl[6].x * .55;
    stamp.position.copy(letterPos);
    const k = Math.min(1, Math.max(0, s.stampY.x / .26));
    stamp.position.x += -.18 + k * .55;
    stamp.position.z += .055 - k * .745;
    stamp.position.y += .019 + Math.max(-.006, s.stampY.x);
    stamp.rotation.set(s.stampTilt.x * .25, -.13, -s.stampTilt.x * .74);
    bikePos.set(s.bikeX - .69 * Math.cos(s.bikeYaw.x), 1.03, -5.65 + .69 * Math.sin(s.bikeYaw.x));
    bag.position.copy(bagPos).lerp(scalePos, s.transfer.x);
    bag.position.y += Math.sin(s.transfer.x * PI) * .96;
    bag.position.lerp(bikePos, s.loadTrip.x);
    bag.position.y += Math.sin(s.loadTrip.x * PI) * 1.48 + s.axles[0].x * s.loadTrip.x;
    bag.rotation.z = .13 * Math.sin(s.transfer.x * PI) - .14 * Math.sin(s.loadTrip.x * PI);
    bag.scale.setScalar(1 - .32 * s.loadTrip.x);
    const p = geo.attributes.position;
    for (let j = 0; j < rows; j++)for (let i = 0; i <= N; i++) {
      const a = i / N * PI * 2, q = j / (rows - 1), fold = .016 * Math.cos(a * 8 + .46 * Math.sin(q * 5)) + .014 * Math.sin(5 * a + q * 1.3), f = s.bag[Math.floor(i / N * 16) % 16].x * Math.sin(q * PI);
      const r = radius[j] + fold + f;
      p.setXYZ(j * (N + 1) + i, Math.cos(a) * r + .032 * q * q, 1.16 * q + .037 * Math.cos(3 * a + .7) * q * q + f * .11, Math.sin(a) * r * .75);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
    patch.position.z = .369 + s.bag[4].x * .72;
    bagLetters.forEach((e, i) => {
      const taken = i < 5 - s.bagLoad && s.count === 5 && s.loadTrip.x > .5;
      e.visible = i < s.count && !taken;
      e.position.y = .86 + i * .035 + .066 * s.bagLoad / 5;
    });
    needle.rotation.z = .92 - s.needle.x;
    pan.position.y = .84 - s.pan.x;
    pile.rotation.z = s.wobbleObject === 'pile' ? s.wobble.x * .3 : 0;
    bag.rotation.z += (s.wobbleObject === 'bag' ? s.wobble.x : 0) * .37;
    scale.rotation.z = s.wobbleObject === 'scale' ? s.wobble.x * .30 : 0;
    pad.rotation.z = s.wobbleObject === 'pad' ? s.wobble.x * .34 : 0;
    stamp.rotation.z += s.wobbleObject === 'stamp' ? s.wobble.x * .40 : 0;
    ref.letter = active;
    ref.bag = bag;
    ref.pile = pile;
    ref.scale = scale;
    ref.stamp = stamp;
    ref.pad = pad;
  }
  batch(fixed);
  batch(shoe);
  batch(pad);
  batch(penPot);
  return {room, bag, ref, layout, update, active, stamp, scale, pan, desk};
}
