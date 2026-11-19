'use strict';
function buildLibrary(scene,sim){
  const {T,tau,rand,G,mat,wood,M,mesh,box,cyl,orb,lathe,rod,torus,leaf,batch,volume,upright,coverM}=Craft;
  const env=G(scene),outer=G(env),inner=G(env),yard=G(env),decor=G(env),fixture=G(env);
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  function framed(p,x,y,z,w,h,d,b,base,frame){
    box(p,x,y,z,w,h,d,base);
    for(const side of [-1,1]){
      box(p,x+side*(w/2-b/2),y,z+d/2,b,h,.018,frame);
      box(p,x,y+side*(h/2-b/2),z+d/2,w-2*b,b,.018,frame);
    }
  }
  // Fluted columns, inset panels and layered crown profiles catch grazing light.
  function pillar(p,x,y,z,h,w){
    box(p,x,y+h/2,z,w,h,.086,M.oak);
    for(let i=-1;i<=1;i++)box(p,x+i*w*.22,y+h/2,z+.043,w*.08,h-.17,.009,M.edge);
    for(let side of [-1,1]){box(p,x,y+h/2+side*(h/2-.041),z,w*1.18,.082,.093,M.edge);
      box(p,x,y+h/2+side*(h/2-.089),z,w*1.12,.016,.095,M.honey);}
  }
  function shrub(p,x,y,z,height,n,indoor=false){
    const g=G(p,x,y,z),stem=indoor?M.stem:M.dark;
    for(let i=0;i<n;i++){
      const a=rand()*tau,l=height*(.44+.54*rand()),r=height*(indoor?.30:.42)*(.24+rand()*.76);
      const ex=Math.cos(a)*r,ez=Math.sin(a)*r;
      rod(g,[0,0,0],[ex*.4,l*.50,ez*.4],height*.009,stem,height*.005);
      rod(g,[ex*.4,l*.50,ez*.4],[ex,l,ez],height*.006,stem,height*.002);
      for(let j=0;j<(indoor?9:13);j++){
        const f=.28+rand()*.74,side=j%2?1:-1;
        const base=[ex*f,l*f,ez*f],dx=(Math.cos(a+.9*side)*.12)*height,dz=Math.sin(a+.9*side)*height*.12;
        leaf(g,base,[base[0]+dx,base[1]+height*(.038+rand()*.10),base[2]+dz],height*(indoor?.034:.045),M.leaf[(rand()*5)|0],.38);
      }
    }return g;
  }
  function pot(p,x,y,z,size){
    const g=G(p,x,y,z);lathe(g,0,0,0,[[.52,0],[.57,.06],[.72,.12],[.87,.52],[.73,.85],[.60,.93],[.63,.99],[.62,1.05],[.54,1.05],[.54,.96]].map(([a,b])=>[a*size,b*size]),M.ceramic);
    cyl(g,0,size*.98,0,size*.54,size*.54,.005,M.darkSoil);return g;
  }
  // Rear wall is built around real openings, both for the window and secret door.
  const wallZ=-.94;
  box(outer,0,3.72,wallZ,13,1.5,.19,M.ivory);
  box(outer,-4.62,1.56,wallZ,2.3,3.14,.19,M.ivory);
  box(outer,-2.36,.36,wallZ,2.24,.72,.2,M.ivory);
  box(outer,-1.02,1.5,wallZ,.49,3,.2,M.ivory);
  box(outer,3.53,1.56,wallZ,5.18,3.14,.2,M.ivory);
  box(fixture,0,3.25,0,13,.1,11,M.ivory).castShadow=false;
  box(outer,-4.6,.31,1.55,.15,.62,6,M.ivory);
  const floorM=[0xb19573,0xb99e7f,0xc3a988,0xaa9276,0xb69b7c,0xbfa386].map(c=>wood(c,.67));
  for(let row=0;row<28;row++){
    for(let j=-4;j<5;j++){const z=-1.4+row*.20,x=j*1.24+(row%3)*.411;box(outer,x,-.035,z,1.236,.061,.198,floorM[Math.floor(rand()*6)]);}
  }
  // A layered woven carpet, with geometric borders made of individual threads.
  const rugG=G(outer,.38,.005,1.32);rugG.rotation.y=.027;
  const rug1=mat(0x798476,.95,0,{map:Craft.textile}),rug2=mat(0xb0a385,.93),rug3=mat(0x586c61,.94);
  box(rugG,0,0,0,3.5,.009,2.35,rug1);
  for(let u of [-1,1]){
    for(let [inset,width,m] of [[.028,.011,rug2],[.072,.04,rug3],[.112,.009,rug2],[.17,.012,rug3],[.207,.006,rug2]]){
      box(rugG,u*(1.75-inset),.006,0,width,.002,2.35-2*inset,m);
      box(rugG,0,.006,u*(1.175-inset),3.5-2*inset,.002,width,m);
    }
    for(let k=0;k<98;k++)rod(rugG,[-1.74+k*.036,.002,u*1.174],[-1.74+k*.036+(rand()-.5)*.01,.001,u*(1.197+rand()*.014)],.0018,rug2);
    for(let k=0;k<26;k++){const a=box(rugG,-1.565+k*.125,.008,u*.987,.022,.001,.022,rug2);a.rotation.y=.785;}
  }
  function windowFrame(p,cx,base,z,w,h,nx,ny){
    for(const side of [-1,1]){
      box(p,cx+side*(w/2+.028),base+h/2,z,.073,h+.14,.17,M.trim);
      box(p,cx+side*(w/2+.065),base+h/2,z+.06,.023,h+.19,.09,M.pale);
      box(p,cx,base+(side+1)*h/2,z,w+.17,.077,.17,M.trim);
    }
    for(let i=1;i<nx;i++)box(p,cx-w/2+w*i/nx,base+h/2,z,.034,h,.048,M.pale);
    for(let i=1;i<ny;i++)box(p,cx,base+h*i/ny,z,w,.034,.047,M.pale);
    box(p,cx,base-.048,z+.042,w+.25,.063,.30,M.pale);
    box(p,cx,base-.103,z,w+.15,.052,.16,M.trim);
  }
  windowFrame(outer,-2.36,.72,-.83,2.22,2.28,3,3);
  box(outer,-2.36,1.85,-.93,2.21,2.27,.009,M.pane);
  for(const y of [.081,.54,.62])box(outer,-2.33,y,-.796,2.8,y===.081?.16:.036,.061,M.trim);
  for(let j=0;j<4;j++)framed(outer,-3.39+j*.58,.31,-.811,.50,.34,.03,.015,M.ivory,M.trim);
  // Pleated linen valance and a fine rail above the sunlit window.
  const linen=mat(0xe2d8bc,.96,0,{map:Craft.textile,side:T.DoubleSide});
  rod(outer,[-3.59,2.95,-.68],[-1.15,2.95,-.68],.014,M.aged);
  function curtain(cx,width,dir){
    const geo=new T.PlaneGeometry(1,1,30,18),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const u=p.getX(i)+.5,f=.5-p.getY(i),gather=.96-.37*Math.exp(-Math.pow((f-.75)/.19,2));
      p.setXYZ(i,cx+dir*(u*width*gather-.05*f),2.94-f*(2.14+.018*Math.cos(u*31)),-.68+.050*Math.cos(u*35+.5*f)+.018*f);}
    geo.computeVertexNormals();mesh(outer,geo,linen);
  }
  curtain(-3.46,.39,1);curtain(-1.26,.30,-1);
  // Garden beyond the large outer window, separated in depth from the sill.
  box(yard,0,-.14,-7,18,.22,15,mat(0xa6ad88,.96));
  const farwall=mat(0xd5d0b8);
  box(yard,0,.6,-8.6,18,1.4,.24,farwall);
  for(let i=0;i<13;i++){
    const x=-6.5+i*1.15,z=-7.7-rand()*1.8,h=1.5+rand()*1.6;
    rod(yard,[x,0,z],[x+.06,h*.77,z],.048,M.dark,.023);
    for(let j=0;j<6;j++){const o=mesh(yard,new T.IcosahedronGeometry(1,1),M.leaf[(i+j)%5],x+(rand()-.5)*.80,h*.60+rand()*.62,z+(rand()-.5)*.64);o.scale.set(.37+rand()*.28,.47+rand()*.26,.48);}
  }
  shrub(yard,-2.1,.02,-2.83,2.62,19);
  // Two floor-to-cornice bookcases. The first is carried by a real hinge.
  const hinge=G(scene,.94,0,-.71),leftCase=G(hinge,-.88,0,0),rightCase=G(scene,1.82,0,-.71);
  const levels=[.605,1.145,1.685,2.225],bay=1.76;
  function casework(p,active){
    box(p,0,1.43,-.09,bay,2.79,.044,M.back);
    for(let j=1;j<9;j++)box(p,-bay/2+j*bay/9,1.56,-.065,.006,2.32,.003,M.walnut);
    box(p,0,.07,.11,bay,.14,.46,M.dark);
    for(let y of [.12,.16,.56,2.74,2.775,2.815]){
      const dep=y<.2?.49:y>.7?.53:.46;box(p,0,y,.11,bay+(y>2.7?.045:.006),y===2.775?.052:.028,dep,y===2.775?M.oak:M.edge);}
    for(let side of [-1,1]){box(p,side*(bay/2-.043),1.43,.1,.086,2.62,.41,M.oak);pillar(p,side*(bay/2-.053),.17,.32,2.54,.103);}
    for(let j of [-1,1]){framed(p,j*.384,.365,.259,.73,.35,.068,.032,M.oak,M.edge);
      framed(p,j*.384,.365,.304,.59,.245,.014,.013,M.oak,M.honey);
      orb(p,j*.11,.44,.336,.014,.014,.021,M.brass);}
    for(let y of levels){box(p,0,y-.029,.106,bay-.108,.052,.425,M.oak);
      box(p,0,y-.025,.322,bay-.10,.046,.026,M.edge);box(p,0,y-.044,.337,bay-.10,.007,.009,M.honey);}
    // Recessed fretwork across the cornice.
    box(p,0,2.698,.213,bay-.12,.073,.21,M.oak);
    for(let i=0;i<35;i++)box(p,-.80+i*.047,2.731,.324,.024,.023,.032,M.honey);
    // The book-and-laurel device is chased brass, without lettering.
    const crest=G(p,0,2.712,.358);
    orb(crest,0,0,0,.117,.044,.008,M.dark);
    const ring=torus(crest,0,0,.006,.039,.0024,M.brass);ring.scale.x=2.85;
    for(let k of [-1,1]){
      const wing=box(crest,k*.023,0,.012,.044,.038,.0035,M.brass);wing.rotation.z=k*.13;
      rod(crest,[k*.118,-.008,0],[k*.188,.013,0],.0017,M.brass);
      for(let j=0;j<4;j++)leaf(crest,[k*(.121+.016*j),-.006+j*.004,.002],[k*(.135+.016*j),.008+j*.004,.002],.004,M.brass);
    }
    function lineOfBooks(row,x0,x1,variant){
      let x=x0;
      while(x<x1-.034){
        const t=.028+rand()*.045,h=.29+rand()*.139+(variant%3)*.009,w=h*(.62+rand()*.15);
        if(x+t>x1)break;const i=Math.floor(rand()*12),b=volume(p,w,h,t,i);
        b.position.set(x+t/2,levels[row]+h/2,.235-w/2+(rand()-.5)*.039);
        b.quaternion.copy(upright);
        // The last volume rests on its lower corner if its neighbours leave room.
        const free=x1-(x+t);
        if(free>.012&&free<.048&&variant!==2){
          const angle=Math.min(.125,free/h);
          b.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(v(0,0,1),-angle));
          b.position.x+=Math.sin(angle)*h/2;
          b.position.y=levels[row]+h*Math.cos(angle)/2+t*Math.sin(angle)/2;
          break;
        }
        x+=t+.003+rand()*.005;
      }
    }
    function piles(row,x,num){
      let y=levels[row]+.002;
      for(let i=0;i<num;i++){const t=.038+rand()*.016,b=volume(p,.32+rand()*.06,.27+rand()*.04,t,(i+row+4)%12,i===num-1);
        b.position.set(x+(rand()-.5)*.025,y+t/2,.16);b.rotation.y=(rand()-.5)*.14;y+=t+.004;}
    }
    if(active){
      lineOfBooks(0,-.77,-.14,0);piles(0,.18,4);lineOfBooks(0,.48,.80,2);
      lineOfBooks(1,-.77,-.18,2);lineOfBooks(1,.137,.79,1);
      lineOfBooks(2,-.77,-.40,1);lineOfBooks(2,-.31,.19,1);lineOfBooks(2,.29,.79,2);
      piles(3,-.57,4);lineOfBooks(3,-.29,.35,0);lineOfBooks(3,.43,.79,0);
    }else{
      lineOfBooks(0,-.77,-.14,0);lineOfBooks(0,-.08,.48,2);
      lineOfBooks(1,-.77,-.25,1);piles(1,.05,3);lineOfBooks(1,.31,.80,1);
      lineOfBooks(2,-.78,-.42,0);lineOfBooks(2,.12,.77,2);
      const atlas=volume(p,.26,.362,.041,4,true);
      atlas.rotation.x=1.35;atlas.rotation.z=-.028;atlas.position.set(-.158,levels[2]+.184,.113);
      box(p,-.158,levels[2]+.010,.168,.258,.019,.025,M.brass);
      lineOfBooks(3,-.76,-.38,1);piles(3,-.08,4);lineOfBooks(3,.19,.79,2);
    }
    batch(p);
  }
  casework(leftCase,true);casework(rightCase,false);
  const protrude=volume(hinge,.27,.405,.062,3,true);protrude.quaternion.copy(upright);protrude.rotation.z+=.035;
  protrude.position.set(-.88+.235,1.685+.205,.235-.135+.083);
  const luminousSpine=Craft.spineArt(3).clone();
  luminousSpine.emissive.setHex(0xa38446);luminousSpine.emissiveMap=luminousSpine.map;luminousSpine.emissiveIntensity=.38;
  protrude.traverse(o=>{if(o.material===Craft.spineArt(3))o.material=luminousSpine;});
  batch(protrude);
  const noseBase=protrude.position.z;
  const slotBrass=G(hinge,-.88-.013,1.147,.167);
  for(let sign of [-1,1])box(slotBrass,sign*.116,.002,0,.004,.003,.25,M.brass);
  box(slotBrass,0,-.023,.171,.249,.030,.007,M.aged);
  box(slotBrass,0,-.023,.177,.220,.018,.005,M.dark);
  for(let i=0;i<4;i++){const rh=box(slotBrass,-.046+i*.031,-.023,.181,.010,.010,.002,M.glint);rh.rotation.z=Math.PI/4;}
  let channel=-.09;
  for(let i=0;i<4;i++){
    const gap=sim.state.books[i].gapCm*.01,thick=sim.state.books[i].cm*.01;
    for(let side of [-1,1]){
      const x=channel+thick/2+side*(gap+.002)/2+.013;
      box(slotBrass,x,.026,-.095,.002,.052,.13,M.aged);
      box(slotBrass,x,.001,-.010,.003,.002,.188,M.brass);
    }channel+=thick+.01;
  }
  batch(slotBrass);
  // Foreground return desk and traditional brass reading lamp.
  const table=G(scene,-.59,0,1.34);table.rotation.y=-.105;
  const desk=G(table),deskW=1.90,deskD=.82,top=.822;
  for(let sx of [-1,1])for(let sz of [-1,1]){
    const x=sx*(deskW/2-.115),z=sz*(deskD/2-.099);
    lathe(desk,x,.012,z,[[.043,0],[.048,.018],[.036,.032],[.031,.13],[.043,.37],[.06,.475],[.05,.49],[.068,.515],[.068,.54],[.05,.56],[.057,.61],[.057,.72]],M.table,16);
    box(desk,x,.707,z,.116,.13,.119,M.table);
  }
  box(desk,0,.718,0,deskW-.16,.136,deskD-.155,M.table);
  box(desk,0,.785,0,deskW-.025,.024,deskD-.018,M.edge);
  box(desk,0,.806,0,deskW,.032,deskD,M.table);
  box(desk,0,.773,0,deskW-.052,.014,deskD-.043,M.walnut);
  // Runner follows the front edge over its radius, with a hanging embroidered hem.
  function drape(x,w,m,offset=0){
    const sec=[[-.408,top+.002],[.369,top+.003],[.397,top+.001],[.413,top-.008],[.417,top-.029],[.417,top-.135],[.418,top-.175]];
    const pts=[],uv=[];
    for(let i=0;i<sec.length-1;i++){const [z,y]=sec[i],[q,b]=sec[i+1];
      for(const [u,zz,yy,f] of [[0,z,y,i],[1,z,y,i],[0,q,b,i+1],[1,z,y,i],[1,q,b,i+1],[0,q,b,i+1]]){pts.push(x+(u-.5)*w,yy+offset,zz+offset);uv.push(u*3,f*.52);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();m.side=T.DoubleSide;mesh(desk,g,m);
  }
  drape(.22,.86,M.forest);
  for(let side of [-1,1]){drape(.22+side*.395,.006,M.stitch,.001);drape(.22+side*.378,.0028,M.stitch,.001);}
  for(let j=0;j<46;j++)rod(desk,[-.20+j*.0185,top-.175,.419],[-.20+j*.0185,top-.192-rand()*.008,.420],.0011,M.stitch);
  // Small chased brass escutcheon on the front rail.
  framed(desk,-.52,.711,.338,.238,.072,.009,.005,M.dark,M.brass);
  for(let sx of [-1,1])orb(desk,-.52+sx*.102,.713,.349,.004,.004,.002,M.brass);
  for(const sx of [-1,1]){const o=box(desk,-.52+sx*.024,.713,.351,.043,.034,.004,M.brass);o.rotation.z=sx*.12;}
  const lamp=G(desk,-.63,top,-.035);
  lathe(lamp,0,0,0,[[.105,0],[.113,.008],[.113,.016],[.102,.022],[.098,.03],[.069,.038],[.058,.046],[.035,.062],[.021,.066],[.018,.079],[.012,.091],[.012,.327],[.023,.34],[.022,.351]],M.brass);
  const shade=mat(0x3f6256,.23,.19);
  for(let a of [-1,1]){
    rod(lamp,[0,.30,0],[a*.116,.35,0],.007,M.aged);
    rod(lamp,[a*.116,.35,0],[a*.124,.41,-.005],.006,M.brass);
    orb(lamp,a*.143,.41,0,.012,.014,.014,M.brass);
  }
  const shadeGeo=new T.CylinderGeometry(.09,.09,.278,32,1,true,-Math.PI*.57,Math.PI*1.14);
  const sh=mesh(lamp,shadeGeo,shade,0,.405,.005);sh.rotation.z=Math.PI/2;sh.rotation.x=-Math.PI/2+.09;shade.side=T.DoubleSide;
  for(let side of [-1,1]){const cap=mesh(lamp,new T.CircleGeometry(.09,32,-Math.PI*.57,Math.PI*1.14),shade,side*.139,.405,.005);cap.rotation.y=Math.PI/2;cap.rotation.z=Math.PI/2;}
  for(let side of [-1,1])rod(lamp,[-.137,.382,side*.084],[.137,.382,side*.084],.0028,M.brass);
  rod(lamp,[.072,.392,-.009],[.073,.262,-.008],.0012,M.aged);orb(lamp,.073,.258,-.008,.004,.006,.004,M.brass);
  batch(desk);
  // A ceramic olive pot and its own small stand by the window.
  const potStand=G(decor,-1.42,0,-.03);
  cyl(potStand,0,.605,0,.234,.227,.039,M.honey);
  for(let i=0;i<3;i++){const a=i*tau/3;rod(potStand,[.178*Math.cos(a),0,.178*Math.sin(a)],[.145*Math.cos(a),.59,.145*Math.sin(a)],.014,M.table,.025);}
  pot(potStand,0,.63,0,.206);shrub(potStand,0,.827,0,.69,10,true);
  // A pair of unusually large folios make the return pile readable from above.
  const stackX=.27,stackZ=.018;
  let stackY=top+.008;
  for(let j=0;j<2;j++){const h=j?.041:.052,b=volume(table,.40+j*.014,.49,h,j?8:1,true);b.position.set(stackX-.017*j,stackY+h/2,stackZ+.008*j);b.rotation.y=j?.073:-.066;batch(b);stackY+=h+.004;}
  const start=[],bookModels=[],slots=[],bookRot=[],bookSizes=[];
  for(let i=3;i>=0;i--){
    const t=sim.state.books[i].cm*.01,w=[.355,.33,.362,.35][i],h=[.46,.408,.444,.42][i];
    const b=volume(scene,w,h,t,[0,1,2,3][i],true);batch(b);
    start[i]=table.localToWorld(v(stackX+[-.006,.017,-.012,.008][i],stackY+t/2,stackZ+(i%2)*.01));
    bookRot[i]=new T.Quaternion().setFromEuler(new T.Euler(0,[-.245,.032,-.184,-.071][i],0));
    stackY+=t+.006;b.position.copy(start[i]);b.quaternion.copy(bookRot[i]);bookModels[i]=b;bookSizes[i]={w,h,t};
  }
  const slotCenters=[];let slotX=-.09;
  for(let i=0;i<4;i++){let t=bookSizes[i].t;slotX+=t/2;
    slots[i]=v(.06+slotX,1.145+bookSizes[i].h/2,-.71+.235-bookSizes[i].w/2);
    slotCenters[i]=slotX;slotX+=t/2+.010;
  }
  // The nook extends physically behind the movable case, around a second window.
  box(inner,.15,-.04,-2.55,3.8,.08,3.8,M.honey);
  box(inner,-1.29,1.52,-2.30,.15,3.04,3.0,M.ivory);
  box(inner,1.81,1.52,-2.30,.15,3.04,3.0,M.ivory);
  box(fixture,.25,2.96,-2.63,3.35,.10,3.9,M.ivory).castShadow=false;
  box(inner,.25,.46,-3.81,3.35,.92,.16,M.ivory);
  box(inner,.25,2.78,-3.81,3.35,.48,.16,M.ivory);
  box(inner,-1.06,1.71,-3.81,.68,1.70,.16,M.ivory);
  box(inner,1.52,1.71,-3.81,.69,1.70,.16,M.ivory);
  windowFrame(inner,.235,.92,-3.70,1.90,1.62,1,1);
  for(let j=0;j<6;j++)framed(inner,-1.04+j*.49,.48,-3.694,.42,.63,.028,.016,M.ivory,M.trim);
  box(inner,.25,.17,-3.60,3.05,.22,.11,M.trim);
  const windows=[0,1].map((i)=>{
    const sign=i?1:-1,g=G(scene,.235+sign*.941,.92,-3.72),cx=-sign*.469;
    for(let f of [-1,1]){box(g,cx+f*.450,.807,0,.044,1.6,.055,M.trim);box(g,cx,.807+f*.783,0,.91,.045,.055,M.trim);}
    box(g,cx,.81,0,.92,.026,.048,M.trim);box(g,cx,.81,0,.020,1.61,.044,M.pale);
    box(g,cx,.808,-.012,.90,1.55,.008,M.pane);
    rod(g,[cx-sign*.366,.71,.031],[cx-sign*.366,.78,.069],.008,M.brass);return batch(g);
  });
  const bench=G(inner,-.25,0,-2.75);
  box(bench,0,.38,0,1.65,.15,.58,M.oak);
  for(let a of [-1,1])for(let z of [-.195,.195]){box(bench,a*.696,.18,z,.059,.34,.061,M.oak);}
  box(bench,0,.49,0,1.62,.11,.569,M.green);
  for(let z of [-.283,.283])rod(bench,[-.80,.513,z],[.80,.513,z],.004,M.stitch);
  const cushion=box(bench,-.48,.62,-.12,.41,.19,.26,M.forest);cushion.rotation.z=-.10;cushion.rotation.x=-.24;
  pot(inner,1.44,.02,-3.15,.32);shrub(inner,1.44,.33,-3.15,1.1,10,true);
  // A reading stand beside the window. Pages are continuous deformable strips.
  const stand=G(inner,.46,0,-2.54);
  lathe(stand,0,0,0,[[.26,0],[.26,.035],[.17,.052],[.067,.085],[.055,.18],[.053,.78],[.071,.82],[.068,.89]],M.table);
  box(stand,0,.904,0,.96,.047,.65,M.table);
  const openBook=G(scene,.46,.949,-2.53);openBook.rotation.y=-.07;
  const bookBase=G(openBook),coverHinge=G(openBook,0,.030,0);
  for(let sign of [-1,1]){
    const half=G(sign<0?coverHinge:bookBase,sign*.176,sign<0?-.030:0,0);half.rotation.z=sign*.039;
    if(sign<0){const stamp=mesh(half,new T.PlaneGeometry(.348,.47),Craft.coverArt(0),0,-.019,0);stamp.rotation.x=Math.PI/2;}
    box(half,0,-.012,0,.356,.013,.477,coverM[0]);box(half,0,.004,0,.337,.029,.459,M.paper);
    for(let j=0;j<4;j++)box(half,sign*.167,-.007+j*.0068,0,.002,.001,.451,M.pageEdge);
  }
  batch(coverHinge);
  box(bookBase,0,-.003,0,.024,.032,.477,coverM[0]);batch(bookBase);
  const pageM=[0xf1e5c7,0xeae0c6,0xebe0bd].map(c=>mat(c,.89,0,{side:T.DoubleSide}));
  const sheets=[0,1,2].map((_,i)=>{
    const geo=new T.PlaneGeometry(.333,.449,12,3),p=geo.attributes.position,uv=geo.attributes.uv;
    const original=[];
    for(let j=0;j<p.count;j++)original.push([uv.getX(j),uv.getY(j)]);
    const o=mesh(openBook,geo,pageM[i],0,0,0);o.frustumCulled=false;return {o,original};
  });
  // Hand-cut foliage in the book rises along its own paper creases.
  const sprouts=[];
  for(let i=0;i<3;i++){
    const g=G(openBook,-.07+i*.061,.027,-.055+i*.047);
    const a=i-1,m=[M.leaf[2],M.leaf[0],M.stitch][i];
    if(i===0){
      rod(g,[0,0,0],[-.026,.159,0],.0028,m,.0012);
      for(let j=0;j<5;j++){const q=(j+1)*.025;leaf(g,[-q*.16,q,0],[-q*.16+(j%2?1:-1)*(.035+j*.005),q+.047,.006],.014,m,.24);}
    }else if(i===1){
      // A folded marigold, each petal creased down its centre.
      rod(g,[0,0,0],[.018,.136,0],.003,M.leaf[1]);
      for(let j=0;j<10;j++){const t=j*tau/10;leaf(g,[.018,.136,0],[.018+.049*Math.cos(t),.136+.049*Math.sin(t),.009],.014,M.stitch,.38);}
      orb(g,.018,.136,.009,.014,.014,.004,M.brass);
    }else{
      // A swallow unfolds from a tent fold anchored to the gutter.
      rod(g,[0,0,0],[.024,.103,-.001],.0026,M.paper);
      leaf(g,[-.037,.118,0],[.076,.15,.004],.014,M.leaf[1],.45);
      leaf(g,[.016,.136,0],[-.044,.212,-.018],.019,M.leaf[3],.49);
      leaf(g,[.01,.133,.005],[.054,.219,.024],.015,M.leaf[2],.46);
      leaf(g,[-.021,.125,.002],[-.068,.14,0],.008,M.leaf[3]);
      leaf(g,[-.021,.125,.002],[-.06,.096,0],.007,M.leaf[3]);
    }
    sprouts.push(batch(g));
  }
  const ribbon=G(openBook,-.22,0,.21);
  box(ribbon,0,.022,.026,.031,.002,.136,M.brass);
  const med=torus(ribbon,0,.016,.101,.021,.003,M.brass);med.rotation.x=Math.PI/2;
  batch(ribbon);
  // A shallow stone fountain outside the casement. Water lives on a 7x7 grid.
  const basin=G(yard,.245,.31,-4.87);
  lathe(basin,0,0,0,[[.28,-.31],[.31,-.27],[.25,-.23],[.16,-.19],[.14,.10],[.23,.16],[.28,.19],[.41,.27],[.58,.42],[.651,.465],[.658,.49],[.651,.51],[.604,.513],[.583,.47],[.48,.37],[.20,.28]],M.stone,56);
  const streamM=mat(0xa3c7bc,.13,.25);
  lathe(basin,0,.43,-.07,[[.063,0],[.077,.021],[.054,.057],[.036,.078],[.023,.19],[.031,.20]],M.brass,20);
  const nozzle=G(scene,.245,.93,-4.94);orb(nozzle,0,.014,0,.026,.027,.026,M.brass);
  const waterGeo=new T.PlaneGeometry(1,1,6,6),wp=waterGeo.attributes.position;
  for(let j=0;j<wp.count;j++){
    let x=(j%7-3)/3,z=(Math.floor(j/7)-3)/3;
    wp.setXYZ(j,x*Math.sqrt(1-z*z*.5)*.605,0,z*Math.sqrt(1-x*x*.5)*.605);
  }waterGeo.setIndex(Array.from(waterGeo.index.array).reverse());waterGeo.computeVertexNormals();
  M.water.side=T.DoubleSide;
  const surface=mesh(scene,waterGeo,M.water,.245,.797,-4.87);
  const cups=[],spills=[],cupPos=[[-.31,-.03],[.25,.16],[.12,-.32]];
  for(let i=0;i<3;i++){
    const [x,z]=cupPos[i],g=G(scene,.245+x,.807,-4.87+z);g.rotation.y=i*1.9;
    const lm=[M.leaf[1],M.leaf[2],M.leaf[3]][i];
    const disk=mesh(g,new T.CylinderGeometry(.09,.077,.006,28,1,false,.2,5.94),lm);disk.scale.z=.88;
    for(let j=0;j<7;j++){const a=.38+j*.78;rod(g,[0,.005,0],[Math.sin(a)*.078,.007,Math.cos(a)*.071],.0011,M.leaf[4]);}
    for(let j=0;j<6;j++){const a=j*tau/6;const petal=orb(g,Math.cos(a)*.015,.014,Math.sin(a)*.015,.013,.018,.015,i===0?M.paper:i===1?M.clay:M.stitch);petal.rotation.z=Math.cos(a)*.45;}
    orb(g,0,.027,0,.008,.006,.008,M.brass);cups.push(batch(g));
    spills.push(orb(scene,.245+x,.808,-4.87+z,.004,.003,.004,streamM));
  }
  // A small paper boat made from planar folds, including its central peak.
  const boat=G(scene);
  const folds=[[-.090,.038,0],[-.045,0,-.029],[.045,0,-.029],[.090,.043,0],[.047,0,.031],[-.046,0,.031],[0,.076,0],[0,.018,-.002]];
  for(const [face,material] of [[[0,1,6,6,1,2,2,3,6],M.paper],[[0,6,5,6,3,4,6,4,5],M.pageEdge],[[0,5,7,7,5,4,7,4,3],M.paper]]){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(face.flatMap(i=>folds[i]),3));g.computeVertexNormals();material.side=T.DoubleSide;mesh(boat,g,material);}
  batch(boat);
  const wheel=G(scene,.155,.962,-5.025),paddles=[];
  torus(wheel,0,0,.019,.087,.005,M.brass);torus(wheel,0,0,-.019,.087,.005,M.brass);
  for(let i=0;i<10;i++){const a=i*tau/10,x=Math.sin(a),y=Math.cos(a);
    rod(wheel,[0,0,0],[x*.084,y*.084,0],.0027,M.brass);
    const paddle=G(wheel,x*.086,y*.086,0);paddle.rotation.z=-a;const pm=wood(0xa38058,.54);
    box(paddle,0,0,0,.030,.009,.053,pm);paddles.push(pm);}
  orb(wheel,0,0,.024,.016,.016,.013,M.brass);batch(wheel);
  rod(yard,[.155,.77,-5.07],[.155,.962,-5.07],.009,M.aged);
  rod(yard,[.155,.962,-5.08],[.155,.962,-5.01],.008,M.brass);
  // Water runs in a short parabolic arc from the bent brass pipe onto the vanes.
  rod(yard,[.245,.931,-4.94],[.245,1.075,-4.94],.016,M.brass);
  rod(yard,[.245,1.075,-4.94],[.215,1.075,-5.025],.014,M.brass);
  const stream=[];
  for(let i=0;i<10;i++)stream.push(cyl(scene,0,0,0,.003,.003,1,streamM,7));
  // The tiny landing arch is the destination for the paper boat.
  const pier=G(yard,.56,.796,-5.12);
  for(let sign of [-1,1]){cyl(pier,sign*.085,.023,0,.013,.018,.046,M.stone);rod(pier,[sign*.085,.036,0],[sign*.085,.10,0],.005,M.aged);}
  const hoop=mesh(pier,new T.TorusGeometry(.085,.005,6,30,Math.PI),M.brass,0,.10,0);
  orb(pier,0,.194,0,.010,.015,.01,M.brass);
    for(let i=0;i<9;i++){
    const x=-.99+i*.33,z=-5.77-rand()*.30;
    shrub(yard,x,.01,z,.36+rand()*.22,3);if(i%2===0){const p=pot(yard,x,.02,z-.26,.19);shrub(p,0,.19,0,.36,4,true);}
  }
  for(let j=0;j<5;j++){box(yard,-1.06+j*.64,.014,-4.83,.57,.035,1.84,M.tile);}
  // The sun sits outside a side window. Its frame throws real raking shadows.
  const screen=G(outer,-4.0,0,1.9);screen.rotation.y=Math.PI/2;
  for(let u of [-1.6,-.7,.2,1.1])box(screen,u,2.35,0,.065,4.4,.07,M.trim);
  for(let y of [1.31,2.21,3.10])box(screen,-.23,y,0,3.28,.07,.075,M.trim);
  batch(outer);batch(inner);batch(yard);batch(decor);
  // Small motes in a shaft of sunlight. Instancing keeps every particle solid.
  const dustMat=mat(0xffe6ac,.62,0,{emissive:0xe9ce82,emissiveIntensity:.50,transparent:true,opacity:.56,depthWrite:false});
  const motes=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),dustMat,sim.state.dust.length);motes.frustumCulled=false;scene.add(motes);
  const pathDots=[],guides=G(scene);
  for(let i=0;i<9;i++){const g=G(guides);const m=mat(0xe8ce8c,.42,.12,{transparent:true,opacity:.65,emissive:0xd6a24d,emissiveIntensity:.31,depthWrite:false});const o=mesh(g,new T.OctahedronGeometry(i===4?.013:.0047,0),m);o.castShadow=false;pathDots.push(g);}
  const knob=G(scene);
  // Delicate four-point glint produced by a gilt edge, with a physical brass centre.
  for(let a of [0,Math.PI/2]){const o=mesh(knob,new T.OctahedronGeometry(.022,0),M.glint);o.rotation.z=a;o.scale.set(.13,1,.13);o.castShadow=false;}
  return {hinge,leftCase,protrude,noseBase,bookModels,bookRot,start,slots,bookSizes,windows,openBook,coverHinge,sheets,sprouts,ribbon,
    surface,cups,spills,boat,wheel,paddles,stream,nozzle,motes,pathDots,knob,table,fixture};
}
