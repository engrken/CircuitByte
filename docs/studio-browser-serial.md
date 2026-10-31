# CircuitByte Studio: Browser USB Serial and Firmware Upload Beta

## What is implemented

The Studio workbench at `/studio` offers client-side, user-permission-based Web Serial hardware tools independent of SaaS subscriptions:

- `Connect / Choose USB port` invokes `navigator.serial.requestPort()` directly from a user click, and `Refresh permitted ports` calls `getPorts()`. No hidden probing or automatic device permission; browsers expose only ports the origin has permission for.
- USB VID/PID hints for Arduino USB, WCH CH340/CH341/CH910x, CP210x, and FTDI. **VID/PID does not prove the MCU, exact board or installed bootloader.** The hardware identity must be confirmed by the person.
- A Web Serial monitor at selectable 9600/19200/38400/57600/115200 baud with incoming text, editable send text, line endings and clear/disconnect actions. Monitor and uploading never own the same port at the same time.
- Experimental Arduino UNO R3 (ATmega328P/Optiboot, 115200-baud STK500v1) firmware upload using a user-supplied Intel HEX file or a compiled artifact returned by the existing admin-only compiler.
- Strict HEX checksum, record length, EOF and 32,256-byte application flash bounds checks; chip signature must equal ATmega328P `1E 95 0F`, programming uses 128-byte pages with byte-for-byte readback verification.
- User must select a port and separately check an explicit authorization/warning box before overwriting any board firmware. No background uploads.
- `/api/studio/compile` now attempts to include a `.ino.hex` artifact when an **admin-authorized and explicitly enabled** isolated Arduino CLI build succeeds. Production compiler remains disabled by default; this change does **not** enable paid compute or remove authentication.

## Browser and hardware limitations

The Web Serial API requires HTTPS (or a secure context), browser support and a direct user permission prompt. Chromium desktop browsers are a primary target. Some Android browsers and Android USB/OTG configurations expose serial devices but this is not universal. Safari/iOS, many in-app browsers and environments without Web Serial must use code/HEX downloads and a desktop Arduino IDE.

USB serial is not the same thing as WebUSB. A generic USB-to-serial VID/PID (including CH340) alone cannot identify the device behind it. A serial monitor will not automatically discover which sketch or pinout is installed.

The first uploader only supports **UNO R3 / ATmega328P running compatible Optiboot at 115200 baud**. It intentionally refuses incorrect MCU signatures; Leonardo, Mega, ESP32, native-USB variants, Arduino UNO R4, older Nano bootloaders and other targets are unsupported until separately implemented and tested. This is not a universal Arduino board compiler or device manager.

Bootloader reset timing and USB bridge DTR behavior vary. The USB serial port must not be open in the native Arduino IDE or another terminal. Disconnect other devices, ensure a data-capable cable and choose a supported browser. Uploading overwrites the existing sketch; verify electronics power and safe physical wiring first.

## What is and is not verified

- New `tests/studio-serial.test.mjs` unit tests simulate the UNO bootloader using a mock serial port, including sync, MCU signature, write, readback, checksum and failure paths.
- CI and Vercel build check JavaScript and server routes.
- **No real USB Arduino UNO board is attached to this assistant environment.** Actual physical upload, DTR reset timing, CH340 driver behavior, Windows COM port selection and Android/OTG compatibility must be bench-tested on target hardware before promoting the uploader from experimental to validated.
- Existing CircleCI Arduino CLI compilation tests verify existing examples; they do not automatically verify the new on-demand sandbox endpoint or hardware upload.
- Cloud compilation and AI drafting remain restricted to CircuitByte administrators and disabled unless explicitly enabled. Neither subscription payments nor unlimited compilation is enabled.

## Future Arduino IDE parity

1. Bench-test UNO R3 and clone bridges on Windows and Android where supported, publish a compatibility matrix.
2. Package a pinned Arduino CLI sandbox image with installed toolchains and a quota-guarded queue for paid cloud compiles.
3. Offer explicit board/FQBN selection, library management, syntax diagnostics and persistent project accounts.
4. Introduce separate, hardware-tested upload protocols per board family, direct serial-plotting UI and firmware artifacts with expiry/permissions.
5. Provide a signed, opt-in local desktop bridge for browsers and boards inaccessible through native Web Serial.

No changes to CLEAR System, existing CircuitByte marketplace pricing, financial collections, stock or subscriber billing.
