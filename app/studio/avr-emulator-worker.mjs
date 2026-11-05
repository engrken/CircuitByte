import {AVRIOPort,AVRTimer,AVRUSART,CPU,PinState,avrInstruction,portBConfig,portCConfig,portDConfig,timer0Config,timer1Config,timer2Config,usart0Config} from 'avr8js';
import {parseUnoHex} from '../../lib/studio-intel-hex.mjs';
import {captureLogicPins,newLogicTrace,LOGIC_PINS} from '../../lib/studio-logic-trace.mjs';

const CPU_HZ=16000000,MAX_CYCLES=160000000,CHUNK_CYCLES=250000;
let timer=null,running=false,cpu=null,ports=null,serial='',pressed=false,trace=newLogicTrace();
const cancel=()=>{running=false;if(timer!==null)clearTimeout(timer);timer=null;};
function pinState(pin){
 const port=pin<=7?ports.d:ports.b,index=pin<=7?pin:pin-8;
 const state=port.pinState(index);
 return state===PinState.High?'high':state===PinState.Low?'low':state===PinState.InputPullUp?'pullup':'input';
}
function readPins(){const pins={};for(let id=2;id<=13;id++)pins['D'+id]=pinState(id);return pins;}
function capturePins(){if(cpu&&ports)captureLogicPins(trace,readPins(),cpu.cycles/16000);}
function snapshot(){
 if(!cpu||!ports)return;
 const pins=readPins();captureLogicPins(trace,pins,cpu.cycles/16000);
 postMessage({kind:'snapshot',simulatedMs:Math.round(cpu.cycles/16000),pins,
  traces:trace.edges,dropped:trace.dropped,buttonPressed:pressed,serial});
}
function execute(){
 if(!running||!cpu)return;
 try{
  const end=Math.min(MAX_CYCLES,cpu.cycles+CHUNK_CYCLES);
  while(running&&cpu.cycles<end){avrInstruction(cpu);cpu.tick();}
  snapshot();
  if(cpu.cycles>=MAX_CYCLES){cancel();postMessage({kind:'ended',reason:'Reached the 10-second simulated-time limit. Restart to replay.'});return;}
  timer=setTimeout(execute,20);
 }catch(error){cancel();postMessage({kind:'error',reason:'AVR execution stopped: '+String(error?.message||error).slice(0,180)});}
}
self.onmessage=event=>{
 const {kind,hex,pressed:nextPressed}=event.data||{};
 if(kind==='stop'){cancel();cpu=null;ports=null;postMessage({kind:'stopped'});return;}
 if(kind==='button'&&cpu&&ports){pressed=Boolean(nextPressed);ports.d.setPin(2,!pressed);snapshot();return;}
 if(kind==='pause'&&running){cancel();snapshot();postMessage({kind:'paused'});return;}
 if(kind==='resume'&&cpu&&!running&&cpu.cycles<MAX_CYCLES){running=true;postMessage({kind:'resumed'});timer=setTimeout(execute,0);return;}
 if(kind!=='start')return;
 cancel();cpu=null;ports=null;
 try{
  const flash=parseUnoHex(hex),program=new Uint16Array(flash.buffer);
  cpu=new CPU(program);
  const timers=[new AVRTimer(cpu,timer0Config),new AVRTimer(cpu,timer1Config),new AVRTimer(cpu,timer2Config)];
  ports={b:new AVRIOPort(cpu,portBConfig),c:new AVRIOPort(cpu,portCConfig),d:new AVRIOPort(cpu,portDConfig)};
  const usart=new AVRUSART(cpu,usart0Config,CPU_HZ);
  serial='';pressed=false;trace=newLogicTrace();
  usart.onByteTransmit=byte=>{if(byte===10||byte===13||(byte>=32&&byte<=126))serial=(serial+String.fromCharCode(byte)).slice(-500);};
  ports.b.addListener(capturePins);
  ports.d.addListener(capturePins);
  ports.d.setPin(2,true);
  capturePins();running=true;
  void timers;
  postMessage({kind:'started',pins:LOGIC_PINS});
  timer=setTimeout(execute,0);
 }catch(error){cancel();cpu=null;ports=null;postMessage({kind:'error',reason:String(error?.message||error).slice(0,200)});}
};
