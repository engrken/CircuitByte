import {requireAdmin,sameOrigin} from '../../../lib/auth';
import {Sandbox} from '@vercel/sandbox';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;

const CLI_URL='https://github.com/arduino/arduino-cli/releases/download/v1.5.1/arduino-cli_1.5.1_Linux_64bit.tar.gz';
const CLI_SHA='28a8e119c498a25607821c36cb2dc49e8463941b261a0d99091baa7bc692dd2b';
const CORE='arduino:avr:uno';

async function run(sandbox,cmd,args,{cwd}={}) {
  const result=await sandbox.runCommand({cmd,args,...(cwd?{cwd}:{})});
  const output=((await result.stdout())+'\n'+(await result.stderr())).trim();
  return {ok:result.exitCode===0,output:output.slice(-12000),exitCode:result.exitCode};
}

export async function POST(request) {
  try {sameOrigin(request);await requireAdmin();}
  catch{return Response.json({error:'Cloud compilation is restricted to authenticated CircuitByte beta administrators.'},{status:403});}
  if(process.env.STUDIO_COMPILER_ENABLED!=='true'){
    return Response.json({error:'The sandbox compiler is not activated. Enable STUDIO_COMPILER_ENABLED after setting cost limits and verifying Vercel Sandbox access.'},{status:503});
  }
  let payload;
  try{payload=await request.json();}catch{return Response.json({error:'Invalid request.'},{status:400});}
  const code=typeof payload?.code==='string'?payload.code:'';
  if(payload?.board!==CORE||code.length<10||code.length>15000||
    !/\bvoid\s+setup\s*\(/.test(code)||!/\bvoid\s+loop\s*\(/.test(code)){
    return Response.json({error:'Choose Arduino UNO and provide a valid 10–15,000 character sketch containing setup() and loop().'}, {status:400});
  }
  let sandbox;
  try{
    sandbox=await Sandbox.create({
      persistent:false,timeout:240000,resources:{vcpus:1},
      networkPolicy:'allow-all'
    });
    const prep=await run(sandbox,'bash',['-lc',
      'set -euo pipefail; mkdir -p /vercel/sandbox/bin; '+
      'curl -fsSL --retry 2 "'+CLI_URL+'" -o /vercel/sandbox/arduino-cli.tgz; '+
      'echo "'+CLI_SHA+'  /vercel/sandbox/arduino-cli.tgz" | sha256sum --check; '+
      'tar -xzf /vercel/sandbox/arduino-cli.tgz -C /vercel/sandbox/bin arduino-cli; '+
      '/vercel/sandbox/bin/arduino-cli core update-index; '+
      '/vercel/sandbox/bin/arduino-cli core install arduino:avr; '+
      '/vercel/sandbox/bin/arduino-cli lib install "DHT sensor library" "Adafruit Unified Sensor" "hd44780" "SD"'
    ]);
    if(!prep.ok)return Response.json({ok:false,stage:'toolchain',output:prep.output},{headers:{'Cache-Control':'no-store'}});
    // No network during compilation of user-controlled source.
    await sandbox.update({networkPolicy:'deny-all'});
    await sandbox.mkDir('CircuitByteSketch');
    await sandbox.writeFiles([{path:'CircuitByteSketch/CircuitByteSketch.ino',content:Buffer.from(code,'utf8')}]);
    const result=await run(sandbox,'/vercel/sandbox/bin/arduino-cli',
      ['compile','--fqbn',CORE,'--warnings','all','/vercel/sandbox/CircuitByteSketch']);
    return Response.json({ok:result.ok,stage:'compile',exitCode:result.exitCode,board:CORE,output:result.output||'Build finished without messages.'},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({error:'The isolated compiler could not start or complete its build. No firmware was executed or uploaded.'},{status:503});
  }finally{
    if(sandbox){try{await sandbox.stop();}catch{/* Sandbox timeout performs cleanup. */}}
  }
}
