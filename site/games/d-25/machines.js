const Machines=(()=>{
  const {T,mat,group,obj,box,soft,cyl,ball,bar,loop,torus,face,pack}=Art;
  const red=mat(0xb63127,.33,.32),lightRed=mat(0xcd4735,.39,.24),darkRed=mat(0x81251e,.52,.18),ivory=mat(0xe9d5a7,.5,.2),
    steel=mat(0x777a70,.29,.77),black=mat(0x303435,.55,.4),rubber=mat(0x282c2b,.94),tread=mat(0x373a37,.91),bronze=mat(0xc69551,.4,.53),
    glass=new T.MeshPhysicalMaterial({color:0x536f71,metalness:.27,roughness:.13,clearcoat:1,envMapIntensity:1.3,transparent:true,opacity:.79,side:T.DoubleSide,roughnessMap:Art.rough});
  function wheel(parent,x,y,z,r,width,hub){
    const w=group(parent,x,y,z);
    const profile=[[.39,-.44],[.65,-.51],[.84,-.49],[.95,-.38],[.995,-.2],[1,.2],[.95,.38],[.84,.49],[.65,.51],[.39,.44],[.39,-.44]];
    const tire=obj(w,new T.LatheGeometry(profile.map(([a,b])=>new T.Vector2(a*r,b*width)),40),rubber);tire.rotation.z=Math.PI/2;
    for(let i=0;i<30;i++)for(const side of [-1,1]){
      const a=i*Math.PI/15+side*.042,rr=r*.991;
      const lug=soft(w,side*width*.22,Math.cos(a)*rr,Math.sin(a)*rr,width*.55,.076*r,.15*r,.022*r,tread);
      lug.rotation.order='XYZ';lug.rotation.x=a;lug.rotateY(side*.44);
    }
    for(const side of [-1,1]){
      const sx=side*width*.49;
      bar(w,[sx-.025,y*0,0],[sx+.025,0,0],r*.53,hub,32);
      const rim=torus(w,sx+side*.03,0,0,r*.47,.035*r,ivory);rim.rotation.y=Math.PI/2;
      bar(w,[sx,0,0],[sx+side*.10,0,0],r*.19,steel,20);
      for(let j=0;j<8;j++){const a=j*Math.PI/4;bar(w,[sx,Math.cos(a)*r*.29,Math.sin(a)*r*.29],[sx+side*.055,Math.cos(a)*r*.29,Math.sin(a)*r*.29],r*.039,steel,6);}
    }
    return pack(w);
  }
  function wheatMark(p,x,y,z,s){
    const gold=ivory;
    bar(p,[x,y-.36*s,z],[x,y+.32*s,z],.018*s,gold);
    for(let i=0;i<3;i++)for(const side of [-1,1]){
      const a=ball(p,x,y+(-.15+i*.16)*s,z+side*.095*s,.014*s,.13*s,.055*s,gold);
      a.rotation.x=side*.65;
    }
    ball(p,x,y+.34*s,z,.014*s,.12*s,.056*s,gold);
  }
  function combine(parent){
    const base=group(parent),h=group(base),wheels=[];
    for(const s of [-1,1]){wheels.push(wheel(base,s*1.23,.91,-.93,.91,.61,ivory));wheels.push(wheel(base,s*1.08,.63,1.63,.63,.46,ivory));}
    soft(h,0,.98,.12,2.28,.62,4.4,.13,black);
    soft(h,0,1.7,.5,2.43,1.32,3.87,.21,darkRed);
    soft(h,0,2.15,.77,2.68,1.22,3.52,.23,red);
    soft(h,0,2.45,1.0,2.62,.49,2.97,.16,lightRed);
    // Harvester side skins, raised belt line, engine louvers and servicing latches.
    for(const s of [-1,1]){
      const x=s*1.349;
      face(h,[[x,2.25,-.88],[x,2.38,-.66],[x,2.38,2.29],[x,2.30,2.34],[x,2.29,-.53]],ivory);
      face(h,[[x,2.18,-.83],[x,2.23,-.68],[x,2.25,2.25],[x,2.21,2.24]],bronze);
      soft(h,x,1.93,1.76,.035,.48,.75,.014,darkRed);
      for(let j=0;j<8;j++)box(h,x+s*.032,1.92,1.47+j*.081,.021,.31,.028,black).rotation.x=.12;
      wheatMark(h,x+s*.012,1.92,.08,.70);
      for(const zz of [-.59,.67])soft(h,x,1.87,zz,.045,.043,.15,.016,steel);
      box(h,x*.915,1.58,-.29,.25,.08,1.32,black);
    }
    // Engine radiator at the rounded tail and inset enamel chevrons.
    soft(h,0,2.05,2.54,1.85,.64,.08,.034,black);
    for(let j=0;j<10;j++)box(h,0,1.80+j*.052,2.59,1.72,.014,.025,steel);
    for(const s of [-1,1]){
      soft(h,s*.99,1.68,2.51,.28,.13,.12,.035,mat(0xe8ac56,.19,.24));
      soft(h,s*.96,1.43,2.42,.3,.09,.08,.025,red);
    }
    // Open four-sided grain hopper. The movable grain surface uses a constant area.
    const bottom=2.71,top=3.48,front=-.35,back=1.72;
    box(h,0,3.04,.685,2.45,.09,2.1,black);
    for(const s of [-1,1]){
      box(h,s*1.22,(top+bottom)/2,.685,.095,top-bottom,2.1,red);
      bar(h,[s*1.24,top,front],[s*1.24,top,back],.046,bronze);
      box(h,s*1.274,top-.12,.685,.018,.04,1.98,ivory);
    }
    for(const zz of [front,back]){box(h,0,(top+bottom)/2,zz,2.49,top-bottom,.10,red);bar(h,[-1.24,top,zz],[1.24,top,zz],.048,bronze);}
    const load=group(base,0,bottom+.03,.68);
    box(load,0,0,0,2.32,.05,1.91,0xc89a4c);
    for(let i=0;i<80;i++)ball(load,(Art.rand()-.5)*2.28,.028,(Art.rand()-.5)*1.86,.04,.024,.062,0xe1b866,6);
    pack(load);
    // Sloping cab glass is framed by structural pillars, roof gutter and headlights.
    const topPts=[[-1.10,3.64,-2.08],[1.10,3.64,-2.08],[1.10,3.64,-.53],[-1.10,3.64,-.53]];
    const low=[[-1.02,1.94,-1.82],[1.02,1.94,-1.82],[1.02,1.94,-.53],[-1.02,1.94,-.53]];
    soft(h,0,1.89,-1.27,2.29,.25,1.78,.07,red);soft(h,0,3.73,-1.32,2.55,.22,1.95,.09,lightRed);
    soft(h,0,3.61,-1.31,2.41,.10,1.84,.04,black);
    for(let i=0;i<4;i++){let j=(i+1)%4;face(h,[low[i],low[j],topPts[j],topPts[i]],glass);bar(h,low[i],topPts[i],.059,black);bar(h,topPts[i],topPts[j],.047,black);bar(h,low[i],low[j],.06,black);}
    soft(h,0,2.27,-1.02,.64,.13,.66,.05,black);soft(h,0,2.57,-.78,.61,.64,.14,.06,black).rotation.x=-.15;
    bar(h,[0,2.0,-1.52],[0,2.55,-1.68],.045,black);torus(h,0,2.59,-1.68,.19,.023,black).rotation.x=1.0;
    for(const s of [-1,1]){
      for(const xx of [.72,.94])soft(h,s*xx,3.68,-2.29,.16,.09,.045,.017,ivory);
      loop(h,[[s*1.08,3.45,-1.75],[s*1.54,3.45,-1.7],[s*1.62,3.12,-1.7]],.031,black);
      soft(h,s*1.62,3.1,-1.7,.14,.31,.14,.046,black);
    }
    cyl(h,-.80,3.9,-.68,.12,.15,.17,mat(0xe49e38,.28,.22));
    bar(h,[1.02,2.47,-.62],[1.02,3.78,-.62],.075,black);
    loop(h,[[-1.5,.39,-.05],[-1.5,2.02,-.05],[-1.46,2.68,-.21]],.036,steel);
    loop(h,[[-1.5,.39,-.62],[-1.5,2.09,-.62],[-1.40,2.59,-.8]],.037,steel);
    for(let j=0;j<5;j++)box(h,-1.49,.48+j*.27,-.34,.30,.055,.62,steel);
    // Header trough and reel with five longitudinal combs.
    box(h,0,.63,-2.24,1.14,.51,1.25,black);
    soft(h,0,.50,-2.91,5.36,.39,.86,.09,red);
    box(h,0,.36,-3.24,5.34,.09,.27,ivory);
    for(let i=0;i<50;i++)face(h,[[i*.107-2.67,.416,-3.25],[i*.107-2.59,.416,-3.25],[i*.107-2.62,.39,-3.53]],steel);
    for(const s of [-1,1]){
      face(h,[[s*2.67,.32,-3.61],[s*2.67,.38,-2.37],[s*2.67,1.12,-2.56],[s*2.67,.96,-3.09]],lightRed);
      bar(h,[s*2.55,.79,-2.4],[s*2.55,1.0,-3.02],.082,red);
    }
    const reel=group(base,0,1.01,-3.02);
    bar(reel,[-2.65,0,0],[2.65,0,0],.083,black);
    for(let k=0;k<5;k++){const a=k*Math.PI*2/5,y=Math.cos(a)*.46,z=Math.sin(a)*.46;
      for(let xx of [-2.50,-.84,.84,2.50])bar(reel,[xx,0,0],[xx,y,z],.032,black);
      bar(reel,[-2.55,y,z],[2.55,y,z],.041,black);
      for(let i=0;i<29;i++){const xx=i*.18-2.52;bar(reel,[xx,y,z],[xx,y+Math.cos(a+.5)*.14,z+Math.sin(a+.5)*.14],.012,steel,4);}
    }
    pack(reel);
    const pipe=group(base,1.29,3.11,-.70);pipe.scale.x=(4.85-1.29)/3.71;
    bar(pipe,[0,0,0],[3.69,.24,0],.167,lightRed,20);
    for(const xx of [.14,1.9,3.46])bar(pipe,[xx,.065*xx,0],[xx+.058,.065*xx,0],.179,darkRed,20);
    bar(pipe,[3.64,.24,0],[3.71,-.12,0],.178,black,16);pack(pipe);
    pack(h);base.userData.hit='combine';return {base,h,wheels,reel,pipe,load};
  }
  function truck(parent){
    const base=group(parent),body=group(base),bed=group(base),wheels=[];
    const blue=mat(0x547c79,.41,.32),cream=mat(0xe2d3ad,.45,.24);
    for(const s of [-1,1])for(const z of [-1.34,1.28])wheels.push(wheel(base,s*1.04,.53,z,.53,.31,cream));
    soft(body,0,.74,0,1.95,.34,4.35,.09,black);
    soft(body,0,1.14,-1.64,2.03,.69,1.26,.20,blue);soft(body,0,1.41,-.65,2.02,.86,1.32,.15,blue);
    soft(body,0,2.10,-.66,1.88,.74,1.10,.13,glass);soft(body,0,2.51,-.66,2.06,.19,1.28,.09,cream);
    for(const s of [-1,1]){
      bar(body,[s*.89,1.72,-1.19],[s*.88,2.43,-1.13],.05,cream);bar(body,[s*.88,1.7,-.15],[s*.88,2.43,-.15],.05,blue);
      soft(body,s*.94,1.13,-2.12,.29,.22,.18,.065,ivory);
      soft(body,s*1.03,1.49,-.52,.04,.055,.19,.015,steel);
    }
    soft(body,0,1.05,-2.28,1.17,.43,.07,.033,steel);for(let i=0;i<7;i++)box(body,0,.9+i*.05,-2.325,1.05,.019,.021,black);
    box(body,0,.71,-2.29,2.16,.12,.17,cream);
    box(bed,0,1.15,1.08,2.19,.16,2.73,blue);
    for(const s of [-1,1]){
      for(let j=0;j<4;j++)box(bed,s*1.08,1.31+j*.18,1.08,.10,.165,2.75,j%2?0xa88a5e:0xb69b6b);
      for(let zz of [-.23,1.06,2.38])box(bed,s*1.145,1.58,zz,.042,.85,.08,blue);
      bar(bed,[s*1.08,1.97,-.31],[s*1.08,1.97,2.46],.046,blue);
    }
    for(const zz of [-.30,2.45])for(let i=0;i<4;i++)box(bed,0,1.31+i*.18,zz,2.14,.166,.08,0xad926b);
    const load=group(bed,0,1.21,1.07);box(load,0,0,0,2.05,.03,2.60,0xd5b169);pack(load);pack(body);pack(bed);
    base.userData.hit='truck';return {base,body,bed,wheels,load};
  }
  function person(p,size,child=false){
    const g=group(p);g.scale.setScalar(size);
    const skin=mat(0xb98b63),dress=mat(child?0x729598:0x6b8182),pants=mat(0x424f54);
    const legs=group(g,0,.57,0);for(const s of [-1,1]){bar(legs,[s*.108,-.47,0],[s*.088,0,0],.066,pants);ball(legs,s*.107,-.50,-.04,.08,.075,.14,0x665143);}pack(legs);
    cyl(g,0,.78,0,.165,.19,.44,dress);ball(g,0,1.16,0,.157,.19,.15,skin);
    cyl(g,0,1.32,0,.255,.26,.036,0xc7a267,24);ball(g,0,1.36,0,.173,.094,.168,0xc7a267);
    cyl(g,0,1.337,0,.174,.179,.043,0x875039);bar(g,[-.135,.94,0],[-.249,.66,-.07],.058,dress);
    const arm=group(g,.14,.94,0);bar(arm,[0,0,0],[.16,.15,0],.066,dress);bar(arm,[.16,.15,0],[.17,.32,-.02],.047,skin);pack(arm);
    pack(g);return {g,arm,legs};
  }
  function bale(p){
    const g=group(p),drum=group(g);bar(drum,[-.72,0,0],[.72,0,0],.78,0xc09851,48);
    for(let i=0;i<180;i++){
      const a=Art.rand()*Math.PI*2,x=Art.rand()*1.32-.66,l=.11+Art.rand()*.30;
      bar(drum,[x,Math.sin(a)*.781,Math.cos(a)*.781],[x+.025,Math.sin(a+l)*.783,Math.cos(a+l)*.783],.009,i%3?0xd2ae68:0xa87a3d,4);
    }
    for(const s of [-1,1]){
      const ring=torus(drum,s*.40,0,0,.783,.016,0x8b774d);ring.rotation.y=Math.PI/2;
      for(let j=1;j<=8;j++){let r=torus(drum,s*.725,.007*j,0,j*.086,.013,j%3?0xd4b474:0xaf894b);r.rotation.y=Math.PI/2;}
    }pack(drum);g.userData.hit='bale';return {g,drum};
  }
  return {combine,truck,person,bale};
})();
