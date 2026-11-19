'use strict';
const T=THREE;
let seed=796327;
const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const range=(a,b)=>a+(b-a)*rnd(),pick=a=>a[Math.floor(rnd()*a.length)],PI=Math.PI;
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);if(parent)parent.add(g);return g;}
function tex(kind){
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),im=ctx.createImageData(128,128);
 for(let i=0;i<128*128;i++){const x=i%128,y=i>>7;let v=kind==='rough'?218+range(-15,15):kind==='wood'?238+8*Math.sin(y*.33+2*Math.sin(x*.034+y*.09))+range(-6,6):246+range(-10,8);
 for(let k=0;k<3;k++)im.data[4*i+k]=v;im.data[4*i+3]=255;}
 ctx.putImageData(im,0,0);
 if(kind==='wood'){for(let i=0;i<45;i++){const y=range(0,128);ctx.strokeStyle='rgba(120,84,46,'+range(.025,.12)+')';ctx.lineWidth=range(.25,1.1);ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(48,y-3,80,y+2,128,y);ctx.stroke();}}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=kind==='rough'?T.NoColorSpace:T.SRGBColorSpace;return t;
}
const rough=tex('rough'),grain=tex('grain'),woodgrain=tex('wood');
const materialCache=new Map();
function mat(color,kind='paint'){const key=color+'/'+kind;if(materialCache.has(key))return materialCache.get(key);
 const shiny=kind==='metal'||kind==='glass'||kind==='water';
 const m=new T.MeshStandardMaterial({color,roughness:kind==='glass'?.11:kind==='water'?.19:kind==='metal'?.31:kind==='leaf'?.56:.84,metalness:kind==='metal'?.74:kind==='glass'?.38:kind==='water'?.42:.015,roughnessMap:rough,map:kind==='wood'?woodgrain:grain,envMapIntensity:shiny?.83:.21});
 materialCache.set(key,m);return m;}
function mesh(g,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,typeof m==='object'?m:mat(m));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
const geos={box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(1,16,10),rock:new T.IcosahedronGeometry(1,1),clump:new T.IcosahedronGeometry(1,1),cyl:new T.CylinderGeometry(1,1,1,24),rod:new T.CylinderGeometry(1,1,1,10)};
function bevelGeo(){const geo=new T.BoxGeometry(1,1,1,4,4,4),pos=geo.attributes.position,norm=geo.attributes.normal,v=new T.Vector3(),base=new T.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);base.set(...v.toArray().map(n=>Math.max(-.448,Math.min(.448,n))));const n=v.sub(base).normalize();norm.setXYZ(i,n.x,n.y,n.z);base.addScaledVector(n,.052);pos.setXYZ(i,base.x,base.y,base.z);}return geo;}
geos.soft=bevelGeo();
function box(g,x,y,z,w,h,d,m,soft=false){let o=mesh(g,soft?geos.soft:geos.box,m,x,y,z);o.scale.set(w,h,d);return o;}
function ball(g,x,y,z,w,h,d,m,rock=false){let o=mesh(g,rock?geos.rock:geos.ball,m,x,y,z);o.scale.set(w,h,d);return o;}
function cyl(g,x,y,z,r,h,m,top=r,n=24){const key='c'+(top/r).toFixed(3)+'_'+n;if(!geos[key])geos[key]=new T.CylinderGeometry(top/r,1,1,n);let o=mesh(g,geos[key],m,x,y,z);o.scale.set(r,h,r);return o;}
function stick(g,a,b,r,m,r2=r,n=10){const v=new T.Vector3(...b).sub(new T.Vector3(...a));const o=cyl(g,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,v.length(),m,r2,n);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function ring(g,x,y,z,r,tube,m,n=48){const k='t'+tube/r+'_'+n;if(!geos[k])geos[k]=new T.TorusGeometry(1,tube/r,8,n);const o=mesh(g,geos[k],m,x,y,z);o.scale.setScalar(r);return o;}
function path(g,pts,r,m){for(let i=1;i<pts.length;i++)stick(g,pts[i-1],pts[i],r,m);}
function profile(g,points,depth,m,x,y,z,bevel=.025){
 const sh=new T.Shape();points.forEach(([a,b],i)=>i?sh.lineTo(a,b):sh.moveTo(a,b));sh.closePath();
 const geo=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:bevel>0,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:8});return mesh(g,geo,m,x,y,z);}
function patch(g,x,z,w,d,col='#51472d',opacity=.18,y=.012){
 if(!patch.texture){const c=document.createElement('canvas');c.width=c.height=64;const cx=c.getContext('2d');let gr=cx.createRadialGradient(32,32,1,32,32,31);gr.addColorStop(0,'#ffffffff');gr.addColorStop(.45,'#ffffffb0');gr.addColorStop(1,'#ffffff00');cx.fillStyle=gr;cx.fillRect(0,0,64,64);patch.texture=new T.CanvasTexture(c);}
 const key=col+opacity;if(!patch[key])patch[key]=new T.MeshStandardMaterial({color:col,map:patch.texture,roughness:1,transparent:true,depthWrite:false,opacity,polygonOffset:true,polygonOffsetFactor:-1});
 let o=mesh(g,geos.plane||(geos.plane=new T.PlaneGeometry(1,1)),patch[key],x,y,z);o.rotation.x=-PI/2;o.scale.set(w,d,1);o.castShadow=false;return o;
}
// Combine repeated rigid pieces in their own local coordinate system, retaining moving joints.
function batch(g){g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(), bins=new Map();
 function walk(o){if(o.userData.live)return;if(o.isMesh&&!o.isInstancedMesh&&!o.material.transparent){const key=o.geometry.uuid+o.material.uuid+o.castShadow;let a=bins.get(key);if(!a)bins.set(key,a=[]);a.push(o);}else for(const c of o.children)walk(c);}
 for(const o of g.children)walk(o);
 for(const arr of bins.values()){if(arr.length<2)continue;const a=arr[0],im=new T.InstancedMesh(a.geometry,a.material,arr.length);im.castShadow=a.castShadow;im.receiveShadow=true;arr.forEach((o,i)=>{im.setMatrixAt(i,inv.clone().multiply(o.matrixWorld));o.removeFromParent();});g.add(im);}
}
const C={cream:'#fff1d3',white:'#f8f3df',teal:'#236764',mint:'#88bab0',metal:mat('#a4ada6','metal'),dark:'#293c3c',rubber:'#303938',wood:mat('#b78656','wood'),oak:mat('#ca9b64','wood'),honey:mat('#ddaf79','wood'),orange:'#dc813c',glass:mat('#597e85','glass')};
