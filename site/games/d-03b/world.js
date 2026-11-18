/* Distances in metres, time in seconds. World z is negative route distance. */
(function (root) {
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const sat=x=>clamp(x,0,1);
  const smooth=(a,b,x)=>{const v=sat((x-a)/(b-a));return v*v*(3-2*v)};
  const mix=(a,b,k)=>a+(b-a)*k;
  function random(seed) {return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
  function hash(x,y) {let a=Math.imul(x,374761393)+Math.imul(y,668265263);a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))>>>0)/4294967296}
  function noise(x,y) {
    const i=Math.floor(x),j=Math.floor(y),u=smooth(0,1,x-i),v=smooth(0,1,y-j);
    return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v);
  }
  const river=s=>-66+37*Math.sin(s*.010+1.3)+16*Math.sin(s*.024);
  const shore=s=>155-90*Math.sin((s-1680)*.004);
  function terrain(x,s) {
    const d=Math.abs(x-river(s)), n=noise(x*.011+40,s*.011+12), f=noise(x*.038,s*.038);
    const valley=4+smooth(5,70,d)*(10+14*n)+smooth(65,260,d)*(35+99*noise(x*.007+5,s*.005));
    const ridge=108*Math.exp(-((x+58+24*Math.sin(s*.009))**2/7500+(s-760)**2/53000));
    const wild=valley+ridge+smooth(10,140,d)*(13*n+5*f);
    const coast=3+11*noise(x*.008,s*.008)+8*n;
    const ground=mix(wild,coast,smooth(1370,1810,s));
    const pad=smooth(32,77,Math.hypot(x*.92,(s-2250)*.39));
    return mix(mix(2.2,ground,pad),-7,smooth(shore(s)-28,shore(s)+18,x)*smooth(1470,1740,s));
  }
  const balloonPlan=[
    [17,48,108,9.1,0],[-25,102,105,8.4,1],[3,179,107,7.3,2],
    [54,254,123,8.6,3],[-64,287,116,9,0],[-13,352,111,8.2,4],
    [25,426,124,8.7,2],[-136,489,150,7.2,3],[109,580,162,8,1]
  ];
  const balloonDefs=balloonPlan.map(([x,s,y,r,style])=>({x,s,y,r,style}));
  const thermals=[[-6,78,38],[-17,280,51],[10,425,49],[8,565,58],[-4,716,61],[-5,853,53]];
  const markers=[[-24,516],[-36,662],[-43,790]];
  function spring(o,key,velocity,target,k,d,dt) {
    o[velocity]+=((target-o[key])*k-o[velocity]*d)*dt;
    o[key]+=o[velocity]*dt;
  }
  function acoustics(f) {
    const load=Math.abs(f.alpha),speed=f.air/12,quiet=1-.91*f.fog;
    return {
      windGain:(.037+.17*speed+.16*load)*quiet*(1-f.veil),
      windCutoff:(950+speed*520+load*4300)*(1-.72*f.fog),
      whistleHz:280+speed*63+load*730+f.roll*18,
      quiet
    };
  }
  function create(options={}) {
    const rng=random(options.seed??7342), count=clamp(options.thermalCount??6,0,6);
    const cells=Array.from({length:20},(_,i)=>({gust:rng()*.8,velocity:0,pressure:rng()*2-1,hold:.2+rng()*2}));
    const b=balloonDefs.map((d,i)=>({...d,heat:.64+rng()*.2,flame:.1+rng()*.4,valve:i%3===0,
      sway:(rng()-.5)*.04,omega:0,basket:0,basketV:0,heave:rng()*.7,vertical:0,pulse:0}));
    const columns=thermals.slice(0,count).map(([x,s,r],i)=>({x,s,r,heat:1.45+.2*i,flux:0}));
    const motes=Array.from({length:64},(_,i)=>({cell:i%6,h:rng()*95,angle:rng()*6.28,r:4+rng()*17,vy:rng(),spin:.05+rng()*.14}));
    const cloud=Array.from({length:13},(_,i)=>({s:916+i*17,x:(rng()-.5)*42,water:.47+rng()*.35,drift:0,v:0,opening:0,openingV:0}));
    const birds=Array.from({length:9},(_,i)=>({x:(i%2?1:-1)*(6+Math.floor(i/2)*4),h:1.5+rng()*4,vx:0,vh:0,
      back:-5-Math.floor(i/2)*4,wing:rng()*.6,wv:0,energy:.2+rng()*.65,beat:0}));
    const water=Array.from({length:36},(_,i)=>({h:(rng()-.5)*.12,v:(rng()-.5)*.12}));
    const boats=Array.from({length:5},(_,i)=>({roll:0,rv:0,heave:0,hv:0,travel:0,travelV:0,windLoad:0}));
    const cloth=Array.from({length:20},()=>({angle:rng()*.08,av:0,hem:0,hv:0}));
    const sleeves=markers.map(()=>Array.from({length:4},()=>({bend:-.16,v:0})));
    const family=Array.from({length:4},(_,i)=>({arm:.1,av:0,reach:.6,hold:i*.27}));
    const f={s:0,x:0,h:92,roll:-.105,rollV:0,pitch:.018,pitchV:0,vx:0,vy:0,speed:12,air:12,alpha:.067,lift:9.81,
      thermal:0,ridge:0,fog:0,veil:0,stage:0,rest:0,lap:0,elapsed:0,idle:0,signal:0,chirp:0,bell:0};
    let finger=null,eventWait=1.3,bellWait=2;
    const model={f,cells,balloons:b,columns,motes,cloud,birds,water,boats,cloth,family,sleeves};
    function input(x,y,id=-1) {finger={x:clamp(x,-1,1),y:clamp(y,-1,1),id};f.idle=0}
    function tick(dt) {
      f.elapsed+=dt;f.idle=finger?0:f.idle+dt;
      for(const c of cells) {
        c.hold-=dt;if(c.hold<=0){c.pressure=rng()*2-1;c.hold=.7+rng()*3.1}
        spring(c,'gust','velocity',c.pressure,1.65,1.35,dt);
      }
      const wind=(s)=>{const i=Math.floor(Math.max(s,0)/142)%cells.length;return mix(cells[i].gust,cells[(i+1)%cells.length].gust,smooth(0,1,Math.max(s,0)/142%1))};
      f.thermal=0;
      columns.forEach((c,i)=>{
        // Surface heating replenishes the plume, entrainment drains it in crosswind.
        c.heat+=(.087*(1.7+.12*i-c.heat)-.018*Math.abs(wind(c.s))*c.heat)*dt;
        c.flux+=(c.heat*(1+.18*wind(c.s))-c.flux)*dt*.73;
        const d=((f.x-c.x)**2+(f.s-c.s)**2)/(c.r*c.r);
        f.thermal+=c.flux*Math.exp(-d*1.6);
      });
      f.ridge=(3.9+.6*wind(722))*smooth(420,600,f.s)*(1-smooth(840,1020,f.s))*Math.exp(-((f.x+3)**2)/2100);
      const w=wind(f.s),landing=smooth(1920,2240,f.s),ground=terrain(f.x,f.s);
      const track=5*Math.sin(f.s*.009)*(1-landing);
      const bank=finger?finger.x*.611:clamp((track-f.x)*.012-f.vx*.052+w*.03,-.19,.19);
      const steer=(finger?finger.y*.262:.012+f.thermal*.012)*(1-landing)-landing*.022;
      spring(f,'roll','rollV',bank*(1-landing),3.5,3.1,dt);
      spring(f,'pitch','pitchV',steer,3.4,3,dt);
      f.roll=clamp(f.roll,-Math.PI*35/180,Math.PI*35/180);f.pitch=clamp(f.pitch,-Math.PI/12,Math.PI/12);
      f.air+=(Math.max(.01,f.speed+.52*w)-f.air)*dt*1.4;
      f.alpha=clamp(.067+f.pitch*.36-f.vy*.009,-.035,.21);
      f.lift=.5*1.225*f.air*f.air*(.1112+.43*(f.alpha-.067));
      f.vx+=(4.5*Math.sin(f.roll)-.49*f.vx-.05*(f.x-track)+w*.13)*dt;
      f.x+=f.vx*dt;
      let sink=-.30+(f.lift-9.81)*.32+f.thermal+f.ridge+7*Math.sin(f.pitch);
      // A descending coastal breeze guides the final approach onto the grass.
      const approach=smooth(1430,1680,f.s);
      const glidePath=2.94+Math.max(0,2238-f.s)*.245;
      sink=mix(sink,clamp((glidePath-f.h)*.5,-5.5,1.5),approach);
      sink=Math.max(sink,clamp((ground+12-f.h)*.8,0,8)*(1-landing)+(Math.min(0,sink)));
      // Converging air at the saddle carries even a low approach into the cloud lip.
      const saddle=smooth(755,874,f.s)*(1-smooth(1010,1090,f.s));
      sink+=saddle*clamp((262-f.h)*.105,-4.1,5.8);
      f.vy+=(sink-f.vy)*dt*.83;
      f.h=Math.max(ground+.74,f.h+f.vy*dt);
      if(f.s>2220 && f.h<=ground+.80) {
        f.vy=0;f.speed=Math.max(0,f.speed-2.1*dt);f.rest+=dt;
      }
      f.s+=f.speed*dt;
      const next=f.s<452?0:f.s<914?1:f.s<1154?2:f.s<1510?3:f.rest<.05?4:5;
      f.stage=next;
      let moisture=0;
      cloud.forEach((c,i)=>{
        const g=wind(c.s+i*7);
        spring(c,'drift','v',g*5, .37,.82,dt);
        const encounter=Math.exp(-((f.s-c.s)**2/1400+(f.x-c.x-c.drift)**2/6900+(f.h-258)**2/4200));
        const wake=encounter*(next===2&&finger?1:.23);
        spring(c,'opening','openingV',wake*6.5,1.9,1.6,dt);
        c.water+=(.16*(.69+g*.25-c.water)-.012*c.water-.042*wake*c.water)*dt;
        moisture+=c.water*encounter*(1-.045*c.opening);
      });
      f.fog+=(sat(moisture*.63)-f.fog)*dt*.92;
      b.forEach((o,i)=>{
        const gap=Math.hypot((f.x-o.x)*.85,f.s-o.s), wake=Math.exp(-(gap**2)/620)*(next===0?1:.025);
        const call=(finger?.id===i && next===0)?1:0;
        o.pulse+=(Math.max(wake,call)-o.pulse)*dt*1.8;
        if(o.heat<.42)o.valve=true;if(o.heat>.91)o.valve=false;
        o.flame+=((o.valve?.46:0)+.54*o.pulse-o.flame)*dt*(o.valve?3:1.5);
        o.heat+=(o.flame*.14-.037*o.heat-.009*(1+cells[i].gust))*dt;
        spring(o,'heave','vertical',(o.heat-.58)*4,.38,.72,dt);
        spring(o,'sway','omega',.045*cells[i].gust+o.pulse*.13*(i%2?1:-1),1.65,.94,dt);
        spring(o,'basket','basketV',-o.sway*.84-.09*o.omega,4.8,1.04,dt);
      });
      motes.forEach((p,i)=>{const c=columns[p.cell];p.vy+=((c?c.flux:0)*1.8+.4*cells[i%20].gust-p.vy)*dt;
        p.h+=p.vy*dt;p.angle+=p.spin*(.4+p.vy*.25)*dt;
        // Integrated height stays continuous. Each 96 m a faded seed leaves and another lifts off.
      });
      birds.forEach((o,i)=>{
        const together=next===3 && finger;
        const x=(i%2?1:-1)*(7+Math.floor(i/2)*3.8)+(together?finger.x*4:0);
        spring(o,'x','vx',x+cells[i+3].gust*1.8,.74,1.2,dt);
        const up=cells[i].gust*.7;o.energy+=dt*(-.24+.12*up);
        if(o.energy<.15 && o.beat<=0){o.beat=1;o.energy+=.48+i*.013}
        o.beat=Math.max(0,o.beat-dt*(1.31+.11*(i%3)+.13*o.energy));
        const stroke=o.beat>0 ? -Math.sin((1-o.beat)*Math.PI*2)*(.83+.13*o.energy) : 0;
        spring(o,'wing','wv',.12+up*.15+stroke,55,10.8,dt);
        spring(o,'h','vh',3+i*.35+up+o.beat*.6+(together?finger.y*2:0),1.2,1.6,dt);
      });
      const acc=water.map((o,i)=>{const a=water[(i+35)%36],b=water[(i+1)%36];
        const harborWake=next===4 && finger?.id===50+Math.floor(i/6) ? .52*Math.exp(-((i%6-2)**2)) : 0;
        return 8*(a.h+b.h-2*o.h)-.62*o.v-1.8*o.h+.37*cells[i%20].gust+harborWake});
      water.forEach((o,i)=>{o.v+=acc[i]*dt;o.h+=o.v*dt});
      boats.forEach((o,i)=>{const j=i*6;
        const fill=(next===4 && finger?.id===50+i) ? .77 : 0;
        o.windLoad+=(.19+.16*cells[i+4].gust+fill-o.windLoad)*dt;
        spring(o,'roll','rv',(water[j].h-water[j+2].h)*.9+o.windLoad*.21,3.1,1.1,dt);spring(o,'heave','hv',water[j+1].h,4.2,1.65,dt);
        // Mooring tension arrests the hull after the sail unloads.
        spring(o,'travel','travelV',o.windLoad*3.5,.42,.87,dt);
      });
      cloth.forEach((o,i)=>{const neighbor=i%4?cloth[i-1].angle:0;
        const localGust=(next===4 && finger?.id===60+i-i%4) ? .83 : 0;
        spring(o,'angle','av',.16+localGust+cells[(i+4)%20].gust*(.2+.06*(i%4))+neighbor*.38,8.5,1.65,dt);
        spring(o,'hem','hv',o.angle*.58+.2*cells[(i+7)%20].gust-.19*o.av,13.4,2.3,dt)});
      sleeves.forEach((chain,i)=>{
        const current=wind(markers[i][1]),lift=next===1?f.ridge*.08:0;
        chain.forEach((ring,j)=>{
          const upstream=j?chain[j-1].bend:-.10;
          const force=upstream*.36+current*(.08+j*.035)+lift-.11-j*.019;
          spring(ring,'bend','v',force,9-j,2.6-j*.18,dt);
        });
      });
      family.forEach((o,i)=>{if(next===5){o.hold-=dt;if(o.hold<=0){o.reach=o.reach>.8?.45:1.25;o.hold=.32+rng()*.47}}spring(o,'arm','av',next===5?o.reach:.08+cells[i].gust*.04,23,4.5,dt)});
      eventWait-=dt;bellWait-=dt;
      f.chirp=Math.max(0,f.chirp-dt*2.8);f.bell=Math.max(0,f.bell-dt*.65);
      if(eventWait<=0){f.chirp=next===3?1:.21;eventWait=.65+rng()*(next===3?2:5)}
      if(bellWait<=0){f.bell=next===4||next===5?1:0;bellWait=4+rng()*5}
      f.signal+=(Math.max(f.ridge/4,f.thermal/2)-f.signal)*dt;
      if(f.rest>9)f.veil=Math.min(1,f.veil+dt*.43);else f.veil=Math.max(0,f.veil-dt*.34);
      if(f.veil>=1 && f.rest>9){Object.assign(f,{s:0,x:0,h:92,vx:0,vy:0,roll:-.105,pitch:.018,rollV:0,pitchV:0,speed:12,air:12,rest:0,stage:0,lap:f.lap+1,idle:0});finger=null}
    }
    return {model,input,release(){finger=null},step(dt){if(!Number.isFinite(dt)||dt<=0)return;const n=Math.ceil(dt/(1/60));for(let i=0;i<n;i++)tick(dt/n)},getState(){return JSON.parse(JSON.stringify(model))}};
  }
  const api={create,acoustics,random,hash,noise,smooth,mix,clamp,terrain,river,shore,balloonDefs,thermals,markers};
  if(typeof module!=='undefined')module.exports=api;else root.FlightWorld=api;
})(globalThis);
