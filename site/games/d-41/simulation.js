/* Geometry uses metres, liquid films mm, bead mass mg, forces N, angles rad, time s.
   Haze, bond density and groove coverage are local fractions. The renderer reads these fields. */
(function (root) {
'use strict';
const NX=64, NY=68, H=3.0, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function random(seed) { return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0; return seed/4294967296;}; }
function spring(o,k,key,goal,rate,dt) {
  o[k]+=(rate*rate*(goal-o[key])-2*rate*o[k])*dt;
  o[key]+=o[k]*dt;
}
function create(seed=8417) {
  const rand=random(seed);
  function glass(){
    const n=NX*NY, arr=()=>new Float32Array(n);
    const p={haze:arr(),bond:arr(),film:arr(),ridge:arr(),pressedWater:arr(),pressedRidge:arr(),grain:arr(),light:.2,lightV:0,clear:0,drops:[]};
    p.haze.fill(1); p.bond.fill(1);
    for(let i=0;i<n;i++){p.grain[i]=rand();p.film[i]=.013+.09*rand();}
    for(let i=0;i<52;i++)p.drops.push({u:rand(),v:rand(),mass:.08+rand()*1.7,pin:.7+rand()*1.6,vy:0,distance:0,generation:0});
    return p;
  }
  const s={stage:0,mode:'wipe',idle:0,age:0,cycle:0,width:3.2,panes:[glass(),glass(),glass()],
    rail:0,railV:0,walk:0,walkV:0,angle:0,angleV:0,latch:0,latchV:0,hingePull:0,
    tool:{x:.734,y:.2293,vx:0,vy:0,tx:.734,ty:.2293,down:false,force:0,want:0,speed:0,wet:.6,held:false,approach:0,contact:false,z:.34,vz:0,roll:-.35,vr:0},
    air:[],motes:[],sprigs:[],cloth:[],jets:[],ripples:[],pump:0,pumpV:0,spout:0,
    flag:0,flagV:0,van:0,vanV:0,vanWheel:0,flight:0,flightV:0,glideY:2.85,climbV:0,bank:0,bankV:0,
    water:0,waterV:0,hint:0,hintAge:0,sound:{rub:0,pitch:80,edge:0,edgeHz:680,edgeSeconds:.095,wood:0,woodHz:155}};
  for(let i=0;i<11;i++)s.air.push({u:rand()*.14,v:0,force:rand()*.16,life:.3+rand()*2});
  for(let i=0;i<48;i++){const x=rand()*2-1,y=rand()*4-.6;s.motes.push({x,y,restX:x*.74,restY:y-.24,z:rand(),vx:0,vy:0,m:.6+rand()});}
  for(let i=0;i<36;i++)s.sprigs.push({a:0,w:0,stiff:2+rand()*2});
  // The upper two pegs of each panel constrain a damped grid of fabric patches.
  for(let f=0;f<3;f++)for(let j=0;j<7;j++)for(let i=0;i<9;i++)
    s.cloth.push({z:0,v:0,kick:0,pin:j===0&&(i===1||i===7),panel:f});
  const mode=m=>{s.mode=m;s.age=0;};
  const enterWipe=()=>{s.stage=Math.round(s.rail);s.stage=clamp(s.stage,0,2);mode('wipe');s.tool.held=false;};
  function release(){s.tool.down=false;s.tool.contact=false;s.tool.want=0;}
  function touch(x,y,pressure=.5) {
    if(s.mode!=='wipe')return;
    s.idle=0;s.hint=0;
    if(!s.tool.down){
      const reach=Math.hypot((x-s.tool.x)*s.width,(y-s.tool.y)*H);
      s.tool.approach=.27*(1-Math.exp(-reach*7));
    }
    Object.assign(s.tool,{tx:clamp(x,0,1),ty:clamp(y,0,1),down:true,want:1+5*clamp(pressure,0,1)});
    s.tool.held=true;
  }
  function act(){
    s.idle=0;s.hint=0;
    if(s.mode==='mail'){mode('delivery');return;}
    if(s.mode==='garden'&&s.age>1.2){mode('travel');return;}
    if(s.mode==='delivery'&&s.van>3){mode('travel');return;}
    if(s.mode==='latch'){s.hingePull=1;mode('opening');return;}
    if(s.mode==='outside'&&s.age>2){mode('home');}
  }
  function gust(panel,u,v,impulse){
    if(s.mode!=='outside')return;
    s.idle=0;
    for(let j=0;j<7;j++)for(let i=0;i<9;i++){
      const c=s.cloth[panel*63+j*9+i], d=(i/8-u)**2+(j/6-v)**2;
      if(!c.pin)c.kick=clamp(c.kick+clamp(impulse,-4,4)*Math.exp(-d*17),-13,13);
    }
  }
  function updateAir(dt){
    // Local gusts expire at different times. Drag dissipates their momentum; adjoining air couples them.
    for(let i=0;i<s.air.length;i++){
      const a=s.air[i];if((a.life-=dt)<=0){a.force=(rand()-.36)*.92;a.life=.8+rand()*3.2;}
      a.v+=(a.force+.55*(s.air[(i+10)%11].u-a.u)-a.u-1.8*a.v)*dt;a.u+=a.v*dt;
    }
    s.motes.forEach((m,i)=>{
      const air=s.air[i%11].u;
      m.vx+=(.07*air-.12*(m.x-m.restX)-.5*m.vx)*dt/m.m;
      m.vy+=(.016+.015*air-.017*(m.y-m.restY)-.4*m.vy)*dt/m.m;
      m.x+=m.vx*dt;m.y+=m.vy*dt;
    });
    s.sprigs.forEach((b,i)=>{b.w+=(s.air[i%11].u*.39-b.stiff*b.a-1.3*b.w)*dt;b.a+=b.w*dt;});
    for(let n=0;n<s.cloth.length;n++){
      const c=s.cloth[n];if(c.pin)continue;
      const i=n%9,j=Math.floor(n/9)%7;
      let tension=0;
      if(i)tension+=s.cloth[n-1].z-c.z;if(i<8)tension+=s.cloth[n+1].z-c.z;
      if(j)tension+=s.cloth[n-9].z-c.z;if(j<6)tension+=s.cloth[n+9].z-c.z;
      c.v+=(32*tension-(3+.22*j+12*c.z*c.z)*c.z-(2.1+.7*Math.abs(c.v))*c.v+(s.air[(i+c.panel)%11].u+.1)*(.4+j*.27)+c.kick)*dt;
      c.kick*=Math.exp(-4*dt);
    }
    for(const c of s.cloth)c.z+=c.v*dt;
  }
  function updateGlass(p,dt,wiping,thaw,condense=false){
    const t=s.tool, width=s.width;
    // Only the loaded blade footprint breaks bonds. Released glass keeps relaxing toward its new bond density.
    if(wiping){
      const cx=t.x*NX-.5,cy=t.y*NY-.5,rx=.385/width*NX,ry=.065/H*NY;
      for(let y=Math.max(0,Math.floor(cy-ry-1));y<=Math.min(NY-1,Math.ceil(cy+ry+1));y++)
        for(let x=Math.max(0,Math.floor(cx-rx-1));x<=Math.min(NX-1,Math.ceil(cx+rx+1));x++){
          const i=y*NX+x;
          const edge=clamp(rx+.8-Math.abs(x-cx),0,1)*clamp(ry+.8-Math.abs(y-cy),0,1);
          if(!edge)continue;
          const removal=1-Math.exp(-dt*(90+42*t.force)*edge);
          p.bond[i]*=1-removal;
          const groove=(.5+.5*Math.cos(x*2.47+.45*Math.sin(y*.23)))**5;
          const ridge=clamp((t.speed-.65)/2.5,0,1)*(.018+.29*groove);
          p.pressedRidge[i]+=(ridge-p.ridge[i]-p.pressedRidge[i])*removal;
          p.pressedWater[i]+=(.25+ridge-p.film[i]-p.pressedWater[i])*removal;
        }
      const mid=clamp(Math.floor(t.y*NY),0,NY-1)*NX+clamp(Math.floor(t.x*NX),0,NX-1);
      t.wet=clamp(.66*p.haze[mid]+2.8*p.film[mid],0,1);
    }
    // Film (mm) flows across the lower cell boundary above the retention threshold. Drying continues after release.
    let total=0;
    const relax=1-Math.exp(-6.4*dt),spread=1-Math.exp(-9.5*dt);
    for(let i=0;i<NX*NY;i++){
      if(condense){
        p.bond[i]+=(1-p.bond[i])*(.30+.24*p.grain[i])*dt;
        p.ridge[i]*=1-.26*dt;
      }else if(thaw)p.bond[i]*=1-(.2+.48*p.grain[i])*dt;
      p.haze[i]+=(p.bond[i]-p.haze[i])*relax;
      const smear=p.pressedRidge[i]*spread,flow=p.pressedWater[i]*spread;
      p.ridge[i]+=smear;p.pressedRidge[i]-=smear;p.pressedWater[i]-=flow;
      const wet=p.film[i]+flow,drain=Math.max(0,wet-.17)*dt*.52;
      p.film[i]=Math.max(0,wet+dt*((.0009+.0008*p.grain[i])*p.haze[i]-.012*wet)-drain);
      if(i>=NX)p.film[i-NX]+=drain;
      p.ridge[i]*=1-dt*(.016+.009*p.grain[i]);
      total+=1-p.haze[i];
    }
    p.clear=total/(NX*NY);spring(p,'lightV','light',.2+.75*p.clear+.039*s.sprigs[3].a+.027*s.air[5].u,1.8,dt);
    for(let j=0;j<p.drops.length;j++){
      const d=p.drops[j],i=clamp(Math.floor(d.v*NY),0,NY-1)*NX+clamp(Math.floor(d.u*NX),0,NX-1);
      // Capillary pinning holds beads until their mass overcomes adhesion.
      d.mass+=dt*(.019+p.film[i]*.14);
      const sliding=d.mass>d.pin||d.vy>.014;
      d.vy=clamp(d.vy+((sliding?.23*d.mass:0)-3.7*d.vy)*dt,0,.27);
      const travel=Math.min(d.v,d.vy*dt/H);
      d.v-=travel;d.distance+=travel*H;
      if(sliding){p.film[i]=Math.min(1,p.film[i]+travel*2.8);d.mass=Math.max(.03,d.mass-travel*.85);}
      if(wiping&&Math.abs(d.u-t.x)*width<.38&&Math.abs(d.v-t.y)*H<.07)d.mass*=Math.exp(-28*dt);
      if(d.v<=0){d.vy=0;d.mass=Math.max(0,d.mass-1.2*dt);if(d.mass<.004){d.mass=0;d.generation++;d.v=.70+rand()*.29;d.u=rand();d.pin=.7+rand()*1.6;}}
    }
  }
  function updateGarden(dt){
    // The revealed fountain builds pump head. Each detached parcel falls under gravity and excites one decaying ring.
    const q=s.panes[0].clear;
    spring(s,'pumpV','pump',.05+q*q*.95,2.4,dt);
    s.spout+=dt*(1+27*s.pump);
    if(s.spout>=1){s.spout--;s.jets.push({x:0,y:0,z:0,vx:(rand()-.5)*.42,vy:.62+s.pump*2.65,vz:(rand()-.5)*.42,r:.015+rand()*.013});}
    for(let i=s.jets.length-1;i>=0;i--){const d=s.jets[i];d.vy-=5.7*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;
      if(d.y<-.16){s.ripples.push({x:d.x,z:d.z,r:.01,amp:.018});s.jets.splice(i,1);}}
    for(let i=s.ripples.length-1;i>=0;i--){const r=s.ripples[i];r.r+=dt*.38;r.amp*=Math.exp(-2.8*dt);if(r.amp<.002)s.ripples.splice(i,1);}
  }
  function integrate(dt){
    s.age+=dt;s.idle+=dt;
    if(s.idle>4){s.hintAge+=dt;s.hint=Math.min(1,s.hint+dt*2);}else{s.hint=0;s.hintAge=0;}
    updateAir(dt);
    const t=s.tool;
    if(!t.held){t.tx=.734;t.ty=.2293;}
    spring(t,'vx','x',t.tx,31,dt);spring(t,'vy','y',t.ty,31,dt);
    t.speed=Math.hypot(t.vx*s.width,t.vy*H);
    t.approach=Math.max(0,t.approach-dt);
    if(t.down&&t.approach===0&&t.z<.162)t.contact=true;
    spring(t,'vz','z',t.held?(t.down&&t.approach<.12?.129:.19):.34,18,dt);
    spring(t,'vr','roll',t.held?clamp(-t.vx*.018,-.038,.038):-.35+.18*s.sprigs[3].a,19,dt);
    t.force+=(t.want-t.force)*(1-Math.exp(-24*dt));
    const index=Math.min(2,s.stage);
    const cooling=s.mode==='outside'||s.mode==='home'||(s.mode==='walk'&&s.walk>.65);
    if(cooling){for(const p of s.panes)updateGlass(p,dt,false,false,true);}
    else updateGlass(s.panes[index],dt,t.down&&t.contact&&s.mode==='wipe',s.mode!=='wipe'&&s.mode!=='travel');
    updateGarden(dt);
    s.waterV+=(-21*s.water-2.1*s.waterV+s.air[0].u*.022)*dt;s.water+=s.waterV*dt;
    const dry=clamp((.17-t.wet)*5,0,1);
    s.sound.rub+=((t.down&&t.contact?Math.min(.8,t.speed)*(.2+t.force/6)*(.65+.35*t.wet):0)-s.sound.rub)*(1-Math.exp(-15*dt));
    s.sound.pitch=62+10*t.force+32*Math.min(2,t.speed)+110*dry;
    const atEdge=Math.min(t.x,1-t.x)*s.width<.11||Math.min(t.y,1-t.y)*H<.08;
    s.sound.edge=Math.max(0,s.sound.edge-dt*8);
    if(t.contact&&t.speed>.16&&(atEdge||dry>.7)&&!s.edgeContact){s.sound.edge=1;s.sound.edgeHz=640+.7*s.sound.pitch;}
    s.edgeContact=t.contact&&(atEdge||dry>.7);
    const clean=s.panes[index].clear;
    if(s.mode==='wipe'&&clean>.61){
      release();t.held=false;
      mode(s.stage===0?'garden':s.stage===1?'mail':'flight');
    }
    if(s.mode==='garden'&&s.age>12)mode('travel');
    if(s.mode==='delivery'){s.vanV+=(1.55-.32*s.vanV)*dt;s.van+=s.vanV*dt;s.vanWheel+=s.vanV*dt/.24;if(s.van>12)mode('travel');}
    else if(s.vanV>.001){
      s.vanV*=Math.exp(-1.8*dt);s.van+=s.vanV*dt;s.vanWheel+=s.vanV*dt/.24;
    }
    spring(s,'flagV','flag',s.mode==='delivery'||s.van>0?1:s.mode==='mail'?.42:0,3.6,dt);
    if(s.mode==='travel'){
      const next=s.stage+1;spring(s,'railV','rail',next,1.6,dt);
      if(Math.abs(s.rail-next)<.001){s.rail=next;s.railV=0;enterWipe();}
    }
    if(s.mode==='flight'||s.flight>0){
      // Lift varies across the wings. Leaving the thermal lowers the nose; drag settles the glider beyond the roofs.
      const aloft=s.flight<27;
      s.flightV+=(aloft?.80+.20*s.air[4].u-.21*s.flightV:-1.7*s.flightV)*dt;
      s.flight+=s.flightV*dt;
      const lift=aloft?3.05+Math.min(1,s.flight/6)*1.1+.7*s.air[2].u:1.1;
      spring(s,'climbV','glideY',lift,1.0,dt);
      spring(s,'bankV','bank',aloft?(s.air[2].u-s.air[4].u)*.62:0,2.2,dt);
    }
    if(s.mode==='flight'&&s.age>4.2){s.stage=3;mode('latch');}
    spring(s,'latchV','latch',s.mode==='latch'?.07:s.hingePull,5.2,dt);
    spring(s,'angleV','angle',s.hingePull?s.latch*1.46:0,2.15,dt);
    s.sound.woodHz=155+Math.abs(s.angleV)*140+62*Math.sin(s.angle*11);
    s.sound.wood=Math.abs(s.angleV)*(.3+.7*Math.abs(Math.sin(s.angle*19)));
    if(s.mode==='opening'&&s.angle>1.28)mode('walk');
    if(s.mode==='walk'){spring(s,'walkV','walk',1,1.0,dt);if(s.walk>.995)mode('outside');}
    if(s.mode==='outside'&&s.age>30&&s.idle>14)mode('home');
    if(s.mode==='home'){
      spring(s,'walkV','walk',0,1.05,dt);if(s.walk<.2)s.hingePull=0;
      if(s.walk<.015){spring(s,'railV','rail',0,1.3,dt);
        if(s.rail<.005){s.rail=s.railV=0;s.stage=0;s.cycle++;s.hingePull=0;s.walk=s.walkV=0;
          s.flight=s.flightV=s.van=s.vanV=s.vanWheel=s.climbV=0;s.glideY=2.85;s.idle=0;enterWipe();}}
    }
  }
  let carry=0;
  function step(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    carry+=dt;while(carry>=1/120-1e-10){integrate(1/120);carry-=1/120;}
  }
  return {step,getState:()=>s,touch,release,act,gust,NX,NY,H};
}
const api={create,NX,NY,H,random};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WindowPhysics=api;
})(typeof window!=='undefined'?window:globalThis);
