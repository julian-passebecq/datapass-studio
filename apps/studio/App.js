import React,{useState,useMemo,useEffect,useRef} from 'react';
import {WorkspaceStore,PlaybackStore,WorkspaceRepository,SaveQueue,canonical,boundedJson,validateDocument,LatestRequest,artifactCatalog,artifactsForEntity,documentForArtifact,SessionTrace,manifestFromClient} from '../../packages/runtime/index.js';
import {h,useWorkspace,Icon,IconButton,Button,Badge,Panel,PanelBoundary,Modal,MetricStrip,SceneViewport,PlanView,TraceChart,ComparisonTraceChart,Timeline,download} from '../../packages/react/components.js';
import {ArtifactWorkspace} from '../../packages/react/artifact-workspace.js';
import {LayoutHost} from '../../packages/react/LayoutHost.js';
import {ChartView,DataGrid} from '../../packages/react/DataViews.js';
import {FlowView} from '../../packages/react/FlowView.js';
import {CodeView} from '../../packages/react/CodeView.js';
import {Assembly,Inspector,PartsTable,SelectionBar} from './panels.js';
import {exportPlanSvg,escapeXml} from '../../packages/scene/projection.js';
const MODE_LABELS={lab:'Laboratoire 3D',plans:'Plans 2D',compare:'Comparer',references:'Références',data:'Données',explain:'Expliquer'};
const MODE_ICONS={lab:'cube',plans:'layers',compare:'compare',references:'folder',data:'chart',explain:'code'};
const STATUS={idle:'Aucun calcul serveur',running:'Calcul en cours',ready:'Calcul li\u00e9 \u00e0 la r\u00e9vision',stale:'R\u00e9sultat ant\u00e9rieur \u00b7 obsol\u00e8te',error:'Calcul indisponible'};
const SAVE={memory:'Session en memoire - exporter JSON',saved:'Enregistr\u00e9 localement',saving:'Enregistrement...',error:'Sauvegarde en erreur','not-saved':'Session locale'};
function usePersistence(store){useEffect(()=>{
 const close=e=>{if(store.getSnapshot().dirty){e.preventDefault();e.returnValue='';}};
 window.addEventListener('beforeunload',close);
 if(globalThis.__STUDIO_BOOT__?.offline&&globalThis.__STUDIO_BOOT__?.persistence!=='indexeddb'){
   store.setSaveStatus('memory');return()=>window.removeEventListener('beforeunload',close);
 }
 const repo=new WorkspaceRepository();let savedIdentity='',alive=true,timer,off=()=>{};
 const queue=new SaveQueue(async doc=>{await repo.save(store.client.id,doc);savedIdentity=canonical(doc);},(status,error)=>{
   const current=savedIdentity===canonical(store.document());
   store.setSaveStatus(status==='saved'&&!current?'saving':status,status==='saved'&&current);
   if(error)store.setError(error.message);
 });
 (async()=>{try{const saved=await repo.load(store.client.id);if(!alive){repo.close();return;}
   if(saved&&!store.getSnapshot().dirty)store.restore(saved);let last=canonical(store.document());
   off=store.subscribe(()=>{const next=canonical(store.document());if(next===last)return;last=next;clearTimeout(timer);timer=setTimeout(()=>queue.enqueue(store.document()),350);});
   if(!saved||store.getSnapshot().dirty)queue.enqueue(store.document());
 }catch(e){if(alive){store.setSaveStatus('error');store.setError('Stockage non restaurable: '+e.message+' Cette session ne remplace pas la copie existante.');}}})();
 return()=>{alive=false;off();clearTimeout(timer);if(store.getSnapshot().dirty)queue.enqueue(store.document());
   queue.chain.finally(()=>{queue.dispose();repo.close();});window.removeEventListener('beforeunload',close);};
 },[store]);}
function CameraChannel(){const listeners=new Set();return {publish:(cam,id)=>{for(const f of listeners)f(cam,id);},subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);}};}
function ExportDialog({store,playback,sceneApi,trace,traceStartedAt,onClose}){
 const [message,setMessage]=useState(''),s=store.getSnapshot(),t=playback.getSnapshot();
 function recordExport(kind){trace?.record('export',kind,{inputRevision:s.revision,phase:t.phase});}
 function appManifest(){download(store.client.id+'-app-manifest.json',JSON.stringify(manifestFromClient(store.client),null,2));recordExport('app-manifest');setMessage('Manifeste declaratif exporte. Il ne contient aucun callback executable.');}
 function sessionTrace(){download(store.client.id+'-session-trace.json',JSON.stringify(trace.export({clientId:store.client.id,clientVersion:store.client.version,startedAt:traceStartedAt}),null,2));recordExport('session-trace');setMessage('Trace de session exportee sans valeurs de parametres.');}
 function svg(plane){download(store.client.id+'-'+plane+'-r'+s.revision+'.svg',exportPlanSvg(store.client.frame(s.parameters,t.phase,{...s.view,scenarioId:s.scenarioId}),plane,{title:store.client.title,revision:s.revision,phase:t.phase,selection:s.selection}),'image/svg+xml');recordExport('svg-'+plane);setMessage('Projection SVG exportee.');}
 function evidence(){const catalog=artifactCatalog(store.client),artifactBindings=artifactsForEntity(catalog,s.selection).map(a=>{const d=documentForArtifact(catalog,a);return {artifactId:a.id,title:a.title,kind:a.kind,entityIds:[...a.entityIds],document:d?{id:d.id,title:d.title,sourceKind:d.sourceKind}:null,page:a.page||null,sourceKind:a.sourceKind||d?.sourceKind||'derived'};});const value={format:'datapass.studio.evidence',version:1,clientId:store.client.id,clientVersion:store.client.version,
   revision:s.revision,parameters:{...s.parameters},frame:{phase:t.phase,view:{...s.view}},selection:s.selection,artifactBindings,
   evaluation:s.evaluationStatus==='ready'?s.evaluation:null,evaluationState:s.evaluationStatus,
   provenance:{classification:store.client.classification,reviewed:false,visibility:'private',claim:'illustrative-unless-explicit-source-evidence'},
   warnings:['A reviewed adapter is required before import into DiagramCloud.','No scientific validation is inferred from a successful software computation.']};
  download(store.client.id+'-evidence.json',JSON.stringify(value,null,2));setMessage('Dossier d\u2019evidence exporte: prive et non relu.');}
 function report(){const frame=store.client.frame(s.parameters,t.phase,{...s.view,scenarioId:s.scenarioId}),svgText=exportPlanSvg(frame,'side',{title:store.client.title,revision:s.revision,phase:t.phase,selection:s.selection});
   const metrics=s.evaluationStatus==='ready'?s.evaluation.metrics:store.client.metrics(s.parameters,{scenarioId:s.scenarioId});
   const html='<!doctype html><html lang="fr"><meta charset="utf-8"><title>'+escapeXml(store.client.title)+' - Snapshot</title><style>body{max-width:1000px;margin:40px auto;font:15px system-ui;color:#253740}svg{width:100%}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #ccc;text-align:left}small{color:#566} @media print{body{margin:0}}</style><h1>'+escapeXml(store.client.title)+'</h1><p>Revision '+s.revision+' | Phase '+(t.phase*100).toFixed(1)+'% | '+escapeXml(store.client.classification)+'</p>'+svgText+'<table><tr><th>Indicateur</th><th>Valeur</th><th>Note</th></tr>'+metrics.map(m=>'<tr><td>'+escapeXml(m.label)+'</td><td>'+escapeXml(m.value??'Non recalcule')+' '+escapeXml(m.unit)+'</td><td>'+escapeXml(m.note)+'</td></tr>').join('')+'</table><p><strong>Projection de maillage. Pas un plan de fabrication ou une validation scientifique.</strong></p><small>Snapshot autonome. Aucune execution Python, synchronisation, compte cloud ou contenu prive additionnel n\u2019est charge par ce document.</small></html>';
   download(store.client.id+'-snapshot.html',html,'text/html');recordExport('html-report');setMessage('Rapport statique autonome exporte.');}
 return h(Modal,{title:'Exporter la r\u00e9vision '+s.revision,onClose},h('p',null,'Les exports capturent cet \u00e9tat. Ils ne d\u00e9clenchent aucune publication cloud.'),
  h('div',{className:'export-grid'},h(Button,{icon:'save',onClick:()=>{download(store.client.id+'.studio.json',JSON.stringify(store.document(),null,2));recordExport('workspace');setMessage('Espace de travail exporte.');}},'Espace de travail JSON'),
   h(Button,{icon:'code',onClick:appManifest},'Manifeste app JSON'),h(Button,{icon:'folder',onClick:sessionTrace},'Trace de session'),
   h(Button,{icon:'cube',disabled:!sceneApi.current,onClick:()=>{const a=document.createElement('a');a.href=sceneApi.current.capture();a.download=store.client.id+'-3d.png';a.click();setMessage('Capture 3D exportee.');}},'Capture 3D PNG'),
   ...['front','side','top'].map(p=>h(Button,{key:p,icon:'layers',onClick:()=>svg(p)},'SVG '+({front:'face',side:'profil',top:'dessus'})[p])),
   h(Button,{icon:'folder',onClick:report},'Rapport HTML'),h(Button,{icon:'code',onClick:evidence},'Evidence pour adaptateur')),
  h('p',{className:'muted-note'},'Les vues de maillage ne remplacent ni STEP/BRep ni un dossier de fabrication. Le format d\u2019evidence est un contrat Studio, pas un import DiagramCloud d\u00e9j\u00e0 impl\u00e9ment\u00e9.'),message&&h('div',{className:'notice',role:'status'},message));
}
function Explanation({store,playback}){const [step,setStep]=useState(0),steps=store.client.explain||[];const current=steps[step];if(!current)return h('p',null,'Ce client ne fournit pas de sequence explicative.');
 function activate(i){setStep(i);const v=steps[i];playback.set({phase:v.phase,playing:false});store.select(v.entityId||null);}
 return h('div',{className:'explain-grid'},h('div',{className:'explain-scene'},h(SceneViewport,{store,playback}),h(Timeline,{playback})),h('aside',{className:'explain-aside'},h('span',{className:'label-small'},'EXPLICATION \u00b7 PAS D\u2019EX\u00c9CUTION'),h('h2',null,current.title),h('p',null,current.body),h('pre',{className:'code-block'},h('code',null,current.code||'')),
  h('div',{className:'explain-steps'},...steps.map((v,i)=>h('button',{key:i,className:i===step?'active':'',onClick:()=>activate(i),'aria-current':i===step?'step':undefined},h('span',null,String(i+1).padStart(2,'0')),v.title))),
  h('div',{className:'step-actions'},h(Button,{disabled:step===0,onClick:()=>activate(step-1)},'Pr\u00e9c\u00e9dent'),h(Button,{disabled:step===steps.length-1,onClick:()=>activate(step+1),className:'primary'},'Suivant'))));
}
function DataDashboard({store,playback}){
 const s=useWorkspace(store),client=store.client,sourceKind=client.classification==='private'?'private-reference':'synthetic';
 const traces=useMemo(()=>client.traces(s.parameters,{scenarioId:s.scenarioId}),[client,s.parameters,s.scenarioId]);
 const localMetrics=useMemo(()=>client.metrics(s.parameters,{scenarioId:s.scenarioId}),[client,s.parameters,s.scenarioId]);
 const metrics=s.evaluationStatus==='ready'&&s.evaluation?.metrics?s.evaluation.metrics:localMetrics;
 const chart=useMemo(()=>({format:'datapass.studio.chart',version:1,id:'cycle-dashboard',title:'Cycle synchronise',kind:'line',x:{label:'Phase',unit:'%',type:'number'},y:{label:'Valeur',unit:'unites natives',type:'number'},series:traces.slice(0,6).map(series=>({id:series.id,label:series.label+(series.unit?' · '+series.unit:''),points:series.values.map((value,index)=>[series.values.length<=1?0:index/(series.values.length-1)*100,value])})),sourceKind,note:'Series client au meme revision/scene; rendu SVG de reference.'}),[traces,sourceKind]);
 const metricTable=useMemo(()=>({format:'datapass.studio.table',version:1,id:'metric-dashboard',title:s.evaluationStatus==='ready'?'Metriques Python correlees':'Metriques locales',columns:[{id:'metric',label:'Indicateur',type:'string',unit:''},{id:'value',label:'Valeur',type:'number',unit:''},{id:'unit',label:'Unite',type:'string',unit:''},{id:'note',label:'Note',type:'string',unit:''}],rows:metrics.map((m,i)=>({id:'metric-'+i,values:{metric:m.label,value:m.value,unit:m.unit,note:m.note}})),sourceKind,note:s.evaluationStatus==='ready'?'Resultat lie a la revision '+s.revision:'Presentation locale; pas de validation scientifique.'}),[metrics,sourceKind,s.evaluationStatus,s.revision]);
 const parameterTable=useMemo(()=>({format:'datapass.studio.table',version:1,id:'parameter-dashboard',title:'Parametres actifs',columns:[{id:'parameter',label:'Parametre',type:'string',unit:''},{id:'value',label:'Valeur',type:'number',unit:''},{id:'unit',label:'Unite',type:'string',unit:''},{id:'affects',label:'Affecte',type:'string',unit:''}],rows:client.parameters.map((p,i)=>({id:'parameter-'+i,values:{parameter:p.label,value:s.parameters[p.id],unit:p.unit||'',affects:(p.affects||[]).join(', ')}})),sourceKind,note:'Etat courant de la revision '+s.revision}),[client,s.parameters,sourceKind,s.revision]);
 const rich=!!client.flowSpec||!!client.codeSpec;
 const layout=useMemo(()=>{
  if(!client.flowSpec&&!client.codeSpec)return {format:'datapass.studio.layout',version:1,id:'data-dashboard',title:'Dashboard',root:{id:'root',kind:'split',axis:'horizontal',ratio:.62,resizable:true,first:{id:'chart',kind:'slot',slot:'chart',label:'Series'},second:{id:'tables',kind:'tabs',defaultTab:'metrics',tabs:[{id:'metrics',label:'Metriques',child:{id:'metrics-slot',kind:'slot',slot:'metrics'}},{id:'parameters',label:'Parametres',child:{id:'parameters-slot',kind:'slot',slot:'parameters'}}]}}};
  const tabs=[];
  if(client.flowSpec)tabs.push({id:'flow',label:'Flux',child:{id:'flow-slot',kind:'slot',slot:'flow'}});
  if(client.codeSpec)tabs.push({id:'code',label:'Code',child:{id:'code-slot',kind:'slot',slot:'code'}});
  tabs.push({id:'chart',label:'Series',child:{id:'chart-slot',kind:'slot',slot:'chart'}},{id:'metrics',label:'Metriques',child:{id:'metrics-slot',kind:'slot',slot:'metrics'}},{id:'parameters',label:'Parametres',child:{id:'parameters-slot',kind:'slot',slot:'parameters'}});
  return {format:'datapass.studio.layout',version:1,id:'data-workbench',title:'Data workbench',root:{id:'root',kind:'tabs',defaultTab:client.flowSpec?'flow':client.codeSpec?'code':'chart',tabs}};
 },[client]);
 const linkedFlowNode=client.flowSpec?.nodes.find(node=>node.entityIds.includes(s.selection))?.id||null;
 const slots={chart:h(ChartView,{spec:chart,height:330}),metrics:h(DataGrid,{spec:metricTable,maxHeight:470}),parameters:h(DataGrid,{spec:parameterTable,maxHeight:470})};
 if(client.flowSpec)slots.flow=h(FlowView,{spec:client.flowSpec,selectedId:linkedFlowNode,onSelect:id=>{const node=client.flowSpec.nodes.find(item=>item.id===id);if(node?.entityIds[0])store.select(node.entityIds[0]);}});
 if(client.codeSpec)slots.code=h(CodeView,{spec:client.codeSpec,maxHeight:500});
 return h('div',{className:'data-mode'},h('div',{className:'data-mode-head'},h('div',null,h('span',{className:'label-small'},rich?'DONNEES · FLUX · CODE':'ANALYSE · MEME ETAT'),h('h2',null,rich?'Données, flux et résultats':'Données et résultats')),h('p',null,'Les vues consomment le même état et la même révision. Tri, sélection, zoom et lecture du code restent locaux; aucun rerun Python implicite.')),h('div',{className:'data-layout-host '+(rich?'rich':'')},h(LayoutHost,{layout,slots,strictSlots:true})),h(Timeline,{playback}));
}
function Workspace({client,allClients,onClientChange,workspaceStore}){
 const store=workspaceStore,playback=useMemo(()=>new PlaybackStore(),[client]),s=useWorkspace(store);
 const [exportOpen,setExportOpen]=useState(false),[importPreview,setImportPreview]=useState(null),[bottomTab,setBottomTab]=useState('traces'),[apiStatus,setApiStatus]=useState('unknown'),sceneApi=useRef(null),fileInput=useRef(null),request=useRef(new LatestRequest()),cameraSync=useMemo(()=>CameraChannel(),[client]),trace=useMemo(()=>new SessionTrace(),[client]),traceStartedAt=useMemo(()=>Date.now(),[client]);
 usePersistence(store);
 useEffect(()=>{let previous=store.getSnapshot();return store.subscribe(()=>{const next=store.getSnapshot();
   if(next.revision!==previous.revision)trace.record(next.scenarioId!==previous.scenarioId?'scenario':'parameter',next.scenarioId!==previous.scenarioId?'change':'revision',{inputRevision:next.revision,meta:{scenario:next.scenarioId}});
   if(next.selection!==previous.selection)trace.record('selection',next.selection?'select':'clear',{entityId:next.selection,inputRevision:next.revision});
   if(next.hidden!==previous.hidden&&canonical(next.hidden)!==canonical(previous.hidden))trace.record('visibility','change',{inputRevision:next.revision,meta:{hiddenCount:next.hidden.length}});
   if(next.view.mode!==previous.view.mode||next.view.camera!==previous.view.camera)trace.record('view','change',{inputRevision:next.revision,meta:{mode:next.view.mode,camera:next.view.camera}});
   previous=next;});},[store,trace]);
 useEffect(()=>{let previous=playback.getSnapshot();return playback.subscribe(()=>{const next=playback.getSnapshot();
   if(next.playing!==previous.playing)trace.record('playback',next.playing?'play':'pause',{phase:next.phase});
   else if(!next.playing&&Math.abs(next.phase-previous.phase)>.005)trace.record('playback','seek',{phase:next.phase});
   if(next.speed!==previous.speed)trace.record('playback','speed',{phase:next.phase,meta:{speed:next.speed}});
   previous=next;});},[playback,trace]);
 useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)'),pref=()=>playback.set({reducedMotion:q.matches}),visibility=()=>{if(document.hidden)playback.set({playing:false});};pref();q.addEventListener('change',pref);document.addEventListener('visibilitychange',visibility);
   return()=>{q.removeEventListener('change',pref);document.removeEventListener('visibilitychange',visibility);playback.dispose();request.current.cancel();};},[playback]);
 useEffect(()=>playback.set({period:(client.period?.(s.parameters)||2.5)}),[s.parameters,playback]);
 useEffect(()=>{if(globalThis.__STUDIO_BOOT__?.offline){setApiStatus('offline');return;}const abort=new AbortController();fetch('./api/health',{signal:abort.signal}).then(r=>r.ok?r.json():null).then(v=>setApiStatus(v?.status==='ok'?'online':'offline')).catch(()=>setApiStatus('offline'));return()=>abort.abort();},[]);
 useEffect(()=>{const handler=e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?store.redo():store.undo();}
   if(e.key==='Escape')store.select(null);};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[store]);
 async function evaluate(){if(globalThis.__STUDIO_BOOT__?.offline){store.setError('Export autonome: demarrez le serveur local pour utiliser Python.');return;}const req=store.requestEvaluation();trace.record('task','evaluate-start',{inputRevision:req.inputRevision});try{const result=await request.current.run(async signal=>{const r=await fetch('./api/v1/evaluate',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Request':'1'},body:JSON.stringify(req),signal});const data=await r.json().catch(()=>null);if(!r.ok)throw new Error(data?.detail||'Pont Python indisponible.');return data;});if(result.current){const accepted=store.acceptEvaluation(result.value,req);trace.record('task',accepted?'evaluate-ready':'evaluate-stale',{inputRevision:req.inputRevision});}}catch(e){if(e.name!=='AbortError'){store.failEvaluation(e.message);trace.record('task','evaluate-error',{inputRevision:req.inputRevision});}} }
 async function importFile(e){try{const file=e.target.files?.[0];if(!file)return;if(file.size>1024*1024)throw new Error('Document limite a 1 Mio.');const doc=boundedJson(await file.text());validateDocument(client,doc);setImportPreview(doc);}catch(err){store.setError(err.message);}finally{e.target.value='';}}
 const metrics=s.evaluationStatus==='ready'&&s.evaluation?.metrics?s.evaluation.metrics:client.metrics(s.parameters,{scenarioId:s.scenarioId});
 const mode=s.view.mode;
 const topToolbar=h('div',{className:'canvas-toolbar'},h('div',{className:'camera-pills'},...['iso','front','side','top'].map(c=>h('button',{key:c,'aria-pressed':s.view.camera===c,className:s.view.camera===c?'active':'',onClick:()=>store.setView({camera:c})},({iso:'Isom\u00e9trique',front:'Face',side:'Profil',top:'Dessus'})[c]))),
   h('span',{className:'spacer'}),h('label',{className:'check'},h('input',{type:'checkbox',checked:s.view.edges,onChange:e=>store.setView({edges:e.target.checked})}),'Ar\u00eates'),h('label',{className:'check'},h('input',{type:'checkbox',checked:s.view.grid,onChange:e=>store.setView({grid:e.target.checked})}),'Grille'),
   h('label',{className:'yaw'},'Lacet',h('input',{type:'range',min:-180,max:180,value:s.view.yaw,'aria-label':'Lacet de presentation',onChange:e=>store.setView({yaw:Number(e.target.value)})}),h('span',null,s.view.yaw+'\u00b0')),
   h('label',{className:'explode'},'\u00c9clat\u00e9',h('input',{type:'range',min:0,max:1,step:.01,value:s.view.explode,'aria-label':'Vue eclatee',onChange:e=>store.setView({explode:Number(e.target.value)})})));
 return h('div',{className:'app'},h('a',{href:'#workspace',className:'skip-link'},'Aller au laboratoire'),
  h('header',{className:'app-header'},h('div',{className:'brand'},h('img',{src:'./public/studio.svg',width:32,height:32,alt:''}),h('div',null,h('strong',null,'datapass',h('span',null,' studio')),h('small',null,'INTERACTIVE APP FRAMEWORK'))),
   h('div',{className:'header-divider'}),h('label',{className:'client-switch'},h('span',{className:'sr-only'},'Client actif'),h('select',{value:client.id,onChange:e=>onClientChange(e.target.value),'aria-label':'Client actif'},...allClients.map(c=>h('option',{key:c.id,value:c.id},c.title+(c.classification==='private'?' \u00b7 priv\u00e9':''))))),
   h('span',{className:'header-caption'},client.description),h('span',{className:'spacer'}),h('span',{className:'saved '+(s.saveStatus==='error'?'warning':'')},h('i',{className:'status-dot '+s.saveStatus}),SAVE[s.saveStatus]),h(Badge,{tone:'quiet'},'v0.1')),
  h('div',{className:'app-body'},h('nav',{className:'rail','aria-label':'Modes du laboratoire'},...Object.keys(MODE_LABELS).map((m,i)=>h('button',{key:m,className:mode===m?'active':'',onClick:()=>store.setView({mode:m}),'aria-label':MODE_LABELS[m],title:MODE_LABELS[m]},h(Icon,{name:MODE_ICONS[m],size:21}))),h('span',{className:'spacer'}),h('div',{className:'rail-mark'},'DP')),
  h('main',{id:'workspace',tabIndex:-1,className:'workspace'},
   h('div',{className:'project-bar'},h('div',null,h('div',{className:'breadcrumb'},'Clients / '+client.title+' / '+MODE_LABELS[mode]),h('div',{className:'project-title'},h('h1',null,client.title),h(Badge,{tone:client.classification==='private'?'private':'synthetic'},client.classification==='private'?'R\u00c9F\u00c9RENCE PRIV\u00c9E':'SYNTH\u00c9TIQUE'))),
    h('div',{className:'project-actions'},h('label',{className:'scenario-label'},h('span',null,'Configuration'),h('select',{'aria-label':'Configuration',value:s.scenarioId,onChange:e=>store.setScenario(e.target.value)},...(client.scenarios||[]).map(v=>h('option',{key:v.id,value:v.id},v.label)))),
     h('div',{className:'undo-group'},h(IconButton,{icon:'undo',label:'Annuler',disabled:!s.history.undo,onClick:()=>store.undo()}),h(IconButton,{icon:'redo',label:'Retablir',disabled:!s.history.redo,onClick:()=>store.redo()})),
     h(Button,{icon:'upload',onClick:()=>fileInput.current.click()},'Importer'),h(Button,{icon:'download',className:'primary',onClick:()=>setExportOpen(true)},'Exporter'))),
   h(MetricStrip,{metrics:metrics.slice(0,4),status:client.classification}),
   h('div',{className:'mode-bar'},h('div',{className:'mode-tabs'},...Object.entries(MODE_LABELS).map(([m,label])=>h('button',{key:m,className:mode===m?'active':'','aria-pressed':mode===m,onClick:()=>store.setView({mode:m})},label))),
     h('div',{className:'runtime-pill'},h('i',{className:'status-dot '+apiStatus}),'Python '+(apiStatus==='online'?'connect\u00e9':'optionnel'))),
   s.error&&h('div',{className:'error-banner',role:'alert'},h(Icon,{name:'info',size:17}),h('span',null,s.error),h(IconButton,{icon:'close',label:'Fermer le message',onClick:()=>store.setError(null)})),
   mode==='lab'?h('div',{className:'lab-layout'},h(Assembly,{store}),h('div',{className:'lab-center'},topToolbar,h(PanelBoundary,{key:client.id+'3d'},h(SceneViewport,{store,playback,sceneApi})),h(SelectionBar,{store}),h(Timeline,{playback}),h('div',{className:'bottom-panel'},h('div',{className:'bottom-tabs'},h('button',{className:bottomTab==='traces'?'active':'',onClick:()=>setBottomTab('traces')},'Cin\u00e9matique'),h('button',{className:bottomTab==='parts'?'active':'',onClick:()=>setBottomTab('parts')},'Nomenclature'),h('span',{className:'spacer'}),h('span',{className:'label-small'},'VUES LI\u00c9ES')),
    bottomTab==='traces'?h(TraceChart,{store,playback}):h(PartsTable,{store,playback}))),h(Inspector,{store})):
   mode==='plans'?h('div',{className:'plans-layout'},h(Assembly,{store}),h('div',{className:'plans-center'},h('div',{className:'plan-notice'},h(Icon,{name:'info',size:16}),'Projections synchronis\u00e9es du maillage \u00b7 pas des plans de fabrication'),h('div',{className:'plans-grid'},...['front','side','top'].map(plane=>h(Panel,{key:plane,title:({front:'Face',side:'Profil',top:'Dessus'})[plane],subtitle:'M\u00eame g\u00e9om\u00e9trie, m\u00eame phase'},h(PlanView,{store,playback,plane}))),h(Panel,{title:'Cycle',subtitle:'Cliquer dans le graphique pour choisir un instant'},h(TraceChart,{store,playback}))),h(Timeline,{playback}),h(SelectionBar,{store})),h(Inspector,{store})):
   mode==='compare'?h('div',{className:'compare-layout'},h('div',{className:'compare-heading'},h('h2',null,'R\u00e9f\u00e9rence / r\u00e9vision active'),h('p',null,'Deux vues, une phase. Orbites li\u00e9es; les valeurs de r\u00e9f\u00e9rence ne sont pas modifi\u00e9es.')),
     h('div',{className:'compare-canvases'},h(SceneViewport,{store,playback,baseline:true,cameraSync,testId:'baseline-canvas'}),h(SceneViewport,{store,playback,cameraSync,sceneApi,testId:'candidate-canvas'})),h(Timeline,{playback}),
     h(ComparisonTraceChart,{store,playback}),
     h('div',{className:'diff-grid'},...client.parameters.filter(f=>s.parameters[f.id]!==store.baseline[f.id]).map(f=>h('div',{className:'diff-card',key:f.id},h('span',null,f.label),h('strong',null,store.baseline[f.id]+' \u2192 '+s.parameters[f.id]+' '+f.unit)))),h('p',{className:'muted-note'},client.parameters.some(f=>s.parameters[f.id]!==store.baseline[f.id])?'Les indicateurs distants doivent etre recalcules apres modification.':'Aucune difference de parametres avec la reference.')):
   mode==='references'?h(ArtifactWorkspace,{store,playback}):
   mode==='data'?h(DataDashboard,{store,playback}):
   h(Explanation,{store,playback}),
   h('footer',{className:'workspace-footer'},h('div',null,h('i',{className:'status-dot '+s.evaluationStatus}),h('span',null,STATUS[s.evaluationStatus])),h('span',{className:'footer-warning'},'Visualisation \u2260 validation scientifique'),h(Button,{icon:'play',disabled:s.evaluationStatus==='running',onClick:evaluate,className:'compact'},'Calculer avec Python')),
   h('input',{type:'file',ref:fileInput,accept:'.json,application/json',style:{display:'none'},onChange:importFile,'aria-label':'Importer un espace de travail JSON'}),
   exportOpen&&h(ExportDialog,{store,playback,sceneApi,trace,traceStartedAt,onClose:()=>setExportOpen(false)}),
   importPreview&&h(Modal,{title:'V\u00e9rifier l\u2019import',onClose:()=>setImportPreview(null)},h('p',null,'Le document est compatible. Appliquer remplacera les parametres et la vue de cette session; la reference demeure intacte.'),
    h('div',{className:'import-diff'},...client.parameters.filter(f=>importPreview.parameters[f.id]!==s.parameters[f.id]).map(f=>h('div',{key:f.id},h('span',null,f.label),h('code',null,s.parameters[f.id]+' \u2192 '+importPreview.parameters[f.id])))),
    h(Button,{className:'primary',onClick:()=>{const reviewed=importPreview,inputRevision=s.revision;setImportPreview(null);setTimeout(()=>{try{store.importDocument(reviewed);trace.record('import','reviewed-apply',{inputRevision});}catch(error){store.setError('Import valide mais non applicable: '+String(error?.message||error));}},0);}},'Appliquer le document')))));
}
export function App({clients,initialClient,offline=false}){const [clientId,setClientId]=useState(initialClient||clients[0].id),client=clients.find(c=>c.id===clientId)||clients[0],stores=useRef(new Map());
 if(!stores.current.has(client.id))stores.current.set(client.id,new WorkspaceStore(client));
 useEffect(()=>{const guard=e=>{if([...stores.current.values()].some(s=>s.state.dirty)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
 return h(PanelBoundary,{key:client.id},h(Workspace,{key:client.id,client,workspaceStore:stores.current.get(client.id),allClients:clients,onClientChange:id=>{setClientId(id);if(offline)return;const u=new URL(location.href);u.searchParams.set('client',id);history.replaceState(null,'',u);}}));}