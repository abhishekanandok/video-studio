"""Run the crew for one film until it reaches the next gate (or the end). State lives in Postgres (LangGraph checkpointer),
so a film can wait at a gate for days; the app reads public/<slug>/crew.json, a snapshot written after every step.

Run from backend/:
    .venv/bin/python ../video/crew/run.py --slug crew9                       # start, or carry on after a crash
    .venv/bin/python ../video/crew/run.py --slug crew9 --resume answer.json  # the human's answer at the waiting gate
"""

import argparse
import json
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crew.state import p, prepare, save_json  # noqa: E402  (sets up the import paths)

from langgraph.checkpoint.postgres import PostgresSaver  # noqa: E402
from langgraph.types import Command  # noqa: E402

from app.config import settings  # noqa: E402
from crew.graph import build_graph  # noqa: E402

DB = settings.database_url.replace("postgresql+psycopg://", "postgresql://")


def snapshot(slug: str, values: dict, waiting: dict | None, error: str | None = None) -> None:
    values = {k: v for k, v in values.items() if not k.startswith("__")}  # LangGraph adds __interrupt__ to the stream
    save_json(p(slug, "crew.json"), {**values, "waiting": waiting, "error": error})


def main(slug: str, resume: str | None) -> None:
    prepare(slug)
    conf = {"configurable": {"thread_id": slug}}
    with PostgresSaver.from_conn_string(DB) as saver:
        saver.setup()
        graph = build_graph().compile(checkpointer=saver)
        state = graph.get_state(conf)
        if resume:
            inp = Command(resume=json.load(open(resume)))
        elif state.values:
            inp = None  # carry on from the last saved step
        else:
            inp = {"slug": slug, "config": json.load(open(p(slug, "config.json"))), "approved": [], "history": []}
        try:
            for values in graph.stream(inp, conf, stream_mode="values"):
                snapshot(slug, values, None)
        except Exception as e:
            traceback.print_exc()
            snapshot(slug, graph.get_state(conf).values, None, f"{type(e).__name__}: {str(e)[:300]}")
            import doc
            doc.Status(p(slug)).update("failed", f"Stopped: {str(e)[:200]}")
            raise SystemExit(1)
        state = graph.get_state(conf)
        waiting = state.interrupts[0].value if state.interrupts else None
        snapshot(slug, state.values, waiting)
        import doc
        st = doc.Status(p(slug))
        if waiting:
            st.update("waiting", f"Waiting for you at the gate: {waiting['gate']}")
        elif not state.next:
            st.update("done", "Film approved and finished")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", required=True)
    ap.add_argument("--resume", default=None, help="a JSON file with the human's answer at the waiting gate")
    a = ap.parse_args()
    main(a.slug, a.resume)
