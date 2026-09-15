import {distribution,feeValue,feeConfig} from "./fee-fixture.mjs";
// Offline fixture: every network request is intercepted; no chain writes occur.
import {submissionData,consensus,validateSignedSubmission} from "../lib/transaction.mjs";
const contract="0x"+"33".repeat(20),id="bounty-001",evidence="https://raw.githubusercontent.com/example/repo/"+"a".repeat(40)+"/guide.md";
const reply=(v,status=200)=>new Response(JSON.stringify(v,(_,x)=>typeof x==="bigint"?x.toString():x),{status,headers:{"Content-Type":"application/json"}});
globalThis.fetch=async(input,options={})=>{
 const url=String(input),body=options.body?JSON.parse(options.body):null;
 if(url==="https://studio-next.genlayer.com/api"){if(body.method!=="sim_getFeeConfig")throw Error("Unexpected RPC");return reply({jsonrpc:"2.0",id:body.id,result:feeConfig})}
 if(url.endsWith("/api/config"))return reply({chainId:61997,contract});
 if(url.endsWith("/api/bounties/"+id))return reply({id,title:"Write a connection guide",requirements:["Include a provider connection example."],status:"open",deadline:9999999999});
 if(url===evidence)return new Response("Connect a JSON-RPC provider and handle rejected requests.");
 if(url==="https://model.example/v1/chat/completions")return reply({choices:[{message:{content:"This guide includes a provider connection example and explains rejected requests."}}]});
 if(url.endsWith("/prepare"))return reply({contract,transaction:{chainId:61997,to:consensus,data:submissionData(contract,id,body,distribution,Math.floor(Date.now()/1000)+600),nonce:0,type:"legacy",gas:"200000",gasPrice:"1",value:process.env.TEST_TAMPER?"1":feeValue.toString()}});
 if(url.endsWith("/submissions")){await validateSignedSubmission(body.signedTransaction,contract,id,body.entry);return reply({hash:"0x"+"44".repeat(32),status_url:"/api/transactions/"+"0x"+"44".repeat(32)},202)}
 if(url.includes("/api/transactions/"))return reply({state:"success"});
 throw new Error("Unexpected network request in offline agent test: "+url);
};
