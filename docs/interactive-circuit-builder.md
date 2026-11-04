# CircuitByte Circuit Builder — Phase 2

## Scope
- Educational Arduino Uno R3 and solderless breadboard workbench at `/learn/lab/builder`.
- Three synchronized views of **one** immutable project wiring netlist: flat breadboard, CSS perspective, and schematic-style 2D connection map.
- Click/tap endpoints (or use accessible From/To selectors), add/remove components, remove wires, undo one or more edits (up to 20 snapshots).
- Breadboard A–E and F–J groups are modeled as independent five-hole electrical nodes, and the two displayed power rails are separate unless wired.
- Ten curated part types; four example circuits (LED with resistor, pull-up button, analog potentiometer, HC-SR04).
- Browser-local autosave; validated JSON import/export; SVG diagram export.
- Conservative electrical screening: board supply-to-ground shorts, rail conflicts, reversed component supply/ground, missing LED current limiting, sensor supply incompatibility, analog input compatibility, servo power caution, GPIO conflicts.
- Circuit model and test coverage in `lib/studio-circuit-builder.mjs` and `tests/studio-circuit-builder.test.mjs`.

## Important non-features
- The 3D view is a CSS perspective representation of the same 2D netlist, **not** a photorealistic drag-and-drop electronics bench.
- The 2D view is a labeled connection map, **not** an IEC/IEEE standard schematic or a professional netlist export.
- The builder does not simulate voltage, current, arbitrary electronics, sensor protocols, or firmware.
- The tool does not assert a safe current budget, component tolerance, datasheet compliance, or physical build correctness.
- Only Arduino Uno R3 wiring is available in this phase. Other boards belong in a future validated expansion, rather than misleading users about available pin models.

## Checks
`npm test` includes the new pure netlist tests with existing suite. The Vercel `build:vercel` step runs both Lab Phase 1 and Circuit Builder tests before migrations and the Next.js production build.
A CI pass is necessary but not sufficient: verify an actual browser after deployment, especially mobile tap targets, diagram toggles, undo, browser autosave, and JSON/SVG export.

## Cost discipline
This implementation adds no packages or runtime APIs, preserving GitHub Actions/CircleCI and Vercel deployment quotas. Use one reviewed branch and one production deployment, not repeated experiments on live traffic.
