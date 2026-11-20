'use client';

import { ESP32_CIRCUIT_STARTERS } from '../../lib/esp32/starters.mjs';

export function StudioEsp32CircuitStarters({ board, onSelect, disabled = false }) {
  if (board !== 'esp32:esp32:esp32') {
    return <section className="studio-esp32-starters" aria-label="ESP32 circuit starters">
      <h3>ESP32 circuit starters</h3>
      <p>Starter wiring is currently limited to the classic ESP32 target. S3 and C3 templates will be added only after their board-specific GPIO maps are verified.</p>
    </section>;
  }
  return <section className="studio-esp32-starters" aria-label="ESP32 circuit starters">
    <div className="studio-esp32-starters-heading">
      <span className="edu-kicker">CLASSIC ESP32 · GUIDED CIRCUITS</span>
      <h3>Start with a GPIO experiment</h3>
      <p>Load a beginner circuit into the existing Studio workflow. Review the pin map, wiring checks, code and physical acceptance steps before powering hardware.</p>
    </div>
    <div className="studio-esp32-starter-grid">
      {ESP32_CIRCUIT_STARTERS.map(starter => <article key={starter.id}>
        <div><strong>{starter.title}</strong><small>{starter.level}</small><p>{starter.summary}</p><p><b>Materials:</b> {starter.materials}</p></div>
        <button type="button" disabled={disabled} onClick={() => onSelect(starter.id)}>Load starter into Studio →</button>
      </article>)}
    </div>
    <p className="studio-help">GPIO numbers are logical assignments, not a physical board drawing. Confirm the exact board revision and silkscreen labels before wiring. These starters are not a firmware simulator.</p>
  </section>;
}
