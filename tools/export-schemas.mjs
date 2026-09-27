import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {motionRig} from '../clients/motion-rig.js';import {transferBench} from '../clients/transfer-bench.js';
const enumView={type:'object',required:['mode','camera','yaw','explode','edges','ghost','grid'],additionalProperties:false,properties:{mode:{enum:['lab','plans','compare','references','explain']},camera:{enum:['iso','front','side','top']},yaw:{type:'number',minimum:-180,maximum:180},explode:{type:'number',minimum:0,maximum:1},edges:{type:'boolean'},ghost:{type:'boolean'},grid:{type:'boolean'}}};
const sourceKinds=['synthetic','private-reference','user-reference','derived'];
const artifactCatalogSchema={$schema:'https://json-schema.org/draft/2020-12/schema',title:'Datapass Studio artifact catalog',type:'object',additionalProperties:false,properties:{
 documents:{type:'array',maxItems:100,items:{type:'object',additionalProperties:false,required:['id','title','mime','sourceKind'],properties:{id:{type:'string',pattern:'^[a-z][a-z0-9_.-]{1,79}
for(const c of [motionRig,transferBench]){
 const schema={$schema:'https://json-schema.org/draft/2020-12/schema',title:c.title+' workspace',type:'object',additionalProperties:false,
 required:['format','version','clientId','clientVersion','scenarioId','parameters','revision','selection','hidden','view','provenance'],properties:{
 format:{const:'datapass.studio.workspace'},version:{const:1},clientId:{const:c.id},clientVersion:{const:c.version},scenarioId:{enum:c.scenarios.map(s=>s.id)},
 parameters:{type:'object',required:c.parameters.map(f=>f.id),additionalProperties:false,properties:Object.fromEntries(c.parameters.map(f=>[f.id,{type:'number',minimum:f.min,maximum:f.max}]))},revision:{type:'integer',minimum:0},selection:{type:['string','null']},hidden:{type:'array',maxItems:500,uniqueItems:true,items:{type:'string'}},view:enumView,
 provenance:{type:'object',required:['classification','source','reviewed'],additionalProperties:false,properties:{classification:{const:c.classification},source:{type:'string',maxLength:1000},reviewed:{const:false}}}}};
 const file='schemas/'+c.id+'.workspace.schema.json',value=JSON.stringify(schema,null,2)+'\n';
 if(process.argv.includes('--check')){if(await readFile(file,'utf8')!==value)throw new Error('Schema out of date: '+file);}else await writeFile(file,value);
}
const artifactFile='schemas/artifact-catalog.schema.json',artifactValue=JSON.stringify(artifactCatalogSchema,null,2)+'\n';
if(process.argv.includes('--check')){if(await readFile(artifactFile,'utf8')!==artifactValue)throw new Error('Schema out of date: '+artifactFile);}else await writeFile(artifactFile,artifactValue);
console.log('Workspace JSON Schemas: OK. Client reference/semantic checks remain runtime validators.');
},title:{type:'string',minLength:1,maxLength:300},mime:{enum:['application/pdf','image/png','image/jpeg','image/webp','text/plain','text/markdown']},sourceKind:{enum:sourceKinds},url:{type:'string',maxLength:2048},pages:{type:'integer',minimum:1,maximum:10000},sourceLabel:{type:'string',maxLength:1000}}}},
 artifacts:{type:'array',maxItems:500,items:{type:'object',additionalProperties:false,required:['id','title','kind','entityIds'],properties:{id:{type:'string',pattern:'^[a-z][a-z0-9_.-]{1,79}
for(const c of [motionRig,transferBench]){
 const schema={$schema:'https://json-schema.org/draft/2020-12/schema',title:c.title+' workspace',type:'object',additionalProperties:false,
 required:['format','version','clientId','clientVersion','scenarioId','parameters','revision','selection','hidden','view','provenance'],properties:{
 format:{const:'datapass.studio.workspace'},version:{const:1},clientId:{const:c.id},clientVersion:{const:c.version},scenarioId:{enum:c.scenarios.map(s=>s.id)},
 parameters:{type:'object',required:c.parameters.map(f=>f.id),additionalProperties:false,properties:Object.fromEntries(c.parameters.map(f=>[f.id,{type:'number',minimum:f.min,maximum:f.max}]))},revision:{type:'integer',minimum:0},selection:{type:['string','null']},hidden:{type:'array',maxItems:500,uniqueItems:true,items:{type:'string'}},view:enumView,
 provenance:{type:'object',required:['classification','source','reviewed'],additionalProperties:false,properties:{classification:{const:c.classification},source:{type:'string',maxLength:1000},reviewed:{const:false}}}}};
 const file='schemas/'+c.id+'.workspace.schema.json',value=JSON.stringify(schema,null,2)+'\n';
 if(process.argv.includes('--check')){if(await readFile(file,'utf8')!==value)throw new Error('Schema out of date: '+file);}else await writeFile(file,value);
}
console.log('Workspace JSON Schemas: OK. Client reference/semantic checks remain runtime validators.');
},title:{type:'string',minLength:1,maxLength:300},kind:{enum:['figure','document-region','image','code','table']},entityIds:{type:'array',minItems:1,maxItems:50,uniqueItems:true,items:{type:'string',minLength:1}},documentId:{type:'string'},page:{type:'integer',minimum:1,maximum:10000},summary:{type:'string',maxLength:4000},sourceKind:{enum:sourceKinds},phase:{type:'number',minimum:0,maximum:1},region:{type:'array',minItems:4,maxItems:4,items:{type:'number',minimum:0,maximum:1}},preview:{type:'object',additionalProperties:false,required:['plane'],properties:{plane:{enum:['front','side','top']}}}}}}
},required:['documents','artifacts']};
await mkdir('schemas',{recursive:true});
for(const c of [motionRig,transferBench]){
 const schema={$schema:'https://json-schema.org/draft/2020-12/schema',title:c.title+' workspace',type:'object',additionalProperties:false,
 required:['format','version','clientId','clientVersion','scenarioId','parameters','revision','selection','hidden','view','provenance'],properties:{
 format:{const:'datapass.studio.workspace'},version:{const:1},clientId:{const:c.id},clientVersion:{const:c.version},scenarioId:{enum:c.scenarios.map(s=>s.id)},
 parameters:{type:'object',required:c.parameters.map(f=>f.id),additionalProperties:false,properties:Object.fromEntries(c.parameters.map(f=>[f.id,{type:'number',minimum:f.min,maximum:f.max}]))},revision:{type:'integer',minimum:0},selection:{type:['string','null']},hidden:{type:'array',maxItems:500,uniqueItems:true,items:{type:'string'}},view:enumView,
 provenance:{type:'object',required:['classification','source','reviewed'],additionalProperties:false,properties:{classification:{const:c.classification},source:{type:'string',maxLength:1000},reviewed:{const:false}}}}};
 const file='schemas/'+c.id+'.workspace.schema.json',value=JSON.stringify(schema,null,2)+'\n';
 if(process.argv.includes('--check')){if(await readFile(file,'utf8')!==value)throw new Error('Schema out of date: '+file);}else await writeFile(file,value);
}
console.log('Workspace JSON Schemas: OK. Client reference/semantic checks remain runtime validators.');
