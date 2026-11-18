/* Quarter-resolution highlight blur, combined in linear light before the display transform. */
function nurseryFinish(renderer) {
  const T=THREE, type=renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType;
  const sceneColor=new T.WebGLRenderTarget(1,1,{type,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)});
  const small=()=>new T.WebGLRenderTarget(1,1,{type,depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
  const bright=small(),tmp=small(),blurred=small(),cam=new T.OrthographicCamera(-1,1,1,-1,0,1),screen=new T.Scene();
  const vert='varying vec2 at;void main(){at=uv;gl_Position=vec4(position.xy,0.,1.);}';
  function pass(uniforms,frag){return new T.ShaderMaterial({uniforms,vertexShader:vert,fragmentShader:'varying vec2 at;\n'+frag,depthTest:false,depthWrite:false,toneMapped:false});}
  const extract=pass({tex:{value:sceneColor.texture}},'uniform sampler2D tex;void main(){vec3 c=texture2D(tex,at).rgb;float b=dot(c,vec3(.213,.715,.072));gl_FragColor=vec4(c*smoothstep(.95,2.0,b),1.);}');
  const blur=pass({tex:{value:bright.texture},offset:{value:new T.Vector2()}},`uniform sampler2D tex;uniform vec2 offset;
  void main(){vec3 c=texture2D(tex,at).rgb*.227027;
  c+=(texture2D(tex,at+1.384615*offset).rgb+texture2D(tex,at-1.384615*offset).rgb)*.316216;
  c+=(texture2D(tex,at+3.230769*offset).rgb+texture2D(tex,at-3.230769*offset).rgb)*.070270;
  gl_FragColor=vec4(c,1.);}`);
  const combine=pass({base:{value:sceneColor.texture},glow:{value:blurred.texture}},`uniform sampler2D base;uniform sampler2D glow;
    void main(){vec3 c=texture2D(base,at).rgb+.057*texture2D(glow,at).rgb;
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
    gl_FragColor.rgb+=grain*.006;
    }`);combine.toneMapped=true;
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),extract);quad.frustumCulled=false;screen.add(quad);
  function screenPass(material,to){quad.material=material;renderer.setRenderTarget(to);renderer.render(screen,cam);}
  return {resize(w,h){const ratio=renderer.getPixelRatio();sceneColor.setSize(Math.ceil(w*ratio),Math.ceil(h*ratio));
      for(const rt of [bright,tmp,blurred])rt.setSize(Math.ceil(w*ratio/4),Math.ceil(h*ratio/4));},
    draw(scene,camera){
      renderer.setRenderTarget(sceneColor);renderer.render(scene,camera);
      screenPass(extract,bright);blur.uniforms.tex.value=bright.texture;blur.uniforms.offset.value.set(1.4/bright.width,0);screenPass(blur,tmp);
      blur.uniforms.tex.value=tmp.texture;blur.uniforms.offset.value.set(0,1.4/bright.height);screenPass(blur,blurred);
      screenPass(combine,null);
    }};
}
