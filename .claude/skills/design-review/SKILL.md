---
name: design-review
description: Senior-lead design interview at one tree level (root, trunk, branch or leaf); ends with an ADR and HLD/LLD updates.
disable-model-invocation: true
argument-hint: <root|trunk|branch|leaf> <name>
---

Run a design interview for: $ARGUMENTS. Read docs/system/HLD.md and the matching docs/system/lld/ file first.

What to cover at each level:
- ROOT: the problem, the users, MVP scope, and capacity numbers Raushan estimates himself (videos/day, minutes of
  media, storage, render time, cost per video). Make him show the maths.
- TRUNK: each technology choice and how every branch will depend on it.
- BRANCH: its responsibility, the data it owns, its interfaces with other branches, the contract that must never
  break, and how it splits into leaves (with build order).
- LEAF: data model, concurrency, idempotency, errors, timeouts.

For an EXISTING part: show the current design (file:line) and make Raushan justify or challenge each choice.

Rules, always:
- One question at a time. Never answer before he tries.
- Make him propose 2 options; then add one he missed and compare all three.
- Ask 2 trap questions (a plausible but wrong idea, or a failure he has not considered).
- If he is stuck, run /teach on that sub-topic, then come back.

Finish by writing or updating the ADR in docs/decisions/ (from 0000-template.md, naming the tree level) and the
matching sections of HLD.md and the lld/ files. Mark anything still unverified as "DRAFT — not verified by owner".
