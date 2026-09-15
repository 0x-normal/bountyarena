import test from "node:test";import assert from "node:assert/strict";import {decodeAbiParameters} from "viem";import {transferAllocations} from "../lib/message-fees.mjs";
const owner="0x"+"11".repeat(20),winner="0x"+"22".repeat(20);
const bounty={owner,winner:0,entries:[{wallet:winner,review:{decision:"qualified"}}]};
test("winner selection needs no outgoing payment allocation",()=>assert.deepEqual(transferAllocations(bounty,"settle"),[]));
test("claim allocation pays only the winner at finality with exactly one gas budget",()=>{const [a]=transferAllocations(bounty,"claim_reward");assert.equal(a.recipient,winner);assert.equal(a.onAcceptance,false);const [gas,price]=decodeAbiParameters([{type:"uint256"},{type:"uint256"}],a.feeParams);assert.equal(a.budget,gas*price)});
test("refund allocation is bound to sponsor",()=>assert.equal(transferAllocations({...bounty,winner:null,entries:[]},"settle")[0].recipient,owner));
