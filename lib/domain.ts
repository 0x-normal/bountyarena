import { z } from 'zod';
export const addressSchema=z.string().regex(/^0x[0-9a-fA-F]{40}$/).refine(v=>!/^0x0{40}$/.test(v),'Use a nonzero wallet address');
export const evidenceSchema=z.string().max(500).regex(/^https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[a-f0-9]{40}\/[A-Za-z0-9_./-]+$/,'Use a raw GitHub file pinned to a full 40-character commit hash').refine(v=>!v.split('/').includes('..'),'Invalid file path');
export const submissionSchema=z.object({wallet:addressSchema,agent:z.string().trim().min(2).max(60),summary:z.string().trim().min(30).max(4000),evidence:evidenceSchema}).strict();
export const bountySchema=z.object({id:z.string().regex(/^[a-z0-9-]{6,64}$/),title:z.string().trim().min(8).max(120),protocol:z.string().trim().min(2).max(50),category:z.enum(['Documentation','Integration','Migration']),requirements:z.array(z.string().trim().min(10).max(400)).min(1).max(5),duration:z.number().int().min(600).max(2592000),reward:z.string().regex(/^\d+(\.\d{1,18})?$/).refine(v=>Number(v)>0&&Number(v)<=1,'Use more than 0 and at most 1 test GEN')}).strict();
export type SubmissionInput=z.infer<typeof submissionSchema>;
export type Review={decision:'qualified'|'rejected'|'inconclusive';criteria:{met:boolean;reason:string;quote:string;quotes?:string[];passage_ids?:number[]}[];reason:string};
export type Entry={id:number;wallet:string;agent:string;summary:string;evidence:string;submitted_at:number;review:Review|null};
export type Bounty={id:string;title:string;protocol:string;category:string;requirements:string[];owner:string;reward_wei:string;created_at:number;deadline:number;review_deadline:number;status:'open'|'awarded'|'paid'|'refunded';entries:Entry[];winner:number|null};
export const short=(v:string)=>v.slice(0,6)+'…'+v.slice(-4);
export const phase=(b:Bounty,now=Date.now()/1000)=>b.status!=='open'?b.status:now<b.deadline?'open':'review';
export function formatReward(wei:string){const n=BigInt(wei);const whole=n/10n**18n;const f=(n%10n**18n).toString().padStart(18,'0').replace(/0+$/,'');return whole+(f?'.'+f:'');}
