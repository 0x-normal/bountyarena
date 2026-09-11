import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionHashVariant} from "genlayer-js/types";
import {submissionSchema,type Bounty,type SubmissionInput} from "./domain";
import {submissionData,consensus} from "./transaction.mjs";
import legacyDeployment from "./legacy-deployment.json";
import deployment from "./deployment.json";
export const client=()=>createClient({chain:studionet});
export function contract(legacy=false){const selected=legacy?legacyDeployment:deployment;if(!selected.contract)throw new Error("The arena contract is awaiting deployment.");return selected.contract as `0x${string}`}
export async function readBounty(id:string,legacy=false):Promise<Bounty>{const raw=await client().readContract({address:contract(legacy),functionName:"get_bounty",args:[id],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});if(typeof raw!=="string")throw new Error("Invalid bounty response");return JSON.parse(raw)}
export async function listBounties(offset:number,legacy=false){if(!deployment.contract)return {bounties:[],hasMore:false};const ids=await client().readContract({address:contract(legacy),functionName:"list_bounties",args:[offset,20],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});if(!Array.isArray(ids))throw new Error("Invalid bounty list");return {bounties:await Promise.all(ids.map(id=>readBounty(String(id),legacy))),hasMore:ids.length===20}}
export async function validateEntry(id:string,raw:unknown){const entry=submissionSchema.parse(raw);const b=await readBounty(id);if(b.status!=="open"||Date.now()/1000>=b.deadline)throw new Error("Submissions are closed.");if(b.owner===entry.wallet.toLowerCase())throw new Error("Sponsors cannot enter their own bounty.");if(b.entries.some(e=>e.wallet===entry.wallet.toLowerCase()))throw new Error("One entry per wallet.");if(b.entries.some(e=>e.evidence===entry.evidence))throw new Error("This evidence has already been submitted.");if(b.entries.length>=40)throw new Error("Entry limit reached.");return entry}
export async function prepare(id:string,entry:SubmissionInput){
 const c=client(),data=submissionData(contract(),id,entry);
 const [nonce,gasPrice,gas]=await Promise.all([c.getCurrentNonce({address:entry.wallet as `0x${string}`}),c.request({method:"eth_gasPrice"}),c.estimateTransactionGas({from:entry.wallet as `0x${string}`,to:consensus,data,value:0n})]);
 return {chainId:studionet.id,to:consensus,data,nonce:Number(nonce),gas:gas.toString(),gasPrice:BigInt(gasPrice as string).toString(),value:"0",type:"legacy"};
}
