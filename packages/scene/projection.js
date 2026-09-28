import {point,worldBounds} from './math.js';
import {projectedLines} from './edges.js';
export const PLAN_AXES={front:[1,2],side:[0,2],top:[0,1]};
export function projection(parts,plane='front',width=720,height=420,envelope=null){
  const axes=PLAN_AXES[plane];if(!axes)throw new Error('Unknown projection');
  const b=envelope||worldBounds(parts),pad=58;
  const dx=Math.max(.2,b.hi[axes[0]]-b.lo[axes[0]]),dy=Math.max(.2,b.hi[axes[1]]-b.lo[axes[1]]);
  const s=Math.min((width-2*pad)/dx,(height-2*pad)/dy),cx=(b.hi[axes[0]]+b.lo[axes[0]])/2,cy=(b.hi[axes[1]]+b.lo[axes[1]])/2;
  const xy=(p)=>[width/2+(p[0]-cx)*s,height/2-(p[1]-cy)*s];
  return {scale:s,bounds:b,width,height,xy,parts:parts.map(p=>{
    const lines=projectedLines(p,axes);const path=lines.map(([a,b])=>{const aa=xy(a),bb=xy(b);return `M${aa[0].toFixed(2)},${aa[1].toFixed(2)}L${bb[0].toFixed(2)},${bb[1].toFixed(2)}`;}).join('');
    const center=p.positions.length?point(p.matrix,[0,0,0]):[0,0,0];return {id:p.id,label:p.label,path,center:xy([center[axes[0]],center[axes[1]]])};
  }),span:dx,heightUnits:dy};
}
export function cycleEnvelope(client,params,view={yaw:0,explode:0}){
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<8;i++){const b=worldBounds(client.frame(params,i/8,view).parts);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],b.lo[k]);hi[k]=Math.max(hi[k],b.hi[k]);}}
  return {lo,hi}; // Eight samples to stabilize framing; NOT a collision/envelope proof.
}
export const escapeXml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function exportPlanSvg(frame,plane,{title='Projection de maillage',revision=0,phase=0,selection=null}={}){
  const p=projection(frame.parts,plane,960,600),e=escapeXml;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 690" role="img" aria-label="${e(title)}"><title>${e(title)}</title><rect width="960" height="690" fill="white"/><g fill="none" stroke-linejoin="round">${p.parts.map(x=>`<path d="${x.path}" stroke="${x.id===selection?'#187c88':'#354851'}" stroke-width="${x.id===selection?1.6:.65}"/>`).join('')}</g><path d="M24 606H936" stroke="#a9b7bf"/><g font-family="sans-serif" fill="#253f49"><text x="24" y="634" font-size="18">${e(title)} | ${e(plane)} | revision ${revision}</text><text x="24" y="657" font-size="12">Phase ${(phase*100).toFixed(1)}% | ${e(frame.units)} | ${e(frame.source)}</text><text x="24" y="677" font-size="11">Projection de maillage. Pas un plan de fabrication, ni une validation mecanique.</text></g></svg>`;
}
