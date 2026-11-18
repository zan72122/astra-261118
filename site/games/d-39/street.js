'use strict';
function makeStreet(scene){
  const {T,TAU,V,rng,grain,rock,wood,mat,obj,group,box,ball,rod,path,panels,batch}=Art;
  const base=group(scene),pictures=[];
  const lime=mat(0xe7d8ba,.84,0,{map:grain}), putty=mat(0xbfb9a4,.8),trim=mat(0xeae3cf,.69),
    gray=mat(0x787d74,.72,0,{map:grain}),iron=mat(0x344749,.34,.56),
    lead=mat(0x63716a,.39,.63),brass=mat(0xb58d54,.29,.64),black=mat(0x363e39,.79),
    tile=mat(0x716863,.77,0,{map:grain}),terracotta=mat(0xb66f50,.69,0,{map:grain}),
    pane=mat(0x778c88,.13,.45), amber=mat(0xe6c495,.29,.08,{emissive:0xf9b46e,emissiveIntensity:.16}),
    roofM=[0x57615f,0x626b66,0x75786e,0x686e66].map(c=>mat(c,.50,0,{map:grain})),
    stone=[0x9e9d8d,0xb4b2a0,0xa3a596,0xb8b6a6,0x969b90].map(c=>mat(c,.65,0,{map:grain})),
    paint=[0x496d65,0x667b78,0x817a69,0x8e6352].map(c=>mat(c,.55,0,{map:wood})),
    clays=[0xe2ccb0,0xc3c7b4,0xd5bc9c,0xd0c7b0,0xc1b09b].map(c=>mat(c,.84,0,{map:grain})),
    bark=mat(0x756454,.83,0,{map:wood}),greens=[0x5c7456,0x6c805d,0x8b986c,0x9d9f73,0x506b56,0x69816a].map(c=>mat(c,.69,0,{side:T.DoubleSide,map:grain}));
  const road=mat(0x87908b,.68,.09,{map:rock,bumpMap:rock,bumpScale:.012});
  const pavement=box(base,0,-.133,-10,40,.26,74,road);const uv=pavement.geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*12,uv.getY(i)*22);
  const seam=mat(0x505f59,.90),cobbles=[0xc1b9a2,0xb7b19c,0xbaaf98,0xaaa48e,0xc6bca4].map(c=>mat(c,.63,0,{map:grain}));
  // Separate kerbstones bevel down to a damp seam at road level.
  function kerb(x,z,length,m){const w=.33,h=.157;const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h-.022);shape.quadraticCurveTo(w/2,h,w/2-.025,h);shape.lineTo(-w/2+.027,h);shape.quadraticCurveTo(-w/2,h,-w/2,h-.026);shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,curveSegments:3});obj(base,geo,m,x,0,z);}
  for(const side of [-1,1]){
    const x=side===1?2.48:-3.20;
    box(base,x+side*2.46,.039,-11,4.9,.196,54,seam);
    for(let i=0;i<56;i++){const z=10-i*1.04;kerb(x,z,1.031,stone[i%stone.length]);}
    for(let row=0;row<5;row++)for(let i=0;i<48;i++){
      const z=10-i*1.10+(row%2)*.55;box(base,x+side*(.58+row*.839),.103,z,.827,.078,1.089,cobbles[Math.floor(rng()*5)]);
    }
    // Narrow wet channel bed with occasional slotted cast-iron gratings.
    for(let i=0;i<5;i++){
      const z=-2.52-i*7.6,g=group(base,x-side*.34,.008,z);
      box(g,0,0,0,.37,.015,.775,black);box(g,0,.009,-.37,.39,.024,.042,lead);box(g,0,.009,.37,.39,.024,.042,lead);
      for(const edge of [-1,1])box(g,edge*.184,.014,0,.027,.024,.75,lead);
      for(let j=0;j<9;j++)box(g,0,.015,-.31+j*.078,.34,.025,.033,iron);
      for(const e of [-1,1])for(const j of [-1,1])ball(g,e*.17,.032,j*.357,.015,.006,.015,brass,8);
    }
  }
  for(let i=0;i<35;i++){let x=-2.84+rng()*5,z=3-rng()*24;const p=[[x,.002,z]];
    for(let k=0;k<5;k++){x+=(rng()-.5)*.38;z-=rng()*.24;p.push([x,.002,z]);}path(base,p,.003+rng()*.004,seam);}
  // Individual flecks, petioles and seed pods give the foreground a physical scale.
  for(let i=0;i<195;i++){const x=-3.13+rng()*5.55,z=3.15-rng()*12;
    const o=ball(base,x,.001,z,.008+rng()*.017,.004+rng()*.008,.01+rng()*.02,stone[i%5],6);o.rotation.y=rng()*6.28;}
  for(let i=0;i<31;i++){
    const g=Art.leaf(base,i),side=i%3===0?-1:1;
    g.position.set(side*(1.98+rng()*.30)+(side<0?-0.59:0),.009,2.2-rng()*12);g.rotation.y=rng()*TAU;g.scale.setScalar(.53+rng()*.39);
  }
  function windowFrame(parent,x,y,z,w,h,glow=false){
    box(parent,x,y,z,w+.17,h+.15,.12,trim);
    box(parent,x,y,z+.074,w,h,.06,iron);
    box(parent,x,y,z+.111,w-.088,h-.08,.012,glow?amber:pane);
    box(parent,x,y,z+.129,.044,h,.037,trim);box(parent,x,y+.11*h,z+.132,w,.047,.039,trim);
    box(parent,x,y-h/2-.02,z+.04,w+.29,.116,.30,putty);
    // Curtains tucked into the outer panes.
    for(const q of [-1,1])box(parent,x+q*(w*.435),y,z+.124,w*.073,h*.91,.016,putty);
  }
  function lamp(parent,x,y,z,scale=1){
    const g=group(parent,x,y,z);g.scale.setScalar(scale);
    box(g,0,0,-.12,.16,.40,.09,iron);path(g,[[0,.105,-.1],[0,.29,.12],[0,.26,.32],[0,.14,.32]],.023,iron);
    const body=group(g,0,-.09,.32);
    const light=mat(0xf2d4a0,.25,.12,{emissive:0xffbd6e,emissiveIntensity:.13});pictures.push(light);
    const glass=obj(body,new T.CylinderGeometry(.161,.11,.32,4,1),light,0,0,0);glass.rotation.y=Math.PI/4;
    for(let j=0;j<4;j++){const a=j*Math.PI/2+Math.PI/4;rod(body,[.112*Math.sin(a),-.17,.112*Math.cos(a)],[.17*Math.sin(a),.17,.17*Math.cos(a)],.014,iron);}
    const cap=obj(body,new T.ConeGeometry(.22,.17,4),iron,0,.23,0);cap.rotation.y=Math.PI/4;
    const foot=obj(body,new T.CylinderGeometry(.148,.075,.07,4),iron,0,-.191,0);foot.rotation.y=Math.PI/4;
    ball(body,0,.345,0,.03,.05,.03,brass,10);
    return body;
  }
  function door(g,x,z,c){
    box(g,x,1.54,z,1.62,3.08,.145,trim);box(g,x,1.50,z+.081,1.42,3,.09,black);
    box(g,x,1.49,z+.139,1.31,2.94,.082,c);
    for(let side of [-1,1])for(let k=0;k<2;k++){
      box(g,x+side*.285,.55+k*.69,z+.198,.46,.53,.042,c);
      box(g,x+side*.285,.55+k*.69,z+.229,.355,.423,.023,c);
    }
    box(g,x,2.27,z+.195,.97,.98,.04,pane);box(g,x,2.27,z+.225,.039,1,.031,trim);
    box(g,x,2.28,z+.229,1,.039,.034,trim);box(g,x,1.69,z+.213,.33,.067,.036,brass);
    ball(g,x+.49,1.33,z+.246,.049,.053,.065,brass);
    box(g,x,.085,z+.21,1.74,.17,.55,stone[1]);box(g,x,.033,z+.47,1.92,.07,.35,stone[2]);
  }
  function house(x,z,angle,w,h,d,i,doors=true){
    const g=group(base,x,.14,z);g.rotation.y=angle;
    box(g,0,h/2,-d/2,w,h,d,clays[i%5]);box(g,0,.25,.025,w,.50,.10,stone[i%5]);
    box(g,0,h*.52,.034,w+.04,.105,.135,putty);box(g,0,h-.13,.07,w+.13,.20,.23,trim);
    const peak=h+1.27,F=d*.5;
    panels(g,[[[-w*.5,h,.012],[w*.5,h,.012],[0,peak,.012]]],clays[i%5]);
    for(const side of [-1,1]){
      const sl=Math.atan2(1.32,w/2+.22),r=box(g,side*(w/4+.11),h+.63,-F,Math.hypot(w/2+.22,1.32),.105,d+.60,roofM[i%4]);r.rotation.z=-side*sl;
      for(let k=0;k<9;k++){const f=k/9;box(g,side*(w/2+.22)*(1-f),h+1.32*f,-F,.065,.052,d+.64,roofM[(i+k)%4]);}
    }
    box(g,w*.25,h+1.14,-d*.61,.47,1.50,.58,terracotta);box(g,w*.25,h+1.91,-d*.61,.60,.14,.70,trim);
    const count=w>6?3:2;for(let j=0;j<count;j++){
      const px=(j+.5-count/2)*w/count;windowFrame(g,px,h*.74,.07,w/count*.53,1.24,i%4===0);
      if(j===0&&doors)door(g,px,.08,paint[i%4]);else windowFrame(g,px,1.69,.065,w/count*.57,1.42,i%3===0);
    }
    const pipeX=w/2-.17;
    path(g,[[pipeX,h-.12,.18],[pipeX,h-.38,.2],[pipeX,h-.57,.10],[pipeX,.48,.10],[pipeX,.25,.23]],.050,lead);
    for(let y=.72;y<h;y+=1.7)box(g,pipeX,y,.115,.133,.047,.124,iron);
    if(doors)lamp(g,-w*.48,2.57,.18,1.16);
    return g;
  }
  // A small porch on the near side opens onto a longer, softly lit residential lane.
  const home=house(4.69,-4.71,-Math.PI/2,6.15,5.38,4.1,0,false);
  door(home,-1.39,.145,paint[0]);
  const porchL=lamp(home,-.38,2.20,.25,1.38);
  const awning=group(home,-1.05,2.92,.85);
  const can=box(awning,0,0,0,3.95,.17,1.86,roofM[0]);can.rotation.x=.14;
  for(let i=0;i<19;i++){const rr=box(awning,-1.88+i*.207,.085,0,.035,.04,1.88,lead);rr.rotation.x=.14;}
  box(awning,0,-.17,.92,4.05,.13,.14,lead);
  for(const x of [-1.64,1.64]){rod(awning,[x,-.15,.75],[x,-.83,-.62],.063,paint[0]);}
  path(home,[[.84,2.84,1.76],[.99,2.74,1.76],[.99,2.48,1.77]],.067,lead);
  house(6.02,-12.4,-1.36,6.60,5.15,3.7,3);house(6.60,-20,-1.3,6.3,5.0,3.9,2);
  house(-5.10,-7.84,.97,5.41,4.77,3.85,1);house(-5.43,-14.91,1.10,6.8,5.18,4.2,2);
  house(-3.86,-22.84,.61,5.87,4.65,3.3,0);house(1.49,-28.25,-.15,6.0,5.24,4.6,1);
  house(7.06,-27.21,-.34,5.45,4.58,3.4,4);
  const moss=mat(0x76826b,.85);
  function fence(x,z,len){
    box(base,x,.38,z,.47,.53,len,stone[2]);box(base,x,.68,z,.57,.095,len+.07,putty);
    for(let y of [.92,1.40])box(base,x,y,z,.058,.057,len,iron);
    for(let j=0;j<=len/.30;j++){const zz=z-len/2+j*.30;rod(base,[x,.705,zz],[x,1.53,zz],.021,iron);ball(base,x,1.54,zz,.037,.056,.037,iron,8);}
    for(let j of [-1,1]){box(base,x,.67,z+j*len/2,.52,1.05,.54,stone[1]);box(base,x,1.22,z+j*len/2,.64,.12,.66,putty);}
  }
  fence(-3.55,-2.55,4.3);fence(-3.6,-11.2,4.9);
  function foliage(g,center,radii,count,scale=1){
    const tri=greens.map(()=>[]);
    for(let i=0;i<count;i++){
      const a=rng()*TAU,h=rng()*2-1,rad=Math.cbrt(rng()),d=Math.sqrt(1-h*h);
      const x=center[0]+Math.cos(a)*d*rad*radii[0],y=center[1]+h*rad*radii[1],z=center[2]+Math.sin(a)*d*rad*radii[2];
      const k=Math.min(5,Math.floor(rng()*6)),w=(.055+.055*rng())*scale,l=(.14+rng()*.17)*scale,angle=rng()*TAU;
      const X=Math.cos(angle),Z=Math.sin(angle),dy=(rng()-.36)*l;
      const A=[x-X*l,y-dy,z-Z*l],B=[x-Z*w,y+.035*scale,z+X*w],C=[x+X*l,y+dy,z+Z*l],D=[x+Z*w,y+.023*scale,z-X*w];
      tri[k].push([A,B,C],[A,C,D]);
    }tri.forEach((v,i)=>{if(v.length)panels(g,v,greens[i]);});
  }
  function tree(x,z,h,r){
    const g=group(base,x,.14,z);const bend=.13;
    rod(g,[0,0,0],[bend,h*.68,.04],r*.104,bark,r*.057,14);
    for(let i=0;i<12;i++){
      const a=rng()*TAU,l=(.32+rng()*.65)*r,b=h*(.37+rng()*.27),ex=Math.cos(a)*l,ez=Math.sin(a)*l,ey=b+h*(.23+rng()*.19);
      rod(g,[bend*.7,b,0],[ex*.66,ey-.29,ez*.6],.056*r,bark,.026*r);
      rod(g,[ex*.66,ey-.29,ez*.6],[ex,ey,ez],.029*r,bark,.012*r);
      foliage(g,[ex,ey,ez],[r*.56,h*.16,r*.57],125,r*.97);
    }
  }
  tree(-3.98,-2.95,4.93,1.52);tree(-3.62,-10.46,5.26,1.79);tree(4.42,-9.52,5.05,1.79);
  tree(-2.17,-19.79,5.23,1.87);tree(2.81,-23.63,5.44,1.63);tree(-7.42,-18,6.0,2.1);
  const bloom=[0xd2b7b4,0xd7d3c1,0xb9b8c7,0xc0c7a4].map(c=>mat(c,.75));
  function planter(x,z,size,flowery){
    const g=group(base,x,.145,z);g.scale.setScalar(size);
    const p=obj(g,new T.CylinderGeometry(.314,.221,.48,32),terracotta,0,.24,0);
    obj(g,new T.CylinderGeometry(.337,.336,.089,32),terracotta,0,.459,0);
    obj(g,new T.CylinderGeometry(.299,.299,.012,32),black,0,.507,0);
    foliage(g,[0,.82,0],[.58,.44,.52],148,1.0);
    if(flowery)for(let i=0;i<7;i++){
      const a=rng()*TAU,r=.33*rng(),x=Math.cos(a)*r,z=Math.sin(a)*r,y=.92+rng()*.30;
      rod(g,[0,.51,0],[x,y,z],.012,moss);
      for(let k=0;k<13;k++){const aa=rng()*TAU,h=rng();ball(g,x+Math.cos(aa)*.115*Math.sqrt(1-h*h),y+.134*h,z+Math.sin(aa)*.115*Math.sqrt(1-h*h),.052,.038,.049,bloom[(i+k)%4],6);}
    }
  }
  planter(3.35,-2.85,.91,true);planter(3.61,-2.41,.61,false);planter(3.41,-6.67,1.04,true);
  planter(-3.84,-5.28,1.21,true);planter(-4.24,-5.08,.67,false);
  for(let i=0;i<8;i++)foliage(base,[-4.12,.82,-.6-i*.54],[.66,.48,.59],100,.82);
  const lightpost=group(base,-2.89,.14,-7.95);
  rod(lightpost,[0,0,0],[0,3.24,0],.082,iron,.049);rod(lightpost,[0,0,0],[0,.44,0],.16,iron,.115);
  const lantern=lamp(lightpost,0,3.48,-.29,1.7);
  // A shallow hinged copper hopper spills into twelve downhill channel sections.
  const cup=group(scene,2.67,1.30,-3.79),copper=mat(0x96764d,.31,.61,{side:T.DoubleSide});
  obj(cup,new T.CylinderGeometry(.228,.095,.295,24,1,true),copper,0,-.02,0);
  const cw=mat(0x678e83,.17,.34);const cupWater=obj(cup,new T.CylinderGeometry(.194,.19,.013,24),cw,0,.07,0);
  rod(base,[2.59,1.3,-3.79],[2.87,1.3,-3.79],.025,brass);
  path(base,[[2.90,.146,-3.79],[2.90,1.265,-3.79],[2.85,1.3,-3.79]],.034,iron);
  const chain=[];for(let i=0;i<9;i++){const a=obj(scene,new T.TorusGeometry(.045,.009,6,14),brass,2.67,2.568-i*.126,-3.79);a.scale.y=1.56;a.rotation.y=i%2*Math.PI/2;chain.push(a);}
  const channel=[];
  for(let i=0;i<12;i++){
    const f=i/11,x=2.65-.72*f,z=-3.80-1.40*f,y=.21-.172*f;
    const seg=group(base,x,y,z);seg.rotation.y=.475;
    box(seg,0,0,0,.22,.025,.17,lead);for(let side of [-1,1])box(seg,side*.112,.032,0,.018,.083,.174,lead);
    const w=box(scene,x,y+.022,z,.193,.014,.17,cw);w.rotation.y=.475;channel.push(w);
  }
  const wheel=group(scene,1.93,.238,-5.26),paddle=mat(0x917147,.56,0,{map:wood});
  rod(base,[1.72,.026,-5.26],[1.72,.242,-5.26],.022,lead);
  rod(base,[2.13,.026,-5.26],[2.13,.242,-5.26],.022,lead);
  rod(wheel,[-.231,0,0],[.231,0,0],.025,brass);
  for(const x of [-.143,.143]){
    const hoop=obj(wheel,new T.TorusGeometry(.158,.013,7,36),brass,x);hoop.rotation.y=Math.PI/2;
    for(let j=0;j<4;j++){const a=j*Math.PI/4;const spoke=box(wheel,x,0,0,.022,.336,.019,paddle);spoke.rotation.x=a;}}
  for(let j=0;j<8;j++){const a=j*Math.PI/4,m=box(wheel,0,Math.sin(a)*.182,Math.cos(a)*.182,.314,.035,.10,paddle);m.rotation.x=-a;}
  batch(wheel);
  const keys=[];
  for(let i=0;i<4;i++){
    const key=group(scene,2.65+i*.34,.149,-5.20);
    box(key,0,0,0,.329,.026,.92,cobbles[(i+1)%5]);
    const disk=obj(key,new T.CylinderGeometry(.051,.051,.008,24),brass,0,.015,.31-i*.05);
    keys.push(key);
  }
  batch(base);
  return {keys,chain,wheel,lamps:pictures,cup,cupWater,channel,porchL,lantern};
}
