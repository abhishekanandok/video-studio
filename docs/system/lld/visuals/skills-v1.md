# V1: the educational creator's flow and the Skills section

Status: DRAFT for Raushan's review (2026-10-23). Scope: V1, educational creators (teachers, tutors, exam-prep channels)
making lessons from their own laptop. Audio first: the creator's own voice (uploaded or recorded). AI voice is a
fallback; video upload and AI avatar come later.

---

## 1. The flow, step by step (each step is a gate the creator can see, change and approve)

| # | Step | What the creator does | What the agents do | Gate |
|---|---|---|---|---|
| 1 | **Brainstorm** | Says what they want to teach, to whom, how long | Asks short questions until the lesson is clear (topic, class/exam, length, language) | brief |
| 2 | **What you know** | Pastes notes, facts, a book chapter, links, or says "I teach this from NCERT Class 10, ch. 3" | Reads it all. **The creator's facts are trusted as given: never re-verified** | sources |
| 3 | **Tone** | Picks one of 3 recommended tones, or describes their own | Recommends tones from the audience and topic (e.g. "friendly elder sibling", "exam-focused crisp", "story-first") | tone |
| 4 | **Skills** | Clicks 1-5 skills to combine, or "make a skill for this video" (section 4) | Shows each skill as a 5-second sample on **their** topic | skills |
| 5 | **Research (only if needed)** | Nothing, or "find more around this" | Only when the creator gave no facts, or asked for more: **5-10 facts**, each answering a question the lesson raises. Never 300 | facts |
| 6 | **Script** | Reads it **line by line**, edits any line, sees the read-aloud time per line and in total | Writes to the word budget (section 2) in the chosen tone, from the creator's material first | script |
| 7 | **Scene plan** | Sees every scene (section 6): what is on screen, how many pictures, which skill, background, transition. Changes any of it | Plans scenes from the script and the chosen skills | scenes |
| 8 | **Voice** | Records off the teleprompter, or uploads audio | **Enhances the voice** (noise removal, levels, silences trimmed), transcribes it with word times, matches it to the script | voice |
| 9 | **Mismatch help** | For each line said differently from the script: keep what was said (the script text updates) or re-record that line | Shows the differences line by line | voice |
| 10 | **Build and render** | Watches each scene as it is built; flags a scene with a note | Places every visual on the exact word it belongs to; renders | final |

Rules for the agents:
- **The creator first.** Research runs only to fill a gap. Asked for more, it searches around the creator's facts, never
  away from them.
- **Nothing is generated twice.** A changed line redoes only that line's scene, voice slice and render part.
- **Every step is visible** (the step, what it is doing, for how long). Never a stale or vague message.

**Audio, exactly:** the creator's file is cleaned (noise reduction, high-pass, loudness to -16 LUFS, long silences trimmed).
A **16 kHz mono** copy feeds transcription and word timing (Whisper's native rate). The **video's soundtrack is rendered
at 48 kHz** from the cleaned recording: 16 kHz would sound muffled, like a phone call. *To confirm with Raushan.*

---

## 2. How many words: the pace budget

Spoken lessons in Hinglish/English run about **130-150 words a minute** (calm teaching ~130, energetic explainer ~150,
Shorts ~160). The writer is given a word budget and a hard maximum. A line is one breath: **8-18 words**.

| Length | Words (at 140 wpm) | Shape |
|---|---|---|
| **1 minute** | **~140 (130-150)** | Hook 20-25 words · one idea explained 90-100 words · takeaway 15-20 words. **No chapters.** |
| 3 minutes | ~420 | Hook 40 · 2 short parts of ~170 · recap 40 |
| 5 minutes | ~700 | Hook 60 · 3 parts · recap + one exam question |
| 10 minutes | ~1,400 | Hook 100 · 4-5 parts · recap + practice |

Checks: the script's spoken length is shown line by line (words ÷ 2.33 = seconds). Over budget by more than 10%, the
writer must cut; the creator sees it before recording.

**The script must sound like a teacher, not a fact list.** The writer follows explainer craft: open with a question or
a scene the student knows; one idea per line; short spoken sentences; an example before the definition; at most one
number per line; a pause after the key idea; end with the takeaway and what to remember for the exam. A study of good
explainer scripts (books on scriptwriting for video, and how strong education channels structure theirs) goes into the
writer's instructions before V1 ships.

---

## 3. What a skill is (the format)

A skill is **not a theme or a prompt**. It is a written spec, a small "visual grammar", that the scene planner must
follow. Every field below is concrete and checkable. Code renders it; the model only fills it in.

```yaml
name: Number moments
kind: moment            # look (one per video) | text | moment (several) | audio
for: "any line that hinges on a figure: a count, a %, money, a date gap, a rank"

when:                   # what in the script triggers it (the planner looks for these)
  - a number is said (₹, %, crore, lakh, million, a count)
  - two numbers are compared ("from X to Y", "X vs Y")

on_screen:              # what appears, built from the line itself
  text: key_words       # none | key_words | full_captions | bullets
  max_words: 6
  blocks: [counter, compare_cards, bar, timer]
  highlight: lime_marker        # how the key word is marked

background:             # how the backdrop looks and changes
  base: skill           # skill (the look's ground) | topic | creator_image | plain
  topic_rule: "tint the ground with the chapter's colour"   # how it adapts to the topic
  changes: per_chapter  # never | per_chapter | per_scene | on_keyword

stickers:               # small decorations
  source: noto_animated # noto_animated (free Lottie) | creator_upload | drawn_in_style | none
  pick: "what the line literally talks about (money, rocket, lab)"
  max_per_scene: 2
  place: margins        # margins | near_block | corners

motion:
  enter: pop            # pop | slide | draw | type
  camera: cut           # cut | pan_zoom_canvas (one board, the camera moves between blocks)
  transition: soft_zoom # cut | drift | soft_zoom | rise | wipe
  timing: on_word       # the block lands on the word that says it (from the voice's word times)
  density: "something new at least every 3 s"

sound: { sfx: off, music: off }

guardrails:             # what is checked on every scene
  - numbers shown exactly as said
  - nothing covers the on-screen text
  - at most 2 blocks on screen at once

examples:               # 2-3 sample lines and the scene each becomes (rendered on save)
  - "41 mein se 58 compounds ban gaye" -> counter "41 / 58" + label "compounds made"
```

**How the creator changes the background, stickers or anything else:** every field above is a setting on the skill's
page, in plain words ("Background: changes every chapter, tinted to the topic" · "Stickers: animated emoji, 2 per
scene, in the margins" · "Text on screen: key words only"). They can also say it in a sentence ("use my school's logo as
the background", "add a meme reaction after every surprising fact"), and the agent updates the spec, re-renders the 3
samples and shows the change. Per video, the topic fills the open parts: "topic-tinted background" becomes leaf-green
graph paper with chloroplast doodles for *Photosynthesis*, and a map-blue ground for *Monsoon*.

**Combining skills:** one **look** (the base), plus any **text** skill, plus several **moment** skills, plus the
**audio** skill. When two moment skills match the same line, the more specific one wins (a place name → Map beats
Headline), and the creator can pin a skill to a scene in the scene plan.

---

## 4. Making a skill on the go

When the creator says "make a skill for this video", or none of the skills fit:

1. **Show me or tell me.** Paste a video link, screenshots, or a script you like, or describe it in words.
2. **Pick what is close.** We show 3-4 sample scenes from the skills we have, built on *their own* script. They pick
   the nearest one, which becomes the base the new skill extends.
3. **Five short questions** (one tap each, with "other" to type):
   - Text on screen: none · key words · everything I say · bullet points
   - Background: one look · changes per chapter · changes with the topic · my own image
   - Between scenes: hard cut · smooth move across one board · zoom · slide
   - What to show: numbers big · diagrams and flows · real photos · maps · memes and reactions · stickers
   - Pace: calm (a new thing every 5 s) · normal (3 s) · fast Shorts (1.5 s)
4. **The agent writes the spec** (section 3) and **renders 3 scenes from their script** with it.
5. **They react** ("bigger text", "less stickers", "add a meme after the twist"). The agent edits the spec and re-renders,
   as many times as needed. Saved, it appears in their Skills with its samples.

This reuses the slide-skill machinery that already exists (`video/slideskill.py`): a spec the model designs and code
checks, a rendered sample, creator feedback, and `extends` to build on a parent skill.

---

## 5. The five V1 skills (education)

| # | Skill | Kind | What it does | Built from |
|---|---|---|---|---|
| 1 | **Board explainer** | look | Bold box cards with hard ink shadows, sticky notes with tape, a lime highlighter, paper grounds that change per chapter. The signature look | the UPI demo (`src/upidemo`, `src/scenes`) |
| 2 | **Key-word captions** | text | The words being said appear on screen word by word; the key term is marked in lime the moment it is spoken | `Words` + word times from the voice |
| 3 | **Numbers that land** | moment | Counters, compare cards, bars and timers: the figure counts up exactly when it is said | `number`, `compare`, `timer` templates |
| 4 | **Process and flow** | moment | Steps, cycles, cause → effect, one hub and its parts: boxes appear step by step as the teacher names each one | `flow`, `hub`, `list` templates |
| 5 | **Map and place** | moment | For places, rivers, borders, routes: a real map, the camera flies there, the border draws, pins drop on the word | the geography engine (`audiofilm.geo_*`, `Geography.tsx`) |

Always on (not counted as a skill): **Your voice, cleaned** (section 1, audio). Next candidates after V1: Meme reactions,
Diagram drawing (formula triangles, labelled figures), Timeline, Quote cards, Kraft-paper history board.

---

## 6. The scene plan screen (the Tayyari CS Studio flow, in this UI)

The script, act by act; inside each act, **scene cards in order**. Each card shows:
- the line(s) it covers and its length in seconds (from the voice, or estimated before recording);
- **which skill** drives it, and the template;
- **what is on screen**: the blocks with their words ("counter: 41 / 58 · compounds made"), the stickers;
- **pictures**: how many, where each comes from (creator upload · Wikimedia · drawn), and a thumbnail;
- **background** and **transition** in;
- buttons: **Play scene** · **Edit** (change any of the above in words or by hand) · **Redo** · **Pin a skill**.

While building, each scene card fills in live (planned → pictures found → built → rendered), with what it is doing
right now.

---

## 7. Open questions for Raushan

1. Audio rate: 16 kHz for transcription and 48 kHz for the final soundtrack (recommended), or truly 16 kHz output?
2. Is "Map and place" in V1, or swap it for "Meme reactions"?
3. Skill pricing: are skills free, or part of the ₹199 per video?
