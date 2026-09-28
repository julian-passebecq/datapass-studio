/** Generic mesh primitives. No application-specific parameter or model references. */
export function box(cx,cy,cz,sx,sy,sz){
  const v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([x,y,z])=>[cx+x*sx/2,cy+y*sy/2,cz+z*sz/2]);
  return new Float32Array([[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]].flatMap(t=>t.flatMap(i=>v[i])));
}
export function extrude(polygon,from,to,axis='z'){
  if(polygon.length<3)throw new Error('Polygon needs 3 points');
  // Intended for convex cross sections, not an arbitrary CAD polygon triangulator.
  const out=[],centroid=polygon.reduce((a,p)=>[a[0]+p[0]/polygon.length,a[1]+p[1]/polygon.length],[0,0]);
  const xyz=([u,v],w)=>axis==='x'?[w,u,v]:axis==='y'?[u,w,v]:[u,v,w];
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],af=xyz(a,from),bf=xyz(b,from),at=xyz(a,to),bt=xyz(b,to);
    out.push(...af,...bf,...bt,...af,...bt,...at,...xyz(centroid,from),...bf,...af,...xyz(centroid,to),...at,...bt);
  }return new Float32Array(out);
}
export function cylinder(radius,from,to,axis='z',segments=32){return extrude(Array.from({length:segments},(_,i)=>[radius*Math.cos(i*2*Math.PI/segments),radius*Math.sin(i*2*Math.PI/segments)]),from,to,axis);}
export function merge(...parts){const out=new Float32Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;}
