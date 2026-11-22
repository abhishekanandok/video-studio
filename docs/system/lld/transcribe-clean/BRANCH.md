# BRANCH · transcribe-clean

> DRAFT — not verified by owner · Status: partly built (transcription exists; clean cut does not)

## Internal design
V1: transcribe the take with word timestamps (Roman + Devanagari), align it to the approved script when there is one
(so line ids map to time ranges), then cut silences > 0.6 s, fillers and repeated takes (adjustable).
Today: `video/audiofilm.py:135` `_transcribe` uses faster-whisper (`whisper_model=large-v3-turbo`) with
`word_timestamps=True` and `vad_filter`. No silence detection or cut list anywhere (only `cinema._trim`/`_bursts`,
`cinema.py:480-534`, for Veo audio).

## Leaves (build order)
1. transcribe: words + timestamps, both scripts · built (in audiofilm)
2. align-to-script: map words to script line ids · planned
3. detect-cuts: silences, fillers, repeated lines → cut list · planned
4. apply-cuts: FFmpeg edit list → clean take, timestamps remapped · planned

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| receives | record | take + script version | |
| sends | visuals | aligned transcript (line id → [start,end]) + cut list | times refer to the CLEAN take |

## OWNERSHIP CARD
- **Purpose:** know exactly when each line is said, and remove dead air.
- **Receives:** takes, script version.
- **Sends:** aligned transcript, cut list, clean take.
- **Promises:** word timing within ~0.2 s (to confirm); nothing the creator said on purpose is cut without a setting.
- **Breaks when:** heavy Hinglish code-mixing, noisy audio, the creator goes off-script.
- **Limits (measured):** unknown (transcription speed on CPU vs GPU)
- **Observe via:** status.json stage `transcribe`
- **Proven by (tests):** none
- **Open questions:** run Whisper on the render box or a hosted API?
