import test from "node:test";
import assert from "node:assert/strict";
import {createClient} from "genlayer-js-legacy";
import {studionet} from "genlayer-js-legacy/chains";
import {walletTransaction,prepareWalletTransaction} from "../lib/wallet-transaction.mjs";
const from="0x"+"11".repeat(20),contract="0x"+"22".repeat(20),hash="0x"+"33".repeat(32);
test("browser bounty request matches the SDK's wallet transaction exactly",async()=>{
 const original=globalThis.fetch;let signed;
 globalThis.fetch=async(_url,options)=>{const {method}=JSON.parse(options.body);const result={eth_getTransactionCount:"0x2",eth_estimateGas:"0x30d40",eth_gasPrice:"0x0"}[method];assert.ok(result,method);return Response.json({jsonrpc:"2.0",id:1,result})};
 try{
  const args=["test-id","Wallet guide","GenLayer","Documentation",'["Handle wallet rejection"]',3600];
  const sdk=createClient({chain:studionet,account:from,provider:{request:async({method,params})=>{assert.equal(method,"eth_sendTransaction");signed=params[0];return hash}}});
  assert.equal(await sdk.writeContract({address:contract,functionName:"create_bounty",args,value:100000000000000n,leaderOnly:false}),hash);
  const tx=walletTransaction(contract,from,"create_bounty",args,"100000000000000");
  const prepared=await prepareWalletTransaction(tx,async()=>Response.json({gas:"0x30d40",gasPrice:"0x0",nonce:"0x2"}));
  assert.deepEqual(prepared,signed);
 }finally{globalThis.fetch=original}
});
test("preparation cannot replace locally encoded destination, reward, or work",async()=>{
 const tx=walletTransaction(contract,from,"claim_reward",["test-id"]);
 const prepared=await prepareWalletTransaction(tx,async()=>Response.json({gas:"0x30d40",gasPrice:"0x0",nonce:"0x0",to:from,value:"0xffff",data:"0x00"}));
 assert.equal(prepared.to,tx.to);assert.equal(prepared.data,tx.data);assert.equal(prepared.value,"0x0");
});
test("preparation errors distinguish a timeout from wallet approval",async()=>{
 const tx=walletTransaction(contract,from,"settle",["test-id"]);
 await assert.rejects(prepareWalletTransaction(tx,async()=>{throw new DOMException("timeout","TimeoutError")}),/Nothing was sent to your wallet/);
 await assert.rejects(prepareWalletTransaction(tx,async()=>Response.json({error:"Not enough test GEN"},{status:400})),/Not enough test GEN/);
 await assert.rejects(prepareWalletTransaction(tx,async()=>Response.json({gas:"0xffffff",gasPrice:"0x0",nonce:"0x0"})),/fee exceeds/);
});
