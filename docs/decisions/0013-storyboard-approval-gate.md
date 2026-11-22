# 0013. A storyboard approval gate before any film is written; Gemini by default; argon hidden behind "classic"

- **Status:** proposed (Raushan to confirm after the first film made through the gate)
- **Amended 2026-10-27:** the gate is OFF by default. Raushan could not judge a scene from its text card ("by reading
  the text I would never be able to understand what is in the scene"), so the approval step added waiting without
  adding judgement. After the storyboard, the viewer test (an AI first-time viewer; cards it does not get are redrawn)
  approves the cards and `oneshot.py` goes straight on to write and render. `review: true` on POST /films keeps the
  old stop for anyone who wants it. Revisit if the storyboard ever shows each scene as a picture instead of text.
- **Tree level:** branch (visuals), with a change to the Motion tab
- **Date:** 2026-10-26

## Context
Films were written before anyone checked the idea. A wrong choice (a map where a person was wanted, a missing
character) was only seen after the whole film was written, compiled and rendered, and fixing it meant rewriting
scenes. The one-shot runner (`video/oneshot.py`, `video/gemini2d.py`) made the best films so far in one pass, but it
runs only from the terminal, and the Motion tab still runs the older per-scene pipeline (`video/argon.py`), which
writes one code file per scene from a library dump and loops on compile errors.

## Options
1. **Keep argon as the default**, and add the gate to it.
2. **New one-shot pipeline with a required storyboard gate**, shown in the Motion tab; argon moved behind a "classic"
   switch and hidden from the normal UI (chosen).
3. **Delete argon** now.

## Decision
- **Pipeline order:** plan (topic, notes, style or mix) → story → voice → **design (storyboard)** → **gate** → write
  one film file → compile with undo-if-worse → words check → look rounds → render → cost by stage.
- **The gate is required.** The write step refuses to run unless every storyboard card is `approved`. The check runs
  on the server (in the write endpoint), not only in the UI.
- **Storyboard card:** one per line, with a stable id (`L01`, `L02`, …), its words, what is on screen, what moves, the
  pieces picked, and `status: pending | approved`. The state lives in `storyboard.json` in the film's folder.
- **Feedback** is written on one card. Only that card is sent back to the designer with the note; the other cards
  keep their state. The redrawn card returns as `pending` and must be approved again.
- **Corrections land on one line:** after the write, each line's section in the film file is found by its id, so a
  change made through feedback replaces only that line's section.
- **Model:** Gemini (`gemini-3.8-flash`) is the default for every step. Claude (Opus 5.5 or Sonnet 5.5, through the
  Anthropic API) is an option added later, behind a setting. It is not built in this decision.
- **Argon:** kept in the repo, not deleted. It is hidden from the Motion tab's normal view and available only behind a
  "classic" switch, so nothing that already works is lost. It is deleted only after the new pipeline has made three
  films that the owner approves.

## Consequences
- Films cost a little more in review time (you approve the storyboard), and a little less in wasted writes.
- Two pipelines exist side by side until argon is deleted, so changes to shared code (the kit, the motion library)
  must be checked against both while that lasts.
- Storyboard state is a new interface between the Motion tab and the runner. Its shape must stay stable (listed in the
  visuals BRANCH doc when the code lands).
- A feedback round costs one small designer call for one card, not a full rewrite.

## How we verify
1. The write endpoint rejects a film with any `pending` card (a test with one card left pending returns an error, and
   no film file is written).
2. Feedback on one card changes that card only: the other cards' text and status are unchanged after the redraw.
3. Three films made through the gate are approved by the owner; each one's `cost.json` shows the stages, and the
   storyboard review time is recorded in the film's log.
4. Argon is absent from the default Motion tab, and the "classic" switch still runs it.
