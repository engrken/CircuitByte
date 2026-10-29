// CircuitByte: lightweight tabletop barrier. UNO R3 + HC-SR04 + MG90S 180-degree.
// TRIG D9, ECHO D10; servo signal D6. Separate regulated 5V servo supply; common GND.
// Use a paper/cardboard arm only. Not a full-size gate or safety system.
#include <Servo.h>
const byte TRIG_PIN=9, ECHO_PIN=10, SERVO_PIN=6;
const int OPEN_ANGLE=90, CLOSED_ANGLE=10;
Servo gate;
bool openGate=true;
unsigned long lastSample=0, clearSince=0;
bool clearTracking=false;
void setup() {
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  gate.attach(SERVO_PIN); gate.write(OPEN_ANGLE); // Begin open
  Serial.begin(9600);
}
void loop() {
  if (millis()-lastSample < 100UL) return;
  lastSample=millis();
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10); digitalWrite(TRIG_PIN, LOW);
  unsigned long duration=pulseIn(ECHO_PIN,HIGH,30000UL);
  float cm=duration/58.0;
  bool valid=duration!=0 && cm>=2 && cm<=400;
  if (!valid || cm<15) { openGate=true; clearTracking=false; }
  else if (cm>25) {
    if (!clearTracking) { clearSince=millis(); clearTracking=true; }
    if (millis()-clearSince>=3000UL) openGate=false;
  } else clearTracking=false;
  gate.write(openGate ? OPEN_ANGLE : CLOSED_ANGLE);
  Serial.print(valid ? cm : -1); Serial.print(F(" cm | "));
  Serial.println(openGate ? F("OPEN") : F("CLOSED"));
}
