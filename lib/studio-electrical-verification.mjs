// Conservative static electrical review. Never equate passing these checks with hardware validation.
const BOARD_LIMITS={
 'arduino:avr:uno':{logicVoltage:5,pins:new Set([...Array.from({length:14},(_,i)=>'D'+i),...Array.from({length:6},(_,i)=>'A'+i)])},
 'arduino:avr:nano:cpu=atmega328':{logicVoltage:5},
 'arduino:avr:nano:cpu=atmega328old':{logicVoltage:5},
 'arduino:avr:mega:cpu=atmega2560':{logicVoltage:5},
 'arduino:avr:leonardo':{logicVoltage:5},
 'esp8266:esp8266:nodemcuv2':{logicVoltage:3.3},
 'esp32:esp32:esp32':{logicVoltage:3.3,pins:new Set(['GPIO0','GPIO1','GPIO2','GPIO3','GPIO4','GPIO5','GPIO12','GPIO13','GPIO14','GPIO15','GPIO16','GPIO17','GPIO18','GPIO19','GPIO21','GPIO22','GPIO23','GPIO25','GPIO26','GPIO27','GPIO32','GPIO33','GPIO34','GPIO35','GPIO36','GPIO39']),inputOnly:new Set(['GPIO34','GPIO35','GPIO36','GPIO39']),strapping:new Set(['GPIO0','GPIO2','GPIO5','GPIO12','GPIO15']),uart0:new Set(['GPIO1','GPIO3']),adc2:new Set(['GPIO0','GPIO2','GPIO4','GPIO12','GPIO13','GPIO14','GPIO15','GPIO25','GPIO26','GPIO27']),pinoutReferenceOnly:true},
 'esp32:esp32:esp32s3':{logicVoltage:3.3,pins:new Set([...Array.from({length:22},(_,i)=>'GPIO'+i),...Array.from({length:14},(_,i)=>'GPIO'+(35+i))]),inputOnly:new Set(['GPIO46']),strapping:new Set(['GPIO0','GPIO3','GPIO45','GPIO46']),uart0:new Set(['GPIO43','GPIO44']),usb:new Set(['GPIO19','GPIO20']),conditionalFlash:new Set(['GPIO35','GPIO36','GPIO37']),pinoutReferenceOnly:true},
 'esp32:esp32:esp32c3':{logicVoltage:3.3,pins:new Set([...Array.from({length:11},(_,i)=>'GPIO'+i),'GPIO18','GPIO19','GPIO20','GPIO21']),strapping:new Set(['GPIO2','GPIO8','GPIO9']),uart0:new Set(['GPIO20','GPIO21']),usb:new Set(['GPIO18','GPIO19']),adc2:new Set(['GPIO5']),pinoutReferenceOnly:true},
 'esp32:esp32:m5stack-core-esp32':{logicVoltage:3.3}
};
// Normalize labels from generated plans without confusing ESP8266 D aliases with GPIO numbers.
export function normalizeElectricalPin(value,board='arduino:avr:uno'){
 let pin=String(value||'').trim().toUpperCase();
 const prefix=board.startsWith('esp32:')?/^(?:ESP32(?:-S3|-C3)?|M5STACK)(?:\s+|\s*[:.]\s*)/:board.startsWith('esp8266:')?/^(?:ESP8266|NODEMCU)(?:\s+|\s*[:.]\s*)/:/^(?:ARDUINO(?: UNO| NANO| MEGA| LEONARDO)?|UNO|NANO|MEGA|LEONARDO)(?:\s+|\s*[:.]\s*)/;
 pin=pin.replace(prefix,'').trim();
 if(/^(?:GND|GROUND)$/.test(pin))return 'GND';
 if(/^(?:3V3|3[.,]3\s*V)$/.test(pin))return '3.3V';
 if(/^5\s*V$/.test(pin))return '5V';
 if(board.startsWith('arduino:avr:')&&/^\d+$/.test(pin))return 'D'+pin;
 return pin.replace(/^GPIO\s*(\d+)$/,'GPIO$1');
}
export function isBoardConnectionSource(value,board='arduino:avr:uno'){
 const pin=normalizeElectricalPin(value,board);
 return /^(?:\d+|D\d+|A\d+|GPIO\d+|5V|3\.3V|GND|VIN|VUSB|VBUS|AREF|SDA|SCL|SCK|MOSI|MISO|RX\d*|TX\d*)$/.test(pin)||
  // Retain this explicitly conditional supply choice from the curated SD guide.
  pin==='3.3V / REGULATED 5V*';
}
export function reviewElectricalDesign({board='arduino:avr:uno',connections=[],components=[]}={}){
 const findings=[],boardInfo=BOARD_LIMITS[board];
 const add=(severity,code,message)=>{if(!findings.some(f=>f.code===code&&f.message===message))findings.push({severity,code,message});};
 const normalized=(Array.isArray(connections)?connections:[]).map(c=>{if(!c||typeof c.pin!=='string')return c;const pin=normalizeElectricalPin(c.pin,board);return {...c,pin,kind:pin==='GND'&&['power','ground'].includes(c.kind)?'ground':c.kind};});
 if(!boardInfo)add('unknown','BOARD_UNSUPPORTED','Board electrical limits are not documented for this target.');
 if(!Array.isArray(connections)||!connections.length)add('unknown','NETLIST_MISSING','No structured wiring netlist was supplied.');
 const nets=new Map();
 const netKinds=new Map();
 const knownKinds=new Set(['digital-input','digital-output','analog-input','i2c','spi','power','ground','conditional']);
 for(const c of normalized){
  if(!c||typeof c.pin!=='string'||typeof c.net!=='string'||!c.pin||!c.net){add('error','CONNECTION_INCOMPLETE','Connection lacks a pin or net.');continue;}
  if(typeof c.to!=='string'||!c.to.trim()||!knownKinds.has(c.kind))add('unknown','CONNECTION_DETAILS_MISSING','Connection '+c.pin+' lacks a documented destination or signal type.');
  if(!isBoardConnectionSource(c.pin,board))add('error','SOURCE_NOT_BOARD_PIN','Source '+c.pin+' is not an identified board terminal. Use an actual GPIO or board rail; component terminals and code variable names must not be drawn on the controller.');
  const endpoints=[c.pin,c.to].join(' ').replace(/_/g,' ');
  if(boardInfo?.logicVoltage===3.3&&/\\bLED\\b/i.test(endpoints)&&!/(?:resistor|\\b\\d+\\s*[-–]?\\s*\\d*\\s*Ω|ohm)/i.test(endpoints))add('error','LED_RESISTOR_MISSING','An LED connection must document a suitable series current-limiting resistor; do not connect an LED directly to a GPIO.');
  if(boardInfo?.logicVoltage===3.3&&/(?:5\\s*V|5\\.0\\s*V|5V)/i.test(String(c.to||''))&&/GPIO\\d+/i.test(c.pin)&&typeof c.signalVoltage!=='number')add('unknown','GPIO_VOLTAGE_UNSPECIFIED','The connection mentions a 5 V signal but does not declare its voltage. Verify level shifting and keep ESP32 GPIO signals within 3.3 V limits.');
  if(/ACS712/i.test(endpoints)&&/\b(?:VCC|SUPPLY)\b/i.test(endpoints)&&[c.pin,c.to,c.net].some(value=>normalizeElectricalPin(value,board)==='3.3V'))add('error','ACS712_SUPPLY','ACS712 VCC is connected to 3.3 V. The standard ACS712 requires a 5 V supply; verify the exact breakout and protect the ESP32 ADC from excessive output voltage.');
  if(/ACS712/i.test(endpoints)&&/\b(?:OUT|VIOUT|OUTPUT)\b/i.test(endpoints)&&boardInfo?.logicVoltage===3.3)add('warning','ACS712_ADC_RANGE','Verify ACS712 output conditioning and the full current range before connecting to a 3.3 V ADC. A 5 V-powered sensor output must not exceed the board input limits.');
  if(/SIM(?:900A?|800L?)(?=[\s_.:/-]|$)/i.test(c.to||'')){
   const target=String(c.to).replace(/_/g,' ');
   if(/\b(?:VCC\d?|VBAT|SUPPLY|POWER)\b/i.test(target)&&/^(?:5V|3\.3V|VIN|D\d+|GPIO\d+|A\d+)$/.test(c.pin))add('error','MODEM_SUPPLY_UNVERIFIED','Do not power the cellular modem from a board rail or GPIO. Identify the exact breakout supply input and use a suitable separate supply with common ground and verified transmit-burst current capacity. A VCC5 breakout input and raw VBAT have different voltage limits.');
   if(/\b(?:RXD?|TXD?|UART)\b/i.test(target)){
    add('unknown','MODEM_UART_LEVELS','Verify the exact modem UART logic levels and both signal directions. Raw modem UART and level-shifted breakout terminals are different interfaces; include any required level translator in the wiring plan.');
    if(boardInfo?.logicVoltage===5&&/\bRXD?\b/i.test(target)&&!/(?:level[ -]shift|translator|divider)/i.test(target))add('error','MODEM_RX_LEVEL_SHIFT','A 5 V board output must not connect directly to an unverified modem RX terminal. Document a suitable level translator and the exact modem interface before wiring.');
   }
  }
  if(c.kind==='power'&&!['5V','3.3V'].includes(c.pin)&&!c.pin.startsWith('VIN'))add('unknown','POWER_SOURCE_UNVERIFIED','Power source '+c.pin+' needs a board-specific supply review.');
  if(c.kind==='ground'&&c.pin!=='GND')add('unknown','GROUND_REFERENCE_UNVERIFIED','Ground reference on '+c.pin+' requires review.');
  if(boardInfo?.pins&&!boardInfo.pins.has(c.pin)&&!['5V','3.3V','GND'].includes(c.pin))add('error','PIN_UNKNOWN','Unsupported board pin '+c.pin);
  if(boardInfo?.inputOnly?.has(c.pin)&&['digital-output','i2c','spi'].includes(c.kind))add('error','INPUT_ONLY_PIN',''+c.pin+' is input-only on the classic ESP32; it cannot drive an output, I²C or SPI signal.');
  if(boardInfo?.strapping?.has(c.pin))add('warning','BOOT_STRAPPING_PIN',c.pin+' is a boot-strapping pin. Attached circuitry can change boot mode or flash voltage; verify reset-time levels.');
  if(boardInfo?.uart0?.has(c.pin))add('warning','UART0_PIN_CONFLICT',c.pin+' is commonly used by UART0 for USB programming and boot logs. Verify the board USB bridge and serial workflow before reassigning it.');
  if(boardInfo?.usb?.has(c.pin))add('warning','USB_PIN_CONFLICT',c.pin+' is shared with a native USB data signal on this ESP32 family. Verify the board USB interface before repurposing it.');
  if(boardInfo?.conditionalFlash?.has(c.pin))add('unknown','S3_FLASH_PSRAM_PIN',c.pin+' may be used by octal flash/PSRAM on this ESP32-S3 module variant. Check the exact module datasheet before use.');
  if(boardInfo?.adc2?.has(c.pin)&&c.kind==='analog-input')add('warning','ADC2_WIFI_CONFLICT',c.pin+' uses ADC2 on classic ESP32. ADC2 analog reads are unavailable while Wi-Fi is active; prefer an ADC1 pin (GPIO32–39) for Wi-Fi projects.');

  if(!['5V','3.3V','GND'].includes(c.pin)){
   if(nets.has(c.pin)&&nets.get(c.pin)!==c.net)add('error','PIN_CONFLICT','Multiple nets assigned to '+c.pin);
   nets.set(c.pin,c.net);
  }
  if(c.net){
   const previousKinds=netKinds.get(c.net)||new Set();
   if(c.kind==='digital-output'&&previousKinds.has('digital-output'))add('error','OUTPUT_CONTENTION','Net '+c.net+' connects multiple digital outputs. Check for GPIO output contention or an unintended short.');
   previousKinds.add(c.kind);netKinds.set(c.net,previousKinds);
  }
  if(c.kind==='power'&&c.pin==='5V'&&boardInfo?.logicVoltage===3.3)add('warning','FIVE_VOLT_RAIL','5 V rail requires explicit board-specific power verification.');
  if(typeof c.signalVoltage==='number'&&boardInfo&&c.signalVoltage>boardInfo.logicVoltage+0.1&&c.kind!=='power')add('error','LOGIC_OVERVOLTAGE','Signal exceeds nominal logic voltage on '+c.pin);
 }
 if(Array.isArray(connections)&&connections.length&&!normalized.some(c=>c?.kind==='ground'&&c.pin==='GND'))add('unknown','GROUND_PATH_UNVERIFIED','No common ground connection is documented.');
 if(!Array.isArray(components)||!components.length)add('unknown','COMPONENT_RATINGS_MISSING','Component electrical ratings have not been supplied.');
 for(const c of Array.isArray(components)?components:[]){
  if(!c||!c.name){add('unknown','COMPONENT_UNIDENTIFIED','A component has no identified part number.');continue;}
  if(typeof c.supplyVoltage==='number'&&typeof c.maxSupplyVoltage==='number'&&c.supplyVoltage>c.maxSupplyVoltage)add('error','SUPPLY_OVERVOLTAGE',c.name+' supply exceeds its stated maximum.');
  if(typeof c.supplyVoltage==='number'&&typeof c.minSupplyVoltage==='number'&&c.supplyVoltage<c.minSupplyVoltage)add('error','SUPPLY_UNDERVOLTAGE',c.name+' supply is below its stated minimum.');
  if(typeof c.loadCurrentMa==='number'&&typeof c.maxCurrentMa==='number'&&c.loadCurrentMa>c.maxCurrentMa)add('error','OVERCURRENT',c.name+' load exceeds its stated current rating.');
  if(typeof c.dissipationW==='number'&&typeof c.maxDissipationW==='number'&&c.dissipationW>c.maxDissipationW)add('error','POWER_RATING',c.name+' dissipation exceeds its stated power rating.');
  if(!Number.isFinite(c.maxSupplyVoltage)||!Number.isFinite(c.maxCurrentMa))add('unknown','RATINGS_INCOMPLETE',c.name+' lacks verified voltage/current limits.');
 }
 // Passing is reserved for designs with documented electrical ratings and board-specific pin limits.
 if(boardInfo&&(!boardInfo.pins||boardInfo.pinoutReferenceOnly))add('unknown','BOARD_PINOUT_UNVERIFIED','The selected target does not identify an exact physical PCB pinout. Verify the board revision and exposed header labels before wiring.');
 if(Array.isArray(connections)&&connections.some(c=>c?.kind==='conditional'||c?.kind==='unverified'))add('unknown','CONDITIONAL_CONNECTION','Conditional or unverified wiring requires a specific module datasheet.');
 const blocked=findings.some(f=>f.severity==='error');
 const incomplete=findings.some(f=>f.severity==='unknown');
 return {status:blocked?'failed':incomplete?'incomplete':'checks-passed',hardwareValidated:false,findings,notice:'Static checks only; no physical testing, certification, or full circuit simulation performed.'};
}
