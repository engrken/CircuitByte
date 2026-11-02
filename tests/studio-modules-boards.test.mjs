import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BOARD_OPTIONS} from '../lib/studio-boards.mjs';
import {BOARD_PROFILES} from '../lib/studio-compiler.mjs';
import {MODULE_STARTERS,moduleSerialStarter} from '../lib/studio-module-starters.mjs';
import {resolveStudioLibraries} from '../lib/studio-libraries.mjs';
import {serializeStudioDraft,parseStudioDraft} from '../lib/studio-drafts.mjs';
import catalog from '../scripts/catalog.json' with {type:'json'};

test('All Studio boards map to a real, explicitly pinned CLI FQBN',()=>{
 const catalogIds=new Set(catalog.map(item=>item.id));
 assert.equal(BOARD_OPTIONS.length,10);
 for(const board of BOARD_OPTIONS){
  assert.equal(BOARD_PROFILES[board.id]?.fqbn?.startsWith(board.id.replace('m5stack-core-esp32','m5stack_core')),true,board.id);
  assert.match(BOARD_PROFILES[board.id].version,/^\d+\.\d+\.\d+$/);
  if(board.catalogId)assert.ok(catalogIds.has(board.catalogId));
  assert.ok(['3.3V','5V'].includes(board.voltage));
 }
});

test('GSM, GPS and Bluetooth UART starters are available for every selectable board',()=>{
 const catalogIds=new Set(catalog.map(item=>item.id));
 assert.equal(MODULE_STARTERS.length,3);
 for(const {id:board} of BOARD_OPTIONS)for(const module of MODULE_STARTERS){
  const starter=moduleSerialStarter(board,module.id);
  assert.equal(starter.board,board);
  assert.equal(starter.method,'board-starter');
  assert.match(starter.code,/void setup\(\)/);
  assert.match(starter.code,/void loop\(\)/);
  assert.match(starter.code,/Serial.begin\(115200\)/);
  assert.ok(starter.netlist.some(x=>x.kind==='ground'));
  assert.ok(starter.parts.every(id=>catalogIds.has(id)));
  assert.ok(starter.warnings.length>=3);
  assert.doesNotMatch(starter.code,/AT\+CMGS|ATD[0-9]|AT\+CGATT=/);
 }
});

test('GSM and GPS use AVR SoftwareSerial, Mega Serial1 and ESP32 HardwareSerial appropriately',()=>{
 const uno=moduleSerialStarter('arduino:avr:uno','gsm-sim900a');
 assert.match(uno.code,/#include <SoftwareSerial\.h>/);
 assert.match(uno.code,/SoftwareSerial moduleSerial\(4, 3\)/);
 assert.match(uno.warnings.join(' '),/2G/);
 assert.match(uno.warnings.join(' '),/supply/i);
 const mega=moduleSerialStarter('arduino:avr:mega:cpu=atmega2560','gps-neo6m');
 assert.match(mega.code,/#define moduleSerial Serial1/);
 assert.doesNotMatch(mega.code,/#include <SoftwareSerial\.h>/);
 assert.match(mega.code,/#include <TinyGPS\+\+\.h>/);
 const esp=moduleSerialStarter('esp32:esp32:esp32','gps-neo6m',['cb-083']);
 assert.match(esp.code,/HardwareSerial moduleSerial\(2\)/);
 assert.match(esp.code,/SERIAL_8N1, 16, 17/);
 assert.ok(esp.parts.includes('cb-083'));
 assert.doesNotMatch(esp.code,/SoftwareSerial/);
 const s3=moduleSerialStarter('esp32:esp32:esp32s3','gsm-sim900a');
 assert.match(s3.code,/MODULE_RX_GPIO = -1/);
 assert.match(s3.warnings.join(' '),/pins deliberately unset/i);
});

test('Board-aware library resolver avoids AVR serial and servo includes on ESP32',()=>{
 const avr=resolveStudioLibraries({board:'arduino:avr:uno',parts:['cb-061','cb-030']});
 assert.ok(avr.headers.includes('SoftwareSerial.h'));
 assert.ok(avr.packages.includes('TinyGPSPlus'));
 const esp=resolveStudioLibraries({board:'esp32:esp32:esp32',parts:['cb-061','cb-030','cb-070']});
 assert.ok(!esp.headers.includes('SoftwareSerial.h'));
 assert.ok(!esp.packages.includes('Servo'));
 assert.ok(esp.packages.includes('ESP32Servo'));
 assert.ok(esp.packages.includes('TinyGPSPlus'));
 assert.ok(resolveStudioLibraries({board:'esp32:esp32:esp32',code:'#include <Servo.h>\n#include <SoftwareSerial.h>'}).unknownIncludes.includes('Servo.h'));
 assert.ok(resolveStudioLibraries({board:'esp32:esp32:esp32',code:'#include <SoftwareSerial.h>'}).unknownIncludes.includes('SoftwareSerial.h'));
 assert.ok(resolveStudioLibraries({board:'arduino:avr:uno',manualLibraries:['tinygsm']}).packages.includes('TinyGSM'));
});

test('Module starters preserve netlists and warnings through JSON export',()=>{
 const starter=moduleSerialStarter('arduino:avr:mega:cpu=atmega2560','gps-neo6m');
 const data={board:starter.board,code:starter.code,prompt:starter.prompt,selected:starter.parts,project:starter,mode:'ai'};
 const restored=parseStudioDraft(serializeStudioDraft(data),catalog.map(x=>x.id));
 assert.equal(restored.board,starter.board);
 assert.deepEqual(restored.project.netlist,starter.netlist);
 assert.equal(restored.project.warnings.length,starter.warnings.length);
});

test('Studio routes derive board acceptlists from canonical board definitions',async()=>{
 const ai=await readFile(new URL('../app/api/studio/ai/route.js',import.meta.url),'utf8');
 const projects=await readFile(new URL('../app/api/studio/projects/route.js',import.meta.url),'utf8');
 const compile=await readFile(new URL('../app/api/studio/compile/route.js',import.meta.url),'utf8');
 assert.match(ai,/Object\.hasOwn\(BOARDS,requestedBoard\)/);
 assert.match(projects,/z\.enum\(BOARD_OPTIONS\.map\(item=>item\.id\)\)/);
 assert.match(compile,/Object\.hasOwn\(BOARD_PROFILES,board\)/);
});
