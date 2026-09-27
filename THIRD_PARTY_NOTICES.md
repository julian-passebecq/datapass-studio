# Third-party and source notices

Original Studio source is MIT under the repository LICENSE. Private user reference files are not included in that grant.

## React runtime

The normal build uses React and ReactDOM 18.2.0 and their Scheduler dependency, under their upstream MIT licenses. The explicit build closure retains notices and copies the package LICENSE files into `dist/vendor`.

The portable delivery runtime was already supplied by the user in `MS_DEV_MEGA_ARCHIVE_2026-09-12.zip`, inner `08_GITHUB_ACTIONS_ARTIFACTS/AtlasNote_1_0_1_public_build.zip`, `app/vendor/react.mjs`. Its original SHA-256 is `56458da494d6b8da8117909994f1c0c8db7643c9698ed5d464b35bf9a884a96b`. It contains actual React/ReactDOM 18.2.0 production module bodies, not a substitute React implementation. The build adds a named `createRoot` export without changing those bodies. The original licenses and hash manifest accompany the portable ZIP, and the offline HTML embeds their notices.

No font binaries are distributed. The interface uses system fonts. The Studio icon is original source SVG.

## Optional integrations

Three.js 0.160.1 is an optional npm dependency under its own MIT license; the build copies its license only when installed. It is not bundled in the locally tested portable delivery.

The upstream ConceptMotion/Datapass visual-platform repository is referenced and pinned, not copied or relicensed wholesale. Its own source/dependency/artwork terms must be preserved when the real external-consumer integration is performed.

## Private client

The authorized FOIL archive is used locally and verified by byte hashes. It retains its original ownership, reference labels and limitations. Public source contains integration code and integrity pins only, not its cases, scientific kernel or meshes. Do not publish a private build simply because the Studio framework is MIT.
