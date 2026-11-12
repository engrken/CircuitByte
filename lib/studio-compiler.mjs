import {gzipSync} from 'node:zlib';
import {Sandbox} from '@vercel/sandbox';
import {STUDIO_ZIP_UNPACK_PYTHON} from './studio-custom-zip.mjs';

const CLI_URL='https://github.com/arduino/arduino-cli/releases/download/v1.5.1/arduino-cli_1.5.1_Linux_64bit.tar.gz';
const CLI_SHA='28a8e119c498a25607821c36cb2dc49e8463941b261a0d99091baa7bc692dd2b';

const LABWIRED_VERSION='v0.25.0';
const LABWIRED_COMMIT='cbc4e47561713270cd28b895a17973f8151d9f4c';
const LABWIRED_URL='https://github.com/w1ne/labwired-core/releases/download/v0.25.0/labwired-v0.25.0-linux-x86_64.tar.gz';
const LABWIRED_SHA='3ccaa6219100fbd611521d6c823545521e664931f3293eae8144daaaa6bd6035';
const LABWIRED_C3_FQBN='esp32:esp32:esp32c3';

async function prepareLabWiredSandbox(sandbox){
  const script=[
    'set -euo pipefail',
    'command -v git >/dev/null',
    'curl -fsSL --retry 2 "'+LABWIRED_URL+'" -o /vercel/sandbox/labwired-cli.tar.gz',
    'printf "%s  %s\\n" "'+LABWIRED_SHA+'" "/vercel/sandbox/labwired-cli.tar.gz" | sha256sum --check',
    'mkdir -p /vercel/sandbox/labwired-bin',
    'tar -xzf /vercel/sandbox/labwired-cli.tar.gz -C /vercel/sandbox/labwired-bin',
    'git clone --filter=blob:none --depth 1 --no-checkout --branch '+LABWIRED_VERSION+' https://github.com/w1ne/labwired-core.git /vercel/sandbox/labwired-source',
    'test "$(git -C /vercel/sandbox/labwired-source rev-parse '+LABWIRED_VERSION+'^{commit})" = "'+LABWIRED_COMMIT+'"',
    'git -C /vercel/sandbox/labwired-source config core.sparseCheckout true',
    'git -C /vercel/sandbox/labwired-source config core.sparseCheckoutCone false',
    'printf "%s\\n" "/configs/chips/esp32c3.yaml" "/configs/peripherals/esp32c3/" "/configs/systems/esp32c3-devkit.yaml" > /vercel/sandbox/labwired-source/.git/info/sparse-checkout',
    'git -C /vercel/sandbox/labwired-source checkout --detach '+LABWIRED_COMMIT,
    'test -f /vercel/sandbox/labwired-source/configs/chips/esp32c3.yaml',
    'test -f /vercel/sandbox/labwired-source/configs/systems/esp32c3-devkit.yaml',
    'find /vercel/sandbox/labwired-bin -type f -name labwired -perm -111 -print -quit > /vercel/sandbox/labwired-bin-path',
    'test -s /vercel/sandbox/labwired-bin-path',
    'LABWIRED_BIN="$(cat /vercel/sandbox/labwired-bin-path)"',
    '"$LABWIRED_BIN" --version'
  ].join(' && ');
  return run(sandbox,'bash',['-lc',script]);
}

async function runLabWiredSmoke(sandbox,profile){
  if(profile.fqbn!==LABWIRED_C3_FQBN)return {status:'unavailable',reason:'This LabWired pilot only supports the ESP32-C3 profile.'};
  let prepared;
  try{
    await sandbox.update({networkPolicy:'allow-all'});
    prepared=await prepareLabWiredSandbox(sandbox);
  }catch{
    try{await sandbox.update({networkPolicy:'deny-all'});}catch{}
    return {status:'unavailable',version:LABWIRED_VERSION,reason:'LabWired could not be prepared in the isolated build environment.'};
  }
  try{await sandbox.update({networkPolicy:'deny-all'});}catch{
    return {status:'unavailable',version:LABWIRED_VERSION,reason:'The isolated network policy could not be restored; simulation was stopped.'};
  }
  if(!prepared.ok)return {status:'unavailable',version:LABWIRED_VERSION,reason:'LabWired setup failed. The Arduino compilation result is still valid.',output:prepared.output.slice(-2400)};
  try{
    const elf=await sandbox.readFileToBuffer({path:'/vercel/sandbox/build/CircuitByteSketch.ino.elf'});
    if(!elf||elf.length===0||elf.length>12000000)return {status:'unavailable',version:LABWIRED_VERSION,reason:'The ESP32-C3 compiler did not provide a usable ELF file for LabWired.'};
    await sandbox.mkDir('/vercel/sandbox/labwired-work');
    const scriptText=[
      'schema_version: "1.0"',
      'inputs:',
      '  system: "/vercel/sandbox/labwired-source/configs/systems/esp32c3-devkit.yaml"',
      '  firmware: "/vercel/sandbox/labwired-work/firmware.elf"',
      'limits:',
      '  max_steps: 800000',
      'assertions:',
      '  - expected_stop_reason: max_steps',
      ''
    ].join('\n');
    await sandbox.writeFiles([
      {path:'/vercel/sandbox/labwired-work/firmware.elf',content:elf},
      {path:'/vercel/sandbox/labwired-work/test.yaml',content:Buffer.from(scriptText,'utf8')}
    ]);
    const sim=await run(sandbox,'bash',['-lc',
      'set -euo pipefail; LABWIRED_BIN="$(cat /vercel/sandbox/labwired-bin-path)"; timeout 30s "$LABWIRED_BIN" test --script /vercel/sandbox/labwired-work/test.yaml --output-dir /vercel/sandbox/labwired-work/out --no-uart-stdout'
    ]);
    let uartLog='';
    try{const uart=await sandbox.readFileToBuffer({path:'/vercel/sandbox/labwired-work/out/uart.log'});if(uart)uartLog=uart.toString('utf8').slice(-8000);}catch{}
    return {
      status:sim.ok?'completed':'failed',
      version:LABWIRED_VERSION,
      board:'ESP32-C3 DevKit virtual profile',
      scope:'Bounded firmware execution smoke test (800,000 simulator steps). This is not an electrical safety check or physical hardware validation.',
      uartLog,
      output:sim.output.slice(-8000)
    };
  }catch{
    return {status:'unavailable',version:LABWIRED_VERSION,reason:'LabWired could not execute this ELF. Compilation succeeded; no hardware behavior is certified.'};
  }
}

export const BOARD_PROFILES={
  'arduino:avr:uno':{core:'arduino:avr',version:'1.8.6',fqbn:'arduino:avr:uno'},
  'arduino:avr:nano:cpu=atmega328':{core:'arduino:avr',version:'1.8.6',fqbn:'arduino:avr:nano:cpu=atmega328'},
  'arduino:avr:nano:cpu=atmega328old':{core:'arduino:avr',version:'1.8.6',fqbn:'arduino:avr:nano:cpu=atmega328old'},
  'arduino:avr:mega:cpu=atmega2560':{core:'arduino:avr',version:'1.8.6',fqbn:'arduino:avr:mega:cpu=atmega2560'},
  'arduino:avr:leonardo':{core:'arduino:avr',version:'1.8.6',fqbn:'arduino:avr:leonardo'},
  'esp8266:esp8266:nodemcuv2':{core:'esp8266:esp8266',version:'3.1.2',fqbn:'esp8266:esp8266:nodemcuv2',index:'https://arduino.esp8266.com/stable/package_esp8266com_index.json'},
  'esp32:esp32:esp32':{core:'esp32:esp32',version:'3.3.12',fqbn:'esp32:esp32:esp32',index:'https://espressif.github.io/arduino-esp32/package_esp32_index.json'},
  'esp32:esp32:esp32s3':{core:'esp32:esp32',version:'3.3.12',fqbn:'esp32:esp32:esp32s3',index:'https://espressif.github.io/arduino-esp32/package_esp32_index.json'},
  'esp32:esp32:esp32c3':{core:'esp32:esp32',version:'3.3.12',fqbn:'esp32:esp32:esp32c3',index:'https://espressif.github.io/arduino-esp32/package_esp32_index.json'},
  'esp32:esp32:m5stack-core-esp32':{core:'esp32:esp32',version:'3.3.12',fqbn:'esp32:esp32:m5stack_core',index:'https://espressif.github.io/arduino-esp32/package_esp32_index.json'}
};

async function run(sandbox,cmd,args,{cwd}={}) {
  const result=await sandbox.runCommand({cmd,args,...(cwd?{cwd}:{})});
  const output=((await result.stdout())+'\n'+(await result.stderr())).trim();
  return {ok:result.exitCode===0,output:output.slice(-12000),exitCode:result.exitCode};
}

export async function compileStudioSketch({code,profile,dependencies,customLibrary,runLabWiredSimulation=false,createSandbox=options=>Sandbox.create(options)}) {
  let sandbox;
  try{
    sandbox=await createSandbox({persistent:false,timeout:240000,resources:{vcpus:1},networkPolicy:'allow-all'});
    const prep=await run(sandbox,'bash',['-lc',
      'set -euo pipefail; mkdir -p /vercel/sandbox/bin; '+
      'curl -fsSL --retry 2 "'+CLI_URL+'" -o /vercel/sandbox/arduino-cli.tgz; '+
      'echo "'+CLI_SHA+'  /vercel/sandbox/arduino-cli.tgz" | sha256sum --check; '+
      'tar -xzf /vercel/sandbox/arduino-cli.tgz -C /vercel/sandbox/bin arduino-cli; '+
      '/vercel/sandbox/bin/arduino-cli core update-index '+(profile.index?'--additional-urls '+JSON.stringify(profile.index):'')+'; '+
      '/vercel/sandbox/bin/arduino-cli core install '+profile.core+(profile.version?'@'+profile.version:'')+' '+(profile.index?'--additional-urls '+JSON.stringify(profile.index):'')+'; '+
      'true'
    ]);
    if(!prep.ok)return {ok:false,stage:'toolchain',output:prep.output};
    if(dependencies.packages.length){
      const updated=await run(sandbox,'/vercel/sandbox/bin/arduino-cli',['lib','update-index']);
      if(!updated.ok)return {ok:false,stage:'libraries',output:'Cannot refresh Arduino Library Manager index.\n'+updated.output};
    }
    for(const library of dependencies.packages){
      const installed=await run(sandbox,'/vercel/sandbox/bin/arduino-cli',['lib','install',library]);
      if(!installed.ok)return {ok:false,stage:'libraries',output:'Cannot install '+library+'\n'+installed.output};
    }
    // Never permit network access while compiling a user-supplied library or sketch.
    await sandbox.update({networkPolicy:'deny-all'});
    if(customLibrary){
      await sandbox.mkDir('/vercel/sandbox/custom-libraries');
      await sandbox.writeFiles([
       {path:'/vercel/sandbox/library.zip',content:Buffer.from(customLibrary,'base64')},
       {path:'/vercel/sandbox/extract_library.py',content:Buffer.from(STUDIO_ZIP_UNPACK_PYTHON,'utf8')}
      ]);
      const unpack=await run(sandbox,'python3',['/vercel/sandbox/extract_library.py','/vercel/sandbox/library.zip','/vercel/sandbox/custom-libraries']);
      if(!unpack.ok)return {ok:false,stage:'library-import',output:unpack.output};
    }
    await sandbox.mkDir('/vercel/sandbox/CircuitByteSketch');
    await sandbox.mkDir('/vercel/sandbox/build');
    await sandbox.writeFiles([{path:'/vercel/sandbox/CircuitByteSketch/CircuitByteSketch.ino',content:Buffer.from(code,'utf8')}]);
    const result=await run(sandbox,'/vercel/sandbox/bin/arduino-cli',
      ['compile','--fqbn',profile.fqbn,...(profile.index?['--additional-urls',profile.index]:[]),'--warnings','all',...(customLibrary?['--libraries','/vercel/sandbox/custom-libraries']:[]),'--output-dir','/vercel/sandbox/build','/vercel/sandbox/CircuitByteSketch']);
    let firmwareHex=null;
    if(result.ok && profile.core==='arduino:avr'){
      const artifact=await sandbox.readFileToBuffer({path:'/vercel/sandbox/build/CircuitByteSketch.ino.hex'});
      if(artifact && artifact.length<250000)firmwareHex=artifact.toString('utf8');
    }
    let firmwareBin=null,firmwareImages=null;
    if(result.ok&&profile.core!=='arduino:avr'){
      const artifact=await sandbox.readFileToBuffer({path:'/vercel/sandbox/build/CircuitByteSketch.ino.bin'});
      if(artifact&&artifact.length<3000000)firmwareBin=artifact.toString('base64');
      if(profile.core==='esp8266:esp8266'&&firmwareBin){firmwareImages=[{name:'CircuitByteSketch.ino.bin',address:0,data:firmwareBin}];firmwareBin=null;}
      if(profile.core==='esp32:esp32'){
        try{
          const merged=await sandbox.readFileToBuffer({path:'/vercel/sandbox/build/CircuitByteSketch.ino.merged.bin'});
          if(merged&&merged.length>0&&merged.length<=16777216){
            const compressed=gzipSync(merged);
            if(compressed.length<2500000){firmwareImages=[{name:'CircuitByteSketch.ino.merged.bin',address:0,encoding:'gzip-base64',size:merged.length,data:compressed.toString('base64')}];firmwareBin=null;}
          }
        }catch{/* Application-only download remains available when the core does not emit a merged image. */}
      }
    }
    const labWiredSimulation=result.ok&&runLabWiredSimulation?await runLabWiredSmoke(sandbox,profile):null;
    return {ok:result.ok,stage:'compile',exitCode:result.exitCode,board:profile.fqbn,output:result.output||'Build finished without messages.',firmwareHex,firmwareBin,firmwareImages,artifactAvailable:Boolean(firmwareHex||firmwareBin||firmwareImages?.length),dependencies:dependencies.details.map(x=>x.name),customLibraryImported:Boolean(customLibrary),labWiredSimulation};
  }catch{
    return {ok:false,stage:'service',error:'The isolated compiler could not start or complete its build. Please retry later.'};
  }finally{
    if(sandbox){try{await sandbox.stop();}catch{/* Sandbox timeout performs cleanup. */}}
  }
}
