# Reactive runtime and task model

Datapass Studio deliberately does **not** copy Streamlit's whole-script rerun model. Interactive presentation, derived browser state and authoritative computations have different lifecycles.

## Three execution lanes

```text
user input / client state
        |
        +--> ReactiveGraph ----------> local derived values
        |        |                    charts / labels / scene state
        |        +--> dependency DAG  no network required
        |
        +--> WorkspaceStore ---------> durable app state
        |        |                    undo / redo / revision / persistence
        |
        `--> TaskCoordinator -------> bounded async work
                 |                    Python/API/worker adapter
                 `--> stale guard     old results cannot become current
```

A camera orbit, selection or playback frame stays in the presentation lane. It does not invalidate a scientific result unless a client explicitly declares that dependency.

## ReactiveGraph

`packages/runtime/reactive.js` is DOM-free and has no domain imports. A client owns the dependency graph and its compute functions:

```js
const graph = new ReactiveGraph()
  .defineSource('parameter.gain', 1)
  .defineSource('parameter.damping', .2)
  .defineComputed(
    'metric.effectiveGain',
    ['parameter.gain', 'parameter.damping'],
    (gain, damping) => gain * (1 - damping)
  );

graph.get('metric.effectiveGain');
graph.set('parameter.gain', 1.5);
```

Only invalidated descendants are recomputed. `transaction()` and `patch()` group changes into one notification. `explain(id)` exposes the semantic dependency tree for debugging and future visual explanation.

This graph is an **application-owned in-process DAG**. It is not a notebook kernel, an expression evaluator or a way to execute functions received from JSON.

## TaskCoordinator

`packages/runtime/tasks.js` coordinates trusted handlers registered in source code. It provides:

- one active run per logical key;
- abort on superseding work;
- bounded progress events;
- input revision correlation;
- `ready` versus `stale` result states;
- bounded run history.

A handler receives an `AbortSignal` and a progress callback. The coordinator never evaluates task code from an imported manifest.

```js
const registry = new TaskRegistry().register(
  'evaluate',
  async (input, { signal, report }) => {
    report(.25, 'prepared');
    return api.evaluate(input, { signal });
  }
);

const result = await new TaskCoordinator(registry).run('evaluate', input, {
  key: 'current-evaluation',
  inputRevision: store.getSnapshot().revision,
  isRevisionCurrent: revision => store.getSnapshot().revision === revision
});
```

The existing FOIL/local evaluator path remains authoritative for its domain. The generic coordinator is the reusable scheduling primitive; it does not change the source of truth.

## Declarative app manifest

`datapass.studio.app/1` is an inert description of an app surface:

- numeric parameters;
- views;
- declared task inputs/outputs and policies;
- artifact/entity bindings;
- classification and version.

It intentionally contains **no callbacks, formulas or executable expressions**. A trusted JS client can export the manifest with `manifestFromClient()`. Python can author the same shape with `StudioApp`, `NumberParameter`, `ViewSpec`, `TaskSpec` and `ArtifactBinding`.

The manifest is useful for AI-assisted scaffolding, review, documentation, adapters and future Studio tooling. It is not sufficient by itself to execute a scientific client: domain frame/traces/metrics/evaluator code remains trusted source.

## Session trace

`SessionTrace` records bounded semantic interaction events such as selection, view changes, playback controls, imports, exports and task states.

The default Studio integration deliberately does **not** record parameter values, local document bytes or arbitrary payloads. Trace metadata only accepts scalar values. The exported contract is `datapass.studio.trace/1`.

This enables future explanation, replay assistance and support diagnostics without turning event logging into hidden telemetry. Nothing is transmitted automatically.

## Why this is materially different from Streamlit

The value is not different button styling. The runtime makes high-frequency browser interaction first-class:

- 3D orbit/picking and 2D selection do not rerun Python;
- playback can run at display frequency without a backend round trip;
- only affected derived nodes need recomputation;
- expensive work is explicit, cancellable and revision guarded;
- the same state can drive WebGL, SVG, document references and future D3/ConceptMotion adapters;
- Python remains available for domain authority rather than owning every UI event.

A future convenience API may make this easier to author, but it should compile to these explicit boundaries rather than hide a global rerun loop.
