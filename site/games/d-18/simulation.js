/* All lengths are metres, angles radians and time seconds. Runs without a DOM. */
(function (root) {
  'use strict';
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const smooth = x => { x=clamp(x,0,1); return x*x*(3-2*x); };
  const points = [
    [0,7,6],[0,7.1,-1],[-.8,9.2,-10],[-2.5,13.7,-21],[-3,16,-32],
    [0,15.8,-40],[8,12,-48],[18,5.2,-54],[30,3.4,-60],
    [44,7.3,-66],[55,11.4,-76],[61,10.3,-87],[65,4.6,-98],
    [65,.74,-111],[62,.54,-125],[56,.81,-139],[45,2.2,-149],
    [33,2.8,-153],[21,3.4,-150],[17,5.6,-141],[16,8.6,-128],
    [15,9.7,-114],[11,7.8,-102],[0,4.1,-99],[-13,3.2,-104],
    [-27,4.6,-110],[-38,8.2,-103],[-41,14.5,-87],[-39,21,-67],
    [-34,22.3,-53],[-29,18,-41],[-22,10,-31],[-18,5.4,-17],
    [-19,4.6,-2],[-22,5.4,11],[-18,7.8,24],[-9,8.6,28],
    [-2.1,7.5,23],[0,7,15],[0,7,6]
  ];
  const last=points.length-1;
  const knot = i => points[i<0?last-1:i>last?1:i];
  function curve(u,high,lift,alternate) {
    u=clamp(u,0,last);
    const i=Math.min(last-1,Math.floor(u)), t=u-i, t2=t*t,t3=t2*t;
    const a=knot(i-1),b=knot(i),c=knot(i+1),d=knot(i+2);
    const p=b.map((v,k)=>.5*(2*v+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t2+(-a[k]+3*v-3*c[k]+d[k])*t3));
    p[1]+=lift*smooth((u-1.5)/2.5)*smooth((7-u)/2.8);
    const fork=smooth((u-18)/2.7)*smooth((24-u)/2.5);
    p[0]+=(high?12:-7.7)*fork;
    p[1]+=(high?2.3:-3.1)*fork;
    const lagoon=smooth((u-31)/2)*smooth((37-u)/2);
    p[0]-=alternate?8*lagoon:0;
    return p;
  }
  const arc=[0], steps=32;
  let prev=curve(0,false,0,false);
  for(let j=1;j<=last*steps;j++){
    const p=curve(j/steps,false,0,false);
    arc.push(arc[j-1]+Math.hypot(...p.map((x,k)=>x-prev[k]))); prev=p;
  }
  const length=arc[arc.length-1];
  function toU(s) {
    s=clamp(s,0,length);
    let lo=0,hi=arc.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1;if(arc[m]<=s)lo=m;else hi=m;}
    return (lo+(s-arc[lo])/(arc[hi]-arc[lo]))/steps;
  }
  function sample(s,high=false,lift=0,alt=false){
    if(s<0)s+=length;
    if(s>length)s-=length;
    return curve(toU(s),high,lift,alt);
  }
  const at=u=>arc[Math.round(u*steps)];
  const crest=at(4.15), sea=at(11.25), gate=at(18.03), gateTop=at(21), finalHill=at(25.25), finalTop=at(29), finish=at(38.0);
  let seed=73921;
  function rngFactory(key){let a=key;return ()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};}
  const flagSites=[1,3,5,8,12,15,18,22,28,35].map((u,i)=>{
    if(i===0)return [2.69,0];
    const p=curve(u,false,0,false),q=curve(u+.01,false,0,false),dx=q[0]-p[0],dz=q[2]-p[2],s=(i%2?-2.27:2.27)/Math.hypot(dx,dz);
    return [p[0]-dz*s,p[2]+dx*s];
  });
  function create(options={}) {
    const random=rngFactory(options.seed||seed), cap=options.liftLimit??8;
    const S={time:0,s:0,v:0,height:7,mode:'lift',stage:0,held:false,idle:0,lap:0,alternate:false,
      lift:0,liftRate:0,peak:0,high:false,baySwitch:0,baySpeed:0,gateAngle:0,gateSpeed:0,gateLatch:false,
      crestDwell:0,arrived:0,view:0,brake:1,chain:0,chainSpeed:0,button:0,buttonSpeed:0,
      wheelAngle:.09,wheelSpeed:.018,wind:2.7,gust:2.7,gustWait:1.4,sunset:0,
      lastTick:0,waveCount:0,flags:[],water:[],cabins:[],spray:[],dust:[],cars:[],wavers:[],lamps:[],skyHeat:0,travel:0,promptHeat:.34,promptContact:true,boats:[],clouds:[]};
    for(let i=0;i<flagSites.length;i++){
      S.flags.push(Array.from({length:6},(_,j)=>({a:.02*random(),w:0,wind:1+random(),mass:.75+.35*random(),bias:random()*6})));
    }
    for(let i=0;i<96;i++)S.water.push({h:(random()-.5)*.12,v:(random()-.5)*.05,phase:random()*6.28,omega:.6+random()*.68});
    for(let i=0;i<20;i++)S.cabins.push({a:random()*.025,w:0});
    for(let i=0;i<64;i++)S.spray.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,generation:0,r:.035+random()*.06});
    for(let i=0;i<26;i++)S.dust.push({x:random()*16-8,y:random()*8,z:random()*12-6,vx:.1,vy:.02,generation:0,phase:random()*6.28});
    for(let i=0;i<2;i++)S.cars.push({heave:0,vy:0,roll:0,wr:0});
    for(let i=0;i<3;i++)S.wavers.push({a:0,w:0,phase:random()*6.28});
    for(let i=0;i<48;i++)S.lamps.push({heat:0,threshold:.21+i%9*.027});
    for(let i=0;i<11;i++)S.clouds.push({x:0,v:.08+i*.004,drag:.13+.008*(i%5)});
    for(let i=0;i<6;i++)S.boats.push({y:0,vy:0,a:0,w:0});
    let sprayCarry=0,dropIndex=0,stepCarry=0;
    function press(on){if(S.held===on)return;S.held=on;S.idle=0;}
    function pos(s){return sample(s,S.high,S.lift,S.alternate);}
    function tick(dt) {
      const prevV=S.v;
      S.time+=dt; S.idle=S.held?0:S.idle+dt;
      S.gustWait-=dt;
      if(S.gustWait<=0){S.gust=1.3+random()*3.6;S.gustWait=1.3+random()*3.8;}
      S.wind+=(S.gust-S.wind)*dt*.72;
      S.buttonSpeed+=((Number(S.held)-S.button)*94-S.buttonSpeed*18)*dt;
      S.button+=S.buttonSpeed*dt;
      const cue=(['lift','forkLift','lastLift'].includes(S.mode)&&!S.held)||
        (S.held&&(S.mode==='summit'||S.mode==='release'));
      if(S.promptHeat>.80)S.promptContact=false;
      if(S.promptHeat<.28)S.promptContact=true;
      S.promptHeat+=((cue&&S.promptContact?1:0)-S.promptHeat)*dt*(S.promptContact?1.2:.78);
      S.brake+=((S.held?.02:S.mode==='coast'?.10:1)-S.brake)*Math.min(1,dt*5);
      const p=pos(S.s),q=pos(S.s+.1);
      const scaling=Math.hypot(...p.map((x,i)=>(q[i]-x)*10))||1;
      const grade=(q[1]-p[1])*10/scaling;
      const powered=['lift','forkLift','lastLift'].includes(S.mode);
      if(powered){
        if(S.held && !(S.mode==='forkLift'&&S.high&&!S.gateLatch)) S.v=Math.min(2,S.v+dt*(1-S.brake)*1.95);
        else if(S.v>0) S.v=Math.max(0,S.v-dt*(1.2+9.81*Math.max(0,grade)));
        else S.v=Math.max(-1.6,Math.min(0,S.v-dt*(9.81*grade-.02*9.81-S.brake*.55)));
        if(S.s<=([0,gate,finalHill][['lift','forkLift','lastLift'].indexOf(S.mode)])+.001 && S.v<0)S.v=0;
      } else if(S.mode==='coast'){
        const gravity=-9.81*grade;
        S.v=Math.max(0,S.v+(gravity-.02*9.81*Math.sqrt(Math.max(0,1-grade*grade))-.0008*S.v*S.v)*dt);
        if(S.v<1.6 && grade>=-.03)S.v+=dt*(1.6-S.v)*2.3; // driven transfer tyres at shallow saddles
      } else if(S.mode==='dock'){
        S.v=Math.max(0,S.v+clamp(3.5-S.v,-1.35*dt,.5*dt));
      } else S.v=0;
      // A progressive friction brake absorbs kinetic energy before each transfer table.
      const stop=powered?(S.mode==='lift'?crest:S.mode==='forkLift'?gateTop:finalTop):
        S.mode==='coast'?(S.stage<2?gate:S.stage===2?finalHill:length):S.mode==='dock'?length:null;
      if(stop!==null && S.v>0){
        const remaining=Math.max(0,(stop-S.s)*scaling);
        const decel=powered?1.65:S.stage===3?1.35:2.15;
        S.v=Math.min(S.v,Math.sqrt(2*decel*remaining));
      }
      S.s+=S.v*dt/scaling;S.travel+=S.v*dt;
      if(powered && S.v<0){S.s=Math.max(S.mode==='lift'?0:S.mode==='forkLift'?gate:finalHill,S.s);}
      if(S.mode==='lift'&&S.s>=crest){S.s=crest;S.v=0;S.mode='summit';S.crestDwell=0;}
      if(S.mode==='summit'){
        S.crestDwell+=dt;
        const target=S.held?Math.min(2,Math.sqrt(2*1.8*Math.max(0,cap-S.lift))):0;
        S.liftRate+=clamp(target-S.liftRate,-dt*2.5,dt*1.8);
        S.lift=Math.min(cap,S.lift+S.liftRate*dt);
        if(S.lift>=cap)S.liftRate=0;
        S.peak=Math.max(S.peak,pos(S.s)[1]);
        if(!S.held&&S.crestDwell>=1.4 && S.liftRate<.08){S.high=S.peak>=20;S.mode='coast';S.v=0;}
      }
      if(S.s>=sea && S.stage===0)S.stage=1;
      if(S.s>=gate&&S.stage===1){S.s=gate;S.v=0;S.stage=2;S.mode='forkLift';}
      if(S.mode==='forkLift'&&S.s>=gateTop){S.s=gateTop;S.mode='release';S.v=0;}
      if(S.stage===2&&S.s>=finalHill){S.s=finalHill;S.v=0;S.stage=3;S.mode='lastLift';}
      if(S.mode==='lastLift'&&S.s>=finalTop){S.s=finalTop;S.mode='release';S.v=0;}
      if(S.mode==='release'&&!S.held){S.mode='coast';S.v=0;}
      if(S.s>=finish&&S.mode==='coast')S.mode='dock';
      if(S.mode==='dock' && length-S.s<.0002){S.s=length;S.v=0;S.mode='arrived';S.arrived=0;}
      if(S.mode==='arrived'){
        S.arrived+=dt;
        if(S.arrived>=6){S.lap++;S.s=0;S.alternate=!S.alternate;S.mode='lift';S.stage=0;S.high=false;S.peak=0;S.held=false;S.idle=0;S.crestDwell=0;}
      }
      if(S.mode!=='summit' && (S.s>at(8)||S.mode==='lift')){S.lift=Math.max(0,S.lift-1.15*dt);S.liftRate=0;}
      const gateTarget=S.high&&S.s>at(16.3)&&S.s<at(24)?1:0;
      S.gateSpeed+=((gateTarget-S.gateAngle)*4-S.gateSpeed*3.8)*dt;
      S.gateAngle=clamp(S.gateAngle+S.gateSpeed*dt,0,1);
      S.gateLatch=S.gateAngle>.995;
      const bayTarget=S.mode==='arrived'?!S.alternate:S.alternate;
      S.baySpeed+=((Number(bayTarget)-S.baySwitch)*2.7-S.baySpeed*3.25)*dt;
      S.baySwitch=clamp(S.baySwitch+S.baySpeed*dt,0,1);
      S.height=pos(S.s)[1];
      const viewTarget=S.mode==='summit'?smooth(S.crestDwell/2):0;
      S.view+=(viewTarget-S.view)*dt*.85;
      S.chainSpeed+=((powered&&S.held?Math.max(0,S.v):S.liftRate)-S.chainSpeed)*dt*4;
      S.chain+=S.chainSpeed*dt;
      const exterior=pos(S.s), wake=Math.abs(S.v), acceleration=(S.v-prevV)/dt;
      S.flags.forEach((strip,i)=>{
        const distance=Math.hypot(exterior[0]-flagSites[i][0],exterior[2]-flagSites[i][1]);
        for(let j=strip.length-1;j>=0;j--){
          const f=strip[j],up=j?strip[j-1].a:0,down=j<5?strip[j+1].a:f.a;
          const flow=S.wind+.7*Math.sin(S.water[(i*7+j)%96].phase+f.bias)+wake*2.3*Math.exp(-distance/9);
          f.wind+=(flow-f.wind)*dt*(2+j*.21);
          const force=f.wind*(.08+.047*j)*(1+.6*Math.sin(f.bias+f.wind*.9+S.water[i*6+j].phase));
          f.w+=(force/f.mass+24*(up+down-2*f.a)-5*f.a-2.5*f.w)*dt;
          f.a+=f.w*dt;
        }
      });
      const cellAt=(x,z)=>((Math.floor(z*.19)%8+8)%8)*12+((Math.floor(x*.19)%12+12)%12);
      const localCell=cellAt(exterior[0],exterior[2]);
      const immersion=S.s>at(12.5)&&S.s<at(15.8)?clamp((S.water[localCell].h+.98-exterior[1])*3,0,1):0;
      const oldH=S.water.map(c=>c.h);
      S.water.forEach((c,i)=>{
        const j=i%12,k=i/12|0;
        const n=oldH[k*12+(j+11)%12]+oldH[k*12+(j+1)%12]+oldH[((k+7)%8)*12+j]+oldH[((k+1)%8)*12+j];
        c.phase+=dt*(c.omega+S.wind*.043);
        c.v+=(2.8*(n-4*c.h)-1.6*c.h-.59*c.v+.26*Math.sin(c.phase)+
          (i===localCell?immersion*wake*.075:0))*dt;
        c.h+=c.v*dt;
      });
      sprayCarry+=dt*wake*3.6*immersion;
      while(sprayCarry>=1){
        sprayCarry--;const d=S.spray[dropIndex++%S.spray.length],side=random()<.5?-1:1;
        d.generation++;d.x=exterior[0]+side*1.35;d.z=exterior[2]+(random()-.5)*2.2;d.y=.16;
        d.vx=side*(1+random()*2.1);d.vy=1.5+random()*2+wake*.12;d.vz=(random()-.5)*2;d.life=1;S.waveCount++;
      }
      S.spray.forEach(d=>{if(d.life){d.vy-=9.81*dt;d.vx+=(S.wind*.25-d.vx)*dt;d.x+=d.vx*dt;d.z+=d.vz*dt;d.y+=d.vy*dt;const hit=cellAt(d.x,d.z);if(d.y<=S.water[hit].h){d.life=0;S.water[hit].v+=d.r*.1;}}});
      S.wheelSpeed+=(.0018+.00026*S.wind-.098*S.wheelSpeed)*dt;
      S.wheelAngle+=S.wheelSpeed*dt;
      S.cabins.forEach((c,i)=>{const a=S.wheelAngle+i*Math.PI/10;c.w+=(-2.9*Math.sin(c.a)-.6*c.w+.012*S.wind*Math.cos(a)+.008*Math.sin(a)*S.wheelSpeed)*dt;c.a+=c.w*dt;});
      S.cars.forEach((c,i)=>{
        const joint=Math.sin((S.s+i*3.42)*Math.PI*2/.64);
        c.vy+=(-62*c.heave-6*c.vy+.023*wake*joint+clamp(acceleration,-6,6)*.027)*dt;
        c.heave+=c.vy*dt;
        const k=pos(S.s+(i?3.42:0)),f=pos(S.s+(i?3.42:0)+1),b=pos(S.s+(i?3.42:0)-1);
        const bend=(f[0]-k[0])*(k[2]-b[2])-(f[2]-k[2])*(k[0]-b[0]);
        c.wr+=(-24*c.roll-5*c.wr+clamp(bend*wake*wake,-4,4)*.36+.055*Math.sin(S.water[i*11].phase))*dt;c.roll+=c.wr*dt;
      });
      S.clouds.forEach((c,i)=>{c.v+=((S.wind*(.035+.002*i))-c.v)*c.drag*dt;c.x+=c.v*dt;});
      S.boats.forEach((b,i)=>{
        const port=S.water[i*9+2],star=S.water[i*9+3],mass=1+.12*(i%3);
        b.vy+=((.035+(port.h+star.h)*.5-b.y)*10-3*b.vy)*dt/mass;b.y+=b.vy*dt;
        b.w+=((star.h-port.h-b.a)*6-2.1*b.w)*dt/mass;b.a+=b.w*dt;
      });
      S.skyHeat+=((S.stage===3?1:0)-S.skyHeat)*dt*.069;
      S.sunset+=(S.skyHeat-S.sunset)*dt*.12;
      S.lamps.forEach((l,i)=>{l.heat+=((S.sunset>l.threshold?1:0)-l.heat)*dt*(1.2+i%5*.23);});
      S.wavers.forEach((w,i)=>{w.phase+=dt*(3.5+i*.27);const greeting=S.mode==='arrived'?1:.0;
        w.w+=((greeting*(1.55+.28*Math.sin(w.phase))-w.a)*19-5*w.w)*dt;w.a+=w.w*dt;});
      S.dust.forEach(d=>{d.phase+=dt*(.52+.03*d.y);d.vx+=(S.wind*.13+.18*Math.sin(d.phase)-d.vx)*dt;
        d.vy+=(.07*Math.cos(d.phase)+wake*.006-d.vy)*dt*.75;d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.x>9){d.generation++;d.x-=18;d.z=random()*12-6;}});
    }
    function step(dt){if(!Number.isFinite(dt)||dt<0)return;stepCarry+=dt;
      while(stepCarry>=1/120-1e-12){tick(1/120);stepCarry-=1/120;}
    }
    return {state:S,step,press,getState:()=>JSON.parse(JSON.stringify(S)),pos};
  }
  const api={create,sample,curve,at,length,last,toU,smooth,clamp,rngFactory,flagSites,crest,gate,gateTop,finalHill,finalTop,sea};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoastRide=api;
})(globalThis);
