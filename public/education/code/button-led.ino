// CircuitByte: button-controlled LED. Board: Arduino UNO R3.
// D2 -> momentary switch -> GND. D9 -> 330 ohm -> LED anode; cathode -> GND.
const byte BUTTON_PIN = 2;
const byte LED_PIN = 9;
bool rawLast = HIGH, stable = HIGH;
unsigned long changedAt = 0;
void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
}
void loop() {
  bool raw = digitalRead(BUTTON_PIN);
  if (raw != rawLast) { rawLast = raw; changedAt = millis(); }
  if (millis() - changedAt >= 30) stable = raw;
  digitalWrite(LED_PIN, stable == LOW ? HIGH : LOW);
}
