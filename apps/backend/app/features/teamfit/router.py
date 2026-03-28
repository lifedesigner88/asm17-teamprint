from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.features.auth.models import User
from app.features.auth.service import get_current_user

from .schemas import (
    TeamfitExplorerMeResponse,
    TeamfitExplorerProfileResponse,
    TeamfitExplorerProfileSaveRequest,
    TeamfitFollowupAnswerRequest,
    TeamfitInterviewQuestionRequest,
    TeamfitInterviewQuestionResponse,
    TeamfitRecommendationsResponse,
)
from .service import (
    create_teamfit_followup_question,
    get_my_teamfit_explorer_profile,
    get_next_teamfit_interview_question,
    get_recommendations,
    save_teamfit_explorer_profile,
    save_teamfit_followup_answer,
)

router = APIRouter(prefix="/team-fit", tags=["team-fit"])


@router.get("/me", response_model=TeamfitExplorerMeResponse)
def teamfit_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitExplorerMeResponse:
    return get_my_teamfit_explorer_profile(current_user, db)


@router.post("/interview/next-question", response_model=TeamfitInterviewQuestionResponse)
def teamfit_next_question(
    payload: TeamfitInterviewQuestionRequest,
    current_user: User = Depends(get_current_user),
) -> TeamfitInterviewQuestionResponse:
    return get_next_teamfit_interview_question(payload)


@router.put("/me", response_model=TeamfitExplorerProfileResponse)
def save_teamfit_profile(
    payload: TeamfitExplorerProfileSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitExplorerProfileResponse:
    return save_teamfit_explorer_profile(payload, current_user, db)


@router.post("/interview/follow-up", response_model=TeamfitInterviewQuestionResponse)
def teamfit_followup_question(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitInterviewQuestionResponse:
    return create_teamfit_followup_question(current_user, db)


@router.post("/interview/follow-up-answer", response_model=TeamfitExplorerProfileResponse)
def teamfit_followup_answer(
    payload: TeamfitFollowupAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitExplorerProfileResponse:
    return save_teamfit_followup_answer(payload, current_user, db)


@router.get("/recommendations", response_model=TeamfitRecommendationsResponse)
def teamfit_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitRecommendationsResponse:
    return get_recommendations(current_user, db)
