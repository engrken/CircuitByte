// Recognize hardware names independently of terminal separators. Preserve unknown
// labels and explicit instance numbers so distinct modules are never merged.
export function hardwareDeviceName(value){
 const label=String(value||'').trim();
 const match=/^(HC-SR04|I[²2]C LCD|LCD1602|LCD|DHT(?:11|22)|ACS712|DS3231|DS1302|NEO-6M|SIM900A|SIM800L?|HC-05|OLED|SSD1306|SG90|MG90S|MG996R|Servo|MQ-?\d+|LED|relay|buzzer|motor|photoresistor|LDR)(?=[\s_.:/-]|$)(?:[\s_]+#?(\d+)(?=[\s_.:/-]|$))?/i.exec(label);
 return match?match[1].toUpperCase()+(match[2]?' '+match[2]:''):label;
}
export function hardwareDeviceType(name){
 return /SIM900A|SIM800|NEO-6M|HC-05/.test(name)?'serial':/LCD|OLED|SSD1306/.test(name)?'display':/SERVO|SG90|MG9/.test(name)?'servo':/^LED/.test(name)?'led':/^RELAY/.test(name)?'relay':/^BUZZER/.test(name)?'buzzer':/^MOTOR/.test(name)?'motor':/DHT|HC-SR04|ACS712|MQ|PHOTORESISTOR|LDR/.test(name)?'sensor':'module';
}
export function groupHardwareDevices(connections=[]){
 const devices=[];
 for(const [index,row] of connections.entries()){
  if(!row||typeof row.to!=='string')continue;
  const name=hardwareDeviceName(row.to);
  let device=devices.find(d=>d.name===name);
  if(!device){device={name,type:hardwareDeviceType(name),rows:[]};devices.push(device);}
  device.rows.push({...row,index});
 }
 return devices;
}
export function hardwareDeviceState(device,{stale=false,demo=false,trigger=false,supported=false,output={},pinNumber}={}){
 // UART traffic and power rails are not boolean actuators or sensor readings.
 if(stale||!['led','relay','buzzer','motor'].includes(device.type))return null;
 if(demo)return trigger;
 if(!supported)return null;
 const states=device.rows.filter(r=>r.kind==='digital-output').map(row=>{
  const pin=pinNumber(row.pin);
  return /^\d+$/.test(pin)&&Object.hasOwn(output,Number(pin))?output[Number(pin)]:null;
 }).filter(value=>value!==null);
 return states.length&&states.every(value=>value===states[0])?states[0]:null;
}
