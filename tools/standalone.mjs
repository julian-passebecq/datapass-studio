/** Build the same ESM application as an entirely offline, self-contained HTML.
 * No eval, CDN, fonts or Python are bundled. Module specifiers are mapped to data URLs.
 */
import {readFile,writeFile,readdir} from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(process.env.STUDIO_BUILD_DIR||'dist');
async function files(p){let all=[];for(const e of await readdir(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())all.push(...await files(f));else all.push(f);}return all;}
const build=JSON.parse(await readFile(path.join(root,'BUILD.json'),'utf8'));
const logo='data:image/svg+xml;base64,'+(await readFile(path.join(root,'public/studio.svg'))).toString('base64');
const imports={};
for(const f of (await files(root)).filter(f=>/\.(js|mjs)$/.test(f))){
 const id=path.relative(root,f).replaceAll('\\','/');let text=await readFile(f,'utf8');
 // Literal import/export specifiers only, never arbitrary source expressions.
 text=text.replace(/((?:from\s*|import\s*\(|import\s*)['"])(\.[^'"]+)(['"])/g,(m,a,s,z)=>a+'@studio/'+path.posix.normalize(path.posix.join(path.posix.dirname(id),s))+z);
 text=text.replaceAll('./public/studio.svg',logo);
 imports['@studio/'+id]='data:text/javascript;base64,'+Buffer.from(text).toString('base64');
}
imports.react=imports['@studio/vendor/react.mjs'];imports['react-dom/client']=imports.react;
if(!imports.react)throw new Error('Build the runtime first.');
const css=await readFile(path.join(root,'apps/studio/styles.css'),'utf8');
const boot={offline:true,private:build.private,clientId:build.private?'foil-wind':'motion-rig'};
const licenseFiles=(await files(path.join(root,'vendor'))).filter(f=>/LICENSE/.test(f));
const licenses=(await Promise.all(licenseFiles.map(f=>readFile(f,'utf8')))).join('\n\n');
const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Datapass Studio - Offline Lab</title><style>'+css+'</style><script>globalThis.__STUDIO_BOOT__='+JSON.stringify(boot)+';</script><script type="importmap">'+JSON.stringify({imports})+'</script><div id="root"></div><script type="module">import "@studio/apps/studio/main.js";</script><!-- Third-party notices\n'+licenses.replaceAll('--','- -')+'\n--></html>';
const target=path.join(root,'studio-offline.html');await writeFile(target,html);console.log('Offline HTML: '+target+' ('+Buffer.byteLength(html)+' bytes; Python not embedded)');
