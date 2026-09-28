/** Renderer-neutral plot geometry. A D3 adapter can consume the same series contract. */
export function chartGeometry(series,width=600,height=150){
 const all=series.flatMap(s=>s.values);if(!all.length||!all.every(Number.isFinite))throw new Error('Series non finies ou vides.');
 let min=Math.min(...all),max=Math.max(...all);if(max-min<1e-6){max+=1;min-=1;}
 const pad={l:36,r:16,t:13,b:24},x=i=>pad.l+i*(width-pad.l-pad.r),y=v=>height-pad.b-(v-min)/(max-min)*(height-pad.t-pad.b);
 return {min,max,x,y,width,height,series:series.map(s=>({...s,path:s.values.map((v,i)=>(i?'L':'M')+x(i/Math.max(1,s.values.length-1)).toFixed(2)+','+y(v).toFixed(2)).join('')}))};
}
export function valueAt(series,phase){return series.values[Math.min(series.values.length-1,Math.max(0,Math.round(phase*(series.values.length-1))))];}
