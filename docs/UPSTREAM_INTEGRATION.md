# Existing-platform integration, not a second platform

## Reviewed sources

The review pin is `julian-passebecq/react_ms_fluent_2_framework@30e69639bfc3929c348fd8f9c6c38a2cb61984d8`, workspace `project/conceptmotion_studio`. Its external-consumer guide, Figure registry/controlled playback contract and ConceptMotion product boundary were read. It already owns semantic explanation/core/SVG/React packages, reusable Figure frames and Fluent controls. Those should not be rewritten here.

The separate DiagramCloud GitHub review pin is `4829223814b40b4b10c1b83619b6cae24b4e6607`. This pass did not establish a latest GitLab head. No claim that this GitHub snapshot is the current migrated authority should be inferred.

## Delivery status

The environment could not fetch/install npm packages. Rather than pretend that native controls were Fluent or that a custom animation was ConceptMotion, this pass provides an explicitly original shell and a native SVG chart. It uses a real, hash-verified React runtime already present in the user's artifact archive.

`conceptmotion-host.js` is a dependency-injected integration seam for the upstream FigurePlayer contract. Its `validateFigure` callback must call the actual installed envelope and renderer validators and return an array of issue strings. It is **not wired into the default app or qualified against the installed upstream packages**. The display-only explanation mode currently uses Studio's own scene and code panel. It should become a consumer of the real explanation package in a follow-up.

The analytical-chart renderer is currently SVG. It is not D3, and the code contains no claim otherwise. The optional Three adapter is likewise not locally qualified. The portable build's tested 3D path was the CPU renderer because the managed Chromium instance did not expose WebGL.

## Next integration sequence

1. Check out the pinned visual-platform workspace and follow its actual external-consumer distribution procedure. Reuse the allowed dependency closure and preserve attributions, rather than copying all its apps.
2. Commit the real dependency lock generated in a networked environment. Run its boundary tests, the Studio tests and the external-consumer tests on the installed versions.
3. Replace native shell primitives with the genuine `@datapass/ui` / Fluent controls while preserving screen geometry, input semantics, accessibility and tests. Do not change domain ownership.
4. Mount one real ConceptMotion figure through its existing `FigurePlayer` and registry, driven by an explicit controlled frame. Do not create another semantic trace/core schema here.
5. Add the sibling D3 chart adapter only where it improves the existing SVG chart: keyed transitions, meaningful comparison and brushing. Keep chart semantics independent of ConceptMotion core.
6. Add a reviewed Studio-evidence to DiagramCloud adapter after checking the actual current repository and contract. Never push a foreign schema into that product automatically.

These are uncompleted integration steps, not hidden capabilities of 0.1.
