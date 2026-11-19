(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, n) => a + (b - a) * n;
  const vec = (x, y, z) => ({x, y, z});
  const distance = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
  const smooth = (v) => {v=clamp(v,0,1); return v*v*(3-2*v);};
  function randomSource(seed) {
    return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;};
  }
  function ground(x,z) {
    const near=.085*z + .13*Math.sin(.36*x+.08*z) + .09*Math.cos(.46*z-.14*x);
    const lower=-6.1+.58*Math.sin(x*.12+z*.055)+.55*Math.cos(z*.14-x*.09);
    return mix(near,lower,smooth((-z-1)/18)) + Math.max(0,Math.abs(x)-7)*.042;
  }
  const coast = x => -46+6*Math.sin(.115*x+.8)+4*Math.sin(.21*x-.7);
  function create(seed=816) {
    const rand=randomSource(seed), random=(a,b)=>mix(a,b,rand());
    const anchor=vec(-.62,1.18,.35);
    const s={stage:0,cycle:0,focus:0,time:0,idle:0,phaseAge:0,anchor,down:false,
      input:{x:.1,y:.6,strength:1},windSpeed:1.65,lineLength:3.95,tension:0,payout:0,
      kite:{x:.56,y:1.02,z:-1.28,vx:.14,vy:3.12,vz:-.42,bank:-.11,bankV:0,pitch:.08,heading:0},
      cells:[],cloth:[],rope:[],tail:[],clouds:[],waves:[],seeds:[],friends:[],
      bells:[],strikes:0,call:0,dance:0,danceBank:0,danceV:0,sunset:0,sunV:0,landed:0,
      reel:0,reelV:0,boat:{x:-10,z:-61,heading:.2,speed:.1,heel:0,heelV:0},
      breeze:1.8,thermal:0,airX:.17,airY:.12,airZ:-.9,flightWind:1.8,grassSound:0,clothSound:0};
    for(let i=0;i<30;i++) {
      s.cells.push({wind:1.3+rand()*.7,dx:random(-.1,.5),dz:-.9, gust:random(-.5,.6),
        life:random(.2,3.4),bend:random(.012,.045),v:0,side:0,sideV:0,k:random(9,16),phase:rand()});
    }
    for(let i=0;i<49;i++)s.cloth.push({bow:random(.01,.022),v:0,k:random(31,47)});
    function chain(count,start,end,slack) {
      return Array.from({length:count},(_,i)=>{const f=i/(count-1),p=vec(mix(start.x,end.x,f),mix(start.y,end.y,f)-slack*Math.sin(f*Math.PI),mix(start.z,end.z,f));
        return {...p,ox:p.x,oy:p.y,oz:p.z};});
    }
    function socket(k,y,z=0,friend=false){
      const scale=friend?.73:1,rx=friend?.19:k.pitch,ry=s.airX*(friend?.09:.12),rz=k.bank;
      const x1=-Math.sin(rz)*y,y1=Math.cos(rz)*y,z2=y1*Math.sin(rx)+z*Math.cos(rx);
      return vec(k.x+scale*(x1*Math.cos(ry)+z2*Math.sin(ry)),k.y+scale*(y1*Math.cos(rx)-z*Math.sin(rx)),k.z+scale*(z2*Math.cos(ry)-x1*Math.sin(ry)));
    }
    s.rope=chain(30,anchor,socket(s.kite,-.02,.26),.08);
    const tailRoot=()=>socket(s.kite,-.825,.026);
    s.tail=chain(21,tailRoot(),vec(1.56,ground(1.56,-3.37)+.06,-3.37),.015);
    const cloudSites=[[-8,10.4,-64],[12,8,-73],[-30,9,-56],[27,15,-65],[4,18,-110],[-48,13,-91],[58,9,-80],[-2,3.3,-56],[-7.4,22,-29],[7.5,25,-38]];
    for(const [x,y,z] of cloudSites)s.clouds.push({x,y,z,vx:random(.03,.12),vz:0,home:x,homeZ:z});
    for(let i=0;i<48;i++)s.waves.push({h:random(-.07,.07),v:random(-.05,.05),pressure:random(-.05,.05),life:random(.1,1.9)});
    for(let i=0;i<26;i++){const x=random(-5,5),z=random(-7,2);s.seeds.push({x,y:ground(x,z)+random(.05,1.6),z,vx:0,vy:0,vz:0,base:x,baseZ:z,buoy:random(.12,.7)});}
    for(let i=0;i<3;i++)s.bells.push({angle:.05*i,v:0,cool:0,energy:0,count:0,side:1});
    for(let i=0;i<2;i++)s.friends.push({x:(i?1:-1)*(17+3*i),y:4+i,z:-88-i*7,vx:0,vy:0,vz:0,bank:0,tail:[],rope:[]});
    s.friends.forEach((f,i)=>{f.tail=chain(14,socket(f,-.825,.026,true),vec(f.x+.3,f.y-2.18,f.z-.3),0);
      f.rope=chain(20,vec(i?9:-9,-4.2,-28-i*5),socket(f,-.02,.26,true),.8);});
    let accumulator=0;
    function touch(x,y,strength=1,focus=0){s.down=true;s.idle=0;s.focus=clamp(Math.round(focus),0,2);steer(x,y,strength);}
    function steer(x,y,strength=1){s.input={x:clamp(x,-1,1),y:clamp(y,-1,1),strength:clamp(strength,0,1)};}
    function release(){s.down=false;s.idle=0;}
    function spring(obj,key,velocity,goal,k,damping,h) {
      obj[velocity]+=((goal-obj[key])*k-obj[velocity]*damping)*h;obj[key]+=obj[velocity]*h;
    }
    // 隣の区画から届く風圧と各茎の硬さで曲げる。離指後は残った速度が減衰する。
    function air(h) {
      const power=s.down?s.input.strength:0;
      const inlet=s.down?clamp(power*(7.5+.5*s.input.y),0,8):1.66;
      s.windSpeed+=(inlet-s.windSpeed)*(1-Math.exp(-h*(s.down?1.25:.61)));
      s.airX+=((s.down?s.input.x*.88:.24)-s.airX)*h*.94;
      s.airY+=((s.down?s.input.y*.46:.12)-s.airY)*h*.91;
      const forward=s.down?clamp(.48+s.input.y*1.45,-1,1):1;
      s.airZ+=(-forward*Math.sqrt(Math.max(.02,1-s.airX*s.airX-s.airY*s.airY))-s.airZ)*h;
      let rustle=0;
      for(let i=0;i<30;i++) {const c=s.cells[i],prev=s.cells[(i+29)%30];c.life-=h;
        if(c.life<=0){c.gust=random(-.65,.72);c.life=random(.8,3.8);}
        const goal=clamp(s.windSpeed*(.87+.16*c.phase)+c.gust+.13*(prev.wind-s.windSpeed),0,8);
        c.wind+=(goal-c.wind)*h*(.68+.45*c.phase);
        c.dx+=(s.airX+.12*c.gust-c.dx)*h*.92;c.dz+=(s.airZ-c.dz)*h*.86;
        spring(c,'bend','v',.012*c.wind*c.wind*-c.dz,c.k,3.1,h);
        spring(c,'side','sideV',.012*c.wind*c.wind*c.dx,c.k*.92,3.4,h);
        rustle+=Math.abs(c.v)+.06*Math.abs(c.wind-prev.wind);
      }
      s.grassSound=rustle/30;
      const m=s.cells[9],n=s.cells[17];s.flightWind=mix(m.wind,n.wind,clamp((s.kite.y-2)/18,0,1));
      s.thermal+=(n.gust-s.thermal)*h*.63;
    }
    // The 120 g sail accelerates a surrounding mass of air as it changes direction.
    const sailMass=.12,flyingMass=.626;
    function flight(h) {
      const q=s.kite,w=s.flightWind,closing=s.stage===3;
      const spoolTarget=closing?-clamp(.48+.8*s.sunset+(s.down?.37-.22*s.input.y:0),0,1.62):s.stage===0&&w>2.3?clamp((w-2.3)*.21,0,.86):0;
      s.payout+=(spoolTarget-s.payout)*h*1.3;
      s.lineLength=clamp(s.lineLength+s.payout*h,3.95,29.2);
      s.reelV+=(s.payout/.13-s.reelV)*h*2;s.reel+=s.reelV*h;
      const dx=q.x-anchor.x,dy=q.y-anchor.y,dz=q.z-anchor.z,len=Math.hypot(dx,dy,dz);
      const extension=len-s.lineLength,radialSpeed=(q.vx*dx+q.vy*dy+q.vz*dz)/len;
      const load=flyingMass*Math.max(0,extension*9.3+.85*smooth(extension/.22)*radialSpeed);
      s.tension+=(load-s.tension)*(1-Math.exp(-h*13));
      const tetherAcceleration=s.tension/flyingMass;
      const groundCushion=Math.exp(-Math.max(0,q.y-1.4)*.41);
      const landing=closing?smooth((10-s.lineLength)/6):0;
      const lift=(.109+.026*s.airY)*w*w + Math.min(.98,tetherAcceleration*.105)+.68*groundCushion+1.02 + .18*s.thermal;
      const dance=s.stage===2?s.danceBank:0;
      q.vx+=(w*w*.042*s.airX+.35*s.thermal+.34*groundCushion+1.3*dance+landing*1.7*(.54-q.x)-tetherAcceleration*dx/len-.78*q.vx)*h;
      q.vy+=(lift*(closing?.67-.54*landing:1)-9.81*sailMass/flyingMass-tetherAcceleration*dy/len-.86*q.vy)*h;
      q.vz+=(.074*w*w*s.airZ*(1-landing)-.31+landing*1.5*(-1.35-q.z)-tetherAcceleration*dz/len-.77*q.vz)*h;
      q.x+=q.vx*h;q.y+=q.vy*h;q.z+=q.vz*h;
      const floor=ground(q.x,q.z)+.87;
      if(q.y<floor){q.y=floor;q.vy=Math.max(q.vy,0);}
      spring(q,'bank','bankV',clamp(-.15-.12*q.vx+.18*s.thermal+.35*dance,-.88,.88),5,2.3,h);
      q.pitch=clamp(.13+w*.027+.045*q.vy,-.2,.5);
      // 布の49区画は輪郭と骨で支持される。局所風圧が抜けても曲げ速度は残る。
      let flutter=0;
      for(let i=0;i<49;i++) {const p=s.cloth[i],u=(i%7-3)/3,v=(Math.floor(i/7)-3)/3;
        const local=s.cells[(i*7+3)%30];const adjacent=s.cloth[i%7?i-1:i];const support=(1-.78*Math.abs(u))*(1-.64*Math.abs(v));
        spring(p,'bow','v',(.014+w*w*.0031)*support+local.gust*.021+adjacent.bow*.13+.018*q.bankV*u,p.k,2.8,h);
        flutter+=Math.abs(p.v);}
      s.clothSound=flutter/49;
    }
    // Verlet nodes retain momentum. The cord transmits only tension and the ground absorbs contact.
    function solve(nodes,a,b,length,h,tailForce) {
      const last=nodes.length-1,segment=length/last;
      const retainedVelocity=tailForce>.2?.978:.987;
      for(let i=0;i<=last;i++) {
        const p=nodes[i],end=i===0?a:i===last?b:null;
        if(end){p.ox=p.x=end.x;p.oy=p.y=end.y;p.oz=p.z=end.z;continue;}
        const c=s.cells[(i*3+4)%30],dx=(p.x-p.ox)*retainedVelocity,dy=(p.y-p.oy)*retainedVelocity,dz=(p.z-p.oz)*retainedVelocity;
        p.ox=p.x;p.oy=p.y;p.oz=p.z;
        p.x+=dx+h*h*(c.wind*c.dx*tailForce+c.gust*.55);p.y+=dy-h*h*(tailForce>.2?2.7:1.25);
        p.z+=dz+c.wind*c.dz*h*h*tailForce;
      }
      for(let it=0;it<6;it++) {
        for(let j=0;j<last;j++){const i=it%2?last-j-1:j,p=nodes[i],q=nodes[i+1],dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,d=Math.hypot(dx,dy,dz)||.0001;
          const err=(d-segment)/d;if(err<=0)continue;
          const wp=i===0?0:1,wq=i+1===last&&b?0:1,rate=err/(wp+wq);
          p.x+=dx*rate*wp;p.y+=dy*rate*wp;p.z+=dz*rate*wp;q.x-=dx*rate*wq;q.y-=dy*rate*wq;q.z-=dz*rate*wq;
        }
      }
      for(let i=1;i<(b?last:last+1);i++){const p=nodes[i];if(p.z>-21)p.y=Math.max(ground(p.x,p.z)+.035,p.y);}
    }
    // 雲は気流に追随する。水面は隣接区画へ圧を伝え、粘性で鎮まる。
    // 綿毛は丘に接触すると沈み込みを止め、次の上昇流で再び浮く。
    function landscape(h){
      for(let i=0;i<s.clouds.length;i++){const p=s.clouds[i],c=s.cells[(i*4+1)%30];
        p.vx+=((.13+c.wind*.105)*(c.dx+.62)-.006*(p.x-p.home)-p.vx)*h*.22;
        p.vz+=(c.dz*c.wind*.025-.015*(p.z-p.homeZ)-p.vz)*h*.26;p.x+=p.vx*h;p.z+=p.vz*h;}
      for(let i=0;i<48;i++){const p=s.waves[i],before=s.waves[(i+47)%48],after=s.waves[(i+1)%48];p.life-=h;
        if(p.life<=0){p.pressure=random(-.19,.19);p.life=random(.4,2);}
        p.v+=(2.1*(before.h+after.h-2*p.h)-3.2*p.h-1.25*p.v+p.pressure*(.7+s.cells[i%30].wind*.21))*h;}
      for(const p of s.waves)p.h+=p.v*h;
      for(let i=0;i<s.seeds.length;i++){const p=s.seeds[i],c=s.cells[(i*7)%30],floor=ground(p.x,p.z)+.1;
        p.vx+=(.22*c.wind*c.dx+.13*c.gust-.23*(p.x-p.base)-p.vx)*h;
        p.vz+=(.12*c.wind*c.dz-.19*(p.z-p.baseZ)-p.vz)*h;
        p.vy+=((floor+p.buoy*(1+.3*c.wind)-p.y)*1.3+.42*c.gust-.8*p.vy)*h;
        p.x+=p.vx*h;p.y=Math.max(floor,p.y+p.vy*h);p.z+=p.vz*h;}
      const boat=s.boat,c=s.cells[19];boat.speed+=(c.wind*.095-boat.speed)*h*.18;
      boat.heading+=(.045+.022*c.gust)*h;boat.x+=Math.cos(boat.heading)*boat.speed*h;boat.z+=Math.sin(boat.heading)*boat.speed*h*.45;
      spring(boat,'heel','heelV',.04*c.wind*c.dx+s.waves[12].h,3.5,1.4,h);
    }
    function chimes(h){
      for(let i=0;i<3;i++){const b=s.bells[i],node=s.tail[2+i*6],v=(node.x-node.ox)/h,c=s.cells[4+i*8];
        // Vortex shedding rocks the bell. Its lip reverses the clapper on contact.
        const drive=s.stage===1?(s.down&&s.focus===i?1.5:.87):.38;
        b.v+=(-b.angle*(9+i)-.83*b.v+(c.wind*.63+c.gust)*b.side*drive+.32*v)*h;b.angle+=b.v*h;
        b.cool-=h;b.energy*=Math.exp(-h*(1.75+.3*i));
        const stop=.19+.045*i;
        if(b.side*b.angle>=stop){b.side*=-1;if(b.cool<=0&&Math.abs(b.v)>.2){b.energy=Math.min(1,.16+.57*Math.abs(b.v));b.count++;s.strikes++;b.cool=.28;}b.angle=-b.side*stop;b.v*=-.42;}
      }
    }
    // 鈴の音が届いた凧から接近する。左右の凧は個別の横風と慣性を持つ。
    function flock(h){
      const q=s.kite;
      for(let i=0;i<2;i++){const p=s.friends[i],side=i?1:-1,admit=smooth((s.call-i*.22)/(.77-i*.15));
        const bank=s.danceBank*side,landing=s.stage===3,homeX=side*(17+3*i);
        const guiding=s.stage===2&&s.down&&s.focus===i+1;
        const local=s.cells[4+11*i];
        const x=mix(homeX,q.x+side*(2.9+.92*bank)+(guiding?2.0*s.input.x:0),admit)+.26*local.gust;
        const y=mix(4+i,q.y+1.6*bank+.55*side+(guiding?1.7*s.input.y:0),admit)+.085*local.wind;
        const z=mix(-88-i*7,q.z-1.9-2.5*i+bank*1.1,admit);
        spring(p,'x','vx',x,landing?.45:.19,1.04,h);spring(p,'y','vy',y,.37,1.18,h);spring(p,'z','vz',z,.094,.95,h);
        p.bank+=(-p.vx*.19+(guiding?s.input.x*.59:0)+bank*.5+.13*s.cells[4+i].gust-p.bank)*h*1.2;
        solve(p.tail,socket(p,-.825,.026,true),null,1.85,h,.48);
        const a=vec(side*9,-4.2,-28-i*5);const bridle=socket(p,-.02,.26,true);solve(p.rope,a,bridle,distance(a,bridle)*1.05+.8,h,.13);
      }
    }
    function next(n){s.stage=n;s.phaseAge=0;release();}
    function story(h){
      if(s.stage===0 && s.lineLength>24 && s.kite.y>12.9)next(1);
      if(s.stage===1){
        const resonance=s.bells.reduce((sum,b)=>sum+b.energy,0);
        s.call=clamp(s.call+h*resonance*.034,0,1);
        if(s.call>=.999 && Math.abs(s.friends[1].z-s.kite.z)<8)next(2);
      }
      if(s.stage===2){
        // Rise together, bank across the wind, then open into a fan and settle.
        const aim=.65*smooth(s.dance/.15)-1.45*smooth((s.dance-.18)/.27)
          +1.73*smooth((s.dance-.50)/.19)-.97*smooth((s.dance-.73)/.27)+.11*(s.cells[8].dx-s.cells[9].gust);
        spring(s,'danceBank','danceV',aim+(s.down?s.input.x*.52:0),1.2,1.55,h);
        const f=s.friends[0],alignment=1/(1+.15*Math.abs(f.y-s.kite.y)+.18*Math.abs(f.vx));
        s.dance=clamp(s.dance+h*alignment*(.006+.019*s.flightWind/8),0,1);
        if(s.dance===1)next(3);
      }else spring(s,'danceBank','danceV',0,1.2,1.55,h);
      spring(s,'sunset','sunV',s.stage===3?1:0,.010, .19,h);
      if(s.stage===3 && s.lineLength<4.02 && s.phaseAge>35){
        s.landed+=h;
        s.call=Math.max(0,s.call-h*.085);
        if(s.call===0 && s.landed>13){s.cycle++;s.dance=0;s.landed=0;next(0);release();}
      }
    }
    const h=1/100;
    function tick(){s.time+=h;s.phaseAge+=h;s.idle=s.down?0:s.idle+h;air(h);flight(h);
      const bridle=socket(s.kite,-.02,.26);solve(s.rope,anchor,bridle,Math.max(s.lineLength,distance(anchor,bridle))*1.012,h,.15);
      solve(s.tail,tailRoot(),null,2.62,h,.67);chimes(h);landscape(h);story(h);flock(h);}
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;accumulator+=dt;
      while(accumulator+1e-10>=h){tick();accumulator-=h;}}
    return {state:s,step,getState:()=>JSON.parse(JSON.stringify(s)),touch,steer,release};
  }
  const api={create,ground,coast,randomSource,clamp,smooth,mix};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HillWind=api;
})(globalThis);
