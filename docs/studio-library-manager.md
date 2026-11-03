# Studio Library Manager

Studio supports searchable access to the Arduino Library Manager catalog, rather than preinstalling every library into each build. Search lives under Libraries & build settings. Results list name, current version, author, advertised architectures and advertised headers. The server reads only Arduino's fixed HTTPS index URL, bounds compressed/decompressed sizes and shares a six-hour in-memory metadata cache. No third-party search service or paid API is added.

Explicit header mappings include LiquidCrystal_I2C.h → LiquidCrystal I2C (Frank de Brabander / John Rickman) and ACS712.h → ACS712 (Rob Tillaart). These identify packages, not a guarantee that every sketch using that header uses the same constructor or functions. LiquidCrystal I2C's index advertises AVR; review non-AVR behavior. Current-sensor calibration and ADC input voltage constraints remain the user's responsibility.

For headers outside the common mappings, Studio looks for exact providesIncludes matches. A single architecture-compatible match is installed; multiple matching packages require a choice in Library Manager. Not every package declares header metadata. Unmatched headers are passed to Arduino CLI, which can find board-core, transitive or imported ZIP headers and report actual missing files. With an attached custom ZIP, automatic unknown-header index lookup is skipped; explicit catalog selections still resolve.

Catalog selections are accepted only if the exact name exists in Arduino's index; arbitrary URLs, CLI flags and Git repositories are not accepted. Selected versions are pinned in the install arguments for that request. Declared transitive dependencies are installed by Arduino CLI. Index refresh and package downloads occur before sandbox networking is disabled for compilation. Library failures are reported without claiming a successful build.

The catalog is broader than any particular board's supported libraries. Private and unindexed packages still use ZIP import, subject to the existing archive size and validation limits. Manual selections are session-only and need reselection after reloading the workspace. No claim is made that every indexed package is buildable within the existing sandbox time/resource limit.

Validation: official index metadata and source syntax reviewed. No tests, cloud compilation, paid inference or deployment attempts were run for this change, as requested. Hardware and runtime UAT remain pending.

Sources:
- https://downloads.arduino.cc/libraries/library_index.json.gz
- https://docs.arduino.cc/arduino-cli/library-specification
- https://docs.arduino.cc/arduino-cli/commands-reference/arduino-cli_lib_search

## Product-linked coverage (2026-11-03)

Reviewed all 101 live products returned by https://circuitbyte.vercel.app/api/products. Studio shows recommendations for selected materials plus a searchable coverage list for the whole store. New, unclassified product IDs display “needs review”; they do not inherit a false compatibility claim. AI drafts receive the same classifications and board-aware default dependencies.

ACS712 (cb-081), Rtc by Makuna (cb-068) and Encoder (cb-045) now resolve automatically from product selection as well as headers. Optional choices include LiquidCrystal I2C for cb-066; U8g2 for cb-019; TinyGSM for cb-061; NewPing for cb-074; MQUnifiedsensor for cb-093 through cb-101; AccelStepper for cb-072/cb-073/cb-080; and Bounce2 for mechanical inputs. DallasTemperature for cb-027 and PulseSensor Playground for cb-040 require confirmation of the actual sensor chip/model. Alternatives install only when chosen or included by the sketch. Choosing LiquidCrystal I2C, U8g2 or AccelStepper suppresses the corresponding default driver unless its header or explicit choice is also present.

No dedicated library is invented for passive parts, wires, tools, regulators, power converters or ordinary GPIO/ADC/PWM modules. ESP boards use their own cores. MQ gas concentration requires model-specific calibration and heater handling; a driver alone does not make measurements accurate.

Package names verified against the official Arduino index. Additional upstream references: https://github.com/miguel5612/MQSensorsLib and https://github.com/thomasfredericks/Bounce2. Source and syntax review only; no runtime tests, paid calls or deployment attempts.
