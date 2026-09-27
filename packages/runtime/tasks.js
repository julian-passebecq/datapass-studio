const ID=/^[a-z][a-zA-Z0-9_.-]{0,127}$/;
function safeClone(value){if(value===undefined)return undefined;return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

export class TaskRegistry {
  #handlers=new Map();
  register(id,handler,{label=id,meta={}}={}){if(typeof id!=='string'||!ID.test(id)||typeof handler!=='function')throw new Error('Invalid task registration');if(this.#handlers.has(id))throw new Error('Task already registered: '+id);this.#handlers.set(id,{id,label,handler,meta:Object.freeze({...meta})});return this;}
  get(id){const task=this.#handlers.get(id);if(!task)throw new Error('Task unavailable: '+id);return task;}
  list(){return [...this.#handlers.values()].map(({id,label,meta})=>({id,label,meta}));}
}

export class TaskCoordinator {
  #registry;#active=new Map();#listeners=new Set();#history=[];#seq=0;#clock;#maxHistory;
  constructor(registry,{clock=()=>Date.now(),maxHistory=64}={}){if(!(registry instanceof TaskRegistry))throw new Error('TaskRegistry required');if(!Number.isSafeInteger(maxHistory)||maxHistory<1||maxHistory>1000)throw new Error('Invalid task history limit');this.#registry=registry;this.#clock=clock;this.#maxHistory=maxHistory;}
  subscribe(fn){this.#listeners.add(fn);return()=>this.#listeners.delete(fn);}
  #emit(event){const frozen=Object.freeze({...event});for(const fn of this.#listeners)fn(frozen);}
  active(key){const a=this.#active.get(key);return a?{...a,controller:undefined}:null;}
  history(){return this.#history.map(x=>safeClone(x));}
  cancel(key,reason='cancelled'){const run=this.#active.get(key);if(!run)return false;run.controller.abort(reason);return true;}
  cancelAll(reason='cancelled'){for(const key of [...this.#active.keys()])this.cancel(key,reason);}
  async run(taskId,input,{key=taskId,inputRevision=0,isRevisionCurrent=()=>true,metadata={}}={}){
    if(typeof key!=='string'||!key||!Number.isSafeInteger(inputRevision)||inputRevision<0||typeof isRevisionCurrent!=='function')throw new Error('Invalid task run options');
    const task=this.#registry.get(taskId);this.cancel(key,'superseded');
    const controller=new AbortController(),runId=`run-${++this.#seq}`,startedAt=this.#clock();
    const state={runId,taskId,key,inputRevision,status:'running',startedAt,progress:0,message:'',metadata:safeClone(metadata),controller};this.#active.set(key,state);this.#emit({...state,controller:undefined});
    let progressSeq=0;
    const report=(progress,message='')=>{if(this.#active.get(key)!==state||controller.signal.aborted)return false;const p=Number(progress);if(!Number.isFinite(p)||p<0||p>1)throw new Error('Progress must be within 0..1');if(typeof message!=='string'||message.length>2000)throw new Error('Invalid progress message');state.progress=p;state.message=message;this.#emit({runId,taskId,key,inputRevision,status:'progress',progress:p,message,progressSeq:++progressSeq});return true;};
    try{
      const value=await task.handler(safeClone(input),{signal:controller.signal,report,runId,inputRevision,metadata:safeClone(metadata)});
      const current=this.#active.get(key)===state&&!controller.signal.aborted,revisionCurrent=current&&isRevisionCurrent(inputRevision),status=!current?'superseded':revisionCurrent?'ready':'stale';
      const finished={runId,taskId,key,inputRevision,status,startedAt,finishedAt:this.#clock(),progress:1,message:state.message,value:revisionCurrent?safeClone(value):undefined,metadata:safeClone(metadata)};
      if(current)this.#active.delete(key);this.#remember(finished);this.#emit(finished);return finished;
    }catch(error){
      const current=this.#active.get(key)===state;if(current)this.#active.delete(key);
      const aborted=controller.signal.aborted||error?.name==='AbortError',finished={runId,taskId,key,inputRevision,status:aborted?'cancelled':'error',startedAt,finishedAt:this.#clock(),progress:state.progress,message:aborted?String(controller.signal.reason||'cancelled'):String(error?.message||error),metadata:safeClone(metadata)};
      this.#remember(finished);this.#emit(finished);if(aborted)return finished;throw Object.assign(error instanceof Error?error:new Error(String(error)),{taskRun:finished});
    }
  }
  #remember(item){this.#history.push({...item,value:item.value===undefined?undefined:safeClone(item.value)});if(this.#history.length>this.#maxHistory)this.#history.splice(0,this.#history.length-this.#maxHistory);}
}
