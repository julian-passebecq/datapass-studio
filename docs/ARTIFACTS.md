# Artifact and document workspace

Status: implemented reference-pane foundation, 2026-09-27.

## Why it exists

Studio should not require every client to rebuild a custom relationship between a 3D object, its 2D projection and the document/figure that explains it. The artifact contract adds that relationship without turning the runtime into a PDF parser or coupling it to FOIL.

```text
stable entity id
   |   | +--> 3D mesh / picking
   | +--> face / profile / top projection
   | +--> parts table / inspector
   |
   `----> artifact reference
             |
             +--> document id
             +--> page
             +--> optional normalized region
             +--> optional playback phase
             `--> source classification
```

## Portable contract

`packages/runtime/artifacts.js` owns the DOM-free validation and lookups.

Documents describe only bounded metadata:

- stable `id` and human `title`;
- MIME type from the supported allowlist;
- source kind: `synthetic`, `private-reference`, `user-reference` or `derived`;
- optional page count and source label;
- optional same-site static URL.

Artifacts describe:

- `figure`, `document-region`, `image`, `code` or `table`;
- one or more stable scene `entityIds`;
- optional document/page/normalized region;
- optional phase for timeline synchronization;
- optional orthographic preview plane;
- explicit source classification.

Validation rejects duplicate ids, unknown documents, unknown scene entities, unsafe URLs, invalid page/region/phase values and oversized catalogs.

## React composition

`ArtifactWorkspace` is a reusable composition, not a FOIL component.

The reference app exposes it as **References**:

1. left pane: linked artifacts;
2. center: source/document surface;
3. right pane: semantic binding, linked entities and 2D preview.

Selecting an artifact can select its model entity and seek the shared timeline. A 3D/2D selection can select the first matching artifact. The selection bar exposes a direct **N ref.** action when the current entity has links.

## Session-local documents

A declared document slot can receive a user-selected PDF/PNG/JPEG/WebP. The browser creates an object URL only for the current session.

Safety/ownership rules:

- 32 MiB per opened local source in this pass;
- MIME allowlist;
- no filesystem path enters the document model;
- object URLs are revoked on replace/unmount;
- object URLs are not written to IndexedDB;
- object URLs are not emitted by evidence JSON;
- the public repository does not receive the user's document bytes.

A same-site static URL may instead be authored by a trusted client package. External URLs and executable schemes are rejected by the pure artifact validator.

## Evidence boundary

Studio evidence may include `artifactBindings`:

```json
{
  "artifactId": "payload-figure",
  "title": "Payload figure",
  "kind": "figure",
  "entityIds": ["payload"],
  "document": {
    "id": "lab-note",
    "title": "Local lab note",
    "sourceKind": "user-reference"
  },
  "page": 1,
  "sourceKind": "user-reference"
}
```

This is linkage metadata, not a verification claim. The exported projection intentionally excludes local URLs and binary content.

DiagramCloud remains a separate product and schema. A future adapter can review/translate Studio evidence into DiagramCloud observations/evidence; Studio does not write foreign documents automatically.

## What is deliberately not implemented

- OCR or PDF text extraction;
- automatic figure/table detection;
- inferred bounding boxes;
- PDF.js-native annotation/editing;
- arbitrary HTML/JavaScript documents;
- notebook/code execution from an artifact;
- trust promotion from "linked" to "verified";
- persistent local file handles or cloud synchronization.

Those capabilities should be introduced as adapters around this stable binding contract when a real client task requires them.
