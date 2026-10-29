// CircuitByte: local Wi-Fi room dashboard. Classic ESP32 Dev Module + DHT22.
// DHT + -> 3V3, - -> GND, DATA -> GPIO27; 10k pull-up DATA -> 3V3.
// Arduino core: esp32 by Espressif. Libraries: DHT sensor library + Adafruit Unified Sensor.
#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>
const char AP_NAME[]="CircuitByte-Lab";
const char AP_PASSWORD[]="ChangeThisLabKey"; // CHANGE before sharing the device.
DHT dht(27,DHT22);
WebServer server(80);
float temperature=NAN, humidity=NAN;
unsigned long lastRead=0;
const char PAGE[] PROGMEM=R"HTML(<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>CircuitByte room monitor</title><style>body{font:18px system-ui;background:#edf3e9;color:#17332f;padding:24px;max-width:650px;margin:auto}article{background:white;padding:24px;border-radius:16px}strong{font-size:36px}small{display:block;margin-top:16px}</style></head><body><h1>CircuitByte room monitor</h1><article><p>Temperature</p><strong id="t">--</strong><p>Relative humidity</p><strong id="h">--</strong><small id="s">Connecting...</small></article><p>Local educational monitor. No cloud or Internet connection required.</p><script>async function update(){try{const r=await fetch('/readings',{cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();document.querySelector('#t').textContent=d.valid?d.temperature.toFixed(1)+' C':'--';document.querySelector('#h').textContent=d.valid?d.humidity.toFixed(1)+' %':'--';document.querySelector('#s').textContent=d.valid?'Latest sensor sample: '+d.age_ms+' ms ago':'Sensor unavailable: check wiring and pull-up';}catch{document.querySelector('#s').textContent='Device disconnected';}}setInterval(update,3000);update();</script></body></html>)HTML";
void setup() {
  Serial.begin(115200); dht.begin();
  WiFi.mode(WIFI_AP);
  if(!WiFi.softAP(AP_NAME,AP_PASSWORD)) { Serial.println("AP failed"); return; }
  Serial.print("Open http://"); Serial.println(WiFi.softAPIP());
  server.on("/",[]{server.send_P(200,"text/html",PAGE);});
  server.on("/readings",[]{
    bool valid=!isnan(temperature)&&!isnan(humidity);
    String json="{\"valid\":"+String(valid?"true":"false")+",\"temperature\":"+(valid?String(temperature,1):String("null"))+",\"humidity\":"+(valid?String(humidity,1):String("null"))+",\"age_ms\":"+String(millis()-lastRead)+"}";
    server.sendHeader("Cache-Control","no-store"); server.send(200,"application/json",json);
  });
  server.begin();
}
void loop() {
  server.handleClient();
  if(millis()-lastRead>=2500UL) { lastRead=millis(); temperature=dht.readTemperature(); humidity=dht.readHumidity(); }
}
