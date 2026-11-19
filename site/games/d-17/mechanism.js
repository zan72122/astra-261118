/* All distances are metres, angles radians and time seconds. Fixed substeps
   keep the escapement, gear contacts and hinges independent of frame rate. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.Clockworks = factory()
})(globalThis, function () {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
  const pi = Math.PI
  const sockets = [[-2,3.02,.26],[-.48,3.62,.26],[.31,2.494,.26],[-.77,1.96,.26]]
  const rests = {1:[-2.18,1.455,1.53],3:[-.92,1.439,1.53]}
  const route=[[1.39,6.70,-2.55],[2.95,6.30,-5.9],[4.23,3.65,-9.1],[2.35,.40,-13.6],[2.15,-2.49,-18.1],[6.42,1.38,-22.1],[8.34,4.75,-19.9],[6.28,6.91,-11.0],[2.5,7.1,-4.1],[1.39,6.70,-2.55]]
  function flightPoint(u) {
    const j=Math.min(route.length-2,Math.floor(u)),t=u-j
    const a=route[Math.max(0,j-1)],b=route[j],c=route[j+1],d=route[Math.min(route.length-1,j+2)]
    return b.map((v,i)=>.5*(2*v+(-a[i]+c[i])*t+(2*a[i]-5*v+4*c[i]-d[i])*t*t+(-a[i]+3*v-3*c[i]+d[i])*t*t*t))
  }
  function create(options = {}) {
    let seed = 17291
    function rand() { seed=(Math.imul(1664525,seed)+1013904223)>>>0; return seed / 4294967296 }
    const teeth = options.teeth || [24,14,18,10]
    const s = {
      stage:'assemble', chapter:0, stageAge:0, idle:0, cycles:0, time:0, air:.06, draft:.07,
      gears:teeth.map((n,i)=>({teeth:n,angle:[.08,.13,.04,.1][i],omega:0,installed:i%2===0,
        docking:false,p:(rests[i]||sockets[i]).slice(),v:[0,0,0],tilt:i%2?-1.02:0,tiltV:0,contact:0})),
      spring:{energy:1.25,angle:0,speed:0,torque:0,twist:0}, pend:{a:.018,v:0}, dial:0,
      ladder:{x:0,v:0},lift:{x:0,v:0}, upper:{angle:0,omega:0},bell:{a:0,v:0,clapper:0,cv:0,strikes:0,contact:false},
      rope:{x:0,v:0,pull:0},panes:[{a:0,v:0,free:false},{a:0,v:0,free:false}],
      roof:{x:0,v:0}, hand:{a:-.86,v:0,work:0}, dusk:0, lookout:0,wide:0,shutter:{x:0,v:0},
      tour:{u:0,speed:0,dive:0,v:0,bank:0,wind:0,splash:0},
      dust:Array.from({length:66},()=>({x:rand()*9-4.5,y:rand()*6+.3,z:rand()*3.8-1,vx:(rand()-.5)*.05,vy:rand()*.025,seed:rand(),rad:.003+rand()*.007})),
      water:Array.from({length:32},(_,i)=>({height:.006*Math.sin(i*.7),velocity:.003*Math.cos(i),accel:0})),
      lamps:Array.from({length:3},(_,i)=>({heat:.65+i*.036,current:.7,phase:rand()*6,rate:6+rand()*4})),
      birds:Array.from({length:7},(_,i)=>({x:1.4+i*.38,y:6.70,z:-2.55,vx:0,vy:0,vz:0,wing:.16,av:0,phase:rand()*6,flying:false,heading:-.45-i*.22,yaw:0,fold:1,foldV:0})),
      houses:Array.from({length:42},(_,i)=>({heat:0,on:false,lag:.4+rand()*1.7, district:i%3})),
      sway:{a:0,v:0},drag:null,hold:null,events:[]
    }
    const enter=(name,chapter=s.chapter)=>{s.stage=name;s.stageAge=0;s.chapter=chapter;s.idle=0}
    function emit(type,x=0,strength=1) { s.events.push({type,x,strength}); if(s.events.length>64)s.events.shift() }
    const next=()=>!s.gears[1].installed?1:!s.gears[3].installed?3:-1
    function contactX(i) {
      const f=teeth[i-1]/(teeth[i-1]+teeth[i])
      return sockets[i-1][0]+(sockets[i][0]-sockets[i-1][0])*f
    }
    function begin(kind,id=0) {
      s.idle=0
      if(kind==='gear' && s.stage==='assemble' && id===next() && !s.gears[id].docking) {
        s.drag={id,target:s.gears[id].p.slice()};return true
      }
      if(kind==='wind' && ['wind','climb','bell'].includes(s.stage)){s.hold='wind';return true}
      if(kind==='port' && s.stage==='peek'){enter('climb',1);emit('latch');return true}
      if(kind==='bird' && s.stage==='view'){enter('flight',2);emit('birds');return true}
      if(kind==='bird' && s.stage==='flight'){s.hold='soar';return true}
      if(kind==='ladder' && s.stage==='climb'){enter('ascent',1);emit('wood');return true}
      if(kind==='rope' && s.stage==='bell'){s.hold='rope';s.rope.pull=.85;s.bell.v+=.24;return true}
      if(kind==='window' && s.stage==='window'){s.panes[id].free=true;emit('wood');return true}
      if(kind==='stair' && s.stage==='landing'){enter('rooftop',3);return true}
      if(kind==='hand' && s.stage==='lights'){s.hold='hand';return true}
      if(kind==='home' && s.stage==='rest'){enter('return');return true}
      s.sway.v+=.012;return false
    }
    function move(p) {
      if(s.drag)s.drag.target=p.slice()
      if(s.hold==='wind')s.spring.twist=clamp(s.spring.twist+Math.abs(p[0])*2.1,0,2.4)
      if(s.hold==='rope')s.rope.pull=clamp(p[0],.3,1.45)
      if(s.hold==='soar')s.tour.wind=clamp(p[0],-1,1)
      if(s.hold==='hand')s.hand.v=clamp(s.hand.v+(p[0]||0),-1.5,2)
      s.idle=0
    }
    function release() {
      if(s.drag) {
        const {id,target}=s.drag, dest=sockets[id]
        if(Math.hypot(target[0]-dest[0],target[1]-dest[1])<.98)s.gears[id].docking=true
        s.drag=null
      }
      if(s.hold==='rope')s.bell.v-=s.rope.x*.82
      s.hold=null;s.rope.pull=0
    }
    function damp(o,k,v,target,stiff,fric,h) {
      o[v]+=((target-o[k])*stiff-fric*o[v])*h;o[k]+=o[v]*h
    }
    function tick(h) {
      s.time+=h;s.stageAge+=h;s.idle=s.drag||s.hold?0:s.idle+h
      s.draft+=(rand()-.5)*.25*Math.sqrt(h)-.35*(s.draft-.06)*h
      s.air+=(s.draft-s.air)*h*.7
      s.lamps.forEach((l,i)=>{l.phase+=(l.rate+.4*s.air)*h;l.current=.79+.035*Math.sin(l.phase)+.024*Math.sin(l.phase*.37+i);l.heat+=(l.current-l.heat)*(1.2+i*.27)*h})
      s.dust.forEach((d,i)=>{
        const u=Math.sin(d.y*1.6+d.z*1.1+d.seed*7)
        d.vx+=(s.air*(.6+d.seed)+u*.025-d.vx*.9-.013*d.x)*h
        d.vy+=(.02*Math.cos(d.x+7*d.seed)+.02*Math.sin(d.z+d.y)-.012*(d.y-3.2)-d.vy*.6)*h
        d.x+=d.vx*h;d.y+=d.vy*h
        if(Math.abs(d.x)>5 && d.x*d.vx>0)d.vx*=-.6
        if((d.y>.2 && d.y>6.5 && d.vy>0)||(d.y<.16&&d.vy<0))d.vy*=-.5
      })
      // Shallow river strips exchange vertical momentum with their neighbours.
      const water=s.water
      water.forEach((w,i)=>{
        const l=water[Math.max(0,i-1)].height,r=water[Math.min(water.length-1,i+1)].height
        w.accel=7*(l+r-2*w.height)-1.4*w.height-.57*w.velocity+s.air*.055*Math.sin(i*.78+w.height*11)
      })
      water.forEach(w=>{w.velocity+=w.accel*h;w.height+=w.velocity*h})
      damp(s.sway,'a','v',s.air*.017,19,1.8,h)
      for(const id of [1,3]){
        const g=s.gears[id],dest=s.drag?.id===id?s.drag.target:(g.docking||g.installed?sockets[id]:rests[id])
        const guided=s.drag?.id===id||g.docking||g.installed
        for(let j=0;j<3;j++){g.v[j]+=((dest[j]-g.p[j])*(guided?85:9)-(guided?17:6)*g.v[j])*h;g.p[j]+=g.v[j]*h}
        damp(g,'tilt','tiltV',s.drag?.id===id||g.installed||g.docking?0:-1.02,70,15,h)
        if(g.docking&&Math.hypot(...g.p.map((v,j)=>v-dest[j]))<.028){
          g.docking=false;g.installed=true;emit('mesh',contactX(id))
          if(next()===-1)enter('wind')
        }
      }
      const spring=s.spring, held=s.hold==='wind'
      const governed=['ascent','bell','window','view','flight','landing','rooftop','lights','rest'].includes(s.stage)
      spring.twist*=Math.exp(-5*h)
      spring.speed+=((held?2.8+spring.twist:0)-spring.speed)*h*(held?3.7:5)
      spring.angle+=spring.speed*h
      spring.energy=clamp(spring.energy+h*(spring.speed*.83-(s.gears[1].installed?.024+.075*Math.abs(s.gears[0].omega):.003)),0,8)
      spring.torque=spring.energy*.52
      const target=s.gears[1].installed&&spring.torque>.21?Math.min(governed?.75:1.1,(spring.torque-.21)*1.65):0
      let linked=true
      s.gears.forEach((g,i)=>{
        linked=linked&&g.installed
        let aim=linked?target*teeth[0]/g.teeth*(i%2?-1:1):0
        if(i && linked && target>.01){
          const prev=s.gears[i-1],a=Math.atan2(sockets[i][1]-sockets[i-1][1],sockets[i][0]-sockets[i-1][0])
          const meshPhase=prev.teeth*(a-prev.angle)+g.teeth*(a+pi-g.angle)-pi
          aim+=3.4*Math.atan2(Math.sin(meshPhase),Math.cos(meshPhase))/g.teeth
        }
        g.omega+=(aim-g.omega)*(aim===0?4.5:2.8)*h
        if(aim===0&&Math.abs(g.omega)<.0002)g.omega=0
        const before=g.angle;g.angle+=g.omega*h
        if(i&&linked&&Math.floor(before*g.teeth/(2*pi))!==Math.floor(g.angle*g.teeth/(2*pi))){
          g.contact=1;emit('tick',contactX(i),Math.min(.55,Math.abs(g.omega)*.18)/i)
        }
        g.contact*=Math.exp(-h*12)
      })
      const drive=s.gears[3].installed?s.gears[3].omega:0
      const pen=s.pend
      pen.v+=(-5.7*Math.sin(pen.a)-.29*pen.v+(Math.abs(drive)>.035?.16*Math.tanh(pen.v*80+Math.cos(s.dial)*.22):0)+s.air*.008)*h
      pen.a+=pen.v*h;s.dial-=drive*h*.33
      if(s.stage==='wind'&&spring.energy>4.7&&Math.abs(pen.v)+Math.abs(pen.a)>.02){enter('peek');emit('latch')}
      damp(s.shutter,'x','v',s.stage==='assemble'||s.stage==='return'?0:1,5,4.8,h)
      const ladderOpen=!['assemble','wind','peek','return'].includes(s.stage)
      damp(s.ladder,'x','v',ladderOpen?1:0,3.4,3.7,h)
      damp(s.lift,'x','v',ladderOpen&&s.stage!=='climb'?1:0,1.8,2.7,h)
      s.upper.omega+=((-drive*teeth[3]/36*clamp(s.ladder.x,0,1))-s.upper.omega)*h*3
      s.upper.angle+=s.upper.omega*h
      if(s.stage==='ascent'&&s.lift.x>.95)enter('bell',1)
      damp(s.rope,'x','v',s.rope.pull,32,8,h)
      const bell=s.bell
      bell.v+=(-4.9*Math.sin(bell.a)-.47*bell.v+s.rope.x*2.9+s.rope.v*1.1+
        (s.stage==='bell'?Math.abs(s.upper.omega)*.27*Math.sin(s.upper.angle*4):0))*h;bell.a+=bell.v*h
      bell.cv+=(-11*Math.sin(bell.clapper)-.32*bell.cv+3.2*bell.v)*h;bell.clapper+=bell.cv*h
      const gap=bell.clapper-bell.a
      if(Math.abs(gap)>.22&&!bell.contact){
        bell.contact=true;bell.cv-=gap*1.85;bell.v+=gap*.24
        if(s.stage==='bell'||s.stage==='window'){bell.strikes++;emit('bell',1,Math.min(1,.45+Math.abs(gap)))}
      }
      if(Math.abs(gap)<.16)bell.contact=false
      if(s.stage==='bell'&&bell.strikes>0&&s.stageAge>1.1){enter('window',2);s.hold=null;s.rope.pull=0}
      s.panes.forEach((p,i)=>{
        const stop=1.42+i*.072
        damp(p,'a','v',p.free?stop+.16+s.air*(i?.08:-.11):0,3.4+i*.6,2.8+i*.35,h)
        if(p.a>=stop){p.a=stop;p.v=p.v>.04?-.13*p.v:0}
        if(!p.free&&p.a<.0007&&p.v<.01){p.a=0;p.v=0}
      })
      if(s.stage==='window'&&s.panes.every(p=>p.a>1.0)){enter('view',2);emit('birds')}
      const tour=s.tour
      s.lookout+=((['view','flight'].includes(s.stage)?1:0)-s.lookout)*h*1.15
      if(s.stage==='flight'){
        const cruise=.257+.084*tour.dive+.13*s.air
        tour.speed+=(cruise-tour.speed)*h*1.9;tour.u=Math.min(route.length-1,tour.u+tour.speed*h)
        damp(tour,'dive','v',s.hold==='soar'?1:0,6,3.6,h)
        tour.bank+=((s.hold==='soar'?tour.wind:0)-tour.bank)*h*1.8
        if(tour.u>=route.length-1){enter('landing');s.hold=null}
      }
      s.birds.forEach((b,i)=>{
        if(i===0){
          let target=flightPoint(tour.u)
          if(s.stage==='flight'){target[0]+=.84*tour.bank;target[1]-=tour.dive*.83}
          b.flying=s.stage==='flight'||Math.abs(b.vy)>.07
          for(const [j,pos,vel] of [[0,'x','vx'],[1,'y','vy'],[2,'z','vz']]){
            b[vel]+=((target[j]-b[pos])*7.2-b[vel]*4.7)*h;b[pos]+=b[vel]*h
          }
          b.av+=(-62*b.wing+(b.flying?6.9*(1-3.8*b.wing*b.wing):-6)*b.av+(b.flying?.24+b.vy:1.5))*h;b.wing+=b.av*h
          if(b.y< -2.84&&s.stage==='flight'&&!tour.splash){
            const wave=water[clamp(Math.round((3-b.z)/1.39),0,31)];wave.velocity+=.12;tour.splash=1;emit('water')
          }
          return
        }
        if(s.panes[i%2].a>1.0+i*.033)b.flying=true
        if(!b.flying)return
        // Each bird seeks its own updraft, banks at the edge of the valley,
        // and folds its wings on its return to a sill.
        const home=s.stage==='return'||s.stage==='assemble'
        const tx=home?1.4+i*.38:Math.cos(b.phase)*5+i*.36
        const ty=home?6.70:9.8+i*.46+Math.sin(b.phase*.7)
        const tz=home?-2.55:-9-i*1.8+3*Math.sin(b.phase)
        b.phase+=h*(.21+i*.017+Math.abs(b.vx)*.013)
        b.vx+=((tx-b.x)*.53-b.vx*.84+s.air*.3)*h
        b.vy+=((ty-b.y)*.89-b.vy*.9)*h;b.vz+=((tz-b.z)*.41-b.vz*.9)*h
        b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h
        b.av+=(-70*b.wing+8.3*(1-b.wing*b.wing*2.8)*b.av+.5+b.vy)*h;b.wing+=b.av*h
        if(home&&Math.hypot(b.x-tx,b.y-ty,b.z-tz)<.12)b.flying=false
      })
      s.birds.forEach((b,i)=>{
        const moving=b.flying&&Math.hypot(b.vx,b.vz)>.06
        const aim=moving?Math.atan2(-b.vx,-b.vz):-.45-i*.22
        const turn=Math.atan2(Math.sin(aim-b.heading),Math.cos(aim-b.heading))
        b.yaw+=(turn*10-b.yaw*5.2)*h;b.heading+=b.yaw*h
        damp(b,'fold','foldV',b.flying?(i===0?.35*tour.dive:0):1,12,6.4,h)
      })
      s.wide+=((['window','view','flight','landing','rooftop','lights','rest'].includes(s.stage)?1:0)-s.wide)*h*1.12
      const upstairs=['rooftop','lights','rest'].includes(s.stage)
      damp(s.roof,'x','v',upstairs?1:0,1.35,2.3,h)
      if(s.stage==='rooftop'&&s.roof.x>.94)enter('lights',3)
      const hand=s.hand
      hand.v+=((s.hold==='hand'?.72:0)-hand.v)*h*(s.hold==='hand'?2:.85)
      hand.a+=hand.v*h
      if(s.stage==='lights')hand.work+=Math.abs(hand.v)*h
      s.dusk+=(clamp(hand.work/5.5,0,1)-s.dusk)*h*.8
      s.houses.forEach((l,i)=>{l.on=s.dusk>(.08+l.district*.26+(i%7)*.027);l.heat+=((l.on?1:0)-l.heat)*h/l.lag})
      if(s.stage==='lights'&&s.houses.every(l=>l.heat>.63)){enter('rest');s.hold=null;emit('finish')}
      if(s.stage==='rest'&&s.stageAge>19)enter('return')
      if(s.stage==='return'){
        spring.energy+=(1.25-spring.energy)*h*1.5
        hand.work*=Math.exp(-h*1.5);s.panes.forEach(p=>p.free=false)
        if(s.stageAge>2){for(const i of [1,3])s.gears[i].installed=false}
        if(s.stageAge>6.8){s.cycles++;tour.u=tour.speed=tour.splash=tour.dive=tour.v=tour.bank=0;bell.strikes=0;enter('assemble',0)}
      }
    }
    return { state:s,next,begin,move,release,step(dt){if(!Number.isFinite(dt)||dt<=0)return;while(dt>1e-9){const h=Math.min(dt,1/120);tick(h);dt-=h}},
      getState(){return JSON.parse(JSON.stringify(s))},sockets,rests }
  }
  return {create,sockets,rests}
})
