/* Cabinetry, turned glass and drilled buttons. Geometry uses Y as its up axis. */
'use strict';
const Craft=(()=>{
  const T=THREE, pi=Math.PI, tau=2*pi, rng=ButtonWorkshop.random(79281);
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  function group(parent){const g=new T.Group();if(parent)parent.add(g);return g;}
  function mesh(parent,geo,mat,x=0,y=0,z=0){
    const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  function tex(w,h,pixels,color=true,repeat=[1,1]){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d'),im=ctx.createImageData(w,h);
    pixels(im.data,w,h);ctx.putImageData(im,0,0);
    const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=4;return t;
  }
  const noise=tex(96,96,d=>{for(let i=0;i<d.length;i+=4){let k=222+rng()*33;d[i]=d[i+1]=d[i+2]=k;d[i+3]=255;}},false);
  const mat=(color,roughness=.65,metalness=0,opts={})=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:noise,...opts});
  const phys=(color,roughness,opts={})=>new T.MeshPhysicalMaterial({color,roughness,roughnessMap:noise,...opts});
  // Curved growth rings, ray flecks and open pores are fixed in the timber.
  const grain=tex(1024,512,(d,w,h)=>{
    const fibers=Array.from({length:h},()=>rng()-.5);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const u=x/w*tau, vv=y/h*tau;
      const warp=.30*Math.sin(u+.65*Math.sin(vv*2))+.13*Math.sin(2*u-vv)+.042*Math.sin(4*u+vv*3);
      const n=vv+warp,ring=.5+.5*Math.sin(n*12+.74*Math.sin(n*5)),line=Math.pow(ring,13);
      const pore=Math.max(0,Math.sin(n*158+Math.sin(u*3+vv)*2.8))**11;
      const depth=12*line+7*pore+6*Math.sin(n*3)+4*Math.sin(n*32)+4*fibers[y]+(rng()-.48)*8;
      const i=(y*w+x)*4;d[i]=222-depth;d[i+1]=183-depth*1.04;d[i+2]=136-depth*.94;d[i+3]=255;
    }
  });
  const endgrain=tex(384,384,(d,w,h)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const a=(x-w*.45)/w,b=(y-h*.49)/h,r=Math.hypot(a,b),th=Math.atan2(a,b);
    const f=10*Math.sin(r*240+2*Math.sin(th*3)*r)+7*Math.sin(r*78)+rng()*9,i=4*(y*w+x);
    d[i]=217-f;d[i+1]=177-f;d[i+2]=122-f;d[i+3]=255;
  }});
  const weave=tex(128,128,(d,w,h)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const dx=(x%8)-3.5,dy=(y%8)-3.5,over=(Math.floor(x/8)+Math.floor(y/8))%2;
    const val=204+26*Math.cos((over?dx:dy)*.48)+7*Math.cos((over?dy:dx)*.65)+rng()*12;
    const i=(y*w+x)*4;d[i]=val;d[i+1]=val*.985;d[i+2]=val*.95;d[i+3]=255;
  }},true,[5,5]);
  const cloth=(color,rep=5)=>{const m=mat(color,.97,0,{map:weave,bumpMap:weave,bumpScale:.012});
    if(rep!==5){const t=weave.clone();t.repeat.set(rep,rep);m.map=m.bumpMap=t;}return m;};
  const wood=(color=0xeacba3)=>mat(color,.45,0,{map:grain,bumpMap:grain,bumpScale:.014});
  const brass=mat(0xb79a61,.32,.73), gold=mat(0xd6bb81,.28,.67),darkBrass=mat(0x8c7954,.46,.65);
  const ivory=mat(0xf2e4c6,.70),umber=wood(0x956342),oak=wood(0xe6bc89),lightOak=wood(0xf3d3a4);
  function box(p,x,y,z,w,h,d,m){return mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);}
  function sphere(p,x,y,z,rx,ry,rz,m,seg=24){
    const o=mesh(p,new T.SphereGeometry(1,seg,Math.max(8,seg>>1)),m,x,y,z);o.scale.set(rx,ry,rz);return o;
  }
  function lathe(p,profile,m,seg=80){
    return mesh(p,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),seg),m);
  }
  function cyl(p,x,y,z,rt,rb,h,m,seg=48){return mesh(p,new T.CylinderGeometry(rt,rb,h,seg),m,x,y,z);}
  function ring(p,x,y,z,r,t,m,seg=80){
    const o=mesh(p,new T.TorusGeometry(r,t,8,seg),m,x,y,z);o.rotation.x=pi/2;return o;
  }
  function pipe(p,points,r,m,steps=24){
    const curve=new T.CatmullRomCurve3(points.map(a=>v(...a)));
    return mesh(p,new T.TubeGeometry(curve,steps,r,7,false),m);
  }
  function rod(p,a,b,r,m,r2=r){
    const va=v(...a),vb=v(...b),delta=vb.clone().sub(va);
    const o=mesh(p,new T.CylinderGeometry(r2,r,delta.length(),9),m);o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o;
  }
  function shapeMesh(p,shape,thick,m,bev=.009,seg=8){
    const geo=new T.ExtrudeGeometry(shape,{depth:thick,bevelEnabled:bev>0,bevelThickness:bev,bevelSize:bev,bevelSegments:2,curveSegments:seg});
    geo.rotateX(-pi/2);return mesh(p,geo,m);
  }
  const pall=[
    [0xd6a466,0xc79967,0xe3b784,0xb38558], [0xf6ece0,0xf6e2cd,0xd8e4da,0xe4d7bc],
    [0xbda16d,0xb4ada0,0x9aa49b,0xc7a06b],[0x7dabad,0xd99482,0xbbc6a2,0x94aebd],
    [0x809da6,0xe2b8ad,0xd1af82,0x8ea797]
  ];
  const buttonMats=pall.map((row,i)=>row.map(col=>{
    if(i===0)return wood(col);
    if(i===1)return phys(col,.21,{iridescence:.37,iridescenceIOR:1.37,iridescenceThicknessMinimum:210,iridescenceThicknessMaximum:360,clearcoat:.42,envMapIntensity:.83});
    if(i===2)return mat(col,.29,.79);
    if(i===3)return phys(col,.31,{clearcoat:.38,clearcoatRoughness:.22});
    return cloth(col,.9);
  }));
  const cached=new Map();
  function button(matId,variant){
    const key=matId+'-'+variant;
    if(cached.has(key))return cached.get(key).clone(true);
    const p=group(),m=buttonMats[matId][variant%4],flower=matId===1&&variant%3!==0||matId===3&&variant%3===1;
    const square=matId===3&&variant%3===2,shape=new T.Shape(),N=96;
    const rad=a=>flower?.88+.12*Math.cos(a*(variant%2?5:6)):square?.94/Math.pow(Math.abs(Math.cos(a))**4+Math.abs(Math.sin(a))**4,.25):1;
    for(let i=0;i<=N;i++){const a=tau*i/N,r=rad(a);const x=r*Math.cos(a),y=r*Math.sin(a);if(!i)shape.moveTo(x,y);else shape.lineTo(x,y);}
    const two=(matId===1||variant%5===0),holes=two?[[-.225,0],[.225,0]]:[[-.215,-.215],[.215,-.215],[-.215,.215],[.215,.215]];
    for(const [x,z] of holes){const h=new T.Path();h.absarc(x,z,matId===4?.114:.117,0,tau,true);shape.holes.push(h);}
    const thick=[.215,.125,.14,.19,.28][matId];
    const o=shapeMesh(p,shape,thick,m,.028,7);o.position.y=-thick*.5;
    const top=thick*.5+.017;
    if(!flower&&!square){
      const rim=lathe(p,[[.758,top-.014],[.79,top+.02],[.83,top+.066],[.90,top+.085],[.96,top+.064],[.99,top+.012]],m,72);
      rim.material.side=T.DoubleSide;
      if(matId===2){ring(p,0,top+.024,0,.65,.019,darkBrass);ring(p,0,top+.055,0,.943,.021,gold);}
      if(matId===0)ring(p,0,top+.008,0,.694,.013,umber);
    }else{
      const pts=[];for(let i=0;i<=80;i++){const a=i/80*tau;pts.push([Math.cos(a)*rad(a)*.91,top+.005,Math.sin(a)*rad(a)*.91]);}
      pipe(p,pts,flower?.015:.026,m,80);
    }
    if(matId===4||matId===2){
      // Tiny embroidered dashes or stamped brass beads around the rim in one draw.
      const n=matId===2?34:27, inst=new T.InstancedMesh(new T.SphereGeometry(1,6,4),matId===2?gold:ivory,n),dummy=new T.Object3D();
      for(let i=0;i<n;i++){const a=tau*i/n;dummy.position.set(.875*Math.cos(a),top+.075,.875*Math.sin(a));dummy.rotation.y=-a;dummy.scale.set(.018,.014,matId===2?.021:.064);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);}p.add(inst);
    }
    batch(p);cached.set(key,p);return p.clone(true);
  }
  const shadowTex=tex(96,96,(d,w,h)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const r=Math.hypot((x+.5-w/2)/(w/2),(y+.5-h/2)/(h/2)),i=4*(y*w+x);d[i]=d[i+1]=d[i+2]=255;d[i+3]=Math.round((1-Math.min(1,r*r))**3*255);
  }});
  function shadow(p,x,y,z,w,d,opacity=.22){
    const m=mat(0x624833,1,0,{map:shadowTex,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    const o=mesh(p,new T.PlaneGeometry(w,d),m,x,y,z);o.rotation.x=-pi/2;o.castShadow=false;return o;
  }
  function petalShape(){
    const a=new T.Shape();a.moveTo(0,0);a.bezierCurveTo(-.58,.28,-.55,.80,0,1);a.bezierCurveTo(.54,.78,.57,.25,0,0);return a;
  }
  function rosette(p,x,y,z,size,material,n=6){
    const g=group(p);g.position.set(x,y,z);
    for(let i=0;i<n;i++){
      const o=shapeMesh(g,petalShape(),.012,material,.006);o.scale.set(size*.56,1,size);o.rotation.y=tau*i/n;
    }
    sphere(g,0,.014,0,size*.18,.012,size*.18,material,12);return g;
  }
  // Combine fixed pieces of the same finish. Moving pivots and hit targets
  // retain their own transforms. No WebGL calls are required for batching.
  function batch(parent,keep=new Set()){
    parent.updateWorldMatrix(true,true);
    const inverse=parent.matrixWorld.clone().invert(),buckets=new Map();
    function visit(o){
      if(keep.has(o))return;
      if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)&&o.children.length===0){
        const id=[o.material.uuid,o.castShadow,o.receiveShadow,!!o.geometry.attributes.color].join('/');
        if(!buckets.has(id))buckets.set(id,[]);buckets.get(id).push(o);
      }else o.children.forEach(visit);
    }
    parent.children.forEach(visit);
    for(const items of buckets.values()){
      if(items.length<2)continue;
      const positions=[],uvs=[],normals=[],colors=[],indices=[],vec=new T.Vector3();
      for(const o of items){
        const geo=o.geometry,attrs=geo.attributes,pos=attrs.position,base=positions.length/3;
        const matrix=inverse.clone().multiply(o.matrixWorld),normalMatrix=new T.Matrix3().getNormalMatrix(matrix);
        for(let i=0;i<pos.count;i++){
          vec.fromBufferAttribute(pos,i).applyMatrix4(matrix);positions.push(vec.x,vec.y,vec.z);
          vec.fromBufferAttribute(attrs.normal,i).applyNormalMatrix(normalMatrix);normals.push(vec.x,vec.y,vec.z);
          uvs.push(attrs.uv?attrs.uv.getX(i):0,attrs.uv?attrs.uv.getY(i):0);
          if(attrs.color)colors.push(attrs.color.getX(i),attrs.color.getY(i),attrs.color.getZ(i));
        }
        const count=geo.index?geo.index.count:pos.count;
        for(let i=0;i<count;i++)indices.push(base+(geo.index?geo.index.getX(i):i));
        o.removeFromParent();
      }
      const geometry=new T.BufferGeometry();geometry.setIndex(indices);
      geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
      geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
      if(colors.length)geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      const first=items[0],merged=mesh(parent,geometry,first.material);merged.castShadow=first.castShadow;merged.receiveShadow=first.receiveShadow;
    }
  }
  return {T,pi,tau,rng,v,batch,group,mesh,tex,noise,mat,phys,grain,endgrain,weave,cloth,wood,brass,gold,darkBrass,ivory,umber,oak,lightOak,box,sphere,lathe,cyl,ring,pipe,rod,shapeMesh,button,shadow,rosette,petalShape};
})();
