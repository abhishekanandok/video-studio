"""Video Studio tables. Separate from the Tayyari study app: only films and settings live here."""

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)


class Film(Base):
    """A documentary made in the Studio. Assets and a live status.json live in video/public/<slug>/."""

    __tablename__ = "films"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    # films copied from Tayyari keep the id of the lesson they were made from (informational only: no lessons here)
    lesson_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    kind: Mapped[str] = mapped_column(String(10), default="studio")  # studio | lesson
    config: Mapped[dict] = mapped_column(JSON, default=dict)  # everything doc.py needs; see video/doc.py
    minutes: Mapped[int] = mapped_column(Integer, default=15)
    format: Mapped[str] = mapped_column(String(20), default="exam")  # exam | documentary | story (video/formats.json)
    premise: Mapped[str] = mapped_column(Text, default="")
    voices: Mapped[dict] = mapped_column(JSON, default=dict)  # {role: Gemini voice}
    pid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Skill(Base):
    """A skill in the crew's Skill Lab (a reusable way of putting an idea on screen). Everything about it lives in data:
    name, kind, status (idea | approved | built), the spec, examples, sources and the team's discussion. Example images
    live in video/public/skills/<id>/."""

    __tablename__ = "skills"
    id: Mapped[int] = mapped_column(primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
