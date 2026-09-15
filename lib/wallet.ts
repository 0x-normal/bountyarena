import {arenaChain,type ArenaMode} from "./arenas.ts";
export type Provider={request:(r:{method:string;params?:unknown[]})=>Promise<unknown>;on?:(event:string,fn:(...args:unknown[])=>void)=>void;removeListener?:(event:string,fn:(...args:unknown[])=>void)=>void;providers?:Provider[];isRabby?:boolean;isMetaMask?:boolean;isCoinbaseWallet?:boolean};
export type WalletOption={id:string;name:string;provider:Provider};
export type Session={address:`0x${string}`;provider:Provider};
export async function discoverWallets():Promise<WalletOption[]>{
 const wallets:WalletOption[]=[];const seen=new Set<Provider>();const add=(w:WalletOption)=>{if(typeof w.provider?.request==="function"&&!seen.has(w.provider)){seen.add(w.provider);wallets.push(w)}};
 const announce=(event:Event)=>{const d=(event as CustomEvent).detail;if(d?.info?.name)add({id:d.info.uuid||d.info.name,name:d.info.name,provider:d.provider})};
 window.addEventListener("eip6963:announceProvider",announce);window.dispatchEvent(new Event("eip6963:requestProvider"));await new Promise(r=>setTimeout(r,350));window.removeEventListener("eip6963:announceProvider",announce);
 const injected=(window as unknown as {ethereum?:Provider}).ethereum;if(injected)for(const [i,p] of (injected.providers||[injected]).entries())add({id:"legacy-"+i,name:p.isRabby?"Rabby":p.isCoinbaseWallet?"Coinbase Wallet":p.isMetaMask?"MetaMask":"Browser wallet",provider:p});return wallets;
}
export async function connectWallet(w:WalletOption,mode:ArenaMode=false):Promise<Session>{
 const accounts=await w.provider.request({method:"eth_requestAccounts"}) as string[];if(!accounts?.[0])throw new Error("The wallet did not return an account.");
 const studionet=arenaChain(mode); const chainId="0x"+studionet.id.toString(16);
 if(BigInt(await w.provider.request({method:"eth_chainId"}) as string)!==BigInt(studionet.id)){
  try{await w.provider.request({method:"wallet_switchEthereumChain",params:[{chainId}]})}catch(e){if((e as {code?:number}).code!==4902)throw e;await w.provider.request({method:"wallet_addEthereumChain",params:[{chainId,chainName:studionet.name,nativeCurrency:studionet.nativeCurrency,rpcUrls:[...studionet.rpcUrls.default.http]}]});await w.provider.request({method:"wallet_switchEthereumChain",params:[{chainId}]})}
 }
 const session={address:accounts[0] as `0x${string}`,provider:w.provider};await assertWallet(session,mode);return session;
}
export async function assertWallet(s:Session,mode:ArenaMode=false){
 const studionet=arenaChain(mode);
 const accounts=await s.provider.request({method:"eth_accounts"}) as string[];
 if(accounts?.[0]?.toLowerCase()!==s.address.toLowerCase())throw new Error("The active wallet account changed. Connect again.");
 if(BigInt(await s.provider.request({method:"eth_chainId"}) as string)!==BigInt(studionet.id))throw new Error("Switch your wallet to the selected GenLayer network before signing.");
}
