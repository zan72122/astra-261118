(function(){
const {T,V,rand,range,texture,mat,mesh,box,ell,group,rod,tube,batch}=Atelier, ground=-4.43;
function garden(scene){
 const fixed=group(scene),fields=group(fixed),plants=group(fixed);
 const lawn=texture(256,256,(g,w,h)=>{g.fillStyle='#b0be83';g.fillRect(0,0,w,h);
 for(let i=0;i<8000;i++){g.strokeStyle=i%2?'rgba(67,99,68,.12)':'rgba(243,230,163,.16)';g.beginPath();const x=rand()*w,y=rand()*h;g.moveTo(x,y);g.lineTo(x+2,y-4);g.stroke();}},true);lawn.repeat.set(32,22);
 box(fields,0,ground-.21,-42,132,.40,103,mat(0xffffff,.93,{map:lawn}));
 const grassM=mat(0x90ac76),grassL=mat(0xb7c489),sand=mat(0xd7c7a8),soil=mat(0xa69c7d),ivory=mat(0xf2e9d2),pine=mat(0xb59b78),bark=mat(0x827b5a),steel=mat(0x829da0,.39,{metalness:.25});
 // A gravel footpath winds away from the window through three open meadows.
 function ribbon(points,width,m,y){const path=new T.CatmullRomCurve3(points.map(([x,z])=>V(x,y,z))),p=[],idx=[];
 for(let i=0;i<=90;i++){const a=path.getPoint(i/90),v=path.getTangent(i/90),n=V(v.z,0,-v.x).normalize().multiplyScalar(width*(.95+.05*Math.sin(i*.18)));
 p.push(a.x+n.x,y,a.z+n.z,a.x-n.x,y,a.z-n.z);if(i){let j=i*2;idx.push(j-2,j,j-1,j-1,j,j+1);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();m.side=T.DoubleSide;mesh(g,m,fields);}
 ribbon([[-18,2],[-9,-6],[-1,-9],[4,-16],[7,-24],[2,-33],[-1,-41],[1,-54],[-6,-70]],1.18,sand,ground+.012);
 for(const [x,z,w,h] of [[0,-55,7,7],[-13,-63,8,6],[11,-50,7,7]])ell(fields,x,ground-.11,z,w,.15,h,sand);
 const hedge=mat(0x769477),leafColors=[0x80a179,0x90ae7c,0x759777,0xa0b787,0x96ac74,0xa7ba82].map(c=>mat(c,.89));
 const cloudM=mat(0xf9fbef,.99,{emissive:0xd3e5e5,emissiveIntensity:.25});
 for(let i=0;i<16;i++){const x=range(-95,95),y=range(6,15),z=range(-91,-75);
 for(let j=0;j<4;j++)ell(fields,x+j*2.2,y+range(-.4,.5),z,range(2.8,5),range(1.2,2.3),2,cloudM);}
 for(let i=0;i<15;i++){const c=[0x94b6ac,0xacc8bb,0xa6bda7][i%3];
 ell(fields,-80+i*12,-8-range(0,2),-73-range(1,10),range(10,22),range(6,12),range(5,10),mat(c));}
 function fence(x,z,X,Z,count,height){const dx=X-x,dz=Z-z;
 for(let i=0;i<=count;i++){const a=x+dx*i/count,b=z+dz*i/count;
 const post=box(fields,a,ground+height*.48,b,.25,height*.96,.16,ivory);
 post.rotation.y=-Math.atan2(dz,dx);const cap=mesh(new T.ConeGeometry(.2,.28,4),ivory,fields,a,ground+height+.06,b);cap.rotation.y=post.rotation.y+Math.PI/4;
 }for(const y of [.32,.71])rod(fields,[x,ground+height*y,z],[X,ground+height*y,Z],.10,.10,ivory,4);}
 fence(-20,-8,-5.8,-11,19,1.7);fence(2.7,-11,18,-9,19,1.7);fence(-24,-37,-9,-36,16,1.4);fence(9,-42,21,-41,15,1.55);
 const floral=[0xf2d48c,0xefeaCE,0xe0ad99,0xbeb7ce].map(c=>mat(c,.82));
 // Clustered blossoms and separate leaves are instanced geometry.
 const instances=new Map(),dummy=new T.Object3D(),leafGeo=new T.IcosahedronGeometry(1,0),flowerGeo=new T.IcosahedronGeometry(1,0);
 function instance(g,m,x,y,z,a,b,c,rx,ry,rz){const key=m.uuid+g.uuid;if(!instances.has(key))instances.set(key,{g,m,poses:[]});
 dummy.position.set(x,y,z);dummy.scale.set(a,b,c);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();instances.get(key).poses.push(dummy.matrix.clone());}
 function shrub(x,z,r){for(let j=0;j<7;j++){const a=range(0,6.29),d=range(0,r);ell(plants,x+Math.cos(a)*d,ground+r*.34,z+Math.sin(a)*d,r*.75,range(.4,.8)*r,r*.63,leafColors[j%6]);}}
 function bed(x,z,rad,count){for(let j=0;j<count;j++){const a=range(0,6.29),d=Math.sqrt(rand())*rad,xx=x+Math.cos(a)*d,zz=z+Math.sin(a)*d*.60,h=range(.18,.50);
 instance(leafGeo,grassM,xx,ground+h*.53,zz,.032,h*.64,.035,.2,0,.15);
 instance(leafGeo,grassL,xx+.04,ground+h*.42,zz,.05,.16,.036,.4,0,-.72);
 const m=floral[j%4];for(let k=0;k<5;k++)instance(flowerGeo,m,xx+Math.cos(k*1.257)*.065,ground+h,zz+Math.sin(k*1.257)*.065,.07,.034,.058,.1,k,0);
 instance(flowerGeo,floral[0],xx,ground+h+.024,zz,.045,.034,.048,0,0,0);}}
 for(const [x,z,r] of [[-6,-8,2],[6,-9,2.6],[-11,-22,2.1],[9,-33,2.3],[-4,-48,1.8],[-11,-57,2],[14,-48,2.4],[6,-43,1.7]]){shrub(x,z,r*.62);bed(x+1.1,z+1.1,r,42);}
 // Uneven crown surfaces catch small pools of sunlight between the leaves.
 const crowns=leafColors.map((m,i)=>{
   const geo=new T.SphereGeometry(1,18,12),p=geo.attributes.position,colors=[];
   for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j);
     const n=.073*Math.sin(x*6.7+i)*Math.cos(z*5.3+y*2)+.043*Math.cos(y*9.4+x*5.8-i);
     p.setXYZ(j,x*(1+n),y*(1+n),z*(1+n));
     const light=.90+.065*y+n*.32;colors.push(light,light+.014,light-.006);}
   geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
   const material=m.clone();material.vertexColors=true;return {geo,material};
 });
 const limbs=[];
 function tree(x,z,h,spread,bright){
   const y=ground,lean=range(-.5,.5),m=bright?mat(0xc1ba99):bark;
   rod(plants,[x,y,z],[x+lean,y+h*.67,z-.2],h*.055,h*.022,m);
   for(let j=0;j<7;j++){const ang=j*2.399+rand()*.3,rr=spread*(j===6?.18:range(.44,.83));
     const px=x+Math.cos(ang)*rr,pz=z+Math.sin(ang)*rr,py=y+h*(j===6?.92:range(.58,.84));
     rod(plants,[x+lean*.65,y+h*.40,z],[px,py,pz],h*.020,h*.007,m,7);
     const balls=3;for(let k=0;k<balls;k++){const bx=px+range(-.32,.32)*spread,bz=pz+range(-.3,.3)*spread,by=py+range(-.25,.38)*spread,r=spread*range(.40,.60);
       const cr=crowns[(k+j)%6],canopy=mesh(cr.geo,cr.material,plants,bx,by,bz);canopy.scale.set(r,r*.83,r*.91);canopy.rotation.y=ang;
       for(let n=0;n<50;n++){const u=range(-1,1),a=range(0,6.29),f=Math.sqrt(1-u*u),sz=range(.10,.26);
         instance(leafGeo,leafColors[(j+n)%6],bx+r*f*Math.cos(a),by+r*.78*u,bz+r*.9*f*Math.sin(a),sz*1.5,sz*.58,sz,range(-1,1),a,range(-.7,.7));}
     }
   }
 }
 tree(-8,-13,7.6,3.25,true);tree(8.7,-16,8.9,3.9,false);tree(-5.5,-24,7.1,3.2,true);
 tree(7.1,-24.9,7.2,2.7,false);tree(13,-34,9,3.5,false);tree(-19,-37,10,4.8,false);tree(20,-57,9,5,false);tree(-24,-60,11,5.2,true);
 for(let i=0;i<13;i++)shrub(-30+i*5.1,-60-range(3,7),range(1.3,2.5));
 // Lightweight twigs flex independently beside the flight corridor.
 for(let i=0;i<16;i++){const gr=group(scene),a=i<8?-1:1;gr.position.set(a*(3.9+(i%4)*.54),.95+(i%3)*.34,-22-(i%8)*.70);
 rod(plants,[a<0?-5.5:7.1,-.55,a<0?-24:-24.9],gr.position.toArray(),.115,.045,bark,7);
 rod(gr,[0,0,0],[-a*1.45,.36,-.26],.044,.009,bark,6);
 for(let j=1;j<6;j++){const o=ell(gr,-a*j*.25,j*.062,-.05*j,.21,.041,.11,leafColors[(i+j)%6]);o.rotation.z=a*.4;o.rotation.y=j*.96;}
 batch(gr);limbs.push(gr);}
 function cottage(x,z){box(fields,x,ground+1.85,z,6.2,3.7,4.5,mat(0xe5d9b9));const roof=mat(0x809795);
 for(const s of [-1,1]){const o=box(fields,x+s*1.61,ground+4.45,z,3.82,.2,5.12,roof);o.rotation.z=-s*.46;}
 for(const s of [-1,1]){box(fields,x+s*1.64,ground+2,z+2.27,1.35,1.65,.12,ivory);box(fields,x+s*1.64,ground+2,z+2.35,1.12,1.4,.08,steel);box(fields,x+s*1.64,ground+2,z+2.42,.065,1.4,.04,ivory);}
 box(fields,x+2.0,ground+5.05,z-.6,.7,1.8,.68,mat(0xb7947a));}
 cottage(-15,-33);cottage(22,-48);
 const linenCols=['#b9cbd2','#edd7a9','#ece9dd'];
 function fabric(k){return texture(192,256,(g,w,h)=>{g.fillStyle=linenCols[k];g.fillRect(0,0,w,h);
  if(k===0){for(let y=14;y<h;y+=24){g.fillStyle='#e8eddf';g.fillRect(0,y,w,5);g.fillRect(0,y+8,w,2);}}
  if(k===1){g.fillStyle='rgba(242,240,219,.53)';for(let x=0;x<w;x+=31)g.fillRect(x,0,12,h);for(let y=0;y<h;y+=31)g.fillRect(0,y,w,12);}
  if(k===2){g.fillStyle='#94afb4';for(const y of [220,227])g.fillRect(0,y,w,3);}
  g.strokeStyle='#ffffff88';g.strokeRect(4,4,w-8,h-8);},false);}
 const cloths=[],clothX=[-4.45,-2.48,2.9],clothW=[1.59,1.72,1.84],clothH=[1.85,1.43,1.98];
 const ropeY=x=>2.32-.41*(1-(x/6.7)**2);
 const deps=x=>-12.8+.7*x/6.7;
 for(const x of [-6.7,6.7]){rod(fields,[x,ground,deps(x)],[x,2.6,deps(x)],.10,.09,pine);ell(fields,x,2.62,deps(x),.13,.13,.13,ivory);}
 tube(fields,Array.from({length:9},(_,i)=>{const x=-6.7+13.4*i/8;return [x,ropeY(x),deps(x)];}),.023,ivory);
 for(let i=0;i<3;i++){
 const x=clothX[i],g=new T.PlaneGeometry(clothW[i],clothH[i],16,12),m=mat(0xffffff,.93,{map:fabric(i),side:T.DoubleSide});
 const o=mesh(g,m,scene,x,ropeY(x)-clothH[i]/2,deps(x));cloths.push({g,o,base:g.attributes.position.array.slice()});
 for(const s of [-1,1]){const xx=x+s*clothW[i]*.46,clip=box(fields,xx,ropeY(xx),deps(xx)+.018,.087,.25,.088,pine);clip.rotation.z=s*.13;}
 }
 // Pond basin, sluice and paddle wheel, on the second route.
 const waterMat=mat(0x89b4b1,.15,{metalness:.3,envMapIntensity:.88,side:T.DoubleSide}),pond=group(scene);
 pond.position.set(-8.4,ground+.058,-28);const pondG=new T.PlaneGeometry(10,15,9,13);pondG.rotateX(-Math.PI/2);
 const wat=mesh(pondG,waterMat,pond);wat.castShadow=false;
 for(let i=0;i<48;i++){const side=i%4,t=range(-.50,.50),x=side<2?(side===0?-5:5):t*10,z=side<2?t*15:(side===2?-7.5:7.5);
 ell(fields,-8.4+x,ground+.12,-28+z,range(.3,.75),range(.16,.33),range(.28,.72),i%3===0?grassM:soil);}
 const slats=mat(0xa47d57),wheel=group(scene),wx=-4.9,wz=-29.6;wheel.position.set(wx,ground+1.6,wz);
 for(const x of [-.36,.36]){
 const ring=mesh(new T.TorusGeometry(1.56,.11,7,48),slats,wheel,x);ring.rotation.y=Math.PI/2;
 for(let j=0;j<8;j++){const a=j*Math.PI/4;rod(wheel,[x,0,0],[x,Math.cos(a)*1.56,Math.sin(a)*1.56],.069,.088,slats,7);}
 }for(let j=0;j<10;j++){const a=j*Math.PI/5,o=box(wheel,0,Math.cos(a)*1.59,Math.sin(a)*1.59,.99,.20,.49,pine);o.rotation.x=a;}
 rod(wheel,[-.82,0,0],[.82,0,0],.17,.17,steel);batch(wheel);
 box(fields,wx-.87,ground+1,wz,.34,2.3,.55,pine);box(fields,wx+.87,ground+1,wz,.34,2.3,.55,pine);
 const gate=group(scene);gate.position.set(wx,ground+1.66,wz-2.2);
 for(let i=0;i<3;i++)box(gate,0,i*.25,0,1.9,.23,.17,slats);box(gate,0,1.01,0,.13,.9,.13,steel);
 ell(gate,0,1.5,0,.35,.14,.19,mat(0xd39764,.37));batch(gate);
 for(const x of [-1,1])box(fields,wx+x,ground+1.63,wz-2.2,.16,3.26,.25,pine);
 const fallingWater=new T.InstancedMesh(new T.SphereGeometry(1,7,5),mat(0xbad7cc,.09,{metalness:.38}),22);
 fallingWater.frustumCulled=false;scene.add(fallingWater);
 const channel=mat(0xac997c);
 for(const x of [-.54,.54])box(fields,wx+x,ground+2.82,wz-2,.12,.42,2.56,channel);
 box(fields,wx,ground+2.66,wz-2,1.14,.15,2.6,slats);
 // Curled pinwheel vanes: triangular sheets forming a shallow cup.
 const wheels=[],rotorPos=[[3.7,-26],[6.3,-29.0],[8.8,-30.4],[10,-33.4],[12.6,-32.1]];
 const colors=[0x9abcd0,0xdfb38f,0xd7ca91,0x9abaa6,0xccaaa8];
 rotorPos.forEach(([x,z],i)=>{const y=ground+3.9+(i%3)*.45,r=1.03;
 rod(fields,[x,ground,z],[x,y,z],.081,.052,pine);const w=group(scene);w.position.set(x,y,z+.11);
 for(let j=0;j<5;j++){const a=j*Math.PI*.4,g=new T.BufferGeometry(),p=[0,0,0,r*.22,r*.48,.22,r*.7,r*.80,0,r*.72,r*.2,.12];
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,.25,.5,1,1,1,0],2));
 g.setIndex([0,1,3,1,2,3]);g.computeVertexNormals();const o=mesh(g,mat(colors[(i+j)%5],.62,{side:T.DoubleSide}),w);o.rotation.z=a;}
 ell(w,0,0,.20,.15,.15,.11,ivory);batch(w);wheels.push(w);});
 const seedM=mat(0xfff9df,.91,{side:T.DoubleSide}),tuft=new T.BufferGeometry(),fibres=[];
 for(let j=0;j<12;j++){const a=j*2.399,r=.55+(j%3)*.16,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.40+j%4*.11;
   fibres.push(0,0,0,x-.045,h,z,x+.045,h,z);fibres.push(x*.76,h*.81,z*.76,x-.12,h+.14,z-.08,x+.11,h+.09,z+.09);}
 fibres.push(0,0,0,-.12,-.46,0,.12,-.46,0);tuft.setAttribute('position',new T.Float32BufferAttribute(fibres,3));tuft.computeVertexNormals();
 const seedMesh=new T.InstancedMesh(tuft,seedM,24);seedMesh.frustumCulled=false;scene.add(seedMesh);
 for(const [g,m] of [[fields,0],[plants,0]])batch(g);
 for(const b of instances.values()){
 const o=new T.InstancedMesh(b.g,b.m,b.poses.length);b.poses.forEach((m,i)=>o.setMatrixAt(i,m));o.castShadow=o.receiveShadow=true;scene.add(o);}
 function update(s){
 cloths.forEach(({g,base},i)=>{const pos=g.attributes.position;for(let j=0;j<pos.count;j++){
 const u=j%17/16,v=Math.floor(j/17)/12,ix=Math.min(3,Math.floor(u*4)),iz=Math.min(2,Math.floor(v*3)),fx=u*4-ix,fz=v*3-iz,o=i*20+iz*5+ix;
 const q=(1-fz)*((1-fx)*s.cloth[o].q+fx*s.cloth[o+1].q)+fz*((1-fx)*s.cloth[o+5].q+fx*s.cloth[o+6].q);
 pos.setXYZ(j,base[j*3]+q*.75,base[j*3+1]-.047*Math.sin(u*Math.PI)+q*1.4,base[j*3]*.104+(.06+v*.10)*Math.sin(u*18+i)+q*8);}
 pos.needsUpdate=true;g.computeVertexNormals();});
 limbs.forEach((g,i)=>{g.rotation.z=s.branch[i].q;g.rotation.x=s.branch[(i+1)%16].q*.44;});
 for(let i=0;i<140;i++)pondG.attributes.position.setY(i,s.water[i].q*8);pondG.attributes.position.needsUpdate=true;pondG.computeVertexNormals();
 s.drops.forEach((a,i)=>{dummy.position.set(wx+((i%5)-2)*.14,ground+2.75+a.y*8,wz-.72+a.x*8);
 const r=a.live?.022+.022*a.volume:0;dummy.scale.set(r,.03+(a.live?Math.abs(a.vy)*.10:-.03),r);dummy.rotation.set(-.16,0,0);dummy.updateMatrix();fallingWater.setMatrixAt(i,dummy.matrix);});
 fallingWater.instanceMatrix.needsUpdate=true;
 wheel.rotation.x=s.wheel;gate.position.y=ground+1.66+s.gate*.67;wheels.forEach((o,i)=>o.rotation.z=s.rotors[i].angle);
 s.seeds.forEach((a,i)=>{const j=i%5,xy=rotorPos[j];dummy.position.set(xy[0]+.45*Math.sin(i*7)+a.x*8,ground+3.8+(j%3)*.45+Math.cos(i*3)*.3+a.y*8,xy[1]+a.z*8+.4);
 const k=s.stage===2?.12:.0001;dummy.scale.set(k*1.3,k,k);dummy.rotation.set(i,a.x,i*3);dummy.updateMatrix();seedMesh.setMatrixAt(i,dummy.matrix);});seedMesh.instanceMatrix.needsUpdate=true;
 }
 return {update,gate,wheels,ground};
}
window.makeGarden=garden;
})();
