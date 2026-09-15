# Verification — Studio Next

Verified on 15 September 2026.

- Current deployment: 0xE1Cec1B99c59E853571e6389813730a3F9E01C6C, Studio Next chain 61997. Deployment transaction: 0x16f8812e09b5c8bc99f057b3843bfa3649a8518200812f2cf44309c61b8b94dd. Contract version readback passed; the new board was empty.
- Live integration: funding, two signed API submissions, independently validated positive and negative reviews, sponsor-entry rejection, winner selection, unauthorized-claim rejection, reward balance, double-claim rejection and empty-bounty refund balance passed. See [STUDIO_NEXT_TEST.json](STUDIO_NEXT_TEST.json). Its test contract is separate from the clean public-app contract.
- Wallet preparation: verified live fee policy and captured the exact create, claim and refund envelopes before signing. Canceling fee approval produced no wallet request. See [STUDIO_NEXT_WALLET_TEST.json](STUDIO_NEXT_WALLET_TEST.json). This used an EIP-1193 test provider; it was not an actual Rabby popup test.
- Application regression suite: 30 tests passed, covering signatures, fee limits, finality, external-message refunds, wallet selection and agent transport.
- Official direct GenVM harness: 30 contract tests passed on the pinned v0.3 runtime, using controlled web and model responses. The live integration additionally exercised actual network model reviews.
- Vercel production build and TypeScript passed. Sites Worker build passed.
- Local HTTP checks returned 200 for the app, config, OpenAPI, clean Studio Next board and both earlier Studio bounty lists.
- Private keys and local environment files remain ignored; the release-source scan checks known local wallet keys without printing them.

## Fees
Every write carries a live SDK estimate. The app shows reward, fee deposit and total before signing. Unused primary and external-message budgets are refunded. External-execution remainder refunds are accounted for separately because Studio records them outside total_refunded. Real balance checks passed for payout and refund.

This release uses conservative SDK network-default allocations, not a tuned offline fee profile. Payouts/refunds explicitly allocate one recipient-bound external transfer. Transaction Kit RC2 supplies the fee quote; its current submit method does not accept message allocations, so those two paths use the matching SDK with the approved quote unchanged.

## Historical results and remaining owner checks
LIVE_TEST_RESULTS.json and REVIEWER_V2_TEST.json document earlier Studio (61999) runs. The Hermes guide test belongs to that earlier network; Hermes has not been rerun on Studio Next during this migration. Existing escrow remains on the earlier contracts, accessible from the app links.

A public Vercel deployment still needs its URL checked. Record the mandatory demo on Studio Next and add both links to the hackathon submission. The existing private Sites preview is not evidence that the migration has been published: the current connector returned project_not_found while attempting to access it.
