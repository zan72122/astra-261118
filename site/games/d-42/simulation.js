/* Lengths in metres, time in seconds, angles in radians. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Valley = api;
})(globalThis, function () {
  'use strict';
  const MID = 234, END = 570, DEG = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function generator(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function hash(x, z) {
    let h = Math.imul(x, 374761393) + Math.imul(z, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise(x, z) {
    let a = Math.floor(x), b = Math.floor(z), u = x-a, v=z-b;
    u=u*u*(3-2*u); v=v*v*(3-2*v);
    return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;
  }
  function riverX(z) { return -33 + 44*Math.sin(-z*.014-0.3) + 25*Math.sin(z*.029+.4); }
  function riverWidth(z) { return 7.6 + 2.8*Math.sin(z*.017+1.4) + 4*noise(0,z*.02); }
  function waterY(z) { return 6.2 - z*.012; }
  function terrain(x,z) {
    const bank=Math.abs(x-riverX(z))-riverWidth(z);
    const rough=noise(x*.033,z*.033)*.68+noise(x*.089,z*.089)*.32;
    let h=waterY(z)-1.4 + Math.max(-1,bank)*(.30+rough*.37);
    h+=Math.min(1, Math.max(0,bank/25))*(rough-.45)*10;
    // Glacial shoulders support each station, with a steep face above the river.
    const shelf=(sx,sz,height,wx,wz)=>height*Math.exp(-(((x-sx)/wx)**2)-(((z-sz)/wz)**2));
    h+=clamp((bank+1)/16,0,1)*(shelf(11,8,41,25,35)+shelf(22,-233,46,36,31)+shelf(26,-567,84,50,38));
    return Math.min(h, 153+42*noise(x*.01,z*.009));
  }
  // Sample each sagging cable by arc length, so the drive speed is in rope metres.
  function span(length,rise,sag){
    const n=256,dx=length*.049;
    const height=u=>rise*u-4*sag*u*(1-u);
    function samples(zRun){
      const arc=[0];
      for(let i=1;i<=n;i++)arc.push(arc[i-1]+Math.hypot(dx/n,zRun/n,height(i/n)-height((i-1)/n)));
      return arc;
    }
    let lo=length*.8,hi=length;
    for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(samples(mid)[n]<length)lo=mid;else hi=mid;}
    const zRun=(lo+hi)/2,arc=samples(zRun);
    return {dx,zRun,point(d){
      let l=0,h=n;
      while(h-l>1){const m=(l+h)>>1;if(arc[m]<d)l=m;else h=m;}
      const u=(l+clamp((d-arc[l])/(arc[h]-arc[l]),0,1))/n;
      return {x:dx*u,y:height(u),z:-zRun*u};
    }};
  }
  const first=span(MID,20,10),second=span(END-MID,37,17);
  function route(d){
    if(d<=MID){const p=first.point(d);p.y+=63;return p;}
    const p=second.point(d-MID);p.x+=first.dx;p.y+=83;p.z-=first.zRun;return p;
  }
  function riverDistance(pos) {
    let nearest=Infinity;
    for (let z=pos.z-80; z<=pos.z+80; z+=4) {
      const dx=Math.max(0,Math.abs(pos.x-riverX(z))-riverWidth(z));
      nearest=Math.min(nearest,Math.hypot(dx,pos.z-z,pos.y-waterY(z)));
    }
    return nearest;
  }
  function spring(p,goal,k,drag,dt) { p.v+=(k*(goal-p.q)-drag*p.v)*dt; p.q+=p.v*dt; }
  function create(options={}) {
    const random=generator(options.seed??71424);
    let wind=clamp(options.wind??2.3,0,4), accumulator=0, nextPulse=.2, pressure=.65;
    const part=(q=0)=>({q,v:0});
    const s={time:0,phase:'morning',distance:0,speed:0,held:false,idle:0,modeAge:0,
      wind:[],roll:part(),drive:part(),door:part(1),wheelAngle:0,water:[],flags:[],crowns:[],chimes:[],
      birds:[],motes:[],boards:[],walk:0,scope:part(),scopeYaw:part(),scopeTime:0,aim:0,
      chimeTime:0,strikes:0,chimeIndex:0,day:0,riverDistance:0,riverGain:0,boarded:part(),
      windowLight:part(.5),hint:false,returning:false};
    const winds=Array.from({length:8},(_,i)=>({speed:wind*(.45+.04*i),v:0,pressure:.4+random()*.4,ttl:.3+random()*1.5}));
    s.wind=winds;
    for(let i=0;i<8;i++)s.crowns.push(part());
    for(let i=0;i<32;i++) s.water.push({h:(random()-.5)*.085,v:0,flow:.48+.52*random(),force:0,ttl:random()*.7});
    for(let i=0;i<7;i++) s.flags.push(part(.06*i));
    for(let i=0;i<3;i++) s.chimes.push({...part((i-1)*.03),ring:0,contact:false,striker:part()});
    for(let i=0;i<10;i++) s.boards.push(part());
    for(let i=0;i<5;i++) s.birds.push({x:-4.9-i*1.4,y:1+i*.45,z:-9-i*2.7,vx:.3,vy:0,vz:0,
      wingL:part(),wingR:part(),stroke:1,beat:.1+i*.08,thermal:.1+i*.1,heading:random()*6});
    for(let i=0;i<52;i++)s.motes.push({x:random()*18-9,y:random()*8-2,z:random()*22-11,vx:0,vy:0,vz:0,seed:random(),opacity:0,generation:0});
    s.riverDistance=riverDistance(route(0));s.riverGain=.2*Math.exp(-s.riverDistance/59);
    function enter(p){s.phase=p;s.modeAge=0;s.held=false;s.idle=0;}
    function target(){return ({morning:'cabin',ride:'drive',walk:'boards',look:'scope',board:'cabin',climb:'drive',ridge:'chimes'})[s.phase]||null;}
    function press(object){
      if(!object||object!==target())return false;
      if(s.phase==='morning')enter('ride');
      if(s.phase==='board')enter('climb');
      s.held=true;s.idle=0;return true;
    }
    function release(){s.held=false;s.idle=0;}
    function air(dt) {
      nextPulse-=dt;
      if(nextPulse<=0){pressure=random();nextPulse=.9+random()*3.2;}
      winds.forEach((w,i)=>{
        w.ttl-=dt;
        if(w.ttl<=0){w.ttl=.48+1.6*random();w.pressure=.12+.84*random();}
        const upstream=i?winds[i-1].speed:pressure*wind;
        const goal=clamp(.36*upstream+.64*wind*(.25+w.pressure*(.85+.05*i)),0,4);
        w.v+=((goal-w.speed)*2.8-w.v*2.65)*dt;w.speed=clamp(w.speed+w.v*dt,0,4);
      });
      // Roots pin each crown. Local drag bends it; stiffness and damping restore it.
      s.crowns.forEach((p,i)=>spring(p,winds[i].speed**2*(.0019+i*.00012),5.3+i*.5,1.9+i*.15,dt));
      const exposure=.5+.5*Math.sin(s.distance*.038+.45);
      const torque=(winds[0].speed**2*.15-winds[5].speed**2*.075)*exposure;
      spring(s.roll,clamp(torque,-2.8,2.8)*DEG,4.7,1.2,dt);
      if(Math.abs(s.roll.q)>3*DEG){s.roll.q=Math.sign(s.roll.q)*3*DEG;s.roll.v*=-.15;}
      s.flags.forEach((p,i)=>{
        const upstream=i?s.flags[i-1].q:0;
        spring(p,upstream*.45+winds[(i+1)%8].speed**2*.032+Math.sin(i*1.7)*winds[(i+2)%8].v*.25,18-i,2.3+i*.13,dt);
      });
      spring(s.windowLight,.27+.135*winds[2].speed+.55*Math.abs(s.flags[5].v),3.7,3.3,dt);
    }
    function water(dt){
      const a=s.water, accel=[];
      a.forEach((p,i)=>{
        p.ttl-=dt;
        if(p.ttl<=0){p.force=(random()-.45)*(.35+winds[i%8].speed*.13);p.ttl=.22+random()*.9;}
        const left=a[Math.max(0,i-1)].h,right=a[Math.min(a.length-1,i+1)].h;
        accel[i]=(9.5+2*p.flow)*(left-p.h)+(8.5-p.flow)*(right-p.h)-(4+p.flow)*p.h-2.4*p.v+p.force;
      });
      a.forEach((p,i)=>{p.v+=accel[i]*dt;p.h+=p.v*dt;});
    }
    function drive(dt){
      const riding=['ride','climb','return'].includes(s.phase),back=s.phase==='return';
      const dest=back?0:s.phase==='climb'?END:MID;
      if(riding){
        const left=Math.abs(dest-s.distance);
        const limit=Math.min(6,Math.sqrt(2*1.05*left));
        const goal=s.held||back?limit:0;
        const prev=s.speed;
        const brake=s.held||back?1.14:clamp(prev*prev/(2*Math.max(left,.00001)),.82,1.14);
        s.speed+=clamp(goal-s.speed,-brake*dt,1.2*dt);
        const advance=Math.min(left,(prev+s.speed)*.5*dt);
        s.distance+=(back?-1:1)*advance;
        s.wheelAngle+=(back?-1:1)*advance/.183;
        if(left<.00001){
          s.distance=dest;s.speed=0;
          if(back){enter('morning');s.walk=0;s.scopeTime=0;s.chimeTime=0;s.returning=false;}
          else enter(dest===MID?'walk':'ridge');
        }
      }
      spring(s.drive,s.held&&riding?1:0,32,8,dt);
      spring(s.door,riding&&(!back||s.modeAge>2)?0:1,12,6.9,dt);
      spring(s.boarded,riding?1:0,2.9,3.3,dt);
      const pos=route(s.distance);s.riverDistance=riverDistance(pos);
      s.riverGain+=((.2*Math.exp(-s.riverDistance/59)*(1+s.scope.q*1.5))-s.riverGain)*(1-Math.exp(-dt*2));
      s.day+=((s.distance/END)-s.day)*(1-Math.exp(-dt*1.8));
    }
    function wildlife(dt) {
      s.birds.forEach((b,i)=>{
        const local=winds[i].speed;
        b.beat-=dt;b.thermal+=dt*(.19+.033*local+i*.008);
        if(b.beat<=0){b.stroke=b.stroke>0?-1:1;b.beat=(b.stroke>0?.26:.17)+random()*.09+Math.max(0,b.vy)*.06;}
        const glide=b.y>2.0+i*.42 && b.vy>-.25;
        spring(b.wingL,glide?.08:b.stroke*.54,68,7.8,dt);
        spring(b.wingR,glide?.10:b.stroke*.51+.07*winds[(i+1)%8].v,61+i,7.3,dt);
        const lift=Math.abs(b.wingL.v+b.wingR.v)*.18+local*.14;
        b.vy+=((1.35+i*.4+Math.sin(b.thermal)*.75-b.y)*1.7+lift-.65-b.vy*1.2)*dt;
        b.vx+=((-4.8+i*2.35+Math.sin(b.thermal+b.heading)*3.7-b.x)*.67-b.vx*.95+winds[i].v*.45)*dt;
        b.vz+=((-12-i*2.35+Math.cos(b.thermal*.79)*3-b.z)*.56-b.vz*.86-s.speed*.09)*dt;
        b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
      });
      s.motes.forEach((p,i)=>{
        p.vx+=(winds[i%8].speed*(.25+p.seed*.2)-p.vx)*dt*1.2;
        p.vy+=((winds[(i+2)%8].v*.12+.09-p.seed*.19)-p.vy)*dt;
        p.vz+=((s.speed*.16-p.vz)*.9)*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        const edge=Math.min(9-Math.abs(p.x),11-Math.abs(p.z),p.y+2,6-p.y);
        p.opacity=clamp(edge,0,1);
        if(edge<-.03){p.generation++;p.x=-8.99;p.y=-1.8+random()*7.5;p.z=random()*20-10;p.opacity=0;}
      });
    }
    function station(dt) {
      if(s.phase==='walk' && s.held)s.walk=Math.min(1,s.walk+dt/5.6);
      s.boards.forEach((b,i)=>{
        const load=s.phase==='walk'?Math.max(0,1-Math.abs(s.walk*11-i-1))*.017:0;
        spring(b,-load,58+i*2,6.6,dt);
      });
      if(s.phase==='walk'&&s.walk>=1)enter('look');
      spring(s.scope,s.phase==='look'&&s.held?1:0,9,5.7,dt);
      spring(s.scopeYaw,s.aim,6,4.8,dt);
      if(s.phase==='look'&&s.held){s.scopeTime+=dt;if(s.scopeTime>=8)enter('board');}
      if(s.phase==='ridge'&&s.held)s.chimeTime+=dt;
      s.chimes.forEach((c,i)=>{
        // Each wooden clapper has its own length and its own free swing.
        // At the tube wall it transfers momentum, separates, then rings down.
        const tug=s.phase==='ridge'&&s.held?(.38+i*.065)*(1+.55*s.scopeYaw.q):0;
        const gust=winds[i+2].speed**2*.012+winds[i+3].v*.09;
        spring(c,gust,10+i*1.4,1.18+i*.2,dt);
        spring(c.striker,gust*(1.62+i*.12)+tug,14-i,1.02+i*.16,dt);
        const difference=c.striker.q-c.q,side=Math.sign(difference),limit=.105-i*.012;
        if(Math.abs(difference)>=limit){
          const strike=(c.striker.v-c.v)*side;
          c.striker.q=c.q+side*limit;
          if(strike>0){
            c.v+=side*.38*strike;c.striker.v-=side*1.16*strike;
            if(!c.contact&&strike>.10){
              c.ring=Math.min(1,.2+strike*.7);s.strikes++;s.chimeIndex=i;
            }
          }
          c.contact=true;
        }else if(Math.abs(difference)<limit-.006)c.contact=false;
        c.ring*=Math.exp(-(1.1+.2*i)*dt);
      });
      if(s.phase==='ridge'&&s.chimeTime>=7){s.returning=true;enter('return');}
    }
    function fixed(dt){
      s.time+=dt;s.modeAge+=dt;s.idle=s.held?0:s.idle+dt;s.hint=s.idle>=4&&!!target();
      air(dt);water(dt);drive(dt);wildlife(dt);station(dt);
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<0)throw Error('dt must be finite and nonnegative');
      accumulator+=dt;while(accumulator>=1/120-1e-10){fixed(1/120); accumulator-=1/120;}
    }
    return {state:s,step,getState:()=>JSON.parse(JSON.stringify(s)),press,release,target,
      setWind:v=>{wind=clamp(v,0,4);},aim:v=>{s.aim=clamp(v,-1,1);}};
  }
  return {create,route,terrain,riverX,riverWidth,waterY,noise,hash,clamp,generator,MID,END,DEG};
});
