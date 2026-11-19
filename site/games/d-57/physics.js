/* SI units: metres, seconds, newtons and radians. Heat is the local rise above ambient in degrees Celsius. Film, polish, gloss and lamp temperature are normalized fractions. */
(function (root) {
  'use strict';
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const mix=(a,b,f)=>a+(b-a)*f;
  function makeGame(seed=41291) {
    let randomState=seed>>>0;
    const random=()=>((randomState=(Math.imul(randomState,1664525)+1013904223)>>>0)/4294967296);
    const cells=Array.from({length:48},(_,i)=>({u:(i%12+.5)/12,v:(Math.floor(i/12)+.5)/4, film:0, heat:0, polish:0, gloss:.2}));
    const boards=Array.from({length:18},(_,i)=>({flex:0,velocity:0,stiffness:196+13*(i%5)}));
    const stones=Array.from({length:640},()=>{const x=(random()-.5)*3.5,z=-6.3-random()*8.4;
      return {x,z,ox:x,oz:z,y:0,vx:0,vz:0,vy:0,size:.016+random()*.041,angle:random()*6.28};});
    const dust=Array.from({length:68},()=>({x:(random()-.5)*5,y:.15+random()*3.3,z:3-random()*12,vx:(random()-.5)*.01,vy:0,phase:random()*6,diam:.0015+random()*.0035}));
    const water=Array.from({length:20*64},(_,i)=>({h:0,v:0,depth:.012+.009*Math.sin(i%20*.29+Math.floor(i/20)*.45)}));
    const lamps=Array.from({length:5},(_,i)=>({temp:.04,angle:.01*Math.sin(i+1),v:0,lit:false}));
    const cloth=Array.from({length:25},(_,i)=>({y:0,v:0,stiffness:92+(i%5)*5}));
    const clothCenter={x:-.69,y:.978,z:.55,vx:0,vy:0,vz:0};
    let clothTarget=null;
    const drops=Array.from({length:18},(_,i)=>({s:-i*.072,y:0,vy:0,offset:(random()-.5)*.16,drag:.77+random()*.37,serial:0}));
    const feet=[{x:-.19,z:-1.5,y:0,angle:0},{x:.19,z:-1.35,y:0,angle:0}];
    let stage=0,cycle=0,elapsed=0,idle=0,loaded=.8,contact=null,pending=null,force=0,speed=0,
      work=0,ready=false,readyAge=0,strokeX=.48,strokeV=.42,contactAge=0,clothLift=0,clothWet=.2,
      peak=.2,mean=.2,readyScore=0,turn=0,flight=null,landing=null,door=0,doorV=0,doorDemand=0,
      wind=.05,gust=.14,gustIn=1.2,flow=.06,sluice=.06,wheelOmega=0,wheelAngle=0,
      dropIn=1.4,dropCount=0,dip=0,dipV=0,lastMaterial='',returning=0,entry=1,steps=0,
      lastSlip=0,walkGloss=.2,lastTone=0,woodEnergy=0,swirl=0,swirlV=0;
    let bucketFill=.14,bucketAngle=0,bucketV=0,pour=0,tipping=false;
    let bucketTouches=0,waterTraces=0;
    let events=[];
    function emit(type,data={}){events.push({type,...data});if(events.length>80)events.shift();}
    function touch(){idle=0;}
    function brush(u,v,p=.5,point=null){if(stage!==0||returning)return;touch();u=clamp(u,0,1);v=clamp(v,0,1);
      const f=.5+2.5*clamp(p,0,1);
      if(!contact){contact={u,v,f};strokeX=u;strokeV=v;contactAge=0;}
      pending={u,v,f};clothTarget=point||{x:-.11+(u-.5)*1.85,y:1.20+.26*u,z:.20-.4*u+(v-.5)*.53};}
    function release(){contact=pending=clothTarget=null;}
    function moveCloth(p){contact=pending=null;clothTarget=p;touch();}
    function dipCream(){if(stage)return;touch();loaded=1;clothWet=Math.min(1,clothWet+.5);dipV=-.095;emit('dip');}
    function brushStep(dt){
      let du=0,dv=0;
      if(contact&&pending){
        const a=1-Math.exp(-26*dt);du=(pending.u-contact.u)*a;dv=(pending.v-contact.v)*a;
        contact.u+=du;contact.v+=dv;contact.f=pending.f;
        strokeX=contact.u;strokeV=contact.v;contactAge+=dt;
      }
      const targetSpeed=Math.min(2.7,Math.hypot(du*1.8,dv*.68)/dt);
      speed+=(targetSpeed-speed)*(1-Math.exp(-17*dt));
      force+=((contact?contact.f:0)-force)*(1-Math.exp(-18*dt));
      clothLift+=((clothTarget?1:0)-clothLift)*(1-Math.exp(-10*dt));
      // Only sliding contact lays down cream. Films level across adjacent cells after release.
      const oldFilm=cells.map(c=>c.film);
      let sum=0;peak=.2;
      cells.forEach((c,i)=>{
        const d=((c.u-strokeX)/.2)**2+((c.v-strokeV)/.38)**2;
        const load=contact?Math.exp(-d*1.7)*force*speed:0;
        const neighbors=[i%12?i-1:i,i%12<11?i+1:i,i>=12?i-12:i,i<36?i+12:i];
        const diffusion=neighbors.reduce((a,j)=>a+oldFilm[j]-oldFilm[i],0)*.17;
        c.film=clamp(c.film+dt*(load*(.42+loaded*.68)*(1-c.film)+diffusion-.026*c.film),0,1);
        c.heat+=dt*(2.4*load-.75*c.heat);
        c.polish=clamp(c.polish+dt*(load*(.45+c.film)*(.8+.12*c.heat)),0,1);
        c.gloss=.2+.6*c.polish;sum+=c.gloss;peak=Math.max(peak,c.gloss);
      });
      mean=sum/cells.length;work+=dt*(contact?force*speed:0);
      loaded=Math.max(.18,loaded-dt*speed*.014);clothWet=Math.max(.04,clothWet-dt*speed*.018);
      readyScore=Math.min(1,work/4.8,(peak-.2)/.59);
      if(!ready&&readyScore>=.999){ready=true;emit('shine');}
      if(ready)readyAge+=dt;
      // The cloth's centre follows the hand, coasts on release and settles on the work surface.
      const goal=clothTarget||{x:-.69,y:.978,z:.55};
      for(const axis of ['x','y','z']){const velocity='v'+axis;
        clothCenter[velocity]+=dt*((goal[axis]-clothCenter[axis])*105-clothCenter[velocity]*18.8);
        clothCenter[axis]+=dt*clothCenter[velocity];}
      cloth.forEach((c,i)=>{const edge=(i%5-2)*.5, row=(Math.floor(i/5)-2)*.5;
        const target=clothLift*(.024*edge*speed-.014*force*Math.exp(-2*(edge*edge+row*row)));
        c.v+=dt*((target-c.y)*c.stiffness-6.2*c.v);c.y+=dt*c.v;});
    }
    function startWalk(){if(stage||!ready||returning)return false;release();stage=1;entry=0;touch();walkGloss=mean;emit('walk');return true;}
    function footstep(x,z,p=.5){
      if(stage<1||flight||returning||entry<.65)return false;
      const f=feet[turn],midZ=(f.z+feet[1-turn].z)*.5;
      const targetZ=clamp(z,midZ-1.08,midZ+.04);
      flight={time:0,duration:.53+.16*Math.hypot(x-f.x,targetZ-f.z)+.07*(1-clamp(p,0,1)),sx:f.x,sz:f.z,
        x:clamp(x+(turn?.12:-.12),-1.06,1.06),z:targetZ,p:clamp(p,0,1),index:turn};
      touch();return true;
    }
    function disturbWater(x,z,strength){
      const gx=(x+2.3)/4.6*19,gz=(-z-14)/9.8*63;
      for(let j=Math.max(1,Math.floor(gz)-2);j<=Math.min(62,Math.ceil(gz)+2);j++)
        for(let i=Math.max(1,Math.floor(gx)-2);i<=Math.min(18,Math.ceil(gx)+2);i++){
          const dist=(i-gx)**2+(j-gz)**2;water[j*20+i].v+=strength*Math.exp(-dist*1.35);}
    }
    function gravelPush(x,z,strength,dx=0){
      let hits=0;stones.forEach(s=>{const a=s.x-x,b=s.z-z,d=Math.hypot(a,b);
        if(d>.48)return;const kick=(1-d/.48)*strength/(.7+s.size*9);
        s.vx+=kick*(a/(d+.03)+dx*.24);s.vz+=kick*b/(d+.03);s.vy+=kick*.5;hits++;});
      return hits;
    }
    function tipBucket(){if(stage!==2)return;touch();bucketTouches++;tipping=true;bucketV+=.48;sluice=clamp(sluice+.085,0,1);emit('pour',{strength:.4+bucketFill*.6});}
    function stir(x,z,dx){if(stage!==2&&stage!==3)return;touch();
      if(stage===2){const hits=gravelPush(x,z,Math.min(.48,Math.abs(dx)*3),Math.sign(dx));sluice=clamp(sluice+hits*.0008,0,1);if(hits)emit('grit',{strength:Math.min(1,hits/8)});}
      else {waterTraces++;disturbWater(x,z,Math.min(.095,Math.abs(dx)*.66));const idx=clamp(Math.floor((-z-14)/1.55),0,4);
        if(Math.abs(dx)>.035){lamps[idx].lit=true;lamps[idx].v+=clamp(dx,-.15,.15)*.16;emit('ripple',{tone:605+idx*103+Math.min(160,Math.abs(dx)*420)});}}

    }
    function land(f,impact){
      steps++;const gloss=walkGloss;
      const wetCell=water[clamp(Math.round((-f.z-14)/9.8*63),0,63)*20+clamp(Math.round((f.x+2.3)/4.6*19),0,19)];
      lastSlip=(.014+gloss*.046)*(stage===2?.44:1)+(stage===3?.021+wetCell.depth*1.25:0);
      const strength=.8+impact;
      let material=stage===1?'wood':stage===2?'gravel':'tile';
      let tone;
      if(stage===1){
        const idx=clamp(Math.floor((-f.z+.1)/.41),0,17);
        boards[idx].velocity-=strength*.085;woodEnergy+=strength;
        doorDemand=clamp((woodEnergy-1)*.24,0,1);tone=112+idx%5*19+gloss*24;
      }else if(stage===2){gravelPush(f.x,f.z,strength*.9);sluice=clamp(sluice+.11,0,1);tone=780+gloss*440;}
      else {disturbWater(f.x,f.z,.13*strength);const i=clamp(Math.floor((-f.z-14)/1.55),0,4);
        lamps[i].lit=true;lamps[i].v+=.11*(turn?1:-1);tone=1440+gloss*590+wetCell.depth*1200;}
      lastMaterial=material;lastTone=tone;emit('foot',{material,gloss,tone,strength,slip:lastSlip,room:stage===1?.43:stage===2?.075:.24,x:f.x});
      landing={index:turn,v:lastSlip*4};turn=1-turn;
    }
    function walkStep(dt){
      entry=Math.min(1,entry+dt*.8);
      if(flight){
        const q=flight,f=feet[q.index];q.time+=dt;const u=clamp(q.time/q.duration,0,1),s=u*u*(3-2*u);
        f.x=mix(q.sx,q.x,s);f.z=mix(q.sz,q.z,s);f.y=.18*4*u*(1-u);f.angle=.23*Math.sin(2*Math.PI*u);
        if(u===1){flight=null;land(f,q.p);}
      }
      if(landing){const l=landing;feet[l.index].z-=dt*l.v;l.v*=Math.exp(-4*dt);if(l.v<.0004)landing=null;}
      const z=(feet[0].z+feet[1].z)*.5;
      if(stage===1&&z< -6.4&&door>.75){stage=2;emit('garden');}
      if(stage===2&&z< -14.15&&wheelOmega>.2){stage=3;emit('alley');}
      if(stage===3&&z< -21.65&&!returning){lamps.forEach(l=>l.lit=true);returning=.0001;emit('home');}
      if(returning){returning+=dt;if(returning>=4.0)reset();}
    }
    function ambient(dt){
      gustIn-=dt;if(gustIn<=0){gust=(random()-.32)*.47;gustIn=.85+random()*2.4;}
      wind+=(gust-wind)*(1-Math.exp(-1.1*dt));
      dust.forEach((d,i)=>{d.vx+=dt*((wind*.20+.016*Math.sin(d.phase+d.y*2))-d.vx)*.9;
        d.vy+=dt*((.018*Math.sin(d.phase+d.x*1.5)+wind*.03)-d.vy);d.x+=dt*d.vx;d.y+=dt*d.vy;
        if(Math.abs(d.x)>2.7)d.vx-=Math.sign(d.x)*dt*.15;
        if(d.y<.1||d.y>3.6)d.vy+=Math.sign(1.8-d.y)*dt*.1;});
      boards.forEach(b=>{b.velocity+=dt*(-b.stiffness*b.flex-7*b.velocity);b.flex+=dt*b.velocity;});
      doorV+=dt*(7.4*(doorDemand-door)-4.1*doorV);door+=dt*doorV;
      stones.forEach(s=>{if(!s.vx&&!s.vz&&!s.vy&&!s.y)return;
        s.vy-=dt*4.8;s.y+=s.vy*dt;s.x+=s.vx*dt;s.z+=s.vz*dt;
        if(s.y<=0){s.y=0;s.vy=Math.abs(s.vy)*.22;if(s.vy<.035)s.vy=0;
          const friction=Math.exp(-dt*(14+s.size*80));s.vx*=friction;s.vz*=friction;
          if(Math.abs(s.vx)+Math.abs(s.vz)<.003)s.vx=s.vz=0;}
        s.angle+=dt*(s.vx+s.vz)/(s.size+.02);});
      flow+=dt*(sluice-flow)*.85;
      bucketFill=clamp(bucketFill+dt*((.022+flow*.13)*(1-bucketFill)-pour),0,1);
      if(bucketFill>.79)tipping=true;
      if(tipping&&bucketFill<.045)tipping=false;
      const torque=(tipping?1.16:bucketFill*.12)-bucketAngle;
      bucketV+=dt*(torque*9.6-bucketV*3.1);bucketAngle+=dt*bucketV;
      pour=Math.max(0,bucketAngle-.27)*bucketFill*2.65;
      for(const d of drops){
        d.s+=dt*(.15+flow*.72+pour*.45)*d.drag*(1-.16*Math.abs(d.offset)/.08);
        if(d.s>0){d.vy-=dt*2.8;d.y+=dt*d.vy;}
        if(d.y<-.39){d.s=-.26-random()*.94;d.y=d.vy=0;d.serial++;}
      }
      wheelOmega+=dt*((flow*.76+pour*.72+.04*wind)-(.25+.2*wheelOmega)*wheelOmega);
      wheelAngle+=dt*wheelOmega;
      // Damped shallow-water lattice with a sealed border. Droplets and soles add local impulses.
      dropIn-=dt;if(dropIn<=0){disturbWater((random()-.5)*3,-14.5-random()*7.5,.042);dropIn=.65+random()*1.1;dropCount++;}
      for(let i=21;i<water.length-21;i++){if(i%20===0||i%20===19)continue;const c=water[i];
        const lap=water[i-1].h+water[i+1].h+water[i-20].h+water[i+20].h-4*c.h;
        c.v+=dt*(lap*(135+c.depth*1400)-1.85*c.v);}
      for(const w of water)w.h+=dt*w.v;
      lamps.forEach((l,i)=>{l.temp+=dt*((l.lit?1:.04)-l.temp)*(l.lit?1.3:.75);
        l.v+=dt*(wind*.052*(1+i*.18)-l.angle*(4.3+i*.4)-.83*l.v);l.angle+=dt*l.v;});
      dipV+=dt*(-95*dip-5*dipV);dip+=dt*dipV;
      swirlV+=dt*(wind*.38-swirl*8.1-swirlV*1.6);swirl+=dt*swirlV;
    }
    function floorNote(x,z,p=.5){
      if(stage!==1||flight||returning)return;
      const i=clamp(Math.floor((-z+.1)/.41),0,17);boards[i].velocity-=(.35+p)*.075;
      emit('foot',{material:'wood',gloss:walkGloss,tone:126+(i%7)*24+x*6,strength:.5+p*.35,slip:.014+walkGloss*.046,room:.43,x});touch();
    }
    function ringLamp(index){if(stage!==3||!lamps[index])return;const l=lamps[index];l.lit=true;l.v+=.26*(index%2?1:-1);touch();emit('chime',{tone:659+index*109});}
    function reset(){
      stage=0;cycle++;work=0;ready=false;readyScore=readyAge=0;bucketTouches=waterTraces=0;peak=mean=.2;
      cells.forEach(c=>{c.film=c.polish=c.heat=0;c.gloss=.2;});feet.forEach((f,i)=>{f.x=i?.19:-.19;f.z=i?-1.35:-1.5;f.y=f.angle=0;});
      release();turn=0;landing=flight=null;walkGloss=.2;woodEnergy=0;doorDemand=0;sluice=.06;
      lamps.forEach(l=>l.lit=false);loaded=.8;returning=0;entry=0;idle=0;steps=0;emit('reset');
    }
    let carry=0;
    function step(dt){if(!Number.isFinite(dt)||dt<0)return;carry+=dt;const h=1/120;
      while(carry>=h-1e-12){carry-=h;elapsed+=h;idle+=h;ambient(h);if(stage===0)brushStep(h);walkStep(h);}
    }
    function state(){return {stage,cycle,elapsed,idle,loaded,force,speed,work,ready,readyAge,readyScore,strokeX,strokeV,clothLift,clothWet,
        peak,mean,turn,door,doorV,wind,flow,wheelOmega,wheelAngle,dip,dropCount,swirl,entry,returning,steps,lastMaterial,lastTone,lastSlip,walkGloss,contact:!!contact,flight:!!flight,
        cells,boards,stones,dust,water,cloth,lamps,feet,drops,clothCenter,bucketFill,bucketAngle,pour,bucketTouches,waterTraces};}
    return {step,getState:()=>JSON.parse(JSON.stringify(state())),read:state,brush,moveCloth,release,dipCream,startWalk,footstep,floorNote,tipBucket,ringLamp,stir,touch,drain:()=>events.splice(0)};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={makeGame};
  else root.ShoePhysics={makeGame};
})(globalThis);
