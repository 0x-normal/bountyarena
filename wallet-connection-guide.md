# Connecting a Wallet to GenLayer Studio (Studionet)

A practical guide for dApp front-ends that need to connect an injected Ethereum wallet to **GenLayer Studio** ("Studionet"), the hosted GenLayer development network, and keep that connection healthy while the user interacts with the page.

---

## 1. Network facts used throughout this guide

| Setting | Value |
| --- | --- |
| Network name | GenLayer Studio (Studionet) |
| RPC URL | `https://studio.genlayer.com/api` |
| Chain ID | `61999` (hex `0xf22f`) |
| Currency symbol | `GEN` |
| Currency decimals | `18` |
| Block explorer | `https://explorer-studio.genlayer.com` |

These are the values you pass to the wallet. Two of them are easy to get wrong:

- **Chain ID must be a hex string in wallet calls.** `61999` decimal is `0xf22f`. `wallet_switchEthereumChain` and `wallet_addEthereumChain` reject decimal numbers.
- **The RPC URL is a path on a host** (`studio.genlayer.com/api`), not a bare subdomain. Dropping `/api` produces a URL that resolves but does not serve JSON-RPC.

> Verified against the live endpoint: `eth_chainId` on `https://studio.genlayer.com/api` returns `0xf22f` (61999), and the official GenLayer network table lists Studionet with RPC `https://studio.genlayer.com/api`, chain ID `61999`, currency `GEN`.

---

## 2. Prerequisites

1. A browser with an injected wallet — MetaMask, Rabby, Coinbase Wallet, or any EIP-1193 provider available as `window.ethereum`.
2. A page served over **HTTPS** for production, or **`http://localhost`** during development. Wallets treat `http://` origins other than `localhost` as insecure and either hide the provider or refuse to prompt.
3. No key material in your front-end. The wallet owns the keys; your page only requests permissions and reads public state.

> **Note on GenLayer Studio and staged rollouts.** Some hosted Studio previews are reachable only behind an authenticated preview session (for example, a ChatGPT sign-in wall on the preview host). That gate belongs to the preview infrastructure, not to the network. Never attempt to bypass it, script around it, or reuse session cookies — deploy your own front-end or use the public RPC as documented here instead.

---

## 3. Requirement 1 — Request accounts and switch to chain ID 61999

The connection sequence has two calls, always in this order:

1. `eth_requestAccounts` — asks the user to unlock the wallet and grant your origin access to their accounts. This is the only call that may show a permission prompt.
2. `wallet_switchEthereumChain` — asks the wallet to switch its active chain to GenLayer Studio. This is a *request*, not a guarantee: the user can decline it, and some wallets confirm it with a second prompt.

```js
// genlayer-wallet.js
export const GENLAYER_STUDIO = {
  chainId: "0xf22f",              // 61999 in hex — wallets require hex strings
  chainIdDecimal: 61999,
  chainName: "GenLayer Studio",
  rpcUrls: ["https://studio.genlayer.com/api"],
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
};

/** Minimal EIP-1193 provider accessor. */
export function getProvider() {
  const provider = window.ethereum;
  if (!provider) {
    throw new Error(
      "No Ethereum wallet detected. Install MetaMask, Rabby or Coinbase Wallet."
    );
  }
  return provider;
}

/**
 * Requests accounts, then switches the wallet to GenLayer Studio.
 * Returns the active account address (lower-cased for comparisons).
 */
export async function connectToGenLayerStudio() {
  const provider = getProvider();

  // 1. Request accounts. Prompts the user on first use.
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("The wallet returned no accounts.");
  }

  // 2. Switch to GenLayer Studio.
  await switchToGenLayerStudio(provider);

  // 3. Re-read the account after the switch — the active account can change
  //    while the wallet is being prompted.
  const [account] = await provider.request({ method: "eth_accounts" });
  return account.toLowerCase();
}

/** Switches the active chain, adding it first when the wallet does not know it. */
export async function switchToGenLayerStudio(provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_STUDIO.chainId }],
    });
  } catch (error) {
    // 4902: the wallet has never seen this chain. Add it, then switch again.
    if (error?.code === 4902 || error?.data?.originalError?.code === 4902) {
      await addGenLayerStudio(provider);
      return;
    }
    throw error;
  }
}
```

### Always confirm the switch actually happened

`wallet_switchEthereumChain` can resolve successfully while the wallet has *not* changed network — some wallets return success and then show their own confirmation UI that the user declines. Never trust the absence of an error. Read `eth_chainId` back and compare:

```js
export async function getActiveChainId(provider) {
  const chainIdHex = await provider.request({ method: "eth_chainId" });
  return Number.parseInt(chainIdHex, 16);
}

export async function requireGenLayerStudio(provider) {
  const chainId = await getActiveChainId(provider);
  if (chainId !== GENLAYER_STUDIO.chainIdDecimal) {
    throw new Error(
      `Wrong network: expected GenLayer Studio (61999), got ${chainId}.`
    );
  }
}
```

This check is what stops the most common class of front-end bug: the UI says "Connected to GenLayer Studio" while the wallet is still on Ethereum mainnet and every subsequent call is sent to the wrong chain.

---

## 4. Requirement 2 — Network-add fallback (error 4902)

Wallets only know the chains they ship with. GenLayer Studio is not one of them, so a first-time `wallet_switchEthereumChain` fails with **error code `4902` — "Unrecognized chain ID"**. The fix is `wallet_addEthereumChain`, which registers the network with the wallet and (in most wallets) switches to it as part of the same confirmation.

```js
/**
 * Registers GenLayer Studio with the wallet.
 * Called automatically when the switch fails with 4902.
 */
export async function addGenLayerStudio(provider) {
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: GENLAYER_STUDIO.chainId,             // "0xf22f"
        chainName: GENLAYER_STUDIO.chainName,         // "GenLayer Studio"
        rpcUrls: GENLAYER_STUDIO.rpcUrls,             // ["https://studio.genlayer.com/api"]
        nativeCurrency: GENLAYER_STUDIO.nativeCurrency, // GEN / GEN / 18
        blockExplorerUrls: GENLAYER_STUDIO.blockExplorerUrls,
      },
    ],
  });
}
```

Notes that save debugging time:

- **`rpcUrls` and `blockExplorerUrls` are arrays**, even with one entry.
- **`nativeCurrency` is an object** with `name`, `symbol` and `decimals`. All three are required; omitting `decimals` is a common cause of a rejected add request.
- **Adding is not switching.** After a successful add, run the switch again (or re-read `eth_chainId`) and verify. The helper in section 3 does exactly this by returning after `addGenLayerStudio` and letting the caller confirm.
- **Duplicate adds are not fatal.** Wallets treat adding an already-known chain as a no-op or replace-if-different; it is not an error you need to pre-empt.
- **RPC trust is the user's decision.** `wallet_addEthereumChain` lets a page propose an RPC endpoint. That is why the URL must be exactly `https://studio.genlayer.com/api` and nothing else — never accept an RPC URL from a query string, a postMessage, or any other page-controlled input.

### A complete add-then-switch-then-verify flow

```js
export async function ensureGenLayerStudio() {
  const provider = getProvider();
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_STUDIO.chainId }],
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await addGenLayerStudio(provider); // wallet will prompt to add + switch
  }
  // Never assume. Verify against the chain itself.
  await requireGenLayerStudio(provider);
}
```

---

## 5. Requirement 3 — Error 4001 and the `accountsChanged` event

### 5.1 Error 4001 — the user rejected the request

**`4001` means the user declined the prompt.** It is a normal, expected outcome, not a crash. Every `request()` call that shows a prompt can produce it: `eth_requestAccounts`, `wallet_switchEthereumChain`, `wallet_addEthereumChain`, and any signing call.

```js
export async function connectSafely() {
  try {
    const account = await connectToGenLayerStudio();
    return { ok: true, account };
  } catch (error) {
    if (error?.code === 4001) {
      // User declined. This is not an error state — just report it.
      return { ok: false, reason: "rejected" };
    }
    if (error?.code === -32002) {
      // A request is already open in the wallet. Ask the user to finish it.
      return { ok: false, reason: "pending" };
    }
    return { ok: false, reason: "failed", message: error?.message };
  }
}
```

How to handle it well:

- **Do not retry automatically.** Re-prompting immediately after a rejection is what makes a dApp feel hostile. Re-prompt only on a fresh, explicit user action (a click).
- **Do not treat it as a connection failure.** Keep any previously connected state; show a dismissible message such as "Connection cancelled" and leave the Connect button available.
- **Distinguish 4001 from 4902 and -32002.** They need different responses:
  - `4001` — user said no.
  - `4902` — chain unknown; add it (section 4).
  - `-32002` — a request is already pending in the wallet; tell the user to open their wallet extension rather than firing another request.
- **Read the code defensively.** Some wallets nest the original error: check `error.code` first, then `error.data?.originalError?.code`. Log the whole object during development, but never surface raw provider errors to end users.
- **Scope matters.** `eth_requestAccounts` grants your origin access; a later `eth_accounts` call returns cached accounts without a prompt. After a rejection, `eth_accounts` will simply return an empty array — that is the correct signal to show the disconnected state.

### 5.2 Account and chain changes — `accountsChanged` / `chainChanged`

A wallet connection is not a static fact. The user can switch accounts inside their wallet, disconnect your origin, or change networks — all without touching your page. EIP-1193 provides events for this; subscribe on connect and update the UI from the event payload.

```js
export function watchWallet(provider, handlers = {}) {
  const onAccountsChanged = (accounts) => {
    if (!Array.isArray(accounts) || accounts.length === 0) {
      // Wallet locked, or the user revoked this origin. Treated as a disconnect.
      handlers.onDisconnect?.();
      return;
    }
    handlers.onAccountChange?.(accounts[0].toLowerCase());
  };

  const onChainChanged = (chainIdHex) => {
    // chainIdHex is a hex string, e.g. "0xf22f" for GenLayer Studio.
    handlers.onChainChange?.(Number.parseInt(chainIdHex, 16));
  };

  provider.on?.("accountsChanged", onAccountsChanged);
  provider.on?.("chainChanged", onChainChanged);

  // Return an unsubscribe function; call it when the component unmounts.
  return () => {
    provider.removeListener?.("accountsChanged", onAccountsChanged);
    provider.removeListener?.("chainChanged", onChainChanged);
  };
}
```

Rules that keep this correct:

- **An empty array means disconnected.** `accountsChanged` firing with `[]` is the canonical "this origin no longer has access" signal. Clear the session and return to the connect screen — do not keep rendering the last known address.
- **Normalise addresses before comparing.** Wallets return the same account with different casing across versions. Compare lower-cased strings, as `connectToGenLayerStudio` does.
- **Listen to `chainChanged`, not just the switch result.** Users can change networks from inside the wallet. On a change away from 61999, disable chain-dependent actions and offer a switch button rather than firing a switch request from inside the handler (that can loop).
- **Unsubscribe on unmount.** Duplicate listeners cause repeated re-renders and, in frameworks with strict-mode double-mounting, confusing duplicate state updates.
- **Re-read state after an event.** Events tell you something changed; a fresh `eth_accounts` / `eth_chainId` read tells you the new truth.

### 5.3 Putting it together: a small, complete client

```js
import {
  getProvider,
  ensureGenLayerStudio,
  getActiveChainId,
  GENLAYER_STUDIO,
  watchWallet,
} from "./genlayer-wallet.js";

let state = { account: null, chainId: null, connected: false };

const render = () => {
  // Replace with your framework's state update.
  document.dispatchEvent(new CustomEvent("wallet:state", { detail: state }));
};

export async function connect() {
  try {
    const provider = getProvider();
    const [account] = await provider.request({ method: "eth_requestAccounts" });
    await ensureGenLayerStudio();

    state = {
      account: account.toLowerCase(),
      chainId: await getActiveChainId(provider),
      connected: true,
    };
    render();

    watchWallet(provider, {
      onAccountChange: (next) => { state.account = next; render(); },
      onChainChange: (id) => { state.chainId = id; render(); },
      onDisconnect: () => {
        state = { account: null, chainId: null, connected: false };
        render();
      },
    });
  } catch (error) {
    if (error?.code === 4001) { state.connected = false; render(); return; }
    throw error;
  }
}
```

---

## 6. Verification checklist

Before trusting your integration, confirm each item:

- [ ] `eth_requestAccounts` returns a non-empty array and the address is displayed lower-cased.
- [ ] `wallet_switchEthereumChain` is followed by a real `eth_chainId` read, not an assumption.
- [ ] On a wallet that has never seen the network, `wallet_switchEthereumChain` fails with `4902` and the add flow registers `https://studio.genlayer.com/api` with `GEN` / `18`.
- [ ] Declining the connect prompt surfaces "cancelled" and leaves the app usable.
- [ ] Switching accounts in the wallet updates the address without a page reload.
- [ ] Disconnecting the origin inside the wallet (empty `accountsChanged`) returns the UI to the disconnected state.
- [ ] Switching the wallet to another network disables chain-dependent actions.
- [ ] No private key, mnemonic, or seed phrase appears anywhere in the front-end bundle or network traffic.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `window.ethereum` is `undefined` | No wallet installed, or the page is on insecure `http://` | Install a wallet; serve over HTTPS or `localhost` |
| Switch returns success but the network does not change | Wallet requires its own confirmation | Re-read `eth_chainId` and prompt again from a user gesture |
| Repeated `4902` | The add request was declined, or `rpcUrls` was malformed | Use the exact array `["https://studio.genlayer.com/api"]` and ask the user to approve the add prompt |
| Transactions go to the wrong chain | Switch result trusted without verification | Call `requireGenLayerStudio` before every chain-dependent action |
| `-32002` on every attempt | A previous prompt is still open in the wallet | Ask the user to open their wallet extension and resolve it |
| Address changes format unexpectedly | Mixed-case addresses compared directly | Compare `address.toLowerCase()` |
| `eth_call` fails although the chain is connected | RPC URL is missing the `/api` path | Use `https://studio.genlayer.com/api` |

---

## 8. Statement on execution

**Examples in this guide were not executed in a browser wallet environment.** They were written against the documented EIP-1193 / EIP-3085 wallet API surface and are provided as reference implementations; the author did not run them against an injected wallet, and no transaction or signature was produced by them.

What *was* verified directly:

- `eth_chainId` against `https://studio.genlayer.com/api` returns `0xf22f` (61999), confirming the RPC URL and chain ID pair used in the snippets.
- The GenLayer Studio network values (RPC `https://studio.genlayer.com/api`, chain ID 61999, symbol `GEN`, explorer `explorer-studio.genlayer.com`) match the official GenLayer network reference.

Anything beyond that — a user's actual accounts, prompt behaviour in a specific wallet version, or on-chain effects — depends on the wallet and the live network and was not exercised here.

---

## 9. Sources

- GenLayer documentation — Network reference (Studionet: RPC `https://studio.genlayer.com/api`, chain ID 61999, currency `GEN`, built-in faucet): https://docs.genlayer.com/developers/networks
- EIP-1193 — Ethereum Provider JavaScript API (`request`, `accountsChanged`, `chainChanged`, error `4001`): https://eips.ethereum.org/EIPS/eip-1193
- EIP-3085 — `wallet_addEthereumChain`: https://eips.ethereum.org/EIPS/eip-3085
- EIP-3326 — `wallet_switchEthereumChain` (and the `4902` unrecognised-chain error): https://eips.ethereum.org/EIPS/eip-3326
