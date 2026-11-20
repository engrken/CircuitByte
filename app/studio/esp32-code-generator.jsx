'use client';

import {useMemo,useState} from 'react';
import {getEsp32CodegenOptions,generateEsp32Sketch,getEsp32CodegenProfile} from '../../lib/esp32/codegen.mjs';

const EXPERIMENTS=[
  {id:'led-blink',label:'Blink an external LED'},
  {id:'pwm-fade',label:'Fade an LED with PWM'},
  {id:'button-input',label:'Read a pull-up button'},
  {id:'analog-read',label:'Read an analog sensor'},
  {id:'ultrasonic-distance',label:'Measure ultrasonic distance'}
];

export function StudioEsp32CodeGenerator({board,onUseCode,disabled=false}) {
  const profile=getEsp32CodegenProfile(board);
  const [experiment,setExperiment]=useState('led-blink');
  const options=useMemo(()=>getEsp32CodegenOptions(board,experiment),[board,experiment]);
  const echoOptions=useMemo(()=>getEsp32CodegenOptions(board,'ultrasonic-distance','echo'),[board]);
  const [gpio,setGpio]=useState('');
  const [echoGpio,setEchoGpio]=useState('');
  const selected=options.some(pin=>String(pin.gpio)===gpio)?gpio:(options[0]?String(options[0].gpio):'');
  const selectedEcho=echoOptions.some(pin=>String(pin.gpio)===echoGpio)?echoGpio:(echoOptions.find(pin=>String(pin.gpio)!==selected)?String(echoOptions.find(pin=>String(pin.gpio)!==selected).gpio):'');
  const pin=options.find(item=>String(item.gpio)===selected);
  const echoPin=echoOptions.find(item=>String(item.gpio)===selectedEcho);
  const [error,setError]=useState('');
  function generate(){
    try{
      const sketch=experiment==='ultrasonic-distance'
        ?generateEsp32Sketch({board,experiment,triggerGpio:selected,echoGpio:selectedEcho})
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
      {experiment==='ultrasonic-distance'&&<label>Echo GPIO<select value={selectedEcho} onChange={event=>setEchoGpio(event.target.value)}>{echoOptions.filter(item=>String(item.gpio)!==selected).map(item=><option key={item.gpio} value={item.gpio}>GPIO{item.gpio} · {item.group}</option>)}</select></label>}
      <button type="button" disabled={disabled||!selected||(experiment==='ultrasonic-distance'&&(!selectedEcho||selected===selectedEcho))} onClick={generate}>Generate sketch into editor</button>
    </div>
    {pin&&pin.restrictions.length>0&&<p className="studio-esp32-codegen-warning"><strong>Pin cautions:</strong> {pin.restrictions.join(' ')}</p>}
    {experiment==='ultrasonic-distance'&&<p className="studio-esp32-codegen-warning"><strong>Voltage safety:</strong> HC-SR04 ECHO is commonly 5 V. Use a resistor divider or level shifter to bring ECHO down to 3.3 V before connecting it to ESP32. Never connect ECHO directly.</p>}
    {echoPin&&experiment==='ultrasonic-distance'&&echoPin.restrictions.length>0&&<p className="studio-esp32-codegen-warning"><strong>Echo pin cautions:</strong> {echoPin.restrictions.join(' ')}</p>}
    {(experiment==='led-blink'||experiment==='pwm-fade')&&<p className="studio-help">Use an external LED with a 220–330 Ω series resistor. Never connect an LED directly to a GPIO. PWM fading requires a current Arduino-ESP32 core with analogWrite() support.</p>}
    {experiment==='analog-read'&&<p className="studio-help">Keep the analog signal within the board's permitted input range (normally 0–3.3 V). ADC behavior and attenuation vary by chip.</p>}
    {error&&<p role="alert" className="studio-help">{error}</p>}
  </section>;
}
