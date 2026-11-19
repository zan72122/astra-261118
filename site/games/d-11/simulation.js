/* Metres, seconds, kilograms and litres. A fixed substep keeps input and rendering independent. */
(function (root, factory) {
  if (typeof module === 'object') module.exports = factory();
  else root.MiniFactory = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const H = 1 / 120, NX = 28, NZ = 14, L = 3.25, W = 1.57;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const axis = (p = 0) => ({p, v: 0});
  function spring(s, target, k, drag, dt) {
    s.v += ((target - s.p) * k - drag * s.v) * dt;
    s.p += s.v * dt;
  }
  function servo(s,target,k,drag,speed,dt){
    const a=clamp((target-s.p)*k-drag*s.v,-8,8);
    s.v=clamp(s.v+a*dt,-speed,speed);s.p+=s.v*dt;
  }
  function rng(seed) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  // Arc-length table of the test circuit. Road, chassis and camera share this metric.
  const knots = [[1.55,0],[3,0],[4,-1.5],[4,-6],[4.8,-10],[8,-14],[13,-17],[15,-22],[12,-27],[6,-29],[-1,-28],[-7,-24],[-10,-19],[-10,-14],[-7,-10],[-2,-10]];
  const route = [], stops = [];
  function cubic(a,b,c,d,t) {
    return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  }
  for (let i=0;i<knots.length-1;i++) {
    const a=knots[Math.max(0,i-1)],b=knots[i],c=knots[i+1],d=knots[Math.min(i+2,knots.length-1)];
    stops.push(route.length ? route[route.length-1].s : 0);
    for (let j=0;j<=48;j++) {
      if(i && !j) continue;
      const x=cubic(a[0],b[0],c[0],d[0],j/48), z=cubic(a[1],b[1],c[1],d[1],j/48), prev=route[route.length-1];
      route.push({x,z,s:prev?prev.s+Math.hypot(x-prev.x,z-prev.z):0});
    }
  }
  const end=route[route.length-1].s, jump=stops[6], bridge=stops[9], ford=stops[12];
  function point(s) {
    s=clamp(s,0,end);
    let a=0,b=route.length-1;
    while(b-a>1) {const m=(a+b)>>1; if(route[m].s<s)a=m;else b=m;}
    const p=route[a],q=route[b],f=(s-p.s)/(q.s-p.s);
    return {x:p.x+(q.x-p.x)*f,z:p.z+(q.z-p.z)*f,yaw:Math.atan2(p.z-q.z,q.x-p.x)};
  }
  function roadY(s, ramp=1) {
    let y=.075+1.105*(1-clamp((s-2)/6,0,1));
    if(s>jump-4 && s<jump+2.4) {
      const u=clamp((s-jump+4)/4,0,1);
      y+=s<jump?(.30+.62*ramp)*u*u:(.30+.62*ramp)*(1-(s-jump)/2.4);
    }
    const bank=clamp((4.7-Math.abs(s-bridge))/1.4,0,1);y+=.22*bank*bank*(3-2*bank);
    return y;
  }
  const makeCells=()=>Array.from({length:NX*NZ},(_,i)=>({
    x:((i%NX+.5)/NX-.5)*L,z:((Math.floor(i/NX)+.5)/NZ-.5)*W,
    wet:0, solids:0, pigment:[0,0,0], heat: .84+.14*Math.cos(i%NX*.23)+.06*(i%NZ)/NZ
  }));
  function newCar(id) {
    return {id,shape:id%4,mass:[.46,.63,.9,.55][id%4],x:-.68, distance:0,speed:0,
      height:1.18,vy:0,air:false,pitch:axis(),roll:axis(),spin:0, wheels:[0,0,0,0],
      volume:0,deposited:0, maxHeight:0,parkX:axis(-2),parkZ:axis(-10),parkYaw:axis(), cells:makeCells(), axles:[axis(),axis(),axis(),axis()]};
  }
  function nozzle(s,k) {
    const f=clamp(s.cans[k].p,0,1),restX=.96+(k-1)*.924;
    return {x:restX+(s.car.x+s.aimX.p+.49-restX)*f,y:2.141+.88*f-.032*s.triggers[k].p,z:2.098-1.23*f};
  }
  function create(seed=7281) {
    const random=rng(seed),mistRandom=rng(seed^0xaf4563),waterRandom=rng(seed^0x725b),hintRandom=rng(seed^0x1317);
    const s={phase:'paint',age:0,time:0,idle:0,selected:0,held:false,batch:0,total:0,garage:[],
      car:newCar(0),belt:0,releaseWait:0,tip:false,hint:axis(),hintStroke:axis(),hintRest:0,
      cans:[axis(),axis(),axis()],aimX:axis(-.72),aimZ:axis(),triggers:[axis(),axis(),axis()],aimIndex:0,
      arm:{joint:[axis(-1.55),axis(2.03),axis(-.89)],wheel:0,task:'rack',grip:axis(),carry:false},
      door:axis(3.24),ramp:axis(.26),bridge:axis(1),sluice:axis(),gate:false,
      water:Array.from({length:24},()=>({h:0,v:0})),waterDepth:.022,splashes:[],spray:[],parcels:[],mistCredit:0,
      pendants:[axis(.009),axis(-.006),axis(.013),axis(-.009),axis(.003),axis(-.004)],air:axis(.08),gust:.2,gustLife:1.3,twilight:axis(),light:axis(.94),
      dust:Array.from({length:40},()=>({x:random()*11-5.5,y:.3+random()*5,z:random()*8-4,vx:random()*.04,vy:0,size:.003+random()*.009})),
      truck:axis(),lift:axis(),loadIndex:0,loadTask:'board',loadPos:axis(),feature:null,waterHit:false,
      sound:{clack:0,jump:0,splash:0,finish:0}, cycles:0};
    let remainder=0;
    const phase=p=>{s.phase=p;s.age=0;s.idle=0;s.hintStroke.p=0;s.hintStroke.v=0;};
    function touch(name,index=0) {
      s.idle=0;
      if(name==='can' && index>=0 && index<3) {
        s.cans[index].v+=.18;
        if(s.phase!=='paint')return false;
        s.selected=index;s.held=true;s.releaseWait=0;return true;
      }
      if(name==='rack' && s.phase==='assembly'){s.arm.grip.v+=.18;return true;}
      if(s.phase==='gate' && name===s.feature) {
        s.gate=true;s.sound.clack++;phase('drive');return true;
      }
      if(s.phase==='load' && name==='truck'){s.lift.v+=.09;return true;}
      return false;
    }
    function release(){if(s.held){s.held=false;s.releaseWait=1.55;s.idle=0;}}
    function paint(dt) {
      const c=s.car, on=s.held && s.phase==='paint';
      // The nozzle carriage indexes only after the previous spring-driven traverse settles.
      const order=[[-1.12,-.34],[-.53,.3],[.12,-.31],[.82,.34],[1.22,-.22],[.47,-.02],[-.6,-.06]];
      const q=order[s.aimIndex%order.length];
      spring(s.aimX,q[0],17,6.2,dt);spring(s.aimZ,q[1],23,7.3,dt);
      for(let i=0;i<3;i++)spring(s.triggers[i],on&&s.selected===i?1:0,110,19,dt);
      if(on && Math.hypot(s.aimX.p-q[0],s.aimZ.p-q[1])<.16)s.aimIndex++;
      for(let i=0;i<3;i++)spring(s.cans[i],on&&i===s.selected?1:0,50,11,dt);
      const amount=on?.4*dt:0;
      c.volume+=amount;
      if(on) s.parcels.push({left:.19,x:c.x+s.aimX.p,z:s.aimZ.p,k:s.selected,litres:amount*.88});
      // In-flight paint can still land after the valve has shut. World-space aim
      // is resolved against the moving body at contact, then distributed by footprint.
      for(const parcel of s.parcels){
        parcel.left-=dt;if(parcel.left>0)continue;
        const weights=c.cells.map(a=>{
          const dx=(c.x+a.x-parcel.x)/.46,dz=(a.z-parcel.z)/.39;
          return Math.exp(-.5*(dx*dx+dz*dz))*(.95+.05*a.heat);
        });
        const sum=weights.reduce((a,b)=>a+b,0);
        c.deposited+=parcel.litres;
        for(let i=0;i<c.cells.length;i++){
          const a=c.cells[i],mass=parcel.litres*weights[i]/sum;
          a.wet+=mass*.57;a.solids+=mass*.43;a.pigment[parcel.k]+=mass;a.heat-=mass*75;
        }
      }
      s.parcels=s.parcels.filter(p=>p.left>0);
      for(const a of c.cells){
        a.heat+=(.98+.09*a.x+.16*s.light.p-a.heat)*.27*dt;
        a.wet*=Math.exp(-(.24+.27*Math.max(.1,a.heat))*(1+.3*Math.abs(s.air.p))*dt);
      }
      s.mistCredit+=amount*270;
      while(s.mistCredit>=1){
        s.mistCredit--;const k=s.selected;
        const tx=c.x+s.aimX.p+(mistRandom()-.5)*.8,tz=s.aimZ.p+(mistRandom()-.5)*.48;
        const life=.19+(mistRandom()-.5)*.05,n=nozzle(s,k);
        const coverHeight=Math.abs(s.aimX.p)<.54?2.32:1.99;
        s.spray.push({x:n.x,y:n.y,z:n.z,
          vx:(tx-n.x)/life,vy:(coverHeight-n.y)/life+1.5*life,vz:(tz-n.z)/life,
          age:0,life,k,size:.008+mistRandom()*.017});
      }
      for(const p of s.spray){p.age+=dt;p.vy-=3*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}
      s.spray=s.spray.filter(p=>p.age<p.life);
    }
    function idleWorld(dt){
      s.gustLife-=dt;
      if(s.gustLife<=0){s.gust=(random()-.4)*.56;s.gustLife=.9+random()*3.7;}
      spring(s.air,s.gust,1.2,1.7,dt);
      spring(s.light,.94+s.air.p*.22,1.4,2.2,dt);
      for(let i=0;i<s.pendants.length;i++){
        const a=s.pendants[i];spring(a,s.air.p*(.062+i*.006),8.1+i*.9,1.01+i*.12,dt);
      }
      for(const p of s.dust){
        const edge=Math.max(0,p.x-5.55)+Math.min(0,p.x+5.55),ceiling=Math.max(0,p.y-5.18);
        p.vx+=(s.air.p*(.6+p.y*.1)-p.vx-edge*1.65)*dt*.8;
        p.vy+=((.014+p.vx*.09)-p.vy-ceiling*.75)*dt*.7;
        p.x+=p.vx*dt;p.y+=p.vy*dt;

      }
      const w=s.water;
      for(let i=0;i<w.length;i++){
        const a=w[i],x=i%4,z=Math.floor(i/4);
        const sum=w[i-(x>0?1:0)].h+w[i+(x<3?1:0)].h+w[i-(z>0?4:0)].h+w[i+(z<5?4:0)].h;
        a.v+=((sum-4*a.h)*26-a.h*3-a.v*1.9+(i===2?s.air.p*.18:0))*dt;
      }
      for(const a of w)a.h+=a.v*dt;
      s.waterDepth+=(.022+.085*s.sluice.p-s.waterDepth)*dt*.65;
      for(const p of s.splashes){p.vy-=9.81*dt;p.y+=p.vy*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;}
      s.splashes=s.splashes.filter(p=>p.y>.08);
      s.tip=s.idle>=4 && !s.held && ['paint','gate'].includes(s.phase);
      spring(s.hint,s.tip?1:0,18,7,dt);
      if(s.tip){s.hintRest-=dt;if(s.hintRest<=0){s.hintStroke.v=-1.4;s.hintRest=1.75+hintRandom()*.48;}}
      spring(s.hintStroke,0,19,3.6,dt);
    }
    const hubX=[-.98,.96,-.98,.96],hubZ=[-.74,-.74,.74,.74];
    function armTick(dt){
      const a=s.arm,c=s.car,i=Math.min(3,a.wheel);
      const atRack=[-2.16+(i%2?.346:-.346),1.41,-.96+(i<2?.20:-.20)], atHub=[c.x+hubX[i],1.18+.36,hubZ[i]];
      let dest=s.phase==='assembly'?(a.task==='rack'?atRack:a.task==='lift'?[-1.85,2.86,-1.09]:a.task==='over'?[atHub[0],2.88,atHub[2]*1.34]:atHub):[-1.55,2.03,-.89];
      for(let j=0;j<3;j++)servo(a.joint[j],dest[j],27,9.5,2.25,dt);
      spring(a.grip,a.carry?1:0,40,9,dt);
      if(s.phase!=='assembly'||Math.hypot(...a.joint.map((v,j)=>v.p-dest[j]))>.052)return;
      if(a.task==='rack'){a.carry=true;a.task='lift';}
      else if(a.task==='lift')a.task='over';
      else if(a.task==='over')a.task='seat';
      else {c.wheels[i]=1;c.axles[i].v=-.18;a.carry=false;a.wheel++;a.task='rack';s.sound.clack++;
        if(a.wheel===4){s.feature=['ramp','bridge','sluice'][s.batch];phase('drive');}}
    }
    function splash(c) {
      const hit=c.mass*c.speed*s.waterDepth;
      s.water[11].v+=Math.min(.6,hit*.82);s.sound.splash++;
      const pos=point(c.distance);
      for(let i=0;i<Math.round(14+hit*83);i++){
        const u=(waterRandom()-.5)*2,side=u<0?-1:1,along=(waterRandom()-.5)*1.4,forward=(waterRandom()-.5)*1.5;
        const co=Math.cos(pos.yaw),si=Math.sin(pos.yaw),lateral=u*(1+hit*3);
        s.splashes.push({x:pos.x+co*along+si*side*.65,y:.15,z:pos.z-si*along+co*side*.65,
          vx:co*forward+si*lateral,vy:(1+waterRandom()*2.1)*(.52+hit*2.1),vz:-si*forward+co*lateral,size:.024+waterRandom()*.055});
      }
    }
    function drive(dt){
      const c=s.car,d=c.distance,mark=s.feature==='ramp'?jump-4:s.feature==='bridge'?bridge-5.8:ford-4.5;
      if(!s.gate && d>=mark-2.3-.012 && c.speed<.14){c.speed=0;phase('gate');return;}
      let target=3.45/Math.sqrt(c.mass+.48);
      if(!s.gate)target=Math.min(target,Math.sqrt(Math.max(0,2*1.8*(mark-2.3-d))));
      if(s.gate && s.feature==='bridge' && d<bridge-4 && s.bridge.p>.08)target=0;
      target=Math.min(target,Math.sqrt(Math.max(0,3.5*(end-d))));
      const accel=clamp((target-c.speed)*3,-2.25,1.8/c.mass);
      c.speed=Math.max(0,c.speed+accel*dt);c.distance=Math.min(end,d+c.speed*dt);
      c.spin+=c.speed*dt/.35;
      const gy=roadY(c.distance,s.ramp.p),slope=(roadY(c.distance+.015,s.ramp.p)-roadY(c.distance-.015,s.ramp.p))/.03;
      if(d<jump && c.distance>=jump && !c.air){c.air=true;c.vy=c.speed*(.42+.23*s.ramp.p)+.35;s.sound.jump++;}
      if(c.air){c.vy-=9.81*dt;c.height+=c.vy*dt;c.maxHeight=Math.max(c.maxHeight,c.height-gy);
        if(c.height<=gy && c.vy<0){c.air=false;for(let i=0;i<4;i++)c.axles[i].v+=c.vy*(i%2?.11:.076);c.height=gy;c.vy=0;}
      }else {c.height=gy;c.vy=c.speed*slope;}
      spring(c.pitch,c.air?clamp(c.vy*.14,-.27,.3):Math.atan(slope)-accel*.012,33,8,dt);
      const p=point(c.distance),q=point(c.distance+.3);
      const curve=Math.atan2(Math.sin(q.yaw-p.yaw),Math.cos(q.yaw-p.yaw))/.3;
      spring(c.roll,clamp(curve*c.speed*c.speed*.033,-.13,.13),36,8.4,dt);
      if(!s.waterHit && c.distance>=ford && s.batch===2){s.waterHit=true;splash(c);}
      if(c.distance>=end-.02&&c.speed<.2){
        c.speed=0;s.total++;s.sound.finish++;phase('park');
      }
    }
    function next(){
      s.car=newCar(s.total);s.arm.wheel=0;s.arm.task='rack';s.arm.carry=false;
      s.releaseWait=0;s.held=false;s.gate=false;s.waterHit=false;s.feature=null;s.aimIndex=0;
      phase('paint');
    }
    function advance(dt) {
      s.time+=dt;s.age+=dt;s.idle+=dt;s.belt+=.5*dt;
      idleWorld(dt);paint(dt);armTick(dt);
      const c=s.car;
      for(let i=0;i<4;i++)spring(c.axles[i],0,65+i*2.7,6.7+i*.29,dt);
      spring(s.door,['assembly','drive','gate'].includes(s.phase)?4.65:3.24,3.2,3.4,dt);
      spring(s.ramp,s.gate&&s.feature==='ramp'?1:.26,6.4,4.7,dt);
      spring(s.bridge,s.batch===1&&!s.gate?1:0,4.8,4.3,dt);
      spring(s.sluice,s.batch===2&&s.gate?1:0,4,3.7,dt);
      spring(s.twilight,(s.batch===2&&['park','load','depart'].includes(s.phase))?1:0,.3,1.1,dt);
      if(s.phase==='paint'){
        c.x=Math.min(c.x+.5*dt,.32); // indexing stop holds the carrier under the nozzle
        if(!s.held && s.releaseWait>0)s.releaseWait=Math.max(0,s.releaseWait-dt);
        if(!s.held && c.volume>=.105 && !s.releaseWait){s.held=false;phase('feed');}
      }else if(s.phase==='feed'){
        c.x=Math.min(1.55,c.x+.5*dt);if(c.x>=1.55)phase('assembly');
      }else if(s.phase==='drive')drive(dt);
      else if(s.phase==='park'){
        const bayZ=-13.61+2.13*s.batch;
        servo(c.parkX,.24,5,4.5,1.32,dt);servo(c.parkZ,bayZ,8,6,1.35,dt);
        spring(c.parkYaw,-Math.atan2(c.parkZ.v,Math.max(.22,c.parkX.v)),10,5,dt);
        c.spin+=Math.hypot(c.parkX.v,c.parkZ.v)*dt/.35;
        if(s.age<3.4||Math.hypot(c.parkX.p-.24,c.parkZ.p-bayZ)>.012)return;
        s.garage.push({id:c.id,shape:c.shape,x:axis(c.parkX.p),z:axis(c.parkZ.p),y:axis(.075),yaw:axis(c.parkYaw.p),spin:c.spin,cells:c.cells.map(a=>({...a,pigment:[...a.pigment]})), mass:c.mass});
        if(s.batch<2){s.batch++;next();}
        else{s.loadIndex=0;s.loadTask='board';s.loadPos=axis();phase('load');}
      } else if(s.phase==='load'){
        const boarding=s.loadTask==='board';
        spring(s.lift,boarding?0:1,5,4.5,dt);
        const car=s.garage[2-s.loadIndex], deck=-5.56+s.loadIndex*3.35;
        if(boarding){
          if(s.lift.p<.08){servo(car.x,4.69,4,4.2,1.7,dt);servo(car.z,-6.91,4,4.2,1.0,dt);}
        }else if(s.lift.p>.94)servo(car.x,deck,4.2,4.3,1.7,dt);
        spring(car.y,.075+.934*(boarding?0:s.lift.p),45,12,dt);
        spring(car.yaw,boarding?-Math.atan2(car.z.v,Math.max(.25,car.x.v)):0,10,5,dt);
        car.spin+=(boarding?Math.hypot(car.x.v,car.z.v):car.x.v)*dt/.35;
        const goal=boarding?1:2;
        if(boarding||s.lift.p>.94)spring(s.loadPos,goal,2.5,3.05,dt);
        if(Math.abs(s.loadPos.p-goal)<.015 && Math.abs(car.x.p-(boarding?4.69:deck))<.035){
          if(boarding)s.loadTask='stow';
          else if(++s.loadIndex===3){phase('depart');}
          else{s.loadTask='board';s.loadPos=axis();}
        }
      }else if(s.phase==='depart'){
        s.truck.v+=(2.5-s.truck.v)*dt*.8;s.truck.p+=s.truck.v*dt;
        if(s.truck.p>11){s.cycles++;s.batch=0;s.garage=[];s.truck=axis();s.lift=axis();s.loadIndex=0;next();}
      }
    }
    return {state:s,touch,release,step(dt){
      if(!Number.isFinite(dt)||dt<0)return;
      remainder+=dt;
      while(remainder>=H-1e-10){advance(H);remainder-=H;}
    },getState(){return JSON.parse(JSON.stringify(s));}};
  }
  return {create,NX,NZ,L,W,nozzle,point,roadY,route,end,jump,bridge,ford,hubX:[-.98,.96,-.98,.96],hubZ:[-.74,-.74,.74,.74]};
});
