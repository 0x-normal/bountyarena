import {transactionsStatusNumberToName,executionResultNumberToName} from "genlayer-js/types";
export function receiptState(receipt:unknown):{state:"pending"|"success"|"failed";reason?:string}{
 const r=receipt as Record<string,any>;
 const status=r.statusName||(typeof r.status==="number"?transactionsStatusNumberToName[String(r.status) as keyof typeof transactionsStatusNumberToName]:r.status);
 if(["CANCELED","VALIDATORS_TIMEOUT","LEADER_TIMEOUT","UNDETERMINED"].includes(status))return {state:"failed",reason:"GenLayer ended the transaction with status "+status+"."};
 if(status!=="FINALIZED")return {state:"pending"};
 const result=r.txExecutionResultName||(typeof r.txExecutionResult==="number"?executionResultNumberToName[String(r.txExecutionResult) as keyof typeof executionResultNumberToName]:undefined);
 const leader=r.consensus_data?.leader_receipt?.filter((v:Record<string,unknown>)=>v.mode==="leader").at(-1);
 if(result?result!=="FINISHED_WITH_RETURN":leader?.execution_result!=="SUCCESS")return {state:"failed",reason:"The transaction finalized without successful contract execution."};
 return {state:"success"};
}
