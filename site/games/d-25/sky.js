const Atmosphere=(()=>{
  const T=THREE;
  function sky(s){
    // Procedural daylight dome. Cloud optical density is sampled along the view ray.
    const u={heat:{value:.12},air:{value:new T.Vector2(0,0)}};
    const m=new T.ShaderMaterial({uniforms:u,side:T.BackSide,depthWrite:false,
      vertexShader:`varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`
      varying vec3 ray;uniform float heat;uniform vec2 air;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      float fb(vec2 p){float v=0.,a=.53;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(1.7,1.11,-1.11,1.7)*p+14.39;a*=.49;}return v;}
      void main(){
        vec3 d=normalize(ray);float y=max(0.,d.y),sunset=smoothstep(.18,.9,heat),morning=clamp(-heat*2.,0.,1.);
        vec3 horizon=mix(vec3(1.01,.92,.72),vec3(1.43,.64,.34),sunset);
        vec3 blue=mix(vec3(.155,.40,.57),vec3(.31,.36,.52),sunset);
        blue=mix(blue,vec3(.24,.47,.61),morning);
        vec3 col=mix(horizon,blue,smoothstep(-.09,.64,pow(y,.79)));
        float light=pow(max(0.,dot(d,normalize(vec3(-.48,.26,-.78)))),7.);
        col+=vec3(.48,.25,.055)*light;
        vec2 loc=d.xz/(y+.115)*1.27+vec2(7.4,4.8)+air;
        float mass=fb(loc+vec2(.35*fb(loc*1.8),0.));
        float edge=smoothstep(.525,.642,mass)*smoothstep(.002,.105,y);
        vec3 cloud=mix(vec3(.81,.84,.83),vec3(1.53,1.47,1.28),smoothstep(.54,.73,fb(loc-vec2(.10,.13))));
        cloud=mix(cloud,cloud*vec3(1.14,.78,.63),sunset*.8);
        col=mix(col,cloud,edge*.80);
        float wisp=smoothstep(.63,.81,fb(d.xz/(y+.16)*vec2(2.3,6.5)+air*.5+66.));
        col=mix(col,vec3(1.09,1.13,1.09),wisp*.24*smoothstep(.04,.3,y));
        gl_FragColor=vec4(col,1.);
      }`});
    const dome=new T.Mesh(new T.SphereGeometry(270,36,20),m);dome.renderOrder=-1000;dome.frustumCulled=false;s.add(dome);return {dome,u};
  }
  function environment(renderer,scene){
    // Analytic sky and warm ground form a local radiance environment for glass and metal.
    const w=256,h=128,arr=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const lat=(y/h-.5)*Math.PI,sy=Math.sin(lat),lon=(x/w-.5)*Math.PI*2;
      const k=Math.max(0,sy),g=sy<0?[.45,.40,.28]:[.89-.38*k,.89-.20*k,.84-.045*k];
      const a=Math.exp(-22*((lon+1.49)**2+(lat-.36)**2));
      for(let c=0;c<3;c++)arr[(y*w+x)*4+c]=Math.min(255,(g[c]+a*.42)*255);
      arr[(y*w+x)*4+3]=255;
    }
    const tex=new T.DataTexture(arr,w,h);tex.colorSpace=T.SRGBColorSpace;tex.mapping=T.EquirectangularReflectionMapping;tex.needsUpdate=true;
    const pm=new T.PMREMGenerator(renderer),target=pm.fromEquirectangular(tex);scene.environment=target.texture;scene.environmentIntensity=.52;pm.dispose();tex.dispose();
  }
  function finish(renderer){
    const rt=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,samples:0});
    const u={picture:{value:rt.texture},pixel:{value:new T.Vector2()},grain:{value:0}};
    const m=new T.ShaderMaterial({uniforms:u,depthTest:false,depthWrite:false,vertexShader:'varying vec2 v; void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`varying vec2 v;uniform sampler2D picture;uniform vec2 pixel;uniform float grain;
      void main(){vec3 rgb=texture2D(picture,v).rgb;
      vec3 glow=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.785398;vec3 nearby=texture2D(picture,v+vec2(cos(a),sin(a))*pixel*3.3).rgb;glow+=max(nearby-vec3(1.05),0.);}
      rgb+=glow*.010;
      rgb*=1.-.084*pow(length(v-.5)*1.414,1.7);
      gl_FragColor=vec4(rgb,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy+grain,vec2(12.9898,78.233)))*43758.5453)-.5)*.005;
      }`});
    const screen=new T.Scene(),cam=new T.OrthographicCamera(-1,1,1,-1,0,1);screen.add(new T.Mesh(new T.PlaneGeometry(2,2),m));
    return {resize(){const size=new T.Vector2();renderer.getDrawingBufferSize(size);rt.setSize(size.x,size.y);u.pixel.value.set(1/size.x,1/size.y);},
      render(scene,camera,gr){u.grain.value=gr;renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(screen,cam);}};
  }
  return {sky,environment,finish};
})();
