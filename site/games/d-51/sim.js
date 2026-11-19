/* All lengths in metres, time in seconds. Rendering reads this model without advancing it. */
(function (root) {
  "use strict";
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const TAU=Math.PI*2, H=1/120, MX=-.55;
  const layout={mx:MX, front:.37, slot:[.466,1.192,.416], coin:[.525,1.038,.615],
    col:[-.462,-.240,-.018,.204], shelf:[1.583,1.267], tray:[-.135,.458,.417],
    bench:[.91,.446,.025]};
  function createGame(seed=8492) {
    let bits=seed>>>0, carry=0;
    const rnd=()=>((bits=(1664525*bits+1013904223)>>>0)/4294967296);
    const eventQueue=[];
    const emit=(kind,data={})=>eventQueue.push({kind,...data});
    const part=(x=0)=>({x,v:0});
    function spring(p,target,k,d,h){p.v+=((target-p.x)*k-d*p.v)*h;p.x+=p.v*h}
    const coin={mass:.0062,chute:0,dropSpeed:0,strikes:0,x:layout.coin[0],y:layout.coin[1],z:layout.coin[2],vx:0,vy:0,vz:0,angle:0,spin:0,visible:true,drag:false,tx:0,ty:0};
    const s={time:0,chapter:0,round:0,phase:'coin',age:0,quiet:0,hint:0,hintAge:0,choice:-1,coin,
      coils:Array.from({length:8},()=>({angle:0,speed:0,turn:0,elastic:part(),button:part(),feed:part(),empty:false,stockType:0,glow:0})),
      shutter:part(),cabinet:part(),camera:part(),follow:part(),lowView:part(),lamps:[.17,.20,.15].map(x=>({heat:x,current:x})),
      gusts:Array.from({length:5},(_,i)=>({air:.18+i*.09,pressure:.3,hold:.1+rnd()*1.5})),
      leaves:Array.from({length:24},()=>({bend:part(),stiff:10+18*rnd(),gain:.25+rnd()*.7})),
      dust:Array.from({length:28},()=>({x:rnd()*4-2,y:.04+rnd()*2.8,z:.4+rnd()*.9,vx:0,vy:0,life:rnd()})),
      river:Array.from({length:96},(_,i)=>({height:.005*Math.sin(i*.91)+.003*Math.cos(i*.32),velocity:0,depth:.78+.18*rnd()})),
      water:Array.from({length:32},(_,i)=>({depth:0,ripple:part(),grade:.72+(i%8)*.057+rnd()*.28})),
      rain:Array.from({length:112},()=>({x:rnd()*5.8-2.8,y:1.6+rnd()*3.4,z:rnd()*3-1,speed:3.4+rnd()*1.7,active:false,hit:0})),
      rotor:{angle:0,speed:0,impulse:0,flex:Array.from({length:5},()=>part())},
      umbrella:{open:part(),ribs:Array.from({length:8},()=>part()),loads:Array(8).fill(0),beads:Array.from({length:8},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,free:false}))},
      anchor:[layout.bench[0],...layout.bench.slice(1)], item:null,keeps:[],evening:0,rainRate:0,playTime:0,interactions:0,closing:false,resetAge:0};
    const phase=p=>{s.phase=p;s.age=0;s.hint=0;s.hintAge=0};
    function installCoin(){Object.assign(coin,{x:layout.coin[0],y:layout.coin[1],z:layout.coin[2],vx:0,vy:0,vz:0,visible:true,drag:false,spin:.55,chute:0,dropSpeed:0,strikes:0});phase('coin')}
    function touch(){s.quiet=0;s.hint=0;s.hintAge=0}
    function action(kind,a=0,b=0){
      touch();
      if(kind==='coinDown'&&s.phase==='coin'){coin.drag=true;coin.tx=coin.x;coin.ty=coin.y;coin.spin+=.8;return true}
      if(kind==='coinMove'&&s.phase==='coin'&&coin.drag){coin.tx=clamp(a,-.62,.9);coin.ty=clamp(b,.46,1.85);return true}
      if((kind==='insert'||kind==='coinUp')&&s.phase==='coin'){coin.drag=false;phase('insert');return true}
      if(kind==='button'&&s.phase==='choose'&&Number.isInteger(a)&&a>=0&&a<8){
        const c=s.coils[a];s.choice=a;c.empty=true;c.turn=c.angle;c.button.v=-.29;
        const col=a%4,row=Math.floor(a/4);
        s.item={type:s.chapter,flavor:col,rotorBase:s.rotor.angle,mass:[.224,.267,.316,.376][col],x:MX+layout.col[col],y:layout.shelf[row],z:.373,
          vx:0,vy:0,vz:0,angle:0,spin:0,lay:part(),tilt:part(),settled:false,contacts:0,mode:'stock',age:0,target:[0,0,0],rollMeter:0,bounce:part()};
        emit('button',{freq:1450+col*130});emit('motor',{mass:s.item.mass});phase('vend');return true}
      if(kind==='collect'&&s.phase==='pickup'){const p=s.item;phase('take');p.mode='carry';p.age=0;p.target=destination(p.type);p.vy=.9;s.shutter.v+=1.1;emit('take',{mass:p.mass});return true}
      if(kind==='play'&&s.item&&s.item.mode==='play'&&!s.closing){return play(s.item,a,b)}
      if(kind==='oldPlay'){const p=s.keeps.find(k=>k.type===Math.round(a));if(p&&!s.closing)return play(p,b,0)}
      if(kind==='nudge'){s.cabinet.v+=.018;return true}
      return false;
    }
    function destination(type){
      const [x,y,z]=s.anchor;
      return [[x-.25,y+.091,z+.04],[x+.29,y+.39,z+.065],[x,.085,z+.57],[x,y+.73,z+.03]][type];
    }
    function play(p,force,vertical){s.interactions++;const f=clamp(force||.45,-2.6,2.6);
      if(p.type===0){p.tilt.v+=f*3;p.bounce.v+=.22;emit('tap',{mass:p.mass,force:Math.abs(f)})}
      if(p.type===1){s.gusts[3].pressure+=Math.abs(f)*.54;s.gusts[3].hold=Math.max(.6,s.gusts[3].hold);s.rotor.impulse+=Math.abs(f)*7+2;emit('wind',{force:Math.abs(f)})}
      if(p.type===2){p.vx=clamp(p.vx+f*1.25,-1.7,1.7);p.vz=clamp(p.vz+vertical*.24,-.4,.4);emit('rub',{mass:p.mass,force:Math.abs(f)})}
      if(p.type===3){s.umbrella.open.v+=.48;const j=(rnd()*8)|0;s.umbrella.ribs[j].v+=1.4;
        const w=s.water[19+(j%3)];w.ripple.v+=s.umbrella.loads[j]*.08;emit('fabric',{force:Math.abs(f)})}
      return true;
    }
    // 円盤が投入口に入るまでは指とのばね結合。そこからは重力で硬貨路を落ち、
    // 一段目で反発し、二段目に接触すると通電する。衝突速度を金属音に渡す。
    function updateCoin(h){
      if(s.phase==='coinFall'){
        coin.dropSpeed+=9.81*h;coin.chute+=coin.dropSpeed*h;
        const ledge=coin.strikes===0?.092:.186;
        if(coin.chute>=ledge&&coin.dropSpeed>0){const speed=coin.dropSpeed;coin.chute=ledge;coin.strikes++;
          emit('coin',{mass:coin.mass,force:speed,contact:coin.strikes});s.shutter.v+=speed*coin.mass*5;
          coin.dropSpeed=-speed*.24;if(coin.strikes>=2)phase('choose')}
        return;
      }
      if(!coin.visible)return;
      const insert=s.phase==='insert',target=insert?layout.slot:layout.coin;
      const x=coin.drag?coin.tx:target[0],y=coin.drag?coin.ty:target[1],z=insert?target[2]-.049:target[2];
      const k=insert?135:65,d=insert?21:13;
      for(const [key,to] of [['x',x],['y',y],['z',z]]){const v='v'+key;coin[v]+=((to-coin[key])*k-d*coin[v])*h;coin[key]+=coin[v]*h}
      coin.spin+=((insert?2.2:0)+s.gusts[0].air*.23-coin.spin*1.6)*h;coin.angle+=coin.spin*h;
      if(insert&&s.age>.57){coin.visible=false;coin.dropSpeed=.24;coin.chute=0;coin.strikes=0;phase('coinFall')}
    }
    // 列ごとに独立した押し子、モーター軸、ねじりばね、補充台。
    // 軸が一回転した位置で品物との結合が外れ、ばねの振動だけが残る。
    function updateDrive(h){
      for(let i=0;i<8;i++){
        const c=s.coils[i],on=s.phase==='vend'&&s.choice===i;
        const swapping=c.stockType!==s.chapter;
        spring(c.feed,(swapping||c.empty)?-.195:0,91+(i%4)*2.5,16.5+(i>>2)*.8,h);
        if(swapping&&c.feed.x<-.167){c.stockType=s.chapter;c.empty=false}
        spring(c.button,on&&s.age<.12?-.014:0,410,24,h);
        c.glow+=((s.phase==='choose'?.84+.15*s.gusts[i%5].air:on?.78:.05)-c.glow)*Math.min(1,h*(2.9+i*.31));
        if(on){
          // A smooth finite revolution. Angular speed vanishes at the release notch.
          const u=clamp(s.age/1.2,0,1),next=c.turn+TAU*(u-Math.sin(TAU*u)/TAU);
          const speed=(next-c.angle)/h;c.elastic.v+=(speed-c.speed)*.019;c.speed=speed;
          if(Math.floor(next/(TAU/5))>Math.floor(c.angle/(TAU/5)))emit('spring',{mass:s.item.mass,speed});
          c.angle=next;
        }else{c.speed=0}
        spring(c.elastic,0,178,7,h);
      }
      if(s.phase==='vend'){
        const p=s.item,c=s.coils[s.choice];p.z=.373+.035*(c.angle-c.turn)/TAU;
        if(s.age>=1.2-1e-7){p.mode='fall';p.vz=.095;p.vx=.024*(p.flavor-1.3);p.spin=2.2/p.mass;p.age=0;phase('drop')}
      }
    }
    function rollSound(p,dx){p.rollMeter+=Math.abs(dx);if(p.rollMeter>.046){p.rollMeter-=.046;emit('roll',{mass:p.mass,force:Math.min(1,Math.abs(p.vx)),material:p.type===2?'rubber':'metal'})}}
    function trayLip(p){if(p.z>.435&&p.vz>0){p.z=.435;p.vz*=-.24;s.shutter.v+=p.mass*.12}}
    // 落下中は重力、取り出し口では底と前縁の反力、その後は摩擦。
    // 接地速度から反発と発音を決め、並進・回転とも小さくなると静止させる。
    function updateItem(p,h){
      p.age+=h;
      const loose=p.mode==='fall'||p.mode==='trayRoll';spring(p.lay,loose?Math.PI/2:0,loose?34:18,loose?7:6,h);
      if(p.mode==='fall'){
        p.vy-=9.81*h;p.y+=p.vy*h;
        if(p.y<1.13&&p.y>.58&&p.contacts===0)p.vz+=((.298-p.z)*125-p.vz*15)*h;
        p.z+=p.vz*h;p.x+=p.vx*h;p.angle+=p.spin*h;
        const floor=layout.tray[1]+.018;
        if(p.y<=floor&&p.vy<0){const speed=-p.vy;p.y=floor;p.vy=speed*(p.type===2?.32:.17);p.contacts++;
          if(p.contacts===1){p.vx=(MX+layout.tray[0]-p.x)*2.8+.08;p.vz=.66;s.shutter.v+=speed*p.mass*.49}
          emit('impact',{mass:p.mass,force:speed,material:p.type===2?'rubber':'metal'});if(p.vy<.15){p.vy=0;p.mode='trayRoll'}}
        if(p.contacts)trayLip(p);
      }else if(p.mode==='trayRoll'){
        p.vx*=Math.exp(-(3.1+.27/p.mass)*h);p.vz*=Math.exp(-6*h);p.x+=p.vx*h;p.z+=p.vz*h;
        trayLip(p);rollSound(p,p.vx*h);p.spin+=(p.vx/.06-p.spin)*Math.min(1,h*5.5);p.angle+=p.spin*h;
        if(Math.abs(p.vx)<.002&&Math.abs(p.spin)<.045){p.vx=0;p.vz=0;p.spin=0}
        if(Math.abs(p.vx)<.012&&Math.abs(p.spin)<.19&&p.z>.35&&s.phase==='drop'){p.settled=true;phase('pickup')}
      }else if(p.mode==='carry'){
        const target=p.target;
        for(const [i,key] of ['x','y','z'].entries()){const v='v'+key;
          const aim=target[i]+(i===1?.43:i===2?.22:0)*Math.exp(-((p.age-.3)**2)/.052);
          p[v]+=((aim-p[key])*20-p[v]*7.9)*h;p[key]+=p[v]*h}
        p.spin+=((Math.round(p.angle/TAU)*TAU-p.angle)*18-p.spin*8)*h;p.angle+=p.spin*h;
        if(p.age>2.4){if(p.type===2)p.vx=.54;p.mode='play';p.age=0;s.playTime=0;s.interactions=0;phase('play');if(p.type===3)emit('fabric',{force:.7})}
      }else if(p.mode==='stow'){
        for(const [i,key] of ['x','y','z'].entries()){const v='v'+key,aim=p.target[i]+(i===1?.34:0)*Math.exp(-((p.age-.28)**2)/.04);
          p[v]+=((aim-p[key])*28-p[v]*9)*h;p[key]+=p[v]*h}
      }else if(p.mode==='play'){
        spring(p.tilt,0,51,3.4,h);spring(p.bounce,0,94,7,h);
        if(p.type===2){
          const center=s.anchor[0],limit=.68,wet=s.water[20].depth;
          p.vx+=(-p.vx*(1.5-.2*wet)-.095*(p.x-center))*h;p.vz+=(-p.vz*2.5-1.8*(p.z-p.target[2]))*h;
          p.x+=p.vx*h;p.z+=p.vz*h;p.angle-=p.vx*h/.083;
          if(Math.abs(p.x-center)>limit&&(p.x-center)*p.vx>0){p.vx*=-.6;p.tilt.v+=.4;emit('impact',{mass:p.mass,force:Math.abs(p.vx),material:'rubber'})}
          rollSound(p,p.vx*h);
        }
      }
    }
    // 五つの風域が隣と運動量を交換する。各枝の曲げと羽根のたわみには
    // 別々の剛性と抵抗があり、指を離した後も角運動量が減衰する。
    function updateAir(h){
      for(let i=0;i<s.gusts.length;i++){const g=s.gusts[i];g.hold-=h;if(g.hold<=0){g.pressure=.05+rnd()*(s.chapter===1?2.5:1.35);g.hold=.65+2.4*rnd()}
        g.air+=((g.pressure-g.air)*.77+((i?s.gusts[i-1].air:g.pressure)-g.air)*.24)*h}
      s.leaves.forEach((leaf,i)=>spring(leaf.bend,s.gusts[i%5].air*leaf.gain*.17,leaf.stiff,2.4+i%3*.4,h));
      for(let i=0;i<s.dust.length;i++){const p=s.dust[i],air=s.gusts[i%5].air;
        p.vx+=(air*.047-p.vx)*h;p.vy+=((.017-p.y*.009)+air*.006-p.vy)*h;p.x+=p.vx*h;p.y+=p.vy*h;
        if(p.x>2.75)p.x=-2.75;if(p.y>3.4)p.y=.02}
      const r=s.rotor,live=[s.item,...s.keeps].some(p=>p&&p.type===1&&p.mode==='play');
      r.impulse*=Math.exp(-1.65*h);const torque=live?s.gusts[3].air*1.72+r.impulse:0;
      r.speed+=(torque-.28*r.speed-.055*r.speed*Math.abs(r.speed))*h;r.angle+=r.speed*h;
      r.flex.forEach((f,i)=>spring(f,(r.speed*.012+s.gusts[i].air*.04)*Math.cos(r.angle+i*TAU/5),33+i,4,h));
    }
    function updateRiver(h){
      // Neighbouring surface slopes accelerate each parcel; shallow edges lose more energy.
      for(let i=0;i<s.river.length;i++){const p=s.river[i],x=i%16,z=i>>4;
        const west=s.river[x?i-1:i],east=s.river[x<15?i+1:i],north=s.river[z?i-16:i],south=s.river[z<5?i+16:i];
        const curvature=west.height+east.height+north.height+south.height-4*p.height;
        const stress=(s.gusts[(x+z)%5].air-s.gusts[(x+z+2)%5].air)*.014;
        p.velocity+=(curvature*3.3*p.depth+stress-p.height*.9-p.velocity*(.64+(z===0?.28:0)))*h}
      for(const p of s.river)p.height+=p.velocity*h;
    }
    // 照明は管ごとの電流と熱、降雨は一粒ごとの空中・接触状態。
    // 傘骨にはたわみと保水量が残り、路面は格子ごとの水深（mm）と波紋を持つ。
    // 流出・蒸発で乾いた区画から反射が消え、濡れた区画は次の場面にも残る。
    function updateWeather(h){
      const evening=s.chapter===3&&!s.closing?1:s.chapter*.13*(s.closing?0:1);
      s.evening+=(evening-s.evening)*.22*h;
      s.lamps.forEach((l,i)=>{const drive=.17+s.evening*(.68+i*.07)+.009*s.gusts[(i+1)%5].air;l.current+=(drive-l.current)*(4+i)*h;l.heat+=(l.current-l.heat)*(1.6+i*.4)*h});
      const wet=s.chapter===3&&!s.closing&&((s.phase==='play'||s.phase==='take'||s.phase==='pickup'||s.phase==='drop')||s.rainRate>.15);
      s.rainRate+=((wet?1:0)-s.rainRate)*(wet?.23:.42)*h;
      const u=s.umbrella,p=s.item,up=p&&p.type===3&&(p.mode==='carry'||p.mode==='play')&&!s.closing;
      spring(u.open,up?1:0,12,5.4,h);
      u.ribs.forEach((r,i)=>{u.loads[i]*=Math.exp(-.09*h);spring(r,u.open.x+u.loads[i]*.06,31+i*1.7,5,h)});
      for(let i=0;i<s.rain.length;i++){const d=s.rain[i];d.hit=Math.max(0,d.hit-3*h);
        if(!d.active){if(s.rainRate>.015&&rnd()<s.rainRate*h*2.5){d.x=rnd()*5.8-2.8;d.y=2.6+rnd()*2.4;d.z=rnd()*3-1;d.active=true}continue}
        d.y-=d.speed*h;d.x+=s.gusts[i%5].air*.32*h;
        const intercepted=up&&u.open.x>.55&&Math.hypot(d.x-p.x,d.z-p.z)<.48*u.open.x&&d.y<=p.y+.07&&d.y>p.y-.11;
        if(intercepted||d.y<.02){const index=clamp(Math.floor((d.x+2.8)/5.8*8),0,7)+8*clamp(Math.floor((d.z+1)/3*4),0,3);
          const cell=s.water[index];if(intercepted){const rib=(Math.floor((Math.atan2(d.z-p.z,d.x-p.x)+Math.PI)/TAU*8))%8;u.loads[rib]+=.12;u.ribs[rib].v-=.13;emit('drip',{force:.1})}
          else{cell.depth=Math.min(1.4,cell.depth+.016);cell.ripple.v+=.24;if(i%19===0)emit('drip',{force:.07})}
          d.active=false;d.hit=1}
      }
      // Each canopy sector gathers its own film. Gravity detaches a bead at its hem.
      u.beads.forEach((d,i)=>{
        if(!d.free&&up&&u.loads[i]>(.105+(i%3)*.018)/(1+Math.abs(u.ribs[i].v))){
          const a=i*TAU/8,reach=.465*u.open.x;d.x=p.x+Math.cos(a)*reach;d.z=p.z+Math.sin(a)*reach;d.y=p.y-.18*u.open.x;
          d.vx=.14*Math.cos(a)+s.gusts[i%5].air*.07;d.vz=.14*Math.sin(a);d.vy=-.13;d.free=true;
          u.loads[i]=Math.max(0,u.loads[i]-.103)
        }
        if(d.free){d.vy-=9.81*h;d.x+=d.vx*h;d.y+=d.vy*h;d.z+=d.vz*h;
          if(d.y<=.012){d.y=.012;d.free=false;const ix=clamp(Math.floor((d.x+2.8)/5.8*8),0,7),iz=clamp(Math.floor((d.z+1)/3*4),0,3),cell=s.water[ix+iz*8];
            cell.depth=Math.min(1.4,cell.depth+.024);cell.ripple.v+=.39;emit('drip',{force:.16,from:'hem'})}}
      });
      s.water.forEach((w,i)=>{const below=s.water[(i+1)%32],flow=Math.max(0,w.depth*w.grade-below.depth*below.grade)*.19*h;
        w.depth=Math.max(0,w.depth-flow-(.002+.022*(1-s.rainRate))*h);below.depth+=flow;spring(w.ripple,0,90,6.2,h)});
    }
    function advance(h){
      s.time+=h;s.age+=h;s.quiet+=h;
      const canHint=['coin','choose','pickup','play'].includes(s.phase)&&!s.closing;
      if(s.quiet>4&&canHint&&!coin.drag){s.hint=Math.min(1,s.hint+h*3);s.hintAge+=h}else{s.hint=Math.max(0,s.hint-h*4)}
      updateAir(h);updateRiver(h);updateCoin(h);updateDrive(h);if(s.item)updateItem(s.item,h);s.keeps.forEach(p=>updateItem(p,h));updateWeather(h);
      spring(s.shutter,0,104,6.5,h);spring(s.cabinet,0,121,9,h);
      spring(s.camera,['drop','pickup'].includes(s.phase)?1:0,8.7,5.4,h);
      const bringing=s.item&&s.item.mode==='carry',playing=s.item&&s.item.mode==='play';
      spring(s.follow,bringing?Math.min(1,s.item.age*.58):playing?1:0,12,7,h);
      spring(s.lowView,(playing||bringing)&&s.item.type===2?1:0,12,7,h);
      if(s.phase==='play'){s.playTime+=h;
        if(s.chapter<3&&s.playTime>[5,10,9][s.chapter]){s.keeps.push(s.item);s.item=null;s.chapter++;s.choice=-1;installCoin()}
        if(s.chapter===3&&s.playTime>23&&s.quiet>7&&!s.closing){s.closing=true;s.resetAge=0;phase('clear')}
      }
      if(s.closing){s.resetAge+=h;
        for(const p of [...s.keeps,s.item]){if(p&&p.mode==='play'&&s.resetAge>1.1+p.type*.72){p.mode='stow';p.age=0;p.target=[s.anchor[0]-.02+p.type*.018,.115,s.anchor[2]-.032]}}
        if(s.resetAge>8){s.keeps=[];s.item=null;s.chapter=0;s.round++;s.closing=false;s.choice=-1;installCoin();s.quiet=0}}
    }
    return {state:s,step(dt){if(!Number.isFinite(dt)||dt<0)return;carry+=dt;while(carry+1e-10>=H){advance(H);carry-=H}},
      action,events(){return eventQueue.splice(0)},getState(){return JSON.parse(JSON.stringify(s))},layout};
  }
  const api={createGame,layout};if(typeof module==='object'&&module.exports)module.exports=api;else root.StreetMachine=api;
})(typeof window==='object'?window:globalThis);
