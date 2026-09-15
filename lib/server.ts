import {arenaClient,arenaContract,type ArenaMode} from "./arenas";
import {studioNext as studionet} from "./network.mjs";
import {createClient} from "genlayer-js";

import {TransactionHashVariant} from "genlayer-js/types";
import {submissionSchema,type Bounty,type SubmissionInput} from "./domain";
import {submissionData,consensus} from "./transaction.mjs";
import legacyDeployment from "./legacy-deployment.json";
import deployment from "./deployment.json";
export const client=arenaClient;
export const contract=arenaContract;
export async function readBounty(id:string,legacy:ArenaMode=false):Promise<Bounty>{const raw=await client(legacy).readContract({address:contract(legacy),functionName:"get_bounty",args:[id],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});if(typeof raw!=="string")throw new Error("Invalid bounty response");return JSON.parse(raw)}
export async function listBounties(offset:number,legacy:ArenaMode=false){if(!deployment.contract)return {bounties:[],hasMore:false};const ids=await client(legacy).readContract({address:contract(legacy),functionName:"list_bounties",args:[offset,20],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});if(!Array.isArray(ids))throw new Error("Invalid bounty list");return {bounties:await Promise.all(ids.map(id=>readBounty(String(id),legacy))),hasMore:ids.length===20}}
export async function validateEntry(id:string,raw:unknown){const entry=submissionSchema.parse(raw);const b=await readBounty(id);if(b.status!=="open"||Date.now()/1000>=b.deadline)throw new Error("Submissions are closed.");if(b.owner===entry.wallet.toLowerCase())throw new Error("Sponsors cannot enter their own bounty.");if(b.entries.some(e=>e.wallet===entry.wallet.toLowerCase()))throw new Error("One entry per wallet.");if(b.entries.some(e=>e.evidence===entry.evidence))throw new Error("This evidence has already been submitted.");if(b.entries.length>=40)throw new Error("Entry limit reached.");return entry}
export async function prepare(id:string,entry:SubmissionInput){
 const c=client(),estimate=await c.estimateTransactionFees();
 if(estimate.feeValue>10n**18n)throw new Error("Fee deposit exceeds 1 test GEN");
 const validUntil=Math.floor(Date.now()/1000)+600;
 const data=submissionData(contract(),id,entry,estimate.distribution,validUntil);
 const [nonce,gasPrice,gas]=await Promise.all([c.getCurrentNonce({address:entry.wallet}),c.request({method:"eth_gasPrice"}),c.estimateTransactionGas({from:entry.wallet,to:consensus,data,value:estimate.feeValue})]);
 return {chainId:studionet.id,to:consensus,data,nonce:Number(nonce),gas:gas.toString(),gasPrice:BigInt(gasPrice as string).toString(),value:estimate.feeValue.toString(),type:"legacy"};
}
