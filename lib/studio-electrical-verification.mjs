// Conservative static electrical review. Never equate passing these checks with hardware validation.
const BOARD_LIMITS={
 'arduino:avr:uno':{logicVoltage:5,pins:new Set([...Array.from({length:14},(_,i)=>'D'+i),...Array.from({length:6},(_,i)=>'A'+i)])},
 'esp8266:esp8266:nodemcuv2':{logicVoltage:3.3},
 'esp32:esp32:esp32':{logicVoltage:3.3}
};
export function reviewElectricalDesign({board='arduino:avr:uno',connections=[],components=[]}={}){
 const findings=[],boardInfo=BOARD_LIMITS[board];
 const add=(severity,code,message)=>findings.push({severity,code,message});
 if(!boardInfo)add('unknown','BOARD_UNSUPPORTED','Board electrical limits are not documented for this target.');
 if(!Array.isArray(connections)||!connections.length)add('unknown','NETLIST_MISSING','No structured wiring netlist was supplied.');
 const nets=new Map();
 for(const c of Array.isArray(connections)?connections:[]){
  if(!c||typeof c.pin!=='string'||typeof c.net!=='string'||!c.pin||!c.net){add('error','CONNECTION_INCOMPLETE','Connection lacks a pin or net.');continue;}
  if(boardInfo?.pins&&!boardInfo.pins.has(c.pin)&&!['5V','3.3V','GND'].includes(c.pin))add('error','PIN_UNKNOWN','Unsupported board pin '+c.pin);
  if(!['5V','3.3V','GND'].includes(c.pin)){
   if(nets.has(c.pin)&&nets.get(c.pin)!==c.net)add('error','PIN_CONFLICT','Multiple nets assigned to '+c.pin);
   nets.set(c.pin,c.net);
  }
  if(c.kind==='power'&&c.pin==='5V'&&boardInfo?.logicVoltage===3.3)add('warning','FIVE_VOLT_RAIL','5 V rail requires explicit board-specific power verification.');
  if(typeof c.signalVoltage==='number'&&boardInfo&&c.signalVoltage>boardInfo.logicVoltage+0.1&&c.kind!=='power')add('error','LOGIC_OVERVOLTAGE','Signal exceeds nominal logic voltage on '+c.pin);
 }
 if(!Array.isArray(components)||!components.length)add('unknown','COMPONENT_RATINGS_MISSING','Component electrical ratings have not been supplied.');
 for(const c of Array.isArray(components)?components:[]){
  if(!c||!c.name){add('unknown','COMPONENT_UNIDENTIFIED','A component has no identified part number.');continue;}
  if(typeof c.supplyVoltage==='number'&&typeof c.maxSupplyVoltage==='number'&&c.supplyVoltage>c.maxSupplyVoltage)add('error','SUPPLY_OVERVOLTAGE',c.name+' supply exceeds its stated maximum.');
  if(typeof c.supplyVoltage==='number'&&typeof c.minSupplyVoltage==='number'&&c.supplyVoltage<c.minSupplyVoltage)add('error','SUPPLY_UNDERVOLTAGE',c.name+' supply is below its stated minimum.');
  if(typeof c.loadCurrentMa==='number'&&typeof c.maxCurrentMa==='number'&&c.loadCurrentMa>c.maxCurrentMa)add('error','OVERCURRENT',c.name+' load exceeds its stated current rating.');
  if(typeof c.dissipationW==='number'&&typeof c.maxDissipationW==='number'&&c.dissipationW>c.maxDissipationW)add('error','POWER_RATING',c.name+' dissipation exceeds its stated power rating.');
  if(!Number.isFinite(c.maxSupplyVoltage)||!Number.isFinite(c.maxCurrentMa))add('unknown','RATINGS_INCOMPLETE',c.name+' lacks verified voltage/current limits.');
 }
 const blocked=findings.some(f=>f.severity==='error');
 const incomplete=findings.some(f=>f.severity==='unknown');
 return {status:blocked?'failed':incomplete?'incomplete':'checks-passed',hardwareValidated:false,findings,notice:'Static checks only; no physical testing, certification, or full circuit simulation performed.'};
}
