'use strict';
function buildLandscape(scene,aspect,state){
  const {V,rand,color,Model,mats,matrix,lantern}=Art,T=THREE;
  const clamp=PondPhysics.clamp,mix=PondPhysics.mix;
  const model=new Model(),ground=new Model(),under=new Model(),pebbles=new Model();
  const landKey=[
    [-220,-3,4],[-165,-3,4],[-150,-23,25],[-137,-35,36],[-119,-44,38],[-101,-41,36],
    [-91,-27,26],[-84,-4,11],[-77,-4,8],[-68,-9,0],[-58,-8,2],[-49,-5,6],[-43,-4,4],
    [-38,-5,5],[-34,-9,12],[-30,-17,17],[-20,-21,21],[-11,-19,18],[-4,-14,12],[1,-11,8],[5,-7,5],[9,-1,1],[14,0,.1],[200,0,.1]
  ];
  function limits(z){
    let i=1;while(i<landKey.length-1&&landKey[i][0]<z)i++;
    const a=landKey[i-1],b=landKey[i],t=clamp((z-a[0])/(b[0]-a[0]),0,1);
    return [mix(a[1],b[1],t)+.4*Math.sin(z*.62),mix(a[2],b[2],t)+.53*Math.sin(z*.47)];
  }
  const wave=(x,z)=>Math.sin(x*.53+z*.23)*.12+Math.cos(x*.27-z*.48)*.082+Math.sin(x*1.39+z*.74)*.048;
  function landY(x,z){const [l,r]=limits(z),d=Math.max(l-x,x-r);
    return -.34+Math.min(1.18,Math.max(0,d+.8)*.60)+Math.max(d,0)*.048+wave(x,z)*clamp(d+.6,0,2)+Math.max(0,Math.sin(z*.12+x*.15))*.5*clamp(d/4,0,1);
  }
  function grid(rows,cols,fn,collection,mat,col,shade){
    const pos=[],idx=[];
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){pos.push(...fn(i,j));if(i&&j){const k=i*(cols+1)+j;idx.push(k-cols-2,k-cols-1,k,k-cols-2,k,k-1);}}
    collection.surface(pos,idx,mat,col,shade);
  }
  for(const side of [-1,1]){
    grid(220,20,(i,j)=>{
      const z=19-i*.90,edges=limits(z),off=(Math.pow((side<0?20-j:j)/20,1.55)*45-.72)*side;
      const x=(side<0?edges[0]:edges[1])+off;return [x,landY(x,z),z];
    },ground,'snow','#e1e6e5',(v,n,c)=>{
      const e=limits(v.z),d=Math.max(e[0]-v.x,v.x-e[1]);
      if(d<.68+wave(v.x*2,v.z*2))return color(d<.0?'#746c59':'#b1a58b').multiplyScalar(.96+rand()*.09);
      return c.clone().multiplyScalar(.92+rand()*.12);
    });
  }
  // Continuous distant rock ridges with distinct windward snow fields and exposed ribs.
  for(let tier=0;tier<2;tier++){
    const ridge=new Model(),rows=15,cols=260,baseZ=-228-tier*64;
    const peaks=tier?[[.07,36,.09],[.28,42,.135],[.51,22,.12],[.66,44,.13],[.89,50,.12]]:
      [[.06,26,.085],[.24,34,.082],[.36,31,.055],[.47,16,.092],[.625,36,.09],[.72,28,.08],[.86,34,.076],[.96,23,.06]];
    grid(rows,cols,(i,j)=>{
      const t=j/cols,x=(t-.5)*440,u=i/rows;
      let top=6;for(const [center,h,w] of peaks)top=Math.max(top,6+h*Math.max(0,1-Math.abs(t-center)/w));
      const rib=Math.sin(t*212+u*3)*.72+Math.sin(t*529-u*6)*.32+Math.sin(t*77+u)*.9;
      const y=top*Math.pow(u,.80)+rib*(1.0+u*1.2)+Math.sin(t*1400+u*2)*.48;
      return [x,y-1,baseZ+(1-u)*39+rib*(3.8-u*1.6)];
    },ridge,'rock',tier?'#bed0d5':'#d6e0df',(v,n,c)=>{
      const rib=Math.sin(v.x*.68+v.y*.20)+Math.sin(v.x*.22+v.y*.14);
      if(n.y<.51+rib*.115 && v.y>7)return color(tier?'#9eafbc':'#899dab').multiplyScalar(.94+rand()*.13);
      if(v.y<9+rib*1.7)return color('#8d9eaa');return c.clone().multiplyScalar(.92+rand()*.13);
    });
    scene.add(ridge.group(false));
  }
  // Curved distant foothills surround the rest of the skating route.
  const rim=new Model();
  for(let i=0;i<66;i++){
    const a=i/66*Math.PI*2,dist=175+rand()*42;
    const x=Math.sin(a)*dist,z=-61+Math.cos(a)*dist;
    if(z< -155)continue;
    rim.ball(x,-3,z,24+rand()*26,9+rand()*16,23+rand()*21,'rock',i%2?'#a6b5be':'#b6c7cc');
  }
  scene.add(rim.group(false));
  const rockGeo=new T.IcosahedronGeometry(1,1);
  function rock(m,x,y,z,r,frost=true){
    const h=r*(.36+rand()*.27),d=r*(.55+rand()*.5),a=rand()*3;
    m.add(rockGeo,'rock',rand()>.5?'#7c8076':'#918b7e',matrix(V(x,y,z),V(r,h,d),[.09,a,.055]));
    if(frost)m.add(rockGeo,'snow','#e6e8df',matrix(V(x-.03*r,y+h*.44,z),V(r*.92,h*.73,d*.91),[.09,a,.055]));
  }
  for(let i=0;i<340;i++){
    const z=9-rand()*160,[l,r]=limits(z),side=rand()>.5?1:-1,x=(side<0?l:r)+side*(rand()*2.2-.35);
    rock(pebbles,x,landY(x,z),z,.12+Math.pow(rand(),2)*.79);
  }
  // Varied spruce whorls, irregular branch tips with snow carried on their upper surfaces.
  function spruce(m,x,y,z,h,far=false){
    const width=h*(.135+rand()*.074),rings=far?6:8,N=far?8:14,twist=rand()*6;
    m.rod([x,y,z],[x,y+h*.91,z],h*.026,h*.004,'bark','#695a48',6);
    for(let k=0;k<rings;k++){
      const v=k/rings,cy=y+h*(.12+v*.76),rad=width*(1-v*.86)*(.9+rand()*.16),height=h*(.32-v*.16);
      const pos=[],indices=[],offset=twist+k*2.12;
      for(let layer=0;layer<4;layer++)for(let j=0;j<N;j++){
        const a=j/N*Math.PI*2+offset,r=rad*[.26,1,.71,.035][layer]*(j%2?.81:1.12)*(1+rand()*.15),
          yy=cy+height*[-.04,.06,.39,1][layer]+(j%2?.035:-.048)*h*(layer===1?.7:.21);
        pos.push(x+Math.cos(a)*r,yy,z+Math.sin(a)*r);
      }
      for(let layer=1;layer<4;layer++)for(let j=0;j<N;j++){
        const a=(layer-1)*N+j,b=(layer-1)*N+(j+1)%N;indices.push(a,a+N,b,a+N,b+N,b);
      }
      const green=['#40594f','#4a6256','#526b60','#5a7064'][Math.floor(rand()*4)];
      m.surface(pos,indices,'leaf',green,(vv,n,c,j)=>{
        const level=Math.floor(j/N);return level>=2?color(level===3?'#e4e8db':(j%3?'#cbd6cb':'#aebfb4')):c;
      });
    }
  }
  const groves=new Map();
  function grove(x,z){const key=Math.floor(x/25)+','+Math.floor(z/26);
    if(!groves.has(key))groves.set(key,new Model());return groves.get(key);}
  for(let i=0;i<660;i++){
    const z=14-rand()*178,side=rand()>.5?1:-1,[l,r]=limits(z);
    const setback=1.5+Math.pow(rand(),.78)*48,x=(side<0?l:r)+side*setback;
    if(Math.abs(x)<10&&z>-.5||Math.abs(x)<9&&Math.abs(z+38)<4.8)continue;
    const h=(3.0+rand()*6.2)*(setback>21?1.22:1);
    spruce(grove(x,z),x,landY(x,z),z,h,setback>10);
  }
  for(let i=0;i<132;i++){
    const z=-153-rand()*23,x=(rand()-.5)*180;spruce(grove(x,z),x,.46,z,3+rand()*6,true);
  }
  for(const g of groves.values())scene.add(g.group());
  scene.add(ground.group(),pebbles.group());
  function birch(m,x,y,z,h){
    const lean=(rand()-.5)*.9;
    const A=[x,y,z],B=[x+lean,y+h,z+.22];m.rod(A,B,h*.025,h*.008,'bark','#d6cdb9',10);
    for(let i=0;i<24;i++){const t=rand()*.97,r=h*(.025-.017*t);
      m.ball(x+lean*t+r*(rand()-.5),y+t*h,z+.22*t+r*.76,r*(.45+rand()*.5),.016+rand()*.022,r*.32,'bark','#706c62',[0,0,(rand()-.5)*.3]);
    }
    for(let i=0;i<21;i++){
      const t=.28+rand()*.65,az=rand()*6.28,L=(1.05-t)*h*(.4+rand()*.42);
      const a=[x+lean*t,y+h*t,z+.22*t],b=[a[0]+Math.cos(az)*L*.54,a[1]+L*.47,a[2]+Math.sin(az)*L*.54];
      const c=[a[0]+Math.cos(az)*L,a[1]+L*(.9+rand()*.4),a[2]+Math.sin(az)*L];
      m.rod(a,b,.03*(h/5),.016,'bark','#a29680',6);m.rod(b,c,.017,.003,'bark','#8d826e',5);
      for(let j=0;j<3;j++){const v=rand(),d=b.map((n,k)=>mix(n,c[k],v));
        m.rod(d,[d[0]+(rand()-.5)*L*.46,d[1]+L*.3,d[2]+(rand()-.5)*L*.45],.01,.002,'bark','#8e8270',5);}
    }
  }
  for(let i=0;i<38;i++){
    const z=-3-rand()*142,[l,r]=limits(z),x=(i%2?r+1.2:l-1.2)+(rand()-.5)*1.4;
    birch(model,x,landY(x,z),z,3.6+rand()*4);
  }
  // Starter shore is a snow lip with its toes partly submerged in clear ice.
  const starter=new T.Group();scene.add(starter);
  const benchPos={x:-clamp(aspect*2.04,1.03,3.96),z:aspect<.8?-2.45:-.95};
  const bx=benchPos.x,bz=benchPos.z,bank=new Model(),centralX=bx-3.1,rx=4.46,rz=3.32;
  function ledge(x,z){
    const r=Math.hypot((x-centralX)/rx,(z-bz-.2)/rz);
    return -.21+.60*Math.max(0,1-Math.pow(r,6))+.044*Math.sin(x*2.7+z)*clamp((1-r)*7,0,1);
  }
  const rows=14,N=73,pp=[],ii=[];
  for(let i=0;i<=rows;i++)for(let j=0;j<N;j++){
    const a=j/N*Math.PI*2,r=.001+i/rows,rr=r*(1+.026*Math.sin(a*7)+.018*Math.sin(a*13+.6));
    const x=centralX+rx*rr*Math.cos(a),z=bz+.2+rz*rr*Math.sin(a);
    pp.push(x,ledge(x,z),z);if(i){const k=i*N+j,l=i*N+(j+1)%N;ii.push(k-N,l,k,l-N,l,k-N);}
  }
  bank.surface(pp,ii,'snow','#edefe6',(v,n,c)=>v.y<.06?color('#afa58c'):c.clone().multiplyScalar(.96+rand()*.055));
  for(let i=0;i<45;i++){
    const a=rand()*6.28,x=centralX+rx*.94*Math.cos(a),z=bz+.2+rz*.94*Math.sin(a);
    rock(bank,x,ledge(x,z)-.04,z,.08+rand()*.23);
  }
  birch(bank,bx-2.51,.28,bz-.35,4.8);birch(bank,bx-2.76,.22,bz-1.03,3.9);
  starter.add(bank.group());
  const bench=Art.bench();bench.position.set(bx,.39,bz);bench.rotation.y=aspect<.8?-.96:-.51;bench.rotation.y+=Math.PI;starter.add(bench);
  const lampStand=new Model();lantern(lampStand,-.70,.637,-.012,.78,true);bench.add(lampStand.group());
  // Stream bed, trapped air and grass below the transparent sheet.
  grid(99,46,(i,j)=>{const x=-48+j*2.08,z=15-i*1.79;
    return [x,-.49+.094*Math.sin(x*.71+z*.56)+.07*Math.cos(z*.46-x*.22),z];
  },under,'bed','#72a7ae',(v,n,c)=>{const a=Math.sin(v.x*.37+v.z*.28)+Math.cos(v.z*.65-v.x*.15);
    return c.clone().lerp(color('#a6b9a0'),Math.max(0,a*.26)).multiplyScalar(.88+rand()*.18);});
  function reedClump(m,x,y,z,h,count,submerged=false){
    for(let i=0;i<count;i++){
      const a=rand()*6.28,r=rand()*.18,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r,H=h*(.36+rand()*.65),dx=Math.cos(a)*H*.44,dz=Math.sin(a)*H*.37;
      const base=[xx,y,zz],mid=[xx+dx*.22,y+H*.65,zz+dz*.28],tip=[xx+dx,y+H,zz+dz];
      const c=submerged?'#8b8960':(i%3?'#bb9866':'#9d784e');
      m.rod(base,mid,.009*clamp(h,.45,1.5),.0065*clamp(h,.45,1.5),'wood',c,4);
      m.rod(mid,tip,.0067*clamp(h,.45,1.5),.0014,'wood',c,4);
      if(!submerged&&i%5===0)m.rod([tip[0]-.024,tip[1]-.078,tip[2]],tip,.019,.013,'wood','#90734d',6);
    }
  }
  for(let i=0;i<153;i++){
    const z=6-rand()*151,[l,r]=limits(z),x=mix(l,r,rand());reedClump(under,x,-.48,z,.3+rand()*.18,6,true);
    if(i%3===0)rock(under,x,-.43,z,.14+rand()*.25,false);
  }
  for(let i=0;i<126;i++){
    const z=5-rand()*151,[l,r]=limits(z),x=(i%2?r:l)+(rand()-.5)*1.2;
    reedClump(model,x,Math.max(-.12,landY(x,z)),z,.4+rand()*.84,9);
  }
  const edgeGrass=new Model();
  for(let i=0;i<17;i++){const a=rand()*6.28,x=centralX+Math.cos(a)*rx*.93,z=bz+.2+Math.sin(a)*rz*.91;reedClump(edgeGrass,x,ledge(x,z),z,.35+rand()*.32,12);}
  starter.add(edgeGrass.group());
  const reeds=[];
  for(let i=0;i<15;i++){
    const m=new Model(),a=i/15*2.8-1.4,x=centralX+Math.cos(a)*rx*.87,z=bz+.2+Math.sin(a)*rz*.88;
    reedClump(m,0,0,0,.46+rand()*.3,12);
    const g=m.group();g.position.set(x,ledge(x,z),z);starter.add(g);reeds.push(g);
  }
  const underwater=under.group(false);scene.add(underwater);
  // Keystone arch built from individual voussoirs; the channel runs through its opening.
  const bridgeZ=-37,span=4.45,soffit=2.65,deck=y=>2.74+.73*(1-Math.pow(y/7,2));
  function stoneBlock(x0,x1,y0,y1,top0,top1,z,depth,shade){
    const pos=[x0,y0,z,x1,y1,z,x1,top1,z,x0,top0,z,x0,y0,z-depth,x1,y1,z-depth,x1,top1,z-depth,x0,top0,z-depth];
    model.surface(pos,[0,1,2,0,2,3,5,4,7,5,7,6,3,2,6,3,6,7,0,4,5,0,5,1,0,3,7,0,7,4,1,5,6,1,6,2],'rock',shade);
  }
  const archBase=x=>Math.abs(x)>=span?-.4:.15+soffit*Math.sqrt(1-Math.pow(x/span,2));
  for(let i=0;i<46;i++){
    const x=-7+i*14/46,xx=x+14/46;stoneBlock(x,xx,archBase(x),archBase(xx),deck(x),deck(xx),bridgeZ+.94,1.88,'#928c7f');
  }
  for(const front of [-1,1]){
    const face=bridgeZ+front*.968;
    for(let i=0;i<25;i++){
      const a=i/25*Math.PI+.007,b=(i+1)/25*Math.PI-.007;
      const pos=[];for(const z of [face,face-front*.115])for(const [t,d] of [[a,0],[a,.32],[b,.32],[b,0]])pos.push(Math.cos(t)*(span+d),.14+Math.sin(t)*(soffit+d),z);
      model.surface(pos,[0,2,1,0,3,2,4,5,6,4,6,7,1,2,6,1,6,5,0,4,7,0,7,3],'rock',['#c4bba5','#acaa9a','#b8af99','#cfbea3'][i%4]);
    }
    for(let r=0;r<4;r++)for(let j=0;j<23;j++){
      const x=-6.84+j*.61+(r%2)*.28,base=.60+r*.54,yy=base+.45;
      if(x>6.85||base<archBase(x)+.18||yy>deck(x)-.06)continue;
      model.box(x,base+.21,face,.57,.42,.081,'rock',['#a39883','#afa995','#9b9688'][j%3],[0,0,(rand()-.5)*.055]);
    }
    for(let j=0;j<=10;j++){
      const x=-7+j*1.4,y=deck(x);
      model.box(x,y+.54,bridgeZ+front*.90,.13,1.09,.135,'wood','#79694f');
      model.box(x,y+1.095,bridgeZ+front*.90,.168,.052,.17,'snow','#ebe9dd');
      if(j<10){const end=x+1.4;
        for(const off of [.38,.91])model.rod([x,y+off,bridgeZ+front*.9],[end,deck(end)+off,bridgeZ+front*.9],.057,.057,'wood','#90795a',8);
      }
    }
  }
  for(let j=0;j<49;j++){const x=-6.96+j*.29;model.box(x,deck(x)+.032,bridgeZ,.282,.065,2.06,'snow','#e4e5d9',[0,0,-x*.03]);}
  for(const x of [-5.57,5.57])lantern(model,x,deck(x)+1.10,bridgeZ+.9,1.05,true);
  // Snow-covered ramps let the bridge connect to both banks.
  for(const sign of [-1,1])model.ball(sign*8.5,1.15,bridgeZ,4.23,1.64,2.62,'snow','#e5e8df');
  const bells=[];
  for(let i=0;i<5;i++){
    const m=new Model(),l=state.bells[i].arm;m.rod([0,0,0],[0,-l,0],.006,.006,'wool','#85775a',5);
    m.rod([0,-l-.16,0],[0,-l,0],.063,.045,'brass','#ba9e69',10);
    const g=m.group();g.position.set((i-2)*.52,2.70-Math.abs(i-2)*.05,bridgeZ+.44);scene.add(g);bells.push(g);
  }
  function cabin(x,z,size){
    const m=new Model(),w=1.75,h=1.65,d=1.5;
    m.box(0,.84,0,w*2,h,d*2,'wood','#896d52');
    for(let i=0;i<10;i++)m.box(0,.13+i*.166,d+.015,3.53,.026,.031,'wood','#6c5948');
    for(const side of [-1,1]){
      m.box(side*.92,2.15,0,2.29,.15,3.55,'wood','#675c4b',[0,0,-side*.57]);
      m.box(side*.92,2.23,0,2.32,.12,3.62,'snow','#e9e9de',[0,0,-side*.57]);
    }
    m.surface([-w,h,d,w,h,d,0,2.69,d],[0,1,2],'wood','#927457');
    for(const sx of [-.91,.89]){
      m.box(sx,.88,d+.043,.70,.69,.07,'wood','#64553f');m.box(sx,.88,d+.09,.57,.55,.03,'glow','#edbc74');
      m.box(sx,.88,d+.112,.033,.59,.03,'wood','#70583d');m.box(sx,.88,d+.113,.59,.031,.03,'wood','#70583d');
      m.box(sx,.55,d+.07,.78,.07,.21,'snow','#e2e4dc');
    }
    m.box(.84,2.54,-.53,.42,1.25,.43,'rock','#9c8974');m.box(.84,3.17,-.53,.53,.065,.54,'snow','#e6e5da');
    const g=m.group();g.position.set(x,landY(x,z)+.03,z);g.rotation.y=-.36;g.scale.setScalar(size);scene.add(g);
  }
  cabin(15.8,-32.5,1.08);cabin(-42,-109,1.4);
  // A soft, irregular snow ribbon rises over the ice on the far side of the arch.
  const snowfield=new Model(),start=PondPhysics.ends[1]-1,finish=PondPhysics.ends[2]+1;
  grid(92,40,(i,j)=>{
    const s=mix(start,finish,i/92),q=PondPhysics.path(s),off=(j/40-.5)*(6.7+.33*Math.sin(s*.45));
    const y=(.044+.085*(1-Math.pow(Math.abs(off)/3.55,3))+.014*Math.sin(s*.7+off*2))*clamp((s-start)/1.2,0,1)*clamp((finish-s)/1.7,0,1);
    return [q.x-q.dz*off,y,q.z+q.dx*off];
  },snowfield,'snow','#f2eee0',(v,n,c)=>c.clone().multiplyScalar(.95+rand()*.07));
  const snowGroup=snowfield.group(false),snowGeometry=snowGroup.children[0].geometry;
  scene.add(snowGroup);
  const originalSnow=snowGeometry.attributes.position.array.slice(),originalColor=snowGeometry.attributes.color.array.slice();
  function depressSnow(){
    const pos=snowGeometry.attributes.position,col=snowGeometry.attributes.color;
    for(let i=0;i<=92;i++){
      const distance=mix(start,finish,i/92),u=clamp(distance/PondPhysics.length*112-.5,0,111);
      const a=state.cells[Math.floor(u)],b=state.cells[Math.min(111,Math.ceil(u))],w=u%1;
      const compaction=mix(a.compact,b.compact,w),lane=mix(a.pressLane,b.pressLane,w);
      for(let j=0;j<=40;j++){
        const k=i*41+j,off=(j/40-.5)*(6.7+.33*Math.sin(distance*.45));
        const groove=compaction*Math.exp(-Math.pow((Math.abs(off-lane)-.245)/.16,2));
        pos.setY(k,originalSnow[k*3+1]-.041*groove);
        col.setXYZ(k,originalColor[k*3]*(1-.23*groove),originalColor[k*3+1]*(1-.18*groove),originalColor[k*3+2]*(1-.09*groove));
      }
    }
    pos.needsUpdate=true;col.needsUpdate=true;snowGeometry.computeVertexNormals();
  }
  const boatModels=[];
  for(let i=0;i<2;i++){
    const hull=new Model(),sail=new Model();
    hull.ball(0,.27,0,.49,.23,1.18,'wood','#946948');hull.ball(0,.443,0,.32,.032,.85,'wood','#be9772');
    hull.rod([-1.0,.22,.29],[1.0,.22,.29],.079,.079,'wood','#987650');
    for(const side of [-1,1])hull.box(side*.94,.107,.26,.065,.16,.79,'blade','#afbec0');
    hull.rod([0,.45,-.40],[0,2.94,-.40],.043,.029,'wood','#a88961');
    const ps=[],is=[];for(let j=0;j<=10;j++)for(let k=0;k<=6;k++){
      const u=j/10,v=k/6;ps.push((1-u)*(.19*Math.sin(v*Math.PI)),.64+2.23*u,-.37+(1-u)*1.63*v);
      const n=j*7+k;if(j&&k)is.push(n-8,n-7,n,n-8,n,n-1);
    }
    sail.surface(ps,is,'cloth','#ede4ca',(v,n,c,id)=>[2,3].includes(Math.floor(id/7))?color(i?'#ad7958':'#c18d65'):c);
    const g=hull.group(),sg=sail.group();g.add(sg);scene.add(g);boatModels.push({g,sg});
  }
  const lampModels=[];
  state.lamps.forEach((l,i)=>{
    const m=new Model();m.rod([l.x,0,l.z],[l.x,.91,l.z],.10,.072,'wood','#7b6953',7);
    lantern(m,l.x,.93,l.z,1.5,false);rock(m,l.x,-.05,l.z,.4);scene.add(m.group());
    const flame=new T.Mesh(new T.SphereGeometry(.091,10,8),new T.MeshStandardMaterial({color:0xffd89e,emissive:0xffa440,emissiveIntensity:0,roughness:.38}));
    flame.position.set(l.x,1.27,l.z);flame.scale.set(.62,1.28,.62);scene.add(flame);lampModels.push(flame);
  });
  scene.add(model.group());
  function fitShore(aspect){
    starter.position.set(-clamp(aspect*2.04,1.03,3.96)-bx,0,(aspect<.8?-2.45:-.95)-bz);
    bench.rotation.y=Math.PI+(aspect<.8?-.96:-.51);
  }
  return {fitShore,depressSnow,reeds,bells,boatModels,lampModels,underwater,bench,limits,ledge};
}
