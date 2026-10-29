// CircuitByte: GSM door-open notification prototype. UNO R3 + SIM900A V4.0 kit.
// Reed MODULE S -> D2, + -> 5V, - -> GND; verify CLOSED_LEVEL below.
// SoftwareSerial RX D7 <- level-shifter output <- modem raw TX.
// SoftwareSerial TX D8 -> level-shifter input -> modem raw RX.
// Use the guide's 5V/2.8V TXU0202 interface and separate suitable kit supply.
// Compatible 2G GSM/SMS service, antenna, SIM and sufficient credit required.
#include <SoftwareSerial.h>
#include <string.h>
SoftwareSerial modem(7,8); // RX, TX
const byte REED_PIN=2;
const byte CLOSED_LEVEL=LOW; // Measure with magnet near the reed module first.
const char PHONE[]="+639XXXXXXXXX"; // Replace with your own consenting recipient.
const unsigned long COOLDOWN=300000UL;
char response[160];
bool lastRawOpen=false, stableOpen=false, sentForOpening=false, attempted=false;
unsigned long changedAt=0, lastAttempt=0;
void clearModem() { while(modem.available()) modem.read(); }
bool waitFor(const char *expected, unsigned long timeout) {
  size_t used=0; response[0]='\0'; unsigned long started=millis();
  while(millis()-started<timeout) {
    while(modem.available()) {
      char c=(char)modem.read(); Serial.write(c);
      if(used>=sizeof(response)-1) { memmove(response,response+1,used-1); used--; }
      response[used++]=c; response[used]='\0';
      if(strstr(response,expected)) return true;
      if(strstr(response,"ERROR")) return false;
    }
  }
  return false;
}
bool command(const char *text,const char *expected,unsigned long timeout=3000UL) {
  clearModem(); modem.println(text); return waitFor(expected,timeout);
}
bool validPhone() {
  if(PHONE[0]!='+' || strlen(PHONE)<9) return false;
  for(size_t i=1;i<strlen(PHONE);i++) if(PHONE[i]<'0'||PHONE[i]>'9') return false;
  return true;
}
bool sendAlert() {
  if(!command("AT","OK")) return false;
  if(!command("ATE0","OK")) return false;
  if(!command("AT+CPIN?","OK") || !strstr(response,"READY")) return false;
  if(!command("AT+CREG?","OK")) return false;
  if(!strstr(response,",1") && !strstr(response,",5")) {
    Serial.println(F("Not registered on a compatible 2G network.")); return false;
  }
  if(!command("AT+CMGF=1","OK")) return false;
  clearModem(); modem.print(F("AT+CMGS=\"")); modem.print(PHONE); modem.println(F("\""));
  if(!waitFor(">",5000UL)) { modem.write(27); return false; }
  modem.print(F("CircuitByte prototype: door opened. Please check.")); modem.write(26);
  // +CMGS means modem/network acceptance, not proof of handset delivery.
  return waitFor("+CMGS:",60000UL);
}
void setup() {
  pinMode(REED_PIN,INPUT_PULLUP); Serial.begin(9600); modem.begin(9600);
  lastRawOpen=digitalRead(REED_PIN)!=CLOSED_LEVEL;
  stableOpen=lastRawOpen; changedAt=millis();
  Serial.println(F("Allow 30 seconds for modem startup. Configure PHONE before use."));
}
void loop() {
  bool rawOpen=digitalRead(REED_PIN)!=CLOSED_LEVEL;
  if(rawOpen!=lastRawOpen) { lastRawOpen=rawOpen; changedAt=millis(); }
  if(millis()-changedAt>=1000UL && stableOpen!=rawOpen) {
    stableOpen=rawOpen; if(!stableOpen) sentForOpening=false;
  }
  if(millis()<30000UL || !validPhone()) return;
  if(stableOpen && !sentForOpening && (!attempted || millis()-lastAttempt>=COOLDOWN)) {
    attempted=true; lastAttempt=millis();
    sentForOpening=sendAlert();
    Serial.println(sentForOpening ? F("SMS accepted. No repeat until door closes/reopens.") : F("Not confirmed. Retry after five minutes if still open."));
  }
  // This teaching example waits during AT commands; it is not a real-time alarm controller.
}
