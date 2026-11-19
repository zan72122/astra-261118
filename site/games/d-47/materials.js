'use strict';
const Loom=(()=>{
  const T=THREE;
  let seed=65293;function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function sheet(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c.getContext('2d');}
  function texture(ctx,srgb=true){const t=new T.CanvasTexture(ctx.canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(srgb)t.colorSpace=T.SRGBColorSpace;return t;}
  const roughCtx=sheet(128), roughPixels=roughCtx.createImageData(128,128);
  for(let i=0;i<roughPixels.data.length;i+=4){let v=229+rng()*26;roughPixels.data.set([v,v,v,255],i);}
  roughCtx.putImageData(roughPixels,0,0);const rough=texture(roughCtx,false);
  function mat(color,opts={}){return new T.MeshStandardMaterial({color,roughness:.87,roughnessMap:rough,...opts});}
  function grain(ctx,n=18000){for(let i=0;i<n;i++){ctx.fillStyle=rng()>.5?'rgba(247,237,211,.13)':'rgba(31,44,49,.10)';ctx.fillRect(rng()*ctx.canvas.width,rng()*ctx.canvas.height,.5+rng()*2,1);}}
  function wood(){const c=sheet(768,128);c.fillStyle='#ca9b68';c.fillRect(0,0,768,128);
    for(let i=0;i<380;i++){const y=rng()*130,f=rng()*9,amp=rng()*2;c.beginPath();c.moveTo(0,y);for(let x=0;x<=768;x+=8)c.lineTo(x,y+amp*Math.sin(x/768*Math.PI*2+f)+.45*Math.sin(x/768*Math.PI*6+f));c.strokeStyle=rng()>.37?'rgba(100,63,34,'+(.03+rng()*.17)+')':'rgba(255,238,195,.27)';c.lineWidth=.4+rng()*1.6;c.stroke();}grain(c,6500);return texture(c);}
  const woodMap=wood();
  function tatami(){const c=sheet(512);c.fillStyle='#b9b88b';c.fillRect(0,0,512,512);
    for(let i=0;i<128;i++){const l=58+rng()*14;c.fillStyle='hsl('+(52+rng()*7)+' 24% '+l+'%)';c.fillRect(0,i*4,512,3.6);c.fillStyle='#e5dcb05e';c.fillRect(0,i*4,512,1);for(let x=0;x<512;x+=16){c.fillStyle='rgba(65,74,42,'+(.09+rng()*.13)+')';c.fillRect(x+(i%2)*8,i*4,1,3);}}grain(c,9000);return texture(c);}
  const matMap=tatami();matMap.repeat.set(1.7,2.8);
  function wave(c,x,y,r,ink){c.strokeStyle=ink;c.lineWidth=1.55;for(let j=1;j<=4;j++){c.beginPath();c.arc(x,y,r*j/4,Math.PI,Math.PI*2);c.stroke();}}
  function blossom(c,x,y,size,a,col){c.save();c.translate(x,y);c.rotate(a);c.fillStyle=col;
    for(let k=0;k<5;k++){c.rotate(Math.PI*2/5);c.beginPath();c.moveTo(0,-1);c.bezierCurveTo(-size*.55,-size*.27,-size*.47,-size*.77,-size*.15,-size);c.lineTo(0,-size*.83);c.lineTo(size*.15,-size);c.bezierCurveTo(size*.52,-size*.77,size*.46,-size*.27,0,-1);c.fill();}
    c.fillStyle='#d2b981';c.beginPath();c.arc(0,0,Math.max(1,size*.145),0,Math.PI*2);c.fill();c.restore();}
  function quilts(mode){
    const c=sheet(1024,768), dark=mode==='blue',cream=mode==='linen';c.fillStyle=dark?'#314e67':cream?'#e7e3cd':'#9eb0b3';c.fillRect(0,0,1024,768);
    if(dark){
      // Katazome panels, framed with a narrow stitched double border.
      for(let i=0;i<4;i++)for(let j=0;j<3;j++){
        const x=40+i*236,y=39+j*230;
        c.save();c.beginPath();c.rect(x,y,236,230);c.clip();c.fillStyle=['#35556e','#2e4b65','#3e5c71','#345267'][(i*3+j*2)%4];c.fillRect(x,y,237,230);
        if((i+2*j)%4===0){for(let b=0;b<10;b++)for(let a=-1;a<6;a++)wave(c,x+a*62+(b%2)*31,y+b*18,31,'#91a6ad80');}
        else if((i+j)%4===1){c.strokeStyle='#8da8b06b';c.lineWidth=1.5;const r=30,hh=26;for(let b=-1;b<7;b++)for(let a=-1;a<7;a++){let cx=x+a*3*r+(b%2)*r*1.5,cy=y+b*hh;c.beginPath();for(let k=0;k<6;k++){let xx=cx+r*Math.cos(k*Math.PI/3),yy=cy+r*Math.sin(k*Math.PI/3);c.moveTo(cx,cy);c.lineTo(xx,yy);c.lineTo(cx+r*Math.cos((k+1)*Math.PI/3),cy+r*Math.sin((k+1)*Math.PI/3));}c.stroke();}}
        else{for(let k=0;k<8;k++){let bx=x+25+rng()*187,by=y+23+rng()*183;blossom(c,bx,by,7+rng()*14,rng()*6,k%3?'#c8cec0':'#99b0b1');if(k%3===0)blossom(c,bx+17,by-21,6,.4,'#d5d6c4');}}
        c.restore();c.setLineDash([4,5]);c.lineWidth=1.4;c.strokeStyle='#d1d3bd8c';c.strokeRect(x+3,y+3,230,224);c.setLineDash([]);
      }
      c.strokeStyle='#b8c5c3';c.lineWidth=3;c.strokeRect(26,24,972,719);c.lineWidth=1.3;c.strokeRect(19,17,986,733);
    }else if(!cream){for(let y=0;y<768;y+=25)for(let x=-1;x<22;x++)wave(c,x*55+(Math.floor(y/25)%2)*27.5,y,27.5,'#e1e2cb9e');}
    for(let i=0;i<768;i+=3){c.fillStyle='rgba(222,220,200,.042)';c.fillRect(0,i,1024,1);}
    for(let i=0;i<1024;i+=3){c.fillStyle='rgba(30,43,53,.039)';c.fillRect(i,0,1,768);}grain(c,41000);
    return texture(c);
  }
  return {mat,rng,rough,woodMap,matMap,quilts,wood:(color='#ffffff')=>mat(color,{map:woodMap,roughness:.66}),texture,sheet};
})();
