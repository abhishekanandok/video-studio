# BRANCH · accounts

> DRAFT — not verified by owner · Status: planned

## Internal design
Phone-OTP sign-up, a creator profile (channel link, subject, language, a few past videos for tone), and projects that
belong to a user. Every other V1 branch asks this branch "who is this, and do they own project X?". Depends on the
auth trunk component (`lld/trunk/auth.md`).

## Leaves (build order)
1. users-table + migration · planned
2. otp-login (request + verify, rate-limited) · planned
3. session / token issuing + `current_user` dependency · planned
4. projects (create, list, ownership check) · planned
5. profile (channel, language, tone samples) · planned

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| sends | every V1 branch | `current_user`, `project.owner_id` | a request never reads or writes another user's project |

## OWNERSHIP CARD
- **Purpose:** identity and ownership for everything else.
- **Receives:** phone number, OTP.
- **Sends:** session, user id, project ids.
- **Promises:** OTP abuse is rate-limited; sessions expire.
- **Breaks when:** SMS provider down; OTP brute force.
- **Limits (measured):** n/a
- **Observe via:** planned
- **Proven by (tests):** none
- **Open questions:** provider choice (see trunk/auth.md).
