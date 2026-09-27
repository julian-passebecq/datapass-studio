const ID=/^[a-z][a-zA-Z0-9_.-]{0,127}$/;
const SOURCES=new Set(['synthetic','private-reference','user-reference','derived']);
const HIGHLIGHT_KINDS=new Set(['focus','info','warning','success']);
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function strict(value,allowed,label){if(!isObject(value))throw new Error('Invalid '+label);for(const key of Object.keys(value))if(!allowed.has(key))throw new Error('Unknown '+label+' field: '+key);}
function id(value,label='id'){if(typeof value!=='string'||!ID.test(value))throw new Error('Invalid '+label);return value;}
function text(value,label,max,{required=false}={}){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Error('Invalid '+label);return value;}

export function validateCodeSpec(value){
 strict(value,new Set(['format','version','id','title','language','fileLabel','code','sourceKind','note','highlights']),'code spec');
 if(value.format!=='datapass.studio.code'||value.version!==1)throw new Error('Unsupported code spec');
 id(value.id,'code id');text(value.title,'code title',240,{required:true});text(value.language,'code language',80,{required:true});
 text(value.fileLabel,'code file label',300);text(value.code,'code body',200000);text(value.note,'code note',3000);
 if(!SOURCES.has(value.sourceKind))throw new Error('Invalid code sourceKind');
 const lines=value.code.split('\n');if(lines.length>5000)throw new Error('Code line limit exceeded');
 if(!Array.isArray(value.highlights)||value.highlights.length>200)throw new Error('Invalid code highlights');
 for(const item of value.highlights){
  strict(item,new Set(['start','end','label','kind']),'code highlight');
  if(!Number.isSafeInteger(item.start)||!Number.isSafeInteger(item.end)||item.start<1||item.end<item.start||item.end>Math.max(1,lines.length))throw new Error('Invalid code highlight range');
  text(item.label,'code highlight label',200);if(!HIGHLIGHT_KINDS.has(item.kind))throw new Error('Invalid code highlight kind');
 }
 return value;
}

export function codeLineAnnotations(spec){
 const value=validateCodeSpec(spec),annotations=Array.from({length:Math.max(1,value.code.split('\n').length)},()=>[]);
 for(const item of value.highlights)for(let line=item.start;line<=item.end;line++)annotations[line-1].push({label:item.label,kind:item.kind});
 return annotations;
}
