# The crew

A notes film made by six agents in a LangGraph graph that stops at eight gates for the human. Skill 1 only: text slides,
with a real photo where it helps, or a still Diagram card where the idea must be seen (points, arrows, lengths, a formula
triangle; drawn by code from the Director's spec, video/src/notes/DiagramSvg.tsx). No animation, no moving pictures, no
sound effects, no music. Gemini does all the model work.

App: `/crew` (list), `/crew/new`, `/crew/<id>` (the gates). API: `backend/app/api/crew.py`. State: Postgres (LangGraph
checkpointer, thread id = the film's slug), so a film can wait at a gate for days.

## Who owns what

| Agent | Owns | Never does | File |
|---|---|---|---|
| Planner (chief) | The plan: slides in the script's order, the source each covers, photo ideas, where Skill 1 is weak. Routes notes on finished scenes to the right agent. | writes slides, designs scenes, makes media | `planner.py` |
| Writer | Every word: slides (the creator's note-maker prompt), the cold open, the narration | picks pictures, timing | `writer.py` |
| Director | How each scene plays: the spoken line that reveals each bullet (timed to the real voice), photo or not | writes words, fetches or draws | `director.py` |
| Searcher | Wikimedia photos (free licences only), web research for new skill ideas | generates anything, chooses the final photo | `searcher.py` |
| Producer | Voices (TTS), the full-size photo picked, drawn photo when asked, scene renders, the final join | changes words or designs | `producer.py` |
| Verifier | Reports problems with reasons after every step | fixes or approves anything | `verifier.py` |

Rule: each agent writes only its own part of the state (`state.py`). The orchestrator is code (`graph.py`), not an agent.

## The flow

```
plan → verify → GATE 0 · slides → verify → GATE 1 · script → verify → GATE 2 · voices → verify → GATE 3
     · direct → verify → GATE 4 · pictures → verify → GATE 5 · build → verify → GATE 6 · final → GATE 7 → end
```

- The Verifier sends a problem back to the owner on its own, up to 3 fix rounds; only what is still wrong after that goes
  to the human with the report.
- At a gate the human approves (with any edits of their own) or flags items with notes. A note goes back to that gate's
  owner. At gates 6 and 7 (finished scenes) the Planner reads each note and sends it to the one agent that owns it.
- Only what changed is redone: a step marks the scenes it changed, later steps redo only those, and an already-approved
  gate with nothing new on it is passed without asking again.
- Weak scenes: the Planner marks where text + photo can't show the idea; the Director draws a Diagram card there instead of
  a photo (reviewed at Gate 4, checked again on the rendered frame at Gate 6). The Searcher also researches online how
  good teachers show it and proposes further skills at Gate 0: research only until the human decides.

## Run by hand

```bash
cd backend && .venv/bin/python ../video/crew/run.py --slug crew9                        # start, or carry on after a crash
cd backend && .venv/bin/python ../video/crew/run.py --slug crew9 --resume answer.json   # answer the waiting gate
```

An answer: `{"gate": "slides", "action": "approve" | "revise", "edits": {...}, "notes": {"s003": "..."}, "note": "..."}`.
