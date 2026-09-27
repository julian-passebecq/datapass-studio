const ID=/^[a-z][a-zA-Z0-9_.-]{0,127}$/;
const SOURCE=new Set(['synthetic','private-reference','user-reference','derived']);
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const scalar=v=>v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v));
function strict(obj,allowed,label){if(!isObject(obj))throw new Error('Invalid '+label);for(const k of Object.keys(obj))if(!allowed.has(k))throw new Error('Unknown '+label+' field: '+k);}
function id(v,label){if(typeof v!=='string'||!ID.test(v))throw new Error('Invalid '+label);return v;}
function label(v,name,max=240){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('Invalid '+name);return v;}
function source(v){if(!SOURCE.has(v))throw new Error('Invalid sourceKind');return v;}

export function validateChartSpec(value){
 strict(value,new Set(['format','version','id','title','kind','x','y','series','sourceKind','note']),'chart');
 if(value.format!=='datapass.studio.chart'||value.version!==1)throw new Error('Unsupported chart spec');
 id(value.id,'chart id');label(value.title,'chart title');if(!['line','bar','scatter'].includes(value.kind))throw new Error('Invalid chart kind');source(value.sourceKind);
 if(typeof value.note!=='string'||value.note.length>2000)throw new Error('Invalid chart note');
 for(const axisName of ['x','y']){const a=value[axisName];strict(a,new Set(['label','unit','type']),'axis');label(a.label,'axis label',120);if(typeof a.unit!=='string'||a.unit.length>40||!['number','category'].includes(a.type))throw new Error('Invalid axis');}
 if(value.kind!=='bar'&&value.x.type!=='number')throw new Error('Line/scatter x axis must be numeric');
 if(value.y.type!=='number')throw new Error('Chart y axis must be numeric');
 if(!Array.isArray(value.series)||!value.series.length||value.series.length>12)throw new Error('Invalid chart series');
 const ids=new Set();let total=0;
 for(const s of value.series){strict(s,new Set(['id','label','points']),'series');id(s.id,'series id');label(s.label,'series label',160);if(ids.has(s.id))throw new Error('Duplicate series id');ids.add(s.id);if(!Array.isArray(s.points)||!s.points.length||s.points.length>5000)throw new Error('Invalid series points');total+=s.points.length;if(total>10000)throw new Error('Chart point budget exceeded');
  for(const p of s.points){if(!Array.isArray(p)||p.length!==2)throw new Error('Invalid chart point');const [x,y]=p;if(value.x.type==='number'&&(!Number.isFinite(x)||typeof x!=='number'))throw new Error('Numeric x required');if(value.x.type==='category'&&(typeof x!=='string'||!x||x.length>120))throw new Error('Category x required');if(y!==null&&(typeof y!=='number'||!Number.isFinite(y)))throw new Error('Finite y or null required');}
 }
 return value;
}

export function validateTableSpec(value){
 strict(value,new Set(['format','version','id','title','columns','rows','sourceKind','note']),'table');
 if(value.format!=='datapass.studio.table'||value.version!==1)throw new Error('Unsupported table spec');
 id(value.id,'table id');label(value.title,'table title');source(value.sourceKind);if(typeof value.note!=='string'||value.note.length>2000)throw new Error('Invalid table note');
 if(!Array.isArray(value.columns)||!value.columns.length||value.columns.length>50)throw new Error('Invalid table columns');
 const ids=new Set();for(const c of value.columns){strict(c,new Set(['id','label','type','unit']),'column');id(c.id,'column id');label(c.label,'column label',160);if(ids.has(c.id))throw new Error('Duplicate column id');ids.add(c.id);if(!['string','number','boolean'].includes(c.type)||typeof c.unit!=='string'||c.unit.length>40)throw new Error('Invalid column');}
 if(!Array.isArray(value.rows)||value.rows.length>5000)throw new Error('Invalid table rows');
 for(const row of value.rows){strict(row,new Set(['id','values']),'row');id(row.id,'row id');if(!isObject(row.values))throw new Error('Invalid row values');for(const key of Object.keys(row.values)){if(!ids.has(key))throw new Error('Unknown row column: '+key);if(!scalar(row.values[key]))throw new Error('Non-scalar table cell');}for(const col of value.columns){const v=row.values[col.id];if(v===undefined||v===null)continue;if(col.type==='number'&&(typeof v!=='number'||!Number.isFinite(v)))throw new Error('Expected numeric cell');if(col.type==='string'&&typeof v!=='string')throw new Error('Expected string cell');if(col.type==='boolean'&&typeof v!=='boolean')throw new Error('Expected boolean cell');}}
 if(new Set(value.rows.map(r=>r.id)).size!==value.rows.length)throw new Error('Duplicate row id');
 return value;
}

export function tableRowsForColumns(spec){validateTableSpec(spec);return spec.rows.map(row=>spec.columns.map(col=>row.values[col.id]??null));}
