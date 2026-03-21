from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.features.auth.models import User
from app.features.auth.service import get_current_user

from .schemas import CaptureDraftRequest, ChatRequest, ChatResponse, CaptureJobResponse
from .service import chat_interview, create_capture_job, delete_capture_job, get_capture_job, list_capture_jobs

router = APIRouter(prefix="/capture", tags=["capture"])


@router.post("/interview/chat", response_model=ChatResponse)
def interview_chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    return chat_interview(payload)


@router.post("/jobs", response_model=CaptureJobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: CaptureDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CaptureJobResponse:
    return create_capture_job(db, payload, current_user)


@router.get("/jobs", response_model=list[CaptureJobResponse])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CaptureJobResponse]:
    return list_capture_jobs(db, current_user)


@router.get("/jobs/{job_id}", response_model=CaptureJobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CaptureJobResponse:
    return get_capture_job(db, job_id, current_user)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    delete_capture_job(db, job_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
