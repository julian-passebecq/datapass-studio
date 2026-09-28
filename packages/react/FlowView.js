import React,{useMemo,useState} from 'react';
import {validateFlowSpec,flowLayers,flowNeighborhood} from '../runtime/flow-spec.js';
import {h,Badge,Button} from './components.js';

const kindLabel={source:'Source',transform:'Transform',store:'Store',model:'Model',report:'Report',service:'Service',task:'Task',decision:'Decision',note:'Note'};
function positionsFor(flow,width,height){
 const layers=flowLayers(flow),nodeById=new Map(flow.nodes.map(node=>[node.id,node])),positions=new Map();
 if(flow.orientation==='horizontal'){
  const xGap=width/Math.max(1,layers.length);
  layers.forEach((ids,layerIndex)=>{const yGap=height/Math.max(1,ids.length);ids.forEach((id,row)=>positions.set(id,{x:xGap*(layerIndex+.5),y:yGap*(row+.5),node:nodeById.get(id)}));});
 }else{
  const yGap=height/Math.max(1,layers.length);
  layers.forEach((ids,layerIndex)=>{const xGap=width/Math.max(1,ids.length);ids.forEach((id,column)=>positions.set(id,{x:xGap*(column+.5),y:yGap*(layerIndex+.5),node:nodeById.get(id)}));});
 }
 return positions;
}
function edgePath(a,b,orientation){
 if(orientation==='horizontal'){const mx=(a.x+b.x)/2;return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;}
 const my=(a.y+b.y)/2;return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
}

export function FlowView({spec,height=520,selectedId=null,onSelect}){
 const flow=useMemo(()=>validateFlowSpec(spec),[spec]);
 const [internal,setInternal]=useState(()=>selectedId||flow.nodes[0]?.id||null);
 const [zoom,setZoom]=useState(1);
 const selected=selectedId??internal,node=flow.nodes.find(item=>item.id===selected)||flow.nodes[0]||null;
 const neighborhood=node?flowNeighborhood(flow,node.id):{upstream:[],downstream:[]};
 const related=new Set([node?.id,...neighborhood.upstream,...neighborhood.downstream].filter(Boolean));
 const layers=flowLayers(flow),width=Math.max(760,layers.length*230),canvasHeight=Math.max(height,Math.max(...layers.map(x=>x.length),1)*128);
 const positions=useMemo(()=>positionsFor(flow,width,canvasHeight),[flow,width,canvasHeight]);
 const vw=width/zoom,vh=canvasHeight/zoom,vx=(width-vw)/2,vy=(canvasHeight-vh)/2,marker='flow-arrow-'+flow.id.replace(/[^a-zA-Z0-9_-]/g,'-');
 function select(id){if(selectedId==null)setInternal(id);onSelect?.(id);}
 return h('section',{className:'studio-flow'},
  h('header',{className:'studio-flow-head'},
   h('div',null,h('strong',null,flow.title),flow.note&&h('span',null,flow.note)),
   h('div',{className:'studio-flow-tools'},h(Badge,{tone:flow.sourceKind},flow.sourceKind),h(Button,{className:'compact',onClick:()=>setZoom(z=>Math.max(.7,Number((z-.15).toFixed(2))))},'−'),h('span',{className:'mono'},Math.round(zoom*100)+'%'),h(Button,{className:'compact',onClick:()=>setZoom(z=>Math.min(1.8,Number((z+.15).toFixed(2))))},'+'))
  ),
  h('div',{className:'studio-flow-body'},
   h('div',{className:'studio-flow-canvas'},
    h('svg',{viewBox:`${vx} ${vy} ${vw} ${vh}`,role:'img','aria-label':flow.title,preserveAspectRatio:'xMidYMid meet'},
     h('defs',null,h('marker',{id:marker,markerWidth:8,markerHeight:8,refX:7,refY:4,orient:'auto',markerUnits:'strokeWidth'},h('path',{d:'M0,0 L8,4 L0,8 z',className:'flow-arrow'}))),
     ...flow.edges.map(edge=>{const a=positions.get(edge.from),b=positions.get(edge.to),active=selected&&(edge.from===selected||edge.to===selected);return h('g',{key:edge.id,className:'flow-edge-group '+(active?'active':'')},h('path',{d:edgePath(a,b,flow.orientation),className:'flow-edge '+edge.kind,markerEnd:`url(#${marker})`}),edge.label&&h('text',{x:(a.x+b.x)/2,y:(a.y+b.y)/2-7,textAnchor:'middle',className:'flow-edge-label'},edge.label));}),
     ...flow.nodes.map(item=>{const p=positions.get(item.id),active=item.id===node?.id,dimmed=selected&&!related.has(item.id);return h('g',{key:item.id,transform:`translate(${p.x-78} ${p.y-34})`,className:'flow-node '+item.kind+(active?' active':'')+(dimmed?' dimmed':''),role:'button',tabIndex:0,'aria-pressed':active,'aria-label':item.label,onClick:()=>select(item.id),onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(item.id);}}},h('rect',{width:156,height:68,rx:7}),h('text',{x:12,y:20,className:'flow-node-kind'},kindLabel[item.kind]||item.kind),h('text',{x:12,y:42,className:'flow-node-label'},item.label),item.group&&h('text',{x:12,y:57,className:'flow-node-group'},item.group));})
    )
   ),
   node&&h('aside',{className:'studio-flow-inspector'},h('span',{className:'label-small'},kindLabel[node.kind]||node.kind),h('h3',null,node.label),node.detail&&h('p',null,node.detail),node.group&&h('dl',null,h('dt',null,'Groupe'),h('dd',null,node.group)),node.entityIds.length>0&&h('div',{className:'flow-entities'},h('span',null,'Entités liées'),...node.entityIds.map(id=>h('code',{key:id},id))),h('div',{className:'flow-neighbors'},h('strong',null,'Amont'),neighborhood.upstream.length?h('div',null,...neighborhood.upstream.map(id=>h('button',{key:id,onClick:()=>select(id)},flow.nodes.find(n=>n.id===id)?.label||id))):h('span',null,'—'),h('strong',null,'Aval'),neighborhood.downstream.length?h('div',null,...neighborhood.downstream.map(id=>h('button',{key:id,onClick:()=>select(id)},flow.nodes.find(n=>n.id===id)?.label||id))):h('span',null,'—')))
  )
 );
}
