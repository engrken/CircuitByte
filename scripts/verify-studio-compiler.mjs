// Opt-in deployment check; enabled only on the compiler validation preview branch.
import {compileStudioSketch,BOARD_PROFILES} from '../lib/studio-compiler.mjs';
import {parseIntelHex} from '../lib/studio-serial.mjs';
const validationPreview=process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='enable/studio-compiler-usb-20261101';
if(!validationPreview&&process.env.STUDIO_COMPILER_VERIFY_ON_BUILD!=='true')process.exit(0);
const profile=BOARD_PROFILES['arduino:avr:uno'];
const result=await compileStudioSketch({profile,code:'void setup(){Serial.begin(115200);}\nvoid loop(){Serial.println("CircuitByte smoke test");delay(1000);}',dependencies:{packages:[],details:[]}});
if(!result.ok||!result.firmwareHex)throw Error('Studio compiler deployment check failed at '+result.stage+': '+(result.output?.slice(-2000)||result.error||'missing artifact'));
const firmware=parseIntelHex(result.firmwareHex);
console.log('STUDIO_COMPILER_VERIFIED: '+result.board+'; '+firmware.usedBytes+' firmware bytes; sandbox stopped.');
