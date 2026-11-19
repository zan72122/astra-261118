'use strict';
const T=THREE, PI=Math.PI, TAU=2*PI, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
let artSeed=60315;
const rand=()=>((artSeed=(Math.imul(artSeed,1664525)+1013904223)>>>0)/4294967296);
const sat=n=>Math.max(0,Math.min(1,n));
function canvas(w,h,paint){let c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);return c;}
function texture(c,color=true){let t=new T.CanvasTexture(c);if(color)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;}
const noiseTable=Array.from({length:4096},rand);
function noise(x,y){let i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);const n=(a,b)=>noiseTable[(a*191+b*73)&4095];return (n(i,j)*(1-u)+n(i+1,j)*u)*(1-v)+(n(i,j+1)*(1-u)+n(i+1,j+1)*u)*v;}
function grainMap(kind){
  return texture(canvas(512,256,(ctx,w,h)=>{let img=ctx.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){let i=4*(y*w+x),n=noise(x*.009,y*.06),a;
      if(kind==='wood'){let bend=y+5*Math.sin(x*.011+y*.017)+7*noise(x*.009,y*.028);
        const pores=noise(x*.034,bend*.8);a=199+23*n+12*Math.sin(bend*1.23+2*n)+14*pores-17*(pores>.72)+8*(rand()-.5);}
      else if(kind==='hide'){const crease=noise(x*.077,y*.086);a=215+23*crease+12*(noise(x*.35,y*.33)-.5)+13*(rand()-.5)-14*Math.max(0,1-9*Math.abs(crease-.52));}
      else a=238+12*(rand()-.5)+5*n;
      img.data[i]=a;img.data[i+1]=a;img.data[i+2]=a;img.data[i+3]=255;}
    ctx.putImageData(img,0,0);
  }));
}
const woodTex=grainMap('wood'),hideTex=grainMap('hide'),roughTex=grainMap('grain');roughTex.colorSpace=T.NoColorSpace;
const standard=(color,roughness=.62,metalness=0,opts={})=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:roughTex,...opts});
const timber=(c)=>standard(c,.49,0,{map:woodTex,bumpMap:woodTex,bumpScale:.0018});
const M={walnut:timber(0x74472e),edge:timber(0x99613c),darkwood:timber(0x52392d),oak:timber(0xb08459),cream:standard(0xf1dfb5),sage:standard(0x718675),green:standard(0x354e47,.38),brass:standard(0xc19a54,.29,.76),gold:standard(0xd7b773,.38,.57),black:standard(0x332c26,.6),stone:standard(0xbbb3a1),glass:standard(0xacc5bc,.12,.43),soil:standard(0x504a39),leaf:standard(0x667b55),leaf2:standard(0x899368),leaf3:standard(0x435f4c)};
const unit=new T.BoxGeometry(1,1,1),ball=new T.SphereGeometry(1,16,10),smallBall=new T.SphereGeometry(1,9,6),disc=new T.CylinderGeometry(1,1,1,48);
function group(parent,x=0,y=0,z=0){let g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;}
function mesh(g,geo,mat,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);g.add(m);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function box(g,x,y,z,w,h,d,m){let o=mesh(g,unit,m,x,y,z);o.scale.set(w,h,d);return o;}
function oval(g,x,y,z,a,b,c,m){let o=mesh(g,Math.max(a,b,c)<.10?smallBall:ball,m,x,y,z);o.scale.set(a,b,c);return o;}
function cyl(g,x,y,z,r,h,m,r2=r,seg=32){let o=mesh(g,r===r2&&seg===48?disc:new T.CylinderGeometry(r,r2,h,seg),m,x,y,z);if(o.geometry===disc)o.scale.set(r,h,r);return o;}
function ring(g,x,y,z,r,t,m){let o=mesh(g,new T.TorusGeometry(r,t,8,64),m,x,y,z);o.rotation.x=-PI/2;return o;}
function line(g,arr,rad,m,smooth=true,n=0){let vs=arr.map(p=>p.isVector3?p:V(...p));let path=vs.length===2?new T.LineCurve3(...vs):new T.CatmullRomCurve3(vs,false,'centripetal');return mesh(g,new T.TubeGeometry(path,n||Math.max(4,vs.length*(smooth?3:1)),rad,6,false),m);}
function surface(g,nu,nv,fn,m){let p=[],uv=[],ids=[];for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){let u=i/nu,v=j/nv,q=fn(u,v);p.push(q.x,q.y,q.z);uv.push(u,v);if(i<nu&&j<nv){let a=i*(nv+1)+j,b=a+nv+1;ids.push(a,b,a+1,b,b+1,a+1);}}
  let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ids);geo.computeVertexNormals();let o=mesh(g,geo,m);return o;}
function pbrBoth(m){m.side=T.DoubleSide;return m;}
function archShape(w,h){const s=new T.Shape(),r=w/2,k=h-r;s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,k);s.absarc(0,k,r,0,PI,false);s.lineTo(-r,0);return s;}
function plaque(g,x,y,z,w,h,d,r,mat){const s=new T.Shape(),a=-w/2,b=-h/2;s.moveTo(a+r,b);s.lineTo(-a-r,b);s.quadraticCurveTo(-a,b,-a,b+r);s.lineTo(-a,-b-r);s.quadraticCurveTo(-a,-b,-a-r,-b);s.lineTo(a+r,-b);s.quadraticCurveTo(a,-b,a,-b-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.006,bevelThickness:.004});return mesh(g,geo,mat,x,y,z);}
// Consolidate fixed world geometry with identical PBR materials, preserving authored transforms and UVs.
function batch(g){g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),sets=new Map();
  const meshes=[];g.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))meshes.push(o);});
  for(const o of meshes){let s=sets.get(o.material);if(!s){s={p:[],n:[],uv:[],idx:[],count:0};sets.set(o.material,s);}
    const mat=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(mat),geo=o.geometry,
      pos=geo.attributes.position,nor=geo.attributes.normal,uv=geo.attributes.uv,idx=geo.index,base=s.count,pt=V();
    for(let i=0;i<pos.count;i++){pt.fromBufferAttribute(pos,i).applyMatrix4(mat);s.p.push(pt.x,pt.y,pt.z);
      if(nor)pt.fromBufferAttribute(nor,i).applyNormalMatrix(nm);else pt.set(0,1,0);s.n.push(pt.x,pt.y,pt.z);s.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}
    for(let i=0;i<(idx?idx.count:pos.count);i++)s.idx.push(base+(idx?idx.getX(i):i));s.count+=pos.count;o.removeFromParent();}
  for(const [m,s] of sets){let geo=new T.BufferGeometry();for(const [k,v,a] of [['position',s.p,3],['normal',s.n,3],['uv',s.uv,2]])geo.setAttribute(k,new T.Float32BufferAttribute(v,a));geo.setIndex(s.idx);mesh(g,geo,m);}
}
