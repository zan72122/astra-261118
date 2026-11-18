/* Modelled in metres. Local shop coordinates face out towards the pavement. */
function makeStreet(T,scene){
'use strict';
const staticRoot=new T.Group();scene.add(staticRoot);
const dynamic=new T.Group();scene.add(dynamic);
let seed=517;function rnd(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}
const pi=Math.PI,tau=2*pi,v=(x,y,z)=>new T.Vector3(x,y,z);
function group(parent,x=0,y=0,z=0){const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g}
function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;return t}
const grit=texture(128,128,(g,w,h)=>{const d=g.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){const n=190+rnd()*47;d.data[i]=d.data[i+1]=d.data[i+2]=n;d.data[i+3]=255}g.putImageData(d,0,0)});grit.colorSpace=T.NoColorSpace;
function mat(color,rough=.65,metal=0,extra={}){return new T.MeshStandardMaterial({color,roughness:rough,roughnessMap:grit,metalness:metal,...extra})}
const M={
 emerald:mat(0x315853,.38,.48),edge:mat(0x50796b,.41,.38),dark:mat(0x233e3c,.4,.49),
 brass:mat(0xc19b60,.31,.7),bright:mat(0xdfbb77,.27,.64),bronze:mat(0x76674e,.41,.66),
 cream:mat(0xdac9aa,.8),stone:mat(0xafa795,.86),stucco:mat(0xc9b698,.85),russet:mat(0xa78972,.81),
 shadow:mat(0x484c45,.62),wood:mat(0x684833,.55),walnut:mat(0x9b6f46,.47),oak:mat(0xc29762,.54),
 green:mat(0x426661,.46),red:mat(0x975f4a,.58),sage:mat(0x829486,.64),linen:mat(0xe2d3ad,.8),
 stripe:mat(0x9d5943,.77),stripeGreen:mat(0x587d73,.76),iron:mat(0x374944,.48,.55),
 glass:mat(0x99b6ae,.16,.55,{transparent:true,opacity:.15,depthWrite:false,side:T.DoubleSide}),
 roofGlass:mat(0xb5c9c3,.22,.34,{transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide}),
 upstairs:mat(0x7c9391,.22,.47),upWarm:mat(0xcfb689,.37,.23),recess:mat(0x534e3f,.73),
 lit:mat(0xffdda4,.52,.03,{emissive:0xffb75d,emissiveIntensity:.62}),
 lamp:mat(0xffe0a5,.27,.05,{emissive:0xffc574,emissiveIntensity:2.1}),
 black:mat(0x26332f,.7),chalk:mat(0xf3dfb8,.8),leather:mat(0xad6740,.43),sole:mat(0x53473c,.54),
 water:mat(0x869c96,.12,.46,{transparent:true,opacity:.54,depthWrite:false}),
 ring:mat(0xc9d6ce,.24,.42,{transparent:true,opacity:.41,depthWrite:false}),
 leaf:[0x416150,0x526d56,0x738464,0x8e9771,0x5d7758].map(c=>mat(c,.68)),
 pot:mat(0x906b50,.77),petal:mat(0xddc391,.71),paper:mat(0xf0dec1,.76,{side:T.DoubleSide}),
 paperBlue:mat(0x839f9d,.78),tile:mat(0x707b78,.31,.12),drain:mat(0x525b55,.27,.68)};
const boxG=new T.BoxGeometry(1,1,1), sphG=new T.SphereGeometry(1,14,9),leafG=new T.IcosahedronGeometry(1,1),cache={};
function mesh(p,geo,m,x,y,z){const o=new T.Mesh(geo,m);p.add(o);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;return o}
function box(p,x,y,z,a,b,c,m){const o=mesh(p,boxG,m,x,y,z);o.scale.set(a,b,c);return o}
function ball(p,x,y,z,a,b,c,m,geo=sphG){const o=mesh(p,geo,m,x,y,z);o.scale.set(a,b,c);return o}
function cyl(p,x,y,z,rt,rb,h,m,n=16){const key=[rt,rb,h,n].join(',');const g=cache[key]||(cache[key]=new T.CylinderGeometry(rt,rb,h,n));return mesh(p,g,m,x,y,z)}
function bar(p,a,b,r,m,n=8){const A=v(...a),B=v(...b),d=B.clone().sub(A);const o=cyl(p,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,r,1,m,n);o.scale.y=d.length();o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o}
function tube(p,points,r,m,steps=20){const curve=new T.CatmullRomCurve3(points.map(a=>v(...a)));return mesh(p,new T.TubeGeometry(curve,steps,r,7,false),m,0,0,0)}
function profile(p,x,y,z,points,m,n=24){return mesh(p,new T.LatheGeometry(points.map(([a,b])=>new T.Vector2(a,b)),n),m,x,y,z)}
function tor(p,x,y,z,r,w,m){return mesh(p,new T.TorusGeometry(r,w,7,44),m,x,y,z)}
function extrusion(p,shape,depth,m,x=0,y=0,z=0,bevel=0){return mesh(p,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:!!bevel,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:20}),m,x,y,z)}
function poly(p,pts,depth,m,x=0,y=0,z=0){const sh=new T.Shape();sh.moveTo(...pts[0]);pts.slice(1).forEach(a=>sh.lineTo(...a));sh.closePath();return extrusion(p,sh,depth,m,x,y,z)}
function arch(p,z,base,rx,ry,band,depth,m){const sh=new T.Shape();for(let i=0;i<=36;i++){const a=pi*i/36;sh[i?'lineTo':'moveTo'](rx*Math.cos(a),base+ry*Math.sin(a))}
for(let i=36;i>=0;i--){const a=pi*i/36;sh.lineTo((rx-band)*Math.cos(a),base+(ry-band)*Math.sin(a))}sh.closePath();return extrusion(p,sh,depth,m,0,0,z)}
function lamp(p,x,y,z,scale=1){const a=group(p,x,y,z);a.scale.setScalar(scale);
 box(a,0,.38,-.14,.13,.24,.06,M.iron);tube(a,[[0,.38,-.14],[0,.53,.09],[0,.48,.27],[0,.37,.27]],.023,M.bronze,12);
 const k=group(a,0,0,.27);cyl(k,0,.23,0,.024,.035,.23,M.iron);cyl(k,0,.12,0,.07,.22,.13,M.iron,6);
 cyl(k,0,-.084,0,.172,.102,.29,M.lamp,6);cyl(k,0,-.25,0,.13,.055,.06,M.bronze,6);ball(k,0,-.31,0,.035,.055,.035,M.brass);
 for(let i=0;i<6;i++){let ang=i*tau/6;bar(k,[.17*Math.sin(ang),.06,.17*Math.cos(ang)],[.103*Math.sin(ang),-.23,.103*Math.cos(ang)],.011,M.dark,6)}
}
function pot(p,x,y,z,scale=1,flowers=false){const a=group(p,x,y,z);a.scale.setScalar(scale);
 profile(a,0,0,0,[[.22,0],[.24,.045],[.23,.08],[.32,.46],[.34,.47],[.34,.53],[.28,.54]],M.pot);
 cyl(a,0,.503,0,.28,.28,.018,M.recess);bar(a,[0,.51,0],[.025,1.05,0],.032,M.wood);
 for(let i=0;i<34;i++){const ang=rnd()*tau,rr=Math.sqrt(rnd())*.31,xx=Math.cos(ang)*rr,zz=Math.sin(ang)*rr;
 const yy=.66+.46*Math.sqrt(Math.max(0,1-rr*rr/.1))+rnd()*.13,rad=.09+rnd()*.065;
 const l=ball(a,xx,yy,zz,rad,rad*(.82+rnd()*.6),rad*.9,M.leaf[i%5],leafG);l.rotation.z=rnd();
 if(flowers&&i%3===0)ball(a,xx,yy+.105,zz,.048,.038,.046,M.petal,leafG)}
}
function boot(p,x,y,z,scale,m=M.leather){const g=group(p,x,y,z);g.scale.setScalar(scale);
 const sh=new T.Shape();sh.moveTo(-.27,.032);sh.quadraticCurveTo(-.34,.08,-.27,.15);sh.quadraticCurveTo(-.25,.18,-.09,.19);
 sh.quadraticCurveTo(-.02,.21,-.03,.39);sh.lineTo(.18,.4);sh.lineTo(.205,.12);sh.quadraticCurveTo(.23,.035,.17,.032);sh.closePath();
 const o=extrusion(g,sh,.16,m,0,0,-.08,.022);box(g,-.037,.028,0,.56,.05,.205,M.sole);
 box(g,.09,.385,0,.246,.031,.201,M.walnut);for(let j=0;j<3;j++)bar(g,[-.07+j*.015,.19+j*.052,.096],[-.014+j*.017,.202+j*.052,.098],.009,M.linen);
 return g
}
// The cobbles have a bevel, a slightly crowned top and individual mineral colour.
const paverColors=[0x8d938b,0x79837e,0x8c8d82,0x9b9a8c,0x727f7c,0x87918c,0xa2a094,0x767e77,0x91978e].map(c=>mat(c,.39,.12));
// Material-scale grain is generated locally from mineral veins and fibres.
function surfaceTexture(type){
 return texture(192,192,(c,w,h)=>{const d=c.createImageData(w,h);let grains=[];
 for(let i=0;i<64;i++)grains.push(rnd());for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const ax=x/24,ay=y/24,ix=Math.floor(ax),iy=Math.floor(ay),fx=(1-Math.cos(pi*(ax-ix)))*.5,fy=(1-Math.cos(pi*(ay-iy)))*.5;
 const at=(dx,dy)=>grains[((ix+dx)%8)+8*((iy+dy)%8)];
 const vein=(at(0,0)*(1-fx)+at(1,0)*fx)*(1-fy)+(at(0,1)*(1-fx)+at(1,1)*fx)*fy;
 let n=type==='wood'?225+9*Math.sin(x*.26+Math.sin(y*tau/h)*1.7+vein*5)+6*Math.sin(x*1.05+vein*4):
 type==='cloth'?241+(x%3===0?-8:1)+(y%3===0?-6:2):215+vein*25;
 n+=(rnd()-.5)*(type==='stone'?23:9);if(type==='stone'&&rnd()<.021)n-=15;
 let i=(y*w+x)*4;d.data[i]=n+2;d.data[i+1]=n+1;d.data[i+2]=n;d.data[i+3]=255}c.putImageData(d,0,0)})
}
const rockGrain=surfaceTexture('stone'),woodGrain=surfaceTexture('wood'),weave=surfaceTexture('cloth');
for(const m of [...paverColors,M.stone,M.stucco,M.russet,M.cream]){m.map=rockGrain;m.bumpMap=rockGrain;m.bumpScale=.007}
for(const m of [M.walnut,M.oak,M.wood]){m.map=woodGrain;m.bumpMap=woodGrain;m.bumpScale=.003}
for(const m of [M.stripe,M.stripeGreen,M.linen])m.map=weave;
const paverG=(()=>{const pos=[],uv=[];const rings=[];for(const [rad,y] of [[1,-.5],[1,.12],[.971,.47],[.79,.5]]){const a=[];for(const [x,z] of [[-.46,-.5],[.46,-.5],[.5,-.42],[.5,.42],[.46,.5],[-.46,.5],[-.5,.42],[-.5,-.42]])a.push([x*rad,y,z*rad]);rings.push(a)}
 const tri=(a,b,c)=>{pos.push(...a,...b,...c);uv.push(a[0],a[2],b[0],b[2],c[0],c[2])};
 for(let k=1;k<4;k++)for(let j=0;j<8;j++){let i=(j+1)%8;tri(rings[k-1][j],rings[k][j],rings[k][i]);tri(rings[k-1][j],rings[k][i],rings[k-1][i])}
 for(let j=0;j<8;j++)tri([0,.515,0],rings[3][(j+1)%8],rings[3][j]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g})();
box(staticRoot,0,-.109,-10,30,.16,65,M.shadow);
const settBatch=[];for(let row=0;row<137;row++){const z=13-row*.328;for(let col=0;col<14;col++){
 const x=(col-6.75+(row%2)*.5)*.47;const o=mesh(staticRoot,paverG,paverColors[Math.floor(rnd()*paverColors.length)],x,-.014+rnd()*.009,z+(rnd()-.5)*.012);
 o.scale.set(.455+rnd()*.014,.057,.315+rnd()*.009);o.rotation.y=(rnd()-.5)*.034;settBatch.push(o)}}
for(const side of [-1,1]){box(staticRoot,side*3.9,.018,-9,2.6,.18,47,M.stone);
 for(let j=0;j<53;j++)box(staticRoot,side*2.72,.097,13-j*.86,.29,.174,.847,j%3===0?M.cream:M.stone);
 for(let k=0;k<5;k++){const z=4-k*7.3;box(staticRoot,side*2.48,.027,z,.205,.017,.65,M.shadow);
 for(let j=0;j<9;j++)box(staticRoot,side*2.48,.041,z-.295+j*.072,.2,.02,.026,M.drain)}}
function windowUnit(p,x,y,width,height,warm=false){
 box(p,x,y,-.054,width+.19,height+.23,.12,M.stone);box(p,x,y,.025,width,height,.06,M.dark);
 box(p,x,y,.069,width-.095,height-.1,.024,warm?M.upWarm:M.upstairs);
 for(let i=-1;i<=1;i+=2){box(p,x+i*(width*.5-.035),y,.102,.055,height,.055,M.cream)}
 box(p,x,y,.116,.047,height-.05,.046,M.cream);box(p,x,y+.06,.125,width-.04,.05,.04,M.cream);
 box(p,x,y-height*.5-.045,.115,width+.27,.115,.25,M.cream);
 box(p,x,y+height*.5+.06,.087,width+.22,.11,.22,M.cream)
}
function awning(p,width,stripe,level=2.55){
 const count=Math.round(width/.34),w=width/count;
 for(let i=0;i<count;i++){const m=i%2?M.linen:stripe,x=-width/2+(i+.5)*w;
 const b=box(p,x,level+.14,.48,w+.002,.053,.99,m);b.rotation.x=.245;
 const sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(w/2,-.12);sh.quadraticCurveTo(0,-.226,-w/2,-.12);sh.closePath();extrusion(p,sh,.033,m,x,level+.025,.956)}
 bar(p,[-width/2,level+.015,.929],[width/2,level+.015,.929],.023,M.brass)
}
const displayLights=[];
function facade(side,z,w,style,stories=2){
 const light=M.lit.clone();displayLights.push([light,Math.max(0,Math.min(9,Math.round((-z-3)/2.05)))]);

 const a=group(staticRoot,side*3.82,.16,z);a.rotation.y=-side*pi/2;
 const frame=[M.green,M.red,M.sage,M.walnut][style%4],wall=[M.stucco,M.russet,M.cream,M.stone][style%4];
 const craft=(side===-1&&Math.abs(z+7.64)<.1)||(side===1&&Math.abs(z+16.24)<.1);
 if(craft){box(a,0,5.42,-1.18,w,5.16,2.28,wall);workshop(a,w,side===-1)}
 else{box(a,0,4,-1.18,w,8,2.28,wall);box(a,0,1.36,-.6,w,2.72,1.0,M.recess);
 // Real recessed display bays, plinth, raised panels, narrow mullions and transoms.
 for(const sign of [-1,1]){const x=sign*w*.315,ww=w*.333;
 box(a,x,1.34,-.05,ww,1.91,.08,light);box(a,x,.78,.23,ww,.079,.58,M.oak);
 box(a,x,1.38,.377,ww,1.13,.018,M.glass);box(a,x,1.98,.36,ww,.055,.06,frame);
 for(let j=-1;j<=1;j++)box(a,x+j*ww*.5,1.58,.38,.044,1.66,.082,frame);
 box(a,x,.4,.22,ww,.72,.4,frame);box(a,x,.42,.438,ww-.14,.47,.035,M.dark);
 box(a,x,.43,.471,ww-.23,.36,.028,frame);
 box(a,x,.774,.32,ww+.07,.076,.44,M.cream);
 // Still lives behind each pane.
 for(let j=0;j<3;j++){const px=x+(j-1)*ww*.26;
 if(style%4===0){boot(a,px,.824,.19,.71,j%2?M.walnut:M.leather)}
 else if(style%4===1){for(let k=0;k<3;k++){let b=box(a,px,.846+k*.07,.18,.28-k*.023,.058,.21,[M.paperBlue,M.linen,M.red][k]);b.rotation.y=j*.07}}
 else {profile(a,px,.82,.18,[[.08,0],[.1,.04],[.095,.18],[.055,.25],[.048,.31]],j%2?M.sage:M.pot,12)}}
 }
 box(a,0,1.22,.075,w*.23,2.42,.16,frame);box(a,0,1.5,.174,w*.23-.13,1.36,.033,M.upWarm);
 box(a,0,1.53,.206,.032,1.28,.032,frame);box(a,0,1.62,.21,w*.23-.11,.044,.034,frame);
 box(a,0,.43,.19,w*.23-.14,.53,.047,M.dark);bar(a,[w*.082,.87,.264],[w*.082,1.14,.264],.022,M.brass);
 }for(const sg of [-1,1]){const x=sg*(w*.5-.102);box(a,x,1.48,.245,.21,2.96,.43,frame);
 box(a,x,.23,.28,.32,.46,.51,frame);box(a,x,2.65,.28,.35,.14,.52,M.brass);
 box(a,x,4.83,.03,.21,3.91,.24,wall)}
 box(a,0,2.68,.2,w,.43,.45,frame);box(a,0,2.91,.29,w+.1,.11,.59,M.cream);
 box(a,0,2.52,.36,w-.15,.035,.15,M.brass);awning(a,w-.28,style%2?M.stripe:M.stripeGreen,2.38);
 box(a,0,3.22,.01,w+.08,.12,.23,wall);
 for(let floor=0;floor<stories;floor++){for(let j=-1;j<=1;j++)windowUnit(a,j*w*.313,4.05+floor*1.91,w*.198,1.22,(j+style+floor)%4===0);
 box(a,0,4.98+floor*1.91,.018,w+.13,.126,.29,M.cream)}
 box(a,0,7.38,-.55,w+.26,.28,1.44,M.stone);box(a,0,7.57,-.51,w+.35,.14,1.6,M.cream);
 lamp(a,w*.455,2.05,.38,.84);return a
}
for(const side of [-1,1]){
 const zs=[7.65,2.52,-2.6,-7.64,-12.04,-16.24,-20.64];
 zs.forEach((z,i)=>facade(side,z,i<=3?5.08:4.26,side===-1?[1,2,3,0,2,1,3][i]:[2,3,0,2,3,1,0][i]));
}
// Iron-and-glass arcade, cast flanges and independent arched roof bays.
const portalZ=-3,span=3.04,base=3.45,rise=1.42;
for(let n=0;n<7;n++){const z=portalZ-n*2.9;
 arch(staticRoot,z,base,span,rise,n===0?.19:.085,n===0?.32:.09,n===0?M.emerald:M.edge);
 for(const sign of [-1,1]){const x=span*sign;
 cyl(staticRoot,x,1.73,z,.085,.118,3.21,M.emerald,12);
 profile(staticRoot,x,.12,z,[[.20,0],[.2,.09],[.155,.13],[.15,.39],[.115,.44]],M.dark,12);
 profile(staticRoot,x,3.23,z,[[.092,0],[.15,.025],[.14,.095],[.22,.14],[.22,.21]],M.edge,12);
 for(const yy of [.58,3.18])cyl(staticRoot,x,yy,z,.125,.125,.039,M.brass);
 tube(staticRoot,[[x,2.74,z],[x-sign*.07,3.12,z],[x-sign*.37,3.44,z],[x-sign*.64,3.53,z]],.038,M.emerald);
 if(n<6)bar(staticRoot,[x,3.44,z+.1],[x,3.44,z-2.9],.08,M.edge);
 }
 if(n<6){for(let j=0;j<12;j++){const a=pi*j/12,b=pi*(j+1)/12;const xx=span*Math.cos(a),yy=base+rise*Math.sin(a),xx2=span*Math.cos(b),yy2=base+rise*Math.sin(b);
 const pane=box(staticRoot,(xx+xx2)/2,(yy+yy2)/2,z-1.4,Math.hypot(xx2-xx,yy2-yy),.026,2.8,j===0||j===11?M.edge:M.roofGlass);
 pane.rotation.z=Math.atan2(yy2-yy,xx2-xx);
 bar(staticRoot,[xx,yy,z],[xx,yy,z-2.9],.024,M.edge);
 }if(n%2===1){bar(staticRoot,[0,4.78,z],[0,4.34,z],.018,M.bronze);const l=group(staticRoot,0,3.98,z);lamp(l,0,0,-.2,1.1)}}
}
arch(staticRoot,portalZ+.34,base,span+.036,rise+.036,.048,.04,M.brass);
arch(staticRoot,portalZ+.345,base,span-.158,rise-.16,.034,.038,M.bright);
for(let j=1;j<38;j++){const a=pi*j/38;ball(staticRoot,2.953*Math.cos(a),base+1.322*Math.sin(a),portalZ+.347,.028,.029,.023,M.brass)}
// Gilded fan above the entrance, with a real enamel clock and moulded bezel.
for(const sg of [-1,1]){
 tube(staticRoot,[[sg*.23,4.95,-2.78],[sg*.63,5.11,-2.78],[sg*1.26,4.94,-2.78],[sg*1.64,4.73,-2.78],[sg*1.47,4.70,-2.78]],.031,M.edge);
 tube(staticRoot,[[sg*.36,4.85,-2.76],[sg*.68,5.0,-2.76],[sg*1.04,4.94,-2.76]],.022,M.brass);
 for(let j=0;j<4;j++){let xx=.56+j*.19;let l=ball(staticRoot,sg*xx,5.04-(xx-.66)*.22,-2.77,.108,.033,.025,M.brass);l.rotation.z=sg*(.42-j*.12)}
}
const clock=group(staticRoot,0,4.99,portalZ+.34);
function disk(p,x,y,z,r,d,m,n=48){const o=cyl(p,x,y,z,r,r,d,m,n);o.rotation.x=pi/2;return o}
disk(clock,0,0,0,.49,.16,M.dark);disk(clock,0,0,.105,.428,.054,M.chalk);tor(clock,0,0,.144,.44,.036,M.brass);tor(clock,0,0,.143,.375,.009,M.bronze);
for(let i=0;i<12;i++){const a=i*tau/12;const d=box(clock,.33*Math.sin(a),.33*Math.cos(a),.145,.022,i%3===0?.079:.045,.016,M.bronze);d.rotation.z=-a}
bar(clock,[0,0,.166],[.158,-.125,.166],.021,M.dark);bar(clock,[0,0,.17],[.18,.185,.17],.012,M.dark);disk(clock,0,0,.185,.032,.026,M.brass);
ball(clock,0,.516,0,.065,.084,.065,M.brass);
// The two studios are hollow rooms with a glazed transom and a street-facing bench.
function workshop(a,w,shoe){
 const paint=shoe?M.green:M.red;
 box(a,0,1.39,-1.45,w,2.8,.13,M.stucco);box(a,0,.015,-.52,w,.12,2.04,M.oak);
 for(const sg of [-1,1]){box(a,sg*(w/2-.09),1.4,-.61,.18,2.8,1.9,paint);
 box(a,sg*(w/2-.25),1.26,.33,.14,2.54,.2,paint)}
 box(a,0,2.55,-.545,w,.13,1.97,M.cream);box(a,0,2.15,.20,w,.055,.075,paint);
 for(let j=-3;j<=3;j++)box(a,j*w/8,2.33,.2,.031,.31,.05,paint);
 for(let k=0;k<2;k++){const yy=1.28+k*.55;box(a,0,yy,-1.14,w*.79,.061,.45,M.walnut);
 for(let j=-2;j<=2;j++){const xx=j*w*.14;if(shoe)boot(a,xx,yy+.057,-1.1,.66+(j%2)*.05,j%2?M.leather:M.wood);
 else for(let n=0;n<4;n++){const b=box(a,xx+n*.069,yy+.17,-1.1,.058,.27+(n%3)*.052,.19,[M.sage,M.red,M.linen,M.paperBlue][n]);b.rotation.z=n===3?-.11:0}}}
 box(a,0,.42,-.015,w*.72,.76,.88,paint);box(a,0,.842,.035,w*.77,.108,1.12,M.walnut);box(a,0,.861,.035,w*.78,.045,1.13,M.oak);
 for(let j=-1;j<=1;j++){box(a,j*w*.23,.44,.441,w*.20,.44,.045,M.dark);box(a,j*w*.23,.44,.47,w*.20-.071,.35,.034,paint)}
 for(const sg of [-1,1])lamp(a,sg*w*.364,1.73,-.44,.69);
 if(!shoe){cyl(a,-1.12,1.035,-.14,.103,.083,.28,M.sage);for(let i=0;i<8;i++){
 const ang=rnd()*tau;bar(a,[-1.12,1.02,-.14],[-1.12+Math.cos(ang)*.1,1.39+rnd()*.14,-.14+Math.sin(ang)*.1],.013,[M.red,M.sage,M.oak][i%3])}}
}
const shopSigns=[];function signboard(side,z,shoe){
 const a=group(dynamic,side*2.74,2.86,z);
 shopSigns.push(a);bar(a,[side*.97,.39,0],[-side*.07,.39,0],.031,M.dark);tube(a,[[side*.94,.1,0],[side*.77,.32,0],[side*.4,.35,0],[.02,.41,0]],.021,M.brass);
 for(const x of [-.235,.235])bar(a,[x,.37,0],[x,.18,0],.015,M.bronze);
 const sh=new T.Shape();sh.moveTo(-.47,-.09);sh.quadraticCurveTo(-.47,-.26,-.32,-.27);sh.quadraticCurveTo(0,-.39,.32,-.27);sh.quadraticCurveTo(.47,-.26,.47,-.09);sh.lineTo(.47,.11);sh.quadraticCurveTo(.47,.24,.32,.24);sh.lineTo(-.32,.24);sh.quadraticCurveTo(-.47,.24,-.47,.11);sh.closePath();
 extrusion(a,sh,.07,M.brass);const face=extrusion(a,sh,.079,shoe?M.emerald:M.red,0,0,.011);face.scale.set(.935,.88,1);
 if(shoe)boot(a,.015,-.15,.116,.72,M.chalk);
 else{const j=group(a,0,-.02,.13);j.rotation.z=-.58;poly(j,[[-.08,-.04],[0,-.22],[.08,-.04],[.065,.17],[-.065,.17]],.021,M.chalk);
 box(j,0,-.064,.035,.011,.165,.006,M.bronze);disk(j,0,.016,.034,.022,.012,M.bronze)}
}
signboard(-1,-5.3,true);signboard(1,-13.7,false);
pot(staticRoot,-2.68,0,-2.6,1.1,true);pot(staticRoot,2.69,0,-2.62,1.15);
pot(staticRoot,-3.05,.185,3.2,1.28);pot(staticRoot,3.04,.18,.42,1.18,true);
pot(staticRoot,-2.94,.17,-9.48,.78);pot(staticRoot,2.88,.17,-18,.84,true);
// Entrance umbrella rack. Its brass hoop stays in place after the umbrella rises.
const rack=group(staticRoot,-1.06,.015,3.57);
profile(rack,0,0,0,[[.225,0],[.238,.035],[.226,.08],[.152,.105],[.115,.16]],M.dark,28);
cyl(rack,0,.325,0,.039,.056,.46,M.dark);ball(rack,0,.59,0,.055,.061,.055,M.brass);
tube(rack,[[0,.49,0],[.045,.55,0],[.16,.563,0]],.021,M.brass);tor(rack,.245,.558,0,.126,.022,M.brass).rotation.x=pi/2;
// A little courtyard with stone edging, fountain, waterwheel and a copper rill.
const plaza=group(staticRoot,0,0,-26.7);
for(const side of [-1,1]){
 for(let i=0;i<3;i++){const tree=group(plaza,side*(3.5+i*.93),0,1.85-i*2.83);
 const size=.83+rnd()*.32;tree.scale.setScalar(size);
 profile(tree,0,0,0,[[.49,0],[.52,.1],[.45,.17],[.49,.69],[.53,.75],[.52,.81]],M.stone);
 bar(tree,[0,.61,0],[.04,2.33,0],.106,M.wood);
 for(let j=0;j<38;j++){const a=rnd()*tau,r=Math.sqrt(rnd())*.87;const b=ball(tree,r*Math.cos(a),2.16+rnd()*.9+.47*(1-r),r*Math.sin(a),.28+rnd()*.25,.33+rnd()*.26,.3+rnd()*.2,M.leaf[j%5],leafG);b.rotation.z=rnd()}}
 const b=group(plaza,side*2.9,.07,-1.8);b.rotation.y=-side*pi*.37;
 for(const x of [-.67,.67]){box(b,x,.23,0,.078,.46,.49,M.iron);bar(b,[x,.32,-.22],[x,.93,-.34],.033,M.iron)}
 for(let j=0;j<4;j++)box(b,0,.485,-.235+j*.13,1.75,.052,.115,M.walnut);
 for(let j=0;j<3;j++)box(b,0,.65+j*.118,-.3-j*.015,1.75,.085,.055,M.walnut)
}
profile(plaza,0,0,-2.15,[[1.36,0],[1.42,.085],[1.33,.136],[1.3,.34],[1.38,.375],[1.37,.435],[1.15,.435],[1.13,.31]],M.stone,48);
cyl(plaza,0,.355,-2.15,1.15,1.15,.025,M.water,48);
profile(plaza,0,.31,-2.15,[[.32,0],[.34,.075],[.2,.14],[.15,.38],[.29,.53],[.61,.61],[.69,.72],[.68,.78],[.16,.77],[.13,1.04],[.29,1.11],[.32,1.19],[.09,1.21],[.065,1.36]],M.edge,48);
for(const x of [-.45,.45])box(plaza,x,.17,1.99,.12,.3,4.48,M.stone);
box(plaza,0,.083,1.99,.8,.053,4.48,M.water);
for(let j=0;j<2;j++)box(plaza,(j-.5)*1.04,.44,3.99,.13,.8,.21,M.walnut);
bar(plaza,[-.57,.92,3.99],[.57,.92,3.99],.064,M.brass);
const gate=group(dynamic,0,.16,-22.72);for(let j=0;j<3;j++)box(gate,0,.082+j*.12,0,.86,.115,.08,M.oak);
const wheel=group(dynamic,-.7,.57,-23.25);wheel.rotation.y=pi/2;
const wheelSpin=group(wheel);for(let j=0;j<2;j++)tor(wheelSpin,0,0,(j-.5)*.24,.48,.032,M.bronze);
for(let j=0;j<10;j++){const a=j*tau/10;
 bar(wheelSpin,[0,0,0],[.47*Math.cos(a),.47*Math.sin(a),0],.02,M.brass);
 const p=box(wheelSpin,.465*Math.cos(a),.465*Math.sin(a),0,.13,.045,.32,M.oak);p.rotation.z=a}
const prism=group(dynamic,0,1.83,-28.85);const gem=mesh(prism,new T.OctahedronGeometry(.21),mat(0xc3e8db,.09,.57),0,0,0);gem.scale.y=1.6;
const rainbow=group(dynamic,0,0,-35.4);const rainbowM=[];
for(let j=0;j<6;j++){const m=mat([0xdba996,0xe5b995,0xdfcf9d,0xa9c6ac,0x9dbbc7,0xabaec4][j],.65,0,{transparent:true,opacity:0,depthWrite:false});
 const pts=[];for(let n=0;n<=40;n++){const a=pi*n/40;pts.push([(8-j*.11)*Math.cos(a),.4+(7.45-j*.11)*Math.sin(a),0])}tube(rainbow,pts,.061,m,48);rainbowM.push(m)}
// Far terraces give the fountain an open view between the roof lines.
for(let i=-4;i<=4;i++){const x=i*3.5+1.05,h=4+rnd()*2,z=-37-rnd()*2;
 const a=group(staticRoot,x,0,z);box(a,0,h/2,-.7,3.46,h,2.2,[M.stucco,M.sage,M.russet][(i+4)%3]);
 poly(a,[[-1.9,0],[0,1.21],[1.9,0]],2.4,M.shadow,0,h,-1.89);
 for(let j=0;j<2;j++)for(const xx of [-.84,.84])windowUnit(a,xx,1.35+j*2.07,.71,1.12,(j+i)%2===0);
 box(a,1.13,h+.87,-.2,.32,1.61,.33,M.russet);box(a,1.13,h+1.68,-.2,.42,.12,.43,M.stone)}
// Reflections use a projective view of these actual buildings and the canopy.
const pools=[[-.75,1.25],[.78,-1.4],[-.55,-4.8],[.45,-10.2],[-.9,-19.8],[.8,-22.5]].map(([x,z],i)=>{
 const shape=new T.Shape();const pts=[];for(let j=0;j<34;j++){const a=tau*j/34,r=.87+rnd()*.17;
 pts.push(new T.Vector2(r*Math.cos(a)*(.61+i%2*.12),r*Math.sin(a)*.79))}
 shape.moveTo(pts[0].x,pts[0].y);shape.splineThru([...pts.slice(1),pts[0]]);shape.closePath();const m=mat(0x8ba09e,.11,.48);
 const puddle=mesh(dynamic,new T.ShapeGeometry(shape,28),m,x,.023,z);puddle.rotation.x=-pi/2;puddle.castShadow=false;
 const rings=[];for(let j=0;j<7;j++){const ring=tor(dynamic,x,.033,z,1,.011,M.ring.clone());ring.rotation.x=-pi/2;ring.castShadow=false;rings.push(ring)}
 return {puddle,rings}
});
// A palm-sized stitched boot hops between three sounding blocks.
const shoes=group(dynamic,-3.52,1.055,-7.64);shoes.rotation.y=pi/2;
const blocks=[],targets={};for(let i=0;i<3;i++){const slab=group(shoes,(i-1)*.54,0,.09);
 box(slab,0,.052,0,.50,.094,.56,[M.oak,M.stone,M.emerald][i]);box(slab,0,.103,0,.451,.012,.506,[M.walnut,M.tile,M.water][i]);
 if(i===0)for(let j=-2;j<=2;j++)box(slab,j*.088,.113,0,.005,.004,.45,M.oak);
 if(i===2){for(let j=0;j<2;j++){const q=tor(slab,0,.115,0,.077+j*.062,.005,M.ring);q.rotation.x=pi/2}}
 blocks.push(slab);targets['sole'+i]=slab}
const littleBoot=boot(shoes,0,.116,.095,1.04);targets.boot=littleBoot;
// Open sketchbook: cream deckled edges, sewn spine and a flexible illustrated leaf.
const desk=group(dynamic,3.47,1.07,-16.24);desk.rotation.y=-pi/2;
const book=group(desk);book.rotation.y=-.09;
box(book,0,0,0,1.34,.046,.875,M.green);
for(const side of [-1,1])for(let k=0;k<4;k++)box(book,side*.316,.031+k*.013,0,.623,.014,.829-k*.002,k%2?M.paper:M.linen);
const ink=texture(384,512,(c,w,h)=>{c.fillStyle='#eee0bf';c.fillRect(0,0,w,h);c.strokeStyle='#aa9875';c.lineWidth=1.8;c.strokeRect(18,19,w-36,h-38);
 c.strokeStyle='#819483';c.lineWidth=3;c.beginPath();c.moveTo(98,429);c.bezierCurveTo(139,340,175,226,268,92);c.stroke();
 for(let j=0;j<9;j++){const y=390-j*32,x=112+j*16,sg=j%2?-1:1;c.save();c.translate(x,y);c.rotate(sg*.7);
 c.fillStyle=['#899a84','#a9ac8b','#7b917d'][j%3];c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-24,-24,-18,-46,0,-66);c.bezierCurveTo(18,-39,12,-18,0,0);c.fill();c.restore()}
 for(let j=0;j<800;j++){c.fillStyle='rgba(128,105,65,.09)';c.fillRect(rnd()*w,rnd()*h,1,1)}});
const pageM=mat(0xfff4dc,.8,0,{map:ink,side:T.DoubleSide});
const leafGeo=new T.PlaneGeometry(.62,.82,15,1);const pageMesh=mesh(book,leafGeo,pageM,0,.094,0);pageMesh.castShadow=true;targets.page=book;
const boat=group(dynamic,0,.21,-23.04);
function origami(p,size){const g=group(p);g.scale.setScalar(size);
 const faces=[[[0,.01,-.41],[-.17,.18,0],[0,.04,.44]],[[0,.01,-.41],[0,.04,.44],[.17,.18,0]],[[0,.01,-.41],[.17,.18,0],[0,.32,.04]],[[0,.01,-.41],[0,.32,.04],[-.17,.18,0]],[[0,.04,.44],[-.17,.18,0],[0,.32,.04]],[[0,.04,.44],[0,.32,.04],[.17,.18,0]]];
 faces.forEach((points,i)=>{const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geo.computeVertexNormals();mesh(g,geo,i%2?M.paper:M.linen,0,0,0).material.side=T.DoubleSide});return g}
origami(boat,.92);const bookBoat=origami(book,.45);bookBoat.position.set(.32,.099,0);
const litFixtures=[];for(let i=0;i<10;i++){let side=i%2?1:-1;
 const p=group(dynamic,side*2.95,2.13,-3-i*2.05);
 bar(staticRoot,[side*3.61,2.46,-3-i*2.05],[side*2.95,2.46,-3-i*2.05],.022,M.bronze);
 bar(p,[0,.33,0],[0,.122,0],.012,M.bronze);cyl(p,0,.113,0,.045,.115,.079,M.emerald,8);
 cyl(p,0,-.114,0,.081,.057,.037,M.bronze,8);
 const b=ball(p,0,0,0,.084,.119,.084,M.lamp.clone());litFixtures.push(b.material)}
// Merge the fixed architecture once. Repeated setts share instanced bevel geometry.
function batch(root){
 root.updateWorldMatrix(true,true);const by=new Map(),pavers=new Map();
 root.traverse(o=>{if(!o.isMesh)return;const map=o.geometry===paverG?pavers:by;if(!map.has(o.material))map.set(o.material,[]);map.get(o.material).push(o)});
 const result=group(scene);for(const [m,arr] of pavers){const inst=new T.InstancedMesh(paverG,m,arr.length);
 arr.forEach((o,i)=>inst.setMatrixAt(i,o.matrixWorld));inst.receiveShadow=true;result.add(inst)}
 for(const [m,arr] of by){const pos=[],norm=[],uv=[],inds=[];let offset=0;
 const a=v(0,0,0),b=v(0,0,0),nmat=new T.Matrix3();
 for(const o of arr){const g=o.geometry,pp=g.attributes.position,nn=g.attributes.normal,tt=g.attributes.uv;nmat.getNormalMatrix(o.matrixWorld);
 for(let i=0;i<pp.count;i++){a.fromBufferAttribute(pp,i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(nn,i).applyNormalMatrix(nmat);
 pos.push(a.x,a.y,a.z);norm.push(b.x,b.y,b.z);uv.push(tt?tt.getX(i):0,tt?tt.getY(i):0)}
 if(g.index){for(const idx of g.index.array)inds.push(idx+offset)}else{for(let i=0;i<pp.count;i++)inds.push(offset+i)}offset+=pp.count}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(inds);g.computeBoundingSphere();
 const o=mesh(result,g,m,0,0,0);o.castShadow=!m.transparent}
 scene.remove(root);root.clear();return result
}
const architecture=batch(staticRoot);settBatch.length=0;
// The folded umbrella rests ferrule-down. Runner, stretchers, fabric gores
// and rolled hem all follow the radius of their own spring-loaded rib.
const umbrella=group(dynamic);targets.umbrella=umbrella;
const yellow=[0xeabb44,0xe5ab2c,0xeab137,0xf0bc47,0xdfa431].map(c=>mat(c,.52,.035,{side:T.DoubleSide}));
for(const m of yellow){m.map=weave;m.bumpMap=weave;m.bumpScale=.0018}
const piping=mat(0xc49131,.51,.05),ferrule=mat(0xbf9b61,.3,.76);
cyl(umbrella,0,.015,0,.016,.019,1.36,M.bronze);
tube(umbrella,[[0,-.58,0],[0,-.72,0],[.017,-.81,0],[.082,-.853,0],[.151,-.823,0],[.17,-.758,0],[.166,-.714,0]],.041,M.walnut,28);
ball(umbrella,.166,-.71,0,.04,.041,.041,M.brass);
cyl(umbrella,0,-.584,0,.029,.031,.076,M.brass);
profile(umbrella,0,.653,0,[[.053,0],[.049,.051],[.029,.073],[.016,.16],[.012,.18]],ferrule,18);
const fabric=[],gores=[],runner=cyl(umbrella,0,0,0,.034,.029,.075,M.bronze),strap=group(umbrella);
tor(strap,0,0,0,.124,.02,M.walnut).rotation.x=pi/2;ball(strap,.018,.006,.127,.027,.022,.012,M.brass);
function thinLine(p,n,r,m){const g=new T.BufferGeometry();const pos=new Float32Array(n*7*3),ind=[];
 for(let j=0;j<n-1;j++)for(let k=0;k<7;k++){const a=j*7+k,b=j*7+(k+1)%7;ind.push(a,b,a+7,b,b+7,a+7)}
 g.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));g.setIndex(ind);
 const o=mesh(p,g,m,0,0,0);o.frustumCulled=false;return (pts)=>{for(let j=0;j<n;j++)for(let k=0;k<7;k++){
 const a=k*tau/7,pp=pts[j];g.attributes.position.setXYZ(j*7+k,pp[0]+r*Math.cos(a),pp[1]+r*Math.sin(a),pp[2]+r*Math.sin(a)*.6)}
 g.attributes.position.needsUpdate=true;g.computeVertexNormals()}}
for(let i=0;i<10;i++){const g=new T.PlaneGeometry(1,1,8,12);g.attributes.position.setUsage(T.DynamicDrawUsage);
 const o=mesh(umbrella,g,yellow[i%5],0,0,0);o.frustumCulled=false;o.userData.rib=i;fabric.push(o);
 const ribline=thinLine(umbrella,13,.004,piping);const hem=thinLine(umbrella,9,.005,piping);
 const stretcher=cyl(umbrella,0,0,0,.007,.007,1,M.bronze,6);
 const end=ball(umbrella,0,0,0,.017,.022,.017,ferrule);
 gores.push({g,ribline,hem,stretcher,end})}
function canopyShape(i,u,f,s){
 const a=(i+u)*tau/10,one=s.rib[i],two=s.rib[(i+1)%10],k=one.opening*(1-u)+two.opening*u,bend=one.bend*(1-u)+two.bend*u;
 const pleat=Math.sin(pi*u),fold=Math.sin(2*pi*u+.65+f*1.3);
 const radial=(1-k)*(.029+f*.116+pleat*pleat*.064*f+fold*.039*f)+(k*(.022+1.025*Math.sin(f*1.34)))*(1-.045*pleat*f);
 const ang=a+(1-k)*(.18*f+.055*fold);
 const y=.666-(1-k)*1.202*f-k*(.098*f+.427*f*f)-pleat*.052*k*f*f+bend*Math.pow(f,1.65);
 return [radial*Math.cos(ang),y,radial*Math.sin(ang)]
}
const qc=new T.Vector3(),qd=new T.Vector3(),up=v(0,1,0);
function shapeUmbrella(s){
 umbrella.position.set(s.x,.847+.94*s.lift,s.z);
 umbrella.rotation.order='YXZ';umbrella.rotation.y=.24+s.heading;umbrella.rotation.z=(pi-.18)*(1-s.tilt)+s.lean;
 umbrella.rotation.x=.035*(1-s.tilt)+s.vz*.043;
 runner.position.y=-.43+s.canopy*.72;strap.position.y=.001;strap.visible=s.canopy<.22;strap.scale.setScalar(.91+s.canopy*.9);
 gores.forEach(({g,ribline,hem,stretcher,end},i)=>{const p=g.attributes.position,r=[],h=[];
 for(let j=0;j<=12;j++)for(let k=0;k<=8;k++){const pt=canopyShape(i,k/8,j/12,s);p.setXYZ(j*9+k,...pt);if(k===0)r.push(pt);if(j===12)h.push(pt)}
 p.needsUpdate=true;g.computeVertexNormals();ribline(r);hem(h);end.position.set(...r[12]);
 qc.set(0,runner.position.y,0);qd.set(...r[7]);stretcher.position.copy(qc).lerp(qd,.5);
 qd.sub(qc);stretcher.scale.y=qd.length();stretcher.quaternion.setFromUnitVectors(up,qd.normalize())})
}
const rainMat=mat(0xc0d0ce,.25,.21,{transparent:true,opacity:.34,depthWrite:false});
const drops=new T.InstancedMesh(new T.CylinderGeometry(.004,.002,1,4),rainMat,370);drops.frustumCulled=false;dynamic.add(drops);
const dust=new T.InstancedMesh(leafG,mat(0xd8c6a3,.85,0,{transparent:true,opacity:.45}),22);dynamic.add(dust);dust.frustumCulled=false;
const spray=new T.InstancedMesh(sphG,M.ring,64);dynamic.add(spray);spray.frustumCulled=false;
const dummy=new T.Object3D();
function place(inst,i,x,y,z,w,h,d,rot=0){dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,0,rot);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)}
const markers=Array.from({length:7},()=>{const g=group(dynamic);const m=M.lamp.clone();
 cyl(g,0,0,0,.079,.08,.014,M.bronze,20);cyl(g,0,.009,0,.048,.05,.013,m,20);return {g,m}});
const eaveDrops=new T.InstancedMesh(sphG,M.ring,12);dynamic.add(eaveDrops);eaveDrops.frustumCulled=false;
// A spring-driven musical handcart, with three independently suspended bells.
const cart=group(dynamic,1.62,0,-25.5),wheels=[],bells=[],clappers=[];
box(cart,0,.38,0,1.32,.14,.63,M.emerald);box(cart,0,.471,0,1.38,.055,.69,M.oak);
box(cart,0,.536,0,1.21,.074,.55,M.walnut);box(cart,0,.349,.331,1.23,.038,.026,M.brass);
for(const x of [-.48,.48]){bar(cart,[x,.18,-.39],[x,.18,.39],.027,M.bronze);
 for(const sg of [-1,1]){const k=group(cart,x,.18,sg*.361);wheels.push(k);
 tor(k,0,0,0,.157,.022,M.dark);tor(k,0,0,0,.135,.012,M.brass);
 for(let j=0;j<6;j++){const a=j*pi/3;bar(k,[0,0,0],[.14*Math.cos(a),.14*Math.sin(a),0],.011,M.brass,6)}
 disk(k,0,0,.008,.037,.064,M.bronze,16)}}
for(const x of [-.595,.595]){bar(cart,[x,.55,0],[x,1.526,0],.034,M.brass);profile(cart,x,.545,0,[[.079,0],[.074,.046],[.041,.096]],M.emerald);ball(cart,x,1.55,0,.059,.072,.059,M.brass)}
bar(cart,[-.625,1.48,0],[.625,1.48,0],.031,M.brass);
for(let i=0;i<3;i++){let x=(i-1)*.37,scale=1-i*.135;const g=group(cart,x,1.463,0);bells.push(g);
 tor(g,0,-.066,0,.054,.012,M.bronze);bar(g,[0,-.091,0],[0,-.164,0],.015,M.bronze);
 const bell=profile(g,0,-.43,0,[[.164,0],[.165,.037],[.135,.055],[.112,.12],[.09,.217],[.065,.254],[.028,.264]],i===0?M.brass:i===1?M.bright:M.bronze,32);bell.scale.setScalar(scale);
 const cl=group(g,0,-.21,0);clappers.push(cl);bar(cl,[0,0,0],[0,-.235,0],.009,M.dark);
 ball(cl,0,-.237,0,.043,.048,.043,M.bronze);targets['bell'+i]=g}
const key=group(cart,0,.712,.296);disk(key,0,0,.065,.081,.16,M.brass);bar(key,[0,0,.163],[0,.165,.163],.023,M.brass);
tor(key,-.082,.173,.165,.083,.023,M.bright);tor(key,.082,.173,.165,.083,.023,M.bright);targets.key=key;
const wetMaterials=[...paverColors,...pools.map(p=>p.puddle.material),M.water];
const worldPoint=(o,dx=0,dy=0,dz=0)=>o.localToWorld(v(dx,dy,dz));
function update(s){
 cart.position.set(s.cartX,0,s.cartZ);
 cart.rotation.y=s.cartYaw;
 wheels.forEach(w=>w.rotation.z=s.axle);bells.forEach((g,i)=>{g.rotation.z=s.bells[i].angle;clappers[i].rotation.z=s.bells[i].clapper-s.bells[i].angle});
 key.rotation.z=-s.keyAngle;shapeUmbrella(s);shopSigns.forEach((g,i)=>{g.rotation.z=s.signs[i].angle});
 markers.forEach(({g,m},i)=>{const b=s.guides[i];g.visible=['arcade','shoeDoor','paperDoor','plaza'].includes(s.stage);
 g.position.set(b.x,.034,b.z);m.emissiveIntensity=.08+b.heat*1.75});
 s.gutters.forEach((g,i)=>{const size=g.falling?.014:.006+.012*g.load/g.capacity;
 place(eaveDrops,i,g.x,g.falling?g.y:3.425,g.z,size,size*(g.falling?2.75:1.3),size)});
 eaveDrops.instanceMatrix.needsUpdate=true;
 gate.position.y=.16+s.gate*.59;wheelSpin.rotation.z=s.wheel;prism.rotation.y=s.wheel*.32;
 boat.position.set(.065*Math.sin(s.boat*1.6),.212+s.basin*.08,-23.04-s.boat);boat.rotation.z=s.boatRoll;boat.rotation.y=.12*s.boat;
 boat.visible=['sluice','sailing','prism','rainbow','bells','winder','winding','return'].includes(s.stage);bookBoat.visible=s.page[9].a>1.5;
 rainbowM.forEach((m,i)=>m.opacity=s.rainbow*(.25+i*.006));
 littleBoot.position.set(s.bootX,.116+s.bootY+(s.bootBusy?0:s.soles[Math.round(s.bootGoal/.54)+1]),.095);littleBoot.rotation.z=-s.bootV*.095;
 displayLights.forEach(([m,i])=>m.emissiveIntensity=.16+s.bulbs[i].heat*.86);
 blocks.forEach((o,i)=>o.position.y=s.soles[i]);litFixtures.forEach((m,i)=>m.emissiveIntensity=s.bulbs[i].heat*2.9);
 const pp=leafGeo.attributes.position;let xx=0,yy=0;
 for(let k=0;k<=15;k++){if(k){const a=s.page[k-1].a;xx+=.62/15*Math.cos(a);yy+=.62/15*Math.sin(a)}
 for(let j=0;j<=1;j++)pp.setXYZ(j*16+k,xx,yy+.016*Math.sin(k*pi/15),j?.41:-.41)}
 pp.needsUpdate=true;leafGeo.computeVertexNormals();
 pools.forEach(({puddle,rings},i)=>{const p=s.pools[i];puddle.position.y=.0235+p.h;
 rings.forEach((r,j)=>{const w=p.rings[j];r.visible=!!w;if(w){r.scale.set(w.radius,w.radius*.88,1);r.position.y=.034+p.h;
 r.material.opacity=Math.min(.5,w.energy*.92)}})});
 drops.count=Math.floor(s.drops.length*(.18+.82*s.rain));
 for(let i=0;i<drops.count;i++){const d=s.drops[i];place(drops,i,d.x,d.y,d.z,1,d.trail*d.v*.175,1,s.wind*.12+.045)}
 drops.instanceMatrix.needsUpdate=true;
 for(let i=0;i<s.dust.length;i++){const d=s.dust[i];const side=i%2?1:-1;place(dust,i,side*(3.7+d.z),.47+d.y,(side<0?-7.64:-16.24)+d.x,.006,.003,.005)}
 dust.instanceMatrix.needsUpdate=true;
 for(let i=0;i<s.jets.length;i++){const j=s.jets[i];place(spray,i,j.x,j.y,j.z-28.85,.014,.032,.014)}spray.instanceMatrix.needsUpdate=true;
}
function focus(s){
 if(s.stage==='umbrella')return worldPoint(umbrella,0,.09,0);
 if(s.stage==='shoe')return worldPoint(littleBoot,0,.28,.10);
 if(s.stage==='soles'){let i=s.tried.findIndex(v=>!v);return worldPoint(blocks[Math.max(0,i)],0,.16,.085)}
 if(s.stage==='paper'||s.stage==='turning')return worldPoint(book,.44,.14,.06);
 if(s.stage==='sluice')return worldPoint(gate,0,.32,0);
 if(s.stage==='bells'){const i=Math.max(0,s.bells.findIndex(b=>!b.touched));return worldPoint(bells[i],0,-.31,0)}
 if(s.stage==='winder'||s.stage==='winding')return worldPoint(key,0,.12,.16);
 if(s.stage==='prism'||s.stage==='rainbow')return worldPoint(prism);
 if(s.stage==='return')return v(s.x,.11,Math.min(3.6,s.z+3));
 const p=RainWalk.path[s.stage];return p?v(p[0],.09,p[1]):v(s.x,1.4,s.z)
}
return {architecture,dynamic,M,pools,shopSigns,fabric,umbrella,targets,blocks,book,gate,prism,boat,update,focus,wetMaterials,grit,mat}
}
