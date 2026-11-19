'use strict';
(() => {
  const sim=ShoePhysics.makeGame(),audio=new WorkshopSound();
  window.__GAME__={step:dt=>sim.step(dt),getState:sim.getState};
  const canvasEl=document.getElementById('world'),button=document.getElementById('sound'),hint=document.getElementById('hint'),fade=document.getElementById('fade'),chapters=[...document.querySelectorAll('#chapters span')];
  const renderer=new T.WebGLRenderer({canvas:canvasEl,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(28,1,.045,90);
  scene.background=new T.Color(0xdbdfcf);scene.fog=new T.FogExp2(0xd4d5bc,.029);
  const sky=new T.HemisphereLight(0xe0efff,0xbca17d,1.28),sun=new T.DirectionalLight(0xffe2ac,2.86);
  scene.add(sky,sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00027;sun.shadow.normalBias=.004;
  Object.assign(sun.shadow.camera,{left:-4.05,right:4.05,top:4.05,bottom:-4.05,near:.1,far:24});sun.shadow.camera.updateProjectionMatrix();
  const hall=buildHall(scene),yard=garden(scene),alley=lane(scene),bench=furniture(scene),cream=tin(bench),cloth=makeCloth(bench),hero=shoe(bench);
  hero.root.position.set(-.11,.983,-.15);hero.root.rotation.y=.42;hero.root.scale.setScalar(1.105);
  cloth.root.position.set(-.69,.978,.55);cloth.root.rotation.y=-.24;
  const folded=cloth.root.position.clone(),benchShoe=hero.root.position.clone();
  const pair=[shoe(scene,false),shoe(scene,false)];pair.forEach((o,i)=>{o.root.scale.set(.36,.36*(i?1:.99),.36);o.root.rotation.y=-PI/2;o.root.visible=false;});
  const surroundings=group(scene);
  // A woven runner beyond the lower edge of the cabinet and a fern at the window.
  box(surroundings,0,-.095,6.10,8,.16,8.3,M.oak);
  const rugTex=texture(canvas(320,512,(c,w,h)=>{c.fillStyle='#737e70';c.fillRect(0,0,w,h);
    for(let p of [7,12,22,29]){c.strokeStyle=p%2?'#c2b390':'#4d645b';c.lineWidth=p===22?8:2;c.strokeRect(p,p,w-p*2,h-p*2);}
    for(let j=0;j<7;j++)for(let i=0;i<5;i++){let x=48+i*56+(j%2?12:0),y=54+j*66;c.strokeStyle='#c1b08e';c.lineWidth=1.5;c.beginPath();c.moveTo(x,y-13);c.lineTo(x+10,y);c.lineTo(x,y+13);c.lineTo(x-10,y);c.closePath();c.stroke();}
    for(let i=0;i<h;i+=3){c.fillStyle='#443d341f';c.fillRect(0,i,w,1);}}));
  box(surroundings,0,.005,2.47,2.81,.017,2.62,standard(0xd9c9a8,.96,0,{map:rugTex}));
  potPlant(surroundings,-2.19,1.075,-2.57,.90);
  for(let s of [-1,1]){box(surroundings,s*1.53,.82,-5.82,.54,.068,.52,M.oak);
    for(let dx of [-.216,.216])for(let dz of [-.19,.19])cyl(surroundings,s*1.53+dx,.39,-5.82+dz,.023,.78,M.edge,.031);
    potPlant(surroundings,s*1.53,.86,-5.82,s<0?.78:.68,s>0);}
  // Distant roof silhouettes are solid gables, chimneys and plaster walls.
  for(let i=0;i<7;i++){const xx=(i-3)*3.91,zz=-27.3-(i%3)*1.82,h=3.25+(i%2)*.72;
    box(surroundings,xx,h/2,zz,3.74,h,2.68,i%2?M.cream:M.stone);
    for(let s of [-1,1]){const roof=box(surroundings,xx,h+.47,zz+s*.70,3.93,.115,1.82,M.darkwood);roof.rotation.x=s*.59;}
    box(surroundings,xx+.99,h+.95,zz-.21,.34,.98,.37,M.edge);}
  // An actual trough directs a trail of water onto the paddle wheel.
  box(surroundings,1.55,.726,-10.99,.30,.066,1.20,M.edge);
  for(let s of [-1,1])box(surroundings,1.55+s*.15,.76,-10.99,.033,.114,1.24,M.oak);
  box(surroundings,1.55,.765,-10.99,.25,.019,1.17,standard(0x91b4aa,.13,.27));
  batch(surroundings);
  const state0=sim.read(),matrixObj=new T.Object3D();
  function instances(geo,mat,n){const m=new T.InstancedMesh(geo,mat,n);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;}
  const gravel=instances(new T.IcosahedronGeometry(1,0),standard(0xffffff,.82),state0.stones.length);gravel.receiveShadow=gravel.castShadow=true;
  const gravelColors=[0x998e7b,0xb5ae96,0x928e81,0xc5b9a1,0xa69a83];
  state0.stones.forEach((s,i)=>gravel.setColorAt(i,new T.Color(gravelColors[i%5])));
  const motes=instances(new T.IcosahedronGeometry(1,0),standard(0xffdfaf,.58,0,{emissive:0xcfaf77,emissiveIntensity:.28}),state0.dust.length);
  const beads=instances(new T.IcosahedronGeometry(1,1),standard(0xd0e5df,.08,.34),state0.drops.length);
  function put(inst,i,x,y,z,a,b,c,rx=0,ry=0,rz=0){matrixObj.position.set(x,y,z);matrixObj.scale.set(a,b,c);matrixObj.rotation.set(rx,ry,rz);matrixObj.updateMatrix();inst.setMatrixAt(i,matrixObj.matrix);}
  const waterMat=pbrBoth(new T.MeshPhysicalMaterial({color:0xa6b9aa,roughness:.12,roughnessMap:roughTex,metalness:.24,transparent:true,opacity:.32,depthWrite:false,clearcoat:.85,clearcoatRoughness:.10}));
  const wet=surface(scene,19,63,(u,v)=>V(-2.3+4.6*u,.011,-14-v*9.8),waterMat);wet.castShadow=false;
  const wetPos=wet.geometry.attributes.position;
  const depths=[];for(let i=0;i<20;i++)for(let j=0;j<64;j++)depths.push(state0.water[j*20+i].depth);
  wet.geometry.setAttribute('waterDepth',new T.Float32BufferAttribute(depths,1));
  waterMat.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float waterDepth;varying float localDepth;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n localDepth=waterDepth+position.y-.012;');
    shader.fragmentShader='varying float localDepth;\n'+shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\n diffuseColor.a*=smoothstep(.004,.017,localDepth);');
  };
  // Polished markers sit in the surface. Their engraved sole and heel indicate the next place to step.
  const marker=group(scene),markMat=standard(0xf0d397,.33,.36,{emissive:0xb19556,emissiveIntensity:.20});
  function soleMark(z,r,w,h){const pts=[];for(let i=0;i<=44;i++){let a=i*TAU/44;pts.push(V(Math.sin(a)*w*(1+Math.cos(a)*.12),.002,z+Math.cos(a)*h));}line(marker,pts,r,markMat,false);}
  soleMark(-.075,.009,.096,.145);soleMark(.125,.008,.076,.045);batch(marker);marker.visible=false;
  const glints=instances(new T.OctahedronGeometry(1,0),standard(0xffebba,.21,.28,{emissive:0xffe3a4,emissiveIntensity:.92}),4);
  const practicals=[0,1].map(()=>{const l=new T.PointLight(0xffb962,0,4.7,2);scene.add(l);return l;});
  const homeBg=new T.Color(0xd9ddce),lateBg=new T.Color(0xd4beb0),daySun=new T.Color(0xffe3b2),lateSun=new T.Color(0xffc595);
  const grain=canvas(120,120,(c,w,h)=>{const d=c.createImageData(w,h);for(let i=0;i<w*h;i++){const n=rand()*255;d.data[i*4]=d.data[i*4+1]=d.data[i*4+2]=n;d.data[i*4+3]=255;}c.putImageData(d,0,0);});
  document.getElementById('grain').style.backgroundImage='url('+grain.toDataURL()+')';
  // Linear HDR is kept until the final pass; only highlights spill into the neighbouring pixels.
  const floating=renderer.extensions.has('EXT_color_buffer_float');
  const target=new T.WebGLRenderTarget(1,1,{type:floating?T.HalfFloatType:T.UnsignedByteType,samples:Math.min(2,renderer.capabilities.maxSamples),depthBuffer:true});
  const fxScene=new T.Scene(),fxCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const fx=new T.ShaderMaterial({depthWrite:false,depthTest:false,uniforms:{picture:{value:target.texture},px:{value:new T.Vector2()}},
    vertexShader:'varying vec2 v; void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D picture;uniform vec2 px;varying vec2 v;
      vec3 bright(vec2 p){vec3 c=texture2D(picture,p).rgb;return c*smoothstep(.78,2.4,max(c.r,max(c.g,c.b)));}
      void main(){vec3 c=texture2D(picture,v).rgb;vec3 b=vec3(0.);for(int j=0;j<8;j++){float a=float(j)*.785398;vec2 d=vec2(cos(a),sin(a))*px;b+=bright(v+d*3.)+bright(v+d*7.)*.45;}gl_FragColor=vec4(c+b*.004,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
  fxScene.add(new T.Mesh(new T.PlaneGeometry(2,2),fx));
  let w=1,h=1,currentStage=-1,envIndex=-1,lastCycle=-1,widthFit=0;
  const envGen=new T.PMREMGenerator(renderer),envs=[];
  function size(){w=innerWidth;h=innerHeight;cam.aspect=w/h;const pixelRatio=Math.min(devicePixelRatio||1,w<600?1.8:1.55);renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);target.setSize(Math.round(w*pixelRatio),Math.round(h*pixelRatio));fx.uniforms.px.value.set(1/target.width,1/target.height);widthFit=Math.max(3.78,(cam.aspect<.60?2.66:2.87)/(2*Math.tan(14*PI/180)*cam.aspect));cream.root.position.x=cam.aspect<.60?.88:1.025;}
  size();addEventListener('resize',size);
  function project(p){const q=p.clone().project(cam);return {x:(q.x*.5+.5)*w,y:(.5-q.y*.5)*h};}
  let inactiveNudge={time:-20,object:null},held=null;
  const ray=new T.Raycaster(),pointer=new T.Vector2(),ground=new T.Plane(V(0,1,0),0);
  const up=V(0,1,0);
  function resolveCamera(s){
    const portrait=1-sat((cam.aspect-.46)/.64),dist=widthFit;
    const focus=V(0,1.445-portrait*.185,-.10);
    const pos=V(-.125,.205+portrait*.155,.965).normalize().multiplyScalar(dist).add(focus);
    const middle=V((s.feet[0].x+s.feet[1].x)*.5,0,(s.feet[0].z+s.feet[1].z)*.5);
    const gardenView=Math.exp(-((middle.z+9.0)**2)/6.7);
    const walkFocus=V(middle.x*.78+.31*gardenView,.40,middle.z-.46),walkEye=V(middle.x*.72+.18-.39*gardenView,1.26+portrait*.22,middle.z+2.04+portrait*.63);
    const t=s.stage?sat(s.entry):0,e=t*t*(3-2*t);
    cam.position.copy(pos).lerp(walkEye,e);focus.lerp(walkFocus,e);cam.fov=28+(13+portrait*10)*e;cam.updateProjectionMatrix();cam.lookAt(focus);cam.updateMatrixWorld();
    return middle;
  }
  function worldPoint(u,v){return hero.root.localToWorld(skin(u,v,.019));}
  function sampleDynamics(s){
    hero.update(s.cells);
    if(lastCycle!==s.cycle){lastCycle=s.cycle;hero.hide.color.setHex([0x8c492e,0x78462f,0x915636][s.cycle%3]);pair.forEach(o=>o.hide.color.copy(hero.hide.color));}
    hero.root.visible=s.stage===0||s.entry<.83;
    hero.root.position.copy(benchShoe);
    hero.root.rotation.y=.42;
    if(s.stage&&s.entry<1){const f=s.entry,e=f*f*(3-2*f);hero.root.position.lerp(V(-.19,.03,-1.5),e);hero.root.position.y+=Math.sin(PI*f)*.42;hero.root.rotation.y-=e*1.99;hero.root.scale.setScalar(1.105-.745*e);}
    else hero.root.scale.setScalar(1.105);
    hero.root.updateWorldMatrix(true,false);
    if(s.stage===0){
      cloth.root.position.set(s.clothCenter.x,s.clothCenter.y,s.clothCenter.z);
      cloth.root.rotation.set(-.08*s.clothLift,-.24+.53*s.clothLift,.12*s.clothLift);
      for(const l of cloth.layers){let a=l.sheet.geometry.attributes.position;
        for(let i=0;i<a.count;i++){const u=Math.floor(i/25)/30,v=(i%25)/24,cell=s.cloth[Math.min(4,Math.floor(u*5))*5+Math.min(4,Math.floor(v*5))];
          a.setY(i,l.base[i*3+1]+cell.y+s.swirl*.23*u**5+.014*s.clothLift*Math.sin(v*PI));}a.needsUpdate=true;}
      cloth.root.scale.set(1-.37*s.clothLift,1,1-.28*s.clothLift);
    }else{cloth.root.position.copy(folded);cloth.root.scale.set(1,1,1);cloth.root.rotation.set(0,-.24,0);}
    cream.wax.position.y=.153+s.dip;
    let n=s.elapsed-inactiveNudge.time;cream.root.rotation.z=inactiveNudge.object==='tin'&&n<1.4?.015*Math.exp(-4*n)*Math.sin(17*n):0;
    pair.forEach((o,i)=>{let f=s.feet[i];o.root.visible=!!s.stage&&s.entry>(i?.52:.81);o.root.position.set(f.x,.021+f.y,f.z);o.root.rotation.set(f.angle,-PI/2+(i?.066:-.066),0);});
    hall.plankMeshes.forEach(o=>o.row.position.y=s.boards[o.index].flex);
    hall.dLeaf.forEach((d,i)=>d.rotation.y=(i? -1:1)*(.76+s.door*.71));
    yard.wheel.rotation.z=-s.wheelAngle;yard.bucket.rotation.x=s.bucketAngle;yard.filling.position.y=-.124+s.bucketFill*.23;
    yard.filling.scale.x=yard.filling.scale.z=.123+s.bucketFill*.045;
    s.stones.forEach((p,i)=>put(gravel,i,p.x,.011+p.size*.37+p.y,p.z,p.size*1.42,p.size*.61,p.size,p.angle*.46,p.angle,.07*i));
    gravel.instanceMatrix.needsUpdate=true;
    s.dust.forEach((p,i)=>put(motes,i,p.x,p.y,p.z,p.diam*.65,p.diam,p.diam*.65));motes.instanceMatrix.needsUpdate=true;
    s.drops.forEach((d,i)=>put(beads,i,1.55+d.offset,.782+d.y,-10.42+d.s,.011,.009+Math.abs(d.vy)*.010,.026));beads.instanceMatrix.needsUpdate=true;
    if(s.stage===3){for(let i=0;i<20;i++)for(let j=0;j<64;j++)wetPos.setY(i*64+j,.012+s.water[j*20+i].h);wetPos.needsUpdate=true;wet.geometry.computeVertexNormals();}
    alley.lamps.forEach((l,i)=>{l.mount.rotation.z=s.lamps[i].angle;l.glow.emissiveIntensity=.06+s.lamps[i].temp*2.35;});
    alley.windowM.forEach((m,i)=>m.emissiveIntensity=.065+s.lamps[i%5].temp*.93);
    const z=(s.feet[0].z+s.feet[1].z)*.5,nearest=Math.min(3,Math.max(0,Math.floor((-z-15.4)/1.56)));
    practicals.forEach((l,j)=>{let k=nearest+j;l.position.copy(alley.lamps[k].mount.position);l.position.y-=.38;l.intensity=s.stage===3?s.lamps[k].temp*2.3:0;});
    marker.visible=!!s.stage&&!s.returning&&s.entry>.8;
    const pathX=.68*Math.exp(-((z+9.9)**2)/4.2)-.41*Math.exp(-((z+16.2)**2)/3.5);
    const mx=(s.feet[0].x+s.feet[1].x)*.27+pathX*.46+(s.turn?.16:-.16);
    marker.position.set(mx,.022,z-.88);marker.rotation.y=s.turn?-.11:.11;
    markMat.emissiveIntensity=.13+Math.max(0,s.wind)*.4;
    if(s.stage===3){const k=Math.max(0,Math.min(63,Math.round((-marker.position.z-14)*63/9.8)))*20+10;marker.position.y+=s.water[k].h;}
    glints.visible=s.stage===0&&s.peak>.39;
    for(let i=0;i<4;i++){const k=[16,21,32,8][i],c=s.cells[k],pt=worldPoint(c.u,c.v);
      let a=Math.max(0,c.gloss-.23)*(.045+Math.abs(s.dust[i].vx)*.55);
      put(glints,i,pt.x,pt.y+.004,pt.z,a*(i%2?1.35:.43),a*(i%2?.36:1.3),.0025);}
    glints.instanceMatrix.needsUpdate=true;
  }
  function showHint(s){
    let a=s.idle-3.95;if(a<0||held||s.returning){hint.style.opacity=0;return;}
    let cycle=a%4.25,t=sat((cycle-.30)/2.70),f=t*t*(3-2*t),pos;
    if(s.stage===0){
      if(s.ready){pos=worldPoint(.36,.405);pos.y+=.035+.06*(1-f);}
      else{const from=folded.clone().add(V(.03,.09,0)),end=worldPoint(.17+.57*sat((t-.45)/.45),.40);
        pos=from.lerp(end,sat(f*2.4));pos.y+=.02+.085*Math.sin(Math.min(1,f*2.4)*PI);}
    }else{pos=marker.position.clone();pos.y+=.025+.2*(1-sat(t*2));
      if(s.stage===2&&!s.bucketTouches&&s.feet[s.turn].z< -8.7&&s.feet[s.turn].z> -10.9&&Math.floor(a/4.25)%2===0){
        const vessel=yard.bucket.localToWorld(V(0,.11,.04)),q=project(vessel);
        if(q.x>.06*w&&q.x<.92*w&&q.y>.10*h&&q.y<.78*h){pos=vessel;pos.y+=.08*(1-f);}
        else {pos.x+=.66*(f-.5);pos.y=.055;}
      }
      if(s.stage===3&&!s.waterTraces&&Math.floor(a/4.25)%2===0){pos.x+=(f-.5)*.76;pos.z+=Math.sin(PI*f)*.18;pos.y=.055;}
    }
    const q=project(pos);hint.style.transform='translate('+Math.round(q.x-12)+'px,'+Math.round(q.y-6)+'px) rotate(-12deg)';
    hint.style.opacity=String(.82*Math.min(sat(cycle/.3),sat((3.7-cycle)/.5)));
  }
  function render(){
    const s=sim.read(),mid=resolveCamera(s);sampleDynamics(s);
    const evening=s.stage?sat((-mid.z-10.5)/9.2):0;
    scene.background.copy(homeBg).lerp(lateBg,evening);scene.fog.color.copy(scene.background);
    sun.color.copy(daySun).lerp(lateSun,evening);sun.intensity=2.86-evening*.93;
    const targetZ=s.stage?mid.z:0;sun.target.position.set(0,.45,targetZ);sun.position.set(-4.8,7.2-evening*2,3.3+targetZ);
    sky.intensity=1.28-evening*.21;
    if(currentStage!==s.stage){currentStage=s.stage;chapters.forEach((el,i)=>el.classList.toggle('current',i===s.stage));pair.forEach(o=>o.update(s.cells));}
    const ei=s.stage<=1?0:s.stage-1;
    if(envIndex!==ei){envIndex=ei;if(!envs[ei]){
      const oldHero=hero.root.visible,oldPair=pair.map(o=>o.root.visible);hero.root.visible=false;pair.forEach(o=>o.root.visible=false);
      envs[ei]=envGen.fromScene(scene,.035,.12,55,{size:64,position:ei===0?V(0,1.6,.1):ei===1?V(0,.9,-10.4):V(0,1.05,-18.3)});
      hero.root.visible=oldHero;pair.forEach((o,i)=>o.root.visible=oldPair[i]);}
      scene.environment=envs[ei].texture;scene.environmentIntensity=.52;}
    showHint(s);fade.style.opacity=String(s.returning?sat((s.returning-2.12)/1.8):!s.stage&&s.cycle?1-sat(s.entry*1.5):0);
    renderer.setRenderTarget(target);renderer.render(scene,cam);renderer.setRenderTarget(null);renderer.render(fxScene,fxCamera);
  }
  function pointRay(e){pointer.set(e.clientX/w*2-1,1-e.clientY/h*2);ray.setFromCamera(pointer,cam);}
  function intersect(obj){return ray.intersectObject(obj,true)[0];}
  function floorPoint(){return ray.ray.intersectPlane(ground,V());}
  function leatherUV(hit){const p=hero.root.worldToLocal(hit.point.clone()),u=sat(p.x/1.84+.5);
    const z=(p.z-.015*Math.sin(TAU*u))/Math.max(.012,profileAt(u,1));const v=Math.acos(Math.max(-1,Math.min(1,Math.sign(z)*Math.pow(Math.abs(z),1/.87))))/PI;
    return {u,v};}
  function brushHit(hit,e){let b=leatherUV(hit);sim.brush(b.u,b.v,e.pressure||.5,worldPoint(b.u,b.v).add(V(0,.020,0)));if(held)held.free=null;}
  function shoeHit(){return intersect(hero.parts);}
  function area(s,p){if(!p)return false;const z=(s.feet[0].z+s.feet[1].z)*.5;return Math.abs(p.x)<1.52&&p.z>z-2.2&&p.z<z+.66;}
  canvasEl.addEventListener('pointerdown',e=>{
    if(held||!e.isPrimary)return;audio.unlock();pointRay(e);const s=sim.read();if(s.returning)return;
    const common={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,free:null,point:null};
    if(!s.stage){const hc=intersect(cloth.root),hs=shoeHit(),ht=intersect(cream.root);
      const nearest=[hc&&['cloth',hc],hs&&['shoe',hs],ht&&['tin',ht]].filter(Boolean).sort((a,b)=>a[1].distance-b[1].distance)[0];
      if(!nearest){if(s.ready){const p=floorPoint();if(p&&p.z< -1.05&&p.z> -6.45&&Math.abs(p.x)<1.55)sim.startWalk();}return;}
      const [kind,hit]=nearest;sim.touch();if(kind==='tin'){sim.dipCream();inactiveNudge={object:'tin',time:s.elapsed};return;}
      held={...common,kind,canWalk:s.ready&&kind==='shoe'};if(kind==='shoe'&&!s.ready)brushHit(hit,e);
    }else{
      if(s.stage===2&&(intersect(yard.bucket)||intersect(yard.wheel))){sim.tipBucket();return;}
      if(s.stage===3){for(let i=0;i<alley.lamps.length;i++){if(intersect(alley.lamps[i].mount)){sim.ringLamp(i);return;}}}
      let p=floorPoint();const f=pair.find(o=>intersect(o.root));if(f)p=marker.position.clone();
      if(!area(s,p))return;held={...common,kind:'floor',point:p,last:p.clone(),pressure:e.pressure||.5};sim.touch();
    }
    canvasEl.setPointerCapture(e.pointerId);
  });
  canvasEl.addEventListener('pointermove',e=>{
    if(!held||e.pointerId!==held.id)return;pointRay(e);
    if(Math.hypot(e.clientX-held.x,e.clientY-held.y)>5)held.moved=true;
    if(held.kind==='floor'){
      const s=sim.read(),p=floorPoint();if(!p||!area(s,p)||!held.moved)return;
      const d=p.distanceTo(held.last);
      if(d>.025){if(s.stage>1)sim.stir(p.x,p.z,Math.sign(p.x-held.last.x||1)*d);else if(d>.24)sim.floorNote(p.x,p.z,held.pressure);
        if(s.stage>1||d>.24)held.last=p.clone();}
    }else{const hs=shoeHit();if(hs&&(!held.canWalk||held.moved))brushHit(hs,e);
      else if(!hs){sim.release();let q=ray.ray.intersectPlane(new T.Plane(up,-1.025),V());
        if(q&&Math.abs(q.x)<1.6&&Math.abs(q.z)<.83){held.free=q;sim.moveCloth(q);}else held.free=null;}}
  });
  function finish(e,cancel){if(!held||e.pointerId!==held.id)return;const hld=held;held=null;sim.release();
    if(!cancel){if(hld.canWalk&&!hld.moved)sim.startWalk();
      if(hld.kind==='floor'&&(!hld.moved||sim.read().stage===1)){const s=sim.read(),p=hld.point,z=(s.feet[0].z+s.feet[1].z)*.5;
        if(p.z>z-.16&&s.stage===1)sim.floorNote(p.x,p.z,hld.pressure);
        else sim.footstep(p.x,p.z,hld.pressure);}}
    if(canvasEl.hasPointerCapture(e.pointerId))canvasEl.releasePointerCapture(e.pointerId);}
  canvasEl.addEventListener('pointerup',e=>finish(e,false));canvasEl.addEventListener('pointercancel',e=>finish(e,true));canvasEl.addEventListener('lostpointercapture',e=>finish(e,true));
  button.addEventListener('click',()=>{const enabled=audio.toggle();button.classList.toggle('muted',!enabled);button.setAttribute('aria-pressed',String(enabled));});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){held=null;sim.release();if(audio.ctx)audio.ctx.suspend();}else if(audio.ctx&&!audio.muted)audio.ctx.resume().catch(()=>{});});
  let prev=null;
  function frame(now){const dt=prev===null?0:Math.min(.075,(now-prev)/1000);prev=now;
    if(!document.hidden){sim.step(dt);for(const e of sim.drain())audio.play(e);audio.update(sim.read());render();}
    requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
