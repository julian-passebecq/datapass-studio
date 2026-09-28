import test from 'node:test';import assert from 'node:assert/strict';
import {validateChartSpec,validateTableSpec,tableRowsForColumns} from '../packages/runtime/data-spec.js';

const chart={format:'datapass.studio.chart',version:1,id:'output-chart',title:'Output',kind:'line',x:{label:'Time',unit:'s',type:'number'},y:{label:'Value',unit:'V',type:'number'},series:[{id:'a',label:'Channel A',points:[[0,1],[1,2],[2,null]]}],sourceKind:'synthetic',note:'Example'};
const table={format:'datapass.studio.table',version:1,id:'metrics-table',title:'Metrics',columns:[{id:'name',label:'Name',type:'string',unit:''},{id:'value',label:'Value',type:'number',unit:'V'}],rows:[{id:'r1',values:{name:'A',value:1.2}},{id:'r2',values:{name:'B',value:2.3}}],sourceKind:'synthetic',note:''};

test('chart spec validates line/bar/scatter data without renderer coupling',()=>{assert.equal(validateChartSpec(chart),chart);assert.equal(validateChartSpec({...chart,kind:'scatter'}).kind,'scatter');const bar={...chart,kind:'bar',x:{label:'Category',unit:'',type:'category'},series:[{id:'a',label:'A',points:[['one',1],['two',2]]}]};assert.equal(validateChartSpec(bar),bar);});
test('chart spec rejects executable/unknown/non-finite input',()=>{assert.throws(()=>validateChartSpec({...chart,formatter:'eval(x)'}),/Unknown/);const bad=structuredClone(chart);bad.series[0].points[0][1]=Infinity;assert.throws(()=>validateChartSpec(bad),/Finite/);});
test('table spec validates scalar typed rows and stable columns',()=>{assert.equal(validateTableSpec(table),table);assert.deepEqual(tableRowsForColumns(table),[['A',1.2],['B',2.3]]);});
test('table spec rejects unknown columns and non-scalar values',()=>{const bad=structuredClone(table);bad.rows[0].values.other=3;assert.throws(()=>validateTableSpec(bad),/Unknown row column/);const nested=structuredClone(table);nested.rows[0].values.name={x:1};assert.throws(()=>validateTableSpec(nested),/Non-scalar/);});
