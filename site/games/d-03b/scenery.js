'use strict';
function buildScenery(G,sim){
  const T=THREE,W=FlightWorld,{mat,mesh,group,box,ellipsoid,rod,geometry,batch,scene}=G;
  const {noise,hash,terrain,river,shore,smooth,mix}=W,rng=W.random(87683),C=h=>new T.Color(h);
  const green=C(0x789266),meadow=C(0xb7b580),pine=C(0x395f53),rock=C(0xaa9f8e),sand=C(0xe7cba0),mud=C(0x8b9a77);
  const soil=mat(0xffffff,.95,0,true);
  // Tiny fixed variations in pigment are in world space, anchored to the land.
  const baseCompile=soil.onBeforeCompile;
  soil.onBeforeCompile=sh=>{
    baseCompile.call(soil,sh);
    sh.vertexShader='varying vec3 groundPoint;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundPoint=position;');
    sh.fragmentShader='varying vec3 groundPoint;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 q=groundPoint.xz*.28;vec2 k=floor(q);vec2 u=smoothstep(vec2(0.),vec2(1.),fract(q));
      vec3 h=fract(vec3(k.xyx)*vec3(.1031,.1030,.0973));h+=dot(h,h.yzx+33.33);
      float blade=fract((h.x+h.y)*h.z);
      diffuseColor.rgb*=.96+.06*blade*(1.-smoothstep(60.,220.,length(vViewPosition))); `);
  };
  function grid(x0,x1,s0,s1,nx,ns,fn,material,parent=scene){
    const pos=[],color=[],idx=[];
    for(let j=0;j<=ns;j++)for(let i=0;i<=nx;i++){
      const x=mix(x0,x1,i/nx),s=mix(s0,s1,j/ns),[y,c]=fn(x,s,i,j);
      pos.push(x,y,-s);color.push(c.r,c.g,c.b);
      if(i&&j){const a=j*(nx+1)+i;idx.push(a-nx-2,a-nx-1,a,a-nx-2,a,a-1)}
    }
    const m=mesh(parent,geometry(pos,idx,color),material);m.castShadow=false;return m;
  }
  function pigment(x,s,i,j){
    const h=terrain(x,s),n=noise(x*.021,s*.021),field=noise(x*.005+1,s*.007);
    const slope=Math.hypot(terrain(x+2,s)-h,terrain(x,s+2)-h)/2;
    const c=green.clone().lerp(meadow,smooth(.15,.86,field)*.83).lerp(pine,smooth(.45,.84,n)*.48);
    c.lerp(rock,smooth(.48,1.2,slope)*.85).lerp(mud,(1-smooth(5,18,Math.abs(x-river(s))))*.6);
    if(s>1480)c.lerp(sand,smooth(shore(s)-21,shore(s),x)*smooth(1480,1670,s));
    return [h,c.multiplyScalar(.89+.16*n+.045*hash(i,j))];
  }
  for(let j=-1;j<9;j++)for(let i=-2;i<2;i++)grid(i*310,(i+1)*310,j*320,(j+1)*320,48,52,pigment,soil);
  // Distant massifs have connected summits, branching rock gullies and snowfields.
  const massifs=[
    [-710,870,334,470,360],[610,960,301,390,480],[-740,1540,425,490,480],
    [-295,2040,405,490,395],[135,2310,480,535,435],[628,2180,428,430,470],
    [-1060,2690,470,650,490],[-452,3300,619,650,630],[240,3890,650,710,680],
    [1040,3530,580,750,650],[-900,-120,330,490,380],[810,220,283,450,370]
  ];
  const stoneA=C(0x696e79),stoneB=C(0xb39b91),snow=C(0xf4e8db);
  for(let m=0;m<massifs.length;m++){
    const [cx,cs,height,rx,rs]=massifs[m],seed=12.6*m;
    const mount=(x,s)=>{
      const dx=(x-cx)/rx,dz=(s-cs)/rs,rad=Math.hypot(dx,dz);
      const n=noise(x*.006+seed,s*.008),ridges=1-Math.abs(2*noise(x*.012,s*.009+seed)-1);
      const crest=Math.max(0,1-rad*.85+(n-.5)*.49);
      return -43+height*(Math.pow(crest,1.18)*(.84+.25*ridges)+.09*crest*noise(x*.045,s*.045));
    };
    grid(cx-rx*1.38,cx+rx*1.38,cs-rs*1.38,cs+rs*1.38,83,77,(x,s)=>{
      const h=mount(x,s),sl=Math.hypot(mount(x+3,s)-h,mount(x,s+3)-h)/3,grain=noise(x*.027,s*.018);
      const c=stoneA.clone().lerp(stoneB,grain*.75).lerp(pine,(1-smooth(.18,.52,h/height))*.4);
      const line=.43+.18*sl+.13*noise(x*.009+2,s*.012)+.08*grain;
      c.lerp(snow,smooth(line,line+.058,h/height));return [h,c];
    },soil);
  }
  // The stream follows the floor of the valley, with shallow luminous banks.
  const ripples=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const a=x*Math.PI*2/128,b=y*Math.PI*2/128;
    const slopeX=.14*Math.cos(6*a+3*b)+.12*Math.cos(11*a-2*b);
    const slopeY=.31*Math.cos(2*a+15*b+.52*Math.sin(4*a))+.2*Math.cos(5*a+24*b);
    ripples.set([128+110*slopeX,128+110*slopeY,247,255],(y*128+x)*4);
  }
  const normals=new T.DataTexture(ripples,128,128);normals.wrapS=normals.wrapT=T.RepeatWrapping;
  normals.magFilter=T.LinearFilter;normals.minFilter=T.LinearMipMapLinearFilter;normals.generateMipmaps=true;normals.needsUpdate=true;
  const stream=mat(0x92b2ad,.21,.32,true);stream.normalMap=normals;stream.normalScale.set(.25,.25);const streamP=[],streamC=[],streamI=[];
  for(let i=0;i<=450;i++){
    const s=-250+i*4.1,x=river(s),r=3.1+1.7*noise(8,s*.013);
    for(const v of [-1,-.77,.77,1]){streamP.push(x+v*r,4.33+.025*noise(x,s*.04),-s);const k=Math.abs(v)>.9?.76:1;streamC.push(k*.89,k,k)}
    if(i)for(let j=0;j<3;j++){const a=i*4+j;streamI.push(a-4,a-3,a+1,a-4,a+1,a)}
  }mesh(scene,geometry(streamP,streamI,streamC),stream).castShadow=false;
  // The timberline is irregular. Each small tree is a single layered crown with branch tips.
  function spruce(){
    const p=[],c=[],idx=[],n=10;
    for(let layer=0;layer<6;layer++){
      const base=.08+layer*.13,r=.235*(1-layer*.14),a0=layer*.79;
      for(let j=0;j<n;j++){const a=a0+j/n*6.283,b=a0+(j+1)/n*6.283;
        const rad=r*(.82+.25*hash(j,layer)),rad2=r*(.82+.25*hash((j+1)%n,layer));
        const y1=base+hash(j,layer+9)*.065,y2=base+hash((j+1)%n,layer+9)*.065,off=p.length/3;
        p.push(rad*Math.cos(a),y1,rad*Math.sin(a),rad2*Math.cos(b),y2,rad2*Math.sin(b),.012,Math.min(1,base+.34),0);
        const shade=.76+hash(j,layer)*.19;for(const k of [shade,shade,1.08])c.push(k*.93,k,k*.94);idx.push(off,off+2,off+1)
      }
    }return geometry(p,idx,c);
  }
  const treeGeo=spruce(),treeMat=mat(0xffffff,.94,0,true),dummy=new T.Object3D();
  for(let band=-1;band<10;band++){
    const trees=[];
    for(let k=0;k<2100;k++){const s=band*265+rng()*265,x=(rng()-.5)*1250,h=terrain(x,s);
      if(Math.abs(x-river(s))<9||h<2||(s>1660&&(x>shore(s)-18||Math.abs(x)<90))||Math.abs(x)<55&&s>1820)continue;
      const grove=noise(x*.012+24,s*.013);if(grove<.43+rng()*.24)continue;
      trees.push([x,h,s,4.6+rng()*7.5,rng()*6.28,rng()]);
    }
    const inst=new T.InstancedMesh(treeGeo,treeMat,trees.length);
    trees.forEach(([x,h,s,size,a,d],i)=>{dummy.position.set(x,h-.1,-s);dummy.scale.set(size*(.88+d*.23),size,size);dummy.rotation.set(0,a,0);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);inst.setColorAt(i,C(0x345848).lerp(C(0x708367),d*.73))});
    inst.castShadow=true;inst.receiveShadow=true;scene.add(inst);
  }
  const chalk=mat(0xe7d9b9,.85),ochre=mat(0xc7ab83,.86),tiles=[mat(0xb7694c,.82),mat(0xa85640,.86),mat(0xc17c57,.79)],trim=mat(0xeee4cd,.78),windows=mat(0x526865,.19,.46),wood=mat(0x725b45,.88);
  function house(parent,x,s,w,h,d,a,style){
    const home=group(parent);home.position.set(x,terrain(x,s)-.3,-s);home.rotation.y=a;
    box(home,[0,h/2,0],[w,h,d],style%4===0?ochre:chalk);
    const peak=h+w*.34,roofP=[];
    for(const z of [-d*.56,d*.56])roofP.push(-w*.59,h-.05,z,0,peak,z,w*.59,h-.05,z);
    mesh(home,geometry(roofP,[0,3,4,0,4,1,1,4,5,1,5,2,0,1,2,3,5,4]),tiles[style%3]);
    box(home,[w*.24,h+w*.3,-d*.14],[w*.13,w*.35,w*.14],chalk);
    for(const z of [-1,1])for(const k of [-1,1]){box(home,[k*w*.25,h*.58,z*(d/2+.01)],[w*.16,h*.32,.08],windows)}
    box(home,[w*.5,h*.37,.1],[.07,h*.72,w*.19],wood);
  }
  // Alpine hamlets and coastal blocks are batched locally for mobile GPUs.
  for(const [cx,cs,n,density] of [[-81,165,8,12],[68,368,13,13],[-80,650,10,12],[-160,1190,13,14],[-76,1910,34,12],[31,1990,30,10],[-96,2090,38,12],[66,2160,27,10],[-83,2340,27,13],[57,2420,22,11]]){
    const village=group(),cols=Math.ceil(Math.sqrt(n));for(let i=0;i<n;i++){
      let x=cx+(i%cols-cols/2)*density+rng()*3,s=cs+(Math.floor(i/cols)-cols/2)*density*1.24+rng()*5;
      if(x>shore(s)-17&&s>1600)continue;
      house(village,x,s,4+rng()*2.8,3.2+rng()*2.1,5.1+rng()*3,(rng()-.5)*.5,Math.floor(rng()*8));
    }batch(village);
  }
  function ribbon(parent,points,width,material){
    const p=[],idx=[];points.forEach(([x,y,z],i)=>{
      const n=points[Math.min(points.length-1,i+1)],a=points[Math.max(0,i-1)],dx=n[0]-a[0],dz=n[2]-a[2],len=Math.hypot(dx,dz)||1;
      p.push(x-dz/len*width,y,z+dx/len*width,x+dz/len*width,y,z-dx/len*width);
      if(i){const j=i*2;idx.push(j-2,j-1,j+1,j-2,j+1,j)}
    });return mesh(parent,geometry(p,idx),material);
  }
  const pathMat=mat(0xc3af88,.95);
  for(const side of [-1,1]){
    const road=[];for(let s=-200;s<2450;s+=4){const x=side*(64+18*Math.sin(s*.006)+7*Math.sin(s*.019));
      road.push([x,terrain(x,s)+.43,-s])}ribbon(scene,road,1.65,pathMat).castShadow=false;
  }
  const ocean=grid(-140,2000,1500,4400,80,112,(x,s)=>[.88,C(0x689fa6).lerp(C(0x94bdb8),noise(x*.019,s*.018)*.54)],mat(0xffffff,.18,.46,true));
  ocean.material.normalMap=normals;ocean.material.normalScale.set(.33,.33);
  const op=ocean.geometry.attributes.position,initialY=new Float32Array(op.count);for(let i=0;i<op.count;i++)initialY[i]=op.getY(i);
  const dock=group(),dockMat=mat(0xac9980,.74);
  for(const s of [1940,2004,2090]){
    const x=shore(s)-4;box(dock,[x+20,2.4,-s],[45,1.25,4.5],dockMat);
    for(let j=0;j<6;j++)for(const side of [-1,1])box(dock,[x+j*7,.8,-s+side*1.9],[.55,3.6,.55],wood);
  }batch(dock);
  const navy=mat(0x486774,.49),canvas=mat(0xefe0bd,.81);
  const boats=sim.model.boats.map((o,i)=>{
    const g=group();g.position.set(shore(1900+i*48)+27+i%2*12,1.15,-1900-i*48);const p=[],idx=[];
    for(const [z,w] of [[-3.5,.05],[-1.35,1.14],[1.8,1.19],[3,.72]])p.push(-w,.35,z,w,.35,z,0,-.52,z);
    for(let j=1;j<4;j++){const a=j*3;idx.push(a-3,a-2,a+1,a-3,a+1,a,a-1,a-3,a,a-1,a,a+2,a-2,a-1,a+2,a-2,a+2,a+1)}
    mesh(g,geometry(p,idx),navy);rod(g,[0,.35,-.2],[0,7.1,-.2],.054,wood);
    mesh(g,geometry([0,6.97,-.15,.35,2.4,1.65,0,.92,2.5,0,.84,-.15],[0,1,3,1,2,3]),canvas);batch(g);return g;
  });
  const wash=group(),laundry=[],clothColors=[mat(0xf5e4c8,.97),mat(0x9cb9c1,.97),mat(0xcb8271,.97)];
  for(let row=0;row<5;row++){
    const x=-25-row%2*5,s=2090+row*11,h=terrain(x,s)+5.8;
    rod(wash,[x,h-5.9,-s],[x,h+.3,-s],.10,wood);rod(wash,[x+11,h-5.8,-s],[x+11,h+.3,-s],.10,wood);
    rod(wash,[x,h,-s],[x+11,h,-s],.028,wood);
    for(let j=0;j<4;j++){const g=group();g.position.set(x+2.2+j*2.1,h,-s);const dye=clothColors[(j+row)%3];box(g,[0,-.34,0],[1.45,.68,.032],dye);
      const hem=group(g);hem.position.y=-.68;box(hem,[0,-.31,0],[1.45,.62,.032],dye);
      box(hem,[0,-.53,.002],[1.45,.048,.035],trim);laundry.push({g,hem})}
  }batch(wash);
  const field=group(),turf=mat(0x9eac78,.95),line=mat(0xe8dfbd,.93),clay=mat(0xc59376,.97);
  box(field,[0,2.21,-2250],[43,.10,145],turf);
  for(const side of [-1,1]){box(field,[side*19.5,2.28,-2250],[.21,.03,130],line);box(field,[0,2.28,-2250+side*65],[39,.03,.21],line)}
  box(field,[0,2.28,-2250],[39,.028,.2],line);
  const oval=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI*2;oval.push([Math.cos(a)*27,2.32,-2250+Math.sin(a)*77])}ribbon(field,oval,2.2,clay);
  const ridgeSleeves=W.markers.map(([x,s])=>{
    const g=group();g.position.set(x,terrain(x,s),-s);
    rod(g,[0,0,0],[0,8,0],.093,wood);
    let pivot=g;
    return Array.from({length:4},(_,i)=>{
      const joint=group(pivot);if(i)joint.position.x=1.12;else joint.position.y=8;
      const section=mesh(joint,new T.CylinderGeometry(.68-i*.112,.68-(i+1)*.112,1.14,20,1,true),i%2?trim:tiles[0]);
      section.rotation.z=Math.PI/2;section.position.x=.56;pivot=joint;return joint;
    });
  });
  // A little windsock marks the far edge, beside the welcoming group.
  rod(field,[17,2.1,-2317],[17,8.5,-2317],.07,wood);batch(field);
  const sock=group();sock.position.set(17,8.38,-2317);
  for(let j=0;j<5;j++){const m=mesh(sock,new T.CylinderGeometry(.43-j*.055,.43-(j+1)*.055,.53,14,1,true),j%2?trim:tiles[0]);m.rotation.z=Math.PI/2;m.position.x=.26+j*.53}batch(sock);
  const skin=mat(0xc8a180,.78),people=sim.model.family.map((_,i)=>{
    const g=group(),size=[1.05,.84,1.09,.71][i];g.scale.setScalar(size);g.position.set(4.3+i*1.33,2.36,-2322-((i+1)%2)*1.3);
    const shirt=[tiles[0],canvas,navy,clothColors[1]][i];ellipsoid(g,[0,1.1,0],[.24,.38,.17],shirt);ellipsoid(g,[0,1.71,0],[.155,.19,.15],skin);
    rod(g,[-.11,.87,0],[-.13,.06,0],.082,navy);rod(g,[.11,.87,0],[.14,.06,0],.083,navy);
    rod(g,[-.2,1.34,0],[-.31,.92,.03],.072,shirt);const arm=group(g);arm.position.set(.20,1.34,0);
    rod(arm,[0,0,0],[.23,.19,0],.073,shirt);rod(arm,[.23,.19,0],[.24,.43,0],.06,skin);return arm;
  });
  return {ocean,op,normals,initialY,boats,laundry,people,sock,ridgeSleeves};
}
