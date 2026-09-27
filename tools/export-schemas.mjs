import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {publicClients} from '../clients/index.js';
import {manifestFromClient} from '../packages/runtime/app-spec.js';

const viewSchema={type:'object',required:['mode','camera','yaw','explode','edges','ghost','grid'],additionalProperties:false,properties:{
  mode:{enum:['lab','plans','compare','references','data','explain']},
  camera:{enum:['iso','front','side','top']},
  yaw:{type:'number',minimum:-180,maximum:180},
  explode:{type:'number',minimum:0,maximum:1},
  edges:{type:'boolean'},ghost:{type:'boolean'},grid:{type:'boolean'}
}};
const sourceKinds=['synthetic','private-reference','user-reference','derived'];
const idPattern='^[a-z][a-zA-Z0-9_.-]{0,127}$';
const artifactIdPattern='^[a-z][a-z0-9_.-]{1,79}$';

const artifactCatalogSchema={
  $schema:'https://json-schema.org/draft/2020-12/schema',
  title:'Datapass Studio artifact catalog',
  type:'object',
  additionalProperties:false,
  properties:{
    documents:{type:'array',maxItems:100,items:{type:'object',additionalProperties:false,required:['id','title','mime','sourceKind'],properties:{
      id:{type:'string',pattern:artifactIdPattern},
      title:{type:'string',minLength:1,maxLength:300},
      mime:{enum:['application/pdf','image/png','image/jpeg','image/webp','text/plain','text/markdown']},
      sourceKind:{enum:sourceKinds},url:{type:'string',maxLength:2048},
      pages:{type:'integer',minimum:1,maximum:10000},sourceLabel:{type:'string',maxLength:1000}
    }}},
    artifacts:{type:'array',maxItems:500,items:{type:'object',additionalProperties:false,required:['id','title','kind','entityIds'],properties:{
      id:{type:'string',pattern:artifactIdPattern},title:{type:'string',minLength:1,maxLength:300},
      kind:{enum:['figure','document-region','image','code','table']},
      entityIds:{type:'array',minItems:1,maxItems:50,uniqueItems:true,items:{type:'string',minLength:1}},
      documentId:{type:'string'},page:{type:'integer',minimum:1,maximum:10000},summary:{type:'string',maxLength:4000},
      sourceKind:{enum:sourceKinds},phase:{type:'number',minimum:0,maximum:1},
      region:{type:'array',minItems:4,maxItems:4,items:{type:'number',minimum:0,maximum:1}},
      preview:{type:'object',additionalProperties:false,required:['plane'],properties:{plane:{enum:['front','side','top']}}}
    }}}
  },
  required:['documents','artifacts']
};

const appSchema={
  $schema:'https://json-schema.org/draft/2020-12/schema',title:'Datapass Studio app manifest',type:'object',additionalProperties:false,
  required:['format','schemaVersion','id','title','version','description','classification','parameters','views','tasks','artifacts'],
  properties:{
    format:{const:'datapass.studio.app'},schemaVersion:{const:1},id:{type:'string',pattern:idPattern},
    title:{type:'string',minLength:1,maxLength:200},version:{type:'string',minLength:1,maxLength:100},
    description:{type:'string',maxLength:4000},classification:{enum:['synthetic','private']},
    parameters:{type:'array',maxItems:500,items:{type:'object',additionalProperties:false,required:['id','label','default','min','max','step','unit','group','affects','note'],properties:{
      id:{type:'string',pattern:idPattern},label:{type:'string',minLength:1,maxLength:200},default:{type:'number'},
      min:{type:'number'},max:{type:'number'},step:{type:'number',exclusiveMinimum:0},unit:{type:'string',maxLength:80},
      group:{type:'string',maxLength:160},affects:{type:'array',maxItems:16,items:{type:'string',minLength:1,maxLength:120}},
      note:{type:'string',maxLength:4000}
    }}},
    views:{type:'array',minItems:1,maxItems:100,items:{type:'object',additionalProperties:false,required:['id','label','kind','icon','description'],properties:{
      id:{type:'string',pattern:idPattern},label:{type:'string',minLength:1,maxLength:160},
      kind:{enum:['lab','plans','compare','references','data','explain','custom']},icon:{type:'string',maxLength:120},description:{type:'string',maxLength:4000}
    }}},
    tasks:{type:'array',maxItems:200,items:{type:'object',additionalProperties:false,required:['id','label','input_nodes','output_nodes','revision_guarded','cancellable'],properties:{
      id:{type:'string',pattern:idPattern},label:{type:'string',minLength:1,maxLength:160},
      input_nodes:{type:'array',maxItems:200,items:{type:'string',pattern:idPattern}},
      output_nodes:{type:'array',maxItems:200,items:{type:'string',pattern:idPattern}},
      revision_guarded:{type:'boolean'},cancellable:{type:'boolean'}
    }}},
    artifacts:{type:'array',maxItems:500,items:{type:'object',additionalProperties:false,required:['id','title','kind','entity_ids','source_kind'],properties:{
      id:{type:'string',pattern:idPattern},title:{type:'string',minLength:1,maxLength:200},
      kind:{enum:['figure','document-region','image','code','table']},
      entity_ids:{type:'array',maxItems:500,items:{type:'string',pattern:idPattern}},
      document_id:{type:['string','null']},page:{type:['integer','null'],minimum:1,maximum:100000},
      phase:{type:['number','null'],minimum:0,maximum:1},source_kind:{enum:sourceKinds}
    }}}
  }
};

const traceSchema={
  $schema:'https://json-schema.org/draft/2020-12/schema',title:'Datapass Studio session trace',type:'object',additionalProperties:false,
  required:['format','version','clientId','clientVersion','startedAt','exportedAt','events'],
  properties:{
    format:{const:'datapass.studio.trace'},version:{const:1},clientId:{type:'string',pattern:idPattern},
    clientVersion:{type:'string',maxLength:100},startedAt:{type:['number','null']},exportedAt:{type:'number'},
    events:{type:'array',maxItems:1000,items:{type:'object',additionalProperties:false,required:['seq','at','type','action','entityId','inputRevision','phase'],properties:{
      seq:{type:'integer',minimum:1},at:{type:'number'},
      type:{enum:['parameter','scenario','selection','visibility','view','playback','task','artifact','import','export','custom']},
      action:{type:'string',minLength:1,maxLength:160},entityId:{type:['string','null'],maxLength:160},
      inputRevision:{type:['integer','null'],minimum:0},phase:{type:['number','null'],minimum:0,maximum:1},
      meta:{type:'object',additionalProperties:{type:['string','number','boolean','null']},maxProperties:40}
    }}}
  }
};

const layoutSchema={
  $schema:'https://json-schema.org/draft/2020-12/schema',title:'Datapass Studio layout document',type:'object',additionalProperties:false,
  required:['format','version','id','title','root'],properties:{format:{const:'datapass.studio.layout'},version:{const:1},id:{type:'string',pattern:idPattern},title:{type:'string',maxLength:200},root:{$ref:'#/$defs/node'}},
  $defs:{node:{oneOf:[
    {type:'object',additionalProperties:false,required:['id','kind','slot'],properties:{id:{type:'string',pattern:idPattern},kind:{const:'slot'},slot:{type:'string',pattern:idPattern},label:{type:'string',maxLength:160},minSize:{type:'number',minimum:0,maximum:4000}}},
    {type:'object',additionalProperties:false,required:['id','kind','axis','ratio','first','second','resizable'],properties:{id:{type:'string',pattern:idPattern},kind:{const:'split'},axis:{enum:['horizontal','vertical']},ratio:{type:'number',exclusiveMinimum:0,exclusiveMaximum:1},first:{$ref:'#/$defs/node'},second:{$ref:'#/$defs/node'},resizable:{type:'boolean'}}},
    {type:'object',additionalProperties:false,required:['id','kind','columns','gap','children'],properties:{id:{type:'string',pattern:idPattern},kind:{const:'grid'},columns:{type:'integer',minimum:1,maximum:12},gap:{type:'number',minimum:0,maximum:128},children:{type:'array',minItems:1,maxItems:64,items:{$ref:'#/$defs/node'}}}},
    {type:'object',additionalProperties:false,required:['id','kind','tabs','defaultTab'],properties:{id:{type:'string',pattern:idPattern},kind:{const:'tabs'},defaultTab:{type:'string',pattern:idPattern},tabs:{type:'array',minItems:1,maxItems:24,items:{type:'object',additionalProperties:false,required:['id','label','child'],properties:{id:{type:'string',pattern:idPattern},label:{type:'string',maxLength:120},child:{$ref:'#/$defs/node'}}}}}},
    {type:'object',additionalProperties:false,required:['id','kind','direction','gap','children'],properties:{id:{type:'string',pattern:idPattern},kind:{const:'stack'},direction:{enum:['horizontal','vertical']},gap:{type:'number',minimum:0,maximum:128},children:{type:'array',minItems:1,maxItems:64,items:{$ref:'#/$defs/node'}}}}
  ]}}
};

const chartSchema={
  $schema:'https://json-schema.org/draft/2020-12/schema',title:'Datapass Studio chart spec',type:'object',additionalProperties:false,
  required:['format','version','id','title','kind','x','y','series','sourceKind','note'],properties:{
    format:{const:'datapass.studio.chart'},version:{const:1},id:{type:'string',pattern:idPattern},title:{type:'string',minLength:1,maxLength:240},
    kind:{enum:['line','bar','scatter']},sourceKind:{enum:sourceKinds},note:{type:'string',maxLength:2000},
    x:{$ref:'#/$defs/axis'},y:{$ref:'#/$defs/axis'},
    series:{type:'array',minItems:1,maxItems:12,items:{type:'object',additionalProperties:false,required:['id','label','points'],properties:{
      id:{type:'string',pattern:idPattern},label:{type:'string',minLength:1,maxLength:160},
      points:{type:'array',minItems:1,maxItems:5000,items:{type:'array',minItems:2,maxItems:2}}
    }}}
  },
  $defs:{axis:{type:'object',additionalProperties:false,required:['label','unit','type'],properties:{label:{type:'string',minLength:1,maxLength:120},unit:{type:'string',maxLength:40},type:{enum:['number','category']}}}}
};
const tableSchema={
  $schema:'https://json-schema.org/draft/2020-12/schema',title:'Datapass Studio table spec',type:'object',additionalProperties:false,
  required:['format','version','id','title','columns','rows','sourceKind','note'],properties:{
    format:{const:'datapass.studio.table'},version:{const:1},id:{type:'string',pattern:idPattern},title:{type:'string',minLength:1,maxLength:240},
    sourceKind:{enum:sourceKinds},note:{type:'string',maxLength:2000},
    columns:{type:'array',minItems:1,maxItems:50,items:{type:'object',additionalProperties:false,required:['id','label','type','unit'],properties:{id:{type:'string',pattern:idPattern},label:{type:'string',minLength:1,maxLength:160},type:{enum:['string','number','boolean']},unit:{type:'string',maxLength:40}}}},
    rows:{type:'array',maxItems:5000,items:{type:'object',additionalProperties:false,required:['id','values'],properties:{id:{type:'string',pattern:idPattern},values:{type:'object',additionalProperties:{type:['string','number','boolean','null']}}}}}
  }
};

await mkdir('schemas',{recursive:true});
const checking=process.argv.includes('--check');
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
async function emit(file,value){
  const text=JSON.stringify(value,null,2)+'\n';
  if(checking){
    let parsed;
    try{parsed=JSON.parse(await readFile(file,'utf8'));}catch{throw new Error('Schema missing/invalid: '+file);}
    if(canonical(parsed)!==canonical(value))throw new Error('Schema out of date: '+file);
  }else await writeFile(file,text);
}

for(const c of publicClients){
  manifestFromClient(c);
  const schema={
    $schema:'https://json-schema.org/draft/2020-12/schema',title:c.title+' workspace',type:'object',additionalProperties:false,
    required:['format','version','clientId','clientVersion','scenarioId','parameters','revision','selection','hidden','view','provenance'],
    properties:{
      format:{const:'datapass.studio.workspace'},version:{const:1},clientId:{const:c.id},clientVersion:{const:c.version},
      scenarioId:{enum:c.scenarios.map(s=>s.id)},
      parameters:{type:'object',required:c.parameters.map(f=>f.id),additionalProperties:false,properties:Object.fromEntries(c.parameters.map(f=>[f.id,{type:'number',minimum:f.min,maximum:f.max}]))},
      revision:{type:'integer',minimum:0},selection:{type:['string','null']},
      hidden:{type:'array',maxItems:500,uniqueItems:true,items:{type:'string'}},view:viewSchema,
      provenance:{type:'object',required:['classification','source','reviewed'],additionalProperties:false,properties:{
        classification:{const:c.classification},source:{type:'string',maxLength:1000},reviewed:{const:false}
      }}
    }
  };
  await emit('schemas/'+c.id+'.workspace.schema.json',schema);
}
await emit('schemas/artifact-catalog.schema.json',artifactCatalogSchema);
await emit('schemas/app-manifest.schema.json',appSchema);
await emit('schemas/session-trace.schema.json',traceSchema);
await emit('schemas/layout.schema.json',layoutSchema);
await emit('schemas/chart.schema.json',chartSchema);
await emit('schemas/table.schema.json',tableSchema);
console.log('Workspace, app, trace, layout, data and artifact JSON Schemas: OK. Semantic/reference checks remain runtime validators.');