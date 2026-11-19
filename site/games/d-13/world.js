'use strict';
const Art = (() => {
  const T = THREE, R = Railway, random = R.rng(73179), scene = new T.Scene();
  const group = (parent = scene) => { const g = new T.Group(); parent.add(g); return g; };
  const canvas = (w,h) => { const c = document.createElement('canvas'); c.width=w; c.height=h; return c; };
  const tex = c => { const t = new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t; };
  const speck = canvas(128,128), cx=speck.getContext('2d'), pixels=cx.createImageData(128,128);
  for(let i=0;i<pixels.data.length;i+=4) {
    const n=195+random()*56; pixels.data.set([n,n,n,255],i);
  }
  cx.putImageData(pixels,0,0);
  const rough=new T.CanvasTexture(speck);rough.wrapS=rough.wrapT=T.RepeatWrapping;
  const mats={};
  function material(name,roughness=.75,metalness=0,options={}) {
    return mats[name]=new T.MeshStandardMaterial({roughness,metalness,roughnessMap:rough,...options});
  }
  material('paint',.55,.19);material('iron',.52,.63);material('steel',.24,.81);
  material('stone',.97,.01);material('wood',.85);material('leaf',.89,0,{side:T.DoubleSide});
  material('cloth',.94);material('rubber',.96);material('glass',.115,.49);
  material('shine',.2,.34);material('lamp',.34,.12,{emissive:0xffd19a,emissiveIntensity:.7});
  material('window',.18,.44,{emissive:0xffca80,emissiveIntensity:0});
  material('litWindow',.19,.32,{emissive:0xffc575,emissiveIntensity:0});
  material('redLamp',.27,.18,{emissive:0xf23e1e,emissiveIntensity:.6});
  material('amber',.32,.18,{emissive:0xffaf41,emissiveIntensity:.3});
  const shapes={ box:new T.BoxGeometry(), cylinder:new T.CylinderGeometry(.5,.5,1,16),
    slim:new T.CylinderGeometry(.5,.5,1,9), sphere:new T.SphereGeometry(.5,18,12),
    leaf:new T.IcosahedronGeometry(.5,1), ellipsoid:new T.SphereGeometry(.5,10,8),
    cone:new T.ConeGeometry(.5,1,12), disk:new T.CylinderGeometry(.5,.5,1,28) };
  // A rounded rectangular prism with planar faces and tangent corner normals.
  function bevel(key,radii) {
    const geo=new T.BoxGeometry(1,1,1,5,5,5),pos=geo.attributes.position,norm=geo.attributes.normal;
    for(let i=0;i<pos.count;i++){
      const p=[pos.getX(i),pos.getY(i),pos.getZ(i)].map((v,j)=>{const r=radii[j],n=Math.round((v+.5)*5);return [-.5,-.5+r*.47,-.5+r,.5-r,.5-r*.47,.5][n];});
      const q=p.map((v,j)=>R.clamp(v,-.5+radii[j],.5-radii[j]));
      const d=p.map((v,j)=>(v-q[j])/radii[j]),l=Math.hypot(...d)||1;
      pos.setXYZ(i,...q.map((v,j)=>v+d[j]*radii[j]/l));
      const n=d.map((v,j)=>v/radii[j]),nl=Math.hypot(...n)||1;norm.setXYZ(i,...n.map(v=>v/nl));
    } shapes[key]=geo;
  }
  bevel('rounded',[.08,.14,.08]);bevel('body',[.105,.17,.028]);bevel('glassPane',[.09,.12,.1]);
  const dummy=new T.Object3D(), white=new T.Color(), buckets=new Map(), dir=new T.Vector3(),up=new T.Vector3(0,1,0);
  function add(parent,shape,mat,color,x,y,z,w,h,d,rx=0,ry=0,rz=0) {
    let b=buckets.get(parent);if(!b)buckets.set(parent,b=new Map);
    const key=shape+'/'+mat;
    if(!b.has(key))b.set(key,{shape,mat,list:[]});
    dummy.position.set(x,y,z);dummy.scale.set(w,h,d);
    if(rx && rx.isQuaternion)dummy.quaternion.copy(rx);else dummy.rotation.set(rx,ry,rz);
    dummy.updateMatrix();b.get(key).list.push([dummy.matrix.clone(),color]);
  }
  function box(p,m,c,x,y,z,w,h,d,rx,ry,rz){add(p,'box',m,c,x,y,z,w,h,d,rx,ry,rz);}
  function round(p,m,c,x,y,z,w,h,d,rx,ry,rz){add(p,'rounded',m,c,x,y,z,w,h,d,rx,ry,rz);}
  function ell(p,m,c,x,y,z,w,h,d,rx,ry,rz){add(p,'ellipsoid',m,c,x,y,z,w,h,d,rx,ry,rz);}
  function cyl(p,m,c,x,y,z,w,h,d,rx,ry,rz){add(p,'cylinder',m,c,x,y,z,w,h,d,rx,ry,rz);}
  function beam(p,m,c,a,b,r,flat=false) {
    dir.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const len=dir.length();
    const q=new T.Quaternion().setFromUnitVectors(up,dir.normalize());
    add(p,flat?'box':'slim',m,c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,len,r,q);
  }
  function flush(){
    for(const [p,b] of buckets)for(const {shape,mat,list} of b.values()){
      const mesh=new T.InstancedMesh(shapes[shape],mats[mat],list.length);
      list.forEach(([matrix,col],i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,white.set(col));});
      mesh.castShadow=mesh.receiveShadow=true;p.add(mesh);
    }buckets.clear();
  }
  // A real barrel roof, with a rolled edge at each end.
  function roofShape(){
    const cross=[[-1.41,0],[-1.42,.09],[-1.35,.19],[-1.18,.28],[-.85,.345],[-.43,.385],[0,.4],[.43,.385],[.85,.345],[1.18,.28],[1.35,.19],[1.42,.09],[1.41,0]];
    const sh=new T.Shape();cross.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();
    const geo=new T.ExtrudeGeometry(sh,{depth:10.42,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.12});geo.translate(0,0,-5.21);
    shapes.roof=geo;
  }roofShape();
  function coach(index) {
    const g=group();
    const windowMat="coachGlass"+index;material(windowMat,.17,.44,{emissive:0xffcc8a,emissiveIntensity:0});
    const cream=0xe4d5ac, red=0x9d4131, scarlet=0xae4937,dark=0x393d39,steel=0x9c9e8c, frame=0x665e4e;
    add(g,'body','paint',cream,0,2.25,0,2.78,2.42,10.7);
    add(g,'body','paint',red,0,1.48,0,2.805,.93,10.73);
    add(g,'body','paint',0x76382e,0,1.067,0,2.79,.13,10.71);
    add(g,'roof','iron',0x555b58,0,3.46,0,1,1,1);
    box(g,'rubber',0x363a36,0,.97,0,2.30,.21,9.82);
    for(const z of [-3.46,3.46]){
      round(g,'iron',dark,0,.63,z,2.38,.47,2.05);
      for(const dz of [-.61,.61]) for(const side of [-1,1]){
        cyl(g,'iron',0x353c3d,side*1.11,.625,z+dz,.70,.18,.70,0,0,Math.PI/2);
        cyl(g,'steel',0x807f70,side*1.21,.625,z+dz,.47,.04,.47,0,0,Math.PI/2);
        cyl(g,'iron',0x585d56,side*1.25,.625,z+dz,.19,.065,.19,0,0,Math.PI/2);
      }
      for(const side of [-1,1]){
        round(g,'iron',0x4e5148,side*1.29,.67,z, .13,.16,1.75);
        for(const a of [-.49,.49])cyl(g,'iron',0x454843,side*1.29,.79,z+a,.18,.22,.18);
      }
    }
    for(let i=0;i<5;i++)round(g,'iron',i%2?0x52534c:0x3e4440,(i%2-.5)*.64,.71,-2.4+i*1.02,1.4,.53,.78);
    for(let i=0;i<4;i++){
      let z=-3.22+i*2.16;
      round(g,'iron',0x737770,0,3.93,z,.83,.21,.73);
      box(g,'iron',0x474e4a,0,3.87,z,.95,.07,.86);
      for(let k=0;k<4;k++)box(g,'iron',0x565d58,0,4.04,z-.225+k*.15,.65,.017,.046);
    }
    for(let sign of [-1,1]){
      const x=sign*1.397;
      box(g,'paint',0x8e3f30,x,3.34,0,.036,.105,10.45);
      box(g,'steel',0xa79f86,x,3.455,0,.062,.043,10.54);
      box(g,'paint',0xc59166,x,1.94,0,.026,.032,10.48);
      for(let i=0;i<6;i++){
        const z=-2.72+i*1.085;
        round(g,'rubber',0x484b42,x,2.645,z,.072,.985,1.01);
        round(g,'steel',0xc3b99c,x+sign*.032,2.645,z,.055,.917,.954);
        round(g,windowMat,i%3===0?0x677a74:0x536d6b,x+sign*.059,2.65,z,.033,.845,.895);
        box(g,'iron',0xa7a894,x+sign*.085,2.735,z,.03,.031,.90);
        box(g,'steel',0xc6baa1,x+sign*.055,2.146,z,.072,.044,1.035);
        // Reflected sky along the upper glazing, recessed blind and its lower rail.
        box(g,'glass',0x93a29a,x+sign*.077,3.012,z,.014,.08,.88);
        box(g,'wood',0xa89576,x+sign*.083,3.06,z,.015,.028,.88);
      }
      for(const z of [-4.23,4.23]){
        round(g,'iron',frame,x,2.245,z,.04,2.22,1.18);
        round(g,'paint',cream,x+sign*.02,2.25,z,.047,2.16,1.12);
        box(g,'paint',scarlet,x+sign*.05,1.536,z,.026,.80,1.095);
        round(g,'rubber',0x403f38,x+sign*.05,2.64,z,.075,.99,.77);
        round(g,windowMat,0x586f6d,x+sign*.086,2.64,z,.04,.88,.67);
        box(g,'iron',steel,x+sign*.08,1.9,z-.43,.055,.18,.045);
        box(g,'steel',steel,x+sign*.13,1.03,z,.32,.085,1.15);
      }
    }
    for(const sign of [-1,1]){
      const Z=d=>sign*(5.325+d);
      // Cream-faced cab, three independently gasketed panes and gangway door.
      round(g,'paint',cream,0,2.53,Z(.012),2.57,1.72,.086);
      round(g,'paint',scarlet,0,1.57,Z(.045),2.58,.76,.09);
      round(g,'iron',0x7c7867,0,2.255,Z(.09),.706,2.20,.073);
      round(g,'paint',cream,0,2.255,Z(.127),.656,2.145,.059);
      round(g,'paint',scarlet,0,1.55,Z(.16),.648,.74,.026);
      for(let i=-1;i<=1;i++){
        const x=i*.822,w=i?.882:.508;
        round(g,'rubber',0x383d39,x,2.69,Z(.15),w,1.0,.076);
        round(g,windowMat,i===0?0x4c6362:0x627d79,x,2.70,Z(.191),w-.095,.897,.035);
        box(g,'glass',0x93a39b,x,3.084,Z(.211),w-.14,.071,.012);
        if(i) {
          beam(g,'rubber',0x353b37,[x-.30,2.29,Z(.22)],[x+.18,2.55,Z(.232)],.024);
          beam(g,'iron',0x7b8176,[x+.31,2.21,Z(.225)],[x+.073,2.49,Z(.242)],.022);
        }
      }
      for(const x of [-.92,.92]){
        cyl(g,'iron',0x464c46,x,3.43,Z(.078),.342,.18,.342,Math.PI/2);
        cyl(g,'steel',0xc2ba9c,x,3.43,Z(.18),.302,.055,.302,Math.PI/2);
        ell(g,'lamp',0xffe2ac,x,3.43,Z(.224),.242,.232,.08);
        cyl(g,'iron',0x827965,x,1.65,Z(.123),.179,.08,.179,Math.PI/2);
        ell(g,'redLamp',0x963321,x,1.65,Z(.178),.124,.127,.044);
        for(let i=0;i<3;i++)box(g,'paint',0x773c32,x,1.35+i*.055,Z(.102),.43,.025,.027);
      }
      round(g,'iron',0x525447,0,3.426,Z(.088),.86,.278,.17);
      round(g,'lamp',0xf1d8a4,0,3.429,Z(.183),.73,.171,.03);
      // Pictorial destination plate: sunrise over two waves.
      ell(g,'paint',0xac6742,0,3.446,Z(.207),.102,.102,.013);
      box(g,'paint',0x6b796d,0,3.397,Z(.213),.30,.015,.013);
      box(g,'paint',0x6b796d,0,3.373,Z(.214),.21,.011,.012);
      // Cloisonné headmark: a red setting sun above two enamel sea waves.
      cyl(g,'steel',0xc1ab7a,0,1.644,Z(.21),.575,.066,.575,Math.PI/2);
      cyl(g,'paint',0x506e6a,0,1.644,Z(.254),.524,.041,.524,Math.PI/2);
      cyl(g,'paint',0xdbad76,0,1.692,Z(.281),.409,.014,.409,Math.PI/2);
      cyl(g,'paint',0xb45e3e,-.037,1.724,Z(.294),.182,.014,.182,Math.PI/2);
      for(let j=0;j<2;j++)for(let k=0;k<8;k++){
        const wave=n=>{const x=(n/8-.5)*(.412-j*.056);return [x,1.625-j*.067+.026*Math.sin(n*.73+j*.6),Z(.309)];};
        beam(g,'paint',j?0xd6cda6:0x557d78,wave(k),wave(k+1),j?.026:.052);
      }
      for(const x of [-.39,.39]){
        beam(g,'steel',steel,[x,1.83,Z(.18)],[x,2.05,Z(.18)],.029);
        for(const y of [1.83,2.05])beam(g,'steel',steel,[x,y,Z(.11)],[x,y,Z(.18)],.025);
      }
      box(g,'iron',0x41443e,0,1.01,Z(.085),2.11,.13,.28);
      round(g,'iron',0x393d37,0,.85,Z(.29),.35,.22,.48);
      for(let i=0;i<7;i++){
        const a=i/7*Math.PI,b=(i+1)/7*Math.PI;
        beam(g,'rubber',0x303832,[.48+Math.cos(a)*.177,.96-Math.sin(a)*.27,Z(.19)],[.48+Math.cos(b)*.177,.96-Math.sin(b)*.27,Z(.19)],.052);
      }
    }return g;
  }
  return {T,R,scene,group,add,box,round,cyl,ell,beam,flush,mats,material,shapes,random,canvas,tex,coach,rough};
})();
