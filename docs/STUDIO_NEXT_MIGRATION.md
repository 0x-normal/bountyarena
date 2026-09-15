# Studio Next migration

The hackathon announcement requires Studio Next at https://studio-next.genlayer.com/api, chain 61997. lib/network.mjs extends the RC SDK studioDevnet chain definition, preserving its v0.6 consensus ABI and contract addresses while selecting the announced RPC and explorer.

Pinned packages: genlayer-js 2.0.0-rc.1, Transaction Kit and React adapter 0.1.0-rc.2. The GenVM contract uses the v0.3 runner shipped with genvm-manager v0.6.0-rc5. The stable v0.2 runtime was rejected by Studio Next; changing the runner and the contract imports/run_nondet API resolved deployment. Requirements, settlement rules and escrow checks are unchanged.

Earlier Studio contracts use a separately aliased genlayer-js 1.1.8 client. Their source snapshots, network, status mapping and funding route are retained for old rewards. New submissions go only to Studio Next.

## Reproduce
1. Install Node >=22.13 and run npm ci, npm test, npm run build:vercel.
2. Use Python 3.12+ and an isolated environment. Install requirements-test.txt, then run python -m pytest. The official test harness downloads its runtime on first use. Contract tests mock web and LLM inputs.
3. For a separate live integration environment, run node scripts/deploy-next.mjs --test. Temporarily point a local checkout's lib/deployment.json at artifacts/next-test-deployment.json and run npm run dev. Do not publish that temporary configuration.
4. Run node scripts/test-live-next.mjs --settle. It uses test-only keys under ignored .keys, persists transaction checkpoints, and validates actual finalized execution and balances. It waits until the bounty deadline before settling. Restore the clean deployment configuration afterwards.
5. node scripts/test-wallet-next.mjs tests live fee policy and browser envelope construction without broadcasting or using a real extension.

Do not rerun a timed-out write blindly. Resume with its checkpoint/hash. Studio is a simulator; all tokens are test units. The integration fixtures are attributed upstream documents and are not claimed as agent-authored work.

Official references: [migration](https://docs.genlayer.com/developers/consensus-v06-migration), [SDK fee allocations](https://github.com/genlayerlabs/genlayer-js), [Studio fee validation](https://github.com/genlayerlabs/genlayer-studio/blob/main/backend/protocol_rpc/fees.py).
