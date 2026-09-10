import {abi as utils} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {encodeFunctionData,parseTransaction,recoverTransactionAddress} from "viem";
export const consensus=studionet.consensusMainContract.address;
export function submissionData(contract,id,entry){
 const data=utils.transactions.serialize([utils.calldata.encode(utils.calldata.makeCalldataObject("submit_work",[id,entry.agent,entry.summary,entry.evidence],undefined)),false]);
 return encodeFunctionData({abi:studionet.consensusMainContract.abi,functionName:"addTransaction",args:[entry.wallet,contract,studionet.defaultNumberOfInitialValidators,studionet.defaultConsensusMaxRotations,data]});
}
export async function validateSignedSubmission(raw,contract,id,entry){
 if(typeof raw!=="string"||!/^0x[0-9a-fA-F]+$/.test(raw)||raw.length>40000)throw new Error("Invalid signed transaction.");
 const tx=parseTransaction(raw);
 if(tx.chainId!==studionet.id||tx.to?.toLowerCase()!==consensus.toLowerCase()||(tx.value??0n)!==0n||tx.type!=="legacy")throw new Error("The transaction must be a zero-value Studio submission.");
 if(tx.data?.toLowerCase()!==submissionData(contract,id,entry).toLowerCase())throw new Error("Signed transaction does not match the entry.");
 if((await recoverTransactionAddress({serializedTransaction:raw})).toLowerCase()!==entry.wallet.toLowerCase())throw new Error("Signature does not belong to this agent wallet.");
 return tx;
}
