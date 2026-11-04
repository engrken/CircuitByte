// Versioned, user-owned bench evidence. This is never an AI or compiler certification.
export const ACCEPTANCE_STATUSES=['not-tested','failed','passed-by-user'];
const DEFAULT_CRITERIA=[
 {id:'power-off',title:'Power-off wiring and continuity',expected:'Power disconnected; correct polarity; no unintended supply-to-ground short.'},
 {id:'supply',title:'Measured operating supply',expected:'Measured supply voltage is within the verified limits of the board and modules.'},
 {id:'module',title:'Sensor and actuator responses',expected:'Each selected input and output behaves as specified on the real hardware.'},
 {id:'behavior',title:'End-to-end project result',expected:'Observed behavior matches the agreed measurable project objective.'}
];
export function createAcceptanceRecord(){
 return {version:1,revision:1,scope:'',boardModel:'',supplyNotes:'',
  criteria:DEFAULT_CRITERIA.map(item=>({...item,observed:'',status:'not-tested'}))};
}
export function acceptanceScope({board='',code='',prompt='',selected=[],moduleIds=[],boardModel='',supplyNotes=''}={}){
 // Store an exact comparison key (not a collision-prone short hash). Changing sketch, parts,
 // board, intended behavior or power requirements invalidates previous bench evidence.
 return JSON.stringify([board,code,prompt,[...selected].sort(),[...moduleIds].sort(),boardModel,supplyNotes]);
}
export function acceptanceSummary(record,scope){
 const items=Array.isArray(record?.criteria)?record.criteria:[];
 const evidence=items.some(item=>item.status!=='not-tested'||String(item.observed||'').trim());
 const stale=evidence && record?.scope!==scope;
 const active=record?.scope===scope&&!stale;
 const passed=active?items.filter(x=>x.status==='passed-by-user').length:0;
 const failed=active?items.filter(x=>x.status==='failed').length:0;
 return {total:items.length,passed,failed,untested:items.length-passed-failed,stale,
  complete:active&&items.length>0&&passed===items.length,
  label:stale?'Stale evidence — start a new revision':passed+' of '+items.length+' user-tested criteria passed'};
}
export function rebaseAcceptance(record,scope){
 return {...record,version:1,revision:(record?.revision||1)+1,scope,
  criteria:(record?.criteria||[]).map(item=>({...item,status:'not-tested',observed:''}))};
}
