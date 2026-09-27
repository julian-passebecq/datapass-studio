export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface ArtifactDocument {id:string; title:string; mime:'application/pdf'|'image/png'|'image/jpeg'|'image/webp'|'text/plain'|'text/markdown'; sourceKind:'synthetic'|'private-reference'|'user-reference'|'derived'; url?:string; pages?:number; sourceLabel?:string;}
export interface ArtifactReference {id:string; title:string; kind:'figure'|'document-region'|'image'|'code'|'table'; entityIds:string[]; documentId?:string; page?:number; summary?:string; sourceKind?:'synthetic'|'private-reference'|'user-reference'|'derived'; phase?:number; region?:[number,number,number,number]; preview?:{plane:'front'|'side'|'top'};}
export interface ArtifactCatalog {documents:ArtifactDocument[]; artifacts:ArtifactReference[];}
export interface ParameterSpec {
  id: string; label: string; unit: string; min: number; max: number; step: number;
  group: string; affects: string[]; note?: string;
}
export interface MeshPart {
  id: string; label: string; group: string; positions: number[] | Float32Array;
  matrix: number[]; color: [number, number, number]; parameterIds: string[];
  source: 'synthetic' | 'reference-mesh' | 'parametric-preview';
}
export interface Metric {id: string; label: string; value: number | null; unit: string; note: string;}
export interface SceneFrame {parts: MeshPart[]; units: string; source: string; warnings: string[];}
export interface ClientDefinition {
  id: string; title: string; description: string; classification: 'synthetic' | 'private';
  version: string; parameters: ParameterSpec[]; defaults: Record<string,number>;
  scenarios?: {id: string; label: string; parameters: Record<string,number>}[];
  validate(parameters: Record<string,number>): string[];
  frame(parameters: Record<string,number>, phase: number, view: {yaw: number; explode: number; scenarioId?: string}): SceneFrame;
  period?(parameters: Record<string,number>): number;
  traces(parameters: Record<string,number>, context?: {scenarioId?: string}): {id: string; label: string; unit: string; values: number[]}[];
  metrics(parameters: Record<string,number>, context?: {scenarioId?: string}): Metric[];
  explain?: {title: string; body: string; entityId?: string; phase: number; code?: string}[];
  artifactCatalog?: ArtifactCatalog;
}
export interface EvaluationRequest {
  version: 1; requestId: string; clientId: string; scenarioId: string;
  inputRevision: number; parameters: Record<string,number>;
}
export interface WorkspaceDocument {
  format: 'datapass.studio.workspace'; version: 1; clientId: string; clientVersion: string;
  scenarioId: string; parameters: Record<string,number>; revision: number;
  selection: string|null; hidden: string[]; view: Record<string,Json>;
  provenance: {classification: string; source: string; reviewed: false};
}
export interface StudioAppManifest {
  format:'datapass.studio.app'; schemaVersion:1; id:string; title:string; version:string; description:string;
  classification:'synthetic'|'private';
  parameters:{id:string;label:string;default:number;min:number;max:number;step:number;unit:string;group:string;affects:string[];note:string}[];
  views:{id:string;label:string;kind:'lab'|'plans'|'compare'|'references'|'explain'|'custom';icon:string;description:string}[];
  tasks:{id:string;label:string;input_nodes:string[];output_nodes:string[];revision_guarded:boolean;cancellable:boolean}[];
  artifacts:{id:string;title:string;kind:'figure'|'document-region'|'image'|'code'|'table';entity_ids:string[];document_id:string|null;page:number|null;phase:number|null;source_kind:'synthetic'|'private-reference'|'user-reference'|'derived'}[];
}
export interface SessionTraceEvent {
  seq:number;at:number;type:'parameter'|'scenario'|'selection'|'visibility'|'view'|'playback'|'task'|'artifact'|'import'|'export'|'custom';
  action:string;entityId:string|null;inputRevision:number|null;phase:number|null;meta?:Record<string,string|number|boolean|null>;
}
export interface SessionTraceDocument {format:'datapass.studio.trace';version:1;clientId:string;clientVersion:string;startedAt:number|null;exportedAt:number;events:SessionTraceEvent[];}
export interface ReactiveNodeInfo {id:string;kind:'source'|'computed';deps:string[];revision:number;dirty:boolean;meta:Record<string,Json>;}
export interface TaskRun<T=Json> {runId:string;taskId:string;key:string;inputRevision:number;status:'running'|'progress'|'ready'|'stale'|'superseded'|'cancelled'|'error';progress:number;message:string;value?:T;}
export type StudioLayoutNode =
  | {id:string;kind:'slot';slot:string;label?:string;minSize?:number}
  | {id:string;kind:'split';axis:'horizontal'|'vertical';ratio:number;first:StudioLayoutNode;second:StudioLayoutNode;resizable:boolean}
  | {id:string;kind:'grid';columns:number;gap:number;children:StudioLayoutNode[]}
  | {id:string;kind:'tabs';defaultTab:string;tabs:{id:string;label:string;child:StudioLayoutNode}[]}
  | {id:string;kind:'stack';direction:'horizontal'|'vertical';gap:number;children:StudioLayoutNode[]};
export interface StudioLayoutDocument {format:'datapass.studio.layout';version:1;id:string;title:string;root:StudioLayoutNode;}
export interface StudioChartSpec {
  format:'datapass.studio.chart';version:1;id:string;title:string;kind:'line'|'bar'|'scatter';
  x:{label:string;unit:string;type:'number'|'category'};y:{label:string;unit:string;type:'number'};
  series:{id:string;label:string;points:[number|string,number|null][]}[];
  sourceKind:'synthetic'|'private-reference'|'user-reference'|'derived';note:string;
}
export interface StudioTableSpec {
  format:'datapass.studio.table';version:1;id:string;title:string;
  columns:{id:string;label:string;type:'string'|'number'|'boolean';unit:string}[];
  rows:{id:string;values:Record<string,string|number|boolean|null>}[];
  sourceKind:'synthetic'|'private-reference'|'user-reference'|'derived';note:string;
}
