/* Distances are in workshop units (one unit = 5 cm). Time is in seconds.
   Each contact owns its impulse. The renderer only samples this model. */
(function (root) {
  'use strict';
  const TAU = 2 * Math.PI;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const materials = [
    {name:'wood', hz:224, decay:.19, bounce:.29, mass:1.05, friction:5.5, modes:[1,2.68,4.15], gains:[1,.28,.09]},
    {name:'shell', hz:718, decay:.31, bounce:.22, mass:.82, friction:4.1, modes:[1,1.93,3.17], gains:[.72,.52,.14]},
    {name:'metal', hz:940, decay:1.23, bounce:.43, mass:1.48, friction:3.7, modes:[1,2.46,3.81], gains:[.84,.46,.21]},
    {name:'plastic', hz:434, decay:.14, bounce:.36, mass:.88, friction:4.6, modes:[1,2.16,3.55], gains:[1,.32,.10]},
    {name:'cloth', hz:169, decay:.086, bounce:.105, mass:.72, friction:8.2, modes:[1,1.65,2.77], gains:[1,.18,.055]}
  ];
  const chapters = [
    {count:18,r:.90,h:2.18,mouth:.68,base:.14,bed:.105},
    {count:10,r:.72,h:1.37,mouth:.53,base:.12,bed:1.60},
    {count:12,r:.72,h:1.51,mouth:.54,base:.12,bed:1.79},
    {count:9,r:.66,h:1.42,mouth:.49,base:.13,bed:.23}
  ];
  function random(seed) {
    return () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  function spring(o, target, k, drag, dt) {
    o.v += ((target-o.x)*k - o.v*drag)*dt;
    o.x += o.v*dt;
  }
  function make(seed=1834, portrait=false) {
    const rng=random(seed);
    const s={time:0, chapter:0, serial:0, travel:0, trackSpeed:0, phase:'play', fill:0, contacts:0,
      portrait, idle:0, held:-1, target:null, lid:{x:2.86,v:0}, tag:{x:.025,v:0}, zoom:{x:0,v:0},
      wheel:0, omega:0, gate:0, pump:{x:0,v:0}, wind:0, puff:0, wheelTouch:false,
      water:[], leaves:[], dust:[], facets:[], bodies:[], lastNote:null, rewardAge:0,
      air:[.08,-.11,.16], airTarget:[.12,-.07,.19], gust:0, vane:{angle:0,speed:0}, hint:{age:0,sequence:0}, vibrations:[0,0,0], events:[]};
    for(let i=0;i<19;i++) s.water.push({x:.0012*(rng()-.5),v:0,drag:1.2+.6*rng()});
    for(let i=0;i<15;i++) s.leaves.push({x:(rng()-.5)*.09,v:0,k:3+rng()*5,load:.6+rng()});
    for(let i=0;i<42;i++) s.dust.push({x:rng()*9-4.5,y:.4+rng()*4.8,z:rng()*5-3.5,vx:(rng()-.5)*.05,vy:.018*(rng()-.5),mass:.4+rng()});
    for(let i=0;i<18;i++) s.facets.push({x:0,v:0,energy:0,axis:rng()*TAU});
    function anchors() {
      const p=s.portrait, compact=s.chapter!==0;
      s.jar={x:p?-.22:-1.06,z:p?-.77:-.12};
      s.tray={x:p?.12:1.15,z:p?1.44:.67,scale:p?.81:1};
      if(compact && p) {s.jar.x=-.34;s.tray.x=.14;s.tray.z=1.16;}
    }
    function home(b) {
      const c=chapters[s.chapter],a=s.tray;
      if(s.chapter===0&&b.id<2){
        const x=s.portrait?[-.92,-.34]:[-2.32,-1.80],z=s.portrait?[2.49,2.95]:[1.05,1.49];
        return {x:x[b.id],y:.088+b.id*.006,z:z[b.id]};
      }
      if(s.chapter===2) {
        const th=b.seat+s.wheel;
        return {x:a.x+Math.cos(th)*.83*a.scale,y:c.bed+.08,z:a.z+Math.sin(th)*.83*a.scale};
      }
      return {x:a.x+b.u*a.scale,y:b.baseY,z:a.z+b.w*a.scale};
    }
    // Hand-laid pockets form an overlapping mound with visible individual rims.
    const seats=[
      [-.91,.13,0],[-.52,.54,0],[.09,.60,0],[.70,.43,0],[.98,-.04,0],[.65,-.46,0],
      [.03,-.52,0],[-.56,-.42,0],[-.30,.06,0],[.32,.04,0],
      [-.62,.01,.16],[-.16,.41,.16],[.46,.29,.16],[.56,-.19,.16],[.03,-.29,.16],
      [-.22,-.02,.32],[.23,.09,.32],[-.025,.13,.48]
    ];
    const order=[0,2,1,3,4,1,3,0,4,2,3,0,1,2,4,3,0,1];
    function loadChapter() {
      anchors();
      const c=chapters[s.chapter];
      s.bodies=[];s.fill=0;s.held=-1;s.target=null;s.wheel=0;s.omega=0;s.gate=0;
      s.pump.x=0;s.pump.v=0;s.wind=0;s.puff=0;s.wheelTouch=false;
      s.lid.x=2.86;s.lid.v=0;s.tag.x=.025;s.tag.v=0;s.rewardAge=0;s.lastNote=null;s.idle=0;s.vibrations.fill(0);
      s.facets.forEach(f=>{f.x=0;f.v=0;f.energy=0;});
      for(let i=0;i<c.count;i++) {
        const seat=seats[i], r=(s.chapter===0?.32:.25)+rng()*.066;
        const b={id:i,mat:order[(i+s.chapter*2)%order.length],variant:(i*7+s.chapter)%11,r,
          u:seat[0],w:seat[1],seat:Math.PI+(i+1)*TAU/c.count,baseY:c.bed+.075+seat[2],
          status:'ready',vx:0,vy:0,vz:0,tilt:.08+rng()*.22,roll:(rng()-.5)*.42,
          spin:rng()*TAU,twist:0,rock:0,lean:0,ring:0,flight:0,aero:0,silk:{x:0,v:0},slot:-1,hit:0};
        if(s.chapter===1) b.baseY=c.bed+.015;
        if(s.chapter===2) {b.r=.205+rng()*.018;b.tilt=.035;b.roll=0;}
        if(s.chapter===3) {b.u*=.78;b.w*=.78;b.baseY=.33+seat[2];}
        b.halfThickness=r*([.215,.125,.14,.19,.28][b.mat]*.5+.028);
        b.pitchV=0;if(i===c.count-1)b.rock=.42;Object.assign(b,home(b));s.bodies.push(b);
      }
    }
    loadChapter();
    function layout(p) {
      if(s.portrait===p) return;
      const oldJ=s.jar,oldT=s.tray;s.portrait=p;anchors();
      for(const b of s.bodies) {
        if(b.status==='ready') Object.assign(b,home(b));
        else if(['fall','rest'].includes(b.status)) {b.x+=s.jar.x-oldJ.x;b.z+=s.jar.z-oldJ.z;}
        else {b.x+=s.tray.x-oldT.x;b.z+=s.tray.z-oldT.z;}
      }
      if(s.held>=0) release(false);
    }
    function awake(){s.idle=0;s.hint.age=0;}
    function event(e){s.events.push(e);if(s.events.length>64)s.events.shift();}
    function pick(id) {
      const b=s.bodies[id];
      if(s.phase!=='play'||s.chapter!==0||s.held!==-1||!b||b.status!=='ready')return false;
      awake();s.held=id;b.status='held';s.target={x:b.x,y:b.y+.22,z:b.z};
      b.twist+=(rng()-.5)*.6;event({type:'lift',mat:b.mat});return true;
    }
    function aim(x,y,z){if(s.held>=0){awake();s.target={x,y,z};}}
    function fall(b) {
      b.status='fall';b.slot=s.bodies.filter(o=>o!==b&&o.slot>=0).length;
      // Two loose columns form in the concave base. Each disc leans back against
      // the preceding rim; the new support height comes from the actual radii.
      const c=chapters[s.chapter],m=materials[b.mat];
      const support=s.bodies.find(o=>o.slot===b.slot-2&&o.slot>=0);
      b.support=support?support.id:-1;
      b.settleX=(b.slot%2?1:-1)*c.r*.40;
      b.settleZ=(b.slot%2?-.12:.12)*c.r+.026*Math.sin(b.id*1.8);
      b.restAngle=[.157,.259,.323,.275][s.chapter]+.003*(m.friction-4)+.014*Math.abs(b.roll);
      const clearance=c.h-.042-(support?support.supportTop:c.base);
      b.restAngle=Math.min(b.restAngle,Math.asin(clamp((clearance-2*b.halfThickness-b.r*.046)/(2*b.r),0,.65)));
      b.restSpin=support?support.restSpin+Math.PI:b.spin;
      const rim=b.r*Math.sin(b.restAngle),thickness=b.halfThickness*Math.cos(b.restAngle);
      b.floor=(support?support.supportTop:c.base)+rim+thickness;
      b.supportTop=b.floor+rim+thickness+b.r*.046;
      b.vy=Math.min(b.vy,0); b.vx*=.22;b.vz*=.22;b.twist+=.7;
    }
    function release(inJar) {
      if(s.held<0)return;
      const b=s.bodies[s.held];s.held=-1;s.target=null;awake();
      if(inJar) {b.status='guide';b.flight=0;}
      else b.status='return';
    }
    function nextReady() {return s.bodies.find(b=>b.status==='ready');}
    function stream(b,kind) {
      b.status=kind;b.flight=0;b.aero=0;b.startX=b.x;b.startY=b.y;b.startZ=b.z;
      b.twist=(rng()-.5)*1.8;
    }
    function ripple(id,cell=9) {
      if(s.chapter!==1||s.phase!=='play')return false;
      const b=s.bodies[id]&&s.bodies[id].status==='ready'?s.bodies[id]:nextReady();
      if(!b)return false;
      awake();s.water[clamp(Math.floor(cell),0,18)].v+=.56;stream(b,'stream');event({type:'water',mat:b.mat});return true;
    }
    function crank(amount) {
      if(s.chapter!==2||s.phase!=='play'||!nextReady())return false;
      awake();s.omega=clamp(s.omega+Math.abs(amount),0,3.6);return true;
    }
    function blow(id) {
      if(s.chapter!==3||s.phase!=='play')return false;
      const b=s.bodies[id]&&s.bodies[id].status==='ready'?s.bodies[id]:nextReady();
      if(!b)return false;
      awake();s.pump.v-=2.75;s.puff=Math.min(2,s.puff+1);stream(b,'sail');event({type:'air',mat:b.mat});return true;
    }
    function tickAir(dt) {
      s.gust-=dt;
      if(s.gust<=0){s.gust=.55+rng()*1.5;s.airTarget=s.air.map((_,i)=>(rng()-.35)*(.44+.12*i));}
      for(let i=0;i<3;i++) s.air[i]+=(s.airTarget[i]-s.air[i])*dt*(.83+i*.19);
      s.leaves.forEach((leaf,i)=>{
        // Elastic petioles transmit only a fraction of their neighbor's deflection.
        const neighbor=i%3?s.leaves[i-1].x:0;
        spring(leaf,s.air[i%3]*leaf.load*.65+neighbor*.14,leaf.k,1.08+leaf.load,dt);
      });
      for(const [i,p] of s.dust.entries()){
        const a=s.air[i%3],lift=s.leaves[i%15].v;
        p.vx+=((a*.21-.024)-p.vx)*dt/p.mass;
        p.vy+=((lift*.13+.016-.009*p.mass)-p.vy)*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        // Returning convection near the boundary; no teleport at the edge.
        if(p.x>3.9)p.vx-=(p.x-3.9)*dt*.32;
        if(p.y>4.9)p.vy-=(p.y-4.9)*dt*.67;
      }
      const acc=s.water.map((w,i)=>{
        const l=s.water[Math.max(0,i-1)].x,r=s.water[Math.min(18,i+1)].x;
        const shore=i===0||i===18?1.5:1;
        return (l+r-2*w.x)*66-w.x*7.8-w.v*w.drag*shore+s.air[i%3]*.015*(.4+i/18);
      });
      s.water.forEach((w,i)=>{w.v+=acc[i]*dt;w.x+=w.v*dt;});
    }
    function impact(b,speed) {
      const m=materials[b.mat],c=chapters[s.chapter],level=clamp((b.floor-c.base-b.halfThickness)/(c.h-c.base),0,1);
      const load=s.fill/c.count;
      const note={type:'hit',id:b.id,mat:b.mat,hz:m.hz*(1+.72*level),decay:m.decay*(1-.21*level),
        cutoff:6900/(1+1.45*load),wallHz:[402,518,644,463][s.chapter]*(1+level*.24),wallDecay:[.45,.28,.72,.36][s.chapter]*(1-.33*level),bottomHz:[147,185,216,157][s.chapter]/(1+.31*load),bottomGain:.54/(1+2.6*load),
        speed,level,rebound:speed*m.bounce,time:s.time};
      s.contacts++;s.lastNote=note;b.hit++;b.ring=Math.min(1,b.ring+speed*.17);
      s.tag.v+=speed*.026*(b.slot%2?1:-1);b.rock+=speed*.24*(b.slot%2?1:-1);s.vibrations[b.slot%3]+=speed*.036;
      event(note);
    }
    function follow(b,t,k,d,dt) {
      for(const axis of ['x','y','z']) {
        const v='v'+axis;b[v]+=((t[axis]-b[axis])*k-d*b[v])*dt;
      }
      // A quick finger teleport still has to accelerate the pinched disc.
      const speed=Math.hypot(b.vx,b.vy,b.vz),limit=9.5;
      if(speed>limit){b.vx*=limit/speed;b.vy*=limit/speed;b.vz*=limit/speed;}
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
      if((b.status==='held'||b.status==='guide')&&b.y<chapters[s.chapter].h+.095){
        const dx=b.x-s.jar.x,dz=b.z-s.jar.z,radius=Math.hypot(dx,dz),wall=chapters[s.chapter].r+b.r*.90;
        if(radius>1e-5&&radius<wall){
          const nx=dx/radius,nz=dz/radius,inward=Math.min(0,b.vx*nx+b.vz*nz);
          b.x=s.jar.x+nx*wall;b.z=s.jar.z+nz*wall;b.vx-=nx*inward;b.vz-=nz*inward;
        }
      }
    }
    function advanceBody(b,dt) {
      const c=chapters[s.chapter],j=s.jar,h=home(b),m=materials[b.mat];
      if(s.chapter===3)spring(b.silk,b.status==='sail'?Math.min(1,b.aero*2):0,32,8.2,dt);
      b.ring*=Math.exp(-dt/m.decay);b.twist*=Math.exp(-dt*2.1);b.spin+=b.twist*dt;
      b.rock+=(-b.lean*36-b.rock*5)*dt;b.lean+=b.rock*dt;
      if(b.status==='ready'){
        if(s.chapter===1){const cell=s.water[(b.id*7)%19];h.y+=cell.x;b.lean=cell.v*.4;}
        Object.assign(b,h);return;
      }
      if(b.status==='held'){follow(b,s.target,125,20,dt);return;}
      if(b.status==='return'){
        follow(b,h,58,13,dt);
        if(Math.hypot(b.x-h.x,b.y-h.y,b.z-h.z)<.006&&Math.hypot(b.vx,b.vy,b.vz)<.045){b.status='ready';b.vx=b.vy=b.vz=0;}
        return;
      }
      if(['guide','stream','sail','chute'].includes(b.status)){
        const sailing=b.status==='sail', guided=b.status==='guide';
        b.flight+=dt;
        if(!guided){
          // Drag, buoyancy or a rail constrain the route until it ends over the neck.
          const drive=sailing?(.59+s.wind*.32+s.air[b.id%3]*.17):b.status==='stream'?(.80+Math.abs(s.water[(b.id*3)%19].v)*2):1.28;
          b.aero+=(drive-b.aero)*dt*(sailing?2.7:4.8);
          b.progress=clamp((b.progress||0)+b.aero*dt,0,1);
        }
        const q=guided?1:b.progress, arch=sailing?1.75:b.status==='stream'?.15:.08;
        const t={x:guided?j.x:b.startX+(j.x-b.startX)*q,
          y:guided?c.h+.38:b.startY+(c.h+.24-b.startY)*q+4*q*(1-q)*arch,
          z:guided?j.z:b.startZ+(j.z-b.startZ)*q};
        if(b.status==='stream'){
          const entry={x:s.tray.x-.88*s.tray.scale,z:s.tray.z},before=q<.47;
          const part=before?q/.47:(q-.47)/.53;
          t.x=before?b.startX+(entry.x-b.startX)*part:entry.x+(j.x-entry.x)*part;
          t.z=before?b.startZ+(entry.z-b.startZ)*part:entry.z+(j.z-entry.z)*part;
          t.y=before?c.bed+.065+Math.abs(s.water[b.id%19].x):c.bed+.065+(c.h+.24-c.bed-.065)*part;
        }
        follow(b,t,guided?88:62,guided?17:13.7,dt);
        if(q>=1&&Math.hypot(b.x-j.x,b.z-j.z)<.085&&Math.abs(b.y-t.y)<.09)fall(b);
        return;
      }
      if(b.status==='fall'||b.status==='rest'){
        b.pitchV+=((b.restAngle-b.tilt)*41-b.pitchV*(4.8+m.friction*.32))*dt;
        b.tilt+=b.pitchV*dt;b.roll*=Math.exp(-dt*m.friction);
        const gap=b.restSpin-b.spin;b.twist+=Math.atan2(Math.sin(gap),Math.cos(gap))*19*dt;
      }
      if(b.status==='fall'){
        b.vy-=18.5*dt;b.y+=b.vy*dt;
        const low=clamp((c.h+.1-b.y)/(c.h+.1-b.floor),0,1);
        for(const axis of ['x','z']){
          const off=axis==='x'?b.settleX:b.settleZ,v='v'+axis;
          b[v]+=((j[axis]+off*low-b[axis])*60-b[v]*m.friction*2.15)*dt;b[axis]+=b[v]*dt;
        }
        if(b.y<=b.floor&&b.vy<0){
          const speed=-b.vy;b.y=b.floor;
          if(speed>.36)impact(b,speed);
          b.vy=speed*m.bounce;
          if(b.vy<.26){b.status='rest';b.vy=0;s.fill++;b.rock+=b.vx*.12;}
        }
        return;
      }
      if(b.status==='rest') {
        follow(b,{x:j.x+b.settleX,y:b.floor,z:j.z+b.settleZ},39,11,dt);
      }
    }
    function tick(dt){
      s.time+=dt;s.idle+=dt;tickAir(dt);spring(s.tag,s.air[0]*.063,26,2.2,dt);
      if(s.phase==='play'&&s.idle>=4&&s.held<0){
        s.hint.age+=dt;if(s.hint.age>3.8){s.hint.age=0;s.hint.sequence++;}
      }else s.hint.age=0;
      s.vane.speed+=((s.wind*13+s.air[2]*.52)-1.65*s.vane.speed)*dt;
      s.vane.angle+=s.vane.speed*dt;
      s.puff*=Math.exp(-dt*2.8);s.wind+=(s.puff-s.wind)*dt*4;spring(s.pump,0,42,5.7,dt);
      if(s.pump.x<-.32){s.pump.x=-.32;s.pump.v=Math.max(0,-s.pump.v*.18);}
      s.omega*=Math.exp(-dt*1.15);if(s.omega<.003)s.omega=0;
      const prev=s.wheel;s.wheel+=s.omega*dt;
      if(s.chapter===2&&s.phase==='play') {
        // Each pocket releases at the left-hand chute, independent of frame rate.
        for(const b of s.bodies)if(b.status==='ready'&&
          Math.floor((b.seat+s.wheel-Math.PI)/TAU)>Math.floor((b.seat+prev-Math.PI)/TAU))stream(b,'chute');
      }
      s.bodies.forEach(b=>advanceBody(b,dt));
      for(let i=0;i<3;i++)s.vibrations[i]*=Math.exp(-dt*(2.7+i*.53));
      if(s.phase==='play'&&s.fill===s.bodies.length){s.phase='close';s.idle=0;}
      const closing=['close','prism','out'].includes(s.phase);
      spring(s.lid,closing?0:2.86,closing?12:19,closing?4.05:7,dt);
      if(s.lid.x<0){const impulse=-s.lid.v;s.lid.x=0;s.lid.v=impulse*.16;
        if(s.phase==='close'){s.phase='prism';s.tag.v+=impulse*.31;event({type:'latch'});s.facets.forEach((f,i)=>{f.v+=impulse*(.18+.39*(i%5));});}}
      if(closing&&s.lid.x<.0006&&Math.abs(s.lid.v)<.01){s.lid.x=0;s.lid.v=0;}
      spring(s.zoom,(s.phase==='close'||s.phase==='prism')?1:0,7,4.6,dt);
      if(s.phase==='prism'){s.rewardAge+=dt;if(s.rewardAge>5.8)s.phase='out';}
      s.facets.forEach((f,i)=>{
        const target=closing?(s.air[i%3]*.23+s.leaves[i%15].x*.16):0;
        spring(f,target,4.5+(i%5),1.2+(i%3)*.3,dt);
        const incidence=.51+.35*Math.cos(f.axis+f.x-s.leaves[i%15].x);
        const input=s.phase==='prism'?incidence*(.94+.06*Math.cos(i*.9)):0;
        f.energy+=(input-f.energy)*dt*(1.6+i%4*.48);
      });
      if(s.phase==='out'||s.phase==='in'){
        const destination=s.phase==='out'?s.serial+1:s.serial;
        s.trackSpeed+=((destination-s.travel)*5.8-s.trackSpeed*4.7)*dt;s.travel+=s.trackSpeed*dt;
        if(s.phase==='out'&&s.travel>s.serial+.53){s.serial++;s.chapter=s.serial%4;loadChapter();s.phase='in';}
        if(s.phase==='in'&&Math.abs(s.travel-s.serial)<.0008&&Math.abs(s.trackSpeed)<.004){
          s.travel=s.serial;s.trackSpeed=0;s.phase='play';s.idle=0;
        }
      }
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      const n=Math.ceil(dt*120);
      for(let i=0;i<n;i++)tick(dt/n);
    }
    function getState(){return JSON.parse(JSON.stringify(s,(k,v)=>k==='events'?undefined:v));}
    return {s,step,getState,layout,pick,aim,release,ripple,crank,blow,awake,nextReady,drain:()=>s.events.splice(0)};
  }
  const api={make,materials,chapters,random,clamp};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ButtonWorkshop=api;
})(typeof globalThis!=='undefined'?globalThis:this);
