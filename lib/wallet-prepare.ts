import {z} from "zod";
import {studionet} from "genlayer-js-legacy/chains";
import {addressSchema} from "./domain";
const inputSchema=z.object({from:addressSchema,to:addressSchema.refine(v=>v.toLowerCase()===studionet.consensusMainContract?.address.toLowerCase(),"Unexpected transaction destination."),data:z.string().regex(/^0x[0-9a-fA-F]+$/).max(40000),value:z.string().regex(/^0x[0-9a-fA-F]+$/)}).strict();
export async function prepareBrowserWallet(raw:unknown){
 const tx=inputSchema.parse(raw);
 if(BigInt(tx.value)>10n**18n)throw new Error("Studio rewards cannot exceed 1 test GEN.");
 const signal=AbortSignal.timeout(20000);
 async function rpc(method:string,params:unknown[]=[]){
  const r=await fetch(studionet.rpcUrls.default.http[0],{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal});
  if(!r.ok)throw new Error("GenLayer Studio could not prepare the transaction. Try again shortly.");
  const d=await r.json() as {error?:{message?:string};result?:string};
  if(d.error)throw new Error(d.error.message||"GenLayer Studio rejected transaction preparation.");
  if(typeof d.result!=="string"||!/^0x[0-9a-fA-F]+$/.test(d.result))throw new Error("GenLayer Studio returned invalid transaction details.");
  return d.result;
 }
 try{
  const [nonce,gasPrice,gas,balance]=await Promise.all([rpc("eth_getTransactionCount",[tx.from,"pending"]),rpc("eth_gasPrice"),rpc("eth_estimateGas",[tx]),rpc("eth_getBalance",[tx.from,"latest"])]);
  if(BigInt(balance)<BigInt(tx.value)+BigInt(gas)*BigInt(gasPrice))throw new Error("Not enough test GEN. Close this form, click Get test tokens, then post your bounty again.");
  return {nonce,gasPrice,gas};
 }catch(e){if(signal.aborted)throw new Error("GenLayer Studio took too long to prepare the transaction. Nothing was sent to your wallet. Try again.");throw e}
}
