export async function studioRequest(url,body,{timeoutMs=45000}={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
  let result;try{result=await response.json();}catch{throw Error('The service returned an unreadable response. Please refresh its status and try again.');}
  if(!response.ok)throw Error(result.error||'The request could not be completed. Please try again.');
  return result;
 }catch(error){
  if(controller.signal.aborted)throw Error('This request timed out. Refresh service status before retrying. Your browser draft is still available.');
  throw error;
 }finally{clearTimeout(timer);}
}

/**
 * Opt-in progressive AI transport. Only a final, server-validated draft is returned;
 * intermediate status events are never parsed as sketches or hardware instructions.
 */
export async function studioProgressRequest(url,body,{timeoutMs=45000,onProgress=()=>{}}={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{
   method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},
   body:JSON.stringify(body),signal:controller.signal
  });
  if(!response.ok){
   let result;try{result=await response.json();}catch{}
   throw Error(result?.error||'The Studio streaming service is unavailable.');
  }
  if(!response.body||!response.headers.get('content-type')?.includes('application/x-ndjson'))
   throw Error('The Studio service did not provide a valid project stream.');
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer='',verified=null,finished=false,total=0;
  try{
   while(true){
    const {done,value}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>250000)throw Error('The Studio response exceeded its safe size limit.');
    buffer+=decoder.decode(value,{stream:true});
    const lines=buffer.split('\n');
    buffer=lines.pop();
    for(const line of lines){
     if(!line.trim())continue;
     let event;try{event=JSON.parse(line);}catch{throw Error('The Studio project stream contained invalid data.');}
     if(finished)throw Error('The Studio project stream contained duplicate final results.');
     if(event?.type==='status'){
      if(typeof event.message==='string')onProgress(event.message.slice(0,160));
     }else if(event?.type==='error'){
      finished=true;throw Error(String(event.error||'AI generation failed.').slice(0,400));
     }else if(event?.type==='complete'){
      if(!event.result||typeof event.result.code!=='string')throw Error('The Studio stream did not contain a valid sketch.');
      verified=event.result;finished=true;
     }else throw Error('Unexpected Studio stream event.');
    }
   }
  }finally{reader.releaseLock();}
  if(!finished||buffer.trim()||!verified)throw Error('The Studio stream ended without a verified draft. Your previous sketch is unchanged.');
  return verified;
 }catch(error){
  if(controller.signal.aborted)throw Error('This request timed out. Refresh service status before retrying. Your browser draft is still available.');
  throw error;
 }finally{clearTimeout(timer);}
}
