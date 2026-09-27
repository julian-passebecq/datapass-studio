import React,{useMemo,useState} from 'react';
import {validateChartSpec,validateTableSpec} from '../runtime/data-spec.js';
import {h,Badge} from './components.js';

const extent=values=>{const finite=values.filter(Number.isFinite);if(!finite.length)return [0,1];let min=Math.min(...finite),max=Math.max(...finite);if(min===max){const d=Math.abs(min||1)*.1;min-=d;max+=d;}const pad=(max-min)*.06;return [min-pad,max+pad];};
const fmt=v=>typeof v==='number'?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:3}).format(v):v===null?'—':String(v);

export function ChartView({spec,height=280}){
 const chart=useMemo(()=>validateChartSpec(spec),[spec]);
 const width=720,pad={l:58,r:22,t:32,b:48},innerW=width-pad.l-pad.r,innerH=height-pad.t-pad.b;
 const yExtent=extent(chart.series.flatMap(s=>s.points.map(p=>p[1]).filter(v=>v!==null))),ys=v=>pad.t+innerH-(v-yExtent[0])/(yExtent[1]-yExtent[0])*innerH;
 let categories=[],xExtent=[0,1],xs;
 if(chart.x.type==='category'){categories=[...new Set(chart.series.flatMap(s=>s.points.map(p=>p[0])))];xs=x=>pad.l+(categories.indexOf(x)+.5)/Math.max(1,categories.length)*innerW;}
 else{xExtent=extent(chart.series.flatMap(s=>s.points.map(p=>p[0])));xs=x=>pad.l+(x-xExtent[0])/(xExtent[1]-xExtent[0])*innerW;}
 const lines=[0,.25,.5,.75,1].map(v=>{const value=yExtent[0]+v*(yExtent[1]-yExtent[0]);return {value,y:ys(value)};});
 const aria=chart.title+'. '+chart.series.map(s=>s.label+', '+s.points.length+' points').join('. ');
 return h('figure',{className:'studio-chart','data-chart-kind':chart.kind},h('figcaption',null,h('div',null,h('strong',null,chart.title),chart.note&&h('span',null,chart.note)),h(Badge,{tone:chart.sourceKind},chart.sourceKind)),
  h('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':aria,preserveAspectRatio:'xMidYMid meet'},
   ...lines.flatMap((line,i)=>[h('line',{key:'g'+i,x1:pad.l,x2:width-pad.r,y1:line.y,y2:line.y,className:'data-grid-line'}),h('text',{key:'y'+i,x:pad.l-9,y:line.y+4,textAnchor:'end',className:'data-axis-label'},fmt(line.value))]),
   h('line',{x1:pad.l,x2:pad.l,y1:pad.t,y2:height-pad.b,className:'data-axis'}),h('line',{x1:pad.l,x2:width-pad.r,y1:height-pad.b,y2:height-pad.b,className:'data-axis'}),
   ...chart.series.flatMap((series,si)=>{
    const points=series.points.filter(p=>p[1]!==null);
    if(chart.kind==='line'){const d=points.map((p,i)=>(i?'L':'M')+xs(p[0]).toFixed(2)+' '+ys(p[1]).toFixed(2)).join(' ');return [h('path',{key:series.id,d,fill:'none',className:'data-series data-series-'+si}),...points.map((p,i)=>h('circle',{key:series.id+'-'+i,cx:xs(p[0]),cy:ys(p[1]),r:2.8,className:'data-point data-series-'+si}))];}
    if(chart.kind==='scatter')return points.map((p,i)=>h('circle',{key:series.id+'-'+i,cx:xs(p[0]),cy:ys(p[1]),r:4,className:'data-point data-series-'+si}));
    const groupW=innerW/Math.max(1,categories.length),barW=Math.max(2,groupW*.72/chart.series.length);return points.map((p,i)=>{const x=xs(p[0])-groupW*.36+si*barW,y=ys(Math.max(0,p[1])),y0=ys(Math.min(0,p[1]));return h('rect',{key:series.id+'-'+i,x,y:Math.min(y,y0),width:barW*.9,height:Math.max(1,Math.abs(y0-y)),className:'data-bar data-series-'+si});});
   }),
   ...(chart.x.type==='category'?categories.slice(0,24).map((x,i)=>h('text',{key:x,x:xs(x),y:height-pad.b+18,textAnchor:'middle',className:'data-axis-label'},x)): [0,.25,.5,.75,1].map((v,i)=>{const x=xExtent[0]+v*(xExtent[1]-xExtent[0]);return h('text',{key:i,x:xs(x),y:height-pad.b+18,textAnchor:'middle',className:'data-axis-label'},fmt(x));})),
   h('text',{x:pad.l+innerW/2,y:height-8,textAnchor:'middle',className:'data-axis-title'},chart.x.label+(chart.x.unit?' · '+chart.x.unit:'')),
   h('text',{transform:`translate(14 ${pad.t+innerH/2}) rotate(-90)`,textAnchor:'middle',className:'data-axis-title'},chart.y.label+(chart.y.unit?' · '+chart.y.unit:''))
  ),
  h('div',{className:'data-legend'},...chart.series.map((s,i)=>h('span',{key:s.id,className:'data-series-'+i},h('i'),s.label))));
}

export function DataGrid({spec,maxHeight=420}){
 const table=useMemo(()=>validateTableSpec(spec),[spec]),[sort,setSort]=useState({id:null,direction:1});
 const rows=useMemo(()=>{if(!sort.id)return table.rows;const col=table.columns.find(x=>x.id===sort.id);if(!col)return table.rows;return [...table.rows].sort((a,b)=>{const av=a.values[col.id],bv=b.values[col.id];if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return -1;return (typeof av==='number'?av-bv:String(av).localeCompare(String(bv)))*sort.direction;});},[table,sort]);
 function toggle(id){setSort(s=>s.id===id?{id,direction:-s.direction}:{id,direction:1});}
 return h('section',{className:'studio-data-grid'},h('header',null,h('div',null,h('strong',null,table.title),table.note&&h('span',null,table.note)),h(Badge,{tone:table.sourceKind},table.sourceKind)),
  h('div',{className:'studio-data-scroll',style:{maxHeight}},h('table',null,h('thead',null,h('tr',null,...table.columns.map(c=>h('th',{key:c.id,scope:'col'},h('button',{type:'button',onClick:()=>toggle(c.id),'aria-sort':sort.id===c.id?(sort.direction>0?'ascending':'descending'):'none'},c.label,c.unit&&h('small',null,c.unit),sort.id===c.id&&h('span',{className:'sort-mark','aria-hidden':true},sort.direction>0?' ↑':' ↓')))))),h('tbody',null,...rows.map(row=>h('tr',{key:row.id,'data-row-id':row.id},...table.columns.map(c=>h('td',{key:c.id,className:c.type==='number'?'numeric':''},fmt(row.values[c.id]??null))))))));
}
