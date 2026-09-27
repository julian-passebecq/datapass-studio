# Executed evidence and qualification limits

Date: 2026-09-27. This table records the local checks. The successful hosted public HTTP/WebGL run is recorded separately in `HOSTED_CI.md`; do not confuse its graphics backend with physical Windows GPU qualification.

| Check | Executed result |
|---|---|
| Node built-in test runner | **59 passed**, 0 failed |
| JS syntax, package-boundary and generated-schema drift checks | Passed |
| Python pytest | **37 passed**, including 11 installed-private checks; public-only runs skip private fixtures |
| Original FOIL API result comparisons | All nine R0 cases matched the original kernel result |
| Private candidate/source immutability | Passed |
| Browser/Python prescribed-pose comparison | 153 poses, all numeric fields within the declared tolerance |
| Public browser functional flows | **18 passed**, 0 failed |
| Private FOIL browser functional flows | **18 passed**, 0 failed |
| Live loopback HTTP/API smoke | **5 passed**: health, static app/security headers, real evaluator/correlation, explicit-write and origin guards |
| Public and private portable builds | Built successfully with verified actual React runtime |

The HTTP smoke used a real Uvicorn process and urllib requests, not a mocked HTTP transport. It does not establish browser navigation or IndexedDB behavior.

Machine-readable reports: `qa/http-api-report.json`, `qa/browser-report.json`, local private `qa/private-browser-report.json`, and the delivery QA files. The public browser report records the renderer and execution mode. Screenshots were taken from the running application, not image-generated mockups.

## What the browser tests actually exercised

Real production modules and React run inside the delivered standalone HTML through Playwright `set_content`. The environment's managed browser blocked URL navigation and exposed no WebGL context. Tests therefore used the implemented **Canvas 3D CPU fallback**, not fake WebGL or a hand-drawn screenshot.

The tests cover mesh rendering, triangle ray picking, parameter edits, undo/redo, orbit, shared selection/phase in three plans, keyboard selection, comparison-camera synchronization, code/explanation composition, exported JSON/SVG payloads, invalid and reviewed imports, the explicit offline Python boundary, a second client and retained drafts, reduced motion, narrow layouts and absence of JavaScript errors.

Export intent is instrumented to retain the actual generated Blob/data payload rather than attempting an OS download from the restricted test context. This verifies export content generation, not browser download behavior. The offline app deliberately uses a memory session; it does not fake a successful IndexedDB save.

## Not yet qualified

- Public internet deployment and target Windows browser behavior. The initial hosted CI did pass production HTTP navigation; follow-up tests explicitly check IndexedDB reload and two-tab CAS (consult the exact latest Actions run).
- Physical GPU/driver performance, actual Three.js integration or a 60fps guarantee. Native WebGL passed in hosted Chromium using the requested software graphics backend.
- Private-source hosted testing: private files are deliberately absent from GitHub. The public npm/pip installation passed and the genuine generated npm lock is now committed.
- Actual upstream Fluent/ConceptMotion integration, D3 implementation or Next.js host build.
- Operating-system downloads, desktop PowerPoint/PDF export or complete accessibility certification.
- Physical/aerodynamic/structural/financial validity of FOIL assumptions. Numerical software conformance does not establish those claims.

The first hosted run completed successfully; see `HOSTED_CI.md` for its exact commit, run and artifact identities. Later changes need their own successful run. A green workflow is not a claim of scientific validity, physical GPU performance or a production security audit.
