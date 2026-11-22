---
name: explain-code
description: Ownership check. Raushan explains the code folder → file → function → line; you correct and fill gaps.
disable-model-invocation: true
argument-hint: <leaf|branch|trunk> <name>
---

Ownership check for: $ARGUMENTS. Use docs/system/CODEMAP.md and the lld/ file to find the code.

1. Walk it in order: folder → file → function → line. For each step, ask Raushan to explain it FIRST.
2. Then correct and fill the gaps, including what the framework does underneath (FastAPI routing and dependency
   injection, SQLAlchemy session and transaction, the subprocess/job runner, React rendering, Remotion rendering).
3. For each important block ask: "When does this break?" (bad input, slow or failing dependency, crash mid-write,
   duplicate request, load).
4. For a branch, also ask: "What happens to the other branches if this one fails?" and check the interface contract
   on the ownership card.
5. Keep score honestly. Note what he explained alone, what needed a hint, what he missed.

If he passes (explains every step with at most small hints and answers the "when does this break" questions),
SUGGEST marking it "Owner-verified: yes" in CODEMAP.md. Do not flip it yourself; he does.
If he does not pass, list the 2–3 gaps and suggest a /teach topic for each.
