"""The motion library showcase (src/argon/gen/motion-library-1024): check its pictures, render it, list it in the app.

    python showcase.py            # check, render, list it right after the Apollo film
    python showcase.py --check    # only check the pictures and puppets
    python showcase.py --scene 13 # render one scene to out/showcase-scene-13.mp4 (a quick test)

The pictures and puppets live in public/ (not in git). A missing picture is looked for by name in the other films'
folders under public/argon and copied in; one that cannot be found is reported and the render does not start."""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SLUG = "motion-library-1024"
GEN = os.path.join(HERE, "src", "argon", "gen", SLUG)
FILMS = os.path.join(HERE, "public", "argon")
PICS = os.path.join(FILMS, SLUG, "pics")
STORY = "a-short-story-a-boy-goes-back-to-school--10232054"  # the boy and his mother come from this film (rigs.ts)
APOLLO = "the-final-13-minutes-of-the-1969-moon-la-1023210517"
NPX = shutil.which("npx") or "npx"


def wanted_pics() -> list[str]:
    """every picture name the scenes ask for, pic("x.png") or a name in a list"""
    names = set()
    for f in os.listdir(GEN):
        if f.endswith(".tsx"):
            names |= set(re.findall(r'"([\w-]+\.(?:png|jpg|jpeg|webp))"', open(os.path.join(GEN, f)).read()))
    return sorted(names)


def find_elsewhere(name: str) -> str | None:
    for root, _, files in os.walk(FILMS):
        if name in files and not root.startswith(os.path.join(FILMS, SLUG)):
            return os.path.join(root, name)
    return None


def check() -> bool:
    os.makedirs(PICS, exist_ok=True)
    ok = True
    for name in wanted_pics():
        if os.path.exists(os.path.join(PICS, name)):
            continue
        src = find_elsewhere(name)
        if src:
            shutil.copy2(src, os.path.join(PICS, name))
            print(f"copied {name} from {os.path.relpath(src, FILMS)}")
        else:
            print(f"MISSING picture: {name} (put it in {os.path.relpath(PICS, HERE)})")
            ok = False
    rigs = open(os.path.join(GEN, "..", STORY, "rigs.ts")).read()
    pieces = json.loads(re.search(r"= (\{.*\});", rigs).group(1))
    for who in ("boy", "mother"):
        d = os.path.join(HERE, "public", pieces[who]["dir"])
        for p in pieces[who]["pieces"].values():
            if not os.path.exists(os.path.join(d, p["file"])):
                print(f"MISSING puppet piece: {os.path.relpath(os.path.join(d, p['file']), HERE)}")
                ok = False
    print("all pictures and puppets found" if ok else "fix the missing files above, then run again")
    return ok


def render(comp: str, out: str) -> None:
    cmd = [NPX, "remotion", "render", os.path.join(GEN, "entry.ts"), comp, out, f"--concurrency={min(6, os.cpu_count() or 1)}", "--crf=20"]  # remotion refuses more than the cores
    print(" ".join(cmd))
    subprocess.run(cmd, cwd=HERE, check=True)


def list_in_app() -> None:
    """the app lists a folder of public/argon that has a plan.json, newest first: one second older than Apollo sits right after it"""
    d = os.path.join(FILMS, SLUG)
    json.dump({"title": "The Motion Library", "topic": "Every motion and block in the library", "showreel": True}, open(os.path.join(d, "plan.json"), "w"))
    open(os.path.join(d, "argon.log"), "w").write("[showcase.py] Rendering the film\nDONE\n")
    apollo = os.path.join(FILMS, APOLLO)
    if os.path.isdir(apollo):
        t = os.path.getmtime(apollo) - 1
        os.utime(d, (t, t))
        print("listed in the app, right after the Apollo film")
    else:
        print("listed in the app (no Apollo folder found, so it sits at the top)")


if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--check", action="store_true")
    a.add_argument("--scene", type=int)
    a = a.parse_args()
    if not check():
        sys.exit(1)
    if a.check:
        sys.exit(0)
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    if a.scene is not None:
        render(f"Scene{a.scene}", os.path.join(HERE, "out", f"showcase-scene-{a.scene:02d}.mp4"))
    else:
        render("ArgonFilm", os.path.join(HERE, "out", f"argon-{SLUG}.mp4"))
        list_in_app()
