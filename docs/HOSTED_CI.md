# Hosted CI evidence

The first public GitHub Actions run completed successfully on **2026-09-27**.

- Source commit: `0d3074c99c0b8284d09b6b1c6c23c5e7ad294332`.
- Workflow: `Studio public gate`, run `36336512701`, job `108668277551`.
- Artifact: `10937436855`, `studio-public-gate`.
- Artifact ZIP SHA-256: `bb84a2d6871dee8df7f9ec03072161a3ee2ef099507e475b39f83ce4243df9f6`.
- Actions page: https://github.com/julian-passebecq/datapass-studio/actions/runs/36336512701

The downloaded artifact was inspected: the production browser report records
**18 passing HTTP-browser flows** and `renderer: native-webgl`. Clean Node/Python
dependency installation, Node tests, Python public tests, builds, isolated UI
checks and the production HTTP/API gate all completed successfully.

The browser launcher requests ANGLE/SwiftShader. This verifies the implemented
WebGL API path in CI; it does not establish physical GPU/Windows performance.
The original private FOIL package is not uploaded to CI.

## Genuine dependency lock

`package-lock.json` is the exact lock produced by that successful hosted run.
Its reviewed dependency list contains React/ReactDOM 18.2.0, Scheduler 0.23.2,
loose-envify 1.4.0, js-tokens 4.0.0 and optional Three.js 0.160.1. Every resolved
package uses the npm registry with an integrity hash. No credentials or private
URLs occur in the file. Following commits use `npm ci`, not floating resolution.

## Follow-up durability gate

`tests/browser/durability.py` adds actual same-origin IndexedDB checks for reload
restoring parameter/view/selection state and a second tab being refused after
its expected storage generation becomes stale. These execute only in the real
HTTP gate, not the memory-only portable HTML tests. Inspect the Actions result
for the exact follow-up commit before claiming these additional checks passed.
