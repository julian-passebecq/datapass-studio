import {ReactiveGraph,TaskRegistry,TaskCoordinator,SessionTrace} from '../packages/runtime/index.js';

const graph=new ReactiveGraph()
  .defineSource('parameter.amplitude',1.2,{validate:Number.isFinite})
  .defineSource('parameter.gain',1.35,{validate:Number.isFinite})
  .defineSource('parameter.damping',.22,{validate:v=>Number.isFinite(v)&&v>=0&&v<=1})
  .defineComputed('metric.peak',['parameter.amplitude','parameter.gain','parameter.damping'],
    (amplitude,gain,damping)=>amplitude*gain*(1-damping));

graph.subscribe(event=>console.log('changed',event.changed));
graph.patch({'parameter.gain':1.5,'parameter.damping':.3});
console.log('peak',graph.get('metric.peak'));
console.log('why',graph.explain('metric.peak'));

const tasks=new TaskRegistry().register('evaluate',async(input,{signal,report})=>{
  report(.5,'halfway');
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(resolve,20);
    signal.addEventListener('abort',()=>{clearTimeout(timer);const e=new Error('aborted');e.name='AbortError';reject(e);},{once:true});
  });
  return {peak:input.amplitude*input.gain};
});
const coordinator=new TaskCoordinator(tasks);
const trace=new SessionTrace();

const revision=3;
const result=await coordinator.run('evaluate',{amplitude:1.2,gain:1.5},{
  inputRevision:revision,
  isRevisionCurrent:r=>r===revision
});
trace.record('task',result.status,{inputRevision:revision});
console.log(trace.export({clientId:'example-app',clientVersion:'0.1.0'}));
