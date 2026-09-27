import {readFile,writeFile,mkdir,cp,rm,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const portable=process.argv.includes('--portable'),privateClient=process.argv.includes('--private');
const outputName=process.env.STUDIO_BUILD_DIR||'dist';
if(!/^dist(?:-[a-z0-9-]+)?$/.test(outputName))throw new Error('Build destination must be dist or a dist-<name> directory.');
const out=path.join(root,outputName);
const has=async p=>access(p).then(()=>true,()=>false);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'vendor'),{recursive:true});
for(const p of ['apps','packages','clients','index.html'])await cp(path.join(root,p),path.join(out,p),{recursive:true});
await mkdir(path.join(out,'integrations'),{recursive:true});
for(const f of ['three-adapter.js','conceptmotion-host.js'])await cp(path.join(root,'integrations',f),path.join(out,'integrations',f));
await mkdir(path.join(out,'public'),{recursive:true});
await cp(path.join(root,'public/studio.svg'),path.join(out,'public/studio.svg'));
await writeFile(path.join(out,'public/client-index.json'),JSON.stringify({version:1,private:privateClient}));
let provenance={mode:portable?'portable-user-archive':'npm-production',react:'18.2.0',files:{}};
if(portable){
 const base=path.join(root,'portable-vendor');
 const manifest=JSON.parse(await readFile(path.join(base,'provenance.json'),'utf8'));
 for(const [file,expected]of Object.entries(manifest.files)){
   const data=await readFile(path.join(base,file));if(hash(data)!==expected.sha256)throw new Error('Portable runtime integrity failed: '+file);
 }
 await cp(base,path.join(out,'vendor'),{recursive:true});
 const source=await readFile(path.join(base,'react.mjs'),'utf8');
 await writeFile(path.join(out,'vendor/react.mjs'),source+'\nexport const createRoot = ReactDOM.createRoot;\n');
 provenance.source=manifest;
}else{
 // Small explicit production CJS -> ESM closure for the pinned React runtime.
 // No mock framework, CDN, automatic transpiler or user-source evaluation.
 const modules={react:'react/cjs/react.production.min.js',scheduler:'scheduler/cjs/scheduler.production.min.js','react-dom':'react-dom/cjs/react-dom.production.min.js'};
 let source='/* React / ReactDOM / Scheduler: MIT. See adjacent LICENSE files. */\nconst modules = {\n';
 for(const [id,file]of Object.entries(modules)){
   const src=await readFile(path.join(root,'node_modules',file),'utf8');
   source+=JSON.stringify(id)+': function(module,exports,require){\n'+src+'\n},\n';
   provenance.files[file]=hash(src);
 }
 source+='};\nconst cache={}; function require(id){if(cache[id])return cache[id].exports;if(!modules[id])throw new Error("Unknown dependency: "+id);const module={exports:{}};cache[id]=module;modules[id](module,module.exports,require);return module.exports;}\n';
 source+='const React=require("react"),ReactDOM=require("react-dom");export default React;export {React,ReactDOM};export const createRoot=ReactDOM.createRoot;\nexport const {createElement,Fragment,useState,useEffect,useLayoutEffect,useRef,useMemo,useCallback,useReducer,useSyncExternalStore,forwardRef,createContext,useContext,memo}=React;\n';
 await writeFile(path.join(out,'vendor/react.mjs'),source);
 for(const name of ['react','react-dom','scheduler']){
  const pkg=JSON.parse(await readFile(path.join(root,'node_modules',name,'package.json'),'utf8'));
  if(name!=='scheduler'&&pkg.version!=='18.2.0')throw new Error('Unexpected React dependency version');
  await cp(path.join(root,'node_modules',name,'LICENSE'),path.join(out,'vendor',name+'-LICENSE.txt'));
 }
}
const three=path.join(root,'node_modules/three/build/three.module.js');
if(await has(three)){
 await cp(three,path.join(out,'vendor/three.mjs'));await cp(path.join(root,'node_modules/three/LICENSE'),path.join(out,'vendor/three-LICENSE.txt'));
 provenance.three='optional-installed-adapter';
}else provenance.three='not-bundled';
if(privateClient){
 const source=path.join(root,'public/private-client');if(!await has(source))throw new Error('Install your authorized private client first.');
 await cp(source,path.join(out,'public/private-client'),{recursive:true});
}
await writeFile(path.join(out,'BUILD.json'),JSON.stringify({version:'0.1.0',private:privateClient,provenance},null,2));
console.log(JSON.stringify({output:out,private:privateClient,runtime:provenance.mode,three:provenance.three},null,2));
