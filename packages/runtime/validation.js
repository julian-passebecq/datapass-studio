import {validateArtifactCatalog} from './artifacts.js';
/** Bounded inert-data validation. The serialized format never contains executable expressions. */
export const MAX_JSON_BYTES = 1024 * 1024;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function boundedJson(text, maxBytes = MAX_JSON_BYTES) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > maxBytes) throw new Error('Document trop volumineux.');
  const value = JSON.parse(text);
  let count = 0;
  function walk(v, depth) {
    if (++count > 100000 || depth > 24) throw new Error('Structure trop complexe.');
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Nombre non fini.');
    if (typeof v === 'string' && v.length > 50000) throw new Error('Texte trop long.');
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        if (forbidden.has(k)) throw new Error('Cle interdite.');
        walk(v[k], depth + 1);
      }
    }
  }
  walk(value, 0);
  return value;
}
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite value');
  const s = JSON.stringify(value); if (s === undefined) throw new Error('Non-JSON value'); return s;
}
export function fingerprint(value) {
  // Local cache identity only, NOT a cryptographic integrity/security hash.
  let h = 2166136261;
  for (const c of canonical(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
export async function sha256(value) {
  const bytes = new TextEncoder().encode(canonical(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2,'0')).join('');
}
export function validateParameters(client, values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return ['Parametres invalides.'];
  const errors = []; const ids = new Set(client.parameters.map(f => f.id));
  for (const k of Object.keys(values)) if (!ids.has(k)) errors.push('Parametre inconnu: ' + k);
  for (const f of client.parameters) {
    const n = values[f.id];
    if (typeof n !== 'number' || !Number.isFinite(n)) errors.push(f.label + ': nombre fini requis.');
    else if (n < f.min || n > f.max) errors.push(f.label + ': valeur hors limites.');
  }
  return errors.length ? errors : client.validate(values);
}
export function validateClient(client) {
  if (!client || !/^[a-z][a-z0-9-]{1,63}$/.test(client.id)) throw new Error('Client id invalide');
  if (!['synthetic','private'].includes(client.classification)) throw new Error('Classification invalide');
  if (!Array.isArray(client.parameters) || client.parameters.length > 100) throw new Error('Schema de parametres invalide');
  const ids = new Set();
  for (const f of client.parameters) {
    if (!/^[a-z][a-zA-Z0-9_.-]{0,79}$/.test(f.id) || forbidden.has(f.id) || ids.has(f.id)) throw new Error('Identifiant duplique ou invalide');
    ids.add(f.id);
    if (![f.min,f.max,f.step].every(Number.isFinite) || f.min > f.max || f.step <= 0) throw new Error('Bornes invalides');
  }
  for (const fn of ['validate','frame','metrics','traces']) if (typeof client[fn] !== 'function') throw new Error('Contrat client incomplet: '+fn);
  const errors=validateParameters(client,client.defaults); if (errors.length) throw new Error(errors.join(' '));
  const scenarioId=client.scenarios?.[0]?.id||'default';
  const frame=client.frame(client.defaults,0,{yaw:0,explode:0,scenarioId});
  const entityIds=new Set((frame?.parts||[]).map(p=>p.id));
  validateArtifactCatalog(client.artifactCatalog,entityIds);
  return client;
}
export function validateDocument(client, doc) {
  if(doc&&Object.keys(doc).some(k=>!['format','version','clientId','clientVersion','scenarioId','parameters','revision','selection','hidden','view','provenance'].includes(k)))throw new Error('Champ de document inconnu.');
  if (!doc || doc.format !== 'datapass.studio.workspace' || doc.version !== 1) throw new Error('Version de document non prise en charge.');
  if (doc.clientId !== client.id || doc.clientVersion !== client.version) throw new Error('Ce document vise un autre client ou une autre version.');
  if (!Number.isSafeInteger(doc.revision) || doc.revision < 0) throw new Error('Revision invalide.');
  const errors=validateParameters(client, doc.parameters); if(errors.length) throw new Error(errors.join(' '));
  if (typeof doc.scenarioId !== 'string' || !(client.scenarios || [{id:'default'}]).some(s=>s.id===doc.scenarioId)) throw new Error('Scenario inconnu.');
  if (!doc.view || typeof doc.view !== 'object' || Array.isArray(doc.view)) throw new Error('Vue invalide.');
  if (!Number.isFinite(doc.view.yaw) || doc.view.yaw < -180 || doc.view.yaw > 180 || !Number.isFinite(doc.view.explode) || doc.view.explode<0 || doc.view.explode>1) throw new Error('Pose de presentation invalide.');
  if (!['lab','plans','compare','references','data','explain'].includes(doc.view.mode)) throw new Error('Mode inconnu.');
  if (!['iso','front','side','top'].includes(doc.view.camera)) throw new Error('Camera inconnue.');
  if (typeof doc.view.edges !== 'boolean' || typeof doc.view.ghost !== 'boolean' || typeof doc.view.grid !== 'boolean') throw new Error('Options de vue invalides.');
  if (!Array.isArray(doc.hidden) || doc.hidden.length > 500 || doc.hidden.some(x=>typeof x!=='string')) throw new Error('Visibilite invalide.');
  if(!doc.provenance||doc.provenance.classification!==client.classification||doc.provenance.reviewed!==false||typeof doc.provenance.source!=='string'||doc.provenance.source.length>1000)throw new Error('Provenance invalide.');
  if(Object.keys(doc.view).some(k=>!['mode','camera','yaw','explode','edges','ghost','grid'].includes(k))||new Set(doc.hidden).size!==doc.hidden.length)throw new Error('Vue non canonique.');
  const frame=client.frame(doc.parameters,0,{yaw:0,explode:0,scenarioId:doc.scenarioId}); const ids=new Set(frame.parts.map(p=>p.id));
  if (doc.selection!==null && !ids.has(doc.selection)) throw new Error('Selection inconnue.');
  if (doc.hidden.some(id=>!ids.has(id))) throw new Error('Piece masquee inconnue.');
  return doc;
}
/** Validate trusted renderer output as data; this does not make plugins a sandbox. */
const checkedMeshes=new WeakSet();
export function validateFrame(frame){
 if(!frame||!Array.isArray(frame.parts)||frame.parts.length>1000||typeof frame.units!=='string')throw new Error('Invalid scene frame');
 const ids=new Set();let floats=0;
 for(const p of frame.parts){
  if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw new Error('Invalid/duplicate scene identity');ids.add(p.id);
  if(!Array.isArray(p.matrix)||p.matrix.length!==16||!p.matrix.every(Number.isFinite))throw new Error('Invalid transform');
  if(!Array.isArray(p.color)||p.color.length!==3||p.color.some(n=>!Number.isFinite(n)||n<0||n>1))throw new Error('Invalid material');
  if(!(Array.isArray(p.positions)||p.positions instanceof Float32Array)||p.positions.length%9!==0)throw new Error('Expected triangle soup');
  floats+=p.positions.length;if(floats>3000000)throw new Error('Scene exceeds interactive size limit');
  if(!checkedMeshes.has(p.positions)){if(p.positions.some(n=>!Number.isFinite(n)||Math.abs(n)>1000000))throw new Error('Invalid mesh coordinates');checkedMeshes.add(p.positions);}
 }
 return frame;
}
export function validateEvaluationResponse(value){
 if(!value||value.version!==1||typeof value.requestId!=='string'||!Number.isSafeInteger(value.inputRevision)||typeof value.clientId!=='string')throw new Error('Invalid evaluation envelope');
 if(!Array.isArray(value.metrics)||value.metrics.length>50)throw new Error('Invalid metric collection');
 const ids=new Set();for(const m of value.metrics){
  if(!m||['id','label','unit','note'].some(k=>typeof m[k]!=='string'||m[k].length>2000)||ids.has(m.id))throw new Error('Invalid metric identity/text');ids.add(m.id);
  if(m.value!==null&&(typeof m.value!=='number'||!Number.isFinite(m.value)))throw new Error('Invalid metric value');
 }
 return value;
}