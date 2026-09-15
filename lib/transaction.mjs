import {abi as utils} from "genlayer-js";
import {studioNext} from "./network.mjs";
import {encodeFunctionData,decodeFunctionData,parseTransaction,recoverTransactionAddress} from "viem";
export const consensus=studioNext.consensusMainContract.address;
export const MAX_FEE=10n**18n;
export function workData(id,entry){return utils.transactions.serialize([utils.calldata.encode(utils.calldata.makeCalldataObject("submit_work",[id,entry.agent,entry.summary,entry.evidence],undefined)),false]);}
export function submissionData(contract,id,entry,distribution,validUntil){
 if(!distribution||!validUntil)throw Error("A fee quote and expiry are required");
 return encodeFunctionData({abi:studioNext.consensusMainContract.abi,functionName:"addTransaction",args:[{sender:entry.wallet,recipient:contract,numOfInitialValidators:BigInt(studioNext.defaultNumberOfInitialValidators),maxRotations:BigInt(studioNext.defaultConsensusMaxRotations),validUntil:BigInt(validUntil),saltNonce:0n,userValue:0n,feesDistribution:distribution,txCalldata:workData(id,entry),messageAllocations:[]}]});
}
export function validateSubmissionTransaction(tx,contract,id,entry){
 if(Number(tx.chainId)!==studioNext.id||tx.to?.toLowerCase()!==consensus.toLowerCase()||tx.type!=="legacy")throw Error("Expected a Studio Next transaction");
 if(BigInt(tx.value??0)<0n||BigInt(tx.value??0)>MAX_FEE)throw Error("Fee deposit exceeds 1 test GEN");
 const decoded=decodeFunctionData({abi:studioNext.consensusMainContract.abi,data:tx.data});
 const p=decoded.args?.[0];
 if(decoded.functionName!=="addTransaction"||!p||p.sender.toLowerCase()!==entry.wallet.toLowerCase()||p.recipient.toLowerCase()!==contract.toLowerCase()||p.userValue!==0n||p.saltNonce!==0n||p.messageAllocations.length||p.numOfInitialValidators!==BigInt(studioNext.defaultNumberOfInitialValidators)||p.maxRotations!==BigInt(studioNext.defaultConsensusMaxRotations)||p.txCalldata.toLowerCase()!==workData(id,entry).toLowerCase())throw Error("Transaction differs from intended work");
 if(p.validUntil<BigInt(Math.floor(Date.now()/1000))||p.validUntil>BigInt(Math.floor(Date.now()/1000)+1800))throw Error("Submission quote expired or invalid");
 if(p.feesDistribution.executionConsumed!==0n||p.feesDistribution.totalMessageFees!==0n)throw Error("Submission cannot allocate child-message fees");
 if(tx.data.toLowerCase()!==submissionData(contract,id,entry,p.feesDistribution,p.validUntil).toLowerCase())throw Error("Unexpected transaction encoding");
 if(BigInt(tx.gas??0)>5000000n||BigInt(tx.gas??0)*BigInt(tx.gasPrice??0)>10n**16n)throw Error("EVM gas exceeds test limit");
 return p;
}
export async function validateSignedSubmission(raw,contract,id,entry){
 if(typeof raw!=="string"||!/^0x[0-9a-fA-F]+$/.test(raw)||raw.length>40000)throw Error("Invalid signed transaction");
 const tx=parseTransaction(raw);validateSubmissionTransaction(tx,contract,id,entry);
 if((await recoverTransactionAddress({serializedTransaction:raw})).toLowerCase()!==entry.wallet.toLowerCase())throw Error("Signature does not belong to this agent wallet");
 return tx;
}
