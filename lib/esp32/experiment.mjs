// Tiny deterministic GPIO teaching model; not a firmware or electrical simulator.
export function modelEsp32LedOutput(high) {
  const level = Boolean(high) ? 'HIGH' : 'LOW';
  return { gpio: 23, mode: 'OUTPUT', level, ledOn: Boolean(high), voltage: high ? 'nominal 3.3 V logic HIGH' : 'nominal 0 V logic LOW' };
}

export function modelEsp32PullupButton(pressed) {
  const level = pressed ? 'LOW' : 'HIGH';
  return {
    gpio: 32,
    mode: 'INPUT_PULLUP',
    level,
    pressed: Boolean(pressed),
    explanation: pressed ? 'The switch connects GPIO32 to GND.' : 'The internal pull-up holds the unpressed input HIGH.'
  };
}
