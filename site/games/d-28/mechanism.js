/* 120 Hz mechanism. Angles are radians, torque is mN·m, tine flex is mm.
   One scene unit represents 100/3 mm at the scale of the little theatre. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, H = 1 / 120;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const mod = x => (x % TAU + TAU) % TAU;
  const scales = [[0,2,4,5,7,9,11,12,14,16,19,21],[0,2,3,5,7,8,10,12,14,15,17,19],[0,2,4,6,7,9,11,12,14,16,18,19]];
  const melodies = [
    [4,7,8,7,4,null,2,4,5,4,2,null,1,2,4,null,4,7,9,8,7,4,5,null,2,4,1,null,0,null,2,null],
    [0,null,4,7,8,null,7,5,4,null,2,4,6,null,5,null,2,null,5,8,10,null,8,7,5,4,3,null,2,null,0,null],
    [7,null,4,2,0,2,4,null,6,8,7,null,4,2,1,null,5,null,7,9,10,9,7,null,6,4,2,null,0,null,4,null]
  ];
  function create(seed = 83117) {
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const range = (a,b) => a + (b-a)*random();
    const list = (n,f) => Array.from({length:n},(_,i)=>f(i));
    const s = {
      box:0, phase:0, cycles:0, clock:0, idle:0, spring:0, torque:0, omega:0, angle:0,
      keyAngle:0, keyTarget:0, keySpeed:0, keyTravel:0, gearReveal:0, pins:[], teeth:[], strikes:0, addedHits:0,
      clickCount:0, lastHz:0, gearAngle:0, rebound:0, reboundV:0,
      dollAngle:-.24, dollSpeed:0, sway:0, swayV:0, lid:0, lidSpeed:0, closing:false, latch:0,
      added:0, gestures:0, playTravel:0, toyAwake:false, toyTouched:false, toyBell:0, toySlide:0, toySlideV:0, toyNotes:0, pullback:0, pullV:0,
      wind:list(7,()=>({u:range(-.36,.36), gust:range(-.45,.45), hold:range(.15,1.7)})),
      water:list(28,i=>({h:Math.sin(i*.6)*.018,v:range(-.035,.035)})),
      dust:list(42,()=>({x:range(-5,5),y:range(.5,5.9),z:range(-3.7,2.2),vx:range(-.025,.025),vy:range(-.018,.022)})),
      lamps:list(7,i=>({light:.2+i*.034,heat:.13+i*.027})),
      vessel:{x:-.68,v:.048,heel:.04,roll:0}, balloon:{h:.24,v:0,heat:.12}, mobile:{angle:.32,v:.04},
      visits:list(3,i=>({lift:i===0?1:0,v:0})), weights:[1,0,0], events:[]
    };
    function mount() {
      s.teeth = scales[s.box].map((n,i)=>({
        length:31/Math.pow(2,n/24), x:0,v:0,energy:0, contacts:0, i
      }));
      s.pins = [];
      melodies[s.box].forEach((lane,i)=>{
        if(lane!==null) s.pins.push({lane,at:TAU*(i+.48)/32,depth:1,v:0,extra:false});
      });
      // The second voice is carried by independent pins on the same drum.
      [0,8,16,24].forEach((i,j)=>s.pins.push({lane:[0,1,2,0][j],at:TAU*(i+.54)/32,depth:1,v:0,extra:false}));
    }
    mount();
    const emit=(type,props={})=>{ if(s.events.length<256)s.events.push({type,...props}); };
    function strike(lane, force) {
      const t=s.teeth[lane];
      t.v+=force*17/(.75+t.length/40);
      t.energy+=force*.7; t.contacts++; s.strikes++;
      // A cantilever's fundamental frequency is proportional to 1 / length².
      s.lastHz=[392,349.228,329.628][s.box]*(31/t.length)**2*(.89+.12*Math.min(s.omega/.68,1.25));
      s.swayV+=(lane-4.4)*force*.039;
      s.dollSpeed+=.043*force;
      s.lamps[lane%7].heat+=force*.24;
      emit('note',{hz:s.lastHz,force,lane,length:t.length});
    }
    function wind(rad) {
      if(s.closing || (s.phase!==0 && s.spring>1.15))return false;
      const amount=clamp(Math.abs(rad),0,1.6);
      s.keyTravel+=amount;
      s.keyTarget+=amount;
      s.spring=Math.min(12,s.spring+amount*1.15);
      return true;
    }
    function pin(lane,at) {
      if(s.phase!==1 || s.closing || s.added>=7)return false;
      lane=clamp(Math.round(lane),0,11);
      const p={lane,at:mod(Number.isFinite(at)?at:s.angle+.36),depth:0,v:0,extra:true};
      s.pins.push(p); s.added++; emit('seat',{lane});
      s.reboundV+=.07; return true;
    }
    function dance(impulse,begin=false) {
      if(s.phase<2 || s.closing)return false;
      const a=clamp(impulse,-1.1,1.1);
      if(begin)s.gestures++;
      s.playTravel+=Math.abs(a); s.dollSpeed=clamp(s.dollSpeed+a,-3.5,3.5);
      // A one-way clutch in the pedestal returns finger work to the spring.
      s.spring=Math.min(12,s.spring+Math.abs(a)*.36);
      return true;
    }
    function toyPosition(){return [s.vessel.x,s.balloon.h,s.mobile.angle][s.box];}
    function playToy(impulse){
      if(s.phase<2 || !s.toyAwake || s.closing)return false;
      const a=clamp(impulse,-1.2,1.2);
      if(!s.toyTouched){s.toyBell=toyPosition();s.toyTouched=true;}
      if(s.box===0){
        // A finger pushes the hull. The nearest water cell receives the wake.
        s.vessel.v=clamp(s.vessel.v+a*.45,-1,1);
        const i=clamp(Math.round(13+s.vessel.x*7),0,27);s.water[i].v+=a*.16;
      }
      if(s.box===1)s.balloon.heat=clamp(s.balloon.heat+a*.61,-.2,1.5);
      if(s.box===2)s.mobile.v=clamp(s.mobile.v+a*1.25,-2.5,2.5);
      s.spring=Math.min(12,s.spring+Math.abs(a)*.32);
      return true;
    }
    function close(){if(s.phase!==3 || s.closing)return false;s.closing=true;return true;}
    function nudge(){s.reboundV=clamp(s.reboundV+.12,-.3,.3);}
    function atmosphere(h){
      for(const w of s.wind){w.hold-=h;if(w.hold<=0){w.gust=range(-.65,.65);w.hold=range(.45,2.3);}}
      const old=s.wind.map(w=>w.u);
      s.wind.forEach((w,i)=>w.u+=h*((w.gust-w.u)*.73+(old[(i+1)%7]-w.u)*.22));
      const water=s.water, height=water.map(p=>p.h);
      water.forEach((p,i)=>{
        const lap=(height[Math.max(0,i-1)]+height[Math.min(27,i+1)]-2*p.h);
        const wake=Math.exp(-((i-13-s.vessel.x*7)**2)*.48)*s.vessel.v*.21;
        p.v+=h*(lap*15-1.4*p.h-1.1*p.v+s.wind[i%7].u*.12+wake);
        p.h+=p.v*h;
      });
      s.dust.forEach((p,i)=>{
        const w=s.wind[i%7].u;
        p.vx+=h*(.31*w-.66*p.vx+Math.max(0,-4.8-p.x)*.7-Math.max(0,p.x-4.8)*.7);
        p.vy+=h*((s.wind[(i+2)%7].u*.09+.007)*(1+(i%3)*.1)-.32*p.vy+Math.max(0,.55-p.y)*.4-Math.max(0,p.y-5.8)*.4);
        p.x+=p.vx*h;p.y+=p.vy*h;
      });
      s.lamps.forEach((p,i)=>{
        p.heat+=(.2+.19*s.wind[i].u+1.2*water[i*4].h-p.heat)*h*(.72+.12*i);
        p.light+=(p.heat-p.light)*h*(1.7+i*.19);
      });
      const b=s.vessel;
      b.v+=(s.wind[1].u*.21-b.v*.31-Math.max(0,b.x-.87)*2+Math.max(0,-.87-b.x)*2)*h;
      b.x+=b.v*h;b.roll+=(water[12].h*5+b.v*.17-b.heel*4-b.roll*1.6)*h;b.heel+=b.roll*h;
      const f=s.balloon;
      f.heat+=(.20+s.wind[4].u*.13-f.heat)*.22*h;
      f.v+=(f.heat*.8+.12-f.h*.85-f.v*.62)*h;f.h+=f.v*h;
      s.mobile.v+=(s.wind[5].u*.5+s.omega*.14-s.mobile.v*.42)*h;s.mobile.angle+=s.mobile.v*h;
    }
    function tick(h){
      s.clock+=h;s.idle+=h;atmosphere(h);
      s.torque=s.spring*.024*(1-s.lid)**4;
      const drag=(.105+s.lid*1.5)*s.omega+.22*s.omega*s.omega+.0032;
      s.omega=clamp(s.omega+h*(s.torque-drag)/.16,0,1.2);
      s.spring=Math.max(0,s.spring-s.omega*h*.40-s.spring*s.lid*h*6.5);
      const before=s.angle;s.angle+=s.omega*h;
      s.gearAngle-=s.omega*h*2.75;
      s.gearReveal+=(clamp(s.keyTravel*1.34,0,1)-s.gearReveal)*h*3.8;
      const oldKey=s.keyAngle;
      s.keySpeed=clamp(s.keySpeed+(90*(s.keyTarget-s.keyAngle)-18*s.keySpeed)*h,0,7.2);
      s.keyAngle+=s.keySpeed*h;
      if(Math.floor(oldKey/.245)!==Math.floor(s.keyAngle/.245)){s.clickCount++;emit('click');}
      for(const p of s.pins){
        if(p.depth<1){p.v+=(44*(1-p.depth)-10*p.v)*h;p.depth=Math.min(1,p.depth+p.v*h);}
        if(p.depth>.32 && Math.floor((before-p.at)/TAU)<Math.floor((s.angle-p.at)/TAU)){
          strike(p.lane,clamp(.22+s.omega*.95,.2,1.12)*p.depth);
          if(p.extra)s.addedHits++;
        }
      }
      for(const t of s.teeth){
        // Slow visible flex envelope in mm. Audio resolves the actual kHz partials.
        t.v+=(-t.x*(410+3*(31-t.length))-t.v*8)*h;t.x+=t.v*h;
        t.energy*=Math.exp(-h*(1.7+t.i*.035));
      }
      s.dollSpeed+=h*((s.phase>=2?s.omega*.84:0)-s.dollSpeed)*(s.phase>=2?1.35:3.2);
      s.dollAngle+=h*s.dollSpeed;
      s.swayV+=h*(-s.sway*24-s.swayV*3.3);s.sway+=s.swayV*h;
      s.reboundV+=h*(-s.rebound*110-s.reboundV*9);s.rebound+=s.reboundV*h;
      const wantBack=s.phase>=2?1:0;
      s.pullV+=(2.7*(wantBack-s.pullback)-3.2*s.pullV)*h;s.pullback+=s.pullV*h;
      if(s.phase===0 && s.keyTravel>=1.4 && s.strikes>=2)s.phase=1;
      if(s.phase===1 && s.added>=3 && s.addedHits>0)s.phase=2;
      if(s.phase===2 && s.gestures && s.playTravel>=.56)s.toyAwake=true;
      s.toySlideV+=h*(18*((s.toyAwake&&!s.closing?1:0)-s.toySlide)-7.4*s.toySlideV);
      s.toySlide+=h*s.toySlideV;
      if(s.toyTouched&&!s.closing){
        const pos=toyPosition(),span=[.20,.13,.58][s.box];
        if(Math.abs(pos-s.toyBell)>=span){
          s.toyBell=pos;s.toyNotes++;
          const lane=[0,4,7,9,4][(s.toyNotes-1)%5];
          const hz=[392,349.228,329.628][s.box]*(31/s.teeth[lane].length)**2;
          s.lamps[(lane+s.box)%7].heat+=.37;
          emit('bell',{hz,force:.57,lane});s.phase=3;
        }
      }
      const target=s.closing?1:0;
      s.lidSpeed+=(28*(target-s.lid)-8.8*s.lidSpeed)*h;s.lid+=s.lidSpeed*h;
      if(s.lid<=0 || s.lid>=1){s.lid=clamp(s.lid,0,1);s.lidSpeed=0;}
      if(s.closing && s.lid>.989){
        if(s.latch===0)emit('latch',{hz:[392,349.228,329.628][s.box]});
        s.latch+=h;
        if(s.latch>.62){
          s.box=(s.box+1)%3; if(!s.box)s.cycles++;
          s.closing=false;s.latch=0;s.phase=0;s.keyTravel=0;s.added=0;s.addedHits=0;
          s.strikes=0;s.gestures=0;s.playTravel=0;s.toyAwake=false;s.toyTouched=false;s.toyNotes=0;s.spring=0;s.idle=0;
          mount();
        }
      }
      // The far boat clears the headland, the balloon climbs, and the mobile
      // retracts below the sill. Each carriage coasts to its own end stop.
      s.visits.forEach((q,i)=>{
        const lift=s.box===i&&!s.closing?1:0;
        q.v+=((lift-q.lift)*(4.4+i)-q.v*(4.2+i*.3))*h;
        q.lift+=q.v*h;
        if(q.lift<0||q.lift>1){q.lift=clamp(q.lift,0,1);q.v=0;}
      });
      s.weights.forEach((v,i)=>s.weights[i]+=((i===s.box?1:0)-v)*h*2.3);
    }
    let carry=0;
    return {s,step(dt){
      if(!Number.isFinite(dt)||dt<0)return;
      carry+=dt;while(carry>=H-1e-12){tick(H);carry-=H;}
    }, wind,pin,dance,playToy,close,nudge, touch(){s.idle=0;},events(){return s.events.splice(0);},
    getState(){const {events,...state}=s;return JSON.parse(JSON.stringify(state));}};
  }
  const api={create,TAU};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.MusicalWorks=api;
})(typeof window!=='undefined'?window:globalThis);
