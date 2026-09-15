import {abi} from "genlayer-js-legacy";
import {studionet} from "genlayer-js-legacy/chains";
import {encodeFunctionData} from "viem";
export function walletTransaction(contract,from,method,args,value="0"){
 const data=abi.transactions.serialize([abi.calldata.encode(abi.calldata.makeCalldataObject(method,args,undefined)),false]);
 return {from,to:studionet.consensusMainContract.address,data:encodeFunctionData({abi:studionet.consensusMainContract.abi,functionName:"addTransaction",args:[from,contract,studionet.defaultNumberOfInitialValidators,studionet.defaultConsensusMaxRotations,data]}),value:"0x"+BigInt(value).toString(16)};
}
export async function prepareWalletTransaction(tx,fetcher=fetch){
 let response;
 try{response=await fetcher("/api/wallet/prepare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(tx),signal:AbortSignal.timeout(35000)});}
 catch(e){throw new Error(e?.name==="TimeoutError"||e?.name==="AbortError"?"GenLayer did not finish preparing the transaction. Nothing was sent to your wallet. Try again.":"Could not reach BountyArena to prepare the transaction. Nothing was sent to your wallet. Check your connection.");}
 const result=await response.json();
 if(!response.ok)throw new Error(result.error||"Could not prepare the transaction.");
 // The API supplies fees and nonce only; destination, calldata and value stay local.
 for(const field of ["gas","gasPrice","nonce"])if(!/^0x[0-9a-fA-F]+$/.test(result[field]||""))throw new Error("Invalid transaction preparation response.");
 if(BigInt(result.gas)>5000000n||BigInt(result.gas)*BigInt(result.gasPrice)>10n**16n)throw new Error("The requested network fee exceeds the Studio test limit.");
 return {...tx,gas:result.gas,gasPrice:result.gasPrice,nonce:result.nonce,chainId:"0x"+studionet.id.toString(16),type:"0x0"};
}
export async function walletRead(promise){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Your wallet did not respond. Unlock the extension, then connect again.")),15000)})]);}
 finally{clearTimeout(timer);}
}
