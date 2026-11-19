(function (root, make) {
  const api = make();
  if (typeof module !== 'undefined') module.exports = api;
  else root.RobotWorkshop = api;
})(globalThis, function () {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const v = (x=0,y=0,z=0) => ({x,y,z});
  const copy = a => v(a.x,a.y,a.z);
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  const smooth = x => (x=clamp(x,0,1), x*x*(3-2*x));
  const roadX = d => .52*smooth((d-1)/3)-.90*smooth((d-5)/4)+.65*smooth((d-10)/3);
  const roadY = d => -.004-.20*smooth((d-1.04)/1.12)+.085*smooth((d-2)/.9)-.07*smooth((d-4)/1.1)+.63*smooth((d-6)/5.4);
  const driveData = {short:{length:.106,mass:.32},long:{length:.168,mass:.36},wheel:{length:.075,mass:.43}};
  const sockets = {head:v(0,.427,-.008),left:v(-.187,.311,0),right:v(.187,.311,0),drive:v(0,.142,0)};
  const keys = ['head','left','right','short','long','wheel'];
  const home = (id,narrow) => {
    const a = narrow ? [[-.278,.027,.17],[.166,.073,.285],[.289,.073,.253],[-.224,.066,.68],[0,.070,.79],[.216,.081,.68]]
                     : [[-.475,.027,-.045],[.405,.073,-.075],[.545,.073,.075],[-.409,.066,.385],[-.035,.070,.445],[.345,.081,.405]];
    return v(...a[keys.indexOf(id)]);
  };
  function robotOrigin(s){
    const d=s.walker.distance,flying=s.phase==='glide',home=['build','ready','unpack'].includes(s.phase);
    const boarding=.097*smooth((d-11.55)/.35)*(flying?1-smooth(s.flight/.1):1);
    const arc=flying?.65*Math.sin(s.flight*Math.PI)*smooth((d-4.4)/4.4):0;
    return v(roadX(d)+arc,(home?0:roadY(d)+boarding)+s.altitude,-d);
  }
  function create(seed=4971) {
    let rng=seed>>>0;
    function random(){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;}
    const s={phase:'build',chapter:0,lap:0,idle:0,phaseAge:0,narrow:false,held:null,aim:null,events:[],drive:null,
      eyes:[0,1].map(i=>({x:0,y:0,vx:0,vy:0,aperture:1,apertureV:0,wait:3.7+i*.076})),parts:[],shutter:.20,shutterV:0,wind:.025,windTarget:.03,gust:0,heat:[.88,.68,.8],draft:0,
      water:[],dust:[],flag:[],rippleWait:.8,wake:0,walker:{distance:0,speed:0,legLength:.106,mass:1.2,
      stride:.16,stepPhase:.15,com:.18,lean:0,leanV:0,bodyY:.278,bodyV:0,wheelAngle:0,yaw:0,yawV:0,legAngles:[0,0],legV:[0,0],contacts:[true,false],boost:0,compression:[0,0],springV:[0,0],hop:0,hopV:0},
      shelf:0,shelfV:0,sailShelf:0,sailShelfV:0,rewards:[{carry:0,velocity:0},{carry:0,velocity:0}],gate:0,gateV:0,current:0,boat:0,boatV:0,paddles:[{angle:0,omega:0},{angle:.3,omega:0}],wing:[0,0],wingV:[0,0],altitude:0,climb:0,
      flight:0,airspeed:0,launchDistance:0,touchForce:0,focus:null,reset:0};
    for (const id of keys) s.parts.push({id,slot:driveData[id]?'drive':id,pos:home(id,false),vel:v(),attached:false,caught:false,angle:0,omega:0,tip:0,restAngle:(random()-.5)*.12});
    for(let i=0;i<24;i++)s.water.push({h:(random()-.5)*.0015,u:0});
    for(let i=0;i<32;i++)s.dust.push({x:(random()-.5)*2.2,y:.1+random()*.9,z:-random()*1.5,vx:0,vy:0,vz:0,k:random()});
    for(let i=0;i<8;i++)s.flag.push({bend:.008*i/8,velocity:0});
    for(const mote of s.dust){mote.homeX=mote.x;mote.homeZ=mote.z;}
    function emit(type){s.events.push(type);if(s.events.length>20)s.events.shift();}
    function setPhase(phase,chapter=s.chapter){s.phase=phase;s.chapter=chapter;s.phaseAge=0;s.idle=0;s.focus=null;emit(phase);}
    function available(p){return s.phase==='build'&&!p.attached&&!p.caught&&(p.slot!=='drive'||!s.drive)&&
      (p.id==='head'||(s.parts[0].attached&&(p.slot!=='drive'||(s.parts[1].attached&&s.parts[2].attached))));}
    function activeIds(){return s.parts.filter(available).map(p=>p.id);}
    function dest(p){return sockets[p.slot];}
    function setLayout(n){if(s.narrow===n)return;s.narrow=n;for(const p of s.parts)if(!p.attached&&!p.caught&&s.held!==p.id){p.pos=home(p.id,n);p.vel=v();}}
    function grab(id){const p=s.parts.find(x=>x.id===id);if(!p)return false;s.idle=0;
      if(!available(p)){p.omega+=.22;return false;}s.held=id;s.aim=copy(p.pos);emit('pick');return true;}
    function aim(pt){if(!s.held)return;s.aim=copy(pt);s.idle=0;}
    function catchPart(p){p.caught=true;s.held=null;s.aim=null;p.omega+=.9;emit('magnet');}
    function release(){if(!s.held)return;const p=s.parts.find(x=>x.id===s.held);
      if(dist(p.pos,dest(p))<=.05)catchPart(p);s.held=null;s.aim=null;s.idle=0;}
    function configure(id,length){const a=driveData[id];s.drive=id;s.walker.legLength=length??a.length;s.walker.mass=.91+a.mass;}
    function assemble(h){
      for(let i=0;i<s.parts.length;i++){
        const p=s.parts[i],held=p.id===s.held,targ=p.attached||p.caught?dest(p):held?s.aim:home(p.id,s.narrow);
        if(!p.attached){
          const k=held?270:p.caught?175:72,b=held?30:p.caught?23:15;
          for(const a of ['x','y','z'])p.vel[a]+=((targ[a]-p.pos[a])*k-b*p.vel[a])*h;
          const speed=Math.hypot(p.vel.x,p.vel.y,p.vel.z),friction=Math.min(1,(p.caught?.42:.74)/Math.max(speed,1e-8));
          for(const a of ['x','y','z']){p.vel[a]*=friction;p.pos[a]+=p.vel[a]*h;}
          if(held&&dist(p.pos,dest(p))<=.05)catchPart(p);
          if(p.caught&&dist(p.pos,dest(p))<.001&&Math.hypot(p.vel.x,p.vel.y,p.vel.z)<.014){
            p.pos=copy(dest(p));p.vel=v();p.attached=true;p.caught=false;emit('click');
            if(p.slot==='drive'){configure(p.id);setPhase('ready');}
          }
        }
        const force=(p.attached?0:s.wind*(.09+i*.018))+(held?.07:0)+p.restAngle*1.8;
        p.omega+=(force-((p.attached?23:13)*p.angle)-(p.attached?5:2.4)*p.omega)*h;
        p.angle+=p.omega*h;
      }
      const target=s.phase==='build'?.20:.87;
      s.shutterV+=((target-s.shutter)*6-4.8*s.shutterV)*h;s.shutter+=s.shutterV*h;
    }
    function atmosphere(h){
      s.gust-=h;if(s.gust<=0){s.gust=.35+random()*1.55;s.windTarget=(random()-.35)*.25;}
      s.wind+=(s.windTarget-s.wind)*h*.85;
      s.draft+=(s.wind*(.5+s.shutter)-s.draft)*h*1.6;
      for(let i=0;i<s.heat.length;i++){const load=.84-.07*i+(.5-i*.14)*s.draft;s.heat[i]+=(load-s.heat[i])*h/(.6+i*.42);}
      for(const d of s.dust){
        d.vx+=(s.draft*(.2+d.k*.48)-(d.x-d.homeX)*.102-d.vx*.8)*h;
        d.vy+=((.28+.55*d.k-d.y)*.06+s.heat[0]*.015*Math.exp(-6*(d.x+.60)**2)-.003-d.vy*.8)*h;
        d.vz+=((d.homeZ-d.z)*.042-d.vz*.48+s.wind*.016*d.k)*h;
        d.x+=d.vx*h;d.y+=d.vy*h;d.z+=d.vz*h;
      }
      s.rippleWait-=h;
      if(s.rippleWait<=0){s.water[Math.floor(random()*s.water.length)].u+=.006+random()*.009;s.rippleWait=.7+random()*1.6;}
      const accel=s.water.map((a,i)=>{const prev=s.water[Math.max(0,i-1)].h,next=s.water[Math.min(23,i+1)].h;return 62*(prev+next-2*a.h)-8*a.h-1.65*a.u;});
      s.water.forEach((a,i)=>{a.u+=accel[i]*h;a.h+=a.u*h;});
      for(let i=0;i<s.flag.length;i++){const a=s.flag[i],prev=i?s.flag[i-1].bend:0;
        a.velocity+=((prev-a.bend)*35+s.wind*(1+i*.32)-4.4*a.velocity)*h;a.bend+=a.velocity*h;}
    }
    function optics(h){
      const active=s.parts.find(p=>p.id===s.held)||s.parts.find(available);
      const focus=active?active.pos:s.phase==='ready'?v(0,.04,.2):v(.11,.31,-1);
      for(let i=0;i<2;i++){const e=s.eyes[i];e.wait-=h;if(e.wait<-.21)e.wait=3.8+random()*2.4;
        const dx=clamp(focus.x*.032,-.012,.012),dy=clamp((focus.y-.31)*.035,-.008,.008);
        e.vx+=((dx-e.x)*(47+i*3)-11*e.vx)*h;e.vy+=((dy-e.y)*50-11*e.vy)*h;e.x+=e.vx*h;e.y+=e.vy*h;
        const wide=e.wait<0?.17:1;e.apertureV+=((wide-e.aperture)*320-31*e.apertureV)*h;e.aperture+=e.apertureV*h;
      }
    }
    function action(id){
      const w=s.walker;
      if(s.phase==='ready'&&id==='floor'){setPhase('street',1);return true;}
      if(s.phase==='plaza'&&id==='spring'){setPhase('equip',2);emit('spring');return true;}
      if(s.phase==='dock'&&id==='valve'){setPhase('ferry',2);return true;}
      if(s.phase==='summit'&&id==='sail'){setPhase('rig',3);return true;}
      if(['street','hill'].includes(s.phase)&&id==='pet'){if(s.phase==='hill'&&w.hop<.003){w.hopV=.79+w.speed*.3;emit('spring');}w.boost=Math.min(.15,w.boost+.07);emit('coo');s.idle=0;return true;}
      if(s.phase==='ferry'&&id==='paddle'){s.touchForce=Math.min(.4,s.touchForce+.16);emit('splash');s.idle=0;return true;}
      if(s.phase==='glide'&&id==='pet'){s.touchForce=Math.min(.4,s.touchForce+.18);emit('coo');s.idle=0;return true;}
      return false;
    }
    function mechanisms(h){
      const shelf=['plaza','equip'].includes(s.phase)?1:0;s.shelfV+=((shelf-s.shelf)*9-s.shelfV*5.7)*h;s.shelf+=s.shelfV*h;
      const sailShelf=['summit','rig'].includes(s.phase)?1:0;s.sailShelfV+=((sailShelf-s.sailShelf)*9-s.sailShelfV*5.7)*h;s.sailShelf+=s.sailShelfV*h;
      for(let i=0;i<2;i++){
        const r=s.rewards[i],loading=s.phase===(i?'rig':'equip');
        if(r.returning){
          r.velocity+=(-Math.min(.064,r.carry*2)-r.velocity)*4*h;r.carry=Math.max(0,r.carry+r.velocity*h);
          if(r.carry<.0002){r.carry=0;r.velocity=0;r.returning=false;}
        }else if(loading){r.velocity+=((1-r.carry)*24-9*r.velocity)*h;r.carry+=r.velocity*h;
          if(r.carry>=.998&&r.velocity<.035){r.carry=1;r.velocity=0;
            if(i){s.launchDistance=s.walker.distance;setPhase('glide',3);}else setPhase('hill',2);}
        }
      }
      const valve=['ferry','summit','rig','glide'].includes(s.phase)?1:0;
      s.gateV+=((valve-s.gate)*2.7-s.gateV*2.8)*h;s.gate+=s.gateV*h;
      if(s.gate>1||s.gate<0){s.gate=clamp(s.gate,0,1);s.gateV=0;}
      s.touchForce*=Math.exp(-1.1*h);s.current+=((.27+s.touchForce)*s.gate-s.current)*.75*h;
      if(s.phase==='ferry'){s.boatV+=(s.current*(1-smooth((s.boat-3.4)/.7))+.032-s.boatV)*.9*h;s.boat+=s.boatV*h;s.walker.distance=11.9+s.boat;
        s.wake+=s.boatV*h;if(s.wake>.11){s.wake-=.11;const cell=Math.min(22,Math.floor(s.boat*5));
          s.water[cell].u+=s.boatV*.027;s.water[cell+1].u-=s.boatV*.013;}
        if(s.boat>=4.08){setPhase('summit',3);}}
      else if(s.phase==='glide'||s.phase==='unpack'||s.phase==='build'){
        const winch=-Math.min(.24,s.boat*.92);s.boatV+=(winch-s.boatV)*2.3*h;s.boat=Math.max(0,s.boat+s.boatV*h);
      }else s.boatV*=Math.exp(-3*h);
      for(let i=0;i<2;i++){
        const paddle=s.paddles[i],waterSpeed=s.phase==='ferry'?s.current-s.boatV*.41+s.water[6+i*7].u:0;
        paddle.omega+=(waterSpeed/.067-paddle.omega)*(2.7+i*.21)*h;paddle.angle+=paddle.omega*h;
      }
      for(let i=0;i<2;i++){const target=s.phase==='glide'?(1+.09*s.wind*(i?1:-1))*(1-smooth((s.flight-.96)/.04)):0;
        s.wingV[i]+=((target-s.wing[i])*(6+i)-s.wingV[i]*(4.3+i*.2))*h;s.wing[i]+=s.wingV[i]*h;}
      if(s.phase==='glide'){
        const spread=(s.wing[0]+s.wing[1])*.5;
        const airTarget=s.flight>=1?0:.24+.29*spread+.34*s.wind+s.touchForce*.32;
        s.airspeed+=(airTarget-s.airspeed)*(s.flight>=1?3:.95)*h;
        s.flight=Math.min(1,s.flight+h*s.airspeed/s.launchDistance);s.walker.distance=s.launchDistance*(1-smooth(s.flight));
        const lift=Math.sin(Math.PI*s.flight)*(1.98+s.airspeed+s.touchForce*.6+s.wind*.4)*(.15+.85*smooth((s.walker.distance-4.9)/6.1));
        s.climb+=((lift-s.altitude)*4-s.climb*3.5)*h;s.altitude+=s.climb*h;
        if(s.flight>=1&&s.altitude<.012)setPhase('unpack',0);
      }
    }
    function locomotion(h){
      const w=s.walker,walk=s.phase==='street'||s.phase==='hill',wheel=s.drive==='wheel';
      const d=w.distance,slope=(roadY(d+.005)-roadY(d-.005))/.01;
      const wet=smooth((d-2.8)/.28)*(1-smooth((d-3.9)/.3));
      const gravel=smooth((d-4.34)/.2)*(1-smooth((d-5.32)/.24));
      const spring=s.phase==='hill'?1:0;
      const stride=w.legLength*(wheel?2.25:1.50)*(1+.19*spring)/(1+Math.max(0,slope)*.72+gravel*.15);
      w.stride+=(stride-w.stride)*(1-Math.exp(-7*h));
      const balance=.11+w.legLength*.72+(w.mass-1.24)*.032;w.com+=(balance-w.com)*h*8;
      const immersion=wet*.016/Math.max(.045,w.legLength*(wheel?1.42:.44));
      const goal=walk?(wheel?.221:w.stride*.90)*(1+w.boost*3)/(1+gravel*(wheel?.9:.28)+immersion+Math.max(slope,0)*2.1):0;
      w.speed+=(goal-w.speed)*(wheel?1.4:3.1)*1.23/w.mass*h;w.boost*=Math.exp(-h*1.2);
      if(walk){
        const limit=s.phase==='street'?5.85:11.9;
        w.distance=Math.min(limit,w.distance+w.speed*h);
        if(w.distance>=limit){setPhase(limit===5.85?'plaza':'dock');}
      }
      w.stepPhase+=w.speed*h/Math.max(.05,2*w.stride);if(wheel)w.wheelAngle+=w.speed*h/.042;
      const gait=Math.sin(w.stepPhase*2*Math.PI);
      for(let i=0;i<2;i++){
        const swing=(i?-1:1)*gait,contact=swing<0;
        if(!w.contacts[i]&&contact&&walk){emit(wet>.3?'splash':wheel?'roll':'step');if(wet>.1)s.water[(Math.floor(d*17)+i*6)%24].u+=.027*wet;}
        w.contacts[i]=contact;
        const load=spring&&contact&&w.hop<.002?w.mass*.015*(.65+.35*Math.abs(swing)):0;
        w.springV[i]+=((load-w.compression[i])*89-w.springV[i]*(7+i*.31))*h;
        w.compression[i]+=w.springV[i]*h;
        const target=wheel?0:swing*Math.min(1,w.speed*10)*(.47+.2*spring);
        w.legV[i]+=((target-w.legAngles[i])*105-(10+i*.4)*w.legV[i])*h;w.legAngles[i]+=w.legV[i]*h;
      }
      const lean=(wheel?slope*.5:gait*.06)*Math.min(1,w.speed*8)+s.wind*.006;
      w.leanV+=((lean-w.lean)*36-6*w.leanV)*h*.26/(w.mass*w.com);w.lean+=w.leanV*h;
      if(w.hop>0||w.hopV>0){w.hopV-=3.7*h;w.hop+=w.hopV*h;if(w.hop<=0){w.hop=0;w.hopV=0;w.springV[0]+=.06;w.springV[1]+=.043;}}
      const base=s.phase==='build'||s.phase==='unpack'?.278:.146+w.legLength+(s.phase==='ready'?.047:0);
      const bob=wheel?gravel*.003*Math.sin(w.wheelAngle*3):Math.abs(gait)*w.legLength*(.12+spring*.18)*Math.min(1,w.speed*8);
      w.bodyV+=((base+bob+w.hop-(w.compression[0]+w.compression[1])*.44-w.bodyY)*95-w.bodyV*12)*h;w.bodyY+=w.bodyV*h;
      const facing=['street','plaza','equip','hill','dock','ferry','summit','rig'].includes(s.phase)?Math.PI:0;
      w.yawV+=((facing-w.yaw)*8-w.yawV*5.6)*h;w.yaw+=w.yawV*h;
    }
    function resetParts(){
      s.lap++;s.drive=null;s.held=null;s.aim=null;s.flight=0;s.airspeed=0;s.altitude=0;s.climb=0;
      Object.assign(s.walker,{distance:0,speed:0,boost:0,legLength:.106,mass:1.2});
      for(const r of s.rewards)r.returning=true;
      for(const p of s.parts){p.attached=false;p.caught=false;}setPhase('build',0);
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      let left=dt;while(left>1e-9){const h=Math.min(1/120,left);left-=h;
        s.idle+=h;s.phaseAge+=h;atmosphere(h);assemble(h);optics(h);mechanisms(h);locomotion(h);
        if(s.phase==='unpack'&&s.phaseAge>1.4)resetParts();
      }
    }
    return {s,step,grab,aim,release,action,available,activeIds,setLayout,configure,
      getState:()=>JSON.parse(JSON.stringify(s))};
  }
  return {create,keys,home,sockets,driveData,roadX,roadY,robotOrigin,clamp,smooth};
});
