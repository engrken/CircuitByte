// CircuitByte: first blinking light. D9 -> 330 ohms -> LED -> GND.
const byte LED_PIN = 9;
void setup() {
  pinMode(LED_PIN, OUTPUT); // Tell the pin to control a light.
}
void loop() {
  digitalWrite(LED_PIN, HIGH); // Turn on.
  delay(1000);                // Wait 1000 milliseconds = 1 second.
  digitalWrite(LED_PIN, LOW);  // Turn off.
  delay(1000);
}
