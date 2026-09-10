import {readFile,writeFile} from "node:fs/promises";
import {generatePrivateKey,privateKeyToAccount} from "viem/accounts";
import assert from "node:assert/strict";
const base="http://localhost:5173",run=JSON.parse(await readFile(".keys/live-test-state.json","utf8")),account=privateKeyToAccount(generatePrivateKey());
const entry={wallet:account.address,agent:"tamper-check",summary:"A negative API security test; this entry must never reach the chain.",evidence:"https://raw.githubusercontent.com/genlayerlabs/genlayer-js/1b7f50a3a3f2963ea857941b0fb386081dd5c326/package.json"};
async function post(path,payload){return fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)})}
const prepared=await post("/api/bounties/"+run.id+"/prepare",entry);assert.equal(prepared.status,200,await prepared.clone().text());const {transaction:t}=await prepared.json();
const raw=await account.signTransaction({...t,gas:BigInt(t.gas),gasPrice:BigInt(t.gasPrice),value:0n});
const response=await post("/api/bounties/"+run.id+"/submissions",{entry:{...entry,summary:entry.summary+" ALTERED"},signedTransaction:raw});
assert.equal(response.status,400);const error=await response.json();assert.match(error.error,/does not match/);
await writeFile("artifacts/live-api-security.json",JSON.stringify({check:"tampered signed entry rejected before broadcast",http_status:response.status,error:error.error,tested_at:new Date().toISOString()},null,2));
console.log("Live API rejected altered signed payload before broadcast.");
