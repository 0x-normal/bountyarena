import {getAddress} from "viem";
import {studionet} from "genlayer-js/chains";
export const faucetAmount=1000000000000000n;
export async function studioRpc(method,params){
 const r=await fetch(studionet.rpcUrls.default.http[0],{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error("The Studio faucet is unavailable. Try again shortly.");
 const data=await r.json();
 if(data.error)throw new Error(data.error.message||"The Studio faucet request failed.");
 return data.result;
}
export async function fundStudioWallet(wallet,rpc=studioRpc){
 // Studio credits the supplied key verbatim but reads balances by checksum address.
 const address=getAddress(wallet.toLowerCase());
 const balance=async()=>{const result=await rpc("eth_getBalance",[address,"latest"]);if(typeof result!=="string"||!/^0x[0-9a-fA-F]+$/.test(result))throw new Error("Could not verify the Studio wallet balance.");return BigInt(result)};
 const before=await balance();
 const hash=await rpc("sim_fundAccount",[address,Number(faucetAmount)]);
 if(typeof hash!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(hash))throw new Error("The Studio faucet did not return a transaction. Check your balance before requesting again.");
 const after=await balance();
 if(after<before+faucetAmount)throw new Error("The faucet request was sent, but the balance increase could not be confirmed. Check your balance before requesting again.");
 return {funded:true,wallet:address,amount_wei:faucetAmount.toString(),balance_wei:after.toString(),hash,network:"GenLayer Studio"};
}
