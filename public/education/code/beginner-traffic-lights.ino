// CircuitByte: tabletop traffic lights, not road equipment.
const byte RED_PIN = 8;
const byte YELLOW_PIN = 9;
const byte GREEN_PIN = 10;
void showLight(byte selected) {
  digitalWrite(RED_PIN, LOW);
  digitalWrite(YELLOW_PIN, LOW);
  digitalWrite(GREEN_PIN, LOW);
  digitalWrite(selected, HIGH);
}
void setup() {
  pinMode(RED_PIN, OUTPUT);
  pinMode(YELLOW_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
}
void loop() {
  showLight(RED_PIN); delay(3000);
  showLight(GREEN_PIN); delay(3000);
  showLight(YELLOW_PIN); delay(1000);
}
