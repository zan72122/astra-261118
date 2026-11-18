const Crops=(()=>{
  const {T,rand,obj,mat,group,bar,ball,pack}=Art;
  function geometry(kind,count,seed){
    const rng=FarmModel.random(seed),pts=[],colors=[],ind=[];
    function vert(x,y,z,c,shade=1){pts.push(x,y,z);colors.push(c.r*shade,c.g*shade,c.b*shade);return pts.length/3-1;}
    function tri(a,b,c){ind.push(a,b,c);}
    function stem(x,y,z,topX,topY,topZ,r,c){
      const a=pts.length/3;
      for(let j=0;j<2;j++)for(let k=0;k<3;k++){
        const ang=k*Math.PI*2/3;vert((j?topX:x)+Math.cos(ang)*r*(j?.65:1),j?topY:y,(j?topZ:z)+Math.sin(ang)*r*(j?.65:1),c);
      }
      for(let k=0;k<3;k++){let n=(k+1)%3;tri(a+k,a+n,a+3+k);tri(a+n,a+3+n,a+3+k);}
    }
    for(let j=0;j<count;j++){
      const x=(rng()-.5)*.67,z=(rng()-.5)*.68,h=.63+rng()*.34,lean=(rng()-.32)*.15,zz=(rng()-.5)*.12;
      const color=new T.Color([0xcfad65,0xdabe79,0xe0bf77,0xc9a85f,0xc2a46b,0xe6c784][Math.floor(rng()*6)]);
      const stalk=new T.Color(0xc7ad73).multiplyScalar(.8+rng()*.26);
      if(kind==='stubble'){
        let sh=.107+rng()*.15;stem(x,.015,z,x+lean*.26,sh,z+zz*.2,.012,stalk);
        const a=vert(x,.02,z,color),b=vert(x+.013,.026,z,color),c=vert(x+.032,.022,z+.20+rng()*.12,color);tri(a,b,c);continue;
      }
      const xx=x+lean,ez=z+zz;
      stem(x,0,z,xx,h,ez,.009,stalk);
      // Blade folds give the narrow leaves a sunlit face and a shadowed face.
      for(let l=0;l<2;l++){
        const a=rng()*6.28,dx=Math.cos(a),dz=Math.sin(a),by=h*(.30+l*.27);
        const p=vert(x+lean*.4,by,z+zz*.4,stalk),q=vert(x+dx*.084,by+.13,z+dz*.084,stalk),
          left=vert(x+dx*.084-dz*.016,by+.112,z+dz*.084+dx*.016,stalk,.89),
          right=vert(x+dx*.084+dz*.016,by+.112,z+dz*.084-dx*.016,stalk),
          tip=vert(x+dx*.21,by+.12+rng()*.11,z+dz*.21,stalk);
        tri(p,q,left);tri(p,right,q);tri(left,q,tip);tri(q,right,tip);
      }
      // Alternating pairs of solid spikelets and individual, tapering awns.
      const headH=.204+rng()*.065,angle=rng()*6.28;
      for(let k=0;k<5;k++)for(const side of [-1,1]){
        const a=angle+k*.53+(side>0?0:Math.PI),dx=Math.cos(a),dz=Math.sin(a),f=k/5,
          cx=xx+lean*f*.4,cz=ez+zz*f*.4,cy=h+headH*f,sz=(1-f*.57)*.031,
          outX=cx+dx*sz,outZ=cz+dz*sz;
        const b=vert(cx,cy,cz,color,.81),l=vert(outX-dz*sz*.54,cy+.033,outZ+dx*sz*.54,color),
          mid=vert(outX+dx*sz*.48,cy+.046,outZ+dz*sz*.48,color,1.05),r=vert(outX+dz*sz*.54,cy+.033,outZ-dx*sz*.54,color,.9),
          top=vert(outX+dx*.007,cy+.079,outZ+dz*.007,color);
        tri(b,l,mid);tri(b,mid,r);tri(l,top,mid);tri(mid,top,r);
        const br=vert(outX+dx*.007+.003,cy+.073,outZ+dz*.007,color),awn=vert(outX+dx*.042+lean*.12,cy+.14+rng()*.05,outZ+dz*.042,color,1.1);tri(top,br,awn);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ind);g.computeVertexNormals();return g;
  }
  const cropShader=`
    float h0=position.y;
    transformed.x+=sway.x*h0*h0;
    transformed.z+=sway.x*h0*.17;
    transformed.y-=abs(sway.x)*h0*.09;
    transformed.y*=1.-sway.y*.96;
    transformed.x+=sway.z*sway.y*h0;
    transformed.z+=sway.w*sway.y*h0;
    transformed*=1.-smoothstep(.72,1.,sway.y);
  `;
  function crop(s,sim,field){
    const clumps=[],dummy=Art.dummy,soilMat=mat(0xd4af65);
    const stubble=new T.InstancedMesh(geometry('stubble',9,921),new T.MeshStandardMaterial({vertexColors:true,roughness:.93,side:T.DoubleSide,roughnessMap:Art.rough}),sim.cells.length);
    field.add(stubble);stubble.receiveShadow=true;
    for(let k=0;k<4;k++){
      const geo=geometry('rye',7,321+k*52),n=Math.ceil(sim.cells.length/4),sway=new T.InstancedBufferAttribute(new Float32Array(n*4),4);sway.setUsage(T.DynamicDrawUsage);geo.setAttribute('sway',sway);
      const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.78,side:T.DoubleSide,roughnessMap:Art.rough});
      function deform(shader){shader.vertexShader='attribute vec4 sway;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+cropShader);}
      m.onBeforeCompile=deform;
      const im=new T.InstancedMesh(geo,m,n);im.castShadow=im.receiveShadow=true;im.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});im.customDepthMaterial.onBeforeCompile=deform;
      field.add(im);clumps.push({im,sway});
    }
    function plant(){
      for(let i=0;i<sim.cells.length;i++){
        const a=sim.cells[i],k=i%4,j=i>>2;dummy.position.set(a.x,.028,a.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,a.height,1);dummy.updateMatrix();
        clumps[k].im.setMatrixAt(j,dummy.matrix);stubble.setMatrixAt(i,dummy.matrix);
        const tint=.85+.13*a.height+.05*Math.sin(a.x*.65+a.z*.24+sim.day);clumps[k].im.setColorAt(j,new T.Color(tint,tint*.99,tint*.95));
      }
      for(const {im} of clumps){im.instanceMatrix.needsUpdate=im.instanceColor.needsUpdate=true;im.computeBoundingSphere();}
      stubble.instanceMatrix.needsUpdate=true;
    }
    plant();
    // Straw windrows follow the cut cells. Position and height depend on intake progress.
    const strawGeo=new T.BufferGeometry(),p=[],idx=[],col=[];
    for(let j=0;j<27;j++){
      const x=(rand()-.5)*.67,z=(rand()-.5)*.68,len=.09+rand()*.13,ang=rand()*2.5,a=p.length/3;
      p.push(x,.019,z,x+.014,.028,z-.008,x+len*Math.sin(ang),.021,z+len*Math.cos(ang));idx.push(a,a+1,a+2);
      let c=new T.Color(j%3?0xdfc690:0xaf8c53);for(let k=0;k<3;k++)col.push(c.r,c.g,c.b);
    }
    // The threshing drum lays cut stalks in overlapping diagonal fans.
    for(let j=0;j<19;j++){
      const x=(j%6)*.092-.25,z=(j/6|0)*.144-.22,a=p.length/3;
      p.push(x,.022,z,x+.019,.035,z+.005,x+.11,.036,z+.136,x+.089,.026,z+.147);
      idx.push(a,a+2,a+1,a,a+3,a+2);
      const c=new T.Color(j%3?0xdac083:0xe1c98e);for(let k=0;k<4;k++)col.push(c.r,c.g,c.b);
    }
    strawGeo.setAttribute('position',new T.Float32BufferAttribute(p,3));strawGeo.setAttribute('color',new T.Float32BufferAttribute(col,3));strawGeo.setIndex(idx);strawGeo.computeVertexNormals();
    const straw=new T.InstancedMesh(strawGeo,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.97}),sim.cells.length);straw.receiveShadow=true;field.add(straw);
    const flags=new Float32Array(sim.cells.length);flags.fill(-1);
    function draw(){
      let strawChanged=false;
      const target=sim.local(0,-3.02);
      for(let i=0;i<sim.cells.length;i++){
        const a=sim.cells[i],k=i%4,j=i>>2;
        clumps[k].sway.setXYZW(j,a.bend,a.feed,Math.max(-1.3,Math.min(1.3,(target.x-a.x)*.54)),Math.max(-1,Math.min(1,target.z-a.z)));
        if(flags[i]!==Math.fround(a.feed)){flags[i]=a.feed;dummy.position.set(a.x,.025,a.z);dummy.rotation.set(0,(i%8<4?0:-1.36)+Math.sin(a.z*.46)*.16,0);dummy.scale.set(a.feed,a.feed,a.feed);dummy.updateMatrix();straw.setMatrixAt(i,dummy.matrix);strawChanged=true;}
      }clumps.forEach(c=>c.sway.needsUpdate=true);if(strawChanged)straw.instanceMatrix.needsUpdate=true;
    }
    return {plant,draw};
  }
  function meadow(s,land){
    const f=group(s);
    // Distant fields have shallow raised furrows, with a soft grassy verge between parcels.
    for(const [x,z,w,d,rot] of [[-21,-33,31,19,.12],[8,-41,24,20,.11],[37,-35,23,23,.16],[40,20,26,22,-.32],[-31,16,20,34,.26],[-42,-9,18,20,-.17]]){
      const g=group(s,x,0,z);g.rotation.y=rot;Land.ground(g,0,0,w,d,land.soil,w/3,d/3,-.016);
      for(let i=0;i<w/.65;i++){const xx=-w/2+i*.65+.31;
        const o=Art.box(g,xx,.135,0,.52,.26,d-.4,[0xc9b47d,0xd4be87,0xc5ad73][i%3]);o.rotation.z=.03*Math.sin(i);}
      pack(g);
    }
    // Irregular three-dimensional grassy verges and chamomile at the headland.
    const n=8500,p=[],cols=[],ind=[];
    for(let i=0;i<n;i++){
      const side=i%2?1:-1,along=rand()*42-21;
      let x=side*(8.27+rand()*1.55),z=along;
      if(i%3===0){x=rand()*29-15;z=side*(20.6+rand()*4.0);}
      const h=.10+rand()*.36,ww=.015+rand()*.011,c=new T.Color([0xa9a978,0x9a9a66,0xb5ad77,0xc9ba86][i%4]),a=p.length/3;
      p.push(x-ww,.001,z,x+ww,.001,z,x+(rand()-.3)*.17,h,z+.05);ind.push(a,a+1,a+2);for(let j=0;j<3;j++)cols.push(c.r,c.g,c.b);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setIndex(ind);g.computeVertexNormals();const grass=obj(s,g,new T.MeshStandardMaterial({vertexColors:true,roughness:.9,side:T.DoubleSide}));grass.castShadow=false;
    for(let i=0;i<135;i++){
      const x=(i%2?1:-1)*(8.35+rand()*.82),z=rand()*40-19,h=.2+rand()*.24;
      bar(f,[x,0,z],[x+.035,h,z],.007,0x858858,4);
      for(let j=0;j<5;j++){const a=j*Math.PI*.4;ball(f,x+.035+Math.cos(a)*.03,h,z+Math.sin(a)*.03,.026,.011,.026,0xe6dfbf,6);}ball(f,x+.035,h+.007,z,.017,.014,.017,0xb99a40,6);
    }pack(f);
  }
  return {crop,meadow};
})();
