/* Procedural surface finishes and daylight. All world surfaces use a standard or physical BRDF. */
window.GardenMaterials=function(T){
  const fract=x=>x-Math.floor(x),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
  function noise(x,y){
    const i=Math.floor(x),j=Math.floor(y);let a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);
    return (hash(i,j)*(1-a)+hash(i+1,j)*a)*(1-b)+(hash(i,j+1)*(1-a)+hash(i+1,j+1)*a)*b;
  }
  function data(w,h,fn,color=true){
    const a=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const c=fn(x,y),i=4*(x+y*w);a[i]=clamp(c[0],0,255);a[i+1]=clamp(c[1],0,255);a[i+2]=clamp(c[2],0,255);a[i+3]=255;
    }
    const tx=new T.DataTexture(a,w,h,T.RGBAFormat);tx.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
    tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.magFilter=T.LinearFilter;tx.minFilter=T.LinearMipmapLinearFilter;
    tx.generateMipmaps=true;tx.anisotropy=4;tx.needsUpdate=true;return tx;
  }
  const rough=data(64,64,(x,y)=>{const v=215+noise(x*.21,y*.21)*35+hash(x,y)*5;return [v,v,v];},false);
  function mat(color,roughness=.68,metalness=0,extra={}){return new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,...extra});}
  const wood=data(512,256,(x,y)=>{
    const bx=x/512,by=y/256;
    const wave=4.5*Math.sin(2*Math.PI*bx+.4)+2.1*Math.sin(4*Math.PI*bx+by*3)+noise(x*.014,y*.018)*4;
    const grain=noise(x*.007,(y+wave)*.47),fine=noise(x*.042,(y+wave)*1.8),stripe=Math.pow((1+Math.sin((y+wave)*.44+noise(x*.007,y*.025)*4))*.5,9);
    const k=(grain-.5)*29+(fine-.5)*16-10*stripe+(hash(x,y)-.5)*9+12*noise(x*.004,y*.026);
    return [183+k,146+k*.92,102+k*.86];
  });
  const textile=data(256,256,(x,y)=>{
    const a=(x%64)<27,b=(y%64)<27,d=((x%64)<3?7:0)+((y%64)<3?7:0),k=(a?1:0)+(b?1:0);
    const f=(x%2)*5+(y%3)*1.8+hash(x,y)*6-d;
    return [231-k*31+f,225-k*20+f,199-k*30+f];
  });textile.repeat.set(4.6,3.1);
  const grass=data(256,256,(x,y)=>{const k=noise(x*.029,y*.029)*32+noise(x*.17,y*.17)*17+hash(x,y)*11;return [101+k,125+k,73+k*.78];});
  grass.repeat.set(35,35);
  const canopy=data(192,192,(x,y)=>{
    const w=noise(x*.045,y*.045),l=noise(x*.24+w*4,y*.30),f=noise(x*.61,y*.66);
    const k=172+w*20+l*36+f*25;return [k+2,k+4,k];
  });canopy.repeat.set(2,1.4);
  const stone=data(128,128,(x,y)=>{const k=noise(x*.08,y*.08)*12+hash(x,y)*20;return [190+k,182+k,155+k];});
  function sky(){
    const dir=new T.Vector3(-.245,.236,-1).normalize();
    const tx=data(768,384,(x,y)=>{
      const h=(y+.5)/384,phi=((x+.5)/768-.5)*Math.PI*2,lat=(h-.5)*Math.PI;
      const dy=Math.sin(lat),dx=Math.cos(phi)*Math.cos(lat),dz=Math.sin(phi)*Math.cos(lat);
      if(dy<-.02){let k=Math.min(1,-dy);return [131-32*k,145-36*k,105-37*k];}
      const elev=Math.pow(Math.max(0,dy),.52);
      let c=[243-elev*115,235-elev*54,205+elev*15];
      const dist=Math.max(.065,dy),u=dx/dist,v=dz/dist;
      const density=noise(u*.62+12,v*.62+18)*.52+noise(u*1.65,v*1.65)*.30+noise(u*4.6,v*4.6)*.13+noise(u*13,v*13)*.05;
      const cloud=clamp((density-.50)*3.8,0,.88)*clamp(dy*18,0,1);
      const dot=clamp(dx*dir.x+dy*dir.y+dz*dir.z,0,1),glow=dot**27,hot=dot**750;
      c=c.map((k,i)=>k*(1-cloud)+[251,249,234][i]*cloud+glow*[36,19,2][i]+hot*[88,73,47][i]);
      return c;
    });tx.mapping=T.EquirectangularReflectionMapping;return tx;
  }
  function soap(flat){
    const u={thick:{value:new T.Vector4(420,420,420,420)},flow:{value:0},span:{value:new T.Vector4(1,1,1,1)},dusk:{value:0}};
    const m=new T.MeshPhysicalMaterial({color:0xe0faf7,metalness:.17,roughness:.075,roughnessMap:rough,
      iridescence:1,iridescenceIOR:1.34,iridescenceThicknessMinimum:180,iridescenceThicknessMaximum:590,clearcoat:1,clearcoatRoughness:.04,
      transparent:true,opacity:.75,depthWrite:false,side:flat?T.DoubleSide:T.FrontSide,envMapIntensity:1.15});
    m.userData.u=u;
    m.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{filmNm:u.thick,filmFlow:u.flow,filmSpan:u.span,lateLight:u.dusk});
      shader.vertexShader='varying vec3 skinLocal;varying vec2 skinUV;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nskinLocal=position;skinUV=uv;');
      shader.fragmentShader='uniform vec4 filmNm;uniform vec4 filmSpan;uniform float filmFlow;uniform float lateLight;varying vec3 skinLocal;varying vec2 skinUV;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec3 N=normalize(normal), V=normalize(vViewPosition);
        float edge=pow(1.0-clamp(abs(dot(N,V)),0.0,1.0),0.72);
        vec3 loc=normalize(skinLocal+vec3(0.0001));
        float layer=mix(mix(filmNm.x,filmNm.y,loc.x*.5+.5),mix(filmNm.z,filmNm.w,loc.z*.5+.5),loc.y*.5+.5);
        float curl=sin(loc.x*4.9+loc.z*3.1+sin(loc.y*5.5+filmFlow)*1.5);
        float optical=(layer*.011+loc.y*3.4+curl*.55+sin(10.0*loc.y+loc.x*5.0+curl)*.17+filmFlow*.3);
        vec3 rainbow=.56+.44*cos(optical+vec3(.15,2.24,4.38)+edge*3.5);
        float incidence=clamp(abs(dot(N,V)),0.,1.);
        float refracted=sqrt(1.-(1.-incidence*incidence)/(1.333*1.333));
        float pathNm=2.666*max(100.,layer+loc.y*92.+curl*21.)*refracted;
        vec3 spectral=.5-.5*cos(6.2831853*pathNm/vec3(650.,535.,450.));
        rainbow=mix(rainbow,spectral,.38+lateLight*.25);
        float streak=pow(max(0.0, dot(N,normalize(vec3(-.43,.72,.54)))),42.0);
        float gleam=pow(max(0.0,dot(N,normalize(vec3(.40,.71,.60)))),115.0);
        float line=smoothstep(.77,.98,edge);
        outgoingLight=outgoingLight*.63+rainbow*(.38+edge*(1.06+.34*lateLight))+vec3(1.0,.99,.92)*(streak*1.9+gleam*1.2+line*.42);
        diffuseColor.a=clamp(.125+edge*.73+streak*.76+gleam*.7+line*.14,0.,.97);
        `+(flat?`float radius=length(skinUV-.5)*2.;diffuseColor.a=.12+.19*radius+.11*sin(optical)*sin(optical);outgoingLight+=rainbow*.28;
          float span=mix(mix(filmSpan.x,filmSpan.y,skinUV.x),mix(filmSpan.z,filmSpan.w,skinUV.x),skinUV.y);
          float meniscus=span+.021*sin(skinUV.x*9.+curl)-skinUV.y;
          diffuseColor.a*=max(1.-smoothstep(.0,.019,-meniscus),smoothstep(.93,1.,radius));
          outgoingLight+=vec3(.8,.94,1.)*(1.-smoothstep(0.,.011,abs(meniscus)))*.95;`:'')+'\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey=()=>flat?'flat-film':'round-film';return m;
  }
  return {mat,wood,textile,grass,canopy,stone,rough,sky,soap,noise};
};
