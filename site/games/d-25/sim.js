/* All lengths are metres, time is seconds, and grain is cubic metres.
   The fixed-step model also runs in Node without a renderer. */
(function (root) {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smoothAngle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  const COLS=24, ROWS=54, WIDTH=16.2, LENGTH=36, SWATH=5.4, FRONT=3.22, BARN={x:33,z:1}, LOCK={x:17,z:-11};
  class Farm {
    constructor(seed=73512){
      this.seed=seed;this.rand=random(seed);this.clock=0;this.day=0;this.bank=0;this.held='';this.muted=false;
      this.wind=Array.from({length:36},(_,i)=>({p:.35+this.rand()*.3,v:0,source:this.rand()*.9-.25,ttl:this.rand()*2+.4}));
      this.airTravel=0;this.cloudCover=.34;
      this.ripples=Array.from({length:25},()=>({level:(this.rand()-.5)*.015,v:0}));
      this.nudges=Object.fromEntries(['combine','truck','bale','gate'].map(k=>[k,{tilt:0,v:0}]));
      this.dust=Array.from({length:56},()=>({x:this.rand()*20-9,y:this.rand()*2,z:this.rand()*21-5,vx:0,vy:0,vz:0,life:this.rand()*5+1}));
      this.grains=Array.from({length:150},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,live:false}));
      this.truck={x:16,z:2,yaw:-.6,speed:0,wheel:0,load:0,bedSpring:0,bedV:0,tip:0,tipV:0};
      this.depotGrain=0;this.climate=.12;this.sunHeat=.12;this.wave=.2;this.armV=0;this.waveTarget=.9;this.waveTimer=1;
      this.channels=Array.from({length:16},()=>({water:0,flux:0}));
      this.dayOffset=0;this.resetField();
    }
    resetField(){
      this.stage='harvest';this.stageTime=0;this.idle=0;this.held='';this.lane=0;this.turn=0;
      this.x=5.4;this.z=LENGTH/2+FRONT-4;this.yaw=0;this.speed=0;this.odometer=0;this.wheel=0;
      this.reel=0;this.rpm=0;this.shake=0;this.shakeV=0;this.tank=0;this.intake=0;this.capacity=1.378;
      this.pipe=0;this.pipeV=0;this.gate=0;this.flow=0;this.lastCut=0;this.relay=false;this.cutCount=0;
      this.truck.load=0;this.grainCredit=0;this.grainIndex=0;this.inFlight=0;this.impactRate=0;this.hint={press:0,v:0,goal:0,wait:0};this.touched=0;
      this.bale={x:0,z:0,travel:0,v:0,spin:0,emerge:0};this.child={approach:0,seat:0,rest:0};
      this.sluice=0;this.wheelFlow=0;this.waterWheel=0;this.route=0;this.barnDoor=0;
      this.cells=[];
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
        const x=(c+.5)*WIDTH/COLS-WIDTH/2,z=(r+.5)*LENGTH/ROWS-LENGTH/2;
        const done=c>=16 && z>this.z-FRONT;
        this.cells.push({x,z,stiff:7+this.rand()*6,mass:(.0047+this.rand()*.0027)*.52,height:.78+this.rand()*.23,
          patch:Math.min(5,Math.floor(r*6/ROWS))*6+Math.floor(c*6/COLS),bend:this.rand()*.06,v:0,cut:done,feed:done?1:0});
        if(done)this.cutCount++;
      }
      this.grains.forEach(g=>g.live=false);
      this.channels.forEach(c=>{c.water=0;c.flux=0;});
    }
    active(){return ({harvest:'combine',arrival:'truck',unload:'truck',bales:'bale',ride:'truck',morning:'gate'})[this.stage]||'';}
    press(id){this.idle=0;if(id && id===this.active()){this.held=id;this.touched++;return true;}if(this.nudges[id])this.nudges[id].v=.12;return false;}
    release(){this.held='';}
    phase(name){this.stage=name;this.stageTime=0;this.idle=0;this.held='';}
    local(x,z){const c=Math.cos(this.yaw),s=Math.sin(this.yaw);return {x:this.x+c*x+s*z,z:this.z-s*x+c*z};}
    step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      this.bank+=dt;
      while(this.bank+1e-10>=1/60){this.tick(1/60);this.bank-=1/60;}
    }
    air(h){
      for(let i=0;i<this.wind.length;i++){
        const w=this.wind[i],up=this.wind[i%6?i-1:(i+30)%36];w.ttl-=h;
        if(w.ttl<=0){w.source=this.rand()*1.5-.44;w.ttl=.7+2.9*this.rand();}
        w.v+=((w.source*.55+up.p*.45-w.p)*2.2-w.v*1.7)*h;w.p+=w.v*h;
      }
      this.airTravel+=(.14+this.wind[0].p*.41)*h;
      this.cloudCover+=((.30+this.wind[5].p*.19)-this.cloudCover)*h*.27;
      for(let i=0;i<25;i++){
        const q=this.ripples[i],left=this.ripples[i%5?i-1:i],right=this.ripples[i%5<4?i+1:i],up=this.ripples[i>=5?i-5:i],down=this.ripples[i<20?i+5:i];
        const force=(left.level+right.level+up.level+down.level-4*q.level)*29+this.wind[(i*7)%36].v*.021;
        q.v+=(force-q.level*4-q.v*1.9)*h;q.level+=q.v*h;
      }
      for(const n of Object.values(this.nudges)){n.v+=(-n.tilt*28-n.v*5)*h;n.tilt+=n.v*h;}
      for(const p of this.dust){
        const wi=this.wind[clamp(Math.floor((p.x+10)/4),0,5)+6*clamp(Math.floor((p.z+17)/6),0,5)];
        p.vx+=(.18+wi.p*.65-p.vx)*h;p.vy+=((wi.v*.23-.045)-p.vy)*h;p.vz+=(wi.p*.16-p.vz)*h;
        p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;p.life-=h;
        if(p.life<=0||p.y<.05){p.x=this.x+this.rand()*12-7;p.z=this.z+this.rand()*9-7;p.y=.2+this.rand()*2;p.life=4+this.rand()*6;p.vy=.06;}
      }
      this.waveTimer-=h;if(this.waveTimer<0){this.waveTarget=this.waveTarget>.5?.2:1;this.waveTimer=.45+this.rand()*.55;}
      this.armV+=((this.waveTarget-this.wave)*16-this.armV*4)*h;this.wave+=this.armV*h;
    }
    drive(h){
      const driving=this.stage==='harvest'&&this.held==='combine';
      const target=driving?(this.turn?1.7:2.5):0;
      this.speed+=clamp(target-this.speed,-4.9*h,1.7*h);
      const d=this.speed*h;this.odometer+=d;this.wheel+=d/.91;
      if(this.turn){
        this.turn=Math.min(Math.PI,this.turn+d/(SWATH/2));
        const a=this.turn,dir=this.lane%2?-1:1,base=5.4-this.lane*SWATH;
        this.x=base-SWATH/2*(1-Math.cos(a));this.z=dir*(-LENGTH/2-FRONT-.4)-dir*SWATH/2*Math.sin(a);
        this.yaw=this.lane%2?Math.PI-a:a;
        if(a>=Math.PI){this.lane++;this.turn=0;this.yaw=this.lane%2?Math.PI:0;}
      }else if(d>0 && this.stage==='harvest'){
        const dir=this.lane%2?-1:1;this.z-=dir*d;
        if(this.lane<2&&dir*this.z<=-LENGTH/2-FRONT-.4){
          this.z=dir*(-LENGTH/2-FRONT-.4);this.turn=.000001;
        }
      }
      const wTarget=(this.stage==='harvest'?.32:0)+this.speed*1.65;
      this.rpm+=(wTarget-this.rpm)*h*2.7;this.reel+=this.rpm*h;
      this.shakeV+=((this.wind[3].v*.02+Math.sin(this.wheel*7)*this.speed*.025-this.shake)*24-this.shakeV*5)*h;
      this.shake+=this.shakeV*h;
    }
    crop(h){
      const cos=Math.cos(this.yaw),sin=Math.sin(this.yaw);
      let incoming=0;
      for(const a of this.cells){
        const dx=a.x-this.x,dz=a.z-this.z,across=dx*cos-dz*sin,fore=-(dx*sin+dz*cos);
        const contact=this.stage==='harvest'&&this.speed>.025&&Math.abs(across)<SWATH*.5&&fore>FRONT-.85&&fore<FRONT+.22;
        if(!a.cut&&contact){a.cut=true;this.cutCount++;}
        const force=this.wind[a.patch].p*.94+(a.cut?8*(1-a.feed):0);
        a.v+=(force-a.stiff*a.bend-2.8*a.v)*h;a.bend+=a.v*h;
        if(a.cut&&a.feed<1){
          const f=Math.min(1-a.feed,h*(1.15+this.rpm*.21));a.feed+=f;incoming+=f*a.mass;
        }
      }
      this.lastCut+=(incoming/h-this.lastCut)*Math.min(1,h*7);
      this.intake+=incoming;
      const lifted=Math.min(this.intake,(.065+this.rpm*.070)*h,Math.max(0,this.capacity-this.tank));
      this.intake-=lifted;this.tank+=lifted;
      if(this.stage==='harvest'){
        if(this.cutCount===this.cells.length){this.phase('finish');}
        else if(!this.relay&&this.tank>=this.capacity-1e-9){this.phase('arrival');}
      }
    }
    moveTruck(pos,h,top){
      const t=this.truck,dx=pos.x-t.x,dz=pos.z-t.z,r=Math.hypot(dx,dz);
      const goal=Math.min(top,r*1.65);
      t.speed+=clamp(goal-t.speed,-3.1*h,1.8*h);
      const ds=Math.min(r,t.speed*h);if(r>.015){t.x+=dx/r*ds;t.z+=dz/r*ds;}
      const yaw=r>1.4?Math.atan2(-dx,-dz):(pos.yaw??this.yaw);
      t.yaw+=clamp(smoothAngle(t.yaw,yaw),-1.35*h,1.35*h);t.wheel+=ds/.54;
      return r;
    }
    unload(h){
      const t=this.truck,working=['arrival','unload','finish'].includes(this.stage)||this.relay&&this.stage==='harvest';
      const dest=this.local(4.85,-1.77);
      const dist=working?this.moveTruck(dest,h,this.relay?5.2:this.held==='truck'?4.2:3.3):Infinity;
      if(this.stage==='arrival'&&dist<.22)this.phase('unload');
      const pipeTarget=working?1:0;this.pipeV+=((pipeTarget-this.pipe)*8-5.8*this.pipeV)*h;this.pipe=clamp(this.pipe+this.pipeV*h,0,1);
      const open=dist<1.35&&this.pipe>.91&&(this.held==='truck'&&this.stage==='unload'||this.relay||this.stage==='finish');
      this.gate=clamp(this.gate+(open?1.25:-1.8)*h,0,1);
      const output=Math.min(this.tank,this.gate*(.2652+Math.min(.0936,this.tank*.12))*h);
      this.tank-=output;this.flow+=(output/h-this.flow)*h*9;
      t.bedV+=((Math.min(.13,t.load*.014)-t.bedSpring)*15-t.bedV*3.8)*h;t.bedSpring+=t.bedV*h;
      const spout=this.local(4.85,-.70);
      const svx=this.previousSpout?(spout.x-this.previousSpout.x)/h:0,svz=this.previousSpout?(spout.z-this.previousSpout.z)/h:0;
      this.previousSpout=spout;
      this.grainCredit+=output*350;this.inFlight+=output;
      while(this.grainCredit>=1||(this.tank<.000001&&this.grainCredit>.0000001)){
        const parcel=Math.min(1,this.grainCredit);this.grainCredit-=parcel;const g=this.grains[this.grainIndex++%this.grains.length];
        Object.assign(g,{x:spout.x+this.rand()*.22-.11,y:2.99,z:spout.z+this.rand()*.22-.11,
          volume:parcel/350,vx:svx+this.rand()*.5-.25,vy:-.55-this.rand()*.3,vz:svz+this.rand()*.42-.21,live:true});
      }
      let landed=0;
      for(const g of this.grains)if(g.live){
        g.vy-=9.81*h;g.x+=g.vx*h;g.y+=g.vy*h;g.z+=g.vz*h;
        if(g.y<1.205+t.load/(2.05*2.60)-t.bedSpring){g.live=false;landed+=g.volume;}
      }
      t.load+=landed;this.inFlight-=landed;this.impactRate+=(landed/h-this.impactRate)*h*9;
      if(this.stage==='unload'&&this.tank<.0001&&this.intake<.0001){this.relay=true;this.phase('harvest');}
      if(this.stage==='finish'&&this.tank<.0001&&this.intake<.0001&&this.inFlight<.00001&&this.stageTime>2){
        const p=this.local(0,2.6);Object.assign(this.bale,p);this.relay=false;this.phase('bales');
      }
    }
    rewards(h){
      const b=this.bale;
      if(this.stage==='bales'){
        b.emerge=Math.min(1,b.emerge+h*.6);
        const pushing=this.held==='bale';
        const force=b.emerge<1?.7:pushing&&b.travel<5.4?1.35:0;
        b.v=clamp(b.v+(force-.51*b.v-(b.v>.001?.28:0))*h,0,1.65);
        b.travel+=b.v*h;b.spin+=b.v*h/.78;
        if(b.travel>4.65)this.child.approach=Math.min(1,this.child.approach+h*.48);
        if(this.child.approach>=1&&b.v<.35)this.child.seat=Math.min(1,this.child.seat+h*.7);
        if(this.child.seat>=1)this.child.rest+=h;
        if(this.child.rest>3.2)this.phase('ride');
      }
      if(this.stage==='ride'){
        const stops=[{x:12-this.dayOffset,z:this.truck.z},{x:15-this.dayOffset,z:1},{x:BARN.x-1-this.dayOffset,z:BARN.z+3,yaw:-Math.PI/2}];
        const dest=stops[this.route];
        if(this.moveTruck(dest,h,this.held==='truck'?3.1:0)<.32){
          if(this.route<2)this.route++;
          else this.phase('dusk');
        }
      }
      const tipping=this.stage==='dusk'&&this.barnDoor>.6&&this.truck.load>.00001;
      this.truck.tipV+=(((tipping?.55:0)-this.truck.tip)*5-this.truck.tipV*4)*h;
      this.truck.tip+=this.truck.tipV*h;
      if(this.stage==='dusk'){
        this.barnDoor=Math.min(1,this.barnDoor+h*.42);
        const delivered=Math.min(this.truck.load,Math.max(0,Math.sin(this.truck.tip)-.08)*2.5*h);
        this.truck.load-=delivered;this.depotGrain+=delivered;
        if(this.stageTime>9&&this.truck.load<.00001)this.phase('morning');
      }
      if(this.stage==='morning'){
        this.sluice=clamp(this.sluice+(this.held==='gate'?.34:-.09)*h,0,1);
        for(let i=0;i<this.channels.length;i++){
          const a=this.channels[i],up=i?this.channels[i-1].water:this.sluice;
          a.flux+=(Math.max(0,up-a.water)*2.1-a.flux)*h*4;
          a.water=clamp(a.water+(a.flux-.003*a.water)*h,0,1);
        }
        if(this.channels[15].water>.23)this.phase('dawn');
      }
      this.wheelFlow+=((this.channels[1].flux*5+this.channels[1].water*.9)-this.wheelFlow)*h*1.7;
      this.waterWheel+=this.wheelFlow*h;
      const heat=['ride','dusk'].includes(this.stage)?1:['morning','dawn'].includes(this.stage)?-.42:.12;
      this.sunHeat+=(heat-this.sunHeat)*h*.23;this.climate+=(this.sunHeat-this.climate)*h*.45;
      if(this.stage==='dawn'&&this.stageTime>3){const previous=this.dayOffset;this.day++;this.dayOffset=this.day%2?-18:0;this.truck.x+=previous-this.dayOffset;this.resetField();}
    }
    tick(h){
      this.clock+=h;this.stageTime+=h;this.idle=this.held?0:this.idle+h;
      const demo=this.hint;
      if(this.idle>=4&&this.active()){
        demo.wait-=h;if(demo.wait<=0){demo.goal=demo.goal>.5?0:1;demo.wait=demo.goal?1.2:1.05;}
      }else{demo.goal=0;demo.wait=0;}
      demo.v+=((demo.goal-demo.press)*24-demo.v*7)*h;demo.press+=demo.v*h;
      this.air(h);this.drive(h);this.crop(h);this.unload(h);this.rewards(h);
    }
    getState(){
      const {clock,day,stage,stageTime,idle,lane,turn,x,z,yaw,speed,odometer,wheel,reel,rpm,shake,tank,capacity,pipe,gate,flow,cutCount,climate,sluice,wheelFlow,waterWheel,wave}=this;
      return {intake:this.intake,depotGrain:this.depotGrain,inFlight:this.inFlight,impactRate:this.impactRate,hintPress:this.hint.press,airTravel:this.airTravel,cloudCover:this.cloudCover,ripples:this.ripples.map(q=>q.level),clock,day,stage,stageTime,idle,lane,turn,x,z,yaw,speed,odometer,wheel,reel,rpm,shake,tank,capacity,pipe,gate,flow,cutCount,climate,sluice,wheelFlow,waterWheel,wave,
        truck:{...this.truck},bale:{...this.bale},child:{...this.child},wind:this.wind.map(w=>w.p),dust:this.dust.map(p=>[p.x,p.y,p.z]),grain:this.grains.filter(g=>g.live).map(g=>[g.x,g.y,g.z]),
        cells:this.cells.map(c=>[c.bend,c.feed]),channels:this.channels.map(c=>c.water)};
    }
  }
  const api={Farm,random,COLS,ROWS,WIDTH,LENGTH,SWATH,FRONT,BARN,LOCK};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FarmModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
