/* Hand-built solids and locally generated material maps. No image assets. */
const Art = (() => {
  const T=THREE, PI=Math.PI, TAU=PI*2;
  let seed=3801;
  function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const texCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  function texture(c,color=true){const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=4;return t;}
  function surface(kind){
    const c=texCanvas(512,256),ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height),rough=ctx.createImageData(c.width,c.height);
    const threads=Array.from({length:256},()=>rnd());
    for(let y=0;y<256;y++)for(let x=0;x<512;x++){
      const u=x/512*TAU,v=y/256*TAU,n=rnd(),w=v*19+1.3*Math.sin(u)+.55*Math.sin(2*u+v*3)+.6*Math.sin(v*4);
      let a=kind==="cloth"?224+8*Math.cos(x*PI/2)+7*Math.sin(y*PI*.5)+n*10:
        kind==="wood"?231+6*Math.sin(w)+5*Math.cos(w*2)+6*Math.sin(w*6+.5*Math.cos(u*4))-6*threads[y]+n*8:241+n*13;
      const i=4*(y*512+x);im.data[i]=a;im.data[i+1]=a-(kind==="wood"?4:0);im.data[i+2]=a-(kind==="wood"?10:0);im.data[i+3]=255;
      for(let j=0;j<3;j++)rough.data[i+j]=205+a*.13+n*15;rough.data[i+3]=255;
    }
    ctx.putImageData(im,0,0);const r=texCanvas(512,256);r.getContext('2d').putImageData(rough,0,0);return [texture(c),texture(r,false)];
  }
  const maps={wood:surface("wood"),cloth:surface("cloth"),plain:surface("plain")};
  function mat(color,kind="wood",r=.43,m=0){
    const mapsFor=maps[kind]||maps.plain;
    return new T.MeshStandardMaterial({color,map:mapsFor[0],roughnessMap:mapsFor[1],roughness:r,metalness:m});
  }
  const M={
    birch:mat("#efd098"),honey:mat("#ce985b"),dark:mat("#845839"),edge:mat("#e2b878"),
    red:mat("#c44b32"), coral:mat("#e17d58"),yellow:mat("#efba3f"),teal:mat("#478d88"),blue:mat("#386f8d"),
    aqua:mat("#76b4a8"),ivory:mat("#fff1d4"),ink:mat("#36464a","plain",.66),
    brass:mat("#d5a347","plain",.25,.68),steel:mat("#9faaa8","plain",.19,.76),
    white:mat("#fff5df","cloth",.8), wall:mat("#f1e8d6","plain",.88), trim:mat("#c5cabc"),
    glass:mat("#c6eff1","plain",.085,.15), blueglass:mat("#398b94","plain",.11,.22),
    rubber:mat("#393d3b","plain",.75),rug:mat("#6f9993","cloth",.96),
    moss:mat("#729985"), leaf:mat("#879c65"),sky:mat("#afd8de","plain",.96),
    flag:mat("#d75c40","cloth",.9),goldflag:mat("#efbf54","cloth",.88)
  };
  M.glass.transparent=true;M.glass.opacity=.13;M.glass.depthWrite=false;
  const geo=new Map();
  function cached(k,f){if(!geo.has(k))geo.set(k,f());return geo.get(k);}
  function group(parent,x=0,y=0,z=0){const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;}
  function mesh(p,g,m,x=0,y=0,z=0){
    const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;
  }
  function rounded(w,h,d,r) {
    r=Math.min(r,w/2.05,h/2.05,d/2.05);
    return cached(['box',w,h,d,r].join('/'),()=>{
      const g=new T.BoxGeometry(w,h,d,7,7,7),pos=g.attributes.position,norm=g.attributes.normal;
      for(let i=0;i<pos.count;i++){
        const n=[pos.getX(i),pos.getY(i),pos.getZ(i)],half=[w/2,h/2,d/2],p=[],delta=[];
        for(let j=0;j<3;j++){
          const sg=Math.sign(n[j]),k=Math.round(Math.abs(n[j])/half[j]*7);
          p[j]=sg*(half[j]-r+(k-1)*r/6);delta[j]=p[j]-T.MathUtils.clamp(p[j],-half[j]+r,half[j]-r);
        }
        const len=Math.hypot(...delta)||1;
        pos.setXYZ(i,...p.map((v,j)=>v-delta[j]+r*delta[j]/len));
        norm.setXYZ(i,...delta.map(v=>v/len));
      }
      return g;
    });
  }
  function box(p,w,h,d,m,x,y,z,r=.035){return mesh(p,rounded(w,h,d,r),m,x,y,z);}
  function cyl(p,rt,rb,h,m,x,y,z,n=40){
    return mesh(p,cached(['c',rt,rb,h,n].join('/'),()=>new T.CylinderGeometry(rt,rb,h,n)),m,x,y,z);
  }
  function sphere(p,rx,ry,rz,m,x,y,z){const o=mesh(p,cached('ball',()=>new T.SphereGeometry(1,32,20)),m,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function ring(p,r,t,m,x,y,z){return mesh(p,cached(['r',r,t].join('/'),()=>new T.TorusGeometry(r,t,10,52)),m,x,y,z);}
  function rod(p,a,b,r,m,n=16){const v=new T.Vector3(...a),w=new T.Vector3(...b),d=w.clone().sub(v);const o=cyl(p,r,r,d.length(),m,...v.addScaledVector(d,.5).toArray(),n);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
  function tube(p,pts,r,m,seg=32){const curve=new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v)));return mesh(p,new T.TubeGeometry(curve,seg,r,8,false),m);}
  function extrude(p,shape,depth,m,x,y,z,b=.035){
    const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:b>0,bevelSegments:3,steps:1,bevelSize:b,bevelThickness:b,curveSegments:18});g.translate(0,0,-depth/2);return mesh(p,g,m,x,y,z);
  }
  function outline(w,d,r){
    const s=new T.Shape(),x=-w/2,y=-d/2;
    s.moveTo(x+r,y);s.lineTo(-x-r,y);s.quadraticCurveTo(-x,y,-x,y+r);s.lineTo(-x,-y-r);s.quadraticCurveTo(-x,-y,-x-r,-y);s.lineTo(x+r,-y);s.quadraticCurveTo(x,-y,x,-y-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  }
  function slab(p,w,h,d,r,m,x,y,z){
    const o=extrude(p,outline(w,d,r),h,m,x,y,z,.012);o.rotation.x=-PI/2;return o;
  }
  function inlay(p,w,d,r,m,y,thick=.022){
    const shape=outline(w,d,r);shape.holes.push(new T.Path(outline(w-thick*2,d-thick*2,Math.max(.02,r-thick)).getPoints(16).reverse()));
    const o=extrude(p,shape,.003,m,0,y,0,0);o.rotation.x=-PI/2;return o;
  }
  function route(p,fn,width,thick,m,rails=true) {
    const left=[],right=[],lb=[],rb=[],vertices=[],uv=[],idx=[],steps=44;
    for(let i=0;i<=steps;i++){
      const t=i/steps,c=fn(t),n=fn(Math.min(1,t+.0001)),a=fn(Math.max(0,t-.0001));
      const len=Math.hypot(n[0]-a[0],n[2]-a[2]),dx=-(n[2]-a[2])/len*width/2,dz=(n[0]-a[0])/len*width/2;
      left.push([c[0]+dx,c[1],c[2]+dz]);right.push([c[0]-dx,c[1],c[2]-dz]);
      lb.push([c[0]+dx,c[1]-thick,c[2]+dz]);rb.push([c[0]-dx,c[1]-thick,c[2]-dz]);
    }
    function strip(a,b){const k=vertices.length/3;for(let i=0;i<=steps;i++){vertices.push(...a[i],...b[i]);uv.push(i/steps,0,i/steps,1);if(i){const j=k+i*2;idx.push(j-2,j,j-1,j,j+1,j-1);}}}
    strip(left,right);strip(right,rb);strip(rb,lb);strip(lb,left);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(p,g,m);
    if(rails){for(const edge of [left,right])tube(p,edge.map(q=>[q[0],q[1]+.035,q[2]]),.059,M.edge,44);}
    // Solid end-grain caps
    for(const t of [0,1]){const c=fn(t),q=fn(t===0?.001:.999);const end=box(p,.045,thick,width,m,c[0],c[1]-thick/2,c[2],.012);end.rotation.y=-Math.atan2((q[2]-c[2]),(q[0]-c[0]));}
  }
  function env(renderer,scene) {
    const c=texCanvas(512,256),g=c.getContext('2d'),grad=g.createLinearGradient(0,0,0,256);
    grad.addColorStop(0,'#ccdfed');grad.addColorStop(.42,'#f1e9db');grad.addColorStop(.58,'#d9c9ae');grad.addColorStop(1,'#b49875');g.fillStyle=grad;g.fillRect(0,0,512,256);
    g.fillStyle='#fffcef';for(let i=0;i<3;i++)for(let j=0;j<2;j++)g.fillRect(40+i*24,47+j*30,21,27);
    g.fillStyle='#697d76';g.fillRect(270,115,90,44);
    const e=texture(c);e.mapping=T.EquirectangularReflectionMapping;const pm=new T.PMREMGenerator(renderer);const target=pm.fromEquirectangular(e);
    scene.environment=target.texture;scene.environmentIntensity=.48;pm.dispose();e.dispose();
  }
  function fabric(p,x,y,z,w,h,material,fold=6,segments=28) {
    const geom=new T.PlaneGeometry(w,h,segments,8),a=geom.attributes.position;
    for(let i=0;i<a.count;i++){
      const u=a.getX(i)/w+.5,v=.5-a.getY(i)/h;
      a.setZ(i,.065*Math.cos(TAU*u*fold)*(1+v));a.setY(i,a.getY(i)-.065*Math.sin(PI*u*fold)*v*v);
    }
    geom.computeVertexNormals();const o=mesh(p,geom,material,x,y,z);material.side=T.DoubleSide;return o;
  }
  function flag(p,x,y,z,size,material) {
    const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(size*.98,-size*.18);sh.quadraticCurveTo(size*.72,-size*.22,0,-size*.50);sh.closePath();
    return extrude(p,sh,.014,material,x,y,z,.008);
  }
  function arch(p,x,y,z,w,h,d,m) {
    const sh=new T.Shape(),r=w*.28;
    sh.moveTo(-w/2,0);sh.lineTo(-r,0);sh.lineTo(-r,.12);sh.absarc(0,.12,r,PI,0,true);sh.lineTo(r,0);sh.lineTo(w/2,0);sh.lineTo(w/2,h);sh.lineTo(-w/2,h);sh.closePath();return extrude(p,sh,d,m,x,y,z,.035);
  }
  function room(scene){
    const p=group(scene);box(p,90,.11,58,M.honey,0,-.20,0);
    const floors=['#d8bb94','#dfc4a0','#e1c6a3','#d4b791','#dfc09b'].map(c=>mat(c));
    // Staggered real boards keep joints, bevels and end grain visible.
    for(let row=-10;row<16;row++){for(let j=-3;j<=3;j++)box(p,8.98,.12,1.105,floors[Math.floor(rnd()*5)],j*9+(row%3)*2.9,-.09,row*1.12,.018);}
    const wz=-5.8,wx=-.30,wy=3.82,ww=5.65,wh=3.88;
    box(p,42,2,.22,M.wall,0,.90,wz);box(p,42,8,.22,M.wall,0,9.76,wz);
    box(p,20,wh,.22,M.wall,wx-ww/2-10,wy,wz);box(p,20,wh,.22,M.wall,wx+ww/2+10,wy,wz);
    box(p,42,.9,.13,M.trim,0,.46,wz+.18);box(p,42,.115,.20,M.ivory,0,.92,wz+.21);box(p,42,.21,.24,M.ivory,0,.105,wz+.21);
    for(let i=-18;i<19;i++)box(p,.027,.7,.025,M.wall,i*.82,.49,wz+.258,.004);
    const outside=group(p,0,0,wz-.95);
    const sky=mat('#b8e1e4','plain',1);sky.emissive.setHex(0xa5cdd0);sky.emissiveIntensity=.34;
    box(outside,10,7,.1,sky,wx,4,-.4);
    const cloud=mat('#fff7df','plain',.98);cloud.emissive.setHex(0xffecd2);cloud.emissiveIntensity=.14;
    for(const [x,y,s] of [[-1.95,4.95,.72],[1.38,4.34,.55],[.3,5.15,.31]])for(let i=-1;i<=1;i++)sphere(outside,s*(.7-Math.abs(i)*.10),s*(.34-Math.abs(i)*.12),.12,cloud,x+i*s*.50,y-.09*Math.abs(i),-.22);
    sphere(outside,2.5,.96,.3,M.moss,-2.05,2.2,-.1);sphere(outside,2.8,.83,.32,M.aqua,1.50,2.12,0);
    for(let i=0;i<11;i++){const x=-3+rnd()*6;rod(outside,[x,2.2,.15],[x,2.55,.15],.047,M.dark);sphere(outside,.18,.28,.15,i%2?M.leaf:M.moss,x,2.6,.15);}
    const frame=group(p,wx,wy,wz+.15),sashes=[];
    for(const i of [-1,1]){
      box(frame,.17,wh+.26,.31,M.birch,i*(ww/2+.03),0,0);box(frame,ww+.4,.17,.31,M.birch,0,i*wh/2,0);
      const leaf=group(frame,i*ww/2,0,.08);sashes.push(leaf);const cx=-i*ww/4;
      for(const j of [-1,1]){box(leaf,.092,wh-.12,.12,M.ivory,cx+j*(ww/4-.055),0,0);box(leaf,ww/2-.09,.10,.12,M.ivory,cx,j*(wh/2-.10),0);}
      box(leaf,ww/2-.12,.08,.085,M.ivory,cx,.09,0);box(leaf,.065,wh-.13,.085,M.ivory,cx,0,0);
      box(leaf,ww/2-.15,wh-.17,.018,M.glass,cx,0,-.05);
    }
    box(frame,ww+.67,.15,.65,M.birch,0,-wh/2-.08,.12,.045);
    const drapes=[];rod(frame,[-3.65,2.18,.27],[3.65,2.18,.27],.047,M.brass);
    for(const i of [-1,1]){
      sphere(frame,.10,.10,.10,M.honey,i*3.72,2.18,.27);
      const curtain=group(frame,i*3.04,2.14,.34);drapes.push(curtain);
      fabric(curtain,0,-1.85,0,1.15,3.7,M.white,4);
      for(let j=-2;j<=2;j++){const a=ring(curtain,.076,.016,M.brass,j*.225,0,0);a.rotation.y=PI/2;}
      for(const off of [.18,.31])fabric(curtain,0,-3.7+off,.024,1.15,.045,M.aqua,4);
    }
    // Framed cut-paper landscape relief on the plaster wall.
    function picture(x,y,w,h){
      const f=group(p,x,y,wz+.235);f.rotation.z=-.035;
      box(f,w,h,.10,M.honey,0,0,0);box(f,w-.13,h-.13,.042,M.ivory,0,0,.076);
      const field=group(f,0,0,.13);box(field,w*.73,h*.74,.02,mat('#bfd4ca'),0,0,0);
      const sun=cyl(field,.26,.26,.021,M.yellow,-.27,.39,.045);sun.rotation.x=PI/2;
      const sh=new T.Shape();sh.moveTo(-w*.365,-h*.37);sh.lineTo(-w*.365,-.14);sh.quadraticCurveTo(-.33,.46,.12,-.02);sh.lineTo(w*.365,.20);sh.lineTo(w*.365,-h*.37);sh.closePath();extrude(field,sh,.027,M.teal,0,0,.061,0);
      box(field,.32,.31,.06,M.ivory,.29,-.30,.101);const roof=new T.Shape();roof.moveTo(-.23,0);roof.lineTo(.23,0);roof.lineTo(0,.23);roof.closePath();extrude(field,roof,.055,M.red,.29,-.14,.104,.008);
    }
    picture(-5.32,3.45,1.64,1.98);
    // A low shelf with a handful of clothbound books and a wooden stacking toy.
    const shelf=group(p,5.48,1.37,-5.26);
    box(shelf,3.5,.14,.85,M.birch,0,0,0);
    for(const i of [-1,1])box(shelf,.12,.36,.54,M.honey,i*1.25,-.19,-.05);
    [M.red,M.birch,M.teal,M.yellow].forEach((m,i)=>{const b=group(shelf,-1.25+i*.22,.08,0);b.rotation.z=i===3?-.15:0;const h=[1,1.2,.87,1.08][i];box(b,.20,h,.49,m,0,h/2,0);box(b,.13,.055,.012,M.ivory,0,.20,.25);});
    cyl(shelf,.40,.40,.10,M.honey,.76,.12,0);
    [M.blue,M.aqua,M.yellow,M.coral].forEach((m,i)=>cyl(shelf,.32-i*.055,.36-i*.055,.14,m,.76,.23+i*.13,0));
    sphere(shelf,.107,.12,.107,M.red,.76,.75,0);
    return {p,sashes,drapes};
  }
  return {T,PI,TAU,M,group,mesh,box,cyl,sphere,ring,rod,tube,mat,route,slab,inlay,extrude,arch,flag,env,room,rnd,texture,texCanvas};
})();
