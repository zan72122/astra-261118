'use strict';
(()=>{
  const {T,pi,tau,v,group,mesh,mat,phys,button,shadow}=Craft;
  const canvas=document.getElementById('room'),sim=ButtonWorkshop.make(1834,innerWidth/innerHeight<.77),s=sim.s;
  window.__GAME__={step:sim.step,getState:sim.getState};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.09;
  const scene=new T.Scene();scene.background=new T.Color(0xd9e8e7);scene.fog=new T.Fog(0xe7e8d8,10,36);
  const camera=new T.PerspectiveCamera(26,1,.1,100),environment=WorkshopScene.sky();scene.environment=environment;scene.environmentIntensity=.61;
  const hemi=new T.HemisphereLight(0xe6f3ff,0xc9a078,1.30);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffecc9,3.0);sun.position.set(-5.2,7.6,-5.4);sun.target.position.set(-.13,0,.22);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5.4,right:5.4,top:5.4,bottom:-5.4,near:.3,far:22});
  sun.shadow.bias=-.00032;sun.shadow.normalBias=.012;sun.shadow.radius=3;scene.add(sun,sun.target);
  const room=WorkshopScene.buildRoom(group(scene)),root=group(scene),shelves=new Map();
  const moteGeo=new T.SphereGeometry(1,6,4),motes=new T.InstancedMesh(moteGeo,mat(0xffe9bd,.56,0,{transparent:true,opacity:.52,depthWrite:false}),s.dust.length);
  const dummy=new T.Object3D();scene.add(motes);
  const ambientMoteScale=s.dust.map((p,i)=>.0028+.0022*(i%5)/4);
  const prismColors=[0xf2ba73,0x77bbc1,0xdba8ac,0xa5bc8b,0xcaabca,0xe4cf8c];
  let jar,tray,buttonNodes=[],hits=[],prisms=[],caustics=[],carryShadow,stageStamp='',lastStage=-1,reflection=null;
  let assembly;
  function captureSurroundings(){
    const target=new T.WebGLCubeRenderTarget(128,{type:frameTarget.texture.type,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
    const cube=new T.CubeCamera(.12,60,target);cube.position.set(s.jar.x,1.19,s.jar.z);
    const cards=group(scene),card=mat(0xf3ebdb,.77,0,{emissive:0xfff3dd,emissiveIntensity:2.7,side:T.DoubleSide});
    for(const [x,y,z,w,h] of [[-4.5,2.2,.32,1.06,3.5],[-4.5,2.2,1.59,1.06,3.5],[4.8,2.4,1.3,.63,3.6]]){
      const pane=mesh(cards,new T.PlaneGeometry(w,h),card,x,y,z);pane.rotation.y=pi/2;pane.castShadow=false;
    }
    jar.visible=false;const cast=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;
    cube.update(renderer,scene);renderer.shadowMap.autoUpdate=cast;jar.visible=true;
    const pm=new T.PMREMGenerator(renderer);reflection=pm.fromCubemap(target.texture);
    scene.environment=reflection.texture;scene.environmentIntensity=.83;
    jar.userData.vessel.material.envMap=reflection.texture;
    cards.removeFromParent();cards.children.forEach(p=>p.geometry.dispose());card.dispose();target.dispose();pm.dispose();
  }
  function buildPrism(c){
    prisms=[];caustics=[];
    // Repeated facets share a palette and a six-fold optical axis. Each facet rocks independently.
    const glint=group(jar);glint.position.set(0,c.h*.51,c.r*.82);glint.rotation.x=.03;glint.name='prism';
    const carpet=group(jar);carpet.position.set(.16,.069,.13);
    for(let i=0;i<18;i++){
      const tier=Math.floor(i/6),angle=(i%6)*tau/6+(tier%2)*pi/6;
      const col=prismColors[(tier*2+i%3)%6],m=phys(col,.19,{metalness:.13,clearcoat:1,emissive:col,emissiveIntensity:.18,transparent:true,opacity:0,depthWrite:false});
      const holder=group(glint);holder.rotation.z=angle;
      const gem=mesh(holder,new T.OctahedronGeometry(1),m,0,c.r*(.17+tier*.225),0);
      gem.scale.set(c.r*(.108+tier*.016),c.r*(.145+tier*.018),.086);gem.castShadow=false;
      prisms.push({holder,gem,angle});
      const cm=mat(col,.4,0,{emissive:col,emissiveIntensity:.83,transparent:true,opacity:0,depthWrite:false});
      const cast=group(carpet);cast.rotation.y=angle;
      const ray=mesh(cast,new T.OctahedronGeometry(1),cm,0,.004+tier*.003,c.r*(.83+.28*tier));
      ray.scale.set(.13+tier*.055,.006,.24+.10*tier);ray.castShadow=false;
      caustics.push({cast,ray,angle});
    }
  }
  const silkMats=[Craft.cloth(0xf3dfb6,1),Craft.cloth(0xa9bfba,1)];
  function parachute(parent){
    const sail=group(parent);
    for(let i=0;i<8;i++){
      const o=mesh(sail,new T.SphereGeometry(.315,5,6,i*tau/8,tau/8,0,pi*.53),silkMats[i%2],0,.49,0);
      o.scale.y=.57;o.material.side=T.DoubleSide;
      if(i%2===0){const a=i*tau/8;Craft.rod(sail,[0,.055,0],[.313*Math.sin(a),.476,.313*Math.cos(a)],.005,Craft.ivory);}
    }
    return sail;
  }
  function buildStage(){
    if(assembly)assembly.visible=false;
    stageStamp=s.serial+'-'+s.portrait;
    if(lastStage!==s.serial){stageBadge();lastStage=s.serial;}
    const key=s.chapter+'-'+s.portrait,stored=shelves.get(key);
    if(stored){
      ({assembly,jar,tray,hits,buttonNodes,carryShadow,prisms,caustics}=stored);
      jar.userData.vessel.material.envMap=reflection?reflection.texture:environment;
      assembly.visible=true;return;
    }
    assembly=group(root);const c=ButtonWorkshop.chapters[s.chapter];
    jar=WorkshopScene.makeJar(assembly,c,s.chapter);jar.position.set(s.jar.x,0,s.jar.z);
    // Real room reflections supply recognizable wood and sky, the broad window cards supply fine glints.
    jar.userData.vessel.material.envMap=reflection?reflection.texture:environment;jar.userData.vessel.material.envMapIntensity=1.12;
    tray=WorkshopScene.makeTray(assembly,s.chapter);tray.position.set(s.tray.x,0,s.tray.z);tray.scale.set(s.tray.scale,1,s.tray.scale);
    WorkshopScene.makeBridge(assembly,s.jar,s.tray,c,s.chapter);
    hits=[];buttonNodes=[];
    const proxyMat=mat(0xffffff);
    for(const b of s.bodies){
      const pivot=group(assembly),model=button(b.mat,b.variant);
      const finishes=new Map();
      model.traverse(o=>{
        if(!o.isMesh)return;
        if(!finishes.has(o.material)){
          const copy=o.material.clone();copy.emissive.setHex(prismColors[(b.id+2*b.mat)%6]);copy.emissiveIntensity=0;
          finishes.set(o.material,copy);
        }
        o.material=finishes.get(o.material);
      });
      pivot.add(model);model.scale.setScalar(b.r);
      const pick=mesh(pivot,new T.SphereGeometry(1,14,7),proxyMat);
      pick.scale.set(b.r*1.10,b.r*.39,b.r*1.10);pick.visible=false;pick.userData.button=b.id;hits.push(pick);
      const sail=s.chapter===3?parachute(pivot):null;
      buttonNodes.push({pivot,model,sail,pick,finishes:[...finishes.values()]});
    }
    for(const h of tray.userData.hit){h.userData.machine=true;hits.push(h);}
    carryShadow=shadow(assembly,0,.016,0,.82,.64,.18);
    buildPrism(c);shelves.set(key,{assembly,jar,tray,hits,buttonNodes,carryShadow,prisms,caustics});
  }
  function resize(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
    const ratio=Math.min(window.devicePixelRatio||1,1.8,Math.sqrt(3000000/(w*h)));
    renderer.transmissionResolutionScale=w<600?.66:.80;renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();sim.layout(w/h<.77);
    frameTarget.setSize(Math.max(1,Math.round(w*ratio)),Math.max(1,Math.round(h*ratio)));
    postMaterial.uniforms.pixel.value.set(1/frameTarget.width,1/frameTarget.height);
    room.runner.position.set(s.portrait?1.05:2.02,.025,s.portrait?2.12:1.61);
    room.spools.position.set(s.portrait?1.32:0,0,s.portrait?-1.25:0);
    room.branch.position.x=s.portrait?-2.32:-3.72;
    room.flowerpot.position.x=s.portrait?1.28:2.98;
  }
  // One linear-light pass adds a small highlight bloom before filmic output conversion.
  const frameTarget=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float')?T.HalfFloatType:T.UnsignedByteType,samples:renderer.capabilities.maxSamples>=2?2:0});
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const postMaterial=new T.ShaderMaterial({depthTest:false,depthWrite:false,
    uniforms:{frame:{value:frameTarget.texture},pixel:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame;uniform vec2 pixel;varying vec2 p;
    vec3 bright(vec2 at){vec3 c=texture2D(frame,at).rgb;return max(c-vec3(1.14),0.);}
    void main(){vec3 c=texture2D(frame,p).rgb;vec2 d=pixel*3.4;vec3 glow=bright(p+vec2(d.x,d.y))+bright(p-d)+bright(p+vec2(-d.x,d.y))+bright(p+vec2(d.x,-d.y));
    c+=glow*.023;gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float n=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);gl_FragColor.rgb+=(n-.5)*.006;
    }`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMaterial));
  function stageBadge(){
    const c=document.getElementById('chapters'),g=c.getContext('2d');g.setTransform(3,0,0,3,0,0);g.clearRect(0,0,120,42);
    function rounded(x,y,w,h,r){
      g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);
      g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
    }
    g.fillStyle='#eee4cc';g.strokeStyle='#a79776';g.lineWidth=.8;
    g.beginPath();rounded(1.5,2,117,37,17);g.fill();g.stroke();
    g.save();g.clip();g.globalAlpha=.17;g.lineWidth=.33;g.strokeStyle='#998768';
    for(let i=0;i<120;i+=2){g.beginPath();g.moveTo(i,0);g.lineTo(i+2,42);g.stroke();}
    for(let i=0;i<42;i+=2){g.beginPath();g.moveTo(0,i);g.lineTo(120,i+1);g.stroke();}g.restore();
    g.strokeStyle='#ae9c7c';g.lineWidth=.8;g.setLineDash([2,2]);g.beginPath();rounded(5,5.5,110,30,13);g.stroke();g.setLineDash([]);
    for(let i=0;i<4;i++){
      const x=23.5+i*24.3,y=20.5,active=i===s.chapter,r=active?8.4:5.7;
      g.shadowColor='#61482966';g.shadowBlur=2;g.shadowOffsetY=1;
      g.beginPath();g.arc(x,y,r,0,tau);g.fillStyle=active?'#709592':i<s.chapter?'#b99664':'#d1c1a4';g.fill();
      g.shadowBlur=g.shadowOffsetY=0;g.lineWidth=.95;g.strokeStyle=active?'#4e716f':'#af9f87';g.stroke();
      g.beginPath();g.arc(x,y,r-1.7,0,tau);g.strokeStyle=active?'#aac2b5':'#e0d2b8';g.stroke();
      g.fillStyle=active?'#445e59':'#a99a80';
      for(const a of [-1,1])for(const b of [-1,1]){g.beginPath();g.arc(x+a*r*.24,y+b*r*.24,active?1.06:.68,0,tau);g.fill();}
    }
  }
  function soundBadge(mute){
    const c=document.querySelector('#sound canvas'),g=c.getContext('2d');g.setTransform(3,0,0,3,0,0);g.clearRect(0,0,46,46);
    g.beginPath();g.arc(23,23,20.8,0,tau);g.fillStyle='#f0e6cf';g.fill();g.strokeStyle='#b39e7c';g.lineWidth=1;g.stroke();
    g.beginPath();g.arc(23,23,17.6,0,tau);g.setLineDash([2.1,2.2]);g.lineWidth=.84;g.strokeStyle='#b6a383';g.stroke();g.setLineDash([]);
    g.strokeStyle=g.fillStyle='#74664f';g.lineJoin='round';g.lineCap='round';g.lineWidth=1.65;
    g.beginPath();g.moveTo(13.9,20.7);g.lineTo(17.4,20.7);g.lineTo(22.3,16.5);g.lineTo(22.3,29.5);g.lineTo(17.4,25.4);g.lineTo(13.9,25.4);g.closePath();g.fill();
    if(mute){g.beginPath();g.moveTo(26,20.5);g.lineTo(31,25.5);g.moveTo(31,20.5);g.lineTo(26,25.5);g.stroke();}
    else for(const r of [5.3,9]){g.beginPath();g.arc(21.5,23,r,-.77,.77);g.stroke();}
  }
  soundBadge(false);document.getElementById('sound').addEventListener('click',e=>{
    const muted=ButtonSound.toggle();soundBadge(muted);e.currentTarget.setAttribute('aria-pressed',String(muted));e.currentTarget.setAttribute('aria-label',muted?'音を出す':'音を消す');
  });
  const hand=document.getElementById('guide'),hg=hand.getContext('2d');hg.scale(3,3);
  hg.translate(1,2);hg.beginPath();hg.moveTo(10,32);hg.lineTo(7,11);hg.bezierCurveTo(6,5.3,13.0,4.4,14.4,9.8);hg.lineTo(18,25);
  hg.bezierCurveTo(18,19,24.5,19,25.4,24.1);hg.bezierCurveTo(26,20,32,21,33,26);
  hg.bezierCurveTo(34,22.9,39.6,24.2,40.2,30);hg.lineTo(42,42);hg.bezierCurveTo(43,53,37,58,32,59);hg.lineTo(23,60);
  hg.bezierCurveTo(18,59,15,56,12,51);hg.lineTo(2.5,37.3);hg.bezierCurveTo(-.6,31.1,4,28,8.2,32.2);hg.lineTo(12.3,36.7);hg.closePath();
  hg.fillStyle='rgba(255,250,229,.93)';hg.strokeStyle='#aa9578';hg.lineWidth=1.25;hg.fill();hg.stroke();
  hg.beginPath();hg.moveTo(11.3,20);hg.lineTo(14.2,19.6);hg.strokeStyle='#d1bfa3';hg.stroke();
  function project(x,y,z){
    const p=v(x,y,z).project(camera);return {x:(.5+p.x*.5)*canvas.clientWidth,y:(.5-p.y*.5)*canvas.clientHeight};
  }
  function suggested(){
    const ready=s.bodies.filter(b=>b.status==='ready');
    return ready.length?ready[ready.length-1-(s.hint.sequence%Math.min(ready.length,4))]:null;
  }
  const smooth=q=>(q=Math.max(0,Math.min(1,q)),q*q*(3-2*q));
  function demonstration(){
    const b=suggested(),age=s.hint.age,c=ButtonWorkshop.chapters[s.chapter];
    if(!b||age<=0||age>=2.85||s.phase!=='play'){hand.style.opacity='0';return;}
    const q=smooth((age-.50)/1.55);
    let src={x:b.x,y:b.y+.064,z:b.z},dst={x:s.jar.x,y:c.h+.21,z:s.jar.z};
    if(s.chapter===1){dst={x:s.tray.x-.83*s.tray.scale,y:c.bed+.05,z:s.tray.z};}
    if(s.chapter===2){
      const a=.4+1.75*q;src={x:s.tray.x+.78*s.tray.scale*Math.cos(a),y:c.bed+.09,z:s.tray.z+.78*s.tray.scale*Math.sin(a)};dst=src;
    }
    if(s.chapter===3){src={x:s.tray.x+.56*s.tray.scale,y:.65,z:s.tray.z+.47*s.tray.scale};dst={...src,y:.40};}
    const from=project(src.x,src.y,src.z),to=project(dst.x,dst.y,dst.z);
    const x=from.x+(to.x-from.x)*q,y=from.y+(to.y-from.y)*q-(s.chapter===0?27:8)*4*q*(1-q);
    hand.style.transform='translate3d('+(x-10)+'px,'+(y-8)+'px,0) rotate('+(-13+10*q)+'deg)';
    hand.style.transformOrigin='10px 8px';hand.style.opacity=String(.82*smooth(age/.23)*smooth((2.85-age)/.43));
  }
  function updateView(){
    const stamp=s.serial+'-'+s.portrait;if(stageStamp!==stamp)buildStage();
    const c=ButtonWorkshop.chapters[s.chapter],k=s.zoom.x,p=s.portrait;
    const aspect=camera.aspect,dist=Math.max(8.90,(p?3.04:6.14)/(2*Math.tan(13*pi/180)*aspect));
    const sy=p?.493:.403,sz=Math.sqrt(1-sy*sy);
    const aim=v(s.jar.x*k*.78,(p?.91:1.13)+(c.h*.52-(p?.91:1.13))*k*.64,(p?.30:.035)+(s.jar.z-.20)*k*.60);
    camera.position.copy(aim).addScaledVector(v(0,sy,sz),dist*(1-.255*k));camera.lookAt(aim);camera.updateMatrixWorld();
    root.position.x=(s.serial-s.travel)*Math.max(13,dist*.49*aspect*1.8);
    jar.userData.pivot.rotation.x=-s.lid.x;
    jar.userData.tagPivot.rotation.z=s.tag.x;
    jar.userData.tagPivot.rotation.x=s.leaves[9].x*.16+s.vibrations[2]*.23;
    if(tray.userData.water){
      const geo=tray.userData.water.geometry,attr=geo.attributes.position;
      for(let i=0;i<19;i++)for(let j=0;j<=48;j++){
        const th=tau*j/48,other=s.water[(i+Math.floor((1+Math.cos(th))*3))%19];
        attr.setY(i*49+j,s.water[i].x*.61+other.x*.39*(i/18));
      }attr.needsUpdate=true;geo.computeVertexNormals();
    }
    if(tray.userData.wheel)tray.userData.wheel.rotation.y=-s.wheel;
    if(tray.userData.press){tray.userData.press.scale.y=1+s.pump.x*1.65;tray.userData.fan.rotation.y=s.vane.angle;}
    const hint=suggested();carryShadow.visible=false;
    for(const b of s.bodies){
      const node=buttonNodes[b.id],obj=node.model;
      node.pivot.position.set(b.x,b.y,b.z);obj.scale.setScalar(b.r);
      node.pick.scale.set(b.r*1.10,b.r*.39,b.r*1.10);
      const aloft=b.status==='fall'||b.status==='sail',angle=b.tilt+b.lean+(aloft?Math.max(-.48,Math.min(.48,b.vy*.057)):0);
      obj.rotation.set(angle,b.spin,b.roll+b.lean*.32,'YXZ');
      if(s.chapter===0&&b===hint&&s.hint.age>.08&&s.hint.age<.80)obj.rotation.z+=.065*Math.sin(pi*(s.hint.age-.08)/.72);
      const facet=s.facets[b.id%18],shine=facet.energy*(.42+.28*Math.cos(b.spin-facet.axis-facet.x*2.6));
      for(const finish of node.finishes)finish.emissiveIntensity=shine+b.ring*.045;
      if(node.sail){node.sail.visible=b.silk.x>.006;node.sail.scale.setScalar(Math.max(.001,b.silk.x));node.sail.rotation.z=-b.vx*.064;}
      if(b.status==='held'){
        carryShadow.visible=true;carryShadow.position.set(b.x,.087,b.z);carryShadow.material.opacity=.19/(1+b.y*.5);
      }
    }
    for(let i=0;i<18;i++){
      const f=s.facets[i],pr=prisms[i],cr=caustics[i],a=f.energy;
      pr.holder.visible=cr.cast.visible=a>.008;
      if(a>.008){
        pr.holder.rotation.z=pr.angle+s.leaves[i%15].x*.07+f.x*.21;
        pr.gem.rotation.y=f.axis+f.x*2.3;pr.gem.material.opacity=Math.min(.86,a);
        pr.gem.material.emissiveIntensity=.24+a*.57;
        cr.cast.rotation.y=cr.angle+f.x*.10;cr.ray.material.opacity=Math.min(.53,a*.70);
      }
    }
    room.foliage.forEach((f,i)=>{f.stem.rotation.z=f.angle+s.leaves[i].x;});
    room.curtains.forEach((o,i)=>{o.rotation.z=s.leaves[i*7].x*.005;o.position.z=s.leaves[i*7].x*.09;});
    s.dust.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(ambientMoteScale[i]);dummy.updateMatrix();motes.setMatrixAt(i,dummy.matrix);});motes.instanceMatrix.needsUpdate=true;
    demonstration();
  }
  const ray=new T.Raycaster(),mouse=new T.Vector2(),dragPlane=new T.Plane(v(0,0,1),0);
  let pointer=null,cranking=false,lastAngle=0,grabOffset=v(0,0,0);
  function rayAt(e){
    const r=canvas.getBoundingClientRect();mouse.set(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height);
    ray.setFromCamera(mouse,camera);
  }
  function pickTarget(e){
    rayAt(e);return ray.intersectObjects(hits,false).find(h=>{
      const id=h.object.userData.button;return id===undefined||s.bodies[id]?.status==='ready';
    });
  }
  function aboveJar(e){
    const c=ButtonWorkshop.chapters[s.chapter],a=project(s.jar.x-c.r,c.h,s.jar.z),b=project(s.jar.x+c.r,c.h,s.jar.z);
    const low=project(s.jar.x,.05,s.jar.z+c.r*.44),top=project(s.jar.x,c.h+.42,s.jar.z-.18),margin=canvas.clientWidth<600?13:19;
    return e.clientX>=a.x-margin&&e.clientX<=b.x+margin&&e.clientY>=top.y-margin&&e.clientY<=low.y+margin;
  }
  function angleAt(e){const a=project(s.tray.x,1.79,s.tray.z);return Math.atan2((e.clientY-a.y)*2.2,e.clientX-a.x);}
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null||s.phase!=='play'||e.button!==0)return;
    const h=pickTarget(e);
    if(!h){if(aboveJar(e)){s.vibrations[0]=Math.min(.28,s.vibrations[0]+.16);sim.awake();}return;}
    const id=h.object.userData.button;
    let acted=false;
    if(s.chapter===0&&id!==undefined){
      acted=sim.pick(id);
      if(acted){const b=s.bodies[id];dragPlane.constant=-b.z;const at=v(0,0,0);ray.ray.intersectPlane(dragPlane,at);
        grabOffset.set(b.x-at.x,b.y-at.y+.085,0);}
    }else if(s.chapter===1){acted=sim.ripple(id,Math.round((h.point.x-s.tray.x+1.3)/2.6*18));}
    else if(s.chapter===2){acted=sim.crank(.74);cranking=acted;lastAngle=angleAt(e);}
    else if(s.chapter===3){acted=sim.blow(id);}
    if(acted){ButtonSound.start();pointer=e.pointerId;canvas.setPointerCapture(pointer);canvas.style.cursor='grabbing';e.preventDefault();}
  });
  canvas.addEventListener('pointermove',e=>{
    if(pointer!==e.pointerId){
      if(pointer===null&&e.pointerType==='mouse')canvas.style.cursor=s.phase==='play'&&pickTarget(e)?'grab':'default';
      return;
    }
    if(s.held>=0){
      rayAt(e);const p=v(0,0,0);
      if(ray.ray.intersectPlane(dragPlane,p)){
        p.add(grabOffset);const c=ButtonWorkshop.chapters[s.chapter],ready=aboveJar(e);
        if(ready){p.x=s.jar.x+Math.max(-.22,Math.min(.22,p.x-s.jar.x));p.y=c.h+.34;p.z=s.jar.z;}
        else {p.y=Math.max(.18,Math.min(c.h+1.18,p.y));p.x=Math.max(-4.3,Math.min(4.3,p.x));}
        sim.aim(p.x,p.y,p.z);
      }
    }else if(cranking){const a=angleAt(e),diff=Math.atan2(Math.sin(a-lastAngle),Math.cos(a-lastAngle));
      sim.crank(Math.min(.42,Math.abs(diff)*1.62));lastAngle=a;}
    
  });
  function end(e,cancel){
    if(pointer!==e.pointerId)return;
    if(s.held>=0)sim.release(!cancel&&aboveJar(e));
    const id=pointer;pointer=null;cranking=false;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);canvas.style.cursor='default';
  }
  canvas.addEventListener('pointerup',e=>end(e,false));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>end(e,true));
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  resize();updateView();captureSurroundings();window.addEventListener('resize',resize);
  let previous=performance.now();
  document.addEventListener('visibilitychange',()=>{previous=performance.now();if(document.hidden&&s.held>=0)sim.release(false);});
  function draw(now){
    requestAnimationFrame(draw);if(document.hidden)return;
    sim.step(Math.min(.06,Math.max(0,(now-previous)/1000)));previous=now;
    for(const event of sim.drain())ButtonSound.play(event);
    updateView();renderer.setRenderTarget(frameTarget);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  }
  requestAnimationFrame(draw);
})();
