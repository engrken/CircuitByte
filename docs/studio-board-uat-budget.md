# CircuitByte Studio — controlled board-by-board compiler UAT

**Cost boundary:** No paid Sandbox compiler or provider call is executed just by opening the UAT plan, running `npm test`, or deploying the normal web app. CI currently performs fake-Sandbox isolation/profiles for every supported board and real Arduino Uno educational builds when relevant. This is *not* equivalent to successful cloud compilation for every board, physical upload, working Wi-Fi, GPS fix or GSM network access.

## Board families and pinned toolchains
| Family | Studio targets | Compiler core | First real UAT |
|---|---|---|---|
| AVR | Uno R3, Nano (new/old bootloader), Mega 2560, Leonardo | arduino:avr @ 1.8.6 | One Uno smoke compile; then other variants only if profile/core changes |
| ESP8266 | NodeMCU v2 | esp8266:esp8266 @ 3.1.2 | One minimal Serial + digital GPIO sketch |
| ESP32 | Classic Dev Module, S3, C3 | esp32:esp32 @ 3.3.12 | One classic ESP32 Serial/LED smoke; S3/C3 need separately validated target and upload layout |
| M5Stack | M5Stack Core (ESP32) | esp32:esp32 @ 3.3.12 | One minimal Serial sketch for exact M5 profile; M5Unified requires matching installed libraries |

## Real UAT release gate
1. Verify verified test account, remaining credits, exact board ID and module power constraints. Obtain explicit cost allowance; use the production Sandbox only for the selected, budgeted board test.
2. Limit to **one real cloud compile per selected board per approved session** (stop on first failure; never automatic-retry a toolchain outage). Test the smallest, uncredentialed, low-voltage sketch and the expected artifact type. Stop/cleanup Sandbox whether pass or fail.
3. Record toolchain install time, entire compile latency, exit stage, artifact size/type, any network-dependent install failures and actual Vercel usage/billing. The successful-build-only *student credit* rule does not make a failed Sandbox free to the operator.
4. Inspect extracted build diagnostics; run model-specific UART/GPIO/library acceptance tests in a separately authorized session. Physical flashing, sensors and environmental dependencies remain marked unverified until a real board and tester are present.
5. If a family fails, do **not** change production compiler core automatically. Fix and run local/CI checks first, then ship one controlled compatibility release.
6. Maintain per-family pass/fail evidence and update issue #42. Do not mark the board or library matrix as '100% working' from mocks or the generic source-level test alone.

Current release performs only **read-only/static validation** of existing 10 board profiles, existing mock isolation tests, and existing CircleCI Uno gate; it **does not spend additional Vercel Sandbox or AI Gateway credits** on real cloud compiles.
