import {createClient,createAccount} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionStatus,TransactionHashVariant} from "genlayer-js/types";
import {readFile,writeFile} from "node:fs/promises";
import assert from "node:assert/strict";
import {receiptState} from "../lib/receipt.ts";
const deployment=JSON.parse(await readFile("artifacts/test-deployment.json","utf8"));
const account=async(name)=>createAccount((await readFile(".keys/"+name+".key","utf8")).trim());
const sponsor=await account("sponsor"),good=await account("qualified-agent"),bad=await account("incomplete-agent");
const c=who=>createClient({chain:studionet,account:who});
const client=c(sponsor);
let run;try{run=JSON.parse(await readFile(".keys/reviewer-v2-test.json","utf8"))}catch{run={bounty:"review-v2-"+Date.now(),contract:deployment.contract,steps:{}}}
const save=()=>writeFile(".keys/reviewer-v2-test.json",JSON.stringify(run,null,2));
async function step(name,who,method,args,value=0n){
 if(run.steps[name]?.complete)return;
 if(!run.steps[name]){run.steps[name]={hash:await c(who).writeContract({address:run.contract,functionName:method,args,value,leaderOnly:false})};await save();console.log(name,run.steps[name].hash)}
 const receipt=await client.waitForTransactionReceipt({hash:run.steps[name].hash,status:TransactionStatus.FINALIZED,interval:4000,retries:35});
 assert.equal(receiptState(receipt).state,"success",name);
 run.steps[name].complete=true;await save();console.log(name,"finalized");
}
const original=JSON.parse(await client.readContract({address:"0x95Df5962b8e357834B64BadFA7ac0C3D9B99Efe8",functionName:"get_bounty",args:["7c936ac1-673e-4b80-84d0-2b80a7cb7031"],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
await step("create",sponsor,"create_bounty",[run.bounty,original.title,original.protocol,original.category,JSON.stringify(original.requirements),600],100n);
await step("incomplete",bad,"submit_work",[run.bounty,"License control","Existing upstream license used as a negative regression fixture. It does not contain a wallet connection guide.","https://raw.githubusercontent.com/genlayerlabs/genlayer-js/1b7f50a3a3f2963ea857941b0fb386081dd5c326/LICENSE"]);
await step("complete",good,"submit_work",[run.bounty,"Hermes evidence test","Regression fixture using the publicly submitted Hermes guide, with attribution. This test account did not author the guide. "+original.entries[0].summary,original.entries[0].evidence]);
await step("review-incomplete",sponsor,"review_work",[run.bounty,0]);
await step("review-complete",sponsor,"review_work",[run.bounty,1]);
const b=JSON.parse(await client.readContract({address:run.contract,functionName:"get_bounty",args:[run.bounty],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
console.log(JSON.stringify(b.entries.map(e=>({agent:e.agent,review:e.review}))));
assert.equal(b.entries[0].review.decision,"rejected");
assert.equal(b.entries[1].review.decision,"qualified");
const body=await (await fetch(original.entries[0].evidence)).text();
assert.ok(b.entries[1].review.criteria.every(row=>row.quotes.length&&row.quotes.every(q=>body.includes(q))));
const report={...run,source_bounty:original.id,evidence:original.entries[0].evidence,reviews:b.entries.map(e=>({agent:e.agent,review:e.review})),verified_at:new Date().toISOString()};
await writeFile("docs/REVIEWER_V2_TEST.json",JSON.stringify(report,null,2)+"\n");
console.log("REAL REVIEWER V2 TEST PASSED");
