import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App.js';
import {publicClients} from '../../clients/index.js';
async function main(){
 const clients=[...publicClients],boot=globalThis.__STUDIO_BOOT__||{},index=boot.offline?{private:!!boot.private}:await fetch('./public/client-index.json').then(r=>r.ok?r.json():{private:false});
 if(index.private===true){try{const {foilClient}=await import('../../public/private-client/client.js');clients.push(foilClient);}catch(error){console.warn('Private client unavailable:',error.message);}}
 const candidate=boot.clientId||new URL(location.href).searchParams.get('client'),initialClient=clients.some(c=>c.id===candidate)?candidate:clients[0].id;
 createRoot(document.getElementById('root')).render(React.createElement(App,{clients,initialClient,offline:!!boot.offline}));
}
main().catch(error=>{const node=document.getElementById('root');node.textContent='Datapass Studio ne peut pas demarrer: '+error.message+'. Ouvrir le build via le serveur local, pas en file://.';});
