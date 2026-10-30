import {requireAdmin,sameOrigin} from '../../../../lib/auth';
import catalog from '../../../../scripts/catalog.json';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const dangerous=/\b(mains|wall outlet|220\s*v|230\s*v|110\s*v|life support|medical device|high voltage)\b/i;
const components=new Map(catalog.map(item=>[item.id,{id:item.id,name:item.name,details:String(item.description||'').slice(0,180)}]));
export async function POST(request){
  try{sameOrigin(request);await requireAdmin();}
  catch{return Response.json({error:'AI generation is available only to authenticated Studio beta administrators.'},{status:403});}
  if(process.env.STUDIO_AI_ENABLED!=='true')return Response.json({error:'AI generation is not activated for this beta. Guided starter templates remain free.'},{status:503});
  const model=process.env.STUDIO_AI_MODEL;
  const credential=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
  if(!model||!credential)return Response.json({error:'Studio AI Gateway model or credentials are not configured.'},{status:503});
  let input;
  try{input=await request.json();}catch{return Response.json({error:'Malformed request.'},{status:400});}
  const prompt=String(input?.prompt||'').trim();
  const parts=Array.isArray(input?.parts)?[...new Set(input.parts)].slice(0,16).map(id=>components.get(id)).filter(Boolean):[];
  if(prompt.length<12||prompt.length>800||parts.length<2||dangerous.test(prompt)){
    return Response.json({error:'Select at least two catalog parts and describe a low-voltage educational project (12–800 characters).'}, {status:400});
  }
  if(!parts.some(part=>part.id==='cb-059'))return Response.json({error:'This beta requires the catalog Arduino UNO R3.'},{status:400});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{
      method:'POST',signal:controller.signal,
      headers:{'Authorization':'Bearer '+credential,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,temperature:0.2,max_tokens:3400,
        messages:[
          {role:'system',content:'You are an engineering teaching assistant generating original small Arduino UNO R3, 5V low-voltage educational sketches. Respond with ONE JSON object only, keys title, summary, slug, code, wires (array of [from,to]), warnings (array of strings). The code must contain valid void setup() and void loop(). Use ONLY listed hardware, UNO-safe pins, current limiting resistors and explicitly identified libraries. Never invent physical capabilities, missing components, verified wiring, hardware safety, or successful compilation. No mains, AC, high-voltage, medical, or safety-critical systems. If parts are insufficient, reply with a JSON object containing error explaining precisely what is missing. Set slug to studio-generated. Code must be under 12000 characters. Do not include secrets or network credentials.'},
          {role:'user',content:JSON.stringify({request:prompt,selectedParts:parts,board:'Arduino UNO R3'})}
        ]
      })
    });
    if(!response.ok)return Response.json({error:'AI Gateway rejected the request ('+response.status+'). Check model, budget and credentials.'},{status:503});
    const data=await response.json();let text=String(data?.choices?.[0]?.message?.content||'').trim();
    const ticks=String.fromCharCode(96).repeat(3);
    if(text.startsWith(ticks)){text=text.slice(3).replace(/^json\s*/i,'');if(text.endsWith(ticks))text=text.slice(0,-3).trim();}
    let result;try{result=JSON.parse(text);}catch{return Response.json({error:'Model returned an invalid response. Try the guided project matcher.'},{status:502});}
    if(result.error)return Response.json({error:String(result.error).slice(0,400)},{status:422});
    const code=String(result.code||'');
    if(code.length<40||code.length>15000||!/\bvoid\s+setup\s*\(/.test(code)||!/\bvoid\s+loop\s*\(/.test(code)) {
      return Response.json({error:'AI output did not pass sketch format validation. Please try again.'},{status:422});
    }
    const wires=Array.isArray(result.wires)?result.wires.filter(a=>Array.isArray(a)&&a.length===2).slice(0,18).map(a=>a.map(x=>String(x).slice(0,140))):[];
    const warnings=Array.isArray(result.warnings)?result.warnings.slice(0,8).map(x=>String(x).slice(0,250)):[];
    return Response.json({
      title:String(result.title||'AI-generated Arduino sketch').slice(0,100),summary:String(result.summary||'AI-generated draft for review.').slice(0,350),
      slug:'studio-generated',parts:parts.map(x=>x.id),code,wires,
      warnings:[...warnings,'Unverified AI draft. Review wiring, exact module ratings, and compile output before attempting a physical build.']
    },{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'AI generation timed out or could not be completed. No project was saved.'},{status:503});}
  finally{clearTimeout(timeout);}
}
