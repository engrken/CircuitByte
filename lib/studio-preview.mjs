// Deterministic visual preview for simple linear digitalWrite()/delay() sketches.
// NOT an AVR emulator: never executes arbitrary C++, avoids inventing I/O states.
export const BLINK_DEMO_CODE=String.raw`// Arduino UNO blink preview: D13 / LED_BUILTIN
const byte LED_PIN = LED_BUILTIN;
void setup() {
  pinMode(LED_PIN, OUTPUT);
}
void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(600);
  digitalWrite(LED_PIN, LOW);
  delay(600);
}
`;
const unsupported=/\b(for|while|if|switch|do|break|continue|return|goto|analogWrite|analogRead|tone|noTone|millis|delayMicroseconds|pulseIn|attachInterrupt)\b/;
function resolveToken(token, constants){
 const t=token.trim();
 if(t==='LED_BUILTIN')return 13;
 if(/^\d+$/.test(t))return Number(t);
 if(constants.has(t))return constants.get(t);
 return null;
}
function parseConstants(source){
 const out=new Map([['LED_BUILTIN',13]]);
 for(const match of source.matchAll(/^\s*#define\s+([A-Za-z_]\w*)\s+(\d+|LED_BUILTIN)\s*$/gm)){
  out.set(match[1],resolveToken(match[2],out));
 }
 for(const match of source.matchAll(/\b(?:const\s+)?(?:int|byte|uint8_t|unsigned\s+int)\s+([A-Za-z_]\w*)\s*=\s*(\d+|LED_BUILTIN|[A-Za-z_]\w*)\s*;/g)){
  const value=resolveToken(match[2],out);if(value!==null)out.set(match[1],value);
 }
 return out;
}
export function previewArduinoSketch(code){
 const source=String(code||'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 const found=/\bvoid\s+loop\s*\(\s*\)\s*\{/.exec(source);
 if(!found)return {supported:false,reason:'No loop() body found. This preview only handles simple Arduino sketches.'};
 const start=found.index+found[0].length;
 let depth=1,i=start;
 while(i<source.length&&depth){
  if(source[i]==='{')depth++;
  if(source[i]==='}')depth--;
  i++;
 }
 if(depth!==0)return {supported:false,reason:'The sketch has an incomplete loop() block.'};
 const loop=source.slice(start,i-1);
 if(/[{}]/.test(loop)||unsupported.test(loop))return {supported:false,reason:'This sketch contains conditions, loops or functions outside the simple LED preview subset. Download it for real Arduino compilation.'};
 const constants=parseConstants(source);
 const tokens=loop.split(';').map(x=>x.trim()).filter(Boolean);
 if(tokens.length>48)return {supported:false,reason:'The preview supports a maximum of 48 simple statements.'};
 const current={};const pins=new Set();const frames=[];let writes=0;let durationTotal=0;
 for(const statement of tokens){
  let m=/^digitalWrite\s*\(\s*([A-Za-z_]\w*|\d+)\s*,\s*(HIGH|LOW)\s*\)$/.exec(statement);
  if(m){
   const pin=resolveToken(m[1],constants);
   if(!Number.isInteger(pin)||pin<0||pin>13)return {supported:false,reason:'Only Arduino UNO digital pins D0–D13 are represented.'};
   if(pin<=1)return {supported:false,reason:'D0/D1 are reserved for UART. They are intentionally omitted from the LED preview.'};
   current[pin]=m[2]==='HIGH';pins.add(pin);writes++;continue;
  }
  m=/^delay\s*\(\s*([A-Za-z_]\w*|\d+)\s*\)$/.exec(statement);
  if(m){
   const ms=resolveToken(m[1],constants);
   if(!Number.isInteger(ms)||ms<30||ms>10000)return {supported:false,reason:'Preview delays must be constant integers from 30–10,000 milliseconds.'};
   frames.push({duration:ms,output:{...current}});
   durationTotal+=ms;continue;
  }
  return {supported:false,reason:'Unsupported statement: '+statement.slice(0,75)+'. Only direct digitalWrite() and delay() sequences can be animated.'};
 }
 if(writes===0||frames.length===0||pins.size>6)return {supported:false,reason:'Use up to six direct digitalWrite() outputs and delay() statements for a visual preview.'};
 if(frames.length>24||durationTotal>60000)return {supported:false,reason:'Preview duration exceeds the supported 60-second cycle.'};
 return {supported:true,type:'digital-led-timeline',pins:[...pins].sort((a,b)=>a-b),frames,duration:durationTotal,
  disclaimer:'Illustrative signal animation only. This does not compile or execute AVR firmware, test electrical wiring or represent timing from conditional code.'};
}
