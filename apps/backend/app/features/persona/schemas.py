from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    lang: str = "en"


class PersonaChatQuotaResponse(BaseModel):
    remaining_questions: int
    reset_at: datetime | None = None


class AskResponse(BaseModel):
    answer: str
    quota: PersonaChatQuotaResponse


class PersonaChatMessageResponse(BaseModel):
    message_id: int
    role: Literal["user", "assistant"]
    lang: str
    content: str
    created_at: datetime


class PersonaChatHistoryResponse(BaseModel):
    messages: list[PersonaChatMessageResponse]
    quota: PersonaChatQuotaResponse


class PersonaChatResetResponse(BaseModel):
    session_id: int
    quota: PersonaChatQuotaResponse
