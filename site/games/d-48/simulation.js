/* World units are metres, seconds and nanometres. No rendering or DOM dependencies. */
(function (scope) {
  'use strict';
  const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
  const count = (n,fn) => Array.from({length:n},(_,i)=>fn(i));
  const tau = Math.PI*2;
  const origin = {x:.055,y:1.081,z:.015};
  const fountain = {x:.60,z:-6.1};
  function create(seed=78351) {
    let n=seed>>>0, nextId=1, fraction=0, lastInput=0;
    const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
    const s={
      time:0,stage:'garden',stageAge:0, idle:0, cycle:0, light:0, lightV:0, quiet:0,homeRest:0, lead:0,
      launch:0, route:0, routeV:0, bath:0, shower:0, sunsetPopped:false,
      wind:count(8,i=>({u:.012*random(),v:0,target:.01,span:.4+random()*1.2})),
      reeds:count(28,i=>({angle:(random()-.5)*.018,velocity:0,k:5+random()*5,area:.65+random()*.8})),
      dust:count(54,i=>({x:random()*4-2,y:.42+random()*1.7,z:.2-random()*7,vx:0,vy:random()*.018,rest:0})),
      wand:{x:0,y:0,vx:0,vy:0,tx:0,ty:0,dragging:false,travel:0,speed:0,speedSum:0,duration:0},
      film:count(18,i=>({nm:385+65*Math.sin(i/18*tau)+random()*20,bulge:.0004*random(),v:0,wet:.8+.2*random(),cover:.25+.04*Math.cos(i*tau/18),frontV:0})),
      water:count(24,i=>({h:(random()-.5)*.0008,v:0})),
      jets:count(7,i=>({p:1+random()*.08,v:0,load:0,delay:random()*.07,phase:random()*tau})),
      drops:[],ripples:[],bubbles:[],mist:[],events:[],lastBorn:null,
      follow:{x:0,y:0,vx:0,vy:0},spinner:{angle:.4,omega:.2,push:0},guide:{age:0,stroke:0}
    };
    const windAt=(x,z)=>s.wind[Math.abs(Math.floor(x*4-z*1.7+3))%8].u;
    function bubble(x,y,z,r,thickness,kind){
      if(s.bubbles.length>=5)return null;
      const b={id:nextId++,kind,x,y,z,r,homeX:x,homeY:y, vx:(random()-.45)*.045,vy:.023+random()*.023,vz:-.009,
        age:0,stretch:0,stretchV:0,skin:count(12,i=>thickness*(.90+.18*random())+30*Math.cos(i*tau/12)),drain:kind==='spray'?5.2+random()*2.1:.21+random()*.19};
      s.bubbles.push(b);return b;
    }
    function initial(){
      bubble(.252,1.167,-.081,.091,435,'drift');
      bubble(-.141,1.237,-.40,.037+ .003,380,'drift');
    }
    initial();
    function contact(){lastInput=s.time;s.idle=0;s.guide.age=0;s.guide.stroke=0;}
    function begin(){if(s.stage!=='garden'||s.wand.dragging)return false;contact();
      Object.assign(s.wand,{dragging:true,travel:0,speedSum:0,duration:0,tx:s.wand.x,ty:s.wand.y});return true;}
    function move(x,y){if(!s.wand.dragging)return;contact();const w=s.wand;
      const ax=clamp(x,-.28,.28),ay=clamp(y,-.12,.28);
      w.travel+=Math.hypot(ax-w.tx,ay-w.ty);w.tx=ax;w.ty=ay;}
    function release(){
      const w=s.wand;if(!w.dragging)return null;contact();w.dragging=false;
      const speed=w.speedSum/Math.max(.015,w.duration);
      w.tx=0;w.ty=0;
      if(w.travel<.012){s.water[6].v+=.018;return null;}
      const radius=clamp(.043+w.travel*.31+.017/(1+5*speed),.04,.125);
      const thick=s.film.reduce((a,b)=>a+b.nm,0)/s.film.length;
      const b=bubble(origin.x+w.x,origin.y+w.y,origin.z-.014,radius,thick,'made');
      if(b){s.lead=b.id;s.launch=s.launch||s.time+.01;s.lastBorn={diameter:2*radius,thickness:thick,speed};
        b.vx+=w.vx*.18;b.vy+=Math.max(0,w.vy)*.2;b.stretch=.12;s.events.push('birth');}
      s.water[3].v-=.026;
      s.film.forEach((f,i)=>{f.v+=.018*Math.cos(i*tau/18);f.wet*=.76;});
      return b;
    }
    function pop(id,gesture=true){
      const i=s.bubbles.findIndex(b=>b.id===id);if(i<0)return;
      const b=s.bubbles[i];s.bubbles.splice(i,1);s.events.push(gesture?'pop':'softPop');if(gesture)contact();
      for(let i=0;i<16;i++){
        const a=random()*tau,h=random()*2-1,rr=Math.sqrt(1-h*h);
        s.mist.push({id:nextId++,x:b.x+b.r*rr*Math.cos(a),y:b.y+b.r*h,z:b.z+b.r*rr*Math.sin(a),
          vx:rr*Math.cos(a)*.11,vy:h*.12,vz:rr*Math.sin(a)*.11,life:.3+random()*.45});
      }
      if(s.stage==='sunset'&&gesture){s.sunsetPopped=true;}
    }
    function turn(){if(s.stage!=='flight')return;contact();s.spinner.push=Math.min(3,s.spinner.push+.9);s.events.push('wind');}
    function splash(i){if(s.stage!=='fountain')return;contact();const j=s.jets[i%7];
      j.load=Math.min(1.45,j.load+.95);s.shower=Math.min(3,s.shower+1);s.events.push('water');}
    function enter(stage){s.stage=stage;s.stageAge=0;s.guide.age=0;lastInput=s.time;s.events.push(stage);}
    // Local air parcels receive independent gusts. Leaves store bending and angular momentum.
    function weather(dt){
      for(let i=0;i<s.wind.length;i++){const a=s.wind[i];a.span-=dt;
        if(a.span<=0){a.span=.65+random()*2.4;a.target=(random()-.36)*.13;}
        a.v+=((a.target-a.u)*2.1-a.v*2.3)*dt;a.u+=a.v*dt;}
      s.reeds.forEach((r,i)=>{r.velocity+=(s.wind[i%8].u*r.area*4-r.angle*r.k-r.velocity*2.25)*dt;r.angle+=r.velocity*dt;});
      s.dust.forEach((d,i)=>{
        if(d.rest>0){d.rest-=dt;if(d.rest<=0)d.vy=.025;return;}
        const u=windAt(d.x,d.z);
        d.vx+=(u*.37-d.vx)*dt;d.vy+=((.007+u*.27+(i%4)*.002)-(d.y-1.15)*.044-d.vy)*dt;
        d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=(s.wind[(i+2)%8].u*.09)*dt;
        if(d.y<.42){d.y=.42;d.rest=1+random();}if(Math.abs(d.x)>2.8)d.vx-=Math.sign(d.x)*dt*.04;
      });
    }
    // The hoop entrains liquid. Adjacent sectors exchange liquid and tension, then drain towards the bottom.
    function films(dt){
      const w=s.wand,stiffness=w.dragging?95:17,damping=w.dragging?16:8.4;
      w.vx+=((w.tx-w.x)*stiffness-w.vx*damping)*dt;w.vy+=((w.ty-w.y)*stiffness-w.vy*damping)*dt;
      w.x+=w.vx*dt;w.y+=w.vy*dt;w.speed=Math.hypot(w.vx,w.vy);
      if(w.dragging){w.duration+=dt;w.speedSum+=w.speed*dt;}
      const old=s.film.map(f=>f.nm),shape=s.film.map(f=>f.bulge);
      s.film.forEach((f,i)=>{const a=tau*i/18,k=(i+1)%18,j=(i+17)%18,level=Math.sin(a);
        const pulling=w.dragging&&w.travel>.002;
        const air=s.wind[i%8].u,front=pulling?Math.min(1,.78+f.wet*.2+w.travel*.8):.26+.06*Math.cos(a)+air*Math.cos(a)*.16;
        f.frontV+=((front-f.cover)*(17+2*f.wet)-f.frontV*7-level*.045)*dt;
        f.cover=clamp(f.cover+f.frontV*dt,0,1);
        const entrained=pulling?Math.min(1,w.travel/.035):0;
        const supply=390+entrained*(190+440/(1+6*w.speed)-390);
        f.wet+=((1-f.wet)*.19-Math.max(0,level)*.006-Math.abs(air)*.057)*dt;
        f.nm+=((supply+level*(-48)+35*f.wet-f.nm)*(.42+3.08*entrained)
          +(old[j]+old[k]-2*old[i])*.48 -level*(1+f.wet))*dt;
        const force=(w.vy*Math.sin(a)+w.vx*Math.cos(a))*.64+windAt(i*.2,0)*.065;
        f.v+=(force+12*(shape[j]+shape[k]-2*shape[i])-f.bulge*29-f.v*5.4)*dt;f.bulge+=f.v*dt;
      });
      const water=s.water.map(q=>q.h);
      s.water.forEach((q,i)=>{const a=tau*i/24;
        q.v+=((water[(i+23)%24]+water[(i+1)%24]-2*water[i])*56-q.h*23-q.v*2.4
          +(w.vx*Math.cos(a)+w.vy*Math.sin(a))*.095+s.wind[i%8].u*.023)*dt;q.h+=q.v*dt;});
    }
    // Pressurised nozzles eject individual ballistic drops. Impact puts energy into surface rings.
    function waterworks(dt){
      s.bath=Math.max(0,s.bath-dt);s.shower=Math.max(0,s.shower-dt*.16);
      s.jets.forEach((j,i)=>{
        j.load*=Math.exp(-dt*1.65);j.v+=((1+j.load*.63+s.wind[i].u*.3-j.p)*12-j.v*4)*dt;j.p+=j.v*dt;j.delay-=dt;
        if(j.delay<=0){j.delay+=(.057+random()*.038)/j.p;
          const a=i*tau/6+j.phase*.027,mid=i===6,b=mid?0:.12;
          s.drops.push({id:nextId++,jet:i,x:fountain.x+b*Math.cos(a),z:fountain.z+b*Math.sin(a),
            y:mid?1.35:1.035,vx:mid?(random()-.5)*.12:Math.cos(a)*1.25*j.p,
            vz:mid?(random()-.5)*.12:Math.sin(a)*1.25*j.p,vy:(mid?2.55:1.20)*j.p+random()*.15,
            r:.006+random()*.007,active:j.load>.12, floor:mid?1.016:.405});
        }
      });
      for(let i=s.drops.length-1;i>=0;i--){const d=s.drops[i];d.vy-=9.81*dt;d.vx+=windAt(d.x,d.z)*dt;
        d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;
        if(d.y<=d.floor){s.drops.splice(i,1);
          if(random()<.12)s.ripples.push({id:nextId++,x:d.x,z:d.z,y:d.floor,r:.009,amplitude:.94,energy:Math.abs(d.vy)*.025});
          if(s.stage==='fountain'&&s.bath===0&&(d.active||s.shower>0||s.bubbles.length<2)){
            const b=bubble(d.x,d.floor+.045,d.z,.04+random()*.026,410+random()*110,'spray');
            if(b){b.vy=.14;s.bath=d.active?1.1:4.2;s.events.push('dropBirth');}
          }
        }
      }
      for(let i=s.ripples.length-1;i>=0;i--){const r=s.ripples[i];r.r+=r.energy*dt;r.amplitude*=Math.exp(-dt*3.8);if(r.amplitude<.085)s.ripples.splice(i,1);}
    }
    function floating(dt){
      for(let i=s.bubbles.length-1;i>=0;i--){const b=s.bubbles[i],u=windAt(b.x,b.z);b.age+=dt;
        const trip=s.stage==='flight'&&b.id===s.lead;
        const follower=s.stage==='flight'&&!trip&&(b.kind==='made'||b.kind==='drift');
        const atPark=b.kind==='spray'||b.kind==='evening'||b.kind==='visitor';
        const goalX=trip?(.52-b.x)*.25:((b.kind==='visitor'?fountain.x-.13:atPark?b.homeX:b.homeX*.94)-b.x)*.11;
        const goalY=trip?1.66:follower?.92:atPark?(b.r>.075?1.23:1.39):b.kind==='drift'?b.homeY:1.25;
        const zForce=trip?(-5.52-b.z)*.13:follower?(-3.42-b.z)*.18:atPark?(fountain.z+(b.kind==='visitor'?.42:.03)-b.z)*.12:(-.38-b.z)*.085;
        b.vx+=((u*.6+goalX)-b.vx)*dt*.94;
        b.vy+=((goalY-b.y)*.28+(.018+b.r*.055)+u*.16-b.vy*.88)*dt;b.vz+=(zForce-b.vz)*dt*.86;
        b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
        b.stretchV+=((b.vy*.16+u*.18)-b.stretch*14-b.stretchV*3.8)*dt;b.stretch+=b.stretchV*dt;
        const prev=b.skin.slice();
        b.skin.forEach((v,k)=>{const drainage=b.drain*(1.5+.75*Math.sin(k*tau/12));
          b.skin[k]=Math.max(120,v+dt*((prev[(k+11)%12]+prev[(k+1)%12]-2*v)*.085-drainage+u*Math.cos(k)*8));});
        if((b.kind==='spray'&&Math.min(...b.skin)<159)||(follower&&b.z< -2.33&&b.y<1.10))pop(b.id,false);
      }
      for(let i=s.mist.length-1;i>=0;i--){const d=s.mist[i];d.life-=dt;d.vy-=.68*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;if(d.life<=0)s.mist.splice(i,1);}
    }
    function story(dt){
      if(s.stage==='garden'&&s.launch&&!s.wand.dragging&&s.time-s.launch>12){
        let lead=s.bubbles.find(b=>b.id===s.lead)||s.bubbles.reduce((a,b)=>!a||b.r>a.r?b:a,null);
        if(!lead)lead=bubble(origin.x,origin.y,origin.z,.10,480,'made');
        s.lead=lead.id;enter('flight');
      }
      if(s.stage==='flight'){
        const boost=s.spinner.omega*.028;
        s.routeV+=((.031+boost-s.routeV)*.65)*dt;s.route=Math.min(1,s.route+s.routeV*dt);
        if(s.route>=1){const lead=s.bubbles.find(b=>b.id===s.lead);if(lead){lead.kind='visitor';lead.homeX=fountain.x-.13;}enter('fountain');}
      }
      if(s.stage==='fountain'&&s.stageAge>52){enter('sunset');
        if(!s.bubbles.length)bubble(fountain.x,1.22,fountain.z+.4,.11,460,'spray');
        s.bubbles.filter(b=>b.z<-3).forEach(b=>{b.kind='evening';b.drain=Math.min(.5,b.drain);});}
      const dusk=s.stage==='sunset'?1:s.stage==='return'?s.route:0;
      s.lightV+=((dusk-s.light)*.055-s.lightV*.43)*dt;s.light=clamp(s.light+s.lightV*dt,0,1);
      if(s.stage==='sunset'&&((s.sunsetPopped&&s.stageAge>8)||s.stageAge>32)){
        if(!s.quiet){s.bubbles.slice().forEach(b=>pop(b.id,false));s.quiet=.01;}
        s.quiet+=dt;if(s.quiet>2.8)enter('return');
      }
      if(s.stage==='return'){
        s.routeV+=((-.068-s.routeV)*.55)*dt;s.route=clamp(s.route+s.routeV*dt,0,1);
        if(s.route<=0)s.homeRest+=dt;
        if(s.homeRest>=5){s.homeRest=0;s.launch=0;s.lead=0;s.quiet=0;s.sunsetPopped=false;s.cycle++;s.bubbles=[];initial();enter('garden');}
      }
      const b=s.bubbles.find(item=>item.id===s.lead),f=s.follow;
      const weight=b?clamp((b.r-.05)*1.7,0,.12)*(1-s.route):0;
      const desiredX=b?clamp(b.x-.014-.6*s.route,-.47,.47)*weight:0;
      const desiredY=b?clamp(b.y-1.08,-.35,.65)*weight:0;
      f.vx+=((desiredX-f.x)*5-f.vx*4.3)*dt;f.x+=f.vx*dt;
      f.vy+=((desiredY-f.y)*5-f.vy*4.3)*dt;f.y+=f.vy*dt;
      const sp=s.spinner;sp.push*=Math.exp(-dt*.75);
      sp.omega+=((s.wind[3].u*.6+.032)*4.5+sp.push*3-sp.omega*.67)*dt;sp.angle+=sp.omega*dt;
    }
    function tick(dt){
      s.time+=dt;s.stageAge+=dt;s.idle=s.time-lastInput;
      weather(dt);films(dt);waterworks(dt);floating(dt);story(dt);
      if(s.idle>=4&&!s.wand.dragging&&s.stage!=='return'&&!s.quiet){
        s.guide.age+=dt;s.guide.stroke=(s.guide.age%6.3)/2.05;
      }else{s.guide.age=0;s.guide.stroke=0;}
      if(s.events.length>32)s.events.splice(0,s.events.length-32);
    }
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;fraction+=dt;while(fraction+1e-10>=1/120){tick(1/120);fraction-=1/120;}}
    return {state:s,step,getState:()=>JSON.parse(JSON.stringify(s)),begin,move,release,pop,turn,splash,contact,
      cancel(){s.wand.dragging=false;s.wand.tx=0;s.wand.ty=0;},drainEvents:()=>s.events.splice(0)};
  }
  const api={create,origin,fountain};
  if(typeof module==='object'&&module.exports)module.exports=api;else scope.BubbleGarden=api;
})(typeof window==='undefined'?globalThis:window);
