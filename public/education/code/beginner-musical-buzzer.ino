// CircuitByte: passive piezo logic-input module on D3.
const byte BUZZER_PIN = 3;
void playNote(unsigned int frequency) {
  tone(BUZZER_PIN, frequency); // Pitch in hertz.
  delay(300);                 // Hold the note.
  noTone(BUZZER_PIN);          // Stop making sound.
  delay(150);                 // Silence between notes.
}
void setup() { pinMode(BUZZER_PIN, OUTPUT); }
void loop() {
  playNote(523);
  playNote(659);
  playNote(784);
  delay(1500);
}
