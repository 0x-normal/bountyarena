import {assertWallet,type Session} from "./wallet";
import {walletTransaction,prepareWalletTransaction,walletRead} from "./wallet-transaction.mjs";
import deployment from "./deployment.json";
export type Pending={hash:string;label:string};
export async function write(session:Session,method:string,args:unknown[],value="0",stage:(message:string)=>void=()=>{}){
 if(!deployment.contract)throw new Error("The arena contract has not been deployed.");
 stage("Checking wallet");
 await walletRead(assertWallet(session));
 stage("Preparing transaction");
 const tx=await prepareWalletTransaction(walletTransaction(deployment.contract,session.address,method,args,value));
 await walletRead(assertWallet(session));
 stage("Confirm in your wallet");
 // Do not time out or automatically retry a send: approval may arrive late.
 const hash=await session.provider.request({method:"eth_sendTransaction",params:[tx]});
 if(typeof hash!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(hash))throw new Error("The wallet did not return a transaction hash. Check wallet activity before trying again.");
 return hash;
}
export async function track(hash:string):Promise<{state:"pending"|"success"|"failed";reason?:string}>{
 const r=await fetch("/api/transactions/"+hash,{cache:"no-store",signal:AbortSignal.timeout(30000)});const d=await r.json() as {error?:string;state:"pending"|"success"|"failed";reason?:string};if(!r.ok)throw new Error(d.error);return d;
}
