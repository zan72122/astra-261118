'use strict';
function makeBedding(scene,W,sim){
  const T=THREE,{V,mesh,stick,tube,ell}=W,{mat}=Loom,s=sim.state;
  const blue=mat('#faf7ef',{map:Loom.quilts('blue'),roughness:.83,side:T.DoubleSide});
  const cream=mat('#fff9ed',{map:Loom.quilts('linen'),side:T.DoubleSide});
  const duck=mat('#eeeedd',{map:Loom.quilts('duck'),side:T.DoubleSide});
  const navy=mat('#2e485e'),linen=mat('#ded9bd'),hemBlue=mat('#789197');
  const base=new T.Group();scene.add(base);
  const samples=[];let hero=null;const centerX=-.30,centerZ=.95;
  function pad(w,d,h,y,material,trim,angle,ox,oz,active=false){
    const cols=active?60:42,rows=active?44:30,points=[],coords=[],uv=[],idx=[];
    function add(u,v,level,puff,edge){
      const a=u*2-1,b=v*2-1;
      const px=w/2*a*(1-.064*Math.pow(Math.abs(b),9))+.010*Math.sin(v*18+u*5)*Math.pow(Math.abs(a),5);
      const pz=d/2*b*(1-.091*Math.pow(Math.abs(a),9))+.013*Math.cos(u*16+v*3)*Math.pow(Math.abs(b),5);
      const edgeDist=Math.min(u,1-u,v,1-v);
      const rim=1-Math.exp(-Math.max(0,edgeDist)*30);
      const stX=Math.sin((u-.039)*Math.PI*4.34),stZ=Math.sin((v-.051)*Math.PI*3.34);
      const pockets=.034*(1-Math.exp(-stX*stX*17))*(1-Math.exp(-stZ*stZ*16));
      const crease=.004*Math.sin(u*55+Math.sin(v*21)*1.7)*Math.cos(v*31)+.005*Math.sin(v*26+u*13);
      let lift=level*h*.5+(level>=0?1:-1)*puff*(rim*(h*.18+(active?pockets:pockets*.38)) + crease);
      let x=px*(1+edge*.035),z=pz*(1+edge*.054);
      let X=x*Math.cos(angle)+z*Math.sin(angle)+ox,Z=z*Math.cos(angle)-x*Math.sin(angle)+oz;
      points.push({u,v,x:X,z:Z,y:lift,rawX:x,rawZ:z});
      coords.push(X,lift+y,Z);uv.push(u,1-v);return points.length-1;
    }
    function grid(top){let offset=points.length;
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++)add(i/cols,j/rows,top? .77:-.78,1,0);
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=offset+j*(cols+1)+i,l=k+cols+1;if(top)idx.push(k,l,k+1,k+1,l,l+1);else idx.push(k,k+1,l,k+1,l+1,l);}
    }
    grid(true);const topCount=idx.length;grid(false);const startSide=idx.length;const edge=[];
    for(let i=0;i<cols;i++)edge.push([i/cols,0]);for(let j=0;j<rows;j++)edge.push([1,j/rows]);
    for(let i=cols;i>0;i--)edge.push([i/cols,1]);for(let j=rows;j>0;j--)edge.push([0,j/rows]);
    // Cross-section includes the sewn welt and the recessed shadow below it.
    const profile=[[.77,0],[.64,.60],[.33,.96],[.095,1.06],[.055,1.21],[-.02,1.22],[-.10,1.02],[-.38,.92],[-.64,.57],[-.78,0]];
    const groups=[];
    for(let j=0;j<profile.length;j++){
      const [lev,r]=profile[j],start=points.length;edge.forEach(([u,v])=>add(u,v,lev,j===0||j===profile.length-1?1:0,r));
      if(j===0)continue;let begin=idx.length;
      for(let i=0;i<edge.length;i++){let a=start+i,b=start+(i+1)%edge.length,c=a-edge.length,e=b-edge.length;idx.push(c,e,a,e,b,a);}
      groups.push([begin,idx.length-begin,j===5?2:1]);
    }
    const g=new T.BufferGeometry();g.setIndex(idx);g.setAttribute('position',new T.Float32BufferAttribute(coords,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    if(active){g.addGroup(0,topCount,0);g.addGroup(topCount,startSide-topCount,3);}else g.addGroup(0,startSide,0);groups.forEach(a=>g.addGroup(...a));g.computeVertexNormals();
    const band=mat(active?'#415c70':material===cream?'#e5dfc9':'#9faeab',{side:T.DoubleSide});trim.side=T.DoubleSide;
    const materials=[material,band,trim];
    if(active)materials.push(mat('#eae6d6',{map:duck.map,side:T.DoubleSide,vertexColors:true}));
    const o=mesh(g,materials,active?scene:base);o.frustumCulled=false;
    if(active){
      hero=o;
      const col=new T.Float32BufferAttribute(new Float32Array(points.length*3).fill(1),3);g.setAttribute('color',col);
      material.vertexColors=true;band.vertexColors=true;trim.vertexColors=true;
      material.onBeforeCompile=shader=>{
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
          #include <roughnessmap_fragment>
          #ifdef USE_COLOR
          roughnessFactor=clamp(roughnessFactor-.22+.24*clamp((vColor.r-1.0)*1.75,0.,1.),.28,.98);
          #endif`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
          #ifdef USE_COLOR
          float dryFiber=clamp((vColor.r-1.0)*1.72,0.,1.);
          outgoingLight+=diffuseColor.rgb*vec3(.45,.31,.12)*dryFiber*(.25+.75*max(0.,-normal.z));
          #endif
          #include <opaque_fragment>`);
      };
      for(const p of points){
        let xx=p.u*(FutonPhysics.NX-1),zz=p.v*(FutonPhysics.NZ-1),ix=Math.floor(xx),iz=Math.floor(zz);
        let a=iz*FutonPhysics.NX+ix,b=Math.min(ix+1,FutonPhysics.NX-1)+iz*FutonPhysics.NX;
        p.nodes=[a,b,Math.min(FutonPhysics.NZ-1,iz+1)*FutonPhysics.NX+ix,Math.min(FutonPhysics.NZ-1,iz+1)*FutonPhysics.NX+b%FutonPhysics.NX];
        p.weights=[(1-xx+ix)*(1-zz+iz),(xx-ix)*(1-zz+iz),(1-xx+ix)*(zz-iz),(xx-ix)*(zz-iz)];
        samples.push(p);
      }
    }
    return o;
  }
  pad(2.65,1.77,.189,.135,cream,hemBlue,-.041,centerX+.02,centerZ+.014);
  pad(2.56,1.73,.159,.319,duck,navy,.024,centerX-.04,centerZ-.028);
  pad(2.60,1.72,.158,.484,cream,linen,-.023,centerX+.035,centerZ+.013);
  pad(2.68,1.79,.207,.68,blue,hemBlue,-.045,centerX,centerZ,true);
  // Hand-bent rattan beater. Three overlapping loops bind into a cane handle.
  const bat=new T.Group();scene.add(bat);
  const honey=Loom.wood('#e9cc96'),rattan=mat('#c89b61',{roughness:.48}),wrap=mat('#8e704e'),cord=mat('#ebe0bd');
  stick(V(0,0,0),V(0,0,.79),.031,honey,bat,.036,18);
  stick(V(0,0,.025),V(0,0,.29),.039,rattan,bat,.035);
  for(let j=0;j<15;j++)stick(V(0,0,.035+j*.016),V(0,0,.041+j*.016),.040,wrap,bat);
  function loop(off,len,width){
    const z=.69;const pts=[V(off*.1,0,z-.03),V(off*.56,.018,z+.15),V(off-width,.027,z+len*.62),V(off-width*.77,.033,z+len*.90),V(off,.039,z+len),V(off+width*.84,.025,z+len*.92),V(off+width,.012,z+len*.64),V(off*.7,-.004,z+.15),V(off*.2,-.007,z)];
    tube(pts,.021,rattan,bat);tube(pts.map(p=>p.clone().add(V(.007,.012,0))),.006,honey,bat);
  }
  loop(-.09,.62,.135);loop(.09,.62,.135);loop(0,.72,.121);
  for(let i=0;i<8;i++)stick(V(0,0,.676+i*.013),V(0,0,.685+i*.013),.047,i%3?cord:wrap,bat);
  tube([V(-.021,0,.021),V(-.061,.001,-.077),V(-.005,0,-.13),V(.046,.002,-.06),V(.023,0,.023)],.006,wrap,bat);
  const drag=s.tool;
  // Parameter-space surface mapping keeps the same fibres and pattern through each fold.
  function position(p,output){
    let dent=0,wave=0,corner=0;
    for(let i=0;i<4;i++){const c=s.cells[p.nodes[i]],k=p.weights[i];dent+=c.dent*k;wave+=c.wave*k;corner+=c.corner*k;}
    const tr=s.travel,sp=s.stow;
    let x=p.x,y=.68+p.y-dent*(.68+2*p.y)+corner,z=p.z;
    if(s.fold>.0001||s.tuck>.0001){
      const crease=centerX+.015;
      // Curl round the padded spine, then rotate the free panel. Arc length
      // is continuous at both ends of the bend, including at the sewn edge.
      if(x<crease){
        const length=crease-x,r=.132+.008*Math.cos(p.v*8),a=Math.min(length/r,s.fold*3.10);
        const free=Math.max(0,length-r*a),height=y-.68,cs=Math.cos(a),sn=Math.sin(a);
        x=crease-r*sn-free*cs+height*sn;y=.68+r*(1-cs)+free*sn+height*cs;
      }
      if(z>centerZ){
        const length=z-centerZ,r=.176+.008*Math.sin(p.u*7),a=Math.min(length/r,s.tuck*3.07);
        const free=Math.max(0,length-r*a),height=y-.78,cs=Math.cos(a),sn=Math.sin(a);
        z=centerZ+r*sn+free*cs-height*sn;y=.78+r*(1-cs)+free*sn+height*cs;
      }
    }
    if(tr>.000001){
      const angle=s.turn*Math.PI,side=p.v*2-1,abs=Math.abs(side),face=side>=0?1:-1;
      const radius=.135,rad=Math.min(1,abs/.23)*Math.PI/2;
      let hy=1.84+radius*Math.cos(rad)-1.38*Math.max(0,abs-.23)+p.y*.72*Math.cos(rad);
      let hz=(radius+p.y*.72)*Math.sin(rad)*face+.144*side+wave+Math.sin(p.u*12+side*3)*.025*abs;
      hy+=corner*.7;hz+=corner*face;hy-=s.rods[Math.min(6,Math.round(p.u*6))].bend;
      // The hem lifts over the bar while the quilt is turned.
      const hinge=Math.sin(angle)*(face>0?1.56:.77)*abs;hy+=hinge;hz*=Math.cos(angle);
      hz+=Math.sin(angle)*(.35+.14*face)*abs;
      const hx=(p.x-centerX)*1.06-.22+.045*Math.sin(p.v*5)*s.turn;
      const w=tr*tr*(3-2*tr);x+=(hx-x)*w;y+=(hy-y)*w+Math.sin(Math.PI*tr)*.66;z+=(-3.11+hz-z)*w;
    }
    output.set(x-2.78*sp,y+.12*Math.sin(Math.PI*sp),z-1.45*sp);
  }
  let pos=new T.Vector3(),before='';
  const cWet=new T.Color('#fff9ef'),cDry=new T.Color('#fff4dd');
  function update(dt){
    // Stowing moves the folded pile inside the room, opening the tatami floor.
    base.position.set(-2.78*s.stow,0,-1.45*s.stow);
    let key=[s.travel,s.turn,s.fold,s.tuck,s.stow,s.cells.some(c=>c.dent>1e-6||Math.abs(c.corner)>1e-5)].join('/');
    if(before!==key||s.travel>.001||key.endsWith('true')){
      const attr=hero.geometry.attributes.position,col=hero.geometry.attributes.color;
      for(let i=0;i<samples.length;i++){const p=samples[i];position(p,pos);attr.setXYZ(i,pos.x,pos.y,pos.z);
        let wet=0;for(let k=0;k<4;k++)wet+=s.cells[p.nodes[k]].wet*p.weights[k];
        const dry=FutonPhysics.clamp((.25-wet)*5);col.setXYZ(i,1+.57*dry,1+.43*dry,1+.29*dry);}
      col.needsUpdate=true;attr.needsUpdate=true;hero.geometry.computeVertexNormals();hero.geometry.computeBoundingSphere();before=key;
    }
    const dryness=FutonPhysics.clamp((.25-s.meanWet)/.2);blue.color.copy(cWet).lerp(cDry,dryness);blue.roughness=.75+.18*dryness;
    const home=V(1.00,.832,1.87),end=V(.39,.853,.71);
    let target=V(centerX+(drag.u-.5)*2.63,.81,centerZ+(drag.v-.5)*1.77);
    
    const nudge=s.phase==='beat'?.012*Math.sin(s.chime*24):0;
    home.y+=nudge;end.y+=nudge+Math.max(-.075,s.bat*.60);
    const holdHome=target.clone().add(V(.56,.42,1.01));home.lerp(holdHome,drag.amount);end.lerp(target.clone().add(V(0,.14+Math.max(-.085,s.bat*.7),0)),drag.amount);
    // Choreographed travel releases the tool back onto the floor.
    const setAside=Math.min(1,s.travel*4+Math.max(0,s.fold));home.x+=setAside*.58;home.y-=setAside*.775;end.x+=setAside*1.01;end.y-=setAside*.79;
    bat.position.copy(home);bat.quaternion.setFromUnitVectors(V(0,0,1),end.sub(home).normalize());
    // Align the loop's plane with the quilt, including when it is leaning.
    const zAxis=V(0,0,1).applyQuaternion(bat.quaternion);
    const xAxis=V(0,1,0).cross(zAxis).normalize(),yAxis=zAxis.clone().cross(xAxis);
    bat.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(xAxis,yAxis,zAxis));
  }
  function at(u,v){const i=Math.round(v*44)*61+Math.round(u*60);position(samples[i],pos);return pos.clone();}
  return {hero,bat,drag,update,at,blue};
}
