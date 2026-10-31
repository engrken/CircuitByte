export const BOARD_OPTIONS = [
  {id:'arduino:avr:uno',name:'Arduino UNO R3',catalogId:'cb-059'},
  {id:'esp8266:esp8266:nodemcuv2',name:'ESP8266 NodeMCU',catalogId:'cb-062'},
  {id:'esp32:esp32:esp32',name:'ESP32 Dev Module',catalogId:'cb-063'},
  {id:'esp32:esp32:m5stack-core-esp32',name:'M5Stack Core (ESP32)',catalogId:null}
];
export const studioBoardName = id => BOARD_OPTIONS.find(board => board.id === id)?.name || 'Unknown board';
