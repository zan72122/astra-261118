(function(){
'use strict';const T=THREE;
let r=49737;function rand(){r=(Math.imul(r,1664525)+1013904223)>>>0;return r/4294967296;}
const range=(a,b)=>a+(b-a)*rand(),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function texture(w,h,paint,repeat=false,color=true){
 const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);
 const t=new T.CanvasTexture(c);if(color)t.colorSpace=T.SRGBColorSpace;if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}
const fleck=texture(128,128,(g,w,h)=>{const a=g.createImageData(w,h);for(let i=0;i<a.data.length;i+=4){
 const n=230+rand()*25;a.data[i]=a.data[i+1]=a.data[i+2]=n;a.data[i+3]=255;}g.putImageData(a,0,0);},true,false);
function mat(color,roughness=.76,extra={}){return new T.MeshStandardMaterial({color,roughness,roughnessMap:fleck,...extra});}
const wood=texture(1024,512,(g,w,h)=>{
 g.fillStyle='#dfb88b';g.fillRect(0,0,w,h);
 for(let i=0;i<2000;i++){let y=rand()*h,a=rand()*5,k=range(.003,.013),shift=rand()*30;
 g.beginPath();for(let x=-20;x<w+20;x+=12){const v=y+Math.sin(x*k+shift)*a+Math.sin(x*.023+shift)*a*.16;if(x===-20)g.moveTo(x,v);else g.lineTo(x,v);}
 g.strokeStyle=i%4===0?'rgba(255,237,193,.12)':'rgba(105,64,38,'+range(.016,.095)+')';g.lineWidth=range(.3,1.6);g.stroke();}
 for(let i=0;i<1800;i++){g.fillStyle='rgba(104,68,41,.05)';g.fillRect(range(0,w),range(0,h),range(1,15),.5);}
},true);
function mark(g,x,y,k,color){g.save();g.translate(x,y);g.scale(k,k);g.strokeStyle=color;g.fillStyle=color;g.lineWidth=1.5;g.lineJoin='round';
 g.beginPath();g.moveTo(-23,-7);g.lineTo(24,-15);g.lineTo(5,18);g.lineTo(-2,6);g.lineTo(-10,10);g.lineTo(-11,2);g.closePath();g.stroke();
 g.beginPath();g.moveTo(-11,2);g.lineTo(24,-15);g.lineTo(-2,6);g.moveTo(-10,10);g.lineTo(-2,6);g.stroke();g.restore();}
function line(g,points,c,l=1){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle=c;g.lineWidth=l;g.stroke();}
const paperFront=texture(512,704,(g,w,h)=>{
 g.fillStyle='#fffdf3';g.fillRect(0,0,w,h);
 for(let i=0;i<7000;i++){g.fillStyle=i%3?'rgba(137,112,84,.045)':'rgba(255,255,255,.45)';g.fillRect(rand()*w,rand()*h,range(.5,2.5),.7);}
 // A little perforated pictorial postage stamp, printed straight onto the fibres.
 g.save();g.translate(411,603);g.rotate(.065);g.fillStyle='#91aebe';g.fillRect(0,0,64,75);
 for(let i=0;i<=64;i+=8){for(const y of [0,75]){g.beginPath();g.arc(i,y,2.45,0,7);g.fillStyle='#fffdf3';g.fill();}}
 for(let y=0;y<=75;y+=8){for(const x of [0,64]){g.beginPath();g.arc(x,y,2.45,0,7);g.fill();}}
 g.strokeStyle='#e9efdf';g.lineWidth=1.5;g.strokeRect(6,7,52,61);g.fillStyle='#e8d0a2';g.beginPath();g.arc(43,25,8,0,7);g.fill();
 g.fillStyle='#607f96';g.beginPath();g.moveTo(8,55);g.lineTo(25,38);g.lineTo(40,48);g.lineTo(55,34);g.lineTo(55,65);g.lineTo(8,65);g.fill();mark(g,29,32,.63,'#fff8df');g.restore();
 g.save();g.translate(397,642);g.rotate(-.13);g.strokeStyle='#718b9a99';g.lineWidth=1.8;for(const rad of [19,24]){g.beginPath();g.arc(0,0,rad,0,7);g.stroke();}
 for(let i=0;i<3;i++){g.beginPath();g.moveTo(-68,-8+i*8);g.bezierCurveTo(-50,-18+i*8,-40,7+i*8,-20,-6+i*8);g.stroke();}g.restore();
});
function reverse(color){return texture(512,704,(g,w,h)=>{g.fillStyle=color;g.fillRect(0,0,w,h);
 for(const x of [15,23,489,497]){g.fillStyle='#eaf1ea';g.fillRect(x,0,x%2?2:4,h);}
 for(let i=0;i<3500;i++){g.fillStyle='rgba(60,92,109,.05)';g.fillRect(rand()*w,rand()*h,2,.65);}
 mark(g,65,632,.79,'#f2f3e7');});}
function matPrint(aspect){return texture(1024,Math.round(1024/aspect),(g,w,h)=>{
 g.fillStyle='#789eae';g.fillRect(0,0,w,h);
 for(let i=0;i<40000;i++){g.fillStyle=i%2?'rgba(245,250,231,.04)':'rgba(32,63,77,.035)';g.fillRect(rand()*w,rand()*h,1.6,1);}
 const pale='rgba(234,243,231,.62)';g.lineWidth=1.2;
 for(let m of [13,19]){g.strokeStyle=pale;g.beginPath();g.roundRect(m,m,w-2*m,h-2*m,9);g.stroke();}
 const dx=w/32;g.save();g.beginPath();g.rect(28,28,w-56,h-56);g.clip();
 for(let x=30;x<w;x+=dx)line(g,[[x,28],[x,h-28]],'rgba(226,242,237,.21)',1);
 for(let y=30;y<h;y+=dx)line(g,[[28,y],[w-28,y]],'rgba(226,242,237,.21)',1);
 g.restore();for(let x=30,i=0;x<w-30;x+=dx/2,i++){for(const y of [24,h-24])line(g,[[x,y],[x,y+(y<h/2?1:-1)*(i%2?3:7)]],pale,1);}
 for(let y=30,i=0;y<h-30;y+=dx/2,i++)line(g,[[24,y],[24+(i%2?3:7),y]],pale,1);
 // drafting legend: sheet, crease, glider
 g.save();g.translate(55,h-55);const ink='#dae8e4';g.strokeStyle=ink;g.lineWidth=1.7;g.strokeRect(0,-15,19,25);
 line(g,[[35,10],[35,-5],[45,-15],[55,-5],[55,10],[35,10]],ink,1.7);line(g,[[35,-5],[45,-5],[45,-15]],ink,1.2);
 mark(g,85,-2,.55,ink);g.restore();
 const x=w-51,y=50;g.strokeStyle=pale;g.beginPath();g.arc(x,y,14,0,7);g.stroke();line(g,[[x-20,y],[x+20,y]],pale);line(g,[[x,y-20],[x,y+20]],pale);
 });}
function mesh(g,m,parent,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;if(parent)parent.add(o);return o;}
const boxGeom=new T.BoxGeometry();
function box(p,x,y,z,w,h,d,m){const o=mesh(boxGeom,m,p,x,y,z);o.scale.set(w,h,d);return o;}
function rounded(p,x,y,z,w,h,d,r,m,bevel=.012){
 const sh=new T.Shape(),a=-w/2,b=-d/2;
 sh.moveTo(a+r,b);sh.lineTo(-a-r,b);sh.quadraticCurveTo(-a,b,-a,b+r);sh.lineTo(-a,-b-r);sh.quadraticCurveTo(-a,-b,-a-r,-b);sh.lineTo(a+r,-b);sh.quadraticCurveTo(a,-b,a,-b-r);sh.lineTo(a,b+r);sh.quadraticCurveTo(a,b,a+r,b);
 const g=new T.ExtrudeGeometry(sh,{depth:h,bevelEnabled:bevel>0,bevelSegments:2,bevelSize:bevel,bevelThickness:bevel,curveSegments:5});g.rotateX(-Math.PI/2);
 const pos=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/w+.5,.5-pos.getZ(i)/d);
 return mesh(g,m,p,x,y,z);
}
function rod(p,a,b,r1,r2,m,n=10){const v=V(...a),u=V(...b),axis=u.clone().sub(v);
 const o=mesh(new T.CylinderGeometry(r2,r1,axis.length(),n),m,p);o.position.copy(v.addScaledVector(axis,.5));o.quaternion.setFromUnitVectors(V(0,1,0),axis.normalize());return o;}
function ell(p,x,y,z,a,b,c,m){const o=mesh(ell.geo||(ell.geo=new T.SphereGeometry(1,14,9)),m,p,x,y,z);o.scale.set(a,b,c);return o;}
function group(p){const g=new T.Group();if(p)p.add(g);return g;}
function tube(p,points,r,m){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>V(...a))),Math.max(8,points.length*4),r,7,false),m,p);}
function batch(parent){
 parent.updateWorldMatrix(true,true);const inv=parent.matrixWorld.clone().invert(),sets=new Map(),remove=[];
 parent.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;
 const g=o.geometry,oMat=o.material,k=oMat.uuid+'-'+o.castShadow+'-'+o.receiveShadow;let b=sets.get(k);
 if(!b){b={m:oMat,p:[],n:[],u:[],c:[],ix:[],cast:o.castShadow,receive:o.receiveShadow};sets.set(k,b);}
 const transform=inv.clone().multiply(o.matrixWorld),norm=new T.Matrix3().getNormalMatrix(transform),off=b.p.length/3;
 const {position,normal,uv,color}=g.attributes,vec=V();
 for(let i=0;i<position.count;i++){vec.fromBufferAttribute(position,i).applyMatrix4(transform);b.p.push(vec.x,vec.y,vec.z);vec.fromBufferAttribute(normal,i).applyMatrix3(norm).normalize();b.n.push(vec.x,vec.y,vec.z);
 b.u.push(uv?uv.getX(i):0,uv?uv.getY(i):0);if(color)b.c.push(color.getX(i),color.getY(i),color.getZ(i));}
 if(g.index)for(let i=0;i<g.index.count;i++)b.ix.push(off+g.index.getX(i));else for(let i=0;i<position.count;i++)b.ix.push(off+i);
 remove.push(o);});remove.forEach(o=>o.removeFromParent());for(const b of sets.values()){const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.u,2));if(b.c.length)g.setAttribute('color',new T.Float32BufferAttribute(b.c,3));g.setIndex(b.ix);g.computeBoundingSphere();
 const o=mesh(g,b.m,parent);o.castShadow=b.cast;o.receiveShadow=b.receive;}
}
window.Atelier={T,V,rand,range,texture,mat,mesh,box,rounded,ell,group,rod,tube,batch,wood,paperFront,reverse,matPrint,mark,line};
})();
