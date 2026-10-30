// CircuitByte Learning Lab: Joystick-controlled four-way LED indicator
// UNO 5 V, analog VRx->A0, VRy->A1. LED outputs D5 D6 D9 D10.
// Use one separate 330-ohm series resistor per bare LED.
const byte xPin = A0;
const byte yPin = A1;
const byte leftPin = 5;
const byte rightPin = 6;
const byte upPin = 9;
const byte downPin = 10;

const int middle = 512;
const int deadZone = 170;
unsigned long lastPrint = 0;

void setup() {
  pinMode(leftPin, OUTPUT);
  pinMode(rightPin, OUTPUT);
  pinMode(upPin, OUTPUT);
  pinMode(downPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int x = analogRead(xPin);
  int y = analogRead(yPin);

  digitalWrite(leftPin, x < (middle - deadZone) ? HIGH : LOW);
  digitalWrite(rightPin, x > (middle + deadZone) ? HIGH : LOW);
  digitalWrite(upPin, y > (middle + deadZone) ? HIGH : LOW);
  digitalWrite(downPin, y < (middle - deadZone) ? HIGH : LOW);

  unsigned long now = millis();
  if (now - lastPrint >= 500UL) {
    lastPrint = now;
    Serial.print(F("X="));
    Serial.print(x);
    Serial.print(F(", Y="));
    Serial.println(y);
  }
}
