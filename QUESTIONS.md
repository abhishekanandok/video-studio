# QUESTIONS: curiosity backlog

Each question is tagged with where it lives in the tree. Answer them in /teach or /design-review; move answered ones to
the bottom with a one-line answer and the date.

## Open
- [root] How many videos a day must V1 handle at Gate 1 (30 paying creators), and what does that mean for render machines?
- [root] What is the real cost of one ten-minute video today (LLM + TTS + images + render)? Is ₹40 reachable?
- [trunk/jobs] Why are films run as detached child processes instead of a job queue? What breaks first if two users start films at once?
- [trunk/jobs] After a reboot, can a stale `Film.pid` point at an unrelated process? How would we prove it?
- [trunk/database] What happens to existing rows when we add a column to `Film`, given there are no migrations?
- [trunk/config] Why does Gemini retry forever on network errors, and what should the limit be?
- [trunk/api] What can anyone on the internet do to this API if it is deployed as it is today (no auth, static `video/public`)?
- [branch/documentary] How does `doc.py` know which stages are already done, and what if `status.json` is half-written?
- [branch/teleprompter] Record in the browser and upload once, or upload chunks while recording? What if the network drops at minute 9?
- [branch/plan-script] How do we stop the script writer from adding facts that are not in the creator's notes?
- [leaf/frontend-api] On Vercel, where does the frontend find the API, and what must CORS allow?

## Answered
(none yet)
