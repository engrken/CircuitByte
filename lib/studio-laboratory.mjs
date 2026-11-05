// Guided, browser-only CircuitByte laboratory. No trusted hardware or grade claims.
import {allEndpoints,analyzeCircuit,canonicalBreadboardNode,fromTemplate,normalizeCircuit,PART_TYPES} from './studio-circuit-builder.mjs';
import {measureDcVoltage,simulateDcCircuit} from './studio-dc-simulator.mjs';

export const LAB_STORAGE_KEY='circuitbyte.guided-laboratory.v1';
export const LAB_ACTIVITIES=Object.freeze([
 {id:'divider',title:'DC Voltage Divider',level:'Beginner',minutes:15,template:'divider',objective:'Use two 330 Ω resistors to divide a 5 V DC source, measure the midpoint, and compare the series current with Ohm’s law.',
  steps:['Load the starter circuit and inspect how the 5 V, midpoint and ground nets are connected.','Select the midpoint as the positive voltmeter probe and UNO GND as the reference.','Capture the midpoint voltage, then capture the current through the upper resistor.'],
  checkpoints:[{id:'mid',label:'Midpoint potential',mode:'voltage',probe:'r1:B',reference:'uno:GND',expected:2.5,tolerance:0.05,unit:'V',hint:'Probe r1:B against UNO GND; two equal series resistors split 5 V in half.'},{id:'current',label:'Series resistor current',mode:'current',part:'r1',expected:5/660*1000,tolerance:0.2,unit:'mA',hint:'Current through a 660 Ω series chain should be approximately 7.58 mA.'}]},
 {id:'potentiometer',title:'Potentiometer as a Voltage Divider',level:'Beginner',minutes:15,template:'potentiometer',objective:'Explore how changing a 10 kΩ potentiometer shifts its modeled wiper voltage.',
  steps:['Load the potentiometer starter, with its outer pins connected to 5 V and GND.','Measure the wiper with the slider at 20%.','Move the slider to 80% and capture the new reading.'],
  checkpoints:[{id:'low',label:'Wiper at 20%',mode:'voltage',probe:'pot1:WIPER',reference:'uno:GND',settings:{potPercent:20},expected:1,tolerance:0.08,unit:'V',hint:'Set the slider to exactly 20% and probe pot1:WIPER against UNO GND.'},{id:'high',label:'Wiper at 80%',mode:'voltage',probe:'pot1:WIPER',reference:'uno:GND',settings:{potPercent:80},expected:4,tolerance:0.08,unit:'V',hint:'Set the slider to exactly 80% and use the same reference.'}]},
 {id:'led',title:'LED Current and Digital Output',level:'Beginner',minutes:20,template:'blink',objective:'Observe how an idealized Arduino D13 HIGH/LOW signal changes current through a series resistor and red LED.',
  steps:['Load the safe LED-and-resistor starter; identify the LED polarity and series resistor.','Select Manual GPIO D13 and set HIGH. Record the LED forward current.','Set D13 LOW and record the expected zero current.'],
  checkpoints:[{id:'on',label:'LED ON at D13 HIGH',mode:'current',part:'led1',settings:{drivePin:'D13',driveHigh:true},expected:3/340*1000,tolerance:0.3,unit:'mA',hint:'Choose D13 HIGH. The simplified diode model uses a 2 V drop with a 330 Ω resistor and 10 Ω diode resistance.'},{id:'off',label:'LED OFF at D13 LOW',mode:'current',part:'led1',settings:{drivePin:'D13',driveHigh:false},expected:0,tolerance:0.05,unit:'mA',hint:'Keep D13 selected but set its output assumption to LOW.'}]},
 {id:'ldr',title:'Light-Sensitive Divider',level:'Intermediate',minutes:20,template:'ldr-divider',objective:'Model a photoresistor in a DC voltage divider and compare the effect of changing its resistance.',
  steps:['Load the LDR divider circuit with a fixed 330 Ω top resistor.','Set the LDR to 1,000 Ω, then measure the midpoint.','Set the LDR to 100,000 Ω and measure the midpoint again.'],
  checkpoints:[{id:'bright',label:'Lower LDR resistance',mode:'voltage',probe:'r1:B',reference:'uno:GND',settings:{ldrOhms:1000},expected:5*1000/1330,tolerance:0.07,unit:'V',hint:'Set the LDR to 1,000 Ω and use r1:B relative to UNO GND.'},{id:'dark',label:'Higher LDR resistance',mode:'voltage',probe:'r1:B',reference:'uno:GND',settings:{ldrOhms:100000},expected:5*100000/100330,tolerance:0.07,unit:'V',hint:'Set the LDR to 100,000 Ω and use r1:B relative to UNO GND.'}]}
]);
export function getLabActivity(id){return LAB_ACTIVITIES.find(activity=>activity.id===id)||null;}

// Compare component/board terminal connectivity, not physical breadboard hole positions.
// Equivalent series wiring on another row is accepted; extra or wrong part types are not.
function electricalSignature(project){
 const p=normalizeCircuit(project),parents=new Map(allEndpoints(p.parts).map(id=>[id,id]));
 const root=id=>{let x=id;while(parents.get(x)!==x)x=parents.get(x);return x;};
 const join=(a,b)=>{const x=root(a),y=root(b);if(x!==y)parents.set(x,y);};
 const rows=new Map();
 for(const id of parents.keys()){
  const row=canonicalBreadboardNode(id);if(!row)continue;
  if(rows.has(row))join(id,rows.get(row));else rows.set(row,id);
 }
 for(const w of p.wires)join(w.a,w.b);
 const terminals=[...allEndpoints(p.parts).filter(id=>id.startsWith('uno:')||!id.startsWith('bb:'))].sort();
 const groups=new Map();
 for(const id of terminals){const r=root(id);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(id);}
 return [...groups.values()].map(g=>g.join('|')).sort().join(';');
}
export function labWiringMatches(input,labId){
 const lab=getLabActivity(labId);if(!lab)return false;
 let p;try{p=normalizeCircuit(input);}catch{return false;}
 const base=fromTemplate(lab.template);
 if(p.parts.length!==base.parts.length)return false;
 if(p.parts.some(x=>!base.parts.some(y=>y.id===x.id&&y.type===x.type)))return false;
 return electricalSignature(p)===electricalSignature(base);
}
export function labProjectFingerprint(input){return JSON.stringify(normalizeCircuit(input));}
const settingsMatch=(actual,wanted={})=>Object.entries(wanted).every(([key,value])=>actual?.[key]===value);

export function evaluateLabCapture({labId,checkpointId,project,settings={},probe='',reference='uno:GND'}){
 const lab=getLabActivity(labId),checkpoint=lab?.checkpoints.find(c=>c.id===checkpointId);
 if(!checkpoint)return {passed:false,reason:'Unknown laboratory checkpoint.'};
 let fingerprint;try{fingerprint=labProjectFingerprint(project);}catch{return {passed:false,reason:'Invalid circuit. Rebuild the starter experiment.'};}
 const report=analyzeCircuit(project);
 if(report.errors.length)return {passed:false,reason:'Correct all electrical rule errors first.'};
 if(!labWiringMatches(project,labId))return {passed:false,reason:'Your connected component nets do not match this experiment. Check the wiring or load its starter circuit.'};
 if(!settingsMatch(settings,checkpoint.settings))return {passed:false,reason:checkpoint.hint};
 if(checkpoint.mode==='voltage'&&(probe!==checkpoint.probe||reference!==checkpoint.reference))return {passed:false,reason:checkpoint.hint};
 const sim=simulateDcCircuit(project,settings);
 if(sim.status!=='modeled'||sim.unsupported.length)return {passed:false,reason:sim.reason||'Circuit is not supported by this DC model.'};
 const measured=checkpoint.mode==='voltage'?measureDcVoltage(sim,probe,reference):sim.currents[checkpoint.part]?.amps==null?null:sim.currents[checkpoint.part].amps*1000;
 if(!Number.isFinite(measured))return {passed:false,reason:'The modeled measurement is floating or unavailable. Check the probe or circuit.'};
 const passed=Math.abs(measured-checkpoint.expected)<=checkpoint.tolerance;
 return {passed,reason:passed?'Measurement matches the experiment’s simplified DC model.':`Measured value falls outside the modeled tolerance. ${checkpoint.hint}`,measured:Math.round(measured*1e5)/1e5,expected:checkpoint.expected,tolerance:checkpoint.tolerance,unit:checkpoint.unit,fingerprint,labId,checkpointId,mode:checkpoint.mode};
}
export function labCompletion(labId,project,records={}){
 const lab=getLabActivity(labId);if(!lab)return {completed:0,total:0,passed:false};
 let fingerprint;try{fingerprint=labProjectFingerprint(project);}catch{return {completed:0,total:lab.checkpoints.length,passed:false};}
 const completed=lab.checkpoints.filter(c=>records[c.id]?.passed===true&&records[c.id].fingerprint===fingerprint).length;
 return {completed,total:lab.checkpoints.length,passed:completed===lab.checkpoints.length};
}
// Browser storage is untrusted. Restore only a small, bounded list of primitive observations.
export function sanitizeLabRecords(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 const result={};
 for(const lab of LAB_ACTIVITIES){
  const data=input[lab.id];if(!data||typeof data!=='object')continue;
  const captures={};
  for(const cp of lab.checkpoints){
   const r=data.captures?.[cp.id];
   if(!r||r.passed!==true||!Number.isFinite(r.measured)||typeof r.fingerprint!=='string'||r.fingerprint.length>18000)continue;
   // Recheck modeled expected value and checkpoint identifier; local data is still user-editable.
   if(Math.abs(r.measured-cp.expected)>cp.tolerance)continue;
   captures[cp.id]={passed:true,measured:r.measured,expected:cp.expected,tolerance:cp.tolerance,unit:cp.unit,fingerprint:r.fingerprint,labId:lab.id,checkpointId:cp.id,mode:cp.mode};
  }
  result[lab.id]={captures,note:typeof data.note==='string'?data.note.slice(0,350):''};
 }
 return result;
}
