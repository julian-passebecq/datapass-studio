# Architecture and decision record

## Scope

Studio 0.1 is a visual-lab framework extracted through working clients, not an attempted rewrite of all the user's apps. The app root provides four deliberate compositions. The library boundary is React plus portable data/renderer contracts, not Next.js or the FOIL domain.

## Ownership

| Owner | Owns | Does not own |
|---|---|---|
| Client source | Parameter schema, domain validation, scene entities, prescribed pose, metrics/trace presentation, scenario references | Studio storage or other client domains |
| WorkspaceStore | Parameters, selected entity, visibility, view settings, bounded parameter/scenario history, input revision, evaluator status | GPU buffers, animation clock, scientific authority |
| PlaybackStore | Phase, speed, period, reduced-motion policy | Persistent document revision or Python calls |
| Renderer adapter | Mount/update/destroy, draw resources, picking, viewport camera, capture | Domain computation, durable storage |
| Python registry | Trusted bounded evaluators, server validation, authoritative calculation results | Arbitrary client code from JSON, untrusted plugin installation |
| Reference shell | Composition, control presentation, explicit review/import/export actions | A cloud runtime or CAD kernel |

An entity id persists across 3D, SVG plans, the parts table and inspectors. Render meshes carry local triangle coordinates plus column-major transforms, units and source labels. Canonical documents do not serialize DOM, React nodes, GPU objects or functions.

## State and revisions

Input revision increments for parameter/scenario changes and imports. Selection, visibility and camera presentation do not invalidate a scientific result, because they do not change its input values. Persisted storage has an independent CAS token; document `revision` must not be mistaken for the complete storage generation.

A grouped slider gesture creates one history entry. Playback creates none. A comparison uses a cloned scenario baseline and candidate parameters, a shared phase, and a presentation-camera channel. It never writes edits into the reference.

A request carries `requestId`, `clientId`, `scenarioId`, `inputRevision` and the parameter map. The store checks response shape, correlation, latest request identity and current input revision/values. The network coordinator aborts superseded requests and also ignores a late rejection from an older task. Source-backed metrics in a private client are unavailable after editing until a matching Python result arrives.

## Persistence

Source/HTTP mode uses IndexedDB with a get/compare/put in the same read-write transaction. A second writer is a conflict, not silent last-writer-wins. Save status only becomes current when the completed document identity matches the current document. Unmount flushes pending writes; client draft stores also remain in the App's session cache. A before-unload guard covers dirty inactive clients.

The standalone offline HTML is explicitly a memory session, with JSON export for backup. It does not promise IndexedDB portability for `file:` or opaque embedding origins. Clearing a browser origin is not recoverable without an exported file. No collaboration, external backup or durability guarantee is claimed.

## Rendering

- `studio.webgl`: original small GPU mesh renderer. Shader compilation, triangle/line buffers, transforms, simple lighting/projected shadows, camera/picking and lifecycle. Implemented but GPU-unqualified in the delivery environment.
- `studio.canvas3d`: original CPU projection used when WebGL is unavailable. The same geometry, transforms, picking and controls; approximate painter ordering. This is the renderer actually exercised in browser tests.
- SVG plan fallback: face/profile/top mesh projection. Feature edges plus viewpoint silhouettes, stable entity ids and an explicit non-manufacturing caveat.
- Optional Three adapter: external dependency, not a second scientific model. Not qualified by this pass and not the default.

Geometric framing samples eight cycle phases for a stable viewport. That is **not** a swept-volume or collision proof. Drawing dimensions currently label projected/envelope extents, not certified part manufacturing dimensions. Exported SVG intentionally says mesh projection.

## Python and security boundary

The service binds to loopback, rejects unrelated Host headers and cross-origin writes, requires an explicit request header and JSON, bounds input bytes, rejects duplicate JSON fields/non-finite values, applies Pydantic and per-domain validation, and avoids reflecting rejected values. It has no exec, shell, filesystem-path input or notebook kernel endpoint.

This is a local single-user/trusted-code boundary, not strong multi-tenant authentication or an untrusted-code sandbox. Other local programs can call loopback. Long-running computations need a separate worker/job adapter with time/resource budgets before production use. The current bridge is for bounded reference evaluations. Local CSP still allows inline script/style to support import maps and standalone compositions; do not treat it as a hardened hosted CSP.

## Host portability

ES modules plus an explicit production React bundle make a portable build possible without a bundler or network dependency in this environment. The normal build consumes pinned npm React packages. The source can be hosted by another React application; `examples/next-host.tsx` is a sketch, not a tested Next.js integration.

No public package release, versioned distribution API, React 19 compatibility proof or universal third-party component-host guarantee is claimed yet.
