'use client';

import { getEsp32CircuitStarters } from '../../lib/esp32/starters.mjs';

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
        <button type="button" disabled={disabled} onClick={() => onSelect(starter.id)}>Load starter into Studio →</button>
      </article>)}
    </div>
    <p className="studio-help">GPIO numbers are logical assignments, not a physical board drawing. Confirm the exact board revision, silkscreen labels and onboard peripheral connections before wiring. These starters are not a firmware simulator.</p>
  </section>;
}
