/** Optional Three.js renderer. Requires npm optional dependency; not needed by the portable native renderer. */
export async function mountThree(canvas,{onSelect}={}){
  const THREE=await import('../vendor/three.mjs');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0xe8efef);const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x617b81,2));
  const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(10,-12,18);scene.add(sun);
  const camera=new THREE.PerspectiveCamera(42,1,.05,1500);camera.up.set(0,0,1);let radius=18,azimuth=-.9,elevation=.43,target=new THREE.Vector3(0,0,3),first=true,objects=new Map();
  const raycaster=new THREE.Raycaster();let drag=null,moved=0;
  function render(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.position.set(target.x+radius*Math.cos(azimuth)*Math.cos(elevation),target.y+radius*Math.sin(azimuth)*Math.cos(elevation),target.z+radius*Math.sin(elevation));camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);}
  function update(frame,options={}){
    const ids=new Set(frame.parts.map(p=>p.id));for(const [id,entry]of objects)if(!ids.has(id)){scene.remove(entry.mesh);entry.mesh.geometry.dispose();entry.mesh.material.dispose();objects.delete(id);}
    for(const part of frame.parts){let entry=objects.get(part.id);if(entry?.positions!==part.positions){if(entry){scene.remove(entry.mesh);entry.mesh.geometry.dispose();entry.mesh.material.dispose();}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));geometry.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color:new THREE.Color(...part.color),roughness:.7,metalness:.14,side:THREE.DoubleSide});
      const mesh=new THREE.Mesh(geometry,material);mesh.matrixAutoUpdate=false;mesh.userData.id=part.id;scene.add(mesh);entry={mesh,positions:part.positions};objects.set(part.id,entry);}
      entry.mesh.matrix.fromArray(part.matrix);entry.mesh.visible=!(options.hidden||[]).includes(part.id);entry.mesh.material.color.setRGB(...part.color);entry.mesh.material.emissive.setHex(part.id===options.selection?0x14464b:0);entry.mesh.material.transparent=!!options.ghost;entry.mesh.material.opacity=options.ghost&&options.selection!==part.id?.18:1;
    }
    if(first){first=false;const b=new THREE.Box3().setFromObject(scene),size=b.getSize(new THREE.Vector3());b.getCenter(target);radius=Math.max(size.x,size.y,size.z)*1.6;}
    render();
  }
  const down=e=>{drag=[e.clientX,e.clientY];moved=0;canvas.setPointerCapture(e.pointerId);};const move=e=>{if(!drag)return;const dx=e.clientX-drag[0],dy=e.clientY-drag[1];drag=[e.clientX,e.clientY];moved+=Math.abs(dx)+Math.abs(dy);azimuth-=dx*.008;elevation=Math.max(.05,Math.min(1.5,elevation+dy*.006));render();};
  const up=e=>{if(!drag)return;drag=null;if(moved<5){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);onSelect?.(raycaster.intersectObjects([...objects.values()].map(v=>v.mesh).filter(m=>m.visible))[0]?.object.userData.id||null);}};
  const wheel=e=>{e.preventDefault();radius=Math.max(.5,Math.min(500,radius*Math.exp(e.deltaY*.001)));render();};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('wheel',wheel,{passive:false});const resize=new ResizeObserver(render);resize.observe(canvas);
  return {update,fit(){radius=18;render();},capture(){render();return canvas.toDataURL('image/png');},destroy(){resize.disconnect();for(const [type,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['wheel',wheel]])canvas.removeEventListener(type,fn);for(const {mesh}of objects.values()){mesh.geometry.dispose();mesh.material.dispose();}renderer.dispose();},diagnostics(){return {renderer:'three',revision:THREE.REVISION,meshes:objects.size};}};
}
