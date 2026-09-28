/** Third public reference client: signal processing / monitoring rather than a mechanism. */
import {box,cylinder,identity,translate,multiply,rotateZ} from '../packages/scene/index.js';
const defaults={amplitude:1.2,frequency:.65,phaseLag:35,damping:.22,gain:1.35,spacing:2.4};
const p=(id,label,unit,min,max,step,group,affects,note='')=>({id,label,unit,min,max,step,group,affects,note});
const parameters=[
 p('amplitude','Amplitude','V',.1,4,.05,'Signal',['metrics','trace','pose'],'Signal synthetique sans acquisition materielle.'),
 p('frequency','Frequence','Hz',.1,3,.05,'Signal',['trace','pose']),
 p('phaseLag','Retard de phase','°',0,180,1,'Signal',['trace','pose']),
 p('damping','Amortissement','',0,.9,.01,'Traitement',['metrics','trace']),
 p('gain','Gain','x',.2,3,.05,'Traitement',['metrics','trace']),
 p('spacing','Espacement capteurs','m',1,6,.1,'Disposition',['geometry'])
];
const artifactCatalog={documents:[{id:'signal-note',title:'Note de traitement du signal synthetique',mime:'application/pdf',sourceKind:'synthetic',pages:4,sourceLabel:'Fixture publique · aucune mesure client embarquee'}],artifacts:[
 {id:'signal-source',title:'Signal brut et reperes capteurs',kind:'figure',documentId:'signal-note',page:2,entityIds:['sensor-a','sensor-b','sensor-c'],phase:.15,region:[.08,.18,.82,.31],preview:{plane:'front'},sourceKind:'synthetic',summary:'Exemple de liaison entre un signal, plusieurs entites de scene et une figure source.'},
 {id:'signal-filter',title:'Etage de filtrage',kind:'document-region',documentId:'signal-note',page:3,entityIds:['filter'],phase:.50,region:[.14,.25,.70,.30],preview:{plane:'side'},sourceKind:'synthetic',summary:'Le bloc de traitement reste une entite stable dans 3D, plans et references.'},
 {id:'signal-output',title:'Sortie amplifiee',kind:'figure',documentId:'signal-note',page:4,entityIds:['output'],phase:.75,region:[.12,.18,.76,.42],preview:{plane:'top'},sourceKind:'synthetic',summary:'Montre que Studio peut piloter une app analytique sans modele mecanique reel.'}
]};
const phase=v=>v*Math.PI/180;
function wave(p,t,lag=0){return p.amplitude*Math.sin(2*Math.PI*t+lag);}
function filtered(p,t){const raw=wave(p,t,phase(p.phaseLag));return raw*(1-p.damping)*p.gain;}
function makeGeometry(p){
 const parts=[];const add=(id,label,group,positions,color,parameterIds,motion='fixed')=>parts.push({id,label,group,positions,color,parameterIds,motion,source:'synthetic'});
 add('base','Banc capteurs','Structure',box(0,0,.08,p.spacing*3.1,1.1,.16),[.30,.39,.43],['spacing']);
 for(const [i,id] of ['a','b','c'].entries()){
   add('mast-'+id,'Support '+id.toUpperCase(),'Capteurs',cylinder(.07,0,1.4),[.42,.50,.53],['spacing']);
   add('sensor-'+id,'Capteur '+id.toUpperCase(),'Capteurs',box(0,0,0,.46,.46,.32),[.17,.52,.59],['spacing','amplitude','phaseLag'],'sensor-'+id);
 }
 add('filter','Filtre','Traitement',box(0,0,.35,1.25,.85,.7),[.62,.49,.25],['damping'],'filter');
 add('output','Sortie','Traitement',box(0,0,.38,1.0,.85,.76),[.34,.60,.43],['gain'],'output');
 return parts;
}
const geometryCache=new WeakMap();
function geometry(p){let g=geometryCache.get(p);if(!g){g=makeGeometry(p);geometryCache.set(p,g);}return g;}
export const signalLab={
 id:'signal-lab',version:'1.0.0',title:'Signal Lab',description:'Client analytique synthétique · même runtime',classification:'synthetic',parameters,defaults,artifactCatalog,
 period:p=>1/p.frequency,
 scenarios:[{id:'standard',label:'Standard',parameters:defaults},{id:'high-gain',label:'Gain eleve',parameters:{...defaults,gain:2.1,damping:.34}},{id:'phase-study',label:'Etude phase',parameters:{...defaults,phaseLag:90,frequency:1.1}}],
 validate:p=>p.gain*(1-p.damping)>2.7?['La combinaison gain/amortissement depasse la plage illustrative.']:[],
 frame(p,t,view){const yaw=rotateZ(view.yaw*Math.PI/180),samples={a:wave(p,t,0),b:wave(p,t,phase(p.phaseLag)),c:wave(p,t,phase(p.phaseLag*2))};return {units:'m',source:'SYNTHETIC_SIGNAL_SCENE',warnings:['Signaux generes. Pas de donnees de capteur, calibration ou validation metrologique.'],parts:geometry(p).map(part=>{
   let m=identity();if(part.id.startsWith('mast-')){const id=part.id.at(-1),idx={a:-1,b:0,c:1}[id];m=translate(idx*p.spacing,0,0);}else if(part.motion?.startsWith('sensor-')){const id=part.motion.at(-1),idx={a:-1,b:0,c:1}[id];m=translate(idx*p.spacing,0,1.55+samples[id]*.18);}else if(part.motion==='filter')m=translate(p.spacing*1.65,0,.35+Math.abs(filtered(p,t))*.12);else if(part.motion==='output')m=translate(-p.spacing*1.65,0,.38+Math.abs(filtered(p,t+.1))*.12);
   if(view.explode){const shift=part.group==='Traitement'?(part.id==='filter'?1:-1)*view.explode*.8:0;m=multiply(translate(shift,0,0),m);}return {...part,matrix:multiply(yaw,m)};})};},
 traces:p=>{const n=181,ts=Array.from({length:n},(_,i)=>i/(n-1));return [
   {id:'raw',label:'Signal brut',unit:'V',values:ts.map(t=>wave(p,t,0))},
   {id:'delayed',label:'Signal retarde',unit:'V',values:ts.map(t=>wave(p,t,phase(p.phaseLag)))},
   {id:'filtered',label:'Sortie traitee',unit:'V',values:ts.map(t=>filtered(p,t))}
 ];},
 metrics:p=>{
   const outputPeak=p.amplitude*(1-p.damping)*p.gain;return [
    {id:'peak',label:'Pic sortie',value:Number(outputPeak.toFixed(3)),unit:'V',note:'Calcul synthetique'},
    {id:'rms',label:'RMS sortie',value:Number((outputPeak/Math.sqrt(2)).toFixed(3)),unit:'V',note:'Sinusoide ideale'},
    {id:'delay',label:'Retard',value:Number((p.phaseLag/360/p.frequency).toFixed(3)),unit:'s',note:'Derive de la phase prescrite'},
    {id:'channels',label:'Canaux',value:3,unit:'',note:'Entites synchronisees'}
   ];
 },
 explain:[
  {title:'Une app analytique, pas un CAD',body:'Le meme runtime synchronise ici trois canaux, un filtre et une sortie. Les vues 3D servent seulement de contexte spatial.',entityId:'sensor-b',phase:.15,code:'client.traces(parameters)'},
  {title:'Calcul derive local',body:'Gain et amortissement affectent la sortie sans relancer toute l application.',entityId:'filter',phase:.45,code:'output = raw * (1 - damping) * gain'},
  {title:'Meme identite partout',body:'La selection de la sortie suit les plans et la reference documentaire comme pour un client mecanique.',entityId:'output',phase:.75,code:'store.select("output")'}
 ]
};
