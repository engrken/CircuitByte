import modules from '../content/studio-common-modules.json' with {type:'json'};

export const COMMON_MODULES=Object.freeze(modules);
const validId=/^[a-z0-9][a-z0-9-]{1,48}$/;
export function selectKnownModules(ids=[]){
 if(!Array.isArray(ids))return [];
 const valid=new Set(ids.filter(value=>typeof value==='string'&&validId.test(value)).slice(0,12));
 return COMMON_MODULES.filter(module=>valid.has(module.id)).slice(0,8);
}
export function searchCommonModules(query='',limit=12){
 const q=String(query||'').trim().toLowerCase().slice(0,100);
 if(!q)return COMMON_MODULES.slice(0,limit);
 const tokens=q.split(/\s+/).filter(Boolean);
 return COMMON_MODULES.filter(module=>{
  const hay=[module.id,module.name,...module.aliases,module.category,module.interface,...module.catalogIds].join(' ').toLowerCase();
  return tokens.every(token=>hay.includes(token));
 }).slice(0,limit);
}
export function validKnowledgeTopic(input){
 if(typeof input!=='string')return null;
 const q=input.trim().replace(/\s+/g,' ');
 if(q.length<3||q.length>90||!/[a-z]/i.test(q)||!/[a-z0-9]/i.test(q))return null;
 if(/[<>@{}\\]/.test(q)||/\b(?:sk-|api[_-]?key|password|token|secret)\b/i.test(q)||/\d{9,}/.test(q))return null;
 if(!/^[a-z0-9][a-z0-9\s._+()\-/]*$/i.test(q))return null;
 return q;
}
