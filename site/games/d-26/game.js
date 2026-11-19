'use strict';
(()=>{
  const W=HillWind,A=HillArt,T=THREE,game=W.create(),s=game.state;
  window.__GAME__={step:game.step,getState:game.getState};
  const canvas=document.getElementById('hill'),scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.07,480);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
  const sun=new T.DirectionalLight('#fff2d9',2.17);sun.position.set(-10,18,6);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-14,right:14,top:16,bottom:-13,near:1,far:62});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.013;sun.shadow.bias=-.00016;
  const skyLight=new T.HemisphereLight('#e2edf7','#97a17b',1.49);scene.add(skyLight);
  scene.fog=new T.FogExp2('#c0d2d2',.0071);
  // Capture the actual sea, hill, houses and cloud banks for wet ground, glass and metal.
  const reflectionTarget=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType});
  const reflectionCamera=new T.CubeCamera(.10,465,reflectionTarget);
  reflectionCamera.position.set(-.35,1.57,1.15);
  let reflectionReady=false;
  scene.environmentIntensity=.39;
  const sky=A.skyAndSea(scene);A.countryside(scene);const grass=A.meadow(scene),girl=KiteModels.toyGirl(scene);
  const kites=[0,1,2].map(i=>KiteModels.kite(scene,i)),threads=KiteModels.windThreads(scene);
  const seeds=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),A.mat('#f7e5b8',.72,0,{emissive:'#e3c17d',emissiveIntensity:.13}),s.seeds.length);
  seeds.frustumCulled=false;scene.add(seeds);const obj=new T.Object3D();
  // A very small highlight spread, fine dither and a soft lens edge after linear lighting.
  const target=new T.WebGLRenderTarget(1,1,{depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples),type:T.HalfFloatType});
  const post=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,0,1),postMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,
    uniforms:{plate:{value:target.texture},pixel:{value:new T.Vector2(1,1)},lensAspect:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D plate;uniform vec2 pixel;uniform float lensAspect;varying vec2 vUv;
      vec3 bright(vec2 p){vec3 c=texture2D(plate,p).rgb;return c*smoothstep(.73,1.,max(c.r,max(c.g,c.b)));}
      void main(){vec2 o=pixel*2.5;vec3 c=texture2D(plate,vUv).rgb;
        vec3 bloom=bright(vUv+o)+bright(vUv-o)+bright(vUv+vec2(-o.x,o.y))+bright(vUv+vec2(o.x,-o.y));
        vec2 d=vUv-.5;c=(c+.0105*bloom)*(1.-.062*smoothstep(.09,.50,dot(d,d)));
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
        gl_FragColor.rgb+=grain*.0042;
      }`});
  post.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
  let width=1,height=1,initialized=false,lastStage=0,active=null,lastTime=null,muted=false,soundStarted=false;
  const aim=new T.Vector3(),camPos=new T.Vector3(),look=new T.Vector3(),desired=new T.Vector3();
  const guide=document.getElementById('guide'),indicators=Array.from(document.querySelectorAll('#chapters i')),soundButton=document.getElementById('sound'),audio=hillsideSound();
  function resize(){
    width=canvas.clientWidth;height=canvas.clientHeight;camera.aspect=width/height;camera.updateProjectionMatrix();
    const ratio=Math.min(window.devicePixelRatio||1,1.65,Math.sqrt(2050000/(width*height)));
    renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);
    const rw=Math.round(width*ratio),rh=Math.round(height*ratio);target.setSize(rw,rh);postMat.uniforms.pixel.value.set(1/rw,1/rh);postMat.uniforms.lensAspect.value=camera.aspect;
  }
  function track(dt){
    const q=s.kite,a=camera.aspect,high=W.smooth((q.y-2.7)/16),spread=s.call*(s.stage===3?.1+.9*W.smooth((q.y-2.9)/11):1),orbit=.11*s.danceBank;
    const groupWeight=W.smooth((spread-.72)/.28);
    const left=Math.min(q.x-.85,...s.friends.map(f=>f.x-.68)),right=Math.max(q.x+.85,...s.friends.map(f=>f.x+.68));
    const groupWidth=W.mix(9.55,Math.max(8.8,right-left+1.6),groupWeight);
    const baseDist=10.75+1.1*high,required=Math.max(baseDist,groupWidth/(Math.max(.38,a)*.565));
    const dist=W.mix(baseDist,required,spread);
    const follow=W.smooth((q.y-2.8)/7.5),homeX=W.mix(-.36,q.x,.43),centerX=W.mix(W.mix(homeX,q.x,follow),(left+right)*.5,groupWeight),cx=centerX-orbit*dist;
    const cameraY=2.37+Math.max(0,q.y-2.67)*.79;
    const halfWidth=.3153*a*.91;
    const homeZ=Math.max(8.6,.58+(homeX+1.34)/halfWidth,q.z+(Math.abs(q.x-homeX)+.87)/halfWidth);
    const cz=W.mix(homeZ,q.z+dist,follow)+spread*(1-follow)*(required-baseDist);
    desired.set(cx,cameraY,cz);
    const pitch=W.mix(-.054,Math.atan2(q.y-cameraY,dist)-.045,follow);
    look.set(centerX+.06*high,cameraY+Math.tan(pitch)*dist,cz-dist);
    if(!initialized){camPos.copy(desired);aim.copy(look);initialized=true;}
    const smoothing=1-Math.exp(-dt*2.7);camPos.lerp(desired,smoothing);aim.lerp(look,smoothing);camera.position.copy(camPos);camera.lookAt(aim);camera.updateMatrixWorld();
    sun.target.position.set(q.x*.25,Math.max(0,q.y-7)*.72,-1+q.z*.18);
    sun.position.copy(sun.target.position).add(desired.set(-10+5*s.sunset,18-17*s.sunset,6-31*s.sunset));
  }
  function screen(p){const v=new T.Vector3(p.x,p.y,p.z).project(camera);return {x:(v.x*.5+.5)*width,y:(.5-v.y*.5)*height,visible:v.z<1&&v.z>-1};}
  function interactive(){
    if(s.stage===1)return [s.tail[2],s.tail[8],s.tail[14]];
    if(s.stage===2)return [s.kite,...s.friends];
    if(s.stage===3&&s.kite.y<5.3)return [s.anchor,s.kite];
    return [s.kite];
  }
  function radius(p){
    const d=Math.max(2,camera.position.distanceTo(p)),unit=height/(.631*d);
    return W.clamp((s.stage===1?.57:.93)*unit,31,Math.min(width*.24,112));}
  function localHit(x,y){
    let closest=-1,best=Infinity;interactive().forEach((p,i)=>{const c=screen(p),d=Math.hypot(x-c.x,y-c.y);
      if(c.visible&&d<radius(p)&&d<best){best=d;closest=i;}});return closest;
  }
  function steer(x,y){
    const dx=(x-active.x)/Math.min(width*.44,255),dy=(active.y-y)/Math.min(height*.31,220);
    game.steer(W.clamp((x/width-.5)*.92+dx*.73,-1,1),W.clamp(.59+dy,-1,1),W.clamp(.89+dy*.15,.50,1));}
  canvas.addEventListener('pointerdown',e=>{if(active||e.button!==0)return;
    const hit=localHit(e.clientX,e.clientY);if(hit<0)return;
    audio.unlock();soundStarted=true;soundButton.classList.toggle('off',muted);soundButton.setAttribute('aria-pressed',String(!muted));
    canvas.setPointerCapture(e.pointerId);active={id:e.pointerId,x:e.clientX,y:e.clientY};game.touch(0,.59,.89,hit);steer(e.clientX,e.clientY);e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(active&&e.pointerId===active.id){steer(e.clientX,e.clientY);e.preventDefault();}});
  function letGo(e){if(active&&(!e||active.id===e.pointerId)){active=null;game.release();}}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,letGo);
  window.addEventListener('blur',()=>letGo());
  soundButton.addEventListener('click',()=>{audio.unlock();muted=soundStarted?!muted:false;soundStarted=true;audio.mute(muted);soundButton.classList.toggle('off',muted);soundButton.setAttribute('aria-pressed',String(!muted));});
  const daySun=new T.Color('#fff1d3'),sunsetSun=new T.Color('#ffc08d'),dayFog=new T.Color('#bfd1d3'),duskFog=new T.Color('#e4b8a5'),daySky=new T.Color('#dfebf4'),duskSky=new T.Color('#ccd0e1');
  function draw(dt){
    if(lastStage!==s.stage){lastStage=s.stage;indicators.forEach((el,i)=>el.classList.toggle('on',i===s.stage));active=null;}
    track(dt);sky(s);grass(s);girl(s);kites.forEach(f=>f(s));threads(s);
    for(let i=0;i<s.seeds.length;i++){const d=s.seeds[i];obj.position.set(d.x,d.y,d.z);obj.scale.set(.006,.009+s.cells[i].wind*.0006,.006);obj.rotation.set(d.vz,0,-d.vx);obj.updateMatrix();seeds.setMatrixAt(i,obj.matrix);}seeds.instanceMatrix.needsUpdate=true;
    sun.color.copy(daySun).lerp(sunsetSun,s.sunset);skyLight.color.copy(daySky).lerp(duskSky,s.sunset);scene.fog.color.copy(dayFog).lerp(duskFog,s.sunset);
    const el=interactive(),p=el[s.stage===1?1:s.stage===2?(s.dance<.5?1:2):0],c=screen(p);
    if(s.idle>=4&&!active&&c.visible){
      const period=4.6,phase=((s.idle-4)%period)/period,move=W.smooth((phase-.16)/.52),hold=W.smooth(phase/.15)*(1-W.smooth((phase-.78)/.22));
      const dx=s.stage===2?move*32:move*13,dy=s.stage===3?move*25:-move*32;
      guide.style.opacity=String(.82*hold);guide.style.transform='translate('+Math.round(c.x+dx-5)+'px,'+Math.round(c.y+dy-6)+'px) rotate('+(-12-9*move)+'deg)';
    }else guide.style.opacity='0';
    if(!reflectionReady){
      reflectionCamera.update(renderer,scene);
      const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromCubemap(reflectionTarget.texture).texture;
      pmrem.dispose();reflectionTarget.dispose();reflectionReady=true;
    }
    audio.update(s);renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(post,ortho);
  }
  function frame(now){const dt=lastTime===null?0:Math.min(.07,(now-lastTime)/1000);lastTime=now;game.step(dt);draw(dt);requestAnimationFrame(frame);}
  document.addEventListener('visibilitychange',()=>{lastTime=null;if(document.hidden){letGo();audio.suspend();}else audio.resume();});
  window.addEventListener('resize',resize);resize();requestAnimationFrame(frame);
})();
