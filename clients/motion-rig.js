/** Original synthetic client. All domain knowledge lives here, never in packages/. */
import {box,cylinder,extrude,merge,identity,translate,rotateY,rotateZ,multiply} from '../packages/scene/index.js';
const parameter=(id,label,unit,min,max,step,group,affects,note='')=>({id,label,unit,min,max,step,group,affects,note});
const parameters=[
  parameter('span','Envergure','m',1,14,.1,'G\u00e9om\u00e9trie',['geometry'],'Dimension transversale du panneau fictif.'),
  parameter('stroke','Course verticale','m',.1,4,.1,'G\u00e9om\u00e9trie',['geometry','pose']),
  parameter('arm','Longueur des bras','m',2.1,7,.1,'G\u00e9om\u00e9trie',['geometry','pose']),
  parameter('height','Hauteur du support','m',3,10,.1,'G\u00e9om\u00e9trie',['geometry']),
  parameter('chord','Largeur des panneaux','m',.3,2,.05,'G\u00e9om\u00e9trie',['geometry']),
  parameter('frequency','Fr\u00e9quence','Hz',.1,2,.05,'Mouvement',['pose'],'Mouvement prescrit, sans simulation des efforts.'),
  parameter('pitch','Rotation des panneaux','\u00b0',0,60,1,'Mouvement',['pose']),
  parameter('phaseOffset','D\u00e9phasage','\u00b0',0,180,5,'Mouvement',['pose'])
];
const defaults={span:6,stroke:2.6,arm:3.2,height:4.8,chord:.75,frequency:.4,pitch:24,phaseOffset:90};
const meshCache=new WeakMap();
function geometry(p){
 if(meshCache.has(p))return meshCache.get(p);
 const parts=[],add=(id,label,group,positions,color,parameterIds,motion='fixed')=>parts.push({id,label,group,positions,color,parameterIds,motion,source:'synthetic'});
 const steel=[.36,.46,.5],light=[.78,.84,.84],dark=[.21,.32,.36];
 add('base','Platine','Structure',box(0,0,.1,2.2,2.2,.2),dark,['height']);
 add('tower','Support central','Structure',cylinder(.18,.2,p.height),steel,['height']);
 add('bearing','Pivot de t\u00eate','Structure',cylinder(.34,-.13,.13),dark,[],'head');
 add('head','Ch\u00e2ssis','Structure',merge(box(0,0,-.35,1,.9,.14),box(0,0,.35,1,.9,.14),box(-.43,0,0,.14,.9,.56),box(.43,0,0,.14,.9,.56)),steel,[],'head');
 add('housing','Bo\u00eetier illustratif','Structure',box(0,0,0,.58,.66,.42),[.70,.47,.25],[],'head');
 for(const [i,label] of [['a','A'],['b','B']]){
  add('arm-'+i,'Bras '+label,'Mobile '+label,cylinder(.075,0,p.arm,'x'),steel,['arm','stroke'],'arm-'+i);
  add('pivot-'+i,'Pivot '+label,'Mobile '+label,cylinder(.12,-.14,.14,'y'),dark,['pitch'],'panel-'+i);
  const poly=Array.from({length:28},(_,j)=>{const a=j/28*2*Math.PI;return [.5*p.chord*Math.cos(a),.045*Math.sin(a)];});
  add('panel-'+i,'Panneau '+label,'Mobile '+label,extrude(poly,-p.span/2,p.span/2,'y'),light,['span','chord','pitch'],'panel-'+i);
 }
 meshCache.set(p,parts);return parts;
}
export function pose(p,phase){const out={};for(const [id,side,offset] of [['a',1,0],['b',-1,-p.phaseOffset*Math.PI/180]]){
 const a=2*Math.PI*phase+offset,h=p.stroke/2*Math.sin(a),beta=Math.asin(h/p.arm);
 out[id]={x:side*(.5+Math.sqrt(p.arm*p.arm-h*h)),z:p.height+h,heave:h,pitch:p.pitch*Math.PI/180*Math.cos(a),arm:side===1?-beta:Math.PI+beta};
 }return out;}
export const motionRig={
 id:'motion-rig',title:'Motion Rig',description:'Client de r\u00e9f\u00e9rence synth\u00e9tique',classification:'synthetic',version:'1.0.0',parameters,defaults,
 period:p=>1/p.frequency,
 scenarios:[{id:'standard',label:'Standard',parameters:defaults},{id:'compact',label:'Compact',parameters:{...defaults,span:3.5,stroke:1.4,arm:2.4,height:3.4}}],
 validate:p=>p.arm<=p.stroke/2?['Le bras doit depasser la demi-course.']:[],
 frame(p,phase,view){const st=pose(p,phase),yaw=rotateZ(view.yaw*Math.PI/180);return {units:'m',source:'SYNTHETIC_MESH_NOT_CAD',warnings:['Mouvement prescrit. Pas de modele aeroelasticite ni de dimensionnement.'],parts:geometry(p).map(x=>{
  let m=identity();if(x.motion==='head')m=translate(0,0,p.height);
  else if(x.motion.startsWith('arm-')){const id=x.motion.at(-1);m=multiply(translate(id==='a'?.5:-.5,0,p.height),rotateY(st[id].arm));}
  else if(x.motion.startsWith('panel-')){const id=x.motion.at(-1);m=multiply(translate(st[id].x,0,st[id].z),rotateY(-st[id].pitch));}
  if(x.motion!=='fixed')m=multiply(yaw,m);
  if(view.explode){const side=x.motion.endsWith('a')?1:x.motion.endsWith('b')?-1:0;m=multiply(translate(side*view.explode*1.2,0,x.motion==='head'?view.explode*.8:0),m);}
  return {...x,matrix:m};})};},
 traces:p=>['a','b'].map(id=>({id,label:'Mobile '+id.toUpperCase(),unit:'m',values:Array.from({length:121},(_,i)=>pose(p,i/120)[id].heave)})),
 metrics:p=>[{id:'span',label:'Envergure',value:p.span,unit:'m',note:'Geometrie fictive'},
  {id:'stroke',label:'Course verticale',value:p.stroke,unit:'m',note:'Consigne de mouvement'},
  {id:'period',label:'Periode du cycle',value:1/p.frequency,unit:'s',note:'Calcul kinematique'},
  {id:'parts',label:'Pieces liees',value:11,unit:'',note:'Memes identifiants 2D / 3D'}],
 explain:[{title:'Une seule identit\u00e9',body:'Selectionnez une piece: la vue 3D, les plans et la nomenclature partagent son identifiant.',entityId:'panel-a',phase:.12,code:'store.select("panel-a")'},
  {title:'Un seul instant',body:'La phase du cycle pilote chaque projection. Tourner la camera ne recalcule pas un modele scientifique.',entityId:'arm-a',phase:.25,code:'client.frame(parameters, phase, view)'},
  {title:'Une seule r\u00e9vision',body:'Une modification invalide les resultats serveur precedents. Ils ne sont jamais presentes comme actuels.',entityId:'tower',phase:.5,code:'request.inputRevision === state.revision'},
  {title:'Exporter sans inventer',body:'Le document transporte la provenance. Le maillage reste une illustration, pas un plan de fabrication.',entityId:null,phase:.75,code:'exportPlanSvg(frame, "front", context)'}]
};
