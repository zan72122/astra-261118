'use strict';
const WorkshopScene=(()=>{
  const {T,pi,tau,rng,v,group,mesh,mat,phys,cloth,wood,brass,gold,darkBrass,ivory,umber,oak,lightOak,
    box,sphere,lathe,cyl,ring,pipe,rod,shapeMesh,button,shadow,rosette,petalShape}=Craft;
  const linen=cloth(0xece1c8),sage=cloth(0x91aaa2),thread=mat(0xe2cda0,.94),darkThread=mat(0x587777,.91);
  // The small bright rectangles model the panes in the reflection environment.
  function sky(){
    const w=384,h=192,d=new Uint16Array(w*h*4),half=T.DataUtils.toHalfFloat;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const alt=(y/h-.5)*pi,az=(x/w-.5)*tau,up=Math.sin(alt);
      const pane=(Math.abs(az+1.55)<.90||Math.abs(az+.04)<.26)&&alt>-.13&&alt<1.26;
      const bar=Math.abs((az+2.47)% .44)<.035||Math.abs(alt-.48)<.026;
      let col=up<-.10?[.41,.31,.20]:[.60+.08*up,.67+.13*up,.67+.22*up];
      if(pane&&!bar)col=[2.8,3.0,2.85];if(az>1.65&&az<2.19&&alt<.9)col=[.25,.20,.16];
      const i=4*(y*w+x);for(let k=0;k<3;k++)d[i+k]=half(col[k]);d[i+3]=half(1);
    }
    const t=new T.DataTexture(d,w,h,T.RGBAFormat,T.HalfFloatType);t.mapping=T.EquirectangularReflectionMapping;t.needsUpdate=true;return t;
  }
  function fabricSheet(p,w,d,material,fold){
    const geo=new T.PlaneGeometry(w,d,54,42);geo.rotateX(-pi/2);
    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,fold(pos.getX(i),pos.getZ(i)));
    geo.computeVertexNormals();const o=mesh(p,geo,material);o.material.side=T.DoubleSide;return o;
  }
  function stitchLine(p,points,material,r=.009){
    // Dashed running stitches are actual lengths of cotton.
    const curve=new T.CatmullRomCurve3(points.map(a=>v(...a))),len=curve.getLength(),n=Math.ceil(len/.098);
    const inst=new T.InstancedMesh(new T.CylinderGeometry(r,r,1,5),material,n),o=new T.Object3D();
    for(let i=0;i<n;i++){const a=curve.getPointAt(i/n),b=curve.getPointAt((i+.55)/n),dir=b.clone().sub(a);
      o.position.copy(a).add(b).multiplyScalar(.5);o.scale.set(1,dir.length(),1);o.quaternion.setFromUnitVectors(v(0,1,0),dir.normalize());o.updateMatrix();inst.setMatrixAt(i,o.matrix);}
    p.add(inst);return inst;
  }
  function spool(p,x,z,scale,color,lean=0){
    const g=group(p);g.position.set(x,.03,z);g.scale.setScalar(scale);g.rotation.z=lean;
    lathe(g,[[.01,0],[.42,0],[.46,.035],[.45,.082],[.32,.115],[.29,.17],[.29,.85],[.35,.87],[.44,.89],[.46,.94],[.43,.97],[.105,.97],[.10,.90]],lightOak);
    const threadMat=cloth(color,2);
    lathe(g,[[.30,.12],[.367,.16],[.38,.24],[.37,.48],[.38,.73],[.36,.84],[.29,.87]],threadMat);
    const a=[];for(let i=0;i<=720;i++){const t=i/720,ang=t*tau*39,r=.368+.005*Math.sin(t*18);
      a.push([r*Math.cos(ang),.15+.695*t+.008*Math.sin(ang*.51),r*Math.sin(ang)]);}
    pipe(g,a,.010,threadMat,720);ring(g,0,.969,0,.35,.008,umber);ring(g,0,.969,0,.15,.014,umber);
    cyl(g,0,.93,0,.10,.10,.012,mat(0x5e4936,.94),24);shadow(p,x,.012,z,1*scale,1*scale,.24);
    return g;
  }
  function garden(scene){
    const meadow=[0xaeb99c,0xa2b5a0,0x8da898,0x819d8b,0xbac4a5].map(c=>mat(c,1));
    const far=mat(0xa7bfc0,1),middle=mat(0x9fb6a8,1);
    for(let i=0;i<7;i++)sphere(scene,-29+i*9,-12-rng()*1.7,-37-rng()*6,13+rng()*5,9+rng()*1.7,5,far);
    for(let i=0;i<8;i++)sphere(scene,-22+i*6.7,-8.7-rng(),-20-rng()*3,7.8,6.6+rng()*.9,3.4,middle);
    for(let i=0;i<34;i++){const x=-18+i*1.1,z=-9-rng()*8,y=-3.7-rng()*1.7;
      sphere(scene,x,y,z,1.0+rng()*1.8,1.9+rng()*1.8,1.8,meadow[i%5],14);}
    const walls=mat(0xe2ccb0,.98),tile=mat(0xb3927f,.94);
    for(const [x,y,z,scale] of [[-4.8,-2.3,-17,.86],[3,-2.65,-16,.74],[5.2,-2.64,-17,.97]]){
      const g=group(scene);g.position.set(x,y,z);g.scale.setScalar(scale);box(g,0,.43,0,1.01,.86,.74,walls);
      const shape=new T.Shape();shape.moveTo(-.62,0);shape.lineTo(0,.53);shape.lineTo(.62,0);shape.closePath();
      const roof=mesh(g,new T.ExtrudeGeometry(shape,{depth:.93,bevelEnabled:false}),tile,0,.85,-.46);
      box(g,.26,1.23,.04,.13,.42,.18,walls);box(g,-.21,.57,.38,.20,.28,.018,mat(0x8fa3a0));roof.castShadow=false;
    }
  }
  function blossoms(scene){
    const g=group(scene);g.position.set(3.05,.55,-3.09);
    const vase=phys(0xd9d6bc,.30,{clearcoat:.51});
    lathe(g,[[.01,0],[.19,.005],[.22,.035],[.23,.12],[.27,.38],[.26,.50],[.17,.61],[.13,.67],[.14,.71],[.106,.71],[.105,.63]],vase);
    const stems=mat(0x83906c,.76),leaves=mat(0x91a185,.72),pollen=mat(0xd2ab57,.63),petal=mat(0xfff1d6,.57);
    const tips=[[-.37,1.41,-.05],[-.15,1.61,.05],[.12,1.48,0],[.30,1.72,-.08],[.44,1.32,.04]];
    tips.forEach(([x,y,z],i)=>{
      pipe(g,[[0,.58,0],[x*.30,.98,.02],[x*.80,y-.16,z],[x,y,z]],.012,stems,14);
      const l=sphere(g,x*.53+.065,1.04+(i%2)*.13,z,.13,.033,.058,leaves,12);l.rotation.z=.56;
      const f=group(g);f.position.set(x,y,z);f.rotation.set(.85+i*.12,0,i*.7);
      for(let j=0;j<11;j++){const a=j*tau/11,o=sphere(f,Math.cos(a)*.086,.005,Math.sin(a)*.086,.082,.023,.033,petal,12);o.rotation.y=-a;}
      sphere(f,0,.022,0,.052,.035,.052,pollen,14);
    });
    return g;
  }
  function buildRoom(scene){
    garden(scene);
    const wall=mat(0xf0e3c8,.84),paint=mat(0xe9dfc5,.52),sash=mat(0xf6edda,.56),bead=mat(0xc2b79e,.62);
    box(scene,0,-1.87,-3.82,22,4.6,.28,wall);box(scene,0,.46,-3.56,21,.17,.73,paint);
    box(scene,0,.36,-3.39,21,.07,.67,sash);box(scene,0,.62,-3.79,21,.14,.21,paint);
    for(const x of [-7.4,-3.88,-.05,3.91,7.4]){
      box(scene,x,3.7,-3.85,.16,6.1,.21,paint);box(scene,x+.003,3.7,-3.71,.115,6.1,.07,sash);
      box(scene,x+.092,3.7,-3.81,.021,6.1,.09,bead);
    }
    box(scene,0,2.26,-3.87,20,.115,.14,paint);box(scene,0,2.29,-3.78,20,.087,.055,sash);
    // A little sash catch is attached to the sill, with two brass screw heads.
    box(scene,.01,.715,-3.57,.32,.043,.115,brass);sphere(scene,-.018,.766,-3.56,.087,.05,.05,brass);
    rod(scene,[-.035,.784,-3.55],[.14,.793,-3.49],.022,brass);
    for(const x of [-.12,.13])sphere(scene,x,.741,-3.57,.016,.008,.016,gold,10);
    const flowerpot=blossoms(scene);
    const branch=group(scene),foliage=[],twig=mat(0x889176,.82);
    branch.position.set(-3.72,1.12,-4.28);
    const leafColors=[0x8eae93,0xa8b697,0x90a788,0xb6c29e].map(c=>mat(c,.64,0,{side:T.DoubleSide}));
    const leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-.15,.10,-.115,.27,0,.40);leafShape.bezierCurveTo(.13,.26,.14,.12,0,0);
    const leafGeo=new T.ShapeGeometry(leafShape,8),leafPos=leafGeo.attributes.position;
    for(let i=0;i<leafPos.count;i++)leafPos.setZ(i,.036*Math.sin(leafPos.getY(i)/.4*pi)-Math.abs(leafPos.getX(i))*.28);
    leafGeo.computeVertexNormals();
    pipe(branch,[[-.62,-.65,0],[-.33,-.20,.025],[.18,.44,.08],[.31,.85,.04],[.72,1.23,.12],[1.19,1.43,.11]],.025,twig,36);
    for(let i=0;i<15;i++){
      const t=i/14,sg=i%2?1:-1,base=[-.30+1.35*t,.03+1.37*t,.064],tip=[base[0]+sg*(.12+.07*t),base[1]+.16,base[2]+.032];
      rod(branch,base,tip,.012,twig,.007);
      const stem=group(branch);stem.position.set(...tip);stem.rotation.set(-.27+.65*(i%3)/2,sg*.22,sg*(.68+.37*t));
      const blade=mesh(stem,leafGeo,leafColors[i%4]);blade.scale.set(.9+t*.15,.86+.16*(i%2),1);
      rod(stem,[0,0,0],[0,.28,.027],.006,twig,.002);Craft.batch(stem);
      foliage.push({stem,angle:stem.rotation.z});
    }
    Craft.batch(branch,new Set(foliage.map(f=>f.stem)));
    const curtain=cloth(0xeee6cf,14),curtains=[];
    for(const side of [-1,1]){
      const geo=new T.PlaneGeometry(1.85,5.0,30,30),pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){
        const x=pos.getX(i),y=pos.getY(i),u=x/1.85+.5,q=y/5+.5;
        pos.setXYZ(i,side*(3.82+.60*(1-q)**2)+x*(.85+.25*q),y+2.85+.055*Math.cos(u*31),-3.37+.16*Math.cos(u*tau*4.4)+.02*Math.sin(q*8+u*16));
      }
      geo.computeVertexNormals();const o=mesh(scene,geo,curtain);o.material.side=T.DoubleSide;curtains.push(o);
    }
    const plankColors=[0xf8e1c1,0xf2d9b8,0xf1d7b4,0xf4dab9,0xf6dcba,0xf3d6b1,0xeed3b2,0xf2d9b8,0xf4d8b5];
    for(let i=0;i<9;i++){
      const z=-3.18+i*.866,wm=wood(plankColors[i]),g=Craft.grain.clone();g.repeat.set(3.2,.39);g.offset.set(rng(),rng());wm.map=wm.bumpMap=g;
      const plank=box(scene,0,-.085,z,16,.17,.863,wm);plank.castShadow=false;
    }
    box(scene,0,-.23,4.21,16,.37,.16,wood(0xc3946e));box(scene,0,-.45,4.15,16,.10,.17,umber);
    for(const x of [-3.8,3.8])box(scene,x,-1.75,3.8,.42,2.9,.42,oak);
    const floor=mat(0xb0a997,.95);box(scene,0,-3.31,0,19,.14,15,floor);
    const runner=group(scene),w=3.12,d=4.88;
    const fold=(x,z)=>.021+.013*Math.sin(x*12+z*.6)+.012*Math.sin(z*5.7-x*1.7)+.045*Math.exp(-((x-1.18)**2)/.045);
    fabricSheet(runner,w,d,sage,fold);runner.position.set(2.02,.025,1.61);runner.rotation.y=-.23;
    for(const x of [-w/2+.083,-w/2+.132,w/2-.083,w/2-.132]){
      const pts=[];for(let i=0;i<=28;i++){const z=-d/2+d*i/28;pts.push([x,fold(x,z)+.006,z]);}stitchLine(runner,pts,thread,.008);
    }
    for(const z of [-d/2+.075,d/2-.075]){
      const pts=[];for(let i=0;i<=22;i++){const x=-w/2+w*i/22;pts.push([x,fold(x,z)+.01,z]);}stitchLine(runner,pts,thread,.009);
    }
    // A small embroidered sprig peeks out at the front of the button tray.
    const embroidery=group(runner);embroidery.position.set(-.91,.057,1.12);embroidery.rotation.y=-.53;
    stitchLine(embroidery,[[0,0,0],[.035,0,.22],[-.015,.005,.50],[.06,0,.74]],thread,.011);
    for(let i=0;i<6;i++){const z=.10+i*.09,sg=i%2?1:-1;
      pipe(embroidery,[[0,.008,z],[sg*.08,.011,z+.015],[sg*.135,.012,z+.11],[sg*.06,.009,z+.077],[.015,.008,z+.025]],.009,thread,16);}
    const spools=group(scene);
    spool(spools,-2.78,-.88,.93,0x739492);spool(spools,-3.21,-.42,.62,0xd1ac84,-.07);
    const cord=cloth(0x738f8a,.7);
    pipe(spools,[[-2.64,.26,-.56],[-2.47,.036,-.30],[-2.68,.025,.04],[-3.09,.025,.28],[-3.04,.027,.57],[-2.60,.029,.71],[-2.44,.026,.52],[-2.61,.027,.42],[-2.91,.022,.68],[-3.38,.021,.83]],.013,cord,90);
    for(const part of [flowerpot,runner,spools])Craft.batch(part);
    Craft.batch(scene,new Set([flowerpot,...curtains,runner,spools,branch]));
    return {flowerpot,curtains,runner,spools,branch,foliage};
  }
  function makeJar(p,c,ch){
    const g=group(p),r=c.r,h=c.h,n=c.mouth;
    const glass=phys([0xf2fff8,0xc3e7dd,0xf6deb6,0xe2eaf8][ch],.066,{
      metalness:0,transmission:1,thickness:.065,ior:1.47,clearcoat:1,clearcoatRoughness:.064,
      attenuationColor:new T.Color([0x91bdac,0x74b7a6,0xd3ad76,0x9caecb][ch]),attenuationDistance:.82,envMapIntensity:1.13});
    const pts=[[.001,.044],[r*.77,.044],[r*.88,.047],[r*.95,.073],[r*.985,.122],[r,.22],[r,.35],[r*.988,h*.63],
      [r*.979,h*.70],[r*.951,h*.748],[r*.90,h*.788],[r*.82,h*.816],[n*.99,h*.848],[n*.963,h*.875],
      [n*.963,h*.947],[n,h*.957],[n*1.018,h*.97],[n*1.019,h*.989],[n*.999,h],[n*.965,h+.008],
      [n*.937,h],[n*.923,h*.984],[n*.926,h*.867],[r*.80,h*.825],[r*.884,h*.79],[r*.937,h*.743],
      [r*.955,h*.693],[r*.966,h*.63],[r*.971,.235],[r*.943,.18],[r*.90,.149],[r*.76,.13],[.001,.13]];
    const vessel=lathe(g,pts,glass,112);vessel.castShadow=false;
    const rim=phys(0xd6e8da,.11,{metalness:.14,transmission:.70,thickness:.029,ior:1.48,clearcoat:.85});
    for(const [y,rr,tt] of [[.105,r*.959,.016],[.153,r*.987,.016],[h-.025,n*1.016,.015],[h+.004,n*.969,.019]]){
      const o=ring(g,0,y,0,rr,tt,rim);o.castShadow=false;
    }
    if(ch===0){
      // Raised moulding follows the curved wall and catches the window in its edges.
      const relief=phys(0xe0ebe0,.17,{transmission:.68,clearcoat:1,thickness:.015,ior:1.47});
      const face=(x,y)=>[x,h*.442+y,Math.sqrt((r*.991)**2-x*x)+.005];
      for(const [rx,ry,width] of [[.267,.229,.011],[.240,.203,.006]]){
        const path=[];for(let i=0;i<=60;i++){const a=tau*i/60;path.push(face(rx*Math.cos(a),ry*Math.sin(a)));}
        const o=pipe(g,path,width,relief,60);o.castShadow=false;
      }
      for(let k=0;k<6;k++){
        const a=tau*k/6,path=[];
        for(let i=0;i<=24;i++){
          const th=i*tau/24,u=.048*Math.sin(th),v=.086*(1-Math.cos(th));
          path.push(face(u*Math.cos(a)-v*Math.sin(a),u*Math.sin(a)+v*Math.cos(a)));
        }
        pipe(g,path,.008,relief,24).castShadow=false;
      }
    }else{
      const finish=ch===1?phys(0xc0d2c3,.29,{clearcoat:.77}):ch===2?brass:lightOak;
      lathe(g,[[.01,.022],[r*.85,.022],[r*.97,.057],[r*1.012,.108],[r*1.014,.201],[r*.996,.222],[r*.975,.216]],finish);
      ring(g,0,.165,0,r*1.014,.009,ch===2?gold:ivory);
      if(ch===1){
        for(let i=0;i<12;i++){const a=tau*i/12,pts=[];for(let k=0;k<=8;k++){
          const frac=k/8,rr=r*(.997-.010*frac);pts.push([rr*Math.cos(a),.22+frac*h*.41,rr*Math.sin(a)]);
        }pipe(g,pts,.012,rim,8).castShadow=false;}
      }
      if(ch===2)ring(g,0,h*.91,0,n*.982,.026,gold);
    }
    const cord=mat(0xc3aa79,.90);
    for(let k=0;k<2;k++){const pts=[];for(let i=0;i<=90;i++){const a=tau*i/90,rr=n*.976;pts.push([rr*Math.cos(a),h*.911+.032*k+.012*Math.sin(a+.6),rr*Math.sin(a)]);}pipe(g,pts,.022,cord,90);}
    // A punched linen maker's tag with an embroidered flower, suspended from the neck.
    const tagPivot=group(g);tagPivot.position.set(n*.57,h*.917,n*.79);
    pipe(tagPivot,[[0,.02,0],[.07,.07,.025],[.105,.035,.054],[.085,-.10,.086],[.035,-.17,.113]],.012,cord,21);
    pipe(tagPivot,[[0,0,0],[-.033,.06,.015],[-.10,.07,.035],[-.10,.012,.039],[-.025,0,.011],[.035,-.072,.03]],.011,cord,23);
    const tag=group(tagPivot);tag.position.set(.01,-.135,.117);tag.rotation.set(-.18,.51,-.20);
    const tagShape=new T.Shape();tagShape.moveTo(-.084,0);tagShape.lineTo(.064,0);tagShape.lineTo(.137,-.075);tagShape.lineTo(.137,-.34);
    tagShape.quadraticCurveTo(.137,-.367,.115,-.367);tagShape.lineTo(-.119,-.367);tagShape.quadraticCurveTo(-.14,-.367,-.14,-.34);tagShape.lineTo(-.14,-.086);tagShape.closePath();
    const hole=new T.Path();hole.absarc(0,-.055,.020,0,tau,true);tagShape.holes.push(hole);
    mesh(tag,new T.ExtrudeGeometry(tagShape,{depth:.012,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2}),linen);
    const motif=group(tag);motif.position.set(0,-.218,.024);motif.rotation.x=pi/2;rosette(motif,0,0,0,.095,darkThread,6);
    const hinge=group(g);hinge.rotation.y=.49;
    for(const sg of [-1,1]){rod(hinge,[sg*n*.42,h*.91,-n*.77],[sg*n*.42,h+.027,-n*.97],.029,brass);}
    rod(hinge,[-n*.52,h+.03,-n*.958],[n*.52,h+.03,-n*.958],.038,brass);
    const pivot=group(hinge);pivot.position.set(0,h+.032,-n*.954);
    const lid=group(pivot);lid.position.z=n*.954;
    lathe(lid,[[.002,.008],[n*.95,.008],[n*1.01,.024],[n*1.056,.057],[n*1.056,.099],[n*1.022,.128],[n*.94,.145],[n*.57,.153],[.002,.154]],lightOak);
    const gasket=mat(0xc29574,.82);
    ring(lid,0,.015,0,n*.917,.031,gasket);cyl(lid,0,.015,0,n*.881,n*.881,.032,oak);
    ring(lid,0,-.002,0,n*.68,.009,umber);
    ring(lid,0,.151,0,n*.80,.010,umber);rosette(lid,0,.16,0,n*.38,umber,6);
    // The little bail on the front and the keeper are attached to different parts.
    pipe(lid,[[-.104,.067,n*.99],[-.105,.031,n*1.07],[-.082,-.045,n*1.065],[0,-.066,n*1.067],[.082,-.045,n*1.065],[.105,.031,n*1.07],[.104,.067,n*.99]],.017,brass,28);
    sphere(g,0,h*.946,n*.976,.063,.027,.032,brass,16);
    shadow(g,0,.004,.025,2.77*r,2.46*r,.37);
    Craft.batch(pivot);Craft.batch(tagPivot);Craft.batch(g,new Set([pivot,tagPivot,vessel]));
    g.userData={pivot,tagPivot,vessel};return g;
  }
  function makeTray(p,ch){
    const g=group(p),hit=[];
    if(ch===0||ch===3){
      const bowl=group(g);bowl.scale.set(1.43,1,1.016);
      lathe(bowl,[[.001,.043],[.77,.043],[.86,.054],[.94,.086],[.986,.147],[1,.217],[.992,.247],[.974,.26],[.945,.253],[.929,.231],[.905,.193],[.85,.151],[.74,.127],[.55,.12],[.001,.119]],oak);
      ring(bowl,0,.24,0,.978,.012,lightOak);ring(bowl,0,.151,0,.978,.009,umber);
      shadow(g,0,.035,0,3.15,2.22,.28);
    }
    let water=null,wheel=null,press=null,fan=null;
    if(ch===1){
      const glaze=phys(0xb4c8be,.23,{clearcoat:.8}), stripe=mat(0x849d96,.38);
      const pedestal=lathe(g,[[.02,.08],[.52,.08],[.56,.13],[.53,.18],[.32,.23],[.20,.34],[.15,.55],[.16,1.16],[.30,1.24],[.58,1.29]],glaze);
      const bowl=group(g);bowl.scale.set(1.24,1,.87);
      const dish=lathe(bowl,[[.002,1.24],[.45,1.25],[.78,1.33],[.93,1.44],[1,1.58],[1,1.64],[.97,1.663],[.944,1.641],[.92,1.56],[.80,1.45],[.53,1.37],[.001,1.34]],glaze);
      ring(bowl,0,1.599,0,.989,.014,stripe);
      // Nineteen concentric strips share the simulation's local surface heights.
      const pts=[],indices=[],uv=[];for(let i=0;i<19;i++)for(let k=0;k<=48;k++){const a=k*tau/48;pts.push(i/18*.95*Math.cos(a),0,i/18*.95*Math.sin(a));
        uv.push(k/48,i/18);if(i&&k){const j=i*49+k;indices.push(j-50,j-1,j,j-50,j,j-49);}}
      const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(pts,3));wg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));wg.setIndex(indices);wg.computeVertexNormals();
      water=mesh(bowl,wg,phys(0x85bcb8,.12,{transmission:.38,thickness:.2,ior:1.33,clearcoat:1,side:T.DoubleSide}),0,1.60,0);
      water.castShadow=false;hit.push(dish,water,pedestal);shadow(g,0,.032,0,1.55,1.16,.26);
    }
    if(ch===2){
      const teal=mat(0x73918b,.49);
      lathe(g,[[.01,.06],[.60,.06],[.64,.10],[.62,.17],[.49,.20],[.38,.27],[.22,.32],[.14,.46],[.14,1.48],[.21,1.55],[.32,1.58]],teal);
      ring(g,0,.36,0,.178,.026,brass);ring(g,0,1.50,0,.17,.028,brass);
      wheel=group(g);wheel.position.y=1.67;
      const disc=lathe(wheel,[[.005,-.12],[.91,-.12],[1.045,-.075],[1.085,-.034],[1.085,.051],[1.045,.105],[.96,.12],[.001,.12]],oak);
      ring(wheel,0,.067,0,1.056,.021,brass);ring(wheel,0,.125,0,.58,.016,brass);
      for(let i=0;i<12;i++){const a=i*tau/12;ring(wheel,Math.cos(a)*.83,.126,Math.sin(a)*.83,.19,.010,umber,40);}
      for(let i=0;i<6;i++){const spoke=box(wheel,0,.151,0,.89,.035,.06,brass);spoke.rotation.y=i*pi/6;}
      const crank=group(wheel);box(crank,.19,.20,0,.45,.082,.09,brass);cyl(crank,.41,.28,0,.043,.043,.19,brass);
      sphere(crank,.41,.40,0,.113,.14,.113,teal);cyl(wheel,0,.21,0,.086,.092,.12,gold);
      hit.push(disc,...crank.children);shadow(g,0,.035,0,1.6,1.4,.3);
    }
    if(ch===3){
      press=group(g);press.position.set(.56,.27,.47);press.rotation.y=.39;
      const leather=mat(0x916752,.60);
      for(let i=0;i<6;i++){const o=cyl(press,0,.05+i*.041,0,.46-i*.008,.415,.043,leather);o.scale.z=.71;}
      const top=cyl(press,0,.32,0,.446,.46,.075,lightOak);top.scale.z=.74;hit.push(...press.children);
      const dome=sphere(press,0,.377,0,.18,.049,.13,brass);hit.push(dome);
      fan=group(g);fan.position.set(-.68,.25,-.32);rod(g,[-.68,.15,-.32],[-.68,.91,-.32],.034,brass);
      fan.position.y=.92;fan.rotation.x=pi/2;
      for(let i=0;i<5;i++){const vane=shapeMesh(fan,petalShape(),.014,cloth(i%2?0xb8c7b1:0xe8cc9d),.006);
        vane.scale.set(.213,1,.30);vane.rotation.y=i*tau/5;vane.rotation.z=.22;}
      sphere(fan,0,.02,0,.057,.055,.057,gold,12);
    }
    if(wheel)Craft.batch(wheel,new Set(hit));
    Craft.batch(g,new Set([water,wheel,press,fan,...hit]));
    g.userData={hit,water,wheel,press,fan};return g;
  }
  function makeBridge(p,j,t,c,ch){
    if(ch!==1&&ch!==2)return;
    const m=ch===1?phys(0xb7cec1,.24,{clearcoat:.8}):oak;
    const x1=t.x-(ch===2?.84:.88)*t.scale,z1=t.z,x2=j.x,z2=j.z,h1=c.bed+.012,h2=c.h+.10;
    const dir=v(x2-x1,0,z2-z1),len=dir.length(),g=group(p);g.position.set(x1,h1,z1);g.rotation.y=Math.atan2(dir.x,dir.z);
    const w=ch===1?.24:.25;const points=[];
    for(let i=0;i<=18;i++){const q=i/18;points.push([0,(h2-h1)*q-.04*q*(1-q),len*q]);}
    const curve=new T.CatmullRomCurve3(points.map(a=>v(...a)));
    // Build a concave trough in the X/Y cross-section, following the sloping run.
    const pos=[],idx=[],uv=[];for(let i=0;i<=18;i++){let o=curve.getPoint(i/18);for(let k=0;k<=12;k++){
      const a=k/6-1;uv.push(k/12,i/18);pos.push(w*a,o.y-.044+.084*a*a,o.z);if(i&&k){const n=i*13+k;idx.push(n-14,n-1,n,n-14,n,n-13);}}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();m.side=T.DoubleSide;mesh(g,geo,m);
    for(const sg of [-1,1])pipe(g,points.map(([x,y,z])=>[sg*w,y+.04,z]),.018,ch===2?brass:m,20);
  }
  return {sky,buildRoom,makeJar,makeTray,makeBridge};
})();
