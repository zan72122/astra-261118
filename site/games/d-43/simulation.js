/* All distances are metres. The simulation uses a fixed 120 Hz integration step. */
(function (root) {
  'use strict';
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const mix = (a, b, t) => a + (b - a) * t;
  function random(seed) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  const points = [
    [0,2],[2,-4],[10,-11],[14,-20],[11,-29],[3,-32],[-9,-30],[-15,-20],[-14,-9],[-8,-2],[0,2],
    [3,-4],[4,-16],[1,-26],[0,-34],[0,-41],
    [0,-48],[-3,-58],[-5,-68],[1,-80],[6,-88],
    [16,-97],[20,-111],[12,-124],[-3,-135],[-18,-136],[-29,-129],
    [-34,-116],[-32,-100],[-22,-91],[-10,-93],[1,-103],[4,-118]
  ];
  function cubic(a,b,c,d,t) {
    return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  }
  const route=[], knots=[0];
  let length=0;
  for(let i=0;i<points.length-1;i++) {
    const a=points[Math.max(0,i-1)], b=points[i], c=points[i+1], d=points[Math.min(points.length-1,i+2)];
    for(let j=0;j<64;j++){
      const t=j/64, x=cubic(a[0],b[0],c[0],d[0],t), z=cubic(a[1],b[1],c[1],d[1],t);
      if(route.length)length+=Math.hypot(x-route.at(-1).x,z-route.at(-1).z);
      route.push({x,z,s:length});
      if(!j)knots[i]=length;
    }
  }
  const end=points.at(-1);
  length+=Math.hypot(end[0]-route.at(-1).x,end[1]-route.at(-1).z);
  route.push({x:end[0],z:end[1],s:length});
  route.forEach((q,i)=>{const a=route[Math.max(0,i-1)],b=route[Math.min(route.length-1,i+1)],d=Math.hypot(b.x-a.x,b.z-a.z);
    q.dx=(b.x-a.x)/d;q.dz=(b.z-a.z)/d;});
  const ends=[knots[10],knots[15],knots[20],knots[26],length];
  function path(s){
    s=clamp(s,0,length);
    let l=0,r=route.length-1;
    while(r-l>1){const m=(l+r)>>1;if(route[m].s<=s)l=m;else r=m;}
    const a=route[l],b=route[r],ds=b.s-a.s,t=(s-a.s)/ds;
    const dx=mix(a.dx,b.dx,t),dz=mix(a.dz,b.dz,t),norm=Math.hypot(dx,dz);
    return {x:mix(a.x,b.x,t),z:mix(a.z,b.z,t),dx:dx/norm,dz:dz/norm};
  }
  function create(seed=8439,initialSpeed=0) {
    const rng=random(seed), p={...path(0),s:0,lane:0,sideSpeed:0,speed:clamp(initialSpeed,0,8),tilt:0,heading:0,travel:1};
    const input={held:false,side:0,push:0,stroke:0,forward:1};
    const cells=Array.from({length:112},(_,i)=>({
      s:(i+.5)*length/112, rough:.1+.7*rng(), moisture:.18+.35*rng(),
      wave:(rng()-.5)*.00045, waveSpeed:0, bend:(rng()-.5)*.035, bendSpeed:0,
      air:.16+.4*rng(), gust:.16+.43*rng(), gustLife:.08+rng()*1.5,
      heat:0, compact:0, pressLane:0, grain:0, exposure:.5+rng()*.8
    }));
    const bells=Array.from({length:5},(_,i)=>({angle:(rng()-.5)*.08,angularSpeed:0,arm:.31+i*.035,contact:false}));
    const motes=Array.from({length:86},()=>({x:(rng()-.5)*27,y:rng()*6+.1,z:(rng()-.5)*29,vx:0,vy:0,ground:0,lift:0}));
    const boats=[{x:2,z:-103,vx:.1,vz:0,yaw:.2,vane:.1,spin:0,puff:0},{x:-16,z:-120,vx:0,vz:.12,yaw:-1.5,vane:-.2,spin:0,puff:0}];
    const lamps=Array.from({length:6},(_,i)=>{
      const s=mix(ends[3]+2,length-4,i/5), q=path(s),side=i%2?3.3:-3.3;
      return {s,x:q.x-q.dz*side,z:q.z+q.dx*side,charge:0,light:0,lit:false,wickHeat:0};
    });
    const sounds={bladeHz:235+54*p.speed+320*cells[0].rough,blade:p.speed/8*(.48+cells[0].rough*.65),wind:p.speed/8,pan:0,crunch:0,scrape:0,bell:0,grainCount:0,stopCount:0,bellCount:0};
    const boots=[{yaw:-1.42,yawSpeed:0,edge:0,edgeSpeed:0,offset:0,offsetSpeed:0},
      {yaw:-1.91,yawSpeed:0,edge:0,edgeSpeed:0,offset:0,offsetSpeed:0}];
    const grains=Array.from({length:48},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,radius:0,life:0,serial:0}));
    const camera={yaw:0,distance:5.55,height:2.13},bench={angle:0,angularSpeed:0};
    const trail=[];
    const st={p,boots,grains,camera,bench,cells,bells,motes,boats,lamps,sounds,trail,input,stage:0,cycle:0,idle:0,
      snow:0,roughness:cells[0].rough,skyWarmth:0,veil:0,returning:0,brush:0,demo:0,trackDistance:0};
    let grainSlot=0,grainSerial=0,accumulator=0,lastMark=-1,grainTravel=0,stopArmed=false,recovering=false;
    function controls(held,side=0,push=.6,forward=1) {
      if(held&&!input.held && !st.returning){st.brush=1;input.stroke=.39;}
      input.held=held;input.side=clamp(side,-1,1);input.push=clamp(push,0,1);
      if(held){input.forward=clamp(forward,-1,1);st.idle=0;}
    }
    function skate(dt){
      const oldSpeed=p.speed,oldHeading=p.heading,wasX=p.x,wasZ=p.z,wasLane=p.lane,wasS=p.s;
      input.stroke=Math.max(0,input.stroke-dt);
      const drive=(input.held||input.stroke>0)&&!st.returning;
      const target=drive?Math.min(1.5+6.5*input.push,Math.sqrt(Math.max(.02,3*(length-p.s)))):0;
      if(drive)p.travel+=clamp(input.forward-p.travel,-dt*2.2,dt*2.2);
      const drag=.02*9.81+st.snow*.82;
      p.speed=clamp(p.speed+(drive?clamp((target-p.speed)*1.35,-2.2,2.8): -drag)*dt,0,8);
      const width=[2.6,1.8,1.3,7.6,3.7][st.stage];
      const desire=drive?input.side*width:p.lane;
      const sideForce=clamp((desire-p.lane)*2.8-p.sideSpeed*2.9,-2.9,2.9);
      p.sideSpeed=(p.sideSpeed+sideForce*dt)*Math.min(1,p.speed/.12);
      p.sideSpeed=clamp(p.sideSpeed,-p.speed*.68,p.speed*.68);
      p.lane+=p.sideSpeed*dt;
      // Arc length of an offset curve differs from that of the centre line.
      const q0=path(p.s), q1=path(p.s+.18);
      const curveScale=clamp(1+p.lane*(q0.dx*(q1.dz-q0.dz)-q0.dz*(q1.dx-q0.dx))/-0.18,.45,1.8);
      p.s=clamp(p.s+Math.sqrt(Math.max(0,p.speed*p.speed-p.sideSpeed*p.sideSpeed))*p.travel*dt/curveScale,0,length);
      let q=path(p.s);
      p.x=q.x-q.dz*p.lane;p.z=q.z+q.dx*p.lane;
      // Spend at most the distance available from the blade velocity, even on a tight offset bend.
      const allowance=p.speed*dt;
      if(Math.hypot(p.x-wasX,p.z-wasZ)>allowance+1e-7){
        const ds=p.s-wasS,dl=p.lane-wasLane;let low=0,high=1;
        for(let j=0;j<11;j++){
          const f=(low+high)*.5,v=path(wasS+ds*f),lane=wasLane+dl*f;
          if(Math.hypot(v.x-v.dz*lane-wasX,v.z+v.dx*lane-wasZ)<=allowance)low=f;else high=f;
        }
        p.s=wasS+ds*low;p.lane=wasLane+dl*low;q=path(p.s);
        p.x=q.x-q.dz*p.lane;p.z=q.z+q.dx*p.lane;
      }
      if(Math.hypot(p.x-wasX,p.z-wasZ)>.00005){
        const angle=Math.atan2(p.x-wasX,wasZ-p.z);
        p.heading+=clamp(Math.atan2(Math.sin(angle-p.heading),Math.cos(angle-p.heading)),-2.1*dt,2.1*dt);
      }
      const yawRate=(p.heading-oldHeading)/dt;
      const tilt=Math.abs(yawRate)>.014 ? Math.sign(yawRate)*clamp(2+Math.abs(yawRate)*p.speed*1.7,2,6):0;
      p.tilt+=(tilt-p.tilt)*(1-Math.exp(-dt*5));
      st.stage=ends.findIndex(e=>p.s<e);if(st.stage<0)st.stage=4;
      const isSnow=clamp((p.s-ends[1])/.9,0,1)*clamp((ends[2]-p.s)/1.6,0,1);
      st.snow+=(isSnow-st.snow)*(1-Math.exp(-dt*8));
      const index=clamp(p.s/length*cells.length-.5,0,cells.length-1);
      const i=Math.floor(index),c=cells[i],next=cells[Math.min(i+1,cells.length-1)];
      st.roughness=mix(c.rough,next.rough,index-i);
      st.trackDistance+=Math.hypot(p.x-wasX,p.z-wasZ);
      if(st.trackDistance-lastMark>.16 && p.speed>.05) {
        trail.push({x:p.x,z:p.z,heading:p.heading,snow:st.snow,depth:.00015+.00008*p.speed});
        lastMark=st.trackDistance;
      }
      if(p.speed>.35)stopArmed=true;
      if(stopArmed&&p.speed<=.075&&oldSpeed>.075){
        sounds.scrape=.75;sounds.stopCount++;stopArmed=false;
      }
      sounds.scrape*=Math.exp(-dt*14);
      sounds.bladeHz=235+54*p.speed+320*st.roughness;
      sounds.blade=(1-st.snow)*p.speed/8*(.48+st.roughness*.65);
      sounds.pan=clamp(p.tilt/6*.19,-.19,.19);sounds.wind=p.speed/8;
      grainTravel+=p.speed*st.snow*dt;
      sounds.crunch*=Math.exp(-dt*16);
      if(grainTravel>.16+c.compact*.18){
        grainTravel=0;sounds.grainCount++;sounds.crunch=.25+.6*(1-c.compact);
        for(let j=0;j<3;j++){
          const side=j%2?1:-1;
          // A live grain keeps its identity until it lands and settles.
          if(grains[grainSlot].life>0)break;
          const g=grains[grainSlot];grainSlot=(grainSlot+1)%grains.length;
          Object.assign(g,{x:p.x-q.dz*side*.24,y:.137,z:p.z+q.dx*side*.24,
            vx:-q.dx*p.speed*.09-q.dz*side*(.18+rng()*.5),vy:.26+rng()*.5+p.speed*.07,
            vz:-q.dz*p.speed*.09+q.dx*side*(.18+rng()*.5),radius:.009+rng()*.017,
            life:1,serial:++grainSerial});
        }
      }
    }
    // 各区画の突風は別々に更新する。草と薄い水膜は復元力と抵抗で落ち着き、
    // 刃が離れた後も速度を保持する。接触熱は放散し、雪の圧密は次の朝までゆっくり残る。
    function surface(dt){
      for(let i=0;i<cells.length;i++){
        const c=cells[i],left=cells[Math.max(0,i-1)],right=cells[Math.min(cells.length-1,i+1)];
        c.gustLife-=dt;
        if(c.gustLife<=0){c.gust=(rng()*.98-.27)*c.exposure;c.gustLife=.55+rng()*2.4;}
        c.air+=(c.gust+.18*(left.air-c.air)-c.air)*dt*1.15;
        c.bendSpeed+=(c.air*.78-c.bend*5.9-1.72*c.bendSpeed)*dt;
        c.bend+=c.bendSpeed*dt;
        const contact=Math.max(0,1-Math.abs(c.s-p.s)/2.2)*p.speed/8;
        c.waveSpeed+=(c.air*.0009+contact*.0038+1.3*(left.wave+right.wave-2*c.wave)-7.2*c.wave-c.waveSpeed*1.5)*dt;
        c.wave+=c.waveSpeed*dt;
        c.heat+=(contact*.78-c.heat*.13)*dt;
        c.moisture+=((.22+c.exposure*.13+c.heat*.19)-c.moisture)*dt*.23;
        c.pressLane+=(p.lane-c.pressLane)*(1-Math.exp(-contact*st.snow*dt*5));
        c.compact=clamp(c.compact+(contact*st.snow*(1-c.compact)*3.5-c.compact*.0008)*dt,0,1);
        c.grain+=(contact*st.snow*1.8-c.grain*2.5)*dt;
      }
    }
    function touchObject(kind,index){
      if(kind==='bench'){bench.angularSpeed+=.017;return;}
      if(kind==='bell'&&st.stage===1&&bells[index])bells[index].angularSpeed+=.65;
      if(kind==='sail'&&st.stage===3&&boats[index])boats[index].puff=1;
      if(kind==='lantern'&&st.stage===4&&lamps[index])lamps[index].wickHeat=.84;
    }
    function mechanisms(dt){
      bench.angularSpeed+=(-bench.angle*18-bench.angularSpeed*4)*dt;bench.angle+=bench.angularSpeed*dt;
      for(const g of grains){if(g.life<=0)continue;
        if(g.y>.131||g.vy>0){g.vy-=3.6*dt;g.vx*=Math.exp(-dt*.67);g.vz*=Math.exp(-dt*.67);
          g.x+=g.vx*dt;g.y+=g.vy*dt;g.z+=g.vz*dt;
          if(g.y<=.13){g.y=.13;g.vy=0;g.vx=0;g.vz=0;}
        }else{g.life=Math.max(0,g.life-dt*1.9);}
      }
      boots.forEach((b,i)=>{
        const side=i?1:-1, active=clamp(p.s/.99+p.speed*.35,0,1);
        const aim=mix(i?-1.91:-1.42,-p.heading+side*.08,active);
        const delta=Math.atan2(Math.sin(aim-b.yaw),Math.cos(aim-b.yaw));
        b.yawSpeed+=(delta*16-b.yawSpeed*6.1)*dt;b.yaw+=b.yawSpeed*dt;
        const load=p.tilt*Math.PI/180+side*.014*p.speed/8;
        b.edgeSpeed+=((load-b.edge)*21-b.edgeSpeed*7.4)*dt;b.edge+=b.edgeSpeed*dt;
        const thrust=input.held?(input.side*.14+side*(p.speed/8)*.075):0;
        b.offsetSpeed+=((thrust-b.offset)*12-b.offsetSpeed*4.4)*dt;b.offset+=b.offsetSpeed*dt;
      });
      sounds.bell*=Math.exp(-dt*3.4);
      // 吊り長さごとの振り子。打ち子が触れた時だけ発音し、離れるまで再発音しない。
      bells.forEach((b,i)=>{
        const gap=Math.hypot(p.x-(i-2)*.52,p.z+37);
        const wake=st.stage===1?Math.max(0,1-gap/5)*p.speed:0;
        b.angularSpeed+=(cells[40+i].air*.6+wake*1.8-b.angle*9.81/b.arm-b.angularSpeed*1.15)*dt;
        b.angle+=b.angularSpeed*dt;
        if(Math.abs(b.angle)>.094&&b.angle*b.angularSpeed>0){
          if(!b.contact){sounds.bell=Math.min(1,Math.abs(b.angularSpeed));sounds.bellCount++;}
          b.contact=true;b.angle=Math.sign(b.angle)*.094;b.angularSpeed*=-.43;
        }
        if(Math.abs(b.angle)<.072)b.contact=false;
      });
      // 帆に当たる局所風と滑走の後流。風が弱まれば係留の復元力と摩擦で静まる。
      boats.forEach((b,i)=>{
        const c=cells[78+i*6], dx=b.x-p.x,dz=b.z-p.z,dist=Math.hypot(dx,dz);
        const wake=(st.stage===3?Math.max(0,1-dist/14):0)*p.speed*.4;
        b.puff*=Math.exp(-dt*.8);
        b.spin+=(c.air*.9+wake*.7+b.puff*2.4-b.vane*.8-b.spin*1.4)*dt;b.vane+=b.spin*dt;
        b.vx+=(b.puff*Math.cos(b.yaw)*.94+c.air*.23+dx/(dist+1)*wake-(b.x-(i?-16:2))*.025-b.vx*.27)*dt;
        b.vz+=(c.air*.08+dz/(dist+1)*wake-(b.z-(i?-120:-103))*.025-b.vz*.27)*dt;
        b.x+=b.vx*dt;b.z+=b.vz*dt;
        const da=Math.atan2(b.vx,-b.vz)-b.yaw;
        b.yaw+=Math.atan2(Math.sin(da),Math.cos(da))*dt*.55;
      });
      // 灯芯の熱が閾値を越すと着火し、離れた後も炎の明るさが立ち上がる。
      lamps.forEach(l=>{
        const d=Math.abs(l.s-p.s);
        const airflow=st.stage===4?Math.max(0,1-d/5.8)*(.55+p.speed*.22):0;
        l.wickHeat=clamp(l.wickHeat+(airflow-l.wickHeat*.47)*dt,0,1);
        if(l.wickHeat>.34)l.lit=true;
        l.charge+=((l.lit?1:0)-l.charge)*(1-Math.exp(-dt*1.5));
        const c=cells[Math.min(111,Math.floor(l.s/length*112))];
        l.light+=((1-.09*Math.abs(c.air))*l.charge-l.light)*dt*2.6;
      });
      // 雪塵は接地で静止する。休止後は同じ地点から吹き上がり、高さは連続する。
      motes.forEach((m,i)=>{
        const air=cells[(i*13)%cells.length].air;
        if(m.ground>0){
          m.ground-=dt;
          if(m.ground<=0){m.lift=1.7+rng()*2.4;m.vy=0;}
          return;
        }
        m.lift=Math.max(0,m.lift-dt);
        m.vx+=(air*.63-m.vx-m.x*.014)*dt*1.3;
        m.vy+=((m.lift>0?.8+Math.max(0,air)*.65:-.15-.09*(i%3))-m.vy)*dt*.7;
        m.x+=m.vx*dt;m.y+=m.vy*dt;
        if(m.y<=.025){m.y=.025;m.ground=2+rng()*7;}
      });
    }
    function tick(dt){
      skate(dt);surface(dt);mechanisms(dt);
      const forward=path(p.s+1.5), yaw=Math.atan2(forward.dx,-forward.dz)*clamp(p.s/3.2,0,1);
      const delta=Math.atan2(Math.sin(yaw-camera.yaw),Math.cos(yaw-camera.yaw)),follow=1-Math.exp(-dt*2.2);
      camera.yaw+=delta*follow;
      const wide=st.stage>=3?1:0,underBridge=Math.exp(-Math.pow((p.z+38)/4.3,2))*Number(st.stage===1||st.stage===2);
      camera.distance+=(5.55+wide*2.65-camera.distance)*follow;
      camera.height+=(2.13+wide*.91-underBridge*.52-camera.height)*follow;
      st.idle=input.held?0:st.idle+dt;
      st.demo+=((st.idle>4&&!st.returning?1:0)-st.demo)*dt*3;
      st.brush*=Math.exp(-dt*3);
      const dusk=clamp((p.s-(ends[2]+7))/(ends[3]-ends[2]),0,1);
      st.skyWarmth+=(dusk-st.skyWarmth)*dt*.35;
      if(p.s>=length-.01&&!st.returning){st.returning=1;controls(false);}
      if(st.returning){
        st.veil=Math.min(1,st.veil+dt*.31);
        if(st.veil>=1){
          Object.assign(p,path(0),{s:0,lane:0,sideSpeed:0,speed:0,tilt:0,heading:0});
          p.travel=1;Object.assign(camera,{yaw:0,distance:5.55,height:2.13});
          st.cycle++;st.stage=0;st.returning=0;recovering=true;st.skyWarmth=0;st.idle=0;st.demo=0;
          boots.forEach((b,i)=>Object.assign(b,{yaw:i?-1.91:-1.42,yawSpeed:0,edge:0,edgeSpeed:0,offset:0,offsetSpeed:0}));
          st.trackDistance=0;lastMark=-1;trail.length=0;stopArmed=false;grainTravel=0;
          st.roughness=cells[0].rough;sounds.bladeHz=235+320*st.roughness;
          lamps.forEach(l=>{l.charge=0;l.light=0;l.lit=false;l.wickHeat=0;});
          cells.forEach(c=>{c.compact=0;c.pressLane=0;c.heat=0;c.grain=0;});controls(false);
        }
      } else if(recovering){
        st.veil=Math.max(0,st.veil-dt*.38);if(st.veil===0)recovering=false;
      }
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<0)throw RangeError('dt');
      accumulator+=dt;
      while(accumulator>=1/120-1e-10){tick(1/120);accumulator-=1/120;}
    }
    function getState(){return JSON.parse(JSON.stringify(st));}
    return {step,getState,controls,touchObject,state:st};
  }
  const api={create,path,ends,length,random,clamp,mix};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PondPhysics=api;
})(typeof window==='undefined'?globalThis:window);
