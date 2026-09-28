import {validateClient,validateParameters,validateDocument,canonical,fingerprint,validateEvaluationResponse} from './validation.js';
const clone = v => JSON.parse(JSON.stringify(v));
const cleanView = () => ({mode:'lab',camera:'iso',yaw:0,explode:0,edges:true,ghost:false,grid:true});
function seal(x) { Object.freeze(x.parameters); Object.freeze(x.view); Object.freeze(x.hidden); return Object.freeze(x); }
/** Framework state contains no FOIL/engineering assumptions. One store per client session. */
export class WorkspaceStore {
  #listeners = new Set(); #undo=[]; #redo=[]; #editStart=null; #sequence=0;
  constructor(client) {
    this.client=validateClient(client);
    this.state=seal({parameters:{...client.defaults},scenarioId:client.scenarios?.[0]?.id||'default',revision:0,
      selection:null,hidden:[],view:cleanView(),error:null,evaluation:null,evaluationStatus:'idle',activeRequestId:null,
      saveStatus:'not-saved',dirty:false,eventLog:[],history:{undo:0,redo:0}});
    this.baseline=clone(this.state.parameters);
  }
  getSnapshot=()=>this.state;
  subscribe=(f)=>{this.#listeners.add(f);return()=>this.#listeners.delete(f);};
  #emit(patch, persisted=false) {
    this.state=seal({...this.state,...patch,dirty:persisted ? true : (patch.dirty ?? this.state.dirty),history:{undo:this.#undo.length,redo:this.#redo.length}});
    for(const f of this.#listeners) f();
  }
  #record(type,detail) {
    const event={seq:++this.#sequence,type,detail};
    return [...this.state.eventLog.slice(-49),event];
  }
  #snapshot(){ return clone({parameters:this.state.parameters,scenarioId:this.state.scenarioId}); }
  #pushUndo(previous){this.#undo.push(previous); if(this.#undo.length>64)this.#undo.shift();this.#redo=[];}
  beginEdit(){if(!this.#editStart)this.#editStart=this.#snapshot();}
  endEdit(){if(this.#editStart){if(canonical(this.#editStart)!==canonical(this.#snapshot()))this.#pushUndo(this.#editStart);this.#editStart=null;this.#emit({});}}
  cancelEdit(){if(!this.#editStart)return;const prev=this.#editStart;this.#editStart=null;this.#applyState(prev,'cancel');}
  updateParameter(id,value,{grouped=false}={}) {
    const values={...this.state.parameters,[id]:value}; const errors=validateParameters(this.client,values);
    if(errors.length){this.#emit({error:errors.join(' ')});return false;}
    if(Object.is(this.state.parameters[id],value))return true;
    if(!grouped&&!this.#editStart)this.#pushUndo(this.#snapshot());
    this.#applyState({...this.#snapshot(),parameters:values},'parameter',id);return true;
  }
  #applyState(s,type,detail='') {
    const scenario=this.client.scenarios?.find(x=>x.id===s.scenarioId);
    this.baseline=clone(scenario?.parameters||this.client.defaults);
    this.#emit({...s,revision:this.state.revision+1,error:null,evaluationStatus:this.state.evaluation?'stale':'idle',
      eventLog:this.#record(type,detail)},true);
  }
  undo(){this.endEdit();const p=this.#undo.pop();if(!p)return;this.#redo.push(this.#snapshot());this.#applyState(p,'undo');}
  redo(){const p=this.#redo.pop();if(!p)return;this.#undo.push(this.#snapshot());this.#applyState(p,'redo');}
  reset(){this.endEdit();this.#pushUndo(this.#snapshot());this.#applyState({parameters:clone(this.baseline),scenarioId:this.state.scenarioId},'reset');}
  setScenario(id){
    const s=this.client.scenarios?.find(s=>s.id===id);if(!s)throw new Error('Unknown scenario');
    this.endEdit();this.#pushUndo(this.#snapshot());this.baseline=clone(s.parameters);
    this.#applyState({parameters:clone(s.parameters),scenarioId:id},'scenario',id);
  }
  select(id){if(id!==null&&!this.client.frame(this.state.parameters,0,{yaw:0,explode:0,scenarioId:this.state.scenarioId}).parts.some(p=>p.id===id))return false;
    this.#emit({selection:id,eventLog:this.#record('selection',id||'none')},true);return true;}
  toggleHidden(id){const ids=this.client.frame(this.state.parameters,0,{yaw:0,explode:0,scenarioId:this.state.scenarioId}).parts.map(p=>p.id);if(!ids.includes(id))return;
    const hidden=this.state.hidden.includes(id)?this.state.hidden.filter(x=>x!==id):[...this.state.hidden,id];this.#emit({hidden},true);}
  showAll(){this.#emit({hidden:[],view:{...this.state.view,ghost:false}},true);}
  setView(patch){
    if(Object.keys(patch).some(k=>!['mode','camera','yaw','explode','edges','ghost','grid'].includes(k)))return;
    for(const k of ['edges','ghost','grid'])if(k in patch&&typeof patch[k]!=='boolean')return;
    const v={...this.state.view,...patch};
    if(!['lab','plans','compare','references','data','explain'].includes(v.mode)||!['iso','front','side','top'].includes(v.camera))return;
    if(!Number.isFinite(v.yaw)||v.yaw < -180||v.yaw>180||!Number.isFinite(v.explode)||v.explode<0||v.explode>1)return;
    this.#emit({view:v},true);
  }
  setError(error){this.#emit({error});}
  setSaveStatus(status,clearDirty=false){this.#emit({saveStatus:status,...(clearDirty?{dirty:false}:{})});}
  requestEvaluation(){
    const requestId='eval-'+(++this.#sequence)+'-'+fingerprint(this.state.parameters);
    this.#emit({evaluationStatus:'running',activeRequestId:requestId});
    return {version:1,requestId,clientId:this.client.id,scenarioId:this.state.scenarioId,inputRevision:this.state.revision,parameters:clone(this.state.parameters)};
  }
  acceptEvaluation(response,request){
    validateEvaluationResponse(response);
    if(this.state.activeRequestId!==request.requestId)return false;
    if(response.requestId!==request.requestId||response.inputRevision!==request.inputRevision)throw new Error('Reponse non correlee.');
    if(response.clientId!==this.client.id)throw new Error('Client de reponse incorrect.');
    if(this.state.revision!==request.inputRevision||canonical(this.state.parameters)!==canonical(request.parameters)){
      this.#emit({evaluationStatus:'stale',eventLog:this.#record('evaluation-discarded','stale')});return false;
    }
    this.#emit({evaluation:response,evaluationStatus:'ready',error:null,eventLog:this.#record('evaluation','accepted')});return true;
  }
  failEvaluation(error){this.#emit({evaluationStatus:'error',error});}
  document(){return {format:'datapass.studio.workspace',version:1,clientId:this.client.id,clientVersion:this.client.version,
    scenarioId:this.state.scenarioId,parameters:clone(this.state.parameters),revision:this.state.revision,
    selection:this.state.selection,hidden:[...this.state.hidden],view:{...this.state.view},
    provenance:{classification:this.client.classification,source:'client-authored workspace',reviewed:false}};}
  importDocument(doc){
    validateDocument(this.client,doc);this.endEdit();this.#pushUndo(this.#snapshot());
    const scenario=this.client.scenarios?.find(s=>s.id===doc.scenarioId);this.baseline=clone(scenario?.parameters||this.client.defaults);
    this.#emit({parameters:clone(doc.parameters),scenarioId:doc.scenarioId,selection:doc.selection,hidden:[...doc.hidden],
      view:{...doc.view},revision:this.state.revision+1,error:null,evaluation:null,evaluationStatus:'idle',eventLog:this.#record('import','reviewed')},true);
  }
  restore(doc){
    validateDocument(this.client,doc);
    const scenario=this.client.scenarios?.find(s=>s.id===doc.scenarioId);this.baseline=clone(scenario?.parameters||this.client.defaults);
    this.#undo=[];this.#redo=[];this.#emit({parameters:clone(doc.parameters),scenarioId:doc.scenarioId,selection:doc.selection,
      hidden:[...doc.hidden],view:{...doc.view},revision:doc.revision,dirty:false,saveStatus:'saved'});
  }
}
/** Frame state is deliberately separate from document/history/autosave. */
export class PlaybackStore {
  #listeners=new Set();#raf=null;#previous=null;#disposed=false;
  constructor({raf, cancel}={}){
    this.raf=raf||((f)=>requestAnimationFrame(f));this.cancel=cancel||((id)=>cancelAnimationFrame(id));
    this.state=Object.freeze({phase:0.12,playing:false,speed:1,period:2.5,reducedMotion:false});
  }
  getSnapshot=()=>this.state;
  subscribe=f=>{this.#listeners.add(f);return()=>this.#listeners.delete(f);};
  set(patch){
    if('phase'in patch)patch.phase=Math.max(0,Math.min(1,Number(patch.phase)));
    if('speed'in patch)patch.speed=Math.max(.1,Math.min(4,Number(patch.speed)));
    if('period'in patch)patch.period=Math.max(.05,Math.min(100,Number(patch.period)));
    if(Object.values(patch).some(v=>typeof v==='number'&&!Number.isFinite(v)))return;
    if(patch.reducedMotion||this.state.reducedMotion&&patch.playing)patch.playing=false;
    this.state=Object.freeze({...this.state,...patch});for(const f of this.#listeners)f();
    if(this.state.playing&&this.#raf===null&&!this.#disposed){this.#previous=null;this.#raf=this.raf(this.#tick);}
    if(!this.state.playing&&this.#raf!==null){this.cancel(this.#raf);this.#raf=null;this.#previous=null;}
  }
  #tick=(now)=>{
    this.#raf=null;if(!this.state.playing||this.#disposed)return;
    const dt=this.#previous===null?0:Math.min(0.1,Math.max(0,(now-this.#previous)/1000));this.#previous=now;
    this.state=Object.freeze({...this.state,phase:(this.state.phase+dt*this.state.speed/this.state.period)%1});
    for(const f of this.#listeners)f();
    if(this.state.playing&&!this.#disposed)this.#raf=this.raf(this.#tick);
  };
  dispose(){this.#disposed=true;if(this.#raf!==null)this.cancel(this.#raf);this.#raf=null;this.#listeners.clear();}
}