/* Metres, seconds, kilograms. Positive dent is compression into the cotton.
   The two hanging panels meet at the supported ridge, but their free hems
   exchange neither wind impulse nor moisture across the air gap. */
(function (root) {
  'use strict';
  const NX = 12, NZ = 9, N = NX * NZ, H = 1 / 120;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  function create(seed = 8274) {
    let bits = seed >>> 0;
    function rand() { bits = (Math.imul(bits, 1664525) + 1013904223) >>> 0; return bits / 4294967296; }
    const cells = Array.from({length:N}, (_, i) => ({
      u:(i % NX) / (NX - 1), v:Math.floor(i / NX) / (NZ - 1),
      thickness:.18 + .032 * rand(), dust:.62 + rand() * .36,
      dent:0, dentV:0, wave:0, waveV:0, corner:0, cornerV:0, wet:.25, heat:18.4 + rand() * .8,
      weave:.86 + rand() * .28, mass:.038, exposure:0
    }));
    const zones = Array.from({length:7}, (_,i) => ({wind:.13 + .03*i, velocity:0, target:.2, gust:0, left:.2 + .24*i}));
    const rods = Array.from({length:7}, () => ({bend:0, velocity:0}));
    const s = {time:0, phase:'beat', age:0, idle:0, hits:0, day:0, cells, zones, rods,
      particles:[], meanWet:.25, meanMass:0, travel:0, travelV:0, turn:0, turnV:0,
      fold:0, foldV:0, tuck:0,tuckV:0, stow:0, stowV:0, dayLight:0, dayV:0,
      tool:{held:false,amount:0,velocity:0,u:.7,v:.55,toU:.7,toV:.55,linger:0},bat:0, batV:0, hitU:.5, hitV:.5, chime:0, chimeV:0, paper:0, paperV:0,
      rotor:0, rotorV:0, sailX:-8, sailV:.036, events:[], hitSound:null, hints:true};
    cells.forEach(c=>{c.mass=.026*(1+2.8*c.wet)*c.weave;s.meanMass+=c.mass;});
    // A shallow open boundary absorbs waves at the shoreline. Local wind pressure
    // and a passing hull excite the surface; viscosity damps residual motion.
    const waterX=19,waterZ=11;
    s.water=Array.from({length:waterX*waterZ},(_,i)=>({x:-38+i%waterX*76/(waterX-1),
      z:-3-Math.floor(i/waterX)*49/(waterZ-1),height:.008*(rand()-.5),velocity:0,
      pressure:rand()*.06-.03,next:.3+rand()*2.3}));
    const waterA=new Float64Array(s.water.length);
    function water(h){
      for(let i=0;i<s.water.length;i++){
        const p=s.water[i],x=i%waterX,z=Math.floor(i/waterX),w=zones[Math.floor(x*6/(waterX-1))].wind;
        p.next-=h;if(p.next<=0){p.next=.48+rand()*2.3;p.pressure=(rand()-.5)*.21*w;}
        const near=(x?s.water[i-1].height:0)+(x+1<waterX?s.water[i+1].height:0)
          +(z?s.water[i-waterX].height:0)+(z+1<waterZ?s.water[i+waterX].height:0);
        const dx=p.x-s.sailX,dz=p.z+15;
        const wake=dx<0&&dx>-5?.05*Math.exp(-((Math.abs(dz)+dx*.38)**2)-dx*dx*.13):0;
        waterA[i]=5*(near-4*p.height)-2.2*p.height-1.05*p.velocity+p.pressure+wake;
      }
      s.water.forEach((p,i)=>{p.velocity+=waterA[i]*h;p.height+=p.velocity*h;});
    }
    let particleID=0, spawnIn=.1, foldGoal=0, acc=0, lastHit=-1;
    const dentA = new Float64Array(N), waveA = new Float64Array(N);
    function phase(p) {s.phase=p; s.age=0; s.idle=0;}
    function event(kind, details={}) { s.events.push({kind,...details}); if(s.events.length>60)s.events.shift(); }
    function wake(){s.idle=0;}
    function particle(x,y,z,impulse,ambient=false){
      if(s.particles.length>=160)return;
      const r=rand();
      s.particles.push({id:++particleID,x,y,z,vx:(rand()-.45)*(.12+impulse*.09),
        vy:(.18+rand()*.36)*impulse,vz:(rand()-.5)*.21,age:0,life:ambient?9+r*6:3+r*4,
        r:(ambient?.0025:.0035)+r*.004,alpha:0,ambient});
    }
    for(let i=0;i<34;i++){particle(-2+rand()*4,.4+rand()*2.2,-2+rand()*3,0,true);const p=s.particles[i];p.age=rand()*5;p.alpha=clamp(p.age/.22)*clamp((p.life-p.age)/1.1);}
    function hit(u=.5,v=.5,speed=2){
      if(!['beat','lift','air','turn','sun','collect'].includes(s.phase)||s.time-lastHit<.16)return false;
      wake(); lastHit=s.time; u=clamp(u);v=clamp(v);speed=clamp(speed,1,4);
      const c=cells[Math.round(v*(NZ-1))*NX+Math.round(u*(NX-1))];
      let grains=0;
      cells.forEach(n=>{
        const dx=(n.u-u)*2.7,dz=(n.v-v)*1.75;
        const w=Math.exp(-(dx*dx+dz*dz)/.105);
        // Contact has a finite footprint. Cotton outside it feels the adjacent springs only.
        if(w<.025)return;
        n.dentV+=speed*.48*w*(.19/n.thickness);
        const loss=Math.min(n.dust,(.07+.14*speed)*w*n.dust);
        n.dust-=loss;grains+=loss;
        n.waveV+=s.travel*w*speed*.2;
      });
      const count=Math.min(34,Math.ceil(grains*11));
      for(let i=0;i<count;i++) {
        const x=-.30+(u-.5)*2.65+(rand()-.5)*.3;
        const flatZ=.95+(v-.5)*1.72, side=v*2-1,edge=Math.abs(side),rad=Math.min(1,edge/.23)*Math.PI/2;
        const hangY=1.84+.135*Math.cos(rad)-1.38*Math.max(0,edge-.23);
        const hangZ=-3.11+(.19*Math.sin(rad)*Math.sign(side)+.144*side)*Math.cos(s.turn*Math.PI)+c.wave;
        particle(x,.81+(hangY-.81)*s.travel,flatZ+(hangZ-flatZ)*s.travel,speed*.7);
      }
      s.batV=Math.min(4,s.batV+.7*speed);s.hitU=u;s.hitV=v;
      s.hitSound={speed,frequency:62+(.25-c.wet)*151+(.214-c.thickness)*162,
        duration:.075+.44*c.wet+.30*c.thickness,air:.14+speed*.064+.3*c.wet,grains:count};
      event('hit',s.hitSound);
      if(s.phase==='beat' && ++s.hits>=6)phase('lift');
      return true;
    }
    function act(action,u=.5,v=.5,strength=1){
      wake();
      if(action==='hang'&&s.phase==='lift'){phase('hanging');event('rustle');return true;}
      if(action==='fan'&&['air','turn','sun','collect'].includes(s.phase)){
        const zi=Math.round(clamp(u)*6);
        zones[zi].gust=Math.min(2.8,zones[zi].gust+.45*clamp(strength,0,4));
        cells.forEach(c=>{const d=(c.u-u)**2+(c.v-v)**2;
          if(d<.085)c.waveV+=(.0092/c.mass)*clamp(strength,0,3)*Math.exp(-35*d)*Math.abs(2*c.v-1);});
        event('flutter',{energy:clamp(strength*.35)});return true;
      }
      if(action==='turn'&&s.phase==='turn'){phase('turning');event('rustle');return true;}
      if(action==='collect'&&s.phase==='collect'){phase('returning');event('rustle');return true;}
      if(action==='fold'&&s.phase==='fold'&&foldGoal<2 &&
         (foldGoal===0 || s.fold>.96)){foldGoal++;event('rustle');return true;}
      if(action==='store'&&s.phase==='store'){phase('stowing');event('rustle');return true;}
      return false;
    }
    function spring(key,vKey,target,k,d,h){
      s[vKey]+=(k*(target-s[key])-d*s[vKey])*h; s[key]+=s[vKey]*h;
    }
    function wind(h){
      zones.forEach((a,i)=>{
        a.left-=h;
        if(a.left<=0){a.left=1.8+rand()*3.9;a.target=(.08+rand()*.82)*(s.phase==='rest'?.15:1);}
        a.gust*=Math.exp(-1.35*h);
        const upstream=i?zones[i-1].wind:a.target;
        a.velocity+=((a.target+a.gust-a.wind)*2.7+(upstream-a.wind)*3.9-a.velocity*3.2)*h;
        a.wind+=a.velocity*h;
      });
      const w=zones[5].wind;
      spring('chime','chimeV',w*.20,15,1.45,h);
      spring('paper','paperV',w*.64+s.chimeV*.25,11,1.65,h);
      s.rotorV+=(w*w*4.3-s.rotorV*.85)*h;s.rotor+=s.rotorV*h;
      s.sailV+=(.025+zones[0].wind*.10-s.sailV)*.12*h;
      s.sailX+=s.sailV*h;
      if(s.sailX>29){s.sailX=-30;} // Beyond both shores, outside the window.
    }
    function cloth(h){
      let sum=0,mass=0;
      const hanging=s.travel, drying=['air','turn','turning','sun','collect'].includes(s.phase);
      const dawn=s.phase==='dawn';
      for(let i=0;i<N;i++){
        const c=cells[i],x=i%NX,z=Math.floor(i/NX);
        let dn=0,wn=0;
        for(const j of [x?i-1:i,x<NX-1?i+1:i,z?i-NX:i,z<NZ-1?i+NX:i]){
          dn+=cells[j].dent-c.dent;wn+=cells[j].wave-c.wave;
        }
        const zone=zones[Math.round(c.u*6)];
        const hem=Math.abs(2*c.v-1);
        c.mass=.026*(1+2.8*c.wet)*c.weave;
        const face=c.v>.5?.93:.48;
        c.exposure=.22+.78*((1-s.turn)*face+s.turn*(1.41-face))*(.72+.28*c.u)*c.weave;
        const temp=drying?24+10*c.exposure+2*zone.wind:19+.9*c.u;
        c.heat+=(temp-c.heat)*(.052+.035*zone.wind)*h;
        const retained=(s.phase==='air'||s.phase==='turn') && c.v<.5?.091:.05;
        if(drying)c.wet=Math.max(retained,c.wet-h*.00195*c.exposure*(.6+zone.wind)*clamp((c.heat-15)/11,.1,2));
        if(dawn){c.wet=Math.min(.25,c.wet+h*.061*c.weave);c.dust=Math.min(.65+(c.weave-.86)*.9,c.dust+h*.24*c.weave);}
        // A free corner catches the window breeze. The sewn neighbour remains supported.
        let free=0;
        if(s.phase==='lift')free=Math.pow(c.u,4)*Math.pow(1-c.v,3);
        if(s.phase==='fold')free=foldGoal===0?Math.pow(1-c.u,5):foldGoal===1?Math.pow(c.v,5):0;
        if(s.phase==='turn'||s.phase==='collect')free=Math.pow(c.v,5)*Math.pow(c.u,2);
        c.cornerV+=((free*(.048+.09*zone.wind)-c.corner)*28-c.cornerV*4.9)*h;
        c.corner+=c.cornerV*h;
        dentA[i]=-224*c.dent-10*c.dentV+29*dn;
        const force=(.013*zone.wind*zone.wind+.027*zone.velocity)*c.exposure*hem*hanging;
        waveA[i]=(force+.69*wn-(.64+2*(1-hem))*(c.mass/.032)*c.wave)/c.mass-2.0*c.waveV;
        sum+=c.wet;mass+=c.mass;
      }
      for(let i=0;i<N;i++){
        const c=cells[i];c.dentV+=dentA[i]*h;c.dent+=c.dentV*h;
        if(c.dent<0){c.dent=0;c.dentV=0;}
        if(c.dent>c.thickness*.76){c.dent=c.thickness*.76;c.dentV=Math.min(0,c.dentV);}
        c.waveV+=waveA[i]*h;c.wave+=c.waveV*h;
      }
      s.meanWet=sum/N;s.meanMass=mass;
      rods.forEach((r,i)=>{
        const c=cells[7*NX+Math.round(i*(NX-1)/6)];
        const support=Math.sin(Math.PI*i/6);
        const target=support*((.013*c.mass/.04+.035*c.wave)*hanging+.0018*zones[i].wind);
        r.velocity+=((target-r.bend)*75-r.velocity*3.6)*h;r.bend+=r.velocity*h;
      });
    }
    function dust(h){
      spawnIn-=h;
      if(spawnIn<=0){spawnIn=.36+rand()*.5;particle(-2+rand()*3,.4+rand()*2.35,-1.7+rand()*1.3,0,true);}
      for(let i=s.particles.length-1;i>=0;i--){
        const p=s.particles[i];p.age+=h;
        const w=zones[Math.floor(clamp((p.x+3)/6)*6)].wind;
        p.vx+=(.16*w-p.vx)*.72*h;p.vy+=((p.ambient?.014:-.032)-p.vy)*.92*h;p.vz*=Math.exp(-.47*h);
        p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;
        p.alpha=clamp(p.age/.22)*clamp((p.life-p.age)/1.1)*clamp(p.y/.15);
        if(p.age>=p.life || p.y<=.01)s.particles.splice(i,1);
      }
    }
    function integrate(h){
      s.time+=h;s.age+=h;s.idle+=h;wind(h);
      const outside=['hanging','air','turn','turning','sun','collect'].includes(s.phase);
      spring('travel','travelV',outside?1:0,3.8,3.95,h);
      spring('turn','turnV',['turning','sun','collect','returning','fold','store','stowing','rest'].includes(s.phase)?1:0,4,4.2,h);
      spring('fold','foldV',foldGoal>=1?1:0,7.8,5.8,h);
      spring('tuck','tuckV',foldGoal>=2?1:0,7.5,5.6,h);
      spring('stow','stowV',['stowing','rest'].includes(s.phase)?1:0,4,4.1,h);
      spring('bat','batV',0,64,5.1,h);
      const tool=s.tool;tool.linger=Math.max(0,tool.linger-h);
      const reach=tool.held||tool.linger>0?1:0;
      tool.velocity+=((reach-tool.amount)*268-tool.velocity*30)*h;
      tool.amount+=tool.velocity*h;
      tool.u+=(tool.toU-tool.u)*(1-Math.exp(-25*h));tool.v+=(tool.toV-tool.v)*(1-Math.exp(-25*h));
      const daylight=['rest','stowing','store','fold','returning','collect'].includes(s.phase)?1:
        s.phase==='dawn'?0:clamp((.25-s.meanWet)/.2)*.74;
      spring('dayLight','dayV',daylight,1.4,2.5,h);
      cloth(h);dust(h);water(h);
      if(s.phase==='hanging'&&s.travel>.982)phase('air');
      if(s.phase==='air'&&s.meanWet<.169)phase('turn');
      if(s.phase==='turning'&&s.turn>.97)phase('sun');
      if(s.phase==='sun'&&s.meanWet<=.05000001&&s.age>6)phase('collect');
      if(s.phase==='returning'&&s.travel<.018)phase('fold');
      if(s.phase==='fold'&&s.tuck>.985)phase('store');
      if(s.phase==='stowing'&&s.stow>.985)phase('rest');
      if(s.phase==='rest'&&s.age>11){foldGoal=0;phase('dawn');}
      if(s.phase==='dawn'&&s.age>7){s.hits=0;s.day++;phase('beat');}
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      acc+=dt;
      while(acc+1e-12>=H){integrate(H);acc-=H;}
    }
    return {state:s,step,hit,act,wake,getState:()=>JSON.parse(JSON.stringify(s))};
  }
  const api={create,NX,NZ,clamp};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.FutonPhysics=api;
})(typeof window==='undefined'?globalThis:window);
