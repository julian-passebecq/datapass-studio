/** Second independent domain: a handling bench, using the same unmodified runtime and panels. */
import {box,cylinder,identity,translate,multiply,rotateZ} from '../packages/scene/index.js';
const defaults={length:7,width:1.8,height:1.4,lift:1.3,frequency:.25};
const params=[['length','Longueur','m',3,12,.1],['width','Largeur','m',1,4,.1],['height','Hauteur','m',.5,3,.1],['lift','Levage','m',0,3,.1],['frequency','Frequence','Hz',.1,1,.05]].map(([id,label,unit,min,max,step])=>({id,label,unit,min,max,step,group:'Configuration',affects:['geometry','pose']}));
const artifactCatalog={documents:[{id:'bench-note',title:'Dossier de manutention synthetique',mime:'application/pdf',sourceKind:'synthetic',pages:3,sourceLabel:'Fixture publique · document structure sans source industrielle'}],artifacts:[
 {id:'bench-carriage',title:'Course du chariot',kind:'figure',documentId:'bench-note',page:2,entityIds:['carriage','payload'],phase:.25,region:[.09,.23,.80,.30],preview:{plane:'side'},sourceKind:'synthetic',summary:'Repere lie au chariot et a sa charge fictive.'},
 {id:'bench-rails',title:'Implantation des rails',kind:'document-region',documentId:'bench-note',page:3,entityIds:['rail--1','rail-1','bed'],region:[.14,.20,.72,.43],preview:{plane:'top'},sourceKind:'synthetic',summary:'Association documentaire independante du domaine Motion Rig.'}
]};
const cache=new WeakMap();
export const transferBench={id:'transfer-bench',version:'1.0.0',title:'Transfer Bench',description:'Second client, m\u00eame socle',classification:'synthetic',parameters:params,defaults,
 artifactCatalog,
 period:p=>1/p.frequency,
 scenarios:[{id:'standard',label:'Standard',parameters:defaults}],validate:()=>[],
 frame(p,phase,view){let parts=cache.get(p);if(!parts){parts=[];const add=(id,label,pos,color,parameterIds,moving=false)=>parts.push({id,label,positions:pos,color,parameterIds,moving,group:moving?'Chariot':'Banc',source:'synthetic'});
  for(const side of [-1,1])add('rail-'+side,'Rail '+(side===1?'droit':'gauche'),box(0,side*p.width/2,p.height,p.length,.14,.23),[.40,.48,.53],['length','width','height']);
  for(const x of [-1,1])for(const y of [-1,1])add('foot-'+x+'-'+y,'Pied '+x+'/'+y,box(x*(p.length/2-.4),y*p.width/2,p.height/2,.15,.15,p.height),[.29,.39,.43],['height']);
  add('bed','Plateau',box(0,0,p.height-.08,p.length,p.width,.1),[.64,.7,.7],['length','width']);
  add('carriage','Chariot',box(0,0,.18,.9,p.width+.3,.35),[.20,.55,.59],['length'],true);
  add('payload','Charge fictive',box(0,0,.85,.7,.8,1.05),[.74,.53,.29],['lift'],true);cache.set(p,parts);
 }
 const x=Math.sin(phase*2*Math.PI)*(p.length/2-.7),z=Math.max(0,Math.sin(phase*2*Math.PI))*p.lift;
 return {units:'m',source:'SYNTHETIC_MESH_NOT_CAD',warnings:['Cinematique illustrative; pas une trajectoire robot validee.'],parts:parts.map(m=>({...m,matrix:multiply(rotateZ(view.yaw*Math.PI/180),m.moving?translate(x,0,p.height+(m.id==='payload'?z+view.explode:0)):identity())}))};
 },
 traces:p=>[{id:'position',label:'Position X',unit:'m',values:Array.from({length:121},(_,i)=>Math.sin(i/120*2*Math.PI)*(p.length/2-.7))},{id:'lift',label:'Levage',unit:'m',values:Array.from({length:121},(_,i)=>Math.max(0,Math.sin(i/120*2*Math.PI))*p.lift)}],
 metrics:p=>[{id:'length',label:'Longueur',value:p.length,unit:'m',note:'Banc synthetique'},{id:'width',label:'Largeur',value:p.width,unit:'m',note:'Banc synthetique'},{id:'period',label:'Periode',value:1/p.frequency,unit:'s',note:'Mouvement prescrit'},{id:'parts',label:'Pieces liees',value:9,unit:'',note:'Meme moteur que Motion Rig'}],
 explain:[{title:'Changer de domaine',body:'Ce client reutilise selection, historique, 3D, plans et timeline. Le noyau ne connait ni rail ni chariot.',entityId:'carriage',phase:.2,code:'registerClient(transferBench)'},{title:'Une vue n\u2019est pas un modele',body:'Chaque projection consomme les memes pieces deja positionnees.',entityId:'payload',phase:.4,code:'projection(frame.parts, "side")'}]
};
