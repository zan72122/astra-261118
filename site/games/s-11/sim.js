/* The kitchen uses decimetres, kilograms, seconds and degrees Celsius. Each material patch
   exchanges momentum and heat with the four patches next to it. */
(function (root) {
  'use strict';
  const clamp = (n, a=0, b=1) => Math.min(b, Math.max(a,n));
  const N=13, COUNT=N*N;
  const phases=['whisk','peak','fold','ribbon','pour','push','bath','bake','cool','peel','serve','return'];
  class Kitchen {
    constructor(options={}) {
      this.seed=options.seed || 8021;
      this.batch=0; this.time=0;
      this.weather={draft:.026, target:.03, next:0, light:.82, sunset:0};
      this.reset(options);
    }
    random() { this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0; return this.seed/4294967296; }
    reset(o={}) {
      this.phase='whisk'; this.age=0; this.idle=0; this.batch++;
      this.mass=o.mass ?? .42; this.moved=0; this.sugar=0; this.dose=0; this.portion=0; this.doseRest=0;
      this.popped=false; this.popAge=0; this.foldWork=0; this.foldLoad=0; this.foldDirection=0;
      this.tool={x:-.06,z:.04,lift:0,vx:0,vz:0,vy:0,tx:-.06,tz:.04,tl:0};
      this.wires=Array.from({length:7},(_,i)=>({u:i/6,bend:0,speed:0}));
      this.trail=Array.from({length:144},()=>({x:0,z:0,vx:0,vz:0,radius:0,size:0,life:0,age:0}));this.stride=0;this.beadIndex=0;
      this.transfer=0;this.touch=false; this.wiggle=0; this.pourTilt=0; this.pourRequest=0;
      this.pan=0; this.panTarget=0; this.water=0; this.peel=0; this.paperTarget=0; this.turn=0; this.turnTarget=0;
      this.kettleHeat=92; this.steam=0; this.bandHz=590; this.noise=0; this.peak=0; this.falling=0; this.ribbon=0; this.charge=0;
      this.cells=Array.from({length:COUNT},(_,i)=>{
        const x=(i%N-6)/6,z=(Math.floor(i/N)-6)/6, r=Math.hypot(x,z);
        return {x,z,r,h:.004*Math.sin(4*x+2*z),v:0,air:o.air ?? .017+.012*this.random(),
          fine:o.fine ?? .028, cut:0,white:0, swirl:0, sugar:0, heat:21+.5*x,
          moisture:.85-.02*r, set:0,brown:0, fill:0,gas:0, rise:0,jig:0,jv:0};
      });
      this.valid=this.cells.filter(c=>c.r<=1.08);
      this.neighbors=this.cells.map((c,i)=>[i%N>0?i-1:i,i%N<N-1?i+1:i,i>=N?i-N:i,i<COUNT-N?i+N:i].map(j=>this.cells[j].r<=1.1?j:i));
      this.oldH=new Float64Array(COUNT); this.oldT=new Float64Array(COUNT); this.oldJ=new Float64Array(COUNT);this.oldFill=new Float64Array(COUNT);this.oldGas=new Float64Array(COUNT);
      this.refresh();
    }
    refresh() {
      const fields=['air','fine','white','heat','set','rise','brown','fill','gas','moisture'];
      const m={}; for(const k of fields) { let s=0; for(const c of this.valid)s+=c[k]; m[k]=s/this.valid.length; } this.mean=m;
    }
    enter(p) {
      this.phase=p; this.age=0; this.idle=0; this.touch=false;
      if(p==='fold') {
        this.tool.tx=-.25; this.tool.tz=.1; this.tool.tl=0;
      }
    }
    down(active=true) {
      if(!active){ this.wiggle=.018; return; }
      this.touch=true; this.idle=0;
    }
    drag(dx,dz,lift=0) {
      if(!this.touch) return;
      this.idle=0; const t=this.tool;
      if(this.phase==='whisk'||this.phase==='fold') {
        t.tx=clamp(t.tx+dx,-.91,.91); t.tz=clamp(t.tz+dz,-.88,.88);
        const dist=Math.hypot(t.tx,t.tz); if(dist>.94){t.tx*=.94/dist;t.tz*=.94/dist;}
        t.tl=clamp(lift);
      } else if(this.phase==='pour') this.pourRequest=clamp(this.pourRequest+Math.abs(dx)*.55+Math.abs(dz)*.6);
      else if(this.phase==='push') this.panTarget=clamp(this.panTarget+Math.abs(dz)*.8+Math.abs(dx)*.28);
      else if(this.phase==='peel') this.paperTarget=clamp(this.paperTarget+Math.abs(dx)*.24);
      else if(this.phase==='serve') this.turnTarget=clamp(this.turnTarget+Math.abs(dx)*.41+Math.abs(dz)*.16);
    }
    up(){ this.touch=false; this.tool.tl=0; }
    step(dt) {
      if(!Number.isFinite(dt)||dt<=0)return;
      let left=dt;
      while(left>1e-8){ const d=Math.min(1/60,left); this.tick(d); left-=d; }
    }
    tick(d) {
      this.time+=d; this.age+=d; if(!this.touch)this.idle+=d;
      const w=this.weather, t=this.tool, ph=this.phase;
      w.next-=d;if(w.next<=0){ w.target=(this.random()-.43)*.14; w.next=1.3+this.random()*2.7; }
      w.draft+=(w.target-w.draft)*d*.9;
      w.sunset+=d*(ph==='bake'?.013:.00065); w.light+=(.8+.15*Math.cos(w.sunset)+w.draft*.8-w.light)*d*.32;
      this.wiggle*=Math.exp(-6*d); this.popAge+=this.popped?d:0;
      if(ph==='peak')t.tl=.96;
      if(ph==='ribbon')t.tl=.76;
      for(const [key,vk,goal] of [['x','vx','tx'],['z','vz','tz'],['lift','vy','tl']]){
        t[vk]+=((t[goal]-t[key])*110-t[vk]*17)*d; t[key]+=t[vk]*d;
      }
      const speed=Math.min(4,Math.hypot(t.vx,t.vz)), whisk=ph==='whisk', fold=ph==='fold';
      if(whisk&&!this.popped&&Math.abs(t.x+.06)>.048){this.popped=true;this.popAge=0;}
      this.doseRest=Math.max(0,this.doseRest-d);
      if(whisk&&!this.dose&&this.portion<3&&this.popped&&this.doseRest===0&&this.mean.air>.064+this.portion*.065){this.portion++;this.dose=1;}
      if(this.dose){this.sugar=Math.min(this.portion/3,this.sugar+d*.112);
        if(this.sugar>=this.portion/3){this.dose=0;this.doseRest=1.15;}}
      const depth=1-t.lift*.76;
      const foamFlow=ph==='peak'?Math.min(1-this.transfer,d*.60*clamp((this.age-1.85)*2.5)):0;
      this.transfer+=foamFlow;
      for(const part of this.wires){
        const px=clamp((t.x+.19*part.u+1)*6,0,12)|0,pz=clamp((t.z+1)*6,0,12)|0;
        const patch=this.cells[pz*N+px];
        const load=whisk?-t.vx*depth*(patch.fine+.23)*(1-part.u)**2:0;
        part.speed+=d*(load*2.5-part.bend*(50+22*part.u)-part.speed*5.7);
        part.bend+=d*part.speed;
      }
      const returning=fold&&t.vz<-.06;
      if(fold){this.foldLoad=clamp(this.foldLoad+d*(Math.max(0,t.vz)*1.7+Math.abs(t.vx)*.19-(returning?1.1:.09)*this.foldLoad));
        this.foldWork+=d*speed*(.16+.84*this.foldLoad+.36*Math.max(0,-t.vz));}
      this.pourTilt+=(this.pourRequest-this.pourTilt)*(1-Math.exp(-d*2.8));
      const flow=ph==='pour'?Math.min(this.mass-this.moved,d*this.pourTilt*.089):0;
      this.moved+=flow; this.pan+=(this.panTarget-this.pan)*(1-Math.exp(-d*4.2));
      if(ph==='bath')this.water=clamp(this.water+d*.22);
      const oldPeel=this.peel; this.peel+=(this.paperTarget-this.peel)*(1-Math.exp(-d*8));
      const peelSpeed=(this.peel-oldPeel)/d;
      this.turn+=(this.turnTarget-this.turn)*(1-Math.exp(-d*3.5));
      for(let i=0;i<COUNT;i++){const c=this.cells[i];this.oldH[i]=c.h;this.oldT[i]=c.heat;this.oldJ[i]=c.jig;this.oldFill[i]=c.fill;this.oldGas[i]=c.gas;}
      let localAir=0,localFine=0,totalWeight=0;
      const srcX=.43*Math.sin(this.moved*10),srcZ=-.22+.25*this.pan;
      let normalization=0;
      if(flow)for(const c of this.valid)normalization+=.45+Math.exp(-2*((c.x-srcX)**2+(c.z-srcZ)**2));
      for(let i=0;i<COUNT;i++){
        const c=this.cells[i],dx=c.x-t.x,dz=c.z-t.z,near=Math.exp(-(dx*dx+dz*dz)*5.7);
        const ns=this.neighbors[i]; let lap=0,tlap=0,jlap=0;
        for(const j of ns){lap+=this.oldH[j]-this.oldH[i];tlap+=this.oldT[j]-this.oldT[i];jlap+=this.oldJ[j]-this.oldJ[i];}
        const stroke=(whisk||fold)?speed*near*depth:0;
        const force=(t.vx*dx+t.vz*dz)*near*depth;
        c.v+=d*(20*lap-11*c.h-c.v*(2.1+4*c.fine)+w.draft*(.06+.14*c.x)+((whisk||fold)?force*.91:0));
        c.h+=c.v*d;
        if(whisk){
          const oldAir=c.air;
          c.air=clamp(c.air+d*(stroke*.059*(1-c.air)*(1.25-.28*c.r)-.00012*(.91+.12*c.r)*c.air));
          c.fine=clamp(c.fine+d*stroke*(.22*oldAir+.024)*(1-c.fine));
          c.sugar=clamp(c.sugar+d*(this.sugar-c.sugar)*(.36+.18*c.x+stroke));
        }
        c.cut=clamp(c.cut+d*(stroke*(.4+c.air)*(1-c.cut)-c.cut*(2.45/(1+8*c.air+12*c.fine+2*c.sugar))));
        if(foamFlow)c.white+=foamFlow*(.15+.82*Math.exp(-3*((c.x+.26)**2+(c.z-.12)**2)));
        if(fold){
          const shear=stroke*(.24+this.foldLoad*.88);
          c.swirl+=d*shear*(.5+Math.max(0,-t.vz))*(1-.3*c.r);
          c.white*=Math.exp(-d*shear*.27);
        }
        if(flow&&c.r<=1.08){
          const dm=flow*(.45+Math.exp(-2*((c.x-srcX)**2+(c.z-srcZ)**2)))/normalization;
          c.fill+=dm; c.rise+=dm*this.valid.length*.90; c.gas+=dm*c.air*(.82+.15*c.fine);
        }
        if(c.r<=1.08&&(ph==='pour'||ph==='push'||ph==='bath'||ph==='bake')){
          const mobility=ph==='bake'?Math.max(0,1-this.mean.set)**2:1;
          let liquid=0,gas=0;for(const j of ns){liquid+=this.oldFill[j]-this.oldFill[i];gas+=this.oldGas[j]-this.oldGas[i];}
          c.fill+=d*1.35*mobility*liquid;c.gas+=d*1.35*mobility*gas;
        }
        if(ph==='bake'||ph==='cool'||ph==='peel'||ph==='serve'){
          const oven=ph==='bake', outside=oven?154+9*c.x:25;
          c.heat+=d*((outside-c.heat)*(oven?.042+.018*c.r:.10+.025*c.r)+tlap*.08);
          if(oven){
            c.moisture=clamp(c.moisture-d*.00020*Math.max(0,c.heat-68)*(.6+.4*c.r));
            c.set=clamp(c.set+d*.0041*Math.max(0,c.heat-56)*(1-c.set));
            c.brown=clamp(c.brown+d*.00097*Math.max(0,c.heat-93)*(1-c.moisture)*(1-c.brown));
          }
          const load=c.fill*this.valid.length, foam=c.fill?c.gas/c.fill:0;
          const desired=load*(.81+.43*(1-Math.min(1,c.r)**2))*(1+foam*(.45+1.55*c.set))*(1+.0018*(c.heat-21));
          c.rise+=(desired-c.rise)*(1-Math.exp(-d*(.3+.12*c.r)));
        }
        c.jv+=d*(jlap*11-(37+15*c.set)*c.jig-(2.1+.6*c.r)*c.jv+Math.tanh(2.15*peelSpeed)*(3.9+3.1*c.x)*Math.cos(2.6*c.z));
        c.jig+=c.jv*d;
        localAir+=near*c.air;localFine+=near*c.fine;totalWeight+=near;
      }
      if(whisk&&this.popped){
        this.stride+=speed*d*depth;
        if(this.stride>.076){this.stride%=.076;
          for(let j=0;j<2;j++){const bead=this.trail[this.beadIndex++%this.trail.length];
            if(bead.life>0)continue;
            bead.x=t.x+(this.random()-.5)*.14;bead.z=t.z+(this.random()-.5)*.12;
            bead.vx=t.vx*.065;bead.vz=t.vz*.065;bead.age=0;bead.radius=.025+.044*this.random();bead.life=1.9+this.random()*2.6;bead.size=0;
          }
        }
      }
      for(const b of this.trail){if(b.life<=0)continue;
        b.age+=d;b.life=Math.max(0,b.life-d);const c=this.cells[Math.round(clamp((b.z+1)*6,0,12))*N+Math.round(clamp((b.x+1)*6,0,12))];
        b.x+=b.vx*d;b.z+=b.vz*d;b.vx+=d*(-2.7*b.vx+w.draft*.04);b.vz-=d*b.vz*2.7;
        b.size=b.radius*(1-.75*c.fine)*clamp(b.age*9)*clamp(b.life*2.1);
      }
      this.refresh();
      const la=localAir/totalWeight,lf=localFine/totalWeight;
      this.charge=clamp(la*1.8+lf*1.2);
      this.bandHz=whisk?590+3850*this.charge:1050+520*(ph==='pour'?this.pourTilt:0);
      this.kettleHeat+=d*(25-this.kettleHeat)*.0016;
      this.peak+=d*((Math.max(0,t.vy)*(.18+.64*this.charge)+t.lift*.52*this.charge)*(1-this.peak)-this.peak*(.27+2.3*(1-this.charge)));
      this.falling+=d*(t.lift*(1-this.charge)-this.falling)*3;
      this.ribbon+=d*((ph==='ribbon'?1:Math.min(1,this.foldLoad*Math.max(0,-t.vz)))-this.ribbon)*3;
      this.noise+=d*((whisk||fold?Math.min(1,speed*.64):0)-this.noise)*9;
      this.steam+=d*((ph==='bath'||ph==='bake'?this.water*(.46+.01*Math.max(0,this.mean.heat-30)):Math.max(0,(this.mean.heat-40)/110))-this.steam)*1.2;
      if(whisk&&this.popped&&this.mean.air>.226&&this.mean.fine>.27&&this.sugar>.995)this.enter('peak');
      else if(ph==='peak'&&this.age>4.5)this.enter('fold');
      else if(fold&&this.mean.white<.162&&this.foldWork>12)this.enter('ribbon');
      else if(ph==='ribbon'&&this.age>4.4)this.enter('pour');
      else if(ph==='pour'&&this.moved>=this.mass-.0001)this.enter('push');
      else if(ph==='push'&&this.pan>.985)this.enter('bath');
      else if(ph==='bath'&&this.water>=1&&this.age>6.5)this.enter('bake');
      else if(ph==='bake'&&this.mean.brown>.28&&this.mean.set>.95)this.enter('cool');
      else if(ph==='cool'&&this.mean.heat<40)this.enter('peel');
      else if(ph==='peel'&&this.peel>.986&&this.valid.every(c=>Math.abs(c.jig)<.004&&Math.abs(c.jv)<.027))this.enter('serve');
      else if(ph==='serve'&&this.turn>.985)this.enter('return');
      else if(ph==='return'&&this.age>7.5)this.reset();
    }
    getState(){
      return {time:this.time,batch:this.batch,phase:this.phase,age:this.age,idle:this.idle,mean:{...this.mean},tool:{...this.tool},weather:{...this.weather},
        trail:this.trail.filter(b=>b.life>0).map(b=>({...b})),wireBend:this.wires.map(w=>w.bend),transfer:this.transfer,mass:this.mass,moved:this.moved,popped:this.popped,popAge:this.popAge,sugar:this.sugar,peak:this.peak,falling:this.falling,
        bandHz:this.bandHz,noise:this.noise,kettleHeat:this.kettleHeat,ribbon:this.ribbon,peel:this.peel,turn:this.turn,water:this.water,pan:this.pan,steam:this.steam,cells:this.cells.map(c=>({...c}))};
    }
  }
  const api={Kitchen,phases,N,clamp};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.Pastry=api;
})(globalThis);
