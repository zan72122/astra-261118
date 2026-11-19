(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GardenPhysics = factory();
})(globalThis, function () {
  'use strict';
  const TAU = Math.PI * 2, G = 9.81, NX = 40, NZ = 34, CELL = .32;
  const X0 = -NX * CELL / 2, Z0 = -NZ * CELL / 2;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  function random(seed) {
    return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function makeLayout(narrow) {
    return {
      head: { x: narrow ? -.56 : -.83, z: narrow ? 1.68 : 1.32, y: .79 },
      pot: { x: narrow ? -.96 : -1.93, z: narrow ? -.64 : -.70, y: .81, r: .49 },
      bike: { x: narrow ? .65 : 1.70, z: narrow ? -2.21 : -1.78, y: .70 },
      narrow: !!narrow
    };
  }
  function aimPoint(layout, phase) {
    if(phase===1)return layout.pot;
    const yaw=layout.narrow?-.39:-.22;
    return {x:layout.bike.x+.49*Math.cos(yaw),y:.95,z:layout.bike.z-.49*Math.sin(yaw)};
  }
  function create(options = {}) {
    let layout = makeLayout(options.narrow), cycle = 0, phase = 0, elapsed = 0, stageAge = 0;
    const rng = random(options.seed || 23119), windRandom=random((options.seed||23119)^0x4822);
    let moteId=0;
    const s = {
      cells: [], packets: [], flecks: [], air: [], rim: [], mud: [],
      flow: .105, valve: .105/.4, valveVelocity: 0, setting: .105/.4, rpm: 1.3,
      heading: -.2, yawSpeed: 0, aim: null, locked: false, touched: false,
      rainbow: 0, mist: 0, mistX: layout.head.x, mistY: 1.06, mistZ:layout.head.z-1.4, dose: 0, potL: 0, overflowL: 0, spillRate: 0, wave: 0, waveV: 0,
      wheel: 0, wheelV: 0, kick: 0, torque: 0, evening: 0, leafLift: .15, leafSpeed: 0, leafX: .07, leafZ: .07, leafVX: 0, leafVZ: 0,
      drying: 0, idle: 0, breeze: .27, gust: .23, gustLeft: .8,
      wiggle: { valve: 0, head: 0, pot: 0, bike: 0 }, wiggleV:{valve:0,head:0,pot:0,bike:0}, ping: 0, guide: 0
    };
    for (let i = 0; i < NX*NZ; i++) s.cells.push({
      soil: 0, film: 0, dew: 0, bend: rng()*.015, velocity: 0, exposure: .35+rng()*.65,
      spring: 9+rng()*13, hit: 0, lateral: 0
    });
    for (let i=0;i<10;i++) s.rim.push({ height: rng()*.09, film: 0, dripped: 0 });
    for (let i=0;i<24;i++) s.mud.push({ mass: .12+.10*rng(), initial: 0, film: 0, load: 0, angle: TAU*i/24, looseness: .7+.6*rng() });
    s.mud.forEach(m=>m.initial=m.mass);
    for(let i=0;i<38;i++) s.air.push({id:++moteId,x:rng()*12-6, y:.1+rng()*3.9, z:rng()*9-4, vy:0, buoy:.018+rng()*.055, drag:.3+rng(), vx:0});
    const cap = 6.4, lanes=9;
    let emission=0, serial=0, dryAge=0, closeAtDusk=0, targetHold=0, spillAtCycleStart=0;
    const cellIndex=(x,z)=>clamp(Math.floor((x-X0)/CELL),0,NX-1)+NX*clamp(Math.floor((z-Z0)/CELL),0,NZ-1);
    function wet(x,z,litres) {
      const gx=(x-X0)/CELL-.5, gz=(z-Z0)/CELL-.5, ix=Math.floor(gx), iz=Math.floor(gz);
      for(let dz=0;dz<2;dz++) for(let dx=0;dx<2;dx++){
        const cx=ix+dx, cz=iz+dz;
        if(cx<0||cx>=NX||cz<0||cz>=NZ) continue;
        const c=s.cells[cz*NX+cx], q=litres*(dx?gx-ix:1-gx+ix)*(dz?gz-iz:1-gz+iz);
        c.film+=q*.84; c.dew+=q*.16; c.hit+=q*12;
      }
    }
    function setStage(next) {
      phase=next; stageAge=0; s.idle=0; targetHold=0; s.aim=null; s.locked=false;
      s.ping+=1;
      if(next===3) closeAtDusk=s.setting;
    }
    function touch(part, value) {
      s.idle=0;
      if (!(part in s.wiggle)) return;
      s.wiggleV[part]=Math.min(3.5,s.wiggleV[part]+2.2);
      if(phase>=3) return;
      if(part==='valve'){
        s.touched=true;
        s.setting=clamp(value===undefined? (phase===0 ? .90 : .84):value,0,1);
      }
      if(part==='head' || (part==='pot'&&phase===1) || (part==='bike'&&phase===2)){
        if(phase===0 && part==='head'){s.touched=true; s.setting=Math.max(.67,s.setting);}
        if(part==='head'&&Number.isFinite(value)){
          s.aim=value; s.locked=false; targetHold=8;
        } else if(phase===1||phase===2) {
          const target=aimPoint(layout,phase);
          s.aim=Math.atan2(target.x-layout.head.x,layout.head.z-target.z);
          s.locked=true; s.setting=Math.max(.77,s.setting);
          if(phase===2) s.kick=Math.min(2.8,s.kick+1.2);
          if(phase===1){s.waveV=Math.min(.15,s.waveV+.049);s.leafVX+=.045*clamp(s.potL,0,1);}
        }
      }
    }
    function emit(dt){
      emission+=dt;
      const gap=.047;
      if(emission<gap)return;
      emission-=gap;
      if(s.flow<.002)return;
      const h=layout.head, target=aimPoint(layout,phase);
      const desiredAngle=Math.atan2(target.x-h.x,h.z-target.z);
      const dist=Math.hypot(target.x-h.x,target.z-h.z);
      // A spring-loaded deflector sets the throw when its target is inside the catch.
      const catchAim=(phase===1||phase===2)?Math.exp(-Math.pow(wrap(s.heading-desiredAngle)/.27,2)):0;
      const speed=3.25+1.7*Math.sqrt(s.flow/.4), vy=2.75+.54*Math.sqrt(s.flow/.4);
      const flight=(vy+Math.sqrt(vy*vy+2*G*(h.y-target.y+.035)))/G;
      const vHorizontal=speed+((dist-.23)/flight-speed)*catchAim, row=++serial;
      for(let j=0;j<lanes;j++){
        const fan=(j-4)/4, ang=s.heading+fan*(.17-.09*catchAim)+(rng()-.5)*.012;
        const vx=vHorizontal*(1-.065*fan*fan), lift=vy+.10*fan+(rng()-.5)*.036;
        s.packets.push({ x:h.x+Math.sin(ang)*.239+Math.cos(ang)*.10,y:h.y+.033,z:h.z-Math.cos(ang)*.239+Math.sin(ang)*.10,
          vx:Math.sin(ang)*vx,vy:lift,vz:-Math.cos(ang)*vx,volume:s.flow*gap/lanes,
          lane:j,row, age:0, type:0, targetHit:false });
      }
    }
    function splash(x,y,z,force,kind=0){
      if(s.flecks.length>165)return;
      const a=rng()*TAU, v=.22+rng()*force;
      s.flecks.push({x,y,z,vx:Math.cos(a)*v,vy:.4+rng()*force,vz:Math.sin(a)*v,r:.009+rng()*.012,kind});
    }
    // Packets carry litres and m/s. Gravity acts up to a rim, wheel or ground contact.
    // Only neighbouring emissions form a jet; older packets continue after shutoff.
    function advanceWater(dt) {
      const pot=layout.pot,b=layout.bike,yaw=layout.narrow?-.39:-.22,cs=Math.cos(yaw),sn=Math.sin(yaw);
      let write=0;
      for(const p of s.packets){
        const prev=p.y; p.age+=dt;
        p.x+=p.vx*dt; p.z+=p.vz*dt; p.y+=p.vy*dt-.5*G*dt*dt; p.vy-=G*dt;
        if(prev>=pot.y && p.y<=pot.y && Math.hypot(p.x-pot.x,p.z-pot.z)<pot.r){
          s.potL+=p.volume; s.waveV+=p.volume*.31;
          s.leafVX+=p.volume*p.vx*.035; s.leafVZ+=p.volume*p.vz*.035;
          if(p.lane%4===0)splash(p.x,pot.y,p.z,.49); continue;
        }
        const bx=(p.x-b.x)*cs-(p.z-b.z)*sn-.83, by=p.y-.572;
        const depth=(p.x-b.x)*sn+(p.z-b.z)*cs+.105*p.y;
        const radius=Math.hypot(bx,by);
        if(!p.targetHit && Math.abs(depth)<.105 && radius>.35 && radius<.635){
          p.targetHit=true;
          const angle=Math.atan2(by,bx);
          const sector=Math.floor(((angle-s.wheel)%TAU+TAU)%TAU/TAU*s.mud.length);
          const m=s.mud[sector]; m.load+=p.volume*.44;
          s.torque+=p.volume*(s.locked?2.1:1.7); p.volume*=.56;
          if(p.lane%3===0)splash(p.x,p.y,p.z,.84,m.mass>.02?1:0);
          p.vz*=.15; p.vx*=.20; p.vy=-Math.abs(p.vy)*.28;
        }
        if(p.y<=.02){
          wet(p.x,p.z,p.volume); if(p.lane===3||p.lane===7)splash(p.x,.04,p.z,.67); continue;
        }
        s.packets[write++]=p;
      }
      s.packets.length=write; write=0;
      for(const f of s.flecks){
        f.x+=f.vx*dt; f.z+=f.vz*dt; f.y+=f.vy*dt; f.vy-=G*dt;
        if(f.y>0)s.flecks[write++]=f;
      }
      s.flecks.length=write;
    }
    // Head above each lip feeds a separate film in litres. Surface tension holds a
    // drop until 6 mL separates. The floating leaf retains horizontal and vertical momentum.
    function updatePot(dt) {
      const surplus=Math.max(0,s.potL-cap), spill=Math.min(surplus, surplus*2.6*dt);
      s.potL-=spill; s.overflowL+=spill; s.spillRate=spill/dt;
      s.waveV+=(-26*s.wave-3.1*s.waveV)*dt; s.wave+=s.waveV*dt;
      const surface=.15+.64*clamp(s.potL/cap,0,1);
      s.leafSpeed+=((surface-s.leafLift)*13-s.leafSpeed*3)*dt; s.leafLift+=s.leafSpeed*dt;
      const mobile=clamp(s.potL/.32,0,1);
      s.leafVX+=(-.79*s.leafVX-.38*s.leafX)*dt*mobile;
      s.leafVZ+=(-.79*s.leafVZ-.38*s.leafZ)*dt*mobile;
      s.leafX+=s.leafVX*dt*mobile; s.leafZ+=s.leafVZ*dt*mobile;
      const shore=.16+.15*clamp(s.potL/cap,0,1), reach=Math.hypot(s.leafX,s.leafZ);
      if(reach>shore){s.leafX*=shore/reach;s.leafZ*=shore/reach;s.leafVX*=.89;s.leafVZ*=.89;}
      const pot=layout.pot;
      const weights=s.rim.map(r=>Math.max(0,.032+surplus-r.height));
      const total=weights.reduce((a,b)=>a+b,0);
      s.rim.forEach((r,i)=>{
        r.film+=total?spill*weights[i]/total:0;
        const out=r.film*(1-Math.exp(-dt*2.4)); r.film-=out; r.dripped+=out;
        if(r.dripped>.006){
          const a=TAU*i/10,x=pot.x+Math.cos(a)*pot.r,z=pot.z+Math.sin(a)*pot.r;
          s.packets.push({x,y:pot.y-.03,z,vx:.11*Math.cos(a),vy:-.35,vz:.11*Math.sin(a),age:0,volume:r.dripped,lane:-1,row:-1,type:1,targetHit:true}); r.dripped=0;
        }
      });
    }
    // Mud is measured in grams per rim sector. Water load drives erosion and torque;
    // drainage and bearing friction continue after a jet passes or a finger lifts.
    function updateBike(dt) {
      s.wheelV+=s.torque+s.kick*dt; s.torque=0;s.kick*=Math.exp(-dt*4.2);
      s.wheelV*=Math.exp(-.41*dt); s.wheel+=s.wheelV*dt;
      for(const m of s.mud){
        m.film+=m.load; m.load=0;
        const washed=Math.min(m.mass, m.film*(.42+.24*Math.abs(s.wheelV))*m.looseness*dt);
        m.mass-=washed;
        const runoff=m.film*(1-Math.exp(-dt*(.46+.10*Math.abs(Math.cos(m.angle+s.wheel)))));
        m.film-=runoff;
        if(runoff>.00000001){
          const yaw=layout.narrow?-.39:-.22,lx=.83+.53*Math.cos(m.angle+s.wheel);
          wet(layout.bike.x+lx*Math.cos(yaw),layout.bike.z-lx*Math.sin(yaw)+.09,runoff);
        }
        if(phase===4)m.mass=Math.min(m.initial,m.mass+(.009+.008*Math.abs(s.breeze))*s.drying*dt*m.looseness);
      }
    }
    // Per 32 cm cell, blade water over capacity falls to the ground. Free surface
    // water infiltrates the soil. Exposure governs evaporation and grass spring return.
    function updateGarden(dt) {
      s.gustLeft-=dt;
      if(s.gustLeft<=0){s.gustLeft=.5+windRandom()*2; s.gust=(windRandom()-.28)*.85;}
      s.breeze+=(s.gust-s.breeze)*(1-Math.exp(-dt*.83));
      s.drying+=((phase===4?1:0)-s.drying)*(1-Math.exp(-dt*.82));
      // Surface head moves a conservative share to each lower neighbour before
      // infiltration. A held jet can wet an expanding patch around a saturated cell.
      for(let i=0;i<s.cells.length;i++){
        const c=s.cells[i];if(c.film<.018)continue;
        const head=c.film+.016*c.exposure;
        const spread=j=>{
          const d=s.cells[j],amount=Math.max(0,head-d.film-.016*d.exposure)*Math.min(.19,1.55*dt);
          c.lateral-=amount;d.lateral+=amount;
        };
        if(i>=NX)spread(i-NX);if(i+NX<s.cells.length)spread(i+NX);
        if(i%NX)spread(i-1);if(i%NX!==NX-1)spread(i+1);
      }
      for(const c of s.cells){
        c.film+=c.lateral;c.lateral=0;
        const room=Math.max(0,1-c.soil/(.19+.11*c.exposure));
        const absorb=c.film*(1-Math.exp(-dt*(.25+.33*c.exposure)))*room;
        c.soil+=absorb; c.film-=absorb;
        const evap=.006+1.32*s.drying;
        c.film*=Math.exp(-s.drying*1.56*c.exposure*dt);
        c.soil*=Math.exp(-evap*c.exposure*dt);
        c.dew*=Math.exp(-(.010+1.3*s.drying)*c.exposure*dt);
        if(c.dew>.027){ const excess=(c.dew-.027)*(1-Math.exp(-dt*3)); c.film+=excess; c.dew-=excess; }
        c.velocity+=((s.breeze*c.exposure*.22-c.bend)*c.spring-c.velocity*3.7)*dt+c.hit/(1+c.soil);
        c.hit=0; c.bend+=c.velocity*dt;
      }
      for(const a of s.air){
        a.vx+=(s.breeze*.40-a.vx)*a.drag*dt;
        a.vy+=(a.buoy*(.7+s.breeze)-a.vy)*dt;
        a.x+=a.vx*dt; a.y+=a.vy*dt;
        // An outgoing mote leaves the volume; the next mote has its own identity and momentum.
        if(a.x>7||a.y>4.5){a.id=++moteId;a.x=windRandom()*11-5.5;a.y=.11;a.z=windRandom()*8-4;a.vx=0;a.vy=0;}
      }
    }
    function tick(dt) {
      elapsed+=dt; stageAge+=dt; s.idle+=dt; targetHold=Math.max(0,targetHold-dt);
      if(s.idle>4)s.guide+=dt;
      for(const k of Object.keys(s.wiggle)){
        s.wiggleV[k]+=(-74*s.wiggle[k]-6.4*s.wiggleV[k])*dt;
        s.wiggle[k]+=s.wiggleV[k]*dt;
      }
      if(phase===3){
        s.setting=closeAtDusk*clamp(1-stageAge/18,0,1);
        s.evening=Math.min(1,s.evening+dt/21);
      } else if(phase===4){
        s.setting=0; s.evening=Math.max(0,s.evening-dt/20);
        s.potL=Math.max(0,s.potL-dt*.40); dryAge+=dt;
      }
      s.valveVelocity+=((s.setting-s.valve)*19-s.valveVelocity*8.7)*dt;
      s.valve=clamp(s.valve+s.valveVelocity*dt,0,1);
      s.flow+=(s.valve*.4-s.flow)*(1-Math.exp(-dt*2.8));
      if(s.flow<.00008 && s.setting===0)s.flow=0;
      const free=!s.locked&&targetHold<=0;
      const rpmTarget=free?40*Math.pow(s.flow/.4,1.35):0;
      s.rpm+=(rpmTarget-s.rpm)*(1-Math.exp(-dt*(free?.58:2.8)));
      if(s.flow===0&&s.rpm<.006)s.rpm=0;
      if(free)s.aim=null;
      const steering=s.aim===null?0:clamp(wrap(s.aim-s.heading)*4.0,-2.6,2.6);
      s.yawSpeed+=(clamp(steering+s.rpm*TAU/60,-TAU*2/3,TAU*2/3)-s.yawSpeed)*(1-Math.exp(-dt*4.3));
      if(s.rpm===0&&s.aim===null&&Math.abs(s.yawSpeed)<.001)s.yawSpeed=0;
      s.heading+=s.yawSpeed*dt;
      emit(dt); advanceWater(dt); updatePot(dt); updateBike(dt); updateGarden(dt);
      // Backlit suspended spray leaves a slowly advecting scattering volume.
      let mx=0,my=0,mz=0,weight=0;
      for(const p of s.packets){
        if(p.type||p.age<.25||p.y<.22||p.z>layout.head.z+.18)continue;
        mx+=p.x*p.volume;my+=p.y*p.volume;mz+=p.z*p.volume;weight+=p.volume;
      }
      if(weight>0){const k=1-Math.exp(-dt*.95);s.mistX+=(mx/weight-s.mistX)*k;
        s.mistY+=(my/weight-s.mistY)*k;s.mistZ+=(mz/weight-s.mistZ)*k;}
      s.mistX+=s.breeze*.025*dt;
      const spray=s.packets.length ? Math.min(1,s.flow/.32)*clamp(s.rpm/8,.25,1):0;
      s.mist+=(spray-s.mist)*(1-Math.exp(-dt*1.2));
      s.rainbow+=(s.mist*(phase===0?1:.18)-s.rainbow)*(1-Math.exp(-dt*.65));
      if(phase===0&&s.touched){s.dose+=s.flow*s.mist*dt;if(s.dose>5.6)setStage(1);}
      if(phase===1&&s.overflowL-spillAtCycleStart>.92)setStage(2);
      if(phase===2&&s.mud.every(m=>m.mass<m.initial*.18))setStage(3);
      if(phase===3&&stageAge>28&&s.rpm===0){dryAge=0;setStage(4);}
      if(phase===4&&dryAge>22){
        cycle++; spillAtCycleStart=s.overflowL; s.touched=false; s.dose=0;s.setting=.105/.4;setStage(0);
      }
    }
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;const n=Math.ceil(dt*60-1e-9);for(let i=0;i<n;i++)tick(dt/n);}
    function getState(){
      return {phase,cycle,elapsed,stageAge,flow:s.flow,rpm:s.rpm,heading:s.heading, valve:s.valve,
        wheel:s.wheel,wheelV:s.wheelV,rainbow:s.rainbow,potL:s.potL,overflowL:s.overflowL,evening:s.evening,leaf:[s.leafX,s.leafLift,s.leafZ],nozzleSpeed:s.yawSpeed,
        breeze:s.breeze,packetCount:s.packets.length,guide:s.idle>=4,
        rim:s.rim.map(r=>r.film),mud:s.mud.map(m=>m.mass),cells:s.cells.map(c=>[c.soil,c.film,c.dew,c.bend]),
        air:s.air.map(a=>[a.x,a.y,a.z,a.id]),
        mist:s.mist,spillRate:s.spillRate,wave:s.wave,film:s.mud.map(m=>m.film)};
    }
    function flick(turn){
      if(phase!==2||!Number.isFinite(turn))return;
      s.kick=clamp(s.kick+turn*2.6,-4,4);s.idle=0;
    }
    return {s,step,getState,touch,flick,cellIndex,cap,get layout(){return layout;},setNarrow(v){layout=makeLayout(v);},
      get target(){return aimPoint(layout,phase);}, get phase(){return phase;},get age(){return stageAge;},get cycle(){return cycle;}};
  }
  return {create,random,NX,NZ,CELL,X0,Z0,TAU};
});
