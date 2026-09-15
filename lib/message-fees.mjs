import {encodeExternalMessageFeeParams,deriveExternalMessageCallKey} from "genlayer-js";
export function transferAllocations(bounty,method){
 const winner=bounty.winner===null?null:bounty.entries[bounty.winner];
 const recipient=method==="claim_reward"?winner?.wallet:method==="settle"&&!bounty.entries.some(e=>e.review?.decision==="qualified")?bounty.owner:null;
 if(!recipient)return [];
 return [{messageType:0,onAcceptance:false,recipient,callKey:deriveExternalMessageCallKey("0x"),budget:500000n*300000000n,feeParams:encodeExternalMessageFeeParams({gasLimit:500000n,maxGasPrice:300000000n})}];
}
