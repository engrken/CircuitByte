import {z} from 'zod';
import {BOARD_OPTIONS} from './studio-boards.mjs';
import {STUDIO_BUILDS} from './studio.mjs';
import {COMMON_MODULES} from './studio-modules.mjs';
import {createAcceptanceRecord,ACCEPTANCE_STATUSES} from './studio-acceptance.mjs';

const acceptanceCriterion=z.object({
 id:z.string().regex(/^[a-z0-9-]{1,40}$/),
 title:z.string().min(1).max(100),
 expected:z.string().min(1).max(300),
 observed:z.string().max(600).default(''),
 status:z.enum(ACCEPTANCE_STATUSES).default('not-tested')
});
const acceptanceSchema=z.object({
 version:z.literal(1).default(1),
 revision:z.number().int().min(1).max(10000).default(1),
 scope:z.string().max(22000).default(''),
 boardModel:z.string().max(120).default(''),
 supplyNotes:z.string().max(300).default(''),
 criteria:z.array(acceptanceCriterion).min(1).max(6)
}).superRefine((value,ctx)=>{
 const seen=new Set();
 for(const item of value.criteria){
  if(seen.has(item.id))ctx.addIssue({code:'custom',message:'Duplicate acceptance criterion ID'});
  seen.add(item.id);
  if(item.status!=='not-tested'&&item.observed.trim().length<8)ctx.addIssue({code:'custom',message:'Physical test outcomes require actual observations'});
 }
});

export const DRAFT_KEY='circuitbyte-studio-draft-v1';
export const RECOVERY_KEY='circuitbyte-studio-recovery-v2';
const board=z.enum(BOARD_OPTIONS.map(item=>item.id));
const text=z.string().max(500);
const schema=z.object({
 version:z.union([z.literal(1),z.literal(2)]).default(1),
 board:board.default('arduino:avr:uno'),
 code:z.string().min(10).max(15000),prompt:z.string().max(800),
 selected:z.array(z.string().regex(/^cb-\d{3}$/)).max(16),
 moduleIds:z.array(z.enum(COMMON_MODULES.map(module=>module.id))).max(8).default([]),
 ownMaterials:z.string().max(600).default(''),
 acceptance:acceptanceSchema.default(()=>createAcceptanceRecord()),
 mode:z.enum(['guide','ai']).default('guide'),codeDirty:z.boolean().default(true),
 savedAt:z.string().datetime().optional(),
 project:z.object({
  slug:z.string().regex(/^[a-z0-9-]{1,70}$/),title:z.string().min(1).max(120),
  summary:z.string().max(1000).default('Imported project for review.'),
  method:z.enum(['guided-template','ai-draft','demo','board-starter']),
  prompt:z.string().max(800).optional(),
  wires:z.array(z.tuple([text,text])).max(40).default([]),
  netlist:z.array(z.object({
   pin:z.string().min(1).max(32),to:z.string().max(120),net:z.string().min(1).max(60),
   kind:z.enum(['digital-input','digital-output','analog-input','i2c','spi','power','ground','conditional']),
   signalVoltage:z.number().min(0).max(24).optional()
  })).max(24).default([]),
  warnings:z.array(text).max(30).default([])
 })
});
// Reuse the exact browser validation for authenticated private cloud writes.
export function parseStudioAcceptance(value){
 return acceptanceSchema.parse(value??createAcceptanceRecord());
}
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
