/* Units: millimetres, seconds, newtons. The active cutting edge sweeps 600 mm. */
(function (root) {
  'use strict';
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  function rng(seed) { return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
  function create(seed=74) {
    const rand=rng(seed), weather=rng(seed+513), garden=rng(seed+892);
    let cells=Array.from({length:30},(_,i)=>({
      hard:.46+.21*Math.sin(i*.91)+rand()*.26, thickness:32, radius:1.4, polish:.02+rand()*.04,
      wet:0, film:0, tiles:Array.from({length:5},()=>({water:0,moisture:0})), reveal:0, heat:18+rand(), tap:0, tapV:0
    }));
    const dust=Array.from({length:68},()=>({x:(weather()-.5)*1300,y:weather()*650+20,z:(weather()-.5)*590,
      vx:weather()*3-1.5,vy:weather()*3,vz:0,lift:weather()*3+.4}));
    const leaves=Array.from({length:7},(_,i)=>({angle:0,velocity:0,mass:.7+i*.08,reach:.46+weather()*.29}));
    const s={leaves,stage:'plane',cycle:0,age:0,idle:0,strokes:0,cells,dust,blade:4,
      x:0,v:0,aim:0,drag:false,returning:false,force:8,pitch:0,loud:0,edge:0,
      ribbons:[],pieces:[0,1,2,3].map(()=>({p:0,v:0,target:0,locked:false})),
      lift:0,liftV:0,cart:0,cartV:0,cartTarget:0,wheels:0,
      drops:[],rain:0,wind:0,sun:.87,wheel:0,omega:0,buckets:Array(10).fill(0),
      feed:0,feedV:0,gate:.55,gateTarget:.55,gateV:0,runoff:0,water:0,returnP:0,
      events:[],nudge:0,nudgeV:0};
    let nextGust=0,gust=0,illum=.87,active=null,tear=0,uid=0,rainCredit=0,gutterIn=0,lastCell=-1;
    function emit(kind,amount,loc=0,material=null){
      const hz=material ? 240+material.hard*260-material.wet*52 : 0;
      const decay=material ? .16-material.wet*.08 : 0;
      s.events.push({kind,amount,loc,hz,decay});
      if(s.events.length>35)s.events.shift();
    }
    function enter(stage) { s.stage=stage; s.age=0; s.idle=0; s.drag=false; }
    function ribbon() {
      const r={id:++uid,x:s.x-300,y:52,z:5,vx:0,vy:0,vz:0,length:0,roll:0,
        radius:9+rand()*6,span:14+s.blade*1.75+rand()*6,yaw:rand()*1.4-.7,tilt:rand()*.6-.3,
        spin:0,attached:true,asleep:false,land:0};
      active=r;tear=82+rand()*63;s.ribbons.push(r);
    }
    function detach() {
      if(!active)return;
      active.attached=false;active.vx=s.v*.11;active.vy=42+rand()*63;
      active.vz=100+rand()*117;active.spin=2+rand()*3;active=null;
    }
    function plane(h) {
      const c=cells[Math.min(29,Math.floor(s.x/20))];
      const at=clamp(s.x/20-.5,0,29),left=Math.floor(at);
      const hardness=cells[left].hard+(cells[Math.min(29,left+1)].hard-cells[left].hard)*(at-left);
      const dragForce=clamp(8+hardness*5.5+(s.blade-2)*.9+Math.max(0,s.v)*.002,8,20);
      s.force+=(dragForce-s.force)*(1-Math.exp(-h*25));
      const dest=s.returning?0:s.aim;
      let desire=s.returning?-Math.min(450,8*s.x+6):s.drag?clamp((dest-s.x)*11,0,820):0;
      if(desire>0)desire*=1-(s.force-8)*.016;
      const last=s.x;s.v+=(desire-s.v)*(1-Math.exp(-h*(s.drag?14:8)));
      s.x=clamp(s.x+s.v*h,0,600);
      if(s.returning&&s.x<.24){s.x=0;s.v=0;s.aim=0;s.returning=false;}
      const cut=s.returning?0:Math.max(0,s.x-last);
      // Only the intervals crossed by the blade lose material.
      if(cut>0) {
        const start=Math.min(29,Math.floor(last/20)),end=Math.min(29,Math.floor(s.x/20));
        for(let i=start;i<=end;i++){
          const a=cells[i],f=Math.max(0,Math.min(s.x,(i+1)*20)-Math.max(last,i*20))/20;
          a.thickness-=.4*f;a.radius+=f*.68*(1-a.radius/8)*(1.15-a.hard*.23);
          a.polish+=f*(1-a.polish)*(.27-a.hard*.08);a.heat+=f*.8*a.hard;
        }
        if(cut>.016&&(s.drag||s.v>=4||active)){
          if(!active)ribbon();active.length+=cut*.96;
          active.x=s.x-300;active.z=5+Math.min(18,active.length*.12);active.y=c.thickness+52+active.radius;
          active.roll+=cut/active.radius;
          if(active.length>=tear)detach();
        }
      }
      if(!s.drag&&s.v<4)detach();
      const vel=cut/h;s.edge=vel;
      const pitch=vel>1?180+vel*.8+hardness*104+s.blade*12:0;
      s.pitch+=(pitch-s.pitch)*(1-Math.exp(-h*14));
      s.loud+=((vel>1?Math.min(1,vel/460)*(.38+s.blade*.065)*(.7+c.hard*.4):0)-s.loud)*(1-Math.exp(-h*12));
      if(s.x>599.997&&!s.returning) {
        // Complete the sub-micron residual at the far end.
        cells[29].thickness-=(600-s.x)*.4/20;s.x=600;s.strokes++;detach();s.v=0;
        s.returning=true;s.drag=false;
        if(s.strokes===7){enter('fit');s.returning=false;emit('ready',.65);}
      }
    }
    function shavings(h){
      for(const r of s.ribbons){
        if(r.attached||r.asleep)continue;
        const oldY=r.y,oldX=r.x,oldZ=r.z;
        r.vy-=1120*h;r.vx+=(s.wind*.5-r.vx)*h*1.2;
        r.x+=r.vx*h;r.y+=r.vy*h;r.z+=r.vz*h;r.roll+=r.spin*h;
        const onBoard=Math.abs(r.z)<76&&Math.abs(r.x)<320;
        let base=onBoard?32:0;
        if(!onBoard) for(const b of s.ribbons){
          if(b.asleep&&b!==r&&Math.abs(b.x-r.x)<b.span*.84&&Math.abs(b.z-r.z)<b.radius*1.4)
            {
              const top=b.y+b.radius*.6;
              if(oldY>=top+r.radius-.15)base=Math.max(base,top);
              else if(Math.abs(oldZ-b.z)>=b.radius*1.4&&Math.abs(oldY-b.y)<r.radius+b.radius){
                r.z=oldZ;r.vz*=-.18;
              }else if(Math.abs(oldX-b.x)>=b.span*.84&&Math.abs(oldY-b.y)<r.radius+b.radius){
                r.x=oldX;r.vx*=-.18;
              }
            }
        }
        const floor=base+r.radius;
        if(r.y<=floor&&r.vy<0){
          if(-r.vy>40)emit('shaving',Math.min(.7,-r.vy/540),r.x/300);
          r.land++;r.y=floor;r.vy*=-.14;r.vx*=.55;r.vz*=.65;r.spin*=.42;
          if(r.land>4||Math.abs(r.vy)<2){r.vx=r.vy=r.vz=r.spin=0;r.asleep=true;}
        }
      }
    }
    function atmosphere(h){
      nextGust-=h;if(nextGust<=0){nextGust=1.3+weather()*2.7;gust=(weather()-.47)*12;illum=.78+weather()*.18;}
      s.wind+=(gust-s.wind)*h*.9;
      for(let i=0;i<s.leaves.length;i++){
        const a=s.leaves[i];a.velocity+=h*(s.wind*a.reach*.15+a.reach*s.nudge*4-(12+i*.7)*a.angle-a.velocity*3)/a.mass;
        a.angle+=a.velocity*h;
      }s.sun+=(illum-s.sun)*h*.36;
      for(const p of dust){
        p.vx+=(s.wind+p.y*.004-p.vx)*h*.65;p.vy+=(p.lift+p.x*.001-p.vy)*h*.55;
        p.vz+=(s.wind*.3-p.vz)*h*.42;
        if(p.x>630)p.vx-=h*(p.x-630);if(p.x< -630)p.vx-=h*(p.x+630);
        if(p.y>635)p.vy-=h*(p.y-635);
        p.x+=h*p.vx;p.y+=h*p.vy;p.z+=h*p.vz;
      }
      s.nudgeV+=(-s.nudge*60-s.nudgeV*7)*h;s.nudge+=s.nudgeV*h;
    }
    function springPart(part,h,k,d){
      part.v+=((part.target-part.p)*k-part.v*d)*h;part.p+=part.v*h;
    }
    function fittings(h){
      s.liftV+=((1-s.lift)*13-s.liftV*6)*h;s.lift+=s.liftV*h;
      for(const p of s.pieces){
        springPart(p,h,46,12);
        if(!p.locked&&p.target===1&&Math.abs(1-p.p)<.002&&Math.abs(p.v)<.02){
          p.p=1;p.v=0;p.locked=true;emit('joint',.7);
        }
      }
      if(s.pieces.every(p=>p.locked))enter('carry');
    }
    function carriage(h){
      s.cartV+=((s.cartTarget-s.cart)*4.4-s.cartV*3.9)*h;
      const dx=s.cartV*h;s.cart=clamp(s.cart+dx,0,1);s.wheels+=dx*(11.1114165/.16);
      if(s.cart>.998&&s.cartTarget===1){s.cart=1;s.cartV=0;enter('sun');}
    }
    function rainStep(h,ending=false){
      s.rain+=((ending?0:1)-s.rain)*h*(ending?1:.22);rainCredit+=h*s.rain*56;
      while(rainCredit>=1){
        rainCredit--;const x=(garden()-.5)*1350,z=(garden()-.5)*660;
        s.drops.push({id:++uid,x,y:450+garden()*290,z,vy:-430-garden()*250,vx:s.wind*2,hit:0});
      }
      for(let i=s.drops.length-1;i>=0;i--){
        const d=s.drops[i];if(d.hit){d.hit+=h;if(d.hit>.28)s.drops.splice(i,1);continue;}
        d.vy-=950*h;d.y+=d.vy*h;d.x+=d.vx*h;
        // garden bench at y=0, awning beside it, ground at -225 mm
        const board=Math.abs(d.x)<300&&Math.abs(d.z)<78,roof=d.z< -190;
        const stop=board?0:roof?188:-225;
        if(d.y<=stop){
          d.y=stop;d.hit=.001;
          if(board){const j=clamp(Math.floor((d.x+300)/20),0,29);cells[j].tiles[clamp(Math.floor((d.z+78)/156*5),0,4)].water+=.95;cells[j].tapV+=.7;emit('woodrain',clamp(-d.vy/4100,.15,.39),j/15-1,cells[j]);}
          if(roof){gutterIn+=.07;if(garden()<.24)emit('roof',.14+garden()*.18,d.x/675);}
        }
      }
      s.gateV+=((s.gateTarget-s.gate)*26-s.gateV*8)*h;s.gate+=s.gateV*h;
      const out=gutterIn*(.08+s.gate*.65)*h;gutterIn-=out;s.runoff=out/h;s.water+=out;
      const idx=(10-Math.floor((s.wheel%(2*Math.PI))/(2*Math.PI)*10))%10;
      s.buckets[idx]+=out;
      let torque=0;
      for(let i=0;i<10;i++){
        const a=s.wheel+i*2*Math.PI/10+.58,b=s.buckets[i];
        torque+=Math.sin(a)*b*1.2;
        const spill=Math.max(0,-Math.cos(a))*.75+.025;s.buckets[i]-=b*spill*h;
      }
      s.omega+=h*(torque+.08*s.runoff-s.omega*.95);s.omega=clamp(s.omega,0,2.8);s.wheel+=s.omega*h;
      if(!ending&&s.water>18&&s.wheel>5.8){enter('home');}
    }
    function surface(h){
      
      for(let i=0;i<cells.length;i++){
        const c=cells[i];
        if(s.stage==='rain'||s.stage==='home'){
          let sum=0,film=0;
          for(let z=0;z<5;z++){
            const tile=c.tiles[z],w=tile.water;
            const absorb=Math.min(w,w*(1.55-c.hard*.58)*(1-tile.moisture)*h);
            const drain=w*h*(.13+.014*i/30);tile.water=Math.max(0,w-absorb-drain);
            if(i<29)cells[i+1].tiles[z].water+=drain*.63;
            if(z<4)c.tiles[z+1].water+=drain*.29;
            tile.moisture=clamp(tile.moisture+absorb-tile.moisture*h*.0017,0,1);
            sum+=tile.moisture;film+=tile.water;
          }
          c.wet=sum/5;c.film=film/5;
        }
        c.heat+=(18+s.sun*c.reveal*6-c.heat)*h*.06;
        c.tapV+=(-c.tap*120-c.tapV*8)*h;c.tap+=c.tapV*h;
        if(s.stage==='sun'&&c.reveal>0&&c.reveal<1)c.reveal=Math.min(1,c.reveal+h*(.13+c.polish*.13)*s.sun);
      }
    }
    function tick(h){
      s.age+=h;s.idle+=h;atmosphere(h);surface(h);
      if(s.stage==='plane')plane(h);else{s.loud*=Math.exp(-h*9);s.edge=0;}
      shavings(h);
      if(s.stage==='fit')fittings(h);
      if(s.stage==='carry')carriage(h);
      if(s.stage==='sun'&&cells.every(c=>c.reveal>.89)&&s.age>5)enter('rain');
      if(s.stage==='rain')rainStep(h);
      else if(s.stage==='home'){
        // The incoming blank rolls down the rack and is damped by its padded stop.
        s.feedV+=((1-s.feed)*4.8-s.feedV*4.2)*h;s.feed+=s.feedV*h;
        s.returnP=Math.min(1,s.returnP+h*.23);rainStep(h,true);
        if(s.returnP===1&&s.feed>.999){
          const fresh=create(seed+91+s.cycle*57).state,cycle=s.cycle+1;
          Object.assign(s,fresh,{cycle,dust:s.dust,leaves:s.leaves,wind:s.wind,sun:s.sun});
          cells=s.cells;active=null;gutterIn=rainCredit=0;lastCell=-1;
        }
      }
    }
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;const n=Math.ceil(dt*120);for(let i=0;i<n;i++)tick(dt/n);}
    function press(kind,value){
      s.idle=0;
      if(s.stage==='plane'&&kind==='plane'&&!s.returning){s.drag=true;s.aim=s.x;return true;}
      if(s.stage==='plane'&&kind==='blade'){s.blade=s.blade>=8?2:Math.min(8,s.blade+2);emit('metal',.22);return true;}
      if(s.stage==='fit'&&kind==='part'&&value===s.pieces.findIndex(p=>!p.locked)){
        const p=s.pieces[value];p.target=1;return true;
      }
      if(s.stage==='carry'&&kind==='cart'){s.cartTarget=1;return true;}
      if(s.stage==='sun'&&kind==='grain'){
        const j=clamp(Math.floor(value*30),0,29);
        for(let i=0;i<30;i++){const dist=Math.abs(i-j);if(dist<=4)cells[i].reveal=Math.min(1,cells[i].reveal+.15*(1-dist/6));}
        if(j!==lastCell)emit('rub',.15+cells[j].hard*.14,j/15-1);lastCell=j;return true;
      }
      if(s.stage==='rain'&&kind==='gate'){s.gateTarget=s.gateTarget>.7?.38:1;emit('joint',.38);return true;}
      if(s.stage==='rain'&&kind==='grain'){const i=clamp(Math.floor(value*30),0,29);cells[i].tapV+=2;emit('knock',.7,i/15-1,cells[i]);return true;}
      s.nudgeV=.035;return false;
    }
    function move(mm){if(Number.isFinite(mm)&&s.drag&&s.stage==='plane'){s.idle=0;s.aim=clamp(mm,0,600);}}
    function release(){s.drag=false;s.aim=s.x;lastCell=-1;}
    return {state:s,step,press,move,release,getState:()=>JSON.parse(JSON.stringify(s)),setBlade:mm=>{if(Number.isFinite(mm))s.blade=clamp(mm,2,8);}};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={create};
  else root.WorkshopPhysics={create};
})(globalThis);
