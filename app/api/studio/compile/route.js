import {requireAdmin,sameOrigin} from '../../../../lib/auth';
import {Sandbox} from '@vercel/sandbox';
import {resolveStudioLibraries,STUDIO_LIBRARY_REGISTRY} from '../../../../lib/studio-libraries.mjs';
import {STUDIO_ZIP_UNPACK_PYTHON} from '../../../../lib/studio-custom-zip.mjs';

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
  const parts=Array.isArray(payload?.parts)?payload.parts.slice(0,16).filter(x=>typeof x==='string'&&/^cb-\d{3}$/.test(x)):[];
  const manualLibraries=Array.isArray(payload?.manualLibraries)?payload.manualLibraries:[];
  if(manualLibraries.length>15||manualLibraries.some(id=>typeof id!=='string'||!Object.hasOwn(STUDIO_LIBRARY_REGISTRY,id)))
    return Response.json({error:'Choose only supported Arduino libraries from Studio Library Manager.'},{status:400});
  const dependencies=resolveStudioLibraries({parts,code,manualLibraries});
  const customLibrary=payload?.customLibrary;
  if(customLibrary!==undefined && (typeof customLibrary!=='string'||customLibrary.length>340000||!/^[-A-Za-z0-9+/=]+$/.test(customLibrary))){
    return Response.json({error:'Custom Arduino ZIP must be base64-encoded and no larger than 250 KB.'},{status:400});
  }
  if(customLibrary && Buffer.byteLength(customLibrary,'base64')>250000){
    return Response.json({error:'Custom library archive is too large (250 KB maximum).'},{status:400});
  }
  if(dependencies.unknownIncludes.length && !customLibrary){
    return Response.json({error:'Unknown library header(s): '+dependencies.unknownIncludes.join(', ')+'. Import your own ZIP library or use a supported module.'},{status:422});
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
      'true'
    ]);
    if(!prep.ok)return Response.json({ok:false,stage:'toolchain',output:prep.output},{headers:{'Cache-Control':'no-store'}});
    for(const library of dependencies.packages){
      const installed=await run(sandbox,'/vercel/sandbox/bin/arduino-cli',['lib','install',library]);
      if(!installed.ok)return Response.json({ok:false,stage:'libraries',output:'Cannot install '+library+'\\n'+installed.output},{headers:{'Cache-Control':'no-store'}});
    }
    // Never permit network access while compiling a user-supplied library or sketch.
    await sandbox.update({networkPolicy:'deny-all'});
    if(customLibrary){
      await sandbox.mkDir('custom-libraries');
      await sandbox.writeFiles([
       {path:'library.zip',content:Buffer.from(customLibrary,'base64')},
       {path:'extract_library.py',content:Buffer.from(STUDIO_ZIP_UNPACK_PYTHON,'utf8')}
      ]);
      const unpack=await run(sandbox,'python3',['/vercel/sandbox/extract_library.py','/vercel/sandbox/library.zip','/vercel/sandbox/custom-libraries']);
      if(!unpack.ok)return Response.json({ok:false,stage:'library-import',output:unpack.output},{headers:{'Cache-Control':'no-store'}});
    }
    await sandbox.mkDir('CircuitByteSketch');
    await sandbox.mkDir('build');
    await sandbox.writeFiles([{path:'CircuitByteSketch/CircuitByteSketch.ino',content:Buffer.from(code,'utf8')}]);
    const result=await run(sandbox,'/vercel/sandbox/bin/arduino-cli',
      ['compile','--fqbn',CORE,'--warnings','all',...(customLibrary?['--libraries','/vercel/sandbox/custom-libraries']:[]),'--output-dir','/vercel/sandbox/build','/vercel/sandbox/CircuitByteSketch']);
    let firmwareHex=null;
    if(result.ok){
      const artifact=await sandbox.readFileToBuffer({path:'build/CircuitByteSketch.ino.hex'});
      if(artifact && artifact.length<250000)firmwareHex=artifact.toString('utf8');
    }
    return Response.json({ok:result.ok,stage:'compile',exitCode:result.exitCode,board:CORE,output:result.output||'Build finished without messages.',firmwareHex,artifactAvailable:Boolean(firmwareHex),dependencies:dependencies.details.map(x=>x.name),customLibraryImported:Boolean(customLibrary)},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return Response.json({error:'The isolated compiler could not start or complete its build. No firmware was executed or uploaded.'},{status:503});
  }finally{
    if(sandbox){try{await sandbox.stop();}catch{/* Sandbox timeout performs cleanup. */}}
  }
}
