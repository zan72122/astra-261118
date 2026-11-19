/* Material coordinates run from the crown to the foot of the sweet.
   Lengths are millimetres, time is seconds, temperature is Celsius. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, N = 80, M = 26, COUNT = N * (M + 1);
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const bell = x => Math.exp(-x * x);
  const delta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const wave = (a, b, t) => { const f = clamp((t-a)/(b-a)); return f*f*(3-2*f); };
  const X = new Float32Array(COUNT), Z = X.slice(), AREA = X.slice(), U = X.slice();
  const AX = new Float32Array(N), AZ = AX.slice();
  for (let i=0; i<N; i++) {
    AX[i]=Math.cos(i*TAU/N); AZ[i]=Math.sin(i*TAU/N);
    for (let j=0; j<=M; j++) {
      const k=j*N+i, r=2*j/M;
      X[k]=r*AX[i]; Z[k]=r*AZ[i]; U[k]=j/M;
      AREA[k]=Math.max(.025, Math.sin(Math.PI*(j+.35)/(M+.7))) * 23*23*Math.PI/M*TAU/N;
    }
  }
  function create(options = {}) {
    const mass = options.mass ?? 1, water = options.water ?? .64;
    const s = {stage:'white',cycle:0,time:0,age:0,idle:0,seed:options.seed??2503,
      angle:0,spin:0,wind:.04,breeze:.04,lux:.93,hint:0,hintAge:0,hintRound:0,hintKind:'material',
      bladeFilm:[.05,.12,.07],bladeLoad:[0,0,0], bladeAngle:1.10, bladeYaw:.45, nextAngle:1.10,
      white:X.slice(),raised:X.slice(),displaced:X.slice(),liftGoal:X.slice(),groove:X.slice(),velocity:X.slice(),
      moisture:X.slice(),temp:X.slice(),print:X.slice(),rim:new Float32Array(N),
      whiteOnFinger:0, travel:0,hollow:0,spread:0,stroke:null,auto:null,
      tool:0,dish:0,paper:0,delivery:0,slide:0,dropped:0,gather:0,
      carryLift:0,tilt:0,rub:0,peel:0,woodHz:134,woodGain:0,frictionHz:1600,peelHz:2872,knock:0,mass, particles:[], crumbs:[],demo:0, touchGlow:0};
    function random() {s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}
    function newPaste() {
      s.whiteOnFinger=0;s.travel=0;s.hollow=0;s.spread=0;s.slide=0;s.gather=0;s.dropped=0;
      s.crumbs=[];s.rim.fill(0);s.raised.fill(0);s.displaced.fill(0);s.liftGoal.fill(0);s.velocity.fill(0);s.groove.fill(0);s.print.fill(0);
      for(let k=0;k<COUNT;k++){
        const x=X[k],z=Z[k];
        const d=((x+.022+.055*Math.sin(z*10))/.29)**2+((z-.015)/.235)**2;
        s.white[k]=1.65*mass*Math.exp(-d*d*1.65);
        s.temp[k]=20.8+.53*x+.14*Math.cos(z*6);
        s.moisture[k]=clamp(water+.035*Math.sin(4*x+1.3*z)+.017*Math.cos(z*7));
      }
    }
    newPaste();
    for(let i=0;i<26;i++)s.particles.push({x:random()*12-6,y:random()*5,z:random()*9-5,v:0,k:random(),steam:i<9});
    function stage(name){s.stage=name;s.age=0;s.idle=0;s.hint=0;s.hintAge=0;s.hintRound=0;s.hintKind='material';s.auto=null;}
    function begin(kind,x,z,opts={}) {
      if(s.stroke||s.auto)return false;
      const allowed={white:['smear'],petal:['push','turn'],pinch:['pinch','turn','push'],gather:['gather','turn'],paper:['slide','turn']};
      if(!allowed[s.stage]?.includes(kind)) return false;
      const a=Math.atan2(z,x);
      s.stroke={kind,x,z,px:x,pz:z,sx:x,sz:z,angle:a,face:clamp(opts.face??.55),force:clamp(opts.force??.65,.3,1),path:0,age:0,work:0,turn:0};
      s.idle=0;s.hint=0;s.hintAge=0;
      return true;
    }
    function move(x,z,turn=0) {
      const c=s.stroke;if(!c)return;
      c.path+=Math.hypot(x-c.x,z-c.z); c.x=x;c.z=z;c.turn+=turn;
    }
    function end(){
      const c=s.stroke;if(!c)return;
      s.stroke=null;
      if(c.kind==='turn')return;
      if(['smear','push','gather'].includes(c.kind)){
        s.peel=Math.max(s.peel,.18+c.force*.4+s.bladeFilm[1]*.4);
        const zone=Math.min(2,Math.floor(c.face*3));
        s.peelHz=2800+600*s.bladeFilm[zone];
      }
      // A brief touch receives the same small assisted motion as a child's short stroke.
      if(c.kind==='smear' && (c.path<.075 || c.age<.10)){
        c.tx=c.path<.075?c.sx+.14:c.x;c.tz=c.path<.075?c.sz+.08:c.z;c.startX=c.px;c.startZ=c.pz;c.remaining=.28;s.auto=c;return;
      }
      if(c.kind==='push'){
        c.remaining=.46;c.boost=Math.max(.45,1.25-c.work);s.auto=c;return;
      }
      if(c.kind==='pinch'){stage('lift');return;}
      if(c.kind==='gather'){c.remaining=.7;s.auto=c;return;}
      if(c.kind==='slide'){s.auto={...c,remaining:.85};return;}
      if(c.kind==='smear')finishSmear();
    }
    function finishSmear(){stage('petal');s.nextAngle=1.10;}
    function drop(){
      stage('fall');s.knock=.25;
      for(let i=0;i<53;i++){
        const a=random()*TAU,r=Math.sqrt(random())*.59;
        const x=r*Math.cos(a),z=r*Math.sin(a);
        s.crumbs.push({x,z,y:1.65+random()*.4,vx:(random()-.5)*.65,vz:(random()-.5)*.65,vy:-.2-random(),size:.039+random()*.036,seat:.035+random()*.07,targetX:x*.46,targetZ:z*.46});
      }
    }
    function press(c,dt) {
      const inward=Math.max(0, Math.hypot(c.sx,c.sz)-Math.hypot(c.x,c.z));
      const area=.13+.24*c.face;
      const strength=(c.remaining?c.boost:Math.min(1.45,.13+inward*2.6+c.path*.8))*c.force;
      const sector=Math.round((c.angle/TAU+1)*N)%N;
      const damp=s.moisture[10*N+sector];
      const softness=clamp(.88+.043*(s.temp[10*N+sector]-19),.72,1.22);
      c.work+=dt*strength; s.nextAngle=c.angle;
      const zone=Math.min(2,Math.floor(c.face*3));
      s.bladeLoad[zone]+=(strength-s.bladeLoad[zone])*dt*9;
      s.bladeFilm[zone]+=dt*strength*(damp-s.bladeFilm[zone])*.42;
      for(let i=0;i<N;i++){
        const d=delta(i*TAU/N,c.angle);
        if(Math.abs(d)>area*3.5)continue;
        const massFlow=bell(d/area)*strength*(.5+damp)*dt*12*softness/mass;
        s.rim[i]+=massFlow*(1-s.rim[i]/8);
        const edge=bell((Math.abs(d)-area*1.28)/(.058+.04*c.face));
        // Convergent surface flow carries the pale skin from the crown to the
        // new lip. Divide by cell area to conserve the volume of white paste.
        for(let j=6;j>=0;j--){
          const k=j*N+i, fraction=1-Math.exp(-massFlow*(1.75-j*.20));
          const transported=s.white[k]*fraction;
          s.white[k]-=transported;s.white[k+N]+=transported*AREA[k]/AREA[k+N];
        }
        let volume=0,receivingArea=0;
        for(let j=1;j<M;j++){
          const k=j*N+i,u=U[k],yielding=.4+s.moisture[k];
          const donor=bell((u-.43)/.133);
          const cut=massFlow*.93*yielding*Math.max(0,donor-s.displaced[k]/4.2);
          s.displaced[k]+=cut;volume+=cut*AREA[k];
          receivingArea+=bell((u-.25)/.103)*AREA[k];
          s.groove[k]+=dt*strength*edge*bell((u-.35)/.20)*7*(1-s.groove[k]/3.8);
          s.moisture[k]+=dt*strength*bell(d/area)*.009;
        }
        for(let j=1;j<M;j++){
          const k=j*N+i;
          s.liftGoal[k]+=volume*bell((U[k]-.25)/.103)/receivingArea;
        }
      }
      s.rub=Math.max(s.rub,strength*.36);
    }
    function smear(c,dt,demo=false){
      const dx=c.x-c.px,dz=c.z-c.pz,dist=Math.hypot(dx,dz);
      const speed=Math.min(4,dist/dt),take=1-Math.exp(-dt*(1.4+speed*16));
      let sum=0;
      for(let k=0;k<COUNT/2;k++){
        const d=((X[k]-c.px)**2+(Z[k]-c.pz)**2)/.032;
        if(d>7)continue;
        const q=take*Math.exp(-d)*c.force*(.45+s.moisture[k])*(demo?.4:1);
        const v=s.white[k]*Math.min(.86,q);
        s.white[k]-=v;s.whiteOnFinger+=v*AREA[k];
      }
      const weights=[];
      for(let k=0;k<COUNT/2;k++){
        const d=((X[k]-c.x)**2+(Z[k]-c.z)**2)/(.017+.004*c.force);
        if(d>6)continue;
        const w=Math.exp(-d);sum+=w*AREA[k];weights.push(k,w);
        s.print[k]+=dt*w*c.force*4*(1-s.print[k]/1.55);
        s.temp[k]+=dt*w*(30-s.temp[k])*.32;
        s.moisture[k]+=dt*w*.023*(1-s.moisture[k]);
      }
      const deposit=s.whiteOnFinger*(1-Math.exp(-dt*(2+speed*7)));
      if(sum){for(let n=0;n<weights.length;n+=2)s.white[weights[n]]+=deposit*weights[n+1]/sum;s.whiteOnFinger-=deposit;}
      c.px=c.x;c.pz=c.z;s.travel+=dist;s.rub=Math.max(s.rub,speed*.12);
    }
    function tick(dt){
      s.time+=dt;s.age+=dt;s.idle=s.stroke?0:s.idle+dt;
      s.breeze=clamp(s.breeze+(random()-.5)*.087,-.8,.8);
      s.wind+=(s.breeze-s.wind)*dt*.65;
      s.lux+=(.95+.065*s.wind-s.lux)*dt*.47;
      s.peel*=Math.exp(-dt*11);s.knock*=Math.exp(-dt*15);s.rub*=Math.exp(-dt*9);
      s.touchGlow*=Math.exp(-dt*5);
      if(s.idle>4&&!s.auto){if(!s.hintAge){s.hintKind=s.stage==='petal'&&s.spread>.03&&s.hintRound%2===1?'turn':'material';s.hintRound++;}s.hintAge+=dt;s.hint=.5-.5*Math.cos(TAU*clamp(s.hintAge/3));if(s.hintAge>=3){s.hintAge=0;s.hint=0;s.idle=0;}}
      // The very first fingertip demonstration displaces the same paste as the player.
      if(s.stage==='white' && s.age<1.5&&!s.stroke&&!s.auto){
        const t=wave(.22,1.12,s.age);
        if(t>s.demo){smear({x:-.09+.19*t,z:.01+.09*t,px:-.09+.19*s.demo,pz:.01+.09*s.demo,force:.32},dt,true);s.demo=t;}
      }
      if(s.hintKind==='turn'&&s.hintAge>.8&&s.hintAge<2.05&&!s.stroke)s.spin+=dt*2.3*s.hint;
      let c=s.stroke||s.auto;
      if(c){
        c.age+=dt;
        if(c.kind==='smear'){
          if(s.auto){const f=1-clamp((c.remaining-dt)/.28);c.x=c.startX+(c.tx-c.startX)*f;c.z=c.startZ+(c.tz-c.startZ)*f;}
          smear(c,dt);
        }
        if(c.kind==='push'){
          if(!c.remaining && c.path<.04)c.px=c.x;
          press(c,dt);
        }
        if(c.kind==='turn'){s.spin+=(clamp(c.turn/dt,-8,8)-s.spin)*(1-Math.exp(-dt*16));c.turn=0;}
        if(c.kind==='gather'){s.gather=clamp(s.gather+dt*(s.auto?1.05:.17+Math.min(1.6,c.path)));s.rub=Math.max(s.rub,.13);}
        if(c.kind==='slide')s.slide=clamp(s.slide+dt*(s.auto?1.35:.16+Math.min(2,c.path)));
        if(s.auto){c.remaining-=dt;if(c.remaining<=0){s.auto=null;if(c.kind==='smear')finishSmear();if(c.kind==='push')s.nextAngle=c.angle+1.17;}}
      }
      s.spin*=Math.exp(-dt*(s.stroke?.kind==='turn'?.15:4.8));s.angle+=s.spin*dt;
      const grooveTone=.62+.20*Math.sin(s.angle*37)+.14*Math.sin(s.angle*71+.9);
      const speed=Math.min(2.8,Math.abs(s.spin));
      s.woodGain=speed*.115*grooveTone;s.woodHz=134+speed*65+28*grooveTone;
      const localCell=6*N+Math.round((s.bladeAngle/TAU%1+1)%1*(N-1));
      s.frictionHz=1090+1460*s.moisture[localCell]+290*s.bladeFilm[1];
      let relief=0;
      for(let i=0;i<N;i++)relief+=Math.min(1,s.rim[i]/2.3);
      s.spread=relief/N;
      s.hollow+=(clamp(s.spread*1.8)*12.5-s.hollow)*dt*2.6;
      if(s.stage==='petal'&&s.spread>.54 && s.hollow>9&&!s.stroke&&!s.auto)stage('pinch');
      for(let k=0;k<COUNT;k++){
        const u=U[k],air=20.1+.6*X[k]+s.wind*(.23+.22*Z[k]);
        s.temp[k]+=(air-s.temp[k])*dt*(.017+.02*u);
        s.moisture[k]=clamp(s.moisture[k]-dt*(s.moisture[k]-.34)*(.0009+.0015*u)*(1+.27*X[k])*(1+.023*(s.temp[k]-20)));
        s.velocity[k]+=dt*72*(s.liftGoal[k]-s.raised[k]);
        s.velocity[k]*=Math.exp(-dt*(14.8-2*s.moisture[k]));
        s.raised[k]+=dt*s.velocity[k];
        s.print[k]*=Math.exp(-dt*(.038+.048*s.moisture[k]));
      }
      for(let j=0;j<3;j++){s.bladeLoad[j]*=Math.exp(-dt*3.4);s.bladeFilm[j]+=dt*(.026-s.bladeFilm[j])*(.021+j*.009);}
      for(const p of s.particles){
        p.v+=dt*(s.wind*(p.steam?.38:.16)-p.v)*(.35+p.k);
        p.x+=dt*p.v;p.y+=dt*(p.steam?.30+p.k*.15:.018+p.k*.031);
        if(p.y>(p.steam?1.4:5)){p.y=0;p.x=p.steam?(random()-.5)*.3:random()*12-6;p.z=p.steam?(random()-.5)*.3:random()*9-5;}
      }
      if(s.stage==='fall'||s.stage==='gather'||s.stage==='paper'||s.stage==='carry'){
        let settled=0;
        for(const p of s.crumbs){
          p.vy-=dt*6;
          const bottom=p.seat+s.gather*(.24*Math.exp(-12*(p.targetX*p.targetX+p.targetZ*p.targetZ)));
          if(s.gather>0){p.vx+=dt*(p.targetX-p.x)*s.gather*31;p.vz+=dt*(p.targetZ-p.z)*s.gather*31;}
          p.vx*=Math.exp(-dt*2);p.vz*=Math.exp(-dt*2);
          p.x+=dt*p.vx;p.y+=dt*p.vy;p.z+=dt*p.vz;
          if(p.y<=bottom && p.vy<=0){
            p.y=bottom;p.vy=p.vy<-.35?-p.vy*.15:0;
            if(s.gather<.01){p.vx*=.88;p.vz*=.88;}
            if(!p.vy)settled++;
          }
        }
        if(s.stage==='fall' && settled>43)stage('gather');
        if(s.stage==='gather' && s.gather>.64&&!s.stroke&&!s.auto)stage('paper');
      }
      s.bladeAngle+=delta(s.nextAngle,s.bladeAngle)*(1-Math.exp(-dt*5.5));
      if(s.stage==='lift' && s.age>1.0)drop();
      s.tool+=(Number(!['white','carry','renew'].includes(s.stage))-s.tool)*(1-Math.exp(-dt*3));
      const bladeBearing=s.bladeAngle+s.angle,farSide=wave(.12,.94,-Math.sin(bladeBearing));
      const hx=Math.cos(bladeBearing)+(Math.cos(bladeBearing)<0?-1:1)*1.34*farSide;
      const hz=Math.sin(bladeBearing)*(1-.70*farSide);
      const yawGoal=.45+delta(-Math.atan2(hz,hx),.45)*s.tool;
      s.bladeYaw+=delta(yawGoal,s.bladeYaw)*(1-Math.exp(-dt*8));
      s.dish+=(Number(['pinch','lift','fall','gather'].includes(s.stage))-s.dish)*(1-Math.exp(-dt*2.0));
      s.paper+=(Number(['paper','carry'].includes(s.stage))-s.paper)*(1-Math.exp(-dt*2.5));
      if(s.stage==='paper'&&s.slide>.90&&!s.stroke){stage('carry');s.delivery=0;}
      if(s.stage==='carry'){s.delivery=wave(0,4.9,s.age);s.carryLift=19.2*Math.sin(Math.PI*s.delivery);s.tilt=.31*Math.sin(Math.PI*s.delivery);if(s.age>=5.05)stage('renew');}
      if(s.stage==='renew'&&s.age>.65){newPaste();s.demo=0;s.delivery=0;s.cycle++;stage('white');}
    }
    let acc=0;
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;acc+=dt;while(acc>=1/60-1e-10){tick(1/60);acc-=1/60;}}
    function getState(){return JSON.parse(JSON.stringify(s,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v));}
    return {s,step,getState,begin,move,end};
  }
  const api={create,N,M,TAU,AX,AZ,X,Z,U,AREA,clamp,wave,delta};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.Paste=api;
})(typeof window==='object'?window:globalThis);
