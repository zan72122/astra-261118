'use strict';
const Studio=(()=>{
 const {T,V,C,tau,rand,rng,ease,mix,noise,mat,wood,M,geo,mesh,group,box,ball,lathe,cyl,ring,rod,tube,leaf,batch,ceramic,glazeColors}=Art;
 const blueInk=ceramic('#365a6c'),sageInk=ceramic('#69816e'),goldInk=ceramic('#b68d50');
 const twig=mat('#6e7050'),leafM=mat('#687a56'),leafLight=mat('#919a6c'),nail=mat('#635e50',.44,.45);
 const slip=ceramic('#daceb5'),ink=[blueInk,sageInk,goldInk];
 function bloom(parent,x,y,z,style,scale=1){
   const g=group(parent,x,y,z),stemH=[.75,.94,.84][style];
   const bend=[-.15,.08,.18][style];tube(g,[[0,0,0],[bend*.16,stemH*.4,.015],[bend,stemH,.04]],.009,twig);
   leaf(g,[bend*.18,stemH*.3,.015],[bend*.18-.19,stemH*.48,.04],.042,leafM);
   leaf(g,[bend*.36,stemH*.50,.02],[bend*.4+.16,stemH*.7,.04],.032,leafLight);
   const head=group(g,bend,stemH,.04);head.rotation.x=-.38;head.rotation.z=bend*2;
   const petal=flowerM[style],count=style===1?6:9;
   for(let i=0;i<count;i++){const a=i*tau/count,r=.058;
     const o=ball(head,r*Math.cos(a),r*Math.sin(a),.01,.058,style===1?.034:.023,.014,petal);o.rotation.z=a;}
   ball(head,0,0,.026,.035,.035,.027,flowerCore);g.scale.setScalar(scale);batch(g);return g;
 }
 const flowerM=[mat('#f0e5c9'),mat('#a8b1c6'),mat('#e3bb73')],flowerCore=mat('#bc9250');
 function paintedWare(parent,kind,S,color,y=0){
   const g=group(parent,0,y,0),H=Pottery.heightOf(kind,false),p=[[.01,0]],N=48;
   const rr=u=>Pottery.profile(kind,u)*S/14;
   for(let i=0;i<=N;i++){const u=i/N;p.push([rr(u),u*H*S/14]);}
   const h=H*S/14,r=rr(1);
   p.push([r-.012,h+.013],[r-.035,h+.014],[r-.05,h],[r*.86,h*.55],[rr(.2)*.78,h*.19],[.001,h*.17]);
   lathe(g,p,slip);
   const dipped=[];for(let i=0;i<=20;i++){let u=.01+i/20*(kind==='vase'?.40:.18);dipped.push([rr(u)+.002,h*u]);}
   lathe(g,dipped,ink[color]);ring(g,0,h+.006,0,r-.017,.016,ink[color]);ring(g,0,h*.90,0,rr(.90)+.001,.009,ink[color]);
   ring(g,0,h*.135,0,rr(.135),.012,ink[color]);
   // Hand-painted climbing grasses follow the curved porcelain instead of a flat label.
   function loc(a,u,d=.006){let R=rr(u)+d;return [R*Math.sin(a),h*u,R*Math.cos(a)];}
   for(let k=0;k<6;k++){
     const a=k*tau/6;
     const line=[];for(let j=0;j<=6;j++){let q=j/6;line.push(loc(a+.48*q,.28+.39*q));}tube(g,line,.006*S+.002,ink[color],9);
     for(let j=0;j<5;j++){const q=.13+j*.15,aa=a+.48*q,u=.28+.39*q,side=j%2?1:-1;
       const pts=[loc(aa,u,.010),loc(aa+side*.09,u+.045,.011),loc(aa+side*.16,u+.088,.010)];
       tube(g,pts,.013*S+.002,ink[color],7);}
   }batch(g);return g;
 }
 function jar(parent,index){
   const g=group(parent),c=glazeColors[index],gl=ceramic(c),rim=ceramic(C(c).multiplyScalar(.75));
   const R=[.275,.25,.235][index],H=[.57,.50,.48][index];
   const shape=[[.01,0],[.76,.0],[.93,.05],[1,.17],[1,.65],[.97,.77],[.76,.86],[.62,.9],[.62,1],[.74,1.015],[.74,1.08],[.55,1.09],[.53,1.02]];
   lathe(g,shape.map(([r,y])=>[r*R,y*H]),gl);
   ring(g,0,.11*H,0,R*.968,.009,rim);
   for(let i=0;i<3;i++)ring(g,0,H*(.92+i*.055),0,R*(i===2?.72:.64),.014,rim);
   ring(g,0,.81*H,0,R*.88,.013,M.linen);
   const mark=group(g,0,.43*H,R*.99);const badge=ball(mark,0,0,0,.104,.119,.014,M.cream);
   const stem=.057;rod(mark,[-.033,-stem,.016],[.034,stem,.016],.005,ink[index]);
   for(let j=0;j<4;j++){const q=j/3,sg=j%2?1:-1;let o=ball(mark,-.032+.066*q+sg*.016,-.046+q*.083+.01,.02,.024,.011,.003,ink[index]);o.rotation.z=sg*.65;}
   batch(g);g.userData.cap=cyl(g,0,1.125*H,0,.64*R,.6*R,.13*H,M.cork);g.userData.capRest=H*1.125;return g;
 }
 function cloth(parent,x,y,z,w,d,blue=false){
   const g=group(parent,x,y,z),m=blue?mat('#6c858b',.92,0,{bumpMap:Art.rough,bumpScale:.024}):M.linen;
   const folds=(u,v)=>.018*Math.sin(v*29+u*3)+.007*Math.sin(u*24+v*6)+.022*Math.sin(u*4+v*8);
   const G=new T.PlaneGeometry(w,d,34,25);G.rotateX(-Math.PI/2);const pos=G.attributes.position;
   for(let i=0;i<pos.count;i++){let u=pos.getX(i)/w+.5,v=pos.getZ(i)/d+.5;pos.setY(i,folds(u,v)+.045);pos.setX(i,pos.getX(i)+.025*Math.sin(v*9));}G.computeVertexNormals();m.side=T.DoubleSide;mesh(g,G,m);
   for(const f of [.06,.082,.918,.94]){let pp=[];for(let i=0;i<=18;i++){let u=i/18;pp.push([(u-.5)*w+.025*Math.sin(f*9),folds(u,f)+.049,(f-.5)*d]);}tube(g,pp,.005,blue?M.linen:blueInk,20);}
   return g;
 }
 function architecture(scene){
   const g=group(scene);
   // Individually milled boards with narrow shadow gaps and recessed nail heads.
   for(let i=0;i<21;i++)box(g,0,-.076,-3+i*.48,12,.13,.474,M.darkWood);
   box(g,0,.28,1.91,7.7,.14,.16,M.trim);
   for(const x of [-1.28,1.26])box(g,x,.36,1.92,.16,.75,.21,M.darkWood);
   box(g,0,.88,.27,10,.34,3.68,M.darkWood);
   const boards=[wood('#ebcdaf'),wood('#e4c39f'),wood('#f0d5b3'),wood('#e7cba9')];
   for(let j=0;j<9;j++){let z=-1.49+j*.444;
     const b=box(g,0,1.018+.0015*Math.sin(j*2.5),z,10,.101,.438,boards[j%4]);b.rotation.y=.0006*Math.sin(j*2);
     for(const x of [-3.04,2.78])cyl(g,x,1.072,z-.12,.014,.014,.004,nail,10);
   }
   box(g,0,.77,2.27,10,.44,.14,M.trim);box(g,0,.54,2.24,10,.043,.1,M.darkWood);
   for(const x of [-2.3,1.9])box(g,x,.23,1.94,.24,.68,.3,M.darkWood);
   box(g,-.7,.74,-2.6,13,1.64,.30,M.plaster);
   for(let x=-5;x<5;x+=.36){box(g,x,1.49,-2.4,.35,.66,.10,M.honey);}
   box(g,-.7,1.82,-2.37,12,.145,.54,M.honey);box(g,-.7,1.72,-2.22,12,.084,.13,M.darkWood);
   for(const x of [-4.7,4.85]){box(g,x,3,-2.55,.22,3.75,.29,M.trim);}
   box(g,0,4.97,-2.54,11,.23,.26,M.trim);
   box(g,-4.86,2.7,-1.7,.19,5,1.9,M.plaster);
   batch(g);return g;
 }
 function windowSide(scene){
   const g=group(scene);
   box(g,1.88,3.40,-2.61,2.83,3.39,.26,M.plaster);
   box(g,.38,3.37,-2.45,.16,3.3,.28,M.trim);
   box(g,.26,3.35,-2.41,.06,3.15,.14,M.honey);
   // A indigo linen apron suspended from a single wooden peg.
   const apron=group(g,1.24,3.32,-2.36),canvas=mat('#758783',.96,0,{bumpMap:Art.rough,bumpScale:.021,side:T.DoubleSide});
   ball(apron,0,.15,0,.047,.047,.07,M.darkWood);
   tube(apron,[[-.13,-.16,.02],[-.07,.07,0],[0,.16,.036],[.06,.075,0],[.13,-.16,.02]],.015,M.linen);
   const vs=[],id=[],uv=[];
   for(let j=0;j<=22;j++)for(let i=0;i<=25;i++){
    let v=j/22,u=i/25,W=.145+.092*ease(Math.min(1,v*2.5))+.012*Math.sin(v*5),x=(u*2-1)*W;
    vs.push(x,-.155-1.01*v+.026*Math.sin(u*7)*v*v,.04+.029*Math.sin(u*23+v*1.6)*(.25+.75*v));uv.push(u,v);
    if(i<25&&j<22){const k=j*26+i;id.push(k,k+26,k+1,k+1,k+26,k+27);}
   }
   let geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(vs,3));geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.setIndex(id);geom.computeVertexNormals();mesh(apron,geom,canvas);
   tube(apron,[[-.17,-.69,.087],[-.09,-.8,.082],[.06,-.81,.087],[.16,-.7,.079]],.009,M.linen);
   batch(g);return g;
 }
 function kiln(scene){
   const g=group(scene),brick=Array.from({length:6},(_,i)=>mat(['#aa795c','#c39771','#b58266','#96765e','#c0a087','#a88970'][i],.9,0,{map:Art.stipple,bumpMap:Art.rough,bumpScale:.023}));
   const white=mat('#cbbb9f',.92,0,{map:Art.stipple,bumpMap:Art.rough,bumpScale:.035}),soot=mat('#393a33',.98);
   box(g,0,.54,0,1.85,1.08,1.52,white);
   ball(g,0,1.18,-.06,1.03,1.16,.83,white);
   cyl(g,.38,2.36,-.33,.23,.28,.86,brick[2],20);cyl(g,.38,2.78,-.33,.29,.28,.13,brick[3],20);
   // Arched fired-brick voussoirs and a recessed firebox.
   const aShape=new T.Shape();aShape.moveTo(-.51,.39);aShape.lineTo(.51,.39);aShape.lineTo(.51,.93);aShape.absarc(0,.93,.51,0,Math.PI,false);aShape.closePath();
   mesh(g,new T.ExtrudeGeometry(aShape,{depth:.05,bevelEnabled:false,curveSegments:40}),soot,0,0,.78);
   for(let i=0;i<13;i++){const a=i*Math.PI/13+.012,b=(i+1)*Math.PI/13-.012,shape=new T.Shape();
     shape.moveTo(.55*Math.cos(a),.55*Math.sin(a));shape.absarc(0,0,.55,a,b,false);shape.lineTo(.79*Math.cos(b),.79*Math.sin(b));shape.absarc(0,0,.79,b,a,true);shape.closePath();
     mesh(g,new T.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSegments:1,bevelThickness:.011,bevelSize:.013}),brick[(i*7)%6],0,.93,.73);}
   for(const x of [-.67,.67])for(let i=0;i<3;i++)box(g,x,.45+i*.18,.80,.237,.171,.18,brick[(i+(x>0?3:0))%6]);
   box(g,0,.36,.82,1.62,.15,.50,brick[2]);box(g,0,.14,.81,1.78,.24,.50,brick[4]);
   for(let i=0;i<8;i++){const x=-.84+(i%4)*.15,y=.15+Math.floor(i/4)*.18;
     const log=rod(g,[x-.25,y,.91],[x-.09,y+.03,1.32],.097,M.darkWood,.09,9);
     ball(g,x-.09,y+.03,1.32,.08,.083,.015,M.end);}
   batch(g);
   const gate=group(scene);const metal=mat('#525347',.55,.37);
   const dsh=new T.Shape();dsh.moveTo(-.47,0);dsh.lineTo(.47,0);dsh.lineTo(.47,.46);dsh.absarc(0,.46,.47,0,Math.PI,false);dsh.closePath();
   mesh(gate,new T.ExtrudeGeometry(dsh,{depth:.06,bevelEnabled:true,bevelSegments:2,bevelSize:.018,bevelThickness:.013}),metal,.47,0,0);
   for(let j=0;j<2;j++){let y=.14+j*.31;box(gate,.46,y,.087,.85,.043,.033,M.aged);for(const x of [.09,.84])ball(gate,x,y,.109,.019,.019,.012,nail);}
   tube(gate,[[.77,.27,.08],[.77,.27,.16],[.77,.39,.16],[.77,.4,.08]],.021,M.iron);
   for(let j=0;j<3;j++)box(gate,.35+j*.105,.63,.078,.061,.085,.009,soot);
   batch(gate);gate.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});g.add(gate);gate.position.set(-.47,.40,.854);
   const flames=group(g,0,.43,.857),pieces=[];
   for(let i=0;i<14;i++){
     const mm=mat(i%3?'#e4a75b':'#f2d18a',.58,0,{emissive:i%3?'#e78b36':'#edb868',emissiveIntensity:1.1});
     const f=lathe(flames,[[.001,0],[.068,.055],[.093,.15],[.052,.29],[.019,.43],[.001,.49]],mm,(i%7-3)*.111,0,-Math.floor(i/7)*.023,12);
     f.rotation.z=.11*Math.sin(i*3.4);pieces.push(f);
   }
   return {g,gate,pieces};
 }
 function wheel(scene){
   const g=group(scene),base=group(g);
   lathe(base,[[.01,0],[.65,0],[.7,.04],[.72,.18],[.68,.26],[.62,.29],[.02,.29]],M.enamel);
   ring(base,0,.045,0,.685,.026,M.iron);
   const pan=lathe(base,[[.60,.18],[.78,.19],[.96,.30],[1.016,.391],[1.021,.435],[1.005,.451],[.973,.446],[.948,.407],[.862,.327],[.76,.301],[.49,.302]],M.enamel);
   ring(base,0,.438,0,1.004,.018,M.steel);
   lathe(base,[[.38,.30],[.76,.30],[.854,.32],[.892,.347],[.873,.347],[.75,.322],[.38,.316]],mat('#aca99a',.30,.14));
   const disc=group(g,0,.335,0);
   lathe(disc,[[.001,0],[.65,0],[.764,.033],[.78,.092],[.772,.112],[.748,.122],[.001,.122]],M.steel);
   const discFace=mat('#b5b6a9',.34,.47,{bumpMap:Art.rough,bumpScale:.008});
   cyl(disc,0,.122,0,.752,.752,.012,discFace);
   for(let i=0;i<9;i++)ring(disc,0,.129,0,.26+i*.058,.0037,i%2?M.aged:M.steel);
   for(const side of [-1,1]) cyl(disc,side*.697,.13,0,.019,.02,.014,M.aged,16);
   rod(base,[.65,.18,.26],[.98,.26,.35],.026,M.steel);ball(base,1,.263,.35,.095,.055,.06,M.darkWood);
   for(let i=0;i<7;i++){const a=i*tau/7;ball(base,.69*Math.sin(a),.15,.69*Math.cos(a),.016,.015,.018,M.aged);}
   batch(base);batch(disc);return {g,disc};
 }
 function bucket(scene){
   const g=group(scene),R=.38,H=.53,staves=[wood('#bd9470'),wood('#c19e76'),wood('#a68364')];
   for(let i=0;i<15;i++){
     const a=i*tau/15,b=a+tau/15-.009,pp=[[.31,0],[R,H],[R-.025,H+.002],[.285,.035]];
     const geom=new T.LatheGeometry(pp.map(p=>new T.Vector2(...p)),4,a,b-a);
     mesh(g,geom,staves[i%3]);
   }
   ring(g,0,.104,0,.324,.016,M.aged);ring(g,0,.415,0,.369,.018,M.aged);
   const handle=[];for(let j=0;j<=20;j++){let a=j*Math.PI/20;handle.push([.367*Math.cos(a),.435+.4*Math.sin(a),-.20*Math.sin(a)]);}
   tube(g,handle,.012,M.iron,24);
   for(const x of [-.366,.366])ball(g,x,.437,0,.026,.034,.036,M.iron);
   rod(g,[.15,.13,-.02],[-.12,.75,-.21],.018,M.honey,.025);
   batch(g);
   const wm=new T.MeshPhysicalMaterial({color:'#778f8a',roughness:.12,metalness:.35,clearcoat:1,roughnessMap:Art.rough});
   const water=mesh(g,new T.CircleGeometry(.348,64,0,tau),wm,0,.425,0);water.geometry.rotateX(-Math.PI/2);
   const rings=[];for(let j=1;j<=6;j++)rings.push(ring(g,0,.428,0,.042+j*.043,.0028,wm));
   const drop=ball(g,-.10,.68,-.16,.016,.027,.016,wm);
   return {g,water,rings,drop};
 }
 function toolsOnTable(scene){
   const g=group(scene),rest=group(g);
   cloth(g,-.08,0,.04,1.18,.60).rotation.y=-.15;
   const sponge=mat('#c3a066',.93,0,{map:Art.stipple,bumpMap:Art.rough,bumpScale:.045});
   const sp=ball(g,-.31,.14,.06,.192,.104,.137,sponge);
   const pr=rng(88);for(let i=0;i<52;i++){const a=pr()*tau,b=pr()*1.36;ball(g,-.31+.189*Math.cos(a)*Math.sin(b),.141+.100*Math.cos(b),.06+.135*Math.sin(a)*Math.sin(b),.009,.005,.008,M.cork);}
   for(let j=0;j<2;j++){
     const x=.12+j*.13;
     rod(g,[x,.085,.24],[x+.25,.131,-.35],.02,j?M.honey:M.darkWood,.03);
     if(j){rod(g,[x+.25,.131,-.35],[x+.28,.137,-.43],.030,M.steel);ball(g,x+.3,.14,-.46,.034,.027,.082,M.cork);}
     else tube(g,[[x+.25,.13,-.35],[x+.26,.139,-.45],[x+.32,.14,-.49],[x+.34,.14,-.41],[x+.25,.13,-.35]],.006,M.steel);
   }batch(g);return g;
 }
 function hangingPlant(scene){
   const g=group(scene),pr=rng(1041);
   const pot=lathe(g,[[.01,0],[.20,0],[.27,.41],[.30,.42],[.30,.47],[.25,.47],[.24,.42]],M.clay);
   cyl(g,0,.421,0,.244,.244,.03,M.earth);
   for(let i=0;i<10;i++){let a=pr()*tau,L=.4+pr()*.47;
     let end=[Math.cos(a)*L,.48+pr()*.52,Math.sin(a)*L*.47];
     let ps=[[.04*Math.cos(a),.42,.04*Math.sin(a)],[end[0]*.5,end[1]+.12,end[2]*.5],end];tube(g,ps,.009,twig);
     for(let j=1;j<=6;j++){const q=j/7,sg=j%2?1:-1,b=[end[0]*q,.42+(end[1]-.42)*q+.12*Math.sin(Math.PI*q),end[2]*q];
       leaf(g,b,[b[0]+sg*(.09+.11*pr()),b[1]+.06-.16*q,b[2]+.07],.038+pr()*.023,j%2?leafM:leafLight);}
   }batch(g);return g;
 }
 return {architecture,windowSide,kiln,wheel,bucket,toolsOnTable,paintedWare,jar,bloom,hangingPlant,cloth,flowerM};
})();
