'use client';
import {useMemo,useState} from 'react';
import {resolveStudioLibraries,insertSuggestedIncludes,STUDIO_LIBRARY_REGISTRY} from '../../lib/studio-libraries.mjs';
import {studioBoardName} from '../../lib/studio-boards.mjs';
import {auditStudioCatalog} from '../../lib/studio-part-capabilities.mjs';
export function StudioLibraryTools({parts=[],catalog=[],code='',setCode,customLibrary,setCustomLibrary,manualLibraries=[],setManualLibraries=()=>{},readOnly=false,board='arduino:avr:uno'}){
 const [status,setStatus]=useState('');
 const [productSearch,setProductSearch]=useState('');
 const [search,setSearch]=useState(''),[searching,setSearching]=useState(false),[catalogResult,setCatalogResult]=useState(null),[searchError,setSearchError]=useState('');
 async function searchLibraries(event){
  event.preventDefault();if(search.trim().length<2||searching)return;
  setSearching(true);setSearchError('');setCatalogResult(null);
  try{const response=await fetch('/api/studio/libraries?q='+encodeURIComponent(search.trim()),{signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Library search unavailable.');setCatalogResult(result);}catch(e){setSearchError(e.name==='TimeoutError'?'Library search timed out. Try again.':e.message);}finally{setSearching(false);}
 }

 const resolution=useMemo(()=>resolveStudioLibraries({parts,code,manualLibraries,board}),[parts,code,manualLibraries,board]);
 const catalogAudit=useMemo(()=>auditStudioCatalog(catalog,STUDIO_LIBRARY_REGISTRY),[catalog]);
 const selectedCapabilities=catalogAudit.items.filter(p=>parts.includes(p.id));
 const visibleProducts=catalogAudit.items.filter(p=>(p.name+' '+p.id).toLowerCase().includes(productSearch.trim().toLowerCase()));
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
  const updated=insertSuggestedIncludes(code,parts,manualLibraries,board);
  if(updated===code)setStatus('All suggested include directives are already present in the sketch.');
  else {setCode(updated);setStatus('Added missing supported library includes. Confirm generated source uses the correct library API.');}
 };
 return <section className="studio-library-panel" aria-label="Arduino library manager">
  <div className="studio-library-heading"><div><span className="edu-kicker">LIBRARY MANAGER / {studioBoardName(board)}</span><h3>Arduino libraries</h3></div><span>{resolution.details.length} library dependencies</span></div>
  {board!=='arduino:avr:uno'&&<p className="studio-note">These mappings were reviewed for Uno examples. Confirm ESP8266, ESP32 and M5Stack compatibility, exact board revision and installed core in Arduino IDE. Compile against the matching board core; library compatibility still depends on your exact hardware and API.</p>}
  <p>These suggestions use the selected parts and your sketch's <code>#include</code> headers. I²C LCD sketches can use <strong>hd44780</strong> or <strong>LiquidCrystal I2C</strong>, matching the header and API in your code; DHT22 uses <strong>DHT sensor library + Adafruit Unified Sensor</strong>; microSD uses <strong>SD + SPI</strong>.</p>
  {resolution.details.length?<ul className="studio-library-list">{resolution.details.map(item=><li key={item.id}><strong>{item.name}</strong><small>{item.reason}</small><span>{board!=='arduino:avr:uno'?'Check this library against your selected board core':item.mode==='managed'?'Installed automatically when compiling':'Included with Arduino AVR core'}</span></li>)}</ul>:<p className="studio-help">No external libraries were detected for this selection. Basic GPIO and Serial functions come from the selected Arduino board core.</p>}
  <div className="studio-library-coverage">
    <strong>{catalogAudit.total} products in the live catalog</strong>
    <span>{catalogAudit.mapped} have library recommendations · {catalogAudit.special} need board/model review. Other products use core functions or need no software library.</span>
    {selectedCapabilities.length>0&&<details open><summary>Libraries for your selected materials</summary>
      <ul>{selectedCapabilities.map(p=><li key={p.id}><b>{p.name}</b> — {p.note}<ul>{p.recommendations.map(lib=><li key={lib.id}><strong>{lib.name}</strong> · {lib.optional?'Optional / verify model':'Suggested driver'}<small>{lib.reason}</small><button type="button" disabled={readOnly||(!manualLibraries.includes(lib.id)&&manualLibraries.length>=15)} onClick={()=>setManualLibraries(current=>current.includes(lib.id)?current.filter(x=>x!==lib.id):current.length<15?[...current,lib.id]:current)}>{manualLibraries.includes(lib.id)?'Remove explicit choice':'Choose library'}</button></li>)}</ul></li>)}</ul>
    </details>}
    <details><summary>Browse library coverage for all store products</summary>
     <label className="studio-label" htmlFor="studio-product-library-search">Find a store product</label><input id="studio-product-library-search" value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="MQ135, LCD, relay…"/>
     <ul>{visibleProducts.map(p=><li key={p.id}><b>{p.name}</b><small>{p.note}</small>{p.recommendations.length>0&&<ul>{p.recommendations.map(lib=><li key={lib.id}><strong>{lib.name}</strong> · {lib.optional?'Optional / verify model':'Suggested driver'}<small>{lib.reason}</small><button type="button" disabled={readOnly||(!manualLibraries.includes(lib.id)&&manualLibraries.length>=15)} onClick={()=>setManualLibraries(current=>current.includes(lib.id)?current.filter(x=>x!==lib.id):current.length<15?[...current,lib.id]:current)}>{manualLibraries.includes(lib.id)?'Remove explicit choice':'Choose library'}</button></li>)}</ul>}</li>)}</ul>
     {!visibleProducts.length&&<p>No matching products in the loaded catalog.</p>}
    </details>
  </div>
  <details className="studio-library-manual"><summary>Choose additional Arduino libraries manually</summary>
    <p>Common library shortcuts. For other packages, search Arduino Library Manager below. Choose the library API that matches your sketch and selected board.</p>
    <div>{libraryOptions.map(([id,lib])=><label key={id}><input type="checkbox" disabled={readOnly||(!manualLibraries.includes(id)&&manualLibraries.length>=15)} checked={manualLibraries.includes(id)} onChange={e=>setManualLibraries(current=>e.target.checked?[...current,id]:current.filter(x=>x!==id))}/> <strong>{lib.name}</strong><small> {lib.reason}</small></label>)}</div>
  </details>
  <section className="studio-index-search" aria-label="Arduino Library Manager catalog">
   <h4>Search Arduino Library Manager</h4><p>Search the official catalog by name, author or header. Libraries install on demand during compilation, including their declared dependencies. Availability does not guarantee compatibility with every board.</p>
   <form onSubmit={searchLibraries}><label className="studio-label" htmlFor="studio-library-search">Library name or header</label><input id="studio-library-search" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)} placeholder="LiquidCrystal I2C, ACS712, ArduinoJson…"/><button type="submit" disabled={readOnly||searching||search.trim().length<2}>{searching?'Searching…':'Search libraries'}</button></form>
   {searchError&&<p role="alert" className="studio-error">{searchError}</p>}
   {catalogResult&&<><p role="status">Showing {catalogResult.libraries.length} of {catalogResult.total} matches · {catalogResult.catalogTotal} indexed libraries</p><ul className="studio-library-list">{catalogResult.libraries.map(lib=>{const id='index:'+lib.name,chosen=manualLibraries.includes(id);return <li key={lib.name}><strong>{lib.name} · {lib.version}</strong><small>{lib.author}</small><p>{lib.description}</p><small>Architectures: {lib.architectures.join(', ')||'Not specified'} · Headers: {lib.headers.join(', ')||'Not supplied in index'}</small><button type="button" disabled={readOnly||(!chosen&&manualLibraries.length>=15)} onClick={()=>setManualLibraries(current=>current.includes(id)?current.filter(x=>x!==id):current.length<15?[...current,id]:current)}>{chosen?'Remove from build':'Add to build'}</button></li>;})}</ul></>}
   {manualLibraries.some(id=>id.startsWith('index:'))&&<div><h4>Catalog libraries selected for this build</h4>{manualLibraries.filter(id=>id.startsWith('index:')).map(id=><button type="button" key={id} disabled={readOnly} onClick={()=>setManualLibraries(current=>current.filter(x=>x!==id))}>{id.slice(6)} ×</button>)}<p className="studio-help">Reselect these additional catalog libraries if you reload the workspace. Up to 15 manual library selections per build.</p></div>}
  </section>
  {resolution.unknownIncludes.length>0&&<p className="studio-note">Headers to resolve: {resolution.unknownIncludes.join(', ')}. Studio checks Arduino Library Manager for an unambiguous header match before compiling. Search and select a library if multiple packages provide it. Core, private or unindexed headers may require the matching board package or a ZIP library.</p>}
  <button type="button" onClick={insert} disabled={readOnly||!code}>Insert missing library includes</button>
  <div className="studio-library-import"><label className="studio-label" htmlFor="studio-custom-lib">Add your own Arduino library (.zip, up to 250 KB)</label><input type="file" id="studio-custom-lib" accept=".zip,application/zip" disabled={readOnly} onChange={importZip}/>
    {customLibrary?<p><strong>{customLibrary.name}</strong> ({Math.round(customLibrary.size/1024)} KB) <button type="button" disabled={readOnly} onClick={()=>{setCustomLibrary(null);setStatus('Custom library detached.');}}>Remove</button></p>:<p className="studio-help">No custom library attached. Your ZIP stays in this browser until compilation, then goes only into an isolated temporary sandbox. It is not publicly hosted or shared with other users.</p>}
    {status&&<p role="status" className="studio-notice">{status}</p>}
  </div>
  <p className="studio-help">Custom libraries may contain third-party code. Inspect and trust the archive yourself; the compiler runs it in a restricted, network-isolated sandbox when cloud compilation is enabled. Advanced ESP32-only libraries will not compile on Arduino UNO.</p>
 </section>;
}
