'use strict';
const Art=(()=>{
  const T=THREE,TAU=Math.PI*2,V=(x,y,z)=>new T.Vector3(x,y,z);
  let seed=192423;
  function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function noise(x,y,n){
    function hash(a,b){let v=Math.imul(a*751+b*173+n*907,1597334677);v^=v>>>15;return ((Math.imul(v,2246822519)>>>0)/4294967295);}
    const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);
    return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;
  }
  function texture(kind){
    const N=kind==='road'?512:192,c=document.createElement('canvas');c.width=c.height=N;
    const ctx=c.getContext('2d'),im=ctx.createImageData(N,N);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const w=rng(),a=noise(x/45,y/45,11),b=noise(x/7,y/7,23);
      let k=kind==='road'?94+46*a+26*b+65*w+(w>.975?42:0):kind==='wood'?155+35*noise(x/4,y/79,9)+33*w:184+34*a+30*w;
      const idx=(x+y*N)*4;im.data[idx]=k;im.data[idx+1]=k+(kind==='road'?1:0);im.data[idx+2]=k-(kind==='road'?3:0);im.data[idx+3]=255;
    }ctx.putImageData(im,0,0);
    const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
  }
  const grain=texture('grain'),rock=texture('road'),wood=texture('wood');
  function mat(color,rough=.65,metal=0,opts={}){return new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,roughnessMap:grain,...opts});}
  function obj(parent,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function box(parent,x,y,z,w,h,d,m){return obj(parent,new T.BoxGeometry(w,h,d),m,x,y,z);}
  function ball(parent,x,y,z,rx,ry,rz,m,seg=16){const o=obj(parent,new T.SphereGeometry(1,seg,Math.max(6,seg/2)),m,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function rod(parent,a,b,r,m,r2=r,seg=10){
    const A=V(...a),B=V(...b),dir=B.clone().sub(A);const o=obj(parent,new T.CylinderGeometry(r2,r,dir.length(),seg),m);
    o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());return o;
  }
  function path(parent,pts,r,m,closed=false,segments=0){
    const curve=new T.CatmullRomCurve3(pts.map(p=>V(...p)),closed);
    return obj(parent,new T.TubeGeometry(curve,segments||Math.max(6,pts.length*2),r,6,closed),m);
  }
  function panels(parent,tri,m){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(tri.flat(2),3));
    geo.computeVertexNormals();return obj(parent,geo,m);
  }
  function skin(parent,profile,m,seg=64){
    const pos=[],uv=[],idx=[];
    for(let k=0;k<profile.length;k++){
      const [y,width,back,front]=profile[k],mid=(back+front)/2,len=(front-back)/2;
      for(let i=0;i<=seg;i++){
        const a=i/seg*TAU,cs=Math.cos(a),sn=Math.sin(a);
        const square=(v,p)=>Math.sign(v)*Math.pow(Math.abs(v),p);
        pos.push(width*square(sn,.86)*(1+(y<.32?.09:.014)*cs),y,mid+len*square(cs,.89));uv.push(i/seg,k/(profile.length-1));
        if(i<seg&&k<profile.length-1){let h=k*(seg+1)+i;idx.push(h,h+1,h+seg+1,h+1,h+seg+2,h+seg+1);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const nr=g.attributes.normal;for(let j=0;j<profile.length;j++){const i=j*(seg+1),v=V(nr.getX(i)+nr.getX(i+seg),nr.getY(i)+nr.getY(i+seg),nr.getZ(i)+nr.getZ(i+seg)).normalize();nr.setXYZ(i,v.x,v.y,v.z);nr.setXYZ(i+seg,v.x,v.y,v.z);}
    return obj(parent,g,m);
  }
  const rubber=mat(0xc42c27,.31,.04),sole=mat(0x452d2c,.52),berry=mat(0x8e211e,.32),
    rim=mat(0xe14736,.28),cream=mat(0xf2cd94,.47),lining=mat(0x8c5846,.83),inside=mat(0x482d28,.88), brass=mat(0xc9a264,.33,.59);
  function boot(parent){
    const g=group(parent);
    const P=[[.075,.273,-.365,.70],[.106,.290,-.366,.711],[.145,.29,-.36,.706],[.188,.287,-.35,.688],[.229,.276,-.34,.643],[.266,.258,-.335,.559],[.296,.237,-.332,.45],[.337,.223,-.332,.316],[.395,.211,-.329,.201],[.475,.203,-.327,.145],[.55,.208,-.332,.131],[.66,.22,-.344,.143],[.82,.239,-.362,.163],[1.01,.256,-.376,.184],[1.117,.264,-.38,.19]];
    // The foot, ankle and open shaft are one continuous contoured rubber shell.
    const curve=new T.SplineCurve(P.map(p=>new T.Vector2(p[0],p[1])));
    const sm=[];for(let i=0;i<P.length-1;i++){sm.push(P[i]);const mid=curve.getPoint((i+.5)/(P.length-1));sm.push([(P[i][0]+P[i+1][0])/2,mid.y,(P[i][2]+P[i+1][2])/2,(P[i][3]+P[i+1][3])/2]);}sm.push(P[P.length-1]);skin(g,sm,rubber);
    skin(g,[[.016,.001,.12,.122],[.018,.274,-.365,.703],[.026,.291,-.38,.724],[.043,.301,-.382,.730],[.093,.303,-.379,.723],[.113,.293,-.37,.714]],sole);
    skin(g,[[.091,.304,-.381,.724],[.103,.305,-.38,.723],[.112,.297,-.377,.72]],berry);
    skin(g,[[.114,.295,-.37,.713],[.121,.296,-.37,.713],[.129,.294,-.369,.713]],rim);
    for(let i=0;i<18;i++){
      const z=-.327+i*.057,ext=.285*Math.sqrt(Math.max(.08,1-((z-.16)/.55)**2));
      for(let side of [-1,1]){const block=box(g,side*(ext-.038),.026,z,.077,.047,.031,sole);block.rotation.y=side*.28;}
    }
    const band=(y,w,b,f,h,m)=>skin(g,[[y,w-.002,b+.002,f-.002],[y+.004,w,b,f],[y+h-.004,w,b,f],[y+h,w-.002,b+.002,f-.002]],m);
    band(.936,.254,-.375,.184,.016,cream);band(.964,.256,-.378,.186,.043,cream);
    skin(g,[[1.093,.265,-.382,.192],[1.104,.274,-.389,.198],[1.126,.275,-.391,.201],[1.139,.265,-.382,.191],[1.14,.246,-.366,.177],[1.124,.24,-.361,.17]],rim);
    skin(g,[[1.125,.24,-.362,.171],[1.095,.238,-.359,.17],[.87,.205,-.327,.15],[.55,.16,-.287,.105]],lining);
    ball(g,0,.55,-.088,.162,.03,.204,inside);
    path(g,[[-.06,1.033,-.373],[-.061,1.16,-.402],[-.06,1.207,-.419],[-.058,1.225,-.385],[-.055,1.18,-.348],[-.052,1.105,-.329]],.022,berry);
    for(const side of [-1,1]){
      path(g,[[.12*side,.19,-.32],[.12*side,.40,-.285],[.127*side,.66,-.299],[.151*side,.91,-.307]],.008,berry);
      const badge=ball(g,side*.238,.80,-.092,.010,.084,.071,berry,24);
      const pts=[];for(let i=0;i<33;i++){let a=i/32*TAU;pts.push([side*.25,.80+.058*Math.sin(a),-.092+.045*Math.cos(a)]);}path(g,pts,.0045,brass);
      const gem=ball(g,side*.252,.795,-.092,.007,.032,.018,brass);gem.rotation.x=-.25;
    }
    return g;
  }
  const leafM=[0xb7752c,0xaa5528,0xd1a34d,0x985631,0x897c3e].map(c=>mat(c,.43,0,{side:T.DoubleSide})),vein=mat(0xad8550,.65);
  function leaf(parent,k=0){
    const g=group(parent),m=leafM[k%leafM.length],tris=[],pts=[];
    for(let i=0;i<=10;i++){
      const f=i/10,z=(f-.5)*.38,w=Math.pow(Math.sin(Math.PI*f),.79)*.094*(i%2?.89:1);
      pts.push([[.018*f-w,.009+.028*Math.sin(f*3.6)+w*.19,z],[.018*f,.009+.028*Math.sin(f*3.6),z],[.018*f+w,.01+.028*Math.sin(f*3.6)+w*.26,z]]);
      if(i)for(let j=0;j<2;j++)tris.push([pts[i-1][j],pts[i][j],pts[i][j+1]],[pts[i-1][j],pts[i][j+1],pts[i-1][j+1]]);
    }panels(g,tris,m);path(g,[[0,.017,-.226],...pts.filter((p,i)=>i%2===0).map(p=>[p[1][0],p[1][1]+.004,p[1][2]])],.0037,vein);
    for(let j=2;j<9;j+=2)for(const side of [0,2])rod(g,[...pts[j-1][1]],[pts[j][side][0]*.84,pts[j][side][1]+.001,pts[j][side][2]+.007],.0018,vein,.0008,4);
    return g;
  }
  function boat(parent){
    const g=group(parent),paper=[0xeee1c0,0xf7eaca,0xc7bea6,0xdbcca7,0xeee5d3].map(c=>mat(c,.73,0,{side:T.DoubleSide}));
    const L=[-.55,.24,0],R=[.55,.24,0],A=[-.28,.008,.102],B=[.28,.008,.102],C=[-.28,.008,-.102],D=[.28,.008,-.102],F=[0,.142,.194],K=[0,.142,-.194],peak=[.048,.40,0];
    panels(g,[[L,A,F],[F,A,B],[F,B,R]],paper[0]);panels(g,[[L,K,C],[K,D,C],[K,R,D]],paper[2]);
    panels(g,[[L,F,[0,.102,0]],[L,[0,.102,0],K]],paper[3]);panels(g,[[R,[0,.102,0],F],[R,K,[0,.102,0]]],paper[3]);
    panels(g,[[[-.28,.081,0],peak,F],[F,peak,[.3,.08,0]]],paper[1]);panels(g,[[[-.28,.081,0],K,peak],[peak,K,[.30,.08,0]]],paper[4]);
    return g;
  }
  // Bake stationary parts together while retaining actual geometry, normals and material boundaries.
  function batch(g){
    g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),buckets=new Map(),old=[...g.children];
    g.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid+'_'+o.castShadow;
      if(!buckets.has(key))buckets.set(key,{p:[],n:[],uv:[],idx:[],m:o.material,shadow:o.castShadow});
      const b=buckets.get(key),geo=o.geometry,p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
      const off=b.p.length/3,m=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(m),v=V(0,0,0);
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);b.p.push(v.x,v.y,v.z);
        if(n)v.fromBufferAttribute(n,i).applyNormalMatrix(nm);else v.set(0,1,0);b.n.push(v.x,v.y,v.z);
        b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}
      const ix=geo.index;if(ix)for(let i=0;i<ix.count;i++)b.idx.push(ix.getX(i)+off);else for(let i=0;i<p.count;i++)b.idx.push(off+i);
    });
    for(const o of old)g.remove(o);
    for(const b of buckets.values()){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));geo.setIndex(b.idx);const m=obj(g,geo,b.m);m.castShadow=b.shadow;}
    return g;
  }
  return {T,TAU,V,rng,noise,grain,rock,wood,mat,obj,group,box,ball,rod,path,panels,skin,boot,leaf,boat,batch};
})();
