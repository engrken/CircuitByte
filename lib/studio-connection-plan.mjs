import {normalizeElectricalPin} from './studio-electrical-verification.mjs';
// A code identifier is not a physical component terminal. Never turn it into hardware.
export function prepareConnectionPlan(rows=[],code='',board='arduino:avr:uno'){
 const aliases=new Map();
 const clean=String(code).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 for(const m of clean.matchAll(/(?:#define\s+|\b(?:const\s+)?(?:int|byte|uint8_t|uint16_t|unsigned\s+int)\s+)([A-Za-z_]\w*)\s*(?:=\s*)?(\d+|[A-Za-z_]\w*)\s*(?:;|$)/gm))aliases.set(m[1],m[2]);
 function resolve(pin){let p=pin;const seen=new Set();while(aliases.has(p)&&!seen.has(p)){seen.add(p);p=aliases.get(p);}return normalizeElectricalPin(p,board);}
 const connections=[],rejected=[],seen=new Set();
 for(const row of Array.isArray(rows)?rows:[]){
  if(!row||typeof row.pin!=='string'||typeof row.to!=='string')continue;
  const to=row.to.trim(),pin=resolve(row.pin.trim());
  if(/^(?:\d+|GPIO\s*\d+|D\d+|A\d+|SDA|SCL)$/i.test(to)||aliases.has(to)||/^[A-Z][A-Z0-9]*_(?:PIN|SDA|SCL|OUT|IN)$/.test(to)){
   rejected.push(row);continue;
  }
  const key=pin+'|'+to.toLowerCase();if(seen.has(key))continue;seen.add(key);
  connections.push({...row,pin,kind:pin==='GND'&&['power','ground'].includes(row.kind)?'ground':row.kind});
 }
 return {connections,rejected};
}
