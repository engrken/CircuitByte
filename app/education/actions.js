'use client';
import {useState} from 'react';
export function CodeActions({code,name}){const [status,setStatus]=useState('');return <div className="edu-actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(code);setStatus('Code copied');}catch{setStatus('Clipboard unavailable. Select the code below or download it.');}}}>Copy code</button><a className="edu-button secondary" href={'/education/code/'+name} download>Download .ino ↓</a><span role="status">{status}</span></div>}
export function PrintGuide(){return <button className="edu-print" onClick={()=>window.print()}>Print guide / Save PDF</button>}
