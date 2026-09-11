import test from "node:test";
import assert from "node:assert/strict";
import {fundStudioWallet,faucetAmount} from "../lib/faucet.mjs";
const checksum="0xC464242e7CE8D9ad4b5dFE260c76256b6df2d75d";
test("lowercase browser wallets receive faucet funds at their checksum account",async()=>{
 let stored=0n;const calls=[];
 const result=await fundStudioWallet(checksum.toLowerCase(),async(method,params)=>{
  calls.push(method);assert.equal(params[0],checksum);
  if(method==="eth_getBalance")return "0x"+stored.toString(16);
  assert.equal(method,"sim_fundAccount");assert.equal(params[1],Number(faucetAmount));stored+=faucetAmount;return "0x"+"11".repeat(32);
 });
 assert.equal(result.balance_wei,faucetAmount.toString());assert.equal(result.wallet,checksum);
 assert.deepEqual(calls,["eth_getBalance","sim_fundAccount","eth_getBalance"]);
});
test("faucet success is refused when the balance did not increase",async()=>{
 let fundingCalls=0;
 await assert.rejects(fundStudioWallet(checksum,async(method)=>{
  if(method==="sim_fundAccount"){fundingCalls++;return "0x"+"11".repeat(32)}
  return "0x0";
 }),/balance increase could not be confirmed/);
 assert.equal(fundingCalls,1);
});
test("faucet refuses invalid balance responses before sending funding",async()=>{
 const methods=[];
 await assert.rejects(fundStudioWallet(checksum,async(method)=>{methods.push(method);return null}),/Could not verify/);
 assert.deepEqual(methods,["eth_getBalance"]);
});
