// Deterministic, non-AI compiler feedback. Do not suggest hardware changes for a hosted toolchain failure.
export function diagnoseStudioCompiler(result){
 if(!result||result.ok!==false)return {issues:[],canRetry:false,needsAi:false};
 const stage=String(result.stage||'compile');
 const text=String(result.output||result.error||'').slice(-12000);
 const issues=[];
 const add=(code,title,explanation,fix,needsAi=false)=>{
  if(issues.some(x=>x.code===code))return;
  const numbers=[...text.matchAll(/(?:^|\s)(?:[\w./-]+\.ino|sketch\.ino):([1-9]\d{0,4}):\d+(?::|\s)/gm)];
  const line=numbers.length?Number(numbers[0][1]):undefined;
  issues.push({code,title,explanation,fix,...(line?{line}:{}),needsAi});
 };
 if(stage==='preflight'){
  const findings=Array.isArray(result.findings)?result.findings.slice(0,5):[];
  for(const item of findings)add(item.code||'PREFLIGHT','Board compatibility conflict',item.message||'The source is incompatible with its target.',item.fix||'Confirm the selected board and supported library.');
  if(!issues.length)add('PREFLIGHT','Board compatibility conflict','Resolve known static conflicts before compiling.','Review board support and pinned core.');
  return {issues,canRetry:false,needsAi:false};
 }
 if(stage==='service'||stage==='toolchain'){
  add('TOOLCHAIN','Compiler service or board toolchain unavailable','This is an infrastructure or installation failure, not proof of defective source or wiring.','Check Studio service status; do not repeat paid attempts while the toolchain is unavailable.');
  return {issues,canRetry:false,needsAi:false};
 }
 if(stage==='libraries'||/fatal error:\s*[^\n]+:\s*No such file or directory|library\s+not found/i.test(text)){
  add('LIBRARY','Library or header cannot be resolved','The compiler cannot locate a required header or install the selected library.','Open Library Manager, verify the exact header and board-compatible library; check its dependencies. Do not guess a replacement package.');
 }
 if(/region\s+[^\n]*overflow|text section exceeds|sketch too big|not enough memory/i.test(text))
  add('MEMORY','Sketch exceeds the selected board memory','The linker or builder reports insufficient flash or RAM.','Check compiler memory details, remove unused resources, or choose a verified board with adequate capacity.');
 if(/was not declared in this scope|undeclared identifier/i.test(text))
  add('UNDECLARED','Identifier or API not declared','The sketch refers to a name or API that is unavailable in this scope or board library.','Check spelling, declarations, include files and the selected board-specific API.',true);
 if(/no matching function for call|candidate expects .* arguments|invalid conversion from/i.test(text))
  add('SIGNATURE','Function signature or argument mismatch','The installed library API does not match the function call.','Compare parameters and constructor names with the installed library version and its example sketches.',true);
 if(/expected ['`]?;|expected .* before|stray ['\\]/i.test(text))
  add('SYNTAX','Source syntax error','The compiler detected missing or malformed C/C++ syntax.','Inspect the earliest reported source line and the preceding lines for punctuation and braces.',true);
 if(/undefined reference to|multiple definition of|redefinition of/i.test(text))
  add('LINKER','Conflicting or missing definition','The linker found unresolved symbols or duplicate definitions.','Check which implementation is linked, sketch function names, and duplicate library or global definitions.',true);
 if(/BluetoothSerial|SoftwareSerial\.h|Servo\.h/.test(text)&&!/TOOLCHAIN/.test(stage))
  add('BOARD_API','Board-specific API mismatch','The sketch may reference a peripheral or header unavailable in this selected core.','Run the zero-credit compatibility review for the exact board and inspect core-specific examples.');
 if(!issues.length)add('GENERAL','Review the first compiler diagnostic','The current log does not match a known category.','Read the earliest error before downstream messages; check board, header names and source line.',true);
 return {issues:issues.slice(0,4),canRetry:false,needsAi:issues.some(x=>x.needsAi)};
}
