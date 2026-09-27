import {readdir,readFile} from 'node:fs/promises';import path from 'node:path';
async function walk(p){const out=[];for(const e of await readdir(p,{withFileTypes:true})){if(['dist-private','.release','node_modules','dist','.git','.private','portable-vendor','private-client','qa'].includes(e.name))continue;const f=path.join(p,e.name);if(e.isDirectory())out.push(...await walk(f));else out.push(f);}return out;}
const files=await walk('.'),issues=[];
for(const f of files.filter(f=>/\.(js|mjs|ts)$/.test(f))){const text=await readFile(f,'utf8');
 if(f.startsWith('packages/')&&/from\s+['"][^'"]*(?:clients\/|apps\/|private-client)/.test(text))issues.push(f+': package imports consumer');
 if(f.startsWith('packages/runtime/')&&/(?:from\s+['"]react|document\.|window\.|WebGL|FOIL-WIND)/.test(text))issues.push(f+': impure runtime dependency');
 if(f.startsWith('apps/')&&/FOIL-WIND-|kinematics\.frequency_hz|geometry\.span_m/.test(text))issues.push(f+': app embeds private domain');
 if(f.startsWith('packages/')&&/eval\s*\(|new Function\s*\(/.test(text))issues.push(f+': executable document boundary');
}
if(issues.length)throw new Error(issues.join('\n'));console.log('Package boundaries: OK ('+files.length+' authored files)');
