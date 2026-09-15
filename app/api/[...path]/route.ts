import {NextRequest} from "next/server";
import {z} from "zod";
import {studioNext as studionet} from "@/lib/network.mjs";
import {arenaMode} from "@/lib/arenas";
import {listBounties,readBounty,validateEntry,prepare,contract,client} from "@/lib/server";
import {validateSignedSubmission} from "@/lib/transaction.mjs";
import {addressSchema} from "@/lib/domain";
import {receiptState} from "@/lib/receipt";
import openapi from "@/docs/openapi.json";
import {fundStudioWallet} from "@/lib/faucet.mjs";
import {prepareBrowserWallet} from "@/lib/wallet-prepare";
import deployment from "@/lib/deployment.json";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
function problem(e:unknown){if(e instanceof z.ZodError)return json({error:e.issues.map(i=>i.message).join(" ")},400);return json({error:e instanceof Error?e.message:"The network request failed."},400)}
function segments(request:Request){return new URL(request.url).pathname.slice(5).split("/").filter(Boolean)}
async function body(request:Request){if(!request.headers.get("content-type")?.includes("application/json"))throw new Error("Use application/json.");const reader=request.body?.getReader();if(!reader)throw new Error("Missing request body.");let text="",size=0;const decoder=new TextDecoder();while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>50000){await reader.cancel();throw new Error("Request body exceeds 50 KB.")}text+=decoder.decode(r.value,{stream:true})}return JSON.parse(text+decoder.decode())}
export async function GET(request:NextRequest){try{const p=segments(request);
 if(p[0]==="config")return json({chainId:studionet.id,contract:deployment.contract,network:"GenLayer Studio Next",rpc:studionet.rpcUrls.default.http[0]});
 if(p[0]==="openapi")return json(openapi);
 if(p[0]==="bounties"&&p.length===1){const offset=Number(new URL(request.url).searchParams.get("offset")||0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)throw new Error("Invalid offset");return json(await listBounties(offset,arenaMode(new URL(request.url).searchParams.get("arena"))))}
 if(p[0]==="bounties"&&p.length===2){if(!/^[a-z0-9-]{6,64}$/.test(p[1]))throw new Error("Invalid bounty ID");return json(await readBounty(p[1],arenaMode(new URL(request.url).searchParams.get("arena"))))}
 if(p[0]==="transactions"&&p.length===2){if(!/^0x[0-9a-fA-F]{64}$/.test(p[1]))throw new Error("Invalid transaction hash");const receipt=await client(arenaMode(new URL(request.url).searchParams.get("arena"))).getTransaction({hash:p[1] as import("genlayer-js/types").TransactionHash});if(!receipt)return json({state:"pending"});return json(receiptState(receipt,!!arenaMode(new URL(request.url).searchParams.get("arena"))))}
 return json({error:"Route not found"},404);
 }catch(e){return problem(e)}}
export async function POST(request:NextRequest){try{const p=segments(request);
 if(p[0]==="wallet"&&p[1]==="prepare"&&p.length===2)return json(await prepareBrowserWallet(await body(request)));
 if(p[0]==="faucet"&&p.length===1){const input=z.object({wallet:addressSchema,arena:z.enum(["studio","legacy"]).optional()}).strict().parse(await body(request));return json(await fundStudioWallet(input.wallet,undefined,!!input.arena))}
 if(p[0]!=="bounties"||p.length!==3||!["prepare","submissions"].includes(p[2]))return json({error:"Route not found"},404);
 if(!/^[a-z0-9-]{6,64}$/.test(p[1]))throw new Error("Invalid bounty ID");
 const raw=await body(request);
 if(p[2]==="prepare"){const entry=await validateEntry(p[1],raw);return json({transaction:await prepare(p[1],entry),contract:contract()})}
 const payload=z.object({entry:z.unknown(),signedTransaction:z.string().max(40000)}).strict().parse(raw);
 const entry=await validateEntry(p[1],payload.entry);
 await validateSignedSubmission(payload.signedTransaction,contract(),p[1],entry);
 const hash=await client().sendRawTransaction({serializedTransaction:payload.signedTransaction as `0x${string}`});
 return json({hash,state:"pending",status_url:"/api/transactions/"+hash},202);
 }catch(e){return problem(e)}}
