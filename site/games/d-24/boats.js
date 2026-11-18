'use strict';
const hullPaint=mat(0x964333,.53,.08,'wood'), topside=mat(0x354e4c,.46,.13,'wood'),deck=mat(0xb88b55,.68,0,'wood'), roofRed=mat(0xad4835,.44,.16,'metal'), cabinPaint=mat(0xe1bc7d,.66,0,'wood');
const hullStations=[[-2.54,.035],[-2.30,.37],[-1.93,.68],[-1.44,.89],[-.72,1.01],[.2,1.045],[1.16,1.0],[1.85,.84],[2.18,.61],[2.28,.36]];
function sheer(z){return .095*Math.pow(Math.abs(z)/2.4,2)+(z<0?.065:0)*Math.pow(Math.abs(z)/2.5,2);}
function hullBand(p,y0,w0,y1,w1,ma){
 const verts=[],idx=[],uv=[];
 for(const side of [-1,1]){let base=verts.length/3;
 hullStations.forEach(([z,r],i)=>{for(const [h,w] of [[y0,w0],[y1,w1]]){verts.push(side*r*w,h+sheer(z)*(.5+h*.5),z);uv.push(i/3,h*2);}if(i){const a=base+2*i;idx.push(a-2,a-1,a,a,a-1,a+1);}});
 }
 const obj=triangles(p,verts,idx,ma);obj.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));ma.side=T.DoubleSide;
 for(let idx of [0,hullStations.length-1]){const [z,r]=hullStations[idx];box(p,0,(y0+y1)/2+sheer(z)*.8,z,r*(w0+w1),y1-y0,.041,ma);}
}
function widthAt(z,h=1){
 let i=hullStations.findIndex(a=>a[0]>=z);if(i<0)return .35*h;if(i===0)return .036*h;const a=hullStations[i-1],b=hullStations[i];return h*(a[1]+(b[1]-a[1])*(z-a[0])/(b[0]-a[0]));
}
function deckLid(p,y,ma){const verts=[],idx=[],uv=[];hullStations.forEach(([z,r],i)=>{for(const side of [-1,1]){verts.push(side*r,y+sheer(z)*.91,z);uv.push(side*r*.58,z*.17);}
 if(i){let a=i*2;idx.push(a-2,a,a-1,a,a+1,a-1);}});const o=triangles(p,verts,idx,ma);o.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));ma.side=T.DoubleSide;}
function buoy(p,x,y,z,rad,angle=0){const a=group(p,x,y,z);a.rotation.y=angle;
 ring(a,0,0,0,rad,.063,m.red,32);
 for(let i=0;i<4;i++){const g=cached('buoyband'+rad,()=>new T.TorusGeometry(rad,.067,9,6,.42));mesh(a,g,m.cream,0,0,.002).rotation.z=i*pi/2+.34;}
 const rope=ring(a,0,0,.005,rad+.094,.012,m.rope);rope.scale.y*=.96;
}
function bollard(p,x,y,z,r=.07){rod(p,x,y+.09,z,r,.18,m.iron);rod(p,x,y+.19,z,r*1.46,.061,m.iron);}
const tug=group();
hullBand(tug,-.49,.38,-.22,.76,hullPaint);hullBand(tug,-.22,.76,.22,.945,hullPaint);
hullBand(tug,.22,.945,.315,.963,m.cream);hullBand(tug,.315,.963,.62,1.001,topside);
hullBand(tug,.62,1.001,.738,1.019,m.walnut);hullBand(tug,.738,1.019,.795,1.016,m.honey);deckLid(tug,.715,deck);
for(let z=-2.36;z<2.25;z+=.186){box(tug,0,.725+sheer(z)*.91,z,widthAt(z,1.965),.02,.011,m.walnut);}
for(let side of [-1,1]){
 for(let z of [-1.52,-.8,.07,1.07,1.69]){
  let x=side*(widthAt(z)+.043);
  if(z===-.8 || z===1.07){const f=group(tug,x,.41,z);f.rotation.y=side*pi/2;f.rotation.z=side*.23;const tyre=ring(f,0,0,0,.192,.072,m.black);
   cable(tug,[[x,.53,z-.1],[side*(Math.abs(x)-.06),.811,z-.13],[side*(Math.abs(x)-.12),.84,z-.21]],.018,m.rope);
  }else {orb(tug,x,.452+sheer(z),z,.025,.049,.052,m.brass);}
 }
}
box(tug,0,.875,.49,1.54,.32,2.03,cabinPaint);box(tug,0,1.09,.41,1.43,.19,1.83,m.green);
const pilothouse=group(tug,0,1.08,.39);
box(pilothouse,0,.54,0,1.52,1.06,1.54,cabinPaint);
for(let side of [-1,1]){
 const a=group(pilothouse,side*.774,0,0);a.rotation.y=side*pi/2;
 for(let j=0;j<3;j++){const x=(j-1)*.468;box(a,x,.65,0,.383,.55,.04,m.walnut);box(a,x,.65,.021,.332,.496,.045,m.glass);
 box(a,x,.40,.045,.402,.038,.065,m.honey);box(a,x,.73,.055,.329,.024,.015,m.cream);}
 for(let j=0;j<2;j++)box(a,0,.111+j*.099,.018,1.48,.014,.018,m.honey);
}
for(let side of [-1,1]){
 const a=group(pilothouse,0,0,side*.786);a.rotation.y=side===1?0:pi;
 for(let j of [-1,0,1]){box(a,j*.459,.64,0,.389,.558,.045,m.walnut);box(a,j*.459,.64,.03,.332,.492,.035,m.glass);}
}
box(tug,0,2.214,.39,1.85,.108,1.85,m.cream);box(tug,0,2.295,.39,1.94,.125,1.95,roofRed);
for(let j=-3;j<=3;j++)box(tug,j*.245,2.364,.39,.028,.021,1.87,roofRed);
rod(tug,0,.947,-.85,.417,.36,topside,.373);
const chimney=group(tug,0,1.18,-.81);chimney.rotation.x=-.068;
rod(chimney,0,.62,0,.229,1.39,m.iron,.246);rod(chimney,0,1.02,0,.249,.202,m.honey);
rod(chimney,0,1.25,0,.259,.16,m.iron);rod(chimney,0,1.36,0,.286,.095,m.black);rod(chimney,0,1.413,0,.214,.016,m.black);
const whistle=rod(tug,.285,1.74,-.83,.055,1.0,m.brass);rod(tug,.285,2.27,-.83,.095,.11,m.brass);
for(let side of [-1,1]){buoy(tug,side*.85,1.04,.77,.22,side*pi/2);
 const pts=[];for(let z of [-2.25,-1.83,-1.42,-1.13]){let x=side*widthAt(z,.95),y=.85+sheer(z);rod(tug,x,y+.193,z,.032,.43,m.cream);pts.push([x,y+.41,z]);}cable(tug,pts,.03,m.honey);
 bollard(tug,side*.56,.79,1.81);bollard(tug,side*.38,.89,-2.01);
}
box(tug,0,.89,1.62,.85,.25,.48,m.green);box(tug,0,1.035,1.62,.88,.06,.51,m.honey);
for(let j=0;j<4;j++){const tor=ring(tug,-.47,.82+j*.025,1.3,.203,.026,m.rope);tor.rotation.x=pi/2;}
const mast=group(tug,0,2.36,.55);
rod(mast,0,.49,0,.042,1.04,m.honey,.027);orb(mast,0,1.035,0,.062,.073,.062,m.brass);
const flag=triangles(mast,[0,.978,0,0,.68,0,.13,.72,.51,.17,.853,.72],[0,1,2,0,2,3,2,1,0,3,2,0],m.red);
flag.userData.keep=true;
const navLamp=group(tug,0,2.42,-.07);rod(navLamp,0,.032,0,.152,.07,m.brass);rod(navLamp,0,.156,0,.101,.181,m.lamp);rod(navLamp,0,.276,0,.139,.057,m.brass);
bake(tug);
const sailCloth=mat(0xf3efdd,.87,0,'soft',{side:T.DoubleSide}),sailSeam=mat(0xc7c3a7,.88);
function yacht(x,z,size,angle,moving=false){
 const p=group(moving?scene:land,x,H[2],z);p.scale.setScalar(size);p.rotation.y=angle;
 const a=group(p);a.scale.set(.56,.57,.75);
 hullBand(a,-.28,.6,.31,1.0,m.green);hullBand(a,.31,1,.52,1.01,m.cream);deckLid(a,.53,deck);
 rod(p,0,1.95,-.28,.047,3.62,m.honey,.026);
 beam(p,[0,.72,-.24],[.19,.78,1.17],.043,m.honey,.035);
 cable(p,[[0,3.68,-.28],[0,2.22,-.98],[0,.5,-1.64]],.012,m.rope);
 cable(p,[[0,3.68,-.28],[.1,2.24,.66],[0,.48,1.48]],.012,m.rope);
 triangles(p,[0,3.44,-.32,.02,.81,-1.55,-.14,.73,-.45,-.12,1.68,-.53],[0,1,3,1,2,3,0,3,2],sailCloth);
 const vs=[],indices=[],uv=[];for(let i=0;i<=8;i++){const t=i/8,zz=-.22+1.46*(1-t);
 for(let j=0;j<=4;j++){let f=j/4;vs.push(.045+Math.sin(f*pi)*.18*(1-t),.8+t*2.91,-.23+(zz+.23)*f);uv.push(f,t);
 if(i&&j){const k=i*5+j;indices.push(k-6,k-1,k,k-6,k,k-5);}}}
 const cloth=triangles(p,vs,indices,sailCloth);cloth.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(moving)cloth.userData.keep=true;
 for(let i=1;i<5;i++){const t=i/6;beam(p,[.053,.8+t*2.91,-.215],[.05,.8+t*2.91,-.22+1.46*(1-t)],.008,sailSeam);}
 if(moving){anchors.sail=group(p,.045,1.53,.18);bake(p);return {p,cloth,rest:vs};}return p;
}
const companion=yacht(-3.05,-25,1.22,.04,true);
yacht(-7.1,-39,1.04,-.68);yacht(1.6,-54,1.05,.09);yacht(-11,-50,.81,.62);
const fishSkin=mat(0xb4be94,.34,.26,'metal'),fishBack=mat(0x68887c,.37,.2,'metal');
for(let i=0;i<4;i++){const f=group();orb(f,0,0,0,.12,.16,.348,fishSkin);orb(f,0,.079,0,.105,.094,.29,fishBack);
 triangles(f,[0,0,.225,0,.195,.53,0,-.16,.5],[0,1,2,2,1,0],fishBack);
 for(let side of [-1,1])orb(f,side*.103,.035,-.184,.028,.035,.032,m.black);f.rotation.y=-.96+i*.7;bake(f);fishModels.push(f);}
for(let i=0;i<8;i++){const b=group();orb(b,0,0,0,.085,.1,.229,m.cream);orb(b,0,.09,-.144,.084,.086,.089,m.white);
 const wings=[];for(let side of [-1,1]){const wing=group(b,side*.033,.045,0);triangles(wing,[0,0,-.06,side*.31,.09,-.02,side*.65,.04,.18,side*.29,0,.153,0,0,.09],[0,1,3,1,2,3,0,3,4,3,1,0,3,2,1,4,3,0],m.cream);wings.push(wing);}birdModels.push({b,wings});}
