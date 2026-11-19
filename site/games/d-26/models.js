'use strict';
const KiteModels=(()=>{
  const T=THREE,A=HillArt,W=HillWind,{V,col,mesh,mat,Batch,box,orb,cylinder}=A;
  const up=V(0,1,0),dummy=new T.Object3D();
  function line(parent,a,b,rad,material,taper=1) {
    const d=b.clone().sub(a),o=mesh(parent,new T.CylinderGeometry(rad*taper,rad,d.length(),10),material);
    o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(up,d.normalize());return o;
  }
  function ellipse(parent,m,x,y,z,rx,ry,rz){const o=mesh(parent,orb,m,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function lathe(parent,points,material,x,y,z,segments=40){
    const geo=new T.LatheGeometry(points.map(([a,b])=>new T.Vector2(a,b)),segments);return mesh(parent,geo,material,x,y,z);}
  function toyGirl(scene){
    const g=new T.Group();scene.add(g);g.position.set(-1.01,W.ground(-1.01,.45),.45);g.rotation.y=-.26;
    const skin=mat('#dba480',.82),sock=mat('#ebe5ce'),shoe=mat('#80553b',.49),leather=mat('#ba8d61',.62),denim=mat('#557787'),hem=mat('#c3c6ad'),
      shirt=mat('#d9ac58'),rib=mat('#e8c486'),hair=mat('#684630',.68),lock=mat('#805538',.72),ribbon=mat('#9c523f'),straw=mat('#d7b57b'),rim=mat('#ba965f');
    for(let i=0;i<2;i++){const x=i?.123:-.126,z=i?-.053:.045;
      ellipse(g,shoe,x,.069,z-.012,.083,.071,.137);ellipse(g,leather,x,.044,z-.015,.084,.021,.139);
      line(g,V(x,.12,z),V(x+.014,.47,z),.051,sock,1.2);
      for(let j=0;j<2;j++)line(g,V(x,.25+j*.018,z),V(x,.259+j*.018,z),.056,hem);
      line(g,V(x,.10,z),V(x,.13,z),.065,shoe);}
    ellipse(g,shirt,0,.865,0,.205,.226,.145);
    const skirt=lathe(g,[[.001,.35],[.228,.35],[.252,.365],[.226,.51],[.169,.76],[.152,.81]],denim,0,0,0,60);
    const p=skirt.geometry.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i),a=Math.atan2(x,z),fold=1+(.023+.063*(.83-y))*Math.cos(a*10+.55);p.setXYZ(i,x*fold,y+.008*Math.cos(a*10)*(1-y),z*fold*.8);}skirt.geometry.computeVertexNormals();
    const seam=lathe(g,[[.244,.375],[.243,.382]],hem,0,0,0);seam.scale.z=.80;
    for(const x of [-.102,.102]){
      line(g,V(x,.749,.104),V(-x,.99,.093),.023,denim);
      ellipse(g,leather,x,.767,.107,.015,.015,.008);}
    const head=new T.Group();g.add(head);head.position.set(0,1.167,-.009);head.rotation.x=-.12;
    ellipse(head,skin,0,-.008,-.014,.17,.195,.155);
    ellipse(head,hair,0,.036,.023,.18,.185,.17);
    for(let j=0;j<15;j++){const a=-1.6+j*3.2/14;ellipse(head,j%4===0?lock:hair,Math.sin(a)*.152,-.05+.02*Math.cos(a),Math.cos(a)*.124+.025,.044,.098,.061);}
    for(const sign of [-1,1]){for(let j=0;j<4;j++){ellipse(head,j%2?hair:lock,sign*(.143+.017*Math.sin(j*1.8)),-.115-.049*j,.063+.006*j,.044-.0035*j,.051,.043);}
      ellipse(head,ribbon,sign*.148,-.25,.087,.037,.014,.035);
      ellipse(head,lock,sign*.15,-.285,.09,.025,.049,.024);}
    // Woven straw hat with a curled brim, two ribbon ends and a stitched band.
    const hat=new T.Group();head.add(hat);hat.position.set(0,.128,0);hat.rotation.set(-.09,.04,-.07);
    const brim=lathe(hat,[[.001,-.009],[.15,-.012],[.23,-.019],[.284,-.003],[.289,.006],[.257,.012],[.176,.031],[.001,.03]],straw,0,0,0,64);
    brim.scale.z=.95;
    lathe(hat,[[.173,.014],[.175,.054],[.16,.125],[.128,.157],[.083,.166],[.001,.165]],straw,0,0,0,60);
    for(let j=0;j<10;j++){const rad=.181+j*.0107,tor=mesh(hat,new T.TorusGeometry(rad,.0014,4,60),rim,0,.023-(j/10)*.022,0);tor.rotation.x=Math.PI/2;tor.scale.y=.95;}
    lathe(hat,[[.176,.027],[.176,.060],[.174,.067]],ribbon,0,0,0,48);
    for(let i=0;i<2;i++){const bow=ellipse(hat,ribbon,i?.038:-.039,.046,.173,.054,.024,.014);bow.rotation.z=i?.53:-.46;
      const end=ellipse(hat,ribbon,i?.035:-.024,.005,.179,.016,.048,.009);end.rotation.z=i?.56:-.36;}
    // Both hands meet the wooden reel, the nearer elbow rises with tension.
    line(g,V(-.157,.97,.012),V(-.2,.798,-.025),.082,shirt,.8);
    line(g,V(-.2,.798,-.025),V(-.093,.816,-.19),.06,shirt,.81);ellipse(g,skin,-.089,.817,-.204,.052,.06,.057);
    const arm=new T.Group();g.add(arm);arm.position.set(.155,.973,-.012);
    line(arm,V(0,0,0),V(.118,-.014,-.046),.078,shirt,.85);
    line(arm,V(.118,-.014,-.046),V(.184,.106,-.158),.063,shirt,.8);
    ellipse(arm,rib,.183,.099,-.154,.053,.044,.047);ellipse(arm,skin,.196,.13,-.174,.049,.06,.049);
    const spool=new T.Group();arm.add(spool);spool.position.set(.209,.13,-.178);spool.rotation.z=-.38;
    const dowel=mat('#ad8050',.63),yarn=mat('#eee0bb');line(spool,V(-.063,0,0),V(.065,0,0),.046,yarn);
    for(const x of [-.058,.059])line(spool,V(x-.006,0,0),V(x+.006,0,0),.074,dowel);
    for(let j=0;j<8;j++)line(spool,V(-.043+j*.012,0,0),V(-.04+j*.012,0,0),.048,hem);
    return s=>{head.rotation.y=-.15*Math.tanh((s.kite.x+1)*.44);head.rotation.x=-.20-.20*Math.tanh(s.kite.y/12);
      arm.rotation.z=.16*Math.tanh(s.tension*.27)+s.cells[3].bend*.028;spool.rotation.x=s.reel;};
  }
  function clothTexture(palette){
    const c=document.createElement('canvas');c.width=640;c.height=768;const ctx=c.getContext('2d'),ww=c.width,hh=c.height;
    const X=v=>v*ww,Y=v=>v*hh;
    function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y)));ctx.closePath();ctx.fill();}
    ctx.fillStyle=palette[0];ctx.fillRect(0,0,ww,hh);
    polygon([[0,0],[.5,0],[.5,1],[0,1]],palette[1]);
    polygon([[0,.37],[.5,.04],[.5,.44]],palette[2]);polygon([[.5,.04],[1,.37],[.5,.44]],palette[0]);
    // Broad ivory wing chevrons and a simple hand-cut swallow on vermilion silk.
    for(const side of [-1,1]){
      const flip=x=>side<0?x:1-x;
      polygon([[flip(.001),.325],[flip(.344),.188],[flip(.23),.282],[flip(.035),.386]],'#fae7bc');
      polygon([[flip(.054),.423],[flip(.25),.324],[flip(.18),.393],[flip(.078),.454]],'#e8bb79');
      polygon([[flip(.18),.635],[flip(.498),.814],[flip(.498),.836],[flip(.19),.667]],'#f3ce91');
    }
    polygon([[.265,.435],[.365,.462],[.485,.522],[.552,.497],[.588,.463],[.613,.451],[.632,.46],[.665,.463],[.629,.482],[.606,.503],[.577,.558],[.543,.579],[.526,.609],[.542,.693],[.505,.642],[.486,.675],[.488,.593],[.447,.572],[.397,.55],[.34,.502]],'#fff1d4');
    ctx.fillStyle='#f9d49a';ctx.beginPath();ctx.arc(X(.51),Y(.27),ww*.031,0,2*Math.PI);ctx.fill();
    ctx.lineWidth=1.7;ctx.strokeStyle='#f1b18b';ctx.setLineDash([4,4]);
    function seam(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y)));ctx.stroke();}
    seam([[.5,0],[.5,1]]);seam([[0,.35],[.5,.376],[1,.35]]);seam([[.5,.014],[.011,.35],[.5,.985],[.989,.35],[.5,.014]]);
    ctx.setLineDash([]);ctx.globalAlpha=.13;
    for(let i=0;i<ww;i+=3){ctx.fillStyle=i%2?'#fff6d4':'#6c4136';ctx.fillRect(i,0,.6,hh);}
    for(let i=0;i<hh;i+=3){ctx.fillStyle=i%2?'#fffbdb':'#56392a';ctx.fillRect(0,i,ww,.5);}
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
  }
  function rope(parent,count,rad,color){
    const geo=new T.BufferGeometry(),pos=new Float32Array(count*5*3),norm=new Float32Array(pos.length),ids=[];
    for(let i=0;i<count-1;i++)for(let j=0;j<5;j++){const a=i*5+j,b=i*5+(j+1)%5;ids.push(a,b,a+5,b,b+5,a+5);}
    geo.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('normal',new T.BufferAttribute(norm,3).setUsage(T.DynamicDrawUsage));geo.setIndex(ids);
    const o=mesh(parent,geo,mat(color,.86,0,{side:T.DoubleSide}));o.frustumCulled=false;o.castShadow=false;
    const d=V(0,0,0),u=V(0,0,0),v=V(0,0,0),axis=V(1,0,0);
    return nodes=>{for(let i=0;i<count;i++){const a=nodes[i?i-1:0],b=nodes[Math.min(count-1,i+1)],p=nodes[i];d.set(b.x-a.x,b.y-a.y,b.z-a.z).normalize();u.crossVectors(d,Math.abs(d.x)>.94?up:axis).normalize();v.crossVectors(d,u);
      for(let j=0;j<5;j++){const k=(i*5+j)*3,ang=j*1.2566370614,cs=Math.cos(ang),sn=Math.sin(ang),nx=u.x*cs+v.x*sn,ny=u.y*cs+v.y*sn,nz=u.z*cs+v.z*sn;pos[k]=p.x+rad*nx;pos[k+1]=p.y+rad*ny;pos[k+2]=p.z+rad*nz;norm[k]=nx;norm[k+1]=ny;norm[k+2]=nz;}}
      geo.attributes.position.needsUpdate=geo.attributes.normal.needsUpdate=true;};
  }
  function ribbon(parent,count,color,width){
    const g=new T.BufferGeometry(),p=new Float32Array(count*6),idx=[];
    for(let i=0;i<count-1;i++)idx.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
    g.setAttribute('position',new T.BufferAttribute(p,3).setUsage(T.DynamicDrawUsage));g.setIndex(idx);
    const o=mesh(parent,g,mat(color,.75,0,{side:T.DoubleSide}));o.frustumCulled=false;o.castShadow=false;
    return nodes=>{for(let i=0;i<count;i++){const a=nodes[i],b=nodes[Math.min(i+1,count-1)],rot=.28*i+.65*Math.atan2(b.x-a.x,.08+Math.abs(b.y-a.y)),w=width*(1-.47*i/count);p.set([a.x-Math.cos(rot)*w,a.y,a.z-Math.sin(rot)*w,a.x+Math.cos(rot)*w,a.y,a.z+Math.sin(rot)*w],i*6);}
      g.attributes.position.needsUpdate=true;g.computeVertexNormals();};
  }
  function kite(scene,index) {
    const g=new T.Group();scene.add(g);const scale=index?.73:1;g.scale.setScalar(scale);
    const colorSets=[['#c74a35','#d4523c','#e36e4d'],['#4c8fa6','#5c9fb5','#89bcc5'],['#d5a43f','#e4b956','#f1cf78']];
    const colors=colorSets[index],geo=new T.BufferGeometry(),p=[],uv=[],idx=[],xy=[];
    const across=20,rows=32,width=.83;
    for(let j=0;j<=rows;j++)for(let i=0;i<=across;i++){
      const f=j/rows,u=(i/across-.5)*2,span=f<.65625?f/.65625:(1-f)/.34375,x=u*span*width,y=-.83+1.73*f;
      p.push(x,y,0);xy.push(u,f,span);uv.push(x/(width*2)+.5,f);
      if(j<rows&&i<across){const a=j*(across+1)+i;idx.push(a,a+1,a+across+1,a+1,a+across+2,a+across+1);}
    }
    geo.setAttribute('position',new T.Float32BufferAttribute(p,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
    const silk=mat(0xffffff,.65,0,{side:T.DoubleSide,map:clothTexture(colors),emissive:colors[0],emissiveIntensity:.046});
    const sail=mesh(g,geo,silk);sail.receiveShadow=false;
    const bamboo=mat('#bc9157',.61),binding=mat('#eee2be',.87);
    line(g,V(0,-.826,.036),V(0,.904,.035),.009,bamboo);
    for(const sign of [-1,1]){
      line(g,V(0,.304,.043),V(sign*.833,.305,-.007),.011,bamboo,.65);
      line(g,V(0,.895,.024),V(sign*.833,.305,-.009),.006,binding);
      line(g,V(sign*.833,.305,-.009),V(0,-.825,.026),.007,binding);
      line(g,V(sign*.56,.305,.047),V(0,-.02,.26),.0045,binding);
    }
    line(g,V(0,-.53,.035),V(0,-.02,.26),.0045,binding);
    const count=index?14:21,tail=ribbon(scene,count,index?colors[1]:'#cd8751',index?.023:.031);
    const cord=rope(scene,index?20:30,index?.010:.009,index?'#bcb7a1':'#e7d4a6');
    const knotColors=[mat(colors[0],.73,0,{side:T.DoubleSide}),mat('#f2d7a1',.79,0,{side:T.DoubleSide})],flags=[];
    const bowG=new T.BufferGeometry();bowG.setAttribute('position',new T.Float32BufferAttribute([0,0,.025,-.156,.068,-.012,-.149,-.055,.024,0,0,.025,.153,-.063,-.016,.163,.057,.019],3));bowG.computeVertexNormals();
    const brass=mat('#dca952',.23,.74),dark=mat('#77603e',.43,.54);
    const bellObjects=[];
    for(let j=0;j<(index?3:6);j++){const flag=new T.Group();scene.add(flag);mesh(flag,bowG,knotColors[j%2]);ellipse(flag,knotColors[(j+1)%2],0,0,.018,.022,.024,.022);flags.push(flag);
      if(!index&&j%2===0){const bell=new T.Group();flag.add(bell);bell.position.set(.08,-.018,.018);
        lathe(bell,[[.009,0],[.033,-.013],[.042,-.044],[.056,-.066],[.058,-.074],[.047,-.077],[.035,-.057]],brass,0,0,0,16);
        ellipse(bell,dark,0,-.075,0,.017,.021,.017);bellObjects.push(bell);}}
    geo.computeBoundingSphere();
    return s=>{
      const k=index?s.friends[index-1]:s.kite,stream=index?k.tail:s.tail;g.position.set(k.x,k.y,k.z);
      g.rotation.set(index?.19:k.pitch,index?.09*s.airX:.12*s.airX,k.bank,'YXZ');
      const pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){const u=xy[i*3],f=xy[i*3+1],span=xy[i*3+2],a=Math.min(6,Math.round((u*.5+.5)*6)),b=Math.min(6,Math.round(f*6)),cv=s.cloth[a+7*b];
        const fold=Math.sin(Math.PI*Math.abs(u))*(.55+.45*Math.sin(Math.PI*f));pos.setZ(i,-span*(.06*Math.abs(u)+(.057+cv.bow)*fold)+.025);}
      pos.needsUpdate=true;geo.computeVertexNormals();tail(stream);cord(index?k.rope:s.rope);
      flags.forEach((o,j)=>{const id=index?3+4*j:2+3*j,n=stream[id],n2=stream[id+1];o.position.set(n.x,n.y,n.z);o.scale.setScalar(index?.7:1);
        o.rotation.set(.34*s.cells[(id*3)%30].gust,.24*id+.23*s.cells[id].wind,Math.atan2(n2.x-n.x,Math.max(.01,n.y-n2.y))*.46+.21*(j%2?1:-1));});
      bellObjects.forEach((o,i)=>o.rotation.z=s.bells[i].angle);};
  }
  function windThreads(scene){
    const runs=[],material=mat('#fff5d6',.93,0,{emissive:'#dbe3d7',emissiveIntensity:.36,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide});
    for(let j=0;j<6;j++){const geo=new T.BufferGeometry(),p=new Float32Array(23*6),ids=[];for(let i=0;i<22;i++)ids.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
      geo.setAttribute('position',new T.BufferAttribute(p,3).setUsage(T.DynamicDrawUsage));geo.setIndex(ids);const m=mesh(scene,geo,material);m.castShadow=m.receiveShadow=false;m.frustumCulled=false;runs.push({p,geo});}
    return s=>{runs.forEach(({p,geo},j)=>{const cell=s.cells[j*4],seed=s.seeds[j*3],sign=j%2?1:-1;
      const cx=sign*(2.6+Math.floor(j/2)*2.2)+.37*(seed.x-seed.base),cy=1.55+j*.53+s.kite.y*.21,cz=-5.6-j*1.6;
      for(let i=0;i<23;i++){const f=i/22,a=f*(j===2?5.1:2.5)+j*.9+cell.gust*.13,span=1.0+cell.wind*.11;
        const x=cx+f*span+Math.cos(a)*.29,y=cy+.21*Math.sin(a)+.13*f*cell.dx,z=cz+.45*Math.cos(a),w=Math.sin(f*Math.PI)*.014;
        p.set([x,y-w,z,x,y+w,z],i*6);}geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();});};
  }
  return {toyGirl,kite,windThreads};
})();
