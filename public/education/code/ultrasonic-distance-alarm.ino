// CircuitByte: desktop proximity indicator. UNO R3, standard 5V HC-SR04.
// Trig D9; Echo D10. Passive PIEZO MODULE signal D3; +5V and GND as labelled.
// D6 -> 330 ohm -> LED -> GND. Not a vehicle safety or collision-avoidance device.
const byte TRIG_PIN = 9, ECHO_PIN = 10, BUZZER_PIN = 3, LED_PIN = 6;
void setup() {
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT); pinMode(BUZZER_PIN, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10); digitalWrite(TRIG_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  float cm = duration / 58.0;
  bool valid = duration != 0 && cm >= 2 && cm <= 400;
  if (!valid) {
    noTone(BUZZER_PIN); digitalWrite(LED_PIN, LOW);
    Serial.println(F("No valid echo. Check target and wiring."));
  } else {
    Serial.print(cm,1); Serial.println(F(" cm"));
    digitalWrite(LED_PIN, cm < 20 ? HIGH : LOW);
    if (cm < 20) tone(BUZZER_PIN, 1800, 60); else noTone(BUZZER_PIN);
  }
  delay(100); // More than 60 ms between triggers
}
