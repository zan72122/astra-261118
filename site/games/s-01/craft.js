'use strict';
const Craft = (() => {
  const T=THREE, TAU=Math.PI*2, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  let seed=15831;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const noise=`
    float chash(vec3 p){
      p=fract(p*.3183099+vec3(.113,.419,.273));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
    }
    float cnoise(vec3 p){vec3 b=floor(p),q=fract(p);q=q*q*(3.-2.*q);
      return mix(mix(mix(chash(b),chash(b+vec3(1,0,0)),q.x),mix(chash(b+vec3(0,1,0)),chash(b+vec3(1,1,0)),q.x),q.y),
      mix(mix(chash(b+vec3(0,0,1)),chash(b+vec3(1,0,1)),q.x),mix(chash(b+vec3(0,1,1)),chash(b+vec3(1,1,1)),q.x),q.y),q.z);}
  `;
  function mat(color,roughness=.72,kind='plain',extra={}) {
    const m=new T.MeshStandardMaterial({color,roughness,...extra});
    m.customProgramCacheKey=()=>kind;
    m.onBeforeCompile=sh=>{
      sh.vertexShader='varying vec3 craftP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncraftP=position;');
      sh.fragmentShader='varying vec3 craftP;\n'+noise+sh.fragmentShader;
      let grain='float mott=cnoise(craftP*18.);diffuseColor.rgb*=.968+.06*mott;';
      if(kind==='wood'||kind==='darkwood')grain=`
        vec3 wp=craftP;
        float knot=cnoise(vec3(wp.x*.37,wp.y*.8,wp.z*1.3));
        float longGrain=cnoise(vec3(wp.x*.6,wp.y*8.,wp.z*17.+knot*2.4));
        float thread=cnoise(vec3(wp.x*1.9,wp.y*42.,wp.z*110.+knot*6.));
        float rings=sin((wp.z+wp.y*.58)*32.+knot*6.+wp.x*.25);
        float mott=.46*longGrain+.34*thread+.20*knot;
        diffuseColor.rgb*=.80+.34*mott+.047*rings+.045*smoothstep(.2,.65,rings);
        diffuseColor.r+=.015*longGrain;
      `;
      if(kind==='cloth')grain=`float mott=cnoise(craftP*72.);
        vec3 weave=sin(craftP*390.);
        float we=weave.x*(weave.y+weave.z);
        diffuseColor.rgb*=.90+.14*mott+.018*we;`;
      if(kind==='clay')grain=`float mott=cnoise(craftP*89.);
        float pit=smoothstep(.75,.98,mott);
        diffuseColor.rgb*=.963+.064*cnoise(craftP*24.)-.086*pit;`;
      if(kind==='glaze')grain=`float mott=cnoise(craftP*29.);
        float slip=cnoise(craftP*vec3(9.,1.2,9.));
        diffuseColor.rgb*=.75+.44*slip+.11*mott+.014*sin(craftP.y*103.);
        diffuseColor.rgb+=vec3(.052,.043,.027)*smoothstep(.78,.93,mott);`;
      if(kind==='skin')grain=`float mott=cnoise(craftP*75.);
        diffuseColor.rgb*=.97+.046*mott;
        diffuseColor.r+=.009*cnoise(craftP*16.);`;
      sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+grain)
        .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(mott-.5)*.10,.06,1.);');
    };
    return m;
  }
  function group(parent){const o=new T.Group();if(parent)parent.add(o);return o;}
  function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;if(parent)parent.add(o);return o;}
  const orb=new T.SphereGeometry(1,24,16),grainOrb=new T.SphereGeometry(1,12,8);
  function egg(p,m,x,y,z,rx,ry,rz){const o=mesh(p,Math.max(rx,ry,rz)<.12?grainOrb:orb,m,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function box(p,m,x,y,z,w,h,d){return mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);}
  function lathe(p,m,profile,n=72){return mesh(p,new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(Math.max(.0001,x),y)),n),m);}
  function indexed(pts,idx,uv){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setIndex(idx);if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
  function grid(cols,rows,fn){const pos=[],idx=[],uv=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const u=i/cols,v=j/rows;pos.push(...fn(u,v));uv.push(u,v);if(i&&j){const d=j*(cols+1)+i,a=d-cols-2;idx.push(a,a+cols+1,d,a,d,a+1);}}return indexed(pos,idx,uv);}
  function tube(p,m,points,r=.02,n=14){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>V(...v))),n,r,7,false),m);}
  function ring(p,m,r,y,radius=.012){const o=mesh(p,new T.TorusGeometry(r,radius,8,96),m,0,y,0);o.rotation.x=Math.PI/2;return o;}
  // Batch rigid parts in their own moving coordinate frame. Preserve material-space
  // grain on the larger individually turned or carved objects.
  function batch(p){
    p.updateWorldMatrix(true,true);const inv=p.matrixWorld.clone().invert(),sets=new Map();
    p.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){let a=sets.get(o.material);if(!a)sets.set(o.material,a=[]);a.push(o);}});
    for(const [m,items] of sets){if(items.length<2)continue;const pos=[],norm=[],idx=[];let off=0;
      for(const o of items){const g=o.geometry,mt=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(mt);
        const v=V();for(let i=0;i<g.attributes.position.count;i++){v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(mt);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(nm).normalize();norm.push(v.x,v.y,v.z);}
        if(g.index)for(const i of g.index.array)idx.push(off+i);else for(let i=0;i<g.attributes.position.count;i++)idx.push(off+i);
        off+=g.attributes.position.count;o.removeFromParent();
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setIndex(idx);mesh(p,g,m);
    }
  }
  const materials={
    board:mat(0xcaa073,.66,'wood'),boardEdge:mat(0xad8058,.64,'wood'),ebony:mat(0x2a2424,.56,'darkwood'),
    table:mat(0x493933,.56,'darkwood'),beam:mat(0x513e33,.68,'wood'),bamboo:mat(0xe1b982,.57,'wood'),
    vermilion:mat(0x963f30,.32,'glaze'),lacquer:mat(0x492e2a,.29,'glaze'),cream:mat(0xe5d8b8,.80,'cloth'),
    paper:mat(0xf3e7d0,.83,'cloth',{side:T.DoubleSide}),indigo:mat(0x283f43,.91,'cloth',{side:T.DoubleSide}),
    linen:mat(0xd2cebb,.88,'cloth',{side:T.DoubleSide}),hem:mat(0xa6a599,.84,'cloth'),
    porcelain:mat(0xc7d3c3,.24,'glaze'),teal:mat(0x3e6865,.21,'glaze'),gold:mat(0xb58a51,.42,'plain',{metalness:.38}),
    skin:mat(0xdeab8a,.67,'skin'),nail:mat(0xe6b69f,.47,'skin'),crease:mat(0xc5997d,.82,'skin'),
    pistil:mat(0xebad3d,.75,'clay'),yellow:mat(0xf3c34f,.78,'clay'),
    stem:mat(0x5a5540,.79),green:mat(0x36574b,.47,'glaze',{side:T.DoubleSide}),
    vein:mat(0x89906b,.68),red:mat(0xa62b3f,.47,'clay',{side:T.DoubleSide}),
    rose:mat(0xc5404b,.49,'clay',{side:T.DoubleSide}),inner:mat(0xb92f42,.46,'clay',{side:T.DoubleSide})
  };
  return {T,V,TAU,rand,mat,materials,group,mesh,box,egg,lathe,grid,ring,tube,indexed,batch};
})();
