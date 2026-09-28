import {clamp,identity,multiply,perspective,orthographic,lookAt,invert,project,sub,normalize,worldBounds,normals,pickPart,point,dot} from '../scene/math.js';
import {featureEdges} from '../scene/edges.js';
const normalCache=new WeakMap();
/** Portable CPU 3D projection. Painter ordering is approximate, not a CAD hidden-line solver.
 * Used when WebGL is unavailable. Never silently calls it WebGL or Three.js.
 */
export function mountCanvas3D(canvas,{onSelect,onCamera=()=>{}}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2D indisponible.');
 let frame=null,options={},matrix=identity(),destroyed=false,draws=0,triangles=0,lastPreset=null,first=true;
 let camera={azimuth:-.88,elevation:.43,distance:16,target:[0,0,2.8],preset:'iso'},pointer=null;
 const rgb=(c,l=1)=>'rgb('+c.map(v=>Math.round(clamp(v*l,0,1)*255)).join(',')+')';
 const light=normalize([-.4,-.7,1]);
 function cameraMatrix(w,h){const t=camera.target,d=camera.distance;let eye,up=[0,0,1],p;
  if(camera.preset==='iso'){eye=[t[0]+d*Math.cos(camera.elevation)*Math.cos(camera.azimuth),t[1]+d*Math.cos(camera.elevation)*Math.sin(camera.azimuth),t[2]+d*Math.sin(camera.elevation)];p=perspective(Math.PI/4,w/h,.02,2000);}
  else{eye=camera.preset==='front'?[t[0]+d,t[1],t[2]]:camera.preset==='side'?[t[0],t[1]-d,t[2]]:[t[0],t[1],t[2]+d];if(camera.preset==='top')up=[0,1,0];p=orthographic(d*.85*w/h,d*.85,.02,2000);}
  matrix=multiply(p,lookAt(eye,t,up));
 }
 function xy(p,w,h){const q=project(matrix,p);return [(q[0]+1)*w/2,(1-q[1])*h/2,q[2]];}
 function line(a,b,w,h){const x=xy(a,w,h),y=xy(b,w,h);ctx.moveTo(x[0],x[1]);ctx.lineTo(y[0],y[1]);}
 function draw(){if(destroyed||!frame)return;
  const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),dpr=Math.min(globalThis.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);cameraMatrix(w,h);ctx.globalAlpha=1;
  const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#e0eaeb');bg.addColorStop(1,'#f0f4f3');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  if(options.grid!==false){ctx.beginPath();for(let i=-15;i<=15;i++){line([i,-15,0],[i,15,0],w,h);line([-15,i,0],[15,i,0],w,h);}ctx.strokeStyle='rgba(131,161,166,.18)';ctx.lineWidth=.6;ctx.stroke();}
  const faces=[],parts=frame.parts.filter(p=>!(options.hidden||[]).includes(p.id));
  for(const part of parts){const pos=part.positions,m=part.matrix;let ns=normalCache.get(pos);if(!ns){ns=normals(pos);normalCache.set(pos,ns);}
   const verts=[];for(let i=0;i<pos.length;i+=3)verts.push(point(m,[pos[i],pos[i+1],pos[i+2]]));
   ctx.beginPath();for(let i=0;i<verts.length;i+=3){const a=verts.slice(i,i+3).map(v=>xy([v[0]+v[2]*.55,v[1]+v[2]*.25,.015],w,h));ctx.moveTo(a[0][0],a[0][1]);ctx.lineTo(a[1][0],a[1][1]);ctx.lineTo(a[2][0],a[2][1]);ctx.closePath();}ctx.fillStyle='rgba(53,84,90,.08)';ctx.fill();
   const projected=verts.map(v=>xy(v,w,h));
   for(let i=0;i<projected.length;i+=3){const a=projected.slice(i,i+3);if(a.some(v=>v[2]<-1||v[2]>1))continue;
    const j=i*3,n=[m[0]*ns[j]+m[4]*ns[j+1]+m[8]*ns[j+2],m[1]*ns[j]+m[5]*ns[j+1]+m[9]*ns[j+2],m[2]*ns[j]+m[6]*ns[j+1]+m[10]*ns[j+2]];
    const selected=part.id===options.selection,color=selected?part.color.map((v,k)=>v*.4+[.1,.56,.62][k]*.6):part.color;
    faces.push({a,z:(a[0][2]+a[1][2]+a[2][2])/3,color:rgb(color,.65+.35*Math.abs(dot(normalize(n),light))),alpha:options.ghost&&options.selection&&!selected?.13:1});
   }
  }
  faces.sort((a,b)=>b.z-a.z);triangles=faces.length;
  for(const f of faces){ctx.globalAlpha=f.alpha;ctx.beginPath();ctx.moveTo(f.a[0][0],f.a[0][1]);ctx.lineTo(f.a[1][0],f.a[1][1]);ctx.lineTo(f.a[2][0],f.a[2][1]);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();}
  ctx.globalAlpha=1;
  for(const p of parts){const selected=p.id===options.selection;if(!options.edges&&!selected)continue;const e=featureEdges(p.positions);ctx.beginPath();for(let i=0;i<e.length;i+=6)line(point(p.matrix,Array.from(e.slice(i,i+3))),point(p.matrix,Array.from(e.slice(i+3,i+6))),w,h);ctx.lineWidth=selected?1.3:.5;ctx.strokeStyle=selected?'rgba(9,99,113,.95)':'rgba(34,65,73,.19)';ctx.stroke();}
  draws++;
 }
 function fit(){if(!frame)return;const b=worldBounds(frame.parts),dims=b.hi.map((x,k)=>x-b.lo[k]);camera.target=b.hi.map((x,k)=>(x+b.lo[k])/2);camera.distance=Math.max(...dims,2)*1.55;camera.azimuth=-.88;camera.elevation=.43;draw();}
 function update(f,o={}){frame=f;options=o;if((o.camera||'iso')!==lastPreset){lastPreset=o.camera||'iso';camera.preset=lastPreset;}if(first){first=false;fit();}else draw();}
 function publish(){onCamera({...camera,target:[...camera.target]});}
 const down=e=>{if(e.button!==0&&e.button!==2)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,moves:0,pan:e.shiftKey||e.button===2};canvas.setPointerCapture?.(e.pointerId);};
 const move=e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;pointer.moves+=Math.abs(dx)+Math.abs(dy);
  if(pointer.pan){camera.target[0]-=dx*camera.distance*.0015;camera.target[2]+=dy*camera.distance*.0015;}else{camera.preset='iso';camera.azimuth-=dx*.008;camera.elevation=clamp(camera.elevation+dy*.006,-.05,1.5);}draw();publish();};
 const up=e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(p.moves<5&&!p.pan&&frame){const r=canvas.getBoundingClientRect(),iv=invert(matrix);if(!iv)return;const x=(e.clientX-r.left)/r.width*2-1,y=1-(e.clientY-r.top)/r.height*2,a=project(iv,[x,y,-1]),b=project(iv,[x,y,1]);onSelect?.(pickPart(frame.parts.filter(p=>!(options.hidden||[]).includes(p.id)),a,normalize(sub(b,a))));}};
 const cancel=()=>{pointer=null;},wheel=e=>{e.preventDefault();camera.distance=clamp(camera.distance*Math.exp(e.deltaY*.001),.3,500);draw();publish();};
 const key=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='Home')fit();else{if(e.key==='+')camera.distance*=.9;else if(e.key==='-')camera.distance*=1.1;else{camera.preset='iso';camera.azimuth+=e.key==='ArrowRight'?.1:e.key==='ArrowLeft'?-.1:0;camera.elevation=clamp(camera.elevation+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0),0,1.5);}draw();}publish();};
 const prevent=e=>e.preventDefault(),events=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['wheel',wheel],['keydown',key],['contextmenu',prevent]];
 for(const [n,f]of events)canvas.addEventListener(n,f,n==='wheel'?{passive:false}:undefined);
 const resize=new ResizeObserver(draw);resize.observe(canvas);
 return {update,draw,fit,setCamera(c){if(!c||c.target?.length!==3||![c.azimuth,c.elevation,c.distance,...c.target].every(Number.isFinite))return;camera={...c,target:[...c.target]};draw();},
 capture(){draw();return canvas.toDataURL('image/png');},diagnostics:()=>({renderer:'canvas3d-cpu',draws,triangles,meshes:frame?.parts.length||0}),
 screenPoint(id){const p=frame?.parts.find(x=>x.id===id);if(!p)return null;const b=worldBounds([p]);return xy(b.hi.map((x,k)=>(x+b.lo[k])/2),canvas.clientWidth,canvas.clientHeight).slice(0,2);},
 destroy(){destroyed=true;resize.disconnect();for(const [n,f]of events)canvas.removeEventListener(n,f);}};
}
