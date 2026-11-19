/* One scene unit is 40 mm. The polar grid stays attached to the biscuit. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, N = 32, R = 8;
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const wrap = a => Math.atan2(Math.sin(a),Math.cos(a));
  const damp = (a,b,k,dt) => a+(b-a)*(-Math.expm1(-k*dt));
  const ease = x => (x=clamp(x,0,1),x*x*(3-2*x));
  function Kitchen(options={}) {
    this.options=options;
    this.time=0; this.idle=0; this.cycle=0; this.seed=71543;
    this.air=.1; this.airTarget=.12; this.draftIn=.46;
    this.dust=Array.from({length:18},(_,i)=>({x:Math.sin(i*72.3)*3.8, y:.4+(i*.653)%3.5,
      z:Math.cos(i*37.4)*1.6,v:.009+.009*Math.sin(i),age:i*.39}));
    this.plume=Array.from({length:14},(_,i)=>({x:0,flow:0,heat:.8-i*.045}));
    this.angle=0; this.spin=0; this.goalAngle=0; this.spinActive=false;
    this.toolFlex=0; this.flexV=0; this.hint=0; this.events=[];
    this.reset();
  }
  Kitchen.prototype.rand=function(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296};
  Kitchen.prototype.reset=function(){
    this.stage='scoop';this.age=0;this.idle=0;this.hint=0;
    this.mass=this.options.mass??1; this.radius=.91*Math.cbrt(this.mass);
    this.cells=Array.from({length:R*N},(_,i)=>{
      const t=(i%N+.5)*TAU/N, p=(Math.floor(i/N)+.5)*1.53/R;
      return {temp:13.3+1.5*Math.sin(t)*Math.sin(p)+.42*Math.cos(p*2),
        wet:(this.options.moisture??.79)+.035*Math.cos(t+.4)*Math.sin(p),load:0,height:0,vel:0,
        viscosity:1.25,firm:0.59};
    });
    this.creamY=2.04;this.creamV=0;this.squash=0;this.squashV=0;
    this.seated=false;this.rimReveal=0;this.scoopAway=0;this.bagAway=0;this.gaze=0;this.align=0;this.tray=0;this.serve=0;this.bite=0;this.refill=0;
    this.garnish=0;this.crownV=0;this.crownLift=0;this.crownDrag=false;
    this.nozzle={a:-.57,p:1.19,ta:-.57,tp:1.19,speed:0,pressure:0};
    this.strokes=[];this.relaxing=[];this.cutting=[];this.stroke=null;this.lastCut=0;this.extruded=0;
    this.biteAngle=0;this.biteThickness=0;this.spoon=0;this.toolFlex=0;this.flexV=0;
    this.spin=0;this.goalAngle=this.angle;this.spinActive=false;
  };
  Kitchen.prototype.go=function(s){this.stage=s;this.age=0;this.idle=0;this.hint=0;this.events.push(s)};
  Kitchen.prototype.touch=function(){this.idle=0;this.hint=0};
  Kitchen.prototype.press=function(){if(this.stage!=='scoop')return false;this.touch();this.flexV=-1.7;
    this.squashV=.65;this.go('drop');return true};
  Kitchen.prototype.index=function(a,p){return clamp(Math.floor(p/1.55*R),0,R-1)*N+((Math.floor(a/TAU*N)%N)+N)%N};
  Kitchen.prototype.surface=function(a,p,h=0){
    const r=this.radius+h;
    return [r*Math.sin(p)*Math.sin(a),.79+(this.radius*1.04+h)*Math.cos(p),r*Math.sin(p)*Math.cos(a)];
  };
  Kitchen.prototype.aim=function(a,p){this.nozzle.ta=this.nozzle.a+wrap(a-this.nozzle.a);this.nozzle.tp=clamp(p,.075,1.53);this.touch()};
  Kitchen.prototype.startPipe=function(){if(!['pipe','decorate'].includes(this.stage)||this.stroke)return false;
    this.touch();this.stroke={points:[],fold:0,length:0,tail:0,cut:false,balance:0};this.strokes.push(this.stroke);
    this.events.push('hiss');this.deposit(1/120);return true};
  Kitchen.prototype.endPipe=function(){if(!this.stroke)return;
    this.stroke.cut=true;this.cutting.push(this.stroke);this.lastCut=this.stroke.points.length;this.stroke=null;
    this.events.push('cut');if(this.stage==='pipe')this.go('rim');this.touch()};
  Kitchen.prototype.turn=function(swipe){if(!['rim','decorate','turning'].includes(this.stage))return false;
    if(this.stroke)this.endPipe();this.touch();
    this.goalAngle=this.angle+Math.sign(swipe||1)*Math.PI*clamp(Math.abs(swipe)||1,.86,1.5);
    this.spinActive=true;if(this.stage==='rim')this.go('turning');return true};
  Kitchen.prototype.top=function(){if(this.stage!=='decorate')return false;
    this.endPipe();this.crownDrag=false;this.go('crown');return true};
  Kitchen.prototype.handOver=function(direction=0){if(this.stage!=='tray')return false;
    this.biteAngle=wrap(direction-this.angle);
    let sum=0;for(let j=2;j<R;j++)for(let k=-1;k<=1;k++)sum+=this.cells[this.index(this.biteAngle+k*.13,(j+.5)*1.55/R)].height;
    this.biteThickness=sum/((R-2)*3);this.go('serving');return true};
  Kitchen.prototype.ambient=function(dt){
    this.draftIn-=dt;if(this.draftIn<=0){this.airTarget=this.rand()*.66-.21;this.draftIn=.65+this.rand()*1.9}
    this.air=damp(this.air,this.airTarget,.75,dt);
    for(let j=this.plume.length-1;j>=0;j--){const p=this.plume[j],below=this.plume[j-1];
      const inflow=below?below.heat*.952:.88+.08*this.air;
      p.heat=damp(p.heat,inflow,3.8,dt);
      p.flow+=dt*(this.air*(.22+j*.042)+.40*(below?below.x-p.x:0)-1.35*p.flow-.64*p.x);
      p.x+=p.flow*dt;
    }
    for(const d of this.dust){d.age+=dt;d.v=damp(d.v,.022+this.air*.048+.013*Math.sin(d.z*2+d.y),.9,dt);
      d.x+=(this.air*.055+.009*Math.sin(d.y+d.age*.38))*dt;d.y+=d.v*dt;}
  };
  Kitchen.prototype.material=function(dt){
    for(let j=0;j<R;j++)for(let i=0;i<N;i++){
      const c=this.cells[j*N+i], n=this.cells[j*N+(i+1)%N], exposure=.62-.32*Math.sin((i+.5)*TAU/N)*((j+1)/R);
      c.temp+=dt*((22.2+c.load*.6-c.temp)*.0062*exposure/this.mass+(n.temp-c.temp)*.018+this.air*.018);
      c.wet-=dt*.00036*exposure*clamp(c.wet-.22,0,1)*(1+.08*(c.temp-12))/(1+c.height*2.4);
      c.viscosity=1.05+(1-c.wet)*1.9+(18-c.temp)*.022;
      c.firm=.34+.51*(1-c.wet)+.013*(22-c.temp);
      const rest=.46*(1-Math.exp(-c.load/.46))/(.84+.24*c.firm);
      c.vel+=(70*(rest-c.height)-12*c.viscosity*c.vel)*dt;c.height+=c.vel*dt;
    }
  };
  Kitchen.prototype.deposit=function(dt){
    const q=this.nozzle,s=this.stroke;
    const resistance=this.cells[this.index(q.a-this.angle,q.p)].viscosity;
    const follow=-Math.expm1(-dt*18/resistance);
    const da=wrap(q.ta-q.a)*follow,dp=(q.tp-q.p)*follow;
    q.a+=da;q.p+=dp;
    const dist=Math.hypot(da*Math.sin(q.p),dp)*this.radius;
    q.speed=damp(q.speed,dist/dt,9,dt);
    const a=q.a-this.angle,cell=this.cells[this.index(a,q.p)];
    q.pressure=damp(q.pressure,s?1/cell.viscosity:0,s?7:12,dt);
    if(!s)return;
    const volume=dt*q.pressure*.31;this.extruded+=volume;
    const ia=Math.floor(a*N/TAU),ip=clamp(Math.floor(q.p/1.55*R),0,R-1);
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
      const u=clamp(ip+j,0,R-1),v=((ia+i)%N+N)%N;
      this.cells[u*N+v].load+=volume*(i===0?1:.36)*(j===0?1:.48);
    }
    s.length+=dist;s.balance+=dist+dt*.31*q.pressure;
    // A faster pull keeps a longer length under tension between contacts.
    const tension=q.speed/(q.speed+.65),span=.024+.16*tension*tension;
    const slow=1/(1+q.speed*3.2);s.fold+=dist*(7+25*slow)+dt*11*slow;
    if(s.points.length && s.balance<span)return;
    s.balance=0;
    const f=(.006+.046*slow)*Math.sin(s.fold);
    const prev=s.points[s.points.length-1];
    const dir=dist>.0002?Math.atan2(dp,da*Math.sin(q.p)):(prev?prev.dir:0);
    const strandPoint={a:a-f*Math.sin(dir)/Math.max(.25,Math.sin(q.p)),p:clamp(q.p+f*Math.cos(dir),.04,1.55),
      h:cell.height+.018,dir:prev?prev.dir+wrap(dir-prev.dir)*.46:dir,fold:.006+.046*slow,wet:cell.wet,
      birth:this.time,thick:.019+.006*q.pressure,span,tension,
      rest:cell.height+.015,dropV:0};
    strandPoint.h+=.018*tension;
    s.points.push(strandPoint);this.relaxing.push(strandPoint);
  };
  Kitchen.prototype.tick=function(dt){
    this.time+=dt;this.age+=dt;this.idle+=dt;this.ambient(dt);this.material(dt);
    this.hint=damp(this.hint,this.idle>4&&!this.stroke?1:0,4,dt);
    const force=this.stage==='scoop'?(.58+this.hint*.6)*Math.sin(this.time*3.6):0;
    this.flexV+=(force-32*this.toolFlex-3.4*this.flexV)*dt;this.toolFlex+=this.flexV*dt;
    this.squashV+=(-72*this.squash-8*this.squashV)*dt;this.squash+=this.squashV*dt;
    if(this.spinActive){
      this.spin+=(15*(this.goalAngle-this.angle)-6.6*this.spin)*dt;this.angle+=this.spin*dt;
      if(Math.abs(this.spin)<.025&&Math.abs(this.angle-this.goalAngle)<.012){
        this.spinActive=false;this.events.push('knock');if(this.stage==='turning')this.go('decorate');
      }
    }else{this.angle+=this.spin*dt;this.spin*=Math.exp(-8*dt)}
    this.scoopAway=damp(this.scoopAway,(this.seated&&this.stage!=='refill')?1:0,2.8,dt);
    this.bagAway=damp(this.bagAway,['crown','tray','serving','taste','refill'].includes(this.stage)?1:0,2.9,dt);
    this.gaze=damp(this.gaze,this.stage==='taste'||this.stage==='refill'||this.bite>.1?1:0,2.3,dt);
    this.deposit(dt);
    for(let i=this.relaxing.length-1;i>=0;i--){
      const pt=this.relaxing[i];pt.dropV+=dt*(42*(pt.rest-pt.h)-(6+pt.wet*3)*pt.dropV);
      pt.h+=dt*pt.dropV;if(this.time-pt.birth>1.4)this.relaxing.splice(i,1)
    }
    this.rimReveal=damp(this.rimReveal,['rim','turning','decorate'].includes(this.stage)?1:0,3.4,dt);
    for(let i=this.cutting.length-1;i>=0;i--){const tail=this.cutting[i];tail.tail=damp(tail.tail,1,7,dt);if(tail.tail>.9998)this.cutting.splice(i,1)}
    switch(this.stage){
      case 'drop':
        if(this.age>.20&&!this.seated){this.creamV-=8.3*dt;this.creamY+=this.creamV*dt;
          if(this.creamY<=.79){this.creamY=.79;this.squashV=-this.creamV*.37;this.creamV=0;this.seated=true;this.events.push('plop')}}
        if(this.seated&&Math.abs(this.squash)<.013&&this.age>1.3)this.go('align');break;
      case 'align':this.align=damp(this.align,1,2.5,dt);if(this.align>.992)this.go('pipe');break;
      case 'crown':
        this.garnish=damp(this.garnish,1,3.5,dt);
        if(this.garnish>.98)this.tray=damp(this.tray,1,3,dt);
        if(this.tray>.984)this.go('tray');break;
      case 'serving':
        this.serve=damp(this.serve,1,1.85,dt);
        if(this.serve>.96)this.spoon=damp(this.spoon,1,2,dt);
        if(this.spoon>.55)this.bite=damp(this.bite,1,3.5,dt);
        if(this.bite>.985)this.go('taste');break;
      case 'taste':
        this.crownLift=damp(this.crownLift,1,1.55,dt);
        if(this.age>4.5)this.go('refill');break;
      case 'refill':
        this.refill=damp(this.refill,1,1.65,dt);
        if(this.refill>.998){this.cycle++;this.reset();this.events.push('fresh')}break;
    }
  };
  Kitchen.prototype.step=function(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    const count=Math.ceil(dt*120);for(let i=0;i<count;i++)this.tick(dt/count);
  };
  Kitchen.prototype.getState=function(){return {time:this.time,stage:this.stage,cycle:this.cycle,idle:this.idle,hint:this.hint,
    angle:this.angle,spin:this.spin,air:this.air,plume:this.plume.map(p=>({...p})),dust:this.dust.map(p=>({...p})),mass:this.mass,creamY:this.creamY,squash:this.squash,
    handle:this.toolFlex,nozzle:{...this.nozzle},cells:this.cells.map(c=>({...c})),extruded:this.extruded,
    strokes:this.strokes.map(s=>({cut:s.cut,tail:s.tail,points:s.points.length,last:s.points.length?{...s.points[s.points.length-1]}:null})),
    biteThickness:this.biteThickness,bite:this.bite,serve:this.serve,garnish:this.garnish,tray:this.tray,refill:this.refill}};
  if(typeof module!=='undefined'&&module.exports)module.exports=Kitchen;else root.Kitchen=Kitchen;
})(typeof window!=='undefined'?window:globalThis);
