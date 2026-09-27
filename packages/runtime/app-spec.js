const ID=/^[a-z][a-zA-Z0-9_.-]{0,127}$/;
const VIEW_KINDS=new Set(['lab','plans','compare','references','explain','custom']);
const ARTIFACT_KINDS=new Set(['figure','document-region','image','code','table']);
const CLASSIFICATIONS=new Set(['synthetic','private']);
const SOURCE_KINDS=new Set(['synthetic','private-reference','user-reference','derived']);
function id(v,label='id'){if(typeof v!=='string'||!ID.test(v))throw new Error(`Invalid ${label}`);return v;}
function text(v,label,max=4000){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error(`Invalid ${label}`);return v;}
function unique(items,label){const s=new Set();for(const x of items){if(s.has(x.id))throw new Error(`Duplicate ${label} id: ${x.id}`);s.add(x.id);}return s;}
function plainObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}

/** Validate a serializable app declaration. No callbacks or executable expressions are accepted. */
export function validateAppManifest(value){
  if(!plainObject(value)||value.format!=='datapass.studio.app'||value.schemaVersion!==1)throw new Error('Unsupported app manifest');
  const allowed=new Set(['format','schemaVersion','id','title','version','description','classification','parameters','views','tasks','artifacts']);
  for(const k of Object.keys(value))if(!allowed.has(k))throw new Error('Unknown app manifest field: '+k);
  id(value.id,'app id');text(value.title,'app title',200);text(value.version,'app version',100);if(typeof value.description!=='string'||value.description.length>4000)throw new Error('Invalid app description');if(!CLASSIFICATIONS.has(value.classification))throw new Error('Invalid app classification');
  for(const k of ['parameters','views','tasks','artifacts'])if(!Array.isArray(value[k])||value[k].length>500)throw new Error('Invalid '+k);
  const parameters=value.parameters.map(p=>{
    if(!plainObject(p))throw new Error('Invalid parameter');id(p.id,'parameter id');text(p.label,'parameter label',200);
    for(const n of ['default','min','max','step'])if(typeof p[n]!=='number'||!Number.isFinite(p[n]))throw new Error('Invalid parameter numeric field');
    if(p.min>p.max||p.step<=0||p.default<p.min||p.default>p.max)throw new Error('Invalid parameter bounds');
    if(typeof p.unit!=='string'||typeof p.group!=='string'||typeof p.note!=='string'||!Array.isArray(p.affects)||p.affects.some(x=>typeof x!=='string'||!x))throw new Error('Invalid parameter metadata');
    return p;
  });
  const parameterIds=unique(parameters,'parameter');
  const views=value.views.map(v=>{if(!plainObject(v))throw new Error('Invalid view');id(v.id,'view id');text(v.label,'view label',160);if(!VIEW_KINDS.has(v.kind)||typeof v.icon!=='string'||typeof v.description!=='string')throw new Error('Invalid view metadata');return v;});
  unique(views,'view');if(!views.length)throw new Error('At least one view is required');
  const tasks=value.tasks.map(t=>{if(!plainObject(t))throw new Error('Invalid task');id(t.id,'task id');text(t.label,'task label',160);for(const key of ['input_nodes','output_nodes']){if(!Array.isArray(t[key])||t[key].length>200)throw new Error('Invalid task nodes');for(const n of t[key])id(n,'task node id');}if(typeof t.revision_guarded!=='boolean'||typeof t.cancellable!=='boolean')throw new Error('Invalid task policy');for(const n of t.input_nodes)if(n.startsWith('parameter.')&&!parameterIds.has(n.slice(10)))throw new Error(`Task ${t.id} references unknown parameter ${n}`);return t;});
  unique(tasks,'task');
  const artifacts=value.artifacts.map(a=>{if(!plainObject(a))throw new Error('Invalid artifact');id(a.id,'artifact id');text(a.title,'artifact title',200);if(!ARTIFACT_KINDS.has(a.kind)||!Array.isArray(a.entity_ids)||a.entity_ids.length>500)throw new Error('Invalid artifact metadata');for(const x of a.entity_ids)id(x,'entity id');if(a.document_id!==null&&a.document_id!==undefined)id(a.document_id,'document id');if(a.page!==null&&a.page!==undefined&&(!Number.isSafeInteger(a.page)||a.page<1||a.page>100000))throw new Error('Invalid artifact page');if(a.phase!==null&&a.phase!==undefined&&(typeof a.phase!=='number'||!Number.isFinite(a.phase)||a.phase<0||a.phase>1))throw new Error('Invalid artifact phase');if(!SOURCE_KINDS.has(a.source_kind))throw new Error('Invalid artifact source kind');return a;});
  unique(artifacts,'artifact');
  return value;
}

/** Produce the inert manifest projection of a trusted executable client. */
export function manifestFromClient(client,{views}={}){
  if(!client||typeof client!=='object')throw new Error('Client required');
  const manifest={format:'datapass.studio.app',schemaVersion:1,id:client.id,title:client.title,version:client.version,description:client.description||'',classification:client.classification,
    parameters:(client.parameters||[]).map(p=>({id:p.id,label:p.label,default:client.defaults?.[p.id],min:p.min,max:p.max,step:p.step,unit:p.unit||'',group:p.group||'Parameters',affects:[...(p.affects||[])],note:p.note||''})),
    views:(views||['lab','plans','compare','references','explain']).map(v=>typeof v==='string'?{id:v,label:v,kind:VIEW_KINDS.has(v)?v:'custom',icon:'panel',description:''}:v),
    tasks:[{id:'evaluate',label:'Evaluate',input_nodes:(client.parameters||[]).map(p=>'parameter.'+p.id),output_nodes:['metrics'],revision_guarded:true,cancellable:true}],
    artifacts:(client.artifactCatalog?.artifacts||[]).map(a=>({id:a.id,title:a.title,kind:a.kind,entity_ids:[...(a.entityIds||[])],document_id:a.documentId??null,page:a.page??null,phase:a.phase??null,source_kind:a.sourceKind||(client.classification==='private'?'private-reference':'synthetic')}))};
  return validateAppManifest(manifest);
}
