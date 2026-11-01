export const BOARD_OPTIONS = [
  {id:'arduino:avr:uno',name:'Arduino UNO R3',catalogId:'cb-059'},
  {id:'esp8266:esp8266:nodemcuv2',name:'ESP8266 NodeMCU',catalogId:'cb-062'},
  {id:'esp32:esp32:esp32',name:'ESP32 Dev Module',catalogId:'cb-063'},
  {id:'esp32:esp32:m5stack-core-esp32',name:'M5Stack Core (ESP32)',catalogId:null}
];
export const studioBoardName = id => BOARD_OPTIONS.find(board => board.id === id)?.name || 'Unknown board';
export function boardSerialStarter(id){
 const target=BOARD_OPTIONS.find(board=>board.id===id);
 if(!target)throw Error('Choose a supported board.');
 return {slug:'serial-heartbeat',board:id,method:'board-starter',title:target.name+' serial starter',
  summary:'Print a heartbeat once per second at 115200 baud. No external components or GPIO connections are required.',
  prompt:'Print a serial heartbeat once per second at 115200 baud.',
  parts:target.catalogId?[target.catalogId]:[],wires:[],missing:[],
  warnings:['Select the exact board and USB port in Arduino IDE. A matching toolchain and physical-board test are still required.',
   ...(id.includes('esp')?['Use 3.3V GPIO logic. M5Stack models have different displays, peripherals and pin assignments. This starter does not configure them.']:[])],
  code:'// CircuitByte serial starter: '+target.name+'\n// Serial monitor: 115200 baud. No external wiring.\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  Serial.println("CircuitByte: board is running");\n  delay(1000);\n}\n'};
}
