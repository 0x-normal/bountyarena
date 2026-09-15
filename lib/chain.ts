import {createClient} from "genlayer-js";
import {transferAllocations} from "./message-fees.mjs";
import {createTransactionKit,type PolicyQuote} from "@genlayer/transaction-kit";
import {assertWallet,type Session} from "./wallet.ts";
import {walletTransaction,prepareWalletTransaction,walletRead} from "./wallet-transaction.mjs";
import {arenaContract,type ArenaMode} from "./arenas.ts";
import {studioNext} from "./network.mjs";
export type Pending={hash:string;label:string;arena?:ArenaMode};
export async function write(session:Session,method:string,args:unknown[],value="0",stage:(message:string)=>void=()=>{},legacy:ArenaMode=false,approve?:(quote:PolicyQuote)=>Promise<void>){
 const address=arenaContract(legacy);
 if(legacy&&!["settle","claim_reward"].includes(method))throw new Error("Earlier arenas are available for settlement and claims only.");
 if(!address)throw new Error("The arena contract has not been deployed.");
 stage("Checking wallet");await walletRead(assertWallet(session,legacy));
 if(legacy){
  stage("Preparing transaction");const tx=await prepareWalletTransaction(walletTransaction(address,session.address,method,args,value));
  await walletRead(assertWallet(session,legacy));stage("Confirm in your wallet");
  const hash=await session.provider.request({method:"eth_sendTransaction",params:[tx]});
  if(typeof hash!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(hash))throw new Error("No transaction hash returned. Check wallet activity before retrying.");
  return hash;
 }
 const kit=createTransactionKit({chain:studioNext,account:session.address,provider:session.provider});
 const tx={kind:"write" as const,address,method,args};
 stage("Estimating network fees");
 let messageAllocations:ReturnType<typeof transferAllocations>=[];
 if(["settle","claim_reward"].includes(method)){
  const response=await fetch("/api/bounties/"+encodeURIComponent(String(args[0])),{cache:"no-store"});
  const bounty=await response.json();if(!response.ok)throw new Error("Could not read the reward recipient.");
  messageAllocations=transferAllocations(bounty,method);
 }
 const quote=await kit.estimate({preset:"low",userValue:BigInt(value),overrides:{totalMessageFees:messageAllocations.reduce((sum,a)=>sum+a.budget,0n)}},tx);
 if(quote.verification.status!=="verified")throw new Error("The live fee policy could not be verified. Try again.");
 if(quote.feeValue>10n**18n)throw new Error("Fee deposit exceeds 1 test GEN.");
 if(!approve)throw new Error("Review the fee deposit before signing.");
 await approve(quote);
 await walletRead(assertWallet(session));stage("Confirm in your wallet");
 // RC2 does not forward message allocations. Preserve its approved quote and
 // use the matching SDK for the recipient-bound payout/refund allocation.
 if(messageAllocations.length){
  const client=createClient({chain:studioNext,account:session.address,provider:session.provider});
  return client.writeContract({address,functionName:method,args:args as never[],value:quote.userValue,fees:{distribution:quote.distribution,feeValue:quote.feeValue,messageAllocations}});
 }
 const sent=await kit.submit(quote,tx);return sent.genlayerTxId;
}
export async function track(hash:string,arena:ArenaMode=false):Promise<{state:"pending"|"success"|"failed";reason?:string;fees?:{deposit:string;consumed:string;refunded:string}}>{
 const r=await fetch("/api/transactions/"+hash+(arena?"?arena="+arena:""),{cache:"no-store",signal:AbortSignal.timeout(30000)});const d=await r.json() as {error?:string;state:"pending"|"success"|"failed";reason?:string;fees?:{deposit:string;consumed:string;refunded:string}};if(!r.ok)throw new Error(d.error);return d;
}
