/* Locally generated surface grain, joinery, and turned forms. */
'use strict';
const Art=(()=>{
 const T=THREE, tau=Math.PI*2, V=(x,y,z)=>new T.Vector3(x,y,z), C=c=>new T.Color(c);
 const rng=(seed)=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const rand=rng(48921), grid=new Float32Array(65536);for(let i=0;i<grid.length;i++)grid[i]=rand();
 const ease=x=>x*x*(3-2*x),mix=(a,b,x)=>a+(b-a)*x;
 function noise(x,y){const i=Math.floor(x),j=Math.floor(y),u=ease(x-i),v=ease(y-j),at=(a,b)=>grid[(a&255)+((b&255)<<8)];return mix(mix(at(i,j),at(i+1,j),u),mix(at(i,j+1),at(i+1,j+1),u),v);}
 function tex(w,h,fn,color=false){
   const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),im=ctx.createImageData(w,h);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4,v=fn(x/w,y/h,x,y);im.data[k]=v[0];im.data[k+1]=v[1];im.data[k+2]=v[2];im.data[k+3]=255;}
   ctx.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;if(color)t.colorSpace=T.SRGBColorSpace;return t;
 }
 const grain=tex(1024,256,(x,y)=>{
   const warp=.032*Math.sin(x*6.28+y*8)+.021*noise(x*6,y*4),knot=Math.exp(-((x-.65)**2/.003+(y-.48)**2/.023));
   const p=y+warp+.09*knot,grain=noise(4*x,p*120),fiber=noise(x*23,p*275);
   const latewood=Math.pow(.5+.5*Math.cos(p*220+noise(x*5,p*17)*5.7),9);
   const tone=13*(noise(x*7,y*10)-.5)+25*(grain-.5)+12*(fiber-.5)-13*latewood-14*knot+6*(rand()-.5);
   return [193+tone,154+tone*.92,111+tone*.77];
 },true);
 const rough=tex(128,128,(x,y)=>{let v=226+20*(noise(x*15,y*15)-.5)+12*(rand()-.5);return [v,v,v];});
 const stipple=tex(256,256,(x,y)=>{let v=226+20*(noise(x*11,y*11)-.5)+21*(rand()-.5);return [v,v,v];},true);
 const mat=(color,roughness=.68,metalness=0,props={})=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,...props});
 const wood=(c='#d4b693')=>mat(c,.63,0,{map:grain,bumpMap:grain,bumpScale:.012});
 const M={wood:wood('#f1d3ad'),darkWood:wood('#9b7e63'),honey:wood('#e4bd92'),end:wood('#c1a589'),trim:wood('#b1977d'),
   plaster:mat('#d6c8af',.94,0,{map:stipple,bumpMap:rough,bumpScale:.015}),iron:mat('#484f4a',.36,.55),
   aged:mat('#827e6a',.43,.49),steel:mat('#b8c1bb',.25,.72),enamel:mat('#708a85',.32,.29),
   blue:mat('#385e73',.23,.13),cream:mat('#eee1c9',.46,.02),clay:mat('#dfcbb2',.58),
   cork:mat('#b1946f',.89,0,{map:stipple,bumpMap:rough,bumpScale:.02}),earth:mat('#665548'),linen:mat('#d5c9ad',.94,0,{bumpMap:rough,bumpScale:.015})};
 const geo={box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(1,18,14),fine:new T.SphereGeometry(1,36,24)};
 function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function group(parent,x=0,y=0,z=0){let g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
 function box(parent,x,y,z,w,h,d,m){const o=mesh(parent,geo.box,m,x,y,z);o.scale.set(w,h,d);return o;}
 function ball(parent,x,y,z,w,h,d,m){const o=mesh(parent,geo.ball,m,x,y,z);o.scale.set(w,h,d);return o;}
 function lathe(parent,profile,m,x=0,y=0,z=0,n=72){return mesh(parent,new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(Math.max(.0001,r),h)),n),m,x,y,z);}
 function cyl(parent,x,y,z,rt,rb,h,m,n=48){return mesh(parent,new T.CylinderGeometry(rt,rb,h,n),m,x,y,z);}
 function ring(parent,x,y,z,r,t,m){let o=mesh(parent,new T.TorusGeometry(r,t,8,80),m,x,y,z);o.rotation.x=Math.PI/2;return o;}
 function rod(parent,a,b,r,m,r2=r,n=10){const aa=V(...a),bb=V(...b),dir=bb.clone().sub(aa);const o=mesh(parent,new T.CylinderGeometry(r2,r,dir.length(),n),m);o.position.copy(aa.add(bb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());return o;}
 function tube(parent,pts,r,m,n=16){const path=new T.CatmullRomCurve3(pts.map(a=>V(...a)));return mesh(parent,new T.TubeGeometry(path,n,r,7,false),m);}
 function leaf(parent,a,b,width,m,bend=.05){
   const start=V(...a),dir=V(...b).sub(start),side=V(dir.y,-dir.x,.15*dir.x).normalize().multiplyScalar(width);
   const pos=[],ind=[];for(let i=0;i<=7;i++){const u=i/7,sz=Math.sin(u*Math.PI)**.77;let c=start.clone().addScaledVector(dir,u);c.z+=bend*sz;
    for(const j of [-1,0,1]){const p=c.clone().addScaledVector(side,j*sz);p.z+=Math.abs(j)*-.018*sz;pos.push(...p.toArray());}
    if(i<7)for(let j=0;j<2;j++){let k=i*3+j;ind.push(k,k+1,k+3,k+1,k+4,k+3);}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ind);g.computeVertexNormals();m.side=T.DoubleSide;return mesh(parent,g,m);
 }
 // Consolidate static details by finish. The changing mechanisms keep their own transforms.
 function batch(parent){
   parent.updateWorldMatrix(true,true);const inv=parent.matrixWorld.clone().invert(),by=new Map();
   parent.traverse(o=>{if(o.isMesh&&o.geometry.attributes.position&&!o.isInstancedMesh){
     const key=o.material.uuid+' '+o.castShadow+o.receiveShadow;
     if(!by.has(key))by.set(key,{list:[],m:o.material,cast:o.castShadow,receive:o.receiveShadow});by.get(key).list.push(o);
   }});
   by.forEach(({list,m,cast,receive})=>{
     if(list.length<2)return;
     const pos=[],nor=[],uv=[],colors=[],ids=[];const p=V(),normal=V();let offset=0,hasColors=false;
     for(const obj of list){const g=obj.geometry,pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv,co=g.attributes.color;
       const xf=inv.clone().multiply(obj.matrixWorld),nf=new T.Matrix3().getNormalMatrix(xf);
       for(let i=0;i<pa.count;i++){p.fromBufferAttribute(pa,i).applyMatrix4(xf);pos.push(p.x,p.y,p.z);
         normal.fromBufferAttribute(na,i).applyNormalMatrix(nf);nor.push(normal.x,normal.y,normal.z);
         uv.push(ua?ua.getX(i):0,ua?ua.getY(i):0);if(co){hasColors=true;colors.push(co.getX(i),co.getY(i),co.getZ(i));}else colors.push(1,1,1);}
       if(g.index)for(let i=0;i<g.index.count;i++)ids.push(offset+g.index.getX(i));else for(let i=0;i<pa.count;i++)ids.push(offset+i);
       offset+=pa.count;obj.removeFromParent();
     }
     const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(hasColors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ids);
     const o=mesh(parent,g,m);o.castShadow=cast;o.receiveShadow=receive;
   });
 }
 const glazeColors=['#447b95','#819481','#b77a51'];
 function ceramic(color){return new T.MeshPhysicalMaterial({color,roughness:.23,metalness:.07,clearcoat:.65,clearcoatRoughness:.15,roughnessMap:rough});}
 return {T,V,C,tau,rand,rng,ease,mix,noise,rough,stipple,mat,wood,M,geo,mesh,group,box,ball,lathe,cyl,ring,rod,tube,leaf,batch,glazeColors,ceramic};
})();
