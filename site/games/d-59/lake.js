/* All distances are metres, time is seconds. Rendering only reads this model. */
(function (root) {
  'use strict';
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  function random(seed) { return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;}; }
  const G=9.81, H=1/120, NX=39, NZ=45, CELL=.65, X0=-12.35, Z0=-25.4;
  const stones=[[-.25,.26,-1.38],[.74,.20,-1.94],[-1.10,.16,-1.94]];
  const steps=[[.23,-8.8],[.99,-10.65],[.32,-12.42],[1.06,-14.46],[1.75,-16.35],[1.53,-18.25]];
  const tree=[2.25,-21.5];
  function make(seed=173) {
    const rng=random(seed);
    const h=new Float64Array(NX*NZ), vel=new Float64Array(h.length), wet=steps.map(()=>1);
    const reeds=Array.from({length:44},(_,i)=>({x:(rng()-.5)*15,z:2-rng()*24,bend:(rng()-.5)*.03,v:0,k:9+rng()*8}));
    const beds=random(3917);
    reeds.forEach((r,k)=>{const side=k%2?1:-1,inlet=k>27;
      r.x=inlet?side*(2.4+beds()*1.6)+1:side*(1.28+beds()*2.65);
      r.z=inlet?-12-beds()*10:-2.56+beds()*2.3;
    });
    const motes=Array.from({length:40},()=>({x:(rng()-.5)*12,y:.25+rng()*2.8,z:2-rng()*24,vx:0,vy:0,vz:0}));
    motes.forEach(p=>{p.homeX=p.x;p.homeY=p.y;p.homeZ=p.z;});
    const lilies=steps.flatMap(([x,z],i)=>Array.from({length:5},(_,j)=>{
      const a=j*2.4+i,l=.18+(j%3)*.12;
      return {i,j,a,l,x:x+Math.cos(a)*l,z:z+Math.sin(a)*l,vx:0,vz:0,tilt:0,vt:0};
    }));
    const pebbles=stones.map(()=>({angle:0,v:0}));
    const gusts=Array.from({length:8},()=>({x:(rng()-.5)*16,z:-rng()*22,force:(rng()-.4)*.4,target:(rng()-.4)*.5,remaining:.1+rng()*2}));
    let id=0, acc=0, leg=0, hold=0, endPhase='', sinkAge=0;
    const s={time:0,stage:0,cycle:0,mode:'ready',stoneIndex:0,idle:0,flight:null,rings:[],bubbles:[],drops:[],events:[],front:null,
      leaf:{id:0,x:.3,y:.035,z:-7.4,vx:0,vy:0,vz:0,roll:0,omega:0,heading:-.3,pushX:0,pushZ:0},
      wet,lilies,pebbles,reeds,motes,gusts,h,vel,stepIndex:0,travel:0,opened:0,landing:0,focus:1,focusV:0,charge:0,
      camera:{x:0,y:2.16,z:5.8,vx:0,vy:0,vz:0,lx:0,ly:.65,lz:-11.9,lvx:0,lvy:0,lvz:0},aspect:1.4};
    for(let j=0;j<NZ;j++) for(let i=0;i<NX;i++) h[j*NX+i]=.0017*Math.sin(i*.52+j*.31)+.0012*Math.cos(j*.59-i*.17);
    function sample(x,z,field=h) {
      const gx=clamp((x-X0)/CELL,0,NX-1.00001), gz=clamp((z-Z0)/CELL,0,NZ-1.00001);
      const i=Math.floor(gx),j=Math.floor(gz),a=gx-i,b=gz-j,n=j*NX+i;
      return (field[n]*(1-a)+field[n+1]*a)*(1-b)+(field[n+NX]*(1-a)+field[n+NX+1]*a)*b;
    }
    function kick(x,z,impulse) {
      const i=clamp(Math.round((x-X0)/CELL),1,NX-2),j=clamp(Math.round((z-Z0)/CELL),1,NZ-2);
      vel[j*NX+i]+=impulse;
    }
    function wind(x,z) {
      let f=.055;
      for(const g of gusts) f+=g.force/(1+.075*((x-g.x)**2+(z-g.z)**2));
      return f;
    }
    function event(type,data={}) {
      s.events.push({id:++id,time:s.time,type,...data});
      if(s.events.length>200) s.events.shift();
    }
    function waterAir(dt) {
      for(const g of gusts) {
        g.remaining-=dt;
        if(g.remaining<=0){g.remaining=.8+rng()*3.5;g.target=(rng()-.36)*.8;}
        g.force+=(g.target-g.force)*dt*.85;
        kick(g.x,g.z,g.force*dt*.16);
      }
      // Finite lake patches exchange momentum with four neighbours. Banks absorb it.
      for(let j=1;j<NZ-1;j++)for(let i=1;i<NX-1;i++){
        const n=j*NX+i, x=X0+CELL*i,z=Z0+CELL*j;
        const c=z < -8 && x>-.65 ? .54 : 1.24;
        const lap=(h[n-1]+h[n+1]+h[n-NX]+h[n+NX]-4*h[n])/(CELL*CELL);
        vel[n]+=(c*c*lap-.42*vel[n])*dt;
      }
      for(let i=0;i<h.length;i++) h[i]+=vel[i]*dt;
      for(const r of reeds) {
        r.v+=(wind(r.x,r.z)*1.9+sample(r.x,r.z,vel)*2-r.k*r.bend-2.25*r.v)*dt;
        r.bend+=r.v*dt;
      }
      for(const p of motes) {
        const w=wind(p.x,p.z), v=sample(p.x,p.z,vel);
        p.vx+=(w+.035*(p.homeX-p.x)-1.15*p.vx)*dt;
        p.vy+=(.13*w+v*.9+.027*(p.homeY-p.y)-.65*p.vy)*dt;
        p.vz+=(w*.28+.017*(p.homeZ-p.z)-.95*p.vz)*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      }
    }
    function ring(x,z,speed,slow=false) {
      const r={id:++id,x,z,r:.018,limit:speed*.40,v:slow?.54:1.24,energy:Math.min(.9,.16+speed*.115),age:0,slow};
      s.rings.push(r);kick(x,z,Math.min(.38,speed*.065));return r;
    }
    function spray(f,speed) {
      for(let i=0;i<Math.min(10,3+speed);i++){
        const a=rng()*6.283,q=(.17+rng()*.64)*speed*.22;
        s.drops.push({id:++id,x:f.x,y:f.y+.012,z:f.z,vx:Math.cos(a)*q,vy:.36+rng()*speed*.27,vz:Math.sin(a)*q,r:.009+rng()*.012});
      }
    }
    function throwStone(speed,angle,yaw=0) {
      if(s.stage>1 || s.mode!=='ready')return false;
      speed=clamp(speed,2,8);angle=clamp(angle,5,20);
      const a=angle*Math.PI/180,p=stones[s.stoneIndex], vy=speed*Math.sin(a);
      const launchY=p[1]+s.charge*.105, base=sample(p[0],p[2])+.019;
      s.flight={id:++id,x:p[0],y:launchY,z:p[2],vx:speed*Math.cos(a)*Math.sin(yaw),vy,vz:-speed*Math.cos(a)*Math.cos(yaw),
        apex:launchY-base+vy*vy/(2*G),spin:0,omega:speed*3,contacts:0,sinking:false};
      s.mode='flight';s.charge=0;s.idle=0;event('throw',{speed,angle});return true;
    }
    function fly(dt) {
      const f=s.flight;if(!f)return;
      if(f.sinking){
        f.vy+=(-.68-f.vy*3.5)*dt;f.vx*=Math.exp(-3*dt);f.vz*=Math.exp(-3*dt);
        sinkAge+=dt;
      }else {f.y+=.5*G*dt*dt;f.vy-=G*dt;}
      f.x+=f.vx*dt;f.z+=f.vz*dt;f.y+=f.vy*dt;f.spin+=f.omega*dt;
      const level=sample(f.x,f.z);
      if(!f.sinking && f.vy<0 && f.y<=level+.019) {
        f.y=level+.019;
        const incoming=Math.hypot(f.vx,f.vy,f.vz),outgoing=incoming*.72,oldApex=f.apex, nextApex=oldApex*.55;
        const vertical=Math.sqrt(2*G*nextApex), horizontal=Math.sqrt(Math.max(0,outgoing*outgoing-vertical*vertical));
        f.contacts++;const ripple=ring(f.x,f.z,incoming);spray(f,incoming);
        const stop=f.contacts>=(s.stage===0?2:6)||outgoing<1.48||vertical>=outgoing||nextApex<.018;
        event('impact',{x:f.x,z:f.z,incoming,outgoing,oldApex,nextApex,limit:ripple.limit,stop});
        if(stop){
          f.sinking=true;f.vy=-.19;f.vx*=.18;f.vz*=.18;sinkAge=0;event('sink');
          for(let i=0;i<7;i++)s.bubbles.push({id:++id,x:f.x+(rng()-.5)*.2,z:f.z+(rng()-.5)*.2,y:-.045-rng()*.24,v:.035+rng()*.055,r:.015+rng()*.024,film:1});
          if(s.stage===1){s.front={x:f.x,z:f.z,r:0,v:.92,goal:Math.hypot(f.x-.4,f.z+18.25),power:1};}
        }else {
          const normalTilt=(sample(f.x+.13,f.z)-sample(f.x-.13,f.z))/.26;
          const turn=clamp(normalTilt*.42+wind(f.x,f.z)*.003,-.06,.06),yaw=Math.atan2(f.vx,-f.vz)+turn;
          f.vx=Math.sin(yaw)*horizontal;f.vz=-Math.cos(yaw)*horizontal;f.vy=vertical;f.apex=nextApex;f.omega*=.72;event('rebound',{speed:Math.hypot(f.vx,f.vy,f.vz),height:f.vy*f.vy/(2*G),incoming,oldApex});}
      }
      if(f.sinking && sinkAge>2.4){s.flight=null;if(s.stage===0){s.stage=1;s.mode='ready';s.stoneIndex=(s.cycle+1)%3;s.idle=0;}else s.mode='wave';}
    }
    function waterTraces(dt) {
      for(const r of s.rings){r.age+=dt;r.r=Math.min(r.limit,r.r+r.v*dt);r.energy*=Math.exp(-dt*(r.r>=r.limit?2.9:.67));}
      s.rings=s.rings.filter(r=>r.energy>.008);
      for(const p of s.drops){p.vy-=G*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;if(p.y<=0)kick(p.x,p.z,.008);}
      s.drops=s.drops.filter(p=>p.y>0);
      for(const b of s.bubbles){const top=sample(b.x,b.z);b.v+=(.145-b.v)*dt*2.4;b.y=Math.min(top+b.r*.48,b.y+b.v*dt);b.x+=wind(b.x,b.z)*dt*.12;if(b.y>=top)b.film-=dt*1.8;}
      s.bubbles=s.bubbles.filter(b=>b.film>0);
      if(s.front){
        s.front.r+=s.front.v*dt;
        if(s.front.r>=s.front.goal && s.stage===1){
          resetLeaf();s.stage=2;s.mode='leaf';s.idle=0;event('inlet',{radius:s.front.r});kick(.4,-18.25,.19);
        }
        if(s.stage>=2)s.front.power*=Math.exp(-dt*.8);
        if(s.front.power<.008)s.front=null;
      }
    }
    function tapLeaf(dx=0) {
      if(s.mode!=='leaf' && s.mode!=='drift' && s.mode!=='shade' && s.mode!=='return')return false;
      s.idle=0;
      if(s.mode==='return'){s.leaf.vx+=clamp(dx,-1,1)*.49;s.leaf.vz+=.12;ring(s.leaf.x,s.leaf.z,1.62,true);event('leaf');return true;}
      if(s.mode==='shade'){s.mode='fall';endPhase='fall';s.leaf.vy=-.12;event('leaf');return true;}
      s.mode='drift';s.leaf.vx+=clamp(dx,-1,1)*.28;s.leaf.vz-=.22;
      ring(s.leaf.x,s.leaf.z,2.1,true);event('leaf');return true;
    }
    function foot() {
      if(s.mode!=='cross')return false;
      s.mode='walking';s.landing=0;s.idle=0;leg=0;
      const p=steps[s.stepIndex];ring(p[0],p[1],2.6,true);event('step');return true;
    }
    function progress(dt) {
      const l=s.leaf;
      if(s.mode==='drift'||s.mode==='return'){
        l.vx+=l.pushX*dt;l.vz+=l.pushZ*dt;
        l.pushX*=Math.exp(-dt*2.4);l.pushZ*=Math.exp(-dt*2.4);
      }
      if(s.mode==='leaf'||s.mode==='drift'){
        const w=wind(l.x,l.z),tow=s.mode==='drift';
        l.vx+=((tow?(.6-l.x)*.22: (.32-l.x)*.13)+w*.17-.85*l.vx)*dt;
        l.vz+=((tow?-.48:(-7.4-l.z)*.12)-.8*l.vz)*dt;
        l.x+=l.vx*dt;l.z+=l.vz*dt;l.y=sample(l.x,l.z)+.045;
        if(tow){
          const before=s.opened;s.opened=clamp((-7.4-l.z)/6,0,1);
          if(Math.floor(s.opened*6)>Math.floor(before*6)){ring(l.x,l.z,2.8,true);event('uncover');}
          if(s.opened>=1){s.stage=3;s.mode='cross';s.idle=0;}
        }
      }else if(s.mode==='cross'||s.mode==='walking'||s.mode==='arrive'){
        l.vx+=((.55-l.x)*.12+wind(l.x,l.z)*.085-.86*l.vx)*dt;
        l.vz+=((-13.64-l.z)*.26-.76*l.vz)*dt;
        l.x+=l.vx*dt;l.z+=l.vz*dt;l.y=sample(l.x,l.z)+.045;
      }
      if(s.mode==='walking'){
        leg+=dt;s.landing=clamp(leg/1.85,0,1);s.travel=s.stepIndex+s.landing;
        if(s.landing>=1){s.stepIndex++;s.idle=0;s.mode=s.stepIndex===steps.length?'arrive':'cross';hold=0;}
      }else if(s.mode==='arrive'){
        hold+=dt;if(hold>3){s.mode='shade';l.id=++id;l.x=tree[0]-.60;l.y=2.36;l.z=tree[1]+.25;l.vx=l.vy=l.vz=0;s.idle=0;event('shade');}
      }else if(s.mode==='shade'){
        l.omega+=(wind(tree[0],tree[1])*.7-5*l.roll-1.8*l.omega)*dt;l.roll+=l.omega*dt;
      }else if(endPhase==='fall'){
        l.vy+=(-1.05-1.35*l.vy)*dt;l.vx+=(wind(l.x,l.z)+Math.sin(l.roll)*.25-l.vx)*dt;
        l.y+=l.vy*dt;l.x+=l.vx*dt;l.z+=.23*dt;
        if(l.y<.05){endPhase='ride';s.mode='return';l.y=.045;ring(l.x,l.z,2.4,true);event('leaf');}
      }else if(endPhase==='ride'){
        l.vz+=(.84-l.vz)*dt*.6;l.vx+=((-.25-l.x)*.045+wind(l.x,l.z)*.22-l.vx*.7)*dt;
        l.z+=l.vz*dt;l.x+=l.vx*dt;l.y=sample(l.x,l.z)+.045;
        if(l.z>=-3.4){s.cycle++;s.stage=0;s.mode='ready';s.stoneIndex=s.cycle%3;s.stepIndex=0;s.travel=0;s.opened=0;s.idle=0;endPhase='';}
      }
      if(endPhase==='fall'||s.stage===2||endPhase==='ride'){
        l.omega+=(wind(l.x,l.z)*2+l.vx*.8-(endPhase==='fall'?1:5)*l.roll-1.65*l.omega)*dt;l.roll+=l.omega*dt;
        l.heading+=((l.vx-l.heading)*.45)*dt;
      }
      for(let i=0;i<wet.length;i++){
        const clear=clamp(s.opened*7-i*.83,0,1);
        wet[i]=clamp(wet[i]+((1-clear-wet[i])*(clear?.48:.22)+sample(...steps[i],vel)*.09)*dt,0,1);
      }
      // Stems tether each floating pad. Adjacent pads part as the leaf's wake
      // reaches them, then sway against their individual stem and water drag.
      for(const p of lilies){
        const anchor=steps[p.i],reach=p.l+(1-wet[p.i])*(.53+.05*p.j);
        const gx=anchor[0]+Math.cos(p.a)*reach,gz=anchor[1]+Math.sin(p.a)*reach;
        const slope=sample(p.x,p.z+.12)-sample(p.x,p.z-.12);
        p.vx+=((gx-p.x)*2.6+wind(p.x,p.z)*.047-1.34*p.vx)*dt;
        p.vz+=((gz-p.z)*2.4-slope*1.6-1.28*p.vz)*dt;
        p.x+=p.vx*dt;p.z+=p.vz*dt;
        p.vt+=(slope*7+p.vx*.5-p.tilt*6-2*p.vt)*dt;p.tilt+=p.vt*dt;
      }
    }
    function camera(dt){
      const portrait=clamp((.95-s.aspect)/.52,0,1), c=s.camera,l=s.leaf;
      const viewShift=portrait*stones[s.stoneIndex][0]*.23;
      let x=viewShift,y=2.16+portrait*.52,z=5.8+portrait*1.75,lx=-.03+viewShift,ly=.65+portrait*.28,lz=-11.9;
      if(s.stage>=2){
        x=-.40;y=2.62+portrait*.46;z=5.95+portrait;lz=-12.5-s.opened*2.8;lx=.65;ly=.35;z-=s.opened*(10.15+portrait);
        if(s.stage===3){
          const path=[[-.4,-6.65],...steps],a=Math.floor(s.travel),p=path[a],q=path[Math.min(a+1,steps.length)],t=s.travel-a;
          x=p[0]+(q[0]-p[0])*t;y=1.92+portrait*.27+.20*Math.sin(t*Math.PI);
          z=p[1]+(q[1]-p[1])*t+2.45;
          const next=steps[Math.min(a,steps.length-1)],beyond=steps[Math.min(a+1,steps.length-1)];
          lx=next[0]+(beyond[0]-next[0])*t;
          lz=next[1]+(beyond[1]-next[1])*t;ly=.13+.115*(z-lz);
          if(s.mode==='arrive'||s.mode==='shade'||s.mode==='fall'){x=1.05;z=-15.6;lx=1.7;ly=1.79;lz=-21.4;}
          if(s.mode==='return'){x=l.x*.75;y=2.5;z=l.z+4.6;lx=l.x;ly=.45;lz=l.z-3.1;}
        }
      }
      for(const [key,v,target] of [['x','vx',x],['y','vy',y],['z','vz',z],['lx','lvx',lx],['ly','lvy',ly],['lz','lvz',lz]]){
        c[v]+=(2.9*(target-c[key])-3.45*c[v])*dt;c[key]+=c[v]*dt;
      }
    }
    function fixed(){
      s.time+=H;s.idle+=H;waterAir(H);fly(H);waterTraces(H);progress(H);camera(H);
      s.focusV+=((.67+wind(-.25,-1.38)*1.5-s.focus)*8-2.4*s.focusV)*H;s.focus+=s.focusV*H;
      for(const p of pebbles){p.v+=(-42*p.angle-6*p.v)*H;p.angle+=p.v*H;}
    }
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;acc+=dt;while(acc+1e-10>=H){fixed();acc-=H;}}
    function resetLeaf(){s.leaf.id=++id;s.leaf.pushX=s.leaf.pushZ=0;s.leaf.roll=0;s.leaf.omega=0;s.leaf.heading=-.3;s.leaf.x=.32;s.leaf.y=.045;s.leaf.z=-7.4;s.leaf.vx=s.leaf.vy=s.leaf.vz=0;}
    return {s,step,sample,wind,throwStone,tapLeaf,foot, getState:()=>JSON.parse(JSON.stringify({...s,h:Array.from(h),vel:Array.from(vel)}))};
  }
  const api={make,random,stones,steps,tree,NX,NZ,X0,Z0,CELL};root.Lake=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
