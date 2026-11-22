# BRANCH · payments

> DRAFT — not verified by owner · Status: planned

## Internal design
Pay per video through UPI (Razorpay or Cashfree): first video free (with outro card), ₹199 (≤ 15 min source), ₹299
(15–60 min), pack of ten ₹1,499; GST invoices (PRD 8.4). The payment provider calls a webhook; the order becomes paid
exactly once; render-deliver releases downloads.

## Leaves (build order)
1. orders table + migration · planned
2. create-order (amount from source length) · planned
3. webhook (signature check, idempotent by provider payment id) · planned
4. packs (credits ledger) · planned
5. invoices (GST) · planned

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| receives | provider | webhook | verify signature; handle duplicates |
| sends | render-deliver | order paid | exactly once per payment |

## OWNERSHIP CARD
- **Purpose:** get paid simply, in INR, through UPI.
- **Receives:** order requests, provider webhooks.
- **Sends:** paid events, invoices.
- **Promises:** no double charge, no double release, no lost payment.
- **Breaks when:** webhook arrives twice or before the redirect; provider outage.
- **Limits (measured):** n/a
- **Observe via:** planned
- **Proven by (tests):** none
- **Open questions:** Razorpay vs Cashfree fees and UPI AutoPay for V2.
