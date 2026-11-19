/* Distances in the flight model are metres, hinge angles are radians. */
(function (root) {
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), PI=Math.PI;
const geometry=typeof module!=='undefined'&&module.exports?require('./fold-geometry.js'):root.FoldGeometry;
const designs=[
  {width:2.04,length:2.76,shoulder:.17,keel:.11},
  {width:2.26,length:2.58,shoulder:.04,keel:.085,cross:-.60},
  {width:1.99,length:2.86,shoulder:.30,keel:.15,cross:.72}
].map(d=>({...d,...geometry.measure(d)}));
function create(seed=407,initial=0,initialShape=initial){
  let design=typeof initialShape==='object'?{...initialShape,...geometry.measure(initialShape)}:designs[initialShape];
  let rng=seed>>>0;
  function random(){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;}
  const arr=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
  const spring=()=>({q:0,v:0});
  const wind=arr(8,i=>({u:.18+i*.018,v:0,load:.25+random()*.35,life:random()+.3}));
  const cloth=arr(60,()=>spring()), branch=arr(16,()=>spring()), flex=arr(7,()=>spring());
  const water=arr(140,()=>spring()), rotors=arr(5,(i)=>({angle:i*.43,omega:0}));
  const dust=arr(38,()=>({x:random()*8-4,y:.15+random()*3,z:random()*6-3,vx:0,vy:0,cycle:0,age:random()*3}));
  const seeds=arr(24,(i)=>({x:0,y:0,z:0,vx:0,vy:0,free:false,rest:false,load:0,limit:.16+i*.046}));
  const newHinge=()=>({q:0,v:0,press:0,stiffness:32,thickness:.1});
  let hinges=arr(design.cross?6:5,newHinge);
  const drops=arr(22,(i)=>({x:0,y:0,vx:0,vy:0,volume:0,cycle:0,delay:i*.061,live:false}));
  const p={x:0,h:0,s:0,vx:0,vy:0,speed:0,pitch:0,roll:0,rollV:0,lift:0,area:0,cg:0,impact:0,landX:0,landS:0,release:0,eddy:0};
  let phase='fold',stage=initial,round=0,fold=0,elapsed=0,idle=0,clock=0,guide=0,grip=false,
      kick=0,gate=0,gateV=0,flow=.16,wheel=0,wheelV=0,brush=0,waterHit=0,prop=spring(),grasp=spring(),returnMotion=spring(),sheet={h:0,v:0,tilt:0,w:0},
      carry=0,foldPulse=0,landingPulse=0;
  function osc(a,target,k,d,h){a.v+=((target-a.q)*k-d*a.v)*h;a.q+=a.v*h;}
  function change(s){phase=s;elapsed=0;idle=0;grip=false;if(s==='return'){returnMotion.q=0;returnMotion.v=0;}}
  function touch(){idle=0;}
  function trace(f,pressure=.55){
    if(phase!=='fold'||fold>=hinges.length)return;
    const a=hinges[fold];a.press=clamp(a.press+Math.max(0,f),0,1);
    a.stiffness=32+27*a.press+5*pressure;a.thickness=.1+(fold+1)*.063*a.press;
    foldPulse=Math.min(1,foldPulse+f*4);touch();
  }
  function launch(release=1){
    if(phase!=='ready')return;
    const d=design;
    Object.assign(p,{x:0,h:grasp.q,s:0,vx:0,release:clamp(release,0,4),vy:.88+.09*clamp(release,0,4),speed:2.6+clamp(release,0,4)*.43,pitch:.05+grasp.q*2,roll:0,rollV:0,
      area:d.area,cg:d.cg,impact:0,lift:0,eddy:0});
    kick=0;brush=0;waterHit=0;change('flight');
  }
  function nudge(kind,amount=.6,index=2){
    touch();
    if(kind==='plane'&&phase==='flight'){kick=clamp(kick+amount,-1,1);return;}
    if(kind==='sluice'&&phase==='flight'&&stage===1){gateV+=2.1;return;}
    if(kind==='rotor'&&phase==='flight'&&stage===2){rotors[clamp(index,0,4)].omega+=1.1;return;}
    if(kind==='sheet'&&phase==='land'&&elapsed>.9){change('return');return;}
    prop.v=Math.min(.32,prop.v+.16);
  }
  function advance(h){
    clock+=h;elapsed+=h;idle+=h;guide+=h*(.46+.07*wind[0].u);foldPulse*=Math.exp(-7*h);landingPulse*=Math.exp(-7*h);
    for(let i=0;i<8;i++){const a=wind[i];a.life-=h;
      if(a.life<=0){a.load=(random()-.19)*.96;a.life=.6+random()*2.8;}
      a.v+=(1.8*(a.load-a.u)+.72*(wind[(i+7)%8].u-a.u)-1.6*a.v)*h;a.u+=a.v*h;
    }
    for(let i=0;i<60;i++){
      const row=Math.floor(i%20/5),col=i%5, panel=Math.floor(i/20),a=cloth[i];
      if(row===0&&(col===0||col===4))continue; // pinned at its two pegs
      const up=row?cloth[i-5].q:0,left=col?cloth[i-1].q:a.q,right=col<4?cloth[i+1].q:a.q;
      const wake=phase==='flight'?Math.exp(-Math.pow((p.s-1.7)*3,2))*.16:0;
      const force=(wind[(col+panel*2)%8].u+wake)*(.11+row*.032)*(1+.2*Math.sin(i*8));
      a.v+=(force+8*(up-a.q)+4*(left+right-2*a.q)-3*a.q-1.9*a.v)*h;a.q+=a.v*h;
    }
    for(let i=0;i<branch.length;i++)osc(branch[i],wind[i%8].u*(.035+i%4*.014)+(i%4?branch[i-1].q*.45:0),6+i%3,1.7+i%4*.21,h);
    for(let i=0;i<7;i++){
      const f=flex[i],a=hinges[Math.min(hinges.length-1,fold)];
      const forced=wind[(i+2)%8].u*(.12+i*.10)+(i===0?0:flex[i-1].q*.17);
      osc(f,forced+(i%2?1:-1)*(a.v*1.2+kick*2)/(1+a.thickness*2),24+i*3,3.5+i*.15,h);
    }
    for(let i=0;i<dust.length;i++){const a=dust[i];a.age+=h;
      a.vx+=(wind[i%8].u*.23-a.vx)*h*.9;a.vy+=((wind[(i+3)%8].u-.29)*.065-a.vy)*h;
      a.x+=a.vx*h;a.y+=a.vy*h;
      // Wrap outside the window volume, beyond the rendered aperture.
      if(a.x>5.5){a.x-=13;a.cycle++;}if(a.y<-.3){a.y+=4.6;a.cycle++;}if(a.y>4.5){a.y-=4.6;a.cycle++;}
    }
    for(let i=0;i<hinges.length;i++){const a=hinges[i],goal=a.press*(i===hinges.length-1?1.19:PI);
      const damping=i===hinges.length-1?10:10.4;
      a.v+=((goal-a.q)*a.stiffness-damping*a.v)*h;a.q+=a.v*h;
      if(Math.abs(a.v)<.0002&&Math.abs(goal-a.q)<.0001){a.v=0;a.q=goal;}
    }
    osc(prop,0,47,5,h);
    osc(grasp,phase==='ready'?(grip?.035:.018):0,40,9,h);
    if(phase==='fold'&&hinges[fold].press>=.999&&Math.abs(hinges[fold].q-(fold===hinges.length-1?1.19:PI))<.055){
      fold++;idle=0;guide=0;if(fold===hinges.length)change('ready');
    }
    const nearby=phase==='flight'&&stage===1?Math.exp(-Math.pow((p.s-3.5)*1.15,2)):0;
    gateV+=((nearby*.8-gate)*9-3.8*gateV)*h;gate=clamp(gate+gateV*h,0,1.1);
    flow+=(.13+.82*gate-flow)*h*1.4;
    let torque=0;
    for(let i=0;i<drops.length;i++){
      const a=drops[i];
      if(!a.live){a.delay-=h;if(a.delay<=0){a.x=0;a.y=0;a.vx=.19+.17*flow;a.vy=-.012;a.volume=flow*(.65+i%5*.11);a.cycle++;a.live=true;}continue;}
      a.vy-=1.8*h;a.x+=a.vx*h;a.y+=a.vy*h;
      if(a.y<-.25){torque+=a.volume*Math.abs(a.vy)*.016;water[30+i%3].v+=a.volume*.0007;
        a.live=false;a.delay=(.22+i%4*.047)/(flow+.12);}
    }
    wheelV+=((flow*.70-wheelV)*.9)*h+torque;wheel+=wheelV*h;
    for(let i=0;i<140;i++){
      const x=i%10,z=Math.floor(i/10),a=water[i],sum=(x?water[i-1].q:a.q)+(x<9?water[i+1].q:a.q)+(z?water[i-10].q:a.q)+(z<13?water[i+10].q:a.q);
      const inlet=x===1&&z===3?flow*.09*(1+.75*Math.cos(wheel*8)):0;
      a.v+=(34*(sum-4*a.q)-1.2*a.v-2.2*a.q+inlet+wind[(x+z)%8].v*.002)*h;
    }
    for(const a of water)a.q+=a.v*h;
    for(let i=0;i<5;i++){const r=rotors[i],wake=phase==='flight'&&stage===2?Math.exp(-Math.pow((p.s-3.5-i*.16)*1.15,2))*3:0;
      r.omega+=((wind[(i+3)%8].u*2.2+wake)*(.7+i*.11)-.8*r.omega)*h;r.angle+=r.omega*h;
    }
    if(stage===2&&(phase==='flight'||phase==='land'||phase==='return')){
      for(let i=0;i<seeds.length;i++){const a=seeds[i];
        if(!a.free&&p.s>3){a.load+=Math.max(0,rotors[i%5].omega-.55)*h;if(a.load>a.limit){a.free=true;a.vy=.38+i%5*.045;}}
        if(a.free&&!a.rest){a.vx+=(wind[i%8].u*.53-a.vx)*h;a.vy+=(-.095-a.vy*.48)*h;
          a.x+=a.vx*h;a.y+=a.vy*h;a.z-=.10*h;if(a.y<-.43){a.y=-.43;a.rest=true;}}
      }
    }
    if(phase==='flight'){
      const dt=h*.205, d=design,route=[0,-1.68,1.58][stage];
      const path=clamp((p.s-.55)/3.85,0,1),target=route*path*path*(3-2*path);
      const windCell=wind[Math.min(7,Math.floor(p.s*1.1))];
      kick*=Math.exp(-1.8*h);
      p.vx+=((target-p.x)*3.3-p.vx*2.8+windCell.u*.09+kick*.43)*dt;
      const ahead=Math.max(0,.537-d.cg);
      const close=clamp((p.s-4.6)/1.05,0,1),updraft=Math.exp(-Math.pow((p.s-2.1)*1.2,2))*(.65+windCell.u*.85);
      const trim=.46*clamp(.43+( .06-p.h)*.76-p.vy*.27+updraft*.22-close*.56, .08,1.65);
      p.lift=.5*1.21*d.area*p.speed*p.speed*trim;
      p.vy+=(p.lift/.0062-9.81-1.3*p.vy-ahead*16+updraft+kick*.75)*dt;
      p.speed+=((2.85+(d.cg-.53)*1.8-p.speed)*.5-.16*p.vy)*dt;
      p.x+=p.vx*dt;p.h+=p.vy*dt;
      // A headwind beside the wheels slows ground travel while the airspeed
      // continues to support the wings. Opening the gate frees the glider.
      const lee=stage===0?0:Math.exp(-Math.pow((p.s-3.48)/.89,4));
      p.eddy+=(lee-p.eddy)*Math.min(1,h*2.6);
      const headwind=p.eddy*(stage===1?(.85-.19*gate):(.84-.025*rotors[2].omega));
      p.s+=p.speed*(1-headwind)*dt;
      p.pitch+=(Math.atan2(p.vy,p.speed)-ahead*.9-p.pitch)*dt*5;
      p.rollV+=((p.vx*.24+kick*.22+windCell.v*.3-p.roll)*13-4*p.rollV)*dt;p.roll+=p.rollV*dt;
      if(!brush&&p.s>1.6){cloth[37].v+=.11;brush=1;}
      if(brush===1&&p.s>2.78){branch[p.x<0?5:9].v+=.08;brush=2;}
      if(stage===1&&p.s>3.18&&!waterHit){water[74].v+=.035+Math.abs(p.vy)*.01;waterHit=1;}
      if(p.h<=-.564&&p.s>3.75){p.landX=p.x;p.landS=p.s;p.impact=-p.vy;p.vy=0;p.h=-.564;landingPulse=1;change('land');}
    }else if(phase==='land'){
      const dt=h*.205;p.speed*=Math.exp(-5.4*h);p.x+=p.vx*dt;p.vx*=Math.exp(-7*h);p.s+=p.speed*dt;
      p.pitch*=Math.exp(-4*h);p.roll*=Math.exp(-3*h);
      if(elapsed>5.8)change('return');
    }
    if(phase==='land'||phase==='return'){
      const landing=phase==='land';
      const dest=landing?.05225:.304;
      sheet.v+=((dest-sheet.h)*2.7-2.5*sheet.v+wind[3].v*.035625)*h;sheet.h+=sheet.v*h;
      sheet.w+=((wind[4].u*.70-sheet.tilt)*3-1.8*sheet.w)*h;sheet.tilt+=sheet.w*h;
      if(!landing){const k=3.7+wind[6].u*.7;osc(returnMotion,1,k,2*Math.sqrt(k),h);}
      if(!landing&&returnMotion.q>.9982&&returnMotion.v<.0035){round++;stage=(stage+1)%3;design=designs[stage];fold=0;
        hinges=arr(design.cross?6:5,newHinge);
        seeds.forEach(a=>Object.assign(a,{x:0,y:0,z:0,vx:0,vy:0,free:false,rest:false,load:0}));
        change('fold');
      }
    }else if(phase==='flight'){sheet.h=.415625;sheet.v=-.007125;sheet.tilt=.18;}
  }
  function step(dt){if(!Number.isFinite(dt)||dt<0)return;carry+=dt;
    while(carry+1e-10>=1/120){advance(1/120);carry-=1/120;}}
  function view(){
    const a=hinges[Math.min(hinges.length-1,fold)],airspeed=phase==='flight'?p.speed:0;
    const sound={foldHz:1250+a.press*1950+(a.stiffness-32)*17,airHz:300+airspeed*230+Math.abs(p.rollV)*125,airGain:airspeed*(.029+wind[4].u*.015)};
    return {sound,phase,stage,round,fold,elapsed,idle,clock,guide,grip,design,hinges,wind,cloth,branch,flex,water,rotors,dust,seeds,drops,p,prop,grasp,returnMotion,gate,flow,wheel,wheelV,sheet,foldPulse,landingPulse};}
  return {step,view,getState:()=>JSON.parse(JSON.stringify(view())),trace,launch,nudge,touch,grip(v){grip=v;touch();}};
}
const api={create,designs};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PaperPlay=api;
})(globalThis);
