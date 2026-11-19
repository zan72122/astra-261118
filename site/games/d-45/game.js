'use strict'
;(()=>{
  const T=THREE,M=Model,{p}=Art
  const game=TileWorld.create()
  window.__GAME__={step:dt=>game.step(dt),getState:game.getState}
  const canvas=document.querySelector('#world'),hint=document.querySelector('#gesture'),ctx=hint.getContext('2d')
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'})
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.025,45)
  scene.background=new T.Color('#b6a2b5')
  scene.environment=Art.environment(renderer);scene.environmentIntensity=.48
  const sky=new T.HemisphereLight(0xecf2ff,0xbc9b96,1.65);scene.add(sky)
  const sun=new T.DirectionalLight(0xffeed1,2.78)
  sun.position.set(-2.1,3.8,-1.4);sun.castShadow=true
  sun.shadow.mapSize.set(2048,2048)
  const sc=sun.shadow.camera;sc.left=sc.bottom=-1.64;sc.right=sc.top=1.64;sc.near=.1;sc.far=8
  sun.shadow.normalBias=.0012;sun.shadow.bias=-.00022;sun.shadow.radius=3
  scene.add(sun,sun.target)
  const world=M.group(scene)
  const tableMat=Art.mat('#b9a4b9',.94)
  const table=M.box(scene,0,-.151,-1,33,.047,33,tableMat);table.castShadow=false
  // Broad, soft contact occlusion under the plinth sits beneath its cast shadow.
  function shadeTexture(){
    const c=Art.canvas(128),g=c.getContext('2d'),gr=g.createRadialGradient(64,64,7,64,64,63)
    gr.addColorStop(0,'rgba(71,47,69,.48)');gr.addColorStop(.50,'rgba(80,55,78,.32)');gr.addColorStop(1,'rgba(95,64,91,0)')
    g.fillStyle=gr;g.fillRect(0,0,128,128);return Art.texture(c)
  }
  const shadowMat=Art.mat('#ffffff',1,{map:shadeTexture(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})
  function shadow(room){
    M.flat(room.root,0,-.1265,.005,2.25,1.78,shadowMat)
    for(const x of TileWorld.trays)M.flat(room.rackSpace,x,-.125,.685,.52,.43,shadowMat)
  }
  // A sprig dropped beside the workshop and a handful of loose petals set its scale.
  const tableDetails=M.group(scene)
  function sprig(x,z,scale,rot){
    const q=M.group(tableDetails,x,-.123,z);q.scale.setScalar(scale);q.rotation.y=rot
    M.rod(q,[-.093,.001,.04],[.117,.013,-.065],.0022,p.twig)
    for(let i=0;i<10;i++){
      const f=i/10,xx=-.079+f*.18,zz=.032-f*.092,dir=i%2?1:-1
      const end=[xx+.018,.008,zz+dir*.032]
      M.rod(q,[xx,.004,zz],end,.0013,p.greenDark)
      const l=M.orb(q,...end,.022,.003,.009,i%3?p.green:p.greenPale);l.rotation.y=dir*.58
    }
    for(let i=0;i<10;i++){const k=i/10;M.orb(q,.074+k*.071,.009,-.04-k*.04+(i%2?-.009:.009)*(1-k),.011*(1-k*.48),.006,.008,p.lilac[i%4])}
  }
  sprig(.817,.39,1.15,-.3)
  for(let i=0;i<7;i++){
    const x=-.68-Art.rnd()*.15,z=.19+Art.rnd()*.38
    const f=M.orb(tableDetails,x,-.124,z,.009+Art.rnd()*.007,.003,.008,p.lilac[i%4]);f.rotation.y=Art.rnd()*4
  }
  M.bake(tableDetails)
  // Ground pigment picks up diffuse shadows of foliage beyond the cutaway.
  const cloth=Art.canvas(768),cg=cloth.getContext('2d')
  cg.fillStyle='#fcf7fa';cg.fillRect(0,0,768,768)
  const wash=cg.createLinearGradient(0,0,710,768)
  wash.addColorStop(0,'#e1d1df');wash.addColorStop(.33,'#fff4e4');wash.addColorStop(.53,'#fcf3f4');wash.addColorStop(.73,'#e0d1e0');wash.addColorStop(1,'#f9eee7')
  cg.fillStyle=wash;cg.fillRect(0,0,768,768)
  cg.filter='blur(6px)'
  for(let k=0;k<8;k++){
    const bx=Art.rnd()*768,by=Art.rnd()*768
    for(let j=0;j<25;j++){
      cg.fillStyle='rgba(113,86,123,'+(.068+Art.rnd()*.102)+')'
      cg.beginPath();cg.ellipse(bx+(Art.rnd()-.5)*215,by+(Art.rnd()-.5)*245,13+Art.rnd()*20,4+Art.rnd()*11,-.92+Art.rnd()*.6,0,7);cg.fill()
    }
  }
  tableMat.map=Art.texture(cloth);tableMat.map.repeat.set(8,8)
  let current=M.room(world,0),next=null
  function trackRoom(room){
    shadow(room)
    arrangeRack(room,innerWidth/innerHeight)
  }
  trackRoom(current)
  const dustMat=Art.mat('#ffedcc',.42,{emissive:0xf2d5ac,emissiveIntensity:.30})
  const grains=new T.InstancedMesh(new T.SphereGeometry(1,6,4),dustMat,23);scene.add(grains)
  const dummy=new T.Object3D()
  const liquid=new T.InstancedMesh(new T.SphereGeometry(1,8,6),p.water,40);scene.add(liquid)
  const held=TileWorld.types.map(type=>M.bake(M.tile(scene,0,0,0,type,0)))
  held.forEach(q=>q.visible=false)
  const inlay=M.group(scene)
  for(let i=0;i<4;i++){
    const q=M.group(inlay);q.rotation.y=i*Math.PI/2
    M.box(q,.055,.0005,.068,.028,.0025,.0027,p.goldLight)
    M.box(q,.068,.0005,.055,.0027,.0025,.028,p.goldLight)
    M.orb(q,.061,.001,.061,.0028,.002,.0028,p.goldLight)
  }
  M.bake(inlay)
  const inlayMaterial=Art.mat('#f7e6bc',.33,{metalness:.26,emissive:0xffcf7d,emissiveIntensity:.24})
  inlay.traverse(o=>{if(o.isMesh)o.material=inlayMaterial})
  // A low-intensity highlight spread is sampled from a half-float render target.
  const rt=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)})
  const postScene=new T.Scene(),postCam=new T.OrthographicCamera(-1,1,1,-1,0,1)
  const fx=new T.ShaderMaterial({uniforms:{picture:{value:rt.texture},pixel:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D picture;uniform vec2 pixel;varying vec2 st;
      void main(){
        vec3 c=texture2D(picture,st).rgb;
        vec3 b=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a))*pixel;
          vec3 v=texture2D(picture,st+d*3.).rgb; b+=max(v-vec3(1.45),vec3(0.));
          v=texture2D(picture,st+d*8.).rgb; b+=max(v-vec3(1.65),vec3(0.));}
        c+=b*.0042;
        c*=1.-.127*smoothstep(.22,.72,length(st-.5));
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float n=fract(sin(dot(gl_FragCoord.xy,vec2(127.1,311.7)))*4375.5453);
        gl_FragColor.rgb+=(n-.5)*.008;
      }`,depthTest:false,depthWrite:false})
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),fx))
  let width,height,dpr
  const span=1.64,dir=new T.Vector3(),focus=new T.Vector3(),vec=new T.Vector3(),center=new T.Vector3()
  const bounds=[]
  for(const x of [-.65,.65])for(const z of [-.50,.49])for(const y of [-.126,.02])bounds.push(new T.Vector3(x,y,z))
  for(const x of [-.651,.651])for(const y of [.015,.70])bounds.push(new T.Vector3(x,y,-.49))
  bounds.push(new T.Vector3(-.634,.414,.127))
  const roomBounds=bounds.length
  function arrangeRack(room,ratio){
    const compact=ratio<.8,angle=compact?Math.atan2(.67,1.65):0
    room.rack.position.set(compact?.48:0,0,compact?1.40:.67)
    room.rack.rotation.y=angle
    room.rackSpace.updateWorldMatrix(true,true)
  }
  let distance,shiftX,shiftY
  function layout(){
    width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.8)
    renderer.setPixelRatio(dpr);renderer.setSize(width,height,false)
    rt.setSize(Math.round(width*dpr),Math.round(height*dpr));fx.uniforms.pixel.value.set(1/rt.width,1/rt.height)
    hint.width=Math.round(width*dpr);hint.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)
    const ratio=width/height
    camera.aspect=ratio;camera.updateProjectionMatrix()
    dir.set(ratio<.8?.67:.81,ratio<.8?1.32:1.19,1.65).normalize()
    center.set(0,.18,.07)
    arrangeRack(current,ratio);if(next)arrangeRack(next,ratio)
    bounds.length=roomBounds
    for(const x of [-.55,.55])for(const y of [-.124,.047])for(const z of [.533,.805])
      bounds.push(current.rackSpace.localToWorld(new T.Vector3(x,y,z)))
    game.setSources(TileWorld.trays.map(x=>current.rackSpace.localToWorld(new T.Vector3(x-.052,.014,.68))))
    function measure(d){
      camera.position.copy(center).addScaledVector(dir,d);camera.lookAt(center);camera.updateMatrixWorld()
      let l=1e4,r=-l,b=l,t=-l
      for(const v of bounds){vec.copy(v).project(camera);l=Math.min(l,vec.x);r=Math.max(r,vec.x);b=Math.min(b,vec.y);t=Math.max(t,vec.y)}
      return {w:r-l,h:t-b,x:(r+l)/2,y:(t+b)/2}
    }
    let low=1.1,high=9
    for(let i=0;i<24;i++){const mid=(low+high)/2,m=measure(mid);if(m.w>(ratio<.8?1.89:1.83)||m.h>1.67)low=mid;else high=mid}
    distance=high;const fit=measure(high)
    shiftX=fit.x;shiftY=fit.y+(ratio<.8?.015:.052)
    cameraPose(game.read())
  }
  const smooth=x=>x*x*(3-2*x)
  function cameraPose(s){
    const travel=smooth(s.travel),connected=Math.min(s.stage,1)*.04
    focus.copy(center);focus.z-=span*travel
    camera.position.copy(focus).addScaledVector(dir,distance)
    camera.position.y+=connected+.29*Math.sin(Math.PI*travel)+.04*travel*(s.stage===0?1:s.stage===3?-1:0)
    camera.lookAt(focus);camera.updateMatrixWorld()
    camera.updateProjectionMatrix();camera.projectionMatrix.elements[8]+=shiftX;camera.projectionMatrix.elements[9]+=shiftY
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
    sun.target.position.z=-span*travel;sun.position.z=-1.4-span*travel
    grains.position.z=0
  }
  const chapterBar=document.querySelector('#chapters'), seals=[]
  for(let i=0;i<4;i++){
    const el=document.createElement('div'),c=Art.canvas(100);el.className='seal';el.append(c);chapterBar.append(el);seals.push(el)
  }
  function badge(i,active){
    const g=seals[i].firstChild.getContext('2d');g.clearRect(0,0,100,100);g.save();g.translate(50,50)
    const a=active?'#f6e6cb':'#856b83',b=active?'#d1b18f':'#a58b85'
    g.strokeStyle=a;g.fillStyle=b;g.lineWidth=3.2;g.lineCap='round';g.lineJoin='round'
    if(i===0)Art.flower(g,0,0,34,[a,b])
    if(i===1){
      g.rotate(-.52)
      for(let j=0;j<3;j++){g.beginPath();g.ellipse(0,1,23-j*6.2,31-j*8.5,.08*(j-1),0,7);g.stroke()}
      g.beginPath();g.moveTo(4,-29);g.lineTo(1,-13);g.stroke()
    }
    if(i===2){
      g.beginPath();g.moveTo(-30,25);g.lineTo(-30,-8);g.lineTo(0,-31);g.lineTo(30,-8);g.lineTo(30,25);g.closePath();g.stroke()
      for(const x of [-12,12]){g.beginPath();g.moveTo(x,23);g.lineTo(x,-8);g.lineTo(0,-30);g.stroke()}
      g.beginPath();g.moveTo(-28,-7);g.lineTo(28,-7);g.stroke()
    }
    if(i===3){
      Art.flower(g,3,-10,21,[a,b]);g.beginPath();g.moveTo(3,6);g.quadraticCurveTo(9,22,-7,34);g.stroke()
      Art.leaf(g,3,23,-1,23,7,a);Art.leaf(g,4,16,1,18,6,b)
    }
    g.restore()
  }
  let badgeStage=-1
  function chapters(stage){if(badgeStage===stage)return;badgeStage=stage
    seals.forEach((el,i)=>{el.className='seal'+(i===stage?' current':i<stage?' past':'');badge(i,i===stage)})
  }
  let audio=null,enabled=true
  const button=document.querySelector('.sound')
  function soundIcon(){
    const g=button.firstChild.getContext('2d');g.clearRect(0,0,80,80);g.fillStyle='#765d73';g.strokeStyle='#765d73';g.lineWidth=4.2;g.lineJoin='round';g.lineCap='round'
    g.beginPath();g.moveTo(14,33);g.lineTo(26,33);g.lineTo(41,20);g.lineTo(41,60);g.lineTo(26,48);g.lineTo(14,48);g.closePath();g.fill()
    if(enabled){for(const r of [15,24]){g.beginPath();g.arc(35,40,r,-.84,.84);g.stroke()}}
    else{g.beginPath();g.moveTo(53,34);g.lineTo(65,47);g.moveTo(65,34);g.lineTo(53,47);g.stroke()}
    button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'音を消す':'音を出す')
  }
  function wake(){
    if(!enabled)return
    const AC=window.AudioContext||window.webkitAudioContext
    if(!AC)return
    if(!audio)audio=new AC()
    if(audio.state==='suspended')audio.resume().catch(()=>{})
  }
  function note(hz,duration,volume,type='sine',delay=0,end=.82){
    if(!enabled||!audio||audio.state!=='running')return
    const t=audio.currentTime+delay,osc=audio.createOscillator(),gain=audio.createGain()
    osc.type=type;osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(hz*end,t+duration)
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+duration)
    osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+duration+.014)
    osc.onended=()=>{osc.disconnect();gain.disconnect()}
  }
  function listen(s){
    for(const e of game.drain()){
      if(e.type==='lift')note(490,.095,.018,'sine',0,1.24)
      if(e.type==='click'){
        const hz=e.frequencyHz,v=e.strength*.105
        if(e.material==='wood'){note(hz,.125,v,'sine',0,.78);note(hz*2.7,.053,v*.32,'sine')}
        else{note(hz,.12,v*.69,'triangle',0,.87);note(hz*(e.material==='stone'?1.62:2.41),e.material==='stone'?.067:.26,v*.29)}
        if(e.hapticMs&&navigator.vibrate)navigator.vibrate(e.hapticMs)
      }
      if(e.type==='complete')for(const [i,f] of [392,493.88,587.33,783.99].entries())note(f,.59,.042,'sine',.21+i*.12,1)
      if(e.type==='drop')note(670,.083,.012,'sine',0,1.25)
      if(e.type==='depart')note(294,.65,.033,'sine',0,1.5)
    }
  }
  button.addEventListener('click',()=>{enabled=!enabled;soundIcon();if(enabled){wake();note(660,.15,.042)}})
  soundIcon()
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x))
  const tableColor=new T.Color('#a582ab'),sunsetColor=new T.Color('#bd9b93'),whiteSun=new T.Color('#faf6ee'),morningSun=new T.Color('#ffeed1'),lateSun=new T.Color('#ffd2a1')
  let reflections=null
  function captureReflection(room){
    const target=new T.WebGLCubeRenderTarget(64,{type:T.UnsignedByteType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter})
    const cube=new T.CubeCamera(.018,15,target);cube.position.set(.035,.10,.0)
    const auto=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false
    cube.update(renderer,scene);renderer.shadowMap.autoUpdate=auto
    const maker=new T.PMREMGenerator(renderer),map=maker.fromCubemap(target.texture);maker.dispose();target.dispose()
    if(reflections)reflections.dispose()
    reflections=map
    for(const cell of room.cells){cell.finish.envMap=map.texture;cell.finish.needsUpdate=true}
    for(const m of [p.gold,p.goldLight,p.glass,p.water]){m.envMap=map.texture;m.needsUpdate=true}
  }
  function removeRoom(room){
    world.remove(room.root)
    room.root.traverse(o=>{
      if(o.geometry?.userData.baked)o.geometry.dispose()
    })
    for(const c of room.cells)c.finish.dispose()
    for(const l of room.lanterns)l.m.dispose()
    if(room.water)for(const ring of room.water.rings)ring.geometry.dispose()
  }
  function stageScene(s){
    if(s.stage!==current.stage){
      const old=current
      current=next||M.room(world,s.stage);current.root.position.set(0,0,0)
      if(!next)trackRoom(current)
      next=null;removeRoom(old);captureReflection(current);tableDetails.visible=true
    }
    if(s.departing&&!next){
      next=M.room(world,(s.stage+1)%4);trackRoom(next);next.root.position.z=-span
    }
    if(next){
      const travel=smooth(s.travel)
      // The two cabinet platforms pass at different heights during the doorway crossing.
      current.root.position.y=-smooth(clamp((travel-.16)/.72,0,1))*.90
      next.root.position.y=-(1-smooth(clamp(travel/.61,0,1)))*.82
      tableDetails.visible=travel<.24
    }
  }
  function drawRoom(s){
    stageScene(s);chapters(s.stage);cameraPose(s)
    current.door.rotation.y=s.door
    if(s.door>1.20 && !current.openReflection && !s.departing){
      current.openReflection=true;captureReflection(current)
    }
    current.branches.forEach((g,i)=>{g.rotation.z=s.pressure[i%6].angle;g.rotation.x=s.pressure[(i+2)%6].angle*.53})
    current.bells.forEach((g,i)=>{g.rotation.z=s.chimes[i].angle;g.rotation.x=s.pressure[i].angle*.32})
    const loft=current.root.position.y
    let groundHeat=0
    for(const cell of s.cells){
      const {q,finish}=current.cells[cell.id];q.visible=cell.placed;q.position.y=.007+cell.height
      const warm=s.stage===3?clamp((cell.heat-19)/13,0,1):0,wet=cell.wet
      groundHeat+=warm/48
      finish.color.setRGB(1-wet*.30,1-wet*.30-warm*.13,1-wet*.25-warm*.25)
      finish.roughness=s.stage===0?.41-.225*cell.light:s.stage===1?.56:Math.max(.12,.75-wet*.83)
      finish.envMapIntensity=.59+cell.light*.34+wet*.7
    }
    for(let i=0;i<current.seams.length;i++){
      const {q,horizontal}=current.seams[i];if(!q)continue
      const fill=s.seams[i].fill;q.visible=fill>.002
      if(horizontal)q.scale.x=.144*fill;else q.scale.z=.144*fill
    }
    current.drawers.forEach(({q,top},i)=>{
      const active=TileWorld.types[i]===s.material
      q.rotation.z=s.drawers[i].angle;top.rotation.z=q.rotation.z
      top.visible=!(active&&s.hand)
      top.position.y=.014+(active&&!s.done?s.sourceLift:0)
    })
    held.forEach((q,i)=>{
      const h=s.hand;q.visible=!!h&&h.type===TileWorld.types[i]
      if(q.visible){q.position.set(h.x,h.y+loft,h.z);q.rotation.set(clamp(h.vz*.065,-.09,.09),0,-clamp(h.vx*.074,-.12,.12))}
    })
    const target=s.cells.find(c=>!c.placed)
    inlay.visible=!!target&&!s.departing
    if(target){
      inlay.position.set(target.x,.0085+loft,target.z)
      inlayMaterial.emissiveIntensity=.26+Math.max(0,s.pressure[target.id%6].angle)*2+(s.hand?.18:0)
    }
    for(let i=0;i<s.dust.length;i++){
      const q=s.dust[i];dummy.position.set(q.x,q.y+loft,q.z)
      const r=.00070+(i%5)*.00018;dummy.scale.set(r,r*.81,r);dummy.updateMatrix();grains.setMatrixAt(i,dummy.matrix)
    }
    grains.instanceMatrix.needsUpdate=true;grains.frustumCulled=false
    liquid.count=s.drips.length
    s.drips.forEach((q,i)=>{dummy.position.set(q.x,q.y+loft,q.z);dummy.scale.set(.0033,.0037+Math.abs(q.vy)*.004,.0033);dummy.updateMatrix();liquid.setMatrixAt(i,dummy.matrix)})
    liquid.instanceMatrix.needsUpdate=true;liquid.frustumCulled=false
    if(current.water){
      current.water.can.rotation.z=-s.spout
      const geo=current.water.surface.geometry,pos=geo.attributes.position
      pos.setY(0,s.water[0].h)
      for(let i=1;i<pos.count;i++){const band=Math.floor((i-1)/32);pos.setY(i,s.water[band].h*(band===6?.36:1))}
      pos.needsUpdate=true;geo.computeVertexNormals()
      current.water.rings.forEach((r,i)=>{r.position.y=.0643+s.water[i].h*(i===6?.36:1);r.scale.setScalar(1+s.water[i].h*6)})
    }
    current.lanterns.forEach((l,i)=>{
      const lamp=s.lanterns[i];l.m.emissiveIntensity=.11+(lamp.temperature-20)*.14
      l.petals.forEach((hinge,j)=>hinge.rotation.x=lamp.petals[j].angle)
    })
    tableMat.color.copy(tableColor).lerp(sunsetColor,groundHeat)
    sun.color.copy(s.stage===2?whiteSun:morningSun).lerp(lateSun,Math.min(1,groundHeat*1.7))
    sun.position.y=3.8-groundHeat*2.4
  }
  function screen(x,y,z){
    vec.set(x,y,z).project(camera);return {x:(vec.x+1)*width/2,y:(1-vec.y)*height/2}
  }
  function handDrawing(x,y,alpha,scale){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(-.24);ctx.globalAlpha=alpha
    ctx.fillStyle='#fff4dd';ctx.strokeStyle='#8a7484';ctx.lineWidth=1.65;ctx.lineJoin='round';ctx.shadowColor='#5440574f';ctx.shadowBlur=6;ctx.shadowOffsetY=2
    ctx.beginPath();ctx.moveTo(-3,12);ctx.lineTo(-3,1);ctx.bezierCurveTo(-3,-4,3,-4,3.3,1)
    ctx.lineTo(4,15);ctx.lineTo(4.4,9);ctx.bezierCurveTo(5,5.2,10.2,6,10.8,10);ctx.lineTo(11.3,15)
    ctx.lineTo(12,11);ctx.bezierCurveTo(12.7,7.5,17.4,8.5,18,12.3);ctx.lineTo(18.5,17)
    ctx.quadraticCurveTo(21,10,24,15);ctx.bezierCurveTo(26,20,26,28,22,33);ctx.lineTo(19,38);ctx.lineTo(6,38)
    ctx.quadraticCurveTo(3,32,-1,29);ctx.lineTo(-9,21);ctx.bezierCurveTo(-14,16,-10,12,-6.5,15);ctx.lineTo(-2.6,18);ctx.closePath()
    ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.stroke()
    ctx.strokeStyle='#c1a49b';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(6,34);ctx.quadraticCurveTo(14,36,21,33);ctx.stroke()
    ctx.restore()
  }
  function guide(s){
    ctx.clearRect(0,0,width,height)
    if(s.idle<4||s.guideRest>0||s.departing)return
    const phase=s.guide,alpha=Math.min(clamp(phase/.10,0,1),clamp((1.25-phase)/.18,0,1))*.87
    if(alpha<.01)return
    let a,b
    if(s.done){a=b=screen(s.stage===3?.31:.195,s.stage===3?.163:.34,-.39)}
    else {
      const c=s.cells.find(c=>!c.placed),idx=TileWorld.types.indexOf(s.material)
      if(!c)return
      const source=current.drawers[idx].top.getWorldPosition(new T.Vector3())
      a=s.hand?screen(s.hand.x,s.hand.y+.013,s.hand.z):screen(source.x,source.y+.02,source.z)
      b=screen(c.x,.02,c.z)
    }
    const f=smooth(clamp((phase-.17)/.72,0,1)),arc=Math.sin(Math.PI*f),x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f-arc*Math.min(32,height*.034)
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#fff0ca';ctx.lineWidth=1.7
    ctx.beginPath();ctx.ellipse(x,y,7+Math.min(phase,.16)*30,3.9+Math.min(phase,.16)*18,-.09,0,7);ctx.stroke();ctx.restore()
    handDrawing(x,y,alpha,width<600?.83:1.04)
  }
  const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-.014),hit=new T.Vector3()
  function rayAt(e){pointer.set(e.clientX/width*2-1,1-e.clientY/height*2);ray.setFromCamera(pointer,camera)}
  function floorPoint(e){rayAt(e);return ray.ray.intersectPlane(plane,hit)?hit:null}
  function cellAt(x,z){
    const col=Math.floor((x+.600)/.15),row=Math.floor((z+.45)/.15)
    return col<0||col>=8||row<0||row>=6?-1:row*8+col
  }
  const pickBox=new T.Box3(),va=new T.Vector3(),vb=new T.Vector3()
  function intersects(x1,y1,z1,x2,y2,z2){pickBox.set(va.set(x1,y1,z1),vb.set(x2,y2,z2));return ray.ray.intersectsBox(pickBox)}
  let contact=null
  canvas.addEventListener('pointerdown',e=>{
    if(contact||e.button!==0)return
    const s=game.read();if(s.departing)return
    const pt=floorPoint(e);if(!pt)return
    const trayRay=ray.ray.clone().applyMatrix4(current.rackSpace.matrixWorld.clone().invert())
    const cell=cellAt(pt.x,pt.z),drawer=TileWorld.trays.findIndex(x=>trayRay.intersectsBox(pickBox.set(va.set(x-.172,-.115,.536),vb.set(x+.172,.049,.805))))
    let action
    if(drawer>=0){
      const ok=game.pick(TileWorld.types[drawer]);action=ok?'source':'quiet'
    }else if(s.hand&&cell>=0){action='carry';game.move(pt.x,pt.z)}
    else if(s.done&&intersects(.13,.0,-.5,.52,s.stage===3?.28:.58,-.27)){action='door'}
    else if(s.stage===2&&intersects(-.60,.035,-.39,-.314,.34,-.201)){action='pour'}
    else if(s.stage===1&&intersects(-.405,.17,-.39,-.04,.49,-.32)){action='chime'}
    else if(s.stage===3&&current.lanterns.some(l=>intersects(l.q.position.x-.03,.09,-.414,l.q.position.x+.03,.226,-.35))){action='lamp'}
    else if(cell>=0 && s.cells[cell].placed && s.stage>0){action='floor'}
    else if(intersects(.155,.02,-.47,.48,.55,-.395)){action='quietDoor'}
    else return
    wake();game.touch();contact={id:e.pointerId,x:e.clientX,y:e.clientY,action,cell,moved:false}
    canvas.setPointerCapture(e.pointerId);e.preventDefault()
  })
  canvas.addEventListener('pointermove',e=>{
    if(!contact||contact.id!==e.pointerId||!['source','carry'].includes(contact.action))return
    const moved=Math.hypot(e.clientX-contact.x,e.clientY-contact.y)>4
    if(!moved&&!contact.moved)return
    contact.moved=true;const pt=floorPoint(e)
    if(pt && game.read().hand)game.move(pt.x,pt.z)
  })
  function endContact(e,cancel=false){
    if(!contact||contact.id!==e.pointerId)return
    const c=contact,s=game.read();contact=null
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)
    if(cancel){game.release(false);return}
    const pt=floorPoint(e)
    if(c.action==='source'||c.action==='carry'){
      if(s.hand){
        if(pt&&(c.moved||c.action==='carry')){
          const id=cellAt(pt.x,pt.z)
          // A second tap selects a whole socket. A drag retains the five-centimetre capture radius.
          if(c.action==='carry'&&!c.moved&&id>=0&&!s.cells[id].placed)game.tapCell(id)
          else {game.move(pt.x,pt.z);game.release()}
        }else game.release(true)
      }
    }else if(c.action==='door'||c.action==='quietDoor')game.tapFeature()
    else if(c.action==='pour')game.tapFeature('spout')
    else if(c.action==='floor')game.tapCell(c.cell)
    else if(c.action==='chime'){
      rayAt(e);const pnt=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),.354),hit)
      if(pnt)game.tapCell(clamp(Math.round((pnt.x+.22)/.061)+2,0,4))
    }else if(c.action==='lamp'){
      const k=current.lanterns.findIndex(l=>intersects(l.q.position.x-.03,.09,-.414,l.q.position.x+.03,.226,-.35))
      if(k>=0)game.tapCell(k*2)
    }
  }
  canvas.addEventListener('pointerup',e=>endContact(e))
  canvas.addEventListener('pointercancel',e=>endContact(e,true))
  canvas.addEventListener('lostpointercapture',e=>endContact(e,true))
  canvas.addEventListener('contextmenu',e=>e.preventDefault())
  window.addEventListener('resize',layout)
  layout();captureReflection(current)
  let previous=null
  document.addEventListener('visibilitychange',()=>{previous=null;if(document.hidden&&contact){contact=null;game.release()}})
  function frame(now){
    requestAnimationFrame(frame)
    if(document.hidden)return
    const dt=previous===null?0:clamp((now-previous)/1000,0,.075);previous=now
    game.step(dt)
    const s=game.read();listen(s);drawRoom(s)
    renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCam)
    guide(s)
  }
  requestAnimationFrame(frame)
})()
