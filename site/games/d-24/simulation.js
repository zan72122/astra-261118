(function (root) {
  'use strict';
  const floor = [0.12, 1.37, 3.67], top = [1.37, 3.67, 5.02];
  const edges = [8, -2, -10.5, -19], stops = [4.0, -6.3, -14.6, -23];
  const equalHead = .002; // A two-millimetre head is below the local free-surface ripple.
  const NX = 7, NZ = 13, cap = (x, a, b) => Math.max(a, Math.min(b, x));
  function create(options = {}) {
    let seed = options.seed || 32819;
    function rand() { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }
    const water = Array.from({length: 4}, (_, k) => ({
      level: floor[k] ?? top[2], sill: floor[k] ?? top[2], target: top[k] ?? top[2], valve: 0, valveV: 0, flow: 0, discharge: 0,
      swirl: 0, gate: [0, 0], gateV: [0, 0], wetLine: (floor[k] ?? top[2])+.05, wheel: 0,
      drift: [rand(),rand()], wind: 0.08, gust: rand() * 0.1, gustLeft: rand(),
      cells: Array.from({length: NX * NZ}, () => ({h:(rand()-.5)*.014,v:(rand()-.5)*.045, force: 0}))
    }));
    if (options.firstHead !== undefined) water[0].target = water[0].level + options.firstHead;
    const boat = {x: -.16, z: stops[0], y: floor[0], vy:0, speed:0, yaw:.08, yawV:0, roll:0, rollV:0, pitch:0, pitchV:0};
    const fish = Array.from({length:4},(_,i)=>({x:-1.05+i*.55,z:-7.2+i*.55,y:0,vy:0,rest:2+i*2.9,above:false,jumps:0}));
    const foam = Array.from({length:100},()=>({x:0,z:0,y:0,vx:0,vz:0,age:0,life:0,r:0,k:0}));
    const birds = Array.from({length:8},(_,i)=>({x:6+i*.58,y:7.5+Math.sin(i)*.1,z:-43-i*.45,vy:0,vx:0,vz:0,wing:1.05,wv:0,air:0}));
    const sail = {x:-3.05,z:-25,speed:0,hoist:.23,load:0,panels:Array.from({length:8},(_,i)=>({bend:.05*i/8,v:0}))};
    const harbor = {bell:0,bellV:0, strikes:0, hoist:0, rotor:0, rotorV:0, light:0,
      flags:Array.from({length:13},()=>({a:rand()*.2,v:0}))};
    const dust=Array.from({length:35},()=>{const x=rand()*18-10,y=1.5+rand()*5,z=rand()*30-24;
      return {x,y,z,ox:x,oy:y,oz:z,vx:0,vy:0,vz:0,r:.007+rand()*.011,drag:.68+rand()*.88};});
    const vapour=Array.from({length:24},()=>({x:0,y:0,z:0,life:0,age:8,vx:0,vy:0,vz:0,r:0}));
    let vapourDebt=0,vapourIndex=0;
    const drops=Array.from({length:48},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,r:0,k:0,wet:false}));
    let dropDebt=0,dropCursor=0;
    const s={dust,vapour,drops,mode:'lock',index:0,cycle:0,elapsed:0,phaseTime:0,idle:0,held:false,water,boat,fish,foam,sail,harbor,birds,
      target:'valve0', hint:0, touchV:0, touched:'',touchA:0, returnIndex:2};
    let foamCursor=0, bubbleDebt=0, wakeDebt=0, fishCount=0, bellContact=false;
    function enter(mode, target='') { s.mode=mode;s.phaseTime=0;s.target=target;s.held=false;s.idle=0;s.hint=0; }
    function press(object) {
      s.touched=object;s.touchV=.75;
      if(object && object===s.target) { s.held=true;s.idle=0;s.hint=0;return true; }
      return false;
    }
    function release() { s.held=false; }
    function wave(k,x,z) {
      const row=cap(Math.round((k===3 ? (-z-19)/4 : (edges[k]-z)/(edges[k]-edges[k+1])*12)),0,NZ-1);
      return water[k].cells[row*NX+cap(Math.round((x+3)/6*6),0,6)].h;
    }
    function ripple(k,x,z,strength) {
      const j=Math.round(cap((edges[k]-z)/(edges[k]-edges[k+1] || 40),0,1)*12)*NX+Math.round(cap(x+3,0,6));
      if(water[k].cells[j]) water[k].cells[j].v+=strength;
    }
    function foamAt(k,x,z,vx,vz,r,life) {
      Object.assign(foam[foamCursor++ % foam.length],{x,z,y:water[k].level+.015,vx,vz,age:0,life,r,k});
    }
    function updateWater(dt) {
      water.forEach((w,k)=>{
        const up=s.mode==='lock' && s.index===k;
        const down=s.mode==='drain' && s.returnIndex===k;
        const desired= (up && s.held) || (down && w.level-floor[k]>equalHead) ? 1 : 0;
        w.valveV+=((desired-w.valve)*31-w.valveV*9)*dt; w.valve=cap(w.valve+w.valveV*dt,0,1);
        const diff=down ? floor[k]-w.level : w.target-w.level;
        const sealAngle=down ? w.gate[0] : (k>0?water[k-1].gate[0]:0);
        const seal=cap(1-sealAngle/.36,0,1);
        const conductance=(down?.30:[.45,.28,.42,0][k])*seal;
        w.flow=(up || down) ? diff*w.valve*conductance : 0;
        // A moving leaf equalises the remaining sub-wave head without snapping either surface.
        if(s.mode==='cross' && s.index===k)w.flow=diff*(w.valve*conductance+w.gate[0]*.9);
        w.discharge=k<3?w.flow*6.79*(edges[k]-edges[k+1]):0;
        w.level+=w.flow*dt; w.wheel+=w.valveV*dt*2.7;
        w.swirl+=(Math.abs(w.flow)*(k===1?2.65:1.05)-w.swirl)*dt*1.4;
        w.wetLine=Math.max(w.wetLine-.018*dt,w.level+.05+w.swirl*.025);
        let open=s.mode==='cross' && s.index===k && (k===2 || boat.z>edges[k+1]-2.85);
        if(k===2 && ['rig','cruise','welcome','lantern','salute','return'].includes(s.mode)) open=true;
        if(s.mode==='return' || s.mode==='backCross') open=k===s.returnIndex;
        // Two leaves bear different inertia and seat against physical end stops.
        w.gate.forEach((a,j)=>{
          w.gateV[j]+=((Number(open)*1.44-a)*(3.1+j*.32)-w.gateV[j]*(3.45+j*.15))*dt;
          w.gate[j]=cap(a+w.gateV[j]*dt,0,1.44);
        });
        w.gustLeft-=dt;
        if(w.gustLeft<=0){w.gust=(rand()-.34)*.48;w.gustLeft=.3+rand()*1.7;}
        w.wind+=(w.gust-w.wind)*dt*.75;
        w.drift[0]+=(.13+w.wind+.21*w.swirl)*dt;w.drift[1]+=(.07+w.wind*.19+w.flow*.7)*dt;
        const inlet= k===1 ? 10*NX+5 : 11*NX+5;
        w.cells.forEach((c,i)=>{
          const x=i%NX, z=Math.floor(i/NX);
          const neighbors=w.cells[(x?i-1:i)].h+w.cells[(x<NX-1?i+1:i)].h+w.cells[(z?i-NX:i)].h+w.cells[(z<NZ-1?i+NX:i)].h;
          const shore=(x===0 || z===0) ? w.wind*Math.sin(i*1.3+w.drift[0]*(2+i%3))*.16 : 0;
          c.force=8.5*(neighbors-4*c.h)-2*c.h-.75*c.v+shore;
          if(i===inlet) c.force+=w.flow*(.5+Math.sin(w.drift[1]*21)*1.7);
        });
        for(const c of w.cells){c.v+=c.force*dt;c.h+=c.v*dt;}
      });
    }
    function updateBoat(dt) {
      let targetZ=boat.z, cruise=0, bx=-.16;
      if(s.mode==='cross' && (water[s.index].gate[0]>1.12 || boat.z<edges[s.index+1])){targetZ=stops[s.index+1];cruise=1.02;}
      if(s.mode==='cruise'){targetZ=-45;cruise=.68+sail.load*.47;bx=-.8;}
      if(s.mode==='return'){targetZ=stops[2];cruise=1.36;}
      if(s.mode==='backCross' && water[s.returnIndex].gate[0]>1.12){targetZ=stops[s.returnIndex];cruise=1.12;}
      const speedTarget=Math.sign(targetZ-boat.z)*Math.min(cruise,Math.abs(targetZ-boat.z)*.78);
      boat.speed+=(speedTarget-boat.speed)*dt*1.8; boat.z+=boat.speed*dt;
      const k=boat.z>edges[1]?0:boat.z>edges[2]?1:boat.z>edges[3]?2:3;
      const w=water[k],surface=w.level+wave(k,boat.x,boat.z);
      boat.vy+=((surface-boat.y)*15-boat.vy*5.3)*dt;boat.y+=boat.vy*dt;
      const turning=['return','drain','backCross'].includes(s.mode);
      const yawTarget=(turning?Math.PI:0)+.055+w.wind*.074;
      boat.yawV+=((yawTarget-boat.yaw)*1.1-boat.yawV*2.15)*dt;boat.yaw+=boat.yawV*dt;
      boat.rollV+=((.6*(wave(k,1,boat.z)-wave(k,-1,boat.z))+w.wind*.033-boat.roll)*7-boat.rollV*1.6)*dt;
      boat.roll+=boat.rollV*dt;
      boat.pitchV+=((.22*(wave(k,0,boat.z-1)-wave(k,0,boat.z+1))-.017*boat.speed-boat.pitch)*9-boat.pitchV*2.8)*dt;boat.pitch+=boat.pitchV*dt;
      boat.x+=(bx+w.wind*.11-boat.x)*dt*.55;
      wakeDebt+=Math.abs(boat.speed)*dt*8;
      if(wakeDebt>=1){wakeDebt--;const side=rand()<.5?-1:1;foamAt(k,boat.x+side*(.65+rand()*.22),boat.z+Math.cos(boat.yaw)*1.55,side*.17,-boat.speed*.28,.048+rand()*.04,2+rand());}
    }
    function updateSurfaceLife(dt) {
      const k=s.mode==='drain'?s.returnIndex:Math.min(s.index,2),w=water[k];
      dropDebt+=Math.max(0,w.flow)*dt*69;
      while(dropDebt>=1){dropDebt--;const d=drops[dropCursor++%drops.length];
        Object.assign(d,{x:2.63+(rand()-.5)*.19,y:top[k]-.20,z:edges[k+1]+.96,
          vx:-.15-rand()*.38,vy:-.42-rand()*.27,vz:.36+w.flow*.9,r:.016+rand()*.035,k,wet:true});}
      for(const d of drops){if(!d.wet)continue;d.vy-=8.2*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;
        if(d.y<=water[d.k].level+wave(d.k,d.x,d.z)){
          d.wet=false;ripple(d.k,d.x,d.z,Math.min(.027,-d.vy*.006));foamAt(d.k,d.x,d.z,d.vx*.9,d.vz*.75,d.r*1.2,1.1+rand());}}

      bubbleDebt+=Math.abs(w.flow)*dt*54;
      while(bubbleDebt>=1){bubbleDebt--;foamAt(k,2.35-rand()*.65,edges[k+1]+.75+rand()*.45,-.3-rand()*.64,.28+rand()*.5,.03+rand()*.065,1.5+rand()*2.5);}
      foam.forEach(p=>{if(p.age>=p.life)return;p.age+=dt;
        const spin=water[p.k].swirl*.63, vx=p.vx;
        p.vx+=(-p.vz*spin-p.vx*.34)*dt;p.vz+=(vx*spin-p.vz*.34)*dt;
        p.x+=p.vx*dt;p.z+=p.vz*dt;p.y=water[p.k].level+wave(p.k,p.x,p.z)+.025;
      });
      fish.forEach((f,i)=>{
        f.rest-=dt;
        if(!f.above && f.rest<=0 && s.mode==='lock' && s.index===1 && water[1].swirl>.07) {
          f.vy=2.7+rand()*1.15;f.above=true;f.jumps++;fishCount++;
        }
        if(f.above){f.vy-=6.5*dt;f.y+=f.vy*dt;if(f.y<=0){ f.y=0;f.vy=0;f.above=false;f.rest=3+i+rand()*4;
          ripple(1,f.x,f.z,.18);for(let j=0;j<6;j++){const a=j*1.047;foamAt(1,f.x,f.z,Math.cos(a)*.6,Math.sin(a)*.6,.055,1.15);}}}
      });
    }
    function updateHarbor(dt) {
      const h=harbor,w=water[3];
      if(s.mode==='rig' && s.held) sail.hoist=cap(sail.hoist+dt*.16,0,1);
      if(s.mode==='return' || s.mode==='drain')sail.hoist=Math.max(.23,sail.hoist-.08*dt);
      sail.load+=((.59+w.wind*.78)*sail.hoist-sail.load)*dt*.8;
      sail.panels.forEach((p,i)=>{let force=sail.load*(.25+.75*Math.sin((i+.5)*Math.PI/8))+(i?sail.panels[i-1].bend-p.bend:0)*1.6;
        p.v+=(force-1.5*p.bend-.98*p.v)*dt;p.bend+=p.v*dt;});
      const dest=s.mode==='cruise'?boat.z+.48:s.mode==='welcome'||s.mode==='lantern'||s.mode==='salute'?-44.5:-25;
      sail.speed+=((cap((dest-sail.z)*.58,-1.4,1.0))-sail.speed)*dt;sail.z+=sail.speed*dt;
      const ringing=s.mode==='welcome' && s.held;
      h.bellV+=((ringing?1.7:0)-h.bell*6.2-h.bellV*.55)*dt;h.bell+=h.bellV*dt;
      if(ringing && !bellContact && h.bell>.28){h.strikes++;bellContact=true;h.bellV=-.8;}
      if(h.bell<.21)bellContact=false;
      if(s.mode==='welcome' && h.strikes>0)h.hoist=Math.min(1,h.hoist+dt*.108);
      if(s.mode==='return')h.hoist=Math.max(0,h.hoist-dt*.085);
      h.flags.forEach((p,i)=>{p.v+=((w.wind*(1+i*.035)+h.hoist*.17-p.a)*6-p.v*(.7+i*.04))*dt;p.a+=p.v*dt;});
      const lit=s.mode==='lantern' && s.held || s.mode==='salute';
      h.rotorV+=((lit?1.32:.02)-h.rotorV)*dt*.69;h.rotor+=h.rotorV*dt;
      h.light+=((lit?1:0)-h.light)*dt*(lit?.55:.18);
      birds.forEach((b,i)=>{
        const returning=b.air>0 && s.mode!=='salute';
        if(returning){
          const dx=6+i*.58-b.x,dy=7.5+Math.sin(i)*.1-b.y,dz=-43-i*.45-b.z;
          b.vx+=(cap(dx*.8,-2.4,2.4)-b.vx)*dt*2.1;b.vy+=(cap(dy*.72,-1.75,1.15)-b.vy)*dt*2.1;
          b.vz+=(cap(dz*.8,-2.4,2.4)-b.vz)*dt*2.1;
          b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.wv+=(10*(1.05*cap(1-Math.hypot(dx,dy,dz)*.65,0,1)-b.wing)-3*b.wv)*dt;b.wing+=b.wv*dt;
          if(Math.hypot(dx,dy,dz)<.012 && Math.hypot(b.vx,b.vy,b.vz)<.02){b.air=0;b.vx=0;b.vy=0;b.vz=0;}
        }else if(s.mode==='salute' && s.phaseTime>.65*i || b.air>0){
          b.air+=dt;b.vy+=((b.air<3?1.9:.19)-b.vy)*dt;
          b.vx+=((-.8-i*.07)-b.vx)*dt*.7;b.vz+=(-.85-b.vz)*dt;
          b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
          b.wv+=(-24*b.wing-b.wv*.95)*dt;if(b.wing<.03 && b.wv<=0 && b.air<13+i)b.wv+=1.95+i*.07;
          b.wing+=b.wv*dt;
        }else{b.wv+=(10*(1.05-b.wing)-3.5*b.wv)*dt;b.wing+=b.wv*dt;}
      });
    }
    function updateAir(dt) {
      const b=boat,w=water[s.index];
      dust.forEach((d,i)=>{const local=water[i%4];
        d.vx+=(local.wind*d.drag*.75-(d.x-d.ox)*.09-d.vx*.55)*dt;
        d.vy+=((local.gust-w.wind)*.085-(d.y-d.oy)*.085-d.vy*.47)*dt;
        d.vz+=(local.wind*.27-(d.z-d.oz)*.11-d.vz*.51)*dt;
        d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;
      });
      vapourDebt+=dt*(1.7+Math.abs(b.speed)*1.2);
      if(vapourDebt>=1){vapourDebt--;Object.assign(vapour[vapourIndex++%vapour.length],{
        x:b.x-.80*Math.sin(b.yaw),y:b.y+2.58,z:b.z-.80*Math.cos(b.yaw),vx:-.05+w.wind*.35,
        vy:.33+rand()*.18,vz:-.08+rand()*.12,r:.06+rand()*.055,age:0,life:1.9+rand()*1.2});}
      vapour.forEach(p=>{if(p.age>=p.life)return;p.age+=dt;p.vx+=(w.wind-.27-p.vx)*dt*.6;p.vy-=p.vy*.17*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.r+=dt*.087;});
    }
    function transitions() {
      const i=s.index,k=s.returnIndex;
      if(s.mode==='lock' && water[i].target-water[i].level<equalHead) enter('cross');
      else if(s.mode==='cross' && Math.abs(boat.z-stops[i+1])<.06 && Math.abs(boat.speed)<.06) {
        if(i<2){s.index++;enter('lock','valve'+s.index);}else enter('rig','sail');
      } else if(s.mode==='rig' && sail.hoist>.995)enter('cruise');
      else if(s.mode==='cruise' && boat.z<-44.93 && Math.abs(boat.speed)<.06)enter('welcome','bell');
      else if(s.mode==='welcome' && harbor.hoist>=1)enter('lantern','lamp');
      else if(s.mode==='lantern' && harbor.light>.966)enter('salute');
      else if(s.mode==='salute' && s.phaseTime>12){s.returnIndex=2;enter('return');}
      else if((s.mode==='return' || s.mode==='backCross') && Math.abs(boat.z-stops[k])<.05 && Math.abs(boat.speed)<.06)enter('drain');
      else if(s.mode==='drain' && water[k].level-floor[k]<equalHead && water[k].valve<.00001) {
        if(k>0){s.returnIndex--;enter('backCross');}
        else{s.index=0;s.returnIndex=2;s.cycle++;harbor.strikes=0;enter('lock','valve0');}
      }
    }
    function tick(dt){s.elapsed+=dt;s.phaseTime+=dt;s.idle=s.held?0:s.idle+dt;
      if(s.target && s.idle>=4)s.hint+=dt;else s.hint=0;
      s.touchV+=(-28*s.touchA-5*s.touchV)*dt;s.touchA+=s.touchV*dt;
      updateWater(dt);updateBoat(dt);updateSurfaceLife(dt);updateHarbor(dt);updateAir(dt);transitions();}
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;const n=Math.ceil(dt/(1/60));for(let i=0;i<n;i++)tick(dt/n);}
    return {step,press,release,wave,state:s,getState:()=>JSON.parse(JSON.stringify(s))};
  }
  const api={create,edges,stops,floor,top,NX,NZ};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.LockWater=api;
})(typeof window==='undefined'?globalThis:window);
