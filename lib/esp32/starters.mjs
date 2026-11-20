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
  },
  {
    id:'ultrasonic-distance',title:'Ultrasonic distance sensor (HC-SR04)',level:'Beginner · pulse timing and distance',
    summary:'Measure distance with an HC-SR04 and print centimeters over Serial. The 5 V ECHO signal must be reduced before it reaches an ESP32 GPIO.',
    materials:'HC-SR04-compatible ultrasonic module, 1 kΩ and 2 kΩ resistors for an ECHO voltage divider, breadboard and jumper wires.',
    warnings:['Power the HC-SR04 VCC from a verified 5 V supply and connect sensor GND to ESP32 GND. Do not power the sensor from an ESP32 GPIO.','HC-SR04 ECHO can be 5 V. Use a resistor divider (1 kΩ from ECHO to the GPIO node, 2 kΩ from that node to GND) so the ESP32 input sees about 3.3 V. Never connect raw 5 V ECHO directly to an ESP32 GPIO.','TRIG is driven by the ESP32 3.3 V GPIO. Verify the exact sensor variant and board pin labels before wiring.'],
    netlist:[
      {pin:'GPIO'+ledGpio,to:'HC-SR04 TRIG input · 3.3 V logic',net:'ULTRASONIC_TRIGGER',kind:'digital-output',signalVoltage:3.3},
      {pin:'GPIO'+buttonGpio,to:'HC-SR04 ECHO output through 1 kΩ / 2 kΩ divider · reduced to about 3.3 V',net:'ULTRASONIC_ECHO',kind:'digital-input',signalVoltage:3.3},
      {pin:'5V',to:'HC-SR04 VCC · verify sensor supply rating',net:'SENSOR_SUPPLY',kind:'power',signalVoltage:5},
      {pin:'GND',to:'HC-SR04 GND and divider lower resistor',net:'COMMON_GROUND',kind:'ground'}
    ],
    code:'// CircuitByte '+family+' starter: HC-SR04 distance measurement\n// TRIG -> GPIO'+ledGpio+'; ECHO -> GPIO'+buttonGpio+' THROUGH a 1k/2k voltage divider.\n// HC-SR04 VCC -> verified 5V supply; all grounds must be common.\n// Never connect the raw 5V ECHO signal directly to an ESP32 GPIO.\n\nconstexpr uint8_t TRIG_PIN = '+ledGpio+';\nconstexpr uint8_t ECHO_PIN = '+buttonGpio+';\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(TRIG_PIN, OUTPUT);\n  pinMode(ECHO_PIN, INPUT);\n  digitalWrite(TRIG_PIN, LOW);\n}\n\nvoid loop() {\n  digitalWrite(TRIG_PIN, LOW);\n  delayMicroseconds(2);\n  digitalWrite(TRIG_PIN, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(TRIG_PIN, LOW);\n\n  // Timeout prevents a missing echo from blocking the loop indefinitely.\n  const unsigned long echoUs = pulseIn(ECHO_PIN, HIGH, 30000UL);\n  if (echoUs == 0) {\n    Serial.println("No echo / out of range");\n  } else {\n    const float distanceCm = echoUs * 0.0343f / 2.0f;\n    Serial.print("Distance: ");\n    Serial.print(distanceCm, 1);\n    Serial.println(" cm");\n  }\n  delay(100);\n}\n'
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
