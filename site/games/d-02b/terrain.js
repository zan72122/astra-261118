'use strict';
const CHUNK=40;
function wave(x,z){return Math.sin(x*.38+z*.17)*.42+Math.sin(z*.51-x*.21)*.22+Math.sin(x*.71+z*.67)*.13;}
function ground(s,u){
  const r=S.river(s),ravine=1-S.smooth(2.2,5.4,Math.abs(u-r));
  const edge=S.smooth(3.4,10,Math.abs(u)),right=Math.max(0,u-5.2);
  const ridge=S.fork(s)*7.2*(1-S.smooth(1.8,10,Math.abs(u-8)));
  const village=S.smooth(948,1040,S.local(s))*(1-S.smooth(1440,1530,S.local(s)));
  let hill=right*(.16+.065*Math.cos(s*.053))+Math.max(0,-u-14)*(.11+.07*Math.sin(s*.043));
  hill=mix(hill,Math.floor(Math.max(0,Math.abs(u)-6)/6)*.68,village*.92);
  let y=S.height(s)-.09+ridge+edge*(hill+.33*wave(u,s))-ravine*1.12-S.fork(s)*.90*(1-S.smooth(0,6,Math.abs(u+5)));
  for(const route of [-1,1]){
    const p=S.point(s,route),dist=Math.abs(u-(p.x-S.baseX(s)));
    if(dist<5.5)y=mix(Math.min(y,p.y-.07),y,S.smooth(3.65,5.5,dist));
  }
  return y;
}
function bankPoint(s,u,extra=0){return V(S.baseX(s)+u,ground(s,u)+extra,-s);}
function strip(parent,rows,cols,make,mat,cast=false){
  const pos=[],color=[],idx=[],uv=[];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const p=make(i,j);pos.push(p[0],p[1],p[2]);const c=rgb(p[3]);color.push(c.r,c.g,c.b);uv.push(p[0]*.32,p[2]*.32);
    if(i<cols-1&&j<rows-1){const a=j*cols+i;idx.push(a,a+1,a+cols,a+1,a+cols+1,a+cols);}
  }
  const mesh=piece(parent,meshData(pos,idx,color,uv),mat,0,0,0);mesh.castShadow=cast;mesh.userData.dispose=true;return mesh;
}
function mergeTemplate(batch){
  const pos=[],col=[],ind=[],norm=[],uv=[],v=V(),n=V(),normalMatrix=new T.Matrix3();
  for(const [geom,instances] of batch.items){
    const p=geom.attributes.position,ns=geom.attributes.normal,uvs=geom.attributes.uv;
    for(const [m,c] of instances){const offset=pos.length/3;normalMatrix.getNormalMatrix(m);
      for(let i=0;i<p.count;i++){
        v.fromBufferAttribute(p,i).applyMatrix4(m);pos.push(v.x,v.y,v.z);
        n.fromBufferAttribute(ns,i).applyMatrix3(normalMatrix).normalize();norm.push(n.x,n.y,n.z);
        col.push(c.r,c.g,c.b);uv.push(uvs?uvs.getX(i):0,uvs?uvs.getY(i):0);
      }
      const index=geom.index;for(let i=0;i<(index?index.count:p.count);i++)ind.push(offset+(index?index.getX(i):i));
    }
  }
  const g=meshData(pos,ind,col,uv);g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));return g;
}
const twigSpray=meshData([-.9,0,0,0,.58,0,.98,0,.11,.13,0,-.78,.11,0,.91,0,-.39,0],[0,1,3,3,1,2,2,1,4,4,1,0,0,3,5,3,2,5,2,4,5,4,0,5]);
const lobe=new T.SphereGeometry(1,8,5);
const palettes=[
  ['#a94224','#bc5228','#cd6330','#da7939','#e18b48'],
  ['#b77729','#cf9834','#dcaa43','#e8bc58','#eccc76'],
  ['#875038','#b0492a','#c7522b','#ce6736','#d78243'],
  ['#7f793c','#a09e4c','#c1af50','#cdc165','#d8c879'],
  ['#aa4629','#bc5b30','#d3783d','#dd894e','#e8a25a']
];
function treeTemplate(index){
  const r=S.random(4861+index*724),b=new Batch(),pine=index>=5,bark=pine?'#514f3b':index===1?'#95816a':'#65513e';
  const trunk=V((r()-.5)*.35,4.4,0);b.rod(V(),trunk,pine?.23:.19,bark);
  for(let i=0;i<4;i++){const a=i*1.6+r();b.rod(V(Math.cos(a)*.45,.05,Math.sin(a)*.45),V(0,.8,0),.12,bark);}
  if(pine){
    const snowy=index===6;
    for(let j=0;j<7;j++){
      const y=1.6+j*.64,rad=1.74-j*.208;
      b.put(geo.cone,snowy?'#79918a':'#414f38',0,y+.7,0,rad,2.8-j*.17,rad,.04,r()*3,0);
      for(let k=0;k<8;k++){const a=k*TAU/8+r()*.39,rr=rad*(.42+r()*.28);
        b.put(geo.cone,variance(snowy?'#adbbb4':'#526347',.47,r),Math.cos(a)*rr,y+.44+r()*.25,Math.sin(a)*rr,rad*.62,1.7-j*.12,rad*.73,.16*Math.sin(a),a,-.18*Math.cos(a));}
    }
  }else{
    const pal=palettes[index],tall=index===1?1.19:1;
    for(let j=0;j<11;j++){
      const ang=j*2.4+r()*.48, level=j/11,rad=(1.0+r()*.9)*(1-level*.57);
      const from=V(trunk.x*(.4+level*.48),1.5+level*2.8,0),elbow=V(Math.cos(ang)*rad*.56,from.y+.65,Math.sin(ang)*rad*.56);
      const tip=V(Math.cos(ang)*rad,(3.2+level*2.7+r()*.45)*tall,Math.sin(ang)*rad);
      b.rod(from,elbow,.122-level*.06,bark);b.rod(elbow,tip,.084-level*.048,bark);
      for(let k=0;k<3;k++){
        const a=r()*TAU,rr=r()*.85,xx=tip.x+rr*Math.cos(a),yy=tip.y+r()*.83,zz=tip.z+rr*Math.sin(a),sz=.7+r()*.41;
        const c=variance(pal[Math.floor(r()*4)],.17,r);
        b.put(lobe,c,xx,yy,zz,sz*(1+r()*.26),sz*(.56+r()*.24)*tall,sz, r()*.4,r()*6,r()*.25);
        // Small outer sprays interrupt the crown silhouette and catch light from above.
        for(let l=0;l<9;l++){const az=r()*TAU,cy=r()*1.7-.63,cx=Math.sqrt(Math.max(0,1-cy*cy));
          const f=.16+r()*.24;b.put(twigSpray,pal[Math.floor(r()*5)],xx+Math.cos(az)*cx*sz,yy+cy*sz*.67,zz+Math.sin(az)*cx*sz,f*1.17,f*.57,f,r()*.7,az,r()*.7);}
      }
    }
  }
  return mergeTemplate(b);
}
const treeGeos=Array.from({length:7},(_,i)=>treeTemplate(i));
const treeMat=material(0xffffff,.92,0,{vertexColors:true});
const roadTexture=(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),r=S.random(733);
  ctx.fillStyle='#dfd9cb';ctx.fillRect(0,0,256,256);
  for(let i=0;i<17000;i++){const k=114+r()*120;ctx.fillStyle='rgba('+[k,k*.98,k*.94,.14+r()*.3].join(',')+')';ctx.fillRect(r()*256,r()*256,.4+r()*2.2,.4+r()*1.3);}
  const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
})();
const roadMat=material(0xffffff,.94,0,{vertexColors:true,map:roadTexture,side:T.DoubleSide});
const waterMat=material('#82b6ac',.19,.32,{vertexColors:true,side:T.DoubleSide,envMapIntensity:1.35});
const waterFoam=material('#aecfc3',.27,.23,{vertexColors:true,side:T.DoubleSide});
function house(batch,s,u,size,roof='#5a6462'){
  const p=bankPoint(s,u),x=p.x,y=p.y,z=p.z;
  batch.put(geo.box,'#71634d',x,y+.29,z,size*3.1,.6,size*2.4);
  batch.put(geo.box,'#e4ceb0',x,y+size*1.18,z,size*2.9,size*1.9,size*2.3);
  for(const sign of [-1,1]){
    batch.put(geo.box,roof,x+sign*size*.82,y+size*2.39,z,size*1.99,size*.2,size*2.94,0,0,-sign*.44);
    for(let k=-1;k<=1;k++)batch.put(geo.box,'#6b5944',x+k*size*1.34,y+size*1.22,z+sign*size*1.17,.1,size*1.96,.1);
    batch.put(geo.box,'#536466',x+sign*size*.69,y+size*1.33,z+size*1.185,size*.65,size*.73,.05);
    batch.put(geo.box,'#c1ae8d',x+sign*size*.69,y+size*1.33,z+size*1.22,.055,size*.73,.05);
  }
  batch.put(geo.box,'#514f48',x,y+size*2.88,z,size*.23,.2,size*3);
}
function bridge(b,s){
  const r=S.river(s),x=S.baseX(s)+r,y=S.height(s)+.53,z=-s;
  for(let i=-8;i<=8;i++){
    const arc=.64*(1-(i/8)**2);b.put(geo.box,'#977b56',x+i*.56,y+arc,z,.55,.23,2.05,0,0,-i*.019);
    if(i%2===0)for(const side of [-1,1]){
      b.put(geo.box,'#9d5536',x+i*.56,y+arc+.61,z+side*.93,.13,1.28,.13);
      if(i<8)b.rod(V(x+i*.56,y+arc+1.11,z+side*.93),V(x+(i+2)*.56,y+.64*(1-((i+2)/8)**2)+1.11,z+side*.93),.082,'#a55232',geo.cylinder);
    }
  }
}
const strawMat=material(0xffffff,.96,0,{side:T.DoubleSide,vertexColors:true});
const strawTuft=(()=>{
  const b=new Batch(),r=S.random(771);for(let i=0;i<14;i++){const x=(r()-.5)*.43,z=(r()-.5)*.36,h=.27+r()*.38;
    b.rod(V(x,0,z),V(x*1.32,h,z*.93),.019,variance('#c4a469',.43,r));}
  return mergeTemplate(b);
})();
function makeChunk(id){
  const start=id*CHUNK, center=start+20, d=S.local(center),r=S.random((S.mod(id,60)+802)*1277),group=new T.Group(),b=new Batch(),trees=new Batch();
  const offsets=[-125,-76,-43,-28,-21,-16,-14,-12,-10,-8,-6,-4,-2,0,2,4,6,8,10,13,16,20,26,38,54,75,125];
  strip(group,17,offsets.length,(i,j)=>{
    const s=start+j*2.5,u=offsets[i],p=bankPoint(s,u),v=wave(u,s),sn=S.snow(s),village=S.local(s)>950&&S.local(s)<1480;
    let c=rgb(Math.abs(u-S.river(s))<3.5?'#7f8270':village?'#b3a467':u<-14?'#9c9d68':'#9c995d');
    c.lerp(rgb('#d5d9ce'),sn*(.88+.1*Math.sin(u*.64+s*.09))).multiplyScalar(1+v*.16);
    return [p.x,p.y,p.z,c];
  },landMat);
  if(d>1840&&d<2180){
    strip(group,21,8,(i,j)=>{const s=start+j*2,p=S.point(s),local=S.local(s),width=7*S.smooth(1850,1910,local)*(1-S.smooth(2100,2160,local)),u=-2.9-width*(i/7);
      return [p.x+u,p.y+.072,-s,rgb('#c7c7b8').multiplyScalar(1+wave(u,s)*.058)];},roadMat);
  }
  const roads=S.fork(center)>0||S.fork(start+39)>0||S.fork(start)>0?[-1,1]:[0];
  for(const route of roads){
    const cross=[-1,-.91,-.76,-.49,-.24,0,.25,.49,.76,.91,1];
    strip(group,21,cross.length,(i,j)=>{
      const s=start+j*2,p=S.point(s,route),f=cross[i],width=(3.33+.13*Math.sin(s*.13))*Math.sqrt(1+Math.tan(S.heading(s,route))**2);
      const gravel=S.local(s)>936&&S.local(s)<1560,sn=S.snow(s),wet=S.wetness(s,route);
      const pal=gravel?['#8d8b74','#b7ac93','#beb8a3','#cec6af','#c6bda4','#b9b197']:['#9f895f','#bc9e76','#d0b18b','#dfc09b','#d8b791','#cfac80'];
      const c=rgb(pal[Math.min(i,10-i)]).lerp(rgb('#e0e2d8'),sn*.91).lerp(rgb('#827e65'),wet*.74);
      c.multiplyScalar(1+.023*Math.sin(s*.32+f*3)+.018*Math.cos(s*.79+f*11));
      return [p.x+f*width,p.y+.085+.04*(1-f*f)+(route===1?.008:0),-s,c];
    },roadMat);
  }
  const water=strip(group,21,7,(i,j)=>{
    const s=start+j*2,rc=S.river(s),spread=2.65+.38*Math.sin(s*.123),v=(i-3)/3,u=rc+v*spread;
    const c=rgb(Math.abs(v)>.8?'#d4cfac':Math.abs(v)<.4?'#78a7aa':'#a8beb1');
    return [S.baseX(s)+u,S.height(s)-.65+.83*S.wetness(s,1)+.018*Math.sin(s*.8+u),-s,c];
  },waterMat);water.castShadow=false;
  const flood=start<0?S.wetness(center,0):Math.max(...[0,10,20,30,39].map(o=>S.wetness(start+o,-1)));
  if(flood>.01){
    const ford=strip(group,21,8,(i,j)=>{const s=start+j*2,p=S.point(s,-1),wet=S.wetness(s,-1);
      return [p.x+(i/7-.5)*9.4,p.y-.37+.57*wet,-s,Math.abs(i-3.5)>2?'#c1c6a6':'#87acaa'];},waterMat);ford.castShadow=false;
  }
  const streamMarks=new Batch();
  for(let k=0;k<48;k++){
    const s=start+r()*40,rc=S.river(s),u=rc+(r()-.5)*4.5;streamMarks.put(geo.pebble,variance('#c1d3be',.27,r),S.baseX(s)+u,S.height(s)-.62+.83*S.wetness(s,1),-s,.035+r()*.12,.008,.18+r()*.73,0,.22*Math.sin(s*.12),0);
  }
  const highlights=new T.Group();streamMarks.finish(highlights,waterFoam,false);group.add(highlights);
  for(let k=0;k<87;k++){
    const s=start+r()*40,rc=S.river(s),side=r()>.5?1:-1,u=rc+side*(1.8+r()*2.25),p=bankPoint(s,u),size=.11+(r()**2)*.74;
    b.put(geo.crown,variance(r()>.34?'#8e9180':'#a8a497',.33,r),p.x,Math.max(p.y,S.height(s)-.85),p.z,size*(1+r()),size*.61,size,r()*.4,r()*6,r()*.4);
  }
  // Low roadside plants and real leaf litter leave the driving line clear.
  for(let k=0;k<250;k++){
    const s=start+r()*40,side=r()<.5?-1:1,route=S.fork(s)>.1?(r()>.5?1:-1):0,rd=S.point(s,route),u=rd.x-S.baseX(s)+side*(3.2+r()**1.6*10.4),p=bankPoint(s,u);
    if(Math.abs(u-S.river(s))<2.3||S.tunnel(s)>.6)continue;
    const h=.15+r()*.36,sn=S.snow(s);
    for(let j=0;j<3;j++){b.put(geo.blade,sn>.6?'#bfbc9f':variance(r()>.45?'#919155':'#b1a568',.38,r),p.x+r()*.19,p.y,p.z+r()*.15,h,h*(1+r()),h, (r()-.5)*.8,r()*6,(r()-.5)*.85);}
  }
  for(let k=0;k<120;k++){
    const s=start+r()*40,route=S.fork(s)>.1?(r()>.5?1:-1):0,p=S.point(s,route),u=(r()>.5?1:-1)*(.35+r()**.36*2.89),sn=S.snow(s),gr=d>936&&d<1550;
    if(S.wetness(s,route)>.55)continue;
    const c=sn>.6?'#d6d9d0':gr?'#999581':['#b37b3f','#b68147','#c2924c','#9b784e'][k%4],sz=.025+r()*.058;
    b.put(gr?geo.pebble:geo.leaf,c,p.x+u,p.y+.134,-s,sz*(gr?1:.7),sz*.29,sz*1.35,.09,r()*TAU,0);
  }
  // Split-rail fencing follows the bank with bolted timber uprights.
  for(let k=0;k<10;k++){
    const s=start+k*4,side=d>300&&d<700?1:-1,u=side*(4.15+.17*Math.sin(s*.12)),route=side>0?1:0;
    if((S.mod(Math.floor(s/36),6)===3&&d>45)||S.wetness(s,-1)>.25||S.tunnel(s)>.05)continue;
    const p=S.point(s,route),h=p.y,xx=p.x+u;
    b.put(geo.box,'#786644',xx,h+.49,-s,.18,1.12,.19,0,.08*Math.sin(s),.028*Math.cos(s));
    b.put(geo.box,'#a18a60',xx,h+1.054,-s,.202,.065,.216);
    for(const y of [.43,.85]){const p2=S.point(s+4,route);b.rod(V(xx,h+y,-s),V(p2.x+u,p2.y+y,-s-4),.084,variance('#9a8259',.24,r),geo.log);}
  }
  const isVillage=d>953&&d<1490, tunnelZone=d>=776&&d<944;
  const treeSites=[];
  for(let k=0;k<21;k++){
    const side=k%3===0?-1:1,s=start+r()*40,u=side*(side<0?15+r()*24:7+r()**1.15*31);
    if((S.fork(s)>.05&&u>0&&u<16)||(isVillage&&Math.abs(u)<24)||tunnelZone&&Math.abs(u)<13||d>1860&&d<2110&&u<0)continue;
    treeSites.push([s,u]);
  }
  if(id===0)treeSites.push([3.5,7.8],[17.5,-15],[22,9.6]);
  for(const [s,u] of treeSites){
    const p=bankPoint(s,u), sn=S.snow(s),index=sn>.55?(r()>.2?6:5):r()<.18?5:Math.floor(r()*5),scale=.75+r()*.69;
    trees.put(treeGeos[index],variance('#ffffff',.12,r),p.x,p.y-.13,p.z,scale,scale*(.95+r()*.16),scale,0,r()*TAU,0);
  }
  // The forest beyond the creek is deliberately lower than the mountain skyline.
  for(let k=0;k<19;k++){
    const s=start+r()*40,u=(r()>.45?1:-1)*(39+r()*37),p=bankPoint(s,u),h=4+r()*7;
    b.put(geo.cone,variance(S.snow(s)>.5?'#869d95':'#65795a',.29,r),p.x,p.y+h*.43,-s,h*.22,h,h*.24,0,r()*5,0);
  }
  if(d===60||d===420||d===1100)bridge(b,start+11);
  if(isVillage){
    const stubble=new Batch();
    for(let j=0;j<12;j++)for(let k=0;k<8;k++){
      const s=start+1+j*3.31+r()*.34,u=8.7+k*1.65+r()*.2,p=bankPoint(s,u);
      stubble.put(strawTuft,'#ffffff',p.x,p.y-.05,p.z,1.15,1+r()*.35,1.21,0,r()*6,0);
    }
    stubble.finish(group,strawMat);
    if(id%2===0)house(b,center,13+r()*8,1.15+r()*.6);
    for(let k=0;k<6;k++){
      const s=start+4+k*6,u=9+r()*3;
      for(let j=0;j<8;j++){const p=bankPoint(s,u+j*1.35);b.put(geo.cone,'#b89b59',p.x,p.y+.24,p.z,.29,.64,.27,0,k*.7,0);}
    }
    for(let j=0;j<4;j++){
      const u=12+j*6,p=bankPoint(start,u),e=bankPoint(start+40,u);
      for(let k=0;k<10;k++){const s=start+k*4,st=bankPoint(s,u);b.put(geo.box,'#938970',st.x,st.y-.04,st.z,.5,.68,4.1,0,-S.heading(s,0),0);}
    }
  }
  if(d===60)house(b,start+28,-25,1.38,'#616761');
  if(d>1870&&d<2140){for(let k=0;k<5;k++){const s=start+k*8,p=S.point(s);b.put(geo.cylinder,'#8b8170',p.x-5.5,p.y+.56,-s,.19,1.17,.19);}}
  b.finish(group,worldMat);trees.finish(group,treeMat);
  group.userData={water,highlights,start};return group;
}
