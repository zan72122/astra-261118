'use strict';
/* The camera follows a damped headrest in carriage coordinates. Station shots
   use the same inertial mount, so arriving, examining and boarding are continuous. */
function valleyDirector(s,aspect){
  const V=Valley,P=V.route,z3=()=>({x:0,y:0,z:0}),camera={eye:z3(),look:z3()},vel={eye:z3(),look:z3()};
  const mix=(a,b,t)=>a+(b-a)*t;
  function goals(){
    const portrait=V.clamp((1.18-aspect)/.72,0,1),p=P(s.distance);
    const carriage=(x,y,z)=>({x:p.x+x,y:p.y+y,z:p.z+z});
    let eye,look;const phase=s.phase;
    if(phase==='morning'){
      eye=carriage(mix(3.64,.93,portrait),mix(2.99,3.36,portrait),mix(7.61,13.45,portrait));
      const yaw=mix(.255,.040,portrait);
      look={x:eye.x-yaw*11,y:eye.y-mix(.58,.89,portrait),z:eye.z-11};
    }else if(phase==='ride'||phase==='climb'){
      const e=carriage(mix(-.27,.49,portrait),1.96,.90);
      const tilt=phase==='climb'?Math.sin(V.clamp((s.distance-V.MID)/(V.END-V.MID),0,1)*Math.PI)*.075:0;
      eye=e;look={x:e.x+mix(.29,.027,portrait)*8,y:e.y-(.14+tilt)*8,z:e.z-8};
    }else if(phase==='walk'||phase==='look'){
      const k=s.walk,e=carriage(2.72+.13*k,1.62,1.90-7.80*k),anchor=carriage(2.87,1.61,-8.46);
      const aimz=p.z-47-s.scopeYaw.q*17,river={x:V.riverX(aimz)+s.scopeYaw.q*5,y:V.waterY(aimz)+.45,z:aimz};
      const reach=s.scope.q;
      const objective={x:mix(anchor.x,river.x,reach),y:mix(anchor.y-.12,river.y,reach),z:mix(anchor.z,river.z,reach)};
      eye={x:mix(e.x,anchor.x-1.10,reach),y:mix(e.y,anchor.y-.30,reach),z:mix(e.z,anchor.z-.59,reach)};
      look=phase==='walk'?{x:p.x+2.48,y:p.y+.43,z:e.z-4.7}:objective;
    }else if(phase==='board'){
      eye=carriage(3.76,1.86,-8.35);look=carriage(.18,1.37,-.25);
    }else if(phase==='ridge'){
      eye=carriage(3.06,1.91,-1.08);look=carriage(2.10,2.20,-7.95);
    }else{
      eye=carriage(mix(3.15,2.3,portrait),3.35,mix(8.65,13.5,portrait));look=carriage(.15,2.21,-3.15);
    }
    return {eye,look};
  }
  let previous=P(s.distance),g=goals();
  for(const k of ['eye','look'])Object.assign(camera[k],g[k]);
  function update(dt){
    const current=P(s.distance);
    for(const k of ['eye','look'])for(const a of ['x','y','z'])camera[k][a]+=current[a]-previous[a];
    previous=current;g=goals();for(const k of ['eye','look'])for(const a of ['x','y','z']){
      const speed=k==='eye'?4.8:4.5;
      const err=camera[k][a]-g[k][a],b=vel[k][a]+speed*err,decay=Math.exp(-speed*dt);
      camera[k][a]=g[k][a]+(err+b*dt)*decay;vel[k][a]=(vel[k][a]-speed*b*dt)*decay;
    }
  }
  return {camera,update,resize:a=>{aspect=a;}};
}
