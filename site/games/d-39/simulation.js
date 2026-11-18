(function (root) {
  'use strict';
  const M = 0.31, H = 1 / 120, NX = 39, NZ = 33;
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const patches = [
    {x:0.28,z:-0.26,rx:1.53,rz:1.03,depth:1,material:'asphalt'},
    {x:1.86,z:-2.55,rx:0.58,rz:1.84,depth:4,material:'leaves'},
    {x:2.10,z:-4.73,rx:0.39,rz:1.08,depth:2,material:'asphalt'}
  ];
  const spots = [
    [[0.08,0.03],[0.88,-0.45],[-0.51,-0.38]],
    [[1.73,-1.49],[1.94,-2.48],[1.75,-3.17]],
    [[2.80,-3.55],[2.86,-4.19],[2.68,-4.69]],
    [[3.05,-5.02],[3.48,-5.10],[3.22,-5.53]]
  ];
  function edge(i,a) {
    return 1+0.076*Math.sin(3*a+i*1.7)+0.072*Math.cos(5*a+0.7)+0.039*Math.sin(8*a-0.93)+0.017*Math.cos(13*a+i);
  }
  function createGame(seed=19763) {
    function random() { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
    function boot(x,z) {return {x,z,y:0,vx:0,vz:0,vy:0,tilt:0,tiltV:0,fill:0,slosh:0,sloshV:0,mass:0.46,mode:'rest',speed:0.86,tx:x,tz:z,held:false,drain:0};}
    const pools=patches.map(p=> {
      const h=new Float64Array(NX*NZ),v=new Float64Array(NX*NZ), mask=new Uint8Array(NX*NZ);
      for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){
        const u=i/(NX-1)*2-1,w=j/(NZ-1)*2-1;
        mask[i+j*NX]=Math.hypot(u,w)<edge(patches.indexOf(p),Math.atan2(w,u))?1:0;
      }
      return {h,v,mask};
    });
    const s={time:0,phase:0,cycle:0,hits:0,active:0,idle:0,hint:0,hintWait:4,
      boots:[boot(-.73,1.06),boot(-1.24,.63)],pools,rings:[],drops:[],rainDrops:[],events:[],serial:0,
      leaves:[],boat:{x:0.71,z:-0.82,y:0,vy:0,vx:0,vz:0,roll:-0.03,vr:0,yaw:0.45,spin:0},
      rain:0,roof:0,cutoff:8000,catchment:0,cupAngle:0,cupV:0,tipping:false,pouring:false,poured:0,connected:false,reachedDoor:false,wheelAngle:0,wheelSpeed:0,wheelGrip:false,wheelForce:0,spills:0,
      channel:Array.from({length:12},()=>({water:0,flux:0})),outflow:0,underRoof:false,dusk:0,lamp:0,
      flutter:0,wind:0.13,windGoal:0.2,windWait:1,skyLight:0.91,skyV:0,
      last:null,returning:false,wait:0,dripCount:0,nextDrip:0.19,rainCredit:0,guide:null,chain:Array.from({length:9},()=>({angle:0,speed:0})),motes:[],cupHeld:false,cupPull:0,lastStroke:-1,brushCount:0,fallingBeads:[],landingCount:0,keys:[0,0,0,0],keySpeed:[0,0,0,0]};
    for(let k=0;k<16;k++){
      const pi=k<9?0:1,p=patches[pi],a=random()*6.28,r=0.66+random()*0.3;
      s.leaves.push({x:p.x+p.rx*r*Math.cos(a),z:p.z+p.rz*r*Math.sin(a),yaw:random()*6.28,vx:0,vz:0,spin:0,pool:pi,size:0.75+random()*0.55,roll:0});
    }
    for(let i=0;i<15;i++)s.motes.push({x:-2.5+random()*5,y:random()*2,z:1-random()*7,vx:random()*.03,vy:random()*.05,life:1+random()*5,opacity:0,seed:random()});
    function emit(kind,data={}) {
      s.events.push({id:++s.serial,kind,...data}); if(s.events.length>100)s.events.shift();
    }
    function target(){if(s.phase===2&&s.connected)return [3.07,-4.69]; const a=spots[s.phase];return a[s.hits%a.length];}
    function ground(x,z){return x>2.46?0.145:0.012;}
    function wake(pi,x,z,amp,width=0.16){
      const p=patches[pi],q=pools[pi];
      const ix=(0.5+(x-p.x)/(2*p.rx))*(NX-1),iz=(0.5+(z-p.z)/(2*p.rz))*(NZ-1);
      for(let j=Math.max(1,Math.floor(iz-5));j<Math.min(NZ-1,iz+6);j++)
        for(let i=Math.max(1,Math.floor(ix-5));i<Math.min(NX-1,ix+6);i++){
          const d=((i-ix)*2*p.rx/(NX-1))**2+((j-iz)*2*p.rz/(NZ-1))**2;
          if(q.mask[j*NX+i])q.v[j*NX+i]+=amp*Math.exp(-d/(width*width));
        }
    }
    function sample(pi,x,z){
      const p=patches[pi],q=pools[pi];
      const i=clamp((0.5+(x-p.x)/(p.rx*2))*(NX-1),0,NX-1.001), j=clamp((0.5+(z-p.z)/(p.rz*2))*(NZ-1),0,NZ-1.001);
      const k=Math.floor(j)*NX+Math.floor(i),a=i%1,b=j%1;
      return (q.h[k]*(1-a)+q.h[k+1]*a)*(1-b)+(q.h[k+NX]*(1-a)+q.h[k+NX+1]*a)*b;
    }
    function ring(pi,x,z,strength,limit){
      s.rings.push({id:++s.serial,pi,x,z,r:0.026,energy:strength,limit});
      if(s.rings.length>42)s.rings.shift();
    }
    ring(0,0.15,-0.04,0.68,0.97); s.rings[0].r=0.25;
    ring(0,0.15,-0.04,0.41,1.18); s.rings[1].r=0.47;
    wake(0,.15,-.04,.043,.14);wake(1,1.72,-2.73,.018,.09);
    function begin(hold=false,place=null){
      const b=s.boots[s.active]; if(b.mode!=='rest'||s.returning)return false;
      const [x,z]=place||target(); b.tx=x;b.tz=z;b.held=hold;b.mode='lift';b.speed=0.86;b.originX=b.x;b.originZ=b.z;b.drag=hold?0.32:1;
      s.idle=0;s.hint=0;s.hintWait=4;s.guide=null;
      return true;
    }
    function drag(f,speed){const b=s.boots[s.active];if(b.held){b.drag=clamp(f,0.16,1);b.speed=clamp(speed,0.4,1.8);}}
    function release(speed){const b=s.boots[s.active];if(b.held){b.held=false;b.drag=1;b.speed=clamp(speed===undefined?b.speed:speed,0.4,1.8);}}
    function stepAt(speed){if(!begin())return false;s.boots[s.active].speed=clamp(speed,.4,1.8);return true;}
    function splash(b,pi) {
      const p=patches[pi],radius=p?Math.hypot((b.x-p.x)/p.rx,(b.z-p.z)/p.rz):0;
      const d=p?1+(p.depth-1)*(1-clamp((radius-.58)/.42,0,1)):0;
      const mat=p?p.material:(s.phase===2?'wetTile':'tile');
      const v=b.speed, height=d?0.10*v*v:0, before=b.fill;
      const key=clamp(Math.floor((b.x-2.48)/.34),0,3);
      const freq=(d?510/(1+0.55*d):mat==='wetTile'?294:[523.25,587.33,659.25,783.99][key])*(mat==='leaves'?0.88:1);
      if(mat==='tile'){s.keySpeed[key]+=.8*v;}
      s.last={speed:v,depth:d,height,bottomHz:freq,material:mat,fillBefore:before,footCutoff:8200/(1+1.18*before),boot:s.active};
      if(d){
        b.drain=Math.min(4-b.fill,0.15*d+0.12*v);
        wake(pi,b.x,b.z,0.074*v*v,0.20); ring(pi,b.x,b.z,0.55+v*0.28,.75+.25*d);
        for(let k=0;k<Math.round(10+v*v*12);k++){
          const a=2*Math.PI*random(),f=k===0?1:0.3+random()*0.7,r=0.22+0.15*random();
          s.drops.push({id:++s.serial,x:b.x+r*Math.cos(a),z:b.z+r*Math.sin(a),y:0.028,vx:v*(0.25+f)*Math.cos(a),vz:v*(0.25+f)*Math.sin(a),vy:Math.sqrt(2*9.81*height)*f/M,size:0.014+0.019*random(),pi});
        }
        for(const l of s.leaves){const dx=l.x-b.x,dz=l.z-b.z,dist=Math.max(.08,Math.hypot(dx,dz)),kick=v*Math.exp(-dist*1.6);l.vx+=dx/dist*kick;l.vz+=dz/dist*kick;l.spin+=(random()-.5)*3*kick;}
        const boat=s.boat,dist=Math.hypot(boat.x-b.x,boat.z-b.z);
        boat.vr+=v/(0.35+dist)*0.85;boat.spin+=v*0.25;boat.vz-=v*0.18/(0.5+dist);
      }
      if(s.phase===2&&s.connected)s.reachedDoor=true;
      s.hits++;s.underRoof=s.phase>=2;
      if(s.phase===3)b.drain=-b.fill;
      emit('step',{...s.last,fill:before,roof:s.roof});
      b.tiltV+=v*.68;b.sloshV+=v*.57*before;
    }
    function boots(dt) {
      for(const b of s.boots){
        const gain=14/b.mass;
        if(b.mode==='lift'||b.mode==='follow'){
          const follow=b.mode==='follow', f=follow?1:b.drag;
          const tx=b.originX+(b.tx-b.originX)*f,tz=b.originZ+(b.tz-b.originZ)*f;
          b.vx+=((tx-b.x)*gain*2-2*Math.sqrt(gain*2)*b.vx)*dt;
          b.vz+=((tz-b.z)*gain*2-2*Math.sqrt(gain*2)*b.vz)*dt;
          const walkingSpeed=Math.hypot(b.vx,b.vz),limit=(follow?.84:1.16)/M*Math.sqrt(.46/b.mass);
          if(walkingSpeed>limit){b.vx*=limit/walkingSpeed;b.vz*=limit/walkingSpeed;}
          const top=Math.max(ground(b.tx,b.tz),ground(b.x,b.z))+(follow?.24:.69-(b.held?.24*f:0));
          b.vy+=((top-b.y)*gain*3-2*Math.sqrt(gain*3)*b.vy)*dt;
          if(!b.held&&Math.hypot(b.tx-b.x,b.tz-b.z)<.1&&b.y>top-.075){b.mode=follow?'settle':'down';if(!follow)b.vy=-b.speed/M;}
        }else if(b.mode==='down'||b.mode==='settle'){
          b.vy=Math.max(-b.speed/M,b.vy-9.81/M*dt);b.vx*=Math.exp(-5*dt);b.vz*=Math.exp(-5*dt);
          if(b.y+b.vy*dt<=ground(b.x,b.z)){
            const play=b.mode==='down'; b.y=ground(b.x,b.z);b.vy=0;b.mode='rest';
            if(play){splash(b,s.phase<2?s.phase:-1);s.active=1-s.active;s.wait=.7;}
          }
        }else {b.vx*=Math.exp(-14*dt);b.vz*=Math.exp(-14*dt);}
        b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;
        const desired=b.mode==='lift'?-.12:((s.returning&&b.fill>.025)?0.76:0);
        b.tiltV+=((desired-b.tilt)*35-b.tiltV*7)*dt;b.tilt+=b.tiltV*dt;
        b.sloshV+=((-b.tilt-b.slosh)*27-b.sloshV*3.2)*dt;b.slosh+=b.sloshV*dt;
        const transfer=b.drain*(1-Math.exp(-5*dt));b.fill=clamp(b.fill+transfer,0,4);b.drain-=transfer;b.mass=.46+.2*b.fill;
      }
    }
    function waves(dt){
      for(const d of s.fallingBeads){
        d.vy-=9.81/M*dt;d.y+=d.vy*dt;
        if(d.y<=.024){wake(d.pi,d.x,d.z,d.power,.10);ring(d.pi,d.x,d.z,.48,.73);s.landingCount++;emit('drip',{pi:d.pi,x:d.x,roof:s.roof});}
      }
      s.fallingBeads=s.fallingBeads.filter(d=>d.y>.024);
      for(let n=0;n<pools.length;n++){
        const q=pools[n],p=patches[n],c=0.5+0.095*p.depth;
        const cx=(c*(NX-1)/(2*p.rx))**2,cz=(c*(NZ-1)/(2*p.rz))**2;
        for(let k=NX+1;k<q.h.length-NX-1;k++)if(q.mask[k]){
          const h=q.h[k];q.v[k]+=((q.h[k-1]+q.h[k+1]-2*h)*cx+(q.h[k-NX]+q.h[k+NX]-2*h)*cz-q.v[k]*2.25)*dt;
        }
        for(let k=0;k<q.h.length;k++)q.h[k]+=q.v[k]*dt;
      }
      for(const r of s.rings){r.r+=(.50+.095*patches[r.pi].depth)*dt;r.energy*=Math.exp(-1.34*dt);}
      s.rings=s.rings.filter(r=>r.r<r.limit&&r.energy>.045);
      for(const d of s.drops){d.y+=d.vy*dt-.5*9.81/M*dt*dt;d.vy-=9.81/M*dt;d.x+=d.vx*dt;d.z+=d.vz*dt;
        if(d.y<=.022&&d.vy<0){wake(d.pi,d.x,d.z,.013,.065);if(d.size>.029)ring(d.pi,d.x,d.z,.27,.37);}}
      s.drops=s.drops.filter(d=>d.y>.022||d.vy>=0);
      s.nextDrip-=dt;
      if(s.nextDrip<=0){
        const focus=s.phase<2&&s.dripCount%3===0,pi=focus?s.phase:(random()<.68?0:1),p=patches[pi],a=random()*6.28,r=Math.sqrt(random())*.85;
        const [x,z]=focus?target():[p.x+Math.cos(a)*r*p.rx,p.z+Math.sin(a)*r*p.rz];
        s.fallingBeads.push({pi,x,z,y:1.71+random()*.46,vy:-.52,power:.031+random()*.025,size:.018});s.dripCount++;
        s.nextDrip=(.45+random()*1.48)/(1+s.rain*3.1);
      }
    }
    // A finger sweeps momentum into a local patch. The bank and fluid drag stop the drift.
    function stroke(x,z,dx,dz) {
      if(s.phase>1||s.time-s.lastStroke<.065)return;
      const pi=s.phase,p=patches[pi],u=(x-p.x)/p.rx,w=(z-p.z)/p.rz;
      if(Math.hypot(u,w)>edge(pi,Math.atan2(w,u)))return;
      const strength=clamp(Math.hypot(dx,dz)*2,.12,1.2);
      wake(pi,x,z,.085*strength,.11);ring(pi,x,z,.26+strength*.3,.45+strength*.45);
      for(const l of s.leaves)if(l.pool===pi){
        const influence=Math.exp(-6*Math.hypot(l.x-x,l.z-z));
        l.vx+=clamp(dx,-.5,.5)*influence*2.6;l.vz+=clamp(dz,-.5,.5)*influence*2.6;l.spin+=influence*strength;
      }
      const b=s.boat,contact=Math.exp(-2*Math.hypot(b.x-x,b.z-z));
      b.vx+=clamp(dx,-.4,.4)*contact;b.vz+=clamp(dz,-.4,.4)*contact;b.vr+=contact*strength*.6;
      s.lastStroke=s.time;s.brushCount++;s.hint=0;s.hintWait=4;emit('brush',{depth:p.depth,power:strength});
    }
    function pullCup(pull){
      if(s.phase!==2)return;s.cupHeld=pull!==null;s.cupPull=clamp(pull||0,0,1);if(pull!==null)s.chain[8].speed+=.5*(s.cupPull-s.cupAngle);
      s.hint=0;s.hintWait=4;
    }
    function turnWheel(amount){
      if(s.phase!==2||!s.connected)return;
      s.wheelGrip=amount!==null;s.wheelForce=clamp(amount||0,-1,1);s.hint=0;s.hintWait=4;
    }
    function current(dt){
      const wet=s.phase===2?1:0;
      s.rain+=(wet-s.rain)*(1-Math.exp(-dt*(wet?.52:.39)));
      s.roof+=((s.underRoof?1:0)-s.roof)*(1-Math.exp(-dt*2));
      s.cutoff=8000/(1+3.6*s.roof);
      s.catchment+=s.rain*.19*dt;
      if(s.catchment>.67)s.tipping=true;
      const torque=s.tipping?3.4*s.catchment+1.65:0;
      s.cupV+=(torque+(s.cupHeld?8*(s.cupPull-s.cupAngle):0)-2.6*s.cupAngle-2.1*s.cupV)*dt;s.cupAngle+=s.cupV*dt;
      let release=0;
      if(s.cupAngle>.48&&s.catchment>0){release=Math.min(s.catchment/dt,1.4*Math.sin(s.cupAngle));s.catchment-=release*dt;}
      s.poured+=release*dt;
      if(release>.015&&s.catchment>.012&&!s.pouring){s.pouring=true;s.spills++;emit('pour');}
      if(release<.005)s.pouring=false;
      if(s.tipping&&s.catchment<.08)s.tipping=false;
      let incoming=release;
      for(let i=0;i<s.channel.length;i++){
        const c=s.channel[i],flow=Math.min(c.water/dt,Math.max(0,c.water-.004)*(4.2+i*.07));
        c.water+=(incoming-flow)*dt;c.flux=flow;incoming=flow;
      }
      s.outflow=incoming;if(s.phase===2&&incoming>.017)s.connected=true;
      // Undershot paddles drive an axle. A peg plucks one tine per quarter turn.
      const detent=Math.floor(s.wheelAngle/(Math.PI/2));
      s.wheelSpeed+=(9*incoming+(s.wheelGrip?s.wheelForce*8:0)-s.wheelSpeed*1.15)*dt;
      s.wheelAngle+=s.wheelSpeed*dt;
      if(detent!==Math.floor(s.wheelAngle/(Math.PI/2))&&s.cycle>0)emit('tine',{note:Math.abs(detent)%4});
      s.rainCredit+=s.rain*dt*58;
      while(s.rainCredit>=1){s.rainCredit--;s.rainDrops.push({x:-3+random()*6,z:2-random()*10,y:2.8+random()*2.8,vy:-5-random()*2});}
      for(const d of s.rainDrops){d.y+=d.vy*dt;d.x+=s.wind*dt;}
      for(const d of s.rainDrops)if(d.y<=.03){
        for(let pi=0;pi<patches.length;pi++){const p=patches[pi],u=(d.x-p.x)/p.rx,w=(d.z-p.z)/p.rz;
          if(Math.hypot(u,w)<edge(pi,Math.atan2(w,u))){wake(pi,d.x,d.z,.016,.074);if(d.vy< -6.7)ring(pi,d.x,d.z,.29,.32);break;}}
      }
      s.rainDrops=s.rainDrops.filter(d=>d.y>.03);
    }
    function air(dt){
      // Each rain-chain joint feels its own weight and the tension of its immediate neighbours.
      for(let i=0;i<s.chain.length;i++){
        const link=s.chain[i],above=i?s.chain[i-1].angle:0,below=i<8?s.chain[i+1].angle:link.angle;
        link.speed+=((above+below-2*link.angle)*23-link.angle*4.2-link.speed*(2.0+i*.03)+s.wind*(.6+i*.14))*dt;
      }
      for(const l of s.chain)l.angle+=l.speed*dt;
      for(const m of s.motes){
        m.life-=dt;m.vx+=(s.wind*(.45+m.seed*.5)-m.vx)*dt;
        m.vy+=((.021+m.seed*.023)*(1-s.rain*3)-m.vy)*dt;
        m.x+=m.vx*dt;m.y+=m.vy*dt;
        const visible=Math.min(1,Math.max(0,m.life*2))*(1-s.rain*.91);
        m.opacity+=(visible-m.opacity)*(1-Math.exp(-dt*2.5));
        if(m.life< -1.6){m.x=-2.4+random()*4.8;m.z=1-random()*7;m.y=.12+random()*1.84;m.vx=0;m.vy=0;m.life=2.5+random()*6;m.opacity=0;}
      }
    }
    function floats(dt){
      s.windWait-=dt;if(s.windWait<=0){s.windGoal=(random()-.33)*.46;s.windWait=.46+2*random();}
      s.wind+=(s.windGoal-s.wind)*(1-Math.exp(-dt*.72));
      s.skyV+=((.87+s.wind*.24-s.rain*.1-s.skyLight)*.75-s.skyV*1.42)*dt;s.skyLight+=s.skyV*dt;
      for(const l of s.leaves){
        const p=patches[l.pool],dx=l.x-p.x,dz=l.z-p.z;
        const slope=sample(l.pool,l.x+.05,l.z)-sample(l.pool,l.x-.05,l.z);
        l.vx+=(s.wind*.04-slope*7-l.vx*1.5)*dt;l.vz+=(-s.outflow*.75-l.vz*1.6)*dt;
        if(Math.hypot(dx/p.rx,dz/p.rz)>.89){l.vx-=dx*dt*.7;l.vz-=dz*dt*.55;}
        l.x+=l.vx*dt;l.z+=l.vz*dt;l.spin+=(s.wind*.13-l.spin*2)*dt;l.yaw+=l.spin*dt;l.roll=clamp(slope*6,-.32,.32);
      }
      const b=s.boat,pi=s.phase===0?0:1,wy=sample(pi,b.x,b.z)/M;
      const [gx,gz]=s.returning?[.71,-.82]:s.phase===0?[.71,-.82]:s.phase===1?[1.65,-2.66]:[1.9,-3.77-Math.min(.77,s.spills*.24)];
      b.vx+=((gx-b.x)*.70+s.wind*.062-b.vx*1.32)*dt;
      b.vz+=((gz-b.z)*.65-s.outflow*.62-b.vz*1.2)*dt;
      b.vr+=((slopeBoat(pi,b)*3-b.roll)*12-b.vr*2.5)*dt;
      b.vy+=((wy-b.y)*18-b.vy*4.3)*dt;
      b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;b.roll+=b.vr*dt;
      b.spin+=((s.wind*.3+b.vx*.55)-b.spin*1.6)*dt;b.yaw+=b.spin*dt;
    }
    function slopeBoat(pi,b){return (sample(pi,b.x+.12,b.z)-sample(pi,b.x-.12,b.z))/.24;}
    function follow(b,x,z){b.originX=b.x;b.originZ=b.z;b.tx=x;b.tz=z;b.held=false;b.mode='follow';b.speed=.72;}
    function advance(n){s.wheelGrip=false;s.wheelForce=0;s.cupHeld=false;s.cupPull=0;s.phase=n;s.hits=0;s.hint=0;s.hintWait=4;s.idle=0;emit('phase',{phase:n});}
    function story(dt){
      for(let i=0;i<4;i++){s.keySpeed[i]+=(-49*s.keys[i]-7*s.keySpeed[i])*dt;s.keys[i]+=s.keySpeed[i]*dt;}
      s.wait=Math.max(0,s.wait-dt);s.idle+=dt;
      const resting=s.boots.every(b=>b.mode==='rest');
      if(resting&&!s.wait){
        if(s.phase===0&&s.hits>=2)advance(1);
        else if(s.phase===1&&s.hits>=3)advance(2);
        else if(s.phase===2&&s.underRoof&&s.poured>.12&&s.connected&&s.reachedDoor)advance(3);
        else if(s.phase===3&&s.hits>=3&&!s.returning){s.returning=true;s.wait=2.5;s.boots.forEach(b=>b.drain=-b.fill);}
        else if(s.returning){
          s.returning=false;s.cycle++;s.spills=0;s.poured=0;s.connected=false;s.reachedDoor=false;s.underRoof=false;advance(0);s.active=0;
          follow(s.boots[0],-.73,1.06);follow(s.boots[1],-1.24,.63);
        }
      }
      const evening=s.phase===3&&!s.returning?1:0;
      s.dusk+=(evening-s.dusk)*(1-Math.exp(-dt*.43));
      s.lamp+=((s.dusk>.31?1:0)-s.lamp)*(1-Math.exp(-dt*(evening?2:.8)));
      if(!resting||s.returning){s.hint=0;s.hintWait=4;}
      else if(s.hintWait>0){s.hintWait-=dt;}
      else {s.hint+=dt;if(s.hint>2.6){s.hint=0;s.hintWait=2.9;}}
    }
    let remainder=0;
    function step(dt){
      if(!Number.isFinite(dt)||dt<0)return;
      remainder+=dt;
      while(remainder>=H-1e-10){remainder-=H;s.time+=H;boots(H);current(H);waves(H);floats(H);air(H);story(H);}
    }
    function getState(){return JSON.parse(JSON.stringify({...s,pools:pools.map(p=>({h:Array.from(p.h),v:Array.from(p.v)}))}));}
    return {step,getState,world:s,begin,release,drag,stepAt,target,sample,stroke,pullCup,turnWheel};
  }
  const api={createGame,patches,spots,edge,M,NX,NZ};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.RainLane=api;
})(globalThis);
