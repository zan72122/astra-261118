'use strict';
const Surface=(()=>{
 const T=THREE,rand=winterRandom(17503);
 function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
 function tex(c,repeat=false){let t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;if(repeat)t.wrapS=t.wrapT=T.RepeatWrapping;return t}
 const grit=canvas(128,128),gc=grit.getContext('2d'),im=gc.createImageData(128,128);
 for(let i=0;i<im.data.length;i+=4){let a=221+rand()*34;im.data[i]=im.data[i+1]=im.data[i+2]=a;im.data[i+3]=255}gc.putImageData(im,0,0);
 const rough=tex(grit,true);rough.colorSpace=T.NoColorSpace;
 function mat(color,r=.65,m=0,opts={}){return new T.MeshStandardMaterial({color,roughness:r,metalness:m,roughnessMap:rough,...opts})}
 function timber(painted){
  let c=canvas(1024,128),g=c.getContext('2d');g.fillStyle=painted?'#9eafac':'#b99c75';g.fillRect(0,0,1024,128);
  for(let i=0;i<1900;i++){
   let y=rand()*128,x=rand()*1070-45,L=4+rand()**2*460;
   g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+L*.35,y-2.6*rand(),x+L*.72,y+rand()*2.7,x+L,y+.5);
   g.strokeStyle=rand()>.55?'rgba(250,233,201,'+(.035+rand()*.18)+')':'rgba(44,48,49,'+(.035+rand()*.17)+')';g.lineWidth=.28+rand()*1.3;g.stroke();
  }return tex(c,true)
 }
 // The ice patterns are grown onto the glass material; all objects seen through it are meshes.
 function frost(aspect){
  const h=1320,w=Math.max(560,Math.min(2048,Math.round(h*aspect))),c=canvas(w,h),g=c.getContext('2d'),m=g.createImageData(w,h);
  const lattices=[5,13,31,86,244].map(sz=>({sz,a:Float32Array.from({length:(sz+1)*(sz+1)},rand)}));
  function noise(x,y,l){let n=l.sz,xs=x*n,ys=y*n,i=xs|0,j=ys|0,fx=xs-i,fy=ys-j;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);let k=j*(n+1)+i,b=l.a;return (b[k]*(1-fx)+b[k+1]*fx)*(1-fy)+(b[k+n+1]*(1-fx)+b[k+n+2]*fx)*fy}
  for(let j=0,k=0;j<h;j++)for(let i=0;i<w;i++,k+=4){
   let x=i/w,y=j/h,v=noise(x,y,lattices[0]),q=noise(x,y,lattices[1]),n=noise(x,y,lattices[2]),s=noise(x,y,lattices[3]),f=noise(x,y,lattices[4]);
   let light=Math.exp(-((x-.79)**2*3.8+(y-.14)**2*5.4)),rim=Math.min(1,Math.min(x,1-x)*11,Math.min(y,1-y)*10);
   let center=Math.exp(-(((x-.48)*aspect)**2+(y-.46)**2)*17);
   let field=(v-.5)*31+(q-.5)*19+(n-.5)*10+(s-.5)*7+(f-.5)*4+(rand()-.5)*7+(1-rim)*17-center*24;
   m.data[k]=125+light*70+field;m.data[k+1]=161+light*39+field;m.data[k+2]=179+light*23+field;m.data[k+3]=255;
  }g.putImageData(m,0,0);
  // Each feather has curved spines, paired angular barbs and shorter crystalline side branches.
  function feather(x,y,len,angle,bend,scale,alpha){
   const step=len/32,dark=rand()>.83;
   g.lineCap='round';
   const ink=(a)=>dark?'rgba(75,113,138,'+a+')':'rgba(243,253,255,'+a+')';
   let xx=x,yy=y;
   for(let j=0;j<32;j++){
    let t=j/32,a=angle+bend*t,dx=Math.cos(a),dy=Math.sin(a);
    let nx=xx+dx*step,ny=yy+dy*step;
    g.beginPath();g.moveTo(xx,yy);g.lineTo(nx,ny);g.strokeStyle=ink(alpha*(.55+.4*(1-t)));g.lineWidth=(.65+(1-t)*1.7)*scale;g.stroke();
    for(let side of [-1,1]){
     let A=a+side*(.61+.25*rand()),L=len*(.048+.205*Math.sin(Math.PI*(t*.93+.04)))*(1-t*.55)*(.63+rand()*.56);
     let vx=Math.cos(A),vy=Math.sin(A),ex=xx+L*vx,ey=yy+L*vy;
     g.beginPath();g.moveTo(xx,yy);g.lineTo(ex,ey);g.strokeStyle=ink(alpha*(.55+rand()*.38));g.lineWidth=(.45+scale*.6);g.stroke();
     for(let b=1;b<9;b++){let u=b/10,la=L*(1-u)*(.19+rand()*.12),aa=A+side*.67;g.beginPath();g.moveTo(xx+vx*L*u,yy+vy*L*u);g.lineTo(xx+vx*L*u+Math.cos(aa)*la,yy+vy*L*u+Math.sin(aa)*la);g.lineWidth=.3+scale*.29;g.strokeStyle=ink(alpha*.89);g.stroke()}
    } xx=nx;yy=ny;
   }
  }
  const unit=Math.min(w,h);
  // Large fans curl inward from the cold glazing beads.
  const fans=[[-.01,.98,-.82],[.13,1.03,-1.2],[1.04,.97,-2.25],[1.02,.72,-2.65],[-.03,.63,-.5],[.01,-.02,1.12],[.91,-.04,2.02],[.45,1.02,-1.63]];
  for(const [x,y,a] of fans)for(let k=0;k<13;k++){
   feather((x+(rand()-.5)*.12)*w,(y+(rand()-.5)*.055)*h,(.14+rand()*.29)*unit,a+(rand()-.5)*1.65,(rand()-.45)*.82,.62+rand()*.6,.22+rand()*.48);
  }
  for(let i=0;i<390;i++){
   let x=rand(),y=rand(),edge=Math.min(x,1-x,y,1-y);
   if(edge>.17&&rand()>.2)continue;
   feather(x*w,y*h,(.012+rand()**2*.078)*unit,rand()*6.28,(rand()-.5)*.4,.4,.12+.32*rand());
  }
  // Recrystallised needles frame the warm breathing hole at the same physical radius as its thermal boundary.
  const pw=aspect*1.62,aperture=Math.min(.201,pw*.193);
  for(let i=0;i<92;i++){
   let a=rand()*Math.PI*2,edge=aperture*(1+.085*Math.sin(3*a+.44)+.048*Math.sin(5*a))*(1.03+.3*rand());
   let x=(.48+Math.cos(a)*edge/pw)*w,y=(.455-Math.sin(a)*edge/(1.62*1.15))*h;
   feather(x,y,(.012+.04*rand()**2)*h,-a+(rand()-.5)*1.5,(rand()-.5)*.4,.46,.23+rand()*.4);
  }
  // Plate crystals are sparse amongst the broader feather ice.
  for(const [u,v,size] of [[.18,.28,.039],[.75,.48,.025],[.81,.21,.045],[.27,.76,.036],[.61,.12,.022],[.89,.78,.029]]){
   const a=rand()*.8;
   for(let arm=0;arm<6;arm++)feather(u*w,v*h,size*unit*(.87+rand()*.16),a+arm*Math.PI/3,(rand()-.5)*.10,.53,.46);
  }
  // Thin facets and glints have fixed locations in the crystalline coating.
  for(let i=0;i<Math.floor(w*h/100);i++){
   const x=rand()*w,y=rand()*h,s=.32+rand()**5*2.0;g.fillStyle='rgba(247,253,255,'+(.15+rand()*.5)+')';g.fillRect(x,y,s,s*.7);
   if(s>2.21&&rand()<.15){g.beginPath();g.moveTo(x-3.3,y+1);g.lineTo(x+3.3,y-1);g.moveTo(x-.8,y-2.8);g.lineTo(x+.8,y+2.8);g.lineWidth=.65;g.strokeStyle='rgba(250,255,255,.59)';g.stroke()}
  }
  return tex(c)
 }
 function environment(){
  // Procedural radiance of the blue sky, bright opening and warm timber floor.
  let c=canvas(256,128),g=c.getContext('2d'),grad=g.createLinearGradient(0,0,0,128);grad.addColorStop(0,'#9bbacc');grad.addColorStop(.48,'#e8ede1');grad.addColorStop(.55,'#7b8581');grad.addColorStop(1,'#5e5148');g.fillStyle=grad;g.fillRect(0,0,256,128);g.fillStyle='#fff5d9';g.fillRect(125,23,52,42);g.fillStyle='#566565';g.fillRect(38,44,36,41);
  let t=tex(c);t.mapping=T.EquirectangularReflectionMapping;return t;
 }
 return {mat,tex,rough,timber,frost,canvas,environment}
})();
