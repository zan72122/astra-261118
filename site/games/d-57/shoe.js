'use strict';
const profile=[
[0,.008,.07],[.016,.138,.13],[.045,.218,.185],[.10,.276,.23],[.19,.309,.255],[.29,.317,.275],[.39,.307,.32],[.49,.28,.421],[.59,.25,.545],[.67,.234,.59],[.76,.234,.54],[.86,.245,.535],[.93,.218,.54],[.977,.145,.51],[.995,.065,.44],[1,.006,.38]];
function profileAt(u,k){u=sat(u);let j=1;while(j<profile.length-1&&profile[j][0]<u)j++;let a=profile[j-1],b=profile[j],f=(u-a[0])/(b[0]-a[0]);return a[k]+(b[k]-a[k])*f;}
const baseAt=u=>.106+.046*Math.exp(-u*15)+.031*sat((u-.4)*4);
function opening(u){return u>.629&&u<.967?.70*Math.pow(Math.max(0,Math.sin((u-.629)/.338*PI)),.60):0;}
function skin(u,v,e=0){
  const th=v*PI,w=profileAt(u,1),h=profileAt(u,2),cs=Math.cos(th),sn=Math.max(0,Math.sin(th));
  const wrinkle=.0034*Math.sin((u*32+.38*cs)*TAU)*Math.exp(-((u-.44)**2)/.009)*sn;
  return V((u-.5)*1.84,baseAt(u)+(h+e)*Math.pow(sn,.73)+wrinkle,.015*Math.sin(PI*2*u)+(w+e)*Math.sign(cs)*Math.pow(Math.abs(cs),.87));
}
function shoe(g,detailed=true){
  const root=group(g),parts=group(root);
  const hide=pbrBoth(standard(0x8c492e,.64,0,{map:hideTex,bumpMap:hideTex,bumpScale:.0028}));
  // The shader samples the same 12-by-4 leather cells as the contact solver, continuously across panel seams.
  const filmImage=new Uint8Array(12*4*4),field=new T.DataTexture(filmImage,12,4,T.RGBAFormat);field.magFilter=field.minFilter=T.LinearFilter;field.needsUpdate=true;
  hide.onBeforeCompile=sh=>{sh.uniforms.leatherState={value:field};
    sh.vertexShader='varying vec2 leatherUV;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n leatherUV=uv;');
    sh.fragmentShader='varying vec2 leatherUV; uniform sampler2D leatherState;\n'+sh.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n vec2 finish=texture2D(leatherState,leatherUV).rg;roughnessFactor=clamp(roughnessFactor-.40*finish.r-.085*finish.g,.13,.85);diffuseColor.rgb*=1.-.13*finish.g;');};
  const lining=pbrBoth(standard(0x704432,.89,0,{map:hideTex})),piping=standard(0x5b3324,.5),thread=standard(0xc3a382,.82),darkThread=standard(0x492e23,.79),welt=standard(0x875435,.62,0,{map:hideTex}),sole=standard(0x3b3029,.78),holes=standard(0x43271e,.85),lace=standard(0x4b352b,.71,0,{map:hideTex}),eye=standard(0x866945,.38,.65);
  function xy(u,s){return [(u-.5)*1.84, .015*Math.sin(TAU*u)+s*profileAt(u,1)];}
  function bottomLayer(lo,hi,y,h,extra,mat){
    let pts=[];for(let k=0;k<=72;k++){let u=lo+(hi-lo)*k/72,[x,z]=xy(u,1);pts.push(new T.Vector2(x,-z-extra));}
    for(let k=72;k>=0;k--){let u=lo+(hi-lo)*k/72,[x,z]=xy(u,-1);pts.push(new T.Vector2(x,-z+extra));}
    let geo=new T.ExtrudeGeometry(new T.Shape(pts),{depth:h,bevelEnabled:true,bevelSegments:3,bevelThickness:extra*.4,bevelSize:extra*.5,curveSegments:24});
    geo.rotateX(-PI/2);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){let u=pos.getX(i)/1.84+.5;pos.setY(i,pos.getY(i)+.038*Math.exp(-u*12)+(lo===0&&hi===1?.026*sat((u-.42)*4):0));}geo.computeVertexNormals();mesh(parts,geo,mat,0,y,0);}
  bottomLayer(0,1,.065,.039,.025,welt);bottomLayer(0,1,.046,.018,.023,sole);bottomLayer(0,.53,.026,.022,.019,sole);
  bottomLayer(.721,1,.003,.068,.012,sole);
  for(let s of [0,1]){
    const mapper=(u,b)=>{let a=Math.acos(opening(u))/PI;return s?1-a+a*b:a*b;};
    const upper=surface(parts,112,26,(u,b)=>skin(u,mapper(u,b)),hide), uv=upper.geometry.attributes.uv;
    for(let i=0;i<uv.count;i++){let u=uv.getX(i),b=uv.getY(i);uv.setXY(i,u,mapper(u,b));}
    const lip=[];for(let i=0;i<=52;i++){let u=.629+.338*i/52;lip.push(skin(u,mapper(u,s?0:1),.003));}line(parts,lip,.009,piping,false);
    surface(parts,45,7,(a,b)=>{let u=.629+.338*a,p=skin(u,mapper(u,s?0:1));p.z*=1-.2*b;p.x=(p.x-.55)*(1-.12*b)+.55;p.y-=b*.255;return p;},lining);
  }
  oval(parts,.542,.265,0,.305,.040,.174,standard(0x59382b,.9));
  // Waxed quarter panels and their cut edge run around both sides to the heel.
  function panelSeam(s,t){const u=.39+.60*t;let a=.40-.24*Math.sin(Math.min(1,t*1.7)*PI/2)+.07*sat((t-.65)*3);return skin(u,s?a:1-a,.003);}
  for(let side of [0,1]){
    const seam=Array.from({length:52},(_,i)=>panelSeam(side,i/51));line(parts,seam,.006,piping,false);
  }
  function toeSeam(v){return .254+.068*Math.cos(2*PI*(v-.5))-.056*Math.exp(-((v-.5)**2)/.004);}
  const seam=Array.from({length:63},(_,i)=>skin(toeSeam(i/62),i/62,.004));line(parts,seam,.0046,piping,false);
  // Fine welt stitching, punched brogue perforations and the toe medallion all follow the curved last.
  let stitchPoints=[],punchPoints=[];
  for(let s of [-1,1])for(let k=0;k<70;k++){let u=.013+.974*k/70,[x,z]=xy(u,s);stitchPoints.push([V(x,baseAt(u)-.006,z+s*.015),.010,.0024,.0031]);}
  for(let k=0;k<=57;k++){let v=.025+.95*k/57,u=toeSeam(v);punchPoints.push([skin(u-.016,v,.002),.005,.003,.005]);if(k%2===0)punchPoints.push([skin(u-.028,v,.002),.0035,.0025,.0035]);}
  for(let k=0;k<54;k++){let v=.025+.95*k/53;stitchPoints.push([skin(toeSeam(v)+.008,v,.006),.004,.002,.0045]);}
  for(let s of [-1,1])for(let k=0;k<24;k++){let t=k/23,u=.075+.114*t,v=.5+s*(.018+.12*Math.sin(t*PI)**1.1);punchPoints.push([skin(u,v,.003),.006,.003,.005]);}
  for(let k=0;k<11;k++)punchPoints.push([skin(.09+k*.007,.5,.003),.004,.0025,.004]);
  const stamp=(list,m)=>{const geo=new T.SphereGeometry(1,6,4);for(const [p,a,b,c] of list){let o=mesh(parts,geo,m,p.x,p.y,p.z);o.scale.set(a,b,c);}};
  if(detailed){stamp(stitchPoints,thread);stamp(punchPoints,holes);}
  // Five pairs of metal eyelets with round woven laces, a tied bow and two tipped tails.
  for(let s of [-1,1]){
    const arr=[];for(let i=0;i<=24;i++){let u=.408+.225*i/24;arr.push(skin(u,.5+s*.045,.009));}line(parts,arr,.007,piping,false);
    for(let i=0;i<5;i++){const u=.43+i*.040,p=skin(u,.5+s*.125,.012);let e=ring(parts,p.x,p.y,p.z,.019,.0047,eye);e.rotation.x=-PI/2+s*.43;
      let p2=skin(u+(i<4?.04:0),.5-s*.125,.014);const mid=skin((u+(p2.x/1.84+.5))/2,.5,.027+(s>0?.008:0));line(parts,[p,mid,p2],.009,lace,true,16);}
  }
  const knot=skin(.614,.5,.033);
  oval(parts,knot.x,knot.y,knot.z,.026,.02,.025,lace);
  for(let s of [-1,1]){
    const q=(a,b,c)=>V(knot.x+a,knot.y+b,knot.z+s*c);
    line(parts,[knot,q(.015,.048,.069),q(.08,.05,.125),q(.112,.027,.135),q(.105,.012,.085),q(.035,.014,.027),knot],.010,lace,true,30);
    const tip=q(-.062,-.051,.186);line(parts,[knot,q(-.058,.017,.06),q(-.089,-.003,.112),tip],.009,lace);line(parts,[tip,q(-.05,-.066,.199)],.008,eye);}
  batch(parts);
  function update(cells){cells.forEach((c,i)=>{filmImage[4*i]=Math.round(c.polish*255);filmImage[4*i+1]=Math.round(c.film*255);filmImage[4*i+3]=255;});field.needsUpdate=true;}
  return {root,parts,hide,update,field};
}
function makeCloth(parent){
  const root=group(parent),woven=texture(canvas(256,256,(c,w,h)=>{c.fillStyle='#b9c5b6';c.fillRect(0,0,w,h);
    for(let i of [13,19,25,230,236,242]){c.fillStyle='#597c78';c.fillRect(i,0,i%2?3:2,h);}
    for(let i=0;i<w;i+=2){c.fillStyle=i%4?'#ffffff29':'#37473b26';c.fillRect(i,0,1,h);c.fillRect(0,i,w,1);}
    for(let i=-w;i<w;i+=7){c.strokeStyle='#efefcf40';c.beginPath();c.moveTo(i,0);c.lineTo(i+w,h);c.stroke();}
  })),mat=pbrBoth(standard(0xe4e2cb,.94,0,{map:woven,bumpMap:woven,bumpScale:.0018}));
  const layers=[];
  for(let k=0;k<3;k++){let sheet=surface(root,30,24,(u,v)=>{
    const x=(u-.5)*(.59-k*.016),z=(v-.5)*.405;
    const y=.019+k*.021+.014*Math.sin(u*15+v*5+k*.5)+.014*Math.cos(v*9-u*8)+.024*(1-u)**4+.031*Math.exp(-((u-.78)**2)/.008);
    return V(x+.022*Math.sin(v*6+k)*v,y,z+.012*Math.sin(u*14+k));},mat);
    layers.push({sheet,base:sheet.geometry.attributes.position.array.slice()});}
  return {root,layers};
}
