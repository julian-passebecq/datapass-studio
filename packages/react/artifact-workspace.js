import React,{useEffect,useMemo,useState} from 'react';
import {artifactCatalog,artifactForSelection,documentForArtifact,safeDocumentTarget,artifactProvenance} from '../runtime/artifacts.js';
import {h,useWorkspace,usePlayback,Icon,Badge,Button,Panel,PlanView} from './components.js';

const sourceLabel={synthetic:'SYNTHETIQUE','private-reference':'REFERENCE PRIVEE','user-reference':'SOURCE UTILISATEUR',derived:'DERIVE'};
const kindLabel={figure:'Figure','document-region':'Region',image:'Image',code:'Code',table:'Table'};

function DocumentSurface({document,artifact}){
 const target=safeDocumentTarget(document,artifact?.page);
 const source=artifactProvenance(artifact,document);
 if(target&&document?.mime?.startsWith('image/'))return h('div',{className:'document-surface'},
   h('img',{className:'document-image',src:target,alt:artifact?.title||document.title,loading:'lazy',referrerPolicy:'no-referrer'}),
   h('div',{className:'document-caption'},h(Badge,{tone:source},sourceLabel[source]||source),document.sourceLabel||document.title));
 if(target&&document?.mime==='application/pdf')return h('div',{className:'document-surface'},
   h('object',{className:'document-frame',data:target,type:'application/pdf','aria-label':document.title},
     h('div',{className:'document-fallback'},h(Icon,{name:'folder',size:34}),h('strong',null,'Apercu PDF indisponible dans ce navigateur.'),h('p',null,'Le document reste une ressource locale du client.'))));
 return h('div',{className:'document-surface mock-document','data-testid':'artifact-document'},
   h('article',{className:'document-paper'},h('header',null,h('span',null,document?.title||'Document non fourni'),h('span',{className:'mono'},artifact?.page?'PAGE '+artifact.page:'SOURCE')),
     h('div',{className:'paper-rule'}),
     h('h2',null,artifact?.title||'Aucun repere selectionne'),
     h('p',null,artifact?.summary||'Le client peut lier ici un PDF, une image, une table, du code ou une autre source inertement referencee.'),
     h('div',{className:'paper-diagram'},h('span',{className:'paper-axis horizontal'}),h('span',{className:'paper-axis vertical'}),h('div',{className:'paper-object'},h(Icon,{name:artifact?.kind==='code'?'code':'cube',size:38}))),
     artifact?.region&&h('div',{className:'document-region',style:{left:(artifact.region[0]*100)+'%',top:(artifact.region[1]*100)+'%',width:(artifact.region[2]*100)+'%',height:(artifact.region[3]*100)+'%'},title:'Region liee: '+artifact.title}),
     h('footer',null,h(Badge,{tone:source},sourceLabel[source]||source),h('span',null,document?.sourceLabel||'Aucun fichier binaire n\'est embarque dans cet exemple.'))));
}

export function ArtifactWorkspace({store,playback}){
 const s=useWorkspace(store),t=usePlayback(playback,12),catalog=useMemo(()=>artifactCatalog(store.client),[store.client]);
 const [activeId,setActiveId]=useState(()=>artifactForSelection(catalog,s.selection));
 useEffect(()=>{const next=artifactForSelection(catalog,s.selection,activeId);if(next!==activeId)setActiveId(next);},[catalog,s.selection,activeId]);
 const active=catalog.artifacts.find(a=>a.id===activeId)||catalog.artifacts[0]||null,document=documentForArtifact(catalog,active);
 function activate(a){setActiveId(a.id);if(a.entityIds[0])store.select(a.entityIds[0]);if(Number.isFinite(a.phase))playback.set({phase:a.phase,playing:false});}
 if(!active)return h('div',{className:'reference-empty'},h(Icon,{name:'folder',size:40}),h('h2',null,'Aucun artifact lie'),h('p',null,'Ce client n\'a pas encore declare de documents, figures ou extraits de code.'));
 return h('div',{className:'reference-layout'},
   h('aside',{className:'artifact-list'},h('header',null,h('div',null,h('span',{className:'label-small'},'ARTIFACTS LIES'),h('h2',null,'Figures & reperes')),h(Badge,null,String(catalog.artifacts.length))),
     h('p',{className:'artifact-help'},'Une selection 3D/2D peut choisir automatiquement son repere documentaire. Cliquer un repere resynchronise la piece et, si defini, la phase.'),
     h('div',{className:'artifact-scroll'},...catalog.artifacts.map(a=>h('button',{key:a.id,className:'artifact-card '+(a.id===active.id?'active':''),'data-artifact-id':a.id,'aria-pressed':a.id===active.id,onClick:()=>activate(a)},
       h('div',{className:'artifact-card-top'},h('span',{className:'artifact-kind'},kindLabel[a.kind]||a.kind),a.page&&h('span',{className:'mono'},'p.'+a.page)),
       h('strong',null,a.title),h('small',null,a.summary||'Repere lie'),h('div',{className:'artifact-entities'},...a.entityIds.slice(0,3).map(id=>h('code',{key:id},id)),a.entityIds.length>3&&h('span',null,'+'+(a.entityIds.length-3))))))),
   h('section',{className:'document-workspace'},h('header',{className:'document-toolbar'},h('div',null,h('span',{className:'label-small'},'DOCUMENT'),h('strong',null,document?.title||'Source structuree')),h('div',{className:'document-meta'},active.page&&h(Badge,null,'Page '+active.page),h(Badge,{tone:artifactProvenance(active,document)},sourceLabel[artifactProvenance(active,document)]||artifactProvenance(active,document)))),
     h(DocumentSurface,{document,artifact:active})),
   h('aside',{className:'artifact-inspector'},h('span',{className:'label-small'},'LIAISON SEMANTIQUE'),h('h2',null,active.title),h('p',null,active.summary||'Aucun resume.'),
     h('dl',null,h('dt',null,'Artifact'),h('dd',{className:'mono'},active.id),h('dt',null,'Document'),h('dd',null,document?.title||'Non fourni'),h('dt',null,'Type'),h('dd',null,kindLabel[active.kind]||active.kind),h('dt',null,'Phase partagee'),h('dd',null,Number.isFinite(active.phase)?Math.round(active.phase*100)+'%':'Phase courante '+Math.round(t.phase*100)+'%'),h('dt',null,'Entites liees'),h('dd',null,...active.entityIds.map(id=>h('button',{key:id,className:'entity-link','aria-pressed':s.selection===id,onClick:()=>store.select(id)},id)))),
     active.preview&&h(Panel,{title:'Apercu lie',subtitle:'Meme modele, identifiants stables',className:'artifact-preview'},h(PlanView,{store,playback,plane:active.preview.plane,small:true})),
     h('div',{className:'artifact-actions'},h(Button,{icon:'cube',onClick:()=>store.setView({mode:'lab'})},'Ouvrir en 3D'),h(Button,{icon:'layers',onClick:()=>store.setView({mode:'plans'})},'Ouvrir les plans')),
     h('p',{className:'muted-note'},'Le lien artifact -> entite est une association de presentation. Il ne transforme pas une capture, un PDF ou une figure en preuve de validation scientifique.')));
}
