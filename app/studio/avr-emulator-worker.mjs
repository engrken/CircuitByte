import {AVRIOPort,AVRTimer,AVRUSART,CPU,PinState,avrInstruction,portBConfig,portCConfig,portDConfig,timer0Config,timer1Config,timer2Config,usart0Config} from 'avr8js';
import {parseUnoHex} from '../../lib/studio-intel-hex.mjs';

let timer=null,running=false,cpu=null,ports=null,serial='';
let transitions=[],last13=null;
const CPU_HZ=16000000,MAX_CYCLES=160000000;
const stop=()=>{running=false;if(timer!==null)clearTimeout(timer);timer=null;};
function pinState(pin){
 const port=pin<=7?ports.d:ports.b,position=pin<=7?pin:pin-8;
 const state=port.pinState(position);
 return state===PinState.High?'high':state===PinState.Low?'low':state===PinState.InputPullUp?'pullup':'input';
}
function tracePin13(){
 const value=pinState(13);
 if(value===last13)return;
 last13=value;
 transitions.push({ms:Math.round(cpu.cycles/16000*10)/10,level:value});
 if(transitions.length>100)transitions=transitions.slice(-100);
}
function snapshot(){
 const pins={};for(let id=2;id<=13;id++)pins['D'+id]=pinState(id);
 postMessage({kind:'snapshot',simulatedMs:Math.round(cpu.cycles/16000),pins,transitions:transitions.slice(-80),serial});
}
function execute(){
 if(!running)return;
 try{
  const end=cpu.cycles+100000;
  while(running&&cpu.cycles<end){avrInstruction(cpu);cpu.tick();}
  snapshot();
  if(cpu.cycles>=MAX_CYCLES){stop();postMessage({kind:'ended',reason:'Reached the 10-second simulated-time safety limit. Restart to replay.'});return;}
  timer=setTimeout(execute,12);
 }catch(error){stop();postMessage({kind:'error',reason:'AVR instruction execution stopped: '+String(error?.message||error).slice(0,180)});}
}
self.onmessage=event=>{
 const {kind,hex,pressed}=event.data||{};
 if(kind==='stop'){stop();postMessage({kind:'stopped'});return;}
 if(kind==='button'&&running){ports.d.setPin(2,!pressed);return;}
 if(kind!=='start')return;
 stop();
 try{
  const flash=parseUnoHex(hex),program=new Uint16Array(flash.buffer);
  cpu=new CPU(program);
  const timers=[new AVRTimer(cpu,timer0Config),new AVRTimer(cpu,timer1Config),new AVRTimer(cpu,timer2Config)];
  ports={b:new AVRIOPort(cpu,portBConfig),c:new AVRIOPort(cpu,portCConfig),d:new AVRIOPort(cpu,portDConfig)};
  const usart=new AVRUSART(cpu,usart0Config,CPU_HZ);
  serial='';transitions=[];last13=null;
  usart.onByteTransmit=byte=>{if(byte===10||byte===13||(byte>=32&&byte<=126)){serial=(serial+String.fromCharCode(byte)).slice(-500);}};
  ports.b.addListener(tracePin13);
  ports.d.setPin(2,true);
  tracePin13();running=true;
  void timers;
  postMessage({kind:'started'});
  timer=setTimeout(execute,0);
 }catch(error){stop();postMessage({kind:'error',reason:String(error?.message||error).slice(0,200)});}
};
