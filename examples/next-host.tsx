'use client';
/** Integration sketch; Next.js is not installed or qualified by this delivery.
 * Use source/workspace imports for your own repository layout.
 */
import React, {useMemo, useEffect} from 'react';
import {WorkspaceStore, PlaybackStore} from '../packages/runtime/index.js';
import {SceneViewport, PlanView, Timeline} from '../packages/react/index.js';
import {motionRig} from '../clients/motion-rig.js';
export default function Laboratory() {
  const store=useMemo(()=>new WorkspaceStore(motionRig),[]);
  const playback=useMemo(()=>new PlaybackStore(),[]);
  useEffect(()=>()=>playback.dispose(),[playback]);
  return <><SceneViewport store={store} playback={playback}/>
    <PlanView store={store} playback={playback} plane="side"/>
    <Timeline playback={playback}/></>;
}
