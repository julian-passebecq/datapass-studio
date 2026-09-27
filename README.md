# Datapass Studio

A local-first, React-based **interactive visual lab framework**. A client owns its domain, geometry and evaluator; Studio supplies coordinated views, state, playback, guarded edits, exports and an optional Python bridge.

**Version 0.1.0 — foundation / reference-client pass, 2026-09-27.** This is not a universal Python UI replacement, a CAD kernel, or an application generator for every kind of dashboard. It is an implemented vertical slice with explicit boundaries.

## Try the delivery

The separately supplied portable ZIP contains `studio-offline.html`. Open that file in a modern browser: it contains the actual React application and its runtime, without a CDN or installation. This mode is **an in-memory session**; export the workspace JSON before closing. It does not run Python.

The separately supplied **private FOIL workspace** adds the user's authorized reference files and nine cases. Do not publish that ZIP, its offline HTML, or its generated `public/private-client` directory.

## Run from this repository

Node 22.12+ and Python 3.12+ are the development targets. The local delivery was tested using Node 22.16 and Python 3.13. A clean online npm/pip installation was not executable in the delivery environment.

```sh
npm install
npm run build
python -m pip install -r requirements.txt
python tools/serve.py --directory dist --port 8765
```

Open `http://127.0.0.1:8765`. The server binds to loopback only. It provides the browser app and a same-origin, explicitly requested Python evaluator. There is no arbitrary code, notebook, shell or SQL execution endpoint.

After reviewing and committing the generated `package-lock.json`, use `npm ci`. **No fabricated dependency lock is included.** The CI workflow resolves dependencies when the lock is absent and preserves the resolved lock for review; this is a known reproducibility gap until that lock is committed.

The source delivery ZIP also includes a verified `portable-vendor` runtime from the user's earlier artifact, with its licenses and byte hashes. That optional directory is not committed in this repository:

```sh
node tools/build.mjs --portable
node tools/standalone.mjs
```

## What works

- Two independent public synthetic clients: **Motion Rig** and **Transfer Bench**. Switching clients preserves their draft state within the app session.
- A native WebGL renderer, a CPU Canvas 3D fallback, and a final SVG projection fallback. Orbit, pan, zoom, camera presets, stable-id picking, visibility, ghosting and exploded presentation use the same scene contract.
- Synchronized 3D, face/profile/top SVG views, part table, parameter inspector and one playback timeline. Viewpoint-dependent silhouettes keep round members visible in drawings.
- Four reference layouts: laboratory, orthographic plans, baseline/candidate comparison and display-only explanations with code excerpts.
- Grouped parameter undo/redo, immutable reference configurations, bounded/import-reviewed JSON, parameter validation, independent playback state and stale-result rejection.
- Source-mode IndexedDB persistence with optimistic transaction conflict detection, a latest-snapshot save queue and visible failure handling. Offline HTML deliberately uses memory, not a fictitious durable save.
- Workspace JSON, 3D PNG, vector SVG projections, a standalone static HTML report, and a provenance-bearing evidence JSON. Exports are local/user-triggered.
- Optional Python registry: handlers are registered by trusted source code, not by uploaded documents. Requests are bounded, typed, correlated to a client/revision and limited to declared parameters.
- An optional **private FOIL adapter** using the supplied v0.3 package's original reference/kernel. It is installed explicitly; public builds never include its data.

## FOIL is a client, not the framework

The reusable packages do not import FOIL, its cases or its scientific model. The private integration owns its 34 fields, 12 parts, nine cases, reference-mesh selection and presentation kinematics. Its LCOE/energy/power computation calls the original verified Python kernel. The browser does not implement a new scientific LCOE model.

The original reference and wrapper hashes are checked before import. An unchanged geometry can display the reference BRep tessellation. An edited geometry is a **parametric mesh preview, not regenerated STEP/BRep**. Neither is a fabrication approval. Prescribed motion is not an aerodynamic, structural or control-system validation. L0 outputs remain conditional screening figures, not experimentally validated wind results.

Install the authorized, pinned v0.3 archive supplied with the conversation:

```sh
python tools/install_foil.py "path/to/foil-streamlit-wind-3d-lcoe_v0.3.0.zip"
node tools/build.mjs --private
node tools/standalone.mjs
python tools/serve.py --directory dist --private-foil
```

Use `--portable --private` for the build when using the supplied portable runtime. The installer rejects a different ZIP hash and refuses to overwrite an existing installation. See `docs/FOIL_CLIENT.md`.

## Code map

```text
packages/runtime       data contracts, store, playback, validation, persistence, registry
packages/scene         transforms, mesh primitives, picking, feature/silhouette linework
packages/renderers     WebGL / CPU Canvas, renderer registry, SVG chart geometry
packages/react         reusable React view surfaces
apps/studio            one reference workbench composition and design language
clients                independent public domains and trusted registrations
python/datapass_app    typed local evaluator registry and optional private connector
tools                  build, standalone packaging, server, schema generation, checks
integrations           pinned donor review and optional adapters
examples               minimal domain, Python evaluator, Next.js host sketch
tests                   Node, Python and browser checks
```

Public entry surfaces are source modules, not published npm packages. Next.js, Vite, a VS Code webview or another React host can compose them. Next.js is not a runtime dependency. See `docs/CLIENT_SDK.md` and `docs/ARCHITECTURE.md`.

## Relationship to existing projects

**DiagramCloud stays a separate explainer/publication product.** Its `Project` schema is not repurposed as a scientific app model. Studio evidence is not automatically compatible with its importer; a reviewed mapping is still required. No DiagramCloud repository or schema was modified.

The existing ConceptMotion/Fluent platform is pinned in `integrations/upstream.lock.json`. Its external consumer contract was reviewed. The portable app does **not** bundle or claim the official Fluent UI controls, the ConceptMotion player, Monaco or a D3 analytical SDK. The current UI controls and SVG charts are original. `conceptmotion-host.js` is an integration seam, and `three-adapter.js` is an optional unqualified Three.js implementation. Neither is represented as tested production integration. See `docs/UPSTREAM_INTEGRATION.md` before expanding these.

## Verify

```sh
npm test
npm run check
python -m pip install -r requirements-test.txt
python -m pytest tests/python -q
python -m playwright install chromium
python tools/smoke_http.py --url http://127.0.0.1:8765
python tests/browser/run.py --url http://127.0.0.1:8765
```

For the isolated portable UI check:

```sh
node tools/standalone.mjs
python tests/browser/run.py --html dist/studio-offline.html
```

The browser runner accepts `--executable /path/to/chromium`. Private checks run only when the authorized reference is installed. `docs/TEST_REPORT.md` distinguishes executed local evidence from pending HTTP, GPU and hosted CI qualification.

## Deliberate limits

This pass does not implement a Jupyter kernel, Streamlit API compatibility, arbitrary Python cell execution, a generic dependency DAG scheduler, a full pane/layout editor, a PDF extraction workspace, CAD solid operations or manufacturing drawings. The Canvas fallback uses approximate painter ordering. The SVG exporter is mesh linework, not a complete CAD hidden-line engine. There is no multi-user authentication, cloud persistence, collaboration, public deployment or automatic publication.
