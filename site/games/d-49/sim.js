// Metres, seconds and kilograms. The renderer reads these states without advancing them.
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, H = 1 / 240, K = 1800, ZETA = .18;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  function randomStream(seed) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  function create(seed = 7143) {
    const rand = randomStream(seed);
    const series = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
    let carry = 0, eventId = 0, cycleJumps = 0, returnTime = 0, waterPulse = 0, heatPulse = 0, lampPulse = 0;
    let gardenOpen = false, travelled = 0;
    let queued = false, liftPending = false, sinceLaunch = 100, stageFlights = 0, lastPressure = .16;
    const s = {
      time: 0, stage: 0, cycle: 0, stageAge: 0, pressed: '', idle: 0, jumps: 0, peak: 0,
      compression: 0, springV: 0, height: 0, velocity: 0, airborne: false, targetHeight: 1.2,
      contactX: 0, contactZ: 0, cameraLift: 0, cameraV: 0, view: 0, viewV: 0,
      dusk: 0, duskV: 0, charge: 0, event: { id: 0, kind: '' },
      mat: series(24, () => ({ depth: 0, v: 0 })),
      wind: series(12, () => ({ speed: .14 + rand() * .3, gust: .18 + rand() * .4, life: rand() * 2 })),
      stems: series(48, () => ({ angle: rand() * .04, v: 0, stiffness: 9 + rand() * 10 })),
      motes: series(42, () => ({ x: rand() * 12 - 6, y: .15 + rand() * 3.1, z: rand() * 8 - 5, vx: 0, vy: 0, vz: 0, lift: rand() * .10 })),
      pump: .035, flow: .025, wet: 0, cells: [0,0,0], boatX: 0, boatV: 0, boatHeel: 0, heelV: 0, wheel: 0, wheelV: .1,
      water: series(16, () => ({ level: 0, v: 0 })),
      envelope: series(12, () => ({ heat: .14 + rand() * .08 })),
      balloonX: 0, driftV: 0, balloonY: 0, balloonV: 0, tether: 0, tetherV: 0, basket: 0, basketV: 0,
      lamps: series(18, i => ({ warmth: 0, filament: 0, capacity: .8 + (i % 5) * .12 })),
      hand: { phase: 0, visibility: 0, wait: 4, running: false, turn: 0 }, focus: -1
    };
    function event(kind, strength) { s.event = { id: ++eventId, kind, strength }; }
    function advance(stage) { if(stage===1)gardenOpen=true; if(stage===2){travelled=0;gardenOpen=false;} s.stage = stage; s.stageAge = 0; stageFlights = 0; event('discover', stage); }
    function launch() {
      liftPending = false;
      if (sinceLaunch > 12) s.charge *= .48;
      s.targetHeight = Math.min(2.8, 1.2 + s.charge * .16);
      s.charge = Math.min(10, s.charge + 1);
      // A child's continuing push adds work to the energy released by the preloaded bed.
      const mass = .62, stored = K * lastPressure * lastPressure / 2;
      const work = Math.max(0, mass * 9.81 * (s.targetHeight - s.height) - stored * .12);
      s.velocity = Math.sqrt(2 * (work + stored * .12) / mass);
      s.peak = 0; s.airborne = true; s.jumps++; cycleJumps++; stageFlights++; sinceLaunch = 0;
      if (s.stage === 1) waterPulse += .5 + lastPressure * 1.8;
      if (s.stage === 2) heatPulse += .25 + lastPressure;
      if (s.stage === 3) lampPulse = Math.min(2, lampPulse + .54);
      event('launch', s.targetHeight);
    }
    function press(x = 0, z = 0, target = 'mat', index = 0) {
      if (s.pressed) return false;
      if (target !== 'mat' && target !== ['','water','balloon','lamp'][s.stage]) return false;
      s.pressed = target; s.idle = 0; s.hand.running = false; s.hand.wait = 4;
      s.contactX = clamp(x,-1,1); s.contactZ = clamp(z,-1,1); s.focus = index;
      if (target === 'water') waterPulse += .54;
      if (target === 'balloon') heatPulse += .25;
      if (target === 'lamp') lampPulse = Math.min(2, lampPulse + .28);
      event('touch', target === 'mat' ? .5 : 1); return true;
    }
    function release() {
      if (!s.pressed) return;
      if (s.pressed === 'mat') {
        lastPressure = Math.max(.035, s.compression);
        if (s.airborne) queued = true;
        else liftPending = true;
      }
      s.idle = 0; s.pressed = ''; s.focus = -1;
    }
    // 風は区画の境界から少しずつ隣へ伝わる。吹き終わった区画は抵抗で減速する。
    // 花は株元に固定した曲げばね、花粉は浮力・風・抗力の釣り合いで静まる粒子。
    function windAndGarden(dt) {
      s.wind.forEach((w, i) => {
        w.life -= dt;
        if (w.life <= 0) { w.gust = -.24 + rand() * 1.05; w.life = .65 + rand() * 3; }
        w.speed += (w.gust + .18 * s.wind[(i+11)%12].speed - 1.18*w.speed) * dt * .9;
      });
      s.stems.forEach((p,i) => {
        const breeze = s.wind[(i*7)%12].speed;
        p.v += (breeze * (1+i%3*.22) - p.angle * p.stiffness - p.v * 2.4) * dt;
        p.angle += p.v * dt;
      });
      s.motes.forEach((p,i) => {
        p.vx += (s.wind[i%12].speed * .25 - p.x*.014 - p.vx) * dt;
        p.vy += (p.lift + .018*s.wind[(i+4)%12].speed - .048*p.y - p.vy*.64) * dt;
        p.vz += ((s.wind[(i+2)%12].speed-.25)*.075 - p.z*.011 - p.vz*.8) * dt;
        p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt;
      });
    }
    // 布の縁を固定し、各扇形を隣の扇形と連結する。押した側ほど荷重を受ける。
    // 離床と接地で球と布の運動を分離・再結合し、着地の力は布の速度に引き継ぐ。
    function springAndFlight(dt) {
      const loading = s.pressed === 'mat' && !s.airborne;
      const rest = loading ? .22 : 0, mass = 15;
      const damping = loading ? .82 : ZETA;
      s.springV += (K*(rest-s.compression) - 2*damping*Math.sqrt(K*mass)*s.springV)/mass*dt;
      s.compression += s.springV*dt;
      if (s.compression>.22) { s.compression=.22; s.springV=Math.min(0,s.springV); }
      if (Math.abs(s.compression)<.00001 && Math.abs(s.springV)<.0001 && !loading) { s.compression=0; s.springV=0; }
      s.mat.forEach((m,i) => {
        const a=i/24*TAU, previous=s.mat[(i+23)%24], next=s.mat[(i+1)%24];
        const weight=.54+.19*(s.contactX*Math.cos(a)+s.contactZ*Math.sin(a))+.022*Math.cos(a*3+.6);
        m.v += ((s.compression*weight-m.depth)*205 + (previous.depth+next.depth-2*m.depth)*43 - m.v*8.2)*dt;
        m.depth += m.v*dt;
      });
      // Contact lasts until the rising bed reaches its neutral plane. The flight
      // starts at the exact bed height, including when a queued touch follows a landing.
      if (!s.airborne) s.height=-s.compression;
      if (liftPending && !loading && s.compression<=.0001) launch();
      if (s.airborne) {
        // Change the clock of the flight near zero vertical speed. This preserves its ballistic apex.
        const hang = s.stage === 3 ? .10 : .25;
        const st = dt*(hang+(1-hang)*Math.min(1,Math.abs(s.velocity)/2.3)**1.45);
        s.height += s.velocity*st - .5*9.81*st*st; s.velocity-=9.81*st;
        s.peak=Math.max(s.peak,s.height);
        if (s.height<=-s.compression && s.velocity<0) {
          s.springV += Math.min(1.36,-s.velocity*.15); s.height=-s.compression; s.velocity=0; s.airborne=false;
          event('land',s.peak); if (queued) { queued=false; liftPending=true; lastPressure=.10; }
        }
      }
      const target=Math.max(0,s.height)*.70;
      s.cameraV+=((target-s.cameraLift)*27-s.cameraV*9)*dt; s.cameraLift+=s.cameraV*dt;
    }
    // 吐水を止めても導管内の水は流れ続ける。水車は残水のトルクと軸摩擦で減速。
    // 最終槽に水が届くと舟が浮き、排水して船底が接すると抵抗が増す。
    function waterworks(dt) {
      const tap = s.pressed==='water' ? .55 : 0;
      s.pump += (.035 + waterPulse + tap - s.pump)*dt*1.8;
      waterPulse *= Math.exp(-dt*.70);
      s.flow += (s.pump-s.flow)*dt*2.4;
      // Three linked cisterns. The first spills at the lip, then the second feeds
      // the boat channel. Water below a lip stays there until the return drain opens.
      let inlet = gardenOpen ? s.flow*.142 : 0;
      for(let i=0;i<s.cells.length;i++){
        const spill=Math.max(0,s.cells[i]-.57)*(.52+i*.15);
        const drain=gardenOpen?.0015:s.cells[i]*.19;
        s.cells[i]=clamp(s.cells[i]+(inlet-spill-drain)*dt,0,1.6);
        inlet=spill;
      }
      s.wet=s.cells[2];
      const afloat=s.cells[2]>.12;
      const push=afloat ? (s.flow*.20+s.wind[1].speed*.035)*(1-s.boatX) : -s.boatX*.36;
      s.boatV+=(push-s.boatV*(afloat?.87:2.6))*dt;
      s.boatX=clamp(s.boatX+s.boatV*dt,0,1);
      s.heelV+=((afloat?s.wind[3].speed*.14+s.water[4].v*.75:0)-s.boatHeel*4-s.heelV*.86)*dt;
      s.boatHeel+=s.heelV*dt;
      s.wheelV += (s.flow*3.5 - s.wheelV*.74 - .025)*dt;
      s.wheelV=Math.max(0,s.wheelV); s.wheel+=s.wheelV*dt;
      // Wheel paddles striking the runnel create impulses; ripples reflect at each bank.
      s.water.forEach((p,i) => {
        const a=s.water[Math.max(0,i-1)].level,b=s.water[Math.min(15,i+1)].level;
        const force=i===2 ? s.flow*(.3+Math.sin(s.wheel*10)*.62) : s.wind[i%12].speed*.0012;
        p.v+=((a+b-2*p.level)*65-p.level*12-p.v*2.8+force)*dt; p.level+=p.v*dt;
      });
    }
    // 加熱源から離れた布は隣に熱を渡し、風に冷やされる。浮力と係留索の張力が
    // 釣り合うと上昇が止まる。吊り籠には索の動きが遅れて届く。
    // 窓ごとの熱容量と通電しきい値で順次点灯し、熱源を切った後も余熱が残る。
    function balloonAndTown(dt) {
      const heater=.16+Math.min(2,heatPulse)+(s.pressed==='balloon'?.62:0);
      heatPulse*=Math.exp(-dt*.20);
      let mean=0;
      s.envelope.forEach((p,i) => {
        const adjacent=s.envelope[(i+1)%12].heat;
        const local=heater+(s.pressed==='balloon'?.16*s.contactX*Math.cos(i*TAU/12):0);
        p.heat+=((local-p.heat)*(.41+i%4*.024)+(adjacent-p.heat)*.3-s.wind[i].speed*.014)*dt;
        mean+=p.heat/12;
      });
      s.balloonV+=((mean-.15)*2.32-s.balloonY*.65-Math.max(0,s.balloonY-3)*1.6-s.balloonV*.86)*dt;
      s.balloonY+=s.balloonV*dt;
      // Warm air releases the aerostat from the shelter of the hedge. Dragging its
      // envelope changes the crosswind. A mooring line pulls it back on cooling.
      const free=s.stage===2 && mean>.30;
      const drift=free ? s.wind[8].speed*.14+.12+Math.max(-.16,s.pressed==='balloon'?s.contactX*.32:0) : 0;
      s.driftV+=(drift-s.balloonX*(free?.052:.26)-s.driftV*.91)*dt;
      s.balloonX+=s.driftV*dt;
      if(free)travelled+=Math.max(0,mean-.18)*dt;
      s.tetherV+=(s.wind[7].speed*.17+(s.pressed==='balloon'?s.contactX*.35:0)-s.tether*.78-s.tetherV*.63)*dt;
      s.tether+=s.tetherV*dt;
      s.basketV+=(-s.tetherV*.66-s.basket*6-s.basketV*.97)*dt; s.basket+=s.basketV*dt;
      const evening = s.stage===3 && !returnTime ? 1 : 0;
      s.duskV+=((evening-s.dusk)*.65-s.duskV*1.62)*dt; s.dusk+=s.duskV*dt;
      lampPulse*=Math.exp(-dt*.32);
      s.lamps.forEach((p,i) => {
        const prev=i?s.lamps[i-1].warmth:0;
        const feed = s.stage===3 && !returnTime ? (i===0 ? lampPulse+(s.airborne?.32:0) : Math.max(0,prev-.20)*1.54) : 0;
        const local=s.pressed==='lamp' && s.focus===i ? .72 : 0;
        p.warmth=clamp(p.warmth+(feed+local-p.warmth*.59)*dt/(p.capacity*3.3),0,1);
        p.filament+=(clamp((p.warmth-.13)*1.55,0,1)-p.filament)*dt*(1.65+i%3*.13);
      });
      if (s.stage===0 && cycleJumps>=3 && s.peak>1.43) advance(1);
      else if (s.stage===1 && s.wet>.61 && stageFlights>=2 && s.stageAge>12) advance(2);
      else if (s.stage===2 && s.balloonY>1.50 && travelled>22 && stageFlights>=4) advance(3);
      else if (s.stage===3 && s.lamps[17].filament>.78 && stageFlights>=3 && !returnTime) returnTime=6;
      if (returnTime) {
        returnTime=Math.max(0,returnTime-dt);
        if (!returnTime) { advance(0); s.cycle++; gardenOpen=false; cycleJumps=0; s.charge=0; }
      }
      const targetView=s.stage===1?.28:s.stage===2?.65:s.stage===3?1:0;
      s.viewV+=((targetView-s.view)*1.8-s.viewV*2.6)*dt;
      s.view+=s.viewV*dt;
    }
    function tick(dt) {
      s.time+=dt; s.stageAge+=dt; sinceLaunch+=dt;
      windAndGarden(dt); springAndFlight(dt); waterworks(dt); balloonAndTown(dt);
      if (!s.pressed) s.idle+=dt;
      const hand=s.hand;
      if (s.pressed || s.airborne) { hand.running=false; hand.wait=4; }
      else if (!hand.running && (hand.wait-=dt)<=0) { hand.phase=0; hand.turn++; hand.running=true; }
      if (hand.running && (hand.phase+=dt)>2.25) { hand.running=false; hand.wait=3.4; }
      const visible=hand.running ? Math.min(1,hand.phase*5,(2.25-hand.phase)*4) : 0;
      hand.visibility+=(Math.max(0,visible)-hand.visibility)*dt*11;
    }
    return { state:s, press, release, move(x,z) { if(s.pressed){s.contactX=clamp(x,-1,1);s.contactZ=clamp(z,-1,1);} },
      step(dt) { if(!Number.isFinite(dt)||dt<=0)return; carry+=dt; while(carry>=H-1e-10){tick(H);carry-=H;} },
      getState() { return JSON.parse(JSON.stringify(s)); }
    };
  }
  const api={create};
  if (typeof module!=='undefined' && module.exports) module.exports=api; else root.GardenSimulation=api;
})(typeof window==='undefined'?globalThis:window);
