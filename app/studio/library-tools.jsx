'use client';
import {useMemo,useState} from 'react';
import {resolveStudioLibraries,insertSuggestedIncludes,STUDIO_LIBRARY_REGISTRY} from '../../lib/studio-libraries.mjs';
import {auditStudioCatalog} from '../../lib/studio-part-capabilities.mjs';
export function StudioLibraryTools({parts=[],catalog=[],code='',setCode,customLibrary,setCustomLibrary,manualLibraries=[],setManualLibraries=()=>{},readOnly=false}){
 const [status,setStatus]=useState('');
 const resolution=useMemo(()=>resolveStudioLibraries({parts,code,manualLibraries}),[parts,code,manualLibraries]);
 const catalogAudit=useMemo(()=>auditStudioCatalog(catalog,STUDIO_LIBRARY_REGISTRY),[catalog]);
 const selectedCapabilities=catalogAudit.items.filter(p=>parts.includes(p.id));
 const libraryOptions=Object.entries(STUDIO_LIBRARY_REGISTRY).filter(([,lib])=>Boolean(lib.name));
 async function importZip(event){
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(!/\.zip$/i.test(file.name)||file.size>250000){
   setStatus('Choose a ZIP Arduino library under 250 KB. Large archives or other formats are not accepted.');return;
  }
  try{
   const result=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
    reader.onerror=()=>reject(Error('Cannot read the ZIP file.'));
    reader.readAsDataURL(file);
   });
   setCustomLibrary({name:file.name,base64:result,size:file.size});
   setStatus(file.name+' attached to this build only. A sandbox check will reject unsafe files, paths or unsupported library structure.');
  }catch(e){setStatus(e.message);}
 }
 const insert=()=>{
  const updated=insertSuggestedIncludes(code,parts,manualLibraries);
  if(updated===code)setStatus('All suggested include directives are already present in the sketch.');
  else {setCode(updated);setStatus('Added missing supported library includes. Confirm generated source uses the correct library API.');}
 };
 return <section className="studio-library-panel" aria-label="Arduino library manager">
  <div className="studio-library-heading"><div><span className="edu-kicker">LIBRARY MANAGER / ARDUINO UNO</span><h3>Automatic component libraries</h3></div><span>{resolution.details.length} library dependencies</span></div>
  <p>These suggestions use the selected parts and your sketch's <code>#include</code> headers. For example, I²C LCDs use <strong>hd44780 + Wire</strong>; DHT22 uses <strong>DHT sensor library + Adafruit Unified Sensor</strong>; microSD uses <strong>SD + SPI</strong>.</p>
  {resolution.details.length?<ul className="studio-library-list">{resolution.details.map(item=><li key={item.id}><strong>{item.name}</strong><small>{item.reason}</small><span>{item.mode==='managed'?'Installed automatically when compiling':'Included with Arduino AVR core'}</span></li>)}</ul>:<p className="studio-help">No extra libraries required for this selection. Basic UNO GPIO functions are part of the AVR core.</p>}
  <div className="studio-library-coverage">
    <strong>{catalogAudit.total} products classified for Studio</strong>
    <span>{catalogAudit.mapped} have a known external library mapping · {catalogAudit.special} need board/variant review · the rest use general Arduino functionality or optional libraries.</span>
    {selectedCapabilities.length>0&&<details><summary>Hardware capability for selected items</summary>
      <ul>{selectedCapabilities.map(p=><li key={p.id}><b>{p.name}</b> — {p.status.replaceAll('-',' ')}. {p.note}</li>)}</ul>
    </details>}
  </div>
  <details className="studio-library-manual"><summary>Choose additional Arduino libraries manually</summary>
    <p>For specialized variants, select a trusted library. Compiling installs only supported packages. The microcontroller board core must still match your hardware.</p>
    <div>{libraryOptions.map(([id,lib])=><label key={id}><input type="checkbox" checked={manualLibraries.includes(id)} onChange={e=>setManualLibraries(current=>e.target.checked?[...current,id]:current.filter(x=>x!==id))}/> <strong>{lib.name}</strong><small> {lib.reason}</small></label>)}</div>
  </details>
  {resolution.unknownIncludes.length>0&&<p className="studio-warning">Unknown imports: {resolution.unknownIncludes.join(', ')}. Upload a matching Arduino library ZIP; the library must define the header used in your sketch. The Studio won't silently invent a dependency.</p>}
  <button type="button" onClick={insert} disabled={readOnly||!code}>Insert missing library includes</button>
  <div className="studio-library-import"><label className="studio-label" htmlFor="studio-custom-lib">Add your own Arduino library (.zip, up to 250 KB)</label><input type="file" id="studio-custom-lib" accept=".zip,application/zip" onChange={importZip}/>
    {customLibrary?<p><strong>{customLibrary.name}</strong> ({Math.round(customLibrary.size/1024)} KB) <button type="button" onClick={()=>{setCustomLibrary(null);setStatus('Custom library detached.');}}>Remove</button></p>:<p className="studio-help">No custom library attached. Your ZIP stays in this browser until compilation, then goes only into an isolated temporary sandbox. It is not publicly hosted or shared with other users.</p>}
    {status&&<p role="status" className="studio-notice">{status}</p>}
  </div>
  <p className="studio-help">Custom libraries may contain third-party code. Inspect and trust the archive yourself; the compiler runs it in a restricted, network-isolated sandbox when cloud compilation is enabled. Advanced ESP32-only libraries will not compile on Arduino UNO.</p>
 </section>;
}
