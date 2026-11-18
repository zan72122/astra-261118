/* Metres, kilograms, seconds. This module has no dependency on DOM, sound or rendering. */
(function (scope) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hypot = Math.hypot;
  const PILE = { x: .48, z: .18 };
  const SHED = { x: 2.12, z: -6.38 };
  const pathX = z => -1.95 + 4.05 / (1 + Math.exp((z + 3.55) * 1.22)) + .14 * Math.sin(z * .84);
  function seedRandom(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let a = Math.imul(seed ^ seed >>> 15, 1 | seed); a = a + Math.imul(a ^ a >>> 7, 61 | a) ^ a; return ((a ^ a >>> 14) >>> 0) / 4294967296; };
  }
  function makeGarden(seed = 5451, fixedDryness) {
    const rand = seedRandom(seed), range = (a,b) => a+(b-a)*rand();
    const leaves = [], cells = [], crown = [], dust = [], drops = [], stack = [];
    const rake = { x:-1.02, z:1.02, y:.055, vy:0, vx:0, vz:0, tx:-1.02, tz:1.02, tilt:0, vt:0, press:0, resistance:.5, holding:false, parked:false, wake:0, angle:0, va:0 };
    const nut = { x:PILE.x, y:.09, z:PILE.z, vx:0, vy:0, vz:0, roll:0, reveal:0, visible:false };
    const door = { angle:0, v:0, target:0 };
    const water = { tilt:0, v:0, impulse:0, drops:0, level:0, wave:0, vw:0, boatX:0, boatV:0, boatRoll:0, spin:0, spinV:0, poured:0, sailed:false };
    const fx = { rustle:0, scrape:0, pitch:1600, toothHz:600, crunchHz:225, crunch:0, breeze:0, splash:0, contactDry:.7 };
    const tines=Array.from({length:25},(_,i)=>({side:(i-12)/12,bend:0,v:0,load:0,grain:.84+.26*Math.sin(i*4.79),normalForce:0}));
    const ripples=Array.from({length:13*9},(_,i)=>({h:0,v:0,next:0,x:i%13/6-1,z:Math.floor(i/13)/4-1}));
    let stage=0, act='gather', elapsed=0, idle=0, remainder=0, captured=0, gust=0, windFront=0, diveEnergy=0, returnEnergy=0, cycle=0, active='', pointerX=0, pointerZ=0;
    let emission=0, settleTimer=0, tapped=false, currentPile=.19, tapPatch=false, assistedStroke=false, gestureDistance=0;
    for(let i=0;i<48;i++) cells.push({u:range(-.09,.18),w:range(-.11,.11),du:0,dw:0,aim:range(-.25,.38),side:range(-.15,.15),life:range(.12,2.2),moist:range(.13,.82)});
    const cellAt=(x,z)=>clamp(Math.floor((x+6)/1.5),0,7)+8*clamp(Math.floor((z+8)/2),0,5);
    for(let i=0;i<25;i++)stack.push({height:0,mass:0});
    for(let i=0;i<300;i++){
      const piled=i<92, aerial=i>=284, a=range(0,Math.PI*2), r=Math.sqrt(rand());
      let x=piled?PILE.x+Math.cos(a)*r*.82:range(-3,2.7), z=piled?PILE.z+Math.sin(a)*r*.61:range(-2.45,2.0);
      if(i>=92&&i<143){x=range(-1.55,-.5);z=range(.02,1.45);}
      if(aerial){x=range(-3.7,3.7);z=range(-5.3,2.5);}
      const dry=range(.27,.98), mass=range(.002,.008), nestA=range(-Math.PI,Math.PI), nestR=Math.sqrt(rand()), rank=range(.05,1);
      leaves.push({id:i,x,z,y:aerial?range(1.3,5):.017,homeX:x,homeZ:z,vx:0,vy:0,vz:0,angle:range(-Math.PI,Math.PI),spin:0,roll:range(-.12,.12),vr:0,
        dry:fixedDryness===undefined?dry:fixedDryness,mass,radius:range(.072,.165)*(i%4===0?1.28:1),piled,caught:false,air:aerial,canopy:aerial,
        nestX:piled?x:PILE.x+Math.cos(nestA)*nestR*.82,nestZ:piled?z:PILE.z+Math.sin(nestA)*nestR*.61,rank,baseTilt:range(-.3,.3),dose:0,
        roadZ:-.55-(i%49)/48*5.65,roadSide:range(-.42,.42),released:false,contact:0});
    }
    for(let i=0;i<34;i++) crown.push({cell:Math.floor(rand()*48),angle:range(-.02,.02),v:0,flex:range(.06,.26),mass:range(.5,1.65)});
    for(let i=0;i<64;i++)dust.push({x:range(-6,6),y:range(.3,6),z:range(-7,4),vx:range(-.05,.05),vy:range(-.03,.03),vz:0,drag:range(.15,.6)});
    for(let i=0;i<34;i++)drops.push({x:0,y:0,z:0,vy:0,vx:0,live:false});
    const pileCell=(x,z)=>clamp(Math.floor((x-PILE.x+.86)/.344),0,4)+5*clamp(Math.floor((z-PILE.z+.68)/.272),0,4);
    function loadStack(){
      for(const s of stack)s.mass=0;
      for(const l of leaves)if(l.piled&&!l.air)stack[pileCell(l.x,l.z)].mass+=l.mass;
      for(let i=0;i<25;i++){
        const cx=i%5-2,cz=Math.floor(i/5)-2;
        const core=Math.max(0,1-(cx*cx+cz*cz)/9);
        const m=stack[i].mass;
        const adjacent=(i%5?stack[i-1].mass:0)+(i%5<4?stack[i+1].mass:0)+(i>=5?stack[i-5].mass:0)+(i<20?stack[i+5].mass:0);
        // Loose blades bridge adjacent patches. The centre carries more layers than the unconfined rim.
        stack[i].goal=.018+.93*Math.tanh((m*.62+adjacent*.095)*(4.0+core*6.6)/.93);
      }
    }
    loadStack();
    for(const s of stack)s.height=s.goal;
    currentPile=Math.max(...stack.map(s=>s.height));
    rake.resistance=.5+currentPile*4.9*Math.exp(-hypot(rake.x-PILE.x,rake.z-PILE.z)*.7);
    function bed(l){return l.piled? .018+l.rank*stack[pileCell(l.x,l.z)].height:.013+l.radius*.045;}
    for(const l of leaves)if(!l.air)l.y=bed(l);
    function setAct(s,a){stage=s;act=a;idle=0;active='';assistedStroke=false;tapPatch=false;rake.holding=false;settleTimer=0;}
    function begin(kind,x,z){
      idle=0;pointerX=x;pointerZ=z;tapped=true;gestureDistance=0;
      if(stage===0 && (kind==='rake'||kind==='leaves'&&rake.wake>0)){
        active='rake';rake.holding=true;rake.wake=1;tapPatch=kind==='leaves';assistedStroke=false;rake.tx=tapPatch?x:rake.x;rake.tz=tapPatch?z:rake.z;return true;
      }
      if(act==='park' && (kind==='rake'||kind==='pile')){active='park';rake.tx=PILE.x-.52;rake.tz=PILE.z+.57;return true;}
      if(act==='dive'&&kind==='pile'){setAct(1,'burst');diveEnergy=1;fx.crunch=1;return true;}
      if(act==='nut'&&kind==='nut'){active='nut';nut.vz-=.6;return true;}
      if(act==='wind'&&(kind==='path'||kind==='nut')){active='wind';gust=Math.min(1.8,gust+.82);return true;}
      if(act==='door'&&kind==='door'){setAct(3,'opening');door.target=1.73;return true;}
      if(stage===3&&['pour','sail','play'].includes(act)){
        if(kind==='can'){active='can';water.impulse=1.1;return true;}
        if(kind==='boat'&&water.poured>0){setAct(3,'play');active='boat';water.boatV+=.68;water.sailed=true;return true;}
        if(kind==='wheel'){active='wheel';water.spinV=Math.min(14,water.spinV+4.8);return true;}
        if(kind==='exit'&&act==='play'){setAct(3,'return');returnEnergy=1;return true;}
      }
      return false;
    }
    function move(x,z){
      if(!active)return;idle=0;
      const dx=x-pointerX,dz=z-pointerZ;
      gestureDistance+=hypot(dx,dz);if(gestureDistance>.035)tapped=false;
      if(active==='rake'){rake.tx=clamp(rake.tx+dx,-2.85,2.52);rake.tz=clamp(rake.tz+dz,-2.7,1.85);}
      if(active==='nut'){nut.vx=clamp(nut.vx+dx*2.8,-1.7,1.7);nut.vz=clamp(nut.vz+dz*2.8,-2,1.5);}
      if(active==='wind')gust=clamp(gust+hypot(dx,dz)*.42,0,1.8);
      if(active==='boat')water.boatV=clamp(water.boatV+dx*.9,-.9,.9);
      if(active==='wheel')water.spinV=clamp(water.spinV+dx*9-dz*4,-14,14);
      pointerX=x;pointerZ=z;
    }
    function end(){
      if(active==='rake'&&tapped){assistedStroke=true;if(!tapPatch){rake.tx=PILE.x;rake.tz=PILE.z;}rake.press=1;}
      if(active==='nut'){setAct(2,'wind');gust=.8;nut.vx-=.45;}
      if(active==='can')water.impulse=Math.max(water.impulse,.42);
      rake.holding=false;active='';tapped=false;
    }
    function updateWind(dt){
      for(let i=0;i<cells.length;i++){
        const c=cells[i];c.life-=dt;
        if(c.life<=0){c.aim=range(-.24,.45);c.side=range(-.22,.27);c.life=range(.45,3.6);}
        const next=cells[i%8?i-1:i+1];
        const near=Math.exp(-Math.pow((Math.floor(i/8)*2-7+windFront)/2.4,2));
        c.du+=((c.aim+c.side*.15+gust*near*.9-c.u)*3.2+(next.u-c.u)*.48-2.25*c.du)*dt;
        c.dw+=((c.side-gust*near*1.3-c.w)*2.7+(next.w-c.w)*.5-2.14*c.dw)*dt;
        c.u+=c.du*dt;c.w+=c.dw*dt;
      }
      for(const b of crown){const c=cells[b.cell];b.v+=((c.u*.6+c.w)*b.flex-b.angle*2.8-b.v*1.3)*dt/b.mass;b.angle+=b.v*dt;}
      for(const p of dust){const c=cells[cellAt(p.x,p.z)];p.vx+=(c.u*.46-p.vx-p.x*.016)*p.drag*dt;p.vz+=(c.w*.42-p.vz-(p.z+2)*.014)*p.drag*dt;p.vy+=((2.8-p.y)*.038+c.du*.12-p.vy*.38)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}
    }
    function updateRake(dt){
      const r=rake;
      if(assistedStroke&&hypot(r.tx-r.x,r.tz-r.z)<.16){
        if(tapPatch){r.tx=PILE.x;r.tz=PILE.z;tapPatch=false;}else assistedStroke=false;
      }
      r.resistance=clamp(.5+currentPile*4.9*Math.exp(-hypot(r.x-PILE.x,r.z-PILE.z)*.7)+Math.min(.55,r.press*.32),.5,4);
      const k=31/r.resistance;
      r.vx+=((r.tx-r.x)*k-r.vx*(3.5+r.resistance))*dt;r.vz+=((r.tz-r.z)*k-r.vz*(3.5+r.resistance))*dt;
      r.x+=r.vx*dt;r.z+=r.vz*dt;
      const overlap=Math.exp(-((r.x-PILE.x)**2/.51+(r.z-PILE.z)**2/.34));
      const support=.055+stack[pileCell(r.x,r.z)].height*overlap*(.68-.20*r.press);
      r.vy+=((support-r.y)*46-r.vy*10)*dt;r.y+=r.vy*dt;
      r.vt+=(((r.parked?.95:r.wake?.56:0)-r.tilt)*15-r.vt*5)*dt;r.tilt+=r.vt*dt;
      r.va+=((clamp(r.vx*.3,-.55,.55)-r.angle)*13-r.va*5)*dt;r.angle+=r.va*dt;
      if(!r.holding&&!assistedStroke)r.press*=Math.exp(-dt*1.65);else r.press=Math.min(1,r.press+dt*3);
    }
    function updateLeaves(dt){
      for(const tooth of tines)tooth.load=0;
      let noise=0,weightedDry=0,contacts=0,peak=0;
      loadStack();for(const s of stack){s.height+=.30*Math.tanh((s.goal-s.height)/.30)*(1-Math.exp(-dt*2.5));peak=Math.max(peak,s.height);}currentPile=peak;
      for(const l of leaves){
        const c=cells[cellAt(l.x,l.z)],floor=bed(l),oldY=l.y,oldV=l.vy,sp=hypot(rake.vx,rake.vz);
        const mu=.18+(1-l.dry)*.71, drag=.045/l.mass;
        if(fixedDryness===undefined)l.dry=clamp(l.dry+(.87-c.moist*.35-l.dry)*dt*.0008,0,1);
        const dist=hypot(l.x-rake.x,(l.z-rake.z)*1.16);
        if(!l.air&&dist<.81&&rake.press>.015){
          const tooth=tines[clamp(Math.round(12+(l.x-rake.x)*17),0,24)];
          tooth.load+=l.mass*9.81*(.65+mu)*Math.max(0,1-dist/.81);
        }
        if(stage===0&&!l.piled&&!l.air&&rake.wake&&dist<.84&&rake.press>.045&&(sp>.035||rake.holding)){
          l.caught=true;l.dose=Math.min(1,l.dose+dt*(.9+sp));noise+=Math.min(1,sp)*(.22+l.dry*.46);weightedDry+=l.dry;contacts++;
        }
        if(l.caught){
          // Tines hold a loose bundle. It slips free at the mound or on release.
          const toHeap=hypot(rake.x-PILE.x,rake.z-PILE.z);
          const slip=!rake.holding&&rake.press<.12;
          const tx=rake.x+(l.nestX-PILE.x)*.67,tz=rake.z+(l.nestZ-PILE.z)*.7;
          l.vx+=(tx-l.x)*drag*(1.35+l.dry)*dt;l.vz+=(tz-l.z)*drag*(1.35+l.dry)*dt;
          if(toHeap<.97||slip){
            l.caught=false;
            if(toHeap<1.35||hypot(l.x-PILE.x,l.z-PILE.z)<1.45){l.piled=true;captured++;}
          }
        }
        if(act==='burst'&&l.piled&&!l.released){
          const q=1-diveEnergy;
          if(q>.018+l.rank*.25){const dx=l.x-PILE.x,dz=l.z-PILE.z,k=(.65+l.dry)*.006/l.mass;
            const distance=Math.max(.04,hypot(dx,dz)),speed=2.65*Math.tanh(distance*k*1.25);l.vx+=dx/distance*speed;l.vz+=dz/distance*speed;l.vy=(1.55+l.rank*1.9)*(.76+l.dry*.35);l.spin=range(-5,5);l.vr=range(-4,4);l.air=true;l.released=true;}
        }
        const road=stage>=2&&act!=='return'&&l.id%3!==0&&windFront>=-l.roadZ-.5;
        let targetX=null,targetZ=null,stiff=0;
        if(road){targetX=pathX(l.roadZ)+l.roadSide;targetZ=l.roadZ;stiff=1.3+gust*2;
          if(!l.released){l.air=true;l.vy=.8+l.dry*1.55;l.spin=4.2*Math.tanh((c.u*6+.8)/4.2);l.released=true;}l.piled=false;
        }else if(act==='return'){targetX=l.homeX;targetZ=l.homeZ;stiff=2.6;}
        else if(l.piled&&(!l.air||act!=='burst'||diveEnergy<.23)){targetX=l.nestX;targetZ=l.nestZ;stiff=5;}
        if(targetX!==null){
          const dx=targetX-l.x,dz=targetZ-l.z,dist=Math.max(.001,hypot(dx,dz));
          const acceleration=4.8*Math.tanh(stiff*dist/4.8);
          l.vx+=dx/dist*acceleration*dt;l.vz+=dz/dist*acceleration*dt;
        }
        if(l.air){
          const lift=l.canopy? .43 : 4.1;
          l.vx+=(c.u*(1+l.dry)*.006/l.mass-l.vx*(.55+.26*Math.abs(l.vx)))*dt;l.vz+=(c.w*.007/l.mass-l.vz*(.45+.26*Math.abs(l.vz)))*dt;
          l.vy+=(-lift+(c.du*.38)+.11*Math.sin(l.angle)*l.spin-l.vy*(l.canopy?1.15:.5))*dt;
          l.spin+=(c.u*2-l.spin*.37)*dt;l.vr+=((c.w-l.roll)*1.6-l.vr*.62)*dt;
        }else{
          const force=hypot(c.u,c.w)*.0016;
          if(force>mu*l.mass*1.9){l.vx+=c.u*dt*.25;l.vz+=c.w*dt*.25;}
          const friction=Math.exp(-(l.caught?3.3:2.2+mu*4)*dt);l.vx*=friction;l.vz*=friction;
          l.vy+=((floor-l.y)*54-l.vy*11)*dt;
          l.vr+=((l.baseTilt+c.u*(l.dry+.1)*.26+l.vx*.13-l.roll)*9-l.vr*4)*dt;
          l.spin+=(l.vx*.58+c.dw*.17-l.spin*3.6)*dt;
        }
        l.x+=l.vx*dt;l.z+=l.vz*dt;l.y+=l.vy*dt;l.roll+=l.vr*dt;l.angle+=l.spin*dt;
        if(l.air&&l.y<=floor&&l.vy<0){l.y=Math.max(floor,oldY-.05);l.air=false;l.canopy=false;l.vy=Math.min(.35,-oldV*.09);l.vr+=l.vx*.6;noise+=Math.abs(oldV)*.28;}
        l.contact=dist<.84&&rake.press>.05?sp:0;
      }
      if(contacts)fx.contactDry+=(weightedDry/contacts-fx.contactDry)*(1-Math.exp(-dt*9));
      fx.rustle+=(Math.min(1,noise*.075)-fx.rustle)*(1-Math.exp(-dt*11));
      let scraping=0;
      const speed=hypot(rake.vx,rake.vz);
      for(const tooth of tines){
        const x=rake.x+tooth.side*.69,z=rake.z+.52-.145*tooth.side**2;
        const grit=.50+.23*Math.sin(x*29+z*13)+.18*Math.cos(z*35-x*12);
        const hard=Math.abs(x-pathX(z))<.62?1.42:.85;
        tooth.normalForce=rake.press*(tooth.load+.035*grit*hard)*tooth.grain;
        const deflection=.046*Math.tanh(tooth.normalForce*(2.3+speed));
        tooth.v+=((deflection-tooth.bend)*(420+tooth.side*28)-tooth.v*12)*dt;
        tooth.bend+=tooth.v*dt;
        scraping+=speed*tooth.normalForce*hard+Math.abs(tooth.v)*.14;
      }
      fx.scrape+=(clamp(scraping*.48,0,1)-fx.scrape)*(1-Math.exp(-dt*9));
      fx.toothHz=245+fx.contactDry*510+390*hypot(rake.vx,rake.vz);
      fx.pitch=650+2650*fx.contactDry+260*Math.min(2,hypot(rake.vx,rake.vz));
    }
    function updateMechanisms(dt){
      door.v+=((door.target-door.angle)*5.8-door.v*3.6)*dt;door.angle+=door.v*dt;
      if(nut.visible){
        if(act==='return'){nut.vx+=((PILE.x-nut.x)*2.4)*dt;nut.vz+=(PILE.z-nut.z)*2.4*dt;}
        if(stage===2){const z=-.48-windFront*.81;nut.vx+=((pathX(z)-nut.x)*2.8)*dt;nut.vz+=(z-nut.z)*2.8*dt;}
        nut.vx+=(cells[cellAt(nut.x,nut.z)].u*.025-nut.vx*2.1)*dt;nut.vz-=nut.vz*2.2*dt;nut.x+=nut.vx*dt;nut.z+=nut.vz*dt;nut.roll+=hypot(nut.vx,nut.vz)*dt/.095;
        const nutSupport=.127+currentPile*.87*Math.exp(-((nut.x-PILE.x)**2/.51+(nut.z-PILE.z)**2/.34));nut.vy+=((nutSupport-nut.y)*22-nut.vy*5)*dt;nut.y+=nut.vy*dt;nut.reveal=Math.min(1,nut.reveal+dt*1.4);
      }
      const w=water;w.impulse=Math.max(0,w.impulse-dt*.55);w.v+=(((active==='can'||w.impulse>.05?.67:0)-w.tilt)*13-w.v*4.1)*dt;w.tilt+=w.v*dt;
      if(w.tilt>.28&&stage===3){w.drops+=(w.tilt-.28)*48*dt;if(w.drops>1){const d=drops.find(d=>!d.live);if(d){d.x=-.87+.48*Math.cos(w.tilt)+.26*Math.sin(w.tilt);d.y=.32-.48*Math.sin(w.tilt)+.26*Math.cos(w.tilt);d.z=.088+range(-.015,.015);d.vx=.36+w.tilt*.35;d.vy=-.1;d.live=true;d.serial=++emission;}w.drops--;}}
      for(const d of drops)if(d.live){d.vy-=4.8*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.y<=.158+w.level){d.live=false;w.vw+=.11;
        const ix=clamp(Math.round((d.x-.20)/.712*6+6),0,12),iz=clamp(Math.round((d.z-.10)/.389*4+4),0,8);
        ripples[ix+13*iz].v+=Math.min(.25,-d.vy*.13);w.level=Math.min(.035,w.level+.0006);w.poured++;fx.splash=.6;}}
      // Closed basin edges reflect a pressure front. Each patch carries its own height and momentum.
      for(let i=0;i<ripples.length;i++){const p=ripples[i],x=i%13,z=Math.floor(i/13);
        const lap=(x?ripples[i-1].h:p.h)+(x<12?ripples[i+1].h:p.h)+(z?ripples[i-13].h:p.h)+(z<8?ripples[i+13].h:p.h)-4*p.h;
        p.next=(lap*89-p.v*2.1-p.h*4.0);}
      for(const p of ripples){p.v+=p.next*dt;p.h+=p.v*dt;}
      const boatCell=clamp(Math.round(w.boatX/.712*6+6),1,11)+13*5;
      const slope=(ripples[boatCell+1].h-ripples[boatCell-1].h)*4.2;
      w.vw+=(-w.wave*30-w.vw*2.8)*dt;w.wave+=w.vw*dt;w.boatV+=(-w.boatX*2.5-w.boatV*1.20-slope*.8+(w.sailed?w.spinV*.035:0))*dt;w.boatX+=w.boatV*dt;
      if(Math.abs(w.boatX)>.395&&w.boatV*w.boatX>0){ripples[boatCell].v+=Math.abs(w.boatV)*.08;w.boatV*=-.48;}
      w.boatRoll+=((slope+w.boatV*.14)-w.boatRoll)*dt*4;
      w.spinV+=(w.wave*.6+cells[11].u*.16-w.spinV*1.2)*dt;w.spin+=w.spinV*dt;
    }
    function tick(dt){
      elapsed+=dt;if(!active)idle+=dt;updateWind(dt);updateRake(dt);updateLeaves(dt);updateMechanisms(dt);
      fx.crunch*=Math.exp(-dt*3.4);fx.splash*=Math.exp(-dt*5);gust*=Math.exp(-dt*(active==='wind'?.13:.32));fx.breeze=gust*.35;
      if(stage===0&&captured>=64){setAct(1,'park');fx.crunch=.75;}
      if(act==='park'&&hypot(rake.x-(PILE.x-.52),rake.z-(PILE.z+.57))<.17&&Math.abs(rake.tx-PILE.x+.52)<.02){rake.parked=true;setAct(1,'dive');}
      if(act==='burst'){diveEnergy*=Math.exp(-dt*.9);if(diveEnergy<.14&&!nut.visible){nut.visible=true;nut.vy=1.15;}
        if(diveEnergy<.048){setAct(1,'nut');for(const l of leaves)l.released=false;}}
      if(stage===2){windFront=Math.min(7,windFront+gust*dt*(active==='wind'?1.7:1.05));door.target=clamp((windFront-2)*.10,0,.43);if(act==='wind'&&windFront>=6.4)setAct(2,'door');}
      if(act==='opening'&&door.angle>1.57)setAct(3,'pour');
      if(act==='pour'&&water.poured>=3)setAct(3,'sail');
      if(act==='play'){settleTimer+=dt;if(settleTimer>24&&idle>6){setAct(3,'return');returnEnergy=1;}}
      if(act==='return'){returnEnergy*=Math.exp(-dt*.65);door.target=0;if(returnEnergy<.035){
        for(const l of leaves){l.piled=l.id<92;l.caught=false;l.released=false;l.dose=0;}
        captured=0;windFront=0;gust=0;Object.assign(nut,{visible:false,x:PILE.x,y:.09,z:PILE.z,vx:0,vy:0,vz:0,reveal:0});water.sailed=false;water.poured=0;water.level=0;rake.parked=false;rake.wake=0;rake.tx=-1.02;rake.tz=1.02;cycle++;setAct(0,'gather');}}
    }
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;remainder+=dt;while(remainder+1e-10>=1/120){tick(1/120);remainder-=1/120;}}
    function nudge(x,z){cells[cellAt(x,z)].du+=.012;}
    function state(){return {stage,act,elapsed,idle,captured,gust,windFront,diveEnergy,returnEnergy,cycle,currentPile,rake,nut,door,water,fx,leaves,cells,crown,dust,drops,stack,ripples,tines};}
    return {step,getState:()=>JSON.parse(JSON.stringify(state())),view:state,begin,move,end,nudge};
  }
  const api={makeGarden,seedRandom,PILE,SHED,pathX};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.Autumn=api;
})(typeof window==='undefined'?globalThis:window);
