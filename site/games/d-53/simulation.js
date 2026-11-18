/* The simulation uses metres, seconds, Celsius and millimetres of water. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function random(seed){return ()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296)}
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
class Winter {
 constructor(aspect=1,seed=397){
  this.aspect=aspect;this.seed=seed;this.cycle=0;this.rng=random(seed);this.time=0;this.reset();
 }
 reset(){
  this.stage='frost';this.stageAge=0;this.idle=0;this.hold=0;this.contact=null;this.events=[];this.touchSpeed=0;
  this.height=1.62;this.width=this.height*this.aspect;this.rows=76;this.cols=clamp(Math.round(this.rows*this.aspect),32,136);
  let n=this.rows*this.cols;
  for(const k of ['temp','ice','water','initial','nextWater','flow','rubHeat'])this[k]=new Float32Array(n);
  this.temp.fill(-2);this.clear=0;this.mass=0;this.sillWater=0;this.dripped=0;this.warmRadius=0;this.windowHeat=0;
  for(let j=0;j<this.rows;j++)for(let i=0;i<this.cols;i++){
   let x=(i+.5)/this.cols,y=(j+.5)/this.rows,dx=(x-.48)*this.width,dy=(y-.545)*this.height;
   let a=Math.atan2(dy,dx),r=Math.hypot(dx,dy*1.15),edge=Math.min(.201,this.width*.193)*(1+.085*Math.sin(3*a+.44)+.048*Math.sin(5*a));
   const k=j*this.cols+i;
   this.initial[k]=this.ice[k]=smooth((r-edge*.78)/(edge*.36))*(.945+.055*this.rng());this.mass+=this.ice[k];
   this.water[k]=.095*Math.exp(-Math.pow((r-edge)/.021,2));
  }
  this.doorAngle=0;this.doorV=0;this.latchEngaged=false;this.latch=0;this.opened=false;this.travel=0;this.travelV=0;
  this.wind=.12;this.windTarget=.18;this.windClock=1.5;this.twig=0;this.twigV=0;this.glow=.2;this.shiver=0;this.shiverV=0;
  this.sun=0;this.pond=0;this.nextBird=6.4;this.birdLook=0;this.lookV=0;this.birdTarget=0;
  this.flight={x:-.019,y:1.218,z:-.677,vx:0,vy:0,vz:0,wing:0,wv:0,beat:0,settled:true};
  this.motes=Array.from({length:42},()=>({x:(this.rng()-.5)*3,y:.1+this.rng()*2.2,z:-1+this.rng()*2,vx:0,vy:(this.rng()-.5)*.012,drag:.6+this.rng(),phase:this.rng()*6.28}));
  this.patches=[];this.fragments=[];this.ripples=[];this.rippleClock=0;this.hintPatch=0;
  for(let j=0;j<3;j++)for(let i=0;i<3;i++){
   let x=(i-1)*.57+(j%2-.5)*.12+(this.rng()-.5)*.08,z=-2.05-j*.54+(this.rng()-.5)*.08;
   let p={x,z,ice:1,strain:0,impact:0,impactX:x,impactZ:z,heat:-2,water:0,dent:0,v:0,broken:false,columns:[]};
   for(let ix=0;ix<20;ix++)p.columns.push({dx:(this.rng()-.5)*.38,dz:(this.rng()-.5)*.3,h:.045+.08*this.rng(),strength:.13+.33*this.rng(),stress:0,intact:1,fall:0,v:0});
   this.patches.push(p);
  }
  this.runoffSound=0;
  this.leaf={x:-.12,z:-.035,vx:0,vz:0,tilt:0,spin:0,angle:-.34,grounded:false,wet:0};
  this.perched=0;this.sip=0;this.sipV=0;
 }
 setContact(kind,x=0,y=0){
  if(this.contact&&this.contact.kind===kind){const d=Math.hypot(x-this.contact.x,y-this.contact.y);
   if(kind==='glass'&&this.stage==='frost'&&d>.0001)this.sweptHeat(this.contact.x,this.contact.y,x,y);
   this.touchSpeed=Math.min(3,this.touchSpeed+d*11);if(d>.035)this.hold*=Math.exp(-d*7)}
  else {
   this.hold=0;
   if(kind==='glass'&&this.stage==='frost')this.sweptHeat(x,y,x,y);
   if(kind==='handle'&&this.stage==='door')this.latchEngaged=true;
   if(kind==='grass'&&this.stage==='grass')for(const p of this.patches){
    const r=Math.hypot(x-p.x,y-p.z);
    if(r<.29){p.impact=Math.exp(-r*r/.035)*1.5;p.impactX=x;p.impactZ=y}
   }
  }
  this.contact={kind,x,y};this.idle=0;
 }
 sweptHeat(x0,y0,x1,y1){
  const dx=(x1-x0)*this.width,dy=(y1-y0)*this.height,ds=dx*dx+dy*dy;
  const r=.024/(1+this.touchSpeed*.14);
  const xa=clamp(Math.floor((Math.min(x0,x1)-r/this.width)*this.cols),0,this.cols-1);
  const xb=clamp(Math.ceil((Math.max(x0,x1)+r/this.width)*this.cols),0,this.cols-1);
  const ya=clamp(Math.floor((Math.min(y0,y1)-r/this.height)*this.rows),0,this.rows-1);
  const yb=clamp(Math.ceil((Math.max(y0,y1)+r/this.height)*this.rows),0,this.rows-1);
  for(let j=ya;j<=yb;j++)for(let i=xa;i<=xb;i++){
   const px=((i+.5)/this.cols-x0)*this.width,py=((j+.5)/this.rows-y0)*this.height;
   const u=ds?clamp((px*dx+py*dy)/ds,0,1):0,w=Math.max(0,1-((px-dx*u)**2+(py-dy*u)**2)/(r*r));
   const k=j*this.cols+i;this.rubHeat[k]=Math.min(1,this.rubHeat[k]+w*(ds?Math.min(1,Math.sqrt(ds)/r):.85));
  }
 }
 release(){this.contact=null;this.hold=0}
 disturb(){this.shiverV=Math.min(.15,this.shiverV+.075);this.idle=0}
 change(stage){this.stage=stage;this.stageAge=0;this.release();this.idle=0;this.events.push({type:stage})}
 step(dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  for(let left=dt;left>1e-8;left-=.025)this.tick(Math.min(.025,left));
 }
 tick(d){
  this.time+=d;this.stageAge+=d;this.idle=this.contact?0:this.idle+d;
  this.touchSpeed*=Math.exp(-5*d);if(this.contact)this.hold+=d;
  this.windClock-=d;if(this.windClock<=0){this.windClock=1.3+this.rng()*3;this.windTarget=(this.rng()-.36)*.61}
  this.wind+=(this.windTarget-this.wind)*d*.65;
  this.twigV+=(this.wind*.48-this.twig*8-this.twigV*1.7)*d;this.twig+=this.twigV*d;
  this.shiverV+=(-this.shiver*55-this.shiverV*5)*d;this.shiver+=this.shiverV*d;
  this.glow+=(.31+this.wind*.51-this.glow)*d*.39;
  this.nextBird-=d;if(this.nextBird<0){this.birdTarget=(this.rng()-.5)*1.4;this.nextBird=3+this.rng()*8;this.events.push({type:'bird',pitch:this.rng()})}
  this.lookV+=((this.birdTarget-this.birdLook)*18-this.lookV*6)*d;this.birdLook+=this.lookV*d;
  if(this.stage==='frost'||this.stage==='door')this.glassStep(d);
  if(this.stage!=='frost')this.mechanism(d);
  if(['grass','sun','return'].includes(this.stage))this.groundStep(d);
  this.airStep(d);
  if(this.stage==='return'){let lost=0;for(let k=0;k<this.ice.length;k++){
   this.temp[k]+=(-2-this.temp[k])*d*(.78+.14*this.initial[k]);this.ice[k]+=(this.initial[k]-this.ice[k])*d*(.7+.35*this.initial[k]);this.water[k]*=Math.exp(-d*.8);this.flow[k]*=Math.exp(-d*2);lost+=this.initial[k]-this.ice[k];
  }this.clear=lost/this.mass}
  if(this.events.length>64)this.events.splice(0,this.events.length-64);
 }
 airStep(d){
  for(const p of this.motes){
   p.vx+=(this.wind*.12+Math.sin(p.z*2+p.phase)*.008-p.vx*p.drag)*d;
   p.vy+=((.005*Math.sin(p.x*3+p.phase))-.003*(p.y-.95)-p.vy*.32)*d;
   p.x+=p.vx*d;p.y+=p.vy*d;if(Math.abs(p.x)>2.3)p.vx-=Math.sign(p.x)*.04*d;
  }
  const f=this.flight;let x=-.019,y=1.218+this.twig*.28,z=-.677;
  if(this.stage==='walk'||this.stage==='grass'){x=.15;y=.64;z=-5.22}
  if(this.stage==='sun'){x=this.pond>1.3?.27:.15;y=this.pond>1.3?.006:.68;z=this.pond>1.3?-3.92:-5.22}
  const sipTarget=this.stage==='sun'&&this.pond>1.3&&f.settled?Math.max(0,1-this.perched*.14):0;
  this.sipV+=((sipTarget-this.sip)*21-this.sipV*6)*d;this.sip+=this.sipV*d;
  if(this.stage==='return'&&this.travel>.50){x=.15;y=.64;z=-5.22}
  const distance=Math.hypot(x-f.x,y-f.y,z-f.z);
  const lift=Math.min(.84,Math.abs(z-f.z)*.38);
  for(const [pos,vel,goal] of [['x','vx',x],['y','vy',y+lift],['z','vz',z]]){
   f[vel]+=((goal-f[pos])*4-f[vel]*3.4)*d;f[pos]+=f[vel]*d;
  }
  f.settled=distance<.06;f.beat-=d;
  if(!f.settled&&f.beat<=0){f.wv+=7+Math.min(6,distance*2);f.beat=.21+this.rng()*.09}
  f.wv+=(-f.wing*48-f.wv*4.3)*d;f.wing+=f.wv*d;
 }
 glassStep(d){
  const touching=this.stage==='frost'&&this.contact?.kind==='glass',c=this.contact;
  this.warmRadius=touching?(.043+.105*(1-Math.exp(-this.hold*.78)))/(1+.63*this.touchSpeed):0;
  let lost=0,out=0,wetEnergy=0;
  this.nextWater.set(this.water);
  for(let j=0;j<this.rows;j++)for(let i=0;i<this.cols;i++){
   const k=j*this.cols+i,u=(i+.5)/this.cols,v=(j+.5)/this.rows;
   let heat=0;
   if(touching){let dx=(u-c.x)*this.width,dy=(v-c.y)*this.height;heat=Math.exp(-(dx*dx+dy*dy)/(this.warmRadius*this.warmRadius)*1.75);if(heat<.003)heat=0}
   const t=this.temp[k],m=this.ice[k];
   let nearby=0;
   if(i&&i+1<this.cols&&j&&j+1<this.rows)nearby=(this.temp[k-1]+this.temp[k+1]+this.temp[k-this.cols]+this.temp[k+this.cols]-4*t)*.06;
   // Clear glass admits morning radiation. Only a cell bordering a thaw can receive it.
   let rim=0;if(this.clear>.045&&m>.005&&i&&j&&i+1<this.cols&&j+1<this.rows){
    const neighbor=Math.min(this.ice[k-1],this.ice[k+1],this.ice[k-this.cols],this.ice[k+this.cols]);
    rim=Math.max(0,m-neighbor)*Math.min(1,this.clear*4)*2.6;
   }
   const solar=this.stage==='door'?(1-this.ice[k]*.4)*(2.8+u*1.47):0;
   heat=Math.min(1,heat+this.rubHeat[k]);this.rubHeat[k]*=Math.exp(-d*8);
   this.temp[k]=clamp(t+d*((4-t)*heat*8+(-2-t)*.19*(1-heat)+nearby+rim+solar),-2,4);
   const melt=Math.min(m,Math.max(0,this.temp[k])*(.43+heat*.37)*d);
   this.ice[k]-=melt;this.nextWater[k]+=melt*.32;
   const mobile=Math.max(0,this.water[k]-(.016+m*.05));
   let down=Math.min(mobile,mobile*(3.4+mobile*5)*d);
   this.nextWater[k]-=down;this.flow[k]+=(down/d-this.flow[k])*Math.min(1,8*d);
   if(j)this.nextWater[k-this.cols]+=down;else out+=down;
   lost+=this.initial[k]-this.ice[k];wetEnergy+=melt;
  }
  [this.nextWater,this.water]=[this.water,this.nextWater];this.sillWater+=out;this.dripped+=out;
  this.windowHeat=wetEnergy/d;this.clear=lost/this.mass;
  this.runoffSound+=wetEnergy*.0015;
  if(this.runoffSound>1){this.runoffSound%=1;this.events.push({type:'trickle'})}
  if(this.sillWater>.36){this.sillWater%=.36;this.events.push({type:'drop'})}
  if(this.stage==='frost'&&this.clear>.52)this.change('door');
 }
 mechanism(d){
  let target=0;
  if(this.stage==='door'){
   if(this.latchEngaged)this.latch=clamp(this.latch+d*2.35,0,1);
   else if(!this.opened)this.latch=Math.max(0,this.latch-d*.3);
   if(this.latch>=.75&&!this.opened){this.opened=true;this.events.push({type:'click'})}
   target=this.opened?1.46:0;
  }else if(this.stage!=='return')target=1.46;
  else target=this.travel>.45?1.46:0;
  this.doorV+=((target-this.doorAngle)*3.4-this.doorV*2.8)*d;this.doorAngle+=this.doorV*d;
  if(this.stage==='door'&&this.doorAngle>1.09)this.change('walk');
  let dest=this.stage==='return'?0:this.stage==='door'?this.travel:1;
  this.travelV+=((dest-this.travel)*.95-this.travelV*1.95)*d;this.travel=clamp(this.travel+this.travelV*d,0,1);
  if(this.stage==='walk'&&this.travel>.985){this.change('grass')}
  if(this.stage==='return'){
   this.latch=Math.max(0,this.latch-d*(1-this.travel)*.85);
   if(this.travel<.002&&this.doorAngle<.012&&this.pond<.006){
    this.perched=0;this.leaf.wet=0;this.leaf.grounded=false;
    this.cycle++;this.opened=false;this.latchEngaged=false;this.sillWater=0;this.change('frost');
   }
  }
 }
 groundStep(d){
  const c=this.contact;let broken=0,liquid=0;
  for(let n=0;n<this.patches.length;n++){
   const p=this.patches[n];let pressure=0;
   if(c?.kind==='grass'&&this.stage==='grass'){const r=Math.hypot(c.x-p.x,c.y-p.z);pressure=Math.exp(-r*r/.045)}
   if(this.stage==='grass')p.heat+=((4-p.heat)*pressure*.8-(p.heat+2)*.048)*d;
   p.strain+=((pressure*1.15)-p.strain)*Math.min(1,d*(pressure?5:2));
   let intact=0;
   for(let j=0;j<p.columns.length;j++){
    const col=p.columns[j],r=c?Math.hypot(p.x+col.dx-c.x,p.z+col.dz-c.y):10;
    const impactDistance=(p.x+col.dx-p.impactX)**2+(p.z+col.dz-p.impactZ)**2;
    const load=pressure*Math.exp(-r*r/.065)+p.impact*Math.exp(-impactDistance/.037);
    col.stress+=(load*2.4-col.stress*.9)*d;
    if(col.intact&&col.stress>col.strength){
     col.intact=0;col.v=.3+this.rng()*.5;
     if(j%3===0){this.events.push({type:'crunch',power:col.strength});this.fragments.push({x:p.x+col.dx,z:p.z+col.dz,y:col.h,vx:(this.rng()-.5)*.28,vz:(this.rng()-.5)*.22,vy:.22+this.rng()*.36,spin:this.rng()*6,angle:0,life:1})}
    }
    if(this.stage==='return'&&p.heat<-.2){
     col.fall*=Math.exp(-d*(1.65-col.strength));col.v=0;if(col.fall<.012)col.intact=1;
    }else if(!col.intact&&col.fall<1.4){col.v+=(5-col.v*3)*d;col.fall=Math.min(1.4,col.fall+col.v*d)}
    intact+=col.intact;
   }
   p.impact*=Math.exp(-d*7.2);
   if(this.stage==='return'&&intact===20)p.broken=false;else if(intact<9)p.broken=true;if(p.broken)broken++;
   p.v+=((p.strain*.033-p.dent)*70-p.v*9)*d;p.dent+=p.v*d;
   if(this.stage==='return'){
    p.heat+=(-2-p.heat)*d*(.95+.12*n);p.water*=Math.exp(-d*(1.02+.06*n));
    if(p.heat<0)p.ice+=(1-p.ice)*d*(-p.heat)*(.68+.019*n);
   }
   if(this.stage==='sun'){
    const focused=c?.kind==='sunIce'?Math.exp(-((c.x-p.x)**2+(c.y-p.z)**2)/.060):0;
    const light=focused*.90+this.sun*(.65+.22*Math.sin(n*11.6)+.42*(1-intact/20));
    p.heat+=(light*3.8-(p.heat+2)*.57)*d;
    const melt=Math.min(p.ice,Math.max(0,p.heat)*d*.025*(1+.5*p.strain));p.ice-=melt;p.water+=melt*.68;
    const drain=Math.max(0,p.water-.028)*d*(.36+.03*n);p.water-=drain;liquid+=drain;
   }
  }
  for(let k=this.fragments.length-1;k>=0;k--){
   const f=this.fragments[k];f.vy-=3.3*d;f.y+=f.vy*d;f.x+=f.vx*d;f.z+=f.vz*d;f.angle+=f.spin*d;
   if(f.y<.008){f.y=.008;f.vy=0;f.vx*=.8;f.vz*=.8;f.spin*=.7;f.life-=d*.55}
   if(f.life<=0)this.fragments.splice(k,1);
  }
  this.hintPatch=this.patches.findIndex(p=>!p.broken);
  if(this.stage==='grass'&&broken>=6)this.change('sun');
  if(this.stage==='sun'||this.stage==='return'){
   if(this.stage==='return'){
    this.sun*=Math.exp(-d*(.55+.49*(1-this.travel)));this.pond*=Math.exp(-d*(.20+.83*(1-this.travel)));
   }else this.sun+=(1-this.sun)*(.045+.018*this.glow)*d;
   this.pond+=liquid;
   this.rippleClock-=d;
   if(this.stage==='sun'&&c?.kind==='pool'&&this.rippleClock<=0){this.ripples.push({x:c.x,z:c.y,r:.012,v:.19,amp:1});this.rippleClock=.65;this.events.push({type:'pool'})}
   for(const r of this.ripples){r.r+=r.v*d;r.v*=Math.exp(-.32*d);r.amp*=Math.exp(-1.1*d)}
   this.ripples=this.ripples.filter(r=>r.amp>.035);
   this.floatLeaf(d);
   if(this.stage==='sun'&&this.pond>5.37&&this.leaf.grounded&&!this.contact&&this.flight.settled){
    this.perched+=d;if(this.perched>2.2)this.change('return');
   }
  }
 }
 floatLeaf(d){
  const l=this.leaf,c=this.contact;
  const radius=Math.sqrt(this.pond)*.27;
  let fx=(.026+this.wind*.039)*this.sun,fz=.005*this.wind;
  for(const r of this.ripples){
   const x=l.x-r.x,z=l.z-(r.z+2.6),distance=Math.hypot(x,z);
   const pressure=r.amp*Math.exp(-((distance-r.r)**2)/.0018)*.29;
   if(distance>.002){fx+=pressure*x/distance;fz+=pressure*z/distance}
  }
  if(c?.kind==='leaf'){
   fx+=(c.x-l.x)*2.7;fz+=(c.y+2.6-l.z)*2.7;
  }
  l.wet+=((radius>.14?1:0)-l.wet)*d*1.4;
  l.vx+=(fx*l.wet-l.vx*.99)*d;l.vz+=(fz*l.wet-l.vz*.99)*d;
  l.x+=l.vx*d;l.z+=l.vz*d;
  const dist=Math.hypot(l.x,l.z*1.5);
  l.grounded=dist>=radius*.98&&radius>.20;
  if(dist>radius&&radius>.14){
   const excess=dist-radius,stiffness=this.stage==='return'?2.0:9.0;
   l.vx-=((l.x/dist)*excess*stiffness+l.vx*2.2)*d;l.vz-=((l.z*2.25/dist)*excess*stiffness+l.vz*2.2)*d;
  }
  if(this.stage==='return'){l.vx+=((-.12-l.x)*1.2-l.vx*1.7)*d;l.vz+=((-.035-l.z)*1.2-l.vz*1.7)*d}
  l.spin+=((l.vx*.8-l.vz*.32)-l.spin*1.4)*d;l.angle+=l.spin*d;
  l.tilt+=((l.vx+l.vz)*.94-l.tilt)*d*4;
 }
 getState(){
  const copy=k=>Array.from(this[k]);
  return {time:this.time,stage:this.stage,cycle:this.cycle,cols:this.cols,rows:this.rows,temp:copy('temp'),ice:copy('ice'),water:copy('water'),flow:copy('flow'),clear:this.clear,warmRadius:this.warmRadius,twig:this.twig,glow:this.glow,flight:{...this.flight},doorAngle:this.doorAngle,latch:this.latch,travel:this.travel,dripped:this.dripped,sun:this.sun,pond:this.pond,patches:this.patches.map(p=>({x:p.x,z:p.z,heat:p.heat,ice:p.ice,water:p.water,dent:p.dent,broken:p.broken,columns:p.columns.map(c=>({stress:c.stress,fall:c.fall,intact:c.intact}))})),leaf:{...this.leaf},ripples:this.ripples.map(r=>({...r})),hint:this.idle>=4};
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports={Winter,random};else Object.assign(root,{Winter,winterRandom:random});
})(globalThis);
