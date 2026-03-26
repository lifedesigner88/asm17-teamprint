from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.features.auth.models import User
from app.features.auth.service import get_current_user

from .schemas import (
    TeamfitMeResponse,
    TeamfitProfileResponse,
    TeamfitProfileUpsertRequest,
    TeamfitRecommendationsResponse,
)
from .service import get_my_teamfit_profile, get_recommendations, upsert_teamfit_profile

router = APIRouter(prefix="/team-fit", tags=["team-fit"])


@router.get("/me", response_model=TeamfitMeResponse)
def teamfit_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitMeResponse:
    return get_my_teamfit_profile(current_user, db)


@router.put("/me", response_model=TeamfitProfileResponse)
def save_teamfit_profile(
    payload: TeamfitProfileUpsertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitProfileResponse:
    return upsert_teamfit_profile(payload, current_user, db)


@router.get("/recommendations", response_model=TeamfitRecommendationsResponse)
def teamfit_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitRecommendationsResponse:
    return get_recommendations(current_user, db)
