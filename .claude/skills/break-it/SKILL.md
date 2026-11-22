---
name: break-it
description: Failure drill on a branch or leaf. Raushan predicts, you trigger it with a test or script, then explain and fix.
disable-model-invocation: true
argument-hint: <branch|leaf> <name>
---

Failure drill for: $ARGUMENTS. Read its ownership card in docs/system/lld/ first.

Drills, one at a time, in this order unless Raushan picks one:
1. Slow dependency (Gemini/OpenAI/Veo call or the database takes 60 s).
2. Duplicate delivery (the same request or job submitted twice).
3. Crash mid-write (kill the process while it writes status.json, a DB row or a render).
4. Bad input (empty, huge, wrong type, path tricks like ../).
5. Load spike (N films or requests at once: what queues, what runs out first).
6. For a branch: a failing interface with another branch (the other side returns garbage, times out or is down).

For each drill:
- Ask Raushan to PREDICT what will happen before anything runs.
- Trigger it with a small test or script (never against real paid APIs without asking; mock them).
- Show the exact terminal output.
- Ask him to explain what happened and why, then fill the gaps.
- Agree a fix; it becomes a leaf (or is done now if small, with a test that proves it).

Record measured limits (timings, counts, sizes) and what breaks on the ownership card ("Limits (measured)",
"Breaks when", "Proven by"). Add any new risk to docs/system/RISKS.md.
