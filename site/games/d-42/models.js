'use strict';
const Railway=(function(){
  const T=THREE,L=Landscape,V=Valley,vec=L.vec,M=L.mat,mesh=L.mesh,rnd=V.generator(4588);
  const c={red:M(0xb82f2a,.38,.34),ruby:M(0x8e2423,.4,.30),lightRed:M(0xd44535,.41,.26),cream:M(0xe6dcc3,.43,.34),
    coal:M(0x253337,.52,.53),edge:M(0x425053,.4,.66),seal:M(0x19272b,.72,.09),bronze:M(0xa78852,.34,.69),gold:M(0xd7af65,.29,.70),
    light:M(0xffeaba,.35,.22,{emissive:0xffc16b,emissiveIntensity:.22}),seat:M(0x455a51,.83,.03),inside:M(0xa8a48c,.7,.12),
    glass:M(0x85abb2,.12,.28,{transparent:true,opacity:.30,side:T.DoubleSide,depthWrite:false,envMapIntensity:1.23}),
    zinc:M(0x70504a,.67,.36),house:M(0x607669,.8,.04),granite:M(0x929287,.99),rope:M(0x7d7460,.98,.02)};
  function wood(base,seed){
    const W=256,H=64,a=new Uint8Array(W*H*4),rgb=[(base>>16)&255,(base>>8)&255,base&255];
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const warp=2.5*Math.sin(x/W*6.28+seed)+2*V.noise(x*.018,seed+y*.03);
      const grain=V.noise(x*.022+seed,(y+warp)*.65)*.28+V.noise(x*.06,y*.32+seed)*.11;
      let d=.79+grain+.038*Math.sin((y+warp)*3.01);
      const knot=Math.hypot((x-137-seed%26)/4.5,(y-27-seed%13)*1.45);
      d-=Math.exp(-knot*.17)*(.09+.10*Math.cos(knot*2));
      for(let k=0;k<3;k++)a[4*(y*W+x)+k]=V.clamp(rgb[k]*d,0,255);a[4*(y*W+x)+3]=255;
    }
    const t=new T.DataTexture(a,W,H);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
    return M(0xffffff,.83,.015,{map:t});
  }
  c.wood=wood(0xa17d55,21);c.wood2=wood(0xb29168,45);c.darkWood=wood(0x78614c,11);c.honey=wood(0x9f704b,72);
  const boxGeo=new T.BoxGeometry(1,1,1),unitCyl=new Map();
  function group(p,x=0,y=0,z=0){const g=new T.Group();p.add(g);g.position.set(x,y,z);return g;}
  function box(p,x,y,z,w,h,d,m){const o=mesh(boxGeo,m,p,x,y,z);o.scale.set(w,h,d);return o;}
  function cyl(p,x,y,z,rt,rb,h,m,n=16){
    const key=[rt,rb,h,n].join('/');if(!unitCyl.has(key))unitCyl.set(key,new T.CylinderGeometry(rt,rb,h,n));
    return mesh(unitCyl.get(key),m,p,x,y,z);
  }
  function beam(p,a,b,r,m,n=10){let v=vec(...b).sub(vec(...a));const o=cyl(p,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,r,v.length(),m,n);o.quaternion.setFromUnitVectors(vec(0,1,0),v.normalize());return o;}
  function timber(p,a,b,w,d,m){const v=vec(...b).sub(vec(...a));const o=box(p,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,w,v.length(),d,m);o.quaternion.setFromUnitVectors(vec(0,1,0),v.normalize());return o;}
  function disc(p,x,y,z,r,depth,m){const o=cyl(p,x,y,z,r,r,depth,m,32);o.rotation.x=Math.PI/2;return o;}
  function ring(p,x,y,z,r,t,m){return mesh(new T.TorusGeometry(r,t,8,42),m,p,x,y,z);}
  function poly(p,points,m){const a=[];for(let i=1;i<points.length-1;i++)a.push(...points[0],...points[i],...points[i+1]);const g=L.geom(a,null,null,a.filter((_,i)=>i%3!==1));return mesh(g,m,p);}
  function corners(w,d,cut){
    return [[-w+cut,d],[w-cut,d],[w,d-cut],[w,-d+cut],[w-cut,-d],[-w+cut,-d],[-w,-d+cut],[-w,d-cut]];
  }
  function band(p,y0,y1,lo,hi,m,cap=true,gap=-1){
    const a=corners(...lo),b=corners(...hi);
    for(let i=0;i<8;i++){if(i===gap)continue;let j=(i+1)%8;poly(p,[[a[i][0],y0,a[i][1]],[a[j][0],y0,a[j][1]],[b[j][0],y1,b[j][1]],[b[i][0],y1,b[i][1]]],m);}
    if(cap)poly(p,b.map(q=>[q[0],y1,q[1]]),m);
  }
  function emblem(p,x,y,z,r){
    const g=group(p,x,y,z);disc(g,0,0,0,r,.034,c.bronze);disc(g,0,0,.023,r*.89,.02,c.coal);ring(g,0,0,.042,r*.81,r*.022,c.gold);
    const pts=[[-.66,-.28],[-.24,.28],[-.08,.07],[.18,.47],[.66,-.28]];
    for(let i=0;i<pts.length-1;i++)beam(g,[pts[i][0]*r,pts[i][1]*r,.05],[pts[i+1][0]*r,pts[i+1][1]*r,.05],r*.056,c.cream);
    beam(g,[-.53*r,-.41*r,.05],[.53*r,-.41*r,.05],r*.028,c.gold);
    for(const side of [-1,1])for(let k=0;k<3;k++)
      box(g,side*r*(1.34-k*.08),(.24-k*.22)*r,-.002,r*(.71-k*.12),r*.067,.031,c.cream);
    return g;
  }
  // Consolidate immutable pieces per material while retaining independent mechanical assemblies.
  function batch(g){
    const groups=new Map(),inv=g.matrixWorld.clone();
    g.updateWorldMatrix(true,true);inv.copy(g.matrixWorld).invert();
    const solids=g.children.filter(o=>o.isMesh);
    for(const o of solids){
      const m=o.material;if(!groups.has(m))groups.set(m,{p:[],n:[],uv:[]});const dst=groups.get(m);
      const b=o.geometry,mat=inv.clone().multiply(o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(mat);
      const p=b.attributes.position,n=b.attributes.normal,uv=b.attributes.uv,idx=b.index;
      const v=vec(0,0,0);for(let i=0;i<(idx?idx.count:p.count);i++){
        const k=idx?idx.getX(i):i;v.fromBufferAttribute(p,k).applyMatrix4(mat);dst.p.push(v.x,v.y,v.z);
        v.fromBufferAttribute(n,k).applyMatrix3(nm).normalize();dst.n.push(v.x,v.y,v.z);dst.uv.push(uv?uv.getX(k):0,uv?uv.getY(k):0);
      }g.remove(o);
    }
    for(const [m,data]of groups){const b=new T.BufferGeometry();b.setAttribute('position',new T.Float32BufferAttribute(data.p,3));b.setAttribute('normal',new T.Float32BufferAttribute(data.n,3));b.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));const o=mesh(b,m,g);if(m.transparent)o.castShadow=false;}
  }
  function cabin(scene){
    const car=group(scene),staticBody=group(car),p=staticBody;
    const low=[1.43,1.09,.27],mid=[1.61,1.25,.32],top=[1.48,1.13,.26];
    band(p,.06,.17,[1.36,1,.27],low,c.seal);band(p,.17,.33,low,[1.51,1.17,.28],c.ruby,false);
    band(p,.33,1.09,[1.51,1.17,.28],mid,c.red,false,2);band(p,1.09,1.17,mid,mid,c.cream,false,2);
    band(p,1.17,1.27,mid,mid,c.red,false,2);band(p,1.27,1.32,mid,mid,c.seal,false,2);
    band(p,1.32,2.65,mid,top,c.glass,false,2);band(p,2.65,2.72,top,[1.55,1.18,.27],c.seal,false);
    band(p,2.72,2.81,[1.55,1.18,.27],[1.60,1.23,.30],c.cream);band(p,2.81,2.92,[1.60,1.23,.30],[1.47,1.12,.32],c.cream);
    band(p,2.92,2.99,[1.47,1.12,.32],[1.22,.89,.31],c.inside);
    for(let i=0;i<8;i++){
      const a=corners(...mid)[i],b=corners(...top)[i];
      beam(p,[a[0],1.28,a[1]],[b[0],2.68,b[1]],.050,c.coal,8);
      beam(p,[a[0]*1.018,1.30,a[1]*1.018],[b[0]*1.018,2.68,b[1]*1.018],.026,c.cream,8);
    }
    for(let side of [-1,1]){
      const z=side*1.25;
      beam(p,[-1.26,1.35,z],[1.26,1.35,z],.033,c.bronze);
      beam(p,[0,1.31,z],[0,2.68,side*1.13],.033,c.coal);
      for(let x of [-.83,-.69,-.55,.55,.69,.83]){box(p,x,.47,side*1.206,.032,.20,.017,c.ruby);}
      for(let x of [-1.18,-.94,.94,1.18]){disc(p,x,.967,side*1.249,.018,.022,c.bronze);}
    }
    // Swing door guides, catches, and a slatted two-person bench.
    box(p,0,.39,0,2.62,.12,1.94,c.wood);
    for(let z of [-.49,.54]){
      box(p,-.76,.70,z,1.01,.15,.48,c.seat);
      for(let k=0;k<4;k++)box(p,-.77,.83+k*.13,z+.23,.97,.10,.076,c.honey);
    }
    for(let x of [-1.36,1.36])beam(p,[x,.59,.72],[x,2.57,.72],.031,c.bronze);
    for(let k=0;k<9;k++)box(p,-1.05+k*.263,2.991,0,.032,.023,1.67,c.cream);
    const med=emblem(p,0,.744,1.257,.225);batch(med);
    const frontMed=emblem(p,0,.744,-1.257,.190);frontMed.rotation.y=Math.PI;batch(frontMed);
    const door=[-1,1].map(side=>{
      const leaf=group(car);const l=side<0?-.93:0,h=side<0?0:.93;
      function sheet(y0,y1,x0,x1,m){poly(leaf,[[x0,y0,h],[x0,y0,l],[x1,y1,l],[x1,y1,h]],m);}
      sheet(.33,1.09,1.51,1.615,c.red);sheet(1.09,1.17,1.615,1.615,c.cream);
      sheet(1.17,1.30,1.615,1.615,c.red);sheet(1.30,1.34,1.615,1.613,c.seal);
      sheet(1.34,2.65,1.613,1.49,c.glass);
      beam(leaf,[1.62,1.30,side*.023],[1.49,2.66,side*.023],.029,c.coal);
      beam(leaf,[1.52,.35,side*.016],[1.62,1.28,side*.016],.012,c.ruby);
      beam(leaf,[1.635,1.42,side*.13],[1.619,1.68,side*.13],.024,c.gold);
      batch(leaf);return leaf;
    });
    const hanger=group(scene);
    box(hanger,0,3.10,0,1.10,.20,1.32,c.edge);
    for(const z of [-.48,.48]){
      beam(hanger,[-.53,3.12,z],[.09,3.73,z],.081,c.edge);
      beam(hanger,[.55,3.12,z],[.09,3.73,z],.081,c.coal);
      disc(hanger,.09,3.72,z,.132,.108,c.bronze);
    }
    beam(hanger,[.09,3.73,0],[-.19,4.08,0],.115,c.edge);
    beam(hanger,[-.19,4.08,0],[-.19,4.76,0],.114,c.edge);
    beam(hanger,[-.19,4.75,0],[0,4.87,0],.115,c.edge);
    box(hanger,0,4.91,0,.20,.17,1.39,c.coal);
    const wheels=[];for(let z of [-.47,.47]){
      const g=group(hanger,0,5.085,z);const wh=cyl(g,0,0,0,.183,.183,.18,c.edge);wh.rotation.z=Math.PI/2;
      const hub=cyl(g,.10,0,0,.083,.083,.028,c.bronze);hub.rotation.z=Math.PI/2;
      box(g,.118,0,0,.016,.036,.15,c.coal);batch(g);wheels.push(g);
    }
    // The driving plunger sits within reach of the front window.
    const ctl=group(car,.58,1.37,-.87);ctl.rotation.x=-.30;
    box(ctl,0,.13,.02,.62,.36,.24,c.coal);
    box(ctl,0,.14,.158,.56,.30,.025,c.bronze);
    disc(ctl,-.139,.14,.19,.104,.07,c.seal);disc(ctl,-.139,.14,.231,.088,.02,c.cream);
    for(let k=0;k<7;k++){let a=-1.05+k*.35;box(ctl,-.139+Math.sin(a)*.067,.14+Math.cos(a)*.067,.247,.009,.018,.008,c.coal).rotation.z=-a;}
    const needle=group(ctl,-.139,.14,.253);box(needle,0,.029,0,.012,.065,.012,c.red);
    const button=group(ctl,.125,.14,.20);disc(button,0,0,0,.157,.055,c.seal);disc(button,0,0,.036,.135,.066,c.gold);disc(button,0,0,.076,.103,.026,c.light);
    const chev=[[-.042,-.02], [0,.025],[.042,-.02]];for(let i=0;i<2;i++)beam(button,[...chev[i],.093],[...chev[i+1],.093],.008,c.bronze);
    [p,hanger,ctl,button].forEach(batch);
    return {car,hanger,door,ctl,button,needle,wheels,med};
  }
  function lamp(p,x,y,z,size=1){
    const g=group(p,x,y,z);g.scale.setScalar(size);
    cyl(g,0,.1,0,.11,.16,.2,c.coal);cyl(g,0,.32,0,.118,.11,.28,c.light);
    cyl(g,0,.51,0,.034,.174,.13,c.coal);for(let a=0;a<4;a++){const t=a*1.571;beam(g,[Math.cos(t)*.118,.17,Math.sin(t)*.118],[Math.cos(t)*.118,.46,Math.sin(t)*.118],.011,c.edge);}
    batch(g);
  }
  function chalet(p,x,y,z,w,d,scale=1){
    const g=group(p,x,y,z);g.scale.setScalar(scale);
    const h=w*.54;box(g,0,.55,0,w*1.02,1.13,d*1.02,c.granite);
    box(g,0,.91+h*.5,0,w,h,d,c.wood);
    for(let side of [-1,1]){
      poly(g,[[-w*.5,.91+h,side*d/2],[w*.5,.91+h,side*d/2],[0,.91+h+w*.31,side*d/2]],c.honey);
      for(let i=0;i<3;i++){const xx=(i-1)*w*.29;
        box(g,xx,h*.60+.9,side*(d/2+.025),w*.18,h*.44,.10,c.cream);
        box(g,xx,h*.60+.9,side*(d/2+.09),w*.148,h*.38,.055,c.coal);
        box(g,xx,h*.60+.9,side*(d/2+.13),.045,h*.39,.04,c.cream);
      }
      const ww=w*.605,hh=.31*w;
      const sl=Math.atan2(hh,ww),ry=.91+h+hh*.50;
      box(g,side*ww*.5,ry,0,Math.hypot(ww,hh),.20,d*1.18,c.zinc).rotation.z=-side*sl;
      for(let i=0;i<12;i++)box(g,side*ww*.5,ry+.107,(i/11-.5)*d*1.18,Math.hypot(ww,hh),.033,.045,c.bronze).rotation.z=-side*sl;
    }
    box(g,w*.25,h+1.85,-d*.25,.48,1.7,.48,c.granite);batch(g);return g;
  }
  function tower(p,z,side=1){
    const x=4.9*side;
    for(let zz of [z-.64,z+.64]){
      timber(p,[x,-1,zz],[x,6.55,zz],.32,.32,c.darkWood);
      timber(p,[x,4.42,zz],[x-side*1.65,6.12,zz],.21,.23,c.wood);
      box(p,x-side*2.42,6.14,zz,5.3,.35,.32,c.darkWood);
    }
    beam(p,[.04,6.13,z],[.04,5.14,z],.09,c.edge);
    const roller=cyl(p,0,5.06,z,.15,.15,1.22,c.edge);roller.rotation.z=Math.PI/2;
    for(let k of [-.64,.64]){disc(p,x,5.73,z+k,.09,.08,c.coal);}
  }
  function station(scene,d){
    const pos=V.route(d),p=group(scene,pos.x,pos.y,pos.z),base=group(p),floor=group(p),boards=[];
    const near=d===0,mid=d===V.MID;
    const start=-9.9,end=near?8.4:7.1,inner=1.65,outer=near?7.0:7.4;
    for(let z=start;z<end;z+=.455)box(base,(outer+inner)*.5,-.15,z,outer-inner,.245,.444,rnd()>.40?c.wood:c.wood2);
    for(let x of [1.88,outer-.27]){
      box(base,x,-.51,(start+end)/2,.32,.56,end-start+.4,c.darkWood);
      for(let z=start+.4;z<end+.1;z+=3.5){
        const h=V.clamp(pos.y-V.terrain(pos.x+x,pos.z+z)+.8,.8,34);
        box(base,x,-h*.5-.31,z,.36,h,.38,c.darkWood);
        timber(base,[x,-2.85,z],[x,-.48,z+1.5],.23,.22,c.honey);
      }
    }
    for(let k=0;k<10;k++){
      const z=-1-k*.81;const g=group(floor,inner+.8,-.009,z);
      box(g,0,0,0,1.36,.065,.52,k%3?c.wood2:c.honey);
      for(let x of [-.50,.50])cyl(g,x,.038,0,.026,.026,.011,c.bronze,8);
      batch(g);boards.push(g);
    }
    function fence(x,z1,z2){
      for(let z=z1;z<z2+.1;z+=2){box(base,x,.49,z,.12,1.03,.13,c.wood);cyl(base,x,1.015,z,.081,.084,.04,c.bronze,8);}
      box(base,x,1.02,(z1+z2)/2,.137,.11,z2-z1+.14,c.wood2);beam(base,[x,.51,z1],[x,.51,z2],.026,c.rope);
    }
    fence(outer-.08,start+.07,end-.25);
    if(near)fence(inner+.09,start+.12,-5.5);
    if(!near)fence(inner+.09,-9.7,-6);
    // The station's timber platform and hardware are full-scale.
    if(near){tower(base,-5.8);chalet(p,10.0,-.94,.7,5.95,8.15);}
    else {tower(base,-3.3);chalet(p,10.5,-.97,-.7,7.2,9);lamp(p,2.0,.01,-7.8,1.28);}
    lamp(p,outer-.28,1.08,near?-4:4.6,1.05);
    if(mid||!near){
      for(let k=0;k<8;k++){const x=outer+.38+k*.8;
        box(base,x,-.16,-7.1,.78,.28,2.1,k%2?c.wood:c.wood2);
      }
    }
    const flag=group(p,near?5.64:5.88,0,-8.8);
    beam(flag,[0,0,0],[0,4.18,0],.052,c.coal);cyl(flag,0,4.2,0,.078,.078,.108,c.bronze);
    const segments=[];let last=group(flag,0,4.02,0);
    for(let i=0;i<7;i++){const seg=group(last,i?.268:0,0,0),h=.41*(1-i/7)+.03,hr=.41*(1-(i+1)/7)+.03;
      const m=i<2?c.cream:i===2?c.red:c.lightRed;
      const q=poly(seg,[[0,0,0],[.268,-.025,.005],[.268,-hr-.025,.003],[0,-h,0]],m);
      q.material=m.clone();q.material.side=T.DoubleSide;segments.push(seg);last=seg;
    }
    batch(base);return {p,floor,boards,segments};
  }
  function telescope(p){
    const g=group(p,2.45,.02,-8.65);
    cyl(g,0,.08,0,.34,.43,.16,c.coal);cyl(g,0,.69,0,.119,.17,1.13,c.house);
    cyl(g,0,1.22,0,.21,.15,.16,c.bronze);
    const head=group(g,0,1.41,0);head.rotation.y=1.20;head.rotation.x=-.18;
    beam(head,[-.25,0,.04],[.25,0,.04],.12,c.coal);disc(head,.01,.10,-.04,.18,.69,c.house);
    for(let x of [-.148,.148]){
      disc(head,x,.13,-.22,.125,.26,c.bronze);disc(head,x,.13,.25,.083,.37,c.coal);
      disc(head,x,.13,.453,.07,.045,c.seal);disc(head,x,.13,.479,.052,.012,c.glass);
    }
    for(let k of [-1,1])beam(head,[k*.22,-.03,.10],[k*.27,-.18,.25],.03,c.gold);
    batch(g);batch(head);return {g,head};
  }
  function chimes(p){
    const g=group(p,2.62,.05,-6.15),parts=[],strikers=[];
    for(let x of [-.62,.62]){box(g,x,1.35,0,.115,2.7,.125,c.darkWood);box(g,x,.15,0,.22,.27,.24,c.granite);}
    box(g,0,2.63,0,1.52,.16,.18,c.wood2);
    for(let i=0;i<3;i++){
      const q=group(g,(i-1)*.34,2.50,0),l=.47+i*.21;
      beam(q,[0,0,0],[0,-.33,0],.011,c.rope);cyl(q,0,-.32-l*.5,0,.067,.067,l,c.gold);
      cyl(q,0,-.32-l,0,.073,.073,.035,c.bronze);q.userData.length=l;batch(q);parts.push(q);
      const striker=group(g,(i-1)*.34,2.50,0);
      beam(striker,[0,0,0],[0,-l-.63,0],.007,c.rope,6);
      cyl(striker,0,-l-.36,0,.031,.044,.057,c.honey);
      const leaf=poly(striker,[[0,-l-.56,0],[-.055,-l-.68,0],[.003,-l-.81,.02],[.057,-l-.69,.025]],c.cream);
      leaf.material=c.cream.clone();leaf.material.side=T.DoubleSide;
      batch(striker);strikers.push(striker);
    }batch(g);return {g,parts,strikers};
  }
  function cables(scene){
    const g=group(scene);
    for(let offset of [0]){
      let prev=null;for(let d=-15;d<=V.END+15;d+=3){const rt=V.route(V.clamp(d,0,V.END));if(d<0)rt.z-=d;if(d>V.END)rt.z-=d-V.END;
        const point=[rt.x+offset,rt.y+4.907,rt.z];if(prev)beam(g,prev,point,.043,c.coal,8);prev=point;
      }
    }batch(g);
  }
  function birds(scene){
    const plum=M(0x555b57,.88),breast=M(0xcbc6ae,.85),wingTip=M(0x394649,.91);
    plum.side=breast.side=wingTip.side=T.DoubleSide;
    return Array.from({length:5},()=>{const g=group(scene),wings=[];
      const o=mesh(new T.SphereGeometry(1,10,7),breast,g);o.scale.set(.074,.072,.238);
      const head=mesh(new T.SphereGeometry(.071,9,6),plum,g,0,.037,-.164);
      poly(g,[[-.05,0,.12],[-.13,.01,.33],[.13,.01,.33],[.05,0,.12]],plum);
      for(let s of [-1,1]){
        const w=group(g,s*.038,.027,-.015);
        poly(w,[[0,0,-.081],[s*.21,.032,-.16],[s*.46,.047,-.11],[s*.29,.026,.055],[s*.09,.01,.12]],plum);
        poly(w,[[s*.29,.026,.055],[s*.46,.047,-.11],[s*.64,.013,-.048],[s*.49,.015,.012],[s*.35,.019,.079]],wingTip);
        batch(w);wings.push(w);
      }batch(g);return {g,wings};});
  }
  return {c,cabin,station,telescope,chimes,cables,birds,chalet,group,batch,beam,box};
})();
