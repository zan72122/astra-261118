/* Procedural sky radiance and local water optics. No downloaded textures. */
const HarborOcean=(()=>{
  const T=THREE, TAU=2*Math.PI;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  let seed=71831;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const table=Float32Array.from({length:128*128},random);
  function noise(x,y){
    const i=Math.floor(x),j=Math.floor(y),lookup=(a,b)=>table[(a&127)+128*(b&127)];
    let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);
    return (lookup(i,j)*(1-u)+lookup(i+1,j)*u)*(1-v)+(lookup(i,j+1)*(1-u)+lookup(i+1,j+1)*u)*v;
  }
  function skyMap(dusk){
    const w=768,h=384,buf=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const el=(y/h-.5)*Math.PI,az=(x/w-.5)*TAU,dy=Math.sin(el),dx=Math.cos(el)*Math.cos(az),dz=Math.cos(el)*Math.sin(az);
      const up=Math.pow(clamp(dy),.58),glow=Math.pow(clamp(-.46*dx+.16*dy-.87*dz),5);
      const lo=dusk?[246,202,160]:[225,226,205],hi=dusk?[119,127,163]:[111,166,184];
      const col=lo.map((c,i)=>c+(hi[i]-c)*up+(dusk?[8,4,-1]:[9,7,1])[i]*glow);
      if(dy>0){
        const px=dx/(dy+.078)*1.45+22,py=dz/(dy+.078)*1.45+14;
        const f=noise(px,py)*.56+noise(px*2.03,py*2.03)*.24+noise(px*4.1,py*4.1)*.12+noise(px*8.2,py*8.2)*.056+noise(px*16.2,py*16.2)*.024;
        let density=clamp((f-.48)*4.3)*clamp(dy*18)*.78;
        const shadow=clamp((f-.51)*1.9);
        for(let i=0;i<3;i++){const cloud=(dusk?[244,211,186]:[249,247,230])[i]-(dusk?[60,46,27]:[45,39,29])[i]*shadow;
          col[i]=col[i]*(1-density)+cloud*density;}
        const dot=dx*(-.54)+dy*.29+dz*(-.79),solar=Math.pow(Math.max(0,dot),95);
        for(let i=0;i<3;i++)col[i]+=solar*[24,20,8][i];
      }
      const k=(y*w+x)*4;for(let i=0;i<3;i++)buf[k+i]=clamp(col[i],0,255);buf[k+3]=255;
    }
    const tx=new T.DataTexture(buf,w,h);tx.colorSpace=T.SRGBColorSpace;tx.mapping=T.EquirectangularReflectionMapping;
    tx.wrapS=T.RepeatWrapping;tx.magFilter=tx.minFilter=T.LinearFilter;tx.needsUpdate=true;return tx;
  }
  function addSky(scene){
    const day=skyMap(false),dusk=skyMap(true);
    scene.environment=day;scene.environmentIntensity=.45;
    const mix={value:0};
    const m=new T.MeshStandardMaterial({color:0x000000,emissive:0xffffff,emissiveMap:day,roughness:1,side:T.BackSide,depthWrite:false,fog:false});
    m.onBeforeCompile=s=>{
      s.uniforms.duskMap={value:dusk};s.uniforms.duskAmount=mix;
      s.fragmentShader='uniform sampler2D duskMap; uniform float duskAmount;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',
        'totalEmissiveRadiance *= mix(texture2D(emissiveMap,vEmissiveMapUv).rgb, texture2D(duskMap,vEmissiveMapUv).rgb,duskAmount);');
    };
    const sky=new T.Mesh(new T.SphereGeometry(210,48,24),m);sky.renderOrder=-9;scene.add(sky);
    return {sky,mix};
  }
  function rippleMap(){
    const n=256,h=new Float32Array(n*n),data=new Uint8Array(n*n*4);
    const modes=Array.from({length:16},(_,i)=>({x:Math.round(1+random()*5+i*.37),y:Math.round(3+random()*5+i*.7),p:random()*TAU,a:.30/(1+i*.24)}));
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=TAU*i/n,y=TAU*j/n,wx=.09*Math.sin(x*2-y)+.055*Math.sin(3*y+2*x),wy=.16*Math.sin(2*x+y)+.05*Math.cos(3*x-2*y);
      for(const m of modes)h[j*n+i]+=m.a*Math.sin(m.x*(x+wx)+m.y*(y+wy)+m.p);
    }
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=(j*n+i)*4;
      data[k]=clamp(.5+(h[j*n+(i+1)%n]-h[j*n+(i+n-1)%n])*.94)*255;
      data[k+1]=clamp(.5+(h[((j+1)%n)*n+i]-h[((j+n-1)%n)*n+i])*.94)*255;
      data[k+2]=clamp(.5+h[j*n+i]*.47)*255;data[k+3]=255;
    }
    const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
  }
  function addWater(scene,sim,reflection){
    const bytes=new Uint8Array(43*104*4),field=new T.DataTexture(bytes,43,104);
    field.magFilter=field.minFilter=T.LinearFilter;field.needsUpdate=true;
    const uniforms={
      seaMirror:{value:reflection.texture}, seaMatrix:{value:new T.Matrix4()},
      rippleTex:{value:rippleMap()},fieldTex:{value:field},
      packet:{value:Array.from({length:24},()=>new T.Vector4())},waveData:{value:Array.from({length:24},()=>new T.Vector2())},
      windState:{value:Array.from({length:6},()=>new T.Vector4())}, flowMap:{value:new T.Vector4()},
      cargo:{value:Array.from({length:5},()=>new T.Vector4())},evening:{value:0},activeCargo:{value:0}
    };
    const common=`
      uniform sampler2D fieldTex;
      uniform vec4 packet[24], windState[6];
      uniform vec2 waveData[24];
      uniform int activeCargo;
      float fieldHeight(vec2 p){return (texture2D(fieldTex,(p-vec2(-12.6,-52.2)) / vec2(25.8,62.4)+0.5/vec2(43.,104.)).r-.50196)*.48;}
      float packetY(vec2 p) {
        float y=0.;
        for(int i=0;i<24;i++){
          if(i>=activeCargo) break;
          float r=distance(p,packet[i].xy),d=r-packet[i].z,l=waveData[i].x;
          float q=d/(l*.48);
          y+=packet[i].w*exp(-.5*q*q)*cos(6.283185*d/l)*inversesqrt(1.+.22*r);
        }return y;
      }
      float oceanHeight(vec2 p){
        float y=fieldHeight(p)+packetY(p);
        for(int i=0;i<6;i++)y+=windState[i].w*sin(dot(p,windState[i].xy)+windState[i].z);
        return y;
      }
    `;
    const material=new T.MeshStandardMaterial({color:0x387e80,metalness:.12,roughness:.24,envMapIntensity:.38});
    material.onBeforeCompile=s=>{
      Object.assign(s.uniforms,uniforms);
      s.vertexShader=common+'uniform mat4 seaMatrix; varying vec4 reflUV; varying vec3 oceanPos;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`
        vec3 transformed=position;
        transformed.y+=oceanHeight(transformed.xz);
        oceanPos=(modelMatrix*vec4(transformed,1.)).xyz;
        reflUV=seaMatrix*vec4(oceanPos,1.);`);
      s.fragmentShader=common+`
        uniform sampler2D seaMirror,rippleTex;
        uniform vec4 flowMap,cargo[5];
        uniform float evening;
        varying vec4 reflUV;varying vec3 oceanPos;
      `+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`
        vec2 pp=oceanPos.xz;
        vec3 r1=texture2D(rippleTex,pp*vec2(.105,.148)+flowMap.xy).rgb;
        vec3 r2=texture2D(rippleTex,vec2(pp.x-pp.y,pp.y+pp.x)*vec2(.205,.125)-flowMap.zw).rgb;
        vec3 r3=texture2D(rippleTex,pp*vec2(.41,.53)+flowMap.zy).rgb;
        vec2 slope=(r1.rg-.5)*.315+(r2.gr-.5)*vec2(.168,-.168)+(r3.rg-.5)*.070;
        float base=packetY(pp)+fieldHeight(pp);
        slope+=vec2(packetY(pp+vec2(.04,0.))+fieldHeight(pp+vec2(.04,0.))-base,
                    packetY(pp+vec2(0.,.04))+fieldHeight(pp+vec2(0.,.04))-base)*20.;
        vec3 wn=normalize(vec3(-slope.x,1.,-slope.y));
        normal=normalize(mat3(viewMatrix)*wn);
      `);
      s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
        vec3 eye=normalize(cameraPosition-oceanPos);
        float fres=.22+.62*pow(1.-max(0.,dot(eye,wn)),3.);
        vec2 uv=reflUV.xy/reflUV.w*.5+.5;
        float dst=length(cameraPosition-oceanPos);
        uv+=slope*vec2(.12,.21)/(1.+.021*dst);
        vec3 reflectionCol=texture2D(seaMirror,clamp(uv,.002,.998)).rgb;
        float surfaceDetail=(r1.b-.5)*.19+(r2.b-.5)*.12;
        float depthMask=smoothstep(-26.,6.,pp.y);
        vec3 bottom=mix(vec3(.042,.164,.184),vec3(.078,.286,.279),depthMask);
        float lacing=abs(sin((pp.x*.92+pp.y*.6)*2.9+(r1.b*4.4+r2.b*2.5))* .56+sin(pp.y*2.3-pp.x*.83+r1.r*2.8)*.44);
        float caustic=pow(1.-lacing,10.)*depthMask*.045;
        vec3 baseWater=mix(bottom,outgoingLight,.27)+surfaceDetail*vec3(.25,.55,.51)+caustic*vec3(.7,1.,.78);
        float shade=1.;
        for(int i=0;i<5;i++){
          vec2 rel=(pp-cargo[i].xy)/cargo[i].zw;
          shade*=1.-.30*exp(-2.65*dot(rel,rel));
        }
        outgoingLight=mix(baseWater*shade,reflectionCol,fres)+totalSpecular*.22;
        float twinkle=pow(max(.0,1.-abs(r1.b-.78)*4.1),5.)*smoothstep(.66,.84,r2.b);
        outgoingLight+=vec3(.93,.89,.7)*twinkle*.50;
        outgoingLight+=vec3(.62,.86,.80)*smoothstep(.016,.14,base)*.48;
        outgoingLight=mix(outgoingLight,outgoingLight*vec3(1.24,.88,.83)+vec3(.022,.002,.018),evening*.72);
        #include <opaque_fragment>
      `);
    };
    const g=new T.PlaneGeometry(264,235,220,211);g.rotateX(-Math.PI/2);g.translate(0,0,-46);
    const water=new T.Mesh(g,material);water.receiveShadow=true;scene.add(water);
    function sync(st){
      water.position.y=st.tide;
      const n=Math.min(24,sim.waves.length);
      uniforms.activeCargo.value=n;
      for(let i=0;i<n;i++){const w=sim.waves[sim.waves.length-n+i];
        uniforms.packet.value[i].set(w.x,w.z,w.radius,w.strength);uniforms.waveData.value[i].set(w.lambda,w.age);}
      sim.breeze.forEach((b,i)=>uniforms.windState.value[i].set(Math.cos(b.dir)/b.length,Math.sin(b.dir)/b.length,b.phase,b.amp));
      const b=sim.breeze;uniforms.flowMap.value.set(b[0].phase*.023,-b[1].phase*.014,b[2].phase*.011,b[4].phase*.012);
      sim.objects.forEach((f,i)=>uniforms.cargo.value[i].set(f.x,f.z,.25+f.width*.72,.27+f.depth*.67));
      uniforms.evening.value=st.sun;
      for(let i=0;i<sim.grid.length;i++)bytes[i*4]=clamp(.50196+sim.grid[i]/.48)*255;
      field.needsUpdate=true;
    }
    return {water,sync,uniforms};
  }
  return {addSky,addWater};
})();
