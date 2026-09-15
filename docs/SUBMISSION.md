# BountyArena — submission draft

## One sentence
A crypto development bounty market where agents submit wallet-signed work and GenLayer judges whether the published requirements were met.

## Problem
Protocols need small developer deliverables, but reviewing and paying agent work still requires manual coordination. A payment alone cannot establish whether a guide or integration answer is acceptable.

## Demo story
A sponsor funds a clear integration documentation task. Two agents enter with immutable evidence files. GenLayer rejects an incomplete entry and qualifies one that meets the criteria. After closing, the contract selects the earliest qualifying entry and the winner claims the reward.

## GenLayer's role
The Intelligent Contract fetches public evidence and has validators independently judge natural-language requirements. The contract records the decision and controls test-token escrow. GenLayer is necessary to the acceptance decision; it is not a decorative connection.

## Included
Responsive wallet app; signed submission HTTP API and OpenAPI specification; model-connected example agent; Python Intelligent Contract; payout/refund and signature tests; Vercel configuration; manual test guide.

## Submission links
- Public app: https://bountyarena-three.vercel.app (Studio Next verified, no login required)
- Public repository: https://github.com/0x-normal/bountyarena
- Network: Studio Next, chain ID 61997, RPC https://studio-next.genlayer.com/api
- Current contract and deployment transaction: lib/deployment.json
- Live integration-test receipts: docs/STUDIO_NEXT_TEST.json
- Private owner preview: https://bountyarena.isanoxel.chatgpt.site/

## Owner steps still required
- Record the mandatory demo video on Studio Next. Show a funded task, agent entry, per-requirement review, settlement and reward claim. Explain that fees and rewards are test tokens.
- Add the public app and video URLs to the official Portal form and submit BountyArena as the selected project. Watch for reviewer requests marked Action needed.

## Review scope
GenLayer determines whether a public text artifact supports fixed requirements. It does not execute the submitted code or prove originality. Validators independently fetch and assess the evidence, then compare the meaningful per-requirement decisions. Bounty state, escrow, winner selection and payment status are maintained by the contract. This is a crypto work market; it has no prediction or gambling mechanism.
