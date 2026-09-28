const ID=/^[a-z][a-zA-Z0-9_.-]{0,127}$/;
const SOURCE_KINDS=new Set(['synthetic','private-reference','user-reference','derived']);
const NODE_KINDS=new Set(['source','transform','store','model','report','service','task','decision','note']);
const EDGE_KINDS=new Set(['data','control','reference','dependency']);
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const scalar=v=>v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v));
function strict(value,allowed,label){if(!isObject(value))throw new Error('Invalid '+label);for(const key of Object.keys(value))if(!allowed.has(key))throw new Error('Unknown '+label+' field: '+key);}
function id(value,label='id'){if(typeof value!=='string'||!ID.test(value))throw new Error('Invalid '+label);return value;}
function text(value,label,max=4000,{required=false}={}){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Error('Invalid '+label);return value;}
function source(value){if(!SOURCE_KINDS.has(value))throw new Error('Invalid sourceKind');return value;}

export function validateFlowSpec(value){
 strict(value,new Set(['format','version','id','title','orientation','nodes','edges','sourceKind','note']),'flow');
 if(value.format!=='datapass.studio.flow'||value.version!==1)throw new Error('Unsupported flow spec');
 id(value.id,'flow id');text(value.title,'flow title',240,{required:true});
 if(!['horizontal','vertical'].includes(value.orientation))throw new Error('Invalid flow orientation');
 source(value.sourceKind);text(value.note,'flow note',3000);
 if(!Array.isArray(value.nodes)||!value.nodes.length||value.nodes.length>200)throw new Error('Invalid flow nodes');
 if(!Array.isArray(value.edges)||value.edges.length>500)throw new Error('Invalid flow edges');
 const nodeIds=new Set();
 for(const node of value.nodes){
  strict(node,new Set(['id','label','kind','group','detail','entityIds','meta']),'flow node');
  id(node.id,'flow node id');if(nodeIds.has(node.id))throw new Error('Duplicate flow node id: '+node.id);nodeIds.add(node.id);
  text(node.label,'flow node label',160,{required:true});if(!NODE_KINDS.has(node.kind))throw new Error('Invalid flow node kind');
  text(node.group,'flow node group',120);text(node.detail,'flow node detail',3000);
  if(!Array.isArray(node.entityIds)||node.entityIds.length>50||new Set(node.entityIds).size!==node.entityIds.length)throw new Error('Invalid flow entity links');
  for(const entityId of node.entityIds)id(entityId,'flow entity id');
  if(!isObject(node.meta)||Object.keys(node.meta).length>24)throw new Error('Invalid flow node metadata');
  for(const [key,item] of Object.entries(node.meta)){id(key,'flow metadata key');if(!scalar(item)||typeof item==='string'&&item.length>500)throw new Error('Invalid flow node metadata value');}
 }
 const edgeIds=new Set();
 for(const edge of value.edges){
  strict(edge,new Set(['id','from','to','kind','label']),'flow edge');
  id(edge.id,'flow edge id');if(edgeIds.has(edge.id))throw new Error('Duplicate flow edge id: '+edge.id);edgeIds.add(edge.id);
  id(edge.from,'flow edge source');id(edge.to,'flow edge target');if(edge.from===edge.to)throw new Error('Self flow edges are not supported');
  if(!nodeIds.has(edge.from)||!nodeIds.has(edge.to))throw new Error('Flow edge endpoint is unknown');
  if(!EDGE_KINDS.has(edge.kind))throw new Error('Invalid flow edge kind');
  text(edge.label,'flow edge label',160);
 }
 return value;
}

export function flowLayers(spec){
 const flow=validateFlowSpec(spec),ids=flow.nodes.map(n=>n.id),indegree=new Map(ids.map(id=>[id,0])),outgoing=new Map(ids.map(id=>[id,[]]));
 const structural=flow.edges.filter(e=>e.kind!=='reference');
 for(const edge of structural){indegree.set(edge.to,indegree.get(edge.to)+1);outgoing.get(edge.from).push(edge.to);}
 const queue=ids.filter(id=>indegree.get(id)===0),layer=new Map(queue.map(id=>[id,0])),seen=new Set();
 for(let i=0;i<queue.length;i++){
  const current=queue[i];seen.add(current);const nextLayer=layer.get(current)||0;
  for(const next of outgoing.get(current)){
   layer.set(next,Math.max(layer.get(next)||0,nextLayer+1));
   indegree.set(next,indegree.get(next)-1);
   if(indegree.get(next)===0)queue.push(next);
  }
 }
 const maxSeen=Math.max(0,...layer.values());
 for(const id of ids)if(!seen.has(id))layer.set(id,maxSeen+1);
 const maxLayer=Math.max(0,...layer.values()),result=Array.from({length:maxLayer+1},()=>[]);
 for(const id of ids)result[layer.get(id)].push(id);
 return result.filter(items=>items.length);
}

export function flowNeighborhood(spec,nodeId){
 const flow=validateFlowSpec(spec);id(nodeId,'flow node id');
 if(!flow.nodes.some(node=>node.id===nodeId))throw new Error('Unknown flow node: '+nodeId);
 const upstream=new Set(),downstream=new Set();
 for(const edge of flow.edges){if(edge.to===nodeId)upstream.add(edge.from);if(edge.from===nodeId)downstream.add(edge.to);}
 return {upstream:[...upstream],downstream:[...downstream]};
}
