'use client';

import {useMemo, useState} from 'react';
import {ESP32_CLASSIC_REFERENCE, getEsp32ReferencePin} from '../../lib/esp32/pins.mjs';

export function StudioEsp32BoardExplorer({board='esp32:esp32:esp32'}) {
  const [selectedGpio, setSelectedGpio] = useState(2);
  const selectedPin = useMemo(() => getEsp32ReferencePin(selectedGpio), [selectedGpio]);
  const leftPins = ESP32_CLASSIC_REFERENCE.pins.filter((_, index) => index % 2 === 0);
  const rightPins = ESP32_CLASSIC_REFERENCE.pins.filter((_, index) => index % 2 === 1);
  const boardName = board === 'esp32:esp32:esp32' ? 'ESP32 Dev Module' : board === 'esp32:esp32:esp32s3' ? 'ESP32-S3 Dev Module' : board === 'esp32:esp32:esp32c3' ? 'ESP32-C3 Dev Module' : 'ESP32 board';

  return <section className="studio-esp32-explorer" aria-labelledby="studio-esp32-explorer-title">
    <div className="studio-esp32-explorer-heading">
      <div><span className="edu-kicker">ESP32 HARDWARE REFERENCE</span><h3 id="studio-esp32-explorer-title">Board &amp; GPIO explorer</h3><p>{boardName} · pin capability reference</p></div>
      <span className="studio-esp32-voltage">3.3V GPIO</span>
    </div>
    <div className="studio-esp32-caution" role="note"><strong>Check your exact board revision.</strong> {ESP32_CLASSIC_REFERENCE.note} This pin map is a classic ESP32 reference, not an S3/C3 pinout.</div>
    <div className="studio-esp32-explorer-grid">
      <div className="studio-esp32-pin-bank" aria-label="GPIO pin selector, first group">
        {leftPins.map(pin => <button type="button" key={pin.gpio} className={selectedGpio === pin.gpio ? 'active' : ''} aria-pressed={selectedGpio === pin.gpio} onClick={() => setSelectedGpio(pin.gpio)}><span>{pin.gpio}</span><small>{pin.label.replace('GPIO '+pin.gpio, '').replace(/^ · /, '') || 'GPIO'}</small></button>)}
      </div>
      <div className="studio-esp32-chip" aria-label="ESP32 module reference">
        <span className="studio-esp32-chip-mark">ESP32</span><strong>WROOM</strong><small>CLASSIC</small><span className="studio-esp32-chip-foot">GPIO · ADC · UART · SPI · I²C</span>
      </div>
      <div className="studio-esp32-pin-bank" aria-label="GPIO pin selector, second group">
        {rightPins.map(pin => <button type="button" key={pin.gpio} className={selectedGpio === pin.gpio ? 'active' : ''} aria-pressed={selectedGpio === pin.gpio} onClick={() => setSelectedGpio(pin.gpio)}><span>{pin.gpio}</span><small>{pin.label.replace('GPIO '+pin.gpio, '').replace(/^ · /, '') || 'GPIO'}</small></button>)}
      </div>
    </div>
    {selectedPin && <div className="studio-esp32-pin-detail" aria-live="polite">
      <div className="studio-esp32-pin-detail-title"><div><small>SELECTED GPIO</small><h4>{selectedPin.label}</h4></div><span>{selectedPin.group.replace('-', ' ')}</span></div>
      <div className="studio-esp32-capabilities">{selectedPin.capabilities.map(capability => <span key={capability}>{capability}</span>)}</div>
      {selectedPin.restrictions.length > 0 ? <ul>{selectedPin.restrictions.map(item => <li key={item}>{item}</li>)}</ul> : <p>No special restriction is listed in this reference. Check the module datasheet and board schematic before use.</p>}
      {selectedPin.capabilities.includes('ADC2') && <p className="studio-esp32-adc-note">ADC2 note: classic ESP32 ADC2 access is restricted while Wi-Fi is active. Prefer ADC1 pins for analog readings when Wi-Fi is required.</p>}
    </div>}
    <details className="studio-esp32-reserved"><summary>Reserved / unavailable GPIO reference</summary><ul>{ESP32_CLASSIC_REFERENCE.reserved.map(item => <li key={item.label}><strong>{item.label}</strong> — {item.reason}</li>)}</ul></details>
    <p className="studio-help">GPIO is not 5V tolerant. Never connect a 5V signal directly to an ESP32 input. Verify supply current, logic levels, boot strapping and external pull resistors for your actual module.</p>
  </section>;
}
