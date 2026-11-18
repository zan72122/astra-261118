'use strict';
(() => {
  const T=THREE,W=FlightWorld,canvas=document.getElementById('view'),sim=W.create(),{f}=sim.model;
  window.__GAME__={step:dt=>sim.step(dt),getState:()=>sim.getState()};
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.18,7200);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.setClearColor(0xbacdd2);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene.fog=new T.FogExp2(0xe7cfc0,.00046);
  const rng=W.random(1904),v3=(...a)=>new T.Vector3(...a),zero=v3(0,0,0);
  const roughData=new Uint8Array(32*32*4);for(let i=0;i<roughData.length;i+=4){const n=236+Math.floor(rng()*20);roughData.set([n,n,n,255],i)}
  const tex=new T.DataTexture(roughData,32,32);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearFilter;tex.needsUpdate=true;
  function mat(color,roughness=.82,metalness=0,vertexColors=false){
    return new T.MeshStandardMaterial({color,roughness,metalness,vertexColors,roughnessMap:tex,side:T.DoubleSide});
  }
  function group(parent=scene){const g=new T.Group();parent.add(g);return g}
  function geometry(p,idx,c){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));if(c)g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();
    const uv=[];for(let i=0;i<p.length;i+=3)uv.push((p[i]+p[i+1]*.31)*.14,(p[i+2]+p[i+1]*.63)*.14);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g}
  const unitBox=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,18,12),pole=new T.CylinderGeometry(1,1,1,8),up=v3(0,1,0);
  function mesh(parent,geo,m){const o=new T.Mesh(geo,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
  function box(p,at,size,m){const o=mesh(p,unitBox,m);o.position.set(...at);o.scale.set(...size);return o}
  function ellipsoid(p,at,size,m){const o=mesh(p,sphere,m);o.position.set(...at);o.scale.set(...size);return o}
  function rod(p,a,b,r,m){const A=v3(...a),B=v3(...b),o=mesh(p,pole,m),dir=B.clone().sub(A);o.position.copy(A).lerp(B,.5);o.scale.set(r,dir.length(),r);o.quaternion.setFromUnitVectors(up,dir.normalize());return o}
  function batch(root){
    root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),bins=new Map(),remove=[];
    root.traverse(o=>{if(!o.isMesh)return;const m=o.material,source=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();source.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));
      if(!bins.has(m))bins.set(m,{p:[],n:[],c:[],uv:[]});const dst=bins.get(m);
      for(const [field,name] of [['p','position'],['n','normal'],['uv','uv'],['c','color']]){const attr=source.getAttribute(name);if(attr)for(const val of attr.array)dst[field].push(val)}
      remove.push(o);source.dispose();
    });
    remove.forEach(o=>o.removeFromParent());
    bins.forEach((a,m)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.n,3));if(a.uv.length)g.setAttribute('uv',new T.Float32BufferAttribute(a.uv,2));if(a.c.length)g.setAttribute('color',new T.Float32BufferAttribute(a.c,3));mesh(root,g,m)});
  }
  const G={scene,group,geometry,box,ellipsoid,mat,rod,mesh,batch};
  const light=new T.DirectionalLight(0xffe4bd,2.55);scene.add(light,light.target);light.castShadow=true;
  light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-73,right:73,top:73,bottom:-73,near:1,far:460});
  light.shadow.normalBias=.09;light.shadow.bias=-.00035;
  scene.add(new T.HemisphereLight(0xddeafa,0xa49f8c,1.68));
  // A locally generated radiance map gives the cockpit, metal and water a sky reflection.
  const data=new Float32Array(256*128*4),top=new T.Color(0x88b9cf),horizon=new T.Color(0xf5d8bf),earth=new T.Color(0x688375);
  const sunDir=v3(-.28,.206,-1).normalize();
  for(let y=0;y<128;y++)for(let x=0;x<256;x++){
    const lat=(y/127-.5)*Math.PI,lon=(x/255-.5)*2*Math.PI,d=v3(Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon));
    const c=horizon.clone().lerp(d.y>=0?top:earth,W.smooth(0,.63,Math.abs(d.y)));const shine=Math.pow(Math.max(0,d.dot(sunDir)),560);
    const k=(y*256+x)*4;data.set([c.r+3*shine,c.g+2.3*shine,c.b+1.4*shine,1],k)
  }
  const env=new T.DataTexture(data,256,128,T.RGBAFormat,T.FloatType);env.mapping=T.EquirectangularReflectionMapping;env.needsUpdate=true;
  const pm=new T.PMREMGenerator(renderer),envRT=pm.fromEquirectangular(env);scene.environment=envRT.texture;scene.environmentIntensity=.49;pm.dispose();env.dispose();
  const skyU={sun:{value:sunDir},mist:{value:0},morning:{value:0},drift:{value:0}};
  const sky=new T.Mesh(new T.SphereGeometry(6100,40,24),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,fog:false,uniforms:skyU,
    vertexShader:'varying vec3 dir; void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 dir;uniform vec3 sun;uniform float mist,morning,drift;
    float rand(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),u=fract(p);u=u*u*(3.-2.*u);return mix(mix(rand(i),rand(i+vec2(1,0)),u.x),mix(rand(i+vec2(0,1)),rand(i+1.),u.x),u.y);}
    void main(){vec3 d=normalize(dir);float h=max(0.,d.y);vec3 hz=mix(vec3(1.13,.77,.61),vec3(.96,.96,.88),morning);
    vec3 c=mix(hz,mix(vec3(.23,.51,.72),vec3(.19,.50,.73),morning),smoothstep(-.05,.59,h));
    vec2 q=d.xz/(h+.085);q.x+=drift*.0003;float wisps=n(q*vec2(1.8,7.))+n(q*vec2(4.7,19.))*.43+n(q*vec2(11.,34.))*.17;
    c=mix(c,vec3(1.17,1.02,.91),smoothstep(.79,1.39,wisps)*.30*smoothstep(.012,.11,h));
    float a=acos(clamp(dot(d,sun),-1.,1.));c+=vec3(1.,.65,.30)*(.37*exp(-a*6.)+.67*exp(-a*32.)+.48*exp(-a*89.));
    c=mix(c,vec3(5.,3.9,2.5),1.-smoothstep(.009,.011,a));c=mix(c,vec3(1.37,1.41,1.39),mist*.93);
    float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);gl_FragColor=vec4(c+(grain-.5)*.003,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`
  }));sky.renderOrder=-100;sky.frustumCulled=false;scene.add(sky);
  const land=buildScenery(G,sim),plane=buildAircraft(G);batch(plane);
  const balloons=buildBalloons(G,sim);for(const b of balloons){b.fire.removeFromParent();batch(b.basket);b.basket.add(b.fire)}
  // Clouds are participating volumes. A ray traverses local density from front to back.
  const N=40,vox=new Uint8Array(N*N*N);
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++)vox[(z*N+y)*N+x]=Math.floor(rng()*256);
  const volume=new T.Data3DTexture(vox,N,N,N);volume.format=T.RedFormat;volume.minFilter=volume.magFilter=T.LinearFilter;
  volume.wrapS=volume.wrapT=volume.wrapR=T.RepeatWrapping;volume.unpackAlignment=1;volume.needsUpdate=true;
  const vapor=[];
  const cloudVert=`varying vec3 ray,eye;uniform vec3 localEye;void main(){eye=localEye;ray=position-eye;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const cloudFrag=`precision highp sampler3D;varying vec3 ray,eye;uniform sampler3D fogNoise;uniform vec3 salt;uniform float wet,haze,glow;
    float noise3(vec3 p){return texture(fogNoise,p).r;}
    float density(vec3 p){vec3 q=p*vec3(2.,2.,2.);vec3 t=q*vec3(2.1,1.5,1.8);
      float n=noise3(t*.054+salt)*.55+noise3(t*.137+salt)*.28+noise3(t*.318+salt)*.12+noise3(t*.78+salt)*.05;
      float edge=1.-dot(q,q);return clamp((edge+(n-.59)*1.85)*wet,0.,1.);}
    void main(){vec3 rd=normalize(ray),inv=1./(rd+vec3(.000001)),a=(-.5-eye)*inv,b=(.5-eye)*inv;
      vec3 lo=min(a,b),hi=max(a,b);float start=max(max(lo.x,max(lo.y,lo.z)),0.),end=min(hi.x,min(hi.y,hi.z));if(end<=start)discard;
      float ds=(end-start)/21.,jitter=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);vec3 p=eye+rd*(start+ds*(.25+jitter*.5));
      float trans=1.;vec3 sum=vec3(0.);for(int i=0;i<21;i++){float d=density(p);
        if(d>.005){float light=clamp(.77+p.y*.6+(d-density(p+vec3(-.06,.085,-.04)))*1.4,.04,1.);
          vec3 col=mix(vec3(.62,.65,.69),vec3(1.52,1.34,1.16),light);float alpha=1.-exp(-d*ds*7.);sum+=col*alpha*trans;trans*=1.-alpha;}
        if(trans<.02)break;p+=rd*ds;}
      float alpha=1.-trans;if(alpha<.006)discard;
      vec3 col=mix(sum/max(.001,alpha),vec3(1.10,.96,.87),haze*.53);col=mix(col,vec3(1.34,1.38,1.36),glow*.49);
      gl_FragColor=vec4(col,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const cloudBox=new T.BoxGeometry(1,1,1);
  function puff(x,y,s,dx,dy,dz,i,wet){
    const u={localEye:{value:v3()},salt:{value:v3(rng(),rng(),rng())},fogNoise:{value:volume},wet:{value:wet},haze:{value:.2},glow:{value:0}};
    const m=new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,uniforms:u,vertexShader:cloudVert,fragmentShader:cloudFrag});
    const o=new T.Mesh(cloudBox,m);o.position.set(x,y,-s);o.scale.set(dx,dy,dz);scene.add(o);vapor.push({o,u,x,y,s,i,wet});
  }
  // Separate, thin morning mist banks follow the hollows, leaving the flight corridor clear.
  for(const [x,y,s,dx,dy,dz] of [[-140,68,250,195,19,75],[158,84,365,214,23,94],[-70,69,545,200,20,116],
    [165,139,685,290,39,140],[-250,171,880,275,51,118],[-390,239,1170,339,49,173],[317,202,1310,285,49,125],
    [-160,227,1390,236,40,150],[117,197,1460,281,56,144],[280,138,1620,320,49,165],[-340,147,1740,370,50,160],
    [496,235,1980,450,62,173],[-440,255,2550,690,71,241],[-119,325,3100,580,61,191]])puff(x,y,s,dx,dy,dz,vapor.length%13,.91);
  for(let i=0;i<13;i++){
    const c=sim.model.cloud[i];puff(c.x+(i%3-1)*78,245+(i%4)*6,c.s,155+(i%3)*19,64+i%3*10,107,i,1.17);
  }
  const dove=mat(0xe9e5d8,.74),quill=mat(0x5b696c,.84),beak=mat(0xb08a55,.67);
  const birds=sim.model.birds.map((b,i)=>{
    const g=group();ellipsoid(g,[0,0,0],[.115,.12,.41],dove);ellipsoid(g,[0,.083,-.31],[.117,.112,.14],dove);ellipsoid(g,[0,.08,-.456],[.043,.039,.091],beak);
    const wings=[];for(const side of [-1,1]){
      const w=group(g);w.position.set(.075*side,0,-.03);const p=[0,0,-.15,.49*side,.105,-.10,.69*side,.10,-.015,.48*side,.095,.19,0,0,.21];
      mesh(w,geometry(p,[0,1,3,0,3,4,1,2,3]),dove);mesh(w,geometry([.49*side,.105,-.10,1.06*side,.045,.135,.94*side,.057,.159,.48*side,.095,.19],[0,1,2,0,2,3]),quill);batch(w);wings.push(w);
    }return {g,wings};
  });
  const husk=mat(0xffdfa3,.55,.14);husk.emissive.setHex(0x805627);husk.emissiveIntensity=.21;
  const seedGeo=new T.OctahedronGeometry(1,0),seeds=new T.InstancedMesh(seedGeo,husk,sim.model.motes.length);scene.add(seeds);seeds.frustumCulled=false;
  const temp=new T.Object3D(),projected=v3(),orient=document.getElementById('attitude'),hint=document.getElementById('hint'),veil=document.getElementById('veil');
  const sound=flightSound(),soundBtn=document.getElementById('sound'),stops=[...document.querySelectorAll('.stop')];
  let width=1,height=1,aspect=1,activePointer=null,activeTarget=-1,targets=[],lastStage=-1;
  const hit=(world,r,id)=>{const p=world.clone().project(camera);if(p.z<=-1||p.z>=1)return;
    const dist=camera.position.distanceTo(world),rad=r*height/(.8284*dist);
    targets.push({x:(p.x+1)*width/2,y:(1-p.y)*height/2,r:Math.max(23,rad),id})};
  // Extract bright radiance before tone mapping, then spread just a little of it.
  const canBloom=renderer.extensions.has('EXT_color_buffer_float');
  const full=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
  const lights=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
  const post=new T.Scene(),screenCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const passVertex='varying vec2 st; void main(){st=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const extract=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{source:{value:full.texture}},vertexShader:passVertex,
    fragmentShader:`varying vec2 st;uniform sampler2D source;void main(){vec3 c=texture2D(source,st).rgb;
      float intensity=dot(c,vec3(.2126,.7152,.0722));gl_FragColor=vec4(c*smoothstep(1.25,2.65,intensity),1.);}`});
  const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,vertexShader:passVertex,
    uniforms:{source:{value:full.texture},highlights:{value:lights.texture},pixel:{value:new T.Vector2()}},
    fragmentShader:`varying vec2 st;uniform sampler2D source,highlights;uniform vec2 pixel;
      void main(){vec3 c=texture2D(source,st).rgb;vec3 glow=vec3(0.);
      for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){vec2 offset=vec2(float(i),float(j));
        glow+=texture2D(highlights,st+offset*pixel*1.7).rgb*(i==0?.5:.25)*(j==0?.5:.25);}
      gl_FragColor=vec4(c+.050*glow,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      gl_FragColor.rgb+=(grain-.5)*.004;
      }`});
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),extract);quad.frustumCulled=false;post.add(quad);
  function draw(){
    if(!canBloom){renderer.render(scene,camera);return}
    renderer.setRenderTarget(full);renderer.render(scene,camera);
    quad.material=extract;renderer.setRenderTarget(lights);renderer.render(post,screenCam);
    quad.material=finish;renderer.setRenderTarget(null);renderer.render(post,screenCam);
  }
  function resize(){
    width=canvas.clientWidth;height=canvas.clientHeight;aspect=width/height;camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
    const px=renderer.getPixelRatio(),bw=Math.max(1,Math.round(width*px/4)),bh=Math.max(1,Math.round(height*px/4));
    if(canBloom){full.setSize(Math.round(width*px),Math.round(height*px));lights.setSize(bw,bh);finish.uniforms.pixel.value.set(1/bw,1/bh)}
    // In a narrow view the two lead balloons fly a closer formation.
    const space=W.smooth(.45,1.05,aspect);sim.model.balloons[0].x=W.mix(11.7,17,space);sim.model.balloons[1].x=W.mix(-11.2,-25,space);
    sunDir.set(W.mix(-.086,-.28,space),.206,-1).normalize();
  }
  resize();window.addEventListener('resize',resize);
  function sync(){
    const model=sim.model;
    plane.position.set(f.x,f.h,-f.s);plane.rotation.order='YXZ';plane.rotation.set(f.pitch,-Math.atan2(f.vx,Math.max(7,f.speed)),-f.roll,'YXZ');
    const wide=W.smooth(.47,1.17,aspect);
    const dist=Math.max(18.2,16.65/(.8284*aspect*W.mix(.78,.57,wide))),offset=W.mix(-3.4,Math.min(dist*.245,5.65),wide),landed=W.smooth(0,3,f.rest);
    camera.position.set(f.x+offset,f.h+dist*.293+landed*.85,-f.s+dist);
    const yaw=W.mix(.066,-.115,wide);
    camera.lookAt(camera.position.x+yaw*70,camera.position.y-7.4+landed*1.9,camera.position.z-70);
    camera.updateMatrixWorld();sky.position.copy(camera.position);
    light.target.position.set(f.x,f.h*.80,-f.s-19);
    light.position.copy(light.target.position).add(v3(-103,135,-114));
    const morning=W.smooth(900,1660,f.s);skyU.mist.value=f.fog;skyU.morning.value=morning;skyU.drift.value=model.cloud[2].drift;
    scene.fog.color.setHex(0xe9d5c6).lerp(new T.Color(0xd0dfe0),morning).lerp(new T.Color(0xf5f5ed),f.fog);
    scene.fog.density=.00042-.00011*morning+.024*f.fog*f.fog;
    targets=[];hit(plane.position,2.45,-2);
    // Wings and fuselage share one touch surface, with child-sized margins around each.
    plane.updateWorldMatrix(true,false);
    for(const x of [-6.6,-3.4,3.4,6.6])hit(plane.localToWorld(v3(x,.15,-.45)),1.65,-2);
    balloons.forEach((g,i)=>{const b=model.balloons[i];g.pivot.position.set(b.x,b.y+b.heave,-b.s);g.envelope.rotation.z=b.sway;
      g.basket.rotation.z=b.basket;g.basket.position.x=b.sway*b.r*1.30;g.fire.scale.y=b.r*(.044+.28*b.flame);g.fireMat.emissiveIntensity=.97+b.flame*5;
      if(f.stage===0&&b.s>f.s-4&&b.s<f.s+200)hit(g.pivot.position,b.r*1.08,i);
    });
    model.motes.forEach((p,i)=>{const [x,s,r]=W.thermals[p.cell],c=model.columns[p.cell];
      const h=((p.h%96)+96)%96,fade=W.smooth(0,8,h)*(1-W.smooth(84,96,h)),rk=p.r*(.67+h*.006);
      temp.position.set(x+Math.cos(p.angle)*rk,terrainForSeed(x,s)+h*(p.cell>2?2.5:1.18),-s+Math.sin(p.angle)*rk);
      temp.rotation.set(.38,p.angle,p.angle*.8);const k=fade*(p.cell<model.columns.length?1:0);temp.scale.set(.105*k,(.13+.032*(c?.flux||0))*k,.37*k);temp.updateMatrix();seeds.setMatrixAt(i,temp.matrix);
    });seeds.instanceMatrix.needsUpdate=true;
    land.ridgeSleeves.forEach((chain,i)=>{
      chain.forEach((joint,j)=>{joint.rotation.z=model.sleeves[i][j].bend});
      if(f.stage===1 && W.markers[i][1]>f.s-3)hit(chain[0].getWorldPosition(v3()),7,20);
    });
    if(f.stage===1){
      const ahead=model.motes.filter(p=>W.thermals[p.cell][1]>f.s+12 && W.thermals[p.cell][1]<f.s+110);
      for(const p of ahead){
        const [x,s]=W.thermals[p.cell],h=((p.h%96)+96)%96,r=p.r*(.67+h*.006);
        hit(v3(x+Math.cos(p.angle)*r,terrainForSeed(x,s)+h*(p.cell>2?2.5:1.18),-s+Math.sin(p.angle)*r),3.2,20);
      }
    }
    vapor.forEach(({o,u,x,y,s,i,wet})=>{
      const c=model.cloud[i];o.position.x=x+c.drift+(i%2?1:-1)*c.opening;o.position.y=y+c.water*2;o.visible=s>f.s-210&&s<f.s+3100;
      if(!o.visible)return;
      u.localEye.value.copy(camera.position).sub(o.position).divide(o.scale);u.wet.value=wet*(.67+c.water*.53);u.haze.value=W.smooth(100,2200,s-f.s);u.glow.value=f.fog;
    });
    if(f.stage===2)hit(v3(0,f.h+3,-f.s-53),12,21);
    const join=W.smooth(1125,1185,f.s)*(1-W.smooth(1480,1550,f.s));
    birds.forEach(({g,wings},i)=>{const b=model.birds[i],side=i%2?1:-1;g.visible=join>.001;
      if(!g.visible)return;
      g.position.set(f.x+b.x+side*(1-join)*48,f.h+b.h+3*(1-join),-f.s+b.back-5-(1-join)*30);
      g.rotation.z=-b.vx*.17;g.rotation.x=b.vh*.10;wings[0].rotation.z=-b.wing;wings[1].rotation.z=b.wing;
      if(f.stage===3)hit(g.position,2.65,30+i);
    });
    land.normals.offset.set(model.cells[9].gust*.11,model.water[5].h*.42);
    if(f.s>1300){
      // Adjacent wave cells independently displace strips of the water mesh.
      const a=land.op.array;
      for(let i=0;i<land.op.count;i++){const j=(i%81+Math.floor(i/81)*2)%36;a[i*3+1]=land.initialY[i]+model.water[j].h}land.op.needsUpdate=true;
      land.ocean.geometry.computeVertexNormals();
      land.boats.forEach((g,i)=>{const b=model.boats[i];g.position.y=1.15+b.heave;g.position.z=-1900-i*48-b.travel;g.rotation.set(0,.18+i*.13,b.roll);
        if(f.stage===4 && -g.position.z-f.s<270)hit(g.position,5,50+i)});
      land.laundry.forEach(({g,hem},i)=>{g.rotation.x=model.cloth[i].angle;hem.rotation.x=model.cloth[i].hem;if(f.stage===4&&i%4===0&&Math.abs(g.position.z+f.s)<150)hit(g.position,4.5,60+i)});
      land.people.forEach((g,i)=>{g.rotation.z=model.family[i].arm});land.sock.rotation.z=-.13+model.cells[6].gust*.11;
      if(f.stage===4)hit(v3(0,2.5,-2250),19,70);
      if(f.stage===5)hit(v3(7,4,-2323),5.3,71);
    }
    if(f.stage!==lastStage){const index=[0,1,2,2,3,3][f.stage];stops.forEach((el,i)=>el.classList.toggle('active',i===index));lastStage=f.stage}
    orient.setAttribute('transform','rotate('+(-f.roll*180/Math.PI)+' 33 34)');veil.style.opacity=f.veil.toFixed(3);
    const usable=targets.filter(t=>t.id>=0&&t.x>width*.08&&t.x<width*.91&&t.y>height*.12&&t.y<height*.76);
    const target=usable[0],period=(f.idle-4)%6.4;
    if(f.idle>=4&&period>=0&&period<3.3&&f.veil<.1){
      projected.copy(plane.position).project(camera);const x0=(projected.x+1)*.5*width,y0=(1-projected.y)*.5*height;
      const u=W.smooth(.45,2.2,period),x=W.mix(x0,target?target.x:x0+34,u),y=W.mix(y0,target?target.y:y0-47,u);
      hint.style.left=(x-7)+'px';hint.style.top=(y-6)+'px';hint.style.opacity=(.86*W.smooth(0,.4,period)*(1-W.smooth(2.5,3.3,period))).toFixed(2);
    }else hint.style.opacity='0';
    sound.update(model);
  }
  function terrainForSeed(x,s){return W.terrain(x,s)+8}
  function steer(e){sim.input((e.clientX/width-.5)*2.5,(.53-e.clientY/height)*2.5,activeTarget)}
  canvas.addEventListener('pointerdown',e=>{
    if(activePointer!==null||!e.isPrimary)return;const nearest=targets.map(t=>({t,d:Math.hypot(e.clientX-t.x,e.clientY-t.y)/t.r})).filter(o=>o.d<=1.15).sort((a,b)=>a.d-b.d)[0];
    if(!nearest)return;activePointer=e.pointerId;activeTarget=nearest.t.id;canvas.setPointerCapture(activePointer);steer(e);sound.start();
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerId===activePointer)steer(e)});
  function release(e){if(!e||e.pointerId===activePointer){activePointer=null;activeTarget=-1;sim.release()}}
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,release);
  soundBtn.addEventListener('click',()=>{const muted=sound.toggle();soundBtn.classList.toggle('mute',muted);soundBtn.setAttribute('aria-pressed',String(!muted))});
  let before=performance.now();
  document.addEventListener('visibilitychange',()=>{before=performance.now();if(document.hidden){release();sound.pause()}else sound.wake()});
  function frame(now){const dt=Math.min(.075,Math.max(0,(now-before)*.001));before=now;if(!document.hidden){sim.step(dt);sync();draw()}requestAnimationFrame(frame)}
  sync();requestAnimationFrame(frame);
})();
