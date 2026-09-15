import {arenaChain,type ArenaMode} from "./arenas.ts";
export type Provider={request:(r:{method:string;params?:unknown[]})=>Promise<unknown>;on?:(event:string,fn:(...args:unknown[])=>void)=>void;removeListener?:(event:string,fn:(...args:unknown[])=>void)=>void;providers?:Provider[];isRabby?:boolean;isOkxWallet?:boolean;isOKExWallet?:boolean;isMetaMask?:boolean;isCoinbaseWallet?:boolean};
export type WalletOption={id:string;name:string;provider:Provider};
export type Session={address:`0x${string}`;provider:Provider};
function walletBrand(name:string,provider?:Provider){
 const normalized=name.toLowerCase().replace(/[^a-z0-9]/g,"");
 if(normalized.includes("rabby")||provider?.isRabby)return "rabby";
 if(normalized.includes("okx")||normalized.includes("okex")||provider?.isOkxWallet||provider?.isOKExWallet)return "okx";
 if(normalized.includes("coinbase")||provider?.isCoinbaseWallet)return "coinbase";
 if(normalized.includes("metamask")||provider?.isMetaMask)return "metamask";
 return normalized.replace(/wallet|extension/g,"");
}
export async function discoverWallets():Promise<WalletOption[]>{
 const wallets:WalletOption[]=[];const seen=new Set<Provider>();const ids=new Set<string>();
 const add=(w:WalletOption)=>{if(typeof w.provider?.request==="function"&&!seen.has(w.provider)&&!ids.has(w.id)){seen.add(w.provider);ids.add(w.id);wallets.push(w)}};
 const announce=(event:Event)=>{const d=(event as CustomEvent).detail;if(typeof d?.info?.name==="string"&&d?.provider)add({id:d.info.uuid||d.info.rdns||d.info.name,name:d.info.name,provider:d.provider})};
 window.addEventListener("eip6963:announceProvider",announce);
 try{window.dispatchEvent(new Event("eip6963:requestProvider"));await new Promise(r=>setTimeout(r,350))}
 finally{window.removeEventListener("eip6963:announceProvider",announce)}
 const announcedBrands=new Set(wallets.map(w=>walletBrand(w.name)));
 const injected=(window as unknown as {ethereum?:Provider}).ethereum;
 if(injected)for(const [i,p] of (injected.providers||[injected]).entries()){
  const brand=walletBrand("",p);
  // Extensions can expose a second proxy through window.ethereum.
  // Prefer the announced provider for that wallet.
  if(announcedBrands.has(brand)||(!brand&&wallets.length))continue;
  const name=({rabby:"Rabby Wallet",okx:"OKX Wallet",coinbase:"Coinbase Wallet",metamask:"MetaMask"} as Record<string,string>)[brand]||"Browser wallet";
  add({id:"legacy-"+i,name,provider:p});if(brand)announcedBrands.add(brand);
 }
 return wallets;
}
function missingChain(error:unknown){
 const errors:Record<string,unknown>[]=[];const seen=new Set<unknown>();
 function visit(value:unknown,depth=0){if(!value||typeof value!=="object"||seen.has(value)||depth>5)return;seen.add(value);const e=value as Record<string,unknown>;errors.push(e);for(const key of ["cause","data","originalError","error"])visit(e[key],depth+1)}
 visit(error);
 if(errors.some(e=>Number(e.code)===4001))return false;
 return errors.some(e=>Number(e.code)===4902||typeof e.message==="string"&&/unrecognized chain|unrecognised chain|unknown chain|chain.*(?:not added|not found|not supported|not recognized)|network.*(?:not added|not found)/i.test(e.message));
}
export async function connectWallet(w:WalletOption,mode:ArenaMode=false):Promise<Session>{
 const accounts=await w.provider.request({method:"eth_requestAccounts"}) as string[];if(!accounts?.[0])throw new Error("The wallet did not return an account.");
 const studionet=arenaChain(mode); const chainId="0x"+studionet.id.toString(16);
 if(BigInt(await w.provider.request({method:"eth_chainId"}) as string)!==BigInt(studionet.id)){
  try{await w.provider.request({method:"wallet_switchEthereumChain",params:[{chainId}]})}catch(e){if(!missingChain(e))throw e;await w.provider.request({method:"wallet_addEthereumChain",params:[{chainId,chainName:studionet.name,nativeCurrency:studionet.nativeCurrency,rpcUrls:[...studionet.rpcUrls.default.http],...(studionet.blockExplorers?.default?.url?{blockExplorerUrls:[studionet.blockExplorers.default.url]}:{})}]});await w.provider.request({method:"wallet_switchEthereumChain",params:[{chainId}]})}
 }
 const active=await w.provider.request({method:"eth_accounts"}) as string[];if(!active?.[0])throw new Error("The wallet disconnected. Connect again.");
 const session={address:active[0] as `0x${string}`,provider:w.provider};await assertWallet(session,mode);return session;
}
export async function assertWallet(s:Session,mode:ArenaMode=false){
 const studionet=arenaChain(mode);
 const accounts=await s.provider.request({method:"eth_accounts"}) as string[];
 if(accounts?.[0]?.toLowerCase()!==s.address.toLowerCase())throw new Error("The active wallet account changed. Connect again.");
 if(BigInt(await s.provider.request({method:"eth_chainId"}) as string)!==BigInt(studionet.id))throw new Error("Switch your wallet to the selected GenLayer network before signing.");
}
