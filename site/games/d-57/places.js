'use strict';
function floralPaper(){
  const tex=texture(canvas(256,256,(c,w,h)=>{
    c.fillStyle='#e3d9b9';c.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=4){c.fillStyle=x%8?'#f9eed118':'#867d6d0e';c.fillRect(x,0,1,h);}
    c.strokeStyle='#9a9a7c48';c.fillStyle='#a2a2874d';c.lineWidth=1.6;
    for(let j=-1;j<4;j++)for(let i=-1;i<4;i++){let x=i*85.33+(j%2)*42.66,y=j*85.33;
      c.save();c.translate(x,y);c.beginPath();c.moveTo(0,24);c.bezierCurveTo(-3,9,5,-5,0,-24);c.stroke();
      for(let s of [-1,1])for(let k=0;k<3;k++){let yy=14-k*10;c.beginPath();c.moveTo(0,yy);c.bezierCurveTo(s*11,yy-2,s*11,yy-9,s*12,yy-13);c.quadraticCurveTo(s*2,yy-12,0,yy);c.fill();}
      c.beginPath();c.ellipse(0,-22,3.5,6,0,0,TAU);c.fill();c.restore();}
  }));tex.repeat.set(2.7,2.2);return standard(0xe3ddca,.85,0,{map:tex});
}
function furniture(parent){
  const g=group(parent),body=group(g),top=.93;
  box(body,0,top-.09,.02,3.48,.13,1.77,M.darkwood);
  box(body,0,top-.028,.02,3.55,.058,1.80,M.edge);
  for(let i=0;i<6;i++)box(body,0,top+.005,-.72+i*.298,3.51,.025,.296,i%3?M.walnut:M.edge);
  box(body,0,.496,.08,3.32,.73,1.55,M.walnut);
  const front=.867;
  for(let i=-1;i<=1;i++){let x=i*1.06;
    plaque(body,x,.54,front,1.01,.395,.025,.025,M.darkwood);
    plaque(body,x,.55,front+.031,.941,.325,.013,.012,M.edge);
    plaque(body,x,.55,front+.05,.845,.235,.009,.025,M.walnut);
    for(let s of [-1,1]){let a=cyl(body,x+s*.145,.58,front+.071,.037,.02,M.brass);a.rotation.x=PI/2;}
    line(body,[[x-.145,.578,front+.085],[x-.12,.507,front+.13],[x,.477,front+.154],[x+.12,.507,front+.13],[x+.145,.578,front+.085]],.014,M.brass);
  }
  box(body,0,.773,.886,3.38,.021,.023,M.gold);
  box(body,0,.264,.874,3.35,.047,.034,M.edge);
  for(let x of [-1.62,1.62])for(let z of [-.59,.72]){
    cyl(body,x,.12,z,.085,.23,M.darkwood,.065);oval(body,x,.205,z,.11,.052,.105,M.edge);}
  // Vegetable-tanned work pad with two stamped borders and corner tooling.
  const pad=standard(0x5b6d60,.79,0,{map:hideTex,bumpMap:hideTex,bumpScale:.0015});
  const mat=plaque(body,0,top+.029,-.038,2.94,1.30,.008,.105,pad);mat.rotation.x=-PI/2;
  function border(w,d,rad,material){const points=[];for(let [x,z,a] of [[w/2-rad,d/2-rad,0],[-w/2+rad,d/2-rad,90],[-w/2+rad,-d/2+rad,180],[w/2-rad,-d/2+rad,270]]){
    for(let j=0;j<=8;j++){let f=(a+j*90/8)*PI/180;points.push(V(x+rad*Math.cos(f),top+.044,-.038+z+rad*Math.sin(f)));}}
    points.push(points[0]);line(body,points,.0028,material,false);}
  border(2.85,1.21,.093,M.gold);border(2.811,1.171,.08,M.green);
  for(let sx of [-1,1])for(let sz of [-1,1])for(let j=0;j<3;j++){let o=oval(body,sx*(1.306-.026*j),top+.044,sz*(.493-.01*j)-.038,.025,.0024,.0085,M.gold);o.rotation.y=sx*sz*(.5+j*.5);}
  batch(body);return g;
}
function tin(parent){
  const root=group(parent,1.025,.981,.32),base=group(root),r=.214,cream=standard(0xecc575,.34),inner=standard(0xd8af60,.43);
  cyl(base,0,.079,0,r,.155,M.green,r*.99,80);
  for(let y of [.015,.024,.12,.145,.155])ring(base,0,y,0,r+.001,y===.155?.008:.0027,y===.12?M.gold:M.brass);
  cyl(base,0,.147,0,r*.965,.018,M.brass,r*.965,80);
  const wax=group(root,0,.153,0);oval(wax,0,-.001,0,r*.937,.018,r*.937,cream);
  const swirl=[];for(let i=0;i<85;i++){let t=i/84,angle=1.2+t*TAU*1.43,rad=.016+.15*t;swirl.push(V(rad*Math.cos(angle),.0176-.008*t*t,rad*Math.sin(angle)));}line(wax,swirl,.0028,inner,false);
  const lid=group(root,.129,.217,-.273);lid.rotation.x=1.08;lid.rotation.z=-.24;
  cyl(lid,0,0,0,r*1.035,.052,M.brass,r*1.035,80);
  cyl(lid,0,.026,0,r*.995,.008,M.green,r*.995,80);
  for(let rr of [.189,.179,.157,.076,.059])ring(lid,0,.034,0,rr,rr===.189?.004:.0025,M.gold);
  // Embossed sun and seed motifs identify the wax tin without lettering.
  const emblem=group(lid,0,.035,0);oval(emblem,0,.003,0,.048,.009,.048,M.gold);
  for(let i=0;i<16;i++){let a=i/16*TAU,petal=oval(emblem,Math.sin(a)*.115,0,Math.cos(a)*.115,.008,.004,i%2?.023:.032,M.gold);petal.rotation.y=a;}
  for(let i=0;i<72;i++){let a=i*TAU/72;oval(lid,.209*Math.cos(a),-.002,.209*Math.sin(a),.0026,.019,.0026,M.brass);}
  batch(base);batch(lid);return {root,wax};
}
function buildHall(scene){
  const g=group(scene),walls=group(g),paper=floralPaper(),panel=standard(0x81938a,.55),frame=standard(0xa3aa96,.5),creamTrim=standard(0xdfd2b3,.55);
  const floorM=[0xb7895a,0xad8055,0xb68d64,0x9f7854,0xc09468].map(timber);
  const plankMeshes=[];
  for(let j=0;j<22;j++){let z=2.21-j*.414;const row=group(g,0,0,z);
    let joints=j%3===0?[-2.67,-.37,1.44,2.67]:j%3===1?[-2.67,-1.53,.80,2.67]:[-2.67,-.92,1.81,2.67];
    for(let k=0;k<3;k++)box(row,(joints[k]+joints[k+1])/2,-.042,0,joints[k+1]-joints[k]-.009,.083,.408,floorM[(j*7+k*13)%5]);
    if(z<=.22&&z>=-7.2)plankMeshes.push({row,index:Math.max(0,Math.min(17,Math.floor((-z+.1)/.41)))});else{row.updateMatrix();walls.attach(row);}
  }
  box(walls,0,-.13,-2.5,5.4,.14,11,M.darkwood);
  // Panelled side walls. The left window is a genuine opening with a deep sill and muntins.
  for(let side of [-1,1]){
    const x=side*2.63;box(walls,x,.64,-2,.16,1.28,9.35,panel);
    if(side===1)box(walls,x,2.77,-2,.16,3.12,9.35,paper);
    else{box(walls,x,3.93,-2,.16,.84,9.35,paper);box(walls,x,2.47,-5.53,.16,2.19,2.21,paper);box(walls,x,2.47,1.98,.16,2.19,1.37,paper);
      for(let z=-4.47;z<1.4;z+=1.15)box(walls,x,2.42,z,.12,2.21,.057,creamTrim);
      for(let y of [1.37,2.51,3.51])box(walls,x,y,-1.56,.11,.047,5.89,creamTrim);
      box(walls,x+.03,1.33,-1.55,.34,.09,6.02,M.oak);}
    for(let z=-6.3;z<2.8;z+=.79){box(walls,x-side*.09,.63,z,.035,1.14,.058,frame);
      box(walls,x-side*.091,.27,z+.40,.018,.025,.61,frame);}
    for(let [y,h] of [[.102,.18],[1.14,.065],[1.23,.087]])box(walls,x-side*.10,y,-2,.094,h,9.35,y<.2?M.darkwood:frame);
    box(walls,x-side*.09,3.92,-2,.11,.13,9.35,creamTrim);
  }
  // Arched portal and fanlight have open sightlines into the garden.
  const zw=-6.52,r=1.22,spring=2.15;
  for(let s of [-1,1]){
    box(walls,s*(2.75+r)/2,2.12,zw,2.75-r,4.24,.24,paper);
    box(walls,s*(2.75+r)/2,.64,zw+.14,2.75-r,1.28,.085,panel);
    box(walls,s*(2.75+r)/2,1.24,zw+.18,2.75-r,.09,.13,frame);
    for(let x=r+.12;x<2.8;x+=.62)box(walls,s*x,.65,zw+.19,.052,1.13,.045,frame);
  }
  const sp=new T.Shape();sp.moveTo(-r,4.25);sp.lineTo(r,4.25);sp.lineTo(r,spring);sp.absarc(0,spring,r,0,PI,false);sp.lineTo(-r,4.25);
  mesh(walls,new T.ExtrudeGeometry(sp,{depth:.23,bevelEnabled:false}),paper,0,0,zw-.105);
  for(let [rad,th,mat] of [[1.31,.074,creamTrim],[1.235,.040,M.edge],[1.18,.021,M.green]]){
    const arr=[[-rad,0,zw+.146],[-rad,spring,zw+.146]];for(let i=1;i<=52;i++){let a=PI-PI*i/52;arr.push([rad*Math.cos(a),spring+rad*Math.sin(a),zw+.146]);}arr.push([rad,0,zw+.146]);line(walls,arr,th,mat,false);}
  box(walls,0,spring,zw+.07,r*2,.065,.14,M.edge);
  for(let i=1;i<8;i++){let a=i*PI/8;line(walls,[[0,spring,zw+.06],[r*.97*Math.cos(a),spring+r*.97*Math.sin(a),zw+.06]],.016,M.gold);}
  const dLeaf=[];for(let s of [-1,1]){
    const hinge=group(g,s*r,0,zw-.04),door=group(hinge,-s*r/2,0,0);
    for(let x of [-.56,.56])box(door,x,1.055,0,.084,2.11,.082,M.green);
    for(let y of [.065,.80,2.07])box(door,0,y,0,r,.09,.082,M.green);
    box(door,0,.43,0,1.08,.68,.065,panel);box(door,0,.43,.039,.91,.51,.025,frame);
    for(let x of [-.20,.20])box(door,x,1.44,0,.026,1.22,.038,frame);
    box(door,0,1.51,0,1.1,.033,.04,frame);
    oval(door,-s*.47,.91,.075,.043,.043,.033,M.brass);batch(door);dLeaf.push(hinge);
  }
  // Boots' destination is visible through the open fanlight and French doors.
  batch(walls);g.scale.y=.78;return {plankMeshes,dLeaf};
}
const leafBlade=(()=>{const geo=new T.BufferGeometry(),p=[],uv=[],idx=[];
  for(let i=0;i<=6;i++){const t=i/6,width=Math.max(.012,Math.sin(PI*t)**.83);
    for(let j=-1;j<=1;j++){p.push(t*2-1,.35*Math.sin(t*PI)+(1-Math.abs(j))*.68*width,j*width);uv.push(t,(j+1)*.5);}
    if(i<6)for(let j=0;j<2;j++){let a=i*3+j;idx.push(a,a+1,a+3,a+1,a+4,a+3);}}
  geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return geo;})();
function potPlant(g,x,y,z,scale=1,flowers=false){
  const p=group(g,x,y,z);p.scale.setScalar(scale);const pot=standard(0xb47e5e,.86);
  cyl(p,0,.16,0,.19,.32,pot,.135);cyl(p,0,.307,0,.20,.057,pot);cyl(p,0,.339,0,.168,.010,M.soil);
  for(let j=0;j<11;j++){const a=j*2.4,len=.27+rand()*.22,h=.30+rand()*.31;
    const tip=V(Math.cos(a)*len,.35+h,Math.sin(a)*len);line(p,[[0,.32,0],[tip.x*.52,.35+h*.84,tip.z*.52],tip],.006,M.leaf3);
    for(let k=1;k<=6;k++){let f=k/7;for(let s of [-1,1]){const o=mesh(p,leafBlade,k%3?M.leaf:M.leaf2,tip.x*f-s*Math.sin(a)*.043,.34+h*(1-(1-f)**1.5),tip.z*f+s*Math.cos(a)*.043);o.scale.set(.078*(1-f*.45),.009,.024);o.rotation.y=-a+s*.60;o.rotation.z=.27;}}
    if(flowers){for(let k=0;k<5;k++){const a2=k*TAU/5;oval(p,tip.x+.025*Math.cos(a2),tip.y+.014,tip.z+.025*Math.sin(a2),.025,.018,.023,flowerPetal);}oval(p,tip.x,tip.y+.026,tip.z,.015,.01,.015,M.gold);}}
  return p;
}
const flowerPetal=standard(0xe8d9b5,.79);
function tree(g,x,z,scale,shades=[M.leaf,M.leaf2,M.leaf3]){
  const p=group(g,x,0,z);p.scale.setScalar(scale);const bark=M.darkwood;
  line(p,[[0,0,0],[.02,1.07,.03],[-.11,1.84,0],[.05,2.65,.2]],.097,bark);
  for(let i=0;i<15;i++){
    const a=i*2.399,l=.43+rand()*.72,y=1.98+rand()*1.09,px=Math.cos(a)*l,pz=Math.sin(a)*l;
    line(p,[[0,1.13+rand()*.54,0],[px*.48,y-.38,pz*.47],[px,y,pz]],.028,bark);
    for(let j=0;j<9;j++){let ox=px+(rand()-.5)*.75,oz=pz+(rand()-.5)*.7,oy=y+(rand()-.4)*.59;
      const o=mesh(p,new T.IcosahedronGeometry(1,1),shades[(i+j)%3],ox,oy,oz);o.scale.set(.23+rand()*.13,.15+rand()*.10,.22+rand()*.09);o.rotation.set(rand(),rand(),rand());}
  }return p;
}
function garden(scene){
  const g=group(scene),fixed=group(g),grass=standard(0x939878,.95,0,{map:hideTex}),sand=standard(0xb3a98d,.93,0,{map:hideTex,bumpMap:hideTex,bumpScale:.012});
  box(fixed,0,-.16,-11,18,.25,9.4,grass);box(fixed,0,-.056,-10.62,3.62,.109,8.53,sand);
  for(let s of [-1,1])for(let i=0;i<18;i++){let o=box(fixed,s*1.82,.009,-6.49-i*.461,.107,.098,.421,M.stone);o.rotation.y=(rand()-.5)*.09;}
  // Shallow stone runnel, water feed and the garden's paddle wheel.
  const aqua=standard(0x91afa3,.105,.28);
  box(fixed,1.59,-.005,-10.64,.55,.058,7.2,aqua);
  box(fixed,1.27,.036,-10.64,.086,.14,7.37,M.stone);box(fixed,1.96,.04,-10.64,.1,.14,7.37,M.stone);
  const wheel=group(g,1.57,.53,-10.39);wheel.rotation.y=PI/2-.12;
  for(let s of [-1,1]){let r=ring(wheel,0,0,s*.14,.445,.034,M.edge);r.rotation.x=0;
    for(let i=0;i<8;i++){let a=i*TAU/8;line(wheel,[[0,0,s*.14],[.445*Math.cos(a),.445*Math.sin(a),s*.14]],.018,M.walnut);}}
  for(let i=0;i<10;i++){let a=i*TAU/10,o=box(wheel,.445*Math.cos(a),.445*Math.sin(a),0,.14,.035,.36,M.oak);o.rotation.z=a;}
  let hub=cyl(wheel,0,0,0,.079,.39,M.brass);hub.rotation.x=PI/2;batch(wheel);
  for(let x of [1.32,1.82])box(fixed,x,.26,-10.39,.096,.57,.113,M.darkwood);
  const bucket=group(g,1.56,.95,-10.94),copper=standard(0xb28b64,.32,.63);
  const tubProfile=[V(.10,-.17),V(.142,-.12),V(.187,.107),V(.188,.12),V(.177,.12),V(.162,.001),V(.123,-.123),V(.096,-.153),V(.001,-.153)].map(p=>new T.Vector2(p.x,p.y));
  const tub=mesh(bucket,new T.LatheGeometry(tubProfile,40),pbrBoth(copper));ring(bucket,0,.118,0,.185,.009,M.brass);
  line(bucket,[[-.18,.088,0],[-.182,.22,0],[0,.296,0],[.182,.22,0],[.18,.088,0]],.012,M.darkwood);
  const filling=oval(bucket,0,0,0,.161,.009,.161,aqua);
  for(let x of [1.32,1.80]){box(fixed,x,.483,-10.94,.059,.94,.065,M.oak);let pin=cyl(fixed,x,.948,-10.94,.032,.073,M.brass);pin.rotation.z=PI/2;}
  const trough=group(fixed,1.93,1.20,-11.04);box(trough,0,-.13,0,.17,.26,.15,M.stone);
  line(trough,[[0,0,0],[0,.051,0],[-.12,.075,0],[-.23,.057,0],[-.27,.021,0]],.022,M.brass);

  for(let s of [-1,1]){
    box(fixed,s*3.37,.49,-10.50,.23,.98,8.9,M.stone);box(fixed,s*3.37,1.01,-10.50,.32,.10,8.9,M.cream);
    for(let i=0;i<17;i++){let z=-6.36-.5*i,x=s*(2.50+rand()*.4);let o=oval(fixed,x,.18,z,.42,.25+rand()*.28,.44,i%2?M.leaf:M.leaf2);o.rotation.y=rand()*2;
      for(let j=0;j<4;j++){let xx=x+(rand()-.5)*.53,zz=z+(rand()-.5)*.46;oval(fixed,xx,.46+rand()*.13,zz,.045,.038,.048,j%2?flowerPetal:M.gold);}}
  }
  tree(fixed,-2.94,-8.82,1.31);tree(fixed,3.02,-13.24,1.45);tree(fixed,-4.78,-14.84,1.17);
  // Low wooden garden wicket at the side of the path.
  for(let s of [-1,1])for(let k=0;k<7;k++){let x=s*(1.69+k*.24);box(fixed,x,.49,-14.03,.128,.94,.09,creamFence);let head=mesh(fixed,new T.ConeGeometry(.093,.15,4),creamFence,x,1.025,-14.03);head.rotation.y=PI/4;}
  for(let s of [-1,1])for(let y of [.30,.74])box(fixed,s*2.43,y,-14.1,1.65,.082,.07,creamFence);
  batch(fixed);return {wheel,bucket,filling};
}
const creamFence=standard(0xd0c7aa,.73);
function lamp(g,x,y,z){
  const mount=group(g,x,y,z),f=group(mount);line(f,[[0,0,0],[0,-.112,0]],.015,M.brass);
  const bronze=standard(0x534d3e,.42,.52),glow=standard(0xedcb91,.18,.15,{emissive:0xf4ac4e,emissiveIntensity:.1});
  cyl(f,0,-.16,0,.17,.09,bronze,.246,4).rotation.y=PI/4;
  const globe=cyl(f,0,-.383,0,.197,.36,glow,.133,4);globe.rotation.y=PI/4;
  cyl(f,0,-.588,0,.159,.064,bronze,.09,4).rotation.y=PI/4;
  oval(f,0,-.646,0,.033,.05,.033,M.brass);
  for(let a=0;a<4;a++){let q=PI/4+a*PI/2;line(f,[[.2*Math.cos(q),-.198,.2*Math.sin(q)],[.134*Math.cos(q),-.561,.134*Math.sin(q)]],.011,bronze);}
  batch(f);return {mount,glow};
}
function lane(scene){
  const g=group(scene),fixed=group(g),lamps=[],windowM=[];
  const tile=[0x89958d,0xa6a59a,0x979b92,0x7d8c87,0x9e9b8d,0xa6aaa1].map(c=>standard(c,.225,.17,{map:hideTex,bumpMap:hideTex,bumpScale:.002}));
  box(fixed,0,-.094,-19.8,12,.15,12.1,M.stone);
  for(let j=0;j<24;j++)for(let i=-3;i<4;i++)box(fixed,i*.78+((j%2)*.38),-.014,-14.25-j*.503,.766,.032,.49,tile[(rand()*6)|0]);
  const palettes=[0xa39476,0x86988b,0xba977e,0x9da5a1].map(c=>standard(c,.86));
  const paint=[standard(0x526c62,.48),standard(0x73645a,.49)];
  for(let s of [-1,1])for(let j=0;j<3;j++){
    const zz=-15.94-3.3*j,f=group(fixed,s*2.7,0,zz);f.rotation.y=-s*PI/2;
    box(f,0,2.32,-.55,3.27,4.64,1.14,palettes[(j+(s>0?1:0))%4]);
    box(f,0,.23,.058,3.25,.44,.15,paint[j%2]);box(f,0,2.25,.065,3.28,.32,.14,paint[j%2]);
    const glass=standard(0xbaa982,.18,.32,{emissive:0xf0b572,emissiveIntensity:.07});windowM.push(glass);
    box(f,-.49,1.23,.097,1.69,1.46,.09,glass);
    for(let x of [-1.37,-.86,-.27,.40])box(f,x,1.24,.18,.047,1.60,.062,paint[j%2]);
    for(let y of [.45,1.56,2.0])box(f,-.485,y,.18,1.82,.064,.07,paint[j%2]);
    box(f,.992,1.0,.068,.91,2.0,.12,paint[j%2]);box(f,.992,1.36,.137,.71,.96,.04,glass);oval(f,1.31,.91,.172,.024,.035,.028,M.brass);
    for(let i=0;i<14;i++){let strip=box(f,-1.50+.23*i,2.23,.374,.231,.047,.72,i%2?creamFence:paint[j%2]);strip.rotation.x=.23;
      box(f,-1.50+.23*i,2.096,.718,.231,.144,.04,i%2?creamFence:paint[j%2]);}
    for(let x of [-.78,.78]){box(f,x,3.29,.02,.79,1.02,.11,creamFence);box(f,x,3.29,.095,.66,.89,.038,M.glass);box(f,x,3.29,.134,.026,.91,.04,creamFence);}
    box(f,0,4.55,0,3.32,.13,.31,M.edge);
    potPlant(f,-1.34,0,.46,.71,true);
  }
  for(let i=0;i<5;i++){let s=i%2?1:-1,z=-15.4-i*1.56;line(fixed,[[s*2.62,2.17,z],[s*2.04,2.13,z],[s*1.96,1.99,z]],.025,M.darkwood);
    lamps.push(lamp(g,s*1.96,1.99,z));}
  // A lit shoe shop facing the end of the lane.
  box(fixed,0,2.30,-24.55,6.2,4.6,.7,palettes[2]);box(fixed,0,1.32,-24.13,1.48,2.63,.19,M.green);
  mesh(fixed,new T.ExtrudeGeometry(archShape(1.13,2.2),{depth:.046,bevelEnabled:false}),M.glass,0,.17,-24.0);
  for(let s of [-1,1]){box(fixed,s*1.83,1.22,-24.13,1.78,1.66,.19,M.brass);box(fixed,s*1.83,1.22,-24.0,1.68,1.55,.1,windowM[0]);box(fixed,s*1.83,1.22,-23.92,.047,1.56,.075,M.green);}
  box(fixed,0,2.76,-24.03,5.88,.27,.39,M.green);potPlant(fixed,-1.23,0,-23.54,1.13,true);
  batch(fixed);return {lamps,windowM};
}
