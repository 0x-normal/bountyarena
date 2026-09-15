import {getAddress} from "viem";
import {studioNext as studionet} from "./network.mjs";
export const faucetAmount=10000000000000000000n;
export async function studioRpc(method,params,legacy=false){
 const r=await fetch(legacy?"https://studio.genlayer.com/api":studionet.rpcUrls.default.http[0],{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error("The Studio faucet is unavailable. Try again shortly.");
 const data=await r.json();
 if(data.error)throw new Error(data.error.message||"The Studio faucet request failed.");
 return data.result;
}
export async function fundStudioWallet(wallet,rpc=studioRpc,legacy=false){
 const amount=legacy?1000000000000000n:faucetAmount;
 // Studio credits the supplied key verbatim but reads balances by checksum address.
 const address=getAddress(wallet.toLowerCase());
 const balance=async()=>{const result=await rpc("eth_getBalance",[address,"latest"],legacy);if(typeof result!=="string"||!/^0x[0-9a-fA-F]+$/.test(result))throw new Error("Could not verify the Studio wallet balance.");return BigInt(result)};
 const before=await balance();
 const hash=await rpc("sim_fundAccount",[address,Number(amount)],legacy);
 if(typeof hash!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(hash))throw new Error("The Studio faucet did not return a transaction. Check your balance before requesting again.");
 const after=await balance();
 if(after<before+amount)throw new Error("The faucet request was sent, but the balance increase could not be confirmed. Check your balance before requesting again.");
 return {funded:true,wallet:address,amount_wei:amount.toString(),balance_wei:after.toString(),hash,network:legacy?"GenLayer Studio":"GenLayer Studio Next"};
}
