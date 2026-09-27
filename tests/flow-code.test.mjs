import test from 'node:test';import assert from 'node:assert/strict';
import {validateFlowSpec,flowLayers,flowNeighborhood} from '../packages/runtime/flow-spec.js';
import {validateCodeSpec,codeLineAnnotations} from '../packages/runtime/code-spec.js';

const flow={format:'datapass.studio.flow',version:1,id:'etl-demo',title:'ETL demo',orientation:'horizontal',sourceKind:'synthetic',note:'Fixture',nodes:[
 {id:'csv',label:'CSV',kind:'source',group:'Input',detail:'Local fixture',entityIds:[],meta:{}},
 {id:'airflow',label:'Airflow',kind:'task',group:'Orchestration',detail:'Schedule',entityIds:[],meta:{owner:'demo'}},
 {id:'bronze',label:'Bronze',kind:'store',group:'Lakehouse',detail:'Raw Delta',entityIds:[],meta:{}},
 {id:'transform',label:'Vector analysis',kind:'transform',group:'Compute',detail:'PySpark',entityIds:[],meta:{}},
 {id:'gold',label:'Gold',kind:'store',group:'Lakehouse',detail:'Curated Delta',entityIds:[],meta:{}},
 {id:'report',label:'Power BI',kind:'report',group:'Consumption',detail:'Semantic model',entityIds:[],meta:{}}
],edges:[
 {id:'e1',from:'csv',to:'airflow',kind:'control',label:'ingest'},
 {id:'e2',from:'airflow',to:'bronze',kind:'data',label:''},
 {id:'e3',from:'bronze',to:'transform',kind:'data',label:''},
 {id:'e4',from:'transform',to:'gold',kind:'data',label:''},
 {id:'e5',from:'gold',to:'report',kind:'data',label:'serve'}
]};
test('flow validates and layers deterministic pipeline stages',()=>{assert.equal(validateFlowSpec(flow),flow);assert.deepEqual(flowLayers(flow),[['csv'],['airflow'],['bronze'],['transform'],['gold'],['report']]);});
test('flow neighborhood exposes direct semantic relations',()=>{assert.deepEqual(flowNeighborhood(flow,'transform'),{upstream:['bronze'],downstream:['gold']});});
test('flow rejects unknown endpoints and executable surface fields',()=>{assert.throws(()=>validateFlowSpec({...flow,run:'exec()'}),/Unknown/);const bad=structuredClone(flow);bad.edges[0].to='missing';assert.throws(()=>validateFlowSpec(bad),/unknown/i);});
test('cyclic flows remain renderable in a bounded fallback layer',()=>{const cyclic=structuredClone(flow);cyclic.edges.push({id:'feedback',from:'report',to:'airflow',kind:'dependency',label:'feedback'});const layers=flowLayers(cyclic);assert.ok(layers.flat().includes('airflow'));assert.equal(new Set(layers.flat()).size,flow.nodes.length);});

const code={format:'datapass.studio.code',version:1,id:'job-code',title:'Job',language:'python',fileLabel:'job.py',code:'a = 1\nb = a + 2\nprint(b)',sourceKind:'synthetic',note:'Display only',highlights:[{start:2,end:2,label:'derived value',kind:'focus'}]};
test('code spec validates inert source and line annotations',()=>{assert.equal(validateCodeSpec(code),code);assert.equal(codeLineAnnotations(code)[1][0].label,'derived value');});
test('code spec rejects out-of-range highlights and unknown fields',()=>{const bad=structuredClone(code);bad.highlights[0].end=9;assert.throws(()=>validateCodeSpec(bad),/range/);assert.throws(()=>validateCodeSpec({...code,execute:true}),/Unknown/);});
