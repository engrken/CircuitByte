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
