'use client';
import {useState} from 'react';
export function LessonCode({code,filename}){
  const [message,setMessage]=useState('');
  async function copy(){
    try{
      await navigator.clipboard.writeText(code);
      setMessage('Sketch copied to clipboard.');
    }catch{
      setMessage('Clipboard unavailable. Select the code below to copy.');
    }
  }
  function download(){
    const blob=new Blob([code+'\n'],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    setMessage('Downloading '+filename);
  }
  return <div className="edu-lesson-code">
    <div className="edu-code-header"><span>{filename}</span><div><button type="button" onClick={copy}>Copy sketch</button><button type="button" onClick={download}>Download .ino ↓</button></div></div>
    <pre className="edu-code" tabIndex="0" aria-label="Complete Arduino code"><code>{code}</code></pre>
    <p className="edu-muted" role="status" aria-live="polite">{message}</p>
  </div>;
}
