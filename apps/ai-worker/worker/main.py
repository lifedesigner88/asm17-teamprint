"""AI worker — polls capture_jobs table and runs persona extraction."""

from __future__ import annotations

import os
import secrets
import string
import time

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, select, update  # noqa: E402
from sqlalchemy.orm import Session, declarative_base, mapped_column, relationship  # noqa: E402
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, func, text  # noqa: E402
from sqlalchemy.orm import Mapped  # noqa: E402

from worker.graph import graph  # noqa: E402

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://persona:persona@localhost:5432/persona_mirror")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "5"))
_ID_CHARSET = string.ascii_uppercase + string.digits

engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
Base = declarative_base()


class CaptureJob(Base):
    __tablename__ = "capture_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    persona_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


def _generate_persona_id(db: Session) -> str:
    for _ in range(10):
        candidate = "".join(secrets.choice(_ID_CHARSET) for _ in range(6))
        if db.scalar(select(CaptureJob).where(CaptureJob.persona_id == candidate)) is None:
            return candidate
    raise RuntimeError("Failed to generate unique persona_id")


def process_one(db: Session, job: CaptureJob) -> None:
    print(f"[worker] processing job {job.id}")
    db.execute(update(CaptureJob).where(CaptureJob.id == job.id).values(status="processing"))
    db.commit()

    interview = job.payload.get("interview", {})
    state = graph.invoke({"interview": interview, "result": None, "error": None})

    if state["error"] or not state["result"]:
        print(f"[worker] job {job.id} failed: {state['error']}")
        db.execute(update(CaptureJob).where(CaptureJob.id == job.id).values(status="failed"))
        db.commit()
        return

    persona_id = _generate_persona_id(db)
    db.execute(
        update(CaptureJob)
        .where(CaptureJob.id == job.id)
        .values(status="done", result=state["result"], persona_id=persona_id)
    )
    db.commit()
    print(f"[worker] job {job.id} done → persona_id={persona_id}")


def poll_once(db: Session) -> None:
    job = db.scalar(select(CaptureJob).where(CaptureJob.status == "pending").limit(1))
    if job:
        process_one(db, job)


def run() -> None:
    print(f"[worker] starting — polling every {POLL_INTERVAL}s")
    while True:
        try:
            with Session(engine) as db:
                poll_once(db)
        except Exception as exc:  # noqa: BLE001
            print(f"[worker] error: {exc}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
