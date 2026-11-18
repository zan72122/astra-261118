'use strict';
const Atelier=(()=>{
 const T=THREE,TAU=Math.PI*2,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 function random(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
 const rnd=random(615),lut=Float32Array.from({length:65536},rnd),fade=x=>x*x*(3-2*x);
 function noise(x,y){let i=Math.floor(x),j=Math.floor(y),a=fade(x-i),b=fade(y-j);i&=255;j&=255;
 const m=lut[(j<<8)+i],n=lut[(j<<8)+((i+1)&255)],o=lut[(((j+1)&255)<<8)+i],p=lut[(((j+1)&255)<<8)+((i+1)&255)];return m+(n-m)*a+(o-m)*b+(m-n-o+p)*a*b;}
 function texture(canvas,color=true){const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;if(color)t.colorSpace=T.SRGBColorSpace;return t;}
 function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 const grainCanvas=canvas(1024,512),ctx=grainCanvas.getContext('2d'),pix=ctx.createImageData(1024,512),roughCanvas=canvas(1024,512),rc=roughCanvas.getContext('2d'),rp=rc.createImageData(1024,512);
 // Offset growth shells form cathedral grain; fine longitudinal vessels interrupt the latewood.
 for(let y=0;y<512;y++)for(let x=0;x<1024;x++){
   const u=x/1024,v=y/512,warp=(noise(u*3+1,v*4)-.5)*.115+(noise(u*8,v*13)-.5)*.019;
   const level=Math.hypot((u-.38)*.43,(v-.48+warp)*1.56+.014*Math.sin(u*8));
   const ring=level*43+(noise(u*3,v*24)-.5)*.28,phase=ring-Math.floor(ring);
   const dark=Math.exp(-Math.pow((phase-.8)/.088,2))*.56+Math.exp(-Math.pow((phase-.68)/.20,2))*.33;
   const fiber=noise(u*54,(v+warp*.2)*630),streak=noise(u*9,(v+warp*.6)*151);
   const shade=219-26*dark+(streak-.5)*24+(fiber-.5)*18+(noise(u*5,v*24)-.5)*16+(rnd()-.5)*11;
   const i=(y*1024+x)*4;
   pix.data[i]=shade*1.07;pix.data[i+1]=shade*.983-dark*6;pix.data[i+2]=shade*.866-dark*10;pix.data[i+3]=255;
   rp.data[i]=rp.data[i+1]=rp.data[i+2]=164+fiber*48+dark*17;rp.data[i+3]=255;
 }
 ctx.putImageData(pix,0,0);rc.putImageData(rp,0,0);
 for(let i=0;i<7300;i++){const x=rnd()*1024,y=rnd()*512;ctx.strokeStyle='rgba(75,44,23,'+(.035+rnd()*.14)+')';ctx.lineWidth=.3+rnd()*.7;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+4,y-.3,x+2+rnd()*15,y-.4+rnd()*.8);ctx.stroke();}
 const grain=texture(grainCanvas),rough=texture(roughCanvas,false);
 const endCanvas=canvas(256,256),ec=endCanvas.getContext('2d');
 ec.fillStyle='#ecd1a9';ec.fillRect(0,0,256,256);
 for(let i=0;i<100;i++){ec.beginPath();ec.strokeStyle=i%4===0?'#b49269':'#ceb18a';ec.lineWidth=rnd()*1.5+.6;for(let j=0;j<=150;j++){const a=j/150*TAU,r=i*3.8+noise(Math.cos(a)*4+6,Math.sin(a)*4+7)*2.6;const x=-44+Math.cos(a)*r*1.4,y=173+Math.sin(a)*r*.86;j?ec.lineTo(x,y):ec.moveTo(x,y);}ec.stroke();}
 const endgrain=texture(endCanvas);
 function mat(color,roughness=.65,metalness=0,extra={}){return new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,...extra});}
 function wood(color,roughness=.68){
   const section=grain.clone(),u=.59+rnd()*.38,v=.47+rnd()*.48;
   section.repeat.set(u,v);section.offset.set((1-u)*rnd(),(1-v)*rnd());section.needsUpdate=true;
   return mat(color,roughness,0,{map:section,bumpMap:rough,bumpScale:.0024});
 }
 const m={bench:wood(0x98704e),bench2:wood(0xa68159),edge:wood(0x765338),dark:wood(0x5c4935),wall:wood(0x716044),trim:wood(0xba9467),
  board:wood(0xfad19a),plane:wood(0xe9ad6e,.48),leg:wood(0xdeb180),mini:wood(0xe4ba83),iron:mat(0x434947,.41,.86),
  steel:mat(0x9ca39b,.29,.85),bronze:mat(0x9a7948,.46,.71),brass:mat(0xd4ad67,.29,.72),darkMetal:mat(0x383d37,.56,.68),
  shave:wood(0xffe5a3,.53),shave2:wood(0xf5cb87,.6),green:mat(0x53654a),ceramic:mat(0x8b9a84,.33),cream:mat(0xe9d8b4,.55),
  wax:mat(0xa9754c,.74),bark:wood(0x655947),cloth:mat(0x687461,.97),soil:mat(0x847f55),rock:mat(0xa2a494)};
 m.shave.side=m.shave2.side=T.DoubleSide;
 function rounded(w,h,d,r=.012){
   r=Math.min(r,w*.48,h*.48,d*.48);
   const geo=new T.BoxGeometry(w,h,d,7,7,7),pos=geo.attributes.position,nor=geo.attributes.normal,uv=geo.attributes.uv;
   let p=V(),n=V();const axes=[w,h,d];
   for(let i=0;i<pos.count;i++){n.fromBufferAttribute(nor,i);p.fromBufferAttribute(pos,i);
     const o=[p.x,p.y,p.z].map((c,k)=>{const size=axes[k],j=Math.round((c/size+.5)*7);return j<=3?-size/2+r*j/3:size/2-r*(7-j)/3;});
     const q=o.map((a,k)=>T.MathUtils.clamp(a,-axes[k]/2+r,axes[k]/2-r)),v=V(o[0]-q[0],o[1]-q[1],o[2]-q[2]).normalize();
     pos.setXYZ(i,q[0]+v.x*r,q[1]+v.y*r,q[2]+v.z*r);nor.setXYZ(i,v.x,v.y,v.z);
     let a,b;if(Math.abs(n.y)>.5){a=o[0]/w;b=o[2]/d;}else if(Math.abs(n.z)>.5){a=o[0]/w;b=-o[1]/h;}else{a=o[2]/d;b=-o[1]/h;}
     uv.setXY(i,a+.5,b+.5);
   }return geo;
 }
 const geoCache=new Map();
 function geo(key,fn){if(!geoCache.has(key))geoCache.set(key,fn());return geoCache.get(key);}
 function surfaceUV(g){
   if(g.attributes.uv)return g;
   const pos=g.attributes.position,norm=g.attributes.normal,uv=[];
   for(let i=0;i<pos.count;i++){
     const top=Math.abs(norm.getY(i))>.65;
     uv.push(pos.getX(i)*.67+pos.getZ(i)*.15,top?pos.getZ(i)*.68:pos.getY(i)*.78);
   }
   g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;
 }
 function mesh(parent,g,material,x=0,y=0,z=0){const a=new T.Mesh(surfaceUV(g),material);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
 function box(p,w,h,d,ma,x=0,y=0,z=0,r=.012){return mesh(p,geo('b'+[w,h,d,r].join(','),()=>r?rounded(w,h,d,r):new T.BoxGeometry(w,h,d)),ma,x,y,z);}
 function group(p,x=0,y=0,z=0){const g=new T.Group();p.add(g);g.position.set(x,y,z);return g;}
 function cyl(p,rt,rb,h,ma,x=0,y=0,z=0,num=20){return mesh(p,geo('c'+[rt,rb,h,num].join(','),()=>new T.CylinderGeometry(rt,rb,h,num)),ma,x,y,z);}
 function beam(p,a,b,width,material,depth=width){const A=V(...a),B=V(...b),v=B.clone().sub(A),q=box(p,v.length(),width,depth,material,0,0,0,.005);q.position.copy(A.add(B).multiplyScalar(.5));q.quaternion.setFromUnitVectors(V(1,0,0),v.normalize());return q;}
 function twig(p,a,b,r1,r2,ma,n=8){const A=V(...a),B=V(...b),v=B.clone().sub(A),q=cyl(p,r2,r1,v.length(),ma,0,0,0,n);q.position.copy(A.add(B).multiplyScalar(.5));q.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return q;}
 function ball(p,rx,ry,rz,ma,x,y,z){const a=mesh(p,geo('ball',()=>new T.SphereGeometry(1,16,12)),ma,x,y,z);a.scale.set(rx,ry,rz);return a;}
 function lathe(p,pts,ma,x,y,z){return mesh(p,new T.LatheGeometry(pts.map(a=>new T.Vector2(...a)),36),ma,x,y,z);}
 function stripgeo(n){let a=[],u=[],ind=[];for(let j=0;j<=n;j++){a.push(0,0,0,0,0,0);u.push(j/n,0,j/n,1);if(j<n){let i=2*j;ind.push(i,i+1,i+2,i+1,i+3,i+2);}}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.setAttribute('uv',new T.Float32BufferAttribute(u,2));g.setIndex(ind);return g;}
 function curl(g,length,radius,width,shape=0){
   const pos=g.attributes.position,step=pos.count/2-1;
   for(let j=0;j<=step;j++){
     const k=j/step,a=k*length/radius,r=radius*(.82+.20*k+.045*Math.sin(a*.72+shape));
     const x=(.5-k)*length*.21+r*Math.sin(a)*.34,y=r*Math.cos(a),z=r*Math.sin(a);
     const twist=.18*Math.sin(a*.66+shape),w=width*(.98+.022*Math.cos(a*5));
     pos.setXYZ(2*j,x-w*.5,y-w*twist*.5,z);pos.setXYZ(2*j+1,x+w*.5,y+w*twist*.5,z);
   }pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
 }
 // Batch the stationary scenery while retaining its modeled surfaces and shadows.
 function batch(root){
   root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),sets=new Map();
   root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)){const k=o.material.uuid+o.castShadow+o.receiveShadow;if(!sets.has(k))sets.set(k,[]);sets.get(k).push(o);}});
   for(const list of sets.values()){
     if(list.length<2)continue;let positions=[],normals=[],uvs=[],colors=[],idx=[],base=0,hasColor=list[0].material.vertexColors;
     for(const obj of list){
       const g=obj.geometry,ps=g.attributes.position,no=g.attributes.normal,uv=g.attributes.uv,col=g.attributes.color,mt=inv.clone().multiply(obj.matrixWorld),nm=new T.Matrix3().getNormalMatrix(mt),v=V();
       for(let j=0;j<ps.count;j++){v.fromBufferAttribute(ps,j).applyMatrix4(mt);positions.push(v.x,v.y,v.z);v.fromBufferAttribute(no,j).applyNormalMatrix(nm);normals.push(v.x,v.y,v.z);uvs.push(uv?uv.getX(j):0,uv?uv.getY(j):0);if(hasColor)colors.push(col?col.getX(j):1,col?col.getY(j):1,col?col.getZ(j):1);}
       if(g.index)for(const v of g.index.array)idx.push(base+v);else for(let j=0;j<ps.count;j++)idx.push(base+j);base+=ps.count;obj.removeFromParent();
     }const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));if(hasColor)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);const o=mesh(root,g,list[0].material);o.castShadow=list[0].castShadow;o.receiveShadow=list[0].receiveShadow;
   }
 }
 return {T,TAU,V,random,rnd,noise,texture,canvas,grain,rough,endgrain,mat,wood,m,surfaceUV,mesh,box,group,cyl,beam,twig,ball,lathe,stripgeo,curl,batch,rounded,geo};
})();
