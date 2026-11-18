(function (root) {
  'use strict';
  const LENGTH = 2400, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mod = (v, n) => ((v % n) + n) % n;
  const smooth = (a, b, v) => { const k = clamp((v-a)/(b-a),0,1); return k*k*(3-2*k); };
  const local = s => mod(s, LENGTH);
  function random(seed) {
    let a = seed >>> 0;
    return () => { a = (Math.imul(1664525,a)+1013904223)>>>0; return a / 4294967296; };
  }
  function fork(s) { const d=local(s); return smooth(310,402,d)*(1-smooth(595,710,d)); }
  function baseX(s) {
    return 19*Math.sin(s*TAU/300-.64)+9*Math.sin(s*TAU/200+.48)+34*Math.sin(s*TAU/800+.25);
  }
  function height(s) {
    const d=local(s);
    return 1.75*Math.sin(s*TAU/240+.3)+2.7*Math.sin(s*TAU/600)+26*smooth(1300,1820,d)*(1-smooth(2080,2380,d));
  }
  function point(s, route=0) {
    const f=fork(s);
    return {x:baseX(s)+f*(route>0?8:-5), y:height(s)+f*(route>0?7.2:-.9),z:-s};
  }
  function heading(s,route) { return Math.atan2(point(s+0.3,route).x-point(s-0.3,route).x,.6); }
  function river(s) {
    const d=local(s), crossing=smooth(440,505,d)*(1-smooth(525,575,d));
    return -9.6-1.7*Math.sin(s*.073)-1.25*Math.sin(s*.024)+crossing*6.8+10.4*smooth(147,180,d)*(1-smooth(187,217,d));
  }
  function wetness(s,route) {
    const d=local(s);
    return Math.max(smooth(166,177,d)*(1-smooth(191,204,d)),route<=0?smooth(473,490,d)*(1-smooth(539,560,d)):0);
  }
  function snow(s){const d=local(s);return smooth(1440,1670,d)*(1-smooth(2110,2320,d));}
  function tunnel(s){ const d=local(s);return smooth(777,795,d)*(1-smooth(918,936,d)); }
  function stage(s){const d=local(s); return d<310?0:d<777?1:d<948?2:d<1530?3:4;}
  const rings=[18,91,224];
  function create(seed=42017) {
    const rng=random(seed);
    const state={
      time:0,s:0,travel:0,speed:0,held:false,idle:0,route:0,lap:0,stage:0,surface:'leaves',
      roll:0,rollV:0,engineHz:33,engineLoad:0,ringEnergy:0,ringCount:0,lastRing:-1,
      snow:0,wet:0,echo:0,exposure:1,light:.98,wind:1.2,gust:1.3,windLife:.9,
      wheelAngle:0,wheelOmega:.1,sprayRate:0,plumeRate:0,particleId:0,horn:0,hornCount:0,parade:0,carSpacing:[-6,0,6],
      gravel:0,grain:0,hint:0,unlock:0,
      climate:Array.from({length:12},(_,i)=>({temp:9+i*.19,ice:0,humidity:.51+.24*Math.sin(i*1.7),shade:.35+.5*rng()})),
      stubble:Array.from({length:9},()=>({tilt:0,v:0,load:0,loose:.45+rng()*.46,release:0})),
      crystals:Array.from({length:36},()=>({x:(rng()-.5)*19,y:rng()*6,z:rng()*35-3,vx:0,vy:-.4-rng()*.5,settled:0,life:0})),
      shocks:[0,1,2,3].map(i=>({x:0,v:0,load:0,phase:i*.8})),
      branches:Array.from({length:14},(_,i)=>({a:(rng()-.5)*.018,v:0,stiff:4+rng()*5,drag:1.2+rng(),shelter:.32+rng()*.9,air:rng(),life:rng(),target:rng(),i})),
      water:Array.from({length:24},(_,i)=>({h:Math.sin(i*.8)*.015,v:0,flow:.55+rng()*.6,phase:rng()*TAU})),
      leaves:Array.from({length:32},()=>({x:(rng()-.5)*20, y:.3+rng()*6, z:rng()*46-5,vx:rng(),vy:-rng(),vz:0,angle:rng()*6,spin:rng()*2-1,onGround:false,rest:0,id:0})),
      particles:[],sourceCarry:0
    };
    let ringSeen=-1, lastHorn=-1, remainder=0;
    function stepOne(dt) {
      const q=state, prev=q.s, d=local(q.s);
      q.time+=dt;
      q.idle=q.held?0:q.idle+dt;
      q.hint=(!q.held && q.idle>4)?Math.min(1,(q.idle-4)*2):0;
      q.windLife-=dt;
      if(q.windLife<=0){q.gust=.25+rng()*2.7;q.windLife=.6+rng()*2.1;}
      q.wind+=(q.gust-q.wind)*.72*dt;
      for(const b of q.branches){
        b.life-=dt;
        if(b.life<=0){b.target=.2+rng()*1.35;b.life=.15+rng()*.9;}
        b.air+=(b.target-b.air)*dt*2.7;
        b.v+=(q.wind*b.shelter*b.air*.24-b.stiff*b.a-b.drag*b.v)*dt;
        b.a+=b.v*dt;
      }
      const heights=q.water.map(w=>w.h);
      for(let i=0;i<q.water.length;i++){
        const w=q.water[i];
        w.phase+=dt*w.flow*(1.7+.17*q.wind);
        const upstream=heights[(i+23)%24], downstream=heights[(i+1)%24];
        w.v+=(19*(upstream+downstream-2*w.h)-5*w.h-1.7*w.v+.31*w.flow*Math.sin(w.phase)+q.wet*q.speed*.029*Math.sin(i*1.24+q.travel*.9))*dt;
        w.h+=w.v*dt;
      }
      q.wheelOmega+=((1.65+q.water[3].v*3+q.water[10].h)*.7-q.wheelOmega*.67)*dt;
      q.wheelAngle+=q.wheelOmega*dt;
      q.wet=wetness(q.s,q.route); q.snow=snow(q.s); q.echo=tunnel(q.s);
      q.gravel=smooth(929,966,d)*(1-smooth(1540,1700,d));
      q.surface=q.wet>.2?'water':q.snow>.58?'snow':q.gravel>.4||q.echo>.1?'gravel':'leaves';
      q.ringEnergy=Math.max(0,q.ringEnergy-dt*1.15);
      const accel=(q.held?6:-2)+(q.held?q.ringEnergy*1.5:0)-q.wet*Math.max(0,q.speed-8)*.83;
      const old=q.speed;
      q.speed=clamp(old+accel*dt,0,18);
      const distance=(old+q.speed)*.5*dt;
      const a=point(q.s-.25,q.route), b=point(q.s+.25,q.route);
      q.s+=distance/Math.hypot((b.x-a.x)*2,(b.y-a.y)*2,1);
      q.travel+=distance;
      const l=Math.floor(q.s/LENGTH);
      if(l!==q.lap){q.route=0;q.lap=l;}
      if(local(prev)<310 && local(q.s)>=310)q.route=q.speed>=11?1:-1;
      for(let i=0;i<rings.length;i++){
        const id=l*rings.length+i;
        if(prev<l*LENGTH+rings[i] && q.s>=l*LENGTH+rings[i] && ringSeen!==id){
          ringSeen=id;q.lastRing=rings[i]+l*LENGTH;q.ringCount++;q.ringEnergy=1;
        }
      }
      q.stage=stage(q.s);q.unlock=Math.max(q.unlock,q.stage);
      for(const c of q.climate){
        const air=10.6-17.5*q.snow-2.9*c.shade;
        c.temp+=(air-c.temp)*(.38+c.shade*.06)*dt;
        const deposit=c.temp<0?(-c.temp)*.0028*c.humidity:0;
        c.ice=clamp(c.ice+(deposit-Math.max(0,c.temp)*.014*(.65+q.wind*.16))*dt,0,.65);
      }
      for(let i=0;i<q.stubble.length;i++){
        const f=q.stubble[i],gust=q.branches[i].air*q.wind;
        f.v+=(gust*.53-f.tilt*(6+i*.33)-f.v*(1.08+i*.07))*dt;f.tilt+=f.v*dt;
        f.load=gust+Math.abs(f.v)*2 + q.gravel*q.speed*.034;
        const release=q.gravel*Math.max(0,f.load-1.4)*f.loose*.34;
        f.loose=clamp(f.loose+dt*(.041*(1-f.loose)-release),0,1);
        f.release+=dt*(release-f.release*.92);
      }
      if(q.snow>.005)for(const f of q.crystals){
        f.life+=dt;
        if(f.settled>0)f.settled+=dt;
        else{f.vx+=(q.wind*.45-f.vx)*dt*1.41;f.vy+=(-.96-f.vy)*dt*1.9;f.y+=f.vy*dt;f.x+=f.vx*dt;if(f.y<=0){f.y=0;f.settled=dt;}}
        f.z-=q.s-prev;
        if(f.z< -5||f.settled>1.5||f.x>11){f.x=(rng()-.5)*18;f.y=3+rng()*5;f.z=rng()*36;f.vx=rng();f.vy=-.33-rng()*.6;f.settled=0;f.life=0;}
      }
      const bend=(heading(q.s+.8,q.route)-heading(q.s-.8,q.route))/1.6;
      const targetRoll=clamp(-bend*q.speed*q.speed*.08,-8*Math.PI/180,8*Math.PI/180);
      q.rollV+=(31*(targetRoll-q.roll)-10.8*q.rollV)*dt;
      q.roll=clamp(q.roll+q.rollV*dt,-8*Math.PI/180,8*Math.PI/180);
      for(let i=0;i<4;i++){
        const w=q.shocks[i], pos=q.travel+(i<2?1.05:-1.05), side=i%2;
        w.phase+=dt*(q.engineHz*.56+i*.19);
        w.load=(.008+q.gravel*.014+q.wet*.012)*Math.sin(pos*(2.3+side*.21)+side*2)
          +.007*Math.sin(pos*5.12+side)+.0024*Math.sin(w.phase);
        w.v+=(104*(w.load-w.x)-8.8*w.v)*dt;
        w.x+=w.v*dt;
      }
      q.engineLoad+=((q.held?1:0)-q.engineLoad)*dt*(q.held?4:2.4);
      q.engineHz+=((31+q.speed*3.25+q.engineLoad*12)-q.engineHz)*dt*4.2;
      const daylight=(1-.86*q.echo)*(1+(q.snow*.09));
      q.light+=(daylight-q.light)*dt*4.3;
      q.exposure+=((1.01+.9*q.echo)-q.exposure)*dt*(q.echo>.5?.58:1.8);
      q.grain+=(q.gravel*(.2+q.wind*.24)-q.grain)*dt*.8;
      for(const p of q.leaves){
        if(p.onGround){p.rest+=dt;if(p.rest>1.2 && (q.wind>1.55||q.speed>2)){p.onGround=false;p.y+=.02;p.vy=.35+q.wind*.25;p.rest=0;}}
        else{
          p.vx+=(q.wind*(.4+.22*Math.sin(p.angle))-p.vx)*dt;
          p.vy+=(-1.3-.8*p.vy+.5*Math.sin(p.angle))*dt;
          p.vz+=(.32*q.wind-p.vz)*dt;
          p.angle+=dt*(p.spin+p.vx*.9);
          p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
          if(p.y<=.025){p.y=.025;p.onGround=true;p.vy=0;}
        }
        p.z-=q.s-prev;
        if(p.z< -6 || p.x>12 || (p.onGround&&p.rest>3.6)){p.x=-10+rng()*10;p.y=2+rng()*5;p.z=7+rng()*39;p.vx=0;p.vy=-.1;p.onGround=false;p.rest=0;p.id++;}
      }
      q.sprayRate=q.wet*q.speed*4.4;
      q.plumeRate=q.speed*(q.snow>.5?1.9:.42+q.gravel*1.7)*(1-q.wet);
      q.sourceCarry+=(q.sprayRate+q.plumeRate)*dt;
      while(q.sourceCarry>=1){
        q.sourceCarry--; const k=rng()*2-1,water=rng()*(q.sprayRate+q.plumeRate)<q.sprayRate;
        q.particles.push({id:++q.particleId,kind:water?'water':q.snow>.5?'snow':q.gravel>.5?'dust':'leaf',s:q.s-1.1,x:point(q.s,q.route).x+Math.sign(k)*.79,y:.11,
          vx:k*(water?.25*q.speed:.8),vy:(water?.08*q.speed:.3)+rng()*(water?1.4:.65),vz:-rng()*.09*q.speed,age:0,life:water?1:.65+rng()*.95,scale:.025+rng()*.045});
      }
      for(const p of q.particles){p.age+=dt;p.x+=p.vx*dt;p.s+=p.vz*dt;p.y+=p.vy*dt;p.vy+=(p.kind==='water'?-8.2:p.kind==='leaf'?-2.4:.12)*dt;p.vx+=(q.wind*.4-p.vx)*dt*1.7;}
      q.particles=q.particles.filter(p=>p.y>=0&&p.age<p.life);
      q.horn=Math.max(0,q.horn-dt);
      const parade=smooth(1870,1930,d)*(1-smooth(2110,2190,d));q.parade=parade;
      for(let i=0;i<3;i++){q.carSpacing[i]+=(parade*(Math.sin(q.water[i*4].phase)*1.3+i*1.2)-q.carSpacing[i])*(.21+i*.03)*dt;}
      for(const [i,station] of [1935,1960,2000].entries()){const key=l*3+i;if(prev<l*LENGTH+station&&q.s>=l*LENGTH+station&&lastHorn!==key){lastHorn=key;q.horn=.83;q.hornCount++;}}
    }
    return {step(dt){if(!Number.isFinite(dt)||dt<=0)return;remainder+=dt;const n=Math.floor((remainder+1e-10)*120);remainder-=n/120;for(let i=0;i<n;i++)stepOne(1/120);},
      getState(){return JSON.parse(JSON.stringify(state));},state,setPressed(on){state.held=!!on;if(on)state.idle=0;}};
  }
  const api={create,point,baseX,heading,height,river,wetness,snow,tunnel,fork,local,smooth,clamp,mod,random,rings,LENGTH};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KartSim=api;
})(globalThis);
