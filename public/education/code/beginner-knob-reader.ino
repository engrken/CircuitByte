// CircuitByte: turn a 10k potentiometer and read its value.
const byte POT_PIN = A0;
void setup() {
  Serial.begin(9600); // Match this speed in Serial Monitor.
}
void loop() {
  int reading = analogRead(POT_PIN); // UNO value: 0 to 1023.
  Serial.print("Knob value: ");
  Serial.println(reading); // Start a new line after the number.
  delay(200);
}
