const Land=(()=>{
  const {T,rand,mat,group,obj,box,soft,cyl,ball,bar,loop,torus,face,pack,canvasTex}=Art;
  function soilTexture(grass){
    const tex=canvasTex(384,(c,n)=>{
      c.fillStyle=grass?'#95a176':'#b59968';c.fillRect(0,0,n,n);
      for(let i=0;i<35000;i++){
        const a=rand(),x=rand()*n,y=rand()*n;
        c.strokeStyle=grass?(a>.5?'rgba(210,207,151,.19)':'rgba(77,88,60,.15)'):(a>.45?'rgba(241,211,146,.52)':'rgba(104,81,54,.28)');
        c.lineWidth=.5+rand()*1.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+rand()*3-1.5,y+(grass?2:4)+rand()*6);c.stroke();
      }
      if(!grass)for(let i=0;i<18;i++){
        const x=rand()*n;c.fillStyle='rgba(101,77,42,.065)';c.fillRect(x,0,1+rand()*4,n);
      }
    });tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  function ground(p,x,z,w,d,texture,repeatX,repeatY,y=0){
    const tex=texture.clone();tex.repeat.set(repeatX,repeatY);const m=new T.MeshStandardMaterial({map:tex,roughness:.94,roughnessMap:Art.rough});
    const o=obj(p,new T.PlaneGeometry(w,d),m,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;
  }
  function leafShape(seed){
    const rng=FarmModel.random(seed),g=new T.IcosahedronGeometry(1,2),a=g.attributes.position,clr=[];
    const phases=Array.from({length:5},()=>rng()*12);
    for(let i=0;i<a.count;i++){
      const x=a.getX(i),y=a.getY(i),z=a.getZ(i),noise=Math.sin(x*8+phases[0])*Math.cos(z*7+phases[1])*Math.sin(y*5+phases[2]);
      const r=1+.13*noise+.055*Math.cos(z*14+x*9+y*4+phases[3]);
      a.setXYZ(i,x*r,y*r,z*r);const v=.82+.14*noise+y*.11;clr.push(v,v*1.02,v*.95);
    }g.setAttribute('color',new T.Float32BufferAttribute(clr,3));g.computeVertexNormals();return g;
  }
  const foliage=Array.from({length:5},(_,i)=>leafShape(311+i));
  function tree(p,x,z,h,col=0x74815c,poplar=false){
    const o=group(p,x,0,z),trunk=mat(0x675b48);
    bar(o,[0,0,0],[.03*h,h*.68,0],.041*h,trunk,8,.018*h);
    const m=mat(col);m.vertexColors=true;
    if(poplar){
      for(let j=0;j<5;j++){
        const a=j*2.4;const cl=obj(o,foliage[j],m,Math.sin(a)*h*.055,h*(.39+j*.09),Math.cos(a)*h*.058);cl.scale.set(h*(.13-j*.012),h*.28,h*(.13-j*.012));cl.rotation.y=a;
      }
    }else{
      for(let j=0;j<12;j++){
        const a=j*2.4,r=(.06+rand()*.15)*h,xx=Math.cos(a)*r,zz=Math.sin(a)*r,yy=(.55+rand()*.24)*h;
        if(j<6)bar(o,[0,.31*h,0],[xx,yy,zz],.019*h,trunk,6,.009*h);
        const cl=obj(o,foliage[j%5],m,xx,yy,zz),rr=(.18+rand()*.095)*h;cl.scale.set(rr,rr*(.86+rand()*.35),rr*.94);cl.rotation.y=a;
      }
    }
    // Bake each tree in world coordinates with other members of its grove.
    o.updateMatrix();for(const a of [...o.children]){a.updateMatrix();a.applyMatrix4(o.matrix);p.add(a);}p.remove(o);
  }
  function barn(p){
    const b=group(p,FarmModel.BARN.x,0,FarmModel.BARN.z-2);b.rotation.y=-.7;
    const siding=mat(0x965142),trim=mat(0xe9dcc1),roof=mat(0x516466,.59,.25);
    const w=6,d=6.8,e=3.45,r=5.34;
    box(b,0,e/2,0,w,e,d,siding);
    for(const zz of [-d/2,d/2])face(b,[[-w/2,e,zz],[w/2,e,zz],[0,r,zz]],siding);
    const slope=Math.atan2(r-e,w/2),span=Math.hypot(w/2,r-e);
    for(const s of [-1,1]){
      const f=box(b,s*w*.25,(r+e)*.5+.09,0,span+.5,.16,d+.58,roof);f.rotation.z=-s*slope;
      for(let i=0;i<17;i++){
        const zz=i*.45-d*.52;bar(b,[0,r+.20,zz],[s*(w/2+.18),e-.01,zz],.021,0x718080,5);
      }
      for(const zz of [-d/2,d/2]){box(b,s*(w/2+.016),e*.5,zz,.14,e,.15,trim);bar(b,[0,r+.05,zz+.20],[s*(w*.5+.21),e-.08,zz+.20],.085,trim,4);}
      for(let i=0;i<19;i++)box(b,s*(w/2+.012),e/2,i*d/19-d/2,.043,e,.024,0x80483b);
      for(let i=0;i<3;i++){
        const zz=i*1.85-1.85;box(b,s*(w/2+.025),2.09,zz,.055,1.10,.92,trim);box(b,s*(w/2+.06),2.09,zz,.04,.90,.73,0x455451);
        box(b,s*(w/2+.093),2.09,zz,.02,.06,.74,trim);box(b,s*(w/2+.094),2.09,zz,.02,.92,.055,trim);
      }
    }
    const front=d/2+.05;
    for(let i=0;i<26;i++)box(b,i*.23-2.89,e*.49,front,.024,e*.98,.035,0x81483c);
    box(b,0,1.49,front+.035,3.36,2.97,.05,0x394138);
    const doors=[];
    for(const s of [-1,1]){
      const door=group(b,s*.80,1.45,front+.10);box(door,0,0,0,1.57,2.84,.12,0x874939);
      loop(door,[[-.74,-1.35,.08],[-.74,1.35,.08],[.74,1.35,.08],[.74,-1.35,.08],[-.74,-1.35,.08]],.054,trim,4);
      bar(door,[-.71,-1.29,.09],[.71,1.29,.09],.055,trim,4);bar(door,[.71,-1.29,.09],[-.71,1.29,.09],.055,trim,4);
      doors.push(pack(door));
    }
    box(b,0,3.12,front+.13,3.64,.15,.13,trim);box(b,0,4.01,front+.04,1,.87,.07,trim);box(b,0,4.00,front+.10,.78,.64,.028,0x455251);
    box(b,0,4.00,front+.12,.045,.64,.02,trim);box(b,0,4.00,front+.12,.78,.045,.02,trim);
    pack(b);return doors;
  }
  function silo(p,x,z){
    const m=mat(0xa7af9c,.48,.52);cyl(p,x,2.24,z,1.5,1.5,4.47,m,40);ball(p,x,4.44,z,1.52,.83,1.52,m,32);
    for(let j=0;j<16;j++)torus(p,x,.26+j*.264,z,1.505,.019,0x8d9587).rotation.x=Math.PI/2;
    cyl(p,x,5.28,z,.21,.28,.13,0x777f76);
    for(const s of [-1,1])bar(p,[x+s*.18,.1,z+1.53],[x+s*.18,4.78,z+1.53],.027,0x71786d);
    for(let j=0;j<14;j++)bar(p,[x-.19,.3+j*.32,z+1.55],[x+.19,.3+j*.32,z+1.55],.023,0x71786d);
  }
  function fences(p,a,b,count){
    const dx=(b[0]-a[0])/count,dz=(b[1]-a[1])/count;
    for(let i=0;i<=count;i++){const x=a[0]+dx*i,z=a[1]+dz*i;box(p,x,.52,z,.14,1.11,.14,0x91846b).rotation.z=rand()*.06-.03;
      if(i<count)for(const y of [.44,.83])bar(p,[x,y,z],[x+dx,y+.015,z+dz],.048,0xa49a81,5);}
  }
  function hills(p){
    const bands=[[76,4,0x9fAD8a],[104,9,0x93a997],[144,13,0x8ea7a3],[194,18,0x99b0af]],rng=FarmModel.random(922);
    for(let j=0;j<bands.length;j++){
      const [radius,amp,col]=bands[j],v=[],colors=[],idx=[],n=190,levels=8;
      for(let k=0;k<=levels;k++)for(let i=0;i<=n;i++){
        const a=2*Math.PI*i/n,r=radius*(.61+.56*k/levels);
        const h=amp*(.96+.35*Math.sin(a*5+j*1.2)+.23*Math.cos(a*8-j*2)+.12*Math.sin(a*17+j))*(Math.sin(k/levels*Math.PI*.57)**1.3)-1.3;
        v.push(Math.sin(a)*r,h,Math.cos(a)*r);
        const c=new T.Color(col).multiplyScalar(.96+.05*Math.sin(i*.28+j)+rng()*.038);colors.push(c.r,c.g,c.b);
        if(k<levels&&i<n){const l=k*(n+1)+i;idx.push(l,l+n+1,l+1,l+1,l+n+1,l+n+2);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
      const m=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide,roughness:.98});m.userData.keep=true;const o=obj(p,g,m);o.castShadow=false;
    }
  }
  function gateway(p){
    const {x,z}=FarmModel.LOCK,g=group(p,x,0,z),wheel=group(g,.79,.84,0),valve=group(g,-.57,1.14,0);
    soft(g,0,.12,0,3.48,.28,2.14,.08,0x8c8d7a);
    for(const s of [-1,1])box(g,s*1.4,.43,0,.22,.77,2.06,0x938b76);
    bar(wheel,[-.35,0,0],[.35,0,0],.10,0x555a50);
    for(let i=0;i<10;i++){const a=i*Math.PI/5,y=Math.cos(a)*.68,zz=Math.sin(a)*.68;
      bar(wheel,[0,0,0],[0,y,zz],.044,0x775a40);const blade=box(wheel,0,y,zz,.65,.12,.27,0x947753);blade.rotation.x=a;}
    for(const s of [-1,1])bar(g,[s*.24-.57,.44,0],[s*.24-.57,1.72,0],.055,0x62695b);
    box(valve,0,-.53,0,.66,.78,.14,0x96805c);torus(valve,0,.22,0,.34,.052,0xab4a36);bar(valve,[-.31,.22,0],[.31,.22,0],.028,0x9d4937);
    pack(wheel);pack(valve);pack(g);g.userData.hit='gate';
    const water=[];for(let i=0;i<16;i++){
      const xx=x-.6+i*.05,zz=z+.90+i*.73;
      box(p,xx,.014,zz,.94,.045,.79,0x81785d);
      water.push(box(p,xx,.059,zz,.90,.028,.76,mat(0x759b97,.10,.63)));
    }return {g,wheel,valve,water};
  }
  function landscape(s,fieldRoot){
    const grass=soilTexture(true),soil=soilTexture(false);ground(s,0,0,440,440,grass,150,150,-.08);
    ground(fieldRoot,0,0,FarmModel.WIDTH+.24,FarmModel.LENGTH+.4,soil,7,15,.012);
    // Headlands are broad enough for the machine's turning circle.
    for(const z of [-20.3,20.3])ground(fieldRoot,0,z,18.1,4.4,soil,8,2,.003);
    const staticLand=group(s);hills(s);
    const track=ground(s,22,2,4.65,58,soil,2,22,-.036);track.rotation.z=1.30;
    const track2=ground(s,11.9,-.8,3.3,48,soil,1,17,-.034);track2.rotation.z=-.035;
    const doors=barn(s);silo(staticLand,39,-3);
    fences(staticLand,[18,7.1],[34,2.9],6);fences(staticLand,[21,-16],[38,-18],7);
    fences(staticLand,[-8.9,-23.2],[5,-24],6);
    // Orchard groups leave open views toward the farmyard.
    const palette=[0x717d57,0x819064,0x8f996b,0x78855f,0x929962];
    [[40,3,7],[43,-2,6],[37,-16,5],[25,-16,4.5],[19,-22,5.4],[-13,-19,6.8],[-12,-30,4.1],[-18,2,6.1],[44,8,6.3],[24,22,6.5]].forEach(([x,z,h],i)=>tree(staticLand,x,z,h,palette[i%5]));
    for(let i=0;i<58;i++){let a=rand()*Math.PI*2,r=47+rand()*26;tree(staticLand,Math.cos(a)*r,Math.sin(a)*r,2.65+rand()*3.5,palette[i%5],i%4!==0);}
    for(let i=0;i<7;i++)tree(staticLand,31+i*2.4,-25-rand()*2,4.1+rand()*1.4,palette[i%5],true);
    const person=Machines.person(s,1.13);person.g.position.set(30.7,0,2.0);
    const lock=gateway(s);
    pack(staticLand);return {doors,person,lock,soil,grass};
  }
  return {landscape,ground,soilTexture};
})();
