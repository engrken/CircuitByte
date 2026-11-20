// Deterministic GPIO teaching model only; not firmware execution or electrical simulation.
export function modelEsp32LedOutput(high, gpio = 23) {
  const level = Boolean(high) ? 'HIGH' : 'LOW';
  return { gpio, mode: 'OUTPUT', level, ledOn: Boolean(high), voltage: high ? 'nominal 3.3 V logic HIGH' : 'nominal 0 V logic LOW' };
}

export function modelEsp32PullupButton(pressed, gpio = 32) {
  const level = pressed ? 'LOW' : 'HIGH';
  return {
    gpio,
    mode: 'INPUT_PULLUP',
    level,
    pressed: Boolean(pressed),
    explanation: pressed ? 'The switch connects GPIO'+gpio+' to GND.' : 'The internal pull-up holds the unpressed input HIGH.'
  };
}
