'use strict';
(() => {
  const T=THREE,{group,mesh,mat,M,wire,star,vec,tau}=Craft;
  const works=MusicalWorks.create(),sound=makeSound(),s=works.s;
  function step(dt){works.step(dt);sound.play(works.events());}
  window.__GAME__={step,getState:works.getState};
  const canvas=document.querySelector('#view'), overlay=document.querySelector('#guide'), ink=overlay.getContext('2d');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(28,1,.12,120);
  scene.background=new T.Color(0xd9e4df);scene.fog=new T.Fog(0xdbe4df,15,55);
  // A locally generated radiance probe gives polished brass long window reflections.
  function roomProbe(){
    const faces=[];
    for(let f=0;f<6;f++){
      const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),im=ctx.createImageData(128,128);
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){
        const a=(x+.5)/64-1,b=(y+.5)/64-1;
        const v=[[1,-b,-a],[-1,-b,a],[a,1,b],[a,-1,-b],[a,-b,1],[-a,-b,-1]][f];
        const n=Math.hypot(...v),yy=v[1]/n,zz=v[2]/n,xx=v[0]/n;
        let color=yy<-.12?[153,115,79]:yy>.68?[226,219,193]:[140,135,114];
        if(zz<-.16 && yy>-.3)color=Math.abs(xx*2.6-Math.round(xx*2.6))<.046?[165,151,125]:[247,252,244];
        if(xx>.62 && yy<.49 && yy>-.20)color=[84,75,59];
        if(zz>.6 && yy>.07 && yy<.40)color=[211,203,180];
        const k=(y*128+x)*4;for(let j=0;j<3;j++)im.data[k+j]=color[j];im.data[k+3]=255;
      }ctx.putImageData(im,0,0);faces.push(c);
    }
    const cube=new T.CubeTexture(faces);cube.colorSpace=T.SRGBColorSpace;cube.needsUpdate=true;
    const gen=new T.PMREMGenerator(renderer),radiance=gen.fromCubemap(cube);scene.environment=radiance.texture;scene.environmentIntensity=.70;cube.dispose();gen.dispose();
  }
  roomProbe();
  const hemi=new T.HemisphereLight(0xe2efff,0xc9a47c,1.35);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffe5b9,3.30);sun.position.set(-5,8,-4.5);sun.target.position.set(0,.8,0);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-7.7,right:7.7,top:7.7,bottom:-7.7,near:.5,far:24});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.00022;sun.shadow.normalBias=.009;scene.add(sun,sun.target);
  const box=makeBox(scene),room=makeWindow(scene,box);
  const marker=group(scene),signal=mat(0xffda84,.35,.27,{emissive:0xffc163,emissiveIntensity:.48,transparent:true,opacity:.84});
  const arc=Array.from({length:27},(_,i)=>{const a=-.35+i*.152;return [Math.cos(a)*.86,Math.sin(a)*.49,0];});
  wire(marker,signal,arc,.012);const last=arc[26];wire(marker,signal,[[last[0]+.004,last[1]+.105,0],last,[last[0]-.131,last[1]+.009,0]],.015);
  const glint=star(marker,M.shine,.84,.01,.013,.071);
  const cue=group(scene),beacon=star(cue,signal,0,0,0,.086);const bead=star(cue,M.pearl,.102,.09,0,.033);
  const ray=new T.Raycaster(),pointer=new T.Vector2();
  // Invisible ray volumes belong to each mechanism. No background action is bound.
  const hitMat=new T.MeshBasicMaterial({visible:false});
  const hit=[];
  function volume(parent,name,geometry,x,y,z){
    const o=mesh(parent,geometry,hitMat,x,y,z);o.userData.part=name;o.castShadow=o.receiveShadow=false;hit.push(o);return o;
  }
  volume(box.root,'key',new T.BoxGeometry(1.7,1.05,.48),1.68,.70,1.84);
  const drumHit=volume(box.deck,'pin',new T.CylinderGeometry(.51,.51,2.65,40),.74,1.733,-.28);drumHit.rotation.z=Math.PI/2;
  volume(box.deck,'doll',new T.BoxGeometry(1.18,1.7,1.06),-1.59,2.02,.59);
  volume(box.lid,'lid',new T.BoxGeometry(5.22,2.94,.46),0,1.4,.036);
  volume(box.root,'body',new T.BoxGeometry(5.25,1.18,2.99),0,.58,0);
  const toyVolumes=box.minis.map(m=>volume(m,'toy',new T.BoxGeometry(.99,.94,.40),0,.14,.09));
  const half=renderer.extensions.has('EXT_color_buffer_float');
  const target=new T.WebGLRenderTarget(1,1,{type:half?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
  target.samples=Math.min(2,renderer.capabilities.maxSamples);
  const screenScene=new T.Scene(),screenCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const post=new T.ShaderMaterial({uniforms:{image:{value:target.texture},texel:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D image;uniform vec2 texel;varying vec2 p;
      void main(){
        vec3 c=texture2D(image,p).rgb;vec3 bloom=vec3(0.);
        for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a));
          vec3 b=texture2D(image,p+d*texel*4.).rgb;
          bloom+=b*smoothstep(.82,1.75,dot(b,vec3(.213,.715,.072)));
        }
        c=c*1.02+bloom*.005;
        c=c*(2.51*c+.03)/(c*(2.43*c+.59)+.14);
        c*=1.-.14*pow(clamp(length((p-.5)*1.46),0.,1.),2.);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
        gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.0027;
      }`,depthTest:false,depthWrite:false});
  screenScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
  let W=1,H=1,dpr=1;
  const look=new T.Vector3(),dir=new T.Vector3(),projected=new T.Vector3();
  function cameraPlace(){
    const a=W/H,portrait=a<.82,back=s.pullback;
    // Preserve the complete winding bow, lid and feet at either orientation.
    const vertical=Math.max(portrait?5.55:6.74, (portrait?6.63:7.22)/a);
    const distance=vertical/(2*Math.tan(14*Math.PI/180))*(1+.105*back);
    dir.set(portrait?.37:.346,.416+back*.018,.882).normalize();
    look.set(.10-back*.17,1.76+back*.14,-.04-back*.12);
    scene.fog.near=distance+2;scene.fog.far=distance+43;
    camera.position.copy(look).addScaledVector(dir,distance);camera.lookAt(look);camera.updateMatrixWorld();
  }
  function resize(){
    W=canvas.clientWidth;H=canvas.clientHeight;dpr=Math.min(window.devicePixelRatio||1,1.65,Math.sqrt(2340000/Math.max(1,W*H)));
    renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);overlay.width=Math.round(W*dpr);overlay.height=Math.round(H*dpr);
    target.setSize(Math.round(W*dpr),Math.round(H*dpr));post.uniforms.texel.value.set(1/target.width,1/target.height);
    camera.aspect=W/H;camera.updateProjectionMatrix();cameraPlace();
  }
  function project(v){projected.copy(v).project(camera);return {x:(projected.x+1)*W/2,y:(1-projected.y)*H/2};}
  function next(){if(s.phase===2&&s.toyAwake)return 'toy';return s.phase===0 || (s.spring<.16&&s.phase===1)?'key':['key','pin','doll','lid'][s.phase];}
  const anchor=new T.Vector3();
  function cuePoint(part){
    if(part==='toy')return box.minis[s.box].localToWorld(anchor.set(0,.14,.1));
    if(part==='key')return box.key.localToWorld(anchor.set(0,.02,.085));
    if(part==='doll')return box.dancer.localToWorld(anchor.set(0,1.03,.02));
    if(part==='lid')return box.lid.localToWorld(anchor.set(1.70,2.56,.32));
    return box.deck.localToWorld(anchor.set(box.laneX([3,8,5,10,1,7,4][Math.min(6,s.added)]),2.057,-.039));
  }
  let active=null;
  function pick(x,y){
    pointer.set(x/W*2-1,1-y/H*2);ray.setFromCamera(pointer,camera);
    return ray.intersectObjects(hit.filter(o=>o.userData.part!=='toy'||(s.toyAwake&&o===toyVolumes[s.box])),false)[0];
  }
  function peg(point){
    const p=box.deck.worldToLocal(point.clone()),lane=Math.round((p.x+.27)/.184);
    const radial=Math.atan2(p.z+.28,p.y-1.733);
    return works.pin(lane,s.angle+1.52-radial);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(active || !e.isPrimary || (e.pointerType==='mouse'&&e.button!==0))return;
    sound.unlock();works.touch();const h=pick(e.clientX,e.clientY);if(!h)return;
    const name=h.object.userData.part;
    active={id:e.pointerId,name,x:e.clientX,y:e.clientY,travel:0,danceStart:false};
    canvas.setPointerCapture(e.pointerId);
    if(name==='key'&&(s.phase===0||s.spring<=1.15))works.wind(.40);
    else if(name==='pin'&&s.phase===1)peg(h.point);
    else if(name==='toy'&&s.toyAwake){works.playToy(.69);active.toyStart=true;}
    else if(name==='doll'&&s.phase>=2){works.dance(.38,true);active.danceStart=true;}
    else if(name==='lid'&&s.phase===3)works.close();
    else works.nudge();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!active || active.id!==e.pointerId)return;
    const dx=e.clientX-active.x,dy=e.clientY-active.y,len=Math.hypot(dx,dy);works.touch();
    if(active.name==='key'){
      const center=project(cuePoint('key')), a=Math.atan2(active.y-center.y,active.x-center.x),b=Math.atan2(e.clientY-center.y,e.clientX-center.x);
      const turn=Math.atan2(Math.sin(b-a),Math.cos(b-a));
      const gain=Math.max(Math.abs(turn)*.89,len/(W<550?34:58));
      works.wind(Math.min(.8,gain));
    }
    if(active.toyStart)works.playToy(s.box===1?-dy/45+dx/180:dx/45-dy/120);
    if(active.danceStart)works.dance(s.box===1?-dy/49+dx/180:dx/52-dy/150);
    active.x=e.clientX;active.y=e.clientY;active.travel+=len;
  });
  function release(e){if(active&&active.id===e.pointerId){active=null;works.touch();}}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  document.querySelector('#sound').addEventListener('click',e=>{
    const muted=sound.toggle();e.currentTarget.querySelector('use').setAttribute('href',muted?'#off':'#on');
    e.currentTarget.setAttribute('aria-pressed',String(!muted));works.touch();
  });
  const badges=[...document.querySelectorAll('.badge')],stones=[...document.querySelectorAll('.stones i')];let hud='';
  function indicators(){
    const token=s.phase+'-'+s.box;if(hud===token)return;hud=token;
    badges.forEach((el,i)=>{el.classList.toggle('active',i===s.phase);el.classList.toggle('done',i<s.phase);});
    stones.forEach((el,i)=>el.classList.toggle('on',i===s.box));
    document.querySelector('#world use').setAttribute('href',['#sail','#air','#moon'][s.box]);
  }
  function guide(){
    ink.setTransform(dpr,0,0,dpr,0,0);ink.clearRect(0,0,W,H);
    if(active||s.idle<4||s.closing||s.lid>.12)return;
    const part=next(),center=project(cuePoint(part)),span=Math.max(22,Math.min(W/14,H/15));
    const duration={key:3.55,pin:2.9,doll:3.35,toy:3.2,lid:3.7}[part],u=((s.idle-4)%duration)/duration;
    const show=Math.max(0,Math.min(1,u*9,(1-u)*8));
    const f=Math.min(1,Math.max(0,(u-.11)/.70)),ease=f*f*(3-2*f);
    let x=center.x,y=center.y;
    if(part==='key'){x+=Math.cos(-1+ease*4.93)*span*.87;y+=Math.sin(-1+ease*4.93)*span*.46;}
    if(part==='pin'){x+=Math.max(0,.5-ease)*22;y-=Math.abs(.54-ease)*span*.7;}
    if(part==='doll'){if(s.box===1)y-=ease*span;else{x+=(ease-.45)*span*1.52;y+=Math.sin(ease*Math.PI)*span*.17;}}
    if(part==='toy'){if(s.box===0)x+=(ease-.35)*span;else if(s.box===1)y+=(.35-ease)*span;else{x+=Math.sin(ease*4)*span*.45;y+=Math.cos(ease*4)*span*.45;}}
    if(part==='lid'){x+=ease*span*.15;y+=ease*span*.65;}
    ink.save();ink.translate(x,y);ink.globalAlpha=show*.90;
    ink.beginPath();ink.arc(0,0,7.3,0,tau);ink.strokeStyle='rgba(255,244,202,.83)';ink.lineWidth=1.5;ink.stroke();
    ink.rotate(-.28);ink.scale(.83,.83);ink.shadowColor='rgba(56,42,24,.25)';ink.shadowBlur=5;ink.shadowOffsetY=2;
    ink.beginPath();ink.moveTo(-2,22);ink.lineTo(-4,4);ink.bezierCurveTo(-5,-2,2,-3,3,3);ink.lineTo(5,14);
    ink.bezierCurveTo(5,9,11,9,12,14);ink.bezierCurveTo(13,10,18,11,19,16);ink.bezierCurveTo(22,13,26,15,26,20);
    ink.lineTo(27,30);ink.bezierCurveTo(26,40,20,44,12,44);ink.bezierCurveTo(5,44,2,39,-1,35);ink.lineTo(-10,23);
    ink.bezierCurveTo(-14,17,-8,15,-5,19);ink.closePath();ink.fillStyle='#fff4d9';ink.fill();ink.shadowBlur=0;ink.shadowOffsetY=0;
    ink.lineWidth=1.35;ink.strokeStyle='#967b53';ink.stroke();ink.restore();
  }
  function draw(){
    cameraPlace();box.update(s);room.update(s);box.root.updateMatrixWorld(true);
    marker.visible=next()==='key'&&!s.closing;marker.position.copy(cuePoint('key'));marker.position.z+=.048;
    marker.rotation.z=-.16+s.wind[0].u*.08;
    glint.rotation.z=s.wind[3].u*.87;glint.scale.setScalar(.86+s.lamps[2].light*.45);
    cue.visible=!marker.visible&&!s.closing;cue.position.copy(cuePoint(next()));cue.position.y+=.18+s.wind[3].u*.056;
    cue.quaternion.copy(camera.quaternion);beacon.rotation.z=s.wind[4].u*.58;bead.position.y=.08+s.wind[6].u*.04;
    renderer.setRenderTarget(target);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(screenScene,screenCamera);guide();indicators();
  }
  resize();window.addEventListener('resize',resize);
  let prev=null;
  function frame(now){if(prev!==null)step(Math.min(.07,(now-prev)/1000));prev=now;draw();requestAnimationFrame(frame);}
  document.addEventListener('visibilitychange',()=>{prev=null;});
  requestAnimationFrame(frame);
})();
