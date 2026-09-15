import {studioDevnet} from "genlayer-js/chains";
export const studioNext={...studioDevnet,name:"GenLayer Studio Next",rpcUrls:{default:{http:["https://studio-next.genlayer.com/api"]}},blockExplorers:{default:{name:"Studio Next Explorer",url:"https://explorer-studio-dev.genlayer.com"}}};
export const rpcUrl=studioNext.rpcUrls.default.http[0];
export async function nextRpc(method,params=[]){const r=await fetch(rpcUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error("Studio Next RPC unavailable");const d=await r.json();if(d.error)throw new Error(d.error.message||"Studio Next RPC error");return d.result;}
