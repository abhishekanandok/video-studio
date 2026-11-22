# BRANCH · crew-films (studio lab)

> DRAFT — not verified by owner · Status: built

## Internal design
A LangGraph six-agent notes film (`video/crew/`: director, graph, planner, producer, run, scout, searcher, state,
verifier, writer) with 8 human gates. API `backend/app/api/crew.py` (168 lines) and the Skill Lab
`backend/app/api/skills.py` (247 lines). Gate answers are written as `answer-<ts>.json` and the run resumes with
`--resume` (`crew.py:145-147`). State is checkpointed in Postgres by `langgraph-checkpoint-postgres` (tables unknown).

## Leaves
create, gate answer, continue/stop, skills (scout image → LLM in a threadpool, notes, examples ≤ 12 MB image / 80 MB
video, sample) · lld files not yet written.

## OWNERSHIP CARD
- **Purpose:** experiments with gated multi-agent planning; ideas for V1's plan-script gates.
- **Breaks when:** Scout/sample calls hold an HTTP request for minutes (`skills.py:91,168,226`).
- **Limits (measured):** unknown · **Proven by:** none
