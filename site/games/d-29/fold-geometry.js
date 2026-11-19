/* Geometry shared by aerodynamics and mesh deformation. */
(function(root){
'use strict';const PI=Math.PI;
function creases(d){
 const w=d.width/2,l=d.length/2;
 const folds=[[0,-l,-w,-l+w,-1,-l],[0,-l,w,-l+w,1,-l],
 [0,-l,-w,d.length*d.shoulder,-w,0],[0,-l,w,d.length*d.shoulder,w,0]];
 if(d.cross){const z=d.cross*l,span=d.cross<0?w*.34:w;folds.push([-span,z,span,z,0,d.cross<0?-l:l]);}
 const spine=folds.length;
 return folds.concat([[0,-l,-d.keel,l,-w,l],[0,-l,d.keel,l,w,l],[0,-l,0,l,-w,0],[0,-l,0,l,w,0]])
 .map(([x,z,X,Z,tx,tz],i)=>{
   const den=Math.hypot(X-x,Z-z),ax=(X-x)/den,az=(Z-z)/den;
   const side=(X1,Z1)=>az*(X1-x)-ax*(Z1-z);
   return {x,z,X,Z,ax,az,side,sign:Math.sign(side(tx,tz)),hinge:Math.min(i,spine),flat:i<spine,factor:i<spine?1:i<spine+2?-.84:1,y:i<spine?.0025+i*.002:.018};
 });
}
function rotate(p,c,angle){
 const x=p.x-c.x,y=p.y-c.y,z=p.z-c.z,co=Math.cos(angle),si=Math.sin(angle),dot=c.ax*x+c.az*z;
 p.x=c.x+x*co-c.az*y*si+c.ax*dot*(1-co);p.y=c.y+y*co+(c.az*x-c.ax*z)*si;p.z=c.z+z*co+c.ax*y*si+c.az*dot*(1-co);return p;
}
function panels(d){
 const cs=creases(d),w=d.width/2,l=d.length/2;
 let pieces=[{points:[[-w,-l],[-w,l],[w,l],[w,-l]],flags:[]}];
 function flat(pt,flags){
   const p={x:pt[0],y:0,z:pt[1]};
   flags.forEach((on,i)=>{if(on&&cs[i].flat)rotate(p,cs[i],PI*cs[i].sign);});return p;
 }
 cs.forEach((c,i)=>{
   const next=[];
   pieces.forEach(poly=>{
     const ds=poly.points.map(pt=>{const p=flat(pt,poly.flags);return c.side(p.x,p.z)*c.sign;});
     for(const s of [-1,1]){
       const out=[];poly.points.forEach((a,j)=>{
         const k=(j+1)%ds.length,b=poly.points[k],v=ds[j]*s,u=ds[k]*s;
         if(v>=-1e-8)out.push(a);
         if((v>1e-8&&u< -1e-8)||(v< -1e-8&&u>1e-8)){const t=v/(v-u);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
       });
       if(out.length>=3&&Math.abs(out.reduce((a,p,j)=>a+p[0]*out[(j+1)%out.length][1]-p[1]*out[(j+1)%out.length][0],0))>.000001)
         next.push({points:out,flags:[...poly.flags,s===1]});
     }
   });pieces=next;
 });
 return {cs,pieces};
}
function measure(d){
 const {cs,pieces}=panels(d);
 let mass=0,moment=0,nose=Infinity,tail=-Infinity;
 const outlines=[];
 for(const {points,flags} of pieces){
   const folded=points.map(([x,z])=>{
     const p={x,y:0,z};flags.forEach((on,i)=>{if(on)rotate(p,cs[i],cs[i].sign*(cs[i].flat?PI:1.19*cs[i].factor));});
     nose=Math.min(nose,p.z);tail=Math.max(tail,p.z);return p;
   });
   if(flags[cs.length-4]||flags[cs.length-3])outlines.push(folded);
   for(let i=1;i<points.length-1;i++){
     const [a,b,c]=[points[0],points[i],points[i+1]];
     const m=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))*.5;
     mass+=m;moment+=m*(folded[0].z+folded[i].z+folded[i+1].z)/3;
   }
 }
 // Integrate the union of the projected wings. Overlapping layers add mass
 // but no extra lifting area. The conversion is eight scene units per metre.
 const dz=(tail-nose)/160;let area=0;
 for(let i=0;i<160;i++){
   const z=nose+(i+.5)*dz,intervals=[];
   for(const poly of outlines){const xs=[];poly.forEach((a,k)=>{
     const b=poly[(k+1)%poly.length];if((a.z<=z&&b.z>z)||(a.z>z&&b.z<=z))xs.push(a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z));
   });if(xs.length>=2)intervals.push([Math.min(...xs),Math.max(...xs)]);}
   intervals.sort((a,b)=>a[0]-b[0]);let end=-Infinity;
   for(const [lo,hi] of intervals){area+=Math.max(0,hi-Math.max(lo,end))*dz;end=Math.max(end,hi);}
 }
 return {area:area/64,cg:(moment/mass+d.length/2)/d.length};
}
const api={creases,rotate,panels,measure};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FoldGeometry=api;
})(globalThis);
