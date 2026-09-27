import {validateLayoutDocument} from '../packages/runtime/layout.js';

export const analysisLayout=validateLayoutDocument({
  format:'datapass.studio.layout',
  version:1,
  id:'figure-document-analysis',
  title:'Figure / document / data',
  root:{
    id:'root',kind:'split',axis:'horizontal',ratio:.34,resizable:true,
    first:{id:'figures',kind:'slot',slot:'figure-list',label:'Figures'},
    second:{id:'detail-tabs',kind:'tabs',defaultTab:'document',tabs:[
      {id:'document',label:'Document',child:{id:'document-slot',kind:'slot',slot:'document'}},
      {id:'data',label:'Data',child:{id:'data-slot',kind:'slot',slot:'data'}},
      {id:'code',label:'Code',child:{id:'code-slot',kind:'slot',slot:'code'}}
    ]}
  }
});

console.log(JSON.stringify(analysisLayout,null,2));
