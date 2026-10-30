// CircuitByte DIY: Three-LED Scanning Light
// Board: Arduino UNO R3-compatible
// Each LED has its own 330-ohm series resistor.

const byte ledPins[] = {8, 9, 10};
const byte ledCount = sizeof(ledPins) / sizeof(ledPins[0]);
const unsigned int stepDelayMs = 170;

void showLight(byte selected) {
  for (byte i = 0; i < ledCount; i++) {
    digitalWrite(ledPins[i], i == selected ? HIGH : LOW);
  }
  delay(stepDelayMs);
}

void setup() {
  for (byte i = 0; i < ledCount; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }
}

void loop() {
  // Forward: LED 1, LED 2, LED 3.
  for (byte i = 0; i < ledCount; i++) {
    showLight(i);
  }

  // Backward: LED 2 only, avoiding a duplicate endpoint flash.
  for (int i = int(ledCount) - 2; i > 0; i--) {
    showLight(byte(i));
  }
}
