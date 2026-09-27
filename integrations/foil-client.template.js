/** Installed ONLY into public/private-client after explicit, pinned source verification.
 * The template is integration code; the scientific reference stays in the user's private package.
 */
import './geometry.js';
import './kernel.js';
import {data} from './data.js';
import {canonical} from '../../packages/runtime/validation.js';
const G=globalThis.FoilGeometry;if(!G)throw new Error('Private geometry adapter missing');
const defaultId=data.defaultId,parameters=data.parameters;
const artifactCatalog={documents:[{id:'foil-r0-dossier',title:'Dossier R0 prive',mime:'text/markdown',sourceKind:'private-reference',sourceLabel:'Reference locale verifiee par le connecteur; aucun PDF n\'est invente'}],artifacts:[
 {id:'foil-a-reference',title:'Foil A · geometrie de reference',kind:'figure',documentId:'foil-r0-dossier',entityIds:['foil_A','arm_A'],phase:.19,preview:{plane:'side'},sourceKind:'private-reference',summary:'Liaison vers la geometrie R0 locale. La tessellation de reference reste distincte de tout apercu parametrique modifie.'},
 {id:'foil-head-reference',title:'Tete et pivot',kind:'document-region',documentId:'foil-r0-dossier',entityIds:['head_frame','head_bearing'],phase:.50,preview:{plane:'front'},sourceKind:'private-reference',summary:'Repere documentaire prive; ce connecteur ne pretend pas disposer d\'un PDF pagine.'},
 {id:'foil-mast-reference',title:'Mat et implantation',kind:'figure',documentId:'foil-r0-dossier',entityIds:['mast','base_interface'],preview:{plane:'top'},sourceKind:'private-reference',summary:'Exemple de binding source/model sans copier la source scientifique dans Studio.'}
]};
const valueCache=new WeakMap();
function body(p,id=defaultId){let map=valueCache.get(p);if(!map){map=new Map();valueCache.set(p,map);}if(map.has(id))return map.get(id);
 const b=structuredClone(data.cases[id]);if(!b)throw new Error('Unknown private scenario');
 for(const f of parameters){const [group,key]=f.id.split('.');b[group][key]=p[f.id];}
 map.set(id,b);return b;
}
/** Presentation only: the original private JS kernel remains byte-identical.
 * Scientific output still comes exclusively from the verified Python endpoint.
 */
export function presentationPose(c,phase){return globalThis.FoilKernel.kinematics(c,phase/c.kinematics.frequency_hz);}
const meshCache=new WeakMap();
const idsForPart=id=>id.startsWith('foil')?['geometry.span_m','geometry.chord_m','kinematics.pitch_amplitude_deg']:id.startsWith('arm')?['geometry.arm_length_m','geometry.heave_stroke_pp_m']:id==='mast'?['geometry.head_pivot_height_m','geometry.mast_outer_diameter_m','geometry.mast_wall_thickness_m']:id==='head_frame'?['geometry.head_width_m','geometry.head_depth_m','geometry.head_height_m']:[];
function mesh(c){if(meshCache.has(c))return meshCache.get(c);const reference=data.meshes.find(m=>m.family===c.family_id),isReference=canonical(reference.geometry)===canonical(c.geometry);
 const parts=(isReference?reference.parts:G.previewParts(c)).map(p=>({...p,positions:new Float32Array(p.positions),source:isReference?'reference-mesh':'parametric-preview',label:G.PART_LABELS[p.id]||p.id,group:p.motion==='fixed'?'Structure':p.motion.includes('_A')?'Ensemble A':p.motion.includes('_B')?'Ensemble B':'Tete',parameterIds:idsForPart(p.id)}));
 const value={parts,source:isReference?G.REF_SOURCE:G.PREVIEW_SOURCE};meshCache.set(c,value);return value;
}
const scenarios=data.order.map(id=>({id,label:data.cases[id].family_id+' / '+data.cases[id].uncertainty_case+' - R0',parameters:Object.fromEntries(parameters.map(f=>{const [a,b]=f.id.split('.');return [f.id,data.cases[id][a][b]];}))}));
export const foilClient={id:'foil-wind',version:'0.3.0-adapter.1',title:'FOIL Wind',description:'Client prive / laboratoire R0',classification:'private',parameters,defaults,artifactCatalog:scenarios[0].parameters,scenarios,
 period:p=>1/p['kinematics.frequency_hz'],
 validate(p){const errs=[],get=id=>p['geometry.'+id];
  if(get('arm_length_m')<=get('heave_stroke_pp_m')/2)errs.push('Longueur de bras <= demi-course.');
  if(get('mast_wall_thickness_m')>=get('mast_outer_diameter_m')/2)errs.push('Paroi du mat >= rayon.');
  if(get('arm_wall_thickness_m')>=get('arm_outer_radius_m'))errs.push('Paroi du bras >= rayon.');
  if(get('head_pivot_height_m')<=get('head_height_m')*.55)errs.push('Hauteur du mat non positive.');
  if(get('arm_outer_radius_m')*2>=get('head_depth_m'))errs.push('Diametre du bras >= profondeur de tete.');
  if(get('chord_m')>=get('span_m'))errs.push('Corde >= envergure.');
  if(p['power_model.cut_in_m_s']>=p['power_model.cut_out_m_s'])errs.push('Vent de demarrage >= coupure.');
  if(p['power_model.nameplate_cap_kw']<=p['power_model.auxiliary_kw_operating'])errs.push('Plafond de puissance <= auxiliaires.');
  if(!Number.isInteger(p['economics.life_years']))errs.push('Duree de vie: entier requis.');
  return errs;
 },
 frame(p,phase,view){const c=body(p,view.scenarioId||defaultId),m=mesh(c),state=presentationPose(c,phase);
  return {units:'m',source:m.source,warnings:['Enveloppe de conception, pas plan de fabrication. Transmission unresolved. Profil de test, non confirme.'],parts:m.parts.map(part=>{
   let matrix=G.partMatrix(part.motion,c,state,view.yaw);if(view.explode){const side=part.motion.endsWith('_A')?1:part.motion.endsWith('_B')?-1:0;matrix=G.mul(G.T(side*view.explode*1.4,0,part.motion==='head'?view.explode:0),matrix);}
   return {...part,matrix};
  })};
 },
 traces:(p,context={})=>['A','B'].map(id=>({id,label:'Foil '+id,unit:'m',values:Array.from({length:121},(_,i)=>presentationPose(body(p,context.scenarioId||defaultId),i/120)[id].heave_m)})),
 metrics(p,context={}){const id=context.scenarioId||defaultId,base=scenarios.find(s=>s.id===id);if(canonical(p)===canonical(base.parameters))return data.metrics[id];
  return data.metrics[id].map(m=>({...m,value:null,note:'Revision modifiee : calcul Python requis'}));
 },
 explain:[{title:'Reference et candidat',body:'La geometrie initiale provient de la tessellation BRep R0. Un parametre modifie produit un apercu, pas un nouveau STEP.',entityId:'foil_A',phase:.12,code:'reference.geometry === candidate.geometry ? referenceMesh : parametricPreview'},
 {title:'Deux foils, une phase',body:'Le mouvement est prescrit. Les projections partagent la phase et les memes identifiants de pieces.',entityId:'arm_A',phase:.25,code:'presentationPose(candidate, phase)'},
 {title:'La science reste cote Python',body:'Les valeurs L0 sont conditionnelles et non validees pour le vent. Le navigateur ne recalcule pas le LCOE.',entityId:null,phase:.5,code:'verified_kernel.lcoe(validated_candidate)'},
 {title:'Aucune mutation de la source',body:'Les cas R0 et le manifeste sont verifies. Sauvegarder Studio ne modifie ni ces cas ni le Core Truth.',entityId:null,phase:.75,code:'candidate_revision != source_revision'}]
};
