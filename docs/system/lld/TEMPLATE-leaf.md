# LEAF · <branch> / <leaf>

> DRAFT — not verified by owner · Status: built | planned

## Files and functions
- `path/to/file.py:line` `function()`: what it does

## Data model
Tables, columns, files and their shapes that this leaf reads or writes.

## Walkthrough
The request or job, step by step (a mermaid sequence diagram if it helps).

## Concurrency and idempotency
What happens if it runs twice, or two at once? What makes a retry safe?

## Errors and timeouts
Each external call: its timeout, its retry, and what the caller sees on failure.

## Tests that prove it
- `tests/...::test_name`: what it proves
