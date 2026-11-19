'use strict';
const Workshop=(()=>{
  const {T,V,TAU,rand,mat,materials:m,group,mesh,box,egg,lathe,grid,ring,tube,batch}=Craft;
  const mix=(a,b,f)=>a+(b-a)*f;
  function leaf(p,x,y,z,size,yaw,tilt){
    const g=group(p);g.position.set(x,y,z);g.rotation.set(tilt,yaw,-.12);
    const geo=grid(12,20,(u,v)=>{
      const w=(u*2-1)*Math.pow(Math.sin(Math.PI*v),.81)*.29*size;
      return [w, size*(.22*Math.sin(v*Math.PI)-.13*v)-Math.abs(w)*.26, size*v];
    });
    mesh(g,geo,m.green);
    tube(g,m.vein,[[0,.004,0],[0,size*.16,size*.33],[0,size*.12,size*.69],[0,-size*.12,size]],.007*size);
    for(let i=0;i<4;i++)for(const d of [-1,1]){
      const v=.21+i*.132,w=d*Math.sin(Math.PI*v)*.20*size;
      tube(g,m.green,[[0,(.22*Math.sin(v*Math.PI)-.13*v)*size+.004,size*v],[w*.7,(.22*Math.sin((v+.045)*Math.PI)-.13*v)*size-Math.abs(w)*.16,size*(v+.045)],[w,(.22*Math.sin((v+.09)*Math.PI)-.13*v)*size-Math.abs(w)*.25,size*(v+.09)]],.005,5);
    }
  }
  function camellia(p){
    const h=group(p);h.rotation.x=.82;h.rotation.z=-.21;
    for(let layer=0;layer<3;layer++){
      const n=[7,6,5][layer],sz=[1,.74,.48][layer];
      for(let i=0;i<n;i++){
        const a=i*TAU/n+layer*1.83+(rand()-.5)*.12, curl=rand()*.08;
        const geo=grid(18,14,(u,v)=>{
          const b=u*2-1,fan=b*(.56+.17*layer)*(.34+.66*Math.sin(Math.PI*v/2));
          const scallop=1-.25*b*b+.024*Math.sin(b*5+i);
          const r=sz*(.08+v*.59*scallop);
          const y=layer*.046+sz*(.36*Math.pow(v,1.5)+.12*Math.sin(v*Math.PI)-.12*v*b*b+curl*b*v+.026*Math.sin(b*5+i)*v**4);
          return [Math.cos(a+fan)*r,y,Math.sin(a+fan)*r];
        });
        mesh(h,geo,[m.rose,m.red,m.inner][layer]);
      }
    }
    for(let i=0;i<45;i++){
      const a=i*2.39996,r=Math.sqrt(i/45)*.138,x=r*Math.cos(a),z=r*Math.sin(a),y=.315+rand()*.056-r*.35;
      tube(h,m.yellow,[[x*.6,.14,z*.6],[x*.8,.23,z*.8],[x,y,z]],.009,4);
      egg(h,m.pistil,x,y,z,.020,.026,.016);
    }
  }
  function vase(p){
    const g=group(p),pot=group(g);
    lathe(pot,m.teal,[[0,.025],[.30,.025],[.33,.06],[.34,.11],[.37,.15],[.44,.28],[.47,.53],[.47,.68],[.44,.83],[.36,.97],[.25,1.04],[.176,1.13],[.158,1.27],[.16,1.36],[.19,1.385],[.191,1.424],[.164,1.45],[.123,1.44],[.121,1.33]],80);
    ring(pot,m.gold,.176,1.43,.009);ring(pot,m.ebony,.317,.057,.008);
    const branch=[[0,1.29,0],[-.02,1.63,-.03],[.075,1.91,-.04],[.14,2.17,.02],[.10,2.43,.05]];
    tube(g,m.stem,branch,.034);
    tube(g,m.stem,[[.02,1.73,-.03],[-.24,1.96,-.03],[-.44,2.04,.02]],.019);
    tube(g,m.stem,[[.10,2.06,-.02],[.34,2.20,-.13],[.46,2.29,-.15]],.017);
    leaf(g,-.20,1.94,-.03,.94,-1.35,-.25);leaf(g,.04,1.82,.015,.80,.94,.27);
    leaf(g,.31,2.17,-.1,.76,1.98,-.41);leaf(g,.12,2.24,-.04,.62,-2.45,-.48);
    const flower=group(g);flower.position.set(.09,2.43,.05);camellia(flower);
    batch(g);return g;
  }
  function shop(p,finishingTasks){
    const room=group(p);
    const plaster=mat(0xc0b9a2,.92,'cloth'),paperLight=mat(0xeee2be,.88,'cloth',{emissive:0xe7d6af,emissiveIntensity:.33});
    const paperCool=mat(0xdcdfce,.90,'cloth',{emissive:0xd0d6c7,emissiveIntensity:.24});
    box(room,plaster,0,2.5,-7.4,34,13,.3);
    // A real wooden sill, paper screens and narrow kumiko battens.
    box(room,m.beam,0,.65,-5.6,27,1.30,.28);
    box(room,m.ebony,0,1.29,-5.42,26,.11,.45);
    for(let i=-3;i<=3;i++){
      const left=i*2.5;
      box(room,i%3===0?paperCool:paperLight,left,4.12,-5.73,2.49,5.57,.085);
      box(room,m.beam,left-1.22,4.1,-5.57,.095,5.62,.14);
      for(let j=1;j<3;j++)box(room,m.bamboo,left-1.22+j*.81,4.13,-5.565,.029,5.59,.09);
      for(let j=0;j<6;j++)box(room,m.bamboo,left,1.62+j*.94,-5.54,2.42,.033,.10);
    }
    // A narrow opening gives the garden depth between two shoji screens.
    const garden=group(p);
    const sky=mat(0xdadfca,1,'plain',{emissive:0xd9dfca,emissiveIntensity:.32});
    const sage=mat(0xa5af8e,.95),haze=mat(0xbfc4a2,.98),lichen=mat(0x939d80,.96);
    box(garden,sky,-4.98,3.4,-5.35,2.35,3.95,.10);
    for(let i=0;i<25;i++){
      const x=-6.11+rand()*2.20,y=1.36+rand()*1.9;
      egg(garden,[sage,haze,lichen][i%3],x,y,-5.23,.22+rand()*.33,.17+rand()*.25,.10);
    }
    box(garden,m.beam,-6.19,3.41,-5.12,.12,4.03,.20);
    box(garden,m.beam,-3.79,3.41,-5.12,.12,4.03,.20);
    // The dark indigo shop curtain has a resist-dyed camellia crest and a sewn hem.
    const drape=group(p);drape.position.set(3.14,3.96,-4.35);
    const clothZ=(x,y)=>.10*Math.sin(x*5.9+.24*y)+.042*Math.sin(x*11.7-.29*y);
    const curtainWidth=1.47;
    for(let i=0;i<4;i++){
      const offset=-1.25+i*1.51;
      const h=2.28+.09*Math.cos(i*3);
      const cloth=grid(30,12,(u,v)=>{
        const x=offset+u*curtainWidth,yy=-1.91+v*h+.042*Math.cos(x*5.9)*(1-v);
        return [x,yy,clothZ(x,yy)];
      });
      mesh(drape,cloth,m.indigo);
      for(const dy of [.045,.095]){
        const pts=[];for(let j=0;j<=18;j++){const x=offset+j/18*curtainWidth,y=-1.91+dy+.042*Math.cos(x*5.9);pts.push([x,y,clothZ(x,y)+.008]);}
        tube(drape,m.hem,pts,.004,34);
      }
    }
    const dye=mat(0xd1cbb1,.92,'cloth',{side:T.DoubleSide}),cx=-.52,cy=-1.10,cr=.40;
    function inkCurve(points,r){tube(drape,dye,points.map(([x,y])=>[x,y,clothZ(x,y)+.017]),r,Math.max(12,points.length*2));}
    const circ=[];for(let i=0;i<=50;i++){const a=i/50*TAU;circ.push([cx+cr*Math.cos(a),cy+cr*Math.sin(a)]);}inkCurve(circ,.014);
    for(let i=0;i<5;i++){
      const a=i*TAU/5+.34,pts=[];
      for(let j=0;j<=24;j++){
        const t=j/24*TAU,l=.16+.122*Math.cos(t),w=.126*Math.sin(t)*(.82+.18*Math.cos(t));
        pts.push([cx+l*Math.cos(a)-w*Math.sin(a),cy+l*Math.sin(a)+w*Math.cos(a)]);
      }
      inkCurve(pts,.017);
    }
    for(let i=0;i<6;i++){const a=i*2.4,r=.025*Math.sqrt(i),x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);egg(drape,dye,x,y,clothZ(x,y)+.015,.018,.018,.011);}
    const counter=group(p);
    box(counter,m.table,0,-.22,.30,23,.42,14.0);
    for(const z of [-4.14,-2.28,-.82,1.19,3.16,4.96]){
      box(counter,m.ebony,0,-.010,z,23,.006,.012);
    }
    const leftWindow=group(room);
    for(const z of [-4.1,-1.94,.24,2.42,4.60])box(leftWindow,m.beam,-4.72,3.73,z,.11,7.46,.075);
    for(const y of [1.06,3.46,6.22])box(leftWindow,m.beam,-4.72,y,.22,.14,.084,8.85);
    // A folded sashiko wiping cloth lies at the near edge of the counter.
    const towel=group(p);towel.position.set(-2.25,.025,3.90);towel.rotation.y=-.35;
    const textile=mat(0x536666,.92,'cloth',{side:T.DoubleSide}),stitch=mat(0xb4b6a2,.89,'cloth');
    function clothHeight(x,z){return .045+.027*Math.sin(x*3.2+z*.8)+.025*Math.cos(z*6.1+x*.38)+.055*Math.exp(-((x+1.12)**2)/.026);}
    for(let i=0;i<3;i++){const layer=mesh(towel,grid(35,17,(u,v)=>{const x=(u-.5)*2.85,z=(v-.5)*1.55;return [x,clothHeight(x,z)+.019*i,z];}),textile);layer.position.set(.016*i,0,-.012*i);}
    finishingTasks.push(()=>{
    for(let j=0;j<7;j++)for(let i=0;i<25;i++){
      const x=-1.31+i*.107+(j%2)*.027,z=-.69+j*.101+Math.abs(i%4-2)*.046,y=clothHeight(x,z)+.043;
      const endZ=z+(i%4<2?-.029:.029);tube(towel,stitch,[[x,y,z],[x+.032,y+.002,(z+endZ)/2],[x+.062,clothHeight(x+.062,endZ)+.043,endZ]],.0043,3);
    }
    batch(towel);
    });
    batch(room);batch(garden);batch(drape);batch(counter);
  }
  function tray(p,w,d){
    const g=group(p),sx=w/2,sz=d/2,border=.07;
    // Rounded rectangular lacquer tray with a subtly splayed rim.
    const pts=[];for(let j=0;j<4;j++){const a=j*Math.PI/2,cx=(j===0||j===3?1:-1)*(sx-.18),cz=(j<2?1:-1)*(sz-.18);
      for(let i=0;i<=8;i++)pts.push([cx+.18*Math.cos(a+i*Math.PI/16),cz+.18*Math.sin(a+i*Math.PI/16)]);
    }
    const outline=new T.Shape();pts.forEach(([x,z],i)=>i?outline.lineTo(x,-z):outline.moveTo(x,-z));outline.closePath();
    const base=mesh(g,new T.ExtrudeGeometry(outline,{depth:.073,bevelEnabled:true,bevelSize:.035,bevelThickness:.027,bevelSegments:3}),m.lacquer);base.rotation.x=-Math.PI/2;base.position.y=.055;
    const path=pts.map(([x,z])=>[x,.15,z]);path.push(path[0]);tube(g,m.vermilion,path,border*.64,100);
    return g;
  }
  function board(p){
    const g=group(p);
    lathe(g,m.ebony,[[0,.018],[1.39,.018],[1.48,.05],[1.48,.15],[1.41,.19],[0,.19]],96);
    lathe(g,m.board,[[0,.16],[2.16,.16],[2.24,.18],[2.29,.23],[2.32,.28],[2.32,.435],[2.30,.48],[2.24,.512],[2.13,.525],[0,.525]],144);
    ring(g,m.boardEdge,2.318,.291,.009);ring(g,m.boardEdge,2.319,.321,.004);
    ring(g,m.boardEdge,2.056,.526,.0048);ring(g,m.boardEdge,2.022,.526,.0030);
    // Small hand-carved plum blossom maker's mark near the rim.
    const burn=mat(0x986d48,.84,'wood');
    const bx=1.16,bz=1.44;
    for(let i=0;i<5;i++){
      const a=i*TAU/5,pts=[];
      for(let j=0;j<=17;j++){const t=j/17*TAU,l=.067+.054*Math.cos(t),w=.041*Math.sin(t);pts.push([bx+l*Math.cos(a)-w*Math.sin(a),.528,bz+l*Math.sin(a)+w*Math.cos(a)]);}
      tube(g,burn,pts,.005,19);
    }
    return g;
  }
  function dish(p){
    const g=group(p);
    lathe(g,m.porcelain,[[0,.015],[.34,.015],[.36,.056],[.43,.082],[.65,.16],[.78,.29],[.79,.318],[.771,.333],[.748,.307],[.64,.235],[.40,.136],[.26,.122],[0,.12]]);
    ring(g,m.teal,.774,.321,.010);ring(g,m.teal,.753,.307,.006);
    const pinch=group(g);
    for(let i=0;i<84;i++){
      const a=i*2.39996,r=.52*Math.sqrt((i+.5)/84),h=.08+.20*(1-(r/.53)**2)+rand()*.035;
      const o=egg(i<21?pinch:g,i%3===0?m.pistil:m.yellow,r*Math.cos(a),.12+h,r*Math.sin(a),.055+rand()*.032,.05+rand()*.026,.052+rand()*.027);o.rotation.z=rand()*3;
    }
    pinch.removeFromParent();batch(g);batch(pinch);g.add(pinch);g.userData.pinch=pinch;return g;
  }
  function tool(p){
    const g=group(p); // x runs from the fine point to the softly rounded handle
    const vs=[],ix=[],stations=[[0,.008,.012],[.105,.084,.028],[.47,.19,.079],[.79,.139,.115],[1.55,.089,.101],[1.86,.087,.095],[1.94,.064,.073],[1.966,.011,.017]];
    for(let j=0;j<stations.length;j++){const [x,w,h]=stations[j];for(const [z,y] of [[-w,.009],[-w*.96,.034],[-.07*w,h],[.07*w,h],[w*.96,.034],[w,.009],[w*.83,0],[-w*.83,0]])vs.push(x,y,z);
      if(j)for(let i=0;i<8;i++){let a=(j-1)*8+i,b=(j-1)*8+(i+1)%8;ix.push(a,b,a+8,b,b+8,a+8);}
    }
    const wood=mat(0xd7af76,.46,'wood',{side:T.DoubleSide});mesh(g,Craft.indexed(vs,ix),wood);
    for(let i=0;i<3;i++){
      const x=1.58+i*.052;tube(g,m.boardEdge,[[x,.024,-.086],[x,.062,-.052],[x,.098,0],[x,.063,.052],[x,.024,.086]],.005,8);
    }
    batch(g);return g;
  }
  function kaishi(p){
    const g=group(p);
    for(let i=0;i<2;i++){
      const sheet=mesh(g,grid(18,16,(u,v)=>{const x=(u-.5)*2.58,z=(v-.5)*2.14;
        return [x,.05*(x*x+z*z)+.07*Math.pow(u,5)+.025*Math.sin(v*4+u*2)+i*.016,z];}),m.paper);
      sheet.rotation.y=i*.12-.06;sheet.position.x=i*.075;
    }
    batch(g);return g;
  }
  function kettle(p){
    const g=group(p),iron=mat(0x40413a,.72,'glaze',{metalness:.37});
    lathe(g,iron,[[0,.02],[.47,.04],[.58,.17],[.64,.48],[.60,.68],[.43,.84],[.33,.86],[0,.86]]);
    lathe(g,m.ebony,[[0,.86],[.38,.86],[.40,.89],[.31,.96],[.12,1.0],[0,1.0]]);
    egg(g,m.beam,0,1.04,0,.095,.064,.095);
    tube(g,iron,[[-.53,.69,0],[-.51,1.24,0],[-.30,1.55,0],[.23,1.59,0],[.5,1.30,0],[.53,.7,0]],.045,32);
    tube(g,iron,[[-.5,.36,.03],[-.70,.49,.03],[-.89,.79,.02],[-.98,.81,.02]],.116);
    batch(g);return g;
  }
  function hand(p,articulate=false){
    const h=group(p);
    // Oval cross sections join the wrist, metacarpals and finger roots.
    const palm=mesh(h,grid(36,27,(u,v)=>{
      const q=u*TAU,x=.64+1.26*v;
      const width=.29+.15*Math.sin(Math.PI*Math.min(1,v*1.3))-.065*v;
      const cap=Math.min(1,.19+v*10);
      return [x,.145+.07*v+Math.cos(q)*(.148+.057*Math.sin(v*Math.PI))*cap,-.24+Math.sin(q)*width*cap];
    }),m.skin);
    palm.material.side=T.DoubleSide;
    function digit(points,rs,nailM){
      const curve=new T.CatmullRomCurve3(points.map(a=>V(...a)));
      const surface=grid(20,27,(u,v)=>{
        const a=u*TAU,point=curve.getPoint(v),tan=curve.getTangent(v);
        const side=V().crossVectors(tan,V(0,1,0)).normalize(),up=V().crossVectors(side,tan).normalize();
        const rv=v*(rs.length-1),lo=Math.min(rs.length-2,Math.floor(rv)),r=mix(rs[lo],rs[lo+1],rv-lo);
        point.addScaledVector(side,r*Math.sin(a)).addScaledVector(up,r*.84*Math.cos(a));return point.toArray();
      });mesh(h,surface,m.skin);
      const v=.82,point=curve.getPoint(v),tan=curve.getTangent(v);
      const nail=egg(h,nailM,point.x,point.y+rs[rs.length-2]*.67,point.z,.086,.017,.060);
      nail.rotation.z=Math.atan2(-tan.y,-tan.x);
      for(const t of [.39,.43]){
        const a=curve.getPoint(t);const rr=rs[1];
        tube(h,m.crease,[[a.x+.016,a.y+rr*.72,a.z-.048],[a.x,a.y+rr*.83,a.z],[a.x+.012,a.y+rr*.73,a.z+.046]],.0032,5);
      }
    }
    digit([[1.02,.161,.016],[.71,.173,.024],[.40,.112,.040],[.115,.097,.032],[0,.095,.024]],[.122,.122,.103,.098,.010],m.nail);
    for(let i=0;i<3;i++){
      const z=-.16-i*.188,ofs=i*.09;
      digit([[1.06,.164,z],[.73+ofs,.16,z-.014],[.47+ofs,.085,z-.026],[.47+ofs,-.044,z+.007],[.56+ofs,-.115,z+.044]],[.118-i*.009,.111-i*.007,.101-i*.007,.089-i*.007,.009],m.nail);
    }
    digit([[1.38,.144,.018],[1.22,.123,.171],[1.03,.014,.280],[.79,-.068,.29],[.70,-.080,.258]],[.168,.154,.131,.113,.015],m.nail);
    // Full-length gathered kappogi sleeve with a stitched, puckered cuff.
    mesh(h,grid(68,42,(u,v)=>{
      const a=u*TAU,x=1.56+v*5.4,shoulder=1-Math.exp(-v*11);
      const cuff=.05*Math.exp(-((v-.085)**2)/.00018);
      const flutes=(.011+.039*shoulder)*Math.cos(13*a+v*6)+.027*shoulder*Math.cos(7*a-v*7);
      const r=.255+.24*shoulder+.057*Math.sin(19*v)*Math.exp(-3.4*v)+flutes+cuff;
      return [x,.209+v*.12+Math.cos(a)*r,-.24+Math.sin(a)*r*1.12];
    }),m.linen);
    for(const xx of [1.58,1.623,1.76]){const pts=[];for(let i=0;i<=48;i++){const a=i*TAU/48,v=(xx-1.56)/5.4,b=1-Math.exp(-v*11),r=.255+.24*b+.057*Math.sin(19*v)*Math.exp(-3.4*v)+(.011+.039*b)*Math.cos(13*a+v*6)+.027*b*Math.cos(7*a-v*7)+.002;pts.push([xx,.209+v*.12+r*Math.cos(a),-.24+r*1.12*Math.sin(a)]);}tube(h,m.hem,pts,.006,60);}
    batch(h);
    if(articulate)h.traverse(o=>{
      if(!o.isMesh)return;
      const g=o.geometry,attr=g.attributes.position,offsets=new Float32Array(attr.count*3);
      for(let i=0;i<attr.count;i++){
        const x=attr.getX(i),z=attr.getZ(i);
        if(z>-.10 && z<.17 && x<.76){
          const f=Paste.wave(.76,.05,x);
          offsets[i*3]=.30*f;offsets[i*3+1]=-.16*f+.055*Math.sin(Math.PI*f);offsets[i*3+2]=.064*f;
        }else if(z>.17&&x<1.36){
          const f=Paste.wave(1.36,.70,x);
          offsets[i*3]=-.36*f;offsets[i*3+1]=-.02*f;offsets[i*3+2]=-.12*f;
        }
      }
      g.morphTargetsRelative=true;g.morphAttributes.position=[new T.BufferAttribute(offsets,3)];o.updateMorphTargets();
    });
    return h;
  }
  return {shop,board,vase,tray,dish,tool,kaishi,kettle,hand};
})();
