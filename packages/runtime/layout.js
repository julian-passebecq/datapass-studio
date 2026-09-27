const ID=/^[a-z][a-zA-Z0-9_.-]{0,127}$/;
const MAX_NODES=128,MAX_DEPTH=12;
const KINDS=new Set(['slot','split','grid','tabs','stack']);
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const id=(v,label='id')=>{if(typeof v!=='string'||!ID.test(v))throw new Error('Invalid '+label);return v;};
const text=(v,label,max=200)=>{if(typeof v!=='string'||v.length>max)throw new Error('Invalid '+label);return v;};
function keys(node,allowed,kind){for(const k of Object.keys(node))if(!allowed.has(k))throw new Error('Unknown '+kind+' field: '+k);}
function ratio(v){if(!Number.isFinite(v)||v<=0||v>=1)throw new Error('Split ratio must be between 0 and 1');return v;}
function positiveInt(v,label,max){if(!Number.isSafeInteger(v)||v<1||v>max)throw new Error('Invalid '+label);return v;}

/** Validate inert recursive layout JSON. Rendering/content is supplied separately by trusted consumers. */
export function validateLayoutDocument(value,{knownSlots=null}={}){
 if(!isObject(value)||value.format!=='datapass.studio.layout'||value.version!==1)throw new Error('Unsupported layout document');
 keys(value,new Set(['format','version','id','title','root']),'layout document');id(value.id,'layout id');text(value.title,'layout title',200);
 const seen=new Set(),slots=new Set();let count=0;
 function visit(node,depth){
  if(!isObject(node)||!KINDS.has(node.kind)||depth>MAX_DEPTH||++count>MAX_NODES)throw new Error('Invalid or too complex layout node');
  id(node.id,'layout node id');if(seen.has(node.id))throw new Error('Duplicate layout node id: '+node.id);seen.add(node.id);
  if(node.kind==='slot'){
   keys(node,new Set(['id','kind','slot','label','minSize']),'slot');id(node.slot,'slot id');if(slots.has(node.slot))throw new Error('Duplicate slot placement: '+node.slot);slots.add(node.slot);
   if(node.label!==undefined)text(node.label,'slot label',160);if(node.minSize!==undefined&&(!Number.isFinite(node.minSize)||node.minSize<0||node.minSize>4000))throw new Error('Invalid slot minSize');
  }else if(node.kind==='split'){
   keys(node,new Set(['id','kind','axis','ratio','first','second','resizable']),'split');if(!['horizontal','vertical'].includes(node.axis))throw new Error('Invalid split axis');ratio(node.ratio);if(typeof node.resizable!=='boolean')throw new Error('Split resizable must be boolean');visit(node.first,depth+1);visit(node.second,depth+1);
  }else if(node.kind==='grid'){
   keys(node,new Set(['id','kind','columns','gap','children']),'grid');positiveInt(node.columns,'grid columns',12);if(!Number.isFinite(node.gap)||node.gap<0||node.gap>128)throw new Error('Invalid grid gap');if(!Array.isArray(node.children)||!node.children.length||node.children.length>64)throw new Error('Invalid grid children');node.children.forEach(x=>visit(x,depth+1));
  }else if(node.kind==='tabs'){
   keys(node,new Set(['id','kind','tabs','defaultTab']),'tabs');if(!Array.isArray(node.tabs)||!node.tabs.length||node.tabs.length>24)throw new Error('Invalid tabs');const tabIds=new Set();for(const tab of node.tabs){if(!isObject(tab))throw new Error('Invalid tab');keys(tab,new Set(['id','label','child']),'tab');id(tab.id,'tab id');text(tab.label,'tab label',120);if(tabIds.has(tab.id))throw new Error('Duplicate tab id');tabIds.add(tab.id);visit(tab.child,depth+1);}if(typeof node.defaultTab!=='string'||!tabIds.has(node.defaultTab))throw new Error('Invalid defaultTab');
  }else{
   keys(node,new Set(['id','kind','direction','gap','children']),'stack');if(!['horizontal','vertical'].includes(node.direction))throw new Error('Invalid stack direction');if(!Number.isFinite(node.gap)||node.gap<0||node.gap>128)throw new Error('Invalid stack gap');if(!Array.isArray(node.children)||!node.children.length||node.children.length>64)throw new Error('Invalid stack children');node.children.forEach(x=>visit(x,depth+1));
  }
 }
 visit(value.root,0);
 if(knownSlots){const known=new Set(knownSlots);for(const slot of slots)if(!known.has(slot))throw new Error('Unknown layout slot: '+slot);}
 return value;
}
export function collectLayoutSlots(document){validateLayoutDocument(document);const out=[];const visit=node=>{if(node.kind==='slot')out.push(node.slot);else if(node.kind==='split'){visit(node.first);visit(node.second);}else if(node.kind==='tabs')node.tabs.forEach(x=>visit(x.child));else node.children.forEach(visit);};visit(document.root);return out;}
export function layoutNodeCount(document){validateLayoutDocument(document);let n=0;const visit=x=>{n++;if(x.kind==='split'){visit(x.first);visit(x.second);}else if(x.kind==='tabs')x.tabs.forEach(t=>visit(t.child));else if(x.kind==='grid'||x.kind==='stack')x.children.forEach(visit);};visit(document.root);return n;}
export function makeSplitLayout(idValue,title,leftSlot,rightSlot,{axis='horizontal',ratio=.35,resizable=true}={}){
 const value={format:'datapass.studio.layout',version:1,id:idValue,title,root:{id:'root',kind:'split',axis,ratio,resizable,first:{id:'left',kind:'slot',slot:leftSlot,label:leftSlot},second:{id:'right',kind:'slot',slot:rightSlot,label:rightSlot}}};return validateLayoutDocument(value);
}