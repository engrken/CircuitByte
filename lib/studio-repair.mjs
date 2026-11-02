const sensitive=/\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|bearer|wifi[_-]?password|ssid)\b/i;
export function prepareStudioRepair(code,diagnostics){
 if(typeof code!=='string'||code.length<40||code.length>8000)return {error:'Provide a 40–8,000 character sketch for AI repair.'};
 if(typeof diagnostics!=='string'||!diagnostics.trim()||diagnostics.length>5000)return {error:'Compile first and provide diagnostics below 5,000 characters.'};
 if(sensitive.test(code)||sensitive.test(diagnostics))return {error:'Remove possible Wi-Fi credentials and secrets before sharing code with AI repair.'};
 return {code,diagnostics:diagnostics.slice(-1400)};
}
