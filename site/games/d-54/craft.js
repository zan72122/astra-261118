'use strict';
const Craft=(()=>{
  const T=THREE, tau=Math.PI*2;
  let seed=50022;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const G=(par,x=0,y=0,z=0)=>{const o=new T.Group();if(par)par.add(o);o.position.set(x,y,z);return o;};
  function canvas(w,h,draw,repeat=false){
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;
    if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;return t;
  }
  function noise(ctx,w,h,amplitude){
    const im=ctx.getImageData(0,0,w,h);
    for(let i=0;i<im.data.length;i+=4){let n=(rand()-.5)*amplitude;for(let j=0;j<3;j++)im.data[i+j]+=n;}
    ctx.putImageData(im,0,0);
  }
  const rough=canvas(64,64,(c,w,h)=>{c.fillStyle='#e9e9e9';c.fillRect(0,0,w,h);noise(c,w,h,28);},true);
  rough.colorSpace=T.NoColorSpace;rough.repeat.set(3,3);
  const mat=(c,r=.72,m=0,options={})=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,roughnessMap:rough,...options});
  const timber=canvas(512,256,(c,w,h)=>{
    c.fillStyle='#ddc2a3';c.fillRect(0,0,w,h);
    for(let i=0;i<2300;i++){
      let y=rand()*h,phase=rand()*6.28,amp=rand()*2.3;
      c.strokeStyle=rand()<.55?'rgba(64,35,18,'+(rand()*.16)+')':'rgba(255,238,211,'+rand()*.34+')';
      c.lineWidth=.25+rand()*1.6;c.beginPath();
      for(let x=0;x<=w;x+=8){const k=y+amp*Math.sin(x*.012+phase)+.8*Math.sin(x*.031+y*.09)+1.7*Math.sin(x*.017+y*.027);if(!x)c.moveTo(x,k);else c.lineTo(x,k);}
      c.stroke();
    }noise(c,w,h,7);
  },true);
  const textile=canvas(128,128,(c,w,h)=>{c.fillStyle='#dad7c6';c.fillRect(0,0,w,h);
    for(let i=0;i<w;i+=2){c.fillStyle='rgba(58,52,33,.1)';c.fillRect(i,0,.7,h);c.fillStyle='rgba(255,255,241,.24)';c.fillRect(0,i,w,1);}
    noise(c,w,h,17);
  },true);
  const wood=(c,r=.58)=>mat(c,r,0,{map:timber,bumpMap:timber,bumpScale:.0007});
  const M={oak:wood(0x9b7656),dark:wood(0x644a37),honey:wood(0xc09b75),edge:wood(0xaf8963),
    table:wood(0x97704e,.49),walnut:wood(0x72513d),back:wood(0x81634e),ivory:mat(0xe9e0cd,.86),
    trim:mat(0xd4cbb5),pale:mat(0xf4ead3),brass:mat(0xb69a61,.32,.62),aged:mat(0x897448,.42,.61),
    glint:mat(0xe9ce8f,.31,.41,{emissive:0x6b4310,emissiveIntensity:.26}),iron:mat(0x4c5048,.36,.55),
    pane:mat(0xd6e5de,.13,.15,{transparent:true,opacity:.085,depthWrite:false}),paper:mat(0xe9dabb,.87),
    pageEdge:mat(0xcebd99,.82),forest:mat(0x455c4c,.91,0,{map:textile}),
    green:mat(0x61705b,.89,0,{map:textile}),stitch:mat(0xc1a66e,.82),stone:mat(0xb8b5a0,.85),
    tile:mat(0xc6c1a9,.72),water:mat(0x709c91,.16,.30),clay:mat(0xb38666,.83),
    ceramic:mat(0xb7bea0,.34,.12),darkSoil:mat(0x4d4739),stem:mat(0x787d54)};
  M.leaf=[0x526649,0x718261,0x87956e,0x536f56,0x94a17c].map(c=>mat(c,.64));
  function mesh(par,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;par.add(o);return o;}
  function box(par,x,y,z,w,h,d,m){
    const geo=new T.BoxGeometry(w,h,d);
    if(m.map===timber){const uv=geo.attributes.uv;
      for(let i=0;i<24;i++){
        const side=i>>2, a=side<2?d:w,b=side===2||side===3?d:h;
        let u=uv.getX(i),v=uv.getY(i);if(b>a)uv.setXY(i,v*b/.83,u*a/.26);else uv.setXY(i,u*a/.83,v*b/.26);
      }
    }return mesh(par,geo,m,x,y,z);
  }
  function cyl(par,x,y,z,top,bot,h,m,n=20){return mesh(par,new T.CylinderGeometry(top,bot,h,n),m,x,y,z);}
  function orb(par,x,y,z,rx,ry,rz,m){const o=mesh(par,new T.SphereGeometry(1,12,9),m,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function lathe(par,x,y,z,profile,m,n=24){return mesh(par,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),n),m,x,y,z);}
  function rod(par,a,b,r,m,r2=r){
    const av=new T.Vector3(...a),bv=new T.Vector3(...b),dir=bv.clone().sub(av),mid=av.clone().add(bv).multiplyScalar(.5);
    const o=cyl(par,mid.x,mid.y,mid.z,r2,r,dir.length(),m,8);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;
  }
  function torus(par,x,y,z,r,t,m){return mesh(par,new T.TorusGeometry(r,t,6,40),m,x,y,z);}
  function leaf(par,base,end,width,m,fold=.15){
    const a=new T.Vector3(...base),b=new T.Vector3(...end),d=b.clone().sub(a);
    const side=new T.Vector3(d.y,-d.x,.12*d.length()).normalize().multiplyScalar(width);
    const mid=a.clone().lerp(b,.46),ridge=mid.clone();ridge.z+=width*fold;
    const arr=[a,mid.clone().add(side),ridge, b, ridge,mid.clone().add(side), a,ridge,mid.clone().sub(side), b,mid.clone().sub(side),ridge];
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(arr.flatMap(p=>p.toArray()),3));geo.computeVertexNormals();m.side=T.DoubleSide;return mesh(par,geo,m);
  }
  // Flatten rigid assemblies once. Movable hinges, covers and cloth stay separate.
  function batch(group){
    group.updateWorldMatrix(true,true);
    const inv=group.matrixWorld.clone().invert(),sets=new Map(),old=[];
    group.traverse(o=>{if(!o.isMesh)return;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      g.applyMatrix4(inv.clone().multiply(o.matrixWorld));const key=o.material;
      if(!sets.has(key))sets.set(key,{p:[],n:[],u:[]});const s=sets.get(key);
      for(const [name,target,count] of [['position',s.p,3],['normal',s.n,3],['uv',s.u,2]]){
        const a=g.getAttribute(name);if(a)for(let i=0;i<a.array.length;i++)target.push(a.array[i]);else for(let i=0;i<g.attributes.position.count*count;i++)target.push(0);
      }g.dispose();old.push(o);
    });
    old.forEach(o=>{o.removeFromParent();o.geometry.dispose();});
    for(const [m,s] of sets){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(s.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(s.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(s.u,2));mesh(group,g,m);}
    return group;
  }
  const colors=['#3d6255','#8d5d4d','#526976','#b08f56','#727d5c','#635960','#9c795f','#52645b','#a19b81','#586571','#785b49','#ad9e7b'];
  const coverM=colors.map(c=>mat(c,.71,0,{map:textile})), plates=[],spines=[];
  function coverArt(i){
    if(plates[i])return plates[i];
    const tex=canvas(384,512,(c,w,h)=>{
      c.fillStyle=colors[i];c.fillRect(0,0,w,h);noise(c,w,h,16);
      c.strokeStyle='#c3a472';c.fillStyle='#d4b67d';
      const line=(x,y,u,v)=>{c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();};
      const ring=(x,y,r)=>{c.beginPath();c.arc(x,y,r,0,tau);c.stroke();};
      const diamond=(x,y,a,b)=>{c.beginPath();c.moveTo(x,y-b);c.lineTo(x+a,y);c.lineTo(x,y+b);c.lineTo(x-a,y);c.closePath();c.fill();};
      c.lineWidth=2.5;c.strokeRect(18,16,w-36,h-32);c.lineWidth=1.1;c.strokeRect(24,22,w-48,h-44);
      c.setLineDash([2,5]);c.strokeRect(30,29,w-60,h-58);c.setLineDash([]);
      for(const sx of [-1,1])for(const sy of [-1,1]){
        c.save();c.translate(sx===1?28:w-28,sy===1?32:h-32);c.scale(sx,sy);
        line(0,0,52,0);line(0,0,0,52);c.beginPath();c.arc(0,0,35,0,Math.PI/2);c.stroke();
        for(let k=0;k<4;k++){diamond(8+k*6,8+k*6,2.5,4);diamond(7,25+k*5,2,3);diamond(25+k*5,7,3,2);}c.restore();
      }
      c.save();c.translate(w/2,h*.49);
      for(let j=0;j<32;j++){c.save();c.rotate(j*tau/32);line(0,-65,0,j%4?-70:-78);c.restore();}
      ring(0,0,61);ring(0,0,55);c.lineWidth=1.5;
      if(i%3===0){
        for(let j=0;j<8;j++){c.save();c.rotate(j*tau/8);c.beginPath();c.moveTo(0,-48);c.lineTo(8,-10);c.lineTo(0,-16);c.closePath();c.fill();line(0,-48,-8,-10);line(-8,-10,0,-16);c.restore();}
        ring(0,0,9);diamond(0,0,4,6);
      }else if(i%3===1){c.beginPath();c.arc(-6,0,35,-1.1,1.5*Math.PI);c.bezierCurveTo(-15,-14,-15,13,17,22);c.stroke();diamond(23,-20,4,7);}
      else {line(-14,35,12,-35);for(let j=0;j<5;j++){c.save();c.translate(-10+j*5,22-j*12);for(let q of [-1,1]){c.beginPath();c.ellipse(q*8,-5,11,3.5,q*.65,0,tau);c.fill();}c.restore();}}
      // Paired laurel sprays and three tiny stars are stamped into the cloth.
      for(let side of [-1,1]){c.save();c.scale(side,1);c.beginPath();c.moveTo(0,100);c.quadraticCurveTo(86,83,86,-12);c.stroke();
        for(let j=0;j<10;j++){const a=.13+j*.14,x=86*Math.sin(a),y=93*Math.cos(a);
          for(let q of [-1,1]){c.save();c.translate(x,y);c.rotate(-a+q*.58);c.beginPath();c.ellipse(0,-5,2.2,7,0,0,tau);c.fill();c.restore();}}c.restore();}
      for(let j=-1;j<2;j++)diamond(j*14,-99+Math.abs(j)*5,2,j===0?6:3);c.restore();
      c.lineWidth=1;line(135,418,178,418);line(206,418,249,418);diamond(192,418,5,7);
    });
    plates[i]=mat(0xffffff,.65,0,{map:tex});return plates[i];
  }
  function spineArt(i){
    if(spines[i])return spines[i];const tex=canvas(96,384,(c,w,h)=>{
      c.fillStyle=colors[i];c.fillRect(0,0,w,h);noise(c,w,h,19);
      for(let y of [12,18,71,78,286,292,357,363]){c.fillStyle=y%2?'#c4a576':'#b39b74';c.fillRect(7,y,82,2);}
      c.strokeStyle='#bea479';c.lineWidth=1.6;c.strokeRect(13,95,70,149);c.strokeRect(17,99,62,141);
      c.save();c.translate(48,162);c.scale(1,1.25);c.rotate(Math.PI/4);c.strokeRect(-12,-12,24,24);c.fillStyle='#bfa776';c.fillRect(-4,-4,8,8);c.restore();
      for(let j=0;j<3;j++){c.beginPath();c.arc(48,312+j*9,j===1?3:1.5,0,tau);c.fill();}
    });return spines[i]=mat(0xffffff,.66,0,{map:tex});
  }
  // Local book axes: width along x, height along z, cover normal along y.
  const upright=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,0,-1),new T.Vector3(1,0,0),new T.Vector3(0,-1,0)));
  function volume(par,w,h,t,i,hero=false){
    const g=G(par),m=coverM[i%colors.length],lip=hero?.004:.0025;
    box(g,.001,0,0,w-.009,t-.004,h-.009,M.paper);
    if(hero)for(let j=1;j<=4;j++)box(g,.003,(j/5-.5)*(t-.006),.0004,w-.009,.00045,h-.008,M.pageEdge);
    for(let a of [-1,1])box(g,0,a*t/2,0,w,lip,h,m);
    box(g,-w/2+.002,0,0,.007,t,h,m);
    const side=mesh(g,new T.PlaneGeometry(t*.91,h*.985),spineArt(i),-w/2-.0018,0,0);
    side.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,1,0),new T.Vector3(0,0,-1),new T.Vector3(-1,0,0)));
    for(let q of [-.42,.42])box(g,-w/2-.002,0,h*q,.004,t*.97,.0035,m);
    if(hero){
      const top=mesh(g,new T.PlaneGeometry(w*.988,h*.99),coverArt(i),0,t/2+lip*.52+.0002,0);top.rotation.x=-Math.PI/2;
      box(g,-w*.44,t*.5+.0028,0,.0025,.001,h*.98,M.aged);
      box(g,w*.22,-.0008,h*.53,.016,.0015,h*.10,M.forest);
    }
    return g;
  }
  return {T,tau,rand,G,mat,wood,M,mesh,box,cyl,orb,lathe,rod,torus,leaf,batch,volume,upright,colors,textile,coverM,coverArt,spineArt};
})();
