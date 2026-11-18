'use strict';
const brass=material('#d3a345',.25,.67,{emissive:0xda8c27,emissiveIntensity:.34}), glint=material('#fff1b6',.32,.18,{emissive:0xffdb82,emissiveIntensity:1.05});
const granite=material('#807e6d',.96), timber=material('#836447',.86);
function mountains(){
  const group=new T.Group(),r=S.random(949);
  for(let layer=0;layer<4;layer++){
    const verts=[],cols=[],idx=[], n=288,steps=15,rad=185+135*layer,ox=r()*12,oz=r()*12;
    for(let j=0;j<=steps;j++)for(let i=0;i<=n;i++){
      const a=i*TAU/n,k=j/steps,x=Math.cos(a),z=Math.sin(a);
      const crest= .5+.16*Math.sin(5*a+ox)+.12*Math.sin(9*a+oz)+.09*Math.cos(15*a+ox)
                   +.05*Math.sin(29*a+oz)+.025*Math.cos(53*a);
      const erosion=Math.sin(a*44+Math.sin(a*12)*2+k*7)*Math.sin(k*PI)*.055;
      const h=(8+layer*11)+(crest+erosion)*(25+layer*16);
      const rr=rad*(.66+k*.47)+Math.sin(a*13+ox+k*5)*2.8;
      const y=-5+h*Math.pow(k,.87)+Math.sin(k*21+a*37)*1.05*k;
      verts.push(x*rr,y,z*rr);
      const c=rgb(['#74876b','#84948b','#8e9e9c','#9eafad'][layer]);
      const slope=.94+.12*Math.sin(a*12+ox+k*5)+.065*Math.sin(a*39+k*2)+.03*Math.sin(a*71+k);
      if(layer>1&&crest>.58&&k>.79)c.lerp(rgb('#c8c4ac'),Math.min(.8,(crest-.58)*2.9+k-.79));
      c.multiplyScalar(slope);cols.push(c.r,c.g,c.b);
      if(j<steps&&i<n){const h0=j*(n+1)+i;idx.push(h0,h0+n+2,h0+1,h0,h0+n+1,h0+n+2);}
    }
    const mesh=piece(group,meshData(verts,idx,cols),landMat,0,0,0);mesh.castShadow=false;mesh.receiveShadow=false;
  }
  return group;
}
function makeRing(){
  const g=new T.Group(),main=ring(g,2.18,.084,brass,0,1.97,0);ring(g,2.083,.014,glint,0,1.97,.017);
  ring(g,2.283,.018,brass,0,1.97,0);
  for(let i=0;i<24;i++){
    const a=i*TAU/24,r=2.185;piece(g,geo.box,i%3===0?glint:cream,Math.cos(a)*r,1.97+Math.sin(a)*r,.082,.028,i%3===0?.132:.072,.012,0,0,a-PI/2);
  }
  const sparks=[];
  for(let i=0;i<7;i++)sparks.push(piece(g,geo.pebble,glint,0,0,0,.034,.075,.034));
  g.userData={sparks,main};return g;
}
function portal(group,s){
  const p=S.point(s),g=new T.Group();g.position.set(p.x,p.y,-s);g.rotation.y=-S.heading(s,0);group.add(g);
  const batch=new Batch(),r=S.random(234),R=4.05;
  for(const side of [-1,1])for(let j=0;j<3;j++)batch.put(geo.box,variance('#929180',.26,r),side*(R+.36),.26+j*.50,0,.9,.46,.94);
  for(let j=0;j<17;j++){
    const a=(j+.5)*PI/17,rr=R+.33;
    batch.put(geo.box,variance('#999782',.34,r),rr*Math.cos(a),1.47+rr*Math.sin(a),0,.87,.82,1.04,0,0,a);
  }
  batch.finish(g,worldMat);
}
function tunnelSection(){
  const g=new T.Group(),pos=[],col=[],idx=[],rows=83,cols=21,r=S.random(999),lamps=[],b=new Batch();
  for(let j=0;j<rows;j++){
    const s=777+j*2,p=S.point(s),ang=S.heading(s,0);
    for(let i=0;i<cols;i++){const a=i*PI/(cols-1),u=4.23*Math.cos(a),y=1.42+4.23*Math.sin(a),c=variance(i%4===0?'#706f62':'#676a60',.17,r);
      pos.push(p.x+u*Math.cos(ang),p.y+y,-s+u*Math.sin(ang));col.push(c.r,c.g,c.b);
      if(i<cols-1&&j<rows-1){const t=j*cols+i;idx.push(t,t+1,t+cols,t+1,t+cols+1,t+cols);}
    }
    if(j%2===0){
      for(const side of [-1,1])b.put(geo.box,'#696b61',p.x+side*4.24*Math.cos(ang),p.y+.59,-s+side*4.24*Math.sin(ang),.48,1.75,4.9,0,-ang,0);
      if(j%6===0)for(let k=0;k<15;k++){
        const a=(k+.5)*PI/15,u=4.15*Math.cos(a);b.put(geo.box,variance('#838475',.17,r),p.x+u*Math.cos(ang),p.y+1.43+4.15*Math.sin(a),-s+u*Math.sin(ang),.22,.92,.32,0,-ang,a);
      }
    }
    if(j%8===2){const side=j%16===2?-1:1,mat=material('#f0d295',.26,.1,{emissive:0xffc574,emissiveIntensity:.88});
      const lamp=piece(g,geo.ball,mat,p.x+side*3.97*Math.cos(ang),p.y+2.19,-s+side*3.97*Math.sin(ang),.17,.27,.18);
      lamps.push([s,lamp]);}
  }
  piece(g,meshData(pos,idx,col),landMat,0,0,0);
  // Weathered earth above the masonry arch merges the bore into the hillside.
  strip(g,42,17,(i,j)=>{
    const s=777+j*4,p=S.point(s),ang=S.heading(s,0),u=(i-8)*1.8,h=1.4+Math.sqrt(Math.max(0,1-(u/14.45)**2))*(6.5+2*Math.sin(j*.12))+wave(u,s)*.55;
    return [p.x+u*Math.cos(ang),p.y+h,-s+u*Math.sin(ang),rgb('#92956f').multiplyScalar(1+wave(u,s)*.22)];
  },landMat,true);
  portal(g,777);portal(g,941);b.finish(g,worldMat);g.userData.lamps=lamps;return g;
}
function waterMill(){
  const group=new T.Group(),s=539,p=S.point(s,-1),b=new Batch(),u=Math.min(-13,S.river(s)-5.75);house(b,s,u-1.6,1.35,'#5c6461');b.finish(group,worldMat);
  const wheel=new T.Group();wheel.position.set(S.baseX(s)+u+1.0,p.y+1.54,-s+.36);
  const darkwood=material('#725034',.70),wetwood=material('#815f41',.42,.06);
  for(const side of [-1,1]){
    const hoop=ring(wheel,2.1,.095,wetwood,side*.4,0,0);hoop.rotation.y=PI/2;
    for(let i=0;i<10;i++){const a=i*TAU/10;strut(wheel,V(side*.4,0,0),V(side*.4,Math.cos(a)*2.07,Math.sin(a)*2.07),.065,darkwood);}
  }
  for(let i=0;i<18;i++){const a=i*TAU/18;piece(wheel,geo.box,wetwood,0,Math.cos(a)*2.05,Math.sin(a)*2.05,1.04,.12,.52,a,0,0);}
  piece(wheel,geo.cylinder,steel,0,0,0,.17,1.55,.17,0,0,PI/2);group.add(wheel);group.userData.wheel=wheel;return group;
}
function trailSign(){
  const g=new T.Group(),b=new Batch();
  b.put(geo.box,'#6a583d',0,.88,0,.16,1.9,.18);
  b.put(geo.cylinder,'#c2a76d',0,1.98,0,.55,.118,.55,PI/2);
  b.put(geo.cylinder,'#536958',0,1.98,.069,.503,.05,.503,PI/2);
  b.put(geo.leaf,'#e7ba66',0,1.99,.114,.31,.22,.37,PI/2,0,-.28);
  b.finish(g,worldMat);return g;
}
function familyCar(color){
  const g=new T.Group(),m=material(color,.35,.29),glass=material('#779494',.16,.48);
  loft(g,[[-1.40,.55,.68,.20],[-1.22,.73,.72,.26],[-.65,.82,.75,.28],[.8,.82,.75,.29],[1.33,.72,.72,.24],[1.43,.62,.72,.18]],m);
  loft(g,[[-.65,.68,1.02,.04],[-.38,.62,1.23,.23],[.50,.65,1.26,.24],[.89,.72,1.1,.10]],glass);
  piece(g,geo.ball,cream,.01,1.47,.08,.67,.106,.58);
  for(const z of [-.85,.9])for(const sign of [-1,1]){
    piece(g,geo.tire,rubber,sign*.762,.37,z,.32,.21,.32,0,0,PI/2);
    piece(g,geo.cylinder,chrome,sign*.88,.37,z,.167,.036,.167,0,0,PI/2);
  }
  for(const side of [-1,1])piece(g,geo.ball,tailRed,side*.54,.77,1.38,.108,.102,.055);
  piece(g,geo.box,chrome,0,.52,1.41,1.43,.1,.13);
  return g;
}
