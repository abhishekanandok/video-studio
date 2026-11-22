# BRANCH · record

> DRAFT — not verified by owner · Status: partly built (upload exists for audio films; teleprompter does not exist)

## Internal design
V1: two ways in. (a) **Teleprompter**: the browser shows the approved script, scrolls at the speaker's pace, shows the
visual coming up for each line, records camera+mic / audio only / screen (MediaRecorder), lets the creator retake one
line, and uploads takes resumably. (b) **Upload**: an existing recording (≤ 60 min, 4 GB). Optional (P1): AI voice reads
the script instead.
Today: `backend/app/api/audio.py:88` `POST /api/audio/films` takes a multipart audio file + up to 6 guide images
(no size limit, `audio.py:113`; images read whole into memory, `audio.py:121`), saves it under `video/public/<slug>/`
and spawns `audiofilm.py --stage plan`.

## Leaves (build order)
1. upload-resumable: chunked, resumable upload to storage with size/type checks · planned (today: one multipart POST)
2. teleprompter-ui: script view, pace follow, upcoming-visual hint · planned
3. browser-capture: MediaRecorder camera/mic/screen, take management, single-line retake · planned
4. take-handoff: take + script version → transcribe-clean job · planned
5. ai-voice (P1): TTS read of the approved script (reuse `pipeline.speak`) · partly built

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| receives | plan-script | approved script version | records against exactly one script version |
| sends | transcribe-clean | raw take file(s) + script version + take/line markers | a take is uploaded completely before the job starts |

## OWNERSHIP CARD
- **Purpose:** get the creator's own voice and face onto the platform with the least effort.
- **Receives:** approved script; camera/mic/screen streams or a file.
- **Sends:** takes + script version.
- **Promises:** a dropped network does not lose a take; uploads resume over 4G (PRD access requirement).
- **Breaks when:** browser lacks MediaRecorder codec; tab closed mid-upload; 4 GB file into a multipart POST.
- **Limits (measured):** unknown
- **Observe via:** upload progress events (planned), job status.
- **Proven by (tests):** none
- **Open questions:** record locally then upload, or stream chunks while recording?
