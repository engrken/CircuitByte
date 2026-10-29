// CircuitByte: calibrated photoresistor-module night light. UNO R3.
// Module + -> 5V, - -> GND, S/AO -> A0. D9 -> 330 ohm -> LED -> GND.
const byte LIGHT_PIN = A0, LED_PIN = 9;
// Replace these two measurements with YOUR Serial Monitor readings.
const int DARK_READING = 200, BRIGHT_READING = 800;
bool lampOn = false;
void setup() { pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, LOW); Serial.begin(9600); }
void loop() {
  long sum = 0;
  for (byte i=0; i<16; i++) sum += analogRead(LIGHT_PIN);
  int raw = sum / 16;
  if (abs(BRIGHT_READING - DARK_READING) < 50) {
    digitalWrite(LED_PIN, LOW);
    Serial.println(F("Calibration span too small; measure bright and dark again."));
    delay(500); return;
  }
  // Works even when a different module gives lower counts in bright light.
  int lightPercent = constrain(map(raw, DARK_READING, BRIGHT_READING, 0, 100), 0, 100);
  if (lightPercent < 30) lampOn = true;
  if (lightPercent > 45) lampOn = false;
  digitalWrite(LED_PIN, lampOn ? HIGH : LOW);
  Serial.print(F("Raw=")); Serial.print(raw);
  Serial.print(F(" Relative light=")); Serial.print(lightPercent);
  Serial.print(F("% LED=")); Serial.println(lampOn ? F("ON") : F("OFF"));
  delay(100);
}
