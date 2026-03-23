from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.features.auth.models import User

from .models import Persona
from .schemas import AskRequest, AskResponse
from .service import ask_persona

router = APIRouter(prefix="/persona", tags=["persona"])


@router.get("/{persona_id}")
def get_persona(persona_id: str, db: Session = Depends(get_db)) -> dict:
    persona = db.scalar(select(Persona).where(Persona.persona_id == persona_id))
    if persona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    owner = db.scalar(select(User).where(User.user_id == persona.user_id))
    return {
        "persona_id": persona.persona_id,
        "title": persona.title,
        "data_eng": persona.data_eng,
        "data_kor": persona.data_kor,
        "email": owner.email if owner else None,
        "github_address": owner.github_address if owner else None,
        "notion_url": owner.notion_url if owner else None,
    }


@router.post("/{persona_id}/ask", response_model=AskResponse)
def ask(persona_id: str, body: AskRequest, db: Session = Depends(get_db)) -> AskResponse:
    persona = db.scalar(select(Persona).where(Persona.persona_id == persona_id))
    if persona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    data = persona.data_kor if (body.lang == "ko" and persona.data_kor) else persona.data_eng
    answer = ask_persona(data, body.question)
    return AskResponse(answer=answer)
