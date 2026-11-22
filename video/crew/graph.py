"""The crew's graph (LangGraph). Eight steps, each owned by one agent, each checked by the Verifier, each stopped at a gate
where the human approves, edits or sends notes back.

    plan ─► verify ─► GATE ─► slides ─► verify ─► GATE ─► script ─► verify ─► GATE ─► voices ─► verify ─► GATE
         ─► direct ─► verify ─► GATE ─► pictures ─► verify ─► GATE ─► build ─► verify ─► GATE ─► final ─► GATE ─► end

- The Verifier sends a problem back to the owner on its own, up to 3 rounds; only what is still wrong after that goes to
  the human.
- A note at a gate goes back to that gate's owner; a note on a finished scene (build / final) goes to the Planner, which
  sends it to the one agent that owns the problem.
- Only what changed is redone: a step marks the scenes it changed, every later step redoes just those, and a gate with
  nothing new on it (already approved) lets the film pass without asking again.
"""

import json
import time

from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

import doc
import notes

from crew import director, planner, producer, searcher, verifier, writer
from crew.state import (STEPS, Crew, Say, finished, prepare, redo_everything_after, scene_keys, todo)

AUTO_FIX = {"plan", "slides", "script", "voices", "direct", "pictures"}  # the Verifier sends these back to the owner by itself
AUTO_ROUNDS = 3  # fix rounds per item before a problem is shown to the human (the user: "when the verifier flags it, just fix it")


def rounds(st: "Crew", step: str) -> dict:
    """How many automatic fix rounds each item of a step has had (older films stored a plain list = one round each)."""
    a = (st.get("auto") or {}).get(step) or {}
    return {k: 1 for k in a} if isinstance(a, list) else dict(a)
_say: dict[str, Say] = {}


def say(st: Crew) -> Say:
    if st["slug"] not in _say:
        _say[st["slug"]] = Say(st["slug"])
    return _say[st["slug"]]


def notes_for(st: Crew, step: str, keys: list[str]) -> dict:
    """The owner's to-do notes per key; a note on the whole step ("*") applies to every key."""
    fb = (st.get("feedback") or {}).get(step) or {}
    general = fb.get("*", "")
    return {k: " ".join(x for x in (fb.get(k, ""), general) if x) for k in keys if fb.get(k) or general}


# ---------- the steps (one owner each) ----------
def plan(st: Crew):
    if not todo(st, "plan", ["*"]):
        return {}
    prepare(st["slug"])
    s = say(st)
    fb = (st.get("feedback") or {}).get("plan") or {}
    note = "\n".join(f"- {k}: {v}" for k, v in fb.items())
    s("The Planner is reading the script and planning every slide", "plan")
    pl = planner.make_plan(st["config"], note, st.get("plan"))
    s(f"Plan: {len(pl['scenes'])} slides; {sum(1 for x in pl['scenes'] if x['fit'] == 'weak')} where Skill 1 is weak")
    weak = [{"key": x["key"], "focus": x["focus"], "weak_why": x["weak_why"]} for x in pl["scenes"] if x["fit"] == "weak"]
    ideas = st.get("skill_ideas") or []
    if weak and not ideas:
        s("The Searcher is researching online how good teachers show the weak scenes (ideas for a new skill)")
        ideas = searcher.skill_research(st["config"].get("subject") or "", weak)
    order = [x["key"] for x in pl["scenes"]]
    up = finished(st, "plan", ["*"], plan=pl, order=order, skill_ideas=ideas)
    up["dirty"] = {**up["dirty"], **redo_everything_after({**st, "dirty": up["dirty"]}, "plan")}
    return up


def slides(st: Crew):
    keys = todo(st, "slides", st["order"])
    if not keys:
        return finished(st, "slides", [])
    say(st)(f"The Writer is writing {len(keys)} slides", "slides", done=0, total=len(keys))
    cur = {k: v for k, v in (st.get("slides") or {}).items() if k in st["order"]}
    new = writer.write_slides(st["config"], st["plan"], keys, notes_for(st, "slides", keys), cur)
    return finished(st, "slides", keys, slides={**cur, **new})


def script(st: Crew):
    keys = todo(st, "script", scene_keys(st))
    if not keys:
        return finished(st, "script", [])
    s = say(st)
    s(f"The Writer is writing the narration for {len(keys)} scenes", "script", done=0, total=len(keys))
    cur = dict(st.get("script") or {})
    fb = notes_for(st, "script", keys)
    if "hook" in keys:
        cur["hook"] = writer.write_hook(st["config"], st["plan"], st["slides"], st["order"], fb.get("hook", ""), cur.get("hook"))
    rest = [k for k in keys if k != "hook"]
    if rest:
        cur.update(writer.write_scenes(st["config"], st["plan"], st["slides"], st["order"], rest, fb, cur))
    return finished(st, "script", keys, script=cur)


def voices(st: Crew):
    keys = todo(st, "voices", scene_keys(st))
    if not keys:
        return finished(st, "voices", [])
    s = say(st)
    names = ", ".join(f"{r['name']}: {r['voice']}" for r in st["config"]["roles"])
    s(f"The Producer is recording {len(keys)} scenes ({names})", "voices", done=0, total=len(keys))
    takes = {**(st.get("takes") or {}), **producer.record_many(st["slug"], st["config"], st["script"], keys, s)}
    speed = st.get("speed")
    if not speed or len(keys) == len(scene_keys(st)):  # kept once set, so one re-recorded scene doesn't re-render the film
        timed = [{"lines": st["script"][k]["lines"], "seconds": takes[k]["seconds"]} for k in scene_keys(st)]
        speed = doc.film_speed(timed, st["config"].get("pace") or "normal")
    return finished(st, "voices", keys, takes=takes, speed=speed)


def direct(st: Crew):
    keys = todo(st, "direct", st["order"])
    if not keys:
        return finished(st, "direct", [])
    say(st)(f"The Director is designing {len(keys)} scenes against the recorded voices", "direct", done=0, total=len(keys))
    cur = dict(st.get("direction") or {})
    cur.update(director.direct(st["slides"], st["script"], st["takes"], st["plan"], keys, notes_for(st, "direct", keys), cur))
    return finished(st, "direct", keys, direction=cur)


def pictures(st: Crew):
    want = [k for k in st["order"] if (st["direction"].get(k) or {}).get("picture")]
    pics = {k: v for k, v in (st.get("pictures") or {}).items() if k in want}  # a scene that no longer wants one drops it
    keys = todo(st, "pictures", want)
    fb = notes_for(st, "pictures", keys)
    s = say(st)
    made = []
    if keys:
        s(f"The Searcher is looking for {len(keys)} photos on Wikimedia Commons", "pictures", done=0, total=len(keys))
    for n, k in enumerate(keys):
        d = st["direction"][k]
        if k in pics and pics[k].get("want") == d["want"] and not fb.get(k):
            continue  # same photo wanted as before, no note on it: keep what was found and picked
        made.append(k)
        if "__draw__" in fb.get(k, ""):  # the human asked for a drawn picture instead
            s(f"{k}: the Producer is drawing it")
            drawn = producer.draw_picture(st["slug"], k, d["want"])
            pics[k] = {**pics.get(k, {"candidates": []}), "drawn": drawn, "pick": "drawn" if drawn else -1, "chosen": drawn}
            continue
        old = pics.get(k) if k in pics and pics[k].get("want") == d["want"] else None
        searches = d["searches"] or [d["want"]]
        if old and fb.get(k):  # sent back: nothing usable was found, so search with other words
            searches = searcher.other_searches(d["want"], old.get("searched", []))
        found = searcher.candidates(st["slug"], searches, {c["title"] for c in (old or {}).get("candidates", [])})
        pics[k] = {"want": d["want"], "searched": (old or {}).get("searched", []) + searches,
                   "candidates": (old or {}).get("candidates", []) + found, "pick": None, "chosen": None}
        s(f"{k}: {len(found)} free-licence photos found for \"{d['want']}\"", done=n + 1)
    return finished(st, "pictures", made, pictures=pics)


def build(st: Crew):
    s = say(st)
    pics = dict(st.get("pictures") or {})
    for k, v in pics.items():  # the Producer fetches the full-size photo the human picked
        if isinstance(v.get("pick"), int) and v["pick"] >= 0 and not (v.get("chosen") or {}).get("src"):
            c = v["candidates"][v["pick"]]
            pics[k] = {**v, "chosen": {**producer.full_picture(st["slug"], c["title"]), "title": c["title"]}}
    st = {**st, "pictures": pics}
    keys = todo(st, "build", scene_keys(st))
    if not keys:
        return finished(st, "build", [], pictures=pics)
    props = producer.scene_props(st)
    renders = {**(st.get("renders") or {}), **producer.render(st["slug"], props, keys, s)}
    return finished(st, "build", keys, renders=renders, pictures=pics)


def final(st: Crew):
    s = say(st)
    s("The Producer is joining the scenes (voices only, no music)", "final")
    video = producer.join(st["slug"], len(scene_keys(st)))
    s("Film ready for your final approval")
    return finished(st, "final", ["film"], video=video)


# ---------- the Verifier, after every step ----------
def check(step: str, st: Crew) -> dict:
    fresh = (st.get("fresh") or {}).get(step) or []
    if not fresh:
        return {}
    s = say(st)
    s(f"The Verifier is checking the {step}")
    if step == "plan":
        return verifier.plan(st["config"], st["plan"])
    if step == "slides":
        return verifier.slides(st["plan"], st["slides"], fresh)
    if step == "script":
        return verifier.script(st["config"], st["plan"], st["slides"], st["script"], fresh)
    if step == "voices":
        return verifier.voices(st["slug"], st["config"], st["script"], fresh)
    if step == "direct":
        return verifier.direct(st["slides"], st["script"], st["direction"], fresh)
    if step == "pictures":
        return verifier.pictures(st["slug"], st["pictures"], st["direction"], [k for k in fresh if not (st["pictures"][k].get("drawn"))])
    if step == "build":
        return verifier.build(st["slug"], producer.scene_props(st), fresh)
    return {}


def make_verify(step: str):
    def node(st: Crew):
        issues = check(step, st)
        fresh = (st.get("fresh") or {}).get(step) or []
        old = {k: v for k, v in ((st.get("checks") or {}).get(step) or {}).items() if k not in fresh and k != "*"}
        checks = {**(st.get("checks") or {}), step: {**old, **{k: v for k, v in issues.items() if v}}}
        verifier.save(st["slug"], checks)
        up = {"checks": checks, "pictures": st.get("pictures")} if step == "pictures" else {"checks": checks}
        tried = rounds(st, step)
        retry = [k for k, v in issues.items() if v and tried.get(k, 0) < AUTO_ROUNDS]
        if retry and step in AUTO_FIX:
            say(st)(f"The Verifier sent {len(retry)} back to the {planner_owner(step)} (fix round {max(tried.get(k, 0) for k in retry) + 1} of "
                    f"{AUTO_ROUNDS}): " + "; ".join(issues[retry[0]])[:120])
            fb = {**(st.get("feedback") or {}), step: {k: "THE CHECKER FOUND (fix exactly this, keep everything else): " + "; ".join(issues[k]) for k in retry}}
            dirty = {**(st.get("dirty") or {}), step: ["*"] if step == "plan" else retry}
            auto = {**(st.get("auto") or {}), step: {**tried, **{k: tried.get(k, 0) + 1 for k in retry}}}
            return Command(goto=step, update={**up, "feedback": fb, "dirty": dirty, "auto": auto})
        return Command(goto=f"gate_{step}", update=up)
    return node


def planner_owner(step: str) -> str:
    from crew.state import OWNER
    return OWNER[step].capitalize()


# ---------- the gates (the human) ----------
def make_gate(step: str):
    nxt = STEPS[STEPS.index(step) + 1] if step != "final" else END

    def node(st: Crew):
        fresh = (st.get("fresh") or {}).get(step) or []
        approved = list(st.get("approved") or [])
        if step in approved and not fresh:
            return Command(goto=nxt)  # nothing new here since the human approved it
        if step == "pictures" and not st.get("pictures"):
            return Command(goto=nxt, update={"approved": approved + [step], "history": (st.get("history") or []) +
                                             [{"at": time.strftime("%Y-%m-%d %H:%M"), "gate": step, "action": "auto", "notes": "No scene needs a photo"}]})
        ans = interrupt({"gate": step, "fresh": fresh}) or {}
        action, edits, nts, note = ans.get("action", "approve"), ans.get("edits") or {}, ans.get("notes") or {}, (ans.get("note") or "").strip()
        nts = {k: v.strip() for k, v in nts.items() if (v or "").strip()}
        hist = (st.get("history") or []) + [{"at": time.strftime("%Y-%m-%d %H:%M"), "gate": step, "action": action,
                                              "notes": {**nts, **({"*": note} if note else {})}, "edited": sorted(edits.get(_EDIT_FIELD.get(step, ""), {}) or [])}]
        up: dict = {"history": hist}
        st2 = {**st, **apply_edits(step, st, edits)}
        up.update({k: st2[k] for k in ("plan", "order", "config", "slides", "script", "direction", "pictures", "dirty") if k in st2})
        if action == "approve" and not (step == "voices" and edits.get("roles")):
            up["approved"] = sorted(set(approved) | {step})
            up["fresh"] = {**(st.get("fresh") or {}), step: []}
            return Command(goto=nxt, update=up)
        # sent back with notes
        if step == "voices" and edits.get("roles"):  # new voices: the Producer re-records everything
            up["dirty"] = {**st2["dirty"], "voices": "all"}
            up["speed"] = None
            return Command(goto="voices", update=up)
        if step in ("build", "final"):  # a finished scene: the Planner decides whose work must change
            desc = {k: (st["slides"].get(k) or {}).get("title", "cold open") for k in nts}
            items = planner.route(nts, desc)
            if note and not items:
                items = [{"key": k, "step": "script", "note": note} for k in scene_keys(st)]
            fb, dirty = dict(st.get("feedback") or {}), dict(st2["dirty"])
            for it in items:
                fb.setdefault(it["step"], {})[it["key"]] = it["note"]
                cur = dirty.get(it["step"], [])
                dirty[it["step"]] = cur if cur == "all" else sorted(set(cur) | {it["key"]})
            say(st)("The Planner routed your notes: " + "; ".join(f"{i['key']} → {i['step']}" for i in items)[:200])
            first = min((STEPS.index(i["step"]) for i in items), default=STEPS.index("build"))
            up.update(feedback=fb, dirty=dirty, routed=items)
            return Command(goto=STEPS[first], update=up)
        fb = dict(st.get("feedback") or {})
        fb[step] = {**nts, **({"*": note} if note else {})}
        dirty = dict(st2["dirty"])
        if step == "plan":
            dirty["plan"] = ["*"]
        else:
            keys = list(nts) if nts else (st["order"] if step in ("slides", "direct", "pictures") else scene_keys(st))
            dirty[step] = sorted(set(keys) - {"*"})
        auto = {**(st.get("auto") or {}), step: {k: v for k, v in rounds(st, step).items() if k not in nts}}
        return Command(goto=step, update={**up, "feedback": fb, "dirty": dirty, "auto": auto})
    return node


_EDIT_FIELD = {"plan": "scenes", "slides": "slides", "script": "script", "direct": "direction", "pictures": "picks"}


def apply_edits(step: str, st: Crew, edits: dict) -> dict:
    """The human's own edits at a gate. Anything edited is redone by every later step."""
    if not edits and step != "pictures":  # the pictures gate always settles the picks (the first passed photo by default)
        return {"dirty": dict(st.get("dirty") or {})}
    out: dict = {}
    changed: list[str] = []
    if step == "plan":
        pl = dict(st["plan"])
        if edits.get("title"):
            pl["title"] = edits["title"].strip()
        if edits.get("scenes") is not None:
            pl["scenes"] = [{**sc, "key": f"s{i:03d}", "section": (sc.get("section") or "").upper()[:40]} for i, sc in enumerate(edits["scenes"])]
            out["order"] = [x["key"] for x in pl["scenes"]]
        out["plan"] = pl
        if edits.get("roles"):
            out["config"] = {**st["config"], "roles": edits["roles"]}
        return {**out, "dirty": redo_everything_after(st, "plan")}
    if step == "slides":
        sl = dict(st["slides"])
        for k, v in (edits.get("slides") or {}).items():
            if k in sl:
                s = notes.clean_slide({"section": v.get("section") or sl[k]["section"], "title": v["title"], "bullets": v["bullets"]})
                sl[k] = {"section": s["section"], "title": s["title"], "bullets": s["bullets"]}
                changed.append(k)
        out["slides"] = sl
    if step == "script":
        sc = dict(st["script"])
        for k, v in (edits.get("script") or {}).items():
            if k in sc:
                lines = writer.fix_speakers(st["config"], [ln for ln in v.get("lines", []) if (ln.get("speech") or "").strip()])
                sc[k] = {**sc[k], **({"headline": v["headline"]} if k == "hook" and v.get("headline") else {}), "lines": lines}
                if k != "hook":
                    sc[k]["bullet_at"] = writer.tidy_bullet_at(sc[k].get("bullet_at", []), len(st["slides"][k]["bullets"]), len(lines))
                changed.append(k)
        out["script"] = sc
    if step == "voices" and edits.get("roles"):
        out["config"] = {**st["config"], "roles": edits["roles"]}
    if step == "direct":
        dr = dict(st["direction"])
        for k, v in (edits.get("direction") or {}).items():
            if k in dr:
                dr[k] = {**dr[k], **v}
                dr[k]["bullet_at"] = writer.tidy_bullet_at(dr[k]["bullet_at"], len(st["slides"][k]["bullets"]), len(st["script"][k]["lines"]))
                changed.append(k)
        out["direction"] = dr
    if step == "pictures":
        pics = {k: dict(v) for k, v in (st.get("pictures") or {}).items()}
        for k, v in pics.items():
            pick = (edits.get("picks") or {}).get(k, v.get("pick"))
            if pick is None:  # not chosen by the human: the first photo the Verifier passed
                pick = next((i for i, c in enumerate(v["candidates"]) if c.get("match")), -1)
            if pick != v.get("pick"):
                v["pick"], v["chosen"] = pick, (v.get("drawn") if pick == "drawn" else None)
                changed.append(k)
        out["pictures"] = pics
    dirty = dict(st.get("dirty") or {})
    for later in STEPS[STEPS.index(step) + 1:]:
        if later in dirty and dirty[later] != "all":
            dirty[later] = sorted(set(dirty[later]) | set(changed))
    out["dirty"] = dirty
    return out


def build_graph() -> StateGraph:
    g = StateGraph(Crew)
    steps = {"plan": plan, "slides": slides, "script": script, "voices": voices, "direct": direct, "pictures": pictures,
             "build": build, "final": final}
    for name, fn in steps.items():
        g.add_node(name, fn)
        g.add_node(f"gate_{name}", make_gate(name))
        if name == "final":
            g.add_edge(name, "gate_final")
        else:
            g.add_node(f"verify_{name}", make_verify(name))
            g.add_edge(name, f"verify_{name}")
    g.add_edge(START, "plan")
    return g
