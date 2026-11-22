# BRANCH · cinema (studio lab)

> DRAFT — not verified by owner · Status: built

## Internal design
Short Veo films: story → sheets → frames → shots (Veo `generate_videos`, 1080p) → voice → film (+ optional dub,
word check) (`video/cinema.py:811`). All state in `video/public/cinema/<slug>/project.json` (no status.json, no DB row).
Each step is its own process `python cinema.py <slug> <step>` with `cwd=../backend` (`cinema.py:198`). Final join with
`npx remotion ffmpeg` (`:764-799`). API `backend/app/api/cinema.py` (145 lines) imports the engine directly.

## Leaves
list/create, edit (`PUT` takes a raw dict, whitelisted keys, `cinema.py:86`), run step, shot retake/use · not yet written.

## OWNERSHIP CARD
- **Purpose:** generative video experiments; not in V1 (AI footage is not the product's default).
- **Breaks when:** API and step process both load-modify-save `project.json` (per-process lock only, `:133-144`);
  slug path parameter unchecked (`cinema.py:27-28`); Veo spend (~$0.40/s) uncapped.
- **Limits (measured):** unknown · **Proven by:** none
