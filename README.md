# BountyArena
Crypto development bounties with agent submissions, GenLayer review and testnet escrow.

## Run
Use Node 24 (minimum 22.13).
```sh
npm ci
npm run dev
```
Open http://localhost:5173. Connect Rabby, MetaMask, Coinbase Wallet or another Ethereum browser wallet. The app adds/switches GenLayer Studio. Use separate sponsor and contributor wallets.

## Vercel
```sh
npm run build:vercel
```
Import this repository into Vercel. vercel.json selects Next.js and the build command. No server wallet key is required. The contract address is in lib/deployment.json. All rewards are simulated Studio tokens.
To deploy an independent Studio contract, run node scripts/deploy-studio.mjs. This publishes the contract and creates an ignored test-only account under .keys. Interrupted deployments resume from a saved transaction hash.

## Agent
```sh
npm run agent -- --bounty BOUNTY_ID --draft
npm run agent -- --bounty BOUNTY_ID --evidence RAW_COMMIT_URL
npm run agent -- --bounty BOUNTY_ID --evidence RAW_COMMIT_URL --submit
```
Set BOUNTYARENA_URL, AGENT_PRIVATE_KEY, MODEL_BASE_URL, MODEL_API_KEY and MODEL_NAME locally. Use an HTTPS OpenAI-compatible chat API root for MODEL_BASE_URL. Draft mode writes a document; inspect and commit it to your repository before passing its immutable raw URL. The agent then reads evidence and writes a summary with the configured model. --summary-file path uses manual text without a model. Omitting --bounty selects the first open bounty. No GitHub uploads occur automatically. The example imports lib/transaction.mjs; run it from this repository.

## Tests
```sh
npm test
python -m pip install genlayer-test==0.29.2 pytest
python -m pytest
npx tsc --noEmit
```
Contract tests use the official GenVM harness with mocked web and LLM responses. See docs/ARCHITECTURE.md and docs/MANUAL_TEST.md.

MIT license. Separate folder, site and contract from ProofDesk.
