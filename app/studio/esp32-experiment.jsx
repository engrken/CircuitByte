'use client';

import { useState } from 'react';
import { modelEsp32LedOutput, modelEsp32PullupButton, modelEsp32UltrasonicDistance } from '../../lib/esp32/experiment.mjs';

const GPIO_DEMOS = {
  'esp32:esp32:esp32': { family:'Classic ESP32', led:23, button:32 },
  'esp32:esp32:esp32s3': { family:'ESP32-S3', led:4, button:5 },
  'esp32:esp32:esp32c3': { family:'ESP32-C3', led:3, button:4 }
};

export function StudioEsp32Experiment({ board }) {
  const [ledHigh, setLedHigh] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [distanceCm, setDistanceCm] = useState(35);
  const pins = GPIO_DEMOS[board];
  if (!pins) {
    return <section className="studio-esp32-experiment" aria-label="ESP32 GPIO experiment">
      <h3>GPIO logic experiment</h3>
      <p>No reviewed teaching GPIO assignments are available for this ESP32 target yet.</p>
    </section>;
  }
  const led = modelEsp32LedOutput(ledHigh,pins.led);
  const button = modelEsp32PullupButton(buttonPressed,pins.button);\n  const ultrasonic = modelEsp32UltrasonicDistance(distanceCm,20);
  return <section className="studio-esp32-experiment" aria-label="Interactive ESP32 GPIO logic experiment">
    <div className="studio-esp32-experiment-heading">
      <span className="edu-kicker">INTERACTIVE GPIO CONCEPT DEMO · {pins.family.toUpperCase()}</span>
      <h3>Try digital output and INPUT_PULLUP</h3>
      <p>Change the logic state and observe the simplified GPIO result. These controls do not run or inspect your sketch.</p>
    </div>
    <div className="studio-esp32-experiment-grid">
      <article>
        <div className={'studio-esp32-led-indicator '+(led.ledOn?'is-on':'')} aria-label={led.ledOn?'LED concept indicator on':'LED concept indicator off'}/>
        <h4>LED output · GPIO{led.gpio}</h4>
        <p><strong>{led.mode}</strong> · {led.level}</p>
        <p>{led.voltage}</p>
        <button type="button" onClick={() => setLedHigh(value => !value)}>Set GPIO{led.gpio} {ledHigh?'LOW':'HIGH'}</button>
      </article>
      <article>
        <div className={'studio-esp32-button-indicator '+(button.pressed?'is-pressed':'')}>{button.pressed?'PRESSED':'RELEASED'}</div>
        <h4>Button input · GPIO{button.gpio}</h4>
        <p><strong>{button.mode}</strong> · reads {button.level}</p>
        <p>{button.explanation}</p>
        <button type="button" aria-pressed={buttonPressed} onClick={() => setButtonPressed(value => !value)}>{buttonPressed?'Release button':'Press button'}</button>
      </article>
      <article>
        <h4>Ultrasonic echo timing · HC-SR04</h4>
        <p>Set a simulated target distance to see the ideal echo pulse duration.</p>
        <label htmlFor="studio-ultrasonic-distance">Target distance: <strong>{distanceCm} cm</strong></label>
        <input id="studio-ultrasonic-distance" type="range" min="2" max="400" step="1" value={distanceCm} onChange={event => setDistanceCm(Number(event.target.value))} />
        <p><strong>Echo pulse:</strong> {ultrasonic.echoPulseUs.toFixed(1)} µs</p>
        <p><strong>20 cm alarm threshold:</strong> {ultrasonic.withinThreshold?'WITHIN RANGE':'CLEAR'}</p>
        <p>{ultrasonic.explanation}</p>
      </article>
    </div>
    <p className="studio-help">These are simplified teaching models, not firmware execution or physical sensor readings. The ultrasonic slider models ideal echo timing only. For a real HC-SR04, power it from a verified 5 V source and reduce its 5 V ECHO output with a resistor divider before the ESP32 GPIO. The LED still needs a series resistor. Confirm the exact board and module pinouts before wiring.</p>
  </section>;
}
