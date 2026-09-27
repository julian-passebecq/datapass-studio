export class RendererRegistry {
  #renderers=new Map();
  register(adapter){
    if(!adapter||typeof adapter.id!=='string'||typeof adapter.mount!=='function')throw new Error('Invalid renderer adapter');
    if(this.#renderers.has(adapter.id))throw new Error('Renderer already registered: '+adapter.id);
    this.#renderers.set(adapter.id,Object.freeze({...adapter}));return this;
  }
  get(id){const adapter=this.#renderers.get(id);if(!adapter)throw new Error('Renderer unavailable: '+id);return adapter;}
  list(){return [...this.#renderers.values()].map(({id,capabilities=[]})=>({id,capabilities}));}
}
export class LatestRequest {
  #controller=null;#seq=0;
  async run(fn){this.#controller?.abort();const controller=new AbortController();this.#controller=controller;const seq=++this.#seq;
    try{const value=await fn(controller.signal);return seq===this.#seq?{current:true,value}:{current:false};}
    catch(error){if(seq!==this.#seq)return {current:false};throw error;}}
  cancel(){this.#seq++;this.#controller?.abort();this.#controller=null;}
}
