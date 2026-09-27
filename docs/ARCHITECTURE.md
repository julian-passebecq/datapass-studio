# Architecture and decision record

## Scope

Studio 0.1 is a visual-lab framework extracted through working clients, not an attempted rewrite of all the user's apps. The app root now provides six deliberate compositions: 3D lab, orthographic plans, comparison, document/artifact references, analytical data and explanation. The library boundary is React plus portable data/artifact/renderer contracts, not Next.js or the FOIL domain.

## Ownership

| Owner | Owns | Does not own |
|---|---|---|
| Client source | Parameter schema, domain validation, scene entities, prescribed pose, metrics/trace presentation, scenario references | Studio storage or other client domains |
| WorkspaceStore | Parameters, selected entity, visibility, view settings, bounded parameter/scenario history, input revision, evaluator status | GPU buffers, animation clock, scientific authority |
| ReactiveGraph | Explicit client-owned source/computed dependency DAG for local derivation | Imported expressions, persistence, task execution, scientific authority |
| TaskCoordinator | Trusted async handler lifecycle, cancellation, progress, revision freshness and bounded run history | Arbitrary code from manifests, worker isolation, cloud scheduling |
| SessionTrace | Bounded semantic interaction/task/export events with scalar metadata | Hidden telemetry, parameter payloads, document bytes |
| PlaybackStore | Phase, speed, period, reduced-motion policy | Persistent document revision or Python calls |
| Renderer adapter | Mount/update/destroy, draw resources, picking, viewport camera, capture | Domain computation, durable storage |
| Python registry | Trusted bounded evaluators, server validation, authoritative calculation results | Arbitrary client code from JSON, untrusted plugin installation |
| Artifact catalog | Inert links among client documents/figures/code/table references and stable scene entity IDs | PDF interpretation, scientific authority, arbitrary HTML or execution |
| Layout contract / LayoutHost | Inert split/grid/tabs/stack composition plus trusted slot rendering | Domain semantics, arbitrary callbacks in JSON, drag/drop docking persistence |
| Data specs / React views | Bounded chart/table semantics, native SVG/grid reference rendering | ConceptMotion semantics, D3 ownership, analytical computation |
| Flow/code specs / React views | Inert architecture graph + read-only code semantics, scene-entity linkage | Workflow execution, notebook kernel, arbitrary code evaluation |
| Reference shell | Composition, control presentation, explicit review/import/export actions | A cloud runtime or CAD kernel |

An entity id persists across 3D, SVG plans, the parts table and inspectors. Render meshes carry local triangle coordinates plus column-major transforms, units and source labels. Canonical documents do not serialize DOM, React nodes, GPU objects or functions.

## Artifact and document model

The scene contract answers **what is being visualized**. The artifact catalog answers **what source or explanatory object is linked to that stable entity**. These are deliberately separate. A scene part may exist without a document; a PDF figure may reference one or several scene entities; neither owns the other.

`packages/runtime/artifacts.js` stays DOM-free. It validates bounded serializable metadata for documents and artifact references, stable ids, source classification, pages, normalized regions, optional playback phases and optional orthographic preview planes. Static URLs must be same-site. The React reference workspace may additionally attach a user-selected PDF/image by browser object URL for the current session only. That URL is UI state: it is revoked on replacement/unmount, is not written to IndexedDB, and is not emitted by evidence export.

This is intentionally not a PDF extraction engine. There is no OCR, automatic figure detection, coordinate inference or trust promotion. A region is useful only when a client/user workflow knows the coordinate convention. A future extractor can produce reviewed artifact patches without changing scene identity or the runtime format.

Evidence export may include an `artifactBindings` projection containing artifact/document ids, page, source kind and linked entity ids. It never includes session object URLs. DiagramCloud still needs an explicit reviewed adapter; Studio does not write DiagramCloud documents directly.

## Declarative app contract

The `datapass.studio.app/1` manifest is an inert projection used for authoring, review and future scaffolding. It may describe parameters, views, task inputs/outputs and artifact bindings, but it never contains callbacks, formulas, React components or code to execute. JS `manifestFromClient()` and the Python authoring helper produce the same shape. Runtime client functions remain trusted source registrations.

## Reactive derivation and tasks

`ReactiveGraph` is a small DOM-free dependency DAG for browser-local derived values. Invalidating a source marks only descendants dirty; computed nodes are pulled on demand. Batches emit once. It is intentionally explicit rather than a whole-script rerun engine.

`TaskCoordinator` is the complementary async primitive. Handlers are registered in trusted source, keyed runs supersede earlier work, progress is bounded, and a result can be marked stale when the input revision has moved. It does not itself provide process isolation, a Python worker pool or network authentication.

`SessionTrace` records bounded semantic events for user-requested export/support/explanation. Studio's integration records selection/view/playback/task/import/export semantics and does not record parameter values or local document bytes.

## Layout composition

`datapass.studio.layout/1` is intentionally separate from the app manifest and workspace state. A layout names bounded recursive containers and stable slot IDs. It does not serialize React elements, domain values or executable expressions. `LayoutHost` resolves those slot IDs against a trusted consumer-owned React map.

This separation lets the same runtime compose FOIL-like 3D/parameter workspaces, figure/PDF analysis, dashboard grids or code/data tabs without turning any one client layout into the framework model. The first contract supports split, grid, tabs and stack; it is not yet a persisted drag/drop docking system.

## Analytical data contracts

Charts and tables are serializable semantics rather than DOM/SVG serialization. `StudioChartSpec` carries line/bar/scatter series plus axis/source metadata; `StudioTableSpec` carries typed scalar columns/rows. The current React renderer is deliberately dependency-free so offline/portable builds remain possible.

This is the seam for a future D3 sibling adapter. D3 would own richer analytical rendering/transitions; it would not become part of ConceptMotion core and would not own domain calculations. The same chart/table specs can also be placed into a `LayoutHost` slot beside 3D, documents or code.

`datapass.studio.flow/1` and `datapass.studio.code/1` add two more inert surfaces. Flow nodes can link to stable scene entity IDs; `FlowView` selects those same entities while preserving the source graph as serializable data. `CodeView` displays bounded text and line annotations only. Neither contract contains execution callbacks. The ETL Pipeline public client is the first concrete composition of these surfaces with charts, tables, 3D context and the optional Python evaluator protocol.

## State and revisions

Input revision increments for parameter/scenario changes and imports. Selection, visibility and camera presentation do not invalidate a scientific result, because they do not change its input values. Persisted storage has an independent CAS token; document `revision` must not be mistaken for the complete storage generation.

A grouped slider gesture creates one history entry. Playback creates none. A comparison uses a cloned scenario baseline and candidate parameters, a shared phase, a presentation-camera channel and shared trace coordinates. It never writes edits into the reference. The comparison chart is currently Studio SVG geometry, not D3; the chart semantics are kept separate so a future D3 adapter can replace rendering without moving domain logic into ConceptMotion.

A request carries `requestId`, `clientId`, `scenarioId`, `inputRevision` and the parameter map. The store checks response shape, correlation, latest request identity and current input revision/values. The network coordinator aborts superseded requests and also ignores a late rejection from an older task. Source-backed metrics in a private client are unavailable after editing until a matching Python result arrives.

## Persistence

Source/HTTP mode uses IndexedDB with a get/compare/put in the same read-write transaction. A second writer is a conflict, not silent last-writer-wins. Save status only becomes current when the completed document identity matches the current document. Unmount flushes pending writes; client draft stores also remain in the App's session cache. A before-unload guard covers dirty inactive clients.

The standalone offline HTML is explicitly a memory session, with JSON export for backup. It does not promise IndexedDB portability for `file:` or opaque embedding origins. Clearing a browser origin is not recoverable without an exported file. No collaboration, external backup or durability guarantee is claimed.

## Rendering

- `studio.webgl`: original small GPU mesh renderer. Shader compilation, triangle/line buffers, transforms, simple lighting/projected shadows, camera/picking and lifecycle. Implemented but GPU-unqualified in the delivery environment.
- `studio.canvas3d`: original CPU projection used when WebGL is unavailable. The same geometry, transforms, picking and controls; approximate painter ordering. This is the renderer actually exercised in browser tests.
- SVG plan fallback: face/profile/top mesh projection. Feature edges plus viewpoint silhouettes, stable entity ids and an explicit non-manufacturing caveat.
- Optional Three adapter: external dependency, not a second scientific model. Not qualified by this pass and not the default.
- Renderer loss: a WebGL/context failure exposes the existing SVG/plan fallback and a retry action. Workspace parameters and history stay outside renderer lifecycle.

Geometric framing samples eight cycle phases for a stable viewport. That is **not** a swept-volume or collision proof. Drawing dimensions currently label projected/envelope extents, not certified part manufacturing dimensions. Exported SVG intentionally says mesh projection.

## Python and security boundary

The service binds to loopback, rejects unrelated Host headers and cross-origin writes, requires an explicit request header and JSON, bounds input bytes, rejects duplicate JSON fields/non-finite values, applies Pydantic and per-domain validation, and avoids reflecting rejected values. It has no exec, shell, filesystem-path input or notebook kernel endpoint.

This is a local single-user/trusted-code boundary, not strong multi-tenant authentication or an untrusted-code sandbox. Other local programs can call loopback. Long-running computations need a separate worker/job adapter with time/resource budgets before production use. The current bridge is for bounded reference evaluations. Local CSP still allows inline script/style to support import maps and standalone compositions; do not treat it as a hardened hosted CSP.

## Host portability

ES modules plus an explicit production React bundle make a portable build possible without a bundler or network dependency in this environment. The normal build consumes pinned npm React packages. The source can be hosted by another React application; `examples/next-host.tsx` is a sketch, not a tested Next.js integration.

No public package release, versioned distribution API, React 19 compatibility proof or universal third-party component-host guarantee is claimed yet.