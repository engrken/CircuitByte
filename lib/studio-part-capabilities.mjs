// Hardware capability labels for the entire CircuitByte catalog. No fictional libraries.
// Hardware does not always require a special Arduino library.
const ADVANCED = {
  'cb-062':'ESP8266 board: requires its own board core, not Arduino UNO compilation.',
  'cb-063':'ESP32 board: requires its own board core, not Arduino UNO compilation.',
  'cb-064':'ESP32 expansion: confirm the attached ESP32 board and its core.',
  'cb-068':'DS1302 uses a three-wire RTC protocol; a particular RTC library must be chosen for the module and sketch.',
  'cb-040':'Heartbeat sensors have variant-specific algorithms and code. Verify actual sensor hardware before selecting a library.',
  'cb-047':'Mercury-containing tilt component: handling and disposal need special attention.'
};
const GUIDED = new Set(['cb-018','cb-019','cb-030','cb-050','cb-055','cb-056','cb-061','cb-066','cb-067','cb-070','cb-071','cb-072','cb-077','cb-079','cb-083']);
const OPTIONAL = new Set(['cb-015','cb-022','cb-023','cb-024','cb-027','cb-044','cb-045','cb-049','cb-053','cb-054','cb-057','cb-070','cb-071','cb-072','cb-074','cb-075','cb-081','cb-082']);
export function getStudioPartCapability(part,registry){
 const match=Object.entries(registry).filter(([,lib])=>lib.products.includes(part.id));
 const managed=[...new Set(match.map(([,lib])=>lib.name).filter(Boolean))];
 const builtIn=match.filter(([,lib])=>!lib.name).map(([id])=>id);
 if(ADVANCED[part.id])return {id:part.id,name:part.name,status:part.id==='cb-062'||part.id==='cb-063'||part.id==='cb-064'?'different-board':'verify-variant',libraries:managed,builtIn,note:ADVANCED[part.id]};
 if(managed.length)return {id:part.id,name:part.name,status:'managed-library',libraries:managed,builtIn,note:'Automatic library suggestion; confirm hardware variant and library API.'};
 if(builtIn.length)return {id:part.id,name:part.name,status:'core-library',libraries:[],builtIn,note:'Uses Arduino AVR core support; no external library required.'};
 if(OPTIONAL.has(part.id))return {id:part.id,name:part.name,status:'optional-library',libraries:[],builtIn:[],note:'Can work with built-in Arduino APIs. Add a trusted library manually if your particular sketch needs one.'};
 return {id:part.id,name:part.name,status:'standard-arduino',libraries:[],builtIn:[],note:'No dedicated external library is required for ordinary UNO use; verify the component electrical interface.'};
}
export function auditStudioCatalog(products,registry){
 const out=products.map(item=>getStudioPartCapability(item,registry));
 return {total:out.length,mapped:out.filter(x=>x.status==='managed-library').length,core:out.filter(x=>x.status==='core-library').length,
  special:out.filter(x=>x.status==='different-board'||x.status==='verify-variant').length,items:out};
}
