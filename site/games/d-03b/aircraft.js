'use strict';
function buildAircraft(G) {
  const T=THREE,{mat,mesh,ellipsoid,box,rod,group,geometry}=G;
  const ivory=mat(0xf5f2e5,.32,.17),seal=mat(0x343f40,.38,.41),red=mat(0xbb3f32,.35,.19);
  const body=group(), glass=mat(0x314f5c,.12,.66), alloy=mat(0xa7a9a0,.25,.82);
  function hull(parent,rings,material) {
    const p=[],idx=[],n=32;
    for(const [z,rx,ry,cy] of rings)for(let j=0;j<n;j++){const a=j/n*2*Math.PI;p.push(rx*Math.cos(a),cy+ry*Math.sin(a),z)}
    for(let i=1;i<rings.length;i++)for(let j=0;j<n;j++){const a=(i-1)*n+j,b=(i-1)*n+(j+1)%n;idx.push(a,b,a+n,b,b+n,a+n)}
    return mesh(parent,geometry(p,idx),material);
  }
  hull(body,[[-4.25,.025,.035,.02],[-4.12,.30,.28,.02],[-3.8,.48,.44,.01],[-3.1,.58,.57,0],[-2,.61,.62,.015],[-.7,.57,.58,.02],[.4,.47,.45,.05],[1.7,.31,.30,.11],[3.6,.17,.19,.18],[5,.11,.14,.23],[5.42,.045,.07,.25]],ivory);
  const canopy=[[-3.73,.015,.025,.29],[-3.47,.32,.19,.32],[-3.02,.46,.35,.37],[-2.40,.516,.45,.39],[-1.8,.515,.47,.4],[-1.17,.47,.36,.42],[-.67,.35,.22,.42],[-.39,.03,.035,.42]];
  hull(body,canopy,glass);
  function arch(z,rx,ry,cy,r,m){let prev=null;for(let i=0;i<=20;i++){const a=Math.PI*i/20,cur=[rx*Math.cos(a),cy+ry*Math.sin(a),z];if(prev)rod(body,prev,cur,r,m);prev=cur}}
  arch(-1.79,.522,.476,.403,.026,ivory);arch(-2.98,.466,.366,.372,.014,alloy);
  for(const side of [-1,1]){for(let i=1;i<canopy.length;i++){let a=canopy[i-1],b=canopy[i];rod(body,[side*a[1],a[3],a[0]],[side*b[1],b[3],b[0]],.023,ivory)}}
  function foil(parent,side,sections,tail=false) {
    const p=[],c=[],idx=[],segments=[0,.045,.14,.32,.60,.73,.742,.84,1],m=segments.length;
    const white=new T.Color(0xf6f3e8),scarlet=new T.Color(0xca4939),pale=new T.Color(0xc8c9be);
    for(let i=0;i<sections.length-1;i++)for(let k=0;k<m-1;k++)for(let face=0;face<2;face++){
      const vert=(s,u)=>{const [x,lead,chord,y]=s,th=(.005+.105*Math.sin(Math.pow(u,.62)*Math.PI))*chord;
        return [x*side,y+(face?-.38:.64)*th,lead+chord*u]};
      const col=(sections[i][0]>=(tail?1.65:6.92)&&sections[i][0]<(tail?1.82:7.26))||(!tail&&sections[i][0]>=7.89)?scarlet:
        (k===5&&sections[i][0]>.8?pale:white);
      const base=p.length/3;for(const v of [vert(sections[i],segments[k]),vert(sections[i+1],segments[k]),vert(sections[i+1],segments[k+1]),vert(sections[i],segments[k+1])]){p.push(...v);c.push(col.r,col.g,col.b)}
      idx.push(base,base+2,base+1,base,base+3,base+2);
    }
    const geo=geometry(p,idx,c);mesh(parent,geo,mat(0xffffff,.36,.17,true));
  }
  const wing=[[.26,-1.28,1.89,.06],[1.2,-1.32,1.86,.09],[4.5,-1.15,1.27,.28],[6.92,-.92,.83,.47],[7.13,-.89,.78,.49],[7.26,-.86,.75,.5],[7.89,-.75,.55,.56],[8.18,-.69,.38,.65],[8.37,-.58,.19,.82],[8.40,-.50,.065,.87]];
  // T-tail and a moulded, swept vertical stabilizer.
  const profile=[[3.47,.2],[4.34,1.21],[4.87,2.02],[5.31,2.07],[5.37,1.94],[5.25,.49],[5.39,.2]];
  const finpos=[],finidx=[];for(const side of [-1,1])for(const [z,y] of profile)finpos.push(.077*side,y,z);
  for(let i=1;i<profile.length-1;i++)finidx.push(0,i,i+1,7,7+i+1,7+i);
  for(let i=0;i<7;i++)finidx.push(i,(i+1)%7,i+7,(i+1)%7,(i+1)%7+7,i+7);
  mesh(body,geometry(finpos,finidx),ivory);
  for(const side of [-1,1]){
    foil(body,side,wing);foil(body,side,[[0,4.27,.96,1.99],[.8,4.39,.83,2],[1.65,4.59,.55,2.01],[1.82,4.64,.49,2.02],[2.12,4.73,.24,2.04],[2.17,4.8,.08,2.04]],true);
    mesh(body,geometry([[.079*side,1.62,4.61],[.079*side,1.89,4.79],[.079*side,1.80,5.33],[.079*side,1.54,5.32]].flat(),[0,1,2,0,2,3]),red);
    rod(body,[side*.13,.17,3.4],[side*.23,.22,2.27],.017,red);
  }
  ellipsoid(body,[0,-.52,-.6],[.15,.24,.26],seal);
  return body;
}
function buildBalloons(G,sim) {
  const T=THREE,{mat,mesh,group,ellipsoid,box,rod,geometry}=G;
  const sets=[
    [0xc65039,0xe7895d,0xffe4bc,0x96412d],
    [0x406f7c,0x87aeb2,0xf4e4bf,0x35596d],
    [0xde9b3f,0xf4c477,0xffe8ba,0x9c593a],
    [0xce7964,0xe5a887,0xf6d9b0,0x92755f],
    [0x73998e,0x9eb6a5,0xfbe4bc,0x417d77]
  ];
  const fabric=mat(0xffffff,.89,0,true),wicker=mat(0xa07848,.89),rim=mat(0x64462e,.78),twine=mat(0x695c48,.86),burner=mat(0x505354,.35,.72);
  const profile=[[0,-1.42],[.181,-1.42],[.207,-1.3],[.275,-1.12],[.49,-.843],[.69,-.605],[.861,-.342],[.98,-.035],[1,.228],[.958,.476],[.824,.73],[.626,.91],[.39,1.025],[.16,1.083],[.014,1.086]];
  return sim.model.balloons.map((d,i)=>{
    const pivot=group(),envelope=group(pivot),basket=group(pivot),pal=sets[d.style].map(v=>new T.Color(v));
    pivot.position.set(d.x,d.y,-d.s);const r=d.r,p=[],colors=[],idx=[],n=24,steps=6;
    const surface=(a,rad,h)=>{let lobe=.979+.024*Math.pow(Math.max(0,Math.sin((a/2/Math.PI*n%1)*Math.PI)),.67);return [rad*r*Math.cos(a)*lobe,h*r,rad*r*Math.sin(a)*lobe]};
    for(let j=0;j<profile.length-1;j++)for(let k=0;k<n*steps;k++){
      const gore=Math.floor(k/steps),which=gore%6,band=j<3||j===12;
      let shade;
      if(d.style===0)shade=(which===0||which===1)?2:which===2?1:0;
      else if(d.style===1)shade=(gore%4===0||gore%4===1)?0:gore%4===2?1:2;
      else shade=gore%4<2?0:gore%4===2?1:2;
      if(j<2)shade=3;else if(band)shade=which<2?1:0;
      const base=p.length/3;
      for(const [kk,jj] of [[k,j],[k+1,j],[k+1,j+1],[k,j+1]]){
        const a=kk/(n*steps)*Math.PI*2,rv=profile[jj];
        p.push(...surface(a,rv[0],rv[1]));
        const seam=kk%steps===0?.84:1, panel=.96+.045*FlightWorld.hash(gore,j);
        const col=pal[shade];colors.push(col.r*seam*panel,col.g*seam*panel,col.b*seam*panel);
      }idx.push(base,base+2,base+1,base,base+3,base+2);
    }
    const shell=mesh(envelope,geometry(p,idx,colors),fabric);shell.userData.target=i;
    const by=-1.81*r;basket.position.y=-1.32*r;
    const basketY=by-basket.position.y;
    box(basket,[0,basketY,0],[r*.295,r*.21,r*.235],wicker);
    for(const sy of [-1,1]){
      box(basket,[0,basketY+sy*r*.092,0],[r*.315,r*.031,r*.255],rim);
      for(const sz of [-1,1]){
        rod(basket,[sy*r*.136,basketY+r*.1,sz*r*.103],[sy*r*.155,.015,sz*r*.12],r*.009,twine);
        rod(envelope,[sy*r*.165,-1.37*r,sz*r*.123],[sy*r*.28,-1.07*r,sz*r*.18],r*.005,twine);
      }
    }
    for(let j=0;j<4;j++)box(basket,[0,basketY+(j-1.5)*r*.04,0],[r*.303,r*.009,r*.241],rim);
    box(basket,[0,-r*.19,0],[r*.11,r*.096,r*.087],burner);
    const fireMat=mat(0xffb85b,.4);fireMat.emissive.setHex(0xff7c21);
    const fire=ellipsoid(basket,[0,-.12*r,0],[.044*r,.12*r,.045*r],fireMat);
    return {pivot,envelope,basket,fire,fireMat,shell};
  });
}
