'use client';

import {useMemo, useState} from 'react';
import {ESP32_CLASSIC_REFERENCE, getEsp32ReferencePin} from '../../lib/esp32/pins.mjs';
import {getEsp32BoardProfile} from '../../lib/esp32/board-profiles.mjs';

export function StudioEsp32BoardExplorer({board='esp32:esp32:esp32'}) {
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedGpio, setSelectedGpio] = useState(2);
  const classic = board === 'esp32:esp32:esp32';
  const profileId = classic ? 'classic' : selectedProfile;
  const profile = classic ? ESP32_CLASSIC_REFERENCE : getEsp32BoardProfile(profileId);
  const profileMatches = classic || (profile && profile.boardTarget === board);
  const pins = profileMatches ? profile.pins : [];
  const selectedPin = useMemo(() => pins.find(pin => pin.gpio === Number(selectedGpio)) || pins[0] || null, [pins, selectedGpio]);
  const leftPins = pins.filter((_, index) => index % 2 === 0);
  const rightPins = pins.filter((_, index) => index % 2 === 1);
  const boardName = board === 'esp32:esp32:esp32' ? 'ESP32 Dev Module' : board === 'esp32:esp32:esp32s3' ? 'ESP32-S3 Dev Module' : board === 'esp32:esp32:esp32c3' ? 'ESP32-C3 Dev Module' : 'ESP32 board';
  const options = board === 'esp32:esp32:esp32s3'
    ? [{id:'esp32-s3-devkitc-1-v1.1',name:'Espressif ESP32-S3-DevKitC-1 v1.1'}]
    : board === 'esp32:esp32:esp32c3'
      ? [{id:'esp32-c3-devkitm-1',name:'Espressif ESP32-C3-DevKitM-1'}]
      : [];

  function chooseProfile(id) {
    setSelectedProfile(id);
    const next = id === 'esp32-s3-devkitc-1-v1.1' ? getEsp32BoardProfile(id) : getEsp32BoardProfile(id);
    if (next?.pins?.length) setSelectedGpio(next.pins[0].gpio);
  }

  return <section className="studio-esp32-explorer" aria-labelledby="studio-esp32-explorer-title">
    <div className="studio-esp32-explorer-heading">
      <div><span className="edu-kicker">ESP32 HARDWARE REFERENCE</span><h3 id="studio-esp32-explorer-title">Board &amp; GPIO explorer</h3><p>{boardName} · pin capability reference</p></div>
      <span className="studio-esp32-voltage">3.3V GPIO</span>
    </div>
    {classic ? <div className="studio-esp32-caution" role="note"><strong>Check your exact board revision.</strong> {ESP32_CLASSIC_REFERENCE.note}</div> :
      <div className="studio-esp32-profile-select"><label htmlFor="studio-esp32-physical-board">Physical board model</label><select id="studio-esp32-physical-board" value={profileMatches ? profileId : ''} onChange={event => chooseProfile(event.target.value)}><option value="">Choose an exact supported board…</option>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select><p>The Arduino “Dev Module” target does not identify the physical PCB. A pin map appears only after you select the exact supported reference board.</p></div>}
    {profileMatches ? <>
      <div className="studio-esp32-caution" role="note"><strong>{profile.name}</strong> — {profile.note}</div>
      <div className="studio-esp32-explorer-grid">
        <div className="studio-esp32-pin-bank" aria-label="GPIO pin selector, first group">
          {leftPins.map(pin => <button type="button" key={pin.gpio} className={selectedPin?.gpio === pin.gpio ? 'active' : ''} aria-pressed={selectedPin?.gpio === pin.gpio} onClick={() => setSelectedGpio(pin.gpio)}><span>{pin.gpio}</span><small>{pin.label.replace('GPIO '+pin.gpio, '').replace(/^ · /, '') || 'GPIO'}</small></button>)}
        </div>
        <div className="studio-esp32-chip" aria-label="ESP32 module reference">
          <span className="studio-esp32-chip-mark">{classic ? 'ESP32' : board.includes('s3') ? 'ESP32-S3' : 'ESP32-C3'}</span><strong>{classic ? 'WROOM' : profile.name.split('-').slice(-1)[0]}</strong><small>REFERENCE</small><span className="studio-esp32-chip-foot">GPIO · ADC · UART · peripherals</span>
        </div>
        <div className="studio-esp32-pin-bank" aria-label="GPIO pin selector, second group">
          {rightPins.map(pin => <button type="button" key={pin.gpio} className={selectedPin?.gpio === pin.gpio ? 'active' : ''} aria-pressed={selectedPin?.gpio === pin.gpio} onClick={() => setSelectedGpio(pin.gpio)}><span>{pin.gpio}</span><small>{pin.label.replace('GPIO '+pin.gpio, '').replace(/^ · /, '') || 'GPIO'}</small></button>)}
        </div>
      </div>
      {selectedPin && <div className="studio-esp32-pin-detail" aria-live="polite">
        <div className="studio-esp32-pin-detail-title"><div><small>SELECTED GPIO</small><h4>{selectedPin.label}</h4></div><span>{selectedPin.group.replace('-', ' ')}</span></div>
        <div className="studio-esp32-capabilities">{selectedPin.capabilities.map(capability => <span key={capability}>{capability}</span>)}</div>
        {selectedPin.restrictions.length > 0 ? <ul>{selectedPin.restrictions.map(item => <li key={item}>{item}</li>)}</ul> : <p>No special restriction is listed in this reference. Check the module datasheet and board schematic before use.</p>}
        {classic && selectedPin.capabilities.includes('ADC2') && <p className="studio-esp32-adc-note">ADC2 note: classic ESP32 ADC2 access is restricted while Wi-Fi is active. Prefer ADC1 pins for analog readings when Wi-Fi is required.</p>}
      </div>}
      <details className="studio-esp32-reserved"><summary>Reserved / unavailable GPIO reference</summary><ul>{profile.reserved.map(item => <li key={item.label}><strong>{item.label}</strong> — {item.reason}</li>)}</ul></details>
      {!classic && <p className="studio-help">Official board reference: <a href={profile.source} target="_blank" rel="noreferrer">Espressif hardware guide ↗</a></p>}
    </> : <div className="studio-esp32-not-ready"><strong>No physical-board pin map selected.</strong><p>Choose the exact model above. Other S3/C3 carrier boards can expose different pins, peripherals and onboard connections; this explorer will not guess their header layout.</p></div>}
    <p className="studio-help">GPIO is not 5V tolerant. Never connect a 5V signal directly to an ESP32 input. Verify supply current, logic levels, boot strapping and external pull resistors for your actual module.</p>
  </section>;
}
