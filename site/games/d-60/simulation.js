/* Simulation units: metres, seconds, litres, kPa and radians. No rendering dependencies. */
(function (root) {
  'use strict';
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const smooth = x => (x=clamp(x,0,1),x*x*(3-2*x));
  const end = 74, waterY = -1.43;
  function ground(d) { return -.009*Math.min(24,Math.max(0,d)) - .016*Math.max(0,Math.min(68,d)-24); }
  function route(d) {
    const entry = Math.min(1, d/3.4);
    return {x:1.7*smooth(entry)+.55*Math.sin(d*.085)+2.65*smooth((d-64)/10),
      y:ground(d), z:-d + 1.1*Math.sin(Math.PI*entry)};
  }
  function homePath(t) {
    const curve=(a,b,c,d,u)=>{const v=1-u;return a*v*v*v+3*b*v*v*u+3*c*v*u*u+d*u*u*u;};
    if(t<=.48){
      const u=clamp(t/.48,0,1);
      return {x:curve(8.29,8.29,8.12,7.60,u),z:curve(-.68,1.76,6.60,6.60,u),y:-1.144+1.185*smooth(u)};
    }
    if(t<=.86){
      const u=(t-.48)/.38;
      return {x:curve(7.60,7.19,.47,-.30,u),z:curve(6.60,6.60,-.96,-.96,u),y:.041-.032*smooth(u)};
    }
    const u=clamp((t-.86)/.14,0,1);
    return {x:curve(-.30,-.585,-1.05,0,u),z:curve(-.96,-.96,0,0,u),y:.009};
  }
  function create(options={}) {
    let seed=options.seed??7319, residue=0;
    function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    const patch=(i)=>({u:.19+noise()*.3,v:0,force:.2+noise()*.4,hold:noise()*2+.1,angle:noise()*.05,w:0});
    const particle=(i)=>({x:noise()*.16,y:noise()*.26,z:noise()*.1,vx:0,vy:0,origin:noise()*.05});
    const tire=()=>Array.from({length:48},()=>({dent:0,v:0}));
    const s={phase:'pump',phaseAge:0,trip:0,idle:0,pressure:options.pressure??150,air:0,
      ribbons:Array.from({length:3},()=>Array.from({length:6},()=>({angle:0,v:0}))),
      piston:0,pistonV:0,target:0,drag:false,held:false,resistance:0,rr:0,tilt:-.15,tiltV:0,
      wheels:[tire(),tire()],d:0,speed:0,spin:0,crank:0,fork:0,forkV:0,
      bell:0,bellV:0,bellEnergy:0,echoes:Array(6).fill(0),bells:0,
      wind:Array.from({length:9},(_,i)=>patch(i)),dust:Array.from({length:14},(_,i)=>particle(i)),
      water:Array.from({length:96},(_,i)=>({h:.002*Math.sin(i*2.37),v:0})),
      gate:0,gateV:0,gateTarget:0,flow:.035,jet:Array(8).fill(.035),wheel:0,wheelV:0,paddles:Array(12).fill(0),
      sail:0,sailV:0,sailTarget:0,cloth:Array.from({length:8},()=>({bow:0,v:0})),
      crankHeld:false,crankDrive:0,drum:0,drumV:0,bridged:false,leaves:[{angle:0,v:0},{angle:0,v:0}],
      board:0,boardV:0,boat:0,boatV:0,heave:0,heaveV:0,home:0,homeV:0,wiggle:0,wiggleV:0,
      hose:0,hoseV:0,events:[]};
    s.resistance=s.pressure*.067;s.rr=.02-.012*clamp((s.pressure-150)/250,0,1);
    function phase(name){s.phase=name;s.phaseAge=0;s.idle=0;s.events.push(name);}
    function rimLoad(w,i) {
      const angle=i*Math.PI/24, p=w===0?s.pressure:370;
      const squish=(w===0?.038:.034)*Math.pow(150/p,1.65);
      return Math.max(0,squish-.2032*(1+Math.sin(angle)))+squish*.045*Math.max(0,-Math.sin(angle))**5;
    }
    s.wheels.forEach((w,j)=>w.forEach((c,i)=>c.dent=rimLoad(j,i)));
    function updatePump(dt) {
      s.resistance=s.pressure*.067;
      const error=s.target-s.piston;
      const accel=s.drag ? error*1400/(1+(error<0?s.pressure/150:.25)) : 0;
      s.pistonV+=(accel-(s.drag?43:70)*s.pistonV)*dt;
      const last=s.piston;
      s.piston=clamp(last+s.pistonV*dt,0,1);
      if(s.piston===0 || s.piston===1)s.pistonV=0;
      if(s.phase==='pump'){
        const injected=.4*Math.max(0,last-s.piston);
        s.air+=injected;s.pressure=Math.min(400,s.pressure+injected*62.5);
        if(s.pressure>=399.95){s.pressure=400;s.drag=false;phase('ready');}
      }
      const disconnect=['pump','ready','vent'].includes(s.phase)?0:s.phase==='home'?1-smooth((s.home-.80)/.20):1;
      s.hoseV+=(45*(disconnect-s.hose)-11*s.hoseV)*dt;s.hose+=s.hoseV*dt;
    }
    function updateBicycle(dt) {
      s.rr=.02-.012*clamp((s.pressure-150)/250,0,1);
      const moving=['street','hill'].includes(s.phase);
      const dirt=smooth((s.d-39)/6);
      if(moving){
        const pedal=s.held ? 1.26 : 0;
        const gravity=s.held?(s.d>25?.157:.088):0;
        s.speed=Math.max(0,s.speed+(pedal+gravity-9.81*s.rr*(1+.55*dirt)-.50*s.speed*s.speed-(s.held?0:1.1*s.speed))*dt);
        if(!s.held && s.speed<.008)s.speed=0;
        s.speed=Math.min(s.speed,Math.sqrt(1.6*Math.max(0,end-s.d))+.04);
        s.d=Math.min(end,s.d+s.speed*dt);
        if(s.d>=25 && s.phase==='street')phase('hill');
        if(s.d>=end){s.held=false;phase('mill');}
      }else s.speed=Math.max(0,s.speed-2.5*dt);
      s.spin+=s.speed/.2032*dt;s.crank+=(s.held?s.speed*2.9:0)*dt;
      const bump=s.speed*(.001+.004*dirt)*(Math.sin(s.d*17)+.45*Math.sin(s.d*31.6));
      s.forkV+=(150*(bump-s.fork)-12*s.forkV)*dt;s.fork+=s.forkV*dt;
      const lean=-.018-.14*(400-s.pressure)/250+s.fork*.8+.003*s.wind[2].angle;
      s.tiltV+=(52*(lean-s.tilt)-10*s.tiltV)*dt;s.tilt+=s.tiltV*dt;
      s.wheels.forEach((w,j)=>w.forEach((c,i)=>{
        const load=rimLoad(j,i)*(1+Math.max(0,-s.fork)*5);
        c.v+=(235*(load-c.dent)-25*c.v)*dt;c.dent=Math.max(0,c.dent+c.v*dt);
      }));
      s.bellV+=(-410*s.bell-5*s.bellV)*dt;s.bell+=s.bellV*dt;
      s.bellEnergy*=Math.exp(-2*dt);
      for(let i=s.echoes.length-1;i>=0;i--){
        const incoming=i?s.echoes[i-1]:s.bellEnergy;
        s.echoes[i]+=(incoming-s.echoes[i]*1.24)*dt*(4+i*.27);
      }
      s.wiggleV+=(-54*s.wiggle-7*s.wiggleV)*dt;s.wiggle+=s.wiggleV*dt;
    }
    function updateAir(dt){
      s.wind.forEach((p,i)=>{
        p.hold-=dt;
        if(p.hold<=0){p.hold=.48+noise()*2.3;p.force=.12+noise()*.78;}
        const up=s.wind[(i+8)%9].u;
        p.v+=((p.force+up*.27-p.u)*2.1-1.7*p.v)*dt;p.u+=p.v*dt;
        p.w+=((p.u*(.12+i*.012)-p.angle)*(7+i)-p.w*(1.4+i*.12))*dt;p.angle+=p.w*dt;
      });
      s.ribbons.forEach((strip,j)=>strip.forEach((c,i)=>{
        const drag=(s.speed*.67+s.wind[(i+j)%9].u*.22)*(.32+i*.135);
        const upstream=i?strip[i-1].angle:0;
        c.v+=((Math.atan(drag)+upstream*.26-c.angle)*(39-i*3)-c.v*(5+j*.3))*dt;
        c.angle+=c.v*dt;
      }));
      s.dust.forEach((p,i)=>{
        const gust=s.wind[i%9];
        p.vx+=((gust.u*.23+p.origin-p.x)*3-1.2*p.vx)*dt;
        p.vy+=((.07+gust.angle*.95+p.origin*2+s.speed*(i%4)*.014-p.y)*4-p.vy*1.3)*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;
      });
    }
    function updateRiver(dt){
      s.gateV+=(36*(s.gateTarget-s.gate)-10*s.gateV)*dt;s.gate=clamp(s.gate+s.gateV*dt,0,1);
      s.flow+=(.035+.83*Math.sqrt(s.gate)-s.flow)*dt*1.28;
      for(let k=s.jet.length-1;k>=0;k--){
        const upstream=k?s.jet[k-1]:s.flow;
        s.jet[k]+=(upstream-s.jet[k])*(8+k*.73)*dt;
      }
      const water=s.water;
      const wakeRow=((24+74*s.boat)/110*34)%8;
      for(let i=0;i<96;i++){
        const x=i%12,y=Math.floor(i/12),c=water[i];
        const left=water[x?i-1:i],right=water[x<11?i+1:i],back=water[y?i-12:i],front=water[y<7?i+12:i];
        const wind=s.wind[(x+2*y)%9];
        const gap=Math.abs(y-wakeRow),dy=Math.min(gap,8-gap);
        const wake=.018*s.boatV*Math.exp(-1.9*((x-1)*(x-1)+dy*dy));
        const source=wake+(x===0?.043*(wind.u-.48):.003*wind.v)+(x===3&&y===3?.12*s.flow:0);
        c.v+=(13*(left.h+right.h+back.h+front.h-4*c.h)-1.65*c.v-2.1*c.h+source)*dt;
      }
      water.forEach(c=>c.h+=c.v*dt);
      let torque=0;
      s.paddles.forEach((load,i)=>{
        const angle=s.wheel+i*Math.PI/6;
        const contact=clamp((-Math.sin(angle)-.54)*3,0,1);
        s.paddles[i]+=(contact*s.flow*s.flow-load)*dt*(contact?8:3);
        torque+=s.paddles[i]*.68;
      });
      s.wheelV=Math.max(0,s.wheelV+(torque-.035-1.07*s.wheelV)*dt);
      s.wheel+=s.wheelV*dt;
      if(s.phase==='mill'&&s.gate>.96&&s.wheel>.85)phase('sail');
      s.sailV+=(32*(s.sailTarget-s.sail)-10*s.sailV)*dt;s.sail=clamp(s.sail+s.sailV*dt,0,1);
      s.cloth.forEach((c,i)=>{
        const load=s.sail*s.wind[i].u*(.04+.12*Math.sin(i*Math.PI/8));
        c.v+=((load-c.bow)*(18+i)-3*c.v)*dt;c.bow+=c.v*dt;
      });
      const boarding=['sail','ferry','bridge','home'].includes(s.phase);
      s.boardV+=((boarding?1:0)-s.board-1.9*s.boardV)*dt; s.board=clamp(s.board+s.boardV*dt,0,1);
      if(s.phase==='sail'&&s.sail>.97&&s.board>.988)phase('ferry');
      // Two counterbalanced leaves pull on slightly different lengths of cable.
      const returnDrum=s.boat>.55||s.phase==='pump';
      const drive=s.phase==='bridge'&&s.crankHeld?.87+s.crankDrive:returnDrum&&s.drum>0?-.8:0;
      s.crankDrive*=Math.exp(-3.5*dt);
      s.drumV+=(drive-s.drumV)*dt*5;s.drum=clamp(s.drum+s.drumV*dt,0,5.6);
      if((s.drum===0&&s.drumV<0)||(s.drum===5.6&&s.drumV>0))s.drumV=0;
      s.leaves.forEach((leaf,i)=>{
        const tension=clamp((s.drum-.18*i)*.228,0,1.22);
        leaf.v+=((tension-leaf.angle)*(11-i*1.7)-(4.6+i*.33)*leaf.v)*dt;
        leaf.angle=clamp(leaf.angle+leaf.v*dt,0,1.25);
      });
      if(s.phase==='bridge'&&s.leaves.every(p=>p.angle>1.08)){
        s.bridged=true;s.crankHeld=false;phase('ferry');
      }
      const sailing=s.phase==='ferry',remaining=(s.bridged?1:.425)-s.boat;
      const cruise=sailing?smooth(remaining/(s.bridged?.07:.044)):0;
      s.boatV+=((2.9+s.cloth[4].bow*5)*cruise-s.boatV)*dt*.62;
      if(sailing){s.boat=clamp(s.boat+s.boatV*dt/74,0,1);s.d=end*(1-s.boat);if(!s.bridged&&s.boat>.421){phase('bridge');}if(s.boat>.995){phase('home');}}
      s.heaveV+=((water[32].h+water[57].h-s.heave)*21-3*s.heaveV)*dt;s.heave+=s.heaveV*dt;
      if(['pump','ready','street','hill','mill'].includes(s.phase)&&s.boat>0){s.boat=Math.max(0,s.boat-.026*dt);}
      if(s.phase==='home'){
        const before=homePath(smooth(s.home));
        const look=homePath(smooth(Math.min(1,s.home+.0005)));
        const metresPerFraction=Math.hypot(look.x-before.x,look.y-before.y,look.z-before.z)/.0005;
        const rate=Math.min(.16,1.45/Math.max(1,metresPerFraction));
        s.homeV+=(rate-s.homeV)*dt*3;s.home=Math.min(1,s.home+Math.min(rate,s.homeV)*dt);
        const after=homePath(smooth(s.home));
        s.spin+=Math.hypot(after.x-before.x,after.y-before.y,after.z-before.z)/.2032;
        s.d=Math.min(s.d,end*(1-s.boat)*(1-s.home));
        if(s.home===1){s.gateTarget=0;s.sailTarget=0;phase('vent');}
      }
      if(s.phase==='vent'){
        s.pressure=Math.max(150,s.pressure-97*dt*smooth(s.phaseAge/.5));
        if(s.pressure===150&&s.phaseAge>4){
          s.trip++;s.bridged=false;s.d=0;s.home=0;s.homeV=0;
          s.gateTarget=0;s.sailTarget=0;s.target=s.piston;s.held=false;phase('pump');
        }
      }
    }
    function tick(dt){
      s.phaseAge+=dt;s.idle+=dt;
      updateAir(dt);updatePump(dt);updateBicycle(dt);updateRiver(dt);
    }
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;residue+=dt;
      while(residue+1e-10>=1/120){tick(1/120);residue-=1/120;}}
    function input(action,value){
      s.idle=0;
      if(action==='lift'&&s.phase==='pump'){s.drag=true;s.target=clamp(value,0,1);}
      if(action==='ride'&&['ready','street','hill'].includes(s.phase)){if(s.phase==='ready')phase('street');s.held=true;}
      if(action==='gate'&&s.phase==='mill')s.gateTarget=clamp(value,0,1);
      if(action==='sail'&&s.phase==='sail')s.sailTarget=clamp(value,0,1);
      if(action==='bell'&&['ready','street','hill','ferry'].includes(s.phase)){
        s.bellV+=2.4;s.bellEnergy=1;s.bells++;s.events.push('ding');
      }
      if(action==='wind'&&s.phase==='bridge'){s.crankHeld=true;s.crankDrive=clamp(value||0,0,1.6);}
      if(action==='nudge')s.wiggleV=clamp(s.wiggleV+.085,-.35,.35);
      if(action==='release'){s.crankHeld=false;s.held=false;s.drag=false;s.target=s.piston;}
    }
    return {state:s,step,input,getState:()=>JSON.parse(JSON.stringify(s))};
  }
  const api={create,route,homePath,ground,waterY,clamp,smooth};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.CycleWorld=api;
})(globalThis);
