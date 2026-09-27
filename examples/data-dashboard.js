import {validateChartSpec,validateTableSpec} from '../packages/runtime/data-spec.js';

export const outputChart=validateChartSpec({
  format:'datapass.studio.chart',version:1,id:'output',title:'Synthetic response',kind:'line',
  x:{label:'Time',unit:'s',type:'number'},y:{label:'Amplitude',unit:'V',type:'number'},
  series:[
    {id:'raw',label:'Raw',points:Array.from({length:25},(_,i)=>[i/24,Math.sin(i/24*Math.PI*2)])},
    {id:'filtered',label:'Filtered',points:Array.from({length:25},(_,i)=>[i/24,.7*Math.sin(i/24*Math.PI*2)])}
  ],
  sourceKind:'synthetic',note:'Portable chart contract; current reference renderer is native SVG.'
});

export const metricsTable=validateTableSpec({
  format:'datapass.studio.table',version:1,id:'metrics',title:'Metrics',
  columns:[{id:'metric',label:'Metric',type:'string',unit:''},{id:'value',label:'Value',type:'number',unit:''}],
  rows:[{id:'peak',values:{metric:'Peak',value:1}},{id:'rms',values:{metric:'RMS',value:.707}}],
  sourceKind:'synthetic',note:'The same contract can be rendered by another adapter later.'
});
