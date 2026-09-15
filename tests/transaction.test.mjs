import {distribution,feeValue} from "./fee-fixture.mjs";
import test from "node:test";import assert from "node:assert/strict";import {privateKeyToAccount} from "viem/accounts";import {submissionData,validateSignedSubmission,consensus} from "../lib/transaction.mjs";import {submissionSchema,bountySchema} from "../lib/domain.ts";import {receiptState} from "../lib/receipt.ts";
const a=privateKeyToAccount("0x"+"11".repeat(32)),b=privateKeyToAccount("0x"+"22".repeat(32)),contract="0x"+"33".repeat(20),id="bounty-001";
const entry={wallet:a.address,agent:"test-agent",summary:"A provider connection guide with explicit error handling.",evidence:"https://raw.githubusercontent.com/example/repo/"+"a".repeat(40)+"/guide.md"};
async function signed(override={},signer=a){return signer.signTransaction({chainId:61997,to:consensus,data:submissionData(contract,id,entry,distribution,Math.floor(Date.now()/1000)+600),gas:200000n,gasPrice:1n,value:feeValue,nonce:0,type:"legacy",...override})}
test("valid signed submission accepted",async()=>{await validateSignedSubmission(await signed(),contract,id,entry)});
test("different claimed signer rejected",async()=>{await assert.rejects(validateSignedSubmission(await signed({},b),contract,id,entry),/Signature/)});
test("modified evidence rejected",async()=>{await assert.rejects(validateSignedSubmission(await signed(),contract,id,{...entry,evidence:entry.evidence.replace("guide","other")}),/differs/)});
test("wrong bounty rejected",async()=>{await assert.rejects(validateSignedSubmission(await signed(),contract,"bounty-002",entry),/differs/)});
test("excessive fee deposit rejected",async()=>{await assert.rejects(validateSignedSubmission(await signed({value:10n**18n+1n}),contract,id,entry),/exceeds/)});
test("different chain rejected",async()=>{await assert.rejects(validateSignedSubmission(await signed({chainId:1}),contract,id,entry),/Studio/)});
test("different destination rejected",async()=>{await assert.rejects(validateSignedSubmission(await signed({to:contract}),contract,id,entry),/Studio/)});
test("mutable branch refused",()=>assert.equal(submissionSchema.safeParse({...entry,evidence:entry.evidence.replace("a".repeat(40),"main")}).success,false));
test("wallet schema rejects zero account",()=>assert.equal(submissionSchema.safeParse({...entry,wallet:"0x"+"00".repeat(20)}).success,false));
test("unknown entry fields rejected",()=>assert.equal(submissionSchema.safeParse({...entry,admin:true}).success,false));
test("ready to finalize is still pending",()=>assert.equal(receiptState({status:11},true).state,"pending"));
test("finalized revert is failed",()=>assert.equal(receiptState({status:7,txExecutionResultName:"FINISHED_WITH_ERROR"}).state,"failed"));
test("finalized success independent of last validator receipt",()=>assert.equal(receiptState({status:7,consensus_data:{leader_receipt:[{mode:"leader",execution_result:"SUCCESS"},{mode:"validator",execution_result:"ERROR"}]}}).state,"success"));
test("accepted is not finalized",()=>assert.equal(receiptState({status:5,txExecutionResultName:"FINISHED_WITH_RETURN"}).state,"pending"));

test("Studio Next numeric validator timeout is failed",()=>assert.equal(receiptState({status:11}).state,"failed"));

test("external transfer remainder is counted as a refund once",()=>assert.deepEqual(receiptState({status:7,txExecutionResultName:"FINISHED_WITH_RETURN",data:{fee_accounting:{paid_fee_value:"1000",total_refunded:"600",external_message_fee_payouts:[{source:"external-execution-remainder",amount:"100"},{source:"executor-reimbursement",amount:"50"}]}}}).fees,{deposit:"1000",consumed:"300",refunded:"700"}));
