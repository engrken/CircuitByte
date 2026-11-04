// Opt-in status stream; the existing JSON AI handler remains the sole auth, safety and quota authority.
export function createStudioProgressResponse(run,{onCancel}={}){
 const encoder=new TextEncoder();
 let stopped=false,timer;
 const stream=new ReadableStream({
  start(controller){
   const send=value=>{
    if(stopped)return;
    try{controller.enqueue(encoder.encode(JSON.stringify(value)+'\n'));}catch{stopped=true;}
   };
   const finish=()=>{
    clearInterval(timer);
    if(!stopped){stopped=true;try{controller.close();}catch{/* client disconnected */}}
   };
   send({type:'status',message:'Checking Studio access, materials and monthly allowance…'});
   timer=setInterval(()=>send({type:'status',message:'Working on your draft. Wiring and code will appear only after validation.'}),12000);
   Promise.resolve().then(run).then(async response=>{
    if(!response||typeof response.json!=='function')throw Error('Studio returned an unreadable result.');
    let result;
    try{result=await response.json();}catch{throw Error('Studio returned an unreadable result.');}
    if(response.ok){
     if(!result||typeof result!=='object'||typeof result.code!=='string')throw Error('Studio returned an invalid draft.');
     send({type:'complete',result});
    }else{
     send({type:'error',status:response.status,error:String(result?.error||'AI generation unavailable.').slice(0,400)});
    }
   }).catch(()=>send({type:'error',error:'AI generation stopped before a verified draft was available.'})).finally(finish);
  },
  cancel(){stopped=true;clearInterval(timer);onCancel?.();}
 });
 return new Response(stream,{status:200,headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store, no-transform','X-Content-Type-Options':'nosniff','X-Accel-Buffering':'no'}});
}
