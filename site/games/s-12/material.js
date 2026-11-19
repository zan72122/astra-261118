/* The table coordinates are centimetres divided by 4. Temperatures are in °C. */
(function (global) {
  'use strict';
  const N = 49, PI = Math.PI;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a,b,t) => a+(b-a)*t;
  const bell = (x,w) => Math.exp(-x*x/(w*w));
  const smooth = x => clamp(x)*clamp(x)*(3-2*clamp(x));
  const hook = {x:-.59,y:1.05};
  const hanging = [
    [-1.26,-1.04,.48],[-1.41,-.58,.63],[-1.36,.17,.93],[-1.22,.95,1.23],
    [-.95,1.54,1.43],[-.53,1.67,1.49],[-.13,1.40,1.38],[.04,.86,1.16],
    [.04,.30,.90],[.18,-.32,.72],[.55,-.86,.56],[1.04,-1.20,.49],[1.47,-1.36,.47]
  ];
  const doubled=[[.05,.87,1.16],[.09,.25,.92],[.18,-.43,.70],[.36,-.93,.50],[.60,-1.03,.47],
    [.85,-.72,.58],[.88,-.14,.77],[.76,.46,.99],[.38,1.18,1.34]];
  function spline(u,k,path=hanging) {
    let f=clamp(u)*(path.length-1), i=Math.min(path.length-2,Math.floor(f)), t=f-i;
    let a=path[Math.max(0,i-1)][k], b=path[i][k], c=path[i+1][k], d=path[Math.min(i+2,path.length-1)][k];
    return .5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  }
  class Batch {
    constructor({mass=160,temperature=39,seed=14,batch=1}={}) {
      Object.assign(this,{mass,seed,batch,phase:'pull',time:0,idle:0,folds:0,table:0,foldMotion:0,folding:false,
        side:0,pull:0,spin:0,twistRadius:.5,restEnd:1,cutAt:.78,blade:0,closing:false,pieces:[],paper:0,
        delivery:0,events:[],grip:null,held:null,heatHaze:0,lantern:0,draft:0,windV:0,lanternV:0,twistWork:0,steamSeed:seed+7919});
      this.drape=0;
      this.nodes=Array.from({length:N},(_,i)=>{
        let u=i/(N-1), width=(.29+.19*bell(u-.20,.23)+.14*bell(u-.68,.22))*(.86+.14*Math.sin(PI*u));
        return {u,homeX:spline(u,0),homeY:spline(u,1),homeZ:spline(u,2),x:spline(u,0),y:spline(u,1),z:spline(u,2),vx:0,vy:0,vz:0,
          temperature:temperature+1.9*Math.sin(u*4.7)-1.1*u,stretch:1,air:0,pockets:0,seam:0,scatter:0,
          radius:width*Math.cbrt(mass/160),width:width*Math.cbrt(mass/160),twist:0,mobileTwist:0,frozenTwist:0,lock:0,shine:0,pressure:0};
      });
      this.airMean=0;
      this.steam=Array.from({length:12},(_,i)=>this.vapour(i/12));
      this.dust=Array.from({length:8},(_,i)=>({x:(i%4-1.5)*.65,y:(i*.73)%1.2-.6,z:.18+i*.11,vx:0,vy:0,vz:0}));
    }
    random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/4294967296;}
    vapour(fraction){
      const rnd=()=>((this.steamSeed=(Math.imul(1664525,this.steamSeed)+1013904223)>>>0)/4294967296);
      const life=3.3+rnd()*1.65;
      return {age:fraction*life,life,x:(rnd()-.5)*.8,y:(rnd()-.5)*.5,vx:0};
    }
    airStep(h){
      for(let p of this.steam){
        p.age+=h;
        if(p.age>p.life)Object.assign(p,this.vapour(0));
        p.vx+=(this.draft*.16-p.vx)*h;p.x+=p.vx*h;
      }
      this.dust.forEach((p,i)=>{
        const x=(i%4-1.5)*.65,y=(i*.73)%1.2-.6,z=.18+i*.11;
        p.vx+=h*(this.draft*(.21+i*.016)+(x-p.x)*.6-p.vx*.74);
        p.vy+=h*(this.windV*.045+(y-p.y)*.9-p.vy*.72);
        p.vz+=h*(this.draft*.08+(z-p.z)*.81-p.vz*.84);
        p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;
      });
    }
    at(u){return this.nodes[Math.round(clamp(u)*(N-1))];}
    emit(type,strength=1){this.events.push({type,strength});if(this.events.length>50)this.events.shift();}
    input(type,kind,x,y,u=1) {
      if(type==='down'){
        if(this.grip||this.folding||this.closing)return false;
        let valid=(this.phase==='pull'&&(kind==='candy'||kind==='hook'&&this.held))||
          (this.phase==='twist'&&kind==='candy')||(['cut','roll'].includes(this.phase)&&kind==='shears'&&this.restEnd>.22)||
          (this.phase==='roll'&&kind==='piece')||(this.phase==='give'&&kind==='parcel');
        if(!valid)return false;
        this.grip={kind,x,y,ox:x,oy:y,px:x,py:y,u:clamp(u),max:0,path:0,angle:0,pick:Math.round(u)};
        this.idle=0;
        if(this.phase==='pull') {
          if(kind==='hook'){this.startFold();return true;}
          let n=this.at(u);this.grip.baseX=n.x;this.grip.baseY=n.y;
          let t=clamp((n.u-.58)/.42),folded=this.drape*smooth(t/.16);
          this.grip.restX=mix(n.homeX,spline(t,0,doubled),folded);this.grip.restY=mix(n.homeY,spline(t,1,doubled),folded);
          if(this.held){this.grip.max=this.held.max;this.held=null;}
        }
        if(kind==='piece')this.grip.pick=Math.min(this.pieces.length-1,Math.max(0,Math.round(u)));
        this.emit(kind==='parcel'||kind==='piece'?'paper':'touch',.35);
        return true;
      }
      let g=this.grip;if(!g)return false;
      if(type==='move'){
        const dx=x-g.x,dy=y-g.y;
        g.path+=Math.hypot(dx,dy);g.px=g.x;g.py=g.y;g.x=x;g.y=y;g.max=Math.max(g.max,Math.hypot(x-g.ox,y-g.oy));
        if(this.phase==='pull'&&Math.hypot(x-hook.x,y-hook.y)>1.08&&Math.hypot(x-g.ox,y-g.oy)>(g.outReach||0)){
          g.outReach=Math.hypot(x-g.ox,y-g.oy);g.outX=x-g.ox;
        }
        if(this.phase==='pull'&&g.max>.24&&Math.hypot(x-hook.x,y-hook.y)<.76){this.startFold();return true;}
        if(this.phase==='twist'){
          let end=this.at(1),ax=g.px-end.x,ay=g.py-end.y,bx=x-end.x,by=y-end.y;
          const r=Math.hypot(bx,by);
          let angle=Math.atan2(ax*by-ay*bx,ax*bx+ay*by);
          if(Math.hypot(ax,ay)<.10||r<.10)angle=0;
          const torque=clamp(angle,-.85,.85)+dx*.19-dy*.09;
          g.angle+=angle;this.spin+=torque;this.twistWork+=Math.abs(torque);
          this.twistRadius=mix(this.twistRadius,clamp(r,.12,2.7),.19);
        }
        if(g.kind==='shears')this.cutAt=clamp(this.cutAt+dx/4.1,Math.max(.1,this.restEnd-.32),this.restEnd-.075);
        return true;
      }
      if(type==='up'||type==='cancel'){
        if(type==='up'){
          if(this.phase==='pull'&&g.kind==='candy'&&g.max>.22){this.held={...g};}
          if(this.phase==='twist'&&g.max<.13){this.spin+=.6;this.twistWork+=.6;}
          if(g.kind==='shears'){this.closing=true;this.emit('pinch');}
          if(g.kind==='piece'&&g.overPaper){
            this.pieces[g.pick].onPaper=true;
            if(this.pieces.every(piece=>piece.onPaper))this.phase='wrap';
            this.emit('paper');
          }
          if(g.kind==='parcel'&&g.overHand){this.phase='receive';this.emit('paper');}
        }
        this.grip=null;this.idle=0;return true;
      }
      return false;
    }
    startFold(){
      const g=this.grip?.kind==='candy'?this.grip:this.held;
      if(!g)return;
      this.side=clamp((g.outX||0)*.74+g.ox*.22,-1,1);
      this.foldSite=clamp(.46+.22*this.side+.14*(g.u-.5),.24,.79);
      this.foldStrength=clamp((g.outReach||g.max)*.12+.28,.30,.58);
      this.foldMotion=0;this.folding=true;this.landed=false;this.grip=null;this.held=null;
    }
    step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      let left=dt;while(left>1e-8){let h=Math.min(left,1/120);this.tick(h);left-=h;}
    }
    tick(h){
      this.time+=h;this.idle=this.grip?0:this.idle+h;
      this.windV+=(this.random()-.5)*Math.sqrt(h)*.92-(this.draft*1.8+this.windV*1.6)*h;
      this.draft+=this.windV*h;
      this.lanternV+=(this.draft*.28-this.lantern*2.5-this.lanternV*.9)*h;this.lantern+=this.lanternV*h;
      this.heatHaze+=((this.nodes[12].temperature-23)*.04+this.draft*.23-this.heatHaze)*h*.68;
      this.airStep(h);
      if(this.folding){
        const previous=this.foldMotion;
        this.foldMotion=Math.min(1,this.foldMotion+h*.91);
        const contact=smooth((this.foldMotion-.59)/.38)-smooth((previous-.59)/.38);
        if(contact>0)for(const n of this.nodes){
          const overlap=bell(n.u-this.foldSite,.36)*smooth((1-n.u)/.20);
          n.pockets+=contact*overlap*this.foldStrength*(1-n.air);
        }
        if(this.foldMotion>.62&&!this.landed){
          this.landed=true;this.folds++;this.emit('fold',this.foldStrength*1.9);
        }
        if(this.foldMotion>=1)this.folding=false;
      }
      if(this.folds)this.drape+=h*(1-this.drape)*3.8;
      let onTable=!['pull','renew'].includes(this.phase);
      this.table=clamp(this.table+(onTable?1:-1)*h*.57);
      let g=this.grip?.kind==='candy'?this.grip:this.held;
      let dx=0,dy=0;
      if(g&&this.phase==='pull'){dx=clamp(g.x-g.ox+g.baseX-g.restX,-3.1,3.1);dy=clamp(g.y-g.oy+g.baseY-g.restY,-3.4,2.2);}
      let total=0,locked=0,motion=0;
      for(let i=0;i<N;i++){
        let n=this.nodes[i],u=n.u,prev=this.nodes[Math.max(0,i-1)],next=this.nodes[Math.min(N-1,i+1)];
        let contact=this.table*(.95-.53*u)+.14*bell(n.z-.40,.22);
        let thermal=(.0024+.024*contact)*(0.36/n.width);
        n.temperature+=h*((23.5-n.temperature)*thermal+(prev.temperature+next.temperature-2*n.temperature)*.25);
        let soft=clamp((n.temperature-19)/22,.22,1.3);
        let weight=g?bell(u-g.u,.19+.12*g.u)*clamp(Math.abs(u-.42)*4.2,.065,1):0;
        let strain=Math.hypot(dx,dy)*weight*soft/Math.cbrt(this.mass/160);
        n.stretch+=h*((1+strain*.67-n.stretch)*(strain>0?4.0:.98));
        n.pressure+=h*((this.grip?.kind==='candy'?weight:0)-n.pressure)*8;
        n.radius=n.width/Math.sqrt(n.stretch)*(1+.065*n.air)*(1-.043*n.pressure);
        let trapped=Math.min(n.pockets,h*n.pockets*4.0);n.pockets-=trapped;n.air=clamp(n.air+trapped);
        n.scatter+=h*((this.folds>1?1-Math.exp(-n.air*2.65):0)-n.scatter)*2.1;
        n.seam+=h*(clamp(n.air/.22)-n.seam)*4.0;
        let twistTarget=this.spin*Math.pow(u,1.65/(.52+this.twistRadius))*(1-.10*u);
        n.mobileTwist+=h*(twistTarget-n.mobileTwist)*6;
        const lockedBefore=n.lock;
        if(this.table>.8&&Math.abs(n.twist)>.09){
          n.lock=clamp(n.lock+h*(.025+.18*(1-u))*clamp((42-n.temperature)/10,.3,1.8)*(1-n.lock));
        }
        n.frozenTwist+=(n.lock-lockedBefore)*n.mobileTwist;
        n.twist=n.frozenTwist+(1-n.lock)*n.mobileTwist;
        locked+=n.lock;
        let tx=n.homeX,ty=n.homeY,tz=n.homeZ;
        if(this.drape>.001&&u>.58){
          let tail=(u-.58)/.42,folded=this.drape*smooth(tail/.16);
          tx=mix(tx,spline(tail,0,doubled),folded);ty=mix(ty,spline(tail,1,doubled),folded);tz=mix(tz,spline(tail,2,doubled),folded);
        }
        tx+=.16*n.air*Math.sin(PI*u);ty+=.16*n.air*u;
        if(this.folding){
          let lift=Math.sin(PI*smooth(this.foldMotion))*smooth((u-.44)/.56);
          tx+=lift*(hook.x-tx);ty+=lift*(hook.y+.54-ty);tz+=lift*.84;
        }
        tx+=dx*weight*soft;ty+=dy*weight*soft;tz+=Math.min(.54,strain*.25)-n.pressure*.052;
        let laid=smooth(this.table);
        tx=mix(tx,-2.0+4.15*u,laid);ty=mix(ty,-.08+.23*Math.sin(PI*u*1.5)+.09*u,laid);
        tz=mix(tz,.23+n.radius*.72,laid);
        if(this.phase==='twist'&&g){ty+=.13*(g.y-g.oy)*u*u*(1-n.lock);tz+=.1*Math.min(1,g.max)*u;}
        if(this.phase==='renew')tz+=Math.sin(PI*this.table)*.53;
        const k=74/Math.cbrt(this.mass/160),damping=13.0;
        n.vx+=h*((tx-n.x)*k-damping*n.vx);n.vy+=h*((ty-n.y)*k-damping*n.vy);n.vz+=h*((tz-n.z)*k-damping*n.vz);
        n.x+=h*n.vx;n.y+=h*n.vy;n.z+=h*n.vz;
        n.shine+=h*((n.vx*.08+n.vy*.04+this.draft*.016*(.25+u))-n.shine)*4.1;
        total+=n.air;motion+=Math.hypot(n.vx,n.vy);
      }
      this.pull=motion/N;this.airMean=total/N;
      if(this.phase==='pull'&&!this.folding&&!this.grip&&this.airMean>.535){this.phase='lay';this.held=null;this.grip=null;this.emit('lay');}
      if(this.phase==='lay'&&this.table>=1){this.phase='twist';this.idle=0;}
      if(this.phase==='twist'&&!this.grip&&this.twistWork>3.6&&locked/N>.17){this.phase='cut';this.grip=null;this.emit('open');this.idle=0;}
      if(this.closing){this.blade=Math.min(1,this.blade+h*4.8);
        if(this.blade>=1){let u=(this.restEnd+this.cutAt)*.5,n=this.at(this.cutAt);
          this.pieces.push({u,from:this.cutAt,to:this.restEnd,air:n.air,twist:n.twist,temperature:n.temperature,x:this.at(u).x,y:this.at(u).y,z:this.at(u).z,vx:.67,vy:-.85,onPaper:false});
          this.restEnd=this.cutAt;this.cutAt=Math.max(.085,this.restEnd-.16);this.emit('snip',.6+n.lock*.35);
          this.closing=false;this.phase='roll';this.grip=null;this.idle=0;
        }
      }else this.blade=Math.max(0,this.blade-h*2.3);
      this.pieces.forEach((p,i)=>{
        let dragged=this.grip?.kind==='piece'&&this.grip.pick===i;
        let gathering=p.onPaper&&this.paperSpot;
        if(dragged||gathering){
          let target=dragged?this.grip:this.paperSpot;
          p.vx+=(target.x+(gathering?(i-(this.pieces.length-1)/2)*.32:0)-p.x)*h*50;
          p.vy+=(target.y-p.y)*h*50;
        }
        let damp=dragged||gathering?10:3.0;p.vx*=Math.exp(-damp*h);p.vy*=Math.exp(-damp*h);
        p.x+=p.vx*h;p.y+=p.vy*h;p.z+=(.30-p.z)*h*4;p.temperature+=(23.5-p.temperature)*h*.048;
      });
      if(this.phase==='wrap'){this.paper=clamp(this.paper+h*.70);if(this.paper===1){this.phase='give';this.idle=0;}}
      if(this.phase==='receive'){
        this.delivery=clamp(this.delivery+h*.82);
        if(this.delivery===1){
          const spot=this.paperSpot,next=new Batch({mass:this.mass,seed:this.seed,batch:this.batch+1});
          Object.assign(this,next);this.table=1;this.phase='renew';this.paperSpot=spot;
          this.nodes.forEach(n=>{n.x=-2+4.15*n.u;n.y=-.08+.23*Math.sin(PI*n.u*1.5);n.z=.23+n.radius*.72;});
        }
      }
      if(this.phase==='renew'&&this.table<=0){this.phase='pull';this.emit('fold',.45);}
    }
    getState(){
      return JSON.parse(JSON.stringify({batch:this.batch,phase:this.phase,time:this.time,mass:this.mass,folds:this.folds,
        idle:this.idle,airMean:this.airMean,spin:this.spin,twistRadius:this.twistRadius,table:this.table,restEnd:this.restEnd,
        blade:this.blade,cutAt:this.cutAt,paper:this.paper,delivery:this.delivery,lantern:this.lantern,heatHaze:this.heatHaze,steam:this.steam,dust:this.dust,pieces:this.pieces,nodes:this.nodes}));
    }
  }
  Batch.scatterAt=function(n,fibre){
    const seam=Math.pow(Math.max(0,Math.cos(fibre-1.7)),95)*n.seam;
    const layers=.43+.57*Math.pow(.5+.5*Math.cos(5*fibre+n.u*2),2);
    return clamp(seam*.99+n.scatter*(.78+layers*.46));
  };
  global.CandyBatch=Batch;
  if(typeof module!=='undefined')module.exports=Batch;
})(typeof window==='undefined'?globalThis:window);
