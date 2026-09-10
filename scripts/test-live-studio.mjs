import {createClient,createAccount,generatePrivateKey} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionStatus,TransactionHashVariant} from "genlayer-js/types";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import assert from "node:assert/strict";
import {receiptState} from "../lib/receipt.ts";
const base="http://localhost:5173",deployment=JSON.parse(await readFile("artifacts/test-deployment.json","utf8"));
const contract=deployment.contract;
await mkdir(".keys",{recursive:true});await mkdir("artifacts",{recursive:true});
let run;try{run=JSON.parse(await readFile(".keys/live-test-state.json","utf8"))}catch{run={id:"live-"+Date.now(),steps:{},checks:[]}}
async function save(){await writeFile(".keys/live-test-state.json",JSON.stringify(run,null,2))}
async function account(name){let key;try{key=(await readFile(".keys/"+name+".key","utf8")).trim()}catch{key=generatePrivateKey();await writeFile(".keys/"+name+".key",key,{mode:0o600})}return createAccount(key)}
const sponsor=await account("sponsor"),bad=await account("incomplete-agent"),good=await account("qualified-agent");
const c=(account)=>createClient({chain:studionet,account});
const client=c(sponsor);
async function read(id){return JSON.parse(await client.readContract({address:contract,functionName:"get_bounty",args:[id],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}))}
async function request(path,body){const r=await fetch(base+path,{method:body?"POST":"GET",headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000)});const d=await r.json();if(!r.ok)throw new Error(path+": "+JSON.stringify(d));return d}
async function step(key,who,method,args,value=0n,expectFailure=false){
 let s=run.steps[key];if(s?.complete)return s;
 if(!s){s={hash:await c(who).writeContract({address:contract,functionName:method,args,value,leaderOnly:false})};run.steps[key]=s;await save();console.log(key+" submitted "+s.hash)}
 const receipt=await client.waitForTransactionReceipt({hash:s.hash,status:TransactionStatus.FINALIZED,interval:4000,retries:40});
 const state=receiptState(receipt);await writeFile("artifacts/live-"+key+".json",JSON.stringify(receipt,(_,v)=>typeof v==="bigint"?v.toString():v,2));
 assert.equal(state.state,expectFailure?"failed":"success",key+" did not reach expected state: "+JSON.stringify(state));
 s.complete=true;s.execution=state.state;await save();console.log(key+" "+state.state);return s;
}
async function apiSubmit(key,who,evidence,summary){
 let s=run.steps[key];if(s?.complete)return;
 if(!s){const entry={wallet:who.address,agent:key,summary,evidence};const {transaction:t}=await request("/api/bounties/"+run.id+"/prepare",entry);
 const raw=await who.signTransaction({...t,gas:BigInt(t.gas),gasPrice:BigInt(t.gasPrice),value:BigInt(t.value)});
 const sent=await request("/api/bounties/"+run.id+"/submissions",{entry,signedTransaction:raw});s={hash:sent.hash};run.steps[key]=s;await save();console.log(key+" submitted through API "+s.hash)}
 const receipt=await client.waitForTransactionReceipt({hash:s.hash,status:TransactionStatus.FINALIZED,interval:4000,retries:40});assert.equal(receiptState(receipt).state,"success");s.complete=true;await save();console.log(key+" finalized");
}
const root="https://raw.githubusercontent.com/genlayerlabs/genlayer-js/1b7f50a3a3f2963ea857941b0fb386081dd5c326/";
if(!run.funded){await request("/api/faucet",{wallet:sponsor.address});run.funded=true;await save();console.log("Sponsor funded through app faucet")}
await step("create",sponsor,"create_bounty",[run.id,"Verify SDK onboarding instructions","GenLayer SDK","Documentation",JSON.stringify(["Include the npm install genlayer-js command.","Include a JavaScript or TypeScript example importing createClient from genlayer-js and initializing a client."]),600],100n);
await step("create-refund",sponsor,"create_bounty",[run.id+"-refund","Refund an empty development bounty","GenLayer SDK","Documentation",JSON.stringify(["Include an SDK connection example."]),600],50n);
await apiSubmit("incomplete-agent",bad,root+"LICENSE","Existing upstream MIT license used as an intentionally incomplete integration-test fixture. It contains no SDK installation or client initialization instructions.");
await apiSubmit("qualified-agent",good,root+"README.md","Existing upstream GenLayerJS README used with attribution as an integration-test fixture, not claimed as original work. It includes the npm installation command and createClient initialization example.");
await step("review-incomplete",sponsor,"review_work",[run.id,0]);
await step("review-qualified",sponsor,"review_work",[run.id,1]);
let bounty=await read(run.id);
console.log("Actual reviews:",JSON.stringify(bounty.entries.map(e=>({agent:e.agent,review:e.review}))));
assert.equal(bounty.entries[0].review.decision,"rejected");
assert.equal(bounty.entries[1].review.decision,"qualified");
if(!run.checks.includes("reviews")){run.checks.push("reviews");await save()}
await step("sponsor-entry-blocked",sponsor,"submit_work",[run.id,"sponsor","Sponsor attempts entry for a negative authorization test.",root+"package.json"],0n,true);
const deadline=Math.max(bounty.deadline,(await read(run.id+"-refund")).deadline);
if(Date.now()/1000<deadline){console.log("Reviews passed. Settlement available at "+new Date(deadline*1000).toISOString());if(!process.argv.includes("--settle"))process.exit(0);while(Date.now()/1000<deadline+2)await new Promise(r=>setTimeout(r,5000))}
await step("settle",sponsor,"settle",[run.id]);
bounty=await read(run.id);assert.equal(bounty.winner,1);assert.equal(bounty.status,"awarded");
await step("wrong-wallet-claim",bad,"claim_reward",[run.id],0n,true);
if(!run.balanceBefore){run.balanceBefore=String(await client.getBalance({address:good.address}));await save()}
await step("claim",good,"claim_reward",[run.id]);
const after=await client.getBalance({address:good.address});assert.equal(after-BigInt(run.balanceBefore),100n);
await step("double-claim-blocked",good,"claim_reward",[run.id],0n,true);
if(!run.refundBalanceBefore){run.refundBalanceBefore=String(await client.getBalance({address:sponsor.address}));await save()}
await step("refund",sponsor,"settle",[run.id+"-refund"]);
const refundAfter=await client.getBalance({address:sponsor.address});assert.equal(refundAfter-BigInt(run.refundBalanceBefore),50n);
assert.equal((await read(run.id)).status,"paid");assert.equal((await read(run.id+"-refund")).status,"refunded");
run.checks=["funding","signed-api-submissions","negative-review","positive-review","sponsor-entry-blocked","winner-selection","wrong-wallet-blocked","payout-balance","double-claim-blocked","refund-balance"];
run.completed_at=new Date().toISOString();await save();
const result={contract,bounty:run.id,sponsor:sponsor.address,incomplete_agent:bad.address,qualified_agent:good.address,reward_wei:"100",refund_wei:"50",checks:run.checks,transactions:run.steps,completed_at:run.completed_at};
await writeFile("artifacts/live-test-results.json",JSON.stringify(result,null,2));console.log("LIVE STUDIO TESTS PASSED",JSON.stringify(result));
