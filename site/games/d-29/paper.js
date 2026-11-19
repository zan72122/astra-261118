/* Cut the sheet into panels along the actual crease intersections. Every panel
   retains its original paper coordinates, including both faces and free edges. */
(function(){
const T=THREE, PI=Math.PI, V=(x,y,z)=>new T.Vector3(x,y,z);
const {creases,rotate,panels}=FoldGeometry;
function make(d,front,back,edge){
 const {cs,pieces}=panels(d),w=d.width/2,l=d.length/2;
 const pts=[],uv=[],idx=[],edgeIdx=[],tags=[],face=[];
 function vertex(x,z,f,layer){pts.push(x,0,z);uv.push(.5+x/d.width,.5-z/d.length);tags.push(f);face.push(layer);return tags.length-1;}
 for(const poly of pieces){
   // Subdivision gives the free edges an elastic curvature between creases.
   const contour=[];
   poly.points.forEach((a,k)=>{const b=poly.points[(k+1)%poly.points.length],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.30);
    for(let j=0;j<n;j++)contour.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);});
   const cx=poly.points.reduce((a,p)=>a+p[0],0)/poly.points.length,cz=poly.points.reduce((a,p)=>a+p[1],0)/poly.points.length;
   const center=vertex(cx,cz,poly.flags,0),rim=contour.map(pt=>vertex(...pt,poly.flags,0));
   const mids=contour.map(pt=>vertex((pt[0]+cx)/2,(pt[1]+cz)/2,poly.flags,0));
   rim.forEach((r,j)=>{const k=(j+1)%rim.length;idx.push(center,mids[j],mids[k],mids[j],r,rim[k],mids[j],rim[k],mids[k]);});
   // Only the original paper boundary exposes fibres.
   rim.forEach((r,j)=>{const k=(j+1)%rim.length,a=contour[j],b=contour[k];if((Math.abs(Math.abs(a[0])-w)<.0001&&Math.abs(a[0]-b[0])<.0001)||(Math.abs(Math.abs(a[1])-l)<.0001&&Math.abs(a[1]-b[1])<.0001)){
     const a2=vertex(...a,poly.flags,-1),b2=vertex(...b,poly.flags,-1);edgeIdx.push(r,rim[k],b2,r,b2,a2);
   }});
 }
 const geom=new T.BufferGeometry(),pos=new T.Float32BufferAttribute(pts,3);
 geom.setAttribute('position',pos);geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.setIndex([...idx,...edgeIdx]);geom.addGroup(0,idx.length,0);geom.addGroup(idx.length,edgeIdx.length,1);
 const base=new T.Mesh(geom,[front,edge]);base.castShadow=base.receiveShadow=true;
 const underside=new T.Mesh(geom,[back,edge]);underside.castShadow=underside.receiveShadow=true;
 const group=new T.Group();group.add(base,underside);
 const pt=V(0,0,0);
 function update(q,flex,thick=.1){
   for(let j=0;j<tags.length;j++){
     const x=pts[j*3],z=pts[j*3+2],zi=(z/l+1)*3,i=Math.min(5,Math.floor(Math.max(0,zi))),f=zi-i;
     const flutter=flex?((1-f)*flex[i].q+f*flex[i+1].q):0;
     const flags=tags[j];
     let localThickness=.1;if(Array.isArray(thick))for(let k=0;k<cs.length;k++){if(flags[k])localThickness=Math.max(localThickness,thick[cs[k].hinge]);}
     const curl=.067*Math.max(0,-x/w)**3*Math.max(0,-z/l)**3*Math.max(0,1-q[0]/PI);
     pt.set(x,curl+face[j]*localThickness*.008+.006*(x*x+z*z*.28)+flutter*.008*(.12+x*x),z);
     for(let k=0;k<cs.length;k++)if(flags[k]){
       const ang=(q[cs[k].hinge]||0)*cs[k].factor;
       if(ang)rotate(pt,cs[k],ang*cs[k].sign);
     }
     pos.setXYZ(j,pt.x,pt.y,pt.z);
   }
   pos.needsUpdate=true;geom.computeVertexNormals();geom.computeBoundingSphere();
 }
 update([0,0,0,0,0]);return {group,update,creases:cs,dispose(){geom.dispose();}};
}
window.PaperModel={make,creases};
})();
