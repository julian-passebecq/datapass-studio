import {clamp,identity,multiply,perspective,orthographic,lookAt,invert,project,sub,normalize,worldBounds,normals,pickPart,point} from '../scene/math.js';
import {featureEdges} from '../scene/edges.js';
const VERTEX=`attribute vec3 position; attribute vec3 normal;
uniform mat4 model; uniform mat4 vp; uniform float shadow;
varying vec3 n; varying vec3 world;
void main(){vec4 w=model*vec4(position,1.0);n=mat3(model)*normal;
if(shadow>0.5){w.x+=w.z*0.55;w.y+=w.z*0.25;w.z=0.015;}
world=w.xyz;gl_Position=vp*w;}`;
const FRAGMENT=`precision mediump float;
uniform vec4 color;uniform float unlit;uniform float section;varying vec3 n;varying vec3 world;
void main(){if(world.z>section)discard;float light=0.65+0.35*abs(dot(normalize(n),normalize(vec3(-0.4,-0.7,1.0))));
vec3 c=mix(color.rgb*light,color.rgb,unlit);gl_FragColor=vec4(c,color.a);}`;
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(e);}return s;}
function program(gl){const p=gl.createProgram(),v=shader(gl,gl.VERTEX_SHADER,VERTEX),f=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
/** Native WebGL adapter. Small dependency-free option; Three.js is a separate optional adapter. */
export function mountWebGL(canvas,{onSelect,onError=()=>{},onCamera=()=>{}}={}){
 const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
 if(!gl)throw new Error('WebGL indisponible. La projection SVG reste utilisable.');
 const pr=program(gl),loc={};for(const k of ['position','normal'])loc[k]=gl.getAttribLocation(pr,k);for(const k of ['model','vp','shadow','color','unlit','section'])loc[k]=gl.getUniformLocation(pr,k);
 let destroyed=false,lost=false,frame=null,options={},buffers=new Map(),matrix=identity(),camera={azimuth:-.9,elevation:.40,distance:16,target:[0,0,2.8],preset:'iso'},first=true,lastCameraKey=null;
 let pointer=null,moves=0,drawCount=0,triangleCount=0;
 const makeBuffer=(data)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return b;};
 const createMesh=(positions,edges=true)=>({positions,v:makeBuffer(positions),n:makeBuffer(normals(positions)),e:edges?makeBuffer(featureEdges(positions)):null,count:positions.length/3,edgeCount:edges?featureEdges(positions).length/3:0});
 const disposeMesh=m=>{gl.deleteBuffer(m.v);gl.deleteBuffer(m.n);if(m.e)gl.deleteBuffer(m.e);};
 const floorPositions=new Float32Array([-150,-150,0,150,-150,0,150,150,0,-150,-150,0,150,150,0,-150,150,0]);
 const floor=createMesh(floorPositions,false),gridVertices=[];
 for(let i=-25;i<=25;i++){gridVertices.push(i,-25,.005,i,25,.005,-25,i,.005,25,i,.005);}
 const grid=makeBuffer(new Float32Array(gridVertices));
 function fit(){if(!frame||!frame.parts.length)return;const b=worldBounds(frame.parts),dims=b.hi.map((x,k)=>x-b.lo[k]);camera.target=b.hi.map((x,k)=>(x+b.lo[k])/2);camera.distance=Math.max(...dims,2)*1.55;camera.azimuth=-.88;camera.elevation=.43;draw();}
 function attributes(mesh,edge=false){gl.bindBuffer(gl.ARRAY_BUFFER,edge?mesh.e:mesh.v);gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.position);
   if(edge){gl.disableVertexAttribArray(loc.normal);gl.vertexAttrib3f(loc.normal,0,0,1);}else{gl.bindBuffer(gl.ARRAY_BUFFER,mesh.n);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.normal);}}
 function uniforms(model,color,{unlit=0,shadow=0}={}){gl.uniformMatrix4fv(loc.model,false,new Float32Array(model));gl.uniform4fv(loc.color,new Float32Array(color));gl.uniform1f(loc.unlit,unlit);gl.uniform1f(loc.shadow,shadow);}
 function updateMatrix(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),aspect=w/h;
   let eye,up=[0,0,1],projection;if(camera.preset==='iso'){
     eye=[camera.target[0]+camera.distance*Math.cos(camera.elevation)*Math.cos(camera.azimuth),camera.target[1]+camera.distance*Math.cos(camera.elevation)*Math.sin(camera.azimuth),camera.target[2]+camera.distance*Math.sin(camera.elevation)];
     projection=perspective(Math.PI/4,aspect,.02,2000);
   }else{const t=camera.target,d=camera.distance;eye=camera.preset==='front'?[t[0]+d,t[1],t[2]]:camera.preset==='side'?[t[0],t[1]-d,t[2]]:[t[0],t[1],t[2]+d];if(camera.preset==='top')up=[0,1,0];projection=orthographic(d*.85*aspect,d*.85,.02,2000);}
   matrix=multiply(projection,lookAt(eye,camera.target,up));
 }
 function draw(){if(destroyed||lost||!frame)return;const dpr=Math.min(globalThis.devicePixelRatio||1,2),w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.clearColor(.90,.935,.935,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(pr);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);updateMatrix();gl.uniformMatrix4fv(loc.vp,false,new Float32Array(matrix));gl.uniform1f(loc.section,options.section??100000);
   attributes(floor);uniforms(identity(),[.918,.945,.941,1],{unlit:1});gl.drawArrays(gl.TRIANGLES,0,6);
   if(options.grid!==false){gl.bindBuffer(gl.ARRAY_BUFFER,grid);gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.position);gl.disableVertexAttribArray(loc.normal);gl.vertexAttrib3f(loc.normal,0,0,1);uniforms(identity(),[.56,.68,.69,.18],{unlit:1});gl.drawArrays(gl.LINES,0,gridVertices.length/3);}
   const parts=frame.parts.filter(p=>!(options.hidden||[]).includes(p.id));
   gl.depthMask(false);for(const p of parts){const mesh=buffers.get(p.id);if(!mesh)continue;attributes(mesh);uniforms(p.matrix,[.30,.40,.41,.10],{shadow:1,unlit:1});gl.drawArrays(gl.TRIANGLES,0,mesh.count);}gl.depthMask(true);
   const sorted=[...parts].sort((a,b)=>(+(a.id===options.selection))-(+(b.id===options.selection)));
   triangleCount=0;
   for(const p of sorted){const mesh=buffers.get(p.id);if(!mesh)continue;attributes(mesh);const selected=p.id===options.selection;const base=selected?p.color.map((v,k)=>v*.45+[.12,.56,.61][k]*.55):p.color;
     const ghost=options.ghost&&options.selection&&p.id!==options.selection;gl.depthMask(!ghost);uniforms(p.matrix,[...base,ghost?.12:1]);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.drawArrays(gl.TRIANGLES,0,mesh.count);gl.disable(gl.POLYGON_OFFSET_FILL);triangleCount+=mesh.count/3;
     if((options.edges||selected)&&mesh.e){attributes(mesh,true);uniforms(p.matrix,selected?[.02,.32,.40,.9]:[.18,.27,.31,ghost?.12:.25],{unlit:1});gl.lineWidth(selected?2:1);gl.drawArrays(gl.LINES,0,mesh.edgeCount);}
   }
   gl.depthMask(true);drawCount++;
 }
 function update(newFrame,newOptions={}){
   if(destroyed||lost)return;frame=newFrame;options=newOptions;
   const ids=new Set(frame.parts.map(p=>p.id));for(const [id,m]of buffers)if(!ids.has(id)){disposeMesh(m);buffers.delete(id);}
   for(const p of frame.parts){const existing=buffers.get(p.id);if(existing?.positions!==p.positions){if(existing)disposeMesh(existing);buffers.set(p.id,createMesh(p.positions instanceof Float32Array?p.positions:new Float32Array(p.positions)));buffers.get(p.id).positions=p.positions;}}
   const key=options.camera||'iso';if(key!==lastCameraKey){camera.preset=key;lastCameraKey=key;}
   if(first){first=false;fit();}else draw();
 }
 const down=e=>{if(e.button!==0&&e.button!==2)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,pan:e.button===2||e.shiftKey};moves=0;canvas.setPointerCapture?.(e.pointerId);};
 const move=e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;moves+=Math.abs(dx)+Math.abs(dy);
   if(pointer.pan){camera.target[0]-=dx*camera.distance*.0015;camera.target[2]+=dy*camera.distance*.0015;}
   else{camera.preset='iso';camera.azimuth-=dx*.008;camera.elevation=clamp(camera.elevation+dy*.006,-.05,1.5);}draw();onCamera(camera);};
 const up=e=>{if(!pointer||pointer.id!==e.pointerId)return;const wasPan=pointer.pan;pointer=null;if(moves<5&&!wasPan){const rect=canvas.getBoundingClientRect(),inv=invert(matrix);if(!inv)return;const x=(e.clientX-rect.left)/rect.width*2-1,y=1-(e.clientY-rect.top)/rect.height*2;const near=project(inv,[x,y,-1]),far=project(inv,[x,y,1]);onSelect?.(pickPart(frame.parts.filter(p=>!(options.hidden||[]).includes(p.id)),near,normalize(sub(far,near))));}};
 const cancelPointer=()=>{pointer=null;};
 const wheel=e=>{e.preventDefault();camera.distance=clamp(camera.distance*Math.exp(e.deltaY*.001),.3,500);draw();onCamera({...camera,target:[...camera.target]});};
 const keydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-'].includes(e.key)){e.preventDefault();if(e.key==='Home'){fit();return;}if(e.key==='+')camera.distance*=.9;else if(e.key==='-')camera.distance*=1.1;else{camera.preset='iso';camera.azimuth+=e.key==='ArrowRight'?.1:e.key==='ArrowLeft'?-.1:0;camera.elevation=clamp(camera.elevation+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0),0,1.5);}draw();}};
 const context=e=>e.preventDefault();const lose=e=>{e.preventDefault();lost=true;onError(new Error('Contexte WebGL perdu. Rechargez la vue; les donnees sont conservees.'));};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancelPointer);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keydown);canvas.addEventListener('contextmenu',context);canvas.addEventListener('webglcontextlost',lose);
 const resize=new ResizeObserver(draw);resize.observe(canvas);
 return {update,fit,draw,
   setCamera(value){if(!value||![value.azimuth,value.elevation,value.distance,...(value.target||[])].every(Number.isFinite)||value.target?.length!==3)return;camera={...value,target:[...value.target]};draw();},
   capture(){draw();return canvas.toDataURL('image/png');},
   diagnostics(){return {renderer:'native-webgl',draws:drawCount,triangles:triangleCount,meshes:buffers.size,lost};},
   screenPoint(id){const part=frame?.parts.find(p=>p.id===id);if(!part)return null;const b=worldBounds([part]),v=project(matrix,b.hi.map((x,k)=>(x+b.lo[k])/2));return [(v[0]+1)*canvas.clientWidth/2,(1-v[1])*canvas.clientHeight/2];},
   destroy(){destroyed=true;resize.disconnect();for(const [type,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancelPointer],['wheel',wheel],['keydown',keydown],['contextmenu',context],['webglcontextlost',lose]])canvas.removeEventListener(type,fn);for(const m of buffers.values())disposeMesh(m);buffers.clear();disposeMesh(floor);gl.deleteBuffer(grid);gl.deleteProgram(pr);gl.getExtension('WEBGL_lose_context')?.loseContext();}
 };
}
export const webglAdapter={id:'studio.webgl',capabilities:['mesh','selection','orbit','snapshot','orthographic'],mount:mountWebGL};
