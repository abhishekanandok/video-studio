# BRANCH · slide-skills (studio lab)

> DRAFT — not verified by owner · Status: built

## Internal design
Reusable slide "looks" (`skills` rows with `data.type=="look"`), a subjects registry (`settings.slide_skill_subjects`),
backgrounds, demo films (creates an audio film), and picture rules learned from corrections. API
`backend/app/api/slideskills.py` (438 lines), `api/picturerules.py` (36 lines); engine `video/slideskill.py`
(writes progress into its DB row), `video/picrules.py`.

## Leaves
create (multipart refs + assets), edit/remake/feedback/backgrounds, demo, delete, subjects, picture rules ·
not yet written.

## OWNERSHIP CARD
- **Purpose:** a style system; becomes V1's brand basics and template looks (V1-17).
- **Breaks when:** child process writes the row while the API edits it (no locking).
- **Limits (measured):** unknown · **Proven by:** none
