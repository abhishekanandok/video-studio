# Hero background video: Flow (Veo) prompts

The landing page already shows the product in motion in code (script, thumbnail, analytics, captions, dubbing,
clean cut, Shorts and the visual planner, cycling through five kinds of creator). A generated film adds the human,
cinematic layer underneath it. Drop the finished file at `frontend/public/landing/hero-bg.mp4`; the hero picks it up
automatically, at 45% opacity in soft-light over the teal sky, so the headline and cards stay readable. With no file,
nothing changes.

## What the research says to show

- 2026 SaaS heroes (Notion, Linear, Framer, Canva) show the **product in motion**, not stock footage: the visitor
  should understand what it does in a few seconds without pressing play.
- Background loops work best at **6–12 seconds**, silent, with no hard cut. Flow makes up to 8 s per clip; use
  **Frames** with the same first and last frame for a seamless loop, or extend a scene to ~12 s.
- For Drishya the message is: *any Indian creator, any kind of video, raw footage in → a video that explains out.*
  So the film should show **several kinds of Indian creator** (not only teachers), each with **visuals appearing
  around them** (that is the USP: we visualise, not just cut).
- Keep the **left half calm and darker** (the headline sits there) and the lower right quiet (the monitor sits
  there). Teal, white and lime palette so it blends with the page.

## Prompt A: the main loop (recommended)

> Cinematic slow lateral dolly, 8 seconds, 16:9, seamless loop. A soft-lit modern Indian creator studio at golden
> hour, teal and warm-white palette with small lime-green accents. Five Indian creators appear one after another in
> the same continuous space, each at their own desk: a young tech reviewer holding a smartphone, a finance creator
> beside a rising chart on a monitor, a home chef plating dal with steam rising, a teacher at a glass board, a fitness
> creator mid-stretch on a mat. Around each of them, clean floating 3D UI panels gently assemble in mid-air: a script
> with Hinglish lines, a flowchart drawing itself, word-by-word captions in Roman and Devanagari, a vertical 9:16
> Short, a retention graph. Panels are frosted white glass with soft shadows, rounded corners, lime highlights,
> no readable brand names or logos. Shallow depth of field, gentle film grain, natural skin tones. The left 45% of
> the frame stays softly out of focus and darker for text overlay. Camera ends exactly where it began. No text on
> screen, no logos, no watermark.

## Prompt B: abstract "visuals come alive" loop (works if faces feel distracting)

> 8-second seamless loop, 16:9, slow push-in. A calm teal sky gradient with soft volumetric clouds. Out of a single
> glowing waveform line in the centre-right, clean 3D shapes bloom and orbit slowly: a flowchart of rounded nodes, a
> bar chart rising, a speech-bubble caption strip in Devanagari-like glyphs, a film strip, a vertical phone frame, a
> small globe with Indian language glyphs. Clay-like matte materials in white, lime green and soft orange, gentle
> rim light, soft shadows. Left 45% of the frame empty sky for text. Smooth, unhurried motion, no camera shake. Last
> frame matches the first. No readable text, no logos.

## Prompt C: three 4-second beats (for a 12 s extended scene)

1. > Close-up, 4 s: an Indian creator's hands set a phone on a tripod in a sunlit room; a faint frosted-glass panel
   > with a waveform appears beside the phone. Teal and warm light, shallow depth of field.
2. > Medium shot, 4 s: the same room; frosted 3D panels float up around the creator: a flowchart drawing itself,
   > word-timed captions, a vertical Short. Slow orbit to the right.
3. > Wide shot, 4 s: the panels fly together into a glowing orange retro monitor on a white block (matching the
   > landing page), whose screen flickers on. Camera settles; final frame mirrors the first.

## Settings checklist

- 16:9, 1080p, 8 s (or extended to 12 s); export MP4 (H.264), aim for under 6 MB (re-encode with
  `ffmpeg -i in.mp4 -an -c:v libx264 -crf 28 -preset slow -movflags +faststart hero-bg.mp4`).
- No audio track is needed (the hero is muted).
- Check the first and last frames match before using it as a loop.
