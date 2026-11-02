'use client';
import {StudioEspUpload} from './esp-upload';
import {uploadProfile} from '../../lib/studio-upload-profiles.mjs';
import {studioBoardName} from '../../lib/studio-boards.mjs';
import {useEffect,useRef,useState} from 'react';
import {describeSerialPort,parseIntelHex,uploadUnoHex} from '../../lib/studio-serial.mjs';

const BAUDS=[9600,19200,38400,57600,115200];
export function StudioUsbTools({compiledHex,firmwareImages,board='arduino:avr:uno',uploadEnabled=false,disabled=false,onBusyChange}) {
  const [supported,setSupported]=useState(null);
  const [ports,setPorts]=useState([]);
  const [selected,setSelected]=useState(-1);
  const [monitor,setMonitor]=useState(false);
  const [baud,setBaud]=useState(9600);
  const [logs,setLogs]=useState('');
  const [message,setMessage]=useState('');
  const [lineEnding,setLineEnding]=useState('newline');
  const [notice,setNotice]=useState('Connect with a USB data cable. Port permission is always requested by your browser.');
  const [error,setError]=useState('');
  const [firmwareFile,setFirmwareFile]=useState(null);
  const [confirmFlash,setConfirmFlash]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [progress,setProgress]=useState(0);
  const monitorReader=useRef(null);
  const monitorTask=useRef(null);
  const monitorPort=useRef(null);
  const disposed=useRef(false);
  const selectedPort=ports[selected]||null;
  const profile=uploadProfile(board);
  const canFlash=uploadEnabled&&profile?.kind==='stk500';
  const binary=firmwareFile?.hex||compiledHex||null;
  const binaryLabel=firmwareFile?.name||(compiledHex?'Cloud-compiled '+studioBoardName(board)+' firmware':'No firmware selected');

  useEffect(()=>{setFirmwareFile(null);setConfirmFlash(false);},[board]);
  useEffect(()=>{if(compiledHex)setFirmwareFile(null);},[compiledHex]);
  useEffect(()=>{setConfirmFlash(false);setProgress(0);},[selectedPort,compiledHex,firmwareFile,board]);
  useEffect(()=>{onBusyChange?.(uploading);return()=>onBusyChange?.(false);},[uploading,onBusyChange]);
  useEffect(()=>{
    disposed.current=false;
    const serial=typeof navigator!=='undefined' ? navigator.serial : undefined;
    setSupported(Boolean(serial?.requestPort&&serial?.getPorts&&window.isSecureContext));
    if(!serial||!window.isSecureContext)return;
    async function refresh(){
      try {
        const allowed=await serial.getPorts();
        if(!disposed.current){setPorts(allowed);setSelected(previous=>allowed.length?Math.max(0,Math.min(previous,allowed.length-1)):-1);}
      }catch(e){if(!disposed.current)setError('Unable to list previously permitted serial ports: '+e.message);}
    }
    const connected=()=>{refresh();};
    serial.addEventListener?.('connect',connected);
    serial.addEventListener?.('disconnect',connected);
    refresh();
    return ()=>{
      disposed.current=true;
      serial.removeEventListener?.('connect',connected);
      serial.removeEventListener?.('disconnect',connected);
      const oldReader=monitorReader.current;
      if(oldReader)oldReader.cancel().catch(()=>{});
      const oldPort=monitorPort.current;
      if(oldPort)oldPort.close().catch(()=>{});
    };
  },[]);

  function clear(){setError('');setNotice('');}
  function append(text){setLogs(prev=>(prev+text).slice(-24000));}
  async function requestDevice(){
    if(!navigator.serial)return;
    clear();
    try{
      const port=await navigator.serial.requestPort(); // Explicit user gesture; never auto-grant.
      const authorized=await navigator.serial.getPorts();
      const list=authorized.includes(port)?authorized:[...authorized,port];
      setPorts(list);setSelected(list.indexOf(port));
      setNotice('USB serial device selected. VID/PID is a hint only—not verification of its board or bootloader.');
    }catch(e){if(e.name!=='NotFoundError')setError('Device selection failed: '+e.message);}
  }
  async function refreshPorts(){
    clear();
    try{const allowed=await navigator.serial.getPorts();setPorts(allowed);setSelected(allowed.length?0:-1);setNotice('Showing only ports previously permitted for this website.');}
    catch(e){setError(e.message);}
  }
  async function disconnectMonitor(){
    const reader=monitorReader.current;
    if(reader){try{await reader.cancel();}catch{}}
    if(monitorTask.current){try{await monitorTask.current;}catch{}}
    const port=monitorPort.current;
    if(port){try{await port.close();}catch{}}
    monitorReader.current=null;monitorTask.current=null;monitorPort.current=null;
    setMonitor(false);
  }
  async function connectMonitor(){
    if(!selectedPort)return;clear();
    if(monitorPort.current)await disconnectMonitor();
    try{
      await selectedPort.open({baudRate:Number(baud),bufferSize:1024});
      monitorPort.current=selectedPort;
      setMonitor(true);setNotice('Serial Monitor connected at '+baud+' baud. Opening the port may reset the Arduino.');
      const reader=selectedPort.readable.getReader();
      monitorReader.current=reader;
      const decoder=new TextDecoder();
      monitorTask.current=(async()=>{
        try{
          while(true){const {value,done}=await reader.read();if(done)break;if(value)append(decoder.decode(value,{stream:true}));}
          const last=decoder.decode();if(last)append(last);
        }catch(e){if(!disposed.current)setError('Serial Monitor lost connection: '+e.message);}
        finally{
          try{reader.releaseLock();}catch{}
          monitorReader.current=null;monitorTask.current=null;
          if(monitorPort.current===selectedPort){monitorPort.current=null;try{await selectedPort.close();}catch{}}
          if(!disposed.current)setMonitor(false);
        }
      })();
    }catch(e){
      try{await selectedPort.close();}catch{}
      monitorPort.current=null;setMonitor(false);
      setError('Cannot open serial port. Close Arduino IDE/other monitor and check the cable or driver. '+e.message);
    }
  }
  async function sendMessage(){
    if(!monitorPort.current?.writable)return;
    try{
      const extra=lineEnding==='newline'?'\n':lineEnding==='crlf'?'\r\n':'';
      const writer=monitorPort.current.writable.getWriter();
      try{await writer.write(new TextEncoder().encode(message+extra));}
      finally{writer.releaseLock();}
      setMessage('');
    }catch(e){setError('Serial write failed: '+e.message);}
  }
  async function pickFirmware(event){
    const file=event.target.files?.[0];if(!file)return;
    clear();setConfirmFlash(false);setProgress(0);
    try{
      if(!/\.hex$/i.test(file.name)||file.size>250000)throw Error('Choose an Intel HEX file (.hex) under 250 KB.');
      const hex=await file.text();
      const data=parseIntelHex(hex,profile?.maxFlash);
      setFirmwareFile({hex,name:file.name,bytes:data.usedBytes,pages:data.pages});
      setNotice('Intel HEX parsed: '+data.usedBytes+' application bytes. A valid file does not prove target board compatibility.');
    }catch(e){setFirmwareFile(null);setError(e.message);}
    event.target.value='';
  }
  async function upload(){
    if(!canFlash||disabled||!selectedPort||!binary||!confirmFlash||uploading)return;
    clear();setProgress(0);setUploading(true);
    try{
      await disconnectMonitor(); // Upload owns the serial port exclusively.
      const data=parseIntelHex(binary,profile?.maxFlash);
      setNotice('Preparing to flash '+data.pages+' pages. Do not unplug the board. This replaces the selected device program.');
      const result=await uploadUnoHex(selectedPort,binary,{board,onProgress:p=>setProgress(p.percent)});
      setNotice('Upload and byte-for-byte readback verified for ATmega328P ('+result.usedBytes+' bytes). Physical functionality still requires testing.');
      setConfirmFlash(false);
    }catch(e){setError('Upload failed: '+e.message+' No successful flash is claimed. If sync fails, try manual RESET during connection.');}
    finally{setUploading(false);}
  }
  const descriptor=selectedPort?describeSerialPort(selectedPort.getInfo?.()||{}):null;
  return <section className="studio-usb-panel" aria-label="Arduino IDE USB hardware tools">
    <div className="studio-usb-heading"><div><span className="edu-kicker">HARDWARE TOOLS / WEB SERIAL</span><h3>USB board connection &amp; Serial Monitor</h3><p>Connect a permitted USB serial port to monitor your board. Browser flashing is available for Uno, classic Nano, ESP8266, ESP32/S3/C3 and M5Stack Core. Select the exact board and bootloader.</p></div><span className="studio-board">Multi-board USB tools</span></div>
    {supported===null?<p className="studio-help">Checking this browser for Web Serial support…</p>:supported===false?<div className="studio-warning"><strong>Direct USB serial is not supported in this browser.</strong><p>Use HTTPS in a Web Serial-capable browser (typically desktop Chrome or Edge), and connect a USB data cable. Android support depends on browser, OTG and USB drivers. Safari and many embedded browsers do not provide this feature. Arduino code editing and downloads remain available.</p></div>:<div className="studio-usb-columns">
      <div className="studio-usb-controls">
        <div className="studio-usb-buttons"><button type="button" onClick={requestDevice} disabled={disabled||uploading||monitor}>Connect / Choose USB port</button><button type="button" onClick={refreshPorts} disabled={disabled||uploading||monitor}>Refresh permitted ports</button></div>
        <label className="studio-label" htmlFor="studio-usb-port">USB serial device</label>
        <select id="studio-usb-port" value={selected} onChange={e=>setSelected(Number(e.target.value))} disabled={disabled||monitor||uploading}>
          <option value={-1}>No permitted port selected</option>
          {ports.map((port,i)=>{const item=describeSerialPort(port.getInfo?.()||{});return <option key={i} value={i}>{i+1}. {item.label} — {item.identity}</option>;})}
        </select>
        {descriptor&&<div className="studio-usb-identity"><strong>{descriptor.label}</strong><span>{descriptor.identity}</span><small>{descriptor.warning}</small></div>}
        <label className="studio-label" htmlFor="studio-usb-baud">Serial Monitor baud rate</label>
        <select id="studio-usb-baud" value={baud} onChange={e=>setBaud(Number(e.target.value))} disabled={disabled||monitor||uploading}>{BAUDS.map(rate=><option key={rate} value={rate}>{rate} baud</option>)}</select>
        <div className="studio-usb-buttons">{monitor?<button type="button" onClick={disconnectMonitor}>Disconnect monitor</button>:<button type="button" disabled={disabled||!selectedPort||uploading} onClick={connectMonitor}>Open Serial Monitor</button>}<button type="button" onClick={()=>setLogs('')}>Clear log</button></div>
        <div className="studio-serial-console" aria-label="Received serial data" role="log"><pre>{logs||'Serial output appears here when connected. Set baud to match Serial.begin() in your sketch.'}</pre></div>
        <div className="studio-usb-send"><input aria-label="Serial message to send" placeholder="Text to send…" value={message} onChange={e=>setMessage(e.target.value)} disabled={!monitor} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();sendMessage();}}}/><select value={lineEnding} aria-label="Line ending" onChange={e=>setLineEnding(e.target.value)} disabled={!monitor}><option value="newline">Newline</option><option value="crlf">CR+LF</option><option value="none">None</option></select><button type="button" disabled={!monitor} onClick={sendMessage}>Send</button></div>
      </div>
      <div className="studio-usb-upload">{canFlash?<>
        <h4>Flash firmware (.hex) — {studioBoardName(board)}</h4>
        <p>Use a compiled firmware artifact when available, or import a .hex file from Arduino IDE. Uploading <strong>replaces the board's existing sketch</strong>. {profile.label} at {profile.baud} baud.</p>
        <label className="studio-label" htmlFor="studio-usb-hex">Import Intel HEX firmware (optional)</label>
        <input id="studio-usb-hex" type="file" accept=".hex,text/plain" onChange={pickFirmware} disabled={uploading}/>
        <p className="studio-usb-binary">{binaryLabel}</p>
        {firmwareFile&&compiledHex&&<button type="button" disabled={uploading} onClick={()=>setFirmwareFile(null)}>Use cloud-compiled firmware instead</button>}
        <label className="studio-usb-consent"><input type="checkbox" checked={confirmFlash} onChange={e=>setConfirmFlash(e.target.checked)} disabled={uploading}/> I confirm this is my {studioBoardName(board)} using {profile.label}, its wiring is safe, and I authorize overwriting its program.</label>
        <button type="button" className="studio-usb-flash" disabled={disabled||!selectedPort||!binary||!confirmFlash||uploading||supported!==true} onClick={upload}>{uploading?'Uploading / verifying… '+progress+'%':'Upload to '+studioBoardName(board)}</button>
        {uploading&&<progress aria-label="Firmware upload progress" value={progress} max={100}/>}
        <p className="studio-help">USB vendor IDs identify adapter manufacturers, not necessarily the board. Upload is never automatic. The selected board profile determines bootloader baud and flash limits. ATmega328P chip signature and flash readback are checked.</p>
      </>:uploadEnabled&&profile?.kind==='esp'?<StudioEspUpload board={board} port={selectedPort} firmwareImages={firmwareImages} disabled={disabled} beforeUpload={disconnectMonitor} onBusyChange={setUploading}/>:<div><h4>{studioBoardName(board)} upload</h4><p>Code generation, compilation, diagrams and serial monitoring are available. This board’s browser flashing protocol is not implemented; use Arduino IDE to upload the downloaded sketch or firmware.</p><a href="https://docs.arduino.cc/software/ide-v2/tutorials/getting-started/ide-v2-uploading-a-sketch" target="_blank" rel="noreferrer">Arduino IDE upload guide ↗</a></div>}</div>
    </div>}
    {error&&<p className="studio-error" role="alert">{error}</p>}
    {notice&&<p className="studio-notice" role="status">{notice}</p>}
  </section>;
}
