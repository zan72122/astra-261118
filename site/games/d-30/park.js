'use strict';
const Park=(()=>{
  const {T,V,rng,unit,noise,mat,m,grp,mesh,box,ell,cyl,stick,tube,ring,batch,geo,pixels}=Craft;
  function instances(parent,geometry,material,items,shadow=true){
    const o=new T.InstancedMesh(geometry,material,items.length),d=new T.Object3D();
    items.forEach((a,i)=>{d.position.set(...a.p);d.scale.set(...(a.s||[1,1,1]));d.rotation.set(...(a.r||[0,0,0]));d.updateMatrix();
      o.setMatrixAt(i,d.matrix);if(a.c)o.setColorAt(i,new T.Color(a.c));
    });o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;
  }
  function leafGeo(){
    const g=new T.BufferGeometry(),p=[0,0,0,-.30,.055,.40,0,.14,.48,.31,.04,.42,0,-.003,1.0];
    g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute([.5,0,0,.4,.5,.5,1,.4,.5,1],2));g.setIndex([0,2,1,0,3,2,1,2,4,2,3,4]);g.computeVertexNormals();return g;
  }
  const leaf=leafGeo();
  function tray(parent){
    const g=grp(parent),w=SandPhysics.width,d=SandPhysics.depth,t=.39;
    const endMat=mat(0xab835a,.81,0,{map:Craft.wood});
    const timber=[m.timber,m.edge,m.log],peg=mat(0x9b7653,.8);
    for(const sign of [-1,1]){
      for(let course=0;course<2;course++){
        const y=-.39+course*.355;
        box(g,w+t*(course?0:2),.351,t,.04,timber[course],0,y,sign*(d+t)/2);
        const side=box(g,d+t*(course?2:0),.351,t,.04,course?m.edge:m.timber,sign*(w+t)/2,y,0);side.rotation.y=Math.PI/2;
      }
      for(const x of [-4.87,-2.86,0,2.86,4.87]){
        const z=sign*(d/2+t/2);const screw=cyl(g,.042,.042,.009,m.iron,x,.144,z,14);
        const slot=box(g,.053,.006,.009,0,peg,x,.151,z);slot.rotation.y=.63+x;
      }
      for(const x of [-1,1]) for(const c of [0,1]){
        const y=-.39+c*.355;
        const dowel=cyl(g,.054,.054,.018,peg,x*(w*.5-.14),y,sign*(d*.5+t+.001),14);
        dowel.rotation.x=Math.PI/2;
      }
      for(const z of [-2.87,0,2.87])cyl(g,.04,.04,.008,m.iron,sign*(w+t)/2,.144,z,14);
    }
    // The cap on each corner is an end-grain joint; the upper surface is flush
    // with the rail and catches a narrow bevel highlight.
    for(const x of [-1,1])for(const z of [-1,1])box(g,t-.018,.039,t-.018,.015,endMat,x*(w+t)/2,.119,z*(d+t)/2);
    batch(g);return g;
  }
  function environment(scene){
    const garden=grp(scene),fixed=grp(garden),boughs=[];
    const lawnMap=pixels((u,v)=>{const v0=194+noise(u*4,v*4)*28+noise(u*15,v*15)*20+unit()*12;return[v0*.96,v0,v0*.92];});
    lawnMap.repeat.set(18,18);
    const lawn=mat(0x97a478,.98,0,{map:lawnMap,bumpMap:lawnMap,bumpScale:.05});
    const ground=mesh(fixed,new T.PlaneGeometry(140,140),lawn,0,-.561,0);ground.rotation.x=-Math.PI/2;
    const pathMat=mat(0xcebea4,.98,0,{map:Craft.sand});
    const pos=[],idx=[],uv=[];
    for(let i=0;i<=75;i++){
      const x=-37+i,cz=-7.5+.7*Math.sin(x*.28)-x*.074;
      pos.push(x,-.55,cz-1.01-rng()*.07,x,-.55,cz+1.01+rng()*.07);uv.push(x/2,0,x/2,2);
      if(i<75){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));bg.setIndex(idx);bg.computeVertexNormals();mesh(fixed,bg,pathMat);
    const bark=mat(0x776f58,.98,0,{map:Craft.wood,bumpMap:Craft.wood,bumpScale:.1});
    const bark2=mat(0x8b826b,.93,0,{map:Craft.wood});
    const leafMat=mat(0xffffff,.86,0,{side:T.DoubleSide}),crownMat=mat(0xffffff,.92,0,{vertexColors:true});
    const crownGeo=new T.IcosahedronGeometry(1,2);const cp=crownGeo.attributes.position,cc=[];
    for(let i=0;i<cp.count;i++){
      const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),q=.79+.37*noise(x*3.2+z,y*3.5+z);
      cp.setXYZ(i,x*q,y*q,z*q);const shade=.68+.31*noise(x*6+z*4,y*6);cc.push(shade*.99,shade,shade*.95);
    }crownGeo.setAttribute('color',new T.Float32BufferAttribute(cc,3));crownGeo.computeVertexNormals();
    const greens=[0x6c855f,0x82986a,0x93a472,0x9fb27c,0xa0ab72,0x72895d,0x8a995e,0xb1b77c];
    let treeID=0;
    function tree(x,z,h,rad){
      const id=treeID++,g=grp(fixed);g.position.set(x,-.56,z);
      const sway=unit()*.52;stick(g,[0,0,0],[sway,h*.56,.17],rad,bark,rad*.62,14);
      stick(g,[sway,h*.55,.17],[sway-.19,h*.87,-.09],rad*.63,bark,rad*.21,12);
      for(let k=0;k<5;k++){const a=k*1.23;stick(g,[Math.cos(a)*rad*2.3,.012,Math.sin(a)*rad*2.3],[sway*.11,rad*1.8,0],rad*.28,bark,rad*.56,7);}
      const hinge=grp(garden);hinge.position.set(x,h*.5-.56,z);boughs.push({o:hinge,index:id%12});
      const masses=[],leaves=[];
      for(let b=0;b<8;b++){
        const a=b*2.399+id,spread=(.19+rng()*.17)*h,xx=Math.cos(a)*spread,zz=Math.sin(a)*spread,yy=h*(.71+rng()*.25);
        const elbow=[xx*.4,h*(.57+rng()*.09),zz*.4];
        stick(g,[sway,h*(.42+rng()*.11),.1],elbow,rad*.38,bark,rad*.24,10);
        stick(g,elbow,[xx,yy,zz],rad*.24,bark2,rad*.065,9);
        for(let j=0;j<4;j++){
          const px=xx+unit()*.95,py=yy+unit()*.52-h*.5,pz=zz+unit()*.92,rr=(.095+rng()*.08)*h;
          masses.push({p:[px,py,pz],s:[rr*1.06,rr*.69,rr],r:[unit()*.3,rng()*6,unit()*.25],c:greens[Math.floor(rng()*greens.length)]});
          for(let l=0;l<24;l++){
            const theta=rng()*6.283,cy=unit(),cr=Math.sqrt(1-cy*cy),size=.16+rng()*.22;
            leaves.push({p:[px+rr*cr*Math.cos(theta),py+.67*rr*cy,pz+rr*cr*Math.sin(theta)],s:[size*1.45,size,size*1.65],r:[unit()*.97,theta,unit()*.55],c:greens[Math.floor(rng()*greens.length)]});
          }
        }
      }
      instances(hinge,crownGeo,crownMat,masses);instances(hinge,leaf,leafMat,leaves);
    }
    // The closest crowns cast the moving patches of morning light on the sand.
    tree(-6.8,-3.7,7.8,.41);tree(8.75,-4.8,8.5,.43);
    tree(-10,1,8.4,.47);tree(13,-12.4,9.9,.49);tree(-.8,-14.2,8.8,.41);
    tree(-8.2,-17,8.6,.49);tree(5.4,-21,9.1,.45);tree(-16.1,-9.9,10.2,.52);
    const fence=mat(0xc8c1a6,.85,0,{map:Craft.wood}),fenceEdge=mat(0xa7a486,.88,0,{map:Craft.wood});
    for(const y of [.19,.88])box(fixed,57,.136,.12,.018,fenceEdge,0,y,-10.89);
    for(let i=-34;i<=34;i++){
      const x=i*.64,hh=1.63+rng()*.085;
      box(fixed,.271,hh,.12,.045,fence,x,hh/2-.53,-10.81);
      const cap=ell(fixed,x,hh-.55,-10.81,.135,.089,.063,fence);
    }
    const bench=grp(fixed);bench.position.set(4.6,-.54,-6.48);bench.rotation.y=-.16;
    const bronze=mat(0x526c60,.58,.45),seat=mat(0xb9976a,.7,0,{map:Craft.wood});
    for(let j=0;j<4;j++)box(bench,3.54,.11,.17,.032,seat,0,.72,j*.18-.25);
    for(let j=0;j<3;j++){const slat=box(bench,3.54,.182,.091,.026,seat,0,1.03+j*.215,-.38-j*.035);slat.rotation.x=-.13;}
    for(const sg of [-1,1]){const x=sg*1.28;
      stick(bench,[x,.03,.38],[x,.72,.24],.055,bronze,.073);
      stick(bench,[x,.03,-.43],[x,.73,-.23],.058,bronze,.07);
      stick(bench,[x,.59,-.29],[x,1.52,-.49],.048,bronze);
      tube(bench,[[x,.7,.3],[x,.96,.32],[x,1.06,.04],[x,1.02,-.32]],.043,bronze);
      box(bench,.14,.1,.77,.03,bronze,x,.64,.04);
    }
    const shrubs=[];for(let i=0;i<98;i++){
      const x=unit()*34,z=-12-rng()*23,sz=.68+rng()*2.35;
      shrubs.push({p:[x,sz*.42-.56,z],s:[sz*1.35,sz*.67,sz],r:[0,rng()*6,0],c:greens[Math.floor(rng()*6)]});
    }instances(garden,crownGeo,crownMat,shrubs);
    // Stone and grass geometry continues around the timber, including the foreground.
    const rockGeo=new T.IcosahedronGeometry(1,1),stones=[],blades=[],petals=[],centers=[],stems=[];
    const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute([-.34,0,0,.34,0,0,.12,.61,.11,-.11,.61,.11,.18,1,.38],3));grassGeo.setIndex([0,1,2,0,2,3,3,2,4]);grassGeo.computeVertexNormals();
    const grassCol=[0x818e61,0x97a675,0xacb486,0x899d6a,0xa4ad7d];
    for(let i=0;i<11900;i++){
      const x=unit()*20,z=unit()*14;if(Math.abs(x)<3.15&&z>-4.15&&z<3.42)continue;
      if(Math.abs(z-(-7.5+.7*Math.sin(x*.28)-x*.074))<1.12)continue;
      const clump=.75+noise(x*.8,z*.8)*.68,ht=(.055+rng()*.14)*clump;
      blades.push({p:[x,-.545,z],s:[.029+rng()*.039,ht,ht*.7],r:[unit()*.3,rng()*6,unit()*.3],c:grassCol[Math.floor(rng()*5)]});
    }instances(garden,grassGeo,leafMat,blades,false);
    for(let i=0;i<170;i++){
      const x=unit()*15,z=unit()*10;if(Math.abs(x)<5.82&&Math.abs(z)<3.88)continue;
      const r=.035+rng()**2*.21;stones.push({p:[x,-.55+r*.24,z],s:[r*1.45,r*.58,r],r:[unit()*.25,rng()*6,unit()*.16],c:[0xc2b5a0,0xb0aa94,0xaca896,0xc9bda7][i%4]});
    }instances(garden,rockGeo,mat(0xffffff,.95),stones);
    const flowerPatch=[[-5.98,2.88],[5.97,2.6],[-3.4,4.9],[3.5,5.45],[-4.9,-4.81],[1.5,-4.58],[-1.5,6.45],[6.2,-1.2],[-7,-3.8]];
    for(const [xx,zz] of flowerPatch)for(let i=0;i<10;i++){
      const x=xx+unit()*.63,z=zz+unit()*.44,y=-.38+rng()*.21,scale=.65+rng()*.53;
      stems.push({p:[x,(y-.55)/2,z],s:[.008,y+.55,.008],r:[0,0,unit()*.12],c:0x778c56});
      centers.push({p:[x,y,z],s:[.03*scale,.016,.029*scale],c:0xe6bc58});
      for(let k=0;k<9;k++){const a=k*.698;petals.push({p:[x+.038*Math.sin(a)*scale,y-.007,z+.038*Math.cos(a)*scale],s:[.014*scale,.009,.033*scale],r:[unit()*.22,a,0],c:k%3?0xf3eedb:0xe3e3ce});}
    }
    const smallBall=geo('smallball',()=>new T.SphereGeometry(1,8,5));
    instances(garden,smallBall,leafMat,petals,false);instances(garden,smallBall,leafMat,centers,false);
    instances(garden,geo('stem',()=>new T.CylinderGeometry(1,1,1,5)),leafMat,stems,false);
    batch(fixed);return {boughs,garden};
  }
  return {environment,tray,instances,leaf};
})();
