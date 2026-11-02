import {db} from './db.js';
import {validKnowledgeTopic} from './studio-modules.mjs';

const stopWords=new Set(['arduino','module','sensor','project','with','using','make','build','please','what','this','that','about','code','device','board','need','from']);
function termsFor(query){
 const words=String(query||'').toLowerCase().match(/[a-z][a-z0-9+_-]{2,}/g)||[];
 return [...new Set(words.filter(word=>!stopWords.has(word)))].slice(0,6);
}
export async function readReviewedKnowledge(query,limit=5){
 if(typeof query!=='string'||query.length>800)return [];
 const terms=termsFor(query);if(!terms.length)return [];
 // Only administrator-approved entries are in this table. Parameterized patterns avoid SQL injection.
 const patterns=terms.map(word=>'%'+word.replace(/[\\%_]/g,'\\$&')+'%');
 const {rows}=await db().query(
  `SELECT topic_key,title,summary,keywords,source_urls,version,reviewed_at
   FROM studio_knowledge_entries
   WHERE lower(topic_key) LIKE ANY($1::text[])
      OR lower(title) LIKE ANY($1::text[])
      OR lower(keywords) LIKE ANY($1::text[])
   ORDER BY reviewed_at DESC LIMIT $2`,[patterns,Math.max(1,Math.min(limit,8))]);
 return rows.map(row=>({
  topicKey:row.topic_key,title:row.title,summary:row.summary,
  sources:Array.isArray(row.source_urls)?row.source_urls:[],
  version:row.version,reviewedAt:row.reviewed_at
 }));
}
export function isReviewedSourceUrl(raw){
 if(typeof raw!=='string'||raw.length>400)return false;
 let url;try{url=new URL(raw);}catch{return false;}
 if(url.protocol!=='https:'||url.username||url.password||url.port)return false;
 const host=url.hostname.toLowerCase();
 const allowed=['docs.arduino.cc','docs.espressif.com','www.u-blox.com','content.u-blox.com',
  'www.simcom.com','en.simcom.com','learn.adafruit.com','www.analog.com',
  'www.ti.com','www.st.com','www.nxp.com','www.bosch-sensortec.com',
  'www.microchip.com','www.nordicsemi.com','www.raspberrypi.com'];
 return allowed.includes(host);
}
export function normalizeKnowledgeKey(input){
 const topic=validKnowledgeTopic(input);
 if(!topic)return null;
 return topic.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
}
