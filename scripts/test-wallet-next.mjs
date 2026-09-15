import assert from "node:assert/strict";
import {write} from "../lib/chain.ts";
import {studioNext,nextRpc} from "../lib/network.mjs";
import {decodeFunctionData} from "viem";
import {readFile,writeFile} from "node:fs/promises";
const deployment=JSON.parse(await readFile("lib/deployment.json","utf8"));
const wallet="0x"+"12".repeat(20),owner="0x"+"34".repeat(20);
const ordinaryFetch=globalThis.fetch;
let bounty;
globalThis.fetch=(url,...args)=>String(url).startsWith("/api/bounties/")?Promise.resolve(Response.json(bounty)):ordinaryFetch(url,...args);
let sent,approved=false;
const provider={request:async({method,params=[]})=>{if(method==="eth_accounts"||method==="eth_requestAccounts")return [wallet];if(method==="eth_chainId")return "0xf22d";if(method==="eth_sendTransaction"){assert.equal(approved,true);sent=params[0];throw new Error("CAPTURED_NO_BROADCAST")}return nextRpc(method,params)}};
const session={address:wallet,provider};
const checks=[];
for(const method of ["create_bounty","claim_reward","settle"]){
 bounty={owner,winner:method==="claim_reward"?0:null,entries:method==="claim_reward"?[{wallet,review:{decision:"qualified"}}]:[]};
 const args=method==="create_bounty"?["wallet-test","Wallet preparation test","GenLayer","Documentation",JSON.stringify(["Include a wallet example."]),600]:["wallet-test"];
 approved=false;sent=undefined;let quote;
 await assert.rejects(write(session,method,args,method==="create_bounty"?"100":"0",()=>{},false,async q=>{assert.equal(q.verification.status,"verified");quote=q;approved=true}),/CAPTURED_NO_BROADCAST/);
 assert.ok(sent);const decoded=decodeFunctionData({abi:studioNext.consensusMainContract.abi,data:sent.data}).args[0];
 assert.equal(decoded.recipient.toLowerCase(),deployment.contract.toLowerCase());assert.equal(BigInt(sent.value),quote.total);assert.equal(decoded.userValue,method==="create_bounty"?100n:0n);
 assert.equal(decoded.messageAllocations.length,method==="create_bounty"?0:1);
 if(decoded.messageAllocations.length){assert.equal(decoded.messageAllocations[0].recipient.toLowerCase(),(method==="claim_reward"?wallet:owner).toLowerCase());assert.equal(decoded.feesDistribution.totalMessageFees,decoded.messageAllocations[0].budget)}
 checks.push(method+": verified quote, exact payment, recipient-bound allocation, captured before signing");
}
approved=false;sent=undefined;await assert.rejects(write(session,"create_bounty",[],"0",()=>{},false,async()=>{throw new Error("DECLINED")}),/DECLINED/);assert.equal(sent,undefined);checks.push("fee approval rejected: no wallet transaction requested");
await writeFile("docs/STUDIO_NEXT_WALLET_TEST.json",JSON.stringify({chainId:61997,contract:deployment.contract,checks,real_wallet_extension_test:false,broadcast:false,completed_at:new Date().toISOString()},null,2));console.log(checks);
