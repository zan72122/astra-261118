/* All distances are in kitchen units (2.5 cm). Integration uses seconds. */
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = PI * 2, N = 48, R = 8, H = 1.54;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const exp = (rate, dt) => 1 - Math.exp(-rate * dt);
  const ringDistance = (a, b) => Math.atan2(Math.sin(a-b), Math.cos(a-b));
  const ease = v => v*v*(3-2*v);
  function create(options = {}) {
    let seed = options.seed || 539, clock = 0, finger = null, events = [], cycle = 0;
    function rand() { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
    let s, cells, rims, cord, gustTarget = 0, gustTime = 0;
    function fresh(dropping) {
      const mass = options.mass ?? 1;
      s = {phase:'spread', age:0, idle:0, mass, flat:0, spreadWork:0, berry:0, placed:false,
        coverage:0, mark:0, imprint:0, roll:0, rollGoal:0, pinch:0, turn:0, turnGoal:0,
        insert:0, pull:0, cutGoal:0, split:0, delivery:0, sent:false, selected:1,
        introBond:!dropping, introLift:0, introEnd:-1, peelTack:.56, peelPowder:.2, peelHz:495.2, pluckHz:0, thread:0, threadV:0, threadX:0, threadZ:0,
        drop:dropping?.95:0, dropV:0, wobble:0, wobbleV:0,
        wind:.02, sun:.74, steam:.12, dust:0, dustV:0, cue:0, cycle};
      cord=Array.from({length:28},(_,i)=>({u:i/27,displacement:0,speed:0,tension:0,powder:.034+.012*Math.cos(i*.41)}));
      rims = Array.from({length:N},(_,i)=>({angle:i*TAU/N, ear:0, earV:0, plastic:0, dx:0, dz:0, fold:0, target:0, weld:0}));
      cells = Array.from({length:(R+1)*N},(_,k)=>{
        const i=k%N, u=Math.floor(k/N)/R, a=rims[i].angle;
        const variation=.5+.23*Math.sin(a*3+.7)*u+.17*Math.cos(a*5-1.1)*u;
        return {u,a, x:Math.cos(a)*u, z:Math.sin(a)*u, temp:(options.temp??44)+1.6*(1-u)+variation,
          water:clamp((options.water??.69)+.055*variation-.035*u),powder:clamp((options.powder??.20)+.11*u*variation),
          thick:mass*(.16+.77*Math.pow(1-u*u,.72))*(1+.06*u*Math.cos(3*a)),
          dent:0, dentV:0, set:0, heave:0, strainX:0,strainZ:0, tack:0, firm:0, evaporation:0};
      });
      for(const c of cells){
        c.tack=clamp(c.water*(1-c.powder)*(.68+(c.temp-22)*.014));
        c.firm=clamp(.35+.45*c.powder+.35*(1-c.water)+(44-c.temp)*.006);
        c.evaporation=Math.max(0,c.temp-22)*(.000013+.000009*c.u)*c.water*(1+.5*s.wind);
      }
      finger=null;
    }
    fresh(false);
    function phase(p){s.phase=p;s.age=0;s.idle=0;events.push(p);}
    function down(tool,x,z) {
      if (finger) return false;
      const allowed={spread:['dough'],berry:['berry'],fold:['rim'],roll:['seam'],cut:['loop','turn'],serve:['half']};
      if (!(allowed[s.phase]||[]).includes(tool)) return false;
      const a = Math.atan2(z,x);
      finger={tool,x,z,ox:x,oz:z,lastX:x,lastZ:z,a,length:0,age:0,drag:0,speed:0,
        rim:Math.hypot(x,z)>.78, index:(Math.round(a*N/TAU)+N)%N,baseRoll:s.rollGoal,baseTurn:s.turnGoal};
      s.idle=0;
      if (tool==='dough'&&s.introBond){s.introBond=false;s.introEnd=s.age;}
      if (tool==='seam') s.pinch=1;
      if (tool==='half') s.selected=x<0?-1:1;
      events.push('touch'); return true;
    }
    function move(x,z){if(finger){finger.x=clamp(x,-5,5);finger.z=clamp(z,-5,5);}}
    function foldAt(f,strength) {
      const r=rims[f.index], width=.65+.42*r.ear+.28*clamp(f.drag);
      rims.forEach(b=>{
        const d=Math.abs(ringDistance(b.angle,f.a));
        b.target=clamp(b.target+strength* Math.exp(-Math.pow(d/width,4)));
      });
    }
    function up() {
      if (!finger) return;
      const f=finger;
      if(f.tool==='dough'||f.tool==='rim'){
        const local=cells[Math.min(R,Math.round(Math.hypot(f.ox,f.oz)*R/1.45))*N+f.index];
        s.peelTack=local.tack;s.peelHz=372+220*local.tack;s.peelPowder=local.powder;
        s.threadX=f.x;s.threadZ=f.z;s.threadV=2.8+local.tack;
        events.push('peel');
      }
      if(f.tool==='berry') s.placed=true;
      if(f.tool==='rim' && (f.drag>.08||f.length<.19))foldAt(f,.98);
      if(f.tool==='seam'&&f.length<.14) s.rollGoal=clamp(s.rollGoal+.32);
      if(f.tool==='loop'&&f.length<.14)s.cutGoal=clamp(s.cutGoal+.52);
      if(f.tool==='half')s.sent=true;
      finger=null;s.idle=0;
    }
    function advance(dt){
      clock+=dt;s.age+=dt;s.idle=finger?0:s.idle+dt;
      gustTime-=dt;
      if(gustTime<=0){gustTime=.6+rand()*1.9;gustTarget=(rand()-.43)*.6;}
      s.wind+=(gustTarget-s.wind)*exp(.9,dt);
      s.sun+=(.74+.18*s.wind-s.sun)*exp(.6,dt);
      s.cue+=(Number(s.idle>3.85)-s.cue)*exp(3.4,dt);
      let dx=0,dz=0, speed=0, effective=0;
      if(finger){
        const f=finger;f.age+=dt;dx=f.x-f.lastX;dz=f.z-f.lastZ;
        const ds=Math.hypot(dx,dz);speed=ds/dt;f.speed+=(speed-f.speed)*exp(15,dt);
        f.length+=ds;f.lastX=f.x;f.lastZ=f.z;
        const outward=dx*Math.cos(f.a)+dz*Math.sin(f.a);
        if(f.tool==='dough'){
          effective=ds*(f.rim?.49:1);
          s.spreadWork=clamp(s.spreadWork+effective*.47/s.mass,0,1.5);
        }
        if((f.tool==='dough'||f.tool==='rim')&&f.rim&&outward>0){
          rims.forEach(r=>{
            const w=Math.exp(-Math.pow(ringDistance(r.angle,f.a)/.43,2));
            const gain=w*outward*(.34+1.45/(1+f.speed*.62));
            r.plastic=clamp(r.plastic+gain,0,1.35);
            r.dx=clamp(r.dx+dx*w,-1.4,1.4);r.dz=clamp(r.dz+dz*w,-1.4,1.4);
          });
        }
        if(f.tool==='rim'){
          const inward=-outward;
          if(inward>0){f.drag+=inward;foldAt(f,inward*.79);}
        }
        if(f.tool==='berry' && f.length>.35)s.placed=true;
        if(f.tool==='seam')s.rollGoal=clamp(f.baseRoll+Math.max(0,f.x-f.ox)*.63+f.length*.12);
        if(f.tool==='turn')s.turnGoal=clamp(s.turnGoal+dx*.75+dz*.35,-1.57,1.57);
        if(f.tool==='loop')s.cutGoal=clamp(s.cutGoal+ds*.81);
        if(f.tool==='half'&&f.length>.4)s.sent=true;
      }
      s.flat+=(clamp(s.spreadWork)-s.flat)*exp(2.8,dt);
      s.roll+=(s.rollGoal-s.roll)*exp(4.2,dt);
      s.turn+=(s.turnGoal-s.turn)*exp(4,dt);
      s.pull+=(s.cutGoal-s.pull)*exp(5.2,dt);
      let sumFold=0, vapor=0;
      for(let i=0;i<N;i++){
        const r=rims[i],c=cells[R*N+i];
        r.earV+=((r.plastic-r.ear)*38-9*r.earV)*dt;r.ear+=r.earV*dt;
        const adjacent=(rims[(i+1)%N].fold+rims[(i+N-1)%N].fold)*.5;
        r.weld+=((c.tack*(1-c.powder)*clamp(adjacent*r.fold*2.3))-r.weld)*exp(2.5,dt);
        r.target=clamp(Math.max(r.target,adjacent*r.weld));
        if(s.coverage>.87&&adjacent>.38)r.target=clamp(r.target+dt*r.weld*.85);
        r.fold+=(r.target-r.fold)*exp(2.8+.9*r.weld,dt);
        sumFold+=r.fold;
      }
      s.coverage=sumFold/N;
      for(let k=0;k<cells.length;k++){
        const c=cells[k],r=rims[k%N], u=c.u;
        const px=c.x*(1.17+.49*s.flat)+r.ear*Math.cos(c.a)*u*u;
        const pz=c.z*(1.06+.44*s.flat)+r.ear*Math.sin(c.a)*u*u;
        const pressed=finger && (finger.tool==='dough'||finger.tool==='rim');
        const w=pressed?Math.exp(-((px-finger.x)**2+(pz-finger.z)**2)/(.115+.04*finger.age/(1+finger.age))):0;
        c.evaporation=Math.max(0,c.temp-22)*(.000013+.000009*u)*c.water*(1+.5*s.wind);
        c.temp-=(c.temp-22)*(.0036+.0021*u+.0012*c.powder)*dt;
        c.water=clamp(c.water-c.evaporation*dt-.001*w*dt,.26,.95);
        c.tack=clamp(c.water*(1-c.powder)*(.68+(c.temp-22)*.014));
        c.firm=clamp(.35+.45*c.powder+.35*(1-c.water)+(44-c.temp)*.006);
        const contact=clamp(1-Math.abs(Math.cos(c.a)*(.25+.75*u)-(2*s.roll-1))/.54);
        if(s.phase==='roll' && s.roll>.015 && s.roll<.999)
          c.powder=clamp(c.powder+dt*contact*(.02+2.4*Math.abs(s.rollGoal-s.roll))*(1-c.powder));
        c.powder=clamp(c.powder-w*dt*.035);
        c.strainX=clamp(c.strainX+w*dx*c.tack,-.48,.48);
        c.strainZ=clamp(c.strainZ+w*dz*c.tack,-.48,.48);
        c.set=clamp(c.set+w*dt*.26*(1-c.firm),0,.48);
        c.dentV+=((w*.36*(1.3-c.firm)+c.set-c.dent)*67-12*c.dentV)*dt;
        c.dent+=c.dentV*dt;
        const baseline=s.mass*(.16+.77*Math.pow(1-u*u,.72))*(1+.06*u*Math.cos(3*c.a));
        const displaced=pressed ? .135*Math.exp(-Math.pow((Math.hypot(px-finger.x,pz-finger.z)-.65)/.22,2)) : 0;
        c.heave+=(displaced-c.heave)*exp(pressed?3:.85,dt);
        const target=Math.max(.052,baseline*(1-.73*s.flat)/(1+r.ear*u*u*.65)-c.dent+c.heave);
        c.thick+=(target-c.thick)*exp(10/s.mass,dt);
        vapor+=c.evaporation;
      }
      s.steam+=(vapor*3.1-s.steam)*exp(1.5,dt);
      s.dustV+=((effective*.5/dt+Math.abs(s.rollGoal-s.roll)*.14)-s.dustV*4)*dt;
      s.dust=clamp(s.dust+s.dustV*dt-s.dust*.86*dt);
      s.wobbleV+=(effective*3/dt-45*s.wobble-8*s.wobbleV)*dt;s.wobble+=s.wobbleV*dt;
      if(s.introBond){
        s.introLift=ease(clamp((s.age-.08)/1.05));
        s.threadV+=((.96*s.introLift-s.thread)*65-12*s.threadV)*dt;
        if(s.thread>.44+.20*cells[0].tack){s.introBond=false;s.introEnd=s.age;s.peelTack=cells[0].tack;s.peelHz=372+220*s.peelTack;events.push('peel');}
      }else s.threadV+=(-34*s.thread-6.4*s.threadV)*dt;
      s.thread=Math.max(0,s.thread+s.threadV*dt);
      // Fibre tension diffuses from the gripped loop to starch-coated contact points.
      for(let i=0;i<cord.length;i++){
        const b=cord[i],u=b.u,contact=Math.sin(PI*u)**2,near=cord[Math.max(0,i-1)],far=cord[Math.min(cord.length-1,i+1)];
        const load=s.insert*(.07+s.pull*.88)*(.3+.7*contact)*(1-s.split);
        b.tension+=(load+.24*(near.tension+far.tension-2*b.tension)-b.tension)*exp(7.2,dt);
        b.powder=clamp(b.powder+dt*contact*s.insert*(1-s.split)*.015*(1-b.powder));
        b.speed+=((near.displacement+far.displacement-2*b.displacement)*78-b.displacement*46-b.speed*(4+4*b.powder)
          +b.tension*contact*6+Math.abs(s.cutGoal-s.pull)*13*Math.sin(3*PI*u))*dt;
        b.displacement+=b.speed*dt;
      }
      if(s.drop>0||Math.abs(s.dropV)>.03){
        s.dropV-=8*dt;s.drop+=s.dropV*dt;
        if(s.drop<0){s.drop=0;s.wobbleV+=Math.abs(s.dropV)*.16;s.dropV=-s.dropV*.15;if(s.dropV<.09)s.dropV=0;}
      }
      if(s.phase==='spread'&&s.flat>.90){up();phase('berry');}
      if(s.placed)s.berry+=(1-s.berry)*exp(2.35,dt);
      if(s.phase==='berry'&&s.berry>.992){up();phase('fold');}
      if(s.phase==='fold'&&s.coverage>.965&&rims.every(r=>r.fold>.89)){up();rims.forEach(r=>r.target=1);phase('roll');}
      if(s.phase==='roll'){
        s.mark+=(1-s.mark)*exp(2.7,dt);
        s.imprint+=(ease(clamp((s.mark-.46)/.42))-s.imprint)*exp(4,dt);
        if(s.roll>.955){s.rollGoal=1;up();phase('cut');}
      }
      s.pinch*=Math.exp(-dt*2.5);
      if(s.phase==='cut')s.insert+=(1-s.insert)*exp(2.2,dt);
      if(s.phase==='cut'&&s.pull>.92){up();s.cutGoal=1;s.pluckHz=686+209*cord[14].tension+43*Math.abs(s.turn);events.push('plink');phase('open');}
      if(s.phase==='open'||s.phase==='serve')s.split+=(1-s.split)*exp(2,dt);
      if(s.phase==='open'&&s.split>.89)phase('serve');
      if(s.sent)s.delivery+=(1-s.delivery)*exp(1.55,dt);
      if(s.delivery>.998){cycle++;fresh(true);events.push('fresh');}
    }
    function step(dt) {
      if(!Number.isFinite(dt)||dt<=0)return;
      const count=Math.ceil(dt*120-1e-9);
      for(let n=0;n<count;n++)advance(dt/count);
    }
    function getState(){return {...s,time:clock, cells:cells.map(c=>({...c})),rims:rims.map(r=>({...r})),cord:cord.map(b=>({...b})),finger:finger?{...finger}:null};}
    return {step,getState,down,move,up, drain:()=>events.splice(0), get s(){return s;},get cells(){return cells;},get rims(){return rims;},get cord(){return cord;},get finger(){return finger;},N,R,H};
  }
  // Radius and height of the exposed flesh in the vertical cutting plane.
  function section(u,turn) {
    u=clamp(u);const t=clamp(Math.abs(turn)/1.3);
    const round=Math.pow(Math.max(.00001,Math.sin(Math.PI*u)),.56)*(1.075-.13*u);
    const drop=Math.pow(Math.max(.00001,Math.sin(Math.PI*u**.72)),.66)*(1.04-.29*u);
    return {radius:.652*((1-t)*round*.90+t*drop),height:1.18*u*(.87+.13*t)};
  }
  const api={create,clamp,ease,TAU,section};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KitchenModel=api;
})(globalThis);
