'use strict';
function buildWorkshop(scene){
 const {T,TAU,V,random,noise,mat,wood,m,mesh,box,group,cyl,beam,twig,ball,lathe,stripgeo,curl,batch}=Atelier;
 const R=random(371),room=group(scene),grounds=group(scene),back=group(scene),unit=.0048;
 const local=group(scene,-.02,0,.13);local.rotation.y=-.27;
 const boardRoot=group(local),work=group(local),parts=[],wheels=[];
 function rivet(p,x,y,z,r=.024,front=false) {
   const b=cyl(p,r,r*.98,.014,m.bronze,x,y,z,16);if(front)b.rotation.x=Math.PI/2;
   const slit=box(p,r*1.05,.002,.004,m.darkMetal,x,y+.009,z,.001);
   if(front){slit.position.set(x,y,z+.009);slit.rotation.x=Math.PI/2;}else slit.rotation.y=-.56;
 }
 function porcelain(p,x,y,z,k,color=m.ceramic){
   const g=group(p,x,y,z);g.scale.setScalar(k);
   lathe(g,[[0,0],[.11,0],[.12,.018],[.152,.10],[.15,.22],[.122,.27],[.103,.282],[.105,.30],[.088,.30],[.085,.277],[.1,.257],[0,.255]],color,0,0,0);return g;
 }
 function leafGeo(){
   const g=new T.BufferGeometry(),P=[],idx=[];
   for(let i=0;i<=8;i++){const f=i/8,w=Math.sin(f*Math.PI)**.85;P.push(-w*.30,f,.20*Math.sin(f*3)-w*.07,0,f,.20*Math.sin(f*3),w*.30,f,.20*Math.sin(f*3)-w*.08);if(i<8){const q=i*3;idx.push(q,q+1,q+3,q+1,q+4,q+3,q+1,q+2,q+4,q+2,q+5,q+4);}}
   g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setIndex(idx);g.computeVertexNormals();return g;
 }
 const leaf=leafGeo(),leafM=[0x64734c,0x879161,0x596943,0x9da370].map(c=>mat(c,.76,0,{side:T.DoubleSide}));
 const stems=[];
 function spray(p,x,y,z,scale){
   const g=group(p,x,y,z);g.scale.setScalar(scale);
   for(let j=0;j<7;j++){
     const a=j*2.39,dx=Math.cos(a)*(.15+R()*.18),dz=Math.sin(a)*(.15+R()*.12),h=.35+R()*.34;
     const stem=group(g);stems.push(stem);twig(stem,[0,0,0],[dx,h,dz],.009,.002,m.bark,6);
     for(let i=2;i<=7;i++){const f=i/7,sg=i%2?1:-1,dir=a+sg*1.14;
       const q=mesh(stem,leaf,leafM[(i+j)%4],dx*f,h*f,dz*f);q.quaternion.setFromUnitVectors(V(0,1,0),V(Math.cos(dir)*.8,.42+R()*.4,Math.sin(dir)*.8).normalize());q.scale.setScalar(.13+R()*.08);}
   }
 }
 // A single continuous sill, recessed glazing and built-up arched casing.
 const zWall=-2.68,left=-4.9,right=-.12,sill=.43,spring=1.49,arch=.60,mid=(left+right)/2,rad=(right-left)/2;
 function arcY(x){return spring+arch*Math.sqrt(Math.max(0,1-((x-mid)/rad)**2));}
 for(let j=0;j<18;j++){const x=-7+j*.57;const ma=j%4===0?m.dark:m.wall;
   if(x<left-.18||x>right+.2){let o=box(room,5.8,.565,.16,ma,x,1.5,zWall, .007);o.rotation.z=Math.PI/2;}
   else {let o=box(room,2.3,.56,.16,ma,x,sill-1.2,zWall,.005);o.rotation.z=Math.PI/2;}
 }
 const jamb=box(room,5.8,.19,.16,m.wall,.036,1.5,zWall,.005);jamb.rotation.z=Math.PI/2;
 box(room,5.7,.14,.34,m.trim,mid,sill-.065,zWall+.035,.022);
 box(room,5.78,.055,.39,m.edge,mid,sill-.15,zWall+.035,.012);
 // The arch infill is built to the opening and never covers the landscape.
 const infill=new T.Shape();infill.moveTo(left,4.8);infill.lineTo(left,spring);
 for(let i=0;i<=64;i++){let x=left+(right-left)*i/64;infill.lineTo(x,arcY(x));}infill.lineTo(right,4.8);infill.closePath();
 const inf=mesh(room,new T.ExtrudeGeometry(infill,{depth:.12,bevelEnabled:false}),m.wall);inf.position.z=zWall-.10;
 for(const x of [left,right]){const o=box(room,spring-sill+.13,.14,.24,m.trim,x,(sill+spring)/2,zWall);o.rotation.z=Math.PI/2;}
 function archBand(offset,width,depth,material){
   const s=new T.Shape();
   for(let i=0;i<=100;i++){const a=Math.PI-i*Math.PI/100,x=mid+(rad+offset)*Math.cos(a),y=spring+(arch+offset)*Math.sin(a);i?s.lineTo(x,y):s.moveTo(x,y);}
   for(let i=100;i>=0;i--){const a=Math.PI-i*Math.PI/100;s.lineTo(mid+(rad+offset-width)*Math.cos(a),spring+(arch+offset-width)*Math.sin(a));}s.closePath();
   const a=mesh(room,new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.009,bevelThickness:.008,curveSegments:36}),material);a.position.z=zWall-.07;
 }
 archBand(.115,.155,.23,m.trim);archBand(-.04,.032,.18,m.edge);
 for(const x of [mid-.82,mid+.82]){const h=arcY(x)-sill;const o=box(room,h,.065,.11,m.trim,x,sill+h/2,zWall-.016,.007);o.rotation.z=Math.PI/2;}
 box(room,right-left,.066,.11,m.trim,mid,1.41,zWall-.016,.007);
 const paneShape=new T.Shape();paneShape.moveTo(left,sill);paneShape.lineTo(right,sill);paneShape.lineTo(right,spring);for(let i=0;i<=80;i++){const a=i*Math.PI/80;paneShape.lineTo(mid+rad*Math.cos(a),spring+arch*Math.sin(a));}paneShape.closePath();
 const glass=mesh(room,new T.ShapeGeometry(paneShape),mat(0xcdddce,.18,.25,{transparent:true,opacity:.045,depthWrite:false,side:T.DoubleSide}),0,0,zWall-.12);glass.castShadow=false;
 // Long quartersawn wall rails and the tool till.
 box(room,4.2,.13,.25,m.dark,1.91,.46,zWall+.03);
 box(room,2.8,.32,.10,m.edge,1.52,1.40,zWall+.15,.026);
 box(room,2.85,.085,.22,m.trim,1.52,1.38,zWall+.25,.018);
 for(let j=0;j<5;j++){const x=.44+j*.32,tilt=(j-2)*.04,tool=group(room,x,1.46,zWall+.26);tool.rotation.z=tilt;
   lathe(tool,[[0,-.04],[.048,-.04],[.062,.008],[.06,.065],[.072,.24],[.073,.31],[.059,.35],[.025,.363],[0,.363]],j%2?m.plane:m.trim,0,0,0);
   cyl(tool,.053,.054,.09,m.brass,0,-.055,0);box(tool,.050+j*.009,.40,.025,m.iron,0,-.285,0,.01);
 }
 for(const x of [.22,2.78])rivet(room,x,1.39,zWall+.368,.030,true);
 // A joiner's square hanging on a peg.
 const sq=group(room,2.62,1.78,zWall+.17);sq.rotation.z=-.23;
 box(sq,.18,.66,.088,m.plane,0,0,0);box(sq,.55,.10,.036,m.steel,.20,.26,0);
 for(const yy of [-.23,.20])rivet(sq,0,yy,.044,.021,true);
 const pot=porcelain(scene,-3.65,sill+.015,zWall+.01,1.38);spray(pot,0,.27,0,1.12);
 porcelain(room,-3.22,sill+.015,zWall+.04,.67,m.wax);
 const oil=porcelain(room,-.51,sill+.015,zWall+.055,.86,m.wax);cyl(oil,.093,.096,.025,m.edge,0,.308,0);
 // Table planks have individual coloration and a continuous end apron.
 const topColors=[0xb39471,0xab8866,0xb89974,0xb59776,0xb39470,0xb09471,0xb99a76];
 for(let j=0;j<7;j++){box(room,7.1,.22,.486,wood(topColors[j]),-.22,-.115,-1.54+j*.49,.014);}
 box(room,7.20,.34,.158,m.edge,-.22,-.205,1.705,.022);
 box(room,7.19,.052,.17,m.trim,-.22,-.067,1.705,.01);
 for(const x of [-3.30,2.82])for(const z of [-1.38,1.43])box(room,.28,1.48,.30,m.edge,x,-.92,z);
 box(room,6.3,.27,.20,m.dark,-.22,-.81,1.46);
 const ringMat=mat(0x785f40,.89),hole=mat(0x372e23,.99);
 for(let i=0;i<13;i++){
   const x=-3.34+i*.535;
   cyl(room,.052,.051,.003,ringMat,x,.0005,1.18,24);cyl(room,.039,.039,.004,hole,x,.002,1.18,24);
 }
 for(const x of [-3.35,-1.8,.68,2.74])rivet(room,x,-.22,1.793,.035,true);
 const vise=group(room,-1.18,-.24,1.78);
 box(vise,1.12,.32,.24,m.dark,0,0,0,.035);box(vise,1.18,.32,.19,m.bench2,0,.014,.20,.029);
 let shaft=cyl(vise,.11,.11,.21,m.darkMetal,0,0,.34);shaft.rotation.x=Math.PI/2;
 ball(vise,.097,.10,.105,m.bronze,0,0,.452);twig(vise,[-.16,-.25,.454],[.16,.25,.454],.028,.028,m.trim);
 for(const sg of [-1,1])ball(vise,.049,.048,.049,m.edge,sg*.16,sg*.25,.454);
 // Worn tool marks are fine shallow marks in the top surface.
 const cutMat=mat(0x715c43,.94,0,{transparent:true,opacity:.30});
 const marks=group(room);
 for(let i=0;i<155;i++){const x=(R()-.5)*6.8,z=(R()-.5)*3.15,a=(R()-.5)*.54,len=.03+R()**3*.45;const q=box(marks,len,.0007,.0015+R()*.002,cutMat,x,.0001,z,0);q.rotation.y=a;}
 // Sage linen folded on the table under the sample, with a woven edge.
 function linen(p,x,z,w,d){
   const g=new T.PlaneGeometry(w,d,38,22);g.rotateX(-Math.PI/2);
   const ps=g.attributes.position;for(let i=0;i<ps.count;i++){let a=ps.getX(i),b=ps.getZ(i);ps.setY(i,.014+.008*Math.sin(a*27+b*13)+.007*noise(a*18+3,b*9+6));}g.computeVertexNormals();const q=mesh(p,g,m.cloth,x,.008,z);q.rotation.y=-.09;
 }
 const sampleTable=group(scene,1.28,0,-1.04);linen(sampleTable,.03,-.04,1.60,.78);
 function trestle(p,ma){
   for(const z of [-.245,.245])beam(p,[0,.014,z*1.26],[0,.60,z*.78],.117,ma,.13);
   box(p,.155,.12,.72,ma,0,.54,0,.015);box(p,.085,.085,.56,ma,0,.20,0);
   for(const z of [-.17,.17])cyl(p,.042,.041,.085,m.trim,0,.631,z);
 }
 function sampleBench(p,x,y,z,k){const g=group(p,x,y,z);g.scale.setScalar(k);
   box(g,3.17,.154,.76,m.mini,0,.692,0,.047);
   for(const x of [-1.03,1.03])trestle(group(g,x,0,0),m.leg);
   box(g,2.14,.12,.09,m.trim,0,.22,0);return g;
 }
 const sample=sampleBench(sampleTable,0,.034,0,.405);sample.rotation.y=-.33;
 // A round sunburst maker's stamp in the sample seat.
 const modelPeg=cyl(sample,.070,.07,.005,m.bronze,1.27,.771,0);
 // A low tray with a few cuttings rests at the left margin.
 const tray=group(room,-2.44,0,.00);tray.rotation.y=.19;
 box(tray,.80,.042,.51,m.dark,0,.023,0,.024);
 for(const z of [-.252,.252])box(tray,.82,.092,.035,m.edge,0,.061,z,.009);
 for(const x of [-.40,.40])box(tray,.035,.092,.50,m.edge,x,.061,0,.009);
 for(let i=0;i<5;i++){const q=box(tray,.35+R()*.13,.045,.055,m.trim,(R()-.5)*.32,.065+i*.014,(R()-.5)*.32,.005);q.rotation.y=R()*.38;}
 // Loose plane ribbons, including long open spirals and tighter coils.
 const starter=group(local);
 function shaving(p,x,y,z,length,r,w,rot,shape){
   const g=stripgeo(75);curl(g,length,r,w,shape);let a=mesh(p,g,shape%2?m.shave2:m.shave,x,y,z);a.rotation.set(.28+R()*.40,rot,.1+R()*.4);return a;
 }
 const curls=[
 [-1.25,.10,.65,.94,.098,.096,1.18],[-.98,.067,.71,.72,.064,.083,-.72],
 [-1.21,.087,.93,.94,.082,.091,-.26],[-.81,.088,.98,.64,.08,.075,.85],
 [-1.48,.077,.79,.85,.067,.072,.67],[-.58,.06,.64,.55,.051,.069,1.78],
 [.78,.062,.72,.73,.058,.079,-.26],[1.04,.048,.81,.42,.042,.062,.08],
 [-1.53,.093,.43,.72,.082,.102,.91],[1.40,.05,-.46,.49,.049,.074,1.46]
 ];
 curls.forEach((a,i)=>shaving(starter,...a,i));batch(starter);
 const gauge=group(room,2.03,.015,.80);gauge.rotation.y=.53;
 box(gauge,.65,.052,.087,m.trim,0,.025,0,.011);
 box(gauge,.128,.148,.235,m.dark,-.11,.071,0,.019);
 box(gauge,.011,.139,.227,m.bronze,-.042,.071,0,.013);
 cyl(gauge,.034,.035,.034,m.brass,-.107,.16,0);
 // Actual cambered stock: rounded rectangular cross sections, wear and water per length interval.
 const stock=group(boardRoot),segments=30,cross=24,N=(segments+1)*cross+2*(cross+1),buf=new T.BufferGeometry();
 const pos=new Float32Array(N*3),color=new Float32Array(N*3).fill(1),uv=new Float32Array(N*2),finish=new Float32Array(N),index=[];
 for(let i=0;i<=segments;i++)for(let k=0;k<cross;k++){
   const j=i*cross+k;uv[j*2]=i/segments;uv[j*2+1]=k/cross*1.8;
   if(i<segments){const a=j,b=i*cross+(k+1)%cross,c=a+cross,d=b+cross;index.push(a,b,c,b,d,c);}
 }
 const sideCount=index.length,endA=(segments+1)*cross,endB=endA+cross+1,cap1=endA+cross,cap2=endB+cross;
 for(let k=0;k<cross;k++){let a=k,b=(k+1)%cross;index.push(cap1,endA+b,endA+a,cap2,endB+a,endB+b);}
 buf.setAttribute('position',new T.BufferAttribute(pos,3));buf.setAttribute('uv',new T.BufferAttribute(uv,2));buf.setAttribute('color',new T.BufferAttribute(color,3));buf.setAttribute('surfaceFinish',new T.BufferAttribute(finish,1));buf.setIndex(index);
 const wetPixels=new Uint8Array(30*5*4),wetMap=new T.DataTexture(wetPixels,30,5,T.RGBAFormat);
 wetMap.minFilter=wetMap.magFilter=T.LinearFilter;wetMap.needsUpdate=true;
 const boardMat=m.board.clone();boardMat.vertexColors=true;boardMat.side=T.DoubleSide;
 boardMat.onBeforeCompile=shader=>{
   shader.uniforms.timberWater={value:wetMap};
   shader.vertexShader='attribute float surfaceFinish; varying float vFinish; varying vec2 waterUV;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFinish=surfaceFinish;waterUV=vec2(position.x/3.18+.5,position.z/.75+.5);');
   shader.fragmentShader='uniform sampler2D timberWater; varying float vFinish; varying vec2 waterUV;\n'+shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nvec4 waterSample=texture2D(timberWater,waterUV);diffuseColor.rgb*=mix(vec3(1.),vec3(.56,.43,.33),waterSample.r);float fiber=texture2D(map,vMapUv).g; diffuseColor.rgb*=1.+(fiber-.63)*1.45*waterSample.b;').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor-vFinish*.44-waterSample.r*.13-waterSample.g*.18,.10,1.);');
 };
 buf.addGroup(0,sideCount,0);buf.addGroup(sideCount,index.length-sideCount,1);
 const endMat=mat(0xe9c79a,.63,0,{map:Atelier.endgrain,vertexColors:true});
 const board=mesh(stock,buf,[boardMat,endMat]);board.frustumCulled=false;
 function updateBoard(cells){
   const half=1.59,D=.375;
   for(let i=0;i<30;i++)for(let j=0;j<5;j++){
     const t=cells[i].tiles[j],k=(j*30+i)*4;wetPixels[k]=Math.round(255*t.moisture);wetPixels[k+1]=Math.round(Math.min(1,t.water)*255);
     wetPixels[k+2]=Math.round(cells[i].reveal*255);wetPixels[k+3]=255;
   }
   wetMap.needsUpdate=true;
   for(let i=0;i<=segments;i++){const a=cells[Math.min(29,i)],b=cells[Math.max(0,i-1)],H=(a.thickness+b.thickness)*unit*.5,rad=(a.radius+b.radius)*unit*.5+.007;
     for(let k=0;k<cross;k++){
       const corner=Math.floor(k/6),phi=(corner+(k%6)/5)*Math.PI/2;
       const sy=(corner===0||corner===3)?1:-1,sz=(corner<2)?1:-1;
       const y=H*.5+sy*(H*.5-rad)+rad*Math.cos(phi),z=sz*(D-rad)+rad*Math.sin(phi);
       const j=i*cross+k;
       pos.set([(i/segments*2-1)*half,y+.001+a.tap*.004,z],j*3);
       const wet=(a.wet+b.wet)*.5,rev=(a.reveal+b.reveal)*.5;
       color.set([1-wet*.07,1-wet*.09-rev*.035,1-wet*.10-rev*.088],j*3);
       finish[j]=.27*a.polish+.31*rev+.6*wet+Math.min(.25,a.film);
       uv[j*2+1]=sy>0?.5+z/(2*D)*.90:.5-z/(2*D)*.90;
     }
   }
   for(let k=0;k<cross;k++)for(let end=0;end<2;end++){
     const src=end*segments*cross+k,dst=(end?endB:endA)+k;
     for(let j=0;j<3;j++){pos[dst*3+j]=pos[src*3+j];color[dst*3+j]=color[src*3+j];}
     uv[dst*2]=.50+pos[src*3+2]/(2*D);uv[dst*2+1]=.30+pos[src*3+1]/(2*D);
   }
   uv[cap1*2]=uv[cap2*2]=.5;uv[cap1*2+1]=uv[cap2*2+1]=.4;
   pos.set([-half,cells[0].thickness*unit*.5,0],cap1*3);pos.set([half,cells[29].thickness*unit*.5,0],cap2*3);
   for(const a of ['position','color','surfaceFinish','uv'])buf.attributes[a].needsUpdate=true;buf.computeVertexNormals();buf.computeBoundingSphere();
 }
 // Japanese block plane. The cutting edge is enclosed inside the dai.
 const plane=group(work),body=group(plane,.14,0,0);
 const ends=mat(0xe8ad75,.56,0,{map:Atelier.endgrain});
 const block=box(body,1.30,.244,.55,m.plane,0,.126,0,.049);
 // Warm end grain inserts follow the softened ends.
 for(const sign of [-1,1])box(body,.006,.166,.473,ends,sign*.649,.127,0,.002);
 box(body,.485,.007,.405,m.dark,-.042,.249,0,.003);
 const bladeGroup=group(body,-.055,.243,0);bladeGroup.rotation.z=-.51;
 const bladeShape=new T.Shape();bladeShape.moveTo(-.18,0);bladeShape.lineTo(.18,0);bladeShape.lineTo(.184,.318);
 bladeShape.quadraticCurveTo(.18,.41,.126,.414);bladeShape.quadraticCurveTo(0,.436,-.133,.412);bladeShape.quadraticCurveTo(-.184,.408,-.184,.337);bladeShape.closePath();
 const blade=mesh(bladeGroup,new T.ExtrudeGeometry(bladeShape,{depth:.057,bevelEnabled:true,bevelSegments:3,bevelSize:.006,bevelThickness:.006}),m.iron);blade.rotation.y=Math.PI/2;
 // Polished shoulders and the laminated steel cap.
 box(bladeGroup,.064,.032,.305,m.steel,.030,.381,0,.009);
 box(bladeGroup,.044,.209,.316,m.darkMetal,.078,.135,0,.019);
 const med=group(bladeGroup,.065,.28,0);med.rotation.z=-Math.PI/2;cyl(med,.055,.055,.006,m.bronze);
 const stamp=cyl(med,.046,.046,.008,m.iron,0,.003,0,32);
 for(let i=0;i<8;i++){const a=i*TAU/8;const pet=ball(med,.006,.005,.012,m.brass,Math.cos(a)*.025,.010,Math.sin(a)*.025);pet.rotation.y=Math.PI/2-a;}
 cyl(med,.008,.008,.011,m.brass,0,.006,0);
 const pin=cyl(body,.020,.020,.58,m.bronze,.047,.305,0);pin.rotation.x=Math.PI/2;
 for(const z of [-.276,.276]){let o=cyl(body,.028,.028,.008,m.brass,.047,.205,z);o.rotation.x=Math.PI/2;}
 // A lifted shaving in the mouth visibly shows the result of the first gesture.
 const mouth=shaving(body,-.15,.335,.035,.63,.079,.158,1.37,3);mouth.rotation.z=-.37;
 body.remove(bladeGroup,mouth);batch(body);body.add(bladeGroup,mouth);batch(bladeGroup);
 // Two trestles and their wedge pegs are independent click/drag targets.
 for(let i=0;i<4;i++){
   const g=group(boardRoot);if(i<2)trestle(g,m.leg);
   else{box(g,.184,.054,.064,m.plane,0,0,0,.013);box(g,.038,.078,.084,m.trim,.09,0,0,.009);}
   batch(g);parts.push(g);
 }
 const cart=group(boardRoot);box(cart,2.93,.09,.80,m.edge,0,-.07,0);
 for(const x of [-1.05,1.05])for(const z of [-.38,.38]){
   let g=group(cart,x,-.19,z);let q=cyl(g,.16,.16,.068,m.darkMetal);q.rotation.x=Math.PI/2;
   q=cyl(g,.129,.129,.072,m.trim);q.rotation.x=Math.PI/2;
   for(let k=0;k<4;k++){let o=box(g,.15,.015,.078,m.bronze);o.rotation.z=k*Math.PI/4;}
   batch(g);wheels.push(g);
 }cart.visible=false;
 // Distant granite ridges have real depth, shaded gullies and snow concentrated on upper ledges.
 const mountainMat=mat(0xffffff,.96,0,{vertexColors:true});
 function ridge(z,base,heights,palette,depth){
   const cols=115,rows=15,P=[],C=[],I=[],lo=new T.Color(palette[0]),hi=new T.Color(palette[1]),snow=new T.Color(palette[2]),c=new T.Color();
   for(let iz=0;iz<=rows;iz++)for(let ix=0;ix<=cols;ix++){
     const x=-54+ix/cols*108,f=iz/rows,crest=heights.reduce((v,[cx,h,slope])=>Math.max(v,h-Math.abs(x-cx)*slope),.9);
     const amp=.45*noise(x*1.6+24,z)+.65*noise(x*.6+13,z+7),mass=crest+amp;
     const ledge=noise(x*.59+f*2,iz*.40+17);
     const y=base+mass*(1-f**.82)+(ledge-.5)*1.3*Math.sin(f*Math.PI);
     P.push(x,y,z+depth*f+noise(x*.13+2,15)*1.5);
     c.copy(lo).lerp(hi,.24+ledge*.59);
     const snowLine=(y-base)/Math.max(1,mass)-.78+(noise(x*1.3+12,iz*.68)-.51)*.42;
     if(crest>4&&snowLine>0)c.lerp(snow,Math.min(.95,snowLine*6));
     C.push(c.r,c.g,c.b);if(iz<rows&&ix<cols){let a=iz*(cols+1)+ix;I.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.setIndex(I);g.computeVertexNormals();const o=mesh(back,g,mountainMat);o.castShadow=false;
 }
 ridge(-46,-8.4,[[-39,9,.48],[-24,10,.62],[-7,8,.83],[2,10,1.16],[13,7,.75],[31,10,.69]],[0x899f9f,0xb1c0bc,0xe3e5d9],9);
 ridge(-33,-7.7,[[-29,6.8,.37],[-16,9,.91],[-11,7.3,1.04],[-1,5.1,.50],[14,8,.74],[36,8,.75]],[0x6f8583,0x94a8a1,0xdadfd5],9);
 ridge(-24,-5.7,[[-28,5.6,.32],[-9,4.4,.33],[7,6.3,.42],[26,4.9,.36]],[0x637e72,0x849b86,0xa7b5a2],9);
 // Meadow rolling away from the garden; keep the patio level at the bench.
 const meadow=new T.PlaneGeometry(110,84,90,70);meadow.rotateX(-Math.PI/2);
 let attr=meadow.attributes.position,meadowColors=[];
 for(let i=0;i<attr.count;i++){
   const x=attr.getX(i),z=attr.getZ(i)-19;let rise=Math.max(0,Math.min(1,(-z-9)/9))*(.23+noise(x*.14,z*.18)*1.45);
   attr.setXYZ(i,x,-1.59+rise,z);const c=new T.Color(0x9d9e71).lerp(new T.Color(0x708066),noise(x*.44,z*.36)*.7);meadowColors.push(c.r,c.g,c.b);
 }
 meadow.setAttribute('color',new T.Float32BufferAttribute(meadowColors,3));meadow.computeVertexNormals();mesh(grounds,meadow,mat(0xffffff,.93,0,{vertexColors:true}));
 // Individual whorls of slightly drooping evergreen branches build the silhouettes.
 const treeMat=mat(0xffffff,.92,0,{vertexColors:true,side:T.DoubleSide});
 function firGeometry(seed){
   const rand=random(seed),P=[],C=[],I=[],cc=new T.Color();
   for(let tier=0;tier<12;tier++){
     const f=tier/12,h=.13+f*.78,r=(1-f)**.83*.247+.012,n=11,offset=rand()*TAU;
     let start=P.length/3;
     for(let layer=0;layer<3;layer++)for(let i=0;i<n*2;i++){
       const a=i/(2*n)*TAU+offset,outer=i%2===0,q=layer===0?.05:layer===1?(outer?.64:.46):(outer?1:.49);
       const radius=r*q*(.88+rand()*.24),y=h+(layer===0?.22*(1-f*.67):layer===1?.056:0)-(outer&&layer===2?rand()*.045:0);
       P.push(Math.cos(a)*radius,y,Math.sin(a)*radius);
       cc.set(outer?0x667e65:0x405d51).lerp(new T.Color(0x829784),f*.28+rand()*.18).multiplyScalar(layer===0?1.13:layer===2?.84:1);
       C.push(cc.r,cc.g,cc.b);
       if(layer<2){let j=start+layer*2*n+i,b=start+layer*2*n+(i+1)%(n*2);I.push(j,b,j+n*2,b,b+n*2,j+n*2);}
     }
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.setIndex(I);g.computeVertexNormals();return g;
 }
 const spruces=[];
 for(let j=0;j<138;j++){
   const x=(R()-.5)*70,z=-13-R()*19,h=.95+R()**1.8*2.95;spruces.push([x,-1.2,z,h]);
 }
 spruces.push([-5.3,-1.6,-8.7,3.58],[-5.95,-1.6,-9.5,4.04],[-.38,-1.58,-11.28,3.41],[6.9,-1.58,-9.63,3.82]);
 for(let j=0;j<3;j++){
   const list=spruces.filter((_,i)=>i%3===j),q=new T.InstancedMesh(Atelier.surfaceUV(firGeometry(61+j*93)),treeMat,list.length),obj=new T.Object3D();
   list.forEach(([x,y,z,h],i)=>{obj.position.set(x,y,z);obj.rotation.y=R()*TAU;obj.scale.set(h*(.87+R()*.24),h,h);obj.updateMatrix();q.setMatrixAt(i,obj.matrix);});
   q.receiveShadow=true;back.add(q);
 }
 // Garden fence, stepping stones and clumps of real grass blades.
 for(let i=0;i<19;i++){
   let x=-10+i*1.12;box(grounds,.098,.85,.104,m.trim,x,-1.17,-9.05,.024);
   if(i<18){for(const y of [-1.11,-.85])box(grounds,1.14,.084,.052,m.trim,x+.56,y,-9.055,.009);}
 }
 const peb=[mat(0x9d9d88,.88),mat(0xa6a38e,.92),mat(0x8f9381)];
 for(let i=0;i<32;i++){let x=i<15?-4.8+i*.68:(R()-.5)*17,z=i<15?-6.1+Math.sin(i*.38)*.7:-9+R()*3;let q=mesh(grounds,Atelier.geo('rock',()=>new T.IcosahedronGeometry(1,1)),peb[i%3],x,-1.57,z);q.scale.set(.20+R()*.14,.053+R()*.043,.18+R()*.11);q.rotation.y=R()*6;}
 const grassP=[],grassC=[],grassI=[];
 for(let i=0;i<3800;i++){const x=(R()-.5)*35,z=-3.1-R()*16;if(Math.abs(x-2)<2.5&&Math.abs(z+6.4)<1.9)continue;
   const y=-1.579+Math.max(0,Math.min(1,(-z-9)/9))*(.23+noise(x*.14,z*.18)*1.45);
   const h=.042+R()**2*.16,w=.008+R()*.018,c=new T.Color().setHSL(.17+R()*.055,.16+R()*.10,.34+R()*.17);
   for(let k=0;k<4;k++){const a=R()*TAU,dx=Math.cos(a),dz=Math.sin(a),q=grassP.length/3;
     grassP.push(x-dz*w,y,z+dx*w,x+dz*w,y,z-dx*w,x+dx*h*.55,y+h,z+dz*h*.55);grassC.push(c.r*.8,c.g*.8,c.b*.8,c.r*.8,c.g*.8,c.b*.8,c.r*1.15,c.g*1.15,c.b*1.15);grassI.push(q,q+1,q+2);}
 }
 let gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(grassP,3));gg.setAttribute('color',new T.Float32BufferAttribute(grassC,3));gg.setIndex(grassI);gg.computeVertexNormals();mesh(grounds,gg,treeMat).castShadow=false;
 for(let i=0;i<25;i++){const x=-2.4+R()*7,z=-8.8+R()*.62,h=.10+R()*.17;
   twig(grounds,[x,-1.58,z],[x+.018,-1.58+h,z],.006,.003,leafM[0],4);
   for(let k=0;k<5;k++){const a=k*TAU/5;ball(grounds,.020,.010,.022,m.cream,x+.018+Math.cos(a)*.020,-1.58+h,z+Math.sin(a)*.020);}
   ball(grounds,.013,.01,.013,m.brass,x+.018,-1.57+h,z);
 }
 // The trolley passes around the open gable and descends a wooden deck.
 const path=new T.CatmullRomCurve3([V(-.02,0,.13),V(2.72,0,.15),V(3.95,-.36,-.85),V(4.29,-.81,-3.33),V(3.70,-1.22,-5.18),V(2.05,-1.24,-6.48)]);
 for(let i=17;i<=57;i++){const f=i/57,pos=path.getPointAt(f),tan=path.getTangentAt(f);
   const b=box(grounds,1.14,.072,.186,i%3?m.bench:m.bench2,pos.x,pos.y-.368,pos.z,.008);b.rotation.y=Math.atan2(tan.x,tan.z);}
 const gardenBench=sampleBench(grounds,-2.12,-1.58,-6.32,.79);gardenBench.rotation.y=-.38;
 // Cedar canopy and working rain gutter. The wheel receives the runoff on one side.
 const mill=group(grounds,2.05,-1.58,-6.48);mill.rotation.y=-.27;
 for(const x of [-1.93,1.93]){box(mill,.109,1.99,.115,m.trim,x,.995,-1.27);beam(mill,[x,1.44,-1.28],[x,1.99,-.84],.07,m.edge);}
 for(let i=0;i<15;i++){const sh=box(mill,.295,.072,1.13,i%3?m.bench:m.bench2,-2.05+i*.29,1.98,-1.46,.012);sh.rotation.x=-.14;}
 box(mill,4.4,.10,.11,m.edge,0,1.85,-.91);
 const gutter=group(mill,0,1.86,-.875);gutter.rotation.z=-.024;
 box(gutter,4.4,.044,.14,m.bronze);for(const z of [-.07,.07])box(gutter,4.4,.08,.016,m.bronze,0,.029,z,.006);
 const wheelGroup=group(scene),wheelPlace=V(1.88,.52,-.885);mill.updateWorldMatrix(true,false);mill.localToWorld(wheelPlace);wheelGroup.position.copy(wheelPlace);wheelGroup.rotation.y=-.27;
 const wheelRotor=group(wheelGroup);
 for(const z of [-.094,.094]){const r=mesh(wheelRotor,new T.TorusGeometry(.417,.032,9,56),m.edge,0,0,z);
   for(let j=0;j<5;j++){const a=j*Math.PI/5;const q=box(wheelRotor,.84,.042,.04,m.trim,0,0,z);q.rotation.z=a;}}
 for(let i=0;i<10;i++){const a=i*TAU/10;const paddle=box(wheelRotor,.128,.048,.25,m.plane,.435*Math.sin(a),.435*Math.cos(a),0,.008);paddle.rotation.z=-a;}
 let hub=cyl(wheelRotor,.083,.083,.33,m.bronze);hub.rotation.x=Math.PI/2;
 box(mill,.08,.54,.10,m.edge,1.88,.25,-.69);batch(wheelRotor);
 const gate=group(scene);gate.position.copy(mill.localToWorld(V(1.91,1.31,-.88)));gate.rotation.y=-.27;
 const rocker=group(gate);box(rocker,.33,.06,.20,m.plane);ball(rocker,.067,.076,.067,m.brass,.14,.066,0);batch(rocker);
 const stream=mesh(scene,new T.CylinderGeometry(.014,.009,1,9),mat(0xb9d3c3,.15,.20,{transparent:true,opacity:.67}));stream.visible=false;stream.position.copy(wheelPlace).add(V(.17,.80,.016));
 // Organic highlights in the sun patches come from these physical leaves outside the opening.
 const outside=group(grounds,-5.1,-1.55,-4.3);
 twig(outside,[0,0,0],[.36,2.1,-.25],.15,.075,m.bark);
 const foliage=new T.IcosahedronGeometry(1,1);
 for(let i=0;i<10;i++){const x=-.54+R()*1.4,y=2.18+R()*.96,z=(R()-.5)*1.05;twig(outside,[.34,1.64,-.19],[x,y,z],.052,.014,m.bark);
   for(let j=0;j<3;j++){const q=mesh(outside,foliage,leafM[(i+j)%4],x+(R()-.5)*.45,y+R()*.31,z+(R()-.5)*.5);q.scale.set(.23+R()*.22,.16+R()*.16,.24+R()*.24);q.rotation.set(R(),R(),R());}}
 batch(room);batch(grounds);batch(sampleTable);for(const stem of stems)batch(stem);
 return {room,local,boardRoot,work,board,stock,parts,cart,wheels,path,plane,bladeGroup,starter,updateBoard,unit,wheelRotor,gate,rocker,stream,stems,sample,sampleTable,gardenBench,mouth};
}
