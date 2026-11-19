'use strict';
(()=>{
  const T=THREE,P=SandPhysics,{V,grp,mat,m,mesh,rng,unit,noise,ell,box,lathe,ring,tube,batch}=Craft;
  const model=P.create(),s=model.s,clamp=P.clamp;
  window.__GAME__={step:model.step,getState:model.getState};
  const canvas=document.querySelector('#park'),guide=document.querySelector('#guide'),sound=new SoundGarden();
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.08,145);
  scene.background=new T.Color(0xd8e4e3);scene.fog=new T.Fog(0xd7e1d8,21,54);
  const sky=new T.HemisphereLight(0xd9edff,0xc0a88a,1.63);scene.add(sky);
  const sun=new T.DirectionalLight(0xffefd6,2.64);sun.position.set(-7.5,10.2,-4.0);
  sun.target.position.set(0,.1,0);scene.add(sun,sun.target);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-8.8,right:8.8,top:8.8,bottom:-8.8,near:.4,far:35});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00028;sun.shadow.normalBias=.018;sun.shadow.radius=2;
  const landscape=Park.environment(scene),world=grp(scene);Park.tray(world);
  // The toy metal and window glass reflect the same park that surrounds them.
  const probeTarget=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType});
  const probe=new T.CubeCamera(.1,80,probeTarget);probe.position.set(0,1,0);
  probe.update(renderer,scene);const pm=new T.PMREMGenerator(renderer),env=pm.fromCubemap(probeTarget.texture);
  scene.environment=env.texture;scene.environmentIntensity=.65;pm.dispose();probeTarget.dispose();

  const toys={bucket:Craft.bucket(),can:Craft.wateringCan(),shovel:Craft.shovel(),bridge:Craft.bridge(),car:Craft.car()};
  // A pressed daisy on the bucket catches the light just like the rolled rim.
  const badge=grp(toys.bucket);badge.position.set(.035,.61,.606);badge.rotation.z=-.14;
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7,o=ell(badge,Math.sin(a)*.083,Math.cos(a)*.083,.005,.033,.069,.011,m.orangeEdge);o.rotation.z=-a;}
  ell(badge,0,0,.022,.048,.048,.013,m.brass);
  const props=grp(world);
  for(const [name,o] of Object.entries(toys)){
    props.add(o);o.userData.kind=name;batch(o,[...(o.userData.planks||[]),...(o.userData.wheels||[]),...(o.userData.bail?[o.userData.bail]:[]),...(o.userData.pool?[o.userData.pool]:[])]);
    if(o.userData.planks)o.userData.planks.forEach(k=>batch(k));
  }
  const abutments=grp(world);for(const x of [-1,1])box(abutments,.25,1,.88,.045,m.honey,x,0,0);
  const nx=P.nx,nz=P.nz,n=nx*nz,terra=new T.BufferGeometry();
  const pos=new Float32Array(n*3),colors=new Float32Array(n*3),uv=new Float32Array(n*2),cut=new Float32Array(n),wetness=new Float32Array(n);
  const tone=new Float32Array(n),grain=new Float32Array(n),idx=[];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
    const k=j*nx+i,x=P.xs[i],z=P.zs[j];pos[3*k]=x;pos[3*k+1]=s.h[k];pos[3*k+2]=z;
    uv[2*k]=x*.94;uv[2*k+1]=z*.94;grain[k]=rng();
    tone[k]=.93+.073*noise(x*2.05+z*.8,z*1.8)+grain[k]*.013;
    if(i<nx-1&&j<nz-1)idx.push(k,k+nx,k+1,k+1,k+nx,k+nx+1);
  }
  terra.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));terra.setAttribute('color',new T.BufferAttribute(colors,3));terra.setAttribute('uv',new T.BufferAttribute(uv,2));
  terra.setAttribute('cutEdge',new T.BufferAttribute(cut,1));terra.setAttribute('damp',new T.BufferAttribute(wetness,1));terra.setIndex(idx);terra.computeVertexNormals();
  function clipped(material,damp=false){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float cutEdge; varying float vCut;\n'+(damp?'attribute float damp; varying float vDamp;\n':'')+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCut=cutEdge;'+(damp?'vDamp=damp;':''));
      shader.fragmentShader='varying float vCut;\n'+(damp?'varying float vDamp;\n':'')+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vCut<0.0)discard;');
      if(damp)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(0.17,roughnessFactor-vDamp*0.64);');
    };
    material.customProgramCacheKey=()=>damp?'cut-wet':'cut';return material;
  }
  const surface=mesh(world,terra,clipped(mat(0xead0a8,.98,0,{map:Craft.sand,bumpMap:Craft.sand,bumpScale:.024,vertexColors:true}),true));
  surface.customDepthMaterial=clipped(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}));
  surface.userData.kind='sand';surface.frustumCulled=false;
  const sandWallPos=[],sandWallIdx=[];
  for(const side of [0,1,2,3]){
    const count=side%2?nz:nx,base=sandWallPos.length/3;
    for(let i=0;i<count;i++){
      const x=side%2?(side===1?P.width/2:-P.width/2):P.xs[i],z=side%2?P.zs[i]:(side===0?-P.depth/2:P.depth/2);
      sandWallPos.push(x,-.51,z,x,.135,z);if(i<count-1){const k=base+i*2;sandWallIdx.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
  }
  const wallGeo=new T.BufferGeometry();wallGeo.setAttribute('position',new T.Float32BufferAttribute(sandWallPos,3));wallGeo.setIndex(sandWallIdx);wallGeo.computeVertexNormals();
  mesh(world,wallGeo,mat(0xb89b73,.94,0,{side:T.DoubleSide}));
  function band(cols,rows,extra=false){
    const g=new T.BufferGeometry(),positions=new Float32Array(cols*rows*3),cols3=new Float32Array(cols*rows*3),uv=new Float32Array(cols*rows*2),ind=[];
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const k=j*cols+i;uv[k*2]=i/(cols-1);uv[k*2+1]=j*.15;
      if(i<cols-1&&j<rows-1)ind.push(k,k+cols,k+1,k+1,k+cols,k+cols+1);
    }
    g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('color',new T.BufferAttribute(cols3,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(ind);
    if(extra)g.setAttribute('cutEdge',new T.BufferAttribute(new Float32Array(cols*rows),1));return g;
  }
  const tunnel=mesh(world,band(25,44,true),clipped(mat(0xb5a080,.8,0,{side:T.DoubleSide,vertexColors:true,map:Craft.sand,bumpMap:Craft.sand,bumpScale:.018})));
  tunnel.frustumCulled=false;tunnel.castShadow=false;
  const floor=mesh(world,band(11,44),mat(0x9d896c,.81,0,{vertexColors:true,side:T.DoubleSide,map:Craft.sand}));
  floor.castShadow=false;floor.frustumCulled=false;
  const riverMat=new T.MeshPhysicalMaterial({color:0x97c6c5,vertexColors:true,metalness:.14,roughness:.145,roughnessMap:Craft.rough,clearcoat:.9,clearcoatRoughness:.13,side:T.DoubleSide,transparent:true,opacity:.83,depthWrite:false});
  const river=mesh(world,band(9,64),riverMat);river.castShadow=false;river.frustumCulled=false;river.renderOrder=2;
  const drops=new T.InstancedMesh(new T.SphereGeometry(1,6,4),mat(0xb2dae1,.17,.17,{transparent:true,opacity:.71}),400);
  drops.count=0;drops.frustumCulled=false;drops.renderOrder=3;world.add(drops);
  const dust=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xffe5ac,.69,0,{emissive:0xc7a26a,emissiveIntensity:.15,transparent:true,opacity:.49}),s.dust.length);world.add(dust);dust.frustumCulled=false;
  const littleLeaves=s.leaves.map((l,i)=>{
    const g=grp(world),shade=mat([0xca9b51,0xaeb178,0xa7774f,0xc6af6b,0x9da56c][i],.73,0,{side:T.DoubleSide});
    const bl=mesh(g,Park.leaf,shade);bl.scale.set(.39,.31,.47);bl.position.z=-.22;
    tube(g,[[0,.005,-.26],[0,.033,-.04],[0,.027,.07],[0,.012,.24]],.008,m.honey);
    return g;
  });
  const spray=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xdec195,.91),130);spray.frustumCulled=false;spray.count=0;world.add(spray);
  const pebbleData=[];
  for(let i=0;i<1300;i++){const x=unit()*(P.width/2-.06),z=unit()*(P.depth/2-.06),r=.006+rng()**3*.023;
    pebbleData.push({x,z,r,angle:rng()*6,c:[0xc3a787,0xd1b38a,0xffe7bd,0xb39e87,0xe8ceb1][i%5]});}
  const pebbles=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xffffff,.91),pebbleData.length);
  pebbles.receiveShadow=true;pebbles.frustumCulled=false;world.add(pebbles);
  pebbleData.forEach((p,i)=>pebbles.setColorAt(i,new T.Color(p.c)));
  // A few overlapping scoop marks have real relief. Their location is fixed in the soil.
  const marks=new Float32Array(n);
  for(let k=0;k<n;k++){
    const x=pos[k*3],z=pos[k*3+2];
    const arc=Math.hypot((x+1.48)*.83,z-1.3);
    marks[k]=.023*Math.sin(arc*26)*Math.exp(-((arc-1.26)**2)/.20)*Math.exp(-((x+1.8)**2+(z-1.55)**2)*1.9);
  }
  const dummy=new T.Object3D(),vec=V(0,0,0);
  let aspect=1,sx=1,sz=1,toySize=1,viewW=1,viewH=1,frame=0;
  const rest={bucket:[-3.53,-1.09],can:[3.28,1.32],bridge:[2.13,-2.07],shovel:[-1.98,1.00]};
  function place(o,x,y,z,scale=1){
    if(o.parent===props){
      o.userData.sandX=x;o.userData.sandZ=z;o.position.set(x*sx,y,z*sz);o.scale.setScalar(scale);
    }else{o.position.set(x,y,z);o.scale.set(scale/sx,scale,scale/sz);}
  }
  function sandAt(x,z){return model.sample(s.h,x,z);}
  let bridgeSeat=0,bridgeHeading=0;
  function updateProps(){
    const w=s.toys,can=toys.can,sh=toys.shovel,br=toys.bridge,car=toys.car,b=toys.bucket;
    const p=clamp(s.bridge.p,0,1);
    place(b,rest.bucket[0],sandAt(...rest.bucket)-.07,rest.bucket[1],toySize*1.14);
    b.rotation.set(-.034,w.bucket.p+.20,.028+w.bucket.p);
    b.userData.bail.rotation.x=-.27+s.wind[3].p*.13+w.bucket.p*1.7;
    const pose=model.canPose();
    place(can,pose.x,pose.y,pose.z,toySize);can.rotation.set(pose.pitch,pose.yaw,pose.roll);
    const wp=can.userData.pool.geometry.attributes.position;
    for(let i=1;i<wp.count;i++){const a=(i-1)/42*7,j=Math.floor(a)%7,f=a-Math.floor(a);
      wp.setY(i,s.meniscus[j].p*(1-f)+s.meniscus[(j+1)%7].p*f);}
    wp.needsUpdate=true;can.userData.pool.geometry.computeVertexNormals();
    const travel=clamp(s.shovelReach.p,0,1);
    // The spring is loaded only while the blade contacts the sand.
    const xx=rest.shovel[0]+(P.cx+.52-rest.shovel[0])*travel,zz=rest.shovel[1]+.37*travel;
    place(sh,xx,sandAt(xx,zz)-.085+travel*(.17+s.scoop.p*.11),zz,toySize*.96);
    sh.rotation.set(-.59-.37*travel+s.scoop.p*.18,.08-.26*travel,.49-.92*travel+w.shovel.p);
    const bx=rest.bridge[0]+(P.cx-rest.bridge[0])*p,bz=rest.bridge[1]+(P.cz-rest.bridge[1])*p;
    bridgeHeading=-.23*(1-p)+.035*p;
    const size=toySize*.96;
    bridgeSeat=(1-p)*(sandAt(...rest.bridge)+.014)+p*(Math.max(sandAt(P.cx,P.cz)-Craft.arch(0)*size+.10,.095))+.86*s.lift.p;
    place(br,bx,bridgeSeat,bz,size);br.rotation.set(0,bridgeHeading,w.bridge.p*.5);
    br.userData.planks.forEach((o,i)=>o.position.y=Craft.arch((i-5)*.29)+s.plank[i].p);
    abutments.visible=p>.12;
    abutments.children.forEach((o,i)=>{
      const sign=i?1:-1,x=bx+sign*1.39*size/sx,z=bz-sign*Math.sin(bridgeHeading)*1.39*size/sz,
        base=sandAt(x,z)-.04,top=bridgeSeat+Craft.arch(1.39)*size-.05,height=Math.max(.02,top-base);
      o.position.set(x,(base+top)/2,z);o.scale.set(size/sx,height,size/sz);
    });
    br.updateWorldMatrix(true,false);
    vec.set(s.car.x,Craft.arch(s.car.x)+.056+s.car.bounce.p,0).applyMatrix4(br.matrixWorld);
    world.worldToLocal(vec);place(car,vec.x,vec.y,vec.z,size*.92);
    car.rotation.set(0,bridgeHeading,-.27*s.car.x+w.car.p);
    car.userData.wheels.forEach(o=>o.rotation.z=-s.car.wheel);
  }
  function vault(k,x,y,z){
    const r=model.boreAt(z);if(r<.004)return 1;
    const d=Math.abs(x-P.cx);
    return Math.max(d-r,y-(.03+1.28*Math.sqrt(Math.max(0,r*r-d*d))));
  }
  function updateTerrain(){
    const spots=[toys.can,toys.bucket,toys.bridge];
    for(let k=0;k<n;k++){
      const x=pos[k*3],z=pos[k*3+2],wet=s.water[k],h=s.h[k]+marks[k]*(1-wet);
      pos[k*3+1]=h;cut[k]=vault(k,x,h,z);wetness[k]=wet;
      let under=0;for(const o of spots){const dd=(x-o.userData.sandX)**2+(z-o.userData.sandZ)**2;if(dd<1.4)under+=.17*Math.exp(-dd*3.9);}
      const shade=tone[k]*(1-under)*(1-.27*wet),near=Math.max(0,1-Math.abs(cut[k])/.22)*s.bore*.10;
      colors[3*k]=shade*(1-near);colors[3*k+1]=shade*(1-near)*(1-.10*wet);colors[3*k+2]=shade*(1-near)*(1-.23*wet);
    }
    for(const name of ['position','color','cutEdge','damp'])terra.attributes[name].needsUpdate=true;terra.computeVertexNormals();
    for(let i=0;i<pebbleData.length;i++){const p=pebbleData[i],y=sandAt(p.x,p.z);
      const rr=vault(0,p.x,y,p.z)<0?0:p.r;dummy.position.set(p.x,y+.001,p.z);
      dummy.rotation.set(.25,p.angle,.1);dummy.scale.set(rr*1.5,rr*.41,rr);dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);}
    pebbles.instanceMatrix.needsUpdate=true;
    tunnel.visible=floor.visible=s.bore>.002;
    if(tunnel.visible){
      const g=tunnel.geometry,f=floor.geometry;
      for(let j=0;j<44;j++){
        const z=-2.72+j*6.12/43,r=model.boreAt(z);
        for(let i=0;i<25;i++){
          const a=Math.PI*i/24,x=P.cx+r*Math.cos(a),y=.03+1.28*r*Math.sin(a),k=j*25+i,h=sandAt(x,z);
          const occ=.41+.54*Math.exp(-Math.max(0,h-y)*1.9);
          g.attributes.position.setXYZ(k,x,y,z);g.attributes.cutEdge.setX(k,h-y);
          g.attributes.color.setXYZ(k,occ,occ*.96,occ*.89);
        }
        for(let i=0;i<11;i++){const k=j*11+i,x=P.cx+r*(i/5-1),occ=.56+.28*clamp(Math.abs(z-P.cz)*.65,0,1);
          f.attributes.position.setXYZ(k,x,.032,z);f.attributes.color.setXYZ(k,occ,occ,occ);}
      }
      for(const b of [g,f]){for(const key of ['position','color','cutEdge'])if(b.attributes[key])b.attributes[key].needsUpdate=true;b.computeVertexNormals();}
    }
  }
  function updateWater(){
    const g=river.geometry;river.visible=s.stream.some(a=>a.depth>.00024);
    if(river.visible){
      for(let j=0;j<64;j++){
        const u=j/63*31,i=Math.floor(u),a=s.stream[i],b=s.stream[Math.min(31,i+1)],f=u-i,
          d=a.depth+(b.depth-a.depth)*f,z=-2.55+u*.188,c=model.riverX(z),r=model.boreAt(z);
        const width=Math.min(.48,Math.sqrt(Math.max(0,d))*.94)*(1+.10*Math.sin(z*5.8+s.wind[1].p));
        for(let col=0;col<9;col++){const t=col/4-1,x=c+width*t,k=j*9+col,ground=sandAt(x,z);
          const inBore=r>.012&&Math.abs(x-P.cx)<r;
          const depth=Math.min(.07,d*.25),flutter=.009*Math.sin(z*14-(s.streamVolume+s.runoff)*11+t)*Math.min(1,a.speed*4);
          const y=(inBore?.033:ground+.008)+depth*(1-.3*t*t)+flutter;
          g.attributes.position.setXYZ(k,x,y,z);
          const occ=inBore?clamp(1-(ground-y)*.5,.4,1):1;
          const sediment=clamp(a.load*.7,0,.5);
          g.attributes.color.setXYZ(k,occ*(.88+sediment*.28),occ*(.99-sediment*.19),occ*(1-sediment*.48));
        }
      }
      g.attributes.position.needsUpdate=g.attributes.color.needsUpdate=true;g.computeVertexNormals();
    }
    spray.count=s.grains.length;
    s.grains.forEach((g,i)=>{dummy.position.set(g.x,g.y,g.z);dummy.rotation.set(g.life,g.x,0);dummy.scale.set(g.r,g.r*.76,g.r*.86);dummy.updateMatrix();spray.setMatrixAt(i,dummy.matrix);});spray.instanceMatrix.needsUpdate=true;
    drops.count=Math.min(s.drop.length,400);for(let i=0;i<drops.count;i++){
      const d=s.drop[i],r=d.kind?.012:.018;dummy.position.set(d.x,d.y,d.z);dummy.rotation.set(0,0,-.08);
      dummy.scale.set(r,r*(1+Math.abs(d.vy)*.92),r);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);
    }drops.instanceMatrix.needsUpdate=true;
    littleLeaves.forEach((o,i)=>{const l=s.leaves[i],z=l.u;o.visible=l.active&&z<3.32&&s.stage!=='pile';
      if(o.visible){const x=model.riverX(z)+l.side*.52;place(o,x,Math.min(sandAt(x,z)+.035,.23)+.013,z,.8);
        o.rotation.set(s.wind[i].p,l.angle,s.wind[(i+2)%12].p);}});
  }
  // Real light shafts are suggested by pollen passing through the sunlit gaps.
  const stageIndex={pile:0,wet:1,dig:1,stream:1,bridge:2,drive:2,rain:3,river:3,drain:3};
  const glyphs=[...document.querySelectorAll('.glyph')];let lastStage='';
  function updateWorld(dt){
    updateProps();if(frame%2===0)updateTerrain();updateWater();
    for(const b of landscape.boughs){const a=s.wind[b.index];b.o.rotation.z=a.p*.66;b.o.rotation.x=s.wind[(b.index+3)%12].p*.29;}
    s.dust.forEach((p,i)=>{const size=.007+(i%5)*.0023;dummy.position.set(p.x,p.y,p.z);
      dummy.scale.setScalar(size);dummy.rotation.set(0,0,0);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);});dust.instanceMatrix.needsUpdate=true;
    sun.intensity=2.64-s.rain*.96;sky.intensity=1.63+s.rain*.07;
    if(lastStage!==s.stage){glyphs.forEach((el,i)=>el.classList.toggle('on',stageIndex[s.stage]===i));lastStage=s.stage;}
    sound.update(s,dt);
  }
  // A very light four-direction highlight bloom, optical falloff and fine grain.
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:0,depthBuffer:true});
  const fxScene=new T.Scene(),fxCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const fx=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:target.texture},pixel:{value:new T.Vector2(1,1)}},
    vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D picture;uniform vec2 pixel;varying vec2 u;
    void main(){vec3 col=texture2D(picture,u).rgb,glow=vec3(0.);
      for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 off=vec2(cos(a),sin(a))*pixel*3.3;glow+=max(vec3(0.),texture2D(picture,u+off).rgb-1.18);}
      col+=glow*.007;vec2 d=u-0.5;col*=1.0-.205*dot(d,d);
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.0041;
    }`});
  fxScene.add(new T.Mesh(new T.PlaneGeometry(2,2),fx));
  // Fit the timber corners in perspective, keeping tool proportions on both layouts.
  function resize(){
    viewW=canvas.clientWidth||innerWidth;viewH=canvas.clientHeight||innerHeight;aspect=viewW/viewH;
    const portrait=clamp((1.08-aspect)/.63,0,1);
    sx=1-.40*portrait;sz=1+.39*portrait;toySize=1-.145*portrait;
    world.scale.set(sx,1,sz);props.scale.set(1/sx,1,1/sz);
    rest.bucket=[-3.54,-1.10-.51*portrait];rest.shovel=[-1.97-.46*portrait,1.08+.40*portrait];
    rest.bridge=[2.17-.02*portrait,-2.06-.25*portrait];rest.can=[3.25,1.34+.19*portrait];
    model.setLayout({sx,sz,size:toySize,x:rest.can[0],z:rest.can[1]});
    const focus=V(0,.62+.14*portrait,-.12*sz),dir=V(.19-.12*portrait,.48+.16*portrait,.91).normalize();
    camera.aspect=aspect;camera.updateProjectionMatrix();
    const points=[];
    for(const x of [-1,1])for(const z of [-1,1])points.push(V(x*(P.width/2+.4)*sx*(1-portrait*(z>0?.32:.12)),-.39,z*(P.depth/2+.4)*sz));
    points.push(V(-3.52*sx,2.29,-1.25*sz),V(2.42*sx,2.03,.96*sz));
    let lo=3,hi=85;
    for(let i=0;i<30;i++){
      const dist=(lo+hi)/2;camera.position.copy(focus).addScaledVector(dir,dist);camera.lookAt(focus);camera.updateMatrixWorld();
      const fits=points.every(v=>{const a=v.clone().project(camera);return Math.abs(a.x)<.966&&a.y>-.824&&a.y<.84;});
      if(fits)hi=dist;else lo=dist;
    }
    scene.fog.near=hi+2;scene.fog.far=hi+38;
    camera.position.copy(focus).addScaledVector(dir,hi);camera.lookAt(focus);camera.updateMatrixWorld();
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7,Math.sqrt(2200000/(viewW*viewH))));
    renderer.setSize(viewW,viewH,false);const drawing=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(drawing.x,drawing.y);fx.uniforms.pixel.value.set(1/drawing.x,1/drawing.y);
    updateProps();updateTerrain();
  }
  const ray=new T.Raycaster(),mouse=new T.Vector2();let pointer=null,activeKind='';
  function aimedKind(){
    return ({pile:'sand',wet:'can',dig:'shovel',stream:'can',bridge:'bridge',drive:'car',river:'leaf'})[s.stage];
  }
  const touchPoint={can:[.06,.83,.45],shovel:[0,1.56,-.05],bridge:[-.29,.565,.07],car:[0,.62,.025]};
  function hit(ev,forgiving=false){
    const rect=canvas.getBoundingClientRect();mouse.set((ev.clientX-rect.left)/rect.width*2-1,1-(ev.clientY-rect.top)/rect.height*2);ray.setFromCamera(mouse,camera);
    const hits=ray.intersectObjects([props,surface,...littleLeaves.filter(o=>o.visible)],true);
    let direct=null;
    for(const h of hits){
      let o=h.object,kind;
      while(o){if(o.userData.kind){kind=o.userData.kind;break;}if(littleLeaves.includes(o)){kind='leaf';break;}o=o.parent;}
      if(kind){const v=world.worldToLocal(h.point.clone());
        if(kind==='sand'&&s.stage==='dig'&&Math.abs(v.x-P.cx)<1&&v.z>P.cz-.35&&v.z<2.24)kind='mouth';
        direct={kind,x:v.x,z:v.z};break;}
    }
    const want=aimedKind(),o=toys[want];
    if(forgiving&&o&&touchPoint[want]&&(!direct||direct.kind==='sand')){
      const contact=V(...touchPoint[want]);o.localToWorld(contact);contact.project(camera);
      if(Math.hypot((mouse.x-contact.x)*rect.width/2,(mouse.y-contact.y)*rect.height/2)<22)
        return {kind:want,x:o.userData.sandX,z:o.userData.sandZ};
    }
    return direct;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);sound.wake();
    const h=hit(e,true);if(h){activeKind=h.kind;model.act(h.kind,h.x,h.z);}e.preventDefault();
  });
  canvas.addEventListener('pointermove',e=>{
    if(pointer===e.pointerId&&activeKind==='sand'){const h=hit(e);if(h&&h.kind==='sand')model.move(h.x,h.z);}
    else if(pointer===null&&e.pointerType==='mouse'){
      const h=hit(e),valid=h&&(h.kind===aimedKind()||(s.stage==='dig'&&h.kind==='mouth')||(s.stage==='pile'&&h.kind==='bucket'));
      canvas.style.cursor=valid?'pointer':'default';
    }
  });
  function up(e){if(e.pointerId===pointer){model.release();pointer=null;activeKind='';}}
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
  document.querySelector('#sound').addEventListener('click',e=>{const on=sound.toggle(),b=e.currentTarget;b.classList.toggle('off',!on);
    b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'音を切る':'音を出す');});
  let guideAge=0,guideGoal='',demonstrating=false;
  function hint(dt){
    const wanted=aimedKind();
    if(s.idle<4||pointer!==null||!wanted||(s.stage==='drive'&&s.car.started)||(s.stage==='bridge'&&s.bridge.attached)){
      guide.style.opacity=0;guideAge=0;demonstrating=false;return;
    }
    if(!demonstrating||guideGoal!==s.stage){guideAge=0;guideGoal=s.stage;demonstrating=true;}guideAge+=dt;
    const phase=guideAge%4.7,action=clamp((phase-.45)/1.6,0,1),ease=action*action*(3-2*action);
    if(wanted==='sand'){vec.set(P.cx-.76+.65*ease,sandAt(P.cx-.76+.65*ease,P.cz+.65-.42*ease)+.065,P.cz+.65-.42*ease);world.localToWorld(vec);}
    else if(wanted==='leaf'){const l=littleLeaves.find(o=>o.visible);if(!l){guide.style.opacity=0;return;}l.getWorldPosition(vec);}
    else {const o=toys[wanted];vec.set(...touchPoint[wanted]);
      if(wanted==='bridge')vec.x-=.27*ease;if(wanted==='shovel')vec.y-=.30*ease;if(wanted==='can')vec.x-=.21*ease;
      o.localToWorld(vec);}
    vec.project(camera);const size=.88+.12*(1-ease);guide.style.transform='translate('+((vec.x*.5+.5)*viewW-7)+'px,'+((.5-vec.y*.5)*viewH-8-7*(1-ease))+'px) rotate(-12deg) scale('+size+')';
    guide.style.opacity=String(.86*Math.min(1,phase/.4,Math.max(0,(3.2-phase)/.55)));
  }
  // A loose grain catches the sun on the current object before the hand arrives.
  const glints=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xffe6b5,.43,.15,{emissive:0xffdb9d,emissiveIntensity:.56}),8);
  glints.frustumCulled=false;world.add(glints);
  function cue(){
    const kind=aimedKind();glints.visible=!!kind&&kind!=='leaf'&&pointer===null&&!(s.stage==='drive'&&s.car.started)&&!(s.stage==='bridge'&&s.bridge.attached);
    if(!glints.visible)return;
    let x=P.cx,y=sandAt(x,P.cz),z=P.cz;
    if(kind!=='sand'){const o=toys[kind];x=o.userData.sandX;y=o.position.y+({can:1.38,shovel:1.42,bridge:.73,car:.52}[kind]||0)*toySize;z=o.userData.sandZ;}
    for(let i=0;i<8;i++){
      const b=s.wind[i],a=i*2.399+b.p*8,r=kind==='sand'?.58:.32;
      const xx=x+r*Math.cos(a),zz=z+r*Math.sin(a),yy=kind==='sand'?sandAt(xx,zz)+.09:y;
      dummy.position.set(xx,yy+.10*i/8+b.p*.42,zz);
      const sz=.009+.019*Math.max(0,Math.sin(i*3.4+b.p*26));
      dummy.scale.set(sz,sz*1.4,sz);dummy.rotation.set(.3,a,.5);dummy.updateMatrix();glints.setMatrixAt(i,dummy.matrix);
    }glints.instanceMatrix.needsUpdate=true;
  }
  resize();window.addEventListener('resize',resize);
  let then=performance.now();
  document.addEventListener('visibilitychange',()=>{then=performance.now();if(document.hidden){model.release();pointer=null;}});
  function draw(now){
    const dt=Math.min(.08,Math.max(0,(now-then)/1000));then=now;
    if(!document.hidden){
      model.step(dt);updateWorld(dt);cue();hint(dt);
      renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(fxScene,fxCam);frame++;
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
