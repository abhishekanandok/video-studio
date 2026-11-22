"""Video Studio API: documentary films and cinema shots, nothing else."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.argon_api import router as argon_router
from app.api.audio import router as audio_router
from app.api.brainstorm import router as brainstorm_router
from app.api.films_api import router as films_router
from app.api.vskill_chat import router as vskill_chat_router
from app.api.vskills import router as vskills_router
from app.api.slideskills import init_subjects, router as slideskills_router
from app.api.picturerules import router as picturerules_router
from app.api.cinema import router as cinema_router
from app.api.crew import router as crew_router
from app.api.skills import router as skills_router
from app.api.notes import router as notes_router
from app.api.studio import PUBLIC as STUDIO_PUBLIC
from app.api.studio import VIDEO as STUDIO_VIDEO
from app.api.studio import router as studio_router
from app.config import settings
from app.db import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    init_subjects()
    yield


app = FastAPI(title="Video Studio", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_url, "http://localhost:3030", "http://127.0.0.1:3030", "http://localhost:3031", "http://127.0.0.1:3031"],
                   # the frontend opened from another computer on the home network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
                   allow_origin_regex=r"http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):3030",
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(studio_router, prefix="/api")
app.include_router(cinema_router, prefix="/api")
app.include_router(notes_router, prefix="/api")
app.include_router(crew_router, prefix="/api")
app.include_router(skills_router, prefix="/api")
app.include_router(audio_router, prefix="/api")
app.include_router(slideskills_router, prefix="/api")
app.include_router(picturerules_router, prefix="/api")
app.include_router(brainstorm_router, prefix="/api")
app.include_router(argon_router, prefix="/api")
app.include_router(films_router, prefix="/api")  # the film pipeline with the storyboard gate (ADR 0013)
app.include_router(vskill_chat_router, prefix="/api")  # before vskills: /vskills/chat is not a skill id
app.include_router(vskills_router, prefix="/api")
os.makedirs(os.path.join(STUDIO_VIDEO, "out"), exist_ok=True)
os.makedirs(STUDIO_PUBLIC, exist_ok=True)  # git ignores it: a fresh clone has no public/ yet
app.mount("/studio-assets", StaticFiles(directory=STUDIO_PUBLIC), name="studio-assets")
app.mount("/studio-out", StaticFiles(directory=os.path.join(STUDIO_VIDEO, "out")), name="studio-out")


@app.get("/api/jobs")
def jobs():
    """The UI's background-task tray polls this; films report their own progress, so there are no queued jobs here."""
    return []


@app.get("/health")
def health():
    return {"ok": True}
