'use strict';
function makeBalcony(scene,D){
  const {T,PI,V,group,mat,M,mesh,box,ball,cyl,rod,line,tor,disc,batch,texture}=Craft;
  const g=group(scene,2*D,0,0),fixed=group(g),panels=[],ropeZ=-7.5;
  const rail=mat(0x8b9382,.64),railTop=mat(0xb89569,.52,0,{map:M.cross.map}),deck=mat(0xa99b7f,.79,0,{map:M.cross.map});
  for(let j=0;j<39;j++){box(fixed,.45,-.453,-.075-j*.22,6.3,.095,.217,deck);}
  for(let j=0;j<=18;j++){const x=-2.66+j*.345;box(fixed,x,.04,-8.36,.047,1.0,.047,rail);}
  box(fixed,.45,.585,-8.36,6.37,.097,.11,railTop);box(fixed,.45,-.24,-8.36,6.36,.079,.07,rail);
  for(let i=0;i<2;i++){const x=[-2.70,3.60][i];box(fixed,x,.57,-4.21,.11,.1,8.4,railTop);
    for(let j=0;j<17;j++)box(fixed,x,.03,-.3-j*.49,.052,1,.052,rail);}
  const holding=[[-.24,2.65,ropeZ-.38],[3.48,2.74,ropeZ+.24]];
  for(const a of holding){rod(fixed,[a[0],-.41,a[2]],a,.043,railTop);ball(fixed,a[0],a[1]+.039,a[2],.072,.085,.072,M.white);}
  function rope(u){return [-.24+3.72*u,2.59+.09*u-.30*4*u*(1-u),ropeZ-.38+.62*u];}
  const knots=[];for(let i=0;i<=12;i++)knots.push(rope(i/12));line(fixed,knots,.008,M.cream);
  const paints=[[220,217,189],[167,185,165],[219,180,146]],colors=[[146,163,145],[221,224,197],[169,111,84]];
  for(let f=0;f<3;f++){
    const c=paints[f],stripe=colors[f];
    const tex=texture(128,128,(u,v,x,y)=>{const bands=f===1?(u<.1||u>.9):((v>.10&&v<.125)||(v>.15&&v<.16)||(v>.87&&v<.9));
      const col=bands?stripe:c;const n=3*(x%3===0)+3*(y%3===0)+3*Craft.hash(x,y);return col.map(k=>k-n);},true);
    const material=mat(0xffffff,.9,0,{map:tex,side:T.DoubleSide}),geo=new T.PlaneGeometry(1,1,8,6),o=mesh(g,geo,material);
    const base=[],start=.14+f*.245,width=[.72,.59,.67][f],height=[.91,.79,.85][f];
    for(let j=0;j<7;j++)for(let i=0;i<9;i++){
      const u=i/8,v=j/6,p=rope(start+u*width/3.72),dip=.042*Math.sin(PI*u)*Math.sin(PI*(1-v)/2);
      base.push([p[0],p[1]-v*height-.034-dip,p[2]+.013+.035*Math.cos(u*PI*5)*(.4+v)]);}
    o.userData.panel=f;o.frustumCulled=false;panels.push({o,geo,base});
    for(const t of [.125,.875]){const p=rope(start+t*width/3.72);const peg=box(fixed,p[0],p[1]-.027,p[2]+.011,.029,.116,.046,M.wood);peg.rotation.z=(t-.5)*.22;
      box(fixed,p[0],p[1]-.023,p[2]+.038,.032,.014,.012,M.steel);}
  }
  const charm=group(g),point=rope(.087);charm.position.set(...point);line(charm,[[0,0,0],[0,-.65,0]],.006,M.brass);
  tor(charm,0,-.778,0,.097,.009,M.gold);disc(charm,0,-.778,.003,.043,.015,M.gold);
  for(let j=0;j<8;j++){const a=j*PI/4;rod(charm,[Math.cos(a)*.058,-.778+Math.sin(a)*.058,.007],[Math.cos(a)*.080,-.778+Math.sin(a)*.080,.007],.0058,M.gold);}
  batch(charm);batch(fixed);
  function update(s){
    g.visible=s.rail>1.1||s.walk>.01;
    if(!g.visible)return;
    for(let f=0;f<3;f++){
      const {geo,base}=panels[f],a=geo.attributes.position;
      for(let i=0;i<63;i++){const c=s.cloth[f*63+i],p=base[i],v=Math.floor(i/9)/6;
        a.setXYZ(i,p[0]+c.z*.077*v,p[1]+Math.min(.18,c.z*c.z*.52),p[2]+c.z);}
      a.needsUpdate=true;geo.computeVertexNormals();
    }
    charm.rotation.z=s.sprigs[7].a*.85;charm.rotation.x=s.sprigs[9].a;
  }
  return {panels,charm,update};
}
