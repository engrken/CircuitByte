# CircuitByte Learn / DIY source review — 30 October 2026

## Source inventory (user-provided PDFs)

1. **Simon Monk, _Programming Arduino: Getting Started with Sketches_, 2nd ed. (2016)** — programming progression through basic C, functions, arrays/strings, input/output, built-in library, EEPROM, displays, internet communication and C++ libraries.
2. **Arduino LLC, _Arduino Projects Book_ (2012)** — Starter Kit sequence including Get to Know Your Tools, Color Mixing Lamp, Mood Cue, Light Theremin, Keyboard Instrument, Digital Hourglass, Motorized Pinwheel and other projects.
3. **_Arduino Learning Kit Manual_ (2019)** — twenty-four activities, including LED control, seven-segment, matrix, mini-fire alarm, joystick, tilt, LCD, DHT11, RTC, relay, RFID and shift register.
4. **Rui Santos, _18+ Arduino Projects_, second edition** — projects including ultrasonic parking, PIR, IR remote, RFID, data logging to SD, Bluetooth, GSM and Ethernet/relay.
5. **The uploaded file named _Arduino Projects eBook.pdf_ and the uploaded _18_Arduino_Projects_eBook_Rui_Santos.pdf_** are byte-identical SHA-256 copies, so the latter two count as one reference work.

The sources informed topic selection and gap analysis. CircuitByte educational explanations, flowcharts, connection tables and Arduino sketches were created independently. **No book PDF, publisher artwork, page scans, or substantial copyrighted book passages were added to this repository.**

Important rights distinctions:
- The Arduino Projects Book labels its *text* CC BY-NC-SA 3.0: noncommercial only, attribution and share-alike required. CircuitByte is a storefront and therefore does **not** reproduce/adapt that text.
- The Monk book restricts redistribution and publication of its content and program listings.
- The Santos eBook states that the eBook must not be redistributed, though it permits example code use in individual projects. The CircuitByte additions use **independently authored** code, not copies from the book.
- The 2019 kit manual's reuse rights are not established in the provided document; assume ordinary copyright and avoid copying.

## Gap-to-guide mapping

| Source concept | Existing CircuitByte coverage | Original additions in this branch |
| --- | --- | --- |
| Programming control structures, functions, data and diagnostics | Basic C-style Arduino syntax, PWM, timing | Algorithms/flowcharts, for loops, functions, arrays, serial debugging, EEPROM |
| Digital and analog input, reliable switches | Button + analog basics | Debouncing lesson, joystick directional LED build |
| Displays and bus communication | Part profile for an I²C 16×2 LCD | I²C address scanner lesson, LCD temperature/humidity monitor |
| Environmental sensing and monitoring | Temperature fan, ESP32 room dashboard | Standalone UNO + DHT22 + LCD monitor |
| Sensor data storage | Product profile for microSD adapter | Five-second analog light-level CSV logger with explicit SPI level-shifting safety |
| Visible beginner practice | Blink, traffic lights, buzzer and other builds | Array-driven three-LED scanner |

## Required safety and verification before promotion

1. Confirm actual Catalog IDs and physical variants against product packaging, especially SD adapter voltage regulator **and** signal-level translator.
2. Compile all newly added sketches in Arduino IDE for the chosen boards and listed libraries, and verify no missing dependencies.
3. Bench-test every wiring diagram before treating it as a verified electrical reference.
4. Confirm DHT sensor pinout, LCD backpack compatibility and current sensor readings in Serial Monitor.
5. Confirm the SD CSV reads correctly on a computer after safely powering off before removing the card.
6. Do not present an educational fire/gas sensor build as a certified warning device.
7. Do not publish copies of the reference PDFs or copied illustrations on the storefront.

The code and diagrams are original educational examples, and published project pages disclose their unverified physical-test status.

## Local Arduino CLI verification (recommended before classroom delivery)

The current four new projects received a limited C++ syntax check with test stubs; this is **not** an Arduino AVR core build, dependency test or hardware test. To compile with the real toolchain on a Windows workstation, install the official Arduino CLI and use:

```powershell
arduino-cli core update-index
arduino-cli core install arduino:avr
arduino-cli lib install "DHT sensor library"
arduino-cli lib install "Adafruit Unified Sensor"
arduino-cli lib install "hd44780"
$projects = @('three-led-scanner','joystick-direction-lights','lcd-room-comfort-monitor','micro-sd-light-logger')
foreach ($project in $projects) {
  $temp = Join-Path $env:TEMP ("CircuitByteQA-" + $project)
  New-Item -ItemType Directory -Force -Path $temp | Out-Null
  Copy-Item "public/education/code/$project.ino" "$temp/$project.ino"
  arduino-cli compile --fqbn arduino:avr:uno "$temp"
  if ($LASTEXITCODE -ne 0) { throw "Compilation failed: $project" }
}
```

Run this from the CircuitByte repository root. Check hardware before treating any build as a proven electrical design. GitHub Actions workflow creation was not authorized by the available connector, so no automated hardware compilation workflow has been installed.
