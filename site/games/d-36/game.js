(() => {
  'use strict';
  const T=THREE, {v,mat,mesh,ball,group}=Art, sim=EngawaSim.create(), sound=makeSound();
  const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
  window.__GAME__={step:dt=>sim.step(dt),getState:()=>sim.getState()};
  const canvas=document.getElementById('garden'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  renderer.transmissionResolutionScale=.59;
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(30,1,.035,140),sun=new T.DirectionalLight(0xffe4ba,2.36);
  scene.fog=new T.FogExp2(0xc5d2c0,.0215);
  const fill=new T.HemisphereLight(0xd7edff,0xd6b78f,1.48);scene.add(fill,sun,sun.target);
  sun.position.set(-6.8,8.6,-5.6);sun.target.position.set(0,.30,-1);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-6.6,right:6.6,top:5.8,bottom:-5.8,near:.2,far:29});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.00026;sun.shadow.normalBias=.013;sun.shadow.radius=2.2;
  const garden=buildGarden(scene),subjects=buildSubjects(scene,garden),toys=buildToys(scene,garden,subjects);
  const sunDisk=ball(scene,-6.5,6,-39,.64,.64,.64,mat(0xffe7a8,{emissive:0xffdf99,emissiveIntensity:1.3,fog:false}));sunDisk.castShadow=sunDisk.receiveShadow=false;
  // Reflections sample the actual eaves, sky, garden and floor, baked once locally.
  let width=1,height=1,frame=1,pull=0;
  function layout(){
    width=canvas.clientWidth||innerWidth;height=canvas.clientHeight||innerHeight;
    camera.aspect=width/height;camera.updateProjectionMatrix();
    frame=clamp((camera.aspect-.47)/.74,0,1);pull=(1-frame)*.70;
    garden.fixes.forEach(fn=>fn(frame));
    subjects.bells.forEach((b,i)=>{b.mount.scale.setScalar(.78+.22*frame);b.mount.position.y=2.908-(1-frame)*i*.038;});
    subjects.girl.scale.setScalar(.87+.13*frame);subjects.girl.position.x=-.35-1.13*frame;
    subjects.laundry.scale.x=.73+.27*frame;garden.vine.scale.setScalar(.86+.14*frame);
    const ratio=Math.min(window.devicePixelRatio||1,1.65,Math.sqrt(2100000/(width*height)));
    renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);
    scene.updateMatrixWorld(true);
  }
  layout();
  // Small ceiling battens carry the two chimes set farther back under the eaves.
  const hooks=subjects.bells.map(b=>{const bar=Art.cube(scene,b.mount.position.x,2.953,.16,.055,.058,1.12,Art.boards[1]);return bar;});
  const envTarget=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
  const capture=new T.CubeCamera(.09,125,envTarget);capture.position.set(0,1.55,-.82);
  scene.add(capture);subjects.bells.forEach(b=>b.mount.visible=false);
  capture.update(renderer,scene);subjects.bells.forEach(b=>b.mount.visible=true);
  const pmrem=new T.PMREMGenerator(renderer),reflection=pmrem.fromCubemap(envTarget.texture);
  scene.environment=reflection.texture;scene.environmentIntensity=.57;pmrem.dispose();envTarget.dispose();capture.removeFromParent();
  // Solid airborne pollen and burning particles, individually lit and positioned.
  const dummy=new T.Object3D(), dust=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xf4e1b2,{transparent:true,opacity:.43,depthWrite:false}),32);
  dust.frustumCulled=false;scene.add(dust);
  const sparkColors=[0xffce86,0xf3b7b9,0xbde9df];
  const sparkMeshes=sparkColors.map(c=>{
    let m=new T.InstancedMesh(new T.SphereGeometry(1,6,4),mat(c,{emissive:c,emissiveIntensity:2,roughness:.45}),196);
    m.count=0;m.frustumCulled=false;scene.add(m);return m;
  });
  const glints=Array.from({length:4},()=>{const o=ball(scene,0,0,0,.008,.008,.008,mat(0xffefc0,{emissive:0xffda86,emissiveIntensity:.84,transparent:true,opacity:.8,depthWrite:false}));o.castShadow=o.receiveShadow=false;return o;});
  // Linear HDR buffer, sparse highlight bloom, fine grain and a soft lens falloff.
  const rt=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)});
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const post=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:rt.texture},px:{value:new T.Vector2(1,1)},grain:{value:.1}},
    vertexShader:'varying vec2 at;void main(){at=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D image;uniform vec2 px;uniform float grain;varying vec2 at;
    void main(){vec3 color=texture2D(image,at).rgb;vec3 halo=vec3(0.);
    for(int i=0;i<8;i++){float a=float(i)*.785398;vec3 c=texture2D(image,at+vec2(cos(a),sin(a))*px*(2.8+mod(float(i),2.)*2.)).rgb;halo+=max(c-vec3(1.04),vec3(0.));}
    color+=halo*.013;vec2 d=at*2.-1.;color*=1.-.104*smoothstep(.25,1.74,dot(d,d));
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float n=fract(sin(dot(gl_FragCoord.xy+grain,vec2(12.9898,78.233)))*43758.5453)-.5;
    gl_FragColor.rgb+=n*.0085;}`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
  function resize(){
    layout();hooks.forEach((o,i)=>o.position.x=subjects.bells[i].mount.position.x);
    const size=renderer.getDrawingBufferSize(new T.Vector2());rt.setSize(size.x,size.y);post.uniforms.px.value.set(1/size.x,1/size.y);
  }
  resize();window.addEventListener('resize',resize);
  const duskColors=[0xc7d6cf,0xefaf93,0xffe2b8,0xffbf89,0xd6ebfc,0xb4bbd5,0xfff8e9,0xe6bcac].map(x=>new T.Color(x));
  const aim=v(0,1.52,0),eye=v(.30,1.28,6.03),targetEye=v(0,0,0),targetAim=v(0,0,0);
  const targetWorld=new T.Vector3(), projected=new T.Vector3();
  function targetId(s){
    if(s.stage===1){if(s.bells[1].hits===0)return 1;if(s.bells[2].hits===0)return 2;return 1+Math.floor(s.age/5)%2;}
    if(s.stage===2)return s.age%12<7?3:4;
    if(s.stage===3)return s.sun.alt<.38?5:0;
    return [0,1,3,5,6,7,8][s.stage];
  }
  function cameraSetup(s){
    const f=s.focus,w=s.cameraMix;
    eye.set(.30*frame+f*.11,1.28+.29*f,6.03+pull+f*.93).multiplyScalar(w[0]);
    aim.set(0,1.52-.25*f,-.26-f*1.63).multiplyScalar(w[0]);
    for(let i=0;i<3;i++){
      const place=[toys.basin,toys.wheelBase,toys.launch][i].position;
      targetEye.set(place.x*.48+.39*frame,1.02+i*.10,4.03+pull*.78+.63*i);
      if(i===0){targetEye.y=1.68;targetEye.z=2.65+pull*.79;}
      targetAim.set(place.x*.81,[.49,.80,1.07][i],place.z-.12);
      if(i===2){targetAim.x+=s.plane.x*.38;targetAim.y+=s.plane.y*.45;targetAim.z+=s.plane.z*.48;}
      eye.addScaledVector(targetEye,w[i+1]);aim.addScaledVector(targetAim,w[i+1]);
    }
    camera.position.copy(eye);camera.lookAt(aim);camera.updateMatrixWorld();
  }
  const stageDots=[...document.querySelectorAll('#chapters i')];
  let seenStage=-1;
  function applyState(s,dt){
    const dusk=clamp((.64-s.sun.alt)/.755,0,1);
    garden.skyUniform.value=dusk;scene.fog.color.copy(duskColors[0]).lerp(duskColors[1],dusk);
    scene.environmentIntensity=.60-.24*dusk;
    const azimuth=-.115-.195*frame,alt=Math.max(.035,s.sun.alt);
    sun.position.set(Math.sin(azimuth)*11,.30+Math.tan(alt)*11,-1-Math.cos(azimuth)*11);sun.color.copy(duskColors[2]).lerp(duskColors[3],dusk);
    sun.intensity=(2.45-1.29*dusk+.044*s.air[3].eddy)*clamp((s.sun.alt+.045)/.13,0,1);fill.color.copy(duskColors[4]).lerp(duskColors[5],dusk);fill.intensity=1.38-.27*dusk;
    sunDisk.position.set(Math.sin(azimuth)*41,1.1+Math.tan(s.sun.alt)*41,-Math.cos(azimuth)*41);sunDisk.material.emissiveIntensity=1.1+.38*dusk;
    garden.cloudMat.color.copy(duskColors[6]).lerp(duskColors[7],dusk);
    subjects.bells.forEach((o,i)=>{
      const b=s.bells[i];o.pivot.rotation.z=-b.angle;o.pivot.rotation.x=b.angle*.25;
      o.tongue.rotation.z=-(b.tongue-b.angle);o.tongue.rotation.x=b.tongue*.12;
      o.tag.rotation.z=-(b.tag-b.tongue)*.60;o.tag.rotation.y=.11+b.tag*.54;
      const pos=o.paper.geometry.attributes.position,rest=o.rest;
      for(let n=0;n<pos.count;n++){
        let x=rest[n*3],y=rest[n*3+1],t=-y/[.669,.554,.606][i],bent=b.strip[clamp(Math.floor(t*8),0,7)].bend;
        pos.setXYZ(n,x+t*t*(.017+i*.006+bent*.72),y+.09*Math.abs(bent)*t*t,.008*Math.sin(t*6+i)+x*t*(.27+b.tag*.29)+bent*t*.46);
      }
      pos.needsUpdate=true;o.paper.geometry.computeVertexNormals();
    });
    subjects.patches.forEach((o,k)=>{
      const pos=o.cloth.geometry.attributes.position,colors=o.cloth.geometry.attributes.color;
      for(let n=0;n<pos.count;n++){
        const x=o.rest[n*3],y=o.rest[n*3+1],u=clamp(x/o.width+.5,0,1),t=clamp(-y/o.len,0,1);
        const gx=u*4,gy=t*3,xi=Math.floor(gx),yi=Math.floor(gy),dx=gx-xi,dy=gy-yi;
        const grid=s.cloth[k],get=(xx,yy)=>grid[Math.min(3,yy)*5+Math.min(4,xx)].d;
        const b=(get(xi,yi)*(1-dx)+get(xi+1,yi)*dx)*(1-dy)+(get(xi,yi+1)*(1-dx)+get(xi+1,yi+1)*dx)*dy;
        const patch=grid[yi*5+xi],shade=1-.132*patch.wet+.038*patch.light;
        colors.setXYZ(n,shade,shade+.012*patch.wet,shade+.023*patch.wet);
        pos.setXYZ(n,x+(k===3?-.56:.27)*b*t,y+t*(Math.abs(b)*.38+.017*Math.cos(u*9+k)),.036*Math.sin(u*(k===3?19:12)+.68*t+k)+b*t*.85);
      }pos.needsUpdate=true;colors.needsUpdate=true;o.cloth.geometry.computeVertexNormals();
    });
    garden.leaves.forEach((o,i)=>{o.rotation.x=o.userData.rest-s.leaves[i].angle*.94;o.rotation.y=.61*Math.sin(i*1.21)+s.leaves[i].angle*.28;});
    garden.blossoms.forEach((o,i)=>o.rotation.x=1.08+s.leaves[i*4].angle*.16);
    const water=toys.water.geometry.attributes.position;
    for(let i=0;i<water.count;i++){
      const x=clamp((water.getX(i)/.574+.5)*5,0,5),y=clamp((water.getZ(i)/.574+.5)*5,0,5),a=Math.floor(x),b=Math.floor(y);
      let dx=x-a,dy=y-b,get=(xx,yy)=>s.water[Math.min(5,xx)+Math.min(5,yy)*6].h;
      water.setY(i,((1-dx)*get(a,b)+dx*get(a+1,b))*(1-dy)+((1-dx)*get(a,b+1)+dx*get(a+1,b+1))*dy);
    }water.needsUpdate=true;toys.water.geometry.computeVertexNormals();
    const cell=clamp(Math.round((s.petal.x/.574+.5)*5),0,5)+6*clamp(Math.round((s.petal.z/.574+.5)*5),0,5);
    toys.petal.position.set(s.petal.x,.333+s.water[cell].h,s.petal.z);toys.petal.rotation.z=s.water[cell].v*2;toys.petal.rotation.y=s.petal.travel*4;
    toys.drop.position.y=s.drip.y;toys.drop.scale.setScalar(.008*Math.min(1,s.drip.volume+.06));toys.drop.scale.y*=1.3+Math.abs(s.drip.v)*.34;
    toys.rotor.rotation.z=-s.wheel.angle;toys.bird.position.y=.43+s.wheel.hoist+s.wheel.lift*.37;
    const freeCable=.919-toys.bird.position.y;toys.cable.scale.y=freeCable/.469;toys.cable.position.y=.919-freeCable*.5;toys.wings.forEach((o,i)=>o.rotation.x=(i?1:-1)*s.wheel.lift*9);
    toys.linkage.scale.y=1+(s.wheel.hoist+s.wheel.lift*.37)/.12;toys.linkage.position.y= .405+(s.wheel.hoist+s.wheel.lift*.37)*.5;
    toys.plane.position.set(s.plane.x,s.plane.y,s.plane.z);toys.plane.rotation.x=s.plane.flying?s.plane.vy*.31:.045;toys.plane.rotation.z=s.plane.trim;toys.plane.rotation.y=-.16-s.plane.heading;
    subjects.head.rotation.y=-.075-.088*Math.tanh((s.stage===0?-1:1)+s.air[1].eddy*.28);
    s.dust.forEach((d,i)=>{dummy.position.set(d.x,d.y,d.z);dummy.scale.setScalar(.0023+d.v*.048);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);});dust.instanceMatrix.needsUpdate=true;
    const counts=[0,0,0];
    for(const q of s.sparks){const m=sparkMeshes[q.hue],i=counts[q.hue]++;if(i>=196)continue;
      dummy.position.set(q.x,q.y,q.z);const r=.019*Math.min(1,q.life*2);dummy.scale.set(r,r*(1+Math.abs(q.vy)*.44),r);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}
    sparkMeshes.forEach((m,i)=>{m.count=Math.min(196,counts[i]);m.instanceMatrix.needsUpdate=true;});
    const id=targetId(s);subjects.anchors[id].getWorldPosition(targetWorld);
    glints.forEach((o,i)=>{const a=s.air[id].phase*.39+i*1.57,fade=.32+.68*Math.pow(.5+.5*Math.cos(a),3);
      o.position.copy(targetWorld);o.position.x+=Math.sin(a+i*.21)*(.075+i*.022);o.position.y+=Math.cos(a*.72+i)*.181;
      o.position.z+=.051+.072*Math.sin(a*1.21);o.scale.setScalar(.0025+.006*fade);o.material.opacity=(s.input?.4:1)*fade;});
    cameraSetup(s);
    if(seenStage!==s.stage){stageDots.forEach((el,i)=>el.className=i===s.stage?'now':i<s.stage?'past':'');seenStage=s.stage;}
    post.uniforms.grain.value=s.dust[0].phase*.14;
  }
  function project(o){
    o.getWorldPosition(projected);projected.project(camera);return {x:(projected.x*.5+.5)*width,y:(.5-projected.y*.5)*height};
  }
  function distanceToSegment(x,y,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
  }
  const floor=()=>Math.min(width,height);
  function pick(x,y) {
    let best=null,dist=Infinity;
    for(const id of sim.groups[sim.read().stage]){
      const anchor=subjects.anchors[id],p=project(anchor);let d=Math.hypot(x-p.x,y-p.y);
      let radius=Math.max(28,floor()*[.067,.060,.056,.098,.088,.12,.085,.062,.056][id]);
      if(id<3){const b=subjects.bells[id],a=project(b.pivot),bottom=project(b.tag);bottom.y+=(p.y-bottom.y)*2.48;d=distanceToSegment(x,y,a,bottom);}
      if(id===3||id===4){const a={...p,x:p.x-(id===3?.68:.17)*height/camera.position.z},b={...p,x:p.x+(id===3?.68:.17)*height/camera.position.z};d=distanceToSegment(x,y,a,b);}
      if(id===4){
        const curtain=project(subjects.patches[3].p);
        const hem={x:curtain.x,y:curtain.y+height*.42};
        d=Math.min(d,distanceToSegment(x,y,curtain,hem));
      }
      if(d<radius&&d/radius<dist){dist=d/radius;best={id,p};}
    }return best;
  }
  let finger=null,muted=false;
  const hand=document.getElementById('gesture'),streak=document.getElementById('streak'),wisp=document.getElementById('wisp');
  function breeze(){
    if(!finger)return;
    const hit=pick(finger.x,finger.y);if(!hit){sim.release();return;}
    const {id,p}=hit,zone=sim.zones[id],offset=(finger.x-p.x)/height*2.8;
    const strength=clamp(1.8+1.6*Math.exp(-finger.hold*4)+Math.min(1.9,finger.hold*.93)+finger.speed*.008,0,5);
    sim.touch(id,strength,zone[0]+clamp(offset,-.36,.36),zone[1]+clamp((finger.y-p.y)/height*.85,-.24,.24),finger.dir);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(finger||!e.isPrimary)return;sound.wake();
    if(!pick(e.clientX,e.clientY))return;
    finger={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,hold:0,speed:0,dir:1,last:e.timeStamp};
    canvas.setPointerCapture(e.pointerId);breeze();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!finger||e.pointerId!==finger.id)return;
    const dx=e.clientX-finger.x,dy=e.clientY-finger.y,delta=Math.max(.008,(e.timeStamp-finger.last)/1000);
    finger.speed=Math.min(900,Math.hypot(dx,dy)/delta);if(Math.abs(dx)>1.7)finger.dir=Math.sign(dx);
    finger.x=e.clientX;finger.y=e.clientY;finger.last=e.timeStamp;breeze();
  });
  function release(e){if(finger&&(!e||e.pointerId===finger.id)){finger=null;sim.release();}}
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>canvas.addEventListener(t,release));
  const button=document.getElementById('sound');button.addEventListener('click',()=>{sound.wake();muted=!muted;sound.setMuted(muted);button.setAttribute('aria-pressed',String(muted));});
  function guidance(s){
    let opacity=0,x=0,y=0,phase=0,magnitude=0;
    if(s.idle>=4&&!finger){
      const p=project(subjects.anchors[targetId(s)]),t=(s.idle-4)%4.1;
      phase=clamp(t/2.55,0,1);const smooth=phase*phase*(3-2*phase);
      x=p.x-17+smooth*36;y=p.y+15-smooth*20-6*Math.sin(phase*Math.PI);
      opacity=Math.min(1,t*3.1,Math.max(0,(3.35-t)*2.5))*.89;
      hand.style.transform='translate('+Math.round(x-20)+'px,'+Math.round(y-8)+'px) scale(.81)';magnitude=opacity*.8;
    }else if(s.input&&finger){x=finger.x;y=finger.y;phase=(s.air[s.input.i].phase/6.28)%1;magnitude=.47+finger.speed*.0003;}
    hand.style.opacity=opacity;
    let L=21+phase*28;
    streak.setAttribute('d','M '+(x-L)+' '+(y+8)+' q '+L*.36+' 5 '+L*.68+' -3 t '+L*.65+' -6');
    wisp.setAttribute('d','M '+(x-L+4)+' '+(y+15)+' q '+L*.35+' 2 '+L*.65+' -4');streak.style.opacity=magnitude;wisp.style.opacity=magnitude*.58;
  }
  let prior=performance.now(),lastStage=0;
  applyState(sim.read(),0);
  function frameLoop(now){
    const dt=clamp((now-prior)/1000,0,.075);prior=now;
    if(!document.hidden){
      if(finger){finger.hold+=dt;finger.speed*=Math.exp(-dt*5);breeze();}
      sim.step(dt);const state=sim.read();
      if(state.stage!==lastStage){release();lastStage=state.stage;}
      sim.drain().forEach(sound.event);sound.update(state);applyState(state,dt);guidance(state);
      renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
    }
    requestAnimationFrame(frameLoop);
  }
  document.addEventListener('visibilitychange',()=>{release();prior=performance.now();sound.setMuted(document.hidden||muted);});
  window.addEventListener('blur',()=>release());
  requestAnimationFrame(frameLoop);
})();
