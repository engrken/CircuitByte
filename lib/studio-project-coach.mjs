import {BOARD_OPTIONS} from './studio-boards.mjs';
export const BENCH_CHECKS=[
 {id:'board',label:'Verify exact board model, revision and upload port.'},
 {id:'power',label:'Verify or measure supply voltage, current capacity and GPIO signal levels.'},
 {id:'wiring',label:'Check actual module pins, common ground, current-limiting resistors and level shifting.'},
 {id:'behavior',label:'Upload the sketch and observe the expected physical input/output behavior.'}
];
export function diagnoseCompile(result){
 if(!result||result.ok!==false)return null;
 const output=String(result.output||result.error||'').slice(-6000);
 if(['service','toolchain'].includes(result.stage))return 'The sandbox or toolchain failed. Check service status; changing your hardware wiring cannot fix this failure.';
 if(result.stage==='libraries'||/fatal error:.*No such file|library.*not found|unknown library header/i.test(output))return 'A library may be missing or incompatible. Check the named header, Library Manager and exact board target.';
 if(/text section exceeds|region .* overflow|sketch too big|not enough memory/i.test(output))return 'The selected board may not have enough flash or RAM. Reduce the sketch or choose a compatible board.';
 if(/error:|undefined reference|multiple definition/i.test(output))return 'Fix the FIRST source or linker error, then compile again for the same board.';
 return 'Review the first compiler diagnostic and confirm the selected board and required libraries.';
}
export function assessStudioProject({board,parts=[],moduleIds=[],prompt='',project=null,code='',compile=null,electricalReview=null,codeDirty=false,docProblems=[]}={}){
 const actions=[],questions=[],add=(severity,message)=>actions.push({severity,message});
 const target=BOARD_OPTIONS.find(x=>x.id===board);
 if(!target)add('blocker','Choose a supported microcontroller board.');
 if(target?.catalogId&&!parts.includes(target.catalogId)&&(!project||project.method==='ai-draft'))add('blocker','Add your '+target.name+' board to the selected materials.');
 if(!parts.length&&!moduleIds.length)add('blocker','Choose your components or reference modules.');
 if(String(prompt).trim().length<12)questions.push('What exact behavior should happen, and what measured outcome proves success?');
 else if(!/\b(when|if|detect|read|measure|show|display|print|log|send|alarm|turn|blink|count|track|monitor|control|record|activate|trigger)\b/i.test(prompt))questions.push('What is the input or trigger, and what output do you expect?');
 if(moduleIds.some(x=>/sim|gsm|gps|neo6m|lora|hc05|rfid/i.test(x)))questions.push('What exact module revision, power rating, and UART or interface pin levels do you have?');
 if(target?.voltage==='3.3V'&&(parts.length>1||moduleIds.length))questions.push('Do any connected modules use 5 V signals that require level shifting?');
 if(!project)return {phase:'Plan the build',actions,questions,bench:false,repair:false};
 if(project.missing?.length)add('blocker',project.missing.length+' required part(s) are missing from the selected materials.');
 if(!String(code).trim())add('blocker','Write or load a sketch before compiling.');
 if(docProblems.length)add('blocker','The template has unresolved reference-document errors.');
 if(electricalReview?.status==='failed')add('blocker','Resolve electrical errors before connecting power.');
 else if(electricalReview?.status==='incomplete')add('review','Electrical or pin information is incomplete; verify the real module against its datasheet.');
 else add('review','Static electrical review is not proof of a working or safe physical circuit.');
 if(codeDirty)add('review','This sketch changed after its reference wiring was prepared; review pin assignments again.');
 const diagnosis=diagnoseCompile(compile);
 if(diagnosis)add('blocker',diagnosis);
 else if(!compile)add('next','Compile this sketch for the actual board and review compiler messages.');
 else if(compile.ok)add('next','Compilation passed; upload and test on real hardware, including expected inputs and outputs.');
 const blocked=actions.some(x=>x.severity==='blocker');
 const bench=Boolean(compile?.ok&&!blocked);
 return {phase:diagnosis?'Troubleshoot compilation':blocked?'Resolve blockers':bench?'Bench test on hardware':'Review and compile',actions,questions,bench,repair:Boolean(diagnosis&&code.trim()&&!['service','toolchain'].includes(compile?.stage))};
}
