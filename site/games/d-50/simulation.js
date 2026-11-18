/* Distances in metres, time in seconds, liquid storage in mm.
   Rendering and audio consume this model. Neither supplies its clock. */
(function (root) {
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const approach=(x,target,rate,dt)=>target+(x-target)*Math.exp(-rate*dt);
const path={umbrella:[-.66,3.6],arcade:[0,-3.9],shoeDoor:[-1.85,-7.6],
  paperDoor:[1.85,-16.2],plaza:[0,-25],home:[-.66,3.6]};
const puddles=[[-.75,1.25],[.78,-1.4],[-.55,-4.8],[.45,-10.2],[-.9,-19.8],[.8,-22.5]];
function create(seed=93471){
  let r=seed>>>0;
  function rand(){r=(Math.imul(r,1664525)+1013904223)>>>0;return r/4294967296}
  const rib=Array.from({length:10},(_,i)=>({opening:.018,v:0,bend:0,bv:0,wet:.025,drip:0,k:20+i%4*1.4}));
  const cells=Array.from({length:36},(_,i)=>({water:.16+rand()*.5,rate:.08+rand()*.06,drain:.011+rand()*.016,
    x:-2.25+(i%6)*.9,z:3.4-Math.floor(i/6)*5.55,roof:Math.floor(i/6)>=2&&Math.floor(i/6)<=4,wave:0,wv:0,impact:0}));
  const pools=puddles.map(([x,z])=>({x,z,h:0,v:0,rings:[]}));
  const bulbs=Array.from({length:10},(_,i)=>({heat:.49+rand()*.26,cap:1+rand()*.55,z:-3-i*2.05}));
  const page=Array.from({length:15},(_,i)=>({a:0,v:0,k:38-i*.7}));
  const s={time:0,stage:'umbrella',cycle:0,x:-.66,z:3.6,speed:0,vx:0,vz:0,idle:0,
    canopy:.018,lift:0,liftV:0,tilt:0,tiltV:0,lean:0,leanV:0,wind:.12,gust:.12,nextGust:1.3,
    rain:1,shelter:0,indoor:0,cutoff:3400,reflection:.022,density:1,walked:0,
    rib,cells,pools,bulbs,page,events:[],weatherCount:0,footTimer:0,
    bootX:0,bootV:0,bootY:0,bootYV:0,bootGoal:0,bootLanded:false,bootBusy:false,
    soles:[0,0,0],soleV:[0,0,0],tried:[false,false,false],pageTarget:0,pageHeld:false,pageDriver:0,pageDriverV:0,
    gate:0,gateV:0,gateGoal:0,basin:.16,flow:.01,wheel:0,wheelV:0,
    boat:0,boatV:0,boatRoll:0,rollV:0,mist:0,rainbow:0,stageAge:0,heading:0,
    dust:Array.from({length:22},()=>({x:rand()*2-1,y:rand()*1.7+.3,z:rand()*1.2-.6,v:0})),
    jets:Array.from({length:64},(_,i)=>({x:0,y:.6+i*.018,z:0,vx:0,vy:0,vz:0})),
    drops:Array.from({length:370},(_,index)=>({index,generation:0,x:rand()*12-6,y:rand()*6,z:8-rand()*43,v:3+rand()*2,trail:.065+rand()*.09}))};
  const signs=[{angle:0,velocity:0},{angle:0,velocity:0}];s.signs=signs;
  s.guides=Array.from({length:7},(_,i)=>({charge:.05,heat:.05,x:0,z:0,index:i}));
  s.gutters=Array.from({length:12},(_,i)=>({load:rand()*.55,capacity:.64+rand()*.22,
    y:.04,vy:0,falling:false,x:(i%2?1:-1)*2.94,z:-2.92-Math.floor(i/2)*2.9}));
  s.bells=[.11,.087,.071].map((length,i)=>({length,angle:.035*(i-1),velocity:0,clapper:0,cv:0,touched:false,cool:0}));
  s.keyAngle=0;s.keySpeed=0;s.springWind=0;s.cartZ=-25.5;s.cartX=1.62;s.cartSpeed=0;s.axle=0;s.cartYaw=0;s.cartPhase='plaza';
  let dest=null,hold=null,stepDistance=0,weatherClock=0,hitClock=0,returnTurn=false,folding=false;
  function stage(name){s.stage=name;s.stageAge=0;s.idle=0;dest=null;hold=null}
  function emit(type,power,x=0,timbre=0){s.events.push({type,power,x,timbre});if(s.events.length>100)s.events.shift()}
  function ripple(i,force){const p=pools[i];p.v+=force*.022;p.rings.push({radius:.02,energy:force,age:0});if(p.rings.length>7)p.rings.shift()}
  function press(what,point){
    s.idle=0;
    if(what==='umbrella'&&s.stage==='umbrella'){stage('opening');emit('cloth',.85);return true}
    if(what.startsWith('rib')&&s.stage==='arcade'){
      const i=Number(what.slice(3));if(!Number.isInteger(i)||i<0||i>=rib.length)return false;
      rib[i].bv=Math.max(-.44,rib[i].bv-.34-rib[i].wet*.24);emit('cloth',.49+Math.min(.24,rib[i].wet),Math.cos(i*.628));return true}
    if(what==='boot'&&s.stage==='shoe'){stage('soles');jump(0);return true}
    if(what.startsWith('sole')&&s.stage==='soles'){if(!s.bootBusy)jump(clamp(Number(what.slice(-1)),0,2));return true}
    if(what==='page'&&s.stage==='paper'){s.pageTarget=Math.PI;stage('turning');emit('paper',.7);return true}
    if(what==='gate'&&s.stage==='sluice'){s.gateGoal=1;stage('sailing');emit('wood',.58);return true}
    if(what==='prism'&&s.stage==='prism'){stage('rainbow');emit('glass',.7);return true}
    if(what==='home'&&s.stage==='rainbow'&&s.stageAge>2){stage('bells');return true}
    if(what.startsWith('bell')&&s.stage==='bells'){
      const i=Number(what.slice(-1));if(!Number.isInteger(i)||i<0||i>2)return false;
      const b=s.bells[i];b.velocity+=b.angle>.05?-2.5:2.5;b.touched=true;emit('bell'+i,.71,i-1);
      return true}
    if(what==='key'&&s.stage==='winder'){s.keySpeed+=7.8;emit('wood',.43);stage('winding');return true}
    if(path[s.stage] && s.stage!=='umbrella' && (what==='walk'||what===s.stage)){
      if(what==='walk'&&point){hold=point;dest=null}else{dest=path[s.stage];hold=null}return true
    }
    if(s.stage==='return'&&(what==='walk'||what==='home')){dest=path.home;return true}
    return false
  }
  function jump(i){s.bootGoal=(i-1)*.54;s.bootYV=1.64;s.bootBusy=true;s.bootLanded=false}
  function walk(dt){
    let target=dest||hold;
    // The last stretch of paving curves towards the active shop threshold.
    // Holding forward at the far kerb gradually carries the walker into the door.
    if(hold&&(s.stage==='shoeDoor'||s.stage==='paperDoor')){
      const door=path[s.stage],near=clamp((door[1]+1.65-s.z)/1.5,0,1);
      if(hold[1]<s.z&&near>0)target=[hold[0]*(1-near)+door[0]*near,Math.max(door[1],hold[1])]
    }
    let vx=0,vz=0;
    if(target){const dx=target[0]-s.x,dz=target[1]-s.z,d=Math.hypot(dx,dz);
      const speed=Math.min(clamp(.62+d*.16,.6,1.2),d*7);
      if(d>.009){vx=dx/d*speed;vz=dz/d*speed}
    }
    s.vx=approach(s.vx,vx,11,dt);s.vz=approach(s.vz,vz,11,dt);
    s.x=clamp(s.x+s.vx*dt,-2.28,2.28);s.z=clamp(s.z+s.vz*dt,-26,4.8);
    s.speed=Math.hypot(s.vx,s.vz);stepDistance+=s.speed*dt;s.walked+=s.speed*dt;
    if(stepDistance>.48){stepDistance-=.48;let i=pools.findIndex(p=>Math.hypot(s.x-p.x,s.z-p.z)<.87);
      if(i>=0){ripple(i,.78);emit('puddle',.32,s.x)}else emit('step',.34,s.x)}
    const goal=s.stage==='return'?path.home:path[s.stage];
    const reached=goal&&Math.hypot(s.x-goal[0],s.z-goal[1])<(s.stage==='return'?.018:.78);
    const crossed=goal&&(s.stage==='arcade'||s.stage==='plaza')&&s.z<=goal[1]+.75;
    if(reached||crossed){
      if(s.stage==='arcade'){stage('shoeDoor');emit('glass',.38)}
      else if(s.stage==='shoeDoor')stage('shoe');
      else if(s.stage==='paperDoor')stage('paper');
      else if(s.stage==='plaza')stage('sluice');
      else if(s.stage==='return'){stage('closing');folding=true}
    }
  }
  function weather(dt){
    s.nextGust-=dt;if(s.nextGust<=0){s.gust=(rand()-.46)*.7;s.nextGust=1.2+rand()*2.3}
    s.wind=approach(s.wind,s.gust,.9,dt);
    const inside=['shoe','soles','paper','turning'].includes(s.stage);
    s.indoor=approach(s.indoor,inside?1:0,2.6,dt);
    const coverage=clamp((-s.z-2.1)/2.1,0,1)*clamp((s.z+21.9)/2.2,0,1);
    s.shelter=approach(s.shelter,coverage,3.4,dt);
    const clearing=['sluice','sailing','prism','rainbow','bells','winder','winding','return','closing'].includes(s.stage);
    s.rain=approach(s.rain,clearing?.14:1,clearing?.18:.26,dt);
    s.cutoff=approach(s.cutoff,(3400-2300*s.shelter)*(1-.54*s.indoor),4,dt);
    s.reflection=approach(s.reflection,.022+.082*s.shelter-.027*s.indoor,3,dt);
    s.density=s.rain*(1-.78*s.shelter)*(1-.76*s.indoor);
    const liveDrops=Math.floor(s.drops.length*(.18+.82*s.rain));
    for(const d of s.drops){const prevY=d.y;d.v=Math.min(6.8,d.v+4*dt);d.y-=d.v*dt;d.x+=s.wind*dt;
      const roof=d.z<-2.9&&d.z>-20.6&&Math.abs(d.x)<3.05;
      const roofHit=roof&&d.y<3.45+1.42*Math.sqrt(Math.max(0,1-(d.x/3.04)**2));
      const dx=d.x-s.x,dz=d.z-s.z,rr=dx*dx+dz*dz,surface=2.451-.49*rr;
      const clothHit=!roof&&s.canopy>.7&&rr<s.canopy*s.canopy&&d.y<=surface&&prevY>surface;
      if(d.y<.04||roofHit||clothHit){
        if(d.index<liveDrops){const strength=d.v/6.8;
          if(clothHit){const index=(Math.floor((Math.atan2(dz,dx)-.24-s.heading)*10/(Math.PI*2))+20)%10;
            rib[index].bv-=.096*strength;rib[index].wet+=.012*strength;emit('cloth',.33*strength,dx)}
          else if(roofHit&&Math.abs(d.x)>2.6&&Math.abs(d.z-s.z)<3.2){
            emit('tin',.17*strength*(1-.78*s.indoor),d.x*.3)}
          else if(!roofHit&&Math.abs(d.x)<2.77){
            const row=clamp(Math.round((3.4-d.z)/5.55),0,5),col=clamp(Math.round((d.x+2.25)/.9),0,5);
            cells[row*6+col].impact+=.08*strength;
            const pool=pools.findIndex(p=>(p.x-d.x)**2+(p.z-d.z)**2<.43);
            if(pool>=0)ripple(pool,.22*strength)
          }}
        d.generation++;d.y=6+rand()*2.5;d.x=rand()*12-6;d.z=8-rand()*43;d.v=2.8+rand()*1.6}
    }
    weatherClock-=dt;if(weatherClock<=0){weatherClock=(.055+rand()*.115)/s.rain;s.weatherCount++;
      const i=Math.floor(rand()*cells.length);cells[i].impact+=.14+rand()*.22;
      if(!cells[i].roof){const c=cells[i],j=pools.findIndex(p=>Math.hypot(c.x-p.x,c.z-p.z)<2.9);if(j>=0)ripple(j,.14+rand()*.28)}
      if(s.canopy>.1&&rand()<s.density){const b=rib[Math.floor(rand()*10)];b.bv-=.06+rand()*.12;b.wet+=.007}}
    hitClock-=dt;if(hitClock<=0){hitClock=(.026+rand()*.072)/Math.max(.16,s.rain);
      const u=rand(), t=u<s.shelter*.79?'tin':u<.55&&s.canopy>.2?'cloth':'stone';
      emit(t,(.23+.52*rand())*(1-.81*s.indoor)*(1-(t==='tin'?.49:.72)*s.shelter),rand()*2-1,rand())}
    for(let i=0;i<cells.length;i++){const c=cells[i],up=cells[(i+35)%36];
      c.water+=dt*(c.rate*s.rain*(c.roof?.18:1)+Math.max(0,up.water-c.water)*.046-c.drain*c.water);
      c.wv+=(c.impact*4-c.wave*34-c.wv*4)*dt;c.wave+=c.wv*dt;c.impact*=Math.exp(-9*dt)}
    for(const p of pools){p.v+=(-p.h*32-p.v*3.1)*dt;p.h+=p.v*dt;
      for(const a of p.rings){a.age+=dt;a.radius+=dt*(.29+a.energy*.18);a.energy*=Math.exp(-1.85*dt)}
      p.rings=p.rings.filter(a=>a.energy>.038)}
    for(let i=0;i<signs.length;i++){const a=signs[i];a.velocity+=(s.wind*(.18+i*.045)-a.angle*(8-i)-a.velocity*1.3)*dt;a.angle+=a.velocity*dt}
    for(let i=0;i<s.gutters.length;i++){const g=s.gutters[i];g.load+=s.rain*dt*(.21+(i%5)*.047);
      if(g.falling){g.vy-=9.81*dt;g.y+=g.vy*dt;if(g.y<=.03){g.y=.03;g.falling=false;cells[(i*5)%36].impact+=.26}}
      else if(g.load>=g.capacity){g.load-=g.capacity;g.y=3.39;g.vy=-.22;g.falling=true}}
    for(const b of bulbs){const near=Math.exp(-Math.abs(s.z-b.z)*.29);const power=.6+.37*near+.06*s.shelter;
      b.heat+=dt*(power-b.heat)/b.cap}
    for(const d of s.dust){d.v+=(s.wind*.16-d.v*1.6)*dt;d.x+=d.v*dt;d.y-=dt*.026;
      if(d.y<.23){d.y=2.05;d.x=rand()*2-1}}
  }
  function umbrella(dt){
    let out=s.stage!=='umbrella'&&!folding;
    s.liftV+=((Number(out)-s.lift)*12-6.1*s.liftV)*dt;s.lift+=s.liftV*dt;
    const target=clamp((s.lift-.23)*1.6,0,1);
    s.tiltV+=((target-s.tilt)*18-7.8*s.tiltV)*dt;s.tilt+=s.tiltV*dt;
    s.leanV+=((s.wind*.07-s.vx*.07-s.lean)*17-3.4*s.leanV)*dt;s.lean+=s.leanV*dt;
    let sum=0;
    for(let i=0;i<10;i++){const b=rib[i],adj=rib[(i+9)%10],goal=.018+.982*target;
      b.v+=((goal-b.opening)*b.k+(adj.opening-b.opening)*2.4-b.v*(6.5+2.8*Math.abs(b.v)))*dt;
      b.opening=clamp(b.opening+b.v*dt,.012,1.02);
      b.bv+=(s.wind*Math.cos(i*.628)*.33+(adj.bend-b.bend)*6.2-b.bend*(31+b.k*.2+260*Math.abs(b.bend))-b.bv*4.5-b.wet*.012)*dt;b.bend+=b.bv*dt;
      b.wet+=dt*(s.density*.014*(1+i%3*.1)-b.wet*.14);if(b.wet>.16){b.wet-=.036;b.drip=1}
      b.drip=Math.max(0,b.drip-dt*1.8);sum+=b.opening}
    s.canopy=sum/10;
    if(s.stage==='opening'&&s.canopy>.90)stage('arcade');
    if(s.stage==='closing'&&s.lift<.006&&s.canopy<.027){folding=false;returnTurn=false;s.cycle++;s.tried.fill(false);s.pageTarget=0;s.gateGoal=0;s.bootGoal=0;s.keySpeed=0;s.bells.forEach(b=>b.touched=false);stage('umbrella')}
  }
  function shops(dt){
    s.bootV+=((s.bootGoal-s.bootX)*76-13*s.bootV)*dt;s.bootX+=s.bootV*dt;
    if(s.bootBusy){s.bootYV-=3.7*dt;s.bootY+=s.bootYV*dt;if(s.bootY<=0&&s.bootYV<0){
      const i=Math.round(s.bootGoal/.54)+1;s.soleV[i]-=.11;s.bootY=0;s.bootYV=0;
      s.bootLanded=true;s.bootBusy=false;s.tried[i]=true;emit(['wood','step','puddle'][i],.8);s.footTimer=0}}
    s.footTimer+=dt;
    for(let i=0;i<3;i++){s.soleV[i]+=(-s.soles[i]*(70+i*16)-s.soleV[i]*5)*dt;s.soles[i]+=s.soleV[i]*dt}
    if(s.stage==='soles'&&s.tried.every(Boolean)&&s.footTimer>1.1)stage('paperDoor');
    s.pageDriverV+=((s.pageTarget-s.pageDriver)*14-s.pageDriverV*6.9)*dt;s.pageDriver+=s.pageDriverV*dt;
    for(let i=0;i<page.length;i++){const p=page[i],parent=i?page[i-1].a:s.pageDriver;
      const curl=s.stage==='paper'?(.05+s.wind*.09)*Math.pow(i/14,3):0;
      const target=.76*parent+.24*s.pageDriver+curl; p.v+=((target-p.a)*p.k-p.v*(5.1+i*.12))*dt;
      p.a=clamp(p.a+p.v*dt,0,Math.PI+.08)}
    if(s.stage==='turning'&&!s.pageHeld&&s.stageAge>3.2&&page[14].a>3.02)stage('plaza');
  }
  function waterworks(dt){
    s.gateV+=((s.gateGoal-s.gate)*9-s.gateV*4.2)*dt;s.gate+=s.gateV*dt;
    s.basin+=dt*(.037*s.rain+.014-s.basin*.08-.18*s.gate*s.basin);
    const discharge=.009+s.gate*Math.sqrt(Math.max(0,s.basin))*.56;
    s.flow=approach(s.flow,discharge,1.8,dt);
    s.wheelV+=(s.flow*5.6-s.wheelV*(.48+.16*s.wheelV))*dt;s.wheel+=s.wheelV*dt;
    if(s.stage==='sailing'){s.boatV+=(s.flow*2.8-s.boatV*.82)*dt;s.boat=Math.min(4.1,s.boat+s.boatV*dt);
      if(s.boat>=4.1){s.boatV=0;stage('prism')}}
    for(let i=0;i<s.jets.length;i++){const j=s.jets[i];j.vy-=4.3*dt;j.y+=j.vy*dt;j.x+=j.vx*dt;j.z+=j.vz*dt;
      if(j.y<.37){const a=i*2.39996+rand()*.17,jet=.46+s.flow*.62;
        j.x=.082*Math.cos(a);j.z=.082*Math.sin(a);j.y=1.67+rand()*.08;
        j.vx=Math.cos(a)*jet;j.vz=Math.sin(a)*jet;j.vy=.22+s.mist*(1.3+rand()*.62)+rand()*.35}}
    if(s.stage==='closing'||s.stage==='umbrella'||s.stage==='opening'||s.stage==='arcade'){
      s.boatV+=dt*(-s.boat*2.3-s.boatV*3.5);s.boat+=s.boatV*dt}
    s.rollV+=(s.wind*.28+s.flow*.12-s.boatRoll*12-s.rollV*2.3)*dt;s.boatRoll+=s.rollV*dt;
    s.mist=approach(s.mist,['rainbow','bells','winder','winding','return'].includes(s.stage)?1:0,.64,dt);
    s.rainbow=clamp(s.mist*(1-s.rain)*1.12,0,1);
    if(s.stage==='rainbow'&&s.stageAge>7)stage('bells');
    for(let i=0;i<3;i++){const b=s.bells[i];b.cool-=dt;
      b.velocity+=dt*(-9.81/(b.length+.19)*Math.sin(b.angle)-1.23*b.velocity+s.wind*.24);
      b.angle+=b.velocity*dt;b.cv+=dt*(-9.81/b.length*Math.sin(b.clapper)-b.cv*1.54);b.clapper+=b.cv*dt;
      const gap=b.clapper-b.angle;if(Math.abs(gap)>.21){const impact=b.cv-b.velocity;
        b.clapper=b.angle+Math.sign(gap)*.21;b.cv=b.velocity-.38*impact;
        if(Math.abs(impact)>.62&&b.cool<=0){emit('bell'+i,Math.min(.58,Math.abs(impact)*.12),i-1);b.cool=.15}}}
    if(s.stage==='bells'&&s.bells.every(b=>b.touched)&&s.stageAge>1.5)stage('winder');
    s.keySpeed*=Math.exp(-1.64*dt);s.keyAngle+=s.keySpeed*dt;
    if(s.stage==='winding'){s.springWind+=s.keySpeed*dt;
      if(s.keySpeed<.44){stage('return');returnTurn=true;dest=path.home;s.cartPhase='home'}}
    if(s.cartPhase==='home'&&s.cycle>0&&s.stage==='opening')s.cartPhase='back';
    if(s.cartPhase!=='plaza'){
      const home=s.cartPhase==='home',goal=home?3.17:-25.5,dir=home?1:-1;
      const remaining=(goal-s.cartZ)*dir,stop=clamp(remaining*1.34,0,1);
      const drive=home?s.springWind*.29:1.63;
      s.cartSpeed+=dt*(drive*stop-s.cartSpeed*(.42+.52*s.cartSpeed));
      const travel=Math.min(Math.max(0,remaining),s.cartSpeed*dt);
      s.cartZ+=dir*travel;s.axle+=dir*travel/.17;
      s.cartYaw=approach(s.cartYaw,remaining>1?-Math.PI*.5:0,1.5,dt);
      if(home)s.springWind=Math.max(0,s.springWind-travel*.028);
      s.cartX=approach(s.cartX,remaining>2?.61:1.62,1.75,dt);
      if(!home&&remaining<.001){s.cartPhase='plaza';s.cartSpeed=0}
    }else s.cartYaw=approach(s.cartYaw,0,2,dt);
    s.heading=approach(s.heading,returnTurn?Math.PI:0,1.4,dt)
  }
  // Flush brass pavement lights respond in succession to the pressure upstream.
  // Their ceramic housings and the stones remain fixed between walks.
  const routes={arcade:[path.umbrella,path.arcade],shoeDoor:[path.arcade,path.shoeDoor],
    paperDoor:[path.shoeDoor,path.paperDoor],plaza:[path.paperDoor,path.plaza]};
  function guideLights(dt){
    const route=routes[s.stage];
    for(let i=0;i<s.guides.length;i++){const b=s.guides[i],f=(i+1)/8;
      if(route){const a=route[0],c=route[1];b.x=a[0]+(c[0]-a[0])*f;b.z=a[1]+(c[1]-a[1])*f}
      const distance=Math.hypot(s.x-b.x,s.z-b.z),source=route?Math.exp(-Math.pow((distance-1.65)/1.75,2)):0;
      b.charge+=dt*(source-b.charge)*(2.3+i*.14);b.heat+=dt*(b.charge-b.heat)/(0.28+i*.026)}
  }
  function tick(dt){s.time+=dt;s.stageAge+=dt;s.idle+=dt;walk(dt);weather(dt);umbrella(dt);shops(dt);waterworks(dt);guideLights(dt)}
  function step(dt){if(!Number.isFinite(dt)||dt<=0)return;while(dt>1e-8){let h=Math.min(1/120,dt);tick(h);dt-=h}}
  return {s,step,press,nudge(i){if(i===0||i===1)signs[i].velocity+=.14},move(point){if(hold)hold=point},dragPage(fraction){if(s.stage==='turning'){s.pageHeld=true;s.pageTarget=Math.PI*clamp(fraction,.08,1)}},
    liftGate(fraction){if(s.stage==='sailing')s.gateGoal=clamp(fraction,.27,1)},
    windKey(amount){if(s.stage==='winding')s.keySpeed=Math.min(9,s.keySpeed+Math.abs(amount)*.024)},
    release(){hold=null;if(s.pageHeld){s.pageHeld=false;s.pageTarget=Math.PI}if(s.stage==='sailing')s.gateGoal=1},takeEvents(){return s.events.splice(0)},
    getState(){return JSON.parse(JSON.stringify(s))},path}
}
const api={create,path};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RainWalk=api;
})(typeof globalThis!=='undefined'?globalThis:this);
