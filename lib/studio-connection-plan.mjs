import {normalizeElectricalPin,isBoardConnectionSource} from './studio-electrical-verification.mjs';
// A code identifier is not a physical component terminal. Never turn it into hardware.
export function prepareConnectionPlan(rows=[],code='',board='arduino:avr:uno'){
 const aliases=new Map();
 const clean=String(code).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 for(const m of clean.matchAll(/(?:#define\s+|\b(?:const\s+)?(?:int|byte|uint8_t|uint16_t|unsigned\s+int)\s+)([A-Za-z_]\w*)\s*(?:=\s*)?(\d+|[A-Za-z_]\w*)\s*(?:;|$)/gm))aliases.set(m[1],m[2]);
 function resolve(pin){let p=pin;const seen=new Set();while(aliases.has(p)&&!seen.has(p)){seen.add(p);p=aliases.get(p);}return normalizeElectricalPin(p,board);}
 const connections=[],rejected=[],issues=[],seen=new Set();
 function reject(row,code,message){rejected.push(row);issues.push({code,message,pin:row?.pin||'',to:row?.to||''});}
 for(const row of Array.isArray(rows)?rows:[]){
  if(!row||typeof row.pin!=='string'||typeof row.to!=='string'){reject(row,'CONNECTION_MALFORMED','Each connection needs a board source and a hardware destination.');continue;}
  const to=row.to.trim(),pin=resolve(row.pin.trim());
  const namedModuleTerminal=/^(?:ACS712|DHT11|DHT22|HC-SR04|SIM900A|SIM800L?|NEO-6M|HC-05)_(?:VCC|GND|OUT|DATA|TRIG|ECHO|RXD?|TXD?)(?:$|_)/i.test(to);
  if(!isBoardConnectionSource(pin,board)){reject(row,'SOURCE_NOT_BOARD_PIN','Source '+row.pin+' is not an actual board pin. A module terminal or unresolved code alias cannot be placed on the controller.');continue;}
  if(/^(?:ARDUINO\b|UNO\b|NANO\b|MEGA\b|LEONARDO\b|ESP32\b|ESP8266\b|NODEMCU\b|M5STACK\b)/i.test(to)){
   reject(row,'DESTINATION_IS_CONTROLLER','Destination '+to+' identifies a controller instead of the external component and its terminal.');continue;
  }
  if(!to||/^(?:\d+|GPIO\s*\d+|D\d+|A\d+|SDA|SCL)$/i.test(to)||aliases.has(to)||/^[A-Z][A-Z0-9_]*_(?:PIN|GPIO)$/.test(to)||(!namedModuleTerminal&&/^[A-Z][A-Z0-9]*_(?:SDA|SCL|OUT|IN)$/.test(to))){
   reject(row,'DESTINATION_NOT_HARDWARE','Destination '+to+' is a code alias or an incomplete terminal. Name the actual component and its pin.');continue;
  }
  if(/(?:^|_)(?:PIN|GPIO)$/.test(String(row.net||''))&&!/\b(?:VCC|VDD|VIOUT|OUT|AO|AOUT|SIG|SIGNAL|DATA|GND|GROUND|SDA|SCL|RXD?|TXD?|TRIG|ECHO|VRX|VRY|ANODE|CATHODE)\b/i.test(to.replace(/_/g,' '))){
   reject(row,'TERMINAL_MISSING','Destination '+to+' has no physical terminal; '+row.net+' is only a code/net label.');continue;
  }
  const key=pin+'|'+to.toLowerCase();if(seen.has(key))continue;seen.add(key);
  connections.push({...row,pin,kind:pin==='GND'&&['power','ground'].includes(row.kind)?'ground':row.kind});
 }
 return {connections,rejected,issues};
}
