import React,{useState,useEffect,useRef,useMemo,useSyncExternalStore} from 'react';
import {createStudioRenderers} from '../renderers/index.js';
import {validateFrame} from '../runtime/validation.js';
const defaultRenderers=createStudioRenderers();
import {projection,cycleEnvelope} from '../scene/projection.js';
import {chartGeometry,valueAt} from '../renderers/svg-chart.js';
export const h=React.createElement;
export const useWorkspace=store=>useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
export function usePlayback(playback,fps=24){const [state,setState]=useState(playback.getSnapshot());useEffect(()=>{let previous=0;const cb=()=>{const next=playback.getSnapshot(),now=performance.now();if(!next.playing||now-previous>1000/fps){previous=now;setState(next);}};cb();return playback.subscribe(cb);},[playback,fps]);return state;}
const paths={cube:'M12 3 3 8v9l9 5 9-5V8l-9-5Zm-9 5 9 5 9-5M12 13v9M7.5 5.5l9 5',layers:'m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5',sliders:'M5 3v5m0 4v9M12 3v10m0 4v4M19 3v2m0 4v12M2 8h6v4H2zM9 13h6v4H9zM16 5h6v4h-6z',chart:'M4 3v17h17M7 14l4-5 4 3 5-7',play:'m8 4 12 8-12 8V4Z',pause:'M8 4v16M16 4v16',refresh:'M20 7v5h-5M4 17v-5h5M18 6a8 8 0 0 0-13 3m1 9a8 8 0 0 0 13-3',undo:'M9 4 3 10l6 6M3 10h10a7 7 0 0 1 7 7v3',redo:'m15 4 6 6-6 6m6-6h-10a7 7 0 0 0-7 7v3',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',eye:'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm7 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0',close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L20 5',chevron:'m9 5 7 7-7 7',code:'m8 5-6 7 6 7m8-14 6 7-6 7m-3-16-2 18',compare:'M3 4h7v16H3zM14 4h7v16h-7z',info:'M12 17v-6m0-4v1m9 4a9 9 0 1 1-18 0 9 9 0 0 1 18 0',save:'M4 3h13l4 4v14H3V3h1Zm3 0v6h9V3M7 21v-8h10v8',sun:'M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2m-3 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0',fit:'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6M8 8h8v8H8z',folder:'M3 5h7l2 3h9v12H3V5Z',table:'M3 4h18v16H3zM3 9h18M3 14h18M9 4v16',clock:'M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0'};
export function Icon({name,size=18}){return h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.65,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[name]||paths.cube}));}
export function Button({icon,children,className='',...props}){return h('button',{type:'button',...props,className:'button '+className},icon&&h(Icon,{name:icon,size:16}),children);}
export function IconButton({icon,label,...props}){return h('button',{...props,type:'button',className:'icon-button '+(props.className||''),'aria-label':label,title:label},h(Icon,{name:icon}));}
export function Badge({children,tone=''}){return h('span',{className:'badge '+tone},children);}
export function Panel({title,subtitle,actions,children,className=''}){return h('section',{className:'panel '+className},title&&h('header',{className:'panel-header'},h('div',null,h('h2',null,title),subtitle&&h('span',{className:'panel-subtitle'},subtitle)),actions),children);}
export class PanelBoundary extends React.Component {
 constructor(props){super(props);this.state={error:null};}
 static getDerivedStateFromError(error){return {error:String(error.message||error)};}
 render(){return this.state.error?h('div',{className:'panel-error',role:'alert'},h(Icon,{name:'info'}),h('strong',null,'Cette vue est indisponible.'),h('p',null,this.state.error),h(Button,{onClick:()=>this.setState({error:null})},'R\u00e9essayer')):this.props.children;}
}
export function Modal({title,children,onClose}){const ref=useRef(null);useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);return h('dialog',{ref,className:'modal',onCancel:e=>{e.preventDefault();onClose();}},h('header',null,h('h2',null,title),h(IconButton,{icon:'close',label:'Fermer',onClick:onClose})),h('div',{className:'modal-body'},children));}
export function MetricStrip({metrics,status='local'}){return h('div',{className:'metric-strip'},...metrics.map(m=>h('div',{key:m.id,className:'metric'},h('div',{className:'metric-label'},m.label),h('div',{className:'metric-value'},m.value===null?'\u2014':Number(m.value).toLocaleString('fr-FR',{maximumFractionDigits:2}),h('span',null,m.unit)),h('div',{className:'metric-note'},m.note))),h('div',{className:'metric provenance-metric'},h('div',{className:'metric-label'},'Provenance'),h('div',{className:'provenance-value'},h('i',{className:'status-dot'}),status==='private'?'R\u00e9f\u00e9rence priv\u00e9e':'D\u00e9monstration'),h('div',{className:'metric-note'},'Aucune validation physique implicite')));}
export function SceneViewport({store,playback,baseline=false,sceneApi=null,cameraSync=null,testId='scene-canvas',renderers=defaultRenderers}){
 const canvas=useRef(null),host=useRef(null),[error,setError]=useState(null),[retry,setRetry]=useState(0),api=useRef(null),[engine,setEngine]=useState('WebGL'),[source,setSource]=useState(''),id=useRef(Symbol('scene'));
 useEffect(()=>{
  let live=true,lastScenario=null,offStore=()=>{},offPlay=()=>{},offCamera=()=>{};
  const start=async()=>{
   try{
    const mode=new URL(location.href).searchParams.get('renderer');if(mode==='svg')throw new Error('Mode de repli SVG demand\u00e9.');
    const mount=mode==='three'?(await import('../../integrations/three-adapter.js')).mountThree:renderers.get('studio.webgl').mount;
    const callbacks={onSelect:x=>store.select(x),onError:e=>live&&setError(e.message),onCamera:cam=>cameraSync?.publish(cam,id.current)};
    let renderer;try{renderer=mode==='canvas'?renderers.get('studio.canvas3d').mount(canvas.current,callbacks):await mount(canvas.current,callbacks);}catch(problem){if(mode==='three')throw problem;renderer=renderers.get('studio.canvas3d').mount(canvas.current,callbacks);}

    if(!live){renderer.destroy();return;}api.current=renderer;if(sceneApi)sceneApi.current=renderer;setEngine(renderer.diagnostics?.().renderer==='canvas3d-cpu'?'Canvas 3D (CPU)':mode==='three'?'Three.js':'WebGL');
    const refresh=()=>{try{const s=store.getSnapshot(),t=playback.getSnapshot(),params=baseline?store.baseline:s.parameters,frame=store.client.frame(params,t.phase,{...s.view,scenarioId:s.scenarioId});
       validateFrame(frame);setSource(frame.source);renderer.update(frame,{...s.view,selection:s.selection,hidden:s.hidden});if(lastScenario!==s.scenarioId){lastScenario=s.scenarioId;renderer.fit?.();}const d=renderer.diagnostics?.();if(d&&canvas.current){canvas.current.dataset.renderer=d.renderer;canvas.current.dataset.triangles=String(d.triangles||0);}
      }catch(e){setError(e.message);}};
    refresh();offStore=store.subscribe(refresh);offPlay=playback.subscribe(refresh);
    if(cameraSync)offCamera=cameraSync.subscribe((cam,source)=>{if(source!==id.current)renderer.setCamera?.(cam);});
    if((globalThis.__STUDIO_QA__||new URL(location.href).searchParams.has('qa'))){canvas.current.__sceneApi=renderer;}
   }catch(e){if(live)setError(e.message);}
  };start();return()=>{live=false;offStore();offPlay();offCamera();api.current?.destroy();if(sceneApi)sceneApi.current=null;};
 },[store,playback,baseline,cameraSync,renderers,retry]);
 return h('div',{className:'viewport',ref:host},error?h('div',{className:'svg-fallback'},h(PlanView,{store,playback,plane:'side',baseline}),h('div',{className:'fallback-notice',role:'status'},h('span',null,error),h(Button,{className:'compact',onClick:()=>{setError(null);setRetry(v=>v+1);}},'Reessayer le moteur 3D'))):h('canvas',{ref:canvas,'data-testid':testId,tabIndex:0,'aria-label':'Vue 3D interactive. Glisser pour tourner, molette pour zoomer, touches fleche pour orienter, Origine pour recadrer.'}),
  h('div',{className:'viewport-top'},h(Badge,null,baseline?'R\u00e9f\u00e9rence':'R\u00e9vision active'),h('span',{className:'engine-tag',title:source},error?'Projection SVG':engine+' \u00b7 local'),source&&h('span',{className:'mesh-source',title:source},source.includes('NOT_BREP')?'Apercu parametrique - pas BRep':source.includes('BREP')?'Maillage de reference BRep':'Geometrie synthetique')),
  h('div',{className:'viewport-bottom'},h('span',null,error?'Repli accessible':'Glisser : orbite \u00b7 Maj + glisser : d\u00e9placer \u00b7 Molette : zoom'),!error&&h(IconButton,{icon:'fit',label:'Recadrer la vue',onClick:()=>api.current?.fit()})));
}
export function PlanView({store,playback,plane='front',baseline=false,small=false}){
 const s=useWorkspace(store),t=usePlayback(playback,12),params=baseline?store.baseline:s.parameters;
 const envelope=useMemo(()=>cycleEnvelope(store.client,params,{yaw:s.view.yaw,explode:s.view.explode,scenarioId:s.scenarioId}),[store.client,params,s.view.yaw,s.view.explode,s.scenarioId]);
 const frame=store.client.frame(params,t.phase,{...s.view,scenarioId:s.scenarioId}),p=projection(frame.parts.filter(x=>!s.hidden.includes(x.id)),plane,720,small?260:420,envelope);
 return h('svg',{className:'plan-svg',viewBox:`0 0 720 ${small?260:420}`,role:'group','aria-label':'Projection '+plane,'data-testid':'plan-'+plane},h('title',null,'Projection des m\u00eames maillages. Pas un plan de fabrication.'),
  h('defs',null,h('pattern',{id:'grid-'+plane+(baseline?'base':''),width:24,height:24,patternUnits:'userSpaceOnUse'},h('path',{d:'M24 0H0V24',fill:'none',stroke:'var(--grid)',strokeWidth:.4}))),
  h('rect',{width:'100%',height:'100%',fill:`url(#grid-${plane}${baseline?'base':''})`}),
  h('line',{x1:360,x2:360,y1:16,y2:p.height-16,className:'centerline'}),h('line',{x1:16,x2:704,y1:p.height/2,y2:p.height/2,className:'centerline'}),
  ...p.parts.map(part=>h('g',{key:part.id,'data-part-id':part.id,role:'button',tabIndex:0,'aria-label':part.label,onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();store.select(part.id);}},onClick:()=>store.select(part.id),className:'plan-part '+(s.selection===part.id?'selected':'')},
    h('title',null,part.label),h('path',{d:part.path,className:'plan-hit',fill:'none'}),h('path',{d:part.path,fill:'none',className:'plan-edge'}))),
  h('g',{className:'dimension'},h('path',{d:`M70 ${p.height-28}H650M70 ${p.height-33}V${p.height-23}M650 ${p.height-33}V${p.height-23}`,fill:'none'}),h('rect',{x:315,y:p.height-39,width:90,height:20,fill:'var(--surface)'}),h('text',{x:360,y:p.height-24,textAnchor:'middle'},p.span.toFixed(2)+' m')),
  h('text',{x:16,y:25,className:'plan-label'},({front:'FACE / YZ',side:'PROFIL / XZ',top:'DESSUS / XY'})[plane]),h('text',{x:704,y:25,textAnchor:'end',className:'plan-label'},'PHASE '+(t.phase*100).toFixed(0)+'%'));
}
export function TraceChart({store,playback}){
 const s=useWorkspace(store),t=usePlayback(playback,24),series=useMemo(()=>store.client.traces(s.parameters,{scenarioId:s.scenarioId}),[store.client,s.parameters,s.scenarioId]);
 const plot=useMemo(()=>chartGeometry(series),[series]),x=plot.x(t.phase);
 function seek(e){const r=e.currentTarget.getBoundingClientRect();playback.set({phase:Math.max(0,Math.min(1,((e.clientX-r.left)/r.width*600-36)/(600-52))),playing:false});}
 return h('div',{className:'trace'},h('div',{className:'trace-heading'},h('strong',null,'Cycle synchronis\u00e9'),h('div',{className:'trace-legend'},...series.map((v,i)=>h('span',{key:v.id,className:'series-'+i},h('i'),v.label+' '+valueAt(v,t.phase).toFixed(2)+' '+v.unit)))),
  h('svg',{viewBox:'0 0 600 150',className:'trace-svg','aria-label':'Courbes de mouvement, cliquer pour choisir une phase',role:'img',onPointerDown:seek},h('title',null,'Echantillons de la cinematique de presentation; non mesures'),
   ...[0,.5,1].map(v=>h('g',{key:v},h('line',{x1:36,x2:584,y1:plot.y(plot.min+v*(plot.max-plot.min)),y2:plot.y(plot.min+v*(plot.max-plot.min)),className:'chart-grid'}),h('text',{x:28,y:plot.y(plot.min+v*(plot.max-plot.min))+4,textAnchor:'end'},(plot.min+v*(plot.max-plot.min)).toFixed(1)))),
   ...plot.series.map((v,i)=>h('path',{key:v.id,d:v.path,className:'chart-line series-'+i,fill:'none'})),h('line',{x1:x,x2:x,y1:8,y2:126,className:'playhead'}),
   ...series.map((v,i)=>h('circle',{key:v.id,cx:x,cy:plot.y(valueAt(v,t.phase)),r:4,className:'chart-dot series-'+i})),
   ...[0,.25,.5,.75,1].map(v=>h('text',{key:v,x:plot.x(v),y:146,textAnchor:'middle'},(v*100)+'%'))));
}
export function ComparisonTraceChart({store,playback}){
 const s=useWorkspace(store),t=usePlayback(playback,18);
 const baseline=useMemo(()=>store.client.traces(store.baseline,{scenarioId:s.scenarioId}).slice(0,2),[store.client,store.baseline,s.scenarioId]);
 const candidate=useMemo(()=>store.client.traces(s.parameters,{scenarioId:s.scenarioId}).slice(0,2),[store.client,s.parameters,s.scenarioId]);
 const series=useMemo(()=>baseline.flatMap((b,i)=>{const current=candidate.find(x=>x.id===b.id)||candidate[i];return [{...b,id:'baseline-'+b.id,label:'Reference · '+b.label},...(current?[{...current,id:'candidate-'+current.id,label:'Active · '+current.label}]:[])];}),[baseline,candidate]);
 if(!series.length)return h('p',{className:'muted-note'},'Aucune serie comparable pour ce client.');
 const plot=chartGeometry(series,600,180),x=plot.x(t.phase);
 return h('div',{className:'comparison-trace'},h('div',{className:'comparison-trace-head'},h('div',null,h('span',{className:'label-small'},'COMPARAISON CINEMATIQUE'),h('strong',null,'Reference / revision active')),h('span',{className:'muted-note'},'Courbes de presentation · pas un resultat scientifique')),
   h('div',{className:'trace-legend'},...series.map((v,i)=>h('span',{key:v.id,className:'series-'+i},h('i'),v.label))),
   h('svg',{viewBox:'0 0 600 180',className:'trace-svg comparison-svg',role:'img','aria-label':'Comparaison des courbes de reference et de revision active'},h('title',null,'Comparaison des cinematiques prescrites a la meme phase'),
    ...[0,.5,1].map(v=>h('line',{key:v,x1:36,x2:584,y1:plot.y(plot.min+v*(plot.max-plot.min)),y2:plot.y(plot.min+v*(plot.max-plot.min)),className:'chart-grid'})),
    ...plot.series.map((v,i)=>h('path',{key:v.id,d:v.path,className:'chart-line comparison-line series-'+i,fill:'none'})),h('line',{x1:x,x2:x,y1:8,y2:156,className:'playhead'}),
    ...[0,.25,.5,.75,1].map(v=>h('text',{key:v,x:plot.x(v),y:176,textAnchor:'middle'},Math.round(v*100)+'%'))));
}
export function Timeline({playback}){const t=usePlayback(playback,24);return h('div',{className:'timeline'},
 h(IconButton,{icon:t.playing?'pause':'play',label:t.playing?'Pause':'Lire le cycle',disabled:t.reducedMotion,onClick:()=>playback.set({playing:!t.playing})}),
 h('span',{className:'timeline-time'},(t.phase*t.period).toFixed(2)+' s'),
 h('input',{type:'range',min:0,max:1,step:.001,value:t.phase,'aria-label':'Phase du cycle','aria-valuetext':(t.phase*100).toFixed(0)+' pour cent',onChange:e=>playback.set({phase:Number(e.target.value),playing:false})}),
 h('span',{className:'mono'},(t.phase*100).toFixed(0)+'%'),h('label',{className:'speed-label'},'Vitesse',h('select',{'aria-label':'Vitesse de lecture',value:t.speed,onChange:e=>playback.set({speed:Number(e.target.value)})},...[.25,.5,1,2].map(v=>h('option',{key:v,value:v},v+'\u00d7')))),
 t.reducedMotion&&h('span',{className:'reduced-note'},'Mouvement r\u00e9duit'));
}
export function download(name,data,type='application/json'){
 const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}