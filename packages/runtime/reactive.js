const ID_RE=/^[a-z][a-zA-Z0-9_.-]{0,127}$/;
function assertId(id){if(typeof id!=='string'||!ID_RE.test(id))throw new Error('Invalid reactive node id: '+String(id));}
function freezeMeta(meta){return Object.freeze(meta?{...meta}:{});}
function same(a,b){return Object.is(a,b);}

/** Explicit dependency graph for high-frequency data-app interaction. */
export class ReactiveGraph {
  #nodes=new Map();#listeners=new Set();#batchDepth=0;#pending=new Set();#revision=0;#evaluating=[];#clock;
  constructor({clock=()=>Date.now()}={}){this.#clock=clock;}
  get revision(){return this.#revision;}
  has(id){return this.#nodes.has(id);}
  list(){return [...this.#nodes.values()].map(n=>({id:n.id,kind:n.kind,deps:[...n.deps],revision:n.revision,dirty:n.dirty,meta:n.meta}));}
  defineSource(id,initial,{validate=()=>true,meta}={}){assertId(id);if(this.#nodes.has(id))throw new Error('Reactive node already exists: '+id);if(validate(initial)!==true)throw new Error('Invalid initial value for '+id);this.#nodes.set(id,{id,kind:'source',deps:[],dependents:new Set(),value:initial,validate,meta:freezeMeta(meta),dirty:false,revision:0,updatedAt:this.#clock()});return this;}
  defineComputed(id,deps,compute,{equals=same,meta}={}){assertId(id);if(this.#nodes.has(id))throw new Error('Reactive node already exists: '+id);if(!Array.isArray(deps)||!deps.length||new Set(deps).size!==deps.length)throw new Error('Computed deps must be a unique non-empty array');for(const dep of deps){assertId(dep);if(!this.#nodes.has(dep))throw new Error('Unknown dependency '+dep+' for '+id);}if(typeof compute!=='function'||typeof equals!=='function')throw new Error('Computed node requires functions');const n={id,kind:'computed',deps:[...deps],dependents:new Set(),compute,equals,meta:freezeMeta(meta),dirty:true,value:undefined,revision:0,updatedAt:0};this.#nodes.set(id,n);for(const dep of deps)this.#nodes.get(dep).dependents.add(id);this.#assertAcyclic();return this;}
  #assertAcyclic(){const visiting=new Set(),done=new Set();const visit=id=>{if(done.has(id))return;if(visiting.has(id))throw new Error('Reactive dependency cycle at '+id);visiting.add(id);for(const d of this.#nodes.get(id)?.deps||[])visit(d);visiting.delete(id);done.add(id);};for(const id of this.#nodes.keys())visit(id);}
  get(id){const n=this.#nodes.get(id);if(!n)throw new Error('Unknown reactive node: '+id);if(n.kind==='source'||!n.dirty)return n.value;if(this.#evaluating.includes(id))throw new Error('Reactive evaluation cycle: '+[...this.#evaluating,id].join(' -> '));this.#evaluating.push(id);try{const values=n.deps.map(d=>this.get(d));const next=n.compute(...values,{get:x=>this.get(x),revision:this.#revision});const changed=n.updatedAt===0||!n.equals(n.value,next);n.value=next;n.dirty=false;n.updatedAt=this.#clock();if(changed)n.revision++;return n.value;}finally{this.#evaluating.pop();}}
  set(id,value,{silent=false}={}){const n=this.#nodes.get(id);if(!n)throw new Error('Unknown reactive node: '+id);if(n.kind!=='source')throw new Error('Only source nodes are writable: '+id);if(n.validate(value)!==true)throw new Error('Invalid value for '+id);if(same(n.value,value))return false;n.value=value;n.revision++;n.updatedAt=this.#clock();this.#revision++;this.#markDependents(id);this.#pending.add(id);if(!silent)this.#flush();return true;}
  patch(values,{atomic=true}={}){if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('Patch must be an object');const entries=Object.entries(values);if(atomic){for(const [id,value] of entries){const n=this.#nodes.get(id);if(!n||n.kind!=='source')throw new Error('Unknown/non-source node in patch: '+id);if(n.validate(value)!==true)throw new Error('Invalid value for '+id);}}return this.transaction(()=>{let changed=0;for(const [id,value] of entries)if(this.set(id,value,{silent:true}))changed++;return changed;});}
  transaction(fn){if(typeof fn!=='function')throw new Error('transaction requires a function');this.#batchDepth++;try{return fn();}finally{this.#batchDepth--;if(this.#batchDepth===0)this.#flush();}}
  #markDependents(id){for(const depId of this.#nodes.get(id).dependents){const dep=this.#nodes.get(depId);if(!dep.dirty){dep.dirty=true;this.#pending.add(depId);this.#markDependents(depId);}}}
  #flush(){if(this.#batchDepth||!this.#pending.size)return;const changed=[...this.#pending];this.#pending.clear();for(const fn of this.#listeners)fn({revision:this.#revision,changed,graph:this});}
  subscribe(fn){if(typeof fn!=='function')throw new Error('subscribe requires a function');this.#listeners.add(fn);return()=>this.#listeners.delete(fn);}
  snapshot(ids=[...this.#nodes.keys()]){const out={revision:this.#revision,values:{}};for(const id of ids){assertId(id);out.values[id]=this.get(id);}return out;}
  explain(id){const seen=new Set();const walk=x=>{const n=this.#nodes.get(x);if(!n)throw new Error('Unknown reactive node: '+x);if(seen.has(x))return {id:x,kind:n.kind,shared:true};seen.add(x);return {id:x,kind:n.kind,revision:n.revision,dirty:n.dirty,meta:n.meta,deps:n.deps.map(walk)};};return walk(id);}
}

export function bindStoreToGraph(store,graph,selector,mapping){
  if(!store||typeof store.subscribe!=='function'||typeof store.getSnapshot!=='function')throw new Error('Store contract missing');
  if(!(graph instanceof ReactiveGraph)||typeof selector!=='function'||!mapping||typeof mapping!=='object')throw new Error('Invalid graph binding');
  let last;
  const sync=()=>{const selected=selector(store.getSnapshot());const key=JSON.stringify(selected);if(key===last)return;last=key;const patch={};for(const [nodeId,path] of Object.entries(mapping)){const parts=Array.isArray(path)?path:String(path).split('.');let value=selected;for(const p of parts)value=value?.[p];patch[nodeId]=value;}graph.patch(patch);};
  sync();const off=store.subscribe(sync);return()=>off?.();
}
