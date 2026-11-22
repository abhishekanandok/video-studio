# Documentary visual style

The house rules every archival documentary follows (agreed while making film3 and film4).

For archival documentaries (e.g. film3, "Will AI take your first job?"), the user wants a Vox paper-collage board look, set 2026-09-29:
- **Mix:** about 70% collage (sticky notes that split a fact into parts, text typed on a small torn scrap, red-string joins like the bus/star topology), about 20% pictures (real archival photos kept as found, plus generated collage cut-outs), about 10% newspaper (headlines, and rising or falling newspaper charts for dramatic numbers).
- **NO camera movement:** a piece zooms in once and then holds while the narrator reads. They found the earlier reading camera that panned and zoomed over text "irritating".
- Script and voices stay untouched when only visuals change.
- **Layered backgrounds (added 2026-09-30, from a Vox-style editing Short they shared), an OPTIONAL edit (`edit: "layered"`); the classic board stays the default and film3 stays classic:** never a flat colour behind content. Use a faint montage of subject pictures, tinted with blacks lifted to dark grey, whites soft, and paper texture on top.
- **Build-up edit (added 2026-09-30, from frames of a Short they shared), OPTIONAL (`edit: "build"`):** each line's page fills piece by piece. Photos, cut-outs, stamped labels and notes fly in from an edge and land on the exact spoken word that names them. They value objects moving in sync with the audio as memorable and engaging.
- **Modern look for current events (added 2026-09-30), OPTIONAL (`era_look`):** the past keeps the old paper/B&W look. Present-day lines get colour: photos land B&W, turn colour, then zoom to fill the frame; headlines and charts become modern cards. The user asked for this for current documentaries, and it relaxes the no-camera-move rule for photos only.
- **Vox motion & story (added 2026-09-30, from two Vox-breakdown transcripts they shared), OPTIONAL (`vox`), stacks on the modern look:** hook, central question, answer, mechanism, why now, recap. Seamless pan/zoom transitions, constant drift, graphics on threes, lower thirds, and marker sweeps on headlines.
- **Pictures must be precise to the frame (2026-09-30):** every picture shows exactly what the spoken words name, never a random or generic image. A named real person, company, place or product gets its real licensed Wikimedia Commons photo, checked by Gemini (`build.py` "real" pieces). An AI likeness of a real person is never made. Generated cut-outs are for objects and scenes, and are repainted if Gemini says they do not show what was asked.
- Collage assembly should be paced with a beat between pieces, not thrown on at once.
- **Vox editorial (skill 6, added 2026-09-30, from 8 reference images), an edit:** the modern Vox look for present-day lines (white grid paper, real people cut out of their real photos with a yellow sticker outline, highlighter labels, arrows, circle portraits, torn-strip portraits, timelines, photo stacks, clippings); history keeps the paper look. The agent picks the layout per frame, and they want different animations on different frames. Film4 uses it.
- **Hard rules (2026-09-30, after film4's first cut; the user was frustrated by repetitive, text-poor frames):**
  - No photo appears twice in a film (`board.once`, plus a shared used-list in the finders).
  - Paper is only for the past; present-day frames use the modern grid.
  - Every picture has a caption. Stamped numbers say what they count. Quotes always appear with the speaker's real photo. A rise or fall is drawn (the trend piece).
  - One consistent bullet card (white, yellow dots, dotted rules) wherever the information matters.
  - Varied transitions (pan, zoom, zoom-out reveal, rise, whip), never repeated back to back. Layout caps per chapter (1 stack, 2 circles, 1 strips).
  - No logos, seals or screenshots as photos.
  - Every documentary opens with a 1-2 minute cold open (a real scene, the stakes, the central question), then the title card, then chapter 1.
  - "Humans need a kick to watch the next second."
- **Pacing rules (2026-10-01, from Vox/explainer research the user asked for; the middle of film4 felt slow, the voice rushed):**
  - Something lands about every 2-3 s, and each bullet appears on its own spoken words ("voice leads visuals").
  - Bullets only for lists, comparisons or several facts, max 6 key words, never half-sentences. A word page always also has a picture.
  - Narration at most 1.1x speed (130-150 wpm), with breaths between lines.
  - No repeated quote. A quote with no face found goes to a full build page (quote, photo, bullets), never a plain scrap.
- **Length (2026-10-01):** aim for about 30 minutes; long films "worsen the feeling". Trim at most 5 minutes, and only clearly weak or repeated lines. Never cut something significant (a key reveal, a vivid fact, either side of an argument). A film may run slightly long instead.
- Mix raw full-screen photos (the "scene" layout) with the paper looks according to the frame's context. No hard rule.
- When they share a new editing technique, ADD it as an extra, selectable edit with a demo image in the Studio. Never change or remove the existing edit, and never re-render finished films with it.

- **Creator control (2026-10-01):** they demand full control over every scene/line in the Studio (words, layout, picture, direction, skip) and got angry when the UI seemed to lose it. Never remove controls, and keep per-line edits in edits.json, applied on the next run.

- **Approved cut (2026-10-01):** film4 v4 (35:43) is the version they love ("this is insane"). It uses the editorial and build edits with scenes, word-timed pieces, the 1.1x voice, a picture on every page, and real Commons photos instead of cut-outs. Treat it as the reference for future films.

**Why:** they judged the dark archival cut "too generic and simple", and the moving camera irritating.

**How to apply:** use board.py plus the Remotion "Board" composition (the default in archivedoc). Keep every number checked against the line. Related: [[lesson-style-preference]], [[design-language-preference]], [[exam-prep-agent-project]].
