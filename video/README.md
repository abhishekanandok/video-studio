# Tayyari video

Lessons and any topic become documentary films. The Studio (Tayyari → 06 Studio) and the lesson page's
**Generate video** button both run `doc.py`. Rendering is Remotion (`src/`).

```
config ─► [story world] ─► plan (acts) ─► act scripts, in order ─► [dub for a 2nd audio track] ─► motion director
       ─► one image per scene ─► motion (Veo clips, parallax layers) ─► voices (per track) ─► film.json ─► render (+ 2nd track)
```

Everything is cached on disk under `public/<slug>/`, and a re-run resumes. Progress for the app is written to
`status.json` (the main run) and `tasks.json` (single edits).

## Standards every film follows

Tests in `backend/tests/test_units.py` enforce these. Don't loosen them.

**Writing**
- Explain from scratch. The first time a term appears it gets a plain overview and an on-screen definition card.
  People are introduced in one line.
- Links in the notes or facts are opened and read (web pages, PDFs, and a report's PDF behind its landing page; Gemini's URL
  reader for pages a plain fetch can't load). What they say becomes citable source material (`sources.json`). A site that
  blocks readers is reported in the log, never guessed at. All of it goes through the safety harness in `linkread.py`
  (public hosts only, 5 MB pages / 25 MB PDFs, allowed file types, 30 links, prompt-injection filtering); don't loosen it.
- Never invent specifics: no made-up error codes, statistics, quotes, products or incidents. Dates, names and numbers come
  only from the source material or verified facts (`FACTS` for Computer Networks).
- Two hosts talk like a real podcast (`CONVERSATION`):
  - uneven turns;
  - short reactions ("हम्म", "हाँ", "Wait…");
  - analogies built together;
  - guesses that get confirmed;
  - never re-explaining what the other just said;
  - no A-B-A-B pattern.
- Scenes change often (a new image almost every scene). Each scene picks the look it needs: collage, archival, blueprint,
  cartoon, map, infographic, photo, macro, illustration.
- Plain words: simple to moderate, never hard (most viewers are Indian). Every act goes through an editor pass
  (`plain_words`) that rewrites hard words line by line, keeping facts and the line count.
- No PYQs in films; the lessons cover them.
- No burned-in captions or subtitles, ever: YouTube adds them. On-screen notes and definition cards are visuals, not captions.
- Existing franchises in a story idea become an original world with the same vibe (story format only).
- Documentaries are fact-driven, like Veritasium and Vox: real, sourced facts in every scene; real companies, institutions
  and researchers named exactly as the sources do; a "source" card (outlet, date, finding) whenever a source is cited and a
  "chart" whenever real numbers are compared. Energy stays constant: open loops, a new fact every 20-30 s.
- A documentary's story is grounded (`BIBLE_GROUNDED`): one realistic composite character in a real place today, no
  fantasy, no invented villains; the story and the facts are one thread. Each person gets a photo portrait that every
  image showing them follows, so they look the same all film.
- Images are bright, clean and professional, one clear subject each; never logos, real faces or readable text.

**Motion** (`motion.py`, the Studio's "Motion" setting: off / parallax / few / many)
- A director node reads the whole film once and picks per scene: `veo` (a cinematic video shot made from the scene's own
  image, so the style matches), `parallax` (subject lifted off a clean plate, two layers moving), or `camera`.
- Veo is never used for a real historical event or a real, named person, nor for diagrams/infographics. Its budget is capped
  (few = 1 in 12 scenes, many = 1 in 5) because it is the costly part.
- Veo needs its own access (`VEO_API_KEY`, an AI Studio key on a billed project; or `VEO_PROJECT` + `GOOGLE_APPLICATION_CREDENTIALS`
  for Vertex). The Vertex express key can't reach it. Without access, or if a clip fails, the scene becomes parallax.
- A clip plays (slowed to at most 0.6x when the scene is longer) and then holds on its last frame. Clips are muted.

**Two audio tracks** (`second_language`)
- The script is dubbed line for line (same scenes, same line count, enforced), both are recorded, and each scene lasts as long
  as its longer take, so one set of pictures fits both. Images never contain text; labels are drawn by the renderer.
- Output: `out/<slug>.mp4` (first language) plus `out/<slug>-<language>.m4a` (the full mix with the dub) for YouTube's
  multi-language audio.

**Voices**
- Pace: calm and clear, 145 words a minute on Normal (130 slow, 165 fast; 170 was too fast for the creator). The voice is told the pace, takes slower
  than about 120 wpm are retaken, and the film's playback speed is set from the measured takes (1.0x-1.3x, pitch kept).
- Gemini TTS reads its whole prompt aloud. Never put context (such as the previous line) in a TTS prompt: that once made a
  co-host repeat the other's line.
- A two-voice film records each scene as one natural conversation (multi-speaker TTS). Other films record line by line.
- Every take is length-checked against its word count and retaken if it's far too long (extra words) or too short
  (dropped words).
- Nothing is recorded until every role has a voice. Voices can be changed any time; file names carry the voices, so old
  and new never mix.

**Robustness**
- One failed image never stops a film. Failures are retried at the end, and a scene with no image borrows the nearest
  image from its act.
- The image quota is per minute. Paint one at a time, with exponential back-off.
- Status writes are locked (recording runs in parallel threads).
- Progress in the app is counted from the files that exist, never from stale numbers.
- Edits drop only what they touch (`invalidate()`), and "dialogue only" rewrites keep every visual (enforced in code).
- Order matters: finish the script and dialogue changes before recording, or scenes get recorded twice.

## Archival documentaries (`archivedoc.py`, Remotion "Archive")
- Research first: Google search + the safe reader; a claim is kept only if its verbatim quote is on the page and its numbers
  are in the quote; sources are tiered (primary / established news / never used). Too little evidence stops the film.
- Chapters are planned to the requested length and written in parallel; code checks every line (cited facts, numbers,
  word-for-word quotes, the speaker named, real headlines filled from the page, length, few bare phrases).
- Images are real: Wikimedia Commons, licence-checked, and Gemini looks at each one before it is used. Credits are saved.
- The look (in the renderer, so every film gets it): every card sits on a real, darkened, drifting archival photo matched
  to its subject; documents, headlines and quotes are printed on newsprint paper; a reading camera zooms into the exact
  words being read (measured on the page) and follows the highlighter; the narrator sits bottom-left with a red voice line.
- An approved chapter can be locked ("locked": true) and is never rewritten.

## Research: first pass, investigation, review

`archivedoc.py` researches in rounds. The first pass runs planned searches (the creator's links first). Then
`investigate` runs 2 rounds: Gemini reads every verified fact and names leads (a gap in the creator's questions, a lead to
follow, the original of a second-hand claim, the other side of an accusation, an update to a fact that may be stale), and
pages a good site refused are searched for at another outlet (never bypassed). Code keeps a fact only if its evidence is
on the page word for word and its numbers are in that evidence; sources are tiered (1 primary, 2 established press, think
tanks and industry data, 4 state media: usable only as "X says", checked in the script). `research-pack.md` is the pack
the creator reads; with `review_research` the film pauses until it is approved in the Studio.

## The collage board (`board.py`, Remotion "Board")

Archival films are drawn as a Vox-style paper board by default (`visuals: "archive"` keeps the older dark cut). The
script and voices are never touched; `board.py <slug>` re-directs only the pictures and caches everything in
`public/<slug>/board/`.

- Mix: about 70% collage (sticky notes, typed scraps, red-string chains and stars), 20% pictures (the real archival
  photos plus generated cut-outs), 10% newspaper (real headlines; rises and falls over time as a newspaper chart).
- No camera travel: each piece zooms in once as it lands and then holds still while it is read.
- Checks: every number on a note or pin must be in the line or its beat; a number line must show its number and a
  chart line its values; pins must use the line's own words and make sense alone; cut-outs never show a named person,
  a logo, text or a chart, never repeat, and are repainted if the background does not come away cleanly.
- A failed choice falls back to a plain split made by code; a half-sentence phrase becomes a still close-up of the
  chapter's collage, never a fragment on screen.
- Edits (the Studio's "Edit" choice, `edit` in the film config): `board` (the default, the classic cut), `build` (the
  word-synced build-up, `build.py` + `Build.tsx`: each line's page fills piece by piece, every photo, cut-out, stamp or note
  flying in from the nearest edge and landing on the word that names it; `align` times the words from the pauses in the
  recording; `build.py <slug> 0,1,2` makes a demo clip of some lines without touching the film) or `layered`, the
  same board plus layered backgrounds, so no background is a flat colour. In `layered`, a shot that would sit on plain paper or the dark title
  backdrop (titles, charts, photos, string diagrams) gets a faint montage of its own chapter's pictures (archival photos
  first, then cut-outs, then the chapter's collage), tinted grey with lifted blacks and soft whites, then textured with
  the paper (`add_layers` in board.py, `Layered` in Board.tsx).
- Modern look for current events (`era_look` in the film config; works with any edit): `eras()` in board.py tags each
  line past or present from the narration's years (a photo's caption year is ignored; headlines and charts add their
  dates). The past keeps the paper look; in the present a photo lands in black and white, turns to colour and grows to
  fill the frame (`NowPhoto`), headlines and charts become modern cards (`NowHead`, `NowChart`), build-up photos turn to
  colour once landed, and new cut-outs are painted in colour.
- Vox motion & story (`vox` in the film config; stacks on any edit and on the modern look): the outline and writer follow
  the Vox shape (hook and one central question in the first 30 s, a simple answer, context and mechanism, why it matters
  now, a recap); on screen, shots overlap by 9 frames and flow into each other (`Flow`: a pan across the same board, a
  zoom through into a new one), every held shot drifts slowly, graphics step "on threes" (10 fps), a quoted person gets a
  lower third the first time they speak, headlines get a marker sweep, and a collage background assembles itself the
  first time it appears (`plate_pieces` in board.py finds its objects with Gemini; `Assemble` flies them in).
- Vox editorial (`edit: "editorial"`, `editorial.py` + `Editorial.tsx`): the modern Vox look for present-day lines, the
  build-up paper pages for history (by `eras`). Per line the director picks a layout: portrait (a named person cut out of
  their real photo by `tools/lift`, Apple Vision's subject lift on this Mac, black and white with a yellow sticker
  outline), circle (portrait or thing, tilted label, a year underlined in red), strips (a portrait torn into strips that
  assemble; once a chapter), timeline (2-4 dated moments as photo cards), stack (2-4 real places or things with guide
  lines), headline (a real headline from the script as a clipping, its person beside it), or keep. Labels use the
  line's own words and numbers; every photo is a licensed Commons photo Gemini confirmed; a real person is never drawn.
- `hold_visuals` in a film's config stops it just before the pictures (script and voices kept), e.g. while an edit is built.
- A second language: `hinglish.py <slug>` dubs the finished board film line by line (numbers checked, same voice) and
  writes `board-hinglish-track.json`, the English timeline with each dubbed line fitted into its slot; render it with
  `--codec=aac` for a YouTube audio track that stays in sync with the English video.

## Files
- `doc.py`: the pipeline (`Ctx` holds the redoable units: `write_act`, `paint_scene`, `record`, `record_scene`), `film()`,
  and `task()` for single edits.
- `cost.py`: the cost ledger (`public/<slug>/cost.json`): every paid call priced from Google's reported usage.
- `linkread.py`: the safety harness for pasted links.
- `motion.py`: the motion director, Veo image-to-video, parallax layers.
- `formats.json`: narration presets (exam-ready co-hosts, documentary narrator, story cast, interview).
- `voices.py`: records every Gemini voice reading the same lines, for the picker.
- `sfx.py`: synthesised sound effects and the ambient bed.
- `src/doc/Doc.tsx`: the film renderer. `src/explainer/`: collage primitives and red-string diagrams.
