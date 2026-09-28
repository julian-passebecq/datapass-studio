export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export const translate=(x,y,z)=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1];
export function rotateY(a){const c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];}
export function rotateZ(a){const c=Math.cos(a),s=Math.sin(a);return [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];}
export function multiply(a,b){const o=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const scale=(v,s)=>v.map(x=>x*s);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function normalize(v){const n=Math.hypot(...v);return n>1e-12?scale(v,1/n):[0,0,1];}
export function point(m,v){const [x,y,z]=v;return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}
export function project(m,v){const [x,y,z]=v,w=m[3]*x+m[7]*y+m[11]*z+m[15];return point(m,v).map(c=>c/w);}
export function transform(m,values){const out=new Float32Array(values.length);for(let i=0;i<values.length;i+=3)out.set(point(m,[values[i],values[i+1],values[i+2]]),i);return out;}
export function lookAt(eye,target,up=[0,0,1]){
  const z=normalize(sub(eye,target)),x=normalize(cross(up,z)),y=cross(z,x);
  return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
}
export function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
export function orthographic(w,h,near,far){return [2/w,0,0,0,0,2/h,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1];}
export function invert(m){
  const a=Array.from({length:4},(_,r)=>[...Array.from({length:4},(_,c)=>m[c*4+r]),...Array.from({length:4},(_,c)=>+(r===c))]);
  for(let i=0;i<4;i++){let p=i;for(let r=i+1;r<4;r++)if(Math.abs(a[r][i])>Math.abs(a[p][i]))p=r;
    if(Math.abs(a[p][i])<1e-14)return null;[a[p],a[i]]=[a[i],a[p]];const div=a[i][i];for(let c=0;c<8;c++)a[i][c]/=div;
    for(let r=0;r<4;r++)if(r!==i){const s=a[r][i];for(let c=0;c<8;c++)a[r][c]-=s*a[i][c];}
  }
  return Array.from({length:16},(_,i)=>a[i%4][4+Math.floor(i/4)]);
}
export function bounds(values){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<values.length;i+=3)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],values[i+k]);hi[k]=Math.max(hi[k],values[i+k]);}return {lo,hi};}
export function worldBounds(parts){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const p of parts){const b=bounds(p.positions);for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]]){const v=point(p.matrix,[x,y,z]);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],v[k]);hi[k]=Math.max(hi[k],v[k]);}}}return {lo,hi};}
export function normals(values){const out=new Float32Array(values.length);for(let i=0;i<values.length;i+=9){const a=Array.from(values.slice(i,i+3)),b=Array.from(values.slice(i+3,i+6)),c=Array.from(values.slice(i+6,i+9));const n=normalize(cross(sub(b,a),sub(c,a)));for(let j=0;j<3;j++)out.set(n,i+j*3);}return out;}
export function rayTriangle(o,d,a,b,c){const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-9)return null;
  const f=1/det,s=sub(o,a),u=f*dot(s,h);if(u<0||u>1)return null;const q=cross(s,e1),v=f*dot(d,q);if(v<0||u+v>1)return null;const t=f*dot(e2,q);return t>0?t:null;}
export function pickPart(parts,origin,direction){let hit=null,best=Infinity;
  for(const p of parts){const inv=invert(p.matrix);if(!inv)continue;const o=point(inv,origin),d=normalize(sub(point(inv,add(origin,direction)),o));
    for(let i=0;i<p.positions.length;i+=9){const v=p.positions;const t=rayTriangle(o,d,Array.from(v.slice(i,i+3)),Array.from(v.slice(i+3,i+6)),Array.from(v.slice(i+6,i+9)));
      if(t!==null&&t<best){best=t;hit=p.id;}}
  }return hit;
}
