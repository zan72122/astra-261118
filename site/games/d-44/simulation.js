/* Metres, kilograms and seconds. Physics is independent of THREE and the audio clock. */
(function (global) {
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const H=1/120;
const parcels=[
  {x:.12,z:.80,w:1.30,d:.97,h:.79,yaw:-.13},
  {x:-1.39,z:.02,w:1.06,d:.80,h:.64,yaw:.16},
  {x:1.14,z:-.59,w:.90,d:.83,h:.99,yaw:-.19}
];
const destinations=[
  [-2.24,.357,-1.48],[-2.01,.357,-1.48],[-1.78,.357,-1.48],
  [-1.85,.013,-.68],[-1.54,.013,-.68],[-1.18,1.095,-1.59],[1.99,.073,-1.78]
];
const ids=['book','book','book','shoe','shoe','radio','pot'];
const masses=[.32,.48,.37,.21,.23,.85,1.18];
const steps=[[-1.85,-.28],[-1.53,-.02],[-1.82,.25],[-1.49,.54],[-1.76,.86]];
function spring(o,k,d,target,dt) {
  o.v+=((target-o.x)*k-o.v*d)*dt; o.x+=o.v*dt;
}
const joint=(x=0)=>({x,v:0});
function create(seed=431) {
 let rng=seed>>>0,acc=0,s,events=[],held=null;
 function rnd(){rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296;}
 function emit(type,value=1,at=0){events.push({type,value,at});if(events.length>120)events.shift();}
 function reset(cycle=0) {
   held=null;
   s={cycle,time:0,phase:'tape',stage:0,box:0,index:0,idle:0,phaseAge:0,
     wind:Array.from({length:7},()=>({...joint((rnd()-.5)*.2),push:0,life:.2+rnd()*1.8})),
     swell:Array.from({length:180},()=>joint((rnd()-.5)*.024)),
     dust:Array.from({length:78},()=>({x:-3+rnd()*6,y:.1+rnd()*3.5,z:-1.8+rnd()*5,vx:0,vy:0,vz:0,size:.002+rnd()*.004})),
     boxes:parcels.map((b,i)=>({wobble:joint(),pull:0,demand:0,speed:0,pitch:0,
        cells:Array.from({length:26},(_,j)=>({bond:1,lift:joint(),strength:.89+rnd()*.19,at:(j+.5)/26})),
        flaps:[0,1,2,3].map(()=>joint()),panels:[0,1,2,3].map(()=>joint()),slide:joint(),empty:false,open:false,slip:joint(),crackle:0})),
     items:ids.map((kind,i)=>{let bi=i<3?0:i<5?1:2,b=parcels[bi];
       let x=b.x+(i<3?(i-1)*.18:i===3?-.16:i===4?.16:i===5?-.12:.13);
       return {kind,box:bi,mass:masses[i],x,y:.10+(i===6?0:.05),z:b.z+(i===6?-.16:.06),vx:0,vy:0,vz:0,
        tx:x,ty:.15,tz:b.z,mode:'packed',tilt:joint(),travel:0,contact:0,dropX:0,dropZ:0};}),
     reed:[joint(),joint(),joint()],played:[false,false,false],bird:joint(),wheel:joint(),walk:0,
     prints:steps.map(()=>joint()),dial:joint(-1.85),dialTarget:-1.85,door:joint(),wet:joint(),ripples:Array.from({length:14},()=>joint()),
     drops:Array.from({length:26},(_,i)=>({x:1.98+(rnd()-.5)*.47,y:1+rnd()*2,z:-1.8+(rnd()-.5)*.38,vy:-.2-rnd(),water:0,delay:i*.13,manual:i>=18,active:i<18})),
     leaves:Array.from({length:11},()=>({...joint(),water:0,rest:.72+rnd()*.24})),watered:0,
     chimes:[joint(),joint(),joint()],lanternPulse:[joint(),joint(),joint()],lanternTouch:0,evening:joint(),heat:joint(),street:[joint(),joint(),joint()],switch:joint(),echo:joint(.18),
     camera:joint(),cloth:Array.from({length:13},()=>joint()),ferry:{x:-5,v:.018},boatRock:joint(),
     sail:joint(),fade:joint(cycle?1:0)};
 }
 reset();
 function phase(p){s.phase=p;s.phaseAge=0;s.idle=0;held=null;}
 function prepareItem(i){s.index=i;let o=s.items[i];o.mode='offered';phase('item');}
 function touch(){s.idle=0;}
 function tug(metres,velocity){
   if(s.phase!=='tape')return;
   const b=s.boxes[s.box];touch(); b.demand=clamp(b.demand+Math.abs(metres),0,parcels[s.box].d);
   b.speed=clamp(Math.abs(velocity),.05,.4); b.pitch=410+b.speed*3100;
 }
 function grab(kind,id=0){
   touch();
   if(kind==='box'&&id!==s.box){s.boxes[id].wobble.v+=.075;return false;}
   if(s.phase==='tape'&&kind==='box'){held={kind,id};return true;}
   if(s.phase==='flaps'&&kind==='box'){s.boxes[s.box].open=true;phase('opening');emit('fold',.7);return true;}
   if(s.phase==='item'&&kind==='item'&&id===s.index){let o=s.items[id];held={kind,id};o.mode='held';o.tx=o.x;o.ty=o.y+.15;o.tz=o.z;return true;}
   if(s.phase==='song'&&kind==='reed'){
     s.reed[id].v+=2.6;s.bird.v+=1.3;s.wheel.v+=2.1;s.played[id]=true;emit('note',id);if(s.played.every(Boolean)){phase('songEnd');}return true;}
   if(s.phase==='walk'&&kind==='foot'&&id===s.walk){let o=s.items[3+(id%2)];o.tx=steps[id][0];o.tz=steps[id][1];o.ty=.013;o.mode='walking';o.travel=0;o.vy=2.0;
      s.prints[id].v=.3;emit('brush',o.mass,o.tx);s.walk++;phase('walking');return true;}
   if(s.phase==='tune'&&kind==='dial'){held={kind,id};return true;}
   if(s.phase==='water'&&kind==='leaf'){
     const leaf=s.leaves[id];leaf.v+=1.65;leaf.water=Math.max(.02,leaf.water*.24);
     shed(id,3);
     s.watered++;emit('plink',.3+rnd()*.6,id*.1);if(s.watered>=4)phase('dusk');return true;}
   if(s.phase==='night'&&kind==='lamp'){
     const i=s.lanternTouch++%3;s.lanternPulse[i].v+=2.8;s.switch.v+=1.4;
     emit('lantern',i,[.12,1.2,2.2][i]);return true;
   }
   if(s.phase==='lamp'&&kind==='lamp'){phase('night');s.switch.v=1.1;emit('click',.55);return true;}
   return false;
 }
 function dragItem(x,y,z){if(!held||held.kind!=='item')return;touch();let o=s.items[held.id];o.tx=clamp(x,-3,2.6);o.ty=clamp(y,.14,2.15);o.tz=clamp(z,-1.8,2);}
 function turn(delta){if(s.phase!=='tune')return;touch();s.dialTarget=clamp(s.dialTarget+delta,-2.1,2.18);}
 function release(x,z,tap=false){
   if(held?.kind==='item'){let o=s.items[held.id],p=destinations[held.id];
     o.dropX=isFinite(x)?clamp((x-p[0])*.18,-.075,.075):0;o.dropZ=isFinite(z)?clamp((z-p[2])*.16,-.047,.047):0;
     o.start=[o.x,o.y,o.z];o.tx=p[0]+o.dropX;o.tz=p[2]+o.dropZ;o.ty=p[1];
     o.flight=.94+.35*Math.hypot(o.tx-o.x,o.tz-o.z)+.14*o.mass;o.mode='placing';o.travel=0;phase('placing');
   }else if(held?.kind==='box'&&tap){tug(parcels[s.box].d*.19,.16);}
   else if(held?.kind==='dial'&&tap)turn(.58);
   held=null;
 }
 function placed(){
   let i=s.index;emit('thud',masses[i],s.items[i].x);s.items[i].tilt.v+=.32/masses[i];
   if(i===0||i===1||i===3)prepareItem(i+1);
   else if(i===2){s.boxes[0].empty=true;phase('song');}
   else if(i===4){s.boxes[1].empty=true;phase('walk');}
   else if(i===5)phase('tune');
   else if(i===6){s.boxes[2].empty=true;phase('water');}
 }
 function nextBox(i){s.box=i;s.stage=i;phase('tape');}
 function air(dt){
   for(let i=0;i<s.wind.length;i++){let w=s.wind[i];w.life-=dt;if(w.life<=0){w.push=(rnd()-.40)*(.5+s.door.x*.46);w.life=.45+rnd()*2.5;}
     spring(w,2.1,1.4,w.push+.20*s.wind[(i+6)%7].x,dt);}
   s.dust.forEach((p,i)=>{let w=s.wind[i%7],w2=s.wind[(i+2)%7];
     p.vx+=(w.x*.4-p.vx*.73)*dt;p.vy+=(w2.x*.14+.011-p.vy*.62)*dt;p.vz+=(-w.x*.12-p.vz*.58)*dt;
     p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
     if(p.x>3||p.x< -3)p.vx+=(-p.x*.06)*dt;if(p.y>3.55||p.y<.08)p.vy+=(1.7-p.y)*.11*dt;
     if(p.z>3.5||p.z< -2)p.vz+=(-p.z*.1)*dt;});
   s.cloth.forEach((c,i)=>spring(c,7,2.5,s.wind[i%7].x*(.018+i*.001)+(s.cloth[i-1]?.x||0)*.24,dt));
   // An open-water height field. The breakwater dissipates wave energy at the edge.
   const water=s.swell;
   water.forEach((v,i)=>{let row=Math.floor(i/18),col=i%18;
     let neighbours=(col?water[i-1].x:v.x)+(col<17?water[i+1].x:v.x)+(row?water[i-18].x:v.x)+(row<9?water[i+18].x:v.x);
     let boundary=row===0||col===0||col===17;
     v.v+=(4.8*(neighbours-4*v.x)-.82*v.x-(boundary?1.7:.69)*v.v+s.wind[(col+row*2)%7].x*(.13+row*.011))*dt;
   });water.forEach(v=>v.x+=v.v*dt);
   let f=s.ferry;f.v+=((.024+.115*s.door.x+.029*s.wind[1].x)-f.v)*dt*.36;f.x+=f.v*dt;
   if(f.x>8) f.v-=(f.x-8)*dt*.034;
   spring(s.boatRock,3,1.5,s.wind[2].x*.053+(water[67].x-water[68].x)*2.4,dt);spring(s.sail,4,1.6,s.wind[4].x*.18,dt);
 }
 function cardboard(dt){
   s.boxes.forEach((b,i)=>{
     let distance=b.demand-b.pull;
     let advance=Math.min(distance,(b.speed||.05)*dt);
     b.pull+=advance;let f=b.pull/parcels[i].d;
     b.crackle+=advance;
     if(b.crackle>.012){b.crackle-=.012;emit('rip',b.pitch,parcels[i].x);}
     for(let j=0;j<b.cells.length;j++){let c=b.cells[j],old=c.bond;
       let strain=f>0?clamp((f-c.at+.038)*23,0,1):0;c.bond=Math.max(0,c.bond-dt*strain*16/c.strength);
       let free=1-c.bond,distance=f-c.at;
       // A short unsupported span buckles. The released tail settles against the front wall.
       let bend=free*(.017+.145*Math.exp(-Math.pow((distance-.065)/.18,2)));
       spring(c.lift,82,12,bend+(b.cells[j-1]?.lift.v||0)*.006,dt);
       if(old>.52&&c.bond<=.52)b.slip.v+=.047*c.strength;
     }
     spring(b.slip,49,6,0,dt);spring(b.wobble,77,8,0,dt);
     b.flaps.forEach((l,j)=>{let release=b.open;
       let gate=j<2?1:clamp((b.flaps[j-2].x-.38)*2,0,1);
       spring(l,12+j,4.5,b.empty?4.63:release?(2.14+.12*j)*gate:0,dt);});
     b.panels.forEach((p,j)=>{let hinge=b.flaps[j].x,force=clamp((hinge-3.25-j*.17)*1.9,0,1);
       spring(p,7+j*.65,5.1,b.empty?force*(1.54-j*.009):0,dt);});
     spring(b.slide,2.4,3.1,b.panels[3].x>1.45?1:0,dt);
     if(i===s.box&&s.phase==='tape'&&f>.998&&b.cells[25].bond<.08){phase('flaps');emit('snap',.36,i);}
     if(i===s.box&&s.phase==='opening'&&b.flaps[3].x>1.7)prepareItem([0,3,5][i]);
   });
 }
 function contents(dt){
   s.items.forEach((o,i)=>{
     if(o.mode==='packed')return;
     const b=parcels[o.box];let tx=o.tx,ty=o.ty,tz=o.tz;
     if(o.mode==='offered'){tx=b.x;tz=b.z;ty=b.h+.06;}
     if(o.mode==='placing'||o.mode==='walking')o.travel+=dt;
     if(o.mode==='placing'){const u=clamp(o.travel/o.flight,0,1),ease=u*u*(3-2*u);
       tx=o.start[0]+(tx-o.start[0])*ease;tz=o.start[2]+(tz-o.start[2])*ease;
       ty=o.start[1]+(ty-o.start[1])*ease+4*u*(1-u)*(.36+.12/(o.mass+.35));}
     const k=o.mode==='held'?65:34,d=o.mode==='held'?13:10;
     o.vx+=((tx-o.x)*k-o.vx*d)*dt;o.vz+=((tz-o.z)*k-o.vz*d)*dt;
     if(o.mode==='walking')o.vy-=4.9*dt;
     else o.vy+=((ty-o.y)*k-o.vy*d-(o.mode==='placing'&&o.travel>=o.flight?1.7:0))*dt;
     o.x+=o.vx*dt;o.z+=o.vz*dt;o.y+=o.vy*dt;
     if((o.mode==='placing'||o.mode==='walking'||o.mode==='placed')&&(o.mode!=='placing'||o.travel>=o.flight)&&o.y<=o.ty&&o.vy<=0){
       o.y=o.ty;o.contact=Math.abs(o.vy);o.vy=0;
       if(o.mode==='placing'&&o.travel>=o.flight){o.mode='placed';placed();}
       else if(o.mode==='walking'){o.mode='placed';emit('step',.4+o.contact*.22,o.x);phase(s.walk===5?'walkEnd':'walk');}
     }
     spring(o.tilt,35,5,-o.vx*.09+o.vz*.03,dt);
   });
   s.reed.forEach(r=>spring(r,48,3.6,0,dt));spring(s.bird,19,1.9,0,dt);
   s.wheel.v-=s.wheel.v*.60*dt;s.wheel.x+=s.wheel.v*dt;
   s.prints.forEach(p=>spring(p,12,4,0,dt));
   let absorb=s.items.reduce((v,o)=>v+(o.mode==='placed'?o.mass*(.28+Math.abs(o.z)*.16+Math.abs(o.x)*.12):0),0);
   spring(s.echo,3,3,.16+.12/(1+absorb)+s.door.x*.10,dt);
 }
 function shed(leafIndex,amount){
   let pot=s.items[6];
   s.drops.filter(d=>d.manual&&!d.active&&d.delay<=0).slice(0,amount).forEach((d,j)=>{
     let angle=leafIndex*2.399;d.x=pot.x+Math.cos(angle)*(.125+j*.012);d.z=pot.z+Math.sin(angle)*.125;
     d.y=pot.y+.37+(leafIndex%5)*.025;d.delay=j*.045;d.vy=-.18;d.water=.04;d.active=true;
   });
 }
 function weather(dt){
   spring(s.dial,44,9,s.dialTarget,dt);
   if(s.phase==='tune'&&s.dial.x>1.76){phase('door');emit('latch',.6);}
   const open=['door','water','dusk','lamp','night','dawn'].includes(s.phase)||s.index===6;
   spring(s.door,1.4,2.4,open?1.53:0,dt);
   const station=clamp((s.dial.x+1.85)/3.74,0,1);
   spring(s.wet,2,2.8,open?.88:.62*Math.exp(-((station-.62)**2)/.018)*station,dt);
   s.chimes.forEach((j,i)=>{
     spring(j,10+i*2.6,1.12,(s.wind[(i*2+1)%7].x*(.32+s.door.x*.76)+s.door.v*.44)/(1+i*.16),dt);
     const stop=.34-.029*i;
     if(Math.abs(j.x)>stop&&j.v*j.x>0){
       if(Math.abs(j.v)>.14&&s.door.x>.20)emit('chime',i,1.12);
       j.x=Math.sign(j.x)*stop;j.v*=-.36;
     }});
   s.leaves.forEach((l,i)=>{l.water=clamp(l.water+dt*(s.wet.x*.005-l.water*.018),0,1);
     if(l.water>l.rest&&s.items[6].mode==='placed'){shed(i,1);l.water*=.58;l.v-=.15;}
     spring(l,13+i*.4,2.7,s.wind[i%7].x*.16+l.water*.38,dt);});
   s.drops.forEach((p,i)=>{if(!p.active){p.delay=Math.max(0,p.delay-dt);return;}if(p.delay>0){p.delay-=dt;return;}if(s.wet.x<.1)return;
     const previousY=p.y;p.vy-=5.8*dt;p.y+=p.vy*dt;p.water=Math.min(1,p.water+dt*2);
     const floor=.076;
     let hit=-1,pot=s.items[6];
     if(!p.manual&&pot.mode==='placed'&&p.y<pot.y+.58&&previousY>pot.y+.3){
       hit=s.leaves.findIndex((leaf,j)=>{let angle=j*2.399,h=pot.y+.40+.035*(j%5)-leaf.x*.043;
         return previousY>=h&&p.y<=h&&Math.hypot(p.x-pot.x-Math.cos(angle)*.14,p.z-pot.z-Math.sin(angle)*.14)<.077;});
     }
     if(p.y<=floor||hit>=0){
       if(hit>=0){s.leaves[hit].water=clamp(s.leaves[hit].water+.081*p.water,0,1);s.leaves[hit].v+=.081*p.water;}
       else{s.ripples[i%s.ripples.length].v+=.27+p.water*.12;}
       if(s.phase==='water'&&i%10===0)emit('plink',.12+rnd()*.18,p.x);
       // Recycle only after the absorbed drop is invisible, behind the balcony lintel.
       p.water=0;if(p.manual){p.active=false;p.y=floor;p.delay=.16;return;}p.y=2.8+rnd()*.72;p.vy=-.45-rnd()*.4;p.delay=.18+rnd()*1.3;}
   });
   s.ripples.forEach((r,i)=>spring(r,23+i*.45,4.8,0,dt));
   const dusk=['dusk','lamp','night','dawn'].includes(s.phase);
   spring(s.evening,.20,.92,dusk?1:0,dt);
   spring(s.heat,3.6,3.9,['night','dawn'].includes(s.phase)?1:0,dt);
   s.lanternPulse.forEach(p=>spring(p,17,4.0,0,dt));
   s.street.forEach((l,i)=>spring(l,1+i*.22,2.2,clamp((s.heat.x-.07-.19*i)*3,0,1)+s.lanternPulse[i].x*.70,dt));
   spring(s.switch,32,4,0,dt);
 }
 function tick(dt){
   s.time+=dt;s.phaseAge+=dt;s.idle+=dt;air(dt);cardboard(dt);contents(dt);weather(dt);
   if(s.phase==='songEnd'&&s.phaseAge>1.7)nextBox(1);
   if(s.phase==='walkEnd'&&s.phaseAge>1.4)nextBox(2);
   if(s.phase==='door'&&s.door.x>1.3)prepareItem(6);
   if(s.phase==='dusk'&&s.evening.x>.61){s.stage=3;phase('lamp');}
   if(s.phase==='night'&&s.idle>14)phase('dawn');
   spring(s.camera,.8,1.85,s.stage*.18+(s.door.x*.13),dt);
   spring(s.fade,2.2,3,s.phase==='dawn'?1:0,dt);
   if(s.phase==='dawn'&&s.fade.x>.994)reset(s.cycle+1);
 }
 function step(dt){if(!Number.isFinite(dt)||dt<0)return;acc+=dt;while(acc+1e-10>=H){tick(H);acc-=H;} }
 return {step,getState:()=>JSON.parse(JSON.stringify(s)),read:()=>s,grab,release,tug,turn,dragItem,touch,
   events:()=>events.splice(0),nudge:i=>{if(s.boxes[i])s.boxes[i].wobble.v+=.065;}};
}
const api={create,parcels,destinations,steps};if(typeof module!=='undefined'&&module.exports)module.exports=api;else global.ParcelSim=api;
})(typeof window==='undefined'?globalThis:window);
