import {gunzipSync} from 'node:zlib';
const INDEX_URL='https://downloads.arduino.cc/libraries/library_index.json.gz';
let cached,pending,loadedAt=0;
const validName=name=>typeof name==='string'&&/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,199}$/.test(name);
function newer(a,b){
 const [ac,ap]=a.split('-',2),[bc,bp]=b.split('-',2);const av=ac.split('.').map(Number),bv=bc.split('.').map(Number);
 for(let i=0;i<Math.max(av.length,bv.length);i++){const d=(av[i]||0)-(bv[i]||0);if(d)return d>0;}
 if(!ap&&bp)return true;if(ap&&!bp)return false;return a.localeCompare(b,undefined,{numeric:true})>0;
}
export async function readArduinoLibraryIndex(){
 if(cached&&Date.now()-loadedAt<21600000)return cached;
 if(pending)return pending;
 pending=(async()=>{
  const response=await fetch(INDEX_URL,{signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'error'});
  if(!response.ok)throw Error('Arduino library catalog is unavailable. Try again later.');
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;if(size>12000000)throw Error('Arduino library catalog exceeds download limit.');chunks.push(chunk);}
  const entries=JSON.parse(gunzipSync(Buffer.concat(chunks),{maxOutputLength:128000000}).toString('utf8')).libraries;
  if(!Array.isArray(entries))throw Error('Invalid Arduino library catalog.');
  const latest=new Map();
  for(const row of entries){
   if(!validName(row.name)||typeof row.version!=='string'||!/^\d+(?:\.\d+){1,3}(?:[-+][A-Za-z0-9.-]+)?$/.test(row.version))continue;
   const prior=latest.get(row.name);if(prior&&!newer(row.version,prior.version))continue;
   latest.set(row.name,{name:row.name,version:row.version,author:String(row.author||'').replace(/<[^>]*>/g,'').slice(0,180),description:String(row.sentence||'').slice(0,220),architectures:Array.isArray(row.architectures)?row.architectures:[],headers:Array.isArray(row.providesIncludes)?row.providesIncludes.filter(h=>typeof h==='string'):[]});
  }
  cached=[...latest.values()].sort((a,b)=>a.name.localeCompare(b.name));loadedAt=Date.now();return cached;
 })();
 try{return await pending;}finally{pending=null;}
}
export async function expandIndexedLibraries(dependencies,manualLibraries,board){
 const requested=manualLibraries.filter(id=>id.startsWith('index:')).map(id=>id.slice(6));
 if(!requested.length&&!dependencies.unknownIncludes.length)return dependencies;
 const catalog=await readArduinoLibraryIndex(),selected=[];const architecture=board.split(':')[1];
 for(const name of requested){const entry=catalog.find(x=>x.name===name);if(!entry)throw Error('Library is not in Arduino Library Manager: '+name);selected.push(entry);}
 for(const header of dependencies.unknownIncludes){
  if(selected.some(x=>x.headers.includes(header)))continue;
  const choices=catalog.filter(x=>x.headers.includes(header));
  const compatible=choices.filter(x=>x.architectures.includes('*')||x.architectures.includes(architecture));
  const candidates=compatible.length?compatible:choices;
  if(candidates.length===1)selected.push(candidates[0]);
  else if(candidates.length>1&&!requested.length)throw Error('Multiple libraries provide '+header+': '+candidates.slice(0,6).map(x=>x.name).join(', ')+'. Choose the intended library in Libraries & build settings.');
  // Missing metadata is not proof of a missing header: core and ZIP headers are resolved by Arduino CLI.
 }
 const unique=[...new Map(selected.map(x=>[x.name,x])).values()];
 const selectedNames=new Set(unique.map(x=>x.name));
 const explicitHeaders=new Set(unique.filter(x=>requested.includes(x.name)).flatMap(x=>x.headers));
 const replacedNames=new Set(dependencies.details.filter(x=>x.headers.some(h=>explicitHeaders.has(h))).map(x=>x.name));
 return {...dependencies,packages:[...new Set([...dependencies.packages.filter(name=>!selectedNames.has(name)&&!replacedNames.has(name)),...unique.map(x=>x.name+'@'+x.version)])],details:[...dependencies.details.filter(x=>!replacedNames.has(x.name)),...unique.map(x=>({id:'index:'+x.name,name:x.name+' '+x.version,headers:x.headers,mode:'managed',reason:'Arduino Library Manager'}))]};
}
