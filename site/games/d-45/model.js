'use strict'
const Model=(()=>{
  const T=THREE,{p,mat,rnd}=Art
  const boxG=new T.BoxGeometry(1,1,1),ballG=new T.SphereGeometry(1,12,9),leafG=new T.SphereGeometry(1,8,5)
  const diskG=new T.CylinderGeometry(1,1,1,32),pegG=new T.CylinderGeometry(1,1,1,10)
  const planeG=new T.PlaneGeometry(1,1)
  const group=(par,x=0,y=0,z=0)=>{const g=new T.Group();par.add(g);g.position.set(x,y,z);return g}
  function mesh(par,geo,m,x,y,z,sx=1,sy=1,sz=1){
    const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz)
    o.castShadow=!m.transparent;o.receiveShadow=true;par.add(o);return o
  }
  const box=(g,x,y,z,w,h,d,m)=>mesh(g,boxG,m,x,y,z,w,h,d)
  const orb=(g,x,y,z,a,b,c,m)=>mesh(g,ballG,m,x,y,z,a,b,c)
  const cyl=(g,x,y,z,r,h,m)=>mesh(g,diskG,m,x,y,z,r,h,r)
  const flat=(g,x,y,z,w,h,m)=>{const q=mesh(g,planeG,m,x,y,z,w,h,1);q.rotation.x=-Math.PI/2;q.castShadow=false;return q}
  function rod(g,a,b,r,m){
    const v=new T.Vector3(...a),u=new T.Vector3(...b).sub(v),l=u.length();v.addScaledVector(u,.5)
    const o=mesh(g,pegG,m,v.x,v.y,v.z,r,l,r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),u.normalize());return o
  }
  function trimPath(g,pts,r,m){
    const path=new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v)))
    return mesh(g,new T.TubeGeometry(path,Math.max(12,pts.length*5),r,7,false),m,0,0,0)
  }
  function extr(g,shape,depth,m,x=0,y=0,z=0,bevel=.0015){
    return mesh(g,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSegments:2,steps:1,curveSegments:24,bevelSize:bevel,bevelThickness:bevel}),m,x,y,z)
  }
  function archPath(path,cx,bottom,w,h){
    const r=w/2,cy=bottom+h-r
    path.moveTo(cx-r,bottom);path.lineTo(cx+r,bottom);path.lineTo(cx+r,cy)
    path.absarc(cx,cy,r,0,Math.PI,false);path.lineTo(cx-r,bottom)
    return path
  }
  function arch(g,cx,y,z,w,h,depth,m){return extr(g,archPath(new T.Shape(),0,0,w,h),depth,m,cx,y,z)}
  function archFrame(g,cx,b,z,w,h,th,m){
    const r=w/2,cy=b+h-r
    const sh=new T.Shape();sh.moveTo(-r-th,b);sh.lineTo(-r-th,cy);sh.absarc(0,cy,r+th,Math.PI,0,true)
    sh.lineTo(r+th,b);sh.lineTo(r,b);sh.lineTo(r,cy);sh.absarc(0,cy,r,0,Math.PI,false);sh.lineTo(-r,b);sh.closePath()
    return extr(g,sh,.015,m,cx,0,z)
  }
  // Static components sharing a finish are submitted in a single draw call.
  function bake(g) {
    g.updateWorldMatrix(true,true)
    const inv=g.matrixWorld.clone().invert(),sets=new Map(),v=new T.Vector3(),n=new T.Vector3(),mx=new T.Matrix4(),nm=new T.Matrix3()
    g.traverse(o=>{
      if(!o.isMesh||Array.isArray(o.material))return
      const m=o.material
      if(!sets.has(m))sets.set(m,{pos:[],norm:[],uv:[],idx:[],cast:o.castShadow})
      const b=sets.get(m),off=b.pos.length/3,geo=o.geometry,pa=geo.attributes.position,na=geo.attributes.normal,uv=geo.attributes.uv
      mx.multiplyMatrices(inv,o.matrixWorld);nm.getNormalMatrix(mx)
      for(let i=0;i<pa.count;i++){
        v.fromBufferAttribute(pa,i).applyMatrix4(mx);b.pos.push(v.x,v.y,v.z)
        n.fromBufferAttribute(na,i).applyNormalMatrix(nm);b.norm.push(n.x,n.y,n.z)
        b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0)
      }
      const ix=geo.index
      for(let i=0;i<(ix?ix.count:pa.count);i++)b.idx.push(off+(ix?ix.getX(i):i))
    })
    g.clear()
    for(const [m,b] of sets){
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(b.pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(b.norm,3));geo.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));geo.setIndex(b.idx);geo.userData.baked=true
      const o=new T.Mesh(geo,m);o.castShadow=b.cast;o.receiveShadow=true;g.add(o)
    }
    return g
  }
  function petal(g,x,y,z,length,width,angle,m,depth=.003){
    const o=mesh(g,leafG,m,x,y,z,width,length,depth);o.rotation.z=angle;return o
  }
  function rosette(g,x,y,z,r,m,m2) {
    for(let i=0;i<8;i++){const a=i*Math.PI/4;petal(g,x+Math.sin(a)*r*.53,y+Math.cos(a)*r*.53,z,r*(i%2?.38:.48),r*.145,-a,i%2?m:m2)}
    orb(g,x,y,z+.001,r*.15,r*.15,.003,p.goldLight)
  }
  function ring(g,x,y,z,r,t,m){
    return mesh(g,new T.TorusGeometry(r,t,8,48),m,x,y,z)
  }
  function roundSlab(w,h,d,rad=.004){
    const sh=new T.Shape(),a=w/2,b=d/2
    sh.moveTo(-a+rad,-b);sh.lineTo(a-rad,-b);sh.quadraticCurveTo(a,-b,a,-b+rad);sh.lineTo(a,b-rad);sh.quadraticCurveTo(a,b,a-rad,b);sh.lineTo(-a+rad,b);sh.quadraticCurveTo(-a,b,-a,b-rad);sh.lineTo(-a,-b+rad);sh.quadraticCurveTo(-a,-b,-a+rad,-b)
    const geo=new T.ExtrudeGeometry(sh,{depth:h,bevelEnabled:true,bevelSize:.0016,bevelThickness:.0016,bevelSegments:2,curveSegments:3})
    geo.rotateX(-Math.PI/2);return geo
  }
  const tileBody=roundSlab(.1435,.013,.1435)
  function tile(g,x,y,z,type,variant=0,finish=null){
    const q=group(g,x,y,z)
    const m=finish||(type==='ceramic'?p.porcelain[variant%3]:type==='wood'?p.woodTiles[variant%4]:p.stoneTiles[variant%4])
    mesh(q,tileBody,type==='ceramic'?p.body:m,0,-.007,0)
    flat(q,0,.0078,0,.142,.142,m)
    return q
  }
  const hillside=[mat('#a5afb3'),mat('#aaa8b1'),mat('#91a297'),mat('#b6b89c')]
  function countryside(g,x,w,b,h){
    const scene=group(g,x,b,-.515)
    box(scene,0,h*.5,-.136,w+.055,h+.018,.018,p.sky)
    orb(scene,-w*.2,h*.43,-.12,.046,.046,.007,p.ivory)
    for(let i=0;i<4;i++){
      let sign=i%2?1:-1
      orb(scene,sign*w*.12,-.019+i*.006,-.1+i*.021,w*(.36+.02*i),h*(.46-i*.073),.047,hillside[i])
    }
    for(let i=0;i<8;i++){
      const xx=(rnd()-.5)*w*.79,sz=.016+rnd()*.016
      rod(scene,[xx,.014,-.012],[xx,.062,-.012],.002,p.twig)
      orb(scene,xx,.053,-.012,sz,sz*1.4,sz*.65,i%3?p.green:p.lilac[1])
    }
  }
  function windowPane(g,x,b,w,h,z){
    const cy=b+h-w/2
    archFrame(g,x,b,z,w,h,.023,p.trim);archFrame(g,x,b+.004,z+.014,w-.010,h-.012,.008,p.ivory)
    arch(g,x,b,z-.008,w,h,.001,p.glass)
    box(g,x,b+(h-w/2)/2,z+.016,.012,h-w/2,.014,p.ivory)
    box(g,x,cy,z+.016,w,.014,.017,p.ivory)
    for(const a of [Math.PI/4,Math.PI/2,3*Math.PI/4])
      rod(g,[x,cy,z+.016],[x+Math.cos(a)*w*.5,cy+Math.sin(a)*w*.5,z+.016],.0048,p.ivory)
    box(g,x,b-.004,z+.016,w+.075,.018,.075,p.ivory)
    box(g,x,b-.019,z+.012,w+.052,.014,.047,p.trim)
  }
  function pot(g,x,y,z,r,height,flowers=false){
    const profile=[[.61,0],[.65,.07],[.72,.13],[.96,.69],[1,.80],[1.04,.86],[1.02,.96],[.91,1],[.85,.93]].map(([a,b])=>new T.Vector2(a*r,b*height))
    mesh(g,new T.LatheGeometry(profile,24),flowers?p.plum:p.clay,x,y,z)
    cyl(g,x,y+height*.91,z,r*.88,.001,p.soil)
    for(let i=0;i<(flowers?12:9);i++){
      const a=i*2.4,spread=(.35+rnd()*.65)*r,xx=x+Math.cos(a)*spread,zz=z+Math.sin(a)*spread,yy=y+height*(1.26+rnd()*.64)
      rod(g,[x,y+height*.89,z],[xx,yy,zz],.0013,p.greenDark)
      const l=orb(g,xx,y+(yy-y)*.91,zz,r*.14,r*.51,r*.13,i%2?p.green:p.greenPale);l.rotation.z=-Math.cos(a)*.68;l.rotation.x=Math.sin(a)*.5
      if(flowers)for(let j=0;j<4;j++)orb(g,xx+Math.cos(j*1.6)*.005,yy+Math.sin(j*1.6)*.005,zz,.005,.005,.004,p.lilac[i%4])
    }
  }
  function vines(g,stage){
    const branches=[]
    const anchors=[[-.604,.64,-.430],[-.39,.655,-.445],[-.16,.64,-.445],[.46,.644,-.443],[.606,.606,-.414],[-.606,.57,-.23]]
    anchors.forEach(([x,y,z],k)=>{
      const q=group(g,x,y,z);branches.push(q)
      const len=k===2?.12:.18
      trimPath(q,[[-.092,-.014,0],[-.037,.012,.004],[.045,0,.004],[.10,-.032,.003]],.0042,p.twig)
      for(let s=0;s<4;s++){
        const xx=(s-1.5)*.049+(rnd()-.5)*.017,zz=.01+rnd()*.024,length=len*(.5+rnd()*.65)
        trimPath(q,[[xx,.003,0],[xx+.012,-length*.46,zz],[xx+.008,-length,zz+.005]],.0017,p.greenDark)
        for(let j=0;j<8;j++){
          const a=j*2.4,frac=j/8,rad=(1-frac)*.016+.002
          const f=orb(q,xx+.009+Math.cos(a)*rad,-.025-(length-.025)*frac,zz+Math.sin(a)*rad,.012*(1-frac*.6),.015*(1-frac*.64),.009,p.lilac[(s+j+k)%5]);f.rotation.z=Math.cos(a)*.5
        }
      }
      for(let j=0;j<24;j++){
        const xx=(rnd()-.5)*.231,yy=(rnd()-.5)*.045,zz=(rnd()-.28)*.065
        const l=mesh(q,leafG,j%3?p.green:p.greenPale,xx,yy,zz,.010+rnd()*.005,.023+rnd()*.013,.006);l.rotation.set(rnd()*.7,rnd()*2,(rnd()-.5)*2.5)
      }
      bake(q)
    })
    return branches
  }
  function makeDoor(g,stage){
    const cx=.32,w=.287,h=.525,z=-.433
    archFrame(g,cx,.012,z-.014,w,h,.033,p.trim);archFrame(g,cx,.012,z+.001,w+.034,h+.018,.013,p.ivory)
    archFrame(g,cx,.014,z+.006,w+.003,h+.001,.004,p.gold)
    const pivot=group(g,cx-w/2,.012,z+.002)
    arch(pivot,w/2,0,-.014,w-.006,h-.004,.015,stage===1?p.oak:p.plum)
    arch(pivot,w/2,.157,.003,w-.041,h-.182,.006,stage===1?p.deepWood:p.dark)
    arch(pivot,w/2,.164,.010,w-.057,h-.197,.002,stage===1?p.oakLight:p.panel)
    archFrame(pivot,w/2,.157,.007,w-.045,h-.183,.005,p.gold)
    const dr=stage===1?p.deepWood:p.plum
    box(pivot,w/2,.085,.006,w-.039,.115,.005,dr)
    box(pivot,w/2,.085,.009,w-.054,.102,.006,stage===1?p.oak:p.panel)
    box(pivot,w/2,.147,.015,w-.034,.010,.01,p.trim)
    ring(pivot,w/2,.355,.018,.057,.0026,p.goldLight)
    rosette(pivot,w/2,.355,.02,.044,p.trim,p.goldLight)
    trimPath(pivot,[[w/2,.296,.017],[w/2-.007,.266,.017],[w/2+.003,.235,.017],[w/2,.208,.017]],.0018,p.gold)
    petal(pivot,w/2-.014,.264,.018,.020,.006,.80,p.gold);petal(pivot,w/2+.01,.246,.018,.017,.005,-.8,p.gold)
    box(pivot,w-.039,.212,.019,.018,.046,.006,p.gold)
    orb(pivot,w-.039,.214,.032,.012,.012,.013,p.goldLight)
    for(const y of [.097,.372])cyl(pivot,.005,y,.009,.004,.041,p.gold)
    bake(pivot);return pivot
  }
  function architecture(g,dyn,stage){
    const sh=new T.Shape();sh.moveTo(-.62,0);sh.lineTo(.62,0);sh.lineTo(.62,.636);sh.lineTo(-.62,.636);sh.closePath()
    const cx=-.238,w=.492,b=.137,h=.432
    sh.holes.push(archPath(new T.Path(),cx,b,w,h))
    // The doorway is open all the way to the plinth.
    sh.holes.push(archPath(new T.Path(),.32,.003,.288,.540))
    extr(g,sh,.039,stage===1?p.oakLight:p.cream,0,0,-.484,.002)
    countryside(g,cx,w,b,h);windowPane(g,cx,b,w,h,-.444)
    // A shallow visible stretch of the next room continues through the hinged door.
    const hall=group(g,.32,0,-.49)
    box(hall,0,.262,-.209,.312,.529,.014,stage===0?p.oakLight:p.sky)
    for(let j=0;j<3;j++)for(let k=0;k<2;k++)
      box(hall,-.102+j*.102,.003,-.053-k*.102,.099,.013,.099,stage===0?p.woodTiles[(j+k)%4]:p.stoneTiles[(j+k)%4])
    for(const edge of [-1,1])box(hall,edge*.153,.25,-.108,.012,.502,.214,stage===0?p.cream:p.glass)
    if(stage===0){
      box(hall,0,.127,-.196,.3,.012,.01,p.deepWood)
      for(const xx of [-.098,0,.098])box(hall,xx,.067,-.195,.083,.096,.012,p.oak)
    }else{
      box(hall,0,.25,-.196,.011,.49,.012,p.greenDark);box(hall,0,.27,-.195,.30,.011,.012,p.greenDark)
    }
    for(const [y,hh,d,m] of [[.632,.024,.079,p.trim],[.651,.018,.088,p.ivory],[.665,.010,.086,p.gold],[.675,.014,.092,p.plum]]){
      box(g,0,y,-.468,1.274,hh,d,m)
    }
    for(const [x,width] of [[-.223,.785],[.551,.129]]){
      box(g,x,.046,-.437,width,.074,.017,stage===1?p.deepWood:p.plumLight)
      box(g,x,.083,-.425,width,.012,.022,p.trim);box(g,x,.015,-.422,width,.019,.022,p.ivory)
      for(let j=0;j<Math.floor(width/.087);j++)box(g,x-width/2+.033+j*.087,.046,-.424,.007,.049,.005,p.trim)
    }
    const side=group(g,-.619,0,-.169);side.rotation.y=Math.PI/2
    const ss=new T.Shape();ss.moveTo(-.29,0);ss.lineTo(.29,0);ss.lineTo(.29,.62);ss.lineTo(.21,.62);ss.bezierCurveTo(.09,.61,.047,.456,-.10,.421);ss.lineTo(-.29,.399);ss.closePath()
    ss.holes.push(archPath(new T.Path(),-.083,.116,.261,.25))
    extr(side,ss,.032,p.cream);windowPane(side,-.083,.116,.261,.25,.033)
    box(side,0,.041,.04,.579,.057,.019,p.plumLight);box(side,0,.078,.04,.579,.014,.026,p.trim)
    trimPath(side,[[-.29,.4,.013],[-.10,.423,.013],[.03,.48,.013],[.15,.592,.013],[.21,.62,.013],[.29,.62,.013]],.011,p.trim)
    for(const [x,h] of [[-.29,.4],[.27,.626]]){
      box(side,x,h/2,.021,.034,h,.048,p.trim);box(side,x,h+.004,.02,.049,.016,.065,p.ivory)
    }
    for(const x of [-.602,.606]){
      box(g,x,.315,-.435,.03,.624,.032,p.trim)
      box(g,x,.608,-.429,.043,.035,.045,p.ivory)
    }
    pot(g,-.432,.142,-.399,.027,.044,true)
    const door=makeDoor(dyn,stage)
    const branches=vines(dyn,stage)
    return {door,branches}
  }
  function chimes(g,dyn){
    const x=-.22,y=.452,z=-.354, list=[]
    for(const xx of [x-.156,x+.156])rod(g,[xx,.558,-.431],[xx,y+.025,z],.003,p.gold)
    rod(g,[x-.178,y+.012,z],[x+.178,y+.012,z],.007,p.deepWood)
    for(let i=0;i<5;i++){
      const q=group(dyn,x+(i-2)*.061,y,z),h=.105+i*.019
      for(const dx of [-.013,.013])rod(q,[dx*.6,.01,0],[dx,-.039,0],.0018,p.gold)
      box(q,0,-.04-h/2,0,.037,h,.021,p.woodTiles[i%4])
      box(q,0,-h-.030,.012,.032,.004,.003,p.gold)
      orb(q,0,-.032,.009,.004,.004,.004,p.goldLight);bake(q);list.push(q)
    }
    return list
  }
  function greenHouse(g,dyn){
    const br=[]
    for(let i=0;i<4;i++){
      const x=-.605+i*.4
      box(g,x,.279,-.45,.018,.55,.026,p.greenDark)
      box(g,x,.055,-.442,.032,.09,.038,p.trim)
      orb(g,x,.56,-.45,.016,.019,.016,p.gold)
      if(i<3){
        box(g,x+.2,.274,-.46,.375,.523,.004,p.glass)
        rod(g,[x,.425,-.45],[x+.2,.555,-.45],.006,p.greenDark)
        rod(g,[x+.2,.555,-.45],[x+.4,.425,-.45],.006,p.greenDark)
      }
    }
    for(const y of [.031,.124,.415,.548])box(g,0,y,-.45,1.22,.014,.028,p.greenDark)
    for(let j=0;j<3;j++){
      const z=-.45+j*.255
      box(g,-.61,.27,z,.018,.54,.017,p.greenDark)
      if(j<2)box(g,-.61,.265,z+.127,.005,.5,.232,p.glass)
    }
    box(g,-.61,.545,-.195,.025,.018,.539,p.greenDark)
    countryside(g,-.19,.75,.043,.407)
    for(let i=0;i<2;i++)pot(g,-.533+i*.106,.026,-.377,.041,.098,true)
    return {door:makeDoor(dyn,2),branches:br}
  }
  function watering(g,dyn){
    const x=-.41,z=-.28
    cyl(g,x,.034,z,.088,.050,p.stoneTiles[1])
    cyl(g,x,.049,z,.076,.006,p.water)
    const rim=ring(g,x,.063,z,.078,.007,p.trim);rim.rotation.x=Math.PI/2
    const rings=[]
    for(let i=0;i<7;i++){const q=ring(dyn,x,.064,z,.008+i*.009,.0009,p.water);q.rotation.x=Math.PI/2;rings.push(q)}
    rod(g,[-.55,.015,-.34],[-.55,.222,-.34],.009,p.gold)
    const can=group(dyn,-.51,.226,-.33)
    const profile=[[.043,0],[.050,.008],[.056,.065],[.039,.085],[.034,.088]].map(a=>new T.Vector2(...a))
    mesh(can,new T.LatheGeometry(profile,26),p.greenDark,0,0,0)
    cyl(can,0,.084,0,.035,.005,p.dark)
    trimPath(can,[[-.043,.013,0],[-.081,.027,0],[-.088,.083,0],[-.057,.096,0],[-.033,.075,0]],.006,p.gold)
    rod(can,[.039,.014,0],[.107,.078,.016],.011,p.gold)
    orb(can,.113,.080,.016,.018,.011,.02,p.goldLight)
    const positions=[0,0,0],indices=[],segments=32
    for(let band=1;band<=7;band++){
      for(let k=0;k<segments;k++){
        const a=k/segments*2*Math.PI,r=.076*band/7
        positions.push(r*Math.cos(a),0,r*Math.sin(a))
        const here=1+(band-1)*segments+k,after=1+(band-1)*segments+(k+1)%segments
        if(band===1)indices.push(0,after,here)
        else indices.push(here-segments,after,here,here-segments,after-segments,after)
      }
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();geo.userData.baked=true
    const surface=mesh(dyn,geo,p.water,x,.064,z);surface.castShadow=false
    bake(can);return {can,rings,surface}
  }
  function garden(g,dyn){
    const posts=[-.59,-.34,-.08,.14,.5,.608]
    for(const x of posts){
      box(g,x,.117,-.449,.035,.23,.037,p.trim);box(g,x,.238,-.449,.048,.017,.049,p.ivory)
      orb(g,x,.258,-.449,.018,.018,.018,p.trim)
    }
    for(const [x,w] of [[-.228,.752],[.553,.106]]){
      for(const y of [.07,.164])box(g,x,y,-.452,w,.022,.026,p.ivory)
      for(let j=0;j<Math.ceil(w/.057);j++){const xx=x-w/2+.022+j*.057;box(g,xx,.125,-.449,.022,.201,.014,p.trim);orb(g,xx,.226,-.449,.012,.018,.010,p.trim)}
    }
    for(let i=0;i<11;i++){
      const x=-.57+i*.107
      if(x>.12&&x<.51)continue
      orb(g,x,.10,-.51,.061+rnd()*.033,.065+rnd()*.06,.065,i%2?p.green:p.greenPale)
      for(let j=0;j<6;j++)orb(g,x+(rnd()-.5)*.087,.156+rnd()*.064,-.48-rnd()*.052,.009,.012,.009,p.lilac[j%4])
    }
    const trunk=[[-.532,0,-.394],[-.509,.2,-.399],[-.546,.375,-.408],[-.512,.506,-.418]]
    trimPath(g,trunk,.021,p.twig)
    for(let i=0;i<9;i++){
      const x=-.508+(rnd()-.5)*.25,y=.42+rnd()*.113,z=-.425+(rnd()-.5)*.17
      rod(g,trunk[2],[x,y,z],.008,p.twig)
      orb(g,x,y,z,.068+rnd()*.034,.061+rnd()*.024,.065,i%3?p.green:p.greenPale)
      for(let j=0;j<4;j++)orb(g,x+(rnd()-.5)*.086,y+.04*rnd(),z+.036,.012,.012,.012,p.lilac[j%3])
    }
    const door=group(dyn,.148,.011,-.437)
    for(let i=0;i<6;i++){let y=.218+.032*Math.sin(Math.PI*i/5);box(door,.031+i*.059,y/2,0,.042,y,.018,p.plum);orb(door,.031+i*.059,y,0,.021,.014,.009,p.plum)}
    for(const y of [.051,.156])box(door,.176,y,.014,.34,.018,.014,p.panel)
    rod(door,[.016,.023,.018],[.325,.181,.018],.009,p.panel);orb(door,.308,.162,.027,.009,.010,.011,p.gold)
    bake(door);return {door,branches:[]}
  }
  function lamps(g,dyn){
    const lights=[]
    for(let i=0;i<4;i++){
      const x=-.474+i*.279,z=-.382
      const q=group(dyn,x,0,z)
      cyl(q,0,.017,0,.025,.016,p.deepWood);cyl(q,0,.068,0,.005,.103,p.gold)
      box(q,0,.119,0,.054,.009,.051,p.gold);const glow=p.amber.clone()
      const lamp=orb(q,0,.151,0,.022,.032,.022,glow)
      for(const dx of [-.023,.023])for(const dz of [-.021,.021])rod(q,[dx,.119,dz],[dx*.8,.182,dz*.8],.0024,p.gold)
      orb(q,0,.184,0,.008,.008,.008,p.gold);bake(q)
      const petals=[]
      for(let j=0;j<4;j++){
        const mount=group(dyn,x,.117,z);mount.rotation.y=j*Math.PI/2
        const hinge=group(mount,0,0,.016)
        petal(hinge,0,.030,0,.036,.013,0,j%2?p.goldLight:p.panel,.003)
        rod(hinge,[0,0,.004],[0,.053,.004],.0013,p.gold)
        bake(hinge);petals.push(hinge)
      }
      lights.push({q,m:lamp.material,petals})
    }
    return lights
  }
  function relief(g,type){
    if(type==='ceramic')rosette(g,0,0,.001,.019,p.plum,p.panel)
    if(type==='wood'){
      petal(g,-.003,.001,.001,.018,.008,-.60,p.greenDark)
      rod(g,[-.014,-.014,.005],[.011,.017,.005],.0015,p.trim)
    }
    if(type==='stone'){
      for(const [x,y,w] of [[-.008,0,.012],[.008,-.004,.01],[.007,.008,.006]])orb(g,x,y,.003,w,w*.65,.003,p.panel)
    }
  }
  function sorter(g,dyn,type,index,active){
    const q=group(dyn,TileWorld.trays[index],-.078,.67)
    const width=.335,depth=.257
    // Separate shallow open drawers with visible dovetails, lining and enamel tokens.
    box(q,0,-.014,0,width-.009,.042,depth-.009,p.oak)
    for(const xx of [-.126,.126])for(const zz of [-.090,.090])box(q,xx,-.041,zz,.043,.020,.045,p.deepWood)
    box(q,0,.011,0,width,.022,depth,p.deepWood)
    box(q,0,.027,0,width-.017,.018,depth-.018,p.plumLight)
    for(const s of [-1,1]){
      box(q,s*(width/2-.010),.046,0,.019,.077,depth,p.oak)
      box(q,s*(width/2-.010),.086,0,.023,.006,depth+.004,p.oakLight)
      box(q,0,.048,s*(depth/2-.008),width,.075,.016,p.oakLight)
      box(q,0,.086,s*(depth/2-.008),width+.003,.005,.019,p.trim)
      for(let j=0;j<3;j++)box(q,s*(width/2-.008),.029+j*.02,depth/2+.0007,.016,.007,.002,p.oak)
    }
    if(active){
      const ribbon=new T.Shape()
      ribbon.moveTo(-.031,.085);ribbon.lineTo(.031,.085);ribbon.lineTo(.031,-.002);ribbon.lineTo(0,.009);ribbon.lineTo(-.031,-.002);ribbon.closePath()
      extr(q,ribbon,.002,p.plum,0,0,.129,.0004)
      for(const side of [-1,1]){
        box(q,side*.138,.089,.121,.051,.003,.009,p.goldLight)
        box(q,side*.157,.089,.106,.009,.003,.035,p.goldLight)
      }
    }
    const seal=group(q,0,.048,.134)
    const disc=cyl(seal,0,0,0,.024,.005,p.body);disc.rotation.x=Math.PI/2
    ring(seal,0,0,.003,.024,.0022,p.gold);relief(seal,type)
    for(const x of [-.127,.127])orb(q,x,.051,.13,.004,.004,.0025,p.gold)
    for(let i=0;i<3;i++){
      const t=tile(q,-.060+i*.002,.046+i*.014,.007+i*.003,type,i===2?0:i+1);t.rotation.y=-.09+i*.032
    }
    for(let i=0;i<2;i++){const t=tile(q,.071+i*.002,.046+i*.014,-.015,type,i+1);t.rotation.y=.082-i*.042}
    bake(q)
    const top=tile(dyn,TileWorld.trays[index]-.052,.014,.68,type,0);top.rotation.y=-.048;bake(top)
    return {q,top}
  }
  function foundation(g){
    box(g,0,-.055,-.006,1.276,.071,.978,p.base)
    box(g,0,-.094,-.006,1.242,.013,.95,p.deepWood)
    box(g,0,-.018,-.006,1.277,.008,.978,p.gold)
    box(g,0,-.007,-.006,1.262,.014,.969,p.oakLight)
    box(g,0,-.002,0,1.204,.012,.905,p.bed)
    for(const sign of [-1,1]){
      box(g,sign*.615,.007,0,.026,.017,.932,p.trim)
      box(g,0,.006,sign*.461,1.248,.017,.021,p.trim)
      box(g,sign*.606,.016,0,.002,.002,.927,p.gold)
    }
    box(g,0,-.051,.486,1.244,.004,.003,p.panel)
    for(let j=0;j<28;j++){
      const d=box(g,(j-13.5)*.043,-.051,.486,.006,.006,.003,j%2?p.gold:p.plumLight);d.rotation.z=Math.PI/4
    }
    for(const x of [-.56,.56])for(const z of [-.40,.397])box(g,x,-.109,z,.085,.034,.083,p.deepWood)
  }
  function room(parent,stage){
    const root=group(parent),still=group(root),dyn=group(root)
    foundation(still)
    const archInfo=stage<2?architecture(still,dyn,stage):stage===2?greenHouse(still,dyn):garden(still,dyn)
    const bells=stage===1?chimes(still,dyn):[]
    const water=stage===2?watering(still,dyn):null
    const lanterns=stage===3?lamps(still,dyn):[]
    const missing=TileWorld.holes[stage],cells=[],type=stage===0?'ceramic':stage===1?'wood':'stone'
    for(let i=0;i<48;i++){
      const {x,z}=TileWorld.point(i),hole=missing.includes(i)
      const variant=type==='ceramic'?(hole?0:(i%8+Math.floor(i/8))%2===0?0:2):((i*7+Math.floor(i/8))%4)
      const original=type==='ceramic'?p.porcelain[variant]:type==='wood'?p.woodTiles[variant]:p.stoneTiles[variant]
      const finish=original.clone()
      const q=tile(dyn,x,.007,z,type,variant,finish)
      if(type==='wood'&&(i+Math.floor(i/8))%2)q.rotation.y=Math.PI/2
      if(hole){
        box(still,x,.003,z,.143,.004,.143,p.bed)
        for(let j=0;j<11;j++)box(still,x+(j-5)*.012,.0055,z,.0022,.0015,.135,p.mortar)
      }
      q.visible=!hole;cells.push({q,finish})
    }
    const seams=[]
    for(let i=0;i<48;i++)for(const j of [i%8<7?i+1:-1,i<40?i+8:-1]){
      if(j<0)continue
      const a=TileWorld.point(i),b=TileWorld.point(j),horizontal=j===i+8
      const changing=missing.includes(i)||missing.includes(j)
      const q=box(changing?dyn:still,(a.x+b.x)/2,.009,(a.z+b.z)/2,horizontal?.144:.006,.004,horizontal?.006:.144,p.mortar)
      seams.push({q:changing?q:null,horizontal,a:i,b:j})
    }
    const rack=group(dyn,0,0,.67),rackSpace=group(rack,0,0,-.67)
    const drawers=TileWorld.types.map((m,i)=>sorter(still,rackSpace,m,i,m===type))
    bake(still)
    return {root,stage,...archInfo,bells,water,lanterns,cells,seams,drawers,rack,rackSpace}
  }
  return {group,box,orb,cyl,flat,rod,ring,petal,mesh,rosette,bake,tile,room,roundSlab}
})()
