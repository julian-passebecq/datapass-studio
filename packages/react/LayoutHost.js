import React,{useState} from 'react';
import {validateLayoutDocument} from '../runtime/layout.js';
import {h} from './components.js';

function Slot({node,slots}){const content=slots[node.slot];return h('section',{className:'studio-layout-slot','data-layout-slot':node.slot,'aria-label':node.label||node.slot},content??h('div',{className:'studio-layout-missing',role:'status'},'Slot non fourni : ',h('code',null,node.slot)));}
function Node({node,slots}){
 if(node.kind==='slot')return h(Slot,{node,slots});
 if(node.kind==='split')return h('div',{className:'studio-layout-split '+node.axis,style:{'--layout-first':(node.ratio*100)+'%','--layout-second':((1-node.ratio)*100)+'%'},'data-resizable':String(node.resizable)},h(Node,{node:node.first,slots}),h(Node,{node:node.second,slots}));
 if(node.kind==='grid')return h('div',{className:'studio-layout-grid',style:{gridTemplateColumns:`repeat(${node.columns}, minmax(0, 1fr))`,gap:node.gap}},...node.children.map(x=>h(Node,{key:x.id,node:x,slots})));
 if(node.kind==='stack')return h('div',{className:'studio-layout-stack '+node.direction,style:{gap:node.gap}},...node.children.map(x=>h(Node,{key:x.id,node:x,slots})));
 return h(Tabs,{node,slots});
}
function Tabs({node,slots}){const [active,setActive]=useState(node.defaultTab);const current=node.tabs.find(x=>x.id===active)||node.tabs[0];return h('section',{className:'studio-layout-tabs'},h('div',{role:'tablist',className:'studio-layout-tablist'},...node.tabs.map(tab=>h('button',{key:tab.id,type:'button',role:'tab','aria-selected':tab.id===current.id,className:tab.id===current.id?'active':'',onClick:()=>setActive(tab.id)},tab.label))),h('div',{role:'tabpanel',className:'studio-layout-tabpanel'},h(Node,{node:current.child,slots})));}
export function LayoutHost({layout,slots={},className=''}){const value=validateLayoutDocument(layout,{knownSlots:Object.keys(slots)});return h('div',{className:'studio-layout '+className,'data-layout-id':value.id},h(Node,{node:value.root,slots}));}
