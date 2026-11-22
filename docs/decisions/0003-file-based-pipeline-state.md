# 0003. Pipeline state lives in files; a file's existence means the stage is done

- **Status:** RECONSTRUCTED — reason inferred, owner to confirm
- **Tree level:** trunk (media-storage)
- **Date:** 2026-10-22 (reconstructed)

## Context
Each stage produces many assets (JSON, images, audio); re-running a failed film should not redo paid work.

## Options
1. **Folder per film, skip a stage if its output exists** (chosen): free resume, inspectable by hand.
2. **Content-addressed cache** (hash of inputs + config in the file name or a manifest): correct invalidation.
3. **DB rows per stage + object storage for blobs**: queryable, multi-machine.

## Decision
Option 1 (inferred).

## Consequences
Truncated files count as done; config changes don't invalidate; one machine only; static serving exposes everything
(RISKS D1, D2, S2).

## How we verify
/break-it: kill the process during `json.dump` of `plan.json`; rerun; observe.
