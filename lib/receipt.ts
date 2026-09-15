import {transactionsStatusNumberToName,executionResultNumberToName} from "genlayer-js/types";
import {transactionsStatusNumberToName as legacyStatuses} from "genlayer-js-legacy/types";
export function receiptState(receipt:unknown,legacy=false):{state:"pending"|"success"|"failed";reason?:string;fees?:{deposit:string;consumed:string;refunded:string}}{
 const r=receipt as Record<string,any>;
 const statuses=legacy?legacyStatuses:transactionsStatusNumberToName;
 const status=r.statusName||r.status_name||(typeof r.status==="number"?statuses[String(r.status) as keyof typeof statuses]:r.status);
 if(["CANCELED","VALIDATORS_TIMEOUT","LEADER_TIMEOUT","UNDETERMINED"].includes(status))return {state:"failed",reason:"GenLayer ended the transaction with status "+status+"."};
 if(status!=="FINALIZED")return {state:"pending"};
 const result=r.txExecutionResultName||(typeof r.txExecutionResult==="number"?executionResultNumberToName[String(r.txExecutionResult) as keyof typeof executionResultNumberToName]:undefined);
 const leader=r.consensus_data?.leader_receipt?.filter((v:Record<string,unknown>)=>v.mode==="leader").at(-1);
 if(result?result!=="FINISHED_WITH_RETURN":leader?.execution_result!=="SUCCESS")return {state:"failed",reason:"The transaction finalized without successful contract execution."};
 const f=r.data?.fee_accounting;
 // Studio records settled external-execution refunds separately from total_refunded.
 const externalRefund=(f?.external_message_fee_payouts||[]).filter((p:Record<string,any>)=>p.source==="external-execution-remainder").reduce((sum:bigint,p:Record<string,any>)=>sum+BigInt(p.amount),0n);
 const refunded=f?.total_refunded!==undefined?BigInt(f.total_refunded)+externalRefund:0n;
 const fees=f?.paid_fee_value!==undefined&&f?.total_refunded!==undefined?{deposit:String(f.paid_fee_value),consumed:(BigInt(f.paid_fee_value)-refunded).toString(),refunded:refunded.toString()}:undefined;
 return {state:"success",...(fees?{fees}:{})};
}
