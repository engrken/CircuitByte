// CircuitByte Learning Lab: LCD room temperature/humidity
// Arduino UNO + DHT22 on D2 + 16x2 I2C LCD on A4 (SDA), A5 (SCL).
// Libraries: DHT sensor library + Adafruit Unified Sensor; hd44780 by Bill Perry.
#include <Wire.h>
#include <DHT.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>

const byte dhtPin = 2;
const unsigned long sampleIntervalMs = 2500UL;
DHT dht(dhtPin, DHT22);
hd44780_I2Cexp lcd;
unsigned long lastSample = 0;

void displayError() {
  lcd.setCursor(0, 0);
  lcd.print(F("Sensor error    "));
  lcd.setCursor(0, 1);
  lcd.print(F("Check D2 & VCC  "));
}

void setup() {
  Serial.begin(9600);
  dht.begin();
  int status = lcd.begin(16, 2);
  if (status != 0) {
    Serial.print(F("LCD init error: "));
    Serial.println(status);
    while (true) delay(1000);
  }
  lcd.clear();
  lcd.print(F("CircuitByte Lab"));
  lcd.setCursor(0, 1);
  lcd.print(F("Starting sensor"));
}

void loop() {
  unsigned long now = millis();
  if (now - lastSample < sampleIntervalMs) return;
  lastSample = now;

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println(F("DHT22 read failed"));
    displayError();
    return;
  }

  // Overwrite the entire prior row to avoid leftover text.
  lcd.setCursor(0, 0);
  lcd.print(F("Temp:           "));
  lcd.setCursor(6, 0);
  lcd.print(temperature, 1);
  lcd.print(F(" C"));
  lcd.setCursor(0, 1);
  lcd.print(F("Humidity:       "));
  lcd.setCursor(10, 1);
  lcd.print(humidity, 1);
  lcd.print('%');

  Serial.print(F("T_C="));
  Serial.print(temperature, 1);
  Serial.print(F(",RH="));
  Serial.println(humidity, 1);
}
