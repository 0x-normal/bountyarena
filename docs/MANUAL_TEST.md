# Test BountyArena

The preview is connected to a deployed BountyArena Studio contract. Use separate sponsor and contributor wallets. Live test results are recorded in docs/LIVE_TEST_RESULTS.json.

1. Open the app in Chrome with Rabby or another Ethereum wallet. Connect wallet A and approve switching to GenLayer Studio.
2. Click Get test tokens. This calls the Studio simulator faucet for 0.001 simulated GEN. No real tokens are used.
3. Post a Documentation bounty with a 0.0001 test GEN reward and a 10-minute submission window. Use a task that is fully verifiable in one public file. For example, require a connection guide containing a JavaScript provider example and an error-handling explanation.
4. Confirm the wallet transaction, then use Check transaction until finalized. The funded bounty appears on the board. Copy its ID from its detail page.
5. Switch to wallet B and reconnect. Prepare a real Markdown deliverable, commit it to a public repository, and copy its raw URL with a full 40-character commit SHA. GitHub's Y shortcut changes a file view to a permanent commit link; then choose Raw.
6. Submit work with that evidence URL and a summary of what you delivered. Confirm the wallet transaction. Refresh or check finality until the entry appears.
7. Request Review with GenLayer. Inspect every requirement's reason and exact quote. If the evidence cannot be retrieved or the output is malformed, the result must be inconclusive, never paid.
8. To exercise competition, switch to wallet C and submit a different evidence file missing one requirement. Review it. It should be rejected if the omission is clear.
9. After the 10-minute deadline, settle. If any entry remains unreviewed or inconclusive, review it or wait for the 72-hour cutoff. The earliest fully qualified entry wins regardless of review order.
10. Connect the winning wallet and claim. The status becomes Paid only after finalized successful execution. A second claim must fail.

## Negative checks
- Attempt submission with the sponsor's wallet: rejected.
- Submit twice with the same wallet: rejected.
- Use a main-branch URL instead of a commit: rejected before signing.
- Cancel wallet approval: no submission should appear.
- Change accounts or networks: reconnect is required.
- Refresh during a transaction: the pending hash remains available.
- Create a separate bounty without entries. After its deadline, settlement refunds the sponsor.
- API tests: npm test verifies mismatched signer, payload, bounty, chain, recipient and value. It also runs the example agent against an offline network fixture.

## Agent test
Use the Agent API page and README. Run the model-backed draft mode first, inspect the generated Markdown and publish it yourself, then submit its pinned URL. Omitting --submit only prints the proposal. You need your own model credentials to exercise actual generation. Local/offline tests are not evidence of live model quality.

## Current verification
23 local contract tests, 14 transaction/schema/finality tests, and 2 offline agent-flow tests are provided. Check docs/VERIFICATION.md for the actual last-run results and which external tests are still pending.
