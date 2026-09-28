/** Optional integration seam matching the pinned external-consumer contract.
 * Supply REAL upstream exports from your installed, verified workspace.
 * validateFigure must call the actual envelope and renderer validators and return string[].
 * Not bundled/qualified by the portable build; no substitute ConceptMotion core.
 */
export function createConceptMotionHost({React,FigurePlayer,validateFigure}){
 if(!React?.createElement||typeof FigurePlayer!=='function'||typeof validateFigure!=='function')throw new Error('Install and supply actual upstream packages');
 return function ConceptMotionHost({figure,registry,playback,stepCount,captions,source,note}){
  const issues=validateFigure(figure);
  if(!Array.isArray(issues)||issues.length)throw new Error('Figure envelope and renderer payload must pass the installed upstream validators');
  if(!Number.isInteger(stepCount)||stepCount<1)throw new Error('Explicit step count required');
  const t=React.useSyncExternalStore(playback.subscribe,playback.getSnapshot,playback.getSnapshot);
  const frameIndex=Math.min(stepCount-1,Math.floor(t.phase*stepCount));
  return React.createElement(FigurePlayer,{figure,registry,stepCount,captions,source,note,
   frameIndex,onFrameChange:i=>playback.set({phase:i/stepCount,playing:false}),
   reducedMotion:t.reducedMotion,presentationSize:'compact',showInspector:false});
 };
}
