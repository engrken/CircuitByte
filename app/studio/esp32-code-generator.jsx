'use client';

import {useMemo,useState} from 'react';
import {getEsp32CodegenOptions,generateEsp32Sketch,getEsp32CodegenProfile} from '../../lib/esp32/codegen.mjs';

const EXPERIMENTS=[
  {id:'led-blink',label:'Blink an external LED'},
  {id:'pwm-fade',label:'Fade an LED with PWM'},
  {id:'button-input',label:'Read a pull-up button'},
  {id:'analog-read',label:'Read an analog sensor'},
  {id:'ultrasonic-distance',label:'Measure ultrasonic distance'},
  {id:'i2c-scanner',label:'Scan I²C device addresses'}
];

export function StudioEsp32CodeGenerator({board,onUseCode,disabled=false}) {
  const profile=getEsp32CodegenProfile(board);
  const [experiment,setExperiment]=useState('led-blink');
  const options=useMemo(()=>getEsp32CodegenOptions(board,experiment),[board,experiment]);
  const echoOptions=useMemo(()=>getEsp32CodegenOptions(board,'ultrasonic-distance','echo'),[board]);
  const [gpio,setGpio]=useState('');
  const [echoGpio,setEchoGpio]=useState('');
  const [sclGpio,setSclGpio]=useState('');
  const preferred=options.find(pin=>pin.restrictions.length===0)||options[0];
  const selected=options.some(pin=>String(pin.gpio)===gpio)?gpio:(preferred?String(preferred.gpio):'');
  const selectedEcho=echoOptions.some(pin=>String(pin.gpio)===echoGpio)?echoGpio:(echoOptions.find(pin=>String(pin.gpio)!==selected)?String(echoOptions.find(pin=>String(pin.gpio)!==selected).gpio):'');
  const sclOptions=options;
  const preferredScl=sclOptions.find(pin=>String(pin.gpio)!==selected&&pin.restrictions.length===0)||sclOptions.find(pin=>String(pin.gpio)!==selected);
  const selectedScl=sclOptions.some(pin=>String(pin.gpio)===sclGpio&&String(pin.gpio)!==selected)?sclGpio:(preferredScl?String(preferredScl.gpio):'');
  const sclPin=sclOptions.find(pin=>String(pin.gpio)===selectedScl);
  const pin=options.find(item=>String(item.gpio)===selected);
  const echoPin=echoOptions.find(item=>String(item.gpio)===selectedEcho);
  const [error,setError]=useState('');
  function generate(){
    try{
      const sketch=experiment==='ultrasonic-distance'
        ?generateEsp32Sketch({board,experiment,triggerGpio:selected,echoGpio:selectedEcho})
        :experiment==='i2c-scanner'
          ?generateEsp32Sketch({board,experiment,sdaGpio:selected,sclGpio:selectedScl})
          :generateEsp32Sketch({board,experiment,gpio:selected});
      setError('');onUseCode(sketch);
    }catch(e){setError(e.message||'Could not generate this sketch.');}
  }
  if(!profile)return null;
  return <section className="studio-esp32-codegen" aria-labelledby="studio-esp32-codegen-title">
    <div><span className="edu-kicker">BOARD-AWARE STARTER CODE</span><h3 id="studio-esp32-codegen-title">ESP32 sketch generator</h3>
      <p>Generate editable Arduino-framework source for the selected physical-board reference. It does not compile or upload the sketch.</p></div>
    <div className="studio-esp32-codegen-controls">
      <label>Experiment<select value={experiment} onChange={event=>{setExperiment(event.target.value);setError('');}}>{EXPERIMENTS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>{experiment==='ultrasonic-distance'?'Trigger GPIO':'GPIO'}<select value={selected} onChange={event=>setGpio(event.target.value)}>{options.map(item=><option key={item.gpio} value={item.gpio}>GPIO{item.gpio} · {item.group}</option>)}</select></label>
      {experiment==='i2c-scanner'&&<label>SCL GPIO<select value={selectedScl} onChange={event=>setSclGpio(event.target.value)}>{sclOptions.filter(item=>String(item.gpio)!==selected).map(item=><option key={item.gpio} value={item.gpio}>GPIO{item.gpio} · {item.group}</option>)}</select></label>}
      {experiment==='ultrasonic-distance'&&<label>Echo GPIO<select value={selectedEcho} onChange={event=>setEchoGpio(event.target.value)}>{echoOptions.filter(item=>String(item.gpio)!==selected).map(item=><option key={item.gpio} value={item.gpio}>GPIO{item.gpio} · {item.group}</option>)}</select></label>}
      <button type="button" disabled={disabled||!selected||(experiment==='ultrasonic-distance'&&(!selectedEcho||selected===selectedEcho))||(experiment==='i2c-scanner'&&(!selectedScl||selected===selectedScl))} onClick={generate}>Generate sketch into editor</button>
    </div>
    {pin&&pin.restrictions.length>0&&<p className="studio-esp32-codegen-warning"><strong>Pin cautions:</strong> {pin.restrictions.join(' ')}</p>}
    {experiment==='i2c-scanner'&&<p className="studio-esp32-codegen-warning"><strong>I²C voltage safety:</strong> Use pull-up resistors to 3.3 V only and ensure every connected device is 3.3 V compatible or properly level-shifted. Confirm SDA/SCL labels and board-specific pin restrictions before wiring.</p>}
    {sclPin&&experiment==='i2c-scanner'&&sclPin.restrictions.length>0&&<p className="studio-esp32-codegen-warning"><strong>SCL pin cautions:</strong> {sclPin.restrictions.join(' ')}</p>}
    {experiment==='ultrasonic-distance'&&<p className="studio-esp32-codegen-warning"><strong>Voltage safety:</strong> HC-SR04 ECHO is commonly 5 V. Use a resistor divider or level shifter to bring ECHO down to 3.3 V before connecting it to ESP32. Never connect ECHO directly.</p>}
    {echoPin&&experiment==='ultrasonic-distance'&&echoPin.restrictions.length>0&&<p className="studio-esp32-codegen-warning"><strong>Echo pin cautions:</strong> {echoPin.restrictions.join(' ')}</p>}
    {(experiment==='led-blink'||experiment==='pwm-fade')&&<p className="studio-help">Use an external LED with a 220–330 Ω series resistor. Never connect an LED directly to a GPIO. PWM fading requires a current Arduino-ESP32 core with analogWrite() support.</p>}
    {experiment==='analog-read'&&<p className="studio-help">Keep the analog signal within the board's permitted input range (normally 0–3.3 V). ADC behavior and attenuation vary by chip.</p>}
    {error&&<p role="alert" className="studio-help">{error}</p>}
  </section>;
}
