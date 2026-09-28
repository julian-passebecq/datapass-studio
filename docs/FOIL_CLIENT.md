# Optional private FOIL client

The public repository contains only connector/template code and source integrity pins. The original cases, CAD mesh files, scientific kernel, reference documents and generated private application are excluded.

## Installation and trust

`tools/install_foil.py` accepts the exact reviewed v0.3 ZIP checksum in `integrations/foil-source.lock.json`. It rejects absolute/traversing paths, duplicate members, symbolic links and excessive archive/file sizes. It extracts only the allowed reference/source components to `.private/foil/source` and refuses an existing destination.

Before importing Python, it verifies the original wrapper files and every reference manifest entry. The original kernel is used read-only. The generated UI data and geometry adapter live in `public/private-client`, also gitignored. `--private` is required to include them in a build; `--private-foil` is required to serve that build.

The private ZIP supplied with this delivery has already been installed. It includes its original source package, receipt, private frontend and verified portable React runtime so the user need not upload the ZIP again.

## Scientific boundaries

Nine original R0 cases are retained. The baseline is immutable. The private adapter uses the original 34 allowlisted fields; locked model/source fields are not exposed as inputs. The interactive parts retain the original identifiers and motion group.

Browser kinematics call the original, byte-identical private JS twin and are checked against the original Python function at 17 phases for each of the nine cases: 153 poses. This is numerical conformance of the presentation function, not physical validation.

The unchanged geometry can reuse the supplied reference BRep tessellation. Changing geometry resamples the original private browser geometry recipe. The source label switches to `PARAMETRIC_PREVIEW_NOT_BREP`; no STEP/BRep operation was performed. Transmission and generator objects remain envelopes with unresolved details, not validated engineering parts.

The original conditional L0 computation remains Python. Every baseline API result was compared to that kernel. Modified inputs are validated, evaluated as a local candidate and tied to their input revision. Reference files are not rewritten. No source-truth or cloud operation occurs.

## What is not migrated

This does not port every Streamlit page, all reference reports, budget/BOM editing, cloud queues, the complete study process, fabrication, aerodynamics, loads or collision certification. It concentrates on the 3D/2D laboratory, state continuity, comparisons, provenance and one scientific API connection.

## Publishing

The private offline HTML contains all its embedded reference data; hiding a panel is not access control. Do not share it publicly. The public synthetic demo is the publication-safe example. A later authorized private deployment needs a real authentication/storage design, not merely this loopback server.

The original browser `web/src/kernel.js` is also installed privately, byte-identical and hash-verified. Studio calls only its prescribed-kinematics function for presentation. No scientific formula transcription or original kernel is published in the public repository.
