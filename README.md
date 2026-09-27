# Datapass Studio

A local-first React **interactive visual lab framework**. Clients own their domain, geometry and evaluator. Studio supplies coordinated views, state, playback, guarded edits, exports and an optional Python bridge.

**0.1.0 - foundation / reference-client pass, 2026-09-27.** This is an implemented vertical slice, not a universal Python UI replacement or a CAD kernel.

## Try the delivered build

The portable ZIP includes `studio-offline.html`: open it in a modern browser without a CDN or installation. This mode is an **in-memory session**; export workspace JSON before closing. It does not run Python.

The separate private FOIL workspace includes the user's authorized reference files and nine cases. Its offline HTML and generated data are private: do not publish that package.

## Run from source

Node 22.12+ and Python 3.12+ are the development targets.

```sh
npm ci
npm run build
python -m pip install -r requirements.txt
python tools/serve.py --directory dist --port 8765
```

Open `http://127.0.0.1:8765`. The loopback server serves the browser app and an explicitly requested Python evaluator. There is no arbitrary code, notebook, shell or SQL execution endpoint.

The genuine `package-lock.json` was produced by the successful first GitHub Actions run, inspected and committed. See `docs/HOSTED_CI.md` for the exact source/run identities. The local portable ZIP additionally carries a hash-verified real React runtime from the user's earlier archive, with its licenses:

```sh
node tools/build.mjs --portable
node tools/standalone.mjs
```

That optional `portable-vendor` directory is not committed to GitHub.

## Implemented

- Three independent public synthetic clients: **Motion Rig**, **Transfer Bench** and **Signal Lab**. The third client is analytical rather than a mechanism, so the shared runtime is exercised outside the FOIL/3D-mechanics shape. Client switches preserve drafts within the session.
- Native WebGL rendering, CPU Canvas 3D fallback and final SVG fallback; orbit, pan, zoom, camera presets, stable-id picking, visibility, ghosting and exploded presentation.
- Shared 3D, face/profile/top SVG views, assembly, parameters, parts table and one playback timeline.
- Five coordinated compositions: Laboratory, orthographic plans, immutable baseline/candidate comparison, **References** and display-only explanation.
- Generic artifact/document bindings: a stable scene entity can point to figures, document regions, images, code or table references. The References workspace synchronizes document items, 3D/2D selection and optional playback phase.
- Session-local PDF/PNG/JPEG/WebP opening for a declared document slot. Local object URLs are not persisted or exported; no private document bytes are added to the public repository.
- Grouped parameter undo/redo, revisioned requests, stale-result rejection, validated JSON imports with review, and explicit provenance.
- DOM-free **ReactiveGraph** for explicit local dependency DAGs, plus a cancellable/revision-aware **TaskCoordinator** for bounded async work. These are client-owned primitives, not a global script-rerun engine.
- Inert `datapass.studio.app/1` manifest with a matching Python authoring helper; it declares parameters/views/tasks/artifact bindings but never serializes callbacks or formulas.
- Privacy-bounded `datapass.studio.trace/1` session trace. Studio records semantic interaction/task/export events without parameter values or document bytes, and exports it only on user action.
- Inert `datapass.studio.layout/1` pane grammar plus React `LayoutHost`: reusable split/grid/tabs/stack composition with bounded validation and trusted slot rendering, without embedding React callbacks in JSON.
- Source-mode IndexedDB storage with optimistic transaction conflict detection and latest-snapshot saves. Offline HTML intentionally uses memory.
- Local workspace JSON, 3D PNG, vector SVG, static HTML report and evidence JSON exports. Evidence can carry inert artifact/document ids, page/source classification and bound entity ids, never the session-local document URL.
- Optional private FOIL adapter: **12 parts, nine R0 cases, 34 fields**. The original verified Python kernel remains the authority for its conditional model calculations.

## FOIL stays a client

No reusable package imports FOIL. Private cases, scientific kernel, meshes and generated private frontend are excluded from GitHub. The installer checks original archive/wrapper/reference hashes before importing Python and refuses silent overwrite.

```sh
python tools/install_foil.py "path/to/foil-streamlit-wind-3d-lcoe_v0.3.0.zip"
node tools/build.mjs --private
python tools/serve.py --directory dist --private-foil
```

The separate delivered private workspace is already installed and built; see its French start guide. Unchanged geometry may use the original reference BRep tessellation. Edited geometry is a **parametric mesh preview, not regenerated STEP/BRep**. Prescribed motion and matching software results do not validate aerodynamic, structural or economic assumptions. Reference files are not rewritten.

## Reusable source boundaries

```text
packages/runtime       contracts, store, playback, reactive DAG, task/trace coordination, validation + registries
packages/scene         transforms, primitives, picking, projected linework
packages/renderers     WebGL / CPU Canvas and SVG chart geometry
packages/react         reusable React view surfaces, artifact/document workspace + generic LayoutHost
apps/studio            one reference workbench composition
clients                independent public domains
python/datapass_app     trusted local evaluators and optional private connector
integrations           donor contracts, optional adapters, source integrity pins
examples               minimal client, reactive/task flow, Python authoring/evaluator, Next.js host sketch
```

These are source entry points, not published npm packages. Next.js is not a core dependency. The example Next.js host is a sketch, not a qualified build.

**DiagramCloud remains separate.** Studio evidence is not automatically accepted by its importer. The existing ConceptMotion/Fluent platform was reviewed and pinned, not cloned. Current shell controls and charts are original native/SVG code, **not Fluent or D3**. Baseline/current trace comparison now has a renderer-neutral use case ready for the future sibling D3 adapter. The ConceptMotion seam and optional Three.js adapter are not wired/qualified as production integrations. Read `docs/UPSTREAM_INTEGRATION.md` before extending them.

## Verification and continuation

```sh
npm test
npm run check
python -m pip install -r requirements-test.txt
python -m pytest tests/python -q
python -m playwright install chromium
python tests/browser/run.py --url http://127.0.0.1:8765
python tests/browser/durability.py --url http://127.0.0.1:8765
```

Executed local evidence: **59 Node tests, 37 Python tests, 18 public and 18 private browser flows, five real HTTP/API checks**, nine original-kernel comparisons and 153 prescribed-pose comparisons. The first hosted CI also passed the public HTTP-browser flow with native WebGL. Physical Windows GPU performance remains unqualified. Later commits require their own successful CI run.

Read `docs/TEST_REPORT.md`, `docs/HOSTED_CI.md`, `docs/ARCHITECTURE.md`, `docs/REACTIVE_RUNTIME.md`, `docs/CLIENT_SDK.md`, `docs/FOIL_CLIENT.md` and `docs/NEXT_PASS.md`. A workflow file alone is not a passing test result.

## Deliberate limits

No Streamlit-compatible API, Jupyter kernel, arbitrary Python execution, draggable/dockable layout editor, CAD solid operations or manufacturing drawings. A bounded declarative layout grammar now exists, but it does not provide live drag/drop authoring. The new reactive graph is an explicit client-owned DAG; it does not execute expressions from documents or emulate a whole-script rerun model. The document/reference pane is implemented, but there is **no PDF extraction/OCR, automatic figure detection or inferred bounding-box pipeline yet**. Canvas painter ordering and projected mesh linework are approximations. No multi-user authentication, cloud persistence, collaboration, public deployment or automatic publication is supplied by this pass.