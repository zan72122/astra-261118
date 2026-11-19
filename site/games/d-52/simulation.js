/* Fixed local mechanics. Angles in radians, lengths in metres, time in seconds. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Fairground = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const TAU = 2 * Math.PI, SPEED = TAU / 75, N = 12, PITCH = TAU / N, R = 14.5;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const q = clamp((x-a)/(b-a),0,1); return q*q*(3-2*q); };
  function create(options = {}) {
    let seed = options.seed || 63021;
    function random() { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; }
    let turn = options.angle || 0, omega = 0, brake = null, held = false, finger = 0, idle = 0;
    let elapsed = 0, trip = Math.floor(turn/TAU), phase = turn%TAU, height = R*(1-Math.cos(turn));
    const wind = Array.from({length:8}, (_,i) => ({u:1.2+i*.08, gust:0, pressure:.4, wait:.13+i*.154}));
    const pods = Array.from({length:N}, (_,i) => ({angle:.003*Math.sin(i), v:0}));
    const waves = Array.from({length:60}, (_,i) => ({z:.026*Math.sin(i*2.4),v:.004*Math.cos(i), travel:i*.21}));
    const flags = Array.from({length:9}, (_,i) => ({bend:.03*i,v:0}));
    const haze = [.0015,.0017,.0019];
    const bulbs = Array.from({length:24}, (_,i) => ({charge:.06+i*.002, heat:.11+i*.002}));
    const motes = Array.from({length:18}, () => ({x:random()*2-1,y:random(),z:random(),vx:0,vy:0}));
    const park = {angle:0, speed:.012, spring:.08};
    const sail = {trim:.14, boom:.18, rate:0, x:-4, speed:0, heel:0, roll:0};
    const balloon = {temp:20.8, lift:0, v:0, lean:0, spin:0};
    const cabin = {press:0, pv:0, dial:trip*Math.PI/2, dialV:0, guide:0, guideV:0, demo:0};
    let dusk=.04, quiet=0, windSound=.12, current=0, lampFocus=0, inputTravel=0;
    function press(offset=0) { held=true; finger=clamp(offset,-1,1); idle=0; brake=null; }
    function move(offset) { if(held) { const f=clamp(offset,-1,1); inputTravel+=Math.abs(f-finger); finger=f; } }
    function release() {
      if(!held) return;
      held=false; idle=0; finger=0;
      if(omega>0) {
        const goal=(Math.floor(turn/PITCH+1e-10)+1)*PITCH;
        brake={from:turn,goal,age:0,duration:2*(goal-turn)/omega,initial:omega};
      }
    }
    function wheel(dt) {
      if(held) { omega=SPEED; turn+=omega*dt; }
      else if(brake) {
        brake.age=Math.min(brake.age+dt,brake.duration);
        const q=brake.age/brake.duration;
        turn=brake.goal-(brake.goal-brake.from)*(1-q)*(1-q);
        omega=brake.initial*(1-q);
        if(q===1) { turn=brake.goal; omega=0; brake=null; }
      }
      trip=Math.floor((turn+1e-11)/TAU); phase=Math.max(0,turn-trip*TAU);
      height=R*(1-Math.cos(turn));
    }
    function atmosphere(dt) {
      for(let i=0;i<wind.length;i++) {
        const w=wind[i]; w.wait-=dt;
        if(w.wait<=0) { w.pressure=(random()-.44)*2.8; w.wait+=.45+random()*2.35; }
        w.gust+=(w.pressure-w.gust)*dt/(.68+i*.09);
        const altitude=i===0?height:1.6+i*2.2;
        const upstream=wind[(i+7)%8].u;
        w.u+=(1.05+.115*altitude+w.gust+.15*(upstream-w.u)-w.u)*dt/(1.1+i*.07);
      }
      haze.forEach((d,i) => {const target=.00145+i*.00041+(.00345-i*.0003)*height/(2*R)+.00009*wind[i].u;
        haze[i]+=(target-d)*dt/(1.8+i*.8);});
      quiet+=(smooth(.93,.99,height/(2*R))-quiet)*dt/.9;
      windSound+=((.05+.085*Math.max(0,wind[0].u))*(1-.73*quiet)-windSound)*dt/.45;
      const evening=smooth(Math.PI*.99,Math.PI*1.48,phase)*(1-smooth(TAU-.65,TAU,phase));
      dusk+=((.035+.92*evening)-dusk)*dt/2.3;
    }
    function suspensions(dt) {
      for(let i=0;i<N;i++) {
        const p=pods[i], a=turn+PITCH*i, air=wind[i%8].u, speed=omega*R*Math.cos(a);
        const force=.012*(air-speed)*Math.abs(air-speed)-9.81*Math.sin(p.angle)/1.42;
        p.v+=(force-1.38*p.v)*dt; p.angle+=p.v*dt;
      }
      for(let i=0;i<flags.length;i++) {
        const f=flags[i], neighbour=i%3?flags[i-1].bend:0, air=wind[(i+2)%8].u;
        f.v+=(.87*air*Math.abs(air)*Math.cos(f.bend)-12*f.bend+5.5*(neighbour-f.bend)-2.1*f.v)*dt;
        f.bend+=f.v*dt;
      }
    }
    function water(dt) {
      // Pinned shore, transmissive outer boundary. Wind pressure excites each surface cell.
      for(let i=0;i<waves.length;i++) {
        const a=waves[i], col=i%10,row=Math.floor(i/10);
        const l=col?waves[i-1].z:a.z, r=col<9?waves[i+1].z:a.z;
        const b=row?waves[i-10].z:0, f=row<5?waves[i+10].z:a.z;
        const u=wind[(col+row*3)%8].u;
        a.travel+=(.68+.14*u+.045*row)*dt;
        const swell=(.035+.007*u*u)*Math.sin(a.travel*(.82+.023*col)+row*.8);
        a.v+=(3.2*(l+r+b+f-4*a.z)+swell-.5*a.v-.78*a.z)*dt;
      }
      waves.forEach(a=>a.z+=a.v*dt);
    }
    function attractions(dt) {
      const stage=trip%4,power=held?1:0;
      park.spring=clamp(park.spring+dt*((stage===0?power:0)*.7-.37*park.speed-.18*park.spring),0,1);
      park.speed+=(.20*park.spring+.009*wind[2].u-.48*park.speed)*dt;
      park.angle+=park.speed*dt;
      // Sheet restricts the boom. Mooring takes tension only after the slack is gone.
      const desired=stage===1&&held?.71+.27*finger:.15;
      sail.trim+=(desired-sail.trim)*dt/.9;
      const pressure=Math.max(0,wind[3].u)*(.15+sail.trim);
      sail.rate+=(pressure-3.8*sail.boom-1.6*sail.rate)*dt;
      sail.boom=clamp(sail.boom+sail.rate*dt,-.18,1.2);
      const tension=.26*Math.max(0,sail.x-8)-.26*Math.max(0,-8-sail.x);
      sail.speed+=(.23*pressure*sail.trim-.42*sail.speed-tension)*dt;
      sail.x+=sail.speed*dt;
      sail.roll+=(waves[24].v*2.8+.08*pressure-3.5*sail.heel-1.15*sail.roll)*dt;
      sail.heel+=sail.roll*dt;
      // Heat loss, buoyancy, tether tension, and basket contact with landing pad.
      const burner=stage===2&&held?1:0;
      balloon.temp+=dt*(burner*(3.8+1.45*finger)-(.085+.005*wind[4].u)*(balloon.temp-20));
      const rope=Math.max(0,balloon.lift-16)*1.3;
      balloon.v+=dt*(.056*(balloon.temp-20)-.52-rope-.80*balloon.v);
      balloon.lift+=balloon.v*dt;
      if(balloon.lift<=0) {balloon.lift=0; balloon.v=Math.max(0,balloon.v);}
      balloon.spin+=(.012*wind[4].u**2-.58*balloon.lean-.63*balloon.spin)*dt;
      balloon.lean+=balloon.spin*dt;
      lampFocus+=(finger-lampFocus)*dt/.55;
      current+=((stage===3&&held?1:.05)-current)*dt/1.25;
      for(let i=0;i<bulbs.length;i++){
        const b=bulbs[i], j=i%8, k=Math.floor(i/8);
        const duskPower=smooth(.14+.065*j,.45+.065*j,dusk);
        const focus=Math.exp(-Math.pow((j/7-.5)*2-lampFocus,2)*2);
        const local=Math.max(.045,duskPower,current*focus);
        const upstream=j?bulbs[i-1].charge:local;
        b.charge+=((.79*local+.21*upstream)-b.charge)*dt/(.39+.13*k+.045*j);
        b.heat+=(b.charge*b.charge-b.heat)*dt/(.61+.05*((i*7)%9));
      }
    }
    function fittings(dt) {
      idle=held?0:idle+dt;
      cabin.guideV+=(((!held&&idle>=4?1:0)-cabin.guide)*16-7*cabin.guideV)*dt;
      cabin.guide+=cabin.guideV*dt;
      if(idle>=4) cabin.demo+=dt*(1+.055*wind[0].u);
      else if(cabin.guide<.01) cabin.demo=0;
      cabin.pv+=((Number(held)*.016-cabin.press)*115-16*cabin.pv)*dt;
      cabin.press+=cabin.pv*dt;
      cabin.dialV+=((trip*Math.PI/2-cabin.dial)*13-6.3*cabin.dialV)*dt;
      cabin.dial+=cabin.dialV*dt;
      for(let i=0;i<motes.length;i++) {
        const m=motes[i], w=wind[i%8];
        m.vx+=dt*(.018*w.gust-.15*m.x-.52*m.vx);
        m.vy+=dt*(.012*w.u+.004*Math.cos(m.x*5+i)-.055*m.y-.31*m.vy);
        m.x+=dt*m.vx; m.y+=dt*m.vy;
        if(Math.abs(m.x)>1) {m.x=clamp(m.x,-1,1);m.vx*=-.32;}
        if(m.y<0||m.y>1) {m.y=clamp(m.y,0,1);m.vy*=-.22;}
      }
    }
    function step(seconds) {
      if(!Number.isFinite(seconds)||seconds<=0) return;
      const count=Math.ceil(seconds*120-1e-10),dt=seconds/count;
      for(let i=0;i<count;i++) {wheel(dt); atmosphere(dt); suspensions(dt); water(dt); attractions(dt); fittings(dt); elapsed+=dt;}
    }
    function read() {return {elapsed,turn,omega,height,trip,stage:trip%4,phase,held,finger,idle,braking:!!brake,wind,haze,
      pods,waves,flags,bulbs,motes,park,sail,balloon,cabin,dusk,quiet,windSound,current,lampFocus,inputTravel};}
    return {step,press,move,release,read,getState:()=>JSON.parse(JSON.stringify(read()))};
  }
  return {create,TAU,SPEED,R,N};
});
