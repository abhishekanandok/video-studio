"""One film on the GPU at a time (the creator, 2026-10-11: with two or three films running together, Windows crashed
with bugcheck 0x7E; Whisper loaded onto the 8 GB card while another film's Qwen-Image picture was being drawn).

A machine-wide lock on a file: each GPU step (a Qwen / Wan picture, Whisper, a render) takes it and waits while
another film holds it. Windows lets go of the lock when a process ends, so a crashed film never blocks the others.
Re-entrant within one process (a render that draws a picture still holds it once)."""
import contextlib
import msvcrt
import os
import threading
import time

PATH = os.environ.get("VIDEO_STUDIO_GPU_LOCK", r"D:\video-studio-work\gpu.lock")
on_wait = None  # set by the film's process: called once while it waits (to show "waiting for the GPU")
_held = threading.local()
_mutex = threading.Lock()  # threads of one process (a render's parallel encodes) share the process's hold


@contextlib.contextmanager
def gpu(what: str = ""):
    if getattr(_held, "n", 0):
        _held.n += 1
        try:
            yield
        finally:
            _held.n -= 1
        return
    with _mutex:
        os.makedirs(os.path.dirname(PATH), exist_ok=True)
        fh = open(PATH, "a+")
        told = False
        while True:
            try:
                fh.seek(0)
                msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
                break
            except OSError:
                if not told and on_wait:
                    try:
                        on_wait(what)
                    except Exception:
                        pass
                    told = True
                time.sleep(3)
        _held.n = 1
        try:
            yield
        finally:
            _held.n = 0
            try:
                fh.seek(0)
                msvcrt.locking(fh.fileno(), msvcrt.LK_UNLCK, 1)
            finally:
                fh.close()
