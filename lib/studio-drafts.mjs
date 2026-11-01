import {z} from 'zod';
import {BOARD_OPTIONS} from './studio-boards.mjs';
import {STUDIO_BUILDS} from './studio.mjs';

export const DRAFT_KEY='circuitbyte-studio-draft-v1';
export const RECOVERY_KEY='circuitbyte-studio-recovery-v2';
const board=z.enum(BOARD_OPTIONS.map(item=>item.id));
const text=z.string().max(500);
const schema=z.object({
 version:z.union([z.literal(1),z.literal(2)]).default(1),
 board:board.default('arduino:avr:uno'),
 code:z.string().min(10).max(15000),prompt:z.string().max(800),
 selected:z.array(z.string().regex(/^cb-\d{3}$/)).max(16),
 mode:z.enum(['guide','ai']).default('guide'),codeDirty:z.boolean().default(true),
 savedAt:z.string().datetime().optional(),
 project:z.object({
  slug:z.string().regex(/^[a-z0-9-]{1,70}$/),title:z.string().min(1).max(120),
  summary:z.string().max(1000).default('Imported project for review.'),
  method:z.enum(['guided-template','ai-draft','demo','board-starter']),
  prompt:z.string().max(800).optional(),
  wires:z.array(z.tuple([text,text])).max(40).default([]),
  warnings:z.array(text).max(30).default([])
 })
});
export function parseStudioDraft(input,catalogIds){
 let value;
 try{
  if(typeof input==='string'&&input.length>100000)throw Error();
  value=schema.parse(typeof input==='string'?JSON.parse(input):input);
 }catch{throw Error('This draft is invalid or too large. Import a CircuitByte project JSON with a sketch under 15,000 characters.');}
 if(catalogIds&&value.selected.some(id=>!catalogIds.includes(id)))throw Error('This draft contains parts that are no longer in the catalog.');
 const guide=value.project.method==='guided-template'&&value.board==='arduino:avr:uno'
  ?STUDIO_BUILDS.find(item=>item.slug===value.project.slug):null;
 value.selected=[...new Set(value.selected)];
 value.project=guide?{...guide,board:value.board,prompt:value.project.prompt||value.prompt,
  method:'guided-template',guideUrl:'/diy/'+guide.slug,
  missing:guide.parts.filter(id=>!value.selected.includes(id)),warnings:guide.notes}:
  {...value.project,board:value.board,method:value.project.method==='guided-template'?'ai-draft':value.project.method};
 return value;
}
export function serializeStudioDraft(value){
 return JSON.stringify({...parseStudioDraft(value),version:2,savedAt:new Date().toISOString()},null,2);
}
