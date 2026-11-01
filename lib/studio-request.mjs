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
