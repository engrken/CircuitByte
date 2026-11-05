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

## Phase 3 — CRUMB-inspired instruments (2026-11-05)
- The same Phase 2 Uno netlist now provides a **bounded, browser-local steady-state DC nodal solver** (`lib/studio-dc-simulator.mjs`) and virtual voltage/current readings. No cloud simulation requests or build credits.
- Supported idealized components: fixed 330 Ω resistor, configurable LDR (100 Ω–1 MΩ), 10 kΩ potentiometer, a binary normally-open switch and a red LED with a simple 2 V threshold / 10 Ω forward-on resistance. The Uno 5 V / 3.3 V / GND terminals are modeled as ideal sources; a user can optionally assume a manual GPIO output HIGH/LOW. GPIO outputs do **not** automatically follow sketch code here.
- Other components (including HC-SR04, TMP36, servo, piezo, RGB LED) are **not** modeled and are treated as disconnected inside this DC solver. Floating nodes display no modeled voltage, direct source conflicts are blocked, and incomplete networks are labelled.
- A probe selection tool now uses the existing breadboard SVG endpoints; the same wiring layout, 2D map, CSS perspective, import/export and static electrical checks remain authoritative for circuit connectivity.
- CircuitByte Studio's separate AVR emulator (`app/studio/avr-emulator-worker.mjs`) accepts the existing **successful Uno HEX** artifact or a local HEX import and runs ATmega328P instructions with MIT-licensed `avr8js@0.21.1` in a browser worker. Supported: D2–D13 output state, basic timer operation, serial TX, and a D2 button input. It does not emulate ESP32/ESP8266 or physical electrical circuits, SPI/I²C modules, peripherals, voltage/current loading, or external sensors. Worker stops at 10 simulated seconds, and simulated time is not guaranteed real time.
- Intel HEX parsing enforces record checksum, EOF, 32 KB flash size and repeated-data consistency, with browser-side tests. Basic passive circuit/nodal/LED examples have deterministic unit tests. Only a successful matching build consumes existing compilation credits; replaying a compiled artifact does not call the compiler.
- **Release verification**: run `npm ci`, `npm test`, `npm run build`, then check the new UI in a real desktop/mobile browser. For the AVR path, compile Uno Blink once and confirm D13 output transitions in the worker; no unverified simulator behavior should be represented as hardware proof.
