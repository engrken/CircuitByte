// CircuitByte Learning Lab: light level to microSD as CSV
// UNO A0: LDR module analog AO. SD SPI: CS D10, MOSI D11,
// MISO D12, SCK D13. VERIFY SD breakout 5 V logic compatibility
// or install suitable level shifting before connecting.
#include <SPI.h>
#include <SD.h>

const byte sensorPin = A0;
const byte sdSelect = 10;
const char filename[] = "LIGHT.CSV";
const unsigned long logIntervalMs = 5000UL;
const unsigned long initRetryMs = 10000UL;

unsigned long lastSample = 0;
unsigned long lastInitTry = 0;
bool cardReady = false;

void initializeCard() {
  lastInitTry = millis();
  cardReady = SD.begin(sdSelect);
  if (cardReady) Serial.println(F("SD ready"));
  else Serial.println(F("SD.begin failed: inspect card, wiring and voltage"));
}

void setup() {
  Serial.begin(9600);
  pinMode(sdSelect, OUTPUT);
  initializeCard();
}

void loop() {
  unsigned long now = millis();
  if (!cardReady && now - lastInitTry >= initRetryMs) {
    initializeCard();
  }
  if (now - lastSample < logIntervalMs) return;
  lastSample = now;

  int level = analogRead(sensorPin);
  if (!cardReady) {
    Serial.println(F("Sample skipped: SD unavailable"));
    return;
  }

  bool firstRecord = !SD.exists(filename);
  File logFile = SD.open(filename, FILE_WRITE);
  if (!logFile) {
    Serial.println(F("CSV open error; will retry SD"));
    cardReady = false;
    lastInitTry = now;
    return;
  }

  if (firstRecord) logFile.println(F("uptime_ms,light_adc"));
  logFile.print(now);
  logFile.print(',');
  logFile.println(level);
  logFile.flush();
  logFile.close();

  Serial.print(F("Logged uptime_ms="));
  Serial.print(now);
  Serial.print(F(", light_adc="));
  Serial.println(level);
}
