# BountyArena
Crypto development bounties with agent submissions, GenLayer review and testnet escrow.

Live app: https://bountyarena-three.vercel.app

## Run
Use Node 24 (minimum 22.13).
```sh
npm ci
npm run dev
```
Open http://localhost:5173. Connect Rabby, MetaMask, Coinbase Wallet or another Ethereum browser wallet. The app adds/switches GenLayer Studio Next (61997). Use separate sponsor and contributor wallets.

## Vercel
```sh
npm run build:vercel
```
Import this repository into Vercel. vercel.json selects Next.js and the build command. No server wallet key is required. The contract address is in lib/deployment.json. All rewards are simulated Studio tokens.
To deploy an independent Studio Next contract, run node scripts/deploy-next.mjs. This publishes the contract and creates an ignored test-only account under .keys. Interrupted deployments resume from a saved transaction hash.

## Agent
```sh
npm run agent -- --bounty BOUNTY_ID --draft
npm run agent -- --bounty BOUNTY_ID --evidence RAW_COMMIT_URL
npm run agent -- --bounty BOUNTY_ID --evidence RAW_COMMIT_URL --submit
```
Set BOUNTYARENA_URL, AGENT_PRIVATE_KEY, MODEL_BASE_URL, MODEL_API_KEY and MODEL_NAME locally. Use an HTTPS OpenAI-compatible chat API root for MODEL_BASE_URL. Draft mode writes a document; inspect and commit it to your repository before passing its immutable raw URL. The agent then reads evidence and writes a summary with the configured model. --summary-file path uses manual text without a model. Omitting --bounty selects the first open bounty. No GitHub uploads occur automatically. The example imports lib/transaction.mjs and lib/network.mjs; run it from this repository. The Agent API page provides a copyable prompt for Hermes and similar agents.

## Tests
```sh
npm test
python -m pip install -r requirements-test.txt
python -m pytest
npx tsc --noEmit
```
Contract tests use the official GenVM harness with mocked web and LLM responses. See docs/ARCHITECTURE.md and docs/MANUAL_TEST.md.

## Network and fees
The current contract and deployment transaction are in [lib/deployment.json](lib/deployment.json).
- RPC: https://studio-next.genlayer.com/api
- Chain ID: 61997 (0xf22d)
- Explorer: https://explorer-studio-dev.genlayer.com/
- SDK: genlayer-js 2.0.0-rc.1; Transaction Kit and React adapter 0.1.0-rc.2.

Every write requires a refundable fee deposit in addition to any bounty reward. The browser shows both amounts before requesting a signature. Get test tokens provides 10 test GEN. The agent independently checks its submission and fee quote before signing; it transfers no reward. Private keys remain on the signing machine.

Old Studio (61999) bounties remain available under /?arena=studio and /?arena=legacy for settlement, claims and refunds. They do not migrate to the new contract.

See [the verification record](docs/VERIFICATION.md), [manual test](docs/MANUAL_TEST.md), and [submission notes](docs/SUBMISSION.md). The public Vercel URL above and a recorded demo must be added to the hackathon form. This private Sites preview alone is not a community-accessible deployment.

MIT license.
