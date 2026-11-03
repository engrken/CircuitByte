// Reviewed against the live 101-product catalog, 2026-11-03.
// Unknown future listings remain unreviewed rather than inheriting a compatibility claim.
const GROUPS = [
 ['hardware-only','001 002 003 004 005 006 007 008 010 011 013 014 031 032 033 065 069 075 076 084 085 086 087 088 089 090','Physical component, supply or assembly item; no dedicated Arduino library. Check ratings and circuit design.'],
 ['core-io','009 012 015 016 017 020 021 022 023 024 025 026 028 029 034 035 036 037 038 039 041 042 043 044 046 047 048 049 051 052 057 058 060 073 078 080 082 091 092','Uses GPIO, ADC, PWM or timing functions from the selected board core; no dedicated library is required. Check logic levels and the module interface.'],
 ['verify-variant','027 040 053 054','The listing does not identify the exact sensing chip. Confirm the model before choosing a driver or conversion formula.'],
 ['board-core','059','UNO R3 uses the Arduino AVR board core; board support is installed with the toolchain.'],
 ['different-board','062','NodeMCU uses the ESP8266 core, including Wi-Fi libraries. Select ESP8266 in Studio.'],
 ['different-board','063 064','ESP32 uses the ESP32 core, including Wi-Fi and hardware UART support. The expansion board itself needs no library.'],
 ['core-io','074','HC-SR04 can use trigger GPIO and pulseIn; NewPing is optional. Check echo voltage against the board input rating.'],
 ['core-io','093 094 095 096 097 098 099 100 101','MQ sensors can use analogRead; MQUnifiedsensor is optional for calibrated calculations. Confirm the exact model, heater cycle and calibration before interpreting gas concentration.'],
 ['serial','018','HC-05 uses UART AT commands / serial data. Use SoftwareSerial on UNO or the appropriate hardware UART on ESP32.'],
 ['serial','061','SIM900A uses UART AT commands; TinyGSM is optional for network clients. Set the modem macro before including its header; confirm power and local 2G availability.'],
 ['managed-library','019 030 045 050 055 056 066 067 068 070 071 072 077 079 081 083','Library suggestions are tied to this product; confirm the selected board, hardware variant and sketch API.']
];
const CLASSIFICATION=new Map(GROUPS.flatMap(([status,ids,note])=>ids.split(' ').map(id=>['cb-'+id,{status,note}])));
export function getStudioPartCapability(part,registry){
 const match=Object.entries(registry).filter(([,lib])=>lib.products.includes(part.id)||(lib.optionalProducts||[]).includes(part.id));
 const recommendations=match.filter(([,lib])=>lib.name).map(([id,lib])=>({id,name:lib.name,optional:!lib.products.includes(part.id),reason:lib.reason}));
 const libraries=[...new Set(recommendations.map(lib=>lib.name))];
 const builtIn=match.filter(([,lib])=>!lib.name).map(([id])=>id);
 const classification=CLASSIFICATION.get(part.id)||{status:'needs-review',note:'New or unclassified product: confirm its controller/interface, then search Arduino Library Manager. No driver compatibility has been assumed.'};
 return {id:part.id,name:part.name,...classification,libraries,builtIn,recommendations};
}
export function auditStudioCatalog(products,registry){
 const items=products.map(item=>getStudioPartCapability(item,registry));
 return {total:items.length,mapped:items.filter(x=>x.recommendations.length).length,core:items.filter(x=>['core-io','serial','board-core'].includes(x.status)).length,
  special:items.filter(x=>['different-board','verify-variant','needs-review'].includes(x.status)).length,items};
}
