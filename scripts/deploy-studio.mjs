import {createAccount,generatePrivateKey,createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionStatus,TransactionHashVariant} from "genlayer-js/types";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {receiptState} from "../lib/receipt.ts";
const testing=process.argv.includes("--test"),tag=testing?"test":"arena";
await mkdir(".keys",{recursive:true});await mkdir("artifacts",{recursive:true});
let key;try{key=(await readFile(".keys/studio.key","utf8")).trim()}catch{key=generatePrivateKey();await writeFile(".keys/studio.key",key,{mode:0o600})}
const account=createAccount(key),c=createClient({chain:studionet,account});
console.log("BountyArena test account:",account.address);
const code=new Uint8Array(await readFile("contracts/bountyarena.py"));
const schema=await c.getContractSchemaForCode(code);await writeFile("artifacts/contract-schema.json",JSON.stringify(schema,null,2));
let p;try{p=JSON.parse(await readFile(".keys/"+tag+"-deployment.json","utf8"))}catch{}
if(!p){const hash=await c.deployContract({code,args:[],leaderOnly:false});p={hash};await writeFile(".keys/"+tag+"-deployment.json",JSON.stringify(p));console.log("Deployment sent:",hash)}
const receipt=await c.waitForTransactionReceipt({hash:p.hash,status:TransactionStatus.FINALIZED,interval:4000,retries:30});
if(receiptState(receipt).state!=="success")throw new Error("Deployment execution did not succeed.");
const contract=receipt.data?.contract_address||receipt.to_address||receipt.recipient;
if(!/^0x[0-9a-fA-F]{40}$/.test(contract))throw new Error("No deployed address");
const version=await c.readContract({address:contract,functionName:"get_version",args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
if(version!=="bountyarena/1.0")throw new Error("Contract readback failed");
const deployment={contract,network:"studionet",transaction:p.hash};
await writeFile(testing?"artifacts/test-deployment.json":"lib/deployment.json",JSON.stringify(deployment,null,2)+"\n");
await writeFile("artifacts/"+tag+"-receipt.json",JSON.stringify(receipt,(_,v)=>typeof v==="bigint"?v.toString():v,2));
console.log("Deployed and verified:",contract);
