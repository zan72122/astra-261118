'use strict';
(() => {
  const T = THREE, sim = PostSim.create(), sound = postalAudio(), s = sim.state;
  const renderer = new T.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.17;
  document.querySelector('#world').appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color('#cfdfda');
  scene.fog = new T.FogExp2('#c6d8ce', .016);
  const sky = Craft.canvas(512, 256), ctx = sky.getContext('2d'), grad = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [pos, c] of [[0, '#91b6c2'], [.36, '#c3d9dc'], [.53, '#fae9c7'], [.60, '#9aa58c'], [1, '#80684d']]) grad.addColorStop(pos, c);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  const skyTex = Craft.texture(sky);
  skyTex.mapping = T.EquirectangularReflectionMapping;
  scene.background = skyTex;
  scene.environment = skyTex;
  const ambient = new T.HemisphereLight(0xe3f2ff, 0xcfac90, 1.65), sun = new T.DirectionalLight(0xffe3b5, 2.83);
  scene.add(ambient, sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -6.8, right: 6.8, top: 7.3, bottom: -7.3, near: .25, far: 37});
  sun.shadow.normalBias = .012;
  sun.shadow.bias = -.00018;
  sun.shadow.radius = 2;
  const camera = new T.PerspectiveCamera(32, 1, .06, 168), town = buildTown(scene), officeCache = {};
  let office, narrow;
  const dust = new T.InstancedMesh(new T.SphereGeometry(1, 5, 4), Craft.mat('#e6d6ac', .88), s.motes.length), dummy = new T.Object3D();
  dust.frustumCulled = false;
  scene.add(dust);
  // The guide is a thin warm reflection that sits directly on the active object.
  const guide = Craft.group(scene), arcMat = Craft.mat('#e2bc73', .32, .46);
  arcMat.transparent = true;
  arcMat.opacity = .71;
  arcMat.emissive.setHex(0xb47531);
  arcMat.emissiveIntensity = .12;
  for (let i = 0; i < 4; i++) {
    const arc = Craft.mesh(guide, new T.TorusGeometry(.252, .007, 6, 18, .52), arcMat);
    arc.rotation.z = i * Math.PI / 2 + .18;
  }
  guide.rotation.x = -Math.PI / 2;
  const rig = {eye: new T.Vector3(), look: new T.Vector3(), eyeV: new T.Vector3(), lookV: new T.Vector3()}, goalEye = new T.Vector3(), goalLook = new T.Vector3();
  const activePoint = new T.Vector3();
  const frameTarget = new T.WebGLRenderTarget(1, 1, {type: T.HalfFloatType, depthBuffer: true, samples: Math.min(2, renderer.capabilities.maxSamples)});
  const postScene = new T.Scene(), flat = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), post = new T.ShaderMaterial({
    uniforms: {image: {value: frameTarget.texture}, pixel: {value: new T.Vector2()}},
    vertexShader: 'varying vec2 pos;void main(){pos=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform sampler2D image;uniform vec2 pixel;varying vec2 pos;
vec3 hi(vec2 uv){vec3 c=texture2D(image,uv).rgb;return c*smoothstep(1.1,2.7,dot(c,vec3(.23,.65,.12)));}
void main(){vec2 d=pixel*4.;vec3 c=texture2D(image,pos).rgb;c+=.012*(hi(pos+d)+hi(pos-d)+hi(pos+vec2(d.x,-d.y))+hi(pos+vec2(-d.x,d.y)));vec2 v=pos-vec2(.51,.49);c*=1.-.115*dot(v,v);gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);gl_FragColor.rgb+=(grain-.5)*.009;}`,
    depthTest: false,
    depthWrite: false
  });
  postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), post));
  const inOffice = () => ['stamp', 'weigh', 'weighing', 'load', 'loading'].includes(s.stage);
  function chooseCamera() {
    const deskEye = narrow ? [1.23, 6.05, 10.13] : [2.45, 4.89, 7.02], deskLook = narrow ? [.02, 1.76, -.30] : [0, 1.72, -.28];
    goalEye.set(...deskEye);
    goalLook.set(...deskLook);
    if (s.stage === 'weighing' || s.stage === 'load' || s.stage === 'loading') {
      const a = office.layout.scale, amt = s.transfer.x * (1 - s.loadTrip.x);
      goalEye.x += a[0] * .58 * amt;
      goalEye.y += .12 * amt;
      goalLook.x += a[0] * .69 * amt;
      goalLook.y += .16 * amt;
    }
    if ((!inOffice() && s.stage !== 'landing') || s.stage === 'loading') {
      let px = s.bikeX, py = 1.10, pz = -6.06, dx = narrow ? 2.52 : 3.20, dy = narrow ? 3.03 : 2.05, dz = narrow ? 6.83 : 4.85;
      if (s.stage === 'harbor') {
        px = 24.80;
        py = .68;
        pz = s.boatZ + .22;
        dx = narrow ? 4.39 : 3.55;
        dy = narrow ? 3.40 : 2.36;
        dz = narrow ? 6.75 : 5.1;
      }
      if (s.stage === 'bridge') {
        px = narrow ? 22.70 : 23.55;
        py = 1.52;
        pz = narrow ? -5.65 : -6.18;
        dx = narrow ? 1.80 : 2.80;
        dy = 3.0;
        dz = narrow ? 11.8 : 7.75;
      }
      if (s.stage === 'deliver' || s.stage === 'receiving') {
        px = s.bikeX + .39;
        py = 1.42;
        pz = -7.98;
        dx = narrow ? 2.11 : 1.77;
        dy = 1.3;
        dz = narrow ? 7.57 : 4.23;
      }
      if (['fold', 'creasing', 'launch'].includes(s.stage)) {
        px = s.plane.x;
        py = 1.60;
        pz = -7.63;
        dx = 1.30;
        dy = 1.74;
        dz = narrow ? 4.55 : 3.16;
      }
      if (s.stage === 'flight') {
        px = s.plane.x;
        py = s.plane.y - .15;
        pz = s.plane.z;
        dx = 2.14;
        dy = 1.44;
        dz = narrow ? 7.2 : 5.6;
      }
      const f = s.stage === 'loading' ? Math.min(1, s.loadTrip.x * 1.07) : 1;
      goalEye.lerp(new T.Vector3(px + dx, py + dy, pz + dz), f);
      goalLook.lerp(new T.Vector3(px, py, pz), f);
      if (s.stage === 'flight' && s.plane.x < 7) {
        const t = Math.min(1, (7 - s.plane.x) / 6.5);
        goalEye.lerp(new T.Vector3(...deskEye), t);
        goalLook.lerp(new T.Vector3(...deskLook), t);
      }
    }
  }
  function resize() {
    const w = innerWidth, h = innerHeight;
    const vertical = w / h < .80;
    if (narrow !== vertical) {
      narrow = vertical;
      if (office) {
        office.room.visible = false;
        office.bag.visible = false;
      }
      office = officeCache[String(narrow)] || (officeCache[String(narrow)] = buildOffice(scene, narrow));
      office.room.visible = office.bag.visible = true;
      office.update(s);
    }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    const size = renderer.getDrawingBufferSize(new T.Vector2());
    frameTarget.setSize(size.x, size.y);
    post.uniforms.pixel.value.set(1 / size.x, 1 / size.y);
    chooseCamera();
    rig.eye.copy(goalEye);
    rig.look.copy(goalLook);
    rig.eyeV.set(0, 0, 0);
    rig.lookV.set(0, 0, 0);
    camera.position.copy(rig.eye);
    camera.lookAt(rig.look);
    camera.updateMatrixWorld();
  }
  resize();
  window.addEventListener('resize', resize);
  const icon = (id) => '<svg viewBox="0 0 24 24"><use href="#' + id + '"/></svg>';
  const route = document.querySelector('#journey'), collection = document.querySelector('#collection');
  route.innerHTML = ['env', 'scale', 'cycle', 'home'].map((id, i) => (i ? '<i></i>' : '') + '<span class="station">' + icon(id) + '</span>').join('');
  collection.innerHTML = ['flower', 'leaf', 'bird', 'sun', 'shell'].map(id => '<span class="mark">' + icon(id) + '</span>').join('');
  const hnode = document.querySelector('#hand'), soundButton = document.querySelector('#sound');
  soundButton.addEventListener('click', () => {
    const enabled = sound.toggle();
    s.muted = !enabled;
    soundButton.classList.toggle('off', !enabled);
    soundButton.setAttribute('aria-pressed', String(enabled));
    if (enabled) sound.play('bell', .7);
  });
  let uiKey = '';
  function hud() {
    let station = s.stage === 'stamp' ? 0 : ['weigh', 'weighing', 'load'].includes(s.stage) ? 1 : ['loading', 'ride', 'bridge'].includes(s.stage) ? 2 : 3;
    if (s.house > 0 && s.stage === 'ride')station = 3;
    let key = station + ',' + s.count + ',' + s.stage;
    if (key === uiKey) return;
    uiKey = key;
    route.querySelectorAll('.station').forEach((el, i) => el.className = 'station ' + (i === station ? 'now' : i < station ? 'past' : ''));
    Array.from(collection.children).forEach((el, i) => el.className = 'mark ' + (i < s.count ? 'full' : i === s.count ? 'current' : ''));
    collection.style.display = inOffice() ? 'flex' : 'none';
  }
  function hero() {
    const id = sim.target();
    switch (id) {
      case 'letter':
        activePoint.set(-.18, .024, .055);
        office.active.localToWorld(activePoint);
        break;
      case 'bag':
        activePoint.set(0, .98, .08);
        office.bag.localToWorld(activePoint);
        break;
      case 'bike':
        activePoint.set(.10, .68, .09);
        town.bike.localToWorld(activePoint);
        break;
      case 'crank':
        activePoint.set(.33, 0, .14);
        town.crank.localToWorld(activePoint);
        break;
      case 'box':
        activePoint.copy(town.mailPos[s.house]);
        break;
      case 'boat':
        activePoint.set(0, .72, 0);
        town.boat.localToWorld(activePoint);
        break;
      case 'wingL':
      case 'wingR':
        activePoint.set(.05, .016, id === 'wingL' ? -.24 : .24);
        town.plane.localToWorld(activePoint);
        break;
      case 'plane':
        activePoint.copy(town.plane.position);
        break;
    }
    return id;
  }
  function guides() {
    const id = hero();
    guide.visible = !!id;
    if (!id) {
      hnode.style.opacity = '0';
      return;
    }
    guide.position.copy(activePoint);
    const flat = ['letter', 'bag', 'plane', 'wingL', 'wingR', 'boat'].includes(id);
    guide.rotation.set(flat ? -Math.PI / 2 : 0, 0, Math.sin(s.air.x) * .17);
    guide.scale.setScalar(id === 'letter' ? 1.06 : id === 'bag' ? 1.38 : .79);
    arcMat.opacity = .37 + .25 * Math.min(1, s.idle / 4) + s.air.x * .18;
    if (s.hint > 0) {
      const point = activePoint.clone().project(camera);
      const reach = s.finger.reach.x, press = s.finger.pad.x;
      const sweep = id === 'bike' || id === 'boat' ? 13 : id === 'wingL' ? 11 : id === 'wingR' ? -11 : 0;
      const x = (point.x * .5 + .5) * innerWidth + 10 - 16 * reach + sweep * press;
      const y = (.5 - point.y * .5) * innerHeight + 14 - 20 * reach;
      hnode.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) rotate(' + (-19 + (id === 'crank' ? 26 : 4) * press) + 'deg) scale(' + (1.02 - .095 * press) + ')';
      hnode.style.opacity = String(s.hint * (.32 + .55 * reach));
    } else hnode.style.opacity = '0';
  }
  function lightPose() {
    const t = s.stage === 'loading' ? s.loadTrip.x : inOffice() ? 0 : 1;
    let x = s.bikeX * t, z = -5.9 * t;
    if (s.stage === 'flight') {
      x = s.plane.x;
      z = s.plane.z;
    }
    sun.position.set(x - 4.7, 8.8, z - 4.9);
    sun.target.position.set(x, 1, z + .43);
    sun.intensity = 2.84 * s.light.x;
  }
  function sync() {
    office.update(s);
    town.update(s);
    office.room.visible = inOffice() && (s.stage !== 'loading' || s.loadTrip.x < .72) || s.stage === 'flight' && s.plane.x < 6.5 || s.stage === 'landing';
    office.bag.visible = true;
    dust.visible = office.room.visible;
    for (let i = 0; i < s.motes.length; i++) {
      const m = s.motes[i];
      dummy.position.set(m.x, m.y, m.z);
      dummy.scale.setScalar(.0034 * m.mass);
      dummy.updateMatrix();
      dust.setMatrixAt(i, dummy.matrix);
    }
    dust.instanceMatrix.needsUpdate = true;
    lightPose();
    camera.position.copy(rig.eye);
    camera.lookAt(rig.look);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld();
    hud();
    guides();
  }
  function cameraStep(dt) {
    chooseCamera();
    const n = Math.ceil(dt * 100), h = dt / n;
    for (let i = 0; i < n; i++) {
      for (const [p, v, target] of [[rig.eye, rig.eyeV, goalEye], [rig.look, rig.lookV, goalLook]])for (const key of ['x', 'y', 'z']) {
        v[key] += ((target[key] - p[key]) * 23 - 9.3 * v[key]) * h;
        p[key] += v[key] * h;
      }
    }
  }
  function advance(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    sim.step(dt);
    cameraStep(dt);
    for (const e of sim.events.splice(0)) sound.play(e.name, e.p);
  }
  // Probe the modeled surroundings locally for PBR reflections on metal, window glass and wet stone.
  lightPose();
  town.update(s);
  office.update(s);
  scene.updateMatrixWorld();
  const pmrem = new T.PMREMGenerator(renderer);
  const reflections = [];
  for (const point of [[.1, 2.60, .38], [12, 1.55, -5.63]]) {
    const cube = new T.WebGLCubeRenderTarget(64, {type: T.HalfFloatType}), probe = new T.CubeCamera(.12, 110, cube);
    probe.position.set(...point);
    probe.update(renderer, scene);
    reflections.push(pmrem.fromCubemap(cube.texture));
    cube.dispose();
  }
  pmrem.dispose();
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let pointer = null, startTime = 0, source = '', nativeForce = false;
  function hits(evt) {
    ndc.set(evt.clientX / innerWidth * 2 - 1, 1 - evt.clientY / innerHeight * 2);
    ray.setFromCamera(ndc, camera);
    const pairs = [];
    if (office.room.visible) {
      pairs.push(['letter', office.active], ['stamp', office.stamp], ['bag', office.bag], ['scale', office.scale], ['pile', office.ref.pile], ['pad', office.ref.pad]);
    } else {
      pairs.push(['bike', town.bike], ['box', town.boxes[s.house]], ['crank', town.crank], ['boat', town.boat]);
      if (town.plane.visible) {
        if (s.stage === 'fold') pairs.push(['wingL', town.wings[0]], ['wingR', town.wings[1]]); else pairs.push(['plane', town.plane]);
      }
      if (office.bag.visible) pairs.push(['bike', office.bag]);
    }
    let best = null, dist = Infinity;
    for (const [name, obj] of pairs) {
      if (!obj || !obj.visible)continue;
      const a = ray.intersectObject(obj, true).filter(hit => {
        let o = hit.object;
        while (o && o !== obj) {
          if (!o.visible) return false;
          o = o.parent;
        }
        return true;
      });
      if (a.length && a[0].distance < dist) {
        dist = a[0].distance;
        best = name;
      }
    }
    if (best === 'stamp' && sim.target() === 'letter')best = 'letter';
    if (best !== sim.target() && sim.target()) {
      const id = hero(), p = activePoint.clone().project(camera);
      const dx = (p.x * .5 + .5) * innerWidth - evt.clientX, dy = (.5 - p.y * .5) * innerHeight - evt.clientY;
      if (dx * dx + dy * dy < 23 * 23)best = id;
    }
    return best;
  }
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', e => {
    if (pointer !== null || !e.isPrimary) return;
    const id = hits(e);
    if (!id) return;
    e.preventDefault();
    sound.start();
    pointer = e.pointerId;
    source = e.pointerType;
    nativeForce = source !== 'mouse' && e.pressure > 0 && e.pressure !== .5;
    startTime = performance.now();
    canvas.setPointerCapture(pointer);
    const p = source === 'mouse' ? .38 : e.pressure && e.pressure !== .5 ? e.pressure : .30;
    sim.down(id, p);
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId === pointer && source !== 'mouse' && e.pressure > 0 && e.pressure !== .5) {
      nativeForce = true;
      sim.pressure(e.pressure);
    } else if (e.pointerType === 'mouse' && pointer === null) canvas.style.cursor = hits(e) === sim.target() && sim.target() ? 'pointer' : 'default';
  });
  function release(e) {
    if (pointer !== null && (!e || e.pointerId === pointer)) {
      pointer = null;
      sim.up();
    }
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', () => release());
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.07, Math.max(0, (now - last) / 1000));
    last = now;
    if (pointer !== null && s.held && !nativeForce) sim.pressure(Math.min(.87, .38 + (now - startTime) / 1700));
    advance(dt);
    sync();
    scene.environment = reflections[inOffice() ? 0 : 1].texture;
    renderer.setRenderTarget(frameTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, flat);
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    last = performance.now();
    if (document.hidden)release();
  });
  window.__GAME__ = {step: advance, getState: sim.getState};
  sync();
  requestAnimationFrame(frame);
})();
