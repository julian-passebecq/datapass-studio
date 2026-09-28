import {RendererRegistry} from '../runtime/registry.js';
import {mountWebGL} from './webgl.js';
import {mountCanvas3D} from './canvas3d.js';
/** Host-owned registry. External adapters use the same mount/update/destroy boundary. */
export function createStudioRenderers(){return new RendererRegistry()
 .register({id:'studio.webgl',mount:mountWebGL,capabilities:['mesh','selection','orbit','snapshot','orthographic']})
 .register({id:'studio.canvas3d',mount:mountCanvas3D,capabilities:['mesh','selection','orbit','snapshot','orthographic','cpu-fallback']});}
