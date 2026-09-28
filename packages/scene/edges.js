import {cross,sub,normalize,dot,point} from './math.js';
const cache=new WeakMap(),topology=new WeakMap();
/** Boundary / crease edges. This is mesh linework, not hidden-line CAD removal. */
export function featureEdges(positions){
  if(cache.has(positions))return cache.get(positions);
  const map=new Map(),key=p=>p.map(v=>Math.round(v*1e5)).join(',');
  for(let i=0;i<positions.length;i+=9){const v=[0,3,6].map(n=>Array.from(positions.slice(i+n,i+n+3)));const n=normalize(cross(sub(v[1],v[0]),sub(v[2],v[0])));
    for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],ka=key(a),kb=key(b),k=ka<kb?ka+'|'+kb:kb+'|'+ka;
      if(map.has(k))map.get(k).normals.push(n);else map.set(k,{a,b,normals:[n]});}
  }
  topology.set(positions,map);
  const edges=[];for(const e of map.values())if(e.normals.length===1||e.normals.some(n=>dot(n,e.normals[0])<.93))edges.push(...e.a,...e.b);
  const result=new Float32Array(edges);cache.set(positions,result);return result;
}
export function projectedLines(part,axes){let e=featureEdges(part.positions);const lines=[],axis=[0,1,2].find(k=>!axes.includes(k)),m=part.matrix,dir=[m[axis],m[4+axis],m[8+axis]],silhouette=[];
  for(const edge of topology.get(part.positions).values()){
    if(edge.normals.length<2)continue;const signs=edge.normals.map(n=>dot(n,dir));
    if(Math.min(...signs)<-1e-7&&Math.max(...signs)>1e-7)silhouette.push(...edge.a,...edge.b);
  }
  e=new Float32Array([...e,...silhouette]);
  for(let i=0;i<e.length;i+=6){const a=point(part.matrix,Array.from(e.slice(i,i+3))),b=point(part.matrix,Array.from(e.slice(i+3,i+6)));lines.push([[a[axes[0]],a[axes[1]]],[b[axes[0]],b[axes[1]]]]);}return lines;}
