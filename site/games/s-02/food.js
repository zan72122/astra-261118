'use strict';
const riceGrain=surfaceTexture(160,160,(i,j,u,v)=>{
 const f=noise(u*21,v*23)*.27+noise(u*54,v*55)*.27+hash(i,j)*.46;
 const k=105+f*139;return [k,k,k];
},false);
riceGrain.repeat.set(2.7,1.6);
const rice=mat(0xffffff,.78,0,{vertexColors:true,side:T.DoubleSide,bumpMap:riceGrain,bumpScale:.025});
rice.onBeforeCompile=shader=>{
 shader.vertexShader='attribute float dustLevel; varying float vDust;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDust=dustLevel;');
 shader.fragmentShader='varying float vDust;\n'+shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor*(0.31+0.84*smoothstep(0.20,0.45,vDust)+0.70*vDust),0.16,1.0);');
};
const outerRice=mat(0xf5e9d8,.68,0,{bumpMap:riceGrain,bumpScale:.024,side:T.DoubleSide});
const bean=mat(0xf1dfbe,.84,0,{bumpMap:riceGrain,bumpScale:.021,side:T.DoubleSide});
const berrySkin=mat(0xffffff,.29,0,{vertexColors:true,bumpMap:grain,bumpScale:.011,side:T.DoubleSide});
const fruitFlesh=mat(0xffffff,.32,0,{vertexColors:true,bumpMap:riceGrain,bumpScale:.012,side:T.DoubleSide});
const seedMat=mat(0xf1c17d,.43), fineSeedGeo=new T.SphereGeometry(1,8,7);
const berryR=u=>Math.pow(Math.max(.00001,Math.sin(PI*Math.pow(u,.72))),.66)*(1.04-.29*u);
const bunR=u=>Math.pow(Math.max(.00001,Math.sin(PI*u)),.56)*(1.075-.13*u);
function skinSurface(parent,m,rad,height,profile,portion=1,fruit=false,limit=1){
 const n=portion===1?80:48,h=32,p=[],ix=[],uv=[],cols=[];
 for(let j=0;j<=h;j++)for(let i=0;i<=n;i++){
 const u=j/h*limit,a=i/n*TAU*portion,r=rad*profile(u)*(1+.012*Math.cos(5*a+.6)*Math.sin(u*PI)+.008*Math.sin(3*a+u*4));
 p.push(r*Math.cos(a),height*u,-r*Math.sin(a));uv.push(i/n,u);
 if(fruit){const c=new T.Color().setRGB(.40+.19*(1-u)+.15*noise(i/9,j/7),.012+.014*(1-u),.017+.018*noise(i/8,j/7));cols.push(c.r,c.g,c.b);}
 if(i<n&&j<h){const k=j*(n+1)+i;ix.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
 }
 return mesh(parent,geom(p,ix,uv,fruit?cols:null),m);
}
function berrySeeds(g,rad,height,portion=1,from=0){
 const list=[];
 for(let j=1;j<13;j++){
 const u=(j+.32)/14;if(u<from)continue;
 const r=rad*berryR(u),count=Math.max(5,Math.round(30*berryR(u)));
 for(let i=0;i<count;i++){
 const a=(i+(j%2)*.48+.09*Math.sin(i*4.7+j))/count*TAU;
 if(a>TAU*portion)continue;list.push([a,u,r]);
 }}
 const inst=new T.InstancedMesh(fineSeedGeo,seedMat,list.length),d=new T.Object3D();
 list.forEach(([a,u,r],i)=>{
 d.position.set(Math.cos(a)*(r+.002),height*u+.004*Math.sin(i),-Math.sin(a)*(r+.002));
 const slope=rad*(berryR(u+.001)-berryR(u-.001))/.002/height;
 const normal=V(Math.cos(a),-slope,-Math.sin(a)).normalize();
 d.quaternion.setFromUnitVectors(V(0,0,1),normal);d.rotateZ(.11*Math.sin(i*.73));d.scale.set(rad*.023,height*.018,rad*.008);d.updateMatrix();inst.setMatrixAt(i,d.matrix);
 });g.add(inst);
}
function coatedBerry(){
 const g=group();skinSurface(g,berrySkin,.51,1.20,berryR,1,true);berrySeeds(g,.51,1.20,1,.65);
 const p=[],ix=[],uv=[],n=72,h=27;
 for(let j=0;j<=h;j++)for(let i=0;i<=n;i++){
 const a=i/n*TAU,u=j/h,top=.72+.032*Math.sin(3*a)+.024*Math.sin(5*a+1.5);
 const y=u*top,r=(.51*berryR(y)+.106*Math.pow(Math.sin(PI*u),.54)+.041*(1-u)+.009)*(1+.014*Math.sin(6*a+u*3));
 p.push(r*Math.cos(a),y*1.2,-r*Math.sin(a));uv.push(i/n,u);
 if(i<n&&j<h){const k=j*(n+1)+i;ix.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
 }mesh(g,geom(p,ix,uv),bean);return g;
}
const strawberry=coatedBerry();
function face(g,m,rad,height,base,profile,z,fruit){
 const p=[],ix=[],uv=[],cols=[],ny=fruit?66:26,nx=fruit?68:18;
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
 const u=j/ny,h=i/nx*2-1,r=rad*profile(u),x=r*h;
 const wob=fruit?.004*Math.sin(h*17+u*41)*Math.sin(u*PI):0;
 p.push(x,base+height*u,z+wob);uv.push(i/nx,u);
 if(fruit){
 const core=Math.exp(-Math.pow(Math.abs(h)*4.9/(1.05-u*.77),1.6))*clamp((.98-u)*3.3);
 const edge=clamp((Math.abs(h)-.84)*5);
 const vein=.5+.5*Math.cos((u*12+Math.abs(h)*4.7+noise(h*10,u*8)*.4)*PI);
 const fibre=Math.pow(vein,12)*.29*(1-Math.abs(h))+.2*noise(h*52,u*47);
 const c=new T.Color().setRGB(.51+.27*core+.16*fibre+.07*edge,.018+.39*core+.18*fibre+.06*edge,.024+.21*core+.105*fibre+.025*edge);
 cols.push(c.r,c.g,c.b);
 }
 if(i<nx&&j<ny){const k=j*(nx+1)+i;ix.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1);}
 }
 return mesh(g,geom(p,ix,uv,fruit?cols:null),m);
}
function cutHalf(){
 const g=group(),body=group(g),filling=group(g);
 skinSurface(body,outerRice,1.0,1.54,bunR,.5);
 face(body,outerRice,.998,1.54,0,bunR,.002,false);
 face(body,bean,.86,1.335,.089,bunR,.009,false);
 const fruit=face(filling,fruitFlesh,.652,1.19,.17,berryR,.024,true);
 const ref=fruit.geometry.attributes.position.array.slice();
 g.userData={fruit,ref,shape:-2};
 return g;
}
function cutShape(g,t){
 if(Math.abs(t-g.userData.shape)<.001)return;
 const {fruit,ref}=g.userData,attr=fruit.geometry.attributes.position,arr=attr.array;
 for(let k=0;k<arr.length;k+=3){const u=(ref[k+1]-.17)/1.19;
 const profile=KitchenModel.section(u,t*1.3),drop=berryR(clamp(u));
 arr[k]=ref[k]*profile.radius/(.652*drop);
 arr[k+1]=.19+profile.height;}
 attr.needsUpdate=true;fruit.geometry.computeVertexNormals();g.userData.shape=t;
}
const samples=[cutHalf(),cutHalf()];
samples.forEach((g,i)=>{
 goalPlate.add(g);const sc=layout.narrow?.64:.77;g.scale.setScalar(sc*(i?.87:1));
 g.position.set((i?.43:-.47)*sc/.75,.145,i?-.17:.22);g.rotation.set(-.15,i?.66:-.38,i?-.13:.095);cutShape(g,i?.4:.91);
});
const halves=[cutHalf(),cutHalf()];halves.forEach(g=>g.visible=false);
function contact(parent,rx,rz,opacity){
 const tex=bitmap(48,48,(x,y,u,v)=>{const k=255*Math.exp(-((u-.5)**2+(v-.5)**2)*15)*clamp((.5-Math.hypot(u-.5,v-.5))*7);return [k,k,k];},false);
 tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;
 const m=mat(0x493a26,1,0,{transparent:true,opacity,alphaMap:tex,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 const o=mesh(parent,new T.PlaneGeometry(2,2),m);o.scale.set(rx,rz,1);o.rotation.x=-PI/2;o.castShadow=false;return o;
}
const shadow=contact(scene,1.68,1.46,.30);
for (const g of [goalPlate,berryPlate]){const s=contact(scene,1.72,1.64,.29);s.position.set(g.position.x,.011,g.position.z);g.userData.shadow=s;}
const mound=group(), N=game.N,R=game.R;
const doughGeo=(()=>{
 const p=[],uv=[],ix=[],cols=[],dust=[];
 for(let j=0;j<=R+2;j++)for(let i=0;i<N;i++){
 const a=i/N*TAU,u=Math.min(1,j/R);
 p.push(Math.cos(a)*u,0,Math.sin(a)*u);uv.push(.5+u*.5*Math.cos(a),.5+u*.5*Math.sin(a));cols.push(1,1,1);dust.push(.2);
 if(j<R+2){const k=j*N+i,b=j*N+(i+1)%N;ix.push(k,b,k+N,b,b+N,k+N);}
 }
 const g=geom(p,ix,uv,cols);g.setAttribute('dustLevel',new T.Float32BufferAttribute(dust,1));g.boundingSphere=new T.Sphere(V(0,.45,0),4);return g;
})();
const dough=mesh(mound,doughGeo,rice);
const flecks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),chalk,260);
flecks.castShadow=false;flecks.receiveShadow=true;flecks.frustumCulled=false;mound.add(flecks);
const clumps=Array.from({length:flecks.count},()=>{
 const j=Math.min(R-1,Math.floor(Math.sqrt(random())*R)),i=Math.floor(random()*N);
 const a=random(),b=random()*(1-a);
 return {lo:j*N+i,hi:(j+1)*N+i,side:(j+1)*N+(i+1)%N,a,b,r:.004+.016*random()**3};
});
const crumb=new T.Object3D();
function dustOnDough(){
 const p=doughGeo.attributes.position.array;
 clumps.forEach(({lo,hi,side,a,b,r},i)=>{
  for(let k=0;k<3;k++)crumb.position.setComponent(k,p[lo*3+k]*(1-a-b)+p[hi*3+k]*a+p[side*3+k]*b);
  crumb.position.y+=.002;
  const sz=r*clamp(game.cells[hi].powder*3.5);
  crumb.scale.set(sz*1.21,sz*.47,sz);crumb.updateMatrix();flecks.setMatrixAt(i,crumb.matrix);
 });
 flecks.instanceMatrix.needsUpdate=true;
}
const dryColor=new T.Color(0xf7ecdd),wetColor=new T.Color(0xecd6c7),berryTint=new T.Color(0xd77670);
function updateDough(){
 const s=game.s, arr=doughGeo.attributes.position.array,col=doughGeo.attributes.color.array,ds=doughGeo.attributes.dustLevel.array;
 const count=game.cells.length;let i=0;
 for(let j=0;j<=R+2;j++)for(let n=0;n<N;n++,i++){
 const r=game.rims[n],c=game.cells[Math.min(i,count-N+n)],u=c.u,a=c.a,cs=Math.cos(a),sn=Math.sin(a);
 const fold=r.fold,irregular=(.047*Math.sin(3*a+.72)+.024*Math.cos(5*a+1.2)+.013*Math.sin(7*a))*(1-.55*fold);
 const skirt=Math.max(0,j-R),edge=1-.034*(skirt===2?2:0);
 let radius=(1.25+.46*s.flat+r.ear*u)*u*(1+irregular+.024*Math.cos(u*8+a*3))*Math.pow(s.mass,1/3);
 let x=radius*cs*1.05+c.strainX*.42,z=radius*sn*.94+c.strainZ*.42;
 const pulled=Math.hypot(r.dx,r.dz);
 if(pulled>.0001){x+=(r.dx/pulled-cs)*r.ear*u*u*.79;z+=(r.dz/pulled-sn)*r.ear*u*u*.79;}
 const ripple=(.035*Math.sin(4*a+u*8+.8)+.016*Math.sin(7*a-u*4))*u*Math.sin(PI*u);
 const ridge=.055*Math.exp(-Math.pow((u-.73-.06*Math.cos(a*3))/.14,2))*u;
 let y=(c.thick+ripple+ridge+.026*Math.sin(3*a+u*3)*u)*(1+.11*s.wobble)+.022;
 if(skirt===1)y*=.51;if(skirt===2)y=.012;
 const arch=PI*u,rr=Math.sin(arch)*(.99+.045*Math.cos(a*4)*u*(1-u))+.020*u;
 const seam=.061*Math.cos(8*a+u*4)*Math.pow(u,4);
 x=x*(1-fold)+rr*cs*fold+cs*.22*Math.sin(fold*PI)*u;
 z=z*(1-fold)+rr*sn*fold+sn*.22*Math.sin(fold*PI)*u;
 y=y*(1-fold)+fold*(game.H*(1-Math.cos(arch))/2+seam+.055*s.pinch*u)+Math.sin(fold*PI)*u*.85;
 if(skirt)y-=fold*.022*skirt;
 arr[3*i]=x*edge;arr[3*i+1]=y;arr[3*i+2]=z*edge;
 const wet=clamp((c.water-.24)*1.45*(1-ease(clamp((c.powder-.16)/.36))));
 const tint=fold*(.08+.31*Math.exp(-u*3.9))*(1-c.powder)*clamp((.6-c.thick)*2.5);
 const k=1+.018*u*Math.sin(a*5+u*15)-.021*u*(1-fold)+.012*Math.sin(u*22+a*2)*u;
 col[3*i]=((dryColor.r*(1-wet)+wetColor.r*wet)*(1-tint)+berryTint.r*tint)*k;
 col[3*i+1]=((dryColor.g*(1-wet)+wetColor.g*wet)*(1-tint)+berryTint.g*tint)*k;
 col[3*i+2]=((dryColor.b*(1-wet)+wetColor.b*wet)*(1-tint)+berryTint.b*tint)*k;
 ds[i]=c.powder;
 }
 for(const key of ['position','color','dustLevel'])doughGeo.attributes[key].needsUpdate=true;
 doughGeo.computeVertexNormals();
 // The centre vertices share a point, so share the normal there as well.
 const ns=doughGeo.attributes.normal;for(let n=0;n<N;n++)ns.setXYZ(n,0,1,0);
}
const stamp=group();
const stampedGrains=grains(stamp,250,()=>{const a=random()*TAU,r=.30+(.5-random())*.085;return [Math.cos(a)*r,.006+random()*.009,Math.sin(a)*r*.83,.008+random()*.022];},chalk);
const stampShadow=contact(stamp,.39,.33,.17);stampShadow.position.y=.004;
// Continuous tapered finger sections. Nails follow the top of the distal phalanx.
const skin=mat(0xe2ae91,.62,0,{bumpMap:grain,bumpScale:.009});
const nail=mat(0xecc4ae,.44),sleeve=mat(0x839c81,.94,0,{bumpMap:grain,bumpScale:.035});
const cuff=mat(0xe7dec1,.92,0,{bumpMap:grain,bumpScale:.02});
function tubeX(parent,m,sections){
 const p=[],uv=[],ix=[],sides=20;
 for(let j=0;j<sections.length;j++){
 const [x,y,z,ry,rz]=sections[j];
 for(let i=0;i<=sides;i++){const a=i/sides*TAU;
 p.push(x,y+ry*Math.cos(a),z+rz*Math.sin(a));uv.push(j/(sections.length-1),i/sides);
 if(i<sides&&j<sections.length-1){const k=j*(sides+1)+i;ix.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
 }}const o=mesh(parent,geom(p,ix,uv),m);m.side=T.DoubleSide;return o;
}
function hand(){
 const g=group();
 tubeX(g,skin,[[.72,.23,.18,.046,.24],[.83,.249,.17,.146,.365],[1.04,.249,.16,.192,.418],[1.36,.234,.17,.203,.41],[1.61,.201,.157,.17,.323],[1.82,.18,.133,.157,.27],[2.18,.164,.122,.203,.287],[2.5,.14,.1,.23,.31]]);
 const fingers=[[0,.0,-.103,.91,.108],[.22,.095,.085,.94,.12],[.37,.107,.303,.99,.111],[.57,.115,.50,1.10,.092]];
 for(const [x,y,z,end,r] of fingers){
 const len=end-x;
 tubeX(g,skin,[[x,y,z,.014,.026],[x+.035,y+.015,z,.068,r*.73],[x+.104,y+.027,z,.086,r],[x+.21*len,y+.041,z,.083,r*1.01],[x+.39*len,y+.113,z-.013,.093,r*1.04],[x+.50*len,y+.127,z-.024,.098,r*1.08],[x+.68*len,y+.168,z-.027,.104,r*1.0],[end,y+.226,z-.044,.113,r*1.11]]);
 const nn=ball(g,nail,x+.112,y+.101,z-.002,.092,.012,r*.68);nn.rotation.z=.21;
 }
 tubeX(g,skin,[[.46,.013,.682,.025,.03],[.50,.025,.676,.08,.09],[.63,.049,.67,.108,.117],[.82,.072,.613,.117,.138],[1.00,.103,.535,.14,.154],[1.21,.135,.426,.163,.159],[1.40,.148,.36,.12,.1]]);
 const thumbNail=ball(g,nail,.564,.099,.711,.084,.015,.071);thumbNail.rotation.x=.48;
 tubeX(g,sleeve,[[1.94,.16,.12,.244,.33],[2.03,.16,.12,.266,.338],[2.13,.16,.12,.273,.34],[2.23,.16,.12,.267,.35],[2.38,.16,.12,.333,.401],[2.53,.16,.12,.35,.4],[2.8,.16,.12,.32,.39],[3.0,.16,.12,.353,.418],[3.4,.16,.12,.37,.43],[7.7,.16,.12,.5,.52]]);
 tubeX(g,cuff,[[1.924,.16,.12,.243,.327],[1.954,.16,.12,.255,.334],[1.993,.16,.12,.256,.336],[2.012,.16,.12,.252,.335]]);
 batch(g);
 grains(g,58,()=>{const i=Math.floor(random()*3),f=fingers[i],t=random()*.53;return [f[0]+.06+t,f[1]+.096+t*.22,f[2]+(random()-.5)*.12,.007+random()*.011];},chalk);
 return g;
}
const mama=hand(), steady=hand();
steady.scale.setScalar(.90);steady.rotation.y=PI-.30;
steady.position.set(-layout.w*.5+.31,.445,layout.z-.63);
mama.rotation.y=.18;
const handLoc={x:layout.start+.08,y:layout.floor+game.cells[0].thick+.025,z:layout.z+.14,vx:0,vy:0,vz:0};
const handAim=V(),demo={time:0,active:false,rest:0,angle:0};
function nextRim(){
 let k=0;for(let n=1;n<N;n++)if(game.rims[n].fold<game.rims[k].fold-.012)k=n;
 const r=game.rims[k],rr=1.56+r.ear;
 return V(Math.cos(r.angle)*rr,0,Math.sin(r.angle)*rr);
}
function guide(dt){
 const s=game.s,baseX=centerX(),bz=layout.z;
 if(s.idle<3.8||s.cue<.02){demo.active=false;demo.time=0;demo.rest=0;}
 else if(!demo.active){demo.rest-=dt;if(demo.rest<=0){demo.active=true;demo.time=0;demo.angle=(random()-.5)*2.4;}}
 else{demo.time+=dt;if(demo.time>3.4){demo.active=false;demo.rest=2.05+random()*1.8;}}
 handAim.set(layout.w*.5-.37,.70,bz-.91);
 if(s.phase==='spread'&&s.cycle===0&&s.age<2.25){
 const t=s.introBond?0:ease(clamp((s.age-s.introEnd)/1.1));
 const h=layout.floor+game.cells[0].thick+.025+.94*s.introLift;
 handAim.set(layout.start+.08+.22*s.introLift+t*(layout.w*.5-layout.start-.82),h*(1-t)+.74*t,bz+.13-1.08*t);
 }else if(s.phase==='roll'&&s.age<1.7){
 const t=clamp(s.age/1.7);handAim.set(layout.spot,.253+.67*(1-ease(clamp(t/.28))+ease(clamp((t-.68)/.32))),bz);
 }else if(s.phase==='cut'&&s.age<2.2){
 handAim.set(baseX+1.20+.65*s.insert,.38+.24*s.insert,bz-.24);
 }else if(demo.active&&!s.sent){
 const t=demo.time/3.4,approach=ease(clamp(t/.28))*(1-ease(clamp((t-.78)/.22)));
 const drag=ease(clamp((t-.33)/.42)),v=V();
 if(s.phase==='spread')v.set(baseX-.13+Math.cos(demo.angle)*drag*1.19,layout.floor+game.cells[0].thick+.10-.12*drag,bz+.10+Math.sin(demo.angle)*drag*.94);
 if(s.phase==='berry')v.set(layout.plateX*(1-drag)+baseX*drag,1.55+.4*Math.sin(drag*PI)-drag*.54,layout.plateZ*(1-drag)+bz*drag);
 if(s.phase==='fold'){const p=nextRim();v.set(baseX+p.x*(1-.84*drag),.48+1.21*drag,bz+p.z*(1-.84*drag));}
 if(s.phase==='roll')v.set(baseX*(1-drag)+layout.spot*drag,1.86-.35*drag,bz);
 if(s.phase==='cut')v.set(baseX-.32-drag*.57,.47+.33*drag,bz+1.03+.35*drag);
 if(s.phase==='serve')v.set(baseX-.86-(layout.plateX+baseX-.86)*drag,1.23+.49*Math.sin(PI*drag),bz*(1-drag)+layout.plateZ*drag);
 if(s.phase!=='open')handAim.lerp(v,approach);
 }
 for(const key of ['x','y','z']){const vel='v'+key;handLoc[vel]+=((handAim[key]-handLoc[key])*44-12*handLoc[vel])*dt;handLoc[key]+=handLoc[vel]*dt;}
 mama.position.set(handLoc.x,handLoc.y,handLoc.z);
 mama.rotation.z=.015+.065*clamp(handLoc.y-.7);steady.rotation.z=-.028-.014*s.wobble;
}
function centerX(){return layout.start+(layout.spot-layout.start)*game.s.roll;}
