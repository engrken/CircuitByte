'use client';

import { getEsp32CircuitStarters } from '../../lib/esp32/starters.mjs';

function Esp32WiringDiagram({ starter, board }) {
  const gpio = starter.netlist[0]?.pin || 'GPIO';
  const led = starter.id === 'external-led';
  const family = board === 'esp32:esp32:esp32s3' ? 'ESP32-S3' : board === 'esp32:esp32:esp32c3' ? 'ESP32-C3' : 'Classic ESP32';
  return <figure className="studio-esp32-wiring" aria-labelledby={'wiring-title-' + starter.id}>
    <figcaption id={'wiring-title-' + starter.id}>
      <strong>Conceptual wiring · {gpio}</strong>
      <span> {led ? 'GPIO → series resistor → LED → GND' : 'GPIO → momentary switch → GND'}</span>
    </figcaption>
    <svg viewBox="0 0 620 210" role="img" aria-labelledby={'wiring-svg-title-' + starter.id} aria-describedby={'wiring-svg-desc-' + starter.id}>
      <title id={'wiring-svg-title-' + starter.id}>{starter.title} wiring reference</title>
      <desc id={'wiring-svg-desc-' + starter.id}>{led ? gpio + ' connects through a 220 to 330 ohm resistor to the LED anode. The LED cathode connects to ground.' : gpio + ' connects to one side of a normally open momentary switch. The other side connects to ground. The firmware uses the internal pull-up.'}</desc>
      <rect x="18" y="18" width="584" height="174" rx="13" className="wiring-board"/>
      <text x="38" y="45" className="wiring-kicker">{family.toUpperCase()} · LOGICAL CONNECTIONS</text>
      <rect x="38" y="76" width="116" height="70" rx="8" className="wiring-module"/>
      <text x="96" y="104" textAnchor="middle" className="wiring-module-title">ESP32</text>
      <text x="96" y="125" textAnchor="middle" className="wiring-module-pin">{gpio}</text>
      <path d="M154 99 H218" className="wiring-signal"/>
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
      </> : <>
        <rect x="245" y="77" width="150" height="45" rx="7" className="wiring-part"/>
        <circle cx="268" cy="99" r="5" className="wiring-contact"/>
        <circle cx="370" cy="99" r="5" className="wiring-contact"/>
        <path d="M273 96 L354 77" className="wiring-switch"/>
        <text x="320" y="65" textAnchor="middle" className="wiring-label">Normally open switch</text>
        <path d="M395 99 H520 V150 H96 V146" className="wiring-ground"/>
        <text x="320" y="143" textAnchor="middle" className="wiring-small">Press to connect GPIO to GND</text>
      </>}
      <text x="38" y="173" className="wiring-ground-label">GND · COMMON GROUND</text>
    </svg>
    <p className="studio-esp32-wiring-note">Illustrative signal path only — not to scale and not a physical header pinout. Match the GPIO label to your exact board, check the component pinout and keep all ESP32 GPIO signals at 3.3 V.</p>
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
