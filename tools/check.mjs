import {spawnSync} from 'node:child_process';import {readdir} from 'node:fs/promises';import path from 'node:path';
async function walk(p){let out=[];for(const e of await readdir(p,{withFileTypes:true})){if(['dist-private','.release','node_modules','.git','dist','.private','portable-vendor','private-client'].includes(e.name))continue;const f=path.join(p,e.name);if(e.isDirectory())out.push(...await walk(f));else if(/\.(js|mjs)$/.test(f))out.push(f);}return out;}
for(const file of await walk('.')){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status)throw new Error(file+'\n'+r.stderr);}
for(const file of ['tools/check-boundaries.mjs','tools/export-schemas.mjs']){const r=spawnSync(process.execPath,[file,'--check'],{stdio:'inherit'});if(r.status)process.exit(r.status);}
console.log('Syntax, package boundaries and schema drift: OK');
