'use client';

import { getEsp32CircuitStarters } from '../../lib/esp32/starters.mjs';

function Esp32WiringDiagram({ starter, board }) {
  const gpio = starter.netlist[0]?.pin || 'GPIO';
  const echoGpio = starter.netlist[1]?.pin || 'GPIO';
  const led = starter.id === 'external-led';
  const ultrasonic = starter.id === 'ultrasonic-distance';
  const i2c = starter.id === 'i2c-scanner';
  const family = board === 'esp32:esp32:esp32s3' ? 'ESP32-S3' : board === 'esp32:esp32:esp32c3' ? 'ESP32-C3' : 'Classic ESP32';
  return <figure className="studio-esp32-wiring" aria-labelledby={'wiring-title-' + starter.id}>
    <figcaption id={'wiring-title-' + starter.id}>
      <strong>Conceptual wiring · {gpio}</strong>
      <span> {led ? 'GPIO → series resistor → LED → GND' : ultrasonic ? 'TRIG + divided ECHO · 5 V sensor supply · common GND' : i2c ? 'SDA + SCL · 3.3 V-compatible I²C bus' : 'GPIO → momentary switch → GND'}</span>
    </figcaption>
    <svg viewBox="0 0 620 210" role="img" aria-labelledby={'wiring-svg-title-' + starter.id} aria-describedby={'wiring-svg-desc-' + starter.id}>
      <title id={'wiring-svg-title-' + starter.id}>{starter.title} wiring reference</title>
      <desc id={'wiring-svg-desc-' + starter.id}>{led ? gpio + ' connects through a 220 to 330 ohm resistor to the LED anode. The LED cathode connects to ground.' : ultrasonic ? 'The ESP32 trigger GPIO connects to HC-SR04 TRIG. HC-SR04 ECHO passes through a 1 kilo-ohm and 2 kilo-ohm divider before the ESP32 input. Sensor VCC uses a verified 5 volt supply and all grounds are common.' : i2c ? 'The ESP32 SDA and SCL pins connect to the matching I²C breakout pins. Use 3.3 volt-compatible pull-ups and a verified 3.3 volt supply only when the breakout supports it.' : gpio + ' connects to one side of a normally open momentary switch. The other side connects to ground. The firmware uses the internal pull-up.'}</desc>
      <rect x="18" y="18" width="584" height="174" rx="13" className="wiring-board"/>
      <text x="38" y="45" className="wiring-kicker">{family.toUpperCase()} · LOGICAL CONNECTIONS</text>
      <rect x="38" y="76" width="116" height="70" rx="8" className="wiring-module"/>
      <text x="96" y="104" textAnchor="middle" className="wiring-module-title">ESP32</text>
      {ultrasonic ? <><text x="96" y="113" textAnchor="middle" className="wiring-module-pin">TRIG {gpio}</text><text x="96" y="132" textAnchor="middle" className="wiring-module-pin">ECHO {echoGpio}</text></> : i2c ? <><text x="96" y="113" textAnchor="middle" className="wiring-module-pin">SDA {gpio}</text><text x="96" y="132" textAnchor="middle" className="wiring-module-pin">SCL {echoGpio}</text></> : <text x="96" y="125" textAnchor="middle" className="wiring-module-pin">{gpio}</text>}
      {!ultrasonic && !i2c && <path d="M154 99 H218" className="wiring-signal"/>}
      {led ? <>
        <rect x="218" y="84" width="100" height="30" rx="5" className="wiring-part"/>
        <path d="M232 99 H304" className="wiring-part-line"/>
        <text x="268" y="75" textAnchor="middle" className="wiring-label">220–330 Ω</text>
        <path d="M318 99 H380" className="wiring-signal"/>
        <path d="M380 99 L410 78 L410 120 Z" className="wiring-led"/>
        <path d="M416 76 V122" className="wiring-part-line"/>
        <path d="M416 99 H520 V150 H96 V146" className="wiring-ground"/>
        <text x="399" y="62" textAnchor="middle" className="wiring-label">LED</text>
        <text x="380" y="139" className="wiring-small">Anode (+)</text>
        <text x="428" y="139" className="wiring-small">Cathode (−)</text>
      </> : ultrasonic ? <>
        <rect x="228" y="65" width="164" height="96" rx="8" className="wiring-module"/>
        <text x="310" y="88" textAnchor="middle" className="wiring-module-title">HC-SR04</text>
        <text x="310" y="108" textAnchor="middle" className="wiring-small">TRIG · ECHO</text>
        <text x="310" y="129" textAnchor="middle" className="wiring-small">VCC · GND</text>
        <path d="M154 88 H228" className="wiring-signal"/>
        <text x="190" y="78" textAnchor="middle" className="wiring-small">TRIG</text>
        <path d="M228 120 H410" className="wiring-signal"/>
        <rect x="410" y="105" width="70" height="28" rx="5" className="wiring-part"/>
        <text x="445" y="123" textAnchor="middle" className="wiring-small">1kΩ</text>
        <path d="M392 120 H410 M480 119 H520 V145 H154" className="wiring-signal"/>
        <rect x="410" y="145" width="70" height="24" rx="5" className="wiring-part"/>
        <text x="445" y="161" textAnchor="middle" className="wiring-small">2kΩ</text>
        <path d="M445 133 V145 M445 169 V180 H96 V146" className="wiring-ground"/>
        <text x="445" y="95" textAnchor="middle" className="wiring-label">ECHO divider</text>
        <text x="310" y="52" textAnchor="middle" className="wiring-label">Verified 5 V supply to VCC</text>
        <text x="38" y="188" className="wiring-ground-label">COMMON GND · ESP32 + SENSOR + DIVIDER</text>
      </> : i2c ? <>
        <rect x="245" y="65" width="150" height="96" rx="8" className="wiring-module"/>
        <text x="320" y="88" textAnchor="middle" className="wiring-module-title">I²C MODULE</text>
        <text x="320" y="112" textAnchor="middle" className="wiring-small">SDA · SCL</text>
        <text x="320" y="135" textAnchor="middle" className="wiring-small">VCC · GND</text>
        <path d="M154 88 H245 M154 145 H210 V135 H245" className="wiring-signal"/>
        <text x="195" y="78" textAnchor="middle" className="wiring-small">SDA</text>
        <text x="195" y="161" textAnchor="middle" className="wiring-small">SCL</text>
        <text x="320" y="52" textAnchor="middle" className="wiring-label">3.3 V-compatible pull-ups</text>
        <path d="M320 161 V180 H96 V146" className="wiring-ground"/>
        <text x="38" y="188" className="wiring-ground-label">COMMON GND · ESP32 + I²C MODULE</text>
      </> : <>
        <rect x="245" y="77" width="150" height="45" rx="7" className="wiring-part"/>
        <circle cx="268" cy="99" r="5" className="wiring-contact"/>
        <circle cx="370" cy="99" r="5" className="wiring-contact"/>
        <path d="M273 96 L354 77" className="wiring-switch"/>
        <text x="320" y="65" textAnchor="middle" className="wiring-label">Normally open switch</text>
        <path d="M395 99 H520 V150 H96 V146" className="wiring-ground"/>
        <text x="320" y="143" textAnchor="middle" className="wiring-small">Press to connect GPIO to GND</text>
      </>}
      {!ultrasonic && !i2c && <text x="38" y="173" className="wiring-ground-label">GND · COMMON GROUND</text>}
    </svg>
    <p className="studio-esp32-wiring-note">Illustrative signal path only — not to scale and not a physical header pinout. Match GPIO labels to your exact board. For HC-SR04 modules, use a verified 5 V supply and reduce ECHO to 3.3 V. For I²C modules, use 3.3 V-compatible pull-ups and verify the module supply.</p>
  </figure>;
}

export function StudioEsp32CircuitStarters({ board, onSelect, disabled = false }) {
  const starters = getEsp32CircuitStarters(board);
  if (!starters.length) {
    return <section className="studio-esp32-starters" aria-label="ESP32 circuit starters">
      <h3>ESP32 circuit starters</h3>
      <p>No reviewed starter pin assignments are available for this target yet. Use a supported ESP32 family target and verify the exact board schematic before wiring.</p>
    </section>;
  }
  const family = board === 'esp32:esp32:esp32s3' ? 'ESP32-S3' : board === 'esp32:esp32:esp32c3' ? 'ESP32-C3' : 'Classic ESP32';
  return <section className="studio-esp32-starters" aria-label="ESP32 circuit starters">
    <div className="studio-esp32-starters-heading">
      <span className="edu-kicker">{family.toUpperCase()} · GUIDED CIRCUITS</span>
      <h3>Start with a GPIO experiment</h3>
      <p>Load a beginner circuit into the existing Studio workflow. Review the selected board, wiring checks, code and physical acceptance steps before connecting hardware.</p>
    </div>
    <div className="studio-esp32-starter-grid">
      {starters.map(starter => <article key={starter.id}>
        <div><strong>{starter.title}</strong><small>{starter.level}</small><p>{starter.summary}</p><p><b>Materials:</b> {starter.materials}</p></div>
        <Esp32WiringDiagram starter={starter} board={board} />
        <button type="button" disabled={disabled} onClick={() => onSelect(starter.id)}>Load starter into Studio →</button>
      </article>)}
    </div>
    <p className="studio-help">GPIO numbers are logical assignments, not a physical board drawing. Confirm the exact board revision, silkscreen labels and onboard peripheral connections before wiring. These starters are not a firmware simulator.</p>
  </section>;
}
