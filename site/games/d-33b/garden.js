(function(){
'use strict';
const {T,TAU,rnd,noise,mix,v3,mat,box,ell,rod,pipe,ring,mesh,group,lathe,handmade,bake,trough,
 brass,iron,zinc,edge,oak,copper,patina,porcelain,blue,jade,water}=Craft;
const slate=mat(0x4e6062,.65,.16,'stone'),timber=mat(0x806043,.73,.02,'wood'),
darkTimber=mat(0x564c3c,.74,.025,'wood'), stone=mat(0x969a87,.88,.05,'stone'),
moss=mat(0x7a8a4e,.98,0,'moss'),earth=mat(0x81865d,.95,0,'stone'),
leafMat=mat(0xffffff,.83,0,'moss',{side:T.DoubleSide,vertexColors:true}),bark=mat(0x666149,.95,0,'wood');
const branchGroups=[],clouds=[];
const greens=[0x798952,0x8f9e5f,0x516f4d,0x618456,0x768d4e,0x94a970];
const tint=(hex,scale)=>new T.Color(hex).multiplyScalar(scale);
function batchLeaves(p,instances,shape='leaf'){
 const points=[],indices=[],uv=[],cols=[];
 for(const v of instances){
  const [x,y,z,len,w,yaw,tilt,col,roll=0]=v,off=points.length/3;
  const vertices=shape==='maple'?[[0,0,0],[-.45,.02,.31],[-.97,0,.3],[-.54,.02,.52],[-.78,.01,.79],[-.26,.04,.63],[0,0,1.12],[.26,.04,.63],[.78,0,.79],[.54,.02,.52],[.97,0,.30],[.45,.02,.31],[0,.10,.46]]:
      [[0,0,0],[-.68,0,.2],[-1,.018,.48],[-.6,0,.75],[0,-.04,1],[.6,0,.75],[1,.018,.48],[.68,.01,.2],[0,.12,.46]];
  const center=vertices.length-1,c=Math.cos(yaw),s=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt),cr=Math.cos(roll),sr=Math.sin(roll);
  for(let i=0;i<vertices.length;i++){const a=vertices[i],xx=a[0]*w,yy=a[1]*len,zz=a[2]*len;
   const rx=xx*cr-yy*sr,ry=xx*sr+yy*cr,dy=zz*st+ry*ct,dz=zz*ct-ry*st;
   points.push(x+rx*c+dz*s,y+dy,z+dz*c-rx*s);uv.push(a[0]*.5+.5,a[2]);const k=i===center?1.12:i<center*.5?.91:1;cols.push(col.r*k,col.g*k,col.b*k);
  }
  for(let i=0;i<center;i++)indices.push(off+i,off+center,off+(i+1)%center);
 }
 return handmade(p,points,indices,leafMat,uv,cols);
}
function rockGeometry(seed,flat=false){
 const g=new T.IcosahedronGeometry(1,2),a=g.attributes.position;
 for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),n=.83+.24*noise(6+x*2.1+z+seed,8+y*2.7+z*.75+seed);
 a.setXYZ(i,x*n,y*n*(flat&&y>.18?1-y*.37:1),z*n);}
 g.computeVertexNormals();return g;
}
const rocks=Array.from({length:7},(_,i)=>rockGeometry(i*7.8,true)),rockMats=[0x849286,0xa4a79a,0x7d8983,0x969582].map(c=>mat(c,.84,.07,'stone'));
function boulder(p,x,y,z,w,h,d,green=true){
 const k=Math.floor(rnd()*7),o=mesh(p,rocks[k],rockMats[k%4],x,y,z);o.scale.set(w,h,d);o.rotation.y=rnd()*TAU;
 if(green){const cap=mesh(p,rocks[k],moss,x,y+h*.52,z);cap.scale.set(w*.83,h*.50,d*.82);cap.rotation.y=o.rotation.y;}
}
function shrub(p,x,y,z,r,height,shade=0){
 const leaves=[],c=greens[shade%greens.length];
 const lobes=5+Math.ceil(r*2);
 for(let j=0;j<lobes;j++){
  const a=j*TAU/lobes,rr=j===0?0:r*.47;const xx=x+Math.sin(a)*rr,zz=z+Math.cos(a)*rr,yy=y+height*(.50+rnd()*.1);
  const canopy=mesh(p,rocks[j%7],bushMats[shade%4],xx,yy,zz);canopy.scale.set(r*.61,height*.67,r*.59);
  for(let k=0;k<Math.ceil(r*64);k++){
   const ang=rnd()*TAU,h=rnd()*1.75-.76,size=Math.sqrt(1-h*h),rad=.54+rnd()*.05;
   leaves.push([xx+Math.sin(ang)*r*rad*size,yy+h*height*.56,zz+Math.cos(ang)*r*rad*size,
    .063+rnd()*.107,.034+rnd()*.026,ang,.09+rnd()*.68,tint(c,.65+rnd()*.54),rnd()-.5]);
  }
 }
 batchLeaves(p,leaves);
}
const bushMats=[0x6d835f,0x5b7658,0x82936a,0x546f54].map(c=>mat(c,.95,0,'moss'));
function fern(p,x,y,z,size){
 let leaves=[];for(let j=0;j<9;j++){
  const a=j*TAU/9+rnd()*.34,reach=size*(.48+rnd()*.64),sx=Math.sin(a),sz=Math.cos(a);
  const pt=t=>[x+sx*reach*t,y+size*(Math.sin(t*2.47)*.6+t*.12),z+sz*reach*t];
  pipe(p,[pt(0),pt(.28),pt(.65),pt(1)],.006*size,bushMats[1],6);
  for(let k=1;k<12;k++)for(const sign of [-1,1]){
   const t=k/12,at=pt(t),l=size*Math.sin(Math.PI*t)*.19+.018;
   leaves.push([...at,l,l*.19,a+sign*.93,.23-.4*t,tint(0x77934e,.8+.34*rnd()),sign*.3]);
  }
 }batchLeaves(p,leaves);
}
function hydrangea(p,x,y,z,size){
 const leaves=[],petals=[],colors=[0xadb9d2,0xa9a3c3,0x91abbf,0xc2c5d3,0xb4b3cd,0x889fb6];
 for(let j=0;j<12;j++){
  const a=j*2.4,rad=Math.sqrt(j/12)*size*.58,xx=x+Math.sin(a)*rad,zz=z+Math.cos(a)*rad,yy=y+size*(1.06-rad/size*.48+rnd()*.08);
  rod(p,[x,y,z],[xx,yy,zz],size*.013,bushMats[1],size*.009,7);
  for(let k=0;k<5;k++){const h=.18+.12*k;leaves.push([mix(x,xx,h),mix(y,yy,h),mix(z,zz,h),size*(.32+rnd()*.11),size*.14,a+k*2.4,.33-rnd()*.67,tint(0x548363,.73+rnd()*.44),.1]);}
  for(let f=0;f<34;f++){
   const h=rnd()*1.6-.6,phi=f*2.39996,rr=Math.sqrt(1-h*h),fl=size*(.155+.027*rnd()),fx=xx+Math.cos(phi)*rr*fl,fy=yy+h*fl,fz=zz+Math.sin(phi)*rr*fl;
   const color=tint(colors[f%6],.8+rnd()*.4);
   for(let k=0;k<4;k++)petals.push([fx,fy,fz,size*.043,size*.026,k*Math.PI/2+phi,.28+rnd()*.49,color]);
  }
 }
 batchLeaves(p,leaves);batchLeaves(p,petals);
}
function pine(p,x,y,z,size){
 const g=group(p,x,y,z);g.scale.setScalar(size);
 const spine=[[0,0,0],[.10,.64,.08],[-.21,1.33,-.04],[-.09,1.96,.05],[.18,2.50,.09],[.02,3.07,.08]];
 for(let k=0;k<spine.length-1;k++)rod(g,spine[k],spine[k+1],.145-k*.019,bark,.128-k*.019,11);
 for(let j=0;j<8;j++){
  const a=1.4+j*2.34,h=1.05+j*.255,rr=1.18-j*.121,xx=Math.cos(a)*rr,zz=Math.sin(a)*rr;
  const fork=[xx*.62,h+.03,zz*.62],tip=[xx,h+.39,zz];rod(g,[-.10,h,0],fork,.058-j*.004,bark,.043-j*.003);
  rod(g,fork,tip,.045-j*.003,bark,.015);shrub(g,xx,h+.32,zz,.79-j*.054,.37-j*.019,j%4);
 }
}
function maple(p,x,y,z,scale,autumn=false,animated=false){
 const g=group(p,x,y,z);g.scale.setScalar(scale);
 const trunk=[[0,0,0],[.08,1.16,-.05],[-.19,2.18,.03],[.09,3.0,.06]];
 for(let j=0;j<3;j++)rod(g,trunk[j],trunk[j+1],.14-j*.036,bark,.108-j*.035);
 for(let j=0;j<10;j++){
  const a=j*2.4,rad=.90+rnd()*.76,h=2+j*.115,from=[-.08,h,0],end=[Math.sin(a)*rad,h+.57+rnd()*.38,Math.cos(a)*rad];
  const fork=[end[0]*.63,h+.38,end[2]*.63];rod(g,from,fork,.052,bark,.033);rod(g,fork,end,.034,bark,.012);
  const twig=group(g,...end),leaves=[];
  for(let q=0;q<8;q++){
   const b=a+q*2.40,c=.28+rnd()*.53,dx=Math.sin(b)*c,dz=Math.cos(b)*c,dy=.24+rnd()*.14;
   rod(twig,[0,0,0],[dx,dy,dz],.013,bark,.0025,6);
   for(let k=0;k<7;k++){
    const t=.25+k*.105,dir=b+(k%2?1:-1)*.9,shade=autumn?[0xa46c47,0xab714c,0x987244,0x956144]:[0x799453,0x95a65d,0x849954,0xa3aa69];
    leaves.push([dx*t,dy*t,dz*t,.16+rnd()*.10,.12+rnd()*.04,dir,-.3-rnd()*.42,tint(shade[k%4],.82+rnd()*.3),rnd()-.5]);
   }
  }batchLeaves(twig,leaves);
  if(animated){twig.updateWorldMatrix(true,false);p.parent.attach(twig);bake(twig);branchGroups.push(twig);}
 }
}
function lantern(p,x,y,z,scale){
 const g=group(p,x,y,z);g.scale.setScalar(scale);
 lathe(g,[[.01,0],[.43,0],[.44,.08],[.37,.15],[.33,.20],[.25,.26],[.18,.31],[.158,.39],[.155,.83],[.21,.89],[.27,.94],[.28,1.0],[.34,1.05],[.34,1.13],[.01,1.13]],stone,0,0,0,40);
 for(const X of [-.21,.21])for(const Z of [-.21,.21])box(g,X,1.34,Z,.085,.43,.085,stone);
 box(g,0,1.15,0,.54,.064,.54,stone);const top=lathe(g,[[.01,1.53],[.67,1.52],[.70,1.555],[.53,1.62],[.316,1.75],[.145,1.85],[.12,1.86],[.01,1.86]],stone,0,0,0,4);top.rotation.y=Math.PI*.25;
 lathe(g,[[.01,1.86],[.132,1.86],[.141,1.91],[.106,1.95],[.124,2.02],[.092,2.10],[.001,2.18]],stone);
 box(g,0,1.36,-.21,.40,.38,.055,slate);
}
function house(p,x,z,w,depth,h){
 const g=group(p,x,-.3,z),plaster=mat(0xe1dcba,.88,.01,'stone');
 box(g,0,h*.49,0,w,h,depth,plaster);box(g,0,.22,depth*.5+.06,w,.45,.14,timber);
 for(let k=0;k<=8;k++)box(g,-w*.5+k*w/8,h*.5,depth*.5+.04,k%4===0?.13:.04,h,.09,timber);
 for(let k=1;k<5;k++)box(g,0,.3+k*(h-.37)/5,depth*.5+.06,w,.033,.08,timber);
 for(const d of [-1,1]){const tile=box(g,0,h+.26,d*depth*.28,w+.75,.15,depth*.62+.5,slate);tile.rotation.x=d*.31;
 for(let k=0;k<Math.ceil(w/.21);k++){const xx=k*.21-w*.5;rod(g,[xx,h+.74,0],[xx,h-.005,d*(depth*.57+.35)],.067,slate,.067,8);}}
 box(g,0,h-.015,depth*.52,w+.77,.16,.32,darkTimber);
}
function skyEnv(renderer){
 const colors=[0x829baa,0xb7cbd3,0xe0e7db,0xb0bdab,0x718275,0x6d6353],stops=[1,.52,.10,0,-.19,-1];
 const c=colors.map(x=>new T.Color(x));const canvases=[];
 for(let side=0;side<6;side++){
  const cn=document.createElement('canvas');cn.width=cn.height=96;const ctx=cn.getContext('2d'),im=ctx.createImageData(96,96);
  for(let y=0;y<96;y++)for(let x=0;x<96;x++){
   const u=x/47.5-1,v=1-y/47.5,vec=[[1,v,-u],[-1,v,u],[u,1,-v],[u,-1,v],[u,v,1],[-u,v,-1]][side],d=v3(...vec).normalize();
   let j=0;while(j<4 && d.y<stops[j+1])j++;
   const t=(stops[j]-d.y)/(stops[j]-stops[j+1]),co=c[j].clone().lerp(c[j+1],Math.max(0,Math.min(1,t)));
   const l=Math.max(0,d.dot(v3(-.58,.66,-.47).normalize())),light=Math.pow(l,13)*.95+Math.pow(l,150)*2.2;
   const n=noise(d.x*5+side*.06,d.z*6+d.y*5);
   co.multiplyScalar(.92+.16*n).addScalar(light).convertLinearToSRGB();const k=4*(x+y*96);
   im.data[k]=co.r*255;im.data[k+1]=co.g*255;im.data[k+2]=co.b*255;im.data[k+3]=255;
  }ctx.putImageData(im,0,0);canvases.push(cn);
 }const tex=new T.CubeTexture(canvases);tex.colorSpace=T.SRGBColorSpace;tex.needsUpdate=true;const gen=new T.PMREMGenerator(renderer),env=gen.fromCubemap(tex);gen.dispose();return {tex,env};
}
function setup(scene,renderer){
 const env=skyEnv(renderer);scene.environment=env.env.texture;scene.environmentIntensity=.81;scene.background=env.tex;scene.backgroundIntensity=.95;
 scene.fog=new T.FogExp2(0xc8d7c9,.050);
 const ambient=new T.HemisphereLight(0xe5f2fd,0xbcb89c,1.43);scene.add(ambient);
 const sun=new T.DirectionalLight(0xffeed1,2.7);sun.position.set(-6,10,2.5);sun.target.position.set(0,0,-2);scene.add(sun,sun.target);sun.castShadow=true;
 Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:32});sun.shadow.camera.updateProjectionMatrix();sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00035;sun.shadow.normalBias=.015;sun.shadow.radius=3;
 const g=group(scene),base=group(g);
 box(base,0,-.68,-8,64,.59,52,earth);
 // The veranda is assembled from individual planed cedar boards, with staggered butt joints.
 const planks=[0x997658,0xa48160,0x907056,0xa78262,0x8d715c,0xb08c6b].map(c=>mat(c,.48,.13,'wood'));
 for(let j=0;j<43;j++){
  const z=-1.74+j*.372,seam=-3.6+(j*2.19)%7.0;
  for(const [x1,x2] of [[-8,seam-.009],[seam+.009,8]]){
   box(base,(x1+x2)/2,-.092,z,x2-x1,.176,.361,planks[(j+(x1===-8?1:3))%6]);
   if(j<16)for(const side of [-1,1]){const nail=ell(base,(x1===-8?x2-.071:x1+.071),-.002,z+side*.102,.012,.004,.012,iron);nail.castShadow=false;}
  }
 }
 box(base,0,-.22,-1.952,16,.16,.14,darkTimber);
 // A corner of the roof, its rafters, fixed collector and the swivel bearing.
 box(base,-3.37,1.65,-1.65,.235,3.54,.245,timber);
 box(base,-3.37,3.34,1,.36,.26,7.4,darkTimber);
 box(base,-3.43,2.69,-2.19,7.24,.20,.26,timber);
 const roof=box(base,-3.64,3.04,-1.33,7.35,.19,1.80,slate);roof.rotation.x=-.22;
 for(let i=0;i<31;i++){const x=-7.19+i*.238;rod(base,[x,2.96,-2.36],[x,3.34,-.49],.078,slate,.078,10);}
 for(let j=0;j<11;j++){const x=-6.95+j*.62;box(base,x,2.86,-1.83,.105,.135,1.32,timber).rotation.x=-.18;}
 const fixed=trough(base,7.15,.165,.145);fixed.position.set(-7.15,2.87,-2.12);fixed.rotation.y=Math.PI*.5;
 for(let x=-6.8;x<0;x+=1.05){pipe(base,[[x,2.80,-2.32],[x,2.55,-2.23],[x,2.53,-2.07],[x,2.66,-1.93]],.025,iron,12);}
 lathe(base,[[.14,2.38],[.185,2.4],[.19,2.45],[.145,2.48],[.16,2.56],[.204,2.61],[.199,2.70],[.14,2.73]],patina,0,0,-2.12);ring(base,0,2.46,-2.12,.17,.024,brass);
 rod(base,[-.4,2.6,-2.25],[0,2.45,-2.12],.042,iron);ell(base,0,2.70,-2.12,.149,.04,.13,water);
 // Low open bamboo runnels connect the adjacent rims.
 for(let i=0;i<4;i++){const a=RainGarden.vessels[i],b=RainGarden.vessels[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  const start=a.radius*.87,end=len-b.radius*.46,gutter=trough(base,end-start,.045,a.rim-b.rim-.079,oak,oak);
  gutter.rotation.y=Math.atan2(dx,dz);gutter.position.set(a.x+dx/len*start,a.rim-.013,a.z+dz/len*start);
 }
 const tail=trough(base,1.37,.044,.69,oak,oak);tail.position.set(RainGarden.vessels[4].x,.706,-1.31);tail.rotation.y=Math.PI;
 // Small fallen Japanese maple leaves catch in the wet board joints.
 const litter=[];
 for(let i=0;i<40;i++){
  const x=(rnd()-.5)*10,z=-1.7+rnd()*6.4;if(Math.abs(x)<2.7&&z<1.1)continue;
  litter.push([x,.008,z,.07+rnd()*.12,.06+rnd()*.087,rnd()*TAU,.02,tint([0xbd8a47,0xaa6740,0xb2954e,0xa87246][i%4],.8+rnd()*.3)]);
 }batchLeaves(base,litter,'maple');
 // Thin films collect in the low grain of a few boards.
 const damp=mat(0x89796b,.12,.38,'wood',{transparent:true,opacity:.37,depthWrite:false});
 for(let k=0;k<28;k++){
  const dx=(rnd()-.5)*10,dz=-1.53+rnd()*7.2,w=.10+rnd()*.54,d=.022+rnd()*.092;
  const pts=[dx,.001,dz],ind=[],uv=[.5,.5];for(let j=0;j<=32;j++){const a=j*TAU/32,r=.65+.25*Math.sin(3*a+k)+.12*Math.sin(7*a+k);
   pts.push(dx+Math.cos(a)*w*r,.001,dz+Math.sin(a)*d*r);uv.push(.5+.5*Math.cos(a),.5+.5*Math.sin(a));if(j>0)ind.push(0,j+1,j);}
  handmade(base,pts,ind,damp,uv).castShadow=false;
 }
 // A coarsely woven flower basket at the near edge frames the porch on tall screens.
 const basket=group(base,-3.91,0,3.76);
 for(let j=0;j<28;j++){const a=j*TAU/28;rod(basket,[Math.cos(a)*.22,.018,Math.sin(a)*.22],[Math.cos(a)*.33,.53,Math.sin(a)*.33],.011,oak,.014,5);}
 for(let k=0;k<13;k++){const y=.044+k*.039,pts=[];for(let j=0;j<=56;j++){const a=j*TAU/56,r=.219+y*.21+(j%2?.007:-.007);pts.push([Math.cos(a)*r,y,Math.sin(a)*r]);}pipe(basket,pts,.014,k%2?oak:timber,56);}
 ring(basket,0,.54,0,.33,.023,timber);hydrangea(basket,0,.41,0,.94);
 // Smooth, irregular shore and a shallow reflecting pool below the engawa.
 const cx=.63,cz=-5.22,radX=5.35,radZ=2.89;
 const pondGeo=new T.CircleGeometry(1,112);const pa=pondGeo.attributes.position;
 for(let i=1;i<pa.count;i++){const a=Math.atan2(pa.getY(i),pa.getX(i)),r=1+.065*Math.sin(a*3+.7)+.046*Math.sin(a*7-.5);pa.setXY(i,pa.getX(i)*r,pa.getY(i)*r);}
 const pondMat=mat(0x819d8d,.16,.48,'glaze');const pond=mesh(g,pondGeo,pondMat,cx,-.25,cz);pond.rotation.x=-Math.PI/2;pond.scale.set(radX,radZ,1);pond.castShadow=false;
 for(let i=0;i<65;i++){const a=i/65*TAU,r=1+.065*Math.sin(a*3+.7)+.046*Math.sin(a*7-.5),w=.25+rnd()*.40;
  boulder(g,cx+Math.cos(a)*radX*r,-.30,cz-Math.sin(a)*radZ*r,w,.12+rnd()*.23,w*(.67+rnd()*.4),i%3!==0);
 }
 const grasses=[];for(let k=0;k<165;k++){
 const a=rnd()*TAU,r=1.04+rnd()*.19,px=cx+Math.cos(a)*radX*r,pz=cz-Math.sin(a)*radZ*r;
 if(pz> -2.15)continue;for(let j=0;j<9;j++){const l=.11+rnd()*.26;grasses.push([px+rnd()*.11,-.36,pz+rnd()*.11,l,.009+rnd()*.016,rnd()*TAU,.76+rnd()*.65,tint(greens[j%6],.72+rnd()*.42)]);}
 }batchLeaves(g,grasses);
 // Islands, stepping stones, reflected stone lantern and layers of garden planting.
 for(let i=0;i<5;i++)boulder(g,-4.0+i*.62,-.24,-3.18-i*.36,.46,.18,.32,false);
 boulder(g,3.95,-.27,-5.99,.86,.41,.79);lantern(g,4.01,-.06,-6.05,.94);
 for(let i=0;i<21;i++){const side=i%2?1:-1,x=side*(3.8+rnd()*3.2),z=-3-rnd()*6.0;shrub(g,x,-.42,z,.45+rnd()*.71,.46+rnd()*.52,i%4);}
 for(let i=0;i<18;i++)fern(g,(i%2?-1:1)*(2.9+rnd()*2.7),-.34,-2.15-rnd()*5,.38+rnd()*.47);
 hydrangea(g,-3.02,-.35,-2.83,1.25);hydrangea(g,-3.83,-.34,-3.41,1.42);
 hydrangea(g,4.3,-.36,-2.95,.99);
 pine(g,2.17,-.33,-8.65,1.19);pine(g,-4.68,-.34,-7.99,1.15);pine(g,7.6,-.35,-10.8,1.42);
 maple(g,5.65,-.28,-2.49,1.59,false,true);maple(g,-6.3,-.35,-9.9,1.54,true);
 house(g,-5.34,-12.22,5.4,2.9,2.43);
 const plaster=mat(0xc9c5a7,.94,.01,'stone');
 box(g,1,.39,-11.1,20,1.57,.30,plaster);box(g,1,-.06,-10.89,20,.58,.17,stone);
 for(let i=0;i<71;i++){const x=-9+i*.286;rod(g,[x,1.285,-11.36],[x,1.20,-10.80],.108,slate,.108,8);}
 for(let x=-8;x<11;x+=2.40)box(g,x,.45,-10.90,.147,1.62,.13,timber);
 for(let i=0;i<19;i++){
  const x=-18+i*2.12,z=-14-rnd()*3.7,r=1.56+rnd()*1.9;
  const top=mesh(g,rocks[i%7],bushMats[i%4],x,1.05+rnd()*.9,z);top.scale.set(r,r*(.8+rnd()*.57),r*.72);
 }
 for(let j=0;j<3;j++){
  const pts=[],ix=[],uv=[],co=[];
  for(let row=0;row<7;row++)for(let i=0;i<122;i++){
   const x=(i-61)*.63,z=-20-j*6.6-row*1.08;
   const ridge=3.5+2.8*noise(i*.072,j*4)+1.86*Math.sin(i*.092+j)+j*.96;
   const h=-.45+ridge*Math.sin(row/6*Math.PI)*(.86+.19*noise(i*.092,row+j));
   pts.push(x,h,z);uv.push(i/22,row/6);const cc=new T.Color([0x849c89,0x93aba0,0xa5bab1][j]);co.push(cc.r,cc.g,cc.b);
   if(row<6 && i<121){const k=row*122+i;ix.push(k,k+1,k+122,k+1,k+123,k+122);}
  }handmade(g,pts,ix,mat(0xffffff,1,0,'glaze',{vertexColors:true,side:T.DoubleSide}),uv,co).castShadow=false;
 }
 // Wisps move separately with the passing front.
 const cm=mat(0xe4ebe5,1,0,'glaze',{transparent:true,opacity:.53,depthWrite:false});
 for(let j=0;j<4;j++){const cg=group(scene,-10+j*7.3,5+j%2*.65,-19-j*1.3);for(let k=0;k<4;k++)ell(cg,k*.88,k%2*.19,0,1.56,.37+rnd()*.26,.71,cm).castShadow=false;bake(cg);clouds.push(cg);}
 // A seven-band arc is physically located beyond the garden wall.
 const rainbow=group(scene,0,-.90,-15.8);
 [0xd69b91,0xdcb48a,0xdacd8d,0xa8c79c,0x91bbbd,0x9faec8,0xb3a6c4].forEach((c,i)=>{
  const pts=[];for(let j=0;j<=60;j++){const a=.11+(Math.PI-.22)*j/60;pts.push([5.6*Math.cos(a)*(1-i*.015),4.52*Math.sin(a)*(1-i*.015),0]);}
  const m=mat(c,.93,0,'glaze',{transparent:true,opacity:0,depthWrite:false,emissive:c,emissiveIntensity:.26});pipe(rainbow,pts,.047,m,60).castShadow=false;
 });
 // A tiny mooring, wheel works, and three glass furin under their own wooden lintel.
 const wx=3.11,wz=-5.45;
 for(const z of [wz-.28,wz+.29]){rod(g,[wx-.43,-.31,z],[wx,.49,z],.056,timber);rod(g,[wx+.43,-.31,z],[wx,.49,z],.056,timber);}
 const wheel=group(scene,wx,.42,wz),blades=mat(0xae8a59,.60,.02,'wood');
 for(const zz of [-.15,.15]){ring(wheel,0,0,zz,.67,.040,darkTimber).rotation.x=0;ring(wheel,0,0,zz,.54,.025,blades).rotation.x=0;}
 for(let k=0;k<10;k++){const a=k*TAU/10;rod(wheel,[0,0,0],[.68*Math.cos(a),.68*Math.sin(a),0],.024,blades);
   box(wheel,.70*Math.cos(a),.70*Math.sin(a),0,.22,.035,.40,blades).rotation.z=a+.27;
 }
 rod(wheel,[0,0,-.35],[0,0,.36],.076,iron);bake(wheel);
 const cups=[];for(let i=0;i<10;i++){
 const a=i*TAU/10,cup=group(wheel,.66*Math.cos(a),.66*Math.sin(a),0);cup.rotation.z=a;
 const surface=ell(cup,-.02,.032,0,.09,.024,.181,water);surface.castShadow=false;cups.push(surface);
 }
 const boat=group(scene),paper=mat(0xe3cda2,.78,.016),fold=mat(0xbc9e7e,.85,.013);
 const bp=[-.42,.13,0,-.19,.0,.156,.18,0,.156,.42,.13,0,.18,0,-.156,-.19,0,-.156,0,.095,0,0,.246,0];paper.side=fold.side=T.DoubleSide;
 handmade(boat,bp,[0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6,1,2,7,4,5,7],paper);handmade(boat,bp,[0,1,5,3,4,2,1,7,5,2,4,7],fold);bake(boat);
 const bells=group(scene,-1.05,1.85,-4.95);
 for(const xx of [-.73,.73])rod(g,[-1.05+xx,-.35,-5.04],[-1.05+xx,1.97,-5.04],.047,timber);
 box(g,-1.05,1.97,-5.04,1.68,.095,.15,timber);const bellParts=[];
 for(let i=0;i<3;i++){
  const X=(i-1)*.44,Y=-Math.abs(i-1)*.13,part=group(bells,X,Y,0);rod(part,[0,.115,-.09],[0,-.14,0],.008,darkTimber);
  const gm=new T.MeshPhysicalMaterial({color:[0xb9d8c7,0xdfc7ae,0xaeccd6][i],roughness:.15,metalness:.15,transparent:true,opacity:.66,side:T.DoubleSide,...Craft.surface('glaze')});
  lathe(part,[[.145,-.41],[.177,-.315],[.157,-.225],[.096,-.152],[.033,-.14]],gm);
  ring(part,0,-.41,0,.145,.009,edge);rod(part,[0,-.20,0],[0,-.56,0],.007,timber);
  ell(part,0,-.389,0,.031,.035,.031,brass);box(part,0,-.684,0,.078,.247,.007,[porcelain,jade,blue][i]);bake(part);bellParts.push(part);
 }
 // Lilies and reeds give the boat a visible scale.
 for(let k=0;k<17;k++){const x=-2.5+rnd()*1.45,z=-5.5+rnd()*.97;const pad=mesh(g,new T.CircleGeometry(.10+rnd()*.105,30,.0,5.86),bushMats[k%4],x,-.237+rnd()*.005,z);pad.rotation.x=-Math.PI*.5;pad.rotation.z=rnd()*TAU;pad.castShadow=false;}
 for(let i=0;i<36;i++){const x=-2.45+rnd()*.63,z=-7.3+rnd()*.4,h=.33+rnd()*.46;rod(g,[x,-.3,z],[x+.08,-.3+h,z-.04],.013,bushMats[0],.002,5);}
 const bird=group(scene),olive=mat(0x93965a,.93,0,'moss'),belly=mat(0xd7d0a8,.93,0,'moss'),eye=mat(0x212f29,.18,.11);
 ell(bird,0,.124,0,.135,.113,.085,olive);ell(bird,-.027,.107,.035,.109,.081,.061,belly);
 ell(bird,-.094,.197,0,.09,.09,.078,olive);
 for(const side of [-1,1]){ell(bird,-.135,.214,side*.060,.032,.033,.019,porcelain);ell(bird,-.14,.216,side*.073,.022,.023,.014,eye);}
 rod(bird,[-.155,.189,0],[-.225,.181,0],.027,iron,.002,8);rod(bird,[.078,.143,0],[.253,.158,0],.048,olive,.012,9);
 for(const x of [-.047,.03])rod(bird,[x,.077,0],[x-.015,.002,.012],.009,timber);
 const wings=[];for(const sg of [-1,1]){const wing=group(bird,0,.15,sg*.049);ell(wing,.05,-.036,sg*.025,.104,.055,.024,olive).rotation.z=.28;wings.push(wing);}
 bake(g);
 return {sun,cups,pondMat,branchGroups,clouds,rainbow,boat,wheel,bellParts,bird,wings,env};
}
window.MakeGarden=setup;
})();
