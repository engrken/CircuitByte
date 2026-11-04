# CircuitByte Studio Phase 4 — zero-credit compatibility and compiler diagnostics

Implemented without paid Sandbox/AI calls or physical UAT. No additional host or database migration.

## What changed

- New `lib/studio-sketch-preflight.mjs` performs a **conservative static** board/core compatibility review for all 10 existing target IDs, using the selected sketch, include directives and reviewed built-in library registry. It never executes Arduino CLI, downloads packages, uses API tokens or consumes user compile credits.
- Runs in the Code/Compile step before progression, with blockers and advisory notes shown distinctly. The compile endpoint repeats the same static check *after authentication/valid input, before the networked Arduino library index, quota reservation and Sandbox creation*. Known failures return HTTP 422 with `stage:"preflight"`, a structured issue code, and `creditCharged:false`.
- Deterministic known-conflict gates: incompatible ESP8266 vs ESP32 Wi-Fi headers, ESP32 `Servo.h` vs `ESP32Servo.h`, ESP32 `SoftwareSerial.h` vs `HardwareSerial`, unavailable Bluetooth Classic on ESP32-S3/C3 and non-BT boards, AVR-specific UART object availability, and classic ESP32 `GPIO34–39` output-only misuse.
- **Advisory only**, not compile blockers: NodeMCU bootstrapping aliases, ESP32 flash-reserved pins, unresolved user headers (a custom library could provide them), and M5Stack pinout model revision. Users must refer to board/module manufacturer documentation for exact power, logic level, wiring and GPIO validity.
- New `lib/studio-compile-diagnostics.mjs` categorizes existing compilation logs into missing library, invalid identifier, wrong API signature, C/C++ syntax, linker/memory and toolchain outages. Provides the earliest available source line and a bounded, deterministic next action. No code patch is automatically applied, no AI call is made, and the project's existing recovery workflow remains intact.
- Existing Project Success Coach shows specific follow-up actions. A failed toolchain/install is distinguished from a sketch or wiring fault; app does not recommend retrying paid builds blindly.

## Boundaries and safety

- The preflight recognizes **only obvious literal calls and exact header matches**; it deliberately cannot infer complex C++ macros, sketch-generated pins, build-time compiler flags, all hardware revisions, third-party library APIs or custom board-core variants.
- A passing preflight is **not** proof that Arduino compilation will succeed, that the project has usable power distribution, that a real board flashes, that a GPS/GSM module receives a signal or that the prototype works.
- C++ comments and string literals are excluded from pin/API pattern checks to avoid spurious errors. Library headers in comments do not count as includes.
- Existing cloud compile still requires verified auth, an active Student/Hobby period, supported board, safe network-denied Sandbox, library selection and 50-successful-build quota. No adjustment to entitlements, charges, or compiler versions is made.
- No physical or authenticated cloud/UAT runs in this phase, per request. All hardware claims remain pending.

## Tests and release

- Pure Node tests check profile coverage of all 10 boards, mismatched headers, no false positive from comments, classic ESP32 GPIO restrictions, uncertain headers, and specific diagnostics. Existing cloud compiler route tests assert that obvious known mismatches return 422 **before quota reservation and Sandbox launch**.
- Keep the tests in `npm test` (CircleCI web-quality) and the cheap Vercel pre-build test gate; Uno educational compiler CI may skip on unchanged .ino files under the existing impact policy.
- One reviewed PR and one main production deployment after checks pass. Post-release smoke: app /studio, /api/health, /api/studio/capabilities, targeted Vercel runtime errors, no paid AI/Sandbox compiler calls.
- UAT remains postponed: exact ESP32-S3/C3, ESP8266, M5Stack toolchain installation and real hardware function require separately planned, budget-limited tests.
