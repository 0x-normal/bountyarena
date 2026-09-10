import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import type {CalldataEncodable} from "genlayer-js/types";
import type {EIP1193Provider} from "viem";
import {assertWallet,type Session} from "./wallet";
import deployment from "./deployment.json";
export type Pending={hash:string;label:string};
export async function write(session:Session,method:string,args:unknown[],value="0"){
 if(!deployment.contract)throw new Error("The arena contract has not been deployed.");
 await assertWallet(session);
 const provider={request:async(r:{method:string;params?:unknown[]})=>{if(r.method==="eth_sendTransaction"){await assertWallet(session);const tx=r.params?.[0] as {from?:string};if(tx.from?.toLowerCase()!==session.address.toLowerCase())throw new Error("Transaction signer mismatch.")}return session.provider.request(r)}};
 const client=createClient({chain:studionet,account:session.address,provider:provider as EIP1193Provider});
 return await client.writeContract({address:deployment.contract as `0x${string}`,functionName:method,args:args as CalldataEncodable[],value:BigInt(value),leaderOnly:false});
}
export async function track(hash:string):Promise<{state:"pending"|"success"|"failed";reason?:string}>{
 const r=await fetch("/api/transactions/"+hash,{cache:"no-store"});const d=await r.json() as {error?:string;state:"pending"|"success"|"failed";reason?:string};if(!r.ok)throw new Error(d.error);return d;
}
