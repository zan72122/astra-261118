/* Lengths in model units (20 cm), time in seconds. One independent state per cell,
   spring, droplet, or wheel. The renderer only reads the simulation. */
(function (root) {
  'use strict';
  const nx=61, nz=43, width=10.8, depth=6.8, dx=width/(nx-1), dz=depth/(nz-1);
  const cx=-.42, cz=.12, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const xs=Array.from({length:nx},(_,i)=>i*dx-width/2);
  const zs=Array.from({length:nz},(_,j)=>j*dz-depth/2);
  function random(seed) {return ()=>{seed=(1664525*seed+1013904223)>>>0; return seed/4294967296;};}
  function slope(w) {
    return 34+19*Math.min(1,w/.37)-31*clamp((w-.59)/.36,0,1);
  }
  function spring(s,goal,k,drag,dt) {
    s.v+=((goal-s.p)*k-s.v*drag)*dt;
    s.p+=s.v*dt;
  }
  const stages=['pile','wet','dig','stream','bridge','drive','rain','river','drain'];
  function create(seed=7197) {
    const rng=random(seed), n=nx*nz;
    const field=()=>new Float64Array(n);
    const h=field(), water=field(), film=field(), loose=field(), bed=field(), soil=field(), repose=field();
    const offsets=field(), change=field(), cellDist=field(), channelDist=field();
    const s={stage:'pile',age:0,time:0,cycle:0,h,water,loose,bed,soil,
      pile:0,dug:0,bore:0,flow:0,rain:0,drained:0,runoff:0,slides:0,wetMean:0,
      stream:Array.from({length:32},()=>({depth:0,speed:0,load:0})),
      wind:[], toys:{}, plank:[],drop:[], dust:[], leaves:[], grains:[], meniscus:[],shovelReach:{p:0,v:0}, sound:{sand:0,water:0,metal:0,wood:0},
      car:{x:-1.37,v:0,wheel:0,bounce:{p:0,v:0},started:false},
      bridge:{p:0,v:0},lift:{p:0,v:0},canTilt:{p:0,v:0},scoop:{p:0,v:0},digStroke:0,
      reservoir:0,streamVolume:0,rideDistance:0,riverTime:0, rainDose:0, idle:0};
    const riverX=z=>cx+.24*Math.sin(z*1.65)*clamp((Math.abs(z)-.72)/1.35,0,1);
    for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){
      const k=j*nx+i,x=xs[i],z=zs[j],r=Math.hypot((x-cx)*.94,(z-cz)*1.12);
      offsets[k]=rng(); cellDist[k]=r; channelDist[k]=Math.abs(x-riverX(z));
      soil[k]=.14+.024*Math.sin(x*2.37+z*1.4)+.015*Math.cos(x*3.25-z*1.56)+rng()*.014;
      bed[k]=soil[k]-.15;
      h[k]=soil[k]+Math.max(0,1.12-r*.65)*(.98+.038*Math.sin(x*4+z*2))+.11*Math.exp(-((x+2.1)**2+(z+.4)**2)*1.7);
    }
    for(let i=0;i<12;i++) s.wind.push({p:(rng()-.5)*.026,v:0,force:(rng()-.42)*.07,life:rng(),k:2.4+rng()*3});
    for(const name of ['can','bucket','shovel','bridge','car']) s.toys[name]={p:0,v:0};
    for(let i=0;i<11;i++) s.plank.push({p:0,v:0});
    for(let i=0;i<36;i++) s.dust.push({x:(rng()-.5)*11,y:.38+rng()*3.5,z:(rng()-.5)*8,vx:0,vy:0,home:.35+rng()*3.2,branch:i%12});
    for(const p of s.dust){p.anchorX=p.x;p.home=p.y+.13*Math.sin(p.x+p.z);}
    for(let i=0;i<5;i++) s.leaves.push({u:0,v:0,side:(rng()-.5)*.48,angle:rng()*5,spin:0,active:false});
    for(let i=0;i<7;i++)s.meniscus.push({p:0,v:0});
    let layout={sx:1,sz:1,size:1,x:3.25,z:1.34};
    let input=null, carry=0, dropBudget=0, patBudget=0, digBudget=0, grainBudget=0;
    function sample(arr,x,z){
      const fx=clamp((x+width/2)/dx,0,nx-1.00001),fz=clamp((z+depth/2)/dz,0,nz-1.00001);
      const i=Math.floor(fx),j=Math.floor(fz),a=fx-i,b=fz-j,k=j*nx+i;
      return (arr[k]*(1-a)+arr[k+1]*a)*(1-b)+(arr[k+nx]*(1-a)+arr[k+nx+1]*a)*b;
    }
    function local(x,z,r,fn){
      for(let j=Math.max(0,Math.floor((z-r+depth/2)/dz)); j<=Math.min(nz-1,Math.ceil((z+r+depth/2)/dz));j++)
        for(let i=Math.max(0,Math.floor((x-r+width/2)/dx)); i<=Math.min(nx-1,Math.ceil((x+r+width/2)/dx));i++){
          const d=((xs[i]-x)**2+(zs[j]-z)**2)/(r*r);
          if(d<1) fn(j*nx+i,(1-d)**2);
        }
    }
    function wet(x,z,amount,r=.62){local(x,z,r,(k,w)=>{film[k]=Math.min(.85,film[k]+amount*w);});}
    function stage(name){s.stage=name;s.age=0;input=null;s.idle=0;}
    function act(kind,x=cx,z=cz){
      s.idle=0;
      if(kind in s.toys) s.toys[kind].v+=.12;
      const valid=(s.stage==='pile'&&(kind==='sand'||kind==='bucket'))||
        ((s.stage==='wet'||s.stage==='stream')&&kind==='can')||
        (s.stage==='dig'&&(kind==='shovel'||kind==='mouth'))||
        (s.stage==='bridge'&&kind==='bridge')||(s.stage==='drive'&&kind==='car')||
        (s.stage==='river'&&kind==='leaf');
      if(!valid) return false;
      if(kind==='sand'&&Math.hypot(x-cx,z-cz)>2.6) return false;
      input={kind,x,z,pulse:kind==='can'?.86:kind==='shovel'||kind==='mouth'?.68:.48}; 
      if(kind==='shovel'||kind==='mouth'){digBudget=Math.max(digBudget,.89);s.sound.metal=.9;}
      if(kind==='sand'||kind==='bucket') patBudget=Math.max(patBudget,.8);
      if(s.stage==='bridge') s.bridge.attached=true;
      if(s.stage==='drive'){s.car.started=true;s.car.v=Math.max(.12,s.car.v);}
      if(kind==='leaf') {const l=s.leaves.find(l=>l.active&&Math.abs(l.u-z)<.75);if(l){l.v+=.4;l.spin+=1.8;}}
      return true;
    }
    function release(){if(input){input.released=true;}}
    function move(x,z){
      if(!input)return;
      if(input.kind==='sand'&&Math.hypot(x-cx,z-cz)>2.6){release();return;}
      input.x=x;input.z=z;s.idle=0;
    }
    function wind(dt){
      for(const b of s.wind){
        b.life-=dt;if(b.life<=0){b.force=(rng()-.37)*.115;b.life=.4+rng()*2.3;}
        spring(b,b.force,b.k,2.15,dt);
      }
      for(const p of s.dust){
        const b=s.wind[p.branch];p.vx+=(b.p*.55-.48*p.vx-(p.x-p.anchorX)*.045)*dt;
        p.vy+=((p.home-p.y)*.4+b.v*.8-p.vy*.5)*dt;
        p.y+=p.vy*dt;p.x+=p.vx*dt;
      }
      for(const t of Object.values(s.toys)) spring(t,s.wind[2].p*.007,27,3.6,dt);
    }
    function grains(dt){
      const digging=s.stage==='dig',pressing=input&&(digging||s.stage==='pile');
      grainBudget+=dt*(pressing?(digging?45:62):s.sound.sand*10);
      while(grainBudget>=1&&s.grains.length<130){
        grainBudget--;
        const x=(digging?cx+.34:cx+(input?clamp(input.x-cx,-1.85,1.85)*.4:0))+(rng()-.5)*.57;
        const z=(digging?1.11:cz+(input?clamp(input.z-cz,-1.55,1.55)*.4:0))+(rng()-.5)*.48;
        const a=rng()*Math.PI*2,force=(.4+rng())*(1-.53*sample(water,x,z));
        s.grains.push({x,z,y:sample(h,x,z)+.018,vx:(Math.cos(a)+(digging?.92:0))*force,vy:(.34+rng())*force,vz:Math.sin(a)*force,r:.009+rng()*.014,life:0});
      }
      grainBudget=Math.min(1,grainBudget);
      for(let i=s.grains.length-1;i>=0;i--){
        const g=s.grains[i];g.life+=dt;g.vy-=7.9*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.z+=g.vz*dt;
        const surface=sample(h,g.x,g.z)+g.r*.4;
        if(g.y<=surface){g.y=surface;g.vy=Math.abs(g.vy)*.16;
          const wet=sample(water,g.x,g.z),drag=Math.exp(-dt*(3.7+wet*7));
          g.vx=(g.vx-dt*4*(sample(h,g.x+.04,g.z)-sample(h,g.x-.04,g.z))/.08)*drag;
          g.vz=(g.vz-dt*4*(sample(h,g.x,g.z+.04)-sample(h,g.x,g.z-.04))/.08)*drag;
          if(Math.hypot(g.vx,g.vz)<.085||g.life>1.8)s.grains.splice(i,1);
        }
      }
    }
    function sandStep(dt){
      change.fill(0); let slips=0,wSum=0,wCount=0;
      for(let k=0;k<n;k++){
        const absorb=Math.min(film[k],dt*(.11+.11*offsets[k])*(1-.68*water[k]));
        film[k]-=absorb;water[k]=Math.min(1,water[k]+absorb);
        repose[k]=Math.tan(slope(water[k])*Math.PI/180);
        if(cellDist[k]<.92){wSum+=water[k];wCount++;}
      }
      function pair(a,b,dist){
        let diff=h[a]-h[b]; if(diff<0){const tmp=a;a=b;b=tmp;diff=-diff;}
        const excess=diff-repose[a]*dist;
        if(excess>0){const q=Math.min((h[a]-bed[a])*.12,excess*3.9*dt);
          change[a]-=q;change[b]+=q;slips+=q;loose[b]+=q;}
      }
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
        const k=j*nx+i;
        if(i<nx-1)pair(k,k+1,dx);
        if(j<nz-1)pair(k,k+nx,dz);
        if(i<nx-1&&j<nz-1)pair(k,k+nx+1,Math.hypot(dx,dz));
        if(i>0&&j<nz-1)pair(k,k+nx-1,Math.hypot(dx,dz));
      }
      for(let k=0;k<n;k++){
        h[k]+=change[k];loose[k]*=Math.exp(-dt*3);
        water[k]=Math.max(0,water[k]-dt*(s.stage==='drain'?.095:.00043)*(.48+offsets[k]));
      }
      s.wetMean=wSum/wCount;s.slides+=slips*dx*dz;
      s.sound.sand=Math.max(s.sound.sand,Math.min(1,slips*.68));
    }
    function boreAt(z){
      // A rounded blind end advances from the near slope to the far slope.
      const tip=2.05-s.bore*4.4;
      return .52*clamp(s.bore*9,0,1)*Math.sqrt(clamp((z-tip)/.48,0,1));
    }
    function canPose(){
      const q=clamp(s.canTilt.p,0,1),blend=q*q*(3-2*q),{sx,sz,size}=layout;
      const pitch=.018*(1-blend),yaw=-.32*(1-blend),roll=.012+s.toys.can.p+q*.76;
      // The same rose outlet, in sand coordinates, drives the spout and its jets.
      const tx=(-1.615*Math.cos(roll)-1.358*Math.sin(roll))*size;
      const ty=(-1.615*Math.sin(roll)+1.358*Math.cos(roll))*size;
      const ax=tx*Math.cos(yaw),az=-tx*Math.sin(yaw);
      const ay=ty*Math.cos(pitch)-az*Math.sin(pitch),zz=ty*Math.sin(pitch)+az*Math.cos(pitch);
      const aiming=s.stage==='stream'||(s.bore>.95&&s.stage!=='dig'),targetZ=aiming?-1.56:cz-.08;
      const x=layout.x+(cx+.46-ax/sx-layout.x)*blend;
      const y=(1-blend)*(sample(h,layout.x,layout.z)-.035)+blend*(2.49-ay);
      const z=layout.z+(targetZ-zz/sz-layout.z)*blend;
      return {x,y,z,pitch,yaw,roll,tipX:x+ax/sx,tipY:y+ay,tipZ:z+zz/sz};
    }
    function liquid(dt){
      const pouring=(s.stage==='wet'||s.stage==='stream')&&input&&input.kind==='can';
      spring(s.canTilt,pouring?1:0,12,6,dt);
      const tilt=clamp(s.canTilt.p,0,1);
      if(tilt>.28){
        const pose=canPose(),intensity=(tilt-.28)*1.55;
        dropBudget+=dt*intensity*65;
        while(dropBudget>=1){dropBudget--;
          const a=rng()*Math.PI*2,rr=.18*Math.sqrt(rng()),spread=Math.sin(a)*rr;
          s.drop.push({x:pose.tipX,y:pose.tipY+Math.cos(a)*rr,z:pose.tipZ+spread/layout.sz,
            vx:-.88+(rng()-.5)*.62,vy:-.43+Math.cos(a)*.27,vz:spread*1.9+(rng()-.5)*.32,kind:0});
        }
        s.reservoir+=dt*intensity*(s.stage==='stream'?.5:.011);
      }
      if(s.rain>.01){
        dropBudget+=dt*s.rain*95;
        while(dropBudget>=1){dropBudget--;
          s.drop.push({x:(rng()-.5)*width,y:4+rng()*2.2,z:(rng()-.5)*depth,vx:-.28,vy:-3.6,vz:.15,kind:1});
        }
      }
      for(let i=s.drop.length-1;i>=0;i--){const p=s.drop[i];p.vy-=7.9*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        if(p.y<sample(h,p.x,p.z)){wet(p.x,p.z,p.kind?.084:.0052,p.kind?.57:.78);
          s.sound.water=Math.min(1,s.sound.water+(p.kind?.035:.14));
          if(p.kind)s.rainDose+=.001;
          s.drop.splice(i,1);
        }
      }
      if(s.bore>.94){
        const inflow=Math.min(s.reservoir,dt*.23)+dt*s.rain*.19;
        s.reservoir=Math.max(0,s.reservoir-Math.min(s.reservoir,dt*.23));
        s.stream[0].depth+=inflow; s.streamVolume+=inflow;
      }
      for(let i=0;i<s.stream.length;i++){
        const a=s.stream[i],next=s.stream[i+1],head=a.depth-(next?next.depth:0);
        const accel=(.48+head*18)*Math.min(1,a.depth*100);
        a.speed+=dt*(accel-a.speed*(1.15+Math.max(0,-head)*8));
        const out=Math.min(a.depth,Math.max(0,a.speed)*dt*a.depth*13);
        a.depth-=out;if(next)next.depth+=out;else s.runoff+=out;
        if(a.load>0&&out>0){
          const carried=Math.min(a.load,a.load*out/Math.max(.012,a.depth+out));
          a.load-=carried;if(next)next.load+=carried;
        }
        if(i===23)s.flow=out/dt;
        const zz=-2.55+i*.188;
        if(a.depth>.001)wet(riverX(zz),zz,dt*Math.min(.24,a.depth*.95),.43);
      }
    }
    function erosion(dt){
      const flood=s.stage==='rain'||s.stage==='river'||s.stage==='drain';
      if(!flood)return;
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
        const k=j*nx+i,a=s.stream[clamp(Math.round((zs[j]+2.55)/.188),0,31)];
        const wash=Math.max(0,water[k]-.53)*1.1+s.rain*.08;
        const trench=Math.exp(-(channelDist[k]**2)/.15);
        const target=soil[k]-.13*trench;
        if(h[k]>target){
          const loss=Math.min(h[k]-target,dt*(h[k]-target)*(wash+a.speed*trench*.24)*(s.stage==='drain'?Math.min(1,a.depth*12):1));
          h[k]-=loss;a.load+=loss*dx*dz;
        }
        if(a.load>0&&channelDist[k]>.43&&channelDist[k]<.69&&zs[j]>1.3){
          const deposit=Math.min(a.load,dt*.002);h[k]+=deposit;a.load-=deposit*dx*dz;
        }
        if(s.stage==='drain')h[k]+=(soil[k]-h[k])*dt*.27*(1-Math.min(.8,a.depth*6));
      }
    }
    function tick(dt){
      s.time+=dt;s.age+=dt;s.idle+=dt;
      for(const k of Object.keys(s.sound))s.sound[k]*=Math.exp(-dt*(k==='water'?5:9));
      if(input){input.pulse-=dt;if(input.released&&input.pulse<=0)input=null;}
      wind(dt);
      spring(s.shovelReach,s.stage==='dig'?1:0,12,6,dt);
      for(let i=0;i<7;i++){
        const a=i*Math.PI*2/7,edge=s.meniscus[i],adj=s.meniscus[(i+1)%7];
        spring(edge,.10*s.wind[i].p+Math.cos(a)*s.canTilt.v*.052+adj.p*.23,17+i*.7,2.6,dt);
      }
      if(s.stage==='pile'&&input){
        const x=clamp(input.x,cx-1.85,cx+1.85),z=clamp(input.z,cz-1.55,cz+1.55);
        // Sand is raked inward from a broad ring. Local pressure piles loose grains at the finger.
        const bx=cx+(x-cx)*.4,bz=cz+(z-cz)*.4,rate=.118+patBudget*.11;
        let removed=0,total=0;
        local(bx,bz,2.28,(k,w)=>{const rim=4*w*(1-w)**3;
          const q=Math.min(Math.max(0,h[k]-bed[k]-.014),dt*rate*.39*rim);
          removed+=q;h[k]-=q;});
        local(bx,bz,1.14,(k,w)=>{total+=w;});
        local(bx,bz,1.14,(k,w)=>{const q=removed*w/Math.max(1,total);h[k]+=q;loose[k]+=q;});
        s.pile+=removed*dx*dz;s.sound.sand=Math.max(s.sound.sand,.34+patBudget*.3);
        patBudget*=Math.exp(-dt*4);
        if(s.pile>(s.cycle?1.48:1.04))stage('wet');
      }
      liquid(dt);
      if(s.stage==='wet'&&s.wetMean>.315)stage('dig');
      if(s.stage==='dig'){
        if(input){s.digStroke+=dt*(1.9+digBudget);digBudget*=Math.exp(-dt*3.2);
          const contact=Math.max(0,Math.sin(s.digStroke*3.3));
          s.dug=Math.min(1,s.dug+dt*(.035+.036*contact)*(.73+Math.min(.65,s.wetMean)));
          s.sound.sand=Math.max(s.sound.sand,contact*.67);
          s.sound.metal=Math.max(s.sound.metal,Math.max(0,(contact-.88)*4));
          // Spoil lands beside the mouth and continues to slump after release.
          local(cx+.68,1.54,.65,(k,w)=>{h[k]+=dt*.016*contact*w;});
        }
        spring(s.scoop,input?Math.sin(s.digStroke*3.3):0,38,7,dt);
        s.bore+=(s.dug-s.bore)*Math.min(1,dt*8);
        if(s.bore>.991){stage('stream');s.reservoir+=.22;}
      }
      if(s.stage==='stream'&&s.streamVolume>2&&s.flow>.023)stage('bridge');
      spring(s.bridge,s.bridge.attached?1:0,2.9,3.15,dt);
      spring(s.lift,Math.sin(clamp(s.bridge.p,0,1)*Math.PI),14,6,dt);
      if(s.stage==='bridge'&&s.bridge.p>.994)stage('drive');
      if(s.stage==='drive'&&s.car.started){
        const c=s.car,remaining=Math.max(0,1.36-c.x);
        const targetSpeed=Math.min(.262,Math.sqrt(.46*remaining));
        c.v+=(targetSpeed-c.v)*dt*1.45;
        const advance=Math.min(remaining,dt*c.v);c.x+=advance;c.wheel+=advance/.142;
        s.rideDistance+=advance;
        if(advance>=remaining){c.v=0;stage('rain');}
      }
      for(let i=0;i<s.plank.length;i++){
        const boardX=(i-5)*.29;
        const load=.63*(Math.max(0,1-Math.abs(s.car.x-.277-boardX)/.34)+Math.max(0,1-Math.abs(s.car.x+.277-boardX)/.34));
        spring(s.plank[i],-.047*load,53,5.8,dt);
      }
      const onBoard=clamp(Math.round(s.car.x/.29+5),0,10);
      spring(s.car.bounce,s.plank[onBoard].p,48,5,dt);
      const targetRain=s.stage==='rain'?1:s.stage==='river'?.18:0;
      s.rain+=(targetRain-s.rain)*dt*(targetRain>s.rain?.28:.22);
      sandStep(dt);erosion(dt);grains(dt);
      if(s.stage==='rain'&&sample(h,cx,cz)<.245&&s.rainDose>1.45)stage('river');
      if(s.stage==='river'||s.stage==='drain'){
        if(s.stage==='river')s.riverTime+=dt;
        for(let i=0;i<5;i++){
          const l=s.leaves[i];if(!l.active&&(!i||(s.leaves[i-1].active&&s.leaves[i-1].u>-1.35))){l.active=true;l.u=-2.55;}
          if(!l.active)continue;
          if(l.u>=3.41){l.v=0;continue;}
          const a=s.stream[clamp(Math.round((l.u+2.55)/.188),0,31)];
          l.v+=dt*(a.speed*.74-l.v*.84);l.u+=dt*l.v;
          l.spin+=dt*(s.wind[i].v*1.8-l.spin*1.6);l.angle+=dt*(l.spin+l.v*l.side);
        }
        if(s.stage==='river'&&s.leaves[4].u>3.02)stage('drain');
      }
      if(s.stage==='drain'){
        s.bore=Math.max(0,s.bore-dt*.085);s.dug=s.bore;
        s.bridge.attached=false;s.car.started=false;
        s.car.v+=dt*((-1.37-s.car.x)*.39-s.car.v*1.3);s.car.x+=dt*s.car.v;s.car.wheel+=dt*s.car.v/.142;
        if(s.bore===0&&s.wetMean<.024&&s.flow<.002&&Math.abs(s.car.x+1.37)<.007){
          s.cycle++;s.car.v=0;s.pile=0;s.dug=0;s.bore=0;s.streamVolume=0;s.rainDose=0;s.riverTime=0;
          s.leaves.forEach(l=>{l.active=false;l.v=0;});stage('pile');
        }
      }
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<0)return;
      carry+=dt;
      while(carry>=1/60-1e-10){tick(1/60);carry-=1/60;}
    }
    function getState(){
      return JSON.parse(JSON.stringify({...s,h:Array.from(h),water:Array.from(water),loose:Array.from(loose),
        bed:undefined,soil:undefined,angle:slope(s.wetMean),peak:Math.max(...h)}));
    }
    return {s,step,getState,act,move,release,wet,sample,boreAt,riverX,canPose,setLayout(value){layout={...value};}};
  }
  const api={create,nx,nz,width,depth,dx,dz,cx,cz,xs,zs,random,slope,stages,clamp};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.SandPhysics=api;
})(globalThis);
