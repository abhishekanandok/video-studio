---
name: teach
description: Teach ONE concept or layer in depth, shown in this codebase, with docs, a book chapter and 2 quiz questions.
disable-model-invocation: true
argument-hint: <topic>
---

Teach exactly one topic: $ARGUMENTS. If it is too broad, say which single piece you will teach and why.

1. Start from the problem it solves: what goes wrong without it, in this system (Drishyya: FastAPI backend,
   Postgres, film jobs run as processes, Next.js frontend, Remotion renders).
2. Explain in natural paragraphs and simple words. No jargon without defining it the first time.
3. Show it in THIS codebase: real file paths and line numbers, and the exact lines that use it. If the codebase does
   not use it yet, say so and show where it would sit in the tree (trunk / branch / leaf).
4. Explain what the framework or library does underneath (e.g. what Uvicorn does before your handler runs).
5. Give the official documentation link(s) and one book chapter (DDIA, Google SRE book, Release It!, or similar),
   saying what to read it for.
6. End with 2 quiz questions. Do not give the answers; wait for Raushan's attempt, then correct.
7. Add the topic to the right place in KNOWLEDGE.md (trunk, branch or leaf) tagged [introduced] with one line of
   evidence ("taught on <date>, quiz pending"). Never set a higher status; only Raushan does that.

Keep each section short. One topic per run.
