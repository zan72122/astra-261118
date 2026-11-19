/* All distances are metres unless a suffix indicates another unit. The integrator
   advances independently of drawing. Springs retain their velocity on release. */
(function (root) {
  'use strict';
  const clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
  const spring = (s,goal,k,d,h,force=0) => {
    s.v += ((goal-s.x)*k - d*s.v + force)*h;
    s.x += s.v*h;
  };
  const joint = (x=0) => ({x,v:0});
  function createGame(options={}) {
    let seed=options.seed??89417;
    const rand=() => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const thickness=options.thickness??[2.8,1.2,4.8,3.6];
    const books=thickness.map((cm,i)=>({
      cm,gapCm:(options.gapCm??[3.4,1.65,5.1,4.0])[i],p:0,v:0,target:0,latched:false,
      frictionN:0,peakN:0,toneHz:0,jacket:joint(),ripple:joint()
    }));
    const air=Array.from({length:9},(_,i)=>({u:.015*rand(),gust:.03*rand(),until:.07+i*.1}));
    const dust=Array.from({length:96},(_,i)=>({x:rand()*5-2.8,y:rand()*2.9+.12,z:rand()*4-1.1,
      vx:(rand()-.45)*.011,vy:rand()*.009,vz:rand()*.006,cell:i%9,weight:.65+rand()*.7}));
    const water=Array.from({length:49},()=>joint());
    const cups=[0,1,2].map(()=>({tilt:joint(),touched:false,jet:joint()}));
    const leaves=Array.from({length:12},()=>joint());
    const s={phase:'shelf',cycle:0,book:0,seconds:0,idle:0,held:false,books,air,dust,water,cups,leaves,
      nose:joint(),door:joint(),entry:joint(),casements:[joint(),joint()],view:joint(),deskView:joint(),
      coverOpen:joint(),page:joint(),pageGoal:0,turns:0,light:joint(.88),soundSpace:joint(1),hint:joint(),
      hintSweep:joint(),hintForward:true,wheel:{angle:0,v:0,wet:Array(10).fill(0)},sail:joint(),sailGoal:0,sluice:joint(),windowGoal:0,noseGoal:0,spout:joint(),gust:0,flow:0,settle:0,
      boat:{x:joint(-.11),z:joint(.10),roll:joint()}};
    let events=[],gravityTimer=0,waterIndex=0;
    const emit=(kind,params={})=>{if(events.length<80)events.push({kind,...params});};
    function phase(name){s.phase=name;s.idle=0;s.held=false;s.settle=0;s.hintForward=true;}
    function input(value,kind='move',index=0) {
      if(kind==='end'){s.held=false;s.idle=0;return;}
      s.idle=0;s.held=kind!=='tap';
      value=clamp(value);
      if(s.phase==='shelf'){
        const b=books[s.book];b.target=kind==='tap'?1:Math.max(b.target,value);
      }else if(s.phase==='push')s.noseGoal=Math.max(s.noseGoal,kind==='tap'?1:value);
      else if(s.phase==='window')s.windowGoal=Math.max(s.windowGoal,kind==='tap'?1:value);
      else if(s.phase==='water'){
        if(kind==='tap'||kind==='begin'){
          const i=clamp(index,0,2),c=cups[i];s.flow=i+1;c.touched=true;c.tilt.v+=1.25;c.jet.v+=1.25;
          const w=water[[17,36,25][i]];w.v+=.12;s.gust+=.14;
          s.boat.x.v+=(i-1)*.052;s.boat.z.v-=.025;
          emit('drop',{hz:440+i*94});
        } else {s.boat.x.v+=clamp(value-.5,-.5,.5)*.001;}
      }else if(s.phase==='sail'){s.sailGoal=Math.max(s.sailGoal,kind==='tap'?1:value);
      }else if(s.phase==='pages' && s.turns<3){
        s.pageGoal=s.turns+(kind==='tap'?1:value);
      }else if(s.phase==='ribbon'&&(kind==='tap'||value>.35))phase('return');
    }
    function tick(h) {
      s.seconds+=h;s.idle=s.held?0:s.idle+h;
      for(let i=0;i<air.length;i++){
        const a=air[i];a.until-=h;
        if(a.until<=0){a.until=.65+rand()*1.7;a.gust=(rand()-.36)*(.07+.055*s.casements[0].x);}
        a.u+=(a.gust+.24*(air[(i+8)%9].u-a.u)-a.u)*h*.96;
      }
      // Dust drifts in a bounded volume. Soft walls reverse the normal speed
      // continuously, so a particle never teleports to a new position.
      for(const p of dust){
        const u=air[p.cell].u, bound=(x,lo,hi)=>Math.max(lo-x,0)-Math.max(x-hi,0);
        p.vx+=(u*.44-p.vx+bound(p.x,-2.85,2.4)*2)*h;
        p.vy+=(.006*(p.weight-.87)+u*.16-p.vy+bound(p.y,.12,3.05)*2)*h;
        p.vz+=(u*.11-.004-p.vz+bound(p.z,-1.2,2.95)*2)*h;
        p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;
      }
      spring(s.light,.90+air[1].u*.89+air[5].u*.42,3.8,2.8,h);
      // Cover mass, clearance and the final lip determine the contact load.
      for(let i=0;i<books.length;i++){
        const b=books[i];
        if(s.phase==='return'&&s.door.x<.12&&(i===books.length-1||books[i+1].p<.48)){
          b.latched=false;b.target=0;
        }
        const mass=.12+.095*b.cm, clearance=Math.max(.035,b.gapCm-b.cm);
        const lip=clamp((b.p-.71)/.22),drag=lip*(.085*b.cm+.19/(clearance+.12));
        const load=drag*Math.min(1,Math.abs(b.v)*50);
        b.frictionN+=(load-b.frictionN)*(1-Math.exp(-h/.048));
        b.peakN=Math.max(b.peakN,b.frictionN);
        if(!b.latched){
          // Past the lip, the bevel pulls the last few millimetres home.
          const bevel=b.target>.995?.50*clamp((b.p-.90)/.045):0;
          const drive=(b.target-b.p)*7+bevel;
          const resist=Math.sign(b.v)*Math.min(Math.abs(drive)*.74,b.frictionN);
          b.v+=(drive-resist-(2*Math.sqrt(7*mass)+.75)*b.v)*h/mass;
          b.p=clamp(b.p+b.v*h);
          if(b.p>.994 && b.target>.995){
            b.latched=true;b.p=1;b.v=0;b.ripple.v+=.042*mass;
            b.toneHz=102-7*b.cm+3*clearance;emit('wood',{hz:b.toneHz,weight:mass,clearance});
            if(s.phase==='shelf'&&i===s.book){
              if(i===books.length-1)phase('push');else{s.book++;s.held=false;s.idle=0;}
            }
          }
        }
        spring(b.jacket,-.017*b.v,55,7,h);
        spring(b.ripple,0,115,6.5,h);
      }
      spring(s.nose,s.noseGoal*.083,33,10,h);
      if(s.phase==='push'&&s.nose.x>.081){emit('latch');phase('door');}
      const inner=['door','window','water','sail','pages','ribbon'].includes(s.phase);
      const exiting=s.phase==='return';
      spring(s.door,inner||(exiting&&s.entry.x>.07)?1.64:0,4.2,3.8,h);
      spring(s.entry,inner?clamp((s.door.x-.52)/.97):0,2.7,3.3,h);
      if(s.phase==='door'&&s.entry.x>.985)phase('window');
      for(let i=0;i<2;i++)spring(s.casements[i],s.windowGoal*(i?1.15:1.30),i?6:8,i?4.7:4.9,h,air[3+i].u*s.windowGoal*.18);
      if(s.phase==='window'&&s.casements[0].x>1.24){emit('breeze');phase('water');}
      spring(s.view,['water','sail','pages','ribbon'].includes(s.phase)?1:0,3.2,3.6,h);
      spring(s.deskView,['pages','ribbon'].includes(s.phase)?1:0,3.8,3.9,h);
      spring(s.soundSpace,1-.68*s.entry.x,4,4,h);
      // The fountain deposits individual drops. Four-neighbour wave coupling
      // carries their momentum outwards. The basin rim absorbs the waves.
      gravityTimer-=h;
      if(gravityTimer<0){gravityTimer=.19+rand()*.20;waterIndex=rand()<.72?24:23;water[waterIndex].v-=.046+rand()*.027;if(s.phase==='water')emit('drip',{hz:570+rand()*130});}
      const acc=water.map((q,i)=>{
        const x=i%7,z=Math.floor(i/7);
        const around=(x?water[i-1].x:0)+(x<6?water[i+1].x:0)+(z?water[i-7].x:0)+(z<6?water[i+7].x:0);
        return 34*(around-4*q.x)-q.x*3.8-q.v*(x===0||x===6||z===0||z===6?4.8:1.85);
      });
      water.forEach((q,i)=>{q.v+=acc[i]*h;q.x+=q.v*h;});
      cups.forEach((c,i)=>{spring(c.tilt,water[[17,36,25][i]].x*8,20,3.9,h);spring(c.jet,0,11,3.5,h);});
      s.gust*=Math.exp(-2*h);
      spring(s.spout,air[4].u*1.4+s.gust,18,3.8,h);
      // Water fills only the vanes under the jet. On the lower half-turn it
      // pours off. Gravity, flux, bearing drag and inertia govern the wheel.
      spring(s.sluice,s.flow?.38+s.flow*.16:.22,7,4.3,h);
      let torque=0;
      const wheel=s.wheel;
      wheel.wet.forEach((wet,i)=>{
        const angle=wheel.angle+i*Math.PI/5,x=Math.sin(angle),y=Math.cos(angle);
        const fill=clamp(1-Math.abs(x-.64)*4)*clamp(y*2);
        wet+=h*(fill*s.sluice.x*5*(1-wet)-wet*(y<0?2.7:.22));
        wheel.wet[i]=clamp(wet);torque+=wet*x*.91;
      });
      wheel.v+=(torque+s.sluice.x*.35-wheel.v*.95)*h;wheel.angle+=wheel.v*h;
      spring(s.sail,s.sailGoal,7.4,4.8,h);
      spring(s.boat.x,-.11+.42*s.sail.x+air[7].u+water[24].x*4,4.5,3.9,h);
      spring(s.boat.z,.1-.35*s.sail.x+water[30].x*3,4.1,3.7,h);
      spring(s.boat.roll,(water[29].x-water[31].x)*22+air[2].u,19,3.4,h);
      if(s.phase==='water'&&cups.every(c=>c.touched)){s.settle+=h;if(s.settle>1.3)phase('sail');}
      if(s.phase==='sail'&&s.boat.x.x>.278&&s.sail.x>.976){phase('pages');s.gust+=.35;emit('breeze');}
      const opened=['pages','ribbon'].includes(s.phase)||(exiting&&s.page.x>.08);
      const pressure=s.windowGoal*Math.max(0,air[6].u)*.85;
      spring(s.coverOpen,opened?Math.PI:pressure,6.9,5.2,h,opened?s.gust*.7:0);
      spring(s.page,s.pageGoal,[15,21,12,15][s.turns],7.2,h);
      for(let i=0;i<leaves.length;i++){
        const l=leaves[i],edge=(i+1)/leaves.length;
        const prev=i?leaves[i-1].x:0,wind=air[i%9].u*(.08+.44*s.windowGoal)+s.gust*edge;
        spring(l,prev*.58+edge*(wind+.20*s.page.v),35-i*.65,4.7+edge,h);
      }
      if(s.phase==='pages'&&s.pageGoal>=s.turns+.998&&s.page.x>s.turns+.989){
        s.turns++;s.held=false;s.idle=0;emit('paper',{gain:.48});
        if(s.turns===3)phase('ribbon');
      }
      if(exiting&&s.entry.x<.32){s.noseGoal=0;s.windowGoal=0;s.pageGoal=Math.max(0,s.pageGoal-h*.90);s.sailGoal=0;s.flow=0;}
      if(exiting&&s.entry.x<.012&&s.door.x<.025&&books.every(b=>b.p<.0004)){
        s.cycle++;s.book=0;s.noseGoal=0;s.windowGoal=0;s.pageGoal=0;s.turns=0;
        books.forEach(b=>{b.p=0;b.v=0;b.target=0;b.peakN=0;b.latched=false;});
        cups.forEach(c=>c.touched=false);phase('shelf');
      }
      const hintable=!['door','return'].includes(s.phase);
      spring(s.hint,s.idle>4&&hintable?1:0,25,10,h);
      // The demonstration has acceleration, contact and a release at each end.
      if(s.hint.x>.1){
        spring(s.hintSweep,s.hintForward?1.05:-.08,s.hintForward?3.6:7,3.7,h);
        if(s.hintSweep.x>1)s.hintForward=false;
        if(s.hintSweep.x<0)s.hintForward=true;
      }else spring(s.hintSweep,0,20,8,h);
    }
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;let left=dt;while(left>1e-9){const h=Math.min(1/120,left);tick(h);left-=h;}}
    return {step,input,state:s,getState:()=>JSON.parse(JSON.stringify(s)),events:()=>events.splice(0)};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={createGame};
  else root.LibraryPhysics={createGame};
})(globalThis);
