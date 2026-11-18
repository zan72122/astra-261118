'use strict';
const Art=(()=>{
  const T=THREE, rand=PondPhysics.random(7189), V=(x,y,z)=>new T.Vector3(x,y,z);
  const color=h=>new T.Color(h), boxGeo=new T.BoxGeometry(), sphere=new T.SphereGeometry(1,14,10),smallSphere=new T.SphereGeometry(1,8,5);
  const mats={};
  function material(name,rough,metal=0,extra={}){
    const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:metal,...extra});
    m.onBeforeCompile=s=>{
      s.vertexShader='varying vec3 vGrain;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGrain=position;');
      s.fragmentShader='varying vec3 vGrain;\n'+s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+0.027*sin(dot(floor(vGrain*143.0),vec3(1.73,2.51,3.19))),0.04,1.0);');
    };
    mats[name]=m;
  }
  material('snow',.83);material('rock',.84);material('wood',.71);material('bark',.92);
  material('leaf',.86);material('leather',.46);material('wool',.98);
  material('blade',.135,.89);material('brass',.24,.75);material('dark',.39,.45);
  material('glass',.12,.15,{transparent:true,opacity:.54,depthWrite:false});
  material('glow',.33,.2,{emissive:0xffbc62,emissiveIntensity:1.0});
  material('bed',.71);material('etch',.43,.05,{transparent:true,opacity:.57,depthWrite:false});
  const unit=V(1,1,1),up=V(0,1,0);
  function matrix(pos,scale,rot){
    return new T.Matrix4().compose(pos||V(0,0,0),rot?.isQuaternion?rot:new T.Quaternion().setFromEuler(new T.Euler(...(rot||[0,0,0]))),scale||unit);
  }
  // Concatenate opaque parts by finish. A forest has the draw-call cost of a few materials.
  class Model {
    constructor(){this.parts=new Map();}
    add(g,finish,h,mat=null,shade=null){
      if(!this.parts.has(finish))this.parts.set(finish,{p:[],n:[],c:[],idx:[]});
      const d=this.parts.get(finish),p=g.attributes.position,n=g.attributes.normal,base=d.p.length/3;
      const v=V(0,0,0),normal=V(0,0,0),normalMat=mat?new T.Matrix3().getNormalMatrix(mat):null,col=color(h);
      for(let i=0;i<p.count;i++){
        v.fromBufferAttribute(p,i);normal.fromBufferAttribute(n,i);
        if(mat){v.applyMatrix4(mat);normal.applyMatrix3(normalMat).normalize();}
        d.p.push(v.x,v.y,v.z);d.n.push(normal.x,normal.y,normal.z);
        const c=shade?shade(v,normal,col,i):col;d.c.push(c.r,c.g,c.b);
      }
      if(g.index){for(const i of g.index.array)d.idx.push(i+base);}
      else for(let i=0;i<p.count;i++)d.idx.push(base+i);
    }
    box(x,y,z,w,h,d,m,c,rot){this.add(boxGeo,m,c,matrix(V(x,y,z),V(w,h,d),rot));}
    ball(x,y,z,w,h,d,m,c,rot){this.add(m==='bark'||Math.max(w,h,d)<.082?smallSphere:sphere,m,c,matrix(V(x,y,z),V(w,h,d),rot));}
    rod(a,b,r1,r2,m,c,sides=9){
      const dir=V(...b).sub(V(...a)),len=dir.length();if(len<1e-6)return;
      const q=new T.Quaternion().setFromUnitVectors(up,dir.normalize());
      this.add(new T.CylinderGeometry(r2,r1,len,sides),m,c,matrix(V(...a).add(V(...b)).multiplyScalar(.5),unit,q));
    }
    tube(pts,r,m,c,seg=12,sides=6){
      const curve=new T.CatmullRomCurve3(pts.map(p=>V(...p)));
      this.add(new T.TubeGeometry(curve,seg,r,sides,false),m,c);
    }
    surface(positions,indices,m,h,shade){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();this.add(g,m,h,null,shade);
    }
    group(shadow=true){
      const group=new T.Group();
      this.parts.forEach((d,m)=>{
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(d.p,3));
        g.setAttribute('normal',new T.Float32BufferAttribute(d.n,3));g.setAttribute('color',new T.Float32BufferAttribute(d.c,3));g.setIndex(d.idx);
        const mesh=new T.Mesh(g,mats[m]);mesh.castShadow=shadow;mesh.receiveShadow=true;group.add(mesh);
      });
      this.parts.clear();return group;
    }
  }
  function boot(){
    const m=new Model(),N=44;
    // Horizontal leather lasts: height, half-width, toe, heel.
    const levels=[[.198,.139,-.451,.198],[.218,.148,-.468,.203],[.247,.153,-.464,.202],
      [.29,.151,-.438,.202],[.333,.145,-.374,.199],[.385,.132,-.275,.195],
      [.46,.121,-.176,.185],[.55,.113,-.112,.177],[.64,.115,-.088,.176],
      [.702,.124,-.093,.18],[.737,.124,-.089,.176]];
    function shape(levels,finish,col){
      const pos=[],idx=[];
      levels.forEach(([y,w,front,back],j)=>{
        for(let i=0;i<N;i++){
          const a=2*Math.PI*i/N,c=Math.cos(a),s=Math.sin(a);
          pos.push(w*Math.sign(s)*Math.pow(Math.abs(s),.82)*(1-.08*c),y,(back+front)/2+(back-front)*.5*c);
          const k=j*N+i,l=j*N+(i+1)%N;
          if(j)idx.push(k-N,l-N,k,l-N,l,k);
        }
      });
      // The top of the boot stays open.
      m.surface(pos,idx,finish,col);
    }
    shape(levels,'leather','#f2e9d7');
    shape([[.162,.14,-.456,.205],[.177,.151,-.475,.209],[.197,.154,-.477,.21],[.208,.15,-.47,.205]],'leather','#86684f');
    shape([[.185,.154,-.476,.21],[.193,.155,-.477,.211]],'leather','#d0af87');
    m.ball(0,.202,-.13,.144,.012,.335,'leather','#ddd1b9');
    m.box(0,.135,.117,.203,.076,.151,'wood','#72533e',[.035,0,0]);
    m.box(0,.098,.117,.197,.012,.15,'dark','#534a43');
    // Continuous ribbon cuff, lined in suede with a dark recessed opening.
    shape([[.704,.126,-.10,.182],[.72,.132,-.105,.187],[.747,.133,-.105,.185],[.758,.122,-.094,.175]],'wool','#faf0d8');
    m.ball(0,.735,.044,.113,.013,.123,'leather','#705950');
    m.ball(0,.754,-.071,.093,.025,.027,'leather','#ddc6a3',[.35,0,0]);
    for(let i=0;i<56;i++){
      const a=i/56*2*Math.PI;
      m.ball(.123*Math.sin(a),.745+rand()*.004,.04+.136*Math.cos(a),.012,.014+rand()*.006,.012,'wool',i%4?'#eee3cc':'#fff3df');
    }
    m.tube([[0,.291,-.432],[0,.365,-.293],[0,.467,-.174],[0,.57,-.118],[0,.693,-.101],[0,.757,-.085]],.023,'leather','#e4d5bc',22);
    const eye=[[.34,-.336,.071],[.386,-.252,.072],[.438,-.186,.073],[.491,-.137,.074],[.55,-.103,.076],[.61,-.085,.078],[.673,-.081,.079]];
    for(const side of [-1,1]){
      const lace=eye.map(([y,z,x])=>[side*x,y,z+.007]);
      m.tube(lace,.008,'leather','#d4bfa1',20);
      for(let k=0;k<eye.length;k++){
        const [y,z,x]=eye[k];
        m.ball(side*x,y,z,.016,.014,.009,'brass','#bb9455');
        m.ball(side*x,y+.001,z-.006,.008,.008,.005,'dark','#665744');
        if(k<eye.length-1){const [yy,zz,xx]=eye[k+1];
          m.tube([[side*x,y,z-.008],[side*x*.32,(y+yy)*.5-.004,(z+zz)*.5-.037],[-side*xx,yy,zz-.009]],.0065,'wool','#fff2d9',8);}
      }
      const sideSeam=[[side*.091,.23,-.393],[side*.142,.28,-.21],[side*.143,.329,-.062],[side*.118,.45,.018],[side*.113,.62,.044],[side*.119,.691,.039]];
      m.tube(sideSeam,.0037,'leather','#c4b69e',20);
      const seam=new T.CatmullRomCurve3(sideSeam.map(q=>V(...q)));
      for(let i=0;i<23;i++){const a=seam.getPoint(i/24),b=seam.getPoint((i+.38)/24);a.y+=.011;b.y+=.011;m.rod(a.toArray(),b.toArray(),.0018,.0018,'wool','#fff5dc',4);}
      m.tube([[side*.076,.673,-.09],[side*.133,.706,-.145],[side*.142,.667,-.167],[side*.058,.674,-.136],[0,.667,-.12]],.007,'wool','#f8eed8');
      m.tube([[0,.667,-.12],[side*.094,.64,-.146],[side*.14,.541,-.1]],.006,'wool','#f5e9d2');
      m.ball(side*.142,.535,-.098,.006,.015,.006,'brass','#bc9a70');
    }
    // Extruded rocker blade with curved toe pick, heel/toe plates and polished edge.
    const profile=[[-.49,.115],[-.475,.072],[-.445,.042],[-.405,.023],[-.30,.011],[.149,.011],[.211,.021],[.223,.064],[.20,.076],[-.31,.065],[-.38,.077],[-.44,.113],[-.472,.132]];
    const pos=[],idx=[];for(const x of [-.012,.012])for(const [z,y] of profile)pos.push(x,y,z);
    const poly=profile.map(([z,y])=>new T.Vector2(z,y)),tri=T.ShapeUtils.triangulateShape(poly,[]),n=poly.length;
    tri.forEach(([a,b,c])=>idx.push(a,b,c,c+n,b+n,a+n));
    for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,i+n,j,j,i+n,j+n);}
    m.surface(pos,idx,'blade','#bccdd3');
    for(const x of [-.013,.013])m.tube([[x,.020,.20],[x,.017,-.1],[x,.018,-.3],[x,.034,-.416],[x,.077,-.47]],.004,'blade','#eef7fc');
    for(const z of [-.285,.12]){
      m.box(0,z<0?.115:.084,z,.051,z<0?.105:.065,.064,'blade','#b8c5c8',[z<0?-.17:.12,0,0]);
      m.box(0,z<0?.161:.097,z,.167,.012,.096,'blade','#b6c1c0');
    }
    return m.group();
  }
  function bench(){
    const m=new Model(),length=2.25;
    for(const x of [-.83,.83]){
      for(const z of [-.22,.22])m.box(x,.295,z,.104,.58,.10,'wood','#5f4938',[z*.22,0,x*.07]);
      m.box(x,.52,0,.12,.11,.67,'wood','#70513b');
      m.box(x,.83,.26,.09,.88,.085,'wood','#795d45',[.12,0,0]);
    }
    m.box(0,.25,.13,1.8,.077,.075,'wood','#6d523b');
    function board(y,z,d,h,back,i){
      const col=['#936c4b','#a47953','#896448','#99714f'][i%4],a=back?.12:0;
      m.box(0,y,z,length,h,d,'wood',col,[a,0,0]);
      // Narrow, interrupted grain ribbons, bolt heads and ledges of snow.
      for(let j=0;j<13;j++){
        const x=(rand()-.5)*1.8,l=.04+rand()*.34;
        if(back)m.box(x,y+(rand()-.5)*h*.75,z-d*.505,l,.0027,.002,'wood','#76563e',[0,0,(rand()-.5)*.025]);
        else m.box(x,y+h*.508,z+(rand()-.5)*d*.75,l,.002,.0028,'wood','#795a41');
      }
      for(const x of [-.83,.83])m.ball(x,back?y:y+h*.52,back?z-d*.54:z,.014,.012,.01,'dark','#584f44');
    }
    for(let i=0;i<4;i++)board(.598,-.238+i*.157,.145,.061,false,i);
    for(let i=0;i<3;i++)board(.84+i*.179,.269+i*.022,.069,.157,true,i);
    m.ball(-.12,1.283,.314,1.04,.025,.052,'snow','#f5f2e5');
    m.ball(.48,.634,.169,.54,.015,.08,'snow','#efece1');
    // A ribbed wool scarf follows the back, seat and the front edge.
    const scarf=new T.CatmullRomCurve3([[.32,1.03,.377],[.39,1.288,.35],[.40,1.277,.265],[.36,.83,.174],[.30,.649,.11],[.27,.646,-.19],[.24,.60,-.315],[.20,.30,-.34]].map(v=>V(...v)));
    const pos=[],idx=[];
    for(let i=0;i<=68;i++){const a=scarf.getPoint(i/68);for(let j=0;j<=8;j++){
      const u=j/8;pos.push(a.x+(u-.5)*.27,a.y+.008*Math.cos(u*17),a.z-.007*Math.cos(u*17));
      const v=i*9+j;if(i&&j)idx.push(v-10,v-1,v,v-10,v,v-9);
    }}
    if(!mats.cloth){material('cloth',.97,0,{side:T.DoubleSide});}
    m.surface(pos,idx,'cloth','#a35d3f',(v,n,c,i)=>{const row=Math.floor(i/9);return [6,7,9,10,58,59,62,63].includes(row)?color('#d7b28a'):c;});
    for(let j=0;j<12;j++){let x=.07+j*.024;m.rod([x,.30,-.34],[x-.013,.23+rand()*.02,-.335],.006,.004,'wool','#a56847',5);}
    return m.group();
  }
  function lantern(m,x,y,z,scale=1,lit=true){
    const s=scale;
    m.box(x,y+.025*s,z,.32*s,.05*s,.30*s,'dark','#464d49');
    m.box(x,y+.22*s,z,.239*s,.35*s,.226*s,'glass','#efce8e');
    for(const a of [-1,1])for(const b of [-1,1])m.rod([x+a*.13*s,y+.04*s,z+b*.12*s],[x+a*.153*s,y+.424*s,z+b*.14*s],.013*s,.011*s,'dark','#55564c',6);
    m.rod([x,y+.423*s,z],[x,y+.548*s,z],.236*s,.06*s,'dark','#5b594e',4);
    m.ball(x,y+.552*s,z,.043*s,.04*s,.043*s,'brass','#ab885a');
    m.box(x,y+.115*s,z,.116*s,.15*s,.11*s,'wool','#e6cdaa');
    if(lit)m.ball(x,y+.223*s,z,.026*s,.063*s,.026*s,'glow','#ffdf90');
  }
  return {T,V,rand,color,matrix,Model,mats,material,boot,bench,lantern};
})();
