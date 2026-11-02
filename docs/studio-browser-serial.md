# Studio browser hardware support

Updated November 2, 2026. Implementation is available for owner-led UAT; physical-device success is not claimed.

| Target | Browser uploader | Firmware |
| --- | --- | --- |
| Uno R3 ATmega328P | STK500v1, 115200 baud | Intel HEX; 32,256-byte application limit |
| Classic Nano ATmega328P | STK500v1, 115200 baud | Intel HEX; 30,720-byte application limit |
| Classic Nano old bootloader | STK500v1, 57600 baud | Intel HEX; 30,720-byte application limit |
| ESP8266 NodeMCU | Espressif esptool-js | Matching complete BIN / offset 0 |
| ESP32, ESP32-S3, ESP32-C3 | Espressif esptool-js | Core-produced merged image or explicitly addressed matching BIN files |
| M5Stack Core ESP32 | Espressif esptool-js | Same ESP32 chip family; owner must confirm model/revision |
| Mega 2560, Leonardo | Arduino IDE upload | Browser bootloader protocols not implemented |

All ten listed targets retain code generation, compilation, wiring guides and optional AI illustrations. This does not mean every board supports the same browser upload protocol or arbitrary firmware simulation.

Use HTTPS and a desktop Web Serial browser such as Chrome or Edge. Phone/tablet users can edit, view diagrams and shop; USB depends on actual browser support. Ports require a user gesture and explicit device permission. Upload requires separate overwrite consent. AVR upload checks the MCU signature and readback; ESP upload detects the chip family, checks flash capacity, rejects overlapping sectors and verifies transfer MD5. No automatic full-chip erase is requested. A merged image still overwrites every region it contains, including possible stored data.

ESP32 core 3.3.12 emits a merged image padded to the configured flash size. The server transports that image using gzip/base64, keeping the exact bytes and its offset; the browser decompresses before writing or downloading. If no merged image is available, application-only downloads remain explicitly labelled. Imported firmware offsets must come from the matching build upload command.

## Illustrated wiring guides

The free SVG is generated directly from connection data. Drawn board terminals are symbolic, not a physical pinout. AI illustration uses an on-demand server-side AI Gateway image request, with verified sign-in, the existing UAT gate, same-origin validation and the shared 30-request AI allowance. One quota unit is reserved before the provider call; no automatic retries are made. No sketch or credentials are sent to the image provider. Generated images remain in page memory and can be downloaded; they are not automatically published to public Blob storage.

Model default: google/gemini-3.1-flash-image, discovered from the Gateway model catalog. STUDIO_DIAGRAM_MODEL can override this with a compatible multimodal image model. Generated labels and placement must be checked against the connection table and manufacturer datasheets. Output is an illustration, not a verified electrical schematic.

## Release validation scope

At the owner's request, no test suite, browser walkthrough, paid image request or physical flashing run was performed for this update. Source syntax review and the required deployment build are separate from UAT. The release commit skips CI jobs to conserve resources.
