"""Writes src/argon/lib/catalog.ts: every motion and block in the motion library (src/argon/lib/*.tsx), with its group,
what it does (its doc comment) and the props it takes (from its type), so the agent knows what it may choose and change.

    python catalog.py          # run it after adding or changing a motion or block

It reads the code, so the catalogue can never say something the code does not do."""

import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, "src", "argon", "lib")
FILES = ["motion.tsx", "motion-b.tsx", "motion-c.tsx", "motion-d.tsx", "cards.tsx", "creatures.tsx", "people.tsx", "blocks-a.tsx", "blocks-b.tsx", "blocks-c.tsx", "blocks-d.tsx", "blocks-e.tsx", "blocks-f.tsx", "blocks-g.tsx", "blocks-h.tsx", "grown.tsx", "style.tsx"]
LAYER = {"motion.tsx": 1, "motion-b.tsx": 1, "motion-c.tsx": 1, "motion-d.tsx": 1, "cards.tsx": 1, "creatures.tsx": 1, "people.tsx": 1, "style.tsx": 0}  # the grammar, cards and creatures fit every look
SKIP = {"useIn", "makeMap", "shapePoints", "curve", "Tile"}  # helpers, not things to put on screen


def type_literal(s: str, start: int) -> str:
    """the `{ ... }` type that begins at s[start] (balanced braces)"""
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start + 1:i]
    return ""


def props_of(t: str) -> str:
    """'a?: number; b: string' -> 'a?: number, b: string' (split at top-level ; only)"""
    out, depth, cur = [], 0, ""
    for i, ch in enumerate(t):
        depth += ch in "{([<"
        depth -= ch in "})]" or (ch == ">" and t[i - 1:i] != "=")  # the > of => closes nothing
        if ch == ";" and depth == 0:
            out.append(cur.strip()); cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return ", ".join(re.sub(r"\s+", " ", p) for p in out if p)


UNIONS: dict[str, str] = {}


def read_unions():
    """export type X = "a" | "b" (and LOOKS) from every file, to show a prop's allowed values"""
    for f in FILES:
        s = open(os.path.join(LIB, f)).read()
        for name, body in re.findall(r'export type (\w+) = ((?:"[^"]+"\s*\|?\s*)+);', s):
            UNIONS[name] = body.strip()
        m = re.search(r"export const LOOKS = \[([^\]]+)\]", s)
        if m:
            UNIONS["LookKind"] = " | ".join(x.strip() for x in m.group(1).split(","))


def expand(props: str) -> str:
    return re.sub(r"\b(" + "|".join(UNIONS) + r")\b", lambda m: UNIONS[m.group(1)], props) if UNIONS else props


def entries(path: str):
    s = open(path).read()
    heads = [(m.start(), (m.group(1) or m.group(2)).strip()) for m in re.finditer(r"/\* =+ ([^=:*]+?)\s*[:=]|/\* -+ ([^*:]+?)\s*[:-]", s)]
    group = lambda pos: next((h for p, h in reversed(heads) if p < pos), "")
    blocks = dict(re.findall(r'export const (\w+) = block\("\w+", (\w+)\);', s))  # Name -> NameView
    views = {v: k for k, v in blocks.items()}
    for m in re.finditer(r"/\*\*\s*((?:(?!\*/).)*?)\s*\*/\s*(export )?function (\w+)\s*\(\s*", s, re.S):
        name = m.group(3)
        if not m.group(2):  # a block's drawing: listed under the block's own name
            if name not in views:
                continue
            name = views[name]
        if name in SKIP or s[m.end()] != "{":
            continue
        destructure = type_literal(s, m.end())  # the { a = 1, parts = {} } pattern (balanced braces)
        after = m.end() + len(destructure) + 2
        rest = s[after:after + 4].lstrip()
        tpos = s.index(":", after) if rest.startswith(":") else -1
        tstart = s.index("{", tpos) if tpos >= 0 else -1
        props = expand(props_of(type_literal(s, tstart))) if tstart >= 0 and s[tpos + 1:tstart].strip() == "" else ""
        parts = []
        if name in blocks:  # every block takes parts and render; list the pieces it marks
            nxt = re.search(r"\n(?:export )?function |\nexport const ", s[m.end():])
            body = s[m.end():m.end() + nxt.start()] if nxt else s[m.end():]
            named = [a or b for a, b in re.findall(r'<(?:Svg)?Part name="([\w.]+)"|usePartValue\("(\w+)"\)', body)]
            parts = ["all"] + (["background"] if "<Background" in body else []) + list(dict.fromkeys(named))
            props = (props + ", " if props else "") + "parts?: { " + ", ".join(parts) + " }, render?: (s: { t, local, props }) => node"
        yield {"name": name, "group": group(m.start()).strip(), "does": re.sub(r"\s+", " ", m.group(1)), "props": props, "parts": parts}
    for m in re.finditer(r"export const (\w+) = (\w+);", s):
        yield {"name": m.group(1), "group": group(m.start()).strip(), "does": f"the same as {m.group(2)}", "props": f"(as {m.group(2)})", "parts": []}


def kinds(path: str, const: str):
    """the kinds of a MOVES-style table: name and what it does"""
    s = open(path).read()
    i = s.find(f"export const {const} = {{")
    if i < 0:
        return []
    block = s[i:s.find("} satisfies", i)]
    return [{"kind": k, "does": d} for k, d in re.findall(r'^\s+(\w+): \{ group: "\w+", does: "([^"]+)"', block, re.M)]


def main():
    read_unions()
    lib = []
    for f in FILES:
        for e in entries(os.path.join(LIB, f)):
            lib.append({"layer": LAYER.get(f, 2), "file": f, **e})
    moves = kinds(os.path.join(LIB, "motion.tsx"), "MOVES") + kinds(os.path.join(LIB, "motion-b.tsx"), "MOVES2")
    lines = [
        "/* written by video/catalog.py from the library's own code: do not edit by hand, run `python catalog.py` instead.",
        "   Every motion (layer 1) and block (layer 2) with its group, what it does and the props it takes; layer 0 is style.",
        "   catalogText() is the short form for the agent's prompt. */", "",
        "/** parts: the pieces of a block that can be swapped (parts={{ name: picture | node | (item, i, original) => node | null }}"
        ", or <Swap parts={{ \"Block.name\": … }}> from outside); \"all\" is the whole drawing, \"background\" a set's backdrop */",
        "export type LibEntry = { layer: 0 | 1 | 2; file: string; name: string; group: string; does: string; props: string; parts: string[] };",
        "export const LIBRARY: LibEntry[] = " + json.dumps(lib, ensure_ascii=False, indent=1) + ";", "",
        "/** the kinds <Move kind> (motion.tsx) and <Move2 kind> (motion-b.tsx) take */",
        "export const MOVE_KINDS: { kind: string; does: string }[] = " + json.dumps(moves, ensure_ascii=False) + ";", "",
        "/** the library as plain text, grouped, one line per entry: Name(props): what it does */",
        "export function catalogText(layer?: 0 | 1 | 2): string {",
        "  const out: string[] = [];",
        "  let last = \"\";",
        "  for (const e of LIBRARY) {",
        "    if (layer !== undefined && e.layer !== layer) continue;",
        "    const g = `LAYER ${e.layer} · ${e.group || e.file}`;",
        "    if (g !== last) { out.push(\"\", g); last = g; }",
        "    out.push(`${e.name}(${e.props}): ${e.does}`);",
        "  }",
        "  if (layer === undefined || layer === 1) out.push(\"\", \"<Move kind> / <Move2 kind>: \" + MOVE_KINDS.map((m) => `${m.kind} (${m.does})`).join(\"; \"));",
        "  return out.join(\"\\n\").trim();",
        "}",
    ]
    open(os.path.join(LIB, "catalog.ts"), "w").write("\n".join(lines) + "\n")
    print(f"{len(lib)} entries ({sum(e['layer'] == 1 for e in lib)} motions, {sum(e['layer'] == 2 for e in lib)} blocks, {sum(e['layer'] == 0 for e in lib)} style) and {len(moves)} move kinds")


if __name__ == "__main__":
    main()
