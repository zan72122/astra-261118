'use strict';
const Atelier=(()=>{
const T=THREE;let seed=82349;
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function canvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
const rough=canvas(128,128,(c,w,h)=>{let im=c.createImageData(w,h);for(let i=0;i<im.data.length;i+=4){let n=216+rand()*38;im.data.set([n,n,n,255],i);}c.putImageData(im,0,0);});rough.colorSpace=T.NoColorSpace;rough.wrapS=rough.wrapT=T.RepeatWrapping;
const cache=new Map();
function mat(color,roughness=.77,metalness=0,opt={}){let key=[color,roughness,metalness].join('|');if(!Object.keys(opt).length&&cache.has(key))return cache.get(key);const m=new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,...opt});if(!Object.keys(opt).length)cache.set(key,m);return m;}
function fibers(wood=false,index=0){
 return canvas(wood?1024:512,256,(c,w,h)=>{const img=c.createImageData(w,h),n=img.data;
 let lines=Array.from({length:h},()=>rand()*3),g=Array.from({length:129},()=>rand()*4);
 const knot=.14+.23*index,ky=.35+.10*(index%3);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=x/w,v=y/h;let d;
 if(wood){const k=Math.exp(-((u-knot)**2*32+(v-ky)**2*18));const gr=v*54+1.3*Math.sin(u*7+index)+.8*Math.sin(u*13+v*5)+k*(v-ky)*32;
 d=-5.8*Math.pow(.5+.5*Math.sin(gr*3.1),8)-3.5*Math.sin(gr*.34)+lines[y]+rand()*4+g[(x>>4)%129]*.3;}
 else d=rand()*13-6+lines[y]*.45;
 const b=wood?232:239;let i=(y*w+x)*4;n[i]=b+d;n[i+1]=b+d-(wood?2:0);n[i+2]=b+d-(wood?6:1);n[i+3]=255;}
 c.putImageData(img,0,0);
 for(let j=0;j<(wood?680:2600);j++){const x=rand()*w,y=rand()*h;c.strokeStyle=rand()>.5?'rgba(97,74,43,.10)':'rgba(255,255,244,.24)';c.lineWidth=rand()*.65+.32;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+5,y+.5,x+rand()*(wood?68:5),y+rand()*(wood?1.4:3)-1);c.stroke();}
 });
}
const paper=fibers(),timber=Array.from({length:5},(_,i)=>fibers(true,i));
function board(color,i=0){return mat(color,.71,.01,{map:timber[i%5]});}
const geo=new Map();
function group(parent,x=0,y=0,z=0){const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;}
function mesh(parent,g,m,x=0,y=0,z=0){const a=new T.Mesh(g,m);parent.add(a);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;return a;}
function box(p,w,h,d,m,x=0,y=0,z=0,r=0){
 let key=[w,h,d,r].join('_'),g=geo.get(key);if(!g){g=new T.BoxGeometry(w,h,d,r?5:1,r?5:1,r?5:1);
 if(r){r=Math.min(r,w*.48,h*.48,d*.48);const pos=g.attributes.position,nor=g.attributes.normal;
 for(let i=0;i<pos.count;i++){const half=[w/2,h/2,d/2],a=[pos.getX(i),pos.getY(i),pos.getZ(i)],q=a.map((v,j)=>Math.sign(v)*Math.max(0,(Math.abs(v/half[j])-.201)/.799));let l=Math.hypot(...q)||1;
 pos.setXYZ(i,...a.map((v,j)=>Math.sign(v)*(half[j]-r)+q[j]/l*r));nor.setXYZ(i,...q.map(v=>v/l));}
 }geo.set(key,g);}return mesh(p,g,m,x,y,z);
}
function ball(p,x,y,z,rx,ry,rz,m){let g=geo.get('sphere');if(!g){g=new T.SphereGeometry(1,20,14);geo.set('sphere',g);}let a=mesh(p,g,m,x,y,z);a.scale.set(rx,ry,rz);return a;}
function cyl(p,x,y,z,rt,rb,h,m,n=32){const key='c'+[rt,rb,h,n].join('_');let g=geo.get(key);if(!g){g=new T.CylinderGeometry(rt,rb,h,n);geo.set(key,g);}return mesh(p,g,m,x,y,z);}
function rod(p,a,b,r,m,r2=r){const v=new T.Vector3(...a),w=new T.Vector3(...b),mid=v.clone().add(w).multiplyScalar(.5);let o=cyl(p,mid.x,mid.y,mid.z,r2,r,v.distanceTo(w),m,12);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),w.sub(v).normalize());return o;}
function line(p,pts,r,m,closed=false){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q)),closed,'catmullrom',.32),Math.max(16,pts.length*5),r,7,closed),m);}
function ring(p,x,y,z,R,r,m){return mesh(p,new T.TorusGeometry(R,r,8,48),m,x,y,z);}
function face(p,w,h,m,x,y,z){let o=mesh(p,new T.PlaneGeometry(w,h),m,x,y,z);o.castShadow=false;return o;}
const shadeTex=canvas(128,128,(c,w,h)=>{let g=c.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'rgba(61,37,22,.66)');g.addColorStop(.52,'rgba(61,37,22,.30)');g.addColorStop(1,'rgba(61,37,22,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
function contact(p,x,y,z,w,d,alpha=.57){let o=face(p,w,d,mat(0x806747,1,0,{map:shadeTex,transparent:true,opacity:alpha,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),x,y,z);o.rotation.x=-Math.PI/2;return o;}
function decal(tex){return mat(0xffffff,.90,0,{map:tex,transparent:true,alphaTest:.015,polygonOffset:true,polygonOffsetFactor:-2,depthWrite:false});}
function makeStamp(kind){
 return canvas(512,300,(c,w,h)=>{
 c.fillStyle='#f6e8c7';c.beginPath();c.roundRect(4,4,w-8,h-8,7);c.fill();
 c.fillStyle='#ddcfad';for(let i=0;i<1500;i++)c.fillRect(rand()*w,rand()*h,rand()*2,1);
 c.strokeStyle='#a3977b';c.lineWidth=2;c.strokeRect(14,14,484,272);
 c.save();c.translate(30,32);c.fillStyle=['#597a7a','#ad7851','#71836b'][kind];c.fillRect(0,0,175,220);
 // A miniature lino-cut harbour stamp. The perforations belong to the paper.
 c.fillStyle='#f4e4bf';for(let i=4;i<175;i+=17){c.beginPath();c.arc(i,0,4,0,7);c.arc(i,220,4,0,7);c.fill();}
 for(let i=5;i<220;i+=17){c.beginPath();c.arc(0,i,4,0,7);c.arc(175,i,4,0,7);c.fill();}
 c.strokeStyle='#e5d8b1';c.lineWidth=2.5;c.strokeRect(12,12,151,196);
 c.fillStyle='#f0bf73';c.beginPath();c.arc(118,62,24,0,7);c.fill();
 if(kind===0){
  c.fillStyle='#ecdec1';c.beginPath();c.moveTo(36,146);c.lineTo(88,60);c.lineTo(88,144);c.closePath();c.fill();
  c.beginPath();c.moveTo(94,90);c.lineTo(134,145);c.lineTo(94,145);c.fill();
  c.fillStyle='#374f55';c.beginPath();c.moveTo(33,151);c.lineTo(138,151);c.lineTo(121,170);c.lineTo(53,170);c.fill();
 }else if(kind===1){
  c.fillStyle='#efe2bf';c.beginPath();c.moveTo(59,164);c.lineTo(73,81);c.lineTo(100,81);c.lineTo(114,164);c.fill();
  c.fillStyle='#a46048';c.fillRect(69,103,36,12);c.fillRect(66,127,43,12);c.fillStyle='#485953';c.fillRect(66,75,42,7);
  c.fillRect(74,53,26,22);c.beginPath();c.moveTo(64,53);c.lineTo(87,34);c.lineTo(110,53);c.fill();
  c.fillStyle='#f3cf81';c.fillRect(80,59,14,12);c.fillStyle='#5e6d60';c.fillRect(32,164,112,6);
 }else{
  c.fillStyle='#f2e5c6';c.beginPath();c.moveTo(28,92);c.quadraticCurveTo(66,98,85,119);c.quadraticCurveTo(105,83,149,71);
  c.quadraticCurveTo(131,91,113,121);c.quadraticCurveTo(99,130,90,138);c.lineTo(62,151);
  c.lineTo(76,133);c.quadraticCurveTo(56,116,28,92);c.fill();
 }
 c.strokeStyle='#e9dbb6';for(let y=178;y<202;y+=9){c.beginPath();c.moveTo(23,y);c.bezierCurveTo(64,y-8,101,y+8,151,y-1);c.stroke();}c.restore();
 c.strokeStyle='#797e69';c.lineWidth=4;for(let j=0;j<2;j++){c.beginPath();c.arc(316,119,59-j*11,0,7);c.stroke();}c.beginPath();c.moveTo(276,130);c.lineTo(308,96);c.lineTo(331,122);c.lineTo(343,109);c.lineTo(356,130);c.stroke();
 for(let i=0;i<4;i++){c.beginPath();c.moveTo(340,95+i*16);c.bezierCurveTo(386,65+i*16,426,120+i*16,476,86+i*16);c.stroke();}
 c.fillStyle='#a29d83';[0,1,2].forEach(i=>{c.fillRect(252,211+i*11,[154,124,76][i],2);});
 });
}
const iconPaint=['#66786e','#a67647','#636f78'];
function cargoIcon(i){return canvas(192,168,(c)=>{c.strokeStyle=c.fillStyle=iconPaint[i];c.lineWidth=7;c.lineCap='round';c.lineJoin='round';
 c.beginPath();if(i===0){for(let j=0;j<3;j++){c.save();c.translate(48+j*26,100);c.rotate(j===2?-.18:0);c.strokeRect(0,-54-j*6,18,68+j*6);c.fillRect(3,-43-j*6,12,4);c.fillRect(3,3,12,3);c.restore();}}else if(i===1){c.moveTo(33,93);c.lineTo(47,60);c.quadraticCurveTo(61,87,75,66);c.lineTo(83,55);c.quadraticCurveTo(113,85,148,94);c.lineTo(153,111);c.quadraticCurveTo(95,123,35,103);c.closePath();c.stroke();}else {c.roundRect(39,62,111,63,7);c.stroke();c.beginPath();c.moveTo(53,59);c.lineTo(135,32);c.stroke();c.beginPath();c.arc(124,90,11,0,7);c.stroke();[0,1,2].forEach(j=>c.fillRect(53,78+j*10,42,4));}
 });}
function environment(){
 const faces=Array.from({length:6},(_,f)=>{const c=document.createElement('canvas');c.width=c.height=64;let a=c.getContext('2d'),g=a.createLinearGradient(0,0,0,64);
 g.addColorStop(0,f===3?'#a18363':'#b5d4e1');g.addColorStop(.55,f===2?'#e7e8dc':'#e6d6b7');g.addColorStop(1,'#927c63');a.fillStyle=g;a.fillRect(0,0,64,64);
 if(f===5||f===0){a.fillStyle='#fff7d9';a.fillRect(8,14,30,35);a.fillStyle='#b3b1a2';a.fillRect(22,14,1,35);}return c;});const e=new T.CubeTexture(faces);e.colorSpace=T.SRGBColorSpace;e.needsUpdate=true;return e;
}
return {T,rand,canvas,mat,board,paper,timber,group,mesh,box,ball,cyl,rod,line,ring,face,contact,decal,makeStamp,cargoIcon,environment};
})();
