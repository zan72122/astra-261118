/* Model lengths are decimetres, masses kilograms, angles radians, time seconds. */
(function (root) {
  "use strict";
  const H = 1 / 120, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const matter = {
    starter: {mass:.058, friction:.09, bounce:.31},
    domino: {mass:.036, friction:.24, bounce:.16},
    marble: {mass:.042, friction:.035, bounce:.24},
    lever: {mass:.094, friction:.16, bounce:.17},
    car: {mass:.118, friction:.065, bounce:.26},
    balloon: {mass:.004, friction:.35, bounce:.44}
  };
  function createGame(seed = 3718) {
    let random = seed >>> 0, remainder = 0, events = [];
    function rand() { random = (1664525 * random + 1013904223) >>> 0; return random / 4294967296; }
    const osc = (x = 0) => ({x, v:0});
    function spring(q, target, k, drag, h) {
      q.v += ((target - q.x) * k - drag * q.v) * h;
      q.x += q.v * h;
    }
    const s = {
      stage:0, phase:"ready", round:0, travel:osc(), destination:0, idle:0, elapsed:0,
      wind:osc(.08), gust:.15, gustLeft:.8, curtains:Array.from({length:7}, () => osc()),
      dust:Array.from({length:50}, () => ({x:rand()*17-8.5,y:rand()*6+.4,z:rand()*9-4.5,vx:0,vy:0,vz:0,drag:.6+rand()*.6,lift:rand()*.05-.02})),
      window:osc(), glow:osc(), frame:osc(), hint:osc(), guide:osc(), guideDown:false, hold:0, wait:0, key:-1, accents:[]
    };
    function chain() {
      s.starter={x:0,v:0,hit:false};
      s.domino=Array.from({length:11}, (_,i) => ({a:0,v:0,hit:false,awake:false,stop:i===10?1.49:Math.acos(.208/.474),offset:(rand()-.5)*.10, offsetV:0}));
      s.marble={x:0,v:0,free:false}; s.lever=osc(.095);
      s.car={x:0,v:0,free:false}; s.balloon=osc(); s.sway=s.sway||osc(.025);
      s.flag=osc(); s.pad=osc(); s.frame=osc(); s.impulse=0;
    }
    function toys() {
      s.wheel=osc(); s.water=Array.from({length:32},(_,i)=>osc(.009*Math.sin(i*.81)));
      s.boat={x:0,v:0,roll:osc(),dock:0,target:0};
      s.prop=osc(); s.plane={angle:0,speed:0,height:osc(.38),bank:osc(),leg:0,target:0};
      s.keys=Array.from({length:5},()=>osc()); s.bells=Array.from({length:5},()=>osc());
      s.carousel={angle:0,speed:0,notes:0,animals:Array.from({length:4},()=>osc())};
      s.accents=Array.from({length:16},()=>osc());
    }
    chain(); toys();
    function emit(type,power=1,tone=0) { events.push({type,power,tone,at:s.elapsed}); if(events.length>160) events.shift(); }
    function active() {
      if (s.phase!=="ready") return "";
      return ["starter","wheel","prop","key"+[2,0,4,1,3][s.carousel.notes%5]][s.stage];
    }
    function touch(name, force=.5) {
      const p=clamp(force,0,1);
      if(name!==active() || !name) return false;
      s.phase="moving"; s.idle=0;
      if(s.stage===0) {
        s.impulse=.011+.014*p; s.starter.v=10*s.impulse/matter.starter.mass; emit("marble",.4+p*.4);
      } else if(s.stage===1) {
        s.wheel.v+=3.3+3*p; s.water[0].v+=.7+p*.35;
        s.boat.target=[2.05,4.45,6.65][s.boat.dock]; emit("water",.8);
      } else if(s.stage===2) {
        s.prop.v+=14+13*p; s.plane.target=[2.3,4.6,Math.PI*2][s.plane.leg]; emit("wind",.5+.4*p);
      } else {
        const i=Number(name.slice(3)); s.keys[i].v=-1.65-.6*p;
        s.bells[i].v=1.1+.75*p; s.carousel.speed+=.56+.33*p; s.carousel.notes++;
        s.key=i; emit("note",1,i);
      }
      return true;
    }
    function nudge(i) { if(s.accents[i] && Math.abs(s.accents[i].v)<.15) {s.accents[i].v=.18; emit("tick",.10,i);} }
    function finish() {s.phase="reward";s.wait=0;emit("chord",.68,s.stage);}
    function air(h) {
      s.gustLeft-=h;
      if(s.gustLeft<=0){s.gust=(rand()-.44)*.65;s.gustLeft=.65+rand()*1.7;}
      spring(s.wind,s.gust,2.2,2.8,h);
      s.curtains.forEach((q,i)=>spring(q,s.wind.x*(.22+i*.075)+(i?s.curtains[i-1].x*.23:0),3.1+i*.25,1.45+i*.13,h));
      s.dust.forEach(q=>{
        q.vx+=(s.wind.x*(.6+q.y*.05)-q.drag*q.vx-.018*q.x)*h;
        q.vy+=(q.lift+.025*s.wind.x-q.drag*q.vy-.025*(q.y-3))*h;
        q.vz+=(s.wind.v*.10-q.drag*q.vz-.015*q.z)*h;
        q.x+=q.vx*h;q.y+=q.vy*h;q.z+=q.vz*h;
      });
      spring(s.glow,.36+s.wind.x*.09+s.window.x*.58,2,2.4,h);
      spring(s.sway,s.wind.x*.33,4.2,1.3,h);
      spring(s.frame,0,7,1.4,h);
      spring(s.hint,active() && s.idle>3.9?1:0,15,7,h);
      if (s.hint.x>.2) {
        s.hold-=h;
        if(s.hold<=0){s.guideDown=!s.guideDown;s.hold=s.guideDown?.92:1.52;}
      } else {s.guideDown=false;s.hold=.05;}
      spring(s.guide,s.guideDown?1:0,19,6.8,h);
      s.accents.forEach((q,i)=>spring(q,0,17+i,3+i*.3,h));
    }
    function mechanism(h) {
      const b=s.starter, m=s.marble, c=s.car;
      if(b.v>0) {
        b.v=Math.max(0,b.v-(matter.starter.friction*2+b.v*.32)*h);
        b.x+=b.v*h;
        if(b.x>=.88 && !b.hit) {
          b.hit=true;s.domino[0].awake=true;
          s.domino[0].v=b.v*matter.starter.mass/(matter.starter.mass+matter.domino.mass)*1.55;
          b.v*=matter.starter.bounce*.36;emit("domino",.7,0);
        }
      }
      s.domino.forEach((d,i)=>{
        if(!d.awake) return;
        d.v+=(12.3*Math.sin(d.a+.018)-(1.2+matter.domino.friction)*d.v)*h;
        d.a+=d.v*h;
        if(d.a>=(i===10?.49:Math.asin((.474-.208)/1.12)) && !d.hit) {
          d.hit=true;
          const next=s.domino[i+1];
          if(next) {next.awake=true;next.v+=d.v*.62+.32;d.v*=.70;emit("domino",clamp(next.v*.42,.3,1),i+1);}
          else {m.free=true;m.v=.5+d.v*.4;emit("glass",.74);}
        }
        if(d.a>d.stop) {d.a=d.stop;d.v=-Math.abs(d.v)*matter.domino.bounce;if(Math.abs(d.v)<.12){d.v=0;d.awake=false;}}
      });
      if(m.free && m.x<5.65) {
        const slope=.11+.065*Math.sin(Math.PI*m.x/5.65);
        m.v+=((9.81*slope*3.5-matter.marble.friction*2)-.72*m.v)*h;
        m.x+=m.v*h;
        if(m.x>=5.65){m.x=5.65;s.lever.v-=m.v*matter.marble.mass/matter.lever.mass*(1+matter.marble.bounce)*.69;m.v=0;emit("wood",.85);}
      }
      spring(s.lever,m.x>=5.65?-.235:.095,12,2.2+matter.lever.friction,h);
      if(s.lever.x<-.12 && !c.free){c.free=true;c.v=.42;emit("axle",.6);}
      if(c.free && c.x<5.95) {
        c.v+=(2.7-.52*c.v-matter.car.friction*3)*h;c.x+=c.v*h;
        if(c.x>=5.95){c.x=5.95;s.pad.v=-c.v*matter.car.bounce;s.balloon.v=.62+c.v*matter.car.mass/(matter.car.mass+matter.balloon.mass)*matter.balloon.bounce*.21;s.sway.v-=.32;c.v=0;emit("puff",.8);}
      }
      spring(s.pad,0,21,4.0,h);
      // Buoyancy balances the restoring force of a tether when the catch opens.
      spring(s.balloon,c.x>=5.95?2.02:0,1.45,1.1+matter.balloon.friction,h);
      spring(s.flag,Math.max(0,s.balloon.x-.13)*.73,5,2.8,h);
      if(s.flag.x>1.14 && s.phase==="moving") {finish();s.frame.v=.085;}
    }
    function water(h) {
      s.wheel.v+=(-.33*s.wheel.v)*h;s.wheel.x+=s.wheel.v*h;
      // Shallow-water springs exchange momentum only with immediate neighbours.
      for(let i=0;i<s.water.length;i++){
        const q=s.water[i],left=s.water[Math.max(0,i-1)],right=s.water[Math.min(31,i+1)];
        const source=i===0?s.wheel.v*.36*Math.cos(s.wheel.x*6)+s.wind.x*.11:0;
        q.v+=(42*(left.x+right.x-2*q.x)-3.1*q.x-1.1*q.v+source)*h;
      }
      s.water.forEach(q=>q.x+=q.v*h);
      const b=s.boat,cell=clamp(Math.floor(b.x/6.65*31),0,30);
      spring(b.roll,(s.water[cell].x-s.water[cell+1].x)*5+s.wind.x*.08,5,2,h);
      if(b.target>b.x) {
        const d=b.target-b.x;
        b.v+=(.086+Math.abs(s.wheel.v)*.10+Math.abs(s.water[cell].v)*.31-.83*b.v)*h;
        b.x+=Math.min(d,b.v*h);
        if(b.x>=b.target){s.water[cell].v+=b.v*.55;b.dock++;emit("buoy",.65,b.dock);
          if(b.dock===3)finish();else {s.phase="ready";s.idle=0;}}
      } else b.v*=Math.exp(-2*h);
    }
    function flight(h) {
      const a=s.plane;
      s.prop.v*=Math.exp(-.21*h);s.prop.x+=s.prop.v*h;
      if(a.angle<a.target) {
        a.speed+=(.128+s.prop.v*.013-.85*a.speed)*h;
        a.angle+=Math.min(a.target-a.angle,a.speed*h);
        if(a.angle>=a.target){a.leg++;emit("bell",.65,a.leg);
          if(a.leg===3)finish();else {s.phase="ready";s.idle=0;}}
      } else a.speed*=Math.exp(-2.1*h);
      const lift=(1-Math.cos(a.angle))*.96+Math.sin(a.angle*.5)*.52;
      spring(a.height,.38+lift+a.speed*.20,4.2,2.8,h);
      spring(a.bank,-a.speed*.72+s.wind.x*.13,3.4,1.9,h);
    }
    function music(h) {
      const c=s.carousel;
      c.speed*=Math.exp(-.285*h);c.angle+=c.speed*h;
      s.keys.forEach((q,i)=>spring(q,0,30+i,5,h));
      s.bells.forEach((q,i)=>spring(q,0,19+i*2,1.05,h));
      c.animals.forEach((q,i)=>spring(q,.23*Math.sin(c.angle*2+i*Math.PI*.5)*Math.min(1,c.speed*4),8+i,2.3,h));
      if(s.phase==="moving" && c.speed<.115){if(c.notes===5)finish();else{s.phase="ready";s.idle=0;}}
    }
    // A return spring in the backstage carriage rewinds each latch independently.
    // The brake releases at rest before the tray comes back into view.
    function rearm(h) {
      for(const [body,k] of [[s.starter,1.5],[s.marble,1.2],[s.car,1.1],[s.balloon,1.6],[s.flag,1.3]])
        spring(body,0,k,2*Math.sqrt(k),h);
      s.domino.forEach((d,i)=>{
        const k=1.1+.07*i;
        d.v+=(-k*d.a-2*Math.sqrt(k)*d.v)*h;d.a+=d.v*h;
        d.offsetV+=((d.nextOffset-d.offset)*k-2*Math.sqrt(k)*d.offsetV)*h;d.offset+=d.offsetV*h;
      });
      spring(s.lever,.095,2,2.9,h);spring(s.pad,0,21,4,h);
    }
    function tick(h) {
      s.elapsed+=h;s.idle+=h;air(h);
      if(s.stage===0)mechanism(h);
      else if(s.stage===1)rearm(h);
      if(s.stage===1 || s.stage===0)water(h);
      if(s.stage===2)flight(h);
      if(s.stage===3)music(h);
      if(s.stage===2 || s.stage===3) {
        spring(s.boat,0,1,2,h);s.wheel.v*=Math.exp(-h);s.wheel.x+=s.wheel.v*h;
        s.water.forEach((q,i)=>spring(q,0,2+i*.02,2,h));
      }
      if((s.stage===3||s.stage===0) && s.plane.target===0){
        s.plane.speed+=(-s.plane.angle-2*s.plane.speed)*h;s.plane.angle+=s.plane.speed*h;
        spring(s.plane.height,.38,2,2.8,h);spring(s.plane.bank,0,2,2.8,h);
        s.prop.v*=Math.exp(-h);s.prop.x+=s.prop.v*h;
      }
      if(s.stage!==3){
        s.carousel.speed*=Math.exp(-.55*h);s.carousel.angle+=s.carousel.speed*h;
        s.carousel.animals.forEach((q,i)=>spring(q,0,8+i,2.4,h));
        s.keys.forEach(q=>spring(q,0,28,5,h));s.bells.forEach(q=>spring(q,0,21,1.1,h));
      }
      spring(s.window,s.phase==="reward"||s.phase==="travel"||s.stage>0?1.14:0,2.1,2.6,h);
      if(s.phase==="reward" && (s.wait+=h)>4.8){s.destination++;s.phase="travel";}
      if(s.phase==="travel") {
        spring(s.travel,s.destination,2.6,3.3,h);
        if(Math.abs(s.travel.x-s.destination)<.004 && Math.abs(s.travel.v)<.012) {
          s.stage=s.destination%4;s.phase="ready";s.idle=0;
          if(s.stage===0){
            s.round++;s.impulse=0;s.starter.hit=false;s.starter.v=s.starter.x=0;
            s.domino.forEach(d=>{d.hit=d.awake=false;d.v=d.a=0;});
            s.marble.free=s.car.free=false;s.marble.x=s.marble.v=s.car.x=s.car.v=0;
          }
          // Mature toys are repacked only behind the far side of the carriage.
          if(s.stage===2){s.boat.dock=0;s.boat.target=0;}
          if(s.stage===1){s.carousel.notes=0;s.key=-1;s.domino.forEach(d=>{d.nextOffset=(rand()-.5)*.12;});}
          if(s.stage===3){s.plane.leg=0;s.plane.target=0;}
        }
      }
    }
    return {state:s, active,touch,nudge,step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      remainder+=dt;while(remainder+1e-12>=H){tick(H);remainder-=H;}
    },getState(){return JSON.parse(JSON.stringify(s));},drain(){const e=events;events=[];return e;}};
  }
  const api={createGame,matter};
  if(typeof module!=="undefined" && module.exports)module.exports=api;
  else root.KorokoroPhysics=api;
})(typeof globalThis==="undefined"?this:globalThis);
