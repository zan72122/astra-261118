'use strict';
function buildWorld(scene){
  const T=THREE,{mat,wood,rng}=Loom,V=(x,y,z)=>new T.Vector3(x,y,z);
  const still=new T.Group();scene.add(still);
  const cube=new T.BoxGeometry(1,1,1),ball=new T.SphereGeometry(1,16,12);
  function mesh(g,m,parent=still){let o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  const upright=cube.clone(),lengthwise=cube.clone();
  for(const [g,faces] of [[upright,[0,1,4,5]],[lengthwise,[2,3]]]){
    const uv=g.attributes.uv;
    for(const face of faces)for(let j=0;j<4;j++){const i=face*4+j,u=uv.getX(i);uv.setXY(i,uv.getY(i),1-u);}
  }
  function box(x,y,z,w,h,d,m,p=still){
    let g=cube;if(m.map===Loom.woodMap){if(h>w&&h>d)g=upright;else if(d>w)g=lengthwise;}
    let o=mesh(g,m,p);o.scale.set(w,h,d);o.position.set(x,y,z);return o;}
  function ell(x,y,z,w,h,d,m,p=still){let o=mesh(ball,m,p);o.scale.set(w,h,d);o.position.set(x,y,z);return o;}
  function stick(a,b,r,m,p=still,r2=r,n=12){const v=b.clone().sub(a);let o=mesh(new T.CylinderGeometry(r2,r,v.length(),n),m,p);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return o;}
  function tube(pts,r,m,p=still){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),Math.max(10,pts.length*3),r,7,false),m,p);}
  function lathe(profile,m,x,y,z,p=still){const o=mesh(new T.LatheGeometry(profile.map(a=>new T.Vector2(...a)),40),m,p);o.position.set(x,y,z);return o;}
  const oak=wood('#ecdbc4'), amber=wood('#d3b89d'),cedar=wood('#b39477'),dark=wood('#826f60'),pale=wood('#fff1d4');
  const wall=mat('#ded2b3'),paper=mat('#eee4c8',{emissive:0xd2bf91,emissiveIntensity:.13}),border=mat('#63766b'),edging=mat('#a1a78a');
  const brass=mat('#a39973',{metalness:.65,roughness:.33}),steel=mat('#b7c5c4',{metalness:.74,roughness:.255});
  // Full-sized rush mats, with narrow woven heri along their long edges.
  box(0,-.11,2.4,10,.18,10.2,dark);
  const straw=[0xfffee8,0xf4f5d8,0xe8efd6].map(c=>mat(c,{map:Loom.matMap,roughness:.94}));
  function tatami(x,z,angle,idx){
    const g=new T.Group();still.add(g);g.position.set(x,-.027,z);g.rotation.y=angle;
    box(0,0,0,1.52,.056,3.04,straw[idx],g);
    for(const sign of [-1,1]){box(sign*.743,.0295,0,.033,.006,3.035,border,g);box(sign*.731,.0334,0,.002,.001,3.03,edging,g);}
  }
  for(let j=0;j<4;j++)for(let i=0;i<3;i++){let x=-3.04+i*3.04,z=-.75+j*3.04;if((i+j)%2){tatami(x-.76,z,0,(i+j)%3);tatami(x+.76,z,0,(i+j+1)%3);}
    else{tatami(x,z-.76,Math.PI/2,(i+j)%3);tatami(x,z+.76,Math.PI/2,(i+j+1)%3);}}
  box(-4.45,1.86,2.55,.14,3.8,10,wall);box(4.48,1.86,2.55,.14,3.8,10,wall);
  box(0,3.76,6.5,9,.13,17.8,wood('#b4aa90'));
  for(let x=-4.4;x<=4.5;x+=.43)box(x,3.682,6.5,.018,.016,17.7,cedar);
  for(let z=-2.17;z<=14;z+=2.7)box(0,3.53,z,9,.19,.18,cedar);
  box(0,.009,-2.32,9,.075,.24,amber);
  for(let z of [-2.37,-2.29])box(0,.05,z,8.9,.012,.019,dark);
  box(0,3.13,-2.35,8.9,.18,.21,cedar);box(0,3.39,-2.36,8.9,.36,.13,paper);
  for(let x=-4.4;x<4.5;x+=.36)box(x,3.39,-2.27,.025,.36,.032,amber);
  box(0,3.4,-2.26,9,.028,.04,amber);
  function shoji(x,w){
    box(x,1.52,-2.38,w,3,.044,paper);
    for(let sign of [-1,1])box(x+sign*(w/2-.032),1.53,-2.32,.07,3.03,.105,amber);
    for(let y of [.105,.36,2.99])box(x,y,-2.31,w,.066,.10,oak);
    box(x,.21,-2.335,w-.13,.23,.052,oak);
    for(let i=1;i<6;i++)box(x-w/2+w*i/6,1.67,-2.322,.018,2.58,.055,oak);
    for(let y=.65;y<2.99;y+=.345)box(x,y,-2.299,w-.1,.029,.06,oak);
    box(x+w*.34,1.05,-2.277,.065,.17,.008,dark);
  }
  shoji(-3.55,1.8);shoji(3.52,1.94);
  for(let z=-2.24;z<7;z+=2.25){box(-4.36,1.85,z,.145,3.7,.16,cedar);box(4.39,1.85,z,.145,3.7,.16,cedar);}
  for(let x of [-4.36,4.39]){box(x,.13,2.1,.16,.23,9.4,cedar);box(x,2.89,2.1,.17,.09,9.4,amber);}
  // Engawa, lower railing and stainless drying pole.
  for(let i=0;i<13;i++)box(0,-.079,-2.55-i*.16,9.4,.105,.155,i%3?oak:amber);
  box(0,.48,-4.45,9.4,.09,.11,cedar);box(0,.12,-4.45,9.4,.045,.075,cedar);
  for(let x=-4.5;x<4.6;x+=1.55)box(x,.21,-4.45,.085,.63,.08,cedar);
  for(const x of [-2.54,2.18]){
    box(x,.045,-3.11,.39,.15,.37,mat('#acae9e'));
    stick(V(x,.10,-3.11),V(x,1.84,-3.11),.031,steel);
    tube([V(x-.095,1.89,-3.11),V(x-.064,1.8,-3.11),V(x,1.77,-3.11),V(x+.065,1.8,-3.11),V(x+.095,1.89,-3.11)],.018,steel);
  }
  const rodGroup=new T.Group();scene.add(rodGroup);const rodParts=[];
  for(let i=0;i<6;i++)rodParts.push(stick(V(-2.83+i*.9,1.84,-3.11),V(-2.83+(i+1)*.9,1.84,-3.11),.038,steel,rodGroup));
  for(let x of [-2.84,2.58])ell(x,1.84,-3.11,.052,.042,.042,mat('#506875'));
  // Small ceramic vase in the edge of the room.
  box(-3.23,.26,-1.43,1.28,.09,.46,cedar);
  for(let x of [-3.73,-2.73])box(x,.13,-1.43,.1,.25,.38,cedar);
  const celadon=mat('#819b8c',{metalness:.13,roughness:.29});
  lathe([[.08,0],[.13,.02],[.17,.11],[.16,.22],[.09,.31],[.07,.35],[.075,.38],[.057,.38],[.055,.34]],celadon,-3.19,.31,-1.45);
  const branch=wood('#85785d'),leafM=[mat('#839069'),mat('#617b5b'),mat('#a0a072')];
  for(let i=0;i<4;i++){let a=V(-3.19,.66,-1.45),b=V(-3.39+i*.12,1.04+rng()*.26,-1.46+rng()*.13);stick(a,b,.007,branch,still,.003);
    for(let j=0;j<5;j++){let q=a.clone().lerp(b,.3+j*.13);let leaf=ell(q.x+(j%2?.04:-.04),q.y,q.z,.065,.014,.029,leafM[j%3]);leaf.rotation.z=(j%2?.56:-.56);}}
  // An elevated room overlooking a lake and overlapping, ridged mountains.
  const lake=mat('#90bec0',{metalness:.28,roughness:.30});
  box(0,-2.45,-31,145,.12,67,lake);
  const surfaceGeo=new T.PlaneGeometry(76,49,18,10);surfaceGeo.rotateX(-Math.PI/2);surfaceGeo.translate(0,-2.355,-27.5);
  const surface=mesh(surfaceGeo,lake,scene);surface.castShadow=false;
  const ripple=mat('#c7dad3',{metalness:.19,roughness:.28});
  const glints=new T.InstancedMesh(new T.SphereGeometry(1,8,4),ripple,209);scene.add(glints);
  const glintOffsets=Array.from({length:209},()=>[rng()*2-1,rng()*2-1,.35+rng()]);
  function ridge(z,base,high,color,seed,span,near){
    const cols=94,rows=8,pos=[],colors=[],ids=[];const C=new T.Color(color);
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      let x=(i/cols-.5)*span,f=j/rows;
      const peaks=.53+.22*Math.sin(x*.10+seed)+.15*Math.sin(x*.225+seed*.8)+.095*Math.sin(x*.42+seed*.5)+.021*Math.sin(x*2+seed);
      const y=base+Math.pow(f,.88)*high*peaks+.12*Math.sin(x*.7+f*6)*f;
      pos.push(x,y,z+near*(1-f)+1.7*Math.sin(x*.18+seed)*f);
      const tint=(.85+.18*f+.05*Math.sin(x*.55+f*3)+rng()*.05);colors.push(C.r*tint,C.g*tint,C.b*tint);
      if(i<cols&&j<rows){const k=j*(cols+1)+i;ids.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
    }
    let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ids);g.computeVertexNormals();let o=mesh(g,mat('#ffffff',{vertexColors:true,side:T.DoubleSide}));o.castShadow=false;
  }
  ridge(-55,-3,11.8,'#9db5bd',1.4,153,9);ridge(-44,-3,8.8,'#819fa2',4.8,133,8);
  ridge(-34,-2.45,7.3,'#78978b',8.5,112,6.5);
  const bank=mat('#85976e');ell(-11,-2.40,-12,9.3,1.04,5,bank);ell(12,-2.61,-17,9,1.1,4,bank);
  const roof=mat('#636f71'),plaster=mat('#e8dac0');
  for(let i=0;i<6;i++){let x=-12+i*1.21,z=-12.6+(i%2)*.65;box(x,-1.19,z,.81,.57,.70,plaster);for(let sign of [-1,1]){let r=box(x,-.83,z+sign*.205,.99,.07,.5,roof);r.rotation.x=sign*.43;}}
  const sail=new T.Group();scene.add(sail);sail.position.set(-8,-2.33,-15);
  ell(0,.03,0,.59,.10,.17,cedar,sail);stick(V(0,.06,0),V(0,1.13,0),.015,pale,sail);
  function triangle(pts,m,p){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.computeVertexNormals();return mesh(g,m,p);}
  triangle([-.46,.17,0,-.035,1.06,0,-.035,.20,.045],mat('#f4e8c8',{side:T.DoubleSide}),sail);
  triangle([.04,.93,0,.42,.22,0,.04,.2,.03],mat('#d4af89',{side:T.DoubleSide}),sail);
  // Fine broadleaf clusters grow along woody branches; the canopy frames the opening.
  const leafShape=new T.SphereGeometry(1,7,4);
  const twig=wood('#716b57'),leaves=[0x849566,0x98a374,0x617e5a,0xb1b580,0x78946c].map(c=>mat(c,{side:T.DoubleSide}));
  function tree(x,y,z,size){
    const a=V(x,y,z),mid=V(x+.13*size,y+1.5*size,z),top=V(x-.04*size,y+2.9*size,z);
    stick(a,mid,.15*size,twig,still,.103*size);stick(mid,top,.11*size,twig,still,.045*size);
    for(let i=0;i<22;i++){let az=i*2.399+rng()*.6,l=(.44+rng()*.88)*size;
      let p=mid.clone().lerp(top,rng()*.94);let q=p.clone().add(V(Math.cos(az)*l, (.16+rng()*.65)*size,Math.sin(az)*l));
      stick(p,q,.039*size,twig,still,.007*size,7);
      for(let j=0;j<19;j++){let d=rng()*.46*size,an=rng()*6.28;
        let o=ell(q.x+Math.cos(an)*d,q.y+(.15-rng()*.36)*size,q.z+Math.sin(an)*d,.09*size+rng()*.11*size,.030*size,.09*size,leaves[(i+j)%5]);o.geometry=leafShape;o.rotation.set(rng()*.5,rng()*3,rng()*.44-.2);}
    }
  }
  tree(-4.95,-2.1,-6.65,1.65);tree(3.85,-2.3,-6.4,1.6);
  // Glass wind bell, inner striker and indigo paper tanzaku.
  const bell=new T.Group();scene.add(bell);bell.position.set(1.23,3.04,-2.46);
  const thread=mat('#796f54'),glass=mat('#b8dddb',{roughness:.12,metalness:.36,transparent:true,opacity:.49,side:T.DoubleSide});
  stick(V(0,0,0),V(0,-.255,0),.005,thread,bell);
  lathe([[.149,0],[.157,.036],[.15,.108],[.119,.17],[.055,.205],[.012,.21]],glass,0,-.47,0,bell);
  const cobalt=mat('#577e9a',{roughness:.31});
  for(let i=0;i<15;i++){const a=i*2.4;ell(.146*Math.cos(a),-.44+(i%3)*.021,.146*Math.sin(a),.011,.009,.011,cobalt,bell);}
  const strip=new T.Group();strip.position.y=-.365;bell.add(strip);stick(V(0,.04,0),V(0,-.20,0),.003,thread,strip);ell(0,-.07,0,.038,.03,.038,brass,strip);
  box(0,-.36,0,.095,.33,.005,mat('#7398aa',{side:T.DoubleSide}),strip);
  for(let j=0;j<3;j++)box(0,-.459-j*.014,.004,.082,.003,.002,paper,strip);
  // A folded-paper pinwheel responds to each passing gust.
  const pin=new T.Group();scene.add(pin);pin.position.set(-2.08,1.08,-4.39);
  stick(V(-2.08,.50,-4.40),V(-2.08,1.11,-4.40),.011,pale);
  const pinM=[mat('#b88770',{side:T.DoubleSide}),mat('#ead9ac',{side:T.DoubleSide})];
  for(let i=0;i<4;i++){let t=triangle([0,0,0,.195,.055,-.035,.114,.166,.035],pinM[i%2],pin);t.rotation.z=i*Math.PI/2;}ell(0,0,.03,.025,.025,.018,brass,pin);
  // Batch stationary objects by material to keep the detailed joinery inexpensive on touch devices.
  function batch(group){
    group.updateMatrixWorld(true);const bins=new Map();
    group.traverse(o=>{if(!o.isMesh)return;let key=o.material.uuid+o.castShadow;let b=bins.get(key);
      if(!b){b={mat:o.material,shadow:o.castShadow,pos:[],normal:[],uv:[],color:[],idx:[]};bins.set(key,b);}
      const g=o.geometry,ps=g.attributes.position,ns=g.attributes.normal,uv=g.attributes.uv,cs=g.attributes.color,base=b.pos.length/3;
      const nmat=new T.Matrix3().getNormalMatrix(o.matrixWorld),p=new T.Vector3(),n=new T.Vector3();
      for(let i=0;i<ps.count;i++){p.fromBufferAttribute(ps,i).applyMatrix4(o.matrixWorld);b.pos.push(p.x,p.y,p.z);n.fromBufferAttribute(ns,i).applyMatrix3(nmat).normalize();b.normal.push(n.x,n.y,n.z);if(uv)b.uv.push(uv.getX(i),uv.getY(i));else b.uv.push(0,0);if(cs)b.color.push(cs.getX(i),cs.getY(i),cs.getZ(i));}
      if(g.index)for(let i=0;i<g.index.count;i++)b.idx.push(base+g.index.getX(i));else for(let i=0;i<ps.count;i++)b.idx.push(base+i);
    });
    group.clear();for(const b of bins.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));if(b.color.length)g.setAttribute('color',new T.Float32BufferAttribute(b.color,3));g.setIndex(b.idx);let o=mesh(g,b.mat,group);o.castShadow=b.shadow;}
  }
  batch(still);
  return {V,mesh,box,ell,stick,tube,lathe,brass,steel,still,bell,strip,pin,sail,rodParts,rodGroup,surface,glints,glintOffsets};
}
