# 0005. Gemini is the default model provider, wrapped with long retries

- **Status:** RECONSTRUCTED — reason inferred, owner to confirm
- **Tree level:** trunk (ai-clients)
- **Date:** 2026-10-22 (reconstructed)

## Context
Pipelines make hundreds of calls (text, structured, vision, image, TTS); rate limits and transient errors are common.
House rule: stable (non-preview) models only.

## Options
1. **Gemini default + OpenAI alternative, retry until success** (chosen): long jobs rarely die from a blip.
2. **Bounded retries with a per-job retry budget, then fail loudly**.
3. **Provider fallback chain** (Gemini → OpenAI) per call type.

## Decision
Option 1 (inferred), with a smart → fast fallback.

## Consequences
Outages look like a frozen job; cost and time are unbounded (RISKS T1–T3).

## How we verify
/break-it ai-clients: mock a 429 storm and a network drop; measure how long until anyone notices.
