/* Lengths in metres, angles in radians, time in seconds. */
(function (root, make) {
  if (typeof module === 'object' && module.exports) module.exports = make()
  else root.TileWorld = make()
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict'
  const PITCH = .15, SNAP = .05, W = 8, D = 6
  const materials = {
    ceramic: {mass: .46, stiffness: 126, damping: 6.6, hz: 1160, absorb: .18},
    wood: {mass: .24, stiffness: 52, damping: 4.3, hz: 380, absorb: .64},
    stone: {mass: .71, stiffness: 172, damping: 10.8, hz: 720, absorb: .28}
  }
  const modes = ['ceramic', 'wood', 'stone', 'stone']
  const holes = [
    [18,19,20,26,27,28], [17,25,26,27,19,20,21],
    [11,12,20,19,27,28,29], [9,17,18,26,27,28,36,37]
  ]
  const trays = [-.37, 0, .37]
  const types = Object.keys(materials)
  const clamp = (x,a,b) => Math.min(b, Math.max(a,x))
  function point(i) {return {x:(i%W-3.5)*PITCH, z:(Math.floor(i/W)-2.5)*PITCH}}
  function randomSource(seed) {
    return () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
  }
  function create(options={}) {
    const random = randomSource(options.seed === undefined ? 45017 : options.seed)
    let s, events=[], debt=0
    let sources=trays.map(x=>({x:x-.052,z:.68}))
    function enter(stage,cycle=0) {
      const cells = Array.from({length:W*D}, (_,i)=>({
        ...point(i), id:i, placed:!holes[stage].includes(i), height:0, velocity:0,
        heat:19+(i%W)*.13, film:0, wet:0, light:.02+(i%W)*.016,
        material:modes[stage], neighbors:[i%W?i-1:-1,i%W<W-1?i+1:-1,i>=W?i-W:-1,i<W*(D-1)?i+W:-1].filter(j=>j>=0)
      }))
      const seams=[]
      for (const c of cells) for (const j of c.neighbors) if (j>c.id)
        seams.push({a:c.id,b:j,fill:c.placed&&cells[j].placed?1:0})
      s={stage,cycle,cells,seams,idle:0,age:0,done:false,travel:0,departing:false,
        door:0,doorV:0,hand:null,events:0,material:modes[stage],
        pressure:Array.from({length:6},(_,i)=>({wind:random()*.025,target:random()*.04-.02,life:1+i*.17,angle:0,velocity:0})),
        dust:Array.from({length:23},()=>({x:random()*1.12-.56,y:.09+random()*.48,z:random()*.75-.4,vx:random()*.005,vy:random()*.005,vz:0})),
        chimes:Array.from({length:5},(_,i)=>({angle:0,velocity:0,length:.105+i*.019})),
        drawers:types.map(()=>({angle:0,velocity:0})),
        spout:0,spoutV:0,pouring:0,waterTank:.45,drips:[],dropId:0,waterClock:0,
        water:Array.from({length:7},()=>({h:0,v:0})),
        lanterns:Array.from({length:4},()=>({energy:0,temperature:20,petals:Array.from({length:4},()=>({angle:.08,velocity:0}))})),
        guide:0,guideV:0,guideRest:0,sourceLift:0,sourceV:0
      }
    }
    enter(options.stage || 0)
    function emit(type,extra={}) {events.push({type,...extra});s.events++}
    function nearest(x,z) {
      let d=SNAP+1e-10, result=null
      for(const c of s.cells) if(!c.placed) {
        const dist=Math.hypot(c.x-x,c.z-z)
        if(dist<=d){d=dist;result=c}
      }
      return result
    }
    function touch(){s.idle=0;s.guide=0;s.guideV=0;s.guideRest=0}
    function pick(type) {
      touch()
      if(s.departing || !materials[type])return false
      if(type!==s.material || s.done) {
        s.drawers[types.indexOf(type)].velocity+=.12;return false
      }
      if(s.hand)return true
      const {x,z}=sources[types.indexOf(type)]
      s.hand={type,x,z,y:.014+s.sourceLift,vx:0,vz:0,vy:0,tx:x,tz:z,returning:false}
      emit('lift',{material:type});return true
    }
    function move(x,z){if(s.hand && s.hand.snapId===undefined && !s.departing){touch();s.hand.tx=clamp(x,-.95,.95);s.hand.tz=clamp(z,-.52,1.83);s.hand.returning=false}}
    function release(keep=false) {
      if(!s.hand || s.hand.snapId!==undefined)return
      if(keep)return
      const h=s.hand,c=nearest(h.tx,h.tz)
      if(c){h.tx=c.x;h.tz=c.z}
      else {h.returning=true;const source=sources[types.indexOf(h.type)];h.tx=source.x;h.tz=source.z}
    }
    function soundCell(id, strength=1) {
      const c=s.cells[id]
      if(!c || !c.placed || s.departing)return
      const j=(id%W+Math.floor(id/W))%5
      if(s.stage===1)s.chimes[j].velocity+=strength*(.95+j*.09)
      if(s.stage===2)s.pouring=Math.max(s.pouring,.7+strength*.38)
      if(s.stage===3){const lamp=s.lanterns[Math.floor((id%W)/2)];lamp.energy=clamp(lamp.energy+strength*(.64-.10*c.z),0,1.5)}
      emit('click',{material:c.material,note:j,strength,frequencyHz:materials[c.material].hz*[1,9/8,5/4,3/2,5/3][j],hapticMs:strength===1?12:0})
    }
    function tapCell(id) {
      touch()
      const c=s.cells[id]
      if(!c)return
      if(s.hand&&!c.placed){move(c.x,c.z);release();return}
      if(!c.placed || s.stage===0 || s.departing)return
      c.velocity+=.042/materials[c.material].mass;soundCell(id,.55)
    }
    function tapFeature(part='door'){
      touch()
      if(s.departing)return
      if(part==='spout' && s.stage===2){s.pouring=1.85;emit('water');return}
      if(s.done){s.departing=true;emit('depart');return}
      s.doorV+=.055
    }
    function settle(c,h) {
      c.placed=true;c.material=h.type;c.height=clamp(h.y-.007,.001,.021)
      c.velocity=-.12-Math.min(.18,Math.hypot(h.vx,h.vz)*.14)
      s.hand=null;soundCell(c.id)
      if(s.cells.every(v=>v.placed)){s.done=true;emit('complete')}
    }
    function updateHand(d) {
      const h=s.hand
      if(!h)return
      const c=nearest(h.x,h.z)
      if(c && !h.returning && Math.hypot(h.tx-c.x,h.tz-c.z)<=SNAP && h.snapId===undefined){
        h.snapId=c.id;h.tx=c.x;h.tz=c.z
      }
      if(h.snapId!==undefined && Math.hypot(h.x-h.tx,h.z-h.tz)<.0018 && h.y<.011){
        settle(s.cells[h.snapId],h);return
      }
      const aboveFloor=h.tz<.47
      const ty=h.snapId!==undefined?.007:h.returning?.014:aboveFloor?.042:.11
      const ax=(h.tx-h.x)*370-h.vx*35,az=(h.tz-h.z)*370-h.vz*35
      const forceLimit=Math.min(1,18/Math.max(.001,Math.hypot(ax,az)))
      h.vx+=ax*forceLimit*d;h.vz+=az*forceLimit*d
      const speedLimit=Math.min(1,1.28/Math.max(.001,Math.hypot(h.vx,h.vz)))
      h.vx*=speedLimit;h.vz*=speedLimit
      h.vy+=((ty-h.y)*370-h.vy*35)*d
      h.x+=h.vx*d;h.z+=h.vz*d;h.y+=h.vy*d
      if(h.returning && Math.hypot(h.x-h.tx,h.z-h.tz,h.y-ty)<.002)s.hand=null
    }
    // 隣の空気から遅れて風圧が届く。枝は弾性で戻り、埃は部屋の境で反発する。
    function updateAir(d) {
      s.pressure.forEach((p,i)=>{
        p.life-=d
        if(p.life<=0){p.target=(random()-.47)*.064;p.life=.63+random()*1.47}
        const upstream=i?s.pressure[i-1].wind:p.target
        p.wind+=(p.target*.73+upstream*.27-p.wind)*d*(1.4+i*.09)
        p.velocity+=(p.wind*15-p.angle*(12+i*.8)-p.velocity*2.4)*d
        p.angle+=p.velocity*d
      })
      for(const q of s.dust) {
        const k=clamp(Math.floor((q.x+.6)/.2),0,5),p=s.pressure[k]
        q.vx+=(p.wind*.61-q.vx)*d*.83
        q.vy+=(.003+Math.abs(p.wind)*.31+(q.z*.20+.31-q.y)*.069-q.vy)*d*.62
        q.vz+=(s.pressure[(k+2)%6].wind*.33-q.vz)*d
        q.x+=q.vx*d;q.y+=q.vy*d;q.z+=q.vz*d
        for(const [k,v,a,b] of [['x','vx',-.58,.58],['y','vy',.06,.61],['z','vz',-.42,.42]])
          if(q[k]<a||q[k]>b){q[k]=clamp(q[k],a,b);q[v]*=-.82}
      }
    }
    // 傾いた注ぎ口から有限量の滴を離す。着水で滴を消し、その地点の波と水膜に勢いを渡す。
    // 波は隣の帯へ進み、粘性で収まる。風がある間は細かなさざ波が残る。
    function updateWater(d) {
      s.pouring=Math.max(0,s.pouring-d)
      s.spoutV+=((s.pouring>0?.53:0)-s.spout)*31*d-s.spoutV*6.1*d
      s.spout+=s.spoutV*d
      s.waterTank=clamp(s.waterTank+(s.pouring>0?-.063:.027)*d,0,.55)
      s.waterClock+=Math.max(0,s.spout-.16)*s.waterTank*d*69
      if(s.waterClock>=1){
        s.waterClock-=1
        s.drips.push({id:++s.dropId,x:-.51+.113*Math.cos(s.spout)+.080*Math.sin(s.spout),y:.226+.080*Math.cos(s.spout)-.113*Math.sin(s.spout),z:-.314,vy:-.06,vx:.012+random()*.018})
      }
      for(let i=s.drips.length-1;i>=0;i--){
        const q=s.drips[i];q.vy-=9.81*d;q.y+=q.vy*d;q.x+=q.vx*d
        if(q.y<=.063){s.water[2+i%3].v+=.095;s.cells[9].film+=.105;s.drips.splice(i,1);emit('drop')}
      }
      const heights=s.water.map(v=>v.h)
      s.water.forEach((v,i)=>{
        const lap=(heights[i-1]||0)+(heights[i+1]||0)-2*v.h
        const shear=(s.pressure[i%6].wind-s.pressure[(i+2)%6].wind)*(.47+.07*i)
        v.v+=(lap*145-v.h*44-v.v*4.1+shear)*d;v.h+=v.v*d
      })
    }
    // 着地の速度を各タイルの質量・ばね・減衰で受ける。静止域に入った縁だけがつながる。
    // 水分は敷いた隣接面へ浸透して蒸発し、温度差は下地を通して広がる。
    function updateFloor(d) {
      const heat=s.cells.map(c=>c.heat),wet=s.cells.map(c=>c.wet)
      for(const c of s.cells){
        const m=materials[c.material]
        c.velocity+=(-m.stiffness*c.height-m.damping*c.velocity)*d/m.mass
        c.height+=c.velocity*d
        if(c.height<-.0018){c.height=-.0018;c.velocity=Math.abs(c.velocity)*.23}
        if(Math.abs(c.height)<.000012&&Math.abs(c.velocity)<.0002){c.height=0;c.velocity=0}
        let conduction=0,flow=0
        for(const n of c.neighbors){conduction+=heat[n]-c.heat;if(c.placed&&s.cells[n].placed)flow+=wet[n]-wet[c.id]}
        const exposure=.52+.43*(c.x+.54)-.13*c.z
        const sun=s.stage===3?(s.done?13:5)*exposure:2*exposure
        c.heat+=(conduction*.17+(19+sun-c.heat)*(.065+m.absorb*.1))*d
        const uptake=Math.min(c.film,c.film*d*(2.6+m.absorb))
        c.film-=uptake
        c.wet=clamp(c.wet+uptake+(flow*.47-c.wet*(.045+m.absorb*.07))*d,0,1)
        const reflection=clamp(exposure+(1-Math.cos(s.door))*.44*Math.exp(-12*(c.x-.32)**2)+s.pressure[c.id%6].angle*.78,0,1)
        c.light+=(reflection-c.light)*d*(.46+exposure*.41)
      }
      for(const j of s.seams){
        const a=s.cells[j.a],b=s.cells[j.b]
        if(j.fill<1&&a.placed&&b.placed&&Math.abs(a.height-b.height)<.0014&&Math.max(Math.abs(a.velocity),Math.abs(b.velocity))<.02)
          j.fill=Math.min(1,j.fill+d*(.85+.31*materials[a.material].absorb+.055*(j.a%5)))
      }
    }
    // 戸と引き出しはばねと摩擦、木片は長さ別の重力振り子。入力後も速度を引き継ぐ。
    // 庭では近くの石に伝わった力を蓄え、各灯の温度で花弁の開く角度が決まる。
    function updateMechanisms(d) {
      s.doorV+=((s.done?1.46:0)-s.door)*4.3*d-s.doorV*3.25*d
      s.door+=s.doorV*d
      s.chimes.forEach((c,i)=>{
        c.velocity+=(-9.81/c.length*Math.sin(c.angle)-c.velocity*1.02+s.pressure[i].wind*.73)*d;c.angle+=c.velocity*d
      })
      for(const b of s.drawers){b.velocity+=(-62*b.angle-7*b.velocity)*d;b.angle+=b.velocity*d}
      if(s.stage===3)s.lanterns.forEach((l,i)=>{
        l.energy=Math.max(0,l.energy-.057*d)
        const c=s.cells[i*2]
        const power=l.energy+(s.done?.50+.04*i:0)
        l.temperature+=(20+(c.heat-19)*.71+power*9.1-l.temperature)*d*.78
        l.petals.forEach((p,j)=>{
          const opening=clamp((l.temperature-20.3-j*.27)*.067,0,.98)
          p.velocity+=((.08+opening-p.angle)*(18+j)-p.velocity*5.3+s.pressure[(i+j)%6].wind*.14)*d
          p.angle+=p.velocity*d
        })
      })
      const target=s.done||s.hand?0:Math.max(0,s.pressure[1].angle*.027)+.0027
      s.sourceV+=((target-s.sourceLift)*41-s.sourceV*5)*d;s.sourceLift+=s.sourceV*d
      if(s.idle>=4 && !s.departing){
        if(s.guideRest>0)s.guideRest-=d
        else {s.guideV+=(.34-s.guideV)*d*3.4;s.guide+=s.guideV*d
          if(s.guide>1.25){s.guide=0;s.guideV=0;s.guideRest=1.4}}
      }
    }
    function tick(d){
      s.age+=d;s.idle+=d
      updateAir(d);updateHand(d);updateFloor(d);updateMechanisms(d)
      if(s.stage===2)updateWater(d)
      if(s.done && !s.departing && s.idle>10){s.departing=true;emit('depart')}
      if(s.departing){s.travel=Math.min(1,s.travel+d/2.3);if(s.travel>=1){
        enter((s.stage+1)%4,s.cycle+(s.stage===3?1:0));emit('arrive')
      }}
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<=0)return
      debt+=dt
      while(debt+1e-12>=1/120){tick(1/120);debt-=1/120}
    }
    return {step,getState:()=>JSON.parse(JSON.stringify(s)),read:()=>s,
      setSources:points=>{sources=points.map(({x,z})=>({x,z}))},drain:()=>events.splice(0), pick,move,release,tapCell,tapFeature,touch}
  }
  return {create,point,materials,holes,trays,types,PITCH,SNAP,W,D}
})
