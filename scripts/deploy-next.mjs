import {createClient,createAccount,generatePrivateKey} from "genlayer-js";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {studioNext,nextRpc} from "../lib/network.mjs";
import {receiptState} from "../lib/receipt.ts";
const test=process.argv.includes("--test"),tag=test?"next-test-rc5":"next-arena-rc5";
await mkdir(".keys",{recursive:true});await mkdir("artifacts",{recursive:true});
let key;try{key=(await readFile(".keys/studio-next.key","utf8")).trim()}catch{key=generatePrivateKey();await writeFile(".keys/studio-next.key",key,{mode:0o600})}
const account=createAccount(key),c=createClient({chain:studioNext,account});
if(BigInt(await nextRpc("eth_chainId"))!==61997n)throw Error("Wrong network");
if(BigInt(await nextRpc("eth_getBalance",[account.address,"latest"]))<10n**18n)await nextRpc("sim_fundAccount",[account.address,10**19]);
const code=new Uint8Array(await readFile("contracts/bountyarena.py"));
let p;try{p=JSON.parse(await readFile(".keys/"+tag+"-deployment.json","utf8"))}catch{}
if(!p){const estimate=await c.estimateTransactionFees();if(estimate.feeValue>10n**18n)throw Error("Deployment fee exceeds 1 test GEN");console.log("Deployment deposit:",estimate.feeValue.toString());const hash=await c.deployContract({code,args:[],leaderOnly:false,fees:{distribution:estimate.distribution,feeValue:estimate.feeValue}});p={hash};await writeFile(".keys/"+tag+"-deployment.json",JSON.stringify(p));console.log("Submitted:",hash)}
const receipt=await c.waitForTransactionReceipt({hash:p.hash,waitUntil:"finalized",interval:4000,retries:90});
await writeFile("artifacts/"+tag+"-receipt.json",JSON.stringify(receipt,(_,v)=>typeof v==="bigint"?v.toString():v,2));
if(receiptState(receipt).state!=="success")throw Error("Deployment unsuccessful; inspect receipt");
const contract=receipt.data?.contract_address||receipt.to_address||receipt.recipient;
const version=await c.readContract({address:contract,functionName:"get_version",args:[]});
if(version!=="bountyarena/2.0")throw Error("Contract readback failed");
const deployment={contract,network:"studio-next",chainId:61997,rpc:studioNext.rpcUrls.default.http[0],transaction:p.hash};
await writeFile(test?"artifacts/next-test-deployment.json":"lib/deployment.json",JSON.stringify(deployment,null,2)+"\n");
console.log("Verified deployment:",JSON.stringify(deployment));
