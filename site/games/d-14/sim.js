/* Lengths in cm, time in s, temperature in degrees C. No DOM or rendering dependency. */
(function (root) {
  'use strict';
  const N = 22, A = 16, clamp = (x,l=0,h=1) => Math.min(h,Math.max(l,x));
  function random(seed) { return () => {seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;}; }
  function profile(kind,u,large=false) {
    const foot = Math.min(1,u*10);
    if(kind==='vase') {
      const neck=clamp((u-.51)/.27),belly=Math.sin(Math.PI*clamp(u/.83));
      return (5.15+5.05*belly**1.22-1.82*neck*neck*(3-2*neck)+1.73*u**17)*(.94+.06*foot);
    }
    if(kind==='jar') return (6.3+5.4*Math.sin(Math.PI*u*.89)**.78+1.2*u-1.25*Math.exp(-((u-.92)**2)/.006))*(.9+.1*foot)*(large?1.17:1);
    return (5.25+6.3*Math.sin(u*Math.PI*.58)**.81+.38*u**12)*(.92+.08*foot);
  }
  const heightOf=(kind,large)=>kind==='vase'?19.2:kind==='jar'?(large?20.5:15.8):11.3;
  function body(wet) {
    return Array.from({length:N},(_,i)=>{let u=i/(N-1); return {r:6.7+3.75*Math.sin(u*2.24)**.75,vr:0,z:u*7.9,vz:0,wet:clamp(wet+.026*Math.cos(u*4.6)),strain:0,waterFilm:0};});
  }
  const array=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
  function create(opts={}) {
    const rand=random(opts.seed??118), startWet=opts.water??.72;
    let s={time:0,stage:'shape',age:0,idle:0,round:0,cycle:0,kind:'bowl',rpm:117,angle:0,
      clay:body(startWet),depth:1.35,vd:0,force:0,stroke:0,spread:0,work:0,match:0,matchV:0,shadowSlot:-1,shadowV:0,
      water:array(21,i=>({h:.037*Math.cos(i*1.7),v:0})),drop:0,splash:0,dripWait:2.2,dripIndex:5,
      pigment:Array(A*N).fill(0),dyes:Array(A*N*3).fill(0),liquid:Array(A*N*3).fill(0),film:Array(A*N).fill(0),feed:0,poured:0,tilt:0,tiltV:0,color:0,
      heat:array(9,i=>25+i*1.3),potHeat:Array(N).fill(24),fired:Array(N).fill(0),fuel:0,fire:array(14,()=>({h:0,v:0,w:rand(),energy:0})),
      door:0,doorV:0,travel:0,travelV:0,coil:0,coilV:0,coilPart:array(56,()=>({q:0,v:0})),stack:0,stackV:0,stackBounce:0,
      daylight:0,dayV:0,wind:.22,windTarget:.35,gust:2,
      motes:array(28,()=>({x:rand(),y:rand(),z:rand(),vx:0,vy:(rand()-.5)*.025})),
      basket:0,basketV:0,camKiln:0,camKilnV:0,camShelf:0,camShelfV:0,entry:1,entryV:0,sway:array(5,i=>({x:0,v:0,k:5+i*1.9})),hint:0,guidePhase:0,guideGap:0,
      collection:[],flowers:[],flowerCount:0,bloomChoice:0,flowerAt:0,flowerV:0,hit:0,hitPart:'',inContact:false};
    let contact=null, posY=0, originX=0, originY=0, choice=null, accumulator=0, dripFlight=false;
    const stage=x=>{s.stage=x;s.age=0;s.idle=0;s.hint=0;s.guidePhase=0;s.guideGap=0;contact=null;s.inContact=false;};
    function down(part,x=.5,y=.5,pressure=.5) {
      if(contact) return false;
      s.idle=0;s.hint=0;s.guidePhase=0;s.guideGap=0;s.hitPart=part;s.hit=Math.min(1,s.hit+.34);
      if(part==='water' && ['shape','coilSeal'].includes(s.stage)){
        s.water[9].v+=1.7;s.splash=1;
        s.clay.forEach((p,i)=>p.waterFilm=clamp(p.waterFilm+.14+.16*Math.exp(-((i/(N-1)-.68)**2)/.12))); return true;
      }
      if((s.stage==='shape'||s.stage==='coilSeal')&&part==='clay'){
        contact={x,y,pressure:clamp(pressure||.5,.12,1),level:clamp(1-y)};s.inContact=true;posY=y;originX=x;originY=y;return true;
      }
      if(s.stage==='coil'&&part==='coil'){stage('winding');return true;}
      if(s.stage==='stack'&&part==='stack'){stage('nesting');return true;}
      if((s.stage==='glaze'||s.stage==='kilnReady')&&/^jar[012]$/.test(part)){
        s.color=Number(part.slice(-1));s.feed=0;stage('pour');return true;
      }
      if(s.stage==='kilnReady'&&(part==='kiln'||part==='clay')){stage('loading');return true;}
      if(s.stage==='flower'&&/^flower[012]$/.test(part)&&!s.flowers.includes(Number(part.slice(-1)))){
        s.bloomChoice=Number(part.slice(-1));s.flowerAt=0;s.flowerV=0;stage('planting');return true;
      }
      return false;
    }
    function move(x,y,p=.5) {
      if(!contact)return;const dy=posY-y;
      s.stroke=clamp(Math.max(s.stroke,(originY-y)*1.35)+Math.max(0,dy)*.12);
      s.spread=clamp(x-originX,-1,1);
      contact.x=x;contact.y=y;contact.pressure=clamp((p||.5)+Math.max(0,y-originY)*1.5,.12,1);contact.level=clamp(1-y);posY=y;
    }
    function up(){contact=null;s.inContact=false;}
    // 指圧と回転が局所の降伏抵抗を超えた環だけが動く。離指後は速度が粘性で減衰する。
    // 桶の水は表面の膜から環へ浸透し、隣り合う環へ拡散する。乾いた環は変形を止める。
    function clayStep(dt){
      const shaping=s.stage==='shape'||s.stage==='coilSeal';
      const force=contact&&shaping ? .55+.43*contact.pressure : 0;
      s.force+=(force-s.force)*(1-Math.exp(-dt*(force?5:3.3)));
      const rpmGoal=shaping?120-4.1*s.force:['coil','winding','glaze','pour'].includes(s.stage)?46:0;
      s.rpm+=(rpmGoal-s.rpm)*(1-Math.exp(-dt*(shaping?2.1:.95)));
      s.angle+=s.rpm*Math.PI/30*dt;
      if(!shaping){
        if(!['display','flower','planting','bouquet','dawn'].includes(s.stage))for(const p of s.clay){
          p.vr*=Math.exp(-5.6*dt);p.vz*=Math.exp(-5.9*dt);p.r+=p.vr*dt;p.z+=p.vz*dt;}
        return;}
      if(s.round===1)choice='jar';else if(s.round===2)choice='bowl';
      else if(contact)choice=s.stroke>.59&&s.spread<.28?'vase':s.stroke>.24&&s.spread<.28?'jar':'bowl';
      s.kind=choice||'bowl';
      const slot=s.kind==='bowl'?-1:s.kind==='jar'?0:1;
      s.shadowV+=dt*(16*(slot-s.shadowSlot)-8*s.shadowV);s.shadowSlot+=dt*s.shadowV;
      const H=heightOf(s.kind,s.round===1), focus=contact?contact.level:.7, lastWet=s.clay.map(p=>p.wet);
      let err=0;
      for(let i=0;i<N;i++){
        const u=i/(N-1),p=s.clay[i],a=lastWet[i?i-1:i],b=lastWet[Math.min(N-1,i+1)];
        const uptake=Math.min(p.waterFilm*1.8,(1-p.wet)*1.2);p.waterFilm=Math.max(0,p.waterFilm-dt*(uptake+.02*p.waterFilm));
        p.wet=clamp(p.wet+dt*(uptake+(a+b-2*p.wet)*.55-(.00031+.00055*u)*(1+.66*s.force)),.08,1);
        const mobility=clamp((p.wet-.16)/.56)**1.65;
        const band=.48+.54*Math.exp(-((u-focus)**2)/.1);
        const load=s.force*mobility*band*(.55+.45*s.rpm/120);
        const target=profile(s.kind,u,s.round===1);
        const damp=4.8+2.4*(1-mobility);
        p.vr+=dt*(load*(target-p.r)*2.15-damp*p.vr);
        p.vz+=dt*(load*(H*u-p.z)*(2.35+.75*s.stroke)-damp*p.vz);
        p.r+=dt*p.vr;p.z+=dt*p.vz;p.strain+=dt*Math.abs(p.vr)*.025;
        err+=((target-p.r)/3.5)**2+((H*u-p.z)/4)**2;
      }
      const top=s.clay[N-1];
      s.vd+=dt*(s.force*clamp((top.wet-.14)/.56)*(.9+1.6*(contact?contact.pressure:.3))*(top.z-1.5-s.depth)-3.4*s.vd);
      s.depth=clamp(s.depth+s.vd*dt,.9,top.z-.82);
      s.work+=s.force*dt;
      const likeness=1-Math.min(1,Math.sqrt(err/N));
      s.matchV+=dt*(18*(likeness-s.match)-8.5*s.matchV);s.match=clamp(s.match+s.matchV*dt);
      if(s.force>.18&&(s.stage==='coilSeal'?s.age>2.4&&s.work>1.35:
        s.match>.885&&s.depth>top.z*.65&&s.work>3)){
        stage(s.stage==='coilSeal'?'aligned':s.round===1?'coil':s.round===2?'stack':'aligned');
      }
    }
    // 風の変化を各々の埃の抗力と枝のばねに通す。空気の区画境界では埃を押し戻す。
    function atmosphere(dt){
      for(const [q,active] of [['camKiln',['loading','firing','unloading'].includes(s.stage)],['camShelf',['display','flower','planting','bouquet','dawn'].includes(s.stage)],['entry',true],['basket',s.round===2&&(['flower','planting'].includes(s.stage)||(s.stage==='display'&&s.age>1))]]){
        const v=q+'V';s[v]+=dt*(4.3*(Number(active)-s[q])-4.2*s[v]);s[q]=clamp(s[q]+dt*s[v]);}
      if((s.gust-=dt)<=0){s.gust=1.8+rand()*3.8;s.windTarget=rand()*.85-.21;}
      s.wind+=(s.windTarget-s.wind)*dt*.78;
      for(const [i,m] of s.motes.entries()){
        m.vx+=(s.wind*(.014+i*.00035)-m.vx)*dt*(.6+m.z);
        m.vy+=dt*((.007-m.vy)*.7+.007*Math.sin(m.x*9+i)*s.wind);
        // Closed air cells turn the grains at their boundaries without teleporting them.
        if(m.x>.88)m.vx-=dt*.13*(m.x-.88)*9;if(m.x<.08)m.vx+=dt*.09;
        if(m.y>.85)m.vy-=dt*.15*(m.y-.85)*12;
        m.x+=m.vx*dt;m.y+=m.vy*dt;
      }
      s.sway.forEach((p,i)=>{p.v+=dt*((s.wind*(.135+.048*i)+s.sway[Math.max(0,i-1)].x*.2)-p.k*p.x-1.15*p.v);p.x+=dt*p.v;});
      const target=s.stage==='dawn'?0:clamp((s.collection.length+(s.stage==='unloading'?s.travel-1:0))/3);
      s.dayV+=dt*((target-s.daylight)*.25-s.dayV*.98);s.daylight=clamp(s.daylight+s.dayV*dt);
      s.hit*=Math.exp(-4*dt);
      if(!contact)s.idle+=dt;else s.idle=0;
      const active=['shape','glaze','kilnReady','coil','coilSeal','stack','flower'].includes(s.stage);
      if(active&&s.idle>=4){
        if(s.guideGap>0){s.guideGap-=dt;s.hint=Math.max(0,s.hint-dt*3);}
        else{s.guidePhase+=dt*(s.stage==='shape'?.39:.50);s.hint=clamp(s.hint+dt*2.5);
          if(s.guidePhase>1){s.guidePhase=0;s.guideGap=1.3;}}
      }else s.hint=Math.max(0,s.hint-3*dt);
    }
    // 滴が水面に接触するまで水面への力はゼロ。衝突点から隣接区画へ波が伝わり、桶の縁で反射する。
    function waterStep(dt){
      if(!dripFlight&&(s.dripWait-=dt)<=0){dripFlight=true;s.drop=0;}
      if(dripFlight){s.drop+=dt*1.8;if(s.drop>=1){s.drop=0;dripFlight=false;
        s.dripIndex=4+Math.floor(rand()*12);s.water[s.dripIndex].v-=1.1+rand()*.6;s.splash=.9;s.dripWait=2.1+rand()*2.1;}}
      s.splash=Math.max(0,s.splash-dt*1.15);
      const h=s.water.map(p=>p.h);
      s.water.forEach((p,i)=>{const left=h[i===0?1:i-1],right=h[i===h.length-1?i-1:i+1];
        p.v+=dt*(55*(left+right-2*h[i])-.88*p.v-1.9*p.h+s.wind*.016*Math.cos(i*.8));
        p.h+=dt*p.v;});
    }
    // 瓶口が傾いたときだけ給液。環と方位ごとの保持量を超えた液と色素が下の区画へ落ちる。
    // 瓶を戻した後にも残液は流れ、素地に吸着した色だけがその場に残る。
    function glazeStep(dt){
      const pouring=s.stage==='pour';
      const aim=pouring&&s.age<3.7?1:0;
      s.tiltV+=dt*(9*(aim-s.tilt)-5*s.tiltV);s.tilt=clamp(s.tilt+s.tiltV*dt);
      s.feed=pouring&&s.age<4.1?clamp((s.tilt-.52)*3):0;
      if(s.feed>0)s.poured+=s.feed*dt;
      if(!s.poured)return;
      const old=s.film.slice(),liquid=s.liquid.slice(),spin=s.angle/(2*Math.PI)*A;
      for(let i=0;i<N;i++)for(let j=0;j<A;j++){
        const k=i*A+j,capacity=.34+.11*Math.sin(j*3.4+i*.75);
        const flow=(k,q)=>Math.max(0,old[k]-q)*1.9;
        const inflow=i===N-1?s.feed*Math.max(0,1-Math.abs(((j+spin)%A+A)%A-A/2)/3)*11:flow(k+A,.34+.11*Math.sin(j*3.4+(i+1)*.75));
        const side=old[i*A+(j+1)%A]+old[i*A+(j+A-1)%A]-2*old[k];
        s.film[k]=Math.max(0,old[k]+dt*(inflow-flow(k,capacity)+.72*side-.27*old[k]));
        for(let c=0;c<3;c++){
          const at=(q)=>liquid[q*3+c],up=i===N-1?(c===s.color?1:0):at(k+A)/Math.max(.000001,old[k+A]);
          const sideMass=at(i*A+(j+1)%A)+at(i*A+(j+A-1)%A)-2*at(k);
          const m=Math.max(0,at(k)+dt*(inflow*up-flow(k,capacity)*at(k)/Math.max(.000001,old[k])+.72*sideMass-.27*at(k)));
          s.liquid[k*3+c]=m;
          const absorb=1-Math.exp(-s.film[k]*2.2*dt);
          s.dyes[k*3+c]+=(m/Math.max(.000001,s.film[k])-s.dyes[k*3+c])*absorb;
        }
        s.pigment[k]=clamp(s.pigment[k]+dt*s.film[k]*(1-s.pigment[k])*2.2);
      }
      if(pouring&&s.age>6)stage('kilnReady');
    }
    // 薪の放熱、隣室の伝導、扉からの冷却。炎は個別の燃料塊が尽きると縮み、焼成色は冷えても残る。
    function kilnStep(dt) {
      const firing=s.stage==='firing';
      const doorAim=['loading','unloading'].includes(s.stage)?1:0;
      s.doorV+=dt*(10*(doorAim-s.door)-5.2*s.doorV);s.door=clamp(s.door+s.doorV*dt);
      const target=firing&&s.age<9?1:0;s.fuel+=(target-s.fuel)*dt*(target?.82:.48);
      const prev=s.heat.slice();
      for(let i=0;i<9;i++){
        const flame=s.fuel*(1-.045*i)*(152+11*Math.sin(i*1.5+s.wind*2));
        const adj=(prev[Math.min(8,i+1)]+prev[Math.max(0,i-1)]-2*prev[i])*.54;
        s.heat[i]+=dt*(flame+adj-(prev[i]-24)*(.018+.11*s.door+(firing&&s.age>9?.17:0)));
      }
      const exposure=firing?1:s.stage==='loading'?s.travel**3:s.stage==='unloading'?clamp(2-s.travel)**3:0;
      const last=s.potHeat.slice();
      s.fired.forEach((v,i)=>{
        const u=i/(N-1),air=24+(s.heat[Math.floor(u*8)]-24)*exposure;
        const conduction=(last[Math.max(i-1,0)]+last[Math.min(N-1,i+1)]-2*last[i])*.68;
        s.potHeat[i]+=dt*((air-last[i])*(.36+.16*u)+conduction);
        s.fired[i]=clamp(v+dt*Math.max(0,s.potHeat[i]-550)/240*(1-v)*.83);
      });
      for(const [i,f] of s.fire.entries()){
        f.energy+=dt*(s.fuel*(1.5+f.w)-.7*f.energy);
        if(f.energy>f.w+.15){f.energy-=f.w+.15;f.v+=1+f.w;f.w=.22+rand()*.77;}
        f.v+=dt*(-8*f.h-2.8*f.v);f.h=Math.max(0,f.h+dt*f.v);
      }
      if(s.stage==='loading'||s.stage==='unloading'){
        const end=s.stage==='loading'?1:2;const goal=s.door>.61?end:end-1;s.travelV+=dt*(2.7*(goal-s.travel)-2.9*s.travelV);s.travel=clamp(s.travel+dt*s.travelV,0,end);
        if(s.travel>end-.005){if(s.stage==='loading'){stage('firing');}
          else {s.collection.push({kind:s.kind,large:s.round===1,stacked:s.round===2,color:s.color,
            profile:s.clay.map(p=>[p.r,p.z]),fire:s.fired.slice(),coat:s.pigment.slice(),dyes:s.dyes.slice(),depth:s.depth});stage('display');}}
      }
      if(firing&&s.age>=15){stage('unloading');}
    }
    // 粘土ひもは先端から順に接触して巻き付く。上の器は高台の接触で反発し、花は茎の奥まで収まる。
    function extras(dt){
      if(s.stage==='aligned'&&s.age>2.9)stage('glaze');
      if(s.stage==='winding'){
        s.coilV+=dt*((1-s.coil)*1.9-2.7*s.coilV);s.coil=clamp(s.coil+dt*s.coilV);
        s.coilPart.forEach((p,i)=>{const target=clamp((s.coil*1.52-i/55*.52)*1.04);p.v+=dt*(17*(target-p.q)-7.6*p.v);p.q=clamp(p.q+p.v*dt);});
        if(s.coilPart[55].q>.991){s.work=0;stage('coilSeal');}
      }
      if(s.stage==='nesting'){
        // The upper bowl is let down onto the shoulder. A soft foot absorbs impact.
        const old=s.stack;s.stackV+=dt*(.48+.06*s.wind);
        s.stack+=dt*s.stackV;if(s.stack>=1){s.stack=1;s.stackBounce=Math.max(s.stackBounce,Math.abs(s.stackV));s.stackV*=-.22;if(Math.abs(s.stackV)<.025)s.stackV=0;}
        s.stackBounce*=Math.exp(-3*dt);
        if(old>.999&&s.stackV===0)stage('aligned');
      }
      if(s.stage==='display'&&s.age>4){
        if(s.round===2)stage('flower');else{resetPiece();s.round++;stage('shape');}
      }
      if(s.stage==='planting'){
        s.flowerV+=dt*(3*(1-s.flowerAt)-3.2*s.flowerV);s.flowerAt=clamp(s.flowerAt+dt*s.flowerV);
        if(s.flowerAt>.995){s.flowers.push(s.bloomChoice);s.flowerCount++;stage(s.flowerCount>=3?'bouquet':'flower');}
      }
      if(s.stage==='bouquet'&&s.age>7)stage('dawn');
      if(s.stage==='dawn'&&s.age>9){s.collection=[];s.flowers=[];s.flowerCount=0;s.round=0;s.cycle++;resetPiece();stage('shape');}
    }
    function resetPiece(){
      s.entry=0;s.entryV=0;s.clay=body(startWet);s.depth=1.35;s.vd=s.force=s.stroke=s.spread=s.work=s.match=s.matchV=0;choice=null;
      s.pigment.fill(0);s.dyes.fill(0);s.liquid.fill(0);s.film.fill(0);s.potHeat.fill(24);s.fired.fill(0);s.fuel=s.feed=s.poured=s.tilt=s.tiltV=0;
      s.travel=s.travelV=s.coil=s.coilV=s.stack=s.stackV=s.stackBounce=0;s.kind='bowl';s.color=0;s.coilPart.forEach(p=>{p.q=p.v=0;});
    }
    function step(seconds) {
      if(!Number.isFinite(seconds)||seconds<=0)return;
      accumulator+=seconds;const dt=1/120;
      while(accumulator+1e-10>=dt){accumulator-=dt;s.time+=dt;s.age+=dt;
        clayStep(dt);waterStep(dt);atmosphere(dt);glazeStep(dt);kilnStep(dt);extras(dt);}
    }
    return {step,getState:()=>JSON.parse(JSON.stringify(s)),state:s,down,move,up};
  }
  const api={create,profile,heightOf,N,A,clamp};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Pottery=api;
})(globalThis);
