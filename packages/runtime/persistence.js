/** Optimistic per-record CAS in one IndexedDB transaction. No silent last-tab-wins. */
export class WorkspaceRepository {
  constructor(indexedDB=globalThis.indexedDB){this.indexedDB=indexedDB;this.db=null;this.tokens=new Map();}
  async open(){
    if(this.db)return this.db;
    if(!this.indexedDB)throw new Error('Stockage local indisponible.');
    return new Promise((resolve,reject)=>{
      const r=this.indexedDB.open('datapass-studio-v1',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('workspaces',{keyPath:'id'});
      r.onblocked=()=>reject(new Error('Fermez les anciennes fenetres Studio pour ouvrir le stockage.'));
      r.onerror=()=>reject(r.error);
      r.onsuccess=()=>{this.db=r.result;this.db.onversionchange=()=>{this.db.close();this.db=null;};resolve(this.db);};
    });
  }
  async load(id){const db=await this.open();return new Promise((resolve,reject)=>{const r=db.transaction('workspaces').objectStore('workspaces').get(id);
    r.onerror=()=>reject(r.error);r.onsuccess=()=>{this.tokens.set(id,r.result?.token||null);resolve(r.result?.document||null);};});}
  async save(id,document){
    const db=await this.open();const expected=this.tokens.get(id)||null;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('workspaces','readwrite'),s=tx.objectStore('workspaces');let problem=null,next;
      const r=s.get(id);r.onsuccess=()=>{
        if((r.result?.token||null)!==expected){problem=new Error('Conflit: une autre fenetre a modifie ce projet. Exportez votre copie puis rechargez.');tx.abort();return;}
        next=globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random();s.put({id,document,token:next});
      };
      tx.oncomplete=()=>{this.tokens.set(id,next);resolve(next);};
      tx.onerror=()=>reject(problem||tx.error||new Error('Echec du stockage.'));
      tx.onabort=()=>reject(problem||tx.error||new Error('Sauvegarde interrompue.'));
    });
  }
  close(){this.db?.close();this.db=null;}
}
/** Serializes saves and never reports an old completion as the current document saved. */
export class SaveQueue {
  constructor(write,onStatus){this.write=write;this.onStatus=onStatus;this.generation=0;this.chain=Promise.resolve();this.disposed=false;}
  enqueue(document){const generation=++this.generation;this.onStatus('saving');
    this.chain=this.chain.catch(()=>{}).then(async()=>{
      if(this.disposed||generation!==this.generation)return;
      try{await this.write(document);if(!this.disposed&&generation===this.generation)this.onStatus('saved');}
      catch(error){if(!this.disposed&&generation===this.generation)this.onStatus('error',error);}
    });return this.chain;
  }
  dispose(){this.disposed=true;}
}
