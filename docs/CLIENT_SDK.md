# Client SDK and composition

The easiest third client starts with `examples/minimal-client.js`. Copy it into `clients/`, adapt its domain and add an import/entry in `clients/index.js`. No renderer, app shell, slider/history system or storage implementation needs to be copied.

## Source contract

A trusted client source exports:

- stable id/version, title, classification and a finite numeric parameter schema;
- immutable default/scenario parameter maps and a validation function;
- `frame(parameters, phase, view)` producing local mesh coordinates, transforms, units, ids, material colors, parameter links and provenance;
- optional `period(parameters)` plus traces/metrics/explanation presentation;
- optional `artifactCatalog` linking stable scene entities to inert figures, document regions, images, code or table references. A catalog never executes document content and never makes a source scientifically authoritative.

`view.scenarioId` is passed explicitly for clients whose references differ by scenario. It is session context, not an arbitrary stored expression. Values, not executable functions, are serialized in workspace documents. The TypeScript contract declaration is `packages/runtime/contracts.d.ts`.

The numeric parameter/scene contract still targets scientific and engineering visual labs. A generic artifact layer is now implemented on top: clients can describe documents and references without coupling the runtime to FOIL. Studio can bind PDF/image sources opened locally for the current browser session to those artifacts. It does **not** yet parse/OCR PDFs, infer figure coordinates, execute notebook cells, model generic dataframes or provide arbitrary form schemas.

## Artifact and document bindings

A client can add a bounded, serializable catalog:

```js
artifactCatalog: {
  documents: [{
    id: 'design-note', title: 'Design note', mime: 'application/pdf',
    sourceKind: 'user-reference'
  }],
  artifacts: [{
    id: 'payload-figure', title: 'Payload figure', kind: 'figure',
    documentId: 'design-note', page: 1,
    entityIds: ['payload'], phase: .25,
    region: [.1, .2, .7, .3], preview: {plane: 'side'},
    sourceKind: 'user-reference'
  }]
}
```

The same stable entity id can therefore connect the 3D renderer, all 2D projections, a parts row and a document/figure reference. Selecting either side updates the other. A client may provide a same-site static document URL, or the user may open a PDF/PNG/JPEG/WebP into the browser session. Session-local object URLs are never serialized into the workspace or Studio evidence export.

Supported artifact kinds in this pass are `figure`, `document-region`, `image`, `code` and `table`. The current UI renders PDF/image sources directly and provides an inert structured fallback for other references. Page/region metadata is authored by the client or user workflow; Studio does not guess it.

## Renderers and React

`createStudioRenderers()` returns a `RendererRegistry`. A mounted adapter supports `update(frame, presentation)`, `destroy()`, optionally `fit()`, `capture()`, `setCamera()`, diagnostics and screen-point helpers. The shell uses the same lifecycle for GPU and CPU renderers. A consumer can supply its own registry to `SceneViewport`.

React consumers may compose `SceneViewport`, `PlanView`, `TraceChart`, `ComparisonTraceChart`, `Timeline`, `MetricStrip`, `ArtifactWorkspace`, `Panel`, `Modal` and `PanelBoundary`. The reference app's five modes (3D lab, plans, comparison, references, explanation) are example compositions, not a requirement to embed the entire Studio shell. They are not yet a freely draggable/dockable layout editor.

## Reactive derivation and async tasks

Use `ReactiveGraph` when a client has local derived values that should update only when their declared inputs change. Use `TaskRegistry` + `TaskCoordinator` when work is asynchronous, expensive or authoritative and must be cancellable/revision guarded. They are independent of React and of any client domain. See `docs/REACTIVE_RUNTIME.md` and `examples/reactive-runtime.js`.

The graph stores trusted compute functions in source code. Imported JSON never supplies executable expressions. A view/camera/playback change should stay out of a scientific task unless the client explicitly models it as an input.

## Declarative app manifest

`manifestFromClient(client)` projects a trusted executable client into the inert `datapass.studio.app/1` contract. The manifest describes numeric parameters, views, task IO/policy and artifact bindings. It intentionally omits `frame`, `metrics`, `traces` and all callbacks.

Python can author the same inert contract:

```py
from datapass_app import StudioApp, NumberParameter, ViewSpec, TaskSpec

app = (
    StudioApp("demo-app", "Demo")
    .parameter(NumberParameter("gain", "Gain", 1.0, 0.2, 3.0, 0.05, "x"))
    .view(ViewSpec("lab", "Laboratory", "lab"))
    .task(TaskSpec("evaluate", "Evaluate", ("parameter.gain",), ("metrics",)))
)
print(app.dumps())
```

This is an authoring/review/scaffolding format, not an execution bundle. Domain code and evaluator registrations remain trusted source.

## Python

`examples/python-client.py` registers a trusted evaluator with the typed `Registry`. The evaluator rechecks its own allowlist/ranges and returns metric objects. The registry adds response correlation and explicit provenance. The UI only calls it after the user requests evaluation.

The same app is viewable offline without Python. This is intentionally different from rerunning a script for camera/selection/timeline events. `examples/python-authoring.py` shows the separate inert authoring API. It does not implement a `st.*` compatible API or magically translate arbitrary existing Streamlit scripts.

## Export and evidence

The shared workspace JSON is a portable state file with a client/version discriminator. JSON Schema assists structural authoring; runtime validation also checks domain values, scenarios and part references. SVG and HTML exports consume the same scene/metric state, not screenshots of unrelated demos.

Studio evidence JSON is **not a DiagramCloud import contract**. It defaults to private/unreviewed and records input revision, parameters, frame, selected entity, matching artifact bindings and any current result. A future reviewed adapter should translate this into DiagramCloud's existing model without inventing verification or execution claims.