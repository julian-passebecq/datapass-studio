const KINDS=new Set(['figure','document-region','image','code','table']);
const MIMES=new Set(['application/pdf','image/png','image/jpeg','image/webp','text/plain','text/markdown']);
const SOURCES=new Set(['synthetic','private-reference','user-reference','derived']);
const ID=/^[a-z][a-z0-9_.-]{1,79}$/;
const text=(value,name,max=2000)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(name+' invalide.');return value;};
function safeLocalUrl(value){
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='string'||value.length>2048)throw new Error('URL de document invalide.');
 let u;try{u=new URL(value,'https://studio.invalid/');}catch{throw new Error('URL de document invalide.');}
 if(u.origin!=='https://studio.invalid'||u.username||u.password||!['https:'].includes(u.protocol))throw new Error('Les documents integres doivent etre des ressources du meme site.');
 if(/(?:^|\/)\.\.(?:\/|$)/.test(value.replaceAll('\\\\','/')))throw new Error('Chemin parent interdit pour un document.');
 return value;
}
export function validateArtifactCatalog(catalog,knownEntityIds=null){
 if(catalog===undefined||catalog===null)return {documents:[],artifacts:[]};
 if(!catalog||typeof catalog!=='object'||Array.isArray(catalog))throw new Error('Catalogue d\'artifacts invalide.');
 if(Object.keys(catalog).some(k=>!['documents','artifacts'].includes(k)))throw new Error('Champ de catalogue inconnu.');
 const documents=Array.isArray(catalog.documents)?catalog.documents:[],artifacts=Array.isArray(catalog.artifacts)?catalog.artifacts:[];
 if(documents.length>100||artifacts.length>500)throw new Error('Catalogue d\'artifacts trop volumineux.');
 const docIds=new Set();
 for(const d of documents){
  if(!d||typeof d!=='object'||Array.isArray(d)||!ID.test(d.id)||docIds.has(d.id))throw new Error('Identifiant de document invalide ou duplique.');
  docIds.add(d.id);text(d.title,'Titre de document',300);
  if(!MIMES.has(d.mime))throw new Error('Type de document non pris en charge.');
  if(!SOURCES.has(d.sourceKind))throw new Error('Provenance de document invalide.');
  if(d.pages!==undefined&&(!Number.isSafeInteger(d.pages)||d.pages<1||d.pages>10000))throw new Error('Nombre de pages invalide.');
  if(d.sourceLabel!==undefined&&(typeof d.sourceLabel!=='string'||d.sourceLabel.length>1000))throw new Error('Source de document invalide.');
  safeLocalUrl(d.url);
 }
 const artifactIds=new Set();
 for(const a of artifacts){
  if(!a||typeof a!=='object'||Array.isArray(a)||!ID.test(a.id)||artifactIds.has(a.id))throw new Error('Identifiant d\'artifact invalide ou duplique.');
  artifactIds.add(a.id);text(a.title,'Titre d\'artifact',300);
  if(!KINDS.has(a.kind))throw new Error('Type d\'artifact invalide.');
  if(a.documentId!==undefined&&!docIds.has(a.documentId))throw new Error('Document lie inconnu: '+a.documentId);
  if(!Array.isArray(a.entityIds)||a.entityIds.length>50||new Set(a.entityIds).size!==a.entityIds.length||a.entityIds.some(id=>typeof id!=='string'||!id))throw new Error('Entites liees invalides.');
  if(knownEntityIds&&a.entityIds.some(id=>!knownEntityIds.has(id)))throw new Error('Entite liee inconnue: '+a.entityIds.find(id=>!knownEntityIds.has(id)));
  if(a.page!==undefined&&(!Number.isSafeInteger(a.page)||a.page<1||a.page>10000))throw new Error('Page d\'artifact invalide.');
  if(a.summary!==undefined&&(typeof a.summary!=='string'||a.summary.length>4000))throw new Error('Resume d\'artifact invalide.');
  if(a.sourceKind!==undefined&&!SOURCES.has(a.sourceKind))throw new Error('Provenance d\'artifact invalide.');
  if(a.phase!==undefined&&(!Number.isFinite(a.phase)||a.phase<0||a.phase>1))throw new Error('Phase d\'artifact invalide.');
  if(a.region!==undefined){
   if(!Array.isArray(a.region)||a.region.length!==4||a.region.some(n=>!Number.isFinite(n)||n<0||n>1)||a.region[2]<=0||a.region[3]<=0||a.region[0]+a.region[2]>1.000001||a.region[1]+a.region[3]>1.000001)throw new Error('Region de document invalide.');
  }
  if(a.preview!==undefined&&(!a.preview||typeof a.preview!=='object'||!['front','side','top'].includes(a.preview.plane)))throw new Error('Apercu d\'artifact invalide.');
 }
 return catalog;
}
export function artifactCatalog(client){
 return validateArtifactCatalog(client?.artifactCatalog);
}
export function artifactsForEntity(catalog,entityId){
 if(!entityId)return [];
 return (catalog?.artifacts||[]).filter(a=>a.entityIds.includes(entityId));
}
export function artifactForSelection(catalog,entityId,currentId=null){
 const items=catalog?.artifacts||[];
 if(currentId&&items.some(a=>a.id===currentId&&(!entityId||a.entityIds.includes(entityId))))return currentId;
 return artifactsForEntity(catalog,entityId)[0]?.id||items[0]?.id||null;
}
export function documentForArtifact(catalog,artifact){
 if(!artifact?.documentId)return null;
 return (catalog?.documents||[]).find(d=>d.id===artifact.documentId)||null;
}
export function safeDocumentTarget(doc,page){
 if(!doc?.url)return null;
 const raw=safeLocalUrl(doc.url);if(!raw)return null;
 if(doc.mime!=='application/pdf'||!page)return raw;
 const clean=raw.split('#')[0];return clean+'#page='+page;
}
export function artifactProvenance(artifact,doc){
 return artifact?.sourceKind||doc?.sourceKind||'derived';
}
