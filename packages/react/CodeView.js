import React,{useMemo} from 'react';
import {validateCodeSpec,codeLineAnnotations} from '../runtime/code-spec.js';
import {h,Badge} from './components.js';

export function CodeView({spec,maxHeight=520}){
 const value=useMemo(()=>validateCodeSpec(spec),[spec]),annotations=useMemo(()=>codeLineAnnotations(value),[value]),lines=value.code.split('\n');
 return h('section',{className:'studio-code-view'},
  h('header',null,h('div',null,h('strong',null,value.title),h('span',null,value.fileLabel||value.language),value.note&&h('small',null,value.note)),h(Badge,{tone:value.sourceKind},value.sourceKind)),
  h('div',{className:'studio-code-scroll',style:{maxHeight},role:'region','aria-label':'Code '+value.title},
   h('pre',null,h('code',null,...lines.map((line,index)=>{const marks=annotations[index]||[],kind=marks[0]?.kind||'',label=marks.map(x=>x.label).filter(Boolean).join(' · ');return h('span',{key:index,className:'code-line '+(kind?'highlight '+kind:''),title:label||undefined},h('span',{className:'code-line-number','aria-hidden':true},String(index+1)),h('span',{className:'code-line-text'},line||' '),label&&h('span',{className:'code-line-note'},label));})))
  ),
  h('footer',null,'Affichage uniquement · aucun code de ce panneau n’est exécuté par Studio.')
 );
}
