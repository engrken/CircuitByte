// CircuitByte: Morse SOS classroom light. Not emergency equipment.
const byte LED_PIN = 9;
const unsigned int UNIT_MS = 200;
void flash(byte units) {
  digitalWrite(LED_PIN, HIGH);
  delay(units * UNIT_MS);
  digitalWrite(LED_PIN, LOW);
  delay(UNIT_MS); // One unit between flashes.
}
void setup() { pinMode(LED_PIN, OUTPUT); }
void loop() {
  for (byte i = 0; i < 3; i++) flash(1); // S
  delay(2 * UNIT_MS); // Together with flash's pause: three units.
  for (byte i = 0; i < 3; i++) flash(3); // O
  delay(2 * UNIT_MS);
  for (byte i = 0; i < 3; i++) flash(1); // S
  delay(6 * UNIT_MS); // Together with flash's pause: seven units.
}
