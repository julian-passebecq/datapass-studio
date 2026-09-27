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
