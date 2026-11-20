// Conservative, beginner ESP32 circuit starters for the classic Arduino ESP32 target.
// Pin choices are logical GPIO assignments, not a claim about a specific PCB header layout.
export const ESP32_CIRCUIT_STARTERS = Object.freeze([
  {
    id: 'external-led',
    title: 'External LED with current-limiting resistor',
    level: 'Beginner · digital output',
    summary: 'Blink an external LED from GPIO23 through a 220–330 Ω series resistor.',
    materials: 'External LED, 220–330 Ω resistor, breadboard and jumper wires.',
    warnings: [
      'Use a series current-limiting resistor; never connect an LED directly between GPIO and ground.',
      'GPIO is 3.3 V only. Verify LED polarity and the resistor before powering the board.',
      'GPIO23 is a logical GPIO choice for the classic ESP32 target; verify that your exact board exposes it.'
    ],
    netlist: [
      { pin: 'GPIO23', to: 'LED anode through 220–330 Ω series resistor', net: 'LED_CONTROL', kind: 'digital-output', signalVoltage: 3.3 },
      { pin: 'GND', to: 'LED cathode', net: 'COMMON_GROUND', kind: 'ground' }
    ],
    code: `// CircuitByte ESP32 starter: external LED
// Board target: classic ESP32 (verify your exact board and header labels).
// Wire GPIO23 -> 220–330 ohm resistor -> LED anode; LED cathode -> GND.

constexpr uint8_t LED_GPIO = 23;

void setup() {
  pinMode(LED_GPIO, OUTPUT);
}

void loop() {
  digitalWrite(LED_GPIO, HIGH);
  delay(500);
  digitalWrite(LED_GPIO, LOW);
  delay(500);
}
`
  },
  {
    id: 'button-input',
    title: 'Pushbutton with internal pull-up',
    level: 'Beginner · digital input',
    summary: 'Read a momentary button between GPIO32 and GND using INPUT_PULLUP.',
    materials: 'Momentary pushbutton, breadboard and jumper wires.',
    warnings: [
      'Wire the switch between GPIO32 and GND. INPUT_PULLUP means pressed reads LOW.',
      'Do not connect 5 V to an ESP32 GPIO. GPIO is 3.3 V only.',
      'GPIO32 is a logical GPIO choice for the classic ESP32 target; verify that your exact board exposes it.'
    ],
    netlist: [
      { pin: 'GPIO32', to: 'Momentary pushbutton terminal A', net: 'BUTTON_INPUT', kind: 'digital-input' },
      { pin: 'GND', to: 'Momentary pushbutton terminal B', net: 'COMMON_GROUND', kind: 'ground' }
    ],
    code: `// CircuitByte ESP32 starter: pushbutton input
// Wire the momentary button between GPIO32 and GND.
// INPUT_PULLUP: released = HIGH, pressed = LOW.

constexpr uint8_t BUTTON_GPIO = 32;

void setup() {
  pinMode(BUTTON_GPIO, INPUT_PULLUP);
  Serial.begin(115200);
}

void loop() {
  static int previous = HIGH;
  const int current = digitalRead(BUTTON_GPIO);

  if (current != previous) {
    Serial.println(current == LOW ? "Button pressed" : "Button released");
    previous = current;
  }

  delay(20); // Simple polling interval; add a full debounce if needed.
}
`
  }
]);

export function buildEsp32CircuitStarter(id, board = 'esp32:esp32:esp32') {
  if (board !== 'esp32:esp32:esp32') {
    throw new Error('These starter pin assignments are only for the classic ESP32 target. Choose the classic ESP32 Dev Module and verify your exact board pinout.');
  }
  const starter = ESP32_CIRCUIT_STARTERS.find(item => item.id === id);
  if (!starter) throw new Error('Choose a supported ESP32 circuit starter.');
  return {
    slug: 'esp32-' + starter.id,
    board,
    method: 'board-starter',
    title: starter.title,
    summary: starter.summary,
    prompt: starter.summary,
    materials: starter.materials,
    parts: ['cb-063'],
    wires: starter.netlist.map(({ pin, to }) => [pin, to]),
    netlist: starter.netlist.map(row => ({ ...row })),
    missing: [],
    warnings: [...starter.warnings, 'Static wiring guidance only. Compile and test on the exact physical board; this is not an ESP32 firmware simulator or electrical certification.'],
    code: starter.code
  };
}
