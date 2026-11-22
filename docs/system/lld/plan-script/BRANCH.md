# BRANCH · plan-script

> DRAFT — not verified by owner · Status: partly built (logic exists in the documentary pipeline; no V1 endpoint)

## Internal design
V1: the creator gives a topic, target length, audience, tone and optional notes/PDF/links. The branch reads the
sources, writes an outline with sections and timings (creator edits and approves), then a full script in the creator's
voice where every line carries a stable id and a visual tag (`[FLOWCHART]`, `[MAP]`, ...).
Today the closest code is the documentary pipeline:
- `video/linkread.py` + `doc.py:614` read links (4 threads) → `sources.json`.
- `doc.py:662` `_plan` → `FilmPlan` → `plan.json` (`get_llm().structured(..., smart=True)`).
- `doc.py:708` `write_act` one LLM call per act → `actNN.json`, then a Flash "plain words" pass (`doc.py:746`).
- `video/crew/planner.py` (LangGraph planner) and `video/notes.py` script batches are alternative styles.

## Leaves (build order)
1. plan-request: `POST /api/projects/{id}/plan` (topic, length, tone, sources) · planned · lld: not yet written
2. source-reader: notes/PDF/links → grounded source pack (reuse `linkread.py`, `notes.py` page reader) · partly built
3. outline: outline with sections + timings, editable, approve gate · partly built (`doc._plan`)
4. script-writer: script lines with ids + visual tags in the creator's tone · partly built (`doc.write_act`)
5. grounding-check: every factual line traces to a source span · planned
6. script-approve: lock the script version that record and visuals use · planned

## Interface contracts
| Direction | With | Interface | Contract that must never break |
|---|---|---|---|
| receives | accounts | project id, owner | only the owner can plan/approve |
| sends | record | approved script (version, line ids, text) | line ids are stable once approved |
| sends | visuals | visual tags per line id | tags come from the template registry |

## OWNERSHIP CARD
- **Purpose:** turn a topic and the creator's material into a script they can read on camera.
- **Receives:** topic, length, tone, notes/PDF/links, project id.
- **Sends:** approved script (line ids + text + visual tags), sources.
- **Promises:** no facts beyond the creator's material and cited sources (PRD V1-13); script ready ≤ 5 min.
- **Breaks when:** the LLM invents facts; a source PDF is scanned or huge; Gemini retries forever (see ai-clients).
- **Limits (measured):** unknown until /break-it
- **Observe via:** today `pipeline.log`, `status.json` stage `plan`/`scripts`.
- **Proven by (tests):** none
- **Open questions:** reuse `doc.py` in-process vs as a job? How to show the creator what a visual tag means?
