// CircuitByte: potentiometer-controlled LED. Board: Arduino UNO R3.
// 10k potentiometer ends -> 5V/GND; wiper -> A0.
// D9 -> 330 ohm -> LED anode; LED cathode -> GND.
const byte POT_PIN = A0, LED_PIN = 9;
void setup() { pinMode(LED_PIN, OUTPUT); Serial.begin(9600); }
void loop() {
  int reading = analogRead(POT_PIN);
  byte brightness = reading / 4; // 0..1023 becomes 0..255
  analogWrite(LED_PIN, brightness);
  Serial.print(F("ADC=")); Serial.print(reading);
  Serial.print(F(" PWM=")); Serial.println(brightness);
  delay(50);
}
