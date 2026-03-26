from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db import Base


class TeamfitProfile(Base):
    __tablename__ = "teamfit_profiles"

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    completion_stage: Mapped[str] = mapped_column(String(20), nullable=False, default="step1")
    preferred_role: Mapped[str] = mapped_column(String(80), nullable=False)
    working_style: Mapped[str] = mapped_column(String(80), nullable=False)
    commitment_pace: Mapped[str] = mapped_column(String(80), nullable=False)
    interests: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    problem_focus: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    domains: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    tech_stack: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    impact_tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    mbti: Mapped[str | None] = mapped_column(String(8), nullable=True)
    mbti_axis_values: Mapped[dict[str, int] | None] = mapped_column(JSON, nullable=True)
    one_liner: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_input: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_json: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
