"""Pipeline processes on macOS and Windows: is one still running, stop one (and what it started).

On Windows `os.kill(pid, 0)` doesn't test a process, it terminates it, and there is no waitpid/killpg: hence this.
"""

import os
import signal
import subprocess
import sys

WINDOWS = sys.platform == "win32"


def alive(pid: int | None) -> bool:
    if not pid:
        return False
    if WINDOWS:
        import ctypes
        from ctypes import wintypes
        k32 = ctypes.windll.kernel32
        h = k32.OpenProcess(0x1000, False, int(pid))  # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return False
        try:
            code = wintypes.DWORD()
            return bool(k32.GetExitCodeProcess(h, ctypes.byref(code))) and code.value == 259  # STILL_ACTIVE
        finally:
            k32.CloseHandle(h)
    try:  # pipelines are our children: reap a finished one, or it lingers as a zombie that still "exists"
        if os.waitpid(pid, os.WNOHANG)[0] == pid:
            return False
    except ChildProcessError:
        pass  # started by an earlier backend process; fall back to a plain existence check
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    r = subprocess.run(["ps", "-o", "stat=", "-p", str(pid)], capture_output=True, text=True)
    return not r.stdout.strip().startswith("Z")


def stop(pid: int | None) -> None:
    """Stop a pipeline and everything it started (renders, ffmpeg)."""
    if not alive(pid):
        return
    try:
        if WINDOWS:
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
        else:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
        pass


def keep_awake(pid: int) -> None:
    """macOS: don't sleep while this pipeline runs (Windows: nothing to do here)."""
    if WINDOWS:
        return
    try:
        subprocess.Popen(["caffeinate", "-i", "-w", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         start_new_session=True)
    except OSError:
        pass
