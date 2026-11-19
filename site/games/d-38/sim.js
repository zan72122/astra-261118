/* Distances in metres, mass in kilograms, time in seconds. Fixed 120 Hz integration. */
(function(root){
'use strict';
const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
const homes=[[-.05,0,2.85],[-3.95,0,1.35],[-2.24,0,2.2],[1.64,0,2.58],[3.62,0,1.75]];
const compact=[[4.14,0,3.23],[0,0,2.32],[2.28,0,3.59],[4.26,0,1.26],[3.43,0,.11]];
const slots=[[-1.48,1.12,-1.10],[-1.43,1.12,-2.34],[.28,1.12,-2.03],[-1.48,1.96,-1.10],[1.18,1.12,-1.69]];
const spots=[[1.1,0,.9],[-1.58,0,-1.6],[.25,0,-.56],[2.13,0,-1.35],[-2.48,0,.23]];
const yardYaw=[-.19,.11,-.25,.06,.24],bayYaw=[-.03,.77,.59,.2,1.53];
const halfSupport=[.47,.46,.135,.26,.18],cgOffset=[.01,-.02,.19,.024,.03];
const masses=[5,17,6.2,3.7,8.6], heights=[.84,1.83,1.24,1.32,1.26];
const rest=(x=0)=>({x,v:0});
function spring(s,goal,k,d,h){s.v+=((goal-s.x)*k-s.v*d)*h;s.x+=s.v*h;}
function create(opts={}){
 let rng=352143,frac=0,small=!!opts.compact;
 const random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);
 const home=i=>(small?compact:homes)[i];
 const items=masses.map((m,i)=>({id:i,m:opts.masses?.[i]??m,p:[...home(i)],v:[0,0,0],target:[...home(i)],tilt:rest(),yaw:rest(yardYaw[i]+(small?.41:0)),bearing:0,overhang:0,mode:'yard',spin:rest(),touch:false}));
 const air=Array.from({length:12},(_,i)=>({u:random()*.4,impulse:random()-.4,next:random()+.4,leaf:rest(),light:rest(),stiff:8+random()*6}));
 const dust=Array.from({length:22},()=>({p:[(random()-.5)*11,random()*3+.3,(random()-.5)*6],v:[0,0,0],lift:.2+random()*.4}));
 dust.forEach(d=>d.anchor=[...d.p]);
 const waves=Array.from({length:48},()=>rest((random()-.5)*.035));
 const rope=Array.from({length:14},(_,i)=>rest(.075*Math.sin(i*Math.PI/13)));
 const shocks=Array.from({length:4},()=>rest());
 const door=Array.from({length:12},()=>rest());
 const bridge=[rest(1.13),rest(1.28)],crank=rest(),shutters=[rest(),rest()],sail=rest(),wheel=Array.from({length:4},()=>rest());
 const s={phase:'load',world:'yard',age:0,idle:0,index:0,roomIndex:0,held:-1,count:0,ropeGoal:0,doorGoal:0,bridgeGoal:0,windowGoal:0,sailGoal:0,travel:0,speed:0,engine:rest(),air,dust,waves,items,rope,shocks,door,bridge,crank,shutters,sail,wheel,events:[],cycles:0,fade:0,viewPull:rest(),harborView:rest(),boatSpeed:0,boatRun:0,boatHeel:rest()};
 const roomOrder=[1,2,3,0,4];
 function event(type,power=1,id=-1){s.events.push({type,power,id});if(s.events.length>30)s.events.shift();}
 function phase(p){s.phase=p;s.age=0;s.idle=0;}
 function active(){return s.phase==='load'?s.index:s.phase==='room'?roomOrder[s.roomIndex]:-1;}
 function goal(){const i=active();return i<0?null:[...(s.world==='room'?spots:slots)[i]];}
 function grab(i){s.idle=0;if(i!==active()||i<0||s.held!==-1||['settle','lower','delivery','placed','packed'].includes(items[i].mode)){if(items[i])items[i].spin.v+=.15;return false;}
  const b=items[i];s.held=i;b.mode='held';b.target=[b.p[0],b.p[1]+.55,b.p[2]];event('pick',b.m/9);return true;}
 function move(p){if(s.held<0)return;s.idle=0;items[s.held].target=p.map((n,k)=>clamp(n,k===1?0:-7,k===1?4.8:7));}
 function release(ok=true,bias=0){if(s.held<0)return;const b=items[s.held];s.held=-1;b.mode=ok?'settle':'home';b.bearing=clamp(bias,-.38,.38);const landing=ok?goal():null;if(landing)landing[0]+=b.bearing*(s.world==='yard'?.68:.91);b.touch=false;b.landing=landing;const above=landing&&[landing[0],landing[1]+.17,landing[2]];b.route=ok&&s.world==='yard'?[[2.24,Math.max(1.30,above[1]),landing[2]],above]:[];b.target=ok?(b.route.length?b.route.shift():above):(s.world==='room'?[-3.65,.23,1.6]:[...home(b.id)]);s.idle=0;}
 function operate(amount=.34){s.idle=0;
  switch(s.phase){
  case 'tie':s.ropeGoal=clamp(s.ropeGoal+amount,0,1);event('rope',amount);break;
  case 'door':s.doorGoal=clamp(s.doorGoal+amount,0,1);event('latch',amount);break;
  case 'bridge':s.bridgeGoal=clamp(s.bridgeGoal+amount,0,1);event('gear',amount);break;
  case 'window':s.windowGoal=clamp(s.windowGoal+amount,0,1);event('wood',amount);break;
  case 'sail':s.sailGoal=clamp(s.sailGoal+amount,0,1);event('rope',amount);break;
  }
 }
 // Each gust feeds the neighbouring air cell. Branch drag and spring stiffness
 // stop a displaced leaf; a mote remains in its local recirculation pocket.
 // Water exchanges momentum only across shared edges, reflecting at the banks.
 function ambient(h){
  const prior=air.map(a=>a.u);
  air.forEach((a,i)=>{a.next-=h;if(a.next<=0){a.impulse=(random()-.44)*2;a.next=.55+random()*2.2;}
   a.u+=(a.impulse-.85*a.u+.65*(prior[(i+11)%12]-a.u))*h;
   spring(a.leaf,.115*a.u,a.stiff,2.8,h);spring(a.light,a.leaf.x*.36,5,3,h);});
  dust.forEach((d,i)=>{const a=air[i%12];for(let j=0;j<3;j++){const f=[a.u*.45,d.lift*a.u,air[(i+3)%12].u*.28][j];d.v[j]+=(f-.65*d.v[j]+(d.anchor[j]-d.p[j])*.55)*h;d.p[j]+=d.v[j]*h;}});
  const y=waves.map(w=>w.x);waves.forEach((w,i)=>{const x=i%8,z=i>>3;
   const near=(x?y[i-1]:y[i])+(x<7?y[i+1]:y[i])+(z?y[i-8]:y[i])+(z<5?y[i+8]:y[i]);
   w.v+=(12*(near-4*y[i])-3.3*w.x-1.3*w.v+air[(i+z)%12].u*.16)*h;w.x+=w.v*h;});
 }
 function tick(h){s.age+=h;s.idle+=h;ambient(h);
  spring(s.viewPull,s.count*.13,4.3,4.1,h);
  let load=[0,0,0,0];
  items.forEach(b=>{
   if(b.mode==='lower'){
    for(const j of [0,2]){b.v[j]+=((b.target[j]-b.p[j])*32-b.v[j]*8)*h;b.p[j]+=b.v[j]*h;}
    b.v[1]-=9.81*h;b.p[1]+=b.v[1]*h;
    if(b.p[1]<=b.target[1]){
     const impact=-b.v[1];b.p[1]=b.target[1];b.v[1]=impact*[.13,.09,.12,.08,.17][b.id];
     if(!b.touch){event('land',b.m*impact/14,b.id);b.tilt.v+=b.bearing*.9;b.touch=true;}
     if(b.v[1]<.065){b.v[1]=0;
      if(s.world==='yard'){b.mode='packed';s.count++;s.index++;if(s.index===3)phase('tie');else if(s.index===5)phase('door');}
      else{b.mode='placed';s.roomIndex++;if(s.roomIndex===5)phase('window');else deliver();}}
    }
   }
   const moving=['held','settle','home','delivery'].includes(b.mode);
   if(moving){for(let j=0;j<3;j++){
    const displacement=b.target[j]-b.p[j];
    // The guided slide is force-limited even when the next slot is far away.
    const pull=b.mode==='held'?132*displacement:145.2*Math.tanh(displacement/1.1);
    let force=pull-b.v[j]*(1.8*Math.sqrt(132*b.m)+b.m*.85*Math.abs(b.v[j]));
    if(j===1&&b.mode==='held')force-=b.m*.63;
    b.v[j]+=force/b.m*h;b.p[j]+=b.v[j]*h;}
    const min=b.mode==='settle'?b.target[1]:0;
    if(b.p[1]<min&&Math.abs(b.p[0]-b.target[0])<.25&&Math.abs(b.p[2]-b.target[2])<.25){b.p[1]=Math.min(min,b.p[1]+h*.8);b.v[1]=Math.max(0,b.v[1]);}
    if(b.mode!=='held'&&Math.hypot(...b.p.map((v,j)=>v-b.target[j]))<.022&&Math.hypot(...b.v)<.16){
     if(b.mode==='settle'&&b.route?.length){b.target=b.route.shift();return;}
     if(b.mode==='settle'){b.mode='lower';b.target=b.landing;}
     else b.mode=s.world==='room'?'waiting':'yard';
    }
   }else if(b.mode==='packed'||b.mode==='placed'){for(let j=0;j<3;j++){b.v[j]+=((b.target[j]-b.p[j])*38-b.v[j]*10)*h;b.p[j]+=b.v[j]*h;}}
   const stowing=s.world!=='room'&&['settle','lower','packed'].includes(b.mode);
   spring(b.yaw,stowing?bayYaw[b.id]:yardYaw[b.id]+(small?.41:0),87/b.m,1.76*Math.sqrt(87/b.m),h);
   const offset=b.p[0]+cgOffset[b.id]-slots[b.id][0];
   b.overhang=b.mode==='packed'?Math.sign(offset)*Math.max(0,Math.abs(offset)-halfSupport[b.id]):0;
   const inertia=b.m*(heights[b.id]**2/3+halfSupport[b.id]**2);
   const torque=clamp(b.m*9.81*b.overhang/(inertia*4.2),-.23,.23)*(1-s.ropeGoal);
   spring(b.tilt,torque+(moving?-b.v[0]*.035:0),19,3.5+s.ropeGoal*5,h);spring(b.spin,0,19,3,h);
   if(b.mode==='packed'&&s.world!=='room'){const u=clamp((b.p[0]+2.6)/4.25,0,1),v=clamp((b.p[2]+2.9)/2.5,0,1);[ (1-u)*v,u*v,(1-u)*(1-v),u*(1-v)].forEach((n,j)=>load[j]+=b.m*n);}
  });
  shocks.forEach((v,i)=>spring(v,load[i]*9.81/1950,46,6,h));
  // The two rope ends are fixed at the cleats. Pulling takes up slack;
  // adjacent segments exchange velocity and friction damps the last recoil.
  rope.forEach((r,i)=>{const bow=Math.sin(i*Math.PI/13);spring(r,(1-s.ropeGoal)*bow*.23+air[i%12].u*.018*bow*(1-s.ropeGoal)+(i?rope[i-1].v*.035:0),37+i,4+6*s.ropeGoal,h);});
  // The shutter slats enter the curved track in order. The two bridge
  // counterweights and shutter hinges settle independently at their stops.
  door.forEach((d,i)=>spring(d,clamp(s.doorGoal*1.2-i*.018,0,1),36-i*.7,10,h));
  bridge.forEach((b,i)=>spring(b,(1.13+i*.15)*(1-s.bridgeGoal),5.8-i*.9,4.3,h));
  spring(crank,s.bridgeGoal*Math.PI*3,13,6,h);
  shutters.forEach((b,i)=>spring(b,(1.19+i*.13)*s.windowGoal,9-i*1.5,4,h));
  spring(sail,s.sailGoal,6,3.9,h);
  if(s.phase==='tie'&&s.ropeGoal>=1&&s.age>.6&&Math.abs(rope[6].x)<.018)phase('load');
  if(s.phase==='door'&&door[11].x>.973){event('engine');phase('depart');}
  const drive=['depart','cross'].includes(s.phase);
  spring(s.harborView,['sail','coast'].includes(s.phase)?1:0,1.65,2.77,h);
  const wind=Math.max(.26,1.20+air[4].u*.68);
  const push=s.phase==='coast'?wind*sail.x*.72:0;
  s.boatSpeed+=(push-s.boatSpeed*(.49+.31*s.boatSpeed))*h;s.boatRun+=s.boatSpeed*h;
  spring(s.boatHeel,wind*sail.x*.047+waves[15].x*.67,4.9,1.47,h);
  s.speed+=((drive?(s.phase==='depart'?2.8:3.2):0)-s.speed)*1.2*h;s.travel+=s.speed*h;
  wheel.forEach((w,i)=>{const compression=shocks[[2,0,3,1][i]].x;
   const omega=s.speed/(.477-compression*.22);
   w.v+=(omega-w.v)*(15+i*.38)*h;w.x+=w.v*h;
  });
  spring(s.engine,drive?1:0,14,6,h);
  if(s.phase==='depart'&&s.age>3.8){s.world='river';s.travel=0;s.speed=0;phase('bridge');}
  if(s.phase==='bridge'&&s.bridgeGoal>=1&&bridge[1].x<.025){phase('cross');event('engine');}
  if(s.phase==='cross'&&s.travel>14){s.world='room';phase('room');s.speed=0;items.forEach(b=>{b.mode='stored';b.v=[0,0,0];});deliver();}
  if(s.phase==='window'&&shutters[1].x>1.28)phase('sail');
  if(s.phase==='sail'&&sail.x>.97)phase('coast');
  if(s.phase==='coast'&&s.age>9){const cycles=s.cycles+1;Object.assign(s,{world:'yard',index:0,roomIndex:0,held:-1,count:0,ropeGoal:0,doorGoal:0,bridgeGoal:0,windowGoal:0,sailGoal:0,travel:0,speed:0,cycles,boatRun:0,boatSpeed:0});items.forEach(b=>{b.p=[...home(b.id)];b.v=[0,0,0];b.mode='yard';b.target=[...b.p];b.bearing=0;});phase('load');}
  const closing=s.phase==='depart'?s.age-3.2:s.phase==='cross'?(s.travel-12)/3.2:s.phase==='coast'?s.age-8.4:0;
  s.fade=clamp(closing/.56,0,1);
 }
 function deliver(){const b=items[roomOrder[s.roomIndex]];b.p=[-5.5,.23,1.6];b.target=[-3.65,.23,1.6];b.mode='delivery';}
 function step(dt){if(!Number.isFinite(dt)||dt<=0)return;frac+=dt;while(frac>=1/120-1e-10){tick(1/120);frac-=1/120;}}
 function layout(c){small=c;items.forEach(b=>{if(b.mode==='yard'){b.p=[...home(b.id)];b.target=[...b.p];}});}
 return {s,step,grab,move,release,operate,active,goal,layout,getState:()=>JSON.parse(JSON.stringify(s))};
}
const api={create,homes,slots,spots,heights};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MovingDay=api;
})(typeof window!=='undefined'?window:globalThis);
