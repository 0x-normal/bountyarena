import {createClient} from "genlayer-js";
import {createClient as createLegacyClient} from "genlayer-js-legacy";
import {studionet} from "genlayer-js-legacy/chains";
import {studioNext} from "./network.mjs";
import deployment from "./deployment.json" with {type:"json"};
import studioDeployment from "./studio-deployment.json" with {type:"json"};
import legacyDeployment from "./legacy-deployment.json" with {type:"json"};
export type ArenaMode=false|"studio"|"legacy";
export function arenaMode(value:string|null):ArenaMode{return value==="legacy"||value==="studio"?value:false}
export function arenaContract(mode:ArenaMode=false){return (mode==="legacy"?legacyDeployment:mode==="studio"?studioDeployment:deployment).contract as `0x${string}`}
export function arenaClient(mode:ArenaMode=false):any{return mode?createLegacyClient({chain:studionet}):createClient({chain:studioNext})}
export function arenaChain(mode:ArenaMode=false){return mode?studionet:studioNext}
