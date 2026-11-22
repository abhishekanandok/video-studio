#!/usr/bin/env bash
# PostToolUse hook: after Claude edits a file, run the checks for the part of the repo it touched.
#   backend/**.py  -> pytest (backend/tests) if tests exist, else a compile check of the file
#   video/**.py    -> compile check of the file
#   frontend/**.ts(x) -> TypeScript check of the frontend
#   video/src/**.ts(x) -> TypeScript check of the video project
# A failure exits 2 so Claude sees the output and has to deal with it.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FILE="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("tool_input") or {}).get("file_path",""))' 2>/dev/null)"
[ -z "$FILE" ] && exit 0
case "$FILE" in *.env|*.env.*|*/secrets/*) exit 0 ;; esac
REL="${FILE#"$ROOT"/}"
PY="$ROOT/backend/.venv/bin/python"

run() { # label, then the command
  local label="$1"; shift
  local out; out="$("$@" 2>&1)"; local code=$?
  if [ $code -ne 0 ]; then
    echo "[test-on-edit] $label FAILED for $REL" >&2
    echo "$out" | tail -40 >&2
    exit 2
  fi
  echo "[test-on-edit] $label ok ($REL)"
}

case "$REL" in
  backend/*.py)
    if [ -d "$ROOT/backend/tests" ]; then
      cd "$ROOT/backend" && run "pytest" "$PY" -m pytest -q -x
    else
      run "py_compile" "$PY" -m py_compile "$FILE"
    fi ;;
  video/src/*.ts|video/src/*.tsx)
    cd "$ROOT/video" && run "tsc (video)" npx --no-install tsc --noEmit -p . ;;
  video/*.py)
    run "py_compile" "$PY" -m py_compile "$FILE" ;;
  frontend/*.ts|frontend/*.tsx)
    cd "$ROOT/frontend" && run "tsc (frontend)" npx --no-install tsc --noEmit -p . ;;
esac
exit 0
