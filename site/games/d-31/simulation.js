/* Distances are metres, time is seconds. The integrator and its inputs do not use the DOM. */
(function (root) {
  'use strict';
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const smooth = n => { n=clamp(n,0,1); return n*n*(3-2*n); };
  const holes = [
    {x:0,z:0,length:9.1,feature:4.65},
    {x:7.9,z:-3.1,length:9.5,feature:5},
    {x:-6.9,z:-4.9,length:9.0,feature:4.5}
  ];
  const radius=.158, gravity=9.81, friction=.1;
  function laneX(h,s) {
    if(h===0) return -.34*smooth(s/3.7)+2.49*smooth((s-4.85)/4.15);
    if(h===1) return .7*smooth(s/3.7)-1.05*smooth((s-6)/3.5);
    return -.3*smooth(s/3)+1.42*smooth((s-3.55)/2.9);
  }
  function floor(h,s) {
    if(h===1) return .44+.61*(smooth((s-2.1)/2.8)-smooth((s-6.15)/2.7));
    if(h===2) return .44-.82*(smooth((s-3.35)/1.25)-smooth((s-5.25)/1.35));
    return .44;
  }
  function point(h,s,lateral=0) {
    const p=holes[h]; return {x:p.x+laneX(h,s)+lateral,y:floor(h,s),z:p.z+4.25-s};
  }
  function random(seed) {return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  function makeGame(seed=3867) {
    const rng=random(seed), list=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
    const ball={s:0,v:0,lateral:0,sideV:0,spin:0,drop:0,x:0,y:.44+radius,z:4.25};
    const S={hole:0,phase:'ready',round:0,age:0,charge:0,idle:0,phaseTime:0,
      lastForce:0,ball,completed:[false,false,false],events:[],eventId:0,tick:0,
      air:list(7,i=>({v:.34+.16*rng(),target:.3+.6*rng(),next:.12+i*.27})),
      rotor:{angle:.64,omega:.24,blades:list(4,()=>({bend:0,v:0}))},
      wood:list(15,()=>({bend:0,v:0})), water:list(36,i=>({height:.004*Math.sin(i*.8),v:0})),
      boughs:list(5,i=>({angle:0,v:0,cell:(2*i+1)%7})),
      reeds:list(30,i=>({bend:(rng()-.5)*.08,v:0,stiff:7+rng()*10,cell:i%7})),
      flags:list(3,i=>({lift:i===0?.76:.18,v:0,cloth:list(8,()=>({bend:0,v:0}))})),
      motes:list(30,i=>({x:rng()*27-12,y:.55+rng()*4,z:rng()*18-12,vx:.03+rng()*.05,vy:(rng()-.5)*.04,cell:i%7})),
      drops:list(70,i=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,wait:i*.034,jet:i%7,generation:0})),
      rampCatch:{s:2.08,load:0,v:0},hint:{depth:0,v:0,wait:0,active:false},pad:{travel:0,v:0},pump:0};
    let collisionLock=0,lastSlat=-1,entry=false,waterTimer=.2,gearIndex=0,remainder=0;
    function event(type,strength=1,part=0) {
      S.events.push({id:++S.eventId,type,strength,part,tick:S.tick});
      if(S.events.length>80) S.events.shift();
    }
    function spring(q,key,target,k,drag,d) {
      q.v+=((target-q[key])*k-q.v*drag)*d;
      q[key]+=q.v*d;
    }
    function press() {
      if(S.phase!=='ready') return false;
      S.phase='charge'; S.charge=0; S.idle=0; S.hint.active=false;
      event('touch',.2);return true;
    }
    function release() {
      if(S.phase!=='charge')return false;
      ball.v=.5+4.5*clamp(S.charge/1.55,0,1);S.lastForce=ball.v;
      S.phase='roll'; S.idle=0; event('putt',ball.v/5);return true;
    }
    function cancel(){if(S.phase==='charge'){S.phase='ready'; S.charge=0;S.idle=0;}}
    function environment(d) {
      spring(S.rampCatch,'load',0,95,8,d);
      if(S.hole!==1)S.rampCatch.s=Math.max(2.08,S.rampCatch.s-.46*d);
      for(const a of S.air) {
        a.next-=d;
        if(a.next<=0){a.target=.12+rng()*.97;a.next=.58+rng()*3.5;}
        a.v+=(a.target-a.v)*.87*d;
      }
      const r=S.rotor;
      r.omega+=(.63*S.air[2].v-.86*r.omega)*d; r.angle+=r.omega*d;
      const tooth=Math.floor(r.angle/.61);
      if(tooth!==gearIndex){gearIndex=tooth;event('axle',r.omega);}
      r.blades.forEach((b,i)=>spring(b,'bend',.045*S.air[i].v*Math.cos(r.angle+i*Math.PI/2),35,5.6,d));
      S.boughs.forEach((q,i)=>spring(q,'angle',(S.air[q.cell].v-.32)*(.055+i*.012),9+i,2.6,d));
      S.reeds.forEach(q=>spring(q,'bend',S.air[q.cell].v*.18,q.stiff,1.9,d));
      S.wood.forEach((q,i)=>{
        const near=(S.wood[i-1]?.bend||0)+(S.wood[i+1]?.bend||0);
        q.v+=(-215*q.bend-7.4*q.v+19*(near-2*q.bend))*d;
        q.bend+=q.v*d;
        if(Math.abs(q.v)+Math.abs(q.bend)<.000002){q.v=0;q.bend=0;}
      });
      waterTimer-=d;
      if(waterTimer<=0){S.water[Math.floor(rng()*36)].v+=.06+rng()*.085;waterTimer=.23+rng()*.58;}
      for(let i=0;i<36;i++) {
        const q=S.water[i],left=i%6?S.water[i-1].height:0,right=i%6<5?S.water[i+1].height:0;
        q.v+=(27*(left+right+(S.water[i-6]?.height||0)+(S.water[i+6]?.height||0)-4*q.height)-1.35*q.v+.18*S.air[i%7].v)*d;
      }
      for(const q of S.water)q.height+=q.v*d;
      S.flags.forEach((f,i)=>{
        spring(f,'lift',S.completed[i]?1:(i===S.hole?.76:.18),11,5.7,d);
        f.cloth.forEach((c,j)=>{
          const prev=j?f.cloth[j-1].bend:0;
          spring(c,'bend',prev*.59+(S.air[(j+i)%7].v-.45)*(.10+j*.013),34-j*1.3,2.35,d);
        });
      });
      for(const q of S.motes){
        q.vx+=((S.air[q.cell].v-.49)*.30-(q.x-(q.cell-3)*2.85)*.006-q.vx*.36)*d;
        q.vy+=((1.95-q.y)*.017+(S.air[(q.cell+2)%7].v-.55)*.09-q.vy*.7)*d;
        q.x+=q.vx*d;q.y+=q.vy*d;
      }
      S.pump+=((S.phase==='garden'?1:0)-S.pump)*1.4*d;
      for(const q of S.drops){
        if(q.life>0){
          q.vy-=gravity*d;q.x+=q.vx*d;q.y+=q.vy*d;q.z+=q.vz*d;q.life+=d;
          if(q.y<0){q.life=0;q.y=0;q.wait=.19+rng()*.53;S.water[q.jet*5].v+=.035;}
        }else if(S.pump>.14){
          q.wait-=d;
          if(q.wait<=0){
            const a=q.jet*2*Math.PI/7+(rng()-.5)*.18, speed=(.6+rng()*.48)*S.pump;
            q.generation++;q.x=.09*Math.cos(a);q.y=.01;q.z=.09*Math.sin(a);
            q.vx=Math.cos(a)*speed;q.vz=Math.sin(a)*speed;q.vy=(3.2+rng()*2.4)*Math.sqrt(S.pump);q.life=d;
          }
        }
      }
      spring(S.pad,'travel',S.phase==='charge'?.012+.045*clamp(S.charge/1.55,0,1):0,100,12,d);
      const hint=S.hint;
      if(S.phase==='ready'&&S.idle>=4){
        hint.active=true;hint.wait+=d;
        if(hint.wait>3.1){hint.wait=0;}
      } else {hint.active=false;hint.wait=0;}
      spring(hint,'depth',hint.active&&hint.wait>.42&&hint.wait<1.66?1:0,35,9,d);
    }
    function rolling(d){
      const h=S.hole,b=ball,old=b.s;
      const grade=(floor(h,b.s+.005)-floor(h,b.s-.005))/.01;
      const turn=(laneX(h,b.s+.005)-laneX(h,b.s-.005))/.01;
      const length=Math.sqrt(1+turn*turn+grade*grade);
      const g=-gravity*grade/length, sign=Math.sign(b.v||g);
      const trial=b.v+(g-sign*friction*gravity/Math.sqrt(1+grade*grade))*d;
      b.v=(trial*sign<0&&Math.abs(g)<=friction*gravity)?0:trial;
      b.s=Math.max(0,b.s+b.v*d/length);
      // The uphill follower has a one-way clutch. It stops a slow return at the last
      // reached position; each new putt can lift it farther up the plank.
      if(h===1&&b.s>=2.08&&b.s<=4.94){
        S.rampCatch.s=Math.max(S.rampCatch.s,b.s-.006);
        if(b.v<=0&&b.s<=S.rampCatch.s+.001){
          b.s=S.rampCatch.s;b.v=0;S.rampCatch.v+=.08;S.phase='ready';S.charge=0;S.idle=0;
        }
      }
      if(b.s===0&&b.v<0)b.v=0;
      b.sideV+=(-4.3*b.lateral-2*b.sideV)*d;b.lateral+=b.sideV*d;
      if(Math.abs(b.lateral)>.82){b.lateral=Math.sign(b.lateral)*.82;b.sideV*=-.45;event('rail',.3);}
      b.spin+=b.v*d/radius;
      collisionLock=Math.max(0,collisionLock-d);
      if(h===0&&Math.abs(b.s-3.51)<.19&&!collisionLock){
        for(let i=0;i<4;i++){
          const a=S.rotor.angle+i*Math.PI/2,ux=-Math.sin(a),uy=Math.cos(a);
          const x=b.lateral, y=floor(0,b.s)+radius-2.96,rad=x*ux+y*uy;
          if(rad>.7&&rad<2.52&&Math.abs(x*uy-y*ux)<.27){
            b.sideV+=(uy<0?1:-1)*(.77+S.rotor.omega*.8);
            b.v*=.74; S.rotor.blades[i].v+=.36;S.rotor.omega*=.91;collisionLock=.85;
            event('sail',Math.abs(b.v)/5+.12,i);break;
          }
        }
      }
      if(h===0&&b.s>3.80&&b.s<6.37){
        const drive=.82+S.rotor.omega*.63;
        b.v+=Math.max(0,drive-b.v)*8*d;
      }
      if(h===1&&b.s>=4&&b.s<6.55){
        const i=Math.min(14,Math.floor((b.s-4)/.17));
        if(i!==lastSlat){S.wood[i].v-=.06+.037*Math.abs(b.v);S.water[i+6].v+=.035;
          event('bridge',.18+Math.abs(b.v)*.14,i);lastSlat=i;}
      }else lastSlat=-1;
      if(h===2){
        if(old<3.52&&b.s>=3.52){entry=true;event('inside',.65);}
        // A gravity-fed return and a concealed sprung lip carry even a soft putt through the pipe.
        if(entry&&b.s>=3.52&&b.s<6.75)b.v+=Math.max(0,3.1-b.v)*7*d;
        if(entry&&b.s>=6.58){entry=false;event('emerge',.8);}
      }
      if(b.s>=holes[h].length){
        b.s=holes[h].length;b.v=0;b.sideV=0;S.phase='cup';S.phaseTime=0;S.completed[h]=true;event('cup',1,h);
      }else if(Math.abs(b.v)<.009&&Math.abs(g)<friction*gravity&&Math.abs(b.sideV)<.025){
        b.v=0;S.phase='ready';S.charge=0;S.idle=0;
      }
    }
    function returnTime(){
      const from=point(S.hole,holes[S.hole].length),to=point((S.hole+1)%3,0);
      return Math.max(2.5,Math.hypot(to.x-from.x,to.z-from.z)/3.2);
    }
    function setBall(){
      const b=ball,p=point(S.hole,b.s,b.lateral);
      b.x=p.x;b.y=p.y+radius-b.drop-S.pad.travel;b.z=p.z;
      if(S.phase==='travel'){
        const dest=point((S.hole+1)%3,0),u=smooth(S.phaseTime/returnTime());
        b.x+=(dest.x-b.x)*u;b.z+=(dest.z-b.z)*u;
        b.y+=(dest.y-p.y)*u-.32*Math.sin(Math.PI*u);
      }
      if(S.hole===1&&b.s>=4&&b.s<6.55)b.y+=S.wood[Math.min(14,Math.floor((b.s-4)/.17))].bend;
    }
    function advance(d){
      S.age+=d;S.tick++;S.phaseTime+=d;
      if(S.phase==='ready')S.idle+=d;
      if(S.phase==='charge')S.charge=Math.min(2.2,S.charge+d);
      environment(d);
      if(S.phase==='roll')rolling(d);
      if(S.phase==='cup'){
        ball.drop=Math.min(.52,ball.drop+(.18+2.2*S.phaseTime)*d);
        ball.lateral*=Math.exp(-10*d);
        if(S.phaseTime>2.8){S.phase=S.hole===2?'garden':'travel';S.phaseTime=0;if(S.phase==='garden')event('fountain',1);}
      }else if(S.phase==='garden'&&S.phaseTime>10.2){
        S.phase='travel';S.phaseTime=0;
      }
      if(S.phase==='travel'&&S.phaseTime>=returnTime()){
        S.hole=(S.hole+1)%3;if(S.hole===0){S.round++;S.completed.fill(false);}
        Object.assign(ball,{s:0,v:0,lateral:0,sideV:0,drop:.52,spin:0});
        S.phase='arrive';S.phaseTime=0;S.charge=0;S.idle=0;collisionLock=0;lastSlat=-1;entry=false;
        event('arrive',1,S.hole);
      }else if(S.phase==='arrive'){
        ball.drop=Math.max(0,ball.drop-d*.72);
        if(S.phaseTime>2.5){S.phase='ready';S.phaseTime=0;}
      }
      setBall();
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<0)throw new RangeError('dt must be finite and nonnegative');
      remainder+=dt;
      const count=Math.floor((remainder+1e-10)*120);
      for(let i=0;i<count;i++)advance(1/120);
      remainder-=count/120;
    }
    function getState(){return JSON.parse(JSON.stringify(S));}
    return {state:S,step,getState,press,release,cancel};
  }
  const api={makeGame,point,floor,laneX,holes,radius,random,smooth};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.GardenGolf=api;
})(globalThis);
