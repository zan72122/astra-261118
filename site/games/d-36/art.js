/* Local surface finishes and solid modelling tools. All marks are surface decoration. */
const Art=(()=>{
  const T=THREE, tau=Math.PI*2, v=(x,y,z)=>new T.Vector3(x,y,z);
  let seed=99017;const rnd=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
  function canvas(w,h,draw,color=true){
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;
    if(color)tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  const rough=canvas(128,128,(c,w,h)=>{let p=c.createImageData(w,h);for(let i=0;i<p.data.length;i+=4){let n=210+rnd()*45;p.data[i]=p.data[i+1]=p.data[i+2]=n;p.data[i+3]=255;}c.putImageData(p,0,0);},false);
  function mat(color,opts={}){return new T.MeshStandardMaterial({color,roughness:.78,roughnessMap:rough,...opts});}
  function physical(color,opts={}){return new T.MeshPhysicalMaterial({color,roughness:.14,roughnessMap:rough,...opts});}
  const sphere=new T.SphereGeometry(1,24,18), box=new T.BoxGeometry(1,1,1);
  function mesh(parent,g,m,x=0,y=0,z=0){
    const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function group(parent,x=0,y=0,z=0){const o=new T.Group();o.position.set(x,y,z);parent.add(o);return o;}
  function ball(p,x,y,z,a,b,c,m){const o=mesh(p,sphere,m,x,y,z);o.scale.set(a,b,c);return o;}
  function cube(p,x,y,z,a,b,c,m){const o=mesh(p,box,m,x,y,z);o.scale.set(a,b,c);return o;}
  function stick(p,a,b,r,m,r2=r,segments=10){
    const d=v(...b).sub(v(...a)),g=new T.CylinderGeometry(r2,r,d.length(),segments);
    const o=mesh(p,g,m);o.position.copy(v(...a).lerp(v(...b),.5));o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o;
  }
  function line(p,points,r,m,cap=6,n=0){
    const curve=new T.CatmullRomCurve3(points.map(q=>v(...q)));
    return mesh(p,new T.TubeGeometry(curve,n||Math.max(8,points.length*4),r,cap,false),m);
  }
  function lathe(p,profile,m,seg=64){
    const g=new T.LatheGeometry(profile.map(q=>new T.Vector2(...q)),seg);
    return mesh(p,g,m);
  }
  function torus(p,x,y,z,r,t,m,vertical=false){const o=mesh(p,new T.TorusGeometry(r,t,10,64),m,x,y,z);if(!vertical)o.rotation.x=Math.PI/2;return o;}
  function surface(p,points,indices,m,uvs){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setIndex(indices);
    if(!uvs){
      const axes=[0,1,2].map(k=>{let lo=Infinity,hi=-Infinity;for(const q of points){lo=Math.min(lo,q[k]);hi=Math.max(hi,q[k]);}return {k,lo,range:hi-lo};}).sort((a,b)=>b.range-a.range).slice(0,2);
      uvs=points.map(q=>axes.map(a=>(q[a.k]-a.lo)/(a.range||1)));
    }
    g.setAttribute('uv',new T.Float32BufferAttribute(uvs.flat(),2));g.computeVertexNormals();return mesh(p,g,m);
  }
  function oval(c,x,y,rx,ry,rot,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,tau);c.fill();}
  function fish(c,x,y,size,rotation,ink){
    c.save();c.translate(x,y);c.rotate(rotation);c.scale(size,size);c.fillStyle=ink;
    c.beginPath();c.moveTo(11,1);c.bezierCurveTo(8,-9,-3,-9,-10,-1);c.bezierCurveTo(-15,-6,-19,-9,-26,-8);c.bezierCurveTo(-19,-4,-23,1,-15,1);c.bezierCurveTo(-21,2,-21,9,-24,10);c.bezierCurveTo(-16,10,-13,6,-9,3);c.bezierCurveTo(0,9,10,7,11,1);c.fill();
    oval(c,-1,-6,6,2.4,-.56,ink);oval(c,3,6,5,2,.7,ink);oval(c,7,-1.8,1.4,1.4,0,'#544640');c.restore();
  }
  function grasses(c,x,y,s,ink){
    c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=ink;c.fillStyle=ink;c.lineWidth=1.8;
    for(let k=-1;k<2;k++){c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(k*11,-20,5+k*18,-55+k*12);c.stroke();
      for(let j=1;j<5;j++){const xx=(5+k*18)*j/5,yy=(-55+k*12)*j/5;oval(c,xx-3,yy-4,1.8,6,-.63,ink);oval(c,xx+3,yy-2,1.45,5,.71,ink);}}
    c.restore();
  }
  const wood=canvas(768,128,(c,w,h)=>{
    c.fillStyle='#bf9365';c.fillRect(0,0,w,h);
    for(let i=0;i<1900;i++){const y=rnd()*h,x=rnd()*w,len=7+rnd()*470;
      c.strokeStyle=rnd()<.62?'rgba(83,55,32,'+(.025+rnd()*.17)+')':'rgba(255,222,167,'+(.07+rnd()*.22)+')';
      c.lineWidth=.3+rnd()*1.2;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+len*.26,y-1.4,x+len*.59,y+2.5,x+len,y+1);c.stroke();}
    for(let j=0;j<5;j++){const x=rnd()*w,y=rnd()*h;for(let a=0;a<6;a++){c.strokeStyle='rgba(105,64,34,.13)';c.lineWidth=.8;c.beginPath();c.ellipse(x,y,3+a*7,1+a*1.25,0,0,tau);c.stroke();}}
  });
  const boards=Array.from({length:7},(_,i)=>mat(new T.Color().setHSL(.086,.18,.67+i*.032),{map:wood,roughness:.61}));
  const beam=mat(0x956b46,{map:wood}), bamboo=mat(0xb79c63,{roughness:.53}),rope=mat(0xad956c);
  const stone=mat(0x7b8177,{roughness:.94}), iron=physical(0x394e4b,{metalness:.79,roughness:.37,side:T.DoubleSide}),brass=physical(0xb99a59,{metalness:.75,roughness:.28});
  function paperTexture(k){return canvas(160,512,(c,w,h)=>{
    const base=['#d1e7e4','#dee5cc','#eee4d1'][k];c.fillStyle=base;c.fillRect(0,0,w,h);
    for(let i=0;i<9500;i++){c.fillStyle=rnd()<.5?'rgba(255,255,240,.24)':'rgba(81,90,80,.07)';c.fillRect(rnd()*w,rnd()*h,.6+rnd(),1+rnd()*5);}
    if(k===0){fish(c,86,368,2.1,-.65,'#c4674e');fish(c,58,412,1.05,-1.12,'#bc6d58');grasses(c,27,519,1.48,'#7daba1');}
    if(k===1){grasses(c,62,525,3.1,'#6e8878');grasses(c,129,539,1.95,'#9baf98');}
    if(k===2){for(let j=0;j<4;j++)for(let i=-1;i<3;i++){c.strokeStyle='#7a99aa';c.lineWidth=2;for(let n=1;n<5;n++){c.beginPath();c.arc(i*70+(j%2)*35,502-j*15,7*n,Math.PI,tau);c.stroke();}}}
    oval(c,80,24,5,5,0,'#967e67');
  });}
  function flowers(c,x,y,s,color){
    for(let j=0;j<5;j++){const a=j*tau/5;oval(c,x+Math.cos(a)*s*.61,y+Math.sin(a)*s*.61,s*.56,s*.36,a,color);}
    oval(c,x,y,s*.18,s*.18,0,'#dfcda2');
  }
  function glaze(k){return canvas(1024,384,(c,w,h)=>{
    if(k===0){
      for(let i=0;i<5;i++){const x=(i+.47)*w/5;fish(c,x,237+35*Math.sin(i*2),1.6+i%2*.4,i%2?-.42:.23,'#cf6a46');grasses(c,x-67,341,1.02,'#57988d');
        for(let j=0;j<3;j++){c.strokeStyle='rgba(213,246,235,.82)';c.lineWidth=1.9;c.beginPath();c.arc(x+24+j*7,201-j*15,2+j,0,tau);c.stroke();}}
    }else{
      c.fillStyle='#eeeae0';c.fillRect(0,0,w,h);
      for(let j=0;j<9;j++){let x=(j+.35)*w/9,y=154+Math.sin(j*2)*28;c.strokeStyle='#375e81';c.lineWidth=2.5;c.beginPath();c.moveTo(x-35,y+47);c.quadraticCurveTo(x-13,y+29,x+19,y-22);c.stroke();
        flowers(c,x-9,y+13,14,'#55799b');flowers(c,x+15,y-20,9,'#466887');oval(c,x+7,y+1,4,10,.56,'#668597');}
      [32,41,308,317,336].forEach(y=>{c.fillStyle='#4c7497';c.fillRect(0,y,w,y===317?7:2);});
    }
  });}
  const yukata=canvas(256,256,(c,w,h)=>{
    c.fillStyle='#476b85';c.fillRect(0,0,w,h);
    for(let j=-1;j<5;j++)for(let i=-1;i<5;i++){
      const x=i*64+(j%2)*32,y=j*64;
      c.save();c.translate(x,y);c.rotate(-.38);c.strokeStyle='#b3c6c9';c.lineWidth=1.35;
      for(let k=0;k<5;k++){c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-11,-6,-13,-17,-5,-16);c.quadraticCurveTo(0,-11,0,-3);c.stroke();c.rotate(tau/5);}
      oval(c,0,0,2.5,2.5,0,'#e3d2b7');c.restore();c.fillStyle='#829eac';c.fillRect(x+22,y+24,2,4);
    }
  });
  const robe=mat(0xffffff,{map:yukata,side:T.DoubleSide}), silk=mat(0xc37065,{roughness:.65}), collar=mat(0xe5dfcb);
  function pack(p) {
    // Batch fixed solids only. Positions and normals become local to the assembly.
    p.updateWorldMatrix(true,true);
    const inv=new T.Matrix4().copy(p.matrixWorld).invert(), buckets=new Map(), remove=[];
    p.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||o.material.transparent)return;
      const key=o.material.uuid+o.castShadow+o.receiveShadow;
      if(!buckets.has(key))buckets.set(key,{m:o.material,cast:o.castShadow,receive:o.receiveShadow,arr:[]});
      buckets.get(key).arr.push(o);});
    for(const b of buckets.values()){
      if(b.arr.length<2)continue;
      let count=0;const pos=[],norm=[],uv=[],idx=[];
      for(const o of b.arr){const g=o.geometry,pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv;
        const m=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),n=new T.Matrix3().getNormalMatrix(m),t=new T.Vector3();
        for(let i=0;i<pa.count;i++){t.fromBufferAttribute(pa,i).applyMatrix4(m);pos.push(t.x,t.y,t.z);
          if(na)t.fromBufferAttribute(na,i).applyMatrix3(n).normalize();else t.set(0,1,0);norm.push(t.x,t.y,t.z);
          uv.push(ua?ua.getX(i):0,ua?ua.getY(i):0);}
        if(g.index){for(const id of g.index.array)idx.push(count+id);}else for(let j=0;j<pa.count;j++)idx.push(count+j);
        count+=pa.count;remove.push(o);
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
      const o=mesh(p,g,b.m);o.castShadow=b.cast;o.receiveShadow=b.receive;
    }
    for(const o of remove)o.removeFromParent();
  }
  return {T,tau,v,rnd,canvas,mat,physical,mesh,group,ball,cube,stick,line,lathe,torus,surface,oval,fish,flowers,rough,wood,boards,beam,bamboo,rope,stone,iron,brass,paperTexture,glaze,robe,silk,collar,pack};
})();
