'use strict';
(() => {
  const {T,V,TAU,mat,materials:m,group,mesh,egg,box,rand}=Craft;
  const {N,M,AX,AZ,clamp,wave}=Paste;
  const model=Paste.create(),s=model.s;
  window.__GAME__={step:model.step,getState:model.getState};
  const canvas=document.getElementById('work');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(1.65,devicePixelRatio||1));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
  const scene=new T.Scene();scene.background=new T.Color(0xd8cdb2);scene.fog=new T.FogExp2(0xd6cab4,.046);
  const camera=new T.PerspectiveCamera(34,1,.08,70);
  const hemi=new T.HemisphereLight(0xe3eee8,0xb29a89,1.03);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffe5bb,3.1);sun.position.set(-4.3,7.0,-2.8);sun.target.position.set(0,.3,0);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-6.0,right:6.0,top:6.4,bottom:-5.5,near:.4,far:19});sun.shadow.normalBias=.012;sun.shadow.bias=-.00024;
  const world=group(scene);
  const finishingTasks=[];Workshop.shop(world,finishingTasks);
  const tray=Workshop.tray(world,4.0,1.85);
  const vase=Workshop.vase(world);
  const board=Workshop.board(world);board.position.z=.38;
  const dish=Workshop.dish(world),knife=Workshop.tool(world),paper=Workshop.kaishi(world);
  const kettle=Workshop.kettle(world);kettle.position.set(4.08,.02,-3.73);kettle.rotation.y=-.35;
  const hand=Workshop.hand(world,true),support=hand.clone(true);world.add(support);support.scale.z=-1;
  const pinchBits=dish.userData.pinch;
  const daub=egg(world,mat(0xf6dcc8,.61,'clay'),0,0,0,.08,.035,.071);
  const sweet=group(world),spinning=group(sweet);
  const sugarMaterial=mat(0xffffff,.68,'clay',{vertexColors:true});
  const sugarCompile=sugarMaterial.onBeforeCompile;
  sugarMaterial.onBeforeCompile=sh=>{
    sugarCompile(sh);
    sh.vertexShader='attribute float moisture;varying float damp;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndamp=moisture;');
    sh.fragmentShader='varying float damp;\n'+sh.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor-=(damp-.5)*.26;');
  };
  sugarMaterial.customProgramCacheKey=()=>'moist-paste';
  const RA=N*2,RM=M*2,vertices=RA*(RM+1),pos=new Float32Array(vertices*3),colors=pos.slice();
  const ids=[],metadata=[],fixed=new Float32Array(vertices);
  const trig=[];
  for(let i=0;i<RA;i++)trig.push([Math.cos(TAU*i/RA),Math.sin(TAU*i/RA)]);
  for(let j=0;j<=RM;j++)for(let i=0;i<RA;i++){
    const v=j*RA+i,i0=i>>1,i1=(i0+1)%N,j0=j>>1,j1=Math.min(M,j0+1);
    metadata.push([j0*N+i0,j0*N+i1,j1*N+i0,j1*N+i1,(i%2)*.5,(j%2)*.5]);
    const a=TAU*i/RA,u=j/RM;
    fixed[v]=.007*Math.sin(7*a+.4)*Math.sin(Math.PI*u)**2+.004*Math.sin(11*a+u*16)*Math.sin(Math.PI*u);
    if(j<RM){const a=v,b=j*RA+(i+1)%RA,c=a+RA,d=b+RA;ids.push(a,b,c,b,d,c);}
  }
  const geo=new T.BufferGeometry();geo.setIndex(ids);
  geo.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('color',new T.BufferAttribute(colors,3).setUsage(T.DynamicDrawUsage));
  const wet=new Float32Array(vertices);geo.setAttribute('moisture',new T.BufferAttribute(wet,1).setUsage(T.DynamicDrawUsage));
  geo.boundingSphere=new T.Sphere(V(0,.82,0),1.8);
  const pastry=mesh(spinning,geo,sugarMaterial);
  const red=new T.Color(0xb42c49),ivory=new T.Color(0xfff1db),pink=new T.Color(0xe9909e);
  const color=new T.Color();
  function sample(f,v){const [a,b,c,d,i,j]=metadata[v];return (f[a]*(1-i)+f[b]*i)*(1-j)+(f[c]*(1-i)+f[d]*i)*j;}
  function shape(){
    for(let j=0;j<=RM;j++){
      const u=j/RM,latitude=.026+u*(Math.PI*.871),ring=Math.sin(latitude),cap=Math.cos(latitude);
      const baseR=1.105*ring**.91,baseY=.805*(cap-Math.cos(Math.PI*.871+.026));
      const crown=Math.exp(-((u/.21)**2)),edge=Math.exp(-(((u-.265)/.148)**2));
      for(let i=0;i<RA;i++){
        const v=j*RA+i,[cx,cz]=trig[i],g=sample(s.groove,v),w=sample(s.white,v),lift=sample(s.raised,v),cut=sample(s.displaced,v),print=sample(s.print,v);
        const rim=.5*(s.rim[i>>1]+s.rim[((i+1)>>1)%N]),lobe=Math.min(1,rim/6.4);
        const lip=.072*s.hollow*Math.sin(Math.PI*Math.min(1,u/.45))*(.31+.69*lobe);
        let r=baseR*(1+fixed[v])+lift*.025+lip-cut*.034-g*.031+edge*lobe*.13;
        if(j===0)r=0;
        const grain=.0016*Math.sin(i*38+j*71)*Math.sin(Math.PI*u);
        const y=baseY+.050*w+lift*.050-cut*.022-g*.036-print*.040-s.hollow*.05*crown+edge*lobe*.10+fixed[v]*.95+grain;
        wet[v]=sample(s.moisture,v);pos[v*3]=cx*r;pos[v*3+1]=y;pos[v*3+2]=cz*r;
        const opacity=1-Math.exp(-w*2.04);
        const blush=.067+.047*cx+.026*Math.sin(u*7+cz*3)+.12*edge*lobe;
        color.copy(red).lerp(pink,blush).lerp(ivory,opacity);
        color.multiplyScalar((.95+.06*cap+.017*Math.sin(i*.74+j*.51))*(1-.079*g)*(1+.042*(sample(s.moisture,v)-.5)));
        colors[v*3]=color.r;colors[v*3+1]=color.g;colors[v*3+2]=color.b;
      }
    }
    geo.attributes.position.needsUpdate=true;geo.attributes.color.needsUpdate=true;geo.attributes.moisture.needsUpdate=true;geo.computeVertexNormals();
    const normals=geo.attributes.normal;for(let i=0;i<RA;i++)normals.setXYZ(i,0,1,0);
    normals.needsUpdate=true;
    sugarMaterial.roughness=.83-s.moisture[0]*.25-.04*s.whiteOnFinger/(1+s.whiteOnFinger);
  }
  const crumbGeo=new T.IcosahedronGeometry(1,1),crumbMat=mat(0xf8c355,.69,'clay');
  const crumbs=new T.InstancedMesh(crumbGeo,crumbMat,53);crumbs.count=0;crumbs.frustumCulled=false;crumbs.castShadow=crumbs.receiveShadow=true;spinning.add(crumbs);
  const inst=new T.Object3D();
  function centerBits(){
    crumbs.count=s.crumbs.length;
    const floor=pos[1]+.012;
    s.crumbs.forEach((p,i)=>{
      inst.position.set(p.x,floor+p.y,p.z);inst.rotation.set(i*5.1,i*3.1,i*.74);inst.scale.set(p.size*1.04,p.size*.82,p.size*1.21);inst.updateMatrix();crumbs.setMatrixAt(i,inst.matrix);
    });
    crumbs.instanceMatrix.needsUpdate=true;
  }
  const flourGroup=group(board),flourMat=mat(0xe6ceaa,.96,'clay');
  const flour=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),flourMat,230);flourGroup.add(flour);
  for(let i=0;i<230;i++){const a=rand()*TAU,r=1.02+rand()*.95,sz=.003+rand()**3*.018;
    inst.position.set(Math.cos(a)*r,.529+sz*.24,Math.sin(a)*r);inst.scale.set(sz*1.3,sz*.3,sz);inst.rotation.set(0,rand()*TAU,0);inst.updateMatrix();flour.setMatrixAt(i,inst.matrix);}
  const dust=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xf1dfaf,.85,'plain',{transparent:true,opacity:.36,depthWrite:false}),17);dust.frustumCulled=false;world.add(dust);
  const mistMat=mat(0xe5ddcd,.98,'plain',{transparent:true,opacity:.056,depthWrite:false,side:T.DoubleSide});
  // Each curled wisp thins to transparent edges across its curved surface.
  const compileMist=mistMat.onBeforeCompile;mistMat.onBeforeCompile=sh=>{compileMist(sh);sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',`
    diffuseColor.a*=pow(max(0.,1.-abs(craftP.x)),2.)*pow(max(0.,1.-abs(craftP.y)),1.8);
    #include <opaque_fragment>`);};mistMat.customProgramCacheKey=()=>'steam';
  const steamGeo=Craft.grid(8,14,(u,v)=>[(u-.5)*2,(v-.5)*2,.16*Math.cos(v*5+u*2)]);
  const steam=Array.from({length:9},()=>{const o=mesh(world,steamGeo,mistMat);o.castShadow=o.receiveShadow=false;return o;});
  function air(){
    s.particles.forEach((p,i)=>{
      if(p.steam){const o=steam[i],f=clamp(p.y/1.4);o.position.set(kettle.position.x-.7+p.x+Math.sin(6*f+i)*.075,kettle.position.y+.8+p.y,kettle.position.z+p.z+.12);
        const fade=Math.sin(Math.PI*f);o.scale.set((.03+.13*f)*fade,.21*fade,.10);o.rotation.z=.13+p.v;}
      else{inst.position.set(p.x,p.y,p.z);inst.scale.setScalar(.004+p.k*.004);inst.updateMatrix();dust.setMatrixAt(i-9,inst.matrix);}
    });dust.instanceMatrix.needsUpdate=true;
  }
  let portrait=0,parkX=-.70,parkZ=-2.82,paperX=-2.0,aspect=1;
  let targetBuffer=null,finishScene=null,finishMat=null,lastW=0,lastH=0;
  const ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
  function resize(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
    if(w===lastW&&h===lastH)return;lastW=w;lastH=h;aspect=w/h;portrait=1-wave(.61,1.24,aspect);
    renderer.setSize(w,h,false);camera.aspect=aspect;
    const targetY=1.38+portrait*.26,dist=9.05-portrait*1.35,el=(23.5+portrait*9.5)*Math.PI/180;
    camera.position.set(.24, targetY+dist*Math.sin(el),.05+dist*Math.cos(el));camera.lookAt(0,targetY,.05);
    const height=Math.max(5.52,5.42/aspect);
    camera.fov=2*Math.atan(height/2/dist)*180/Math.PI;camera.updateProjectionMatrix();
    vase.position.set(-2.34+portrait*.72,.154,-2.40-portrait*.53);
    vase.scale.setScalar(.91+.09*portrait);
    tray.position.set(-1.68+portrait*.51,.002,-2.78-portrait*.30);tray.rotation.y=.055;
    parkX=-.67+portrait*.45;parkZ=-2.76-portrait*.26;paperX=-2.09+portrait*.48;
    if(targetBuffer){const size=renderer.getDrawingBufferSize(new T.Vector2());targetBuffer.setSize(size.x,size.y);finishMat.uniforms.pixel.value.set(1/size.x,1/size.y);}
  }
  const lerp=T.MathUtils.lerp;
  let priorStage='',archived=null;
  const rest=V(),aim=V(),scratch=V(),fingerRest=V(),tip=V(),paperHome=V(),paperPlace=V(),handGoal=V();
  function surfaceAt(x,z,out){
    const u=clamp(Math.hypot(x,z)*.50,0,.96),a=(Math.atan2(z,x)/TAU+1)%1;
    const k=(Math.round(u*RM)*RA+Math.round(a*RA)%RA)*3;
    out.set(pos[k],pos[k+1],pos[k+2]);spinning.localToWorld(out);return out;
  }
  let smoothHand=false;const supportPrev=V(),supportAttitude=new T.Quaternion();
  function layout(dt){
    const k=s.stage,cycleStart=s.cycle>0&&k==='white'?1-wave(0,1.58,s.age):0;
    board.rotation.y=-s.angle;
    dish.position.set(lerp(2.52-portrait*.68,1.88-portrait*.36,s.dish),.014+.522*s.dish+.17*Math.sin(s.dish*Math.PI),lerp(-2.09,-.57,s.dish));
    dish.rotation.y=-.16-.16*s.dish;
    const away=clamp(s.delivery),carrying=k==='carry'||k==='renew';
    paperHome.set(-5.15,.055,.86);paperPlace.set(paperX,.67,.53);
    paper.position.copy(paperHome).lerp(paperPlace,s.paper);
    paper.rotation.set(0,-.25+.16*s.paper,0);
    if(carrying){
      paper.position.copy(paperPlace).lerp(aim.set(parkX,.192,parkZ),away);
      paper.position.y+=s.carryLift*.05;
      paper.rotation.x=s.tilt;
    }
    sweet.position.set(0,.527,.38);sweet.rotation.set(0,0,0);spinning.rotation.y=-s.angle;
    if(k==='paper'||carrying){
      const q=carrying?1:wave(0,1,s.slide);
      sweet.position.lerp(aim.copy(paper.position).add(scratch.set(.02,.072,0)),q);sweet.rotation.x=paper.rotation.x*q;
    }
    if(cycleStart){sweet.position.x=3.22*cycleStart;sweet.position.y+=.24*Math.sin(cycleStart*Math.PI);sweet.rotation.z=-cycleStart*2.9;}
    sweet.visible=k!=='renew';
    if(k==='renew'&&priorStage!=='renew'){
      if(archived){archived.removeFromParent();archived.traverse(o=>{if(o.userData.disposable)o.geometry.dispose();});}
      archived=group(world);archived.position.set(parkX,.264,parkZ);archived.rotation.y=spinning.rotation.y;
      const a=mesh(archived,geo.clone(),sugarMaterial);a.userData.disposable=true;
      const b=crumbs.clone();archived.add(b);
      const served=Workshop.kaishi(archived);served.position.y=-.068;served.rotation.y=-.11+ s.angle;
    }
    if(archived&&k==='carry')archived.position.x=parkX-7*wave(.05,.7,away);
    if(archived&&k==='white')archived.position.x=parkX;
    if(k==='renew')paper.visible=false;else paper.visible=true;
    sweet.updateWorldMatrix(true,true);
    const c=s.stroke||s.auto;
    const a=s.bladeAngle+s.angle;
    const push=c?.kind==='push'?clamp(c.path*.8+(c.remaining?(.46-c.remaining)*1.15:0)):0;
    rest.set(2.93-portrait*.68,.10,-.70);
    aim.set(Math.cos(a)*(1.02-push*.31),.81+push*.87,.38+Math.sin(a)*(1.02-push*.31));
    if(k==='petal' && !c && s.hintKind!=='turn' && s.hint>.001){
      // The bevel hovers just above the skirt before tracing an upward scoop.
      const stroke=wave(.20,.78,s.hintAge/3),r=1.09-.39*stroke;
      aim.x=Math.cos(a)*lerp(1.02,r,s.hint);aim.z=.38+Math.sin(a)*lerp(1.02,r,s.hint);
      aim.y+=s.hint*(.13+.78*stroke);
    }
    if(k==='gather' && !c && s.hint>.001){
      surfaceAt(.36*(1-s.hint),.03,tip);tip.y+=.20;
      aim.lerp(tip,s.hint);
    }
    if(k==='gather'&&c?.kind==='gather'){aim.set(.22*(1-s.gather),sweet.position.y+pos[1]+.16,.49);}
    knife.position.copy(rest).lerp(aim,s.tool);knife.position.y+=.33*Math.sin(s.tool*Math.PI);
    knife.rotation.set(0,s.bladeYaw,.08+.20*push);knife.rotation.order='YXZ';
    fingerRest.set(2.62-portrait*.75,.58,-.51);
    handGoal.copy(fingerRest);
    let yaw=.31,roll=.17;
    if(k==='white'){
      const d=wave(.2,1.12,s.age);
      const intro=s.age<2.25?1-wave(1.15,2.25,s.age):0;
      const f=clamp(Math.max(intro,s.hint));
      surfaceAt(-.09+.19*d+.20*s.hint,.01+.09*d+.06*s.hint,tip);
      tip.y+=.016+.10*(1-f);
      handGoal.lerp(tip,f);roll=.30*f+.12;
      if(c?.kind==='smear')handGoal.copy(fingerRest);
    }else if(k==='petal'||k==='gather'){
      const pickup=Math.sin(s.tool*Math.PI),demo=s.hintKind==='turn'?0:s.hint;
      knife.updateWorldMatrix(true,false);tip.set(.90,.08,.04);knife.localToWorld(tip);
      handGoal.lerp(tip,Math.max(pickup,demo*.96,(c?.kind==='push'||c?.kind==='gather') ? .94 : 0));
      if(s.hint>.001&&k==='petal'){handGoal.y+=.23*wave(.7,1,demo);}
      if(k==='gather'&&s.hint>.001){surfaceAt(.13,.04,tip);tip.y+=.18;handGoal.lerp(tip,demo);}
    }else if(k==='pinch'||k==='lift'||k==='fall'){
      tip.copy(dish.position).add(scratch.set(-.06,.45,.02));
      handGoal.lerp(tip,Math.max(.33,s.hint));
      if(c?.kind==='pinch'||k==='lift'||k==='fall'){
        const f=k==='fall'?1-wave(.18,1.30,s.age):k==='lift'?wave(0,1,s.age):0;
        handGoal.copy(dish.position).add(scratch.set(-.3,.45,.02));
        surfaceAt(.02,.03,tip);tip.y+=1.83;tip.x-=.32;handGoal.lerp(tip,f);
      }
    }else if(k==='paper'){surfaceAt(.52,.20,tip);tip.y+=.06;handGoal.lerp(tip,s.hint);handGoal.x-=.42*s.hint**2;}
    if(!smoothHand||dt===0)hand.position.copy(handGoal);else hand.position.lerp(handGoal,1-Math.exp(-dt*11));smoothHand=true;
    hand.rotation.set(0,yaw,roll);
    const grip=k==='lift'||c?.kind==='pinch'?1:k==='fall'?1-wave(0,.28,s.age):k==='pinch'?s.hint*.75:0;
    hand.traverse(o=>{if(o.morphTargetInfluences?.length)o.morphTargetInfluences[0]=grip;});
    hand.updateWorldMatrix(true,false);
    if(k==='lift'){
      if(pinchBits.parent!==world)world.attach(pinchBits);
      hand.localToWorld(tip.set(.31,-.065,.093));
      pinchBits.position.copy(tip);pinchBits.position.y-=.36;
    }else if(pinchBits.parent!==dish){dish.add(pinchBits);pinchBits.position.set(0,0,0);pinchBits.rotation.set(0,0,0);}
    pinchBits.visible=!['fall','gather','paper','carry','renew'].includes(k);
    daub.visible=k==='white'&&((c?.kind==='smear')||(s.age>.78&&s.age<2.2));
    if(daub.visible){
      if(c?.kind==='smear'){surfaceAt(c.x,c.z,daub.position);daub.position.y+=.021;}
      else {hand.localToWorld(daub.position.set(.05,.025,.034));}
      const sz=.039+.055*clamp(s.whiteOnFinger/70);daub.scale.set(sz,.34*sz,.73*sz);
    }
    supportPrev.copy(support.position);supportAttitude.copy(support.quaternion);
    support.position.set(-2.025,.195,.80);support.rotation.set(.04,Math.PI+.16,-.045);
    if(k==='petal'&&s.hintKind==='turn'){
      support.position.x+=.19*s.hint;support.position.z-=.47*s.hint;support.position.y+=.28*s.hint;
    }
    if(k==='paper'||carrying){
      support.position.lerp(aim.copy(paper.position).add(scratch.set(.60,-.205,.10)),carrying?1:s.paper);
      support.rotation.z=-.06-.13*Math.sin(away*Math.PI);support.rotation.x=2.65*s.paper;
    }
    if(dt>0){
      const remain=Math.exp(-dt*8.5);
      support.position.lerp(supportPrev,remain);support.quaternion.slerp(supportAttitude,remain);
    }
    priorStage=k;
    sun.intensity=3.17*s.lux+(.13*s.gather);sun.position.x=-4.3+s.wind*.11;
  }
  let ac=null,noiseBuffer,woodBus,woodFilter,rubBus,rubFilter,master,oldPeel=0,lastSoundStage='';
  function noiseLoop(filterType,freq,q){
    const src=ac.createBufferSource(),fil=ac.createBiquadFilter(),gain=ac.createGain();
    src.buffer=noiseBuffer;src.loop=true;fil.type=filterType;fil.frequency.value=freq;fil.Q.value=q;gain.gain.value=0;
    src.connect(fil).connect(gain).connect(master);src.start();return [gain,fil];
  }
  function audioStart(){
    if(!ac){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ac=new AC();master=ac.createGain();master.gain.value=.60;master.connect(ac.destination);
      noiseBuffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);
      const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=2*rand()-1;
      [woodBus,woodFilter]=noiseLoop('bandpass',174,.82);
      [rubBus,rubFilter]=noiseLoop('bandpass',1240,.68);
    }
    if(ac.state==='suspended')ac.resume().catch(()=>{});
  }
  function whisk(amount){
    if(!ac)return;
    const t=ac.currentTime,src=ac.createBufferSource(),filter=ac.createBiquadFilter(),g=ac.createGain();
    src.buffer=noiseBuffer;filter.type='bandpass';filter.Q.value=.83;filter.frequency.setValueAtTime(s.peelHz,t);filter.frequency.exponentialRampToValueAtTime(1100,t+.17);
    src.connect(filter).connect(g).connect(master);g.gain.setValueAtTime(.0002,t);g.gain.exponentialRampToValueAtTime(.098+amount*.08,t+.020);g.gain.exponentialRampToValueAtTime(.0002,t+.19);
    src.start(t,.31+rand());src.stop(t+.20);src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect();};
  }
  function tickSound(f,vol,delay=0){
    if(!ac)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();
    o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.76,t+.12);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+.16);
    o.connect(g).connect(master);o.start(t);o.stop(t+.17);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function sounds(){
    if(!ac)return;const t=ac.currentTime;
    woodBus.gain.setTargetAtTime(s.woodGain,t,.035);woodFilter.frequency.setTargetAtTime(s.woodHz,t,.05);
    rubBus.gain.setTargetAtTime(Math.min(.13,s.rub*.18),t,.037);rubFilter.frequency.setTargetAtTime(s.frictionHz,t,.04);
    if(s.peel>oldPeel+.09)whisk(s.peel);
    if(s.stage!==lastSoundStage){
      if(s.stage==='gather')for(let i=0;i<4;i++)tickSound(490+rand()*270,.009+rand()*.01,i*.044);
      if(s.stage==='petal')tickSound(275,.045,.62);
      if(s.stage==='white'&&s.cycle)tickSound(143,.06,1.19);
    }
    oldPeel=s.peel;lastSoundStage=s.stage;
  }
  const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(V(0,1,0),-.83);
  const pWorld=V(),local=V(),lastPlane=V();
  let pointer=null,lastPhi=0,startY=0,startX=0,contactX=0,contactZ=0,materialAngle=0;
  function pointRay(e){const r=canvas.getBoundingClientRect();ndc.set(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height);ray.setFromCamera(ndc,camera);}
  function pointOnBoard(out){ray.ray.intersectPlane(plane,out);return out;}
  function surfaceContact(hit){
    local.copy(hit.point);spinning.worldToLocal(local);
    const vs=[hit.face.a,hit.face.b,hit.face.c],weights=hit.barycoord;
    let u=0;
    for(let j=0;j<3;j++)u+=Math.floor(vs[j]/RA)/RM*(weights?weights.getComponent(j):1/3);
    const a=Math.atan2(local.z,local.x);
    return {x:Math.cos(a)*u*2,z:Math.sin(a)*u*2,w:vs.reduce((v,id)=>v+sample(s.white,id),0)/3};
  }
  const strongest=(obj)=>ray.intersectObject(obj,true)[0];
  function down(e){
    if(pointer!==null||e.button>0)return;
    audioStart();pointRay(e);scene.updateMatrixWorld();
    const sweetHit=sweet.visible?strongest(pastry):null,toolHit=s.tool>.25?strongest(knife):null,
      dishHit=strongest(dish),boardHit=strongest(board);
    const surface=sweetHit?surfaceContact(sweetHit):null;
    const seen=(hit)=>hit&&(!sweetHit||hit.distance<sweetHit.distance+.035);
    pointOnBoard(pWorld);let kind=null,x=surface?.x||0,z=surface?.z||0,face=.50;
    if(s.stage==='white'&&surface&&surface.w>.075)kind='smear';
    if(s.stage==='petal'||s.stage==='pinch'){
      if(seen(toolHit)){
        kind='push';local.copy(toolHit.point);knife.worldToLocal(local);face=clamp(.10+Math.min(local.x,.75)*1.4);
        x=.91*Math.cos(s.bladeAngle);z=.91*Math.sin(s.bladeAngle);
      }else if(surface&&Math.hypot(x,z)>.36){kind='push';face=clamp(.43+(e.width||1)*.012,.43,.89);}
    }
    if(s.stage==='pinch'&&seen(dishHit))kind='pinch';
    if(s.stage==='gather'&&(seen(toolHit)||sweetHit))kind='gather';
    if(s.stage==='paper'&&sweetHit)kind='slide';
    if(!kind&&boardHit&&!sweetHit&&!seen(dishHit)&&!seen(toolHit)){
      const r=Math.hypot(boardHit.point.x,boardHit.point.z-board.position.z);
      if(r>1.73 && r<2.36)kind='turn';
    }
    if(!kind||!model.begin(kind,x,z,{face,force:e.pressure>0&&e.pressure!==.5?.48+.52*e.pressure:.80})){
      if(dishHit||boardHit||toolHit||sweetHit)s.touchGlow=.038;
      return;
    }
    e.preventDefault();pointer=e.pointerId;canvas.setPointerCapture(pointer);
    contactX=x;contactZ=z;lastPlane.copy(pWorld);startX=e.clientX;startY=e.clientY;
    lastPhi=Math.atan2(pWorld.z-board.position.z,pWorld.x);materialAngle=Math.atan2(z,x);
  }
  function move(e){
    if(pointer!==e.pointerId||!s.stroke)return;e.preventDefault();pointRay(e);pointOnBoard(pWorld);
    const c=s.stroke,k=c.kind;
    if(k==='turn'){
      const a=Math.atan2(pWorld.z-board.position.z,pWorld.x);
      model.move(0,0,Paste.delta(a,lastPhi));lastPhi=a;return;
    }
    if(k==='smear'){
      const hit=strongest(pastry);
      if(hit){const q=surfaceContact(hit);const r=Math.hypot(q.x,q.z),factor=Math.min(1,1.16/(r+.00001));model.move(q.x*factor,q.z*factor);}
      else{const dx=pWorld.x-lastPlane.x,dz=pWorld.z-lastPlane.z,a=-s.angle;
        const x=contactX+.66*(dx*Math.cos(a)-dz*Math.sin(a)),z=contactZ+.66*(dz*Math.cos(a)+dx*Math.sin(a)),r=Math.hypot(x,z),f=Math.min(1,1.16/(r+.00001));model.move(x*f,z*f);}
    }else if(k==='push'){
      const r=Math.hypot(contactX,contactZ),outX=Math.cos(materialAngle+s.angle),outZ=Math.sin(materialAngle+s.angle);
      const advance=clamp((lastPlane.x-pWorld.x)*outX+(lastPlane.z-pWorld.z)*outZ+Math.max(0,startY-e.clientY)/Math.min(lastW,lastH)*1.45,0,r*.85);
      model.move((r-advance)*Math.cos(materialAngle),(r-advance)*Math.sin(materialAngle));
    }else model.move(contactX+(e.clientX-startX)*4/Math.min(lastW,lastH),contactZ+(e.clientY-startY)*4/Math.min(lastW,lastH));
  }
  function release(e){if(pointer!==e.pointerId)return;model.end();pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  addEventListener('blur',()=>{if(pointer!==null){model.end();pointer=null;}if(ac?.state==='running')ac.suspend().catch(()=>{});});
  function reflections(){
    // Capture the actual shop from the work surface, one cube face per frame.
    const rt=new T.WebGLCubeRenderTarget(64,{type:targetBuffer.texture.type});
    const probe=new T.CubeCamera(.09,35,rt);probe.position.set(.92,1.54,-.65);
    probe.coordinateSystem=renderer.coordinateSystem;probe.updateCoordinateSystem();probe.updateMatrixWorld(true);
    let face=0;
    function expose(){
      const last=renderer.getRenderTarget(),update=renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(rt,face);renderer.render(scene,probe.children[face]);renderer.setRenderTarget(last);renderer.shadowMap.autoUpdate=update;
      if(++face<6){requestAnimationFrame(expose);return;}
      rt.texture.needsPMREMUpdate=true;scene.environment=rt.texture;scene.environmentIntensity=.46;
    }
    requestAnimationFrame(expose);
  }
  function finish(){
    const size=renderer.getDrawingBufferSize(new T.Vector2());
    targetBuffer=new T.WebGLRenderTarget(size.x,size.y,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)});
    finishMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:targetBuffer.texture},pixel:{value:new T.Vector2(1/size.x,1/size.y)}},
      vertexShader:'varying vec2 coord;void main(){coord=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`varying vec2 coord;uniform sampler2D picture;uniform vec2 pixel;
      void main(){vec3 c=texture2D(picture,coord).rgb;vec3 halo=vec3(0.);
        for(int i=0;i<8;i++){float a=float(i)*.785398;vec3 p=texture2D(picture,coord+pixel*vec2(cos(a),sin(a))*5.).rgb;halo+=max(p-vec3(1.05),0.);}
        vec2 d=(coord-.5)*vec2(1.,.88);c=(c+halo*.0065)*(1.-.18*dot(d,d));
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.0034;
      }`});
    finishScene=new T.Scene();finishScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finishMat));reflections();
  }
  function render(dt){resize();shape();layout(dt);centerBits();air();sounds();
    dish.rotation.z=s.touchGlow*.22;board.rotation.z=s.touchGlow*.026;
    renderer.setRenderTarget(targetBuffer);renderer.render(scene,camera);
    if(targetBuffer){renderer.setRenderTarget(null);renderer.render(finishScene,ortho);}
  }
  let prev=performance.now();
  render(0);
  function frame(now){let dt=Math.min(.086,Math.max(0,(now-prev)/1000));prev=now;model.step(dt);render(dt);requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  finishingTasks.push(finish);
  function finishDetails(){const task=finishingTasks.shift();if(task)task();if(finishingTasks.length)requestAnimationFrame(finishDetails);}
  requestAnimationFrame(()=>requestAnimationFrame(finishDetails));
  document.addEventListener('visibilitychange',()=>{prev=performance.now();if(document.hidden&&ac?.state==='running')ac.suspend().catch(()=>{});});
})();
