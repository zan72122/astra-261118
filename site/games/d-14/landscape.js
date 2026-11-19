'use strict';
function makeLandscape(scene){
 const {T,V,C,mat,group,mesh,box,rod,noise,rng,mix,ball}=Art, rnd=rng(901);
 const outside=group(scene), tree=group(outside);
 function surface(vertices,cols){
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();
   const o=mesh(outside,g,mat('white',.98,0,{vertexColors:true,side:T.DoubleSide}));
   o.castShadow=o.receiveShadow=false;return o;
 }
 // Four ridges have distinct watersheds. The exposed rock faces interrupt the snow cover.
 function massif(z,base,peaks,front,snow,palette,seed){
   const nx=180,ny=23,vs=[],cs=[],points=[];
   for(let i=0;i<=nx;i++){let x=(i/nx-.5)*76;
     let peak=-.4;for(const [px,py,w] of peaks)peak=Math.max(peak,py-Math.pow(Math.abs((x-px)/w),.91)*py);
     const summit=base+peak-(z< -30?1.6:z< -20?.85:0)+.54*(noise(x*.85,seed)-.45)+.21*noise(x*2.8,seed);
     const zz=z+2.4*(noise(x*.22,seed+3)-.5);
     for(let j=0;j<=ny;j++){const t=j/ny;const xx=x+.15*(noise(i*3,j*2)-.5);
       const corr=Math.sin(xx*1.27+t*5+seed)+.46*Math.sin(xx*2.65+t*6.3);
       const y=mix(summit,base-2,t)+(1.28*corr+1.1*(noise(xx*.51,t*6+seed)-.5))*Math.sin(t*Math.PI);
       points[i*(ny+1)+j]=[xx,y,zz+t*front+.52*corr*Math.sin(t*Math.PI)];
     }
   }
   function tri(a,b,c){const x=(a[0]+b[0]+c[0])/3,y=(a[1]+b[1]+c[1])/3,z1=a[2];
     const strata=noise(x*1.45+z1*.72,y*.47+seed), streak=noise(x*.7-z1*.36,y*.15+seed);
     const snowCover=y>snow+.95*(streak-.46)+.48*Math.sin(x*.9+z1*.6)+.33*(strata-.5);
     const co=C(snowCover?palette[2]:palette[0]).lerp(C(snowCover?palette[3]:palette[1]),.25+strata*.69);
     for(const p of [a,b,c]){vs.push(...p);cs.push(co.r,co.g,co.b);}
   }
   for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){let k=i*(ny+1)+j,l=k+ny+1;tri(points[k],points[l],points[k+1]);tri(points[l],points[l+1],points[k+1]);}
   surface(vs,cs);
 }
 massif(-37,-4.2,[[-27,7,9],[-16,7.7,8],[-5.5,8.6,9],[3,7.2,9],[12,8.2,10],[25,8,11]],7,.65,['#788fa0','#b5c3c7','#d7e2e2','#f4ede0'],19);
 massif(-27,-5,[[-19,6.9,9],[-9.8,7.2,8],[-1.4,5.7,6],[5.8,6.9,7],[15,6.6,8],[27,7,9]],7,1.35,['#546e80','#95aab0','#c8d7db','#e2e3d8'],43);
 massif(-18,-4.6,[[-14,4.9,11],[-7,4.4,8],[1.2,3.15,9],[9,5.45,11],[20,4.2,9]],6,8,['#537275','#8d9c93','#809596','#879eaa'],24);
 function river(z){return -.6+2.65*Math.sin((z+7)*.39)+.45*Math.sin((z+3)*.85);}
 function ground(x,z){
   const d=Math.abs(x-river(z)), n=noise(x*.22,z*.27);
   return -.32+.048*(-z-7)+Math.min(2.1,Math.max(0,d-.65)*.21)*(.55+n)+.14*(noise(x*.9,z*.77)-.4)*Math.min(1,d);
 }
 const vs=[],cs=[],nx=125,nz=68;
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
   const v=(u,w)=>{let x=(u/nx-.5)*38,z=-3.1-w/nz*15;return [x,ground(x,z),z];};
   const corners=[v(i,j),v(i+1,j),v(i+1,j+1),v(i,j+1)];
   for(const [a,b,c] of [[0,1,2],[0,2,3]]){let pts=[corners[a],corners[b],corners[c]],x=pts[0][0],z=pts[0][2];
     const co=C('#677b60').lerp(C('#c1b88a'),noise(x*.23+6,z*.39)*.85+.08*rnd());
     pts.forEach(p=>{vs.push(...p);cs.push(co.r,co.g,co.b);});}
 }
 surface(vs,cs);
 const rv=[],rc=[];for(let i=0;i<115;i++){
   let edge=(j,k)=>{let z=-3.05-j*.131, x=river(z)+k*(.42+.12*Math.cos(z));return [x,ground(river(z),z)+.088,z];};
   for(const p of [edge(i,-1),edge(i,1),edge(i+1,1),edge(i,-1),edge(i+1,1),edge(i+1,-1)]){
     const col=C('#a5c2c2').lerp(C('#d6dfd7'),rnd()*.45);rv.push(...p);rc.push(col.r,col.g,col.b);}
 }
 surface(rv,rc);
 // Small firs have irregular whorls and a light-facing edge, even on the distant slope.
 const tv=[],tc=[];
 for(let i=0;i<2950;i++){
   let x=rnd()*36-18,z=-3.15-rnd()*14.8,dist=Math.abs(x-river(z));if(dist<.84||noise(x*.4,z*.43)<.32)continue;
   const y=ground(x,z),h=(.18+rnd()*.78)*(z> -6?1.26:1),w=h*(.17+rnd()*.06),tint=rnd()*.55;
   for(let tier=0;tier<3;tier++){const bot=y+h*(.12+.22*tier),top=y+h*(.61+tier*.2),r=w*(1-.23*tier),phase=rnd();
     for(let b=0;b<6;b++){let a=phase+b*Math.PI/3,aa=a+Math.PI/3;
       const co=C('#344e4d').lerp(C('#85947a'),tint+.17*(1+Math.cos(a)));
       for(const p of [[x+r*Math.cos(a),bot,z+r*Math.sin(a)],[x,top,z],[x+r*Math.cos(aa),bot-.018,z+r*Math.sin(aa)]]){tv.push(...p);tc.push(co.r,co.g,co.b);}}
   }
 }
 surface(tv,tc);
 const walls=mat('#d6c7a6'),roof=mat('#827b6c'),window=mat('#50605d');
 for(const [x,z] of [[-2.8,-8],[-3.43,-8.4],[-2.6,-8.85],[4.8,-11],[5.35,-10.6]]){
   const y=ground(x,z),h=.24;box(tree,x,y+h/2,z,.48,h,.37,walls);
   const r=mesh(tree,new T.CylinderGeometry(.40,.40,.55,3),roof,x,y+h+.05,z);r.rotation.z=Math.PI/2;r.rotation.x=Math.PI/2;
   box(tree,x+.07,y+.10,z+.19,.07,.16,.01,window);
 }
 Art.batch(tree);
 return outside;
}
