'use client';

import { useState } from 'react';
import { modelEsp32LedOutput, modelEsp32PullupButton } from '../../lib/esp32/experiment.mjs';

export function StudioEsp32Experiment({ board }) {
  const [ledHigh, setLedHigh] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  if (board !== 'esp32:esp32:esp32') {
    return <section className="studio-esp32-experiment" aria-label="ESP32 GPIO experiment">
      <h3>GPIO logic experiment</h3>
      <p>This teaching demo is currently mapped only to the classic ESP32 target. S3/C3 variants need their own verified GPIO profiles.</p>
    </section>;
  }
  const led = modelEsp32LedOutput(ledHigh);
  const button = modelEsp32PullupButton(buttonPressed);
  return <section className="studio-esp32-experiment" aria-label="Interactive ESP32 GPIO logic experiment">
    <div className="studio-esp32-experiment-heading">
      <span className="edu-kicker">INTERACTIVE GPIO CONCEPT DEMO</span>
      <h3>Try digital output and INPUT_PULLUP</h3>
      <p>Change the logic state and observe the simplified GPIO result. These controls do not run or inspect your sketch.</p>
    </div>
    <div className="studio-esp32-experiment-grid">
      <article>
        <div className={'studio-esp32-led-indicator '+(led.ledOn?'is-on':'')} aria-label={led.ledOn?'LED concept indicator on':'LED concept indicator off'}/>
        <h4>LED output · GPIO23</h4>
        <p><strong>{led.mode}</strong> · {led.level}</p>
        <p>{led.voltage}</p>
        <button type="button" onClick={() => setLedHigh(value => !value)}>Set GPIO23 {ledHigh?'LOW':'HIGH'}</button>
      </article>
      <article>
        <div className={'studio-esp32-button-indicator '+(button.pressed?'is-pressed':'')}>{button.pressed?'PRESSED':'RELEASED'}</div>
        <h4>Button input · GPIO32</h4>
        <p><strong>{button.mode}</strong> · reads {button.level}</p>
        <p>{button.explanation}</p>
        <button type="button" aria-pressed={buttonPressed} onClick={() => setButtonPressed(value => !value)}>{buttonPressed?'Release button':'Press button'}</button>
      </article>
    </div>
    <p className="studio-help">Logic-state teaching model only. It does not execute firmware or model current, voltage transients, switch bounce, peripheral behavior, timing or physical hardware. The LED still needs a series resistor in a real circuit.</p>
  </section>;
}
