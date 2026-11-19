'use strict'
const Art = (() => {
  const T=THREE, size=256
  let seed=781
  const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
  function canvas(n=size) {const c=document.createElement('canvas');c.width=c.height=n;return c}
  function texture(c,color=true){
    const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping
    if(color)t.colorSpace=T.SRGBColorSpace
    t.anisotropy=4;return t
  }
  function noise(base,amount,kind) {
    const c=canvas(),g=c.getContext('2d'),im=g.createImageData(size,size)
    const rows=Array.from({length:size},()=>rnd()*2-1)
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x/size,v=y/size, a=Math.sin(u*Math.PI*2),b=Math.cos(v*6.283)
      let n=(rnd()-.5)*amount
      if(kind==='wood'){
        const ring=v*19+.47*Math.sin(u*6.283)+.24*Math.sin(u*12.566+v*6.283)
        n+=Math.sin(ring*6.283)*3.4+Math.pow(.5+.5*Math.sin(ring*12.566),8)*-8+4*rows[y]+1.7*a*b
      }else if(kind==='stone'){n+=5*Math.sin(a*2.4+b*3.5)+4*Math.cos(18*u+3*b)+3*Math.sin(8*a+3*b)}
      else n+=1.8*a*b+1.4*Math.sin(a*3+b*2)
      const i=(y*size+x)*4
      for(let k=0;k<3;k++)im.data[i+k]=base[k]+n
      im.data[i+3]=255
    }
    g.putImageData(im,0,0)
    if(kind==='stone'){
      for(let i=0;i<360;i++){g.fillStyle=rnd()>.4?'rgba(255,251,235,.25)':'rgba(47,40,48,.13)';g.beginPath();g.ellipse(rnd()*size,rnd()*size,.3+rnd()*1.8,.3+rnd(),rnd()*3,0,7);g.fill()}
    }
    return c
  }
  const rough=texture(noise([219,219,219],20,'stone'),false)
  function mat(color,roughness=.68,other={}) {
    return new T.MeshStandardMaterial({color,roughness,roughnessMap:rough,metalness:0,...other})
  }
  function surface(base,amount,kind,r,extra={}) {
    const map=texture(noise(base,amount,kind))
    return mat(0xffffff,r,{map,bumpMap:map,bumpScale:kind==='wood'?.0008:.0005,...extra})
  }
  // Pigments are painted into the glaze. The body, bevel and thickness are modelled separately.
  function leaf(g,x,y,rot,len,width,color) {
    g.save();g.translate(x,y);g.rotate(rot);g.fillStyle=color;g.beginPath()
    g.moveTo(0,0);g.bezierCurveTo(-width,-len*.32,-width*.66,-len*.70,0,-len)
    g.bezierCurveTo(width*.85,-len*.72,width,-len*.24,0,0);g.fill();g.restore()
  }
  function flower(g,x,y,r,colors) {
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4
      leaf(g,x,y,a,r*(j%2?.76:1),r*(j%2?.13:.21),colors[j%2])
      leaf(g,x+Math.sin(a)*r*.21,y-Math.cos(a)*r*.21,a,r*.49,r*.039,'#ead9c3')
    }
    g.fillStyle='#b58d53';g.beginPath();g.arc(x,y,r*.14,0,7);g.fill()
    g.fillStyle='#655262';g.beginPath();g.arc(x,y,r*.064,0,7);g.fill()
  }
  function paintedTile(variant) {
    const c=noise([232+variant*2,223+variant*2,203+variant*2],6,'clay'),g=c.getContext('2d')
    const colors=['#826887','#a390a8']
    for(let j=0;j<4;j++){
      g.save();g.translate(128,128);g.rotate(j*Math.PI/2);g.translate(-128,-128)
      g.strokeStyle='#ac98a4';g.lineWidth=2.2
      g.beginPath();g.moveTo(14,65);g.lineTo(14,14);g.lineTo(65,14);g.stroke()
      leaf(g,19,19,.75*Math.PI,29,6,colors[0]);leaf(g,24,16,Math.PI/2,26,4,'#949a80')
      leaf(g,16,24,Math.PI,26,4,'#949a80')
      g.fillStyle='#b69a6b';g.beginPath();g.arc(43,43,2.5,0,7);g.fill()
      if(variant===0){
        g.strokeStyle='#a3919f';g.lineWidth=2.6;g.beginPath();g.moveTo(89,21);g.quadraticCurveTo(108,35,128,22);g.quadraticCurveTo(148,35,167,21);g.stroke()
        leaf(g,128,22,Math.PI,18,4,'#8d788e')
      }
      g.restore()
    }
    if(variant===0){
      g.save();g.translate(128,128);g.rotate(Math.PI/4);g.lineWidth=2;g.strokeStyle='#b4a389';g.strokeRect(-56,-56,112,112);g.restore()
      flower(g,128,128,57,colors)
      for(let i=0;i<4;i++){let a=i*Math.PI/2;leaf(g,128+Math.sin(a)*82,128-Math.cos(a)*82,a,13,3,'#ac9368')}
    }else if(variant===1){flower(g,128,128,22,['#b1a0ae','#bab59e'])}
    else{g.fillStyle='#b3a594';g.beginPath();g.moveTo(128,122);g.lineTo(134,128);g.lineTo(128,134);g.lineTo(122,128);g.fill()}
    const map=texture(c)
    return mat(0xffffff,.32,{map,bumpMap:map,bumpScale:.00025,envMapIntensity:.67})
  }
  function environment(renderer) {
    const c=canvas(512);c.height=256
    const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256)
    gr.addColorStop(0,'#d7dfee');gr.addColorStop(.44,'#f6e9d2');gr.addColorStop(.60,'#ac999e');gr.addColorStop(1,'#756477')
    g.fillStyle=gr;g.fillRect(0,0,512,256)
    g.fillStyle='#fff8de'
    for(let i=0;i<3;i++)for(let j=0;j<2;j++)g.fillRect(70+i*18,63+j*24,15,21)
    g.fillStyle='#534556';g.fillRect(280,86,50,65)
    const t=texture(c);t.mapping=T.EquirectangularReflectionMapping
    const gen=new T.PMREMGenerator(renderer),out=gen.fromEquirectangular(t);gen.dispose();t.dispose();return out.texture
  }
  const p={
    cream:surface([226,211,185],9,'clay',.85),ivory:mat('#f2e7d1'),trim:mat('#e0ccb0'),
    gold:mat('#c59c60',.32,{metalness:.55}),goldLight:mat('#e2c694',.35,{metalness:.4}),
    dark:mat('#4e3c4d'),plum:surface([112,83,105],6,'wood',.55),panel:mat('#92768c',.54),
    plumLight:mat('#b09baa'),base:surface([98,70,86],9,'wood',.51),
    oak:surface([164,120,85],12,'wood',.58),oakLight:surface([200,157,114],12,'wood',.54),
    deepWood:surface([105,74,64],10,'wood',.66), bed:surface([164,140,120],18,'stone',.96),
    mortar:mat('#cdc2ad',.9),body:mat('#daccb3',.55),porcelain:[0,1,2].map(paintedTile),
    woodTiles:[[180,136,94],[167,122,83],[195,152,108],[176,132,101]].map(b=>surface(b,14,'wood',.52)),
    stoneTiles:[[156,155,153],[167,162,157],[148,150,153],[177,174,168]].map(b=>surface(b,21,'stone',.69)),
    green:mat('#818c70'),greenDark:mat('#576e5d'),greenPale:mat('#abb492'),twig:mat('#796958'),
    lilac:[mat('#96769f'),mat('#b598bd'),mat('#c8aece'),mat('#80678d'),mat('#cfb6d2')],
    glass:mat('#c3d3d4',.11,{metalness:.14,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide}),
    water:mat('#93bbbe',.11,{metalness:.37}),sky:mat('#aecbd2',.92),
    clay:surface([177,131,123],10,'clay',.7),soil:mat('#5d5047'),
    amber:mat('#e6c085',.36,{emissive:0xd99650,emissiveIntensity:.25})
  }
  return {p,mat,texture,canvas,rnd,flower,leaf,environment}
})()
