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

 
// Idealized HC-SR04 timing model for teaching only; it does not read a sensor.
export function modelEsp32UltrasonicDistance(distanceCm, thresholdCm = 20) {
  const distance = Number(distanceCm);
  const threshold = Number(thresholdCm);
  if (!Number.isFinite(distance) || distance < 2 || distance > 400) {
    throw new RangeError('Distance must be between 2 and 400 centimeters.');
  }
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 400) {
    throw new RangeError('Threshold must be greater than 0 and no more than 400 centimeters.');
  }
  const echoPulseUs = Math.round((distance * 2 / 0.0343) * 10) / 10;
  return {
    distanceCm: distance,
    echoPulseUs,
    withinThreshold: distance <= threshold,
    thresholdCm: threshold,
    explanation: 'Distance is estimated from echo pulse time × 0.0343 ÷ 2.'
  };
}
