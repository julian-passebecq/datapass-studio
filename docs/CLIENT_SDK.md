# Client SDK and composition

The easiest third client starts with `examples/minimal-client.js`. Copy it into `clients/`, adapt its domain and add an import/entry in `clients/index.js`. No renderer, app shell, slider/history system or storage implementation needs to be copied.

## Source contract

A trusted client source exports:

- stable id/version, title, classification and a finite numeric parameter schema;
- immutable default/scenario parameter maps and a validation function;
- `frame(parameters, phase, view)` producing local mesh coordinates, transforms, units, ids, material colors, parameter links and provenance;
- optional `period(parameters)` plus traces/metrics/explanation presentation.

`view.scenarioId` is passed explicitly for clients whose references differ by scenario. It is session context, not an arbitrary stored expression. Values, not executable functions, are serialized in workspace documents. The TypeScript contract declaration is `packages/runtime/contracts.d.ts`.

The current schema targets numeric scientific/engineering controls and mesh-oriented visual labs. Files, tables, generic dataframes, PDF layouts and arbitrary forms are future capabilities, not implicit support hidden in this interface.

## Renderers and React

`createStudioRenderers()` returns a `RendererRegistry`. A mounted adapter supports `update(frame, presentation)`, `destroy()`, optionally `fit()`, `capture()`, `setCamera()`, diagnostics and screen-point helpers. The shell uses the same lifecycle for GPU and CPU renderers. A consumer can supply its own registry to `SceneViewport`.

React consumers may compose `SceneViewport`, `PlanView`, `TraceChart`, `Timeline`, `MetricStrip`, `Panel`, `Modal` and `PanelBoundary`. The reference app's four modes are examples, not a requirement to embed the entire Studio shell. They are not yet a freely draggable/dockable layout editor.

## Python

`examples/python-client.py` registers a trusted evaluator with the typed `Registry`. The evaluator rechecks its own allowlist/ranges and returns metric objects. The registry adds response correlation and explicit provenance. The UI only calls it after the user requests evaluation.

The same app is viewable offline without Python. This is intentionally different from rerunning a script for camera/selection/timeline events. It does not implement a `st.*` compatible API or magically translate arbitrary existing Streamlit scripts.

## Export and evidence

The shared workspace JSON is a portable state file with a client/version discriminator. JSON Schema assists structural authoring; runtime validation also checks domain values, scenarios and part references. SVG and HTML exports consume the same scene/metric state, not screenshots of unrelated demos.

Studio evidence JSON is **not a DiagramCloud import contract**. It defaults to private/unreviewed and records input revision, parameters, frame, selected entity and any current result. A future reviewed adapter should translate this into DiagramCloud's existing model without inventing verification or execution claims.
