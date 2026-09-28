/** Copy to clients/my-lab.js, adapt your domain, register in clients/index.js. */
import {box,translate} from '../packages/scene/index.js';
const cube=box(0,0,0,1,1,1),defaults={travel:3};
export const minimalClient={
 id:'minimal-lab',title:'Minimal Lab',description:'One domain, shared workbench',version:'1.0.0',classification:'synthetic',defaults,
 parameters:[{id:'travel',label:'Travel',unit:'m',min:1,max:8,step:.1,group:'Geometry',affects:['pose']}],
 artifactCatalog:{documents:[{id:'lab-note',title:'Local lab note',mime:'application/pdf',sourceKind:'user-reference'}],artifacts:[{id:'payload-figure',title:'Payload figure',kind:'figure',documentId:'lab-note',page:1,entityIds:['payload'],phase:.25,preview:{plane:'side'},sourceKind:'user-reference',summary:'Optional binding between one stable scene entity and a user-authorized document region.'}]},
 scenarios:[{id:'standard',label:'Standard',parameters:defaults}],period:()=>3,validate:()=>[],
 frame:(p,phase)=>({units:'m',source:'SYNTHETIC_MESH_NOT_CAD',warnings:['Illustrative only'],parts:[{
  id:'payload',label:'Payload',group:'Assembly',positions:cube,matrix:translate(p.travel*Math.sin(phase*2*Math.PI),0,1),
  color:[.2,.55,.6],parameterIds:['travel'],source:'synthetic'}]}),
 traces:p=>[{id:'x',label:'Travel',unit:'m',values:Array.from({length:61},(_,i)=>p.travel*Math.sin(i/60*2*Math.PI))}],
 metrics:p=>[{id:'travel',label:'Travel',value:p.travel,unit:'m',note:'Illustrative geometry'}],
 explain:[{title:'One payload',body:'The same object identity is used in every view.',phase:.25,entityId:'payload',code:'client.frame(parameters, phase, view)'}]
};
