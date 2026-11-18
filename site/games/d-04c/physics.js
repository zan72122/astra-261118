/* Coordinates and distances are metres. One fixed integration step is 1/60 s.
   The renderer reads these states and never advances them. */
(function (root) {
  'use strict';
  const D = 1 / 60, C = 1.2, LOSS = .9, DX = .6, WIDTH = 43, ROWS = 104;
  const X0 = -12.6, Z0 = -52.2, N = WIDTH * ROWS, G = 9.81;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const length = Math.hypot;
  function random(seed) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  const basket = {x:3.34, z:-.85};
  const berth = {x:3.05, z:-32.8};
  function create(seed = 4031) {
    const rnd = random(seed);
    const h = new Float64Array(N), v = new Float64Array(N), accel = new Float64Array(N);
    const swells = [], drops = [], wakes = [], events = [];
    let stage = 0, age = 0, elapsed = 0, accumulator = 0, idle = 0, cycle = 0;
    let tide = 0, tideV = 0, gate = 0, gateV = 0, passage = 0, sun = 0, sunV = 0;
    let gust = .35, gustGoal = .5, gustLife = 0, seabirdCall = 8;
    let pointer = null, nextWave = 0, guideAge = 0, lastWave = null, nextId = 1;
    const floats = [], fleet = [], birds = [], laps = [], motes = [];
    let bellAngle=.038, bellVelocity=0;
    for(let i=0;i<37;i++)motes.push({x:(rnd()-.5)*16,y:.42+rnd()*5,z:4-rnd()*47,vx:0,vy:0,vz:0,seed:rnd()*6.28});

    const breeze = Array.from({length:6}, (_, i) => ({phase:rnd()*6.28, rate:.45 + i*.135, length:2.1+i*.65, dir:.2+i*.68, amp:.006+i*.0013}));
    for(let i=0;i<N;i++) h[i] = .0018 * Math.sin((i % WIDTH)*.57 + Math.floor(i/WIDTH)*.31);
    function event(kind, power = 1, x = 0, z = 0) {
      events.push({kind, power, x, z, at:elapsed});
      if(events.length>96) events.shift();
    }
    function body(type,x,z,width,depth,height,draftFactor, yaw) {
      const shape = type === 'buoy' ? .54 : type === 'dinghy' ? .58 : .92;
      const area = width*depth*shape, draft = height*draftFactor;
      const b = {type,x,z,x0:x,z0:z,width,depth,height,area,draft,mass:1000*area*draft,
        y:0,vy:0,vx:0,vz:0,yaw,yaw0:yaw,roll:0,rollV:0,pitch:0,pitchV:0,
        immersed:0,volume:0,push:0,charge:0,delivered:false,moored:false,
        socket:-1,ride:0,rideV:0,lapEnergy:rnd()*.7, lastBump:-10, wet:.4,wetV:0, contact:0,releases:0};
      floats.push(b); return b;
    }
    body('crate',-1.85,-1.6,1.42,1.32,1.28,.29,-.28);
    body('buoy',-.36,1.42,.96,.96,.96,.35,.13);
    body('dinghy',.54,-5.55,1.13,3.04,.72,.31,-.91);
    body('container',-2.8,-34.55,1.65,2.75,1.22,.42,-.35);
    body('pontoon',-.6,-30.25,1.78,2.9,.54,.50,.42);
    for(let i=0;i<3;i++) fleet.push({x:[-6.1,-9.1,4.9][i],z:[-9.7,-16.5,-37.7][i],
      yaw:[1.02,1.25,-.75][i],speed:0,y:0,vy:0,roll:0,rollV:0,travel:0,wakeGap:0,load:0,hoist:0,hoistV:0,latched:false,pendulum:.03*i,pendulumV:0,returnVX:0,returnVZ:0, horn:false});
    for(let i=0;i<7;i++) birds.push({x:-14+i*4.5,y:4.6+rnd()*4,z:-21-rnd()*15,
      vx:.6+rnd()*.65,vy:0,vz:0,flap:rnd()*6.28,bank:0,energy:rnd(),glide:2+rnd()*5});
    for(let i=0;i<5;i++)for(const age of [.19,1.03]){
      const b=floats[i];laps.push({id:nextId++,x:b.x,z:b.z,age,r:b.width*.45+age*.49,power:.58,seed:rnd()*6.28});
    }
    function local(x,z, arr=h) {
      const u = clamp((x-X0)/DX,1,WIDTH-2.001), w = clamp((z-Z0)/DX,1,ROWS-2.001);
      const a = Math.floor(u), b=Math.floor(w), f=u-a,g=w-b,k=b*WIDTH+a;
      return (arr[k]*(1-f)+arr[k+1]*f)*(1-g)+(arr[k+WIDTH]*(1-f)+arr[k+WIDTH+1]*f)*g;
    }
    function windHeight(x,z) {
      let y = 0;
      for (const w of breeze) y+= w.amp*Math.sin((x*Math.cos(w.dir)+z*Math.sin(w.dir))/w.length+w.phase);
      return y;
    }
    function waveAt(w,dist) {
      const d = dist - w.radius, spread = w.lambda*.48;
      if(Math.abs(d)>spread*3) return 0;
      return w.strength*Math.exp(-d*d/(2*spread*spread))*Math.cos(2*Math.PI*d/w.lambda)/Math.sqrt(1+.22*dist);
    }
    function surface(x,z) {
      let y = tide+local(x,z)+windHeight(x,z);
      for(const w of swells) y+=waveAt(w,length(x-w.x,z-w.z));
      return y;
    }
    function kick(x,z,strength) {
      const ix=Math.round((x-X0)/DX), iz=Math.round((z-Z0)/DX);
      if(ix>1&&ix<WIDTH-2&&iz>1&&iz<ROWS-2) {
        const k=iz*WIDTH+ix;
        v[k]+=strength*.6; v[k-1]+=strength*.11; v[k+1]+=strength*.11;
        v[k-WIDTH]+=strength*.09; v[k+WIDTH]+=strength*.09;
      }
    }
    function burst(x,z,n,force) {
      for(let i=0;i<n;i++) {
        const a=rnd()*Math.PI*2,r=(.4+rnd())*force;
        drops.push({id:nextId++,x:x+.1*Math.cos(a),z:z+.1*Math.sin(a),y:surface(x,z)+.055,
          vx:Math.cos(a)*r,vz:Math.sin(a)*r,vy:(1.1+rnd()*1.7)*force, size:.014+rnd()*.027});
      }
    }
    function inPlay(b) {return !b.delivered && ((stage===0&&floats.indexOf(b)<3)||(stage===2&&floats.indexOf(b)>=3));}
    function goal() {return stage===2?berth:basket;}
    function region(x,z) {
      if(stage===1&&gate>.18)return floats.slice(0,3).some(b=>length(x-b.x,z-b.z)<2.4)&&x<4.35;
      if(stage===3)return fleet.some(b=>length(x-b.x,z-b.z)<3.8)&&x<4.4;
      return floats.some(b=>inPlay(b)&&length(x-b.x,z-b.z)<3.6) &&
        (stage===0?x<4.35 && z<5.8 && z>-10:x<5.5 && z<-24 && z>-40);
    }
    function emitWave(x,z,speed,span,dx,dz) {
      const slow = clamp((2.6-speed)/1.6,0,1), long = clamp((span-.48)/1.0,0,1);
      const w={id:nextId++,x,z,radius:0,age:0,strength:0,lambda:.56+1.12/(1+.65*speed),
        amp:.037+.031*Math.min(speed,2)/2+.225*slow*long,dx,dz,hit:0};
      swells.push(w); lastWave={...w}; kick(x,z,.04+w.amp*.43);
      event('water',w.amp*2.2,x,z);
      if(w.amp>.17) burst(x,z,3,.43);
    }
    function touch(action,x,z,stamp=elapsed) {
      if(action==='up'||action==='cancel') {pointer=null;return;}
      if(!Number.isFinite(x+z+stamp))return;
      if(action==='down') {
        if(!region(x,z))return false;
        idle=0;guideAge=0;pointer={x,z,stamp,slowX:x,slowZ:z,span:0,speed:0};nextWave=0;
        emitWave(x,z,0,0,0,0);return true;
      }
      if(!pointer)return false;
      const a=pointer,dx=x-a.x,dz=z-a.z,dist=length(dx,dz),dt=clamp(stamp-a.stamp,1/240,.3);
      if(!region(x,z)||dist>2.5){pointer=null;return false;}
      a.speed=dist/dt;
      if(a.speed>=2.6){a.slowX=x;a.slowZ=z;}
      a.span=length(x-a.slowX,z-a.slowZ);
      if(dist>.001) {
        idle=0;guideAge=0;nextWave-=dist;
        if(nextWave<=0){emitWave(x,z,a.speed,a.span,dx/dist,dz/dist);nextWave=.32;}
      }
      a.x=x;a.z=z;a.stamp=stamp;return true;
    }
    function waterStep() {
      for(const w of breeze) w.phase+=D*w.rate*(.85+.32*gust);
      // Wind pressure at exposed quay stones excites adjacent water cells.
      for(let i=0;i<12;i++){
        const k=(18+i*6)*WIDTH+4+(i*7)%34;
        v[k]+=.011*D*gust*Math.sin(breeze[i%6].phase+i*1.75);
      }
      for(let z=1;z<ROWS-1;z++) for(let x=1;x<WIDTH-1;x++) {
        const k=z*WIDTH+x;
        accel[k]=C*C/(DX*DX)*(h[k-1]+h[k+1]+h[k-WIDTH]+h[k+WIDTH]-4*h[k])-2*LOSS*v[k];
      }
      for(let i=WIDTH+1;i<N-WIDTH-1;i++){v[i]+=accel[i]*D;h[i]+=v[i]*D;}
      for(let i=swells.length-1;i>=0;i--) {
        const w=swells[i]; w.age+=D;w.radius+=C*D;
        const onset=clamp(w.age/.32,0,1);
        w.strength=w.amp*Math.exp(-LOSS*w.age)*onset*onset*(3-2*onset);
        if(w.age>5.8) swells.splice(i,1);
      }
      for(let i=drops.length-1;i>=0;i--) {
        const p=drops[i];p.vy-=G*D;p.y+=p.vy*D;p.x+=p.vx*D;p.z+=p.vz*D;
        if(p.y<=surface(p.x,p.z)){kick(p.x,p.z,p.size*.3);drops.splice(i,1);}
      }
    }
    function setStage(s) {stage=s;age=0;pointer=null;guideAge=0;event('phase',s);}
    function deliver(b) {
      b.delivered=true;b.socket=floats.filter(q=>q.delivered&&q!==b&&floats.indexOf(q)<3).length;
      burst(b.x,b.z,32,1.15);kick(b.x,b.z,.62);
      bellVelocity+=1.68;event('wood',.52,b.x,b.z);event('bell',b.type==='buoy'?.8:1,b.x,b.z);event('splash',.65,b.x,b.z);
    }
    function pull(b,x,z,k,limit=3.3) {
      const dx=x-b.x,dz=z-b.z;
      const gain=Math.min(k,limit/Math.max(.001,length(dx,dz)));
      b.vx+=dx*gain*D;b.vz+=dz*gain*D;
    }
    function floatStep(b,i) {
      const water=surface(b.x,b.z);
      // Bottom is y - draft. Buoy's curved waterline changes the wetted area.
      b.immersed=clamp(water-b.y+b.draft,0,b.height);
      const ratio=b.immersed/b.draft;
      b.volume=b.area*b.immersed*(b.type==='buoy'?clamp(.68+.32*ratio,.7,1.24):1);
      const netGravity=G*(1000*b.volume/b.mass-1);
      const sling=clamp(b.ride/.12,0,1)*Math.max(0,-netGravity+15*(water+b.ride-b.y)-2.3*b.vy);
      b.vy+=(netGravity+sling-3.5*b.vy)*D;b.y+=b.vy*D;
      const sx=(surface(b.x+.34,b.z)-surface(b.x-.34,b.z))/.68;
      const sz=(surface(b.x,b.z+.4)-surface(b.x,b.z-.4))/.8;
      b.rollV+=((sx+.045*b.vx-b.roll)*10-2.7*b.rollV)*D;
      b.pitchV+=((-sz-.03*b.vz-b.pitch)*8-2.4*b.pitchV)*D;
      b.roll+=b.rollV*D;b.pitch+=b.pitchV*D;
      b.wetV+=(clamp(b.immersed/b.height+Math.abs(b.vy)*.46,0,1)-b.wet)*D*3-b.wetV*D*3;b.wet+=b.wetV*D;
      b.contact=Math.max(0,b.contact-D*1.7);
      b.push*=Math.exp(-D*.075);b.charge*=Math.exp(-D*.17);
      if(inPlay(b)){
        const g=goal(),dist=length(g.x-b.x,g.z-b.z),ux=(g.x-b.x)/Math.max(.01,dist),uz=(g.z-b.z)/Math.max(.01,dist);
        for(const w of swells){
          const r=length(b.x-w.x,b.z-w.z),reach=Math.max(b.width,b.depth)*.43;
          if(w.age<.20||w.hit&(1<<i)||Math.abs(r-w.radius)>reach+.18)continue;
          w.hit|=1<<i; const impulse=w.strength;
          if(i<3)b.push=clamp(b.push+impulse*3.6,0,1.18);
          else{
            // Mooring friction stores short pushes; matching broad crests release the load.
            b.charge+=impulse*(.12+clamp((w.amp-.073)/.15,0,1));
            b.push=clamp(b.push+impulse*.12,0,.76);
            if(b.charge>.49){b.charge-=.42;b.releases++;
              b.vx+=ux*.34;b.vz+=uz*.34;b.push=Math.min(.76,b.push+.27);
              event('wood',.64,b.x,b.z);kick(b.x,b.z,.26);}
          }
          const dv=impulse*2*clamp(320*b.width*b.depth/b.mass,.32,1.42)*(i<3?1:.53);
          b.vx+=(.30*w.dx+.70*ux)*dv;b.vz+=(.30*w.dz+.70*uz)*dv;
          b.rollV+=(w.dx||ux)*impulse*.28;
        }
        const force=i<3?b.push*.87:b.push*.61;
        b.vx+=(ux*force-.04*sx)*D;b.vz+=(uz*force-.04*sz)*D;
        if(dist<(i<3?1.07:1.48))deliver(b);
      }else if(stage===0&&b.delivered){
        const q=b.socket;pull(b,basket.x+.63-.18*q,basket.z+.44*(q-1),3);
      }else if(stage===3 && i!==4){
        const boat=fleet[i===3?0:1+i%2];
        const along=i===3?-1.48:(i-1)*.72;
        const swing=boat.pendulum*1.45*(1-boat.load);
        pull(b,boat.x+Math.sin(boat.yaw)*along+Math.cos(boat.yaw)*swing,boat.z+Math.cos(boat.yaw)*along-Math.sin(boat.yaw)*swing,4.4);
        b.vx+=Math.sin(boat.yaw)*boat.speed*1.65*D;
        b.vz+=Math.cos(boat.yaw)*boat.speed*1.65*D;
      }else if(i<3&&stage>=1&&stage<3){
        const current=clamp((gate-.3)/.6,0,1);
        const z=-1.1-passage*36+i*.44, x=2.75-3.55*Math.sin(passage*Math.PI*.92)+i*.18;
        pull(b,x,z,.62*current);
        if(stage===1){b.vx-=sx*.90*D;b.vz-=sz*.90*D;}
      }else if(i>=3&&b.delivered&&stage<=3){pull(b,berth.x+.4*(i-3),berth.z-1.15*(i-3),1.3);}
      else if(stage===4){pull(b,b.x0,b.z0,.39);}
      else pull(b,b.x0,b.z0,.11);
      const drag=Math.exp(-D*(b.delivered?1.65:1.18));
      b.vx*=drag;b.vz*=drag;b.x+=b.vx*D;b.z+=b.vz*D;
      const carrier=fleet[i===3?0:1+i%2];
      const aboard=stage===3&&i!==4;
      const lift=aboard?carrier.hoist*(.96+.68*Math.sin(Math.PI*carrier.load)):0;
      b.rideV+=((lift-b.ride)*4-3*b.rideV)*D;b.ride+=b.rideV*D;
      b.yaw+=(((aboard?carrier.yaw:b.yaw0)-b.yaw)*.32+.064*b.vx)*D;
      // A moving waterline sheds a broken capillary crest. It spreads and dies away.
      b.lapEnergy+=D*(.12+3.2*Math.abs(b.vy)+.47*length(b.vx,b.vz)+gust*.12);
      if(b.lapEnergy>.83 && b.ride<.2){b.lapEnergy=0;
        laps.push({id:nextId++,x:b.x,z:b.z,age:0,r:b.width*.43,power:.38+Math.min(.6,Math.abs(b.vy)+Math.abs(b.vx)),seed:rnd()*6.28});}

    }
    function contactStep() {
      for(let i=0;i<floats.length;i++)for(let j=i+1;j<floats.length;j++) {
        const a=floats[i],b=floats[j];if(a.delivered||b.delivered)continue;
        const dx=a.x-b.x,dz=a.z-b.z,r=length(dx,dz),penetration=(a.width+b.width)*.42-r;
        if(penetration<=0||r<.001)continue;
        const f=penetration*4*D;a.vx+=dx/r*f;b.vx-=dx/r*f;a.vz+=dz/r*f;b.vz-=dz/r*f;
        if(elapsed-a.lastBump>.8){a.lastBump=elapsed;a.contact=b.contact=1;event('wood',clamp(f*25,.12,.8),a.x,a.z);kick(a.x,a.z,.09);}
      }
    }
    const moorings=[[-6.1,-9.7,1.02],[-9.1,-16.5,1.25],[4.9,-37.7,-.75]];
    function boatsStep() {
      for(let i=0;i<fleet.length;i++) {
        const b=fleet[i],m=moorings[i],depart=stage===3;
        const manifest=i===0?[floats[3]]:i===1?[floats[0],floats[2]]:[floats[1]];
        if(depart&&manifest.every(q=>length(q.x-b.x,q.z-b.z)<2.75))b.latched=true;
        b.hoistV+=((depart&&b.latched?1:0)-b.hoist)*.55*D-b.hoistV*1.45*D;b.hoist=clamp(b.hoist+b.hoistV*D,0,1);
        b.pendulumV+=(-3.1*b.pendulum-.8*b.pendulumV+b.hoistV*.8+b.roll*.4)*D;b.pendulum+=b.pendulumV*D;
        if(depart&&b.latched&&b.hoist>.89&&manifest.every(q=>q.immersed<.03)){
          const suspendedMass=manifest.reduce((sum,q)=>sum+q.mass,0);
          b.load=clamp(b.load+D*.18/(1+suspendedMass*.00026+Math.abs(b.pendulumV)*3),0,1);
        }else if(stage===4)b.load=Math.max(0,b.load-D*.105);
        const targetSpeed=depart && b.load>.98?1.7+i*.11:0;
        b.speed+=(targetSpeed-b.speed)*(targetSpeed?.17:.65)*D;
        if(targetSpeed&&!b.horn){event('horn',1-i*.12,b.x,b.z);b.horn=true;}
        if(depart){
          b.travel+=b.speed*D;
          const u=clamp(b.travel/10,0,1);
          b.yaw+=(-2.05-b.yaw)*u*.38*D;b.x+=Math.sin(b.yaw)*b.speed*D;b.z+=Math.cos(b.yaw)*b.speed*D;
        }else if(stage===1||stage===2){
          // The small fleet takes its place at the inner loading pier.
          const a=passage*passage*(3-2*passage);
          b.x+=((1-a)*m[0]+a*[2.7,-1.55,-4.8][i]-b.x)*.38*D;
          b.z+=((1-a)*m[1]+a*[-36.6,-39.5,-43.2][i]-b.z)*.38*D;
        }else if(stage===4){
          const dx=m[0]-b.x,dz=m[1]-b.z,gain=Math.min(.25,2.2/Math.max(.01,length(dx,dz)));
          b.returnVX+=(dx*gain-b.returnVX)*.66*D;b.returnVZ+=(dz*gain-b.returnVZ)*.66*D;
          b.x+=b.returnVX*D;b.z+=b.returnVZ*D;b.yaw+=(m[2]-b.yaw)*.24*D;
        }
        const y=surface(b.x,b.z);
        b.vy+=((y-b.y)*10-b.vy*3)*D;b.y+=b.vy*D;
        b.rollV+=((surface(b.x+.7,b.z)-surface(b.x-.7,b.z)-b.roll)*3-b.rollV*1.7)*D;b.roll+=b.rollV*D;
        b.wakeGap+=b.speed*D;
        if(b.wakeGap>.42){b.wakeGap=0;
          for(const side of [-1,1])wakes.push({id:nextId++,ship:i,x:b.x-Math.sin(b.yaw)*2,z:b.z-Math.cos(b.yaw)*2,
            yaw:b.yaw+.55*side,side,width:.22,age:0,energy:.55+b.speed*.17});
        }
      }
      for(let i=wakes.length-1;i>=0;i--){const p=wakes[i];
        p.x+=Math.cos(p.yaw)*p.side*.45*D;p.z-=Math.sin(p.yaw)*p.side*.45*D;
        p.age+=D;p.energy*=Math.exp(-.20*D);p.width+=D*.042;
        if(p.age<4)kick(p.x,p.z,p.energy*.135*D);
        if(p.energy<.055)wakes.splice(i,1);
      }
    }
    function birdsStep(){
      for(let i=0;i<birds.length;i++){const b=birds[i];b.glide-=D;
        if(b.glide<=0){b.energy=.7+rnd()*.3;b.glide=2+rnd()*4;}
        b.energy*=Math.exp(-1.1*D);b.flap+=D*(1.2+9*b.energy);
        const ax=-.007*(b.x-(i-3)*2.6)+.16*Math.sin(b.flap*.38)*gust;
        b.vx+=ax*D;b.vz+=(-.04*(b.z+28+i*.65)-.2*b.vz+.15*gust)*D;
        b.vy+=((5.5+i*.36-b.y)*.25-.55*b.vy+b.energy*.6)*D;
        b.x+=b.vx*D;b.y+=b.vy*D;b.z+=b.vz*D;b.bank+=(ax-b.bank)*D;
      }
      seabirdCall-=D;if(seabirdCall<0){event('gull',.22+rnd()*.1,birds[0].x,birds[0].z);seabirdCall=11+rnd()*10;}
    }
    function tick(){
      elapsed+=D;age+=D;idle+=D;guideAge=idle>4?guideAge+D:0;
      gustLife-=D;if(gustLife<=0){gustGoal=.16+rnd()*.85;gustLife=1.3+rnd()*3.6;}
      gust+=(gustGoal-gust)*.6*D;
      const tideGoal=stage>=1&&stage<=3?.98:0;
      tideV+=((tideGoal-tide)*.048-.47*tideV)*D;tide+=tideV*D;
      const opening=clamp((tide-.23)/.57,0,1);
      gateV+=((opening-gate)*.48-gateV*1.6)*D;gate+=gateV*D;
      if(stage===1)passage=clamp(passage+gate*D/24,0,1);
      if(stage===4)passage=clamp(passage-D/20,0,1);
      const lightGoal=stage===3?1:stage===2?.28:0;
      sunV+=((lightGoal-sun)*.044-.46*sunV)*D;sun+=sunV*D;
      bellVelocity+=(-10.5*bellAngle-.83*bellVelocity+.043*gust*Math.sin(breeze[2].phase))*D;bellAngle+=bellVelocity*D;
      for(let i=laps.length-1;i>=0;i--){const q=laps[i];q.age+=D;q.r+=D*(.52+.12*q.power);q.power*=Math.exp(-D*.60);if(q.power<.058)laps.splice(i,1);}
      for(const p of motes){const f=breeze[2].phase+p.seed;
        p.vx+=(.08*gust+.04*Math.cos(f+p.z)-p.vx)*D;
        p.vy+=(.043*Math.sin(f+p.x)+.033*(1.2+2*Math.sin(p.seed)**2-p.y)-.34*p.vy)*D;
        p.vz+=(.035*Math.sin(f+p.y)-.45*p.vz)*D;
        p.x+=p.vx*D;p.y+=p.vy*D;p.z+=p.vz*D;
        if(p.x>13)p.vx-=D*.45*(p.x-13);
      }
      waterStep();floats.forEach(floatStep);contactStep();boatsStep();birdsStep();
      if(stage===0&&floats.slice(0,3).every(b=>b.delivered))setStage(1);
      else if(stage===1&&passage>=1)setStage(2);
      else if(stage===2&&floats.slice(3).every(b=>b.delivered))setStage(3);
      else if(stage===3&&fleet.every(b=>b.travel>17))setStage(4);
      else if(stage===4&&passage===0&&tide<.012&&floats.every(b=>length(b.x-b.x0,b.z-b.z0)<.19)
        &&fleet.every((b,i)=>length(b.x-moorings[i][0],b.z-moorings[i][1])<.22)){
        for(const b of floats){b.delivered=false;b.socket=-1;b.push=0;b.charge=0;b.releases=0;}
        for(const b of fleet){b.horn=false;b.latched=false;b.travel=0;b.load=0;}
        cycle++;setStage(0);
      }
    }
    // Initialise hydrostatic equilibrium before the very first public snapshot.
    for(const b of floats){b.y=surface(b.x,b.z);b.immersed=b.draft;b.volume=b.area*b.draft;}
    function step(dt){if(!Number.isFinite(dt)||dt<0)return;accumulator+=dt;
      while(accumulator>=D-1e-10){tick();accumulator-=D;}}
    function state(){return {elapsed,stage,age,cycle,idle,guideAge,tide,tideV,gate,gateV,passage,sun,gust,
      bellAngle,bellVelocity,laps:laps.map(p=>({...p})),motes:motes.map(p=>({...p})),waveSpeed:C,decay:LOSS,gridSpacing:DX,gridWidth:WIDTH,gridRows:ROWS,
      cells:Array.from(h),cellVelocity:Array.from(v),breeze:breeze.map(w=>({...w})),
      objects:floats.map(b=>({...b})),fleet:fleet.map(b=>({...b})),birds:birds.map(b=>({...b})),
      waves:swells.map(w=>({...w})),lastWave:lastWave&&{...lastWave},particles:drops.map(p=>({...p})),wakes:wakes.map(p=>({...p}))};}
    return {step,getState:state,touch,surface,region,goal,objects:floats,fleet,birds,waves:swells,drops,wakes,laps,motes,breeze,events,grid:h,
      get scene(){return {stage,age,elapsed,cycle,idle,guideAge,tide,gate,passage,sun,gust,bellAngle};}};
  }
  const api={create,basket,berth}; if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HarborPhysics=api;
})(globalThis);
