// CircuitByte: low-voltage DC fan controller. UNO R3 + DHT22 + driven 5V relay module.
// DHT DATA D2 with 10k pull-up to 5V. Relay IN D8; configure trigger polarity below.
// External 5V supply -> relay COM; NO -> fan+; fan- -> supply GND.
// Common signal GND. Fan is an additional part; never connect mains.
#include <DHT.h>
const byte DHT_PIN = 2, RELAY_PIN = 8;
const bool RELAY_ACTIVE_LOW = true; // Confirm with the load disconnected.
const float ON_C = 30.0, OFF_C = 28.0;
DHT dht(DHT_PIN, DHT22);
bool fanOn = false;
unsigned long lastRead = 0;
void setFan(bool on) {
  fanOn = on;
  digitalWrite(RELAY_PIN, (on == RELAY_ACTIVE_LOW) ? LOW : HIGH);
}
void setup() {
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW); // Idle level before output
  pinMode(RELAY_PIN, OUTPUT); setFan(false);
  Serial.begin(9600); dht.begin();
}
void loop() {
  if (millis() - lastRead < 2500UL) return;
  lastRead = millis();
  float t = dht.readTemperature();
  if (isnan(t)) {
    setFan(false); // Demo policy only; real cooling systems may require fail-ON.
    Serial.println(F("Sensor fault: demo fan OFF. Check sensor/pull-up.")); return;
  }
  if (t >= ON_C) setFan(true);
  else if (t <= OFF_C) setFan(false);
  Serial.print(t,1); Serial.print(F(" C | fan=")); Serial.println(fanOn ? F("ON") : F("OFF"));
}
