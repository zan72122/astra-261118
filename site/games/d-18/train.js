function buildTrain(k){
'use strict';
const {T,R,S,sim,V,vec,mat,wood,mesh,group,obj,box,sphere,bar,ball,rod,up}=k;
const gold=mat(0xe7ba56,.23,.7),nickel=mat(0xcfcec1,.19,.83),dark=mat(0x283a3a,.47,.54),rubber=mat(0x383e3b,.72,.12);
const red=mat(0xba3c2a,.28,.30),scarlet=mat(0xe45c3e,.28,.22),maroon=mat(0x853426,.34,.27),butter=mat(0xe4b442,.3,.30),paleGold=mat(0xf3d376,.38,.33),ivory=mat(0xffe7b4,.4,.27),ocean=mat(0x245f65,.3,.38);
const cushion=mat(0x8f5035,.53),piping=mat(0xc28954,.43),leather=mat(0xa55f3d,.51),floor=wood(0x775439);
const cars=[],targets=[],passengers=[],wheels=[],brakes=[],signalGlass=mat(0xe96b43,.21,.27,{emissive:0xe9662c,emissiveIntensity:.25});
function tube(parent,m,points,r,segments=18){
 const path=new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p));return mesh(new T.TubeGeometry(path,segments,r,7,false),m,parent);
}
function rounded(w,h,r){
 const sh=new T.Shape(),x=-w/2,y=-h/2;
 sh.moveTo(x+r,y);sh.lineTo(x+w-r,y);sh.quadraticCurveTo(x+w,y,x+w,y+r);sh.lineTo(x+w,y+h-r);sh.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 sh.lineTo(x+r,y+h);sh.quadraticCurveTo(x,y+h,x,y+h-r);sh.lineTo(x,y+r);sh.quadraticCurveTo(x,y,x+r,y);return sh;
}
function plate(parent,m,shape,depth,x,y,z,bevel=.018){
 const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:8,steps:1});const o=mesh(geo,m,parent);o.position.set(x,y,z);return o;
}
function axial(parent,m,x,y,z,r,h,axis='z'){
 const o=obj(rod,m,V(x,y,z),V(r,h,r),parent);if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;return o;
}
const blade=(parent,m,coords,z,depth=.018)=>{const s=new T.Shape();coords.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return plate(parent,m,s,depth,0,0,z,.009);};
function emblem(parent,x,y,z,scale=1){
 const g=group(parent);g.position.set(x,y,z);g.scale.setScalar(scale);
 for(const sign of [-1,1])for(let i=0;i<3;i++){
 const w=.85-i*.125,h=.12-i*.105;blade(g,gold,[[.14*sign,h],[w*sign,h+.115],[(w-.075)*sign,h+.025],[.15*sign,h-.055]],0);
 }
 axial(g,gold,0,0,.033,.27,.066);axial(g,ocean,0,0,.078,.218,.036);
 const rim=mesh(new T.TorusGeometry(.227,.014,8,44),ivory,g);rim.position.z=.101;
 const sun=new T.Shape();sun.absarc(0,-.011,.106,0,Math.PI,false);sun.closePath();plate(g,paleGold,sun,.008,0,0,.105,.005);
 for(let i=0;i<5;i++){const a=.3+i*.64;bar(g,paleGold,V(Math.cos(a)*.134,Math.sin(a)*.134-.013,.121),V(Math.cos(a)*.168,Math.sin(a)*.168-.013,.121),.008);}
 for(const y0 of [-.038,-.085])tube(g,ivory,[[-.147,y0,.117],[-.080,y0+.009,.117],[.02,y0-.008,.117],[.143,y0+.007,.117]],.011,10);
}
function shell(parent,front){
 const N=72,rows=[[.81,.30],[.86,.34],[.955,.45],[.988,.54],[1,.67],[1.012,.77],[1.019,.85],[1.021,.87],[1.026,.905],[1.03,1.06],[1.029,1.16],[1.017,1.21],[.985,1.23],[.949,1.205],[.936,1.16],[.91,.59]],
   palette=front?[dark,gold,butter,paleGold,red,ivory,leather]:[dark,gold,red,scarlet,maroon,ivory,leather],
   bands=[0,4,4,2,2,5,1,5,2,3,1,1,5,6,6];
 const p=[],nidx=[],uv=[],g=new T.BufferGeometry();
 for(let j=0;j<rows.length;j++){const [sc,h]=rows[j];
 for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
 const x=Math.sign(c)*Math.pow(Math.abs(c),.44)*1.29,z=Math.sign(s)*Math.pow(Math.abs(s),.47)*1.52;
 const scooped=Math.exp(-Math.pow((z+.19)/.70,2))*.17*Math.pow(Math.abs(x)/1.29,3);
 const nose=(front?.13:.06)*Math.pow(Math.max(0,-z/1.52),3);
 p.push(sc*x,h+(nose-scooped)*R.smooth((h-.38)/.7),sc*z);uv.push(i/N,j/(rows.length-1));}
 }
 for(let j=0;j<rows.length-1;j++){g.addGroup(nidx.length,N*6,bands[j]);for(let i=0;i<N;i++){const a=j*(N+1)+i;nidx.push(a,a+N+1,a+1,a+1,a+N+1,a+N+2);}}
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(nidx);g.computeVertexNormals();mesh(g,palette,parent);
 box(parent,floor,0,.596,0,2.26,.14,2.70);
 for(let i=0;i<10;i++)box(parent,leather,-1.04+i*.231,.673,0,.008,.008,2.58);
}
function carBody(i){
 const root=group(),body=group(root);cars.push({root,body});targets.push(body);const front=i===1;
 shell(body,front);
 const rearZ=1.56;
 emblem(body,0,.92,rearZ,front?.65:.9);
 for(const side of [-1,1]){
 for(const z of [-.94,.94]){
 const x=side*.89;axial(root,rubber,x,.185,z,.205,.215,'x');
 axial(root,nickel,x+side*.118,.185,z,.218,.048,'x');const hub=group(root);hub.position.set(x+side*.154,.185,z);
 axial(hub,dark,0,0,0,.15,.061,'x');axial(hub,gold,side*.041,0,0,.074,.045,'x');
 for(let j=0;j<5;j++){const a=j*1.2566;axial(hub,nickel,side*.035,.092*Math.sin(a),.092*Math.cos(a),.014,.01,'x');}wheels.push(hub);
 bar(root,dark,V(x,.19,z),V(x,.48,z-side*.18),.11,.095);
 }
 tube(body,nickel,[[side*1.3,.52,-.85],[side*1.39,.52,-.73],[side*1.4,.52,.66],[side*1.3,.52,.86]],.041);
 tube(body,gold,[[side*1.23,1.12,-.66],[side*1.26,1.32,-.60],[side*1.26,1.32,-.04],[side*1.24,1.13,.05]],.037);
 for(const z of [-1.07,-.65,.07,.69,1.06])sphere(body,nickel,side*1.318,.75,z,.023,.027,.026);
 for(const z of [-1.09,1.08]){axial(body,gold,side*.99,.73,z>0?1.49:-1.49,.103,.07);
 sphere(body,z>0?scarlet:ivory,side*.99,.737,z>0?1.542:-1.541,.078,.078,.045);}
 }
 const lever=group(body);lever.position.set(1.24,.69,.78);brakes.push(lever);
 axial(lever,gold,0,0,0,.12,.095,'x');
 tube(lever,nickel,[[.028,0,0],[.074,.13,.04],[.082,.32,.095],[.067,.40,.115]],.034,12);
 sphere(lever,signalGlass,.067,.421,.119,.085,.103,.085);
 bar(root,dark,V(0,.34,-1.62),V(0,.34,1.64),.13,.15);
 // Upholstered backs have a rolled seam and stitched vertical channels.
 const count=front?1:2;
 for(let j=0;j<count;j++){const x=front?0:j===0?-.595:.595,w=front?1.48:1.065,z=.48;
 sphere(body,leather,x,.78,z-.2,w*.55,.18,.55);
 const back=group(body);back.position.set(x,.98,z+.25);back.rotation.x=.13;
 const backPlate=plate(back,cushion,rounded(w,.64,.16),.17,0,.20,0,.056);
 plate(back,leather,rounded(w-.105,.53,.128),.025,0,.203,.204,.024);
 for(let n=1;n<6;n++){const xx=(n/6-.5)*w*.82;tube(back,piping,[[xx-.005,-.002,.252],[xx,.2,.255],[xx,.4,.25]],.0065,5);}
 for(const sign of [-1,1])axial(back,gold,sign*(w*.5-.105),.006,.238,.030,.026);
 }
 tube(body,nickel,[[-1.08,.83,-.32],[-1.055,1.28,-.58],[-.94,1.35,-.66],[0,1.35,-.68],[.94,1.35,-.66],[1.055,1.28,-.58],[1.08,.83,-.32]],.049,34);
 tube(body,dark,[[-.86,1.35,-.666],[-.35,1.35,-.68],[.35,1.35,-.68],[.86,1.35,-.666]],.074,12);
 if(front){const hood=plate(body,butter,rounded(1.85,.32,.14),.34,0,.975,-1.53,.063);hood.rotation.x=-.09;
 const badge=group(body);badge.position.set(0,1.12,-1.58);badge.rotation.y=Math.PI;emblem(badge,0,0,0,.54);}
 return body;
}
const skin=[mat(0xdca77e,.64),mat(0xc99773,.66),mat(0xe6b38c,.66)],hair=[mat(0x523425,.49),mat(0x3a302a,.6),mat(0x59402c,.51)];
const strands=[mat(0x65452f,.54),mat(0x4b3e32,.63),mat(0x725036,.56)];
const tops=[mat(0xf1d9b0,.88),mat(0x427681,.84),mat(0xf0bc4f,.76)],denim=mat(0x4e6775,.9),scarf=mat(0xb94b3b,.80),eyes=mat(0x40382d,.74);
function organic(parent,m,sections){
 const p=[],idx=[],uv=[],N=36;
 sections.forEach(([y,rx,rz,z=0],j)=>{for(let i=0;i<=N;i++){const a=i/N*6.2831853;p.push(Math.cos(a)*rx,y,z+Math.sin(a)*rz);uv.push(i/N,j/(sections.length-1));}});
 for(let j=0;j<sections.length-1;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i;idx.push(a,a+N+1,a+1,a+1,a+N+1,a+N+2);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(g,m,parent);
}
function limb(parent,m,a,b,rx,rz){const d=b.clone().sub(a),o=sphere(parent,m,0,0,0,rx,d.length()*.62,rz);o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(up,d.normalize());return o;}
function rider(body,id,x){
 const g=group(body),kid=id===2,dad=id===1;g.position.set(x,kid?.98:.84,kid?.12:.15);g.scale.setScalar(kid?.84:dad?1.04:.97);
 const shirt=tops[id],h=hair[id],skinM=skin[id];
 organic(g,shirt,[[0,.26,.19],[.1,.32,.205],[.30,.32,.215],[.52,.39,.228],[.67,.375,.215],[.74,.28,.18],[.77,.15,.127]]);
 sphere(g,denim,0,.04,-.02,.34,.17,.25);
 for(let side of [-1,1]){const hip=V(side*.17,.02,-.06),knee=V(side*.20,.055,-.54);limb(g,denim,hip,knee,.135,.14);limb(g,denim,knee,V(side*.2,-.30,-.59),.12,.12);}
 sphere(g,skinM,0,.78,-.01,.117,.14,.112);
 const head=group(g);head.position.set(0,.972,-.01);head.rotation.y=dad?-.14:id===0?.09:-.065;
 organic(head,skinM,[[-.202,.05,.076,-.031],[-.175,.119,.13,-.024],[-.10,.165,.166,-.012],[.035,.191,.18],[.15,.184,.174],[.228,.137,.14],[.26,.057,.06]]);
 for(const side of [-1,1]){
 sphere(head,skinM,side*.18,-.008,-.008,.042,.068,.041);
 sphere(head,eyes,side*.077,.026,-.169,.016,.010,.008);
 if(!dad)sphere(head,gold,side*.196,-.063,.004,.014,.016,.013);
 }
 sphere(head,skinM,0,-.008,-.187,.034,.044,.044);
 // A swept hairline exposes the forehead; the nape is cut separately from the face.
 const N=40,M=15,pp=[],ix=[];
 for(let j=0;j<=M;j++)for(let i=0;i<=N;i++){
 const a=i/N*Math.PI*2,back=(Math.sin(a)+1)/2,limit=1.28+back*(dad?.86:1.13)+.08*Math.sin(a*3+.6),b=(j/M)*limit;
 pp.push(.205*Math.sin(b)*Math.cos(a),.083+.22*Math.cos(b),.004+.192*Math.sin(b)*Math.sin(a));
 if(i<N&&j<M){const idx=j*(N+1)+i;ix.push(idx,idx+1,idx+N+1,idx+1,idx+N+2,idx+N+1);}
 }
 const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(pp,3));hg.setIndex(ix);hg.computeVertexNormals();h.side=T.DoubleSide;mesh(hg,h,head);
 for(let j=0;j<12;j++){
 const a=.03+j*.276,path=[];
 for(let l=0;l<8;l++){
 const u=l/7,b=.40+u*(1.05+.7*Math.sin(a)),angle=a+.28*(1-u)+.055*Math.sin(u*3.14);
 path.push(V(.208*Math.sin(b)*Math.cos(angle),.083+.224*Math.cos(b),.004+.197*Math.sin(b)*Math.sin(angle)));
 }tube(head,strands[id],path,.0038,10);
 }
 if(id===0){
 sphere(head,h,0,-.06,.18,.135,.133,.126);sphere(head,strands[id],0,-.082,.273,.074,.086,.038);
 for(let j=0;j<6;j++){const a=j*.976;tube(head,h,[[Math.cos(a)*.12,-.043+Math.sin(a)*.08,.214],[Math.cos(a+.5)*.072,-.06+Math.sin(a+.5)*.08,.284],[0,-.063,.302]],.006,8);}
 const neck=mesh(new T.TorusGeometry(.137,.032,9,40),scarf,g);neck.rotation.x=Math.PI/2;neck.position.y=.756;
 tube(g,scarf,[[-.04,.746,.13],[-.10,.66,.217],[-.16,.56,.222]],.034);
 }else if(kid){
 for(const sign of [-1,1]){
 sphere(head,h,sign*.202,.055,.08,.121,.154,.116);
 sphere(head,strands[id],sign*.227,-.018,.106,.096,.104,.095);
 sphere(head,scarf,sign*.183,.137,.072,.065,.044,.068);
 sphere(head,scarf,sign*.20,.145,.12,.083,.04,.046).rotation.z=sign*.48;
 sphere(head,scarf,sign*.157,.164,.12,.043,.071,.037).rotation.z=sign*.42;
 }
 tube(g,ivory,[[-.28,.67,.150],[-.14,.70,.168],[0,.73,.145],[.14,.70,.168],[.28,.67,.15]],.022);
 }else{
 const collar=organic(g,mat(0x618b91,.85),[[.694,.24,.178],[.747,.156,.132],[.766,.143,.122]]);
 tube(g,tops[1],[[-.3,.607,.161],[0,.586,.229],[.32,.6,.16]],.011);
 }
 let waveArm;
 for(const side of [-1,1]){
 const arm=group(g);arm.position.set(side*.332,.62,-.008);
 const elbow=V(side*.096,-.286,-.150),hand=V(side*.04,-.31,-.614);
 limb(arm,shirt,V(0,0,0),elbow.clone().multiplyScalar(dad?.73:.88),.119,.13);
 limb(arm,skinM,elbow.clone().multiplyScalar(.65),elbow,.093,.092);
 limb(arm,skinM,elbow,hand,.077,.078);
 sphere(arm,skinM,hand.x,hand.y,hand.z,.089,.071,.093);
 sphere(arm,skinM,hand.x-side*.061,hand.y+.018,hand.z-.009,.032,.044,.054);
 if(side===(dad?1:-1))waveArm=arm;
 }
 passengers.push({g,head,arm:waveArm,id});
}
const rear=carBody(0),front=carBody(1);rider(rear,0,-.56);rider(rear,1,.56);rider(front,2,0);
const coupling=mesh(new T.CylinderGeometry(.069,.069,1,10),nickel);
// Bake the rigid trim of each articulated part into material batches. The suspension,
 // brake handles, wrists, heads and wheel hubs retain their own transforms.
const articulated=new Set([...cars.flatMap(c=>[c.body,c.root]),...wheels,...brakes,
 ...passengers.flatMap(p=>[p.g,p.head,p.arm])]);
function batchTrim(part){
 part.updateWorldMatrix(true,true);const inverse=part.matrixWorld.clone().invert(),groups=new Map();
 function visit(o){if(articulated.has(o))return;
 if(o.isMesh&&!Array.isArray(o.material)){if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o);}
 o.children.forEach(visit);}
 part.children.forEach(visit);
 for(const [material,objects] of groups){
 if(objects.length<2)continue;
 const position=[],normal=[],uv=[],indices=[];
 for(const o of objects){const local=inverse.clone().multiply(o.matrixWorld),g=o.geometry.clone().applyMatrix4(local),start=position.length/3;
 const xyz=g.attributes.position,n=g.attributes.normal,tex=g.attributes.uv;
 for(let i=0;i<xyz.count;i++){position.push(xyz.getX(i),xyz.getY(i),xyz.getZ(i));normal.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(tex?tex.getX(i):0,tex?tex.getY(i):0);}
 if(g.index)for(let i=0;i<g.index.count;i++)indices.push(start+g.index.getX(i));else for(let i=0;i<xyz.count;i++)indices.push(start+i);
 g.dispose();o.removeFromParent();
 }
 const joined=new T.BufferGeometry();joined.setAttribute('position',new T.Float32BufferAttribute(position,3));joined.setAttribute('normal',new T.Float32BufferAttribute(normal,3));joined.setAttribute('uv',new T.Float32BufferAttribute(uv,2));joined.setIndex(indices);mesh(joined,material,part);
 }}
articulated.forEach(batchTrim);
function update(){
 const pos=[];
 cars.forEach((c,i)=>{
 const s=S.s+i*3.42,p=vec(sim.pos(s)),f=vec(sim.pos(s+.52)).sub(vec(sim.pos(s-.52))).normalize(),r=V(-f.z,0,f.x).normalize(),n=r.clone().cross(f).normalize();
 c.root.position.copy(p);c.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(r,n,f.clone().negate()));
 c.body.position.y=S.cars[i].heave;c.body.rotation.z=S.cars[i].roll;pos.push(p.clone().addScaledVector(f,i?-1.54:1.54).addScaledVector(n,.39));
 });
 const d=pos[1].clone().sub(pos[0]);coupling.position.copy(pos[0]).lerp(pos[1],.5);coupling.scale.y=d.length();coupling.quaternion.setFromUnitVectors(up,d.normalize());
 signalGlass.emissiveIntensity=.09+S.promptHeat*1.45;
 brakes.forEach((l,i)=>l.rotation.x=-.65*(1-S.brake)+S.cars[i].heave);
 wheels.forEach(w=>w.rotation.x=-S.travel/.198);
 passengers.forEach(({g,head,arm,id})=>{
 const a=S.wavers[id].a,turn=id===0?1:-1,car=S.cars[id===2?1:0];
 arm.rotation.z=a*turn;arm.rotation.x=-a*.58;
 head.rotation.z=car.roll*.35+S.flags[id][1].a*.012;head.rotation.y=(id===1?-.14:id===0?.09:-.065)+a*.44*turn-(id===2?.64:.17)*S.promptHeat;
 g.rotation.x=car.heave*.7;
 });
}
return {update,targets};
}
