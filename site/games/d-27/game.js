(function () {
  'use strict';
  const T=THREE, sim=Tanada.create(), s=sim.state, audio=new TerraceAudio(), canvas=document.getElementById('world');
  window.__GAME__={step:sim.step,getState:sim.getState};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;
  const scene=new T.Scene(), world=terraceLandscape(scene,renderer),m=world.models;
  renderer.shadowMap.autoUpdate=false;
  let lastShadow=-1;
  const cam=new T.PerspectiveCamera(35,1,.08,180);
  const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=Tanada.clamp,TAU=Math.PI*2;
  const dummy=new T.Object3D(),target=V(),projected=V(), pointer={id:null,kind:null,startY:0,position:0};
  const hand=document.getElementById('hand'),sound=document.getElementById('sound'),stops=[...document.querySelectorAll('.stop')];
  // Tone-map once after gathering a small amount of nearby highlight light.
  const buffer=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
  const ppScene=new T.Scene(),ppCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const pp=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frame:{value:buffer.texture},px:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame;uniform vec2 px;varying vec2 uv0;
      vec3 glow(vec2 d){vec3 c=texture2D(frame,uv0+d*px).rgb;return c*smoothstep(.91,2.2,max(c.r,max(c.g,c.b)));}
      void main(){vec3 c=texture2D(frame,uv0).rgb;
      c+=.013*(glow(vec2(3.,2.))+glow(vec2(-3.,-2.))+glow(vec2(2.,-4.))+glow(vec2(-2.,4.)));
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.007;
      }`});
  ppScene.add(new T.Mesh(new T.PlaneGeometry(2,2),pp));
  let width=1,height=1,distance=17.7,eyeHeight=5.7,lookHeight=2.49,portrait=0,currentMark=-1;
  function resize(){
    width=canvas.clientWidth||window.innerWidth;height=canvas.clientHeight||window.innerHeight;
    const asp=width/height,ratio=Math.min(window.devicePixelRatio||1,Math.min(1.65,Math.sqrt(1650000/(width*height))));
    renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);buffer.setSize(Math.round(width*ratio),Math.round(height*ratio));
    pp.uniforms.px.value.set(1/(width*ratio),1/(height*ratio));cam.aspect=asp;cam.updateProjectionMatrix();
    portrait=clamp((1.12-asp)/.66);
    world.root.scale.x=1-.34*portrait;
    distance=Math.max(17.7,(10.48*world.root.scale.x)/(2*Math.tan(17.5*Math.PI/180)*asp)+2.4);
    eyeHeight=5.70+portrait*2.35;lookHeight=2.48+.10*portrait;
    updateCamera();
  }
  function updateCamera(){
    const c=s.camera,shift=c/3;
    cam.position.set(1.16-.46*shift,eyeHeight-.70*shift,distance+.38*shift);
    cam.lookAt(.06+.11*shift,lookHeight-1.20*shift,.19+1.36*shift);cam.updateMatrixWorld();
    world.root.updateMatrixWorld(true);
  }
  function screen(local){projected.copy(local);world.root.localToWorld(projected);projected.project(cam);return {x:(projected.x*.5+.5)*width,y:(.5-projected.y*.5)*height};}
  function rowTarget(row){const n=s.shoots.findIndex(p=>p.row===row&&!p.planted);return m.shootP[n>=0?n:row*7+3].clone().add(V(0,.15,0));}
  function nextRow(){const p=s.shoots.find(x=>!x.planted);return p?p.row:3;}
  function activePoint(){
    if(s.phase===0)return target.copy(m.soilAnchor).add(V(0,.23,.01));
    if(s.phase===1)return target.copy(m.gate.position).add(V(0,.43,0));
    if(s.phase===2)return target.copy(m.wheelAnchor).add(V(0,.02,.08));
    if(s.phase===3)return target.copy(rowTarget(nextRow()));
    return target.copy(m.frogs[Math.floor(s.evening/6)%3].group.position).add(V(0,.13,.05));
  }
  function waiting(){return (s.phase===0&&s.soil.every(p=>p.mass<.031))||(s.phase===1&&s.gate.latch>.97)||(s.phase===2&&s.wheel.twig<.035)||(s.phase===3&&s.planted===28);}
  function aim(x,y){
    const kind=sim.active(),opts=[];
    function add(p,r,pos,kind){const q=screen(p);const d=Math.hypot(x-q.x,y-q.y);
      if(d<=r)opts.push({d:d/r,pos,kind});}
    const radius=clamp(height*1.52/(distance+.8),30,65);
    if(s.phase===0){m.clods.forEach((p,i)=>add(p.position.clone().add(V(0,.15,0)),radius*.89,i/5,kind));
      add(m.shovel.position.clone().add(V(.24,.57,.10)),radius,.5,kind);}
    if(s.phase===1)add(m.gate.position.clone().add(V(0,.37,0)),radius*1.05,.5,kind);
    if(s.phase===2)add(m.wheelAnchor,radius*1.14,.5,kind);
    if(s.phase===3){
      m.shootP.forEach((p,i)=>{const row=s.shoots[i].row;if(s.shoots.some(a=>a.row===row&&!a.planted))add(p.clone().add(V(0,.09,0)),Math.max(22,radius*.48),(row+.5)/4,kind);});
      add(m.tray.position,radius*.74,(nextRow()+.5)/4,kind);
    }
    if(s.phase===4)m.frogs.forEach((f,i)=>add(f.group.position,radius*.75,(i+.5)/3,kind));
    return opts.sort((a,b)=>a.d-b.d)[0];
  }
  canvas.addEventListener('pointerdown',e=>{
    if(pointer.id!==null)return;audio.unlock();
    const hit=aim(e.clientX,e.clientY);if(!hit)return;
    if(sim.press(hit.kind,hit.pos)){pointer.id=e.pointerId;pointer.kind=hit.kind;pointer.startY=e.clientY;pointer.position=hit.pos;canvas.setPointerCapture(e.pointerId);}
  });
  canvas.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer.id)return;
    const hit=aim(e.clientX,e.clientY);
    // A captured sluice handle can be lifted one-handed. A tap also advances its catch.
    if(pointer.kind==='gate'){sim.move(.5,clamp(.65+(pointer.startY-e.clientY)/48,.45,1.5));return;}
    if(hit&&hit.kind===pointer.kind){pointer.position=hit.pos;sim.move(hit.pos,1+Math.min(.4,Math.hypot(e.movementX||0,e.movementY||0)*.025));}
    else if(!hit)sim.release();
    if(hit&&!s.input&&hit.kind===pointer.kind)sim.press(hit.kind,hit.pos,.72);
  });
  function up(e){if(e.pointerId!==pointer.id)return;sim.release();pointer.id=null;pointer.kind=null;}
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
  window.addEventListener('blur',()=>{sim.release();pointer.id=null;});
  sound.addEventListener('click',()=>{
    const first=!audio.ctx;
    audio.unlock();audio.enabled=first||!audio.enabled;
    sound.setAttribute('aria-pressed',String(audio.enabled));
  });
  const dawnSun=new T.Color('#fff0cc'),eveSun=new T.Color('#ffbb83'),dayAir=new T.Color('#d9eaec'),eveAir=new T.Color('#a8b1c9');
  const morningMist=new T.Color('#dce2d1'),duskMist=new T.Color('#d5aba0'),dry=new T.Color('#92704d'),wet=new T.Color('#584c39');
  function water(){
    world.waters.forEach((o,i)=>{
      const u=world.waterUniforms[i],f=s.fields[i-1],c=s.channels[Math.max(0,i-1)];
      u.uWaterTravel.value=i===0?s.spring.pulse*4:f.ripple[0]*35+c.travel*.58+s.spring.pulse*(.49+.15*i);
      u.uWave.value=(i===0?s.spring.velocity:f.ripple[3])*.5;u.uWind.value=s.wind[Math.max(0,i-1)];
      const pos=o.geometry.attributes.position,[cx,y,,rx]=world.defs[i];
      if(i===0){o.position.y=.202+(s.spring.head-.34)*.59;return;}
      for(let j=0;j<pos.count;j++){
        const t=clamp((pos.getX(j)-cx)/(rx*1.8)+.5)*6,k=Math.min(5,Math.floor(t)),frac=t-k;
        const at=i%2===0?6-k:k,bt=i%2===0?5-k:k+1;
        pos.setY(j,y-.135+(f.h[at]+f.ripple[at])*(1-frac)+(f.h[bt]+f.ripple[bt])*frac);
      }pos.needsUpdate=true;
    });
    for(let i=0;i<4;i++){
      const c=s.channels[i],{fall,side,width:w}=m.falls[i],{p,q,dest}=m.outlets[i],pos=fall.geometry.attributes.position;
      const amount=clamp(c.q/.045),destY=world.defs[i+1][1]-.134+s.fields[i].h[0];
      fall.visible=c.q>.00045;
      if(fall.visible){
        for(let j=0;j<=26;j++){
          const v=j/26,air=clamp((v-.49)/.51),run=Math.min(1,v/.49);
          const x=p.x+(q.x-p.x)*run+(dest.x-q.x)*air,z=p.z+(q.z-p.z)*run+(dest.z-q.z)*air;
          const y=p.y+.022+(q.y-p.y)*run-(q.y-destY)*air*air;
          for(let k=0;k<=11;k++){const u=k/11,d=(u-.5)*2*w*amount**.55*(.82+.085*Math.sin(v*13+c.travel*4));
            pos.setXYZ(j*12+k,x+side.x*d,y+.015*Math.sin(u*17-v*16+c.travel*4)*amount,z+side.z*d);}
        }
        pos.needsUpdate=true;fall.geometry.computeVertexNormals();
      }
      m.falls[i].current.value=c.travel;
      const drops=m.drops[i];drops.count=c.spray.length;
      for(let j=0;j<drops.count;j++){
        const drop=c.spray[j];
        dummy.position.set(dest.x+drop.x,destY+drop.y,dest.z+drop.z);
        dummy.scale.set(drop.size,drop.size*(1+Math.abs(drop.vy)*.30),drop.size);dummy.rotation.set(0,0,0);dummy.updateMatrix();drops.setMatrixAt(j,dummy.matrix);
      }drops.instanceMatrix.needsUpdate=true;
    }
    m.rings.forEach((r,i)=>{
      const f=(s.spring.pulse*7.8+i*.25)%1,rad=.043+f*.49;
      r.scale.set(rad,rad,(1-f)*.8+.07);r.position.copy(m.sp).add(V(0,-.62+.097+(s.spring.head-.34)*.6,.04));r.visible=f<.91;
    });m.springThread.scale.x=1+3*s.spring.velocity;m.springThread.scale.z=m.springThread.scale.x;
  }
  function objects(){
    const anchor=m.soilAnchor;
    m.clods.forEach((o,i)=>{const p=s.soil[i],fraction=p.mass/p.original;
      o.scale.set(.38+.62*Math.sqrt(fraction),fraction,.32+.68*fraction);o.visible=p.mass>.001;
      o.rotation.z=p.force*.17*(i%2?1:-1);m.mudMats[i].color.copy(dry).lerp(wet,p.wet);m.mudMats[i].roughness=.91-.39*p.wet;});
    const work=s.gritCount*.18+s.bedFlux*3;
    m.shovel.position.copy(anchor).add(V(.05+(s.tool.at-2.5)*.078,.25-s.tool.depth+.08*Math.sin(work)*Math.min(1,s.bedFlux*6),.049));
    m.shovel.rotation.set(.20+.18*s.tool.depth,-.15,-.46+.32*s.tool.depth+.035*Math.sin(work));
    m.shovel.position.lerp(anchor.clone().add(V(-.56,.06,.08)),s.tool.park);m.shovel.rotation.z+=(-.70-m.shovel.rotation.z)*s.tool.park;
    const count=Math.min(s.grit.length,100);m.soilParticle.count=count;
    for(let j=0;j<count;j++){const p=s.grit[j];dummy.position.copy(anchor).add(V(p.x,p.y,p.z));dummy.rotation.set(p.z*6,p.x*7,p.y*3);
      dummy.scale.set(p.size,p.size*.73,p.size*.82);dummy.updateMatrix();m.soilParticle.setMatrixAt(j,dummy.matrix);}m.soilParticle.instanceMatrix.needsUpdate=true;
    m.gate.position.y=m.outlets[1].p.y+s.gate.lift;
    m.rotor.rotation.z=-s.wheel.angle;m.twig.rotation.z=(1-s.wheel.twig)*1.7;m.twig.position.y=-.28-(1-s.wheel.twig)*.38;
    m.tray.position.y=world.defs[3][1]-.063+s.fields[2].level;m.tray.rotation.z=s.fields[2].ripple[1]*1.6+s.wind[2]*.038;
    m.shoots.forEach((o,i)=>{const p=s.shoots[i];o.visible=p.height>.002;o.scale.set(.7+p.height*1.7,p.height*3.5,.7+p.height*1.7);o.rotation.z=p.bend;o.rotation.y=i*.71;});
    m.frogs.forEach((o,i)=>{const f=s.frogs[i];o.throat.scale.set(.070+f.voice*.043,.037+f.voice*.068,.046+f.voice*.061);o.group.rotation.x=f.voice*.08;});
    m.fireflies.forEach((o,i)=>{const p=s.motes[i];o.position.set(-4.15+8.2*((i*.618)%1)+(p.x-.5)*.97,.17+p.y*.93+.048*i,-.56+(i%5)*1.18+p.z*.65);
      const r=s.dusk*.023*p.glow;o.visible=r>.002;o.scale.setScalar(r);});
  }
  function guide(){
    const show=s.phase<5&&!waiting(),p=activePoint(),f=s.spring.pulse;
    m.beacon.visible=show;
    m.beacon.position.copy(p);m.beacon.position.y-=s.phase===2?.53:s.phase===1?.30:s.phase===3?.055:.105;
    m.beacon.scale.setScalar(s.phase===2?1.60:s.phase===4?.67:1.03);m.beacon.rotation.y=f*.49;
    m.pollen.forEach((o,i)=>{o.visible=show;if(!show)return;const a=i*2.399+f*.83,up=(f*.83+i*.143)%1;
      o.position.copy(p).add(V(Math.cos(a)*(.32+.08*up),.03+up*.52,Math.sin(a)*.24));o.scale.setScalar(.012+.009*Math.sin(up*Math.PI));});
    const pos=screen(p);
    const gesture=(s.idle>3.8?((s.idle-3.8)%2.9)/2.9:0),reach=Math.sin(Math.PI*clamp(gesture*1.6));
    hand.style.opacity=String(show?s.hint*(.39+.49*reach):0);
    const dx=s.phase===2?9*Math.sin(gesture*TAU):s.phase===3?19*gesture:0;
    hand.style.transform='translate('+ (pos.x+2+dx+(1-reach)*8)+'px,'+(pos.y-3+(1-reach)*11-(s.phase===1?reach*16:0))+'px) rotate(-17deg) scale('+(1.01-.08*reach)+')';
    const mark=s.phase===0?0:s.phase===1?1:s.phase<4?2:s.phase===4?3:0;
    if(mark!==currentMark){currentMark=mark;stops.forEach((b,i)=>{b.classList.toggle('selected',i===mark);b.classList.toggle('done',i<mark);});}
  }
  function draw(){
    updateCamera();water();objects();guide();
    if(s.dusk>.008)world.captureEvening();
    if(s.time-lastShadow>.085){renderer.shadowMap.needsUpdate=true;lastShadow=s.time;}
    world.breeze.value.fromArray(s.wind);world.dusk.value=s.dusk;world.sun.color.copy(dawnSun).lerp(eveSun,s.dusk);world.sun.intensity=2.15-s.dusk*.85;
    world.sun.position.set(-10-s.dusk*4,15-s.dusk*8,-6+s.dusk*2);world.hemi.color.copy(dayAir).lerp(eveAir,s.dusk);
    world.hemi.intensity=1.48-s.dusk*.39;scene.fog.color.copy(morningMist).lerp(duskMist,s.dusk);
    renderer.setRenderTarget(buffer);renderer.render(scene,cam);renderer.setRenderTarget(null);renderer.render(ppScene,ppCamera);
  }
  resize();window.addEventListener('resize',resize);
  let last=0;
  function frame(now){
    const elapsed=last?Math.min(.12,(now-last)/1000):0;last=now;
    if(!document.hidden){sim.step(elapsed);draw();audio.update(s);}
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){sim.release();pointer.id=null;if(audio.ctx)audio.ctx.suspend().catch(()=>{});}else if(audio.ctx&&audio.enabled)audio.ctx.resume().catch(()=>{});});
  requestAnimationFrame(frame);
})();
