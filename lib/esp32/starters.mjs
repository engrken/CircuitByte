// Conservative beginner GPIO starters. GPIO numbers are logical assignments, not PCB header coordinates.
const makePair = (family, ledGpio, buttonGpio) => [
  {
    id:'external-led',title:'External LED with current-limiting resistor',level:'Beginner · digital output',
    summary:'Blink an external LED from GPIO'+ledGpio+' through a 220–330 Ω series resistor.',
    materials:'External LED, 220–330 Ω resistor, breadboard and jumper wires.',
    warnings:['Use a series current-limiting resistor; never connect an LED directly between GPIO and ground.','GPIO is 3.3 V only. Verify LED polarity, resistor and common ground before powering the board.','Confirm that GPIO'+ledGpio+' is exposed on your exact physical board and is not assigned to an onboard peripheral.'],
    netlist:[{pin:'GPIO'+ledGpio,to:'LED anode through 220–330 Ω series resistor',net:'LED_CONTROL',kind:'digital-output',signalVoltage:3.3},{pin:'GND',to:'LED cathode',net:'COMMON_GROUND',kind:'ground'}],
    code:'// CircuitByte '+family+' starter: external LED\n// GPIO'+ledGpio+' -> 220-330 ohm resistor -> LED anode; LED cathode -> GND.\n\nconstexpr uint8_t LED_GPIO = '+ledGpio+';\n\nvoid setup() {\n  pinMode(LED_GPIO, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_GPIO, HIGH);\n  delay(500);\n  digitalWrite(LED_GPIO, LOW);\n  delay(500);\n}\n'
  },
  {
    id:'button-input',title:'Pushbutton with internal pull-up',level:'Beginner · digital input',
    summary:'Read a momentary button between GPIO'+buttonGpio+' and GND using INPUT_PULLUP.',
    materials:'Momentary pushbutton, breadboard and jumper wires.',
    warnings:['Wire the switch between GPIO'+buttonGpio+' and GND. INPUT_PULLUP means pressed reads LOW.','Do not connect 5 V to an ESP32 GPIO. GPIO is 3.3 V only.','Confirm GPIO'+buttonGpio+' is exposed on your exact physical board and is not assigned to an onboard peripheral.'],
    netlist:[{pin:'GPIO'+buttonGpio,to:'Momentary pushbutton terminal A',net:'BUTTON_INPUT',kind:'digital-input'},{pin:'GND',to:'Momentary pushbutton terminal B',net:'COMMON_GROUND',kind:'ground'}],
    code:'// CircuitByte '+family+' starter: pushbutton input\n// Wire the momentary button between GPIO'+buttonGpio+' and GND.\n// INPUT_PULLUP: released = HIGH, pressed = LOW.\n\nconstexpr uint8_t BUTTON_GPIO = '+buttonGpio+';\n\nvoid setup() {\n  pinMode(BUTTON_GPIO, INPUT_PULLUP);\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  static int previous = HIGH;\n  const int current = digitalRead(BUTTON_GPIO);\n  if (current != previous) {\n    Serial.println(current == LOW ? "Button pressed" : "Button released");\n    previous = current;\n  }\n  delay(20); // Simple polling interval; add a full debounce if needed.\n}\n'
  }
];

export const ESP32_CIRCUIT_STARTERS = Object.freeze(makePair('classic ESP32',23,32));
const BOARD_STARTERS = Object.freeze({
 'esp32:esp32:esp32': ESP32_CIRCUIT_STARTERS,
 'esp32:esp32:esp32s3': Object.freeze(makePair('ESP32-S3',4,5)),
 'esp32:esp32:esp32c3': Object.freeze(makePair('ESP32-C3',3,4))
});

export function getEsp32CircuitStarters(board='esp32:esp32:esp32') {
 return BOARD_STARTERS[board] || [];
}

export function buildEsp32CircuitStarter(id, board = 'esp32:esp32:esp32') {
 const starters=getEsp32CircuitStarters(board);
 if(!starters.length)throw new Error('No reviewed GPIO starters are available for this ESP32 target yet.');
 const starter=starters.find(item=>item.id===id);
 if(!starter)throw new Error('Choose a supported ESP32 circuit starter.');
 return {
  slug:'esp32-'+board.split(':').at(-1)+'-'+starter.id,board,method:'board-starter',
  title:starter.title,summary:starter.summary,prompt:starter.summary,materials:starter.materials,
  parts:board==='esp32:esp32:esp32'?['cb-063']:[],
  wires:starter.netlist.map(({pin,to})=>[pin,to]),netlist:starter.netlist.map(row=>({...row})),
  missing:[],warnings:[...starter.warnings,'Static wiring guidance only. Compile and test on the exact physical board; this is not an ESP32 firmware simulator or electrical certification.'],
  code:starter.code
 };
}
