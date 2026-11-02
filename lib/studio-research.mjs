import {COMMON_MODULES,validKnowledgeTopic,searchCommonModules} from './studio-modules.mjs';

const referenceIndex='https://docs.arduino.cc/libraries/';
const supportedGitHub='https://github.com/';
export async function discoverModuleReferences(query,{fetcher=fetch}={}){
 const topic=validKnowledgeTopic(query);
 if(!topic)throw Error('Enter a module or chip name (3–90 letters/numbers), not private data or credentials.');
 const known=searchCommonModules(topic,5);
 const official=known.map(module=>({title:module.name+' reference',url:module.sourceUrl,kind:'official-reference'}));
 if(official.length)return {topic,sources:official,foundInLibrary:true};
 // The query is sent only to GitHub's public repository discovery endpoint. Never fetch user-supplied URLs.
 const search=new URL('https://api.github.com/search/repositories');
 search.searchParams.set('q',topic+' arduino in:name,description');
 search.searchParams.set('sort','stars');
 search.searchParams.set('per_page','5');
 let candidates=[];
 try{
  const response=await fetcher(search.toString(),{
   headers:{Accept:'application/vnd.github+json','User-Agent':'CircuitByte-Studio-Research'},
   signal:AbortSignal.timeout(6000),next:{revalidate:3600}
  });
  if(response.ok){
   const data=await response.json();
   if(Array.isArray(data.items))candidates=data.items.slice(0,5).filter(item=>{
    try{const link=new URL(item.html_url);return link.protocol==='https:'&&link.hostname==='github.com'&&link.pathname.split('/').filter(Boolean).length===2;}
    catch{return false;}
   }).map(item=>({title:String(item.full_name||'Community repository').slice(0,130),
    url:item.html_url,kind:'unverified-community-candidate',description:String(item.description||'').slice(0,180)}));
  }
 }catch{/* External discovery is optional. Never interrupt local Studio modules. */}
 return {topic,foundInLibrary:false,sources:[...candidates,
  {title:'Arduino Library Directory',url:referenceIndex,kind:'official-library-index'},
  {title:'ESP32 Arduino documentation',url:'https://docs.espressif.com/projects/arduino-esp32/en/latest/',kind:'official-library-index'}],
  notice:'External links are discovery leads, not verified wiring, compatible libraries, or product specifications. Review the manufacturer datasheet before building.'};
}
